import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData, useSearchParams, Form, Link, useNavigation } from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { Card } from "~/components/ui/Card";
import {
  calculatePhopephum,
  getThaiBaseNumbers,
  THAI_MONTH_NAMES,
  getAstrologicalDate,
  getAstrologicalDateStr,
} from "@phopephum/engine";
import {
  calculateDayIntelligence,
  calculateMonthOverview,
} from "~/services/calendarIntelligence.server";
import type {
  CalendarDayIntelligence,
  CalendarMonthDayOverview,
} from "@phopephum/types";
import type { Env } from "~/env.server";
import { useState, useMemo, useEffect } from "react";
import { Compass, Calendar as CalendarIcon, Clock, CheckCircle2, AlertTriangle, Star, Save, ExternalLink, ListTodo, Sparkles } from "lucide-react";

export const meta: MetaFunction = () => [
  { title: "ปฏิทินสำเร็จ 100 ปี & วางแผนฤกษ์มงคล — PhopePhum" },
  { name: "description", content: "ตรวจสอบวันทางจันทรคติไทย และวิเคราะห์ฤกษ์มงคลเฉพาะบุคคลด้วยระบบปฏิทินอัจฉริยะ" },
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

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save_appointment") {
    const { supabase, headers } = createSupabaseClient(request, env);
    
    const title = formData.get("title") as string;
    const eventType = formData.get("eventType") as string;
    const eventDate = formData.get("eventDate") as string;
    const eventTime = formData.get("eventTime") as string;
    const score = parseInt(formData.get("score") as string || "0");
    const verdict = formData.get("verdict") as string;
    const advice = formData.get("advice") as string;
    const yamName = formData.get("yamName") as string;
    const bhop = formData.get("bhop") as string;

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
  
  const dayIntelligence = await calculateDayIntelligence(eventDate, profileContext);
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
    advisorResult,
    appointments: appointments || [],
    dayIntelligence,
    monthOverview,
  });
}

