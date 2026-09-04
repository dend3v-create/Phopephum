/**
 * calendarIntelligence.server.ts — STEP 5.1 Personal Auspicious Calendar Intelligence
 *
 * Sequence:
 * Target Date (+ User Profile Context)
 *   ↓
 * Daily Lunar & Astrological Energy (getThaiBaseNumbers, calculateMoonPhase, calculateRahu)
 *   ↓
 * Auspicious Time Calculation (calculateAuspiciousTime — Deterministic 100%)
 *   ↓
 * Golden Window & Timeline Extraction (ช่วงพลังดี 🟢 / ช่วงระวัง 🟡 / ⭐ GOLDEN WINDOW)
 *   ↓
 * 4 Life Domains Alignment (Career, Finance, Relationship, Wellness)
 *   ↓
 * Personal Context Injection (Taksa Transit: ศรี, เดช, มนตรี vs กาลกิณี)
 *   ↓
 * Calendar Day Intelligence
 *
 * Hard Rules:
 * ❌ ไม่สร้าง Astrology Engine ใหม่
 * ❌ ไม่ Duplicate calculateAuspiciousTime
 * ❌ ไม่ให้ AI คำนวณฤกษ์
 * ❌ ไม่เปิดเผยชื่อ ยาม/ราหู/ทักษา ใน L1
 */

import {
  calculateAuspiciousTime,
  calculateMoonPhase,
  getThaiBaseNumbers,
  calculateRahu,
  calculatePhopephum,
} from "@phopephum/engine";
import type {
  CalendarDayIntelligence,
  CalendarDomainScore,
  CalendarEnergyLevel,
  CalendarMonthDayOverview,
  CalendarTimeWindow,
} from "@phopephum/types";

export interface CalendarProfileContext {
  birthDate?: string | null;
  birthTime?: string | null;
  birthPlace?: string | null;
  displayName?: string | null;
}

const THAI_DAYS = [
  "วันอาทิตย์",
  "วันจันทร์",
  "วันอังคาร",
  "วันพุธ",
  "วันพฤหัสบดี",
  "วันศุกร์",
  "วันเสาร์",
];

// 8 ช่วงเวลามาตรฐานตลอดวันสำหรับกิจกรรมชีวิตจริง (06:00 - 18:00)
const STANDARD_DAY_WINDOWS = [
  { id: "w-1", start: "06:00", end: "07:30", label: "ช่วงรุ่งอรุณ" },
  { id: "w-2", start: "07:30", end: "09:00", label: "ช่วงเช้าตรู่" },
  { id: "w-3", start: "09:00", end: "10:30", label: "ช่วงสายตอนต้น" },
  { id: "w-4", start: "10:30", end: "12:00", label: "ช่วงสายปลายวัน" },
  { id: "w-5", start: "12:00", end: "13:30", label: "ช่วงพักเที่ยง" },
  { id: "w-6", start: "13:30", end: "15:00", label: "ช่วงบ่ายต้น" },
  { id: "w-7", start: "15:00", end: "16:30", label: "ช่วงบ่ายแก่" },
  { id: "w-8", start: "16:30", end: "18:00", label: "ช่วงเย็นก่อนค่ำ" },
];

function parseTimeToMinutes(t: string): number {
  const parts = t.split(":");
  return parseInt(parts[0] || "0", 10) * 60 + parseInt(parts[1] || "0", 10);
}

/**
 * คำนวณ Calendar Day Intelligence สำหรับวันที่กำหนด
 */
