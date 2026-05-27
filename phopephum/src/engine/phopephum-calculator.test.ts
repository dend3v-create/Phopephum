/**
 * hora-calculator.test.ts
 * Unit Tests สำหรับ Phopephum — ยามอัฐกาล Engine
 *
 * รันด้วย: npx vitest run  หรือ  npx jest
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

/** สร้าง Date จาก "YYYY-MM-DD HH:MM" */
function makeDate(dateStr: string, timeStr = "09:00"): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

/** สร้าง Date เฉพาะเวลา (วันนี้) */
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

  it("แปลง 720 → 12:00 (เที่ยง)", () => {
    expect(minutesToTimeStr(720)).toBe("12:00");
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

  it("แปลง 22.5 นาที (ยามย่อย) → ถูกต้อง", () => {
    // 360 + 22.5 = 382.5 → 06:22 (floor)
    expect(minutesToTimeStr(382.5)).toBe("06:22");
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

  it("23:59 → 1439", () => {
    const d = makeTime("23:59");
    expect(dateToMinutes(d)).toBe(1439);
  });
});

describe("getPlanetChaldeanIndex()", () => {
  it("saturn = 0 (ตัวแรกของ Chaldean order)", () => {
    expect(getPlanetChaldeanIndex("saturn")).toBe(0);
  });

  it("moon = 6 (ตัวสุดท้าย)", () => {
    expect(getPlanetChaldeanIndex("moon")).toBe(6);
  });

  it("sun = 3", () => {
    expect(getPlanetChaldeanIndex("sun")).toBe(3);
  });
});

describe("getPlanetAtOffset()", () => {
  it("offset 0 จาก saturn → saturn", () => {
    expect(getPlanetAtOffset(0, 0).id).toBe("saturn");
  });

  it("offset 7 วนกลับมาเป็น planet เดิม", () => {
    expect(getPlanetAtOffset(0, 7).id).toBe("saturn");
    expect(getPlanetAtOffset(3, 7).id).toBe("sun");
  });

  it("offset 1 จาก sun → venus (ตาม Chaldean)", () => {
    const sunIdx = getPlanetChaldeanIndex("sun"); // 3
    const next = getPlanetAtOffset(sunIdx, 1);
    expect(next.id).toBe("venus"); // index 4
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Day Rulers
// ─────────────────────────────────────────────────────────────────────────────

describe("Day Rulers", () => {
  const cases: [number, string, string][] = [
    [0, "sun", "อาทิตย์"],
    [1, "moon", "จันทร์"],
    [2, "mars", "อังคาร"],
    [3, "mercury", "พุธ"],
    [4, "jupiter", "พฤหัส"],
    [5, "venus", "ศุกร์"],
    [6, "saturn", "เสาร์"],
  ];

  cases.forEach(([dayNum, planetId, dayName]) => {
    it(`วัน ${dayName} (${dayNum}) เจ้าของ = ${planetId}`, () => {
      expect(DAY_RULERS[dayNum]).toBe(planetId);
      expect(DAY_NAMES_THAI[dayNum]).toBe(dayName);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Core calculateHora()
// ─────────────────────────────────────────────────────────────────────────────

describe("calculateHora() — โครงสร้างพื้นฐาน", () => {
  it("คืน 8 ยามใหญ่เสมอ", () => {
    const date = makeDate("2026-05-25"); // วันจันทร์
    const result = calculateHora({ date });
    expect(result.majorSlots).toHaveLength(8);
  });

  it("แต่ละยามใหญ่มี 8 ยามย่อย", () => {
    const date = makeDate("2026-05-25");
    const result = calculateHora({ date });
    result.majorSlots.forEach((major) => {
      expect(major.subSlots).toHaveLength(8);
    });
  });

  it("ยามกลางวัน = 4 ยาม, กลางคืน = 4 ยาม", () => {
    const date = makeDate("2026-05-25");
    const result = calculateHora({ date });
    const day = result.majorSlots.filter((m) => m.period === "day");
    const night = result.majorSlots.filter((m) => m.period === "night");
    expect(day).toHaveLength(4);
    expect(night).toHaveLength(4);
  });

  it("ยามกลางวันเริ่ม 06:00", () => {
    const date = makeDate("2026-05-25");
    const result = calculateHora({ date });
    expect(result.majorSlots[0].startTime).toBe("06:00");
  });

  it("ยามกลางวันสิ้นสุด 18:00", () => {
    const date = makeDate("2026-05-25");
    const result = calculateHora({ date });
    expect(result.majorSlots[3].endTime).toBe("18:00");
  });

  it("ยามกลางคืนเริ่ม 18:00", () => {
    const date = makeDate("2026-05-25");
    const result = calculateHora({ date });
    expect(result.majorSlots[4].startTime).toBe("18:00");
  });

  it("ยามย่อยแต่ละยาม = 22.5 นาที", () => {
    const date = makeDate("2026-05-25");
    const result = calculateHora({ date });
    result.majorSlots.forEach((major) => {
      major.subSlots.forEach((sub) => {
        const duration = sub.endMinute - sub.startMinute;
        expect(duration).toBe(22.5);
      });
    });
  });

  it("ยามย่อยต่อเนื่องไม่มีช่องว่าง", () => {
    const date = makeDate("2026-05-25");
    const result = calculateHora({ date });
    const allSubs = result.majorSlots.flatMap((m) => m.subSlots);
    for (let i = 1; i < allSubs.length; i++) {
      expect(allSubs[i].startMinute).toBeCloseTo(allSubs[i - 1].endMinute, 5);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. วันจันทร์ (2026-05-25) — ทดสอบ Ruler ที่ถูกต้อง
// ─────────────────────────────────────────────────────────────────────────────

describe("calculateHora() — วันจันทร์ 2026-05-25", () => {
  const date = makeDate("2026-05-25"); // จันทร์ = dayOfWeek 1

  it("dayOfWeek = 1 (จันทร์)", () => {
    const result = calculateHora({ date });
    expect(result.dayOfWeek).toBe(1);
    expect(result.dayNameThai).toBe("จันทร์");
  });

  it("ดาวเจ้าของวัน = จันทร์", () => {
    const result = calculateHora({ date });
    expect(result.dayRuler.id).toBe("moon");
  });

  it("ยามใหญ่ที่ 1 (กลางวัน) เจ้าของ = จันทร์", () => {
    const result = calculateHora({ date });
    expect(result.majorSlots[0].rulerPlanet.id).toBe("moon");
  });

  it("ยามย่อยที่ 1 ของยามใหญ่ที่ 1 เจ้าของ = จันทร์", () => {
    const result = calculateHora({ date });
    expect(result.majorSlots[0].subSlots[0].planet.id).toBe("moon");
  });

  it("ยามย่อยวนตาม Chaldean order อย่างถูกต้อง", () => {
    const result = calculateHora({ date });
    // จันทร์ = index 6 ใน Chaldean
    // ยามย่อยที่ 1: moon (6), 2: saturn (0), 3: jupiter (1), 4: mars (2)
    const moonIdx = getPlanetChaldeanIndex("moon");
    const subs = result.majorSlots[0].subSlots;
    expect(subs[0].planet.id).toBe(
      PLANET_CHALDEAN_ORDER[(moonIdx + 0) % 7]
    );
    expect(subs[1].planet.id).toBe(
      PLANET_CHALDEAN_ORDER[(moonIdx + 1) % 7]
    );
    expect(subs[2].planet.id).toBe(
      PLANET_CHALDEAN_ORDER[(moonIdx + 2) % 7]
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. วันพฤหัส — ทดสอบเพิ่มเติม
// ─────────────────────────────────────────────────────────────────────────────

describe("calculateHora() — วันพฤหัส (2026-05-28)", () => {
  const date = makeDate("2026-05-28"); // พฤหัส = dayOfWeek 4

  it("dayOfWeek = 4, dayRuler = jupiter", () => {
    const result = calculateHora({ date });
    expect(result.dayOfWeek).toBe(4);
    expect(result.dayRuler.id).toBe("jupiter");
  });

  it("ยามใหญ่ที่ 1 เจ้าของ = jupiter", () => {
    const result = calculateHora({ date });
    expect(result.majorSlots[0].rulerPlanet.id).toBe("jupiter");
  });

  it("ยามใหญ่ที่ 2 เจ้าของเดิน +8 slots จาก jupiter", () => {
    // +8 slots = +8 ตาม Chaldean → วนซ้ำ: 8 % 7 = 1 offset
    // jupiter = index 1, +8 = index (1+8)%7 = 2 = mars
    const result = calculateHora({ date });
    expect(result.majorSlots[1].rulerPlanet.id).toBe("mars");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. currentHora — หายามปัจจุบัน
// ─────────────────────────────────────────────────────────────────────────────

describe("currentHora", () => {
  it("หายามปัจจุบันเมื่อส่ง currentTime", () => {
    const date = makeDate("2026-05-25");
    const currentTime = makeDate("2026-05-25", "09:00");
    const result = calculateHora({ date, currentTime });
    expect(result.currentHora).toBeDefined();
  });

  it("เวลา 09:00 อยู่ในยามใหญ่ที่ 2 (06:00–09:00 = ยาม1, 09:00–12:00 = ยาม2)", () => {
    const date = makeDate("2026-05-25");
    const currentTime = makeDate("2026-05-25", "09:00");
    const result = calculateHora({ date, currentTime });
    // ยามใหญ่ที่ 2 เริ่ม 09:00
    expect(result.currentHora?.majorIndex).toBe(2);
  });

  it("เวลา 06:30 อยู่ในยามใหญ่ที่ 1", () => {
    const date = makeDate("2026-05-25");
    const currentTime = makeDate("2026-05-25", "06:30");
    const result = calculateHora({ date, currentTime });
    expect(result.currentHora?.majorIndex).toBe(1);
  });

  it("เวลา 21:45 อยู่ในยามกลางคืน (ยามใหญ่ 6–8)", () => {
    const date = makeDate("2026-05-25");
    const currentTime = makeDate("2026-05-25", "21:45");
    const result = calculateHora({ date, currentTime });
    const majorIdx = result.currentHora?.majorIndex ?? 0;
    expect(majorIdx).toBeGreaterThanOrEqual(5);
    expect(majorIdx).toBeLessThanOrEqual(8);
  });

  it("minutesRemaining > 0 และ <= 22.5", () => {
    const date = makeDate("2026-05-25");
    const currentTime = makeDate("2026-05-25", "07:00");
    const result = calculateHora({ date, currentTime });
    const remaining = result.currentHora?.minutesRemaining ?? 0;
    expect(remaining).toBeGreaterThanOrEqual(0);
    expect(remaining).toBeLessThanOrEqual(22.5);
  });

  it("progressPercent อยู่ระหว่าง 0–100", () => {
    const date = makeDate("2026-05-25");
    const currentTime = makeDate("2026-05-25", "10:00");
    const result = calculateHora({ date, currentTime });
    const pct = result.currentHora?.progressPercent ?? -1;
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(100);
  });

  it("ไม่ส่ง currentTime → currentHora = undefined", () => {
    const date = makeDate("2026-05-25");
    const result = calculateHora({ date });
    expect(result.currentHora).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. findAuspiciousHoras() — หายามมงคล
// ─────────────────────────────────────────────────────────────────────────────

describe("findAuspiciousHoras()", () => {
  const date = makeDate("2026-05-25"); // จันทร์

  it("ส่ง ['jupiter'] คืนยามที่มีพฤหัสเป็นเจ้าของ", () => {
    const slots = findAuspiciousHoras(date, ["jupiter"]);
    expect(slots.length).toBeGreaterThan(0);
    slots.forEach((s) => expect(s.planet.id).toBe("jupiter"));
  });

  it("ส่ง ['venus', 'jupiter'] คืนยามของทั้งสองดาว", () => {
    const slots = findAuspiciousHoras(date, ["venus", "jupiter"]);
    const ids = new Set(slots.map((s) => s.planet.id));
    // ต้องมีอย่างน้อยหนึ่งดาวจากที่ระบุ
    const hasExpected = [...ids].some((id) =>
      ["venus", "jupiter"].includes(id)
    );
    expect(hasExpected).toBe(true);
  });

  it("แต่ละวัน 24 ชั่วโมง มี 64 ยามย่อย (8 ยามใหญ่ × 8)", () => {
    const all = findAuspiciousHoras(date, [
      "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn",
    ]);
    expect(all).toHaveLength(64);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. getHoraSummary() — สรุปยามทั้งหมด
// ─────────────────────────────────────────────────────────────────────────────

describe("getHoraSummary()", () => {
  it("คืน 64 ยามย่อยต่อวัน", () => {
    const date = makeDate("2026-05-25");
    const summary = getHoraSummary(date);
    expect(summary).toHaveLength(64);
  });

  it("ยามย่อยทุกตัวมี planet, startTime, endTime", () => {
    const date = makeDate("2026-05-25");
    const summary = getHoraSummary(date);
    summary.forEach((slot) => {
      expect(slot.planet).toBeDefined();
      expect(slot.startTime).toMatch(/^\d{2}:\d{2}$/);
      expect(slot.endTime).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  it("ยามย่อยแรกเริ่ม 06:00", () => {
    const date = makeDate("2026-05-25");
    const summary = getHoraSummary(date);
    expect(summary[0].startTime).toBe("06:00");
  });

  it("planet ของแต่ละยามเป็น PlanetId ที่ถูกต้อง", () => {
    const validIds = Object.keys(PLANETS);
    const date = makeDate("2026-05-25");
    const summary = getHoraSummary(date);
    summary.forEach((slot) => {
      expect(validIds).toContain(slot.planet.id);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. ทดสอบทุกวันในสัปดาห์
// ─────────────────────────────────────────────────────────────────────────────

describe("calculateHora() — ทุกวันในสัปดาห์", () => {
  const weekDates = [
    { date: "2026-05-24", day: 0, ruler: "sun",     name: "อาทิตย์" },
    { date: "2026-05-25", day: 1, ruler: "moon",    name: "จันทร์" },
    { date: "2026-05-26", day: 2, ruler: "mars",    name: "อังคาร" },
    { date: "2026-05-27", day: 3, ruler: "mercury", name: "พุธ" },
    { date: "2026-05-28", day: 4, ruler: "jupiter", name: "พฤหัส" },
    { date: "2026-05-29", day: 5, ruler: "venus",   name: "ศุกร์" },
    { date: "2026-05-30", day: 6, ruler: "saturn",  name: "เสาร์" },
  ];

  weekDates.forEach(({ date: dateStr, day, ruler, name }) => {
    it(`วัน${name}: dayRuler = ${ruler}, ยามแรก = ${ruler}`, () => {
      const d = makeDate(dateStr);
      const result = calculateHora({ date: d });
      expect(result.dayOfWeek).toBe(day);
      expect(result.dayRuler.id).toBe(ruler);
      expect(result.majorSlots[0].rulerPlanet.id).toBe(ruler);
      expect(result.majorSlots[0].subSlots[0].planet.id).toBe(ruler);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Planet Data Integrity
// ─────────────────────────────────────────────────────────────────────────────

describe("Planet data integrity", () => {
  it("ดาวทุกดวงมีข้อมูลครบ", () => {
    Object.values(PLANETS).forEach((planet) => {
      expect(planet.id).toBeTruthy();
      expect(planet.nameThai).toBeTruthy();
      expect(planet.nameEn).toBeTruthy();
      expect(planet.symbol).toBeTruthy();
      expect(planet.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(planet.number).toBeGreaterThan(0);
      expect(["benefic", "malefic", "neutral"]).toContain(planet.nature);
      expect(planet.promotes.length).toBeGreaterThan(0);
      expect(planet.warns.length).toBeGreaterThan(0);
    });
  });

  it("PLANET_CHALDEAN_ORDER มี 7 ดาว ไม่ซ้ำ", () => {
    expect(PLANET_CHALDEAN_ORDER).toHaveLength(7);
    const unique = new Set(PLANET_CHALDEAN_ORDER);
    expect(unique.size).toBe(7);
  });

  it("ดาว 7 ดวงครบในระบบ", () => {
    const ids = Object.keys(PLANETS);
    expect(ids).toHaveLength(7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Edge Cases
// ─────────────────────────────────────────────────────────────────────────────

describe("Edge cases", () => {
  it("เวลาเที่ยงคืน (00:00) ไม่ crash", () => {
    const date = makeDate("2026-05-25");
    const midnight = makeDate("2026-05-25", "00:00");
    expect(() => calculateHora({ date, currentTime: midnight })).not.toThrow();
  });

  it("เวลา 05:59 (ก่อนยามกลางวัน) ไม่ crash", () => {
    const date = makeDate("2026-05-25");
    const earlyMorning = makeDate("2026-05-25", "05:59");
    expect(() =>
      calculateHora({ date, currentTime: earlyMorning })
    ).not.toThrow();
  });

  it("เวลา 23:59 ไม่ crash", () => {
    const date = makeDate("2026-05-25");
    const lateNight = makeDate("2026-05-25", "23:59");
    expect(() => calculateHora({ date, currentTime: lateNight })).not.toThrow();
  });

  it("getHoraAt() ทำงานได้ปกติ", () => {
    const date = makeDate("2026-05-25");
    const time = makeDate("2026-05-25", "14:30");
    expect(() => getHoraAt(date, time)).not.toThrow();
    const result = getHoraAt(date, time);
    expect(result.majorSlots).toHaveLength(8);
  });

  it("getCurrentHora() ไม่ throw", () => {
    expect(() => getCurrentHora()).not.toThrow();
    const result = getCurrentHora();
    expect(result.currentHora).toBeDefined();
  });
});
