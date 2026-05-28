import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  // 3. Check remaining reports (Supabase)
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

  // 4. Build prompt
  const prompt = buildAIReportPrompt(birthData, topic);

  // 5. Call Gemini directly (streaming)
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
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 2048,
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

  // 6. Log usage (non-blocking)
  void supabase.from("ai_report_usage").insert({
    user_id: user.id,
    topic,
    tier,
  });

  // 7. Transform Gemini SSE → client SSE format: data: {"text":"..."}\n\n
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

// ─── Prompt Builder ────────────────────────────────────────────────────────────

function buildAIReportPrompt(birthData: any, topic: string): string {
  const thaiTopics: Record<string, string> = {
    overall:     "ภาพรวมชะตาชีวิตทุกด้าน",
    career:      "การงานและอาชีพ",
    love:        "ความรักและความสัมพันธ์",
    health:      "สุขภาพและพลังงาน",
    wealth:      "การเงินและโชคลาภ",
    "lucky-hour": "ฤกษ์มงคลและช่วงเวลาที่ดี",
  };

  const topicThai = thaiTopics[topic] ?? topic;

  return `
คุณคือผู้พยากรณ์โหราศาสตร์ไทยผู้เชี่ยวชาญระดับสูง
ผู้มีความรู้ลึกซึ้งในระบบเลข 7 ตัว 9 ฐาน, ยามอัฐกาล และการพยากรณ์แบบ Therapeutic Divination

ข้อมูลผู้ถามพยากรณ์:
- ชื่อ: ${birthData.name || "ผู้ใช้งาน"}
- วันเกิด: ${birthData.birthDate}
- เวลาเกิด: ${birthData.birthTime || "ไม่ระบุ"} น.
- สถานที่เกิด: ${birthData.birthPlace || "ไม่ระบุ"}
- เพศ: ${birthData.gender || "ไม่ระบุ"}
${birthData.numerologyData ? `- ข้อมูลเลข 7 ตัว: ${JSON.stringify(birthData.numerologyData)}` : ""}

หัวข้อพยากรณ์: ${topicThai}

กรุณาวิเคราะห์และพยากรณ์อย่างละเอียดในหัวข้อ "${topicThai}" โดย:
1. เริ่มด้วยการอ่านพลังงานโดยรวมจากวันเกิด
2. วิเคราะห์ตามหัวข้อที่กำหนดอย่างเจาะลึก
3. ให้แนวทางปฏิบัติที่ชัดเจน 3-5 ข้อ
4. จบด้วยข้อความให้กำลังใจและสร้างแรงบันดาลใจ

ใช้ภาษาไทยที่อ่านง่าย อบอุ่น และให้พลังบวก
ความยาวประมาณ 400-600 คำ
`.trim();
}
