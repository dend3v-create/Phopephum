import React from "react";
import { AstralIcon } from "~/components/ui/AstralIcon";

export interface CoreStarWisdomData {
  starNumber: number;
  starName: string;
  element: string;
  quote: string;
  identity: string;
  strengths: string;
  destinyPath: string;
  bhopName?: string;
  powerName?: string;
}

export interface CoreStarWisdomModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CoreStarWisdomData;
}

export const STAR_WISDOM_DICTIONARY: Record<number, Omit<CoreStarWisdomData, "starNumber">> = {
  1: {
    starName: "ดาวอาทิตย์ (๑) · ราชาแห่งแสงสว่าง",
    element: "ไฟ (เตโชธาตุ)",
    quote: "สง่างามดั่งสุริยัน ส่องสว่างนำทางชีวิตด้วยเกียรติยศและความมุ่งมั่น",
    identity: "คุณมีพลังแห่งการเป็น ผู้นำธรรมชาติ รักศักดิ์ศรีและความถูกต้อง มีความรับผิดชอบสูง ตรงไปตรงมา และไม่ชอบการถูกบังคับหรือเอาเปรียบ",
    strengths: "ความมุ่งมั่นเด็ดเดี่ยว มีบารมีและเสน่ห์ความน่าเชื่อถือ ผู้คนพร้อมรับฟังและให้ความเคารพในวิสัยทัศน์และการตัดสินใจที่เฉียบขาด",
    destinyPath: "เส้นทางของคุณคือการเป็น เสาหลักและผู้ชี้นำ ยิ่งเผชิญหน้ากับความท้าทาย คุณยิ่งเติบโตและเปล่งประกายผ่านความสำเร็จที่สร้างด้วยตนเอง",
  },
  2: {
    starName: "ดาวจันทร์ (๒) · จันทราเทวี",
    element: "ดิน/น้ำ (เสน่ห์ & อารมณ์)",
    quote: "นุ่มนวลอ่อนโยนดั่งแสงจันทร์ เปี่ยมด้วยเมตตาและพลังแห่งการโอบอุ้ม",
    identity: "คุณมี จิตวิญญาณแห่งการดูแล ใส่ใจความรู้สึกของคนรอบข้าง มีรสนิยมประณีต รักความสงบ และมีความยืดหยุ่นปรับตัวเก่งในทุกสถานการณ์",
    strengths: "ความสามารถในการสร้างความสัมพันธ์ที่อบอุ่น การเจรจาประนีประนอม สัญชาตญาณหยั่งรู้ และความคิดสร้างสรรค์ทางศิลปะ",
    destinyPath: "ความสำเร็จของคุณงดงามผ่าน การเป็นที่รักและการสร้างเครือข่ายไมตรี การประคองจิตใจให้มั่นคงไม่หวั่นไหวจะทำให้บารมีคุณเบ่งบานที่สุด",
  },
  3: {
    starName: "ดาวอังคาร (๓) · นักรบผู้หาญกล้า",
    element: "ลมกรด (วาโยธาตุ)",
    quote: "แข็งแกร่งดั่งนักรบผู้ไม่เคยยอมจำนน มุ่งมั่นพิชิตทุกเป้าหมายด้วยพลังกายและใจ",
    identity: "คุณคือ นักสู้ผู้กระตือรือร้น ชอบความท้าทาย ไม่กลัวอุปสรรค กล้าได้กล้าเสีย มีความจริงใจ พูดจริงทำจริง และรักพวกพ้องอย่างลึกซึ้ง",
    strengths: "พลังขับเคลื่อนมหาศาล ความรวดเร็วในการลงมือทำ ความกล้าตัดสินใจในยามวิกฤต และความสามารถในการปกป้องดูแลคนที่คุณรัก",
    destinyPath: "ยิ่งมีเป้าหมายที่ชัดเจน คุณยิ่งไร้ขีดจำกัด การฝึกฝนสมาธิและการควบคุมความใจร้อนจะเปลี่ยนพลังนักรบของคุณให้กลายเป็นมหาอำนาจ",
  },
  4: {
    starName: "ดาวพุธ (๔) · ปราชญ์แห่งวาทศิลป์",
    element: "น้ำ (อาโปธาตุ)",
    quote: "ฉลาดล้ำดั่งบัณฑิต เจรจาพาทีเปลี่ยนวิกฤตให้เป็นโอกาสทอง",
    identity: "คุณคือ ผู้มีปัญญาเฉียบคม ปรับตัวไว ไหวพริบยอดเยี่ยม มีเสน่ห์ในการสื่อสาร ถ่ายทอดความคิดได้อย่างกระจ่างแจ้งและน่าเชื่อถือ",
    strengths: "วาทศิลป์ การค้าขาย การเจรจาต่อรอง การวิเคราะห์ข้อมูล และการหาทางออกที่ทุกฝ่ายได้ประโยชน์ร่วมกัน",
    destinyPath: "การเชื่อมโยงผู้คนและข้อมูลคือทางของคุณ ยิ่งเรียนรู้และแบ่งปันปัญญา ธุรกิจและการงานของคุณยิ่งก้าวหน้าอย่างไร้พรมแดน",
  },
  5: {
    starName: "ดาวพฤหัสบดี (๕) · มหาคุรุผู้ทรงศีล",
    element: "ดินหนัก (ปฐวีธาตุ)",
    quote: "มั่นคงดั่งขุนเขา เปี่ยมด้วยคุณธรรม ความรู้ และปัญญาญาณหยั่งรู้",
    identity: "คุณคือ ผู้มีจิตใจคุณธรรม ชอบให้ความรู้และช่วยเหลือผู้อื่น มีหลักการมั่นคง รอบคอบ สุขุม และมักเป็นที่พึ่งพาทางปัญญาของทุกคน",
    strengths: "วิสัยทัศน์ทางวิชาการ การวางแผนระยะยาว ความน่าเชื่อถือ ความซื่อสัตย์ และมีพลังแห่งการดึงดูดผู้ใหญ่อุปถัมภ์",
    destinyPath: "เส้นทางครูบาอาจารย์ ที่ปรึกษา หรือผู้นำทางจิตวิญญาณและธุรกิจที่สร้างคุณค่า ยิ่งให้ปัญญา โชคลาภยิ่งไหลมาเทมาอย่างยั่งยืน",
  },
  6: {
    starName: "ดาวศุกร์ (๖) · เทพแห่งโภคทรัพย์และความสุข",
    element: "น้ำใส (โภคสมบัติ)",
    quote: "ดึงดูดความมั่งคั่งและสุนทรียภาพแห่งชีวิต เปี่ยมด้วยเสน่ห์และโชคลาภ",
    identity: "คุณคือ ผู้รักความงาม ความสุข และศิลปะแห่งการใช้ชีวิต มีเสน่ห์ดึงดูดคนรอบข้าง รสนิยมเลิศ และมีสัมผัสพิเศษในการสร้างความรื่นรมย์",
    strengths: "การดึงดูดทรัพย์สิน โชคลาภ ความคิดสร้างสรรค์ด้านสุนทรียะ การตลาด และการสร้างความประทับใจตั้งแต่แรกพบ",
    destinyPath: "สร้างความมั่งคั่งจากสิ่งที่รักและมีความสุข การบริหารการเงินอย่างมีสติจะทำให้สมบัติพัสถานของคุณพอกพูนไม่มีวันหมด",
  },
  7: {
    starName: "ดาวเสาร์ (๗) · จอมทัพผู้ทรหด",
    element: "ไฟกรด / ดินแข็ง",
    quote: "หนักแน่นดั่งศิลา อดทนผ่านกาลเวลาเพื่อสร้างอาณาจักรที่ยั่งยืน",
    identity: "คุณคือ ผู้มีความอดทนเป็นเลิศ สุขุม รอบคอบ มองการณ์ไกล รับผิดชอบงานหนักได้ดีเยี่ยม และสร้างทุกสิ่งจากรากฐานที่แท้จริง",
    strengths: "ความทรหดไม่ย่อท้อ การจัดการโครงการใหญ่ ความละเอียดรอบคอบ และการเปลี่ยนวิกฤตให้เป็นรากฐานที่มั่นคงที่สุด",
    destinyPath: "เหล็กกล้าต้องผ่านการตีในไฟ ความสำเร็จของคุณอาจต้องใช้เวลา แต่เมื่อสำเร็จแล้วจะยิ่งใหญ่ มั่นคง และไม่มีใครโค่นล้มได้",
  },
};

