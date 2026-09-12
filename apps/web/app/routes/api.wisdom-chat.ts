import { json } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { getUserPlan, getWisdomAiLimit, getUserBillingCycleWindow } from "~/services/permissions.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { calculateKarnchata, calculatePhopephum } from "@phopephum/engine";
import { buildWisdomChatPrompt } from "@phopephum/prompts";
import type { Env } from "~/env.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  const formData = await request.formData();
  const question = String(formData.get("question") || "").trim();
  const category = String(formData.get("category") || "ทั่วไป");

  if (!question) {
    return json({ error: "กรุณาระบุคำถาม" }, { status: 400 });
  }

  const { supabase } = createSupabaseClient(request, env);

  // 1. Server-Side AI Cost Guard (Pre-Flight: Auth → Entitlement → Quota → Rate Limit → Concurrency → Payload)
  const { guardAiRequestPreflight, recordAiExecutionTelemetry } = await import("~/services/aiCostGuard.server");

  const guard = await guardAiRequestPreflight({
    userId: user.id,
    profile,
    featureType: "wisdom_ai",
    promptText: question,
    env,
    supabase,
  });

  if (!guard.allowed) {
    return json({
      error: guard.errorMessage,
      code: guard.errorCode,
    }, { status: guard.status });
  }

  const now = new Date();

  try {
    // 2. Get current timing energy (karnchata)
    const karnchata = calculateKarnchata(now);

    // 3. Get personal chart data if birth date exists
    let personal: {
      userName?: string;
      taksaSri?: string;
      taksaKala?: string;
      ageYang?: number | string;
    } | null = null;

    if (profile?.birth_date) {
      try {
        const phResult = await calculatePhopephum({
          birthDate: profile.birth_date,
          birthTime: profile.birth_time || "12:00",
          birthPlace: profile.birth_place || "กรุงเทพมหานคร",
        }, now);

        const taksaMap = phResult?.taksaTransit?.map as Record<string, string> | undefined;
        personal = {
          userName: profile.display_name || profile.full_name || "คุณ",
          ageYang: phResult?.taksaTransit?.ageYang,
          taksaSri: taksaMap
            ? Object.entries(taksaMap).find(([, v]) => v === "ศรี")?.[0]
            : undefined,
          taksaKala: taksaMap
            ? Object.entries(taksaMap).find(([, v]) => v === "กาลกิณี")?.[0]
            : undefined,
        };
      } catch {
        // fallback — use name only
        personal = { userName: profile.display_name || profile.full_name || "คุณ" };
      }
    } else if (profile) {
      personal = { userName: profile.display_name || profile.full_name || "คุณ" };
    }

    // 4. Build unified prompt
    const prompt = buildWisdomChatPrompt(
      question,
      category,
      {
        yamYaiName: karnchata.yamYaiName,
        yamSoyName: karnchata.yamSoyName,
      },
      personal,
      now
    );

    // 5. Call AI Worker (streaming)
    const aiResponse = await fetch(`${env.AI_WORKER_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.AI_WORKER_SECRET}`,
      },
      body: JSON.stringify({
        userId: user.id,
        reportType: "wisdom_chat",
        context: { category, question },
        prompt,
      }),
    });

    if (!aiResponse.ok || !aiResponse.body) {
      await recordAiExecutionTelemetry({
        userId: user.id,
        profile,
        reportType: "wisdom_chat",
        promptText: prompt,
        env,
        isSuccess: false,
        error: new Error(`AI Service Response Status: ${aiResponse.status}`),
        releaseSlot: guard.releaseSlot,
        refundSandsIfNeeded: guard.refundSandsIfNeeded,
      });
      throw new Error("AI Service Unavailable");
    }

    // 6. Wrap stream to capture output tokens & record telemetry upon completion
    const reader = aiResponse.body.getReader();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    let accumulatedText = "";

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } catch (streamErr) {
        console.error("[api.wisdom-chat] Stream pipe error:", streamErr);
      } finally {
        await writer.close();
        // Record telemetry & release slot
        await recordAiExecutionTelemetry({
          userId: user.id,
          profile,
          reportType: "wisdom_chat",
          promptText: prompt,
          outputText: accumulatedText,
          env,
          isSuccess: true,
          releaseSlot: guard.releaseSlot,
          refundSandsIfNeeded: guard.refundSandsIfNeeded,
        });

        // Insert wisdom_query record for usage tracking
        supabase.from("wisdom_queries").insert({
          user_id: user.id,
          question,
          category,
        }).then(({ error: insertErr }) => {
          if (insertErr) console.error("[api.wisdom-chat] Insert query error:", insertErr);
        });
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

  } catch (err) {
    console.error("Wisdom Chat Error:", err);
    await recordAiExecutionTelemetry({
      userId: user.id,
      profile,
      reportType: "wisdom_chat",
      env,
      isSuccess: false,
      error: err,
      releaseSlot: guard.releaseSlot,
      refundSandsIfNeeded: guard.refundSandsIfNeeded,
    });
    return json({ error: "Wisdom ไม่ว่างชั่วคราว กรุณาลองใหม่สักครู่ ✦" }, { status: 500 });
  }
}
