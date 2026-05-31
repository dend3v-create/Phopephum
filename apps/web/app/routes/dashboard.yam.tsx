import { json } from "@remix-run/cloudflare";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { useEffect, useState } from "react";
import { requireAuth } from "~/services/auth.server";
import { getCurrentYam } from "@phopephum/engine";
import { calculateMoonPhase } from "@phopephum/engine";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "ยามสดขณะนี้ — PhopePhum" },
];

const PLANET_SYMBOLS: Record<string, string> = {
  สุริยะ: "☉", ระวิ:  "☉",
  จันเทา: "☽", คะศิ:  "☽",
  ภุมมะ:  "♂", ภุมโม: "♂",
  พุทธะ:  "☿", พุทโธ: "☿",
  ครู:    "♃", ชีโว:  "♃",
  ศุกระ:  "♀", ศุโกร: "♀",
  เสารี:  "♄", โสโร:  "♄",
};

const PHASE_LABEL: Record<string, string> = {
  start:  "ยามต้น",
  middle: "ยามกลาง",
  end:    "ยามปลาย",
};

const PERIOD_LABEL: Record<string, string> = {
  day:   "กลางวัน",
  night: "กลางคืน",
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAuth(request, env);

  const yam = getCurrentYam();
  const moon = calculateMoonPhase();

  // Serialize Dates → ISO strings for JSON transport
  return json({
    yamName:    yam.yamName,
    yamNumber:  yam.yamNumber,
    period:     yam.period,
    phase:      yam.phase,
    prediction: yam.prediction ?? null,
    sunriseISO: yam.sunTimes.sunrise.toISOString(),
    sunsetISO:  yam.sunTimes.sunset.toISOString(),
    moon: {
      moonPhase:    moon.moonPhase,
      lunarDay:     moon.lunarDay,
      illumination: moon.illumination,
      isWanPhra:    moon.isWanPhra,
      guidance:     moon.guidance,
    },
    loadedAt: new Date().toISOString(),
  });
}

