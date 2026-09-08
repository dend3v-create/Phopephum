import { describe, it, expect } from "vitest";
import { 
  calculateTimeEngine, 
  getYamStar, 
  YAM_ORDER_DAY, 
  YAM_ORDER_NIGHT,
  calculateLagnaPhopephum,
  calculateLagnaJorn
} from "./calculatePhopephumTime.js";
import { FateMatrix } from "../types/fateMatrix.js";

describe("ยามอัฏฐกาล 16 ยาม (กลางวัน 8 ยาม / กลางคืน 8 ยาม) ตามตำราหอสมุดแห่งชาติและ อ.พลูหลวง", () => {
  // ตารางยามกลางวัน (สูตร +5) จากตำราหน้าภาพที่ 1
  const expectedDayTable: Record<number, number[]> = {
    1: [1, 6, 4, 2, 7, 5, 3, 1], // อาทิตย์: สุริชะ, ศุกระ, พุธะ, จันเทา, เสารี, ครู, ภุมมะ, สุริชะ
    2: [2, 7, 5, 3, 1, 6, 4, 2], // จันทร์: จันเทา, เสารี, ครู, ภุมมะ, สุริชะ, ศุกระ, พุธะ, จันเทา
    3: [3, 1, 6, 4, 2, 7, 5, 3], // อังคาร: ภุมมะ, สุริชะ, ศุกระ, พุธะ, จันเทา, เสารี, ครู, ภุมมะ
    4: [4, 2, 7, 5, 3, 1, 6, 4], // พุธ: พุธะ, จันเทา, เสารี, ครู, ภุมมะ, สุริชะ, ศุกระ, พุธะ
    5: [5, 3, 1, 6, 4, 2, 7, 5], // พฤหัสบดี: ครู, ภุมมะ, สุริชะ, ศุกระ, พุธะ, จันเทา, เสารี, ครู
    6: [6, 4, 2, 7, 5, 3, 1, 6], // ศุกร์: ศุกระ, พุธะ, จันเทา, เสารี, ครู, ภุมมะ, สุริชะ, ศุกระ
    7: [7, 5, 3, 1, 6, 4, 2, 7], // เสาร์: เสารี, ครู, ภุมมะ, สุริชะ, ศุกระ, พุธะ, จันเทา, เสารี
  };

  // ตารางยามกลางคืน (สูตร +4) จากตำราหน้าภาพที่ 2
  const expectedNightTable: Record<number, number[]> = {
    1: [1, 5, 2, 6, 3, 7, 4, 1], // อาทิตย์: ระวิ, ชีโว, ศะศิ, ศุโกร, ภุมโม, โสโร, พุทโธ, ระวิ
    2: [2, 6, 3, 7, 4, 1, 5, 2], // จันทร์: ศะศิ, ศุโกร, ภุมโม, โสโร, พุทโธ, ระวิ, ชีโว, ศะศิ
    3: [3, 7, 4, 1, 5, 2, 6, 3], // อังคาร: ภุมโม, โสโร, พุทโธ, ระวิ, ชีโว, ศะศิ, ศุโกร, ภุมโม
    4: [4, 1, 5, 2, 6, 3, 7, 4], // พุธ: พุทโธ, ระวิ, ชีโว, ศะศิ, ศุโกร, ภุมโม, โสโร, พุทโธ
    5: [5, 2, 6, 3, 7, 4, 1, 5], // พฤหัสบดี: ชีโว, ศะศิ, ศุโกร, ภุมโม, โสโร, พุทโธ, ระวิ, ชีโว
    6: [6, 3, 7, 4, 1, 5, 2, 6], // ศุกร์: ศุโกร, ภุมโม, โสโร, พุทโธ, ระวิ, ชีโว, ศะศิ, ศุโกร
    7: [7, 4, 1, 5, 2, 6, 3, 7], // เสาร์: โสโร, พุทโธ, ระวิ, ชีโว, ศะศิ, ศุโกร, ภุมโม, โสโร
  };

  it("ควรมีลำดับอาร์เรย์ยามกลางวัน [1, 6, 4, 2, 7, 5, 3] และกลางคืน [1, 5, 2, 6, 3, 7, 4]", () => {
    expect(YAM_ORDER_DAY).toEqual([1, 6, 4, 2, 7, 5, 3]);
    expect(YAM_ORDER_NIGHT).toEqual([1, 5, 2, 6, 3, 7, 4]);
  });

  it("ฟังก์ชัน getYamStar ต้องให้ผลลัพธ์ตรงกับตารางตำราจริงทั้ง 7 วัน ครบทั้ง 16 ยาม", () => {
    for (let day = 1; day <= 7; day++) {
      // ภาคกลางวัน (ยาม 1-8)
      for (let y = 1; y <= 8; y++) {
        const star = getYamStar(day, y, true);
        expect(star).toBe(expectedDayTable[day][y - 1]);
      }
      // ภาคกลางคืน (ยาม 1-8)
      for (let y = 1; y <= 8; y++) {
        const star = getYamStar(day, y, false);
        expect(star).toBe(expectedNightTable[day][y - 1]);
      }
    }
  });

  it("ทดสอบเวลา 18:00 น. วันอาทิตย์ ต้องเป็น ยามกลางวัน ยามที่ 8 ยามปลาย (ตกฐานปี ฐาน 3)", () => {
    // 1994-05-15 เป็นวันอาทิตย์
    const date1800 = new Date("1994-05-15T18:00:00+07:00");
    const result = calculateTimeEngine(date1800);

    expect(result.dayStar).toBe(1); // วันอาทิตย์
    expect(result.isDay).toBe(true); // 18:00 ยังอยู่ในภาคกลางวัน (ยามที่ 8 สิ้นสุด 18:00)
    expect(result.yamPeriodNumber).toBe(8); // ยามที่ 8 กลางวัน
    expect(result.yamYai).toBe(1); // สุริชะ (๑)
    expect(result.yamYaiName).toBe("สุริชะ");
    expect(result.subPeriod).toBe("end"); // ยามปลาย (นาที 60-90)
  });

  it("ทดสอบเวลา 18:01 น. วันอาทิตย์ ต้องเข้าสู่ ยามกลางคืน ยามที่ 1 ยามต้น (ตกฐานวัน ฐาน 1)", () => {
    const date1801 = new Date("1994-05-15T18:01:00+07:00");
    const result = calculateTimeEngine(date1801);

    expect(result.dayStar).toBe(1); // วันอาทิตย์
    expect(result.isDay).toBe(false); // เริ่มเข้าภาคกลางคืน
    expect(result.yamPeriodNumber).toBe(1); // ยามที่ 1 กลางคืน
    expect(result.yamYai).toBe(1); // ระวิ (๑)
    expect(result.yamYaiName).toBe("ระวิ");
    expect(result.subPeriod).toBe("early"); // ยามต้น (นาที 0-30)
  });

  it("ทดสอบเวลา 21:05 น. วันอาทิตย์ ต้องเป็น ยามกลางคืน ยามที่ 3 (ศะศิ ๒) ยามต้น", () => {
    // 21:01 - 22:30 คือ ยามที่ 3 กลางคืน -> ดาว ๒ ศะศิ
    const date2105 = new Date("1994-05-15T21:05:00+07:00");
    const result = calculateTimeEngine(date2105);

    expect(result.dayStar).toBe(1);
    expect(result.isDay).toBe(false);
    expect(result.yamPeriodNumber).toBe(3);
    expect(result.yamYai).toBe(2); // ศะศิ (๒)
    expect(result.yamYaiName).toBe("ศะศิ");
    expect(result.subPeriod).toBe("early");
  });

  it("ทดสอบเวลา 02:50 น. เช้ามืดวันจันทร์ ต้องนับเป็นวันอาทิตย์ ยามที่ 6 กลางคืน (โสโร ๗) ยามปลาย", () => {
    // 02:50 น. ก่อน 06:00 น. ยังเป็นวันอาทิตย์
    // 01:30 - 03:00 คือ ยามที่ 6 กลางคืน -> ดาว ๗ โสโร
    const date0250 = new Date("1994-05-16T02:50:00+07:00"); // ปฏิทินสากลเป็นจันทร์ที่ 16
    const result = calculateTimeEngine(date0250);

    expect(result.dayStar).toBe(1); // นับเป็นวันอาทิตย์ตามโหราศาสตร์ไทย
    expect(result.isDay).toBe(false);
    expect(result.yamPeriodNumber).toBe(6);
    expect(result.yamYai).toBe(7); // โสโร (๗)
    expect(result.yamYaiName).toBe("โสโร");
    expect(result.subPeriod).toBe("end"); // 02:50 น. คือนาทีที่ 80 ของยาม 6 -> ยามปลาย
  });

  it("คำนวณลัคนาเกิด: วันอาทิตย์ 18:00 น. ต้องวางในแถว 3 (ฐานปี) ตรงกับคอลัมน์ของดาว 1", () => {
    const mockMatrix: FateMatrix = [
      [1, 2, 3, 4, 5, 6, 7], // ฐาน 1
      [2, 3, 4, 5, 6, 7, 1], // ฐาน 2
      [3, 4, 5, 6, 7, 1, 2], // ฐาน 3 (ดาว 1 อยู่ที่ index 5 -> col 6)
      [6, 9, 12, 15, 18, 21, 24],
      [6, 2, 5, 1, 4, 7, 3],
      [5, 4, 3, 2, 1, 7, 6],
      [4, 3, 2, 1, 7, 6, 5],
      [1, 6, 4, 2, 7, 5, 3],
      [3, 5, 7, 2, 4, 6, 1]
    ];

    const date1800 = new Date("1994-05-15T18:00:00+07:00");
    const lagna = calculateLagnaPhopephum(mockMatrix, date1800);

    expect(lagna.row).toBe(3); // ยามปลาย -> ฐาน 3
    expect(lagna.col).toBe(6); // ดาว 1 อยู่ที่คอลัมน์ 6 ในฐาน 3
    expect(lagna.star).toBe(1); // ดาวประจำยาม 1 สุริชะ
    expect(lagna.yamYaiName).toBe("สุริชะ");

    // ทดสอบลัคนาจร อายุย่าง 33 ปี
    const lagnaJorn = calculateLagnaJorn(mockMatrix, lagna, 33);
    // natalIdx = (3 - 1) * 7 + (6 - 1) = 14 + 5 = 19
    // transitIdx = (19 + (33 - 1)) % 21 = (19 + 32) % 21 = 51 % 21 = 9
    // row = Math.floor(9 / 7) = 1 -> row + 1 = 2 (ฐานเดือน)
    // col = 9 % 7 = 2 -> col + 1 = 3
    expect(lagnaJorn.row).toBe(2);
    expect(lagnaJorn.col).toBe(3);
  });

  it("should match user benchmark: Friday 09:01 AM -> Yam 3 จันเทา (๒) early -> Row 1 Col 4 (ภพปิตา) and Age 45 -> Row 1 Col 6 (ภพโภคา)", () => {
    // ผังดวงตัวอย่างจากโจทย์ผู้ใช้ (วันศุกร์)
    const fridayMatrix: FateMatrix = [
      [6, 7, 1, 2, 3, 4, 5], // ฐานวัน (อัตตะ, หินะ, ธนัง, ปิตา, มาตา, โภคา, มัชฌิมา)
      [2, 3, 4, 5, 6, 7, 1], // ฐานเดือน (ตนุ, กฎุมภะ, สหัชชะ, พันธุ, ปุตตะ, อริ, ปัตนิ)
      [4, 5, 6, 7, 1, 2, 3], // ฐานปี (มรณะ, สุภะ, กัมมะ, ลาภะ, พยายะ, ทาสา, ทาสี)
      [12, 15, 11, 14, 10, 13, 9], // ฐานกำลัง
      [6, 2, 5, 1, 4, 7, 3],
      [5, 4, 3, 2, 1, 7, 6],
      [4, 3, 2, 1, 7, 6, 5],
      [1, 6, 4, 2, 7, 5, 3],
      [3, 5, 7, 2, 4, 6, 1]
    ];

    // วันศุกร์ เวลา 09:01 น. (เช่น 2024-05-17 คือวันศุกร์)
    const friday0901 = new Date("2024-05-17T09:01:00+07:00");
    const lagna = calculateLagnaPhopephum(fridayMatrix, friday0901);

    // 1. ตรวจสอบยามและลัคนาเกิด
    expect(lagna.yamPeriodNumber).toBe(3); // ยามที่ 3 กลางวัน (09:01 - 10:30)
    expect(lagna.yamYaiName).toBe("จันเทา");
    expect(lagna.star).toBe(2); // ดาว ๒ (จันเทา)
    expect(lagna.subPeriod).toBe("early"); // นาทีที่ 1 ในยาม -> ยามต้น (0-30 น.)
    expect(lagna.row).toBe(1); // ยามต้น -> ฐาน 1 (ฐานวัน)
    expect(lagna.col).toBe(4); // ดาว ๒ ในฐาน 1 อยู่ที่หลักที่ 4
    expect(lagna.houseName).toBe("ปิตา"); // ภพปิตา

    // 2. ตรวจสอบลัคนาจร อายุย่าง 45 ปี
    const lagnaJorn45 = calculateLagnaJorn(fridayMatrix, lagna, 45);
    expect(lagnaJorn45.row).toBe(1); // ฐาน 1 (ฐานวัน)
    expect(lagnaJorn45.col).toBe(6); // หลักที่ 6
    expect(lagnaJorn45.houseName).toBe("โภคา"); // ภพโภคา
    expect(lagnaJorn45.star).toBe(4); // ดาว ๔
  });

  it("ทดสอบเวลา 09:00:00 น. วันศุกร์ ตามระบบเวลาภพภูมิ ต้องเป็น ยามที่ 2 (พุธะ ๔) ยามปลาย (end / ฐาน 3) ภพมรณะ", () => {
    const fridayMatrix: FateMatrix = [
      [6, 7, 1, 2, 3, 4, 5],
      [2, 3, 4, 5, 6, 7, 1],
      [4, 5, 6, 7, 1, 2, 3],
      [12, 15, 11, 14, 10, 13, 9],
      [6, 2, 5, 1, 4, 7, 3],
      [5, 4, 3, 2, 1, 7, 6],
      [4, 3, 2, 1, 7, 6, 5],
      [1, 6, 4, 2, 7, 5, 3],
      [3, 5, 7, 2, 4, 6, 1]
    ];

    // 23 กรกฎาคม 2525 (1982-07-23) วันศุกร์ เวลา 09:00:00 น. (นาทีสุดท้ายของยาม 2: 07:31 - 09:00 น.)
    const friday0900 = new Date("1982-07-23T09:00:00+07:00");
    const lagna = calculateLagnaPhopephum(fridayMatrix, friday0900);

    expect(lagna.yamPeriodNumber).toBe(2); // ยามที่ 2 กลางวัน (07:31 - 09:00)
    expect(lagna.yamYaiName).toBe("พุธะ");
    expect(lagna.star).toBe(4); // ดาว ๔ (พุธะ)
    expect(lagna.subPeriod).toBe("end"); // นาทีที่ 90 -> ยามปลาย (ตกฐานปี / ฐาน 3)
    expect(lagna.row).toBe(3); // ฐาน 3 (ฐานปี)
    expect(lagna.col).toBe(1); // ดาว ๔ ในฐาน 3 อยู่ที่หลัก 1 (ภพมรณะ)
    expect(lagna.houseName).toBe("มรณะ");

    // ลัคนาจร อายุย่าง 45 ปี
    const lagnaJorn45 = calculateLagnaJorn(fridayMatrix, lagna, 45);
    expect(lagnaJorn45.row).toBe(3);
    expect(lagnaJorn45.col).toBe(3);
    expect(lagnaJorn45.houseName).toBe("กัมมะ");
    expect(lagnaJorn45.star).toBe(6);
  });
});
