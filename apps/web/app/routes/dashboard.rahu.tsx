import { json } from "@remix-run/cloudflare";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { useEffect, useState, useRef } from "react";
import { requireMinPlan } from "~/services/auth.server";
import { canAccess } from "~/services/permissions.server";
import { 
  calculateRahu,
  RAHU_TIME_BLOCKS,
  RAHU_SUB_BLOCKS,
  RAHU_YAM_RULES,
  RAHU_YAM_MATRIX
} from "@phopephum/engine";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";
import { 
  Bell, 
  BellOff, 
  Clock, 
  Info, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Volume2, 
  VolumeX, 
  AlertTriangle, 
  Check, 
  CalendarDays,
  Target
} from "lucide-react";

export const meta: MetaFunction = () => [
  { title: "ยามราหูค้นทรัพย์และตารางฤกษ์มงคลรายวัน — PhopePhum" },
  { name: "description", content: "ถอดรหัสฤกษ์มงคลแบบเรียลไทม์ด้วย ยามราหูค้นทรัพย์ ตามตำราโหราศาสตร์โบราณระดับนาที ค้นหาทิศทางมงคลและเวลาเจรจาค้าขายให้สำเร็จระดับจักรพรรดิ" },
  
  // Open Graph / Facebook
  { property: "og:type", content: "website" },
  { property: "og:url", content: "https://phopephum.com/dashboard/rahu" },
  { property: "og:title", content: "ยามราหูค้นทรัพย์และตารางฤกษ์มงคลรายวัน — PhopePhum" },
  { property: "og:description", content: "คำนวณยามราหูค้นทรัพย์และฤกษ์มงคลแบบเรียลไทม์ระดับนาที เพื่อความสำเร็จในการค้าขายและเจรจาธุรกิจ" },
  { property: "og:image", content: "https://phopephum.com/favicon.svg" },

  // Twitter
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: "ยามราหูค้นทรัพย์และตารางฤกษ์มงคลรายวัน — PhopePhum" },
  { name: "twitter:description", content: "ถอดรหัสฤกษ์มงคลแบบเรียลไทม์ระดับนาที ตามคัมภีร์ยามราหูโบราณ" },

  // Keywords
  { name: "keywords", content: "ยามราหูค้นทรัพย์, ตารางยามราหู, ฤกษ์ราหูค้นทรัพย์, ฤกษ์เจรจาค้าขาย, ยามมงคลรายวัน, โหราศาสตร์ไทย, ภพภูมิ, PhopePhum" }
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { profile } = await requireMinPlan("basic", request, env);

  const now = new Date();
  const rahuResult = calculateRahu(now);

  return json({
    rahuResult,
    serverTime: now.toISOString(),
    isProLocked: !canAccess(profile, "pro"),
  });
}

// โทนสีประจำวันเกิด (Thai Day Colors)
const DAY_COLOR_THEMES: Record<number, { name: string; bg: string; text: string; border: string; glow: string }> = {
  1: { name: "วันอาทิตย์", bg: "bg-red-500/10 hover:bg-red-500/20", text: "text-red-400", border: "border-red-500/30", glow: "shadow-red-500/10" },
  2: { name: "วันจันทร์", bg: "bg-yellow-500/10 hover:bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30", glow: "shadow-yellow-500/10" },
  3: { name: "วันอังคาร", bg: "bg-pink-500/10 hover:bg-pink-500/20", text: "text-pink-400", border: "border-pink-500/30", glow: "shadow-pink-500/10" },
  4: { name: "วันพุธ", bg: "bg-emerald-500/10 hover:bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", glow: "shadow-emerald-500/10" },
  5: { name: "วันพฤหัสบดี", bg: "bg-orange-500/10 hover:bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30", glow: "shadow-orange-500/10" },
  6: { name: "วันศุกร์", bg: "bg-sky-500/10 hover:bg-sky-500/20", text: "text-sky-400", border: "border-sky-500/30", glow: "shadow-sky-500/10" },
  7: { name: "วันเสาร์", bg: "bg-violet-500/10 hover:bg-violet-500/20", text: "text-violet-400", border: "border-violet-500/30", glow: "shadow-violet-500/10" },
};

