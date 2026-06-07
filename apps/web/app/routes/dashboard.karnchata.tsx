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

  // ── ทักษาจรยาม: rotate from yamYaiNumber (same algorithm as calcTaksaNatal_V3) ──
  // SEQ_STARS_8 = [6,1,2,3,4,7,5,8], TAKSA_BHOP = [บริวาร,อายุ,เดช,ศรี,มูละ,อุตสาหะ,มนตรี,กาลกิณี]
  const _SEQ = [6, 1, 2, 3, 4, 7, 5, 8] as const;
  const _BHOP = ["บริวาร", "อายุ", "เดช", "ศรี", "มูละ", "อุตสาหะ", "มนตรี", "กาลกิณี"] as const;
  const _si = _SEQ.indexOf(yaiN as typeof _SEQ[number]);
  const taksaYamMap: Record<string, number> = {};
  if (_si !== -1) {
    for (let i = 0; i < 8; i++) {
      taksaYamMap[_BHOP[i]] = _SEQ[(_si + i) % 8];
    }
  }

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
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[#C6A96B] text-xs tracking-[0.25em] uppercase font-bold block mb-1">
            ✦ คัมภีร์พยากรณ์ลับเฉพาะกาล
          </span>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#F8F6F1] mb-2">
            ทำนายกาลชะตา V2.0
          </h1>
          <p className="text-[#D9CDB7] text-sm leading-relaxed max-w-xl">
            วิเคราะห์รหัสชะตาชีวิตระดับวินาทีด้วย 7 ตัว 9 ฐาน ผสมผสานระบบ Q&amp;A แชทอัจฉริยะแบบเรียลไทม์
          </p>
        </div>
        <div className="bg-[#C6A96B]/8 border border-[#C6A96B]/20 px-5 py-3 rounded-2xl backdrop-blur-md self-start shrink-0">
          <p className="text-xs text-[#C6A96B] uppercase tracking-[0.2em] mb-0.5 font-bold">วันกาลชะตา</p>
          <p className="text-sm font-bold text-[#F8F6F1]">{thaiDateLabel}</p>
        </div>
      </div>

      {/* ── Control Bar ── */}
      <div className="bg-[#0A1628]/80 border border-white/5 rounded-2xl p-2 flex flex-col gap-2">
        <div className="flex bg-[#020617] rounded-xl p-1 border border-white/5">
          <button
            type="button"
            onClick={() => setTimeMode("live")}
            className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${timeMode === "live" ? "bg-[#1E1730] text-[#F8F6F1] shadow-lg" : "text-[#8A8070] hover:text-[#F8F6F1]"}`}
          >
            ⏱ เรียลไทม์
          </button>
          <button
            type="button"
            onClick={() => setTimeMode("custom")}
            className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${timeMode === "custom" ? "bg-[#C6A96B] text-[#020617] shadow-lg" : "text-[#8A8070] hover:text-[#F8F6F1]"}`}
          >
            📅 เลือกวัน/เวลา
          </button>
        </div>
        {timeMode === "custom" && (
          <div className="flex flex-wrap items-center gap-2 px-2 pb-1">
            <span className="text-xs text-[#8A8070] font-bold shrink-0">เลือกวันเวลา:</span>
            <input type="date" autoComplete="off" className="flex-1 min-w-[130px] bg-[#020617] border border-white/10 text-[#F8F6F1] text-sm rounded-xl px-3 py-2 outline-none focus:border-[#C6A96B]" defaultValue={new Date().toISOString().split('T')[0]} />
            <input type="time" autoComplete="off" className="w-[110px] bg-[#020617] border border-white/10 text-[#F8F6F1] text-sm rounded-xl px-3 py-2 outline-none focus:border-[#C6A96B]" defaultValue="12:00" />
          </div>
        )}
      </div>

      {/* ── Hero Clock Card ── */}
      <Card className="p-6 sm:p-8 border-[#C6A96B]/20 bg-gradient-to-br from-[#020617] via-[#09152b] to-[#020617] relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#C6A96B]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">

          {/* Live badge + period */}
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#C6A96B]/10 border border-[#C6A96B]/30 text-[#D9BC82] text-xs font-bold uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D9BC82] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D9BC82]" />
              </span>
              กาลชะตาเรียลไทม์
            </div>
            <span className={`border font-bold text-xs px-3 py-1.5 rounded-full ${isDaytime ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"}`}>
              {isDaytime ? "☀️ กลางวัน" : "🌙 กลางคืน"}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Clock + Yam */}
            <div>
              <p className="text-xs text-[#8A8070] uppercase tracking-widest mb-2 font-bold">เวลาปัจจุบัน (กรุงเทพฯ)</p>
              <p className="text-5xl sm:text-6xl font-display font-black text-[#F8F6F1] leading-none tracking-tight tabular-nums mb-4">
                {formatTime(time)}
              </p>
              <div className="flex items-center gap-3">
                <div className="bg-[#020617] border border-white/5 rounded-xl px-4 py-3 flex-1">
                  <p className="text-xs text-[#8A8070] mb-1 font-medium">ยามใหญ่ (ตนุ)</p>
                  <p className="text-base font-bold text-[#F8F6F1]">{activeResult.yamYaiName}</p>
                </div>
                <div className="bg-[#0B1E36] border border-sky-500/20 rounded-xl px-4 py-3 flex-1">
                  <p className="text-xs text-sky-400 mb-1 font-medium">ยามซอย (อัตตะ)</p>
                  <p className="text-base font-bold text-sky-300">{activeResult.yamSoyName}</p>
                </div>
              </div>
            </div>

            {/* Yam Description */}
            <div className="bg-[#020617] border border-[#d97706]/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(217,119,6,0.08)]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[#d97706] font-bold uppercase tracking-wider">ยามกาลชะตาขณะนี้</p>
                <span className="bg-[#0A1628] border border-white/5 text-[#F8F6F1] text-xs px-3 py-1 rounded-full font-bold">
                  ยามที่ {yamSeq}
                </span>
              </div>
              <h3 className="font-display text-2xl font-bold text-[#d97706] mb-1">{activeResult.yamYaiName}</h3>
              <p className="text-sm text-[#d97706]/70 mb-3">{yamDesc.subtitle}</p>
              <p className="text-sm text-[#D9CDB7] leading-relaxed">{yamDesc.desc}</p>
              <p className="text-xs text-[#8A8070] mt-3 italic border-t border-white/5 pt-3">"{yamOmen}"</p>
            </div>
          </div>

          {/* Score Bars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/5">
            {[
              { label: "การค้า/เจรจา",    score: tradeScore,  color: "text-[#C6A96B]",   bar: "bg-[#C6A96B]",   icon: "💼" },
              { label: "ความรัก/เมตตา",   score: loveScore,   color: "text-pink-400",    bar: "bg-pink-400",    icon: "💖" },
              { label: "โชคลาภ/ทรัพย์",   score: wealthScore, color: "text-emerald-400", bar: "bg-emerald-400", icon: "💎" },
              { label: "การเตือนภัย",      score: dangerScore, color: dangerScore >= 50 ? "text-rose-400" : dangerScore >= 30 ? "text-amber-400" : "text-[#8A8070]", bar: dangerScore >= 50 ? "bg-rose-400" : dangerScore >= 30 ? "bg-amber-400" : "bg-[#8A8070]", icon: "⚠️" },
            ].map(item => (
              <div key={item.label} className="bg-[#020617] border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2">
                <span className="text-base">{item.icon}</span>
                <span className="text-xs text-[#8A8070] font-bold text-center leading-snug">{item.label}</span>
                <span className={`text-3xl font-display font-bold ${item.color}`}>{item.score}%</span>
                <div className={`w-full h-1 rounded-full ${item.bar} opacity-50`} />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── เลือกหมวดคำถาม + คำถามแนะนำ ── */}
      <Card className="p-6 sm:p-8 border-[#C6A96B]/20 bg-[#0A1628]">
        <h3 className="text-base font-bold text-[#F8F6F1] mb-5 flex items-center gap-2">
          🎯 เลือกเรื่องที่ต้องการถาม
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                selectedCategory === cat.id
                  ? "bg-[#0B1E36] border-sky-500/50 shadow-[0_0_12px_rgba(14,165,233,0.12)]"
                  : "bg-[#020617] border-white/5 hover:border-white/15"
              }`}
            >
              <span className="text-xl">{cat.icon}</span>
              <span className={`text-xs font-bold text-center leading-tight ${selectedCategory === cat.id ? "text-sky-400" : "text-[#8A8070]"}`}>
                {cat.label.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>

        <div className="bg-[#020617] border border-white/5 rounded-2xl p-5">
          <p className="text-xs font-bold text-[#C6A96B] mb-4">💡 คำถามแนะนำ — {activeCategory?.label}</p>
          <div className="space-y-3">
            {activeCategory?.questions.map((q, i) => (
              <button key={i} onClick={() => handleAutoSend(q)} className="w-full flex gap-3 text-left group">
                <span className="text-[#C6A96B] text-sm leading-none mt-0.5 opacity-60 group-hover:opacity-100 shrink-0">✦</span>
                <p className="text-sm text-[#D9CDB7] opacity-70 group-hover:opacity-100 leading-relaxed transition-opacity">{q}</p>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Wisdom Guidance Chat ── */}
      <Card className="border-[#C6A96B]/20 bg-[#0A1628] overflow-hidden p-0">
        <div className="p-4 sm:p-5 flex items-center gap-3 border-b border-white/5 bg-[#020617]/40">
          <div className="w-2.5 h-2.5 rounded-full bg-[#C6A96B] shrink-0 shadow-[0_0_8px_rgba(198,169,107,0.6)] animate-pulse" />
          <div>
            <h3 className="text-sm font-bold text-[#F8F6F1] tracking-wider">WISDOM GUIDANCE</h3>
            <p className="text-xs text-[#8A8070]">หมวด: <span className="font-bold text-[#C6A96B]">{activeCategory?.label}</span></p>
          </div>
          <button onClick={() => setChatMessages([])} className="ml-auto px-3 py-1.5 text-xs border border-white/10 text-[#8A8070] hover:text-[#F8F6F1] hover:border-white/20 rounded-lg transition-colors">
            ล้างแชท
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5 space-y-4" style={{height: '320px'}}>
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
              {msg.sender === "ai" && (
                <span className="text-xs text-[#C6A96B] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>✦</span> WISDOM GUIDANCE
                </span>
              )}
              <div className={`max-w-[88%] p-4 rounded-2xl text-sm leading-relaxed ${
                msg.sender === "user"
                  ? "bg-[#0A1628] text-[#F8F6F1] border border-white/10 font-medium rounded-tr-none"
                  : "bg-[#020617] text-[#D9CDB7] border border-white/10 rounded-tl-none"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 sm:p-5 border-t border-white/5 bg-[#020617]/40">
          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              type="text"
              autoComplete="off"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              placeholder="พิมพ์คำถามของท่าน..."
              className="flex-1 bg-[#0A1628] border border-white/5 rounded-xl px-4 py-3 text-sm text-[#F8F6F1] outline-none focus:border-[#C6A96B]/50 transition-colors placeholder:text-[#8A8070]/50"
            />
            <Button type="submit" disabled={!userInput.trim()} className="px-5 py-3 shrink-0 rounded-xl bg-[#8A8070] text-[#020617] font-bold hover:bg-[#C6A96B] transition-colors text-sm">
              ส่ง
            </Button>
          </form>
        </div>
      </Card>

      {/* ── บทวิเคราะห์ยามกาลชะตา ── */}
      <Card className="border-[#C6A96B]/30 bg-[#0A1628] p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#C6A96B]/5 via-transparent to-[#4B6FAE]/5 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xl">📋</span>
            <div>
              <h3 className="text-base font-bold text-[#C6A96B]">บทวิเคราะห์ยามกาลชะตา</h3>
              <p className="text-xs text-[#8A8070] mt-0.5">สรุปรายงานส่วนบุคคล</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* ซ้าย */}
            <div className="space-y-4">
              <div className="bg-[#020617] border border-[#C6A96B]/20 rounded-2xl p-5">
                <p className="text-xs text-[#C6A96B] font-bold uppercase tracking-widest mb-3">วัน/เวลา</p>
                <p className="font-display text-base font-bold text-[#F8F6F1] leading-relaxed">
                  {time.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <p className="text-sm text-[#8A8070] mt-1">
                  วัน{time.toLocaleDateString("th-TH", { weekday: "long" }).replace("วัน", "")}
                  {activeLunar && (
                    <span className={`ml-1.5 font-bold ${activeLunar.isWaxing ? "text-[#C6A96B]" : "text-sky-400"}`}>
                      {activeLunar.moonPhaseText}
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                  <div>
                    <p className="text-xs text-[#8A8070]">เวลา</p>
                    <p className="text-lg font-display font-bold text-[#F8F6F1]">{time.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })} น.</p>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div>
                    <p className="text-xs text-[#8A8070]">ลัคนายาม</p>
                    <p className="text-sm font-bold text-[#F8F6F1]">{soySlot} <span className="text-[#C6A96B]">{lagnamPos}</span></p>
                  </div>
                </div>
              </div>

              <div className="bg-[#020617] border border-white/5 rounded-2xl p-5">
                <p className="text-xs text-[#C6A96B] font-bold uppercase tracking-widest mb-3">ยาม</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0A1628] rounded-xl p-3">
                    <p className="text-xs text-[#8A8070] mb-1">ยามใหญ่ (ตนุ)</p>
                    <p className="text-sm font-bold text-[#F8F6F1]">{yaiN} {activeResult.yamYaiName}</p>
                  </div>
                  <div className="bg-[#0B1E36] rounded-xl p-3 border border-sky-500/20">
                    <p className="text-xs text-sky-400 mb-1">ยามซอย (อัตตะ)</p>
                    <p className="text-sm font-bold text-sky-300">{soyN} {activeResult.yamSoyName}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ขวา */}
            <div className="space-y-4">
              <div className="bg-[#020617] border border-[#d97706]/20 rounded-2xl p-5">
                <p className="text-xs text-[#d97706] font-bold uppercase tracking-widest mb-3">คำพยากรณ์ยามนี้</p>
                <p className="text-sm text-[#F8F6F1] leading-relaxed font-medium italic">"{yamOmen}"</p>
                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-sm text-[#8A8070] leading-relaxed">{yamDesc.desc}</p>
                </div>
              </div>

              <div className="bg-[#020617] border border-white/5 rounded-2xl p-5">
                <p className="text-xs text-[#C6A96B] font-bold uppercase tracking-widest mb-3">ทักษาจร — ยามใหญ่ {activeResult.yamYaiName}</p>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    {q:"ศรี",      color:"bg-emerald-500/20 text-emerald-400 border-emerald-500/30"},
                    {q:"มนตรี",    color:"bg-blue-500/20 text-blue-400 border-blue-500/30"},
                    {q:"มูละ",     color:"bg-amber-500/20 text-amber-400 border-amber-500/30"},
                    {q:"อุตสาหะ", color:"bg-teal-500/20 text-teal-400 border-teal-500/30"},
                    {q:"เดช",      color:"bg-orange-500/20 text-orange-400 border-orange-500/30"},
                    {q:"บริวาร",   color:"bg-indigo-500/20 text-indigo-300 border-indigo-500/30"},
                    {q:"อายุ",     color:"bg-white/5 text-[#8A8070] border-white/10"},
                    {q:"กาลกิณี", color:"bg-rose-950/40 text-rose-400 border-rose-500/30"},
                  ] as const).map(item => {
                    const starNum = taksaYamMap[item.q];
                    const starName = STAR_NAMES[starNum as keyof typeof STAR_NAMES] ?? "";
                    return (
                      <div key={item.q} className={`rounded-xl px-1.5 py-2 border text-center flex flex-col items-center gap-0.5 ${item.color}`}>
                        <p className="text-xs font-bold leading-tight opacity-80">{item.q}</p>
                        {starNum ? (
                          <>
                            <p className="text-lg font-display font-black leading-none">{starNum}</p>
                            <p className="text-xs leading-tight opacity-60">{starName}</p>
                          </>
                        ) : (
                          <p className="text-sm opacity-40">—</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-[#8A8070] mt-3">ศรี = โชคดี • กาลกิณี = ระวัง • ดาว {yaiN} = บริวาร</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── ผังดวงกาลชะตา 9 ฐาน ── */}
      <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-6 sm:p-8 relative">
        <div className="flex items-start gap-3 mb-6">
          <span className="text-2xl shrink-0">☸️</span>
          <div>
            <h3 className="text-base font-bold text-[#F8F6F1]">ผังดวงกาลชะตา 9 ฐาน</h3>
            <p className="text-xs text-[#8A8070] mt-1">แตะตัวเลขเพื่อดูความเชื่อมโยง</p>
            <p className="text-xs text-[#C6A96B]/60 mt-0.5 md:hidden">← เลื่อนซ้าย-ขวาเพื่อดูผังเต็ม →</p>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 sm:mx-0 px-6 sm:px-0">
          <div className="min-w-[580px] flex flex-col gap-5 items-center pb-4">
            {[0, 1, 2].map(rIdx => (
              <div key={rIdx} className="flex items-center w-full max-w-3xl">
                <div className="w-16 text-xs font-bold text-[#F8F6F1]">ฐาน {rIdx + 1 === 1 ? '๑' : rIdx + 1 === 2 ? '๒' : '๓'}</div>
                <div className="flex-1 flex justify-between">
                  {activeResult.chart[rIdx].map((star: number, cIdx: number) => (
                    <button key={cIdx} type="button" onClick={() => setHoverNum(hoverNum === star ? null : star)} className="flex flex-col items-center gap-1.5 w-14 focus:outline-none">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-display font-bold transition-all duration-300 cursor-pointer ${
                        hoverNum === star ? "bg-[#C6A96B] text-[#020617] scale-110 shadow-[0_0_15px_rgba(198,169,107,0.6)] border border-[#C6A96B]" : "bg-[#020617] border border-[#8A8070]/50 text-[#F8F6F1] hover:border-[#C6A96B]/50 hover:scale-105"
                      }`}>{star}</div>
                      <span className="text-xs text-[#8A8070] font-medium text-center leading-tight">{getBhopName(rIdx, cIdx)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex items-center w-full max-w-3xl bg-[#0B1E36]/30 border border-sky-500/10 py-3 px-2 rounded-2xl my-1">
              <div className="w-16 text-xs font-bold text-sky-400 pl-1">
                <div>ฐาน ๔</div>
                <div className="text-xs text-sky-400/60 leading-tight">เทวดา</div>
              </div>
              <div className="flex-1 flex justify-between pr-2">
                {activeResult.chart[3].map((star: number, cIdx: number) => {
                  const base3Star: number = activeResult.chart[2]?.[cIdx] ?? 0;
                  const isBase4Lit = hoverNum !== null && base3Star === hoverNum;
                  return (
                    <button key={cIdx} type="button" onClick={() => setHoverNum(hoverNum === base3Star ? null : base3Star)} className="flex flex-col items-center gap-1.5 w-14 focus:outline-none">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-display font-bold transition-all duration-300 cursor-pointer ${
                        isBase4Lit ? "bg-[#4B6FAE] text-[#F8F6F1] scale-110 shadow-[0_0_15px_rgba(75,111,174,0.7)] border border-[#4B6FAE]" : "bg-[#020617] border border-sky-500/50 text-[#F8F6F1] hover:border-[#C6A96B]/50 hover:scale-105"
                      }`}>{star}</div>
                      <span className={`text-xs font-medium text-center leading-tight ${isBase4Lit ? "text-sky-300" : "text-sky-400/80"}`}>{BASE4_POWER_NAMES[star] || ""}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {[4, 5, 6, 7, 8].map(rIdx => (
              <div key={rIdx} className="flex items-center w-full max-w-3xl">
                <div className="w-16 text-xs font-bold text-[#F8F6F1]">ฐาน {rIdx + 1 === 5 ? '๕' : rIdx + 1 === 6 ? '๖' : rIdx + 1 === 7 ? '๗' : rIdx + 1 === 8 ? '๘' : '๙'}</div>
                <div className="flex-1 flex justify-between">
                  {activeResult.chart[rIdx].map((star: number, cIdx: number) => (
                    <button key={cIdx} type="button" onClick={() => setHoverNum(hoverNum === star ? null : star)} className="flex flex-col items-center gap-1.5 w-14 focus:outline-none">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-display font-bold transition-all duration-300 cursor-pointer ${
                        hoverNum === star ? "bg-[#C6A96B] text-[#020617] scale-110 shadow-[0_0_15px_rgba(198,169,107,0.6)] border border-[#C6A96B]" : "bg-[#020617] border border-[#8A8070]/50 text-[#F8F6F1] hover:border-[#C6A96B]/50 hover:scale-105"
                      }`}>{star}</div>
                      {rIdx === 7 && <span className="text-xs text-[#8A8070] font-medium text-center leading-tight">{["อาตมะ","ทาสา","สิทธิ","โภคทรัพย์","โจร","อุบาทว์","อุปถัมภ์"][cIdx]}</span>}
                      {rIdx === 8 && <span className="text-xs text-[#8A8070] font-medium text-center leading-tight">{["อัตตะ","สักกะ","ญาติ","ธนัง","เคหัง","นาวัง","ภริยัง"][cIdx]}</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* วิธีอ่าน */}
            <div className="w-full max-w-3xl bg-[#020617] border border-[#C6A96B]/20 rounded-2xl p-5 mt-2">
              <p className="text-xs font-bold text-[#C6A96B] mb-3 flex items-center gap-2">✦ วิธีอ่านรหัสชีวิต 3 Steps — Star Tracing</p>
              <p className="text-xs text-rose-400/80 font-bold mb-4">⚑ ห้ามอ่านแนวดิ่ง — ใช้ "เลขดาว" เชื่อมโยง ฐาน 1 → 2 → 3</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {step:"1", title:"ตั้งโจทย์", color:"text-[#C6A96B]", bg:"bg-[#C6A96B]/20", desc:"เลือกภพเรือนในฐาน 1 ที่ต้องการทราบ แล้วดูว่าคือเลขดาวอะไร — กดเพื่อเริ่มติดตาม"},
                  {step:"2", title:"ตามรอยดาว", color:"text-sky-400", bg:"bg-sky-500/20", desc:"นำเลขดาวนั้นไปหาตำแหน่งในฐาน 2 แล้วตามต่อสู่ฐาน 3 ว่าตกในภพใด (ย้าย Column ได้)"},
                  {step:"3", title:"กำลังเทวดา", color:"text-[#4B6FAE]", bg:"bg-[#4B6FAE]/30", desc:"ดูดาวในฐาน 3 ตกที่ Column ไหน → อ่านฐาน 4 ใน Column เดียวกัน เพื่อตัดสินคุณภาพ"},
                ].map(s => (
                  <div key={s.step} className="bg-[#0A1628] rounded-xl p-4 border border-white/5">
                    <p className={`text-xs font-bold ${s.color} mb-2 flex items-center gap-1.5`}>
                      <span className={`w-5 h-5 rounded-full ${s.bg} flex items-center justify-center text-xs font-black shrink-0`}>{s.step}</span>
                      {s.title}
                    </p>
                    <p className="text-xs text-[#8A8070] leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
              {hoverNum !== null && (
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                  <span className="text-[#C6A96B] text-xs">✦</span>
                  <p className="text-xs text-[#F8F6F1]">ตามรอยดาว <span className="font-bold text-[#C6A96B]">{hoverNum}</span> — ดูตำแหน่งที่ไฮไลต์ใน ฐาน 2, 3 และอ่านกำลังเทวดา <span className="text-sky-300">ฐาน 4</span></p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── ผังทิศทักษาจรแปดทิศ ── */}
      <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-6 sm:p-8">
        <div className="flex items-start gap-3 mb-6 border-b border-white/5 pb-5">
          <span className="text-2xl shrink-0">🧭</span>
          <div>
            <h3 className="text-base font-bold text-[#F8F6F1]">ผังทิศทักษาจรแปดทิศ</h3>
            <p className="text-xs text-[#8A8070] mt-1">ทิศทางที่เป็นคุณ/เป็นภัยในนาทีนี้ • แตะการ์ดเพื่อเลือก</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto">
          {TAKSA_DIRECTIONS.map((dir) => {
            let kalaLabel = "", kalaBg = "", birthLabel = "", birthBg = "bg-[#0A1628] border-white/5 text-[#8A8070]";
            const isCenter = dir.id === 9;
            if (dir.id === 3) { kalaLabel = "อายุ"; kalaBg = "bg-[#0A1628] border-white/5 text-[#F8F6F1]"; birthLabel = "มนตรี"; }
            else if (dir.id === 1) { kalaLabel = "กาลกิณี"; kalaBg = "bg-rose-950/20 border-rose-500/20 text-rose-400"; birthLabel = "มูละ"; }
            else if (dir.id === 2) { kalaLabel = "บริวาร"; kalaBg = "bg-[#0A1628] border-white/5 text-[#F8F6F1]"; birthLabel = "อุตสาหะ"; }
            else if (dir.id === 6) { kalaLabel = "มนตรี"; kalaBg = "bg-[#0A1628] border-white/5 text-[#F8F6F1]"; birthLabel = "ศรี"; birthBg = "bg-emerald-950/20 border-emerald-500/20 text-emerald-400"; }
            else if (dir.id === 4) { kalaLabel = "เดช"; kalaBg = "bg-[#0A1628] border-white/5 text-[#F8F6F1]"; birthLabel = "กาลกิณี"; birthBg = "bg-rose-950/20 border-rose-500/20 text-rose-400"; }
            else if (dir.id === 8) { kalaLabel = "อุตสาหะ"; kalaBg = "bg-[#0A1628] border-white/5 text-[#F8F6F1]"; birthLabel = "เดช"; }
            else if (dir.id === 5) { kalaLabel = "มูละ"; kalaBg = "bg-[#0A1628] border-white/5 text-[#F8F6F1]"; birthLabel = "อายุ"; }
            else if (dir.id === 7) { kalaLabel = "ศรี"; kalaBg = "bg-emerald-950/20 border-emerald-500/20 text-emerald-400"; birthLabel = "บริวาร"; }
            return (
              <button key={dir.id} onClick={() => setHoverNum(hoverNum === dir.id ? null : dir.id)}
                className={`p-3 sm:p-4 rounded-2xl border flex flex-col items-center text-center transition-all ${hoverNum === dir.id ? "bg-[#C6A96B]/10 border-[#C6A96B] shadow-[0_0_20px_rgba(198,169,107,0.15)] scale-[1.02]" : "bg-[#020617] border-white/5 hover:border-white/10"}`}
              >
                <p className="text-xs text-[#8A8070] font-bold mb-1 leading-tight">{dir.name}</p>
                <p className="text-xs font-bold text-[#F8F6F1] mb-1">ดาว {dir.star}</p>
                <p className="text-2xl font-display font-bold text-[#C6A96B] mb-2">({dir.id === 9 ? '๙' : dir.id})</p>
                <div className="w-full space-y-1 mt-auto">
                  {isCenter ? (
                    <div className="px-2 py-1 rounded-lg border border-[#C6A96B]/30 text-[#C6A96B] text-xs font-bold w-full">วิญญาณธาตุ</div>
                  ) : (
                    <>
                      <div className={`px-2 py-1 rounded-lg border text-xs font-bold w-full ${kalaBg}`}>กาล: {kalaLabel}</div>
                      <div className={`px-2 py-1 rounded-lg border text-xs font-bold w-full ${birthBg}`}>กำเนิด: {birthLabel}</div>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ── ทักษา & มหาภูติจรส่วนบุคคล ── */}
      <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-6 sm:p-8">
        <div className="flex items-start gap-3 mb-6">
          <span className="text-2xl shrink-0">👤</span>
          <div>
            <h3 className="text-base font-bold text-[#F8F6F1]">ทักษา & มหาภูติจรส่วนบุคคล</h3>
            <p className="text-xs text-[#8A8070] mt-1">ดึงค่าจากวันเกิดในโปรไฟล์ เพื่อเปรียบเทียบหาจุดทับซ้อน</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#020617] rounded-2xl p-5 border border-white/5">
            <p className="text-sm font-bold text-[#F8F6F1] mb-4 flex items-center gap-2">🎯 ทักษาจรประจำปี</p>
            <div className="space-y-2">
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
                    <button key={n} onClick={() => setHoverNum(hoverNum === n ? null : n)}
                      className={`w-full flex justify-between items-center text-sm p-2 rounded-xl transition-all ${hoverNum === n ? 'bg-white/10 ring-1 ring-[#C6A96B]' : 'hover:bg-white/5'}`}
                    >
                      <span className="text-[#F8F6F1] font-medium">ดาว {name} ({n})</span>
                      <span className={`px-2.5 py-1 rounded text-xs font-bold ${bg}`}>{bhop as string}</span>
                    </button>
                  );
                })
              ) : (
                <p className="text-[#8A8070] text-sm text-center py-4 border border-dashed border-white/10 rounded-xl">กรุณาระบุวันเกิดในหน้าโปรไฟล์</p>
              )}
            </div>
          </div>
          <div className="bg-[#020617] rounded-2xl p-5 border border-white/5">
            <p className="text-sm font-bold text-[#F8F6F1] mb-4 flex items-center gap-2">🧠 มหาภูติจร (สภาวะจิตใจ)</p>
            <div className="space-y-2">
              {activePhopephum?.mahaTransit?.map ? (
                Object.entries(activePhopephum.mahaTransit.map).map(([bhop, starStr]) => {
                  const n = Number(starStr);
                  const name = STAR_NAMES[n as keyof typeof STAR_NAMES];
                  return (
                    <button key={bhop} onClick={() => setHoverNum(hoverNum === n ? null : n)}
                      className={`w-full flex justify-between items-center text-sm py-2 px-2 rounded-xl transition-all ${hoverNum === n ? 'bg-white/10 ring-1 ring-[#C6A96B]' : 'hover:bg-white/5'}`}
                    >
                      <span className="text-[#8A8070] font-medium">{bhop}</span>
                      <span className="text-[#F8F6F1] font-bold">ดาว {name} ({n})</span>
                    </button>
                  );
                })
              ) : (
                <p className="text-[#8A8070] text-sm text-center py-4 border border-dashed border-white/10 rounded-xl">กรุณาระบุวันเกิดในหน้าโปรไฟล์</p>
              )}
            </div>
          </div>
        </div>
      </Card>

    </div>
  );
}
