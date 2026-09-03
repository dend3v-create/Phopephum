/**
 * ตารางสรุปอัฏฐกาลชั้นฉาย และคัมภีร์ยามอัฏฐกาล 7 ยาม
 * อ้างอิง: คัมภีร์โหราศาสตร์ไทย + ตารางสรุปอัฏฐกาลชั้นฉาย
 */

export type ChanChaiPhase = "start" | "middle" | "end";

export interface ChanChaiSubProphecy {
  text: string;
  quality: "good" | "bad" | "neutral";
  label: string; // "ยามต้น" | "ยามกลาง" | "ยามปลาย"
  subIndex: number; // 1, 2, 3
}

export interface MasterYamItem {
  yamNumber: number; // 1 - 7
  planetNumber: number; // 1 - 7
  nameDay: string; // "สุริยะ"
  nameNight: string; // "ระวิ"
  planetSymbol: string; // "☉"
  planetNameThai: string; // "พระอาทิตย์"
  planetColor: string; // "#FF6B35"
  chanChai: {
    start: ChanChaiSubProphecy;
    middle: ChanChaiSubProphecy;
    end: ChanChaiSubProphecy;
  };
  news: string;
  sickness: string;
  lostItem: string;
  travel: {
    start: string;
    middle: string;
    end: string;
  };
  bestTime: string;
}

