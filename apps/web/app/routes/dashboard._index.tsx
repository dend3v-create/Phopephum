import { json } from "@remix-run/cloudflare";
import { useLoaderData, Link, useRevalidator } from "@remix-run/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import {
  getCurrentYam,
  getYamPrediction,
  calculateMoonPhase,
  calculatePhopephum,
  getAstrologicalDateStr,
  getAstrologicalThaiFormattedDate,
  getSunTimes,
  getChanChaiItem,
  yamMeaning,
  type ChanChaiPhase,
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
import { resolveActiveSubject } from "~/services/activeSubject.server";

export const meta: MetaFunction = () => [
  { title: "กาลชะตารายชั่วโมง — PhopePhum" },
  {
    name: "description",
    content: "สรุปจังหวะพลังงานกาลชะตารายชั่วโมง ฤกษ์สดขณะนี้ และไทม์ไลน์ 8 ยามอัฏฐกาลเฉพาะตนที่ PhopePhum",
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

export interface HourlyYamSlot {
  yamNumber: number;
  yamName: string;
  period: "day" | "night";
  timeLabel: string;
  startTimeISO: string;
  endTimeISO: string;
  ticks: number;
  level: "bad" | "good" | "very_good" | "excellent";
  label: string;
  score: number;
  planetSymbol: string;
  planetColor: string;
  planetNameThai: string;
  prophecy: string;
  shouldDo: string;
  shouldNotDo: string;
  auspicious: string;
  isCurrent: boolean;
}

const PHASE_LABELS: Record<string, string> = {
  start: "ยามต้น (ช่วง 30 นาทีแรก)",
  middle: "ยามกลาง (ช่วง 30 นาทีกลาง)",
  end: "ยามปลาย (ช่วง 30 นาทีท้าย)",
};

// ─── Helper: คำนวณตาราง 8 ยามรายชั่วโมงตลอดวัน ────────────────────────────────
function calculateDailyYamSlots(targetDate: Date): {
  daySlots: HourlyYamSlot[];
  nightSlots: HourlyYamSlot[];
  currentSlotIndex: number;
  isDayNow: boolean;
} {
  const sunTimes = getSunTimes(targetDate);
  const sunrise = sunTimes.sunrise;
  const sunset = sunTimes.sunset;

  const dayMs = sunset.getTime() - sunrise.getTime();
  const nightMs = 86400000 - dayMs;

  const daySlotMs = dayMs / 8;
  const nightSlotMs = nightMs / 8;
  const nowMs = targetDate.getTime();
  const isDayNow = nowMs >= sunrise.getTime() && nowMs < sunset.getTime();

  const daySlots: HourlyYamSlot[] = [];
  let currentSlotIndex = 0;

  for (let i = 0; i < 8; i++) {
    const startTime = new Date(sunrise.getTime() + i * daySlotMs);
    const endTime = new Date(sunrise.getTime() + (i + 1) * daySlotMs);
    const midTime = new Date(startTime.getTime() + daySlotMs / 2);
    const result = getYamPrediction(midTime);
    const chanChai = getChanChaiItem(result.yamName);
    const meaning = yamMeaning[result.yamName];
    const isCurrent = isDayNow && nowMs >= startTime.getTime() && nowMs < endTime.getTime();
    if (isCurrent) currentSlotIndex = i;

    const score = result.travelAuspiciousness.ticks === 3 ? 95 : result.travelAuspiciousness.ticks === 2 ? 85 : result.travelAuspiciousness.ticks === 1 ? 70 : 45;

    daySlots.push({
      yamNumber: i + 1,
      yamName: result.yamName,
      period: "day",
      timeLabel: `${startTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`,
      startTimeISO: startTime.toISOString(),
      endTimeISO: endTime.toISOString(),
      ticks: result.travelAuspiciousness.ticks,
      level: result.travelAuspiciousness.level,
      label: result.travelAuspiciousness.label,
      score,
      planetSymbol: chanChai?.planetSymbol || "★",
      planetColor: chanChai?.planetColor || "#C6A96B",
      planetNameThai: chanChai?.planetNameThai || result.yamName,
      prophecy: chanChai?.chanChai?.middle?.text || result.travelAuspiciousness.description,
      shouldDo: meaning?.shouldDo || "ดำเนินงานตามแผน",
      shouldNotDo: meaning?.shouldNotDo || "หลีกเลี่ยงความประมาท",
      auspicious: meaning?.auspicious || "ความราบรื่น",
      isCurrent,
    });
  }

  const nightSlots: HourlyYamSlot[] = [];
  for (let i = 0; i < 8; i++) {
    const startTime = new Date(sunset.getTime() + i * nightSlotMs);
    const endTime = new Date(sunset.getTime() + (i + 1) * nightSlotMs);
    const midTime = new Date(startTime.getTime() + nightSlotMs / 2);
    const result = getYamPrediction(midTime);
    const chanChai = getChanChaiItem(result.yamName);
    const meaning = yamMeaning[result.yamName];
    const isCurrent = !isDayNow && nowMs >= startTime.getTime() && nowMs < endTime.getTime();
    if (isCurrent) currentSlotIndex = i;

    const score = result.travelAuspiciousness.ticks === 3 ? 95 : result.travelAuspiciousness.ticks === 2 ? 85 : result.travelAuspiciousness.ticks === 1 ? 70 : 45;

    nightSlots.push({
      yamNumber: i + 1,
      yamName: result.yamName,
      period: "night",
      timeLabel: `${startTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`,
      startTimeISO: startTime.toISOString(),
      endTimeISO: endTime.toISOString(),
      ticks: result.travelAuspiciousness.ticks,
      level: result.travelAuspiciousness.level,
      label: result.travelAuspiciousness.label,
      score,
      planetSymbol: chanChai?.planetSymbol || "★",
      planetColor: chanChai?.planetColor || "#C6A96B",
      planetNameThai: chanChai?.planetNameThai || result.yamName,
      prophecy: chanChai?.chanChai?.middle?.text || result.travelAuspiciousness.description,
      shouldDo: meaning?.shouldDo || "ดำเนินงานตามแผน",
      shouldNotDo: meaning?.shouldNotDo || "หลีกเลี่ยงความประมาท",
      auspicious: meaning?.auspicious || "ความสงบและสติ",
      isCurrent,
    });
  }

  return { daySlots, nightSlots, currentSlotIndex, isDayNow };
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

  // ── ดึงข้อมูลเจ้าชะตาที่กำลัง Active ──
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

  // ── 1. Live Yam & Moon & Chan Chai Details ──
  const yam = getCurrentYam();
  const moon = calculateMoonPhase();
  const liveChanChaiItem = getChanChaiItem(yam.yamName);
  const phaseKey = (yam.phase as ChanChaiPhase) || "middle";
  const liveChanChaiSub = liveChanChaiItem?.chanChai?.[phaseKey];
  const liveMeaning = yamMeaning[yam.yamName];

  // คำนวณตาราง 8 ยามรายชั่วโมงวันนี้
  const dailySlots = calculateDailyYamSlots(now);

  // หายามทองคำถัดไปของวัน (Upcoming Golden Window)
  const activeCycleSlots = dailySlots.isDayNow ? dailySlots.daySlots : dailySlots.nightSlots;
  const upcomingSlots = activeCycleSlots.filter((_, idx) => idx > dailySlots.currentSlotIndex);
  const nextGoldenSlot = upcomingSlots.find(s => s.ticks >= 2) || activeCycleSlots.find(s => s.ticks === 3) || null;

  // ── 2. Active Subject Context ──
  const subjectContext = activeSubject.birthDate
    ? {
        birthDate: activeSubject.birthDate,
        birthTime: activeSubject.birthTime,
        birthPlace: activeSubject.birthPlace,
        displayName: activeSubject.name,
      }
    : null;

  // ── 3. Calendar Intelligence ──
  const dayIntelligence: CalendarDayIntelligence =
    await calculateDayIntelligence(bkkDateStr, subjectContext);

  // ── 4. Personal Wisdom Intelligence ──
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

  // ── 6. Daily Advice & Hourly Advice ──
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

  const { doList: dailyDoList, avoidList: dailyAvoidList } = getDoAvoidLists(dailyAdvice, locale);

  // คำนวณ Do & Avoid ประจำยาม/ชั่วโมงนี้
  const hourlyDoItems: string[] = [];
  if (liveMeaning?.shouldDo) {
    liveMeaning.shouldDo.split(/[,、]/).forEach((s) => hourlyDoItems.push(s.trim()));
  }
  if (liveMeaning?.howTo) {
    hourlyDoItems.push(`แนวทาง: ${liveMeaning.howTo}`);
  }

  const hourlyAvoidItems: string[] = [];
  if (liveMeaning?.shouldNotDo) {
    liveMeaning.shouldNotDo.split(/[,、]/).forEach((s) => hourlyAvoidItems.push(s.trim()));
  }

  const doList = hourlyDoItems.length > 0 ? hourlyDoItems : dailyDoList;
  const avoidList = hourlyAvoidItems.length > 0 ? hourlyAvoidItems : dailyAvoidList;

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
      phase: yam.phase,
      yamNumber: yam.yamNumber,
      level: yam.travelAuspiciousness.level,
      label: yam.travelAuspiciousness.label,
      ticks: yam.travelAuspiciousness.ticks,
      description: yam.travelAuspiciousness.description,
      shouldDo: yam.prediction?.shouldDo ?? "",
      planetSymbol: liveChanChaiItem?.planetSymbol || "★",
      planetColor: liveChanChaiItem?.planetColor || "#C6A96B",
      planetNameThai: liveChanChaiItem?.planetNameThai || yam.yamName,
      chanChaiText: liveChanChaiSub?.text || yam.travelAuspiciousness.description,
      chanChaiQuality: liveChanChaiSub?.quality || "good",
      news: liveMeaning?.news || "เชื่อถือได้ตามหลักเหตุผล",
      sickness: liveMeaning?.sickness || "ดูแลรักษาตามอาการ",
      lostItem: liveMeaning?.lostItem || "จะพบตามทิศและธาตุประจำดาว",
      howTo: liveMeaning?.howTo || "ดำเนินด้วยความมีสติและรอบคอบ",
      auspicious: liveMeaning?.auspicious || "ความราบรื่นและปัญญา",
    },
    dailySlots,
    nextGoldenSlot,
    moon: {
      phase: moon.moonPhase,
      illumination: moon.illumination,
      isWanPhra: moon.isWanPhra,
      guidance: moon.guidance,
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
    loginReward,
    pendingCount,
    bkkDateStr,
    thaiDateLabel: initialDateLabel,
    yam,
    dailySlots,
    nextGoldenSlot,
    moon,
    yamEndTimeISO,
    dayIntelligence,
    todayAppointments,
    doList,
    avoidList,
  } = d;

  const currentSubjectName = activeSubject?.name || profile?.display_name || t("auth.user", "คุณ");
  const locale = i18n.language;

  // ── State ──
  const [dateLabel, setDateLabel] = useState(initialDateLabel || "");
  const [greeting, setGreeting] = useState("");
  const [showReward, setShowReward] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [timelineTab, setTimelineTab] = useState<"day" | "night">(dailySlots.isDayNow ? "day" : "night");
  const [selectedSlot, setSelectedSlot] = useState<HourlyYamSlot | null>(null);

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
      const totalSec = Math.floor(diff / 1000);
      const hours = Math.floor(totalSec / 3600);
      const min = Math.floor((totalSec % 3600) / 60);
      const sec = totalSec % 60;
      if (hours > 0) {
        setTimeLeft(`${hours} ชม. ${min} น.`);
      } else {
        setTimeLeft(`${min}:${String(sec).padStart(2, "0")} นาที`);
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

  const yamScore = yam.ticks === 3 ? 95 : yam.ticks === 2 ? 85 : yam.ticks === 1 ? 70 : 45;
  const activeSlots = timelineTab === "day" ? dailySlots.daySlots : dailySlots.nightSlots;

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
            className="text-[11px] font-black uppercase tracking-[0.25em] text-[#C6A96B] min-h-[14px]"
            suppressHydrationWarning
          >
            {greeting}
          </p>
          <span className="text-[11px] font-semibold text-[#C6B79F] px-2.5 py-0.5 rounded-full border border-[#C6A96B]/30 bg-[#C6A96B]/10 backdrop-blur-sm">
            {dayIntelligence.lunarDayInfo.lunarDateStr}
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F8F6F1] leading-tight mt-1">
          วันนี้ของ <span className="text-[#C6A96B]">{currentSubjectName}</span>
        </h1>
        <p
          className="text-xs text-[#94A3B8] mt-1 tracking-wide min-h-[16px]"
          suppressHydrationWarning
        >
          {dateLabel}
        </p>
      </div>

      {/* ── ⚡ HERO CARD: สภาวะกาลชะตารายชั่วโมง (HOURLY KALA CHATA & LIVE YAM) ── */}
      <div className="rounded-3xl p-5 sm:p-6 border border-[#C6A96B]/40 overflow-hidden relative animate-fade-up bg-gradient-to-br from-[#0a2240]/95 via-[#0d1f38]/95 to-[#020617] backdrop-blur-xl shadow-2xl space-y-4">
        {/* Glow orb */}
        <div
          className="absolute -top-12 -right-12 w-52 h-52 rounded-full blur-3xl pointer-events-none opacity-30"
          style={{
            background: `radial-gradient(circle, ${yamLevelColor}60 0%, transparent 70%)`,
          }}
        />

        {/* Top Status Bar: Live pulse + Countdown + Score */}
        <div className="relative flex flex-wrap items-center justify-between gap-2.5 pb-1 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: yamLevelColor }}
              />
              <span
                className="relative inline-flex rounded-full h-2.5 w-2.5"
                style={{ backgroundColor: yamLevelColor }}
              />
            </span>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#C6A96B]">
              กาลชะตาชั่วโมงนี้ (LIVE YAM)
            </span>
            {timeLeft && (
              <span
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-[#F2D49B] border border-white/10"
                suppressHydrationWarning
              >
                เหลือ {timeLeft}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1.5 backdrop-blur-sm"
              style={{
                backgroundColor: `${yamLevelColor}20`,
                color: yamLevelColor,
                border: `1px solid ${yamLevelColor}50`,
              }}
            >
              <span>{yam.ticks === 3 ? "🌟" : yam.ticks === 2 ? "✨" : yam.ticks === 1 ? "✦" : "⚠️"}</span>
              <span>{yam.label}</span>
              <span className="font-bold font-mono ml-0.5">({yamScore}%)</span>
            </span>
          </div>
        </div>

        {/* Main Planet Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="w-8 h-8 rounded-xl flex items-center justify-center text-base font-bold shadow-md"
                style={{
                  backgroundColor: `${yam.planetColor}25`,
                  color: yam.planetColor,
                  border: `1px solid ${yam.planetColor}50`,
                }}
              >
                {yam.planetSymbol}
              </span>
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-black text-[#F8F6F1] flex items-center gap-2">
                  <span>ยาม{yam.name}</span>
                  <span className="text-sm font-normal text-[#C6B79F]">({yam.planetNameThai})</span>
                </h2>
              </div>
            </div>
            <p className="text-xs text-[#94A3B8] font-medium pl-10">
              {PHASE_LABELS[yam.phase] || "ช่วงเวลาปัจจุบัน"} • ยามที่ {yam.yamNumber} {yam.period === "day" ? "กลางวัน" : "กลางคืน"}
            </p>
          </div>

          <Link
            to="/dashboard/check-yam"
            className="self-start sm:self-center shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold text-[#020617] bg-gradient-to-r from-[#C6A96B] to-[#F2D49B] hover:scale-105 active:scale-95 transition-all shadow-md flex items-center gap-1"
          >
            <span>⚡ ถามฤกษ์ด่วน</span>
            <span>→</span>
          </Link>
        </div>

        {/* Living Prophecy Card: คำพยากรณ์อัฏฐกาลชั้นฉาย ณ เวลานี้ */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0A2240]/80 via-[#0E2C52]/70 to-[#0A2240]/80 border border-[#C6A96B]/35 space-y-3 relative z-10 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="text-base">📜</span>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#F2D49B]">
              คำพยากรณ์กาลชะตาชั้นฉาย ณ ขณะนี้
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#F8F6F1] leading-relaxed font-medium pl-1 border-l-2 border-[#C6A96B]/70">
            "{yam.chanChaiText || yam.description}"
          </p>

          {/* 3 Micro Insights: ข่าวสาร / วิธีการ / มงคลเด่น */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/5 space-y-0.5">
              <span className="text-[#C6B79F] font-bold block text-[10px]">📢 เรื่องที่ได้ยิน / ข่าวสาร</span>
              <p className="text-[#E2E8F0] line-clamp-2">{yam.news}</p>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/5 space-y-0.5">
              <span className="text-[#C6B79F] font-bold block text-[10px]">💼 แนวทางการทำงาน</span>
              <p className="text-[#E2E8F0] line-clamp-2">{yam.howTo}</p>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/5 space-y-0.5">
              <span className="text-[#C6B79F] font-bold block text-[10px]">🌟 มงคลเด่นชั่วโมงนี้</span>
              <p className="text-[#E2E8F0] line-clamp-2">{yam.auspicious}</p>
            </div>
          </div>

          {/* Next Golden Hour Notification */}
          {nextGoldenSlot && (
            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-[#CBD5E1]">
                <span className="text-amber-400">🎯</span>
                <span>
                  ยามทองคำถัดไป: <strong className="text-[#F2D49B]">{nextGoldenSlot.yamName}</strong> ({nextGoldenSlot.timeLabel}) — ฤกษ์สำเร็จ {nextGoldenSlot.score}%
                </span>
              </div>
              <Link
                to={`/dashboard/calendar?date=${bkkDateStr}&time=${nextGoldenSlot.timeLabel.split("-")[0]?.trim() || "12:00"}`}
                className="text-[11px] font-bold text-[#C6A96B] hover:text-[#F2D49B] hover:underline"
              >
                + วางแผนเวลานี้ →
              </Link>
            </div>
          )}
        </div>

        {/* Live Moon Status Bar */}
        <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-[#94A3B8]">
          <div className="flex items-center gap-1.5">
            <span>{moon.isWanPhra ? "🙏" : "🌙"}</span>
            <span>{moon.phase} (ความสว่าง {moon.illumination}%)</span>
            {moon.isWanPhra && (
              <span className="text-amber-400 font-bold ml-1 bg-amber-400/20 px-1.5 py-0.5 rounded border border-amber-400/30 text-[10px]">
                วันพระ
              </span>
            )}
          </div>
          <Link
            to="/dashboard/yam"
            className="text-[11px] text-[#C6A96B] hover:underline font-bold"
          >
            เปิดคัมภีร์ยาม ๒๔ ชั้นฉายฉบับเต็ม →
          </Link>
        </div>
      </div>

      {/* ── ⚖️ PILLAR 2: คำแนะนำเฉพาะชั่วโมงนี้ (HOURLY DO & AVOID) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fade-up">
        {/* Recommended Actions for this hour */}
        <div className="p-4 sm:p-5 rounded-3xl border border-emerald-500/30 bg-emerald-950/25 backdrop-blur-md shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-emerald-500/20 text-emerald-300 font-black text-sm">
                ✓
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">
                  เหมาะเร่งลงมือทำในชั่วโมงนี้
                </p>
                <p className="text-[10px] text-emerald-300/70">พลังหนุนเสริมยาม{yam.name}</p>
              </div>
            </div>
          </div>
          <ul className="space-y-2">
            {doList.slice(0, 3).map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-xs sm:text-sm font-medium text-[#E2E8F0] leading-snug"
              >
                <span className="text-emerald-400 mt-0.5 text-xs shrink-0">●</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Things to Avoid for this hour */}
        <div className="p-4 sm:p-5 rounded-3xl border border-rose-500/30 bg-rose-950/25 backdrop-blur-md shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-rose-500/20 text-rose-300 font-black text-sm">
                ✕
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">
                  ควรชะลอหรือเลี่ยงในชั่วโมงนี้
                </p>
                <p className="text-[10px] text-rose-300/70">ป้องกันอุปสรรคขัดขวาง</p>
              </div>
            </div>
          </div>
          <ul className="space-y-2">
            {avoidList.slice(0, 3).map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-xs sm:text-sm font-medium text-[#E2E8F0] leading-snug"
              >
                <span className="text-rose-400 mt-0.5 text-xs shrink-0">●</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── ⏱️ PILLAR 3: ไทม์ไลน์ 8 ยามรายชั่วโมงวันนี้ (TODAY'S HOURLY YAM FLOW) ── */}
      <div className="rounded-3xl p-5 border border-white/10 bg-[#0A2240]/40 backdrop-blur-md animate-fade-up shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-[#C6A96B]/15 border border-[#C6A96B]/30 text-[#C6A96B] font-black text-sm shrink-0">
              ⏱️
            </div>
            <div>
              <h3 className="font-display text-sm sm:text-base font-black text-[#F8F6F1]">
                ไทม์ไลน์ ๘ ยามรายชั่วโมงวันนี้
              </h3>
              <p className="text-[11px] text-[#94A3B8]">
                แตะแต่ละช่วงเวลาเพื่อดูระดับฤกษ์และคำพยากรณ์ล่วงหน้า
              </p>
            </div>
          </div>

          {/* Day / Night Switcher */}
          <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 self-start sm:self-auto">
            <button
              onClick={() => {
                setTimelineTab("day");
                setSelectedSlot(null);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                timelineTab === "day"
                  ? "bg-[#C6A96B] text-[#020617] shadow"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              ☀️ กลางวัน (8 ยาม)
            </button>
            <button
              onClick={() => {
                setTimelineTab("night");
                setSelectedSlot(null);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                timelineTab === "night"
                  ? "bg-[#C6A96B] text-[#020617] shadow"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              🌙 กลางคืน (8 ยาม)
            </button>
          </div>
        </div>

        {/* Horizontal Slider of 8 Yam Slots */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar">
          {activeSlots.map((slot) => {
            const isSelected = selectedSlot?.timeLabel === slot.timeLabel;
            const slotBorderColor =
              slot.ticks === 3
                ? "border-emerald-500/50 hover:border-emerald-400"
                : slot.ticks === 2
                ? "border-blue-500/50 hover:border-blue-400"
                : slot.ticks === 1
                ? "border-[#C6A96B]/40 hover:border-[#C6A96B]"
                : "border-rose-500/30 hover:border-rose-400";

            return (
              <button
                key={slot.timeLabel}
                onClick={() => setSelectedSlot(slot)}
                className={`flex-shrink-0 w-32 p-3 rounded-2xl border text-left transition-all relative ${
                  slot.isCurrent
                    ? "bg-gradient-to-b from-[#C6A96B]/25 via-[#0A2240] to-[#020617] border-[#C6A96B] ring-2 ring-[#C6A96B]/30 shadow-lg scale-[1.02]"
                    : isSelected
                    ? "bg-white/10 border-white/40 shadow-md"
                    : `bg-white/[0.03] ${slotBorderColor} hover:bg-white/[0.07]`
                }`}
              >
                {slot.isCurrent && (
                  <span className="absolute -top-2 left-2 px-1.5 py-0.2 rounded bg-amber-400 text-[#020617] text-[9px] font-black uppercase tracking-wider shadow">
                    NOW
                  </span>
                )}

                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[#94A3B8] font-bold">
                    {slot.timeLabel.split("-")[0]?.trim()}
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: slot.planetColor }}
                  >
                    {slot.planetSymbol}
                  </span>
                </div>

                <p className="font-display font-bold text-xs text-[#F8F6F1] mt-1 truncate">
                  ยาม{slot.yamName}
                </p>

                <div className="mt-2 flex items-center justify-between text-[10px]">
                  <span
                    className="font-black"
                    style={{
                      color:
                        slot.ticks === 3
                          ? "#10B981"
                          : slot.ticks === 2
                          ? "#60A5FA"
                          : slot.ticks === 1
                          ? "#C6A96B"
                          : "#F87171",
                    }}
                  >
                    {slot.ticks === 3
                      ? "✓✓✓ ดีเยี่ยม"
                      : slot.ticks === 2
                      ? "✓✓ ดีมาก"
                      : slot.ticks === 1
                      ? "✓ ราบรื่น"
                      : "⚠️ ชะลอ"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Slot Detailed Preview */}
        {selectedSlot && (
          <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/15 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span style={{ color: selectedSlot.planetColor }} className="text-base font-bold">
                  {selectedSlot.planetSymbol}
                </span>
                <span className="font-display font-black text-sm text-[#F8F6F1]">
                  ยาม{selectedSlot.yamName} ({selectedSlot.planetNameThai}) • เวลา {selectedSlot.timeLabel}
                </span>
              </div>
              <span
                className="text-xs font-black px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor:
                    selectedSlot.ticks === 3 ? "rgba(16,185,129,0.2)" : "rgba(198,169,107,0.2)",
                  color: selectedSlot.ticks === 3 ? "#10B981" : "#C6A96B",
                }}
              >
                {selectedSlot.label} ({selectedSlot.score}%)
              </span>
            </div>

            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              <strong>คำพยากรณ์:</strong> {selectedSlot.prophecy}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="text-emerald-300">
                <strong>✓ แนะนำ:</strong> {selectedSlot.shouldDo}
              </div>
              <div className="text-rose-300">
                <strong>✕ หลีกเลี่ยง:</strong> {selectedSlot.shouldNotDo}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Link
                to={`/dashboard/calendar?date=${bkkDateStr}&time=${selectedSlot.timeLabel.split("-")[0]?.trim() || "12:00"}`}
                className="text-xs font-bold text-[#F2D49B] hover:underline"
              >
                + วางแผนนัดหมายช่วง {selectedSlot.timeLabel} →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── CARD 4: TODAY'S APPOINTMENTS (นัดหมายวันนี้) ── */}
      <div className="rounded-3xl p-5 border border-white/10 bg-[#0A2240]/40 backdrop-blur-md animate-fade-up shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 shrink-0">
              <AstralIcon name="calendar" size="xs" variant="gold" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C6A96B]">
              นัดหมายและกิจกรรมวันนี้ ({todayAppointments.length})
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
                className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#C6A96B]">
                      {app.event_time.slice(0, 5)} น.
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
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
            <span className="text-xs text-[#94A3B8]">
              ยังไม่มีนัดหมายที่ลงบันทึกไว้ในวันนี้
            </span>
            <Link
              to={`/dashboard/calendar?date=${bkkDateStr}`}
              className="text-xs font-bold text-[#C6A96B] hover:underline"
            >
              + วางแผนนัดหมาย
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
            className="flex sm:flex-col items-center justify-between sm:justify-center p-4 rounded-2xl border border-[#C6A96B]/40 bg-gradient-to-br from-[#C6A96B]/20 via-[#0A2240]/60 to-[#020617] hover:border-[#C6A96B] transition-all group active:scale-95 text-left sm:text-center shadow-lg"
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
            to="/dashboard/yam"
            className="flex sm:flex-col items-center justify-between sm:justify-center p-4 rounded-2xl border border-white/10 bg-[#0A2240]/40 hover:border-[#C6A96B]/50 hover:bg-[#0A2240]/60 transition-all group active:scale-95 text-left sm:text-center shadow-md"
          >
            <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">
              📜
            </span>
            <div>
              <p className="text-xs font-black text-[#F8F6F1]">คัมภีร์ยาม ๒๔ ชั้นฉาย</p>
              <p className="text-[10px] text-[#94A3B8] mt-0.5">
                ดูตารางยามมาตรฐาน ๗ ฐาน
              </p>
            </div>
            <span className="sm:hidden text-xs text-[#94A3B8]">→</span>
          </Link>

          <Link
            to="/dashboard/horoscope"
            className="flex sm:flex-col items-center justify-between sm:justify-center p-4 rounded-2xl border border-white/10 bg-[#0A2240]/40 hover:border-[#C6A96B]/50 hover:bg-[#0A2240]/60 transition-all group active:scale-95 text-left sm:text-center shadow-md"
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
