import type { PhopephumResult, StarNumber } from "@phopephum/types";

export interface DailyAdvice {
  work: {
    status: "excellent" | "good" | "warning";
    title: string;
    description: string;
  };
  wealth: {
    status: "excellent" | "good" | "warning";
    title: string;
    description: string;
  };
  love: {
    status: "excellent" | "good" | "warning";
    title: string;
    description: string;
  };
  health: {
    status: "excellent" | "good" | "warning";
    title: string;
    description: string;
  };
}

const STAR_NAMES_TH: Record<number, string> = {
  1: "อาทิตย์", 2: "จันทร์", 3: "อังคาร", 4: "พุธ",
  5: "พฤหัสบดี", 6: "ศุกร์", 7: "เสาร์", 8: "ราหู"
};

export function generateDailyAdvice(phResult: PhopephumResult): DailyAdvice {
  const taksaMap = phResult.taksaTransit.map as Record<number, string>;
  const mahaMap = phResult.mahaTransit.map as Record<string, number>;

  // ค้นหาตำแหน่งของดาวจรต่างๆ
  const getStarOfBhop = (bhopName: string): StarNumber => {
    const entry = Object.entries(taksaMap).find(([, v]) => v === bhopName);
    return entry ? (parseInt(entry[0], 10) as StarNumber) : 1;
  };

  const sriStar = getStarOfBhop("ศรี");
  const kalaStar = getStarOfBhop("กาลกิณี");
  const utsahaStar = getStarOfBhop("อุตสาหะ");
  const dechStar = getStarOfBhop("เดช");
  const ageStar = getStarOfBhop("อายุ");
  const montriStar = getStarOfBhop("มนตรี");

  const sriName = STAR_NAMES_TH[sriStar] || "";
  const kalaName = STAR_NAMES_TH[kalaStar] || "";
  const utsahaName = STAR_NAMES_TH[utsahaStar] || "";
  const dechName = STAR_NAMES_TH[dechStar] || "";
  const ageName = STAR_NAMES_TH[ageStar] || "";
  const montriName = STAR_NAMES_TH[montriStar] || "";

  // 1. การงาน (Career)
  let workStatus: "excellent" | "good" | "warning" = "good";
  let workTitle = `ขับเคลื่อนแผนงานด้วยดาว${utsahaName}`;
  let workDesc = `วันนี้ควรเน้นลงมือทำงานอย่างสม่ำเสมอ แผนงานที่วางไว้จะมีผู้ช่วยเกื้อหนุนตามจังหวะดาวมงคล`;

  if (utsahaStar === sriStar || dechStar === sriStar) {
    workStatus = "excellent";
    workTitle = `การงานรุ่งโรจน์ โอกาสทองจากดาว${sriName}`;
    workDesc = `วันนี้เป็นช่วงเวลาที่ยอดเยี่ยมที่สุดในการเสนองาน ขายโปรเจกต์ หรือเริ่มงานใหม่ พลังงานแห่งชื่อเสียงและความมงคลพร้อมสนับสนุนคุณเต็มที่`;
  } else if (utsahaStar === kalaStar || dechStar === kalaStar) {
    workStatus = "warning";
    workTitle = `ระวังอุปสรรคในการงานจากดาว${kalaName}`;
    workDesc = `วันนี้งานอาจเกิดความล่าช้า เอกสารมีข้อผิดพลาด หรือเกิดความเข้าใจผิดในการประสานงาน ควรตรวจสอบความถูกต้องเป็นสองเท่าและหลีกเลี่ยงความใจร้อน`;
  } else {
    // แยกตามตัวเลขดาวอุตสาหะ
    switch (utsahaStar) {
      case 1:
        workDesc = `เหมาะกับการเจรจากับผู้มีอำนาจ ทำหน้าที่ผู้นำ หรือจัดระเบียบแผนยุทธศาสตร์ระยะยาว`;
        break;
      case 2:
        workDesc = `เด่นด้านการบริการ งานที่ต้องใช้อารมณ์ความรู้สึก จินตนาการ หรืองานประสานความเข้าใจในทีม`;
        break;
      case 3:
        workDesc = `ช่วงเวลาแห่งการลงมือแก้ไขปัญหายากๆ งานบุกเบิกตลาดใหม่ หรืองานขายเชิงรุกที่ต้องการความเด็ดเดี่ยว`;
        break;
      case 4:
        workDesc = `เด่นมากในเรื่องการเจรจา การเขียน แบรนดิ้ง ประชาสัมพันธ์ และการเปิดตัวสื่อสารสู่สาธารณะ`;
        break;
      case 5:
        workDesc = `เหมาะกับการเข้าหาครูบาอาจารย์ ผู้ใหญ่ แสวงหาความรู้ใหม่ หรือการฝึกอบรมพัฒนาตนเอง`;
        break;
      case 6:
        workDesc = `งานด้านศิลปะ ความคิดสร้างสรรค์ การออกแบบ และงานสร้างความรื่นรมย์ผ่อนคลายจะมีผลลัพธ์ที่ดี`;
        break;
      case 7:
        workDesc = `เหมาะกับการสะสางงานคงค้าง วางระบบหลังบ้าน หรืองานที่ต้องใช้ความอดทนและรายละเอียดสูง`;
        break;
      case 8:
        workDesc = `เน้นการพลิกแพลงตามกระแส การทำตลาดออนไลน์ ค้าขายต่างประเทศ หรือมองหาช่องทางลัดสู่ผลสำเร็จ`;
        break;
    }
  }

  // 2. การเงิน (Wealth)
  let wealthStatus: "excellent" | "good" | "warning" = "good";
  let wealthTitle = `พลังดึงดูดทรัพย์โดยดาว${sriName}`;
  let wealthDesc = `โชคลาภการเงินในวันนี้ขับเคลื่อนโดยดาว${sriName} ควรใช้จังหวะนี้เจรจาธุรกิจหรือจัดสรรงบประมาณ`;

  if (sriStar === 5 || sriStar === 2) {
    wealthStatus = "excellent";
    wealthTitle = `โชคลาภหลั่งไหล ความมั่งคั่งมงคลสูง`;
    wealthDesc = `พลังเงินทรัพย์ในวันนี้หนุนนำด้วยดาวธาตุดินที่สมบูรณ์ เหมาะกับการเจรจาขอสินเชื่อ ปรับแผนภาษี หรือได้รับเงินสนับสนุนปันผล`;
  } else if (kalaStar === 1 || kalaStar === 7) {
    wealthStatus = "warning";
    wealthTitle = `ระวังรายจ่ายกะทันหัน หรือข้อผิดพลาดทางบัญชี`;
    wealthDesc = `หลีกเลี่ยงการตัดสินใจลงทุนแบบเร่งด่วนตามอารมณ์ ระวังความประมาทเลินเล่อที่ทำให้เงินทองรั่วไหล เลี่ยงการเซ็นค้ำประกันในวันนี้`;
  } else {
    wealthDesc = `โชคลาภจะมาจากการประสานงานหรือคอนเนกชันที่ดี แนะนำให้สวมใส่เสื้อผ้าโทนสีที่เกื้อหนุนดาว${sriName} เพื่อเสริมพลังทรัพย์`;
  }

  // 3. ความรัก (Love)
  let loveStatus: "excellent" | "good" | "warning" = "good";
  let loveTitle = `ใจเกื้อหนุนด้วยดาว${montriName}`;
  let loveDesc = `ความสัมพันธ์ดำเนินไปอย่างเกื้อกูล คู่ครองคอยซัพพอร์ตให้คำแนะนำดีๆ เสมือนเป็นทั้งเพื่อนคู่คิดและกัลยาณมิตร`;

  if (montriStar === 6 || sriStar === 6) {
    loveStatus = "excellent";
    loveTitle = `ความรักเบ่งบาน เสน่ห์เมตตาเปี่ยมล้น`;
    loveDesc = `คนมีคู่มีเกณฑ์ได้ทำกิจกรรมพิเศษร่วมกันเพื่อเติมความหวาน คนโสดมีเสน่ห์ดึงดูดสายตาผู้คนเป็นพิเศษ มีสิทธิ์พบคนอุปถัมภ์ที่เข้าใจคุณลึกซึ้ง`;
  } else if (kalaStar === 3 || kalaStar === 8) {
    loveStatus = "warning";
    loveTitle = `ระวังอารมณ์ร้อนหรือคำพูดเฉือนใจ`;
    loveDesc = `วันนี้พลังงานลบลอยตัวได้ง่าย ควรลดความตึงเครียด ไม่พูดจาจับผิดหรือนำความขัดแย้งเก่ามาคุยกัน ฝึกการระงับอารมณ์และพูดคุยด้วยสติ`;
  }

  // 4. สุขภาพ (Health)
  let healthStatus: "excellent" | "good" | "warning" = "good";
  let healthTitle = `ฟื้นฟูสุขภาพด้วยดาว${ageName}`;
  let healthDesc = `พลังชีวิตวันนี้ขับเคลื่อนด้วยพลังดาว${ageName} ร่างกายฟื้นตัวได้ดี ควรหาจังหวะรับประทานอาหารธรรมชาติและพักผ่อนให้ตรงเวลา`;

  if (ageStar === kalaStar) {
    healthStatus = "warning";
    healthTitle = `พลังชีวิตอ่อนโยน ควรดูแลกายใจเป็นพิเศษ`;
    healthDesc = `ระวังความเครียดสะสม อาการปวดหัวไมเกรน หรือระบบทางเดินอาหารแปรปรวน แนะนำให้งดกิจกรรมหักโหม ดื่มน้ำอุ่น และเข้านอนก่อนเวลาปกติ`;
  } else {
    healthDesc = `พลังกายวันนี้อยู่ในระดับปกติ ควรเสริมภูมิคุ้มกันด้วยการยืดเหยียดร่างกายสั้นๆ และควบคุมความเครียดที่สมองผ่านการฝึกหายใจสงบ`;
  }

  return {
    work: { status: workStatus, title: workTitle, description: workDesc },
    wealth: { status: wealthStatus, title: wealthTitle, description: wealthDesc },
    love: { status: loveStatus, title: loveTitle, description: loveDesc },
    health: { status: healthStatus, title: healthTitle, description: healthDesc }
  };
}