export async function calculateDayIntelligence(
  dateStr: string, // "YYYY-MM-DD"
  profile?: CalendarProfileContext | null
): Promise<CalendarDayIntelligence> {
  const targetDate = new Date(`${dateStr}T12:00:00+07:00`);
  const dayOfWeekIdx = targetDate.getDay();
  const dayOfWeekThai = THAI_DAYS[dayOfWeekIdx] || "วันนี้";

  // 1. Lunar info
  const lunarBase = getThaiBaseNumbers(dateStr);
  const moonPhase = calculateMoonPhase(targetDate);
  const lunarDateStr = lunarBase?.thaiDateText || lunarBase?.moonPhase || moonPhase.moonPhase;

  // 2. Engine Auspicious Times
  const auspiciousResult = calculateAuspiciousTime(targetDate);
  const auspiciousSlots = auspiciousResult.auspiciousSlots || [];

  // 3. Rahu check for the day
  let rahuPeriod = { start: -1, end: -1 };
  try {
    const rahu = calculateRahu(targetDate);
    if (rahu && rahu.main_block) {
      rahuPeriod = {
        start: parseTimeToMinutes(rahu.main_block.start_time),
        end: parseTimeToMinutes(rahu.main_block.end_time),
      };
    }
  } catch (err) {
    // Graceful fallback
  }

  // 4. Personal Context (Taksa & Birth Data if available)
  let personalContext: {
    personalNote?: string;
    favorableHours: number[];
    cautiousHours: number[];
  } = { favorableHours: [], cautiousHours: [] };

  if (profile?.birthDate) {
    try {
      const phResult = await calculatePhopephum(
        {
          birthDate: profile.birthDate,
          birthTime: profile.birthTime || "12:00",
          birthPlace: profile.birthPlace || "กรุงเทพมหานคร",
        },
        targetDate
      );

      const majorPlanet = phResult.atthakarn?.majorPlanet;
      const bhop = phResult.taksaTransit?.map?.[majorPlanet] || "";

      if (bhop === "ศรี" || bhop === "เดช" || bhop === "มนตรี") {
        personalContext.personalNote = `วันนี้ดาวส่งเสริมส่วนตัวของคุณทำงานโดดเด่น ส่งผลให้การเจรจาและการตัดสินใจมีความราบรื่นเป็นพิเศษ`;
      } else if (bhop === "กาลกิณี") {
        personalContext.personalNote = `วันนี้ควรเน้นความรอบคอบในการตรวจทานเอกสารและหลีกเลี่ยงการใช้อารมณ์ตัดสินปัญหา`;
      } else {
        personalContext.personalNote = `จังหวะพลังงานส่วนบุคคลมีความสมดุล ดำเนินงานตามแผนงานปกติได้อย่างมั่นคง`;
      }
    } catch (err) {
      personalContext.personalNote = `จังหวะพลังงานส่วนบุคคลมีความสมดุล ดำเนินงานตามแผนงานปกติได้อย่างราบรื่น`;
    }
  } else {
    personalContext.personalNote = `คำนวณตามจังหวะพลังงานสากลประจำวัน (ตั้งค่าวันเกิดในโปรไฟล์เพื่อรับคำแนะนำเฉพาะตัวบุคคล)`;
  }

  // 5. Evaluate Timeline Windows
  const timelineWindows: CalendarTimeWindow[] = STANDARD_DAY_WINDOWS.map((win, idx) => {
    const winStartMin = parseTimeToMinutes(win.start);
    const winEndMin = parseTimeToMinutes(win.end);

    // ตรวจสอบความสอดคล้องกับ auspiciousSlots จาก Engine
    let bestSlotScore = 55;
    let suitableFor: string[] = ["ดำเนินงานตามแผน", "ทำงานประจำ"];
    let cautions: string[] = [];

    for (const slot of auspiciousSlots) {
      const parts = slot.timeRange.includes("–") ? slot.timeRange.split("–") : slot.timeRange.split("-");
      const sStartMin = parseTimeToMinutes(parts[0]?.trim() || "00:00");
      const sEndMin = parseTimeToMinutes(parts[1]?.trim() || "23:59");

      // Overlap check
      if (winStartMin < sEndMin && winEndMin > sStartMin) {
        if (slot.level === "ดีมาก") {
          bestSlotScore = Math.max(bestSlotScore, 92);
          suitableFor = slot.suitableFor || ["เปิดตัว", "ทำสัญญา", "เจรจาผลประโยชน์"];
        } else if (slot.level === "ดี") {
          bestSlotScore = Math.max(bestSlotScore, 82);
          suitableFor = slot.suitableFor || ["เจรจา", "เริ่มงานสำคัญ", "นัดหมาย"];
        } else if (slot.level === "หลีกเลี่ยง") {
          bestSlotScore = Math.min(bestSlotScore, 35);
          cautions.push("ควรตรวจสอบเอกสารและใจเย็นเป็นพิเศษ");
        }
      }
    }

    // ตรวจสอบ Rahu overlap
    if (rahuPeriod.start >= 0) {
      if (winStartMin < rahuPeriod.end && winEndMin > rahuPeriod.start) {
        bestSlotScore = Math.max(20, bestSlotScore - 15);
        cautions.push("มีตัวแปรรบกวนความราบรื่น ควรชะลอการตัดสินใจฉับพลัน");
      }
    }

    // วันพระ
    if (moonPhase.isWanPhra) {
      cautions.push("วันพระ: เหมาะกับการสร้างกุศลและดำเนินงานด้วยความสำรวม");
    }

    // กำหนด Energy Level จากคะแนน
    let level: CalendarEnergyLevel = "neutral";
    if (bestSlotScore >= 85) level = "golden";
    else if (bestSlotScore >= 70) level = "favorable";
    else if (bestSlotScore >= 50) level = "neutral";
    else if (bestSlotScore >= 35) level = "caution";
    else level = "avoid";

    // คำแนะนำภาษาชีวิตจริง (Plain Thai)
    let plainAdvice = "ดำเนินงานด้วยความราบรื่นตามปกติ";
    if (level === "golden") {
      plainAdvice = "ช่วงเวลาทองคำสูงสุดของวัน เหมาะอย่างยิ่งกับการตัดสินใจสำคัญ เจรจา หรือเซ็นสัญญา";
    } else if (level === "favorable") {
      plainAdvice = "พลังงานราบรื่นและคล่องตัว เหมาะกับการนัดหมาย ประชุมทีม หรือส่งมอบงาน";
    } else if (level === "caution" || level === "avoid") {
      plainAdvice = "ควรเน้นการตรวจสอบความเรียบร้อย ไม่ควรเร่งรัดหรือรีบสรุปผลประโยชน์";
    }

    return {
      id: win.id,
      startTime: win.start,
      endTime: win.end,
      level,
      score: bestSlotScore,
      title: `${win.label} (${win.start}–${win.end} น.)`,
      suitableFor,
      cautions,
      plainAdvice,
      isGoldenWindow: false,
    };
  });

  // 6. Find Golden Window (Winner Slot)
  let goldenWindow: CalendarTimeWindow | null = null;
  const sortedByScore = [...timelineWindows].sort((a, b) => b.score - a.score);
  if (sortedByScore.length > 0 && sortedByScore[0].score >= 75) {
    const winner = sortedByScore[0];
    winner.isGoldenWindow = true;
    goldenWindow = winner;
  }

  // 7. Life Domains Scores (Career, Finance, Relationship, Wellness)
  const avgScore = Math.round(
    timelineWindows.reduce((acc, cur) => acc + cur.score, 0) / timelineWindows.length
  );

  const domainScores: CalendarDomainScore[] = [
    {
      domain: "career",
      label: "การงาน & ธุรกิจ",
      score: Math.min(100, Math.max(30, goldenWindow ? goldenWindow.score : avgScore + 5)),
      verdict: goldenWindow ? "มีจังหวะทองคำในการเจรจาหรือเริ่มงาน" : "ดำเนินงานตามแผนงานปกติ",
      icon: "💼",
    },
    {
      domain: "finance",
      label: "การเงิน & โชคลาภ",
      score: Math.min(100, Math.max(25, rahuPeriod.start >= 0 ? avgScore - 5 : avgScore + 8)),
      verdict: rahuPeriod.start >= 0 ? "ควรตรวจสอบตัวเลขก่อนโอนเงินหรือลงทุน" : "การเงินหมุนเวียนคล่องตัว",
      icon: "💰",
    },
    {
      domain: "relationship",
      label: "ความสัมพันธ์ & มิตรภาพ",
      score: Math.min(100, Math.max(30, moonPhase.isWaxing ? avgScore + 6 : avgScore - 2)),
      verdict: moonPhase.isWaxing ? "การพูดคุยประสานงานให้ผลเชิงบวก" : "เน้นการรับฟังและสร้างความเข้าใจ",
      icon: "🤝",
    },
    {
      domain: "wellness",
      label: "สุขภาพ & ความสมดุล",
      score: Math.min(100, Math.max(30, moonPhase.isWanPhra ? 88 : avgScore)),
      verdict: moonPhase.isWanPhra ? "เหมาะกับการพักผ่อน จิตใจสงบมีสมาธิ" : "รักษาสมดุลกายใจได้เป็นอย่างดี",
      icon: "🌿",
    },
  ];

  // 8. Daily Theme & Summary (Plain Thai, No Jargon)
  let dailyTheme = "วันแห่งการลงมือทำอย่างราบรื่นตามจังหวะเวลา";
  if (goldenWindow && goldenWindow.score >= 90) {
    dailyTheme = "วันแห่งการเปิดโอกาสทองคำและความสำเร็จใหญ่";
  } else if (moonPhase.isWanPhra) {
    dailyTheme = "วันแห่งสติ ปัญญา และความสงบสมดุล";
  } else if (avgScore >= 75) {
    dailyTheme = "วันแห่งความก้าวหน้าและการประสานงานที่คล่องตัว";
  } else if (avgScore < 50) {
    dailyTheme = "วันแห่งการตรวจสอบความรอบคอบและจัดระเบียบแผนงาน";
  }

  let dailySummary = `${dayOfWeekThai}นี้ (${lunarDateStr}) พลังงานโดยรวมอยู่ในเกณฑ์${
    avgScore >= 75 ? "ส่งเสริมอย่างดีเยี่ยม" : avgScore >= 60 ? "ราบรื่นคล่องตัว" : "ปานกลาง ควรเน้นความรอบคอบ"
  }`;

  if (goldenWindow) {
    dailySummary += ` โดยมีช่วงเวลาทองคำสูงสุดอยู่ที่ ${goldenWindow.startTime}–${goldenWindow.endTime} น. เหมาะแก่การ${goldenWindow.suitableFor.slice(0, 2).join(" หรือ ")}`;
  }

  return {
    date: dateStr,
    lunarDayInfo: {
      lunarDateStr,
      moonPhase: moonPhase.moonPhase || (moonPhase.isWaxing ? "ข้างขึ้น" : "ข้างแรม"),
      isWanPhra: moonPhase.isWanPhra,
      dayOfWeekThai,
    },
    overallScore: avgScore,
    dailyTheme,
    dailySummary,
    goldenWindow,
    timelineWindows,
    domainScores,
    hasPersonalContext: Boolean(profile?.birthDate),
    personalNote: personalContext.personalNote,
  };
}

