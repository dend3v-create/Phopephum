export interface NightMeaning {
  yamNumber: number;
  nightName: string;
  travel: {
    start: string;
    middle: string;
    end: string;
  };
}

const nightData: NightMeaning[] = [
  {
    yamNumber: 1,
    nightName: "ระวิ",
    travel: {
      start: "ยามนี้มิได้ลำบากยุ่งยาก เดินทางได้ราบรื่น",
      middle: "ยามนี้ดีเลิศ มีความก้าวหน้าและโชคลาภในการเดินทาง",
      end: "ยามนี้ติดขัด มีอุปสรรคและเหตุล่าช้าในการสัญจร",
    },
  },
  {
    yamNumber: 2,
    nightName: "ศะศิ", // หรือ คะศิ
    travel: {
      start: "ยามนี้ร้อนรน ไม่สงบสุข ควรระมัดระวังความวุ่นวาย",
      middle: "ยามนี้ดีมีชัย ประสบความสำเร็จตามที่ตั้งใจไว้",
      end: "ยามนี้ดีนัก ได้รับสิ่งดีและสมประสงค์ในการเดินทาง",
    },
  },
  {
    yamNumber: 3,
    nightName: "ภุมโม",
    travel: {
      start: "ยามนี้ช้าร้าย เจ็บไข้ ได้รับความเดือดร้อนหรือเจ็บป่วยกะทันหัน",
      middle: "ยามนี้ร้อนจิต มีเรื่องให้วิตกกังวลและไม่สบายใจในระหว่างทาง",
      end: "ยามนี้ดีล้น ได้ลาภผลพูนทวีและพบกัลยาณมิตรที่ดี",
    },
  },
  {
    yamNumber: 4,
    nightName: "พุโธ", // หรือ พุทโธ
    travel: {
      start: "ยามนี้วิบัติ เกิดความเสียหาย ติดขัด ห้ามสัญจร",
      middle: "ยามนี้สมมาตร ประสบความสำเร็จ ได้ชัยชนะเด็ดขาด",
      end: "ยามนี้เหมาะสัญจร เดินทางแล้วมีชัย ได้ลาภผลตามที่ต้องการ",
    },
  },
  {
    yamNumber: 5,
    nightName: "ชีโว",
    travel: {
      start: "ยามนี้สุขา มีโชคมีลาภ เดินทางแล้วมีความสุขกายสบายใจ",
      middle: "ยามโศกเศร้า ทนทุกข์ มีเกณฑ์สูญเสียหรือเกิดเรื่องเศร้าใจ",
      end: "ยามนี้ฟังผล ทุกคนดูหมิ่นเสียมาก ไม่ควรเดินทางเพื่อเจรจาความสำคัญ",
    },
  },
  {
    yamNumber: 6,
    nightName: "ศุกโร", // หรือ ศุโกร
    travel: {
      start: "ยามนี้ไร้ค่า ความสัมพันธ์นอกใจ ไม่ควรเดินทางจากสถานที่หลัก",
      middle: "ยามนี้กึ่งกัน ครึ่งดีครึ่งเสีย เดินทางแบบประคับประคองตัว",
      end: "ยามนี้มีลาภ ได้ลาภผลเงินทอง ของกำนัลอันพึงใจ",
    },
  },
  {
    yamNumber: 7,
    nightName: "โสโร",
    travel: {
      start: "ยามนี้อัปลักษณ์ ไม่มีสิ่งดี ระวังคนพาลและการทำร้าย",
      middle: "ยามนี้ดีไซร้ สวัสดิ์มีชัย ปลอดภัยและประสบผลดี",
      end: "ยามนี้เปรมปรีดิ์ แสนสุขสยาม ลาภผลพูนทวี ดีเลิศในทุกด้าน",
    },
  },
];

export const yamNightMeaning: Record<string, NightMeaning> = {};

for (const data of nightData) {
  yamNightMeaning[data.nightName] = data;
}

// ผูกมิตรกับคำสะกดที่เป็นทางเลือก (Alternative Spellings)
yamNightMeaning["คะศิ"] = yamNightMeaning["ศะศิ"]!;
yamNightMeaning["พุทโธ"] = yamNightMeaning["พุโธ"]!;
yamNightMeaning["ศุโกร"] = yamNightMeaning["ศุกโร"]!;