export const ATTHAKARN_CHAN_CHAI_TABLE: MasterYamItem[] = [
  {
    yamNumber: 1,
    planetNumber: 1,
    nameDay: "สุริยะ",
    nameNight: "ระวิ",
    planetSymbol: "☉",
    planetNameThai: "พระอาทิตย์",
    planetColor: "#F59E0B",
    chanChai: {
      start: {
        text: "ยามนี้ต้องระวังคนจร จะนำพาเรื่องเดือดร้อนมาให้",
        quality: "bad",
        label: "ยามต้น",
        subIndex: 1,
      },
      middle: {
        text: "ระวังถูกสับเปลี่ยนของ แต่จะได้ของดีขึ้น",
        quality: "good",
        label: "ยามกลาง",
        subIndex: 2,
      },
      end: {
        text: "ยามนี้ร้าย จะถูกคนมาใส่ความ เข้าใจผิด โดนหักหลัง",
        quality: "bad",
        label: "ยามปลาย",
        subIndex: 3,
      },
    },
    news: "เชื่อถือได้ เป็นเรื่องจริง ทำจริง มีเรื่องร้อนใจ",
    sickness: "จะตาย",
    lostItem: "จะได้คืน ของอยู่ในที่สูง ใกล้กับสิ่งสีแดงๆ มีแสงสว่าง แสงแวววาว",
    travel: {
      start: "เดินทางไกลจะมีเคราะห์ร้าย อันตราย",
      middle: "เดินทางได้ลาภ",
      end: "เดินทางไม่ดีจะมีเคราะห์ร้าย เสื่อมเสียศักดิ์ศรี",
    },
    bestTime: "ยามกลาง",
  },
  {
    yamNumber: 2,
    planetNumber: 2,
    nameDay: "จันเทา",
    nameNight: "คะศิ",
    planetSymbol: "☽",
    planetNameThai: "พระจันทร์",
    planetColor: "#E2E8F0",
    chanChai: {
      start: {
        text: "ทำดีแต่ถูกนินทาว่าร้าย ทำอะไรโดนเอาเปรียบ",
        quality: "bad",
        label: "ยามต้น",
        subIndex: 1,
      },
      middle: {
        text: "ยามนี้การเดินทางจะให้ลาภผล แต่ให้ระวังของหาย",
        quality: "good",
        label: "ยามกลาง",
        subIndex: 2,
      },
      end: {
        text: "ระวังเหตุจะเกิดข้นกับเด็ก เรื่องเก่าก่อนที่ไม่ลงรอยกัน",
        quality: "bad",
        label: "ยามปลาย",
        subIndex: 3,
      },
    },
    news: "จริงครึ่ง เท็จครึ่ง พูดด้วยอารมณ์อ่อนไหว มีจิตมารยา พูดกลับไปกลับมา",
    sickness: "รักษานาน เป็นๆ หายๆ รักษาไม่หายขาดเป็นตายเท่ากัน",
    lostItem: "อยู่ในน้ำ หรือที่ชื้นและอาจได้คืนช้า หรือไม่ได้คืน",
    travel: {
      start: "เดินทางไกล ให้ระวังจะประสบอุบัติเหตุ",
      middle: "เดินทางไกลได้ลาภ แต่ห้ามเดินทางเพราะจะมีเคราะห์ร้าย เสียทรัพย์สิน",
      end: "ห้ามเดินทางไกล จะมีเคราะห์ร้าย เสียทรัพย์สิน",
    },
    bestTime: "ยามกลาง",
  },
  {
    yamNumber: 3,
    planetNumber: 3,
    nameDay: "ภุมมะ",
    nameNight: "ภุมโม",
    planetSymbol: "♂",
    planetNameThai: "พระอังคาร",
    planetColor: "#EF4444",
    chanChai: {
      start: {
        text: "ความสำคัญผิดในข้อเท็จจริง จนทำให้เดือดร้อน",
        quality: "bad",
        label: "ยามต้น",
        subIndex: 1,
      },
      middle: {
        text: "เรื่องอาฆาตมาดร้าย การยื้อแย่งทรัพย์สมบัติ สิ่งของ",
        quality: "bad",
        label: "ยามกลาง",
        subIndex: 2,
      },
      end: {
        text: "การลงทุนที่ได้ผลกำไรเกินคาด การแปรรูปคดี",
        quality: "good",
        label: "ยามปลาย",
        subIndex: 3,
      },
    },
    news: "เป็นเรื่องเท็จ เชื่อถือไม่ได้",
    sickness: "จะหาย เป็นเร็ว หายเร็ว ไม่ตายง่าย",
    lostItem: "ไม่ได้คืน อาจอยู่ใกล้เครื่องใช้ไฟฟ้า ศาสตราวุธ ของมีคม เครื่องมือต่างๆ",
    travel: {
      start: "เดินทางมีเคราะห์ร้าย ในต้นอุบัติเหตุ",
      middle: "เดินทางไกลจะเกิดไฟไหม้ ถูกโจรปล้นทรัพย์สิน",
      end: "เดินทางไกลได้ลาภเป็นเงินเป็นทองมากมาย",
    },
    bestTime: "ยามปลาย",
  },
  {
    yamNumber: 4,
    planetNumber: 4,
    nameDay: "พุทธะ",
    nameNight: "พุทโธ",
    planetSymbol: "☿",
    planetNameThai: "พระพุธ",
    planetColor: "#10B981",
    chanChai: {
      start: {
        text: "การกระทำอะไรเกินพลกำลัง จะนำมาซึ่งการปัญหา",
        quality: "bad",
        label: "ยามต้น",
        subIndex: 1,
      },
      middle: {
        text: "ยามนี้เกี่ยวข้องกับการอาสานาย จะได้รับผลรางวัล",
        quality: "good",
        label: "ยามกลาง",
        subIndex: 2,
      },
      end: {
        text: "ยามนี้เป็นยามอาสา ไม่ได้รางวัล แต่ได้ความไว้วางใจ",
        quality: "good",
        label: "ยามปลาย",
        subIndex: 3,
      },
    },
    news: "เป็นเรื่องจริง เชื่อถือได้",
    sickness: "จะตาย (หากรักษาด้วยยาสมุนไพร หรือของที่หาได้จากธรรมชาติ มีโอกาสรอดบ้าง)",
    lostItem: "จะได้คืน อยู่แถวเสื้อผ้า กองกระดาษ เครื่องมือสื่อสาร ในครัว หรือต้องถามหาจากคนในบ้าน อาจมีผู้เก็บรักษาไว้ให้",
    travel: {
      start: "เดินทางไกลๆ จะมีเคราะห์ร้าย ติดขัดไปหมดทุกทาง",
      middle: "เดินทางได้ลาภเงินทองจำนวนมาก พบปะ",
      end: "เดินทางได้ลาภมากมาย เจรจาความกับผู้ใหญ่",
    },
    bestTime: "ยามกลาง และยามปลาย",
  },
  {
    yamNumber: 5,
    planetNumber: 5,
    nameDay: "ครู",
    nameNight: "ชีโว",
    planetSymbol: "♃",
    planetNameThai: "พระพฤหัสบดี",
    planetColor: "#EAB308",
    chanChai: {
      start: {
        text: "ยามนี้เหมาะแก่การช่วงชิง หรือการฟ้องร้องคดี",
        quality: "good",
        label: "ยามต้น",
        subIndex: 1,
      },
      middle: {
        text: "ห้ามเดินทาง ระวังโรคระบาด อุบัติเหตุ การตาย",
        quality: "bad",
        label: "ยามกลาง",
        subIndex: 2,
      },
      end: {
        text: "ระวังการพูดจาจะนำพาความเดือดร้อน",
        quality: "bad",
        label: "ยามปลาย",
        subIndex: 3,
      },
    },
    news: "จริงเท่าเทียมกัน อย่าพึงเชื่อ",
    sickness: "เป็นๆ หายๆ ต้องใช้ยาเป็นประจำ (ถ้าป่วยหนัก เป็นตายเท่ากัน)",
    lostItem: "จะได้คืน หรือไม่ได้เท่ากัน อาจจะอยู่ใกล้ตู้ยา เครื่องมือแพทย์ ตำรา หนังสือต่างๆ ใกล้สิ่งศักดิ์สิทธิ์",
    travel: {
      start: "เดินทางไกลได้ลาภมากมาย มิตรนำลาภมาให้",
      middle: "เดินทางไกลจะเสียผลประโยชน์ ติดขัด เจรจา",
      end: "เดินทางไกลจะเสียผลประโยชน์ จำนวนมาก เจอ",
    },
    bestTime: "ยามต้น",
  },
  {
    yamNumber: 6,
    planetNumber: 6,
    nameDay: "ศุกระ",
    nameNight: "ศุโกร",
    planetSymbol: "♀",
    planetNameThai: "พระศุกร์",
    planetColor: "#EC4899",
    chanChai: {
      start: {
        text: "การทะเลาะวิวาทชู้สาว ระวังเรื่องเด็กถูกทำร้าย",
        quality: "bad",
        label: "ยามต้น",
        subIndex: 1,
      },
      middle: {
        text: "ห้ามชายหญิง เดินทางพร้อมกัน",
        quality: "bad",
        label: "ยามกลาง",
        subIndex: 2,
      },
      end: {
        text: "ยามนี้ดีที่สุด การลงทุน และการวางแผนจะสำเร็จ",
        quality: "good",
        label: "ยามปลาย",
        subIndex: 3,
      },
    },
    news: "เป็นเรื่องไม่จริง เชื่อถือไม่ได้",
    sickness: "ไม่ตาย หายได้เร็ว ขึ้นอยู่กับกำลังใจของคนไข้",
    lostItem: "ไม่ได้คืน อาจจะถูกเปลี่ยนเป็นเงิน หรือให้ต่อไปแล้ว (ลองหาดูในกระเป๋าสตางค์ โต๊ะ เครื่องแป้ง ในห้องนอน ตาม...)",
    travel: {
      start: "ห้ามเดินทางไกล จะมีเคราะห์ร้าย การสูญเสีย",
      middle: "ห้ามเดินทางไกล แม้จะได้ลาภมากก็จะหมดไป หรือ",
      end: "เดินทางไกลได้ลาภมากมาย พบมิตร และ",
    },
    bestTime: "ยามปลาย",
  },
  {
    yamNumber: 7,
    planetNumber: 7,
    nameDay: "เสารี",
    nameNight: "โสโร",
    planetSymbol: "♄",
    planetNameThai: "พระเสาร์",
    planetColor: "#8B5CF6",
    chanChai: {
      start: {
        text: "ยามนี้ต้องอยู่นิ่ง ดูสถานการณ์ ไม่ควรไปไหน",
        quality: "bad",
        label: "ยามต้น",
        subIndex: 1,
      },
      middle: {
        text: "การที่ได้ลาภแบบไม่คาดฝัน โดยเหตุบังเอิญ",
        quality: "good",
        label: "ยามกลาง",
        subIndex: 2,
      },
      end: {
        text: "การเดินทางจะได้ลาภ ส่วนของหายจะได้คืน",
        quality: "good",
        label: "ยามปลาย",
        subIndex: 3,
      },
    },
    news: "เป็นเรื่องจริง เชื่อถือได้",
    sickness: "จะตาย หรือต้องรักษานานมาก",
    lostItem: "จะได้คืน ให้ค้นหาตามที่มืดๆ ใกล้ของสีดำๆ ของสกปรก ท่อระบายน้ำ เตาไฟ ถ่าน",
    travel: {
      start: "ห้ามเดินทางไกล จะพบศัตรู จะเดือดร้อน",
      middle: "เดินทางดีมาก ได้ลาภจำนวนมากมาย",
      end: "เดินทางไกลได้ลาภ เงินทอง กำนัล",
    },
    bestTime: "ยามกลาง และยามปลาย",
  },
];

