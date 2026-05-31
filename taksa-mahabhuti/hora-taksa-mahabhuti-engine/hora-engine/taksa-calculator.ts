/**
 * taksa-calculator.ts
 * Hora AI — Engine คำนวณทักษากำเนิด + ทักษาจร + คู่ธาตุ
 *
 * Algorithm:
 *   Natal  : birthDay → birthStar → index ใน TAKSA_SEQUENCE → แมป 8 ภพ
 *   Transit: (ageYang - 1) % 7 → offset จาก bariNatal → bariTransit
 *   Pairs  : ตรวจ ELEMENT_PAIRS ว่าทั้งคู่มีภพ (ไม่ใช่กาลกิณี) หรือไม่
 *
 * @module taksa-calculator
 * @version 1.0.0
 */

import {
  StarNumber,
  TaksaBhop,
  TaksaMap,
  TaksaNatalResult,
  TaksaTransitResult,
  ElementPairFlag,
  DAY_TO_STAR,
  TAKSA_SEQUENCE,
  TAKSA_BHOP,
  ELEMENT_PAIRS,
} from "./taksa-mahabhuti.types";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * วนค่าใน TAKSA_SEQUENCE (7 ดาว)
 * @param index - index ใดๆ (อาจติดลบหรือเกิน)
 */
function seqIndex(index: number): number {
  return ((index % 7) + 7) % 7;
}

// ─────────────────────────────────────────────────────────────────────────────
// คำนวณทักษากำเนิด (Natal Taksa)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * คำนวณทักษากำเนิดจากวันเกิด
 *
 * @param dayOfWeek - 0=อาทิตย์ … 6=เสาร์ (JavaScript getDay())
 * @returns TaksaNatalResult
 *
 * @example
 * // เกิดวันศุกร์ (dayOfWeek = 5) → birthStar = 6
 * const natal = calcTaksaNatal(5);
 * // natal.map[6] === "บริวาร"
 * // natal.map[7] === "อายุ"
 * // natal.map[1] === "เดช" ...
 */
