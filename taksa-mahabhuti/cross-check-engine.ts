/**
 * cross-check-engine.ts
 * Hora AI — Engine ตรวจสอบข้ามระบบ (ทักษา × มหาภูติ × เลข 7 ตัว)
 *
 * กลไก:
 *   - สแกนดาวทั้ง 7 ดวง
 *   - ตรวจ: กาลกิณีจร + ภพอันตรายมหาภูติจร → "danger"
 *   - ตรวจ: กาลกิณีจร หรือ ภพอันตรายมหาภูติจร → "warn"
 *   - ตรวจ: คู่ธาตุที่ปรากฏทั้งกำเนิดและจร → "good" (ถาวร)
 *   - Element Strength Multiplier: คู่ธาตุจรทับกำเนิด → น้ำหนักทำนายสูงสุด
 *
 * @module cross-check-engine
 * @version 1.0.0
 */

import {
  StarNumber,
  TaksaMap,
  MahaMap,
  StarAlert,
  AlertLevel,
  TaksaMahaInput,
  TaksaMahaResult,
  STAR_NAMES,
  MAHA_DANGER_BHOP,
  MAHA_GOOD_BHOP,
} from "./taksa-mahabhuti.types";

import {
  calcTaksaNatal,
  calcTaksaTransit,
  checkElementPairs,
} from "./taksa-calculator";

import {
  calcMahabhuti,
  getMahaBhopOfStar,
  isStarInDanger,
  isStarInGood,
  buddhToCS,
} from "./mahabhuti-calculator";

// ─────────────────────────────────────────────────────────────────────────────
// Cross-Check Engine
// ─────────────────────────────────────────────────────────────────────────────

/** ดาวทั้ง 7 ดวง */
const ALL_STARS: StarNumber[] = [1, 2, 3, 4, 5, 6, 7];

/**
 * ตรวจสอบแจ้งเตือนข้ามระบบสำหรับดาวแต่ละดวง
 *
 * Priority:
 *   danger = กาลกิณีจร + โลกาวินาศ/มรณะจร (ทั้งคู่)
 *   warn   = กาลกิณีจร หรือ โลกาวินาศ/มรณะจร (อย่างใดอย่างหนึ่ง)
 *   info   = กาลกิณีกำเนิด + ภพอันตรายกำเนิด
 *   good   = อยู่ในภพมงคลทั้งสองระบบ
 */
