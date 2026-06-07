import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { calculateHoraNu } from "@phopephum/engine";
import { buildHoraNuChatPrompt } from "@phopephum/prompts";
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

  // Bangkok time (UTC+7) for calculation
  const nowUTC = new Date();
  const nowBangkok = new Date(nowUTC.getTime() + 7 * 60 * 60 * 1000);
  const data = calculateHoraNu(nowBangkok);

  const userName =
    profile?.display_name || profile?.full_name || "ผู้ใช้งาน";

  const prompt = buildHoraNuChatPrompt(question, category, data, userName);

  try {
    const response = await fetch(`${env.AI_WORKER_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.AI_WORKER_SECRET}`,
      },
      body: JSON.stringify({
        userId: user.id,
        reportType: "hora_thai_nu_chat",
        context: { category, yamNumber: data.yamNumber },
        prompt,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error("AI Service Unavailable");
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("HoraNu Chat Error:", err);
    return json(
      { error: "ระบบพยากรณ์ขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
