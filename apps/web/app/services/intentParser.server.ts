/**
 * intentParser.server.ts — 4 Sacred Engines Intent Parser & Router (PhopePhum V3)
 *
 * แปลงคำถามภาษาธรรมชาติของผู้ใช้ → จัดหมวดหมู่ ๔ ศาสตร์พยากรณ์หลักที่ตรงตามหลักวิชาการแท้จริง:
 * ๑. โหรทายหนู (horanu): เรื่องเฉพาะหน้า, คำถามทั่วไป, จะได้ไหม, จะสำเร็จไหม, ลัคนายาม ๑๒ ภพ
 * ๒. ยามอัฏฐกาล (yam): ถามยาม, ช่วงเวลาในวัน, เลือกวันเดินทาง, วันเวลาเจรจาธุรกิจที่จะสำเร็จ
 * ๓. กาลชะตา (karnchata): วางแผนเป็นรายวัน รายชั่วโมง, การเจรจาสำคัญ, ขอแต่งงาน, การขาย/ปิดดีล
 * ๔. ราหูค้นทรัพย์ (rahu): ถามฤกษ์ย่อย ๑๐ นาที (๑ ยาม ๙ ฤกษ์), ตามหาของหาย อยู่ไหน ตกหล่นอย่างไร
 */

export type SacredEngineCategory = "horanu" | "yam" | "karnchata" | "rahu";

export type IntentCategory =
  | "horanu"       // เรื่องเฉพาะหน้า, สำเร็จไหม, จะได้ไหม
  | "yam"          // ยาม, ช่วงเวลา, เลือกวันเดินทาง, เวลาสำเร็จ
  | "karnchata"    // วางแผนรายวัน รายชั่วโมง, เจรจา, แต่งงาน, ขาย
  | "rahu"         // ฤกษ์ย่อย 10 นาที, ของหาย
  | "timing"       // Legacy alias -> map to yam / rahu
  | "relationship" // Legacy alias -> map to karnchata / horanu
  | "finance"      // Legacy alias -> map to karnchata / horanu
  | "lost"         // Legacy alias -> map to rahu
  | "health"       // Legacy alias -> map to horanu
  | "career"       // Legacy alias -> map to karnchata / yam
  | "general";     // Legacy alias -> map to horanu

export type ContextType =
  | "present_moment"  // ถามเรื่องตอนนี้ / ตอนนี้เลย / วันนี้
  | "near_future"     // ถามเรื่องวันหน้า / พรุ่งนี้ / สัปดาห์นี้
  | "person_specific" // ถามเกี่ยวกับคน (แฟน, คู่ค้า, หัวหน้า)
  | "item_specific";  // ถามเกี่ยวกับสิ่งของ ทรัพย์สิน ของหาย

export interface SacredEngineInfo {
  id: SacredEngineCategory;
  title: string;
  subtitle: string;
  route: string;
  icon: string;
  badgeLabel: string;
  badgeColor: string;
  reason: string;
}

