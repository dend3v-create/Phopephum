import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getCurrentYam,
  calculateMoonPhase,
  getSunTimes,
  getYamPrediction
} from '@phopephum/engine';

// ─── Constants & Styling Constants ───────────────────────────────────────────
const THEME = {
  bg: '#020617',
  gold: '#C6A96B',
  mystic: '#4B6FAE',
  text: '#F8F6F1',
  textMuted: '#8A8070',
  cardBg: 'rgba(10, 34, 64, 0.6)',
  border: 'rgba(198, 169, 107, 0.2)'
};

const PLANET_SYMBOLS: Record<string, string> = {
  สุริยะ: "☉", ระวิ:  "☉", อาทิตย์: "☉",
  จันเทา: "☽", คะศิ:  "☽", จันทร์: "☽",
  ภุมมะ:  "♂", ภุมโม: "♂", อังคาร: "♂",
  พุทธะ:  "☿", พุทโธ: "☿", พุธ: "☿",
  ครู:    "♃", ชีโว:  "♃", พฤหัสบดี: "♃", พฤหัส: "♃",
  ศุกระ:  "♀", ศุโกร: "♀", ศุกร์: "♀",
  เสารี:  "♄", โสโร:  "♄", เสาร์: "♄",
};

const LEVEL_COLORS: Record<string, string> = {
  excellent: '#10B981', // green
  very_good: '#10B981', // green
  good: '#3B82F6',      // blue
  neutral: '#FBBF24',   // amber
  bad: '#EF4444'        // red
};

const LEVEL_LABELS: Record<string, string> = {
  excellent: 'ดีเยี่ยมที่สุด',
  very_good: 'ดีมาก',
  good: 'ดี',
  neutral: 'ปานกลาง',
  bad: 'ควรระวัง'
};

// ─── Topic Wise Advice Mapping ───────────────────────────────────────────────
interface TopicAdvice {
  score: number;
  ratingText: string;
  description: string;
  shouldDo: string[];
  shouldAvoid: string[];
  speechTemplate: string;
}