export interface BestTimeSummaryItem {
  yams: string;
  yamNumbers: number[];
  bestTime: string;
  bestTimeShort: "ยามต้น" | "ยามกลาง" | "ยามปลาย" | "ยามกลาง และยามปลาย";
  description: string;
}

export const YAM_BEST_TIMES_SUMMARY: BestTimeSummaryItem[] = [
  {
    yams: "ยาม ๑ (สุริยะ/ระวิ) และ ยาม ๒ (จันเทา/คะศิ)",
    yamNumbers: [1, 2],
    bestTime: "ยามกลาง",
    bestTimeShort: "ยามกลาง",
    description: "ช่วงนาทีที่ 31-60 ของยาม เป็นช่วงเวลาที่ดีเลิศและให้พลังงานสูงสุด",
  },
  {
    yams: "ยาม ๓ (ภุมมะ/ภุมโม) และ ยาม ๖ (ศุกระ/ศุโกร)",
    yamNumbers: [3, 6],
    bestTime: "ยามปลาย",
    bestTimeShort: "ยามปลาย",
    description: "ช่วงนาทีที่ 61-90 ของยาม เป็นช่วงเวลาแห่งความสำเร็จและการลงทุนที่ดีเลิศ",
  },
  {
    yams: "ยาม ๔ (พุทธะ/พุทโธ) และ ยาม ๗ (เสารี/โสโร)",
    yamNumbers: [4, 7],
    bestTime: "ยามกลาง และยามปลาย",
    bestTimeShort: "ยามกลาง และยามปลาย",
    description: "ช่วงนาทีที่ 31-90 ของยาม มีความมงคลต่อเนื่องทั้งการเจรจาและการเดินทาง",
  },
  {
    yams: "ยาม ๕ (ครู/ชีโว)",
    yamNumbers: [5],
    bestTime: "ยามต้น",
    bestTimeShort: "ยามต้น",
    description: "ช่วงนาทีที่ 0-30 แรกของยาม ให้ลาภผล มิตรภาพ และการเริ่มต้นที่ดีที่สุด",
  },
];

