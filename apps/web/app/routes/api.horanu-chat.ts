/**
 * api.horanu-chat.ts — โหรพรายกระซิบ Chat Resource Route
 * รับคำถาม + timestamp → วิเคราะห์ผังดวง 3 องค์ประกอบ → AI proxy → stream กลับ
 *
 * หลักการ: ภพ (เรือนชะตา) + ดาวลอย + มาตรฐานดาว = คำพยากรณ์
 */
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth } from "~/services/auth.server";
import {
  calculateHoraTaynoo,
  PLANET_INFO,
  ZODIAC_ORDER,
  BHAVA_KNOWLEDGE,
  PLANET_KNOWLEDGE,
  KASTERN_FIXED,
} from "@phopephum/engine";
import type { HoraTaynooResult, HoraTaynooSubSlot, PlanetEntry } from "@phopephum/engine";
import type { Env } from "~/env.server";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];

const STATUS_LABEL: Record<string, string> = {
  'maha-uccj':  'มหาอุจจ์ (✿ สีเขียว) — กำลังสูงสุด โดดเด่นที่สุด',
  'kaset':      'เกษตร (△ สีแดง) — มั่นคงถาวร หยั่งรากลึก',
  'racha-chok': 'ราชาโชค (⬡ สีน้ำเงิน) — โชคลาภ ได้มาง่าย มีคนอุปถัมภ์',
  'maha-chakr': 'มหาจักร (□ สีเหลือง) — ต้องเหนื่อยก่อนจึงสำเร็จอย่างยิ่งใหญ่',
  'pra':        'ประ (○ สีแดง) — อ่อนกำลัง อยู่ผิดที่ ต้องพึ่งพา',
  'nij':        'นิจ (✳ สีแดง) — ตกต่ำ เสื่อมถอย ไร้กำลังสนับสนุน',
};

