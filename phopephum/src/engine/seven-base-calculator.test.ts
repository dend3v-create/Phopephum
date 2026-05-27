import { describe, it, expect } from "vitest";
import { calculateSevenBase } from "./seven-base-calculator";

describe("Seven Base Calculator Engine Tests", () => {
  it("should calculate correctly for a given birthdate", () => {
    // สมมติวันเกิด สมชาย 12 สิงหาคม 2538 (1995-08-12)
    const result = calculateSevenBase("1995-08-12", "14:35");

    // ตรวจสอบโครงสร้างผลลัพธ์
    expect(result).toBeDefined();
    expect(result.dayOfWeek).toBeDefined();
    expect(result.lunarMonth).toBeDefined();
    expect(result.zodiacIndex).toBeDefined();

    // เช็คว่าขนาดของฐานถูกต้องครบ 7 คอลัมน์
    expect(result.chart.row1.length).toBe(7);
    expect(result.chart.row2.length).toBe(7);
    expect(result.chart.row3.length).toBe(7);
    expect(result.chart.row4.length).toBe(7);
    expect(result.chart.row5.length).toBe(7);
    expect(result.chart.row6.length).toBe(7);
    expect(result.chart.row7.length).toBe(7);
    expect(result.chart.row8.length).toBe(7);
    expect(result.chart.row9.length).toBe(7);

    // ตรวจผลการคำนวณดวงจร
    expect(result.transit.transitAge).toBeGreaterThan(0);
    expect(result.transit.majorCycle).toBeDefined();
    expect(result.transit.minorCycle).toBeDefined();
  });
});
