/**
 * phopephum-calculator.test.ts
 * Unit Tests สำหรับ Phopephum — ยามอัฐกาล Engine (ระบบ 16 ยามอัฐกาล)
 *
 * รันด้วย: npx vitest run
 */

import { describe, it, expect } from "vitest";
import {
  calculateHora,
  getCurrentHora,
  getHoraAt,
  findAuspiciousHoras,
  getHoraSummary,
  minutesToTimeStr,
  dateToMinutes,
  getPlanetAtOffset,
  getPlanetChaldeanIndex,
  PLANETS,
  DAY_RULERS,
  DAY_NAMES_THAI,
  PLANET_CHALDEAN_ORDER,
} from "./phopephum-calculator";

// ─────────────────────────────────────────────────────────────────────────────
// Test Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeDate(dateStr: string, timeStr = "09:00"): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

function makeTime(timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

describe("minutesToTimeStr()", () => {
  it("แปลง 0 → 00:00", () => {
    expect(minutesToTimeStr(0)).toBe("00:00");
  });

  it("แปลง 360 → 06:00 (เริ่มยามกลางวัน)", () => {
    expect(minutesToTimeStr(360)).toBe("06:00");
  });

  it("แปลง 1080 → 18:00 (เริ่มยามกลางคืน)", () => {
    expect(minutesToTimeStr(1080)).toBe("18:00");
  });

  it("แปลง 1439 → 23:59", () => {
    expect(minutesToTimeStr(1439)).toBe("23:59");
  });

  it("wrap เกิน 1440 → กลับมาถูกต้อง", () => {
    expect(minutesToTimeStr(1440)).toBe("00:00");
    expect(minutesToTimeStr(1500)).toBe("01:00");
  });
});

describe("dateToMinutes()", () => {
  it("06:00 → 360", () => {
    const d = makeTime("06:00");
    expect(dateToMinutes(d)).toBe(360);
  });

  it("12:00 → 720", () => {
    const d = makeTime("12:00");
    expect(dateToMinutes(d)).toBe(720);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Backwards Compatibility Helpers
// ─────────────────────────────────────────────────────────────────────────────

describe("Backwards compatibility helpers", () => {
  it("getPlanetChaldeanIndex()", () => {
    expect(getPlanetChaldeanIndex("saturn")).toBe(0);
    expect(getPlanetChaldeanIndex("moon")).toBe(6);
  });

  it("getPlanetAtOffset()", () => {
    expect(getPlanetAtOffset(0, 0).id).toBe("saturn");
    expect(getPlanetAtOffset(0, 7).id).toBe("saturn");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Core calculateHora() Structure
// ─────────────────────────────────────────────────────────────────────────────

describe("calculateHora() — โครงสร้างยามอัฐกาลใหม่", () => {
  it("คืน 16 ยามใหญ่ต่อวัน (8 กลางวัน + 8 กลางคืน)", () => {
    const date = makeDate("2026-05-25"); // วันจันทร์
    const result = calculateHora({ date });
    expect(result.majorSlots).toHaveLength(16);
  });

  it("แต่ละยามใหญ่มี 3 ยามย่อย (ยามต้น, ยามกลาง, ยามปลาย)", () => {
    const date = makeDate("2026-05-25");
    const result = calculateHora({ date });
    result.majorSlots.forEach((major) => {
      expect(major.subSlots).toHaveLength(3);
      expect(major.subSlots[0].name).toBe("ยามต้น");
      expect(major.subSlots[1].name).toBe("ยามกลาง");
      expect(major.subSlots[2].name).toBe("ยามปลาย");
    });
  });

  it("แบ่งเป็นกลางวัน 8 ยาม และกลางคืน 8 ยาม", () => {
    const date = makeDate("2026-05-25");
    const result = calculateHora({ date });
    const day = result.majorSlots.filter((m) => m.period === "day");
    const night = result.majorSlots.filter((m) => m.period === "night");
    expect(day).toHaveLength(8);
    expect(night).toHaveLength(8);
  });

  it("ยามกลางวันเริ่ม 06:00 และสิ้นสุด 18:00", () => {
    const date = makeDate("2026-05-25");
    const result = calculateHora({ date });
    expect(result.majorSlots[0].startTime).toBe("06:00");
    expect(result.majorSlots[7].endTime).toBe("18:00");
  });

  it("ยามกลางคืนเริ่ม 18:00 และสิ้นสุด 06:00", () => {
    const date = makeDate("2026-05-25");
    const result = calculateHora({ date });
    expect(result.majorSlots[8].startTime).toBe("18:00");
    expect(result.majorSlots[15].endTime).toBe("06:00");
  });

  it("ยามย่อยแต่ละยาม = 30 นาที", () => {
    const date = makeDate("2026-05-25");
    const result = calculateHora({ date });
    result.majorSlots.forEach((major) => {
      major.subSlots.forEach((sub) => {
        const duration = sub.endMinute - sub.startMinute;
        expect(duration).toBe(30);
      });
    });
  });

  it("ยามซอยราหูค้นทรัพย์มี 9 ฤกษ์ ฤกษ์ละ 10 นาที", () => {
    const date = makeDate("2026-05-25");
    const result = calculateHora({ date });
    result.majorSlots.forEach((major) => {
      expect(major.nineSegments).toHaveLength(9);
      major.nineSegments.forEach((seg) => {
        expect(seg.endMinute - seg.startMinute).toBe(10);
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. ทดสอบดาวครองยามตามวัน
// ─────────────────────────────────────────────────────────────────────────────

describe("ดาวครองยามและลำดับยามอัฐกาล", () => {
  it("วันจันทร์กลางวัน: ยาม 1=จันทร์(จันเทา), ยาม 2=เสาร์(เสารี), ยาม 3=พฤหัส(ครู)", () => {
    const date = makeDate("2026-05-25"); // วันจันทร์
    const result = calculateHora({ date });
    expect(result.dayRuler.id).toBe("moon");
    
    // ตรวจสอบดาวครองยามกลางวันจันทร์
    expect(result.majorSlots[0].starName).toBe("จันเทา"); // ยาม 1
    expect(result.majorSlots[1].starName).toBe("เสารี");  // ยาม 2
    expect(result.majorSlots[2].starName).toBe("ครู");    // ยาม 3
  });

  it("วันพุธกลางคืน: ยาม 1=พุธ(พุทโธ), ยาม 2=อาทิตย์(ระวิ), ยาม 3=พฤหัส(ชีโว), ยาม 4=จันทร์(คะศิ)", () => {
    const date = makeDate("2026-05-27"); // วันพุธ
    const result = calculateHora({ date });
    
    // ตรวจสอบยามกลางคืนพุธ (เริ่มที่ index 8)
    expect(result.majorSlots[8].starName).toBe("พุทโธ");  // คืนยาม 1
    expect(result.majorSlots[9].starName).toBe("ระวิ");   // คืนยาม 2
    expect(result.majorSlots[10].starName).toBe("ชีโว");  // คืนยาม 3
    expect(result.majorSlots[11].starName).toBe("คะศิ");   // คืนยาม 4
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. currentHora & ยามซอย 9 ฤกษ์
// ─────────────────────────────────────────────────────────────────────────────

describe("currentHora การจับคู่ช่วงเวลาและยามซอย", () => {
  it("วันพุธ 23:22 น. (ตกยาม 4 กลางคืน, ฤกษ์กัลยาณ์)", () => {
    const date = makeDate("2026-05-27"); // วันพุธ
    const currentTime = makeDate("2026-05-27", "23:22");
    const result = calculateHora({ date, currentTime });
    
    const info = result.currentHora;
    expect(info).toBeDefined();
    expect(info?.yamNumber).toBe(4);
    expect(info?.period).toBe("night");
    expect(info?.starName).toBe("คะศิ");
    
    // 22:30 - 23:22 คือผ่านไป 52 นาที
    // 30-60 นาที คือ ยามกลาง
    expect(info?.activeSubYam.name).toBe("ยามกลาง");
    
    // 52 นาที ตกฤกษ์ที่ 6 (นาทีที่ 50-60) คือ กัลยาณ์
    expect(info?.activeNineSegment.name).toBe("กัลยาณ์");
  });

  it("วันพุธ 23:13 น. (ตกยาม 4 กลางคืน, ฤกษ์กาลทัณฑ์)", () => {
    const date = makeDate("2026-05-27"); // วันพุธ
    const currentTime = makeDate("2026-05-27", "23:13");
    const result = calculateHora({ date, currentTime });
    
    const info = result.currentHora;
    expect(info).toBeDefined();
    expect(info?.yamNumber).toBe(4);
    
    // 22:30 - 23:13 คือผ่านไป 43 นาที
    // 43 นาที ตกฤกษ์ที่ 5 (นาทีที่ 40-50) คือ กาลทัณฑ์ (ตรงกับค่า 23.22 ใน Google Sheet แบบทศนิยม)
    expect(info?.activeNineSegment.name).toBe("กาลทัณฑ์");
    expect(info?.activeNineSegment.description).toContain("ผู้คุมนักโทษ");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Auspicious Horas & Summary
// ─────────────────────────────────────────────────────────────────────────────

describe("findAuspiciousHoras() และ getHoraSummary()", () => {
  const date = makeDate("2026-05-25"); // จันทร์

  it("findAuspiciousHoras ค้นหายามมงคลได้ถูกต้อง", () => {
    const slots = findAuspiciousHoras(date, ["jupiter"]);
    expect(slots.length).toBeGreaterThan(0);
  });

  it("getHoraSummary คืนค่า 48 ยามย่อยต่อวัน (16 ยามใหญ่ * 3 ยามย่อย)", () => {
    const summary = getHoraSummary(date);
    expect(summary).toHaveLength(48);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Edge Cases
// ─────────────────────────────────────────────────────────────────────────────

describe("Edge cases", () => {
  it("เวลาเที่ยงคืน (00:00) และข้ามวัน ทำงานได้ปกติ", () => {
    const date = makeDate("2026-05-25");
    const midnight = makeDate("2026-05-25", "00:00");
    const result = calculateHora({ date, currentTime: midnight });
    expect(result.currentHora).toBeDefined();
  });

  it("เวลาคาบเกี่ยว เช่น 05:59 และ 06:00 ทำงานได้ปกติ", () => {
    const date = makeDate("2026-05-25");
    const t1 = makeDate("2026-05-25", "05:59");
    const t2 = makeDate("2026-05-25", "06:00");
    
    expect(calculateHora({ date, currentTime: t1 }).currentHora).toBeDefined();
    expect(calculateHora({ date, currentTime: t2 }).currentHora).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. การเปลี่ยนวันทางโหราศาสตร์ไทย (ตัดวันใหม่ที่ 06:00 น.)
// ─────────────────────────────────────────────────────────────────────────────

describe("การนับวันใหม่และเช้ามืดตามหลักโหราศาสตร์ไทย (ตัดที่ 06:00 น.)", () => {
  it("เวลา 02:30 น. ของวันศุกร์ที่ 29 พฤษภาคม 2026 ให้นับเป็นวันพฤหัสบดีที่ 28", () => {
    // 29 พฤษภาคม 2026 เป็นวันศุกร์สากล
    const date = makeDate("2026-05-29", "02:30");
    const currentTime = makeDate("2026-05-29", "02:30");
    const result = calculateHora({ date, currentTime });

    // วันที่และข้อมูลวันในสัปดาห์ต้องเปลี่ยนเป็นวันพฤหัสบดี (4)
    expect(result.dayOfWeek).toBe(4); // 4 = พฤหัสบดี
    expect(result.dayNameThai).toBe("พฤหัสบดี");
    
    // ดึงดาวของวันพฤหัสบดีมาใช้ (พฤหัส = jupiter)
    expect(result.dayRuler.id).toBe("jupiter");

    // ตรวจสอบว่าตรงกับยามกลางคืน
    expect(result.currentHora).toBeDefined();
    expect(result.currentHora?.period).toBe("night");
    
    // วันที่ที่เก็บในผลลัพธ์ต้องถอยหลัง 1 วัน เป็นวันที่ 28 พฤษภาคม 2026
    const resDate = result.date;
    expect(resDate.getDate()).toBe(28);
    expect(resDate.getMonth()).toBe(4); // 4 = พฤษภาคม (0-based)
  });

  it("เวลา 06:00 น. ของวันศุกร์ที่ 29 พฤษภาคม 2026 ให้นับเป็นวันศุกร์ที่ 29 ตามปกติ", () => {
    const date = makeDate("2026-05-29", "06:00");
    const currentTime = makeDate("2026-05-29", "06:00");
    const result = calculateHora({ date, currentTime });

    // วันที่และข้อมูลวันในสัปดาห์ต้องเป็นวันศุกร์ (5)
    expect(result.dayOfWeek).toBe(5); // 5 = ศุกร์
    expect(result.dayNameThai).toBe("ศุกร์");
    expect(result.dayRuler.id).toBe("venus");

    // ยามแรก 06:00 คือยามแรกของกลางวัน (ยามที่ 1)
    expect(result.currentHora).toBeDefined();
    expect(result.currentHora?.yamNumber).toBe(1);
    expect(result.currentHora?.period).toBe("day");

    // วันที่ในผลลัพธ์ยังเป็นวันที่ 29 ตามเดิม
    const resDate = result.date;
    expect(resDate.getDate()).toBe(29);
  });
});
