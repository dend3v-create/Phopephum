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

  const LIMITS = { free: 1, pro: 10, premium: -1 };
  const limit = LIMITS[tier as keyof typeof LIMITS] ?? 1;
  if (limit !== -1 && (usage?.count ?? 0) >= limit) {
    return new Response(
      JSON.stringify({ error: "Report limit reached. Please upgrade." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4. Build prompt
  const prompt = buildAIReportPrompt(birthData, topic);

  // 5. Forward to CF Worker (AI Proxy) — streaming
  const workerUrl = process.env.NEXT_PUBLIC_AI_WORKER_URL || process.env.CF_AI_PROXY_URL;
  
  if (!workerUrl) {
    return new Response(JSON.stringify({ error: "AI Worker URL not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const workerRes = await fetch(
    workerUrl.trim() + "/ai/report",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": process.env.CF_WORKER_SECRET!,
      },
      body: JSON.stringify({ prompt, topic }),
    }
  );

  if (!workerRes.ok) {
    const err = await workerRes.text();
    return new Response(
      JSON.stringify({ error: `AI Worker error: ${err}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // 6. Log usage
  await supabase.from("ai_report_usage").insert({
    user_id: user.id,
    topic,
    tier,
  });

  // 7. Stream back to client
  return new Response(workerRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

function buildAIReportPrompt(birthData: any, topic: string): string {
  const thaiTopics: Record<string, string> = {
    overall: "ภาพรวมชะตาชีวิตทุกด้าน",
    career: "การงานและอาชีพ",
    love: "ความรักและความสัมพันธ์",
    health: "สุขภาพและพลังงาน",
    wealth: "การเงินและโชคลาภ",
    "lucky-hour": "ฤกษ์มงคลและช่วงเวลาที่ดี",
  };

  return `
คุณคือผู้พยากรณ์โหราศาสตร์ไทยผู้เชี่ยวชาญระดับสูง 
ผู้มีความรู้ลึกซึ้งในระบบเลข 7 ตัว 9 ฐาน, ยามอัฐกาล และการพยากรณ์แบบ Therapeutic Divination

ข้อมูลผู้ถามพยากรณ์:
- ชื่อ: ${birthData.name}
- วันเกิด: ${birthData.birthDate}
- เวลาเกิด: ${birthData.birthTime} น.
- สถานที่เกิด: ${birthData.birthPlace}
- เพศ: ${birthData.gender}
${birthData.numerologyData ? `- ข้อมูลเลข 7 ตัว: ${JSON.stringify(birthData.numerologyData)}` : ""}

หัวข้อพยากรณ์: ${thaiTopics[topic] ?? topic}

กรุณาวิเคราะห์และพยากรณ์อย่างละเอียดในหัวข้อ "${thaiTopics[topic] ?? topic}" โดย:
1. เริ่มด้วยการอ่านพลังงานโดยรวมจากวันเกิด
2. วิเคราะห์ตามหัวข้อที่กำหนดอย่างเจาะลึก  
3. ให้แนวทางปฏิบัติที่ชัดเจน 3-5 ข้อ
4. จบด้วยข้อความให้กำลังใจและสร้างแรงบันดาลใจ

ใช้ภาษาไทยที่อ่านง่าย อบอุ่น และให้พลังบวก
ความยาวประมาณ 400-600 คำ
`.trim();
}
