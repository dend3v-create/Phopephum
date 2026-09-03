/**
 * intentParser.server.ts — Rule-based Intent Parser (No AI credits)
 *
 * Parses user's free-text question → ParsedIntent
 * Rule-based only — AI is used ONLY for generating the final answer, not for parsing.
 *
 * Architecture: User Question → [this parser] → ParsedIntent → Orchestrator → AI
 */

export type IntentCategory =
  | "timing"       // เดินทางเวลาไหนดี, ออกจากบ้านเมื่อไหร่, ฤกษ์ทำสัญญา
  | "relationship" // ง้อแฟน, คนรัก, สัมพันธ์, แต่งงาน, หุ้นส่วน
  | "finance"      // เงิน, ลงทุน, ค้าขาย, ซื้อขาย, สัญญาธุรกิจ
  | "lost"         // ของหาย, สูญหาย, หาเจอไหม, ค้นหา
  | "health"       // ป่วย, โรค, รักษา, อาการ, หมอ
  | "career"       // งาน, สัมภาษณ์, เลื่อนตำแหน่ง, ลาออก, ธุรกิจ
  | "general"      // คำถามทั่วไปที่ไม่ตรงหมวดใด

export type ContextType =
  | "present_moment"  // ถามเรื่องตอนนี้ / ตอนเย็น / วันนี้
  | "near_future"     // ถามเรื่องวันหน้า / สัปดาห์นี้ / เดือนนี้
  | "person_specific" // ถามเกี่ยวกับคนที่ระบุ (แฟน, หัวหน้า, ลูกค้า)
  | "item_specific"   // ถามเกี่ยวกับสิ่งของ (กระเป๋า, สัญญา)

export interface ParsedIntent {
  raw: string
  category: IntentCategory
  context: ContextType
  keywords: string[]    // คำสำคัญที่ตรวจพบ (internal)
  confidence: number    // 0.0–1.0
}

// ─── Keyword Tables (verified from atthakarn KB + horaNuChat.ts) ─────────────

const TIMING_KEYWORDS = [
  "เดินทาง", "ออกเดินทาง", "เวลาไหน", "เมื่อไหร่", "ฤกษ์", "ฤกษ์ดี",
  "ช่วงเวลา", "วันไหน", "ออกจากบ้าน", "เริ่มต้น", "เปิดตัว", "เซ็น",
  "ทำสัญญา", "ประชุม", "เข้าพบ", "สัมภาษณ์", "ช่วงดี", "เวลาดี",
  "ไปเมื่อไหร่", "ออกไป", "วันดี", "วันมงคล", "ฤกษ์มงคล",
]

const RELATIONSHIP_KEYWORDS = [
  "แฟน", "คนรัก", "ง้อ", "คืนดี", "สัมพันธ์", "ความรัก", "แต่งงาน",
  "หุ้นส่วน", "คู่ชีวิต", "เพื่อน", "ทะเลาะ", "เลิก", "กลับมา",
  "หวานใจ", "กิ๊ก", "คบ", "จีบ", "ออกเดท", "นัด",
]

const FINANCE_KEYWORDS = [
  "เงิน", "ลงทุน", "ค้าขาย", "ซื้อ", "ขาย", "ธุรกิจ", "สัญญา",
  "กู้", "ยืม", "หุ้น", "กำไร", "ขาดทุน", "รายได้", "โชค",
  "โชคลาภ", "ทรัพย์", "เจ๊ง", "ปิดดีล", "เซ็นสัญญา", "เปิดร้าน",
  "ปิดการขาย", "การขาย", "ยอดขาย", "ลูกค้า",
]

const LOST_KEYWORDS = [
  "หาย", "สูญหาย", "ของหาย", "หาเจอ", "ค้นหา", "ทรัพย์หาย",
  "กระเป๋าหาย", "เงินหาย", "โทรศัพท์หาย", "ลืม", "วางไว้ที่ไหน",
  "หาไม่เจอ", "หายไปไหน", "หายได้ไหม",
]

const HEALTH_KEYWORDS = [
  "ป่วย", "โรค", "รักษา", "หมอ", "อาการ", "เจ็บ", "ไม่สบาย",
  "ผ่าตัด", "ยา", "โรงพยาบาล", "ฟื้นตัว", "หาย", "เจ็บป่วย",
]

