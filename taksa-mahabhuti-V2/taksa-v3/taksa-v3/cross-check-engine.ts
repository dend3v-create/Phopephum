/**
 * cross-check-engine.ts
 * Hora AI — Engine ตรวจสอบข้ามระบบ + Main Facade
 *
 * v2.0:
 *   - รองรับ StarNumber 1–8 (รวมราหู)
 *   - Input เปลี่ยนจาก birthYearThai/currentYearThai → birthDate/checkDate
 *   - เพิ่ม sawai ใน TaksaMahaResult
 *   - Cross-check รวมราหู (ดาว 8) ด้วย
 *
 * @module cross-check-engine
 * @version 2.0.0
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
} from "./taksa-mahabhuti.types";

import {
  calcTaksaNatal,
  calcTaksaTransit,
  calcSawai,
  checkElementPairs,
  calcAgeYang,
} from "./taksa-calculator";

import {
  calcMahabhuti,
  getMahaBhopOfStar,
  MAHA_DANGER_BHOP,
  MAHA_GOOD_BHOP,
  csFromDate,
} from "./mahabhuti-calculator";

// ─────────────────────────────────────────────────────────────────────────────
// Cross-Check Alerts
// ─────────────────────────────────────────────────────────────────────────────

/** ดาวทั้ง 8 ดวง (รวมราหู) */
const ALL_STARS: StarNumber[] = [1, 2, 3, 4, 5, 6, 7, 8];

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

    // มหาภูติใช้ดาว 1–7 เท่านั้น (ราหูไม่มีในมหาภูติ)
    const mn = star <= 7 ? getMahaBhopOfStar(mahaNatalMap, star) : undefined;
    const mt = star <= 7 ? getMahaBhopOfStar(mahaTransitMap, star) : undefined;

    const isKalaTransit = tt === "กาลกิณี";
    const isKalaNatal = tn === "กาลกิณี";
    const isMahaDangerTransit = mt ? MAHA_DANGER_BHOP.includes(mt) : false;
    const isMahaDangerNatal = mn ? MAHA_DANGER_BHOP.includes(mn) : false;
    const isMahaGoodTransit = mt ? MAHA_GOOD_BHOP.includes(mt) : false;

    let level: AlertLevel | null = null;
    let message = "";
    const sName = STAR_NAMES[star];

    if (isKalaTransit && isMahaDangerTransit) {
      level = "danger";
      message = `ดาว ${star} ${sName}: กาลกิณีจร + ${mt}จร — ควรระวังเป็นพิเศษ เรื่องที่เกี่ยวกับดาวนี้จะมีความสูญเสียหรือเหตุไม่คาดฝัน`;
    } else if (isKalaNatal && isMahaDangerNatal) {
      level = "danger";
      message = `ดาว ${star} ${sName}: กาลกิณีกำเนิด + ${mn}กำเนิด — อ่อนแอเชิงโครงสร้าง ต้องการเสริมพลังตลอดชีวิต`;
    } else if (isKalaTransit) {
      level = "warn";
      message = `ดาว ${star} ${sName}: กาลกิณีจรปีนี้ — ควรระวังภพที่ดาวนี้ดูแลอยู่`;
    } else if (isMahaDangerTransit) {
      level = "warn";
      message = `ดาว ${star} ${sName}: อยู่ที่ ${mt} ในมหาภูติจร — ผลกระทบจากปัจจัยภายนอกต่อภพนี้`;
    } else if (isMahaGoodTransit && tt === "มูละ") {
      level = "info";
      message = `ดาว ${star} ${sName}: มูละจร + ${mt}จร — พลังดาวนี้ส่งผลดีและมั่นคงในปีนี้`;
    }

    if (level) {
      alerts.push({
        level,
        star,
        starName: sName,
        taksaNatal: tn,
        taksaTransit: tt,
        mahaNatal: mn,
        mahaTransit: mt,
        message,
      });
    }
  }

  const ORDER: AlertLevel[] = ["danger", "warn", "info", "good"];
  alerts.sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level));
  return alerts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Facade
// ─────────────────────────────────────────────────────────────────────────────

/**
 * คำนวณผังทักษา + มหาภูติ + ดาวเสวยอายุ + Cross-Check ทั้งหมดในครั้งเดียว
 *
 * @example
 * const result = calcTaksaMaha({
 *   birthDate:  new Date("1982-07-23"),  // ศุกร์
 *   checkDate:  new Date("2026-05-31"),  // วันที่ตรวจดวง
 *   csNatal:    1344,                    // buddhToCS(2525) = 1344
 *   csTransit:  csFromDate(new Date("2026-05-31")), // → 1388
 * });
 *
 * result.taksaNatal.bariStar           // → 6 (ศุกร์)
 * result.taksaTransit.bariStar         // → 3 (อังคาร) ✅
 * result.taksaTransit.ageYang          // → 44
 * result.sawai.sawaiStar               // → 3 (อังคาร)
 * result.sawai.subStar                 // → 7 (เสาร์)
 * result.mahaNatal.map["โลกาวินาศ"]  // → 6
 * result.mahaTransit.map["ราชา"]      // → 7
 */
export function calcTaksaMaha(input: TaksaMahaInput): TaksaMahaResult {
  const { birthDate, checkDate, csNatal, csTransit } = input;

  const dayOfWeek = birthDate.getDay();

  const taksaNatal   = calcTaksaNatal(dayOfWeek);
  const taksaTransit = calcTaksaTransit(birthDate, checkDate);
  const mahaNatal    = calcMahabhuti(csNatal);
  const mahaTransit  = calcMahabhuti(csTransit);
  const sawai        = calcSawai(birthDate, checkDate);

  const elementPairFlags = checkElementPairs(taksaNatal.map, taksaTransit.map);

  const alerts = generateAlerts(
    taksaNatal.map,
    taksaTransit.map,
    mahaNatal.map,
    mahaTransit.map
  );

  // คู่ธาตุถาวร → เพิ่ม good alert
  elementPairFlags
    .filter((f) => f.isPermanent)
    .forEach((f) => {
      alerts.push({
        level: "good",
        star: f.stars[0],
        starName: STAR_NAMES[f.stars[0]],
        taksaNatal: taksaNatal.map[f.stars[0]],
        taksaTransit: taksaTransit.map[f.stars[0]],
        mahaNatal: getMahaBhopOfStar(mahaNatal.map, f.stars[0]),
        mahaTransit: getMahaBhopOfStar(mahaTransit.map, f.stars[0]),
        message:
          `คู่ธาตุ${f.element} (ดาว ${f.stars[0]} + ${f.stars[1]}) ` +
          `ปรากฏทั้งกำเนิดและจร — เหตุการณ์จะเกิดขึ้นถาวร มั่นคง (${f.nature})`,
      });
    });

  return {
    taksaNatal,
    taksaTransit,
    mahaNatal,
    mahaTransit,
    sawai,
    elementPairFlags,
    alerts,
  };
}
