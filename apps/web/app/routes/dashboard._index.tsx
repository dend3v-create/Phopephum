import { json } from "@remix-run/cloudflare";
import { useLoaderData, Link, useRevalidator } from "@remix-run/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import {
  getCurrentYam,
  calculateMoonPhase,
  calculateKarnchata,
  calculateRahu,
  calculateHoraTaynoo,
  PLANET_INFO,
  getSunTimes,
  getYamPrediction,
  calculatePhopephum
} from "@phopephum/engine";
import { checkAndAwardDailyLogin } from "~/services/rewards.server";
import { calculateUserIdentity } from "~/services/identity.server";
import { generateDailyAdvice } from "~/services/dailyAdvisor.server";
import type { Env } from "~/env.server";
import { useState, useEffect } from "react";
import { Sparkles, Compass, Shield, Target, BookOpen, Star, Heart, TrendingUp, Award } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18next from "~/lib/i18n/i18n.server";

export const meta: MetaFunction = () => [
  { title: "แดชบอร์ดหลัก — PhopePhum" },
];

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface YamSlotDetail {
  yamNumber: number;
  yamName: string;
  period: "day" | "night";
  timeLabel: string;
  startTimeISO: string;
  endTimeISO: string;
  ticks: number;
  level: "bad" | "good" | "very_good" | "excellent";
  label: string;
  description: string;
  prediction: any;
}

// ─── Helper to calculate daily slots ──────────────────────────────────────────
function calculateDailyYamSlots(targetDate: Date): YamSlotDetail[] {
  const sunTimes = getSunTimes(targetDate);
  const sunrise = sunTimes.sunrise;
  const sunset = sunTimes.sunset;

  const dayMs = sunset.getTime() - sunrise.getTime();
  const nightMs = 86400000 - dayMs;

  const daySlotMs = dayMs / 8;
  const nightSlotMs = nightMs / 8;

  const slots: YamSlotDetail[] = [];

  // 8 daytime slots
  for (let i = 0; i < 8; i++) {
    const startTime = new Date(sunrise.getTime() + i * daySlotMs);
    const endTime = new Date(sunrise.getTime() + (i + 1) * daySlotMs);
    const midTime = new Date(startTime.getTime() + daySlotMs / 2);
    const result = getYamPrediction(midTime);

    slots.push({
      yamNumber: i + 1,
      yamName: result.yamName,
      period: "day",
      timeLabel: `${startTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`,
      startTimeISO: startTime.toISOString(),
      endTimeISO: endTime.toISOString(),
      ticks: result.travelAuspiciousness.ticks,
      level: result.travelAuspiciousness.level as any,
      label: result.travelAuspiciousness.label,
      description: result.travelAuspiciousness.description,
      prediction: result.prediction ?? null,
    });
  }

  // 8 nighttime slots
  for (let i = 0; i < 8; i++) {
    const startTime = new Date(sunset.getTime() + i * nightSlotMs);
    const endTime = new Date(sunset.getTime() + (i + 1) * nightSlotMs);
    const midTime = new Date(startTime.getTime() + nightSlotMs / 2);
    const result = getYamPrediction(midTime);

    slots.push({
      yamNumber: i + 1,
      yamName: result.yamName,
      period: "night",
      timeLabel: `${startTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`,
      startTimeISO: startTime.toISOString(),
      endTimeISO: endTime.toISOString(),
      ticks: result.travelAuspiciousness.ticks,
      level: result.travelAuspiciousness.level as any,
      label: result.travelAuspiciousness.label,
      description: result.travelAuspiciousness.description,
      prediction: result.prediction ?? null,
    });
  }

  return slots;
}

