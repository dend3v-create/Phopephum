import { StarNumber, STAR_NAMES, SystematicRahuResult, SystematicAtthakarnResult } from "@phopephum/types";

/**
 * Time-based Astrology Engines (v2.0)
 * 1. Atthakarn (ยามอัฐกาล) - 8 Major x 8 Sub-watches
 * 2. Rahu (ยามราหูค้นทรัพย์) - 9 Sub-watches (10 mins each)
 */

// ── Constants ────────────────────────────────────────────────────────────────

const PLANET_ORDER_DAY = [1, 6, 4, 2, 7, 5, 3]; // อาทิตย์ -> ศุกร์ -> พุธ -> จันทร์ -> เสาร์ -> พฤหัส -> อังคาร (+5)
const PLANET_ORDER_NIGHT = [1, 5, 2, 6, 3, 7, 4]; // อาทิตย์ -> พฤหัส -> จันทร์ -> ศุกร์ -> อังคาร -> เสาร์ -> พุธ (+4)

// วัน (0=อาทิตย์ ... 6=เสาร์) -> จุดเริ่มในลำดับดาว
const DAY_TO_PLANET_IDX: Record<number, number> = {
  0: 0, // อาทิตย์ (เริ่ม 1)
  1: 3, // จันทร์ (เริ่ม 2)
  2: 6, // อังคาร (เริ่ม 3)
  3: 2, // พุธ (เริ่ม 4)
  4: 5, // พฤหัส (เริ่ม 5)
  5: 1, // ศุกร์ (เริ่ม 6)
  6: 4, // เสาร์ (เริ่ม 7)
};

const RAHU_WATCHES: Omit<SystematicRahuResult, "minutesRange">[] = [
  { id: 1, name: "ทาษา", quality: "bad" },
  { id: 2, name: "คหปติ", quality: "good" },
  { id: 3, name: "โจโร", quality: "bad" },
  { id: 4, name: "เสนาปติ", quality: "good" },
  { id: 5, name: "กาลทัณฑ์", quality: "bad" },
  { id: 6, name: "กัลยาณ์", quality: "good" },
  { id: 7, name: "มหายักษ์", quality: "bad" },
  { id: 8, name: "ธนบดินทร์", quality: "good" },
  { id: 9, name: "นักพรต", quality: "neutral" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getBKKMinutes(date: Date): number {
  const bkkDate = new Date(date.getTime() + (date.getTimezoneOffset() + 420) * 60000);
  return bkkDate.getHours() * 60 + bkkDate.getMinutes();
}

/**
 * หาวันทางโหราศาสตร์ (เปลี่ยนวันตอน 06:00 น. ตามคำขอผู้ใช้)
 */
function getAstrologicalBKKDay(date: Date): number {
  const bkkDate = new Date(date.getTime() + (date.getTimezoneOffset() + 420) * 60000);
  const totalMin = bkkDate.getHours() * 60 + bkkDate.getMinutes();
  
  // ถ้าก่อน 06:00 น. (360 นาที) ให้ถอยหลังไป 1 วัน
  if (totalMin < 360) {
    const yesterday = new Date(bkkDate.getTime() - 24 * 60 * 60 * 1000);
    return yesterday.getDay();
  }
  return bkkDate.getDay();
}

// ── Core Engines ─────────────────────────────────────────────────────────────

/**
 * คำนวณยามอัฐกาล (Major Slot 90 นาที, Sub Slot 11.25 นาที)
 */
export function calculateAtthakarn(date: Date): SystematicAtthakarnResult {
  const totalMin = getBKKMinutes(date);
  const dow = getAstrologicalBKKDay(date);

  const isDaytime = totalMin >= 360 && totalMin <= 1080; // 06:00–18:00
  const baseMin = isDaytime ? 360 : (totalMin < 360 ? 1081 - 1440 : 1081);
  const elapsed = (totalMin - baseMin + 1440) % 1440;

  const majorIndex = Math.floor(elapsed / 90); // 0–7
  const subIndex = Math.floor((elapsed % 90) / (90 / 8)); // 0–7

  let majorPlanet: StarNumber;
  
  // พิเศษ: ยามอัฐกาลวันจันทร์ กลางวัน (มีการแก้ไขตามตำราเฉพาะ)
  // ลำดับ: [2, 6, 4, 2, 5, 3, 1, 6]
  if (dow === 1 && isDaytime) {
    const mondayDaySequence = [2, 6, 4, 2, 5, 3, 1, 6];
    majorPlanet = mondayDaySequence[majorIndex] as StarNumber;
  } else {
    const order = isDaytime ? PLANET_ORDER_DAY : PLANET_ORDER_NIGHT;
    const startIdx = DAY_TO_PLANET_IDX[dow] ?? 0;
    majorPlanet = order[(startIdx + majorIndex) % 7] as StarNumber;
  }

  const order = isDaytime ? PLANET_ORDER_DAY : PLANET_ORDER_NIGHT;
  const subPlanet = order[(order.indexOf(majorPlanet) + subIndex) % 7] as StarNumber;

  // คำนวณเวลาเริ่มต้น-สิ้นสุดของยามใหญ่
  const startTotal = (baseMin + majorIndex * 90 + 1440) % 1440;
  const endTotal = (baseMin + (majorIndex + 1) * 90 + 1440) % 1440;

  const startH = Math.floor(startTotal / 60);
  const startM = startTotal % 60;
  const endH = Math.floor(endTotal / 60);
  const endM = endTotal % 60;

  return {
    majorPlanet,
    subPlanet,
    majorSlot: majorIndex + 1, // 1–8
    subSlot: subIndex + 1,     // 1–8
    isDaytime,
    startTime: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
    endTime: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
    planetName: STAR_NAMES[majorPlanet],
    subPlanetName: STAR_NAMES[subPlanet],
  };
}

/**
 * คำนวณยามราหูค้นทรัพย์ (10 นาทีต่อยามย่อย ใน 90 นาที)
 */
export function calculateRahu(date: Date): SystematicRahuResult {
  const totalMin = getBKKMinutes(date);
  const isDaytime = totalMin >= 360 && totalMin <= 1080;
  const baseMin = isDaytime ? 360 : (totalMin < 360 ? 1081 - 1440 : 1081);
  const elapsed = (totalMin - baseMin + 1440) % 1440;

  const subIdx = Math.floor((elapsed % 90) / 10); // 0–8
  const watch = RAHU_WATCHES[Math.min(subIdx, 8)]!;

  return {
    ...watch,
    minutesRange: [subIdx * 10, (subIdx + 1) * 10],
  };
}
