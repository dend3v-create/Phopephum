import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData, useSearchParams, Form, Link, useNavigation } from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { Card } from "~/components/ui/Card";
import { calculatePhopephum, getThaiBaseNumbers, THAI_MONTH_NAMES } from "@phopephum/engine";
import type { Env } from "~/env.server";
import { useState, useMemo, useEffect } from "react";
import { Compass, Calendar as CalendarIcon, Clock, CheckCircle2, AlertTriangle, Star, Save, ExternalLink, ListTodo } from "lucide-react";

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
  
  // ── 1. ปฏิทินจันทรคติรายเดือน ──
  const year = parseInt(url.searchParams.get("year") || String(now.getFullYear()));
  const month = parseInt(url.searchParams.get("month") || String(now.getMonth() + 1));

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

  const calendarDays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const lunar = getThaiBaseNumbers(dateStr);
    
    // กรองนัดหมายของวันนี้
    const dayAppointments = (appointments || []).filter(a => a.event_date === dateStr);
    
    calendarDays.push({ 
      day: d, 
      dateStr,
      appointments: dayAppointments,
      ...lunar 
    });
  }

  // ── 2. วางแผนฤกษ์มงคล (Timing Advisor) ──
  const eventDate = url.searchParams.get("eventDate");
  const eventTime = url.searchParams.get("eventTime") || "12:00";
  const eventType = url.searchParams.get("eventType") || "negotiation";
  const appointmentTitle = url.searchParams.get("title") || "";
  
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
    appointments: appointments || []
  });
}

