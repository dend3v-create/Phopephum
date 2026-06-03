import { json } from "@remix-run/cloudflare";
import type { MetaFunction } from "@remix-run/cloudflare";

export const meta: MetaFunction = () => {
  return [{ title: "วิธีการใช้งาน — PhopePhum" }];
};

const FAQ_DATA = [
  {
    category: "การใช้งานเบื้องต้น",
    items: [
      {
        question: "วิธีการตั้งดวงชะตาทำอย่างไร?",
        answer: "คุณสามารถตั้งดวงได้ที่เมนู 'ตรวจดวงชะตา' โดยกรอก วัน เดือน ปี และเวลาเกิด ระบบจะคำนวณผังดวง 7 ตัว 9 ฐานให้โดยอัตโนมัติ"
      },
      {
        question: "ข้อมูลที่กรอกมีความปลอดภัยหรือไม่?",
        answer: "ข้อมูลของคุณถูกเก็บรักษาเป็นความลับและมีการป้องกันการเข้าถึงจากบุคคลภายนอกอย่างเข้มงวด"
      }
    ]
  },
  {
    category: "ฟีเจอร์ AI",
    items: [
      {
        question: "รายงาน AI ทำงานอย่างไร?",
        answer: "AI ของเราวิเคราะห์จากผังดวง 7 ตัว 9 ฐาน ผสมผสานกับคัมภีร์ดั้งเดิม เพื่อสรุปแนวโน้มและคำแนะนำที่แม่นยำ"
      },
      {
        question: "จำนวนการใช้งาน AI มีจำกัดหรือไม่?",
        answer: "ขึ้นอยู่กับแพ็กเกจที่คุณใช้งาน โดยคุณสามารถตรวจสอบโควต้าได้ที่หน้า 'รายงาน AI'"
      }
    ]
  },
  {
    category: "การวางแผนชีวิต",
    items: [
      {
        question: "ปฏิทินวางแผนช่วยอะไรได้บ้าง?",
        answer: "ช่วยให้คุณทราบวันมงคล วันที่ควรระวัง และช่วยในการนัดหมายหรือเริ่มต้นงานสำคัญให้ตรงกับฤกษ์ยามที่ดี"
      }
    ]
  }
];

export default function HowToUsePage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-bold text-[#F8F6F1] glow-gold">
          วิธีการใช้งาน
        </h1>
        <p className="text-[#94A3B8]">
          คลังความรู้และคำอธิบายฟังก์ชั่นต่างๆ ของระบบ PhopePhum
        </p>
      </div>

      <div className="grid gap-6">
        {FAQ_DATA.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <h2 className="text-lg font-bold text-[#C9A96E] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A96E]" />
              {section.category}
            </h2>
            <div className="grid gap-3">
              {section.items.map((item, itemIdx) => (
                <div 
                  key={itemIdx} 
                  className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <h3 className="text-[#F8F6F1] font-semibold mb-2 flex items-center gap-2">
                    <span className="text-[#C9A96E]">Q:</span> {item.question}
                  </h3>
                  <p className="text-[#94A3B8] text-sm leading-relaxed pl-6">
                    <span className="text-[#C9A96E]/60 mr-2">A:</span> {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Intro Box */}
      <div className="mt-12 p-8 rounded-3xl border border-[#C9A96E]/20 bg-gradient-to-br from-[#C9A96E]/5 to-transparent text-center">
        <div className="w-16 h-16 rounded-full bg-[#C9A96E]/10 flex items-center justify-center mx-auto mb-4 border border-[#C9A96E]/20">
          <svg viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth={1.5} className="w-8 h-8">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#F8F6F1] mb-2">ต้องการความช่วยเหลือเพิ่มเติม?</h2>
        <p className="text-[#94A3B8] text-sm max-w-md mx-auto">
          หากคุณมีคำถามอื่นๆ ที่ไม่ได้ระบุไว้ในนี้ สามารถติดต่อทีมงานผ่านทาง LINE Official ได้ตลอด 24 ชั่วโมง
        </p>
      </div>
    </div>
  );
}
