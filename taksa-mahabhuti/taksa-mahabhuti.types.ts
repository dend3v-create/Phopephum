/**
 * taksa-mahabhuti.types.ts
 * Hora AI — Types สำหรับระบบทักษาคู่ธาตุ + มหาภูติ
 *
 * ใช้ร่วมกับ:
 *   - seven-numbers.ts (เลข 7 ตัว 9 ฐาน)
 *   - hora-calculator.ts (ยามอัฐกาล)
 *
 * @module taksa-mahabhuti.types
 * @version 1.0.0
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core Star Types
// ─────────────────────────────────────────────────────────────────────────────

/** เลขดาว 1–7 (โหราศาสตร์ไทย) */
export type StarNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** ชื่อดาวภาษาไทย */
export const STAR_NAMES: Record<StarNumber, string> = {
  1: "อาทิตย์",
  2: "จันทร์",
  3: "อังคาร",
  4: "พุธ",
  5: "พฤหัส",
  6: "ศุกร์",
  7: "เสาร์",
} as const;

/** วันเกิด (0=อาทิตย์ … 6=เสาร์) → เลขดาว */
export const DAY_TO_STAR: Record<number, StarNumber> = {
  0: 1, // อาทิตย์
  1: 2, // จันทร์
  2: 3, // อังคาร
  3: 4, // พุธ
  4: 5, // พฤหัส
  5: 6, // ศุกร์
  6: 7, // เสาร์
} as const;

/** Sequence เดิน Taksa [4,5,6,7,1,2,3] (ตามเข็มนาฬิกา) */
export const TAKSA_SEQUENCE: StarNumber[] = [4, 5, 6, 7, 1, 2, 3];

// ─────────────────────────────────────────────────────────────────────────────
// ทักษา (Taksa) Types
// ─────────────────────────────────────────────────────────────────────────────

/** 8 ภพทักษา */
export type TaksaBhop =
  | "บริวาร"    // 0 — จุดเริ่มต้น (บริวาร)
  | "อายุ"      // 1
  | "เดช"       // 2
  | "ศรี"       // 3
  | "มูละ"      // 4
  | "อุตสาหะ"  // 5
  | "มนตรี"    // 6
  | "กาลกิณี"; // 7 — อัปมงคล

export const TAKSA_BHOP: TaksaBhop[] = [
  "บริวาร", "อายุ", "เดช", "ศรี",
  "มูละ", "อุตสาหะ", "มนตรี", "กาลกิณี",
] as const;

/** แผนที่ ดาว → ภพทักษา */
export type TaksaMap = Record<StarNumber, TaksaBhop>;

/** ผลลัพธ์ทักษากำเนิด */
export interface TaksaNatalResult {
  /** แผนที่ดาว → ภพ */
  map: TaksaMap;
  /** ดาวบริวารกำเนิด */
  bariStar: StarNumber;
  /** ดาวเกิด (จากวันเกิด) */
  birthStar: StarNumber;
}

/** ผลลัพธ์ทักษาจร */
export interface TaksaTransitResult {
  /** แผนที่ดาว → ภพจร */
  map: TaksaMap;
  /** ดาวบริวารจรปีนี้ */
  bariStar: StarNumber;
  /** อายุย่าง */
  ageYang: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// คู่ธาตุ (Element Pairs) Types
// ─────────────────────────────────────────────────────────────────────────────

export type ElementType = "ไฟ" | "ดิน" | "ลม" | "น้ำ";

export interface ElementPair {
  element: ElementType;
  stars: [StarNumber, StarNumber];
  /** ลักษณะพลังงาน */
  nature: string;
}

export const ELEMENT_PAIRS: ElementPair[] = [
  { element: "ไฟ",  stars: [1, 7], nature: "ชื่อเสียง เกียรติยศ รวดเร็ว รุนแรง" },
  { element: "ดิน", stars: [2, 5], nature: "ความมั่นคง สมบูรณ์ ค่อยเป็นค่อยไป" },
  { element: "ลม",  stars: [3, 8], nature: "ว่องไว กระฉับกระเฉง กล้าแสดงออก" },
  { element: "น้ำ", stars: [4, 6], nature: "ความสุข ครอบครัว สบายๆ เรื่อยๆ" },
] as const;

/** ผลตรวจสอบคู่ธาตุ */
export interface ElementPairFlag {
  element: ElementType;
  stars: [StarNumber, StarNumber];
  nature: string;
  /** คู่ธาตุปรากฏในกำเนิดหรือไม่ */
  inNatal: boolean;
  /** คู่ธาตุปรากฏในจรหรือไม่ */
  inTransit: boolean;
  /** ทั้งกำเนิดและจร = มั่นคงถาวร */
  isPermanent: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// มหาภูติ (Mahabhuti) Types
// ─────────────────────────────────────────────────────────────────────────────

/** 7 ตำแหน่งมหาภูติ */
export type MahaBhop =
  | "ราชา"
  | "อธิบดี"
  | "ธงชัย"
  | "ขุมทรัพย์"
  | "มรณะ"
  | "โลกาวินาศ"
  | "อริ";

/** ลำดับเดิน sequence (เริ่มจากโลกาวินาศ) */
export const MAHA_SEQUENCE: MahaBhop[] = [
  "โลกาวินาศ", "อริ", "ขุมทรัพย์", "มรณะ",
  "อธิบดี", "ราชา", "ธงชัย",
] as const;

/** แผนที่ ภพมหาภูติ → เลขดาว */
export type MahaMap = Record<MahaBhop, StarNumber>;

/** ผลลัพธ์มหาภูติ */
export interface MahaBhutiResult {
  /** จุลศักราชที่ใช้คำนวณ */
  cs: number;
  /** เศษจาก cs % 7 (ปรับ 0 → 7) */
  remainder: number;
  /** แผนที่ภพ → ดาว */
  map: MahaMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cross-Check (ตรวจสอบข้ามศาสตร์) Types
// ─────────────────────────────────────────────────────────────────────────────

export type AlertLevel = "danger" | "warn" | "info" | "good";

export interface StarAlert {
  level: AlertLevel;
  star: StarNumber;
  starName: string;
  /** ภพทักษากำเนิด */
  taksaNatal: TaksaBhop;
  /** ภพทักษาจร */
  taksaTransit: TaksaBhop;
  /** ภพมหาภูติกำเนิด */
  mahaNatal: MahaBhop;
  /** ภพมหาภูติจร */
  mahaTransit: MahaBhop;
  /** คำอธิบาย */
  message: string;
}

/** ผลลัพธ์รวมทั้ง 3 ระบบ */
export interface TaksaMahaResult {
  /** ทักษากำเนิด */
  taksaNatal: TaksaNatalResult;
  /** ทักษาจร */
  taksaTransit: TaksaTransitResult;
  /** มหาภูติกำเนิด */
  mahaNatal: MahaBhutiResult;
  /** มหาภูติจร */
  mahaTransit: MahaBhutiResult;
  /** คู่ธาตุที่พบ */
  elementPairFlags: ElementPairFlag[];
  /** การแจ้งเตือนข้ามระบบ */
  alerts: StarAlert[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Input Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TaksaMahaInput {
  /** วันเกิด (JavaScript Date) */
  birthDate: Date;
  /** ปีเกิด พ.ศ. (เช่น 2525) */
  birthYearThai: number;
  /** ปีปัจจุบัน พ.ศ. (เช่น 2569) */
  currentYearThai: number;
  /** จุลศักราชปีเกิด (เช่น 1323) */
  csNatal: number;
  /** จุลศักราชปีปัจจุบัน (เช่น 1388) */
  csTransit: number;
}
