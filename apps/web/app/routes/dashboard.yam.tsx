import { json } from "@remix-run/cloudflare";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { useEffect, useState } from "react";
import { requirePaidPlan } from "~/services/auth.server";
import { 
  getCurrentYam, 
  calculateMoonPhase, 
  getSunTimes, 
  getYamPrediction,
  yamDayTable,
  yamDayTicksTable,
  yamNightTable,
  yamNightTicksTable
} from "@phopephum/engine";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "ฤกษ์ดีมีชัย — PhopePhum" },
];

const PLANET_SYMBOLS: Record<string, string> = {
  สุริยะ: "☉", ระวิ:  "☉",
  จันเทา: "☽", คะศิ:  "☽",
  ภุมมะ:  "♂", ภุมโม: "♂",
  พุทธะ:  "☿", พุทโธ: "☿",
  ครู:    "♃", ชีโว:  "♃",
  ศุกระ:  "♀", ศุโกร: "♀",
  เสารี:  "♄", โสโร:  "♄",
};

const PHASE_LABEL: Record<string, string> = {
  start:  "ยามต้น",
  middle: "ยามกลาง",
  end:    "ยามปลาย",
};

const PERIOD_LABEL: Record<string, string> = {
  day:   "กลางวัน",
  night: "กลางคืน",
};

const DAY_NAMES_EN = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const DAY_NAMES_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];

interface YamSlotDetail {
  yamNumber: number;
  yamName: string;
  period: "day" | "night";
  timeLabel: string;
  startTimeISO: string;
  endTimeISO: string;
  ticks: number;
  level: "bad" | "good" | "very_good" | "excellent";
  label: string;
  description: string;
  prediction: any;
}

/**
 * คำนวณยามอัฏฐกาล 16 ยามย่อยต่อวัน ตามหลักดาราศาสตร์ไทย
 */
function calculateDailyYamSlots(targetDate: Date): YamSlotDetail[] {
  const sunTimes = getSunTimes(targetDate);
  const sunrise = sunTimes.sunrise;
  const sunset = sunTimes.sunset;

  const dayMs = sunset.getTime() - sunrise.getTime();
  const nightMs = 86400000 - dayMs;

  const daySlotMs = dayMs / 8;
  const nightSlotMs = nightMs / 8;

  const slots: YamSlotDetail[] = [];

  // 8 ยามกลางวัน
  for (let i = 0; i < 8; i++) {
    const startTime = new Date(sunrise.getTime() + i * daySlotMs);
    const endTime = new Date(sunrise.getTime() + (i + 1) * daySlotMs);
    const midTime = new Date(startTime.getTime() + daySlotMs / 2);
    const result = getYamPrediction(midTime);

    slots.push({
      yamNumber: i + 1,
      yamName: result.yamName,
      period: "day",
      timeLabel: `${startTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`,
      startTimeISO: startTime.toISOString(),
      endTimeISO: endTime.toISOString(),
      ticks: result.travelAuspiciousness.ticks,
      level: result.travelAuspiciousness.level,
      label: result.travelAuspiciousness.label,
      description: result.travelAuspiciousness.description,
      prediction: result.prediction ?? null,
    });
  }

  // 8 ยามกลางคืน
  for (let i = 0; i < 8; i++) {
    const startTime = new Date(sunset.getTime() + i * nightSlotMs);
    const endTime = new Date(sunset.getTime() + (i + 1) * nightSlotMs);
    const midTime = new Date(startTime.getTime() + nightSlotMs / 2);
    const result = getYamPrediction(midTime);

    slots.push({
      yamNumber: i + 1,
      yamName: result.yamName,
      period: "night",
      timeLabel: `${startTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`,
      startTimeISO: startTime.toISOString(),
      endTimeISO: endTime.toISOString(),
      ticks: result.travelAuspiciousness.ticks,
      level: result.travelAuspiciousness.level,
      label: result.travelAuspiciousness.label,
      description: result.travelAuspiciousness.description,
      prediction: result.prediction ?? null,
    });
  }

  return slots;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requirePaidPlan(request, env);

  const yam = getCurrentYam();
  const moon = calculateMoonPhase();

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const todaySlots = calculateDailyYamSlots(today);
  const tomorrowSlots = calculateDailyYamSlots(tomorrow);

  const todayDateLabel = today.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const tomorrowDateLabel = tomorrow.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return json({
    yamName:    yam.yamName,
    yamNumber:  yam.yamNumber,
    period:     yam.period,
    phase:      yam.phase,
    prediction: yam.prediction ?? null,
    travelAuspiciousness: yam.travelAuspiciousness,
    sunriseISO: yam.sunTimes.sunrise.toISOString(),
    sunsetISO:  yam.sunTimes.sunset.toISOString(),
    todaySlots,
    tomorrowSlots,
    todayDateLabel,
    tomorrowDateLabel,
    moon: {
      moonPhase:    moon.moonPhase,
      lunarDay:     moon.lunarDay,
      illumination: moon.illumination,
      isWanPhra:    moon.isWanPhra,
      guidance:     moon.guidance,
    },
    loadedAt: new Date().toISOString(),
  });
}

// ─── Topic Wise Auspicious Scoring & Advice ──────────────────────────────────
interface TopicAdvice {
  score: number;
  ratingText: string;
  description: string;
  shouldDo: string[];
  shouldAvoid: string[];
  speechTemplate: string;
}

