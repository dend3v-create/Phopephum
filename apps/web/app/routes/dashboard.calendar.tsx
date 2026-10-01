import { json } from "@remix-run/cloudflare";
import { useLoaderData, useSearchParams, Form, Link, useNavigation } from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { Card } from "~/components/ui/Card";
import {
  calculatePhopephum,
  getThaiBaseNumbers,
  getAstrologicalDate,
  getAstrologicalDateStr,
  getSunTimes,
  getYamPrediction,
  getChanChaiItem,
  yamMeaning,
} from "@phopephum/engine";
import {
  calculateDayIntelligence,
  calculateMonthOverview,
} from "~/services/calendarIntelligence.server";
import type {
  CalendarMonthDayOverview,
} from "@phopephum/types";
import type { Env } from "~/env.server";
import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, Save, ExternalLink, ListTodo } from "lucide-react";

export const meta: MetaFunction = () => [
  { title: "ปฏิทินสำเร็จ 100 ปี & ฤกษ์ยามอัฏฐกาล — PhopePhum" },
  { name: "description", content: "ตรวจสอบวันทางจันทรคติไทย และวิเคราะห์ฤกษ์ยามอัฏฐกาลเฉพาะบุคคลด้วยระบบปฏิทินอัจฉริยะ" },
];

const G_MONTH_NAMES = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const EVENT_TYPES = [
  { id: "negotiation", label: "เจรจาธุรกิจ / ตกลงผลประโยชน์" },
  { id: "closing", label: "ขายงาน / เสนอขาย / ปิดดีล" },
  { id: "launch", label: "เปิดตัวโครงการใหม่ / เริ่มต้นโปรเจกต์" },
  { id: "investment", label: "ทำสัญญา / ลงทุนการเงิน" },
  { id: "backstage", label: "วางแผนเงียบๆ / ทำงานเบื้องหลัง" }
];

const STAR_TH: Record<number, string> = {
  1: "อาทิตย์", 2: "จันทร์", 3: "อังคาร", 4: "พุธ",
  5: "พฤหัสบดี", 6: "ศุกร์", 7: "เสาร์", 8: "ราหู"
};

export interface CalendarYamSlot {
  yamNumber: number;
  yamName: string;
  period: "day" | "night";
  startTime: string;
  endTime: string;
  timeLabel: string;
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
  suitableTags: string[];
}

