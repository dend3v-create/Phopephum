/**
 * scripts/generate-lunar-calendar.mts
 *
 * สร้างตารางปฏิทินจันทรคติไทย 120 ปี (CE 1920–2040)
 *
 * Algorithm (แนวที่ 1 + 3):
 *   1. ใช้ SunCalc หา New Moon จริงทางดาราศาสตร์ (±ชั่วโมง)
 *   2. กำหนด เดือน 1 = New Moon ที่ตกใน Window: Dec 21 – Jan 31 ของปีนั้น
 *   3. อธิกมาส = ปีที่มี 13 New Moons ก่อน เดือน 1 ปีถัดไป
 *      → เดือน 8 สอง (key=88) แทรกระหว่าง เดือน 8 และ เดือน 9
 *   4. Patch ด้วยข้อมูล verified (THAI_LUNAR_NEW_MONTH) สำหรับปีที่มีข้อมูลแน่ชัด
 *   5. Output → lunar100year.json (full dataset, ready for lunarCalendar.ts)
 *
 * Run:
 *   npx tsx scripts/generate-lunar-calendar.mts
 *
 * Output:
 *   packages/engine/src/datasets/lunar100year.json
 */

import SunCalc from "suncalc";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

const START_YEAR = 1920;
const END_YEAR   = 2040;

/** Synodic month = 29.530588853 days (mean) */
const SYNODIC_MS = 29.530588853 * 86_400_000;

/** Bangkok UTC+7 offset in ms */
const BKK_OFFSET_MS = 7 * 3_600_000;

/** Known-good anchor: 2024-01-11 = เดือน 1 CE 2024 (verified) */
const ANCHOR = new Date("2024-01-11T00:00:00+07:00");

