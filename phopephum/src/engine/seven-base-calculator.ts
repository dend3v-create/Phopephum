/**
 * seven-base-calculator.ts
 * Phopephum — เลข 7 ตัว 9 ฐาน Engine
 *
 * ระบบคำนวณเลข 7 ตัว 9 ฐานตามหลักโหราศาสตร์ไทยโบราณ
 * คำนวณอัตตา หินะ ธนัง... ตกฐานมงคล/เคราะห์ และทิศทางดวงจร (วัยจร/อายุจร)
 */

export type SevenBaseCategory =
  | "phopephum_meaning"
  | "definition"
  | "prediction_guideline"
  | "reading_logic"
  | "seven_base_9_stars"
  | "hora_tai_noo"
  | "thai_astrology"
  | "attakarn_hora"
  | "psychology_philosophy"
  | "chakra_energy"
  | "therapy_life_guide";

export interface SevenBaseChart {
  row1: number[]; // แถวที่ 1: วันเกิด (1-7)
  row2: number[]; // แถวที่ 2: เดือนเกิด (1-7)
  row3: number[]; // แถวที่ 3: ปีเกิด (1-7)
  row4: number[]; // ฐานที่ 4: มหาอุตม์ (วัน + เดือน + ปี)
  row5: number[]; // ฐานที่ 5: โสฬสมงคล (วัน + เดือน)
  row6: number[]; // ฐานที่ 6: ทรัพย์พยากร (เดือน + ปี)
  row7: number[]; // ฐานที่ 7: กำลังดาว (วัน + ปี)
  row8: number[]; // ฐานที่ 8: บารมีหนุนนำ (ฐานที่ 4 + วันเกิด)
  row9: number[]; // ฐานที่ 9: พระเคราะห์เสวยภูมิ (ฐานที่ 4 + เดือนเกิด)
}

export interface TransitInfo {
  currentAge: number;     // อายุเต็ม
  transitAge: number;     // อายุย่าง (อายุจร)
  zodiacYear: string;     // ปีนักษัตรเกิด
  majorCycle: string;     // ดาวเสวยอายุหลัก
  minorCycle: string;     // ดาวแทรกวัยจร
  auspiciousAspects: string[]; // จุดเด่นที่ได้รับการส่งเสริมช่วงนี้
  warningAspects: string[];    // สิ่งที่ต้องระวังช่วงนี้
}