export const YAM_RULES_NOTE = {
  title: "หมายเหตุ & หลักการคำนวณยามอัฏฐกาล",
  intro:
    "เมื่อมีความจำเป็นต้องออกเดินทางหรือทำธุระใด เพื่อให้ได้ผลดี ท่านให้เลือกเวลาในช่วงที่ดีของแต่ละยามดังนี้ ในยามหนึ่งๆ จะมี ๑ ชั่วโมง ๓๐ นาที แบ่งออกเป็น ๓ ตอน คือ ยามต้น ยามกลาง ยามปลาย ตอนละ ๓๐ นาที",
  points: [
    "ชื่อของยามในแต่ละวันจะเริ่มต้นจากดาวประจำวันนั้นและจบลงด้วยดาวเดิมเสมอ",
    "วิธีจำง่ายๆ คือ ยามกลางวันเป็นระบบ +๔ ถ้าเกิน ๗ เอา ๗ ลบ  /  ยามกลางคืนเป็นระบบ +๔ ถ้าเกิน ๗ เอา ๗ ลบ",
    "ชื่อของยามกลางวันกับกลางคืนจะเรียกต่างกัน เพื่อเป็นข้อสังเกต",
  ],
};

export interface SubTimeSlotItem {
  majorYam: number; // 1 - 8
  majorRangeLabel: string; // "06.01-07.30 น."
  subPhase: ChanChaiPhase;
  subPhaseLabel: "ยามต้น" | "ยามกลาง" | "ยามปลาย";
  startTime: string; // "06.01"
  endTime: string; // "06.30"
  timeRangeLabel: string; // "06.01 - 06.30 น."
}