const BAD_BHAVAS = new Set(['อริ', 'มรณะ', 'วินาศ']);

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildHoranuPrompt(
  chart: HoraTaynooResult,
  dateAsked: Date,
  question: string
): string {
  // 1. หาช่อง 7.5 นาทีที่คำถามตก
  // Use UTC+7 time strictly matching the engine's approach
  const utcMs = dateAsked.getTime() + (dateAsked.getTimezoneOffset() * 60000);
  const thaiDate = new Date(utcMs + (3600000 * 7));
  const h = thaiDate.getHours();
  const m = thaiDate.getMinutes();
  const s = thaiDate.getSeconds();
  
  // Create nowMin that accounts for the fact that night yams (after midnight) 
  // might map to a day-scale minute. The safest way is to check the subTimeSlots directly.
  let nowMin = h * 60 + m + s / 60;
  
  // Fix for after-midnight night periods in subTimeSlots.
  // In the engine, if it's past midnight (h < 6), the engine often treats the yam limits
  // between 0 and 360 minutes.
  const isAfterMidnight = h >= 0 && h < 6;
  
  // We need to map `nowMin` into the same scale the `chart.subTimeSlots` use.
  // The first slot's startMin tells us what scale the slots are on.
  if (chart.subTimeSlots.length > 0) {
    const firstStart = chart.subTimeSlots[0].startMin;
    if (isAfterMidnight && firstStart > 720) {
        // The slot is using a 24-hour continuous scale (1440 mins offset) but we are at h<6
        // Actually, night yams after midnight often map to 0-360 directly in the engine.
        // Let's just find the slot by string matching or by safely moduloing both.
    }
  }

  // A safer approach is to test `nowMin` directly, and if not found, test `nowMin + 1440` or `nowMin - 1440`
  let activeSlot = chart.subTimeSlots.find(slot => nowMin >= slot.startMin && nowMin < slot.endMin);
  
  if (!activeSlot) {
    const nextDayMin = nowMin + 1440;
    activeSlot = chart.subTimeSlots.find(slot => nextDayMin >= slot.startMin && nextDayMin < slot.endMin);
  }
  
  if (!activeSlot) {
    const prevDayMin = nowMin - 1440;
    activeSlot = chart.subTimeSlots.find(slot => prevDayMin >= slot.startMin && prevDayMin < slot.endMin);
  }

  // Fallback
  if (!activeSlot) activeSlot = chart.subTimeSlots[0];

  const bhavaInfo = BHAVA_KNOWLEDGE[activeSlot.bhavaName];
  const isBadBhava = BAD_BHAVAS.has(activeSlot.bhavaName);

  // 2. หาดาวในช่องนั้น
  const planetsInSlot: PlanetEntry[] = chart.planetEntries.filter(
    p => p.zodiacIndex === activeSlot.zodiacIndex && p.planetNum !== null
  );

  // 3. สร้างคำอธิบายดาวแต่ละดวง
  const planetsDesc = planetsInSlot.length === 0
    ? '(ไม่มีดาวลอยสถิตในช่องเวลานี้ — ตีความจากความหมายภพล้วนๆ)'
    : planetsInSlot.map(p => {
        const pInfo = PLANET_INFO[p.planetNum!];
        const pkInfo = PLANET_KNOWLEDGE[p.planetNum!];
        const statusStr = p.status ? (STATUS_LABEL[p.status] ?? p.status) : 'ปกติ (ไม่มีมาตรฐานพิเศษ)';
        const statuses = `มาตรฐาน: ${statusStr}`;
        return [
          `  • ดาว ${p.planetNum} (${pInfo?.thai ?? '?'})`,
          `    ${statuses}`,
          `    ความหมาย: ${pkInfo?.meaning ?? '—'}`,
        ].join('\n');
      }).join('\n');

  // 4. สรุปยามย่อยทั้ง 12 ช่องสำหรับ context
  const slotsCtx = chart.subTimeSlots.map((s, i) => {
    // Check if it's the active slot by reference rather than min values to be absolutely sure
    const mark = s.slotIndex === activeSlot.slotIndex ? ' ◄ (ตกนี่)' : '';
    return `  ${i + 1}. ${s.startStr}–${s.endStr} | ${s.zodiacName} | ภพ${s.bhavaName}${mark}`;
  }).join('\n');

  // 5. คำนวณสมการเส้นทางการพยากรณ์ X+Y+Z
  const getPointDesc = (zIdx: number) => {
    const bhava = chart.bhavaMap[zIdx] || '?';
    const lord = KASTERN_FIXED[zIdx];
    const planetsInSlot = chart.planetEntries.filter(p => p.zodiacIndex === zIdx && p.planetNum !== null);
    const planetsStr = planetsInSlot.length > 0 
      ? planetsInSlot.map(p => `${p.label}(${p.status ? STATUS_LABEL[p.status].split(' ')[0] : 'ปกติ'})`).join(', ')
      : 'ไม่มีดาวลอย';
    
    // หาว่า lord ไปอยู่ไหน
    const lordPosEntry = chart.planetEntries.find(p => p.planetNum === lord);
    const nextZIdx = lordPosEntry ? lordPosEntry.zodiacIndex : zIdx;
    
    return { zIdx, bhava, lord, nextZIdx, planetsStr };
  };

  const x = getPointDesc(activeSlot.zodiacIndex);
  const y = getPointDesc(x.nextZIdx);
  const z = getPointDesc(y.nextZIdx);

  const xyzEquation = `${x.bhava}(ดาว: ${x.planetsStr}) + ${y.bhava}(ดาว: ${y.planetsStr}) + ${z.bhava}(ดาว: ${z.planetsStr})`;

  return `คุณคือ "โหรพรายกระซิบ" ผู้เชี่ยวชาญระบบยามพรายกระซิบ (ยามอัฐกาล + ดาวลอย 11 + ภพ 12)
ตอบเป็นภาษาไทยเท่านั้น กระชับ ตรงประเด็น ไม่ต้องขอข้อมูลเพิ่มเติม ไม่ต้องแนะนำให้ไปดูโหรคนอื่น

════════════════════════════════════
ข้อมูลผังดวง ณ เวลาที่ถาม
════════════════════════════════════
วัน${DAY_NAMES_TH[chart.dayOfWeek]} | ยามที่ ${chart.yamAsked} (${chart.period === 'day' ? 'กลางวัน' : 'กลางคืน'})
ลัคนา: ราศี${ZODIAC_ORDER[chart.lagnaZodiacIndex]?.name ?? ''} | ดาวเจ้ายาม: ดาว ${chart.yamPlanet} (${PLANET_INFO[chart.yamPlanet]?.thai ?? ''})

════════════════════════════════════
ยามย่อย 7.5 นาที × 12 ช่อง
════════════════════════════════════
${slotsCtx}

════════════════════════════════════
จุดเวลาที่คำถามตก (สำคัญที่สุด)
════════════════════════════════════
เวลา: ${activeSlot.startStr} – ${activeSlot.endStr} น.
ราศี: ${activeSlot.zodiacName}
ภพ: "${activeSlot.bhavaName}" — ${bhavaInfo?.meaning ?? 'ไม่มีข้อมูล'}
ประเภทภพ: ${isBadBhava ? 'ภพเสีย (ทดสอบ / อุปสรรค / ความสูญเสีย)' : 'ภพดี (ส่งเสริมผลบวก)'}

ดาวลอยในช่องนี้:
${planetsDesc}

════════════════════════════════════
เส้นทางการพยากรณ์หลัก (สมการ X+Y+Z)
════════════════════════════════════
จงใช้สมการนี้เป็นแกนหลักในการทำนายทิศทางของเรื่องที่ถาม:
X (ภพเวลาถาม) → Y (ภพที่เจ้าเรือน X สถิต) → Z (ภพที่เจ้าเรือน Y สถิต)

สมการของคุณคือ: ${xyzEquation}

════════════════════════════════════
กฎการตีความ (ใช้ครบ)
════════════════════════════════════
1. ภพดี + ดาวดี (มหาอุจจ์/เกษตร/ราชาโชค) = สำเร็จง่าย โชคดีมาก
2. ภพดี + ดาวอ่อน (นิจ/ประ) = มีโอกาสแต่ต้องพยายาม อาจติดขัดระยะสั้น
3. ภพเสีย + ดาวเข้มแข็ง (มหาอุจจ์/เกษตร) = ปัญหา/ศัตรูมีกำลังมาก ต้องระวัง
4. ภพเสีย + ดาวอ่อน (นิจ/ประ) = ปัญหาอ่อนกำลัง เอาชนะได้
5. ดาวมีทั้งมหาจักร + ราชาโชคพร้อมกัน = "ต้นเหนื่อย-ปลายดี"
6. แหล่งที่มาตามเลขดาว: 1=ชื่อเสียง/อำนาจ 2=ผู้หญิง/บริการ 3=ต่อสู้/แข่งขัน 4=เจรจา/ค้าขาย 5=ผู้ใหญ่/โชค 6=ความรัก/ศิลปะ/เงิน 7=ความอดทน/ชักช้า 8=เสี่ยง/ต่างถิ่น/พลิกผัน
7. ในภพเสีย (อริ, มรณะ, วินาศ) ดาวแข็ง = ศัตรู/ปัญหาแข็ง | ดาวอ่อน = ศัตรู/ปัญหาอ่อน
8. ควรอ่านการเชื่อมโยงของภพแบบ X+Y+Z เสมอ เพื่อให้เห็นลำดับเหตุการณ์ ต้น-กลาง-ปลาย

════════════════════════════════════
คำถามของผู้ถาม
════════════════════════════════════
"${question}"

════════════════════════════════════
รูปแบบการตอบ (ทำตามนี้เท่านั้น)
════════════════════════════════════
ตอบ 3–5 ประโยค ประกอบด้วย:
(1) ภพที่คำถามตก + ความหมายสำหรับคำถามนี้โดยเฉพาะ
(2) วิเคราะห์การเชื่อมโยง X+Y+Z เพื่อเล่าแนวโน้ม (ดาวในช่อง + มาตรฐานดาว + ผลที่จะเกิดขึ้น)
(3) สรุปคำพยากรณ์ชัดเจน + คำแนะนำ 1 ประโยค`;
}

// ─── Action (POST only) ───────────────────────────────────────────────────────

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);

  let question: string;
  let isoTime: string | undefined;

  try {
    const body = await request.json<{ question: string; isoTime?: string }>();
    question = (body.question ?? "").trim();
    isoTime = body.isoTime;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (!question) {
    return new Response("Missing question", { status: 400 });
  }

  const dateAsked = isoTime ? new Date(isoTime) : new Date();
  const chart = calculateHoraTaynoo({ dateAsked });
  const prompt = buildHoranuPrompt(chart, dateAsked, question);

  const aiRes = await fetch(`${env.AI_WORKER_URL}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.AI_WORKER_SECRET}`,
    },
    body: JSON.stringify({
      userId: user.id,
      reportType: "horanu-chat",
      context: {},
      prompt,
    }),
  });

  if (!aiRes.ok || !aiRes.body) {
    return new Response("AI service error", { status: 502 });
  }

  return new Response(aiRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