export const SACRED_ENGINES: Record<SacredEngineCategory, SacredEngineInfo> = {
  horanu: {
    id: "horanu",
    title: "โหรทายหนู (ยามพรายกระซิบ)",
    subtitle: "คำนวณเหตุการณ์เฉพาะหน้า ตอบคำถามเร่งด่วน ผังดวง ๑๒ ภพ",
    route: "/dashboard/horanu",
    icon: "🎯",
    badgeLabel: "โหรทายหนู · เรื่องเฉพาะหน้า",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    reason: "เหมาะที่สุดสำหรับคำนวณเหตุการณ์เฉพาะหน้าหรือตอบคำถามเร่งด่วน โดยอาศัยหลักการเทียบเวลาและวันเกิดเหตุการณ์จริงกับตำแหน่งดาว ๑๒ ภพ",
  },
  yam: {
    id: "yam",
    title: "ยามอัฏฐกาล (๘ ยาม)",
    subtitle: "เลือกช่วงเวลาเดินทาง วันมงคล และเวลาเจรจาธุรกิจที่จะสำเร็จ",
    route: "/dashboard/yam",
    icon: "⏰",
    badgeLabel: "ยามอัฏฐกาล · ช่วงเวลาสำเร็จ",
    badgeColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
    reason: "เหมาะที่สุดสำหรับการเลือกยามมงคล วันเดินทางไกล และช่วงเวลาเริ่มต้นเจรจาธุรกิจที่มีเกณฑ์สำเร็จสูงสุด",
  },
  karnchata: {
    id: "karnchata",
    title: "กาลชะตา (ยามซอยรายชั่วโมง)",
    subtitle: "วางแผนกลยุทธ์รายวัน รายชั่วโมง เจรจา ขอแต่งงาน ปิดการขาย",
    route: "/dashboard/karnchata",
    icon: "📅",
    badgeLabel: "กาลชะตา · แผนงานรายชั่วโมง",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
    reason: "เหมาะที่สุดสำหรับการวางแผนไทม์ไลน์รายชั่วโมงตลอดวัน ในการนัดเจรจา ขอแต่งงาน หรือจังหวะปิดการขาย",
  },
  rahu: {
    id: "rahu",
    title: "ราหูค้นทรัพย์ (๙ ฤกษ์ย่อย ๑๐ นาที)",
    subtitle: "ฤกษ์ย่อยฉับพลัน และสแกนตำแหน่งหาของหาย ตกหล่นอยู่ที่ไหน",
    route: "/dashboard/rahu",
    icon: "🧭",
    badgeLabel: "ราหูค้นทรัพย์ · ฤกษ์ย่อย/ของหาย",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    reason: "เหมาะที่สุดสำหรับการดูฤกษ์ย่อย ๑๐ นาที (๑ ยามมี ๙ ฤกษ์) และการสแกนทิศทางตามหาของหายและทรัพย์สินที่ตกหล่น",
  },
};

export interface ParsedIntent {
  raw: string;
  category: IntentCategory;
  sacredEngine: SacredEngineCategory;
  targetRoute: string;
  targetEngineTitle: string;
  targetEngineReason: string;
  context: ContextType;
  keywords: string[];
  confidence: number;
}

// ─── Keyword Tables ──────────────────────────────────────────────────────────

// ๑. โหรทายหนู (Horanu): เรื่องเฉพาะหน้า, ทั่วไป, จะได้ไหม, สำเร็จไหม
const HORANU_KEYWORDS = [
  "จะได้ไหม", "สำเร็จไหม", "จะสำเร็จไหม", "ผ่านไหม", "จะผ่านไหม",
  "ได้ไหม", "รอดไหม", "จะรอดไหม", "ดีไหม", "ตอบรับไหม", "จะตอบรับไหม",
  "ตกลงไหม", "ผลลัพธ์", "เฉพาะหน้า", "ด่วน", "ตอนนี้เลย", "ทันไหม",
  "สมหวังไหม", "แก้ปัญหา", "มีโอกาสไหม", "จะดีไหม", "จริงไหม",
  "จะกลับมาไหม", "เลิกไหม", "รักจริงไหม", "ทายหนู", "พรายกระซิบ",
];

// ๒. ยามอัฏฐกาล (Yam): ยาม, ช่วงเวลา, เลือกวันเดินทาง, วันเวลาเจรจาธุรกิจสำเร็จ
const YAM_KEYWORDS = [
  "ยาม", "ยามไหน", "ยามอะไร", "ช่วงเวลา", "ช่วงเวลาไหน", "เวลาไหนดี",
  "วันไหนดี", "วันไหน", "เดินทาง", "ออกเดินทาง", "ออกจากบ้าน",
  "ไปต่างจังหวัด", "ขึ้นเครื่อง", "ออกรถ", "วันเวลาเจรจา", "วันเจรจา",
  "เจรจาธุรกิจสำเร็จ", "วันมงคล", "ยามดี", "ยามมงคล", "ทิศมงคล",
  "ทิศไหน", "ทิศดี", "ยามอุบาทว์", "ยามปลอด", "อัฏฐกาล",
];