export const DAY_SUB_TIME_SLOTS_24: SubTimeSlotItem[] = [
  // ยาม 1: 06.01-07.30 น.
  { majorYam: 1, majorRangeLabel: "06.01-07.30 น.", subPhase: "start", subPhaseLabel: "ยามต้น", startTime: "06.01", endTime: "06.30", timeRangeLabel: "06.01 - 06.30 น." },
  { majorYam: 1, majorRangeLabel: "06.01-07.30 น.", subPhase: "middle", subPhaseLabel: "ยามกลาง", startTime: "06.31", endTime: "07.00", timeRangeLabel: "06.31 - 07.00 น." },
  { majorYam: 1, majorRangeLabel: "06.01-07.30 น.", subPhase: "end", subPhaseLabel: "ยามปลาย", startTime: "07.01", endTime: "07.30", timeRangeLabel: "07.01 - 07.30 น." },

  // ยาม 2: 07.31-09.00 น.
  { majorYam: 2, majorRangeLabel: "07.31-09.00 น.", subPhase: "start", subPhaseLabel: "ยามต้น", startTime: "07.31", endTime: "08.00", timeRangeLabel: "07.31 - 08.00 น." },
  { majorYam: 2, majorRangeLabel: "07.31-09.00 น.", subPhase: "middle", subPhaseLabel: "ยามกลาง", startTime: "08.01", endTime: "08.30", timeRangeLabel: "08.01 - 08.30 น." },
  { majorYam: 2, majorRangeLabel: "07.31-09.00 น.", subPhase: "end", subPhaseLabel: "ยามปลาย", startTime: "08.31", endTime: "09.00", timeRangeLabel: "08.31 - 09.00 น." },

  // ยาม 3: 09.01-10.30 น.
  { majorYam: 3, majorRangeLabel: "09.01-10.30 น.", subPhase: "start", subPhaseLabel: "ยามต้น", startTime: "09.01", endTime: "09.30", timeRangeLabel: "09.01 - 09.30 น." },
  { majorYam: 3, majorRangeLabel: "09.01-10.30 น.", subPhase: "middle", subPhaseLabel: "ยามกลาง", startTime: "09.31", endTime: "10.00", timeRangeLabel: "09.31 - 10.00 น." },
  { majorYam: 3, majorRangeLabel: "09.01-10.30 น.", subPhase: "end", subPhaseLabel: "ยามปลาย", startTime: "10.01", endTime: "10.30", timeRangeLabel: "10.01 - 10.30 น." },

  // ยาม 4: 10.31-12.00 น.
  { majorYam: 4, majorRangeLabel: "10.31-12.00 น.", subPhase: "start", subPhaseLabel: "ยามต้น", startTime: "10.31", endTime: "11.00", timeRangeLabel: "10.31 - 11.00 น." },
  { majorYam: 4, majorRangeLabel: "10.31-12.00 น.", subPhase: "middle", subPhaseLabel: "ยามกลาง", startTime: "11.01", endTime: "11.30", timeRangeLabel: "11.01 - 11.30 น." },
  { majorYam: 4, majorRangeLabel: "10.31-12.00 น.", subPhase: "end", subPhaseLabel: "ยามปลาย", startTime: "11.31", endTime: "12.00", timeRangeLabel: "11.31 - 12.00 น." },

  // ยาม 5: 12.01-13.30 น.
  { majorYam: 5, majorRangeLabel: "12.01-13.30 น.", subPhase: "start", subPhaseLabel: "ยามต้น", startTime: "12.01", endTime: "12.30", timeRangeLabel: "12.01 - 12.30 น." },
  { majorYam: 5, majorRangeLabel: "12.01-13.30 น.", subPhase: "middle", subPhaseLabel: "ยามกลาง", startTime: "12.31", endTime: "13.00", timeRangeLabel: "12.31 - 13.00 น." },
  { majorYam: 5, majorRangeLabel: "12.01-13.30 น.", subPhase: "end", subPhaseLabel: "ยามปลาย", startTime: "13.01", endTime: "13.30", timeRangeLabel: "13.01 - 13.30 น." },

  // ยาม 6: 13.31-15.00 น.
  { majorYam: 6, majorRangeLabel: "13.31-15.00 น.", subPhase: "start", subPhaseLabel: "ยามต้น", startTime: "13.31", endTime: "14.00", timeRangeLabel: "13.31 - 14.00 น." },
  { majorYam: 6, majorRangeLabel: "13.31-15.00 น.", subPhase: "middle", subPhaseLabel: "ยามกลาง", startTime: "14.01", endTime: "14.30", timeRangeLabel: "14.01 - 14.30 น." },
  { majorYam: 6, majorRangeLabel: "13.31-15.00 น.", subPhase: "end", subPhaseLabel: "ยามปลาย", startTime: "14.31", endTime: "15.00", timeRangeLabel: "14.31 - 15.00 น." },

  // ยาม 7: 15.01-16.30 น.
  { majorYam: 7, majorRangeLabel: "15.01-16.30 น.", subPhase: "start", subPhaseLabel: "ยามต้น", startTime: "15.01", endTime: "15.30", timeRangeLabel: "15.01 - 15.30 น." },
  { majorYam: 7, majorRangeLabel: "15.01-16.30 น.", subPhase: "middle", subPhaseLabel: "ยามกลาง", startTime: "15.31", endTime: "16.00", timeRangeLabel: "15.31 - 16.00 น." },
  { majorYam: 7, majorRangeLabel: "15.01-16.30 น.", subPhase: "end", subPhaseLabel: "ยามปลาย", startTime: "16.01", endTime: "16.30", timeRangeLabel: "16.01 - 16.30 น." },

  // ยาม 8: 16.31-18.00 น.
  { majorYam: 8, majorRangeLabel: "16.31-18.00 น.", subPhase: "start", subPhaseLabel: "ยามต้น", startTime: "16.31", endTime: "17.00", timeRangeLabel: "16.31 - 17.00 น." },
  { majorYam: 8, majorRangeLabel: "16.31-18.00 น.", subPhase: "middle", subPhaseLabel: "ยามกลาง", startTime: "17.01", endTime: "17.30", timeRangeLabel: "17.01 - 17.30 น." },
  { majorYam: 8, majorRangeLabel: "16.31-18.00 น.", subPhase: "end", subPhaseLabel: "ยามปลาย", startTime: "17.31", endTime: "18.00", timeRangeLabel: "17.31 - 18.00 น." },
];