export interface SevenBaseResult {
  birthDate: string;
  birthTime: string;
  dayOfWeek: number;      // 1=อาทิตย์, ..., 7=เสาร์
  dayName: string;
  lunarMonth: number;     // 1-12
  zodiacIndex: number;    // 1-12 (ชวด - กุน)
  chart: SevenBaseChart;
  transit: TransitInfo;
  strengths: string[];
  weaknesses: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const ZODIAC_YEARS = [
  "ชวด", "ฉลู", "ขาล", "เถาะ", "มะโรง", "มะเส็ง",
  "มะเมีย", "มะแม", "วอก", "ระกา", "จอ", "กุน"
];

export const PLANET_NAMES = [
  "อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์", "ราหู", "เกตุ"
];

// ความหมายภพแถวที่ 1-3 (21 ภพ)
export const HOUSE_NAMES = [
  // แถวที่ 1: ตน
  "อัตตา (ตัวตน)", "หินะ (ความเสื่อม/อุปสรรค)", "ธนัง (ทรัพย์สิน)", "ปิตา (พ่อ/ผู้ใหญ่ชาย)", "มาตา (แม่/ผู้ใหญ่หญิง)", "โภคา (อสังหา/สมบัติ)", "มัชฌิมา (ทางสายกลาง/ความพอดี)",
  // แถวที่ 2: ใจ/จิต
  "ตนุ (บุคลิกภาพ)", "กดุมพะ (การเงิน)", "สหัชชะ (เพื่อนฝูง/การสังคม)", "พันธุ (ครอบครัว/ญาติ)", "ปุตตะ (บริวาร/สิ่งใหม่)", "อริ (ศัตรู/ปัญหา)", "ปัตนิ (คนรัก/หุ้นส่วน)",
  // แถวที่ 3: กาย/วิถี
  "มรณะ (การพลัดพราก/ต่างถิ่น)", "สุภะ (ความดีงาม/ความสำเร็จ)", "กัมมะ (การงาน/การกระทำ)", "ลาภะ (ลาภผล/โชคดี)", "พยายะ (ความลับ/ความอึดอัด)", "ทาสา (การเกื้อกูลผู้ชาย)", "ทาสี (การเกื้อกูลผู้หญิง)"
];

// ─────────────────────────────────────────────────────────────────────────────
// Core Calculations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * คำนวณเลข 7 ตัว 9 ฐาน และดวงจรจากวันเกิดเกรกอเรียน
 */
export function calculateSevenBase(birthDateStr: string, birthTimeStr: string = "12:00"): SevenBaseResult {
  const birthDate = new Date(birthDateStr);
  
  // 1. หาพลังวันเกิด (1 = อาทิตย์, ..., 7 = เสาร์)
  // getDay(): 0=อาทิตย์, ..., 6=เสาร์
  const dayOfWeek = birthDate.getDay() === 0 ? 7 : birthDate.getDay() + 1;
  const dayNames = ["", "อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];
  const dayName = dayNames[dayOfWeek];

  // 2. ประมาณค่าเดือนจันทรคติไทย (1 - 12)
  // ปกติเดือน 5 จะเริ่มช่วงกลางเมษายน
  const month = birthDate.getMonth(); // 0 = มกราคม
  let lunarMonth = ((month + 8) % 12) + 1;
  if (lunarMonth === 0) lunarMonth = 12;

  // 3. คำนวณปีนักษัตรไทย (ชวด=1, ..., กุน=12)
  const birthYear = birthDate.getFullYear();
  // อ้างอิงปี 1996 เป็นปีชวด (index 0)
  const diff = (birthYear - 1996) % 12;
  let zodiacIndex = (diff >= 0 ? diff : diff + 12) + 1;

  // ปรับแก้ตามช่วงเมษายน (สงกรานต์เปลี่ยนปีนักษัตร)
  if (month < 3 || (month === 3 && birthDate.getDate() < 13)) {
    zodiacIndex = zodiacIndex - 1;
    if (zodiacIndex === 0) zodiacIndex = 12;
  }
  const zodiacYear = ZODIAC_YEARS[zodiacIndex - 1];

  // 4. บีบเลขลงฐาน 1 - 7
  const baseD = dayOfWeek;
  const baseM = lunarMonth > 7 ? lunarMonth - 7 : lunarMonth;
  const baseY = zodiacIndex > 7 ? zodiacIndex - 7 : zodiacIndex;

  // 5. สร้างฐาน 1-3
  const row1 = Array.from({ length: 7 }, (_, j) => ((baseD + j - 1) % 7) === 0 ? 7 : ((baseD + j - 1) % 7));
  const row2 = Array.from({ length: 7 }, (_, j) => ((baseM + j - 1) % 7) === 0 ? 7 : ((baseM + j - 1) % 7));
  const row3 = Array.from({ length: 7 }, (_, j) => ((baseY + j - 1) % 7) === 0 ? 7 : ((baseY + j - 1) % 7));

  // 6. สร้างฐาน 4-9 (ฐานบวกเพิ่ม)
  const row4 = row1.map((val, idx) => val + row2[idx] + row3[idx]);
  const row5 = row1.map((val, idx) => val + row2[idx]);
  const row6 = row2.map((val, idx) => val + row3[idx]);
  const row7 = row1.map((val, idx) => val + row3[idx]);
  const row8 = row4.map((val, idx) => val + row1[idx]);
  const row9 = row4.map((val, idx) => val + row2[idx]);

  const chart: SevenBaseChart = { row1, row2, row3, row4, row5, row6, row7, row8, row9 };

  // 7. คำนวณดวงจร (อายุจร & วัยจร)
  const currentYear = new Date().getFullYear();
  let currentAge = currentYear - birthYear;
  const today = new Date();
  const hasBirthdayPassed = today.getMonth() > birthDate.getMonth() || 
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  
  if (!hasBirthdayPassed) {
    currentAge--;
  }
  const transitAge = currentAge + 1; // อายุย่าง

  // คำนวณดาวเสวยอายุตามกฎรอบเกณฑ์วัยจร (วนรอบละ 7-8 ปี)
  const planetsCycle = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "เสาร์", "พฤหัส", "ราหู", "ศุกร์"];
  const cycleIndex = (transitAge - 1) % planetsCycle.length;
  const majorCycle = planetsCycle[cycleIndex];
  const minorCycle = planetsCycle[(cycleIndex + 2) % planetsCycle.length];

  // 8. จุดเด่น/จุดด้อย อ้างอิงจากกำลังพระเคราะห์ (ฐานที่ 4)
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  
  // ตรวจจับจุดเด่นมหาอุตม์และฐานโสฬส
  if (row4.includes(15)) strengths.push("มีฐานความสำเร็จดุจกำลังพระจันทร์ (โสฬสมงคลเกื้อหนุน)");
  if (row4.includes(19)) strengths.push("มีฐานพลังจิตวิญญาณหยั่งรู้และวาทศิลป์สูง (กำลังพฤหัสบดี)");
  if (row4.includes(21)) strengths.push("มีเสน่ห์ดึงดูดใจผู้คนรอบข้างดั่งดาวศุกร์พรีเมียม");
  
  if (row4.includes(10)) weaknesses.push("ระวังความขัดแย้งเฉียบพลันจากดาวอังคารครองอารมณ์");
  if (row4.includes(7)) weaknesses.push("ระวังอุปสรรคและกรรมเก่าดั่งดาวเสาร์เสวยเคราะห์");

  // วิเคราะห์ผลจร
  const auspiciousAspects: string[] = [];
  const warningAspects: string[] = [];

  if (majorCycle === "พฤหัส" || majorCycle === "ศุกร์" || majorCycle === "จันทร์") {
    auspiciousAspects.push(`ชีวิตย่างเข้าสู่วัยจรของดาว ${majorCycle} ซึ่งเป็นดาวศุภเคราะห์ จะได้รับโชคลาภ ปัญญา และความก้าวหน้าอย่างคลาสสิก`);
  } else {
    warningAspects.push(`วัยจรหลักตกในดาวบาปเคราะห์ ${majorCycle} ควรเน้นการจัดการระดับพลังงาน หลีกเลี่ยงการใช้อารมณ์ตัดสินปัญหา`);
  }

  const transit: TransitInfo = {
    currentAge,
    transitAge,
    zodiacYear,
    majorCycle,
    minorCycle,
    auspiciousAspects,
    warningAspects
  };

  return {
    birthDate: birthDateStr,
    birthTime: birthTimeStr,
    dayOfWeek,
    dayName,
    lunarMonth,
    zodiacIndex,
    chart,
    transit,
    strengths,
    weaknesses
  };
}