// ─── Verified baseline (THAI_LUNAR_NEW_MONTH from lunarCalendar.ts) ───────────
// เหล่านี้คือข้อมูลที่ verified ตรงกับปฏิทินไทยจริง — override เสมอ
const VERIFIED: Record<string, string> = {
  "1960-1":"1960-01-28","1960-2":"1960-02-27","1960-3":"1960-03-27",
  "1960-4":"1960-04-26","1960-5":"1960-05-25","1960-6":"1960-06-24",
  "1960-7":"1960-07-23","1960-8":"1960-08-22","1960-9":"1960-09-20",
  "1960-10":"1960-10-20","1960-11":"1960-11-18","1960-12":"1960-12-18",
  "1967-1":"1967-01-14","1967-2":"1967-02-12","1967-3":"1967-03-14",
  "1967-4":"1967-04-13","1967-5":"1967-05-12","1967-6":"1967-06-11",
  "1967-7":"1967-07-10","1967-8":"1967-08-09","1967-9":"1967-09-07",
  "1967-10":"1967-10-07","1967-11":"1967-11-05","1967-12":"1967-12-05",
  "1977-1":"1977-01-23","1977-2":"1977-02-22","1977-3":"1977-03-23",
  "1977-4":"1977-04-21","1977-5":"1977-05-21","1977-6":"1977-06-19",
  "1977-7":"1977-07-18","1977-8":"1977-08-17","1977-9":"1977-09-15",
  "1977-10":"1977-10-15","1977-11":"1977-11-14","1977-12":"1977-12-13",
  "1981-1":"1981-01-19","1981-2":"1981-02-17","1981-3":"1981-03-18",
  "1981-4":"1981-04-17","1981-5":"1981-05-16","1981-6":"1981-06-15",
  "1981-7":"1981-07-15","1981-8":"1981-08-13","1981-9":"1981-09-11",
  "1981-10":"1981-10-11","1981-11":"1981-11-09","1981-12":"1981-12-09",
  "1982-1":"1982-01-08","1982-2":"1982-02-06","1982-3":"1982-03-08",
  "1982-4":"1982-04-07","1982-5":"1982-05-06","1982-6":"1982-06-05",
  "1982-7":"1982-07-05","1982-8":"1982-08-03",
  "1982-9":"1982-07-21",
  "1982-10":"1982-09-18","1982-11":"1982-10-18","1982-12":"1982-11-16",
  "1987-1":"1987-01-29","1987-2":"1987-02-27","1987-3":"1987-03-28",
  "1987-4":"1987-04-27","1987-5":"1987-05-26","1987-6":"1987-06-25",
  "1987-7":"1987-07-24","1987-8":"1987-08-22","1987-9":"1987-09-21",
  "1987-10":"1987-10-21","1987-11":"1987-11-19","1987-12":"1987-12-18",
  "1997-1":"1997-01-17","1997-2":"1997-02-15","1997-3":"1997-03-17",
  "1997-4":"1997-04-15","1997-5":"1997-05-14","1997-6":"1997-06-13",
  "1997-7":"1997-07-13","1997-8":"1997-08-11","1997-9":"1997-09-10",
  "1997-10":"1997-10-10","1997-11":"1997-11-08","1997-12":"1997-12-07",
  "2007-1":"2007-01-19","2007-2":"2007-02-17","2007-3":"2007-03-19",
  "2007-4":"2007-04-17","2007-5":"2007-05-17","2007-6":"2007-06-15",
  "2007-7":"2007-07-14","2007-8":"2007-08-13","2007-9":"2007-09-11",
  "2007-10":"2007-10-11","2007-11":"2007-11-09","2007-12":"2007-12-09",
  "2012-1":"2012-01-23","2012-2":"2012-02-22","2012-3":"2012-03-22",
  "2012-4":"2012-04-21","2012-5":"2012-05-21","2012-6":"2012-06-19",
  "2012-7":"2012-07-19","2012-8":"2012-08-17","2012-9":"2012-09-16",
  "2012-10":"2012-10-15","2012-11":"2012-11-14","2012-12":"2012-12-13",
  "2017-1":"2017-01-28","2017-2":"2017-02-26","2017-3":"2017-03-28",
  "2017-4":"2017-04-26","2017-5":"2017-05-26","2017-6":"2017-06-24",
  "2017-7":"2017-07-23","2017-8":"2017-08-22","2017-9":"2017-09-20",
  "2017-10":"2017-10-19","2017-11":"2017-11-18","2017-12":"2017-12-18",
  "2020-1":"2020-01-25","2020-2":"2020-02-23","2020-3":"2020-03-24",
  "2020-4":"2020-04-23","2020-5":"2020-05-22","2020-6":"2020-06-21",
  "2020-7":"2020-07-21","2020-8":"2020-08-19","2020-9":"2020-09-17",
  "2020-10":"2020-10-17","2020-11":"2020-11-15","2020-12":"2020-12-15",
  "2021-1":"2021-01-13","2021-2":"2021-02-11","2021-3":"2021-03-13",
  "2021-4":"2021-04-12","2021-5":"2021-05-11","2021-6":"2021-06-10",
  "2021-7":"2021-07-10","2021-8":"2021-08-08","2021-9":"2021-09-07",
  "2021-10":"2021-10-06","2021-11":"2021-11-04","2021-12":"2021-12-04",
  "2022-1":"2022-01-03","2022-2":"2022-02-01","2022-3":"2022-03-03",
  "2022-4":"2022-04-01","2022-5":"2022-05-01","2022-6":"2022-05-30",
  "2022-7":"2022-06-29","2022-8":"2022-07-29","2022-9":"2022-08-27",
  "2022-10":"2022-09-26","2022-11":"2022-10-25","2022-12":"2022-11-24",
  "2023-1":"2023-01-22","2023-2":"2023-02-20","2023-3":"2023-03-22",
  "2023-4":"2023-04-20","2023-5":"2023-05-19","2023-6":"2023-06-18",
  "2023-7":"2023-07-17","2023-8":"2023-08-16","2023-9":"2023-09-15",
  "2023-10":"2023-10-14","2023-11":"2023-11-13","2023-12":"2023-12-13",
  "2024-1":"2024-01-11","2024-2":"2024-02-10","2024-3":"2024-03-10",
  "2024-4":"2024-04-09","2024-5":"2024-05-08","2024-6":"2024-06-06",
  "2024-7":"2024-07-06","2024-8":"2024-08-04","2024-9":"2024-09-03",
  "2024-10":"2024-10-03","2024-11":"2024-11-01","2024-12":"2024-12-01",
  "2025-1":"2025-01-29","2025-2":"2025-03-01","2025-3":"2025-03-29",
  "2025-4":"2025-04-27","2025-5":"2025-05-27","2025-6":"2025-06-25",
  "2025-7":"2025-07-25","2025-8":"2025-08-23","2025-9":"2025-09-22",
  "2025-10":"2025-10-21","2025-11":"2025-11-20","2025-12":"2025-12-20",
  "2026-1":"2026-01-18","2026-2":"2026-02-17","2026-3":"2026-03-18",
  "2026-4":"2026-04-17","2026-5":"2026-05-16","2026-6":"2026-06-15",
  "2026-7":"2026-07-14","2026-8":"2026-08-12","2026-9":"2026-09-11",
  "2026-10":"2026-10-10","2026-11":"2026-11-09","2026-12":"2026-12-08",
};

