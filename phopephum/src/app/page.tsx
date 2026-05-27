import LiveHoraWidget from "@/components/LiveHoraWidget";
import { Sparkles, Calendar, Zap, CreditCard, ArrowRight, ShieldCheck } from "lucide-react";

export const revalidate = 60; // อัปเดตข้อมูลทุก 60 วินาทีบน Server

export default function Home() {
  return (
    <div className="min-h-screen bg-hora-dark text-hora-text font-sans antialiased selection:bg-hora-gold selection:text-hora-dark">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(201,169,110,0.15),transparent_60%)] pointer-events-none" />

      {/* Header / Navigation Bar */}
      <header className="sticky top-0 z-50 glass-hora border-b border-hora-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <span className="text-2xl sm:text-3xl font-serif font-semibold text-hora-gold tracking-wide">Phopephum</span>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-hora-text/80">
            <a href="#live-calc" className="hover:text-hora-gold transition-colors">ยามสดปัจจุบัน</a>
            <a href="#features" className="hover:text-hora-gold transition-colors">คุณสมบัติ</a>
            <a href="#pricing" className="hover:text-hora-gold transition-colors">แพ็กเกจ</a>
          </nav>

          <div className="flex items-center gap-3">
            <a href="/login" className="hidden sm:inline text-sm font-medium hover:text-hora-gold transition-colors">เข้าสู่ระบบ</a>
            <a href="/register" className="btn-hora text-xs sm:text-sm shadow-md py-2 px-3 sm:px-4 rounded-lg whitespace-nowrap">เริ่มต้นใช้งาน</a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 sm:pt-24 pb-14 sm:pb-20 px-4 sm:px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-hora-gold/10 border border-hora-gold/20 text-hora-gold px-4 py-1.5 rounded-full text-xs font-semibold mb-8 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> พื้นที่ทางจิตวิญญาณแห่งการจัดการระดับพลังงาน
        </div>
        
        <h1 className="text-3xl sm:text-4xl md:text-7xl font-serif font-bold text-hora-gold-light tracking-tight leading-[1.15] max-w-5xl mx-auto mb-5">
          เปิดประตูสู่อนาคตด้วย
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-hora-gold via-[#E8D5A3] to-hora-gold mt-1">
            ศาสตร์ยามอัฐกาล &amp; การจัดการระดับพลังงาน
          </span>
        </h1>

        <p className="text-sm sm:text-base md:text-xl text-hora-text-muted max-w-3xl mx-auto font-sans leading-relaxed mb-8 px-2 sm:px-0">
          คำนวณยามอัฐกาลและชะตาจรระดับนาทีด้วยสูตรโบราณดั้งเดิม พร้อมบทวิเคราะห์ดวงชะตาอัจฉริยะ ส่งรายงานวิเคราะห์ชีวิตเชิงลึกสู่มือคุณอย่างหรูหราพรีเมียม
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10 sm:mb-16">
          <a href="/register" className="btn-hora w-full sm:w-auto text-sm sm:text-base py-3 px-6 sm:px-8 rounded-lg shadow-lg font-semibold flex items-center justify-center gap-2">
            คำนวณดวงชะตาของคุณ <ArrowRight className="w-4 h-4" />
          </a>
          <a href="#live-calc" className="w-full sm:w-auto glass-hora hover:bg-hora-gold/5 border border-hora-dark-border/40 text-hora-text text-sm sm:text-base py-3 px-6 sm:px-8 rounded-lg font-semibold transition-all">
            ดูยามสดขณะนี้
          </a>
        </div>

        {/* Live Widget - ยามอัฐกาลทำงานสดจริง (Client-side hydrated) */}
        <div id="live-calc">
          <LiveHoraWidget />
        </div>
      </section>


      {/* Features Section */}
      <section id="features" className="py-14 sm:py-24 bg-hora-dark-card/40 border-t border-b border-hora-dark-border/30 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-serif font-bold text-hora-gold-light mb-4 sm:mb-6">ฟังก์ชันระดับ Premium สำหรับคุณ</h2>
            <p className="text-hora-text-muted font-sans leading-relaxed">
              เรานำศาสตร์พยากรณ์ชั้นสูงที่คัดสรรเป็นพิเศษมาผสานกับระบบประมวลผลอันทันสมัย เพื่อผลลัพธ์ดวงชะตาที่แม่นยำและเป็นเลิศที่สุด
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="glass-hora rounded-xl p-6 border border-hora-dark-border/40 hover:border-hora-gold/40 transition-all duration-300">
              <div className="w-12 h-12 bg-hora-gold/10 text-hora-gold rounded-lg flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif font-semibold text-hora-gold-light mb-3">ยามอัฐกาลดั้งเดิม</h3>
              <p className="text-sm text-hora-text-muted leading-relaxed font-sans">
                คำนวณยามและเวลามงคลโบราณ (โหรทายหนู) ละเอียดระดับวินาที เพื่อการเริ่มต้นทำธุรกิจและกิจกรรมสำคัญอย่างไร้อุปสรรค
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-hora rounded-xl p-6 border border-hora-dark-border/40 hover:border-hora-gold/40 transition-all duration-300">
              <div className="w-12 h-12 bg-hora-gold/10 text-hora-gold rounded-lg flex items-center justify-center mb-6">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif font-semibold text-hora-gold-light mb-3">ระบบคำนวณชะตาจร</h3>
              <p className="text-sm text-hora-text-muted leading-relaxed font-sans">
                เจาะลึกระบบวัยจร ปีจร เดือนจร และวันจร เพื่อวางแผนรับมือช่วงชีวิตขาขึ้น-ขาลง ได้อย่างชาญฉลาดและถูกต้องตามคัมภีร์
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-hora rounded-xl p-6 border border-hora-dark-border/40 hover:border-hora-gold/40 transition-all duration-300">
              <div className="w-12 h-12 bg-hora-gold/10 text-hora-gold rounded-lg flex items-center justify-center mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif font-semibold text-hora-gold-light mb-3">เลข 7 ตัว 9 ฐาน</h3>
              <p className="text-sm text-hora-text-muted leading-relaxed font-sans">
                เปิดระบบถอดรหัสเลขประจำตัวและดวงพยากรณ์เฉพาะบุคคล (Core IP เฉพาะของ Phopephum) วิเคราะห์รากฐานชีวิตอย่างลึกซึ้ง
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-hora rounded-xl p-6 border border-hora-dark-border/40 hover:border-hora-gold/40 transition-all duration-300">
              <div className="w-12 h-12 bg-hora-gold/10 text-hora-gold rounded-lg flex items-center justify-center mb-6">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif font-semibold text-hora-gold-light mb-3">รายงานพยากรณ์ชีวิตระดับผู้เชี่ยวชาญ</h3>
              <p className="text-sm text-hora-text-muted leading-relaxed font-sans">
                ประมวลผลรายงานทิศทางชีวิตจากคัมภีร์ดั้งเดิม พร้อมส่งรายงานรูปแบบ PDF สุดคลาสสิกเข้าระบบส่วนตัวของคุณทันที
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Tiers Section */}
      <section id="pricing" className="py-14 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <span className="text-xs text-hora-gold font-semibold uppercase tracking-widest block mb-3">Pricing Plan</span>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-serif font-bold text-hora-gold-light mb-4 sm:mb-6">เลือกแพ็กเกจนำทางชีวิตของคุณ</h2>
          <p className="text-hora-text-muted font-sans leading-relaxed">
            เลือกแผนงานที่เหมาะสมกับตัวคุณ เพื่อรับการพยากรณ์และทิศทางชีวิตเชิงลึกที่แม่นยำที่สุด
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {/* Free Tier */}
          <div className="glass-hora rounded-2xl border border-hora-dark-border/40 p-8 flex flex-col justify-between hover:border-hora-gold/30 transition-all relative">
            <div>
              <span className="text-sm text-hora-text-muted font-semibold tracking-wider block mb-4 uppercase">ฟรีเริ่มต้น</span>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-serif font-bold text-hora-gold-light">฿0</span>
                <span className="text-sm text-hora-text-muted">/ ตลอดชีพ</span>
              </div>
              
              <ul className="space-y-4 mb-8 text-sm text-hora-text/80 font-sans border-t border-hora-dark-border/30 pt-6">
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-hora-gold" /> ยามอัฐกาล 5 ครั้ง/วัน</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-hora-gold" /> จักรกำเนิดพื้นฐาน</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-hora-gold" /> Life Report 1 ครั้ง/เดือน</li>
              </ul>
            </div>
            
            <a href="/register" className="w-full text-center border border-hora-dark-border hover:bg-hora-gold/5 text-hora-text py-3 rounded-lg font-semibold transition-all">
              เริ่มต้นใช้ฟรี
            </a>
          </div>

          {/* Pro Tier (Popular) */}
          <div className="glass-hora rounded-2xl border-2 border-hora-gold p-8 flex flex-col justify-between hover:-translate-y-1 transition-all relative overflow-hidden bg-hora-dark-card/60">
            <div className="absolute top-0 right-0 bg-hora-gold text-hora-dark font-sans font-bold text-xs uppercase px-4 py-1.5 rounded-bl-lg tracking-wider">
              ยอดนิยม
            </div>
            
            <div>
              <span className="text-sm text-hora-gold font-semibold tracking-wider block mb-4 uppercase">Pro แนะนำ</span>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-serif font-bold text-hora-gold-light">฿149</span>
                <span className="text-sm text-hora-text-muted">/ เดือน</span>
              </div>
              
              <ul className="space-y-4 mb-8 text-sm text-hora-text/80 font-sans border-t border-hora-gold/20 pt-6">
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-hora-gold" /> <strong>ยามอัฐกาลไม่จำกัด</strong></li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-hora-gold" /> <strong>ระบบจร (วัยจร/ปีจร) ครบถ้วน</strong></li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-hora-gold" /> Life Report 10 ครั้ง/เดือน</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-hora-gold" /> Export รายงานแบบ PDF พรีเมียม</li>
              </ul>
            </div>
            
            <a href="/register?plan=pro" className="w-full text-center btn-hora py-3 rounded-lg font-semibold shadow-md">
              เลือกแพ็กเกจ Pro
            </a>
          </div>

          {/* Premium Tier */}
          <div className="glass-hora rounded-2xl border border-hora-dark-border/40 p-8 flex flex-col justify-between hover:border-hora-gold/30 transition-all">
            <div>
              <span className="text-sm text-hora-text-muted font-semibold tracking-wider block mb-4 uppercase">Premium สูงสุด</span>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-serif font-bold text-hora-gold-light">฿299</span>
                <span className="text-sm text-hora-text-muted">/ เดือน</span>
              </div>
              
              <ul className="space-y-4 mb-8 text-sm text-hora-text/80 font-sans border-t border-hora-dark-border/30 pt-6">
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-hora-gold" /> ทุกฟีเจอร์คำนวณไม่จำกัด</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-hora-gold" /> <strong>ถอดรหัสเลข 7 ตัว 9 ฐาน (Unique IP)</strong></li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-hora-gold" /> Life Report ไม่จำกัดครั้ง</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-hora-gold" /> Priority Support 24/7</li>
              </ul>
            </div>
            
            <a href="/register?plan=premium" className="w-full text-center border border-hora-dark-border hover:bg-hora-gold/5 text-hora-text py-3 rounded-lg font-semibold transition-all">
              เลือกแพ็กเกจ Premium
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hora-dark-border/30 bg-hora-dark py-12 text-center text-sm text-hora-text-muted font-sans">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <p>© {new Date().getFullYear()} Phopephum — KruDen Web App Framework. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-hora-gold transition-colors">เงื่อนไขการใช้งาน</a>
            <a href="#" className="hover:text-hora-gold transition-colors">นโยบายความเป็นส่วนตัว</a>
            <a href="mailto:support@phopephum.com" className="hover:text-hora-gold transition-colors">ติดต่อเรา</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
