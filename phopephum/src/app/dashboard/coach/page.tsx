"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { calculateSevenBase } from "@/engine/seven-numbers-v3";
import {
  HOUSE_NAMES_ROW1,
  HOUSE_NAMES_ROW2,
  HOUSE_NAMES_ROW3,
  HOUSE_DESCRIPTIONS
} from "@/engine/seven-base-calculator";
import { 
  DashboardLayout, 
  HoraCard, 
  SectionHeader 
} from "@/components/layout/DashboardLayout";
import { 
  Sparkles, Zap, Award, Heart, Moon, Compass, Calendar, 
  ShieldCheck, ArrowLeft, Copy, Printer, RotateCcw, 
  Activity, Star, User, BookOpen, ChevronRight, HelpCircle
} from "lucide-react";
import Link from "next/link";

interface SevenBaseResult {
  dayName: string;
  thaiLunarDateText: string;
  zodiacName: string;
  phaseText: string;
  chart: {
    row1: number[];
    row2: number[];
    row3: number[];
    row4: number[];
    row5: number[];
    row6: number[];
    row7: number[];
    row8: number[];
    row9: number[];
  };
  taksa: {
    category: string;
    planet: string;
    number: number;
    description: string;
  }[];
  mahaPhute: {
    name: string;
    element: string;
    description: string;
  };
}