// ─── Step 1: Find all New Moon dates ─────────────────────────────────────────

/**
 * หา New Moon จริง (±3 วัน จาก estimate) ด้วย SunCalc
 * Return: วันใน Bangkok timezone (local Date)
 */
function findNewMoon(estimate: Date): Date {
  const center = estimate.getTime();
  let bestTime = center;
  let bestDist = Infinity;

  // Scan ±3 วัน ด้วย step 1 ชั่วโมง
  for (let t = center - 3 * 86_400_000; t <= center + 3 * 86_400_000; t += 3_600_000) {
    const { phase } = SunCalc.getMoonIllumination(new Date(t));
    // New moon = phase ≈ 0 (หรือ ≈ 1 เพราะ circular)
    const dist = Math.min(phase, 1 - phase);
    if (dist < bestDist) {
      bestDist = dist;
      bestTime = t;
    }
  }

  // แปลงเป็นวันใน Bangkok time (UTC+7)
  const bkkMs = bestTime + BKK_OFFSET_MS;
  const d = new Date(bkkMs);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * สร้าง list New Moon dates ทั้งหมด ตั้งแต่ START_YEAR-1 ถึง END_YEAR+1
 * โดยเริ่มจาก ANCHOR แล้ว step ±SYNODIC_MS
 */
function generateAllNewMoons(): Date[] {
  const moons: Date[] = [];

  // เริ่มจาก ANCHOR → ย้อนหลังไปถึง START_YEAR - 2
  const monthsBack = Math.ceil((ANCHOR.getFullYear() - (START_YEAR - 2)) * 12.4) + 5;
  let estimate = new Date(ANCHOR.getTime() - monthsBack * SYNODIC_MS);

  // Align to first reasonable estimate (find actual new moon)
  estimate = findNewMoon(estimate);

  // ก้าวไปข้างหน้าจนถึง END_YEAR + 2
  const limit = new Date(`${END_YEAR + 2}-12-31`).getTime();
  while (estimate.getTime() <= limit) {
    if (estimate.getFullYear() >= START_YEAR - 2) {
      moons.push(new Date(estimate));
    }
    const next = new Date(estimate.getTime() + SYNODIC_MS);
    estimate = findNewMoon(next);
  }

  return moons;
}

// ─── Step 2: Assign Thai months ───────────────────────────────────────────────

function toDateStr(d: Date): string {
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${dd}`;
}

/**
 * กำหนด เดือน 1 ของแต่ละปี CE:
 * = New Moon แรกที่อยู่ใน window: Dec 21 (ปีก่อน) ถึง Jan 31 (ปีปัจจุบัน)
 *
 * หลักการ: เดือน 1 ตรงกับ New Moon ที่ใกล้ Capricorn ingress (21 ธ.ค.)
 * แต่ใน data จริงจะตกใน ม.ค. เกือบทุกปี
 */
function findMonth1Map(moons: Date[]): Map<number, Date> {
  const map = new Map<number, Date>();

  for (const moon of moons) {
    const y   = moon.getFullYear();
    const mo  = moon.getMonth(); // 0-indexed
    const day = moon.getDate();

    // Window: Dec 21-31 → belongs to year y+1, or Jan 1-31 → belongs to year y
    let ownerYear: number;
    if (mo === 11 && day >= 21) {
      ownerYear = y + 1;
    } else if (mo === 0) {
      ownerYear = y;
    } else {
      continue; // not in window
    }

    // Take the LATEST moon in the window (prefer January over December)
    const existing = map.get(ownerYear);
    if (!existing || moon > existing) {
      map.set(ownerYear, moon);
    }
  }

  return map;
}

/**
 * กำหนดเดือนไทยทั้งหมด
 */
function assignThaiMonths(moons: Date[]): Record<string, string> {
  const result: Record<string, string> = {};
  const month1Map = findMonth1Map(moons);

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const start = month1Map.get(year);
    const next  = month1Map.get(year + 1);
    if (!start) continue;

    // หา moons ในปีนี้: จาก start (inclusive) ถึง next (exclusive)
    const yearMoons = moons.filter(m =>
      m >= start && (!next || m < next)
    );

    if (yearMoons.length === 0) continue;

    const isIntercalary = yearMoons.length === 13;

    for (let i = 0; i < yearMoons.length; i++) {
      const moon = yearMoons[i]!;
      let thaiMonth: number;

      if (isIntercalary) {
        // ลำดับ: 1,2,3,4,5,6,7,8, 88(อธิกมาส), 9,10,11,12
        if (i < 8)       thaiMonth = i + 1;
        else if (i === 8) thaiMonth = 88;
        else              thaiMonth = i;      // i=9→9, i=10→10, ...
      } else {
        thaiMonth = i + 1;
      }

      result[`${year}-${thaiMonth}`] = toDateStr(moon);
    }

    if (isIntercalary) {
      console.log(`  อธิกมาส: CE ${year} (${yearMoons.length} เดือน)`);
    }
  }

  return result;
}

// ─── Step 3: Validate + Patch with verified data ──────────────────────────────

function validateAndPatch(
  generated: Record<string, string>,
  verified: Record<string, string>
): { result: Record<string, string>; stats: object } {
  const result = { ...generated };
  let matched = 0, diff1day = 0, diffMore = 0, added = 0;

  for (const [key, vDate] of Object.entries(verified)) {
    const gDate = generated[key];

    if (!gDate) {
      result[key] = vDate;
      added++;
      continue;
    }

    const vMs = new Date(vDate).getTime();
    const gMs = new Date(gDate).getTime();
    const diffDays = Math.round(Math.abs(vMs - gMs) / 86_400_000);

    if (diffDays === 0) matched++;
    else if (diffDays <= 1) diff1day++;
    else diffMore++;

    // Patch: verified เสมอ override generated
    result[key] = vDate;
  }

  return {
    result,
    stats: { matched, diff1day, diffMore, added, total: Object.keys(result).length },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(`\n🔮 Thai Lunar Calendar Generator — CE ${START_YEAR}–${END_YEAR}`);
console.log("═".repeat(55));

// 1. New moons
process.stdout.write("☽  Step 1: Finding new moons with SunCalc... ");
const allMoons = generateAllNewMoons();
console.log(`${allMoons.length} moons found`);

// 2. Assign months
console.log("📅 Step 2: Assigning Thai months...");
const generated = assignThaiMonths(allMoons);
console.log(`  Generated: ${Object.keys(generated).length} entries`);

// 3. Validate + patch
console.log("✅ Step 3: Validating against verified baseline...");
const { result, stats } = validateAndPatch(generated, VERIFIED);
console.log("  Stats:", stats);

// 4. Write JSON
const outputPath = path.join(
  __dirname,
  "../src/datasets/lunar100year.json"
);

const output = {
  _note:      `ตารางปฏิทินจันทรคติไทย CE ${START_YEAR}–${END_YEAR}`,
  _source:    "SunCalc astronomical new moon + verified Thai calendar (1957-2028)",
  _generated: new Date().toISOString(),
  _coverage:  `CE ${START_YEAR}–${END_YEAR} (${Object.keys(result).length} month entries)`,
  _format:    'key: "ceYear-thaiMonth" (88=อธิกมาส เดือน 8 สอง) | value: "YYYY-MM-DD" (ขึ้น 1 ค่ำ, Bangkok time)',
  ...result,
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
console.log(`\n✨ Written → ${path.relative(process.cwd(), outputPath)}`);
console.log(`   Total entries: ${Object.keys(result).length}`);
console.log(`   Coverage: CE ${START_YEAR}–${END_YEAR} (${END_YEAR - START_YEAR + 1} years)\n`);
