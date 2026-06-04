import { json } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, useLoaderData, useSubmit } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile, requireMinPlan, canAccess } from "~/services/auth.server";
import { logEvent, EVENTS } from "~/services/analytics.server";
import { calculateKarnchata } from "@phopephum/engine";
import type { Env } from "~/env.server";
import { Card } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { useState, useEffect, useCallback } from "react";

export const meta: MetaFunction = () => [
  { title: "ทำนายกาลชะตา (ยาม 3.45) — PhopePhum" },
  { name: "description", content: "พยากรณ์เรื่องเฉพาะหน้า เหตุการณ์กะทันหัน ด้วยกาลชะตายามซอย 3.45 นาที" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  // Require at least basic plan
  const { user, profile } = await requireMinPlan("basic", request, env);

  // Initialize with current time
  const now = new Date();
  const initialResult = calculateKarnchata(now);

  return json({
    profile,
    initialResult,
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
      targetDate = new Date(Date.UTC(tYearCE, tMonth - 1, tDay, th - 7, tmin, 0)); // BKK is UTC+7
    }
  }

  const result = calculateKarnchata(targetDate);

  return json({
    result,
    timeMode,
  });
}

function DateDropdowns({ prefix, defaultDay, defaultMonth, defaultYear, onChange }: { prefix: string, defaultDay: number, defaultMonth: number, defaultYear: number, onChange?: any }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      <select name={`${prefix}Day`} onChange={onChange} defaultValue={defaultDay} className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-2.5 py-2.5 text-xs focus:border-[#C9A96E]/50 outline-none">
        {Array.from({ length: 31 }).map((_, i) => (
          <option key={i + 1} value={i + 1} className="bg-[#020617]">{i + 1}</option>
        ))}
      </select>
      <select name={`${prefix}Month`} onChange={onChange} defaultValue={defaultMonth} className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-2.5 py-2.5 text-xs focus:border-[#C9A96E]/50 outline-none">
        {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => (
          <option key={i + 1} value={i + 1} className="bg-[#020617]">{m}</option>
        ))}
      </select>
      <select name={`${prefix}Year`} onChange={onChange} defaultValue={defaultYear} className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-2.5 py-2.5 text-xs focus:border-[#C9A96E]/50 outline-none">
        {Array.from({ length: 150 }).map((_, i) => {
          const y = new Date().getFullYear() + 543 + 10 - i;
          return <option key={y} value={y} className="bg-[#020617]">{y}</option>;
        })}
      </select>
    </div>
  );
}

const TAKSA_DIRECTIONS = [
  { id: 1, name: "ตะวันออกเฉียงเหนือ", col: 1, row: 1 },
  { id: 2, name: "ตะวันออก",         col: 2, row: 1 },
  { id: 3, name: "ตะวันออกเฉียงใต้",    col: 3, row: 1 },
  { id: 6, name: "ทิศเหนือ",           col: 1, row: 2 },
  { id: 9, name: "ศูนย์กลาง (เกตุ)",    col: 2, row: 2 },
  { id: 4, name: "ทิศใต้",             col: 3, row: 2 },
  { id: 8, name: "ตะวันตกเฉียงเหนือ",    col: 1, row: 3 },
  { id: 5, name: "ตะวันตก",          col: 2, row: 3 },
  { id: 7, name: "ตะวันตกเฉียงใต้",      col: 3, row: 3 },
];

export default function KarnchataPage() {
  const { profile, initialResult } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  const activeResult = actionData?.result || initialResult;
  const [timeMode, setTimeMode] = useState<"live" | "custom">("live");
  
  // Live Timer
  useEffect(() => {
    if (timeMode !== "live") return;
    const interval = setInterval(() => {
      const form = new FormData();
      form.append("timeMode", "live");
      submit(form, { method: "post", replace: true });
    }, 60000); // Update every minute in live mode
    return () => clearInterval(interval);
  }, [timeMode, submit]);

  // Handle custom time change
  const handleCustomChange = () => {
    if (timeMode === "custom") {
      const form = document.getElementById("karnchata-form") as HTMLFormElement;
      submit(form, { method: "post", replace: true });
    }
  };

  const defaultDate = new Date();
  const defaultTDay = defaultDate.getDate();
  const defaultTMonth = defaultDate.getMonth() + 1;
  const defaultTYear = defaultDate.getFullYear() + 543;
  const defaultTime = `${String(defaultDate.getHours()).padStart(2, "0")}:${String(defaultDate.getMinutes()).padStart(2, "0")}`;

  const [selectedDirection, setSelectedDirection] = useState<number | null>(null);
  
  // Chat
  const [chatMessages, setChatMessages] = useState([
    { sender: "ai", text: "ยินดีต้อนรับสู่กาลชะตาค่ะ พิมพ์คำถามเฉพาะหน้าได้เลย เช่น 'ของที่หายจะหาเจอไหม?' หรือ 'สมัครงานทิศเหนือดีหรือไม่?'", time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) }
  ]);
  const [userInput, setUserInput] = useState("");

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    
    setChatMessages(prev => [...prev, { sender: "user", text: userInput, time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) }]);
    
    setTimeout(() => {
      let aiResponse = `จากดวงกาลชะตา ยามใหญ่ ${activeResult.yamYaiName} และ ยามซอย ${activeResult.yamSoyName} `;
      if (selectedDirection) {
        const dir = TAKSA_DIRECTIONS.find(d => d.id === selectedDirection);
        aiResponse += `(เจาะจงทิศ ${dir?.name}) `;
      }
      aiResponse += "พบว่ามีพลังงานขับเคลื่อนตามหลักเลข 7 ตัว แนะนำให้ดำเนินการด้วยความรอบคอบค่ะ";
      
      setChatMessages(prev => [...prev, { sender: "ai", text: aiResponse, time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) }]);
    }, 1000);
    setUserInput("");
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

  return (
    <div className="space-y-8 max-w-5xl pb-20 animate-fade-up">
      <header className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[#C6A96B] text-[10px] tracking-[0.3em] uppercase font-bold">
              ดวงเทวดาให้ · วิชาเข็มทิศชีวิต
            </p>
            <h1 className="font-display text-4xl font-extrabold text-[#F8F6F1] tracking-tight mt-1">
              ทำนายกาลชะตา
            </h1>
            <p className="text-[#8A8070] text-xs font-medium mt-1 font-sans">
              พยากรณ์เรื่องเฉพาะหน้า เหตุการณ์กะทันหัน ทุกๆ 3.45 นาที
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls & Matrix */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-[#C9A96E]/20 bg-slate-900/40 backdrop-blur-md p-6">
            <Form method="post" id="karnchata-form" className="space-y-6">
              
              <div className="flex bg-slate-950/40 rounded-xl p-1 border border-white/5">
                <button
                  type="button"
                  onClick={() => { setTimeMode("live"); setTimeout(() => document.getElementById("karnchata-form")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })), 100); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${timeMode === "live" ? "bg-[#C6A96B] text-[#020617] shadow-lg" : "text-[#8A8070] hover:text-[#F8F6F1]"}`}
                >
                  ⏱ เวลาปัจจุบัน (Real-time)
                </button>
                <button
                  type="button"
                  onClick={() => setTimeMode("custom")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${timeMode === "custom" ? "bg-[#C6A96B] text-[#020617] shadow-lg" : "text-[#8A8070] hover:text-[#F8F6F1]"}`}
                >
                  📅 กำหนดเวลาเอง
                </button>
                <input type="hidden" name="timeMode" value={timeMode} />
              </div>

              {timeMode === "custom" && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">วันที่จับยาม (พ.ศ.)</label>
                    <DateDropdowns prefix="custom" defaultDay={defaultTDay} defaultMonth={defaultTMonth} defaultYear={defaultTYear} onChange={handleCustomChange} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">เวลาที่จับยาม</label>
                    <input 
                      type="time" 
                      name="customTime" 
                      defaultValue={defaultTime} 
                      onChange={handleCustomChange}
                      className="w-full bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-3 py-2.5 text-xs focus:border-[#C9A96E]/50 outline-none"
                    />
                  </div>
                </div>
              )}
            </Form>

            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-[#C6A96B]/10 to-transparent border-l-4 border-[#C6A96B]">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] text-[#8A8070] font-bold uppercase">ดาววัน (ฐานมรณะ)</p>
                  <p className="text-xl font-display font-bold text-[#F8F6F1]">{activeResult.dayStarNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#8A8070] font-bold uppercase">ยามใหญ่ (ฐานตนุ)</p>
                  <p className="text-xl font-display font-bold text-[#F8F6F1]">{activeResult.yamYaiName} <span className="text-[#C6A96B] text-sm">({activeResult.yamYaiNumber})</span></p>
                </div>
                <div>
                  <p className="text-[10px] text-[#8A8070] font-bold uppercase">ยามซอย (ฐานอัตตะ)</p>
                  <p className="text-xl font-display font-bold text-[#F8F6F1]">{activeResult.yamSoyName} <span className="text-[#C6A96B] text-sm">({activeResult.yamSoyNumber})</span></p>
                </div>
              </div>
            </div>
          </Card>

          {/* Matrix Chart */}
          <Card className="border-[#C9A96E]/20 bg-slate-900/40 backdrop-blur-md p-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#C6A96B]/5 rounded-full blur-3xl -z-10" />
            <h3 className="text-sm font-bold text-[#C6A96B] uppercase tracking-wider mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C6A96B]" />
              ผังดวงกาลชะตา
            </h3>
            <div className="overflow-x-auto pb-4">
              <div className="min-w-[500px] grid grid-cols-7 gap-2">
                {activeResult.chart.slice(0, 4).map((row: number[], rIdx: number) => (
                  row.map((star: number, cIdx: number) => (
                    <div key={`c-${rIdx}-${cIdx}`} className="relative p-2 rounded-xl bg-slate-950/40 border border-white/5 flex flex-col items-center justify-center text-center group hover:border-[#C6A96B]/30 transition-colors">
                      {rIdx < 3 && <span className="text-[9px] text-[#8A8070] font-medium mb-1">{getBhopName(rIdx, cIdx)}</span>}
                      {rIdx === 3 && <span className="text-[9px] text-[#C6A96B] font-bold mb-1">ฐาน ๔</span>}
                      <span className="font-display text-xl font-bold text-[#F8F6F1]">{star}</span>
                    </div>
                  ))
                ))}
                
                {/* ฐาน 5-9 */}
                <div className="col-span-7 mt-4 border-t border-white/5 pt-4 grid grid-cols-7 gap-2">
                  {activeResult.chart.slice(4).map((row: number[], rIdx: number) => (
                    row.map((star: number, cIdx: number) => (
                      <div key={`c2-${rIdx}-${cIdx}`} className="p-1.5 rounded-lg bg-slate-950/20 flex flex-col items-center">
                        <span className="text-[8px] text-[#8A8070]">ฐาน {rIdx + 5}</span>
                        <span className="font-display text-sm font-bold text-[#C6A96B]">{star}</span>
                      </div>
                    ))
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Taksa & Chat */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Taksa Grid */}
          <Card className="border-[#C9A96E]/20 bg-slate-900/40 backdrop-blur-md p-6">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-bold text-[#C6A96B] uppercase tracking-wider flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-[#C6A96B]" />
                 ทักษาจร (ทิศทาง)
               </h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {TAKSA_DIRECTIONS.sort((a,b) => (a.row * 10 + a.col) - (b.row * 10 + b.col)).map((dir) => (
                <button
                  key={dir.id}
                  type="button"
                  onClick={() => setSelectedDirection(dir.id === selectedDirection ? null : dir.id)}
                  className={`aspect-square flex flex-col items-center justify-center p-2 rounded-2xl border transition-all ${
                    selectedDirection === dir.id 
                      ? "bg-[#C6A96B] border-[#C6A96B] text-[#020617] shadow-lg shadow-[#C6A96B]/20"
                      : "bg-slate-950/40 border-white/10 text-[#F8F6F1] hover:border-[#C6A96B]/40"
                  }`}
                >
                  <span className="font-display text-2xl font-bold mb-1">{dir.id}</span>
                  <span className={`text-[9px] text-center leading-tight ${selectedDirection === dir.id ? "text-[#020617] font-bold" : "text-[#8A8070]"}`}>
                    {dir.name}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#8A8070] mt-4 text-center">
              * เลือกทิศทางที่ต้องการเดินทาง หรือทำกิจกรรม เพื่อประกอบคำทำนาย
            </p>
          </Card>

          {/* Chat Interface */}
          <Card className="border-[#C9A96E]/20 bg-slate-900/40 backdrop-blur-md p-0 overflow-hidden flex flex-col h-[400px]">
             <div className="p-4 border-b border-[#C6A96B]/20 bg-gradient-to-r from-[#0A2240] to-[#020617]">
               <h3 className="text-sm font-bold text-[#C6A96B] uppercase tracking-wider">
                 💬 Wisdom Guidance
               </h3>
             </div>
             <div className="flex-1 p-4 overflow-y-auto space-y-4">
               {chatMessages.map((msg, i) => (
                 <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                   <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                     msg.sender === "user" 
                       ? "bg-gradient-to-br from-[#C6A96B] to-[#D9BC82] text-[#020617] font-bold shadow-md shadow-[#C6A96B]/10" 
                       : "bg-slate-950/60 text-[#F8F6F1] border border-white/10 backdrop-blur-md"
                   }`}>
                     {msg.text}
                     <div className={`text-[9px] mt-1 text-right ${msg.sender === "user" ? "text-[#020617]/60" : "text-[#8A8070]"}`}>
                       {msg.time}
                     </div>
                   </div>
                 </div>
               ))}
             </div>
             <div className="p-3 bg-[#020617] border-t border-white/10">
               <form onSubmit={handleSendChat} className="flex gap-2">
                 <input 
                   type="text" 
                   value={userInput}
                   onChange={e => setUserInput(e.target.value)}
                   placeholder="เช่น วันนี้ไปสมัครงานทิศเหนือดีไหม?"
                   className="flex-1 bg-slate-900 border border-[#C6A96B]/20 rounded-xl px-4 py-2.5 text-xs text-[#F8F6F1] outline-none focus:border-[#C6A96B]/60 transition-colors"
                 />
                 <Button type="submit" disabled={!userInput.trim()} className="px-4 py-2.5 shrink-0 rounded-xl">
                   ส่ง
                 </Button>
               </form>
             </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
