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
    <div className="max-w-4xl mx-auto glass-hora rounded-2xl p-8 border border-hora-dark-border relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-hora-gold/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="text-left space-y-3 w-full md:w-auto">
          <span className="text-xs text-hora-gold font-semibold uppercase tracking-widest flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hora-gold opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-hora-gold"></span>
            </span>
            Live Widget
          </span>
          <h3 className="text-2xl font-serif font-semibold text-hora-gold-light">ยามอัฐกาลประจำวัน{horaResult.dayNameThai}</h3>
          <p className="text-sm text-hora-text-muted font-sans flex items-center gap-2">
            อัปเดต ณ เวลาปัจจุบัน: <span className="text-hora-gold font-mono">{now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span> น.
          </p>
          
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="bg-hora-gold/10 p-2 rounded-lg">
                <Sparkles className="w-5 h-5 text-hora-gold" />
              </div>
              <div>
                <span className="text-lg text-hora-text font-medium block leading-tight">
                  ยามใหญ่ที่ {current.majorIndex} ({current.majorSlot.startTime} - {current.majorSlot.endTime} น.)
                </span>
                <span className="text-xs text-hora-gold/60 uppercase tracking-wider">{current.majorSlot.name}</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-xl p-4">
              <p className="text-sm text-hora-text-muted mb-2">
                ดาวผู้ปกครองยามย่อยนี้คือ:
              </p>
              <div className="flex items-center gap-3">
                <span className="text-3xl" style={{ color: current.subSlot.planet.color }}>
                  {current.subSlot.planet.symbol}
                </span>
                <div>
                  <strong className="text-hora-gold text-base block">{current.subSlot.planet.nameThai} ({current.subSlot.planet.number})</strong>
                  <p className="text-xs text-hora-text/70 line-clamp-1">{current.subSlot.planet.description}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-hora-text-muted uppercase tracking-widest">
                <span>ความก้าวหน้ายามย่อย</span>
                <span>เหลืออีก {current.minutesRemaining} นาที</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full tqm-progress-glow transition-all duration-1000 ease-linear" 
                  style={{ width: `${current.progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="relative w-48 h-48 flex items-center justify-center rounded-full border border-hora-gold/20 bg-hora-dark-card/50 shadow-inner group">
          <div className="absolute inset-2 rounded-full border border-dashed border-hora-gold/10 animate-[spin_60s_linear_infinite]" />
          <div className="absolute inset-4 rounded-full border border-hora-gold/5" />
          
          <div className="text-center z-10 transition-transform duration-500 group-hover:scale-110">
            <span 
              className="text-6xl block mb-1 filter drop-shadow-[0_0_15px_rgba(201,169,110,0.4)] transition-all duration-300" 
              style={{ color: current.subSlot.planet.color }}
            >
              {current.subSlot.planet.symbol}
            </span>
            <span className="text-base font-serif font-bold text-hora-gold-light block tracking-wide">
              {current.subSlot.planet.nameThai}
            </span>
            <span className="text-[10px] block text-hora-text-muted uppercase tracking-[0.2em] mt-1 font-medium">
              ดาวครองยาม
            </span>
          </div>

          <div className="absolute inset-0 animate-[spin_20s_linear_infinite]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-hora-gold/40 rounded-full blur-[1px]" />
          </div>
          <div className="absolute inset-0 animate-[spin_35s_linear_infinite_reverse]">
            <div className="absolute bottom-10 right-10 w-1 h-1 bg-hora-gold/20 rounded-full" />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-hora-dark-border/40 text-left">
        <div className="group transition-all">
          <span className="text-[10px] text-hora-text-muted block uppercase tracking-wider mb-1">วันมงคลเด่น</span>
          <span className="text-sm font-semibold text-hora-gold-light group-hover:text-hora-gold transition-colors">วัน{horaResult.dayNameThai}</span>
        </div>
        <div className="group transition-all">
          <span className="text-[10px] text-hora-text-muted block uppercase tracking-wider mb-1">ดาวเจ้าของวัน</span>
          <span className="text-sm font-semibold text-hora-gold-light group-hover:text-hora-gold transition-colors">{horaResult.dayRuler.nameThai} ({horaResult.dayRuler.number})</span>
        </div>
        <div className="group transition-all">
          <span className="text-[10px] text-hora-text-muted block uppercase tracking-wider mb-1">ช่วงเวลา</span>
          <span className="text-sm font-semibold text-hora-gold-light group-hover:text-hora-gold transition-colors">
            {current.subSlot.period === "day" ? "กลางวัน (ทิวา)" : "กลางคืน (ราตรี)"}
          </span>
        </div>
        <div className="group transition-all">
          <span className="text-[10px] text-hora-text-muted block uppercase tracking-wider mb-1">ยามย่อยถัดไป</span>
          <span className="text-sm font-semibold text-hora-gold-cta animate-pulse">
            {current.subIndex < 8 
              ? current.majorSlot.subSlots[current.subIndex].planet.nameThai 
              : "ขึ้นยามใหญ่ถัดไป"}
          </span>
        </div>
      </div>
    </div>
  );
}
