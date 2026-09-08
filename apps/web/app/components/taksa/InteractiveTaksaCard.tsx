/**
 * InteractiveTaksaCard.tsx
 * ตารางทักษาคู่ (ทักษากำเนิด / ทักษาจร) พร้อมระบบแยกสี 2 สีชัดเจน และระบบพยากรณ์ทิศทาง (Direction Oracle)
 * รองรับทั้งธีมมืด (Dark Theme) และธีมสว่าง (Light Theme)
 * มีระบบติ๊กเลือกวัตถุประสงค์ (สมัครงาน, เดินทาง/อุบัติเหตุ, ค้าขาย, ฮวงจุ้ยโต๊ะทำงาน)
 * และระบบติ๊กเลือกทิศเจาะลึก 8 ทิศ
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
        // สมัครงาน / สัมภาษณ์ -> เดชจร (อำนาจบารมี ชนะใจ), มนตรีจร (ผู้ใหญ่อุปถัมภ์), ศรีจร (ความสำเร็จ)
        return ([1, 2, 3, 4, 5, 6, 7, 8] as StarNumber[]).filter(s => 
          ["เดช", "มนตรี", "ศรี"].includes(transitMap[s])
        );
      case "travel":
        // เดินทาง / เลี่ยงอุบัติเหตุ -> กาลกิณีจร (ห้ามเดินทางเด็ดขาด) และ อายุ/ศรี (เดินทางปลอดภัย)
        return ([1, 2, 3, 4, 5, 6, 7, 8] as StarNumber[]).filter(s => 
          ["กาลกิณี", "อายุ", "ศรี"].includes(transitMap[s])
        );
      case "wealth":
        // ค้าขาย / เสี่ยงโชค / รับทรัพย์ -> ศรีจร, มูละจร
        return ([1, 2, 3, 4, 5, 6, 7, 8] as StarNumber[]).filter(s => 
          ["ศรี", "มูละ"].includes(transitMap[s])
        );
      case "desk":
        // ตั้งโต๊ะทำงาน / ปลูกเรือน -> มูละจร, มนตรีจร
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
            <span className="w-2.5 h-2.5 rounded-full bg-[#C9A96E] animate-pulse" />
            <p className="text-[14px] font-bold uppercase tracking-widest text-[#B45309] dark:text-[#C9A96E]">
              ตารางทักษาคู่ครองทิศ (ทักษากำเนิด / ทักษาจร)
            </p>
          </div>
          <p className="text-slate-600 dark:text-[#C6B79F] text-xs md:text-sm mt-0.5">
            บริวารเกิด: <strong className="text-amber-700 dark:text-amber-400">{STAR_NAMES[taksaNatal.bariStar]} ({taksaNatal.bariStar})</strong>
            &nbsp;·&nbsp;
            บริวารจร: <strong className="text-sky-700 dark:text-sky-400">{STAR_NAMES[taksaTransit.bariStar]} ({taksaTransit.bariStar})</strong>
            &nbsp;·&nbsp;
            อายุย่าง: <strong className="text-[#C9A96E]">{taksaTransit.ageYang} ปี</strong>
          </p>
        </div>

        {/* ── Badges Legend ── */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            ทักษากำเนิด (ทอง)
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/50 border border-sky-300 dark:border-sky-500/40 text-sky-900 dark:text-sky-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            ทักษาจร (ฟ้า)
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            กาลกิณี ⛔
          </span>
        </div>
      </div>

      {/* ── Quick Purpose Filter (ติ๊กเลือกเป้าหมายคำทำนาย) ── */}
      <div className="px-4 py-3 border-b border-slate-200/60 dark:border-white/5 bg-slate-50/80 dark:bg-slate-950/20">
        <p className="text-xs font-bold text-slate-700 dark:text-[#C6B79F] mb-2 flex items-center gap-1.5">
          <span>🎯</span> ติ๊กเลือกเป้าหมายเพื่อวิเคราะห์ทิศทางที่เหมาะสม:
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "🧭 ดูครบทุกทิศ", icon: "🌐" },
            { id: "career", label: "💼 สมัครงาน / สัมภาษณ์ / เจรจา", icon: "🏢" },
            { id: "travel", label: "🚗 ตรวจทิศเดินทาง / เลี่ยงอุบัติเหตุ", icon: "⚠️" },
            { id: "wealth", label: "💰 ค้าขาย / รับทรัพย์ / เสี่ยงโชค", icon: "💎" },
            { id: "desk", label: "🪑 จัดโต๊ะทำงาน / ปลูกเรือน", icon: "🏠" },
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
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#C9A96E] text-slate-950 shadow-md shadow-amber-500/20 scale-[1.02]"
                    : "bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-[#C9A96E]/50"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
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
                    <span className="text-slate-600 dark:text-[#C6B79F] text-xs font-medium">ปีบริบูรณ์</span>
                    <span className="text-[10px] text-amber-700 dark:text-[#C9A96E]/80 mt-1 font-semibold">ศูนย์กลางชะตา (๙)</span>
                  </div>
                );
              }

              const dir = TAKSA_DIRECTIONS[star];
              const bhopNatal = natalMap[star];
              const bhopTransit = transitMap[star];

              const isSelected = selectedStar === star;
              const isHighlighted = highlightedStars.includes(star);

              const isKalaTransit = bhopTransit === "กาลกิณี";
              const isSriTransit = bhopTransit === "ศรี";
              const isDechTransit = bhopTransit === "เดช";
              const isMontriTransit = bhopTransit === "มนตรี";
              const isMulaTransit = bhopTransit === "มูละ";

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
                    <span className="text-[9px] font-medium text-slate-600 dark:text-slate-400 block truncate leading-tight">
                      ({dir.thaiName})
                    </span>
                  </div>

                  {/* Row 2: ทักษากำเนิด (Gold / Amber Palette) */}
                  <div className="w-full my-0.5">
                    <span className={`inline-block w-full text-[10px] md:text-[11px] font-bold py-0.5 px-1 rounded-md text-center truncate ${
                      bhopNatal === "กาลกิณี"
                        ? "bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300"
                        : "bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-300"
                    }`}>
                      [เกิด] {bhopNatal}
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

                  {/* Row 4: ทักษาจร (Astral Sky Blue / Special Badge) */}
                  <div className="w-full mt-0.5">
                    <span className={`inline-block w-full text-[10px] md:text-[11px] font-black py-0.5 px-1 rounded-md text-center truncate ${
                      isKalaTransit
                        ? "bg-rose-600 text-white dark:bg-rose-950/90 dark:text-rose-200 border border-rose-500 shadow-sm animate-pulse"
                        : isSriTransit
                        ? "bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-400 dark:border-emerald-500/60 text-emerald-800 dark:text-emerald-300"
                        : isDechTransit
                        ? "bg-purple-100 dark:bg-purple-950/80 border border-purple-400 dark:border-purple-500/60 text-purple-800 dark:text-purple-300"
                        : isMontriTransit
                        ? "bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-400 dark:border-indigo-500/60 text-indigo-800 dark:text-indigo-300"
                        : isMulaTransit
                        ? "bg-teal-100 dark:bg-teal-950/80 border border-teal-400 dark:border-teal-500/60 text-teal-800 dark:text-teal-300"
                        : "bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-400/50 text-sky-800 dark:text-sky-300"
                    }`}>
                      [จร] {bhopTransit}จร {isKalaTransit ? "⛔" : isSriTransit ? "✨" : isDechTransit ? "⚡" : isMontriTransit ? "🤝" : ""}
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
            <span>🧭</span> ติ๊กเลือกทิศทางเพื่อเปิดคำพยากรณ์เจาะลึก:
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
            const isSri = bhopTransit === "ศรี";
            const isDech = bhopTransit === "เดช";

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
                    : isSri
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : isDech
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
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
        <div className="p-5 border-t border-[#C9A96E]/20 bg-gradient-to-br from-amber-500/5 via-transparent to-sky-500/5 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🧭</span>
                <h4 className="font-display text-lg font-bold text-slate-900 dark:text-[#F8F6F1]">
                  คำพยากรณ์ประจำ {activeOracle.fullName}
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-[#C6B79F] mt-0.5">
                ดาวประจำทิศ: <strong>ดาว{activeOracle.starName} ({activeOracle.star})</strong> · 
                ทักษากำเนิด: <strong className="text-amber-700 dark:text-amber-400">{activeOracle.bhopNatal}</strong> · 
                ทักษาจรปีนี้: <strong className="text-sky-700 dark:text-sky-400">{activeOracle.bhopTransit}จร</strong>
              </p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
              activeOracle.rating === "danger"
                ? "bg-rose-100 dark:bg-rose-950/80 border border-rose-400 text-rose-800 dark:text-rose-200 animate-pulse"
                : activeOracle.rating === "supreme"
                ? "bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-400 text-emerald-800 dark:text-emerald-200"
                : "bg-sky-100 dark:bg-sky-950/80 border border-sky-400 text-sky-800 dark:text-sky-200"
            }`}>
              {activeOracle.ratingLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* 1. สมัครงาน / สัมภาษณ์ / เจรจา */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">💼</span>
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
                <span className="text-base">🚗</span>
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
                <span className="text-base">💰</span>
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
                <span className="text-base">🪑</span>
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
            <div className="mt-3.5 p-3 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/25 flex items-start gap-2.5">
              <span className="text-lg text-amber-600 dark:text-amber-400">🪷</span>
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                  เคล็ดมงคลแก้ดวงชะตาและเสริมบารมี:
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
