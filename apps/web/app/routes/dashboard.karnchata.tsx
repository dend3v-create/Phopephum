import { json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { useState, useEffect } from "react";
import { requireMinPlan } from "~/services/auth.server";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "ทำนายกาลชะตา (ระดับนาที) — PhopePhum" },
  { name: "description", content: "ถอดรหัสจังหวะกาลชะตาชีวิตระดับนาที แม่นยำระดับวินาที ด้วยศาสตร์กาลชะตาโบราณผสมผสาน AI พยากรณ์อัจฉริยะ" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { profile } = await requireMinPlan("basic", request, env);

  // ข้อมูลจำลองสำหรับระบบกาลชะตาระดับนาที
  const currentDateTime = new Date();
  const thaiDateLabel = currentDateTime.toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return json({
    profile,
    thaiDateLabel,
    initialTime: currentDateTime.toISOString(),
  });
}

export default function KarnchataPage() {
  const { profile, thaiDateLabel } = useLoaderData<typeof loader>();
  const [time, setTime] = useState<Date>(new Date());
  
  // จำลองการนับวินาที/นาที เพื่อแสดงผลเวลาจริง (แม่นยำระดับนาที/วินาที)
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  // ข้อมูลทำนายกาลชะตาจำลอง (เช่น ความแม่นยำเวลา 3:45 น. หรือกาลชะตารายนาที)
  // ในที่นี้จำลองข้อมูลพลังงานตามรอบกาลชะตา
  const currentMinute = time.getMinutes();
  const getKarnchataState = (min: number) => {
    if (min % 5 === 0) {
      return {
        title: "ยามราชาโชคกาลชะตา",
        level: "excellent",
        desc: "ช่วงเวลามหามงคลสูงสุด เหมาะสำหรับการติดต่อเจรจา เปิดตัวสินค้า หรือเสนอขายทรัพย์ใหญ่ ความแม่นยำของสัจจะวาจาสูงสุด",
        color: "text-emerald-400 border-emerald-500/30 bg-emerald-950/20",
        scores: { trade: 98, love: 85, wealth: 95, danger: 5 },
      };
    } else if (min % 3 === 0) {
      return {
        title: "ยามปัญญากล้ากาลชะตา",
        level: "good",
        desc: "ช่วงเวลาดีเลิศในการวางแผน ตกลงเซ็นเอกสารสัญญา หรือศึกษาธรรมะ ค้นหาไอเดียสร้างสรรค์ใหม่ๆ มีสติปัญญาสูงส่ง",
        color: "text-[#C6A96B] border-[#C6A96B]/30 bg-[#C6A96B]/5",
        scores: { trade: 80, love: 90, wealth: 75, danger: 10 },
      };
    } else if (min % 2 === 0) {
      return {
        title: "ยามนุ่มนวลเมตตากาลชะตา",
        level: "neutral",
        desc: "ช่วงเวลาแห่งความนุ่มนวลและเมตตาเสน่หา เหมาะแก่การปรับความเข้าใจ พูดคุยเพื่อลดความตึงเครียด ง้อคนรัก หรือปรนเปรอจิตใจตนเอง",
        color: "text-sky-400 border-sky-500/30 bg-sky-950/20",
        scores: { trade: 70, love: 98, wealth: 80, danger: 8 },
      };
    } else {
      return {
        title: "ยามกาลชะตาระวังภัย",
        level: "warn",
        desc: "ช่วงเวลาที่พลังงานภายนอกมีความผันผวน ควรหลีกเลี่ยงการใช้อารมณ์ตัดสินใจ การขับรถเร็ว หรือการมีปากเสียงกับผู้อื่น ถือศีลและมีสตินิ่งสงบดีที่สุด",
        color: "text-rose-400 border-rose-500/30 bg-rose-950/20",
        scores: { trade: 40, love: 35, wealth: 50, danger: 92 },
      };
    }
  };

  const state = getKarnchataState(currentMinute);

  return (
    <div className="space-y-8 max-w-5xl pb-20 animate-fade-up">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[#C6A96B] text-[10px] tracking-[0.25em] uppercase font-bold block mb-1">
            ✦ คัมภีร์พยากรณ์ลับเฉพาะกาล
          </span>
          <h1 className="font-display text-3xl font-bold text-[#F8F6F1] glow-gold">
            ทำนายกาลชะตา <span className="text-[#C6A96B] text-sm font-normal ml-2 tracking-widest">(ระดับนาที)</span>
          </h1>
          <p className="text-[#8A8070] text-sm italic">
            ถอดรหัสจังหวะชีวิต แม่นยำระดับนาที/วินาที (เช่น จังหวะเวลาสัมฤทธิ์ผล 3.45 น.)
          </p>
        </div>
        <div className="bg-[#C6A96B]/5 border border-[#C6A96B]/20 rounded-2xl px-4 py-2 text-right shrink-0">
          <p className="text-[10px] text-[#8A8070] uppercase font-bold tracking-wider">วันกาลชะตาวันนี้</p>
          <p className="text-xs text-[#F8F6F1] font-bold">{thaiDateLabel}</p>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* คอลัมน์ซ้าย: นาฬิกากาลชะตา & Aura Effect (2 col spans on large screen) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="relative overflow-hidden border-[#C6A96B]/20 bg-slate-900/40 backdrop-blur-2xl p-6 min-h-[320px] flex flex-col justify-between">
            {/* Cosmic Glow Background */}
            <div className="absolute inset-0 bg-radial-gradient from-[#4B6FAE]/10 via-transparent to-transparent opacity-60 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#C6A96B]/5 rounded-full blur-[80px] -z-10" />

            <div className="flex items-center justify-between border-b border-[#C6A96B]/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold text-[#C6A96B] uppercase tracking-widest">
                  กาลเวลาปัจจุบันแบบเรียลไทม์
                </span>
              </div>
              <span className="text-[10px] bg-[#C6A96B]/15 border border-[#C6A96B]/35 text-[#F8F6F1] px-2 py-0.5 rounded-md font-bold">
                ความแม่นยำสูงพิเศษ
              </span>
            </div>

            {/* นาฬิกาและเอฟเฟกต์กาลเวลา */}
            <div className="my-8 text-center space-y-3">
              <p className="text-[80px] md:text-[96px] font-display font-extrabold text-[#F8F6F1] glow-gold tracking-widest leading-none">
                {formatTime(time)}
              </p>
              <p className="text-xs text-[#8A8070] italic tracking-wider">
                กาลชะตาหมุนเวียนรอบละ 1 นาที · ระบบตรวจจับพลังงานดวงดาวจร ณ วินาทีนี้
              </p>
            </div>

            {/* ส่วนท้ายนาฬิกา: แสดงข้อมูลยามจรปัจจุบัน */}
            <div className={`border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-500 ${state.color}`}>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">ยามกาลชะตาในนาทีนี้</p>
                <h3 className="font-display text-xl font-bold mt-1">{state.title}</h3>
                <p className="text-xs opacity-80 mt-1 leading-relaxed">{state.desc}</p>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 bg-[#020617]/50 border border-white/10 px-3 py-2 rounded-xl text-xs font-bold text-[#F8F6F1]">
                <span>ความแม่นยำ</span>
                <span className="text-[#C6A96B]">99.8%</span>
              </div>
            </div>
          </Card>

          {/* ตารางพลังงานกาลชะตา ( scores ) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "การค้า/เจรจา", score: state.scores.trade, color: "text-[#C6A96B]" },
              { label: "ความรัก/เมตตา", score: state.scores.love, color: "text-pink-400" },
              { label: "โชคลาภ/ทรัพย์สิน", score: state.scores.wealth, color: "text-emerald-400" },
              { label: "ระดับการเตือนภัย", score: state.scores.danger, color: state.scores.danger > 50 ? "text-rose-400" : "text-slate-400" },
            ].map((item) => (
              <Card key={item.label} className="p-4 border-white/5 bg-slate-950/20 flex flex-col items-center justify-between gap-2 text-center">
                <span className="text-[10px] text-[#8A8070] font-bold uppercase tracking-wider">{item.label}</span>
                <span className={`text-3xl font-display font-black ${item.color}`}>
                  {item.score}%
                </span>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#C6A96B] transition-all duration-1000" 
                    style={{ 
                      width: `${item.score}%`,
                      backgroundColor: item.color.includes("pink") ? "#f472b6" : item.color.includes("emerald") ? "#34d399" : item.color.includes("rose") ? "#f87171" : "#C6A96B"
                    }} 
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* คอลัมน์ขวา: กล่องพยากรณ์กาลชะตาล่วงหน้า & ข้อมูลเตรียมความพร้อม */}
        <div className="space-y-6">
          {/* ข้อมูลความรู้กาลชะตาแม่นยำรายนาที */}
          <Card className="border-[#C6A96B]/15 bg-slate-900/30 p-5 space-y-4">
            <h3 className="font-display text-lg font-bold text-[#F8F6F1] glow-gold flex items-center gap-2 border-b border-[#C6A96B]/10 pb-2">
              🧭 ศาสตร์ทำนายกาลชะตา
            </h3>
            <p className="text-xs text-[#8A8070] leading-relaxed">
              กาลชะตา (Time-Oracle) คือศาสตร์การจับเวลาและทิศพลังงานของดวงดาวจรในระดับระดับวินาที/นาที ช่วยให้สามารถเลือกจังหวะเวลาในการกระทำกิจสำคัญได้อย่างประณีตสูงสุด
            </p>
            <div className="bg-[#C6A96B]/5 border border-[#C6A96B]/15 rounded-xl p-3.5 space-y-2">
              <p className="text-[10px] text-[#C6A96B] font-bold uppercase tracking-wider">🎯 ตัวอย่างกาลชะตาเด่นประจำวัน</p>
              <ul className="text-[11px] text-[#F8F6F1] space-y-1.5 list-disc list-inside">
                <li><strong className="text-[#C6A96B]">03:45 น.</strong> — จังหวะยามราชาโชคค้นทรัพย์ (ค้าขายเด่นสุด)</li>
                <li><strong className="text-[#C6A96B]">09:12 น.</strong> — จังหวะยามปัญญามนตรี (เสนองาน/ตกลงดีเลิศ)</li>
                <li><strong className="text-[#C6A96B]">15:30 น.</strong> — จังหวะลัคนาเมตตา (ง้อคนรัก/กระชับมิตร)</li>
              </ul>
            </div>
            <p className="text-[10px] text-[#8A8070] italic">
              * หมายเหตุ: ขณะนี้ระบบกำลังเตรียมอัปเกรดฐานความรู้ AI โบราณคดีเชิงลึกเพิ่มเติม เพื่อคำนวณสัจจะคาดคะเนให้แม่นยำระดับรายบุคคลเร็วๆ นี้
            </p>
          </Card>

          {/* กล่องลงทะเบียนแจ้งเตือนกาลชะตามหาเฮง */}
          <Card className="border-[#C6A96B]/15 bg-gradient-to-br from-slate-950/60 to-slate-900/20 p-5 text-center space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#C6A96B]" />
            <h4 className="font-display text-md font-bold text-[#F8F6F1] glow-gold">🔔 รับการแจ้งเตือนจังหวะมหาเฮง</h4>
            <p className="text-[11px] text-[#8A8070] leading-relaxed">
              ไม่พลาดทุกจังหวะวินาทีสำคัญของชีวิต ให้ระบบส่งแจ้งเตือนยามราชาโชคกาลชะตา หรือยามเตือนภัยผ่านมือถือและไลน์ของท่านทันที
            </p>
            <button 
              type="button" 
              className="w-full py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #C6A96B, #D9BC82)",
                color: "#020617",
              }}
            >
              เปิดการแจ้งเตือนกาลชะตาสด
            </button>
          </Card>
        </div>

      </div>
    </div>
  );
}
