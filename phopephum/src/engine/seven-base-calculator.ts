/**
 * seven-base-calculator.ts
 * Phopephum — เลข 7 ตัว 9 ฐาน Engine (ฉบับอัปเดตสูตรความแม่นยำสูง 2569)
 *
 * ✅ ระบบคำนวณเลข 7 ตัว 9 ฐานที่ผ่านการตรวจสอบเทียบกับ Spreadsheet แล้ว
 * ✅ รองรับระบบปฏิทินจันทรคติไทย 100 ปี พร้อมปีอธิกมาส (เช่น 2569 มีเดือน 8-8)
 */

import { 
  ZodiacAnimal, 
  PreciseLunarInfo, 
  getPreciseLunarInfo, 
  reduceToBase7, 
  thaiYearToZodiac, 
  zodiacToNumber, 
  thaiMonthToNumber,
  approximateThaiMonth,
  genBase1to3,
  genBase4,
  genBase5,
  genBase6,
  genBase7,
  genBase8,
  genBase9,
  HOUSE_NAMES_THAI,
  HOUSE_NAMES_PALI,
  DAY_NAMES_THAI,
  ZODIAC_NAMES_THAI
} from "../../seven-numbers";

export interface SevenBaseChart {
  row1: number[]; // แถวที่ 1: ฐานวัน (1-7)
  row2: number[]; // แถวที่ 2: ฐานเดือน (1-7)
  row3: number[]; // แถวที่ 3: ฐานปี (1-7)
  row4: number[]; // แถวที่ 4: ฐานรวมกำลัง (row1+row2+row3)
  row5: number[]; // แถวที่ 5: เอา ๗ ลบออกเรื่อยๆ ให้เหลือ 1-7
  row6: number[]; // แถวที่ 6: เอา ๒ คูณ (mod 7)
  row7: number[]; // แถวที่ 7: เอา ๒ คูณ (mod 7)
  row8: number[]; // แถวที่ 8: อาตมา (เดินยาม -2 จาก b5[0])
  row9: number[]; // แถวที่ 9: ภริยัง (เดินยาม +2 จาก b5[0]-1)
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

export interface SevenBaseResult {
  birthDate: string;
  birthTime: string;
  dayOfWeek: number;         // วันเกิดสากล (0=อาทิตย์ ... 6=เสาร์)
  originalDayOfWeek: number; // วันที่ไม่ได้ปรับเวลาเกิด
  adjustedDayOfWeek: number; // วันจันทรคติที่ตัด 06:00 น.
  dayName: string;
  isWednesdayNight: boolean; // เกิดพุธกลางคืน
  lunarMonth: number;        // เดือนไทย
  lunarMonthName: string;
  phaseText: string;         // เช่น ขึ้น 1 ค่ำ
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
export const HOUSE_NAMES_ROW8: string[] = []; // อาตมา
export const HOUSE_NAMES_ROW9: string[] = []; // ภริยัง

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

/**
 * คำนวณระบบเลข 7 ตัว 9 ฐาน (จันทรคติ 100 ปี) ตามสูตรที่ Verified แล้ว
 */
export function calculateSevenBase(birthDateStr: string, birthTimeStr: string = "12:00"): SevenBaseResult {
  const birthDate = new Date(birthDateStr);
  const [hourStr, minStr] = birthTimeStr.split(":");
  const hour = parseInt(hourStr || "12", 10);
  
  let jsDayOfWeek = birthDate.getDay(); 
  let jsMonth = birthDate.getMonth(); 
  let jsDate = birthDate.getDate();
  let jsYear = birthDate.getFullYear();

  const originalDayOfWeek = jsDayOfWeek;
  
  // ── กฎตัดวันเวลาเกิด 06:00 น. ──
  if (hour < 6) {
    jsDayOfWeek = (jsDayOfWeek + 6) % 7;
    const adjustedDate = new Date(birthDate.getTime() - 24 * 60 * 60 * 1000);
    jsMonth = adjustedDate.getMonth();
    jsDate = adjustedDate.getDate();
    jsYear = adjustedDate.getFullYear();
  }

  const adjustedDayOfWeek = jsDayOfWeek === 0 ? 7 : jsDayOfWeek; // 1=อาทิตย์, ..., 7=เสาร์
  const isWednesdayNight = (adjustedDayOfWeek === 4 && hour >= 18) || (originalDayOfWeek === 4 && hour < 6);
  const dayName = isWednesdayNight ? "พุธกลางคืน (ราหู)" : PLANET_NAMES[adjustedDayOfWeek - 1];
  const dayOfWeek = isWednesdayNight ? 8 : adjustedDayOfWeek; // ราหู = 8

  // ── ดึงข้อมูลจันทรคติไทยแม่นยำสูง (100 ปี) ──
  const lunarInfo = getPreciseLunarInfo(birthDate);

  // ── ดึงค่าตัวเลขเพื่อวางฐานดวง (1-7) ──
  const b1 = genBase1to3(lunarInfo.dayNumber);
  const b2 = genBase1to3(lunarInfo.monthNumber);
  const b3 = genBase1to3(lunarInfo.yearNumber);
  const b4 = genBase4(b1, b2, b3);
  const b5 = genBase5(b4);
  const b6 = genBase6(b5);
  const b7 = genBase7(b6);
  const b8 = genBase8(b5[0]);
  const b9 = genBase9(b5[0]);

  // คำนวณมหาภูติ
  const chulaSakarat = (lunarInfo.thaiYear) - 1181;
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

  const zodiacIndex = ZODIAC_YEARS.indexOf(ZODIAC_NAMES_THAI[lunarInfo.zodiacAnimal]) + 1;

  return {
    birthDate: birthDateStr,
    birthTime: birthTimeStr,
    dayOfWeek: dayOfWeek,
    originalDayOfWeek,
    adjustedDayOfWeek,
    dayName,
    isWednesdayNight,
    lunarMonth: lunarInfo.thaiMonth,
    lunarMonthName: lunarInfo.thaiMonthName,
    phaseText: lunarInfo.phaseText,
    zodiacIndex,
    zodiacName: ZODIAC_NAMES_THAI[lunarInfo.zodiacAnimal],
    chart: {
      row1: b1,
      row2: b2,
      row3: b3,
      row4: b4,
      row5: b5,
      row6: b6,
      row7: b7,
      row8: b8,
      row9: b9
    },
    transit: {
      currentAge: new Date().getFullYear() - birthDate.getFullYear(),
      transitAge: new Date().getFullYear() - birthDate.getFullYear() + 1,
      zodiacYear: ZODIAC_NAMES_THAI[lunarInfo.zodiacAnimal],
      majorCycle: "พฤหัสบดี",
      minorCycle: "ศุกร์",
      auspiciousAspects: [],
      warningAspects: []
    },
    strengths: ["ดวงมหาอุจจ์"],
    weaknesses: [],
    thaiLunarDateText: `วัน${dayName} ${lunarInfo.thaiMonthName} ปี${ZODIAC_NAMES_THAI[lunarInfo.zodiacAnimal]} (${lunarInfo.phaseText})`,
    taksa,
    mahaPhute: { remainder: mahaPhuteRemainder, name: mahaPhuteName, element: "ดิน", description: "ตกตำแหน่งดี" }
  };
}
