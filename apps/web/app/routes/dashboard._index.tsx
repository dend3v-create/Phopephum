import { json } from "@remix-run/cloudflare";
import { useLoaderData, Link, useRevalidator } from "@remix-run/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import {
  getCurrentYam,
  calculateMoonPhase,
  calculatePhopephum,
  getAstrologicalDateStr,
  getAstrologicalThaiFormattedDate,
} from "@phopephum/engine";
import { checkAndAwardDailyLogin } from "~/services/rewards.server";
import { generateDailyAdvice } from "~/services/dailyAdvisor.server";
import { calculateDayIntelligence } from "~/services/calendarIntelligence.server";
import { generatePersonalWisdomIntelligence } from "~/services/wisdomIntelligence.server";
import { createSupabaseClient } from "~/services/supabase.server";
import type { Env } from "~/env.server";
import type {
  CalendarDayIntelligence,
  PersonalWisdomIntelligence,
} from "@phopephum/types";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18next from "~/lib/i18n/i18n.server";
import { AstralIcon } from "~/components/ui/AstralIcon";
import { ActiveSubjectBanner } from "~/components/subject/ActiveSubjectBanner";
import { resolveActiveSubject } from "~/services/activeSubject.server";


export const meta: MetaFunction = () => [
  { title: "วันนี้ — PhopePhum" },
  {
    name: "description",
    content: "สรุปจังหวะพลังงานประจำวัน ช่วงเวลาทอง และปัญญาชีวิตเฉพาะตนที่ PhopePhum",
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface TodayAppointment {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  event_time: string;
  score: number;
  verdict: string;
  advice: string;
}

// ─── Helper: derive Do / Avoid lists from dailyAdvice ────────────────────────
function getDoAvoidLists(
  dailyAdvice: ReturnType<typeof generateDailyAdvice> | null,
  locale = "th"
) {
  if (!dailyAdvice) {
    return {
      doList: ["ทำสิ่งสร้างสรรค์", "ดูแลสุขภาพ", "วางแผนอนาคต"],
      avoidList: ["ตัดสินใจใหญ่โดยใจร้อน"],
    };
  }

  const DO_LABELS: Record<string, Record<string, string>> = {
    th: {
      work_excellent: "เจรจาธุรกิจ / เสนองานสำคัญ",
      work_good: "ลงมือทำงานตามแผนที่วางไว้",
      wealth_excellent: "ลงทุน / จัดการการเงินและสภาพคล่อง",
      wealth_good: "วางแผนงบประมาณและรายจ่าย",
      love_excellent: "นัดหมายพิเศษ / สื่อสารสร้างความประทับใจ",
      love_good: "สื่อสารความรู้สึกอย่างตรงไปตรงมา",
      health_good: "ออกกำลังกายเบาๆ / พักผ่อนเติมพลัง",
    },
    en: {
      work_excellent: "Business negotiation / Key proposals",
      work_good: "Execute planned tasks",
      wealth_excellent: "Invest / Manage financial flow",
      wealth_good: "Budget and expense planning",
      love_excellent: "Special meetings / Meaningful connections",
      love_good: "Open and honest communication",
      health_good: "Light exercise / Rest and recharge",
    },
    zh: {
      work_excellent: "商务谈判 / 重要提案",
      work_good: "按计划执行任务",
      wealth_excellent: "投资 / 理财与现金流管理",
      wealth_good: "预算与支出规划",
      love_excellent: "特别约会 / 建立良好沟通",
      love_good: "坦诚交流表达想法",
      health_good: "轻度运动 / 休息恢复活力",
    },
  };

  const AVOID_LABELS: Record<string, Record<string, string>> = {
    th: {
      work_warning: "ตัดสินใจเปลี่ยนแผนกะทันหัน",
      wealth_warning: "ลงทุนเสี่ยงสูง / เซ็นเอกสารผูกพันการเงิน",
      love_warning: "หยิบยกเรื่องขัดแย้งเดิมมาโต้เถียง",
      health_warning: "ทำงานหักโหมติดต่อกันเกินกำลัง",
    },
    en: {
      work_warning: "Sudden plan changes or hasty pivots",
      wealth_warning: "High-risk spending / Binding contracts",
      love_warning: "Rehashing past conflicts",
      health_warning: "Overworking without adequate rest",
    },
    zh: {
      work_warning: "仓促改变既定计划",
      wealth_warning: "高风险投资 / 签署重大财务合约",
      love_warning: "翻旧账或引发争执",
      health_warning: "过度劳累缺少休息",
    },
  };

  const lang = locale === "zh" ? "zh" : locale === "en" ? "en" : "th";
  const labs = DO_LABELS[lang];
  const aLabs = AVOID_LABELS[lang];

  const doList: string[] = [];
  const avoidList: string[] = [];

  if (dailyAdvice.work.status === "excellent") doList.push(labs.work_excellent);
  else if (dailyAdvice.work.status === "good") doList.push(labs.work_good);
  else avoidList.push(aLabs.work_warning);

  if (dailyAdvice.wealth.status === "excellent") doList.push(labs.wealth_excellent);
  else if (dailyAdvice.wealth.status === "good") doList.push(labs.wealth_good);
  else avoidList.push(aLabs.wealth_warning);

  if (dailyAdvice.love.status === "excellent") doList.push(labs.love_excellent);
  else if (dailyAdvice.love.status === "good") doList.push(labs.love_good);
  else avoidList.push(aLabs.love_warning);

  if (dailyAdvice.health.status === "warning") avoidList.push(aLabs.health_warning);
  else doList.push(labs.health_good);

  return { doList, avoidList };
}

// ─── Loader ───────────────────────────────────────────────────────────────────
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const { supabase } = createSupabaseClient(request, env);

  const loginReward = await checkAndAwardDailyLogin(user.id, env).catch(() => ({
    success: false,
    earned: 0,
    message: "",
    newBalance: 0,
  }));

  const profile = await getProfile(user.id, request, env);
  const now = new Date();
  const locale = await i18next.getLocale(request);
  const currentLocale = locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "th-TH";

  // ── ดึงข้อมูลเจ้าชะตาที่กำลัง Active (ดวงตนเอง หรือ ลูกดวงที่เลือกไว้) ──
  const {
    activeSubject,
    customers,
    personLimit,
    currentCustomerCount,
    hasReachedLimit,
  } = await resolveActiveSubject(request, env, user, profile);

  // คำนวณวันที่ตามโหราศาสตร์ไทย (ระบบยามอัฐกาล ตัดวันใหม่ที่ 06:01 น.)
  const bkkDateStr = getAstrologicalDateStr(now);
  const thaiDateLabel = getAstrologicalThaiFormattedDate(now, currentLocale);

  // ── 1. Live Yam & Moon ──
  const yam = getCurrentYam();
  const moon = calculateMoonPhase();

  // ── 2. Active Subject Context (ผูกกับเจ้าชะตาที่กำลังเปิดอยู่) ──
  const subjectContext = activeSubject.birthDate
    ? {
        birthDate: activeSubject.birthDate,
        birthTime: activeSubject.birthTime,
        birthPlace: activeSubject.birthPlace,
        displayName: activeSubject.name,
      }
    : null;

  // ── 3. STEP 5.1 Calendar Intelligence (Daily Theme, Golden Window, 4 Domains) ──
  const dayIntelligence: CalendarDayIntelligence =
    await calculateDayIntelligence(bkkDateStr, subjectContext);

  // ── 4. STEP 4.5 Personal Wisdom Intelligence ──
  let wisdomIntelligence: PersonalWisdomIntelligence | null = null;
  try {
    wisdomIntelligence = await generatePersonalWisdomIntelligence({
      userId: user.id,
      supabase,
      userName: activeSubject.name || profile?.display_name || undefined,
    });
  } catch (err) {
    console.warn("Wisdom Intelligence loader error:", err);
  }

  // ── 5. Today's Appointments ──
  const { data: todayAppointmentsData } = await supabase
    .from("appointments")
    .select("*")
    .eq("user_id", user.id)
    .eq("event_date", bkkDateStr)
    .order("event_time", { ascending: true });

  const todayAppointments: TodayAppointment[] = (todayAppointmentsData || []).map(
    (a: any) => ({
      id: a.id,
      title: a.title,
      event_type: a.event_type,
      event_date: a.event_date,
      event_time: a.event_time,
      score: a.score,
      verdict: a.verdict,
      advice: a.advice,
    })
  );

  // ── 6. Daily Advice (Phopephum Taksa detail — คำนวณตามเจ้าชะตาที่กำลัง Active) ──
  let dailyAdvice = null;
  if (activeSubject.birthDate) {
    try {
      const phResult = await calculatePhopephum(
        {
          birthDate: activeSubject.birthDate,
          birthTime: activeSubject.birthTime || "12:00",
          birthPlace: activeSubject.birthPlace || "กรุงเทพมหานคร",
        },
        now
      );
      dailyAdvice = generateDailyAdvice(phResult, locale);
    } catch (err) {
      console.error("Daily advice error:", err);
    }
  }

  const { doList, avoidList } = getDoAvoidLists(dailyAdvice, locale);

  // ── 7. Yam countdown ISO ──
  const sunTimes = yam.sunTimes;
  const isDayPeriod = yam.period === "day";
  const slotStart = isDayPeriod ? sunTimes.sunrise : sunTimes.sunset;
  const slotTotal = isDayPeriod
    ? sunTimes.sunset.getTime() - sunTimes.sunrise.getTime()
    : 86_400_000 - (sunTimes.sunset.getTime() - sunTimes.sunrise.getTime());
  const slotMs = slotTotal / 8;
  const yamEndTime = new Date(slotStart.getTime() + yam.yamNumber * slotMs);
  const yamEndTimeISO = yamEndTime.toISOString();

  // ── 8. Admin Pending Count ──
  let pendingCount = 0;
  if (profile?.role === "admin" || profile?.role === "operator") {
    const { count } = await supabase
      .from("subscription_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  return json({
    user,
    profile,
    loginReward,
    pendingCount,
    now: now.toISOString(),
    bkkDateStr,
    thaiDateLabel,
    yamEndTimeISO,
    yam: {
      name: yam.yamName,
      period: yam.period,
      level: yam.travelAuspiciousness.level,
      label: yam.travelAuspiciousness.label,
      ticks: yam.travelAuspiciousness.ticks,
      shouldDo: yam.prediction?.shouldDo ?? "",
    },
    moon: {
      phase: moon.moonPhase,
      illumination: moon.illumination,
      isWanPhra: moon.isWanPhra,
    },
    dayIntelligence,
    wisdomIntelligence,
    todayAppointments,
    dailyAdvice,
    doList,
    avoidList,
    activeSubject,
    customers,
    personLimit,
    currentCustomerCount,
    hasReachedLimit,
  });
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80
      ? "#10B981"
      : score >= 65
      ? "#C6A96B"
      : score >= 50
      ? "#F59E0B"
      : "#EF4444";

  const label =
    score >= 80
      ? "ส่งเสริมดีเยี่ยม"
      : score >= 65
      ? "ราบรื่นคล่องตัว"
      : score >= 50
      ? "ปานกลาง"
      : "ควรเน้นรอบคอบ";

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className="relative w-28 h-28 sm:w-32 sm:h-32">
        <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            className="score-track"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="10"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-black text-3xl leading-none text-[#F8F6F1]">
            {score}
          </span>
          <span className="text-[10px] text-[#C6B79F] tracking-wider mt-0.5">
            /100
          </span>
        </div>
      </div>
      <span
        className="text-xs sm:text-sm font-bold tracking-wide"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}

function LoginRewardToast({
  reward,
  onClose,
}: {
  reward: { earned: number; message: string; newBalance: number };
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-16 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none md:top-4">
      <div
        className="flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl pointer-events-auto animate-fade-up card-glass-premium"
        style={{ borderColor: "rgba(198,169,107,0.4)" }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#C6A96B]/15 border border-[#C6A96B]/30 shrink-0">
          <AstralIcon name="sandglass" size="md" variant="gold" glow />
        </div>
        <div>
          <p className="text-sm font-bold text-[#C6A96B]">
            +{reward.earned} ทรายกาลเวลา
          </p>
          <p className="text-xs text-[#94A3B8]">
            {reward.message} · คงเหลือ {reward.newBalance}
          </p>
        </div>
        <button
          onClick={onClose}
          className="ml-2 text-[#64748B] hover:text-white text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function TodayScreen() {
  const d = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();
  const { t, i18n } = useTranslation("common");

  const {
    profile,
    activeSubject,
    customers,
    personLimit,
    hasReachedLimit,
    loginReward,
    pendingCount,
    bkkDateStr,
    thaiDateLabel: initialDateLabel,
    yam,
    moon,
    yamEndTimeISO,
    dayIntelligence,
    wisdomIntelligence,
    todayAppointments,
    doList,
    avoidList,
  } = d;

  const currentSubjectName = activeSubject?.name || profile?.display_name || t("auth.user", "คุณ");
  const locale = i18n.language;

  // ── Live date label ──
  const [dateLabel, setDateLabel] = useState(initialDateLabel || "");
  const [greeting, setGreeting] = useState("");
  const [showReward, setShowReward] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");


  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    setGreeting(
      h < 6 || (h === 6 && m < 1)
        ? "ราตรีสวัสดิ์"
        : h < 12
        ? "อรุณสวัสดิ์"
        : h < 17
        ? "สวัสดีตอนบ่าย"
        : "สวัสดีตอนเย็น"
    );

    const thaiLocale =
      locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "th-TH";
    setDateLabel(getAstrologicalThaiFormattedDate(now, thaiLocale));

    if (loginReward?.success && loginReward.earned > 0) {
      setShowReward(true);
    }
  }, [loginReward, locale]);

  // Countdown to end of current Yam (fixed calculation format)
  useEffect(() => {
    if (!yamEndTimeISO) return;
    const update = () => {
      const diff = new Date(yamEndTimeISO).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("");
        return;
      }
      const totalSec = Math.floor(diff / 1000);
      const hours = Math.floor(totalSec / 3600);
      const min = Math.floor((totalSec % 3600) / 60);
      const sec = totalSec % 60;
      if (hours > 0) {
        setTimeLeft(`${hours} ชม. ${min} น.`);
      } else {
        setTimeLeft(`${min}:${String(sec).padStart(2, "0")} น.`);
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [yamEndTimeISO]);

  // Periodic revalidation every 60s
  useEffect(() => {
    const id = setInterval(revalidate, 60_000);
    return () => clearInterval(id);
  }, [revalidate]);

  const yamLevelColor =
    yam.level === "excellent"
      ? "#10B981"
      : yam.level === "very_good"
      ? "#60A5FA"
      : yam.level === "good"
      ? "#C6A96B"
      : "#F87171";

  const goldenWindow = dayIntelligence.goldenWindow;

  return (
    <div
      className="max-w-2xl mx-auto space-y-5 pt-1 px-3 sm:px-4"
      style={{ paddingBottom: "calc(84px + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* ── Login Reward Toast ── */}
      {showReward && loginReward && loginReward.earned > 0 && (
        <LoginRewardToast
          reward={loginReward}
          onClose={() => setShowReward(false)}
        />
      )}

      {/* ── Admin Pending Badge ── */}
      {pendingCount > 0 && (
        <Link
          to="/admin/approvals"
          className="flex items-center justify-between px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-bold hover:bg-amber-500/15 transition-colors"
        >
          <span>⚡ มี {pendingCount} คำขออนุมัติรอดำเนินการ</span>
          <span className="text-xs">→</span>
        </Link>
      )}

      {/* ── HEADER ── */}
      <div className="pt-1 animate-fade-up">
        <div className="flex items-center justify-between">
          <p
            className="text-[11px] font-black uppercase tracking-[0.25em] text-[#8C6D2D] dark:text-[#C6A96B] min-h-[14px]"
            suppressHydrationWarning
          >
            {greeting}
          </p>
          <span className="text-[11px] font-semibold text-slate-700 dark:text-[#C6B79F] px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-[#C6A96B]/30 bg-slate-100 dark:bg-[#C6A96B]/10">
            {dayIntelligence.lunarDayInfo.lunarDateStr}
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#F8F6F1] leading-tight mt-1">
          วันนี้ของ <span className="text-[#8C6D2D] dark:text-[#C6A96B]">{currentSubjectName}</span>
        </h1>
        <p
          className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 tracking-wide min-h-[16px]"
          suppressHydrationWarning
        >
          {dateLabel}
        </p>
      </div>

      {/* ── 🎯 PILLAR 1: สิ่งที่ควรใส่พลังงานทุ่มเทในวันนี้ (POWER FOCUS & GOLDEN WINDOW) ── */}
      <div className="rounded-3xl p-5 sm:p-6 border border-[#C6A96B]/30 dark:border-[#C6A96B]/40 overflow-hidden relative animate-fade-up bg-white/95 dark:bg-gradient-to-br dark:from-[#0a2240] dark:via-[#0d1f38] dark:to-[#020617] backdrop-blur-xl shadow-xl space-y-4">
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-30"
          style={{
            background: "radial-gradient(circle, #C6A96B50 0%, transparent 70%)",
          }}
        />

        {/* Top Header: Score & Theme */}
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#8C6D2D] dark:text-[#C6A96B]">
              <span>✦</span> จุดโฟกัสพลังงานประจำวัน (POWER FOCUS)
            </span>
            <h2 className="font-display text-lg sm:text-xl font-black text-slate-900 dark:text-[#F8F6F1] leading-snug">
              {dayIntelligence.dailyTheme}
            </h2>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center px-3 py-1.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-[#C6A96B]/20">
            <span className="text-xs text-slate-600 dark:text-[#94A3B8] font-bold">ความราบรื่น:</span>
            <span className="font-display text-base font-black text-amber-700 dark:text-[#F2D49B]">
              {dayIntelligence.overallScore}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-[#94A3B8]">/100</span>
          </div>
        </div>

        {/* Focus Highlight Card: เรื่องที่ควรทุ่มเทพลังงาน */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#C6A96B]/10 to-transparent border border-amber-500/25 dark:border-[#C6A96B]/30 space-y-3 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <span className="text-xs font-black text-slate-900 dark:text-[#F8F6F1]">
                {goldenWindow
                  ? `ช่วงเวลาทองคำ: ${goldenWindow.startTime} – ${goldenWindow.endTime} น.`
                  : "จังหวะเวลาขับเคลื่อนผลงานที่ดีที่สุด"}
              </span>
            </div>
            {goldenWindow && (
              <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-400/20 border border-amber-400/30 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                ฤกษ์สำเร็จ {goldenWindow.score}%
              </span>
            )}
          </div>

          {/* Suitable tags */}
          {goldenWindow && goldenWindow.suitableFor.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {goldenWindow.suitableFor.map((item, idx) => (
                <span
                  key={idx}
                  className="text-[11px] px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-800 dark:text-[#F8F6F1] border border-black/10 dark:border-white/10 font-bold"
                >
                  ✓ {item}
                </span>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-700 dark:text-[#CBD5E1] leading-relaxed font-medium">
            {goldenWindow?.plainAdvice || dayIntelligence.personalNote || dayIntelligence.dailySummary}
          </p>

          {goldenWindow && (
            <div className="pt-1 flex items-center justify-end">
              <Link
                to={`/dashboard/calendar?date=${bkkDateStr}&time=${goldenWindow.startTime}&eventType=negotiation`}
                className="text-xs font-bold text-amber-800 dark:text-[#F2D49B] hover:underline flex items-center gap-1 transition-colors"
              >
                <span>✦ วางแผนนัดหมายช่วงเวลานี้</span>
                <span>→</span>
              </Link>
            </div>
          )}
        </div>

        {/* Live Yam and Moon Status Bar */}
        <div className="pt-2 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse shrink-0"
              style={{ background: yamLevelColor }}
            />
            <span className="text-slate-600 dark:text-[#C6B79F] font-semibold">
              ยามขณะนี้:{" "}
              <span className="font-bold" style={{ color: yamLevelColor }}>
                {yam.name}
              </span>
            </span>
            {timeLeft && (
              <span
                className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-mono"
                suppressHydrationWarning
              >
                (เหลือ {timeLeft})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-[#94A3B8]">
            <span>{moon.isWanPhra ? "🙏" : "🌙"}</span>
            <span>{moon.phase}</span>
            {moon.isWanPhra && (
              <span className="text-amber-700 dark:text-amber-400 font-bold ml-1 bg-amber-400/15 px-1.5 py-0.5 rounded">
                วันพระ
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── ⚖️ PILLAR 2 & 3: แนวทางที่เหมาะควรทำ VS สิ่งที่ควรระวัง (MINIMAL 2-COLUMN) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fade-up">
        {/* Recommended Actions */}
        <div className="p-4 sm:p-5 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black text-sm">
              ✓
            </div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
              แนวทางที่เหมาะควรทำ
            </p>
          </div>
          <ul className="space-y-2">
            {doList.slice(0, 3).map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-[#E2E8F0] leading-snug"
              >
                <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 text-xs shrink-0">●</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Things to Avoid */}
        <div className="p-4 sm:p-5 rounded-3xl border border-rose-500/30 bg-rose-500/10 backdrop-blur-md shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-rose-500/20 text-rose-700 dark:text-rose-300 font-black text-sm">
              ✕
            </div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-700 dark:text-rose-400">
              สิ่งที่ควรระวัง / หลีกเลี่ยง
            </p>
          </div>
          <ul className="space-y-2">
            {avoidList.slice(0, 3).map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-[#E2E8F0] leading-snug"
              >
                <span className="text-rose-600 dark:text-rose-400 mt-0.5 text-xs shrink-0">●</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── CARD 3: หาฤกษ์มงคล & จังหวะเวลาที่ดีที่สุด ── */}
      <div className="rounded-3xl p-5 border border-slate-200 dark:border-[#C6A96B]/40 bg-white/95 dark:bg-gradient-to-br dark:from-[#0a2240] dark:via-[#071427] dark:to-[#020617] backdrop-blur-xl shadow-lg relative overflow-hidden animate-fade-up">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8C6D2D] dark:text-[#C6A96B]">
              AUSPICIOUS TIMING FINDER
            </span>
            <h3 className="font-display text-base sm:text-lg font-black text-slate-900 dark:text-[#F8F6F1]">
              หาฤกษ์มงคล & จังหวะเวลาที่ดีที่สุด
            </h3>
            <p className="text-xs text-slate-600 dark:text-[#CBD5E1] max-w-md leading-relaxed">
              ออกรถใหม่, ขึ้นบ้านใหม่, เซ็นสัญญา หรือเจรจาสำคัญ คัดกรอง Top 3 ช่วงเวลาทองคำเฉพาะคุณ
            </p>
          </div>

          <Link
            to="/dashboard/check-yam"
            className="w-full sm:w-auto shrink-0 min-h-[44px] px-5 py-2.5 rounded-2xl text-xs font-black text-[#020617] bg-gradient-to-r from-[#C6A96B] via-[#F2D49B] to-[#C6A96B] hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span>✦</span>
            <span>หาฤกษ์ให้ฉัน</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* ── CARD 4: TODAY'S APPOINTMENTS (นัดหมายวันนี้) ── */}
      <div className="rounded-3xl p-5 border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/40 backdrop-blur-md animate-fade-up shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 shrink-0">
              <AstralIcon name="calendar" size="xs" variant="gold" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8C6D2D] dark:text-[#C6A96B]">
              นัดหมายและกิจกรรมวันนี้ ({todayAppointments.length})
            </p>
          </div>
          <Link
            to={`/dashboard/calendar?date=${bkkDateStr}`}
            className="text-xs text-slate-500 dark:text-[#94A3B8] hover:text-[#8C6D2D] dark:hover:text-[#C6A96B] font-semibold transition-colors"
          >
            + เพิ่มนัดหมาย →
          </Link>
        </div>

        {todayAppointments.length > 0 ? (
          <div className="space-y-2.5">
            {todayAppointments.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-white/8 bg-slate-50/70 dark:bg-white/4 hover:bg-slate-100/70 dark:hover:bg-white/7 transition-all"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B]">
                      {app.event_time.slice(0, 5)} น.
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-[#F8F6F1] truncate">
                      {app.title}
                    </span>
                  </div>
                  {app.advice && (
                    <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-1 line-clamp-1">
                      {app.advice}
                    </p>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span
                    className="px-2.5 py-1 rounded-full text-[11px] font-black"
                    style={{
                      backgroundColor:
                        app.score >= 80
                          ? "rgba(16,185,129,0.15)"
                          : "rgba(198,169,107,0.15)",
                      color: app.score >= 80 ? "#10B981" : "#C6A96B",
                      border: `1px solid ${
                        app.score >= 80
                          ? "rgba(16,185,129,0.3)"
                          : "rgba(198,169,107,0.3)"
                      }`,
                    }}
                  >
                    {app.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-[#94A3B8]">
              ยังไม่มีนัดหมายที่ลงบันทึกไว้ในวันนี้
            </span>
            <Link
              to={`/dashboard/calendar?date=${bkkDateStr}${
                goldenWindow ? `&time=${goldenWindow.startTime}` : ""
              }`}
              className="text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B] hover:underline"
            >
              + วางแผนนัดหมาย
            </Link>
          </div>
        )}
      </div>

      {/* ── QUICK ACTION HUB: 3 ESSENTIAL ACTIONS ── */}
      <div className="pt-2 animate-fade-up space-y-3">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-center text-slate-500 dark:text-[#94A3B8]">
          เครื่องมือตัดสินใจด่วน
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/dashboard/check-yam"
            className="flex sm:flex-col items-center justify-between sm:justify-center p-4 rounded-2xl border border-slate-200 dark:border-[#C6A96B]/40 bg-white/90 dark:bg-gradient-to-br dark:from-[#C6A96B]/15 dark:to-[#4B6FAE]/10 hover:border-[#C6A96B] transition-all group active:scale-95 text-left sm:text-center shadow-sm"
          >
            <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">
              ⚡
            </span>
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-[#F8F6F1]">ถามฤกษ์ด่วน</p>
              <p className="text-[10px] text-slate-500 dark:text-[#C6B79F] mt-0.5">
                ประเมินจังหวะเวลานี้
              </p>
            </div>
            <span className="sm:hidden text-xs text-[#C6A96B]">→</span>
          </Link>

          <Link
            to="/dashboard/calendar"
            className="flex sm:flex-col items-center justify-between sm:justify-center p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-white/5 hover:border-[#C6A96B]/50 transition-all group active:scale-95 text-left sm:text-center shadow-sm"
          >
            <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">
              📅
            </span>
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-[#F8F6F1]">ปฏิทินทั้งเดือน</p>
              <p className="text-[10px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
                วางแผนล่วงหน้า 100 ปี
              </p>
            </div>
            <span className="sm:hidden text-xs text-slate-400 dark:text-[#94A3B8]">→</span>
          </Link>

          <Link
            to="/dashboard/horoscope"
            className="flex sm:flex-col items-center justify-between sm:justify-center p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-white/5 hover:border-[#C6A96B]/50 transition-all group active:scale-95 text-left sm:text-center shadow-sm"
          >
            <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">
              🛡️
            </span>
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-[#F8F6F1]">
                ผังดวงจักรพรรดิ
              </p>
              <p className="text-[10px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
                ตรวจดวงชะตาเลข 7 ตัว
              </p>
            </div>
            <span className="sm:hidden text-xs text-slate-400 dark:text-[#94A3B8]">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

