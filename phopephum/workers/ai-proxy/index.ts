import Anthropic from "@anthropic-ai/sdk";

interface Env {
  ANTHROPIC_API_KEY: string;
  WORKER_SECRET: string;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    // Security: validate secret
    const secret = req.headers.get("X-Worker-Secret");
    if (secret !== env.WORKER_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);

    if (url.pathname === "/ai/report" && req.method === "POST") {
      return handleAIReport(req, env);
    }

    return new Response("Not Found", { status: 404 });
  },
};

async function handleAIReport(req: Request, env: Env): Promise<Response> {
  const { prompt } = await req.json<{ prompt: string }>();

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  // Streaming SSE response
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    try {
      const stream = await client.messages.stream({
        model: "claude-3-5-sonnet-20240620", // Updated to a valid model name
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      });

      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          const data = JSON.stringify({ delta: { text: chunk.delta.text } });
          await writer.write(encoder.encode(`data: ${data}\n\n`));
        }
      }

      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (err) {
      const errData = JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      });
      await writer.write(encoder.encode(`data: ${errData}\n\n`));
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
