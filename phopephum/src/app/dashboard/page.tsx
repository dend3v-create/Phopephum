"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { calculateHora } from "@/engine/phopephum-calculator";
import { Sparkles, Calendar, User, Zap, LogOut, ArrowUpRight, ShieldCheck, Download, History } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Hora calculation state
  const [inputDate, setInputDate] = useState("");
  const [inputTime, setInputTime] = useState("");
  const [calculatedResult, setCalculatedResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // AI report generation
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportResult, setReportResult] = useState<any>(null);

  // Mobile feature toggles
  const [featureToggles, setFeatureToggles] = useState<Record<string, boolean>>({
    live_widget: true,
    planet_orbit: true,
    birth_details: true,
    subscription_card: true,
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = "/login";
          return;
        }
        setUser(user);

        // Fetch profile data
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (prof) {
          setProfile(prof);
          // Set initial date/time for calculator based on birthdate
          setInputDate(prof.birth_date);
          setInputTime(prof.birth_time || "12:00");
          
          // Pre-calculate
          const birthDateObj = new Date(prof.birth_date);
          const timeParts = (prof.birth_time || "12:00").split(":");
          const combinedDate = new Date(birthDateObj);
          combinedDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]));

          const result = calculateHora({ date: combinedDate, currentTime: combinedDate });
          setCalculatedResult(result);
        }

        // Fetch mobile screen feature configurations
        const { data: configs } = await supabase
          .from("mobile_features_config")
          .select("feature_key, is_enabled");

        if (configs && configs.length > 0) {
          const toggles = configs.reduce((acc: any, cur: any) => {
            acc[cur.feature_key] = cur.is_enabled;
            return acc;
          }, {});
          setFeatureToggles((prev) => ({ ...prev, ...toggles }));
        }
      } catch (err) {
        console.error("Error loading user data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleRecalculate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputDate) return;

    setIsCalculating(true);
    setTimeout(() => {
      const dateObj = new Date(inputDate);
      const combinedDate = new Date(dateObj);
      if (inputTime) {
        const timeParts = inputTime.split(":");
        combinedDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]));
      }
      
      const result = calculateHora({ date: combinedDate, currentTime: combinedDate });
      setCalculatedResult(result);
      setIsCalculating(false);
    }, 400);
  };

  const handleGenerateReport = async () => {
    if (generatingReport) return;
    setGeneratingReport(true);

    try {
      // Simulate/call API AI Report
      const res = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profile?.full_name || "ผู้ใช้งาน",
          birthDate: profile?.birth_date,
          birthTime: profile?.birth_time,
          birthProvince: profile?.birth_province,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setReportResult(data);
      } else {
        // Fallback mock report locally in case workers/keys are unconfigured
        setReportResult({
          success: true,
          report: {
            title: "รายงานชะตาชีวิตอัจฉริยะ",
            sections: [
              {
                title: "1. ภาพรวมชะตาชีวิตพื้นฐาน",
                content: `ดวงชะตาเด่นในด้านความมั่นคง ความรักความทะเยอทะยานและทักษะส่วนตัวได้รับการคุ้มครองโดยดาวพฤหัสบดีเด่นในยามอัฐกาล เป็นช่วงเวลาที่มีพลังและความก้าวหน้าสูงสุด`
              },
              {
                title: "2. การงานและวิถีการเงิน",
                content: `ดาวเจ้าเรือนการเงินสัมพันธ์กับดาวเกตุ มีเกณฑ์ได้รับโชคลาภลอยหรือรายได้จากงานเสริมที่เกี่ยวกับเทคโนโลยีและต่างประเทศ การลงทุนมีทิศทางที่ดี`
              },
              {
                title: "3. เคล็ดลับเสริมมงคลเฉพาะบุคคล",
                content: `สวมใส่เครื่องประดับโทนสีทองหรือแชมเปญ ทำบุญเสริมดวงชะตาด้วยการบริจาคค่าน้ำค่าไฟในวันเกิด และหลีกเลี่ยงกิจกรรมเสี่ยงในยามอับมงคลประจำวัน`
              }
            ]
          }
        });
      }
    } catch {
      // Safe fallback
      setReportResult({
        success: true,
        report: {
          title: "รายงานชะตาชีวิตอัจฉริยะ (Demo)",
          sections: [
            {
              title: "1. ภาพรวมดวงชะตาระดับพรีเมียม",
              content: `ดวงชะตาของคุณ ${profile?.full_name} กำเนิดภายใต้ดาวผู้ปกครองมงคลเด่น มีปัญญาเฉียบแหลม มักได้รับการสนับสนุนจากผู้ใหญ่`
            },
            {
              title: "2. การวิเคราะห์ทิศทางปีจร",
              content: `ปีนี้เป็นปีแห่งการเปลี่ยนแปลงครั้งใหญ่ (Transition Year) การโยกย้ายงานหรือการลงทุนในโปรเจกต์ใหม่จะสำเร็จลุล่วง`
            }
          ]
        }
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-hora-dark text-hora-text flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-hora-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-hora-text-muted">กำลังเตรียมข้อมูลดวงชะตาส่วนบุคคล...</p>
        </div>
      </div>
    );
  }

  const current = calculatedResult?.currentHora;

  return (
    <div className="min-h-screen bg-hora-dark text-hora-text font-sans pb-20 selection:bg-hora-gold selection:text-hora-dark">
      {/* Subtle Background radial light */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,169,110,0.1),transparent_60%)] pointer-events-none" />

      {/* Header Bar */}
      <header className="sticky top-0 z-40 glass-hora border-b border-hora-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/" className="text-xl sm:text-2xl font-serif font-bold text-hora-gold tracking-wide">
                Phopephum
              </Link>
              <span className="hidden sm:inline text-xxs bg-hora-gold/10 border border-hora-gold/30 text-hora-gold px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                {profile?.plan || "FREE"} MEMBER
              </span>
            </div>
            
            {/* Quick Navigation Menu for Wisdom OS */}
            <nav className="hidden md:flex items-center gap-6 text-xxs font-semibold uppercase tracking-widest pt-0.5">
              <Link href="/dashboard" className="text-hora-gold font-bold hover:text-hora-gold-light transition-colors">
                ภาพรวมดวง
              </Link>
              <Link href="/dashboard/planner" className="text-hora-text-muted hover:text-hora-gold transition-colors flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-hora-gold" /> TQM Planner
              </Link>
              <Link href="/dashboard/coach" className="text-hora-text-muted hover:text-hora-gold transition-colors flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-hora-gold" /> AI Coach
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {profile?.role === "admin" && (
              <Link
                href="/admin"
                className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg px-3 py-1.5 glass-hora transition-colors font-bold"
              >
                ⚙️ แผงควบคุมแอดมิน
              </Link>
            )}
            <span className="text-sm text-hora-text-muted hidden sm:inline flex items-center gap-2">
              <User className="w-4 h-4 text-hora-gold" /> คุณ{profile?.full_name}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs hover:text-red-400 text-hora-text-muted/80 flex items-center gap-1.5 transition-colors cursor-pointer border border-hora-dark-border/60 rounded-lg px-3 py-1.5 glass-hora"
            >
              <LogOut className="w-3.5 h-3.5" /> ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 grid md:grid-cols-3 gap-6 sm:gap-8 relative z-10">
        
        {/* Left Column: User Profile & Subscription status */}
        <div className="space-y-8 md:col-span-1">
          {/* User Info Details card */}
          {featureToggles.birth_details && (
            <div className="glass-hora rounded-2xl p-6 border border-hora-dark-border/80 relative overflow-hidden">
              <h3 className="text-lg font-serif font-semibold text-hora-gold-light mb-4 flex items-center gap-2 border-b border-hora-dark-border/30 pb-3">
                🪐 พื้นดวงชะตากำเนิด
              </h3>
              
              <div className="space-y-4 text-sm font-sans">
                <div className="flex justify-between">
                  <span className="text-hora-text-muted">ชื่อ-สกุล</span>
                  <span className="font-semibold text-hora-text">{profile?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hora-text-muted">วันเกิด</span>
                  <span className="font-semibold text-hora-text">{profile?.birth_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hora-text-muted">เวลาเกิด</span>
                  <span className="font-semibold text-hora-text">{profile?.birth_time || "ไม่ระบุ"} น.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hora-text-muted">จังหวัดเกิด</span>
                  <span className="font-semibold text-hora-text">{profile?.birth_province || "ไม่ระบุ"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hora-text-muted">เพศ</span>
                  <span className="font-semibold text-hora-text">
                    {profile?.gender === "male" ? "ชาย" : profile?.gender === "female" ? "หญิง" : "ไม่ระบุ"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Subscription plan card */}
          {featureToggles.subscription_card && (
            <div className="glass-hora rounded-2xl p-6 border-2 border-hora-gold/40 relative overflow-hidden bg-hora-dark-card/60">
              <h3 className="text-lg font-serif font-semibold text-hora-gold-light mb-4 flex items-center gap-2 border-b border-hora-gold/20 pb-3">
                💎 แพ็กเกจสมาชิก
              </h3>
              
              <div className="space-y-4 font-sans text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-hora-text-muted">แพ็กเกจปัจจุบัน</span>
                  <span className="bg-hora-gold/10 text-hora-gold border border-hora-gold/30 px-3 py-1 rounded-full text-xs font-bold uppercase">
                    {profile?.plan || "FREE"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hora-text-muted">โควตา AI Report คืนนี้</span>
                  <span className="font-bold text-hora-gold">
                    {profile?.plan === "free" ? "1 ครั้ง/เดือน" : profile?.plan === "pro" ? "10 ครั้ง/เดือน" : "ไม่จำกัด"}
                  </span>
                </div>

                {profile?.plan === "free" && (
                  <div className="pt-4 border-t border-hora-gold/10">
                    <p className="text-xs text-hora-text-muted leading-relaxed mb-4">
                      อัปเกรดเพื่อรับสิทธิ์ดูยามอัฐกาลย้อนหลังวิเคราะห์ชะตาจร และดาวน์โหลดรายงานในรูปแบบ PDF สุดหรูหรา
                    </p>
                    <Link href="/#pricing" className="btn-hora w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5">
                    อัปเกรดแผนพรีเมียม <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        {/* Middle and Right: Interactive Calculator & Live horoscope info */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Interactive Calculator Section */}
          <div className="glass-hora rounded-2xl p-6 border border-hora-dark-border/80">
            <h3 className="text-xl font-serif font-semibold text-hora-gold-light mb-6 flex items-center gap-2">
              🪐 เครื่องคำนวณยามอัฐกาลอัจฉริยะ
            </h3>

            <form onSubmit={handleRecalculate} className="grid sm:grid-cols-3 gap-4 items-end mb-8 font-sans">
              <div className="space-y-1.5">
                <label className="text-xs text-hora-text-muted">เลือกวันที่</label>
                <input
                  type="date"
                  required
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                  className="w-full bg-[#14110C] border border-hora-dark-border/60 focus:border-hora-gold/80 rounded-lg px-4 py-2.5 text-sm text-hora-text outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-hora-text-muted">เลือกเวลา</label>
                <input
                  type="time"
                  required
                  value={inputTime}
                  onChange={(e) => setInputTime(e.target.value)}
                  className="w-full bg-[#14110C] border border-hora-dark-border/60 focus:border-hora-gold/80 rounded-lg px-4 py-2.5 text-sm text-hora-text outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isCalculating}
                className="btn-hora w-full py-2.5 rounded-lg font-semibold text-sm h-[42px] cursor-pointer"
              >
                {isCalculating ? "กำลังพยากรณ์..." : "คำนวณยามดวงชะตา"}
              </button>
            </form>

            {calculatedResult && (
              <div className="border-t border-hora-dark-border/40 pt-6 space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  
                  {featureToggles.live_widget ? (
                    <div className="space-y-2 text-left">
                      <span className="text-xxs text-hora-gold uppercase font-bold tracking-widest">Result</span>
                      <h4 className="text-2xl font-serif font-semibold text-hora-gold-light">
                        ยามอัฐกาลประจำวัน{calculatedResult.dayNameThai}
                      </h4>
                      <p className="text-sm text-hora-text-muted font-sans">
                        ผลการคำนวณ ณ วันที่ {inputDate} เวลา {inputTime} น.
                      </p>
                      
                      {current && (
                        <div className="space-y-1 pt-2 font-sans">
                          <p className="text-sm text-hora-text font-medium">
                            ยามใหญ่ลำดับที่ {current.majorIndex} ({current.majorSlot.startTime} - {current.majorSlot.endTime} น.)
                          </p>
                          <p className="text-xs text-hora-text-muted">
                            ดาวผู้ปกครองย่อยหลัก: <strong className="text-hora-gold">{current.subSlot.planet.nameThai} ({current.subSlot.planet.symbol})</strong> — {current.subSlot.planet.description}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-hora-text-muted font-sans py-4">
                      ระบบยามอัฐกาลสดถูกปิดการแสดงผลโดยแอดมิน
                    </div>
                  )}

                  {/* Circular Orbit Display Simulation */}
                  {featureToggles.planet_orbit && (
                    <div className="relative w-36 h-36 flex items-center justify-center rounded-full border-2 border-hora-gold/20 bg-hora-dark-card/50 shadow-inner">
                      <div className="absolute inset-1.5 rounded-full border border-dashed border-hora-gold/10" />
                      <div className="text-center">
                        <span className="text-4xl block mb-0.5 filter drop-shadow-[0_0_8px_rgba(201,169,110,0.6)]" style={{ color: current?.subSlot.planet.color }}>
                          {current?.subSlot.planet.symbol}
                        </span>
                        <span className="text-xs font-semibold text-hora-gold-light">{current?.subSlot.planet.nameThai}</span>
                        <span className="text-xxs block text-hora-text-muted tracking-widest">ครองยาม</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AI Intelligent Report Card */}
          <div className="glass-hora rounded-2xl p-6 border border-hora-gold/20 relative overflow-hidden bg-hora-dark-card/30">
            <div className="absolute top-0 right-0 w-32 h-32 bg-hora-gold/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6">
              <div className="text-left space-y-1.5">
                <span className="text-xxs text-hora-gold font-bold uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-hora-gold" /> AI Assistant
                </span>
                <h3 className="text-xl font-serif font-semibold text-hora-gold-light">รายงานวิเคราะห์ชะตาชีวิตด้วย AI</h3>
                <p className="text-xs text-hora-text-muted font-sans leading-relaxed">
                  ประมวลผลดวงชะตาอดีต ปัจจุบัน อนาคต พร้อมถอดรหัสยามอัฐกาลส่งตรงความแม่นยำด้วย AI อัจฉริยะ
                </p>
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="btn-hora w-full sm:w-auto py-2.5 px-6 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {generatingReport ? (
                  <>กำลังวิเคราะห์เชิงลึก...</>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" /> วิเคราะห์ด้วย AI
                  </>
                )}
              </button>
            </div>

            {reportResult && (
              <div className="border-t border-hora-dark-border/40 pt-6 mt-4 space-y-6 font-sans">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-hora-gold-light flex items-center gap-2">
                    ✨ {reportResult.report.title}
                  </h4>
                  <button className="text-xs text-hora-gold border border-hora-gold/30 hover:bg-hora-gold/10 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all">
                    <Download className="w-3.5 h-3.5" /> บันทึกเป็น PDF
                  </button>
                </div>

                <div className="space-y-6 mt-4">
                  {reportResult.report.sections.map((sec: any, idx: number) => (
                    <div key={idx} className="bg-[#14110C] border border-hora-dark-border/60 rounded-xl p-5 space-y-2">
                      <h5 className="font-semibold text-hora-gold-light border-b border-hora-dark-border/30 pb-2 mb-2 text-sm">
                        {sec.title}
                      </h5>
                      <p className="text-xs text-hora-text-muted leading-relaxed text-left">
                        {sec.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
