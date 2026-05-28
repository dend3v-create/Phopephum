"use client";

import { DashboardLayout, HoraCard, SectionHeader } from "@/components/layout/DashboardLayout";

// ─────────────────────────────────────────────────────────────────────────────
// บริการที่กำลังพัฒนา (Coming Soon)
// ─────────────────────────────────────────────────────────────────────────────

const UPCOMING_SERVICES = [
  {
    icon: "☽",
    title: "ยามอัฐกาล",
    subtitle: "ทำนายทุก 90 นาที",
    desc: "วิเคราะห์ดาวเสวยยามและการพยากรณ์รายยาม (เรื่องที่ได้ยิน, คนเจ็บไข้, ของหาย, การเดินทาง) ตามหลักโหราศาสตร์ไทยโบราณ",
    tag: "พร้อมใช้งาน",
    tagStyle: { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#86efac" },
    href: "/dashboard",
  },
  {
    icon: "🐘",
    title: "พระรามเดินดง",
    subtitle: "วิเคราะห์ทุก 30 นาที",
    desc: "ระบบพระรามเดินดงแบ่งยามละ 30 นาที พยากรณ์ดวงในช่วงเวลาสั้นที่แม่นยำสูง",
    tag: "เร็วๆ นี้",
    tagStyle: { background: "rgba(217,188,130,0.1)", border: "1px solid rgba(217,188,130,0.25)", color: "#C6A96B" },
    href: null,
  },
  {
    icon: "💰",
    title: "ยามราหูค้นทรัพย์",
    subtitle: "หาฤกษ์รวย ทุก 10 นาที",
    desc: "คำนวณยามราหูรายคืน — หาเวลามงคลสำหรับธุรกิจ การลงทุน และระวังภัยโจรปล้น",
    tag: "เร็วๆ นี้",
    tagStyle: { background: "rgba(217,188,130,0.1)", border: "1px solid rgba(217,188,130,0.25)", color: "#C6A96B" },
    href: null,
  },
  {
    icon: "🐭",
    title: "โหรทายหนู",
    subtitle: "พยากรณ์ทุก 7 นาที",
    desc: "ระบบโหรทายหนูดั้งเดิม แบ่งเวลาออกเป็นช่วง 7 นาที เหมาะสำหรับตัดสินใจเรื่องเร่งด่วน",
    tag: "เร็วๆ นี้",
    tagStyle: { background: "rgba(217,188,130,0.1)", border: "1px solid rgba(217,188,130,0.25)", color: "#C6A96B" },
    href: null,
  },
  {
    icon: "✦",
    title: "เลข 7 ตัว 9 ฐาน",
    subtitle: "ยามอัศนี · ยามสาริกา",
    desc: "วิเคราะห์กาลชะตาส่วนตัวในเชิงลึกด้วยเลข 7 ตัว ตัดสินใจรายยาม — ดีกว่ายามอัฐกาลหลายเท่า",
    tag: "Beta",
    tagStyle: { background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#c4b5fd" },
    href: "/dashboard",
  },
  {
    icon: "✈",
    title: "Affiliate & บริการเดินทาง",
    subtitle: "จองตั๋ว · ท่องเที่ยว",
    desc: "เชื่อมต่อบริการเดินทางและท่องเที่ยว — ค้นหาฤกษ์ดีก่อนออกเดินทาง พร้อมจองตั๋วในแอปเดียว",
    tag: "กำลังพัฒนา",
    tagStyle: { background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.25)", color: "#7dd3fc" },
    href: null,
  },
] as const;

export default function ServicesPage() {
  return (
    <DashboardLayout pageTitle="บริการ">
      <div className="space-y-3">
        <SectionHeader
          icon="☰"
          title="บริการและฟีเจอร์"
          subtitle="ระบบพยากรณ์เฉพาะทางและบริการเสริมที่กำลังพัฒนา"
        />

        {UPCOMING_SERVICES.map((svc) => (
          <HoraCard key={svc.title} padding="md">
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
              {/* Icon */}
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(198,169,107,0.1)",
                border: "1px solid rgba(217,188,130,0.2)",
                fontSize: 20,
              }}>
                {svc.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--hora-gold)", fontFamily: "'Playfair Display', serif" }}>
                    {svc.title}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 20, ...svc.tagStyle }}>
                    {svc.tag}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: "rgba(198,169,107,0.7)", fontWeight: 600, letterSpacing: "0.04em", marginBottom: 6 }}>
                  {svc.subtitle}
                </div>
                <p style={{ fontSize: 12, color: "var(--hora-text-secondary)", lineHeight: 1.55, margin: 0 }}>
                  {svc.desc}
                </p>

                {svc.href && (
                  <a
                    href={svc.href}
                    style={{
                      display: "inline-block",
                      marginTop: 10,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--hora-gold)",
                      background: "rgba(198,169,107,0.08)",
                      border: "1px solid rgba(217,188,130,0.2)",
                      borderRadius: 8,
                      padding: "5px 14px",
                      textDecoration: "none",
                    }}
                  >
                    เปิดใช้งาน →
                  </a>
                )}
              </div>
            </div>
          </HoraCard>
        ))}

        {/* Footer note */}
        <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
          <p style={{ fontSize: 10, color: "var(--hora-text-muted)", letterSpacing: "0.06em" }}>
            ฟีเจอร์ใหม่จะเปิดให้ใช้งานตามลำดับ — ติดตามการอัปเดตได้ที่นี่
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
