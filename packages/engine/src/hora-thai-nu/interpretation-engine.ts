import { PlanetStatus, PlanetEntry, HoraTaynooResult, PLANET_INFO } from './hora-taynoo-engine';

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE BASE (Phase 12)
// ─────────────────────────────────────────────────────────────────────────────

export const BHAVA_KNOWLEDGE: Record<string, { score: number; type: 'good' | 'test'; meaning: string }> = {
  'ตนุ': { score: 85, type: 'good', meaning: 'ตัวตน, สิ่งแวดล้อมใกล้ตัว, สภาพปัจจุบัน' },
  'กฎุมภะ': { score: 90, type: 'good', meaning: 'การเงิน, ทรัพย์สิน, รายได้' },
  'สหัชชะ': { score: 75, type: 'good', meaning: 'เพื่อนฝูง, การติดต่อ, การเดินทางระยะสั้น' },
  'พันธุ': { score: 80, type: 'good', meaning: 'ครอบครัว, บ้าน, รถ, ความมั่นคง' },
  'ปุตตะ': { score: 75, type: 'good', meaning: 'บุตร, บริวาร, การเริ่มต้นใหม่, ความรักใหม่' },
  'อริ': { score: 20, type: 'test', meaning: 'ศัตรู, อุปสรรค, หนี้สิน, โรคภัย, การแข่งขัน' },
  'ปัตนิ': { score: 50, type: 'test', meaning: 'คู่ครอง, หุ้นส่วน, คู่สัญญา (มักมีเงื่อนไขผูกมัด)' },
  'มรณะ': { score: 10, type: 'test', meaning: 'ความตาย, การพลัดพราก, เจ็บป่วย, ต่างประเทศ' },
  'ศุภะ': { score: 90, type: 'good', meaning: 'ความสำเร็จ, ผู้ใหญ่สนับสนุน, ทางไกล, ชื่อเสียง' },
  'กัมมะ': { score: 90, type: 'good', meaning: 'หน้าที่การงาน, ภาระรับผิดชอบ, เกียรติยศ' },
  'ลาภะ': { score: 95, type: 'good', meaning: 'โชคลาภ, ความสำเร็จที่ได้มาง่าย, รายได้พิเศษ' },
  'วินาศ': { score: 15, type: 'test', meaning: 'ความเสียหาย, ปกปิด, ลับหลัง, คาดไม่ถึง' },
};

export const PLANET_KNOWLEDGE: Record<number, { score: number; meaning: string }> = {
  1: { score: 80, meaning: 'ชื่อเสียง, อำนาจ, ยศถาบรรดาศักดิ์, ร้อนแรง' },
  2: { score: 85, meaning: 'ความอ่อนโยน, การบริการ, เสน่ห์, เปลี่ยนแปลงง่าย' },
  3: { score: 40, meaning: 'ความขยัน, การต่อสู้, อุบัติเหตุ, อารมณ์ร้อน' }, // Malefic
  4: { score: 75, meaning: 'การเจรจา, การค้า, สติปัญญา, ไหวพริบ' },
  5: { score: 100, meaning: 'ปัญญา, คุณธรรม, ผู้ใหญ่เมตตา, โชคดี' },
  6: { score: 90, meaning: 'ความรัก, การเงิน, ศิลปะ, ความสุขสมหวัง' },
  7: { score: 30, meaning: 'ความเหนื่อยยาก, ภาระหนัก, ความอดทน, ชักช้า' }, // Malefic
  8: { score: 35, meaning: 'ความลุ่มหลง, การเสี่ยงโชค, พลิกผัน, เงา' }, // Malefic
};

