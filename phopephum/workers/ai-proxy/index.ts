/**
 * Cloudflare Worker — AI Proxy (Gemini Edition)
 * ทำหน้าที่เป็นตัวกลางระหว่าง Next.js App และ Google Gemini API
 */

interface Env {
  GEMINI_API_KEY: string;
  WORKER_SECRET: string;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    // 1. CORS Headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Worker-Secret",
    };

    // Handle OPTIONS
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 2. Security: Validate Worker Secret
    const secret = req.headers.get("X-Worker-Secret");
    if (secret !== env.WORKER_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);

    // Route: /ai/report
    if (url.pathname === "/ai/report" && req.method === "POST") {
      return handleAIReport(req, env, corsHeaders);
    }

    // Route: /claude (Legacy or alternate)
    if (url.pathname === "/claude" && req.method === "POST") {
      // Fallback to Gemini even if called /claude for compatibility
      return handleAIReport(req, env, corsHeaders);
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  },
};

/**
 * Handle AI Report Generation using Gemini 2.0 Flash
 */
async function handleAIReport(req: Request, env: Env, corsHeaders: any): Promise<Response> {
  try {
    const { prompt } = await req.json<{ prompt: string }>();

    if (!env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured in Worker secrets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gemini API with streaming support (Server-Sent Events)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${env.GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: `Gemini API error: ${err}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Gemini SSE stream to simple SSE format expected by client
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    (async () => {
      const reader = response.body?.getReader();
      if (!reader) {
        await writer.close();
        return;
      }

      try {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep the last partial line in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (!data) continue;
              
              try {
                const json = JSON.parse(data);
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  // Re-emit in format: data: {"text": "..."}\n\n
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                }
              } catch (e) {
                // Incomplete JSON chunk, skip
              }
            }
          }
        }
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch (err: any) {
        console.error("Stream error:", err);
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal Worker Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
