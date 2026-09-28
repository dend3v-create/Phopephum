import React, { useState, useRef, useEffect } from "react";
import { AstralIcon } from "~/components/ui/AstralIcon";

export interface SocialStoryData {
  userName?: string;
  userTier?: string;
  dateStr: string;
  lunarStr?: string;
  yamName?: string;
  yamPeriod?: string;
  auspiciousTime?: string;
  energyScore?: number;
  wisdomTitle?: string;
  wisdomQuote?: string;
  doList?: string[];
  avoidList?: string[];
  horoscopeSign?: string;
  base7Root?: string;
}

interface SocialStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SocialStoryData;
}

type AspectRatio = "9:16" | "1:1";
type CardTheme = "imperial-gold" | "mystic-indigo" | "ruby-sunset" | "emerald-prosperity";

const THEME_CONFIGS: Record<CardTheme, {
  name: string;
  bgGradStart: string;
  bgGradMid: string;
  bgGradEnd: string;
  accentGold: string;
  accentBright: string;
  textPrimary: string;
  textSecondary: string;
  borderGlow: string;
  cardBg: string;
  badgeBg: string;
}> = {
  "imperial-gold": {
    name: "ทองจักรพรรดิ์ (Imperial Gold)",
    bgGradStart: "#020617",
    bgGradMid: "#0A1628",
    bgGradEnd: "#020617",
    accentGold: "#C6A96B",
    accentBright: "#F5DF9E",
    textPrimary: "#F8F6F1",
    textSecondary: "#E2D7C5",
    borderGlow: "rgba(198, 169, 107, 0.45)",
    cardBg: "rgba(10, 24, 48, 0.75)",
    badgeBg: "rgba(198, 169, 107, 0.2)",
  },
  "mystic-indigo": {
    name: "ครามเนบิวลา (Mystic Indigo)",
    bgGradStart: "#030814",
    bgGradMid: "#0F1F3D",
    bgGradEnd: "#060D1F",
    accentGold: "#7EB6FF",
    accentBright: "#C4DEFF",
    textPrimary: "#FFFFFF",
    textSecondary: "#D4E4FC",
    borderGlow: "rgba(126, 182, 255, 0.45)",
    cardBg: "rgba(16, 32, 64, 0.75)",
    badgeBg: "rgba(126, 182, 255, 0.2)",
  },
  "ruby-sunset": {
    name: "ทับทิมสุริยัน (Ruby Sunset)",
    bgGradStart: "#14040A",
    bgGradMid: "#2C0D18",
    bgGradEnd: "#120308",
    accentGold: "#FF9E79",
    accentBright: "#FFD0BF",
    textPrimary: "#FFF5F2",
    textSecondary: "#F5D2C7",
    borderGlow: "rgba(255, 158, 121, 0.45)",
    cardBg: "rgba(42, 14, 24, 0.75)",
    badgeBg: "rgba(255, 158, 121, 0.2)",
  },
  "emerald-prosperity": {
    name: "มรกตมหาลาภ (Emerald Wealth)",
    bgGradStart: "#02120C",
    bgGradMid: "#0A2C20",
    bgGradEnd: "#03170F",
    accentGold: "#5DE2A5",
    accentBright: "#B4F7D6",
    textPrimary: "#F0FDF4",
    textSecondary: "#C8F5DF",
    borderGlow: "rgba(93, 226, 165, 0.45)",
    cardBg: "rgba(10, 42, 30, 0.75)",
    badgeBg: "rgba(93, 226, 165, 0.2)",
  },
};

