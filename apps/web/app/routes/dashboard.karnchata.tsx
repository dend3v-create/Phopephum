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

// สีประจำดาว 1–7 (ใช้แทนการ dim opacity)
const PLANET_COLORS_BY_NUM: Record<number, string> = {
  1: '#EF4444', // อาทิตย์
  2: '#FBBF24', // จันทร์
  3: '#F97316', // อังคาร
  4: '#10B981', // พุธ
  5: '#F59E0B', // พฤหัส
  6: '#EC4899', // ศุกร์
  7: '#8B5CF6', // เสาร์
};

// ── ลำดับดาวชั่วโมงแบบ Chaldean (ยามแต่ละช่วง) ──
// อาทิตย์(1)→ศุกร์(6)→พุธ(4)→จันทร์(2)→เสาร์(7)→พฤหัส(5)→อังคาร(3)→อาทิตย์ ...
const CHALDEAN_SEQ = [7, 5, 3, 1, 6, 4, 2] as const;

// คำแนะนำการวางแผนต่อทักษาจร
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
  const [selectedYamKey, setSelectedYamKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"daily" | "hourly" | "minute">("hourly");

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

  // ── Connection items: computed whenever hoverNum or chart changes ──
  const THAI_NUMS = ['๑','๒','๓','๔','๕','๖','๗','๘','๙'] as const;
  const connectionItems = useMemo(() => {
    if (hoverNum === null) return [];
    const chart = activeResult.chart as number[][];
    const items: Array<{ rIdx: number; colIdx: number; bhopName: string; b4Power: string | null; baseThai: string }> = [];
    chart.forEach((row, rIdx) => {
      if (rIdx === 3) return; // base 4 holds raw sums 3–21, not 1–7
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

  // ── ตารางยามรายวัน: 8 ยามกลางวัน + 8 ยามกลางคืน ──
  const dayYamTable = useMemo(() => {
    const dayStarN = (activeResult.dayStarNumber ?? 1) as number;
    const chaldIdx = CHALDEAN_SEQ.indexOf(dayStarN as typeof CHALDEAN_SEQ[number]);
    const dayStarPos8 = _SEQ.indexOf(dayStarN as typeof _SEQ[number]);

    return Array.from({ length: 16 }, (_, i) => {
      const cIdx = chaldIdx !== -1 ? (chaldIdx + i) % 7 : i % 7;
      const star = CHALDEAN_SEQ[cIdx] as number;
      const isDay = i < 8;
      const slot = i % 8;
      const hf = (isDay ? 6 : 18) + slot * 1.5;
      const ef = hf + 1.5;
      const fmt = (h: number, m: number) =>
        `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const timeStr = `${fmt(hf, hf % 1 ? 30 : 0)}–${fmt(ef, ef % 1 ? 30 : 0)}`;

      // ทักษาจร: relative to day star
      const yamStarPos8 = _SEQ.indexOf(star as typeof _SEQ[number]);
      const qualIdx = dayStarPos8 !== -1 && yamStarPos8 !== -1
        ? (yamStarPos8 - dayStarPos8 + 8) % 8
        : -1;
      const quality = qualIdx !== -1 ? (_BHOP[qualIdx] ?? '') : '';

      // ฐาน ๑ ภพ: find this star in chart row 0
      const chart0 = (activeResult.chart[0] ?? []) as number[];
      const b1Col = chart0.indexOf(star);
      const b1Bhop = b1Col !== -1 ? (BHOP_NATAL_NAMES[0]?.[b1Col] ?? '') : '';

      // Is this the current ยาม?
      const bkkH = (time.getUTCHours() + 7) % 24;
      const totalMin = bkkH * 60 + time.getUTCMinutes();
      const slotStartMin = (isDay ? 6 : 18) * 60 + slot * 90;
      const isCurrentYam = totalMin >= slotStartMin && totalMin < slotStartMin + 90;

      return { yamNum: slot + 1, isDay, star, timeStr, quality, qualIdx, b1Bhop, b1Col, isCurrentYam };
    });
  }, [activeResult, time]);

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
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 px-2 pb-1">
            <span className="hidden sm:block text-xs text-[#8A8070] font-bold shrink-0">เลือกวันเวลา:</span>
            <input type="date" autoComplete="off" className="col-span-2 sm:col-auto sm:flex-1 bg-[#020617] border border-white/10 text-[#F8F6F1] text-sm rounded-xl px-3 py-2 outline-none focus:border-[#C6A96B] w-full" defaultValue={new Date().toISOString().split('T')[0]} />
            <input type="time" autoComplete="off" className="bg-[#020617] border border-white/10 text-[#F8F6F1] text-sm rounded-xl px-3 py-2 outline-none focus:border-[#C6A96B] w-full sm:w-[110px]" defaultValue="12:00" />
          </div>
        )}
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex bg-[#0A1628]/60 p-1.5 rounded-2xl border border-white/5 gap-1.5 sticky top-2 z-30 backdrop-blur-xl">
        {[
          { id: "daily", label: "รายวัน", icon: "📅" },
          { id: "hourly", label: "รายชั่วโมง", icon: "⏱" },
          { id: "minute", label: "นาที 3.45", icon: "🎯" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === tab.id
                ? "bg-[#C6A96B] text-[#020617] shadow-lg shadow-[#C6A96B]/20"
                : "text-[#8A8070] hover:text-[#F8F6F1] hover:bg-white/5"
            }`}
          >
            <span className="text-base sm:text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
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

      {/* ── ตารางกาลชะตารายวัน ── */}
      <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <span className="text-2xl shrink-0">📅</span>
          <div className="flex-1">
            <h3 className="text-base font-bold text-[#F8F6F1]">ตารางกาลชะตารายวัน</h3>
            <p className="text-xs text-[#8A8070] mt-0.5">
              ทักษาจร × ฐาน ๑ เพื่อการวางแผน &nbsp;•&nbsp; ดาวประจำวัน:&nbsp;
              <span className="text-[#C6A96B] font-bold">{STAR_NAMES[activeResult.dayStarNumber as keyof typeof STAR_NAMES]} ({activeResult.dayStarNumber})</span>
              &nbsp;= บริวาร
            </p>
          </div>
        </div>

        {/* ── ผังทักษาจรวัน: 8 ช่อง ── */}
        <div className="bg-[#020617] border border-[#C6A96B]/12 rounded-2xl p-4 mb-6">
          <p className="text-[13px] text-[#C6A96B]/70 font-bold uppercase tracking-wider mb-3">ผังทักษาจรวันนี้ — ตนุ ฐานวัน ฐาน ๑</p>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {(_BHOP as readonly string[]).map((bhop, idx) => {
              const starNum = _SEQ[(_SEQ.indexOf(activeResult.dayStarNumber as typeof _SEQ[number]) + idx + 8) % 8] as number;
              const starName = STAR_NAMES[starNum as keyof typeof STAR_NAMES] ?? '';
              const isNowYam = starNum === activeResult.yamYaiNumber;
              const advice = TAKSA_PLAN_ADVICE[bhop];
              const isGood = (advice?.level ?? 0) >= 3;
              const isBad = bhop === 'กาลกิณี';
              return (
                <div
                  key={bhop}
                  className={`rounded-xl p-2 border text-center transition-all ${
                    isNowYam
                      ? 'bg-[#C6A96B]/15 border-[#C6A96B]/50 shadow-[0_0_10px_rgba(198,169,107,0.15)]'
                      : isBad
                        ? 'bg-rose-950/15 border-rose-500/15'
                        : isGood
                          ? 'bg-emerald-950/10 border-emerald-500/12'
                          : 'bg-[#0A1628] border-white/5'
                  }`}
                >
                  <p className={`text-[12px] font-bold leading-tight mb-0.5 ${isBad ? 'text-rose-400' : isGood ? 'text-emerald-400' : isNowYam ? 'text-[#C6A96B]' : 'text-[#8A8070]'}`}>
                    {bhop}
                  </p>
                  <p className={`text-sm font-display font-black leading-none ${isNowYam ? 'text-[#C6A96B]' : 'text-[#F8F6F1]'}`}>
                    {starNum}
                  </p>
                  <p className="text-[12px] text-[#8A8070] leading-tight mt-0.5 hidden sm:block">{starName}</p>
                  {isNowYam && (
                    <span className="text-[11px] text-[#C6A96B] font-bold mt-0.5 block">▲ ขณะนี้</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ยามกลางวัน ── */}
        <div className="mb-5">
          <p className="text-xs font-bold text-amber-400/80 mb-3 flex items-center gap-2">
            <span>☀️</span> ยามกลางวัน (06:00–18:00)
          </p>
          <div className="space-y-1.5">
            {dayYamTable.filter(y => y.isDay).map(yam => {
              const advice = TAKSA_PLAN_ADVICE[yam.quality];
              const lvl = advice?.level ?? 1;
              const isBad = yam.quality === 'กาลกิณี';
              const isGreat = lvl >= 3;
              const yamKey = `day-${yam.yamNum}`;
              const isExpanded = selectedYamKey === yamKey;
              const yamDescItem = YAM_DESC[yam.star] ?? YAM_DESC[1];
              return (
                <div key={yam.yamNum} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => setSelectedYamKey(isExpanded ? null : yamKey)}
                    className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                      isExpanded
                        ? 'rounded-b-none border-b-0'
                        : ''
                    } ${
                      yam.isCurrentYam
                        ? 'bg-[#C6A96B]/10 border-[#C6A96B]/45 shadow-[0_0_12px_rgba(198,169,107,0.10)] ring-1 ring-[#C6A96B]/20'
                        : isBad
                          ? 'bg-rose-950/12 border-rose-500/12'
                          : isGreat
                            ? 'bg-emerald-950/8 border-emerald-500/8'
                            : 'bg-[#020617] border-white/5'
                    }`}
                  >
                    <span className="text-[13px] text-[#8A8070] font-mono shrink-0 w-[82px] sm:w-[92px] tabular-nums">{yam.timeStr}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-display font-bold shrink-0 ${
                        yam.isCurrentYam ? 'bg-[#C6A96B] text-[#020617] shadow-[0_0_8px_rgba(198,169,107,0.5)]' : 'bg-[#0A1628] border border-white/10 text-[#F8F6F1]'
                      }`}>{yam.star}</div>
                      <span className={`text-xs font-bold shrink-0 ${yam.isCurrentYam ? 'text-[#C6A96B]' : 'text-[#F8F6F1]'}`}>
                        {STAR_NAMES[yam.star as keyof typeof STAR_NAMES]}
                      </span>
                    </div>
                    <span className={`text-xs font-bold shrink-0 w-14 sm:w-16 ${isBad ? 'text-rose-400' : isGreat ? 'text-emerald-400' : 'text-[#8A8070]'}`}>
                      {yam.quality || '—'}
                    </span>
                    <span className="text-[13px] text-[#D9CDB7]/70 flex-1 leading-snug hidden lg:block">
                      {advice ? `${advice.emoji} ${advice.th}` : ''}
                    </span>
                    <span className={`text-sm shrink-0 ml-auto ${isBad ? 'text-rose-400' : isGreat ? 'text-emerald-400' : 'text-[#8A8070]/40'}`}>
                      {isExpanded ? '▲' : (isBad ? '⚠' : isGreat ? '✦' : '▾')}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className={`px-4 py-3 rounded-b-xl border border-t-0 text-xs space-y-2 ${
                      yam.isCurrentYam ? 'bg-[#C6A96B]/5 border-[#C6A96B]/45' : isBad ? 'bg-rose-950/12 border-rose-500/12' : isGreat ? 'bg-emerald-950/8 border-emerald-500/8' : 'bg-[#020617] border-white/5'
                    }`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[#8A8070]">ภพ:</span>
                        <span className="text-[#F8F6F1] font-bold">{yam.b1Bhop || '—'}</span>
                        <span className="text-[#8A8070] ml-2">ดาว:</span>
                        <span className="text-[#C6A96B] font-bold">{yam.star} {STAR_NAMES[yam.star as keyof typeof STAR_NAMES]}</span>
                      </div>
                      {advice && (
                        <p className="text-[#D9CDB7] leading-relaxed">{advice.emoji} <span className="font-bold text-[#C6A96B]">{yam.quality}</span> — {advice.th}</p>
                      )}
                      <p className="text-[#8A8070] leading-relaxed">{yamDescItem.desc}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ยามกลางคืน ── */}
        <div>
          <p className="text-xs font-bold text-indigo-400/80 mb-3 flex items-center gap-2">
            <span>🌙</span> ยามกลางคืน (18:00–06:00)
          </p>
          <div className="space-y-1.5">
            {dayYamTable.filter(y => !y.isDay).map(yam => {
              const advice = TAKSA_PLAN_ADVICE[yam.quality];
              const lvl = advice?.level ?? 1;
              const isBad = yam.quality === 'กาลกิณี';
              const isGreat = lvl >= 3;
              const yamKey = `night-${yam.yamNum}`;
              const isExpanded = selectedYamKey === yamKey;
              const yamDescItem = YAM_DESC[yam.star] ?? YAM_DESC[1];
              return (
                <div key={yam.yamNum} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => setSelectedYamKey(isExpanded ? null : yamKey)}
                    className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                      isExpanded ? 'rounded-b-none border-b-0' : ''
                    } ${
                      yam.isCurrentYam
                        ? 'bg-[#C6A96B]/10 border-[#C6A96B]/45 shadow-[0_0_12px_rgba(198,169,107,0.10)] ring-1 ring-[#C6A96B]/20'
                        : isBad
                          ? 'bg-rose-950/12 border-rose-500/12'
                          : isGreat
                            ? 'bg-emerald-950/8 border-emerald-500/8'
                            : 'bg-[#020617] border-white/5'
                    }`}
                  >
                    <span className="text-[13px] text-[#8A8070] font-mono shrink-0 w-[82px] sm:w-[92px] tabular-nums">{yam.timeStr}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-display font-bold shrink-0 ${
                        yam.isCurrentYam ? 'bg-[#C6A96B] text-[#020617] shadow-[0_0_8px_rgba(198,169,107,0.5)]' : 'bg-[#0A1628] border border-white/10 text-[#F8F6F1]'
                      }`}>{yam.star}</div>
                      <span className={`text-xs font-bold shrink-0 ${yam.isCurrentYam ? 'text-[#C6A96B]' : 'text-[#F8F6F1]'}`}>
                        {STAR_NAMES[yam.star as keyof typeof STAR_NAMES]}
                      </span>
                    </div>
                    <span className={`text-xs font-bold shrink-0 w-14 sm:w-16 ${isBad ? 'text-rose-400' : isGreat ? 'text-emerald-400' : 'text-[#8A8070]'}`}>
                      {yam.quality || '—'}
                    </span>
                    <span className="text-[13px] text-[#D9CDB7]/70 flex-1 leading-snug hidden lg:block">
                      {advice ? `${advice.emoji} ${advice.th}` : ''}
                    </span>
                    <span className={`text-sm shrink-0 ml-auto ${isBad ? 'text-rose-400' : isGreat ? 'text-emerald-400' : 'text-[#8A8070]/40'}`}>
                      {isExpanded ? '▲' : (isBad ? '⚠' : isGreat ? '✦' : '▾')}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className={`px-4 py-3 rounded-b-xl border border-t-0 text-xs space-y-2 ${
                      yam.isCurrentYam ? 'bg-[#C6A96B]/5 border-[#C6A96B]/45' : isBad ? 'bg-rose-950/12 border-rose-500/12' : isGreat ? 'bg-emerald-950/8 border-emerald-500/8' : 'bg-[#020617] border-white/5'
                    }`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[#8A8070]">ภพ:</span>
                        <span className="text-[#F8F6F1] font-bold">{yam.b1Bhop || '—'}</span>
                        <span className="text-[#8A8070] ml-2">ดาว:</span>
                        <span className="text-[#C6A96B] font-bold">{yam.star} {STAR_NAMES[yam.star as keyof typeof STAR_NAMES]}</span>
                      </div>
                      {advice && (
                        <p className="text-[#D9CDB7] leading-relaxed">{advice.emoji} <span className="font-bold text-[#C6A96B]">{yam.quality}</span> — {advice.th}</p>
                      )}
                      <p className="text-[#8A8070] leading-relaxed">{yamDescItem.desc}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-white/5 text-[13px]">
          <span className="flex items-center gap-1 text-emerald-400"><span className="font-bold">✦</span> เดช/ศรี/มูละ/มนตรี = ดีมาก</span>
          <span className="flex items-center gap-1 text-[#8A8070]"><span>▾</span> บริวาร/อายุ/อุตสาหะ = ปกติ</span>
          <span className="flex items-center gap-1 text-rose-400"><span>⚠</span> กาลกิณี = ระวัง</span>
          <span className="flex items-center gap-1 text-[#C6A96B]"><span>▲</span> ยามปัจจุบัน</span>
          <span className="flex items-center gap-1 text-[#8A8070]">แตะแถวเพื่อดูรายละเอียด</span>
        </div>
      </Card>

      {/* ── เลือกหมวดคำถาม + คำถามแนะนำ ── */}
      <Card className="p-6 sm:p-8 border-[#C6A96B]/20 bg-[#0A1628]">
        <h3 className="text-base font-bold text-[#F8F6F1] mb-5 flex items-center gap-2">
          🎯 เลือกเรื่องที่ต้องการถาม
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2 mb-6">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`p-2 sm:p-3 rounded-xl border flex flex-col items-center justify-center gap-1 sm:gap-1.5 transition-all ${
                selectedCategory === cat.id
                  ? "bg-[#0B1E36] border-sky-500/50 shadow-[0_0_12px_rgba(14,165,233,0.12)]"
                  : "bg-[#020617] border-white/5 hover:border-white/15"
              }`}
            >
              <span className="text-lg sm:text-xl">{cat.icon}</span>
              <span className={`text-[13px] sm:text-xs font-bold text-center leading-tight ${selectedCategory === cat.id ? "text-sky-400" : "text-[#8A8070]"}`}>
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

        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 h-60 sm:h-80">
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                      <div key={item.q} className={`rounded-xl px-2 py-2.5 border text-center flex flex-col items-center gap-0.5 ${item.color}`}>
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

      {/* ── ผังดวงกาลชะตา 9 ฐาน (Table) ── */}
      <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-6 sm:p-8 relative">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl shrink-0">☸️</span>
          <div className="flex-1">
            <h3 className="text-base font-bold text-[#F8F6F1]">ผังดวงกาลชะตา 9 ฐาน</h3>
            <p className="text-xs text-[#8A8070] mt-0.5">แตะตัวเลขเพื่อดูความเชื่อมโยง</p>
          </div>
          {hoverNum !== null && (
            <button
              type="button"
              onClick={() => setHoverNum(null)}
              className="shrink-0 text-xs text-[#8A8070] hover:text-[#F8F6F1] border border-white/10 hover:border-white/25 px-3 py-1.5 rounded-lg transition-colors"
            >
              ✕ ล้าง
            </button>
          )}
        </div>

        {/* ── Connection Banner ── */}
        {hoverNum !== null && (
          <div className="mb-5 bg-gradient-to-br from-[#020617] to-[#09152b] border border-[#C6A96B]/35 rounded-2xl p-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-display font-black shrink-0 ring-2 ring-[#C6A96B]"
                style={{background: PLANET_COLORS_BY_NUM[hoverNum] + '22', color: PLANET_COLORS_BY_NUM[hoverNum]}}>
                {hoverNum}
              </div>
              <div>
                <p className="text-sm font-bold text-[#C6A96B]">ดาว {STAR_NAMES[hoverNum as keyof typeof STAR_NAMES]}</p>
                <p className="text-xs text-[#8A8070]">ปรากฏใน {connectionItems.length} ฐาน</p>
              </div>
            </div>
            {connectionItems.length === 0 ? (
              <p className="text-xs text-[#8A8070] py-1">ไม่พบดาวนี้ในฐาน 1–3, 5–9</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {connectionItems.map(occ => (
                  <div key={occ.rIdx}
                    className={`rounded-lg px-3 py-1.5 border text-xs flex items-center gap-1.5 ${occ.rIdx < 3 || occ.rIdx >= 7 ? 'bg-[#0A1628] border-[#C6A96B]/20' : 'bg-[#020617] border-white/5'}`}>
                    <span className={`font-black text-[13px] ${occ.rIdx < 3 ? 'text-[#C6A96B]' : occ.rIdx < 7 ? 'text-[#8A8070]' : 'text-[#C6A96B]'}`}>ฐาน{occ.baseThai}</span>
                    <span className="text-[#F8F6F1] font-bold">{occ.bhopName || `ช่อง ${occ.colIdx + 1}`}</span>
                    {occ.b4Power && <span className="text-sky-300 text-[13px]">· {occ.b4Power}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 9-Base Grid Table ── */}
        <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
          <div className="min-w-[340px] space-y-1.5">

            {/* ── ฐาน 1–3 ── */}
            {[0, 1, 2].map(rIdx => (
              <div key={rIdx} className="flex items-stretch gap-2">
                <div className="w-10 sm:w-14 shrink-0 flex items-center justify-end">
                  <span className="text-[13px] sm:text-xs font-black text-[#C6A96B]">ฐาน{['๑','๒','๓'][rIdx]}</span>
                </div>
                <div className="flex-1 grid grid-cols-7 gap-1">
                  {(activeResult.chart[rIdx] as number[]).map((star, cIdx) => {
                    const isSelected = hoverNum === star;
                    const col = PLANET_COLORS_BY_NUM[star] ?? '#F8F6F1';
                    return (
                      <button key={cIdx} type="button"
                        onClick={() => setHoverNum(isSelected ? null : star)}
                        className={`rounded-xl py-2 px-1 flex flex-col items-center gap-0.5 transition-all active:scale-95 ${
                          isSelected
                            ? 'ring-2 shadow-lg'
                            : 'bg-[#020617] border border-white/8 hover:border-white/20'
                        }`}
                        style={isSelected ? {background: col + '18', borderColor: col, ringColor: col, boxShadow: `0 0 12px ${col}44`} : {}}
                      >
                        <span className="text-base sm:text-lg font-display font-black leading-none" style={{color: col}}>{star}</span>
                        <span className="text-[11px] sm:text-[12px] text-[#8A8070] text-center leading-tight w-full truncate">{BHOP_NATAL_NAMES[rIdx]?.[cIdx]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Divider — กำลังเทวดา */}
            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-sky-500/20" />
              <span className="text-[12px] text-sky-400/60 font-bold uppercase tracking-wider px-1">กำลังเทวดา</span>
              <div className="flex-1 h-px bg-sky-500/20" />
            </div>

            {/* ── ฐาน 4 ── */}
            <div className="flex items-stretch gap-2 bg-[#0B1E36]/40 border border-sky-500/15 rounded-2xl py-2 px-1">
              <div className="w-10 sm:w-14 shrink-0 flex items-center justify-end">
                <span className="text-[13px] sm:text-xs font-black text-sky-400">ฐาน๔</span>
              </div>
              <div className="flex-1 grid grid-cols-7 gap-1">
                {(activeResult.chart[3] as number[]).map((star, cIdx) => {
                  const base3Star = (activeResult.chart[2] as number[])[cIdx] ?? 0;
                  const isLit = hoverNum !== null && base3Star === hoverNum;
                  return (
                    <button key={cIdx} type="button"
                      onClick={() => setHoverNum(isLit ? null : base3Star)}
                      className={`rounded-xl py-2 px-1 flex flex-col items-center gap-0.5 transition-all active:scale-95 ${
                        isLit
                          ? 'bg-[#4B6FAE]/20 ring-2 ring-[#4B6FAE] shadow-[0_0_12px_rgba(75,111,174,0.4)]'
                          : 'bg-[#020617] border border-sky-500/20 hover:border-sky-400/40'
                      }`}>
                      <span className="text-sm sm:text-base font-display font-black text-sky-300 leading-none">{star}</span>
                      <span className="text-[10px] sm:text-[11px] text-sky-400/70 text-center leading-tight w-full truncate">{BASE4_POWER_NAMES[star] || ''}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider — ฐานสมทบ */}
            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[12px] text-[#8A8070]/40 font-bold uppercase tracking-wider px-1">ฐานสมทบ ๕–๗</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            {/* ── ฐาน 5–7 ── */}
            {[4, 5, 6].map(rIdx => (
              <div key={rIdx} className="flex items-center gap-2">
                <div className="w-10 sm:w-14 shrink-0 flex items-center justify-end">
                  <span className="text-[12px] sm:text-[13px] font-black text-[#F8F6F1]/35">ฐาน{['๕','๖','๗'][rIdx - 4]}</span>
                </div>
                <div className="flex-1 grid grid-cols-7 gap-1">
                  {(activeResult.chart[rIdx] as number[]).map((star, cIdx) => {
                    const isSelected = hoverNum === star;
                    const col = PLANET_COLORS_BY_NUM[star] ?? '#F8F6F1';
                    return (
                      <button key={cIdx} type="button"
                        onClick={() => setHoverNum(isSelected ? null : star)}
                        className={`rounded-lg py-1.5 flex items-center justify-center transition-all active:scale-95 ${
                          isSelected ? 'ring-1' : 'bg-[#020617] border border-white/5 hover:border-white/15'
                        }`}
                        style={isSelected ? {background: col + '12', borderColor: col} : {}}>
                        <span className="text-xs sm:text-sm font-display font-black text-[#F8F6F1]/50" style={isSelected ? {color: col} : {}}>{star}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Divider — ภพชาตาลึก */}
            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-[#C6A96B]/12" />
              <span className="text-[12px] text-[#C6A96B]/45 font-bold uppercase tracking-wider px-1">ภพชาตาลึก ๘–๙</span>
              <div className="flex-1 h-px bg-[#C6A96B]/12" />
            </div>

            {/* ── ฐาน 8–9 ── */}
            {[7, 8].map(rIdx => (
              <div key={rIdx} className="flex items-stretch gap-2">
                <div className="w-10 sm:w-14 shrink-0 flex items-center justify-end">
                  <span className="text-[13px] sm:text-xs font-black text-[#F8F6F1]">ฐาน{['๘','๙'][rIdx - 7]}</span>
                </div>
                <div className="flex-1 grid grid-cols-7 gap-1">
                  {(activeResult.chart[rIdx] as number[]).map((star, cIdx) => {
                    const isSelected = hoverNum === star;
                    const bhopName = rIdx === 7 ? BHOP_8_NAMES[cIdx] : BHOP_9_NAMES[cIdx];
                    const col = PLANET_COLORS_BY_NUM[star] ?? '#F8F6F1';
                    return (
                      <button key={cIdx} type="button"
                        onClick={() => setHoverNum(isSelected ? null : star)}
                        className={`rounded-xl py-2 px-1 flex flex-col items-center gap-0.5 transition-all active:scale-95 ${
                          isSelected ? 'ring-2 shadow-lg' : 'bg-[#020617] border border-white/8 hover:border-white/20'
                        }`}
                        style={isSelected ? {background: col + '18', borderColor: col, boxShadow: `0 0 12px ${col}44`} : {}}>
                        <span className="text-base sm:text-lg font-display font-black leading-none" style={{color: col}}>{star}</span>
                        <span className="text-[11px] sm:text-[12px] text-[#8A8070] text-center leading-tight w-full truncate">{bhopName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* ── วิธีอ่าน ── */}
            <div className="bg-[#020617] border border-[#C6A96B]/18 rounded-2xl p-4 mt-3">
              <p className="text-xs font-bold text-[#C6A96B] mb-3">✦ วิธีอ่านรหัสชีวิต 3 ขั้นตอน — Star Tracing</p>
              <p className="text-xs text-rose-400/75 font-bold mb-3">⚑ ห้ามอ่านแนวดิ่ง — ใช้ "เลขดาว" เชื่อมโยง ฐาน 1 → 2 → 3</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { step:"1", title:"ตั้งโจทย์", color:"text-[#C6A96B]", bg:"bg-[#C6A96B]/20", desc:"เลือกภพเรือนในฐาน 1 ที่ต้องการทราบ แล้วดูเลขดาว — แตะเพื่อเริ่มติดตาม" },
                  { step:"2", title:"ตามรอยดาว", color:"text-sky-400", bg:"bg-sky-500/20", desc:"แถบด้านบนแสดงทุกฐานที่ดาวนั้นปรากฏ พร้อมชื่อภพ — เชื่อมโยง 1 → 2 → 3" },
                  { step:"3", title:"กำลังเทวดา", color:"text-[#4B6FAE]", bg:"bg-[#4B6FAE]/30", desc:"ดาวในฐาน 3 ตกช่องใด → อ่านฐาน 4 ช่องเดียวกันเพื่อตัดสินคุณภาพดวง" },
                ].map(s => (
                  <div key={s.step} className="bg-[#0A1628] rounded-xl p-3 border border-white/5">
                    <p className={`text-xs font-bold ${s.color} mb-1.5 flex items-center gap-1.5`}>
                      <span className={`w-5 h-5 rounded-full ${s.bg} flex items-center justify-center text-xs font-black shrink-0`}>{s.step}</span>
                      {s.title}
                    </p>
                    <p className="text-xs text-[#8A8070] leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── กาลชะตารายชั่วโมง ── */}
      {(() => {
        const hChart = (activeResult.hourlyChart ?? []) as number[][];
        const yamNum = activeResult.yamYaiNumber;
        const yamName = activeResult.yamYaiName;
        const dayNum = activeResult.dayStarNumber;
        const monthNum = (activeResult.lunarMonth ?? 1) as number;
        const monthName = (activeResult.lunarMonthName ?? "") as string;
        return (
          <Card className="border-[#4B6FAE]/30 bg-[#0A1628] p-6 sm:p-8 relative">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl shrink-0">⏰</span>
              <div className="flex-1">
                <h3 className="text-base font-bold text-[#F8F6F1]">กาลชะตารายชั่วโมง</h3>
                <p className="text-xs text-[#8A8070] mt-0.5">
                  อัตตะ = ยาม <span className="text-[#C6A96B] font-bold">{yamNum} ({yamName})</span>
                  &nbsp;•&nbsp; ตนุ = วัน <span className="text-[#C6A96B] font-bold">{dayNum} ({STAR_NAMES[dayNum as keyof typeof STAR_NAMES]})</span>
                  &nbsp;•&nbsp; มรณะ = เดือน <span className="text-[#C6A96B] font-bold">{monthNum} ({monthName})</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-[#C6A96B]/50 mb-4 md:hidden text-center">← เลื่อนซ้าย-ขวาเพื่อดูผังเต็ม →</p>

            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <div className="min-w-[320px] sm:min-w-[540px] flex flex-col gap-3 sm:gap-4 items-center pb-4">

                {/* ── ฐาน 1–3 ── */}
                {[0, 1, 2].map(rIdx => (
                  <div key={rIdx} className="flex items-start w-full max-w-3xl">
                    <div className="w-9 sm:w-16 shrink-0 pt-2.5">
                      <p className="text-[13px] sm:text-xs font-bold text-[#F8F6F1]">ฐาน {['๑','๒','๓'][rIdx]}</p>
                      <p className="text-[11px] text-[#8A8070]/60 hidden sm:block">{['อัตตะ(ยาม)','ตนุ(วัน)','มรณะ(เดือน)'][rIdx]}</p>
                    </div>
                    <div className="flex-1 flex justify-between">
                      {(hChart[rIdx] ?? []).map((star: number, cIdx: number) => (
                        <div key={cIdx} className="flex flex-col items-center gap-0.5 sm:gap-1.5 w-9 sm:w-14">
                          <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-lg font-display font-bold bg-[#020617] border border-[#4B6FAE]/45 text-[#F8F6F1]">
                            {star}
                          </div>
                          <span className="text-[11px] sm:text-[14px] font-medium text-center leading-tight text-[#8A8070]">
                            {BHOP_NATAL_NAMES[rIdx][cIdx]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Divider — กำลังเทวดา */}
                <div className="flex items-center w-full max-w-3xl gap-2 my-0.5">
                  <div className="flex-1 h-px bg-sky-500/20" />
                  <span className="text-[13px] text-sky-400/60 font-bold tracking-wider uppercase px-1">กำลังเทวดา</span>
                  <div className="flex-1 h-px bg-sky-500/20" />
                </div>

                {/* ── ฐาน 4 ── */}
                <div className="flex items-start w-full max-w-3xl bg-[#0B1E36]/40 border border-sky-500/12 py-3 px-1 sm:px-2 rounded-2xl">
                  <div className="w-9 sm:w-16 shrink-0 pt-1.5 pl-0.5">
                    <p className="text-[13px] sm:text-xs font-bold text-sky-400">ฐาน ๔</p>
                    <p className="text-[12px] text-sky-400/45 hidden sm:block">เทวดา</p>
                  </div>
                  <div className="flex-1 flex justify-between pr-1 sm:pr-2">
                    {(hChart[3] ?? []).map((star: number, cIdx: number) => (
                      <div key={cIdx} className="flex flex-col items-center gap-0.5 sm:gap-1.5 w-9 sm:w-14">
                        <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-lg font-display font-bold bg-[#020617] border border-sky-500/40 text-[#F8F6F1]">
                          {star}
                        </div>
                        <span className="text-[11px] sm:text-[14px] font-medium text-center leading-tight text-sky-400/75">
                          {BASE4_POWER_NAMES[star] || ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider — ฐานสมทบ */}
                <div className="flex items-center w-full max-w-3xl gap-2 my-0.5">
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-[13px] text-[#8A8070]/40 font-bold tracking-wider uppercase px-1">ฐานสมทบ ๕–๗</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                {/* ── ฐาน 5–7 ── */}
                {[4, 5, 6].map(rIdx => (
                  <div key={rIdx} className="flex items-center w-full max-w-3xl">
                    <div className="w-9 sm:w-16 shrink-0">
                      <p className="text-[13px] sm:text-xs font-bold text-[#F8F6F1]/50">ฐาน {['๕','๖','๗'][rIdx - 4]}</p>
                    </div>
                    <div className="flex-1 flex justify-between">
                      {(hChart[rIdx] ?? []).map((star: number, cIdx: number) => (
                        <div key={cIdx} className="flex flex-col items-center w-9 sm:w-14">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-display font-bold bg-[#020617] border border-white/12 text-[#F8F6F1]/60">
                            {star}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Divider — ภพชาตาลึก */}
                <div className="flex items-center w-full max-w-3xl gap-2 my-0.5">
                  <div className="flex-1 h-px bg-[#4B6FAE]/12" />
                  <span className="text-[13px] text-[#4B6FAE]/45 font-bold tracking-wider uppercase px-1">ภพชาตาลึก ๘–๙</span>
                  <div className="flex-1 h-px bg-[#4B6FAE]/12" />
                </div>

                {/* ── ฐาน 8–9 ── */}
                {[7, 8].map(rIdx => (
                  <div key={rIdx} className="flex items-start w-full max-w-3xl">
                    <div className="w-9 sm:w-16 shrink-0 pt-2.5">
                      <p className="text-[13px] sm:text-xs font-bold text-[#F8F6F1]">ฐาน {['๘','๙'][rIdx - 7]}</p>
                    </div>
                    <div className="flex-1 flex justify-between">
                      {(hChart[rIdx] ?? []).map((star: number, cIdx: number) => {
                        const bhopName = rIdx === 7 ? BHOP_8_NAMES[cIdx] : BHOP_9_NAMES[cIdx];
                        return (
                          <div key={cIdx} className="flex flex-col items-center gap-0.5 sm:gap-1.5 w-9 sm:w-14">
                            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-lg font-display font-bold bg-[#020617] border border-[#4B6FAE]/35 text-[#F8F6F1]">
                              {star}
                            </div>
                            <span className="text-[11px] sm:text-[14px] font-medium text-center leading-tight text-[#8A8070]">
                              {bhopName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-white/5 bg-[#020617] border border-[#4B6FAE]/18 rounded-2xl p-4">
              <p className="text-xs font-bold text-[#4B6FAE] mb-2 flex items-center gap-2">⏰ หลักการอ่านกาลชะตารายชั่วโมง</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[#8A8070] leading-relaxed">
                <div><span className="text-[#C6A96B] font-bold">ฐาน ๑ (อัตตะ)</span> — ตั้งจากเลขดาวยามใหญ่ขณะนั้น</div>
                <div><span className="text-[#C6A96B] font-bold">ฐาน ๒ (ตนุ)</span> — ตั้งจากเลขดาวประจำวัน</div>
                <div><span className="text-[#C6A96B] font-bold">ฐาน ๓ (มรณะ)</span> — ตั้งจากเลขเดือนทางจันทรคติ</div>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* ── ผังทิศทักษาจรแปดทิศ ── */}
      <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-6 sm:p-8">
        <div className="flex items-start gap-3 mb-6 border-b border-white/5 pb-5">
          <span className="text-2xl shrink-0">🧭</span>
          <div>
            <h3 className="text-base font-bold text-[#F8F6F1]">ผังทิศทักษาจรแปดทิศ</h3>
            <p className="text-xs text-[#8A8070] mt-1">ทิศทางที่เป็นคุณ/เป็นภัยในนาทีนี้ • แตะการ์ดเพื่อเลือก</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3 max-w-xl mx-auto">
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
                className={`p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl border flex flex-col items-center text-center transition-all ${hoverNum === dir.id ? "bg-[#C6A96B]/10 border-[#C6A96B] shadow-[0_0_20px_rgba(198,169,107,0.15)] scale-[1.02]" : "bg-[#020617] border-white/5 hover:border-white/10"}`}
              >
                <p className="text-[13px] sm:text-xs text-[#8A8070] font-bold mb-0.5 sm:mb-1 leading-tight">{dir.name}</p>
                <p className="text-[13px] sm:text-xs font-bold text-[#F8F6F1] mb-0.5 sm:mb-1">ดาว {dir.star}</p>
                <p className="text-xl sm:text-2xl font-display font-bold text-[#C6A96B] mb-1 sm:mb-2">({dir.id === 9 ? '๙' : dir.id})</p>
                <div className="w-full space-y-0.5 sm:space-y-1 mt-auto">
                  {isCenter ? (
                    <div className="px-1 sm:px-2 py-0.5 sm:py-1 rounded-lg border border-[#C6A96B]/30 text-[#C6A96B] text-[12px] sm:text-xs font-bold w-full">วิญญาณธาตุ</div>
                  ) : (
                    <>
                      <div className={`px-1 sm:px-2 py-0.5 sm:py-1 rounded-lg border text-[12px] sm:text-xs font-bold w-full ${kalaBg}`}>กาล: {kalaLabel}</div>
                      <div className={`px-1 sm:px-2 py-0.5 sm:py-1 rounded-lg border text-[12px] sm:text-xs font-bold w-full ${birthBg}`}>เกิด: {birthLabel}</div>
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
