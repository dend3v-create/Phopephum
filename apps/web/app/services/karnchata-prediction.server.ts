/**
 * karnchata-prediction.server.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Rule-based prediction engine สำหรับ "กาลชะตา"
 * อ้างอิงจาก: library/ashta-kala/ และ library/yam_databased/
 *
 * ดาว 1-7 × ยามย่อย (ต้น/กลาง/ปลาย) × หมวดคำถาม
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type YamPhase = "ต้น" | "กลาง" | "ปลาย";
export type PredCategory =
  | "news"     // ข่าวสาร / เรื่องที่ได้ยิน
  | "lost"     // ของหาย
  | "health"   // ผู้ป่วย / สุขภาพ
  | "travel"   // การเดินทาง
  | "work"     // การงาน / เจรจา
  | "wealth"   // การเงิน / โชคลาภ
  | "love"     // ความรัก / ความสัมพันธ์
  | "obstacle" // อุปสรรค / ปัญหา
  | "general"; // ทั่วไป / ถามทุกเรื่อง

export interface KarnchataReading {
  yamYaiNum: number;
  yamYaiName: string;
  yamPhase: YamPhase;
  taksaQuality: string;
  category: PredCategory;
  categoryLabel: string;
  verdict: string;       // ประโยคตัดสิน (1 บรรทัด)
  detail: string;        // รายละเอียด (2-4 บรรทัด)
  advice: string;        // สิ่งควรทำ
  warning: string;       // สิ่งห้ามทำ / ระวัง
  auspiciousTime: string; // เวลามงคลในยามนี้
  score: number;         // 0-100 (โชคดี)
  dangerScore: number;   // 0-100 (ความเสี่ยง)
  omens: string[];       // นิมิต / สัญญาณ
}

// ─────────────────────────────────────────────────────────────────────────────
// Yam Base Data (ashta-kala verified)
// ─────────────────────────────────────────────────────────────────────────────

interface YamData {
  dayName: string;
  nightName: string;
  news: string;
  lost: { verdict: string; location: string };
  health: string;
  travel: { early: string; mid: string; late: string; best: YamPhase };
  auspiciousPhase: YamPhase;
  auspiciousNote: string;
  score: number;
}

const YAM_DATABASE: Record<number, YamData> = {
  1: {
    dayName: "สุริยะ", nightName: "ระวิ",
    news: "เชื่อถือได้ เป็นเรื่องจริง ทำจริง แต่มักแฝงมากับเรื่องร้อนใจ",
    lost: { verdict: "จะได้คืน", location: "ของมักอยู่ในที่สูง ใกล้สิ่งสีแดงๆ มีแสงสว่าง หรือแสงแวววาว" },
    health: "อาการหนัก ถึงขั้นเป็นอันตราย ต้องรีบพบแพทย์โดยด่วน",
    travel: {
      early: "มีเคราะห์ร้าย เป็นอันตราย ควรเลื่อนออกไปก่อน",
      mid:   "ได้ลาภ เป็นมงคล เดินทางสำเร็จ",
      late:  "มีเคราะห์ร้าย เสื่อมเสียศักดิ์ศรี ควรระวัง",
      best:  "กลาง",
    },
    auspiciousPhase: "กลาง",
    auspiciousNote: "ยามกลางเท่านั้นที่ให้ผลดี — รีบดำเนินการในช่วงนี้",
    score: 68,
  },
  2: {
    dayName: "จันเทา", nightName: "คะศิ",
    news: "จริงครึ่งเท็จครึ่ง ผู้พูดใช้อารมณ์อ่อนไหว มีจริตมารยา พูดกลับไปกลับมา อย่าเพิ่งตัดสินใจตามข่าวนี้",
    lost: { verdict: "อาจได้คืนช้าหรือไม่ได้คืน", location: "ของมักตกอยู่ในน้ำ หรือที่ชื้นแฉะ" },
    health: "รักษานาน เป็นๆ หายๆ รักษาไม่หายขาด โอกาสฟื้นตัวและไม่ฟื้นตัวเท่ากัน",
    travel: {
      early: "ระวังอุบัติเหตุ ไม่ควรออกเดินทางไกล",
      mid:   "ได้ลาภ แต่ห้ามเดินทางทางเรือเด็ดขาด",
      late:  "ห้ามเดินทางไกล จะมีเคราะห์ร้าย เสียทรัพย์สิน",
      best:  "กลาง",
    },
    auspiciousPhase: "กลาง",
    auspiciousNote: "ยามกลาง — ระวังการเดินทางทางน้ำ แม้ยามนี้จะดี",
    score: 55,
  },
  3: {
    dayName: "ภุมมะ", nightName: "ภุมโม",
    news: "เป็นเรื่องเท็จทั้งนั้น เชื่อถือไม่ได้เลย ห้ามตัดสินใจอะไรสำคัญจากข่าวนี้",
    lost: { verdict: "ไม่ได้คืน", location: "ของอาจอยู่ใกล้เครื่องใช้ไฟฟ้า ศาสตราวุธ ของมีคม หรือเครื่องมือต่างๆ" },
    health: "จะหาย เป็นเร็ว หายเร็ว ไม่เป็นอันตรายถึงชีวิต",
    travel: {
      early: "เกิดอุบัติเหตุ มีเคราะห์ร้าย ห้ามออกเดินทาง",
      mid:   "เสี่ยงไฟไหม้หรือถูกโจรปล้นระหว่างทาง",
      late:  "ได้ลาภเป็นเงินทอง พบมิตรที่ดีระหว่างทาง",
      best:  "ปลาย",
    },
    auspiciousPhase: "ปลาย",
    auspiciousNote: "ยามปลายเท่านั้น — รอจนใกล้สิ้นยามจึงค่อยดำเนินการ",
    score: 52,
  },
  4: {
    dayName: "พุทธะ", nightName: "พุทโธ",
    news: "เป็นเรื่องจริง เชื่อถือได้ ข่าวที่ได้ยินมีมูลความจริง",
    lost: { verdict: "จะได้คืน", location: "ลองหาในกองเสื้อผ้า กองกระดาษ เครื่องมือสื่อสาร ในครัว หรือถามคนในบ้าน" },
    health: "มีเกณฑ์จะตายสูง แต่หากรักษาด้วยยาสมุนไพรหรือยาธรรมชาติมีโอกาสรอด",
    travel: {
      early: "มีเคราะห์ร้าย ติดขัดทุกทาง ไม่ควรออกเดินทาง",
      mid:   "ได้ลาภเงินทอง เจรจาความใดๆ สำเร็จด้วยดี",
      late:  "ได้ลาภมากมาย เจรจากับผู้ใหญ่ได้สมประสงค์",
      best:  "กลาง",
    },
    auspiciousPhase: "กลาง",
    auspiciousNote: "ยามกลางและยามปลายดีทั้งคู่ — เหมาะสำหรับการเจรจาสัญญา",
    score: 76,
  },
  5: {
    dayName: "ครู", nightName: "ชีโว",
    news: "จริงและเท็จเท่าเทียมกัน อย่าเพิ่งตัดสินใจตาม ต้องตรวจสอบเพิ่มเติม",
    lost: { verdict: "ได้คืนหรือไม่ได้เท่ากัน", location: "ลองหาใกล้ตู้ยา เครื่องมือแพทย์ ตำรา หนังสือ หรือสิ่งศักดิ์สิทธิ์" },
    health: "เป็นๆ หายๆ ต้องรับประทานยาเป็นประจำ หากป่วยหนักโอกาสรอดและไม่รอดเท่ากัน",
    travel: {
      early: "ได้ลาภมาก มิตรนำโชคมาให้ พบผู้ใหญ่ให้คุณดี",
      mid:   "เสียผลประโยชน์ ติดขัด เจรจาไม่สำเร็จ",
      late:  "เสียผลประโยชน์มาก เจอศัตรูหมู่มาร",
      best:  "ต้น",
    },
    auspiciousPhase: "ต้น",
    auspiciousNote: "ยามต้นเท่านั้น — ต้องรีบดำเนินการในช่วงแรกของยาม",
    score: 60,
  },
  6: {
    dayName: "ศุกระ", nightName: "ศุโกร",
    news: "เป็นเรื่องไม่จริง เชื่อถือไม่ได้ ข่าวนี้มีการบิดเบือนข้อมูล",
    lost: { verdict: "ไม่ได้คืน อาจถูกนำไปใช้หรือให้ผู้อื่นแล้ว", location: "ลองหาในกระเป๋าสตางค์ โต๊ะเครื่องแป้ง ห้องนอน หรือตู้เสื้อผ้า" },
    health: "ไม่ตาย ฟื้นได้เร็วหากมีกำลังใจที่ดี ขึ้นอยู่กับจิตใจเป็นหลัก",
    travel: {
      early: "ห้ามเดินทางไกล จะสูญเสียคนรัก พบศัตรูกลางทาง",
      mid:   "แม้ได้ลาภมาก ก็จะสูญเสียหรือถูกขโมยระหว่างทาง",
      late:  "ได้ลาภมากมาย พบมิตรต่างเพศคอยช่วยเหลือเป็นอย่างดี",
      best:  "ปลาย",
    },
    auspiciousPhase: "ปลาย",
    auspiciousNote: "ยามปลายให้ผลดีสูงสุด — ยามต้นและกลางอันตราย",
    score: 57,
  },
  7: {
    dayName: "เสารี", nightName: "โสโร",
    news: "เป็นเรื่องจริง เชื่อถือได้ แต่ข่าวมักหนักและน่ากังวล",
    lost: { verdict: "จะได้คืน", location: "ค้นหาตามที่มืดๆ ใกล้ของสีดำ ของสกปรก ท่อระบายน้ำ หรือเตาไฟในครัว" },
    health: "อาการหนัก มีเกณฑ์จะตาย หรือต้องรักษานานมากกว่าปกติ",
    travel: {
      early: "ห้ามเดินทางไกล จะพบศัตรูและเดือดร้อน",
      mid:   "เดินทางดีมาก ได้ลาภจำนวนมาก",
      late:  "เดินทางได้ลาภเป็นเงินทองและของกำนัล",
      best:  "กลาง",
    },
    auspiciousPhase: "กลาง",
    auspiciousNote: "ยามกลางและยามปลายให้ผลดี — ยามต้นอันตราย ห้ามเดิน",
    score: 58,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Taksa Quality Modifiers
// ─────────────────────────────────────────────────────────────────────────────

const TAKSA_MODIFIER: Record<string, { scoreBonus: number; prefix: string; suffix: string }> = {
  "เดช":     { scoreBonus: +20, prefix: "✦ ทักษาเดชเสริม —", suffix: "เหมาะแก่การตัดสินใจเด็ดขาดและปิดดีล" },
  "ศรี":     { scoreBonus: +20, prefix: "✦ ทักษาศรีหนุน —", suffix: "โชคลาภและทรัพย์สินเข้ามาหนุนนำ" },
  "มูละ":    { scoreBonus: +15, prefix: "✦ ทักษามูละรองรับ —", suffix: "เป็นช่วงวางรากฐานที่ดี" },
  "มนตรี":   { scoreBonus: +18, prefix: "✦ ทักษามนตรีช่วย —", suffix: "เส้นสายและพันธมิตรช่วยหนุนนำ" },
  "บริวาร":  { scoreBonus: +8,  prefix: "✦ ทักษาบริวาร —", suffix: "มีคนช่วยเหลือรอบข้าง" },
  "อายุ":    { scoreBonus: +5,  prefix: "✦ ทักษาอายุ —", suffix: "ดูแลสุขภาพและพักผ่อนให้เพียงพอ" },
  "อุตสาหะ": { scoreBonus: +5,  prefix: "✦ ทักษาอุตสาหะ —", suffix: "ต้องทุ่มเทและขยันเพื่อให้ได้ผล" },
  "กาลกิณี": { scoreBonus: -25, prefix: "⚠️ ทักษากาลกิณี —", suffix: "ควรระวังเป็นพิเศษ หลีกเลี่ยงการตัดสินใจสำคัญ" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Category Labels
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<PredCategory, string> = {
  news:     "ข่าวสาร / เรื่องที่ได้ยิน",
  lost:     "ของหาย / สิ่งสูญหาย",
  health:   "ผู้ป่วย / สุขภาพ",
  travel:   "การเดินทาง",
  work:     "การงาน / การเจรจา",
  wealth:   "การเงิน / โชคลาภ",
  love:     "ความรัก / ความสัมพันธ์",
  obstacle: "อุปสรรค / ปัญหา",
  general:  "ทั่วไป / สอบถามชะตา",
};

// ─────────────────────────────────────────────────────────────────────────────
// Omens (นิมิต) by yam number
// ─────────────────────────────────────────────────────────────────────────────

const YAM_OMENS: Record<number, string[]> = {
  1: ["ข่าวสารที่มาถึงในยามนี้มีน้ำหนัก", "อำนาจบารมีส่งผลชัดเจน", "ผู้ใหญ่หรือผู้มีอำนาจมีบทบาทสำคัญ"],
  2: ["อารมณ์ความรู้สึกผันผวน", "ข้อมูลยังไม่ชัดเจน ต้องรอ", "ความสัมพันธ์และครอบครัวเข้ามาเกี่ยว"],
  3: ["ระวังความวุ่นวายและข้อพิพาท", "ไฟและโจรคือสัญลักษณ์เตือน", "ความกล้าหาญจะให้ผลดีในยามสุดท้าย"],
  4: ["การสื่อสารและเอกสารมีความสำคัญ", "สติปัญญาชนะทุกอุปสรรค", "คนใกล้ชิดรู้คำตอบที่ตามหา"],
  5: ["โอกาสมาเร็วและหายไปเร็ว", "ผู้ใหญ่และพระเป็นมิตรแท้", "รีบคว้าโอกาสในยามต้น"],
  6: ["ความงาม เสน่ห์ และศิลปะโดดเด่น", "ระวังการหลอกลวงจากคนที่รัก", "ยามปลายคือแสงสว่างในความมืด"],
  7: ["ความอดทนคือกุญแจสำคัญ", "ของมืดและสีดำเป็นสัญลักษณ์", "ความมั่นคงระยะยาวมีรางวัล"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Generator
// ─────────────────────────────────────────────────────────────────────────────

function detectCategory(question: string): PredCategory {
  const q = question.toLowerCase();
  if (q.match(/ของหาย|สูญหาย|ของ.*ไม่เจอ|หายไป/)) return "lost";
  if (q.match(/เจ็บ|ป่วย|รักษา|หมอ|โรค|สุขภาพ/)) return "health";
  if (q.match(/เดินทาง|เดิน|ไป|ออกไป|ทาง|ทิศ/)) return "travel";
  if (q.match(/ข่าว|ได้ยิน|บอก|พูด|เล่า|จริงไหม/)) return "news";
  if (q.match(/งาน|เจรจา|สัญญา|ธุรกิจ|โปรเจกต์|ประชุม|สมัคร/)) return "work";
  if (q.match(/เงิน|ลงทุน|หุ้น|ทรัพย์|โชค|รวย|กำไร|ขาดทุน/)) return "wealth";
  if (q.match(/รัก|แฟน|คนรัก|ความรัก|สัมพันธ์|แต่งงาน|อกหัก/)) return "love";
  if (q.match(/ปัญหา|อุปสรรค|ขัดข้อง|ติดขัด|แก้|แก้เคล็ด/)) return "obstacle";
  return "general";
}

function buildPrediction(
  yamNum: number,
  yamPhase: YamPhase,
  taksaQuality: string,
  category: PredCategory,
  isDaytime: boolean,
): KarnchataReading {
  const yam = YAM_DATABASE[yamNum] ?? YAM_DATABASE[1];
  const modifier = TAKSA_MODIFIER[taksaQuality];
  const yamName = isDaytime ? yam.dayName : yam.nightName;
  const omens = YAM_OMENS[yamNum] ?? [];

  // Base score
  let score = yam.score;
  let dangerScore = 100 - score;

  // Apply taksa modifier
  if (modifier) {
    score = Math.min(100, Math.max(0, score + modifier.scoreBonus));
    dangerScore = 100 - score;
  }

  // Phase bonus
  if (yamPhase === yam.auspiciousPhase) {
    score = Math.min(100, score + 12);
    dangerScore = Math.max(0, dangerScore - 12);
  } else {
    score = Math.max(0, score - 8);
    dangerScore = Math.min(100, dangerScore + 8);
  }

  // กาลกิณี override
  if (taksaQuality === "กาลกิณี") {
    score = Math.min(score, 30);
    dangerScore = Math.max(dangerScore, 70);
  }

  // Build category-specific reading
  let verdict = "";
  let detail = "";
  let advice = "";
  let warning = "";

  const taksaPrefix = modifier ? `${modifier.prefix} ` : "";
  const taksaSuffix = modifier ? ` ${modifier.suffix}` : "";

  const phaseAdvice = {
    ต้น:  yam.travel.early,
    กลาง: yam.travel.mid,
    ปลาย: yam.travel.late,
  }[yamPhase];

  switch (category) {
    case "news":
      verdict = `${taksaPrefix}ข่าวสารที่ได้ยิน — ${yam.news.split(" ")[0]}`;
      detail = `ในยาม${yamName}นี้ ข่าวสารที่ท่านได้รับ${yam.news} ขณะนี้อยู่ใน${yamPhase}ของยาม ซึ่ง${phaseAdvice}`;
      advice = taksaQuality === "กาลกิณี"
        ? "ระวังมากที่สุด — อย่าเพิ่งตัดสินใจใดๆ ตามข่าวที่ได้ยิน รอให้ผ่านยามนี้ก่อน"
        : `ตรวจสอบข้อมูลเพิ่มเติมก่อนตัดสินใจ${taksaSuffix}`;
      warning = yamNum === 3 || yamNum === 6 ? "⚠️ ข่าวในยามนี้มีแนวโน้มบิดเบือน ห้ามนำมาตัดสินใจสำคัญ" : "";
      break;

    case "lost":
      verdict = `${taksaPrefix}${yam.lost.verdict}`;
      detail = `ในยาม${yamName} ของที่หาย${yam.lost.verdict} — ${yam.lost.location}`;
      advice = yam.lost.verdict.includes("ได้คืน")
        ? `ค้นหาในทิศทางที่บอก: ${yam.lost.location} — ขณะนี้อยู่ใน${yamPhase}ของยาม`
        : "หากยังไม่พบ ให้รอยาม 4 (พุทธะ/พุทโธ) แล้วลองค้นหาใหม่";
      warning = yam.lost.verdict.includes("ไม่ได้") ? "⚠️ โอกาสได้คืนต่ำมาก ควรดำเนินการทางกฎหมายหรือแจ้งความ" : "";
      break;

    case "health":
      verdict = `${taksaPrefix}${yam.health.split(" ").slice(0, 4).join(" ")}`;
      detail = `ในยาม${yamName} ผู้ป่วย${yam.health} ปัจจุบันอยู่ในยาม${yamPhase} ซึ่ง${phaseAdvice}${taksaSuffix}`;
      advice = yam.health.includes("ตาย") || yam.health.includes("อันตราย")
        ? "ควรรีบนำส่งโรงพยาบาลหรือพบแพทย์เฉพาะทางโดยด่วน อย่าชะล่าใจ"
        : "ดูแลอย่างใกล้ชิด ให้กำลังใจ และติดตามอาการอย่างสม่ำเสมอ";
      warning = taksaQuality === "กาลกิณี" ? "⚠️ กาลกิณีซ้ำเติม — สถานการณ์น่าเป็นห่วงกว่าปกติ รีบดำเนินการ" : "";
      break;

    case "travel":
      verdict = `ยาม${yamPhase}: ${phaseAdvice.split(" ").slice(0, 5).join(" ")}`;
      detail = `ในยาม${yamName}${yamPhase ? `ช่วง${yamPhase}` : ""} — ${phaseAdvice} เวลามงคลที่ดีที่สุดคือ "${yam.auspiciousPhase}" ของยามนี้`;
      advice = yamPhase === yam.auspiciousPhase
        ? `✨ ตอนนี้คือ${yamPhase} — เป็นช่วงที่ดีที่สุดของยามนี้! ${yam.auspiciousNote}`
        : `รอจนถึงยาม${yam.auspiciousPhase}จึงค่อยออกเดินทาง จะปลอดภัยและได้ลาภ`;
      warning = phaseAdvice.match(/ห้าม|อันตราย|เคราะห์ร้าย|โจร|ไฟ/) ? `⚠️ ${phaseAdvice}` : "";
      break;

    case "work":
      verdict = `${taksaPrefix}ยามแห่ง${yamName} — ${yamPhase === yam.auspiciousPhase ? "เหมาะกับการเจรจา" : "ควรรอจังหวะดีกว่านี้"}`;
      detail = `ในยาม${yamName} ข้อมูลและการเจรจา${yam.news} ช่วง${yamPhase}ของยาม ${phaseAdvice}${taksaSuffix}`;
      advice = yamPhase === yam.auspiciousPhase
        ? `✨ จังหวะนี้ดีมาก — ดำเนินการเจรจาหรือตัดสินใจธุรกิจได้เลย ${taksaSuffix}`
        : `รอจนถึงยาม${yam.auspiciousPhase}ของยามนี้จะดีกว่า`;
      warning = taksaQuality === "กาลกิณี" ? "⚠️ กาลกิณีปิดกั้น — ห้ามเซ็นสัญญาหรือตกลงสำคัญในยามนี้" : "";
      break;

    case "wealth":
      verdict = `${taksaPrefix}${yamPhase === yam.auspiciousPhase ? "โชคเข้าหาในยามนี้" : "ระวังการสูญเสียทรัพย์"}`;
      detail = `ยาม${yamName}${yamPhase} — ${phaseAdvice} ทักษา${taksaQuality}ส่งผลต่อการเงิน${taksaSuffix}`;
      advice = (yamPhase === yam.auspiciousPhase && taksaQuality !== "กาลกิณี")
        ? "จังหวะนี้เหมาะแก่การลงทุนหรือทำธุรกรรม รีบดำเนินการ"
        : "รอจังหวะที่ดีกว่า อย่าเสี่ยงในช่วงนี้";
      warning = taksaQuality === "กาลกิณี" ? "⚠️ ห้ามลงทุนหรือกู้เงินในยามนี้ มีโอกาสสูญเสียสูง" : "";
      break;

    case "love":
      verdict = `${taksaPrefix}ยาม${yamName} — ${yamNum === 2 ? "ความรู้สึกผันผวน" : yamNum === 6 ? "เสน่ห์สูง มีโอกาสสำเร็จ" : "ขึ้นกับจังหวะ"}`;
      detail = `ในยาม${yamName}${yamPhase ? `ช่วง${yamPhase}` : ""} ${phaseAdvice} สำหรับเรื่องความรัก ${taksaSuffix}`;
      advice = yamNum === 6
        ? "ยามศุกระ/ศุโกรเอื้อต่อความรักและเสน่ห์ — เหมาะสำหรับการสารภาพรักในยามปลาย"
        : `รอยาม${yam.auspiciousPhase}จะดีกว่า — ขณะนี้ ${phaseAdvice}`;
      warning = (yamPhase !== yam.auspiciousPhase && (yamNum === 6 || yamNum === 2))
        ? "⚠️ ระวังการตัดสินใจเรื่องความรักในช่วงนี้ อาจเกิดความเข้าใจผิด" : "";
      break;

    case "obstacle":
      verdict = `${taksaPrefix}${yamPhase === yam.auspiciousPhase ? "มีทางออก — รีบดำเนินการ" : "ปัญหายังไม่คลี่คลาย ต้องรอ"}`;
      detail = `ยาม${yamName}ช่วง${yamPhase} — ${phaseAdvice} สำหรับอุปสรรคที่เผชิญอยู่ ${taksaSuffix}`;
      advice = yamPhase === yam.auspiciousPhase
        ? `ช่วง${yamPhase}นี้คือจังหวะที่ดี — ลงมือแก้ปัญหาได้เลย`
        : `รอให้ถึงยาม${yam.auspiciousPhase}ก่อน อย่าฝืนในช่วงนี้ จะยิ่งซับซ้อน`;
      warning = taksaQuality === "กาลกิณี" ? "⚠️ ยามกาลกิณี — ห้ามฝืนแก้ปัญหาตอนนี้ รอให้ผ่านยามไปก่อน" : "";
      break;

    default: // general
      verdict = `ยาม${yamName}ช่วง${yamPhase} — ${yamPhase === yam.auspiciousPhase ? "เป็นมงคล" : "ควรระวัง"}`;
      detail = `ขณะนี้ตกอยู่ในยาม${yamName} ช่วง${yamPhase} ${yam.auspiciousNote} ${taksaSuffix}`;
      advice = `เวลามงคลที่สุดในยามนี้คือ "${yam.auspiciousPhase}" — ${yam.auspiciousNote}`;
      warning = taksaQuality === "กาลกิณี" ? "⚠️ ทักษากาลกิณีกำลังทำงาน — ระวังทุกการตัดสินใจ" : "";
  }

  return {
    yamYaiNum: yamNum,
    yamYaiName: yamName,
    yamPhase,
    taksaQuality,
    category,
    categoryLabel: CATEGORY_LABELS[category],
    verdict,
    detail,
    advice,
    warning,
    auspiciousTime: `ยาม${yam.auspiciousPhase} — ${yam.auspiciousNote}`,
    score,
    dangerScore,
    omens,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * สร้างคำพยากรณ์กาลชะตาจากข้อมูลยามและทักษา
 */
export function generateKarnchataReading(params: {
  yamYaiNum: number;
  yamPhase: YamPhase;
  taksaQuality: string;
  isDaytime: boolean;
  category?: PredCategory;
  question?: string;
}): KarnchataReading {
  const category = params.category
    ?? (params.question ? detectCategory(params.question) : "general");

  return buildPrediction(
    Math.max(1, Math.min(7, params.yamYaiNum)),
    params.yamPhase,
    params.taksaQuality || "อุตสาหะ",
    category,
    params.isDaytime,
  );
}

export { CATEGORY_LABELS, YAM_DATABASE, detectCategory };
export type { YamData };
