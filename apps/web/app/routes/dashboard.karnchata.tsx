import { json } from "@remix-run/cloudflare";
import { useActionData, useNavigation, useLoaderData, useSubmit } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile, requireMinPlan } from "~/services/auth.server";
import { calculateKarnchata, calculatePhopephum, gregorianToThaiLunarV3 } from "@phopephum/engine";
import { STAR_NAMES } from "@phopephum/types";
import type { Env } from "~/env.server";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { generateKarnchataReading, type PredCategory, type KarnchataReading } from "~/services/karnchata-prediction.server";

// ─── Client-safe inline copies (no server import) ─────────────────────────────
const CATEGORY_LABELS: Record<PredCategory, string> = {
  news:     "ข่าวสาร / เรื่องที่ได้ยิน",
  lost:     "ของหาย / สิ่งสูญหาย",
  health:   "ผู้ป่วย / สุขภาพ",
  travel:   "การเดินทาง",
  work:     "การงาน / การเจรจา",
  wealth:   "การเงิน / โชคลาภ",
  love:     "ความรัก / ความสัมพันธ์",
  obstacle: "อุปสรรค / ปัญหา",
  general:  "ทั่วไป / สอบถามชะตา",
};

function detectCategory(q: string): PredCategory {
  const s = q.toLowerCase();
  if (s.match(/ของหาย|สูญหาย|หายไป/)) return "lost";
  if (s.match(/เจ็บ|ป่วย|รักษา|หมอ|โรค|สุขภาพ/)) return "health";
  if (s.match(/เดินทาง|เดิน|ออกไป|ทาง|ทิศ/)) return "travel";
  if (s.match(/ข่าว|ได้ยิน|บอก|พูด|จริงไหม/)) return "news";
  if (s.match(/งาน|เจรจา|สัญญา|ธุรกิจ|สมัคร/)) return "work";
  if (s.match(/เงิน|ลงทุน|ทรัพย์|โชค|รวย|กำไร/)) return "wealth";
  if (s.match(/รัก|แฟน|คนรัก|สัมพันธ์|แต่งงาน/)) return "love";
  if (s.match(/ปัญหา|อุปสรรค|ขัดข้อง|ติดขัด/)) return "obstacle";
  return "general";
}

export const meta: MetaFunction = () => [
  { title: "ทำนายกาลชะตา V2.0 — PhopePhum" },
  { name: "description", content: "วิเคราะห์กาลชะตาชีวิตด้วยระบบยามอัฏฐกาล พร้อมคำแนะนำตัดสินใจอัตโนมัติ" },
];

// ─── Types ─────────────────────────────────────────────────────────────────────

interface QuestionRecord {
  id: string;
  timestamp: string;
  question: string;
  category: PredCategory;
  tabMode: "daily" | "hourly" | "minute";
  yamName: string;
  yamPhase: string;
  reading: KarnchataReading;
}

// ─── Loader ────────────────────────────────────────────────────────────────────

import { resolveActiveSubject } from "~/services/activeSubject.server";
import { ActiveSubjectBanner } from "~/components/subject/ActiveSubjectBanner";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { profile, user } = await requireMinPlan("basic", request, env);

  const {
    activeSubject,
    customers,
    personLimit,
    currentCustomerCount,
    hasReachedLimit,
  } = await resolveActiveSubject(request, env, user, profile);

  const now = new Date();
  const initialResult = calculateKarnchata(now);
  const thaiDateLabel = now.toLocaleDateString("th-TH", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  let lunarInfo: { moonPhaseText: string; isWaxing: boolean; lunarDay: number; thaiMonthName: string } | null = null;
  try {
    const lunar = gregorianToThaiLunarV3(now);
    lunarInfo = { moonPhaseText: lunar.moonPhaseText, isWaxing: lunar.isWaxing, lunarDay: lunar.lunarDay, thaiMonthName: lunar.thaiMonthName };
  } catch (e) { /* */ }
  return json({
    profile,
    initialResult,
    thaiDateLabel,
    lunarInfo,
    currentTime: now.toISOString(),
    activeSubject,
    customers,
    personLimit,
    currentCustomerCount,
    hasReachedLimit,
  });
}

