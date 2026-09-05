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

  // คำนวณวันที่ตามโหราศาสตร์ไทย (ระบบยามอัฐกาล ตัดวันใหม่ที่ 06:01 น.)
  const bkkDateStr = getAstrologicalDateStr(now);
  const thaiDateLabel = getAstrologicalThaiFormattedDate(now, currentLocale);

  // ── 1. Live Yam & Moon ──
  const yam = getCurrentYam();
  const moon = calculateMoonPhase();

  // ── 2. Profile Context ──
  const profileContext = profile
    ? {
        birthDate: profile.birth_date,
        birthTime: profile.birth_time,
        birthPlace: profile.birth_place,
        displayName: profile.display_name,
      }
    : null;

  // ── 3. STEP 5.1 Calendar Intelligence (Daily Theme, Golden Window, 4 Domains) ──
  const dayIntelligence: CalendarDayIntelligence =
    await calculateDayIntelligence(bkkDateStr, profileContext);

  // ── 4. STEP 4.5 Personal Wisdom Intelligence ──
  let wisdomIntelligence: PersonalWisdomIntelligence | null = null;
  try {
    wisdomIntelligence = await generatePersonalWisdomIntelligence({
      userId: user.id,
      supabase,
      userName: profile?.display_name || undefined,
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

  // ── 6. Daily Advice (Phopephum Taksa detail) ──
  let dailyAdvice = null;
  if (profile?.birth_date) {
    try {
      const phResult = await calculatePhopephum(
        {
          birthDate: profile.birth_date,
          birthTime: profile.birth_time || "12:00",
          birthPlace: profile.birth_place || "กรุงเทพมหานคร",
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
        <div className="text-2xl">⏳</div>
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

  const displayName = profile?.display_name ?? t("auth.user", "คุณ");
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

  // Countdown to end of current Yam
  useEffect(() => {
    if (!yamEndTimeISO) return;
    const update = () => {
      const diff = new Date(yamEndTimeISO).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("");
        return;
      }
      const min = Math.floor(diff / 60_000);
      const sec = Math.floor((diff % 60_000) / 1000);
      setTimeLeft(`${min}:${String(sec).padStart(2, "0")}`);
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
      className="max-w-2xl mx-auto space-y-6 pt-1 px-3 sm:px-4"
      style={{ paddingBottom: "calc(84px + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* ── Login Reward Toast ── */}
      {showReward && loginReward && (
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
            className="text-[11px] font-black uppercase tracking-[0.25em] text-[#C6A96B] min-h-[14px]"
            suppressHydrationWarning
          >
            {greeting}
          </p>
          <span className="text-[11px] font-semibold text-[#C6B79F] px-2.5 py-0.5 rounded-full border border-[#C6A96B]/30 bg-[#C6A96B]/10">
            {dayIntelligence.lunarDayInfo.lunarDateStr}
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F8F6F1] leading-tight mt-1">
          วันนี้ของ <span className="text-[#C6A96B]">{displayName}</span>
        </h1>
        <p
          className="text-xs text-[#94A3B8] mt-1 tracking-wide min-h-[16px]"
          suppressHydrationWarning
        >
          {dateLabel}
        </p>
      </div>

      {/* ── CARD 1: HERO - สรุปพลังงานและธีมประจำวัน (The Daily Theme & Energy) ── */}
      <div className="rounded-3xl p-5 sm:p-6 border border-[#C6A96B]/30 overflow-hidden relative animate-fade-up card-glass-premium shadow-xl">
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40"
          style={{
            background: "radial-gradient(circle, #C6A96B50 0%, transparent 70%)",
          }}
        />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
          <ScoreRing score={dayIntelligence.overallScore} />

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <span className="inline-block text-[10px] font-black uppercase tracking-[0.22em] text-[#C6A96B] mb-1">
              DAILY THEME
            </span>
            <h2 className="font-display text-lg sm:text-xl font-black text-[#F8F6F1] leading-snug">
              {dayIntelligence.dailyTheme}
            </h2>
            <p className="text-xs sm:text-sm text-[#CBD5E1] mt-2 leading-relaxed">
              {dayIntelligence.dailySummary}
            </p>

            {/* Live Yam and Moon Status Bar */}
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full animate-pulse shrink-0"
                  style={{ background: yamLevelColor }}
                />
                <span className="text-[#C6B79F] font-semibold">
                  ยามขณะนี้:{" "}
                  <span className="font-bold" style={{ color: yamLevelColor }}>
                    {yam.name}
                  </span>
                </span>
                {timeLeft && (
                  <span
                    className="text-[10px] text-[#94A3B8] font-mono"
                    suppressHydrationWarning
                  >
                    (เหลือ {timeLeft})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
                <span>{moon.isWanPhra ? "🙏" : "🌙"}</span>
                <span>{moon.phase}</span>
                {moon.isWanPhra && (
                  <span className="text-amber-400 font-bold ml-1 bg-amber-400/10 px-1.5 py-0.5 rounded">
                    วันพระ
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 2: ⭐ GOLDEN WINDOW SPOTLIGHT ── */}
      {goldenWindow && (
        <div className="rounded-3xl p-5 sm:p-6 border border-[#C6A96B]/50 overflow-hidden relative animate-fade-up card-glass-gold shadow-lg shadow-[#C6A96B]/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F2D49B]">
                ช่วงเวลาทองคำสูงสุดของวัน
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              คะแนน {goldenWindow.score}%
            </span>
          </div>

          <div className="mt-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <span className="font-display text-2xl sm:text-3xl font-extrabold text-[#F8F6F1] tracking-tight">
                {goldenWindow.startTime} – {goldenWindow.endTime} น.
              </span>
              <p className="text-xs sm:text-sm text-[#E2E8F0] mt-1.5 leading-relaxed">
                {goldenWindow.plainAdvice}
              </p>
            </div>
          </div>

          {/* Suitable activities tags */}
          {goldenWindow.suitableFor && goldenWindow.suitableFor.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {goldenWindow.suitableFor.map((act, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 text-[#F8F6F1] border border-white/15"
                >
                  ✓ {act}
                </span>
              ))}
            </div>
          )}

          {/* CTA: ใช้นัดหมายช่วงเวลานี้ */}
          <div className="mt-5 pt-4 border-t border-[#C6A96B]/25 flex items-center justify-between">
            <p className="text-xs text-[#C6B79F]">
              ใช้จังหวะเวลานี้ให้เกิดประโยชน์สูงสุด
            </p>
            <Link
              to={`/dashboard/calendar?date=${bkkDateStr}&time=${goldenWindow.startTime}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#020617] bg-gradient-to-r from-[#C6A96B] via-[#F2D49B] to-[#C6A96B] hover:opacity-95 active:scale-95 transition-all shadow-md shadow-[#C6A96B]/20"
            >
              <span>✨ ใช้นัดหมายช่วงนี้</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── CARD 3: 4 LIFE DOMAINS & DO/AVOID GUIDANCE ── */}
      <div className="rounded-3xl p-5 sm:p-6 border border-white/10 animate-fade-up card-glass space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C6A96B]">
            จังหวะพลังงาน 4 มิติชีวิต
          </p>
          <Link
            to="/dashboard/calendar"
            className="text-xs text-[#94A3B8] hover:text-[#C6A96B] font-semibold transition-colors"
          >
            ดูผังทั้งวัน →
          </Link>
        </div>

        {/* 4 Domains Bar Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {dayIntelligence.domainScores.map((domain, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl border border-white/8 bg-white/4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{domain.icon}</span>
                  <span className="text-xs font-bold text-[#F8F6F1]">
                    {domain.label}
                  </span>
                </div>
                <span
                  className="text-xs font-black tabular-nums"
                  style={{
                    color:
                      domain.score >= 80
                        ? "#10B981"
                        : domain.score >= 60
                        ? "#C6A96B"
                        : "#F59E0B",
                  }}
                >
                  {domain.score}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${domain.score}%`,
                    background:
                      domain.score >= 80
                        ? "#10B981"
                        : domain.score >= 60
                        ? "#C6A96B"
                        : "#F59E0B",
                  }}
                />
              </div>
              <p className="text-[11px] text-[#CBD5E1] line-clamp-1">
                {domain.verdict}
              </p>
            </div>
          ))}
        </div>

        {/* Do & Avoid lists */}
        <div className="pt-3 border-t border-white/8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {doList.length > 0 && (
            <div className="p-3.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-2">
                ✓ วันนี้ส่งเสริม
              </p>
              <ul className="space-y-1.5">
                {doList.slice(0, 3).map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-[#E2E8F0]"
                  >
                    <span className="text-emerald-400 mt-0.5 text-[10px]">●</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {avoidList.length > 0 && (
            <div className="p-3.5 rounded-2xl border border-rose-500/20 bg-rose-500/8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 mb-2">
                ✕ ควรหลีกเลี่ยง / รอบคอบ
              </p>
              <ul className="space-y-1.5">
                {avoidList.slice(0, 3).map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-[#E2E8F0]"
                  >
                    <span className="text-rose-400 mt-0.5 text-[10px]">●</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ── CARD 4: 🧠 PERSONAL WISDOM REFLECTION (ปัญญาชีวิตเฉพาะตน) ── */}
      <div className="rounded-3xl p-5 sm:p-6 border border-[#C6A96B]/25 animate-fade-up card-glass space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧠</span>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C6A96B]">
              ปัญญาชีวิตเฉพาะตน (PERSONAL WISDOM)
            </p>
          </div>
          <Link
            to="/dashboard/settings?tab=wisdom"
            className="text-xs text-[#94A3B8] hover:text-[#C6A96B] font-semibold transition-colors"
          >
            คลังปัญญา →
          </Link>
        </div>

        {wisdomIntelligence && wisdomIntelligence.hasSufficientData ? (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-xs sm:text-sm text-[#F8F6F1] leading-relaxed italic">
                "{wisdomIntelligence.summary}"
              </p>
            </div>

            {/* Top Pattern Highlight */}
            {wisdomIntelligence.patterns && wisdomIntelligence.patterns.length > 0 && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#C6A96B]/10 border border-[#C6A96B]/25 text-xs text-[#F2D49B]">
                <span className="text-base">
                  {wisdomIntelligence.patterns[0].icon || "⚡"}
                </span>
                <span className="font-bold">
                  {wisdomIntelligence.patterns[0].title}:{" "}
                  {wisdomIntelligence.patterns[0].highlight}
                </span>
              </div>
            )}

            {/* Quick Stats Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#94A3B8]">
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                ถามแล้ว {wisdomIntelligence.stats.totalQueries} ครั้ง
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                ติดตามผล {wisdomIntelligence.stats.trackedOutcomes} ครั้ง
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-bold">
                ความแม่นยำ {wisdomIntelligence.stats.successRate}%
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-white/4 border border-white/8 flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="text-3xl sm:text-2xl">🌱</div>
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-xs sm:text-sm font-bold text-[#F8F6F1]">
                เริ่มสะสมสถิติจังหวะชีวิตของคุณ
              </p>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                เมื่อคุณสอบถามฤกษ์และบันทึกผลลัพธ์หลังลงมือทำ
                ระบบจะวิเคราะห์และสะท้อนช่วงเวลาที่ดีที่สุดเฉพาะตัวคุณที่นี่
              </p>
            </div>
            <Link
              to="/dashboard/settings?tab=wisdom"
              className="mt-2 sm:mt-0 sm:ml-auto shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold text-[#C6A96B] border border-[#C6A96B]/40 bg-[#C6A96B]/10 hover:bg-[#C6A96B]/20 transition-all"
            >
              ดูสถิติ
            </Link>
          </div>
        )}
      </div>

      {/* ── CARD 5: 📅 TODAY'S APPOINTMENTS (นัดหมายวันนี้) ── */}
      <div className="rounded-3xl p-5 sm:p-6 border border-white/10 animate-fade-up card-glass space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📅</span>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C6A96B]">
              นัดหมายและกิจกรรมวันนี้
            </p>
          </div>
          <Link
            to={`/dashboard/calendar?date=${bkkDateStr}`}
            className="text-xs text-[#94A3B8] hover:text-[#C6A96B] font-semibold transition-colors"
          >
            + เพิ่มนัดหมาย →
          </Link>
        </div>

        {todayAppointments.length > 0 ? (
          <div className="space-y-2.5">
            {todayAppointments.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-white/8 bg-white/4 hover:bg-white/7 transition-all"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#C6A96B]">
                      {app.event_time} น.
                    </span>
                    <span className="text-xs font-bold text-[#F8F6F1] truncate">
                      {app.title}
                    </span>
                  </div>
                  {app.advice && (
                    <p className="text-[11px] text-[#94A3B8] mt-1 line-clamp-1">
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
          <div className="p-4 rounded-2xl bg-white/4 border border-white/8 text-center space-y-2">
            <p className="text-xs text-[#94A3B8]">
              ยังไม่มีนัดหมายที่ลงบันทึกไว้ในวันนี้
            </p>
            <Link
              to={`/dashboard/calendar?date=${bkkDateStr}${
                goldenWindow ? `&time=${goldenWindow.startTime}` : ""
              }`}
              className="inline-block text-xs font-bold text-[#C6A96B] hover:underline"
            >
              + วางแผนนัดหมายใหม่สำหรับวันนี้
            </Link>
          </div>
        )}
      </div>

      {/* ── QUICK ACTION HUB: 3 ESSENTIAL ACTIONS ── */}
      <div className="pt-2 animate-fade-up space-y-3">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-center text-[#94A3B8]">
          เครื่องมือตัดสินใจด่วน
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/dashboard/check-yam"
            className="flex sm:flex-col items-center justify-between sm:justify-center p-4 rounded-2xl border border-[#C6A96B]/40 bg-gradient-to-br from-[#C6A96B]/15 to-[#4B6FAE]/10 hover:border-[#C6A96B] transition-all group active:scale-95 text-left sm:text-center"
          >
            <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">
              ⚡
            </span>
            <div>
              <p className="text-xs font-black text-[#F8F6F1]">ถามฤกษ์ด่วน</p>
              <p className="text-[10px] text-[#C6B79F] mt-0.5">
                ประเมินจังหวะเวลานี้
              </p>
            </div>
            <span className="sm:hidden text-xs text-[#C6A96B]">→</span>
          </Link>

          <Link
            to="/dashboard/calendar"
            className="flex sm:flex-col items-center justify-between sm:justify-center p-4 rounded-2xl border border-white/10 bg-white/5 hover:border-[#C6A96B]/50 transition-all group active:scale-95 text-left sm:text-center card-glass"
          >
            <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">
              📅
            </span>
            <div>
              <p className="text-xs font-black text-[#F8F6F1]">ปฏิทินทั้งเดือน</p>
              <p className="text-[10px] text-[#94A3B8] mt-0.5">
                วางแผนล่วงหน้า 100 ปี
              </p>
            </div>
            <span className="sm:hidden text-xs text-[#94A3B8]">→</span>
          </Link>

          <Link
            to="/dashboard/horoscope"
            className="flex sm:flex-col items-center justify-between sm:justify-center p-4 rounded-2xl border border-white/10 bg-white/5 hover:border-[#C6A96B]/50 transition-all group active:scale-95 text-left sm:text-center card-glass"
          >
            <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">
              🛡️
            </span>
            <div>
              <p className="text-xs font-black text-[#F8F6F1]">
                ผังดวงจักรพรรดิ
              </p>
              <p className="text-[10px] text-[#94A3B8] mt-0.5">
                ตรวจดวงชะตาเลข 7 ตัว
              </p>
            </div>
            <span className="sm:hidden text-xs text-[#94A3B8]">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
