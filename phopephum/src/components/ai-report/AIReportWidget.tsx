"use client";

import React, { useState, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BirthData {
  name: string;
  birthDate: string;     // "YYYY-MM-DD"
  birthTime: string;     // "HH:MM"
  birthPlace: string;
  gender: string;
  /** ผลดวงเลข 7 ตัว (optional) */
  numerologyData?: Record<string, unknown>;
  /** ยามอัฐกาลวันนี้ (optional) */
  horaData?: Record<string, unknown>;
}

export interface AIReportWidgetProps {
  birthData: BirthData;
  /** subscription tier */
  tier: "free" | "pro" | "premium";
  /** จำนวน reports ที่เหลือ (-1 = ไม่จำกัด) */
  remainingReports: number;
}

type ReportStatus = "idle" | "loading" | "streaming" | "done" | "error";

// ─── Component ────────────────────────────────────────────────────────────────

export function AIReportWidget({
  birthData,
  tier,
  remainingReports,
}: AIReportWidgetProps) {
  const [status, setStatus] = useState<ReportStatus>("idle");
  const [reportText, setReportText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<TopicId>("overall");
  const reportRef = useRef<HTMLDivElement>(null);

  const canGenerate =
    remainingReports === -1 || remainingReports > 0;

  // ─── Generate Report ───
  async function handleGenerate() {
    if (!canGenerate) return;
    
    setStatus("loading");
    setReportText("");
    setErrorMsg("");

    try {
      // เรียก API Route (Next.js) → CF Worker → Claude
      const res = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthData,
          topic: selectedTopic,
          tier,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      // Streaming response
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      setStatus("streaming");
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE format: "data: {...}\n\n"
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const text = parsed.delta?.text ?? parsed.text ?? "";
              if (text) {
                setReportText((prev) => prev + text);
                // Auto scroll
                requestAnimationFrame(() => {
                  reportRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
                });
              }
            } catch {
              // Non-JSON chunk (plain text streaming)
              if (data && data !== "[DONE]") {
                setReportText((prev) => prev + data);
              }
            }
          }
        }
      }

      setStatus("done");
    } catch (err) {
      console.error("[AIReport] Error:", err);
      setErrorMsg(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดไม่ทราบสาเหตุ"
      );
      setStatus("error");
    }
  }

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <span style={{ fontSize: "20px" }}>✦</span>
        <div>
          <h3 style={{
            margin: 0,
            fontSize: "15px",
            fontWeight: 700,
            color: "#C9A96E",
            fontFamily: "'Playfair Display', serif",
          }}>
            WISDOM ASSISTANT
          </h3>
          <p style={{ margin: 0, fontSize: "11px", color: "#8B7E6E" }}>
            รายงานวิเคราะห์ชะตาชีวิต
          </p>
        </div>
        {remainingReports > 0 && remainingReports !== -1 && (
          <span style={badgeStyle}>
            เหลือ {remainingReports} รายงาน
          </span>
        )}
        {remainingReports === -1 && (
          <span style={{ ...badgeStyle, background: "rgba(201,169,110,0.15)" }}>
            ∞ ไม่จำกัด
          </span>
        )}
      </div>

      {/* Topic Selector */}
      <TopicSelector
        selected={selectedTopic}
        onChange={setSelectedTopic}
        disabled={status === "loading" || status === "streaming"}
      />

      {/* Generate Button */}
      {status === "idle" || status === "error" ? (
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "8px",
            background: canGenerate
              ? "linear-gradient(135deg, #C9A96E 0%, #E8D5A3 100%)"
              : "#333",
            color: canGenerate ? "#0A0806" : "#666",
            fontWeight: 700,
            fontSize: "14px",
            border: "none",
            cursor: canGenerate ? "pointer" : "not-allowed",
            marginTop: "12px",
            letterSpacing: "0.05em",
          }}
        >
          {!canGenerate
            ? "🔒 อัปเกรดเพื่อใช้งาน"
            : "≡ วิเคราะห์ดวงชะตา"}
        </button>
      ) : null}

      {/* Loading Shimmer */}
      {status === "loading" && (
        <div style={{ marginTop: "16px" }}>
          <LoadingShimmer />
        </div>
      )}

      {/* Error State */}
      {status === "error" && (
        <div style={errorStyle}>
          <span>⚠️ {errorMsg}</span>
          <button
            onClick={handleGenerate}
            style={{
              marginTop: "8px",
              background: "transparent",
              border: "1px solid #EF4444",
              color: "#EF4444",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            ลองใหม่
          </button>
        </div>
      )}

      {/* Report Output */}
      {(status === "streaming" || status === "done") && reportText && (
        <div style={reportStyle}>
          <div
            ref={reportRef}
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.8,
              color: "#F5F0E8",
              fontSize: "14px",
            }}
          >
            {reportText}
            {status === "streaming" && (
              <span style={cursorStyle}>▋</span>
            )}
          </div>
        </div>
      )}

      {/* Done Actions */}
      {status === "done" && (
        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
          <button
            onClick={handleGenerate}
            style={outlineBtnStyle}
          >
            🔄 วิเคราะห์ใหม่
          </button>
          {/* PDF Export trigger — เชื่อมกับ Module 04 */}
          <button
            onClick={() => {
              // ส่ง reportText ไปที่ PDF module
              if (typeof window !== "undefined") {
                (window as any).__horaReportText = reportText;
                (window as any).__horaTriggerPDF?.();
              }
            }}
            style={{
              ...outlineBtnStyle,
              color: "#C9A96E",
              borderColor: "rgba(201,169,110,0.4)",
            }}
          >
            📄 ดาวน์โหลด PDF
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Topic Selector ───────────────────────────────────────────────────────────

type TopicId =
  | "overall"
  | "career"
  | "love"
  | "health"
  | "wealth"
  | "lucky-hour";

const TOPICS: { id: TopicId; label: string; icon: string }[] = [
  { id: "overall",    label: "ภาพรวม",     icon: "🌟" },
  { id: "career",     label: "การงาน",     icon: "💼" },
  { id: "love",       label: "ความรัก",   icon: "💛" },
  { id: "health",     label: "สุขภาพ",    icon: "🌿" },
  { id: "wealth",     label: "การเงิน",   icon: "💰" },
  { id: "lucky-hour", label: "ฤกษ์มงคล", icon: "⏰" },
];

function TopicSelector({
  selected,
  onChange,
  disabled,
}: {
  selected: TopicId;
  onChange: (id: TopicId) => void;
  disabled: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "6px",
        flexWrap: "wrap",
        marginBottom: "4px",
      }}
    >
      {TOPICS.map((t) => (
        <button
          key={t.id}
          onClick={() => !disabled && onChange(t.id)}
          disabled={disabled}
          style={{
            padding: "6px 10px",
            borderRadius: "20px",
            border: `1px solid ${selected === t.id ? "#C9A96E" : "rgba(201,169,110,0.2)"}`,
            background: selected === t.id
              ? "rgba(201,169,110,0.15)"
              : "transparent",
            color: selected === t.id ? "#C9A96E" : "#8B7E6E",
            fontSize: "11px",
            cursor: disabled ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Loading Shimmer ──────────────────────────────────────────────────────────

function LoadingShimmer() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {[80, 60, 90, 50, 70].map((w, i) => (
        <div
          key={i}
          style={{
            height: "14px",
            width: `${w}%`,
            borderRadius: "4px",
            background: "linear-gradient(90deg, rgba(201,169,110,0.08) 25%, rgba(201,169,110,0.15) 50%, rgba(201,169,110,0.08) 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
          }}
        />
      ))}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

// ─── Inline styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  backgroundColor: "#12100E",
  border: "1px solid rgba(201,169,110,0.15)",
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "12px",
};

const badgeStyle: React.CSSProperties = {
  marginLeft: "auto",
  padding: "3px 8px",
  borderRadius: "20px",
  background: "rgba(16,185,129,0.12)",
  color: "#10B981",
  fontSize: "10px",
  border: "1px solid rgba(16,185,129,0.25)",
};

const errorStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  marginTop: "12px",
  padding: "12px",
  borderRadius: "8px",
  background: "rgba(239,68,68,0.08)",
  border: "1px solid rgba(239,68,68,0.25)",
  color: "#EF4444",
  fontSize: "13px",
};

const reportStyle: React.CSSProperties = {
  marginTop: "16px",
  padding: "16px",
  borderRadius: "8px",
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(201,169,110,0.1)",
  maxHeight: "400px",
  overflowY: "auto",
  WebkitOverflowScrolling: "touch" as any,
};

const cursorStyle: React.CSSProperties = {
  display: "inline-block",
  color: "#C9A96E",
  animation: "blink 1s step-end infinite",
};

const outlineBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: "10px",
  borderRadius: "8px",
  background: "transparent",
  border: "1px solid rgba(201,169,110,0.25)",
  color: "#8B7E6E",
  fontSize: "12px",
  cursor: "pointer",
};