// ─── Action ────────────────────────────────────────────────────────────────────

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAuth(request, env);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  let targetDate = new Date();
  const timeMode = formData.get("timeMode") as "live" | "custom";
  if (timeMode === "custom") {
    const tDay = Number(formData.get("customDay"));
    const tMonth = Number(formData.get("customMonth"));
    const tYear = Number(formData.get("customYear"));
    const timeStr = String(formData.get("customTime") || "12:00");
    const [th, tmin] = timeStr.split(":").map(Number);
    if (tDay && tMonth && tYear) {
      targetDate = new Date(Date.UTC(tYear - 543, tMonth - 1, tDay, th - 7, tmin, 0));
    }
  }

  const result = calculateKarnchata(targetDate);
  let lunarInfo: { moonPhaseText: string; isWaxing: boolean; lunarDay: number; thaiMonthName: string } | null = null;
  try {
    const lunar = gregorianToThaiLunarV3(targetDate);
    lunarInfo = { moonPhaseText: lunar.moonPhaseText, isWaxing: lunar.isWaxing, lunarDay: lunar.lunarDay, thaiMonthName: lunar.thaiMonthName };
  } catch (e) { /* */ }
  const thaiDateLabel = targetDate.toLocaleDateString("th-TH", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  if (intent === "predict") {
    const question = String(formData.get("question") || "");
    const categoryRaw = formData.get("category") as PredCategory | null;
    const category: PredCategory = categoryRaw ?? detectCategory(question);

    const bkkHour = (targetDate.getUTCHours() + 7) % 24;
    const isDaytime = bkkHour >= 6 && bkkHour < 18;
    const bkkMinOfDay = bkkHour * 60 + targetDate.getUTCMinutes();
    const minuteInYam = bkkMinOfDay % 90;
    const yamPhase = minuteInYam < 30 ? "ต้น" : minuteInYam < 60 ? "กลาง" : "ปลาย";

    const _SEQ = [6, 1, 2, 3, 4, 7, 5, 8] as const;
    const _BHOP = ["บริวาร","อายุ","เดช","ศรี","มูละ","อุตสาหะ","มนตรี","กาลกิณี"] as const;
    const yaiN = result.yamYaiNumber || 1;
    const dayStarN = result.dayStarNumber || 1;
    const si = _SEQ.indexOf(yaiN as typeof _SEQ[number]);
    const dayStarPos = _SEQ.indexOf(dayStarN as typeof _SEQ[number]);
    let taksaQuality = "อุตสาหะ";
    if (si !== -1 && dayStarPos !== -1) {
      const qualIdx = (si - dayStarPos + 8) % 8;
      taksaQuality = _BHOP[qualIdx] ?? "อุตสาหะ";
    }

    const reading = generateKarnchataReading({
      yamYaiNum: result.yamYaiNumber,
      yamPhase: yamPhase as "ต้น" | "กลาง" | "ปลาย",
      taksaQuality,
      isDaytime,
      category,
      question,
    });

    return json({ result, lunarInfo, timeMode, thaiDateLabel, intent: "predict", reading, question, category });
  }

  return json({ result, lunarInfo, timeMode, thaiDateLabel, intent: "refresh", reading: null, question: "", category: "general" as PredCategory });
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const CHALDEAN_SEQ = [7, 5, 3, 1, 6, 4, 2] as const;
const _SEQ = [6, 1, 2, 3, 4, 7, 5, 8] as const;
const _BHOP = ["บริวาร","อายุ","เดช","ศรี","มูละ","อุตสาหะ","มนตรี","กาลกิณี"] as const;

const CATEGORY_ICONS: Record<PredCategory, string> = {
  news: "📢", lost: "🔍", health: "💊", travel: "🧭",
  work: "💼", wealth: "💎", love: "💖", obstacle: "⚠️", general: "✨",
};

const QUICK_QUESTIONS: Record<PredCategory, string[]> = {
  news:     ["ข่าวที่ได้ยินเชื่อถือได้ไหม?", "เรื่องที่คนเล่าเป็นความจริงไหม?"],
  lost:     ["ของที่หายจะได้คืนไหม?", "ควรหาของในที่ไหน?"],
  health:   ["คนป่วยจะฟื้นตัวได้ไหม?", "ควรรีบพาไปหาหมอไหม?"],
  travel:   ["ออกเดินทางตอนนี้ปลอดภัยไหม?", "ควรไปทิศไหนดี?"],
  work:     ["การเจรจาธุรกิจวันนี้จะสำเร็จไหม?", "ควรเซ็นสัญญาตอนนี้ไหม?"],
  wealth:   ["จังหวะนี้เหมาะลงทุนไหม?", "เงินที่รอจะมาถึงไหม?"],
  love:     ["คนที่นึกถึงมีความรู้สึกอย่างไร?", "การสารภาพรักตอนนี้จะราบรื่นไหม?"],
  obstacle: ["ปัญหาที่เผชิญอยู่จะคลี่คลายไหม?", "ควรตัดสินใจเดินหน้าหรือรอก่อน?"],
  general:  ["ดวงชะตาในยามนี้เป็นอย่างไร?", "จังหวะนี้ควรทำอะไร?"],
};

// คำแนะนำตัดสินใจตาม Taksa × ดาว
const TAKSA_DECISION: Record<string, { icon: string; title: string; actions: string[]; avoid: string[] }> = {
  "เดช":     { icon: "⚡", title: "เวลาแห่งอำนาจและการตัดสินใจ", actions: ["ปิดดีล / เซ็นสัญญา", "เจรจาต่อรอง ยืนยันข้อตกลง", "ออกคำสั่ง / ตัดสินใจเด็ดขาด"], avoid: ["ผัดวันประกันพรุ่ง", "ยอมแพ้ต่ออุปสรรค"] },
  "ศรี":     { icon: "💰", title: "เวลาแห่งโชคลาภและทรัพย์สิน", actions: ["ลงทุน / ทำธุรกรรมการเงิน", "เปิดตัวสินค้า / โปรโมท", "รับของขวัญหรือโอนเงิน"], avoid: ["กู้หนี้ยืมสิน", "ซื้อขายของที่ไม่จำเป็น"] },
  "มูละ":    { icon: "🌱", title: "เวลาแห่งการวางรากฐาน", actions: ["เริ่มโครงการระยะยาว", "วางแผน / ออกแบบกลยุทธ์", "ลงทุนระยะยาว / ซื้ออสังหา"], avoid: ["หวังผลเร็ว", "ตัดสินใจโดยไม่มีแผน"] },
  "มนตรี":   { icon: "🤝", title: "เวลาแห่งพันธมิตรและเส้นสาย", actions: ["ติดต่อผู้ใหญ่ / หาพันธมิตร", "ประสานงาน / สร้าง Network", "ขอคำปรึกษาจากผู้เชี่ยวชาญ"], avoid: ["ตัดสินใจคนเดียว", "ทำงานโดดเดี่ยว"] },
  "บริวาร":  { icon: "👥", title: "เวลาแห่งทีมและกลุ่มคน", actions: ["ประชุมกลุ่ม / มอบหมายงาน", "รับฟังความคิดเห็นทีม", "จัดกิจกรรมสร้างทีม"], avoid: ["ทำคนเดียว", "ตัดสินใจโดยไม่ปรึกษาทีม"] },
  "อายุ":    { icon: "🧘", title: "เวลาแห่งสุขภาพและการพักฟื้น", actions: ["พักผ่อน / ดูแลสุขภาพ", "ออกกำลังกาย / นั่งสมาธิ", "ตรวจสุขภาพประจำปี"], avoid: ["ทำงานหนักเกินไป", "ละเลยการนอน"] },
  "อุตสาหะ": { icon: "💪", title: "เวลาแห่งความพยายามและทุ่มเท", actions: ["ทำงานที่ต้องใช้ความพยายาม", "ฝึกฝนทักษะใหม่", "แก้ปัญหาที่ยากด้วยความอดทน"], avoid: ["รอโชคลอย", "ท้อแท้เร็ว"] },
  "กาลกิณี": { icon: "⚠️", title: "ช่วงระวัง — หลีกเลี่ยงการตัดสินใจสำคัญ", actions: ["รอและสังเกตการณ์", "เตรียมตัวรับมือปัญหา", "ดูแลตัวเองให้ปลอดภัย"], avoid: ["เซ็นสัญญาสำคัญ", "ลงทุนก้อนใหญ่", "ตัดสินใจแบบรีบร้อน"] },
};

const YAM_DECISION: Record<number, { what: string; why: string; best: string }> = {
  1: { what: "เจรจากับผู้มีอำนาจ ออกคำสั่ง ตัดสินใจที่ต้องใช้อำนาจ", why: "ดาวอาทิตย์ให้อำนาจบารมี ผู้ใหญ่มีบทบาทสำคัญ ข่าวสารที่ได้ยินเชื่อถือได้", best: "ยามกลาง" },
  2: { what: "ดูแลครอบครัว สร้างความสัมพันธ์ งานสร้างสรรค์และความรู้สึก", why: "ดาวจันทร์เน้นอารมณ์และความสัมพันธ์ ข้อมูลยังไม่ชัด ต้องใช้ความรู้สึก", best: "ยามกลาง" },
  3: { what: "งานที่ต้องใช้พลังงานสูง กีฬา การออกกำลัง งานใช้แรง", why: "ดาวอังคารให้พลังงานและความกล้า แต่ระวังอารมณ์ร้อน ยามปลายให้ผลดีสุด", best: "ยามปลาย" },
  4: { what: "เซ็นสัญญา เจรจาต่อรอง นำเสนองาน สื่อสารสำคัญ", why: "ดาวพุธเสริมสติปัญญาและการสื่อสาร ข่าวสารที่ได้ยินเชื่อถือได้", best: "ยามกลาง" },
  5: { what: "ลงทุน ขยายกิจการ พบปะผู้ใหญ่ ขอพรสิ่งศักดิ์สิทธิ์", why: "ดาวพฤหัสให้โชคลาภและปัญญา ยามต้นให้ผลดีสุด ต้องรีบทำทันที", best: "ยามต้น" },
  6: { what: "ความรักและความสัมพันธ์ งานศิลปะ สร้างมิตรภาพ ความงาม", why: "ดาวศุกร์เสริมเสน่ห์และความรัก ยามปลายให้ผลดีสุด", best: "ยามปลาย" },
  7: { what: "งานระยะยาว วางรากฐาน งานที่ต้องอดทนและมั่นคง", why: "ดาวเสาร์ให้ความมั่นคงระยะยาว ข่าวสารเชื่อถือได้ ยามกลางให้ผลดีสุด", best: "ยามกลาง" },
};

// ─── Prediction Card ────────────────────────────────────────────────────────────

function PredictionCard({ reading, onClose }: { reading: KarnchataReading; onClose?: () => void }) {
  const isGood = reading.score >= 65;
  const isDanger = reading.dangerScore >= 65;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-slate-200/80 dark:border-[#C6A96B]/30 bg-white/95 dark:bg-gradient-to-br dark:from-[#0A1628] dark:to-[#020617] p-5 sm:p-6 relative overflow-hidden shadow-sm">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-[#C6A96B]/5 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <span className="text-[#8C6D2D] dark:text-[#C6A96B] text-[10px] tracking-widest uppercase font-bold block mb-1">
                {CATEGORY_ICONS[reading.category]} {reading.categoryLabel} · ผลพยากรณ์
              </span>
              <h3 className="text-lg sm:text-xl font-display font-black text-slate-900 dark:text-[#F8F6F1] leading-snug">
                {reading.verdict}
              </h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-center">
                <div className={`text-2xl font-display font-black ${isDanger ? "text-red-500 dark:text-red-400" : isGood ? "text-emerald-600 dark:text-[#C6A96B]" : "text-[#8C6D2D] dark:text-[#D9BC82]"}`}>{reading.score}</div>
                <div className="text-[10px] text-slate-500 dark:text-[#C6B79F] font-bold">มงคล</div>
              </div>
              {onClose && (
                <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:text-[#C6B79F] dark:hover:text-[#F8F6F1] transition-colors">✕</button>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <span className="bg-[#C6A96B]/15 border border-[#C6A96B]/30 text-[#8C6D2D] dark:text-[#C6A96B] text-[10px] font-bold px-2.5 py-1 rounded-full">ยาม{reading.yamYaiName}</span>
            <span className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#F8F6F1] text-[10px] font-bold px-2.5 py-1 rounded-full">ยาม{reading.yamPhase}</span>
            <span className={`border text-[10px] font-bold px-2.5 py-1 rounded-full ${
              reading.taksaQuality === "กาลกิณี" ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400" :
              reading.taksaQuality === "เดช" || reading.taksaQuality === "ศรี" ? "border-[#C6A96B]/30 bg-[#C6A96B]/10 text-[#8C6D2D] dark:text-[#C6A96B]" :
              "border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-[#C6B79F]"
            }`}>{TAKSA_DECISION[reading.taksaQuality]?.icon} ทักษา{reading.taksaQuality}</span>
          </div>

          {/* Detail */}
          <div className="bg-slate-50/80 dark:bg-[#020617]/60 border border-slate-200/80 dark:border-white/5 rounded-xl p-4 mb-3">
            <p className="text-sm text-slate-800 dark:text-[#D9CDB7] leading-relaxed">{reading.detail}</p>
          </div>

          {/* Advice + Warning */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-emerald-50/60 dark:bg-[#071427]/60 border border-emerald-200/80 dark:border-[#C6A96B]/15 rounded-xl p-3">
              <p className="text-[10px] text-emerald-700 dark:text-[#C6A96B] font-bold mb-1.5">✦ ควรทำ</p>
              <p className="text-xs text-slate-700 dark:text-[#D9CDB7] leading-relaxed">{reading.advice}</p>
            </div>
            {reading.warning ? (
              <div className="bg-rose-50/60 dark:bg-[#1A0A0A]/60 border border-rose-200/80 dark:border-red-500/20 rounded-xl p-3">
                <p className="text-[10px] text-rose-700 dark:text-red-400 font-bold mb-1.5">⚠️ ระวัง</p>
                <p className="text-xs text-slate-700 dark:text-[#D9CDB7] leading-relaxed">{reading.warning}</p>
              </div>
            ) : (
              <div className="bg-sky-50/60 dark:bg-[#071E3D]/60 border border-sky-200/80 dark:border-[#6D8FC7]/15 rounded-xl p-3">
                <p className="text-[10px] text-sky-700 dark:text-[#6D8FC7] font-bold mb-1.5">🕐 เวลามงคล</p>
                <p className="text-xs text-slate-700 dark:text-[#D9CDB7] leading-relaxed">{reading.auspiciousTime}</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Decision Guidance Card ────────────────────────────────────────────────────

function DecisionGuidance({
  yamNum,
  taksaQuality,
  yamPhase,
  yamName,
  label,
}: {
  yamNum: number;
  taksaQuality: string;
  yamPhase: string;
  yamName: string;
  label: string;
}) {
  const yamDec = YAM_DECISION[yamNum] ?? YAM_DECISION[1];
  const taksaDec = TAKSA_DECISION[taksaQuality];
  const isAuspicious = yamPhase === yamDec.best;
  const isDanger = taksaQuality === "กาลกิณี";

  return (
    <Card className={`p-5 sm:p-6 border ${isDanger ? "border-red-500/30 bg-rose-50/30 dark:bg-[#1A0A0A]/80" : "border-slate-200/80 dark:border-[#C6A96B]/20 bg-white/95 dark:bg-[#0A1628] shadow-sm"}`}>
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[#8C6D2D] dark:text-[#C6A96B] text-[10px] tracking-widest uppercase font-bold block mb-0.5">{label} — คำแนะนำตัดสินใจ</span>
          <h3 className="text-base font-display font-black text-slate-900 dark:text-[#F8F6F1]">
            ยาม{yamName} · ยาม{yamPhase}
            <span className={`ml-2 text-xs font-bold ${isAuspicious ? "text-[#8C6D2D] dark:text-[#C6A96B]" : "text-slate-500 dark:text-[#C6B79F]"}`}>
              {isAuspicious ? "✨ ช่วงดีที่สุด" : `ช่วงดีที่สุดคือ ${yamDec.best}`}
            </span>
          </h3>
        </div>
        {taksaDec && (
          <span className={`shrink-0 text-2xl`}>{taksaDec.icon}</span>
        )}
      </div>

      {/* Main guidance */}
      <div className={`rounded-xl p-4 mb-4 border ${isAuspicious && !isDanger ? "bg-amber-50/50 border-[#C6A96B]/30 dark:bg-[#C6A96B]/5 dark:border-[#C6A96B]/20" : isDanger ? "bg-red-500/10 border-red-500/30 dark:bg-red-500/5 dark:border-red-500/20" : "bg-slate-50/80 border-slate-200 dark:bg-white/3 dark:border-white/5"}`}>
        <p className="text-[10px] font-bold mb-2 text-slate-500 dark:text-[#C6B79F] uppercase tracking-wider">⏱ ตอนนี้เหมาะกับ</p>
        <p className="text-sm font-bold text-slate-900 dark:text-[#F8F6F1] mb-1">{taksaDec?.title ?? yamDec.what}</p>
        <p className="text-xs text-slate-600 dark:text-[#C6B79F] leading-relaxed">{yamDec.why}</p>
      </div>

      {/* Taksa actions */}
      {taksaDec && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-emerald-50/60 dark:bg-[#071427]/60 border border-emerald-200/80 dark:border-[#C6A96B]/10 rounded-xl p-3">
            <p className="text-[10px] text-emerald-700 dark:text-[#C6A96B] font-bold mb-2 uppercase tracking-wider">✦ ควรทำตอนนี้</p>
            <ul className="space-y-1">
              {taksaDec.actions.map((a, i) => (
                <li key={i} className="text-xs text-slate-700 dark:text-[#D9CDB7] flex items-start gap-1.5">
                  <span className="text-emerald-600 dark:text-[#C6A96B] shrink-0 mt-0.5">›</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={`rounded-xl p-3 border ${isDanger ? "bg-red-500/10 border-red-500/20 dark:bg-red-500/5 dark:border-red-500/15" : "bg-rose-50/60 border-rose-200/80 dark:bg-[#071E3D]/60 dark:border-[#6D8FC7]/10"}`}>
            <p className={`text-[10px] font-bold mb-2 uppercase tracking-wider ${isDanger ? "text-red-600 dark:text-red-400" : "text-rose-700 dark:text-[#6D8FC7]"}`}>⚠️ ควรหลีกเลี่ยง</p>
            <ul className="space-y-1">
              {taksaDec.avoid.map((a, i) => (
                <li key={i} className="text-xs text-slate-700 dark:text-[#D9CDB7] flex items-start gap-1.5">
                  <span className={`shrink-0 mt-0.5 ${isDanger ? "text-red-600 dark:text-red-400" : "text-rose-600 dark:text-[#6D8FC7]"}`}>✕</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Smart Question Box ────────────────────────────────────────────────────────

function QuestionBox({
  tabMode,
  onSubmit,
  isLoading,
  label,
  yamName,
  yamPhase,
}: {
  tabMode: "daily" | "hourly" | "minute";
  onSubmit: (q: string, cat: PredCategory, tab: "daily" | "hourly" | "minute") => void;
  isLoading: boolean;
  label: string;
  yamName: string;
  yamPhase: string;
}) {
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState<PredCategory>("general");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [question]);

  useEffect(() => {
    if (question.length > 5) {
      const detected = detectCategory(question);
      if (detected !== "general") setCategory(detected);
    }
  }, [question]);

  const cats = Object.entries(CATEGORY_LABELS) as [PredCategory, string][];

  return (
    <div className="bg-white/95 dark:bg-[#071427]/80 border border-slate-200/90 dark:border-[#C6A96B]/15 rounded-2xl p-4 sm:p-5 shadow-sm">
      {/* Label */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-[#C6A96B] animate-pulse shadow-[0_0_6px_rgba(198,169,107,0.6)]" />
        <span className="text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B]">ถามกาลชะตา — {label}</span>
        <span className="text-[10px] text-slate-500 dark:text-[#C6B79F] ml-auto">ยาม{yamName} · {yamPhase}</span>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1 mb-3">
        {cats.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setCategory(id)}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
              category === id
                ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] border-[#C6A96B] shadow-sm"
                : "bg-slate-100 dark:bg-[#020617] border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#C6B79F] hover:text-slate-900 dark:hover:text-[#F8F6F1] hover:bg-slate-200/70 dark:hover:bg-white/5"
            }`}>
            {CATEGORY_ICONS[id]} {label.split("/")[0].trim()}
          </button>
        ))}
      </div>

      {/* Quick questions */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {QUICK_QUESTIONS[category]?.map((q, i) => (
          <button key={i} type="button" onClick={() => setQuestion(q)}
            className="text-[10px] text-slate-700 dark:text-[#C6B79F] bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/8 hover:border-[#C6A96B] hover:text-[#8C6D2D] dark:hover:text-[#C6A96B] px-3 py-1.5 rounded-xl transition-all text-left">
            {q}
          </button>
        ))}
      </div>

      {/* Textarea + Send */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="พิมพ์คำถามของคุณ... เช่น ควรออกเดินทางตอนนี้ไหม?"
          className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 focus:border-[#C6A96B] focus:bg-white dark:focus:bg-[#020617] rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-[#F8F6F1] outline-none resize-none min-h-[52px] max-h-[200px] pr-24 placeholder-slate-400 dark:placeholder-[#C6B79F]/40 transition-all shadow-inner"
          rows={2}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (question.trim()) onSubmit(question.trim(), category, tabMode);
            }
          }}
        />
        <button
          type="button"
          disabled={!question.trim() || isLoading}
          onClick={() => { if (question.trim()) onSubmit(question.trim(), category, tabMode); }}
          className="absolute right-2 bottom-2 px-4 py-1.5 rounded-lg bg-[#C6A96B] text-[#020617] font-bold text-xs hover:bg-[#D9BC82] disabled:opacity-40 transition-all"
        >
          {isLoading ? "⏳" : "พยากรณ์ →"}
        </button>
      </div>
      <p className="text-[10px] text-slate-400 dark:text-[#C6B79F]/50 mt-1.5 px-1">Enter ส่งคำถาม · Shift+Enter ขึ้นบรรทัดใหม่</p>
    </div>
  );
}

// ─── History Strip ──────────────────────────────────────────────────────────────

function HistoryStrip({ history, onSelect, onClear }: {
  history: QuestionRecord[];
  onSelect: (r: QuestionRecord) => void;
  onClear: () => void;
}) {
  if (history.length === 0) return null;
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-slate-50 dark:bg-[#020617]/60 border border-slate-200 dark:border-white/5 rounded-xl p-3">
      <div className="flex items-center justify-between">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-[#C6B79F] hover:text-slate-900 dark:hover:text-[#F8F6F1]">
          <span>📜 ประวัติคำถาม ({history.length})</span>
          <span>{open ? "▲" : "▼"}</span>
        </button>
        <button onClick={onClear} className="text-[10px] text-slate-500 dark:text-[#C6B79F] hover:text-red-500 transition-colors">ล้าง</button>
      </div>
      {open && (
        <div className="mt-3 space-y-1.5 max-h-60 overflow-y-auto">
          {history.map(r => (
            <button key={r.id} onClick={() => onSelect(r)}
              className="w-full text-left p-2.5 rounded-xl bg-white dark:bg-[#071427]/60 border border-slate-200 dark:border-white/5 hover:border-[#C6A96B]/50 transition-all group shadow-sm">
              <div className="flex items-center gap-2">
                <span className="shrink-0">{CATEGORY_ICONS[r.category]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-[#F8F6F1] truncate group-hover:text-[#8C6D2D] dark:group-hover:text-[#C6A96B]">{r.question}</p>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500 dark:text-[#C6B79F]">{r.timestamp}</span>
                    <span className="text-[10px] text-[#8C6D2D] dark:text-[#C6A96B] font-bold">{r.yamName} · {r.yamPhase}</span>
                    <span className={`text-[10px] font-bold ml-auto ${r.reading.score >= 65 ? "text-emerald-600 dark:text-[#C6A96B]" : "text-[#4B6FAE]"}`}>{r.reading.score}%</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Yam Table Row ──────────────────────────────────────────────────────────────

function YamTableRow({
  timeStr,
  starNum,
  quality,
  isCurrentYam,
  isCurrent,
  label,
  expanded,
  onToggle,
}: {
  timeStr: string;
  starNum: number;
  quality: string;
  isCurrentYam: boolean;
  isCurrent?: boolean;
  label?: string | number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const adv = TAKSA_DECISION[quality];
  const yamDec = YAM_DECISION[starNum] ?? YAM_DECISION[1];
  const isDanger = quality === "กาลกิณี";
  const isGood = adv?.actions !== undefined && !isDanger;

  return (
    <div>
      <button onClick={onToggle}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs transition-all ${
          isCurrentYam || isCurrent
            ? "bg-amber-500/15 border-[#C6A96B] dark:bg-[#C6A96B]/10 dark:border-[#C6A96B]/40 shadow-sm font-bold"
            : isDanger
            ? "bg-rose-500/10 border-rose-300 dark:bg-[#4B6FAE]/5 dark:border-[#6D8FC7]/20"
            : "bg-white/90 border-slate-200/90 text-slate-800 shadow-sm hover:border-[#C6A96B]/50 hover:bg-white dark:bg-[#071427]/60 dark:border-white/5 dark:text-[#F8F6F1] dark:hover:border-[#C6A96B]/20"
        }`}>
        {label !== undefined && (
          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${isCurrentYam || isCurrent ? "bg-[#C6A96B] text-[#020617]" : "bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-[#C6B79F]"}`}>{label}</span>
        )}
        <span className="font-mono text-slate-500 dark:text-[#C6B79F] text-[11px] shrink-0 w-26">{timeStr}</span>
        <span className={`font-bold flex-1 text-left ${isCurrentYam || isCurrent ? "text-[#8C6D2D] dark:text-[#C6A96B]" : "text-slate-900 dark:text-[#F8F6F1]"}`}>
          {STAR_NAMES[starNum as keyof typeof STAR_NAMES]}
        </span>
        {adv && (
          <span className={`shrink-0 text-[10px] font-bold flex items-center gap-0.5 ${isDanger ? "text-rose-600 dark:text-[#6D8FC7]" : isGood ? "text-[#8C6D2D] dark:text-[#C6A96B]" : "text-slate-500 dark:text-[#C6B79F]"}`}>
            {adv.icon} {quality}
          </span>
        )}
        <span className="text-slate-400 dark:text-[#C6B79F]/40 shrink-0 ml-1">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-4 py-3 bg-slate-50/95 dark:bg-[#020617]/70 border-x border-b border-slate-200/90 dark:border-white/5 rounded-b-xl space-y-2">
          <p className="text-xs text-slate-700 dark:text-[#D9CDB7] leading-relaxed">{yamDec.why}</p>
          {adv && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-emerald-700 dark:text-[#C6A96B] font-bold mb-1">✦ ควรทำ</p>
                {adv.actions.slice(0, 2).map((a, i) => <p key={i} className="text-[10px] text-slate-700 dark:text-[#D9CDB7]">› {a}</p>)}
              </div>
              <div>
                <p className={`text-[10px] font-bold mb-1 ${isDanger ? "text-red-500 dark:text-red-400" : "text-rose-600 dark:text-[#6D8FC7]"}`}>✕ หลีกเลี่ยง</p>
                {adv.avoid.slice(0, 2).map((a, i) => <p key={i} className="text-[10px] text-slate-700 dark:text-[#D9CDB7]">✕ {a}</p>)}
              </div>
            </div>
          )}
          <p className="text-[10px] text-[#8C6D2D] dark:text-[#C6A96B] font-bold">⏱ ช่วงดีที่สุด: ยาม{yamDec.best}</p>
        </div>
      )}
    </div>
  );
}

// ─── DateTime Picker ────────────────────────────────────────────────────────────

function DateTimePicker({ timeMode, setTimeMode, onSubmit, isLoading }: {
  timeMode: "live" | "custom";
  setTimeMode: (m: "live" | "custom") => void;
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
}) {
  const now = new Date();
  const nowBKK = new Date(now.getTime() + 7 * 3600 * 1000);
  const [day, setDay]   = useState(nowBKK.getUTCDate());
  const [month, setMonth] = useState(nowBKK.getUTCMonth() + 1);
  const [year, setYear]   = useState(nowBKK.getUTCFullYear() + 543);
  const [timeStr, setTimeStr] = useState(`${String(nowBKK.getUTCHours()).padStart(2,"0")}:${String(nowBKK.getUTCMinutes()).padStart(2,"0")}`);
  const MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  const curYear = nowBKK.getUTCFullYear() + 543;

  const send = (fd: FormData) => onSubmit(fd);

  const apply = () => {
    const fd = new FormData();
    fd.append("intent", "refresh"); fd.append("timeMode", "custom");
    fd.append("customDay", String(day)); fd.append("customMonth", String(month));
    fd.append("customYear", String(year)); fd.append("customTime", timeStr);
    send(fd);
  };
  const reset = () => {
    const fd = new FormData(); fd.append("intent", "refresh"); fd.append("timeMode", "live");
    setTimeMode("live"); send(fd);
  };

  return (
    <div className="bg-[#0A1628] border border-white/5 rounded-2xl p-4">
      <div className="flex bg-[#020617] rounded-xl p-1 gap-1 mb-3">
        <button onClick={reset} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${timeMode === "live" ? "bg-[#C6A96B] text-[#020617]" : "text-[#C6B79F] hover:text-[#F8F6F1]"}`}>⏱ เรียลไทม์</button>
        <button onClick={() => setTimeMode("custom")} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${timeMode === "custom" ? "bg-[#1E1730] text-[#F8F6F1]" : "text-[#C6B79F] hover:text-[#F8F6F1]"}`}>📅 เลือกเวลา</button>
      </div>
      {timeMode === "custom" && (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] text-[#C6B79F] font-bold block mb-1">วัน</label>
              <select value={day} onChange={e => setDay(Number(e.target.value))} className="w-full bg-[#020617] border border-white/10 text-[#F8F6F1] text-xs rounded-lg px-2 py-2 outline-none">
                {Array.from({length:31},(_,i)=>i+1).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#C6B79F] font-bold block mb-1">เดือน</label>
              <select value={month} onChange={e => setMonth(Number(e.target.value))} className="w-full bg-[#020617] border border-white/10 text-[#F8F6F1] text-xs rounded-lg px-2 py-2 outline-none">
                {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#C6B79F] font-bold block mb-1">ปี พ.ศ.</label>
              <select value={year} onChange={e => setYear(Number(e.target.value))} className="w-full bg-[#020617] border border-white/10 text-[#F8F6F1] text-xs rounded-lg px-2 py-2 outline-none">
                {Array.from({length:10},(_,i)=>curYear-5+i).map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#C6B79F] font-bold block mb-1">เวลา</label>
              <input type="time" value={timeStr} onChange={e => setTimeStr(e.target.value)} className="w-full bg-[#020617] border border-white/10 text-[#F8F6F1] text-xs rounded-lg px-2 py-2 outline-none" />
            </div>
          </div>
          <button onClick={apply} disabled={isLoading} className="w-full bg-[#C6A96B] text-[#020617] font-bold text-xs py-2 rounded-xl hover:bg-[#D9BC82] disabled:opacity-40 transition-all">
            {isLoading ? "กำลังคำนวณ..." : "✦ คำนวณกาลชะตา"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function KarnchataPage() {
  const {
    initialResult,
    thaiDateLabel,
    lunarInfo: initialLunar,
    profile,
    activeSubject,
    customers,
    personLimit,
    hasReachedLimit,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle";

  const activeResult = actionData?.result ?? initialResult;
  const activeLunar  = actionData?.lunarInfo ?? initialLunar;
  const activeThaiDate = actionData?.thaiDateLabel ?? thaiDateLabel;

  const [timeMode, setTimeMode] = useState<"live" | "custom">("live");
  const [time, setTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"daily" | "hourly" | "minute">("hourly");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [history, setHistory] = useState<QuestionRecord[]>([]);
  const [currentReading, setCurrentReading] = useState<KarnchataReading | null>(null);
  const [readingFromTab, setReadingFromTab] = useState<"daily" | "hourly" | "minute">("hourly");

  // Load history
  useEffect(() => {
    try {
      const s = localStorage.getItem("karnchata_history_v2");
      if (s) setHistory(JSON.parse(s));
    } catch { /* */ }
  }, []);

  const saveHistory = useCallback((records: QuestionRecord[]) => {
    setHistory(records);
    try { localStorage.setItem("karnchata_history_v2", JSON.stringify(records.slice(0, 50))); } catch { /* */ }
  }, []);

  // Handle prediction result
  useEffect(() => {
    if (actionData?.intent === "predict" && actionData.reading) {
      const r = actionData.reading as KarnchataReading;
      setCurrentReading(r);
      setReadingFromTab(activeTab);
      const record: QuestionRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString("th-TH"),
        question: actionData.question ?? "",
        category: actionData.category as PredCategory,
        tabMode: activeTab,
        yamName: r.yamYaiName,
        yamPhase: r.yamPhase,
        reading: r,
      };
      saveHistory([record, ...history]);
    }
  }, [actionData]);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (timeMode !== "live") return;
    const t = setInterval(() => {
      const fd = new FormData();
      fd.append("intent", "refresh"); fd.append("timeMode", "live");
      submit(fd, { method: "post", replace: true });
    }, 60000);
    return () => clearInterval(t);
  }, [timeMode, submit]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  const bkkHour = (time.getUTCHours() + 7) % 24;
  const isDaytime = bkkHour >= 6 && bkkHour < 18;
  const bkkMinOfDay = bkkHour * 60 + time.getUTCMinutes();
  const minuteInYam = bkkMinOfDay % 90;
  const yamPhaseLabel = minuteInYam < 30 ? "ต้น" : minuteInYam < 60 ? "กลาง" : "ปลาย";
  const soySlot = Math.floor(minuteInYam / 3.75) % 8;
  const yamSeq = Math.floor(((bkkHour - 6 + 24) % 24) / 1.5) % 8;

  const yaiN = (activeResult.yamYaiNumber ?? 1) as number;
  const soyN = (activeResult.yamSoyNumber ?? 1) as number;
  const dayStarN = (activeResult.dayStarNumber ?? 1) as number;

  // Taksa of current yam
  const dayStarPos8 = _SEQ.indexOf(dayStarN as typeof _SEQ[number]);
  const yaiPos8 = _SEQ.indexOf(yaiN as typeof _SEQ[number]);
  const currentTaksa = dayStarPos8 !== -1 && yaiPos8 !== -1
    ? (_BHOP[(yaiPos8 - dayStarPos8 + 8) % 8] ?? "อุตสาหะ")
    : "อุตสาหะ";

  const soyPos8 = _SEQ.indexOf(soyN as typeof _SEQ[number]);
  const currentSoyTaksa = dayStarPos8 !== -1 && soyPos8 !== -1
    ? (_BHOP[(soyPos8 - dayStarPos8 + 8) % 8] ?? "อุตสาหะ")
    : "อุตสาหะ";

  // Day star taksa (for daily)
  const dayTaksa = "อุตสาหะ"; // day star always maps to itself = อุตสาหะ position

  // Build yam tables
  const dayYamTable = useMemo(() => {
    const chaldIdx = CHALDEAN_SEQ.indexOf(dayStarN as typeof CHALDEAN_SEQ[number]);
    return Array.from({ length: 16 }, (_, i) => {
      const cIdx = chaldIdx !== -1 ? (chaldIdx + i) % 7 : i % 7;
      const star = CHALDEAN_SEQ[cIdx];
      const isDay = i < 8;
      const slot = i % 8;
      const hf = (isDay ? 6 : 18) + slot * 1.5;
      const ef = hf + 1.5;
      const fmt = (h: number) => `${String(Math.floor(h) % 24).padStart(2, "0")}:${h % 1 ? "30" : "00"}`;
      const timeStr = `${fmt(hf)}–${fmt(ef)}`;
      const sp8 = _SEQ.indexOf(star as typeof _SEQ[number]);
      const qualIdx = dayStarPos8 !== -1 && sp8 !== -1 ? (sp8 - dayStarPos8 + 8) % 8 : -1;
      const quality = qualIdx !== -1 ? (_BHOP[qualIdx] ?? "") : "";
      const bkkH = (time.getUTCHours() + 7) % 24;
      const totalMin = bkkH * 60 + time.getUTCMinutes();
      const slotStartMin = (isDay ? 6 : 18) * 60 + slot * 90;
      const isCurrentYam = totalMin >= slotStartMin && totalMin < slotStartMin + 90;
      return { yamNum: slot + 1, isDay, star, timeStr, quality, isCurrentYam };
    });
  }, [activeResult, time]);

  const yamSoyTable = useMemo(() => {
    const chalIdx = CHALDEAN_SEQ.indexOf(yaiN as typeof CHALDEAN_SEQ[number]);
    const yamStartMin = (isDaytime ? 6 : 18) * 60 + yamSeq * 90;
    return Array.from({ length: 8 }, (_, i) => {
      const planet = chalIdx !== -1 ? CHALDEAN_SEQ[(chalIdx + i) % 7] : (1 as number);
      const slotStartMin = yamStartMin + Math.round(i * 3.75);
      const slotEndMin   = yamStartMin + Math.round((i + 1) * 3.75);
      const fmt = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      const timeStr = `${fmt(slotStartMin)}–${fmt(slotEndMin)}`;
      const pos8 = _SEQ.indexOf(planet as typeof _SEQ[number]);
      const qualIdx = dayStarPos8 !== -1 && pos8 !== -1 ? (pos8 - dayStarPos8 + 8) % 8 : -1;
      const quality = qualIdx !== -1 ? (_BHOP[qualIdx] ?? "") : "";
      return { slot: i + 1, planet, timeStr, quality, isCurrent: soySlot === i };
    });
  }, [yaiN, isDaytime, yamSeq, dayStarPos8, soySlot, time]);

  const handleAsk = useCallback((question: string, cat: PredCategory, tab: "daily" | "hourly" | "minute") => {
    setActiveTab(tab);
    setReadingFromTab(tab);
    const fd = new FormData();
    fd.append("intent", "predict");
    fd.append("timeMode", timeMode);
    fd.append("question", question);
    fd.append("category", cat);
    submit(fd, { method: "post" });
  }, [timeMode, submit]);

  const handleDateSubmit = useCallback((fd: FormData) => {
    submit(fd, { method: "post", replace: true });
  }, [submit]);

  const toggle = (key: string) => setSelectedKey(k => k === key ? null : key);

  return (
    <div className="space-y-5 animate-in fade-in duration-700 pb-20">

      {/* ── แถบสลับและจัดการเจ้าชะตาแบบเรียลไทม์ (Active Subject Banner) ── */}
      {activeSubject && (
        <ActiveSubjectBanner
          currentSubject={{
            id: activeSubject.id,
            name: activeSubject.name,
            birthDate: activeSubject.birthDate,
            birthTime: activeSubject.birthTime,
            birthPlace: activeSubject.birthPlace,
            isCustomer: activeSubject.isCustomer,
          }}
          customers={customers || []}
          profileName={profile?.display_name || "ฉัน (เจ้าของบัญชี)"}
          personLimit={personLimit}
          hasReachedLimit={hasReachedLimit}
        />
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="text-[#C6A96B] text-[10px] tracking-[0.25em] uppercase font-bold block mb-1">✦ คัมภีร์พยากรณ์กาลชะตา</span>
          <h1 className="text-3xl font-display font-bold text-[#F8F6F1] mb-1">ทำนายกาลชะตา V2.0</h1>
          <p className="text-[#D9CDB7] text-sm max-w-lg">วิเคราะห์ชะตาด้วยยามอัฏฐกาล รายวัน · รายชั่วโมง · รายนาที พร้อมคำแนะนำตัดสินใจ</p>
        </div>
        <div className="bg-[#C6A96B]/8 border border-[#C6A96B]/20 px-4 py-3 rounded-2xl shrink-0">
          <p className="text-[10px] text-[#C6A96B] uppercase font-bold">วันกาลชะตา</p>
          <p className="text-sm font-bold text-[#F8F6F1]">{activeThaiDate}</p>
          {activeLunar && <p className="text-[10px] text-[#C6B79F]">{activeLunar.moonPhaseText} เดือน{activeLunar.thaiMonthName}</p>}
        </div>
      </div>

      {/* ── Clock Strip ── */}
      <div className="flex items-center justify-between bg-[#0A1628]/80 border border-white/5 rounded-2xl px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#C6A96B] animate-pulse shadow-[0_0_8px_rgba(198,169,107,0.6)]" />
          <span className="text-2xl font-display font-black text-[#F8F6F1]">{formatTime(time)}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold flex-wrap justify-end">
          <span className={`px-2.5 py-1 rounded-full border ${isDaytime ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"}`}>
            {isDaytime ? "☀️ กลางวัน" : "🌙 กลางคืน"}
          </span>
          <span className="text-[#C6A96B] bg-[#C6A96B]/10 border border-[#C6A96B]/20 px-2.5 py-1 rounded-full">
            {activeResult.yamYaiName} · ยาม{yamPhaseLabel}
          </span>
        </div>
      </div>

      {/* ── DateTime Picker ── */}
      <DateTimePicker timeMode={timeMode} setTimeMode={setTimeMode} onSubmit={handleDateSubmit} isLoading={isLoading} />

      {/* ── Tab Selector ── */}
      <div className="flex bg-[#0A1628]/60 p-1.5 rounded-2xl border border-white/5 gap-1">
        {([["daily","📅","รายวัน"],["hourly","⏱","รายชั่วโมง"],["minute","🎯","รายนาที"]] as const).map(([id,icon,label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === id ? "bg-[#C6A96B] text-[#020617]" : "text-[#C6B79F] hover:text-[#F8F6F1]"}`}>
            <span>{icon}</span><span>{label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB: รายวัน
      ══════════════════════════════════════════════════════════ */}
      {activeTab === "daily" && (
        <div className="space-y-4">
          {/* Decision Guidance */}
          <DecisionGuidance
            yamNum={dayStarN}
            taksaQuality={dayTaksa}
            yamPhase={yamPhaseLabel}
            yamName={STAR_NAMES[dayStarN as keyof typeof STAR_NAMES] ?? ""}
            label="วันนี้ (รายวัน)"
          />

          {/* Question Box */}
          <QuestionBox
            tabMode="daily"
            onSubmit={handleAsk}
            isLoading={isLoading}
            label="ถามเรื่องวันนี้"
            yamName={STAR_NAMES[dayStarN as keyof typeof STAR_NAMES] ?? ""}
            yamPhase={yamPhaseLabel}
          />

          {/* Prediction result (if from this tab) */}
          {currentReading && readingFromTab === "daily" && (
            <PredictionCard reading={currentReading} onClose={() => setCurrentReading(null)} />
          )}

          {/* History */}
          <HistoryStrip
            history={history.filter(h => h.tabMode === "daily")}
            onSelect={r => { setCurrentReading(r.reading); setReadingFromTab("daily"); }}
            onClear={() => saveHistory(history.filter(h => h.tabMode !== "daily"))}
          />

          {/* 16-yam table */}
          <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-5">
            <h3 className="text-sm font-bold text-[#F8F6F1] mb-1">ตารางกาลชะตา 16 ยาม — กดดูคำแนะนำ</h3>
            <p className="text-[10px] text-[#C6B79F] mb-4">ยามไฮไลต์คือปัจจุบัน · กดแต่ละยามเพื่อดูสิ่งที่ควรทำ</p>
            <div className="space-y-4">
              {[{ label: "☀️ กลางวัน", isDay: true }, { label: "🌙 กลางคืน", isDay: false }].map(({ label: lbl, isDay }) => (
                <div key={lbl}>
                  <p className={`text-[10px] font-bold mb-2 ${isDay ? "text-amber-400/80" : "text-indigo-400/80"}`}>{lbl}</p>
                  <div className="space-y-1">
                    {dayYamTable.filter(y => y.isDay === isDay).map(y => {
                      const key = `d-${isDay ? "d" : "n"}-${y.yamNum}`;
                      return (
                        <YamTableRow
                          key={key}
                          timeStr={y.timeStr}
                          starNum={y.star}
                          quality={y.quality}
                          isCurrentYam={y.isCurrentYam}
                          label={y.yamNum}
                          expanded={selectedKey === key}
                          onToggle={() => toggle(key)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB: รายชั่วโมง
      ══════════════════════════════════════════════════════════ */}
      {activeTab === "hourly" && (
        <div className="space-y-4">
          {/* Decision Guidance */}
          <DecisionGuidance
            yamNum={yaiN}
            taksaQuality={currentTaksa}
            yamPhase={yamPhaseLabel}
            yamName={activeResult.yamYaiName}
            label="ชั่วโมงนี้ (ยามใหญ่)"
          />

          {/* Question Box */}
          <QuestionBox
            tabMode="hourly"
            onSubmit={handleAsk}
            isLoading={isLoading}
            label="ถามเรื่องชั่วโมงนี้"
            yamName={activeResult.yamYaiName}
            yamPhase={yamPhaseLabel}
          />

          {/* Prediction result */}
          {currentReading && readingFromTab === "hourly" && (
            <PredictionCard reading={currentReading} onClose={() => setCurrentReading(null)} />
          )}

          {/* History */}
          <HistoryStrip
            history={history.filter(h => h.tabMode === "hourly")}
            onSelect={r => { setCurrentReading(r.reading); setReadingFromTab("hourly"); }}
            onClear={() => saveHistory(history.filter(h => h.tabMode !== "hourly"))}
          />

          {/* Yam table */}
          <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-5">
            <h3 className="text-sm font-bold text-[#F8F6F1] mb-1">ตารางยาม{isDaytime ? "กลางวัน" : "กลางคืน"} 8 ยาม</h3>
            <p className="text-[10px] text-[#C6B79F] mb-4">กดแต่ละยามเพื่อดูคำแนะนำตัดสินใจ</p>
            <div className="space-y-1">
              {dayYamTable.filter(y => y.isDay === isDaytime).map(y => {
                const key = `h-${y.isDay ? "d" : "n"}-${y.yamNum}`;
                return (
                  <YamTableRow
                    key={key}
                    timeStr={y.timeStr}
                    starNum={y.star}
                    quality={y.quality}
                    isCurrentYam={y.isCurrentYam}
                    label={y.yamNum}
                    expanded={selectedKey === key}
                    onToggle={() => toggle(key)}
                  />
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB: รายนาที
      ══════════════════════════════════════════════════════════ */}
      {activeTab === "minute" && (
        <div className="space-y-4">
          {/* Decision Guidance */}
          <DecisionGuidance
            yamNum={soyN}
            taksaQuality={currentSoyTaksa}
            yamPhase={yamPhaseLabel}
            yamName={activeResult.yamSoyName}
            label="นาทีนี้ (ยามซอย)"
          />

          {/* Question Box */}
          <QuestionBox
            tabMode="minute"
            onSubmit={handleAsk}
            isLoading={isLoading}
            label="ถามเรื่องนาทีนี้"
            yamName={activeResult.yamSoyName}
            yamPhase={yamPhaseLabel}
          />

          {/* Prediction result */}
          {currentReading && readingFromTab === "minute" && (
            <PredictionCard reading={currentReading} onClose={() => setCurrentReading(null)} />
          )}

          {/* History */}
          <HistoryStrip
            history={history.filter(h => h.tabMode === "minute")}
            onSelect={r => { setCurrentReading(r.reading); setReadingFromTab("minute"); }}
            onClear={() => saveHistory(history.filter(h => h.tabMode !== "minute"))}
          />

          {/* Soy table */}
          <Card className="border-[#6D8FC7]/20 bg-[#0A1628] p-5">
            <h3 className="text-sm font-bold text-[#F8F6F1] mb-1">ตารางยามซอย 8 ช่วง — ยามใหญ่ {activeResult.yamYaiName}</h3>
            <p className="text-[10px] text-[#C6B79F] mb-4">แต่ละซอย 3 นาที 45 วินาที · กดเพื่อดูคำแนะนำ</p>
            <div className="space-y-1">
              {yamSoyTable.map(soy => {
                const key = `s-${soy.slot}`;
                return (
                  <YamTableRow
                    key={key}
                    timeStr={soy.timeStr}
                    starNum={soy.planet}
                    quality={soy.quality}
                    isCurrentYam={false}
                    isCurrent={soy.isCurrent}
                    label={soy.slot}
                    expanded={selectedKey === key}
                    onToggle={() => toggle(key)}
                  />
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
