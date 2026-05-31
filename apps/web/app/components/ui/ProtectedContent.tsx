/**
 * ProtectedContent.tsx
 * ระบบป้องกันการแคปหน้าจอและคัดลอกเนื้อหา 3 ชั้น:
 *
 * Layer 1 — CSS Protection
 *   - user-select: none  (ป้องกัน copy/paste)
 *   - -webkit-touch-callout: none  (ป้องกัน long-press บน iOS)
 *   - onContextMenu block  (ป้องกัน right-click)
 *   - ondragstart/onselectstart block
 *
 * Layer 2 — Personal Watermark
 *   - diagonal grid แสดงชื่อ + email ของ user
 *   - pointer-events: none (watermark ไม่บัง interaction)
 *   - ลาย grid เปลี่ยนตาม user → ระบุตัวตนได้ถ้าถูกแคปไป
 *
 * Layer 3 — Screen Capture Detection
 *   - ตรวจจับ getDisplayMedia API (Chrome/Edge/Firefox)
 *   - เมื่อ screen share เริ่ม → blur + warning overlay
 *   - เมื่อ screen share จบ → กลับสู่ปกติ
 */

import { useEffect, useRef, useState, useCallback } from "react";

interface ProtectedContentProps {
  children: React.ReactNode;
  /** ชื่อ/email ของผู้ใช้สำหรับ watermark */
  userLabel?: string;
  /** ปิด watermark ชั่วคราว (เช่น หน้า settings) */
  noWatermark?: boolean;
  /** CSS class เพิ่มเติม */
  className?: string;
}

