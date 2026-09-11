import { json } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth } from "~/services/auth.server";
import {
  calculatePhopephum,
  getYamPrediction,
  calculateLagnaNakshatra,
  STAR_NAMES,
} from "@phopephum/engine";
import type { Env } from "~/env.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);

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

  // 3. ประกอบ System Prompt ขั้นสูง
  const prompt = `คุณคือ "Wisdom Guidance" — บรมครูโหราจารย์ผู้เชี่ยวชาญคัมภีร์เลข ๗ ตัว ๙ ฐาน และมหาภูติทักษาจักรพรรดิแห่ง PhoPePhum OS
คุณกำลังวิเคราะห์ดวงชะตาเฉพาะบุคคลให้กับ: "${subjectName}"

══════════════════════════════════════════════════════════════════════
[ข้อมูลดวงชะตาของ ${subjectName}]
══════════════════════════════════════════════════════════════════════
- วันเดือนปีเกิด: ${birthDate} เวลา ${birthTime} น. จังหวัด ${birthPlace}
- วันจันทรคติเกิด: ${lunar?.thaiDateText || "—"} (ปี${lunar?.zodiacName || "—"})
- อายุย่างปัจจุบัน: ${currentAge} ปี
- วันที่ตรวจดวง (วันจร): ${transitDate} เวลา ${transitTime} น.
- ลัคนา/ฤกษ์เกิด: ${lagna?.nakshatra?.thaiName || "—"} (ตรียางค์ ${lagna?.triyang || "—"})
- ยามอัฏฐกาลกำเนิด: ${birthYam?.yamName || "—"}

[ผังเลข ๗ ตัว ๙ ฐาน (Matrix 9x7)]
- แถว 1 (อัตตะ-มัชฌิมา-ลาภะ): ${matrix[0]?.join("  ") || "—"}
- แถว 2 (มรณะ-ปัตนิ-ทาสี): ${matrix[1]?.join("  ") || "—"}
- แถว 3 (กัมมะ-พะยัง-ทาสา): ${matrix[2]?.join("  ") || "—"}
- แถว 4 (ฐานกำลังมหาคุณ): ${matrix[3]?.join("  ") || "—"}
- แถว 5 (ฐานเศษ): ${matrix[4]?.join("  ") || "—"}
- แถว 8 (ผังจักรพรรดิ อาตมา): ${matrix[7]?.join("  ") || "—"}
- แถว 9 (ผังจักรพรรดิ ภริยัง): ${matrix[8]?.join("  ") || "—"}

[ระบบทักษาจรปีนี้ (อายุย่าง ${currentAge} ปี)]
- ดาวบริวารจร: ดาว ${taksaTransit?.bariStar || "—"}
- ดาวศรีจร (โชคลาภ/ความสำเร็จ): ดาว ${sriStar}
- ดาวเดชจร (อำนาจ/เกียรติยศ): ดาว ${dechStar}
- ดาวมนตรีจร (ผู้ใหญ่อุปถัมภ์): ดาว ${montriStar}
- ดาวกาลกิณีจร (อุปสรรค/เรื่องที่ต้องระวัง): ดาว ${kaliStar}
- ดาวอายุจร (สุขภาพ/พลังชีวิต): ดาว ${ayuStar}

[ระบบมหาภูติจร]
- มหาภูติจร: ${JSON.stringify(mahaTransit?.map || {})}

${filterContext ? `[จุดเน้นพิเศษ]: ${filterContext}\n` : ""}${
  Array.isArray(body.history) && body.history.length > 0
    ? `\n[บริบทบทสนทนาก่อนหน้านี้ของ ${subjectName}]:\n` +
      body.history
        .slice(-6)
        .map(h => `${h.role === "user" ? subjectName : "Wisdom Guidance"}: ${h.content.slice(0, 300)}`)
        .join("\n") +
      "\n"
    : ""
}
══════════════════════════════════════════════════════════════════════
คำถามล่าสุดของ ${subjectName}:
"${question}"
══════════════════════════════════════════════════════════════════════

คำแนะนำและกติกาวิชาการในการพยากรณ์:
1. เจาะจงคำทำนายไปที่ "${question}" โดยตรง โดยใช้หลักวิชาเลข ๗ ตัว ๙ ฐาน และทักษาจรของ ${subjectName} หากเป็นการถามต่อเนื่องจากคำถามก่อนหน้า ให้ตอบอย่างสอดคล้องและลึกซึ้งขึ้น
   - หากถามเรื่อง "คดีความ/ข้อพิพาท/อุปสรรค": วิเคราะห์ดาวกาลกิณีจร (ดาว ${kaliStar}) และภพอริ, มรณะ, วินาศ พร้อมดูฐานรองรับ (ฐานกำลังมหาคุณ และฐาน 8-9) ว่ามีดาวช่วยค้ำจุนหรือไม่
   - หากถามเรื่อง "การเงิน/หนี้สิน/โชคลาภ": วิเคราะห์ดาวศรีจร (ดาว ${sriStar}), ภพกดุมภะ, ลาภะ และฐานโสฬส/มหาจักรพรรดิ
   - หากถามเรื่อง "การงาน/ธุรกิจ/เลื่อนตำแหน่ง": วิเคราะห์ดาวเดชจร (ดาว ${dechStar}), ดาวมนตรีจร (ดาว ${montriStar}) และภพกัมมะ
   - หากถามเรื่อง "ความรัก/ครอบครัว": วิเคราะห์ภพปัตนิ, ปิตา, มาตา และดาวศุกร์/ดาวคู่มิตร
2. โครงสร้างคำตอบต้องชัดเจน สละสลวย ลึกซึ้ง และมีระดับ (Master Astrologer Tone):
   - **ส่วนที่ 1: การถอดรหัสผังดาวและภพเรือน**: ชี้ชัดว่าเรื่องนี้ตกภพใด ดาวใดครองเรือน และมีฐานใดหนุนนำ (อ้างอิงชื่อ ${subjectName} อย่างเป็นธรรมชาติ)
   - **ส่วนที่ 2: การพยากรณ์แนวโน้มและจังหวะเวลา (Timing & Trajectory)**: ผลสรุปจะเป็นอย่างไร ช่วงไหนคลี่คลาย หรือช่วงไหนต้องตั้งรับ
   - **ส่วนที่ 3: กลยุทธ์แก้เกมและเสริมมงคลทางธาตุ (Tactical Strategy)**: ให้คำแนะนำเชิงปฏิบัติจริงทั้งในทางโลก (กฎหมาย/การเจรจา/สติ) และทางธรรม/โหราศาสตร์ (การทำบุญปรับพลังงานดาว)
3. ความยาว: 3–4 ย่อหน้าที่มีเนื้อหาเข้มข้น ตรงจุด ไม่พูดกว้างๆ ลอยๆ และไม่สั้นกุด`;

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
          reportType: "horoscope_chat",
          context: {
            subjectName,
            birthDate,
            transitDate,
            question,
            ageYang: currentAge,
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
}) {
  const isLegal = /คดี|ความ|ฟ้อง|ศาล|สัญญา|ตำรวจ|ทนาย|อุปสรรค|ศัตรู/i.test(question);
  const isFinance = /เงิน|ทอง|หนี้|ทรัพย์|รวย|ลงทุน|ลาภ|กำไร/i.test(question);
  const isCareer = /งาน|ธุรกิจ|เลื่อน|ตำแหน่ง|ย้าย|โปรเจกต์|สมัคร/i.test(question);
  const isLove = /รัก|แฟน|คู่|แต่งงาน|เลิก|ชอบ|คนรัก/i.test(question);

  if (isLegal) {
    return `✦ **ถอดรหัสชะตาคดีความและอุปสรรคของ ${subjectName} (อายุย่าง ${currentAge} ปี)**

จากผังคัมภีร์เลข ๗ ตัว ๙ ฐาน และทักษาจรจักรพรรดิ ในวัยจรปีนี้เรื่องคดีความหรือข้อพิพาทผูกโยงกับพลังงานของ **ดาว ${kaliStar} ซึ่งทำหน้าที่เป็นกาลกิณีจร** ส่งผลกระทบเข้าสู่ภพอริและวินาศ ทำให้ช่วงแรกอาจมีความตึงเครียด มีเรื่องจุกจิกจากเอกสารสัญญาหรือคู่กรณีที่พยายามกดดัน

อย่างไรก็ดี ในฐานกำลังมหาคุณ (ฐานที่ ๔) และฐานผังจักรพรรดิพบว่ามี **ดาว ${montriStar} (มนตรีจร) และดาว ${dechStar} (เดชจร)** สถิตอยู่ในตำแหน่งหนุนชะตา แปลว่าเจ้าชะตามิได้โดดเดี่ยว จะมีผู้หลักผู้ใหญ่หรือที่ปรึกษาทางกฎหมายที่มีความสามารถเข้ามาให้คำแนะนำชี้ทางสว่าง ส่งผลให้ความกดดันจะค่อยๆ คลี่คลายลงตามลำดับ

**กลยุทธ์แก้เกมและเสริมดวง:**
1. **ทางโลก:** ให้ยึดถือพยานหลักฐานที่เป็นลายลักษณ์อักษรเป็นหลัก หลีกเลี่ยงการปะทะด้วยอารมณ์หรือการเจรจานอกรอบที่ไม่โปร่งใส
2. **ทางธรรมและเสริมธาตุ:** แนะนำให้ ${subjectName} ทำบุญปล่อยชีวิตสัตว์น้ำ หรือบริจาคทานค่ายาให้แก่ผู้ป่วยยากไร้ เพื่อสลายพลังงานกาลกิณีจร และหมั่นสวดบทมหาเมตตาใหญ่เสริมบารมี จะช่วยพลิกจากหนักให้กลายเป็นเบาได้อย่างมั่นคงค่ะ`;
  }

  if (isFinance) {
    return `✦ **ถอดรหัสกระแสทรัพย์และการเงินของ ${subjectName} (อายุย่าง ${currentAge} ปี)**

เมื่อพิจารณาผังดวง ๗ ตัว ๙ ฐาน พบว่ากระแสการเงินในปีจรนี้ได้รับอิทธิพลเชิงบวกจาก **ดาว ${sriStar} ซึ่งเสวยตำแหน่ง "ศรีจร"** สถิตส่งกำลังตรงถึงภพกดุมภะและลาภะ บ่งชี้ว่าโอกาสแห่งรายได้และช่องทางสร้างผลกำไรใหม่ๆ กำลังเปิดกว้างขึ้นอย่างมีนัยสำคัญ

อย่างไรก็ดี ควรระวังรายจ่ายจรที่ผูกกับ **ดาว ${kaliStar} (กาลกิณีจร)** ที่อาจเข้ามาในรูปของการซ่อมแซมหรือภาระแทนผู้อื่น จึงควรแยกบัญชีเงินเก็บและบัญชีหมุนเวียนให้ชัดเจน

**คำแนะนำเชิงกลยุทธ์:**
การลงทุนหรือเจรจาเรื่องเงินจะมีจังหวะที่ดีที่สุดในช่วงที่ยามอัฏฐกาลตกยามที่เป็นมิตร แนะนำให้ทำบุญถวายค่าน้ำ-ค่าไฟวัด หรือบริจาคหลอดไฟแสงสว่าง เพื่อเปิดทางแสงแห่งโภคทรัพย์ให้ไหลเวียนเข้าสู่ชีวิตของ ${subjectName} อย่างราบรื่นค่ะ`;
  }

  if (isCareer) {
    return `✦ **ถอดรหัสภารกิจและความก้าวหน้าในงานของ ${subjectName} (อายุย่าง ${currentAge} ปี)**

ในผังเลข ๗ ตัว ๙ ฐาน ภพกัมมะและมังคละในปีนี้เชื่อมโยงกับ **ดาว ${dechStar} (เดชจร) และดาว ${montriStar} (มนตรีจร)** ชี้ชัดว่าเจ้าชะตาจะได้แสดงฝีมือและบทบาทความเป็นผู้นำที่ชัดเจนขึ้น ผู้บริหารหรือลูกค้าจะเริ่มมองเห็นคุณค่าในความสามารถของท่าน

อุปสรรคสำคัญคือภาระงานที่ถาโถมเข้ามาพร้อมกันจากพลัง **ดาว ${kaliStar}** ที่อาจทำให้เหน็ดเหนื่อยกับการประสานงาน แต่หากผ่านการทดสอบนี้ไปได้ ผลงานจะกลายเป็นบันไดสำคัญสู่การเลื่อนขั้นหรือขยายกิจการอย่างงดงาม

**ข้อแนะนำ:** ให้เน้นการสื่อสารที่เด็ดขาด กระชับ และมีแผนงานเป็นขั้นตอน พร้อมเสริมมงคลด้วยการทำบุญสนับสนุนการศึกษาแก่เด็กด้อยโอกาสเพื่อเปิดดวงปัญญาและบารมีค่ะ`;
  }

  return `✦ **วิเคราะห์ดวงชะตาชีวิตและทิศทางพลังงานของ ${subjectName} (อายุย่าง ${currentAge} ปี)**

จากคำถามของท่านที่เกี่ยวข้องกับ "${question}" Wisdom Guidance ได้ถอดรหัสผังเลข ๗ ตัว ๙ ฐาน และทักษาจรจันทรคติไทยพบว่า ในปีจรนี้ **ดาว ${sriStar} ทำหน้าที่ศรีจร** คอยเปิดทางแห่งโอกาสและโชคลาภ ในขณะที่ **ดาว ${montriStar} เป็นมนตรีจร** ส่งพลังความเมตตาและการสนับสนุนจากคนรอบข้าง

สิ่งสำคัญที่ ${subjectName} พึงตระหนักคืออิทธิพลของ **ดาว ${kaliStar} (กาลกิณีจร)** ที่อาจทำให้มีเรื่องให้สะดุดใจหรือมีความล่าช้าเกิดขึ้นบ้างในระยะสั้น ขอให้นิ่งและใช้ปัญญาเป็นเครื่องนำทาง อย่าด่วนตัดสินใจด้วยความกังวล

**บทสรุปและคำแนะนำ:**
จังหวะชีวิตของ ${subjectName} กำลังเคลื่อนสู่จุดเปลี่ยนที่เข้มแข็งขึ้น ปัญหาใดๆ ที่กำลังเผชิญอยู่มีทางออกเสมอ แนะนำให้ประคองสติ สร้างบุญกุศลด้วยความบริสุทธิ์ใจ แล้วพลังบารมีจะคุ้มครองเกื้อหนุนให้ท่านประสบความสำเร็จในสิ่งที่ปรารถนาอย่างแน่นอนค่ะ`;
}
