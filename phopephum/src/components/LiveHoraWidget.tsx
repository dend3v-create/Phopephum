"use client";

import React, { useState, useEffect } from "react";
import { calculateHora, HoraResult } from "@/engine/phopephum-calculator";
import { Sparkles, Clock, Target, Compass } from "lucide-react";

export default function LiveHoraWidget() {
  const [now, setNow] = useState(new Date());
  const [horaResult, setHoraResult] = useState<HoraResult | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const currentTime = new Date();
      setNow(currentTime);
      const result = calculateHora({ date: currentTime, currentTime: currentTime });
      setHoraResult(result);
    }, 1000);

    const initialResult = calculateHora({ date: now, currentTime: now });
    setHoraResult(initialResult);

    return () => clearInterval(timer);
  }, []);

  if (!horaResult || !horaResult.currentHora) {
    return (
      <div className="max-w-4xl mx-auto glass-hora rounded-3xl p-8 border border-white/5 min-h-[300px] flex items-center justify-center">
        <div className="text-gold-500 animate-pulse font-serif tracking-widest uppercase text-xs">ประมวลผลกระแสดวงดาว...</div>
      </div>
    );
  }

  const { currentHora: current } = horaResult;

  return (
    <div className="max-w-4xl mx-auto glass-hora rounded-[2rem] p-5 sm:p-8 border border-white/5 relative overflow-hidden bg-cosmic-900/30">
      <div className="absolute top-0 right-0 w-48 h-48 bg-gold-500/5 rounded-full blur-[80px] pointer-events-none" />
      
      {/* Header label */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-gold-500 shadow-[0_0_10px_rgba(198,169,107,0.8)]"></span>
          </div>
          <span className="text-xxs font-bold text-gold-500 uppercase tracking-[0.3em]">ยามอัฐกาลสด ณ ปัจจุบัน</span>
        </div>
        <div className="flex items-center gap-2 bg-cosmic-950/50 px-4 py-2 rounded-full border border-white/5 shadow-inner">
          <Clock className="w-3.5 h-3.5 text-gold-500/60" />
          <span className="text-xs font-bold text-gold-300 tracking-widest font-mono">
            {now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-10">
        {/* Left: Info */}
        <div className="text-left space-y-6 flex-1 w-full">
          <div className="space-y-1">
            <h3 className="text-3xl sm:text-4xl font-serif font-bold text-gradient-gold">
              วัน{horaResult.dayNameThai}
            </h3>
            <p className="text-xxs font-bold text-text-secondary/60 uppercase tracking-[0.2em] flex items-center gap-2">
              <Target className="w-3 h-3" /> ยามใหญ่ที่ {current.majorIndex} · {current.majorSlot.name}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="bg-cosmic-950/40 border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Sparkles className="w-12 h-12 text-gold-500" />
              </div>
              <span className="text-[10px] font-bold text-gold-500/50 uppercase tracking-widest mb-2 block">ดาวผู้ปกครองยามย่อย</span>
              <div className="flex items-center gap-4">
                <span className="text-4xl sm:text-5xl filter drop-shadow-[0_0_15px_rgba(198,169,107,0.4)]" style={{ color: current.subSlot.planet.color }}>
                  {current.subSlot.planet.symbol}
                </span>
                <div className="min-w-0">
                  <strong className="text-lg font-serif font-bold text-foreground block tracking-wide">{current.subSlot.planet.nameThai}</strong>
                  <p className="text-xs text-text-secondary/80 leading-relaxed italic line-clamp-2 mt-0.5">{current.subSlot.planet.description}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2.5 px-1">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-bold text-text-secondary/40 uppercase tracking-widest flex items-center gap-1.5">
                <Compass className="w-3 h-3" /> กระแสพลังยาม
              </span>
              <span className="text-xxs font-bold text-gold-300 bg-gold-500/10 px-2 py-0.5 rounded uppercase">เหลือ {current.minutesRemaining} นาที</span>
            </div>
            <div className="h-1.5 w-full bg-cosmic-950 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full tqm-progress-glow transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(198,169,107,0.4)]"
                style={{ width: `${current.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Planet orbit circle */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex-shrink-0 flex items-center justify-center rounded-full border border-gold-500/20 bg-cosmic-950/50 shadow-[0_0_80px_rgba(198,169,107,0.05)] float-element">
          <div className="absolute inset-2 rounded-full border border-dashed border-gold-500/10 animate-[spin_120s_linear_infinite]" />
          <div className="absolute inset-4 rounded-full border border-white/5 animate-[spin_80s_linear_reverse_infinite]" />
          <div className="text-center z-10">
            <span
              className="text-6xl sm:text-7xl block mb-2 filter drop-shadow-[0_0_20px_rgba(198,169,107,0.6)]"
              style={{ color: current.subSlot.planet.color }}
            >
              {current.subSlot.planet.symbol}
            </span>
            <span className="text-xs font-serif font-bold text-gold-300 uppercase tracking-[0.2em] block">
              {current.subSlot.planet.nameThai}
            </span>
            <span className="text-[9px] block text-text-secondary/40 font-bold uppercase tracking-widest mt-1">
              ASTRA REGENT
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10 pt-8 border-t border-white/5">
        {[
          { label: "วันมงคลเด่น", value: `วัน${horaResult.dayNameThai}`, icon: <Target className="w-3 h-3" /> },
          { label: "ดาวเจ้าของวัน", value: horaResult.dayRuler.nameThai, icon: <Compass className="w-3 h-3" /> },
          { label: "ภาคกาล", value: current.subSlot.period === "day" ? "กลางวัน (ทิวา)" : "กลางคืน (ราตรี)", icon: <Clock className="w-3 h-3" /> },
          { label: "ยามถัดไป", value: current.subIndex < 8 ? current.majorSlot.subSlots[current.subIndex].planet.nameThai : "ยามใหญ่ถัดไป", icon: <Sparkles className="w-3 h-3" />, premium: true }
        ].map((stat, i) => (
          <div key={i} className="space-y-1.5 p-3 rounded-xl hover:bg-white/5 transition-colors">
            <span className="text-[10px] font-bold text-text-secondary/40 uppercase tracking-widest flex items-center gap-1.5">
              {stat.icon} {stat.label}
            </span>
            <span className={`text-xs font-bold block tracking-wide ${stat.premium ? 'text-gold-liquid' : 'text-foreground'}`}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
