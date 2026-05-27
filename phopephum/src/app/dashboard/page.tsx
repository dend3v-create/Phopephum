"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { 
  calculateHora, 
  DAYTIME_YAM_STARS, 
  NIGHTTIME_YAM_STARS, 
  PREDICTION_DATABASE, 
  NINE_SEGMENTS_DATA, 
  DAY_NAMES_THAI,
  minutesToTimeStr,
  DayOfWeek 
} from "@/engine/phopephum-calculator";
import { 
  Sparkles, Calendar, User, Zap, LogOut, ArrowUpRight, 
  ShieldCheck, Download, Compass, Award, Heart, 
  Activity, CheckSquare, Target, Scroll, Map, ChevronDown, ChevronUp 
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // New Ashta-Kala manual calculator states
  const [ashtaDay, setAshtaDay] = useState<number>(new Date().getDay());
  const [ashtaTime, setAshtaTime] = useState<string>("");
  const [ashtaResult, setAshtaResult] = useState<any>(null);

  // Accordion states
  const [showTimeMatrix, setShowTimeMatrix] = useState(false);
  const [showPredictionDb, setShowPredictionDb] = useState(false);

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

  // Helper for Ashta-Kala calculation
  const handleAshtaCalculate = (day: number, timeVal: string) => {
    try {
      if (!timeVal) return;
      const cleanTime = timeVal.replace(":", ".");
      const [hStr, mStr] = cleanTime.split(".");
      const hours = parseInt(hStr || "0") % 24;
      const minutes = parseInt(mStr || "0") % 60;

      const date = new Date();
      const currentDay = date.getDay();
      const diff = day - currentDay;
      date.setDate(date.getDate() + diff);
      date.setHours(hours, minutes, 0, 0);

      const result = calculateHora({ date, currentTime: date });
      setAshtaResult(result);
    } catch (err) {
      console.error("Error calculating Ashta-Kala:", err);
    }
  };

  useEffect(() => {
    const now = new Date();
    // Default format "HH.MM"
    const defaultTime = `${String(now.getHours()).padStart(2, "0")}.${String(now.getMinutes()).padStart(2, "0")}`;
    setAshtaTime(defaultTime);
    setAshtaDay(now.getDay());
  }, []);

  useEffect(() => {
    if (ashtaTime) {
      handleAshtaCalculate(ashtaDay, ashtaTime);
    }
  }, [ashtaDay, ashtaTime]);

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
          if (prof.birth_time) {
            setAshtaTime(prof.birth_time.replace(":", "."));
          }
          if (prof.birth_date) {
            const birthDateObj = new Date(prof.birth_date);
            setAshtaDay(birthDateObj.getDay());
          }

          // Fetch the latest generated AI report for the dashboard
          const { data: latestReport } = await supabase
            .from("ai_reports")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (latestReport && latestReport.length > 0 && latestReport[0].content) {
            setReportResult(latestReport[0].content);
          }
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
          <p className="text-xs font-bold uppercase tracking-widest text-hora-text-muted">กำลังเตรียมข้อมูลดวงชะตาส่วนบุคคล...</p>
        </div>
      </div>
    );
  }

  const isPremium = profile?.plan === "pro" || profile?.plan === "premium";
  const activeYam = ashtaResult?.currentHora;

  return (
    <div className="min-h-screen bg-cosmic-950 text-foreground font-sans pb-24 selection:bg-gold-500 selection:text-cosmic-950 relative overflow-x-hidden">
      {/* Background layers */}
      <div className="bg-cosmic-portal" />
      <div className="cosmic-nebula-aura" />
      <div className="cosmic-zodiac-wheel" />

      {/* Header Bar */}
      <header className="sticky top-0 z-40 glass-hora border-b border-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-6 sm:gap-8">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/" className="text-xl sm:text-2xl font-serif font-bold text-hora-gold tracking-widest drop-shadow-sm">
                PHOPEPHUM
              </Link>
              <span className="hidden sm:inline text-[9px] bg-gold-500/10 border border-gold-500/30 text-gold-500 px-2.5 py-1 rounded-full uppercase tracking-widest font-bold">
                {profile?.plan || "FREE"} MEMBER
              </span>
            </div>
            
            {/* Quick Navigation Menu */}
            <nav className="hidden md:flex items-center gap-8 text-[10px] font-bold uppercase tracking-widest pt-1">
              <Link href="/dashboard" className="text-gold-500 border-b-2 border-gold-500 pb-1.5">ภาพรวมดวง</Link>
              <Link href="/dashboard/planner" className="text-text-secondary hover:text-gold-500 transition-colors flex items-center gap-1.5 pb-1.5">
                <Calendar className="w-3.5 h-3.5" /> Planner
              </Link>
              <Link href="/dashboard/coach" className="text-text-secondary hover:text-gold-500 transition-colors flex items-center gap-1.5 pb-1.5">
                <Sparkles className="w-3.5 h-3.5" /> AI Coach
              </Link>
              <Link href="/dashboard/report" className="text-text-secondary hover:text-gold-500 transition-colors flex items-center gap-1.5 pb-1.5">
                <Download className="w-3.5 h-3.5" /> Reports
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {(profile?.role === "admin" || profile?.full_name?.includes("ครูเด่น")) && (
              <Link
                href="/admin"
                className="text-[9px] text-gold-300 hover:text-gold-500 bg-gold-500/10 border border-gold-500/30 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 glass-hora transition-colors font-bold flex items-center gap-1.5 uppercase tracking-widest"
              >
                ⚙️ แอดมิน
              </Link>
            )}
            <span className="text-xs font-bold text-text-secondary hidden sm:flex items-center gap-2">
              <User className="w-4 h-4 text-gold-500" /> {profile?.full_name}
            </span>
            <button
              onClick={handleLogout}
              className="text-[10px] text-text-secondary/70 hover:text-red-400 flex items-center gap-1.5 transition-colors cursor-pointer border border-white/5 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 glass-hora uppercase font-bold tracking-wider"
            >
              <LogOut className="w-3.5 h-3.5" /> ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 grid md:grid-cols-3 gap-6 sm:gap-8 relative z-10">
        
        {/* Left Column */}
        <div className="space-y-6 sm:space-y-8 md:col-span-1">
          {featureToggles.birth_details && (
            <div className="glass-hora p-6 sm:p-8 border-white/5 rounded-[2rem]">
              <h3 className="text-sm font-serif font-bold text-gold-500 mb-6 flex items-center gap-2 uppercase tracking-widest border-b border-white/5 pb-4">
                <Compass className="w-5 h-5" /> พิกัดกำเนิด
              </h3>
              
              <div className="space-y-5 text-sm">
                {[
                  { label: "นามนามา", value: profile?.full_name },
                  { label: "ศุกรวาร", value: profile?.birth_date ? new Date(profile.birth_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : "-" },
                  { label: "นาฬิกา", value: `${profile?.birth_time || "ไม่ระบุ"} น.` },
                  { label: "ภูมิสถาน", value: profile?.birth_province },
                  { label: "เพศสถาน", value: profile?.gender === "male" ? "บุรุษ" : profile?.gender === "female" ? "สตรี" : "ไม่ระบุ" }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 group">
                    <span className="text-[10px] sm:text-xs text-hora-text-muted uppercase tracking-widest group-hover:text-gold-500/70 transition-colors font-bold">{item.label}</span>
                    <span className="font-bold text-foreground text-xs">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {featureToggles.subscription_card && (
            <div className="glass-hora p-6 sm:p-8 border-gold-500/20 bg-gold-500/5 rounded-[2rem]">
              <h3 className="text-sm font-serif font-bold text-gold-300 mb-6 flex items-center gap-2 uppercase tracking-widest border-b border-gold-500/10 pb-4">
                <Award className="w-5 h-5" /> ระดับบารมี
              </h3>
              
              <div className="space-y-5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] sm:text-xs text-hora-text-muted uppercase font-bold tracking-widest">สถานะบัญชี</span>
                  <span className="bg-gold-500/20 text-gold-300 border border-gold-500/30 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    {profile?.plan || "FREE"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] sm:text-xs text-hora-text-muted uppercase font-bold tracking-widest">สิทธิ์ AI วิเคราะห์</span>
                  <span className="font-bold text-gold-300 text-xs">
                    {profile?.plan === "free" ? "1 ครั้ง/เดือน" : profile?.plan === "pro" ? "10 ครั้ง/เดือน" : "ไม่จำกัด"}
                  </span>
                </div>

                {!isPremium && (
                  <div className="pt-6 border-t border-white/5 text-center">
                    <p className="text-xs text-text-secondary leading-relaxed mb-6 italic font-medium">
                      &ldquo;ปลดล็อกพลังมหาอุจจ์ เพื่อรับการวิเคราะห์ยามมงคลเฉพาะบุคคลและรายงาน PDF ระดับ Imperial&rdquo;
                    </p>
                    <Link href="/#pricing" className="btn-hora w-full text-[10px] sm:text-xs py-3 rounded-full flex justify-center items-center shadow-lg shadow-hora-gold/10">
                      อัปเกรดแผนพรีเมียม <ArrowUpRight className="ml-2 w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Middle and Right Column */}
        <div className="md:col-span-2 space-y-6 sm:space-y-8">
          
          {/* 🔮 โซนที่ ๑ : เครื่องมือคำนวณยามอัฐกาลอัตโนมัติ */}
          <div className="glass-hora p-6 sm:p-10 border-gold-500/20 bg-gradient-to-b from-cosmic-900/40 to-cosmic-950/80 relative rounded-[2rem] overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-white/5 pb-6">
              <div>
                <span className="text-[10px] text-gold-500 font-bold uppercase tracking-[0.3em] flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> เครื่องมือคำนวณยาม
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-gold-300">
                  ระบบคำนวณยามอัฐกาลอัตโนมัติ
                </h3>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 items-start mb-8">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-400 ml-2">เลือกวัน</label>
                <select
                  value={ashtaDay}
                  onChange={(e) => setAshtaDay(parseInt(e.target.value))}
                  className="w-full bg-cosmic-950/80 border border-white/10 focus:border-gold-500/50 rounded-2xl px-5 py-4 text-sm text-foreground outline-none transition-all cursor-pointer appearance-none"
                >
                  {DAY_NAMES_THAI.map((name, i) => (
                    <option key={i} value={i} className="bg-cosmic-950 text-foreground">วัน{name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-400 ml-2">เวลา (ชั่วโมง.นาที)</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="เช่น 14.30"
                    value={ashtaTime}
                    onChange={(e) => setAshtaTime(e.target.value)}
                    className="w-full bg-cosmic-950/80 border border-white/10 focus:border-gold-500/50 rounded-2xl px-5 py-4 text-sm text-foreground outline-none transition-all placeholder:text-text-secondary/40 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      setAshtaDay(now.getDay());
                      setAshtaTime(`${String(now.getHours()).padStart(2, "0")}.${String(now.getMinutes()).padStart(2, "0")}`);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gold-500 hover:text-gold-300 transition-colors uppercase tracking-widest bg-gold-500/10 px-3 py-1.5 rounded-full"
                  >
                    ปัจจุบัน
                  </button>
                </div>
              </div>
            </div>

            {/* Dynamic Result Displays */}
            {activeYam ? (
              <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                
                {/* Cards Grid: ยามที่ | ชื่อยาม | ช่วงเวลา | ยามย่อย */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* ยามที่ */}
                  <div className="bg-cosmic-950/60 border border-white/5 rounded-[1.5rem] p-5 text-center shadow-inner shadow-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-hora-text-muted block mb-2">ยามที่</span>
                    <span className="text-4xl font-serif font-bold text-gold-300">{activeYam.yamNumber}</span>
                  </div>

                  {/* ชื่อยาม */}
                  <div className="bg-cosmic-950/60 border border-white/5 rounded-[1.5rem] p-5 text-center shadow-inner shadow-white/5 flex flex-col justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-hora-text-muted block mb-2">ชื่อยาม</span>
                    <span className="text-lg font-bold text-foreground block">
                      {activeYam.period === "day" ? "กลางวัน" : "กลางคืน"}
                    </span>
                  </div>

                  {/* ช่วงเวลา */}
                  <div className="bg-cosmic-950/60 border border-white/5 rounded-[1.5rem] p-5 text-center shadow-inner shadow-white/5 flex flex-col justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-hora-text-muted block mb-2">ดาวเสวยยาม</span>
                    <span className="text-lg font-bold text-gold-400 block">
                      {activeYam.starName}
                    </span>
                  </div>

                  {/* ยามย่อย */}
                  <div className="bg-cosmic-950/60 border border-white/5 rounded-[1.5rem] p-5 text-center shadow-inner shadow-white/5 flex flex-col justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-hora-text-muted block mb-2">ยามย่อย</span>
                    <span className="text-lg font-bold text-foreground block">
                      {activeYam.activeSubYam.name}
                    </span>
                  </div>
                </div>

                {/* Predictions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  
                  <div className="bg-cosmic-900/30 border border-white/5 rounded-[1.5rem] p-6 hover:border-gold-500/25 transition-all">
                    <div className="flex items-center gap-2 text-pink-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-3">
                      <span>📢</span> เรื่องที่ได้ยิน
                    </div>
                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-medium">
                      {activeYam.predictions.hearing}
                    </p>
                  </div>

                  <div className="bg-cosmic-900/30 border border-white/5 rounded-[1.5rem] p-6 hover:border-gold-500/25 transition-all">
                    <div className="flex items-center gap-2 text-red-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-3">
                      <span>🏥</span> คนเจ็บไข้
                    </div>
                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-medium">
                      {activeYam.predictions.sick}
                    </p>
                  </div>

                  <div className="bg-cosmic-900/30 border border-white/5 rounded-[1.5rem] p-6 hover:border-gold-500/25 transition-all">
                    <div className="flex items-center gap-2 text-yellow-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-3">
                      <span>🔍</span> ของหาย
                    </div>
                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-medium">
                      {activeYam.predictions.lost}
                    </p>
                  </div>

                  <div className="bg-cosmic-900/30 border border-white/5 rounded-[1.5rem] p-6 hover:border-gold-500/25 transition-all">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-3">
                      <span>🚗</span> การเดินทาง ({activeYam.activeSubYam.name})
                    </div>
                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-medium">
                      {activeYam.predictions.travel}
                    </p>
                  </div>
                </div>

                {/* 9 Segment: ยามซอย 9 ฤกษ์ */}
                <div className="bg-gold-500/5 border border-gold-500/20 rounded-[1.5rem] p-6 sm:p-8 text-left flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center font-bold text-gold-400 text-2xl flex-shrink-0 shadow-lg shadow-gold-500/5">
                    {activeYam.activeNineSegment.index}
                  </div>
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                      <span className="text-[10px] font-bold text-gold-400 uppercase tracking-widest">ฤกษ์ยามซอย 9 ระดับ:</span>
                      <span className="bg-gold-500/20 border border-gold-500/30 text-gold-300 px-3 py-1 rounded-lg text-xs font-bold shadow-inner shadow-gold-500/10">
                        {activeYam.activeNineSegment.name}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed font-medium">
                      {activeYam.activeNineSegment.description}
                    </p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-48 border border-dashed border-white/10 rounded-[2rem] flex items-center justify-center bg-black/10">
                <p className="text-xs text-hora-text-muted uppercase tracking-widest font-bold">กรุณากรอกเวลาเพื่อประมวลผลยามอัฐกาล</p>
              </div>
            )}
          </div>

          {/* ⬡ โซนที่ ๒ : คลังข้อมูลตารางเวลา (Time Matrix) Accordion */}
          <div className="glass-hora border-white/5 rounded-[2rem] overflow-hidden">
            <button
              onClick={() => setShowTimeMatrix(!showTimeMatrix)}
              className="w-full px-6 sm:px-8 py-6 flex items-center justify-between text-left font-serif font-bold text-gold-500 hover:text-gold-300 transition-colors border-b border-white/5 cursor-pointer bg-cosmic-900/10"
            >
              <span className="flex items-center gap-3 text-sm sm:text-base uppercase tracking-widest">
                <Map className="w-5 h-5 text-gold-500" /> คลังข้อมูลตารางเวลา (Time Matrix)
              </span>
              {showTimeMatrix ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            {showTimeMatrix && (
              <div className="p-6 sm:p-8 space-y-8 animate-in slide-in-from-top-2 duration-300">
                {/* ✦ ตารางยามกลางวัน */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-300 flex items-center gap-2">
                    ✦ ตารางยามกลางวัน (06:00 - 18:00)
                  </h4>
                  <div className="overflow-x-auto rounded-2xl border border-white/5 bg-cosmic-950/40">
                    <table className="w-full text-center border-collapse text-[10px] sm:text-xs">
                      <thead>
                        <tr className="bg-cosmic-900/50 text-gold-500 font-bold border-b border-white/5">
                          <th className="p-4 text-left">วัน / ยาม</th>
                          {Array.from({ length: 8 }).map((_, idx) => (
                            <th key={idx} className="p-4 whitespace-nowrap">
                              ยาม {idx + 1}<br/>
                              <span className="text-[9px] text-text-secondary/60">
                                {minutesToTimeStr(360 + idx * 90)}-{minutesToTimeStr(360 + (idx + 1) * 90)}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-medium">
                        {DAY_NAMES_THAI.map((name, dIdx) => (
                          <tr 
                            key={dIdx} 
                            className={`hover:bg-white/5 transition-colors ${ashtaDay === dIdx && activeYam?.period === "day" ? "bg-gold-500/10 text-gold-200" : "text-text-secondary"}`}
                          >
                            <td className="p-4 font-bold text-left bg-cosmic-900/20 text-foreground">{name}</td>
                            {DAYTIME_YAM_STARS[dIdx as DayOfWeek].map((star, yIdx) => {
                              const isCurrentCell = ashtaDay === dIdx && activeYam?.period === "day" && activeYam?.yamNumber === (yIdx + 1);
                              return (
                                <td 
                                  key={yIdx} 
                                  className={`p-4 whitespace-nowrap ${isCurrentCell ? "bg-gold-500/25 text-gold-300 border border-gold-500/40 font-bold" : ""}`}
                                >
                                  {star}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ✦ ตารางยามกลางคืน */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-300 flex items-center gap-2">
                    ✦ ตารางยามกลางคืน (18:00 - 06:00)
                  </h4>
                  <div className="overflow-x-auto rounded-2xl border border-white/5 bg-cosmic-950/40">
                    <table className="w-full text-center border-collapse text-[10px] sm:text-xs">
                      <thead>
                        <tr className="bg-cosmic-900/50 text-gold-500 font-bold border-b border-white/5">
                          <th className="p-4 text-left">วัน / ยาม</th>
                          {Array.from({ length: 8 }).map((_, idx) => (
                            <th key={idx} className="p-4 whitespace-nowrap">
                              ยาม {idx + 1}<br/>
                              <span className="text-[9px] text-text-secondary/60">
                                {minutesToTimeStr(1080 + idx * 90)}-{minutesToTimeStr(1080 + (idx + 1) * 90)}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-medium">
                        {DAY_NAMES_THAI.map((name, dIdx) => (
                          <tr 
                            key={dIdx} 
                            className={`hover:bg-white/5 transition-colors ${ashtaDay === dIdx && activeYam?.period === "night" ? "bg-gold-500/10 text-gold-200" : "text-text-secondary"}`}
                          >
                            <td className="p-4 font-bold text-left bg-cosmic-900/20 text-foreground">{name}</td>
                            {NIGHTTIME_YAM_STARS[dIdx as DayOfWeek].map((star, yIdx) => {
                              const isCurrentCell = ashtaDay === dIdx && activeYam?.period === "night" && activeYam?.yamNumber === (yIdx + 1);
                              return (
                                <td 
                                  key={yIdx} 
                                  className={`p-4 whitespace-nowrap ${isCurrentCell ? "bg-gold-500/25 text-gold-300 border border-gold-500/40 font-bold" : ""}`}
                                >
                                  {star}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ⬡ โซนที่ ๓ : คลังข้อมูลคำทำนาย (Prediction Database) Accordion */}
          <div className="glass-hora border-white/5 rounded-[2rem] overflow-hidden">
            <button
              onClick={() => setShowPredictionDb(!showPredictionDb)}
              className="w-full px-6 sm:px-8 py-6 flex items-center justify-between text-left font-serif font-bold text-gold-500 hover:text-gold-300 transition-colors border-b border-white/5 cursor-pointer bg-cosmic-900/10"
            >
              <span className="flex items-center gap-3 text-sm sm:text-base uppercase tracking-widest">
                <Scroll className="w-5 h-5 text-gold-500" /> คลังข้อมูลคำทำนาย (Prediction Database)
              </span>
              {showPredictionDb ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            {showPredictionDb && (
              <div className="p-6 sm:p-8 space-y-6 animate-in slide-in-from-top-2 duration-300">
                <div className="overflow-x-auto rounded-2xl border border-white/5 bg-cosmic-950/40">
                  <table className="w-full text-left border-collapse text-[10px] sm:text-xs">
                    <thead>
                      <tr className="bg-cosmic-900/50 text-gold-500 font-bold border-b border-white/5">
                        <th className="p-4 text-center">ยามที่</th>
                        <th className="p-4 whitespace-nowrap">ชื่อยาม</th>
                        <th className="p-4">เรื่องที่ได้ยิน</th>
                        <th className="p-4">คนเจ็บไข้</th>
                        <th className="p-4">ของหาย</th>
                        <th className="p-4">เวลาที่ดี</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium text-text-secondary leading-relaxed">
                      {Object.keys(PREDICTION_DATABASE).map((key) => {
                        const num = parseInt(key);
                        const data = PREDICTION_DATABASE[num];
                        return (
                          <tr key={key} className={`hover:bg-white/5 transition-colors ${activeYam?.starNumber === num ? "bg-gold-500/10 text-gold-200" : ""}`}>
                            <td className="p-4 font-bold text-center text-foreground bg-cosmic-900/20">{num}</td>
                            <td className="p-4 font-bold whitespace-nowrap text-gold-400">
                              {data.starNameDay} / {data.starNameNight}
                            </td>
                            <td className="p-4 min-w-[150px]">{data.hearing}</td>
                            <td className="p-4 min-w-[100px]">{data.sick}</td>
                            <td className="p-4 min-w-[150px]">{data.lost}</td>
                            <td className="p-4 font-bold text-gold-500 whitespace-nowrap">{data.bestTime}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Strategic Systems Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Link href="/dashboard/planner" className="glass-hora p-6 sm:p-8 border-white/5 hover:border-gold-500/30 transition-all bg-cosmic-900/10 group flex flex-col justify-between h-48 sm:h-56 text-left rounded-[2rem]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="w-12 h-12 rounded-2xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-500 group-hover:scale-110 transition-transform">
                    <Calendar className="w-6 h-6" />
                  </span>
                  <ArrowUpRight className="w-5 h-5 text-text-secondary group-hover:text-gold-500 transition-colors" />
                </div>
                <h4 className="text-lg font-serif font-bold text-gold-300 group-hover:text-gold-500 transition-colors">TQM Planner</h4>
                <p className="text-[10px] sm:text-xs text-text-secondary mt-2 leading-relaxed">
                  วางแผนธุรกิจและการดำเนินชีวิตรายชั่วโมงตามปฏิทินยามจรและยามอัฐกาลเพื่อพลังขับเคลื่อนสูงสุด
                </p>
              </div>
              <span className="text-[10px] text-gold-500 font-bold uppercase tracking-[0.2em] mt-2">เปิดแผนงานยามมงคล →</span>
            </Link>

            <Link href="/dashboard/coach" className="glass-hora p-6 sm:p-8 border-white/5 hover:border-gold-500/30 transition-all bg-cosmic-900/10 group flex flex-col justify-between h-48 sm:h-56 text-left rounded-[2rem]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="w-12 h-12 rounded-2xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-500 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-6 h-6" />
                  </span>
                  <ArrowUpRight className="w-5 h-5 text-text-secondary group-hover:text-gold-500 transition-colors" />
                </div>
                <h4 className="text-lg font-serif font-bold text-gold-300 group-hover:text-gold-500 transition-colors">AI Wisdom Coach</h4>
                <p className="text-[10px] sm:text-xs text-text-secondary mt-2 leading-relaxed">
                  โค้ชจิตวิทยาเชิงบวกปัญญาสามมิติ ปรึกษาทิศทาง แก้ไขปัญหาชีวิตเฉพาะบุคคลแบบ Real-time
                </p>
              </div>
              <span className="text-[10px] text-gold-500 font-bold uppercase tracking-[0.2em] mt-2">คุยกับ AI Coach →</span>
            </Link>
          </div>

          {/* AI Dashboard - Analysis Section */}
          <div className="glass-hora p-6 sm:p-10 border-gold-500/30 bg-cosmic-900/30 relative overflow-hidden rounded-[2.5rem]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
              <div className="space-y-3">
                <span className="text-[10px] text-gold-500 font-bold uppercase tracking-[0.4em] flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> AI WISDOM ASSISTANT
                </span>
                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-foreground uppercase tracking-widest">รายงานวิเคราะห์ชะตาชีวิต</h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-lg font-medium">
                  ประมวลผลดวงชะตา อดีต-ปัจจุบัน-อนาคต และยามอัฐกาลแบบพลวัต ด้วยขุมพลัง AI วิเคราะห์เชิงลึกดั่งมหาอุจจ์
                </p>
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="btn-hora whitespace-nowrap text-xs sm:text-sm py-4 px-8 rounded-full shadow-2xl shadow-gold-500/20 w-full sm:w-auto"
              >
                {generatingReport ? "กำลังวิเคราะห์จักรวาล..." : "วิเคราะห์ด้วย AI"}
              </button>
            </div>

            {reportResult ? (
              <div className="space-y-8 animate-in fade-in duration-1000">
                {/* Standard Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Card 1: Identity & Soul */}
                  <div className="bg-cosmic-950/40 border border-white/5 rounded-[1.5rem] p-6 hover:border-gold-500/30 transition-all group text-left">
                    <div className="flex items-center gap-3 mb-4 text-gold-500">
                      <User className="w-5 h-5" />
                      <h5 className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">ตัวตนและจิตวิญญาณ</h5>
                    </div>
                    <div className="space-y-3 text-xs text-text-secondary leading-relaxed font-medium">
                      <p><strong className="text-gold-300/80">ตัวตนหลัก:</strong> {reportResult.identity?.attha || "—"}</p>
                      {reportResult.identity?.phanthu && <p><strong className="text-gold-300/80">จิตใจลึกๆ:</strong> {reportResult.identity?.phanthu}</p>}
                      {reportResult.identity?.tanu && <p><strong className="text-gold-300/80">ออร่าภายนอก:</strong> {reportResult.identity?.tanu}</p>}
                    </div>
                  </div>

                  {/* Card 2: Charm & Expression */}
                  <div className="bg-cosmic-950/40 border border-white/5 rounded-[1.5rem] p-6 hover:border-gold-500/30 transition-all group text-left">
                    <div className="flex items-center gap-3 mb-4 text-gold-500">
                      <Sparkles className="w-5 h-5" />
                      <h5 className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">เสน่ห์และการสื่อสาร</h5>
                    </div>
                    <div className="space-y-3 text-xs text-text-secondary leading-relaxed font-medium">
                      <p><strong className="text-gold-300/80">เสน่ห์ชื่อเสียง:</strong> {reportResult.charm?.overview || "—"}</p>
                      {reportResult.charm?.communication && <p><strong className="text-gold-300/80">วิธีเจรจา (KFC Model):</strong> {reportResult.charm?.communication}</p>}
                    </div>
                  </div>

                  {/* Card 3: Career Strategy */}
                  <div className="bg-cosmic-950/40 border border-white/5 rounded-[1.5rem] p-6 hover:border-gold-500/30 transition-all group text-left">
                    <div className="flex items-center gap-3 mb-4 text-gold-500">
                      <Target className="w-5 h-5" />
                      <h5 className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">ยุทธศาสตร์อาชีพ</h5>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed font-medium">
                      {reportResult.career || "—"}
                    </p>
                  </div>

                  {/* Card 4: Wealth Map */}
                  <div className="bg-cosmic-950/40 border border-white/5 rounded-[1.5rem] p-6 hover:border-gold-500/30 transition-all group text-left">
                    <div className="flex items-center gap-3 mb-4 text-gold-500">
                      <Zap className="w-5 h-5" />
                      <h5 className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">แผนที่การเงิน</h5>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed font-medium">
                      {reportResult.finance || "—"}
                    </p>
                  </div>

                  {/* Card 5: Love & relationships */}
                  {reportResult.love && (
                    <div className="bg-cosmic-950/40 border border-white/5 rounded-[1.5rem] p-6 hover:border-gold-500/30 transition-all group text-left">
                      <div className="flex items-center gap-3 mb-4 text-gold-500">
                        <Heart className="w-5 h-5" />
                        <h5 className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">ความรักความสัมพันธ์</h5>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed font-medium">
                        {reportResult.love}
                      </p>
                    </div>
                  )}

                  {/* Card 6: Health & Chakras */}
                  {reportResult.health && (
                    <div className="bg-cosmic-950/40 border border-white/5 rounded-[1.5rem] p-6 hover:border-gold-500/30 transition-all group text-left">
                      <div className="flex items-center gap-3 mb-4 text-gold-500">
                        <Activity className="w-5 h-5" />
                        <h5 className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">พลังงาน & จักระสุขภาพ</h5>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed font-medium">
                        {reportResult.health}
                      </p>
                    </div>
                  )}
                </div>

                {/* Section: Actionable Growth Checklist */}
                {reportResult.development && reportResult.development.length > 0 && (
                  <div className="bg-cosmic-950/40 border border-white/5 rounded-3xl p-6 sm:p-8 text-left space-y-5">
                    <div className="flex items-center gap-3 text-gold-500">
                      <CheckSquare className="w-5 h-5" />
                      <h5 className="text-xs sm:text-sm font-bold uppercase tracking-widest">แผนพัฒนาตัวเองตามรหัสดวงชะตา (Actionable Guide)</h5>
                    </div>
                    <div className="grid gap-3">
                      {reportResult.development.map((item: string, i: number) => (
                        <div key={i} className="flex items-start gap-4 bg-cosmic-900/40 p-4 rounded-xl border border-white/5">
                          <CheckSquare className="w-5 h-5 text-gold-500 flex-shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-sm text-text-secondary font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section: Weekly Plan Map */}
                {reportResult.weeklyPlan && (
                  <div className="bg-cosmic-950/40 border border-white/5 rounded-3xl p-6 sm:p-8 text-left space-y-5">
                    <div className="flex items-center gap-3 text-gold-500">
                      <Calendar className="w-5 h-5" />
                      <h5 className="text-xs sm:text-sm font-bold uppercase tracking-widest">ตารางพลังงานรายวัน</h5>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-7 gap-4">
                      {[
                        { day: "จันทร์", color: "text-yellow-400", val: reportResult.weeklyPlan.monday },
                        { day: "อังคาร", color: "text-pink-400", val: reportResult.weeklyPlan.tuesday },
                        { day: "พุธ", color: "text-green-400", val: reportResult.weeklyPlan.wednesday },
                        { day: "พฤหัสฯ", color: "text-orange-400", val: reportResult.weeklyPlan.thursday },
                        { day: "ศุกร์", color: "text-blue-400", val: reportResult.weeklyPlan.friday },
                        { day: "เสาร์", color: "text-purple-400", val: reportResult.weeklyPlan.saturday },
                        { day: "อาทิตย์", color: "text-red-400", val: reportResult.weeklyPlan.sunday },
                      ].map((item, i) => (
                        <div key={i} className="bg-cosmic-900/30 border border-white/5 p-4 rounded-2xl text-center space-y-3 flex flex-col justify-between hover:border-gold-500/20 transition-all">
                          <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest ${item.color}`}>วัน{item.day}</span>
                          <p className="text-[10px] text-text-secondary leading-relaxed line-clamp-3 italic">
                            {item.val || "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section: Branding Strategy */}
                {reportResult.branding && (
                  <div className="bg-gold-500/5 border border-gold-500/20 rounded-[2rem] p-6 sm:p-8 text-left space-y-5">
                    <div className="flex items-center gap-3 text-gold-300">
                      <Scroll className="w-5 h-5" />
                      <h5 className="text-xs sm:text-sm font-bold uppercase tracking-widest">ยุทธศาสตร์การสร้างตัวตน (Personal Branding)</h5>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-5 text-xs text-text-secondary">
                      <div className="bg-cosmic-950/40 p-5 rounded-2xl border border-white/5">
                        <span className="text-[10px] text-gold-500 font-bold uppercase tracking-widest block mb-2">Core Message</span>
                        <p className="font-medium text-foreground leading-relaxed">{reportResult.branding.coreMessage || "—"}</p>
                      </div>
                      <div className="bg-cosmic-950/40 p-5 rounded-2xl border border-white/5">
                        <span className="text-[10px] text-gold-500 font-bold uppercase tracking-widest block mb-2">Brand Persona</span>
                        <p className="font-medium text-foreground leading-relaxed">{reportResult.branding.persona || "—"}</p>
                      </div>
                      <div className="bg-cosmic-950/40 p-5 rounded-2xl border border-white/5">
                        <span className="text-[10px] text-gold-500 font-bold uppercase tracking-widest block mb-2">Unique Value</span>
                        <p className="font-medium text-foreground leading-relaxed">{reportResult.branding.uniqueValue || "—"}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Premium Exclusive Sections */}
                {isPremium ? (
                  <div className="space-y-6 pt-10 border-t border-gold-500/20">
                    <h4 className="text-[10px] font-bold text-gold-300 uppercase tracking-[0.4em] text-center mb-8">Premium Imperial Insights</h4>
                    <div className="grid grid-cols-1 gap-6">
                      {[
                        { title: "Golden Hour Execution", subtitle: "ยุทธศาสตร์นาทีทอง", content: reportResult.goldenHourExecution, icon: <Zap className="w-6 h-6" /> },
                        { title: "Karmic Blueprint", subtitle: "พรสวรรค์จากอดีตชาติ", content: reportResult.karmicBlueprint, icon: <Scroll className="w-6 h-6" /> },
                        { title: "Adaptive Life Script", subtitle: "ฉากทัศน์แห่งโชคชะตา", content: reportResult.adaptiveLifeScript, icon: <Map className="w-6 h-6" /> },
                        { title: "Imperial Prosperity Map", subtitle: "แผนที่ความมั่งคั่งจักรพรรดิ", content: reportResult.imperialProsperityMap, icon: <ShieldCheck className="w-6 h-6" /> }
                      ].map((item, i) => (
                        <div key={i} className="bg-gold-500/5 border border-gold-500/20 rounded-[2rem] p-6 sm:p-10 relative overflow-hidden group text-left">
                          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            {item.icon}
                          </div>
                          <div className="flex items-center gap-3 mb-5 text-gold-300">
                            {item.icon} 
                            <div>
                              <h5 className="text-base font-serif font-bold uppercase tracking-widest">{item.title}</h5>
                              <span className="text-[10px] text-gold-500/80 font-bold">{item.subtitle}</span>
                            </div>
                          </div>
                          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-medium">
                            {item.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gold-500/5 border border-gold-500/20 rounded-[2rem] p-8 text-center space-y-4">
                    <p className="text-xs text-gold-500 font-bold uppercase tracking-[0.2em] italic">&ldquo;ปลดล็อก 4 มิติวิเคราะห์ระดับจักรพรรดิ&rdquo;</p>
                    <p className="text-[10px] text-text-secondary uppercase tracking-widest">Golden Hour · Karmic Blueprint · Adaptive Script · Prosperity Map</p>
                    <Link href="/#pricing" className="text-xs font-bold text-gold-300 hover:text-gold-500 underline underline-offset-8 flex items-center justify-center gap-2 mt-4">
                      อัปเกรดเพื่อดูรายงานฉบับสมบูรณ์ <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-white/5">
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-gold-500 uppercase tracking-[0.2em] mb-2">Affirmation ประจำตัว</p>
                    <p className="text-sm italic text-foreground font-medium">&ldquo;{reportResult.summary?.affirmation}&rdquo;</p>
                  </div>
                  <Link href="/dashboard/report" className="text-[10px] font-bold uppercase tracking-[0.2em] bg-gold-500/10 text-gold-300 border border-gold-500/30 px-6 py-3 rounded-full hover:bg-gold-500/20 transition-all flex items-center gap-2 whitespace-nowrap">
                    <Download className="w-4 h-4" /> DOWNLOAD PDF
                  </Link>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-[2.5rem] bg-black/10">
                <p className="text-xs text-hora-text-muted font-bold uppercase tracking-[0.3em]">กดปุ่มเพื่อเริ่มวิเคราะห์ชะตาชีวิต</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-hora border-t border-white/10 bg-cosmic-950/90 backdrop-blur-xl flex items-center justify-around py-4 px-2 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] pb-safe">
        <Link href="/dashboard" className="flex flex-col items-center gap-1.5 text-gold-500">
          <Compass className="w-5 h-5 text-gold-500" />
          <span className="text-[9px] font-bold tracking-[0.2em] uppercase">ดวงชะตา</span>
        </Link>
        <Link href="/dashboard/planner" className="flex flex-col items-center gap-1.5 text-text-secondary hover:text-gold-500 transition-colors">
          <Calendar className="w-5 h-5 text-text-secondary hover:text-gold-500 transition-colors" />
          <span className="text-[9px] font-bold tracking-[0.2em] uppercase">แพลนเนอร์</span>
        </Link>
        <Link href="/dashboard/coach" className="flex flex-col items-center gap-1.5 text-text-secondary hover:text-gold-500 transition-colors">
          <Sparkles className="w-5 h-5 text-text-secondary hover:text-gold-500 transition-colors" />
          <span className="text-[9px] font-bold tracking-[0.2em] uppercase">โค้ช AI</span>
        </Link>
        <Link href="/dashboard/report" className="flex flex-col items-center gap-1.5 text-text-secondary hover:text-gold-500 transition-colors">
          <Download className="w-5 h-5 text-text-secondary hover:text-gold-500 transition-colors" />
          <span className="text-[9px] font-bold tracking-[0.2em] uppercase">รายงาน</span>
        </Link>
      </div>
    </div>
  );
}
