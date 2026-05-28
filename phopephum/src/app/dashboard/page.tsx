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
                  &quot;อัปเกรดเพื่อรับการวิเคราะห์ยามมงคลเฉพาะบุคคลและรายงาน PDF&quot;
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
          <HoraCard glow>
            <SectionHeader 
              icon="⬡" 
              title="สิริมงคลดวงดำเนิน — เลข 7 ตัว 9 ฐาน" 
              subtitle="ถอดรหัสโครงสร้างดวงชะตาส่วนบุคคล 9 มิติกำลัง"
            />
            
            <div className="space-y-6">
              {/* Lunar Calendar & Astral Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-cosmic-950/60 p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] text-gold-400 uppercase font-bold tracking-widest block mb-1">ปฏิทินจันทรคติไทย</span>
                  <p className="text-sm font-bold text-foreground leading-relaxed">{sevenBaseResult.thaiLunarDateText}</p>
                  <span className="text-[9px] text-hora-text-muted mt-2 block">เปลี่ยนปีนักษัตรในวันขึ้น 1 ค่ำ เดือน 5</span>
                </div>
                <div className="bg-cosmic-950/60 p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] text-gold-400 uppercase font-bold tracking-widest block mb-1">ภูมิวิญญาณเด่น (ทักษาจร)</span>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {sevenBaseResult.taksa.slice(0, 3).map((t: any, idx: number) => (
                      <span key={idx} className="bg-gold-500/10 border border-gold-500/20 text-gold-300 px-2.5 py-0.5 rounded-full text-[10px] font-medium">
                        {t.category}: ดาว {t.planet.split(" ")[0]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-cosmic-950/60 p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] text-gold-400 uppercase font-bold tracking-widest block mb-1">จิตตั้งต้นภายใน (มหาภูติจร)</span>
                  <p className="text-sm font-bold text-foreground">
                    ตกตำแหน่ง <span className="text-gold-300">{sevenBaseResult.mahaPhute.name}</span> (ธาตุ{sevenBaseResult.mahaPhute.element})
                  </p>
                  <span className="text-[9px] text-hora-text-muted mt-2 block">{sevenBaseResult.mahaPhute.description}</span>
                </div>
              </div>

              {/* Precise interactive 9-Base Grid */}
              <div className="overflow-x-auto pb-2">
                <table className="w-full border-collapse min-w-[640px]">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-hora-text-muted w-32">ชื่อฐาน</th>
                      {Array.from({ length: 7 }, (_, idx) => (
                        <th key={idx} className="text-center py-2 px-1 text-[10px] font-bold uppercase tracking-widest text-gold-400 w-16">
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
                      <tr key={row.key} className="border-b border-white/5 hover:bg-white/[0.01] transition-all">
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
                <div className="bg-gradient-to-r from-gold-500/5 to-cosmic-950/40 p-5 rounded-2xl border border-gold-500/20 space-y-3 animate-fadeIn">
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
                <div className="bg-cosmic-950/40 p-4 rounded-xl border border-white/5 text-center">
                  <p className="text-xs text-hora-text-muted">💡 แตะที่เลขดาวในแต่ละมิติตารางเพื่อถอดรหัสคำทำนายดวงชะตาส่วนบุคคล</p>
                </div>
              )}
            </div>
          </HoraCard>
        )}
      </div>
    </DashboardLayout>
  );
}
