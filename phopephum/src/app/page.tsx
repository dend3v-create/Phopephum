import LiveHoraWidget from "@/components/LiveHoraWidget";
import { Sparkles, Calendar, Zap, CreditCard, ArrowRight, ShieldCheck } from "lucide-react";

export const revalidate = 60; // อัปเดตข้อมูลทุก 60 วินาทีบน Server

export default function Home() {
  return (
    <div className="min-h-screen bg-hora-dark text-hora-text font-sans antialiased selection:bg-hora-gold selection:text-hora-dark relative overflow-x-hidden">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(201,169,110,0.15),transparent_60%)] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-[800px] bg-[url('https://pub-16226bd5c8f24ed4be36a292cda80f98.r2.dev/cosmic-glow.png')] bg-top bg-no-repeat opacity-20 pointer-events-none mix-blend-screen" />

      {/* Header / Navigation Bar */}
      <header className="sticky top-0 z-50 glass-hora border-b border-hora-dark-border/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-24 flex items-center justify-between">
          <span className="text-2xl sm:text-4xl font-serif font-bold text-hora-gold tracking-[0.1em] drop-shadow-sm">Phopephum</span>

          <nav className="hidden md:flex items-center gap-10 text-[10px] font-bold uppercase tracking-[0.2em] text-hora-text/70">
            <a href="#live-calc" className="hover:text-hora-gold transition-all duration-300">ยามสดปัจจุบัน</a>
            <a href="#features" className="hover:text-hora-gold transition-all duration-300">คุณสมบัติ</a>
            <a href="#pricing" className="hover:text-hora-gold transition-all duration-300">แพ็กเกจ</a>
          </nav>

          <div className="flex items-center gap-4">
            <a href="/login" className="hidden sm:inline text-xs font-bold uppercase tracking-widest hover:text-hora-gold transition-colors">เข้าสู่ระบบ</a>
            <a href="/register" className="btn-hora text-xs py-3 px-6 rounded-full shadow-xl">เริ่มต้นใช้งาน</a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-40 pb-16 sm:pb-32 px-4 sm:px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-hora-gold/10 border border-hora-gold/30 text-hora-gold px-5 py-2 rounded-full text-[10px] font-bold mb-10 uppercase tracking-[0.3em] animate-pulse">
          <Sparkles className="w-4 h-4" /> พื้นที่ทางจิตวิญญาณแห่งจักรพรรดิ
        </div>
        
        <h1 className="text-4xl sm:text-6xl md:text-8xl font-serif font-bold text-hora-gold-light tracking-tight leading-[1.05] max-w-6xl mx-auto mb-8">
          เปิดประตูสู่อนาคตด้วย
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-hora-gold via-[#F2D49B] to-hora-gold mt-4 pb-2">
            ศาสตร์ยามอัฐกาลชั้นสูง
          </span>
        </h1>

        <p className="text-sm sm:text-lg md:text-2xl text-hora-text-muted/90 max-w-4xl mx-auto font-sans leading-relaxed mb-12 px-2 sm:px-0 font-medium">
          คำนวณยามมงคลและชะตาจรระดับนาทีด้วยสูตรโบราณดั้งเดิม พร้อมบทวิเคราะห์ดวงชะตาอัจฉริยะ ส่งรายงานวิเคราะห์ชีวิตเชิงลึกสู่มือคุณอย่างหรูหราพรีเมียม
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-16 sm:mb-24">
          <a href="/register" className="btn-hora w-full sm:w-auto text-base py-4 px-10 rounded-full shadow-2xl font-bold flex items-center justify-center gap-3 scale-110 hover:scale-115">
            คำนวณดวงชะตาของคุณ <ArrowRight className="w-5 h-5" />
          </a>
          <a href="#live-calc" className="w-full sm:w-auto glass-hora hover:bg-hora-gold/10 border border-hora-gold/30 text-hora-text text-base py-4 px-10 rounded-full font-bold transition-all flex items-center justify-center gap-2">
            ดูยามสดขณะนี้
          </a>
        </div>

        {/* Live Widget */}
        <div id="live-calc" className="relative group">
          <div className="absolute -inset-4 bg-hora-gold/5 rounded-[3rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          <LiveHoraWidget />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-32 bg-hora-dark-card/30 border-y border-hora-dark-border/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,rgba(75,111,174,0.05),transparent_50%)] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
            <span className="text-[10px] text-hora-gold font-bold uppercase tracking-[0.4em] block mb-4">Master Science</span>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-serif font-bold text-hora-gold-light mb-6">ฟังก์ชันระดับ Imperial สำหรับคุณ</h2>
            <p className="text-lg text-hora-text-muted/80 font-sans leading-relaxed">
              เรานำศาสตร์พยากรณ์ชั้นสูงที่คัดสรรเป็นพิเศษมาผสานกับระบบ AI ประมวลผลอันทันสมัย เพื่อผลลัพธ์ดวงชะตาที่แม่นยำและเป็นเลิศที่สุด
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { 
                icon: <Sparkles className="w-7 h-7" />, 
                title: "ยามอัฐกาลดั้งเดิม", 
                desc: "คำนวณยามและเวลามงคลโบราณ (โหรทายหนู) ละเอียดระดับวินาที เพื่อการเริ่มต้นธุรกิจและกิจกรรมสำคัญอย่างไร้อุปสรรค" 
              },
              { 
                icon: <Calendar className="w-7 h-7" />, 
                title: "ระบบคำนวณชะตาจร", 
                desc: "เจาะลึกระบบวัยจร ปีจร เดือนจร และวันจร เพื่อวางแผนรับมือช่วงชีวิตขาขึ้น-ขาลง ได้อย่างชาญฉลาดและถูกต้องตามคัมภีร์" 
              },
              { 
                icon: <Zap className="w-7 h-7" />, 
                title: "เลข 7 ตัว 9 ฐาน", 
                desc: "เปิดระบบถอดรหัสเลขประจำตัวและดวงพยากรณ์เฉพาะบุคคล วิเคราะห์รากฐานชีวิตอย่างลึกซึ้งด้วย Unique Algorithm" 
              },
              { 
                icon: <CreditCard className="w-7 h-7" />, 
                title: "รายงานวิเคราะห์ระดับสูง", 
                desc: "ประมวลผลรายงานทิศทางชีวิตจากคัมภีร์ดั้งเดิม พร้อมส่งรายงานรูปแบบ PDF สุดพรีเมียมเข้าระบบส่วนตัวของคุณทันที" 
              }
            ].map((f, i) => (
              <div key={i} className="glass-hora rounded-[2rem] p-8 border border-white/5 hover:border-hora-gold/40 transition-all duration-500 group bg-cosmic-900/20">
                <div className="w-14 h-14 bg-hora-gold/10 text-hora-gold rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 border border-hora-gold/20">
                  {f.icon}
                </div>
                <h3 className="text-2xl font-serif font-bold text-hora-gold-light mb-4">{f.title}</h3>
                <p className="text-sm text-hora-text-muted leading-relaxed font-sans opacity-80 group-hover:opacity-100 transition-opacity">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Tiers Section */}
      <section id="pricing" className="py-20 sm:py-32 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <span className="text-[10px] text-hora-gold font-bold uppercase tracking-[0.4em] block mb-4">Investment</span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-serif font-bold text-hora-gold-light mb-6">ระดับแห่งสิทธิ์การเข้าถึง</h2>
          <p className="text-lg text-hora-text-muted/80 font-sans leading-relaxed">
            เลือกแผนงานที่เหมาะสมกับตัวคุณ เพื่อรับการพยากรณ์และทิศทางชีวิตเชิงลึกที่แม่นยำระดับจักรพรรดิ
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-10 items-stretch max-w-6xl mx-auto">
          {/* Free Tier */}
          <div className="glass-hora rounded-[2.5rem] border border-white/5 p-10 flex flex-col justify-between hover:border-hora-gold/20 transition-all relative bg-cosmic-900/10">
            <div>
              <span className="text-[10px] text-hora-text-muted font-bold tracking-[0.2em] block mb-6 uppercase">Basic Initiation</span>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-6xl font-serif font-bold text-hora-gold-light">฿0</span>
                <span className="text-xs text-hora-text-muted uppercase tracking-widest">/ LIFETIME</span>
              </div>
              
              <ul className="space-y-5 mb-10 text-sm text-hora-text/70 font-sans border-t border-white/5 pt-8">
                <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-hora-gold/50" /> ยามอัฐกาล 5 ครั้ง/วัน</li>
                <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-hora-gold/50" /> จักรกำเนิดพื้นฐาน</li>
                <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-hora-gold/50" /> Life Report 1 ครั้ง/เดือน</li>
              </ul>
            </div>
            
            <a href="/register" className="w-full text-center border border-hora-gold/20 hover:bg-hora-gold/5 text-hora-text py-4 rounded-full font-bold transition-all uppercase tracking-widest text-xs">
              เริ่มต้นใช้ฟรี
            </a>
          </div>

          {/* Pro Tier (Popular) */}
          <div className="glass-hora rounded-[2.5rem] border-2 border-hora-gold/40 p-10 flex flex-col justify-between hover:-translate-y-2 transition-all duration-500 relative overflow-hidden bg-cosmic-900/40 shadow-2xl shadow-hora-gold/10 md:scale-105">
            <div className="absolute top-0 right-0 bg-hora-gold text-hora-dark font-sans font-bold text-[10px] uppercase px-6 py-2 rounded-bl-2xl tracking-[0.2em]">
              Recommended
            </div>
            
            <div>
              <span className="text-[10px] text-hora-gold font-bold tracking-[0.2em] block mb-6 uppercase">Professional Sage</span>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-6xl font-serif font-bold text-hora-gold-light">฿149</span>
                <span className="text-xs text-hora-gold uppercase tracking-widest font-bold">/ MONTH</span>
              </div>
              
              <ul className="space-y-5 mb-10 text-sm text-hora-text font-sans border-t border-hora-gold/20 pt-8">
                <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-hora-gold" /> <strong>ยามอัฐกาลไม่จำกัด</strong></li>
                <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-hora-gold" /> <strong>ระบบจร (วัยจร/ปีจร) ครบถ้วน</strong></li>
                <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-hora-gold" /> AI Life Report 10 ครั้ง/เดือน</li>
                <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-hora-gold" /> Export รายงาน PDF พรีเมียม</li>
              </ul>
            </div>
            
            <a href="/register?plan=pro" className="w-full text-center btn-hora py-4 rounded-full font-bold shadow-2xl shadow-hora-gold/20 uppercase tracking-widest text-xs">
              เลือกแพ็กเกจ Pro
            </a>
          </div>

          {/* Premium Tier */}
          <div className="glass-hora rounded-[2.5rem] border border-white/5 p-10 flex flex-col justify-between hover:border-hora-gold/20 transition-all bg-cosmic-900/10">
            <div>
              <span className="text-[10px] text-hora-text-muted font-bold tracking-[0.2em] block mb-6 uppercase">Imperial Master</span>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-6xl font-serif font-bold text-hora-gold-light">฿299</span>
                <span className="text-xs text-hora-text-muted uppercase tracking-widest">/ MONTH</span>
              </div>
              
              <ul className="space-y-5 mb-10 text-sm text-hora-text/70 font-sans border-t border-white/5 pt-8">
                <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-hora-gold/50" /> ทุกฟีเจอร์คำนวณไม่จำกัด</li>
                <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-hora-gold/50" /> <strong>ศาสตร์เลข 7 ตัว 9 ฐาน (Core IP)</strong></li>
                <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-hora-gold/50" /> Life Report ไม่จำกัดครั้ง</li>
                <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-hora-gold/50" /> Priority Wisdom Support</li>
              </ul>
            </div>
            
            <a href="/register?plan=premium" className="w-full text-center border border-hora-gold/20 hover:bg-hora-gold/5 text-hora-text py-4 rounded-full font-bold transition-all uppercase tracking-widest text-xs">
              เลือกแพ็กเกจ Premium
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-hora-dark py-20 text-center relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-hora-gold/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="text-left">
              <span className="text-2xl font-serif font-bold text-hora-gold tracking-widest block mb-4">Phopephum</span>
              <p className="text-xs text-hora-text-muted/60 max-w-xs leading-relaxed uppercase tracking-tighter">
                Evolve your destiny with cosmic intelligence and ancient wisdom algorithms.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-10 text-[10px] font-bold uppercase tracking-[0.2em] text-hora-text/50">
              <a href="#" className="hover:text-hora-gold transition-colors">เงื่อนไขการใช้งาน</a>
              <a href="#" className="hover:text-hora-gold transition-colors">นโยบายความเป็นส่วนตัว</a>
              <a href="mailto:support@phopephum.com" className="hover:text-hora-gold transition-colors">ติดต่อเรา</a>
            </div>
          </div>
          <div className="mt-20 pt-10 border-t border-white/5 text-[9px] text-hora-text-muted/30 uppercase tracking-[0.3em]">
            © {new Date().getFullYear()} Phopephum — KruDen Web App Framework. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
