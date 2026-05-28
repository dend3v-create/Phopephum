"use client";

import React, { useRef, useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PDFData {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  gender: string;
  reportText: string;
  topic: string;
  /** ยามอัฐกาลข้อมูล (optional) */
  horaInfo?: {
    majorSlot: number;
    planetName: string;
    planetSymbol: string;
    startTime: string;
    endTime: string;
  };
  /** เลข 7 ตัว (optional) */
  numerology?: {
    dayBase: number;
    monthBase: number;
    yearBase: number;
    totalBase: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF Export Button — Entry Point
// ─────────────────────────────────────────────────────────────────────────────

export function PDFExportButton({
  data,
  className,
}: {
  data: PDFData;
  className?: string;
}) {
  const [exporting, setExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Register global trigger (เชื่อมกับ AIReportWidget)
  useEffect(() => {
    (window as any).__horaTriggerPDF = () => triggerExport();
    return () => { delete (window as any).__horaTriggerPDF; };
  }, [data]);

  async function triggerExport() {
    setExporting(true);
    try {
      await exportToPDF(printRef, data);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      {/* Hidden PDF Template */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <PDFTemplate ref={printRef} data={data} />
      </div>

      {/* Export Button */}
      <button
        onClick={triggerExport}
        disabled={exporting}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 20px",
          borderRadius: "8px",
          background: exporting
            ? "rgba(201,169,110,0.3)"
            : "linear-gradient(135deg, #C9A96E 0%, #E8D5A3 100%)",
          color: "#0A0806",
          fontWeight: 700,
          fontSize: "14px",
          border: "none",
          cursor: exporting ? "wait" : "pointer",
          letterSpacing: "0.04em",
          width: "100%",
          justifyContent: "center",
          opacity: exporting ? 0.8 : 1,
        }}
      >
        {exporting ? (
          <>
            <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
            กำลังสร้าง PDF...
          </>
        ) : (
          <>
            📄 ดาวน์โหลดรายงาน PDF
          </>
        )}
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </button>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export Function
// ─────────────────────────────────────────────────────────────────────────────

async function exportToPDF(
  ref: React.RefObject<HTMLDivElement | null>,
  data: PDFData
): Promise<void> {
  if (!ref.current) return;

  // Dynamic import (ลด bundle size)
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const element = ref.current;

  // ชั่วคราว show element
  element.style.position = "fixed";
  element.style.left = "0";
  element.style.top = "0";
  element.style.zIndex = "-1";
  element.style.width = "794px"; // A4 width at 96dpi

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#0A0806",
    useCORS: true,
    logging: false,
    width: 794,
  });

  // Reset
  element.style.position = "absolute";
  element.style.left = "-9999px";
  element.style.zIndex = "auto";

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;
  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const canvasAspect = canvas.height / canvas.width;
  const pdfImgHeight = A4_WIDTH_MM * canvasAspect;

  if (pdfImgHeight <= A4_HEIGHT_MM) {
    pdf.addImage(imgData, "JPEG", 0, 0, A4_WIDTH_MM, pdfImgHeight);
  } else {
    // Multi-page
    let yOffset = 0;
    while (yOffset < canvas.height) {
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = Math.min(
        canvas.width * (A4_HEIGHT_MM / A4_WIDTH_MM),
        canvas.height - yOffset
      );
      const ctx = pageCanvas.getContext("2d")!;
      ctx.drawImage(canvas, 0, -yOffset);
      const pageData = pageCanvas.toDataURL("image/jpeg", 0.95);
      if (yOffset > 0) pdf.addPage();
      pdf.addImage(pageData, "JPEG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
      yOffset += pageCanvas.height;
    }
  }

  const fileName = `hora-report-${data.name}-${data.birthDate}.pdf`;
  pdf.save(fileName);
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF Template (rendered off-screen, captured by html2canvas)
// ─────────────────────────────────────────────────────────────────────────────

const PDFTemplate = React.forwardRef<HTMLDivElement, { data: PDFData }>(
  function PDFTemplate({ data }, ref) {
    const thai = formatThaiDateFull(data.birthDate);
    const dayName = getDayNameThai(data.birthDate);

    return (
      <div
        ref={ref}
        style={{
          width: "794px",
          backgroundColor: "#0A0806",
          color: "#F5F0E8",
          fontFamily: "'Sarabun', 'Tahoma', sans-serif",
          padding: "0",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div
          style={{
            background: "linear-gradient(135deg, #15120F 0%, #1e1a15 100%)",
            borderBottom: "2px solid rgba(201,169,110,0.4)",
            padding: "36px 48px 28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div style={{
              fontSize: "28px",
              fontWeight: 800,
              color: "#C9A96E",
              letterSpacing: "0.15em",
              lineHeight: 1,
            }}>
              PHOPEPHUM
            </div>
            <div style={{ fontSize: "11px", color: "#8B7E6E", marginTop: "4px", letterSpacing: "0.1em" }}>
              ASTROLOGY & AI WISDOM PLATFORM
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "12px", color: "#8B7E6E" }}>รายงานสร้างโดย AI</div>
            <div style={{ fontSize: "12px", color: "#C9A96E", marginTop: "2px" }}>
              {new Date().toLocaleDateString("th-TH", {
                year: "numeric", month: "long", day: "numeric"
              })}
            </div>
          </div>
        </div>

        {/* ── Title Banner ───────────────────────────────────────────── */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(201,169,110,0.12) 0%, transparent 100%)",
            borderBottom: "1px solid rgba(201,169,110,0.15)",
            padding: "24px 48px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "11px", color: "#8B7E6E", letterSpacing: "0.2em", marginBottom: "6px" }}>
            ✦ รายงานวิเคราะห์ชะตาชีวิต ✦
          </div>
          <div style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#E8D5A3",
          }}>
            {data.name}
          </div>
          <div style={{ fontSize: "13px", color: "#8B7E6E", marginTop: "4px" }}>
            {dayName} · {thai} · {data.birthTime} น. · {data.birthPlace}
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div style={{ padding: "28px 48px" }}>
          {/* Birth Data Card */}
          <div style={{
            display: "flex",
            gap: "12px",
            marginBottom: "24px",
          }}>
            {data.numerology && (
              <InfoCard
                title="เลขฐาน"
                items={[
                  { label: "ฐานวัน", value: String(data.numerology.dayBase) },
                  { label: "ฐานเดือน", value: String(data.numerology.monthBase) },
                  { label: "ฐานปี", value: String(data.numerology.yearBase) },
                  { label: "รวมกำลัง", value: String(data.numerology.totalBase) },
                ]}
              />
            )}
            {data.horaInfo && (
              <InfoCard
                title={`ยามปัจจุบัน`}
                items={[
                  { label: "ยามที่", value: String(data.horaInfo.majorSlot) },
                  { label: "ดาว", value: `${data.horaInfo.planetSymbol} ${data.horaInfo.planetName}` },
                  { label: "เวลา", value: `${data.horaInfo.startTime}–${data.horaInfo.endTime}` },
                ]}
              />
            )}
            <InfoCard
              title="ข้อมูลกำเนิด"
              items={[
                { label: "วันเกิด", value: dayName },
                { label: "ภูมิสถาน", value: data.birthPlace },
                { label: "เพศสถาน", value: data.gender === "male" ? "บุรุษ" : data.gender === "female" ? "สตรี" : "อื่นๆ" },
              ]}
            />
          </div>

          {/* Divider */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
          }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(201,169,110,0.2)" }} />
            <span style={{ color: "#C9A96E", fontSize: "14px" }}>✦ รายงานพยากรณ์ ✦</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(201,169,110,0.2)" }} />
          </div>

          {/* Report Text */}
          <div
            style={{
              fontSize: "14px",
              lineHeight: "2",
              color: "#E8E2D8",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {data.reportText}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div
          style={{
            borderTop: "1px solid rgba(201,169,110,0.2)",
            padding: "16px 48px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(15,12,10,0.8)",
          }}
        >
          <span style={{ fontSize: "10px", color: "#5a5148" }}>
            เอกสารนี้สร้างโดย PHOPEPHUM AI · phopephum.com
          </span>
          <span style={{ fontSize: "10px", color: "#5a5148" }}>
            ใช้เพื่อการพัฒนาตนเองเท่านั้น
          </span>
        </div>
      </div>
    );
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// InfoCard helper
// ─────────────────────────────────────────────────────────────────────────────

function InfoCard({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: string }[];
}) {
  return (
    <div
      style={{
        flex: 1,
        border: "1px solid rgba(201,169,110,0.2)",
        borderRadius: "8px",
        padding: "12px",
        background: "rgba(201,169,110,0.04)",
      }}
    >
      <div style={{
        fontSize: "10px",
        color: "#C9A96E",
        letterSpacing: "0.1em",
        marginBottom: "8px",
        fontWeight: 700,
      }}>
        {title.toUpperCase()}
      </div>
      {items.map(({ label, value }) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ fontSize: "11px", color: "#8B7E6E" }}>{label}</span>
          <span style={{ fontSize: "12px", color: "#E8D5A3", fontWeight: 600 }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Date Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatThaiDateFull(isoDate: string): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-").map(Number);
  const buddhistYear = year + 543;
  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ];
  return `${day} ${thaiMonths[month - 1]} พ.ศ. ${buddhistYear}`;
}

function getDayNameThai(isoDate: string): string {
  if (!isoDate) return "";
  const days = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
  const d = new Date(isoDate);
  return days[d.getDay()] ?? "";
}
