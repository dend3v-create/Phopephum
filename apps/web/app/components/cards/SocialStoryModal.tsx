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
    textPrimary: "#F8F6F1",
    textSecondary: "#D9CDB7",
    borderGlow: "rgba(198, 169, 107, 0.4)",
    cardBg: "rgba(10, 24, 48, 0.65)",
    badgeBg: "rgba(198, 169, 107, 0.15)",
  },
  "mystic-indigo": {
    name: "ครามเนบิวลา (Mystic Indigo)",
    bgGradStart: "#050B14",
    bgGradMid: "#101D38",
    bgGradEnd: "#080E1C",
    accentGold: "#7EB6FF",
    textPrimary: "#FFFFFF",
    textSecondary: "#B4CEF8",
    borderGlow: "rgba(126, 182, 255, 0.4)",
    cardBg: "rgba(16, 29, 56, 0.7)",
    badgeBg: "rgba(126, 182, 255, 0.15)",
  },
  "ruby-sunset": {
    name: "ทับทิมสุริยัน (Ruby Sunset)",
    bgGradStart: "#130509",
    bgGradMid: "#260C14",
    bgGradEnd: "#0D0407",
    accentGold: "#FF9E79",
    textPrimary: "#FFF5F2",
    textSecondary: "#E2B8AB",
    borderGlow: "rgba(255, 158, 121, 0.4)",
    cardBg: "rgba(38, 12, 20, 0.7)",
    badgeBg: "rgba(255, 158, 121, 0.15)",
  },
  "emerald-prosperity": {
    name: "มรกตมหาลาภ (Emerald Wealth)",
    bgGradStart: "#030F0B",
    bgGradMid: "#0A241A",
    bgGradEnd: "#04140E",
    accentGold: "#5DE2A5",
    textPrimary: "#F0FDF4",
    textSecondary: "#A7F3D0",
    borderGlow: "rgba(93, 226, 165, 0.4)",
    cardBg: "rgba(10, 36, 26, 0.7)",
    badgeBg: "rgba(93, 226, 165, 0.15)",
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

    // Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, activeTheme.bgGradStart);
    bgGrad.addColorStop(0.5, activeTheme.bgGradMid);
    bgGrad.addColorStop(1, activeTheme.bgGradEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Decorative Stars & Nebula Glow
    const radialGlow = ctx.createRadialGradient(width / 2, height * 0.25, 50, width / 2, height * 0.25, 450);
    radialGlow.addColorStop(0, activeTheme.borderGlow.replace("0.4", "0.25"));
    radialGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = radialGlow;
    ctx.fillRect(0, 0, width, height);

    // Frame Border
    ctx.strokeStyle = activeTheme.accentGold;
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // Inner subtle border
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(55, 55, width - 110, height - 110);

    // Corner Star Accents
    ctx.fillStyle = activeTheme.accentGold;
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✦", 70, 75);
    ctx.fillText("✦", width - 70, 75);
    ctx.fillText("✦", 70, height - 60);
    ctx.fillText("✦", width - 70, height - 60);

    // ── Header: Brand Logo & Title ──
    ctx.fillStyle = activeTheme.accentGold;
    ctx.font = "bold 28px Cinzel, serif";
    ctx.textAlign = "center";
    ctx.fillText("P H O P E P H U M", width / 2, 130);

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "16px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("WISDOM GUIDANCE OS · LIVING ASTROLOGY", width / 2, 160);

    // Date & Lunar Banner
    const dateY = 220;
    ctx.fillStyle = activeTheme.cardBg;
    ctx.fillRect(100, dateY - 35, width - 200, 60);
    ctx.strokeStyle = activeTheme.accentGold;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(100, dateY - 35, width - 200, 60);

    ctx.fillStyle = activeTheme.textPrimary;
    ctx.font = "bold 26px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText(data.dateStr + (data.lunarStr ? ` (${data.lunarStr})` : ""), width / 2, dateY + 5);

    // Main Card Box
    const cardTop = aspectRatio === "9:16" ? 330 : 300;
    const cardHeight = aspectRatio === "9:16" ? 920 : 540;

    ctx.fillStyle = activeTheme.cardBg;
    ctx.fillRect(90, cardTop, width - 180, cardHeight);
    ctx.strokeStyle = activeTheme.borderGlow;
    ctx.lineWidth = 2;
    ctx.strokeRect(90, cardTop, width - 180, cardHeight);

    // Energy Score Circle / Badge
    const scoreY = cardTop + 90;
    ctx.fillStyle = activeTheme.accentGold;
    ctx.font = "bold 18px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("✦ ดัชนีพลังงาน & ฤกษ์มงคลประจำวัน ✦", width / 2, scoreY - 35);

    ctx.fillStyle = activeTheme.textPrimary;
    ctx.font = "bold 64px Cinzel, serif";
    ctx.fillText(`${data.energyScore || 95}`, width / 2, scoreY + 30);

    ctx.fillStyle = activeTheme.accentGold;
    ctx.font = "bold 20px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("/ 100", width / 2 + 75, scoreY + 25);

    // Auspicious Time Highlight
    if (data.yamName) {
      const yamY = scoreY + 95;
      ctx.fillStyle = activeTheme.badgeBg;
      ctx.fillRect(160, yamY - 28, width - 320, 50);
      ctx.strokeStyle = activeTheme.accentGold;
      ctx.lineWidth = 1;
      ctx.strokeRect(160, yamY - 28, width - 320, 50);

      ctx.fillStyle = activeTheme.textPrimary;
      ctx.font = "bold 22px 'IBM Plex Sans Thai', sans-serif";
      ctx.fillText(`ยามมงคล: ${data.yamName} (${data.yamPeriod || "กลางวัน"}) ${data.auspiciousTime ? "· " + data.auspiciousTime : ""}`, width / 2, yamY + 5);
    }

    // Wisdom Quote Section
    const quoteY = scoreY + 200;
    ctx.fillStyle = activeTheme.accentGold;
    ctx.font = "bold 24px 'Cinzel', serif";
    ctx.fillText(`“ ${data.wisdomTitle || "ปัญญาชีวิตนำทาง"} ”`, width / 2, quoteY);

    ctx.fillStyle = activeTheme.textSecondary;
    ctx.font = "italic 22px 'IBM Plex Sans Thai', sans-serif";
    const quoteText = data.wisdomQuote || "ตั้งมั่นในสติ รักษาความบริสุทธิ์ของใจ จังหวะชีวิตจะเปิดรับโชคลาภและความสำเร็จอย่างราบรื่น";
    
    // Wrap quote text into lines
    wrapText(ctx, `"${quoteText}"`, width / 2, quoteY + 45, width - 260, 36);

    // ── Do & Avoid List (Only on 9:16 format) ──
    if (aspectRatio === "9:16") {
      const doAvoidY = cardTop + 540;

      // Do Box
      ctx.fillStyle = "rgba(34, 197, 94, 0.12)";
      ctx.fillRect(130, doAvoidY, (width - 300) / 2, 280);
      ctx.strokeStyle = "rgba(34, 197, 94, 0.4)";
      ctx.strokeRect(130, doAvoidY, (width - 300) / 2, 280);

      ctx.fillStyle = "#4ADE80";
      ctx.font = "bold 22px 'IBM Plex Sans Thai', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("✓ สิ่งที่ควรทำ", 155, doAvoidY + 40);

      ctx.fillStyle = activeTheme.textPrimary;
      ctx.font = "18px 'IBM Plex Sans Thai', sans-serif";
      const dos = data.doList?.slice(0, 3) || ["เจรจาติดต่อสิ่งสำคัญ", "สร้างสรรค์ผลงานใหม่", "มีสติในการใช้จ่าย"];
      dos.forEach((item, idx) => {
        ctx.fillText(`• ${item}`, 155, doAvoidY + 90 + idx * 48);
      });

      // Avoid Box
      const avoidX = 130 + (width - 300) / 2 + 40;
      ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
      ctx.fillRect(avoidX, doAvoidY, (width - 300) / 2, 280);
      ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
      ctx.strokeRect(avoidX, doAvoidY, (width - 300) / 2, 280);

      ctx.fillStyle = "#F87171";
      ctx.font = "bold 22px 'IBM Plex Sans Thai', sans-serif";
      ctx.fillText("✕ สิ่งที่ควรเลี่ยง", avoidX + 25, doAvoidY + 40);

      ctx.fillStyle = activeTheme.textPrimary;
      ctx.font = "18px 'IBM Plex Sans Thai', sans-serif";
      const avoids = data.avoidList?.slice(0, 3) || ["การตัดสินใจด้วยอารมณ์", "การโต้เถียงในที่สาธารณะ", "การลงนามเอกสารเร่งรีบ"];
      avoids.forEach((item, idx) => {
        ctx.fillText(`• ${item}`, avoidX + 25, doAvoidY + 90 + idx * 48);
      });
    }

    // ── Footer: Imperial Seal & Creator attribution ──
    const footerY = height - 140;
    ctx.textAlign = "center";
    ctx.fillStyle = activeTheme.accentGold;
    ctx.font = "bold 20px 'Cinzel', serif";
    ctx.fillText("✦ P H O P E P H U M · C E L E S T I A L ✦", width / 2, footerY);

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "16px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText(`วิเคราะห์ดวงชะตาเฉพาะตนสำหรับ: ${data.userName || "สมาชิกภพภูมิ"} | phopephum.com`, width / 2, footerY + 35);
  };

  // Helper function to wrap text
  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(" ");
    let line = "";
    let testY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, testY);
        line = words[n] + " ";
        testY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, testY);
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

  // Copy Image to Clipboard (for Instagram / LINE / Facebook)
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
      // Fallback: download image
      handleDownloadImage();
    }
  };

  // Native Mobile Web Share (IG Stories / TikTok / LINE)
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
      `⚡ ดัชนีพลังงาน: ${data.energyScore || 95}/100\n` +
      `⏱️ ยามมงคล: ${data.yamName || "ยามอัฏฐกาล"} (${data.yamPeriod || "กลางวัน"})\n\n` +
      `🕊️ ปัญญาชีวิตวันนี้:\n"${data.wisdomQuote || "ตั้งมั่นในสติ รักษาความบริสุทธิ์ของใจ จังหวะชีวิตจะเปิดรับโชคลาภและความสำเร็จอย่างราบรื่น"}"\n\n` +
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
              className="w-full py-3 px-4 rounded-xl font-display text-sm font-bold text-[#020617] bg-gradient-to-r from-[#C6A96B] via-[#E2C785] to-[#D9BC82] hover:brightness-110 active:scale-[0.98] shadow-lg shadow-[#C6A96B]/25 transition-all flex items-center justify-center gap-2"
            >
              <span>💾 บันทึกรูปภาพ (Save High-Res PNG)</span>
            </button>

            {/* Native Share & Copy */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleNativeShare}
                className="py-2.5 px-3 rounded-xl border border-[#C6A96B]/40 bg-[#091838]/60 hover:bg-[#C6A96B]/15 text-[#F8F6F1] text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <span>📲 แชร์ Story</span>
              </button>

              <button
                type="button"
                onClick={handleCopyImage}
                className="py-2.5 px-3 rounded-xl border border-[#C6A96B]/40 bg-[#091838]/60 hover:bg-[#C6A96B]/15 text-[#F8F6F1] text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <span>{copiedImage ? "✓ คัดลอกแล้ว!" : "📋 คัดลอกรูป"}</span>
              </button>
            </div>

            {/* Copy Caption */}
            <button
              type="button"
              onClick={handleCopyCaption}
              className="w-full py-2.5 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-[#D9CDB7] hover:text-[#F8F6F1] text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <span>{copiedCaption ? "✓ คัดลอกแคปชั่นและแฮชแท็กแล้ว!" : "📝 คัดลอกข้อความแคปชั่น & Hashtags"}</span>
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}
