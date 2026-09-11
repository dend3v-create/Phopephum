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
  Target,
  Send,
  Trash2,
  Bot,
  User
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

      {/* ── 💬 ห้องสนทนาและปรึกษาปัญญายามราหู (Auto-expanding chat with local history) ── */}
      <RahuConsultationChat rahuResult={rahuResult} />

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
// Sub-components: Rahu Consultation Chat & Prediction Boxes
// ─────────────────────────────────────────────────────────────────────────────

interface RahuChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  streaming?: boolean;
}

const RAHU_WELCOME_MESSAGE: RahuChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "สวัสดีครับ ✦ ยินดีต้อนรับสู่ห้องสนทนาปัญญายามราหูค้นทรัพย์\n\nผมพร้อมช่วยตอบคำถามและวิเคราะห์ช่วงเวลาทองในการเจรจา การเงิน การทวงถามผลประโยชน์ หรือจังหวะการลงมือทำตามคัมภีร์ยามราหูโบราณครับ ถามเรื่องที่ต้องการปรึกษาได้เลยครับ",
  timestamp: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
};

const RAHU_SUGGESTIONS = [
  "ช่วงเวลานี้เหมาะแก่การเจรจาการเงินหรือปิดการขายไหม?",
  "วันนี้มีช่วงเวลาทอง (Golden Window) ช่วงใดบ้าง?",
  "ทิศทางมงคลและข้อควรระวังสำคัญของยามนี้คืออะไร?",
  "หากจะทวงหนี้สินหรือทวงถามงาน ควรทำช่วงเวลาไหนดีที่สุด?",
];

