/**
 * api.horanu-chat.ts — โหรพรายกระซิบ Chat Resource Route
 * รับคำถาม + timestamp → วิเคราะห์ผังดวง 3 องค์ประกอบ → AI proxy → stream กลับ
 *
 * หลักการ: ภพ (เรือนชะตา) + ดาวลอย + มาตรฐานดาว = คำพยากรณ์
 */
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { canUseFeature } from "~/services/permissions.server";
import {
  calculateHoraTaynoo,
  PLANET_INFO,
  ZODIAC_ORDER,
  BHAVA_KNOWLEDGE,
  PLANET_KNOWLEDGE,
  KASTERN_FIXED,
  PLANET_KASTERN,
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

  // 3 ภพ helper
  function getPlanetThreeBhavas(planetNum: number, zodiacIndex: number, bhavaMap: Record<number, string>, status: string | null): string[] {
    const occBhava = bhavaMap[zodiacIndex] ?? "—";
    const ownedZodiacs = planetNum !== null ? (PLANET_KASTERN[planetNum] ?? []) : [];
    const ownedBhavas = ownedZodiacs.map(z => bhavaMap[z] ?? "—");
    if (ownedBhavas.length === 1) {
      return [ownedBhavas[0], ownedBhavas[0], occBhava];
    } else if (ownedBhavas.length === 2) {
      return [ownedBhavas[0], ownedBhavas[1], occBhava];
    }
    return [occBhava, occBhava, occBhava];
  }

  // 2. หาดาวในช่องนั้น
  const planetsInSlot: PlanetEntry[] = chart.planetEntries.filter(
    p => p.zodiacIndex === activeSlot.zodiacIndex && !p.isLagna
  );

  const planetsDesc = planetsInSlot.length === 0
    ? '(ไม่มีดาวลอยสถิตในช่องเวลานี้ — ตีความจากความหมายภพล้วนๆ)'
    : planetsInSlot.map(p => {
        const pInfo = p.planetNum !== null ? PLANET_INFO[p.planetNum] : null;
        const pkInfo = p.planetNum !== null ? PLANET_KNOWLEDGE[p.planetNum] : null;
        const statusStr = p.status ? (STATUS_LABEL[p.status] ?? p.status) : 'ปกติ (ไม่มีมาตรฐานพิเศษ)';
        const threeBhavas = getPlanetThreeBhavas(p.planetNum!, p.zodiacIndex, chart.bhavaMap, p.status);
        return [
          `  • ดาว ${p.labelThai} (${pInfo?.thai ?? 'ดาวประกอบ'})`,
          `    มาตรฐาน: ${statusStr}`,
          `    ความหมายดาว: ${pkInfo?.meaning ?? '—'}`,
          `    ดาว 3 ภพ (เจ้าเรือน+สถิต): ${threeBhavas.join(' - ')}`,
        ].join('\n');
      }).join('\n');

  // 3. คำนวณสมการเส้นทางการพยากรณ์ X+Y+Z
  const getPointDesc = (zIdx: number) => {
    const bhava = chart.bhavaMap[zIdx] || '?';
    const lord = KASTERN_FIXED[zIdx];
    const ps = chart.planetEntries.filter(p => p.zodiacIndex === zIdx && !p.isLagna);
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
2. หากใน ภพจุดเริ่มต้น (X) หรือภพตามสมการ (Y, Z) มีดาวลอยสถิตอยู่มากกว่า 1 ดวง (เช่น มีดาว ๓, ๔, ๕) คุณต้องดึงดาวลอยทุกๆ ดวงในภพนั้นๆ มาทำนายให้ครบถ้วน ห้ามละทิ้งดาวใดดาวหนึ่งเด็ดขาด
3. เชื่อมโยงเรื่องราวไปยัง Y และ Z ตามสมการ โดยพิจารณาถึงความหมายของดาว 3 ภพ (เจ้าเรือน+สถิต) ของดาวแต่ละดวง เพื่อแสดงให้เห็นจุดเริ่มต้น -> การดำเนินไป -> บทสรุป ของเหตุการณ์
4. ภพดี + ดาวดี = สำเร็จง่าย | ภพเสีย + ดาวดี = อุปสรรคเยอะแต่ดาวช่วย | ภพเสีย + ดาวอ่อน = ปัญหาเบาบาง
5. สรุปคำพยากรณ์ให้ชัดเจนว่า "ดี" หรือ "ควรระวัง" พร้อมคำแนะนำ 1 ข้อ

════════════════════════════════════
คำถามของผู้ใช้งาน: "${question}"
════════════════════════════════════

ตอบ 3–5 ประโยค ให้เข้าเรื่องคำทำนายทันทีตามสมการ X+Y+Z`;
}

// ─── Action (POST only) ───────────────────────────────────────────────────────

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  // Entitlement Gate: Hora Nu requires Premium or higher
  if (!canUseFeature(profile, "horanu")) {
    return new Response(
      JSON.stringify({ 
        error: "ฟีเจอร์ยามพรายกระซิบ (Hora Nu) สงวนสิทธิ์สำหรับสมาชิก Premium ขึ้นไป", 
        code: "PLAN_UPGRADE_REQUIRED" 
      }), 
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let question: string;
  let isoTime: string | undefined;

  try {
    const body = await request.json<{ question: string; isoTime?: string }>();
    question = (body.question ?? "").trim();
    isoTime = body.isoTime;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { 
      status: 400, 
      headers: { "Content-Type": "application/json" } 
    });
  }

  if (!question) {
    return new Response(JSON.stringify({ error: "Missing question" }), { 
      status: 400, 
      headers: { "Content-Type": "application/json" } 
    });
  }

  // 1. Server-Side AI Cost Guard (Pre-Flight: Auth → Entitlement → Quota → Rate Limit → Concurrency → Sands Reservation)
  const { createSupabaseClient } = await import("~/services/supabase.server");
  const { supabase } = createSupabaseClient(request, env);
  const { guardAiRequestPreflight, recordAiExecutionTelemetry } = await import("~/services/aiCostGuard.server");

  const guard = await guardAiRequestPreflight({
    userId: user.id,
    profile,
    featureType: "wisdom_ai",
    promptText: question,
    env,
    supabase,
  });

  if (!guard.allowed) {
    return new Response(
      JSON.stringify({
        error: guard.errorMessage,
        code: guard.errorCode,
      }),
      { status: guard.status, headers: { "Content-Type": "application/json" } }
    );
  }

  const dateAsked = isoTime ? new Date(isoTime) : new Date();
  const chart = calculateHoraTaynoo({ dateAsked });
  const prompt = buildHoranuPrompt(chart, dateAsked, question);

  try {
    const aiRes = await fetch(`${env.AI_WORKER_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.AI_WORKER_SECRET}`,
      },
      body: JSON.stringify({
        userId: user.id,
        reportType: "horanu_chat",
        context: {},
        prompt,
      }),
    });

    if (!aiRes.ok || !aiRes.body) {
      await recordAiExecutionTelemetry({
        userId: user.id,
        profile,
        reportType: "horanu_chat",
        promptText: prompt,
        env,
        isSuccess: false,
        error: new Error(`AI service response: ${aiRes.status}`),
        releaseSlot: guard.releaseSlot,
        refundSandsIfNeeded: guard.refundSandsIfNeeded,
      });
      return new Response(JSON.stringify({ error: "AI service error" }), { 
        status: 502, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const reader = aiRes.body.getReader();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    let accumulatedText = "";

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } catch (streamErr) {
        console.error("[api.horanu-chat] Stream pipe error:", streamErr);
      } finally {
        await writer.close();
        await recordAiExecutionTelemetry({
          userId: user.id,
          profile,
          reportType: "horanu_chat",
          promptText: prompt,
          outputText: accumulatedText,
          env,
          isSuccess: true,
          releaseSlot: guard.releaseSlot,
          refundSandsIfNeeded: guard.refundSandsIfNeeded,
        });

        supabase.from("wisdom_queries").insert({
          user_id: user.id,
          question,
          category: "ยามพรายกระซิบ",
        }).then(({ error: insertErr }) => {
          if (insertErr) console.error("[api.horanu-chat] Insert query error:", insertErr);
        });
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    console.error("Horanu Chat Error:", err);
    await recordAiExecutionTelemetry({
      userId: user.id,
      profile,
      reportType: "horanu_chat",
      env,
      isSuccess: false,
      error: err,
      releaseSlot: guard.releaseSlot,
      refundSandsIfNeeded: guard.refundSandsIfNeeded,
    });
    return new Response(JSON.stringify({ error: "ระบบพยากรณ์ขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}