const CAREER_KEYWORDS = [
  "งาน", "สัมภาษณ์", "เลื่อนตำแหน่ง", "ลาออก", "เปลี่ยนงาน",
  "หัวหน้า", "บริษัท", "โปรโมท", "ขึ้นเงินเดือน", "เริ่มงาน",
  "ธุรกิจ", "เปิดบริษัท", "ทำงาน", "สมัครงาน", "ได้งาน",
  "ลูกค้า", "พบลูกค้า", "หาลูกค้า", "เสนองาน", "เจรจา",
]

// ─── Context Keywords ─────────────────────────────────────────────────────────

const PRESENT_KEYWORDS = ["ตอนนี้", "วันนี้", "เดี๋ยวนี้", "ทันที", "ตอนเย็น", "เช้านี้", "คืนนี้"]
const FUTURE_KEYWORDS = ["วันหน้า", "พรุ่งนี้", "อาทิตย์หน้า", "เดือนหน้า", "เร็วๆ นี้", "สัปดาห์"]
const PERSON_KEYWORDS = ["แฟน", "หัวหน้า", "ลูกค้า", "เพื่อน", "คนรัก", "ครอบครัว", "คู่"]
const ITEM_KEYWORDS = ["กระเป๋า", "โทรศัพท์", "สัญญา", "เอกสาร", "กุญแจ", "รถ", "เงิน"]

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreKeywords(text: string, keywords: string[]): { count: number; matched: string[] } {
  const matched: string[] = []
  for (const kw of keywords) {
    if (text.includes(kw)) matched.push(kw)
  }
  return { count: matched.length, matched }
}

function inferContext(text: string): ContextType {
  if (scoreKeywords(text, ITEM_KEYWORDS).count > 0) return "item_specific"
  if (scoreKeywords(text, PERSON_KEYWORDS).count > 0) return "person_specific"
  if (scoreKeywords(text, FUTURE_KEYWORDS).count > 0) return "near_future"
  return "present_moment"
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

export function parseIntent(question: string): ParsedIntent {
  const text = question.trim()

  const scores: { category: IntentCategory; count: number; matched: string[] }[] = [
    { category: "timing",       ...scoreKeywords(text, TIMING_KEYWORDS) },
    { category: "lost",         ...scoreKeywords(text, LOST_KEYWORDS) },
    { category: "relationship", ...scoreKeywords(text, RELATIONSHIP_KEYWORDS) },
    { category: "finance",      ...scoreKeywords(text, FINANCE_KEYWORDS) },
    { category: "health",       ...scoreKeywords(text, HEALTH_KEYWORDS) },
    { category: "career",       ...scoreKeywords(text, CAREER_KEYWORDS) },
  ]

  // Sort by match count
  scores.sort((a, b) => b.count - a.count)

  const top = scores[0]

  if (!top || top.count === 0) {
    return {
      raw: text,
      category: "general",
      context: inferContext(text),
      keywords: [],
      confidence: 0.3,
    }
  }

  // Confidence: 1 match = 0.6, 2 = 0.8, 3+ = 0.95
  const confidence = top.count >= 3 ? 0.95 : top.count === 2 ? 0.8 : 0.6

  return {
    raw: text,
    category: top.category,
    context: inferContext(text),
    keywords: top.matched,
    confidence,
  }
}

// ─── Suggestion Chips (for UI) ────────────────────────────────────────────────

export interface SuggestionChip {
  label: string
  question: string
  category: IntentCategory
  emoji: string
}

export const SUGGESTION_CHIPS: SuggestionChip[] = [
  { label: "เดินทาง",   emoji: "✈️", category: "timing",       question: "วันนี้เดินทางช่วงเวลาไหนดีที่สุด?" },
  { label: "การเงิน",   emoji: "💰", category: "finance",      question: "วันนี้เหมาะกับการลงทุนหรือทำธุรกิจไหม?" },
  { label: "ความรัก",   emoji: "💛", category: "relationship", question: "วันนี้เหมาะกับการพูดคุยเรื่องความรักไหม?" },
  { label: "ของหาย",    emoji: "🔍", category: "lost",         question: "ของที่หายไปจะหาเจอได้ไหม?" },
  { label: "การงาน",    emoji: "💼", category: "career",       question: "วันนี้เหมาะกับการเจรจาธุรกิจหรือสัมภาษณ์งานไหม?" },
  { label: "สุขภาพ",    emoji: "🌿", category: "health",       question: "วันนี้ควรดูแลสุขภาพด้านไหนเป็นพิเศษ?" },
]