/**
 * คำนวณภาพรวมรายเดือนสำหรับ Month Grid View
 */
export function calculateMonthOverview(
  year: number,
  month: number,
  profile?: CalendarProfileContext | null,
  appointments?: Array<{ event_date: string }>
): CalendarMonthDayOverview[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const appointmentCounts: Record<string, number> = {};

  if (appointments) {
    for (const app of appointments) {
      if (app.event_date) {
        appointmentCounts[app.event_date] = (appointmentCounts[app.event_date] || 0) + 1;
      }
    }
  }

  const days: CalendarMonthDayOverview[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const targetDate = new Date(`${dateStr}T12:00:00+07:00`);

    // Auspicious time check
    const auspicious = calculateAuspiciousTime(targetDate);
    const hasGolden = (auspicious.auspiciousSlots || []).some(
      (s) => s.level === "ดีมาก" || s.level === "ดี"
    );

    // Moon phase check
    const moon = calculateMoonPhase(targetDate);

    let dominantEnergy: CalendarEnergyLevel = "neutral";
    let score = 60;

    if (hasGolden) {
      dominantEnergy = "golden";
      score = 85;
    } else if (moon.isWanPhra) {
      dominantEnergy = "favorable";
      score = 75;
    }

    days.push({
      date: dateStr,
      day: d,
      overallScore: score,
      hasGoldenWindow: hasGolden,
      isWanPhra: moon.isWanPhra,
      dominantEnergy,
      appointmentCount: appointmentCounts[dateStr] || 0,
    });
  }

  return days;
}