// ─── Helper: คำนวณตารางยามอัฏฐกาล 16 ยามของวันที่เลือก ─────────────────────────
function calculateDailyYamSlotsForDate(targetDate: Date): {
  daySlots: CalendarYamSlot[];
  nightSlots: CalendarYamSlot[];
} {
  const sunTimes = getSunTimes(targetDate);
  const sunrise = sunTimes.sunrise;
  const sunset = sunTimes.sunset;

  const dayMs = sunset.getTime() - sunrise.getTime();
  const nightMs = 86400000 - dayMs;

  const daySlotMs = dayMs / 8;
  const nightSlotMs = nightMs / 8;

  const daySlots: CalendarYamSlot[] = [];
  for (let i = 0; i < 8; i++) {
    const startTime = new Date(sunrise.getTime() + i * daySlotMs);
    const endTime = new Date(sunrise.getTime() + (i + 1) * daySlotMs);
    const midTime = new Date(startTime.getTime() + daySlotMs / 2);
    const result = getYamPrediction(midTime);
    const chanChai = getChanChaiItem(result.yamName);
    const meaning = yamMeaning[result.yamName];
    const score =
      result.travelAuspiciousness.ticks === 3
        ? 95
        : result.travelAuspiciousness.ticks === 2
        ? 85
        : result.travelAuspiciousness.ticks === 1
        ? 70
        : 45;

    const startFormatted = startTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    const endFormatted = endTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

    const suitableTags = (meaning?.shouldDo || "เจรจา, ปฏิบัติงาน")
      .split(/[,、]/)
      .map((s) => s.trim())
      .filter(Boolean);

    daySlots.push({
      yamNumber: i + 1,
      yamName: result.yamName,
      period: "day",
      startTime: startFormatted,
      endTime: endFormatted,
      timeLabel: `${startFormatted} - ${endFormatted} น.`,
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
      suitableTags: suitableTags.slice(0, 3),
    });
  }

  const nightSlots: CalendarYamSlot[] = [];
  for (let i = 0; i < 8; i++) {
    const startTime = new Date(sunset.getTime() + i * nightSlotMs);
    const endTime = new Date(sunset.getTime() + (i + 1) * nightSlotMs);
    const midTime = new Date(startTime.getTime() + nightSlotMs / 2);
    const result = getYamPrediction(midTime);
    const chanChai = getChanChaiItem(result.yamName);
    const meaning = yamMeaning[result.yamName];
    const score =
      result.travelAuspiciousness.ticks === 3
        ? 95
        : result.travelAuspiciousness.ticks === 2
        ? 85
        : result.travelAuspiciousness.ticks === 1
        ? 70
        : 45;

    const startFormatted = startTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    const endFormatted = endTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

    const suitableTags = (meaning?.shouldDo || "วางแผน, ทบทวนงาน")
      .split(/[,、]/)
      .map((s) => s.trim())
      .filter(Boolean);

    nightSlots.push({
      yamNumber: i + 1,
      yamName: result.yamName,
      period: "night",
      startTime: startFormatted,
      endTime: endFormatted,
      timeLabel: `${startFormatted} - ${endFormatted} น.`,
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
      suitableTags: suitableTags.slice(0, 3),
    });
  }

  return { daySlots, nightSlots };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save_appointment") {
    const { supabase, headers } = createSupabaseClient(request, env);
    
    const title = formData.get("title") as string;
    const description = (formData.get("description") as string || "").trim();
    const eventType = formData.get("eventType") as string;
    const eventDate = formData.get("eventDate") as string;
    const eventTime = formData.get("eventTime") as string;
    const score = parseInt(formData.get("score") as string || "0");
    const verdict = formData.get("verdict") as string;
    const rawAdvice = formData.get("advice") as string;
    const yamName = formData.get("yamName") as string;
    const bhop = formData.get("bhop") as string;

    const advice = description
      ? `${description}\n\n✦ คำแนะนำฤกษ์: ${rawAdvice}`
      : rawAdvice;

    const { error } = await supabase.from("appointments").insert({
      user_id: user.id,
      title,
      event_type: eventType,
      event_date: eventDate,
      event_time: eventTime,
      score,
      verdict,
      advice,
      yam_name: yamName,
      bhop,
    });

    if (error) {
      console.error("Error saving appointment:", error);
      return json({ error: "ไม่สามารถบันทึกนัดหมายได้" }, { status: 500 });
    }

    return json({ success: true }, { headers });
  }

  return json({ error: "Invalid intent" }, { status: 400 });
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);
  const { supabase } = createSupabaseClient(request, env);

  const url = new URL(request.url);
  const now = new Date();
  const astroNow = getAstrologicalDate(now);
  
  // ── 1. ปฏิทินจันทรคติรายเดือน ──
  const year = parseInt(url.searchParams.get("year") || String(astroNow.getUTCFullYear()));
  const month = parseInt(url.searchParams.get("month") || String(astroNow.getUTCMonth() + 1));

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  // ดึงข้อมูลนัดหมายของเดือนนี้
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("user_id", user.id)
    .gte("event_date", startDate)
    .lte("event_date", endDate)
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });

  const profileContext = profile ? {
    birthDate: profile.birth_date,
    birthTime: profile.birth_time,
    birthPlace: profile.birth_place,
    displayName: profile.display_name,
  } : null;

  const monthOverview = calculateMonthOverview(year, month, profileContext, appointments || []);
  const monthOverviewMap = new Map<string, CalendarMonthDayOverview>();
  for (const mo of monthOverview) {
    monthOverviewMap.set(mo.date, mo);
  }

  const calendarDays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const lunar = getThaiBaseNumbers(dateStr);
    const dayAppointments = (appointments || []).filter(a => a.event_date === dateStr);
    const dayOverview = monthOverviewMap.get(dateStr);
    
    calendarDays.push({ 
      day: d, 
      dateStr,
      appointments: dayAppointments,
      hasGoldenWindow: dayOverview?.hasGoldenWindow ?? false,
      dominantEnergy: dayOverview?.dominantEnergy ?? "neutral",
      dayScore: dayOverview?.overallScore ?? 60,
      ...lunar 
    });
  }

  // ── 2. วางแผนฤกษ์มงคล (Timing Advisor & Day Intelligence) ──
  const todayStr = getAstrologicalDateStr(now);
  const eventDate = url.searchParams.get("eventDate") || todayStr;
  const eventTime = url.searchParams.get("eventTime") || "12:00";
  const eventType = url.searchParams.get("eventType") || "negotiation";
  const appointmentTitle = url.searchParams.get("title") || "";
  const appointmentDescription = url.searchParams.get("description") || "";
  
  const dayIntelligence = await calculateDayIntelligence(eventDate, profileContext);
  
  // คำนวณผังยาม 16 ยามของวันที่เลือก
  const parsedEventDate = new Date(`${eventDate}T12:00:00+07:00`);
  const eventYamSlots = calculateDailyYamSlotsForDate(parsedEventDate);

  let advisorResult = null;

  if (profile?.birth_date && eventDate) {
    try {
      const checkDate = new Date(`${eventDate}T${eventTime}`);
      const phResult = await calculatePhopephum({
        birthDate: profile.birth_date,
        birthTime: profile.birth_time || "12:00",
        birthPlace: profile.birth_place || "กรุงเทพมหานคร",
      }, checkDate);

      const majorPlanet = phResult.atthakarn.majorPlanet;
      const planetName = STAR_TH[majorPlanet] || "";
      const bhop = phResult.taksaTransit.map[majorPlanet] || "บริวาร";

      // คำนวณคะแนนความสำเร็จ
      let score = 60;
      let status: "excellent" | "good" | "warning" = "good";
      let verdict = "พลังงานปานกลาง";
      let advice = "";

      switch (bhop) {
        case "ศรี":
          score = 95;
          status = "excellent";
          verdict = "ฤกษ์มงคลดีเลิศสูงสุด (ยามศรี)";
          advice = `เวลานี้ครองโดยดาว${planetName}ซึ่งเป็นดาวศรีจรของคุณ เหมาะอย่างยิ่งสำหรับกิจกรรม ${EVENT_TYPES.find(e => e.id === eventType)?.label} พลังงานความราบรื่นและดึงดูดความสำเร็จสูงสุดทำงานเต็มที่`;
          break;
        case "เดช":
          score = 85;
          status = "excellent";
          verdict = "ฤกษ์บารมีและชัยชนะ (ยามเดช)";
          advice = `เวลานี้เด่นเรื่องพลังอำนาจ ชื่อเสียง และบารมี เหมาะสำหรับการขายงานหรือเปิดตัวโปรเจกต์ใหญ่ มีเกณฑ์ได้รับชัยชนะในการนำเสนอ`;
          break;
        case "มนตรี":
          score = 80;
          status = "good";
          verdict = "ฤกษ์ผู้ใหญ่สนับสนุน (ยามมนตรี)";
          advice = `เหมาะสำหรับการเข้าหาเจ้านาย ขอความอนุเคราะห์สนับสนุน หรือเจรจาที่มีผู้ใหญ่คอยประคองประสานผลประโยชน์`;
          break;
        case "มูละ":
          score = 75;
          status = "good";
          verdict = "ฤกษ์รากฐานและทรัพย์สิน (ยามมูละ)";
          advice = `เหมาะแก่การเซ็นสัญญาระยะยาว การลงทุนทางการเงิน หรือการวางเป้าหมายหลักทรัพย์ที่ต้องการความมั่นคงถาวร`;
          break;
        case "อายุ":
          score = 70;
          status = "good";
          verdict = "ฤกษ์ราบรื่นมั่นคง (ยามอายุ)";
          advice = `เหมาะสำหรับกิจกรรมทั่วไป งานที่ไม่เร่งรีบ ค่อยเป็นค่อยไป ส่งผลดีต่อความสบายใจและสภาวะสุขภาพกายที่สมดุล`;
          break;
        case "บริวาร":
          score = 65;
          status = "good";
          verdict = "ฤกษ์ประสานสามัคคี (ยามบริวาร)";
          advice = `เหมาะกับการประชุมทีม ระดมสมอง หรือทำกิจกรรมกลุ่ม พลังงานเน้นความกลมเกลียวและการช่วยเหลือกันของทีมงาน`;
          break;
        case "อุตสาหะ":
          score = 55;
          status = "good";
          verdict = "ฤกษ์ลงแรงใช้พยายาม (ยามอุตสาหะ)";
          advice = `งานต้องใช้พละกำลังและการลงแรงสูงจึงจะสำเร็จ เหมาะกับงานทำงานเบื้องหลังหรืองานวางระบบที่ต้องการความทรหดอดทน`;
          break;
        case "กาลกิณี":
          score = 30;
          status = "warning";
          verdict = "ยามอุปสรรคและข้อผิดพลาด (ยามกาลกิณี)";
          advice = `⚠️ พึงหลีกเลี่ยงช่วงเวลานี้! ดาวครองยามคือดาว${planetName}ที่เป็นกาลกิณีจรของคุณ มีเกณฑ์เกิดความขัดแย้ง เอกสารเสียหาย หรือเจรจาเหลวไหล แนะนำให้เลื่อนเวลาออกไป 1.5 ชั่วโมงเพื่อให้ยามเปลี่ยน`;
          break;
      }

      // เช็คราหูจรแทรก
      if (phResult.rahu && phResult.rahu.quality === "bad") {
        score = Math.max(20, score - 10);
        advice += ` (และระวังเพิ่มขึ้นเนื่องจากมีช่วงราหูค้นทรัพย์เบียดเบียนพลังงาน)`;
      }

      advisorResult = {
        score,
        status,
        verdict,
        advice,
        yamName: phResult.atthakarn.planetName,
        timeLabel: `${phResult.atthakarn.startTime} - ${phResult.atthakarn.endTime} น.`,
        bhop,
      };
    } catch (err) {
      console.error(err);
    }
  }

  return json({
    profile,
    year,
    month,
    calendarDays,
    firstDayOfWeek,
    eventDate,
    eventTime,
    eventType,
    appointmentTitle,
    appointmentDescription,
    advisorResult,
    appointments: appointments || [],
    dayIntelligence,
    eventYamSlots,
    monthOverview,
  });
}