export const NIGHT_SUB_TIME_SLOTS_24: SubTimeSlotItem[] = [
  // ยาม 1: 18.01-19.30 น.
  { majorYam: 1, majorRangeLabel: "18.01-19.30 น.", subPhase: "start", subPhaseLabel: "ยามต้น", startTime: "18.01", endTime: "18.30", timeRangeLabel: "18.01 - 18.30 น." },
  { majorYam: 1, majorRangeLabel: "18.01-19.30 น.", subPhase: "middle", subPhaseLabel: "ยามกลาง", startTime: "18.31", endTime: "19.00", timeRangeLabel: "18.31 - 19.00 น." },
  { majorYam: 1, majorRangeLabel: "18.01-19.30 น.", subPhase: "end", subPhaseLabel: "ยามปลาย", startTime: "19.01", endTime: "19.30", timeRangeLabel: "19.01 - 19.30 น." },

  // ยาม 2: 19.31-21.00 น.
  { majorYam: 2, majorRangeLabel: "19.31-21.00 น.", subPhase: "start", subPhaseLabel: "ยามต้น", startTime: "19.31", endTime: "20.00", timeRangeLabel: "19.31 - 20.00 น." },
  { majorYam: 2, majorRangeLabel: "19.31-21.00 น.", subPhase: "middle", subPhaseLabel: "ยามกลาง", startTime: "20.01", endTime: "20.30", timeRangeLabel: "20.01 - 20.30 น." },
  { majorYam: 2, majorRangeLabel: "19.31-21.00 น.", subPhase: "end", subPhaseLabel: "ยามปลาย", startTime: "20.31", endTime: "21.00", timeRangeLabel: "20.31 - 21.00 น." },

  // ยาม 3: 21.01-22.30 น.
  { majorYam: 3, majorRangeLabel: "21.01-22.30 น.", subPhase: "start", subPhaseLabel: "ยามต้น", startTime: "21.01", endTime: "21.30", timeRangeLabel: "21.01 - 21.30 น." },
  { majorYam: 3, majorRangeLabel: "21.01-22.30 น.", subPhase: "middle", subPhaseLabel: "ยามกลาง", startTime: "21.31", endTime: "22.00", timeRangeLabel: "21.31 - 22.00 น." },
  { majorYam: 3, majorRangeLabel: "21.01-22.30 น.", subPhase: "end", subPhaseLabel: "ยามปลาย", startTime: "22.01", endTime: "22.30", timeRangeLabel: "22.01 - 22.30 น." },

  // ยาม 4: 22.31-24.00 น.
  { majorYam: 4, majorRangeLabel: "22.31-24.00 น.", subPhase: "start", subPhaseLabel: "ยามต้น", startTime: "22.31", endTime: "23.00", timeRangeLabel: "22.31 - 23.00 น." },
  { majorYam: 4, majorRangeLabel: "22.31-24.00 น.", subPhase: "middle", subPhaseLabel: "ยามกลาง", startTime: "23.01", endTime: "23.30", timeRangeLabel: "23.01 - 23.30 น." },
  { majorYam: 4, majorRangeLabel: "22.31-24.00 น.", subPhase: "end", subPhaseLabel: "ยามปลาย", startTime: "23.31", endTime: "24.00", timeRangeLabel: "23.31 - 24.00 น." },

  // ยาม 5: 00.01-01.30 น.
  { majorYam: 5, majorRangeLabel: "00.01-01.30 น.", subPhase: "start", subPhaseLabel: "ยามต้น", startTime: "00.01", endTime: "00.30", timeRangeLabel: "00.01 - 00.30 น." },
  { majorYam: 5, majorRangeLabel: "00.01-01.30 น.", subPhase: "middle", subPhaseLabel: "ยามกลาง", startTime: "00.31", endTime: "01.00", timeRangeLabel: "00.31 - 01.00 น." },
  { majorYam: 5, majorRangeLabel: "00.01-01.30 น.", subPhase: "end", subPhaseLabel: "ยามปลาย", startTime: "01.01", endTime: "01.30", timeRangeLabel: "01.01 - 01.30 น." },

  // ยาม 6: 01.31-03.00 น.
  { majorYam: 6, majorRangeLabel: "01.31-03.00 น.", subPhase: "start", subPhaseLabel: "ยามต้น", startTime: "01.31", endTime: "02.00", timeRangeLabel: "01.31 - 02.00 น." },
  { majorYam: 6, majorRangeLabel: "01.31-03.00 น.", subPhase: "middle", subPhaseLabel: "ยามกลาง", startTime: "02.01", endTime: "02.30", timeRangeLabel: "02.01 - 02.30 น." },
  { majorYam: 6, majorRangeLabel: "01.31-03.00 น.", subPhase: "end", subPhaseLabel: "ยามปลาย", startTime: "02.31", endTime: "03.00", timeRangeLabel: "02.31 - 03.00 น." },

  // ยาม 7: 03.01-04.30 น.
  { majorYam: 7, majorRangeLabel: "03.01-04.30 น.", subPhase: "start", subPhaseLabel: "ยามต้น", startTime: "03.01", endTime: "03.30", timeRangeLabel: "03.01 - 03.30 น." },
  { majorYam: 7, majorRangeLabel: "03.01-04.30 น.", subPhase: "middle", subPhaseLabel: "ยามกลาง", startTime: "03.31", endTime: "04.00", timeRangeLabel: "03.31 - 04.00 น." },
  { majorYam: 7, majorRangeLabel: "03.01-04.30 น.", subPhase: "end", subPhaseLabel: "ยามปลาย", startTime: "04.01", endTime: "04.30", timeRangeLabel: "04.01 - 04.30 น." },

  // ยาม 8: 04.31-06.00 น.
  { majorYam: 8, majorRangeLabel: "04.31-06.00 น.", subPhase: "start", subPhaseLabel: "ยามต้น", startTime: "04.31", endTime: "05.00", timeRangeLabel: "04.31 - 05.00 น." },
  { majorYam: 8, majorRangeLabel: "04.31-06.00 น.", subPhase: "middle", subPhaseLabel: "ยามกลาง", startTime: "05.01", endTime: "05.30", timeRangeLabel: "05.01 - 05.30 น." },
  { majorYam: 8, majorRangeLabel: "04.31-06.00 น.", subPhase: "end", subPhaseLabel: "ยามปลาย", startTime: "05.31", endTime: "06.00", timeRangeLabel: "05.31 - 06.00 น." },
];

