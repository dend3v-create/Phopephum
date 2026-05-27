"use client";

import React, { useState, useEffect } from "react";
import { calculateHora, HoraResult } from "@/engine/phopephum-calculator";
import { Sparkles } from "lucide-react";

export default function LiveHoraWidget() {
  const [now, setNow] = useState(new Date());
  const [horaResult, setHoraResult] = useState<HoraResult | null>(null);

  useEffect(() => {
    // อัปเดตเวลาทุกวินาทีเพื่อให้เข็มวินาทีหรือนาฬิกาเดินจริง
    const timer = setInterval(() => {
      const currentTime = new Date();
      setNow(currentTime);
      const result = calculateHora({ date: currentTime, currentTime: currentTime });
      setHoraResult(result);
    }, 1000);

    // คำนวณครั้งแรกทันทีที่ mount
    const initialResult = calculateHora({ date: now, currentTime: now });
    setHoraResult(initialResult);

    return () => clearInterval(timer);
  }, []);

  if (!horaResult || !horaResult.currentHora) {
    return (
      <div className="max-w-4xl mx-auto glass-hora rounded-2xl p-8 border border-hora-dark-border min-h-[300px] flex items-center justify-center">
        <div className="text-hora-gold animate-pulse">กำลังคำนวณยามอัฐกาล...</div>
      </div>
    );
  }

  const { currentHora: current } = horaResult;

  return (
    <div className="max-w-4xl mx-auto glass-hora rounded-2xl p-4 sm:p-6 border border-hora-dark-border relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-hora-gold/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header label — ยามสด ณ ปัจจุบัน */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-hora-gold font-semibold uppercase tracking-widest flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hora-gold opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-hora-gold"></span>
          </span>
          ยามอัฐกาลสด ณ ปัจจุบัน
        </span>
        <span className="text-xs font-mono text-hora-gold bg-hora-gold/10 px-2 py-0.5 rounded-full">
          {now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* Left: Info */}
        <div className="text-left space-y-2 flex-1 min-w-0">
          <h3 className="text-base sm:text-xl font-serif font-semibold text-hora-gold-light">
            วัน{horaResult.dayNameThai}
          </h3>

          <div className="flex items-center gap-2">
            <div className="bg-hora-gold/10 p-1.5 rounded-lg flex-shrink-0">
              <Sparkles className="w-4 h-4 text-hora-gold" />
            </div>
            <div className="min-w-0">
              <span className="text-sm text-hora-text font-medium block leading-snug">
                ยามใหญ่ที่ {current.majorIndex} ({current.majorSlot.startTime}–{current.majorSlot.endTime} น.)
              </span>
              <span className="text-[10px] text-hora-gold/60 uppercase tracking-wider">{current.majorSlot.name}</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-xl p-3">
            <p className="text-[11px] text-hora-text-muted mb-1.5">ดาวผู้ปกครองยามย่อย:</p>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl sm:text-3xl flex-shrink-0" style={{ color: current.subSlot.planet.color }}>
                {current.subSlot.planet.symbol}
              </span>
              <div className="min-w-0">
                <strong className="text-hora-gold text-sm block">{current.subSlot.planet.nameThai}</strong>
                <p className="text-[11px] text-hora-text/60 leading-snug line-clamp-2">{current.subSlot.planet.description}</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-hora-text-muted">
              <span>ความคืบหน้ายามย่อย</span>
              <span className="text-hora-gold">เหลือ {current.minutesRemaining} นาที</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full tqm-progress-glow transition-all duration-1000 ease-linear"
                style={{ width: `${current.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Planet orbit circle */}
        <div className="relative w-28 h-28 sm:w-36 sm:h-36 flex-shrink-0 flex items-center justify-center rounded-full border border-hora-gold/20 bg-hora-dark-card/50 shadow-inner">
          <div className="absolute inset-2 rounded-full border border-dashed border-hora-gold/10 animate-[spin_60s_linear_infinite]" />
          <div className="absolute inset-3 rounded-full border border-hora-gold/5" />
          <div className="text-center z-10">
            <span
              className="text-4xl sm:text-5xl block mb-0.5 filter drop-shadow-[0_0_12px_rgba(201,169,110,0.4)]"
              style={{ color: current.subSlot.planet.color }}
            >
              {current.subSlot.planet.symbol}
            </span>
            <span className="text-xs font-serif font-bold text-hora-gold-light block">
              {current.subSlot.planet.nameThai}
            </span>
            <span className="text-[9px] block text-hora-text-muted uppercase tracking-wider mt-0.5">
              ดาวครองยาม
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-hora-dark-border/40 text-left">
        <div>
          <span className="text-[10px] text-hora-text-muted block uppercase tracking-wider mb-0.5">วันมงคลเด่น</span>
          <span className="text-xs font-semibold text-hora-gold-light">วัน{horaResult.dayNameThai}</span>
        </div>
        <div>
          <span className="text-[10px] text-hora-text-muted block uppercase tracking-wider mb-0.5">ดาวเจ้าของวัน</span>
          <span className="text-xs font-semibold text-hora-gold-light">{horaResult.dayRuler.nameThai}</span>
        </div>
        <div>
          <span className="text-[10px] text-hora-text-muted block uppercase tracking-wider mb-0.5">ช่วงเวลา</span>
          <span className="text-xs font-semibold text-hora-gold-light">
            {current.subSlot.period === "day" ? "กลางวัน" : "กลางคืน"}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-hora-text-muted block uppercase tracking-wider mb-0.5">ยามย่อยถัดไป</span>
          <span className="text-xs font-semibold text-hora-gold-cta">
            {current.subIndex < 8
              ? current.majorSlot.subSlots[current.subIndex].planet.nameThai
              : "ยามใหญ่ถัดไป"}
          </span>
        </div>
      </div>
    </div>
  );
}