// ๓. กาลชะตา (Karnchata): วางแผนรายวัน รายชั่วโมง, เจรจา, ขอแต่งงาน, การขาย
const KARNCHATA_KEYWORDS = [
  "วางแผน", "รายวัน", "รายชั่วโมง", "ไทม์ไลน์", "ตลอดทั้งวัน", "กำหนดการ",
  "ขอแต่งงาน", "ขอแฟนแต่งงาน", "สารภาพรัก", "ปิดการขาย", "ปิดดีล",
  "การขาย", "นัดพบเจรจา", "ขั้นตอน", "กาลชะตา", "ชั่วโมงไหน",
  "ยามซอย", "นัดหมาย", "ตารางเวลา", "เข้าพบผู้ใหญ่", "คุยธุรกิจ",
];

// ๔. ราหูค้นทรัพย์ (Rahu): ฤกษ์ย่อย 10 นาที, ของหาย, อยู่ไหน อย่างไร
const RAHU_KEYWORDS = [
  "ฤกษ์", "ฤกษ์ย่อย", "10 นาที", "๑๐ นาที", "ฤกษ์ด่วน", "ฤกษ์ฉับพลัน",
  "ของหาย", "หาย", "สูญหาย", "อยู่ไหน", "อยู่ที่ไหน", "หาเจอไหม",
  "กระเป๋าหาย", "โทรศัพท์หาย", "กุญแจหาย", "ลืมของ", "ตกหล่น",
  "ของตก", "ลืมไว้ที่ไหน", "หาไม่เจอ", "ราหู", "ราหูค้นทรัพย์", "ค้นทรัพย์",
];

// Context keywords
const PRESENT_KEYWORDS = ["ตอนนี้", "วันนี้", "เดี๋ยวนี้", "ทันที", "ตอนเย็น", "เช้านี้", "คืนนี้"];
const FUTURE_KEYWORDS = ["วันหน้า", "พรุ่งนี้", "อาทิตย์หน้า", "เดือนหน้า", "เร็วๆ นี้", "สัปดาห์"];
const PERSON_KEYWORDS = ["แฟน", "หัวหน้า", "ลูกค้า", "เพื่อน", "คนรัก", "ครอบครัว", "คู่"];
const ITEM_KEYWORDS = ["กระเป๋า", "โทรศัพท์", "สัญญา", "เอกสาร", "กุญแจ", "รถ", "เงิน", "ของ"];

function scoreKeywords(text: string, keywords: string[]): { count: number; matched: string[] } {
  const matched: string[] = [];
  for (const kw of keywords) {
    if (text.includes(kw)) matched.push(kw);
  }
  return { count: matched.length, matched };
}

