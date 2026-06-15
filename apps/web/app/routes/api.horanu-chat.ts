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
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(dateAsked);
  let h = Number(parts.find(p => p.type === 'hour')?.value);
  const m = Number(parts.find(p => p.type === 'minute')?.value);
  const s = Number(parts.find(p => p.type === 'second')?.value);
  if (h === 24) h = 0;
  
  const nowMin = h * 60 + m + s / 60;

  // ค้นหาช่องเวลาที่ครอบคลุม nowMin
  let activeSlot = chart.subTimeSlots.find(slot => nowMin >= slot.startMin && nowMin < slot.endMin);
  if (!activeSlot) {
    const nextDayMin = nowMin + 1440;
    activeSlot = chart.subTimeSlots.find(slot => nextDayMin >= slot.startMin && nextDayMin < slot.endMin);
  }
  if (!activeSlot) {
    const prevDayMin = nowMin - 1440;
    activeSlot = chart.subTimeSlots.find(slot => prevDayMin >= slot.startMin && prevDayMin < slot.endMin);
  }
  if (!activeSlot) activeSlot = chart.subTimeSlots[0];

  const bhavaInfo = BHAVA_KNOWLEDGE[activeSlot.bhavaName];
  const isBadBhava = BAD_BHAVAS.has(activeSlot.bhavaName);

  // 2. หาดาวในช่องนั้น
  const planetsInSlot: PlanetEntry[] = chart.planetEntries.filter(
    p => p.zodiacIndex === activeSlot.zodiacIndex && p.planetNum !== null
  );

  const planetsDesc = planetsInSlot.length === 0
    ? '(ไม่มีดาวลอยสถิตในช่องเวลานี้ — ตีความจากความหมายภพล้วนๆ)'
    : planetsInSlot.map(p => {
        const pInfo = PLANET_INFO[p.planetNum!];
        const pkInfo = PLANET_KNOWLEDGE[p.planetNum!];
        const statusStr = p.status ? (STATUS_LABEL[p.status] ?? p.status) : 'ปกติ (ไม่มีมาตรฐานพิเศษ)';
        return [
          `  • ดาว ${p.planetNum} (${pInfo?.thai ?? '?'})`,
          `    มาตรฐาน: ${statusStr}`,
          `    ความหมายดาว: ${pkInfo?.meaning ?? '—'}`,
        ].join('\n');
      }).join('\n');

  // 3. คำนวณสมการเส้นทางการพยากรณ์ X+Y+Z
  const getPointDesc = (zIdx: number) => {
    const bhava = chart.bhavaMap[zIdx] || '?';
    const lord = KASTERN_FIXED[zIdx];
    const ps = chart.planetEntries.filter(p => p.zodiacIndex === zIdx && p.planetNum !== null);
    const planetsStr = ps.length > 0 
      ? ps.map(p => `${p.labelThai}(${p.status ? STATUS_LABEL[p.status].split(' ')[0] : 'ปกติ'})`).join(', ')
      : 'ไม่มีดาวลอย';
    
    const lordPosEntry = chart.planetEntries.find(p => p.planetNum === lord);
    const nextZIdx = lordPosEntry ? lordPosEntry.zodiacIndex : zIdx;
    
    return { bhava, lord, nextZIdx, planetsStr };
  };

  const x = getPointDesc(activeSlot.zodiacIndex);
  const y = getPointDesc(x.nextZIdx);
  const z = getPointDesc(y.nextZIdx);

  const xyzEquation = `${x.bhava}(ดาว: ${x.planetsStr}) + ${y.bhava}(ดาว: ${y.planetsStr}) + ${z.bhava}(ดาว: ${z.planetsStr})`;

  return `คุณคือ "โหรพรายกระซิบ" ผู้เชี่ยวชาญระบบยามพรายกระซิบ (ยามอัฐกาล + ดาวลอย 11 + ภพ 12)
ตอบเป็นภาษาไทยเท่านั้น กระชับ ตรงประเด็น ห้ามเกริ่นนาน

════════════════════════════════════
ข้อมูลผังดวง ณ เวลาที่ถาม (จุดพยากรณ์)
════════════════════════════════════
เวลาที่กดถาม: ${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')} น.
ยามถาม: ยามที่ ${chart.yamAsked} (${chart.period === 'day' ? 'กลางวัน' : 'กลางคืน'}) วัน${DAY_NAMES_TH[chart.dayOfWeek]}

จุดพยากรณ์ที่คำถามตก (X):
- ภพ: "${activeSlot.bhavaName}" — ${bhavaInfo?.meaning ?? 'ไม่มีข้อมูล'}
- ประเภทภพ: ${isBadBhava ? 'ภพเสีย (อริ/มรณะ/วินาศ)' : 'ภพดี'}
- ดาวลอยสถิตในจุดพยากรณ์นี้:
${planetsDesc}

════════════════════════════════════
สมการเส้นทางการพยากรณ์ (X+Y+Z)
════════════════════════════════════
จงใช้สมการนี้เป็นแกนหลักในการทำนาย "จุดเริ่มต้น -> การดำเนินไป -> บทสรุป":
${xyzEquation}

════════════════════════════════════
กฎการตีความ (ห้ามละเลย)
════════════════════════════════════
1. เริ่มพยากรณ์จาก ภพที่คำถามตก (X) ทันที
2. เชื่อมโยงเรื่องราวไปยัง Y และ Z ตามสมการ เพื่อให้เห็นลำดับเหตุการณ์
3. ภพดี + ดาวดี = สำเร็จง่าย | ภพเสีย + ดาวดี = อุปสรรคเยอะแต่ดาวช่วย | ภพเสีย + ดาวอ่อน = ปัญหาเบาบาง
4. สรุปคำพยากรณ์ให้ชัดเจนว่า "ดี" หรือ "ควรระวัง" พร้อมคำแนะนำ 1 ข้อ

════════════════════════════════════
คำถามของผู้ใช้งาน: "${question}"
════════════════════════════════════

ตอบ 3–5 ประโยค ให้เข้าเรื่องคำทำนายทันทีตามสมการ X+Y+Z`;
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