export default function YamPage() {
  const data = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();
  const [now, setNow] = useState<Date>(new Date());

  // Tick every second — update clock
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  // Revalidate loader every 60 s (yam window shifts)
  useEffect(() => {
    const id = setInterval(revalidate, 60_000);
    return () => clearInterval(id);
  }, [revalidate]);

  const sunrise = new Date(data.sunriseISO);
  const sunset  = new Date(data.sunsetISO);
  const symbol  = PLANET_SYMBOLS[data.yamName] ?? "✦";

  // Compute yam window boundaries (rough: divide day/night into 8 equal parts)
  const dayMs     = sunset.getTime() - sunrise.getTime();
  const nightMs   = (86400000 - dayMs);
  const windowMs  = data.period === "day" ? dayMs / 8 : nightMs / 8;
  const startBase = data.period === "day" ? sunrise : sunset;
  const yamStart  = new Date(startBase.getTime() + (data.yamNumber - 1) * windowMs);
  const yamEnd    = new Date(yamStart.getTime() + windowMs);
  const remaining = Math.max(0, yamEnd.getTime() - now.getTime());
  const remMin    = Math.floor(remaining / 60000);
  const remSec    = Math.floor((remaining % 60000) / 1000);

  // ยามอัฏฐกาล นับวันใหม่ที่ 06:00 — ถ้าก่อน 06:00 ให้แสดงวันก่อนหน้า
  const yamDisplayDate = new Date(now);
  if (now.getHours() < 6) yamDisplayDate.setDate(yamDisplayDate.getDate() - 1);

  const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = yamDisplayDate.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6 max-w-2xl pb-10">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[#D9BC82] text-xs tracking-widest uppercase mb-1">ยามอัฏฐกาล</p>
          <h1 className="font-display text-3xl font-bold text-[#F8F6F1]">ยามสดขณะนี้</h1>
          <p className="text-[#94A3B8] text-sm mt-1">{dateStr}</p>
        </div>
        <div className="text-right">
          <p className="text-[#D9BC82] text-xs font-bold uppercase tracking-widest mb-1">ปัจจุบัน</p>
          <p className="font-display text-2xl font-bold text-[#F8F6F1] tabular-nums">{timeStr}</p>
        </div>
      </div>

      {/* Main Yam Card */}
      <Card glow>
        <div className="flex flex-col items-center text-center gap-4 py-4">
          {/* Planet symbol + name */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-7xl text-[#D9BC82] leading-none animate-float" style={{ fontFamily: "serif" }}>
              {symbol}
            </span>
            <h2 className="font-display text-4xl font-bold text-[#D9BC82] glow-gold">
              ยาม{data.yamName}
            </h2>
            <p className="text-[#94A3B8] text-sm">
              ยามใหญ่ที่ {data.yamNumber} · {PERIOD_LABEL[data.period]} · {PHASE_LABEL[data.phase]}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-md px-6 space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
              <span>กระแสพลังยาม</span>
              <span className="text-[#D9BC82]">เหลือ {remMin} นาที</span>
            </div>
            <div className="h-1.5 w-full bg-[#1E293B] rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(198,169,107,0.4)]"
                style={{ width: `${(1 - remaining / windowMs) * 100}%` }}
              />
            </div>
          </div>

          {/* Sun times */}
          <div className="flex gap-8 text-xs text-[#94A3B8]">
            <span>☀ ขึ้น {sunrise.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
            <span>☀ ตก {sunset.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
      </Card>

      {/* Energy & Advice Section */}
      {data.prediction && (
        <Card className="p-0 overflow-hidden bg-[#0A1628]/40 border-[#D9BC82]/10">
          <div className="p-4 bg-[#D9BC82]/5 border-b border-[#D9BC82]/10 flex items-center gap-2">
            <span className="text-[#D9BC82]">✨</span>
            <span className="text-xs font-bold text-[#D9BC82] uppercase tracking-widest">พลังงานมงคลและคำแนะนำ</span>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <span className="text-[10px] text-[#94A3B8] uppercase font-bold block mb-1">ด้านมงคลเด่น</span>
              <p className="text-base font-bold text-[#F8F6F1]">{data.prediction.auspicious}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-green-400/70 uppercase font-bold block">สิ่งที่ควรทำ</span>
                <p className="text-sm text-[#D9CDB7] leading-relaxed">{data.prediction.shouldDo}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-red-400/70 uppercase font-bold block">ไม่ควรทำ / ควรระวัง</span>
                <p className="text-sm text-[#D9CDB7] leading-relaxed">{data.prediction.shouldNotDo}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-white/5">
              <span className="text-[10px] text-blue-400/70 uppercase font-bold block mb-1">ถ้าจะทำ ทำแบบไหน</span>
              <p className="text-sm italic text-[#94A3B8] leading-relaxed">{data.prediction.howTo}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Results by Phase */}
      {data.prediction && (
        <div className="space-y-3">
          <p className="text-[#D9BC82] text-xs tracking-widest uppercase flex items-center gap-2">
            <span>🕒</span> ผลลัพธ์ตามช่วงยาม (ต้น/กลาง/ปลาย)
          </p>
          <div className="space-y-2">
            {[
              { label: "ยามต้น (0-30 นาทีแรก)", val: data.prediction.travel.start, phase: "start" },
              { label: "ยามกลาง (30-60 นาที)", val: data.prediction.travel.middle, phase: "middle" },
              { label: "ยามปลาย (60-90 นาที)", val: data.prediction.travel.end, phase: "end" },
            ].map((p, idx) => {
              const isActive = data.phase === p.phase;
              return (
                <div key={idx} className={`p-4 rounded-2xl border transition-all ${
                  isActive 
                    ? "bg-[#D9BC82]/10 border-[#D9BC82]/30 shadow-[0_0_15px_rgba(198,169,107,0.05)]" 
                    : "bg-white/5 border-transparent opacity-60"
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-[#D9BC82]" : "text-[#94A3B8]"}`}>
                      {p.label}
                    </span>
                    {isActive && <span className="text-[9px] bg-[#D9BC82] text-[#0A1628] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">ปัจจุบัน</span>}
                  </div>
                  <p className={`text-sm leading-relaxed ${isActive ? "text-[#F8F6F1] font-medium" : "text-[#94A3B8]"}`}>
                    {p.val}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Basic Predictions Grid */}
      {data.prediction && (
        <div>
          <p className="text-[#D9BC82] text-xs tracking-widest uppercase mb-3">คำพยากรณ์พื้นฐาน</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PredCard icon="📰" label="เรื่องที่ได้ยิน" text={data.prediction.news} />
            <PredCard icon="🔍" label="ของหาย"     text={data.prediction.lostItem} />
            <PredCard icon="💊" label="ผู้เจ็บป่วย" text={data.prediction.sickness} />
            <PredCard icon="🌟" label="เวลาที่ดี"    text={data.prediction.bestTime} />
          </div>
        </div>
      )}

      {/* Moon phase mini */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="text-4xl">
            {data.moon.isWanPhra ? "🌕" : data.moon.illumination > 50 ? "🌖" : "🌒"}
          </div>
          <div className="flex-1">
            <p className="text-[#D9BC82] font-medium">{data.moon.moonPhase}</p>
            <p className="text-[#94A3B8] text-sm mt-0.5">{data.moon.guidance}</p>
            {data.moon.isWanPhra && (
              <span className="inline-block mt-2 px-3 py-0.5 text-xs rounded-full text-[#D9BC82]"
                style={{ background: "rgba(198,169,107,0.15)", border: "1px solid rgba(198,169,107,0.3)" }}>
                วันพระ
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-display font-bold text-[#F8F6F1]">{data.moon.illumination}%</p>
            <p className="text-[#94A3B8] text-xs">ความสว่าง</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function PredCard({ icon, label, text }: { icon: string; label: string; text: string }) {
  return (
    <Card className="flex items-start gap-3 p-4 bg-white/5 border-transparent hover:border-[#D9BC82]/20 transition-colors">
      <span className="text-xl shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-[#D9BC82] text-[10px] font-bold uppercase mb-1 tracking-wider">{label}</p>
        <p className="text-[#D9CDB7] text-sm leading-relaxed">{text}</p>
      </div>
    </Card>
  );
}