export const STATUS_KNOWLEDGE: Record<Exclude<PlanetStatus, null> | 'neutral', { score: number; meaning: string }> = {
  'maha-uccj':  { score: 100, meaning: 'โดดเด่นที่สุด ส่งผลรุนแรงและรวดเร็วสุดยอด' },
  'kaset':      { score: 90,  meaning: 'มั่นคงถาวร หยั่งรากลึก ไม่เปลี่ยนแปลง' },
  'racha-chok': { score: 80,  meaning: 'ได้มาโดยง่าย มีคนอุปถัมภ์ เป็นที่นิยมชมชอบ' },
  'maha-chakr': { score: 75,  meaning: 'ผาดโผน พลิกแพลง เหนื่อยก่อนแล้วจะสำเร็จยิ่งใหญ่' },
  'pra':        { score: 40,  meaning: 'อ่อนกำลัง พึ่งพาคนอื่น ไม่เป็นตัวของตัวเอง' },
  'nij':        { score: 20,  meaning: 'ตกต่ำ เสื่อมถอย ไร้กำลังสนับสนุน' },
  'neutral':    { score: 50,  meaning: 'ส่งผลตามสภาพแวดล้อม (ตามภพที่สถิต)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERPRETATION ENGINE (Phase 10)
// ─────────────────────────────────────────────────────────────────────────────

export interface PlanetInterpretation {
  entry: PlanetEntry;
  bhavaName: string;
  bhavaScore: number;
  planetScore: number;
  statusScore: number;
  totalScore: number;
  summary: string;
}

export interface ChartInterpretation {
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  lagnaRuler: PlanetInterpretation;
  yamPlanet: PlanetInterpretation;
  goodPlanets: PlanetInterpretation[];
  badPlanets: PlanetInterpretation[];
  categories: {
    finance: string;
    work: string;
    love: string;
    health: string;
    law: string;
  };
}

/**
 * วิเคราะห์ดาว 1 ดวง (ภพ 40% + ดาว 30% + มาตรฐาน 30%)
 */
function interpretPlanet(entry: PlanetEntry, bhavaMap: Record<number, string>): PlanetInterpretation | null {
  if (entry.planetNum === null) return null;

  const bhavaName = bhavaMap[entry.zodiacIndex];
  const bhavaInfo = BHAVA_KNOWLEDGE[bhavaName];
  const pInfo = PLANET_KNOWLEDGE[entry.planetNum];
  const sInfo = STATUS_KNOWLEDGE[entry.status ?? 'neutral'];

  // ข้ามดาวที่ไม่มีข้อมูลใน Knowledge Base (เช่น 9, 0)
  if (!bhavaInfo || !pInfo) return null;

  // Weighted Score
  const totalScore = (bhavaInfo.score * 0.4) + (pInfo.score * 0.3) + (sInfo.score * 0.3);

  // กฎสำคัญ (Matrix) ตามตำรา อ.กานดา
  let summary = '';
  const isBadHouse = bhavaInfo.type === 'test'; // อริ, มรณะ, วินาศ
  const isStrongPlanet = pInfo.score >= 70 || (entry.status && ['maha-uccj', 'kaset', 'racha-chok'].includes(entry.status));
  const isWeakPlanet = pInfo.score < 50 || (entry.status && ['nij', 'pra'].includes(entry.status));

  if (!isBadHouse) {
    if (isStrongPlanet) summary = 'ดาวดีอยู่ภพดี = ดีมาก ส่งเสริมความสำเร็จและโอกาสอย่างมั่นคง';
    else if (isWeakPlanet) summary = 'ดาวอ่อนกำลังอยู่ภพดี = มีโอกาสดีเข้ามาแต่ต้องใช้ความพยายามสูงหรือมีคนช่วยจึงจะสำเร็จ';
    else summary = 'ดาวมีกำลังปานกลางในภพดี = มีความก้าวหน้าตามลำดับขั้นตอน';
  } else {
    // กฎ: ในภพที่เสีย หากดาวมีมาตรฐานเข้มแข็ง = ปัญหาเข้มแข็ง
    if (isStrongPlanet) summary = `ปัญหาในภพ${bhavaName}ค่อนข้างรุนแรงหรือแก้ไขยาก เนื่องจากดาวมีกำลังมาก (อุปสรรคเข้มแข็ง)`;
    else if (isWeakPlanet) summary = `ปัญหาในภพ${bhavaName}จะคลี่คลายได้ง่ายหรือเบาบางลง เนื่องจากดาวอ่อนกำลัง (อุปสรรคอ่อนแรง)`;
    else summary = `ระวังอุปสรรคในด้าน${bhavaName} ควรวางแผนรับมืออย่างรอบคอบ`;
  }


  if (entry.status) {
    summary += ` (เสริมด้วยกำลัง${sInfo.meaning})`;
  }

  return {
    entry,
    bhavaName,
    bhavaScore: bhavaInfo.score,
    planetScore: pInfo.score,
    statusScore: sInfo.score,
    totalScore: Math.round(totalScore),
    summary,
  };
}

function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * วิเคราะห์ผังดวงยามพรายกระซิบแบบครบวงจร
 */
export function interpretChart(chart: HoraTaynooResult): ChartInterpretation {
  const interpretations: PlanetInterpretation[] = [];
  
  chart.planetEntries.forEach(entry => {
    const p = interpretPlanet(entry, chart.bhavaMap);
    if (p) interpretations.push(p);
  });

  const goodPlanets = interpretations.filter(p => p.totalScore >= 65).sort((a, b) => b.totalScore - a.totalScore);
  const badPlanets = interpretations.filter(p => p.totalScore < 50).sort((a, b) => a.totalScore - b.totalScore);

  const lagnaRuler = interpretations.find(p => p.entry.planetNum === chart.lagnaRulerPlanet);
  const yamPlanet = interpretations.find(p => p.entry.planetNum === chart.yamPlanet);

  // ภาพรวม (ให้น้ำหนักดาวเจ้ายามและดาวตนุลัคน์เป็นหลัก)
  // หากหาดาวหลักไม่เจอ ให้ใช้คะแนนเฉลี่ยแทน
  const rulerScore = lagnaRuler?.totalScore ?? 50;
  const yamScore = yamPlanet?.totalScore ?? 50;
  const avgScore = interpretations.length > 0 
    ? (interpretations.reduce((acc, p) => acc + p.totalScore, 0) / interpretations.length)
    : 50;

  const overallScore = Math.round((rulerScore * 0.4) + (yamScore * 0.4) + (avgScore * 0.2));

  // Category Analysis based on Bhava intersections
  const getCategoryScore = (bhavas: string[]) => {
    const relevantPlanets = interpretations.filter(p => bhavas.includes(p.bhavaName));
    if (relevantPlanets.length === 0) return 50; // Neutral fallback
    return relevantPlanets.reduce((acc, p) => acc + p.totalScore, 0) / relevantPlanets.length;
  };

  const generateNarrative = (score: number, goodContext: string, badContext: string) => {
    if (score >= 75) return `ดีเยี่ยม: ${goodContext}`;
    if (score >= 50) return `ปานกลาง: มีแนวโน้มไปในทางบวก แต่ยังต้องอาศัยความพยายาม`;
    return `ควรระวัง: ${badContext}`;
  };

  return {
    overallScore,
    grade: getGrade(overallScore),
    lagnaRuler: lagnaRuler ?? ({} as any), // Fallback
    yamPlanet: yamPlanet ?? ({} as any),
    goodPlanets,
    badPlanets,
    categories: {
      finance: generateNarrative(
        getCategoryScore(['กฎุมภะ', 'ลาภะ', 'พันธุ']),
        'สภาพคล่องดี มีเกณฑ์ได้เงินก้อนหรือโชคลาภ',
        'ระวังรายจ่ายฉุกเฉิน หรือหนี้สินบานปลาย'
      ),
      work: generateNarrative(
        getCategoryScore(['กัมมะ', 'ศุภะ', 'สหัชชะ']),
        'การงานก้าวหน้า ผู้ใหญ่ให้การสนับสนุน การเจรจาเป็นผลดี',
        'ติดขัดเรื่องงาน มีปัญหาการประสานงานหรือเพื่อนร่วมงาน'
      ),
      love: generateNarrative(
        getCategoryScore(['ปัตนิ', 'ปุตตะ', 'ตนุ']),
        'ความรักสดใส คนโสดมีเกณฑ์พบคนถูกใจ คู่ครองเกื้อหนุน',
        'ระวังความขัดแย้งกับคนรัก หรือเรื่องวุ่นวายจากบริวาร'
      ),
      health: generateNarrative(
        getCategoryScore(['ตนุ', 'อริ', 'มรณะ']),
        'สุขภาพแข็งแรง ปลอดภัย แคล้วคลาดจากโรคภัย',
        'มีเกณฑ์เจ็บป่วย หรือเกิดอุบัติเหตุกะทันหัน ควรมีสติ'
      ),
      law: generateNarrative(
        getCategoryScore(['อริ', 'ศุภะ', 'ลาภะ']),
        'คดีความหรือข้อพิพาทจะคลี่คลายไปในทิศทางที่เป็นต่อ',
        'มีความเสี่ยงทางกฎหมาย หรือข้อสัญญาเสียเปรียบ'
      ),
    }
  };
}

/**
 * วิเคราะห์เจาะลึกเฉพาะจุดเวลา (7.5 นาที) สำหรับคำถามเฉพาะ
 */
export function analyzeSpecificSlot(chart: HoraTaynooResult, currentTimeMin: number) {
  const slot = chart.subTimeSlots.find(s => currentTimeMin >= s.startMin && currentTimeMin < s.endMin);
  if (!slot) return null;

  // หาดาวที่สถิตในราศีของ slot นี้
  const planetsInSlot = chart.planetEntries.filter(p => p.zodiacIndex === slot.zodiacIndex && p.planetNum !== null);
  
  const interpretations = planetsInSlot.map(p => interpretPlanet(p, chart.bhavaMap)).filter(Boolean) as PlanetInterpretation[];

  const bhavaInfo = BHAVA_KNOWLEDGE[slot.bhavaName];
  
  return {
    slot,
    bhavaInfo,
    interpretations,
    // กฎ: ถ้าเป็นภพเสีย (อริ, มรณะ, วินาศ) แล้วดาวเข้มแข็ง = ปัญหาเข้มแข็ง
    isBadBhava: ['อริ', 'มรณะ', 'วินาศ'].includes(slot.bhavaName),
  };
}
