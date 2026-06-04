import { describe, it, expect } from "vitest";
import { calculateKarnchata } from "../calculators/karnchataCalculator.js";

describe("Karnchata Calculator", () => {
  it("should calculate correctly for Monday 11:02 AM", () => {
    // Note: The example says "Monday 11:02 AM".
    // Let's pick a date that is a Monday.
    // 2026-06-08 is a Monday.
    // Time: 11:02:00 in local time (UTC+7 for BKK).
    // Let's create the date in UTC to match 11:02 BKK.
    // 11:02 BKK = 04:02 UTC.
    const date = new Date(Date.UTC(2026, 5, 8, 4, 2, 0)); // Month is 0-indexed (5 = June)

    const result = calculateKarnchata(date);

    // Day Star: Monday = 2
    expect(result.dayStarNumber).toBe(2);

    // Yam Yai: 11:02 AM is 4th Yam (10:30 - 12:00).
    // Monday Day Yam sequence: 2, 7, 5, 3, 1, 6, 4, 2
    // 4th Yam is 3 (Phumma)
    expect(result.yamYaiNumber).toBe(3);
    expect(result.yamYaiName).toBe("ภุมมะ");

    // Yam Soy: 02 minutes. 2 % 30 = 2. index = floor(2 / 3.75) = 0.
    // Sequence starts with 2 (Jantao)
    expect(result.yamSoyNumber).toBe(2);
    expect(result.yamSoyName).toBe("จันเทา");

    // Check chart bases
    // Base 1 (Atta) should start with Yam Soy = 2
    expect(result.chart[0]![0]).toBe(2);
    expect(result.chart[0]![1]).toBe(3); // +1 

    // Base 2 (Tanu) should start with Yam Yai = 3
    expect(result.chart[1]![0]).toBe(3);
    
    // Base 3 (Morana) should start with Day Star = 2
    expect(result.chart[2]![0]).toBe(2);

    // Base 4 = Base 1 + Base 2 + Base 3
    // Col 1 = 2 + 3 + 2 = 7
    expect(result.chart[3]![0]).toBe(7);
  });
});