function getTopicAdvice(topic: "love" | "trade" | "negotiate" | "travel", yamName: string, ticks: number): TopicAdvice {
  if (topic === "travel") {
    let score = 68;
    let ratingText = "ค่อนข้างเหมาะสม";
    let desc = "ยามมงคลระดับดี สามารถเริ่มต้นเดินทางสัญจรได้ทั่วไป";
    let shouldDo = ["เริ่มต้นสัญจรอย่างมีสติ", "จัดสัมภาระและตรวจยานพาหนะให้เรียบร้อย"];
    let shouldAvoid = ["ความใจร้อนเร่งรีบขณะขับขี่", "การเริ่มต้นเดินทางในจุดอับโชค"];
    
    if (ticks === 3) {
      score = 98;
      ratingText = "ดีเยี่ยมที่สุด";
      desc = "ฤกษ์มหามงคลในการเดินทางสัญจร ท่องเที่ยว หรือติดต่อการงานแดนไกล ประสบผลสำเร็จอย่างงดงาม ปลอดภัยและมีโชคลาภพูนทวี";
      shouldDo = ["เริ่มต้นทริปสำคัญ", "ออกยานพาหนะใหม่", "สัญจรติดต่อการค้าทางไกล"];
      shouldAvoid = ["การโลเลลังเลในการออกเดินทาง", "การใช้อารมณ์ขัดแย้งขณะออกสตาร์ท"];
    } else if (ticks === 2) {
      score = 88;
      ratingText = "ดีเยี่ยมมาก";
      desc = "ฤกษ์สัญจรเป็นมงคลยิ่ง เหมาะสมสำหรับทริปครอบครัวหรือการสัญจรติดต่อธุรกิจทั่วไป ไร้อุปสรรคขัดขวาง";
      shouldDo = ["เจรจาตกลงข้อแลกเปลี่ยนระหว่างทาง", "ออกเดินทางข้ามจังหวัด", "สัญจรพบปะกัลยาณมิตร"];
      shouldAvoid = ["ความเกียจคร้านล่าช้าในการเริ่มต้น", "การสัญจรในเส้นทางที่มีความเสี่ยงสูง"];
    } else if (ticks === 0) {
      score = 35;
      ratingText = "ติดขัดควรระวัง";
      desc = "ยามติดขัดตามตำราฤกษ์สัญจร มีเกณฑ์ล่าช้า ประสบอุปสรรคขัดขวาง หรือมีอุบัติเหตุเกิดขึ้นได้ง่ายเป็นพิเศษ";
      shouldDo = ["เลื่อนเวลาเดินทางออกไปหากทำได้", "ตรวจเช็คสภาพความปลอดภัยของรถยนต์อย่างละเอียด", "ตั้งสติและสวดมนต์แผ่เมตตาก่อนสัญจร"];
      shouldAvoid = ["การขับขี่รถด้วยความเร็วสูงหรือประมาท", "การเริ่มต้นออกทริปไกลครั้งสำคัญในยามนี้"];
    }

    return {
      score, ratingText, description: desc, shouldDo, shouldAvoid,
      speechTemplate: "ขอให้การเดินทางครั้งนี้เป็นทริปมหาเฮง ปลอดภัยตลอดเส้นทาง และประสบผลสำเร็จสมเจตนารมณ์ทุกประการค่ะ",
    };
  }

  let planet = 4; // default พุธ
  if (["สุริยะ", "ระวิ", "อาทิตย์"].includes(yamName)) planet = 1;
  else if (["จันเทา", "จันทรา", "คะศิ", "ศะศิ", "จันทร์"].includes(yamName)) planet = 2;
  else if (["ภุมมะ", "ภูมมะ", "ภุมโม", "อังคาร"].includes(yamName)) planet = 3;
  else if (["พุทธะ", "พุธ", "พุทโธ", "พุโธ"].includes(yamName)) planet = 4;
  else if (["ครู", "ชีโว", "พฤหัส", "พฤหัสบดี"].includes(yamName)) planet = 5;
  else if (["ศุกระ", "ศุโกร", "ศุกโร", "ศุกร์"].includes(yamName)) planet = 6;
  else if (["เสารี", "เสาร์", "โสโร"].includes(yamName)) planet = 7;

  const mapping: Record<number, Record<"love" | "trade" | "negotiate", TopicAdvice>> = {
    1: {
      love: {
        score: 68, ratingText: "ค่อนข้างเหมาะสม",
        description: "ยามพลังสุริยเทพเน้นความจริงจังและตรงไปตรงมา การปรับความเข้าใจจะดีหากเปิดเผยความจริง แต่ต้องระวังอารมณ์ถือทิฐิตัวเอง",
        shouldDo: ["พูดคุยอธิบายด้วยความสัตย์จริง", "ให้เกียรติและรับรองความสำคัญของอีกฝ่าย"],
        shouldAvoid: ["การแสดงอำนาจควบคุมหรือข่มอีกฝ่าย", "การประชดประชันทำลายศักดิ์ศรี"],
        speechTemplate: "เราขอโทษจากใจจริงนะ... สิ่งที่ผิดพลาดไปเราสัญญาว่าจะปรับปรุงตัวอย่างดีที่สุด และอยากให้เราจับมือแก้มันไปด้วยกัน",
      },
      trade: {
        score: 88, ratingText: "เหมาะสมมาก",
        description: "ยามดีในการดีลลูกค้ารายใหญ่ ขายสินค้าเกรดหรูหราพรีเมียม หรือเจรจาค้าขายของมีมูลค่าสูงเด่น",
        shouldDo: ["นำเสนอตัวอย่างสินค้าที่ดูดีมีระดับ", "แสดงความเชี่ยวชาญและความเป็นมืออาชีพเด่นชัด"],
        shouldAvoid: ["การลดราคามากเกินไปจนเสียมูลค่าแบรนด์", "การลังเลใจในการเสนอข้อตกลง"],
        speechTemplate: "นี่คือแพ็กเกจที่ดีที่สุดและคุ้มค่าที่สุดที่เราคัดสรรมาให้แบรนด์ของคุณโดยเฉพาะครับ มั่นใจได้ในมาตรฐานสูงสุด",
      },
      negotiate: {
        score: 92, ratingText: "ดีเยี่ยมที่สุด",
        description: "ยามมหามงคลในการนำเสนอแผนงานใหญ่ เข้าพบผู้ใหญ่ผู้มีอิทธิพล หรือประกวดแข่งขันเพื่อรับชัยชนะเด่น",
        shouldDo: ["แถลงแผนงานด้วยความเด็ดขาดมั่นใจ", "นำเสนอผลงานด้วยสถิติและวิสัยทัศน์ที่กว้างไกล"],
        shouldAvoid: ["การโต้เถียงแบบใช้อารมณ์โกรธ", "การขาดเตรียมความพร้อมของเอกสารสำคัญ"],
        speechTemplate: "โครงการนี้ได้รับการศึกษาและวางกรอบการดำเนินงานมาอย่างรัดกุม เพื่อประโยชน์สูงสุดในระยะยาวขององค์กรเราครับ",
      }
    },
    2: {
      love: {
        score: 95, ratingText: "เหมาะสมที่สุด (แนะนำ ✨)",
        description: "ยามเมตตามหาเสน่ห์อย่างสูง บรรยากาศนุ่มนวลอบอุ่น เหมาะแก่การปรับความเข้าใจ ง้อแฟน หรือเริ่มต้นเปิดใจพูดคุยสิ่งลึกซึ้ง",
        shouldDo: ["เริ่มต้นพูดคุยด้วยน้ำเสียงอ่อนโยน", "แสดงความอ่อนหวาน ใส่ใจในความรู้สึกเป็นพิเศษ", "มีของขวัญชิ้นเล็กหรือของโปรดมามอบให้"],
        shouldAvoid: ["การหยิบยกเรื่องอดีตหรือข้อผิดพลาดเก่าขึ้นมาทวงถาม", "การมีท่าทีเฉยเมยหรือเย็นชา"],
        speechTemplate: "เราคิดถึงความรู้สึกของเธอตลอดเลยนะ... เราไม่อยากให้เราต้องเงียบใส่กันแบบนี้ มาเริ่มปรับความเข้าใจกันใหม่นะคนดี 💜",
      },
      trade: {
        score: 85, ratingText: "เหมาะสมมาก",
        description: "ยามดีสำหรับการค้าขายบริการ ต้อนรับลูกค้า หรือการเปิดการขายที่เน้นความประทับใจและความสัมพันธ์ที่ดีงาม",
        shouldDo: ["บริการลูกค้าด้วยความเอาใจใส่และยิ้มแย้ม", "ชักชวนสนทนาสร้างความเป็นมิตรเป็นกันเอง"],
        shouldAvoid: ["การเร่งรัดปิดการขายจนดูบีบบังคับลูกค้า", "การเสนอขายแบบไม่มีมนุษยสัมพันธ์"],
        speechTemplate: "สินค้าตัวนี้เราดูแลคัดสรรให้ลูกค้าด้วยใจเลยค่ะ สบายใจได้เลยนะคะ มีรับประกันและดูแลหลังการขายเต็มที่เลยค่ะ",
      },
      negotiate: {
        score: 80, ratingText: "เหมาะสม",
        description: "ยามดีสำหรับการประสานงาน ประนีประนอมความขัดแย้ง หรือขอความช่วยเหลือจากพันธมิตร",
        shouldDo: ["แสดงความเข้าใจในมุมมองของอีกฝ่าย", "เสนอเงื่อนไขที่เน้นการประนีประนอมยอมความ"],
        shouldAvoid: ["การใช้ท่าทีเด็ดขาดแข็งกระ้าวเกินไป", "การเซ็นสัญญาร่วมทุนขนาดใหญ่ที่มีความเสี่ยงสูง"],
        speechTemplate: "เราพร้อมรับฟังความเห็นและปรับเปลี่ยนเงื่อนไขบางจุด เพื่อให้ได้ทางออกที่สบายใจและลงตัวที่สุดสำหรับทั้งสองฝ่ายค่ะ",
      }
    },
    3: {
      love: {
        score: 42, ratingText: "ติดขัดควรเลี่ยง",
        description: "ยามทหารกล้าหรือพลังงานเดือดดาล มีโอกาสทะเลาะวิวาทหรือโต้เถียงกันรุนแรงได้ง่ายที่สุด ควรหลีกเลี่ยงการง้อแฟนในยามนี้",
        shouldDo: ["เว้นระยะห่างให้อีกฝ่ายได้สงบสติอารมณ์", "รับฟังเงียบๆ โดยไม่โต้แย้งหากถูกตำหนิ"],
        shouldAvoid: ["การท้าทายเอาชนะคะคานกันด้วยอารมณ์", "การส่งข้อความประชดประชันยาวเหยียด"],
        speechTemplate: "เราเห็นใจและเข้าใจนะว่าตอนนี้เธออาจยังโกรธอยู่ ไม่เป็นไรนะ... เรายินดีรอเวลาให้เราทั้งคู่ใจเย็นลงค่อยมาคุยกันใหม่นะ",
      },
      trade: {
        score: 70, ratingText: "ค่อนข้างเหมาะสม",
        description: "ยามพลังไฟ เหมาะสำหรับการระบายสต็อกสินค้าด่วน ค้าขายเครื่องมือฮาร์ดแวร์ อุปกรณ์ซ่อมแซม หรือของเล่นกีฬา",
        shouldDo: ["นำเสนอโปรโมชันลดราคาด่วนจำกัดเวลา", "ปิดการขายด้วยความรวดเร็วและกระฉับกระเฉง"],
        shouldAvoid: ["การเจรจาค้าขายระยะยาวที่ต้องอาศัยความพยายามสูง", "การทะเลาะเบาะแว้งกับลูกค้า"],
        speechTemplate: "โปรพิเศษตัวนี้ลดสูงสุดเฉพาะรอบวันนี้วันเดียวเท่านั้นครับ! ปิดดีลตอนนี้รับของแถมมูลค่าเพิ่มไปได้เลยทันทีครับ!",
      },
      negotiate: {
        score: 55, ratingText: "ติดขัดควรระวัง",
        description: "ยามแห่งอุปสรรคและการโต้แย้ง ไม่เหมาะสำหรับการตกลงเซ็นสัญญาร่วมทุนใดๆ แต่เหมาะสำหรับการลุยแก้ปัญหาหน้างานอย่างเร่งด่วน",
        shouldDo: ["ลงมือปฏิบัติตรวจเช็คปัญหาของหน้างาน", "แสดงความเด็ดเดี่ยวกล้าหาญในการเผชิญหน้าอุปสรรค"],
        shouldAvoid: ["การตกลงข้อเสนอที่มีความกังวลหรือไม่มั่นใจ", "การมีปากเสียงกับเพื่อนร่วมงานหรือพันธมิตร"],
        speechTemplate: "ทีมงานของเราพร้อมที่จะลุยและดำเนินการปฏิบัติการแก้ไขสถานการณ์ฉุกเฉินนี้ทันทีเพื่อผลลัพธ์ที่ดีขึ้นโดยเร็วที่สุดครับ",
      }
    },
    4: {
      love: {
        score: 80, ratingText: "เหมาะสมมาก",
        description: "ยามดาวปัญญาและการพูดคุยชี้แจง เหมาะสำหรับการปรับความเข้าใจโดยการพูดคุยด้วยเหตุและผล อธิบายความจริงอย่างประนีประนอม",
        shouldDo: ["ยกเหตุผลมาชี้แจงอย่างมีน้ำหนักและสุภาพ", "ชวนคุยแบบสบายๆ เพื่อลดบรรยากาศตึงเครียด"],
        shouldAvoid: ["การบิดเบือนข้อเท็จจริงหรือการโกหกปิดบัง", "การพูดเหน็บแนมหรือพูดจาประชดประชัน"],
        speechTemplate: "เราอยากขอโอกาสมาอธิบายเหตุผลและพูดคุยปรับความเข้าใจกันแบบเปิดอกสบายๆ นะ เรายินดีฟังสิ่งที่เธอคิดทั้งหมดเลย",
      },
      trade: {
        score: 95, ratingText: "ดีเยี่ยมที่สุด (แนะนำ ✨)",
        description: "ยามดวงดาวแห่งพ่อค้าวาณิชและการสื่อสาร ค้าขายสิ่งใดก็ได้ผลสำเร็จ ปิดยอดทะลุเป้า เจรจาลูกค้าคล่องแคล่วที่สุด",
        shouldDo: ["เขียนโฆษณาเสนอขายอย่างมีเสน่ห์ดึงดูด", "ปิดการขายแบบเน้นข้อมูลผลประโยชน์ที่ได้รับอย่างชัดเจน"],
        shouldAvoid: ["การปล่อยให้บทสนทนาเงียบเฉยเป็นเวลานาน", "การสื่อสารข้อมูลที่ผิดพลาดกุมเครือ"],
        speechTemplate: "ข้อเสนอแคมเปญสิทธิพิเศษตัวนี้จัดทำขึ้นโดยตรงเพื่อช่วยแก้ปัญหาและประหยัดงบประมาณของคุณอย่างตรงจุดที่สุดเลยครับ",
      },
      negotiate: {
        score: 98, ratingText: "ดีเยี่ยมที่สุด (แนะนำ ✨)",
        description: "ยามฤกษ์งามยามดีที่สุดในการทำสัญญา สอบสัมภาษณ์ สอบแข่งขัน เจรจาธุรกิจสำคัญ หรือเซ็นเอกสารเซ็นรับข้อตกลง",
        shouldDo: ["เตรียมข้อมูลและสถิติอ้างอิงให้พร้อมและแม่นยำ", "พูดจาฉะฉาน ชัดถ้อยชัดคำและมีมารยาทดีเลิศ"],
        shouldAvoid: ["การมาสายหรือการแสดงความประมาทเลินเล่อ", "การขาดความมั่นใจในสิ่งที่จะพูด"],
        speechTemplate: "เราได้จัดเตรียมกรอบความร่วมมือและสถิติตัวเลขทั้งหมดมาอย่างละเอียด เพื่อให้มั่นใจว่าจะเกิดประโยชน์ร่วมกันสูงสุดแน่นอนครับ",
      }
    },
    5: {
      love: {
        score: 85, ratingText: "เหมาะสมมาก",
        description: "ยามผู้หลักผู้ใหญ่และธรรมะเมตตา การปรับความเข้าใจจะสำเร็จได้ด้วยการให้เกียรติซึ่งกันและกัน และรับฟังด้วยความเห็นอกเห็นใจ",
        shouldDo: ["รับฟังอีกฝ่ายด้วยท่าทียินดีปรับปรุงตัว", "ขอคำปรึกษาจากผู้ใหญ่ที่เป็นกลางคอยช่วยเหลือ"],
        shouldAvoid: ["การพยายามทำตัวเหนือกว่าหรือสั่งสอนเทศนาอีกฝ่าย", "การแสดงท่าทีเย่อหยิ่งหัวแข็ง"],
        speechTemplate: "เราเข้าใจและน้อมรับฟังข้อติเตียนของเธอนะ... เราเห็นด้วยว่าเราควรช่วยกันแก้ไขเพื่อสร้างความรักที่ยั่งยืนแข็งแรงขึ้น",
      },
      trade: {
        score: 98, ratingText: "ดีเยี่ยมที่สุด (แนะนำ ✨)",
        description: "ยามมหามงคลโชคลาภพูนทวี เหมาะสำหรับการค้าขายของมีมูลค่า ผลงานวิชาการ สินค้ามงคล หรือตกลงการซื้อขายทรัพย์สินขนาดใหญ่",
        shouldDo: ["เน้นขายคุณภาพสินค้าและความถูกต้องของสเปก", "ให้ข้อมูลบริการอย่างซื่อสัตย์โปร่งใสและตรงไปตรงมา"],
        shouldAvoid: ["การเอาเปรียบลูกค้าหรือพูดโกหกเกินจริง", "การบริการที่ขาดความสุภาพไม่เหมาะสม"],
        speechTemplate: "สินค้าชิ้นนี้ถูกออกแบบมาด้วยการผสมผสานนวัตกรรมและความคงทนถาวร เพื่อส่งมอบผลลัพธ์ที่ดีและยั่งยืนที่สุดแก่ผู้ใช้ครับ",
      },
      negotiate: {
        score: 95, ratingText: "ดีเยี่ยมที่สุด (แนะนำ ✨)",
        description: "ยามฤกษ์มีชัยในการเข้าพบหัวหน้าผู้ใหญ่ ปรึกษางานวางแผน ขอคำแนะนำทางกฎหมาย หรือวางรากฐานการเรียนและธุรกิจ",
        shouldDo: ["เข้าหาผู้ใหญ่ด้วยมารยาทนอบน้อมสุภาพที่สุด", "เสนอข้อมูลตรงไปตรงมาด้วยความซื่อสัตย์โปร่งใส"],
        shouldAvoid: ["การเจรจาผลประโยชน์ที่ผิดกฎหมายหรือศีลธรรม", "การเร่งรัดเอาแต่ใจตนเอง"],
        speechTemplate: "แผนงานวางรากฐานโครงสร้างชิ้นนี้ตั้งอยู่บนหลักเกณฑ์ความถูกต้องและคำนึงถึงผลประโยชน์ของทุกภาคส่วนเป็นสำคัญครับ",
      }
    },
    6: {
      love: {
        score: 98, ratingText: "ดีเยี่ยมที่สุด (แนะนำ ✨)",
        description: "ยามแห่งดาวความรักและความโรแมนติกชั้นเลิศ เหมาะกับการง้อแฟน ปรับความเข้าใจ พาไปเดท ทานอาหารอร่อย หรือมอบของขวัญเซอร์ไพรส์",
        shouldDo: ["มอบช่อดอกไม้หรือของขวัญที่ประณีตพึงใจ", "สร้างบรรยากาศที่โรแมนติกผ่อนคลาย", "แสดงความเมตตารักใคร่ห่วงใยอย่างเต็มที่"],
        shouldAvoid: ["การดึงประเด็นเครียดๆ เรื่องภาระการเงินหรือปัญหาอื่นมาขัดจังหวะ", "การแต่งกายไม่เรียบร้อย"],
        speechTemplate: "ขอโทษนะคะคนดี... วันนี้เราเตรียมของที่เธอชอบที่สุดพร้อมอาหารมื้อพิเศษไว้รอ หวังว่าจะช่วยให้เธอยิ้มและหายงอนเรานะ 💖",
      },
      trade: {
        score: 92, ratingText: "เหมาะสมมาก",
        description: "ยามดารานำโชคในเรื่องความงาม แฟชั่น เสื้อผ้า อาหารอร่อย ศิลปะและความบันเทิง ค้าขายสิ่งเหล่านี้จะดึงดูดเงินทองดีเยี่ยม",
        shouldDo: ["ตกแต่งหน้าร้านหรือชิ้นงานให้สวยงามสะดุดตา", "นำเสนอสินค้าด้วยพลังบวกและอินเนอร์ที่มีชีวิตชีวา"],
        shouldAvoid: ["การพูดคุยที่มีบรรยากาศจืดชืดเคร่งเครียด", "การตั้งราคาแบบคลุมเครือไม่ชัดเจน"],
        speechTemplate: "สินค้าคอลเลกชันใหม่ล่าสุดชิ้นนี้ถูกออกแบบมาเพื่อเพิ่มเสน่ห์และเสริมสร้างภาพลักษณ์ความมั่นใจให้คุณอย่างน่าทึ่งเลยค่ะ",
      },
      negotiate: {
        score: 88, ratingText: "เหมาะสมมาก",
        description: "ยามดีในการกระชับความสัมพันธ์กับคู่เจรจา ตกลงการร่วมมือผ่านงานสังสรรค์ ต้อนรับพันธมิตรแบบเป็นกันเองและรื่นรมย์",
        shouldDo: ["ใช้ท่าทีที่เป็นมิตรและเข้าถึงง่ายสร้างเสน่ห์", "เจรจาผลประโยชน์แบบให้เกิดความสุขพึงใจร่วมกัน"],
        shouldAvoid: ["การตั้งเงื่อนไขที่ตึงเครียดหรือเข้มงวดบีบคั้นเกินไป", "การแสดงอารมณ์หงุดหงิดขัดใจ"],
        speechTemplate: "ความร่วมมือร่วมใจกันพัฒนาในครั้งนี้จะช่วยสร้างสรรค์ผลลัพธ์และความสำเร็จอันงดงามและน่าชื่นชมให้เราทั้งสองฝ่ายแน่นอนค่ะ",
      }
    },
    7: {
      love: {
        score: 50, ratingText: "ติดขัดควรระวัง",
        description: "ยามแห่งพลังความเงียบงันและความเคร่งขรึม การปรับความเข้าใจจะล่าช้าหรือพบความตึงเครียดสูง ควรใจเย็นและอดทนอย่างยิ่ง",
        shouldDo: ["แสดงความอดทนและรอคอยให้อีกฝ่ายพร้อม", "เน้นการพิสูจน์ความสม่ำเสมอสัจจะในการกระทำยาวๆ"],
        shouldAvoid: ["การกดดันเร่งเร้าให้อีกฝ่ายให้อภัยรวดเร็ว", "การใช้วาจาตัดพ้อเอาชนะ"],
        speechTemplate: "เราพร้อมที่จะให้เวลาและรอคอยเธอเสมอนะ ขอให้เวลาเป็นเครื่องพิสูจน์ความจริงใจและสัจจะในความตั้งใจดีของเรานะ",
      },
      trade: {
        score: 80, ratingText: "เหมาะสม",
        description: "ยามดีสำหรับการตกลงซื้อขายอสังหาริมทรัพย์ ที่ดิน อุปกรณ์ก่อสร้างขนาดใหญ่ หรือสัญญาการค้าระยะยาวหลายปี",
        shouldDo: ["เน้นจุดเด่นเรื่องความคงทนแข็งแรง มั่นคง", "อธิบายเงื่อนไขของสัญญาให้รอบคอบมีวินัย"],
        shouldAvoid: ["การเสนอสัญญาระยะสั้นเก็งกำไรฉาบฉวย", "การนำเสนอข้อมูลอย่างลวกๆ ลนลาน"],
        speechTemplate: "โครงการและทรัพย์สินชิ้นนี้ได้รับการคัดกรองมาเพื่อช่วยรองรับความมั่งคั่งและความมั่นคงถาวรในอนาคตของคุณอย่างดีที่สุดครับ",
      },
      negotiate: {
        score: 82, ratingText: "เหมาะสม",
        description: "ยามดีสำหรับการวางรากฐานโครงสร้างพื้นฐาน สัญญาสัมปทาน สัญญาระยะยาวที่มีความอดทนและรอบคอบสูง",
        shouldDo: ["เจรจาด้วยความใจเย็น รอบคอบและอดทนสูง", "ทบทวนหัวข้อและกฎหมายข้อตกลงอย่างละเอียดที่สุด"],
        shouldAvoid: ["การลงนามตกลงอย่างเรญร้อนโดยขาดความรอบคอบ", "การไว้ใจคำพูดลอยๆ โดยไม่มีลายลักษณ์อักษร"],
        speechTemplate: "เราตั้งใจและจัดทำรายละเอียดโครงสร้างพื้นฐานนี้อย่างรอบคอบมีวินัยสูงสุด เพื่อให้แผนงานนี้ดำเนินไปอย่างมั่นคงถาวรครับ",
      }
    }
  };

  return mapping[planet]?.[topic] ?? {
    score: 70, ratingText: "เหมาะสม",
    description: "ช่วงเวลาดี มีความมั่นคง ปลอดภัยตามตำรายามอัฏฐกาล",
    shouldDo: ["ประสานงานทั่วไป", "คุยตามรอบเวลาปกติ"],
    shouldAvoid: ["การเร่งรีบตัดสินใจกะทันหัน"],
    speechTemplate: "ขอให้บรรลุเป้าหมายตามที่ตั้งใจค่ะ",
  };
}

