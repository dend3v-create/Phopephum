/**
 * phopephum-calculator.ts
 * Phopephum — ยามอัฐกาล Engine
 *
 * ระบบคำนวณยามอัฐกาล (โหรทายหนู) ตามหลักโหราศาสตร์ไทย
 * - กลางวัน 8 ยาม (06:00 - 18:00 น.) ยามละ 90 นาที
 * - กลางคืน 8 ยาม (18:00 - 06:00 น.) ยามละ 90 นาที
 * - แต่ละยามมี 3 ยามย่อย (ยามต้น, ยามกลาง, ยามปลาย) ยามละ 30 นาที
 * - แต่ละยามมี 9 ยามซอย (ราหูค้นทรัพย์) ฤกษ์ละ 10 นาที
 *
 * @module phopephum-calculator
 * @version 2.2.0
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types & Backwards Compatibility Types
// ─────────────────────────────────────────────────────────────────────────────

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
// 0=อาทิตย์, 1=จันทร์, 2=อังคาร, 3=พุธ, 4=พฤหัสบดี, 5=ศุกร์, 6=เสาร์

export type PlanetId = string; // สำหรับความเข้ากันได้แบบย้อนหลัง (Backwards Compatibility)

export type HourPeriod = "day" | "night";

export interface Planet {
  id: string;
  nameThai: string;
  nameEn: string;
  symbol: string;
  color: string;
  number: number;
  description?: string;
  nature?: "benefic" | "malefic" | "neutral";
  promotes?: string[];
  warns?: string[];
}

export interface HoraSlot {
  slot: number; // ยามย่อย 1-3
  name: string; // "ยามต้น" | "ยามกลาง" | "ยามปลาย"
  startTime: string;
  endTime: string;
  startMinute: number;
  endMinute: number;
  planet: Planet; // สำหรับความเข้ากันได้แบบย้อนหลัง
  period: HourPeriod; // สำหรับความเข้ากันได้แบบย้อนหลัง
}

export interface NineSegmentSlot {
  index: number; // 1-9
  name: string; // "ทาษา", "คหปติ", ...
  startTime: string;
  endTime: string;
  startMinute: number;
  endMinute: number;
  description: string;
}

export interface HoraMajorSlot {
  majorSlot: number; // 1-16 (1-8 กลางวัน, 9-16 กลางคืน)
  yamNumber: number; // 1-8
  name: string; // "กลางวัน ยามที่ X" | "กลางคืน ยามที่ X"
  period: HourPeriod;
  startTime: string;
  endTime: string;
  startMinute: number;
  endMinute: number;
  starName: string; // ชื่อดาวประจำยาม เช่น "สุริยะ", "พุทโธ"
  starNumber: number; // เลขดาว 1-7
  rulerPlanet: Planet; // สำหรับความเข้ากันได้แบบย้อนหลัง
  predictions: YamPredictions;
  subSlots: HoraSlot[]; // 3 ยามย่อย (ยามต้น, ยามกลาง, ยามปลาย)
  nineSegments: NineSegmentSlot[]; // 9 ยามซอย (ราหูค้นทรัพย์)
}

export interface YamPredictions {
  hearing: string;      // เรื่องที่ได้ยิน
  sick: string;         // คนเจ็บไข้
  lost: string;         // ของหาย
  travelStart: string;  // การเดินทาง (ยามต้น)
  travelMiddle: string; // การเดินทาง (ยามกลาง)
  travelEnd: string;    // การเดินทาง (ยามปลาย)
  bestTime: string;     // เวลาที่ดี
  auspicious?: string;   // ด้านมงคล
  shouldDo?: string;     // สิ่งที่ควรทำ
  shouldNotDo?: string;  // ไม่ควรทำ
  howTo?: string;        // ถ้าจะทำทำแบบไหน
}

export interface HoraResult {
  date: Date;
  dayOfWeek: DayOfWeek;
  dayNameThai: string;
  dayRuler: Planet;
  majorSlots: HoraMajorSlot[];
  currentHora?: CurrentHoraInfo;
}

export interface CurrentHoraInfo {
  majorSlot: HoraMajorSlot;
  yamNumber: number;
  period: HourPeriod;
  starName: string;
  starNumber: number;
  rulerPlanet: Planet;
  minutesRemaining: number;
  progressPercent: number;
  elapsedMinutesInYam: number;
  activeSubYam: HoraSlot;
  activeNineSegment: NineSegmentSlot;
  predictions: {
    hearing: string;
    sick: string;
    lost: string;
    travel: string;
    bestTime: string;
    auspicious?: string;
    shouldDo?: string;
    shouldNotDo?: string;
    howTo?: string;
  };
  // Properties below are for backwards compatibility with coach route & LiveHoraWidget
  subSlot: HoraSlot;
  majorIndex: number;
  subIndex: number;
}

export interface HoraInput {
  date: Date;
  currentTime?: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Datasets
// ─────────────────────────────────────────────────────────────────────────────

export const PLANETS: Record<string, Planet> = {
  sun: { 
    id: "sun", nameThai: "อาทิตย์", nameEn: "Sun", symbol: "☉", color: "#EF4444", number: 1, 
    description: "ดาวแห่งเกียรติยศและอำนาจบารมี", nature: "benefic",
    promotes: ["ผู้นำ", "การเจรจา", "ความมีชื่อเสียง", "สุขภาพ"], warns: ["อัตตาสูง", "ความเย่อหยิ่ง"] 
  },
  moon: { 
    id: "moon", nameThai: "จันทร์", nameEn: "Moon", symbol: "☽", color: "#FBBF24", number: 2, 
    description: "ดาวแห่งเสน่ห์ เมตตา และความสัมพันธ์", nature: "benefic",
    promotes: ["ความสัมพันธ์", "การดูแล", "ความคิดสร้างสรรค์", "การค้าขาย"], warns: ["อารมณ์แปรปรวน", "ตัดสินใจด้วยอารมณ์"]
  },
  mars: { 
    id: "mars", nameThai: "อังคาร", nameEn: "Mars", symbol: "♂", color: "#EC4899", number: 3, 
    description: "ดาวแห่งพลังงาน ความเด็ดเดี่ยว และการต่อสู้", nature: "malefic",
    promotes: ["ความกล้าหาญ", "พลังงาน", "ความเด็ดเดี่ยว", "ธุรกิจ"], warns: ["ความขัดแย้ง", "อุบัติเหตุ", "ความโกรธ"]
  },
  mercury: { 
    id: "mercury", nameThai: "พุธ", nameEn: "Mercury", symbol: "☿", color: "#10B981", number: 4, 
    description: "ดาวแห่งการเจรจา ปัญญา และการค้าขาย", nature: "neutral",
    promotes: ["การสื่อสาร", "ธุรกิจ", "การเรียนรู้", "เทคโนโลยี", "การเขียน"], warns: ["ความไม่ซื่อสัตย์", "ความลังเล"]
  },
  jupiter: { 
    id: "jupiter", nameThai: "พฤหัส", nameEn: "Jupiter", symbol: "♃", color: "#F97316", number: 5, 
    description: "ดาวแห่งโชคลาภ ปัญญา และความสำเร็จ", nature: "benefic",
    promotes: ["โชคลาภ", "ปัญญา", "จิตวิญญาณ", "การศึกษา", "กฎหมาย"], warns: ["การสุรุ่ยสุร่าย", "การประมาทเลินเล่อ"]
  },
  venus: { 
    id: "venus", nameThai: "ศุกร์", nameEn: "Venus", symbol: "♀", color: "#3B82F6", number: 6, 
    description: "ดาวแห่งความสุข ศิลปะ และความรัก", nature: "benefic",
    promotes: ["ความรัก", "ศิลปะ", "ความงาม", "ความบันเทิง", "สันติภาพ"], warns: ["ความฟุ่มเฟือย", "ความโลภ"]
  },
  saturn: { 
    id: "saturn", nameThai: "เสารี", nameEn: "Saturn", symbol: "♄", color: "#8B5CF6", number: 7, 
    description: "ดาวแห่งวินัย ความอดทน และความมั่นคงระยะยาว", nature: "malefic",
    promotes: ["ความอดทน", "วินัย", "ความพยายาม", "งานหนัก"], warns: ["ความล่าช้า", "อุปสรรค", "โรคภัย"]
  },
};

export const DAY_NAMES_THAI = [
  "อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"
];

// ดาวประจำวัน
export const DAY_RULERS_PLANETS = [
  PLANETS.sun,     // 0 = อาทิตย์
  PLANETS.moon,    // 1 = จันทร์
  PLANETS.mars,    // 2 = อังคาร
  PLANETS.mercury, // 3 = พุธ
  PLANETS.jupiter, // 4 = พฤหัสบดี
  PLANETS.venus,   // 5 = ศุกร์
  PLANETS.saturn,  // 6 = เสาร์
];

// ยามกลางวัน (ยาม 1 - 8)
export const DAYTIME_YAM_STARS: Record<DayOfWeek, string[]> = {
  0: ["สุริยะ", "ศุกระ", "พุทธะ", "จันเทา", "เสารี", "ครู", "ภุมมะ", "สุริยะ"], // อาทิตย์
  1: ["จันเทา", "เสารี", "ครู", "ภุมมะ", "สุริยะ", "ศุกระ", "พุทธะ", "จันเทา"], // จันทร์
  2: ["ภุมมะ", "สุริยะ", "ศุกระ", "พุทธะ", "จันเทา", "เสารี", "ครู", "ภุมมะ"], // อังคาร
  3: ["พุทธะ", "จันเทา", "เสารี", "ครู", "ภุมมะ", "สุริยะ", "ศุกระ", "พุทธะ"], // พุธ
  4: ["ครู", "ภุมมะ", "สุริยะ", "ศุกระ", "พุทธะ", "จันเทา", "เสารี", "ครู"], // พฤหัสบดี
  5: ["ศุกระ", "พุทธะ", "จันเทา", "เสารี", "ครู", "ภุมมะ", "สุริยะ", "ศุกระ"], // ศุกร์
  6: ["เสารี", "ครู", "ภุมมะ", "สุริยะ", "ศุกระ", "พุทธะ", "จันเทา", "เสารี"], // เสาร์
};

// ยามกลางคืน (ยาม 1 - 8)
export const NIGHTTIME_YAM_STARS: Record<DayOfWeek, string[]> = {
  0: ["ระวิ", "ชีโว", "คะศิ", "ศุโกร", "ภุมโม", "โสโร", "พุทโธ", "ระวิ"], // อาทิตย์
  1: ["คะศิ", "ศุโกร", "ภุมโม", "โสโร", "พุทโธ", "ระวิ", "ชีโว", "คะศิ"], // จันทร์
  2: ["ภุมโม", "โสโร", "พุทโธ", "ระวิ", "ชีโว", "คะศิ", "ศุโกร", "ภุมโม"], // อังคาร
  3: ["พุทโธ", "ระวิ", "ชีโว", "คะศิ", "ศุโกร", "ภุมโม", "โสโร", "พุทโธ"], // พุธ
  4: ["ชีโว", "คะศิ", "ศุโกร", "ภุมโม", "โสโร", "พุทโธ", "ระวิ", "ชีโว"], // พฤหัสบดี
  5: ["ศุโกร", "ภุมโม", "โสโร", "พุทโธ", "ระวิ", "ชีโว", "คะศิ", "ศุโกร"], // ศุกร์
  6: ["โสโร", "พุทโธ", "ระวิ", "ชีโว", "คะศิ", "ศุโกร", "ภุมโม", "โสโร"], // เสาร์
};

// แผนผังคำทำนายดาวประจำยาม (1 - 7)
export const PREDICTION_DATABASE: Record<number, YamPredictions & { starNameDay: string; starNameNight: string }> = {
  1: {
    starNameDay: "สุริยะ",
    starNameNight: "ระวิ",
    hearing: "เชื่อถือได้ เป็นเรื่องจริง ทำจริง มีเรื่องร้อนใจ",
    sick: "จะตาย",
    lost: "จะได้คืน ของอยู่ในที่สูง ใกล้กับสิ่งสีแดงๆ มีแสงสว่าง แสงแวววาว",
    travelStart: "เดินทางไกลจะมีเคราะห์ร้าย อันตราย",
    travelMiddle: "เดินทางได้ลาภ",
    travelEnd: "เดินทางไม่ดีจะมีเคราะห์ร้าย เสื่อมเสียศักดิ์ศรี",
    bestTime: "ยามกลาง",
    auspicious: "อำนาจ, เกียรติยศ, ชื่อเสียง",
    shouldDo: "เข้าหาผู้ใหญ่, เจรจางานราชการ, ประกาศตัว",
    shouldNotDo: "งานเสี่ยงอันตราย, การตัดสินใจด้วยความโกรธ",
    howTo: "ทำด้วยความสง่างาม, เด็ดขาด, ชัดเจน",
  },
  2: {
    starNameDay: "จันเทา",
    starNameNight: "คะศิ",
    hearing: "จริงครึ่ง เท็จครึ่ง พูดด้วยอารมณ์อ่อนไหว มีจริตมารยา พูดกลับไปกลับมา",
    sick: "รักษานาน เป็นๆ หายๆ รักษาไม่หายขาดเป็นตายเท่ากัน",
    lost: "อยู่ในน้ำ หรือที่ชื้นแฉะ อาจได้คืนช้า หรือไม่ได้คืน",
    travelStart: "เดินทางไกล ให้ระวังจะประสบอุบัติเหตุ",
    travelMiddle: "เดินทางไกลได้ลาภ แต่ห้ามเดินทางเพราะจะเคราะห์ร้าย",
    travelEnd: "ห้ามเดินทางไกล จะมีเคราะห์ร้าย เสียทรัพย์สิน",
    bestTime: "ยามกลาง",
    auspicious: "เสน่ห์, เมตตา, การช่วยเหลือ",
    shouldDo: "เจรจาค้าขาย, งานบริการ, ขอความช่วยเหลือ",
    shouldNotDo: "ตัดสินใจเรื่องใหญ่ด้วยอารมณ์, งานที่ต้องใช้ความเด็ดขาด",
    howTo: "ทำด้วยความนุ่มนวล, ใส่ใจความรู้สึก, ประนีประนอม",
  },
  3: {
    starNameDay: "ภุมมะ",
    starNameNight: "ภุมโม",
    hearing: "เป็นเรื่องเท็จ เชื่อถือไม่ได้",
    sick: "จะหาย เป็นเร็ว หายเร็ว ไม่ตายง่าย",
    lost: "ไม่ได้คืน อาจอยู่ใกล้เครื่องใช้ไฟฟ้า ศาสตราวุธ ของมีคม เครื่องมือต่างๆ",
    travelStart: "เดินทางมีเคราะห์ร้าย ในต้นอุบัติเหตุ",
    travelMiddle: "เดินทางไกลจะเกิดไฟไหม้ ถูกโจรปล้นทรัพย์สินเงินทอง ระหว่างเดินทาง",
    travelEnd: "เดินทางไกลได้ลาภเป็นเงินเป็นทองมากมาย พบมิตร ระหว่างทาง จะคบกันไปได้นานๆ",
    bestTime: "ยามปลาย",
    auspicious: "ความกล้า, พลัง, การลงมือทำ",
    shouldDo: "ลุยงานยาก, กีฬา, การแข่งขัน, ซ่อมแซม",
    shouldNotDo: "เริ่มกิจการใหม่, เดินทางไกล, ทะเลาะวิวาท",
    howTo: "ทำด้วยความเร็ว, มุ่งมั่น, ไม่ลังเล",
  },
  4: {
    starNameDay: "พุทธะ",
    starNameNight: "พุทโธ",
    hearing: "เป็นเรื่องจริง เชื่อถือได้",
    sick: "จะตาย (หากรักษาด้วยยาสมุนไพร หรือของที่หาได้จากธรรมชาติ มีโอกาสรอดบ้าง)",
    lost: "จะได้คืน อยู่แถวเสื้อผ้า กองกระดาษ เครื่องมือสื่อสาร ในครัว หรือต้องถามหาจากคนในบ้าน อาจมีผู้เก็บรักษาไว้ให้",
    travelStart: "เดินทางไกลๆ จะมีเคราะห์ร้าย ติดขัดไปหมดทุกทาง",
    travelMiddle: "เดินทางได้ลาภเงินทองจำนวนมาก พบปะ เจรจาความกับผู้ใหญ่ก็ได้สมประสงค์",
    travelEnd: "เดินทางได้ลาภมากมาย เจรจาความกับผู้ใหญ่ก็ได้สมประสงค์",
    bestTime: "ยามกลาง และยามปลาย",
    auspicious: "ปัญญา, การสื่อสาร, ธุรกิจ",
    shouldDo: "เจรจาธุรกิจ, เซ็นสัญญา, เรียนรู้สิ่งใหม่",
    shouldNotDo: "ความไม่ซื่อสัตย์, การพูดเพ้อเจ้อ, การโกหก",
    howTo: "ทำด้วยการใช้เหตุผล, เตรียมข้อมูลให้ดี, สื่อสารชัดเจน",
  },
  5: {
    starNameDay: "ครู",
    starNameNight: "ชีโว",
    hearing: "จริงเท่าเทียมกัน อย่างพึงเชื่อ",
    sick: "เป็นๆ หายๆ ต้องใช้ยาเป็นประจำ (ถ้าป่วยหนัก เป็นตายเท่ากัน)",
    lost: "จะได้คืน หรือไม่ได้เท่ากัน อาจจะอยู่ใกล้ตู้ยา เครื่องมือแพทย์ ตำรา หนังสือต่างๆ ใกล้สิ่งศักดิ์สิทธิ์",
    travelStart: "เดินทางไกลได้ลาภมากมาย มิตรนำลาภมาให้พบปะผู้ใหญ่ให้คุณดีมาก",
    travelMiddle: "เดินทางไกลจะเสียผลประโยชน์ ติดขัด เจรจาความใดๆ ไม่สำเร็จ",
    travelEnd: "เดินทางไกลจะเสียผลประโยชน์จำนวนมาก เจอศัตรู หมู่มาร",
    bestTime: "ยามต้น",
    auspicious: "โชคลาภ, ปัญญา, ความสำเร็จ",
    shouldDo: "ทำบุญ, พบครูบาอาจารย์, ปรึกษาผู้ใหญ่, วางแผนการศึกษา",
    shouldNotDo: "การประมาท, การใช้จ่ายฟุ่มเฟือย, การขาดวินัย",
    howTo: "ทำด้วยความซื่อสัตย์, มีศีลธรรม, ใช้ปัญญา",
  },
  6: {
    starNameDay: "ศุกระ",
    starNameNight: "ศุโกร",
    hearing: "เป็นเรื่องไม่จริง เชื่อถือไม่ได้",
    sick: "ไม่ตาย หายได้เร็วขึ้นอยู่กับกำลังใจของคนไข้",
    lost: "ไม่ได้คืน อาจจะถูกเปลี่ยนเป็นเงิน หรือให้ต่อไปแล้ว (ลองหาดูในกระเป๋าสตางค์ โต๊ะ เครื่องแป้ง ในห้องนอน ตามเสื้อผ้า เครื่องแต่งตัว)",
    travelStart: "ห้ามเดินทางไกล จะมีเคราะห์ร้าย การสูญเสีย บุตร ภรรยา สามี พบศัตรูกลางทาง",
    travelMiddle: "ห้ามเดินทางไกล แม้จะได้ลาภมากก็จะหมดไป หรือถูกขโมยขึ้น",
    travelEnd: "เดินทางไกลได้ลาภมากมาย พบมิตร และเพื่อนต่างเพศ ช่วยเหลือดี",
    bestTime: "ยามปลาย",
    auspicious: "ความสุข, ความรัก, ศิลปะ",
    shouldDo: "งานบันเทิง, ความงาม, เจรจาเรื่องรัก, การตกแต่ง",
    shouldNotDo: "งานที่ต้องใช้ความเครียดสูง, การขัดแย้งกับคนรัก",
    howTo: "ทำด้วยความรื่นรมย์, เน้นความสวยงาม, สร้างความประทับใจ",
  },
  7: {
    starNameDay: "เสารี",
    starNameNight: "โสโร",
    hearing: "เป็นเรื่องจริง เชื่อถือได้",
    sick: "จะตาย หรือต้องรักษานานมาก",
    lost: "จะได้คืน ให้ค้นหาตามที่มืดๆ ใกล้ของสีดำๆ ของสกปรก ท่อระบายน้ำ เตาไฟ ถ่าน",
    travelStart: "ห้ามเดินทางไกล จะพบศัตรู จะเดือดร้อน",
    travelMiddle: "เดินทางดีมาก ได้ลาภจำนวนมากมาย",
    travelEnd: "เดินทางไกลได้ลาภ เงินทอง ของกำนัล",
    bestTime: "ยามกลาง และยามปลาย",
    auspicious: "ความมั่นคง, วินัย, ความอดทน",
    shouldDo: "งานระยะยาว, งานเกษตร, วางแผนระบบ, งานที่ต้องใช้ความอดทน",
    shouldNotDo: "การรีบร้อนหวังผลเร็ว, การลงทุนที่มีความเสี่ยงสูง",
    howTo: "ทำด้วยความอดทน, รอบคอบ, ค่อยเป็นค่อยไป, มั่นคง",
  },
};

// รายละเอียดของ 9 ยามซอย (ราหูค้นทรัพย์)
// ชื่อ = บุคคลที่เป็นตัวแทน / คำอธิบาย = ลักษณะ + งานที่เหมาะสม
export const NINE_SEGMENTS_DATA = [
  { name: "ทาษา",     description: "ทาส คนใช้ บริวาร — เหมาะใช้หาลูกน้อง คนรับใช้ งานบ้าน ไม่เหมาะงานใหญ่" },
  { name: "คหปติ",    description: "คหบดี เจ้าบ้าน นายห้าง — เหมาะค้าขาย ธุรกิจ นายหน้า ติดต่อขอกู้เงิน" },
  { name: "โจรา",     description: "โจร คนร้าย ผู้ก่อการร้าย — เหมาะทวงหนี้ บุกหาศัตรู งานที่ต้องใช้ความเด็ดขาด" },
  { name: "เสนาปติ",  description: "ขุนนาง คนทำราชการ ข้าหลวง — เหมาะติดต่อราชการ สมัครงาน สอบแข่งขัน" },
  { name: "กาลทัณฑ์", description: "ผู้คุมนักโทษ คนขี้คุก คนจัญไร — เหมาะเข้าเยี่ยมนักโทษ สอบปากคำ งานกฎหมาย" },
  { name: "กัลยาณ์",  description: "คนดี สุภาพบุรุษ ผู้มีคุณธรรม — เหมาะพบปะสังสรรค์ เข้าหาผู้ใหญ่ เข้าสังคม" },
  { name: "มหายักษ์", description: "ยักษ์ใหญ่ อสูร ผู้มีอำนาจลึกลับ — เหมาะพิธีกรรมไสยศาสตร์ ปลุกเสกเครื่องราง ถอนศาล" },
  { name: "ธนบดินทร์", description: "เจ้าของทรัพย์ นายเงิน ผู้มั่งคั่ง — เหมาะเข้าเฝ้าเจ้านาย ผู้ปกครองระดับสูง เรื่องการเงิน" },
  { name: "นักพรต",   description: "นักบวช พระสงฆ์ ผู้ทรงศีล — เหมาะพิธีกรรมทางศาสนา สวดมนต์ ถือศีล ทำบุญ" },
];

// แปลงดาวครองยามภาษาไทย เป็นหมายเลขดาวครองยาม 1-7
export function getStarNumber(starName: string): number {
  if (starName === "สุริยะ" || starName === "ระวิ") return 1;
  if (starName === "จันเทา" || starName === "คะศิ") return 2;
  if (starName === "ภุมมะ" || starName === "ภุมโม") return 3;
  if (starName === "พุทธะ" || starName === "พุทโธ") return 4;
  if (starName === "ครู" || starName === "ชีโว") return 5;
  if (starName === "ศุกระ" || starName === "ศุโกร") return 6;
  if (starName === "เสารี" || starName === "โสโร") return 7;
  return 1;
}

// ดึงรายละเอียด Object Planet ตาม Star Number
export function getPlanetByNumber(starNum: number, starName: string, predictions: YamPredictions): Planet {
  const basePlanets = [PLANETS.sun, PLANETS.moon, PLANETS.mars, PLANETS.mercury, PLANETS.jupiter, PLANETS.venus, PLANETS.saturn];
  const base = basePlanets[starNum - 1] || PLANETS.sun;
  return {
    ...base,
    nameThai: starName,
    description: predictions.hearing,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Backwards Compatibility Constants and Functions (For Tests, Types & Widgets)
// ─────────────────────────────────────────────────────────────────────────────

export const PLANET_CHALDEAN_ORDER: PlanetId[] = ["saturn", "jupiter", "mars", "sun", "venus", "mercury", "moon"];
export const DAY_RULERS: PlanetId[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];

export function getPlanetChaldeanIndex(id: PlanetId): number {
  return PLANET_CHALDEAN_ORDER.indexOf(id);
}

export function getPlanetAtOffset(startIndex: number, offset: number): Planet {
  const idx = (startIndex + offset) % 7;
  return PLANETS[PLANET_CHALDEAN_ORDER[idx]];
}

export function getHoraAt(date: Date, time: Date): HoraResult {
  return calculateHora({ date, currentTime: time });
}

export function findAuspiciousHoras(date: Date, preferredIds: PlanetId[]): HoraSlot[] {
  const result = calculateHora({ date });
  const auspicious: HoraSlot[] = [];
  for (const major of result.majorSlots) {
    for (const sub of major.subSlots) {
      if (preferredIds.includes(sub.planet.id)) {
        auspicious.push(sub);
      }
    }
  }
  return auspicious;
}

export function getHoraSummary(date: Date): HoraSlot[] {
  const result = calculateHora({ date });
  return result.majorSlots.flatMap((m) => m.subSlots);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function minutesToTimeStr(totalMinutes: number): string {
  const normalized = ((Math.floor(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function dateToMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Calculator Logic
// ─────────────────────────────────────────────────────────────────────────────

export function calculateHora(input: HoraInput): HoraResult {
  const { date, currentTime } = input;
  
  // โคลน Date เพื่อหลีกเลี่ยง side effects
  const adjustedDate = new Date(date.getTime());
  
  // ตรวจสอบว่าช่วงเวลาเป็น 00:00 - 05:59 หรือไม่ (นับวันตามโหราศาสตร์ไทย)
  // หากมี currentTime ให้ใช้ currentTime ในการเช็คชั่วโมง หากไม่มีให้ใช้ date
  const checkTime = currentTime || date;
  if (checkTime.getHours() < 6) {
    adjustedDate.setDate(adjustedDate.getDate() - 1);
  }

  const dayOfWeek = adjustedDate.getDay() as DayOfWeek;
  const dayRuler = DAY_RULERS_PLANETS[dayOfWeek];

  const daytimeStars = DAYTIME_YAM_STARS[dayOfWeek];
  const nighttimeStars = NIGHTTIME_YAM_STARS[dayOfWeek];

  const majorSlots: HoraMajorSlot[] = [];

  // 1. คำนวณฝั่งกลางวัน 8 ยาม (06:00 - 18:00)
  for (let i = 0; i < 8; i++) {
    const startMin = 360 + i * 90; // 06:00 คือ 360 นาที
    const endMin = startMin + 90;
    const starName = daytimeStars[i];
    const starNum = getStarNumber(starName);
    const predictions = PREDICTION_DATABASE[starNum];
    const rulerPlanet = getPlanetByNumber(starNum, starName, predictions);

    // สร้าง 3 ยามย่อย (ยามละ 30 นาที)
    const subSlots: HoraSlot[] = [
      { slot: 1, name: "ยามต้น", startMinute: startMin, endMinute: startMin + 30, startTime: minutesToTimeStr(startMin), endTime: minutesToTimeStr(startMin + 30), planet: rulerPlanet, period: "day" },
      { slot: 2, name: "ยามกลาง", startMinute: startMin + 30, endMinute: startMin + 60, startTime: minutesToTimeStr(startMin + 30), endTime: minutesToTimeStr(startMin + 60), planet: rulerPlanet, period: "day" },
      { slot: 3, name: "ยามปลาย", startMinute: startMin + 60, endMinute: endMin, startTime: minutesToTimeStr(startMin + 60), endTime: minutesToTimeStr(endMin), planet: rulerPlanet, period: "day" },
    ];

    // สร้าง 9 ยามซอย (ราหูค้นทรัพย์ - ฤกษ์ละ 10 นาที)
    const nineSegments: NineSegmentSlot[] = [];
    for (let j = 0; j < 9; j++) {
      const segStart = startMin + j * 10;
      const segEnd = segStart + 10;
      const segData = NINE_SEGMENTS_DATA[j];
      nineSegments.push({
        index: j + 1,
        name: segData.name,
        description: segData.description,
        startMinute: segStart,
        endMinute: segEnd,
        startTime: minutesToTimeStr(segStart),
        endTime: minutesToTimeStr(segEnd),
      });
    }

    majorSlots.push({
      majorSlot: i + 1,
      yamNumber: i + 1,
      name: `กลางวัน ยามที่ ${i + 1}`,
      period: "day",
      startTime: minutesToTimeStr(startMin),
      endTime: minutesToTimeStr(endMin),
      startMinute: startMin,
      endMinute: endMin,
      starName,
      starNumber: starNum,
      rulerPlanet,
      predictions,
      subSlots,
      nineSegments,
    });
  }

  // 2. คำนวณฝั่งกลางคืน 8 ยาม (18:00 - 06:00)
  for (let i = 0; i < 8; i++) {
    const startMin = 1080 + i * 90; // 18:00 คือ 1080 นาที
    const endMin = startMin + 90;
    const starName = nighttimeStars[i];
    const starNum = getStarNumber(starName);
    const predictions = PREDICTION_DATABASE[starNum];
    const rulerPlanet = getPlanetByNumber(starNum, starName, predictions);

    // สร้าง 3 ยามย่อย (ยามละ 30 นาที)
    const subSlots: HoraSlot[] = [
      { slot: 1, name: "ยามต้น", startMinute: startMin, endMinute: startMin + 30, startTime: minutesToTimeStr(startMin), endTime: minutesToTimeStr(startMin + 30), planet: rulerPlanet, period: "night" },
      { slot: 2, name: "ยามกลาง", startMinute: startMin + 30, endMinute: startMin + 60, startTime: minutesToTimeStr(startMin + 30), endTime: minutesToTimeStr(startMin + 60), planet: rulerPlanet, period: "night" },
      { slot: 3, name: "ยามปลาย", startMinute: startMin + 60, endMinute: endMin, startTime: minutesToTimeStr(startMin + 60), endTime: minutesToTimeStr(endMin), planet: rulerPlanet, period: "night" },
    ];

    // สร้าง 9 ยามซอย (ราหูค้นทรัพย์ - ฤกษ์ละ 10 นาที)
    const nineSegments: NineSegmentSlot[] = [];
    for (let j = 0; j < 9; j++) {
      const segStart = startMin + j * 10;
      const segEnd = segStart + 10;
      const segData = NINE_SEGMENTS_DATA[j];
      nineSegments.push({
        index: j + 1,
        name: segData.name,
        description: segData.description,
        startMinute: segStart,
        endMinute: segEnd,
        startTime: minutesToTimeStr(segStart),
        endTime: minutesToTimeStr(segEnd),
      });
    }

    majorSlots.push({
      majorSlot: i + 9,
      yamNumber: i + 1,
      name: `กลางคืน ยามที่ ${i + 1}`,
      period: "night",
      startTime: minutesToTimeStr(startMin),
      endTime: minutesToTimeStr(endMin),
      startMinute: startMin,
      endMinute: endMin,
      starName,
      starNumber: starNum,
      rulerPlanet,
      predictions,
      subSlots,
      nineSegments,
    });
  }

  const result: HoraResult = {
    date: adjustedDate,
    dayOfWeek,
    dayNameThai: DAY_NAMES_THAI[dayOfWeek],
    dayRuler,
    majorSlots,
  };

  if (currentTime) {
    result.currentHora = findCurrentHora(majorSlots, currentTime);
  }

  return result;
}

function findCurrentHora(
  majorSlots: HoraMajorSlot[],
  currentTime: Date
): CurrentHoraInfo | undefined {
  const currentMinute = dateToMinutes(currentTime);

  for (const major of majorSlots) {
    let start = major.startMinute % 1440;
    let end = major.endMinute % 1440;

    // ตรวจสอบการข้ามคืน (เช่น 23:30 - 01:00)
    let isInSlot = false;
    if (end > start) {
      isInSlot = currentMinute >= start && currentMinute < end;
    } else {
      isInSlot = currentMinute >= start || currentMinute < end;
    }

    if (isInSlot) {
      const elapsed = end > start
        ? currentMinute - start
        : currentMinute >= start
        ? currentMinute - start
        : currentMinute + (1440 - start);

      const duration = 90;
      const minutesRemaining = Math.max(0, duration - elapsed);
      const progressPercent = Math.min(100, (elapsed / duration) * 100);

      // ค้นหายามย่อย (ยามต้น, ยามกลาง, ยามปลาย)
      let activeSubYam = major.subSlots[0];
      if (elapsed >= 60) {
        activeSubYam = major.subSlots[2];
      } else if (elapsed >= 30) {
        activeSubYam = major.subSlots[1];
      }

      // ค้นหายามซอย 9 ฤกษ์ (ราหูค้นทรัพย์)
      // ใช้สูตร Math.floor(elapsed / 10) เพื่อให้ได้ index 0-8 สอดคล้องกับ Google Sheet เป๊ะๆ
      const segmentIndex = Math.min(8, Math.floor(elapsed / 10));
      const activeNineSegment = major.nineSegments[segmentIndex];

      // ดึงคำทำนายการเดินทางตามยามย่อยย่อย
      let travelPrediction = major.predictions.travelStart;
      if (activeSubYam.slot === 2) {
        travelPrediction = major.predictions.travelMiddle;
      } else if (activeSubYam.slot === 3) {
        travelPrediction = major.predictions.travelEnd;
      }

      return {
        majorSlot: major,
        yamNumber: major.yamNumber,
        period: major.period,
        starName: major.starName,
        starNumber: major.starNumber,
        rulerPlanet: major.rulerPlanet,
        minutesRemaining: Math.round(minutesRemaining * 10) / 10,
        progressPercent: Math.round(progressPercent * 10) / 10,
        elapsedMinutesInYam: elapsed,
        activeSubYam,
        activeNineSegment,
        predictions: {
          hearing: major.predictions.hearing,
          sick: major.predictions.sick,
          lost: major.predictions.lost,
          travel: travelPrediction,
          bestTime: major.predictions.bestTime,
          auspicious: major.predictions.auspicious,
          shouldDo: major.predictions.shouldDo,
          shouldNotDo: major.predictions.shouldNotDo,
          howTo: major.predictions.howTo,
        },
        subSlot: activeSubYam,
        majorIndex: major.majorSlot,
        subIndex: activeSubYam.slot,
      };
    }
  }

  return undefined;
}

export function getCurrentHora(now?: Date): HoraResult {
  const d = now ?? new Date();
  return calculateHora({ date: d, currentTime: d });
}
