import type { Env } from "~/env.server";
import { horoscopeEngine } from "@phopephum/engine";
import { buildLifeReportPrompt } from "@phopephum/prompts";

// All AI calls go through Cloudflare Worker Proxy — NEVER call AI APIs directly from here
export async function generateAIReport(
  payload: {
    userId: string;
    reportType: string;
    context: Record<string, unknown>;
  },
  env: Env
): Promise<ReadableStream> {

  // 1. Calculate Horoscope from birth context
  const horoscope = await horoscopeEngine({
    birthDate: String(payload.context.birthDate || ""),
    birthTime: payload.context.birthTime ? String(payload.context.birthTime) : undefined,
    birthPlace: payload.context.birthPlace ? String(payload.context.birthPlace) : undefined,
  });

  // 2. Build the exact prompt for Gemini
  const displayName = String(payload.context.displayName || "ผู้ใช้งาน");
  // @ts-ignore - reportType string vs AIReportType union
  const prompt = buildLifeReportPrompt(horoscope, payload.reportType, displayName);

  // 3. Send to AI proxy
  const response = await fetch(`${env.AI_WORKER_URL}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.AI_WORKER_SECRET}`,
    },
    body: JSON.stringify({
      userId: payload.userId,
      reportType: payload.reportType,
      context: payload.context,
      prompt: prompt,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI Worker error: ${response.status}`);
  }

  if (!response.body) {
    throw new Error("No response body from AI Worker");
  }

  return response.body;
}
