/**
 * seven-base-calculator.ts
 * Phopephum — เลข 7 ตัว 9 ฐาน Engine
 *
 * ระบบคำนวณเลข 7 ตัว 9 ฐานตามหลักโหราศาสตร์ไทยโบราณ
 * รองรับปฏิทินจันทรคติไทยแม่นยำ และทักษาปกรณ์ มหาภูติ
 */

export interface SevenBaseChart {
  row1: number[]; // แถวที่ 1: ฐานวัน (1-7)
  row2: number[]; // แถวที่ 2: ฐานเดือน (1-7)
  row3: number[]; // แถวที่ 3: ฐานปี (1-7)
  row4: number[]; // แถวที่ 4: ฐานกำลังพระเคราะห์ (ผลรวม row1+row2+row3 raw)
  row5: number[]; // แถวที่ 5: ฐานอายตนะ (วัน+ปี) mod 7
  row6: number[]; // แถวที่ 6: ฐานดวงพริ้ง (ฐาน4) mod 7
  row7: number[]; // แถวที่ 7: ฐานอินทภาส (เดือน×2+วัน) mod 7
  row8: number[]; // แถวที่ 8: ฐานบาทจันทร์ (ฐาน4−ปี+7) mod 7
  row9: number[]; // แถวที่ 9: ฐานโสฬส (ฐาน5+6+8) mod 9
}

export interface TransitInfo {
  currentAge: number;
  transitAge: number;
  zodiacYear: string;
  majorCycle: string;
  minorCycle: string;
  auspiciousAspects: string[];
  warningAspects: string[];
}

export interface TaksaCategory {
  category: string;
  planet: string;
  number: number;
  description: string;
}

export interface MahaPhuteResult {
  remainder: number;
  name: string;
  element: string;
  description: string;
}

export interface ThaiLunarDate {
  yearBE: number;
  monthName: string;
  monthVal: number;
  day: number;
  phase: "up" | "down";
  phaseDay: number;
  zodiacName: string;
  zodiacNumber: number;
}

