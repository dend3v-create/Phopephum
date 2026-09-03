import { json } from "@remix-run/cloudflare";
import { useLoaderData, Link, useRevalidator } from "@remix-run/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import {
  getCurrentYam,
  calculateMoonPhase,
  getSunTimes,
  getYamPrediction,
  calculatePhopephum,
} from "@phopephum/engine";
import { checkAndAwardDailyLogin } from "~/services/rewards.server";
import { generateDailyAdvice } from "~/services/dailyAdvisor.server";
import type { Env } from "~/env.server";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18next from "~/lib/i18n/i18n.server";
import { createSupabaseClient } from "~/services/supabase.server";

export const meta: MetaFunction = () => [
  { title: "วันนี้ — PhopePhum" },
  { name: "description", content: "ดูพลังงานประจำวัน ช่วงเวลาทอง และคำแนะนำส่วนตัวที่ PhopePhum" },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface GoldenWindow {
  startTime: string;   // "HH:mm"
  endTime: string;     // "HH:mm"
  yamName: string;
  description: string;
  score: number;       // 0–100
}

// ─── Helper: get best auspicious windows for the day ─────────────────────────
function getGoldenWindows(targetDate: Date): GoldenWindow[] {
  const sunTimes = getSunTimes(targetDate);
  const sunrise = sunTimes.sunrise;
  const sunset = sunTimes.sunset;

  const dayMs = sunset.getTime() - sunrise.getTime();
  const daySlotMs = dayMs / 8;

  const windows: GoldenWindow[] = [];

  for (let i = 0; i < 8; i++) {
    const startTime = new Date(sunrise.getTime() + i * daySlotMs);
    const endTime = new Date(sunrise.getTime() + (i + 1) * daySlotMs);
    const midTime = new Date(startTime.getTime() + daySlotMs / 2);
    const result = getYamPrediction(midTime);
    const level = result.travelAuspiciousness.level;
    const score =
      level === "excellent" ? 92 :
      level === "very_good" ? 78 :
      level === "good"      ? 60 : 25;

    const fmt = (d: Date) =>
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    windows.push({
      startTime: fmt(startTime),
      endTime: fmt(endTime),
      yamName: result.yamName,
      description: result.travelAuspiciousness.description,
      score,
    });
  }

  return windows
    .filter((w) => w.score >= 60)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// ─── Helper: derive daily score from advice ───────────────────────────────────
function getDailyScore(
  dailyAdvice: ReturnType<typeof generateDailyAdvice> | null,
  yamLevel: string
): number {
  if (!dailyAdvice) return 50;

  const statusScore = (s: string) =>
    s === "excellent" ? 35 : s === "good" ? 25 : 10;

  const base =
    statusScore(dailyAdvice.work.status) +
    statusScore(dailyAdvice.wealth.status) +
    statusScore(dailyAdvice.love.status) +
    statusScore(dailyAdvice.health.status);

  const yamBonus =
    yamLevel === "excellent" ? 10 :
    yamLevel === "very_good" ? 6 :
    yamLevel === "good"       ? 2 : -5;

  return Math.min(100, Math.max(0, base + yamBonus));
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
      work_excellent: "เจรจาธุรกิจ / เสนองาน",
      work_good: "ลงมือทำงานตามแผน",
      wealth_excellent: "ลงทุน / จัดการการเงิน",
      wealth_good: "วางแผนงบประมาณ",
      love_excellent: "นัดหมายพิเศษ / สร้างความประทับใจ",
      love_good: "สื่อสารความรู้สึกอย่างตรงไปตรงมา",
      health_good: "ออกกำลังกายเบาๆ / ดูแลสุขภาพ",
    },
    en: {
      work_excellent: "Business negotiation / Pitching",
      work_good: "Execute planned tasks",
      wealth_excellent: "Invest / Manage finances",
      wealth_good: "Budget planning",
      love_excellent: "Special dates / Making impressions",
      love_good: "Open communication",
      health_good: "Light exercise / Self-care",
    },
    zh: {
      work_excellent: "商务谈判 / 提案",
      work_good: "按计划执行任务",
      wealth_excellent: "投资 / 理财管理",
      wealth_good: "预算规划",
      love_excellent: "特别约会 / 制造惊喜",
      love_good: "坦诚沟通",
      health_good: "轻运动 / 自我保健",
    },
  };

  const AVOID_LABELS: Record<string, Record<string, string>> = {
    th: {
      work_warning: "เสนอโครงการใหม่ / เริ่มงานใหญ่",
      wealth_warning: "ลงทุนกะทันหัน / เซ็นเอกสารสำคัญ",
      love_warning: "พูดคุยเรื่องขัดแย้งเก่า",
      health_warning: "ออกกำลังกายหักโหม / นอนดึก",
    },
    en: {
      work_warning: "New project proposals / Major decisions",
      wealth_warning: "Impulse investing / Signing important docs",
      love_warning: "Revisiting past conflicts",
      health_warning: "Intense exercise / Late nights",
    },
    zh: {
      work_warning: "新项目提案 / 重大决策",
      wealth_warning: "冲动投资 / 签署重要文件",
      love_warning: "翻旧账 / 重提旧矛盾",
      health_warning: "剧烈运动 / 熬夜",
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
    success: false, earned: 0, message: "", newBalance: 0,
  }));

  const profile = await getProfile(user.id, request, env);
  const now = new Date();
  const locale = await i18next.getLocale(request);

  // ── Live engine data ──
  const yam = getCurrentYam();
  const moon = calculateMoonPhase();
  const goldenWindows = getGoldenWindows(now);

  // ── Daily Advice (from PhopephumResult via Taksa) ──
  let dailyAdvice = null;
  if (profile?.birth_date) {
    try {
      const phResult = await calculatePhopephum({
        birthDate: profile.birth_date,
        birthTime: profile.birth_time || "12:00",
        birthPlace: profile.birth_place || "กรุงเทพมหานคร",
      }, now);
      dailyAdvice = generateDailyAdvice(phResult, locale);
    } catch (err) {
      console.error("Daily advice error:", err);
    }
  }

  const yamLevel = yam.travelAuspiciousness.level;
  const dailyScore = getDailyScore(dailyAdvice, yamLevel);
  const { doList, avoidList } = getDoAvoidLists(dailyAdvice, locale);

  // ── Compute Yam end-time ISO from sunTimes ──
  const sunTimes = yam.sunTimes;
  const isDayPeriod = yam.period === "day";
  const slotStart = isDayPeriod ? sunTimes.sunrise : sunTimes.sunset;
  const slotTotal = isDayPeriod
    ? sunTimes.sunset.getTime() - sunTimes.sunrise.getTime()
    : 86_400_000 - (sunTimes.sunset.getTime() - sunTimes.sunrise.getTime());
  const slotMs = slotTotal / 8;
  const yamEndTime = new Date(slotStart.getTime() + yam.yamNumber * slotMs);
  const yamEndTimeISO = yamEndTime.toISOString();

  // ── Check if login reward should be shown ──
  const todayDateStr = now.toISOString().split("T")[0]!;
  const { data: dailyPlan } = await supabase
    .from("daily_plans")
    .select("daily_card, daily_card_reading")
    .eq("user_id", user.id)
    .eq("date", todayDateStr)
    .single();

  // ── Admin pending count ──
  let pendingCount = 0;
  if (profile?.role === "admin" || profile?.role === "operator") {
    const { count } = await supabase
      .from("subscription_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  return json({
    user, profile, loginReward, pendingCount, dailyPlan,
    now: now.toISOString(),
    yamEndTimeISO,
    yam: {
      name:    yam.yamName,
      level:   yamLevel,
      label:   yam.travelAuspiciousness.label,
      ticks:   yam.travelAuspiciousness.ticks,
      shouldDo: yam.prediction?.shouldDo ?? "",
    },
    moon: {
      phase:        moon.moonPhase,
      illumination: moon.illumination,
      isWanPhra:    moon.isWanPhra,
    },
    goldenWindows,
    dailyScore,
    doList,
    avoidList,
    dailyAdvice,
  });
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? "#4ADE80" :
    score >= 60 ? "#C6A96B" :
    score >= 40 ? "#F59E0B" : "#F87171";

  const label =
    score >= 80 ? "ดีมาก" :
    score >= 60 ? "ดี" :
    score >= 40 ? "ปานกลาง" : "ควรระวัง";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
          {/* Track */}
          <circle
            cx="64" cy="64" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="10"
          />
          {/* Progress */}
          <circle
            cx="64" cy="64" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-black text-3xl leading-none text-[#F8F6F1]">
            {score}
          </span>
          <span className="text-[10px] text-[#C6B79F] tracking-wider">/100</span>
        </div>
      </div>
      <span
        className="text-sm font-bold tracking-wide"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}

