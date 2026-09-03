import { json } from "@remix-run/cloudflare";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { requireMinPlan } from "~/services/auth.server";
import { canAccess } from "~/services/permissions.server";
import {
  getCurrentYam,
  calculateMoonPhase,
  getSunTimes,
  getYamPrediction,
  yamDayTable,
  yamDayTicksTable,
  yamDaySubTable,
  yamNightTable,
  yamNightTicksTable,
  yamNightSubTable,
  ATTHAKARN_CHAN_CHAI_TABLE,
  DAY_SUB_TIME_SLOTS_24,
  NIGHT_SUB_TIME_SLOTS_24,
  YAM_BEST_TIMES_SUMMARY,
  YAM_RULES_NOTE,
  getChanChaiItem,
  getChanChaiProphecy,
  type MasterYamItem,
  type ChanChaiPhase,
  type SubTimeSlotItem,
} from "@phopephum/engine";
import { Card } from "~/components/ui/Card";
import { UpgradePaywall } from "~/components/ui/UpgradePaywall";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "ฤกษ์ดีมีชัย & คัมภีร์ยามอัฏฐกาลชั้นฉาย — PhopePhum" },
];

const PLANET_SYMBOLS: Record<string, string> = {
  สุริยะ: "☉", ระวิ:  "☉", สุริชะ: "☉",
  จันเทา: "☽", คะศิ:  "☽", จันทา:  "☽", ศะศิ: "☽",
  ภุมมะ:  "♂", ภุมโม: "♂",
  พุทธะ:  "☿", พุทโธ: "☿", พุธะ:  "☿", พุโธ:  "☿",
  ครู:    "♃", ชีโว:  "♃",
  ศุกระ:  "♀", ศุโกร: "♀",
  เสารี:  "♄", โสโร:  "♄",
};

const DAY_GRID_HEADER_TIMES = [
  { major: "06.01-7.30 น.", subs: ["6.01", "6.31", "7.01"] },
  { major: "07.31-09.00 น.", subs: ["7.31", "8.01", "8.31"] },
  { major: "09.01-10.30 น.", subs: ["9.01", "9.31", "10.01"] },
  { major: "10.31-12.00 น.", subs: ["10.31", "11.01", "11.31"] },
  { major: "12.01-13.30 น.", subs: ["12.01", "12.31", "13.01"] },
  { major: "13.31-15.00 น.", subs: ["13.31", "14.01", "14.31"] },
  { major: "15.01-16.30 น.", subs: ["15.01", "15.31", "16.01"] },
  { major: "16.31-18.00 น.", subs: ["16.31", "17.01", "17.31"] },
];

const NIGHT_GRID_HEADER_TIMES = [
  { major: "18.01-19.30 น.", subs: ["18.01", "18.31", "19.01"] },
  { major: "19.31-21.00 น.", subs: ["19.31", "20.01", "20.31"] },
  { major: "21.01-22.30 น.", subs: ["21.01", "21.31", "22.01"] },
  { major: "22.31-24.00 น.", subs: ["22.31", "23.01", "23.31"] },
  { major: "0.01-01.30 น.", subs: ["0.01", "0.31", "1.01"] },
  { major: "01.31-03.00 น.", subs: ["1.31", "2.01", "2.31"] },
  { major: "03.10-04.30 น.", subs: ["3.01", "3.31", "4.01"] },
  { major: "04.31-06.00 น.", subs: ["4.31", "5.01", "5.31"] },
];

const PHASE_LABEL: Record<string, string> = {
  start:  "ยามต้น",
  middle: "ยามกลาง",
  end:    "ยามปลาย",
};

const PERIOD_LABEL: Record<string, string> = {
  day:   "กลางวัน",
  night: "กลางคืน",
};

const DAY_NAMES_EN = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const DAY_NAMES_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];

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

/**
 * คำนวณยามอัฏฐกาล 16 ยามย่อยต่อวัน ตามหลักดาราศาสตร์ไทย
 */
function calculateDailyYamSlots(targetDate: Date): YamSlotDetail[] {
  const sunTimes = getSunTimes(targetDate);
  const sunrise = sunTimes.sunrise;
  const sunset = sunTimes.sunset;

  const dayMs = sunset.getTime() - sunrise.getTime();
  const nightMs = 86400000 - dayMs;

  const daySlotMs = dayMs / 8;
  const nightSlotMs = nightMs / 8;

  const slots: YamSlotDetail[] = [];

  // 8 ยามกลางวัน
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
      level: result.travelAuspiciousness.level,
      label: result.travelAuspiciousness.label,
      description: result.travelAuspiciousness.description,
      prediction: result.prediction ?? null,
    });
  }

  // 8 ยามกลางคืน
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
      level: result.travelAuspiciousness.level,
      label: result.travelAuspiciousness.label,
      description: result.travelAuspiciousness.description,
      prediction: result.prediction ?? null,
    });
  }

  return slots;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { profile } = await requireMinPlan("basic", request, env);

  const yam = getCurrentYam();
  const moon = calculateMoonPhase();

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const todaySlots = calculateDailyYamSlots(today);
  const tomorrowSlots = calculateDailyYamSlots(tomorrow);

  const todayDateLabel = today.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const tomorrowDateLabel = tomorrow.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return json({
    yamName:    yam.yamName,
    yamNumber:  yam.yamNumber,
    period:     yam.period,
    phase:      yam.phase,
    prediction: yam.prediction ?? null,
    travelAuspiciousness: yam.travelAuspiciousness,
    sunriseISO: yam.sunTimes.sunrise.toISOString(),
    sunsetISO:  yam.sunTimes.sunset.toISOString(),
    todaySlots,
    tomorrowSlots,
    todayDateLabel,
    tomorrowDateLabel,
    moon: {
      moonPhase:    moon.moonPhase,
      lunarDay:     moon.lunarDay,
      illumination: moon.illumination,
      isWanPhra:    moon.isWanPhra,
      guidance:     moon.guidance,
    },
    loadedAt: new Date().toISOString(),
    isProLocked: !canAccess(profile, "pro"),
  });
}

// ─── Topic Wise Auspicious Scoring & Advice ──────────────────────────────────
interface TopicAdvice {
  score: number;
  ratingText: string;
  description: string;
  shouldDo: string[];
  shouldAvoid: string[];
  speechTemplate: string;
}

function getTopicAdvice(topic: "love" | "trade" | "negotiate" | "travel", yamName: string, phase: string, ticks: number, t: any): TopicAdvice {
  if (topic === "travel") {
    const key = [3, 2, 0].includes(ticks) ? `level_${ticks}` : "level_default";
    const advice = t(`yam:advices.travel.${key}`, { returnObjects: true }) as any;
    
    return {
      score: ticks === 3 ? 9.8 : ticks === 2 ? 8.8 : ticks === 0 ? 3.5 : 6.8,
      ratingText: advice?.ratingText || "ค่อนข้างเหมาะสม",
      description: advice?.description || "ยามมงคลระดับดี สามารถเริ่มต้นเดินทางสัญจรได้ทั่วไป",
      shouldDo: advice?.shouldDo || [],
      shouldAvoid: advice?.shouldAvoid || [],
      speechTemplate: t("yam:advices.travel.speech", "ขอให้การเดินทางครั้งนี้เป็นทริปมหาเฮง ปลอดภัยตลอดเส้นทาง และประสบผลสำเร็จสมเจตนารมณ์ทุกประการค่ะ"),
    };
  }

  let planet = 4; // default พุธ
  if (["สุริยะ", "สุริชะ", "ระวิ"].includes(yamName)) planet = 1;
  else if (["จันทา", "จันเทา", "จันทรา", "คะศิ", "ศะศิ"].includes(yamName)) planet = 2;
  else if (["ภุมมะ", "ภูมมะ", "ภุมโม"].includes(yamName)) planet = 3;
  else if (["พุทธะ", "พุธะ", "พุธ", "พุทโธ", "พุโธ"].includes(yamName)) planet = 4;
  else if (["ครู", "ชีโว", "พฤหัส"].includes(yamName)) planet = 5;
  else if (["ศุกระ", "ศุโกร", "ศุกโร"].includes(yamName)) planet = 6;
  else if (["เสารี", "เสาร์", "โสโร"].includes(yamName)) planet = 7;

  const scoreMap: Record<number, Record<"love" | "trade" | "negotiate", number>> = {
    1: { love: 6.8, trade: 8.8, negotiate: 9.2 },
    2: { love: 9.5, trade: 8.5, negotiate: 8.0 },
    3: { love: 4.2, trade: 7.0, negotiate: 5.5 },
    4: { love: 8.0, trade: 9.5, negotiate: 9.8 },
    5: { love: 8.5, trade: 9.8, negotiate: 9.5 },
    6: { love: 9.8, trade: 9.2, negotiate: 8.8 },
    7: { love: 5.0, trade: 8.0, negotiate: 8.2 }
  };

  const adviceObj = t(`yam:advices.planets.${planet}.${topic}`, { returnObjects: true }) as any;
  const defaultObj = t("yam:advices.default", { returnObjects: true }) as any;

  return {
    score: scoreMap[planet]?.[topic] ?? 7.0,
    ratingText: adviceObj?.ratingText || defaultObj?.ratingText || "เหมาะสม",
    description: adviceObj?.description || defaultObj?.description || "ช่วงเวลาดี มีความมั่นคง ปลอดภัยตามตำรายามอัฏฐกาล",
    shouldDo: adviceObj?.shouldDo || defaultObj?.shouldDo || [],
    shouldAvoid: adviceObj?.shouldAvoid || defaultObj?.shouldAvoid || [],
    speechTemplate: adviceObj?.speech || defaultObj?.speech || "ขอให้งานครั้งนี้ประสบผลสำเร็จตามที่ตั้งใจไว้นะคะ",
  };
}

