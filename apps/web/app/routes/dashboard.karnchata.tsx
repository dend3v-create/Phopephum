import { json } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, useLoaderData, useSubmit } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile, requireMinPlan } from "~/services/auth.server";
import { calculateKarnchata } from "@phopephum/engine";
import { r7_local, calcTaksaMaha } from "@phopephum/engine";
import type { Env } from "~/env.server";
import { Card } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { useState, useEffect, useRef } from "react";

export const meta: MetaFunction = () => [
  { title: "ทำนายกาลชะตา V2.0 — PhopePhum" },
  { name: "description", content: "วิเคราะห์รหัสชะตาชีวิตระดับวินาทีด้วย 7 ตัว 9 ฐาน ผสมผสานระบบ Q&A แชทอัจฉริยะ" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { user, profile } = await requireMinPlan("basic", request, env);

  const now = new Date();
  const initialResult = calculateKarnchata(now);

  // คำนวณทักษาผู้ถาม
  let taksaMaha = null;
  if (profile?.birth_date) {
    try {
      const bDate = new Date(profile.birth_date);
      const natal = r7_local(
        bDate.getDate(),
        bDate.getMonth() + 1,
        bDate.getFullYear() + 543
      );
      const currentYearThai = now.getFullYear() + 543;
      const birthYearThai = bDate.getFullYear() + 543;
      taksaMaha = calcTaksaMaha(
        natal.nineBase.bases[0][0], // sum of day
        currentYearThai - birthYearThai + 1, // ageYang
        birthYearThai,
        currentYearThai
      );
    } catch (e) {
      // fallback
    }
  }

  const thaiDateLabel = now.toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return json({
    profile,
    initialResult,
    taksaMaha,
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
      targetDate = new Date(Date.UTC(tYearCE, tMonth - 1, tDay, th - 7, tmin, 0));
    }
  }

  const result = calculateKarnchata(targetDate);

  return json({
    result,
    timeMode,
  });
}

const CATEGORIES = [
  { id: "work", icon: "💼", label: "การงาน & เจรจา", questions: ["การเจรจาตกลงทางธุรกิจในยามนี้จะประสบความสำเร็จหรือไม่?", "สภาพแวดล้อมหรือโอกาสความก้าวหน้าในยามนี้มีลักษณะอย่างไร?", "อยากเริ่มต้นโครงการงานใหม่ในนาทีนี้ควรทำทันทีหรือควรรอ?"] },
  { id: "wealth", icon: "💎", label: "การเงิน & โชคลาภ", questions: ["จังหวะนี้เหมาะกับการเสี่ยงโชคหรือลงทุนหรือไม่?", "เงินที่รอคอยอยู่จะได้รับภายในระยะเวลาอันใกล้นี้ไหม?", "ควรระมัดระวังการใช้จ่ายหรือจะเสียทรัพย์ในยามนี้หรือไม่?"] },
  { id: "love", icon: "💖", label: "ความรัก & เมตตา", questions: ["คนที่นึกถึงตอนนี้เขามีความรู้สึกอย่างไรกับเรา?", "การปรับความเข้าใจหรือสารภาพรักในเวลานี้จะราบรื่นไหม?", "ผู้ใหญ่หรือผู้บังคับบัญชาจะเมตตาเอ็นดูเราหรือไม่ในจังหวะนี้?"] },
  { id: "health", icon: "💊", label: "สุขภาพ & เจ็บไข้", questions: ["อาการป่วยที่เป็นอยู่จะทุเลาลงหรือต้องระวังภาวะแทรกซ้อน?", "ควรไปพบแพทย์หรือเปลี่ยนวิธีการรักษาในเวลานี้หรือไม่?", "คนป่วยที่นึกถึงมีเกณฑ์ฟื้นตัวในทิศทางใด?"] },
  { id: "travel", icon: "🧭", label: "การเดินทาง & ทิศมงคล", questions: ["การเดินทางไปทิศ...ในยามนี้จะปลอดภัยและราบรื่นไหม?", "ควรหลีกเลี่ยงการเดินทางไปยังทิศใดเพื่อป้องกันอุปสรรค?", "จะพบโชคลาภหรือคนช่วยเหลือระหว่างการเดินทางหรือไม่?"] },
  { id: "obstacle", icon: "⚠️", label: "อุปสรรค & แก้เคล็ด", questions: ["ปัญหาที่กำลังเผชิญหน้าอยู่จะมีทางออกหรือมีคนช่วยไหม?", "มีสิ่งใดที่กำลังขัดขวางความสำเร็จและควรแก้เคล็ดอย่างไร?", "ของที่สูญหายจะได้คืนหรือไม่ หรือควรค้นหาในทิศใด?"] },
];

const TAKSA_DIRECTIONS = [
  { id: 3, name: "ตะวันออกเฉียงใต้", star: "อังคาร" },
  { id: 1, name: "ตะวันออกเฉียงเหนือ", star: "อาทิตย์" },
  { id: 2, name: "ตะวันออก", star: "จันทร์" },
  { id: 6, name: "ทิศเหนือ", star: "ศุกร์" },
  { id: 9, name: "ตรงกลาง", star: "เกตุ" },
  { id: 4, name: "ทิศใต้", star: "พุธ" },
  { id: 8, name: "ตะวันตกเฉียงเหนือ", star: "ราหู" },
  { id: 5, name: "ทิศตะวันตก", star: "พฤหัส" },
  { id: 7, name: "ตะวันตกเฉียงใต้", star: "เสาร์" },
];

export default function KarnchataPage() {
  const { profile, initialResult, taksaMaha, thaiDateLabel } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const activeResult = actionData?.result || initialResult;
  const [timeMode, setTimeMode] = useState<"live" | "custom">("live");
  const [selectedCategory, setSelectedCategory] = useState("work");
  const [time, setTime] = useState<Date>(new Date());
  const [selectedDirection, setSelectedDirection] = useState<number | null>(null);

  // Live Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      if (timeMode === "live") {
        const form = new FormData();
        form.append("timeMode", "live");
        submit(form, { method: "post", replace: true });
      }
    }, 60000); // refresh engine every 60s
    return () => clearInterval(timer);
  }, [timeMode, submit]);

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  };

  const getBhopName = (rowIdx: number, colIdx: number) => {
    const ROW_NAMES = [
      ["อัตตะ", "หินะ", "ธะนัง", "ปิตา", "มาตา", "โภคา", "มัชฌิมา"],
      ["ตนุ", "กดุมภะ", "สหัสชะ", "พันธุ", "ปุตตะ", "อริ", "ปัตนิ"],
      ["มรณะ", "ศุภะ", "กัมมะ", "ลาภะ", "พยายะ", "ทาสา", "ทาสี"]
    ];
    if (rowIdx < 3) return ROW_NAMES[rowIdx][colIdx];
    return "";
  };

  const BASE4_NAMES = ["มหาอุตจ์", "โสฬสมงคล", "พฤหัสบดีเล็ก", "อังคารใหญ่", "ราชาโชค", "จักรพรรดิ", "มหาสิทธิโชค"];

  // Chat
  const [chatMessages, setChatMessages] = useState([
    { sender: "ai", text: "สวัสดีครับคุณผู้ใช้งาน ยินดีต้อนรับสู่พื้นที่แห่งปัญญาญาณและการเติบโตภายใน ผมคือ Wisdom Guidance พร้อมชี้แนะแนวทางและวิเคราะห์จังหวะชีวิตด้วยศาสตร์กาลชะตาเรียลไทม์ ณ ขณะนี้แล้วครับ ท่านอยากจะตรวจสอบเรื่องใดเป็นพิเศษหรือไม่ครับ?", time: "" }
  ]);
  const [userInput, setUserInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    
    setChatMessages(prev => [...prev, { sender: "user", text: userInput, time: "" }]);
    
    setTimeout(() => {
      let aiResponse = `ในทางกาลชะตาขณะนี้ ยามใหญ่ตกที่ ${activeResult.yamYaiName} ส่วนยามซอยตกที่ ${activeResult.yamSoyName} `;
      if (selectedDirection) {
        const dir = TAKSA_DIRECTIONS.find(d => d.id === selectedDirection);
        aiResponse += `(คุณเลือกทิศ ${dir?.name}) `;
      }
      aiResponse += "จังหวะนี้มีพลังงานสอดคล้องกับเรื่องราวที่คุณถาม แนะนำให้ดำเนินการด้วยสติและรอบคอบครับ";
      
      setChatMessages(prev => [...prev, { sender: "ai", text: aiResponse, time: "" }]);
    }, 1500);
    setUserInput("");
  };

  const activeCategory = CATEGORIES.find(c => c.id === selectedCategory);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 animate-fade-up">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
        <div>
          <span className="text-[#C6A96B] text-[10px] tracking-[0.25em] uppercase font-bold flex items-center gap-2 mb-2">
            <span className="text-amber-500">✦</span> คัมภีร์พยากรณ์ลับเฉพาะกาล
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-[#F8F6F1] glow-gold flex flex-wrap items-baseline gap-2 md:gap-4">
            ทำนายกาลชะตา V2.0 <span className="text-[#C6A96B] text-xs md:text-sm font-normal tracking-[0.2em] uppercase whitespace-nowrap">(Real-time Time Oracle)</span>
          </h1>
          <p className="text-[#8A8070] text-xs md:text-sm mt-2">
            วิเคราะห์รหัสชะตาชีวิตระดับวินาทีด้วย 7 ตัว 9 ฐาน ผสมผสานระบบ Q&A แชทอัจฉริยะแบบเรียลไทม์
          </p>
        </div>
        <div className="text-left md:text-right border border-white/10 bg-[#0A1628] rounded-xl px-5 py-3 self-start md:self-center">
          <p className="text-[10px] text-[#8A8070] uppercase font-bold tracking-wider mb-1">วันกาลชะตาวันนี้</p>
          <p className="text-xs text-[#F8F6F1] font-bold">{thaiDateLabel}</p>
        </div>
      </header>

      {/* Control Bar (Time Mode) */}
      <div className="bg-[#0A1628] border border-white/5 rounded-2xl p-2 md:p-3 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex flex-col sm:flex-row bg-[#020617] rounded-xl p-1 border border-white/5 shrink-0">
           <button
             type="button"
             onClick={() => setTimeMode("live")}
             className={`px-4 md:px-6 py-2.5 text-xs font-bold rounded-lg transition-all ${timeMode === "live" ? "bg-[#C6A96B] text-[#020617] shadow-lg shadow-[#C6A96B]/20" : "text-[#8A8070] hover:text-[#F8F6F1]"}`}
           >
             ⏱ เวลาเรียลไทม์ (Real-time)
           </button>
           <button
             type="button"
             onClick={() => setTimeMode("custom")}
             className={`px-4 md:px-6 py-2.5 text-xs font-bold rounded-lg transition-all ${timeMode === "custom" ? "bg-[#C6A96B] text-[#020617] shadow-lg shadow-[#C6A96B]/20" : "text-[#8A8070] hover:text-[#F8F6F1]"}`}
           >
             📅 เลือกวัน/เวลาเอง (Custom Cast)
           </button>
        </div>
        
        {/* If Custom mode is selected, show inputs */}
        <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 transition-opacity duration-300 ${timeMode === "custom" ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
          <span className="text-xs text-[#8A8070] font-bold px-2">เลือกวันเวลาสืบค้น:</span>
          <div className="flex gap-2 w-full sm:w-auto">
            <input type="date" className="bg-[#020617] border border-white/10 text-[#F8F6F1] text-xs rounded-xl px-4 py-2.5 outline-none focus:border-[#C6A96B] w-full sm:w-auto" defaultValue={new Date().toISOString().split('T')[0]} />
            <input type="time" className="bg-[#020617] border border-white/10 text-[#F8F6F1] text-xs rounded-xl px-4 py-2.5 outline-none focus:border-[#C6A96B]" defaultValue="12:00" />
          </div>
        </div>
      </div>

      {/* Top Section: Clock & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* กาลเวลาปัจจุบันแบบเรียลไทม์ */}
        <Card className="border-[#C6A96B]/20 bg-gradient-to-b from-[#0A1628] to-[#040C18] p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#C6A96B]/5 rounded-full blur-[100px] -z-10" />
          
          <div className="flex justify-between items-center mb-6">
             <span className="text-xs font-bold text-[#8A8070] tracking-widest">กาลเวลาปัจจุบันแบบเรียลไทม์</span>
             <span className="bg-white/5 border border-white/10 text-[#8A8070] text-[10px] px-3 py-1 rounded-full">กลางวัน</span>
          </div>

          <div className="text-center my-6 space-y-6">
            <p className="text-[80px] md:text-[96px] font-display font-black text-[#F8F6F1] leading-none drop-shadow-2xl">
              {formatTime(time)}
            </p>
            <p className="text-xs text-[#8A8070] tracking-wider">
              กาลชะตาหมุนเวียนรอบละ 3.45 นาที · ตรวจจับกำลังดาวเปลี่ยนตามวินาทีจริง
            </p>
            
            <div className="flex items-center justify-center gap-4">
              <div className="bg-[#0A1628] border border-[#C6A96B]/20 rounded-xl px-6 py-3">
                <p className="text-[10px] text-[#8A8070] mb-1">ยามใหญ่ (ตนุ)</p>
                <p className="text-sm font-bold text-[#F8F6F1]">{activeResult.yamYaiName}</p>
              </div>
              <div className="bg-[#0A1628] border border-sky-500/20 rounded-xl px-6 py-3">
                <p className="text-[10px] text-sky-400 mb-1">ยามซอย (อัตตะ)</p>
                <p className="text-sm font-bold text-sky-300">{activeResult.yamSoyName}</p>
              </div>
            </div>
          </div>

          <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-5 relative overflow-hidden mt-6">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-rose-300 mb-1">ยามกาลชะตาในขณะนี้</p>
                <h3 className="font-display text-xl font-bold text-rose-400">ยาม{activeResult.yamYaiName.replace('ดาว','')} (อำนาจ/ผู้นำ)</h3>
                <p className="text-xs text-rose-200/70 mt-2 leading-relaxed max-w-md">
                  ช่วงเวลาแห่งอำนาจบารมี เหมาะสำหรับการเป็นผู้นำ ตัดสินใจเด็ดขาด เจรจากับผู้ใหญ่ หรือผู้มีอำนาจ ความแม่นยำสูง
                </p>
              </div>
              <span className="bg-[#020617] border border-rose-500/30 text-rose-300 text-[10px] px-3 py-1 rounded-full whitespace-nowrap">
                ยามที่ 1
              </span>
            </div>
          </div>
        </Card>

        {/* เลือกเรื่องที่ต้องการถามเจาะลึก */}
        <Card className="border-[#C6A96B]/20 bg-gradient-to-b from-[#0A1628] to-[#040C18] p-6 lg:p-8 flex flex-col">
          <h3 className="text-sm font-bold text-[#F8F6F1] mb-6 flex items-center gap-2">
            <span className="text-pink-400">🎯</span> เลือกเรื่องที่ต้องการถามเจาะลึก
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-3 transition-all ${
                  selectedCategory === cat.id 
                    ? "bg-[#0B1E36] border-sky-500/50 shadow-[0_0_15px_rgba(14,165,233,0.15)]" 
                    : "bg-[#020617] border-white/5 hover:border-white/10"
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className={`text-[11px] font-bold ${selectedCategory === cat.id ? "text-sky-400" : "text-[#8A8070]"}`}>
                  {cat.label}
                </span>
              </button>
            ))}
          </div>

          <div className="bg-[#0A1628] border border-white/5 rounded-2xl p-5 flex-1">
            <p className="text-xs font-bold text-[#C6A96B] mb-4 flex items-center gap-2">
              💡 คำถามแนะนำสำหรับหมวดนี้
            </p>
            <div className="space-y-3">
              {activeCategory?.questions.map((q, i) => (
                <div key={i} className="flex gap-3 bg-[#020617] border border-white/5 p-4 rounded-xl hover:border-white/10 transition-colors cursor-pointer" onClick={() => setUserInput(q)}>
                  <span className="text-[#C6A96B] text-lg leading-none mt-0.5">✦</span>
                  <p className="text-xs text-[#F8F6F1] opacity-90 leading-relaxed">{q}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Scores Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "การค้า/เจรจา", score: 80, color: "text-[#C6A96B]", bgLine: "bg-[#C6A96B]" },
          { label: "ความรัก/เมตตา", score: 60, color: "text-pink-400", bgLine: "bg-pink-400" },
          { label: "โชคลาภ/ทรัพย์สิน", score: 70, color: "text-emerald-400", bgLine: "bg-emerald-400" },
          { label: "ระดับการเตือนภัย", score: 40, color: "text-[#8A8070]", bgLine: "bg-[#8A8070]" },
        ].map(item => (
          <Card key={item.label} className="p-6 border-white/5 bg-[#0A1628] flex flex-col items-center justify-center gap-4 relative overflow-hidden">
            <span className="text-[11px] text-[#8A8070] font-bold tracking-wider">{item.label}</span>
            <span className={`text-4xl font-display font-black ${item.color}`}>{item.score}%</span>
            <div className={`w-12 h-1 rounded-full ${item.bgLine}`} />
          </Card>
        ))}
      </div>

      {/* ผังดวงกาลชะตา 9 ฐาน */}
      <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-8 overflow-x-auto relative">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-xl shrink-0">
            ☸️
          </div>
          <div>
            <h3 className="text-base font-bold text-[#F8F6F1]">ผังดวงกาลชะตา 9 ฐาน</h3>
            <p className="text-[10px] text-[#8A8070] mt-1">อัปเดตชะตาตามจุดเวลาที่เลือก - แตะตัวเลขเพื่อดูความเชื่อมโยง</p>
          </div>
        </div>

        <div className="min-w-[700px] flex flex-col gap-6 items-center">
          {/* Bases 1-3 */}
          {[0, 1, 2].map(rIdx => (
            <div key={rIdx} className="flex items-center w-full max-w-3xl">
              <div className="w-24 text-xs font-bold text-[#F8F6F1]">ฐาน {rIdx + 1}</div>
              <div className="flex-1 flex justify-between">
                {activeResult.chart[rIdx].map((star: number, cIdx: number) => (
                  <div key={cIdx} className="flex flex-col items-center gap-2 w-16">
                    <div className="w-12 h-12 rounded-full border-2 border-[#8A8070]/30 bg-[#020617] flex items-center justify-center text-xl font-display font-bold text-[#F8F6F1]">
                      {star}
                    </div>
                    <span className="text-[10px] text-[#8A8070] font-medium">{getBhopName(rIdx, cIdx)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Base 4 */}
          <div className="flex items-center w-full max-w-3xl bg-sky-950/20 border border-sky-500/20 p-4 rounded-2xl relative">
             <div className="w-20 text-xs font-bold text-sky-400">ฐาน ๔</div>
             <div className="flex-1 flex justify-between">
                {activeResult.chart[3].map((star: number, cIdx: number) => (
                  <div key={cIdx} className="flex flex-col items-center gap-2 w-16">
                    <div className="w-12 h-12 rounded-full border-2 border-[#C6A96B]/50 bg-[#C6A96B]/10 flex items-center justify-center text-xl font-display font-bold text-[#F8F6F1]">
                      {star}
                    </div>
                    <span className="text-[9px] text-[#C6A96B] font-bold text-center leading-tight">
                      {BASE4_NAMES[cIdx] || ""}
                    </span>
                  </div>
                ))}
             </div>
          </div>

          {/* Bases 5-9 */}
          {[4, 5, 6, 7, 8].map(rIdx => (
            <div key={rIdx} className="flex items-center w-full max-w-3xl">
              <div className="w-24 text-xs font-bold text-[#F8F6F1]">ฐาน {rIdx + 1}</div>
              <div className="flex-1 flex justify-between">
                {activeResult.chart[rIdx].map((star: number, cIdx: number) => (
                  <div key={cIdx} className="flex flex-col items-center gap-2 w-16">
                    <div className="w-10 h-10 rounded-full border border-white/10 bg-[#020617] flex items-center justify-center text-lg font-display font-bold text-[#F8F6F1]">
                      {star}
                    </div>
                    {rIdx === 7 && <span className="text-[9px] text-[#8A8070] font-medium">{"อาตมะ,ทาสา,สิทธิโชค,โภคทรัพย์,โจร,อุบาทว์".split(',')[cIdx]}</span>}
                    {rIdx === 8 && <span className="text-[9px] text-[#8A8070] font-medium">{"อัตตะ,สักกะ,ญาติ,ธนัง,เคหัง,นาวัง".split(',')[cIdx]}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Grid ทิศทักษาจร 8 ทิศ */}
      <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-8">
         <div className="flex items-start gap-4 mb-8 border-b border-white/5 pb-6">
            <div className="w-10 h-10 rounded-xl bg-[#C6A96B]/20 flex items-center justify-center text-xl shrink-0">
              🧭
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8F6F1]">ผังทิศทักษาจรแปดทิศ (8-DIRECTIONAL TAKSA GRID)</h3>
              <p className="text-[10px] text-[#8A8070] mt-1">แผนผังแปดทิศ แสดงความสัมพันธ์ของดาวและตำแหน่งทิศทางที่เป็นคุณ/เป็นภัยในนาทีนี้ แตะการ์ดทิศเพื่อเลือกดาว</p>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {TAKSA_DIRECTIONS.map((dir) => {
              const isActive = selectedDirection === dir.id;
              // Mocking properties for UI display as per screenshot
              const isKala = dir.id === 6 || dir.id === 4; // Mocking N, S having kala/sri
              return (
                <button
                  key={dir.id}
                  onClick={() => setSelectedDirection(isActive ? null : dir.id)}
                  className={`p-6 rounded-3xl border flex flex-col items-center text-center transition-all ${
                    isActive 
                      ? "bg-[#C6A96B]/10 border-[#C6A96B] shadow-[0_0_20px_rgba(198,169,107,0.15)]" 
                      : "bg-[#020617] border-white/5 hover:border-white/10"
                  }`}
                >
                  <p className="text-[10px] text-[#8A8070] font-bold mb-3">{dir.name}</p>
                  <p className="text-sm font-bold text-[#F8F6F1] mb-2">ดาว {dir.star}</p>
                  <p className="text-3xl font-display font-bold text-[#C6A96B] mb-6">({dir.id})</p>
                  
                  <div className="w-full space-y-2">
                    <div className={`px-4 py-1.5 rounded-lg border text-[10px] font-bold ${dir.id === 6 ? "bg-rose-950/30 border-rose-500/30 text-rose-400" : dir.id === 4 ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400" : "bg-[#0A1628] border-white/10 text-[#8A8070]"}`}>
                       กาล: {dir.id === 6 ? "กาลกิณี" : dir.id === 4 ? "ศรี" : "บริวาร"}
                    </div>
                    <div className={`px-4 py-1.5 rounded-lg border text-[10px] font-bold ${dir.id === 6 ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400" : dir.id === 4 ? "bg-rose-950/30 border-rose-500/30 text-rose-400" : "bg-[#0A1628] border-white/10 text-[#8A8070]"}`}>
                       กำเนิด: {dir.id === 6 ? "ศรี" : dir.id === 4 ? "กาลกิณี" : "มูละ"}
                    </div>
                  </div>
                </button>
              )
            })}
         </div>
      </Card>

      {/* ตารางทักษาคู่ & มหาภูติ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center text-lg">📊</div>
            <div>
              <h3 className="text-sm font-bold text-[#F8F6F1]">ตารางทักษาคู่ (กำเนิด / จร)</h3>
              <p className="text-[9px] text-[#8A8070]">สรุปสถานะดาวรายตัว เปรียบเทียบกำลังดาวจากดวงกำเนิดและสถานการณ์กาลชะตาจร</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
             {[1,2,3,6,4,8,5,7].map(num => (
               <div key={num} className="bg-[#020617] border border-white/5 rounded-2xl p-4 flex flex-col items-center relative">
                 {num === 1 && <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400" />}
                 {num === 6 && <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-rose-400" />}
                 <span className="text-2xl font-display font-bold text-[#C6A96B] mb-1">{num}</span>
                 <span className="text-[10px] font-bold text-[#F8F6F1] mb-3">ดาว{TAKSA_DIRECTIONS.find(d => d.id === num)?.star}</span>
                 <div className="w-full space-y-1">
                   <div className={`text-[9px] text-center py-1 rounded border ${num === 4 ? "bg-emerald-950/50 border-emerald-500/30 text-emerald-400" : num === 6 ? "bg-rose-950/50 border-rose-500/30 text-rose-400" : "bg-white/5 border-white/5 text-[#8A8070]"}`}>
                     {num === 4 ? "ศรีจร" : num === 6 ? "กาลกิณีจร" : "บริวารจร"}
                   </div>
                   <div className="text-[9px] text-center py-1 rounded border bg-white/5 border-white/5 text-[#8A8070]">
                     {num === 6 ? "ศรี (กำเนิด)" : "มูละ (กำเนิด)"}
                   </div>
                 </div>
               </div>
             ))}
          </div>
        </Card>

        <Card className="border-[#C6A96B]/20 bg-slate-900 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-lg">👤</div>
            <div>
              <h3 className="text-sm font-bold text-[#F8F6F1]">ทักษา & มหาภูติจรส่วนบุคคล (ดวงผู้ถาม)</h3>
              <p className="text-[9px] text-[#8A8070]">ดึงค่าจากวันเกิดในโปรไฟล์ของคุณ เพื่อใช้เปรียบเทียบหาจุดทับซ้อนและตรวจสอบความแม่นยำรายวัน</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-[#0A1628] rounded-xl p-4">
                <p className="text-xs font-bold text-[#C6A96B] mb-3 flex items-center gap-2">🎯 ทักษาจรประจำปีนี้</p>
                <div className="space-y-2">
                  {[1,2,3,4,5,6,7,8].map(num => (
                    <div key={num} className="flex justify-between items-center text-[10px]">
                      <span className="text-[#F8F6F1]">ดาว{TAKSA_DIRECTIONS.find(d => d.id === num)?.star} ({num})</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${num === 6 ? "bg-emerald-950 text-emerald-400" : num === 4 ? "bg-rose-950 text-rose-400" : "bg-white/10 text-[#8A8070]"}`}>
                        {num === 6 ? "ศรี" : num === 4 ? "กาลกิณี" : "บริวาร"}
                      </span>
                    </div>
                  ))}
                </div>
             </div>
             <div className="bg-[#0A1628] rounded-xl p-4">
                <p className="text-xs font-bold text-pink-400 mb-3 flex items-center gap-2">🧠 มหาภูติจร (สภาวะจิตใจ)</p>
                <div className="space-y-2">
                  {["โลกาวินาศ", "อริ", "ขุมทรัพย์", "มรณะ", "อธิบดี", "ราชา", "ธงชัย"].map((bhop, i) => (
                    <div key={bhop} className="flex justify-between items-center text-[10px]">
                      <span className="text-[#8A8070]">{bhop}</span>
                      <span className="text-[#F8F6F1]">ดาว{TAKSA_DIRECTIONS.find(d => d.id === (i+1))?.star} ({i+1})</span>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </Card>
      </div>

      {/* Chat Section */}
      <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-0 overflow-hidden relative shadow-2xl shadow-sky-900/10 max-w-4xl mx-auto">
        
        {/* Header แชท */}
        <div className="p-5 border-b border-white/5 flex items-center gap-4">
           <div className="w-3 h-3 rounded-full bg-[#C6A96B] shrink-0 shadow-[0_0_8px_rgba(198,169,107,0.6)]" />
           <div>
             <h3 className="text-base md:text-lg font-bold text-[#F8F6F1]">แชทถามตอบกับ WISDOM GUIDANCE</h3>
             <p className="text-[10px] text-[#8A8070]">หมวดการสนทนาปัจจุบัน: <span className="font-bold text-[#C6A96B]">{activeCategory?.label}</span></p>
           </div>
           <button onClick={() => setChatMessages([])} className="ml-auto px-4 py-1.5 text-[10px] md:text-xs border border-white/10 text-[#8A8070] hover:text-[#F8F6F1] hover:border-white/20 rounded-lg transition-colors">
             ล้างแชท
           </button>
        </div>

        {/* พื้นที่แชท */}
        <div className="h-[400px] overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-[#0A1628] to-[#040C18]">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
              
              {/* ชื่อคนส่ง AI */}
              {msg.sender === "ai" && (
                <span className="text-[10px] text-[#C6A96B] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="text-[#F8F6F1]">✦</span> WISDOM GUIDANCE
                </span>
              )}

              {/* กล่องข้อความ */}
              <div className={`max-w-[85%] md:max-w-[75%] p-5 rounded-2xl text-[13px] md:text-sm leading-loose md:leading-loose ${
                msg.sender === "user" 
                  ? "bg-[#C6A96B] text-[#020617] font-bold rounded-tr-none shadow-lg shadow-[#C6A96B]/10" 
                  : "bg-[#020617]/60 text-[#F8F6F1] border border-white/10 rounded-tl-none shadow-lg shadow-black/20"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* ช่องพิมพ์ข้อความ */}
        <div className="p-5 bg-[#020617] border-t border-white/5">
          <form onSubmit={handleSendChat} className="flex gap-3">
            <input 
              type="text" 
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              placeholder={`ถามคำถามกาลชะตาที่นี่... เช่น ${activeCategory?.questions[0].split('?')[0]}`}
              className="flex-1 bg-[#0A1628] border border-white/5 rounded-2xl px-6 py-3.5 text-sm text-[#F8F6F1] outline-none focus:border-[#C6A96B]/50 transition-colors placeholder:text-[#8A8070]/50"
            />
            <Button type="submit" disabled={!userInput.trim()} className="px-6 md:px-8 py-3.5 shrink-0 rounded-2xl bg-[#8A8070] text-[#020617] font-bold hover:bg-[#C6A96B] transition-colors shadow-lg">
              ส่งคำถาม
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