// ─── Loader ───────────────────────────────────────────────────────────────────
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const { supabase } = createSupabaseClient(request, env);

  // 1. ตรวจเช็คและคำนวณ Login Reward ทันทีที่เข้าหน้าแรก
  const loginReward = await checkAndAwardDailyLogin(user.id, env).catch(err => {
    console.error("Login reward system error:", err);
    return { success: false, earned: 0, message: "", newBalance: 0 };
  });

  // ดึงโปรไฟล์ที่อัปเดตล่าสุด
  const profile = await getProfile(user.id, request, env);

  let pendingCount = 0;
  if (profile?.role === "admin" || profile?.role === "operator") {
    const { count } = await supabase
      .from("subscription_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  const now       = new Date();
  const yam       = getCurrentYam();
  const moon      = calculateMoonPhase();
  const karnchata = calculateKarnchata(now);
  const rahu      = calculateRahu(now);
  const hora      = calculateHoraTaynoo({ dateAsked: now });

  const todaySlots = calculateDailyYamSlots(now);
  const todayDateStr = now.toISOString().split("T")[0]!;

  // 2. ดึงแผนงานประจำวันนี้เพื่อตรวจการจับไพ่และการเคลมภารกิจ
  const { data: dailyPlan } = await supabase
    .from("daily_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", todayDateStr)
    .single();

  // 3. ระบบ Identity Engine
  const identity = profile?.birth_date
    ? calculateUserIdentity(profile.birth_date, profile.birth_time || "12:00")
    : null;

  // 4. ระบบคำนวณความรอบรู้รายวัน (Daily Advisors)
  let dailyAdvice = null;
  if (profile?.birth_date) {
    try {
      const phopephumResult = await calculatePhopephum({
        birthDate: profile.birth_date,
        birthTime: profile.birth_time || "12:00",
        birthPlace: profile.birth_place || "กรุงเทพมหานคร",
      }, now);
      const locale = await i18next.getLocale(request);
      dailyAdvice = generateDailyAdvice(phopephumResult, locale);
    } catch (err) {
      console.error("Daily advice engine error:", err);
    }
  }

  return json({
    user, profile, pendingCount,
    loginReward,
    identity,
    dailyPlan,
    dailyAdvice,
    now: now.toISOString(),
    yam: {
      name:    yam.yamName,
      number:  yam.yamNumber,
      period:  yam.period,
      level:   yam.travelAuspiciousness.level,
      label:   yam.travelAuspiciousness.label,
      ticks:   yam.travelAuspiciousness.ticks,
      shouldDo: yam.prediction?.shouldDo ?? "",
    },
    moon: {
      phase:        moon.moonPhase,
      illumination: moon.illumination,
      isWanPhra:    moon.isWanPhra,
    },
    karnchata: {
      yamYaiName:   karnchata.yamYaiName,
      yamYaiNumber: karnchata.yamYaiNumber,
      dayStarNumber: karnchata.dayStarNumber,
    },
    rahu: rahu ? {
      isGood:  rahu.is_current_moment_good,
      verdict: rahu.summary.overall_verdict,
      start:   rahu.main_block.start_time,
      end:     rahu.main_block.end_time,
    } : null,
    hora: {
      yamAsked:  hora.yamAsked,
      period:    hora.period,
      yamPlanet: hora.yamPlanet,
    },
    todaySlots,
  });
}

// ─── Helpers & Design Constants ───────────────────────────────────────────────
const LEVEL_STYLE: Record<string, { bar: string; badge: string }> = {
  excellent: { bar: "bg-emerald-400", badge: "text-emerald-800 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500/40 dark:bg-emerald-500/8" },
  very_good: { bar: "bg-sky-400",     badge: "text-sky-800 border-sky-300 bg-sky-50 dark:text-sky-400 dark:border-sky-500/40 dark:bg-sky-500/8" },
  good:      { bar: "bg-amber-400",   badge: "text-amber-800 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-500/40 dark:bg-amber-500/8" },
  bad:       { bar: "bg-rose-400",    badge: "text-rose-800 border-rose-300 bg-rose-50 dark:text-rose-400 dark:border-rose-500/40 dark:bg-rose-500/8" },
};

const PLANET_SYMBOLS: Record<string, string> = {
  สุริยะ: "☉", ระวิ:  "☉", จันเทา: "☽", คะศิ:  "☽",
  ภุมมะ:  "♂", ภุมโม: "♂", พุทธะ:  "☿", พุทโธ: "☿",
  ครู:    "♃", ชีโว:  "♃", ศุกระ:  "♀", ศุโกร: "♀",
  เสารี:  "♄", โสโร:  "♄",
};

// Live Clock Component
function LiveClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  const p = (n: number) => String(n).padStart(2, "0");
  return <span className="font-mono tabular-nums">{p(t.getHours())}:{p(t.getMinutes())}:{p(t.getSeconds())}</span>;
}

