import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { horoscopeEngine } from "@/lib/astrology/engine/horoscopeEngine";
import { HORA_REPORT_PROMPT } from "@/constants/ai-prompts";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  // 1. Auth check
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Parse body
  const { birthData, topic, tier } = await req.json();
  if (!birthData?.birthDate) {
    return new Response(JSON.stringify({ error: "birthData is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Check remaining reports
  const { data: usage } = await supabase
    .from("ai_report_usage")
    .select("count")
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .single();

  const LIMITS: Record<string, number> = { free: 1, pro: 10, premium: -1, imperial: -1 };
  const limit = LIMITS[tier as string] ?? 1;
  if (limit !== -1 && (usage?.count ?? 0) >= limit) {
    return new Response(
      JSON.stringify({ error: "Report limit reached. Please upgrade." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4. Calculate full astrology data
  const hResult = await horoscopeEngine({
    birthDate: birthData.birthDate,
    birthTime: birthData.birthTime || "12:00",
    name: birthData.name || "ผู้ใช้งาน"
  });

  // 5. Build prompt
  const thaiTopics: Record<string, string> = {
    overall:     "ภาพรวมชะตาชีวิตทุกด้าน",
    career:      "การงานและอาชีพ",
    love:        "ความรักและความสัมพันธ์",
    health:      "สุขภาพและพลังงาน",
    wealth:      "การเงินและโชคลาภ",
    "lucky-hour": "ฤกษ์มงคลและช่วงเวลาที่ดี",
  };
  const topicThai = thaiTopics[topic] ?? topic;

  const dataSnapshot = {
    user: birthData.name || "ผู้ใช้งาน",
    lunarDate: hResult.lunar?.thaiLunarDateText || hResult.data.dayName,
    chart: {
      matrix: hResult.matrix,
      emperor: hResult.emperorChart
    },
    rules: hResult.rules.map((r: { insight: string }) => r.insight),
    taksa: hResult.data.taksa,
    vayaChorn: hResult.data.vayaChorn,
    transit: hResult.data.transit
  };

  const finalPrompt = `
${HORA_REPORT_PROMPT}

หัวข้อที่ต้องเน้นเป็นพิเศษ: ${topicThai}

ข้อมูลดวงชะตาเชิงลึก:
${JSON.stringify(dataSnapshot, null, 2)}
`.trim();

  // 6. Call Gemini directly (streaming)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:streamGenerateContent?alt=sse&key=${geminiKey}`;

  let geminiRes: Response;
  try {
    geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.7,
        },
      }),
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `Gemini connection error: ${err.message}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    return new Response(
      JSON.stringify({ error: `Gemini API error: ${errText}` }),
      { status: geminiRes.status, headers: { "Content-Type": "application/json" } }
    );
  }

  // 7. Log usage (non-blocking)
  void supabase.from("ai_report_usage").insert({
    user_id: user.id,
    topic,
    tier,
  });

  // 8. Transform Gemini SSE
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  (async () => {
    const reader = geminiRes.body?.getReader();
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
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const json = JSON.parse(raw);
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              await writer.write(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          } catch {
            // skip incomplete JSON chunk
          }
        }
      }
      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (err: any) {
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      );
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
