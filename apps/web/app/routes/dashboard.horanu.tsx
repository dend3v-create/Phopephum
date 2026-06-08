import { json } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, useLoaderData, useSubmit } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile, requireMinPlan } from "~/services/auth.server";
import { calculateHoraNu } from "@phopephum/engine";
import type { Env } from "~/env.server";
import { Card } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { useState, useEffect, useMemo } from "react";

export const meta: MetaFunction = () => [
  { title: "โหรทายหนู — PhopePhum" },
  { name: "description", content: "พยากรณ์กาลชะตาด้วยระบบยามอัฐกาลและดาวลอยโบราณ" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireMinPlan("basic", request, env);

  const now = new Date();
  const result = calculateHoraNu(now);

  const thaiDateLabel = now.toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return json({
    result,
    thaiDateLabel,
    currentTime: now.toISOString(),
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAuth(request, env);

  const formData = await request.formData();
  const timeMode = formData.get("timeMode") as "live" | "custom";
  
  let targetDate = new Date();
  
  if (timeMode === "custom") {
    const tDay = Number(formData.get("customDay"));
    const tMonth = Number(formData.get("customMonth"));
    const tYear = Number(formData.get("customYear"));
    const tYearCE = tYear - 543;
    const timeStr = String(formData.get("customTime") || "12:00");
    const [th, tmin] = timeStr.split(":").map(Number);
    
    if (tDay && tMonth && tYear) {
      targetDate = new Date(tYearCE, tMonth - 1, tDay, th, tmin, 0);
    }
  }

  const result = calculateHoraNu(targetDate);

  return json({ result });
}

export default function HoraNuPage() {
  const { result: initialResult, thaiDateLabel, currentTime } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isSubmitting = navigation.state !== "idle";

  const result = actionData?.result || initialResult;

  const [timeMode, setTimeMode] = useState<"live" | "custom">("live");
  const [localTime, setLocalTime] = useState(new Date(currentTime));

  useEffect(() => {
    if (timeMode === "live") {
      const timer = setInterval(() => {
        setLocalTime(new Date());
        // auto refresh results every minute in live mode
        if (new Date().getSeconds() === 0) {
          submit(new FormData(), { method: "post" });
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeMode, submit]);

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-[#F8F6F1] glow-gold mb-2">
            โหรทายหนู
          </h1>
          <p className="text-[#94A3B8]">
            พยากรณ์กาลชะตาระดับนาทีด้วยระบบยามอัฐกาลและดาวลอย
          </p>
        </div>

        <Card className="p-1 bg-[#0F172A]/80 border-[#C6A96B]/20 backdrop-blur-md">
          <div className="flex gap-1">
            <button
              onClick={() => setTimeMode("live")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeMode === "live" 
                ? "bg-[#C6A96B] text-[#020617] shadow-lg shadow-[#C6A96B]/20" 
                : "text-[#94A3B8] hover:text-[#F8F6F1]"
              }`}
            >
              เวลาปัจจุบัน (Live)
            </button>
            <button
              onClick={() => setTimeMode("custom")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeMode === "custom" 
                ? "bg-[#C6A96B] text-[#020617] shadow-lg shadow-[#C6A96B]/20" 
                : "text-[#94A3B8] hover:text-[#F8F6F1]"
              }`}
            >
              กำหนดเวลาเอง
            </button>
          </div>
        </Card>
      </div>

      {/* Control Panel for Custom Time */}
      {timeMode === "custom" && (
        <Card className="p-6 border-[#C6A96B]/20 bg-[#0F172A]/40">
          <Form method="post" className="flex flex-wrap items-end gap-4">
            <input type="hidden" name="timeMode" value="custom" />
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold">วันที่</label>
              <Input 
                type="number" 
                name="customDay" 
                defaultValue={new Date().getDate()} 
                className="w-20 bg-[#020617]/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold">เดือน</label>
              <Input 
                type="number" 
                name="customMonth" 
                defaultValue={new Date().getMonth() + 1} 
                className="w-20 bg-[#020617]/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold">ปี (พ.ศ.)</label>
              <Input 
                type="number" 
                name="customYear" 
                defaultValue={new Date().getFullYear() + 543} 
                className="w-28 bg-[#020617]/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold">เวลา</label>
              <Input 
                type="time" 
                name="customTime" 
                defaultValue={new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} 
                className="w-32 bg-[#020617]/50"
              />
            </div>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-[#C6A96B] hover:bg-[#D9BC82] text-[#020617] font-bold px-8"
            >
              {isSubmitting ? "กำลังคำนวณ..." : "คำนวณดวง"}
            </Button>
          </Form>
        </Card>
      )}

      {/* Result Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Summary & Yama */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-8 border-[#C6A96B]/30 bg-gradient-to-br from-[#0F172A] to-[#020617] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <IconHoraNuLarge />
            </div>
            
            <div className="relative z-10 space-y-6 text-center">
              <div>
                <p className="text-[#C6A96B] text-xs font-bold uppercase tracking-[0.2em] mb-2">
                   {result.dayName} {result.phase === 'day' ? 'กาลกลางวัน' : 'กาลกลางคืน'}
                </p>
                <div className="text-4xl font-display font-bold text-[#F8F6F1] mb-1">
                   {result.currentPlanetSymbol} ดาว{result.currentPlanetName}
                </div>
                <p className="text-[#94A3B8] text-sm italic">
                  เจ้าเรือน{result.currentZodiacName} — {result.currentStatusLabel}
                </p>
              </div>

              <div className="py-6 border-y border-[#C6A96B]/10 flex justify-around items-center">
                 <div className="text-center">
                   <p className="text-[10px] text-[#94A3B8] uppercase font-bold mb-1">ยามที่</p>
                   <p className="text-2xl font-bold text-[#F8F6F1]">{result.yamNumber}</p>
                 </div>
                 <div className="h-8 w-px bg-[#C6A96B]/20" />
                 <div className="text-center">
                   <p className="text-[10px] text-[#94A3B8] uppercase font-bold mb-1">ทิศมงคล</p>
                   <p className="text-2xl font-bold text-[#F8F6F1]">{result.currentDirection}</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <p className="text-xs text-[#94A3B8] font-medium leading-relaxed max-w-sm mx-auto">
                    {result.prediction}
                 </p>
              </div>
            </div>
          </Card>

          {/* Yama Schedule */}
          <Card className="p-0 overflow-hidden border-[#C6A96B]/10 bg-[#0F172A]/40">
             <div className="p-4 border-b border-[#C6A96B]/10 bg-white/5">
                <h3 className="text-xs font-bold text-[#C6A96B] uppercase tracking-wider">ตารางกาลเวลาประจำวัน</h3>
             </div>
             <div className="divide-y divide-[#C6A96B]/5">
                {result.yamSchedule.map((yam) => (
                  <div 
                    key={yam.periodNum} 
                    className={`flex items-center p-4 gap-4 transition-colors ${yam.isCurrent ? 'bg-[#C6A96B]/10 border-l-2 border-[#C6A96B]' : 'hover:bg-white/5'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${yam.isCurrent ? 'bg-[#C6A96B] text-[#020617]' : 'bg-[#020617] text-[#94A3B8]'}`}>
                      {yam.periodNum}
                    </div>
                    <div className="flex-1">
                       <p className={`text-sm font-bold ${yam.isCurrent ? 'text-[#F8F6F1]' : 'text-[#94A3B8]'}`}>
                          {yam.startTime} - {yam.endTime}
                       </p>
                       <p className="text-[10px] text-[#94A3B8]">ดาว {yam.planetName} · ทิศ {yam.direction}</p>
                    </div>
                    {yam.isCurrent && (
                       <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C6A96B] animate-pulse" />
                          <span className="text-[10px] font-bold text-[#C6A96B]">ขณะนี้</span>
                       </div>
                    )}
                  </div>
                ))}
             </div>
          </Card>
        </div>

        {/* Right Column: Zodiac Chart & Houses */}
        <div className="lg:col-span-7 space-y-6">
           <Card className="p-6 border-[#C6A96B]/20 bg-[#020617]/60">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-sm font-bold text-[#F8F6F1] uppercase tracking-wider">ผังเรือนชะตากาลเวลา</h3>
                 <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-[#C6A96B]" />
                       <span className="text-[10px] text-[#94A3B8]">ยามปัจจุบัน</span>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                 {result.houseChart.map((house) => (
                   <div 
                    key={house.zodiacIndex}
                    className={`p-4 rounded-xl border transition-all ${
                      house.isCurrentYam 
                      ? 'bg-[#C6A96B]/10 border-[#C6A96B]/40 shadow-lg shadow-[#C6A96B]/5' 
                      : 'bg-white/5 border-white/5'
                    }`}
                   >
                     <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-[#94A3B8] uppercase">{house.zodiacName}</span>
                        <span className="text-xs font-bold text-[#C6A96B]">{house.houseName}</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <span className="text-2xl font-display font-bold text-[#F8F6F1]">{house.lordSymbol}</span>
                        <div className="min-w-0">
                           <p className="text-[10px] text-[#94A3B8] truncate">{house.lordName}</p>
                           <p className={`text-[8px] font-bold truncate`} style={{ color: house.lordStatusColor }}>
                              {house.lordStatusSymbol}
                           </p>
                        </div>
                     </div>
                   </div>
                 ))}
              </div>

              <div className="mt-8 pt-6 border-t border-white/5">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <h4 className="text-[10px] font-bold text-[#C6A96B] uppercase tracking-widest">ความหมายภพเด่น</h4>
                       <p className="text-xs text-[#F8F6F1] font-bold">ภพ{result.currentZodiacName} ({result.currentStatusLabel})</p>
                       <p className="text-xs text-[#94A3B8] leading-relaxed">
                          ภพนี้แสดงถึงสภาวะการณ์ที่กำลังเกิดขึ้น ดาวเจ้าการคือดาว {result.currentPlanetName} 
                          ซึ่งมีคุณภาพเป็น {result.currentStatusLabel} บ่งบอกถึงความมั่นคงและความสำเร็จในกาลชะตานี้
                       </p>
                    </div>
                    <div className="space-y-3 text-right">
                       <h4 className="text-[10px] font-bold text-[#C6A96B] uppercase tracking-widest">ข้อมูลทางดาราศาสตร์</h4>
                       <p className="text-xs text-[#F8F6F1] font-bold">{thaiDateLabel}</p>
                       <p className="text-xs text-[#94A3B8]">เวลาคำนวณ: {localTime.toLocaleTimeString('th-TH')}</p>
                    </div>
                 </div>
              </div>
           </Card>

           {/* Tips / Wisdom */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-4 border-white/5 bg-white/5">
                 <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                       <IconSparkle />
                    </div>
                    <h5 className="text-xs font-bold text-[#F8F6F1]">เคล็ดลับมงคล</h5>
                 </div>
                 <p className="text-xs text-[#94A3B8] leading-relaxed">
                    การกระทำการในยามที่เป็นเกษตรหรืออุจ จะช่วยให้กิจการนั้นมีความมั่นคงและยั่งยืน
                 </p>
              </Card>
              <Card className="p-4 border-white/5 bg-white/5">
                 <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                       <IconCompass />
                    </div>
                    <h5 className="text-xs font-bold text-[#F8F6F1]">ทิศให้ลาภ</h5>
                 </div>
                 <p className="text-xs text-[#94A3B8] leading-relaxed">
                    ในยามนี้ทิศ {result.currentDirection} เป็นทิศแห่งโชคลาภ เหมาะแก่การหันหน้าไปทางทิศนี้เพื่อรับพลังงานบวก
                 </p>
              </Card>
           </div>
        </div>
      </div>
    </div>
  );
}

// ─── Local Icons ────────────────────────────────────────────────────────────────

function IconHoraNuLarge() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="w-32 h-32 text-[#C6A96B]">
      <circle cx="12" cy="12" r="9" strokeDasharray="2 2" />
      <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    </svg>
  );
}

function IconCompass() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <circle cx="12" cy="12" r="9" />
      <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
    </svg>
  );
}
