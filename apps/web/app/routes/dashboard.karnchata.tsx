import { json } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, useLoaderData, useSubmit } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile, requireMinPlan } from "~/services/auth.server";
import { calculateKarnchata, calculatePhopephum, gregorianToThaiLunarV3 } from "@phopephum/engine";
import { STAR_NAMES } from "@phopephum/types";
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
  let phopephumResult = null;
  if (profile?.birth_date) {
    try {
      phopephumResult = await calculatePhopephum({
        birthDate: profile.birth_date,
        birthTime: profile.birth_time || "12:00",
        birthPlace: profile.birth_place || "กรุงเทพมหานคร",
      }, now);
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

  let lunarInfo: { moonPhaseText: string; isWaxing: boolean; lunarDay: number; thaiMonthName: string } | null = null;
  try {
    const lunar = gregorianToThaiLunarV3(now);
    lunarInfo = { moonPhaseText: lunar.moonPhaseText, isWaxing: lunar.isWaxing, lunarDay: lunar.lunarDay, thaiMonthName: lunar.thaiMonthName };
  } catch (e) { /* fallback */ }

  return json({
    profile,
    initialResult,
    phopephumResult,
    thaiDateLabel,
    lunarInfo,
    currentTime: now.toISOString(),
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);

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

  let phopephumResult = null;
  const profile = await getProfile(user.id, request, env);
  if (profile?.birth_date) {
    try {
      phopephumResult = await calculatePhopephum({
        birthDate: profile.birth_date,
        birthTime: profile.birth_time || "12:00",
        birthPlace: profile.birth_place || "กรุงเทพมหานคร",
      }, targetDate);
    } catch (e) {
      // fallback
    }
  }

  let lunarInfo: { moonPhaseText: string; isWaxing: boolean; lunarDay: number; thaiMonthName: string } | null = null;
  try {
    const lunar = gregorianToThaiLunarV3(targetDate);
    lunarInfo = { moonPhaseText: lunar.moonPhaseText, isWaxing: lunar.isWaxing, lunarDay: lunar.lunarDay, thaiMonthName: lunar.thaiMonthName };
  } catch (e) { /* fallback */ }

  return json({
    result,
    phopephumResult,
    lunarInfo,
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

// ชื่อภพฐาน 1-3 สำหรับผังกาลชะตา
const BHOP_NATAL_NAMES = [
  ["อัตตะ", "หินะ", "ธนัง", "ปิตา", "มาตา", "โภคา", "มัชฌิมา"],
  ["ตนุ", "กฎุมภะ", "สหัชชะ", "พันธุ", "ปุตตะ", "อริ", "ปัตนิ"],
  ["มรณะ", "ศุภะ", "กัมมะ", "ลาภะ", "พยายะ", "ทาสา", "ทาสี"]
];

// ชื่อกำลังเทวดา ฐาน 4 (ค่า 3–21 → ชื่อย่อสำหรับแสดงในช่อง)
const BASE4_POWER_NAMES: Record<number, string> = {
  3:  "อังคารเล็ก",
  4:  "พุธเล็ก",
  5:  "พฤหัสเล็ก",
  6:  "พระอาทิตย์",
  7:  "เสาร์เล็ก",
  8:  "อังคารใหญ่",
  9:  "พระเกตุ",
  10: "พระเสาร์",
  11: "ราชาโชค",
  12: "พระราหู",
  13: "มหาอุจ",
  14: "จักรพรรดิ",
  15: "พระจันทร์",
  16: "โสฬสมงคล",
  17: "พุธใหญ่",
  18: "มหาจักรพรรดิ์",
  19: "พระพฤหัส",
  20: "เสาร์ใหญ่",
  21: "พระศุกร์",
};

const BHOP_8_NAMES = ["อาตมะ", "ทาสา", "สิทธิโชค", "โภคทรัพย์", "โจร", "อุบาทว์", "อุปถัมภ์"];
const BHOP_9_NAMES = ["อัตตะ", "สักกะ", "ญาติ", "ธนัง", "เคหัง", "นาวัง", "ภริยัง"];

export default function KarnchataPage() {
  const { profile, initialResult, phopephumResult: initialPhopephum, thaiDateLabel, lunarInfo: initialLunar } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const activeResult = actionData?.result || initialResult;
  const activePhopephum = actionData?.phopephumResult || initialPhopephum;
  const activeLunar = actionData?.lunarInfo ?? initialLunar;

  const [hoverNum, setHoverNum] = useState<number | null>(null);
  const [timeMode, setTimeMode] = useState<"live" | "custom">("live");
  const [selectedCategory, setSelectedCategory] = useState("work");
  const [time, setTime] = useState<Date>(new Date());
  const [selectedDirection, setSelectedDirection] = useState<number | null>(null);

  // ── Derived display values ──
  const bkkHour = (time.getUTCHours() + 7) % 24;
  const isDaytime = bkkHour >= 6 && bkkHour < 18;
  const periodLabel = isDaytime ? "กลางวัน" : "กลางคืน";
  const yamSeq = Math.floor(((bkkHour - 6 + 24) % 24) / 1.5) % 8 + 1;

  // ── ลัคนายาม 3.75 นาที ──
  const secInCycle = (time.getUTCMinutes() % 30 * 60 + time.getUTCSeconds()) % Math.round(3.75 * 60);
  const cycleSec = Math.round(3.75 * 60); // 225s
  const soySlot = Math.floor((time.getUTCMinutes() % 30) / 3.75) + 1; // 1-8
  const lagnamPos = secInCycle < cycleSec / 3 ? "ยามต้น" : secInCycle < (cycleSec * 2) / 3 ? "ยามกลาง" : "ยามปลาย";

  // ── คำพยากรณ์ยาม (โคลงสี่สุภาพ style) ──
  // ── Star quality scores (based on Thai Taksa kala quality per planet) ──
  const STAR_SCORES: Record<number, {trade:number; love:number; wealth:number; danger:number}> = {
    1: {trade:35, love:40, wealth:35, danger:75}, // อาทิตย์ — กาลกิณี
    2: {trade:55, love:70, wealth:50, danger:20}, // จันทร์  — บริวาร
    3: {trade:60, love:45, wealth:55, danger:35}, // อังคาร  — อายุ
    4: {trade:80, love:55, wealth:65, danger:15}, // พุธ     — เดช
    5: {trade:70, love:65, wealth:80, danger:10}, // พฤหัส  — มูละ
    6: {trade:60, love:90, wealth:70, danger:10}, // ศุกร์   — มนตรี
    7: {trade:75, love:60, wealth:90, danger:15}, // เสาร์   — ศรี
  };
  const yaiN = activeResult.yamYaiNumber || activeResult.dayStarNumber || 1;
  const soyN = activeResult.yamSoyNumber || activeResult.dayStarNumber || 1;
  const yaiQ = STAR_SCORES[yaiN] ?? STAR_SCORES[1];
  const soyQ = STAR_SCORES[soyN] ?? STAR_SCORES[1];
  const tradeScore  = Math.round(yaiQ.trade  * 0.6 + soyQ.trade  * 0.4);
  const loveScore   = Math.round(yaiQ.love   * 0.4 + soyQ.love   * 0.6);
  const wealthScore = Math.round(yaiQ.wealth * 0.5 + soyQ.wealth * 0.5);
  const dangerScore = Math.max(yaiQ.danger, soyQ.danger);

  // ── Yam descriptions per planet ──
  const YAM_DESC: Record<number, {subtitle:string; desc:string}> = {
    1: {subtitle:"อำนาจ/ผู้นำ", desc:"ช่วงเวลาแห่งอำนาจบารมี เหมาะสำหรับการเป็นผู้นำ ตัดสินใจเด็ดขาด เจรจากับผู้ใหญ่หรือผู้มีอำนาจ ความแม่นยำสูง"},
    2: {subtitle:"ความรู้สึก/ครอบครัว", desc:"ช่วงเวลาแห่งความรู้สึก เหมาะสำหรับการดูแลครอบครัว สร้างความสัมพันธ์ เจรจาด้วยความอ่อนโยน"},
    3: {subtitle:"พลังงาน/ความกล้า", desc:"ช่วงเวลาแห่งพลังงาน เหมาะสำหรับงานที่ต้องใช้กำลังและความกล้าหาญ ระวังอารมณ์ร้อนและการทะเลาะวิวาท"},
    4: {subtitle:"สติปัญญา/การสื่อสาร", desc:"ช่วงเวลาแห่งสติปัญญา เหมาะสำหรับการเรียนรู้ เจรจาต่อรอง วิเคราะห์ข้อมูล และงานด้านการสื่อสาร"},
    5: {subtitle:"ปัญญา/โชคลาภ", desc:"ช่วงเวลาแห่งปัญญาและโชคลาภ เหมาะสำหรับการขอพร ขยายกิจการ ลงทุน และสร้างความมั่งคั่งระยะยาว"},
    6: {subtitle:"ความรัก/ศิลปะ", desc:"ช่วงเวลาแห่งความรักและศิลปะ เหมาะสำหรับการสารภาพรัก สร้างมิตรภาพ กิจกรรมสร้างสรรค์และความงาม"},
    7: {subtitle:"ความมั่นคง/อดทน", desc:"ช่วงเวลาแห่งความมั่นคง เหมาะสำหรับงานระยะยาว วางรากฐาน ปฏิบัติงานที่ต้องการความอดทนและความละเอียดรอบคอบ"},
  };
  const yamDesc = YAM_DESC[yaiN] ?? YAM_DESC[1];

  // ── คำพยากรณ์โบราณ ──
  const YAM_OMEN: Record<number, string> = {
    1: "อาทิตย์อวสาน ยาตราทำการ มิตีหนักหนา ได้เมื่อช่างทอง จำลองพระสิทธา แค้นเคืองหนักหนา มยุรากลืนแหวน",
    2: "จันทร์สาดแสงฉาย เมตตาอภัย สมบัติงามดี มีมิตรสหาย กายใจสบาย พ้นภัยพิบัติ ประกาศเกียรติยศ",
    3: "อังคารเดินทาง ระวางอันตราย อย่าไปทิศตะวันออก โลหกิจเจริญ เผ็ดร้อนเกริ่นกราย ชนะศัตรูได้",
    4: "พุธทรงปรีชา วาจาว่องไว พ่อค้าโชคดี มีกำไรงาม เจรจาสำเร็จ เลิศทางสติปัญญา ค้าขายวันนี้",
    5: "พฤหัสบดีโชค ปลดโศกทุกข์พ้น ทรัพย์สมบัติล้น ผลบุญส่งเสริม เพิ่มพูนความเจริญ เกริ่นชื่อเสียงดี",
    6: "ศุกร์งามพริ้งเพรา เสน่ห์เพริดแพร้ว รักหวานชื่นชม สมหวังทุกสิ่ง ยิ่งเมตตาดี มีสุขสมบูรณ์",
    7: "เสาร์หนักขวาง ระวางสิ่งร้าย อย่างระวังภัย ใจอดทนดี มีความมั่นคง คงชนะอุปสรรค พรากจากเสนียด",
  };
  const yamOmen = YAM_OMEN[yaiN] ?? "";

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
    if (rowIdx < 3) return BHOP_NATAL_NAMES[rowIdx][colIdx];
    return "";
  };

  // Chat
  const [chatMessages, setChatMessages] = useState([
    { sender: "ai", text: "สวัสดีครับคุณผู้ใช้งาน ยินดีต้อนรับสู่พื้นที่แห่งปัญญาญาณและการเติบโตภายใน ผมคือ Wisdom Guidance พร้อมชี้แนะแนวทางและวิเคราะห์จังหวะชีวิตด้วยศาสตร์กาลชะตาเรียลไทม์ ณ ขณะนี้แล้วครับ ท่านอยากจะตรวจสอบเรื่องใดเป็นพิเศษหรือไม่ครับ?", time: "" }
  ]);
  const [userInput, setUserInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const doChatFetch = async (q: string) => {
    setChatMessages(prev => [...prev, { sender: "user", text: q, time: "" }]);
    setUserInput("");
    
    // Add temporary AI loading message
    setChatMessages(prev => [...prev, { sender: "ai", text: "กำลังเชื่อมต่อกระแสญาณ...", time: "" }]);
    
    try {
      const formData = new FormData();
      formData.append("question", q);
      formData.append("category", CATEGORIES.find(c => c.id === selectedCategory)?.label || "ทั่วไป");
      formData.append("targetDate", time.toISOString());
      
      const res = await fetch("/api/karnchata-chat", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error("API Error");
      
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
             if (line.trim().startsWith("data: ")) {
                const raw = line.slice(6).trim();
                if (raw === "[DONE]") break;
                try {
                  const parsed = JSON.parse(raw);
                  if (parsed.text) aiText += parsed.text;
                } catch(e){}
             }
          }
          // update last message
          setChatMessages(prev => {
            const newArr = [...prev];
            newArr[newArr.length - 1] = { sender: "ai", text: aiText, time: "" };
            return newArr;
          });
        }
      }
    } catch(e) {
      setChatMessages(prev => {
        const newArr = [...prev];
        newArr[newArr.length - 1] = { sender: "ai", text: "ขออภัยครับ กระแสญาณขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง", time: "" };
        return newArr;
      });
    }
  };

  const handleAutoSend = (q: string) => {
    doChatFetch(q);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    doChatFetch(userInput);
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
             <span className="text-xs font-bold text-[#C6A96B] tracking-wide flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-[#C6A96B] shadow-[0_0_8px_rgba(198,169,107,0.8)]" />
               กาลเวลาที่กำหนด (เจาะจงฤกษ์)
             </span>
             <span className={`border font-bold text-xs px-4 py-1.5 rounded-full ${isDaytime ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"}`}>
               {isDaytime ? "☀️ กลางวัน" : "🌙 กลางคืน"}
             </span>
          </div>

          <div className="text-center my-6">
            <p className="text-[72px] md:text-[88px] font-display font-black text-[#F8F6F1] leading-none tracking-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-pulse-slow">
              {formatTime(time)}
            </p>
            <p className="text-xs text-[#8A8070] tracking-wide mt-4 italic">
              กาลชะตาหมุนเวียนรอบละ 3.45 นาที • ตรวจจับกำลังดาวเปลี่ยนตามวินาทีจริง
            </p>

            <div className="flex items-center justify-center gap-4 mt-6">
              <div className="bg-[#020617] border border-white/5 rounded-2xl px-6 py-4 min-w-[120px]">
                <p className="text-[11px] text-[#8A8070] mb-1.5 font-medium">ยามใหญ่ (ตนุ)</p>
                <p className="text-base font-bold text-[#F8F6F1]">{activeResult.yamYaiName}</p>
              </div>
              <div className="bg-[#0B1E36] border border-sky-500/20 rounded-2xl px-6 py-4 min-w-[120px]">
                <p className="text-[11px] text-sky-400 mb-1.5 font-medium">ยามซอย (อัตตะ)</p>
                <p className="text-base font-bold text-sky-300">{activeResult.yamSoyName}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#020617] border border-[#d97706]/40 rounded-2xl p-5 mt-auto relative shadow-[0_0_15px_rgba(217,119,6,0.1)]">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs text-[#d97706] font-bold">ยามกาลชะตาในขณะนี้</p>
              <span className="bg-[#0A1628] border border-white/5 text-[#F8F6F1] text-xs px-3 py-1 rounded-full font-bold">
                ยามที่ {yamSeq}
              </span>
            </div>
            <h3 className="font-display text-lg font-bold text-[#d97706] mb-2">{activeResult.yamYaiName} <span className="text-sm font-normal">({yamDesc.subtitle})</span></h3>
            <p className="text-sm text-[#d97706]/80 leading-relaxed max-w-md">
              {yamDesc.desc}
            </p>
          </div>
        </Card>

        {/* เลือกเรื่องที่ต้องการถามเจาะลึก */}
        <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-6 lg:p-8 flex flex-col">
          <h3 className="text-sm font-bold text-[#F8F6F1] mb-6 flex items-center gap-2">
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
                <span className={`text-xs font-bold text-center leading-tight ${selectedCategory === cat.id ? "text-sky-400" : "text-[#F8F6F1]"}`}>
                  {cat.label}
                </span>
              </button>
            ))}
          </div>

          <div className="bg-[#020617] border border-white/5 rounded-2xl p-5 flex-1">
            <p className="text-xs font-bold text-[#C6A96B] mb-4 flex items-center gap-2">
              💡 คำถามแนะนำสำหรับหมวดนี้
            </p>
            <div className="space-y-4">
              {activeCategory?.questions.map((q, i) => (
                <div key={i} className="flex gap-3 bg-transparent p-0 cursor-pointer group" onClick={() => handleAutoSend(q)}>
                  <span className="text-[#C6A96B] text-base leading-none mt-0.5 opacity-70 group-hover:opacity-100 shrink-0">✦</span>
                  <p className="text-sm text-[#F8F6F1] opacity-70 group-hover:opacity-100 leading-relaxed transition-opacity">{q}</p>
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
                 <h3 className="text-sm font-bold text-[#F8F6F1] tracking-wider">WISDOM GUIDANCE</h3>
                 <p className="text-xs text-[#8A8070] mt-0.5">หมวด: <span className="font-bold text-[#C6A96B]">{activeCategory?.label}</span></p>
               </div>
               <button onClick={() => setChatMessages([])} className="ml-auto px-4 py-1.5 text-xs border border-white/10 text-[#8A8070] hover:text-[#F8F6F1] hover:border-white/20 rounded-lg transition-colors">
                 ล้างแชท
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-transparent h-[280px]">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                  {msg.sender === "ai" && (
                    <span className="text-xs text-[#C6A96B] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="text-[#F8F6F1]">✦</span> WISDOM GUIDANCE
                    </span>
                  )}
                  <div className={`max-w-[85%] md:max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
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
                  placeholder="พิมพ์คำถามของท่าน..."
                  className="flex-1 bg-[#0A1628] border border-white/5 rounded-xl px-5 py-3 text-sm text-[#F8F6F1] outline-none focus:border-[#C6A96B]/50 transition-colors placeholder:text-[#8A8070]/50"
                />
                <Button type="submit" disabled={!userInput.trim()} className="px-6 py-3 shrink-0 rounded-xl bg-[#8A8070] text-[#020617] font-bold hover:bg-[#C6A96B] transition-colors shadow-lg text-xs">
                  ส่ง
                </Button>
              </form>
            </div>
          </div>
        </Card>
      </div>

      {/* Scores Section — computed from yamYai + yamSoy */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "การค้า/เจรจา",    score: tradeScore,  color: "text-[#C6A96B]",   bgLine: "bg-[#C6A96B]",   icon: "💼" },
          { label: "ความรัก/เมตตา",   score: loveScore,   color: "text-pink-400",    bgLine: "bg-pink-400",    icon: "💖" },
          { label: "โชคลาภ/ทรัพย์",   score: wealthScore, color: "text-emerald-400", bgLine: "bg-emerald-400", icon: "💎" },
          { label: "ระดับการเตือนภัย", score: dangerScore, color: dangerScore >= 50 ? "text-rose-400" : dangerScore >= 30 ? "text-amber-400" : "text-[#8A8070]", bgLine: dangerScore >= 50 ? "bg-rose-400" : dangerScore >= 30 ? "bg-amber-400" : "bg-[#8A8070]", icon: "⚠️" },
        ].map(item => (
          <div key={item.label} className="p-5 border border-white/5 bg-[#0A1628] rounded-2xl flex flex-col items-center justify-center gap-3">
            <span className="text-lg">{item.icon}</span>
            <span className="text-xs text-[#8A8070] font-bold text-center leading-snug">{item.label}</span>
            <span className={`text-4xl font-display font-bold ${item.color}`}>{item.score}%</span>
            <div className={`w-16 h-1.5 rounded-full ${item.bgLine} opacity-70`} />
          </div>
        ))}
      </div>

      {/* ═══ การ์ดบทวิเคราะห์ยามกาลชะตา ═══ */}
      <Card className="border-[#C6A96B]/30 bg-[#0A1628] p-6 md:p-8 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#C6A96B]/5 via-transparent to-[#4B6FAE]/5 pointer-events-none" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[#C6A96B]/20 flex items-center justify-center text-lg shrink-0">📋</div>
          <div>
            <h3 className="text-sm font-bold text-[#C6A96B]">บทวิเคราะห์ยามกาลชะตา</h3>
            <p className="text-xs text-[#8A8070] mt-0.5">สรุปรายงานส่วนบุคคล — กดปุ่มถ่ายภาพหน้าจอเพื่อแชร์</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ── ซ้าย: ข้อมูลวัน/เวลา ── */}
          <div className="space-y-4">
            {/* วัน/เดือน/ปี + จันทรคติ */}
            <div className="bg-[#020617] border border-[#C6A96B]/20 rounded-2xl p-5">
              <p className="text-[10px] text-[#C6A96B] font-bold uppercase tracking-widest mb-3">พยากรณ์</p>
              <p className="font-display text-base font-bold text-[#F8F6F1] leading-relaxed">
                {time.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <p className="text-sm text-[#8A8070] mt-1">
                ตรงกับวัน{time.toLocaleDateString("th-TH", { weekday: "long" }).replace("วัน", "")}
                {activeLunar ? (
                  <span className={`ml-1.5 font-bold ${activeLunar.isWaxing ? "text-[#C6A96B]" : "text-sky-400"}`}>
                    {activeLunar.moonPhaseText}
                  </span>
                ) : null}
              </p>
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
                <div>
                  <p className="text-[10px] text-[#8A8070]">เวลา</p>
                  <p className="text-lg font-display font-bold text-[#F8F6F1]">{time.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })} น.</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div>
                  <p className="text-[10px] text-[#8A8070]">ลัคนายาม (3.75 นาที)</p>
                  <p className="text-sm font-bold text-[#F8F6F1]">{soySlot} <span className="text-[#C6A96B]">{lagnamPos}</span></p>
                </div>
              </div>
            </div>

            {/* ยามใหญ่ + ยามซอย */}
            <div className="bg-[#020617] border border-white/5 rounded-2xl p-5">
              <p className="text-[10px] text-[#C6A96B] font-bold uppercase tracking-widest mb-3">ยาม</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0A1628] rounded-xl p-3">
                  <p className="text-[10px] text-[#8A8070] mb-1">ยามใหญ่ (ตนุ)</p>
                  <p className="text-sm font-bold text-[#F8F6F1]">{yaiN} {activeResult.yamYaiName}</p>
                </div>
                <div className="bg-[#0B1E36] rounded-xl p-3 border border-sky-500/20">
                  <p className="text-[10px] text-sky-400 mb-1">ยามซอย (อัตตะ)</p>
                  <p className="text-sm font-bold text-sky-300">{soyN} {activeResult.yamSoyName}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── ขวา: คำพยากรณ์ + ทักษา ── */}
          <div className="space-y-4">
            {/* คำพยากรณ์โบราณ */}
            <div className="bg-[#020617] border border-[#d97706]/20 rounded-2xl p-5">
              <p className="text-[10px] text-[#d97706] font-bold uppercase tracking-widest mb-3">คำพยากรณ์ยามนี้</p>
              <p className="text-sm text-[#F8F6F1] leading-relaxed font-medium italic">"{yamOmen}"</p>
              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-xs text-[#8A8070] leading-relaxed">{yamDesc.desc}</p>
              </div>
            </div>

            {/* ทักษาจร ยามนี้ */}
            <div className="bg-[#020617] border border-white/5 rounded-2xl p-5">
              <p className="text-[10px] text-[#C6A96B] font-bold uppercase tracking-widest mb-3">ทักษาจร (ยามใหญ่ {activeResult.yamYaiName})</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  {q:"ศรี", color:"bg-emerald-500/20 text-emerald-400 border-emerald-500/30"},
                  {q:"มนตรี", color:"bg-blue-500/20 text-blue-400 border-blue-500/30"},
                  {q:"มูละ", color:"bg-amber-500/20 text-amber-400 border-amber-500/30"},
                  {q:"อุตสาหะ", color:"bg-teal-500/20 text-teal-400 border-teal-500/30"},
                  {q:"เดช", color:"bg-orange-500/20 text-orange-400 border-orange-500/30"},
                  {q:"บริวาร", color:"bg-indigo-500/20 text-indigo-300 border-indigo-500/30"},
                  {q:"อายุ", color:"bg-white/5 text-[#8A8070] border-white/10"},
                  {q:"กาลกิณี", color:"bg-rose-950/40 text-rose-400 border-rose-500/30"},
                ].map(item => (
                  <div key={item.q} className={`rounded-xl px-2 py-2 border text-center ${item.color}`}>
                    <p className="text-[10px] font-bold leading-tight">{item.q}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#8A8070] mt-3">ดาวศรี = โชคดีสูงสุด • กาลกิณี = ระวังอุปสรรค</p>
            </div>
          </div>
        </div>
      </Card>

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
                  <button
                    key={cIdx}
                    type="button"
                    onClick={() => setHoverNum(hoverNum === star ? null : star)}
                    className="flex flex-col items-center gap-2 w-14 focus:outline-none"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-display font-bold transition-all duration-300 cursor-pointer ${
                      hoverNum === star
                        ? "bg-[#C6A96B] text-[#020617] scale-110 shadow-[0_0_15px_rgba(198,169,107,0.6)] border border-[#C6A96B]"
                        : "bg-[#020617] border border-[#8A8070]/50 text-[#F8F6F1] hover:border-[#C6A96B]/50 hover:scale-105"
                    }`}>
                      {star}
                    </div>
                    <span className="text-[9px] text-[#8A8070] font-medium">{getBhopName(rIdx, cIdx)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Base 4 — กำลังเทวดา
              highlight: column ที่ฐาน 3 (index 2) มีดาวตรงกับ hoverNum
              click: set hoverNum เป็นดาวของฐาน 3 ที่ column เดียวกัน */}
          <div className="flex items-center w-full max-w-3xl bg-[#0B1E36]/30 border border-sky-500/10 py-3 px-2 rounded-2xl my-2">
             <div className="w-[72px] text-[11px] font-bold text-sky-400 pl-2">
               <div>ฐาน ๔</div>
               <div className="text-[8px] text-sky-400/60 leading-tight mt-0.5">กำลังเทวดา</div>
             </div>
             <div className="flex-1 flex justify-between pr-2">
                {activeResult.chart[3].map((star: number, cIdx: number) => {
                  // ดาวของฐาน 3 ที่ column เดียวกัน (Base 3 = index 2)
                  const base3Star: number = activeResult.chart[2]?.[cIdx] ?? 0;
                  const isBase4Lit = hoverNum !== null && base3Star === hoverNum;
                  return (
                    <button
                      key={cIdx}
                      type="button"
                      onClick={() => setHoverNum(hoverNum === base3Star ? null : base3Star)}
                      className="flex flex-col items-center gap-2 w-14 focus:outline-none"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-display font-bold transition-all duration-300 cursor-pointer ${
                        isBase4Lit
                          ? "bg-[#4B6FAE] text-[#F8F6F1] scale-110 shadow-[0_0_15px_rgba(75,111,174,0.7)] border border-[#4B6FAE]"
                          : "bg-[#020617] border border-sky-500/50 text-[#F8F6F1] hover:border-[#C6A96B]/50 hover:scale-105"
                      }`}>
                        {star}
                      </div>
                      <span className={`text-[8px] font-medium text-center leading-tight ${isBase4Lit ? "text-sky-300" : "text-sky-400/80"}`}>
                        {BASE4_POWER_NAMES[star] || ""}
                      </span>
                    </button>
                  );
                })}
             </div>
          </div>

          {/* Bases 5-9 */}
          {[4, 5, 6, 7, 8].map(rIdx => (
            <div key={rIdx} className="flex items-center w-full max-w-3xl">
              <div className="w-20 text-[11px] font-bold text-[#F8F6F1]">ฐาน {rIdx + 1 === 5 ? '๕' : rIdx + 1 === 6 ? '๖' : rIdx + 1 === 7 ? '๗' : rIdx + 1 === 8 ? '๘' : '๙'}</div>
              <div className="flex-1 flex justify-between">
                {activeResult.chart[rIdx].map((star: number, cIdx: number) => (
                  <button
                    key={cIdx}
                    type="button"
                    onClick={() => setHoverNum(hoverNum === star ? null : star)}
                    className="flex flex-col items-center gap-2 w-14 focus:outline-none"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-display font-bold transition-all duration-300 cursor-pointer ${
                      hoverNum === star
                        ? "bg-[#C6A96B] text-[#020617] scale-110 shadow-[0_0_15px_rgba(198,169,107,0.6)] border border-[#C6A96B]"
                        : "bg-[#020617] border border-[#8A8070]/50 text-[#F8F6F1] hover:border-[#C6A96B]/50 hover:scale-105"
                    }`}>
                      {star}
                    </div>
                    {rIdx === 7 && <span className="text-[9px] text-[#8A8070] font-medium">{["อาตมะ","ทาสา","สิทธิโชค","โภคทรัพย์","โจร","อุบาทว์","อุปถัมภ์"][cIdx]}</span>}
                    {rIdx === 8 && <span className="text-[9px] text-[#8A8070] font-medium">{["อัตตะ","สักกะ","ญาติ","ธนัง","เคหัง","นาวัง","ภริยัง"][cIdx]}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Star Tracing Method Guide — ท้ายผังเลข 7 ตัว */}
          <div className="w-full max-w-3xl bg-[#020617] border border-[#C6A96B]/20 rounded-2xl p-5 mt-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[#C6A96B] text-base">✦</span>
              <p className="text-[11px] font-bold text-[#C6A96B] tracking-wide">วิธีอ่านรหัสชีวิต 3 Steps — Star Tracing Method</p>
            </div>
            <p className="text-[10px] text-rose-400/90 font-bold mb-3 flex items-center gap-1.5">
              <span>⚑</span> กฎเหล็ก: ห้ามอ่านแนวดิ่ง (Column) เสมอไป — ใช้ "เลขดาว" เป็นตัวเชื่อมโยง ฐาน 1 → 2 → 3
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-[#0A1628] rounded-xl p-4 border border-white/5">
                <p className="text-[10px] font-bold text-[#C6A96B] mb-2 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#C6A96B]/20 flex items-center justify-center text-[9px] font-black text-[#C6A96B] shrink-0">1</span>
                  ตั้งโจทย์ (Inquiry)
                </p>
                <p className="text-[10px] text-[#8A8070] leading-relaxed">เลือกภพเรือนใน <span className="text-[#F8F6F1] font-bold">ฐานที่ 1</span> ที่ต้องการทราบ แล้วดูว่าคือ <span className="text-[#C6A96B] font-bold">เลขดาวอะไร</span> — กดที่ตัวเลขนั้นเพื่อเริ่มติดตาม</p>
              </div>
              <div className="bg-[#0A1628] rounded-xl p-4 border border-white/5">
                <p className="text-[10px] font-bold text-sky-400 mb-2 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center text-[9px] font-black text-sky-400 shrink-0">2</span>
                  ตามรอยดาว (Tracing)
                </p>
                <p className="text-[10px] text-[#8A8070] leading-relaxed">จากฐาน 1 → นำเลขดาวนั้น ไปหาตำแหน่งใน <span className="text-[#F8F6F1]">ฐาน 2</span> ว่าสถิตในภพอะไร แล้วตามต่อสู่ <span className="text-[#F8F6F1]">ฐาน 3</span> ว่าตกในภพใด <span className="text-[9px] text-sky-400">(ย้าย Column ได้)</span></p>
              </div>
              <div className="bg-[#0B1E36] rounded-xl p-4 border border-sky-500/20">
                <p className="text-[10px] font-bold text-[#4B6FAE] mb-2 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#4B6FAE]/30 flex items-center justify-center text-[9px] font-black text-[#4B6FAE] shrink-0">3</span>
                  สรุปด้วยกำลังเทวดา (Base 4)
                </p>
                <p className="text-[10px] text-[#8A8070] leading-relaxed">ดูดาวในฐาน 3 <span className="text-[#F8F6F1]">ตกที่ Column ไหน</span> → อ่านค่า <span className="text-sky-300 font-bold">ฐาน 4</span> ใน Column เดียวกันนั้น เพื่อตัดสินคุณภาพของเรื่องราว</p>
              </div>
            </div>
            {hoverNum !== null && (
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                <span className="text-[#C6A96B] text-xs">✦</span>
                <p className="text-[10px] text-[#F8F6F1]">กำลังตามรอยดาว <span className="font-bold text-[#C6A96B]">{hoverNum}</span> — ดูตำแหน่งที่ไฮไลต์ใน ฐาน 2 และ 3 แล้วอ่านกำลังเทวดาใน <span className="text-sky-300">ฐาน 4 (สีน้ำเงิน)</span></p>
              </div>
            )}
          </div>
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
                  onClick={() => setHoverNum(hoverNum === dir.id ? null : dir.id)}
                  className={`p-6 rounded-3xl border flex flex-col items-center text-center transition-all ${
                    hoverNum === dir.id 
                      ? "bg-[#C6A96B]/10 border-[#C6A96B] shadow-[0_0_20px_rgba(198,169,107,0.15)] scale-[1.02]" 
                      : "bg-[#020617] border-white/5 hover:border-white/10 hover:bg-white/5"
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
                {activePhopephum?.taksaTransit?.map ? (
                  Object.entries(activePhopephum.taksaTransit.map).map(([starStr, bhop]) => {
                    const n = Number(starStr);
                    const name = STAR_NAMES[n as keyof typeof STAR_NAMES];
                    let bg = "bg-[#8A8070]/20 text-[#8A8070]";
                    if (bhop === "มูละ") bg = "bg-amber-600/20 text-amber-500";
                    else if (bhop === "อุตสาหะ") bg = "bg-teal-500/20 text-teal-400";
                    else if (bhop === "มนตรี") bg = "bg-blue-500/20 text-blue-400";
                    else if (bhop === "กาลกิณี") bg = "bg-rose-950/40 text-rose-400";
                    else if (bhop === "ศรี") bg = "bg-emerald-950/40 text-emerald-400";
                    else if (bhop === "บริวาร") bg = "bg-indigo-500/20 text-indigo-400";
                    else if (bhop === "เดช") bg = "bg-orange-500/20 text-orange-400";

                    return (
                      <button 
                        key={n} 
                        onClick={() => setHoverNum(hoverNum === n ? null : n)}
                        className={`w-full flex justify-between items-center text-[11px] p-2 rounded-xl transition-all ${hoverNum === n ? 'bg-white/10 ring-1 ring-[#C6A96B]' : 'hover:bg-white/5'}`}
                      >
                        <span className="text-[#F8F6F1] font-medium">ดาว {name} ({n})</span>
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wide ${bg}`}>
                          {bhop as string}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-[#8A8070] text-xs text-center py-4 border border-dashed border-white/10 rounded-xl">กรุณาระบุวันเดือนปีเกิดในหน้าโปรไฟล์เพื่อวิเคราะห์ทักษาจร</p>
                )}
              </div>
           </div>

           {/* มหาภูติจร */}
           <div className="bg-[#020617] rounded-2xl p-6 border border-white/5">
              <p className="text-xs font-bold text-[#F8F6F1] mb-6 flex items-center gap-2">
                <span className="text-pink-400 text-base">🧠</span> มหาภูติจร (สภาวะจิตใจ)
              </p>
              <div className="space-y-4">
                {activePhopephum?.mahaTransit?.map ? (
                  Object.entries(activePhopephum.mahaTransit.map).map(([bhop, starStr]) => {
                    const n = Number(starStr);
                    const name = STAR_NAMES[n as keyof typeof STAR_NAMES];
                    return (
                      <button 
                        key={bhop}
                        onClick={() => setHoverNum(hoverNum === n ? null : n)} 
                        className={`w-full flex justify-between items-center text-[11px] py-1.5 px-2 rounded-xl transition-all ${hoverNum === n ? 'bg-white/10 ring-1 ring-[#C6A96B]' : 'hover:bg-white/5'}`}
                      >
                        <span className="text-[#8A8070] font-medium">{bhop}</span>
                        <span className="text-[#F8F6F1] font-bold">ดาว {name} ({n})</span>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-[#8A8070] text-xs text-center py-4 border border-dashed border-white/10 rounded-xl">กรุณาระบุวันเดือนปีเกิดในหน้าโปรไฟล์เพื่อวิเคราะห์มหาภูติจร</p>
                )}
              </div>
           </div>
        </div>
      </Card>

      {/* Chat Section removed from bottom and integrated into Category card */}
    </div>
  );
}
