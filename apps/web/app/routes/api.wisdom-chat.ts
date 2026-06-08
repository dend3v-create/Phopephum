import { json } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
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

  const now = new Date();

  try {
    // 1. Get current timing energy (karnchata)
    const karnchata = calculateKarnchata(now);

    // 2. Get personal chart data if birth date exists
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

    // 3. Build unified prompt
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

    // 4. Call AI Worker (streaming)
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
      throw new Error("AI Service Unavailable");
    }

    return new Response(aiResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

  } catch (err) {
    console.error("Wisdom Chat Error:", err);
    return json({ error: "Wisdom ไม่ว่างชั่วคราว กรุณาลองใหม่สักครู่ ✦" }, { status: 500 });
  }
}
