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
import { useState, useEffect, useRef, useMemo } from "react";

export const meta: MetaFunction = () => [
  { title: "ทำนายกาลชะตา V2.0 — PhopePhum" },
  { name: "description", content: "วิเคราะห์รหัสชะตาชีวิตระดับวินาทีด้วย 7 ตัว 9 ฐาน ผสมผสานระบบ Q&A แชทอัจฉริยะแบบเรียลไทม์" },
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

// ชื่อภพฐาน 1-3
const BHOP_NATAL_NAMES = [
  ["อัตตะ", "หินะ", "ธนัง", "ปิตา", "มาตา", "โภคา", "มัชฌิมา"],
  ["ตนุ", "กฎุมภะ", "สหัชชะ", "พันธุ", "ปุตตะ", "อริ", "ปัตนิ"],
  ["มรณะ", "ศุภะ", "กัมมะ", "ลาภะ", "พยายะ", "ทาสา", "ทาสี"]
];

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

const PLANET_COLORS_BY_NUM: Record<number, string> = {
  1: '#EF4444', 2: '#FBBF24', 3: '#F97316', 4: '#10B981', 5: '#F59E0B', 6: '#EC4899', 7: '#8B5CF6',
};

const CHALDEAN_SEQ = [7, 5, 3, 1, 6, 4, 2] as const;

const TAKSA_PLAN_ADVICE: Record<string, { emoji: string; th: string; level: 0|1|2|3 }> = {
  "บริวาร":   { emoji: "👥", th: "ประชุม บริหารทีม รับสั่งการ",            level: 2 },
  "อายุ":     { emoji: "🧘", th: "ดูแลสุขภาพ พักฟื้น ออกกำลังกาย",        level: 2 },
  "เดช":      { emoji: "⚡", th: "ตัดสินใจ เจรจาดีล ปิดสัญญา",            level: 3 },
  "ศรี":      { emoji: "💰", th: "ลงทุน ทำธุรกรรม รับโชคลาภ",             level: 3 },
  "มูละ":     { emoji: "🌱", th: "วางรากฐาน ริเริ่มโครงการระยะยาว",       level: 3 },
  "อุตสาหะ":  { emoji: "💪", th: "ทำงานหนัก ขยัน ทุ่มเทความพยายาม",       level: 2 },
  "มนตรี":    { emoji: "🤝", th: "ใช้เส้นสาย หาพันธมิตร เจรจาชั้นสูง",   level: 3 },
  "กาลกิณี":  { emoji: "⚠️", th: "ระวัง! หลีกเลี่ยงการตัดสินใจสำคัญ",    level: 0 },
};

const YAM_DESC: Record<number, {subtitle:string; desc:string}> = {
  1: {subtitle:"อำนาจ/ผู้นำ", desc:"ช่วงเวลาแห่งอำนาจบารมี เหมาะสำหรับการเป็นผู้นำ ตัดสินใจเด็ดขาด เจรจากับผู้ใหญ่หรือผู้มีอำนาจ"},
  2: {subtitle:"ความรู้สึก/ครอบครัว", desc:"ช่วงเวลาแห่งความรู้สึก เหมาะสำหรับการดูแลครอบครัว สร้างความสัมพันธ์ เจรจาด้วยความอ่อนโยน"},
  3: {subtitle:"พลังงาน/ความกล้า", desc:"ช่วงเวลาแห่งพลังงาน เหมาะสำหรับงานที่ต้องใช้กำลังและความกล้าหาญ ระวังอารมณ์ร้อนและการทะเลาะวิวาท"},
  4: {subtitle:"สติปัญญา/การสื่อสาร", desc:"ช่วงเวลาแห่งสติปัญญา เหมาะสำหรับการเรียนรู้ เจรจาต่อรอง และงานด้านการสื่อสาร"},
  5: {subtitle:"ปัญญา/โชคลาภ", desc:"ช่วงเวลาแห่งปัญญาและโชคลาภ เหมาะสำหรับการขอพร ขยายกิจการ ลงทุน และสร้างความมั่งคั่งระยะยาว"},
  6: {subtitle:"ความรัก/ศิลปะ", desc:"ช่วงเวลาแห่งความรักและศิลปะ เหมาะสำหรับการสารภาพรัก สร้างมิตรภาพ และความงาม"},
  7: {subtitle:"ความมั่นคง/อดทน", desc:"ช่วงเวลาแห่งความมั่นคง เหมาะสำหรับงานระยะยาว วางรากฐาน ปฏิบัติงานที่ต้องการความอดทน"},
};

const YAM_OMEN: Record<number, string> = {
  1: "อาทิตย์อวสาน ยาตราทำการ มิตีหนักหนา ได้เมื่อช่างทอง จำลองพระสิทธา แค้นเคืองหนักหนา มยุรากลืนแหวน",
  2: "จันทร์สาดแสงฉาย เมตตาอภัย สมบัติงามดี มีมิตรสหาย กายใจสบาย พ้นภัยพิบัติ ประกาศเกียรติยศ",
  3: "อังคารเดินทาง ระวางอันตราย อย่าไปทิศตะวันออก โลหกิจเจริญ เผ็ดร้อนเกริ่นกราย ชนะศัตรูได้",
  4: "พุธทรงปรีชา วาจาว่องไว พ่อค้าโชคดี มีกำไรงาม เจรจาสำเร็จ เลิศทางสติปัญญา ค้าขายวันนี้",
  5: "พฤหัสบดีโชค ปลดโศกทุกข์พ้น ทรัพย์สมบัติล้น ผลบุญส่งเสริม เพิ่มพูนความเจริญ เกริ่นชื่อเสียงดี",
  6: "ศุกร์งามพริ้งเพรา เสน่ห์เพริดแพร้ว รักหวานชื่นชม สมหวังทุกสิ่ง ยิ่งเมตตาดี มีสุขสมบูรณ์",
  7: "เสาร์หนักขวาง ระวางสิ่งร้าย อย่างระวังภัย ใจอดทนดี มีความมั่นคง คงชนะอุปสรรค พรากจากเสนียด",
};

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
  const [selectedYamKey, setSelectedYamKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"daily" | "hourly" | "minute">("hourly");

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      if (timeMode === "live") {
        const form = new FormData();
        form.append("timeMode", "live");
        submit(form, { method: "post", replace: true });
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [timeMode, submit]);

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  // ── Derived values ──
  const bkkHour = (time.getUTCHours() + 7) % 24;
  const isDaytime = bkkHour >= 6 && bkkHour < 18;
  const yamSeq = Math.floor(((bkkHour - 6 + 24) % 24) / 1.5) % 8 + 1;
  const yaiN = activeResult.yamYaiNumber || activeResult.dayStarNumber || 1;
  const soyN = activeResult.yamSoyNumber || activeResult.dayStarNumber || 1;

  const tradeScore = 75; // simplified mock scores
  const loveScore = 80;
  const wealthScore = 65;
  const dangerScore = 15;

  const _SEQ = [6, 1, 2, 3, 4, 7, 5, 8] as const;
  const _BHOP = ["บริวาร", "อายุ", "เดช", "ศรี", "มูละ", "อุตสาหะ", "มนตรี", "กาลกิณี"] as const;
  const _si = _SEQ.indexOf(yaiN as any);
  const taksaYamMap: Record<string, number> = {};
  if (_si !== -1) { for (let i = 0; i < 8; i++) { taksaYamMap[_BHOP[i]] = _SEQ[(_si + i) % 8]; } }

  const dayYamTable = useMemo(() => {
    const dayStarN = (activeResult.dayStarNumber ?? 1) as number;
    const chaldIdx = CHALDEAN_SEQ.indexOf(dayStarN as any);
    const dayStarPos8 = _SEQ.indexOf(dayStarN as any);
    return Array.from({ length: 16 }, (_, i) => {
      const cIdx = chaldIdx !== -1 ? (chaldIdx + i) % 7 : i % 7;
      const star = CHALDEAN_SEQ[cIdx];
      const isDay = i < 8;
      const slot = i % 8;
      const hf = (isDay ? 6 : 18) + slot * 1.5;
      const ef = hf + 1.5;
      const fmt = (h: number, m: number) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const timeStr = `${fmt(hf, hf % 1 ? 30 : 0)}–${fmt(ef, ef % 1 ? 30 : 0)}`;
      const yamStarPos8 = _SEQ.indexOf(star as any);
      const qualIdx = dayStarPos8 !== -1 && yamStarPos8 !== -1 ? (yamStarPos8 - dayStarPos8 + 8) % 8 : -1;
      const quality = qualIdx !== -1 ? (_BHOP[qualIdx] ?? '') : '';
      const chart0 = (activeResult.chart[0] ?? []) as number[];
      const b1Col = chart0.indexOf(star);
      const b1Bhop = b1Col !== -1 ? (BHOP_NATAL_NAMES[0]?.[b1Col] ?? '') : '';
      const bkkH = (time.getUTCHours() + 7) % 24;
      const totalMin = bkkH * 60 + time.getUTCMinutes();
      const slotStartMin = (isDay ? 6 : 18) * 60 + slot * 90;
      const isCurrentYam = totalMin >= slotStartMin && totalMin < slotStartMin + 90;
      return { yamNum: slot + 1, isDay, star, timeStr, quality, qualIdx, b1Bhop, b1Col, isCurrentYam };
    });
  }, [activeResult, time]);

  const THAI_NUMS = ['๑','๒','๓','๔','๕','๖','๗','๘','๙'] as const;
  const connectionItems = useMemo(() => {
    if (hoverNum === null) return [];
    const chart = activeResult.chart as number[][];
    const items: Array<{ rIdx: number; colIdx: number; bhopName: string; b4Power: string | null; baseThai: string }> = [];
    chart.forEach((row, rIdx) => {
      if (rIdx === 3) return;
      const colIdx = row.indexOf(hoverNum);
      if (colIdx === -1) return;
      let bhopName = '';
      if (rIdx < 3) bhopName = BHOP_NATAL_NAMES[rIdx]?.[colIdx] ?? '';
      else if (rIdx === 7) bhopName = BHOP_8_NAMES[colIdx] ?? '';
      else if (rIdx === 8) bhopName = BHOP_9_NAMES[colIdx] ?? '';
      const b4Power = rIdx === 2 ? (BASE4_POWER_NAMES[(chart[3]?.[colIdx] ?? 0)] ?? null) : null;
      items.push({ rIdx, colIdx, bhopName, b4Power, baseThai: THAI_NUMS[rIdx] ?? '' });
    });
    return items;
  }, [hoverNum, activeResult]);

  // Chat
  const [chatMessages, setChatMessages] = useState([{ sender: "ai", text: "สวัสดีครับ พร้อมวิเคราะห์จังหวะชีวิตเรียลไทม์แล้วครับ ท่านอยากตรวจสอบเรื่องใด?", time: "" }]);
  const [userInput, setUserInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), [chatMessages]);
  const doChatFetch = async (q: string) => {
    setChatMessages(prev => [...prev, { sender: "user", text: q, time: "" }, { sender: "ai", text: "กำลังเชื่อมต่อกระแสญาณ...", time: "" }]);
    setUserInput("");
    try {
      const formData = new FormData();
      formData.append("question", q);
      formData.append("category", CATEGORIES.find(c => c.id === selectedCategory)?.label || "ทั่วไป");
      formData.append("targetDate", time.toISOString());
      const res = await fetch("/api/karnchata-chat", { method: "POST", body: formData });
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
                try { const parsed = JSON.parse(raw); if (parsed.text) aiText += parsed.text; } catch(e){}
             }
          }
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
        newArr[newArr.length - 1] = { sender: "ai", text: "ขออภัยครับ กระแสญาณขัดข้องชั่วคราว", time: "" };
        return newArr;
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[#C6A96B] text-xs tracking-[0.25em] uppercase font-bold block mb-1">✦ คัมภีร์พยากรณ์ลับเฉพาะกาล</span>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#F8F6F1] mb-2">ทำนายกาลชะตา V2.0</h1>
          <p className="text-[#D9CDB7] text-sm leading-relaxed max-w-xl">วิเคราะห์รหัสชะตาชีวิตระดับวินาทีด้วย 7 ตัว 9 ฐาน ผสมผสานระบบ Q&amp;A แชทอัจฉริยะ</p>
        </div>
        <div className="bg-[#C6A96B]/8 border border-[#C6A96B]/20 px-5 py-3 rounded-2xl self-start shrink-0">
          <p className="text-xs text-[#C6A96B] uppercase font-bold">วันกาลชะตา</p>
          <p className="text-sm font-bold text-[#F8F6F1]">{thaiDateLabel}</p>
        </div>
      </div>

      {/* ── Control Bar ── */}
      <div className="bg-[#0A1628]/80 border border-white/5 rounded-2xl p-2 flex flex-col gap-2">
        <div className="flex bg-[#020617] rounded-xl p-1 border border-white/5">
          <button onClick={() => setTimeMode("live")} className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${timeMode === "live" ? "bg-[#1E1730] text-[#F8F6F1]" : "text-[#8A8070]"}`}>⏱ เรียลไทม์</button>
          <button onClick={() => setTimeMode("custom")} className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${timeMode === "custom" ? "bg-[#C6A96B] text-[#020617]" : "text-[#8A8070]"}`}>📅 เลือกวัน/เวลา</button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex bg-[#0A1628]/60 p-1.5 rounded-2xl border border-white/5 gap-1.5 sticky top-2 z-30 backdrop-blur-xl">
        {[
          { id: "daily", label: "รายวัน", icon: "📅" },
          { id: "hourly", label: "รายชั่วโมง", icon: "⏱" },
          { id: "minute", label: "รายนาที 3.45", icon: "🎯" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === tab.id ? "bg-[#C6A96B] text-[#020617]" : "text-[#8A8070] hover:text-[#F8F6F1]"}`}>
            <span>{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "hourly" && (
        <>
          <Card className="p-6 sm:p-8 border-[#C6A96B]/20 bg-[#020617] relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#C6A96B]/10 border border-[#C6A96B]/30 text-[#D9BC82] text-xs font-bold uppercase tracking-wider">กาลชะตาเรียลไทม์</div>
              <span className={`border font-bold text-xs px-3 py-1.5 rounded-full ${isDaytime ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"}`}>{isDaytime ? "☀️ กลางวัน" : "🌙 กลางคืน"}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-xs text-[#8A8070] uppercase font-bold">เวลาปัจจุบัน</p>
                <p className="text-5xl font-display font-black text-[#F8F6F1] leading-none mb-4">{formatTime(time)}</p>
                <div className="flex gap-3">
                  <div className="bg-[#020617] border border-white/5 rounded-xl px-4 py-3 flex-1"><p className="text-xs text-[#8A8070] mb-1">ยามใหญ่ (ตนุ)</p><p className="text-base font-bold text-[#F8F6F1]">{activeResult.yamYaiName}</p></div>
                  <div className="bg-[#0B1E36] border border-sky-500/20 rounded-xl px-4 py-3 flex-1"><p className="text-xs text-sky-400 mb-1">ยามซอย (อัตตะ)</p><p className="text-base font-bold text-sky-300">{activeResult.yamSoyName}</p></div>
                </div>
              </div>
              <div className="bg-[#020617] border border-[#d97706]/30 rounded-2xl p-5">
                <p className="text-xs text-[#d97706] font-bold uppercase tracking-wider">อิทธิพลขณะนี้ — ยามที่ {yamSeq}</p>
                <h3 className="font-display text-2xl font-bold text-[#d97706] mb-1">{activeResult.yamYaiName}</h3>
                <p className="text-sm text-[#D9CDB7] leading-relaxed">{(YAM_DESC[yaiN] || YAM_DESC[1]).desc}</p>
                <p className="text-xs text-[#8A8070] mt-3 italic border-t border-white/5 pt-3">"{YAM_OMEN[yaiN] || ""}"</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/5">
              {[{l:"การค้า", s:tradeScore, c:"text-[#C6A96B]"}, {l:"ความรัก", s:loveScore, c:"text-pink-400"}, {l:"โชคลาภ", s:wealthScore, c:"text-emerald-400"}, {l:"ภัย", s:dangerScore, c:"text-rose-400"}].map(it => (
                <div key={it.l} className="bg-[#020617] border border-white/5 rounded-2xl p-4 flex flex-col items-center">
                  <span className="text-xs text-[#8A8070] font-bold mb-1">{it.l}</span>
                  <span className={`text-2xl font-display font-bold ${it.c}`}>{it.s}%</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-[#4B6FAE]/30 bg-[#0A1628] p-6 sm:p-8">
            <h3 className="text-base font-bold text-[#F8F6F1] mb-5">ผังดวงกาลชะตา 9 ฐาน (รายชั่วโมง)</h3>
            <div className="overflow-x-auto"><div className="min-w-[340px] space-y-1.5">
              {[0,1,2,4,5,6,7,8].map(rIdx => {
                const hChart = (activeResult.hourlyChart ?? []) as number[][];
                const rLabel = rIdx < 3 ? `ฐาน ${THAI_NUMS[rIdx]}` : `ฐาน ${THAI_NUMS[rIdx < 7 ? rIdx-1 : rIdx-1]}`;
                return (
                  <div key={rIdx} className="flex items-stretch gap-2"><div className="w-12 shrink-0 flex items-center justify-end"><span className="text-[12px] font-black text-[#C6A96B]">{rLabel}</span></div><div className="flex-1 grid grid-cols-7 gap-1">{(hChart[rIdx] ?? []).map((s, cIdx) => {
                    const bhopName = rIdx < 3 ? BHOP_NATAL_NAMES[rIdx][cIdx] : rIdx === 7 ? BHOP_8_NAMES[cIdx] : rIdx === 8 ? BHOP_9_NAMES[cIdx] : "";
                    return (<div key={cIdx} className="rounded-xl py-2 flex flex-col items-center bg-[#020617] border border-white/5"><span className="text-base font-display font-black" style={{color: PLANET_COLORS_BY_NUM[s]}}>{s}</span><span className="text-[10px] text-[#8A8070] truncate w-full text-center">{bhopName}</span></div>);
                  })}</div></div>
                );
              })}
              <div className="flex items-center gap-2 py-1"><div className="flex-1 h-px bg-sky-500/20"/><span className="text-[11px] text-sky-400/60 font-bold px-1">กำลังเทวดา</span><div className="flex-1 h-px bg-sky-500/20"/></div>
              <div className="flex items-stretch gap-2 bg-[#0B1E36]/40 border border-sky-500/15 rounded-xl py-1 px-1"><div className="w-12 shrink-0 flex items-center justify-end"><span className="text-[12px] font-black text-sky-400">ฐาน๔</span></div><div className="flex-1 grid grid-cols-7 gap-1">{(activeResult.hourlyChart[3] ?? []).map((s, cIdx) => (<div key={cIdx} className="rounded-lg py-1.5 flex flex-col items-center bg-[#020617] border border-sky-500/20"><span className="text-sm font-black text-sky-300">{s}</span><span className="text-[9px] text-sky-400/70 truncate w-full px-1">{BASE4_POWER_NAMES[s]}</span></div>))}</div></div>
            </div></div>
          </Card>
        </>
      )}

      {activeTab === "daily" && (
        <>
          <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-6 sm:p-8">
            <h3 className="text-base font-bold text-[#F8F6F1] mb-5">ตารางกาลชะตารายวัน</h3>
            <div className="bg-[#020617] border border-[#C6A96B]/12 rounded-2xl p-4 mb-6"><div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">{_BHOP.map((bhop, idx) => {
              const s = _SEQ[(_SEQ.indexOf(activeResult.dayStarNumber as any) + idx + 8) % 8] as number;
              return (<div key={bhop} className="rounded-xl p-2 border border-white/5 text-center"><p className="text-[12px] font-bold text-[#8A8070]">{bhop}</p><p className="text-sm font-display font-black text-[#F8F6F1]">{s}</p></div>);
            })}</div></div>
            <div className="space-y-6">
              <div><p className="text-xs font-bold text-amber-400/80 mb-3">☀️ กลางวัน (06:00–18:00)</p><div className="space-y-1.5">{dayYamTable.filter(y => y.isDay).map(y => {
                const yamKey = `day-${y.yamNum}`; const isEx = selectedYamKey === yamKey;
                return (<div key={y.yamNum} className="flex flex-col"><button onClick={() => setSelectedYamKey(isEx ? null : yamKey)} className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs ${y.isCurrentYam ? 'bg-[#C6A96B]/10 border-[#C6A96B]/40' : 'bg-[#020617] border-white/5'}`}><span className="w-20 font-mono text-[#8A8070]">{y.timeStr}</span><span className={`w-16 font-bold ${y.isCurrentYam ? 'text-[#C6A96B]' : 'text-[#F8F6F1]'}`}>{STAR_NAMES[y.star as keyof typeof STAR_NAMES]}</span><span className="w-14 text-[#8A8070]">{y.quality}</span><span className="flex-1 text-[#8A8070] truncate text-left">{TAKSA_PLAN_ADVICE[y.quality]?.th}</span><span>{isEx ? "▲" : "▼"}</span></button>
                  {isEx && (<div className="px-4 py-3 bg-[#020617]/40 border-x border-b border-white/5 rounded-b-xl"><p className="text-xs text-[#C6A96B] font-bold">{y.quality} — {TAKSA_PLAN_ADVICE[y.quality]?.th}</p><p className="text-[11px] text-[#D9CDB7] leading-relaxed mt-1">{(YAM_DESC[y.star] || YAM_DESC[1]).desc}</p></div>)}
                </div>);
              })}</div></div>
              <div><p className="text-xs font-bold text-indigo-400/80 mb-3">🌙 กลางคืน (18:00–06:00)</p><div className="space-y-1.5">{dayYamTable.filter(y => !y.isDay).map(y => {
                const yamKey = `night-${y.yamNum}`; const isEx = selectedYamKey === yamKey;
                return (<div key={y.yamNum} className="flex flex-col"><button onClick={() => setSelectedYamKey(isEx ? null : yamKey)} className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs ${y.isCurrentYam ? 'bg-[#C6A96B]/10 border-[#C6A96B]/40' : 'bg-[#020617] border-white/5'}`}><span className="w-20 font-mono text-[#8A8070]">{y.timeStr}</span><span className={`w-16 font-bold ${y.isCurrentYam ? 'text-[#C6A96B]' : 'text-[#F8F6F1]'}`}>{STAR_NAMES[y.star as keyof typeof STAR_NAMES]}</span><span className="w-14 text-[#8A8070]">{y.quality}</span><span className="flex-1 text-[#8A8070] truncate text-left">{TAKSA_PLAN_ADVICE[y.quality]?.th}</span><span>{isEx ? "▲" : "▼"}</span></button>
                  {isEx && (<div className="px-4 py-3 bg-[#020617]/40 border-x border-b border-white/5 rounded-b-xl"><p className="text-xs text-[#C6A96B] font-bold">{y.quality} — {TAKSA_PLAN_ADVICE[y.quality]?.th}</p><p className="text-[11px] text-[#D9CDB7] leading-relaxed mt-1">{(YAM_DESC[y.star] || YAM_DESC[1]).desc}</p></div>)}
                </div>);
              })}</div></div>
            </div>
          </Card>
          <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-6 sm:p-8"><div className="flex items-start gap-3 mb-6"><span className="text-2xl">🧭</span><div><h3 className="text-base font-bold text-[#F8F6F1]">ผังทิศทักษาจรแปดทิศ</h3></div></div><div className="grid grid-cols-3 gap-2">{TAKSA_DIRECTIONS.map(dir => (<button key={dir.id} className="bg-[#020617] border border-white/5 rounded-xl p-3 flex flex-col items-center transition-all hover:bg-white/5"><p className="text-[11px] text-[#8A8070] font-bold">{dir.name}</p><p className="text-xl font-display font-bold text-[#C6A96B]">({dir.id === 9 ? '๙' : dir.id})</p></button>))}</div></Card>
          <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-6 sm:p-8"><div className="flex items-start gap-3 mb-6"><span className="text-2xl">👤</span><div><h3 className="text-base font-bold text-[#F8F6F1]">ทักษา & มหาภูติจรส่วนบุคคล</h3></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="bg-[#020617] rounded-2xl p-5 border border-white/5"><p className="text-sm font-bold text-[#F8F6F1] mb-3">🎯 ทักษาจรประจำปี</p>{activePhopephum?.taksaTransit?.map ? Object.entries(activePhopephum.taksaTransit.map).map(([s, b]) => (<div key={s} className="flex justify-between text-xs py-1 border-b border-white/5"><span className="text-[#8A8070]">{STAR_NAMES[Number(s) as keyof typeof STAR_NAMES]} ({s})</span><span className="text-[#F8F6F1] font-bold">{b as string}</span></div>)) : <p className="text-xs text-[#8A8070]">กรุณาระบุวันเกิด</p>}</div><div className="bg-[#020617] rounded-2xl p-5 border border-white/5"><p className="text-sm font-bold text-[#F8F6F1] mb-3">🧠 มหาภูติจร</p>{activePhopephum?.mahaTransit?.map ? Object.entries(activePhopephum.mahaTransit.map).map(([b, s]) => (<div key={b} className="flex justify-between text-xs py-1 border-b border-white/5"><span className="text-[#8A8070]">{b}</span><span className="text-[#F8F6F1] font-bold">{STAR_NAMES[Number(s) as keyof typeof STAR_NAMES]} ({s})</span></div>)) : <p className="text-xs text-[#8A8070]">กรุณาระบุวันเกิด</p>}</div></div></Card>
        </>
      )}

      {activeTab === "minute" && (
        <>
          <Card className="p-6 sm:p-8 border-sky-500/30 bg-gradient-to-br from-[#020617] via-[#0B1E36] to-[#020617] relative overflow-hidden">
            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10"><div className="flex items-center justify-between mb-6"><div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-bold uppercase tracking-wider">🎯 ยามรายนาที (3.45 นาที)</div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center text-center md:text-left"><div><p className="text-xs text-sky-400/70 uppercase mb-2 font-bold">ลัคนายามขณะนี้</p><p className="text-6xl font-display font-black text-[#F8F6F1]">{soySlot} <span className="text-sky-400">{lagnamPos}</span></p><div className="inline-flex gap-4 bg-[#020617] border border-sky-500/30 rounded-2xl px-6 py-4 mt-4 text-left"><div><p className="text-[10px] text-sky-400/60 font-bold">ดาวยามซอย</p><p className="text-xl font-bold text-[#F8F6F1]">{activeResult.yamSoyName} ({soyN})</p></div><div className="w-px h-10 bg-sky-500/20" /><div><p className="text-[10px] text-sky-400/60 font-bold">ช่วงเวลา</p><p className="text-xs font-mono text-sky-300">รอบละ 225 วินาที</p></div></div></div><div className="bg-[#020617]/60 border border-white/5 rounded-2xl p-6 backdrop-blur-sm text-left"><h4 className="text-sm font-bold text-[#F8F6F1] mb-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-sky-400" />อิทธิพลรายนาที</h4><p className="text-xs text-[#D9CDB7] leading-relaxed mb-4">วิเคราะห์จังหวะชีวิตระดับนาทีทอง เพื่อหาจังหวะเริ่มต้น การเจรจา หรือการเคลื่อนไหวที่ให้ผลลัพธ์สูงสุด</p></div></div></div>
          </Card>
          <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-6 sm:p-8 relative">
            <h3 className="text-base font-bold text-[#F8F6F1] mb-5">ผังดวงกาลชะตา 9 ฐาน (เจาะลึกรายนาที)</h3>
            <div className="overflow-x-auto"><div className="min-w-[340px] space-y-1.5">
              {[0,1,2,4,5,6,7,8].map(rIdx => (
                <div key={rIdx} className="flex items-stretch gap-2"><div className="w-12 shrink-0 flex items-center justify-end"><span className="text-[12px] font-black text-[#C6A96B]">ฐาน{THAI_NUMS[rIdx < 3 ? rIdx : rIdx-1]}</span></div><div className="flex-1 grid grid-cols-7 gap-1">{(activeResult.chart[rIdx] as number[]).map((s, cIdx) => {
                  const bName = rIdx < 3 ? BHOP_NATAL_NAMES[rIdx][cIdx] : rIdx === 7 ? BHOP_8_NAMES[cIdx] : rIdx === 8 ? BHOP_9_NAMES[cIdx] : "";
                  return (<button key={cIdx} onClick={() => setHoverNum(hoverNum === s ? null : s)} className={`rounded-xl py-2 flex flex-col items-center border transition-all ${hoverNum === s ? 'bg-[#C6A96B]/20 border-[#C6A96B]' : 'bg-[#020617] border-white/5'}`}><span className="text-base font-display font-black" style={{color: PLANET_COLORS_BY_NUM[s]}}>{s}</span><span className="text-[9px] text-[#8A8070] truncate w-full text-center">{bName}</span></button>);
                })}</div></div>
              ))}
              <div className="flex items-center gap-2 py-1"><div className="flex-1 h-px bg-sky-500/20"/><span className="text-[11px] text-sky-400/60 font-bold uppercase px-1">กำลังเทวดา</span><div className="flex-1 h-px bg-sky-500/20"/></div>
              <div className="flex items-stretch gap-2 bg-[#0B1E36]/40 border border-sky-500/15 rounded-xl py-1 px-1"><div className="w-12 shrink-0 flex items-center justify-end"><span className="text-[12px] font-black text-sky-400">ฐาน๔</span></div><div className="flex-1 grid grid-cols-7 gap-1">{(activeResult.chart[3] as number[]).map((s, cIdx) => (<div key={cIdx} className="rounded-lg py-1.5 flex flex-col items-center bg-[#020617] border border-sky-500/20"><span className="text-sm font-black text-sky-300">{s}</span><span className="text-[9px] text-sky-400/70 truncate w-full text-center px-1">{BASE4_POWER_NAMES[s]}</span></div>))}</div></div>
            </div></div>
          </Card>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <Card className="p-6 sm:p-8 border-[#C6A96B]/20 bg-[#0A1628]"><h3 className="text-base font-bold text-[#F8F6F1] mb-5">🎯 เลือกเรื่องที่ต้องการถาม</h3>
              <div className="grid grid-cols-3 gap-2 mb-6">{CATEGORIES.map(cat => (<button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${selectedCategory === cat.id ? "bg-[#0B1E36] border-sky-500/50" : "bg-[#020617] border-white/5"}`}><span className="text-xl">{cat.icon}</span><span className={`text-xs font-bold ${selectedCategory === cat.id ? "text-sky-400" : "text-[#8A8070]"}`}>{cat.label.split(" ")[0]}</span></button>))}</div>
              <div className="bg-[#020617] border border-white/5 rounded-2xl p-5"><p className="text-xs font-bold text-[#C6A96B] mb-4">💡 คำถามแนะนำ — {activeCategory?.label}</p><div className="space-y-3">{activeCategory?.questions.map((q, i) => (<button key={i} onClick={() => handleAutoSend(q)} className="w-full flex gap-3 text-left group"><span className="text-[#C6A96B] text-sm opacity-60 group-hover:opacity-100 shrink-0">✦</span><p className="text-sm text-[#D9CDB7] opacity-70 group-hover:opacity-100 transition-opacity">{q}</p></button>))}</div></div>
            </Card>
            <Card className="border-[#C6A96B]/20 bg-[#0A1628] overflow-hidden p-0"><div className="p-4 flex items-center gap-3 border-b border-white/5 bg-[#020617]/40"><div className="w-2.5 h-2.5 rounded-full bg-[#C6A96B] shadow-[0_0_8px_rgba(198,169,107,0.6)] animate-pulse" /><div><h3 className="text-sm font-bold text-[#F8F6F1] tracking-wider">WISDOM GUIDANCE</h3><p className="text-xs text-[#8A8070]">หมวด: <span className="text-[#C6A96B]">{activeCategory?.label}</span></p></div><button onClick={() => setChatMessages([])} className="ml-auto px-3 py-1.5 text-xs text-[#8A8070] hover:text-[#F8F6F1] transition-colors">ล้างแชท</button></div><div className="overflow-y-auto p-4 space-y-4 h-64 sm:h-80">{chatMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                  {msg.sender === "ai" && (<span className="text-[10px] text-[#C6A96B] font-bold uppercase mb-1">✦ WISDOM GUIDANCE</span>)}
                  <div className={`max-w-[90%] p-3 rounded-2xl text-sm ${msg.sender === "user" ? "bg-[#0A1628] text-[#F8F6F1] border border-white/10 rounded-tr-none" : "bg-[#020617] text-[#D9CDB7] border border-white/10 rounded-tl-none"}`}>{msg.text}</div>
                </div>
              ))}<div ref={chatEndRef} /></div><div className="p-4 border-t border-white/5 bg-[#020617]/40"><form onSubmit={handleSendChat} className="flex gap-2"><input type="text" autoComplete="off" value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="พิมพ์คำถามของท่าน..." className="flex-1 bg-[#0A1628] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-[#F8F6F1] outline-none" /><Button type="submit" disabled={!userInput.trim()} className="px-4 py-2.5 rounded-xl bg-[#8A8070] text-[#020617] font-bold hover:bg-[#C6A96B] transition-colors text-sm">ส่ง</Button></form></div></Card>
          </div>
        </>
      )}
    </div>
  );
}
