/**
 * taksa-mahabhuti.types.ts
 * Hora AI — Types + Constants สำหรับระบบทักษาคู่ธาตุ + มหาภูติ
 *
 * v2.0 — BREAKING CHANGES:
 *   - StarNumber: 1–7 → 1–8 (เพิ่มราหู = 8)
 *   - TAKSA_SEQUENCE: [4,5,6,7,1,2,3] → [1,2,3,4,7,5,8,6] (ลำดับดาวเสวยอายุ)
 *   - TaksaMap: รองรับ key 8 (ราหู)
 *   - เพิ่ม STAR_POWER — กำลังดาว (ปีเสวยอายุ) รวม 108 ปี
 *   - เพิ่ม SawaiResult — ผลดาวเสวยอายุ + ดาวแทรก
 *   - TaksaMahaInput: ใช้ checkDate แทน birthYearThai/currentYearThai
 *   - ELEMENT_PAIRS: ลม → [3,8] (ราหู) ไม่ใช่ [3,6]
 *
 * @module taksa-mahabhuti.types
 * @version 2.0.0
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core Star Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * เลขดาว 1–8
 *   1=อาทิตย์  2=จันทร์  3=อังคาร  4=พุธ
 *   5=พฤหัส   6=ศุกร์   7=เสาร์   8=ราหู
 */
export type StarNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** วันเกิด (0=อาทิตย์ … 6=เสาร์) → เลขดาว */
export const DAY_TO_STAR: Record<number, StarNumber> = {
  0: 1,
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: 7,
} as const;

/**
 * ลำดับดาว 8 ดวง (ดาวเสวยอายุ)
 * อาทิตย์→จันทร์→อังคาร→พุธ→เสาร์→พฤหัส→ราหู→ศุกร์
 * (ใช้สำหรับ calcSawai เท่านั้น — ทักษาจรใช้ PATH_9 จาก SEQ_STARS_8)
 */
export const TAKSA_SEQUENCE: StarNumber[] = [1, 2, 3, 4, 7, 5, 8, 6] as const;

/**
 * กำลังดาว (จำนวนปีเสวยอายุ) รวม 108 ปี
 *   อาทิตย์=6  จันทร์=15  อังคาร=8   พุธ=17
 *   เสาร์=10   พฤหัส=19  ราหู=12    ศุกร์=21
 */
