import { json } from "@remix-run/cloudflare";
import { useLoaderData, useSearchParams, Form } from "@remix-run/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { Card } from "~/components/ui/Card";
import { getThaiBaseNumbers, THAI_MONTH_NAMES } from "@phopephum/engine";
import type { Env } from "~/env.server";
import { useState, useMemo } from "react";

export const meta: MetaFunction = () => [
  { title: "ปฏิทิน 100 ปี จันทรคติไทย — PhopePhum" },
  { name: "description", content: "ตรวจสอบวันทางจันทรคติไทย วันพระ และปีนักษัตร ครอบคลุม 100 ปี (พ.ศ. 2300 - 2700)" },
];

const G_MONTH_NAMES = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  const url = new URL(request.url);
  const now = new Date();
  const year = parseInt(url.searchParams.get("year") || String(now.getFullYear()));
  const month = parseInt(url.searchParams.get("month") || String(now.getMonth() + 1));

  // สร้างข้อมูลปฏิทินสำหรับเดือนที่เลือก
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=Sun

  const calendarDays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const lunar = getThaiBaseNumbers(dateStr);
    calendarDays.push({
      day: d,
      ...lunar
    });
  }

  return json({
    profile,
    year,
    month,
    calendarDays,
    firstDayOfWeek,
  });
}

export default function DashboardCalendar() {
  const { year, month, calendarDays, firstDayOfWeek } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  const beYear = year + 543;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-[#C9A96E] text-[13px] tracking-[0.25em] uppercase font-bold block mb-1">
            ✦ Living Wisdom Calendar
          </span>
          <h1 className="font-display text-3xl font-bold text-[#F8F6F1] glow-gold">
            ปฏิทิน 100 ปี จันทรคติไทย
          </h1>
          <p className="text-[#8A8070] text-sm italic">
            ตรวจสอบวันขึ้น-แรม วันพระ และการเปลี่ยนปีนักษัตรตามตำราหลวง
          </p>
        </div>

        {/* ── Selectors ── */}
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

      {/* ── Year Info Card ── */}
      <Card className="p-6 bg-gradient-to-br from-[#C9A96E]/10 to-transparent border-[#C9A96E]/20">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#C9A96E]/10 border border-[#C9A96E]/30 flex items-center justify-center text-3xl shadow-lg shadow-amber-900/10">
            {calendarDays[0]?.zodiacName === "ชวด" ? "🐀" : 
             calendarDays[0]?.zodiacName === "ฉลู" ? "🐂" :
             calendarDays[0]?.zodiacName === "ขาล" ? "🐅" :
             calendarDays[0]?.zodiacName === "เถาะ" ? "🐇" :
             calendarDays[0]?.zodiacName === "มะโรง" ? "🐉" :
             calendarDays[0]?.zodiacName === "มะเส็ง" ? "🐍" :
             calendarDays[0]?.zodiacName === "มะเมีย" ? "🐎" :
             calendarDays[0]?.zodiacName === "มะแม" ? "🐐" :
             calendarDays[0]?.zodiacName === "วอก" ? "🐒" :
             calendarDays[0]?.zodiacName === "ระกา" ? "🐓" :
             calendarDays[0]?.zodiacName === "จอ" ? "🐕" : "🐖"}
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#F8F6F1]">
              พ.ศ. {beYear} ปี{calendarDays[0]?.zodiacName}
            </h2>
            <p className="text-sm text-[#8A8070]">
              จุลศักราช {beYear - 1181} | รัตนโกสินทร์ศก {beYear - 2324}
            </p>
          </div>
        </div>
      </Card>

      {/* ── Calendar Grid ── */}
      <Card className="p-0 overflow-hidden border-[#C9A96E]/20 shadow-2xl bg-slate-900/40 backdrop-blur-md">
        <div className="grid grid-cols-7 border-b border-[#C9A96E]/20 bg-[#C9A96E]/5">
          {["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."].map((d, i) => (
            <div key={i} className={`py-3 text-center text-xs font-bold uppercase tracking-widest ${i === 0 ? "text-rose-400" : i === 6 ? "text-sky-400" : "text-[#F3D68B]"}`}>
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 bg-slate-950/15">
          {/* Padding for first week */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`pad-${i}`} className="aspect-square md:aspect-video border-b border-r border-white/5 bg-slate-950/50" />
          ))}

          {calendarDays.map((day) => (
            <div 
              key={day.day}
              className={`relative aspect-square md:aspect-video border-b border-r border-white/5 p-2 transition-all hover:bg-[#C9A96E]/5 group ${day.isWanPhra ? "bg-[#C9A96E]/5" : ""}`}
            >
              {/* Day Number */}
              <span className={`text-sm font-bold ${day.weekDay === 0 ? "text-rose-400/80" : "text-[#F8F6F1]/60"} group-hover:text-[#F8F6F1] transition-colors`}>
                {day.day}
              </span>

              {/* Lunar Details */}
              <div className="mt-1 flex flex-col gap-1">
                <span className={`text-[13px] md:text-xs leading-tight ${day.isWanPhra ? "text-amber-400 font-bold drop-shadow-md" : "text-[#D9CDB7]"}`}>
                  {day.moonPhase}
                </span>
                <span className="text-[12px] md:text-[13px] text-[#D9CDB7]/70 leading-none">
                  {day.lunarMonthName}
                </span>
              </div>

              {/* Wan Phra Icon */}
              {day.isWanPhra && (
                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" title="วันพระ" />
              )}
              
              {/* Zodiac change indicator (Month 5 Day 1) */}
              {day.lunarMonth === 5 && day.lunarDay === 1 && day.moonPhase.includes("ขึ้น") && (
                <div className="absolute bottom-1 right-1 px-1 rounded bg-[#C9A96E]/20 border border-[#C9A96E]/30 text-[10px] text-[#C9A96E] font-bold uppercase tracking-tighter">
                  เปลี่ยนปี
                </div>
              )}
            </div>
          ))}

          {/* Padding for last week */}
          {Array.from({ length: (7 - (firstDayOfWeek + calendarDays.length) % 7) % 7 }).map((_, i) => (
            <div key={`pad-last-${i}`} className="aspect-square md:aspect-video border-b border-r border-white/5 bg-slate-950/50" />
          ))}
        </div>
      </Card>

      {/* ── Legend & Extra Info ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-slate-950/20 border-white/5 text-xs space-y-2 text-[#8A8070]">
          <h3 className="font-bold text-[#C9A96E] uppercase tracking-wider text-[13px] mb-2">สัญลักษณ์และคำอธิบาย</h3>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>วันพระ (ขึ้น 8, ขึ้น 15, แรม 8, และแรม 14 หรือ 15 ค่ำ)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-1 rounded bg-[#C9A96E]/20 border border-[#C9A96E]/30 text-[10px] text-[#C9A96E] font-bold">เปลี่ยนปี</div>
            <span>วันขึ้น 1 ค่ำ เดือน 5 คือวันเริ่มต้นปีนักษัตรใหม่ตามปฏิทินหลวง</span>
          </div>
        </Card>
        
        <Card className="p-4 bg-slate-950/20 border-white/5 text-xs text-[#8A8070] flex flex-col justify-center">
           <p className="italic">
             "ปฏิทินนี้อ้างอิงจากคัมภีร์ปฏิทินร้อยปีและอัลกอริทึมทางดาราศาสตร์ที่มีความแม่นยำสูง ครอบคลุมการคำนวณอธิกมาสและอธิกวารตามระเบียบประเพณีไทย"
           </p>
        </Card>
      </div>
    </div>
  );
}