function inferContext(text: string): ContextType {
  if (scoreKeywords(text, ITEM_KEYWORDS).count > 0) return "item_specific";
  if (scoreKeywords(text, PERSON_KEYWORDS).count > 0) return "person_specific";
  if (scoreKeywords(text, FUTURE_KEYWORDS).count > 0) return "near_future";
  return "present_moment";
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

export function parseIntent(question: string): ParsedIntent {
  const text = question.trim();

  const scores: { engine: SacredEngineCategory; count: number; matched: string[] }[] = [
    { engine: "rahu",      ...scoreKeywords(text, RAHU_KEYWORDS) },
    { engine: "karnchata", ...scoreKeywords(text, KARNCHATA_KEYWORDS) },
    { engine: "yam",       ...scoreKeywords(text, YAM_KEYWORDS) },
    { engine: "horanu",    ...scoreKeywords(text, HORANU_KEYWORDS) },
  ];

  // เรียงตามจำนวนคำที่ตรงกันมากที่สุด
  scores.sort((a, b) => b.count - a.count);

  const top = scores[0];

  // ถ้าไม่มี match ชัดเจน หรือถามกว้างๆ:
  // คำถามปลายปิด/เหตุการณ์เฉพาะหน้าส่วนใหญ่ในชีวิตประจำวัน ให้ default เป็น โหรทายหนู (horanu)
  let detectedEngine: SacredEngineCategory = "horanu";
  let matchedWords: string[] = [];
  let confidence = 0.5;

  if (top && top.count > 0) {
    detectedEngine = top.engine;
    matchedWords = top.matched;
    confidence = top.count >= 3 ? 0.95 : top.count === 2 ? 0.85 : 0.7;
  } else {
    // ตรวจสอบบริบทถ้ามีคำว่า หาย/ของ
    if (text.includes("หาย") || text.includes("ลืม")) {
      detectedEngine = "rahu";
      confidence = 0.75;
    } else if (text.includes("เวลา") || text.includes("กี่โมง") || text.includes("เดินทาง")) {
      detectedEngine = "yam";
      confidence = 0.75;
    } else if (text.includes("แผน") || text.includes("ขาย") || text.includes("แต่งงาน")) {
      detectedEngine = "karnchata";
      confidence = 0.75;
    }
  }

  const engineInfo = SACRED_ENGINES[detectedEngine];

  return {
    raw: text,
    category: detectedEngine,
    sacredEngine: detectedEngine,
    targetRoute: engineInfo.route,
    targetEngineTitle: engineInfo.title,
    targetEngineReason: engineInfo.reason,
    context: inferContext(text),
    keywords: matchedWords,
    confidence,
  };
}

// ─── Suggestion Chips (4 ประตูหลัก + คำถามตัวอย่าง) ───────────────────────────

export interface SuggestionChip {
  label: string;
  question: string;
  category: SacredEngineCategory;
  emoji: string;
  badge: string;
}

export const SUGGESTION_CHIPS: SuggestionChip[] = [
  {
    label: "เรื่องเฉพาะหน้า",
    emoji: "🎯",
    category: "horanu",
    question: "ข้อตกลงนี้จะสำเร็จลุล่วงสมหวังไหม?",
    badge: "โหรทายหนู ๑๒ ภพ",
  },
  {
    label: "เลือกยามเดินทาง",
    emoji: "⏰",
    category: "yam",
    question: "วันนี้ควรออกเดินทางช่วงยามใดดีที่สุด?",
    badge: "ยามอัฏฐกาล ๘ ยาม",
  },
  {
    label: "วางแผนรายชั่วโมง",
    emoji: "📅",
    category: "karnchata",
    question: "วางแผนเข้าพบเจรจาปิดการขายวันนี้ช่วงชั่วโมงไหนดี?",
    badge: "กาลชะตา ยามซอย",
  },
  {
    label: "ตามหาของหาย",
    emoji: "🧭",
    category: "rahu",
    question: "ของที่ทำหล่นหายไป อยู่ทิศไหนและจะหาเจอได้อย่างไร?",
    badge: "ราหูค้นทรัพย์ ๑๐ นาที",
  },
  {
    label: "เจรจาธุรกิจสำเร็จ",
    emoji: "💼",
    category: "yam",
    question: "วันและเวลาใดเหมาะแก่การนัดเจรจาธุรกิจให้สำเร็จ?",
    badge: "ยามอัฏฐกาล ๘ ยาม",
  },
  {
    label: "ฤกษ์ขอแต่งงาน",
    emoji: "💍",
    category: "karnchata",
    question: "วางแผนฤกษ์ชั่วโมงมงคลสำหรับขอแต่งงานในวันนี้",
    badge: "กาลชะตา ยามซอย",
  },
];
