import type { Env } from "~/env.server";
import { horoscopeEngine, getBirthYamResult } from "@phopephum/engine";
import { buildLifeReportPrompt } from "@phopephum/prompts";
import type { AtthakarnBirthYamContext } from "@phopephum/prompts";

// All AI calls go through Cloudflare Worker Proxy — NEVER call AI APIs directly from here
export async function generateAIReport(
  payload: {
    userId: string;
    reportType: string;
    context: Record<string, unknown>;
  },
  env: Env
): Promise<ReadableStream> {

  const birthDate = String(payload.context.birthDate || "");
  const birthTime = payload.context.birthTime ? String(payload.context.birthTime) : null;

  // 1. Calculate Horoscope (เลข 7 ตัว + วัยจร) from birth context
  const horoscope = await horoscopeEngine({
    birthDate,
    birthTime: birthTime ?? undefined,
    birthPlace: payload.context.birthPlace ? String(payload.context.birthPlace) : undefined,
  });

  // 2. [RAG] Calculate Birth Yam (ยามอัฏฐกาล) — Context Injection
  //    ถ้ามีเวลาเกิดจะคำนวณยามที่แม่นยำ, ถ้าไม่มีจะใช้เที่ยงวันเป็น default
  const birthYamRaw = getBirthYamResult(birthDate, birthTime);
  // Cast to AtthakarnBirthYamContext (structurally identical, no circular dep)
  const birthYam = birthYamRaw as unknown as AtthakarnBirthYamContext | null;

  // 3. Build the exact prompt for Gemini (with RAG context injected)
  const displayName = String(payload.context.displayName || "ผู้ใช้งาน");
  // @ts-ignore - reportType string vs AIReportType union
  const prompt = buildLifeReportPrompt(horoscope, payload.reportType, displayName, birthYam);

  // 4. Send to AI proxy
  const response = await fetch(`${env.AI_WORKER_URL}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.AI_WORKER_SECRET}`,
    },
    body: JSON.stringify({
      userId: payload.userId,
      reportType: payload.reportType,
      context: {
        ...payload.context,
        // ส่ง metadata ยามเกิดไปด้วยเผื่อ Worker ต้องการ log
        birthYamSummary: birthYam?.summary ?? null,
        birthYamQuality: birthYam?.quality ?? null,
      },
      prompt: prompt,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "No text");
    throw new Error(`AI Worker error: ${response.status} - ${errText}`);
  }

  if (!response.body) {
    throw new Error("No response body from AI Worker");
  }

  return response.body;
}
