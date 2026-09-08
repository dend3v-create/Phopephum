/**
 * direction-oracle.ts
 * ระบบพยากรณ์ทิศทางตามหลักทักษาครองทิศ (พระคัมภีร์มหาทักษา)
 * คำนวณคำทำนายเจาะลึก 8 ทิศ: สมัครงาน, การเดินทาง/อุบัติเหตุ, การค้าขาย, และการตั้งโต๊ะทำงาน
 */

import type { StarNumber, TaksaBhop, TaksaMap } from "./taksa-mahabhuti.types.js";
import { TAKSA_DIRECTIONS, STAR_NAMES } from "./taksa-mahabhuti.types.js";

export type DirectionRating = "supreme" | "excellent" | "good" | "neutral" | "caution" | "danger";

export interface DirectionOracleDetail {
  star: StarNumber;
  starName: string;
  code: string;
  paliName: string;
  thaiName: string;
  fullName: string;
  bhopNatal: TaksaBhop;
  bhopTransit: TaksaBhop;
  rating: DirectionRating;
  ratingLabel: string;
  careerAdvice: string;    // สมัครงาน / สัมภาษณ์ / เจรจาธุรกิจ
  travelAdvice: string;    // การเดินทาง / อุบัติเหตุ
  businessAdvice: string;  // ค้าขาย / เสี่ยงโชค
  deskAdvice: string;      // จัดโต๊ะทำงาน / เคหสถาน
  remedyAdvice?: string;   // วิธีแก้เคล็ด
}