function RahuConsultationChat({ rahuResult }: { rahuResult: any }) {
  const [messages, setMessages] = useState<RahuChatMessage[]>([RAHU_WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // โหลดประวัติการสนทนาจาก LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("phopephum_rahu_chat_history_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const saveHistory = (msgs: RahuChatMessage[]) => {
    try {
      const toSave = msgs.map((m) => ({ ...m, streaming: false }));
      localStorage.setItem("phopephum_rahu_chat_history_v1", JSON.stringify(toSave));
    } catch {
      // ignore
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("คุณต้องการล้างประวัติการสนทนานี้เพื่อเริ่มใหม่ใช่หรือไม่?")) {
      const reset = [RAHU_WELCOME_MESSAGE];
      setMessages(reset);
      try {
        localStorage.removeItem("phopephum_rahu_chat_history_v1");
      } catch {
        // ignore
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // ปรับความสูงช่องพิมพ์ตามข้อความที่พิมพ์อัตโนมัติ (Auto-grow Textarea)
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || isStreaming) return;

    const userMsgId = `u_${Date.now()}`;
    const assistantMsgId = `a_${Date.now()}`;
    const nowTime = new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

    const userMsg: RahuChatMessage = {
      id: userMsgId,
      role: "user",
      text: textToSend,
      timestamp: nowTime,
    };

    const initialAssistantMsg: RahuChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      text: "",
      timestamp: nowTime,
      streaming: true,
    };

    const updatedMessages = [...messages, userMsg, initialAssistantMsg];
    setMessages(updatedMessages);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsStreaming(true);

    try {
      const currentYamName = rahuResult?.summary?.current_yam_name || "ยามราหูค้นทรัพย์";
      const currentSubYam = rahuResult?.sub_block?.name || "";
      const currentStatus = rahuResult?.is_current_moment_good ? "ช่วงเวลามงคล" : "ช่วงเวลาพึงระวัง";

      const categoryInfo = `ยามราหูค้นทรัพย์ (${currentYamName} / ยามย่อย: ${currentSubYam} / สถานะ: ${currentStatus})`;

      const formData = new FormData();
      formData.append("question", textToSend);
      formData.append("category", categoryInfo);

      const response = await fetch("/api/wisdom-chat", {
        method: "POST",
        body: formData,
      });

      if (!response.ok || !response.body) {
        throw new Error("AI Service Unavailable");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const token = parsed?.choices?.[0]?.delta?.content ?? parsed?.content ?? "";
            if (token) {
              accumulated += token;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMsgId ? { ...m, text: accumulated } : m))
              );
            }
          } catch {
            // plain text fallback
          }
        }
      }

      const finalMessages = updatedMessages.map((m) =>
        m.id === assistantMsgId
          ? {
              ...m,
              text: accumulated || "ขอบคุณสำหรับคำถามครับ แนะนำให้พิจารณาจังหวะเวลาตามตารางยามราหูของวันนี้เพื่อความรอบคอบครับ",
              streaming: false,
            }
          : m
      );
      setMessages(finalMessages);
      saveHistory(finalMessages);
    } catch {
      const errorMessages = updatedMessages.map((m) =>
        m.id === assistantMsgId
          ? {
              ...m,
              text: "ขออภัยครับ ระบบประมวลผลคำแนะนำติดขัดชั่วคราว กรุณากดลองใหม่อีกครั้งครับ ✦",
              streaming: false,
            }
          : m
      );
      setMessages(errorMessages);
      saveHistory(errorMessages);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-amber-300/40 dark:border-[#C6A96B]/30 bg-white/95 dark:bg-[#071427]/85 backdrop-blur-xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 dark:border-white/10 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C6A96B] to-[#9E824C] p-0.5 shadow-md flex items-center justify-center shrink-0">
            <div className="w-full h-full rounded-[10px] bg-[#020617] flex items-center justify-center">
              <Bot className="w-5 h-5 text-[#C6A96B]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-[#F8F6F1]">
                สนทนาปัญญายามราหู
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-[#8C6D2D] dark:text-[#F6D88C] border border-amber-500/30">
                {rahuResult?.summary?.current_yam_name ?? "ยามราหู"}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-[#C6B79F]">
              ถาม-ตอบเจาะจงเวลาทอง การเจรจา ทรัพย์สิน และการตัดสินใจฉับพลัน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 1 && (
            <button
              type="button"
              onClick={handleClearHistory}
              title="ล้างประวัติการสนทนา"
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-white/10 hover:border-rose-400/50 text-slate-600 dark:text-[#C6B79F] hover:text-rose-500 text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ล้างประวัติ</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl border border-slate-300 dark:border-white/10 text-slate-600 dark:text-[#C6B79F] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            aria-label={isExpanded ? "ย่อหน้าต่าง" : "ขยายหน้าต่าง"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Messages list */}
          <div className="max-h-[380px] sm:max-h-[460px] overflow-y-auto space-y-3.5 pr-1 text-sm scroll-smooth">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-[#C6A96B]/15 border border-[#C6A96B]/30 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-[#C6A96B]" />
                  </div>
                )}
                <div
                  className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-3.5 sm:p-4 shadow-sm ${
                    m.role === "user"
                      ? "bg-gradient-to-br from-amber-500/15 via-[#C6A96B]/15 to-transparent dark:from-[#C6A96B]/25 dark:to-[#0A2240]/40 border border-amber-500/30 text-slate-900 dark:text-[#F8F6F1] rounded-tr-xs"
                      : "bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-[#D9CDB7] rounded-tl-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed break-words text-xs sm:text-sm">
                    {m.text}
                    {m.streaming && (
                      <span className="inline-block w-1.5 h-4 ml-1 bg-[#C6A96B] animate-pulse align-middle" />
                    )}
                  </p>
                  <div
                    className={`text-[10px] mt-1.5 flex items-center gap-1 ${
                      m.role === "user"
                        ? "justify-end text-[#8C6D2D] dark:text-[#C6A96B]"
                        : "text-slate-500 dark:text-[#94A3B8]"
                    }`}
                  >
                    <span>{m.timestamp}</span>
                  </div>
                </div>
                {m.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4 text-[#8C6D2D] dark:text-[#C6A96B]" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 pt-1 scrollbar-none">
            {RAHU_SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(s)}
                disabled={isStreaming}
                className="shrink-0 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100/80 dark:bg-white/5 hover:border-[#C6A96B]/50 hover:bg-amber-500/10 dark:hover:bg-[#C6A96B]/15 text-xs text-slate-700 dark:text-[#C6B79F] hover:text-slate-900 dark:hover:text-[#F8F6F1] transition-all shadow-xs cursor-pointer"
              >
                ✦ {s}
              </button>
            ))}
          </div>

          {/* Input container with auto-expanding textarea and prominent send button */}
          <div className="relative flex items-end gap-2 p-2 rounded-2xl border border-slate-300/80 dark:border-[#C6A96B]/30 bg-slate-50/90 dark:bg-slate-900/80 focus-within:border-[#C6A96B] focus-within:ring-2 focus-within:ring-[#C6A96B]/20 transition-all shadow-sm">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="พิมพ์คำถามเกี่ยวกับฤกษ์ยาม การเงิน หรือการตัดสินใจ..."
              className="flex-1 bg-transparent text-slate-900 dark:text-[#F8F6F1] placeholder-slate-400 dark:placeholder-white/40 text-xs sm:text-sm p-2 outline-none resize-none min-h-[44px] max-h-[180px] leading-relaxed"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isStreaming}
              className={`h-11 px-4 sm:px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shrink-0 transition-all shadow-md ${
                !input.trim() || isStreaming
                  ? "bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#C6A96B] via-[#D9BC82] to-[#C6A96B] text-[#020617] shadow-[#C6A96B]/25 hover:shadow-lg hover:scale-102 active:scale-98 cursor-pointer"
              }`}
              aria-label="ส่งคำถาม"
            >
              {isStreaming ? (
                <div className="w-4 h-4 border-2 border-[#020617] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="hidden sm:inline">ส่งคำถาม</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#C6B79F] text-center">
            บันทึกประวัติการสนทนาอัตโนมัติบนอุปกรณ์ของคุณ สามารถย้อนดูและทบทวนเรื่องราวได้ตลอดเวลา
          </p>
        </div>
      )}
    </Card>
  );
}

function PredictionBox({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <Card className="p-4 rounded-2xl bg-white/95 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 hover:border-amber-400/50 dark:hover:border-[#C6A96B]/25 transition-all duration-300 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">{icon}</span>
        <p className="text-[12px] text-slate-600 dark:text-[#C6B79F] uppercase tracking-[0.15em] font-bold">{title}</p>
      </div>
      <p className="text-slate-900 dark:text-[#F8F6F1] text-base font-semibold leading-snug">{value}</p>
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