export function SocialStoryModal({ isOpen, onClose, data }: SocialStoryModalProps) {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [theme, setTheme] = useState<CardTheme>("imperial-gold");
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeTheme = THEME_CONFIGS[theme];

  // Draw card to canvas for export
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1080;
    const height = aspectRatio === "9:16" ? 1920 : 1080;

    canvas.width = width;
    canvas.height = height;

    // ── 1. Background Cosmic Gradient ──
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, activeTheme.bgGradStart);
    bgGrad.addColorStop(0.5, activeTheme.bgGradMid);
    bgGrad.addColorStop(1, activeTheme.bgGradEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // ── 2. Deep Radiant Nebula Aura ──
    const nebulaGrad = ctx.createRadialGradient(width / 2, height * 0.32, 60, width / 2, height * 0.32, 550);
    nebulaGrad.addColorStop(0, activeTheme.borderGlow.replace("0.45", "0.35"));
    nebulaGrad.addColorStop(0.7, activeTheme.borderGlow.replace("0.45", "0.08"));
    nebulaGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = nebulaGrad;
    ctx.fillRect(0, 0, width, height);

    // ── 3. Sacred Geometry Astrolabe Illustration ──
    ctx.save();
    ctx.translate(width / 2, height * 0.32);
    
    // Concentric Astrolabe Rings
    ctx.strokeStyle = activeTheme.borderGlow.replace("0.45", "0.22");
    ctx.lineWidth = 1.5;
    
    [180, 260, 340, 420].forEach((r) => {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Astrolabe Tick Marks & 12 Planetary Axes
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 160, Math.sin(angle) * 160);
      ctx.lineTo(Math.cos(angle) * 440, Math.sin(angle) * 440);
      ctx.strokeStyle = i % 3 === 0 ? activeTheme.accentGold + "33" : "rgba(255,255,255,0.06)";
      ctx.lineWidth = i % 3 === 0 ? 1.5 : 1;
      ctx.stroke();
    }

    // Radiant Central Starburst behind score
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      ctx.fillStyle = activeTheme.accentBright + "18";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle - 0.1) * 130, Math.sin(angle - 0.1) * 130);
      ctx.lineTo(Math.cos(angle) * 160, Math.sin(angle) * 160);
      ctx.lineTo(Math.cos(angle + 0.1) * 130, Math.sin(angle + 0.1) * 130);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // ── 4. Elegant Double Gold Frame Borders ──
    ctx.strokeStyle = activeTheme.accentGold;
    ctx.lineWidth = 3.5;
    ctx.strokeRect(36, 36, width - 72, height - 72);

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.strokeRect(50, 50, width - 100, height - 100);

    // Baroque Corner Ornaments (✦ & accents)
    ctx.fillStyle = activeTheme.accentGold;
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✦", 68, 68);
    ctx.fillText("✦", width - 68, 68);
    ctx.fillText("✦", 68, height - 68);
    ctx.fillText("✦", width - 68, height - 68);

    // ── 5. Header: Brand Logo & Title (Larger & Crisp) ──
    ctx.fillStyle = activeTheme.accentBright;
    ctx.font = "bold 38px Cinzel, serif";
    ctx.fillText("P H O P E P H U M", width / 2, 120);

    ctx.fillStyle = activeTheme.accentGold;
    ctx.font = "bold 20px 'IBM Plex Sans Thai', sans-serif";
    ctx.letterSpacing = "3px";
    ctx.fillText("WISDOM GUIDANCE OS · LIVING ASTROLOGY", width / 2, 160);

    // ── 6. Date & Lunar Banner (Glass Box) ──
    const dateY = 230;
    const dateBoxWidth = width - 180;
    const dateBoxHeight = 68;
    
    ctx.fillStyle = activeTheme.cardBg;
    ctx.fillRect(90, dateY - dateBoxHeight / 2, dateBoxWidth, dateBoxHeight);
    
    ctx.strokeStyle = activeTheme.accentGold;
    ctx.lineWidth = 2;
    ctx.strokeRect(90, dateY - dateBoxHeight / 2, dateBoxWidth, dateBoxHeight);

    ctx.fillStyle = activeTheme.textPrimary;
    ctx.font = "bold 32px 'IBM Plex Sans Thai', sans-serif";
    const dateFullText = data.dateStr + (data.lunarStr ? ` (${data.lunarStr})` : "");
    ctx.fillText(dateFullText, width / 2, dateY);

    // ── 7. Main Central Card Box ──
    const cardTop = aspectRatio === "9:16" ? 310 : 290;
    const cardHeight = aspectRatio === "9:16" ? 1340 : 610;

    // Glowing Card Container
    ctx.fillStyle = activeTheme.cardBg;
    ctx.fillRect(80, cardTop, width - 160, cardHeight);
    
    ctx.strokeStyle = activeTheme.borderGlow;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(80, cardTop, width - 160, cardHeight);

    // ── 8. Energy Score & Celestial Badge ──
    const scoreY = cardTop + 105;
    
    ctx.fillStyle = activeTheme.accentBright;
    ctx.font = "bold 24px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("✦ ดัชนีพลังงาน & ฤกษ์มงคลประจำวัน ✦", width / 2, scoreY - 35);

    // Big Score Number
    ctx.fillStyle = activeTheme.textPrimary;
    ctx.font = "bold 110px Cinzel, serif";
    ctx.fillText(`${data.energyScore || 92}`, width / 2 - 40, scoreY + 50);

    ctx.fillStyle = activeTheme.accentGold;
    ctx.font = "bold 34px Cinzel, serif";
    ctx.fillText("/ 100", width / 2 + 85, scoreY + 45);

    // Auspicious Yam Time Pill
    const yamY = scoreY + 130;
    const yamPillWidth = width - 260;
    const yamPillHeight = 60;

    ctx.fillStyle = activeTheme.badgeBg;
    ctx.fillRect(130, yamY - yamPillHeight / 2, yamPillWidth, yamPillHeight);
    
    ctx.strokeStyle = activeTheme.accentGold;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(130, yamY - yamPillHeight / 2, yamPillWidth, yamPillHeight);

    ctx.fillStyle = activeTheme.textPrimary;
    ctx.font = "bold 28px 'IBM Plex Sans Thai', sans-serif";
    const yamText = `ยามมงคล: ${data.yamName || "ยามอัฏฐกาล"} (${data.yamPeriod || "กลางวัน"}) ${data.auspiciousTime ? "· " + data.auspiciousTime : ""}`;
    ctx.fillText(yamText, width / 2, yamY);

    // ── 9. Wisdom Quote Section (Large, Readable & Engaging) ──
    const quoteY = yamY + 95;
    
    ctx.fillStyle = activeTheme.accentBright;
    ctx.font = "bold 36px 'IBM Plex Sans Thai', sans-serif";
    const wTitle = data.wisdomTitle ? `“ ${data.wisdomTitle} ”` : "“ วันแห่งการเปิดโอกาสทองคำและความสำเร็จใหญ่ ”";
    ctx.fillText(wTitle, width / 2, quoteY);

    ctx.fillStyle = activeTheme.textSecondary;
    ctx.font = "500 30px 'IBM Plex Sans Thai', sans-serif";
    const quoteText = data.wisdomQuote || "พลังงานโดยรวมอยู่ในเกณฑ์ราบรื่นคล่องตัว มีช่วงเวลาทองคำเกื้อหนุน เหมาะแก่การลงมือทำตามเป้าหมายและเจรจาสำเร็จ";
    
    const quoteLines = wrapTextLines(ctx, `"${quoteText}"`, width - 240);
    const startQuoteTextY = quoteY + 55;
    quoteLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, startQuoteTextY + idx * 46);
    });

    // ── 10. Do & Avoid Recommendations ──
    if (aspectRatio === "9:16") {
      const doAvoidY = cardTop + 650;
      const boxWidth = (width - 240) / 2;
      const boxHeight = 440;

      // ── Do Box (Green Emerald) ──
      ctx.fillStyle = "rgba(16, 185, 129, 0.14)";
      ctx.fillRect(100, doAvoidY, boxWidth, boxHeight);
      ctx.strokeStyle = "rgba(16, 185, 129, 0.55)";
      ctx.lineWidth = 2;
      ctx.strokeRect(100, doAvoidY, boxWidth, boxHeight);

      ctx.fillStyle = "#34D399";
      ctx.font = "bold 32px 'IBM Plex Sans Thai', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("✓ สิ่งที่ควรทำ", 125, doAvoidY + 55);

      ctx.fillStyle = activeTheme.textPrimary;
      ctx.font = "26px 'IBM Plex Sans Thai', sans-serif";
      const dos = data.doList && data.doList.length > 0
        ? data.doList.slice(0, 4)
        : ["ลงมือทำงานตามแผนที่วางไว้", "ลงทุน / จัดการการเงินและสภาพคล่อง", "สื่อสารความรู้สึกอย่างตรงไปตรงมา", "เจรจาธุรกิจ / เสนองานสำคัญ"];
      
      dos.forEach((item, idx) => {
        const itemY = doAvoidY + 130 + idx * 76;
        ctx.fillStyle = "#34D399";
        ctx.fillText("●", 125, itemY);
        ctx.fillStyle = activeTheme.textPrimary;
        ctx.fillText(item, 150, itemY);
      });

      // ── Avoid Box (Rose Ruby) ──
      const avoidX = 100 + boxWidth + 40;
      ctx.fillStyle = "rgba(244, 63, 94, 0.14)";
      ctx.fillRect(avoidX, doAvoidY, boxWidth, boxHeight);
      ctx.strokeStyle = "rgba(244, 63, 94, 0.55)";
      ctx.lineWidth = 2;
      ctx.strokeRect(avoidX, doAvoidY, boxWidth, boxHeight);

      ctx.fillStyle = "#FB7185";
      ctx.font = "bold 32px 'IBM Plex Sans Thai', sans-serif";
      ctx.fillText("✕ สิ่งที่ควรเลี่ยง", avoidX + 25, doAvoidY + 55);

      ctx.fillStyle = activeTheme.textPrimary;
      ctx.font = "26px 'IBM Plex Sans Thai', sans-serif";
      const avoids = data.avoidList && data.avoidList.length > 0
        ? data.avoidList.slice(0, 4)
        : ["การตัดสินใจด้วยอารมณ์ชั่ววูบ", "การโต้เถียงในที่สาธารณะ", "การลงนามเอกสารเร่งรีบโดยไม่รอบคอบ", "การทำงานหักโหมติดต่อกันเกินกำลัง"];

      avoids.forEach((item, idx) => {
        const itemY = doAvoidY + 130 + idx * 76;
        ctx.fillStyle = "#FB7185";
        ctx.fillText("●", avoidX + 25, itemY);
        ctx.fillStyle = activeTheme.textPrimary;
        ctx.fillText(item, avoidX + 50, itemY);
      });
    }

    // ── 11. Footer: Imperial Seal & Creator Attribution ──
    const footerY = height - 125;
    ctx.textAlign = "center";
    
    ctx.fillStyle = activeTheme.accentBright;
    ctx.font = "bold 26px 'Cinzel', serif";
    ctx.fillText("✦ P H O P E P H U M · C E L E S T I A L ✦", width / 2, footerY);

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "bold 22px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText(`วิเคราะห์ดวงชะตาเฉพาะตนสำหรับ: ${data.userName || "สมาชิกภพภูมิ"} | phopephum.com`, width / 2, footerY + 45);
  };

  // Helper to split text into wrapped lines
  function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (let n = 0; n < words.length; n++) {
      const testLine = currentLine ? `${currentLine} ${words[n]}` : words[n];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(currentLine);
        currentLine = words[n];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  }

  // Redraw when modal opens or settings change
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        renderCanvas();
      }, 50);
    }
  }, [isOpen, aspectRatio, theme, data]);

  // Download high-res PNG image
  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsExporting(true);
    try {
      const imageUri = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `phopephum-story-${aspectRatio === "9:16" ? "9x16" : "1x1"}-${Date.now()}.png`;
      link.href = imageUri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Export error:", e);
    } finally {
      setIsExporting(false);
    }
  };

  // Copy Image to Clipboard
  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob })
        ]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
      });
    } catch (e) {
      console.error("Copy image failed:", e);
      handleDownloadImage();
    }
  };

  // Native Mobile Web Share
  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (navigator.share && navigator.canShare) {
      try {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], "phopephum-story.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: "พลังงานดวงดาวประจำวัน — PhopePhum",
              text: `🔮 พลังงานและฤกษ์มงคลประจำวันจาก PhopePhum: ${data.wisdomQuote || "ปัญญาชีวิตนำทาง"} ✨\n#PhopePhum #ดวงวันนี้ #ฤกษ์มงคล`,
            });
          }
        });
      } catch (e) {
        console.error("Share failed:", e);
      }
    } else {
      handleDownloadImage();
    }
  };

  // Copy Creator Caption with hashtags
  const handleCopyCaption = () => {
    const caption = `🔮 พลังงานดวงดาวและฤกษ์มงคลประจำวันที่ ${data.dateStr} ✨\n\n` +
      `⚡ ดัชนีพลังงาน: ${data.energyScore || 92}/100\n` +
      `⏱️ ยามมงคล: ${data.yamName || "ยามอัฏฐกาล"} (${data.yamPeriod || "กลางวัน"})\n\n` +
      `🕊️ ปัญญาชีวิตวันนี้:\n"${data.wisdomQuote || "พลังงานโดยรวมอยู่ในเกณฑ์ราบรื่นคล่องตัว มีช่วงเวลาทองคำเกื้อหนุน เหมาะแก่การลงมือทำตามเป้าหมายและเจรจาสำเร็จ"}"\n\n` +
      `✨ วิเคราะห์ดวงชะตาและจังหวะชีวิตเฉพาะตนได้ที่ @PhopePhum\n` +
      `🌐 https://phopephum.com\n\n` +
      `#PhopePhum #ดวงวันนี้ #พลังงานดวงดาว #ฤกษ์มงคล #สายมู #คอนเทนต์ครีเอเตอร์ #เลข7ตัว #จักรพรรดิพยากรณ์`;

    navigator.clipboard.writeText(caption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col md:flex-row gap-6 p-4 sm:p-6 rounded-3xl border border-[#C6A96B]/30 bg-[#07132b]/95 shadow-2xl shadow-black/90 overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-[#D9CDB7] hover:text-[#F8F6F1] transition-all z-20"
        >
          ✕
        </button>

        {/* ── Left Column: Live Card Canvas Preview ── */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[380px] sm:min-h-[500px]">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#C6A96B]/30 bg-black/40 flex items-center justify-center p-2 max-w-[320px] sm:max-w-[360px]">
            <canvas
              ref={canvasRef}
              className="w-full h-auto rounded-xl object-contain drop-shadow-[0_0_20px_rgba(198,169,107,0.15)]"
              style={{
                aspectRatio: aspectRatio === "9:16" ? "9 / 16" : "1 / 1",
                maxHeight: "68vh",
              }}
            />
          </div>
          <p className="text-[11px] text-[#D9CDB7]/70 mt-2 text-center">
            ✦ ภาพความละเอียดสูง 1080p สำหรับ Stories / Reels / TikTok / Facebook
          </p>
        </div>

        {/* ── Right Column: Creator Controls & Theme Switcher ── */}
        <div className="w-full md:w-80 flex flex-col justify-between space-y-6 pt-2">
          
          <div className="space-y-5">
            <div>
              <span className="text-[#C6A96B] text-[10px] tracking-[0.25em] font-bold uppercase block mb-1">
                ✦ CREATOR SOCIAL STUDIO
              </span>
              <h3 className="font-display text-xl font-bold text-[#F8F6F1]">
                สร้างการ์ดสตอรี่แชร์ลงโซเชียล
              </h3>
              <p className="text-xs text-[#D9CDB7] mt-1">
                สร้างภาพคอนเทนต์ดวงดาวและฤกษ์มงคลระดับพรีเมียม สไตล์ Astral Imperial
              </p>
            </div>

            {/* Aspect Ratio Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#D9CDB7] block">
                📐 อัตราส่วนภาพ
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAspectRatio("9:16")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    aspectRatio === "9:16"
                      ? "bg-[#C6A96B]/25 border-[#C6A96B] text-[#F8F6F1] shadow-md shadow-[#C6A96B]/20"
                      : "bg-white/5 border-white/10 text-[#D9CDB7] hover:bg-white/10"
                  }`}
                >
                  <span>📱 9:16 (Story/TikTok)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio("1:1")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    aspectRatio === "1:1"
                      ? "bg-[#C6A96B]/25 border-[#C6A96B] text-[#F8F6F1] shadow-md shadow-[#C6A96B]/20"
                      : "bg-white/5 border-white/10 text-[#D9CDB7] hover:bg-white/10"
                  }`}
                >
                  <span>🖼️ 1:1 (Square/Feed)</span>
                </button>
              </div>
            </div>

            {/* Theme Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#D9CDB7] block">
                🎨 ธีมสีคอสมิก
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(THEME_CONFIGS) as CardTheme[]).map((tKey) => {
                  const tConf = THEME_CONFIGS[tKey];
                  return (
                    <button
                      key={tKey}
                      type="button"
                      onClick={() => setTheme(tKey)}
                      className={`p-2.5 rounded-xl border text-[11px] font-bold text-left transition-all flex items-center gap-2 ${
                        theme === tKey
                          ? "border-[#C6A96B] bg-[#C6A96B]/15 text-[#F8F6F1] shadow-md"
                          : "border-white/10 bg-white/5 text-[#D9CDB7] hover:bg-white/10"
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20"
                        style={{ backgroundColor: tConf.accentGold }}
                      />
                      <span className="truncate">{tConf.name.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-4 border-t border-white/10">
            
            {/* Download High-Res PNG */}
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isExporting}
              className="w-full py-3 px-4 rounded-xl font-display text-sm font-bold text-[#020617] bg-gradient-to-r from-[#C6A96B] via-[#E2C785] to-[#D9BC82] hover:brightness-110 active:scale-[0.98] shadow-lg shadow-[#C6A96B]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>💾 บันทึกรูปภาพ (Save High-Res PNG)</span>
            </button>

            {/* Native Share & Copy */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleNativeShare}
                className="py-2.5 px-3 rounded-xl border border-[#C6A96B]/40 bg-[#091838]/60 hover:bg-[#C6A96B]/15 text-[#F8F6F1] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>📲 แชร์ Story</span>
              </button>

              <button
                type="button"
                onClick={handleCopyImage}
                className="py-2.5 px-3 rounded-xl border border-[#C6A96B]/40 bg-[#091838]/60 hover:bg-[#C6A96B]/15 text-[#F8F6F1] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{copiedImage ? "✓ คัดลอกแล้ว!" : "📋 คัดลอกรูป"}</span>
              </button>
            </div>

            {/* Copy Caption */}
            <button
              type="button"
              onClick={handleCopyCaption}
              className="w-full py-2.5 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-[#D9CDB7] hover:text-[#F8F6F1] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{copiedCaption ? "✓ คัดลอกแคปชั่นและแฮชแท็กแล้ว!" : "📝 คัดลอกข้อความแคปชั่น & Hashtags"}</span>
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}