function getTopicAdvice(topic: "love" | "trade" | "negotiate" | "travel", yamName: string, phase: string, ticks: number): TopicAdvice {
  // สำหรับการเดินทาง คะแนนและข้อความจะสลับตาม Ticks ของสล็อตเวลานั้นๆ
  if (topic === "travel") {
    let score = 6.8;
    let ratingText = "ค่อนข้างเหมาะสม";
    let desc = "ยามมงคลระดับดี สามารถเริ่มต้นเดินทางสัญจรได้ทั่วไป";
    let shouldDo = ["เริ่มต้นสัญจรอย่างมีสติ", "จัดสัมภาระและตรวจยานพาหนะให้เรียบร้อย"];
    let shouldAvoid = ["ความใจร้อนเร่งรีบขณะขับขี่", "การเริ่มต้นเดินทางในจุดอับโชค"];
    
    if (ticks === 3) {
      score = 9.8;
      ratingText = "ดีเยี่ยมที่สุด";
      desc = "ฤกษ์มหามงคลในการเดินทางสัญจร ท่องเที่ยว หรือติดต่อการงานแดนไกล ประสบผลสำเร็จอย่างงดงาม ปลอดภัยและมีโชคลาภพูนทวี";
      shouldDo = ["เริ่มต้นทริปสำคัญ", "ออกยานพาหนะใหม่", "สัญจรติดต่อการค้าทางไกล"];
      shouldAvoid = ["การโลเลลังเลในการออกเดินทาง", "การใช้อารมณ์ขัดแย้งขณะออกสตาร์ท"];
    } else if (ticks === 2) {
      score = 8.8;
      ratingText = "ดีเยี่ยมมาก";
      desc = "ฤกษ์สัญจรเป็นมงคลยิ่ง เหมาะสมสำหรับทริปครอบครัวหรือการสัญจรติดต่อธุรกิจทั่วไป ไร้อุปสรรคขัดขวาง";
      shouldDo = ["เจรจาตกลงข้อแลกเปลี่ยนระหว่างทาง", "ออกเดินทางข้ามจังหวัด", "สัญจรพบปะกัลยาณมิตร"];
      shouldAvoid = ["ความเกียจคร้านล่าช้าในการเริ่มต้น", "การสัญจรในเส้นทางที่มีความเสี่ยงสูง"];
    } else if (ticks === 0) {
      score = 3.5;
      ratingText = "ติดขัดควรระวัง";
      desc = "ยามติดขัดตามตำราฤกษ์สัญจร มีเกณฑ์ล่าช้า ประสบอุปสรรคขัดขวาง หรือมีอุบัติเหตุเกิดขึ้นได้ง่ายเป็นพิเศษ";
      shouldDo = ["เลื่อนเวลาเดินทางออกไปหากทำได้", "ตรวจเช็คสภาพความปลอดภัยของรถยนต์อย่างละเอียด", "ตั้งสติและสวดมนต์แผ่เมตตาก่อนสัญจร"];
      shouldAvoid = ["การขับขี่รถด้วยความเร็วสูงหรือประมาท", "การเริ่มต้นออกทริปไกลครั้งสำคัญในยามนี้"];
    }

    return {
      score,
      ratingText,
      description: desc,
      shouldDo,
      shouldAvoid,
      speechTemplate: "ขอให้การเดินทางครั้งนี้เป็นทริปมหาเฮง ปลอดภัยตลอดเส้นทาง และประสบผลสำเร็จสมเจตนารมณ์ทุกประการค่ะ",
    };
  }

  // สำหรับเรื่องอื่นๆ (ง้อแฟน, ค้าขาย, เจรจา) จะแมปตามเจ้าครองดาว (๑-๗)
  // แมปชื่อยาม (รวมคำสะกดอื่นๆ)
  let planet = 4; // default พุธ
  if (["สุริยะ", "ระวิ"].includes(yamName)) planet = 1;
  else if (["จันเทา", "จันทรา", "คะศิ", "ศะศิ"].includes(yamName)) planet = 2;
  else if (["ภุมมะ", "ภูมมะ", "ภุมโม"].includes(yamName)) planet = 3;
  else if (["พุทธะ", "พุธ", "พุทโธ", "พุโธ"].includes(yamName)) planet = 4;
  else if (["ครู", "ชีโว", "พฤหัส"].includes(yamName)) planet = 5;
  else if (["ศุกระ", "ศุโกร", "ศุกโร"].includes(yamName)) planet = 6;
  else if (["เสารี", "เสาร์", "โสโร"].includes(yamName)) planet = 7;

  const mapping: Record<number, Record<"love" | "trade" | "negotiate", TopicAdvice>> = {
    1: { // สุริยะ / ระวิ (๑)
      love: {
        score: 6.8, ratingText: "ค่อนข้างเหมาะสม",
        description: "ยามพลังสุริยเทพเน้นความจริงจังและตรงไปตรงมา การปรับความเข้าใจจะดีหากเปิดเผยความจริง แต่ต้องระวังอารมณ์ถือทิฐิตัวเอง",
        shouldDo: ["พูดคุยอธิบายด้วยความสัตย์จริง", "ให้เกียรติและรับรองความสำคัญของอีกฝ่าย"],
        shouldAvoid: ["การแสดงอำนาจควบคุมหรือข่มอีกฝ่าย", "การประชดประชันทำลายศักดิ์ศรี"],
        speechTemplate: "เราขอโทษจากใจจริงนะ... สิ่งที่ผิดพลาดไปเราสัญญาว่าจะปรับปรุงตัวอย่างดีที่สุด และอยากให้เราจับมือแก้มันไปด้วยกัน",
      },
      trade: {
        score: 8.8, ratingText: "เหมาะสมมาก",
        description: "ยามดีในการดีลลูกค้ารายใหญ่ ขายสินค้าเกรดหรูหราพรีเมียม หรือเจรจาค้าขายของมีมูลค่าสูงเด่น",
        shouldDo: ["นำเสนอตัวอย่างสินค้าที่ดูดีมีระดับ", "แสดงความเชี่ยวชาญและความเป็นมืออาชีพเด่นชัด"],
        shouldAvoid: ["การลดราคามากเกินไปจนเสียมูลค่าแบรนด์", "การลังเลใจในการเสนอข้อตกลง"],
        speechTemplate: "นี่คือแพ็กเกจที่ดีที่สุดและคุ้มค่าที่สุดที่เราคัดสรรมาให้แบรนด์ของคุณโดยเฉพาะครับ มั่นใจได้ในมาตรฐานสูงสุด",
      },
      negotiate: {
        score: 9.2, ratingText: "ดีเยี่ยมที่สุด",
        description: "ยามมหามงคลในการนำเสนอแผนงานใหญ่ เข้าพบผู้ใหญ่ผู้มีอิทธิพล หรือประกวดแข่งขันเพื่อรับชัยชนะเด่น",
        shouldDo: ["แถลงแผนงานด้วยความเด็ดขาดมั่นใจ", "นำเสนอผลงานด้วยสถิติและวิสัยทัศน์ที่กว้างไกล"],
        shouldAvoid: ["การโต้เถียงแบบใช้อารมณ์โกรธ", "การขาดเตรียมความพร้อมของเอกสารสำคัญ"],
        speechTemplate: "โครงการนี้ได้รับการศึกษาและวางกรอบการดำเนินงานมาอย่างรัดกุม เพื่อประโยชน์สูงสุดในระยะยาวขององค์กรเราครับ",
      }
    },
    2: { // จันเทา / จันทรา / ศะศิ (๒)
      love: {
        score: 9.5, ratingText: "เหมาะสมที่สุด (แนะนำ ✨)",
        description: "ยามเมตตามหาเสน่ห์อย่างสูง บรรยากาศนุ่มนวลอบอุ่น เหมาะแก่การปรับความเข้าใจ ง้อแฟน หรือเริ่มต้นเปิดใจพูดคุยสิ่งลึกซึ้ง",
        shouldDo: ["เริ่มต้นพูดคุยด้วยน้ำเสียงอ่อนโยน", "แสดงความอ่อนหวาน ใส่ใจในความรู้สึกเป็นพิเศษ", "มีของขวัญชิ้นเล็กหรือของโปรดมามอบให้"],
        shouldAvoid: ["การหยิบยกเรื่องอดีตหรือข้อผิดพลาดเก่าขึ้นมาทวงถาม", "การมีท่าทีเฉยเมยหรือเย็นชา"],
        speechTemplate: "เราคิดถึงความรู้สึกของเธอตลอดเลยนะ... เราไม่อยากให้เราต้องเงียบใส่กันแบบนี้ มาเริ่มปรับความเข้าใจกันใหม่นะคนดี 💜",
      },
      trade: {
        score: 8.5, ratingText: "เหมาะสมมาก",
        description: "ยามดีสำหรับการค้าขายบริการ ต้อนรับลูกค้า หรือการเปิดการขายที่เน้นความประทับใจและความสัมพันธ์ที่ดีงาม",
        shouldDo: ["บริการลูกค้าด้วยความเอาใจใส่และยิ้มแย้ม", "ชักชวนสนทนาสร้างความเป็นมิตรเป็นกันเอง"],
        shouldAvoid: ["การเร่งรัดปิดการขายจนดูบีบบังคับลูกค้า", "การเสนอขายแบบไม่มีมนุษยสัมพันธ์"],
        speechTemplate: "สินค้าตัวนี้เราดูแลคัดสรรให้ลูกค้าด้วยใจเลยค่ะ สบายใจได้เลยนะคะ มีรับประกันและดูแลหลังการขายเต็มที่เลยค่ะ",
      },
      negotiate: {
        score: 8.0, ratingText: "เหมาะสม",
        description: "ยามดีสำหรับการประสานงาน ประนีประนอมความขัดแย้ง หรือขอความช่วยเหลือจากพันธมิตร",
        shouldDo: ["แสดงความเข้าใจในมุมมองของอีกฝ่าย", "เสนอเงื่อนไขที่เน้นการประนีประนอมยอมความ"],
        shouldAvoid: ["การใช้ท่าทีเด็ดขาดแข็งกระ้าวเกินไป", "การเซ็นสัญญาร่วมทุนขนาดใหญ่ที่มีความเสี่ยงสูง"],
        speechTemplate: "เราพร้อมรับฟังความเห็นและปรับเปลี่ยนเงื่อนไขบางจุด เพื่อให้ได้ทางออกที่สบายใจและลงตัวที่สุดสำหรับทั้งสองฝ่ายค่ะ",
      }
    },
    3: { // ภุมมะ / ภูมมะ / ภุมโม (๓)
      love: {
        score: 4.2, ratingText: "ติดขัดควรเลี่ยง",
        description: "ยามทหารกล้าหรือพลังงานเดือดดาล มีโอกาสทะเลาะวิวาทหรือโต้เถียงกันรุนแรงได้ง่ายที่สุด ควรหลีกเลี่ยงการง้อแฟนในยามนี้",
        shouldDo: ["เว้นระยะห่างให้อีกฝ่ายได้สงบสติอารมณ์", "รับฟังเงียบๆ โดยไม่โต้แย้งหากถูกตำหนิ"],
        shouldAvoid: ["การท้าทายเอาชนะคะคานกันด้วยอารมณ์", "การส่งข้อความประชดประชันยาวเหยียด"],
        speechTemplate: "เราเห็นใจและเข้าใจนะว่าตอนนี้เธออาจยังโกรธอยู่ ไม่เป็นไรนะ... เรายินดีรอเวลาให้เราทั้งคู่ใจเย็นลงค่อยมาคุยกันใหม่นะ",
      },
      trade: {
        score: 7.0, ratingText: "ค่อนข้างเหมาะสม",
        description: "ยามพลังไฟ เหมาะสำหรับการระบายสต็อกสินค้าด่วน ค้าขายเครื่องมือฮาร์ดแวร์ อุปกรณ์ซ่อมแซม หรือของเล่นกีฬา",
        shouldDo: ["นำเสนอโปรโมชันลดราคาด่วนจำกัดเวลา", "ปิดการขายด้วยความรวดเร็วและกระฉับกระเฉง"],
        shouldAvoid: ["การเจรจาค้าขายระยะยาวที่ต้องอาศัยความพยายามสูง", "การทะเลาะเบาะแว้งกับลูกค้า"],
        speechTemplate: "โปรพิเศษตัวนี้ลดสูงสุดเฉพาะรอบวันนี้วันเดียวเท่านั้นครับ! ปิดดีลตอนนี้รับของแถมมูลค่าเพิ่มไปได้เลยทันทีครับ!",
      },
      negotiate: {
        score: 5.5, ratingText: "ติดขัดควรระวัง",
        description: "ยามแห่งอุปสรรคและการโต้แย้ง ไม่เหมาะสำหรับการตกลงเซ็นสัญญาร่วมทุนใดๆ แต่เหมาะสำหรับการลุยแก้ปัญหาหน้างานอย่างเร่งด่วน",
        shouldDo: ["ลงมือปฏิบัติตรวจเช็คปัญหาของหน้างาน", "แสดงความเด็ดเดี่ยวกล้าหาญในการเผชิญหน้าอุปสรรค"],
        shouldAvoid: ["การตกลงข้อเสนอที่มีความกังวลหรือไม่มั่นใจ", "การมีปากเสียงกับเพื่อนร่วมงานหรือพันธมิตร"],
        speechTemplate: "ทีมงานของเราพร้อมที่จะลุยและดำเนินการปฏิบัติการแก้ไขสถานการณ์ฉุกเฉินนี้ทันทีเพื่อผลลัพธ์ที่ดีขึ้นโดยเร็วที่สุดครับ",
      }
    },
    4: { // พุทธะ / พุธ / พุทโธ (๔)
      love: {
        score: 8.0, ratingText: "เหมาะสมมาก",
        description: "ยามดาวปัญญาและการพูดคุยชี้แจง เหมาะสำหรับการปรับความเข้าใจโดยการพูดคุยด้วยเหตุและผล อธิบายความจริงอย่างประนีประนอม",
        shouldDo: ["ยกเหตุผลมาชี้แจงอย่างมีน้ำหนักและสุภาพ", "ชวนคุยแบบสบายๆ เพื่อลดบรรยากาศตึงเครียด"],
        shouldAvoid: ["การบิดเบือนข้อเท็จจริงหรือการโกหกปิดบัง", "การพูดเหน็บแนมหรือพูดจาประชดประชัน"],
        speechTemplate: "เราอยากขอโอกาสมาอธิบายเหตุผลและพูดคุยปรับความเข้าใจกันแบบเปิดอกสบายๆ นะ เรายินดีฟังสิ่งที่เธอคิดทั้งหมดเลย",
      },
      trade: {
        score: 9.5, ratingText: "ดีเยี่ยมที่สุด (แนะนำ ✨)",
        description: "ยามดวงดาวแห่งพ่อค้าวาณิชและการสื่อสาร ค้าขายสิ่งใดก็ได้ผลสำเร็จ ปิดยอดทะลุเป้า เจรจาลูกค้าคล่องแคล่วที่สุด",
        shouldDo: ["เขียนโฆษณาเสนอขายอย่างมีเสน่ห์ดึงดูด", "ปิดการขายแบบเน้นข้อมูลผลประโยชน์ที่ได้รับอย่างชัดเจน"],
        shouldAvoid: ["การปล่อยให้บทสนทนาเงียบเฉยเป็นเวลานาน", "การสื่อสารข้อมูลที่ผิดพลาดกุมเครือ"],
        speechTemplate: "ข้อเสนอแคมเปญสิทธิพิเศษตัวนี้จัดทำขึ้นโดยตรงเพื่อช่วยแก้ปัญหาและประหยัดงบประมาณของคุณอย่างตรงจุดที่สุดเลยครับ",
      },
      negotiate: {
        score: 9.8, ratingText: "ดีเยี่ยมที่สุด (แนะนำ ✨)",
        description: "ยามฤกษ์งามยามดีที่สุดในการทำสัญญา สอบสัมภาษณ์ สอบแข่งขัน เจรจาธุรกิจสำคัญ หรือเซ็นเอกสารเซ็นรับข้อตกลง",
        shouldDo: ["เตรียมข้อมูลและสถิติอ้างอิงให้พร้อมและแม่นยำ", "พูดจาฉะฉาน ชัดถ้อยชัดคำและมีมารยาทดีเลิศ"],
        shouldAvoid: ["การมาสายหรือการแสดงความประมาทเลินเล่อ", "การขาดความมั่นใจในสิ่งที่จะพูด"],
        speechTemplate: "เราได้จัดเตรียมกรอบความร่วมมือและสถิติตัวเลขทั้งหมดมาอย่างละเอียด เพื่อให้มั่นใจว่าจะเกิดประโยชน์ร่วมกันสูงสุดแน่นอนครับ",
      }
    },
    5: { // ครู / พฤหัส / ชีโว (๕)
      love: {
        score: 8.5, ratingText: "เหมาะสมมาก",
        description: "ยามผู้หลักผู้ใหญ่และธรรมะเมตตา การปรับความเข้าใจจะสำเร็จได้ด้วยการให้เกียรติซึ่งกันและกัน และรับฟังด้วยความเห็นอกเห็นใจ",
        shouldDo: ["รับฟังอีกฝ่ายด้วยท่าทียินดีปรับปรุงตัว", "ขอคำปรึกษาจากผู้ใหญ่ที่เป็นกลางคอยช่วยเหลือ"],
        shouldAvoid: ["การพยายามทำตัวเหนือกว่าหรือสั่งสอนเทศนาอีกฝ่าย", "การแสดงท่าทีเย่อหยิ่งหัวแข็ง"],
        speechTemplate: "เราเข้าใจและน้อมรับฟังข้อติเตียนของเธอนะ... เราเห็นด้วยว่าเราควรช่วยกันแก้ไขเพื่อสร้างความรักที่ยั่งยืนแข็งแรงขึ้น",
      },
      trade: {
        score: 9.8, ratingText: "ดีเยี่ยมที่สุด (แนะนำ ✨)",
        description: "ยามมหามงคลโชคลาภพูนทวี เหมาะสำหรับการค้าขายของมีมูลค่า ผลงานวิชาการ สินค้ามงคล หรือตกลงการซื้อขายทรัพย์สินขนาดใหญ่",
        shouldDo: ["เน้นขายคุณภาพสินค้าและความถูกต้องของสเปก", "ให้ข้อมูลบริการอย่างซื่อสัตย์โปร่งใสและตรงไปตรงมา"],
        shouldAvoid: ["การเอาเปรียบลูกค้าหรือพูดโกหกเกินจริง", "การบริการที่ขาดความสุภาพไม่เหมาะสม"],
        speechTemplate: "สินค้าชิ้นนี้ถูกออกแบบมาด้วยการผสมผสานนวัตกรรมและความคงทนถาวร เพื่อส่งมอบผลลัพธ์ที่ดีและยั่งยืนที่สุดแก่ผู้ใช้ครับ",
      },
      negotiate: {
        score: 9.5, ratingText: "ดีเยี่ยมที่สุด (แนะนำ ✨)",
        description: "ยามฤกษ์มีชัยในการเข้าพบหัวหน้าผู้ใหญ่ ปรึกษางานวางแผน ขอคำแนะนำทางกฎหมาย หรือวางรากฐานการเรียนและธุรกิจ",
        shouldDo: ["เข้าหาผู้ใหญ่ด้วยมารยาทนอบน้อมสุภาพที่สุด", "เสนอข้อมูลตรงไปตรงมาด้วยความซื่อสัตย์โปร่งใส"],
        shouldAvoid: ["การเจรจาผลประโยชน์ที่ผิดกฎหมายหรือศีลธรรม", "การเร่งรัดเอาแต่ใจตนเอง"],
        speechTemplate: "แผนงานวางรากฐานโครงสร้างชิ้นนี้ตั้งอยู่บนหลักเกณฑ์ความถูกต้องและคำนึงถึงผลประโยชน์ของทุกภาคส่วนเป็นสำคัญครับ",
      }
    },
    6: { // ศุกระ / ศุโกร / ศุกโร (๖)
      love: {
        score: 9.8, ratingText: "ดีเยี่ยมที่สุด (แนะนำ ✨)",
        description: "ยามแห่งดาวความรักและความโรแมนติกชั้นเลิศ เหมาะกับการง้อแฟน ปรับความเข้าใจ พาไปเดท ทานอาหารอร่อย หรือมอบของขวัญเซอร์ไพรส์",
        shouldDo: ["มอบช่อดอกไม้หรือของขวัญที่ประณีตพึงใจ", "สร้างบรรยากาศที่โรแมนติกผ่อนคลาย", "แสดงความเมตตารักใคร่ห่วงใยอย่างเต็มที่"],
        shouldAvoid: ["การดึงประเด็นเครียดๆ เรื่องภาระการเงินหรือปัญหาอื่นมาขัดจังหวะ", "การแต่งกายไม่เรียบร้อย"],
        speechTemplate: "ขอโทษนะคะคนดี... วันนี้เราเตรียมของที่เธอชอบที่สุดพร้อมอาหารมื้อพิเศษไว้รอ หวังว่าจะช่วยให้เธอยิ้มและหายงอนเรานะ 💖",
      },
      trade: {
        score: 9.2, ratingText: "เหมาะสมมาก",
        description: "ยามดารานำโชคในเรื่องความงาม แฟชั่น เสื้อผ้า อาหารอร่อย ศิลปะและความบันเทิง ค้าขายสิ่งเหล่านี้จะดึงดูดเงินทองดีเยี่ยม",
        shouldDo: ["ตกแต่งหน้าร้านหรือชิ้นงานให้สวยงามสะดุดตา", "นำเสนอสินค้าด้วยพลังบวกและอินเนอร์ที่มีชีวิตชีวา"],
        shouldAvoid: ["การพูดคุยที่มีบรรยากาศจืดชืดเคร่งเครียด", "การตั้งราคาแบบคลุมเครือไม่ชัดเจน"],
        speechTemplate: "สินค้าคอลเลกชันใหม่ล่าสุดชิ้นนี้ถูกออกแบบมาเพื่อเพิ่มเสน่ห์และเสริมสร้างภาพลักษณ์ความมั่นใจให้คุณอย่างน่าทึ่งเลยค่ะ",
      },
      negotiate: {
        score: 8.8, ratingText: "เหมาะสมมาก",
        description: "ยามดีในการกระชับความสัมพันธ์กับคู่เจรจา ตกลงการร่วมมือผ่านงานสังสรรค์ ต้อนรับพันธมิตรแบบเป็นกันเองและรื่นรมย์",
        shouldDo: ["ใช้ท่าทีที่เป็นมิตรและเข้าถึงง่ายสร้างเสน่ห์", "เจรจาผลประโยชน์แบบให้เกิดความสุขพึงใจร่วมกัน"],
        shouldAvoid: ["การตั้งเงื่อนไขที่ตึงเครียดหรือเข้มงวดบีบคั้นเกินไป", "การแสดงอารมณ์หงุดหงิดขัดใจ"],
        speechTemplate: "ความร่วมมือร่วมใจกันพัฒนาในครั้งนี้จะช่วยสร้างสรรค์ผลลัพธ์และความสำเร็จอันงดงามและน่าชื่นชมให้เราทั้งสองฝ่ายแน่นอนค่ะ",
      }
    },
    7: { // เสารี / เสาร์ / โสโร (๗)
      love: {
        score: 5.0, ratingText: "ติดขัดควรระวัง",
        description: "ยามแห่งพลังความเงียบงันและความเคร่งขรึม การปรับความเข้าใจจะล่าช้าหรือพบความตึงเครียดสูง ควรใจเย็นและอดทนอย่างยิ่ง",
        shouldDo: ["แสดงความอดทนและรอคอยให้อีกฝ่ายพร้อม", "เน้นการพิสูจน์ความสม่ำเสมอสัจจะในการกระทำยาวๆ"],
        shouldAvoid: ["การกดดันเร่งเร้าให้อีกฝ่ายให้อภัยรวดเร็ว", "การใช้วาจาตัดพ้อเอาชนะ"],
        speechTemplate: "เราพร้อมที่จะให้เวลาและรอคอยเธอเสมอนะ ขอให้เวลาเป็นเครื่องพิสูจน์ความจริงใจและสัจจะในความตั้งใจดีของเรานะ",
      },
      trade: {
        score: 8.0, ratingText: "เหมาะสม",
        description: "ยามดีสำหรับการตกลงซื้อขายอสังหาริมทรัพย์ ที่ดิน อุปกรณ์ก่อสร้างขนาดใหญ่ หรือสัญญาการค้าระยะยาวหลายปี",
        shouldDo: ["เน้นจุดเด่นเรื่องความคงทนแข็งแรง มั่นคง", "อธิบายเงื่อนไขของสัญญาให้รอบคอบมีวินัย"],
        shouldAvoid: ["การเสนอสัญญาระยะสั้นเก็งกำไรฉาบฉวย", "การนำเสนอข้อมูลอย่างลวกๆ ลนลาน"],
        speechTemplate: "โครงการและทรัพย์สินชิ้นนี้ได้รับการคัดกรองมาเพื่อช่วยรองรับความมั่งคั่งและความมั่นคงถาวรในอนาคตของคุณอย่างดีที่สุดครับ",
      },
      negotiate: {
        score: 8.2, ratingText: "เหมาะสม",
        description: "ยามดีสำหรับการวางรากฐานโครงสร้างพื้นฐาน สัญญาสัมปทาน สัญญาระยะยาวที่มีความอดทนและรอบคอบสูง",
        shouldDo: ["เจรจาด้วยความใจเย็น รอบคอบและอดทนสูง", "ทบทวนหัวข้อและกฎหมายข้อตกลงอย่างละเอียดที่สุด"],
        shouldAvoid: ["การลงนามตกลงอย่างเร่งร้อนโดยขาดความรอบคอบ", "การไว้ใจคำพูดลอยๆ โดยไม่มีลายลักษณ์อักษร"],
        speechTemplate: "เราตั้งใจและจัดทำรายละเอียดโครงสร้างพื้นฐานนี้อย่างรอบคอบมีวินัยสูงสุด เพื่อให้แผนงานนี้ดำเนินไปอย่างมั่นคงถาวรครับ",
      }
    }
  };

  return mapping[planet]?.[topic] ?? {
    score: 7.0,
    ratingText: "เหมาะสม",
    description: "ช่วงเวลาดี มีความมั่นคง ปลอดภัยตามตำรายามอัฏฐกาล",
    shouldDo: ["สัญจรร่วมมือดี", "ชี้แจงตามระบบที่เหมาะสม"],
    shouldAvoid: ["การใช้อารมณ์ร้อน", "การตัดสินใจกะทันหัน"],
    speechTemplate: "ขอให้งานครั้งนี้ประสบผลสำเร็จตามที่ตั้งใจไว้นะคะ",
  };
}