export function ProtectedContent({
  children,
  userLabel = "",
  noWatermark = false,
  className = "",
}: ProtectedContentProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ─── Layer 2: Generate watermark canvas ──────────────────────────────────
  useEffect(() => {
    if (noWatermark || !userLabel) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ขนาด tile ของ watermark
    const tileW = 280;
    const tileH = 120;
    canvas.width = tileW;
    canvas.height = tileH;

    ctx.clearRect(0, 0, tileW, tileH);
    ctx.save();

    // หมุน -25 องศา
    ctx.translate(tileW / 2, tileH / 2);
    ctx.rotate(-25 * (Math.PI / 180));
    ctx.translate(-tileW / 2, -tileH / 2);

    ctx.fillStyle = "rgba(217, 188, 130, 0.055)";
    ctx.font = "bold 11px 'IBM Plex Sans Thai', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // บรรทัดที่ 1: ชื่อ/email
    ctx.fillText(userLabel, tileW / 2, tileH / 2 - 8);

    // บรรทัดที่ 2: ชื่อแอป
    ctx.fillStyle = "rgba(217, 188, 130, 0.04)";
    ctx.font = "9px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("© PhopePhum — สมาชิกเท่านั้น", tileW / 2, tileH / 2 + 10);

    ctx.restore();
  }, [userLabel, noWatermark]);

  // ─── Layer 3: Screen Capture Detection ──────────────────────────────────
  const handleCaptureEnd = useCallback(() => {
    setIsCapturing(false);
    setDismissed(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Patch getDisplayMedia เพื่อตรวจจับ screen capture
    const nav = navigator as any;
    if (!nav.mediaDevices?.getDisplayMedia) return;

    const originalGetDisplayMedia =
      nav.mediaDevices.getDisplayMedia.bind(nav.mediaDevices);

    nav.mediaDevices.getDisplayMedia = async (
      constraints?: DisplayMediaStreamOptions
    ) => {
      try {
        const stream: MediaStream = await originalGetDisplayMedia(constraints);
        streamRef.current = stream;
        setIsCapturing(true);
        setDismissed(false);

        // ฟังเมื่อ track จบ (user หยุด share)
        stream.getTracks().forEach((track) => {
          track.addEventListener("ended", handleCaptureEnd);
        });

        return stream;
      } catch (err) {
        throw err;
      }
    };

    return () => {
      // Restore original
      nav.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [handleCaptureEnd]);

  // ─── Layer 1: CSS Protection handlers ───────────────────────────────────
  const preventEvent = (e: React.SyntheticEvent) => e.preventDefault();

  const watermarkDataUrl = useCallback(() => {
    return canvasRef.current?.toDataURL() ?? "";
  }, []);

  return (
    <div
      className={`relative ${className}`}
      onContextMenu={preventEvent}
      onDragStart={preventEvent}
      onCopy={preventEvent}
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none" as any,
      }}
    >
      {/* Hidden canvas for watermark tile generation */}
      <canvas ref={canvasRef} className="hidden" aria-hidden />

      {/* Layer 2: Watermark overlay */}
      {!noWatermark && userLabel && (
        <WatermarkOverlay canvasRef={canvasRef} />
      )}

      {/* Layer 3: Screen capture warning overlay */}
      {isCapturing && !dismissed && (
        <ScreenCaptureWarning
          onDismiss={() => setDismissed(true)}
          onStop={handleCaptureEnd}
        />
      )}

      {/* Content — blurred during capture */}
      <div
        style={{
          filter: isCapturing && !dismissed ? "blur(12px)" : "none",
          transition: "filter 0.3s ease",
          pointerEvents: isCapturing && !dismissed ? "none" : "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Watermark Overlay ────────────────────────────────────────────────────────

function WatermarkOverlay({
  canvasRef,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    // รอให้ canvas render เสร็จก่อน
    const timer = setTimeout(() => {
      if (canvasRef.current) {
        setDataUrl(canvasRef.current.toDataURL());
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [canvasRef]);

  if (!dataUrl) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 10,
        backgroundImage: `url(${dataUrl})`,
        backgroundRepeat: "repeat",
        backgroundSize: "280px 120px",
      }}
    />
  );
}

// ─── Screen Capture Warning ───────────────────────────────────────────────────

function ScreenCaptureWarning({
  onDismiss,
  onStop,
}: {
  onDismiss: () => void;
  onStop: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(2, 6, 23, 0.92)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "90%",
          background: "rgba(15, 23, 42, 0.95)",
          border: "1px solid rgba(198,169,107,0.35)",
          borderRadius: 24,
          padding: "36px 32px",
          textAlign: "center",
          boxShadow: "0 0 60px rgba(198,169,107,0.12)",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(248,113,113,0.12)",
            border: "1px solid rgba(248,113,113,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 28,
          }}
        >
          🔒
        </div>

        <h3
          style={{
            color: "#F8F6F1",
            fontSize: 18,
            fontWeight: "bold",
            marginBottom: 8,
            fontFamily: "Cinzel, serif",
          }}
        >
          ตรวจพบการบันทึกหน้าจอ
        </h3>

        <p style={{ color: "#94A3B8", fontSize: 13, lineHeight: 1.7, marginBottom: 8 }}>
          เนื้อหานี้เป็น<strong style={{ color: "#F8F6F1" }}>ลิขสิทธิ์เฉพาะสมาชิก</strong>
          <br />
          ห้ามบันทึก แคปเจอร์ หรือเผยแพร่โดยไม่ได้รับอนุญาต
        </p>

        <p style={{ color: "#C6A96B", fontSize: 11, marginBottom: 28, opacity: 0.8 }}>
          การละเมิดอาจส่งผลให้ระงับบัญชีสมาชิก
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={onStop}
            style={{
              background: "linear-gradient(135deg, #C6A96B, #D9BC82)",
              color: "#020617",
              border: "none",
              borderRadius: 12,
              padding: "10px 24px",
              fontSize: 13,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            หยุดบันทึก
          </button>
          <button
            onClick={onDismiss}
            style={{
              background: "transparent",
              color: "#94A3B8",
              border: "1px solid rgba(148,163,184,0.2)",
              borderRadius: 12,
              padding: "10px 24px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </div>
  );
}
