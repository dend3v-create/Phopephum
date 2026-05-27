/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { forwardRef } from "react";
import { User, Sparkles, Target, Zap, Scroll, Map, ShieldCheck, Compass, Clock } from "lucide-react";

interface ReportData {
  name?: string;
  birthDate?: string;
  birthTime?: string;
  content?: any;
  horaResult?: any;
}

interface PremiumReportTemplateProps {
  data?: ReportData;
}

const PremiumReportTemplate = forwardRef<HTMLDivElement, PremiumReportTemplateProps>(
  ({ data }, ref) => {
    const name = data?.name || "ผู้ขอรับการพยากรณ์";
    const content = data?.content || {};
    const birthDate = data?.birthDate
      ? new Date(data.birthDate).toLocaleDateString("th-TH", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "—";

    return (
      <div
        ref={ref}
        className="w-[794px] min-h-[1123px] bg-cosmic-950 text-foreground relative overflow-hidden p-0 font-sans"
        style={{ color: "#F8F6F1" }}
      >
        {/* Background Layers */}
        <div className="absolute inset-0 bg-astral-flow" />
        <div className="absolute inset-0 bg-liquid-gold opacity-50" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* ═══ HEADER SECTION ═══ */}
        <div className="relative p-12 pb-8 border-b border-white/10">
          <div className="flex justify-between items-center mb-10">
            <div className="text-[10px] font-bold text-gold-500 uppercase tracking-[0.4em]">
              PREMIUM IMPERIAL REPORT · PHOPEPHUM AI
            </div>
            <div className="text-[10px] text-text-secondary/60 font-bold uppercase tracking-widest">
              {new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>

          <div className="text-center space-y-4">
            <h1 className="text-sm font-bold text-gold-300 uppercase tracking-[0.6em]">The Great Ascension</h1>
            <h2 className="text-5xl font-serif font-bold text-gradient-gold tracking-widest leading-tight">
              ASTRAL IMPERIAL FLOW
            </h2>
            <div className="pt-4 flex items-center justify-center gap-4">
              <div className="h-px w-12 bg-white/10" />
              <p className="text-lg text-text-secondary font-medium tracking-wide">
                รหัสชะตาชีวิตจักรพรรดิ: <strong className="text-gold-400">{name}</strong>
              </p>
              <div className="h-px w-12 bg-white/10" />
            </div>
          </div>
        </div>

        {/* ═══ BIRTH INFO BAR ═══ */}
        <div className="relative flex justify-center gap-12 py-6 bg-cosmic-900/50 border-b border-white/5">
          {[
            { label: "วันเกิด", value: birthDate, icon: <Calendar className="w-3 h-3" /> },
            { label: "พิกัดเวลา", value: data?.birthTime || "—", icon: <Clock className="w-3 h-3" /> },
            { label: "สถานะดวง", value: "มหาอุจจ์", icon: <Sparkles className="w-3 h-3" /> },
            { label: "ระดับการเข้าถึง", value: "Premium Imperial", icon: <ShieldCheck className="w-3 h-3" /> }
          ].map((item, i) => (
            <div key={i} className="text-center space-y-1">
              <div className="text-[9px] font-bold text-gold-500/60 uppercase tracking-widest flex items-center justify-center gap-1.5">
                {item.label}
              </div>
              <div className="text-xs font-bold text-foreground tracking-wide">
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* ═══ CONTENT GRID ═══ */}
        <div className="relative p-12 grid grid-cols-2 gap-8">
          
          {/* Section: Identity */}
          <div className="bg-cosmic-900/40 border border-white/5 rounded-3xl p-8 space-y-4 group hover:border-gold-500/20 transition-all">
            <h3 className="text-xxs font-bold text-gold-500 uppercase tracking-[0.3em] flex items-center gap-2">
              <User className="w-4 h-4" /> ตัวตนหลักและจิตวิญญาณ
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed text-left">
              {content.identity?.attha || "ข้อมูลกำลังประมวลผล..."}
            </p>
          </div>

          {/* Section: Charm */}
          <div className="bg-cosmic-900/40 border border-white/5 rounded-3xl p-8 space-y-4 group hover:border-gold-500/20 transition-all">
            <h3 className="text-xxs font-bold text-gold-500 uppercase tracking-[0.3em] flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> เสน่ห์และการสื่อสาร
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed text-left">
              {content.charm?.overview || "ข้อมูลกำลังประมวลผล..."}
            </p>
          </div>

          {/* Section: Career */}
          <div className="bg-cosmic-900/40 border border-white/5 rounded-3xl p-8 space-y-4 group hover:border-gold-500/20 transition-all">
            <h3 className="text-xxs font-bold text-gold-500 uppercase tracking-[0.3em] flex items-center gap-2">
              <Target className="w-4 h-4" /> ยุทธศาสตร์ความสำเร็จ
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed text-left">
              {content.career || "ข้อมูลกำลังประมวลผล..."}
            </p>
          </div>

          {/* Section: Finance */}
          <div className="bg-cosmic-900/40 border border-white/5 rounded-3xl p-8 space-y-4 group hover:border-gold-500/20 transition-all">
            <h3 className="text-xxs font-bold text-gold-500 uppercase tracking-[0.3em] flex items-center gap-2">
              <Zap className="w-4 h-4" /> แผนที่ขุมทรัพย์และการเงิน
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed text-left">
              {content.finance || "ข้อมูลกำลังประมวลผล..."}
            </p>
          </div>

          {/* ═══ PREMIUM FULL WIDTH SECTIONS ═══ */}
          <div className="col-span-2 space-y-8 mt-4">
            
            {/* Golden Hour */}
            <div className="bg-gold-500/5 border border-gold-500/20 rounded-[2.5rem] p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Clock className="w-24 h-24 text-gold-500" />
              </div>
              <h3 className="text-sm font-serif font-bold text-gold-300 mb-6 flex items-center gap-3 uppercase tracking-widest">
                <Zap className="w-5 h-5 text-gold-liquid" /> Golden Hour Execution
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed text-left">
                {content.goldenHourExecution || "Upgrade to Premium to unlock this insight."}
              </p>
            </div>

            {/* Karmic Blueprint */}
            <div className="bg-gold-500/5 border border-gold-500/20 rounded-[2.5rem] p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Scroll className="w-24 h-24 text-gold-500" />
              </div>
              <h3 className="text-sm font-serif font-bold text-gold-300 mb-6 flex items-center gap-3 uppercase tracking-widest">
                <Compass className="w-5 h-5 text-gold-liquid" /> Karmic Blueprint & Ancient Gifts
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed text-left">
                {content.karmicBlueprint || "Upgrade to Premium to unlock this insight."}
              </p>
            </div>

          </div>
        </div>

        {/* ═══ FOOTER MESSAGE ═══ */}
        <div className="absolute bottom-12 left-12 right-12 text-center space-y-6">
          <div className="h-px w-full bg-white/5" />
          <div className="space-y-2">
            <p className="text-sm font-serif font-bold text-gold-300 italic">
              "โชคชะตาคือกระแสลม ปัญญาคือใบเรือ... จงขับเคลื่อนด้วยสัจจะที่มั่นคง"
            </p>
            <p className="text-[9px] font-bold text-text-secondary/30 uppercase tracking-[0.5em]">
              © 2026 PHOPEPHUM AI WISDOM OS · ALL RIGHTS RESERVED
            </p>
          </div>
        </div>
      </div>
    );
  }
);

PremiumReportTemplate.displayName = "PremiumReportTemplate";
export default PremiumReportTemplate;

const Calendar = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
);
