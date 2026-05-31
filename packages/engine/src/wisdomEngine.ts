/**
 * wisdomEngine.ts
 * ระบบคำนวณปัญญาศาสตร์มาตรฐาน (เลข 7 ตัว 9 ฐาน, ทักษาคู่ธาตุ, มหาภูติ)
 * อ้างอิงจากคัมภีร์ในโฟลเดอร์ library
 */

export const DAY_PLANETS = [1, 2, 3, 4, 5, 6, 7];
export const YAM_SEQUENCE_DAY = [1, 6, 4, 2, 7, 5, 3]; // ลำดับเลขยามกลางวัน (มาตรฐาน)

/**
 * 1. ระบบเลข 7 ตัว 9 ฐาน (35 ภพเรือนสมบูรณ์)
 */
export function calculateSevenNumbersNineBases(day: number, month: number, year: number) {
  const fixMod7 = (n: number) => (n > 7 ? (n % 7 || 7) : n);
  
  const dBase = fixMod7(day);
  const mBase = fixMod7(month);
  const yBase = fixMod7(year);

  // ฐาน 1-3 (21 ภพเรือน)
  const row1 = Array.from({ length: 7 }, (_, i) => fixMod7(dBase + i));
  const row2 = Array.from({ length: 7 }, (_, i) => fixMod7(mBase + i));
  const row3 = Array.from({ length: 7 }, (_, i) => fixMod7(yBase + i));

  // ฐาน 4 (ฐานบวก/มหาจักร)
  const row4 = row1.map((v, i) => v + row2[i] + row3[i]);

  // ฐาน 5 (ฐานเศษ)
  const row5 = row4.map(v => v % 7 || 7);

  // ฐาน 6 (กำลังพระเคราะห์ - รอบที่ 1)
  const row6 = row5.map(v => (v * 2) % 7 || 7);

  // ฐาน 7 (กำลังพระเคราะห์ - รอบที่ 2)
  const row7 = row6.map(v => (v * 2) % 7 || 7);

  // ฐาน 8 (อาตมะ - เดินยามหน้าตามลำดับยามกลางวัน)
  const startIdx8 = YAM_SEQUENCE_DAY.indexOf(row5[0]);
  const row8 = Array.from({ length: 7 }, (_, i) => YAM_SEQUENCE_DAY[(startIdx8 + i) % 7]);

  // ฐาน 9 (ภริยัง - เดินยามทวนกลับ)
  const last5 = row5[6];
  const last8 = row8[6];
  const target9 = (last5 + last8) % 7 || 7;
  
  const startIdx9 = YAM_SEQUENCE_DAY.indexOf(target9);
  const row9 = Array.from({ length: 7 }, (_, i) => {
    let idx = (startIdx9 - (6 - i)) % 7;
    if (idx < 0) idx += 7;
    return YAM_SEQUENCE_DAY[idx];
  });

  return [row1, row2, row3, row4, row5, row6, row7, row8, row9];
}

/**
 * 2. ระบบทักษาคู่ธาตุ (Wisdom Standard)
 * ดาวนิ่ง (1-2-3-4-7-5-8-6) ตำแหน่งวิ่ง
 */
export function calculateWisdomTaksa(birthDayPlanet: number, age: number = 1) {
  // ลำดับทักษามาตรฐานตามเข็มนาฬิกา
  const TAKSA_SEQUENCE = [1, 2, 3, 4, 7, 5, 8, 6];
  const TITLES = ['บริวาร', 'อายุ', 'เดช', 'ศรี', 'มูละ', 'อุตสาหะ', 'มนตรี', 'กาลกิณี'];
  
  // ปรับแก้กรณีวันพุธกลางคืน (8) หรือค่าอื่นๆ ให้เข้า Index ได้
  const startIdx = TAKSA_SEQUENCE.indexOf(birthDayPlanet === 8 ? 8 : (birthDayPlanet % 8 || 8));
  if (startIdx === -1) return { natal: [], transit: [] };

  // คำนวณตำแหน่งกำเนิด
  const natal = TITLES.map((title, i) => ({
    title,
    planet: TAKSA_SEQUENCE[(startIdx + i) % 8]
  }));

  // คำนวณตำแหน่งจร (นับวนตามอายุย่าง)
  const transitIdx = (startIdx + (age - 1)) % 8;
  const transit = TITLES.map((title, i) => ({
    title,
    planet: TAKSA_SEQUENCE[(transitIdx + i) % 8]
  }));

  return { natal, transit };
}

/**
 * 3. ระบบมหาภูติ (ตามปี จ.ศ.)
 */
export function calculateMahabhuti(csYear: number) {
  const titles = ['โลกาวินาศ', 'อริ', 'ขุมทรัพย์', 'มรณะ', 'อธิบดี', 'ราชา', 'ธงชัย'];
  const startPlanet = csYear % 7 || 7; 
  
  const result: Record<string, number> = {};
  titles.forEach((title, i) => {
    let p = (startPlanet + i);
    while (p > 7) p -= 7;
    result[title] = p;
  });

  return result;
}