export function getCoreStarWisdom(starNumber: number, bhopName?: string): CoreStarWisdomData {
  const num = ((starNumber - 1) % 7 + 7) % 7 + 1;
  const base = STAR_WISDOM_DICTIONARY[num] || STAR_WISDOM_DICTIONARY[1];
  return {
    starNumber: num,
    starName: base.starName,
    element: base.element,
    quote: base.quote,
    identity: base.identity,
    strengths: base.strengths,
    destinyPath: base.destinyPath,
    bhopName,
  };
}

export function CoreStarWisdomModal({ isOpen, onClose, data }: CoreStarWisdomModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/70 dark:bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Modal Container */}
      <div 
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#030914] border border-[#C6A96B]/40 shadow-2xl shadow-black/40 dark:shadow-black/90 text-slate-900 dark:text-[#F8F6F1] no-scrollbar animate-scaleUp"
        style={{
          boxShadow: "0 20px 60px -10px rgba(0,0,0,0.4), 0 0 30px rgba(198,169,107,0.15)",
        }}
      >
        {/* Header Background Glow */}
        <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-[#C6A96B]/20 via-[#4B6FAE]/10 to-transparent pointer-events-none rounded-t-3xl" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-200 dark:border-white/15 text-slate-700 dark:text-[#F8F6F1] flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Content Container */}
        <div className="relative p-6 sm:p-7 space-y-6">
          {/* Header Title */}
          <div className="space-y-1.5 pr-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C6A96B]/15 border border-[#C6A96B]/30 text-[#8C6D2D] dark:text-[#D9BC82] text-xs font-bold tracking-wider">
              <span>✦ รหัสดาวประจำตัว</span>
              <span>·</span>
              <span>{data.element}</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#F8F6F1] tracking-tight">
              {data.starName}
            </h2>
            <p className="text-sm italic text-[#8B6914] dark:text-[#C6B79F] font-serif leading-relaxed">
              "{data.quote}"
            </p>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-[#C6A96B]/30 to-transparent" />

          {/* Section 1: ตัวตนของคุณ */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-base font-bold text-[#9A7B38] dark:text-[#E2C785]">
              <span className="text-lg">💎</span>
              <span className="font-display">ตัวตนของคุณ:</span>
            </div>
            <p className="text-sm sm:text-[15px] leading-relaxed text-slate-700 dark:text-[#F8F6F1]/90 font-sans pl-1">
              {data.identity}
            </p>
          </div>

          {/* Section 2: จุดแข็ง */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-base font-bold text-[#2563EB] dark:text-[#60A5FA]">
              <span className="text-lg">🛡️</span>
              <span className="font-display">จุดแข็ง & พรสวรรค์:</span>
            </div>
            <p className="text-sm sm:text-[15px] leading-relaxed text-slate-700 dark:text-[#F8F6F1]/90 font-sans pl-1">
              {data.strengths}
            </p>
          </div>

          {/* Section 3: เส้นทางของคุณ */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-base font-bold text-[#059669] dark:text-[#34D399]">
              <span className="text-lg">🏺</span>
              <span className="font-display">เส้นทางของคุณ:</span>
            </div>
            <p className="text-sm sm:text-[15px] leading-relaxed text-slate-700 dark:text-[#F8F6F1]/90 font-sans pl-1">
              {data.destinyPath}
            </p>
          </div>

          {/* Bottom Action */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#C6A96B] via-[#E2C785] to-[#D9BC82] text-[#020617] font-display font-bold text-sm shadow-lg shadow-[#C6A96B]/20 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
            >
              เข้าใจแล้ว ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