import { UpgradePaywall } from "~/components/ui/UpgradePaywall";

export default function YamPage() {
  const data = useLoaderData<typeof loader>();
  const profile = (data as any).profile;
  const isLocked = profile?.plan === 'free' || profile?.plan === 'basic';

  const { revalidate } = useRevalidator();
  const [now, setNow] = useState<Date>(new Date());
  
  // React states for tab controllers & interactive form
  const [activeTab, setActiveTab] = useState<"live" | "ashta" | "finder" | "grid" | "compare">("live");
  const [plannerDay, setPlannerDay] = useState<"today" | "tomorrow">("today");
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);

  // Manual Ashta Calculator states
  const [ashtaDay, setAshtaDay] = useState<number>(() => new Date().getDate());
  const [ashtaMonth, setAshtaMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [ashtaYear, setAshtaYear] = useState<number>(() => new Date().getFullYear() + 543);
  const [ashtaTime, setAshtaTime] = useState<string>("");
  const [ashtaResult, setAshtaResult] = useState<any>(null);

  // Interactive Auspicious Finder states
  const [selectedTopic, setSelectedTopic] = useState<"love" | "trade" | "negotiate" | "travel">("love");
  
  // ปรับช่องวันที่เกิด พ.ศ. ของ Finder
  const [finderDay, setFinderDay] = useState<number>(() => new Date().getDate());
  const [finderMonth, setFinderMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [finderYear, setFinderYear] = useState<number>(() => new Date().getFullYear() + 543);
  const [finderTime, setFinderTime] = useState<string>(""); // e.g. "11:23"
  const [calculatedResult, setCalculatedResult] = useState<any>(null);

  // Compare Travel states (Option A and Option B)
  const [compDayA, setCompDayA] = useState<number>(() => new Date().getDate());
  const [compMonthA, setCompMonthA] = useState<number>(() => new Date().getMonth() + 1);
  const [compYearA, setCompYearA] = useState<number>(() => new Date().getFullYear() + 543);
  const [compTimeA, setCompTimeA] = useState<string>("20:00");

  const [compDayB, setCompDayB] = useState<number>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.getDate();
  });
  const [compMonthB, setCompMonthB] = useState<number>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.getMonth() + 1;
  });
  const [compYearB, setCompYearB] = useState<number>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.getFullYear() + 543;
  });
  const [compTimeB, setCompTimeB] = useState<string>("08:00");
  const [compareResult, setCompareResult] = useState<any>(null);

  // 8x7 Watch Grid State
  const [gridPeriod, setGridPeriod] = useState<"day" | "night">("day");
  const [selectedGridCell, setSelectedGridCell] = useState<{ dayName: string; yamNumber: number } | null>(null);
  const [gridDetailAdvice, setGridDetailAdvice] = useState<any>(null);

  // ── Quick Shortcut Date Setters ──
  const handleSetToday = () => {
    const d = new Date();
    setFinderDay(d.getDate());
    setFinderMonth(d.getMonth() + 1);
    setFinderYear(d.getFullYear() + 543);
  };

  const handleSetTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setFinderDay(d.getDate());
    setFinderMonth(d.getMonth() + 1);
    setFinderYear(d.getFullYear() + 543);
  };

  const handleSetOptionATonight = () => {
    const d = new Date();
    setCompDayA(d.getDate());
    setCompMonthA(d.getMonth() + 1);
    setCompYearA(d.getFullYear() + 543);
    setCompTimeA("20:00");
  };

  const handleSetOptionBTomorrowMorning = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setCompDayB(d.getDate());
    setCompMonthB(d.getMonth() + 1);
    setCompYearB(d.getFullYear() + 543);
    setCompTimeB("08:00");
  };

  const handleAshtaCalculate = () => {
    const targetDate = new Date(ashtaYear - 543, ashtaMonth - 1, ashtaDay);
    const [hStr, mStr] = ashtaTime.split(":");
    targetDate.setHours(parseInt(hStr ?? "12"), parseInt(mStr ?? "0"), 0, 0);

    const result = getYamPrediction(targetDate);
    setAshtaResult(result);
  };

  const handleSetAshtaNow = () => {
    const now = new Date();
    setAshtaDay(now.getDate());
    setAshtaMonth(now.getMonth() + 1);
    setAshtaYear(now.getFullYear() + 543);
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    setAshtaTime(`${hours}:${minutes}`);
    
    const result = getYamPrediction(now);
    setAshtaResult(result);
  };

  // Tick clock every second
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  // Revalidate loader every 60 s
  useEffect(() => {
    const id = setInterval(revalidate, 60_000);
    return () => clearInterval(id);
  }, [revalidate]);

  // Set default time in finder on load
  useEffect(() => {
    const hours = String(new Date().getHours()).padStart(2, "0");
    const minutes = String(new Date().getMinutes()).padStart(2, "0");
    setFinderTime(`${hours}:${minutes}`);
    
    // Default manual ashta calculation
    setAshtaTime(`${hours}:${minutes}`);
    const result = getYamPrediction(new Date());
    setAshtaResult(result);
  }, []);

  const sunrise = new Date(data.sunriseISO);
  const sunset  = new Date(data.sunsetISO);
  const symbol  = PLANET_SYMBOLS[data.yamName] ?? "✦";

  // Compute live watch boundaries
  const dayMs     = sunset.getTime() - sunrise.getTime();
  const nightMs   = (86400000 - dayMs);
  const windowMs  = data.period === "day" ? dayMs / 8 : nightMs / 8;
  const startBase = data.period === "day" ? sunrise : sunset;
  const yamStart  = new Date(startBase.getTime() + (data.yamNumber - 1) * windowMs);
  const yamEnd    = new Date(yamStart.getTime() + windowMs);
  const remaining = Math.max(0, yamEnd.getTime() - now.getTime());
  const remMin    = Math.floor(remaining / 60000);

  // BKK Day Shift 
  const yamDisplayDate = new Date(now);
  if (now.getHours() < 6) yamDisplayDate.setDate(yamDisplayDate.getDate() - 1);

  const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = yamDisplayDate.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // 🪐 Handle Finder calculation Click
  const handleCalculateFinder = () => {
    const targetDate = new Date(finderYear - 543, finderMonth - 1, finderDay);
    const [hStr, mStr] = finderTime.split(":");
    targetDate.setHours(parseInt(hStr ?? "12"), parseInt(mStr ?? "0"), 0, 0);

    const result = getYamPrediction(targetDate);
    const slots = calculateDailyYamSlots(targetDate);
    
    // ค้นหาสล็อตเวลาของช่วงเวลานั้นเพื่อดึง Ticks และช่วงเวลารวม
    const matchingSlot = slots.find(s => {
      const sStart = new Date(s.startTimeISO);
      const sEnd = new Date(s.endTimeISO);
      return targetDate.getTime() >= sStart.getTime() && targetDate.getTime() < sEnd.getTime();
    }) || slots[0]!;

    const advice = getTopicAdvice(selectedTopic, result.yamName, result.phase, matchingSlot.ticks);

    setCalculatedResult({
      yamName: result.yamName,
      phase: result.phase,
      period: result.period,
      timeLabel: matchingSlot.timeLabel,
      ticks: matchingSlot.ticks,
      advice,
    });
  };

  // ✈️ Handle Travel Comparison Calculation Click
  const handleCalculateCompare = () => {
    const dateA = new Date(compYearA - 543, compMonthA - 1, compDayA);
    const [hA, mA] = compTimeA.split(":");
    dateA.setHours(parseInt(hA ?? "12"), parseInt(mA ?? "0"), 0, 0);

    const dateB = new Date(compYearB - 543, compMonthB - 1, compDayB);
    const [hB, mB] = compTimeB.split(":");
    dateB.setHours(parseInt(hB ?? "12"), parseInt(mB ?? "0"), 0, 0);

    const resultA = getYamPrediction(dateA);
    const slotsA = calculateDailyYamSlots(dateA);
    const slotA = slotsA.find(s => {
      const sStart = new Date(s.startTimeISO);
      const sEnd = new Date(s.endTimeISO);
      return dateA.getTime() >= sStart.getTime() && dateA.getTime() < sEnd.getTime();
    }) || slotsA[0]!;
    const adviceA = getTopicAdvice("travel", resultA.yamName, resultA.phase, slotA.ticks);

    const resultB = getYamPrediction(dateB);
    const slotsB = calculateDailyYamSlots(dateB);
    const slotB = slotsB.find(s => {
      const sStart = new Date(s.startTimeISO);
      const sEnd = new Date(s.endTimeISO);
      return dateB.getTime() >= sStart.getTime() && dateB.getTime() < sEnd.getTime();
    }) || slotsB[0]!;
    const adviceB = getTopicAdvice("travel", resultB.yamName, resultB.phase, slotB.ticks);

    // ดึงบทสรุปแนะนำการเดินทางที่ดีที่สุด
    let verdict = "";
    if (adviceA.score > adviceB.score) {
      verdict = `🏆 แนะนำทางเลือกที่ 1 อย่างยิ่ง! เนื่องจากได้รับความมงคลเดินทาง ${slotA.ticks} ขีด (ระดับ ${adviceA.ratingText}) ซึ่งราบรื่น ปลอดภัย และให้พลังงานโชคลาภเกื้อหนุนมากกว่าทางเลือกที่ 2 อย่างเด่นชัดค่ะ`;
    } else if (adviceB.score > adviceA.score) {
      verdict = `🏆 แนะนำทางเลือกที่ 2 อย่างยิ่ง! เนื่องจากได้รับความมงคลเดินทาง ${slotB.ticks} ขีด (ระดับ ${adviceB.ratingText}) ซึ่งประเสริฐเลิศล้ำ ปลอดภัยจากเคราะห์ภัย และสัญจรเดินทางคล่องแคล่วกว่าค่ะ`;
    } else {
      verdict = `⚖️ ทั้งสองช่วงเวลามีระดับความมงคลเสมอกัน (${slotA.ticks} ขีด) สามารถเลือกสัญจรเดินทางได้ตามความสะดวกของตารางเวลาท่าน โดยพึงรักษาความระมัดระวังและตั้งมั่นในสติบารมีตามคำแนะนำอย่างเสมอกันค่ะ`;
    }

    setCompareResult({
      a: {
        dateLabel: dateA.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }),
        timeLabel: slotA.timeLabel,
        yamName: resultA.yamName,
        phase: resultA.phase,
        ticks: slotA.ticks,
        advice: adviceA,
      },
      b: {
        dateLabel: dateB.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }),
        timeLabel: slotB.timeLabel,
        yamName: resultB.yamName,
        phase: resultB.phase,
        ticks: slotB.ticks,
        advice: adviceB,
      },
      verdict,
    });
  };

  // 🪐 Handle Grid cell click event
  const handleGridCellClick = (dayName: string, yamNumber: number) => {
    setSelectedGridCell({ dayName, yamNumber });

    // ดึงชื่อยามของสล็อตเวลานั้น
    const dayNameEn = DAY_NAMES_EN[DAY_NAMES_TH.indexOf(dayName)]!;
    const table = gridPeriod === "day" ? yamDayTable[dayNameEn] : yamNightTable[dayNameEn];
    const yamName = table[yamNumber - 1]!;

    const ticksTable = gridPeriod === "day" ? yamDayTicksTable[dayNameEn] : yamNightTicksTable[dayNameEn];
    const ticks = ticksTable[yamNumber - 1] ?? 1;

    // คำนวณช่วงเวลาเฉลี่ย
    let startH = 6, startM = 0;
    if (gridPeriod === "day") {
      // 06:01 + (yamNum-1)*1.5h
      const minutes = 360 + (yamNumber - 1) * 90;
      startH = Math.floor(minutes / 60);
      startM = minutes % 60;
    } else {
      // 18:01 + (yamNum-1)*1.5h
      const minutes = 1080 + (yamNumber - 1) * 90;
      startH = Math.floor(minutes / 60);
      if (startH >= 24) startH -= 24;
      startM = minutes % 60;
    }
    const endMinutes = (gridPeriod === "day" ? 360 : 1080) + yamNumber * 90;
    let endH = Math.floor(endMinutes / 60);
    if (endH >= 24) endH -= 24;
    const endM = endMinutes % 60;

    const timeLabel = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")} - ${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")} น.`;

    // ดึงคำทำนายการเดินทางตรงตามเฟส
    const result = getYamPrediction(new Date()); // trigger lookup structure
    const fullPrediction = getYamPrediction(new Date(), { withPrediction: true }); // triggers predict lookup
    
    // ดึงข้อมูลคำแนะนำ
    const loveAdvice = getTopicAdvice("love", yamName, "middle", ticks);
    const tradeAdvice = getTopicAdvice("trade", yamName, "middle", ticks);
    const negotiateAdvice = getTopicAdvice("negotiate", yamName, "middle", ticks);
    const travelAdvice = getTopicAdvice("travel", yamName, "middle", ticks);

    setGridDetailAdvice({
      yamName,
      timeLabel,
      ticks,
      love: loveAdvice,
      trade: tradeAdvice,
      negotiate: negotiateAdvice,
      travel: travelAdvice,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[#D9BC82] text-xs tracking-widest uppercase mb-1">ฤกษ์ดีมีชัย</p>
          <h1 className="font-display text-3xl font-bold text-[#F8F6F1]">ฤกษ์งามยามดี</h1>
          <p className="text-[#94A3B8] text-sm mt-1">{dateStr}</p>
        </div>
        <div className="text-right">
          <p className="text-[#D9BC82] text-xs font-bold uppercase tracking-widest mb-1">ปัจจุบัน</p>
          <p className="font-display text-2xl font-bold text-[#F8F6F1] tabular-nums">{timeStr}</p>
        </div>
      </div>

      {/* 🌙 แถบพลังงานจันทรา (Moon Phase Slim Banner) */}
      <div className="relative overflow-hidden rounded-2xl border border-[#D9BC82]/15 bg-[#0A1628]/35 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-4 transition-all shadow-[0_0_15px_rgba(198,169,107,0.05)]">
        {/* Glow effect back */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#D9BC82]/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="text-3xl shrink-0 drop-shadow-[0_0_8px_rgba(217,188,130,0.3)]">
            {data.moon.isWanPhra ? "🌕" : data.moon.illumination > 50 ? "🌖" : "🌒"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-semibold text-xs text-[#D9BC82] tracking-wider block">
                {data.moon.moonPhase}
              </span>
              {data.moon.isWanPhra && (
                <span className="px-2 py-0.5 text-[9px] font-bold rounded-full text-[#D9BC82] border border-[#D9BC82]/30 bg-[#D9BC82]/10 uppercase tracking-wider">
                  วันพระ 🕉️
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-0.5 truncate leading-relaxed max-w-[280px] sm:max-w-md">
              {data.moon.guidance}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0 border-l border-white/5 pl-4">
          <p className="text-lg font-display font-black text-[#F8F6F1] leading-none tabular-nums">
            {data.moon.illumination}%
          </p>
          <span className="text-[8px] text-[#8A8070] uppercase font-bold tracking-widest block mt-0.5">
            ความสว่าง
          </span>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex flex-wrap bg-[#0A1628]/60 p-1 rounded-2xl border border-[#D9BC82]/10 gap-1 w-full relative">
        <button
          onClick={() => setActiveTab("live")}
          className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "live"
              ? "bg-[#D9BC82] text-[#0A1628] shadow-[0_0_12px_rgba(217,188,130,0.2)]"
              : "text-[#94A3B8] hover:text-[#F8F6F1] hover:bg-white/5"
          }`}
        >
          ⏱️ ยามสดขณะนี้
        </button>
        <button
          onClick={() => isLocked ? null : setActiveTab("ashta")}
          className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "ashta"
              ? "bg-[#D9BC82] text-[#0A1628] shadow-[0_0_12px_rgba(217,188,130,0.2)]"
              : isLocked 
              ? "text-[#94A3B8]/40 cursor-not-allowed" 
              : "text-[#94A3B8] hover:text-[#F8F6F1] hover:bg-white/5"
          }`}
          title={isLocked ? "สมาชิก PRO ขึ้นไปเท่านั้น" : ""}
        >
          🔮 คำนวณยามดี {isLocked && '🔒'}
        </button>
        <button
          onClick={() => isLocked ? null : setActiveTab("finder")}
          className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "finder"
              ? "bg-[#D9BC82] text-[#0A1628] shadow-[0_0_12px_rgba(217,188,130,0.2)]"
              : isLocked 
              ? "text-[#94A3B8]/40 cursor-not-allowed" 
              : "text-[#94A3B8] hover:text-[#F8F6F1] hover:bg-white/5"
          }`}
          title={isLocked ? "สมาชิก PRO ขึ้นไปเท่านั้น" : ""}
        >
          ✨ คำนวณฤกษ์มีชัย {isLocked && '🔒'}
        </button>
        <button
          onClick={() => isLocked ? null : setActiveTab("compare")}
          className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "compare"
              ? "bg-[#D9BC82] text-[#0A1628] shadow-[0_0_12px_rgba(217,188,130,0.2)]"
              : isLocked
              ? "text-[#94A3B8]/40 cursor-not-allowed"
              : "text-[#94A3B8] hover:text-[#F8F6F1] hover:bg-white/5"
          }`}
          title={isLocked ? "สมาชิก PRO ขึ้นไปเท่านั้น" : ""}
        >
          ✈️ เปรียบเทียบฤกษ์เดินทาง {isLocked && '🔒'}
        </button>
        <button
          onClick={() => isLocked ? null : setActiveTab("grid")}
          className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "grid"
              ? "bg-[#D9BC82] text-[#0A1628] shadow-[0_0_12px_rgba(217,188,130,0.2)]"
              : isLocked
              ? "text-[#94A3B8]/40 cursor-not-allowed"
              : "text-[#94A3B8] hover:text-[#F8F6F1] hover:bg-white/5"
          }`}
          title={isLocked ? "สมาชิก PRO ขึ้นไปเท่านั้น" : ""}
        >
          📅 ตารางยามอัฏฐกาล {isLocked && '🔒'}
        </button>
      </div>

      {isLocked && activeTab !== "live" && (
        <div className="animate-fade-in mt-6">
          <UpgradePaywall featureName="เครื่องมือวิเคราะห์ฤกษ์ยามเชิงลึก" description="การคำนวณยามล่วงหน้า, การหาฤกษ์มีชัย, และการเปรียบเทียบฤกษ์ สงวนสิทธิ์สำหรับสมาชิกระดับ PRO ขึ้นไป" />
        </div>
      )}

      {/* ⏱️ LIVE WATCH VIEW */}
      {activeTab === "live" && (
        <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
          {/* Main Live Card — Living Cosmic Magazine Layout */}
          <Card className="overflow-hidden border-[#D9BC82]/15 bg-[#0A1628]/40 p-0 shadow-[0_0_30px_rgba(217,188,130,0.06)]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
              
              {/* ฝั่งซ้าย: โลกคอสมิกแห่งดวงดาวและอวกาศ (Cosmic Starfield Screen) */}
              <div className="relative md:col-span-5 h-64 md:h-auto min-h-[250px] bg-slate-950 flex flex-col items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-[#D9BC82]/10">
                
                {/* 1. Deep Space Nebula Background */}
                <div 
                  className="absolute inset-0 bg-gradient-to-tr from-[#020617] via-[#091C36] to-[#020617] opacity-90"
                  style={{
                    backgroundImage: `radial-gradient(circle at 50% 50%, rgba(75, 111, 174, 0.22) 0%, rgba(2, 6, 23, 0.98) 80%)`
                  }}
                />
                
                {/* 2. Cosmic Starfield Sparkles */}
                <div className="absolute inset-0 opacity-40">
                  <div className="absolute top-10 left-10 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDuration: "3s" }} />
                  <div className="absolute top-32 right-12 w-1.5 h-1.5 bg-[#D9BC82] rounded-full animate-ping" style={{ animationDuration: "4s", animationDelay: "1s" }} />
                  <div className="absolute bottom-12 left-16 w-1.5 h-1.5 bg-[#4B6FAE] rounded-full animate-ping" style={{ animationDuration: "5s", animationDelay: "2s" }} />
                  <div className="absolute top-1/2 left-1/3 w-0.5 h-0.5 bg-white rounded-full opacity-60" />
                  <div className="absolute bottom-20 right-28 w-1 h-1 bg-white rounded-full opacity-50" />
                </div>

                {/* 3. Slow Spinning Astronomy Rings (วงแหวนดาราศาสตร์) */}
                <div className="absolute w-44 h-44 rounded-full border border-[#D9BC82]/10 animate-spin opacity-50" style={{ animationDuration: "50s" }} />
                <div className="absolute w-36 h-36 rounded-full border border-dashed border-[#4B6FAE]/20 animate-spin opacity-60" style={{ animationDuration: "30s", animationDirection: "reverse" }} />
                <div className="absolute w-28 h-28 rounded-full border border-white/5" />

                {/* 4. Giant Floating Star Symbol (สัญลักษณ์ยามตัวใหญ่ยักษ์) */}
                <div className="relative flex flex-col items-center justify-center animate-float">
                  {/* Subtle golden aura */}
                  <div className="absolute w-20 h-20 bg-[#D9BC82]/10 rounded-full blur-xl animate-pulse-subtle" />
                  
                  <span 
                    className="text-8xl text-[#D9BC82] leading-none drop-shadow-[0_0_15px_rgba(217,188,130,0.4)] select-none font-serif"
                  >
                    {symbol}
                  </span>
                  
                  {/* Active Star label */}
                  <span className="text-[9px] text-[#D9BC82] font-bold uppercase tracking-[0.3em] mt-3.5 bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-[#D9BC82]/25 backdrop-blur">
                    {data.yamName} เจ้าครอง
                  </span>
                </div>
              </div>

              {/* ฝั่งขวา: รายละเอียดกระแสพลังงานยามและข้อมูล (Astrological Magazine details) */}
              <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                
                {/* 1. Header Information */}
                <div>
                  <span className="text-[10px] text-[#D9BC82] font-bold uppercase tracking-widest block mb-1">
                    🪐 กระแสพลังยามมงคลขณะนี้
                  </span>
                  <h2 className="font-display text-3xl font-black text-[#F8F6F1] tracking-wide mt-1 drop-shadow-[0_0_8px_rgba(248,246,241,0.05)]">
                    ยาม{data.yamName}
                  </h2>
                  <div className="flex gap-2 items-center mt-2.5 flex-wrap">
                    <span className="px-3 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-[#F8F6F1]">
                      ยามใหญ่ที่ {data.yamNumber}
                    </span>
                    <span className="px-3 py-0.5 rounded-full bg-[#4B6FAE]/15 border border-[#4B6FAE]/25 text-[10px] font-bold text-[#9AB3D9]">
                      ช่วง{PERIOD_LABEL[data.period]}
                    </span>
                    <span className="px-3 py-0.5 rounded-full bg-[#D9BC82]/15 border border-[#D9BC82]/25 text-[10px] font-bold text-[#D9BC82]">
                      เฟส{PHASE_LABEL[data.phase]}
                    </span>
                  </div>
                </div>

                {/* 2. Interactive Progress Meter */}
                <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-2.5">
                  <div className="flex justify-between items-baseline text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-[#94A3B8]">ความเข้มข้นของกระแสพลัง</span>
                    <span className="text-[#D9BC82] font-display text-xs">เหลือ {remMin} นาที</span>
                  </div>
                  
                  {/* High Tech Progress Bar */}
                  <div className="h-2 w-full bg-[#1E293B]/60 rounded-full overflow-hidden border border-white/5 p-0.5">
                    <div 
                      className="h-full bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] rounded-full shadow-[0_0_12px_rgba(198,169,107,0.5)] transition-all duration-1000"
                      style={{ width: `${(1 - remaining / windowMs) * 100}%` }}
                    />
                  </div>
                  
                  <p className="text-[9px] text-[#8A8070] italic leading-relaxed pt-0.5">
                    *ข้อมูลเวลาสากลคำนวณแบบพลวัตแบบเรียลไทม์ อัปเดตเสถียรทุก ๆ 1 นาที
                  </p>
                </div>

                {/* 3. Solar Times & Astronomical Boundaries */}
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-[#8A8070] uppercase tracking-widest block font-bold">ขอบข่ายท้องฟ้า</span>
                    <div className="flex gap-4 text-xs font-semibold text-[#D9CDB7]">
                      <span className="flex items-center gap-1">☀️ ขึ้น {sunrise.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="flex items-center gap-1">☀️ ตก {sunset.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  
                  {/* Subtle live indicator blinking */}
                  <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/25 px-2.5 py-1 rounded-full">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" />
                    <span className="text-[8px] font-bold text-green-400 tracking-widest uppercase">LIVE</span>
                  </div>
                </div>

              </div>
            </div>
          </Card>

          {/* 🧭 ฤกษ์เดินทางยามอัฏฐกาล */}
          {data.travelAuspiciousness && (
            <Card className={`overflow-hidden border transition-all ${
              data.travelAuspiciousness.level === "excellent"
                ? "bg-[#D9BC82]/5 border-[#D9BC82]/30 shadow-[0_0_20px_rgba(217,188,130,0.08)] animate-pulse-subtle"
                : data.travelAuspiciousness.level === "very_good"
                ? "bg-[#4B6FAE]/5 border-[#4B6FAE]/20 shadow-[0_0_20px_rgba(75,111,174,0.05)]"
                : data.travelAuspiciousness.level === "good"
                ? "bg-white/5 border-white/10"
                : "bg-red-950/10 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.05)]"
            }`}>
              <div className="p-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🧭</span>
                  <span className="text-xs font-bold text-[#F8F6F1] uppercase tracking-widest">ฤกษ์สัญจรและการเดินทาง</span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span
                      key={i}
                      className={`text-sm ${
                        i < data.travelAuspiciousness.ticks
                          ? data.travelAuspiciousness.level === "excellent"
                            ? "text-[#D9BC82] drop-shadow-[0_0_5px_#D9BC82]"
                            : data.travelAuspiciousness.level === "very_good"
                            ? "text-[#4B6FAE] drop-shadow-[0_0_5px_#4B6FAE]"
                            : "text-green-400"
                          : "text-white/10"
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="shrink-0 flex flex-col items-center justify-center w-24 h-24 rounded-2xl border bg-black/20"
                  style={{
                    borderColor:
                      data.travelAuspiciousness.level === "excellent"
                        ? "rgba(217, 188, 130, 0.3)"
                        : data.travelAuspiciousness.level === "very_good"
                        ? "rgba(75, 111, 174, 0.3)"
                        : data.travelAuspiciousness.level === "good"
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(239, 68, 68, 0.2)",
                  }}
                >
                  <span className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider mb-1">ความมงคล</span>
                  <span className={`text-base font-bold ${
                    data.travelAuspiciousness.level === "excellent"
                      ? "text-[#D9BC82] glow-gold"
                      : data.travelAuspiciousness.level === "very_good"
                      ? "text-[#4B6FAE]"
                      : data.travelAuspiciousness.level === "good"
                      ? "text-green-400"
                      : "text-red-400"
                  }`}>
                    {data.travelAuspiciousness.ticks === 3 ? "ดีเยี่ยม" :
                     data.travelAuspiciousness.ticks === 2 ? "ดีมาก" :
                     data.travelAuspiciousness.ticks === 1 ? "ดี" : "ติดขัด"}
                  </span>
                  <span className="text-[10px] text-[#94A3B8] mt-1 tabular-nums font-bold">
                    {data.travelAuspiciousness.ticks} / 3 ขีด
                  </span>
                </div>

                <div className="flex-1 space-y-1">
                  <span className="text-[10px] text-[#94A3B8] uppercase font-bold block">คำพยากรณ์เดินทางขณะนี้</span>
                  <p className="text-base text-[#F8F6F1] font-medium leading-relaxed">
                    {data.travelAuspiciousness.description}
                  </p>
                  <p className="text-xs text-[#94A3B8] mt-1 italic">
                    {data.travelAuspiciousness.ticks === 0 
                      ? "⚠️ ยามติดขัด หลีกเลี่ยงการเริ่มต้นออกเดินทางสำคัญ หรือระมัดระวังความปลอดภัยเป็นพิเศษ" 
                      : "✨ ฤกษ์มงคลเหมาะสมสำหรับการเดินทางสัญจรและการติดต่อเจรจาธุรกิจ"}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Energy & Advice Section */}
          {data.prediction && (
            <Card className="p-0 overflow-hidden bg-[#0A1628]/40 border-[#D9BC82]/10">
              <div className="p-4 bg-[#D9BC82]/5 border-b border-[#D9BC82]/10 flex items-center gap-2">
                <span className="text-[#D9BC82]">✨</span>
                <span className="text-xs font-bold text-[#D9BC82] uppercase tracking-widest">พลังงานมงคลและคำแนะนำ</span>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <span className="text-[10px] text-[#94A3B8] uppercase font-bold block mb-1">ด้านมงคลเด่น</span>
                  <p className="text-base font-bold text-[#F8F6F1]">{data.prediction.auspicious}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-green-400/70 uppercase font-bold block">สิ่งที่ควรทำ</span>
                    <p className="text-sm text-[#D9CDB7] leading-relaxed">{data.prediction.shouldDo}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-red-400/70 uppercase font-bold block">ไม่ควรทำ / ควรระวัง</span>
                    <p className="text-sm text-[#D9CDB7] leading-relaxed">{data.prediction.shouldNotDo}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-white/5">
                  <span className="text-[10px] text-blue-400/70 uppercase font-bold block mb-1">ถ้าจะทำ ทำแบบไหน</span>
                  <p className="text-sm italic text-[#94A3B8] leading-relaxed">{data.prediction.howTo}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 🔮 MANUAL ASHTA CALCULATOR VIEW */}
      {activeTab === "ashta" && ashtaResult && (() => {
        const periodLabel = ashtaResult.period === "day" ? "กลางวัน" : "กลางคืน";
        const symbol = PLANET_SYMBOLS[ashtaResult.yamName] ?? "✦";
        
        // Compute Thai day name from date
        const targetDayTh = DAY_NAMES_TH[new Date(ashtaResult.date).getDay()] || "อาทิตย์";

        return (
          <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
            {/* Input form */}
            <Card className="bg-[#0A1628]/40 border-white/5 p-5">
              <h3 className="font-display text-sm font-bold text-[#F8F6F1] mb-4 border-b border-white/5 pb-2 flex items-center gap-1.5">
                <span>🔮</span> ระบบคำนวณยามอัฏฐกาลอัตโนมัติ (Ashta-Kala manual calculator)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                {/* 1. เลือกวัน พ.ศ. */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">1. เลือกวัน (พ.ศ.) *</label>
                  <div className="grid grid-cols-3 gap-1">
                    <select 
                      value={ashtaDay} 
                      onChange={(e) => setAshtaDay(Number(e.target.value))}
                      className="bg-slate-950/40 border border-[#D9BC82]/20 text-[#F8F6F1] rounded-xl px-1.5 py-2.5 text-xs focus:border-[#D9BC82]/50 outline-none"
                    >
                      {Array.from({ length: 31 }).map((_, i) => (
                        <option key={i + 1} value={i + 1} className="bg-[#020617]">{i + 1}</option>
                      ))}
                    </select>
                    <select 
                      value={ashtaMonth} 
                      onChange={(e) => setAshtaMonth(Number(e.target.value))}
                      className="bg-slate-950/40 border border-[#D9BC82]/20 text-[#F8F6F1] rounded-xl px-1.5 py-2.5 text-xs focus:border-[#D9BC82]/50 outline-none"
                    >
                      {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => (
                        <option key={i + 1} value={i + 1} className="bg-[#020617]">{m}</option>
                      ))}
                    </select>
                    <select 
                      value={ashtaYear} 
                      onChange={(e) => setAshtaYear(Number(e.target.value))}
                      className="bg-slate-950/40 border border-[#D9BC82]/20 text-[#F8F6F1] rounded-xl px-1.5 py-2.5 text-xs focus:border-[#D9BC82]/50 outline-none"
                    >
                      {Array.from({ length: 21 }).map((_, i) => {
                        const y = 2560 + i;
                        return <option key={y} value={y} className="bg-[#020617]">{y}</option>;
                      })}
                    </select>
                  </div>
                </div>

                {/* 2. เวลา */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">2. ใส่เวลา (ชั่วโมง:นาที) *</label>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={ashtaTime}
                      onChange={(e) => setAshtaTime(e.target.value)}
                      className="flex-1 bg-[#1E293B]/40 border border-[#D9BC82]/20 rounded-xl px-3 py-2 text-[#F8F6F1] font-display text-sm focus:border-[#D9BC82]/50 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleSetAshtaNow}
                      className="px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all bg-[#D9BC82]/10 border border-[#D9BC82]/20 text-[#D9BC82] hover:bg-[#D9BC82]/20"
                    >
                      ปัจจุบัน
                    </button>
                  </div>
                </div>

                {/* Calculate button */}
                <button
                  onClick={handleAshtaCalculate}
                  className="py-2.5 rounded-xl bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#0A1628] font-bold text-xs tracking-widest uppercase hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(198,169,107,0.15)]"
                >
                  คำนวณยามอัฏฐกาล ✨
                </button>
              </div>
            </Card>

            {/* Title / Day Period */}
            <div className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full bg-[#D9BC82]/10 border border-[#D9BC82]/20 text-[#D9BC82]">
                วัน{targetDayTh} — {periodLabel}
              </span>
            </div>

            {/* 4-card summary grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* ยามที่ */}
              <div className="p-4 rounded-2xl text-center bg-[#1E293B]/20 border border-white/5 shadow-inner">
                <span className="text-[9px] text-[#94A3B8] uppercase tracking-widest block mb-2 font-bold">ยามที่</span>
                <span className="text-3xl font-black text-[#D9BC82]">{ashtaResult.yamNumber}</span>
              </div>

              {/* ชื่อยาม */}
              <div className="p-4 rounded-2xl text-center bg-[#1E293B]/20 border border-white/5 shadow-inner">
                <span className="text-[9px] text-[#94A3B8] uppercase tracking-widest block mb-2 font-bold">ชื่อยาม</span>
                <span className="text-base font-bold text-[#F8F6F1]">{ashtaResult.yamName}</span>
              </div>

              {/* ดาวเสวยยาม */}
              <div className="p-4 rounded-2xl text-center bg-[#1E293B]/20 border border-white/5 shadow-inner">
                <span className="text-[9px] text-[#94A3B8] uppercase tracking-widest block mb-2 font-bold">ดาวเสวยยาม</span>
                <span className="text-base font-bold text-[#D9BC82] flex items-center justify-center gap-1">
                  <span>{symbol}</span>
                  <span>{ashtaResult.yamName}</span>
                </span>
              </div>

              {/* ช่วงเวลายาม */}
              <div className="p-4 rounded-2xl text-center bg-[#1E293B]/20 border border-white/5 shadow-inner">
                <span className="text-[9px] text-[#94A3B8] uppercase tracking-widest block mb-2 font-bold">ช่วงเวลายาม</span>
                <span className="text-xs font-bold text-[#F8F6F1] block">
                  {new Date(ashtaResult.date).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
                </span>
                <span className="text-[9px] text-[#94A3B8] block mt-0.5">
                  ({PHASE_LABEL[ashtaResult.phase]})
                </span>
              </div>
            </div>

            {/* Prediction cards */}
            {ashtaResult.prediction && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* เรื่องที่ได้ยิน */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-base">🚩</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#D9BC82]">เรื่องที่ได้ยิน (ข่าวกาลกิณี/มงคล)</span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#D9CDB7]">{ashtaResult.prediction.news}</p>
                </div>

                {/* คนเจ็บไข้ */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-base">🏥</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-rose-300">คนเจ็บไข้</span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#D9CDB7]">{ashtaResult.prediction.sickness}</p>
                </div>

                {/* ของหาย */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-base">🔍</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300">ของหาย</span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#D9CDB7]">{ashtaResult.prediction.lostItem}</p>
                </div>

                {/* การเดินทางประจำยาม */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-base">🚗</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-green-300">การเดินทาง ({PHASE_LABEL[ashtaResult.phase]})</span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#D9CDB7]">
                    {ashtaResult.travelAuspiciousness.description}
                  </p>
                </div>
              </div>
            )}

            {/* Enhanced Guidance Section */}
            {ashtaResult.prediction && (
              <div className="p-4 rounded-2xl space-y-3 bg-[#0A1628]/35 border border-[#D9BC82]/15">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#D9BC82]">✨</span>
                  <span className="text-[10px] font-bold text-[#D9BC82] uppercase tracking-widest">พลังงานมงคลและคำแนะนำ</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-[8px] text-[#94A3B8] uppercase font-bold block mb-0.5">ด้านมงคลเด่น:</span>
                    <p className="text-xs font-bold text-[#D9BC82]">{ashtaResult.prediction.auspicious}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[8px] text-green-400/60 uppercase font-bold block mb-0.5">สิ่งที่ควรทำ:</span>
                      <p className="text-[10px] text-[#D9CDB7] leading-snug">{ashtaResult.prediction.shouldDo}</p>
                    </div>
                    <div>
                      <span className="text-[8px] text-red-400/60 uppercase font-bold block mb-0.5">ไม่ควรทำ / ควรระวัง:</span>
                      <p className="text-[10px] text-[#D9CDB7] leading-snug">{ashtaResult.prediction.shouldNotDo}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-[8px] text-blue-400/60 uppercase font-bold block mb-0.5">ถ้าจะทำ ทำแบบไหน:</span>
                    <p className="text-[10px] italic text-[#94A3B8] leading-snug">{ashtaResult.prediction.howTo}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Travel timing guide — all 3 sub-yam */}
            {ashtaResult.prediction?.travel && (
              <div className="p-3 rounded-2xl space-y-2 bg-[#0A1628]/40 border border-white/5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#94A3B8] block">🕐 การเดินทางตามช่วงยาม</span>
                {[
                  { label: "ยามต้น (0 - 30 นาทีแรก)", val: ashtaResult.prediction.travel.start, phase: "start" },
                  { label: "ยามกลาง (31 - 60 นาที)", val: ashtaResult.prediction.travel.middle, phase: "middle" },
                  { label: "ยามปลาย (61 - 90 นาทีสุดท้าย)", val: ashtaResult.prediction.travel.end, phase: "end" },
                ].map((t, i) => {
                  const isActive = ashtaResult.phase === t.phase;
                  return (
                    <div key={i} className="flex gap-2 items-start rounded-xl px-2.5 py-2 transition-all"
                      style={isActive ? { background: "rgba(198,169,107,0.12)", border: "1px solid rgba(217,188,130,0.25)" } : {}}>
                      <span className={`text-[9px] font-black uppercase tracking-wider shrink-0 pt-0.5 ${
                        isActive ? "text-[#D9BC82]" : "text-[#94A3B8]"
                      }`}>{t.label}{isActive ? " ◀" : ""}</span>
                      <p className={`text-[10px] leading-relaxed ${
                        isActive ? "text-[#F8F6F1]" : "text-[#94A3B8]"
                      }`}>{t.val}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Best time highlight */}
            {ashtaResult.prediction?.bestTime && (
              <div className="p-4 rounded-2xl flex items-center gap-3 bg-gradient-to-r from-[#C6A96B]/15 to-[#D9BC82]/5 border border-[#D9BC82]/30 shadow-[0_0_20px_rgba(217,188,130,0.08)]">
                <span className="text-xl">⭐</span>
                <div>
                  <span className="text-[9px] text-[#D9BC82] font-bold uppercase tracking-widest block">เวลามงคลที่ดีที่สุดประจำยาม</span>
                  <p className="text-sm text-[#D9BC82] font-bold mt-0.5">{ashtaResult.prediction.bestTime}</p>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ✨ INTERACTIVE AUSPICIOUS FINDER VIEW */}
      {activeTab === "finder" && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Interactive Form Panel */}
          <Card className="bg-[#0A1628]/40 border-white/5 p-6">
            <h3 className="font-display text-lg font-bold text-[#F8F6F1] mb-5 border-b border-white/5 pb-2">
              🧭 ระบบวิเคราะห์เลือกฤกษ์ยามอัจฉริยะ
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 1. เลือกเรื่องที่ต้องการ */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#D9BC82] uppercase tracking-wider block">1. เลือกเรื่องที่ต้องการ</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "love", icon: "💖", label: "ง้อแฟน" },
                    { id: "trade", icon: "💰", label: "ค้าขาย" },
                    { id: "negotiate", icon: "🗣️", label: "เจรจา" },
                    { id: "travel", icon: "✈️", label: "เดินทาง" },
                  ].map(topic => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setSelectedTopic(topic.id as any)}
                      className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.97] ${
                        selectedTopic === topic.id
                          ? "bg-[#D9BC82]/15 border-[#D9BC82]/40 text-[#D9BC82] shadow-[0_0_12px_rgba(217,188,130,0.1)]"
                          : "bg-white/5 border-transparent text-[#94A3B8] hover:border-white/10 hover:text-[#F8F6F1]"
                      }`}
                    >
                      <span className="text-lg">{topic.icon}</span>
                      <span className="text-xs font-bold">{topic.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. เลือกวัน (พ.ศ.) */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#D9BC82] uppercase tracking-wider block">2. เลือกวัน (พ.ศ.)</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <select 
                    value={finderDay} 
                    onChange={(e) => setFinderDay(Number(e.target.value))}
                    className="bg-slate-950/40 border border-[#D9BC82]/20 text-[#F8F6F1] rounded-xl px-2 py-2.5 text-xs focus:border-[#D9BC82]/50 outline-none"
                  >
                    {Array.from({ length: 31 }).map((_, i) => (
                      <option key={i + 1} value={i + 1} className="bg-[#020617]">{i + 1}</option>
                    ))}
                  </select>
                  <select 
                    value={finderMonth} 
                    onChange={(e) => setFinderMonth(Number(e.target.value))}
                    className="bg-slate-950/40 border border-[#D9BC82]/20 text-[#F8F6F1] rounded-xl px-2 py-2.5 text-xs focus:border-[#D9BC82]/50 outline-none"
                  >
                    {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => (
                      <option key={i + 1} value={i + 1} className="bg-[#020617]">{m}</option>
                    ))}
                  </select>
                  <select 
                    value={finderYear} 
                    onChange={(e) => setFinderYear(Number(e.target.value))}
                    className="bg-slate-950/40 border border-[#D9BC82]/20 text-[#F8F6F1] rounded-xl px-2 py-2.5 text-xs focus:border-[#D9BC82]/50 outline-none"
                  >
                    {Array.from({ length: 21 }).map((_, i) => {
                      const y = 2560 + i;
                      return <option key={y} value={y} className="bg-[#020617]">{y}</option>;
                    })}
                  </select>
                </div>
                
                {/* Shortcuts */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleSetToday}
                    className="py-1.5 px-3 rounded-lg border border-white/5 bg-white/5 text-[10px] font-bold text-[#94A3B8] hover:bg-white/10 hover:text-[#F8F6F1] transition-all"
                  >
                    📅 วันนี้
                  </button>
                  <button
                    type="button"
                    onClick={handleSetTomorrow}
                    className="py-1.5 px-3 rounded-lg border border-white/5 bg-white/5 text-[10px] font-bold text-[#94A3B8] hover:bg-white/10 hover:text-[#F8F6F1] transition-all"
                  >
                    📅 พรุ่งนี้
                  </button>
                </div>
              </div>

              {/* 3. ใส่เวลา */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#D9BC82] uppercase tracking-wider block">3. ใส่เวลา</label>
                <div className="relative">
                  <input
                    type="time"
                    value={finderTime}
                    onChange={(e) => setFinderTime(e.target.value)}
                    className="w-full bg-[#1E293B]/40 border border-white/10 rounded-xl px-4 py-3 text-[#F8F6F1] font-display text-lg focus:border-[#D9BC82]/40 outline-none transition-all"
                  />
                </div>
                <span className="text-[10px] text-[#94A3B8] block italic">*ใช้คำนวณสลับยามอัฏฐกาล 1.5 ชม. ตามดาราศาสตร์จริง</span>
              </div>
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculateFinder}
              className="w-full py-3.5 mt-6 rounded-xl bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#0A1628] font-bold text-sm tracking-widest uppercase hover:brightness-105 active:scale-[0.99] transition-all shadow-[0_0_24px_rgba(198,169,107,0.15)] flex items-center justify-center gap-2"
            >
              คำนวณเวลาที่เหมาะที่สุด ✨
            </button>
          </Card>

          {/* 🪐 Result Display Card */}
          {calculatedResult ? (
            <div className="space-y-6 animate-fade-in">
              <Card className="bg-[#0A1628]/40 border-[#D9BC82]/15 overflow-hidden">
                {/* Result header */}
                <div className="p-4 bg-[#D9BC82]/5 border-b border-[#D9BC82]/10 flex items-center gap-2">
                  <span className="text-[#D9BC82]">🏆</span>
                  <span className="text-xs font-bold text-[#D9BC82] uppercase tracking-widest">ผลลัพธ์แนะนำจากการคำนวณ</span>
                </div>

                <div className="p-6 flex flex-col md:flex-row items-center md:items-stretch gap-6">
                  {/* Score circle */}
                  <div className="flex flex-col items-center justify-center text-center p-5 bg-black/30 rounded-2xl border border-white/5 w-full md:w-48 shrink-0">
                    <span className="text-[10px] text-[#94A3B8] uppercase font-bold block mb-1">คะแนนความเหมาะสม</span>
                    <div className="flex items-baseline gap-1 mt-1 text-[#D9BC82]">
                      <span className="text-5xl font-display font-bold">{calculatedResult.advice.score.toFixed(1)}</span>
                      <span className="text-sm text-[#94A3B8]">/10</span>
                    </div>
                    {/* Stars */}
                    <div className="flex gap-0.5 mt-2 text-[#D9BC82]">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const starVal = i + 1;
                        const scoreHalf = calculatedResult.advice.score / 2;
                        return (
                          <span key={i} className="text-sm drop-shadow-[0_0_4px_rgba(217,188,130,0.5)]">
                            {starVal <= scoreHalf ? "★" : starVal - 0.5 <= scoreHalf ? "⯪" : "☆"}
                          </span>
                        );
                      })}
                    </div>
                    <span className={`text-xs font-bold mt-3 px-3 py-0.5 rounded-full ${
                      calculatedResult.advice.score >= 8.5
                        ? "bg-[#D9BC82]/15 text-[#D9BC82]"
                        : calculatedResult.advice.score >= 6.5
                        ? "bg-[#4B6FAE]/15 text-[#4B6FAE]"
                        : "bg-red-400/10 text-red-400"
                    }`}>
                      {calculatedResult.advice.ratingText}
                    </span>
                  </div>

                  {/* Best Time window and summary info */}
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] font-bold">
                        <span>🕒</span> ช่วงเวลาที่ดีที่สุดของยามนี้
                      </div>
                      <h4 className="font-display text-2xl font-bold text-[#F8F6F1]">{calculatedResult.timeLabel}</h4>
                      <div className="flex gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-[#D9BC82]">
                          ยาม{PHASE_LABEL[calculatedResult.phase]}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-[#94A3B8]">
                          ดาว{calculatedResult.yamName} ({PLANET_SYMBOLS[calculatedResult.yamName]})
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-[#D9BC82]/5 rounded-xl border border-[#D9BC82]/10">
                      <p className="text-sm text-[#D9CDB7] leading-relaxed">
                        {calculatedResult.advice.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* 3 columns suggestion grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* วันนี้ควรทำอะไร */}
                <Card className="bg-[#10B981]/5 border-[#10B981]/15 p-5">
                  <div className="flex items-center gap-2 text-[#10B981] font-bold text-xs uppercase tracking-wider mb-3">
                    <span className="text-base">✓</span> วันนี้ควรทำอะไร
                  </div>
                  <ul className="space-y-2">
                    {calculatedResult.advice.shouldDo.map((item: string, i: number) => (
                      <li key={i} className="text-xs text-[#D9CDB7] leading-relaxed flex items-start gap-1.5">
                        <span className="text-[#10B981] shrink-0 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* สิ่งที่ควรเลี่ยง */}
                <Card className="bg-red-500/5 border-red-500/15 p-5">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider mb-3">
                    <span className="text-base">✕</span> สิ่งที่ควรเลี่ยง
                  </div>
                  <ul className="space-y-2">
                    {calculatedResult.advice.shouldAvoid.map((item: string, i: number) => (
                      <li key={i} className="text-xs text-[#D9CDB7] leading-relaxed flex items-start gap-1.5">
                        <span className="text-red-400 shrink-0 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* คำแนะนำการใช้คำพูด (Speech Bubble) */}
                <Card className="bg-[#4B6FAE]/5 border-[#4B6FAE]/15 p-5 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-[#4B6FAE] font-bold text-xs uppercase tracking-wider mb-3">
                    <span className="text-base">💬</span> คำแนะนำการใช้คำพูด
                  </div>
                  
                  {/* Chat bubble widget */}
                  <div className="p-3 bg-[#4B6FAE]/10 rounded-xl rounded-tl-none border border-[#4B6FAE]/20 text-xs italic text-[#D9CDB7] leading-relaxed relative my-auto shadow-inner">
                    "{calculatedResult.advice.speechTemplate}"
                  </div>

                  <p className="text-[10px] text-[#94A3B8] italic mt-3 text-right">
                    *เจรจาด้วยน้ำเสียงนุ่มนวล มุ่งมั่นและจริงใจ
                  </p>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="p-10 text-center border-dashed border-white/5 bg-transparent">
              <span className="text-4xl block mb-2 opacity-55">🎯</span>
              <p className="text-sm text-[#94A3B8]">
                ป้อนข้อมูลด้านบนแล้วกด "คำนวณเวลาที่เหมาะที่สุด" เพื่อประเมินฤกษ์มีชัยประจำตัวคุณล่วงหน้า
              </p>
            </Card>
          )}
        </div>
      )}

      {/* 📅 WATCH GRID VIEW (กระดานตารางยาม 8x7) */}
      {activeTab === "grid" && (
        <div className="space-y-6">
          {/* Day / Night Selector */}
          <div className="flex bg-[#0A1628]/60 p-1 rounded-2xl border border-white/5 gap-1 w-full max-w-md mx-auto">
            <button
              onClick={() => {
                setGridPeriod("day");
                setSelectedGridCell(null);
                setGridDetailAdvice(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                gridPeriod === "day"
                  ? "bg-[#D9BC82] text-[#0A1628] shadow-[0_0_8px_rgba(217,188,130,0.2)]"
                  : "text-[#94A3B8] hover:text-[#F8F6F1]"
              }`}
            >
              ☀️ ยามกลางวัน (06:01 - 18:00)
            </button>
            <button
              onClick={() => {
                setGridPeriod("night");
                setSelectedGridCell(null);
                setGridDetailAdvice(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                gridPeriod === "night"
                  ? "bg-[#D9BC82] text-[#0A1628] shadow-[0_0_8px_rgba(217,188,130,0.2)]"
                  : "text-[#94A3B8] hover:text-[#F8F6F1]"
              }`}
            >
              🌙 ยามกลางคืน (18:01 - 06:00)
            </button>
          </div>

          {/* 8x7 Watch Grid Table */}
          <Card className="p-0 overflow-hidden bg-[#0A1628]/40 border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] text-center w-24">
                      วัน
                    </th>
                    {Array.from({ length: 8 }).map((_, i) => {
                      const num = i + 1;
                      let label = "";
                      if (gridPeriod === "day") {
                        // 06:01 - 07:30 เป็นต้น
                        const start = 360 + i * 90;
                        const end = 360 + (i + 1) * 90;
                        const startH = Math.floor(start / 60);
                        const startM = start % 60;
                        const endH = Math.floor(end / 60);
                        const endM = end % 60;
                        label = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}-${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
                      } else {
                        const start = 1080 + i * 90;
                        const end = 1080 + (i + 1) * 90;
                        let startH = Math.floor(start / 60);
                        if (startH >= 24) startH -= 24;
                        const startM = start % 60;
                        let endH = Math.floor(end / 60);
                        if (endH >= 24) endH -= 24;
                        const endM = end % 60;
                        label = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}-${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
                      }

                      return (
                        <th key={i} className="p-3 text-[10px] font-bold uppercase tracking-wider text-center text-[#94A3B8]">
                          ยามที่ {num}
                          <span className="block text-[8px] font-medium text-[#4A5568] tracking-normal mt-0.5">{label} น.</span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {DAY_NAMES_TH.map((dayName, dIdx) => {
                    const dayNameEn = DAY_NAMES_EN[dIdx]!;
                    const table = gridPeriod === "day" ? yamDayTable[dayNameEn] : yamNightTable[dayNameEn];
                    const ticksTable = gridPeriod === "day" ? yamDayTicksTable[dayNameEn] : yamNightTicksTable[dayNameEn];

                    return (
                      <tr key={dIdx} className="border-b border-white/5 hover:bg-white/[0.01]">
                        {/* Day Column */}
                        <td className="p-3 text-xs font-bold text-[#F8F6F1] bg-white/[0.01] border-r border-white/5 text-center">
                          {dayName}
                        </td>
                        
                        {/* 8 Watch Slots columns */}
                        {table.map((yamName: string, yIdx: number) => {
                          const ticks = ticksTable[yIdx] ?? 1;
                          const isSelected = selectedGridCell?.dayName === dayName && selectedGridCell?.yamNumber === yIdx + 1;

                          return (
                            <td
                              key={yIdx}
                              onClick={() => handleGridCellClick(dayName, yIdx + 1)}
                              className={`p-3 text-center cursor-pointer transition-all border-r border-white/5 select-none ${
                                isSelected
                                  ? "bg-[#D9BC82]/15 text-[#D9BC82]"
                                  : "hover:bg-white/5"
                              }`}
                            >
                              <div className="text-xs font-bold flex flex-col items-center justify-center gap-1">
                                <span className="text-base text-[#D9BC82]" style={{ fontFamily: "serif" }}>
                                  {PLANET_SYMBOLS[yamName] || "✦"}
                                </span>
                                <span className={isSelected ? "text-[#D9BC82]" : "text-[#D9CDB7]"}>
                                  {yamName}
                                </span>
                                {/* Ticks */}
                                <div className="flex gap-0.5 text-[8px] mt-0.5 justify-center">
                                  {ticks > 0 ? (
                                    Array.from({ length: ticks }).map((_, starI) => (
                                      <span key={starI} className="text-green-400">✓</span>
                                    ))
                                  ) : (
                                    <span className="text-red-400 font-bold">⚠️</span>
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 🪐 Selected Grid Cell Details */}
          {gridDetailAdvice ? (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center md:text-left">
                <span className="text-xs text-[#94A3B8] font-bold block">รายละเอียดช่วงยามที่เลือก</span>
                <h3 className="font-display text-xl font-bold text-[#D9BC82] mt-0.5">
                  วัน{selectedGridCell?.dayName} · ยามที่ {selectedGridCell?.yamNumber} · ยาม{gridDetailAdvice.yamName} ({gridDetailAdvice.timeLabel})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 💖 ด้านความรัก & ง้อแฟน */}
                <Card className="bg-[#D9BC82]/5 border-[#D9BC82]/10 p-5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-[#D9BC82] uppercase tracking-wider">💖 ด้านความรัก & ง้อแฟน</span>
                    <span className="text-xs font-bold text-[#D9BC82] bg-[#D9BC82]/10 px-2 py-0.5 rounded-full">{gridDetailAdvice.love.score.toFixed(1)} /10</span>
                  </div>
                  <p className="text-xs text-[#D9CDB7] leading-relaxed mb-3">{gridDetailAdvice.love.description}</p>
                  <div className="space-y-1 pt-2 border-t border-white/5">
                    <span className="text-[9px] text-[#94A3B8] font-bold uppercase block">คำพูดมัดใจ:</span>
                    <p className="text-xs italic text-[#F8F6F1]">"{gridDetailAdvice.love.speechTemplate}"</p>
                  </div>
                </Card>

                {/* 💰 ด้านการเงิน & ค้าขาย */}
                <Card className="bg-amber-500/5 border-amber-500/10 p-5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">💰 ด้านการเงิน & ค้าขาย</span>
                    <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">{gridDetailAdvice.trade.score.toFixed(1)} /10</span>
                  </div>
                  <p className="text-xs text-[#D9CDB7] leading-relaxed mb-3">{gridDetailAdvice.trade.description}</p>
                  <div className="space-y-1 pt-2 border-t border-white/5">
                    <span className="text-[9px] text-[#94A3B8] font-bold uppercase block">คำพูดกระตุ้นยอดขาย:</span>
                    <p className="text-xs italic text-[#F8F6F1]">"{gridDetailAdvice.trade.speechTemplate}"</p>
                  </div>
                </Card>

                {/* 🗣️ ด้านการงาน & เจรจา */}
                <Card className="bg-[#4B6FAE]/5 border-[#4B6FAE]/10 p-5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-[#4B6FAE] uppercase tracking-wider">🗣️ ด้านการงาน & เจรจา</span>
                    <span className="text-xs font-bold text-[#4B6FAE] bg-[#4B6FAE]/10 px-2 py-0.5 rounded-full">{gridDetailAdvice.negotiate.score.toFixed(1)} /10</span>
                  </div>
                  <p className="text-xs text-[#D9CDB7] leading-relaxed mb-3">{gridDetailAdvice.negotiate.description}</p>
                  <div className="space-y-1 pt-2 border-t border-white/5">
                    <span className="text-[9px] text-[#94A3B8] font-bold uppercase block">คำพูดเจรจาธุรกิจ:</span>
                    <p className="text-xs italic text-[#F8F6F1]">"{gridDetailAdvice.negotiate.speechTemplate}"</p>
                  </div>
                </Card>

                {/* ✈️ ฤกษ์สัญจร & เดินทาง */}
                <Card className="bg-green-500/5 border-green-500/10 p-5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-green-400 uppercase tracking-wider">✈️ ฤกษ์สัญจร & เดินทาง</span>
                    <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">{gridDetailAdvice.travel.score.toFixed(1)} /10</span>
                  </div>
                  <p className="text-xs text-[#D9CDB7] leading-relaxed mb-3">{gridDetailAdvice.travel.description}</p>
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <span className="text-[9px] text-green-400/70 font-bold block">ควรทำ: {gridDetailAdvice.travel.shouldDo.join(" · ")}</span>
                    <span className="text-[9px] text-red-400/70 font-bold block">ควรเลี่ยง: {gridDetailAdvice.travel.shouldAvoid.join(" · ")}</span>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="p-8 text-center border-dashed border-white/5 bg-transparent">
              <span className="text-3xl block mb-2 opacity-50">💡</span>
              <p className="text-xs text-[#94A3B8]">
                คลิกเลือกยามใด ๆ ในตารางกระดานยาม 8x7 ด้านบน เพื่อดึงคำทำนายความเหมาะสมเฉพาะเรื่องและคำแนะยามย่อยของวันเวลาอย่างละเอียด
              </p>
            </Card>
          )}
        </div>
      )}

      {/* ✈️ COMPARE TRAVEL VIEW (เปรียบเทียบฤกษ์เดินทาง) */}
      {activeTab === "compare" && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Side-by-Side Options Form Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Option A Card */}
            <Card className="bg-[#0A1628]/40 border-[#4B6FAE]/20 p-5">
              <h3 className="font-display text-sm font-bold text-[#F8F6F1] mb-4 border-b border-white/5 pb-2 flex items-center justify-between">
                <span>🚗 ทางเลือกที่ 1 (Option A)</span>
                <span className="text-[10px] text-[#4B6FAE] uppercase tracking-wider font-bold">สัญจร A</span>
              </h3>
              
              <div className="space-y-4">
                {/* Date Dropdown Selectors */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">วันเดินทาง (พ.ศ.) *</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <select 
                      value={compDayA} 
                      onChange={(e) => setCompDayA(Number(e.target.value))}
                      className="bg-slate-950/40 border border-[#4B6FAE]/20 text-[#F8F6F1] rounded-xl px-2 py-2.5 text-xs focus:border-[#4B6FAE]/50 outline-none"
                    >
                      {Array.from({ length: 31 }).map((_, i) => (
                        <option key={i + 1} value={i + 1} className="bg-[#020617]">{i + 1}</option>
                      ))}
                    </select>
                    <select 
                      value={compMonthA} 
                      onChange={(e) => setCompMonthA(Number(e.target.value))}
                      className="bg-slate-950/40 border border-[#4B6FAE]/20 text-[#F8F6F1] rounded-xl px-2 py-2.5 text-xs focus:border-[#4B6FAE]/50 outline-none"
                    >
                      {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => (
                        <option key={i + 1} value={i + 1} className="bg-[#020617]">{m}</option>
                      ))}
                    </select>
                    <select 
                      value={compYearA} 
                      onChange={(e) => setCompYearA(Number(e.target.value))}
                      className="bg-slate-950/40 border border-[#4B6FAE]/20 text-[#F8F6F1] rounded-xl px-2 py-2.5 text-xs focus:border-[#4B6FAE]/50 outline-none"
                    >
                      {Array.from({ length: 21 }).map((_, i) => {
                        const y = 2560 + i;
                        return <option key={y} value={y} className="bg-[#020617]">{y}</option>;
                      })}
                    </select>
                  </div>
                </div>

                {/* Time selector */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">เวลาออกเดินทาง *</label>
                  <input
                    type="time"
                    value={compTimeA}
                    onChange={(e) => setCompTimeA(e.target.value)}
                    className="w-full bg-[#1E293B]/40 border border-[#4B6FAE]/20 rounded-xl px-4 py-2 text-[#F8F6F1] font-display text-sm focus:border-[#4B6FAE]/50 outline-none transition-all"
                  />
                </div>

                {/* Quick Shortcut */}
                <button
                  type="button"
                  onClick={handleSetOptionATonight}
                  className="w-full py-2 rounded-xl bg-[#4B6FAE]/10 border border-[#4B6FAE]/20 text-xs font-bold text-[#4B6FAE] hover:bg-[#4B6FAE]/20 transition-all flex items-center justify-center gap-1.5"
                >
                  🌙 ตั้งค่าด่วน: คืนนี้ (20:00 น.)
                </button>
              </div>
            </Card>

            {/* Option B Card */}
            <Card className="bg-[#0A1628]/40 border-[#D9BC82]/20 p-5">
              <h3 className="font-display text-sm font-bold text-[#F8F6F1] mb-4 border-b border-white/5 pb-2 flex items-center justify-between">
                <span>✈️ ทางเลือกที่ 2 (Option B)</span>
                <span className="text-[10px] text-[#D9BC82] uppercase tracking-wider font-bold">สัญจร B</span>
              </h3>
              
              <div className="space-y-4">
                {/* Date Dropdown Selectors */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">วันเดินทาง (พ.ศ.) *</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <select 
                      value={compDayB} 
                      onChange={(e) => setCompDayB(Number(e.target.value))}
                      className="bg-slate-950/40 border border-[#D9BC82]/20 text-[#F8F6F1] rounded-xl px-2 py-2.5 text-xs focus:border-[#D9BC82]/50 outline-none"
                    >
                      {Array.from({ length: 31 }).map((_, i) => (
                        <option key={i + 1} value={i + 1} className="bg-[#020617]">{i + 1}</option>
                      ))}
                    </select>
                    <select 
                      value={compMonthB} 
                      onChange={(e) => setCompMonthB(Number(e.target.value))}
                      className="bg-slate-950/40 border border-[#D9BC82]/20 text-[#F8F6F1] rounded-xl px-2 py-2.5 text-xs focus:border-[#D9BC82]/50 outline-none"
                    >
                      {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => (
                        <option key={i + 1} value={i + 1} className="bg-[#020617]">{m}</option>
                      ))}
                    </select>
                    <select 
                      value={compYearB} 
                      onChange={(e) => setCompYearB(Number(e.target.value))}
                      className="bg-slate-950/40 border border-[#D9BC82]/20 text-[#F8F6F1] rounded-xl px-2 py-2.5 text-xs focus:border-[#D9BC82]/50 outline-none"
                    >
                      {Array.from({ length: 21 }).map((_, i) => {
                        const y = 2560 + i;
                        return <option key={y} value={y} className="bg-[#020617]">{y}</option>;
                      })}
                    </select>
                  </div>
                </div>

                {/* Time selector */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">เวลาออกเดินทาง *</label>
                  <input
                    type="time"
                    value={compTimeB}
                    onChange={(e) => setCompTimeB(e.target.value)}
                    className="w-full bg-[#1E293B]/40 border border-[#D9BC82]/20 rounded-xl px-4 py-2 text-[#F8F6F1] font-display text-sm focus:border-[#D9BC82]/50 outline-none transition-all"
                  />
                </div>

                {/* Quick Shortcut */}
                <button
                  type="button"
                  onClick={handleSetOptionBTomorrowMorning}
                  className="w-full py-2 rounded-xl bg-[#D9BC82]/10 border border-[#D9BC82]/20 text-xs font-bold text-[#D9BC82] hover:bg-[#D9BC82]/20 transition-all flex items-center justify-center gap-1.5"
                >
                  ☀️ ตั้งค่าด่วน: พรุ่งนี้เช้า (08:00 น.)
                </button>
              </div>
            </Card>
          </div>

          {/* Calculate Button */}
          <button
            onClick={handleCalculateCompare}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#0A1628] font-bold text-sm tracking-widest uppercase hover:brightness-105 active:scale-[0.99] transition-all shadow-[0_0_24px_rgba(198,169,107,0.2)] flex items-center justify-center gap-2"
          >
            คำนวณเปรียบเทียบฤกษ์เดินทาง ✈️✨
          </button>

          {/* Compare Result Rendering */}
          {compareResult && (
            <div className="space-y-6 animate-fade-in">
              {/* Verdict Glowing Panel */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-[#0A2240] to-[#020617] border-[#D9BC82]/40 shadow-[0_0_30px_rgba(217,188,130,0.15)] p-6 text-center">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#D9BC82]/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#4B6FAE]/10 rounded-full blur-3xl pointer-events-none" />
                
                <span className="text-[#D9BC82] text-[10px] tracking-[0.25em] uppercase font-bold block mb-1">
                  ✦ คำวินิจฉัยฤกษ์เดินทางที่ดีที่สุด ✦
                </span>
                <p className="text-sm text-[#F8F6F1] font-medium leading-relaxed max-w-2xl mx-auto py-2 border-y border-white/5 my-2">
                  {compareResult.verdict}
                </p>
                <p className="text-[10px] text-[#8A8070] italic">
                  *การตรวจวิเคราะห์อ้างอิงจากฐานความมงคลยามอัฏฐกาลร่วมกับกำลังของเจ้าดารายามอย่างสมบูรณ์
                </p>
              </Card>

              {/* Side-by-Side Detail Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option A Result */}
                <Card className="bg-[#0A1628]/30 border-[#4B6FAE]/15 p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] text-[#4B6FAE] font-bold uppercase block">ทางเลือกที่ 1</span>
                        <h4 className="font-display text-lg font-bold text-[#F8F6F1] mt-0.5">{compareResult.a.dateLabel}</h4>
                        <p className="text-xs text-[#94A3B8]">{compareResult.a.timeLabel}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-[#4B6FAE] bg-[#4B6FAE]/10 px-2 py-0.5 rounded-full">{compareResult.a.advice.score.toFixed(1)} /10</span>
                        <div className="flex gap-0.5 mt-1">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <span key={i} className={`text-xs ${i < compareResult.a.ticks ? "text-green-400" : "text-white/10"}`}>★</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-[#4B6FAE]/5 rounded-xl border border-[#4B6FAE]/10">
                      <div className="flex items-center gap-1.5 text-xs text-[#D9BC82] font-semibold mb-1">
                        <span>{PLANET_SYMBOLS[compareResult.a.yamName] || "✦"}</span> ยาม{compareResult.a.yamName} ({PHASE_LABEL[compareResult.a.phase]})
                      </div>
                      <p className="text-xs text-[#D9CDB7] leading-relaxed">{compareResult.a.advice.description}</p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      <span className="text-[10px] text-green-400 font-bold block flex items-start gap-1">
                        <span className="text-xs">✓</span> ควรทำ: {compareResult.a.advice.shouldDo.join(" · ")}
                      </span>
                      <span className="text-[10px] text-red-400 font-bold block flex items-start gap-1">
                        <span className="text-xs">✕</span> ควรเลี่ยง: {compareResult.a.advice.shouldAvoid.join(" · ")}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Option B Result */}
                <Card className="bg-[#0A1628]/30 border-[#D9BC82]/15 p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] text-[#D9BC82] font-bold uppercase block">ทางเลือกที่ 2</span>
                        <h4 className="font-display text-lg font-bold text-[#F8F6F1] mt-0.5">{compareResult.b.dateLabel}</h4>
                        <p className="text-xs text-[#94A3B8]">{compareResult.b.timeLabel}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-[#D9BC82] bg-[#D9BC82]/10 px-2 py-0.5 rounded-full">{compareResult.b.advice.score.toFixed(1)} /10</span>
                        <div className="flex gap-0.5 mt-1">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <span key={i} className={`text-xs ${i < compareResult.b.ticks ? "text-green-400" : "text-white/10"}`}>★</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-[#D9BC82]/5 rounded-xl border border-[#D9BC82]/10">
                      <div className="flex items-center gap-1.5 text-xs text-[#D9BC82] font-semibold mb-1">
                        <span>{PLANET_SYMBOLS[compareResult.b.yamName] || "✦"}</span> ยาม{compareResult.b.yamName} ({PHASE_LABEL[compareResult.b.phase]})
                      </div>
                      <p className="text-xs text-[#D9CDB7] leading-relaxed">{compareResult.b.advice.description}</p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      <span className="text-[10px] text-green-400 font-bold block flex items-start gap-1">
                        <span className="text-xs">✓</span> ควรทำ: {compareResult.b.advice.shouldDo.join(" · ")}
                      </span>
                      <span className="text-[10px] text-red-400 font-bold block flex items-start gap-1">
                        <span className="text-xs">✕</span> ควรเลี่ยง: {compareResult.b.advice.shouldAvoid.join(" · ")}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

function PredCard({ icon, label, text }: { icon: string; label: string; text: string }) {
  return (
    <Card className="flex items-start gap-3 p-4 bg-white/5 border-transparent hover:border-[#D9BC82]/20 transition-colors">
      <span className="text-xl shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-[#D9BC82] text-[10px] font-bold uppercase mb-1 tracking-wider">{label}</p>
        <p className="text-[#D9CDB7] text-sm leading-relaxed">{text}</p>
      </div>
    </Card>
  );
}