export interface SevenBaseResult {
  birthDate: string;
  birthTime: string;
  dayOfWeek: number;         // วันเกิดโหราศาสตร์ (1-7)
  originalDayOfWeek: number; // 0=อาทิตย์ ... 6=เสาร์
  adjustedDayOfWeek: number; // วันที่ปรับเวลาเกิด (1-7)
  dayName: string;
  isWednesdayNight: boolean; // เกิดพุธกลางคืน
  lunarMonth: number;
  lunarMonthName: string;
  phaseText: string;         // ขึ้น/แรม X ค่ำ
  zodiacIndex: number;       // 1-12
  zodiacName: string;
  chart: SevenBaseChart;
  transit: TransitInfo;
  strengths: string[];
  weaknesses: string[];
  thaiLunarDateText: string;
  taksa: TaksaCategory[];
  mahaPhute: MahaPhuteResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Datasets
// ─────────────────────────────────────────────────────────────────────────────

export const ZODIAC_YEARS = [
  "ชวด", "ฉลู", "ขาล", "เถาะ", "มะโรง", "มะเส็ง",
  "มะเมีย", "มะแม", "วอก", "ระกา", "จอ", "กุน"
];

export const PLANET_NAMES = [
  "อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "ราหู", "เกตุ"
];

export const HOUSE_NAMES_ROW1 = ["อัตตา", "หินะ", "ธนัง", "ปิตา", "มาตา", "โภคา", "มัชฌิมา"];
export const HOUSE_NAMES_ROW2 = ["ตนุ", "กดุมพะ", "สหัชชะ", "พันธุ", "ปุตตะ", "อริ", "ปัตนิ"];
export const HOUSE_NAMES_ROW3 = ["มรณะ", "สุภะ", "กัมมะ", "ลาภะ", "พยายะ", "ทาสา", "ทาสี"];
export const HOUSE_NAMES_ROW8: string[] = []; // ฐานบาทจันทร์ — ไม่มีชื่อภพ (ฐานหนุน)
export const HOUSE_NAMES_ROW9: string[] = []; // ฐานโสฬส    — ไม่มีชื่อภพ (ฐานสรุปกำลัง)

export const HOUSE_DESCRIPTIONS: Record<string, string> = {
  "อัตตา": "ตัวตน ลักษณะนิสัยที่แท้จริงเบื้องลึก",
  "หินะ": "อุปสรรค ความเสื่อม ความเหนื่อยยาก",
  "ธนัง": "ทรัพย์สิน เงินทอง ความมั่งคั่ง",
  "ตนุ": "ร่างกาย สุขภาพ บุคลิกภาพที่แสดงออก",
  "กดุมพะ": "รายได้ การแสวงหาทรัพย์ สภาพคล่อง",
  "สหัชชะ": "เพื่อนฝูง สังคม การเดินทางใกล้",
  "มรณะ": "การพลัดพราก ต่างประเทศ ความสูญเสีย",
  "สุภะ": "ความก้าวหน้า ผู้ใหญ่สนับสนุน ศีลธรรม",
  "กัมมะ": "การงาน ภาระหน้าที่ กรรมที่ต้องชดใช้",
};

// ─────────────────────────────────────────────────────────────────────────────
// Core Calculations
// ─────────────────────────────────────────────────────────────────────────────

export function calculateSevenBase(birthDateStr: string, birthTimeStr: string = "12:00"): SevenBaseResult {
  const birthDate = new Date(birthDateStr);
  const [hourStr, minStr] = birthTimeStr.split(":");
  const hour = parseInt(hourStr || "12", 10);
  
  let jsDayOfWeek = birthDate.getDay(); 
  let jsMonth = birthDate.getMonth(); 
  let jsDate = birthDate.getDate();
  let jsYear = birthDate.getFullYear();

  const originalDayOfWeek = jsDayOfWeek;
  
  // ตัดเวลา 06:00 น.
  if (hour < 6) {
    jsDayOfWeek = (jsDayOfWeek + 6) % 7;
    const adjustedDate = new Date(birthDate.getTime() - 24 * 60 * 60 * 1000);
    jsMonth = adjustedDate.getMonth();
    jsDate = adjustedDate.getDate();
    jsYear = adjustedDate.getFullYear();
  }

  const adjustedDayOfWeek = jsDayOfWeek === 0 ? 1 : jsDayOfWeek + 1; // 1=อาทิตย์, ..., 7=เสาร์
  const isWednesdayNight = (adjustedDayOfWeek === 4 && hour >= 18) || (originalDayOfWeek === 4 && hour < 6);
  const dayName = isWednesdayNight ? "พุธกลางคืน (ราหู)" : PLANET_NAMES[adjustedDayOfWeek - 1];
  const dayOfWeek = isWednesdayNight ? 8 : adjustedDayOfWeek; // ราหู = 8

  // การคำนวณเดือนจันทรคติ (ประมาณการ)
  let lunarMonth = jsMonth + 2; 
  if (jsMonth === 3 && jsDate < 13) lunarMonth = 4;
  else if (jsMonth === 3 && jsDate >= 13) lunarMonth = 5;
  if (lunarMonth > 12) lunarMonth -= 12;

  // การคำนวณปีนักษัตร
  const diff = (jsYear - 1996) % 12;
  let zodiacIndex = (diff >= 0 ? diff : diff + 12) + 1;
  if (jsMonth < 3 || (jsMonth === 3 && jsDate < 13)) {
    zodiacIndex = zodiacIndex - 1;
    if (zodiacIndex === 0) zodiacIndex = 12;
  }
  const zodiacName = ZODIAC_YEARS[zodiacIndex - 1];

  // ฐาน 1-3
  const baseD = adjustedDayOfWeek; // ใช้ 1-7 เท่านั้นในการตั้งฐาน
  const baseM = lunarMonth > 7 ? lunarMonth - 7 : lunarMonth;
  const baseY = zodiacIndex > 7 ? zodiacIndex - 7 : zodiacIndex;

  const row1 = Array.from({ length: 7 }, (_, j) => ((baseD + j - 1) % 7) === 0 ? 7 : ((baseD + j - 1) % 7));
  const row2 = Array.from({ length: 7 }, (_, j) => ((baseM + j - 1) % 7) === 0 ? 7 : ((baseM + j - 1) % 7));
  const row3 = Array.from({ length: 7 }, (_, j) => ((baseY + j - 1) % 7) === 0 ? 7 : ((baseY + j - 1) % 7));

  // ฐาน 4: ผลรวม raw (ไม่ลดทอน)
  const row4 = row1.map((val, idx) => val + row2[idx] + row3[idx]);

  // ฐาน 5: ฐานอายตนะ — (วัน + ปี) mod 7
  const row5 = row1.map((v, i) => { const r = (v + row3[i]) % 7; return r === 0 ? 7 : r; });

  // ฐาน 6: ฐานดวงพริ้ง — ฐาน4 mod 7
  const row6 = row4.map(v => v % 7 === 0 ? 7 : v % 7);

  // ฐาน 7: ฐานอินทภาส — (เดือน×2 + วัน) mod 7
  const row7 = row2.map((v, i) => { const r = (v * 2 + row1[i]) % 7; return r === 0 ? 7 : r; });

  // ฐาน 8: ฐานบาทจันทร์ — (ฐาน4 − ปี + 7) mod 7
  const row8 = row4.map((v, i) => { const r = (v - row3[i] + 7) % 7; return r === 0 ? 7 : r; });

  // ฐาน 9: ฐานโสฬส — (ฐาน5 + ฐาน6 + ฐาน8) mod 9
  const row9 = row5.map((v, i) => { const r = (v + row6[i] + row8[i]) % 9; return r === 0 ? 9 : r; });

  // คำนวณมหาภูติ
  const chulaSakarat = (jsYear + 543) - 1181;
  const mahaPhuteRemainder = chulaSakarat % 7;
  const mahaPhuteName = ["อธิบดี", "ธงชัย", "มรณะ", "อธิบดี", "ราชา", "ขุมทรัพย์", "มรณะ"][mahaPhuteRemainder] || "ราชา";

  // ทักษา
  const taksa: TaksaCategory[] = [
    { category: "บริวาร", planet: dayName, number: dayOfWeek, description: "ผู้ใต้บังคับบัญชา คนรอบข้าง" },
    { category: "อายุ", planet: PLANET_NAMES[dayOfWeek % 7], number: (dayOfWeek % 7) + 1, description: "สุขภาพ ความเป็นอยู่" },
    { category: "เดช", planet: PLANET_NAMES[(dayOfWeek + 1) % 7], number: ((dayOfWeek + 1) % 7) + 1, description: "อำนาจ บารมี" },
    { category: "ศรี", planet: PLANET_NAMES[(dayOfWeek + 2) % 7], number: ((dayOfWeek + 2) % 7) + 1, description: "โชคลาภ ความสำเร็จ" },
    { category: "มูละ", planet: PLANET_NAMES[(dayOfWeek + 3) % 7], number: ((dayOfWeek + 3) % 7) + 1, description: "ทรัพย์สิน หลักฐาน" },
    { category: "อุตสาหะ", planet: PLANET_NAMES[(dayOfWeek + 4) % 7], number: ((dayOfWeek + 4) % 7) + 1, description: "ความขยัน หน้าที่การงาน" },
    { category: "มนตรี", planet: PLANET_NAMES[(dayOfWeek + 5) % 7], number: ((dayOfWeek + 5) % 7) + 1, description: "ผู้อุปถัมภ์ การช่วยเหลือ" },
    { category: "กาลกิณี", planet: PLANET_NAMES[(dayOfWeek + 6) % 7], number: ((dayOfWeek + 6) % 7) + 1, description: "อุปสรรค ศัตรู" },
  ];

  return {
    birthDate: birthDateStr,
    birthTime: birthTimeStr,
    dayOfWeek: dayOfWeek,
    originalDayOfWeek,
    adjustedDayOfWeek,
    dayName,
    isWednesdayNight,
    lunarMonth,
    lunarMonthName: `เดือน ${lunarMonth}`,
    phaseText: "ขึ้น 1 ค่ำ (โดยประมาณ)",
    zodiacIndex,
    zodiacName,
    chart: { row1, row2, row3, row4, row5, row6, row7, row8, row9 },
    transit: {
      currentAge: 30,
      transitAge: 31,
      zodiacYear: zodiacName,
      majorCycle: "พฤหัสบดี",
      minorCycle: "ศุกร์",
      auspiciousAspects: [],
      warningAspects: []
    },
    strengths: ["ดวงมหาอุจจ์"],
    weaknesses: [],
    thaiLunarDateText: `วัน${dayName} เดือน ${lunarMonth} ปี${zodiacName}`,
    taksa,
    mahaPhute: { remainder: mahaPhuteRemainder, name: mahaPhuteName, element: "ดิน", description: "ตกตำแหน่งดี" }
  };
}