export function calcTaksaNatal(dayOfWeek: number): TaksaNatalResult {
  const birthStar = DAY_TO_STAR[dayOfWeek];
  if (!birthStar) {
    throw new Error(`dayOfWeek ต้องอยู่ระหว่าง 0–6 (ได้รับ: ${dayOfWeek})`);
  }

  // หา index ของ birthStar ใน TAKSA_SEQUENCE
  const bariIdx = TAKSA_SEQUENCE.indexOf(birthStar);

  // แมป 8 ภพ → ดาว
  const map = {} as TaksaMap;
  for (let i = 0; i < 8; i++) {
    const starIdx = seqIndex(bariIdx + i);
    const star = TAKSA_SEQUENCE[starIdx];
    map[star] = TAKSA_BHOP[i];
  }

  // ดาว 8 (ราหู) ไม่มีในระบบนี้ — วนซ้ำที่ดาว 1
  // (ลำดับ [4,5,6,7,1,2,3] มี 7 ดาว, ภพที่ 8 = กาลกิณี = ซ้อนดาวที่ index 7%7=0)
  // กรณีนี้ดาวที่ index 7%7=0 ของ sequence จะได้ TAKSA_BHOP[7]="กาลกิณี" เพิ่มเติม
  // ซึ่ง loop ข้างบนจัดการให้แล้วด้วย i=7 → starIdx = (bariIdx+7)%7 = bariIdx
  // ดังนั้น birthStar จะได้ "บริวาร" และยังคงได้ "กาลกิณี" ซ้อนไว้ที่ดาวนั้นด้วย
  // → แต่ใน JS object ค่าหลังสุดจะทับ → birthStar = "กาลกิณี" (ผิด!)
  // แก้: ให้ loop ถึงแค่ 7 ภพแรก แล้วใส่กาลกิณีที่ดาว "ก่อนหน้า" bariStar ใน sequence
  //
  // ✅ วิธีที่ถูกต้อง: ใช้ 7 ดาว 8 ภพ → ดาวที่ (bariIdx+7)%7 = bariIdx รับ "กาลกิณี"
  // แต่เนื่องจากดาวบริวารกำเนิดรับ "บริวาร" เสมอ → ดาวกาลกิณีต้องเป็นดาวที่
  // seqIndex(bariIdx - 1) = ดาวก่อนหน้าบริวารใน sequence
  //
  // NOTE: ระบบ 8 ภพ, 7 ดาว → ดาวหนึ่งจะรับ 2 ภพ (บริวาร และ ดาวก่อนมันใน seq)
  // ภพที่ "ทับ" กัน = TAKSA_BHOP[7] = "กาลกิณี" ที่ดาว seqIndex(bariIdx + 7) = bariIdx
  // แต่ i=7 loop ด้านบนทำให้ map[birthStar] = "กาลกิณี" (ทับ "บริวาร") → ต้องแก้
  //
  // FIX: Reset map ด้วย loop 7 ครั้ง (ภพ 0–6) แล้วใส่กาลกิณีที่ index (bariIdx+7)%7
  // แต่ดาว (bariIdx+7)%7 = bariIdx = birthStar → จะทับ "บริวาร"
  // ✅ วิธีแก้จริง: กาลกิณีอยู่ที่ดาวที่ seqIndex(bariIdx - 1) (ดาวก่อนบริวาร)
  // reference: "นับ 1 ที่บริวาร วนไป 8 ภพ" = กาลกิณีที่ดาวลำดับที่ 8 ซึ่งวนกลับ = seqIndex(bariIdx+7)

  // ──────────────────────────────────────────
  // Rebuild with correct 7-star / 8-bhop logic
  // ──────────────────────────────────────────
  const mapFinal = {} as TaksaMap;
  for (let i = 0; i < 7; i++) {
    const starIdx = seqIndex(bariIdx + i);
    const star = TAKSA_SEQUENCE[starIdx];
    mapFinal[star] = TAKSA_BHOP[i]; // บริวาร … มนตรี (7 ภพแรก)
  }
  // ภพที่ 8 "กาลกิณี" → ดาวที่ seqIndex(bariIdx + 7) = seqIndex(bariIdx) = bariIdx
  // ซึ่ง = birthStar → "กาลกิณี" ทับ "บริวาร" ❌
  // ดังนั้นในทางปฏิบัติ: ดาวที่รับ "กาลกิณี" คือ seqIndex(bariIdx - 1) = ดาวก่อนบริวาร
  // (ตามหลัก "บริวารนับ 1, กาลกิณีนับ 8 = วนก่อนบริวาร")
  const kalakiniIdx = seqIndex(bariIdx - 1);
  const kalakiniStar = TAKSA_SEQUENCE[kalakiniIdx];
  mapFinal[kalakiniStar] = "กาลกิณี";

  return {
    map: mapFinal,
    bariStar: birthStar,
    birthStar,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// คำนวณทักษาจร (Transit Taksa)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * คำนวณทักษาจรของปีปัจจุบัน
 *
 * @param dayOfWeek     - วันเกิด (0–6)
 * @param birthYearThai - ปีเกิด พ.ศ. (เช่น 2525)
 * @param currentYearThai - ปีปัจจุบัน พ.ศ. (เช่น 2569)
 * @returns TaksaTransitResult
 *
 * @example
 * // เกิดวันศุกร์ ปี 2525, ปัจจุบัน 2569
 * const transit = calcTaksaTransit(5, 2525, 2569);
 * // transit.ageYang === 45
 * // transit.bariStar === ดาวที่ offset (45-1)%7 = 2 จากบริวารกำเนิด
 */
export function calcTaksaTransit(
  dayOfWeek: number,
  birthYearThai: number,
  currentYearThai: number
): TaksaTransitResult {
  const birthStar = DAY_TO_STAR[dayOfWeek];
  if (!birthStar) {
    throw new Error(`dayOfWeek ต้องอยู่ระหว่าง 0–6 (ได้รับ: ${dayOfWeek})`);
  }

  const ageYang = currentYearThai - birthYearThai + 1;
  if (ageYang < 1) {
    throw new Error(`ปีปัจจุบันต้องมากกว่าหรือเท่ากับปีเกิด`);
  }

  const bariIdx = TAKSA_SEQUENCE.indexOf(birthStar);

  // offset = (อายุย่าง - 1) % 7
  const transitOffset = (ageYang - 1) % 7;
  const transitBariIdx = seqIndex(bariIdx + transitOffset);
  const transitBariStar = TAKSA_SEQUENCE[transitBariIdx];

  // สร้าง map จากบริวารจร
  const mapFinal = {} as TaksaMap;
  for (let i = 0; i < 7; i++) {
    const starIdx = seqIndex(transitBariIdx + i);
    const star = TAKSA_SEQUENCE[starIdx];
    mapFinal[star] = TAKSA_BHOP[i];
  }
  // กาลกิณีจร
  const kalakiniIdx = seqIndex(transitBariIdx - 1);
  mapFinal[TAKSA_SEQUENCE[kalakiniIdx]] = "กาลกิณี";

  return {
    map: mapFinal,
    bariStar: transitBariStar,
    ageYang,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ตรวจสอบคู่ธาตุ (Element Pair Flags)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ตรวจสอบว่าคู่ธาตุแต่ละคู่ "ปรากฏ" ในผังหรือไม่
 * เงื่อนไข: ดาวทั้งคู่มีภพอยู่ใน map และไม่มีดาวใดอยู่ในกาลกิณี
 *
 * @param natalMap   - TaksaMap กำเนิด
 * @param transitMap - TaksaMap จร
 * @returns ElementPairFlag[]
 */
export function checkElementPairs(
  natalMap: TaksaMap,
  transitMap: TaksaMap
): ElementPairFlag[] {
  return ELEMENT_PAIRS.map((pair) => {
    const [s1, s2] = pair.stars;

    const natalActive =
      natalMap[s1] !== undefined &&
      natalMap[s2] !== undefined &&
      natalMap[s1] !== "กาลกิณี" &&
      natalMap[s2] !== "กาลกิณี";

    const transitActive =
      transitMap[s1] !== undefined &&
      transitMap[s2] !== undefined &&
      transitMap[s1] !== "กาลกิณี" &&
      transitMap[s2] !== "กาลกิณี";

    return {
      element: pair.element,
      stars: pair.stars,
      nature: pair.nature,
      inNatal: natalActive,
      inTransit: transitActive,
      isPermanent: natalActive && transitActive,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: หาภพของดาวใน TaksaMap
// ─────────────────────────────────────────────────────────────────────────────

/**
 * หาว่าดาวดวงหนึ่งอยู่ในภพใดของ TaksaMap
 * @param map  - TaksaMap
 * @param star - เลขดาว
 */
export function getBhopOfStar(map: TaksaMap, star: StarNumber): TaksaBhop {
  return map[star];
}

/**
 * หาดาวที่อยู่ในภพที่ระบุ
 * @param map  - TaksaMap
 * @param bhop - ชื่อภพ
 */
export function getStarOfBhop(
  map: TaksaMap,
  bhop: TaksaBhop
): StarNumber | undefined {
  const entry = Object.entries(map).find(([, v]) => v === bhop);
  return entry ? (Number(entry[0]) as StarNumber) : undefined;
}