// ─── Main Page Component ───────────────────────────────────────────────────────
export default function DashboardIndex() {
  const d = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();
  const { t, i18n } = useTranslation(["common", "yam", "horoscope"]);
  const { profile, loginReward, identity, dailyPlan, dailyAdvice, yam, moon, karnchata, rahu, pendingCount, todaySlots } = d;

  const displayName = profile?.display_name ?? "คุณ";
  const isPro       = profile?.role === "admin" || profile?.role === "operator" || profile?.plan === "imperial";
  const hasBirth    = !!(profile?.birth_date);

  const [greeting, setGreeting] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  
  // Interactive Timeline state
  const [timelinePeriod, setTimelinePeriod] = useState<"day" | "night">("day");
  const [selectedTimelineSlot, setSelectedTimelineSlot] = useState<typeof todaySlots[number] | null>(null);

  // Daily Card Pull Widget state
  const [cardPullLoading, setCardPullLoading] = useState(false);
  const [localCard, setLocalCard] = useState<any>(null);
  const [localReading, setLocalReading] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Sync timeline states on client mount / time update
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(
      h < 5 ? t("greeting.night", "ราตรีสวัสดิ์") : 
      h < 12 ? t("greeting.morning", "อรุณสวัสดิ์") : 
      h < 17 ? t("greeting.afternoon", "สวัสดีตอนบ่าย") : 
      t("greeting.evening", "สวัสดีตอนเย็น")
    );
    
    const currentLocale = i18n.language === "zh" ? "zh-CN" : i18n.language === "en" ? "en-US" : "th-TH";
    setDateLabel(new Date().toLocaleDateString(currentLocale, { weekday: "long", day: "numeric", month: "long" }));
    
    // Auto-select current slot in timeline
    const active = todaySlots.find(s => {
      const start = new Date(s.startTimeISO).getTime();
      const end = new Date(s.endTimeISO).getTime();
      const t = Date.now();
      return t >= start && t < end;
    });

    if (active) {
      setTimelinePeriod(active.period);
      setSelectedTimelineSlot(active);
    } else if (todaySlots.length > 0) {
      setSelectedTimelineSlot(todaySlots[0]);
    }

    // เปิดรางวัลล็อกอินรายวัน
    if (loginReward && loginReward.success && loginReward.earned > 0) {
      setShowLoginModal(true);
    }
  }, [todaySlots, loginReward, i18n.language, t]);

  // Periodic page revalidation
  useEffect(() => { const id = setInterval(revalidate, 60_000); return () => clearInterval(id); }, [revalidate]);

  // Find active slot for live countdown
  const activeSlot = todaySlots.find(s => {
    const start = new Date(s.startTimeISO).getTime();
    const end = new Date(s.endTimeISO).getTime();
    const t = Date.now();
    return t >= start && t < end;
  });

  // Countdown timer string state
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!activeSlot) return;
    const updateCountdown = () => {
      const end = new Date(activeSlot.endTimeISO).getTime();
      const diff = end - Date.now();
      if (diff <= 0) {
        setTimeLeft(t("dashboard_index.yam_change", "เปลี่ยนยามแล้ว"));
        return;
      }
      const min = Math.floor(diff / 60_000);
      const sec = Math.floor((diff % 60_000) / 1000);
      setTimeLeft(t("dashboard_index.yam_remain", { min, sec, defaultValue: `ยามนี้เหลืออีก ${min} นาที ${sec} วินาที` }));
    };
    updateCountdown();
    const id = setInterval(updateCountdown, 1000);
    return () => clearInterval(id);
  }, [activeSlot, t]);

  // Handle Tarot Card Pull
  const handleCardPull = async () => {
    setCardPullLoading(true);
    try {
      const res = await fetch("/api/daily-card", { method: "POST" });
      const data = (await res.json()) as any;
      if (data.success) {
        setLocalCard(data.card);
        setLocalReading(data.reading);
        revalidate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCardPullLoading(false);
    }
  };

  const currentCard = localCard || (dailyPlan && dailyPlan.daily_card !== null ? {
    thaiName: dailyPlan.daily_card_reading?.split(": ")[0]?.replace("คำแนะนำสำหรับวันนี้ ", "") || "ไพ่ทาโรต์",
    meaning: dailyPlan.daily_card_reading || ""
  } : null);

  const ls = LEVEL_STYLE[yam.level] ?? LEVEL_STYLE.good;

  // Translation helpers
  const translatedYamName = t("yam:yam_names." + yam.name, { defaultValue: yam.name });

  return (
    <div className="max-w-xl mx-auto space-y-7 pb-12 star-field constellation-bg px-1.5 sm:px-0">
      
      {/* ── 1. Header ── */}
      <div className="flex items-start justify-between pt-2 gap-3 animate-fade-up">
        <div>
          <p className="text-[#C6B79F] text-sm sm:text-base font-bold tracking-wide">{greeting} · {dateLabel}</p>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold mt-1 text-[#F8F6F1]">
            {t("greeting.hello", "สวัสดี")}, <span className="text-[#C6A96B] glow-gold font-black">{displayName}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1 px-3.5 py-2 rounded-full border text-xs sm:text-sm font-extrabold bg-[#0A1628]/50 border-[#C6A96B]/45 text-[#C6A96B] shadow-[0_0_15px_rgba(232,196,106,0.15)]">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
          <LiveClock />
        </div>
      </div>

      {/* ── 2. Layer 1: Identity Card (รหัสชีวิตของฉัน) ── */}
      {identity && (
        <div className="card-glass p-6 border-2 border-slate-200 dark:border-[#C6A96B]/25 bg-gradient-to-br from-white via-[#F5F0ED] to-white dark:from-[#0c2240] dark:to-[#020617] relative overflow-hidden shadow-2xl rounded-[2rem] animate-fade-up">
          {/* Background elements */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-radial from-[#C6A96B]/15 to-transparent blur-xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-radial from-[#4B6FAE]/15 to-transparent blur-xl pointer-events-none" />
          
          <div className="relative space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-[#C6A96B]/15 pb-3">
              <span className="text-[10px] sm:text-xs font-black text-[#A68444] dark:text-[#C6A96B] tracking-[0.22em] uppercase flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 animate-spin-slow" /> {t("dashboard_index.identity_title", "IDENTITY OS Blueprint")}
              </span>
              <span className="text-xs font-black text-slate-500 dark:text-[#94A3B8] px-2 py-0.5 rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 uppercase">
                {t("horoscope:houses." + identity.element, identity.element)}{t("dashboard_index.birth_element", "ธาตุเกิด")}
              </span>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl border-2 border-[#A68444]/45 dark:border-[#C6A96B]/45 bg-slate-50 dark:bg-[#0a2240] flex flex-col items-center justify-center shrink-0 shadow-lg shadow-[#C6A96B]/10">
                <span className="text-2xl text-[#A68444] dark:text-[#C6A96B]">{identity.guardianSymbol}</span>
                <span className="text-[9px] font-black text-[#A68444] dark:text-[#C6A96B] tracking-widest leading-none mt-0.5">STAR {identity.starNumber}</span>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-slate-500 dark:text-[#C6B79F] font-black tracking-widest uppercase">{t("dashboard_index.life_archetype", "บุคลิกลักษณะชีวิต")}</p>
                <h3 className="font-display font-black text-lg text-slate-900 dark:text-[#F8F6F1] flex items-center gap-2">
                  {identity.archetypeTitle}
                  <span className="text-xs text-[#A68444] dark:text-[#C6A96B] font-mono">({identity.archetypeLabel})</span>
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-[#D9CDB7] leading-relaxed font-sans-thai font-medium">
              {identity.description}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] sm:text-xs border-t border-slate-200 dark:border-white/5">
              <div className="space-y-1">
                <p className="text-[#A68444] dark:text-[#C6A96B] font-black uppercase tracking-wider flex items-center gap-1">
                  {t("dashboard_index.guardian_spirit", "🛡️ จิตเทพผู้พิทักษ์")}
                </p>
                <p className="text-slate-900 dark:text-[#F8F6F1] font-bold">{identity.guardianName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sky-700 dark:text-sky-300 font-black uppercase tracking-wider flex items-center gap-1">
                  {t("dashboard_index.strength", "🌟 จุดเด่นประจำตัว")}
                </p>
                <p className="text-slate-900 dark:text-[#F8F6F1] font-bold line-clamp-1">{identity.strengths[0]}, {identity.strengths[1]}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Daily Tarot Card Pull Widget ── */}
      <div className="card-glass p-6 border border-[#C6A96B]/20 dark:bg-[#0A1628]/70 rounded-[2rem] space-y-4 animate-fade-up relative overflow-hidden">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/5 pb-3">
          <span className="text-[10px] sm:text-xs font-black text-[#A68444] dark:text-gold-300 tracking-[0.2em] uppercase flex items-center gap-1.5">
            {t("dashboard_index.tarot_title", "🔮 DAILY RITUAL CHECK-IN")}
          </span>
          <span className="text-[10px] text-emerald-700 border border-emerald-500/35 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-950/20 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
            {t("dashboard_index.tarot_reward", "+1 Sands of Time Reward")}
          </span>
        </div>

        {currentCard ? (
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 animate-fade-up">
            {/* Tarot Card Display */}
            <div className="w-24 h-40 shrink-0 rounded-2xl border-2 border-[#A68444] dark:border-[#C6A96B] bg-gradient-to-b from-white via-[#F5F0ED] to-white dark:from-[#0c2240] dark:to-[#020617] flex flex-col items-center justify-center p-2 text-center shadow-lg relative overflow-hidden shadow-[#C6A96B]/10">
              <div className="absolute inset-0.5 border border-slate-200 dark:border-white/5 rounded-xl flex flex-col items-center justify-between p-2">
                <span className="text-xs text-[#A68444] dark:text-[#C6A96B] font-bold">✦ PHOPEPHUM ✦</span>
                <span className="text-3xl text-gold-liquid">✨</span>
                <span className="text-[10px] font-black text-slate-900 dark:text-[#F8F6F1] line-clamp-2 uppercase leading-snug">
                  {currentCard.name || currentCard.thaiName.split(" ")[0]}
                </span>
              </div>
            </div>
            {/* Tarot Reading text */}
            <div className="flex-1 space-y-2">
              <h4 className="font-display font-black text-base text-[#A68444] dark:text-gold-liquid">
                {t("dashboard_index.tarot_result", "คุณเปิดได้: ")}{currentCard.thaiName || currentCard.name}
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-[#D9CDB7] leading-relaxed">
                {currentCard.meaning || currentCard.description}
              </p>
              {currentCard.advice && (
                <p className="text-[13px] text-emerald-700 dark:text-emerald-300 font-bold leading-normal">
                  {t("dashboard_index.tarot_advice", "💡 คำแนะนำสัจจะ: ")}{currentCard.advice}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
            <div className="w-24 h-40 rounded-2xl border-2 border-dashed border-[#C6A96B]/30 hover:border-[#C6A96B]/70 bg-[#020617]/50 flex items-center justify-center cursor-pointer transition-all duration-300 transform hover:scale-105 shadow-inner" onClick={handleCardPull}>
              <span className="text-3xl animate-pulse text-[#C6A96B]/50">🔮</span>
            </div>
            <div>
              <p className="text-[#F8F6F1] font-bold text-sm">{t("dashboard_index.tarot_pull_card", "จับไพ่ประจำวันเพื่อหยั่งรู้วงโคจรชีวิต")}</p>
              <p className="text-xs text-[#C6B79F] mt-1">{t("dashboard_index.tarot_pull_desc", "พร้อมรับสิทธิ์เคลมภารกิจประจำวัน +1 ทรายกาลเวลา")}</p>
            </div>
            <button
              type="button"
              disabled={cardPullLoading}
              onClick={handleCardPull}
              className="px-6 py-2.5 rounded-xl text-xs font-black text-cosmic-950 bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] transition-all hover:scale-105 active:scale-95 shadow-md shadow-[#C6A96B]/15"
            >
              {cardPullLoading ? t("dashboard_index.tarot_shuffling", "กำลังสับไพ่โชคชะตา...") : t("dashboard_index.tarot_pull_btn", "✦ ดึงพลังงานวิถีชะตา (จับไพ่)")}
            </button>
          </div>
        )}
      </div>

      {/* ── 4. Layer 3: Daily Advisor Guidelines (Work, Money, Love, Health) ── */}
      {dailyAdvice && (
        <div className="space-y-4 animate-fade-up">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#A68444] dark:text-gold-300">
            {t("dashboard_index.advice_title", "✦ คำแนะนำการจัดสรรสิริมงคลวันนี้")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            
            {/* Work */}
            <div className="card-glass p-4 border border-slate-200 dark:border-white/5 dark:bg-[#0A1628]/40 flex flex-col justify-between min-h-[120px]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-500 dark:text-[#C6B79F] font-black uppercase tracking-wider flex items-center gap-1">
                  {t("dashboard_index.advice_work", "💼 การงาน")}
                </span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${
                  dailyAdvice.work.status === "excellent" ? "text-emerald-700 border-emerald-500/30 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/5" :
                  dailyAdvice.work.status === "warning" ? "text-rose-700 border-rose-500/30 bg-rose-50 dark:text-rose-400 dark:border-rose-500/20 dark:bg-rose-500/5" :
                  "text-sky-700 border-sky-500/30 bg-sky-50 dark:text-sky-300 dark:border-sky-500/20 dark:bg-sky-500/5"
                }`}>{dailyAdvice.work.status}</span>
              </div>
              <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-[#F8F6F1] leading-tight line-clamp-1">{dailyAdvice.work.title}</p>
              <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] leading-snug mt-1.5 line-clamp-3">{dailyAdvice.work.description}</p>
            </div>

            {/* Wealth */}
            <div className="card-glass p-4 border border-slate-200 dark:border-white/5 dark:bg-[#0A1628]/40 flex flex-col justify-between min-h-[120px]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-500 dark:text-[#C6B79F] font-black uppercase tracking-wider flex items-center gap-1">
                  {t("dashboard_index.advice_wealth", "💰 การเงิน")}
                </span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${
                  dailyAdvice.wealth.status === "excellent" ? "text-emerald-700 border-emerald-500/30 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/5" :
                  dailyAdvice.wealth.status === "warning" ? "text-rose-700 border-rose-500/30 bg-rose-50 dark:text-rose-400 dark:border-rose-500/20 dark:bg-rose-500/5" :
                  "text-sky-700 border-sky-500/30 bg-sky-50 dark:text-sky-300 dark:border-sky-500/20 dark:bg-sky-500/5"
                }`}>{dailyAdvice.wealth.status}</span>
              </div>
              <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-[#F8F6F1] leading-tight line-clamp-1">{dailyAdvice.wealth.title}</p>
              <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] leading-snug mt-1.5 line-clamp-3">{dailyAdvice.wealth.description}</p>
            </div>

            {/* Love */}
            <div className="card-glass p-4 border border-slate-200 dark:border-white/5 dark:bg-[#0A1628]/40 flex flex-col justify-between min-h-[120px]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-500 dark:text-[#C6B79F] font-black uppercase tracking-wider flex items-center gap-1">
                  {t("dashboard_index.advice_love", "💖 ความรัก")}
                </span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${
                  dailyAdvice.love.status === "excellent" ? "text-emerald-700 border-emerald-500/30 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/5" :
                  dailyAdvice.love.status === "warning" ? "text-rose-700 border-rose-500/30 bg-rose-50 dark:text-rose-400 dark:border-rose-500/20 dark:bg-rose-500/5" :
                  "text-sky-700 border-sky-500/30 bg-sky-50 dark:text-sky-300 dark:border-sky-500/20 dark:bg-sky-500/5"
                }`}>{dailyAdvice.love.status}</span>
              </div>
              <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-[#F8F6F1] leading-tight line-clamp-1">{dailyAdvice.love.title}</p>
              <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] leading-snug mt-1.5 line-clamp-3">{dailyAdvice.love.description}</p>
            </div>

            {/* Health */}
            <div className="card-glass p-4 border border-slate-200 dark:border-white/5 dark:bg-[#0A1628]/40 flex flex-col justify-between min-h-[120px]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-500 dark:text-[#C6B79F] font-black uppercase tracking-wider flex items-center gap-1">
                  {t("dashboard_index.advice_health", "🌿 สุขภาพ")}
                </span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${
                  dailyAdvice.health.status === "excellent" ? "text-emerald-700 border-emerald-500/30 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/5" :
                  dailyAdvice.health.status === "warning" ? "text-rose-700 border-rose-500/30 bg-rose-50 dark:text-rose-400 dark:border-rose-500/20 dark:bg-rose-500/5" :
                  "text-sky-700 border-sky-500/30 bg-sky-50 dark:text-sky-300 dark:border-sky-500/20 dark:bg-sky-500/5"
                }`}>{dailyAdvice.health.status}</span>
              </div>
              <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-[#F8F6F1] leading-tight line-clamp-1">{dailyAdvice.health.title}</p>
              <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] leading-snug mt-1.5 line-clamp-3">{dailyAdvice.health.description}</p>
            </div>

          </div>
        </div>
      )}

      {/* ── 5. Layer 7: Ecosystem Hub Navigation ── */}
      <div className="animate-fade-up">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#3D5361] dark:text-[#4B6FAE] mb-3">
          {t("dashboard_index.eco_hub", "✦ PHOPPHUM ECOSYSTEM HUB")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          
          <Link to="/dashboard/horoscope" className="card-glass p-3 text-center border border-slate-200 dark:border-white/5 dark:bg-[#0a2240]/45 hover:border-[#C6A96B]/30 hover:bg-slate-100 dark:hover:bg-[#0a2240]/70 transition-all flex flex-col items-center gap-1">
            <span className="text-lg">🧭</span>
            <span className="text-[10px] font-black text-slate-900 dark:text-[#F8F6F1] tracking-wider leading-none">
              {t("dashboard_index.eco_who", "WHO (ดวงวิถี)")}
            </span>
          </Link>

          <Link to="/dashboard/chat" className="card-glass p-3 text-center border border-slate-200 dark:border-white/5 dark:bg-[#0a2240]/45 hover:border-[#C6A96B]/30 hover:bg-slate-100 dark:hover:bg-[#0a2240]/70 transition-all flex flex-col items-center gap-1">
            <span className="text-lg">💬</span>
            <span className="text-[10px] font-black text-slate-900 dark:text-[#F8F6F1] tracking-wider leading-none">
              {t("dashboard_index.eco_what", "WHAT (ถาม AI)")}
            </span>
          </Link>

          <Link to="/dashboard/calendar" className="card-glass p-3 text-center border border-slate-200 dark:border-white/5 dark:bg-[#0a2240]/45 hover:border-[#C6A96B]/30 hover:bg-slate-100 dark:hover:bg-[#0a2240]/70 transition-all flex flex-col items-center gap-1">
            <span className="text-lg">📅</span>
            <span className="text-[10px] font-black text-slate-900 dark:text-[#F8F6F1] tracking-wider leading-none">
              {t("dashboard_index.eco_when", "WHEN (ฤกษ์มงคล)")}
            </span>
          </Link>

          <Link to="/dashboard/reports" className="card-glass p-3 text-center border border-slate-200 dark:border-white/5 dark:bg-[#0a2240]/45 hover:border-[#C6A96B]/30 hover:bg-slate-100 dark:hover:bg-[#0a2240]/70 transition-all flex flex-col items-center gap-1">
            <span className="text-lg">📄</span>
            <span className="text-[10px] font-black text-slate-900 dark:text-[#F8F6F1] tracking-wider leading-none">
              {t("dashboard_index.eco_how", "HOW (รายงานลึก)")}
            </span>
          </Link>

          <Link to="/dashboard/planner" className="card-glass p-3 text-center border border-slate-200 dark:border-white/5 dark:bg-[#0a2240]/45 hover:border-[#C6A96B]/30 hover:bg-slate-100 dark:hover:bg-[#0a2240]/70 transition-all flex flex-col items-center gap-1">
            <span className="text-lg">🎯</span>
            <span className="text-[10px] font-black text-slate-900 dark:text-[#F8F6F1] tracking-wider leading-none">
              {t("dashboard_index.eco_why", "WHY (บันทึกเป้าหมาย)")}
            </span>
          </Link>

          <Link to="/dashboard/chat" className="card-glass p-3 text-center border border-slate-200 dark:border-white/5 dark:bg-[#0a2240]/45 hover:border-[#C6A96B]/30 hover:bg-slate-100 dark:hover:bg-[#0a2240]/70 transition-all flex flex-col items-center gap-1">
            <span className="text-lg">📜</span>
            <span className="text-[10px] font-black text-slate-900 dark:text-[#F8F6F1] tracking-wider leading-none">
              {t("dashboard_index.eco_reflect", "REFLECT (คลังปัญญา)")}
            </span>
          </Link>

        </div>
      </div>

      {/* ── 6. Active Yam Hero Card ── */}
      <Link to="/dashboard/check-yam" className="block group animate-fade-up">
        <div className="card-glass p-6 relative overflow-hidden transition-all group-hover:border-gold-liquid group-hover:shadow-[0_0_30px_rgba(232,196,106,0.2)] active:scale-[0.99] duration-300 border-slate-200 dark:border-[#C6A96B]/30 bg-white/85 dark:bg-[#0a2240]/85 rounded-[2rem]">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none bg-radial from-gold-500/20 to-transparent blur-xl" />
          
          <div className="relative flex justify-between items-center gap-4">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-[#A68444] dark:text-gold-300 font-extrabold uppercase tracking-[0.22em] mb-2">
                {t("dashboard_index.yam_hero_title", "✦ ฤกษ์ยามขณะนี้")}
              </p>
              <div className="flex items-baseline gap-2.5">
                <h2 className="font-display text-4xl sm:text-5xl font-black text-slate-900 dark:text-text-primary leading-none text-shadow-gold">{translatedYamName}</h2>
                <span className="text-2xl sm:text-3xl text-[#A68444] dark:text-gold-300 font-display">{PLANET_SYMBOLS[yam.name] || "✦"}</span>
              </div>
              <p className="text-sm sm:text-base text-slate-900 dark:text-[#F8F6F1] mt-2 font-sans-thai font-bold tracking-wide">
                {t("yam.yam_number", { number: yam.number, defaultValue: `ยาม ${yam.number}` })} · {t("yam.period_" + yam.period, yam.period === "day" ? "กลางวัน" : "กลางคืน")}
                {moon.isWanPhra ? ` · 🔆 ${t("dashboard_index.yam_buddhist_day", "วันพระ")}` : ` · ${t("dashboard_index.yam_moon_pct", { pct: Math.round(moon.illumination), defaultValue: `จันทร์ ${Math.round(moon.illumination)}%` })}`}
              </p>
              {yam.shouldDo && (
                <div className="mt-4 border-l-4 border-amber-500 dark:border-yellow-400 pl-3.5 py-1.5 bg-amber-50 dark:bg-yellow-400/5 rounded-r-lg shadow-[inset_1px_0_0_rgba(250,204,21,0.1)]">
                  <p className="text-sm sm:text-base text-amber-800 dark:text-yellow-300 font-extrabold leading-relaxed dark:drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                    “{yam.shouldDo}”
                  </p>
                </div>
              )}
              {timeLeft && (
                <div className="text-xs sm:text-sm text-amber-800 dark:text-yellow-200 font-black mt-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                  <span>{timeLeft}</span>
                </div>
              )}
            </div>

            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-0 border-2 border-dashed border-gold-500/40 rounded-full cosmic-ring" />
              <div className="w-20 h-20 rounded-full card-glass-premium flex flex-col items-center justify-center border-2 border-slate-200 dark:border-[#C6A96B]/60 bg-slate-50 dark:bg-[#0a2240] glow-gold-box">
                <span className="text-[10px] sm:text-[11px] font-black text-[#A68444] dark:text-gold-300 uppercase tracking-widest leading-none">
                  {yam.level === "bad" ? t("dashboard_index.yam_warning", "ระวัง") : t("dashboard_index.yam_auspicious", "มงคล")}
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-text-primary mt-1.5">
                  {t("yam." + yam.level, yam.label.split(" ")[0])}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs sm:text-sm text-[#A68444] dark:text-gold-300 group-hover:text-gold-liquid transition-colors font-extrabold mt-5 pt-3.5 border-t border-slate-200 dark:border-border-gold/20">
            <span>{t("dashboard_index.yam_detailed_analysis", "เข้าสู่เครื่องมือวิเคราะห์ฤกษ์ยามละเอียด")}</span>
            <span>→</span>
          </div>
        </div>
      </Link>

      {/* ── 7. Cosmic Energy Timeline Widget ── */}
      <div className="space-y-4 animate-fade-up">
        <div className="flex items-center justify-between">
          <p className="text-xs sm:text-sm font-black uppercase tracking-[0.25em] text-[#A68444] dark:text-gold-300">
            {t("dashboard_index.yam_timeline", "✦ TIMELINE พลังงานรายวัน")}
          </p>
          
          <div className="flex p-0.5 rounded-lg bg-slate-100 dark:bg-cosmic-950/80 border border-slate-300 dark:border-border-gold/25">
            <button
              type="button"
              onClick={() => setTimelinePeriod("day")}
              className={`px-3.5 py-1 text-xs font-black rounded-md transition-all ${timelinePeriod === "day" ? "bg-gold-500 text-cosmic-950 dark:text-cosmic-950 shadow-sm" : "text-slate-600 dark:text-text-secondary hover:text-slate-900 dark:hover:text-text-primary"}`}
            >
              {t("dashboard_index.yam_daytime", "☀️ กลางวัน")}
            </button>
            <button
              type="button"
              onClick={() => setTimelinePeriod("night")}
              className={`px-3.5 py-1 text-xs font-black rounded-md transition-all ${timelinePeriod === "night" ? "bg-gold-500 text-cosmic-950 dark:text-cosmic-950 shadow-sm" : "text-slate-600 dark:text-text-secondary hover:text-slate-900 dark:hover:text-text-primary"}`}
            >
              {t("dashboard_index.yam_nighttime", "🌙 กลางคืน")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {todaySlots.filter(s => s.period === timelinePeriod).map(s => {
            const isActive = activeSlot?.period === s.period && activeSlot?.yamNumber === s.yamNumber;
            const isSelected = selectedTimelineSlot?.period === s.period && selectedTimelineSlot?.yamNumber === s.yamNumber;
            const ls = LEVEL_STYLE[s.level] ?? LEVEL_STYLE.good;
            const planetSym = PLANET_SYMBOLS[s.yamName] || "✦";
            const translatedSlotYamName = t("yam:yam_names." + s.yamName, { defaultValue: s.yamName });

            return (
              <button
                key={`${s.period}-${s.yamNumber}`}
                onClick={() => setSelectedTimelineSlot(s)}
                className={`w-full p-3 rounded-xl border text-left transition-all duration-300 relative overflow-hidden group select-none flex flex-col justify-between min-h-[100px] sm:min-h-[110px]
                  ${isActive ? "card-glass-gold border-gold-liquid/60 ring-2 ring-gold-liquid/20 shadow-md shadow-gold-500/10 dark:shadow-gold-500/20" : isSelected ? "card-glass border-mystic-500 dark:border-mystic-500 bg-slate-100 dark:bg-cosmic-800 shadow-md shadow-mystic-500/15" : "card-glass border-slate-200 dark:border-white/10 bg-white/60 dark:bg-[#0A1628]/60 hover:border-gold-500/40 dark:hover:bg-[#0A1628]/80 hover:bg-slate-100"}`}
              >
                {isActive && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse border border-cosmic-950" />
                )}
                <div className="flex justify-between items-center mb-1 w-full">
                  <span className="text-xs text-slate-600 dark:text-text-secondary font-bold">
                    {t("yam.yam_number", { number: s.yamNumber, defaultValue: `ยาม ${s.yamNumber}` })}
                  </span>
                  <span className={`text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded border ${ls.badge.replace("px-2.5 py-0.5", "")}`}>
                    {t("yam." + s.level, s.label.split(" ")[0])}
                  </span>
                </div>
                <p className="font-display text-base sm:text-lg font-extrabold text-slate-900 dark:text-text-primary flex items-baseline gap-1 mt-1">
                  {translatedSlotYamName} <span className="text-xs sm:text-sm text-[#A68444] dark:text-gold-400 font-display">{planetSym}</span>
                </p>
                <p className="text-xs text-slate-600 dark:text-text-secondary mt-1.5 font-mono font-bold tracking-tighter">{s.timeLabel.replace(" - ", "-")}</p>
              </button>
            );
          })}
        </div>

        {selectedTimelineSlot && (
          <div className="card-glass p-5 border-2 border-[#C6A96B]/30 dark:border-border-gold/30 bg-white/95 dark:bg-[#0A1628]/95 animate-fade-up relative overflow-hidden rounded-2xl">
            <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full pointer-events-none bg-radial from-mystic-500/15 to-transparent blur-lg" />
            <div className="relative">
              <div className="flex justify-between items-start mb-3 gap-2">
                <div>
                  <h4 className="font-display font-black text-[#A68444] dark:text-gold-300 text-base sm:text-lg flex items-center gap-2">
                    <span>{t("nav.quick_menu") === "เมนูด่วน" ? `✦ ยาม${selectedTimelineSlot.yamName}` : `✦ Yam ${t("yam:yam_names." + selectedTimelineSlot.yamName, selectedTimelineSlot.yamName)}`}</span>
                    <span className="text-sm font-mono font-bold text-slate-600 dark:text-[#C6B79F]">({selectedTimelineSlot.timeLabel})</span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-[#C6B79F] mt-1 font-bold">
                    {t("yam.yam_order", { order: selectedTimelineSlot.yamNumber, defaultValue: `ยามลำดับที่ ${selectedTimelineSlot.yamNumber}` })} · {t("yam.period_" + selectedTimelineSlot.period, selectedTimelineSlot.period === "day" ? "กลางวัน" : "กลางคืน")}
                  </p>
                </div>
                <span className={`text-xs font-black px-3 py-1 rounded-full border shrink-0 ${LEVEL_STYLE[selectedTimelineSlot.level].badge}`}>
                  {t("yam." + selectedTimelineSlot.level, selectedTimelineSlot.label)}
                </span>
              </div>
              
              <p className="text-base sm:text-lg text-slate-900 dark:text-yellow-100 font-bold leading-relaxed mb-4 dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                {selectedTimelineSlot.description || "สัญจรนำโชคดีงามตามกาลเทวฤกษ์"}
              </p>

              {selectedTimelineSlot.prediction?.shouldDo && (
                <div className="text-xs sm:text-sm bg-emerald-50 dark:bg-emerald-500/8 border border-emerald-300 dark:border-emerald-500/25 rounded-lg p-3.5 flex items-start gap-2 text-emerald-800 dark:text-emerald-200 font-extrabold shadow-sm">
                  <span className="font-black shrink-0 text-emerald-700 dark:text-emerald-400">{t("action.should_do", "✓ ควรทำ:")}</span>
                  <span className="leading-relaxed">{selectedTimelineSlot.prediction.shouldDo}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 8. Day/Night Astrologer Tools row ── */}
      <div className="grid grid-cols-2 gap-3.5 animate-fade-up">
        <Link to="/dashboard/planner" className="group flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-[#0A1628]/40 hover:border-[#8B7FD4]/45 dark:hover:bg-cosmic-800/70 hover:bg-slate-100 transition-all shadow-md">
          <span className="text-[#8B7FD4]"><Target className="w-5 h-5" /></span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-[#F8F6F1]">{t("dashboard_index.tqm_title", "เป้าหมาย TQM")}</p>
            <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">{t("dashboard_index.tqm_desc", "วางแผน + สะท้อนคิด")}</p>
          </div>
        </Link>
        <Link to="/dashboard/community" className="group flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-[#0A1628]/40 hover:border-amber-400/40 dark:hover:bg-cosmic-800/70 hover:bg-slate-100 transition-all shadow-md">
          <span className="text-amber-400"><Award className="w-5 h-5" /></span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-[#F8F6F1]">{t("dashboard_index.community_rank_title", "คอมมูนิตี้ Rank")}</p>
            <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">{t("dashboard_index.community_rank_desc", "ชวนเพื่อน & ค่าคอม")}</p>
          </div>
        </Link>
      </div>

      {/* ── 9. Welcome Login Reward Modal ── */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/90 dark:bg-[#020617]/95 backdrop-blur-md animate-fade-up">
          <div className="relative w-full max-w-sm bg-gradient-to-br from-white to-[#F5F0ED] dark:from-[#0a2240] dark:to-[#020617] rounded-[2.5rem] border border-slate-200 dark:border-[#C6A96B]/30 p-8 text-center shadow-2xl overflow-hidden">
            <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full pointer-events-none bg-radial from-gold-500/10 to-transparent blur-xl" />
            
            <div className="relative space-y-5">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-slate-200 dark:border-[#C6A96B]/25 bg-slate-50 dark:bg-[#C6A96B]/5 text-3xl animate-bounce">
                ⏳
              </div>
 
              <div>
                <h3 className="font-display text-2xl font-black text-slate-900 dark:text-[#F8F6F1] tracking-wide glow-gold">
                  {t("dashboard_index.login_reward_title", "🎁 รางวัลล็อกอินรายวัน")}
                </h3>
                <p className="text-slate-600 dark:text-[#D9CDB7] text-xs mt-1.5 font-sans-thai leading-relaxed">
                  {t("dashboard_index.login_reward_desc", "ยินดีต้อนรับกลับมาเชื่อมต่อชะตาชีวิตในวันนี้! คุณได้รับทรายกาลเวลาสำหรับสร้างแผนชะตาฟ้า")}
                </p>
              </div>
 
              <div className="card-glass py-4 px-6 border border-emerald-300 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-950/15 inline-block">
                <span className="text-emerald-800 dark:text-emerald-400 font-display text-3xl font-black block">+1</span>
                <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold uppercase tracking-[0.25em] mt-1 block">✦ SANDS OF TIME / KC</span>
              </div>
 
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="w-full py-3 rounded-xl text-xs font-black text-slate-950 dark:text-[#020617] bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] transition-all hover:scale-105 active:scale-95 shadow-md shadow-[#C6A96B]/20"
                >
                  {t("dashboard_index.login_reward_claim", "รับสิทธิ์และเข้าสู่ระบบ")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
