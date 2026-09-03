// Phopephum AI Proxy — Cloudflare Worker
// AI Provider: DeepSeek (deepseek-chat)
// Streams SSE → Remix client via AI_WORKER_SECRET auth

interface Env {
  deepseek_api_key?: string;
  DEEPSEEK_API_KEY?: string;
  GEMINI_API_KEY?: string;
  AI_WORKER_SECRET: string;
  KV_PROMPT_CACHE: KVNamespace;
  ENVIRONMENT: string;
}

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return corsResponse(new Response(null, { status: 204 }));
    }

    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${env.AI_WORKER_SECRET}`) {
      return corsResponse(new Response("Unauthorized", { status: 401 }));
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      const apiKey = env.deepseek_api_key || env.DEEPSEEK_API_KEY || env.GEMINI_API_KEY;
      return corsResponse(
        new Response(
          JSON.stringify({
            status: "healthy",
            provider: env.deepseek_api_key || env.DEEPSEEK_API_KEY ? "deepseek" : "gemini",
            hasApiKey: Boolean(apiKey),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    }

    if (url.pathname === "/generate" && request.method === "POST") {
      return handleGenerate(request, env);
    }

    return corsResponse(new Response("Not Found", { status: 404 }));
  },
};

async function handleGenerate(request: Request, env: Env): Promise<Response> {
  const body = await request.json<{
    userId: string;
    reportType: string;
    context: Record<string, unknown>;
    prompt: string;
  }>();

  const apiKey = env.deepseek_api_key || env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return corsResponse(
      new Response("Internal Error: Missing deepseek_api_key in Worker Secrets", { status: 500 })
    );
  }

  // Call DeepSeek streaming API (OpenAI-compatible)
  const deepseekRes = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: "system",
          content: "คุณคือ Wisdom Guidance ผู้เชี่ยวชาญการวิเคราะห์ดวงชะตาและระบบภพภูมิ โหราศาสตร์ไทยโบราณผสมผสานวิทยาศาสตร์การวางแผนชีวิต ให้คำแนะนำที่สุขุม ลึกซึ้ง และสร้างแรงบันดาลใจ",
        },
        {
          role: "user",
          content: body.prompt,
        },
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 8192,
    }),
  });

  if (!deepseekRes.ok) {
    const errText = await deepseekRes.text();
    return corsResponse(
      new Response(`DeepSeek error (${deepseekRes.status}): ${errText}`, { status: 502 })
    );
  }

  if (!deepseekRes.body) {
    return corsResponse(new Response("DeepSeek error: Empty response body", { status: 502 }));
  }

  // Transform DeepSeek OpenAI SSE → phopephum SSE format { "text": "..." }
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  (async () => {
    const reader = deepseekRes.body!.getReader();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const raw = trimmed.replace(/^data:\s*/, "");
          if (raw === "[DONE]") break;

          try {
            const parsed = JSON.parse(raw);
            const text = parsed?.choices?.[0]?.delta?.content ?? "";
            if (text) {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch (e) {
      console.error("Stream processing error:", e);
    } finally {
      await writer.write(encoder.encode("data: [DONE]\n\n"));
      await writer.close();
    }
  })();

  return corsResponse(
    new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  );
}

function corsResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new Response(response.body, { status: response.status, headers });
}
