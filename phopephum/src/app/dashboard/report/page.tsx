"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { calculateHora } from "@/engine/phopephum-calculator";
import { useReportDownload } from "@/hooks/useReportDownload";
import PremiumReportTemplate from "@/components/PremiumReportTemplate";
import { Download, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ReportPage() {
  const [profile, setProfile] = useState<any>(null);
  const [horaResult, setHoraResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { templateRef, isDownloading, download } = useReportDownload(
    `phopephum-life-blueprint-${new Date().toISOString().slice(0, 10)}.pdf`
  );

  // Responsive scale for preview
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
      <div className="min-h-screen bg-hora-dark flex items-center justify-center">
        <div className="text-hora-gold animate-pulse text-sm">กำลังโหลดรายงาน...</div>
      </div>
    );
  }

  const reportData = {
    name: profile?.full_name,
    birthDate: profile?.birth_date,
    birthTime: profile?.birth_time,
    horaResult,
  };

  return (
    <div className="min-h-screen bg-hora-dark text-hora-text font-sans pb-16">
      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,169,110,0.08),transparent_60%)] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 glass-hora border-b border-hora-dark-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-hora-text-muted hover:text-hora-gold transition-colors"
          >
            <ArrowLeft size={14} />
            กลับ Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-hora-gold" />
            <span className="text-sm font-semibold text-hora-gold-light">รายงานชะตาชีวิต Premium</span>
          </div>
          <button
            onClick={download}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: isDownloading
                ? "rgba(212,175,55,0.15)"
                : "linear-gradient(135deg, rgba(212,175,55,0.9), rgba(176,141,87,0.9))",
              color: isDownloading ? "rgba(212,175,55,0.5)" : "#0B1C2E",
              border: "1px solid rgba(212,175,55,0.4)",
              cursor: isDownloading ? "not-allowed" : "pointer",
            }}
          >
            {isDownloading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {isDownloading ? "กำลังสร้าง PDF..." : "ดาวน์โหลด PDF"}
          </button>
        </div>
      </header>

      {/* Info bar */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        <div className="glass-hora rounded-xl border border-hora-dark-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-hora-gold-light">{profile?.full_name || "ผู้ใช้งาน"}</p>
            <p className="text-xs text-hora-text-muted">
              {profile?.birth_date
                ? new Date(profile.birth_date).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })
                : "—"}
              {profile?.birth_time ? ` · ${profile.birth_time} น.` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-hora-text-muted">
            <span className="w-2 h-2 rounded-full bg-hora-gold animate-pulse inline-block" />
            <span>รายงานพรีเมียม A4 · พยากรณ์เฉพาะบุคคล</span>
          </div>
          <button
            onClick={download}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold sm:hidden transition-all"
            style={{
              background: "rgba(212,175,55,0.15)",
              color: "#D4AF37",
              border: "1px solid rgba(212,175,55,0.3)",
            }}
          >
            <Download size={12} />
            {isDownloading ? "กำลังสร้าง PDF..." : "ดาวน์โหลด PDF"}
          </button>
        </div>
      </div>

      {/* Preview container */}
      <div ref={containerRef} className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
        <div className="text-xs text-hora-text-muted text-center mb-4 opacity-60">
          ตัวอย่างรายงาน · คลิก &ldquo;ดาวน์โหลด PDF&rdquo; เพื่อรับไฟล์ A4 คุณภาพสูง
        </div>

        {/* Scaled preview wrapper */}
        <div
          style={{
            width: `${794 * scale}px`,
            height: `${1123 * scale}px`,
            margin: "0 auto",
            overflow: "hidden",
            borderRadius: "8px",
            boxShadow: "0 0 0 1px rgba(212,175,55,0.2), 0 20px 60px rgba(0,0,0,0.5)",
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

        {/* Download CTA */}
        <div className="mt-6 text-center">
          <button
            onClick={download}
            disabled={isDownloading}
            className="inline-flex items-center gap-3 px-8 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: isDownloading
                ? "rgba(212,175,55,0.1)"
                : "linear-gradient(135deg, rgba(212,175,55,0.9), rgba(176,141,87,0.85))",
              color: isDownloading ? "rgba(212,175,55,0.4)" : "#0B1C2E",
              border: "1px solid rgba(212,175,55,0.35)",
              cursor: isDownloading ? "not-allowed" : "pointer",
              boxShadow: isDownloading ? "none" : "0 4px 20px rgba(212,175,55,0.2)",
            }}
          >
            {isDownloading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {isDownloading
              ? "กำลังสร้าง PDF คุณภาพสูง..."
              : "ดาวน์โหลด Life Blueprint PDF"}
          </button>
          <p className="text-xs text-hora-text-muted mt-2 opacity-50">
            ฟอร์แมต A4 · ความละเอียดสูง · พร้อมพิมพ์
          </p>
        </div>
      </div>
    </div>
  );
}