export default function CoachPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sevenBaseResult, setSevenBaseResult] = useState<SevenBaseResult | null>(null);
  
  // Forecast generating states
  const [generating, setGenerating] = useState(false);
  const [prediction, setPrediction] = useState<string>("");
  const [loaderStep, setLoaderStep] = useState(0);

  // UI state
  const [activeTab, setActiveTab] = useState<"charm" | "guide" | "full">("charm");
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const loaderSteps = [
    "🔮 กำลังเปิดประตูมิติจิตวิญญาณแห่งดวงดาว...",
    "🧮 กำลังถอดรหัสเลข 7 ตัว 9 ฐาน (จันทรคติ 100 ปี)...",
    "🌟 กำลังผูกสัมพันธ์ภพภูมิ ทักษาจร และมหาภูติจร...",
    "👑 กำลังเชื่อมต่อกำลังจักรพรรดิและดาวพระพุธ (๔) ผู้สถิตเสน่ห์...",
    "✍️ กำลังรวบรวมคำพยากรณ์เชิงบำบัดจิตวิทยา (Therapeutic Destiny Map)..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (generating) {
      interval = setInterval(() => {
        setLoaderStep((prev) => (prev < loaderSteps.length - 1 ? prev + 1 : prev));
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [generating]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = "/login";
          return;
        }

        // 1. ดึงข้อมูลโปรไฟล์ผู้ใช้งาน
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (prof) {
          setProfile(prof);
          
          // 2. คำนวณผังเลข 7 ตัว 9 ฐาน
          if (prof.birth_date) {
            const birthTime = prof.birth_time || "12:00";
            const res = calculateSevenBase(prof.birth_date, birthTime);
            setSevenBaseResult(res as any);
          }

          // 3. ดึงคำทำนายจาก cache (localStorage)
          const cachedForecast = localStorage.getItem(`phopephum_general_forecast_${user.id}`);
          if (cachedForecast) {
            setPrediction(cachedForecast);
          }
        }
      } catch (err) {
        console.error("Error loading profile or chart data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleGenerateForecast = async (forceRefresh = false) => {
    if (!profile || generating) return;

    setGenerating(true);
    setLoaderStep(0);
    setPrediction("");

    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRefresh })
      });

      const data = await res.json();
      if (res.ok && data.success && data.message) {
        setPrediction(data.message);
        // บันทึกลง cache ทันทีเพื่อประหยัดโทเคนและประสิทธิภาพ
        localStorage.setItem(`phopephum_general_forecast_${profile.id}`, data.message);
      } else if (data.isOutOfCredits) {
        alert(data.message); // แจ้งเตือนเมื่อโควต้าหมด
      } else {
        alert(data.message || "เกิดข้อผิดพลาดในการคำนวณและพยากรณ์ดวงชะตา กรุณาลองใหม่อีกครั้งครับ");
      }
    } catch (err) {
      console.error("Error generating destiny forecast:", err);
      alert("ไม่สามารถเชื่อมต่อระบบวิเคราะห์ดวงชะตาได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้งครับ");
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("คุณต้องการคำนวณและสร้างคำทำนายใหม่หรือไม่? (การคำนวณใหม่จะใช้โควต้า AI 1 สิทธิ์)")) {
      if (profile) {
        localStorage.removeItem(`phopephum_general_forecast_${profile.id}`);
      }
      handleGenerateForecast(true);
    }
  };

  const handleCopy = () => {
    if (!prediction) return;
    navigator.clipboard.writeText(prediction);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // --- พาร์เซอร์คำทำนายแยกเซกชันสำหรับระบบแท็บย่อย ---
  const getSectionContent = (text: string, currentNum: number, nextNum: number): string => {
    const findIndex = (num: number) => {
      if (num > 4) return -1;
      // ค้นหาบรรทัดที่ขึ้นต้นด้วย 1., 2., 3., 4. โดยอนุญาตให้มี # หรือ ** นำหน้าได้
      const r = new RegExp(`(?:^|\\n)[ \\t]*(?:#+[ \\t]*)?(?:\\*\\*[ \\t]*)?${num}\\.[ \\t]*`, 'i');
      const match = text.match(r);
      return match && match.index !== undefined ? match.index : -1;
    };

    let start = findIndex(currentNum);
    // Fallback: ถ้าหาข้อ 1 ไม่เจอ ให้เริ่มตั้งแต่ต้นข้อความเลย
    if (start === -1 && currentNum === 1) start = 0;
    if (start === -1) return "";
    
    const end = nextNum ? findIndex(nextNum) : text.length;
    
    let sectionText = "";
    if (end !== -1 && end > start) {
      sectionText = text.slice(start, end);
    } else {
      sectionText = text.slice(start);
    }
    
    return sectionText.trim();
  };

  const getSectionHtml = (secId: "charm" | "guide" | "full") => {
    if (!prediction) return "";
    
    switch (secId) {
      case "charm":
        return getSectionContent(prediction, 1, 3) || prediction;
      case "guide":
        return getSectionContent(prediction, 3, 5) || "ไม่สามารถแยกข้อมูลไกด์เส้นทางชีวิตได้อย่างสมบูรณ์ กรุณาดูในแท็บรายงานฉบับเต็ม";
      default:
        return prediction;
    }
  };

  // --- เรนเดอร์มาร์กดาวน์แบบง่ายแต่พรีเมียม (Premium Elements) ---
  const renderStyledMarkdown = (text: string) => {
    if (!text) return <p className="text-hora-text-muted italic">ไม่มีคำทำนายในส่วนนี้</p>;

    const lines = text.split("\n");
    return (
      <div className="space-y-4 print:text-black">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-2" />;

          // 1. หัวข้อหลัก (H1/H2)
          if (trimmed.startsWith("# ") || trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
            const cleanTitle = trimmed.replace(/^#+\s*/, "").replace(/\*+/g, "");
            return (
              <h3 key={idx} className="text-base font-bold text-gold-300 font-serif pt-4 pb-1 border-b border-white/5 flex items-center gap-2 tracking-wide print:text-yellow-800 print:border-black/10">
                <span className="w-1.5 h-4 bg-gradient-to-b from-gold-400 to-gold-liquid rounded-full shrink-0" />
                {cleanTitle}
              </h3>
            );
          }

          // 2. คำคม/กล่องเน้นย้ำ (Blockquote)
          if (trimmed.startsWith(">")) {
            const cleanQuote = trimmed.slice(1).trim().replace(/\*+/g, "");
            return (
              <div key={idx} className="p-4 rounded-2xl glass-hora border border-gold-500/25 bg-cosmic-950/45 my-4 italic text-gold-200 text-xs sm:text-sm leading-relaxed tracking-wide shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] print:text-black print:border-black print:bg-white">
                📝 {cleanQuote}
              </div>
            );
          }

          // 3. รายการแบบมีบัลเล็ต (Bullet Points)
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            const cleanItem = trimmed.slice(2).replace(/\*+/g, "**");
            // แยกตัวหนาภายในข้อความ
            const parts = cleanItem.split("**");
            return (
              <div key={idx} className="flex gap-2.5 items-start pl-2 text-xs sm:text-sm leading-relaxed text-text-secondary print:text-black">
                <span className="text-[10px] text-gold-400 shrink-0 pt-1">✦</span>
                <p>
                  {parts.map((part, pIdx) => 
                    pIdx % 2 === 1 ? <strong key={pIdx} className="text-gold-200 font-bold print:text-black">{part}</strong> : part
                  )}
                </p>
              </div>
            );
          }

          // 4. รายการแบบตัวเลข (Numbered Bullet Points)
          if (/^\d+\.\s+/.test(trimmed)) {
            const num = trimmed.match(/^\d+\./)?.[0] || "";
            const cleanItem = trimmed.replace(/^\d+\.\s+/, "").replace(/\*+/g, "**");
            const parts = cleanItem.split("**");
            return (
              <div key={idx} className="flex gap-2.5 items-start pl-2 text-xs sm:text-sm leading-relaxed text-text-secondary print:text-black">
                <span className="text-xs text-gold-400 font-serif font-black shrink-0">{num}</span>
                <p>
                  {parts.map((part, pIdx) => 
                    pIdx % 2 === 1 ? <strong key={pIdx} className="text-gold-200 font-bold print:text-black">{part}</strong> : part
                  )}
                </p>
              </div>
            );
          }

          // 5. บรรทัดทั่วไป (เน้นตัวหนา)
          const parts = trimmed.split("**");
          return (
            <p key={idx} className="text-xs sm:text-sm text-text-secondary/90 leading-relaxed tracking-wide pl-1 print:text-black">
              {parts.map((part, pIdx) => 
                pIdx % 2 === 1 ? <strong key={pIdx} className="text-gold-200 font-bold print:text-black">{part}</strong> : part
              )}
            </p>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cosmic-950 text-foreground flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-hora-text-muted tracking-widest uppercase">กำลังเชื่อมมิติดวงชะตาระดับพรีเมียม...</p>
        </div>
      </div>
    );
  }

  const isPremium = profile?.plan === "pro" || profile?.plan === "premium" || profile?.plan === "imperial";

  return (
    <DashboardLayout pageTitle="พยากรณ์พื้นดวง" isAdmin={profile?.role === "admin" || profile?.role === "operator"}>
      
      <div className="space-y-6 max-w-6xl mx-auto pb-20 print:bg-white print:text-black print:pb-0">

        {/* 1. Header Hero Card with General 7-Base Philosophy */}
        <HoraCard glow>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-2">
            <div className="space-y-2">
              <span className="bg-gold-500/10 text-gold-300 border border-gold-500/25 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest leading-none">
                ศาสตร์เลข 7 ตัว 9 ฐาน (จันทรคติ 100 ปี)
              </span>
              <h1 className="text-2xl font-serif font-black text-gradient-gold tracking-widest">
                ถอดรหัสชะตากำเนิดพยากรณ์ทั่วไป
              </h1>
              <p className="text-xs text-hora-text-muted max-w-2xl leading-relaxed">
                ตามหลักเกณฑ์วิเคราะห์ 9 มิติ: **ฐาน 1–3** เป็นแกนชีวิตและเหตุการณ์สำคัญ, **ฐาน 4** เป็นพลังขับเคลื่อนสนับสนุน, **ฐาน 5–7** คือกลไกการแก้ไขอุปสรรคและพัฒนาศักยภาพ, และ **ฐาน 8–9** คือผลลัพธ์วาสนาแห่งชีวิต
              </p>
            </div>
            
            {profile && (
              <div className="shrink-0 flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl px-5 py-4 glass-hora print:border-black/25 print:text-black">
                <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/35 flex items-center justify-center text-gold-300">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-gold-400 font-bold uppercase tracking-wider block leading-none mb-1">ดวงชะตากำเนิด</span>
                  <span className="text-sm font-bold text-foreground print:text-black">{profile.full_name}</span>
                  <span className="text-[10px] text-text-secondary block print:text-black">
                    {sevenBaseResult?.thaiLunarDateText || profile.birth_date}
                  </span>
                </div>
              </div>
            )}
          </div>
        </HoraCard>

        {/* 2. Destiny Matrix Grid Visualizer */}
        {sevenBaseResult && (
          <HoraCard>
            <SectionHeader 
              icon="⬡" 
              title="ผังดวงชะตาชีวิต 7 ตัว 9 ฐาน (Birth Chart Matrix)" 
              subtitle="แตะช่องตัวเลขเพื่ออ่านความหมายเบื้องต้น หรือดูสรุปคำพยากรณ์ฉบับเต็มจาก AI"
            />
            
            <div className="space-y-4">
              <div className="overflow-x-auto pb-1 rounded-2xl border border-white/5 bg-cosmic-950/20 scrollbar-thin">
                <table className="w-full border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left py-3 px-4 text-[9px] font-bold uppercase tracking-widest text-hora-text-muted w-28">ฐานวิเคราะห์</th>
                      {Array.from({ length: 7 }, (_, idx) => (
                        <th key={idx} className="text-center py-3 px-1 text-[9px] font-bold uppercase tracking-widest text-gold-400/60 w-16">
                          ฐานที่ {idx + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "ฐาน 1 (วันเกิด)", key: "row1", houses: HOUSE_NAMES_ROW1, desc: "ฐานวัน (อัตตะ - มัชฌิมา)" },
                      { name: "ฐาน 2 (เดือนเกิด)", key: "row2", houses: HOUSE_NAMES_ROW2, desc: "ฐานเดือน (ตนุ - ปัตนิ)" },
                      { name: "ฐาน 3 (ปีเกิด)", key: "row3", houses: HOUSE_NAMES_ROW3, desc: "ฐานปี (มรณะ - ทาสี)" },
                      { name: "ฐาน 4 (พลังรวม)", key: "row4", houses: Array(7).fill("กำลังดาว"), desc: "พลังสนับสนุนพฤติกรรม" },
                      { name: "ฐาน 5 (สรุปพลัง)", key: "row5", houses: Array(7).fill(" Solution 1"), desc: "แนวทางรับมือปัญหา" },
                      { name: "ฐาน 6 (คูณสอง)", key: "row6", houses: Array(7).fill("Solution 2"), desc: "ศักยภาพสลักลึก" },
                      { name: "ฐาน 7 (คูณสอง)", key: "row7", houses: Array(7).fill(" Solution 3"), desc: "การฟื้นตัวจากอุปสรรค" },
                      { name: "ฐาน 8 (อาตมา)", key: "row8", houses: Array(7).fill("วาสนาหลัก"), desc: "อาตมะ/วิบากวาสนา" },
                      { name: "ฐาน 9 (ภริยัง)", key: "row9", houses: Array(7).fill(" เป้าหมาย"), desc: "ภริยัง/เส้นทางชีวิตสูงสุด" }
                    ].map((row) => (
                      <tr key={row.key} className="border-b border-white/5 hover:bg-white/[0.01] transition-all">
                        <td className="py-2.5 px-4 text-[10px] font-medium text-foreground">{row.name}</td>
                        {sevenBaseResult.chart[row.key as keyof typeof sevenBaseResult.chart].map((v: number, cIdx: number) => {
                          const house = (row.key === "row1") ? HOUSE_NAMES_ROW1[cIdx] : 
                                        (row.key === "row2") ? HOUSE_NAMES_ROW2[cIdx] : 
                                        (row.key === "row3") ? ["มรณะ", "สุภะ", "กัมมะ", "ลาภะ", "พยายะ", "ทาสา", "ทาสี"][cIdx] :
                                        (row.key === "row8") ? ["อาตมะ", "ทาสา", "สิทธิโชค", "โภคทรัพย์", "โจร", "อุบาทว์", "อุปถัมภ์"][cIdx] :
                                        (row.key === "row9") ? ["อัตตะ", "สักกะ", "ญาติ", "ธะนัง", "เคหัง", "นาวัง", "ภริยัง"][cIdx] :
                                        row.houses[cIdx];

                          const isSelected = selectedCell && selectedCell.row === row.key && selectedCell.col === cIdx;
                          
                          // สีตามกำลังดาวเคราะห์
                          const colors: Record<number, string> = {
                            1: "bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30", 
                            2: "bg-[#E5E7EB]/15 text-[#F3F4F6] border-[#E5E7EB]/30", 
                            3: "bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30", 
                            4: "bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30", 
                            5: "bg-[#F97316]/15 text-[#FB923C] border-[#F97316]/30", 
                            6: "bg-[#EC4899]/15 text-[#F472B6] border-[#EC4899]/30", 
                            7: "bg-[#6B7280]/15 text-[#9CA3AF] border-[#6B7280]/30", 
                            8: "bg-[#8B5CF6]/15 text-[#A78BFA] border-[#8B5CF6]/30", 
                            9: "bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30"  
                          };
                          
                          const colorClass = colors[v] || "bg-white/5 text-white/70 border-white/10";
                          
                          return (
                            <td key={cIdx} className="p-0.5 text-center">
                              <button
                                onClick={() => setSelectedCell({ row: row.key, col: cIdx, val: v, house, rowName: row.name, desc: row.desc })}
                                className={`w-full py-2 px-1 rounded-xl text-xxs font-bold border transition-colors flex flex-col items-center justify-center gap-0.5 ${colorClass} ${
                                  isSelected ? "ring-2 ring-gold-400 ring-offset-1 ring-offset-cosmic-950" : ""
                                }`}
                              >
                                <span className="text-[7.5px] text-white/50 font-normal uppercase block truncate max-w-full">
                                  {house}
                                </span>
                                <span className="text-xs font-black block">{v}</span>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Selected Cell details info */}
              {selectedCell ? (
                <div className="p-4 rounded-2xl space-y-2 border border-gold-500/25 bg-gradient-to-br from-gold-500/5 to-cosmic-950 shadow-xl animate-in fade-in slide-in-from-top-1">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-gold-400" />
                      <h4 className="text-xs font-bold text-gold-300">
                        วิเคราะห์มิติ: {selectedCell.desc} • คอลัมน์ที่ {selectedCell.col + 1}
                      </h4>
                    </div>
                    <button 
                      onClick={() => setSelectedCell(null)}
                      className="text-xxs text-hora-text-muted hover:text-white transition-all bg-white/5 hover:bg-white/10 w-5 h-5 rounded-full flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    ดาวเคราะห์เสวยดวงชะตาคือ **ดาว{[
                      "อาทิตย์ (1) - เกียรติยศ ผู้นำ ธาตุไฟ", 
                      "จันทร์ (2) - เสน่ห์ บริการ โอบอ้อมอารี ธาตุดิน", 
                      "อังคาร (3) - ขยันขันแข็ง บ้าบิ่น ต่อสู้ ธาตุลม", 
                      "พุธ (4) - เจรจา ค้าขาย สติปัญญาดี ธาตุน้ำ", 
                      "พฤหัสบดี (5) - คุณธรรม ปัญญา ครูผู้สอน ธาตุไฟ", 
                      "ศุกร์ (6) - ศิลปะ เงินทอง ทรัพย์สมบัติ ธาตุดิน", 
                      "เสาร์ (7) - อดทน วางแผน ยืดเยื้อ วิตกกังวล ธาตุลม",
                      "ราหู (8) - ไหวพริบ พลิกแพลง ต่างประเทศ ธาตุน้ำ",
                      "เกตุ (9) - สิ่งศักดิ์สิทธิ์ ความคิดลึกซึ้ง ธาตุทอง"
                    ][selectedCell.val - 1] || `กำลังดาวแฝง (${selectedCell.val})`}** สถิตในตำแหน่งเรือนชะตา **{selectedCell.house}** 
                    {HOUSE_DESCRIPTIONS[selectedCell.house] ? ` ซึ่งเป็นมิติดวงเกี่ยวกับการ "${HOUSE_DESCRIPTIONS[selectedCell.house]}" ` : " "} 
                    สิ่งนี้เป็นกลไกส่งผ่านแรงบันดาลใจและพฤติกรรมของคุณ สามารถอ่านคำพยากรณ์เชื่อมโยงเชิงลึกได้ทางด้านล่างครับ
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-2xl text-center border border-white/5 bg-cosmic-950/10">
                  <p className="text-xxs text-hora-text-muted">💡 แตะที่ช่องตัวเลขดวงชะตา เพื่อถอดรหัสความหมายและกำลังดาวเบื้องต้นได้ทันที</p>
                </div>
              )}
            </div>
          </HoraCard>
        )}

        {/* 3. Generating State / Cosmic Loader */}
        {generating && (
          <HoraCard glow>
            <div className="py-16 text-center space-y-6 max-w-lg mx-auto">
              <div className="relative w-24 h-24 mx-auto">
                {/* Spinning zodiac wheel icon placeholder */}
                <div className="absolute inset-0 border-4 border-gold-500/10 border-t-gold-500 rounded-full animate-spin" />
                <div className="absolute inset-2 border-2 border-gold-300/10 border-b-gold-300 rounded-full animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />
                <div className="absolute inset-0 flex items-center justify-center text-3xl animate-pulse">
                  🔮
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-serif font-bold text-gradient-gold tracking-widest animate-pulse">
                  กำลังคำนวณและประมวลผลคำพยากรณ์
                </h3>
                <div className="h-6 overflow-hidden relative">
                  <p className="text-xs text-gold-300/80 font-bold uppercase tracking-wider transition-all duration-500 absolute w-full left-0">
                    {loaderSteps[loaderStep]}
                  </p>
                </div>
              </div>

              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="bg-gradient-to-r from-gold-500 to-gold-liquid h-full rounded-full transition-all duration-1000"
                  style={{ width: `${((loaderStep + 1) / loaderSteps.length) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-hora-text-muted uppercase tracking-[0.2em] font-bold">
                การวิเคราะห์ใช้เวลาประมาณ 10-15 วินาที กรุณาอย่าปิดหน้านี้
              </p>
            </div>
          </HoraCard>
        )}

        {/* 4. Default / Empty State (No Prediction yet) */}
        {!prediction && !generating && (
          <HoraCard glow>
            <div className="py-12 px-6 text-center space-y-6 max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-gold-500/10 border border-gold-500/25 flex items-center justify-center text-gold-400 text-3xl mx-auto shadow-2xl">
                ✦
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-serif font-bold text-gold-200 tracking-wider">
                  เริ่มถอดรหัสชะตากรรมเนิด 7 ตัว 9 ฐาน
                </h2>
                <p className="text-xs text-text-secondary leading-relaxed">
                  ระบบ AI จะประมวลผลแผนผัง 9 ฐานดวงชะตา ทักษา มหากำลังดาวแถวที่ 4 ดาวพระพุธผู้สถิตคำเจรจา และตำแหน่งธาตุเกิด เพื่อเขียนรายงานพยากรณ์ส่วนบุคคลเชิงลึกครบถ้วน 6 หัวข้อ ตามหลักสูตร Branding planner & Therapeutic reading
                </p>
              </div>

              {/* Rulings checklist block */}
              <div className="p-4 rounded-2xl bg-cosmic-950/45 border border-white/5 text-left grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-xs">
                <div className="flex items-center gap-2 text-text-secondary">
                  <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
                  <span>วิเคราะห์เสน่ห์อัตตะ, พันธุ, ตนุ, ศุภะ</span>
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
                  <span>วิเคราะห์การเจรจา (ปิตา + ดาวพระพุธ ๔)</span>
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
                  <span>สร้างอัตลักษณ์ด้วย Branding Planner</span>
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
                  <span>กิจกรรมพัฒนาตนเอง เสริมบารมี</span>
                </div>
                <div className="flex items-center gap-2 text-text-secondary col-span-1 sm:col-span-2">
                  <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
                  <span>บำบัดชะตาชีวิตจร (การงาน การเงิน สุขภาพ โอกาสใหม่ ครอบครัว)</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleGenerateForecast()}
                  className="px-8 py-4 rounded-full text-xs font-black uppercase tracking-[0.2em] bg-gradient-to-br from-gold-500 via-gold-liquid to-gold-600 text-cosmic-950 hover:scale-105 active:scale-95 transition-all shadow-[0_10px_35px_rgba(198,169,107,0.25)] hover:shadow-[0_10px_45px_rgba(198,169,107,0.4)] cursor-pointer"
                >
                  คำนวณและพยากรณ์ดวงชะตา ⬡
                </button>
              </div>
            </div>
          </HoraCard>
        )}

        {/* 5. Forecast Result Viewer (With Premium Tabbed Interface) */}
        {prediction && !generating && (
          <div className="space-y-6 animate-in fade-in duration-700 print:space-y-4">
            
            {/* Toolbar Buttons */}
            <div className="flex items-center justify-between gap-4 flex-wrap bg-cosmic-900/40 border border-white/5 rounded-2xl p-3 glass-hora print:hidden">
              <span className="text-[10px] text-gold-400 font-bold uppercase tracking-widest pl-2">
                ✨ รายงานชะตาชีวิตของคุณเสร็จสมบูรณ์แล้ว
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xxs font-bold uppercase tracking-wider text-gold-300 border border-gold-500/20 bg-gold-500/5 hover:bg-gold-500/10 active:scale-95 transition-all cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copySuccess ? "คัดลอกแล้ว!" : "คัดลอกคำทำนาย"}
                </button>
                
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xxs font-bold uppercase tracking-wider text-gold-300 border border-gold-500/20 bg-gold-500/5 hover:bg-gold-500/10 active:scale-95 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  พิมพ์รายงาน / PDF
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xxs font-bold uppercase tracking-wider text-text-secondary hover:text-white border border-white/5 hover:border-white/20 hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  พยากรณ์ใหม่
                </button>
              </div>
            </div>

            {/* Printable Header - Only visible when printing */}
            <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-4">
              <h1 className="text-2xl font-serif font-black tracking-wide text-black">
                รายงานคำพยากรณ์ชีวิต เลข 7 ตัว 9 ฐาน (Phopephum)
              </h1>
              <p className="text-xs text-black/60 mt-1">
                สำหรับคุณ {profile?.full_name} • วันเกิด {sevenBaseResult?.thaiLunarDateText}
              </p>
            </div>

            {/* Tab Selectors */}
            <div className="flex overflow-x-auto gap-1.5 pb-2 border-b border-white/5 scrollbar-none print:hidden">
              {[
                { id: "charm", label: "🔮 ถอดรหัสดวงชะตา", desc: "Star Tracing" },
                { id: "guide", label: "🗺️ แผนผัง & บทสรุป", desc: "Astral Blueprint" },
                { id: "full", label: "📋 รายงานฉบับเต็ม", desc: "Full Report" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex flex-col items-center justify-center px-5 py-3 rounded-2xl text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap border cursor-pointer shrink-0 ${
                    activeTab === tab.id
                      ? "bg-gold-500/10 border-gold-500 text-gold-300 shadow-[0_0_15px_rgba(198,169,107,0.15)]"
                      : "glass-hora border-white/5 text-text-secondary hover:border-white/15 hover:text-gold-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="text-[7.5px] uppercase tracking-widest opacity-60 font-medium mt-0.5">{tab.desc}</span>
                </button>
              ))}
            </div>

            {/* Structured Report Content Block */}
            <HoraCard glow>
              <div className="p-2 sm:p-4 leading-relaxed print:p-0 print:border-none print:shadow-none">
                {activeTab === "full" ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-3 border-b border-white/5 print:hidden">
                      <BookOpen className="w-5 h-5 text-gold-400" />
                      <h2 className="text-base font-serif font-bold text-gradient-gold uppercase tracking-wider">
                        รายงานคำทำนายดวงชะตากำเนิดฉบับเต็ม
                      </h2>
                    </div>
                    {renderStyledMarkdown(prediction)}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-3 border-b border-white/5 print:hidden">
                      {activeTab === "charm" && <Sparkles className="w-5 h-5 text-gold-400" />}
                      {activeTab === "guide" && <Compass className="w-5 h-5 text-gold-400" />}
                      
                      <h2 className="text-base font-serif font-bold text-gradient-gold uppercase tracking-wider">
                        {activeTab === "charm" && "ถอดรหัสดวงชะตา (Star Tracing)"}
                        {activeTab === "guide" && "แผนผัง & บทสรุปเส้นทางชีวิต (Astral Blueprint)"}
                      </h2>
                    </div>
                    {renderStyledMarkdown(getSectionHtml(activeTab))}
                  </div>
                )}
              </div>
            </HoraCard>

            {/* Printable Footer */}
            <div className="hidden print:block text-center border-t border-black/20 pt-4 mt-8 text-xxs text-black/40">
              เอกสารลิขสิทธิ์เฉพาะบุคคลระบบพยากรณ์ 7 ตัว 9 ฐาน Phopephum • Secured by Supabase RLS
            </div>

            {/* Proactive branding card at bottom */}
            <div className="p-5 rounded-2xl flex flex-col sm:flex-row items-center gap-4 bg-gradient-to-br from-gold-500/10 via-cosmic-950 to-cosmic-950 border border-gold-500/20 shadow-xl print:hidden">
              <div className="w-12 h-12 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-300 text-lg shrink-0">
                ⭐
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-xs font-bold text-gold-200">
                  นำคำพยากรณ์ไปใช้วางแผนลงมือทำ (Action Plan) ด้วยแพลนเนอร์กาลเวลา
                </h4>
                <p className="text-[10px] text-hora-text-muted leading-relaxed">
                  เชื่อมโยงสรุปสิ่งที่ควรทำ/ไม่ควรทำไปเป็น <b>To-Do List</b> เพื่อใช้ตัดสินใจ และเช็กปฏิทินยามอัฐกาลเพื่อเลือกเวลาเริ่มต้นกิจกรรมได้ทันที (ระบบพร้อมรองรับองค์ความรู้ ปีจร เดือนจร วันจร ในอนาคตเพื่อความแม่นยำสูงสุด)
                </p>
              </div>
              <Link 
                href="/dashboard/planner" 
                className="px-5 py-2.5 rounded-xl text-xxs font-bold uppercase tracking-wider bg-gold-500 text-cosmic-950 hover:bg-gold-400 active:scale-95 transition-all ml-auto shrink-0"
              >
                เปิดแพลนเนอร์ 📅
              </Link>
            </div>
            
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
