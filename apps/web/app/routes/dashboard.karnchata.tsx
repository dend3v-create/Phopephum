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

  const handleAutoSend = (q: string) => {
    setUserInput(q);
    setChatMessages(prev => [...prev, { sender: "user", text: q, time: "" }]);
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
          <h1 className="font-display text-3xl md:text-4xl font-bold text-[#F8F6F1] flex flex-wrap items-baseline gap-2 md:gap-4">
            ทำนายกาลชะตา V2.0 <span className="text-[#C6A96B] text-[10px] md:text-xs font-normal tracking-[0.2em] uppercase whitespace-nowrap">(REAL-TIME TIME ORACLE)</span>
          </h1>
          <p className="text-[#8A8070] text-xs md:text-sm mt-2">
            วิเคราะห์รหัสชะตาชีวิตระดับวินาทีด้วย 7 ตัว 9 ฐาน ผสมผสานระบบ Q&A แชทอัจฉริยะแบบเรียลไทม์
          </p>
        </div>
        <div className="text-center md:text-right border border-white/5 bg-[#0A1628]/50 rounded-3xl px-6 py-3 self-start md:self-center">
          <p className="text-[9px] text-[#8A8070] uppercase font-bold tracking-wider mb-0.5">วันกาลชะตาวันนี้</p>
          <p className="text-xs text-[#F8F6F1] font-bold">{thaiDateLabel}</p>
        </div>
      </header>

      {/* Control Bar (Time Mode) */}
      <div className="bg-[#0A1628]/80 border border-white/5 rounded-full p-1.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex bg-[#020617] rounded-full p-1 border border-white/5 shrink-0">
           <button
             type="button"
             onClick={() => setTimeMode("live")}
             className={`px-5 py-2 text-xs font-bold rounded-full transition-all flex items-center gap-2 ${timeMode === "live" ? "bg-[#1E1730] text-[#F8F6F1] shadow-lg" : "text-[#8A8070] hover:text-[#F8F6F1]"}`}
           >
             <span className="text-sm">⏱</span> เวลาเรียลไทม์ (Real-time)
           </button>
           <button
             type="button"
             onClick={() => setTimeMode("custom")}
             className={`px-5 py-2 text-xs font-bold rounded-full transition-all flex items-center gap-2 ${timeMode === "custom" ? "bg-[#C6A96B] text-[#020617] shadow-lg" : "text-[#8A8070] hover:text-[#F8F6F1]"}`}
           >
             <span className="text-sm">📅</span> เลือกวัน/เวลาเอง (Custom Cast)
           </button>
        </div>
        
        {/* If Custom mode is selected, show inputs */}
        <div className={`flex items-center gap-3 pr-4 transition-opacity duration-300 ${timeMode === "custom" ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
          <span className="text-[10px] text-[#8A8070] font-bold">เลือกวันเวลาสืบค้น:</span>
          <input type="date" className="bg-[#020617] border border-white/10 text-[#F8F6F1] text-xs rounded-full px-4 py-1.5 outline-none focus:border-[#C6A96B]" defaultValue={new Date().toISOString().split('T')[0]} />
          <input type="time" className="bg-[#020617] border border-white/10 text-[#F8F6F1] text-xs rounded-full px-4 py-1.5 outline-none focus:border-[#C6A96B]" defaultValue="12:00" />
        </div>
      </div>

      {/* Top Section: Clock & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* กาลเวลาปัจจุบันแบบเรียลไทม์ */}
        <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-8 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
             <span className="text-[11px] font-bold text-[#C6A96B] tracking-wide flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-[#C6A96B] shadow-[0_0_8px_rgba(198,169,107,0.8)]" />
               กาลเวลาที่กำหนด (เจาะจงฤกษ์)
             </span>
             <span className="bg-white/5 border border-white/10 text-[#F8F6F1] font-bold text-[10px] px-4 py-1.5 rounded-full">กลางวัน</span>
          </div>

          <div className="text-center my-8">
            <p className="text-[80px] md:text-[96px] font-display font-black text-[#F8F6F1] leading-none tracking-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-pulse-slow">
              {formatTime(time)}
            </p>
            <p className="text-[11px] text-[#8A8070] tracking-wide mt-4 italic">
              กาลชะตาหมุนเวียนรอบละ 3.45 นาที • ตรวจจับกำลังดาวเปลี่ยนตามวินาทีจริง
            </p>
            
            <div className="flex items-center justify-center gap-4 mt-6">
              <div className="bg-[#020617] border border-white/5 rounded-2xl px-6 py-3 min-w-[120px]">
                <p className="text-[9px] text-[#8A8070] mb-1">ยามใหญ่ (ตนุ)</p>
                <p className="text-sm font-bold text-[#F8F6F1]">{activeResult.yamYaiName}</p>
              </div>
              <div className="bg-[#0B1E36] border border-sky-500/20 rounded-2xl px-6 py-3 min-w-[120px]">
                <p className="text-[9px] text-sky-400 mb-1">ยามซอย (อัตตะ)</p>
                <p className="text-sm font-bold text-sky-300">{activeResult.yamSoyName}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#020617] border border-[#d97706]/40 rounded-2xl p-5 mt-auto relative shadow-[0_0_15px_rgba(217,119,6,0.1)]">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] text-[#d97706] font-bold">ยามกาลชะตาในขณะนี้</p>
              <span className="bg-[#0A1628] border border-white/5 text-[#F8F6F1] text-[10px] px-3 py-1 rounded-full font-bold">
                ยามที่ 1
              </span>
            </div>
            <h3 className="font-display text-lg font-bold text-[#d97706] mb-2">{activeResult.yamYaiName} (ครูบา/ปัญญา)</h3>
            <p className="text-xs text-[#d97706]/80 leading-relaxed max-w-md">
              ช่วงเวลาแห่งสติปัญญาและคุณธรรม เหมาะแก่การศึกษาธรรมะ เริ่มต้นเรียนรู้สิ่งใหม่ ผู้ใหญ่ให้ความเมตตาเอ็นดู
            </p>
          </div>
        </Card>

        {/* เลือกเรื่องที่ต้องการถามเจาะลึก */}
        <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-6 lg:p-8 flex flex-col">
          <h3 className="text-[11px] font-bold text-[#F8F6F1] mb-6 flex items-center gap-2">
            <span className="text-pink-400 text-lg">🎯</span> เลือกเรื่องที่ต้องการถามเจาะลึก
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                  selectedCategory === cat.id 
                    ? "bg-[#0B1E36] border-sky-500/50 shadow-[0_0_15px_rgba(14,165,233,0.15)]" 
                    : "bg-[#020617] border-white/5 hover:border-white/10"
                }`}
              >
                <span className="text-2xl mb-1">{cat.icon}</span>
                <span className={`text-[10px] font-bold ${selectedCategory === cat.id ? "text-sky-400" : "text-[#F8F6F1]"}`}>
                  {cat.label}
                </span>
              </button>
            ))}
          </div>

          <div className="bg-[#020617] border border-white/5 rounded-2xl p-5 flex-1">
            <p className="text-[10px] font-bold text-[#C6A96B] mb-4 flex items-center gap-2">
              💡 คำถามแนะนำสำหรับหมวดนี้
            </p>
            <div className="space-y-3">
              {activeCategory?.questions.map((q, i) => (
                <div key={i} className="flex gap-3 bg-transparent p-0 cursor-pointer group" onClick={() => handleAutoSend(q)}>
                  <span className="text-[#C6A96B] text-sm leading-none mt-0.5 opacity-70 group-hover:opacity-100">✦</span>
                  <p className="text-[11px] text-[#F8F6F1] opacity-70 group-hover:opacity-100 leading-relaxed transition-opacity">{q}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="my-2" />

          {/* Chat Section Integrated */}
          <div className="flex-1 flex flex-col bg-[#020617] border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative min-h-[350px]">
            <div className="p-5 flex items-center gap-4 bg-[#0A1628]/30 border-b border-white/5">
               <div className="w-3 h-3 rounded-full bg-[#C6A96B] shrink-0 shadow-[0_0_8px_rgba(198,169,107,0.6)] animate-pulse" />
               <div>
                 <h3 className="text-xs font-bold text-[#F8F6F1] tracking-wider">แชทถามตอบกับ WISDOM GUIDANCE</h3>
                 <p className="text-[9px] text-[#8A8070] mt-0.5">หมวดการสนทนาปัจจุบัน: <span className="font-bold text-[#C6A96B]">{activeCategory?.label}</span></p>
               </div>
               <button onClick={() => setChatMessages([])} className="ml-auto px-4 py-1.5 text-[10px] border border-white/10 text-[#8A8070] hover:text-[#F8F6F1] hover:border-white/20 rounded-lg transition-colors">
                 ล้างแชท
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-transparent h-[280px]">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                  {msg.sender === "ai" && (
                    <span className="text-[10px] text-[#C6A96B] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="text-[#F8F6F1]">✦</span> WISDOM GUIDANCE
                    </span>
                  )}
                  <div className={`max-w-[85%] md:max-w-[80%] p-4 rounded-2xl text-[12px] leading-relaxed ${
                    msg.sender === "user" 
                      ? "bg-[#0A1628] text-[#F8F6F1] border border-white/10 font-bold rounded-tr-none shadow-lg" 
                      : "bg-[#020617]/60 text-[#F8F6F1] border border-white/10 rounded-tl-none shadow-lg shadow-black/20"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-[#020617] border-t border-white/5">
              <form onSubmit={handleSendChat} className="flex gap-2">
                <input 
                  type="text" 
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  placeholder="กำลังประมวลผลดวงดาว..."
                  className="flex-1 bg-[#0A1628] border border-white/5 rounded-xl px-5 py-3 text-xs text-[#F8F6F1] outline-none focus:border-[#C6A96B]/50 transition-colors placeholder:text-[#8A8070]/50"
                />
                <Button type="submit" disabled={!userInput.trim()} className="px-6 py-3 shrink-0 rounded-xl bg-[#8A8070] text-[#020617] font-bold hover:bg-[#C6A96B] transition-colors shadow-lg text-[11px]">
                  ส่งคำถาม
                </Button>
              </form>
            </div>
          </div>
        </Card>
      </div>

      {/* Scores Section Moved Down */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "การค้า/เจรจา", score: 70, color: "text-[#C6A96B]", bgLine: "bg-[#C6A96B]" },
          { label: "ความรัก/เมตตา", score: 98, color: "text-pink-400", bgLine: "bg-pink-400" },
          { label: "โชคลาภ/ทรัพย์สิน", score: 80, color: "text-emerald-400", bgLine: "bg-emerald-400" },
          { label: "ระดับการเตือนภัย", score: 8, color: "text-[#8A8070]", bgLine: "bg-[#8A8070]" },
        ].map(item => (
          <div key={item.label} className="p-5 border border-white/5 bg-[#0A1628] rounded-2xl flex flex-col items-center justify-center gap-3">
            <span className="text-[10px] text-[#8A8070] font-bold">{item.label}</span>
            <span className={`text-3xl font-display font-bold ${item.color}`}>{item.score}%</span>
            <div className={`w-12 h-1 rounded-full ${item.bgLine}`} />
          </div>
        ))}
      </div>

      {/* ผังดวงกาลชะตา 9 ฐาน */}
      <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-8 overflow-x-auto relative">
        <div className="flex items-start gap-4 mb-10">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-lg shrink-0">
            ☸️
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F8F6F1]">ผังดวงกาลชะตา 9 ฐาน</h3>
            <p className="text-[10px] text-[#8A8070] mt-1">อัปเดตชะตาตามจุดเวลาที่เลือก - แตะตัวเลขเพื่อดูความเชื่อมโยง</p>
          </div>
        </div>

        <div className="min-w-[700px] flex flex-col gap-6 items-center pb-4">
          {/* Bases 1-3 */}
          {[0, 1, 2].map(rIdx => (
            <div key={rIdx} className="flex items-center w-full max-w-3xl">
              <div className="w-20 text-[11px] font-bold text-[#F8F6F1]">ฐาน {rIdx + 1 === 1 ? '๑' : rIdx + 1 === 2 ? '๒' : '๓'}</div>
              <div className="flex-1 flex justify-between">
                {activeResult.chart[rIdx].map((star: number, cIdx: number) => (
                  <div key={cIdx} className="flex flex-col items-center gap-2 w-14">
                    <div className="w-10 h-10 rounded-full border border-[#8A8070]/50 bg-[#020617] flex items-center justify-center text-lg font-display font-bold text-[#F8F6F1]">
                      {star}
                    </div>
                    <span className="text-[9px] text-[#8A8070] font-medium">{getBhopName(rIdx, cIdx)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Base 4 */}
          <div className="flex items-center w-full max-w-3xl bg-[#0B1E36]/30 border border-sky-500/10 py-3 px-2 rounded-2xl my-2">
             <div className="w-[72px] text-[11px] font-bold text-sky-400 pl-2">ฐาน ๔</div>
             <div className="flex-1 flex justify-between pr-2">
                {activeResult.chart[3].map((star: number, cIdx: number) => (
                  <div key={cIdx} className="flex flex-col items-center gap-2 w-14">
                    <div className="w-10 h-10 rounded-full border border-sky-500/50 bg-[#020617] flex items-center justify-center text-lg font-display font-bold text-[#F8F6F1]">
                      {star}
                    </div>
                    <span className="text-[9px] text-[#8A8070] font-medium text-center">
                      {BASE4_NAMES[cIdx] || ""}
                    </span>
                  </div>
                ))}
             </div>
          </div>

          {/* Bases 5-9 */}
          {[4, 5, 6, 7, 8].map(rIdx => (
            <div key={rIdx} className="flex items-center w-full max-w-3xl">
              <div className="w-20 text-[11px] font-bold text-[#F8F6F1]">ฐาน {rIdx + 1 === 5 ? '๕' : rIdx + 1 === 6 ? '๖' : rIdx + 1 === 7 ? '๗' : rIdx + 1 === 8 ? '๘' : '๙'}</div>
              <div className="flex-1 flex justify-between">
                {activeResult.chart[rIdx].map((star: number, cIdx: number) => (
                  <div key={cIdx} className="flex flex-col items-center gap-2 w-14">
                    <div className="w-10 h-10 rounded-full border border-[#8A8070]/50 bg-[#020617] flex items-center justify-center text-lg font-display font-bold text-[#F8F6F1]">
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
            <div className="w-8 h-8 rounded-lg bg-[#C6A96B]/20 flex items-center justify-center text-lg shrink-0">
              🧭
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F8F6F1]">ผังทิศทักษาจรแปดทิศ (8-DIRECTIONAL TAKSA GRID)</h3>
              <p className="text-[10px] text-[#8A8070] mt-1">แผนผังแปดทิศ แสดงความสัมพันธ์ของดาวและตำแหน่งทิศทางที่เป็นคุณ/เป็นภัยในนาทีนี้ แตะการ์ดทิศเพื่อเลือกดาว</p>
            </div>
            <div className="hidden md:block ml-auto border border-white/10 rounded-full px-4 py-1 text-[9px] font-bold text-[#8A8070] uppercase tracking-wider">
              Karnchata Engine V2.0
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {TAKSA_DIRECTIONS.map((dir) => {
              const isActive = selectedDirection === dir.id;
              
              let kalaLabel = "";
              let kalaBg = "";
              let birthLabel = "";
              let birthBg = "bg-[#0A1628] border-white/5 text-[#8A8070]";
              let isCenter = dir.id === 9;

              if (dir.id === 3) { kalaLabel = "อายุ"; kalaBg = "bg-[#0A1628] border-white/5 text-[#F8F6F1]"; birthLabel = "มนตรี"; }
              else if (dir.id === 1) { kalaLabel = "กาลกิณี"; kalaBg = "bg-rose-950/20 border-rose-500/20 text-rose-400"; birthLabel = "มูละ"; }
              else if (dir.id === 2) { kalaLabel = "บริวาร"; kalaBg = "bg-[#0A1628] border-white/5 text-[#F8F6F1]"; birthLabel = "อุตสาหะ"; }
              else if (dir.id === 6) { kalaLabel = "มนตรี"; kalaBg = "bg-[#0A1628] border-white/5 text-[#F8F6F1]"; birthLabel = "ศรี"; birthBg = "bg-emerald-950/20 border-emerald-500/20 text-emerald-400"; }
              else if (dir.id === 4) { kalaLabel = "เดช"; kalaBg = "bg-[#0A1628] border-white/5 text-[#F8F6F1]"; birthLabel = "กาลกิณี"; birthBg = "bg-rose-950/20 border-rose-500/20 text-rose-400"; }
              else if (dir.id === 8) { kalaLabel = "อุตสาหะ"; kalaBg = "bg-[#0A1628] border-white/5 text-[#F8F6F1]"; birthLabel = "เดช"; }
              else if (dir.id === 5) { kalaLabel = "มูละ"; kalaBg = "bg-[#0A1628] border-white/5 text-[#F8F6F1]"; birthLabel = "อายุ"; }
              else if (dir.id === 7) { kalaLabel = "ศรี"; kalaBg = "bg-emerald-950/20 border-emerald-500/20 text-emerald-400"; birthLabel = "บริวาร"; }

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
                  <p className="text-3xl font-display font-bold text-[#C6A96B] mb-6">({dir.id === 9 ? '๙' : dir.id})</p>
                  
                  <div className="w-full space-y-2 mt-auto">
                    {isCenter ? (
                      <div className="px-4 py-1.5 rounded-lg border bg-transparent border-[#C6A96B]/30 text-[#C6A96B] text-[10px] font-bold w-full">
                        วิญญาณธาตุ
                      </div>
                    ) : (
                      <>
                        <div className={`px-4 py-1.5 rounded-lg border text-[10px] font-bold w-full ${kalaBg}`}>
                           กาล: {kalaLabel}
                        </div>
                        <div className={`px-4 py-1.5 rounded-lg border text-[10px] font-bold w-full ${birthBg}`}>
                           กำเนิด: {birthLabel}
                        </div>
                      </>
                    )}
                  </div>
                </button>
              )
            })}
         </div>
      </Card>

      {/* ทักษา & มหาภูติจรส่วนบุคคล */}
      <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-8 max-w-4xl mx-auto">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-lg shrink-0">👤</div>
          <div>
            <h3 className="text-sm font-bold text-[#F8F6F1]">ทักษา & มหาภูติจรส่วนบุคคล (ดวงผู้ถาม)</h3>
            <p className="text-[10px] text-[#8A8070] mt-1">ดึงค่าจากวันเกิดในโปรไฟล์ของคุณ เพื่อใช้เปรียบเทียบหาจุดทับซ้อนและตรวจสอบความแม่นยำรายวัน</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* ทักษาจร */}
           <div className="bg-[#020617] rounded-2xl p-6 border border-white/5">
              <p className="text-xs font-bold text-[#F8F6F1] mb-6 flex items-center gap-2">
                <span className="text-pink-400 text-base">🎯</span> ทักษาจรประจำปีนี้
              </p>
              <div className="space-y-4">
                {[
                  { n: 1, name: "ดาว อาทิตย์ (1)", b: "มูละ", bg: "bg-amber-600/20 text-amber-500" },
                  { n: 2, name: "ดาว จันทร์ (2)", b: "อุตสาหะ", bg: "bg-teal-500/20 text-teal-400" },
                  { n: 3, name: "ดาว อังคาร (3)", b: "มนตรี", bg: "bg-blue-500/20 text-blue-400" },
                  { n: 4, name: "ดาว พุธ (4)", b: "กาลกิณี", bg: "bg-rose-950/40 text-rose-400" },
                  { n: 5, name: "ดาว พฤหัส (5)", b: "อายุ", bg: "bg-[#8A8070]/20 text-[#8A8070]" },
                  { n: 6, name: "ดาว ศุกร์ (6)", b: "ศรี", bg: "bg-emerald-950/40 text-emerald-400" },
                  { n: 7, name: "ดาว เสาร์ (7)", b: "บริวาร", bg: "bg-indigo-500/20 text-indigo-400" },
                  { n: 8, name: "ดาว ราหู (8)", b: "เดช", bg: "bg-orange-500/20 text-orange-400" }
                ].map(item => (
                  <div key={item.n} className="flex justify-between items-center text-[11px]">
                    <span className="text-[#F8F6F1] font-medium">{item.name}</span>
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wide ${item.bg}`}>
                      {item.b}
                    </span>
                  </div>
                ))}
              </div>
           </div>

           {/* มหาภูติจร */}
           <div className="bg-[#020617] rounded-2xl p-6 border border-white/5">
              <p className="text-xs font-bold text-[#F8F6F1] mb-6 flex items-center gap-2">
                <span className="text-pink-400 text-base">🧠</span> มหาภูติจร (สภาวะจิตใจ)
              </p>
              <div className="space-y-4">
                {[
                  { name: "โลกาวินาศ", star: "ดาว จันทร์ (2)" },
                  { name: "อริ", star: "ดาว อังคาร (3)" },
                  { name: "ขุมทรัพย์", star: "ดาว พุธ (4)" },
                  { name: "มรณะ", star: "ดาว พฤหัส (5)" },
                  { name: "อธิบดี", star: "ดาว ศุกร์ (6)" },
                  { name: "ราชา", star: "ดาว เสาร์ (7)" },
                  { name: "ธงชัย", star: "ดาว อาทิตย์ (1)" }
                ].map(item => (
                  <div key={item.name} className="flex justify-between items-center text-[11px] py-0.5">
                    <span className="text-[#8A8070] font-medium">{item.name}</span>
                    <span className="text-[#F8F6F1] font-bold">{item.star}</span>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </Card>

      {/* Chat Section removed from bottom and integrated into Category card */}
    </div>
  );
}
