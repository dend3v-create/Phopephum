"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { calculateHora } from "@/engine/phopephum-calculator";
import { useReportDownload } from "@/hooks/useReportDownload";
import PremiumReportTemplate from "@/components/PremiumReportTemplate";
import { Download, ArrowLeft, Sparkles, Loader2, Calendar, ShieldCheck, Compass } from "lucide-react";
import Link from "next/link";

export default function ReportPage() {
  const [profile, setProfile] = useState<any>(null);
  const [horaResult, setHoraResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [latestReport, setLatestReport] = useState<any>(null);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { templateRef, isDownloading, download } = useReportDownload(
    `phopephum-life-blueprint-${new Date().toISOString().slice(0, 10)}.pdf`
  );

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 48;
        const reportWidth = 794;
        setScale(Math.min(1, containerWidth / reportWidth));
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = "/login";
          return;
        }
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (prof) {
          setProfile(prof);
          const birthDate = new Date(prof.birth_date);
          const timeParts = (prof.birth_time || "12:00").split(":");
          birthDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]));
          const result = calculateHora({ date: birthDate, currentTime: birthDate });
          setHoraResult(result);
        }

        const { data: report } = await supabase
          .from("ai_reports")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        if (report) {
          setLatestReport(report.content);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-cosmic-950 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gold-500/60 uppercase tracking-[0.2em] font-bold">กำลังอัญเชิญปัญญาแห่งดวงดาว...</p>
        </div>
      </div>
    );
  }

  const reportData = {
    name: profile?.full_name,
    birthDate: profile?.birth_date,
    birthTime: profile?.birth_time,
    content: latestReport,
    horaResult,
  };

  return (
    <div className="min-h-screen bg-cosmic-950 text-foreground font-sans pb-16">
      <div className="bg-cosmic-portal" />
      <div className="cosmic-nebula-aura" />

      <header className="sticky top-0 z-40 glass-hora border-b border-white/5 bg-cosmic-950/40 backdrop-blur-2xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xxs font-bold text-text-secondary/60 hover:text-gold-500 transition-all uppercase tracking-widest"
          >
            <ArrowLeft size={14} />
            กลับ Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-gold-500/10 p-2 rounded-xl">
              <Sparkles size={16} className="text-gold-500" />
            </div>
            <span className="text-xs font-serif font-bold text-gradient-gold tracking-widest uppercase">รายงานพรีเมียม Imperial</span>
          </div>
          <button
            onClick={download}
            disabled={isDownloading}
            className="btn-hora !py-2 !px-6 !text-[10px] flex items-center gap-2"
          >
            {isDownloading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {isDownloading ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="glass-hora rounded-3xl border border-gold-500/20 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-cosmic-900/40 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-500 shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-serif font-bold text-foreground tracking-wide">{profile?.full_name || "ผู้ใช้งาน"}</p>
              <p className="text-xxs text-gold-500/60 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                <Calendar size={12} className="w-3 h-3" />
                {profile?.birth_date
                  ? new Date(profile.birth_date).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })
                  : "—"}
                {profile?.birth_time ? ` · ${profile.birth_time} น.` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-xxs font-bold text-gold-300 bg-gold-500/10 border border-gold-500/20 px-4 py-1.5 rounded-full uppercase tracking-widest shadow-inner">
              IMPERIAL ACCESS
            </span>
            <p className="text-[10px] text-text-secondary/40 font-bold uppercase tracking-[0.2em]">High-Resolution A4 Format</p>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
        <div className="text-xxs font-bold text-text-secondary/30 text-center mb-8 uppercase tracking-[0.4em]">
          PREVIEW · พิมพ์เขียวแห่งโชคชะตาฉบับพรีเมียม
        </div>

        <div
          className="mx-auto overflow-hidden rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/5"
          style={{
            width: `${794 * scale}px`,
            height: `${1123 * scale}px`,
          }}
        >
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              width: "794px",
              pointerEvents: "none",
            }}
          >
            <PremiumReportTemplate ref={templateRef} data={reportData} />
          </div>
        </div>

        <div className="mt-16 text-center">
          <button
            onClick={download}
            disabled={isDownloading}
            className="btn-hora !text-xs !py-4 !px-12 inline-flex items-center gap-4 group"
          >
            {isDownloading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Download size={18} className="group-hover:scale-110 transition-transform" />
            )}
            {isDownloading
              ? "Creating High-Res PDF..."
              : "Download Life Blueprint PDF"}
          </button>
          <p className="text-xxs text-text-secondary/40 font-bold uppercase tracking-[0.3em] mt-6 italic">
            Luxury Editorial Style · Print-Ready Resolution
          </p>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-hora border-t border-white/10 bg-cosmic-950/85 backdrop-blur-lg flex items-center justify-around py-3 px-2 shadow-[0_-10px_20px_rgba(0,0,0,0.8)] pb-safe">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-text-secondary hover:text-gold-500 transition-colors">
          <Compass className="w-4 h-4 text-text-secondary hover:text-gold-500 transition-colors" />
          <span className="text-[9px] font-medium tracking-wider">ภาพรวมดวง</span>
        </Link>
        <Link href="/dashboard/planner" className="flex flex-col items-center gap-1 text-text-secondary hover:text-gold-500 transition-colors">
          <Calendar className="w-4 h-4 text-text-secondary hover:text-gold-500 transition-colors" />
          <span className="text-[9px] font-medium tracking-wider">Planner</span>
        </Link>
        <Link href="/dashboard/coach" className="flex flex-col items-center gap-1 text-text-secondary hover:text-gold-500 transition-colors">
          <Sparkles className="w-4 h-4 text-text-secondary hover:text-gold-500 transition-colors" />
          <span className="text-[9px] font-medium tracking-wider">AI Coach</span>
        </Link>
        <Link href="/dashboard/report" className="flex flex-col items-center gap-1 text-gold-500">
          <Download className="w-4 h-4 text-gold-500" />
          <span className="text-[9px] font-bold tracking-wider">Reports</span>
        </Link>
      </div>
    </div>
  );
}
