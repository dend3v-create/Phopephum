import { describe, it, expect } from "vitest";
import { 
  calcTaksaNatal, 
  calcTaksaTransit, 
  getDirectionOracle, 
  getAllDirectionsOracle,
  TAKSA_DIRECTIONS 
} from "./index.js";

describe("ระบบพยากรณ์ทักษาครองทิศ (Direction Oracle) และการคำนวณ", () => {
  it("ตรวจสอบการคำนวณเกิดวันศุกร์ (23 ก.ค. 2525) ณ 8 ก.ย. 2569 อายุย่าง 45 ปี", () => {
    const birthDate = new Date("1982-07-23T09:01:00+07:00");
    const checkDate = new Date("2026-09-08T12:00:00+07:00");

    const natal = calcTaksaNatal(birthDate.getDay()); // 5 = Friday -> Star 6
    const transit = calcTaksaTransit(birthDate, checkDate);

    // ตรวจสอบทักษากำเนิด
    expect(natal.bariStar).toBe(6); // บริวารเกิด = ศุกร์ (6)
    expect(natal.map[6]).toBe("บริวาร");
    expect(natal.map[1]).toBe("อายุ");
    expect(natal.map[2]).toBe("เดช");
    expect(natal.map[3]).toBe("ศรี");
    expect(natal.map[4]).toBe("มูละ");
    expect(natal.map[7]).toBe("อุตสาหะ");
    expect(natal.map[5]).toBe("มนตรี");
    expect(natal.map[8]).toBe("กาลกิณี");

    // ตรวจสอบทักษาจร (อายุย่าง 45 ปี)
    expect(transit.ageYang).toBe(45);
    expect(transit.bariStar).toBe(8); // บริวารจร = ราหู (8)
    expect(transit.map[8]).toBe("บริวาร");
    expect(transit.map[6]).toBe("อายุ");
    expect(transit.map[1]).toBe("เดช");
    expect(transit.map[2]).toBe("ศรี");
    expect(transit.map[3]).toBe("มูละ");
    expect(transit.map[4]).toBe("อุตสาหะ");
    expect(transit.map[7]).toBe("มนตรี");
    expect(transit.map[5]).toBe("กาลกิณี"); // กาลกิณีจร = พฤหัส (5)

    // ตรวจสอบทิศทักษาจร:
    // 1. ทิศตะวันตก (ประจิม) -> ดาว ๕ -> กาลกิณีจร -> ต้องแจ้งเตือนอันตราย / ห้ามเดินทาง / ห้ามสมัครงาน
    const westOracle = getDirectionOracle(5, natal.map, transit.map);
    expect(westOracle.thaiName).toBe("ตะวันตก");
    expect(westOracle.bhopTransit).toBe("กาลกิณี");
    expect(westOracle.rating).toBe("danger");
    expect(westOracle.travelAdvice).toContain("ห้ามเดินทางไกล");
    expect(westOracle.careerAdvice).toContain("ห้ามเดินทางไปสมัครงาน");

    // 2. ทิศตะวันออกเฉียงเหนือ (อีสาน) -> ดาว ๑ -> เดชจร -> ทิศยอดเยี่ยมสำหรับสมัครงาน
    const neOracle = getDirectionOracle(1, natal.map, transit.map);
    expect(neOracle.thaiName).toBe("ตะวันออกเฉียงเหนือ");
    expect(neOracle.bhopTransit).toBe("เดช");
    expect(neOracle.rating).toBe("supreme");
    expect(neOracle.careerAdvice).toContain("สมัครงาน");

    // 3. ทิศตะวันออก (บูรพา) -> ดาว ๒ -> ศรีจร -> ทิศมงคลรับทรัพย์ ค้าขาย
    const eastOracle = getDirectionOracle(2, natal.map, transit.map);
    expect(eastOracle.thaiName).toBe("ตะวันออก");
    expect(eastOracle.bhopTransit).toBe("ศรี");
    expect(eastOracle.rating).toBe("supreme");
    expect(eastOracle.businessAdvice).toContain("ค้าขาย");

    // 4. ทิศตะวันตกเฉียงใต้ (หรดี) -> ดาว ๗ -> มนตรีจร -> ทิศผู้ใหญ่อุปถัมภ์
    const swOracle = getDirectionOracle(7, natal.map, transit.map);
    expect(swOracle.thaiName).toBe("ตะวันตกเฉียงใต้");
    expect(swOracle.bhopTransit).toBe("มนตรี");
    expect(swOracle.rating).toBe("supreme");
  });

  it("ทดสอบผังทักษาครองทิศครบทั้ง 8 ทิศตามตำรา", () => {
    expect(TAKSA_DIRECTIONS[1].paliName).toBe("อีสาน");
    expect(TAKSA_DIRECTIONS[2].paliName).toBe("บูรพา");
    expect(TAKSA_DIRECTIONS[3].paliName).toBe("อาคเนย์");
    expect(TAKSA_DIRECTIONS[4].paliName).toBe("ทักษิณ");
    expect(TAKSA_DIRECTIONS[7].paliName).toBe("หรดี");
    expect(TAKSA_DIRECTIONS[5].paliName).toBe("ประจิม");
    expect(TAKSA_DIRECTIONS[8].paliName).toBe("พายัพ");
    expect(TAKSA_DIRECTIONS[6].paliName).toBe("อุดร");
  });
});
