import { Link } from "@remix-run/react";
import { AstralIcon } from "~/components/ui/AstralIcon";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/90 dark:bg-[#020617]/95 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
          
          {/* Brand & Purpose (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3 group inline-flex">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C6A96B] to-[#9E824C] p-0.5 shadow-md shadow-[#C6A96B]/20 flex items-center justify-center">
                <div className="w-full h-full rounded-[10px] bg-[#020617] flex items-center justify-center">
                  <span className="font-display text-[#C6A96B] text-xl font-bold">P</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-xl tracking-wide text-slate-900 dark:text-[#F8F6F1]">
                  PhopePhum
                </span>
                <span className="text-xs text-slate-700 dark:text-slate-400 font-medium">
                  ภพภูมิ • Living Wisdom Operating System
                </span>
              </div>
            </Link>

            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm">
              ระบบปฏิบัติการปัญญาและกาลเวลาชีวิต ผสานศาสตร์ปฏิทินจันทรคติไทยแท้ 100 ปี กับเทคโนโลยี AI อัจฉริยะ เพื่อให้คุณก้าวทันจังหวะชีวิตอย่างมีสติและรู้จังหวะตัดสินใจ
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>ระบบออนไลน์ปกติ 100%</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5">
                <AstralIcon name="balance" size="sm" />
                <span>มาตรฐาน PDPA คุ้มครองข้อมูล</span>
              </span>
            </div>
          </div>

          {/* Col 1: ผลิตภัณฑ์และฟีเจอร์ */}
          <div>
            <h3 className="text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B] uppercase tracking-wider mb-4">
              ผลิตภัณฑ์ & ฟีเจอร์
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/features" className="hover:text-slate-900 dark:hover:text-[#F8F6F1] transition-colors">
                  ฟีเจอร์ทั้งหมด
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-slate-900 dark:hover:text-[#F8F6F1] transition-colors">
                  วิธีใช้งาน & กลไกคำนวณ
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-slate-900 dark:hover:text-[#F8F6F1] transition-colors">
                  ราคา & แพ็กเกจสมาชิก
                </Link>
              </li>
              <li>
                <Link to="/pricing#sands" className="hover:text-slate-900 dark:hover:text-[#F8F6F1] transition-colors">
                  เศรษฐกิจทรายกาลเวลา (Sands)
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-slate-900 dark:hover:text-[#F8F6F1] transition-colors">
                  เข้าสู่ระบบสมาชิก
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: ความปลอดภัยและกฎหมาย */}
          <div>
            <h3 className="text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B] uppercase tracking-wider mb-4">
              ความปลอดภัย & กฎหมาย
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/security" className="hover:text-slate-900 dark:hover:text-[#F8F6F1] transition-colors">
                  ความปลอดภัย & สิทธิผู้ใช้
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-slate-900 dark:hover:text-[#F8F6F1] transition-colors">
                  ข้อกำหนดการใช้งาน (Terms)
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-slate-900 dark:hover:text-[#F8F6F1] transition-colors">
                  นโยบายความเป็นส่วนตัว (PDPA)
                </Link>
              </li>
              <li>
                <Link to="/refund" className="hover:text-slate-900 dark:hover:text-[#F8F6F1] transition-colors">
                  นโยบายการคืนเงิน & ยกเลิก
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: ความช่วยเหลือและแหล่งความรู้ */}
          <div>
            <h3 className="text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B] uppercase tracking-wider mb-4">
              ช่วยเหลือ & ข้อมูล
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/faq" className="hover:text-slate-900 dark:hover:text-[#F8F6F1] transition-colors">
                  คำถามที่พบบ่อย (FAQ)
                </Link>
              </li>
              <li>
                <a href="mailto:support@phopephum.com" className="hover:text-slate-900 dark:hover:text-[#F8F6F1] transition-colors">
                  ติดต่อฝ่ายบริการลูกค้า
                </a>
              </li>
              <li>
                <a href="/sitemap.xml" className="hover:text-slate-900 dark:hover:text-[#F8F6F1] transition-colors" target="_blank" rel="noreferrer">
                  แผนผังเว็บไซต์ (Sitemap)
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Ethical & Legal Disclaimer Box */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/60 dark:bg-white/[0.02] mb-10 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          <p className="font-semibold text-slate-800 dark:text-slate-300 mb-1 flex items-center gap-1.5">
            <span className="text-[#8C6D2D] dark:text-[#C6A96B]">✦</span>
            <span>ข้อตกลงและหลักจริยธรรมของระบบ (Ethical & Wisdom Transparency)</span>
          </p>
          <p>
            คำแนะนำและบทวิเคราะห์ใน PhopePhum มุ่งเน้นการส่งเสริมสติ สมาธิ และการตระหนักรู้ในจังหวะกาลเวลาของตนเองตามคัมภีร์โหราศาสตร์ไทยโบราณ ไม่ใช่การการันตีชะตากรรมแบบงมงาย และไม่ได้รับประกันผลลัพธ์ทางการเงิน การลงทุน หรือความสำเร็จทางธุรกิจใดๆ ทั้งสิ้น ข้อมูลวันเดือนปีเกิดและประวัติส่วนตัวของคุณได้รับการปกป้องและเข้ารหัสตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล (PDPA)
          </p>
        </div>

        {/* Bottom copyright & attribution */}
        <div className="pt-6 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
          <p>
            © {currentYear} PhopePhum (ภพภูมิ). All rights reserved. สงวนลิขสิทธิ์ตามกฎหมาย
          </p>
          <div className="flex items-center gap-6">
            <Link to="/terms" className="hover:text-slate-900 dark:hover:text-white transition-colors">ข้อกำหนด</Link>
            <Link to="/privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">ความเป็นส่วนตัว</Link>
            <Link to="/refund" className="hover:text-slate-900 dark:hover:text-white transition-colors">การคืนเงิน</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
