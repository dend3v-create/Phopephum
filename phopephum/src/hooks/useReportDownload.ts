"use client";

import { useRef, useState, useCallback } from "react";

export function useReportDownload(filename = "phopephum-life-blueprint.pdf") {
  const templateRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const download = useCallback(async () => {
    if (isDownloading || !templateRef.current) return;
    setIsDownloading(true);

    try {
      // Dynamic imports — keeps bundle lean (not SSR)
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const element = templateRef.current;

      // Capture at 2× resolution for crisp PDF
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#0B1C2E",
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      // A4 dimensions in mm: 210 × 297
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidth = 210; // mm
      const pdfHeight = 297; // mm

      // Scale canvas to fit A4 width
      const canvasAspect = canvas.height / canvas.width;
      const imgHeightInMm = pdfWidth * canvasAspect;

      if (imgHeightInMm <= pdfHeight) {
        // Fits on one page
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, imgHeightInMm);
      } else {
        // Split across multiple pages
        let yOffset = 0;
        const pageHeightPx = (pdfHeight / pdfWidth) * canvas.width;

        while (yOffset < canvas.height) {
          // Create a slice canvas
          const sliceH = Math.min(pageHeightPx, canvas.height - yOffset);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(canvas, 0, -yOffset);
          }
          const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);
          const sliceHeightMm = (sliceH / canvas.width) * pdfWidth;
          if (yOffset > 0) pdf.addPage();
          pdf.addImage(sliceData, "JPEG", 0, 0, pdfWidth, sliceHeightMm);
          yOffset += sliceH;
        }
      }

      pdf.save(filename);
    } catch (err) {
      console.error("[useReportDownload]", err);
      alert("ไม่สามารถดาวน์โหลด PDF ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading, filename]);

  return { templateRef, isDownloading, download };
}