function GoldenWindowCard({
  window: w,
  isTop,
}: {
  window: GoldenWindow;
  isTop: boolean;
}) {
  return (
    <div
      className={`rounded-2xl px-4 py-3.5 border transition-all ${
        isTop
          ? "border-[#C6A96B]/50 bg-gradient-to-br from-[#C6A96B]/12 to-[#4B6FAE]/8 shadow-lg shadow-[#C6A96B]/10"
          : "border-white/10 bg-white/4"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            {isTop && <span className="text-[#F2D49B] text-base">⭐</span>}
            <span className="font-display text-lg font-extrabold text-[#F8F6F1] tracking-tight">
              {w.startTime} – {w.endTime}
            </span>
          </div>
          <p className="text-xs text-[#C6B79F] mt-0.5 line-clamp-1">{w.description}</p>
        </div>
        {/* Score bar */}
        <div className="flex flex-col items-end gap-1 ml-3 shrink-0">
          <span className="text-xs font-black tabular-nums" style={{
            color: w.score >= 80 ? "#4ADE80" : w.score >= 60 ? "#C6A96B" : "#F59E0B"
          }}>
            {w.score}%
          </span>
          <div className="w-14 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${w.score}%`,
                background: w.score >= 80 ? "#4ADE80" : w.score >= 60 ? "#C6A96B" : "#F59E0B",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AdviceSection({
  doList,
  avoidList,
  locale,
}: {
  doList: string[];
  avoidList: string[];
  locale: string;
}) {
  const doLabel = locale === "en" ? "Good for today" : locale === "zh" ? "今日宜" : "วันนี้เหมาะกับ";
  const avoidLabel = locale === "en" ? "Avoid today" : locale === "zh" ? "今日忌" : "ควรเลี่ยง";

  return (
    <div className="space-y-3.5">
      {doList.length > 0 && (
        <div
          className="rounded-2xl px-5 py-4 border border-emerald-500/25 bg-emerald-500/6"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-3">
            ✓ {doLabel}
          </p>
          <ul className="space-y-2">
            {doList.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-[#E2E8F0]">
                <span className="text-emerald-400 mt-0.5 text-xs shrink-0">●</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {avoidList.length > 0 && (
        <div
          className="rounded-2xl px-5 py-4 border border-rose-500/20 bg-rose-500/5"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 mb-3">
            ✕ {avoidLabel}
          </p>
          <ul className="space-y-2">
            {avoidList.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-[#E2E8F0]">
                <span className="text-rose-400 mt-0.5 text-xs shrink-0">●</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DomainAdviceRow({
  label,
  status,
  title,
}: {
  label: string;
  status: "excellent" | "good" | "warning";
  title: string;
}) {
  const icon = status === "excellent" ? "✦" : status === "good" ? "•" : "△";
  const color =
    status === "excellent" ? "text-emerald-400" :
    status === "good"      ? "text-[#C6A96B]" :
    "text-amber-400";

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      <span className={`${color} text-xs mt-0.5 w-3 shrink-0 font-bold`}>{icon}</span>
      <div className="min-w-0">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] block leading-none mb-0.5">
          {label}
        </span>
        <p className="text-sm text-[#E2E8F0] leading-snug">{title}</p>
      </div>
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
    <div
      className="fixed top-16 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none md:top-4"
    >
      <div
        className="flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl pointer-events-auto animate-fade-up"
        style={{
          background: "rgba(2,6,23,0.95)",
          backdropFilter: "blur(24px)",
          borderColor: "rgba(198,169,107,0.4)",
        }}
      >
        <div className="text-2xl">⏳</div>
        <div>
          <p className="text-sm font-bold text-[#C6A96B]">+{reward.earned} ทรายกาลเวลา</p>
          <p className="text-xs text-[#94A3B8]">{reward.message} · คงเหลือ {reward.newBalance}</p>
        </div>
        <button onClick={onClose} className="ml-2 text-[#64748B] hover:text-white text-xs">✕</button>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function TodayScreen() {
  const d = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();
  const { t, i18n } = useTranslation("common");

  const { profile, loginReward, pendingCount, goldenWindows, dailyScore,
          doList, avoidList, dailyAdvice, yam, moon, yamEndTimeISO } = d;

  const displayName = profile?.display_name ?? t("auth.user", "คุณ");
  const isPro = profile?.role === "admin" || profile?.role === "operator" ||
                profile?.plan === "imperial" || profile?.plan === "pro";
  const hasBirth = !!(profile?.birth_date);
  const locale = i18n.language;

  // ── Live date label ──
  const [dateLabel, setDateLabel] = useState("");
  const [greeting, setGreeting] = useState("");
  const [showReward, setShowReward] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(
      h < 5  ? "ราตรีสวัสดิ์" :
      h < 12 ? "อรุณสวัสดิ์" :
      h < 17 ? "สวัสดีตอนบ่าย" :
      "สวัสดีตอนเย็น"
    );

    const thaiLocale = locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "th-TH";
    setDateLabel(new Date().toLocaleDateString(thaiLocale, {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    }));

    if (loginReward?.success && loginReward.earned > 0) {
      setShowReward(true);
    }
  }, [loginReward, locale]);

  // Countdown to end of current Yam
  useEffect(() => {
    if (!yamEndTimeISO) return;
    const update = () => {
      const diff = new Date(yamEndTimeISO).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(""); return; }
      const min = Math.floor(diff / 60_000);
      const sec = Math.floor((diff % 60_000) / 1000);
      setTimeLeft(`${min}:${String(sec).padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [yamEndTimeISO]);

  // Periodic revalidation
  useEffect(() => {
    const id = setInterval(revalidate, 60_000);
    return () => clearInterval(id);
  }, [revalidate]);

  const yamLevelColor =
    yam.level === "excellent" ? "#4ADE80" :
    yam.level === "very_good" ? "#60A5FA" :
    yam.level === "good"      ? "#C6A96B" : "#F87171";

  const titleLabel = locale === "en" ? "Today" : locale === "zh" ? "今日" : "วันนี้";
  const yourDayLabel = locale === "en" ? "Your Day" : locale === "zh" ? "今日运势" : "วันนี้ของคุณ";
  const goldenTimeLabel = locale === "en" ? "Golden Windows" : locale === "zh" ? "今日吉时" : "ช่วงเวลาทอง";
  const findTimingLabel = locale === "en" ? "🔎 Find My Best Time" : locale === "zh" ? "🔎 为我寻找吉时" : "🔎 หาฤกษ์ให้ฉัน";

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-8 pt-1 px-0.5">
      {/* ── Login Reward Toast ── */}
      {showReward && loginReward && (
        <LoginRewardToast
          reward={loginReward}
          onClose={() => setShowReward(false)}
        />
      )}

      {/* ── Admin Pending Badge ── */}
      {pendingCount > 0 && (
        <Link to="/admin/approvals" className="flex items-center justify-between px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-bold hover:bg-amber-500/15 transition-colors">
          <span>⚡ มี {pendingCount} คำขออนุมัติรอดำเนินการ</span>
          <span className="text-xs">→</span>
        </Link>
      )}

      {/* ── HEADER ── */}
      <div className="pt-1 animate-fade-up">
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#C6A96B] opacity-80 mb-0.5">
          {greeting}
        </p>
        <h1 className="font-display text-3xl font-extrabold text-[#F8F6F1] leading-tight">
          {titleLabel}{" "}
          <span className="text-[#C6A96B]">{displayName}</span>
        </h1>
        <p className="text-xs text-[#94A3B8] mt-1 tracking-wide">{dateLabel}</p>
      </div>

      {/* ── CARD 1: วันนี้ของคุณ (Daily Energy Score) ── */}
      <div
        className="rounded-3xl p-6 border border-[#C6A96B]/25 overflow-hidden relative animate-fade-up"
        style={{
          background: "linear-gradient(135deg, rgba(10,34,64,0.7) 0%, rgba(2,6,23,0.9) 100%)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Cosmic decorative glow */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full blur-2xl pointer-events-none opacity-40"
          style={{ background: "radial-gradient(circle, #C6A96B40 0%, transparent 70%)" }} />

        <div className="relative flex items-center gap-6">
          <ScoreRing score={dailyScore} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C6A96B] mb-1">
              {yourDayLabel}
            </p>

            {/* Current Yam Live Badge */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-2 h-2 rounded-full animate-pulse shrink-0"
                style={{ background: yamLevelColor }}
              />
              <span className="text-xs text-[#C6B79F] font-semibold">
                ยามปัจจุบัน:{" "}
                <span className="font-bold" style={{ color: yamLevelColor }}>
                  {yam.name}
                </span>
              </span>
              {timeLeft && (
                <span className="text-[10px] text-[#64748B] font-mono ml-auto">
                  {timeLeft}
                </span>
              )}
            </div>

            {/* Moon Phase */}
            <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
              <span>{moon.isWanPhra ? "🙏" : "🌙"}</span>
              <span>
                {moon.phase}
                {moon.isWanPhra && (
                  <span className="ml-1 text-amber-400 font-bold">วันพระ</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Domain Advice Preview (work, wealth, love, health) */}
        {dailyAdvice && (
          <div className="mt-5 pt-4 border-t border-white/8 space-y-0">
            <DomainAdviceRow
              label={locale === "en" ? "Career" : locale === "zh" ? "事业" : "การงาน"}
              status={dailyAdvice.work.status}
              title={dailyAdvice.work.title}
            />
            <DomainAdviceRow
              label={locale === "en" ? "Wealth" : locale === "zh" ? "财运" : "การเงิน"}
              status={dailyAdvice.wealth.status}
              title={dailyAdvice.wealth.title}
            />
            <DomainAdviceRow
              label={locale === "en" ? "Relationships" : locale === "zh" ? "感情" : "ความรัก"}
              status={dailyAdvice.love.status}
              title={dailyAdvice.love.title}
            />
            <DomainAdviceRow
              label={locale === "en" ? "Health" : locale === "zh" ? "健康" : "สุขภาพ"}
              status={dailyAdvice.health.status}
              title={dailyAdvice.health.title}
            />
          </div>
        )}

        {!hasBirth && (
          <div className="mt-4 pt-3 border-t border-white/8">
            <p className="text-xs text-[#94A3B8] text-center">
              <Link to="/dashboard/settings" className="text-[#C6A96B] font-bold underline underline-offset-2">
                ใส่วันเกิดของคุณ
              </Link>{" "}
              เพื่อดูพลังงานประจำวันที่แม่นยำ
            </p>
          </div>
        )}
      </div>

      {/* ── CARD 2: ช่วงเวลาทอง (Golden Windows) ── */}
      <div
        className="rounded-3xl p-5 border border-[#C6A96B]/20 animate-fade-up"
        style={{
          background: "rgba(10,34,64,0.55)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C6A96B]">
            ⭐ {goldenTimeLabel}
          </p>
          <Link
            to="/dashboard/check-yam"
            className="text-[10px] text-[#64748B] hover:text-[#C6A96B] font-bold transition-colors"
          >
            ดูทั้งหมด →
          </Link>
        </div>

        <div className="space-y-2.5">
          {goldenWindows.length > 0 ? (
            goldenWindows.map((w, i) => (
              <GoldenWindowCard key={i} window={w} isTop={i === 0} />
            ))
          ) : (
            <p className="text-sm text-[#64748B] text-center py-4">
              ยังไม่มีช่วงเวลาทองในวันนี้
            </p>
          )}
        </div>
      </div>

      {/* ── CARD 3: วันนี้เหมาะกับ / ควรเลี่ยง ── */}
      <div
        className="rounded-3xl p-5 border border-white/10 animate-fade-up"
        style={{
          background: "rgba(10,34,64,0.45)",
          backdropFilter: "blur(20px)",
        }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#94A3B8] mb-4">
          📋 {locale === "en" ? "Today's Guidance" : locale === "zh" ? "今日建议" : "คำแนะนำประจำวัน"}
        </p>
        <AdviceSection doList={doList} avoidList={avoidList} locale={locale} />
      </div>

      {/* ── CTA: หาฤกษ์ให้ฉัน ── */}
      <Link
        to="/dashboard/check-yam"
        className="block w-full text-center font-display font-black text-base tracking-wide py-4 rounded-2xl border transition-all active:scale-[0.98] hover:scale-[1.01] shadow-xl shadow-[#C6A96B]/15 animate-fade-up"
        style={{
          background: "linear-gradient(135deg, #C6A96B, #D9BC82, #C6A96B)",
          color: "#020617",
          borderColor: "transparent",
        }}
      >
        {findTimingLabel}
      </Link>
    </div>
  );
}
