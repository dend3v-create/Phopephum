"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { 
  calculateHora, 
} from "@/engine/phopephum-calculator";
import {
  calculateSevenBase,
} from "@/engine/seven-numbers-v3";
import {
  HOUSE_NAMES_ROW1,
  HOUSE_NAMES_ROW2,
  HOUSE_NAMES_ROW3,
  HOUSE_NAMES_ROW8,
  HOUSE_NAMES_ROW9,
  HOUSE_DESCRIPTIONS
} from "@/engine/seven-base-calculator";
import { DashboardLayout, HoraCard, SectionHeader } from "@/components/layout/DashboardLayout";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
// updateUserProfile server action replaced with client-side Supabase update to avoid 405 Method Not Allowed on Cloudflare Pages.
import { 
  Sparkles, Calendar, User, Zap, LogOut, ArrowUpRight,
  ShieldCheck, Compass, Award, Heart,
  Activity, CheckSquare, Target, Scroll, Map, ChevronDown, ChevronUp
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Ashta-Kala manual calculator states (full date + time)
  const [ashtaDate, setAshtaDate] = useState<string>("");
  const [ashtaTime, setAshtaTime] = useState<string>("");
  const [ashtaResult, setAshtaResult] = useState<any>(null);

  // New Seven-Base Astrology states
  const [activeTab, setActiveTab] = useState<"ashta" | "sevenBase">("ashta");
  const [sevenBaseDate, setSevenBaseDate] = useState<string>("");
  const [sevenBaseTime, setSevenBaseTime] = useState<string>("12:00");
  const [sevenBaseResult, setSevenBaseResult] = useState<any>(null);
  const [selectedCell, setSelectedCell] = useState<any>(null);

  // Accordion states
  const [showTimeMatrix, setShowTimeMatrix] = useState(false);
  const [showPredictionDb, setShowPredictionDb] = useState(false);

  // Mobile feature toggles
  const [featureToggles, setFeatureToggles] = useState<Record<string, boolean>>({
    live_widget: true,
    planet_orbit: true,
    birth_details: true,
    subscription_card: true,
  });

  // Helper for Ashta-Kala calculation (full date + time)
  const handleAshtaCalculate = (dateStr: string, timeVal: string) => {
    try {
      if (!dateStr || !timeVal) return;
      // Parse time as HH:MM
      const [hStr, mStr] = timeVal.split(":");
      const hours = parseInt(hStr || "0") % 24;
      const minutes = parseInt(mStr || "0") % 60;

      // Build date object from selected date string
      const [yyyy, mm, dd] = dateStr.split("-").map(Number);
      const date = new Date(yyyy, mm - 1, dd, hours, minutes, 0, 0);

      const result = calculateHora({ date, currentTime: date });
      setAshtaResult(result);
    } catch (err) {
      console.error("Error calculating Ashta-Kala:", err);
    }
  };

  const handleAshtaNow = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    setAshtaDate(`${yyyy}-${mm}-${dd}`);
    setAshtaTime(`${hh}:${mi}`);
  };

  useEffect(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    setAshtaDate(`${yyyy}-${mm}-${dd}`);
    setAshtaTime(`${hh}:${mi}`);

    // Initialize default for Seven-Base Date
    setSevenBaseDate(`${yyyy}-${mm}-${dd}`);
    setSevenBaseTime(`${hh}:${mi}`);
  }, []);

  useEffect(() => {
    if (ashtaDate && ashtaTime) {
      handleAshtaCalculate(ashtaDate, ashtaTime);
    }
  }, [ashtaDate, ashtaTime]);

  useEffect(() => {
    if (sevenBaseDate) {
      try {
        const res = calculateSevenBase(sevenBaseDate, sevenBaseTime || "12:00");
        setSevenBaseResult(res);
        setSelectedCell(null);
      } catch (err) {
        console.error("Error calculating Seven Base:", err);
      }
    }
  }, [sevenBaseDate, sevenBaseTime]);

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
            setAshtaTime(prof.birth_time); // HH:MM format
            setSevenBaseTime(prof.birth_time);
          }
          if (prof.birth_date) {
            setAshtaDate(prof.birth_date); // YYYY-MM-DD
            setSevenBaseDate(prof.birth_date);
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

  if (loading) {
    return (
      <div className="min-h-screen text-foreground flex items-center justify-center font-sans" style={{ background: "linear-gradient(180deg, #020617 0%, #071427 45%, #0A2240 100%)" }}>
        <div className="text-center space-y-4">
          <div className="w-10 h-10 rounded-full animate-spin mx-auto" style={{ border: "3px solid rgba(217,188,130,0.15)", borderTopColor: "#C6A96B" }} />
          <p className="text-xs font-bold uppercase tracking-widest text-hora-text-muted">กำลังเตรียมข้อมูลดวงชะตาส่วนบุคคล...</p>
        </div>
      </div>
    );
  }

  const isPremium = profile?.plan === "pro" || profile?.plan === "premium";
  const activeYam = ashtaResult?.currentHora;

  return (
    <DashboardLayout pageTitle="แดชบอร์ด" isAdmin={profile?.role === "admin" || profile?.role === "operator"}>
      <div className="space-y-6">
        {/* Profile Section */}
        {profile && (
          <ProfileEditForm
            initialData={{
              id: profile.id,
              displayName: profile.full_name || "",
              birthDate: profile.birth_date || "",
              birthTime: profile.birth_time || "00:00",
              birthPlace: profile.birth_province || "",
              gender: (profile.gender as any) || "other",
            }}
            onSave={async (data) => {
              const supabase = createClient();
              const { error } = await supabase
                .from("profiles")
                .update({
                  full_name: data.displayName,
                  birth_date: data.birthDate,
                  birth_time: data.birthTime,
                  birth_province: data.birthPlace,
                  gender: data.gender,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", profile.id);

              if (error) {
                console.error("Error updating profile:", error);
                throw new Error(error.message);
              }

              // Refresh local profile state
              setProfile((prev: any) => ({
                ...prev,
                full_name: data.displayName,
                birth_date: data.birthDate,
                birth_time: data.birthTime,
                birth_province: data.birthPlace,
                gender: data.gender,
              }));
            }}
          />
        )}

        {/* Subscription Tier Card */}
        <HoraCard glow>
          <SectionHeader
            icon="🏆"
            title="ระดับบารมี"
            subtitle="สิทธิ์การใช้งานและฟีเจอร์พรีเมียม"
          />
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-hora-text-muted uppercase font-bold tracking-widest">สถานะบัญชี</span>
              <span className="bg-gold-500/20 text-gold-300 border border-gold-500/30 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                {profile?.plan?.toUpperCase() || "FREE"}
              </span>
            </div>
            {!isPremium && (
              <div className="pt-4 border-t border-white/5">
                <p className="text-xs text-text-secondary leading-relaxed mb-4 italic">
                  &quot;อัปเกรดเพื่อรับการวิเคราะห์ยามมงคล ยามราหูค้นทรัพย์ และโหรทายหนูเฉพาะบุคคล&quot;
                </p>
                <Link href="/#pricing" className="btn-hora w-full text-xs py-3 rounded-full flex justify-center items-center">
                  อัปเกรดแผนพรีเมียม <ArrowUpRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </HoraCard>

        {/* Tab Selector for Calculators */}
        <div className="flex p-1 gap-1" style={{ background: "rgba(10,34,64,0.58)", backdropFilter: "blur(24px)", border: "1px solid rgba(217,188,130,0.15)", borderRadius: "14px" }}>
          <button
            onClick={() => setActiveTab("ashta")}
            className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
              activeTab === "ashta"
                ? "text-gold-300"
                : "text-hora-text-muted hover:text-gold-400"
            }`}
            style={activeTab === "ashta" ? { background: "linear-gradient(135deg, rgba(198,169,107,0.15) 0%, rgba(232,196,106,0.08) 100%)", border: "1px solid rgba(217,188,130,0.25)" } : {}}
          >
            🔮 ยามอัฐกาล
          </button>
          <button
            onClick={() => setActiveTab("sevenBase")}
            className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
              activeTab === "sevenBase"
                ? "text-gold-300"
                : "text-hora-text-muted hover:text-gold-400"
            }`}
            style={activeTab === "sevenBase" ? { background: "linear-gradient(135deg, rgba(198,169,107,0.15) 0%, rgba(232,196,106,0.08) 100%)", border: "1px solid rgba(217,188,130,0.25)" } : {}}
          >
            ⬡ เลข 7 ตัว 9 ฐาน
          </button>
        </div>

        {/* Ashta Kala Calculator */}
        {activeTab === "ashta" && (
          <HoraCard>
            <SectionHeader icon="Sparkles" title="ระบบคำนวณยามอัฐกาลอัตโนมัติ" />
            <div className="space-y-4">
              {/* Date + Time Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gold-400 uppercase tracking-widest">เลือกวัน</label>
                  <input
                    id="ashta-date-picker"
                    type="date"
                    value={ashtaDate}
                    onChange={(e) => setAshtaDate(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm text-foreground focus:border-gold-400/50 focus:outline-none transition-colors"
                    style={{ background: "rgba(18,53,91,0.6)", borderColor: "rgba(198,169,107,0.2)", colorScheme: "dark" }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gold-400 uppercase tracking-widest">เวลา (ชั่วโมง:นาที)</label>
                  <div className="flex gap-2">
                    <input
                      id="ashta-time-picker"
                      type="time"
                      value={ashtaTime}
                      onChange={(e) => setAshtaTime(e.target.value)}
                      className="flex-1 border rounded-xl px-3 py-2.5 text-sm text-foreground focus:border-gold-400/50 focus:outline-none transition-colors"
                      style={{ background: "rgba(18,53,91,0.6)", borderColor: "rgba(198,169,107,0.2)", colorScheme: "dark" }}
                    />
                    <button
                      id="ashta-now-btn"
                      onClick={handleAshtaNow}
                      className="px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                      style={{ background: "linear-gradient(135deg, rgba(198,169,107,0.25) 0%, rgba(232,196,106,0.12) 100%)", border: "1px solid rgba(217,188,130,0.35)", color: "#C6A96B" }}
                    >
                      ปัจจุบัน
                    </button>
                  </div>
                </div>
              </div>

              {activeYam && (() => {
                // Resolve day name for display
                const [yyyy, mm, dd] = (ashtaDate || "").split("-").map(Number);
                const dateObj = ashtaDate ? new Date(yyyy, mm - 1, dd) : new Date();
                const dayDisplayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
                const dayName = dayDisplayNames[dateObj.getDay()];
                const periodLabel = activeYam.period === "day" ? "กลางวัน" : "กลางคืน";
                const starNum = activeYam.starNumber;

                return (
                  <div className="space-y-4 mt-2">
                    {/* Day name display */}
                    <div className="text-center">
                      <span className="text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                        style={{ background: "rgba(198,169,107,0.12)", border: "1px solid rgba(217,188,130,0.2)", color: "#C6A96B" }}>
                        วัน{dayName} — {periodLabel}
                      </span>
                    </div>

                    {/* 4-card summary */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* ยามที่ */}
                      <div className="p-4 rounded-2xl text-center" style={{ background: "rgba(18,53,91,0.55)", border: "1px solid rgba(217,188,130,0.18)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}>
                        <span className="text-[9px] text-hora-text-muted uppercase tracking-widest block mb-2">ยามที่</span>
                        <span className="text-4xl font-black text-gold-300">{activeYam.yamNumber}</span>
                      </div>
                      {/* ชื่อยาม */}
                      <div className="p-4 rounded-2xl text-center" style={{ background: "rgba(18,53,91,0.55)", border: "1px solid rgba(217,188,130,0.18)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}>
                        <span className="text-[9px] text-hora-text-muted uppercase tracking-widest block mb-2">ชื่อยาม</span>
                        <span className="text-base font-bold text-foreground">{periodLabel}</span>
                      </div>
                      {/* ดาวเสวยยาม */}
                      <div className="p-4 rounded-2xl text-center" style={{ background: "rgba(18,53,91,0.55)", border: "1px solid rgba(217,188,130,0.18)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}>
                        <span className="text-[9px] text-hora-text-muted uppercase tracking-widest block mb-2">ดาวเสวยยาม</span>
                        <span className="text-base font-bold" style={{ color: ["","#EF4444","#FBBF24","#EC4899","#10B981","#F97316","#3B82F6","#8B5CF6"][starNum] || "#C6A96B" }}>
                          {activeYam.starName}
                        </span>
                      </div>
                      {/* ยามย่อย */}
                      <div className="p-4 rounded-2xl text-center" style={{ background: "rgba(18,53,91,0.55)", border: "1px solid rgba(217,188,130,0.18)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}>
                        <span className="text-[9px] text-hora-text-muted uppercase tracking-widest block mb-2">ยามย่อย</span>
                        <span className="text-base font-bold text-foreground">{activeYam.activeSubYam?.name}</span>
                        <span className="text-[8px] text-hora-text-muted block mt-1">
                          {activeYam.activeSubYam?.startTime}–{activeYam.activeSubYam?.endTime}
                        </span>
                      </div>
                    </div>

                    {/* Prediction cards */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* เรื่องที่ได้ยิน */}
                      <div className="p-3 rounded-2xl" style={{ background: "rgba(18,53,91,0.35)", border: "1px solid rgba(217,188,130,0.12)" }}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-base">🚩</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#C6A96B" }}>เรื่องที่ได้ยิน</span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>{activeYam.predictions?.hearing}</p>
                      </div>
                      {/* คนเจ็บไข้ */}
                      <div className="p-3 rounded-2xl" style={{ background: "rgba(18,53,91,0.35)", border: "1px solid rgba(217,188,130,0.12)" }}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-base">🏥</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#EC4899" }}>คนเจ็บไข้</span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>{activeYam.predictions?.sick}</p>
                      </div>
                      {/* ของหาย */}
                      <div className="p-3 rounded-2xl" style={{ background: "rgba(18,53,91,0.35)", border: "1px solid rgba(217,188,130,0.12)" }}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-base">🔍</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#FBBF24" }}>ของหาย</span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>{activeYam.predictions?.lost}</p>
                      </div>
                      {/* การเดินทาง */}
                      <div className="p-3 rounded-2xl" style={{ background: "rgba(18,53,91,0.35)", border: "1px solid rgba(217,188,130,0.12)" }}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-base">🚗</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#10B981" }}>การเดินทาง ({activeYam.activeSubYam?.name})</span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>{activeYam.predictions?.travel}</p>
                      </div>
                    </div>

                    {/* New Enhanced Guidance Section */}
                    <div className="p-4 rounded-2xl space-y-3" style={{ background: "rgba(10,34,64,0.4)", border: "1px solid rgba(217,188,130,0.15)" }}>
                       <div className="flex items-center gap-2 mb-1">
                          <Zap className="w-3 h-3 text-gold-400" />
                          <span className="text-[10px] font-bold text-gold-400 uppercase tracking-widest">พลังงานมงคลและคำแนะนำ</span>
                       </div>
                       <div className="space-y-3">
                          <div>
                             <span className="text-[8px] text-hora-text-muted uppercase font-bold block mb-0.5">ด้านมงคลเด่น:</span>
                             <p className="text-xs font-bold text-gold-200">{activeYam.predictions.auspicious}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                             <div>
                                <span className="text-[8px] text-green-400/60 uppercase font-bold block mb-0.5">สิ่งที่ควรทำ:</span>
                                <p className="text-[10px] text-foreground/90 leading-snug">{activeYam.predictions.shouldDo}</p>
                             </div>
                             <div>
                                <span className="text-[8px] text-red-400/60 uppercase font-bold block mb-0.5">ไม่ควรทำ:</span>
                                <p className="text-[10px] text-foreground/90 leading-snug">{activeYam.predictions.shouldNotDo}</p>
                             </div>
                          </div>
                          <div>
                             <span className="text-[8px] text-blue-400/60 uppercase font-bold block mb-0.5">ถ้าจะทำ ทำแบบไหน:</span>
                             <p className="text-[10px] italic text-text-secondary leading-snug">{activeYam.predictions.howTo}</p>
                          </div>
                       </div>
                    </div>

                    {/* Travel timing guide — all 3 sub-yam */}
                    <div className="p-3 rounded-2xl space-y-2" style={{ background: "rgba(10,34,64,0.5)", border: "1px solid rgba(217,188,130,0.12)" }}>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-hora-text-muted block">🕐 การเดินทางตามช่วงยาม</span>
                      {[
                        { label: "ยามต้น", val: activeYam.majorSlot?.predictions?.travelStart, sub: "slot-1" },
                        { label: "ยามกลาง", val: activeYam.majorSlot?.predictions?.travelMiddle, sub: "slot-2" },
                        { label: "ยามปลาย", val: activeYam.majorSlot?.predictions?.travelEnd, sub: "slot-3" },
                      ].map((t, i) => {
                        const isActive = activeYam.activeSubYam?.slot === i + 1;
                        return (
                          <div key={i} className="flex gap-2 items-start rounded-xl px-2 py-1.5 transition-all"
                            style={isActive ? { background: "rgba(198,169,107,0.12)", border: "1px solid rgba(217,188,130,0.25)" } : {}}>
                            <span className={`text-[9px] font-black uppercase tracking-wider shrink-0 pt-0.5 ${
                              isActive ? "text-gold-300" : "text-hora-text-muted"
                            }`}>{t.label}{isActive ? " ◀" : ""}</span>
                            <p className={`text-[10px] leading-relaxed ${
                              isActive ? "text-foreground" : "text-hora-text-muted"
                            }`}>{t.val}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Best time highlight */}
                    {activeYam.predictions?.bestTime && (
                      <div className="p-3 rounded-2xl flex items-center gap-3" style={{ background: "linear-gradient(135deg, rgba(198,169,107,0.15) 0%, rgba(232,196,106,0.06) 100%)", border: "1px solid rgba(217,188,130,0.30)", boxShadow: "0 0 24px rgba(232,196,106,0.08)" }}>
                        <span className="text-xl">⭐</span>
                        <div>
                          <span className="text-[9px] text-gold-400 font-bold uppercase tracking-widest block">เวลามงคลที่ดีที่สุด</span>
                          <p className="text-sm text-gold-300 font-bold mt-0.5">{activeYam.predictions.bestTime}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </HoraCard>
        )}

        {/* Seven Base Calculator */}
        {activeTab === "sevenBase" && sevenBaseResult && (
          <HoraCard glow>
            <SectionHeader 
              icon="⬡" 
              title="สิริมงคลดวงดำเนิน — เลข 7 ตัว 9 ฐาน" 
              subtitle="ถอดรหัสโครงสร้างดวงชะตาส่วนบุคคล 9 มิติกำลัง"
            />
            
            <div className="space-y-6">
              {/* Lunar Calendar & Astral Details */}
              <div className="grid grid-cols-1 gap-3">
                <div className="p-4 rounded-2xl flex flex-col gap-1" style={{ background: "rgba(18,53,91,0.45)", border: "1px solid rgba(217,188,130,0.18)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}>
                  <span className="text-[9px] text-gold-400 uppercase font-bold tracking-widest">ปฏิทินจันทรคติไทย</span>
                  <p className="text-sm font-bold text-foreground leading-relaxed">{sevenBaseResult.thaiLunarDateText}</p>
                  <span className="text-[9px] text-hora-text-muted">เปลี่ยนปีนักษัตรในวันขึ้น 1 ค่ำ เดือน 5</span>
                </div>
                <div className="p-4 rounded-2xl flex flex-col gap-2" style={{ background: "rgba(18,53,91,0.45)", border: "1px solid rgba(217,188,130,0.18)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}>
                  <span className="text-[9px] text-gold-400 uppercase font-bold tracking-widest">ภูมิวิญญาณเด่น (ทักษาจร)</span>
                  <div className="flex gap-2 flex-wrap">
                    {sevenBaseResult.taksa.slice(0, 3).map((t: any, idx: number) => (
                      <span key={idx} style={{ background: "rgba(198,169,107,0.12)", border: "1px solid rgba(198,169,107,0.25)" }} className="text-gold-300 px-2.5 py-0.5 rounded-full text-[10px] font-medium">
                        {t.category}: ดาว {t.planet.split(" ")[0]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-2xl flex flex-col gap-1" style={{ background: "rgba(18,53,91,0.45)", border: "1px solid rgba(217,188,130,0.18)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}>
                  <span className="text-[9px] text-gold-400 uppercase font-bold tracking-widest">จิตตั้งต้นภายใน (มหาภูติจร)</span>
                  <p className="text-sm font-bold text-foreground">
                    ตกตำแหน่ง <span className="text-gold-300">{sevenBaseResult.mahaPhute.name}</span> (ธาตุ{sevenBaseResult.mahaPhute.element})
                  </p>
                  <span className="text-[9px] text-hora-text-muted">{sevenBaseResult.mahaPhute.description}</span>
                </div>
              </div>

              {/* Precise interactive 9-Base Grid */}
              <div className="overflow-x-auto pb-2 rounded-2xl" style={{ background: "rgba(10,34,64,0.4)", border: "1px solid rgba(217,188,130,0.12)" }}>
                <table className="w-full border-collapse min-w-[640px]">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(217,188,130,0.12)" }}>
                      <th className="text-left py-3 px-3 text-[9px] font-bold uppercase tracking-widest text-hora-text-muted w-32">ชื่อฐาน</th>
                      {Array.from({ length: 7 }, (_, idx) => (
                        <th key={idx} className="text-center py-3 px-1 text-[9px] font-bold uppercase tracking-widest text-gold-400/70 w-16">
                          มิติที่ {idx + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "ฐานวัน (Row 1)", key: "row1", houses: HOUSE_NAMES_ROW1 },
                      { name: "ฐานเดือน (Row 2)", key: "row2", houses: HOUSE_NAMES_ROW2 },
                      { name: "ฐานปี (Row 3)", key: "row3", houses: HOUSE_NAMES_ROW3 },
                      { name: "ฐานกำลัง (Row 4)", key: "row4", houses: Array(7).fill("พลังแฝง") },
                      { name: "เอา ๗ ลบ (Row 5)", key: "row5", houses: Array(7).fill("ภูมิอายตนะ") },
                      { name: "คูณ ๒ (Row 6)", key: "row6", houses: Array(7).fill("โชติส่อง") },
                      { name: "คูณ ๒ (Row 7)", key: "row7", houses: Array(7).fill("มงคลชัย") },
                      { name: "อาตมา (Row 8)", key: "row8", houses: Array(7).fill("บทวิบาก") },
                      { name: "ภริยัง (Row 9)", key: "row9", houses: Array(7).fill("เป้าหมาย") }
                    ].map((row, rIdx) => (
                      <tr key={row.key} style={{ borderBottom: "1px solid rgba(217,188,130,0.07)" }} className="hover:bg-white/[0.01] transition-all">
                        <td className="py-2.5 px-3 text-[11px] font-medium text-foreground">{row.name}</td>
                        {(sevenBaseResult.chart as any)[row.key].map((v: number, cIdx: number) => {
                          const house = row.houses[cIdx];
                          const isSelected = selectedCell && selectedCell.row === row.key && selectedCell.col === cIdx;
                          
                          // ดาวเคราะห์สีตามความนิยมทางโหราศาสตร์สากล
                          const colors: Record<number, string> = {
                            1: "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30", // อาทิตย์
                            2: "bg-[#E5E7EB]/20 text-[#E5E7EB] border-[#E5E7EB]/30", // จันทร์
                            3: "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30", // อังคาร
                            4: "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30", // พุธ
                            5: "bg-[#F97316]/20 text-[#F97316] border-[#F97316]/30", // พฤหัสบดี
                            6: "bg-[#EC4899]/20 text-[#EC4899] border-[#EC4899]/30", // ศุกร์
                            7: "bg-[#6B7280]/20 text-[#6B7280] border-[#6B7280]/30", // เสาร์
                            8: "bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/30", // ราหู (สำหรับฐานกำลังที่ตก 8, 9, ฯลฯ)
                            9: "bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/30"  // เกตุ
                          };
                          
                          const colorClass = colors[v] || "bg-white/5 text-white/75 border-white/10";
                          
                          return (
                            <td key={cIdx} className="p-1 text-center">
                              <button
                                onClick={() => setSelectedCell({ row: row.key, col: cIdx, val: v, house, rowName: row.name })}
                                className={`w-full py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 ${colorClass} ${
                                  isSelected ? "ring-2 ring-gold-400 ring-offset-2 ring-offset-cosmic-950 scale-105" : "hover:scale-105"
                                }`}
                              >
                                <span className="text-[8px] text-white/50 font-normal uppercase block truncate max-w-full">
                                  {house}
                                </span>
                                <span className="text-sm font-black block">{v}</span>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Selected Cell Astro-Logic Details Card */}
              {selectedCell ? (
                <div className="p-5 rounded-2xl space-y-3" style={{ background: "linear-gradient(135deg, rgba(198,169,107,0.10) 0%, rgba(10,34,64,0.6) 100%)", border: "1px solid rgba(217,188,130,0.25)", boxShadow: "0 10px 40px rgba(0,0,0,0.4), 0 0 30px rgba(232,196,106,0.07)" }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="bg-gold-500/20 text-gold-300 border border-gold-500/30 px-3 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest">
                        {selectedCell.rowName} • คอลัมน์ {selectedCell.col + 1}
                      </span>
                      <h4 className="text-sm font-bold text-foreground mt-2">
                        ถอดรหัสความหมาย: <span className="text-gold-300">ดาว {selectedCell.val} เสวยภพ {selectedCell.house}</span>
                      </h4>
                    </div>
                    <button 
                      onClick={() => setSelectedCell(null)}
                      className="text-xs text-hora-text-muted hover:text-white transition-all bg-white/5 hover:bg-white/10 w-6 h-6 rounded-full flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <p className="text-xs text-text-secondary leading-relaxed">
                    จากการวิเคราะห์ด้วยหลักเลข 7 ตัว 9 ฐาน (จันทรคติ 100 ปี) 
                    ดาวเสวย **ดาว{[
                      "อาทิตย์ (1)", "จันทร์ (2)", "อังคาร (3)", "พุธ (4)", "พฤหัสบดี (5)", "ศุกร์ (6)", "เสาร์ (7)"
                    ][selectedCell.val - 1] || `เทพจร (${selectedCell.val})`}** สถิตในภพ **{selectedCell.house}** 
                    {HOUSE_DESCRIPTIONS[selectedCell.house] ? ` ซึ่งสะท้อนมิติด้าน "${HOUSE_DESCRIPTIONS[selectedCell.house]}" ` : " "} 
                    มีอิทธิพลส่งผ่าน Energy Flow บ่งชี้ว่าชีวิตของคุณจะมีจังหวะผลลัพธ์ที่ดีเลิศ มีโอกาสก้าวผ่านอุปสรรคและพัฒนาบารมีขึ้นสู่ระดับเกียรติยศสูงสุด
                  </p>
                  
                  <div className="pt-2 border-t border-white/5 flex items-center gap-3">
                    <span className="text-[10px] text-gold-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      💡 คำแนะนำกาลกิณี:
                    </span>
                    <span className="text-[10px] text-hora-text-muted">
                      หลีกเลี่ยงกระทำการณ์ใหญ่ที่มีความเสี่ยงสูงในช่วงยามอับมงคลประจำวัน
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl text-center" style={{ background: "rgba(10,34,64,0.4)", border: "1px solid rgba(217,188,130,0.10)" }}>
                  <p className="text-xs text-hora-text-muted">✦ แตะที่เลขดาวในแต่ละมิติตารางเพื่อถอดรหัสคำทำนายดวงชะตาส่วนบุคคล</p>
                </div>
              )}
            </div>
          </HoraCard>
        )}
      </div>
    </DashboardLayout>
  );
}