/**
 * ดึงข้อมูลคัมภีร์ยามและชั้นฉายตามหมายเลขยาม (1 - 7) หรือชื่อยาม
 */
export function getChanChaiItem(identifier: number | string): MasterYamItem | undefined {
  if (typeof identifier === "number") {
    return ATTHAKARN_CHAN_CHAI_TABLE.find((item) => item.yamNumber === identifier);
  }

  const cleanName = identifier.trim();
  return ATTHAKARN_CHAN_CHAI_TABLE.find(
    (item) =>
      item.nameDay === cleanName ||
      item.nameNight === cleanName ||
      (cleanName === "สุริชะ" && item.nameDay === "สุริยะ") ||
      (cleanName === "ศะศิ" && item.nameNight === "คะศิ") ||
      (cleanName === "จันทรา" && item.nameDay === "จันเทา") ||
      (cleanName === "จันทา" && item.nameDay === "จันเทา") ||
      (cleanName === "พุธะ" && item.nameDay === "พุทธะ") ||
      (cleanName === "พุโธ" && item.nameNight === "พุทโธ") ||
      (cleanName === "ศุโกร" && item.nameNight === "ศุโกร")
  );
}

/**
 * ดึงคำทำนายชั้นฉาย (ยามต้น / ยามกลาง / ยามปลาย)
 */
export function getChanChaiProphecy(
  identifier: number | string,
  phase: ChanChaiPhase = "middle"
): ChanChaiSubProphecy | undefined {
  const item = getChanChaiItem(identifier);
  if (!item) return undefined;
  return item.chanChai[phase];
}
