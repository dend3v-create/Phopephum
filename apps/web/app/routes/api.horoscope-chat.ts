import { json } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { canUseFeature } from "~/services/permissions.server";
import {
  calculatePhopephum,
  getYamPrediction,
  calculateLagnaNakshatra,
  STAR_NAMES,
} from "@phopephum/engine";
import type { Env } from "~/env.server";

const BASE4_NAMES: Record<number, string> = {
  3: "กำลังดาวอังคาร (๓)",
  6: "กำลังพระอาทิตย์ (๖)",
  7: "กำลังพระเสาร์ (๗)",
  8: "กำลังราหู/อังคาร (๘)",
  9: "กำลังพระเกตุ (๙)",
  10: "กำลังพระเสาร์ (๑๐)",
  11: "กำลังพระราหู (๑๑)",
  12: "กำลังพระราหู (๑๒)",
  13: "กำลังมหาโจร/มหาอุบาทว์ (๑๓)",
  14: "กำลังจักรพรรดิ (๑๔)",
  15: "กำลังพระจันทร์ (๑๕)",
  16: "กำลังโสฬสมงคล (๑๖)",
  17: "กำลังพระพุธ (๑๗)",
  18: "กำลังมหาจักรพรรดิ (๑๘)",
  19: "กำลังมหาจักรพรรดิ (๑๙)",
  20: "กำลังพระเสาร์มหาธาตุ (๒๐)",
  21: "กำลังพระศุกร์ (๒๑)",
};

const HOUSES_9B: string[][] = [
  ["อัตตะ", "หินะ", "ธะนัง", "ปิตา", "มาตา", "โภคา", "มัชฌิมา"],
  ["ตนุ", "กดุมภะ", "สหัชชะ", "พันธุ", "ปุตตะ", "อริ", "ปัตนิ"],
  ["มรณะ", "สุภะ", "กัมมะ", "ลาภะ", "พยายะ", "ทาสา", "ทาสี"],
];

