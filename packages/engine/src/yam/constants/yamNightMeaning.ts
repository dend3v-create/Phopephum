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
      start: "ยามนี้ไม่ดี ลำบากยุ่งยาก",
      middle: "ยามนี้ดีเลิศ",
      end: "ยามนี้ติดขัด",
    },
  },
  {
    yamNumber: 2,
    nightName: "ศะศิ", // หรือ คะศิ
    travel: {
      start: "ยามนี้ร้อนรน",
      middle: "ยามนี้ดีนัก มีชัย",
      end: "ยามนี้ติดขัด",
    },
  },
  {
    yamNumber: 3,
    nightName: "ภุมโม",
    travel: {
      start: "ยามนี้เข้าร้าย เจ็บไข้",
      middle: "ยามนี้ร้อนจิต",
      end: "ยามนี้ดีล้น",
    },
  },
  {
    yamNumber: 4,
    nightName: "พุโธ", // หรือ พุทโธ
    travel: {
      start: "ยามนี้วิบัติ",
      middle: "ยามนี้สมมาตร สำเร็จ เด็ดขาด",
      end: "ยามนี้เหมาะสมยาตรา มีชัย",
    },
  },
  {
    yamNumber: 5,
    nightName: "ชีโว",
    travel: {
      start: "ยามนี้สุขา ลาภมี",
      middle: "ยามโศกเศร้า ทนทุกข์",
      end: "ยามนี้พังยล ทุกคนดูหมิ่นเสียมาก",
    },
  },
  {
    yamNumber: 6,
    nightName: "ศุโกร", // หรือ ศุกโร
    travel: {
      start: "ยามนี้ไร้ค่า ผัวเมียนอกใจ ไม่ควรจากสถานที่",
      middle: "ยามนี้ กึ่งกัน",
      end: "ยามนี้มีลาภ",
    },
  },
  {
    yamNumber: 7,
    nightName: "โสโร",
    travel: {
      start: "ยามนี้อัปักษณ์ ไม่สิ่งดี ระวังคนพาล",
      middle: "ยามนี้ดีไซร้ สวัสดีมีชัย",
      end: "ยามนี้ปรีเปรม แสนสุขเกษม ลาภผลพูนทวี",
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
yamNightMeaning["ศุกโร"] = yamNightMeaning["ศุโกร"]!;
