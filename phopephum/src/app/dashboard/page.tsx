"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { calculateHora } from "@/engine/phopephum-calculator";
import { Sparkles, Calendar, User, Zap, LogOut, ArrowUpRight, ShieldCheck, Download, History, Map, Compass, Scroll, Target, Award } from "lucide-react";
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
      if (res.ok && data.success) {
        setReportResult(data.data.content);
      } else {
        // Fallback or show error
        console.error("Failed to generate report");
      }
    } catch (err) {
      console.error("Error generating report:", err);
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cosmic-950 text-foreground flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-hora-text-muted">กำลังเตรียมข้อมูลดวงชะตาส่วนบุคคล...</p>
        </div>
      </div>
    );
  }

  const current = calculatedResult?.currentHora;
  const isPremium = profile?.plan === "pro" || profile?.plan === "premium";

  return (
    <div className="min-h-screen bg-cosmic-950 text-foreground font-sans pb-20 selection:bg-gold-500 selection:text-cosmic-950">
      {/* Background layers */}
      <div className="bg-cosmic-portal" />
      <div className="cosmic-nebula-aura" />
      <div className="cosmic-zodiac-wheel" />

      {/* Header Bar */}
      <header className="sticky top-0 z-40 glass-hora border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/" className="text-xl sm:text-2xl font-serif font-bold text-gradient-gold tracking-widest">
                PHOPEPHUM
              </Link>
              <span className="hidden sm:inline text-xxs bg-gold-500/10 border border-gold-500/30 text-gold-500 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">
                {profile?.plan || "FREE"} MEMBER
              </span>
            </div>
            
            {/* Quick Navigation Menu */}
            <nav className="hidden md:flex items-center gap-8 text-xxs font-bold uppercase tracking-widest pt-0.5">
              <Link href="/dashboard" className="text-gold-500 border-b border-gold-500 pb-1">ภาพรวมดวง</Link>
              <Link href="/dashboard/planner" className="text-text-secondary hover:text-gold-500 transition-colors flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Planner
              </Link>
              <Link href="/dashboard/coach" className="text-text-secondary hover:text-gold-500 transition-colors flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> AI Coach
              </Link>
              <Link href="/dashboard/report" className="text-text-secondary hover:text-gold-500 transition-colors flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Reports
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary hidden sm:flex items-center gap-2">
              <User className="w-4 h-4 text-gold-500" /> {profile?.full_name}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs text-text-secondary/70 hover:text-red-400 flex items-center gap-1.5 transition-colors cursor-pointer border border-white/5 rounded-full px-4 py-2 glass-hora"
            >
              <LogOut className="w-3.5 h-3.5" /> ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 grid md:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Column */}
        <div className="space-y-8 md:col-span-1">
          {featureToggles.birth_details && (
            <div className="glass-hora p-6 border-white/5">
              <h3 className="text-lg font-serif font-bold text-gold-500 mb-6 flex items-center gap-2 uppercase tracking-widest border-b border-white/5 pb-4">
                <Compass className="w-5 h-5" /> พิกัดกำเนิด
              </h3>
              
              <div className="space-y-5 text-sm">
                {[
                  { label: "นามนามา", value: profile?.full_name },
                  { label: "ศุกรวาร", value: profile?.birth_date },
                  { label: "นาฬิกา", value: `${profile?.birth_time || "ไม่ระบุ"} น.` },
                  { label: "ภูมิสถาน", value: profile?.birth_province },
                  { label: "เพศสถาน", value: profile?.gender === "male" ? "ชาย" : profile?.gender === "female" ? "หญิง" : "ไม่ระบุ" }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center group">
                    <span className="text-hora-text-muted group-hover:text-gold-500/70 transition-colors">{item.label}</span>
                    <span className="font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {featureToggles.subscription_card && (
            <div className="glass-hora p-6 border-gold-500/20 bg-gold-500/5">
              <h3 className="text-lg font-serif font-bold text-gold-300 mb-6 flex items-center gap-2 uppercase tracking-widest border-b border-gold-500/10 pb-4">
                <Award className="w-5 h-5" /> ระดับบารมี
              </h3>
              
              <div className="space-y-5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-hora-text-muted">สถานะบัญชี</span>
                  <span className="bg-gold-500/20 text-gold-300 border border-gold-500/30 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                    {profile?.plan || "FREE"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hora-text-muted">สิทธิ์ AI วิเคราะห์</span>
                  <span className="font-bold text-gold-300">
                    {profile?.plan === "free" ? "1 ครั้ง/เดือน" : profile?.plan === "pro" ? "10 ครั้ง/เดือน" : "ไม่จำกัด"}
                  </span>
                </div>

                {!isPremium && (
                  <div className="pt-6 border-t border-white/5">
                    <p className="text-xs text-text-secondary leading-relaxed mb-6 italic">
                      &ldquo;ปลดล็อกพลังมหาอุจจ์ เพื่อรับการวิเคราะห์ยามมงคลเฉพาะบุคคลและรายงาน PDF ระดับ Imperial&rdquo;
                    </p>
                    <Link href="/#pricing" className="btn-hora w-full text-xs">
                      อัปเกรดแผนพรีเมียม <ArrowUpRight className="ml-2 w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Middle and Right */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Calculator */}
          <div className="glass-hora p-6 sm:p-8">
            <div className="mb-8">
              <h3 className="text-xl font-serif font-bold text-gold-500 flex items-center gap-3 uppercase tracking-widest">
                <Target className="w-6 h-6" /> คำนวณยามอัฐกาล
              </h3>
              <p className="text-xs text-text-secondary mt-2 font-medium">ระบุเวลาเพื่อเปิดรหัสยามมงคลเฉพาะกิจ</p>
            </div>

            <form onSubmit={handleRecalculate} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end mb-8">
              <div className="space-y-2">
                <label className="text-xxs font-bold uppercase tracking-widest text-hora-text-muted ml-1">วันเดือนปี</label>
                <input
                  type="date"
                  required
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                  className="w-full bg-cosmic-950/50 border border-white/10 focus:border-gold-500/50 rounded-xl px-4 py-3 text-sm outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xxs font-bold uppercase tracking-widest text-hora-text-muted ml-1">เวลาเกิด</label>
                <input
                  type="time"
                  required
                  value={inputTime}
                  onChange={(e) => setInputTime(e.target.value)}
                  className="w-full bg-cosmic-950/50 border border-white/10 focus:border-gold-500/50 rounded-xl px-4 py-3 text-sm outline-none transition-all"
                />
              </div>
              <button type="submit" disabled={isCalculating} className="btn-hora w-full">
                {isCalculating ? "ประมวลผล..." : "เปิดรหัสยาม"}
              </button>
            </form>

            {calculatedResult && (
              <div className="border-t border-white/5 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-3 bg-gold-500/5 border border-gold-500/10 rounded-full px-5 py-2.5 mb-8 w-fit mx-auto sm:mx-0">
                  <span className="text-xxs text-gold-500 font-bold uppercase tracking-widest">ยามกำเนิด</span>
                  <div className="w-1 h-1 rounded-full bg-gold-500/30" />
                  <span className="text-xxs text-text-secondary font-medium tracking-wide">
                    {new Date(inputDate).toLocaleDateString('th-TH', { dateStyle: 'long' })} · {inputTime} น.
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-8 bg-cosmic-900/40 p-6 rounded-3xl border border-white/5">
                  <div className="text-center sm:text-left flex-1">
                    <h4 className="text-2xl font-serif font-bold text-gold-300 mb-2">วัน{calculatedResult.dayNameThai}</h4>
                    {current && (
                      <div className="space-y-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-xxs font-bold uppercase tracking-widest text-hora-text-muted">ยามใหญ่ที่ {current.majorIndex}</span>
                          <span className="text-lg font-medium text-foreground">{current.majorSlot.startTime} – {current.majorSlot.endTime} น.</span>
                        </div>
                        <div className="pt-2">
                          <span className="text-xxs font-bold uppercase tracking-widest text-gold-500/60 block mb-1">ดาวครองยาม</span>
                          <p className="text-sm font-semibold text-gold-400">
                            {current.subSlot.planet.nameThai} ({current.subSlot.planet.symbol})
                          </p>
                          <p className="text-xs text-text-secondary mt-1 max-w-sm italic">{current.subSlot.planet.description}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {featureToggles.planet_orbit && (
                    <div className="relative w-36 h-36 flex items-center justify-center rounded-full border border-gold-500/20 bg-cosmic-950 shadow-[0_0_50px_rgba(198,169,107,0.05)] float-element">
                      <div className="absolute inset-2 rounded-full border border-dashed border-gold-500/10 animate-[spin_60s_linear_infinite]" />
                      <div className="text-center z-10">
                        <span className="text-5xl block mb-1 filter drop-shadow-[0_0_15px_rgba(198,169,107,0.5)]" style={{ color: current?.subSlot.planet.color }}>
                          {current?.subSlot.planet.symbol}
                        </span>
                        <span className="text-xxs font-bold text-gold-300 uppercase tracking-widest">{current?.subSlot.planet.nameThai}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AI Dashboard - Analysis Section */}
          <div className="glass-hora p-8 border-gold-500/30 bg-cosmic-900/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-10">
              <div className="space-y-3">
                <span className="text-xxs text-gold-500 font-bold uppercase tracking-[0.3em] flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> AI WISDOM ASSISTANT
                </span>
                <h3 className="text-2xl font-serif font-bold text-foreground uppercase tracking-widest">รายงานวิเคราะห์ชะตาชีวิต</h3>
                <p className="text-xs text-text-secondary leading-relaxed max-w-lg">
                  ประมวลผลดวงชะตา อดีต-ปัจจุบัน-อนาคต และยามอัฐกาลแบบพลวัต ด้วยขุมพลัง AI วิเคราะห์เชิงลึกดั่งมหาอุจจ์
                </p>
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="btn-hora whitespace-nowrap"
              >
                {generatingReport ? "กำลังวิเคราะห์..." : "วิเคราะห์ด้วย AI"}
              </button>
            </div>

            {reportResult ? (
              <div className="space-y-8 animate-in fade-in duration-1000">
                {/* Standard Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { title: "ตัวตนและภาพลักษณ์", content: reportResult.identity?.attha, icon: <User className="w-4 h-4" /> },
                    { title: "เสน่ห์และการสื่อสาร", content: reportResult.charm?.overview, icon: <Sparkles className="w-4 h-4" /> },
                    { title: "ยุทธศาสตร์อาชีพ", content: reportResult.career, icon: <Target className="w-4 h-4" /> },
                    { title: "แผนที่การเงิน", content: reportResult.finance, icon: <Zap className="w-4 h-4" /> }
                  ].map((item, i) => (
                    <div key={i} className="bg-cosmic-950/40 border border-white/5 rounded-2xl p-6 hover:border-gold-500/30 transition-all group">
                      <div className="flex items-center gap-3 mb-4 text-gold-500">
                        {item.icon}
                        <h5 className="text-xxs font-bold uppercase tracking-widest">{item.title}</h5>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed text-left group-hover:text-foreground transition-colors line-clamp-4">
                        {item.content}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Premium Exclusive Sections */}
                {isPremium ? (
                  <div className="space-y-6 pt-6 border-t border-gold-500/20">
                    <h4 className="text-xxs font-bold text-gold-300 uppercase tracking-[0.4em] text-center mb-8">Premium Imperial Insights</h4>
                    <div className="grid grid-cols-1 gap-6">
                      {[
                        { title: "Golden Hour Execution (ยุทธศาสตร์นาทีทอง)", content: reportResult.goldenHourExecution, icon: <Zap className="w-5 h-5" /> },
                        { title: "Karmic Blueprint (พรสวรรค์จากอดีตชาติ)", content: reportResult.karmicBlueprint, icon: <Scroll className="w-5 h-5" /> },
                        { title: "Adaptive Life Script (ฉากทัศน์แห่งโชคชะตา)", content: reportResult.adaptiveLifeScript, icon: <Map className="w-5 h-5" /> },
                        { title: "Imperial Prosperity Map (แผนที่ความมั่งคั่งจักรพรรดิ)", content: reportResult.imperialProsperityMap, icon: <ShieldCheck className="w-5 h-5" /> }
                      ].map((item, i) => (
                        <div key={i} className="bg-gold-500/5 border border-gold-500/20 rounded-2xl p-8 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            {item.icon}
                          </div>
                          <h5 className="text-sm font-serif font-bold text-gold-300 mb-4 flex items-center gap-2">
                            {item.icon} {item.title}
                          </h5>
                          <p className="text-xs text-text-secondary leading-relaxed text-left">
                            {item.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gold-500/5 border border-gold-500/20 rounded-2xl p-8 text-center space-y-4">
                    <p className="text-xs text-gold-500 font-bold uppercase tracking-widest italic">&ldquo;ปลดล็อก 4 มิติวิเคราะห์ระดับจักรพรรดิ&rdquo;</p>
                    <p className="text-xxs text-text-secondary">Golden Hour · Karmic Blueprint · Adaptive Script · Prosperity Map</p>
                    <Link href="/#pricing" className="text-xxs font-bold text-gold-300 hover:text-gold-500 underline underline-offset-4 flex items-center justify-center gap-1">
                      อัปเกรดเพื่อดูรายงานฉบับสมบูรณ์ <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-white/5">
                  <div className="text-left">
                    <p className="text-xxs font-bold text-gold-500 uppercase tracking-widest">Affirmation ประจำตัว</p>
                    <p className="text-sm italic text-foreground mt-1">&ldquo;{reportResult.summary?.affirmation}&rdquo;</p>
                  </div>
                  <Link href="/dashboard/report" className="text-xxs font-bold bg-gold-500/10 text-gold-300 border border-gold-500/30 px-6 py-2.5 rounded-full hover:bg-gold-500/20 transition-all flex items-center gap-2">
                    <Download className="w-3.5 h-3.5" /> DOWNLOAD PDF
                  </Link>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center border border-dashed border-white/5 rounded-2xl">
                <p className="text-xxs text-hora-text-muted font-bold uppercase tracking-[0.3em]">กดปุ่มเพื่อเริ่มวิเคราะห์ชะตาชีวิต</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