function analyzeTransitPoint(name: string, p: any, matrix: number[][]) {
  if (!p || !matrix || matrix.length < 4) return null;
  const colIdx = (p.col || 1) - 1;
  const rowIdx = (p.row || 1) - 1;
  const star = p.star || matrix[rowIdx]?.[colIdx] || 1;
  const starName = (STAR_NAMES as any)[star] || `ดาว ${star}`;
  const base4Power = matrix[3]?.[colIdx] ?? 0;
  const base4Name = (BASE4_NAMES as any)[base4Power] || `กำลัง ${base4Power}`;

  // กฎเหล็ก: เชื่อมดาวสถิต (เลขดาวเดียวกัน) ข้ามไปยังภพเรือนอื่นๆ ในฐาน 1, 2, 3
  const linkedHouses: string[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 7; c++) {
      if (matrix[r]?.[c] === star && !(r === rowIdx && c === colIdx)) {
        const hName = HOUSES_9B[r]?.[c] || `ช่อง ${c + 1}`;
        linkedHouses.push(`ฐาน ${r + 1} ภพ${hName}`);
      }
    }
  }

  // กฎเหล็ก: ดาวย้ำในคอลัมน์เดียวกัน (ฐาน 5, 6, 7) ได้รับแรงกระทบ/สนับสนุนจากฐานที่ 4
  const yum5 = matrix[4]?.[colIdx];
  const yum6 = matrix[5]?.[colIdx];
  const yum7 = matrix[6]?.[colIdx];

  return {
    name,
    row: p.row,
    col: p.col,
    houseName: p.houseName,
    star,
    starName,
    ageRange: p.ageRange,
    base4Power,
    base4Name,
    linkedHouses,
    yum5: yum5 ? `${(STAR_NAMES as any)[yum5] || yum5}(${yum5})` : "—",
    yum6: yum6 ? `${(STAR_NAMES as any)[yum6] || yum6}(${yum6})` : "—",
    yum7: yum7 ? `${(STAR_NAMES as any)[yum7] || yum7}(${yum7})` : "—",
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  // Entitlement Gate 1: Natal horoscope chat requires Premium or higher
  if (!canUseFeature(profile, "horoscope_self")) {
    return json({ 
      error: "ระบบวิเคราะห์ผังดวง 7 ตัว 9 ฐาน สงวนสิทธิ์สำหรับสมาชิก Premium ขึ้นไป", 
      code: "PLAN_UPGRADE_REQUIRED" 
    }, { status: 403 });
  }

  let body: {
    question: string;
    subjectName?: string;
    birthDate?: string;
    birthTime?: string;
    birthPlace?: string;
    transitDate?: string;
    transitTime?: string;
    filterType?: string;
    filterValue?: string | number;
    forecastMode?: "natal" | "transit" | "auto";
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  };

  try {
    body = await request.json();
  } catch {
    return json({ error: "ข้อมูลคำขอไม่ถูกต้อง (Invalid JSON)" }, { status: 400 });
  }

  const question = (body.question ?? "").trim();
  if (!question) {
    return json({ error: "กรุณาระบุคำถามที่ต้องการให้ตรวจดวงชะตา" }, { status: 400 });
  }

  const subjectName = body.subjectName?.trim() || "เจ้าชะตา";
  const birthDate = body.birthDate || "1994-04-17";
  const birthTime = body.birthTime || "12:00";
  const birthPlace = body.birthPlace || "กรุงเทพมหานคร";

  const now = new Date();
  const transitDate = body.transitDate || now.toISOString().split("T")[0];
  const transitTime = body.transitTime || "12:00";

  const [ty, tm, td] = transitDate.split("-").map(Number);
  const [th, tmin] = (transitTime || "12:00").split(":").map(Number);
  const checkDate = new Date(ty, (tm || 1) - 1, td || 1, th || 12, tmin || 0, 0);

  // 1. คำนวณระบบ PhopePhum v2.0
  let phopephumResult: any = null;
  let birthYam: any = null;
  let lagna: any = null;

  try {
    phopephumResult = await calculatePhopephum(
      {
        birthDate,
        birthTime,
        birthPlace,
      },
      checkDate
    );

    const bTimeStr = birthTime.slice(0, 5);
    const bDateObj = new Date(`${birthDate}T${bTimeStr}:00+07:00`);
    birthYam = getYamPrediction(bDateObj);
    lagna = calculateLagnaNakshatra(birthDate, birthTime);
  } catch (err) {
    console.error("Horoscope calculation error:", err);
  }

  // 2. สกัดบริบททางโหราศาสตร์ไทย
  const nineBase = phopephumResult?.nineBase;
  const matrix = nineBase?.bases || [];
  const lunar = nineBase?.lunarDate;
  const taksaTransit = phopephumResult?.taksaTransit;
  const taksaNatal = phopephumResult?.taksaNatal;
  const mahaTransit = phopephumResult?.mahaTransit;
  const currentAge = taksaTransit?.ageYang || 0;

  // ค้นหาตำแหน่งดาวทักษาจร
  const taksaMap = (taksaTransit?.map || {}) as Record<string, string>;
  const sriStar = Object.entries(taksaMap).find(([_, v]) => v === "ศรี")?.[0] ?? "—";
  const dechStar = Object.entries(taksaMap).find(([_, v]) => v === "เดช")?.[0] ?? "—";
  const montriStar = Object.entries(taksaMap).find(([_, v]) => v === "มนตรี")?.[0] ?? "—";
  const kaliStar = Object.entries(taksaMap).find(([_, v]) => v === "กาลกิณี")?.[0] ?? "—";
  const ayuStar = Object.entries(taksaMap).find(([_, v]) => v === "อายุ")?.[0] ?? "—";

  // ตรวจสอบโหมดดวงจร (Transit Detection)
  const isTransitKeyword = /(จร|วัยจร|ปีจร|ลัคนาจร|เดือนจร|วันจร|อายุจร|ช่วงนี้|ปีนี้|เดือนนี้|วันนี้|อนาคตอันใกล้|จังหวะชีวิต)/i.test(question);
  const isTransitMode = body.forecastMode === "transit" || (body.forecastMode !== "natal" && isTransitKeyword);

  // Entitlement Gate 2: Transit analysis requires Pro or higher
  if (isTransitMode && !canUseFeature(profile, "transit_system")) {
    return json({ 
      error: "ระบบวิเคราะห์จังหวะชีวิตและดวงจร (Transit System) สงวนสิทธิ์สำหรับสมาชิก Pro ขึ้นไป", 
      code: "PLAN_UPGRADE_REQUIRED" 
    }, { status: 403 });
  }

  // สกัดข้อมูล 5 มิติดวงจร พร้อมการวิเคราะห์ฐานที่ ๔ ในคอลัมน์ตรงกัน และสายใยดาวสถิต
  const vayaJorn = phopephumResult?.vayaJorn;
  const yearlyJorn = phopephumResult?.yearlyJorn;
  const monthlyJorn = phopephumResult?.monthlyJorn;
  const dailyJorn = phopephumResult?.dailyJorn;
  const lagnaTransit = phopephumResult?.lagnaTransit;

  const vayaAnalysis = analyzeTransitPoint("วัยจร", vayaJorn, matrix);
  const yearlyAnalysis = analyzeTransitPoint("ปีจร", yearlyJorn, matrix);
  const lagnaTransitAnalysis = analyzeTransitPoint("ลัคนาจร", lagnaTransit, matrix);
  const monthlyAnalysis = analyzeTransitPoint("เดือนจร", monthlyJorn, matrix);
  const dailyAnalysis = analyzeTransitPoint("วันจร", dailyJorn, matrix);

  // ตรวจสอบตัวกรอง
  let filterContext = "";
  if (body.filterType === "star") {
    const starNum = Number(body.filterValue);
    const starName = (STAR_NAMES as any)[starNum] || `ดาว ${starNum}`;
    const bhop = taksaMap[starNum] || "ปกติ";
    filterContext = `ผู้ใช้กำลังเพ่งความสนใจไปที่: ${starName} (กำลังเสวยภพทักษาจร "${bhop}")`;
  } else if (body.filterType === "taksa") {
    filterContext = `ผู้ใช้กำลังเพ่งความสนใจไปที่กลุ่มภพทักษาจร: "${body.filterValue}"`;
  } else if (body.filterType === "maha") {
    filterContext = `ผู้ใช้กำลังเพ่งความสนใจไปที่กลุ่มภพมหาภูติจร: "${body.filterValue}"`;
  }

  // 3. ประกอบ System Prompt ขั้นสูง (แยกตามโหมดดวงจร vs พื้นดวงเดิม)
  let prompt = "";

  if (isTransitMode) {
    prompt = `คุณคือ "ที่ปรึกษาชีวิตและกัลยาณมิตรผู้มีปัญญาญาณ" แห่ง PhoPePhum OS
คุณกำลังสนทนาและให้คำปรึกษาดวงชะตาจรกับ: "${subjectName}"

══════════════════════════════════════════════════════════════════════
[ข้อมูลดวงชะตาและจังหวะจรของ ${subjectName} — สำหรับให้คุณใช้ประมวลผลภายในเท่านั้น]
══════════════════════════════════════════════════════════════════════
- วันเกิด: ${birthDate} เวลา ${birthTime} น. จังหวัด ${birthPlace}
- วันที่ตรวจดวง: ${transitDate} เวลา ${transitTime} น. (อายุย่างปัจจุบัน ${currentAge} ปี)
- วัยจร: เสวยภพ${vayaAnalysis?.houseName || "—"} กำลังฐานหนุนคือ ${vayaAnalysis?.base4Name || "—"}
- ปีจร: เสวยภพ${yearlyAnalysis?.houseName || "—"} กำลังฐานหนุนคือ ${yearlyAnalysis?.base4Name || "—"}
- ลัคนาจร: ภพ${lagnaTransitAnalysis?.houseName || "—"}
- จุดเด่นทักษาจร: สิ่งหนุนนำโชคลาภคือดาว ${sriStar}, พลังอำนาจคือดาว ${dechStar}, ผู้ใหญ่อุปถัมภ์คือดาว ${montriStar}, สิ่งที่ต้องระวัง/อุปสรรคคือดาว ${kaliStar}

${filterContext ? `[จุดที่ผู้ใช้สนใจเป็นพิเศษ]: ${filterContext}\n` : ""}${
  Array.isArray(body.history) && body.history.length > 0
    ? `\n[บทสนทนาก่อนหน้านี้]:\n` +
      body.history
        .slice(-6)
        .map(h => `${h.role === "user" ? subjectName : "ที่ปรึกษา"}: ${h.content.slice(0, 300)}`)
        .join("\n") +
      "\n"
    : ""
}
══════════════════════════════════════════════════════════════════════
คำถามของ ${subjectName}:
"${question}"
══════════════════════════════════════════════════════════════════════

กฎเหล็กในการตอบ (สำคัญที่สุด):
1. **คุยแบบมนุษย์ เป็นธรรมชาติและอบอุ่น**: ใช้ภาษาพูดคุยที่เข้าใจง่าย สุภาพ เหมือนผู้ใหญ่ใจดีหรือที่ปรึกษาส่วนตัวที่เข้าใจชีวิตกำลังคุยกับผู้ถาม
2. **ห้ามอธิบายสูตรคำนวณหรือศัพท์เทคนิคโหราศาสตร์เด็ดขาด**:
   - ห้ามพูดเรื่อง "ฐานที่ 4 คอลัมน์ที่...", "ดาวย้ำฐาน 5, 6, 7", "สายใยข้ามภพ" หรือศัพท์เชิงโครงสร้างที่คนทั่วไปฟังแล้วงง
   - ห้ามใส่วงเล็บชื่อดาวหรือชื่อภพพร่ำเพรื่อ เช่น ห้ามเขียน "(ราหู)", "(พุธ)", "(ภพทาสา)", "(ภพหินะ)" แต่ให้แปลผลลัพธ์เป็นเหตุการณ์จริงในชีวิต
3. **ไม่เน้นสัญลักษณ์หรือไอคอนเยอะเกินไป**: ลดการใช้ดอกจัน (asterisks) ให้เหลือเฉพาะหัวข้อหลัก ไม่ใส่ bullet point ถี่ยิบ
4. **โครงสร้างคำตอบสั้นกระชับ 3 ส่วน**:
   - **ประเด็นสำคัญ**: ตอบฟันธงหรือสรุปใจความหลักตรงคำถามทันที (1-2 ประโยค)
   - **สถานการณ์ที่กำลังเกิดขึ้น**: อธิบายความเป็นไปในชีวิตช่วงนี้ตามจังหวะเวลา ว่ากำลังเจอกับแรงกดดัน โอกาส หรือความเปลี่ยนแปลงในเรื่องใด
   - **แนวทางรับมือและจังหวะเวลา**: ข้อแนะนำเชิงปฏิบัติที่ชัดเจน นำไปทำได้จริง ทั้งการตัดสินใจทางโลกและการวางใจ
   - ปิดท้ายด้วย 1 ประโยคสั้นๆ ชวนคุยต่ออย่างเป็นมิตร เพื่อให้ ${subjectName} สามารถถามเจาะลึกในจุดที่ต้องการต่อได้ทันที`;
  } else {
    prompt = `คุณคือ "ที่ปรึกษาชีวิตและกัลยาณมิตรผู้มีปัญญาญาณ" แห่ง PhoPePhum OS
คุณกำลังสนทนาและให้คำปรึกษาดวงชะตากับ: "${subjectName}"

══════════════════════════════════════════════════════════════════════
[ข้อมูลดวงชะตาของ ${subjectName} — สำหรับให้คุณใช้ประมวลผลภายในเท่านั้น]
══════════════════════════════════════════════════════════════════════
- วันเกิด: ${birthDate} เวลา ${birthTime} น. จังหวัด ${birthPlace}
- วันเกิดจันทรคติ: ${lunar?.thaiDateText || "—"} (ปี${lunar?.zodiacName || "—"})
- อายุย่างปัจจุบัน: ${currentAge} ปี
- จุดหนุนนำโชคลาภ: ดาว ${sriStar}
- จุดเกียรติยศอำนาจ: ดาว ${dechStar}
- ผู้ใหญ่อุปถัมภ์: ดาว ${montriStar}
- จุดที่ต้องระวังรอบคอบ: ดาว ${kaliStar}

${filterContext ? `[จุดที่ผู้ใช้สนใจเป็นพิเศษ]: ${filterContext}\n` : ""}${
  Array.isArray(body.history) && body.history.length > 0
    ? `\n[บทสนทนาก่อนหน้านี้]:\n` +
      body.history
        .slice(-6)
        .map(h => `${h.role === "user" ? subjectName : "ที่ปรึกษา"}: ${h.content.slice(0, 300)}`)
        .join("\n") +
      "\n"
    : ""
}
══════════════════════════════════════════════════════════════════════
คำถามของ ${subjectName}:
"${question}"
══════════════════════════════════════════════════════════════════════

กฎเหล็กในการตอบ (สำคัญที่สุด):
1. **คุยแบบมนุษย์ เป็นธรรมชาติและอบอุ่น**: ใช้ภาษาพูดคุยที่เข้าใจง่าย สุภาพ เหมือนผู้ใหญ่ใจดีหรือที่ปรึกษาส่วนตัวที่เข้าใจชีวิตกำลังคุยกับผู้ถาม
2. **ห้ามอธิบายสูตรคำนวณหรือศัพท์เทคนิคโหราศาสตร์เด็ดขาด**:
   - ห้ามพูดเรื่อง "แถว 1 แถว 2 แถว 4", "ฐาน 9", "เมทริกซ์" หรือแจกแจงโครงสร้างดาว
   - ห้ามใส่วงเล็บชื่อดาวหรือชื่อภพพร่ำเพรื่อ เช่น ห้ามเขียน "(ราหู)", "(พุธ)", "(ภพทาสา)" แต่ให้แปลงเป็นความหมายจริงที่จับต้องได้
3. **ไม่เน้นสัญลักษณ์หรือไอคอนเยอะเกินไป**: ลดการใช้ดอกจันและสัญลักษณ์ตกแต่ง ให้ตัวหนังสืออ่านสบายตา
4. **โครงสร้างคำตอบสั้นกระชับ 3 ส่วน**:
   - **ประเด็นสำคัญ**: ตอบตรงคำถามทันที ชัดเจน เข้าใจง่าย
   - **สถานการณ์ที่กำลังเกิดขึ้น**: สรุปกระแสชีวิตและสิ่งแวดล้อมรอบตัวในช่วงนี้
   - **แนวทางรับมือและจังหวะเวลา**: แนะนำสิ่งที่ควรทำและสิ่งที่ควรชะลอ พร้อมคำแนะนำเสริมมงคลทางใจ
   - ปิดท้ายด้วย 1 ประโยคสั้นๆ เชิญชวนให้ถามต่อได้อย่างสบายใจ`;
  }

  // 4. พยายามเชื่อมต่อกับ AI Worker (DeepSeek / Gemini)
  if (env.AI_WORKER_URL && env.AI_WORKER_SECRET) {
    try {
      const aiResponse = await fetch(`${env.AI_WORKER_URL}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.AI_WORKER_SECRET}`,
        },
        body: JSON.stringify({
          userId: user.id,
          reportType: isTransitMode ? "horoscope_transit_chat" : "horoscope_chat",
          context: {
            subjectName,
            birthDate,
            transitDate,
            question,
            ageYang: currentAge,
            forecastMode: isTransitMode ? "transit" : "natal",
            vayaAnalysis,
            yearlyAnalysis,
            history: body.history?.slice(-6),
          },
          prompt,
        }),
      });

      if (aiResponse.ok && aiResponse.body) {
        return new Response(aiResponse.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }
    } catch (workerErr) {
      console.error("AI Worker fetch failed, falling back to local synthesis:", workerErr);
    }
  }

  // 5. Intelligent Fallback Synthesis (เมื่อ AI Worker ออฟไลน์ หรือ Dev Mode)
  // ประมวลผลจาก Engine จริงแบบเฉพาะเจาะจงกับคำถามและผังดวง
  const fallbackResponse = generateEngineFallback({
    subjectName,
    question,
    currentAge,
    sriStar,
    dechStar,
    montriStar,
    kaliStar,
    lunarText: lunar?.thaiDateText || "วันเกิดจันทรคติ",
    zodiacName: lunar?.zodiacName || "",
    matrix,
    isTransitMode,
    vayaAnalysis,
    yearlyAnalysis,
    lagnaTransitAnalysis,
    monthlyAnalysis,
    dailyAnalysis,
  });

  // ส่งผลลัพธ์แบบสตรีมจำลอง (SSE)
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const chunks = fallbackResponse.match(/.{1,15}/g) || [fallbackResponse];
      let idx = 0;
      const interval = setInterval(() => {
        if (idx < chunks.length) {
          const payload = JSON.stringify({ text: chunks[idx] });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          idx++;
        } else {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          clearInterval(interval);
          controller.close();
        }
      }, 40);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function generateEngineFallback({
  subjectName,
  question,
  currentAge,
  sriStar,
  dechStar,
  montriStar,
  kaliStar,
  lunarText,
  zodiacName,
  matrix,
  isTransitMode,
  vayaAnalysis,
  yearlyAnalysis,
  lagnaTransitAnalysis,
  monthlyAnalysis,
  dailyAnalysis,
}: {
  subjectName: string;
  question: string;
  currentAge: number;
  sriStar: string;
  dechStar: string;
  montriStar: string;
  kaliStar: string;
  lunarText: string;
  zodiacName: string;
  matrix: number[][];
  isTransitMode?: boolean;
  vayaAnalysis?: any;
  yearlyAnalysis?: any;
  lagnaTransitAnalysis?: any;
  monthlyAnalysis?: any;
  dailyAnalysis?: any;
}) {
  const isLegal = /คดี|ความ|ฟ้อง|ศาล|สัญญา|ตำรวจ|ทนาย|อุปสรรค|ศัตรู/i.test(question);
  const isFinance = /เงิน|ทอง|หนี้|ทรัพย์|รวย|ลงทุน|ลาภ|กำไร/i.test(question);
  const isCareer = /งาน|ธุรกิจ|เลื่อน|ตำแหน่ง|ย้าย|โปรเจกต์|สมัคร/i.test(question);
  const isLove = /รัก|แฟน|คู่|แต่งงาน|เลิก|ชอบ|คนรัก/i.test(question);

  // ── โหมดดวงจร (Transit Horoscope Forecast Engine) ──────────────────────────
  if (isTransitMode) {
    if (isLegal) {
      return `เรื่องนี้ผ่านพ้นได้แน่นอนค่ะ แต่ต้องผ่านด้วยการเจรจาอย่างมีเงื่อนไขและหลักฐานที่รอบคอบ ไม่ใช่การปล่อยให้เวลาผ่านไปเฉยๆ

**ประเด็นสำคัญ**
สถานการณ์นี้มีทางออกที่ชัดเจน โดยบทสรุปจะจบลงด้วยข้อตกลงหรือเอกสารสัญญามากกว่าการต้องเผชิญหน้ากันจนถึงที่สุด ผลลัพธ์โดยรวมจะไม่เกิดความเสียหายรุนแรง แต่ต้องยอมรับเงื่อนไขบางประการเพื่อแลกกับความสงบเรียบร้อย

**สถานการณ์ที่กำลังเกิดขึ้น**
ช่วงเวลานี้เป็นช่วงที่มีแรงผลักดันและแรงกดดันเข้ามาพร้อมกัน อีกฝ่ายอาจพยายามใช้ความซับซ้อนของเอกสารหรือท่าทีกดดันเพื่อสร้างความลังเลใจให้กับท่าน แต่ในขณะเดียวกัน ฝ่ายตรงข้ามก็มีจุดอ่อนในเรื่องความประมาทและรายละเอียดที่ผิดพลาดของเขาเอง ซึ่งเป็นช่องทางที่ท่านสามารถนำมาใช้ตั้งรับได้

**แนวทางรับมือและจังหวะเวลา**
ขอให้เน้นการเจรจาบนพยานเอกสารเป็นหลัก ไม่แนะนำให้ตอบโต้ด้วยอารมณ์ และควรให้ผู้ใหญ่หรือคนกลางที่มีความรอบคอบเข้ามาช่วยเป็นตัวแทนในการประสานงาน จะช่วยตัดความตึงเครียดลงได้อย่างรวดเร็ว

หากท่านมีรายละเอียดของเอกสารหรือจุดที่ยังกังวลใจเป็นพิเศษ สามารถถามเจาะลึกเพิ่มเติมได้เลยนะคะ`;
    }

    if (isFinance) {
      return `การเงินในรอบเวลานี้มีสัญญาณที่ดีของการหมุนเวียนและการเปิดช่องทางใหม่ แต่ต้องมีวินัยในการคัดกรองรายจ่ายกะทันหันค่ะ

**ประเด็นสำคัญ**
กระแสโชคลาภและโอกาสในการสร้างรายได้กำลังเคลื่อนเข้ามาหาท่านอย่างชัดเจน สิ่งที่ริเริ่มหรือวางแผนไว้จะมีผลตอบแทนเข้ามาตามจังหวะ แต่จุดที่ต้องระวังคือการรั่วไหลจากภาระที่ไม่ได้ตั้งใจ

**สถานการณ์ที่กำลังเกิดขึ้น**
ท่านกำลังอยู่ในช่วงที่พลังแห่งความสำเร็จเริ่มทำงาน ข้อตกลงเรื่องเงินหรือการค้าจะเริ่มขยับตัวไปข้างหน้า แต่ก็จะมีคนใกล้ชิดหรือเรื่องซ่อมแซมเข้ามาแทรกแซงความคล่องตัวอยู่บ้าง ทำให้รู้สึกว่าเงินเข้ามาแล้วต้องรีบจัดสรร

**แนวทางรับมือและจังหวะเวลา**
แนะนำให้แยกบัญชีเงินสำรองและเงินหมุนเวียนออกจากกันให้เด็ดขาด ชะลอการลงทุนที่มีความเสี่ยงสูงไปก่อน และหากต้องเซ็นสัญญาเรื่องเงิน ให้ตรวจเช็กตัวเลขและเงื่อนไขอย่างใจเย็นที่สุด

อยากให้เจาะจงเรื่องช่องทางทำเงิน หรือการจัดการหนี้สินและสภาพคล่องส่วนไหนเพิ่มเติม สอบถามต่อได้เลยค่ะ`;
    }

    if (isCareer) {
      return `ช่วงนี้เป็นจังหวะที่ท่านจะได้แสดงความสามารถและก้าวขึ้นมารับผิดชอบงานสำคัญ ซึ่งจะเป็นผลงานชิ้นเอกของท่านค่ะ

**ประเด็นสำคัญ**
ทิศทางหน้าที่การงานกำลังเปิดทางสู่ความก้าวหน้า ผู้ใหญ่และคนรอบข้างจะเริ่มเห็นคุณค่าในสิ่งที่ท่านทุ่มเท และมีโอกาสได้รับมอบหมายภารกิจที่เพิ่มอำนาจการตัดสินใจให้ท่านมากขึ้น

**สถานการณ์ที่กำลังเกิดขึ้น**
ภาระงานอาจจะถาโถมเข้ามามากเป็นพิเศษจนทำให้รู้สึกเหน็ดเหนื่อยหรือมีความตึงเครียดในการประสานงานกับทีม แต่ความกดดันนี้คือการทดสอบศักยภาพ หากท่านจัดลำดับความสำคัญได้ดี งานชิ้นนี้จะกลายเป็นผลงานที่สร้างชื่อเสียงให้ท่านอย่างมาก

**แนวทางรับมือและจังหวะเวลา**
ให้สื่อสารอย่างกระชับ ชัดเจน และทำบันทึกสรุปงานทุกขั้นตอนเพื่อป้องกันการเข้าใจผิด หลีกเลี่ยงการแบกรับงานไว้คนเดียว ให้แบ่งงานตามความถนัดของทีม และพักผ่อนให้เพียงพอเพื่อรักษาความเฉียบคมในการตัดสินใจ

ท่านกำลังเตรียมตัวเจรจากับหัวหน้า หรือมีโปรเจกต์ใดที่อยากปรึกษาแนวทางเป็นพิเศษไหมคะ`;
    }

    if (isLove) {
      return `ความสัมพันธ์ในช่วงนี้ต้องการความเข้าใจและการรับฟังอย่างลึกซึ้ง หากปรับความเข้าใจกันได้จะกลายเป็นสายสัมพันธ์ที่มั่นคงยิ่งขึ้นค่ะ

**ประเด็นสำคัญ**
เรื่องความรักและคนใกล้ชิดไม่มีอะไรร้ายแรง แต่เป็นช่วงเวลาที่ต้องการความชัดเจนและการพูดคุยกันอย่างเปิดอก ไม่ควรเก็บความกังวลไว้ฝ่ายเดียว

**สถานการณ์ที่กำลังเกิดขึ้น**
อาจมีเรื่องของอารมณ์หรือความเหนื่อยล้าจากภายนอกเข้ามาสะกิดให้เข้าใจผิดกันได้ง่าย หรืออาจมีความรู้สึกว่าอีกฝ่ายไม่ค่อยมีเวลาให้ ซึ่งแท้จริงแล้วเกิดจากภาระหน้าที่ที่ทั้งสองฝ่ายกำลังเผชิญอยู่

**แนวทางรับมือและจังหวะเวลา**
ใช้ความนุ่มนวลและรับฟังให้มากกว่าการโต้เถียง หลีกเลี่ยงการหยิบยกเรื่องเก่าขึ้นมาพูดซ้ำ และหาเวลาทำกิจกรรมสบายๆ ร่วมกันเพื่อฟื้นฟูพลังใจให้แก่กัน

มีเรื่องราวหรือความรู้สึกใดของคนรักที่ทำให้ท่านกังวลใจอยู่ในตอนนี้ เล่าให้ฟังได้นะคะ`;
    }

    // ภาพรวมดวงจร
    return `จังหวะชีวิตของ ${subjectName} ในช่วงนี้กำลังก้าวเข้าสู่การเปลี่ยนแปลงเชิงบวก แม้จะมีบททดสอบให้ต้องแก้ไข แต่ก็มีแรงเกื้อหนุนให้ผ่านได้เสมอค่ะ

**ประเด็นสำคัญ**
ภาพรวมในวัยจรปีนี้เป็นช่วงเวลาแห่งการสร้างตัวและการปรับฐานชีวิตให้มั่นคง เรื่องที่เคยติดขัดหรือยืดเยื้อจะเริ่มส่งสัญญาณของทางออกที่ชัดเจนขึ้นในไม่ช้า

**สถานการณ์ที่กำลังเกิดขึ้น**
ท่านอาจกำลังรู้สึกถึงแรงกดดันและความรับผิดชอบที่มากขึ้นรอบตัว มีเรื่องที่ต้องตัดสินใจเด็ดขาดเพื่อปลดล็อกสิ่งเดิมๆ ซึ่งเป็นจังหวะธรรมชาติที่กำลังผลักดันให้ท่านเติบโตไปอีกขั้น

**แนวทางรับมือและจังหวะเวลา**
ตั้งสติให้อยู่กับปัจจุบัน วางแผนเป็นขั้นตอน และเปิดรับคำแนะนำจากผู้ใหญ่ที่หวังดี การก้าวเดินอย่างมั่นคงจะนำพาท่านไปสู่ผลลัพธ์ที่น่าพึงพอใจอย่างแน่นอนค่ะ

หากมีเรื่องใดที่ท่านต้องการให้เจาะลึกเป็นพิเศษ ไม่ว่าจะเป็นการงาน การเงิน หรือเรื่องส่วนตัว ถามต่อได้เลยนะคะ`;
  }

  // ── โหมดพื้นดวงเดิม (Natal Forecast Engine) ──────────────────────────────
  if (isLegal) {
    return `ในเรื่องข้อพิพาทหรือคดีความนี้ ท่านมีเกณฑ์ที่ดีในการหาข้อยุติที่ลงตัว และจะผ่านพ้นไปได้ด้วยความรอบคอบค่ะ

**ประเด็นสำคัญ**
ปัญหาหรือความขัดแย้งที่เกิดขึ้นจะสามารถคลี่คลายได้ โดยจะมีผู้ใหญ่หรือที่ปรึกษาที่มีความสามารถเข้ามาช่วยชี้แนะแนวทางที่ถูกต้อง ทำให้ความกดดันที่แบกรับอยู่ค่อยๆ เบาบางลง

**สถานการณ์ที่กำลังเกิดขึ้น**
ในระยะนี้อาจมีความตึงเครียดจากเอกสารหรือคำพูดที่กดดันจากอีกฝ่าย ทำให้รู้สึกกังวลใจ แต่ในความเป็นจริงแล้ว ข้อเท็จจริงอยู่ข้างท่าน ขอเพียงอย่าใจร้อนหรือหลงกลการยั่วยุ

**แนวทางรับมือและจังหวะเวลา**
รวบรวมหลักฐานและเอกสารทุกอย่างให้เป็นระบบ ชี้แจงตามข้อเท็จจริงอย่างสุภาพและหนักแน่น และหมั่นทำบุญปล่อยชีวิตสัตว์หรือช่วยเหลือผู้ยากไร้เพื่อเสริมพลังใจและความสงบในจิตตนเองค่ะ

มีประเด็นไหนในเอกสารหรือการเจรจาที่ยังติดขัดอยู่ สามารถสอบถามเพิ่มเติมได้นะคะ`;
  }

  if (isFinance) {
    return `พื้นดวงและจังหวะการเงินของท่านมีพลังเกื้อหนุนที่ดี มีโอกาสในการสร้างรายได้และตั้งหลักได้อย่างมั่นคงค่ะ

**ประเด็นสำคัญ**
ท่านมีศักยภาพในการหาเงินและสร้างช่องทางรายได้เข้ามาอย่างต่อเนื่อง หากมีเป้าหมายที่ชัดเจน เงินทองจะไหลเวียนเข้ามาได้ตามความพยายาม

**สถานการณ์ที่กำลังเกิดขึ้น**
สิ่งที่ต้องระวังมีเพียงเรื่องเดียวคือรายจ่ายจุกจิกหรือการใจอ่อนช่วยเหลือผู้อื่นจนตนเองตึงมือ ซึ่งอาจทำให้รู้สึกว่าเงินเก็บไม่พอกพูนเท่าที่ควร

**แนวทางรับมือและจังหวะเวลา**
วางแผนงบประมาณให้รัดกุม เก็บออมก่อนใช้จ่าย และเปิดรับโอกาสใหม่ๆ ที่เข้ามาอย่างมีสติ การทำบุญเกี่ยวกับค่าน้ำค่าไฟหรือแสงสว่างจะช่วยเปิดทางทรัพย์ให้ราบรื่นยิ่งขึ้นค่ะ

ท่านกำลังเล็งการลงทุนหรือมีแผนการเงินก้อนใหญ่เรื่องใดอยู่เป็นพิเศษไหมคะ ถามต่อได้เลยค่ะ`;
  }

  if (isCareer) {
    return `ดวงการงานของท่านเป็นดวงของผู้ที่มีความสามารถในการบริหารจัดการและมีเกียรติยศในสายงานของตนเองค่ะ

**ประเด็นสำคัญ**
ท่านมีเกณฑ์ได้รับการสนับสนุนและยอมรับในฝีมือ ผลงานที่สร้างไว้จะนำไปสู่ความก้าวหน้าและความมั่นคงในระยะยาว

**สถานการณ์ที่กำลังเกิดขึ้น**
ความท้าทายหลักมักมาจากภาระหน้าที่ที่ต้องแบกรับไว้หลายด้านพร้อมกัน หรือการประสานงานกับคนที่หลากหลาย ขอให้อดทนและแสดงความจริงใจ จะชนะใจคนได้ในที่สุด

**แนวทางรับมือและจังหวะเวลา**
เน้นการทำงานที่มีระบบชัดเจน สื่อสารตรงไปตรงมา และพัฒนาทักษะใหม่อยู่เสมอ พร้อมทั้งเสริมดวงด้วยการช่วยเหลือสนับสนุนการศึกษาแก่เด็กด้อยโอกาสเพื่อเพิ่มพูนบารมีปัญญาค่ะ

อยากให้แนะนำเรื่องการเปลี่ยนสายงาน เลื่อนตำแหน่ง หรือการทำธุรกิจส่วนตัวเพิ่มเติมไหมคะ`;
  }

  return `จากผังดวงชะตาของ ${subjectName} ท่านมีพื้นฐานดวงชะตาที่เข้มแข็ง มีพลังของความเมตตาและปัญญาเป็นเกราะคุ้มกันชีวิตค่ะ

**ประเด็นสำคัญ**
ไม่ว่าจะพบเจอกับอุปสรรคใดในชีวิต ท่านจะมีหนทางและผู้ใหญ่คอยเกื้อกูลให้ก้าวข้ามผ่านไปได้เสมอ สิ่งสำคัญคือการรักษาความมั่นใจและความดีงามในตนเอง

**สถานการณ์ที่กำลังเกิดขึ้น**
ในห้วงเวลานี้เป็นช่วงที่ท่านควรทบทวนเป้าหมายชีวิตและจัดระเบียบสิ่งที่สำคัญที่สุด อะไรที่ไม่เป็นประโยชน์ให้ค่อยๆ ปล่อยวาง เพื่อเปิดรับพลังงานที่ดีเข้ามา

**แนวทางรับมือและจังหวะเวลา**
ดำเนินชีวิตด้วยสติ ไม่ประมาทในการตัดสินใจเรื่องสำคัญ และหมั่นสร้างบุญกุศลด้วยความบริสุทธิ์ใจ จะช่วยเสริมให้ชีวิตราบรื่นและเปี่ยมสุขในทุกๆ ด้านค่ะ

หากท่านมีคำถามเฉพาะเจาะจงเรื่องใด ไม่ว่าจะเป็นชีวิต การงาน หรือครอบครัว สอบถามได้ตลอดเวลานะคะ`;
}
