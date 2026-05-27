/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { forwardRef } from "react";

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

// ─── Colour tokens (inline-safe for html2canvas) ───────────────────────────
const C = {
  bg:        "#09111F",
  card:      "rgba(255,255,255,0.035)",
  cardHover: "rgba(255,255,255,0.06)",
  border:    "rgba(255,255,255,0.07)",
  gold:      "#C9A96E",
  goldBright:"#F5D78E",
  goldDim:   "rgba(201,169,110,0.55)",
  goldBg:    "rgba(201,169,110,0.08)",
  goldBorder:"rgba(201,169,110,0.25)",
  text:      "#F8F6F1",
  muted:     "rgba(248,246,241,0.55)",
  faint:     "rgba(248,246,241,0.28)",
  red:       "#F87171",
  redBg:     "rgba(239,68,68,0.08)",
  redBorder: "rgba(239,68,68,0.2)",
  heroBar:   "linear-gradient(135deg,#1A2E1A 0%,#1F3320 50%,#0D1F0D 100%)",
  infoBar:   "rgba(255,255,255,0.025)",
};

// ─── Tiny helpers ──────────────────────────────────────────────────────────
const thaiYear = (iso?: string) => {
  if (!iso) return "—";
  const y = new Date(iso).getFullYear();
  return String(y + 543);
};

const thaiDate = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric", month: "long", year: "numeric",
  });
};

const dayOfWeek = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("th-TH", { weekday: "long" });
};

const planetOfDay = (iso?: string) => {
  if (!iso) return "—";
  const planets = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์","เสาร์"];
  const symbols = ["☀","☽","♂","☿","♃","♀","♄"];
  const d = new Date(iso).getDay(); // 0=Sun
  return `${symbols[d]} ${planets[d]}`;
};