export const STAR_POWER: Record<StarNumber, number> = {
  1: 6,
  2: 15,
  3: 8,
  4: 17,
  7: 10,
  5: 19,
  8: 12,
  6: 21,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// ทักษา (Taksa) Types
// ─────────────────────────────────────────────────────────────────────────────

/** 8 ภพทักษา */
export type TaksaBhop =
  | "บริวาร"
  | "อายุ"
  | "เดช"
  | "ศรี"
  | "มูละ"
  | "อุตสาหะ"
  | "มนตรี"
  | "กาลกิณี";

export const TAKSA_BHOP: TaksaBhop[] = [
  "บริวาร", "อายุ", "เดช", "ศรี",
  "มูละ", "อุตสาหะ", "มนตรี", "กาลกิณี",
] as const;

/**
 * แผนที่ดาว → ภพทักษา
 * key = StarNumber (1–8), value = TaksaBhop
 */
export type TaksaMap = Record<StarNumber, TaksaBhop>;

/** ผลลัพธ์ทักษากำเนิด */
export interface TaksaNatalResult {
  map: TaksaMap;
  /** ดาวบริวารกำเนิด (= ดาววันเกิด) */
  bariStar: StarNumber;
  /** ดาวกาลกิณีกำเนิด */
  kalakiniStar: StarNumber;
}

/** ผลลัพธ์ทักษาจรรายปี */
export interface TaksaTransitResult {
  map: TaksaMap;
  /** ดาวบริวารจรปีนี้ */
  bariStar: StarNumber;
  /** ดาวกาลกิณีจร */
  kalakiniStar: StarNumber;
  /** อายุย่าง ณ วันที่ตรวจ */
  ageYang: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ดาวเสวยอายุ + ดาวแทรก (Sawai / Sub-period)
// ─────────────────────────────────────────────────────────────────────────────

/** ผลดาวเสวยอายุ + ดาวแทรก */
export interface SawaiResult {
  sawaiStar: StarNumber;
  sawaiStarName: string;
  sawaiAgeStart: number;
  sawaiAgeEnd: number;
  sawaiDateStart: Date;
  sawaiDateEnd: Date;
  subStar: StarNumber;
  subStarName: string;
  subDateStart: Date;
  subDateEnd: Date;
  subDurationDays: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// คู่ธาตุ (Element Pairs) Types
// ─────────────────────────────────────────────────────────────────────────────

export type ElementType = "ไฟ" | "ดิน" | "ลม" | "น้ำ";

export interface ElementPair {
  element: ElementType;
  stars: [StarNumber, StarNumber];
  nature: string;
}

export const ELEMENT_PAIRS: ElementPair[] = [
  { element: "ไฟ",  stars: [1, 7], nature: "ชื่อเสียง เกียรติยศ รวดเร็ว รุนแรง" },
  { element: "ดิน", stars: [2, 5], nature: "ความมั่นคง สมบูรณ์ ค่อยเป็นค่อยไป" },
  { element: "ลม",  stars: [3, 8], nature: "ว่องไว กระฉับกระเฉง กล้าแสดงออก" },
  { element: "น้ำ", stars: [4, 6], nature: "ความสุข ครอบครัว สบายๆ เรื่อยๆ" },
] as const;

export interface ElementPairFlag {
  element: ElementType;
  stars: [StarNumber, StarNumber];
  nature: string;
  inNatal: boolean;
  inTransit: boolean;
  isPermanent: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// มหาภูติ (Mahabhuti) Types
// ─────────────────────────────────────────────────────────────────────────────

export type MahaBhop =
  | "ราชา"
  | "อธิบดี"
  | "ธงชัย"
  | "ขุมทรัพย์"
  | "มรณะ"
  | "โลกาวินาศ"
  | "อริ";

/**
 * ลำดับเดิน Sequence มหาภูติ (เริ่มจากโลกาวินาศ)
 */
export const MAHA_SEQUENCE: MahaBhop[] = [
  "โลกาวินาศ", "อริ", "ขุมทรัพย์", "มรณะ",
  "อธิบดี", "ราชา", "ธงชัย",
] as const;

/** แผนที่ ภพมหาภูติ → เลขดาว (1–7 เท่านั้น ราหูไม่มีในมหาภูติ) */
export type MahaMap = Record<MahaBhop, number>;

export interface MahaBhutiResult {
  cs: number;
  remainder: number;
  map: MahaMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cross-Check Types
// ─────────────────────────────────────────────────────────────────────────────

export type AlertLevel = "danger" | "warn" | "info" | "good";

export interface StarAlert {
  level: AlertLevel;
  star: StarNumber;
  starName: string;
  taksaNatal: TaksaBhop;
  taksaTransit: TaksaBhop;
  mahaNatal?: MahaBhop;
  mahaTransit?: MahaBhop;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ผลลัพธ์รวม
// ─────────────────────────────────────────────────────────────────────────────

export interface TaksaMahaResult {
  taksaNatal: TaksaNatalResult;
  taksaTransit: TaksaTransitResult;
  mahaNatal: MahaBhutiResult;
  mahaTransit: MahaBhutiResult;
  sawai: SawaiResult;
  elementPairFlags: ElementPairFlag[];
  alerts: StarAlert[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Input Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TaksaMahaInput {
  /** วันเกิด (JavaScript Date, Gregorian) */
  birthDate: Date;
  /** วันที่ต้องการตรวจดวง (ใช้คำนวณ ageYang แม่นยำ) */
  checkDate: Date;
  /** จุลศักราชปีเกิด — พ.ศ. - 1181 */
  csNatal: number;
  /** จุลศักราชปีที่ตรวจดวง */
  csTransit: number;
}
