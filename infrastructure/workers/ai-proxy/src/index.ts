// Phopephum AI Proxy — Cloudflare Worker
// AI Provider: Google Gemini (gemini-2.0-flash)
// Streams SSE → Remix client via AI_WORKER_SECRET auth

interface Env {
  GEMINI_API_KEY: string;
  AI_WORKER_SECRET: string;
  KV_PROMPT_CACHE: KVNamespace;
  ENVIRONMENT: string;
}

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_STREAM_URL = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`;

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

  // Call Gemini streaming API
  const geminiRes = await fetch(GEMINI_STREAM_URL(GEMINI_MODEL, env.GEMINI_API_KEY), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: body.prompt }] }],
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.7,
      },
    }),
  });

  if (!geminiRes.ok || !geminiRes.body) {
    const err = await geminiRes.text();
    return corsResponse(
      new Response(`Gemini error: ${err}`, { status: 502 })
    );
  }

  // Transform Gemini SSE → phopephum SSE format
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  (async () => {
    const reader = geminiRes.body!.getReader();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === "[DONE]") continue;

          try {
            const parsed = JSON.parse(raw);
            const text =
              parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            if (text) {
              await writer.write(
                encoder.encode(
                  `data: ${JSON.stringify({ text })}\n\n`
                )
              );
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
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