export function getDirectionOracle(
  star: StarNumber,
  taksaNatalMap: TaksaMap,
  taksaTransitMap: TaksaMap
): DirectionOracleDetail {
  const dir = TAKSA_DIRECTIONS[star];
  const bhopNatal = taksaNatalMap[star] || "บริวาร";
  const bhopTransit = taksaTransitMap[star] || "บริวาร";
  const starName = STAR_NAMES[star];

  let rating: DirectionRating = "good";
  let ratingLabel = "มงคลทั่วไป";
  let careerAdvice = "";
  let travelAdvice = "";
  let businessAdvice = "";
  let deskAdvice = "";
  let remedyAdvice: string | undefined;

  switch (bhopTransit) {
    case "กาลกิณี":
      rating = "danger";
      ratingLabel = "ทิศต้องห้ามเด็ดขาด (อันตราย)";
      careerAdvice = `ห้ามเดินทางไปสมัครงาน ยื่นเอกสาร หรือสัมภาษณ์งานทาง${dir.fullName}โดยเด็ดขาด จะถูกปฏิเสธ เจรจาล้มเหลว หรือมีบุคคลคิดร้ายใส่ความ`;
      travelAdvice = `🚨 ห้ามเดินทางไกลไปทาง${dir.fullName}! มีเกณฑ์อุบัติเหตุทางถนน ยานพาหนะชำรุด หรือเกิดปากเสียงวิวาท หากจำเป็นต้องไป ให้ตรวจสภาพรถและมีสติไม่ประมาท`;
      businessAdvice = `ไม่ควรไปเปิดร้านใหม่ ลงทุน หรือทวงหนี้สินทางทิศนี้ เงินทองจะติดขัด มีหนี้สูญ หรือเกิดข้อพิพาทด้านสัญญา`;
      deskAdvice = `ห้ามหันหน้าโต๊ะทำงานหรือเตียงนอนไปทาง${dir.fullName} และหลีกเลี่ยงการเจาะต่อเติมอาคารทางทิศนี้`;
      remedyAdvice = `หากเลี่ยงไม่ได้ แนะนำให้ทำบุญถวายสังฆทาน บริจาคยารักษาโรค ปล่อยปลา หรือสวดมนต์บทพาหุงมหากาเพื่อบรรเทาพลังงานกาลกิณี`;
      break;

    case "เดช":
      rating = "supreme";
      ratingLabel = "ทิศยอดเยี่ยมสำหรับการสมัครงานและชิงชัย";
      careerAdvice = `🌟 ทิศยอดเยี่ยมสูงสุดสำหรับการสมัครงาน สัมภาษณ์งาน และสอบแข่งขันทาง${dir.fullName}! จะได้รับพลังอำนาจบารมี ชนะใจคณะกรรมการและคู่แข่ง โดดเด่นเป็นผู้นำ`;
      travelAdvice = `การเดินทางไปทาง${dir.fullName}จะเสริมสง่าราศี ผู้คนยำเกรง ราบรื่น แคล้วคลาดปลอดภัย`;
      businessAdvice = `เหมาะสำหรับการเข้าประมูลงาน ลงนามสัญญาสำคัญ หรือปิดดีลโครงการใหญ่ที่ต้องใช้ความเด็ดขาด`;
      deskAdvice = `เหมาะแก่การหันหน้าโต๊ะทำงานไปทาง${dir.fullName} เสริมบารมี คุมบริวารลูกน้องได้อย่างเฉียบขาด`;
      break;

    case "มนตรี":
      rating = "supreme";
      ratingLabel = "ทิศผู้ใหญ่อุปถัมภ์และเมตตา";
      careerAdvice = `🤝 ทิศมงคลเลิศล้ำสำหรับการเข้าพบผู้ใหญ่ ขอคำปรึกษา ยื่นโปรเจกต์ หรือสมัครงานทาง${dir.fullName}! จะได้รับความเมตตาเอ็นดู อนุมัติผ่านฉลุย มีคนช่วยผลักดัน`;
      travelAdvice = `การเดินทางไปทิศนี้จะพบกัลยาณมิตรหรือผู้หลักผู้ใหญ่คอยช่วยเหลือต้อนรับอย่างอบอุ่น ปลอดภัยทุกเส้นทาง`;
      businessAdvice = `เหมาะแก่การหาหุ้นส่วน พาร์ทเนอร์ หรือพบที่ปรึกษาทางการเงินเพื่อร่วมขยายธุรกิจ`;
      deskAdvice = `การหันโต๊ะทำงานไปทาง${dir.fullName}จะทำให้งานราบรื่น ได้รับความคุ้มครองช่วยเหลือจากผู้บังคับบัญชา`;
      break;

    case "ศรี":
      rating = "supreme";
      ratingLabel = "ทิศมหามงคลรับทรัพย์และโชคลาภ";
      careerAdvice = `💎 สมัครงานและเจรจาทาง${dir.fullName}จะได้รับผลตอบแทน เงินเดือน หรือสวัสดิการที่คุ้มค่าเกินคาด มีความสุขในสถานที่ทำงาน`;
      travelAdvice = `การเดินทางไปทาง${dir.fullName}จะนำมาซึ่งความสุขกายสบายใจ ได้รับของฝาก ลาภลอย หรือโชคดีระหว่างทาง`;
      businessAdvice = `💰 ทิศเปิดร้าน ค้าขาย และเสี่ยงโชคที่ดีที่สุดแห่งปี! ปักหลักค้าขายทางทิศนี้จะมีลูกค้าหลั่งไหล เงินทองหมุนเวียนคล่องตัว`;
      deskAdvice = `หันหน้าโต๊ะทำงานหรือตั้งโต๊ะเก็บเงินไปทาง${dir.fullName} จะดึงดูดกระแสทรัพย์สินเงินทองอย่างต่อเนื่อง`;
      break;

    case "มูละ":
      rating = "excellent";
      ratingLabel = "ทิศเสริมความมั่นคงและรากฐาน";
      careerAdvice = `เหมาะสำหรับการสมัครงานในองค์กรขนาดใหญ่ บริษัทมหาชน หรือสถาบันที่มีความมั่นคงระยะยาวทาง${dir.fullName}`;
      travelAdvice = `การเดินทางปลอดภัย มั่นคง ไร้อุปสรรค เหมาะแก่การเดินทางไปตรวจดูทรัพย์สิน ที่ดิน หรือบ้านพัก`;
      businessAdvice = `ทิศแห่งการซื้ออสังหาริมทรัพย์ ที่ดิน ปลูกสร้างเคหสถาน หรือลงทุนในสินทรัพย์ถาวร`;
      deskAdvice = `ช่วยเสริมให้หน้าที่การงานตั้งมั่น ไม่โยกย้ายบ่อย มีความสุขุมรอบคอบ`;
      break;

    case "อายุ":
      rating = "good";
      ratingLabel = "ทิศเสริมสุขภาพและความราบรื่น";
      careerAdvice = `เหมาะแก่งานสายสุขภาพ บริการ สวัสดิการ หรือการทำงานที่ไม่เครียดเร่งรีบทาง${dir.fullName}`;
      travelAdvice = `เดินทางปลอดภัย ไร้โรคภัยไข้เจ็บ ร่างกายแข็งแรง ได้พักผ่อนหย่อนใจ`;
      businessAdvice = `การค้าขายด้านอาหาร สุขภาพ ยารักษาโรค และสินค้าอุปโภคบริโภคทางทิศนี้จะดำเนินไปได้เรื่อยๆ มั่นคง`;
      deskAdvice = `ช่วยให้จิตใจสงบ สุขภาพกายใจสมดุล ไม่เหน็ดเหนื่อยเกินกำลัง`;
      break;

    case "บริวาร":
      rating = "good";
      ratingLabel = "ทิศเกื้อหนุนมิตรภาพและทีมงาน";
      careerAdvice = `เหมาะสำหรับการสมัครงานที่ต้องทำงานเป็นทีม หรือการไปร่วมงานกับคนรู้จัก เพื่อนฝูง ทาง${dir.fullName}`;
      travelAdvice = `เดินทางพร้อมเพื่อนฝูง คนรัก หรือครอบครัวจะราบรื่น อบอุ่น มีคนคอยดูแลเกื้อกูล`;
      businessAdvice = `เหมาะแก่การสร้างเครือข่าย หาตัวแทนจำหน่าย หรือรวมกลุ่มค้าขายร่วมกัน`;
      deskAdvice = `ช่วยให้ประสานงานกับเพื่อนร่วมงานและลูกน้องได้กลมเกลียว`;
      break;

    case "อุตสาหะ":
      rating = "caution";
      ratingLabel = "ทิศต้องบุกเบิกและเหน็ดเหนื่อย";
      careerAdvice = `การไปสมัครงานทาง${dir.fullName}อาจต้องเจอกับงานหนัก ภาระหน้าที่เยอะ หรือขั้นตอนคัดเลือกเข้มงวด ต้องเตรียมตัวให้พร้อมที่สุด`;
      travelAdvice = `การเดินทางอาจมีปัญหาการจราจรติดขัด ล่าช้า หรือต้องใช้เวลาเดินทางนานกว่าปกติ ควรเผื่อเวลาล่วงหน้า`;
      businessAdvice = `ธุรกิจทางทิศนี้เหนื่อยและต้องลงแรงมากจึงจะเห็นผลกำไร ไม่ควรหวังรวยทางลัด`;
      deskAdvice = `โต๊ะทำงานอาจทำให้มีงานล้นมือ ต้องรับผิดชอบหลายด้าน แต่ผลลัพธ์จะสำเร็จได้ด้วยความเพียร`;
      break;
  }

  return {
    star,
    starName,
    code: dir.code,
    paliName: dir.paliName,
    thaiName: dir.thaiName,
    fullName: dir.fullName,
    bhopNatal,
    bhopTransit,
    rating,
    ratingLabel,
    careerAdvice,
    travelAdvice,
    businessAdvice,
    deskAdvice,
    remedyAdvice,
  };
}

export function getAllDirectionsOracle(
  taksaNatalMap: TaksaMap,
  taksaTransitMap: TaksaMap
): DirectionOracleDetail[] {
  const stars: StarNumber[] = [1, 2, 3, 4, 7, 5, 8, 6];
  return stars.map(s => getDirectionOracle(s, taksaNatalMap, taksaTransitMap));
}