export default function DashboardCalendar() {
  const { 
    year, month, calendarDays, firstDayOfWeek, 
    eventDate, eventTime, eventType, appointmentTitle,
    advisorResult, profile, appointments 
  } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigation = useNavigation();
  const isSaving = navigation.state !== "idle" && navigation.formData?.get("intent") === "save_appointment";

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
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
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
          <Card className="p-0 overflow-hidden border-[#C9A96E]/20 shadow-2xl bg-slate-900/40 backdrop-blur-md">
            <div className="grid grid-cols-7 border-b border-[#C9A96E]/20 bg-[#C9A96E]/5">
              {["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."].map((d, i) => (
                <div key={i} className={`py-3 text-center text-xs font-bold uppercase tracking-widest font-sans-thai ${i === 0 ? "text-rose-400" : i === 6 ? "text-sky-400" : "text-[#F3D68B]"}`}>
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 bg-slate-950/15">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square md:aspect-video border-b border-r border-white/5 bg-slate-950/50" />
              ))}

              {calendarDays.map((day) => (
                <Link 
                  key={day.day}
                  to={`?year=${year}&month=${month}&eventDate=${day.dateStr}&eventTime=${eventTime}&eventType=${eventType}&title=${encodeURIComponent(appointmentTitle)}`}
                  className={`relative aspect-square md:aspect-video border-b border-r border-white/5 p-2 transition-all hover:bg-[#C9A96E]/10 group ${day.isWanPhra ? "bg-[#C9A96E]/5" : ""} ${eventDate === day.dateStr ? "bg-[#C9A96E]/20 ring-1 ring-inset ring-gold-liquid/50" : ""}`}
                >
                  <span className={`text-xs sm:text-sm font-bold ${day.weekDay === 0 ? "text-rose-400/80" : "text-[#F8F6F1]/60"} group-hover:text-[#F8F6F1] transition-colors`}>
                    {day.day}
                  </span>

                  <div className="mt-1 flex flex-col gap-0.5">
                    <span className={`text-[10px] md:text-xs font-sans-thai leading-tight ${day.isWanPhra ? "text-amber-400 font-bold drop-shadow-md" : "text-[#D9CDB7]/80"}`}>
                      {day.moonPhase}
                    </span>
                  </div>

                  {/* แสดงจุดนัดหมาย */}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {day.appointments.map((apt: any) => (
                      <div 
                        key={apt.id} 
                        className={`w-1.5 h-1.5 rounded-full ${apt.score >= 80 ? "bg-emerald-400" : apt.score >= 60 ? "bg-sky-400" : "bg-rose-400"}`}
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
                <div key={`pad-last-${i}`} className="aspect-square md:aspect-video border-b border-r border-white/5 bg-slate-950/50" />
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

        {/* ── Right: Success Timing Advisor (1/3 width) ── */}
        <div className="space-y-6">
          <Card className="p-6 border-2 border-[#C9A96E]/30 bg-gradient-to-b from-[#0a2240] to-[#020617] rounded-3xl shadow-xl">
            <h3 className="font-display font-black text-gold-liquid text-lg mb-4 flex items-center gap-2">
              <Compass className="w-5 h-5 animate-spin-slow" /> วางแผนฤกษ์มงคล
            </h3>

            {profile?.birth_date ? (
              <Form method="get" className="space-y-4 font-sans-thai">
                {/* Keep current month view params */}
                <input type="hidden" name="month" value={month} />
                <input type="hidden" name="year" value={year} />

                <div className="space-y-1">
                  <label className="text-[11px] text-[#C6B79F] uppercase font-bold tracking-wider">ชื่องานนัดหมาย</label>
                  <input
                    name="title"
                    type="text"
                    defaultValue={appointmentTitle}
                    placeholder="เช่น นัดเซ็นสัญญากับลูกค้า"
                    className="w-full bg-[#020617]/70 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-gold-liquid"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#C6B79F] uppercase font-bold tracking-wider">ประเภทกิจกรรม</label>
                  <select
                    name="eventType"
                    defaultValue={eventType}
                    className="w-full bg-[#020617]/70 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-gold-liquid"
                  >
                    {EVENT_TYPES.map(e => (
                      <option key={e.id} value={e.id} className="bg-[#020617]">{e.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#C6B79F] uppercase font-bold tracking-wider">วันที่ทำนัด</label>
                    <input
                      name="eventDate"
                      type="date"
                      defaultValue={eventDate || ""}
                      required
                      className="w-full bg-[#020617]/70 border border-[#C9A96B]/20 text-[#F8F6F1] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-gold-liquid"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#C6B79F] uppercase font-bold tracking-wider">เวลาที่เริ่มนัด</label>
                    <input
                      name="eventTime"
                      type="time"
                      defaultValue={eventTime}
                      className="w-full bg-[#020617]/70 border border-[#C9A96B]/20 text-[#F8F6F1] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-gold-liquid"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl text-xs font-black text-cosmic-950 bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] transition-all hover:scale-102 active:scale-98 shadow-md"
                >
                  🚀 ตรวจสอบคะแนนฤกษ์สำเร็จ
                </button>
              </Form>
            ) : (
              <div className="text-center py-6 space-y-3">
                <p className="text-xs text-[#C6B79F] font-sans-thai">กรุณาตั้งค่าข้อมูลวันเกิดในโปรไฟล์ก่อนใช้งานฤกษ์สำเร็จเฉพาะบุคคล</p>
                <Link to="/dashboard/settings" className="inline-block text-xs font-black text-[#C9A96E] hover:underline font-sans-thai">
                  ไปที่ตั้งค่าดวงเกิด →
                </Link>
              </div>
            )}

            {/* Display advisor calculations */}
            {advisorResult && (
              <div className="mt-5 pt-4 border-t border-[#C9A96B]/20 space-y-4 animate-fade-up">
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#94A3B8] font-bold">ความสำเร็จที่คาดหวัง:</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.round(advisorResult.score / 20) 
                            ? "text-yellow-400 fill-yellow-400" 
                            : "text-white/10"
                        }`}
                      />
                    ))}
                    <span className="text-sm font-black text-[#F8F6F1] ml-1.5">{advisorResult.score}%</span>
                  </div>
                </div>

                <div className="rounded-2xl p-4 bg-white/5 border border-white/10 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-gold-300 tracking-wider">ยามปกครอง:</span>
                    <span className="text-xs font-bold text-[#F8F6F1]">{advisorResult.yamName} ({advisorResult.timeLabel})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-gold-300 tracking-wider">สภาวะทักษา:</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                      advisorResult.status === "excellent" ? "text-emerald-400 border-emerald-500/25 bg-emerald-500/5" :
                      advisorResult.status === "warning" ? "text-rose-400 border-rose-500/25 bg-rose-500/5" :
                      "text-sky-300 border-sky-500/25 bg-sky-500/5"
                    }`}>
                      ยาม{advisorResult.bhop}
                    </span>
                  </div>
                </div>

                <div className={`p-3.5 rounded-xl border text-xs sm:text-[13px] font-sans-thai leading-relaxed ${
                  advisorResult.status === "warning"
                    ? "bg-rose-500/5 border-rose-500/25 text-rose-300"
                    : "bg-[#C9A96E]/5 border-[#C9A96E]/20 text-[#D9CDB7]"
                }`}>
                  {advisorResult.advice}
                </div>

                {/* ── Action Buttons ── */}
                <div className="grid grid-cols-1 gap-2 pt-2">
                  <Form method="post">
                    <input type="hidden" name="intent" value="save_appointment" />
                    <input type="hidden" name="title" value={appointmentTitle} />
                    <input type="hidden" name="eventType" value={eventType} />
                    <input type="hidden" name="eventDate" value={eventDate ?? ""} />
                    <input type="hidden" name="eventTime" value={eventTime} />
                    <input type="hidden" name="score" value={advisorResult.score} />
                    <input type="hidden" name="verdict" value={advisorResult.verdict} />
                    <input type="hidden" name="advice" value={advisorResult.advice} />
                    <input type="hidden" name="yamName" value={advisorResult.yamName} />
                    <input type="hidden" name="bhop" value={advisorResult.bhop} />
                    
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-[#F8F6F1] bg-white/10 hover:bg-white/20 border border-white/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <span className="animate-pulse">กำลังบันทึก...</span>
                      ) : (
                        <>
                          <Save className="w-4 h-4" /> บันทึกลงระบบ PhopePhum
                        </>
                      )}
                    </button>
                  </Form>

                  <a 
                    href={getGoogleCalendarUrl(appointmentTitle, eventDate!, eventTime, advisorResult.advice)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-[#020617] bg-[#F8F6F1] hover:bg-white transition-all flex items-center justify-center gap-2"
                  >
                    <img src="https://www.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_15_2x.png" className="w-4 h-4" alt="Google Calendar" />
                    เพิ่มใน Google Calendar
                  </a>
                </div>

              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
