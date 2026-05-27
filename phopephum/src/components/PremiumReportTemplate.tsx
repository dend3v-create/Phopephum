/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { forwardRef } from "react";

interface ReportData {
  name?: string;
  birthDate?: string;
  birthTime?: string;
  horaResult?: {
    dayNameThai?: string;
    dayRuler?: { nameThai: string; symbol: string; description: string };
    currentHora?: { majorSlot?: { rulerPlanet?: { nameThai: string; symbol: string } } };
  } | null;
}

interface PremiumReportTemplateProps {
  data?: ReportData;
}

// A4 at 96dpi = 794 × 1123px
const PremiumReportTemplate = forwardRef<HTMLDivElement, PremiumReportTemplateProps>(
  ({ data }, ref) => {
    const name = data?.name || "ผู้ขอรับการพยากรณ์";
    const birthDate = data?.birthDate
      ? new Date(data.birthDate).toLocaleDateString("th-TH", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "—";
    const dayRuler = data?.horaResult?.dayRuler?.nameThai || "พฤหัส";
    const daySymbol = data?.horaResult?.dayRuler?.symbol || "♃";
    const dayName = data?.horaResult?.dayNameThai || "พฤหัส";

    return (
      <div
        ref={ref}
        style={{
          width: "794px",
          minHeight: "1123px",
          background: "linear-gradient(180deg, #0B1C2E 0%, #10263F 60%, #0D1F35 100%)",
          fontFamily: "'Sarabun', 'Prompt', 'Kanit', sans-serif",
          color: "#F6F1E8",
          position: "relative",
          overflow: "hidden",
          padding: 0,
        }}
      >
        {/* Cosmic glow background */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "400px",
            background: "radial-gradient(ellipse, rgba(212,175,55,0.18) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "0",
            right: "-100px",
            width: "400px",
            height: "400px",
            background: "radial-gradient(ellipse, rgba(101,67,143,0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* ═══ HERO SECTION ═══ */}
        <div
          style={{
            padding: "36px 48px 28px",
            borderBottom: "1px solid rgba(212,175,55,0.25)",
            position: "relative",
          }}
        >
          {/* Top label */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "9px",
                letterSpacing: "3px",
                color: "#D4AF37",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              PREMIUM LIFE BLUEPRINT · PHOPEPHUM AI
            </div>
            <div
              style={{
                fontSize: "9px",
                color: "rgba(246,241,232,0.4)",
                letterSpacing: "1px",
              }}
            >
              {new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>

          {/* Main headline */}
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div
              style={{
                fontSize: "13px",
                color: "rgba(212,175,55,0.7)",
                letterSpacing: "4px",
                marginBottom: "6px",
                textTransform: "uppercase",
              }}
            >
              THE GREAT ASCENSION
            </div>
            <div
              style={{
                fontSize: "36px",
                fontWeight: 800,
                background: "linear-gradient(135deg, #D4AF37 0%, #F6E89A 50%, #B08D57 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                lineHeight: 1.1,
                letterSpacing: "-0.5px",
              }}
            >
              พฤหัสมหาอุจจ์ 2569
            </div>
            <div
              style={{
                fontSize: "15px",
                color: "rgba(246,241,232,0.8)",
                marginTop: "8px",
                fontWeight: 400,
              }}
            >
              จุดเปลี่ยนครั้งใหญ่ของชีวิต <strong style={{ color: "#D4AF37" }}>{name}</strong>
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "rgba(246,241,232,0.5)",
                marginTop: "4px",
                fontStyle: "italic",
              }}
            >
              "ดวงแห่งการสร้างฐานะ ผ่านทรัพย์สิน ระบบ และบารมีระยะยาว"
            </div>
          </div>

          {/* Divider line */}
          <div
            style={{
              width: "120px",
              height: "2px",
              background: "linear-gradient(90deg, transparent, #D4AF37, transparent)",
              margin: "16px auto 0",
            }}
          />
        </div>

        {/* ═══ BIRTH INFO BAR ═══ */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "40px",
            padding: "12px 48px",
            background: "rgba(212,175,55,0.06)",
            borderBottom: "1px solid rgba(212,175,55,0.15)",
          }}
        >
          {[
            { label: "วันเกิด", value: birthDate },
            { label: "วันในสัปดาห์", value: `วัน${dayName}` },
            { label: "ดาวเจ้าของวัน", value: `${daySymbol} ${dayRuler}` },
            { label: "เวลาเกิด", value: data?.birthTime || "—" },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "8px", color: "rgba(212,175,55,0.6)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "2px" }}>
                {item.label}
              </div>
              <div style={{ fontSize: "11px", color: "#F6F1E8", fontWeight: 600 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* ═══ MAIN CONTENT GRID ═══ */}
        <div style={{ padding: "24px 48px", display: "flex", flexDirection: "column", gap: "18px" }}>

          {/* ROW 1: สองคอลัมน์ */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

            {/* SECTION 1 — วัฏจักรพระเสาร์ */}
            <div style={sectionCard}>
              <SectionTitle icon="♄" title="วัฏจักรพระเสาร์ครอบดวง" />
              <div style={{ fontSize: "10px", color: "rgba(246,241,232,0.6)", marginBottom: "10px", fontStyle: "italic" }}>
                "ได้ช้า แต่ได้ของใหญ่"
              </div>
              {[
                { num: "7", label: "สหัชชะ", desc: "เครือข่ายเสริมพลัง" },
                { num: "7", label: "ลาภะ", desc: "โชคลาภเข้าหา" },
                { num: "7", label: "อัตตะ", desc: "ตัวตนแข็งแกร่ง" },
                { num: "7", label: "มัชฌิมา", desc: "ทางสายกลาง" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                  <div style={{
                    width: "20px", height: "20px", borderRadius: "50%",
                    background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "9px", fontWeight: 700, color: "#D4AF37", flexShrink: 0,
                  }}>{row.num}</div>
                  <div>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "#D4AF37" }}>{row.label}</span>
                    <span style={{ fontSize: "9px", color: "rgba(246,241,232,0.5)", marginLeft: "4px" }}>{row.desc}</span>
                  </div>
                </div>
              ))}
              <div style={miniInsight}>
                รับผิดชอบมากขึ้น · สร้างของตัวเอง · โฟกัสระยะยาว
              </div>
            </div>

            {/* SECTION 2 — กำลังโสฬส + บารมีทรัพย์ */}
            <div style={sectionCard}>
              <SectionTitle icon="✦" title="กำลังโสฬส(16) + บารมีทรัพย์" />
              <div style={{
                textAlign: "center",
                padding: "10px",
                background: "radial-gradient(circle, rgba(212,175,55,0.12), transparent 70%)",
                marginBottom: "8px",
              }}>
                <div style={{ fontSize: "28px", color: "#D4AF37" }}>♃</div>
                <div style={{ fontSize: "10px", color: "rgba(246,241,232,0.7)", fontStyle: "italic" }}>
                  "ดวงกำลังเปิดบารมีทรัพย์"
                </div>
              </div>
              {[
                { icon: "💰", label: "Wealth Expansion", items: "ขยายทรัพย์ · ซื้ออสังหา · เงินก้อน" },
                { icon: "⭐", label: "Influence", items: "คนเชื่อถือ · ผู้ใหญ่สนับสนุน" },
                { icon: "🏛️", label: "Legacy", items: "สร้างกิจการ · ต่อยอดระยะยาว" },
              ].map((col, i) => (
                <div key={i} style={{ display: "flex", gap: "6px", alignItems: "flex-start", marginBottom: "5px" }}>
                  <span style={{ fontSize: "10px" }}>{col.icon}</span>
                  <div>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#D4AF37" }}>{col.label}</div>
                    <div style={{ fontSize: "9px", color: "rgba(246,241,232,0.5)" }}>{col.items}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ROW 2: สามคอลัมน์ */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr", gap: "16px" }}>

            {/* SECTION 3 — Real Estate Destiny */}
            <div style={sectionCard}>
              <SectionTitle icon="🏢" title="ดวงอสังหาเด่นมาก" />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  padding: "8px 0",
                }}
              >
                {["พฤหัสมหาอุจจ์", "↓", "ขุมทรัพย์", "↓", "อสังหา", "↓", "ฐานะระยะยาว"].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: item === "↓" ? "12px" : "10px",
                      color: item === "↓" ? "rgba(212,175,55,0.5)" : i === 0 ? "#D4AF37" : i === 6 ? "#F6E89A" : "rgba(246,241,232,0.75)",
                      fontWeight: item === "↓" ? 400 : 600,
                      padding: item === "↓" ? "0" : "3px 10px",
                      background: item === "↓" ? "none" : "rgba(212,175,55,0.08)",
                      borderRadius: "3px",
                      border: item === "↓" ? "none" : "1px solid rgba(212,175,55,0.15)",
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: "9px", color: "rgba(246,241,232,0.5)", textAlign: "center", fontStyle: "italic" }}>
                "ไม่ใช่แค่ซื้อทรัพย์ แต่คือการสร้างฐานะ"
              </div>
            </div>

            {/* SECTION 4 — Career Transform */}
            <div style={sectionCard}>
              <SectionTitle icon="⚡" title="จาก 'ทำงาน' → สร้างระบบ" />
              {[
                "อสังหา · การลงทุน",
                "Branding · Consulting",
                "Leadership",
                "Education Content",
              ].map((item, i) => (
                <div key={i} style={{
                  fontSize: "9px",
                  padding: "3px 8px",
                  marginBottom: "4px",
                  background: "rgba(212,175,55,0.07)",
                  borderLeft: "2px solid rgba(212,175,55,0.5)",
                  color: "rgba(246,241,232,0.8)",
                  borderRadius: "0 3px 3px 0",
                }}>
                  {item}
                </div>
              ))}
              <div style={miniInsight}>
                "ได้เงินจากการสื่อสาร"
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
                {["Speak", "Strategy", "Influence", "Trust"].map((w, i) => (
                  <span key={i} style={{
                    fontSize: "8px", padding: "2px 6px",
                    border: "1px solid rgba(212,175,55,0.3)",
                    borderRadius: "10px", color: "rgba(212,175,55,0.8)",
                  }}>{w}</span>
                ))}
              </div>
            </div>

            {/* SECTION 5 — จุดระวัง */}
            <div style={{ ...sectionCard, background: "rgba(30,10,10,0.4)", borderColor: "rgba(200,100,100,0.2)" }}>
              <SectionTitle icon="⚠️" title="จุดระวัง" />
              {[
                { warn: "แบกทุกอย่างคนเดียว" },
                { warn: "ลงทุนเร็วเกินไป" },
                { warn: "คนเข้าหาเพราะผลประโยชน์" },
              ].map((w, i) => (
                <div key={i} style={{ display: "flex", gap: "5px", marginBottom: "5px", alignItems: "flex-start" }}>
                  <span style={{ color: "rgba(220,80,80,0.8)", fontSize: "9px", marginTop: "1px" }}>●</span>
                  <span style={{ fontSize: "9px", color: "rgba(246,241,232,0.65)" }}>{w.warn}</span>
                </div>
              ))}
              <div style={{ fontSize: "9px", color: "rgba(220,100,80,0.7)", fontStyle: "italic", marginTop: "4px", borderTop: "1px solid rgba(200,100,100,0.15)", paddingTop: "5px" }}>
                "ของใหญ่ได้… แต่ต้องค่อยสร้าง"
              </div>
            </div>
          </div>

          {/* ROW 3: TQM + Monthly */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "16px" }}>

            {/* TQM Weekly */}
            <div style={sectionCard}>
              <SectionTitle icon="⏱" title="TQM · Time Quality Management" />
              {[
                { day: "จันทร์–อังคาร", icon: "💰", focus: "เงิน / เจรจา / ปิดดีล" },
                { day: "พุธ–พฤหัส", icon: "⚙️", focus: "วางระบบ / ขยายธุรกิจ" },
                { day: "ศุกร์", icon: "📊", focus: "ตรวจระบบ / งานหนัก" },
                { day: "เสาร์", icon: "🌌", focus: "Vision / Branding" },
                { day: "อาทิตย์", icon: "🧘", focus: "Reset / Healing" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "5px" }}>
                  <div style={{ width: "56px", fontSize: "8px", color: "rgba(212,175,55,0.7)", flexShrink: 0 }}>{row.day}</div>
                  <span style={{ fontSize: "10px" }}>{row.icon}</span>
                  <span style={{ fontSize: "9px", color: "rgba(246,241,232,0.7)" }}>{row.focus}</span>
                </div>
              ))}
              <div style={miniInsight}>"ทำถูกเวลา ถูกคน ถูกจังหวะ"</div>
            </div>

            {/* Monthly Roadmap */}
            <div style={sectionCard}>
              <SectionTitle icon="🗓" title="Monthly Energy Roadmap 2569" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                {[
                  { m: "มิ.ย.", action: "สร้างเครือข่าย", color: "#4A9EDB" },
                  { m: "ก.ค.", action: "จัดฐานชีวิต", color: "#5BC4A0" },
                  { m: "ส.ค.", action: "เปิดโปรเจกต์ใหม่", color: "#D4AF37" },
                  { m: "ก.ย.", action: "เคลียร์ปัญหา", color: "#E07575" },
                  { m: "ต.ค.", action: "เจรจา–พาร์ตเนอร์", color: "#D4AF37" },
                  { m: "พ.ย.", action: "ชื่อเสียงขึ้นสูง", color: "#F6E89A" },
                  { m: "ธ.ค.", action: "เก็บเกี่ยวทรัพย์", color: "#D4AF37" },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <div style={{
                      width: "26px", height: "26px", borderRadius: "4px",
                      background: row.color + "22",
                      border: `1px solid ${row.color}55`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "8px", fontWeight: 700, color: row.color, flexShrink: 0,
                    }}>
                      {row.m}
                    </div>
                    <span style={{ fontSize: "9px", color: "rgba(246,241,232,0.7)" }}>{row.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ FINAL LEGACY MESSAGE ═══ */}
          <div
            style={{
              padding: "20px 32px",
              background: "linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(101,67,143,0.1) 100%)",
              borderRadius: "8px",
              border: "1px solid rgba(212,175,55,0.25)",
              textAlign: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.1), transparent 70%)",
                borderRadius: "8px",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: "#F6E89A",
                lineHeight: 1.4,
                marginBottom: "8px",
              }}
            >
              "ดวงนี้ไม่ได้เกิดมาเพื่อสำเร็จเร็วแล้วหายไป"
            </div>
            <div style={{ fontSize: "11px", color: "rgba(246,241,232,0.65)", marginBottom: "12px" }}>
              แต่เกิดมาเพื่อสร้างบางสิ่งที่มั่นคง และมีคุณค่าต่อผู้คนในระยะยาว
            </div>
            <div
              style={{
                display: "inline-block",
                padding: "8px 24px",
                background: "rgba(212,175,55,0.15)",
                border: "1px solid rgba(212,175,55,0.4)",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#D4AF37",
                fontStyle: "italic",
                marginBottom: "12px",
              }}
            >
              "ฉันกำลังสร้างชีวิตที่มั่นคง งดงาม และมีคุณค่าระยะยาว ✨"
            </div>
            <div style={{ fontSize: "9px", color: "rgba(246,241,232,0.35)", marginTop: "4px" }}>
              โดย ครูเด่น มาสเตอร์ฟา · PHOPEPHUM AI · {new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>

          {/* BUILD YOUR LEGACY CTA */}
          <div style={{ display: "flex", justifyContent: "center", paddingTop: "4px", paddingBottom: "8px" }}>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "4px",
                color: "rgba(212,175,55,0.5)",
                textTransform: "uppercase",
              }}
            >
              BUILD YOUR LEGACY · PHOPEPHUM.COM
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PremiumReportTemplate.displayName = "PremiumReportTemplate";
export default PremiumReportTemplate;

// ─── Sub components ──────────────────────────────────────────────────────────

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
      <span style={{ fontSize: "11px" }}>{icon}</span>
      <span style={{ fontSize: "10px", fontWeight: 700, color: "#D4AF37", letterSpacing: "0.5px" }}>{title}</span>
    </div>
  );
}

const sectionCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(212,175,55,0.18)",
  borderRadius: "6px",
  padding: "14px",
};

const miniInsight: React.CSSProperties = {
  marginTop: "8px",
  padding: "5px 8px",
  background: "rgba(212,175,55,0.07)",
  borderRadius: "4px",
  fontSize: "9px",
  color: "rgba(212,175,55,0.8)",
  fontStyle: "italic",
  textAlign: "center",
};