interface YamSlotDetail {
  yamNumber: number;
  yamName: string;
  period: "day" | "night";
  timeLabel: string;
  startTimeISO: string;
  endTimeISO: string;
  ticks: number;
  level: "bad" | "good" | "very_good" | "excellent";
  label: string;
  description: string;
}

function calculateDailyYamSlots(targetDate: Date): YamSlotDetail[] {
  const sunTimes = getSunTimes(targetDate);
  const sunrise = sunTimes.sunrise;
  const sunset = sunTimes.sunset;

  const dayMs = sunset.getTime() - sunrise.getTime();
  const nightMs = 86400000 - dayMs;

  const daySlotMs = dayMs / 8;
  const nightSlotMs = nightMs / 8;

  const slots: YamSlotDetail[] = [];

  for (let i = 0; i < 8; i++) {
    const startTime = new Date(sunrise.getTime() + i * daySlotMs);
    const endTime = new Date(sunrise.getTime() + (i + 1) * daySlotMs);
    const midTime = new Date(startTime.getTime() + daySlotMs / 2);
    const result = getYamPrediction(midTime);

    slots.push({
      yamNumber: i + 1,
      yamName: result.yamName,
      period: "day",
      timeLabel: `${startTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`,
      startTimeISO: startTime.toISOString(),
      endTimeISO: endTime.toISOString(),
      ticks: result.travelAuspiciousness.ticks,
      level: result.travelAuspiciousness.level as any,
      label: result.travelAuspiciousness.label,
      description: result.travelAuspiciousness.description,
    });
  }

  for (let i = 0; i < 8; i++) {
    const startTime = new Date(sunset.getTime() + i * nightSlotMs);
    const endTime = new Date(sunset.getTime() + (i + 1) * nightSlotMs);
    const midTime = new Date(startTime.getTime() + nightSlotMs / 2);
    const result = getYamPrediction(midTime);

    slots.push({
      yamNumber: i + 1,
      yamName: result.yamName,
      period: "night",
      timeLabel: `${startTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`,
      startTimeISO: startTime.toISOString(),
      endTimeISO: endTime.toISOString(),
      ticks: result.travelAuspiciousness.ticks,
      level: result.travelAuspiciousness.level as any,
      label: result.travelAuspiciousness.label,
      description: result.travelAuspiciousness.description,
    });
  }

  return slots;
}