export default function DashboardCalendar() {
  const { 
    year, month, calendarDays, firstDayOfWeek, 
    eventDate, eventTime, eventType, appointmentTitle, appointmentDescription,
    advisorResult, appointments,
    dayIntelligence, eventYamSlots,
  } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigation = useNavigation();
  const isSaving = navigation.state !== "idle" && navigation.formData?.get("intent") === "save_appointment";

  const [selectedTime, setSelectedTime] = useState(eventTime);
  const [selectedEventType, setSelectedEventType] = useState(eventType);
  const [selectedTitle, setSelectedTitle] = useState(appointmentTitle);
  const [selectedDescription, setSelectedDescription] = useState(appointmentDescription);
  const [showPlannerForm, setShowPlannerForm] = useState(false);
  const [yamTab, setYamTab] = useState<"day" | "night">("day");

  useEffect(() => {
    setSelectedTime(eventTime);
  }, [eventTime]);

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const currentYamSlots = yamTab === "day" ? eventYamSlots.daySlots : eventYamSlots.nightSlots;

  // ฟังก์ชันสร้าง Google Calendar Link
  const getGoogleCalendarUrl = (title: string, date: string, time: string, details: string) => {
    const baseUrl = "https://www.google.com/calendar/render?action=TEMPLATE";
    const startStr = date.replace(/-/g, "") + "T" + time.replace(/:/g, "") + "00";
    const [h, m] = time.split(":").map(Number);
    const endH = (h + 1) % 24;
    const endStr = date.replace(/-/g, "") + "T" + String(endH).padStart(2, "0") + String(m).padStart(2, "0") + "00";
    
    const params = new URLSearchParams({
      text: title || "นัดหมายฤกษ์มงคล (PhopePhum)",
      dates: `${startStr}/${endStr}`,
      details: details,
      location: "PhopePhum.com",
    });
    return `${baseUrl}&${params.toString()}`;
  };

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden max-w-6xl mx-auto space-y-6 pb-24">
      
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[#C6A96B] text-[11px] sm:text-xs tracking-[0.2em] uppercase font-bold block mb-0.5">
            ✦ LIVING WISDOM CALENDAR
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#F8F6F1] glow-gold">
            ปฏิทินสำเร็จ 100 ปี & ฤกษ์มงคล
          </h1>
          <p className="text-slate-600 dark:text-[#C6B79F] text-xs sm:text-sm font-sans-thai">
            วางแผนวันสำคัญ ค้นหาฤกษ์ยามอัฏฐกาลและช่วงเวลามงคลเฉพาะบุคคล
          </p>
        </div>

        {/* ── Month/Year Selectors & Prev/Next Quick Navigation ── */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Link
            to={`?year=${prevYear}&month=${prevMonth}&eventDate=${prevYear}-${String(prevMonth).padStart(2, "0")}-01`}
            className="min-h-[40px] min-w-[40px] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-[#C6A96B]/50 active:scale-95 transition-all text-slate-700 dark:text-white flex items-center justify-center text-xs font-bold shadow-sm"
            title="เดือนก่อนหน้า"
          >
            ‹
          </Link>

          <Link
            to={`/dashboard/calendar`}
            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[#C6A96B]/30 bg-[#C6A96B]/10 hover:bg-[#C6A96B]/20 active:scale-95 transition-all text-[#8C6D2D] dark:text-[#F3D68B] text-xs font-bold flex items-center gap-1 shrink-0"
          >
            <span>📅</span>
            <span>วันนี้</span>
          </Link>

          <Form method="get" className="flex items-center gap-1.5">
            <select 
              name="month" 
              defaultValue={month}
              className="min-h-[40px] bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-[#C9A96E]/20 text-slate-900 dark:text-[#F8F6F1] rounded-xl px-2.5 py-1.5 text-xs font-bold focus:border-[#C9A96E] outline-none shadow-sm"
              onChange={(e) => e.target.form?.submit()}
            >
              {G_MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1} className="bg-white dark:bg-[#020617] text-slate-900 dark:text-white">{name}</option>
              ))}
            </select>
            <select 
              name="year" 
              defaultValue={year}
              className="min-h-[40px] bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-[#C9A96E]/20 text-slate-900 dark:text-[#F8F6F1] rounded-xl px-2.5 py-1.5 text-xs font-bold focus:border-[#C9A96E] outline-none shadow-sm"
              onChange={(e) => e.target.form?.submit()}
            >
              {Array.from({ length: 401 }).map((_, i) => {
                const y = 1757 + i;
                return <option key={y} value={y} className="bg-white dark:bg-[#020617] text-slate-900 dark:text-white">{y + 543} (CE {y})</option>
              })}
            </select>
          </Form>

          <Link
            to={`?year=${nextYear}&month=${nextMonth}&eventDate=${nextYear}-${String(nextMonth).padStart(2, "0")}-01`}
            className="min-h-[40px] min-w-[40px] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-[#C6A96B]/50 active:scale-95 transition-all text-slate-700 dark:text-white flex items-center justify-center text-xs font-bold shadow-sm"
            title="เดือนถัดไป"
          >
            ›
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── Left/Middle: Lunar Calendar View (2/3 width) ── */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden border-slate-200 dark:border-[#C9A96E]/20 shadow-xl bg-white/95 dark:bg-slate-900/40 backdrop-blur-md">
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-[#C9A96E]/20 bg-amber-50/50 dark:bg-[#C9A96E]/5">
              {["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."].map((d, i) => (
                <div key={i} className={`py-2 sm:py-3 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest font-sans-thai ${i === 0 ? "text-rose-600 dark:text-rose-400" : i === 6 ? "text-sky-600 dark:text-sky-400" : "text-amber-800 dark:text-[#F3D68B]"}`}>
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 bg-slate-100/40 dark:bg-slate-950/15">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square md:aspect-video border-b border-r border-slate-200/60 dark:border-white/5 bg-slate-50 dark:bg-slate-950/50" />
              ))}

              {calendarDays.map((day) => (
                <Link 
                  key={day.day}
                  to={`?year=${year}&month=${month}&eventDate=${day.dateStr}&eventTime=${eventTime}&eventType=${eventType}&title=${encodeURIComponent(appointmentTitle)}&description=${encodeURIComponent(appointmentDescription)}#day-intelligence-section`}
                  className={`relative min-h-[52px] sm:min-h-[64px] aspect-square md:aspect-video border-b border-r border-slate-200/60 dark:border-white/5 p-1 sm:p-2 transition-all hover:bg-amber-100/40 dark:hover:bg-[#C9A96E]/10 active:scale-[0.98] group ${
                    day.isWanPhra ? "bg-amber-50/60 dark:bg-[#C9A96E]/5" : ""
                  } ${
                    eventDate === day.dateStr
                      ? "bg-amber-100/90 dark:bg-[#C9A96E]/25 ring-2 ring-inset ring-[#C6A96B] font-bold shadow-md z-10"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs sm:text-sm font-bold ${
                      day.weekDay === 0
                        ? "text-rose-600 dark:text-rose-400"
                        : eventDate === day.dateStr
                        ? "text-amber-900 dark:text-[#F3D68B]"
                        : "text-slate-800 dark:text-[#F8F6F1]/70"
                    } group-hover:text-slate-950 dark:group-hover:text-[#F8F6F1] transition-colors`}>
                      {day.day}
                    </span>
                    {day.appointments.length > 0 && (
                      <span className="text-[11px] text-amber-500 dark:text-amber-300 font-bold leading-none" title={`มีบันทึกนัดหมาย (${day.appointments.length} รายการ)`}>
                        ⭐
                      </span>
                    )}
                  </div>

                  <div className="mt-0.5 sm:mt-1 flex flex-col gap-0.5">
                    <span className={`text-[9px] sm:text-xs font-sans-thai leading-tight truncate ${
                      day.isWanPhra
                        ? "text-amber-700 dark:text-amber-400 font-bold drop-shadow-sm"
                        : "text-slate-500 dark:text-[#D9CDB7]/70"
                    }`}>
                      {day.moonPhase}
                    </span>
                  </div>

                  {/* แสดงจุดนัดหมาย */}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {day.appointments.map((apt: any) => (
                      <div 
                        key={apt.id} 
                        className={`w-1.5 h-1.5 rounded-full ${
                          apt.score >= 80 ? "bg-emerald-500" : apt.score >= 60 ? "bg-sky-500" : "bg-rose-500"
                        }`}
                        title={apt.title}
                      />
                    ))}
                  </div>

                  {day.isWanPhra && (
                    <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" title="วันพระ" />
                  )}
                </Link>
              ))}

              {Array.from({ length: (7 - (firstDayOfWeek + calendarDays.length) % 7) % 7 }).map((_, i) => (
                <div key={`pad-last-${i}`} className="aspect-square md:aspect-video border-b border-r border-slate-200/60 dark:border-white/5 bg-slate-50 dark:bg-slate-950/50" />
              ))}
            </div>
          </Card>

          {/* ── Upcoming Appointments ── */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-slate-900 dark:text-[#F3D68B] flex items-center gap-2 text-sm sm:text-base">
              <ListTodo className="w-4 h-4 text-[#C6A96B]" /> รายการนัดหมายฤกษ์มงคลของคุณ ({appointments.length})
            </h3>
            {appointments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {appointments.map((apt: any) => (
                  <Card key={apt.id} className="p-4 bg-white/95 dark:bg-slate-900/60 border-slate-200 dark:border-[#C9A96E]/20 hover:border-[#C9A96E]/50 transition-colors shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          apt.score >= 80 ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-sky-500/20 text-sky-700 dark:text-sky-400"
                        }`}>
                          {apt.score}%
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#F8F6F1] line-clamp-1">{apt.title}</h4>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-[#C6B79F] font-mono">{apt.event_time.slice(0, 5)} น.</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-[#C6B79F]">
                      <CalendarIcon className="w-3 h-3 text-[#C6A96B]" /> {new Date(apt.event_date).toLocaleDateString("th-TH", { day: 'numeric', month: 'short', year: 'numeric' })}
                      <span className="mx-1">•</span>
                      <Clock className="w-3 h-3 text-[#C6A96B]" /> {apt.yam_name}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <a 
                        href={getGoogleCalendarUrl(apt.title, apt.event_date, apt.event_time, apt.advice)}
                        target="_blank"
                        rel="noreferrer"
                        className="min-h-[36px] px-3 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 text-[#8C6D2D] dark:text-[#C9A96E] hover:bg-[#C6A96B]/10 border border-[#C6A96B]/30 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" /> Sync Google Calendar
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#C6B79F] bg-white/60 dark:bg-white/5 p-6 rounded-2xl text-center border border-slate-200 dark:border-white/5 italic">
                ยังไม่มีนัดหมายที่บันทึกไว้สำหรับเดือนนี้
              </p>
            )}
          </div>
        </div>

        {/* ── Right: Personal Auspicious Day Intelligence (1/3 width) ── */}
        <div id="day-intelligence-section" className="space-y-6 scroll-mt-24">
          {dayIntelligence && (
            <Card className="p-5 sm:p-6 border-2 border-slate-200 dark:border-[#C9A96E]/40 bg-white/95 dark:bg-gradient-to-br dark:from-[#0a2240] dark:via-[#0d1f38] dark:to-[#020617] rounded-3xl shadow-xl space-y-5 relative overflow-hidden">
              <div
                className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none opacity-20 blur-3xl"
                style={{ background: "radial-gradient(circle, #C6A96B 0%, transparent 70%)" }}
              />

              {/* 1. Day Header */}
              <div className="border-b border-black/5 dark:border-white/10 pb-4 space-y-1 relative z-10">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8C6D2D] dark:text-[#C6A96B]">
                    DAILY AUSPICIOUS INTELLIGENCE
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    dayIntelligence.overallScore >= 75
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : dayIntelligence.overallScore >= 55
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  }`}>
                    {dayIntelligence.overallScore}% {dayIntelligence.overallScore >= 75 ? "พลังงานดีเลิศ" : dayIntelligence.overallScore >= 55 ? "ราบรื่นปานกลาง" : "ควรระวัง"}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{dayIntelligence.lunarDayInfo.dayOfWeekThai}</span>
                  <span className="text-xs text-slate-500 dark:text-[#94A3B8] font-normal">
                    ({new Date(dayIntelligence.date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })})
                  </span>
                </h3>

                <p className="text-xs text-amber-800 dark:text-amber-300/90 font-semibold">
                  ✦ {dayIntelligence.lunarDayInfo.lunarDateStr} · {dayIntelligence.lunarDayInfo.moonPhase}
                  {dayIntelligence.lunarDayInfo.isWanPhra && " (วันพระ)"}
                </p>
              </div>

              {/* 2. Daily Theme & Plain Summary */}
              <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-white/[0.03] border border-amber-200/40 dark:border-white/10 space-y-2 relative z-10 shadow-sm">
                <p className="text-[11px] font-bold text-[#8C6D2D] dark:text-[#C6A96B] uppercase tracking-wider">
                  ธีมพลังงานประจำวัน:
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-[#F8F6F1] leading-snug">
                  “{dayIntelligence.dailyTheme}”
                </p>
                <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                  {dayIntelligence.dailySummary}
                </p>
                {dayIntelligence.personalNote && (
                  <div className="pt-2 border-t border-black/5 dark:border-white/5 text-xs text-amber-800 dark:text-[#D9BC82] flex items-start gap-1.5 font-medium">
                    <span>💡</span>
                    <span>{dayIntelligence.personalNote}</span>
                  </div>
                )}
              </div>

              {/* 3. ⚡ ผังยามอัฏฐกาล & ฤกษ์มงคลประจำวัน (DAILY ASTROLOGICAL YAM MATRIX) */}
              <div className="space-y-3 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8C6D2D] dark:text-[#C6A96B] flex items-center gap-1.5">
                      <span>⚡</span> ผังยามอัฏฐกาล & ฤกษ์มงคลประจำวัน
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-[#94A3B8]">
                      เลือกช่วงเวลาที่ดีที่สุดสำหรับวางแผนนัดหมาย
                    </p>
                  </div>

                  {/* Day / Night toggle */}
                  <div className="flex bg-black/5 dark:bg-black/40 rounded-xl p-0.5 border border-slate-200 dark:border-white/10 self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setYamTab("day")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        yamTab === "day"
                          ? "bg-[#C6A96B] text-[#020617] shadow-sm font-black"
                          : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      ☀️ กลางวัน
                    </button>
                    <button
                      type="button"
                      onClick={() => setYamTab("night")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        yamTab === "night"
                          ? "bg-[#C6A96B] text-[#020617] shadow-sm font-black"
                          : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      🌙 กลางคืน
                    </button>
                  </div>
                </div>

                {/* Yam Slots List */}
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
                  {currentYamSlots.map((slot) => {
                    const isSelected = selectedTime === slot.startTime;
                    const isExcellent = slot.ticks === 3;
                    const isVeryGood = slot.ticks === 2;

                    return (
                      <div
                        key={slot.timeLabel}
                        className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                          isSelected
                            ? "bg-[#C6A96B]/20 border-[#C6A96B] shadow-md ring-1 ring-[#C6A96B]/40"
                            : isExcellent
                            ? "bg-emerald-500/10 dark:bg-emerald-950/25 border-emerald-500/35 hover:bg-emerald-500/15"
                            : isVeryGood
                            ? "bg-blue-500/10 dark:bg-blue-950/25 border-blue-500/35 hover:bg-blue-500/15"
                            : slot.ticks === 1
                            ? "bg-amber-500/5 dark:bg-white/[0.03] border-amber-500/25 hover:bg-amber-500/10"
                            : "bg-rose-500/5 dark:bg-white/[0.02] border-rose-500/20 opacity-80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-7 h-7 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 shadow-sm"
                              style={{
                                backgroundColor: `${slot.planetColor}25`,
                                color: slot.planetColor,
                                border: `1px solid ${slot.planetColor}50`,
                              }}
                            >
                              {slot.planetSymbol}
                            </span>
                            <div>
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#F8F6F1] flex items-center gap-1.5">
                                <span>ยาม{slot.yamName}</span>
                                <span className="text-[11px] font-normal text-slate-500 dark:text-[#94A3B8]">({slot.planetNameThai})</span>
                              </h4>
                              <p className="font-mono text-[11px] font-bold text-[#8C6D2D] dark:text-[#C6A96B]">
                                {slot.timeLabel}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span
                              className="text-[10px] font-black px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor:
                                  slot.ticks === 3
                                    ? "rgba(16,185,129,0.2)"
                                    : slot.ticks === 2
                                    ? "rgba(96,165,250,0.2)"
                                    : slot.ticks === 1
                                    ? "rgba(198,169,107,0.2)"
                                    : "rgba(244,63,94,0.2)",
                                color:
                                  slot.ticks === 3
                                    ? "#10B981"
                                    : slot.ticks === 2
                                    ? "#60A5FA"
                                    : slot.ticks === 1
                                    ? "#C6A96B"
                                    : "#F43F5E",
                              }}
                            >
                              {slot.ticks === 3 ? "🌟 ดีเยี่ยม" : slot.ticks === 2 ? "✨ ดีมาก" : slot.ticks === 1 ? "✦ ราบรื่น" : "⚠️ ชะลอ"} ({slot.score}%)
                            </span>
                          </div>
                        </div>

                        {/* Suitable Chips */}
                        {slot.suitableTags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {slot.suitableTags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-slate-700 dark:text-[#CBD5E1] border border-black/5 dark:border-white/10 font-medium"
                              >
                                ✓ {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Prophecy */}
                        <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] leading-relaxed line-clamp-2 italic">
                          "{slot.prophecy}"
                        </p>

                        {/* Select Button */}
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTime(slot.startTime);
                              setShowPlannerForm(true);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                              isSelected
                                ? "bg-[#C6A96B] text-[#020617] shadow-sm font-black"
                                : "bg-white/10 dark:bg-white/5 hover:bg-[#C6A96B]/20 text-slate-800 dark:text-[#F8F6F1] border border-slate-200 dark:border-white/10"
                            }`}
                          >
                            <span>{isSelected ? "✓ เลือกเวลานี้แล้ว" : "✨ ใช้นัดหมายยามนี้"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Toggle Appointment Planner Form */}
              <div className="pt-2 border-t border-black/10 dark:border-white/10 relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowPlannerForm(!showPlannerForm)}
                    className="text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B] hover:underline flex items-center gap-1"
                  >
                    <span>{showPlannerForm ? "▲ ย่อแบบฟอร์มนัดหมาย" : "▼ เปิดแบบฟอร์มนัดหมายฤกษ์สำเร็จ"}</span>
                  </button>

                  <Link
                    to={`/dashboard/check-yam?mode=compare&date=${eventDate}`}
                    className="text-[11px] text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white underline flex items-center gap-1"
                  >
                    <span>⚖️ เปรียบเทียบ 3 ช่วงเวลา</span>
                  </Link>
                </div>

                {/* Form Embedded */}
                {showPlannerForm && (
                  <Form method="get" className="space-y-3 pt-2 animate-in fade-in duration-200">
                    <input type="hidden" name="month" value={month} />
                    <input type="hidden" name="year" value={year} />

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-700 dark:text-[#C6B79F] font-bold">ชื่องานนัดหมาย:</label>
                      <input
                        name="title"
                        type="text"
                        value={selectedTitle}
                        onChange={(e) => setSelectedTitle(e.target.value)}
                        placeholder="เช่น นัดเซ็นสัญญากับลูกค้า"
                        className="w-full bg-white dark:bg-[#020617]/70 border border-slate-200 dark:border-[#C9A96E]/20 text-slate-900 dark:text-[#F8F6F1] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C6A96B]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-700 dark:text-[#C6B79F] font-bold">รายละเอียดของกิจกรรม (ถ้ามี):</label>
                      <textarea
                        name="description"
                        rows={2}
                        value={selectedDescription}
                        onChange={(e) => setSelectedDescription(e.target.value)}
                        placeholder="เช่น รายละเอียดการประชุม, เอกสารที่ต้องเตรียม, สถานที่"
                        className="w-full bg-white dark:bg-[#020617]/70 border border-slate-200 dark:border-[#C9A96E]/20 text-slate-900 dark:text-[#F8F6F1] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C6A96B] resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-700 dark:text-[#C6B79F] font-bold">ประเภทกิจกรรม:</label>
                        <select
                          name="eventType"
                          value={selectedEventType}
                          onChange={(e) => setSelectedEventType(e.target.value)}
                          className="w-full bg-white dark:bg-[#020617]/70 border border-slate-200 dark:border-[#C9A96E]/20 text-slate-900 dark:text-[#F8F6F1] rounded-xl px-2 py-2 text-xs outline-none focus:border-[#C6A96B]"
                        >
                          {EVENT_TYPES.map((e) => (
                            <option key={e.id} value={e.id} className="bg-white dark:bg-[#020617]">
                              {e.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-700 dark:text-[#C6B79F] font-bold">เวลาที่เริ่มนัด:</label>
                        <input
                          name="eventTime"
                          type="time"
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          className="w-full bg-white dark:bg-[#020617]/70 border border-slate-200 dark:border-[#C9A96E]/20 text-slate-900 dark:text-[#F8F6F1] rounded-xl px-2 py-2 text-xs outline-none focus:border-[#C6A96B]"
                        />
                      </div>
                    </div>

                    <input type="hidden" name="eventDate" value={eventDate} />

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl text-xs font-black text-cosmic-950 bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md flex items-center justify-center gap-1.5"
                    >
                      <span>🚀 ตรวจสอบคะแนนฤกษ์สำเร็จเฉพาะตน</span>
                    </button>
                  </Form>
                )}

                {/* Display advisor result (if submitted) */}
                {advisorResult && (
                  <div className="pt-3 border-t border-black/10 dark:border-white/10 space-y-3 animate-fade-up">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-[#94A3B8] font-bold">คะแนนฤกษ์สำเร็จ:</span>
                      <span className="text-sm font-black text-amber-600 dark:text-amber-300">{advisorResult.score}%</span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/5 border border-black/5 dark:border-white/10 text-xs text-slate-700 dark:text-[#CBD5E1] leading-relaxed">
                      {advisorResult.advice}
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Form method="post">
                        <input type="hidden" name="intent" value="save_appointment" />
                        <input type="hidden" name="title" value={selectedTitle || appointmentTitle} />
                        <input type="hidden" name="description" value={selectedDescription} />
                        <input type="hidden" name="eventType" value={selectedEventType} />
                        <input type="hidden" name="eventDate" value={eventDate} />
                        <input type="hidden" name="eventTime" value={selectedTime} />
                        <input type="hidden" name="score" value={advisorResult.score} />
                        <input type="hidden" name="verdict" value={advisorResult.verdict} />
                        <input type="hidden" name="advice" value={advisorResult.advice} />
                        <input type="hidden" name="yamName" value={advisorResult.yamName} />
                        <input type="hidden" name="bhop" value={advisorResult.bhop} />

                        <button
                          type="submit"
                          disabled={isSaving}
                          className="w-full py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-[#F8F6F1] bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 border border-black/10 dark:border-white/10 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>บันทึกนัดหมาย</span>
                        </button>
                      </Form>

                      <a
                        href={getGoogleCalendarUrl(
                          selectedTitle || appointmentTitle,
                          eventDate,
                          selectedTime,
                          selectedDescription
                            ? `${selectedDescription}\n\n────────────────\n✦ คำแนะนำฤกษ์ (PhopePhum):\nคะแนนความสำเร็จ: ${advisorResult.score}%\nยาม: ${advisorResult.yamName} (${advisorResult.bhop})\nคำแนะนำ: ${advisorResult.advice}`
                            : `✦ คำแนะนำฤกษ์ (PhopePhum):\nคะแนนความสำเร็จ: ${advisorResult.score}%\nยาม: ${advisorResult.yamName} (${advisorResult.bhop})\nคำแนะนำ: ${advisorResult.advice}`
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 rounded-xl text-xs font-bold text-[#020617] bg-[#F8F6F1] hover:bg-white transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Google Sync</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}
