import React from "react";

export interface CoreStarWisdomData {
  starNumber: number;
  starName: string;
  element: string;
  quote: string;
  identity: string;
  magnetism: string; // เสน่ห์การดึงดูดที่เหมาะกับตัวตน
  strengths: string; // จุดเด่น & พรสวรรค์
  destinyPath: string; // กุญแจความสำเร็จ & เส้นทางชีวิต
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
    identity: "คุณมีพลังแห่งการเป็นผู้นำธรรมชาติ รักศักดิ์ศรีและความถูกต้อง มีความรับผิดชอบสูง ตรงไปตรงมา มีความมุ่งมั่นทะเยอทะยาน และไม่ชอบการถูกบังคับหรือเอาเปรียบ",
    magnetism: "เสน่ห์แห่งความสง่างาม ความมั่นใจ และความน่าเชื่อถือที่เปล่งประกาย ดึงดูดผู้คนให้พร้อมเคารพ ยอมรับในบารมี และเชื่อมั่นในทิศทางที่คุณนำพา",
    strengths: "วิสัยทัศน์เฉียบขาด ความมุ่งมั่นเด็ดเดี่ยว การตัดสินใจในเวลาสำคัญ และความสามารถในการเป็นเสาหลักปกป้องดูแลผู้คน",
    destinyPath: "เส้นทางของคุณคือการเป็น 'ผู้นำและผู้ชี้นำ' ยิ่งเผชิญความท้าทาย คุณยิ่งเติบโตและเปล่งประกายผ่านความสำเร็จที่สร้างด้วยตนเอง",
  },
  2: {
    starName: "ดาวจันทร์ (๒) · จันทราเทวี",
    element: "ดิน/น้ำ (สุนทรียะ & อารมณ์)",
    quote: "นุ่มนวลอ่อนโยนดั่งแสงจันทร์ เปี่ยมด้วยเมตตาและพลังแห่งการโอบอุ้ม",
    identity: "คุณมีจิตวิญญาณแห่งการดูแล ใส่ใจความรู้สึกคนรอบข้าง มีรสนิยมประณีต รักความสงบ ละเอียดอ่อน และมีความยืดหยุ่นปรับตัวเก่งในทุกสภาพแวดล้อม",
    magnetism: "เสน่ห์แห่งความอบอุ่น นุ่มนวล และการรับฟังอย่างเข้าอกเข้าใจ ดึงดูดความเมตตา มิตรภาพ และความรักใคร่เอ็นดูจากทุกคนที่ได้ใกล้ชิด",
    strengths: "จิตวิทยาการประสานใจ การเจรจาประนีประนอม สัญชาตญาณหยั่งรู้ และความคิดสร้างสรรค์ทางศิลปะและการบริการ",
    destinyPath: "ความสำเร็จของคุณงดงามผ่าน 'การเป็นที่รักและการสร้างเครือข่ายไมตรี' ยิ่งใจสงบมั่นคง บารมีของคุณจะเบ่งบานและนำพาความเจริญสูงสุด",
  },
  3: {
    starName: "ดาวอังคาร (๓) · นักรบผู้หาญกล้า",
    element: "ลมกรด (วาโยธาตุ)",
    quote: "แข็งแกร่งดั่งนักรบผู้ไม่เคยยอมจำนน มุ่งมั่นพิชิตทุกเป้าหมายด้วยพลังกายและใจ",
    identity: "คุณคือนักสู้ผู้กระตือรือร้น ชอบความท้าทาย ไม่กลัวอุปสรรค กล้าได้กล้าเสีย มีความจริงใจ พูดจริงทำจริง และรักพวกพ้องอย่างลึกซึ้ง",
    magnetism: "เสน่ห์แห่งความเด็ดเดี่ยว จริงใจ ไม่ซับซ้อน พลังงานที่กระฉับกระเฉงและพร้อมลุย ดึงดูดผู้คนที่ต้องการความชัดเจนและต้องการเกราะคุ้มกันที่พึ่งพาได้",
    strengths: "พลังขับเคลื่อนมหาศาล ความรวดเร็วในการลงมือทำ ความกล้าตัดสินใจในภาวะวิกฤต และการแก้ไขปัญหาเฉพาะหน้าได้อย่างยอดเยี่ยม",
    destinyPath: "ยิ่งมีเป้าหมายที่ชัดเจน คุณยิ่งไร้ขีดจำกัด การฝึกสมาธิและควบคุมความใจร้อนจะเปลี่ยนพลังนักรบของคุณให้กลายเป็นมหาอำนาจความสำเร็จ",
  },
  4: {
    starName: "ดาวพุธ (๔) · ปราชญ์แห่งวาทศิลป์",
    element: "น้ำ (อาโปธาตุ)",
    quote: "ฉลาดล้ำดั่งบัณฑิต เจรจาพาทีเปลี่ยนวิกฤตให้เป็นโอกาสทอง",
    identity: "คุณคือผู้มีปัญญาเฉียบคม ไหวพริบยอดเยี่ยม ปรับตัวไว ช่างสังเกต มีเสน่ห์ในการสื่อสาร ถ่ายทอดความคิดได้อย่างกระจ่างแจ้งและน่าเชื่อถือ",
    magnetism: "เสน่ห์แห่งวาทศิลป์ อารมณ์ขัน และความเฉลียวฉลาดที่ทำให้การพูดคุยมีชีวิตชีวา ดึงดูดคู่ค้า พันธมิตร และโอกาสทองทางธุรกิจเข้ามาไม่ขาดสาย",
    strengths: "วาทศิลป์ การค้าขาย การเจรจาต่อรอง การวิเคราะห์ข้อมูล และการหาทางออกที่ทุกฝ่ายได้รับประโยชน์ร่วมกันอย่างชาญฉลาด",
    destinyPath: "การเชื่อมโยงผู้คนและข้อมูลคือทางของคุณ ยิ่งเรียนรู้และแบ่งปันปัญญา ธุรกิจและการงานของคุณยิ่งก้าวหน้าอย่างไร้ขีดจำกัด",
  },
  5: {
    starName: "ดาวพฤหัสบดี (๕) · มหาคุรุผู้ทรงศีล",
    element: "ดินหนัก (ปฐวีธาตุ)",
    quote: "มั่นคงดั่งขุนเขา เปี่ยมด้วยคุณธรรม ความรู้ และปัญญาญาณหยั่งรู้",
    identity: "คุณคือผู้มีจิตใจคุณธรรม ชอบให้ความรู้และช่วยเหลือผู้อื่น มีหลักการมั่นคง รอบคอบ สุขุม และเป็นที่พึ่งพาทางปัญญาของทุกคนรอบข้าง",
    magnetism: "เสน่ห์แห่งความสุขุม น่าเชื่อถือ และแววตาแห่งความเมตตา ดึงดูดผู้ใหญ่ ผู้อุปถัมภ์ และผู้คนที่มีศีลธรรมเข้ามาร่วมส่งเสริมความก้าวหน้า",
    strengths: "วิสัยทัศน์เชิงยุทธศาสตร์ระยะยาว ความรอบรู้เชิงลึก ความน่าเชื่อถือ ความซื่อสัตย์ และความสามารถในการเป็นที่ปรึกษาชี้ทางสว่าง",
    destinyPath: "เส้นทางครูบาอาจารย์ ที่ปรึกษา หรือผู้นำที่สร้างคุณค่า ยิ่งให้ปัญญาและยึดมั่นในความถูกต้อง โชคลาภและความมั่งคั่งยิ่งพอกพูนอย่างมั่นคง",
  },
  6: {
    starName: "ดาวศุกร์ (๖) · เทพแห่งโภคทรัพย์และความสุข",
    element: "น้ำใส (โภคสมบัติ)",
    quote: "ดึงดูดความมั่งคั่งและสุนทรียภาพแห่งชีวิต เปี่ยมด้วยเสน่ห์และโชคลาภ",
    identity: "คุณคือผู้รักความงาม ความสุข และศิลปะแห่งการใช้ชีวิต มีรสนิยมเลิศ อ่อนโยน มีสัมผัสพิเศษในการสร้างบรรยากาศรื่นรมย์และความประทับใจ",
    magnetism: "เสน่ห์ความน่าหลงใหล บุคลิกภาพที่สง่างามและมีสไตล์ ดึงดูดโชคลาภ เงินทอง ความเมตตา และโอกาสดีๆ เข้ามาหาอย่างเป็นธรรมชาติ",
    strengths: "การดึงดูดทรัพย์สิน ความคิดสร้างสรรค์ด้านความงาม ศิลปะ การตลาด การสร้างความประทับใจตั้งแต่แรกพบ และการเจรจาด้วยเสน่ห์",
    destinyPath: "สร้างความมั่งคั่งจากสิ่งที่รักและมีความสุข การบริหารการเงินอย่างมีสติจะทำให้ทรัพย์สินพัสถานของคุณพอกพูนและมั่นคงไม่มีวันหมด",
  },
  7: {
    starName: "ดาวเสาร์ (๗) · จอมทัพผู้ทรหด",
    element: "ไฟกรด / ดินแข็ง",
    quote: "หนักแน่นดั่งศิลา อดทนผ่านกาลเวลาเพื่อสร้างอาณาจักรที่ยั่งยืน",
    identity: "คุณคือผู้มีความอดทนเป็นเลิศ สุขุม หนักแน่น มองการณ์ไกล รับผิดชอบงานหนักได้ดีเยี่ยม และสร้างทุกสิ่งจากรากฐานที่แท้จริงไม่ฉาบฉวย",
    magnetism: "เสน่ห์แห่งความหนักแน่น ความนิ่ง มั่นคง และความพึ่งพาได้ในยามคับขัน ดึงดูดความไว้วางใจจากผู้ใหญ่และพันธมิตรที่มองหาคนจริง",
    strengths: "ความทรหดไม่ย่อท้อ การจัดการโครงการใหญ่ ความละเอียดรอบคอบ และการเปลี่ยนอุปสรรคให้กลายเป็นรากฐานที่แข็งแกร่งที่สุด",
    destinyPath: "เหล็กกล้าต้องผ่านไฟ ความสำเร็จของคุณอาจต้องใช้เวลาและการสะสม แต่เมื่อสำเร็จแล้วจะยิ่งใหญ่ มั่นคงถาวร และไม่มีใครโค่นล้มได้",
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
    magnetism: base.magnetism,
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
              <span>✦ รหัสดาวประจำตัวกำเนิด</span>
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
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#9A7B38] dark:text-[#E2C785]">
              <span className="text-base">💎</span>
              <span className="font-display uppercase tracking-wider">ตัวตนความเป็นคุณ:</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-[#F8F6F1]/90 font-sans pl-1">
              {data.identity}
            </p>
          </div>

          {/* Section 2: เสน่ห์การดึงดูด */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#D97706] dark:text-[#FBBF24]">
              <span className="text-base">✨</span>
              <span className="font-display uppercase tracking-wider">เสน่ห์การดึงดูดเฉพาะตน:</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-[#F8F6F1]/90 font-sans pl-1">
              {data.magnetism}
            </p>
          </div>

          {/* Section 3: จุดแข็ง */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#2563EB] dark:text-[#60A5FA]">
              <span className="text-base">🛡️</span>
              <span className="font-display uppercase tracking-wider">จุดแข็ง & พรสวรรค์:</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-[#F8F6F1]/90 font-sans pl-1">
              {data.strengths}
            </p>
          </div>

          {/* Section 4: เส้นทางของคุณ */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#059669] dark:text-[#34D399]">
              <span className="text-base">🏺</span>
              <span className="font-display uppercase tracking-wider">กุญแจความสำเร็จ & เส้นทางชีวิต:</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-[#F8F6F1]/90 font-sans pl-1">
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
