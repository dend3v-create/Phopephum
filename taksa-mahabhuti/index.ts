/**
 * index.ts
 * Hora AI — Barrel Export: ทักษาคู่ธาตุ + มหาภูติ Engine
 *
 * วิธีใช้งานใน Hora App:
 *
 *   import { calcTaksaMaha, buddhToCS } from "@/engine/taksa-mahabhuti";
 *
 *   const result = calcTaksaMaha({
 *     birthDate: new Date("1982-07-23"),
 *     birthYearThai: 2525,
 *     currentYearThai: 2569,
 *     csNatal: buddhToCS(2525),   // → 1344  (แต่ถ้าใช้ 1323 ตามตำรา ให้ใส่เอง)
 *     csTransit: buddhToCS(2569), // → 1388
 *   });
 *
 * หมายเหตุ: csNatal บางครั้งใช้ปีกำเนิดของระบบโหราศาสตร์ (ไม่ใช่ปีเกิดจริง)
 *           กรุณาตรวจสอบกับตำราที่ใช้ก่อนทุกครั้ง
 *
 * @module taksa-mahabhuti (index)
 */

// ── Types ──
export type {
  StarNumber,
  TaksaBhop,
  TaksaMap,
  TaksaNatalResult,
  TaksaTransitResult,
  ElementType,
  ElementPair,
  ElementPairFlag,
  MahaBhop,
  MahaMap,
  MahaBhutiResult,
  AlertLevel,
  StarAlert,
  TaksaMahaInput,
  TaksaMahaResult,
} from "./taksa-mahabhuti.types";

export {
  STAR_NAMES,
  DAY_TO_STAR,
  TAKSA_SEQUENCE,
  TAKSA_BHOP,
  ELEMENT_PAIRS,
  MAHA_SEQUENCE,
} from "./taksa-mahabhuti.types";

// ── Taksa Calculator ──
export {
  calcTaksaNatal,
  calcTaksaTransit,
  checkElementPairs,
  getBhopOfStar,
  getStarOfBhop,
} from "./taksa-calculator";

// ── Mahabhuti Calculator ──
export {
  calcMahabhuti,
  buddhToCS,
  csTobuddh,
  getMahaBhopOfStar,
  isStarInDanger,
  isStarInGood,
  MAHA_DANGER_BHOP,
  MAHA_GOOD_BHOP,
} from "./mahabhuti-calculator";

// ── Cross-Check Engine (Main Facade) ──
export { calcTaksaMaha, generateAlerts } from "./cross-check-engine";

// ─────────────────────────────────────────────────────────────────────────────
// ตัวอย่างการใช้งาน (Quick Start)
// ─────────────────────────────────────────────────────────────────────────────

/*
import { calcTaksaMaha, buddhToCS } from "@/engine/taksa-mahabhuti";

// ── ตัวอย่าง: เกิดวันศุกร์ 23 ก.ค. 2525, ปัจจุบัน 2569 ──
const result = calcTaksaMaha({
  birthDate: new Date("1982-07-23"),   // วันศุกร์ → getDay() = 5
  birthYearThai: 2525,
  currentYearThai: 2569,
  csNatal: 1323,                       // จ.ศ. กำเนิดตามตำรา
  csTransit: 1388,                     // จ.ศ. ปีปัจจุบัน (2569 - 1181 = 1388)
});

console.log("ทักษากำเนิด:");
console.log("  บริวาร:", result.taksaNatal.bariStar);      // 6 (ศุกร์)
console.log("  กาลกิณี:", Object.entries(result.taksaNatal.map)
  .find(([, v]) => v === "กาลกิณี")?.[0]);                // ดาวก่อนบริวาร

console.log("\nทักษาจร:");
console.log("  อายุย่าง:", result.taksaTransit.ageYang);   // 45
console.log("  บริวารจร:", result.taksaTransit.bariStar);

console.log("\nมหาภูติกำเนิด:");
console.log("  โลกาวินาศ:", result.mahaNatal.map["โลกาวินาศ"]); // 7

console.log("\nมหาภูติจร:");
console.log("  ราชา:", result.mahaTransit.map["ราชา"]);    // 7

console.log("\nคู่ธาตุถาวร:");
result.elementPairFlags
  .filter(f => f.isPermanent)
  .forEach(f => console.log(" ", f.element, f.stars));

console.log("\nการแจ้งเตือน:");
result.alerts.forEach(a =>
  console.log(`  [${a.level}] ${a.message}`)
);

// ── ใช้ใน React Component ──
// const { data } = useQuery({
//   queryKey: ["taksaMaha", user.birthDate, currentYear],
//   queryFn: () => calcTaksaMaha({ ... }),
// });
*/
