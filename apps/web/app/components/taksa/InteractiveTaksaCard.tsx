/**
 * InteractiveTaksaCard.tsx
 * ตารางทักษาคู่ครองทิศ (ทักษากำเนิด / ทักษาจร)
 * ออกแบบระบบ 2 สีคมชัด:
 *   - กำเนิด: สีขาว (Dark) / สีดำเทา (Light) โดยไม่มีคำว่า "เกิด" หรือ "กำเนิด"
 *   - จร: สีฟ้า (Dark) / สีฟ้าน้ำเงิน (Light) โดยไม่มีคำว่า "จร"
 *   - กาลกิณี: สีแดง (Dark/Light)
 *   - ตัดสีม่วงและสีเขียวออกจากธีมมืด เพื่อความพรีเมียม คลีน หรูหรา
 *   - ใช้ไอคอน SVG สไตล์มินิมอลพรีเมียม ตรงตามธีม Astral Imperial Flow
 */

import { useState } from "react";
import { Card } from "~/components/ui/Card";
import type { StarNumber, TaksaMap } from "@phopephum/engine";
import { 
  STAR_NAMES, 
  TAKSA_DIRECTIONS, 
  getDirectionOracle, 
  type DirectionOracleDetail 
} from "@phopephum/engine";

type GridSlot = StarNumber | null;

const TAKSA_GRID_3X3: GridSlot[][] = [
  [1, 2, 3],
  [6, null, 4],
  [8, 5, 7],
];

export type PurposeMode = "all" | "career" | "travel" | "wealth" | "desk";

interface InteractiveTaksaCardProps {
  taksaNatal: {
    map: TaksaMap;
    bariStar: StarNumber;
    kalakiniStar: StarNumber;
  };
  taksaTransit: {
    map: TaksaMap;
    bariStar: StarNumber;
    kalakiniStar: StarNumber;
    ageYang: number;
  };
  className?: string;
  defaultSelectedStar?: StarNumber;
}