export default function YamPage() {
  const data = useLoaderData<typeof loader>();
  const { t, i18n } = useTranslation(["yam", "common", "horoscope"]);
  const isLocked = (data as any).isProLocked as boolean;

  const { revalidate } = useRevalidator();
  const [now, setNow] = useState<Date>(new Date());
  
  // React states for tab controllers & interactive form
  const [activeTab, setActiveTab] = useState<"live" | "ashta" | "finder" | "grid" | "compare">("live");
  const [activeInquiry, setActiveInquiry] = useState<"news" | "sickness" | "lostItem" | "travel" | "bestTime">("news");
  const [ashtaInquiry, setAshtaInquiry] = useState<"news" | "sickness" | "lostItem" | "travel" | "bestTime">("news");

  // Manual Ashta Calculator states
  const [ashtaDay, setAshtaDay] = useState<number>(() => new Date().getDate());
  const [ashtaMonth, setAshtaMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [ashtaYear, setAshtaYear] = useState<number>(() => new Date().getFullYear() + 543);
  const [ashtaTime, setAshtaTime] = useState<string>("");
  const [ashtaResult, setAshtaResult] = useState<any>(null);

  // Interactive Auspicious Finder states
  const [selectedTopic, setSelectedTopic] = useState<"love" | "trade" | "negotiate" | "travel">("love");
  
  const [finderDay, setFinderDay] = useState<number>(() => new Date().getDate());
  const [finderMonth, setFinderMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [finderYear, setFinderYear] = useState<number>(() => new Date().getFullYear() + 543);
  const [finderTime, setFinderTime] = useState<string>("");
  const [calculatedResult, setCalculatedResult] = useState<any>(null);

  // Compare Travel states
  const [compDayA, setCompDayA] = useState<number>(() => new Date().getDate());
  const [compMonthA, setCompMonthA] = useState<number>(() => new Date().getMonth() + 1);
  const [compYearA, setCompYearA] = useState<number>(() => new Date().getFullYear() + 543);
  const [compTimeA, setCompTimeA] = useState<string>("20:00");

  const [compDayB, setCompDayB] = useState<number>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.getDate();
  });
  const [compMonthB, setCompMonthB] = useState<number>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.getMonth() + 1;
  });
  const [compYearB, setCompYearB] = useState<number>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.getFullYear() + 543;
  });
  const [compTimeB, setCompTimeB] = useState<string>("08:00");
  const [compareResult, setCompareResult] = useState<any>(null);

  // 8x7 Watch Grid State
  const [gridPeriod, setGridPeriod] = useState<"day" | "night">("day");
  const [selectedGridCell, setSelectedGridCell] = useState<{ dayName: string; yamNumber: number } | null>(null);
  const [gridDetailAdvice, setGridDetailAdvice] = useState<any>(null);

  // Quick Shortcut Date Setters
  const handleSetToday = () => {
    const d = new Date();
    setFinderDay(d.getDate());
    setFinderMonth(d.getMonth() + 1);
    setFinderYear(d.getFullYear() + 543);
  };

  const handleSetTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setFinderDay(d.getDate());
    setFinderMonth(d.getMonth() + 1);
    setFinderYear(d.getFullYear() + 543);
  };

  const handleSetOptionATonight = () => {
    const d = new Date();
    setCompDayA(d.getDate());
    setCompMonthA(d.getMonth() + 1);
    setCompYearA(d.getFullYear() + 543);
    setCompTimeA("20:00");
  };

  const handleSetOptionBTomorrowMorning = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setCompDayB(d.getDate());
    setCompMonthB(d.getMonth() + 1);
    setCompYearB(d.getFullYear() + 543);
    setCompTimeB("08:00");
  };

  const handleAshtaCalculate = () => {
    const targetDate = new Date(ashtaYear - 543, ashtaMonth - 1, ashtaDay);
    const [hStr, mStr] = ashtaTime.split(":");
    targetDate.setHours(parseInt(hStr ?? "12"), parseInt(mStr ?? "0"), 0, 0);

    const result = getYamPrediction(targetDate);
    setAshtaResult(result);
  };

  const handleSetAshtaNow = () => {
    const now = new Date();
    setAshtaDay(now.getDate());
    setAshtaMonth(now.getMonth() + 1);
    setAshtaYear(now.getFullYear() + 543);
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    setAshtaTime(`${hours}:${minutes}`);
    
    const result = getYamPrediction(now);
    setAshtaResult(result);
  };

  // Tick clock every second
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  // Revalidate loader every 60 s
  useEffect(() => {
    const id = setInterval(revalidate, 60_000);
    return () => clearInterval(id);
  }, [revalidate]);

  // Set default time in finder on load
  useEffect(() => {
    const hours = String(new Date().getHours()).padStart(2, "0");
    const minutes = String(new Date().getMinutes()).padStart(2, "0");
    setFinderTime(`${hours}:${minutes}`);
    
    setAshtaTime(`${hours}:${minutes}`);
    const result = getYamPrediction(new Date());
    setAshtaResult(result);
  }, []);

  const sunrise = new Date(data.sunriseISO);
  const sunset  = new Date(data.sunsetISO);
  const symbol  = PLANET_SYMBOLS[data.yamName] ?? "✦";

  // Compute live watch boundaries
  const dayMs     = sunset.getTime() - sunrise.getTime();
  const nightMs   = (86400000 - dayMs);
  const windowMs  = data.period === "day" ? dayMs / 8 : nightMs / 8;
  const startBase = data.period === "day" ? sunrise : sunset;
  const yamStart  = new Date(startBase.getTime() + (data.yamNumber - 1) * windowMs);
  const yamEnd    = new Date(yamStart.getTime() + windowMs);
  const remaining = Math.max(0, yamEnd.getTime() - now.getTime());
  const remMin    = Math.floor(remaining / 60000);

  // Sub-yam 30-min window computation
  const subYamMs = windowMs / 3;
  const subPhaseIndex = data.phase === "start" ? 0 : data.phase === "middle" ? 1 : 2;
  const currentSubYamStart = new Date(yamStart.getTime() + subPhaseIndex * subYamMs);
  const currentSubYamEnd = new Date(currentSubYamStart.getTime() + subYamMs);
  const currentSubRemaining = Math.max(0, currentSubYamEnd.getTime() - now.getTime());
  const currentSubRemMin = Math.floor(currentSubRemaining / 60000);
  const currentSubRemSec = Math.floor((currentSubRemaining % 60000) / 1000);

  const liveChanChaiItem = getChanChaiItem(data.yamName);
  const liveChanChaiSub = liveChanChaiItem?.chanChai[data.phase as ChanChaiPhase];

  // BKK Day Shift 
  const yamDisplayDate = new Date(now);
  if (now.getHours() < 6) yamDisplayDate.setDate(yamDisplayDate.getDate() - 1);

  const currentLocale = i18n.language === "zh" ? "zh-CN" : i18n.language === "en" ? "en-US" : "th-TH";
  const timeStr = now.toLocaleTimeString(currentLocale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = yamDisplayDate.toLocaleDateString(currentLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Handle Finder calculation Click
  const handleCalculateFinder = () => {
    const targetDate = new Date(finderYear - 543, finderMonth - 1, finderDay);
    const [hStr, mStr] = finderTime.split(":");
    targetDate.setHours(parseInt(hStr ?? "12"), parseInt(mStr ?? "0"), 0, 0);

    const result = getYamPrediction(targetDate);
    const slots = calculateDailyYamSlots(targetDate);
    
    const matchingSlot = slots.find(s => {
      const sStart = new Date(s.startTimeISO);
      const sEnd = new Date(s.endTimeISO);
      return targetDate.getTime() >= sStart.getTime() && targetDate.getTime() < sEnd.getTime();
    }) || slots[0]!;

    const advice = getTopicAdvice(selectedTopic, result.yamName, result.phase, matchingSlot.ticks, t);

    setCalculatedResult({
      yamName: result.yamName,
      phase: result.phase,
      period: result.period,
      timeLabel: matchingSlot.timeLabel,
      ticks: matchingSlot.ticks,
      advice,
    });
  };

  // Handle Travel Comparison Calculation Click
  const handleCalculateCompare = () => {
    const dateA = new Date(compYearA - 543, compMonthA - 1, compDayA);
    const [hA, mA] = compTimeA.split(":");
    dateA.setHours(parseInt(hA ?? "12"), parseInt(mA ?? "0"), 0, 0);

    const dateB = new Date(compYearB - 543, compMonthB - 1, compDayB);
    const [hB, mB] = compTimeB.split(":");
    dateB.setHours(parseInt(hB ?? "12"), parseInt(mB ?? "0"), 0, 0);

    const resultA = getYamPrediction(dateA);
    const slotsA = calculateDailyYamSlots(dateA);
    const slotA = slotsA.find(s => {
      const sStart = new Date(s.startTimeISO);
      const sEnd = new Date(s.endTimeISO);
      return dateA.getTime() >= sStart.getTime() && dateA.getTime() < sEnd.getTime();
    }) || slotsA[0]!;
    const adviceA = getTopicAdvice("travel", resultA.yamName, resultA.phase, slotA.ticks, t);

    const resultB = getYamPrediction(dateB);
    const slotsB = calculateDailyYamSlots(dateB);
    const slotB = slotsB.find(s => {
      const sStart = new Date(s.startTimeISO);
      const sEnd = new Date(s.endTimeISO);
      return dateB.getTime() >= sStart.getTime() && dateB.getTime() < sEnd.getTime();
    }) || slotsB[0]!;
    const adviceB = getTopicAdvice("travel", resultB.yamName, resultB.phase, slotB.ticks, t);

    let verdict = "";
    if (adviceA.score > adviceB.score) {
      verdict = t("yam:compare.verdict_a", {
        ticks: slotA.ticks,
        rating: adviceA.ratingText,
        defaultValue: `🏆 แนะนำทางเลือกที่ 1 อย่างยิ่ง! เนื่องจากได้รับความมงคลเดินทาง ${slotA.ticks} ขีด (ระดับ ${adviceA.ratingText}) ซึ่งราบรื่น ปลอดภัย และให้พลังงานโชคลาภเกื้อหนุนมากกว่าทางเลือกที่ 2 อย่างเด่นชัดค่ะ`
      });
    } else if (adviceB.score > adviceA.score) {
      verdict = t("yam:compare.verdict_b", {
        ticks: slotB.ticks,
        rating: adviceB.ratingText,
        defaultValue: `🏆 แนะนำทางเลือกที่ 2 อย่างยิ่ง! เนื่องจากได้รับความมงคลเดินทาง ${slotB.ticks} ขีด (ระดับ ${adviceB.ratingText}) ซึ่งประเสริฐเลิศล้ำ ปลอดภัยจากเคราะห์ภัย และสัญจรเดินทางคล่องแคล่วกว่าค่ะ`
      });
    } else {
      verdict = t("yam:compare.verdict_equal", {
        ticks: slotA.ticks,
        defaultValue: `⚖️ ทั้งสองช่วงเวลามีระดับความมงคลเสมอกัน (${slotA.ticks} ขีด) สามารถเลือกสัญจรเดินทางได้ตามความสะดวกของตารางเวลาท่าน โดยพึงรักษาความระมัดระวังและตั้งมั่นในสติบารมีตามคำแนะนำอย่างเสมอกันค่ะ`
      });
    }

    setCompareResult({
      a: {
        dateLabel: dateA.toLocaleDateString(currentLocale, { day: "numeric", month: "long", year: "numeric" }),
        timeLabel: slotA.timeLabel,
        yamName: resultA.yamName,
        phase: resultA.phase,
        ticks: slotA.ticks,
        advice: adviceA,
      },
      b: {
        dateLabel: dateB.toLocaleDateString(currentLocale, { day: "numeric", month: "long", year: "numeric" }),
        timeLabel: slotB.timeLabel,
        yamName: resultB.yamName,
        phase: resultB.phase,
        ticks: slotB.ticks,
        advice: adviceB,
      },
      verdict,
    });
  };

  // Handle Grid cell click event
  const handleGridCellClick = (dayName: string, yamNumber: number) => {
    setSelectedGridCell({ dayName, yamNumber });

    const dayNameEn = DAY_NAMES_EN[DAY_NAMES_TH.indexOf(dayName)]!;
    const table = gridPeriod === "day" ? yamDayTable[dayNameEn] : yamNightTable[dayNameEn];
    const yamName = table[yamNumber - 1]!;

    const ticksTable = gridPeriod === "day" ? yamDayTicksTable[dayNameEn] : yamNightTicksTable[dayNameEn];
    const ticks = ticksTable[yamNumber - 1] ?? 1;

    let startH = 6, startM = 0;
    if (gridPeriod === "day") {
      const minutes = 360 + (yamNumber - 1) * 90;
      startH = Math.floor(minutes / 60);
      startM = minutes % 60;
    } else {
      const minutes = 1080 + (yamNumber - 1) * 90;
      startH = Math.floor(minutes / 60);
      if (startH >= 24) startH -= 24;
      startM = minutes % 60;
    }
    const endMinutes = (gridPeriod === "day" ? 360 : 1080) + yamNumber * 90;
    let endH = Math.floor(endMinutes / 60);
    if (endH >= 24) endH -= 24;
    const endM = endMinutes % 60;

    const timeLabel = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")} - ${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")} น.`;

    const chanChaiItem = getChanChaiItem(yamName);
    const loveAdvice = getTopicAdvice("love", yamName, "middle", ticks, t);
    const tradeAdvice = getTopicAdvice("trade", yamName, "middle", ticks, t);
    const negotiateAdvice = getTopicAdvice("negotiate", yamName, "middle", ticks, t);
    const travelAdvice = getTopicAdvice("travel", yamName, "middle", ticks, t);

    setGridDetailAdvice({
      yamName,
      timeLabel,
      ticks,
      chanChaiItem,
      love: loveAdvice,
      trade: tradeAdvice,
      negotiate: negotiateAdvice,
      travel: travelAdvice,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[#D9BC82] text-xs tracking-widest uppercase mb-1">ฤกษ์ดีมีชัย & คัมภีร์ยามอัฏฐกาล</p>
          <h1 className="font-display text-3xl font-bold text-[#F8F6F1]">ระบบยามอัฏฐกาล & ชั้นฉาย</h1>
          <p className="text-[#94A3B8] text-sm mt-1">{dateStr}</p>
        </div>
        <div className="text-right">
          <p className="text-[#D9BC82] text-xs font-bold uppercase tracking-widest mb-1">เวลาปัจจุบัน</p>
          <p className="font-display text-2xl font-bold text-[#F8F6F1] tabular-nums">{timeStr}</p>
        </div>
      </div>

      {/* 🌙 แถบพลังงานจันทรา (Moon Phase Slim Banner) */}
      <div className="relative overflow-hidden rounded-2xl border border-[#D9BC82]/15 bg-[#0A1628]/35 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-4 transition-all shadow-[0_0_15px_rgba(198,169,107,0.05)]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#D9BC82]/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="text-3xl shrink-0 drop-shadow-[0_0_8px_rgba(217,188,130,0.3)]">
            {data.moon.isWanPhra ? "🌕" : data.moon.illumination > 50 ? "🌖" : "🌒"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-semibold text-xs text-[#D9BC82] tracking-wider block">
                {data.moon.moonPhase}
              </span>
              {data.moon.isWanPhra && (
                <span className="px-2 py-0.5 text-[12px] font-bold rounded-full text-[#D9BC82] border border-[#D9BC82]/30 bg-[#D9BC82]/10 uppercase tracking-wider">
                  วันพระ 🕉️
                </span>
              )}
            </div>
            <p className="text-[13px] text-[#94A3B8] mt-0.5 truncate leading-relaxed max-w-[280px] sm:max-w-md">
              {data.moon.guidance}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0 border-l border-white/5 pl-4">
          <p className="text-lg font-display font-black text-[#F8F6F1] leading-none tabular-nums">
            {data.moon.illumination}%
          </p>
          <span className="text-[11px] text-[#C6B79F] uppercase font-bold tracking-widest block mt-0.5">
            ความสว่าง
          </span>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex flex-wrap bg-[#0A1628]/60 p-1.5 rounded-2xl border border-[#D9BC82]/15 gap-1.5 w-full relative shadow-md">
        <button
          onClick={() => setActiveTab("live")}
          className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "live"
              ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#0A1628] shadow-[0_0_12px_rgba(217,188,130,0.25)] font-black"
              : "text-[#94A3B8] hover:text-[#F8F6F1] hover:bg-white/5"
          }`}
        >
          ⏱️ ยามสดขณะนี้
        </button>
        <button
          onClick={() => setActiveTab("ashta")}
          className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "ashta"
              ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#0A1628] shadow-[0_0_12px_rgba(217,188,130,0.25)] font-black"
              : "text-[#94A3B8] hover:text-[#F8F6F1] hover:bg-white/5"
          }`}
        >
          🔮 คำนวณยามดี
        </button>
        <button
          onClick={() => setActiveTab("finder")}
          className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "finder"
              ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#0A1628] shadow-[0_0_12px_rgba(217,188,130,0.25)] font-black"
              : "text-[#94A3B8] hover:text-[#F8F6F1] hover:bg-white/5"
          }`}
        >
          ✨ คำนวณฤกษ์มีชัย
        </button>
        <button
          onClick={() => isLocked ? null : setActiveTab("compare")}
          className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "compare"
              ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#0A1628] shadow-[0_0_12px_rgba(217,188,130,0.25)] font-black"
              : isLocked
              ? "text-[#94A3B8]/40 cursor-not-allowed"
              : "text-[#94A3B8] hover:text-[#F8F6F1] hover:bg-white/5"
          }`}
          title={isLocked ? "สมาชิก PRO ขึ้นไปเท่านั้น" : ""}
        >
          ✈️ เปรียบเทียบฤกษ์ {isLocked && '🔒'}
        </button>
        <button
          onClick={() => isLocked ? null : setActiveTab("grid")}
          className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "grid"
              ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#0A1628] shadow-[0_0_12px_rgba(217,188,130,0.25)] font-black"
              : isLocked
              ? "text-[#94A3B8]/40 cursor-not-allowed"
              : "text-[#94A3B8] hover:text-[#F8F6F1] hover:bg-white/5"
          }`}
          title={isLocked ? "สมาชิก PRO ขึ้นไปเท่านั้น" : ""}
        >
          📅 ตารางยามอัฐกาล {isLocked && '🔒'}
        </button>
      </div>

      {isLocked && (activeTab === "compare" || activeTab === "grid") && (
        <div className="animate-fade-in mt-6">
          <UpgradePaywall featureName="เครื่องมือวิเคราะห์ฤกษ์ขั้นสูง (PRO)" description="ตารางยามอัฏฐกาลล่วงหน้าและการเปรียบเทียบฤกษ์เดินทาง สงวนสิทธิ์สำหรับสมาชิกระดับ PRO ขึ้นไป" />
        </div>
      )}

      {/* ⏱️ LIVE WATCH VIEW */}
      {activeTab === "live" && (
        <div className="space-y-6 animate-fade-in">
          {/* Main Live Card — Living Cosmic Magazine Layout */}
          <Card className="overflow-hidden border-[#D9BC82]/15 bg-[#0A1628]/40 p-0 shadow-[0_0_30px_rgba(217,188,130,0.06)]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
              
              {/* ฝั่งซ้าย: โลกคอสมิกแห่งดวงดาวและอวกาศ */}
              <div className="relative md:col-span-5 h-64 md:h-auto min-h-[260px] bg-slate-950 flex flex-col items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-[#D9BC82]/10">
                <div 
                  className="absolute inset-0 bg-gradient-to-tr from-[#020617] via-[#091C36] to-[#020617] opacity-90"
                  style={{
                    backgroundImage: `radial-gradient(circle at 50% 50%, rgba(75, 111, 174, 0.22) 0%, rgba(2, 6, 23, 0.98) 80%)`
                  }}
                />
                
                {/* Cosmic Starfield Sparkles */}
                <div className="absolute inset-0 opacity-40">
                  <div className="absolute top-10 left-10 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDuration: "3s" }} />
                  <div className="absolute top-32 right-12 w-1.5 h-1.5 bg-[#D9BC82] rounded-full animate-ping" style={{ animationDuration: "4s", animationDelay: "1s" }} />
                  <div className="absolute bottom-12 left-16 w-1.5 h-1.5 bg-[#4B6FAE] rounded-full animate-ping" style={{ animationDuration: "5s", animationDelay: "2s" }} />
                </div>

                {/* Spinning Rings */}
                <div className="absolute w-44 h-44 rounded-full border border-[#D9BC82]/10 animate-spin opacity-50" style={{ animationDuration: "50s" }} />
                <div className="absolute w-36 h-36 rounded-full border border-dashed border-[#4B6FAE]/20 animate-spin opacity-60" style={{ animationDuration: "30s", animationDirection: "reverse" }} />

                {/* Giant Floating Star Symbol */}
                <div className="relative flex flex-col items-center justify-center animate-float">
                  <div className="absolute w-20 h-20 bg-[#D9BC82]/10 rounded-full blur-xl animate-pulse-subtle" />
                  <span className="text-8xl text-[#D9BC82] leading-none drop-shadow-[0_0_15px_rgba(217,188,130,0.4)] select-none font-serif">
                    {symbol}
                  </span>
                  <span className="text-[12px] text-[#D9BC82] font-bold uppercase tracking-[0.3em] mt-3.5 bg-slate-950/80 px-3 py-0.5 rounded-full border border-[#D9BC82]/25 backdrop-blur">
                    {data.yamName} เจ้าครองยาม
                  </span>
                </div>
              </div>

              {/* ฝั่งขวา: รายละเอียดกระแสพลังงานยาม */}
              <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-xs text-[#D9BC82] font-bold uppercase tracking-widest block mb-1">
                    🪐 กระแสพลังยามมงคลขณะนี้
                  </span>
                  <h2 className="font-display text-4xl sm:text-5xl font-black text-[#F8F6F1] tracking-wide mt-1 drop-shadow-[0_0_12px_rgba(248,246,241,0.15)]">
                    ยาม{data.yamName}
                  </h2>
                  <div className="flex gap-2 items-center mt-3 flex-wrap">
                    <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-[#F8F6F1]">
                      ยามใหญ่ที่ {data.yamNumber} (1.5 ชม.)
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#4B6FAE]/20 border border-[#4B6FAE]/30 text-xs font-bold text-[#D9CDB7]">
                      {PERIOD_LABEL[data.period]}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#D9BC82]/20 border border-[#D9BC82]/30 text-xs font-bold text-[#D9BC82]">
                      {PHASE_LABEL[data.phase]}
                    </span>
                  </div>
                </div>

                {/* Progress Meter */}
                <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
                  <div className="flex justify-between items-baseline text-xs font-bold uppercase tracking-wider">
                    <span className="text-[#D9CDB7]">ยามใหญ่ ({yamStart.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} - {yamEnd.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.)</span>
                    <span className="text-[#D9BC82] font-display text-sm">เหลืออีก {remMin} นาที</span>
                  </div>
                  
                  <div className="h-2 w-full bg-[#1E293B]/60 rounded-full overflow-hidden border border-white/5 p-0.5">
                    <div 
                      className="h-full bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] rounded-full shadow-[0_0_12px_rgba(198,169,107,0.5)] transition-all duration-1000"
                      style={{ width: `${(1 - remaining / windowMs) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Astronomical Boundaries */}
                <div className="flex justify-between items-center pt-4 border-t border-white/10">
                  <div className="space-y-1">
                    <span className="text-[12px] text-[#D9CDB7] uppercase tracking-widest block font-bold">ขอบข่ายท้องฟ้า</span>
                    <div className="flex gap-4 text-xs font-semibold text-[#F8F6F1]">
                      <span className="flex items-center gap-1.5">☀️ ขึ้น {sunrise.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="flex items-center gap-1.5">☀️ ตก {sunset.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/25 px-2.5 py-1 rounded-full">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" />
                    <span className="text-[11px] font-bold text-green-400 tracking-widest uppercase">LIVE</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 🔮 อัฏฐกาลชั้นฉายประจำช่วงเวลานี้ (Current Active Sub-period Prophecy) */}
          <Card className="relative overflow-hidden border-[#D9BC82]/30 bg-gradient-to-br from-[#0A2240]/80 via-[#0A1628]/90 to-[#020617] p-6 shadow-[0_0_30px_rgba(217,188,130,0.1)]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#D9BC82]/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🔮</span>
                <div>
                  <h3 className="text-base font-bold text-[#F8F6F1] flex items-center gap-2">
                    <span>อัฏฐกาลชั้นฉายขณะนี้</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#D9BC82]/20 border border-[#D9BC82]/30 text-[#D9BC82] font-bold">
                      {PHASE_LABEL[data.phase]}
                    </span>
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    ช่วงเวลาย่อย 30 นาที ({currentSubYamStart.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} - {currentSubYamEnd.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.)
                  </p>
                </div>
              </div>
              
              <div className="text-right shrink-0">
                <span className="text-[12px] text-[#94A3B8] uppercase font-bold block">เวลานับถอยหลังชั้นฉาย</span>
                <span className="text-lg font-display font-black text-[#D9BC82] tabular-nums">
                  {currentSubRemMin} นาที {String(currentSubRemSec).padStart(2, "0")} วิ
                </span>
              </div>
            </div>

            {/* Sub-phase Visual Segment Tracker */}
            <div className="py-4">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {[
                  { phaseKey: "start", label: "ยามต้น (00-30 น.)", desc: liveChanChaiItem?.chanChai.start.text },
                  { phaseKey: "middle", label: "ยามกลาง (31-60 น.)", desc: liveChanChaiItem?.chanChai.middle.text },
                  { phaseKey: "end", label: "ยามปลาย (61-90 น.)", desc: liveChanChaiItem?.chanChai.end.text },
                ].map((item, idx) => {
                  const isActive = data.phase === item.phaseKey;
                  return (
                    <div
                      key={item.phaseKey}
                      className={`p-3 rounded-xl border transition-all ${
                        isActive
                          ? "bg-[#D9BC82]/20 border-[#D9BC82] shadow-[0_0_15px_rgba(217,188,130,0.2)] text-[#F8F6F1]"
                          : "bg-black/20 border-white/5 text-[#94A3B8]"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1 font-bold mb-1">
                        {isActive && <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />}
                        <span className={isActive ? "text-[#D9BC82]" : ""}>{item.label}</span>
                      </div>
                      <p className={`text-[12px] line-clamp-2 leading-relaxed ${isActive ? "text-[#F8F6F1] font-medium" : "text-[#94A3B8]/70"}`}>
                        {item.desc || "–"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Prophecy Quote Box */}
            {liveChanChaiSub && (
              <div className="mt-2 p-4 rounded-xl bg-black/40 border border-[#D9BC82]/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#D9BC82] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span>📜</span> คำพยากรณ์คัมภีร์ชั้นฉาย
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[12px] ${
                    liveChanChaiSub.quality === "good"
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-red-500/10 text-rose-300 border border-red-500/20"
                  }`}>
                    {liveChanChaiSub.quality === "good" ? "✅ ช่วงมงคลให้คุณ" : "⚠️ ช่วงควรระวังเป็นพิเศษ"}
                  </span>
                </div>
                <p className="text-base sm:text-lg font-bold text-[#F8F6F1] leading-relaxed italic">
                  "{liveChanChaiSub.text}"
                </p>
              </div>
            )}
          </Card>

          {/* 🧭 ฤกษ์เดินทางยามอัฏฐกาล */}
          {data.travelAuspiciousness && (
            <Card className={`overflow-hidden border transition-all ${
              data.travelAuspiciousness.level === "excellent"
                ? "bg-[#D9BC82]/5 border-[#D9BC82]/30 shadow-[0_0_20px_rgba(217,188,130,0.08)]"
                : data.travelAuspiciousness.level === "very_good"
                ? "bg-[#4B6FAE]/5 border-[#4B6FAE]/20 shadow-[0_0_20px_rgba(75,111,174,0.05)]"
                : data.travelAuspiciousness.level === "good"
                ? "bg-white/5 border-white/10"
                : "bg-red-950/10 border-red-500/20"
            }`}>
              <div className="p-4 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🧭</span>
                  <span className="text-sm font-bold text-[#F8F6F1] uppercase tracking-widest drop-shadow-sm">ฤกษ์สัญจรและการเดินทาง</span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span
                      key={i}
                      className={`text-sm ${
                        i < data.travelAuspiciousness.ticks
                          ? data.travelAuspiciousness.level === "excellent"
                            ? "text-[#D9BC82] drop-shadow-[0_0_5px_#D9BC82]"
                            : data.travelAuspiciousness.level === "very_good"
                            ? "text-[#4B6FAE] drop-shadow-[0_0_5px_#4B6FAE]"
                            : "text-green-400"
                          : "text-white/10"
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="shrink-0 flex flex-col items-center justify-center w-24 h-24 rounded-2xl border bg-black/20"
                  style={{
                    borderColor:
                      data.travelAuspiciousness.level === "excellent"
                        ? "rgba(217, 188, 130, 0.3)"
                        : data.travelAuspiciousness.level === "very_good"
                        ? "rgba(75, 111, 174, 0.3)"
                        : data.travelAuspiciousness.level === "good"
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(239, 68, 68, 0.2)",
                  }}
                >
                  <span className="text-sm text-[#D9CDB7] font-bold uppercase tracking-wider mb-1">ความมงคล</span>
                  <span className={`text-xl font-bold ${
                    data.travelAuspiciousness.level === "excellent"
                      ? "text-[#D9BC82]"
                      : data.travelAuspiciousness.level === "very_good"
                      ? "text-[#4B6FAE]"
                      : data.travelAuspiciousness.level === "good"
                      ? "text-green-400"
                      : "text-red-400"
                  }`}>
                    {data.travelAuspiciousness.ticks === 3 ? "ดีเยี่ยม" :
                     data.travelAuspiciousness.ticks === 2 ? "ดีมาก" :
                     data.travelAuspiciousness.ticks === 1 ? "ดี" : "ติดขัด"}
                  </span>
                  <span className="text-xs text-[#F8F6F1] mt-1 tabular-nums font-bold">
                    {data.travelAuspiciousness.ticks} / 3 ขีด
                  </span>
                </div>

                <div className="flex-1 space-y-1">
                  <span className="text-[13px] text-[#94A3B8] uppercase font-bold block">คำพยากรณ์เดินทางประจำช่วงเวลานี้</span>
                  <p className="text-base text-[#F8F6F1] font-medium leading-relaxed">
                    {data.travelAuspiciousness.description}
                  </p>
                  <p className="text-xs text-[#94A3B8] mt-1 italic">
                    {data.travelAuspiciousness.ticks === 0 
                      ? "⚠️ ยามติดขัด หลีกเลี่ยงการเริ่มต้นออกเดินทางสำคัญ หรือระมัดระวังความปลอดภัยเป็นพิเศษ" 
                      : "✨ ฤกษ์มงคลเหมาะสมสำหรับการเดินทางสัญจรและการติดต่อเจรจาธุรกิจ"}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* 💬 ถาม-ตอบยามอัฏฐกาล & ชั้นฉาย (Mobile-Friendly Interactive Q&A) */}
          {liveChanChaiItem && (
            <Card className="p-5 bg-gradient-to-br from-[#0A2240]/90 via-[#0A1628]/80 to-[#020617] border-[#D9BC82]/30 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#D9BC82]/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💬</span>
                  <div>
                    <h3 className="font-display text-base font-bold text-[#F8F6F1]">
                      ถาม-ตอบยามอัฏฐกาล & ชั้นฉาย
                    </h3>
                    <p className="text-[12px] text-[#D9BC82]">
                      กดเลือกเรื่องที่ต้องการตรวจ เพื่อดูคำทำนายเจาะลึกเฉพาะเรื่องทันที
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#D9BC82]/15 text-[#D9BC82] text-[11px] font-bold border border-[#D9BC82]/30 shrink-0">
                  ยาม{data.yamName} ({PHASE_LABEL[data.phase]})
                </span>
              </div>

              {/* Inquiry Topic Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-4">
                {[
                  { id: "news", icon: "🚩", label: "เรื่องที่ได้ยิน", q: "ข่าวที่ได้ยินจริงไหม?" },
                  { id: "sickness", icon: "🏥", label: "คนเจ็บไข้", q: "คนป่วยเป็นอย่างไร?" },
                  { id: "lostItem", icon: "🔍", label: "ของหาย", q: "ของหายจะได้คืนไหม?" },
                  { id: "travel", icon: "🚗", label: "การเดินทาง", q: "ควรเดินทางช่วงไหน?" },
                  { id: "bestTime", icon: "⭐", label: "เวลาที่ดีที่สุด", q: "เวลาทองของยามนี้?" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveInquiry(item.id as any)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                      activeInquiry === item.id
                        ? "bg-[#D9BC82] text-[#0A1628] border-[#D9BC82] font-black shadow-[0_0_15px_rgba(217,188,130,0.3)] scale-[1.02]"
                        : "bg-black/30 border-white/10 text-[#D9CDB7] hover:border-[#D9BC82]/40 hover:text-[#F8F6F1]"
                    }`}
                  >
                    <span className="text-base mb-0.5">{item.icon}</span>
                    <span className="text-[12px] font-bold">{item.label}</span>
                    <span className={`text-[10px] mt-0.5 truncate max-w-full ${
                      activeInquiry === item.id ? "text-[#0A1628]/80 font-medium" : "text-[#94A3B8]"
                    }`}>{item.q}</span>
                  </button>
                ))}
              </div>

              {/* Inquiry Answer Box */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                  <span className="text-[#D9BC82] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span>💡</span> คำพยากรณ์สำหรับคำถาม: {
                      activeInquiry === "news" ? "เรื่องที่ได้ยิน (ข่าวกาลกิณี/มงคล)" :
                      activeInquiry === "sickness" ? "คนเจ็บไข้ (พยากรณ์โรค)" :
                      activeInquiry === "lostItem" ? "ของหาย (โอกาสได้คืน/ที่ซ่อน)" :
                      activeInquiry === "travel" ? "การเดินทาง 3 ช่วงระยะ" : "เวลามงคลที่ดีที่สุดประจำยาม"
                    }
                  </span>
                  <span className="text-[11px] text-[#94A3B8]">
                    ตามคัมภีร์อัฏฐกาล 7 ยาม
                  </span>
                </div>

                {activeInquiry === "news" && (
                  <div className="space-y-1">
                    <p className="text-base font-bold text-yellow-100 leading-relaxed">
                      "{liveChanChaiItem.news}"
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      {liveChanChaiItem.news.includes("จริง") ? "✓ ข้อมูลหรือข่าวสารที่ได้ยินในยามนี้ มีน้ำหนักความจริงสูง" : "✕ ควรฟังหูไว้หู อย่าเพิ่งปักใจเชื่อในทันที"}
                    </p>
                  </div>
                )}

                {activeInquiry === "sickness" && (
                  <div className="space-y-1">
                    <p className="text-base font-bold text-rose-200 leading-relaxed">
                      "{liveChanChaiItem.sickness}"
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      การดูแลรักษาพยาบาลในยามนี้ควรปฏิบัติตามคำแนะนำของแพทย์อย่างเคร่งครัด
                    </p>
                  </div>
                )}

                {activeInquiry === "lostItem" && (
                  <div className="space-y-1">
                    <p className="text-base font-bold text-amber-200 leading-relaxed">
                      "{liveChanChaiItem.lostItem}"
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      คำแนะนำสถานที่ค้นหาตามธาตุและทิศทางของดาวเจ้ายาม
                    </p>
                  </div>
                )}

                {activeInquiry === "travel" && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className={`p-2.5 rounded-lg border text-xs ${data.phase === "start" ? "bg-[#D9BC82]/15 border-[#D9BC82]" : "bg-white/[0.02] border-white/5"}`}>
                        <span className="font-bold text-[#D9BC82] block mb-1">ยามต้น (30 นาทีแรก)</span>
                        <p className="text-[#F8F6F1]">{liveChanChaiItem.travel.start}</p>
                      </div>
                      <div className={`p-2.5 rounded-lg border text-xs ${data.phase === "middle" ? "bg-[#D9BC82]/15 border-[#D9BC82]" : "bg-white/[0.02] border-white/5"}`}>
                        <span className="font-bold text-[#D9BC82] block mb-1">ยามกลาง (30 นาทีกลาง)</span>
                        <p className="text-[#F8F6F1]">{liveChanChaiItem.travel.middle}</p>
                      </div>
                      <div className={`p-2.5 rounded-lg border text-xs ${data.phase === "end" ? "bg-[#D9BC82]/15 border-[#D9BC82]" : "bg-white/[0.02] border-white/5"}`}>
                        <span className="font-bold text-[#D9BC82] block mb-1">ยามปลาย (30 นาทีสุดท้าย)</span>
                        <p className="text-[#F8F6F1]">{liveChanChaiItem.travel.end}</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeInquiry === "bestTime" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#94A3B8]">เวลาที่ดีที่สุดของยามนี้คือ:</span>
                      <span className="px-3 py-1 rounded-lg bg-[#D9BC82]/20 text-[#D9BC82] font-black border border-[#D9BC82]/40 text-sm">
                        {liveChanChaiItem.bestTime}
                      </span>
                    </div>
                    <p className="text-xs text-[#D9CDB7] leading-relaxed">
                      หากต้องการนัดหมาย เจรจาสำคัญ หรือออกเดินทาง แนะนำให้เจาะจงเลือกช่วงเวลา <strong>{liveChanChaiItem.bestTime}</strong> ของยามนี้เพื่อให้เกิดผลสำเร็จสูงสุด
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* 4 Pillars of Yam Prophecy Summary Cards */}
          {liveChanChaiItem && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* เรื่องที่ได้ยิน */}
              <Card className="p-4 bg-[#0A1628]/40 border-white/10">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base">🚩</span>
                  <span className="text-[11px] font-bold text-[#D9BC82] uppercase tracking-wider">เรื่องที่ได้ยิน</span>
                </div>
                <p className="text-xs sm:text-sm text-yellow-100 font-semibold leading-relaxed line-clamp-3">
                  {liveChanChaiItem.news}
                </p>
              </Card>

              {/* คนเจ็บไข้ */}
              <Card className="p-4 bg-[#0A1628]/40 border-white/10">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base">🏥</span>
                  <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">คนเจ็บไข้</span>
                </div>
                <p className="text-xs sm:text-sm text-rose-100 font-semibold leading-relaxed line-clamp-3">
                  {liveChanChaiItem.sickness}
                </p>
              </Card>

              {/* ของหาย */}
              <Card className="p-4 bg-[#0A1628]/40 border-white/10">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base">🔍</span>
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">ของหาย</span>
                </div>
                <p className="text-xs sm:text-sm text-amber-100 font-semibold leading-relaxed line-clamp-3">
                  {liveChanChaiItem.lostItem}
                </p>
              </Card>

              {/* เวลาที่ดี */}
              <Card className="p-4 bg-[#0A1628]/40 border-white/10">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base">⭐</span>
                  <span className="text-[11px] font-bold text-[#D9BC82] uppercase tracking-wider">เวลาที่ดี</span>
                </div>
                <p className="text-sm text-[#D9BC82] font-black leading-relaxed">
                  {liveChanChaiItem.bestTime}
                </p>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* 🔮 MANUAL ASHTA CALCULATOR VIEW */}
      {activeTab === "ashta" && ashtaResult && (() => {
        const periodLabel = ashtaResult.period === "day" ? "กลางวัน" : "กลางคืน";
        const symbol = PLANET_SYMBOLS[ashtaResult.yamName] ?? "✦";
        const targetDayTh = DAY_NAMES_TH[new Date(ashtaResult.date).getDay()] || "อาทิตย์";
        const ashtaChanChaiItem = getChanChaiItem(ashtaResult.yamName);
        const ashtaChanChaiSub = ashtaChanChaiItem?.chanChai[ashtaResult.phase as ChanChaiPhase];

        return (
          <div className="space-y-6 animate-fade-in">
            {/* Input form */}
            <Card className="bg-[#0A1628]/40 border-white/5 p-5">
              <h3 className="font-display text-sm font-bold text-[#F8F6F1] mb-4 border-b border-white/5 pb-2 flex items-center gap-1.5">
                <span>🔮</span> ระบบคำนวณยามอัฏฐกาลอัตโนมัติ (Ashta-Kala manual calculator)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">1. เลือกวัน (พ.ศ.) *</label>
                  <div className="grid grid-cols-3 gap-1">
                    <select 
                      value={ashtaDay} 
                      onChange={(e) => setAshtaDay(Number(e.target.value))}
                      className="bg-slate-950/40 border border-[#D9BC82]/20 text-[#F8F6F1] rounded-xl px-1.5 py-2.5 text-xs focus:border-[#D9BC82]/50 outline-none"
                    >
                      {Array.from({ length: 31 }).map((_, i) => (
                        <option key={i + 1} value={i + 1} className="bg-[#020617]">{i + 1}</option>
                      ))}
                    </select>
                    <select 
                      value={ashtaMonth} 
                      onChange={(e) => setAshtaMonth(Number(e.target.value))}
                      className="bg-slate-950/40 border border-[#D9BC82]/20 text-[#F8F6F1] rounded-xl px-1.5 py-2.5 text-xs focus:border-[#D9BC82]/50 outline-none"
                    >
                      {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => (
                        <option key={i + 1} value={i + 1} className="bg-[#020617]">{m}</option>
                      ))}
                    </select>
                    <select 
                      value={ashtaYear} 
                      onChange={(e) => setAshtaYear(Number(e.target.value))}
                      className="bg-slate-950/40 border border-[#D9BC82]/20 text-[#F8F6F1] rounded-xl px-1.5 py-2.5 text-xs focus:border-[#D9BC82]/50 outline-none"
                    >
                      {Array.from({ length: 21 }).map((_, i) => {
                        const y = 2560 + i;
                        return <option key={y} value={y} className="bg-[#020617]">{y}</option>;
                      })}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">2. ใส่เวลา (ชั่วโมง:นาที) *</label>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={ashtaTime}
                      onChange={(e) => setAshtaTime(e.target.value)}
                      className="flex-1 bg-[#1E293B]/40 border border-[#D9BC82]/20 rounded-xl px-3 py-2 text-[#F8F6F1] font-display text-sm focus:border-[#D9BC82]/50 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleSetAshtaNow}
                      className="px-3 py-2 rounded-xl text-[13px] font-bold uppercase tracking-widest transition-all bg-[#D9BC82]/10 border border-[#D9BC82]/20 text-[#D9BC82] hover:bg-[#D9BC82]/20"
                    >
                      ปัจจุบัน
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAshtaCalculate}
                  className="py-2.5 rounded-xl bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#0A1628] font-bold text-xs tracking-widest uppercase hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(198,169,107,0.15)]"
                >
                  คำนวณยามอัฏฐกาล ✨
                </button>
              </div>
            </Card>

            <div className="text-center">
              <span className="text-[13px] font-bold uppercase tracking-widest px-4 py-1 rounded-full bg-[#D9BC82]/10 border border-[#D9BC82]/20 text-[#D9BC82]">
                วัน{targetDayTh} — {periodLabel}
              </span>
            </div>

            {/* 4-card summary grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl text-center bg-[#1E293B]/20 border border-white/5 shadow-inner">
                <span className="text-[12px] text-[#94A3B8] uppercase tracking-widest block mb-2 font-bold">ยามที่</span>
                <span className="text-3xl font-black text-[#D9BC82]">{ashtaResult.yamNumber}</span>
              </div>

              <div className="p-4 rounded-2xl text-center bg-[#1E293B]/20 border border-white/5 shadow-inner">
                <span className="text-[12px] text-[#94A3B8] uppercase tracking-widest block mb-2 font-bold">ชื่อยาม</span>
                <span className="text-base font-bold text-[#F8F6F1]">{ashtaResult.yamName}</span>
              </div>

              <div className="p-4 rounded-2xl text-center bg-[#1E293B]/20 border border-white/5 shadow-inner">
                <span className="text-[12px] text-[#94A3B8] uppercase tracking-widest block mb-2 font-bold">ดาวเสวยยาม</span>
                <span className="text-base font-bold text-[#D9BC82] flex items-center justify-center gap-1">
                  <span>{symbol}</span>
                  <span>{ashtaResult.yamName}</span>
                </span>
              </div>

              <div className="p-4 rounded-2xl text-center bg-[#1E293B]/20 border border-white/5 shadow-inner">
                <span className="text-[12px] text-[#94A3B8] uppercase tracking-widest block mb-2 font-bold">ช่วงเวลายาม</span>
                <span className="text-xs font-bold text-[#F8F6F1] block">
                  {new Date(ashtaResult.date).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
                </span>
                <span className="text-[12px] text-[#94A3B8] block mt-0.5">
                  ({PHASE_LABEL[ashtaResult.phase]})
                </span>
              </div>
            </div>

            {/* 🔮 อัฏฐกาลชั้นฉายประจำช่วงเวลาที่คำนวณ */}
            {ashtaChanChaiSub && (
              <Card className="p-5 bg-gradient-to-br from-[#0A2240] to-[#020617] border-[#D9BC82]/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#D9BC82] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span>🔮</span> คำพยากรณ์อัฏฐกาลชั้นฉาย ({PHASE_LABEL[ashtaResult.phase]})
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[12px] ${
                    ashtaChanChaiSub.quality === "good"
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-red-500/10 text-rose-300 border border-red-500/20"
                  }`}>
                    {ashtaChanChaiSub.quality === "good" ? "✅ ช่วงมงคลให้คุณ" : "⚠️ ช่วงควรระวังเป็นพิเศษ"}
                  </span>
                </div>
                <p className="text-base sm:text-lg font-bold text-[#F8F6F1] leading-relaxed italic">
                  "{ashtaChanChaiSub.text}"
                </p>
              </Card>
            )}

            {/* 💬 ถาม-ตอบยามอัฏฐกาล & ชั้นฉาย (Mobile-Friendly Interactive Q&A for calculated time) */}
            {ashtaChanChaiItem && (
              <Card className="p-5 bg-gradient-to-br from-[#0A2240]/90 via-[#0A1628]/80 to-[#020617] border-[#D9BC82]/30 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#D9BC82]/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💬</span>
                    <div>
                      <h3 className="font-display text-base font-bold text-[#F8F6F1]">
                        ถาม-ตอบยามอัฏฐกาล & ชั้นฉาย
                      </h3>
                      <p className="text-[12px] text-[#D9BC82]">
                        กดเลือกเรื่องที่ต้องการตรวจ สำหรับยามที่คำนวณนี้
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#D9BC82]/15 text-[#D9BC82] text-[11px] font-bold border border-[#D9BC82]/30 shrink-0">
                    ยาม{ashtaResult.yamName} ({PHASE_LABEL[ashtaResult.phase]})
                  </span>
                </div>

                {/* Inquiry Topic Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-4">
                  {[
                    { id: "news", icon: "🚩", label: "เรื่องที่ได้ยิน", q: "ข่าวที่ได้ยินจริงไหม?" },
                    { id: "sickness", icon: "🏥", label: "คนเจ็บไข้", q: "คนป่วยเป็นอย่างไร?" },
                    { id: "lostItem", icon: "🔍", label: "ของหาย", q: "ของหายจะได้คืนไหม?" },
                    { id: "travel", icon: "🚗", label: "การเดินทาง", q: "ควรเดินทางช่วงไหน?" },
                    { id: "bestTime", icon: "⭐", label: "เวลาที่ดีที่สุด", q: "เวลาทองของยามนี้?" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAshtaInquiry(item.id as any)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                        ashtaInquiry === item.id
                          ? "bg-[#D9BC82] text-[#0A1628] border-[#D9BC82] font-black shadow-[0_0_15px_rgba(217,188,130,0.3)] scale-[1.02]"
                          : "bg-black/30 border-white/10 text-[#D9CDB7] hover:border-[#D9BC82]/40 hover:text-[#F8F6F1]"
                      }`}
                    >
                      <span className="text-base mb-0.5">{item.icon}</span>
                      <span className="text-[12px] font-bold">{item.label}</span>
                      <span className={`text-[10px] mt-0.5 truncate max-w-full ${
                        ashtaInquiry === item.id ? "text-[#0A1628]/80 font-medium" : "text-[#94A3B8]"
                      }`}>{item.q}</span>
                    </button>
                  ))}
                </div>

                {/* Inquiry Answer Box */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                    <span className="text-[#D9BC82] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span>💡</span> คำพยากรณ์สำหรับคำถาม: {
                        ashtaInquiry === "news" ? "เรื่องที่ได้ยิน (ข่าวกาลกิณี/มงคล)" :
                        ashtaInquiry === "sickness" ? "คนเจ็บไข้ (พยากรณ์โรค)" :
                        ashtaInquiry === "lostItem" ? "ของหาย (โอกาสได้คืน/ที่ซ่อน)" :
                        ashtaInquiry === "travel" ? "การเดินทาง 3 ช่วงระยะ" : "เวลามงคลที่ดีที่สุดประจำยาม"
                      }
                    </span>
                    <span className="text-[11px] text-[#94A3B8]">
                      ตามคัมภีร์อัฏฐกาล 7 ยาม
                    </span>
                  </div>

                  {ashtaInquiry === "news" && (
                    <div className="space-y-1">
                      <p className="text-base font-bold text-yellow-100 leading-relaxed">
                        "{ashtaChanChaiItem.news}"
                      </p>
                      <p className="text-xs text-[#94A3B8]">
                        {ashtaChanChaiItem.news.includes("จริง") ? "✓ ข้อมูลหรือข่าวสารที่ได้ยินในยามนี้ มีน้ำหนักความจริงสูง" : "✕ ควรฟังหูไว้หู อย่าเพิ่งปักใจเชื่อในทันที"}
                      </p>
                    </div>
                  )}

                  {ashtaInquiry === "sickness" && (
                    <div className="space-y-1">
                      <p className="text-base font-bold text-rose-200 leading-relaxed">
                        "{ashtaChanChaiItem.sickness}"
                      </p>
                      <p className="text-xs text-[#94A3B8]">
                        การดูแลรักษาพยาบาลในยามนี้ควรปฏิบัติตามคำแนะนำของแพทย์อย่างเคร่งครัด
                      </p>
                    </div>
                  )}

                  {ashtaInquiry === "lostItem" && (
                    <div className="space-y-1">
                      <p className="text-base font-bold text-amber-200 leading-relaxed">
                        "{ashtaChanChaiItem.lostItem}"
                      </p>
                      <p className="text-xs text-[#94A3B8]">
                        คำแนะนำสถานที่ค้นหาตามธาตุและทิศทางของดาวเจ้ายาม
                      </p>
                    </div>
                  )}

                  {ashtaInquiry === "travel" && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className={`p-2.5 rounded-lg border text-xs ${ashtaResult.phase === "start" ? "bg-[#D9BC82]/15 border-[#D9BC82]" : "bg-white/[0.02] border-white/5"}`}>
                          <span className="font-bold text-[#D9BC82] block mb-1">ยามต้น (30 นาทีแรก)</span>
                          <p className="text-[#F8F6F1]">{ashtaChanChaiItem.travel.start}</p>
                        </div>
                        <div className={`p-2.5 rounded-lg border text-xs ${ashtaResult.phase === "middle" ? "bg-[#D9BC82]/15 border-[#D9BC82]" : "bg-white/[0.02] border-white/5"}`}>
                          <span className="font-bold text-[#D9BC82] block mb-1">ยามกลาง (30 นาทีกลาง)</span>
                          <p className="text-[#F8F6F1]">{ashtaChanChaiItem.travel.middle}</p>
                        </div>
                        <div className={`p-2.5 rounded-lg border text-xs ${ashtaResult.phase === "end" ? "bg-[#D9BC82]/15 border-[#D9BC82]" : "bg-white/[0.02] border-white/5"}`}>
                          <span className="font-bold text-[#D9BC82] block mb-1">ยามปลาย (30 นาทีสุดท้าย)</span>
                          <p className="text-[#F8F6F1]">{ashtaChanChaiItem.travel.end}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {ashtaInquiry === "bestTime" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#94A3B8]">เวลาที่ดีที่สุดของยามนี้คือ:</span>
                        <span className="px-3 py-1 rounded-lg bg-[#D9BC82]/20 text-[#D9BC82] font-black border border-[#D9BC82]/40 text-sm">
                          {ashtaChanChaiItem.bestTime}
                        </span>
                      </div>
                      <p className="text-xs text-[#D9CDB7] leading-relaxed">
                        หากต้องการนัดหมาย เจรจาสำคัญ หรือออกเดินทาง แนะนำให้เจาะจงเลือกช่วงเวลา <strong>{ashtaChanChaiItem.bestTime}</strong> ของยามนี้เพื่อให้เกิดผลสำเร็จสูงสุด
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* 4-Pillar Prediction Cards */}
            {ashtaChanChaiItem && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-base">🚩</span>
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#D9BC82]">เรื่องที่ได้ยิน (ข่าวกาลกิณี/มงคล)</span>
                  </div>
                  <p className="text-sm sm:text-base leading-relaxed text-yellow-100 font-semibold">{ashtaChanChaiItem.news}</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-base">🏥</span>
                    <span className="text-[12px] font-bold uppercase tracking-wider text-rose-300">คนเจ็บไข้</span>
                  </div>
                  <p className="text-sm sm:text-base leading-relaxed text-yellow-100 font-semibold">{ashtaChanChaiItem.sickness}</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-base">🔍</span>
                    <span className="text-[12px] font-bold uppercase tracking-wider text-amber-300">ของหาย</span>
                  </div>
                  <p className="text-sm sm:text-base leading-relaxed text-yellow-100 font-semibold">{ashtaChanChaiItem.lostItem}</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-base">⭐</span>
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#D9BC82]">เวลาที่ดีที่สุด</span>
                  </div>
                  <p className="text-sm sm:text-base leading-relaxed text-[#D9BC82] font-black">
                    {ashtaChanChaiItem.bestTime}
                  </p>
                </div>
              </div>
            )}

            {/* Travel timing guide — all 3 sub-yam */}
            {ashtaChanChaiItem && (
              <div className="p-4 rounded-2xl space-y-2 bg-[#0A1628]/40 border border-white/5">
                <span className="text-[12px] font-bold uppercase tracking-widest text-[#94A3B8] block">🕐 การเดินทางตามช่วงยามทั้ง 3 ระยะ</span>
                {[
                  { label: "ยามต้น (0 - 30 นาทีแรก)", val: ashtaChanChaiItem.travel.start, phase: "start" },
                  { label: "ยามกลาง (31 - 60 นาที)", val: ashtaChanChaiItem.travel.middle, phase: "middle" },
                  { label: "ยามปลาย (61 - 90 นาทีสุดท้าย)", val: ashtaChanChaiItem.travel.end, phase: "end" },
                ].map((t, i) => {
                  const isActive = ashtaResult.phase === t.phase;
                  return (
                    <div key={i} className="flex gap-2 items-start rounded-xl px-2.5 py-2 transition-all"
                      style={isActive ? { background: "rgba(198,169,107,0.12)", border: "1px solid rgba(217,188,130,0.25)" } : {}}>
                      <span className={`text-[12px] font-black uppercase tracking-wider shrink-0 pt-0.5 ${
                        isActive ? "text-[#D9BC82]" : "text-[#94A3B8]"
                      }`}>{t.label}{isActive ? " ◀" : ""}</span>
                      <p className={`text-[13px] leading-relaxed ${
                        isActive ? "text-[#F8F6F1]" : "text-[#94A3B8]"
                      }`}>{t.val}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Best time highlight */}
            {ashtaChanChaiItem?.bestTime && (
              <div className="p-4 rounded-2xl flex items-center gap-3 bg-gradient-to-r from-[#C6A96B]/15 to-[#D9BC82]/5 border border-[#D9BC82]/30 shadow-[0_0_20px_rgba(217,188,130,0.08)]">
                <span className="text-xl">⭐</span>
                <div>
                  <span className="text-[12px] text-[#D9BC82] font-bold uppercase tracking-widest block">เวลามงคลที่ดีที่สุดประจำยาม</span>
                  <p className="text-sm text-[#D9BC82] font-bold mt-0.5">{ashtaChanChaiItem.bestTime}</p>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ✨ INTERACTIVE AUSPICIOUS FINDER VIEW */}
      {activeTab === "finder" && (
        <div className="space-y-6">
          <Card className="bg-[#0A1628]/40 border-white/5 p-6">
            <h3 className="font-display text-lg font-bold text-[#F8F6F1] mb-5 border-b border-white/5 pb-2">
              🧭 ระบบวิเคราะห์เลือกฤกษ์ยามอัจฉริยะ
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#D9BC82] uppercase tracking-wider block">1. เลือกเรื่องที่ต้องการ</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "love", icon: "💖", label: "ง้อแฟน" },
                    { id: "trade", icon: "💰", label: "ค้าขาย" },
                    { id: "negotiate", icon: "🗣️", label: "เจรจา" },
                    { id: "travel", icon: "✈️", label: "เดินทาง" },
                  ].map(topic => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setSelectedTopic(topic.id as any)}
                      className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.97] ${
                        selectedTopic === topic.id
                          ? "bg-[#D9BC82]/15 border-[#D9BC82]/40 text-[#D9BC82] shadow-[0_0_12px_rgba(217,188,130,0.1)] font-bold"
                          : "bg-white/5 border-transparent text-[#94A3B8] hover:border-white/10 hover:text-[#F8F6F1]"
                      }`}
                    >
                      <span className="text-lg">{topic.icon}</span>
                      <span className="text-xs font-bold">{topic.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-[#D9BC82] uppercase tracking-wider block">2. เลือกวัน (พ.ศ.)</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <select 
                    value={finderDay} 
                    onChange={(e) => setFinderDay(Number(e.target.value))}
                    className="bg-slate-950/40 border border-[#D9BC82]/20 text-[#F8F6F1] rounded-xl px-2 py-2.5 text-xs focus:border-[#D9BC82]/50 outline-none"
                  >
                    {Array.from({ length: 31 }).map((_, i) => (
                      <option key={i + 1} value={i + 1} className="bg-[#020617]">{i + 1}</option>
                    ))}
                  </select>
                  <select 
                    value={finderMonth} 
                    onChange={(e) => setFinderMonth(Number(e.target.value))}
                    className="bg-slate-950/40 border border-[#D9BC82]/20 text-[#F8F6F1] rounded-xl px-2 py-2.5 text-xs focus:border-[#D9BC82]/50 outline-none"
                  >
                    {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => (
                      <option key={i + 1} value={i + 1} className="bg-[#020617]">{m}</option>
                    ))}
                  </select>
                  <select 
                    value={finderYear} 
                    onChange={(e) => setFinderYear(Number(e.target.value))}
                    className="bg-slate-950/40 border border-[#D9BC82]/20 text-[#F8F6F1] rounded-xl px-2 py-2.5 text-xs focus:border-[#D9BC82]/50 outline-none"
                  >
                    {Array.from({ length: 21 }).map((_, i) => {
                      const y = 2560 + i;
                      return <option key={y} value={y} className="bg-[#020617]">{y}</option>;
                    })}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleSetToday}
                    className="py-1.5 px-3 rounded-lg border border-white/5 bg-white/5 text-[13px] font-bold text-[#94A3B8] hover:bg-white/10 hover:text-[#F8F6F1] transition-all"
                  >
                    📅 วันนี้
                  </button>
                  <button
                    type="button"
                    onClick={handleSetTomorrow}
                    className="py-1.5 px-3 rounded-lg border border-white/5 bg-white/5 text-[13px] font-bold text-[#94A3B8] hover:bg-white/10 hover:text-[#F8F6F1] transition-all"
                  >
                    📅 พรุ่งนี้
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-[#D9BC82] uppercase tracking-wider block">3. ใส่เวลา</label>
                <div className="relative">
                  <input
                    type="time"
                    value={finderTime}
                    onChange={(e) => setFinderTime(e.target.value)}
                    className="w-full bg-[#1E293B]/40 border border-white/10 rounded-xl px-4 py-3 text-[#F8F6F1] font-display text-lg focus:border-[#D9BC82]/40 outline-none transition-all"
                  />
                </div>
                <span className="text-[13px] text-[#94A3B8] block italic">*ใช้คำนวณสลับยามอัฏฐกาล 1.5 ชม. ตามดาราศาสตร์จริง</span>
              </div>
            </div>

            <button
              onClick={handleCalculateFinder}
              className="w-full py-3.5 mt-6 rounded-xl bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#0A1628] font-bold text-sm tracking-widest uppercase hover:brightness-105 active:scale-[0.99] transition-all shadow-[0_0_24px_rgba(198,169,107,0.15)] flex items-center justify-center gap-2"
            >
              คำนวณเวลาที่เหมาะที่สุด ✨
            </button>
          </Card>

          {calculatedResult ? (
            <div className="space-y-6 animate-fade-in">
              <Card className="bg-[#0A1628]/40 border-[#D9BC82]/15 overflow-hidden">
                <div className="p-4 bg-[#D9BC82]/5 border-b border-[#D9BC82]/10 flex items-center gap-2">
                  <span className="text-[#D9BC82]">🏆</span>
                  <span className="text-xs font-bold text-[#D9BC82] uppercase tracking-widest">ผลลัพธ์แนะนำจากการคำนวณ</span>
                </div>

                <div className="p-6 flex flex-col md:flex-row items-center md:items-stretch gap-6">
                  <div className="flex flex-col items-center justify-center text-center p-5 bg-black/30 rounded-2xl border border-white/5 w-full md:w-48 shrink-0">
                    <span className="text-[13px] text-[#94A3B8] uppercase font-bold block mb-1">คะแนนความเหมาะสม</span>
                    <div className="flex items-baseline gap-1 mt-1 text-[#D9BC82]">
                      <span className="text-5xl font-display font-bold">{calculatedResult.advice.score.toFixed(1)}</span>
                      <span className="text-sm text-[#94A3B8]">/10</span>
                    </div>
                    <div className="flex gap-0.5 mt-2 text-[#D9BC82]">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const starVal = i + 1;
                        const scoreHalf = calculatedResult.advice.score / 2;
                        return (
                          <span key={i} className="text-sm drop-shadow-[0_0_4px_rgba(217,188,130,0.5)]">
                            {starVal <= scoreHalf ? "★" : starVal - 0.5 <= scoreHalf ? "⯪" : "☆"}
                          </span>
                        );
                      })}
                    </div>
                    <span className={`text-xs font-bold mt-3 px-3 py-0.5 rounded-full ${
                      calculatedResult.advice.score >= 8.5
                        ? "bg-[#D9BC82]/15 text-[#D9BC82]"
                        : calculatedResult.advice.score >= 6.5
                        ? "bg-[#4B6FAE]/15 text-[#4B6FAE]"
                        : "bg-red-400/10 text-red-400"
                    }`}>
                      {calculatedResult.advice.ratingText}
                    </span>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] font-bold">
                        <span>🕒</span> ช่วงเวลาที่ดีที่สุดของยามนี้
                      </div>
                      <h4 className="font-display text-2xl font-bold text-[#F8F6F1]">{calculatedResult.timeLabel}</h4>
                      <div className="flex gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[13px] font-bold text-[#D9BC82]">
                          ยาม{PHASE_LABEL[calculatedResult.phase]}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[13px] font-bold text-[#94A3B8]">
                          ดาว{calculatedResult.yamName} ({PLANET_SYMBOLS[calculatedResult.yamName]})
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-[#D9BC82]/5 rounded-xl border border-[#D9BC82]/10">
                      <p className="text-sm text-[#D9CDB7] leading-relaxed">
                        {calculatedResult.advice.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-[#10B981]/5 border-[#10B981]/15 p-5">
                  <div className="flex items-center gap-2 text-[#10B981] font-bold text-xs uppercase tracking-wider mb-3">
                    <span className="text-base">✓</span> วันนี้ควรทำอะไร
                  </div>
                  <ul className="space-y-2">
                    {calculatedResult.advice.shouldDo.map((item: string, i: number) => (
                      <li key={i} className="text-xs text-[#D9CDB7] leading-relaxed flex items-start gap-1.5">
                        <span className="text-[#10B981] shrink-0 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card className="bg-red-500/5 border-red-500/15 p-5">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider mb-3">
                    <span className="text-base">✕</span> สิ่งที่ควรเลี่ยง
                  </div>
                  <ul className="space-y-2">
                    {calculatedResult.advice.shouldAvoid.map((item: string, i: number) => (
                      <li key={i} className="text-xs text-[#D9CDB7] leading-relaxed flex items-start gap-1.5">
                        <span className="text-red-400 shrink-0 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card className="bg-[#4B6FAE]/5 border-[#4B6FAE]/15 p-5 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-[#4B6FAE] font-bold text-xs uppercase tracking-wider mb-3">
                    <span className="text-base">💬</span> คำแนะนำการใช้คำพูด
                  </div>
                  <div className="p-3 bg-[#4B6FAE]/10 rounded-xl rounded-tl-none border border-[#4B6FAE]/20 text-xs italic text-[#D9CDB7] leading-relaxed relative my-auto shadow-inner">
                    "{calculatedResult.advice.speechTemplate}"
                  </div>
                  <p className="text-[13px] text-[#94A3B8] italic mt-3 text-right">
                    *เจรจาด้วยน้ำเสียงนุ่มนวล มุ่งมั่นและจริงใจ
                  </p>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="p-10 text-center border-dashed border-white/5 bg-transparent">
              <span className="text-4xl block mb-2 opacity-55">🎯</span>
              <p className="text-sm text-[#94A3B8]">
                ป้อนข้อมูลด้านบนแล้วกด "คำนวณเวลาที่เหมาะที่สุด" เพื่อประเมินฤกษ์มีชัยประจำตัวคุณล่วงหน้า
              </p>
            </Card>
          )}
        </div>
      )}

      {/* 📅 WATCH GRID VIEW (กระดานตารางยาม 8x7) */}
      {activeTab === "grid" && (
        <div className="space-y-6">
          <div className="flex bg-[#0A1628]/60 p-1 rounded-2xl border border-white/5 gap-1 w-full max-w-md mx-auto">
            <button
              onClick={() => {
                setGridPeriod("day");
                setSelectedGridCell(null);
                setGridDetailAdvice(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                gridPeriod === "day"
                  ? "bg-[#D9BC82] text-[#0A1628] shadow-[0_0_8px_rgba(217,188,130,0.2)]"
                  : "text-[#94A3B8] hover:text-[#F8F6F1]"
              }`}
            >
              ☀️ ยามกลางวัน (06:01 - 18:00)
            </button>
            <button
              onClick={() => {
                setGridPeriod("night");
                setSelectedGridCell(null);
                setGridDetailAdvice(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                gridPeriod === "night"
                  ? "bg-[#D9BC82] text-[#0A1628] shadow-[0_0_8px_rgba(217,188,130,0.2)]"
                  : "text-[#94A3B8] hover:text-[#F8F6F1]"
              }`}
            >
              🌙 ยามกลางคืน (18:01 - 06:00)
            </button>
          </div>

          {/* 8x7 Watch Grid Table */}
          <Card className="p-0 overflow-hidden bg-[#0A1628]/40 border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  {/* Row 1: กลางวัน / กลางคืน + 8 ช่วงเวลายามใหญ่ */}
                  <tr className="border-b border-white/10 bg-[#0A2240]/80 text-[#D9BC82]">
                    <th className="p-2.5 text-xs font-bold text-center border-r border-white/10 w-24 bg-[#0A1628]/90">
                      {gridPeriod === "day" ? "กลางวัน" : "กลางคืน"}
                    </th>
                    {(gridPeriod === "day" ? DAY_GRID_HEADER_TIMES : NIGHT_GRID_HEADER_TIMES).map((item, i) => (
                      <th key={i} className="p-2 text-center border-r border-white/10 last:border-r-0 bg-[#0A2240]/60">
                        <span className="text-xs font-bold text-[#F8F6F1] font-mono block">
                          {item.major}
                        </span>
                      </th>
                    ))}
                  </tr>

                  {/* Row 2: วัน + 24 ช่วงเวลาย่อย (ต้น กลาง ปลาย) */}
                  <tr className="border-b border-white/10 bg-[#0A1628]/90">
                    <th className="p-2 text-xs font-bold text-center text-[#F8F6F1] border-r border-white/10 bg-white/[0.04]">
                      วัน
                    </th>
                    {(gridPeriod === "day" ? DAY_GRID_HEADER_TIMES : NIGHT_GRID_HEADER_TIMES).map((item, i) => (
                      <th key={i} className="p-1 border-r border-white/10 last:border-r-0 bg-[#0A1628]/80">
                        <div className="grid grid-cols-3 gap-0.5 text-center">
                          {item.subs.map((subTime, sIdx) => (
                            <div
                              key={sIdx}
                              className="bg-black/30 rounded px-0.5 py-1 text-[11px] font-mono text-[#D9CDB7] font-semibold"
                            >
                              {subTime}
                            </div>
                          ))}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAY_NAMES_TH.map((dayName, dIdx) => {
                    const dayNameEn = DAY_NAMES_EN[dIdx]!;
                    const table = gridPeriod === "day" ? yamDayTable[dayNameEn] : yamNightTable[dayNameEn];
                    const subTable = gridPeriod === "day" ? yamDaySubTable[dayNameEn] : yamNightSubTable[dayNameEn];

                    return (
                      <tr key={dIdx} className="border-b border-white/5 hover:bg-white/[0.01]">
                        <td className="p-3 text-xs font-bold text-[#F8F6F1] bg-white/[0.01] border-r border-white/5 text-center">
                          {dayName}
                        </td>
                        
                        {table.map((yamName: string, yIdx: number) => {
                          const isSelected = selectedGridCell?.dayName === dayName && selectedGridCell?.yamNumber === yIdx + 1;

                          return (
                            <td
                              key={yIdx}
                              onClick={() => handleGridCellClick(dayName, yIdx + 1)}
                              className={`p-2 text-center cursor-pointer transition-all border-r border-white/5 select-none align-top ${
                                isSelected
                                  ? "bg-[#D9BC82]/15 text-[#D9BC82] ring-1 ring-inset ring-[#D9BC82]"
                                  : "hover:bg-white/5"
                              }`}
                            >
                              <div className="text-xs font-bold flex flex-col items-center gap-1 min-w-[70px]">
                                <span className="text-base text-[#D9BC82]" style={{ fontFamily: "serif" }}>
                                  {PLANET_SYMBOLS[yamName] || "✦"}
                                </span>
                                <span className={`text-[13px] font-bold ${isSelected ? "text-[#D9BC82]" : "text-[#D9CDB7]"}`}>
                                  {yamName}
                                </span>
                                <div className="grid grid-cols-3 gap-0.5 w-full mt-1 border-t border-white/10 pt-1">
                                  {(["ต้น","กลาง","ปลาย"] as const).map((phase, pIdx) => {
                                    const isGood = subTable[yIdx]?.[pIdx] ?? false;

                                    return (
                                      <div
                                        key={phase}
                                        className={`flex flex-col items-center justify-center py-1 px-0.5 rounded text-[10px] ${
                                          isGood
                                            ? "bg-green-500/15 text-green-400 border border-green-500/25 font-bold"
                                            : "bg-red-500/10 text-rose-300 border border-red-500/20 font-medium"
                                        }`}
                                      >
                                        <span className="text-[9px] opacity-75">{phase}</span>
                                        <span className="font-bold leading-none mt-0.5">{isGood ? "✓" : "✕"}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Selected Grid Cell Details */}
          {gridDetailAdvice && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center md:text-left">
                <span className="text-xs text-[#94A3B8] font-bold block">รายละเอียดช่วงยามที่เลือก</span>
                <h3 className="font-display text-xl font-bold text-[#D9BC82] mt-0.5">
                  วัน{selectedGridCell?.dayName} · ยามที่ {selectedGridCell?.yamNumber} · ยาม{gridDetailAdvice.yamName} ({gridDetailAdvice.timeLabel})
                </h3>
              </div>

              {/* Chan Chai 3-Phases Box */}
              {gridDetailAdvice.chanChaiItem && (
                <Card className="p-5 bg-gradient-to-br from-[#0A2240] to-[#020617] border-[#D9BC82]/30">
                  <span className="text-xs font-bold text-[#D9BC82] uppercase tracking-wider block mb-3">
                    🔮 อัฏฐกาลชั้นฉายประจำยาม{gridDetailAdvice.yamName} (3 ช่วงย่อย)
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-black/30 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-[#D9BC82]">ยามต้น (0-30 น.)</span>
                        <span className={gridDetailAdvice.chanChaiItem.chanChai.start.quality === "good" ? "text-green-400" : "text-rose-300"}>
                          {gridDetailAdvice.chanChaiItem.chanChai.start.quality === "good" ? "✓ มงคล" : "✕ ระวัง"}
                        </span>
                      </div>
                      <p className="text-xs text-[#F8F6F1] leading-relaxed">
                        {gridDetailAdvice.chanChaiItem.chanChai.start.text}
                      </p>
                    </div>

                    <div className="p-3 bg-black/30 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-[#D9BC82]">ยามกลาง (31-60 น.)</span>
                        <span className={gridDetailAdvice.chanChaiItem.chanChai.middle.quality === "good" ? "text-green-400" : "text-rose-300"}>
                          {gridDetailAdvice.chanChaiItem.chanChai.middle.quality === "good" ? "✓ มงคล" : "✕ ระวัง"}
                        </span>
                      </div>
                      <p className="text-xs text-[#F8F6F1] leading-relaxed">
                        {gridDetailAdvice.chanChaiItem.chanChai.middle.text}
                      </p>
                    </div>

                    <div className="p-3 bg-black/30 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-[#D9BC82]">ยามปลาย (61-90 น.)</span>
                        <span className={gridDetailAdvice.chanChaiItem.chanChai.end.quality === "good" ? "text-green-400" : "text-rose-300"}>
                          {gridDetailAdvice.chanChaiItem.chanChai.end.quality === "good" ? "✓ มงคล" : "✕ ระวัง"}
                        </span>
                      </div>
                      <p className="text-xs text-[#F8F6F1] leading-relaxed">
                        {gridDetailAdvice.chanChaiItem.chanChai.end.text}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* 4 Topic Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-[#D9BC82]/5 border-[#D9BC82]/10 p-5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-[#D9BC82] uppercase tracking-wider">💖 ด้านความรัก & ง้อแฟน</span>
                    <span className="text-xs font-bold text-[#D9BC82] bg-[#D9BC82]/10 px-2 py-0.5 rounded-full">{gridDetailAdvice.love.score.toFixed(1)} /10</span>
                  </div>
                  <p className="text-sm text-[#F8F6F1] leading-relaxed mb-3">{gridDetailAdvice.love.description}</p>
                  <div className="space-y-1 pt-2 border-t border-white/5">
                    <span className="text-[12px] text-[#94A3B8] font-bold uppercase block">คำพูดมัดใจ:</span>
                    <p className="text-xs italic text-[#F8F6F1]">"{gridDetailAdvice.love.speechTemplate}"</p>
                  </div>
                </Card>

                <Card className="bg-amber-500/5 border-amber-500/10 p-5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">💰 ด้านการเงิน & ค้าขาย</span>
                    <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">{gridDetailAdvice.trade.score.toFixed(1)} /10</span>
                  </div>
                  <p className="text-sm text-[#F8F6F1] leading-relaxed mb-3">{gridDetailAdvice.trade.description}</p>
                  <div className="space-y-1 pt-2 border-t border-white/5">
                    <span className="text-[12px] text-[#94A3B8] font-bold uppercase block">คำพูดกระตุ้นยอดขาย:</span>
                    <p className="text-xs italic text-[#F8F6F1]">"{gridDetailAdvice.trade.speechTemplate}"</p>
                  </div>
                </Card>

                <Card className="bg-[#4B6FAE]/5 border-[#4B6FAE]/10 p-5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-[#4B6FAE] uppercase tracking-wider">🗣️ ด้านการงาน & เจรจา</span>
                    <span className="text-xs font-bold text-[#4B6FAE] bg-[#4B6FAE]/10 px-2 py-0.5 rounded-full">{gridDetailAdvice.negotiate.score.toFixed(1)} /10</span>
                  </div>
                  <p className="text-sm text-[#F8F6F1] leading-relaxed mb-3">{gridDetailAdvice.negotiate.description}</p>
                  <div className="space-y-1 pt-2 border-t border-white/5">
                    <span className="text-[12px] text-[#94A3B8] font-bold uppercase block">คำพูดเจรจาธุรกิจ:</span>
                    <p className="text-xs italic text-[#F8F6F1]">"{gridDetailAdvice.negotiate.speechTemplate}"</p>
                  </div>
                </Card>

                <Card className="bg-green-500/5 border-green-500/10 p-5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-green-400 uppercase tracking-wider">✈️ ฤกษ์สัญจร & เดินทาง</span>
                    <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">{gridDetailAdvice.travel.score.toFixed(1)} /10</span>
                  </div>
                  <p className="text-sm text-[#F8F6F1] leading-relaxed mb-3">{gridDetailAdvice.travel.description}</p>
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <span className="text-[12px] text-green-400/70 font-bold block">ควรทำ: {gridDetailAdvice.travel.shouldDo.join(" · ")}</span>
                    <span className="text-[12px] text-red-400/70 font-bold block">ควรเลี่ยง: {gridDetailAdvice.travel.shouldAvoid.join(" · ")}</span>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ✈️ COMPARE TRAVEL VIEW (เปรียบเทียบฤกษ์เดินทาง) */}
      {activeTab === "compare" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[#0A1628]/40 border-[#4B6FAE]/20 p-5">
              <h3 className="font-display text-sm font-bold text-[#F8F6F1] mb-4 border-b border-white/5 pb-2 flex items-center justify-between">
                <span>🚗 ทางเลือกที่ 1 (Option A)</span>
                <span className="text-[13px] text-[#4B6FAE] uppercase tracking-wider font-bold">สัญจร A</span>
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">วันเดินทาง (พ.ศ.) *</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <select 
                      value={compDayA} 
                      onChange={(e) => setCompDayA(Number(e.target.value))}
                      className="bg-slate-950/40 border border-[#4B6FAE]/20 text-[#F8F6F1] rounded-xl px-2 py-2.5 text-xs focus:border-[#4B6FAE]/50 outline-none"
                    >
                      {Array.from({ length: 31 }).map((_, i) => (
                        <option key={i + 1} value={i + 1} className="bg-[#020617]">{i + 1}</option>
                      ))}
                    </select>
                    <select 
                      value={compMonthA} 
                      onChange={(e) => setCompMonthA(Number(e.target.value))}
                      className="bg-slate-950/40 border border-[#4B6FAE]/20 text-[#F8F6F1] rounded-xl px-2 py-2.5 text-xs focus:border-[#4B6FAE]/50 outline-none"
                    >
                      {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => (
                        <option key={i + 1} value={i + 1} className="bg-[#020617]">{m}</option>
                      ))}
                    </select>
                    <select 
                      value={compYearA} 
                      onChange={(e) => setCompYearA(Number(e.target.value))}
                      className="bg-slate-950/40 border border-[#4B6FAE]/20 text-[#F8F6F1] rounded-xl px-2 py-2.5 text-xs focus:border-[#4B6FAE]/50 outline-none"
                    >
                      {Array.from({ length: 21 }).map((_, i) => {
                        const y = 2560 + i;
                        return <option key={y} value={y} className="bg-[#020617]">{y}</option>;
                      })}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">เวลาออกเดินทาง *</label>
                  <input
                    type="time"
                    value={compTimeA}
                    onChange={(e) => setCompTimeA(e.target.value)}
                    className="w-full bg-[#1E293B]/40 border border-[#4B6FAE]/20 rounded-xl px-4 py-2 text-[#F8F6F1] font-display text-sm focus:border-[#4B6FAE]/50 outline-none transition-all"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSetOptionATonight}
                  className="w-full py-2 rounded-xl bg-[#4B6FAE]/10 border border-[#4B6FAE]/20 text-xs font-bold text-[#4B6FAE] hover:bg-[#4B6FAE]/20 transition-all flex items-center justify-center gap-1.5"
                >
                  🌙 ตั้งค่าด่วน: คืนนี้ (20:00 น.)
                </button>
              </div>
            </Card>

            <Card className="bg-[#0A1628]/40 border-[#D9BC82]/20 p-5">
              <h3 className="font-display text-sm font-bold text-[#F8F6F1] mb-4 border-b border-white/5 pb-2 flex items-center justify-between">
                <span>✈️ ทางเลือกที่ 2 (Option B)</span>
                <span className="text-[13px] text-[#D9BC82] uppercase tracking-wider font-bold">สัญจร B</span>
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">วันเดินทาง (พ.ศ.) *</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <select 
                      value={compDayB} 
                      onChange={(e) => setCompDayB(Number(e.target.value))}
                      className="bg-slate-950/40 border border-[#D9BC82]/20 text-[#F8F6F1] rounded-xl px-2 py-2.5 text-xs focus:border-[#D9BC82]/50 outline-none"
                    >
                      {Array.from({ length: 31 }).map((_, i) => (
                        <option key={i + 1} value={i + 1} className="bg-[#020617]">{i + 1}</option>
                      ))}
                    </select>
                    <select 
                      value={compMonthB} 
                      onChange={(e) => setCompMonthB(Number(e.target.value))}
                      className="bg-slate-950/40 border border-[#D9BC82]/20 text-[#F8F6F1] rounded-xl px-2 py-2.5 text-xs focus:border-[#D9BC82]/50 outline-none"
                    >
                      {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => (
                        <option key={i + 1} value={i + 1} className="bg-[#020617]">{m}</option>
                      ))}
                    </select>
                    <select 
                      value={compYearB} 
                      onChange={(e) => setCompYearB(Number(e.target.value))}
                      className="bg-slate-950/40 border border-[#D9BC82]/20 text-[#F8F6F1] rounded-xl px-2 py-2.5 text-xs focus:border-[#D9BC82]/50 outline-none"
                    >
                      {Array.from({ length: 21 }).map((_, i) => {
                        const y = 2560 + i;
                        return <option key={y} value={y} className="bg-[#020617]">{y}</option>;
                      })}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">เวลาออกเดินทาง *</label>
                  <input
                    type="time"
                    value={compTimeB}
                    onChange={(e) => setCompTimeB(e.target.value)}
                    className="w-full bg-[#1E293B]/40 border border-[#D9BC82]/20 rounded-xl px-4 py-2 text-[#F8F6F1] font-display text-sm focus:border-[#D9BC82]/50 outline-none transition-all"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSetOptionBTomorrowMorning}
                  className="w-full py-2 rounded-xl bg-[#D9BC82]/10 border border-[#D9BC82]/20 text-xs font-bold text-[#D9BC82] hover:bg-[#D9BC82]/20 transition-all flex items-center justify-center gap-1.5"
                >
                  ☀️ ตั้งค่าด่วน: พรุ่งนี้เช้า (08:00 น.)
                </button>
              </div>
            </Card>
          </div>

          <button
            onClick={handleCalculateCompare}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#0A1628] font-bold text-sm tracking-widest uppercase hover:brightness-105 active:scale-[0.99] transition-all shadow-[0_0_24px_rgba(198,169,107,0.2)] flex items-center justify-center gap-2"
          >
            คำนวณเปรียบเทียบฤกษ์เดินทาง ✈️✨
          </button>

          {compareResult && (
            <div className="space-y-6 animate-fade-in">
              <Card className="relative overflow-hidden bg-gradient-to-br from-[#0A2240] to-[#020617] border-[#D9BC82]/40 shadow-[0_0_30px_rgba(217,188,130,0.15)] p-6 text-center">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#D9BC82]/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#4B6FAE]/10 rounded-full blur-3xl pointer-events-none" />
                
                <span className="text-[#D9BC82] text-[13px] tracking-[0.25em] uppercase font-bold block mb-1">
                  ✦ คำวินิจฉัยฤกษ์เดินทางที่ดีที่สุด ✦
                </span>
                <p className="text-sm text-[#F8F6F1] font-medium leading-relaxed max-w-2xl mx-auto py-2 border-y border-white/5 my-2">
                  {compareResult.verdict}
                </p>
                <p className="text-[13px] text-[#C6B79F] italic">
                  *การตรวจวิเคราะห์อ้างอิงจากฐานความมงคลยามอัฏฐกาลร่วมกับกำลังของเจ้าดารายามอย่างสมบูรณ์
                </p>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-[#0A1628]/30 border-[#4B6FAE]/15 p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[12px] text-[#4B6FAE] font-bold uppercase block">ทางเลือกที่ 1</span>
                        <h4 className="font-display text-lg font-bold text-[#F8F6F1] mt-0.5">{compareResult.a.dateLabel}</h4>
                        <p className="text-xs text-[#94A3B8]">{compareResult.a.timeLabel}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-[#4B6FAE] bg-[#4B6FAE]/10 px-2 py-0.5 rounded-full">{compareResult.a.advice.score.toFixed(1)} /10</span>
                        <div className="flex gap-0.5 mt-1">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <span key={i} className={`text-xs ${i < compareResult.a.ticks ? "text-[#C6A96B]" : "text-[#F8F6F1]/10"}`}>★</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-[#4B6FAE]/5 rounded-xl border border-[#4B6FAE]/10">
                      <div className="flex items-center gap-1.5 text-xs text-[#D9BC82] font-semibold mb-1">
                        <span>{PLANET_SYMBOLS[compareResult.a.yamName] || "✦"}</span> ยาม{compareResult.a.yamName} ({PHASE_LABEL[compareResult.a.phase]})
                      </div>
                      <p className="text-xs text-[#D9CDB7] leading-relaxed">{compareResult.a.advice.description}</p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      <span className="text-[13px] text-green-400 font-bold block flex items-start gap-1">
                        <span className="text-xs">✓</span> ควรทำ: {compareResult.a.advice.shouldDo.join(" · ")}
                      </span>
                      <span className="text-[13px] text-red-400 font-bold block flex items-start gap-1">
                        <span className="text-xs">✕</span> ควรเลี่ยง: {compareResult.a.advice.shouldAvoid.join(" · ")}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="bg-[#0A1628]/30 border-[#D9BC82]/15 p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[12px] text-[#D9BC82] font-bold uppercase block">ทางเลือกที่ 2</span>
                        <h4 className="font-display text-lg font-bold text-[#F8F6F1] mt-0.5">{compareResult.b.dateLabel}</h4>
                        <p className="text-xs text-[#94A3B8]">{compareResult.b.timeLabel}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-[#D9BC82] bg-[#D9BC82]/10 px-2 py-0.5 rounded-full">{compareResult.b.advice.score.toFixed(1)} /10</span>
                        <div className="flex gap-0.5 mt-1">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <span key={i} className={`text-xs ${i < compareResult.b.ticks ? "text-[#C6A96B]" : "text-[#F8F6F1]/10"}`}>★</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-[#D9BC82]/5 rounded-xl border border-[#D9BC82]/10">
                      <div className="flex items-center gap-1.5 text-xs text-[#D9BC82] font-semibold mb-1">
                        <span>{PLANET_SYMBOLS[compareResult.b.yamName] || "✦"}</span> ยาม{compareResult.b.yamName} ({PHASE_LABEL[compareResult.b.phase]})
                      </div>
                      <p className="text-xs text-[#D9CDB7] leading-relaxed">{compareResult.b.advice.description}</p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      <span className="text-[13px] text-green-400 font-bold block flex items-start gap-1">
                        <span className="text-xs">✓</span> ควรทำ: {compareResult.b.advice.shouldDo.join(" · ")}
                      </span>
                      <span className="text-[13px] text-red-400 font-bold block flex items-start gap-1">
                        <span className="text-xs">✕</span> ควรเลี่ยง: {compareResult.b.advice.shouldAvoid.join(" · ")}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