export default function YamScreen() {
  const [now, setNow] = useState(new Date());
  const [dayTab, setDayTab] = useState<"today" | "tomorrow">("today");
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null);
  
  // Interactive Topic Selection
  const [activeTopic, setActiveTopic] = useState<"love" | "trade" | "negotiate" | "travel">("love");

  // Keep Clock ticking
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const today = useMemo(() => new Date(now), [now]);
  const tomorrow = useMemo(() => {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    return date;
  }, [now]);

  const activeDate = dayTab === "today" ? today : tomorrow;
  const slots = useMemo(() => calculateDailyYamSlots(activeDate), [activeDate]);

  // Current live Yam prediction
  const currentYam = useMemo(() => getYamPrediction(now), [now]);
  const moonInfo = useMemo(() => calculateMoonPhase(), [now]);

  // Calculated advice for current topic
  const topicAdvice = useMemo(() => {
    const ticks = currentYam.travelAuspiciousness.ticks;
    return getTopicAdvice(activeTopic, currentYam.yamName, ticks);
  }, [activeTopic, currentYam]);

  const formatDateThai = (date: Date) => {
    return date.toLocaleDateString("th-TH", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        
        {/* Date Display */}
        <Text style={styles.dateText}>{formatDateThai(now)}</Text>

        {/* ── LIVE PREDICTION WIDGET ── */}
        <View style={styles.liveCard}>
          <LinearGradient
            colors={['rgba(198, 169, 107, 0.15)', 'rgba(2, 6, 23, 0.9)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.liveHeader}>
            <View className="flex-row items-center gap-1.5">
              <View style={[styles.pulseDot, { backgroundColor: THEME.gold }]} />
              <Text style={styles.liveSub}>ยามอัฏฐกาลขณะนี้</Text>
            </View>
            <View style={styles.periodBadge}>
              <Text style={styles.periodBadgeText}>
                {currentYam.period === "day" ? "☀️ กลางวัน" : "🌙 กลางคืน"}
              </Text>
            </View>
          </View>

          <View style={styles.liveYamRow}>
            <Text style={styles.liveYamSymbol}>{PLANET_SYMBOLS[currentYam.yamName] || "🔮"}</Text>
            <View>
              <Text style={styles.liveYamName}>ยาม{currentYam.yamName}</Text>
              <Text style={styles.liveYamDesc}>ยามที่ {currentYam.yamNumber} ({currentYam.phase === "start" ? "ยามต้น" : currentYam.phase === "middle" ? "ยามกลาง" : "ยามปลาย"})</Text>
            </View>
          </View>

          <View style={styles.divider} />
          
          <Text style={styles.liveMoonText}>
            🌕 ข้างขึ้น/ข้างแรม: {moonInfo.lunarDay} ({moonInfo.moonPhase}) {moonInfo.isWanPhra ? "🌟 วันพระ" : ""}
          </Text>
          <Text style={styles.liveGuidanceText}>💡 ชี้แนะ: {moonInfo.guidance}</Text>
        </View>

        {/* ── INTERACTIVE AUSPICIOUS SCORING ── */}
        <Text style={styles.sectionTitle}>✦ ตรวจสอบคะแนนมงคล (Auspicious Scoring)</Text>
        
        {/* Topic Selector Tabs */}
        <View style={styles.topicSelector}>
          {(["love", "trade", "negotiate", "travel"] as const).map((topic) => {
            const label = topic === "love" ? "ความรัก" : topic === "trade" ? "ค้าขาย" : topic === "negotiate" ? "เจรจา" : "เดินทาง";
            const icon = topic === "love" ? "heart" : topic === "trade" ? "cash" : topic === "negotiate" ? "chatbubbles" : "navigate";
            const isActive = activeTopic === topic;
            return (
              <TouchableOpacity
                key={topic}
                style={[styles.topicBtn, isActive && styles.topicBtnActive]}
                onPress={() => setActiveTopic(topic)}
              >
                <Ionicons name={icon} size={16} color={isActive ? THEME.bg : THEME.textMuted} />
                <Text style={[styles.topicBtnText, isActive && styles.topicBtnTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Score Display Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <View className="flex-1">
              <Text style={styles.scoreLabel}>คะแนนความเหมาะสมในหมวดนี้</Text>
              <Text style={styles.scoreRating}>{topicAdvice.ratingText}</Text>
            </View>
            <View style={styles.gaugeContainer}>
              <Text style={styles.gaugeVal}>{topicAdvice.score}%</Text>
            </View>
          </View>

          <Text style={styles.scoreDesc}>{topicAdvice.description}</Text>

          <View style={styles.adviceBlock}>
            <Text style={styles.adviceBlockTitle}>✅ สิ่งที่ควรทำ:</Text>
            {topicAdvice.shouldDo.map((item, idx) => (
              <Text key={idx} style={styles.adviceItem}>• {item}</Text>
            ))}
          </View>

          <View style={styles.adviceBlock}>
            <Text style={styles.adviceBlockTitle}>❌ สิ่งที่ควรเลี่ยง:</Text>
            {topicAdvice.shouldAvoid.map((item, idx) => (
              <Text key={idx} style={styles.adviceItem}>• {item}</Text>
            ))}
          </View>

          <View style={styles.speechBox}>
            <Text style={styles.speechTitle}>💬 คำพูดเสริมสิริมงคลแนะนำ:</Text>
            <Text style={styles.speechText}>"{topicAdvice.speechTemplate}"</Text>
          </View>
        </View>

        {/* ── DAILY SCHEDULE ── */}
        <View style={styles.scheduleHeaderRow}>
          <Text style={styles.sectionTitle}>📅 ตารางยามละเอียดประจำวัน</Text>
          
          {/* Day Selector */}
          <View style={styles.dayTabContainer}>
            <TouchableOpacity
              style={[styles.dayTab, dayTab === "today" && styles.dayTabActive]}
              onPress={() => setDayTab("today")}
            >
              <Text style={[styles.dayTabText, dayTab === "today" && styles.dayTabActiveText]}>วันนี้</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dayTab, dayTab === "tomorrow" && styles.dayTabActive]}
              onPress={() => setDayTab("tomorrow")}
            >
              <Text style={[styles.dayTabText, dayTab === "tomorrow" && styles.dayTabActiveText]}>พรุ่งนี้</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.listContainer}>
          {slots.map((slot, idx) => {
            const isExpanded = expandedSlot === idx;
            const levelColor = LEVEL_COLORS[slot.level] || THEME.gold;
            const levelLabel = LEVEL_LABELS[slot.level] || slot.label;
            const isDayCurrent = dayTab === "today" && currentYam.yamNumber === slot.yamNumber && currentYam.period === slot.period;

            return (
              <View
                key={idx}
                style={[
                  styles.slotCard,
                  isDayCurrent && styles.slotCardCurrent,
                  { borderColor: isDayCurrent ? THEME.gold : 'rgba(255,255,255,0.05)' }
                ]}
              >
                <TouchableOpacity
                  style={styles.slotHeader}
                  activeOpacity={0.7}
                  onPress={() => setExpandedSlot(isExpanded ? null : idx)}
                >
                  <View style={styles.slotMainInfo}>
                    <Text style={[styles.slotIndexText, isDayCurrent && { color: THEME.gold }]}>
                      {slot.yamNumber}. {PLANET_SYMBOLS[slot.yamName] || "🔮"} {slot.yamName}
                    </Text>
                    <Text style={styles.slotTimeText}>{slot.timeLabel}</Text>
                  </View>

                  <View className="flex-row items-center gap-2">
                    <View style={[styles.levelBadge, { backgroundColor: levelColor + '20', borderColor: levelColor }]}>
                      <Text style={[styles.levelBadgeText, { color: levelColor }]}>{levelLabel}</Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={THEME.textMuted}
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.slotBody}>
                    <View style={styles.hLine} />
                    <Text style={styles.slotDescTitle}>รายละเอียดฤกษ์เดินทางสัญจร:</Text>
                    <Text style={styles.slotDescText}>{slot.description}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  dateText: {
    color: THEME.textMuted,
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'IBMPlexSansThai_500Medium'
  },
  liveCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 20,
    marginBottom: 24,
    overflow: 'hidden'
  },
  liveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  liveSub: {
    color: THEME.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  periodBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  periodBadgeText: {
    color: THEME.text,
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_500Medium'
  },
  liveYamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16
  },
  liveYamSymbol: {
    color: THEME.gold,
    fontSize: 48,
    fontFamily: 'Cinzel_700Bold'
  },
  liveYamName: {
    color: THEME.text,
    fontSize: 26,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  liveYamDesc: {
    color: THEME.textMuted,
    fontSize: 12,
    fontFamily: 'IBMPlexSansThai_400Regular',
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(198, 169, 107, 0.15)',
    marginVertical: 14
  },
  liveMoonText: {
    color: THEME.text,
    fontSize: 12,
    fontFamily: 'IBMPlexSansThai_600SemiBold',
    marginBottom: 6
  },
  liveGuidanceText: {
    color: THEME.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'IBMPlexSansThai_400Regular'
  },
  sectionTitle: {
    color: THEME.text,
    fontSize: 14,
    fontFamily: 'IBMPlexSansThai_700Bold',
    marginBottom: 12
  },
  topicSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 34, 64, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 14
  },
  topicBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12
  },
  topicBtnActive: {
    backgroundColor: THEME.gold
  },
  topicBtnText: {
    color: THEME.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  topicBtnTextActive: {
    color: THEME.bg
  },
  scoreCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 20,
    marginBottom: 24
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  scoreLabel: {
    color: THEME.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    fontFamily: 'IBMPlexSansThai_600SemiBold'
  },
  scoreRating: {
    color: THEME.gold,
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold',
    marginTop: 2
  },
  gaugeContainer: {
    backgroundColor: 'rgba(198, 169, 107, 0.1)',
    borderWidth: 2,
    borderColor: THEME.gold,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  gaugeVal: {
    color: THEME.gold,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Cinzel_700Bold'
  },
  scoreDesc: {
    color: THEME.text,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'IBMPlexSansThai_400Regular',
    marginBottom: 16
  },
  adviceBlock: {
    backgroundColor: 'rgba(2, 6, 23, 0.4)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10
  },
  adviceBlockTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold',
    marginBottom: 6,
    color: THEME.text
  },
  adviceItem: {
    color: THEME.text,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'IBMPlexSansThai_400Regular',
    marginLeft: 4,
    marginBottom: 2
  },
  speechBox: {
    backgroundColor: 'rgba(198, 169, 107, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(198, 169, 107, 0.15)',
    borderRadius: 14,
    padding: 14,
    marginTop: 6
  },
  speechTitle: {
    color: THEME.gold,
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold',
    marginBottom: 4
  },
  speechText: {
    color: THEME.text,
    fontSize: 11,
    lineHeight: 16,
    fontStyle: 'italic',
    fontFamily: 'IBMPlexSansThai_400Regular'
  },
  scheduleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  dayTabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 34, 64, 0.4)',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  dayTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  dayTabActive: {
    backgroundColor: THEME.gold
  },
  dayTabText: {
    color: THEME.textMuted,
    fontSize: 10,
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  dayTabActiveText: {
    color: THEME.bg
  },
  listContainer: {
    gap: 8
  },
  slotCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden'
  },
  slotCardCurrent: {
    backgroundColor: 'rgba(198, 169, 107, 0.05)'
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16
  },
  slotMainInfo: {
    flex: 1
  },
  slotIndexText: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  slotTimeText: {
    color: THEME.textMuted,
    fontSize: 10,
    marginTop: 4,
    fontFamily: 'IBMPlexSansThai_400Regular'
  },
  levelBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  levelBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold'
  },
  slotBody: {
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  hLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 12
  },
  slotDescTitle: {
    color: THEME.text,
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'IBMPlexSansThai_700Bold',
    marginBottom: 6
  },
  slotDescText: {
    color: THEME.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'IBMPlexSansThai_400Regular'
  }
});
