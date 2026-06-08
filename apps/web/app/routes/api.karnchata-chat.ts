import { json } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
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

  const targetDate = new Date(targetDateStr);

  try {
    // 1. Calculate Karnchata
    const karnchataResult = calculateKarnchata(targetDate);

    // 2. Calculate Phopephum (if user has birth date)
    let phopephumResult = null;
    if (profile?.birth_date) {
      phopephumResult = await calculatePhopephum({
        birthDate: profile.birth_date,
        birthTime: profile.birth_time || "12:00",
        birthPlace: profile.birth_place || "กรุงเทพมหานคร",
      }, targetDate);
    }

    // 3. Build Prompt
    const prompt = buildKarnchataChatPrompt(
      question,
      category,
      karnchataResult,
      phopephumResult,
      profile?.display_name || profile?.full_name || "ผู้ใช้งาน"
    );

    // 4. Request AI Worker
    const response = await fetch(`${env.AI_WORKER_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.AI_WORKER_SECRET}`,
      },
      body: JSON.stringify({
        userId: user.id,
        reportType: "karnchata_chat", // Custom report type
        context: {
          category,
          targetDate: targetDateStr,
        },
        prompt: prompt,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error("AI Service Unavailable");
    }

    // Return the response stream directly to the client
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (err) {
    console.error("Karnchata Chat Error:", err);
    return json({ error: "ระบบพยากรณ์ขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