export default function DashboardCalendar() {
  const { 
    year, month, calendarDays, firstDayOfWeek, 
    eventDate, eventTime, eventType, appointmentTitle,
    advisorResult, profile, appointments,
    dayIntelligence, monthOverview,
  } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigation = useNavigation();
  const isSaving = navigation.state !== "idle" && navigation.formData?.get("intent") === "save_appointment";

  const [selectedTime, setSelectedTime] = useState(eventTime);
  const [selectedEventType, setSelectedEventType] = useState(eventType);
  const [selectedTitle, setSelectedTitle] = useState(appointmentTitle);
  const [showPlannerForm, setShowPlannerForm] = useState(false);

  useEffect(() => {
    setSelectedTime(eventTime);
  }, [eventTime]);

  const beYear = year + 543;

  // ฟังก์ชันสร้าง Google Calendar Link
  const getGoogleCalendarUrl = (title: string, date: string, time: string, details: string) => {
    const baseUrl = "https://www.google.com/calendar/render?action=TEMPLATE";
    // Format: YYYYMMDDTHHmmSSZ
    const startStr = date.replace(/-/g, "") + "T" + time.replace(/:/g, "") + "00";
    // เพิ่ม 1 ชั่วโมงเป็นเวลาสิ้นสุด default
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
    <div className="w-full max-w-full min-w-0 overflow-x-hidden max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-[#C9A96E] text-[13px] tracking-[0.25em] uppercase font-bold block mb-1">
            ✦ Living Wisdom Calendar
          </span>
          <h1 className="font-display text-3xl font-bold text-[#F8F6F1] glow-gold">
            ปฏิทินสำเร็จ & ฤกษ์มงคล
          </h1>
          <p className="text-[#C6B79F] text-sm font-sans-thai">
            วางแผนนัดหมายสำคัญให้ตรงกับยามมงคลและทักษาจรส่วนบุคคลของคุณ
          </p>
        </div>

        {/* ── Month/Year Selectors ── */}
        <Form method="get" className="flex flex-wrap gap-2">
          <select 
            name="month" 
            defaultValue={month}
            className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-4 py-2 text-sm focus:border-[#C9A96E]/50 outline-none"
            onChange={(e) => e.target.form?.submit()}
          >
            {G_MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1} className="bg-[#020617]">{name}</option>
            ))}
          </select>
          <select 
            name="year" 
            defaultValue={year}
            className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-4 py-2 text-sm focus:border-[#C9A96E]/50 outline-none"
            onChange={(e) => e.target.form?.submit()}
          >
            {Array.from({ length: 401 }).map((_, i) => {
              const y = 1757 + i;
              return <option key={y} value={y} className="bg-[#020617]">{y + 543} (CE {y})</option>
            })}
          </select>
        </Form>
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
                  to={`?year=${year}&month=${month}&eventDate=${day.dateStr}&eventTime=${eventTime}&eventType=${eventType}&title=${encodeURIComponent(appointmentTitle)}`}
                  className={`relative aspect-square md:aspect-video border-b border-r border-slate-200/60 dark:border-white/5 p-1 sm:p-2 transition-all hover:bg-amber-100/40 dark:hover:bg-[#C9A96E]/10 group ${day.isWanPhra ? "bg-amber-50/60 dark:bg-[#C9A96E]/5" : ""} ${eventDate === day.dateStr ? "bg-amber-100/80 dark:bg-[#C9A96E]/20 ring-2 ring-inset ring-amber-600 dark:ring-gold-liquid/50 font-bold" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] sm:text-sm font-bold ${day.weekDay === 0 ? "text-rose-600 dark:text-rose-400/80" : "text-slate-800 dark:text-[#F8F6F1]/60"} group-hover:text-slate-950 dark:group-hover:text-[#F8F6F1] transition-colors`}>
                      {day.day}
                    </span>
                    {day.hasGoldenWindow && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-300 font-bold leading-none" title="มีช่วงเวลาทองคำ (Golden Window)">
                        ⭐
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-col gap-0.5">
                    <span className={`text-[10px] md:text-xs font-sans-thai leading-tight ${day.isWanPhra ? "text-amber-700 dark:text-amber-400 font-bold drop-shadow-sm" : "text-slate-600 dark:text-[#D9CDB7]/80"}`}>
                      {day.moonPhase}
                    </span>
                  </div>

                  {/* แสดงจุดนัดหมาย */}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {day.appointments.map((apt: any) => (
                      <div 
                        key={apt.id} 
                        className={`w-1.5 h-1.5 rounded-full ${apt.score >= 80 ? "bg-emerald-500" : apt.score >= 60 ? "bg-sky-500" : "bg-rose-500"}`}
                        title={apt.title}
                      />
                    ))}
                  </div>

                  {day.isWanPhra && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" title="วันพระ" />
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
            <h3 className="font-display font-bold text-gold-liquid flex items-center gap-2">
              <ListTodo className="w-5 h-5" /> รายการนัดหมายฤกษ์มงคลของคุณ
            </h3>
            {appointments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appointments.map((apt: any) => (
                  <Card key={apt.id} className="p-4 bg-slate-900/40 border-[#C9A96E]/20 hover:border-[#C9A96E]/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                          apt.score >= 80 ? "bg-emerald-500/20 text-emerald-400" : "bg-sky-500/20 text-sky-400"
                        }`}>
                          {apt.score}%
                        </span>
                        <h4 className="text-sm font-bold text-[#F8F6F1] line-clamp-1">{apt.title}</h4>
                      </div>
                      <span className="text-[10px] text-[#C6B79F] font-mono">{apt.event_time.slice(0, 5)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#C6B79F]">
                      <CalendarIcon className="w-3 h-3" /> {new Date(apt.event_date).toLocaleDateString("th-TH", { day: 'numeric', month: 'short', year: 'numeric' })}
                      <span className="mx-1">•</span>
                      <Clock className="w-3 h-3" /> {apt.yam_name}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <a 
                        href={getGoogleCalendarUrl(apt.title, apt.event_date, apt.event_time, apt.advice)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] flex items-center gap-1 text-[#C9A96E] hover:text-gold-liquid transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" /> Sync Google
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#C6B79F] bg-white/5 p-8 rounded-2xl text-center border border-white/5 italic">
                ยังไม่มีนัดหมายที่บันทึกไว้สำหรับเดือนนี้
              </p>
            )}
          </div>
        </div>

        {/* ── Right: Personal Auspicious Day Intelligence (1/3 width) ── */}
        <div className="space-y-6">
          {/* Day Intelligence Card */}
          {dayIntelligence && (
            <Card className="p-6 border-2 border-slate-200 dark:border-[#C9A96E]/40 bg-white/95 dark:bg-gradient-to-br dark:from-[#0a2240] dark:via-[#0d1f38] dark:to-[#020617] rounded-3xl shadow-xl space-y-5 relative overflow-hidden">
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
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    {dayIntelligence.overallScore}% พลังงานเกื้อหนุน
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
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

              {/* 3. ⭐ GOLDEN WINDOW SPOTLIGHT */}
              {dayIntelligence.goldenWindow && (
                <div className="p-4 rounded-2xl border-2 border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-[#C6A96B]/15 to-transparent relative z-10 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⭐</span>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
                          GOLDEN WINDOW OF THE DAY
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                          {dayIntelligence.goldenWindow.startTime} – {dayIntelligence.goldenWindow.endTime} น.
                        </h4>
                      </div>
                    </div>
                    <span className="text-xs font-black text-amber-800 dark:text-amber-300 bg-amber-400/20 border border-amber-400/30 px-2.5 py-1 rounded-full">
                      {dayIntelligence.goldenWindow.score}/100
                    </span>
                  </div>

                  {/* Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {dayIntelligence.goldenWindow.suitableFor.map((item, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-800 dark:text-[#F8F6F1] border border-black/10 dark:border-white/10 font-medium"
                      >
                        ✓ {item}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-slate-700 dark:text-[#CBD5E1] leading-relaxed font-medium">
                    {dayIntelligence.goldenWindow.plainAdvice}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTime(dayIntelligence.goldenWindow!.startTime);
                      setShowPlannerForm(true);
                    }}
                    className="w-full py-2 rounded-xl text-xs font-bold text-[#020617] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    style={{ background: "linear-gradient(135deg, #C6A96B 0%, #F2D49B 100%)" }}
                  >
                    <span>✨ ใช้นัดหมายช่วงเวลานี้</span>
                  </button>
                </div>
              )}

              {/* 4. Timeline of the Day (8 slots) */}
              <div className="space-y-2 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#C6A96B] dark:text-[#94A3B8]">
                    ไทม์ไลน์ช่วงเวลาตลอดวัน:
                  </span>
                  <span className="text-[10px] text-slate-600 dark:text-[#64748B]">คลิกเพื่อเลือกเวลา</span>
                </div>

                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 no-scrollbar">
                  {dayIntelligence.timelineWindows.map((win) => {
                    const isSelected = selectedTime === win.startTime;
                    return (
                      <button
                        key={win.id}
                        type="button"
                        onClick={() => {
                          setSelectedTime(win.startTime);
                          setShowPlannerForm(true);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-[#C6A96B]/20 border-[#C6A96B] text-slate-900 dark:text-white"
                            : win.level === "golden"
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20"
                            : win.level === "favorable"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-500/20"
                            : win.level === "caution" || win.level === "avoid"
                            ? "bg-rose-500/10 border-rose-500/20 text-rose-900 dark:text-rose-300 hover:bg-rose-500/20"
                            : "bg-white/5 border-black/10 dark:border-white/5 text-slate-800 dark:text-[#CBD5E1] hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-[11px]">
                            {win.startTime}–{win.endTime}
                          </span>
                          <span className="text-[11px] truncate max-w-[130px] font-medium">{win.suitableFor[0] || win.title}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {win.isGoldenWindow && <span className="text-xs">⭐</span>}
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/10 dark:bg-black/30 text-slate-900 dark:text-white border border-black/5 dark:border-white/5">
                            {win.score}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. 4 Life Domains */}
              <div className="space-y-2 relative z-10">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C6A96B] dark:text-[#94A3B8]">
                  ความสอดคล้อง 4 มิติชีวิต:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {dayIntelligence.domainScores.map((dm) => (
                    <div key={dm.domain} className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 font-bold text-slate-900 dark:text-white text-[11px]">
                          <span>{dm.icon}</span>
                          <span>{dm.label.split("&")[0]}</span>
                        </span>
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">{dm.score}%</span>
                      </div>
                      <p className="text-[10px] text-slate-600 dark:text-[#94A3B8] leading-tight line-clamp-1">{dm.verdict}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Toggle Appointment Planner */}
              <div className="pt-2 border-t border-white/10 relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowPlannerForm(!showPlannerForm)}
                    className="text-xs font-bold text-[#C6A96B] hover:underline flex items-center gap-1"
                  >
                    <span>{showPlannerForm ? "▲ ย่อแบบฟอร์มนัดหมาย" : "▼ เปิดแบบฟอร์มนัดหมายฤกษ์สำเร็จ"}</span>
                  </button>

                  <Link
                    to={`/dashboard/check-yam?mode=compare&date=${eventDate}`}
                    className="text-[11px] text-[#94A3B8] hover:text-white underline flex items-center gap-1"
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
                      <label className="text-[11px] text-[#C6B79F] font-bold">ชื่องานนัดหมาย:</label>
                      <input
                        name="title"
                        type="text"
                        value={selectedTitle}
                        onChange={(e) => setSelectedTitle(e.target.value)}
                        placeholder="เช่น นัดเซ็นสัญญากับลูกค้า"
                        className="w-full bg-[#020617]/70 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C6A96B]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] text-[#C6B79F] font-bold">ประเภทกิจกรรม:</label>
                        <select
                          name="eventType"
                          value={selectedEventType}
                          onChange={(e) => setSelectedEventType(e.target.value)}
                          className="w-full bg-[#020617]/70 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-2 py-2 text-xs outline-none focus:border-[#C6A96B]"
                        >
                          {EVENT_TYPES.map((e) => (
                            <option key={e.id} value={e.id} className="bg-[#020617]">
                              {e.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-[#C6B79F] font-bold">เวลาที่เริ่มนัด:</label>
                        <input
                          name="eventTime"
                          type="time"
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          className="w-full bg-[#020617]/70 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-2 py-2 text-xs outline-none focus:border-[#C6A96B]"
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
                  <div className="pt-3 border-t border-white/10 space-y-3 animate-fade-up">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#94A3B8] font-bold">คะแนนฤกษ์สำเร็จ:</span>
                      <span className="text-sm font-black text-amber-300">{advisorResult.score}%</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-[#CBD5E1] leading-relaxed">
                      {advisorResult.advice}
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Form method="post">
                        <input type="hidden" name="intent" value="save_appointment" />
                        <input type="hidden" name="title" value={selectedTitle || appointmentTitle} />
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
                          className="w-full py-2 rounded-xl text-xs font-bold text-[#F8F6F1] bg-white/10 hover:bg-white/20 border border-white/10 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>บันทึกนัดหมาย</span>
                        </button>
                      </Form>

                      <a
                        href={getGoogleCalendarUrl(selectedTitle || appointmentTitle, eventDate, selectedTime, advisorResult.advice)}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 rounded-xl text-xs font-bold text-[#020617] bg-[#F8F6F1] hover:bg-white transition-all flex items-center justify-center gap-1.5"
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