// ─── Main Component ────────────────────────────────────────────────────────
const PremiumReportTemplate = forwardRef<HTMLDivElement, PremiumReportTemplateProps>(
  ({ data }, ref) => {
    const name       = data?.name    || "ผู้ขอรับการพยากรณ์";
    const content    = data?.content || {};
    const horaResult = data?.horaResult;
    const birthDate  = data?.birthDate;
    const birthTime  = data?.birthTime || "—";

    // ─── Extract / fallback content fields ──────────────────────────────
    const identity   = content.identity?.attha    || content.identity || content.career || "กำลังประมวลผล...";
    const charm      = content.charm?.overview    || content.charm    || "กำลังประมวลผล...";
    const career     = content.career             || "กำลังประมวลผล...";
    const finance    = content.finance            || "กำลังประมวลผล...";
    const golden     = content.goldenHourExecution|| content.love     || "กำลังประมวลผล...";
    const karmic     = content.karmicBlueprint    || content.health   || "กำลังประมวลผล...";
    const summary    = content.summaryAffirmation || content.summary  || `${name} กำลังสร้างชีวิตที่มั่นคง งดงาม และมีคุณค่าระยะยาว`;

    // ─── Hora planet label for hero ─────────────────────────────────────
    const heroPlanet = horaResult?.planet || horaResult?.dayPlanet || planetOfDay(birthDate);
    const heroYear   = thaiYear(birthDate);
    const heroTitle  = `${heroPlanet}มหาอุจจ์ ${heroYear}`;

    const todayTh = new Date().toLocaleDateString("th-TH", { day:"numeric", month:"long", year:"numeric" });

    // ─── Section card style ──────────────────────────────────────────────
    const card = (extra?: React.CSSProperties): React.CSSProperties => ({
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 20,
      padding: "18px 20px",
      ...extra,
    });

    const label = (extra?: React.CSSProperties): React.CSSProperties => ({
      fontSize: 9,
      fontWeight: 700,
      color: C.gold,
      textTransform: "uppercase" as const,
      letterSpacing: "0.28em",
      marginBottom: 8,
      ...extra,
    });

    const body = (extra?: React.CSSProperties): React.CSSProperties => ({
      fontSize: 10,
      color: C.muted,
      lineHeight: 1.7,
      ...extra,
    });

    return (
      <div
        ref={ref}
        style={{
          width: 794,
          height: 1123,
          overflow: "hidden",
          background: C.bg,
          color: C.text,
          fontFamily: "'Sarabun','Prompt','Segoe UI',sans-serif",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Ambient glow ── */}
        <div style={{ position:"absolute", top:-60, right:-60, width:320, height:320, borderRadius:"50%", background:"radial-gradient(circle,rgba(201,169,110,0.09) 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:0, left:-40, width:260, height:260, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,0.05) 0%,transparent 70%)", pointerEvents:"none" }} />

        {/* ══════════════════ HEADER BAR ══════════════════ */}
        <div style={{ padding:"14px 36px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <span style={{ fontSize:9, fontWeight:700, color:C.gold, letterSpacing:"0.35em", textTransform:"uppercase" }}>
            PREMIUM LIFE BLUEPRINT · PHOPEPHUM AI
          </span>
          <span style={{ fontSize:9, fontWeight:700, color:C.faint, letterSpacing:"0.2em", textTransform:"uppercase" }}>
            {todayTh}
          </span>
        </div>

        {/* ══════════════════ HERO SECTION ══════════════════ */}
        <div style={{ padding:"0 36px", flexShrink:0 }}>
          {/* small label */}
          <div style={{ textAlign:"center", padding:"12px 0 8px", fontSize:10, fontWeight:700, color:C.goldDim, letterSpacing:"0.5em", textTransform:"uppercase" }}>
            THE GREAT ASCENSION
          </div>

          {/* Gold box */}
          <div style={{ background: C.heroBar, borderRadius:16, padding:"20px 32px 18px", textAlign:"center", border:`1px solid rgba(201,169,110,0.2)`, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom,rgba(201,169,110,0.06),transparent)", pointerEvents:"none" }} />
            <div style={{ fontSize:36, fontWeight:900, fontFamily:"'Prompt','Cinzel',serif", letterSpacing:"0.05em", background:"linear-gradient(135deg,#F5D78E 0%,#C9A96E 50%,#F5D78E 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", lineHeight:1.15 }}>
              {heroTitle}
            </div>
            <div style={{ fontSize:12, color:C.muted, marginTop:6, fontWeight:600 }}>
              จุดเปลี่ยนครั้งใหญ่ของชีวิต{" "}
              <strong style={{ color:C.goldBright }}>{name}</strong>
            </div>
            <div style={{ fontSize:10, color:C.faint, marginTop:5, fontStyle:"italic" }}>
              "ดวงแห่งการสร้างฐาน ผ่านทรัพย์สิน ระบบ และบารมีระยะยาว"
            </div>
          </div>
        </div>

        {/* ══════════════════ BIRTH INFO BAR ══════════════════ */}
        <div style={{ background:C.infoBar, borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", padding:"10px 36px", marginTop:10, flexShrink:0 }}>
          {[
            { label:"วันเกิด",           value: thaiDate(birthDate) },
            { label:"วันไหล่สัปดาห์",    value: dayOfWeek(birthDate) },
            { label:"ดาวเจ้าของวัน",      value: planetOfDay(birthDate) },
            { label:"เวลาเกิด",           value: birthTime },
          ].map((item,i) => (
            <div key={i} style={{ textAlign:"center" }}>
              <div style={{ fontSize:9, color:C.goldDim, fontWeight:700, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:3 }}>{item.label}</div>
              <div style={{ fontSize:11, fontWeight:700, color:C.text }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* ══════════════════ MAIN CONTENT GRID ══════════════════ */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"10px 28px 0", gap:8, overflow:"hidden" }}>

          {/* ── Row 1: 2 columns ── */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, flexShrink:0 }}>

            {/* วัฏจักรพระเสาร์ครอบดวง */}
            <div style={card()}>
              <div style={label()}>
                ♄ วัฏจักรพระเสาร์ครอบดวง
              </div>
              <div style={{ fontSize:10, color:C.goldDim, fontStyle:"italic", marginBottom:8 }}>"ได้ช้า แต่ได้ของใหญ่"</div>
              <div style={{ fontSize:10, color:C.muted, lineHeight:1.65 }}>
                {identity.length > 220 ? identity.slice(0, 220) + "…" : identity}
              </div>
              <div style={{ marginTop:8, background:C.goldBg, border:`1px solid ${C.goldBorder}`, borderRadius:8, padding:"5px 10px", fontSize:9, color:C.gold, textAlign:"center" }}>
                รับผิดชอบมากขึ้น · สร้างของตัวเอง · ไฟกิสระยะยาว
              </div>
            </div>

            {/* กำลังโสฬส + บารมีทรัพย์ */}
            <div style={card()}>
              <div style={label()}>
                ✦ กำลังโสฬส(16) + บารมีทรัพย์
              </div>
              <div style={{ textAlign:"center", marginBottom:8 }}>
                <span style={{ fontSize:40, fontWeight:900, fontFamily:"'Prompt',serif", background:"linear-gradient(135deg,#F5D78E,#C9A96E)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                  {horaResult?.strength || horaResult?.solar16 || "16"}
                </span>
                <div style={{ fontSize:10, color:C.goldDim, fontStyle:"italic", marginTop:-2 }}>"ดวงกำลังเปิดบารมีทรัพย์"</div>
              </div>
              {[
                { icon:"💰", title:"Wealth Expansion", desc: finance.slice(0,60) + "…" },
                { icon:"⭐", title:"Influence",        desc:"คนเชื่อถือ · ผู้ใหญ่สนับสนุน" },
                { icon:"🏛", title:"Legacy",           desc:"สร้างกิจการ · ต่อยอดระยะยาว" },
              ].map((item,i) => (
                <div key={i} style={{ display:"flex", gap:6, marginBottom:4 }}>
                  <span style={{ fontSize:11 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize:9, fontWeight:700, color:C.gold }}>{item.title}</div>
                    <div style={{ fontSize:9, color:C.muted }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Row 2: 3 columns ── */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, flexShrink:0 }}>

            {/* ดวงอสังหา */}
            <div style={card()}>
              <div style={label()}>🏠 ดวงอสังหาเด่นมาก</div>
              {["พฤหัสมหาอุจจ์","ขุมทรัพย์","อสังหา","ฐานระยะยาว"].map((step,i,arr) => (
                <div key={i}>
                  <div style={{ background:C.goldBg, border:`1px solid ${C.goldBorder}`, borderRadius:8, padding:"4px 10px", fontSize:9, fontWeight:700, color:C.gold, textAlign:"center" }}>{step}</div>
                  {i < arr.length-1 && <div style={{ textAlign:"center", color:C.faint, fontSize:10, lineHeight:1.2 }}>↓</div>}
                </div>
              ))}
              <div style={{ fontSize:9, color:C.faint, fontStyle:"italic", textAlign:"center", marginTop:5 }}>"ไม่ใช่แค่ซื้อทรัพย์ แต่คือการสร้างฐาน"</div>
            </div>

            {/* จาก 'ทำงาน' → สร้างระบบ */}
            <div style={card()}>
              <div style={label()}>⚡ จาก 'ทำงาน' → สร้างระบบ</div>
              {(career.split(/[·,。，]/).slice(0,4)).map((line: string,i: number) => (
                <div key={i} style={{ borderLeft:`2px solid ${C.gold}`, paddingLeft:8, marginBottom:5, fontSize:9, color:C.muted }}>{line.trim().slice(0,45)}</div>
              ))}
              <div style={{ background:C.goldBg, border:`1px solid ${C.goldBorder}`, borderRadius:6, padding:"3px 8px", fontSize:9, color:C.gold, textAlign:"center", marginTop:4 }}>
                "ได้เงินจากการสื่อสาร"
              </div>
              <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:5 }}>
                {["Speak","Strategy","Influence","Trust"].map(t => (
                  <span key={t} style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, borderRadius:20, padding:"2px 8px", fontSize:8, color:C.muted }}>{t}</span>
                ))}
              </div>
            </div>

            {/* จุดระวัง */}
            <div style={card()}>
              <div style={label()}>⚠ จุดระวัง</div>
              {[
                "แบกทุกอย่างคนเดียว",
                "ลงทุนเร็วเกินไป",
                "คนเข้าหาเพราะผลประโยชน์",
              ].map((w,i) => (
                <div key={i} style={{ display:"flex", gap:6, marginBottom:5 }}>
                  <span style={{ color:C.red, fontSize:9, marginTop:2 }}>●</span>
                  <span style={{ fontSize:9, color:C.muted }}>{w}</span>
                </div>
              ))}
              <div style={{ fontSize:9, color:C.gold, fontStyle:"italic", marginTop:6 }}>
                "ของใหญ่ได้... แต่ต้องค่อยสร้าง"
              </div>
            </div>
          </div>

          {/* ── Row 3: 2 columns ── */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, flexShrink:0 }}>

            {/* TQM */}
            <div style={card()}>
              <div style={label()}>⏱ TQM · Time Quality Management</div>
              {[
                { day:"จันทร์–อังคาร", icon:"💰", task:"เงิน / เจรจา / ปิดดีล" },
                { day:"พุธ–พฤหัส",     icon:"⚙",  task:"วางระบบ / ขยายธุรกิจ" },
                { day:"ศุกร์",          icon:"🔍", task:"ตรวจระบบ / งานหนัก" },
                { day:"เสาร์",          icon:"🎨", task:"Vision / Branding" },
                { day:"อาทิตย์",        icon:"🔋", task:"Reset / Healing" },
              ].map((r,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${C.border}`, paddingBottom:4, marginBottom:4 }}>
                  <span style={{ fontSize:8, color:C.gold, fontWeight:700, minWidth:80 }}>{r.day}</span>
                  <span style={{ fontSize:10 }}>{r.icon}</span>
                  <span style={{ fontSize:9, color:C.muted }}>{r.task}</span>
                </div>
              ))}
              <div style={{ fontSize:9, color:C.faint, fontStyle:"italic", textAlign:"center", marginTop:2 }}>"ทำถูกเวลา ถูกคน ถูกจังหวะ"</div>
            </div>

            {/* Monthly Roadmap */}
            <div style={card()}>
              <div style={label()}>📅 Monthly Energy Roadmap {heroYear}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }}>
                {[
                  { m:"มิ.ย.", task:"สร้างเครือข่าย" },
                  { m:"ก.ค.",  task:"จัดฐานชีวิต" },
                  { m:"ส.ค.",  task:"เปิดโปรเจกต์ใหม่" },
                  { m:"ก.ย.",  task:"เคลียร์ปัญหา" },
                  { m:"ต.ค.",  task:"เจรจา–พาร์ทเนอร์" },
                  { m:"พ.ย.",  task:"ชื้อสินทรัพย์" },
                  { m:"ธ.ค.",  task:"เก็บเกี่ยวทรัพย์" },
                  { m:"ม.ค.",  task:"วางแผนใหม่" },
                ].map((item,i) => (
                  <div key={i} style={{ background:C.goldBg, border:`1px solid ${C.goldBorder}`, borderRadius:8, padding:"5px 8px" }}>
                    <div style={{ fontSize:8, fontWeight:700, color:C.gold }}>{item.m}</div>
                    <div style={{ fontSize:9, color:C.muted }}>{item.task}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── FOOTER QUOTE ── */}
          <div style={{ flexShrink:0, borderTop:`1px solid ${C.border}`, padding:"10px 0 0", textAlign:"center" }}>
            <div style={{ fontSize:14, fontWeight:800, fontFamily:"'Prompt',serif", color:C.goldBright, marginBottom:4 }}>
              "ดวงนี้ไม่ได้เกิดมาเพื่อสำเร็จแล้วหายไป"
            </div>
            <div style={{ fontSize:9, color:C.muted, marginBottom:8 }}>
              แต่เกิดมาเพื่อสร้างสิ่งที่มั่นคง และมีคุณค่าต่อผู้คนในระยะยาว
            </div>
            <div style={{ display:"inline-block", background:C.goldBg, border:`1px solid ${C.goldBorder}`, borderRadius:10, padding:"7px 20px", fontSize:10, color:C.gold, fontStyle:"italic", marginBottom:6 }}>
              "{summary.slice(0, 80)}{summary.length > 80 ? "…" : ""}"
            </div>
            <div style={{ fontSize:9, color:C.faint, marginBottom:6 }}>
              โดย {name} · PHOPEPHUM AI · {todayTh}
            </div>
          </div>
        </div>

        {/* ══════════════════ BOTTOM BAR ══════════════════ */}
        <div style={{ padding:"8px 36px", borderTop:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background:"rgba(0,0,0,0.2)" }}>
          <span style={{ fontSize:8, fontWeight:700, color:C.faint, letterSpacing:"0.45em", textTransform:"uppercase" }}>
            BUILD YOUR LEGACY · PHOPEPHUM.COM
          </span>
        </div>
      </div>
    );
  }
);

PremiumReportTemplate.displayName = "PremiumReportTemplate";
export default PremiumReportTemplate;
