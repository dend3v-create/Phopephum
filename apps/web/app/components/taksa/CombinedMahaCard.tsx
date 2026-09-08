/**
 * CombinedMahaCard.tsx
 * ผังมหาภูติ (กำเนิด / จร)
 * ปรับปรุงตามมาตรฐาน:
 * 1. ตัดคำว่า "ภพ" และ "ดาว" ออกจากผังมหาภูติ
 * 2. ใช้ 2 สีแยก กำเนิด (สีขาว) และ จร (สีฟ้า)
 * 3. โลกาวินาศ = สีเหลือง, มรณะ/อริ/กาลกิณี = สีแดง
 * 4. ตัดสีม่วงและสีเขียวออกจากธีมมืด เพื่อความพรีเมียม หรูหรา
 */

import { Card } from "~/components/ui/Card";
import type { StarNumber, MahaBhop } from "@phopephum/engine";
import { STAR_NAMES } from "@phopephum/engine";

const MAHA_GRID_3X3: (MahaBhop | null)[][] = [
  ["ราชา",   "อธิบดี",    "ธงชัย"],
  [null,     "ขุมทรัพย์", null  ],
  ["มรณะ",   "โลกาวินาศ", "อริ" ],
];

interface CombinedMahaCardProps {
  natal: { cs: number; remainder: number; map: Record<string, number> };
  transit: { cs: number; remainder: number; map: Record<string, number> };
  birthYearThai?: number;
  currentYearThai?: number;
  taksaMaha?: any;
  className?: string;
}

export function CombinedMahaCard({
  natal,
  transit,
  birthYearThai,
  currentYearThai,
  taksaMaha,
  className = "",
}: CombinedMahaCardProps) {
  return (
    <Card className={`p-0 overflow-hidden border-[#C9A96E]/25 dark:border-[#C9A96E]/20 shadow-2xl bg-white/95 dark:bg-slate-900/40 backdrop-blur-md transition-all ${className}`}>
      {/* ── Header ── */}
      <div className="p-4 border-b border-[#C9A96E]/20 bg-[#C9A96E]/5 dark:bg-[#C9A96E]/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C9A96E] animate-pulse" />
            <p className="text-[14px] font-bold uppercase tracking-widest text-[#B45309] dark:text-[#C9A96E]">
              ผังมหาภูติ (จ.ศ.{natal.cs} / จร {transit.cs})
            </p>
          </div>
          <p className="text-slate-600 dark:text-[#C6B79F] text-xs md:text-sm mt-0.5">
            เศษกำเนิด: <strong className="text-slate-900 dark:text-white font-bold">{natal.remainder}</strong>
            &nbsp;·&nbsp;
            เศษจร: <strong className="text-sky-700 dark:text-sky-400 font-bold">{transit.remainder}</strong>
          </p>
        </div>

        {/* ── Legend Badges: กำเนิด (ขาว) + จร (ฟ้า) + โลกาวินาศ (เหลือง) + มรณะ/อริ (แดง) ── */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/20 text-slate-800 dark:text-white font-bold">
            <span className="w-2 h-2 rounded-full bg-slate-700 dark:bg-white" />
            กำเนิด (สีขาว)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-500/40 text-sky-800 dark:text-sky-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-sky-400" />
            จร (สีฟ้า)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            โลกาวินาศ
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            มรณะ / อริ
          </span>
        </div>
      </div>

      {/* ── 3x3 Grid ── */}
      <div className="p-4 bg-slate-100/40 dark:bg-slate-950/15">
        <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto">
          {MAHA_GRID_3X3.map((row, rIdx) =>
            row.map((bhop, cIdx) => {
              if (bhop === null) {
                return (
                  <div
                    key={`maha-empty-combined-${rIdx}-${cIdx}`}
                    className="min-h-[135px] flex items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-white/5 bg-transparent"
                  >
                    <span className="text-slate-400 dark:text-[#C6B79F] text-xs">—</span>
                  </div>
                );
              }

              const starNatal = natal.map[bhop] as StarNumber;
              const starTransit = transit.map[bhop] as StarNumber;

              const isLokawinas = bhop === "โลกาวินาศ";
              const isDanger = bhop === "มรณะ" || bhop === "อริ";

              return (
                <div
                  key={`maha-combined-${bhop}`}
                  className="min-h-[135px] flex flex-col items-center justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-2 relative text-center shadow-sm transition-all hover:border-[#C9A96E]/40"
                >
                  {/* 1. ภพมหาภูติ (ไม่มีคำว่า "ภพ") — ขาว / เหลือง(โลกาวินาศ) / แดง(มรณะ,อริ) */}
                  <div className="w-full">
                    <span
                      className={`inline-block w-full text-[11px] md:text-xs font-bold py-0.5 px-1 rounded-md text-center truncate ${
                        isLokawinas
                          ? "bg-amber-100 dark:bg-amber-950/70 border border-amber-400 dark:border-amber-500/60 text-amber-900 dark:text-amber-300 font-black shadow-sm"
                          : isDanger
                          ? "bg-rose-100 dark:bg-rose-950/70 border border-rose-400 dark:border-rose-500/60 text-rose-900 dark:text-rose-300 font-black shadow-sm"
                          : "bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20 text-slate-800 dark:text-white"
                      }`}
                    >
                      {bhop}
                    </span>
                  </div>

                  {/* 2. ดาวมหาภูติกำเนิด (ตรงกลาง) */}
                  <div className="flex flex-col items-center justify-center my-0.5">
                    <span className="font-display text-2xl md:text-3xl font-bold leading-none text-slate-900 dark:text-[#F8F6F1]">
                      {starNatal}
                    </span>
                    <span className="text-[10px] md:text-[11px] text-slate-600 dark:text-[#C6B79F] font-semibold mt-0.5">
                      {STAR_NAMES[starNatal]}
                    </span>
                  </div>

                  {/* 3. ดาวมหาภูติจร (ด้านล่าง — ไม่มีคำว่า "ดาว" หรือ "จร", ใช้สีฟ้าล้วน) */}
                  <div className="w-full">
                    <span className="inline-block w-full text-[11px] md:text-xs font-black py-0.5 px-1 rounded-md text-center truncate bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-500/40 text-sky-800 dark:text-sky-400">
                      {starTransit}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}