export function generateAlerts(
  taksaNatalMap: TaksaMap,
  taksaTransitMap: TaksaMap,
  mahaNatalMap: MahaMap,
  mahaTransitMap: MahaMap
): StarAlert[] {
  const alerts: StarAlert[] = [];

  for (const star of ALL_STARS) {
    const tn = taksaNatalMap[star];
    const tt = taksaTransitMap[star];
    const mn = getMahaBhopOfStar(mahaNatalMap, star);
    const mt = getMahaBhopOfStar(mahaTransitMap, star);

    const isKalaNatal = tn === "กาลกิณี";
    const isKalaTransit = tt === "กาลกิณี";
    const isMahaDangerNatal = mn ? MAHA_DANGER_BHOP.includes(mn) : false;
    const isMahaDangerTransit = mt ? MAHA_DANGER_BHOP.includes(mt) : false;
    const isMahaGoodNatal = mn ? MAHA_GOOD_BHOP.includes(mn) : false;
    const isMahaGoodTransit = mt ? MAHA_GOOD_BHOP.includes(mt) : false;

    let level: AlertLevel | null = null;
    let message = "";

    // ── DANGER: กาลกิณีจร + ภพอันตรายมหาภูติจร ──
    if (isKalaTransit && isMahaDangerTransit) {
      level = "danger";
      message =
        `ดาว ${star} (${STAR_NAMES[star]}) ตกกาลกิณีจร (ทักษา) ` +
        `พร้อมกับ${mt}จร (มหาภูติ) — ⚠️ ควรระวังเป็นพิเศษปีนี้ ` +
        `เรื่องที่เกี่ยวกับดาว ${star} จะมีความสูญเสียหรือเหตุไม่คาดฝัน`;
    }
    // ── DANGER: กาลกิณีกำเนิด + ภพอันตรายกำเนิด ──
    else if (isKalaNatal && isMahaDangerNatal && !level) {
      level = "danger";
      message =
        `ดาว ${star} (${STAR_NAMES[star]}) อ่อนแอเชิงโครงสร้าง — ` +
        `กาลกิณีกำเนิด (ทักษา) + ${mn}กำเนิด (มหาภูติ) ` +
        `ดาวนี้ต้องการการเสริมพลังเป็นพิเศษตลอดชีวิต`;
    }
    // ── WARN: กาลกิณีจร อย่างเดียว ──
    else if (isKalaTransit && !level) {
      level = "warn";
      message =
        `ดาว ${star} (${STAR_NAMES[star]}) ตกกาลกิณีจรปีนี้ — ` +
        `ควรระวังเรื่องที่เกี่ยวกับดาว ${star} เป็นพิเศษ`;
    }
    // ── WARN: ภพอันตรายมหาภูติจร อย่างเดียว ──
    else if (isMahaDangerTransit && !level) {
      level = "warn";
      message =
        `ดาว ${star} (${STAR_NAMES[star]}) อยู่ที่ ${mt} ในมหาภูติจรปีนี้ — ` +
        `ผลกระทบจากสิ่งแวดล้อมและโลกภายนอกต่อภพที่ดาว ${star} ดูแล`;
    }
    // ── INFO: ดาวแข็งแกร่งทั้งสองระบบ ──
    else if (isMahaGoodTransit && tt === "มูละ") {
      level = "info";
      message =
        `ดาว ${star} (${STAR_NAMES[star]}) อยู่มูละจร (ทักษา) + ${mt}จร (มหาภูติ) — ` +
        `พลังดาวนี้จะส่งผลดีและมั่นคงในปีนี้`;
    }

    if (level) {
      alerts.push({
        level,
        star,
        starName: STAR_NAMES[star],
        taksaNatal: tn,
        taksaTransit: tt,
        mahaNatal: mn ?? "ราชา",
        mahaTransit: mt ?? "ราชา",
        message,
      });
    }
  }

  // เรียงลำดับ: danger → warn → info → good
  const ORDER: AlertLevel[] = ["danger", "warn", "info", "good"];
  alerts.sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level));

  return alerts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Calculator (Facade)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * คำนวณผังทักษา + มหาภูติ + Cross-Check ทั้งหมดในครั้งเดียว
 *
 * @param input - TaksaMahaInput
 * @returns TaksaMahaResult
 *
 * @example
 * const result = calcTaksaMaha({
 *   birthDate: new Date("1982-07-23"),  // ศุกร์
 *   birthYearThai: 2525,
 *   currentYearThai: 2569,
 *   csNatal: 1323,
 *   csTransit: 1388,
 * });
 *
 * result.taksaNatal.bariStar           // → 6
 * result.taksaTransit.ageYang          // → 45
 * result.mahaNatal.map["โลกาวินาศ"]  // → 7
 * result.mahaTransit.map["ราชา"]      // → 7
 * result.alerts[0]?.level              // → "danger" | "warn" | ...
 */
export function calcTaksaMaha(input: TaksaMahaInput): TaksaMahaResult {
  const {
    birthDate,
    birthYearThai,
    currentYearThai,
    csNatal,
    csTransit,
  } = input;

  const dayOfWeek = birthDate.getDay();

  // ── ทักษากำเนิด ──
  const taksaNatal = calcTaksaNatal(dayOfWeek);

  // ── ทักษาจร ──
  const taksaTransit = calcTaksaTransit(dayOfWeek, birthYearThai, currentYearThai);

  // ── มหาภูติกำเนิด ──
  const mahaNatal = calcMahabhuti(csNatal);

  // ── มหาภูติจร ──
  const mahaTransit = calcMahabhuti(csTransit);

  // ── คู่ธาตุ ──
  const elementPairFlags = checkElementPairs(taksaNatal.map, taksaTransit.map);

  // ── Cross-Check Alerts ──
  const alerts = generateAlerts(
    taksaNatal.map,
    taksaTransit.map,
    mahaNatal.map,
    mahaTransit.map
  );

  // ── Element Strength Multiplier ──
  // คู่ธาตุที่ปรากฏทั้งกำเนิดและจร → เพิ่ม "good" alert
  elementPairFlags
    .filter((f) => f.isPermanent)
    .forEach((f) => {
      alerts.push({
        level: "good",
        star: f.stars[0],
        starName: STAR_NAMES[f.stars[0]],
        taksaNatal: taksaNatal.map[f.stars[0]],
        taksaTransit: taksaTransit.map[f.stars[0]],
        mahaNatal: getMahaBhopOfStar(mahaNatal.map, f.stars[0]) ?? "ราชา",
        mahaTransit: getMahaBhopOfStar(mahaTransit.map, f.stars[0]) ?? "ราชา",
        message:
          `คู่ธาตุ${f.element} (ดาว ${f.stars[0]} + ${f.stars[1]}) ` +
          `ปรากฏทั้งกำเนิดและจร — เหตุการณ์จะเกิดขึ้นถาวร มั่นคง เป็นปึกแผ่น ` +
          `(${f.nature})`,
      });
    });

  return {
    taksaNatal,
    taksaTransit,
    mahaNatal,
    mahaTransit,
    elementPairFlags,
    alerts,
  };
}
