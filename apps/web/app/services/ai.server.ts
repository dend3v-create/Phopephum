import type { Env } from "~/env.server";

// All AI calls go through Cloudflare Worker Proxy — NEVER call AI APIs directly from here
export async function generateAIReport(
  payload: {
    userId: string;
    reportType: string;
    context: Record<string, unknown>;
  },
  env: Env
): Promise<ReadableStream> {
  const response = await fetch(`${env.AI_WORKER_URL}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.AI_WORKER_SECRET}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`AI Worker error: ${response.status}`);
  }

  if (!response.body) {
    throw new Error("No response body from AI Worker");
  }

  return response.body;
}
