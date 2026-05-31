import type { Env } from "~/env.server";
import { calculatePhopephum, getBirthYamResult } from "@phopephum/engine";
import { buildLifeReportPrompt } from "@phopephum/prompts";
import { buildHoraContext } from "~/lib/claude";
import type { AtthakarnBirthYamContext } from "@phopephum/prompts";
import type { AIReportType } from "@phopephum/types";
import { sendAdminAlert } from "~/services/alert.server";

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

  // 1. Calculate Integrated Phopephum Result (v2.0 Systematic)
  const result = await calculatePhopephum({
    birthDate,
    birthTime: birthTime ?? undefined,
    birthPlace: payload.context.birthPlace ? String(payload.context.birthPlace) : undefined,
  });

  // 2. [RAG] Build Systematic Context
  const systematicContext = buildHoraContext(result);

  // 3. [RAG] Calculate Birth Yam (Legacy Context Injection)
  const birthYamRaw = getBirthYamResult(birthDate, birthTime);
  const birthYam = birthYamRaw as unknown as AtthakarnBirthYamContext | null;

  // 4. Build the final prompt (v4.0.0)
  const displayName = String(payload.context.displayName || "ผู้ใช้งาน");
  const prompt = buildLifeReportPrompt(result, payload.reportType as AIReportType, displayName, birthYam);

  // 5. Send to AI proxy
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
        systematicContext,
        resultSummary: `NineBase: ${result.nineBase.lunarDate.thaiDateText}`,
      },
      prompt: prompt,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "No text");
    sendAdminAlert(env, {
      type: "ai_worker_unreachable",
      severity: "critical",
      message: `AI Worker ตอบกลับ ${response.status}: ${errText.substring(0, 100)}`,
      userId: payload.userId,
      reportType: payload.reportType,
    }).catch(console.error);
    throw new Error(`Oracle Service error: ${response.status} - ${errText}`);
  }

  if (!response.body) {
    sendAdminAlert(env, {
      type: "ai_worker_unreachable",
      severity: "critical",
      message: "AI Worker ไม่ส่ง response body กลับมา",
      userId: payload.userId,
      reportType: payload.reportType,
    }).catch(console.error);
    throw new Error("ระบบพยากรณ์ไม่ตอบสนอง");
  }

  return response.body;
}
