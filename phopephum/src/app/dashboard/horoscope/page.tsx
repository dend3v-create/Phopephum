"use client";

import { useState } from "react";
import { DashboardLayout, HoraCard, SectionHeader } from "@/components/layout/DashboardLayout";
import { Sparkles, Calendar, Target, Clock, MapPin, User, Compass } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function HoroscopeDashboardPage() {
  const [formData, setFormData] = useState({
    name: "",
    birthDate: "",
    birthTime: "",
    province: "กรุงเทพมหานคร",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/horoscope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name || "ผู้ใช้งาน",
          birthDate: formData.birthDate,
          birthTime: formData.birthTime || "12:00",
          province: formData.province,
          provider: "gemini"
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการทำนาย");
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <DashboardLayout pageTitle="การตั้งผังดวงชะตา 7 ตัว 9 ฐาน" isAdmin={false}>
      <div className="space-y-6">
        
        {/* Input Form */}
        <HoraCard glow>
          <SectionHeader
            icon="Compass"
            title="Astrology Engine"
            subtitle="การคำนวณเลข 7 ตัว และ การตั้งผังดวงชะตา พร้อมการวาดผังดวงเลข 7 ตัว"
          />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gold-400 uppercase tracking-widest flex items-center gap-1"><User className="w-3 h-3"/> ชื่อ - นามสกุล</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="ชื่อของคุณ"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm text-foreground focus:border-gold-400/50 focus:outline-none transition-colors"
                  style={{ background: "rgba(18,53,91,0.6)", borderColor: "rgba(198,169,107,0.2)" }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gold-400 uppercase tracking-widest flex items-center gap-1"><Calendar className="w-3 h-3"/> วันเกิด</label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  required
                  className="w-full border rounded-xl px-3 py-2.5 text-sm text-foreground focus:border-gold-400/50 focus:outline-none transition-colors"
                  style={{ background: "rgba(18,53,91,0.6)", borderColor: "rgba(198,169,107,0.2)", colorScheme: "dark" }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gold-400 uppercase tracking-widest flex items-center gap-1"><Clock className="w-3 h-3"/> เวลาเกิด</label>
                <input
                  type="time"
                  name="birthTime"
                  value={formData.birthTime}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm text-foreground focus:border-gold-400/50 focus:outline-none transition-colors"
                  style={{ background: "rgba(18,53,91,0.6)", borderColor: "rgba(198,169,107,0.2)", colorScheme: "dark" }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gold-400 uppercase tracking-widest flex items-center gap-1"><MapPin className="w-3 h-3"/> จังหวัดที่เกิด</label>
                <input
                  type="text"
                  name="province"
                  value={formData.province}
                  onChange={handleInputChange}
                  placeholder="เช่น กรุงเทพมหานคร"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm text-foreground focus:border-gold-400/50 focus:outline-none transition-colors"
                  style={{ background: "rgba(18,53,91,0.6)", borderColor: "rgba(198,169,107,0.2)" }}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm mt-4">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, rgba(198,169,107,0.25) 0%, rgba(232,196,106,0.12) 100%)", border: "1px solid rgba(217,188,130,0.35)", color: "#C6A96B" }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin"></div>
                  กำลังวิเคราะห์ดวงชะตา...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  เริ่มการทำนายและผูกดวง
                </>
              )}
            </button>
          </form>
        </HoraCard>

        {/* Results */}
        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Chart Data */}
            <HoraCard glow>
              <SectionHeader 
                icon="Target" 
                title="ตารางผังดวง 7 ตัว 9 ฐาน" 
                subtitle="คำนวณตามหลักมหาภูติและจันทรคติไทย 100 ปี"
              />
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="p-4 rounded-xl" style={{ background: "rgba(18,53,91,0.4)", border: "1px solid rgba(217,188,130,0.2)" }}>
                    <span className="text-[10px] text-gold-400 uppercase font-bold">ข้อมูลปฏิทินจันทรคติ</span>
                    <p className="text-sm font-bold text-foreground mt-1">เดือน {result.data.lunar.lunarMonth} ปี {result.data.zodiacYear}</p>
                    <p className="text-xs text-text-secondary mt-1">{result.data.lunar.moonPhase}</p>
                 </div>
                 <div className="p-4 rounded-xl" style={{ background: "rgba(18,53,91,0.4)", border: "1px solid rgba(217,188,130,0.2)" }}>
                    <span className="text-[10px] text-gold-400 uppercase font-bold">ข้อมูลทักษาและลัคนาจร</span>
                    <p className="text-sm font-bold text-foreground mt-1">วัน {result.data.dayName}</p>
                    <p className="text-xs text-text-secondary mt-1">วัยจร: {result.data.vayaChorn}</p>
                 </div>
              </div>

              {/* 7-Base 9-Row Chart UI */}
              <div className="overflow-x-auto pb-4">
                <table className="w-full border-collapse min-w-[600px] text-center text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="py-3 px-2 text-left text-[10px] text-hora-text-muted font-bold uppercase w-32">ฐาน / ภพ</th>
                      {[1,2,3,4,5,6,7].map(i => (
                         <th key={i} className="py-3 text-[10px] text-gold-400/80 font-bold">{i}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Rows */}
                    {[
                      { name: 'ฐานที่ 1 (วัน)', data: result.data.matrix?.row1?.values || [] },
                      { name: 'ฐานที่ 2 (เดือน)', data: result.data.matrix?.row2?.values || [] },
                      { name: 'ฐานที่ 3 (ปี)', data: result.data.matrix?.row3?.values || [] },
                      { name: 'ฐานที่ 4 (ผลรวม)', data: result.data.matrix?.row4?.values || [] },
                      { name: 'ฐานที่ 5 (ฐานลบ)', data: result.data.matrix?.row5?.values || [] },
                      { name: 'ฐานที่ 6 (ฐานคูณ)', data: result.data.matrix?.row6?.values || [] },
                      { name: 'ฐานที่ 7 (ฐานคูณ)', data: result.data.matrix?.row7?.values || [] },
                      { name: 'ฐานที่ 8 (อาตมา)', data: result.data.matrix?.row8?.values || [] },
                      { name: 'ฐานที่ 9 (ภริยัง)', data: result.data.matrix?.row9?.values || [] },
                    ].map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-2 text-left text-xs font-medium text-text-secondary">{row.name}</td>
                        {row.data.map((val: number, cIdx: number) => (
                          <td key={cIdx} className="py-3">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 text-foreground font-bold">
                              {val || '-'}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </HoraCard>

            {/* AI Narrative Prediction */}
            <HoraCard glow>
               <SectionHeader 
                icon="Sparkles" 
                title="คำทำนายดวงชะตา (AI Narrative)" 
                subtitle="อ่านโครงสร้างตามหลักเลข 7 ตัว 9 ฐาน"
              />
              <div className="prose prose-invert prose-gold max-w-none text-sm md:text-base prose-headings:text-gold-300 prose-a:text-gold-400">
                 <ReactMarkdown>
                    {result.prediction}
                 </ReactMarkdown>
              </div>
            </HoraCard>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