import { UpgradePaywall } from "~/components/ui/UpgradePaywall";

export default function RahuDashboard() {
  const { rahuResult, serverTime, isProLocked } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  const [currentTime, setCurrentTime] = useState(new Date(serverTime));
  // ใช้ rahuResult.day_of_week แทน getDay() เพื่อรองรับช่วง 00:00-05:59 (ยังเป็นยามวันก่อนหน้า)
  const [selectedDay, setSelectedDay] = useState<number>(rahuResult?.day_of_week ?? (new Date(serverTime).getDay() + 1));
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null);
  
  // การแจ้งเตือน & เสียง
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastAuspiciousState = useRef<boolean>(rahuResult?.is_current_moment_good ?? false);
  const currentSubBlockId = useRef<number>(rahuResult?.sub_block.id ?? 1);

  // สังเคราะห์เสียงระฆังทองคำ (Golden Premium Chime) ด้วย Web Audio API
  const playPremiumChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
      
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1320, ctx.currentTime); // E6
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      
      osc1.stop(ctx.currentTime + 1.5);
      osc2.stop(ctx.currentTime + 1.5);
    } catch (e) {
      console.error("Audio synthesis failed:", e);
    }
  };

  // ขออนุญาตแจ้งเตือน
  const toggleNotifications = async () => {
    if (!("Notification" in window)) {
      alert("เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนเดสก์ท็อป");
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationsEnabled(!notificationsEnabled);
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        // ทดสอบเสียงชามระฆังครั้งแรก
        playPremiumChime();
        new Notification("🔔 ระบบแจ้งเตือนฤกษ์มงคลยามราหู", {
          body: "คุณได้เปิดระบบแจ้งเตือนเข้าสู่ช่วงเวลาฤกษ์มงคลเรียบร้อยแล้ว",
          icon: "/favicon.ico"
        });
      }
    } else {
      alert("คุณได้ปิดกั้นสิทธิ์การแจ้งเตือนไว้ กรุณาเปิดสิทธิ์ในตั้งค่าเบราว์เซอร์เพื่อรับการแจ้งเตือนฤกษ์มงคล");
    }
  };

  // รันนาฬิกา & ระบบแจ้งเตือนฤกษ์สด
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // ทุกๆ ต้นนาทีใหม่ จะบังคับ Revalidate ดึงข้อมูลยามสดล่าสุดจาก Server
      if (now.getSeconds() === 0) {
        revalidator.revalidate();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [revalidator]);

  // คอยจับตาช่วงการเปลี่ยนยามย่อยและการแจ้งเตือนฤกษ์
  useEffect(() => {
    if (!rahuResult) return;

    // 1. ตรวจสอบการทรานซิชันเปลี่ยนเป็น ฤกษ์ดี (is_current_moment_good จาก false -> true)
    if (rahuResult.is_current_moment_good && !lastAuspiciousState.current) {
      if (notificationsEnabled) {
        new Notification("✨ เข้าสู่ช่วงเวลาฤกษ์มงคลยามราหู", {
          body: `ขณะนี้ยามมงคล: ยามย่อย ${rahuResult.summary.current_yam_name} (${rahuResult.yam_rule.good_phase_desc}) เหมาะสำหรับการมงคล ค้าขาย เจรจา`,
          icon: "/favicon.ico"
        });
      }
      if (soundEnabled) {
        playPremiumChime();
      }
    }

    // อัปเดต Reference สถานะล่าสุด
    lastAuspiciousState.current = rahuResult.is_current_moment_good;
    currentSubBlockId.current = rahuResult.sub_block.id;

  }, [rahuResult, notificationsEnabled, soundEnabled]);

  if (!rahuResult) return <div>ไม่พบข้อมูลยาม</div>;

  // ── คำนวณเวลาถอยหลังยามย่อย 10 นาทีแบบวินาทีสด ──
  const elapsedMinutes = rahuResult.minutes_elapsed;
  const subBlockEnd = rahuResult.sub_block.minute_end;
  const minutesLeft = subBlockEnd - elapsedMinutes;
  const currentSeconds = currentTime.getSeconds();
  
  // คำนวณวินาทีคงเหลือทั้งหมดของ 10 นาทียามย่อย
  const totalSecondsLeft = Math.max(0, minutesLeft * 60 - currentSeconds);
  const countdownMinutes = Math.floor(totalSecondsLeft / 60);
  const countdownSeconds = totalSecondsLeft % 60;

  // ── สร้างรายการ 16 บล็อกของวันสำคัญที่เลือกสำหรับตารางรายวัน ──
  const dailyTimelineBlocks = RAHU_TIME_BLOCKS.map(block => {
    const matrixRow = RAHU_YAM_MATRIX.find(
      m => m.day_of_week === selectedDay && m.time_block_id === block.id
    );
    const yamRule = (matrixRow 
      ? RAHU_YAM_RULES.find(r => r.yam_number === matrixRow.yam_number) 
      : null) ?? null;
    return {
      block,
      yamRule,
      yamNumber: matrixRow?.yam_number ?? 0
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-[#C6A96B] text-xs tracking-[0.25em] uppercase font-bold block mb-1">
            ✦ คัมภีร์ยามราหูโบราณ
          </span>
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-[#F8F6F1] glow-gold mb-3">
            ยามราหูค้นทรัพย์
          </h1>
          <p className="text-[#D9CDB7] font-light max-w-2xl text-base leading-loose">
            สุดยอดศาสตร์แห่งการหาจังหวะมงคลระดับนาทีเพื่อการเจรจา ค้าขาย ปิดยอดขาย และการสัญจร 
            วิเคราะห์ย่อยเวลาเป็น 16 ช่วงหลัก และ 9 ช่วงย่อยตามวิถีแห่งคัมภีร์ประมวลผลดวงดาว
          </p>
        </div>
        
        {/* เวลาปัจจุบันสด */}
        <div className="bg-[#C6A96B]/8 border border-[#C6A96B]/20 px-6 py-4 rounded-2xl backdrop-blur-md shadow-2xl flex gap-6 items-center">
          <div>
            <p className="text-xs text-[#C6A96B] uppercase tracking-[0.2em] mb-1 font-bold">เวลาประมวลผล</p>
            <p className="text-3xl font-display font-bold text-[#F8F6F1] tabular-nums leading-none">
              {currentTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>
          
          {/* แผงควบคุมระบบเตือนและเสียง */}
          <div className="flex items-center gap-2 border-l border-[#C6A96B]/15 pl-4">
            <button
              onClick={toggleNotifications}
              className={`p-2.5 rounded-xl border transition-all ${
                notificationsEnabled
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-slate-950/40 border-white/5 text-[#C6B79F] hover:text-[#F8F6F1]"
              }`}
              title={notificationsEnabled ? "ปิดการแจ้งเตือนฤกษ์มงคล" : "เปิดการแจ้งเตือนฤกษ์มงคล"}
            >
              {notificationsEnabled ? <Bell className="w-4 h-4 animate-bounce" /> : <BellOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border transition-all ${
                soundEnabled
                  ? "bg-[#C6A96B]/10 border-[#C6A96B]/25 text-[#C6A96B]"
                  : "bg-slate-950/40 border-white/5 text-[#C6B79F]"
              }`}
              title={soundEnabled ? "ปิดเสียงเตือน" : "เปิดเสียงเตือน"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── ส่วนหลัก: รายงานยามปัจจุบันพร้อมเรดาร์ตรวจจับฤกษ์มงคล ── */}
      <Card className="p-6 sm:p-8 border-[#C6A96B]/20 relative overflow-hidden bg-gradient-to-br from-[#020617] via-[#09152b] to-[#020617] shadow-2xl">
        {/* วอลเปเปอร์ลวดลายจักรวาลโกลว์ */}
        <div className="absolute top-0 right-0 p-8 opacity-[0.04] pointer-events-none">
           <IconRahuLarge />
        </div>
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-[#C6A96B]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* ด้านซ้าย: ยามที่วิเคราะห์ได้ปัจจุบัน */}
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C6A96B]/10 border border-[#C6A96B]/30 text-[#D9BC82] text-xs font-bold uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D9BC82] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D9BC82]"></span>
              </span>
              ยามขณะนี้: {rahuResult.main_block.period_type} รอบที่ {rahuResult.main_block.slot_number} (วัน{rahuResult.day_name})
            </div>

            <div>
              <p className="text-sm text-[#D9CDB7] tracking-widest uppercase mb-1.5">
                ยามย่อยตำแหน่ง (Sub-Block)
              </p>
              <h2 className="text-6xl font-display font-bold text-[#F8F6F1] mb-3 leading-tight drop-shadow-md">
                {rahuResult.summary.current_yam_name}
              </h2>
              <p className="text-2xl text-[#D9BC82] font-medium tracking-wide">
                {rahuResult.yam_rule.yam_name} · {rahuResult.summary.phase}
              </p>
            </div>

            {/* แถบตัดสินฤกษ์ */}
            <div className={`text-base font-semibold p-4 rounded-2xl border flex items-center gap-3 transition-colors ${
              rahuResult.is_current_moment_good 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                : rahuResult.sub_block.is_good
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            }`}>
              <span className="text-2xl">
                {rahuResult.is_current_moment_good ? "✨" : rahuResult.sub_block.is_good ? "🔶" : "⚠️"}
              </span>
              <div className="space-y-1.5">
                <p className="text-lg leading-relaxed">{rahuResult.summary.overall_verdict}</p>
                <p className="text-sm font-light text-current/90 leading-relaxed">
                  คำชี้แนะ: {rahuResult.summary.advice}
                </p>
              </div>
            </div>

            {/* รายละเอียดคำแนะนำและขอบเขตเวลา */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-3.5">
              <div className="flex gap-4">
                <Info className="w-5 h-5 text-[#D9BC82] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-[#D9CDB7] uppercase font-bold tracking-wider">ขอบเขตเวลาช่วงย่อยนี้</p>
                  <p className="text-sm text-[#F8F6F1] mt-1.5 leading-loose">
                    ยามย่อยมีเวลาช่วงละ 10 นาที โดยยามย่อยนี้จะสิ้นสุดเมื่อพ้นนาทีที่ {subBlockEnd} ของช่วงหลัก ({rahuResult.main_block.start_time} - {rahuResult.main_block.end_time})
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ด้านขวา: วงแหวนเรดาร์โกลว์ (Radar Target) พร้อมตัวนับถอยหลังสด */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            
            {/* โครงสร้างวงแหวนเรดาร์หมุน */}
            <div className="relative w-56 h-56 flex items-center justify-center">
              
              {/* แสงเอฟเฟกต์โกลว์หมุนด้านหลัง */}
              <div className={`absolute inset-0 rounded-full border border-dashed transition-all duration-1000 ${
                rahuResult.is_current_moment_good
                  ? "border-emerald-500/30 animate-[spin_30s_linear_infinite] shadow-[0_0_40px_rgba(16,185,129,0.15)]"
                  : "border-slate-800 animate-[spin_60s_linear_infinite]"
              }`} />
              
              <div className={`absolute inset-4 rounded-full border transition-all duration-1000 flex flex-col items-center justify-center p-6 text-center ${
                rahuResult.is_current_moment_good
                  ? "bg-emerald-950/20 border-emerald-500/40 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]"
                  : rahuResult.sub_block.is_good
                  ? "bg-amber-950/20 border-amber-500/40"
                  : "bg-slate-950/50 border-white/5"
              }`}>
                
                <Target className={`w-6 h-6 mb-2 transition-colors ${
                  rahuResult.is_current_moment_good ? "text-emerald-400 animate-pulse" : "text-[#C6B79F]"
                }`} />

                {/* ตัวเลขเวลาถอยหลังถ้วนนาทีสด */}
                <p className="text-3xl font-display font-extrabold text-[#F8F6F1] tabular-nums leading-none tracking-tight">
                  {String(countdownMinutes).padStart(2, "0")}:{String(countdownSeconds).padStart(2, "0")}
                </p>
                
                <p className="text-xs text-[#D9CDB7] mt-2 uppercase font-bold tracking-wider">
                  เวลาคงเหลือช่วงย่อย
                </p>
                <span className={`mt-2 px-2.5 py-0.5 rounded-full text-[12px] font-bold ${
                  rahuResult.is_current_moment_good 
                    ? "bg-emerald-500/20 text-emerald-400" 
                    : rahuResult.sub_block.is_good
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-rose-500/20 text-rose-400"
                }`}>
                  {rahuResult.summary.current_yam_name} ({rahuResult.sub_block.is_good ? "ฤกษ์ดี" : "อุปสรรค"})
                </span>
              </div>
            </div>

          </div>
        </div>
      </Card>

      {/* ── แผงกล่องข้อมูลทำนายหัวใจ 4 ด้าน ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
         <PredictionBox title="หัวใจความจริง" value={rahuResult.yam_rule.huajai_truth} icon="📢" />
         <PredictionBox title="ของหายได้คืน" value={rahuResult.yam_rule.huajai_lost_item} icon="🔑" />
         <PredictionBox title="ถามเรื่องสุขภาพ" value={rahuResult.yam_rule.huajai_health} icon="🩺" />
         <PredictionBox title="ผลตามไตรภูมิ" value={rahuResult.yam_rule.traibhum_result} icon="📜" />
      </div>

      {/* ── 📅 ตารางยามราหูรายวัน 16 บล็อก (Daily Schedule) ── */}
      <div className="space-y-6 pt-6 border-t border-[#C6A96B]/15">
        
        {/* หัวข้อตารางรายวัน */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-2xl font-bold text-[#F8F6F1] flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#C6A96B]" /> ตารางยามราหูประจำวัน
            </h3>
            <p className="text-xs text-[#C6B79F] italic">
              เลือกวันในสัปดาห์เพื่อถอดรหัสฤกษ์มงคลยามราหูทั้ง 16 ช่วงเวลา
            </p>
          </div>
          
          {/* แท็บปุ่มกดเลือก 7 วัน */}
          <div className="flex flex-wrap gap-1 bg-slate-950/40 p-1 rounded-xl border border-white/5">
            {[
              { id: 1, label: "อา.", name: "อาทิตย์" },
              { id: 2, label: "จ.", name: "จันทร์" },
              { id: 3, label: "อ.", name: "อังคาร" },
              { id: 4, label: "พ.", name: "พุธ" },
              { id: 5, label: "พฤ.", name: "พฤหัส" },
              { id: 6, label: "ศ.", name: "ศุกร์" },
              { id: 7, label: "ส.", name: "เสาร์" },
            ].map((day) => {
              const isActive = selectedDay === day.id;
              const isToday = rahuResult.day_of_week === day.id;
              
              // สีปุ่มตามวันไทย
              const baseTheme = DAY_COLOR_THEMES[day.id]!;
              
              return (
                <button
                  key={day.id}
                  onClick={() => {
                    setSelectedDay(day.id);
                    setExpandedBlock(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    isActive
                      ? `${baseTheme.bg} ${baseTheme.text} ${baseTheme.border} border shadow-lg`
                      : "text-[#C6B79F] hover:text-[#F8F6F1] hover:bg-white/5"
                  } relative`}
                >
                  {day.label}
                  {isToday && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#C6A96B]" title="วันนี้" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ตารางแสดงผล 16 ยามย่อย (Timeline grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* กลางวัน */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#C6A96B] uppercase tracking-widest pl-1">
              ☀️ ยามกลางวัน (06:00 - 18:00)
            </h4>
            <div className="space-y-3">
              {dailyTimelineBlocks.slice(0, 8).map((item, index) => {
                const isCurrentBlock = rahuResult.day_of_week === selectedDay && rahuResult.main_block.id === item.block.id;
                return (
                  <TimelineBlockCard
                    key={item.block.id}
                    item={item}
                    isCurrent={isCurrentBlock}
                    isExpanded={expandedBlock === item.block.id}
                    onToggle={() => setExpandedBlock(expandedBlock === item.block.id ? null : item.block.id)}
                  />
                );
              })}
            </div>
          </div>

          {/* กลางคืน */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#4B6FAE] uppercase tracking-widest pl-1">
              🌙 ยามกลางคืน (18:00 - 06:00)
            </h4>
            <div className="space-y-3">
              {dailyTimelineBlocks.slice(8, 16).map((item, index) => {
                const isCurrentBlock = rahuResult.day_of_week === selectedDay && rahuResult.main_block.id === item.block.id;
                return (
                  <TimelineBlockCard
                    key={item.block.id}
                    item={item}
                    isCurrent={isCurrentBlock}
                    isExpanded={expandedBlock === item.block.id}
                    onToggle={() => setExpandedBlock(expandedBlock === item.block.id ? null : item.block.id)}
                  />
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function PredictionBox({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <Card className="p-4 rounded-2xl bg-slate-950/40 border-white/5 hover:border-[#C6A96B]/25 transition-all duration-300">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">{icon}</span>
        <p className="text-[12px] text-[#C6B79F] uppercase tracking-[0.15em] font-bold">{title}</p>
      </div>
      <p className="text-[#F8F6F1] text-base font-semibold leading-snug">{value}</p>
    </Card>
  );
}

function TimelineBlockCard({
  item,
  isCurrent,
  isExpanded,
  onToggle,
}: {
  item: { block: typeof RAHU_TIME_BLOCKS[0]; yamRule: typeof RAHU_YAM_RULES[0] | null; yamNumber: number };
  isCurrent: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { block, yamRule, yamNumber } = item;
  if (!yamRule) return null;

  return (
    <div 
      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
        isCurrent
          ? "border-[#C6A96B] bg-[#C6A96B]/5 shadow-[0_0_15px_rgba(198,169,107,0.08)]"
          : "border-white/5 bg-slate-950/20 hover:border-white/10 hover:bg-slate-950/45"
      }`}
    >
      {/* ส่วนหัวยาม */}
      <div 
        onClick={onToggle}
        className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          {/* ขอบเขตเวลา */}
          <div className="space-y-0.5">
            <p className="text-xs font-mono font-bold text-[#F8F6F1]">{block.start_time} - {block.end_time}</p>
            <p className="text-[12px] text-[#C6B79F] uppercase">รอบที่ {block.slot_number}</p>
          </div>
          
          <div className="w-px h-7 bg-white/5" />
          
          {/* ชื่อยามหลัก */}
          <div>
            <p className="text-xs font-bold text-[#D9BC82] flex items-center gap-1.5">
              {yamRule.yam_name}
              {isCurrent && (
                <span className="bg-[#C6A96B]/15 text-[#C6A96B] px-1.5 py-0.5 rounded text-[11px] font-bold">ปัจจุบัน</span>
              )}
            </p>
            <p className="text-[13px] text-[#C6B79F] mt-0.5 leading-none">
              ผล: {yamRule.traibhum_result}
            </p>
          </div>
        </div>

        {/* ฝั่งขวา: สรุปฤกษ์ย่อ & Expander */}
        <div className="flex items-center gap-3">
          <span className="text-[13px] bg-slate-900 px-2.5 py-1 rounded-lg border border-white/5 text-[#C6B79F] font-mono leading-none">
            {yamRule.good_phase_desc.split(" (")[0]}
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-[#C6B79F]" /> : <ChevronDown className="w-4 h-4 text-[#C6B79F]" />}
        </div>
      </div>

      {/* ส่วนแผงขยาย เจาะลึกยามย่อย 9 คอร์สย่อย */}
      {isExpanded && (
        <div className="border-t border-white/5 bg-slate-950/40 p-4 space-y-4">
          {/* รายละเอียดคำทำนายยามหลัก */}
          <div className="grid grid-cols-3 gap-2.5 text-[13px] bg-white/2.5 p-3 rounded-xl border border-white/5">
            <div>
              <p className="text-[#C6B79F] mb-0.5">📢 คำสัตย์</p>
              <p className="text-[#F8F6F1] font-semibold">{yamRule.huajai_truth}</p>
            </div>
            <div>
              <p className="text-[#C6B79F] mb-0.5">🔑 ของหาย</p>
              <p className="text-[#F8F6F1] font-semibold">{yamRule.huajai_lost_item}</p>
            </div>
            <div>
              <p className="text-[#C6B79F] mb-0.5">🩺 สุขภาพ</p>
              <p className="text-[#F8F6F1] font-semibold">{yamRule.huajai_health}</p>
            </div>
          </div>

          {/* รายการยามย่อย 9 ช่วง */}
          <div className="space-y-1.5">
            <p className="text-[12px] uppercase tracking-wider text-[#C6B79F] font-bold">
              🔍 วิถียามย่อย 9 ช่วง (10 นาทีต่อช่วง)
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {RAHU_SUB_BLOCKS.map(sb => {
                // เช็คว่ายามย่อยนี้ เป็นช่วงมงคลของยามหลักนี้หรือไม่
                const isAuspicious = (() => {
                  const t = yamRule.traibhum_result;
                  const phase = sb.phase_indicator ?? (
                    sb.minute_start < 30 ? 'ยามต้น' :
                    sb.minute_start < 60 ? 'ยามกลาง' : 'ยามปลาย'
                  );
                  if (t === 'ดียามต้น')           return phase === 'ยามต้น' && sb.is_good;
                  if (t === 'ดียามกลาง')          return phase === 'ยามกลาง' && sb.is_good;
                  if (t === 'ดียามปลาย')          return phase === 'ยามปลาย' && sb.is_good;
                  if (t === 'ดียามกลาง+ยามปลาย') return (phase === 'ยามกลาง' || phase === 'ยามปลาย') && sb.is_good;
                  return false;
                })();

                return (
                  <div 
                    key={sb.id}
                    className={`p-2 rounded-xl text-[12px] flex flex-col justify-between border transition-all ${
                      isAuspicious
                        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 font-bold"
                        : sb.is_good
                        ? "bg-slate-900/60 border-white/5 text-[#F8F6F1]"
                        : "bg-rose-500/5 border-rose-500/15 text-rose-400"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono">{sb.minute_start}-{sb.minute_end} น.</span>
                      {isAuspicious && <Sparkles className="w-2.5 h-2.5 text-emerald-400" />}
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-[13px]">{sb.name}</span>
                      <span className="opacity-75">
                        {isAuspicious ? "มงคลสูงสุด" : sb.is_good ? "ปานกลาง" : "อุปสรรค"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IconRahuLarge() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={0.3} className="w-64 h-64 text-[#C6A96B]">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12c0-2.21.72-4.25 1.94-5.91" />
      <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
      <path d="M12 7v1M12 16v1M7 12h1M16 12h1" />
    </svg>
  );
}
