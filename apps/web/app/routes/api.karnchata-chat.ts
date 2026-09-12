import { json } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { getUserPlan, getWisdomAiLimit, getUserBillingCycleWindow } from "~/services/permissions.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { calculateKarnchata, calculatePhopephum } from "@phopephum/engine";
import { buildKarnchataChatPrompt } from "@phopephum/prompts";
import type { Env } from "~/env.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  const formData = await request.formData();
  const question = String(formData.get("question") || "");
  const category = String(formData.get("category") || "ทั่วไป");
  const targetDateStr = String(formData.get("targetDate") || new Date().toISOString());
  
  if (!question) {
    return json({ error: "กรุณาระบุคำถาม" }, { status: 400 });
  }

  // 1. Server-Side AI Cost Guard (Pre-Flight: Auth → Entitlement → Quota → Rate Limit → Concurrency → Sands Reservation)
  const { createSupabaseClient } = await import("~/services/supabase.server");
  const { supabase } = createSupabaseClient(request, env);
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

  const targetDate = new Date(targetDateStr);

  try {
    // 2. Calculate Karnchata
    const karnchataResult = calculateKarnchata(targetDate);

    // 3. Calculate Phopephum (if user has birth date)
    let phopephumResult = null;
    if (profile?.birth_date) {
      phopephumResult = await calculatePhopephum({
        birthDate: profile.birth_date,
        birthTime: profile.birth_time || "12:00",
        birthPlace: profile.birth_place || "กรุงเทพมหานคร",
      }, targetDate);
    }

    // 4. Build Prompt
    const prompt = buildKarnchataChatPrompt(
      question,
      category,
      karnchataResult,
      phopephumResult,
      profile?.display_name || profile?.full_name || "ผู้ใช้งาน"
    );

    // 5. Request AI Worker
    const response = await fetch(`${env.AI_WORKER_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.AI_WORKER_SECRET}`,
      },
      body: JSON.stringify({
        userId: user.id,
        reportType: "karnchata_chat",
        context: {
          category,
          targetDate: targetDateStr,
        },
        prompt: prompt,
      }),
    });

    if (!response.ok || !response.body) {
      await recordAiExecutionTelemetry({
        userId: user.id,
        profile,
        reportType: "karnchata_chat",
        promptText: prompt,
        env,
        isSuccess: false,
        error: new Error(`AI Service Response: ${response.status}`),
        releaseSlot: guard.releaseSlot,
        refundSandsIfNeeded: guard.refundSandsIfNeeded,
      });
      throw new Error("AI Service Unavailable");
    }

    // 6. Wrap stream to capture output tokens & record telemetry upon completion
    const reader = response.body.getReader();
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
        console.error("[api.karnchata-chat] Stream pipe error:", streamErr);
      } finally {
        await writer.close();
        await recordAiExecutionTelemetry({
          userId: user.id,
          profile,
          reportType: "karnchata_chat",
          promptText: prompt,
          outputText: accumulatedText,
          env,
          isSuccess: true,
          releaseSlot: guard.releaseSlot,
          refundSandsIfNeeded: guard.refundSandsIfNeeded,
        });

        supabase.from("wisdom_queries").insert({
          user_id: user.id,
          question,
          category,
        }).then(({ error: insertErr }) => {
          if (insertErr) console.error("[api.karnchata-chat] Insert query error:", insertErr);
        });
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (err) {
    console.error("Karnchata Chat Error:", err);
    await recordAiExecutionTelemetry({
      userId: user.id,
      profile,
      reportType: "karnchata_chat",
      env,
      isSuccess: false,
      error: err,
      releaseSlot: guard.releaseSlot,
      refundSandsIfNeeded: guard.refundSandsIfNeeded,
    });
    return json({ error: "Karnchata Wisdom ไม่ว่างชั่วคราว กรุณาลองใหม่สักครู่ ✦" }, { status: 500 });
  }
}
