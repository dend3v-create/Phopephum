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
  calculateSevenBase,
  HOUSE_NAMES_ROW1,
  HOUSE_NAMES_ROW2,
  HOUSE_NAMES_ROW3,
  HOUSE_NAMES_ROW8,
  HOUSE_NAMES_ROW9,
  HOUSE_DESCRIPTIONS
} from "@/engine/seven-base-calculator";
import { DashboardLayout, HoraCard, SectionHeader } from "@/components/layout/DashboardLayout";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { AIReportWidget } from "@/components/ai-report/AIReportWidget";
import { PDFExportButton } from "@/components/pdf/PDFExportModule";
import { updateUserProfile } from "@/app/actions/profile";
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

  // New Seven-Base Astrology states
  const [activeTab, setActiveTab] = useState<"ashta" | "sevenBase">("ashta");
  const [sevenBaseDate, setSevenBaseDate] = useState<string>("");
  const [sevenBaseTime, setSevenBaseTime] = useState<string>("12:00");
  const [sevenBaseResult, setSevenBaseResult] = useState<any>(null);
  const [selectedCell, setSelectedCell] = useState<any>(null);

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

    // Initialize default for Seven-Base Date
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    setSevenBaseDate(`${yyyy}-${mm}-${dd}`);
    setSevenBaseTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
  }, []);

  useEffect(() => {
    if (ashtaTime) {
      handleAshtaCalculate(ashtaDay, ashtaTime);
    }
  }, [ashtaDay, ashtaTime]);

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
            setAshtaTime(prof.birth_time.replace(":", "."));
            setSevenBaseTime(prof.birth_time);
          }
          if (prof.birth_date) {
            const birthDateObj = new Date(prof.birth_date);
            setAshtaDay(birthDateObj.getDay());
            setSevenBaseDate(prof.birth_date);
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
    <DashboardLayout pageTitle="แดชบอร์ด">
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
              await updateUserProfile({
                displayName: data.displayName,
                birthDate: data.birthDate,
                birthTime: data.birthTime,
                birthPlace: data.birthPlace,
                gender: data.gender,
              });
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
                  "อัปเกรดเพื่อรับการวิเคราะห์ยามมงคลเฉพาะบุคคลและรายงาน PDF"
                </p>
                <Link href="/#pricing" className="btn-hora w-full text-xs py-3 rounded-full flex justify-center items-center">
                  อัปเกรดแผนพรีเมียม <ArrowUpRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </HoraCard>

        {/* AI Report Section */}
        {profile && (
          <AIReportWidget
            birthData={{
              name: profile.full_name,
              birthDate: profile.birth_date,
              birthTime: profile.birth_time,
              birthPlace: profile.birth_province,
              gender: profile.gender,
              numerologyData: sevenBaseResult,
              horaData: ashtaResult,
            }}
            tier={profile.plan || "free"}
            remainingReports={profile.plan === "premium" ? -1 : 1} // Simplified for demo
          />
        )}

        {/* PDF Export Section (Visible after AI report is generated) */}
        {reportResult && profile && (
          <div className="mt-4">
            <PDFExportButton
              data={{
                name: profile.full_name,
                birthDate: profile.birth_date,
                birthTime: profile.birth_time,
                birthPlace: profile.birth_province,
                gender: profile.gender,
                reportText: typeof reportResult === 'string' ? reportResult : JSON.stringify(reportResult),
                topic: "ภาพรวมชะตาชีวิต",
                horaInfo: ashtaResult?.currentHora ? {
                  majorSlot: ashtaResult.currentHora.yamNumber,
                  planetName: ashtaResult.currentHora.starName,
                  planetSymbol: "◎",
                  startTime: minutesToTimeStr(ashtaResult.currentHora.startTime),
                  endTime: minutesToTimeStr(ashtaResult.currentHora.endTime),
                } : undefined,
                numerology: sevenBaseResult ? {
                  dayBase: sevenBaseResult.chart.row1[0],
                  monthBase: sevenBaseResult.chart.row2[0],
                  yearBase: sevenBaseResult.chart.row3[0],
                  totalBase: sevenBaseResult.chart.row4[0],
                } : undefined,
              }}
            />
          </div>
        )}

        {/* Tab Selector for Calculators */}
        <div className="flex border border-white/5 p-1 gap-2 bg-cosmic-950/50 rounded-2xl">
          <button
            onClick={() => setActiveTab("ashta")}
            className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
              activeTab === "ashta" ? "bg-gold-500/10 text-gold-300" : "text-hora-text-muted"
            }`}
          >
            🔮 ยามอัฐกาล
          </button>
          <button
            onClick={() => setActiveTab("sevenBase")}
            className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
              activeTab === "sevenBase" ? "bg-gold-500/10 text-gold-300" : "text-hora-text-muted"
            }`}
          >
            ⬡ เลข 7 ตัว 9 ฐาน
          </button>
        </div>

        {/* Ashta Kala Calculator */}
        {activeTab === "ashta" && (
          <HoraCard>
            <SectionHeader icon="Sparkles" title="คำนวณยามอัฐกาล" />
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gold-400">เลือกวัน</label>
                  <select
                    value={ashtaDay}
                    onChange={(e) => setAshtaDay(parseInt(e.target.value))}
                    className="w-full bg-cosmic-950 border border-white/10 rounded-lg p-2 text-sm text-foreground"
                  >
                    {DAY_NAMES_THAI.map((name, i) => (
                      <option key={i} value={i}>วัน{name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gold-400">เวลา (ชั่วโมง.นาที)</label>
                  <input
                    type="text"
                    value={ashtaTime}
                    onChange={(e) => setAshtaTime(e.target.value)}
                    className="w-full bg-cosmic-950 border border-white/10 rounded-lg p-2 text-sm text-foreground"
                  />
                </div>
              </div>

              {activeYam && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-cosmic-950/60 p-3 rounded-xl text-center border border-white/5">
                    <span className="text-[9px] text-hora-text-muted uppercase block">ยามที่</span>
                    <span className="text-xl font-bold text-gold-300">{activeYam.yamNumber}</span>
                  </div>
                  <div className="bg-cosmic-950/60 p-3 rounded-xl text-center border border-white/5">
                    <span className="text-[9px] text-hora-text-muted uppercase block">ดาวเสวย</span>
                    <span className="text-sm font-bold text-gold-400">{activeYam.starName}</span>
                  </div>
                </div>
              )}
            </div>
          </HoraCard>
        )}

        {/* Seven Base Calculator */}
        {activeTab === "sevenBase" && sevenBaseResult && (
          <HoraCard>
            <SectionHeader icon="Sparkles" title="เลข 7 ตัว 9 ฐาน" />
            <div className="space-y-4">
              <div className="bg-gold-500/5 p-3 rounded-xl border border-gold-500/10">
                <span className="text-[9px] text-gold-400 uppercase block">ปฏิทินจันทรคติ</span>
                <p className="text-xs font-bold">{sevenBaseResult.thaiLunarDateText}</p>
              </div>
              {/* Simplified Grid for Mobile */}
              <div className="grid grid-cols-7 gap-1 overflow-hidden">
                {sevenBaseResult.chart.row1.map((v: number, i: number) => (
                  <div key={i} className="bg-cosmic-950 border border-white/5 p-2 text-center rounded text-xs font-bold text-gold-400">
                    {v}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-hora-text-muted italic text-center">แตะดูผังดวงเต็มรูปแบบในเวอร์ชันเดสก์ท็อป</p>
            </div>
          </HoraCard>
        )}
      </div>
    </DashboardLayout>
  );
}