export function InteractiveTaksaCard({
  taksaNatal,
  taksaTransit,
  className = "",
  defaultSelectedStar,
}: InteractiveTaksaCardProps) {
  const [selectedStar, setSelectedStar] = useState<StarNumber | null>(defaultSelectedStar ?? null);
  const [purposeMode, setPurposeMode] = useState<PurposeMode>("all");

  const natalMap = taksaNatal.map;
  const transitMap = taksaTransit.map;

  // รายการทิศที่ควรไฮไลต์ตามวัตถุประสงค์ (Purpose Mode)
  const getHighlightedStarsForPurpose = (mode: PurposeMode): StarNumber[] => {
    switch (mode) {
      case "career":
        return ([1, 2, 3, 4, 5, 6, 7, 8] as StarNumber[]).filter(s => 
          ["เดช", "มนตรี", "ศรี"].includes(transitMap[s])
        );
      case "travel":
        return ([1, 2, 3, 4, 5, 6, 7, 8] as StarNumber[]).filter(s => 
          ["กาลกิณี", "อายุ", "ศรี"].includes(transitMap[s])
        );
      case "wealth":
        return ([1, 2, 3, 4, 5, 6, 7, 8] as StarNumber[]).filter(s => 
          ["ศรี", "มูละ"].includes(transitMap[s])
        );
      case "desk":
        return ([1, 2, 3, 4, 5, 6, 7, 8] as StarNumber[]).filter(s => 
          ["มูละ", "มนตรี"].includes(transitMap[s])
        );
      default:
        return [];
    }
  };

  const highlightedStars = getHighlightedStarsForPurpose(purposeMode);

  // คำทำนายสำหรับดาวที่เลือก
  const activeOracle: DirectionOracleDetail | null = selectedStar 
    ? getDirectionOracle(selectedStar, natalMap, transitMap)
    : null;

  return (
    <Card className={`p-0 overflow-hidden border-[#C9A96E]/25 dark:border-[#C9A96E]/20 shadow-2xl bg-white/95 dark:bg-slate-900/40 backdrop-blur-md transition-all ${className}`}>
      {/* ── Header ── */}
      <div className="p-4 border-b border-[#C9A96E]/20 bg-[#C9A96E]/5 dark:bg-[#C9A96E]/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C9A96E] animate-pulse" />
            <p className="text-[14px] font-bold uppercase tracking-widest text-[#B45309] dark:text-[#C9A96E]">
              ตารางทักษาคู่ครองทิศ
            </p>
          </div>
          <p className="text-slate-600 dark:text-[#C6B79F] text-xs md:text-sm mt-0.5">
            บริวารเกิด: <strong className="text-slate-900 dark:text-white font-bold">{STAR_NAMES[taksaNatal.bariStar]} ({taksaNatal.bariStar})</strong>
            &nbsp;·&nbsp;
            บริวารจร: <strong className="text-sky-700 dark:text-sky-400 font-bold">{STAR_NAMES[taksaTransit.bariStar]} ({taksaTransit.bariStar})</strong>
            &nbsp;·&nbsp;
            อายุย่าง: <strong className="text-[#C9A96E] font-bold">{taksaTransit.ageYang} ปี</strong>
          </p>
        </div>

        {/* ── Badges Legend: 2 สีหลัก ขาว (กำเนิด) + ฟ้า (จร) + แดง (กาลกิณี) ── */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/20 text-slate-800 dark:text-white font-bold">
            <span className="w-2 h-2 rounded-full bg-slate-700 dark:bg-white" />
            กำเนิด (สีขาว)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-500/40 text-sky-800 dark:text-sky-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-sky-400" />
            จร (สีฟ้า)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            กาลกิณี (สีแดง)
          </span>
        </div>
      </div>

      {/* ── Quick Purpose Filter (มินิมอลพรีเมียม ไม่มีอีโมจิฉูดฉาด) ── */}
      <div className="px-4 py-3 border-b border-slate-200/60 dark:border-white/5 bg-slate-50/80 dark:bg-slate-950/20">
        <p className="text-xs font-bold text-slate-700 dark:text-[#C6B79F] mb-2 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-[#C9A96E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          เลือกเป้าหมายเพื่อวิเคราะห์ทิศทาง:
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "ดูครบทุกทิศ" },
            { id: "career", label: "สมัครงาน / สัมภาษณ์ / เจรจา" },
            { id: "travel", label: "ตรวจทิศเดินทาง / เลี่ยงอุบัติเหตุ" },
            { id: "wealth", label: "ค้าขาย / รับทรัพย์ / เสี่ยงโชค" },
            { id: "desk", label: "จัดโต๊ะทำงาน / ปลูกเรือน" },
          ].map((item) => {
            const isActive = purposeMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setPurposeMode(item.id as PurposeMode);
                  if (item.id !== "all") {
                    const stars = getHighlightedStarsForPurpose(item.id as PurposeMode);
                    if (stars.length > 0) setSelectedStar(stars[0]);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#C9A96E] text-slate-950 shadow-md shadow-amber-500/20 font-black scale-[1.02]"
                    : "bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-[#C9A96E]/50"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Taksa 3x3 Grid & Center Slot ── */}
      <div className="p-4 bg-slate-100/40 dark:bg-slate-950/15">
        <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto">
          {TAKSA_GRID_3X3.map((row, rIdx) =>
            row.map((star, cIdx) => {
              // ── Center Slot (อายุย่าง) ──
              if (star === null) {
                return (
                  <div
                    key={`center-taksa-${rIdx}-${cIdx}`}
                    className="min-h-[135px] flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#C9A96E]/30 dark:border-[#C9A96E]/30 bg-amber-50/70 dark:bg-[#C9A96E]/10 p-2 text-center shadow-inner"
                  >
                    <span className="text-amber-800 dark:text-[#C9A96E] text-xs font-bold uppercase tracking-wider">อายุย่าง</span>
                    <span className="text-slate-900 dark:text-[#F8F6F1] font-display text-3xl md:text-4xl font-bold my-1 leading-none">
                      {taksaTransit.ageYang}
                    </span>
                    <span className="text-slate-600 dark:text-[#C6B79F] text-xs font-medium">ปี</span>
                    <span className="text-[10px] text-amber-700 dark:text-[#C9A96E]/80 mt-1 font-semibold">ศูนย์กลางชะตา (๙)</span>
                  </div>
                );
              }

              const dir = TAKSA_DIRECTIONS[star];
              const bhopNatal = natalMap[star];
              const bhopTransit = transitMap[star];

              const isSelected = selectedStar === star;
              const isHighlighted = highlightedStars.includes(star);
              const isKalaNatal = bhopNatal === "กาลกิณี";
              const isKalaTransit = bhopTransit === "กาลกิณี";

              return (
                <button
                  key={`star-cell-${star}`}
                  type="button"
                  onClick={() => setSelectedStar(star)}
                  className={`min-h-[135px] flex flex-col justify-between items-center rounded-2xl p-2 relative text-center transition-all cursor-pointer select-none ${
                    isSelected
                      ? "ring-2 ring-[#C9A96E] ring-offset-2 ring-offset-white dark:ring-offset-slate-950 bg-amber-500/10 dark:bg-[#C9A96E]/15 border-[#C9A96E] shadow-xl scale-[1.03] z-10"
                      : isHighlighted
                      ? "border-2 border-[#C9A96E] bg-[#C9A96E]/10 dark:bg-[#C9A96E]/10 shadow-md animate-pulse"
                      : "border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 hover:border-[#C9A96E]/40 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm"
                  }`}
                >
                  {/* Row 1: Direction Label (Pali & Thai) */}
                  <div className="w-full text-center">
                    <span className="text-[10px] md:text-[11px] font-bold text-slate-600 dark:text-slate-300 block truncate leading-tight">
                      {dir.paliName}
                    </span>
                    <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 block truncate leading-tight">
                      ({dir.thaiName})
                    </span>
                  </div>

                  {/* Row 2: ทักษากำเนิด (ขาว ในธีมมืด / เทาเข้ม ในธีมสว่าง) — ไม่มีคำว่าเกิด/กำเนิด */}
                  <div className="w-full my-0.5">
                    <span className={`inline-block w-full text-[11px] md:text-xs font-bold py-0.5 px-1 rounded-md text-center truncate ${
                      isKalaNatal
                        ? "bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/50 text-rose-800 dark:text-rose-400"
                        : "bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20 text-slate-800 dark:text-white"
                    }`}>
                      {bhopNatal}
                    </span>
                  </div>

                  {/* Row 3: Star Number & Name */}
                  <div className="flex flex-col items-center justify-center my-0.5">
                    <span className="font-display text-2xl md:text-3xl font-bold leading-none text-slate-900 dark:text-[#F8F6F1]">
                      {star}
                    </span>
                    <span className="text-[10px] md:text-[11px] text-slate-600 dark:text-[#C6B79F] font-semibold mt-0.5">
                      {STAR_NAMES[star]}
                    </span>
                  </div>

                  {/* Row 4: ทักษาจร (ฟ้า ในธีมมืด / ฟ้าน้ำเงิน ในธีมสว่าง / แดง ถ้ากาลกิณี) — ไม่มีคำว่าจร */}
                  <div className="w-full mt-0.5">
                    <span className={`inline-block w-full text-[11px] md:text-xs font-black py-0.5 px-1 rounded-md text-center truncate ${
                      isKalaTransit
                        ? "bg-rose-600 text-white dark:bg-rose-950/90 dark:text-rose-300 border border-rose-500 shadow-sm animate-pulse"
                        : "bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-500/40 text-sky-800 dark:text-sky-400"
                    }`}>
                      {bhopTransit}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Interactive Direction Selection Bar (ติ๊กเลือกทิศทาง 8 ทิศ) ── */}
      <div className="p-4 border-t border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs font-bold text-slate-700 dark:text-[#C6B79F] flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[#C9A96E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            ติ๊กเลือกทิศทางเพื่อเปิดคำพยากรณ์เจาะลึก:
          </p>
          {selectedStar && (
            <button
              type="button"
              onClick={() => setSelectedStar(null)}
              className="text-[11px] text-[#C9A96E] hover:underline font-semibold"
            >
              รีเซ็ตการเลือก
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {([1, 2, 3, 4, 7, 5, 8, 6] as StarNumber[]).map((star) => {
            const dir = TAKSA_DIRECTIONS[star];
            const bhopTransit = transitMap[star];
            const isSelected = selectedStar === star;
            const isKala = bhopTransit === "กาลกิณี";

            return (
              <button
                key={`btn-dir-${star}`}
                type="button"
                onClick={() => setSelectedStar(star)}
                className={`flex items-center justify-between p-2 rounded-xl text-left border text-xs transition-all ${
                  isSelected
                    ? "bg-[#C9A96E] text-slate-950 border-[#C9A96E] font-bold shadow-md scale-[1.02]"
                    : "bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/5 hover:border-[#C9A96E]/40"
                }`}
              >
                <div className="truncate">
                  <span className="block font-bold truncate">{dir.paliName} ({dir.code})</span>
                  <span className={`text-[10px] block truncate ${isSelected ? "text-slate-900" : "text-slate-500 dark:text-slate-400"}`}>
                    {dir.thaiName}
                  </span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0 ml-1 ${
                  isSelected
                    ? "bg-slate-900 text-[#C9A96E]"
                    : isKala
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    : "bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-400"
                }`}>
                  {bhopTransit}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Direction Oracle Detail Panel (คำพยากรณ์เจาะลึกเฉพาะทิศ) ── */}
      {activeOracle && (
        <div className="p-5 border-t border-[#C9A96E]/20 bg-gradient-to-br from-white/5 via-transparent to-sky-500/5 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C9A96E]" />
                <h4 className="font-display text-lg font-bold text-slate-900 dark:text-[#F8F6F1]">
                  คำพยากรณ์ประจำ {activeOracle.fullName}
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-[#C6B79F] mt-0.5">
                ดาวประจำทิศ: <strong>ดาว{activeOracle.starName} ({activeOracle.star})</strong> · 
                กำเนิด: <strong className="text-slate-900 dark:text-white">{activeOracle.bhopNatal}</strong> · 
                จร: <strong className="text-sky-700 dark:text-sky-400">{activeOracle.bhopTransit}</strong>
              </p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
              activeOracle.rating === "danger"
                ? "bg-rose-100 dark:bg-rose-950/80 border border-rose-400 text-rose-800 dark:text-rose-200 animate-pulse"
                : "bg-sky-100 dark:bg-sky-950/80 border border-sky-400 text-sky-800 dark:text-sky-200"
            }`}>
              {activeOracle.ratingLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* 1. สมัครงาน / สัมภาษณ์ / เจรจา */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-[#C9A96E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-xs font-bold text-[#B45309] dark:text-[#C9A96E] uppercase tracking-wider">
                  การสมัครงาน / สัมภาษณ์ / สอบแข่งขัน
                </p>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {activeOracle.careerAdvice}
              </p>
            </div>

            {/* 2. การเดินทาง / อุบัติเหตุ */}
            <div className={`p-3.5 rounded-xl border shadow-sm ${
              activeOracle.rating === "danger"
                ? "border-rose-300 dark:border-rose-500/50 bg-rose-50/80 dark:bg-rose-950/30"
                : "border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/60"
            }`}>
              <div className="flex items-center gap-2 mb-1.5">
                <svg className={`w-4 h-4 ${activeOracle.rating === "danger" ? "text-rose-500" : "text-[#C9A96E]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className={`text-xs font-bold uppercase tracking-wider ${
                  activeOracle.rating === "danger"
                    ? "text-rose-700 dark:text-rose-300 font-black"
                    : "text-[#B45309] dark:text-[#C9A96E]"
                }`}>
                  การเดินทาง & ความปลอดภัย (อุบัติเหตุ)
                </p>
              </div>
              <p className={`text-xs leading-relaxed ${
                activeOracle.rating === "danger"
                  ? "text-rose-900 dark:text-rose-200 font-medium"
                  : "text-slate-700 dark:text-slate-300"
              }`}>
                {activeOracle.travelAdvice}
              </p>
            </div>

            {/* 3. ค้าขาย / การเงิน */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-[#C9A96E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs font-bold text-[#B45309] dark:text-[#C9A96E] uppercase tracking-wider">
                  การค้าขาย / เจรจาธุรกิจ / เสี่ยงโชค
                </p>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {activeOracle.businessAdvice}
              </p>
            </div>

            {/* 4. จัดโต๊ะทำงาน / ปลูกเรือน */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-[#C9A96E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <p className="text-xs font-bold text-[#B45309] dark:text-[#C9A96E] uppercase tracking-wider">
                  ฮวงจุ้ยตั้งโต๊ะทำงาน / ปลูกสร้างเคหสถาน
                </p>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {activeOracle.deskAdvice}
              </p>
            </div>
          </div>

          {/* วิธีแก้เคล็ด (หากมี) */}
          {activeOracle.remedyAdvice && (
            <div className="mt-3.5 p-3 rounded-xl border border-amber-300/60 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/20 flex items-start gap-2.5">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                  คำแนะนำเสริมดวงและแก้เคล็ด:
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-200/90 mt-0.5 leading-relaxed">
                  {activeOracle.remedyAdvice}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
