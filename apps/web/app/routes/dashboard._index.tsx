import { json } from "@remix-run/cloudflare";
import { useLoaderData, Link } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { getCurrentYam, calculateMoonPhase } from "@phopephum/engine";
import type { Env } from "~/env.server";
import { useState, useEffect } from "react";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);
  const { supabase } = createSupabaseClient(request, env);

  let pendingCount = 0;
  if (profile?.role === "admin" || profile?.role === "operator") {
    const { count } = await supabase
      .from("subscription_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  const yam  = getCurrentYam();
  const moon = calculateMoonPhase();

  const now  = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 5  ? "ราตรีสวัสดิ์"  :
    hour < 12 ? "อรุณสวัสดิ์"   :
    hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";

  const dateLabel = now.toLocaleDateString("th-TH", {
    weekday: "long", day: "numeric", month: "long",
  });

  return json({
    user, profile, pendingCount,
    greeting, dateLabel,
    yam: { name: yam.yamName, number: yam.yamNumber, period: yam.period },
    moon: { phase: moon.moonPhase, illumination: moon.illumination, isWanPhra: moon.isWanPhra },
  });
}

// ─── Planet → consumer energy label ──────────────────────────────────────────
const ENERGY_LABEL: Record<string, { th: string; color: string; glyph: string }> = {
  อาทิตย์: { th: "แสงสว่างนำทาง",       color: "#F59E0B", glyph: "☀" },
  ระวิ:    { th: "แสงสว่างนำทาง",       color: "#F59E0B", glyph: "☀" },
  จันทร์:  { th: "ความรู้สึกลึกซึ้ง",   color: "#9AB3D9", glyph: "☽" },
  คะศิ:   { th: "ความรู้สึกลึกซึ้ง",    color: "#9AB3D9", glyph: "☽" },
  อังคาร:  { th: "พลังขับเคลื่อน",      color: "#EF4444", glyph: "♂" },
  ภุมมะ:  { th: "พลังขับเคลื่อน",       color: "#EF4444", glyph: "♂" },
  พุธ:    { th: "ความคิดและการสื่อสาร", color: "#10B981", glyph: "☿" },
  พุทธะ:  { th: "ความคิดและการสื่อสาร", color: "#10B981", glyph: "☿" },
  พฤหัส:  { th: "โชคและความเจริญ",      color: "#F59E0B", glyph: "♃" },
  ครู:    { th: "โชคและความเจริญ",       color: "#F59E0B", glyph: "♃" },
  ศุกร์:  { th: "ความสุขและความงาม",    color: "#EC4899", glyph: "♀" },
  ศุโกร:  { th: "ความสุขและความงาม",    color: "#EC4899", glyph: "♀" },
  เสาร์:  { th: "ความอดทนและรากฐาน",   color: "#8B7FD4", glyph: "♄" },
  โสโร:   { th: "ความอดทนและรากฐาน",   color: "#8B7FD4", glyph: "♄" },
};

// ─── App shortcuts ────────────────────────────────────────────────────────────
const APPS = [
  {
    to: "/dashboard/chat",
    label: "ถาม Wisdom",
    sub: "ที่ปรึกษา AI",
    bg: "linear-gradient(135deg, #B8922C, #D4A843)",
    icon: <IcoWisdom />,
  },
  {
    to: "/dashboard/horoscope",
    label: "เส้นทางชีวิต",
    sub: "ดวงชาตา",
    bg: "linear-gradient(135deg, #1E3A5F, #2D5490)",
    icon: <IcoJourney />,
  },
  {
    to: "/dashboard/planner",
    label: "บันทึก",
    sub: "จดและวางแผน",
    bg: "linear-gradient(135deg, #5B21B6, #7C3AED)",
    icon: <IcoJournal />,
  },
  {
    to: "/dashboard/settings",
    label: "โปรไฟล์",
    sub: "ข้อมูลส่วนตัว",
    bg: "linear-gradient(135deg, #1E293B, #334155)",
    icon: <IcoProfile />,
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardIndex() {
  const { profile, pendingCount, yam, moon } = useLoaderData<typeof loader>();

  const displayName  = profile?.display_name ?? "คุณ";
  const isAdminOp    = profile?.role === "admin" || profile?.role === "operator";
  const hasBirthData = !!(profile?.birth_date);

  const [greeting, setGreeting]   = useState("สวัสดี");
  const [dateLabel, setDateLabel] = useState("");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 5 ? "ราตรีสวัสดิ์" : h < 12 ? "อรุณสวัสดิ์" : h < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น");
    setDateLabel(new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" }));
  }, []);

  const energy = ENERGY_LABEL[yam.name] ?? { th: "พลังงานจักรวาล", color: "#C6A96B", glyph: "✦" };

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-4">

      {/* ── 1. Greeting ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <p className="text-[#94A3B8] text-sm">{greeting} · {dateLabel}</p>
          <h1 className="font-display text-2xl font-bold text-[#F8F6F1] mt-0.5">
            สวัสดี, <span style={{ color: "#C6A96B" }}>{displayName}</span>
          </h1>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-full border text-xs font-medium"
          style={{ borderColor: "rgba(77,184,160,0.3)", color: "#4DB8A0", background: "rgba(77,184,160,0.08)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#4DB8A0] animate-ping" />
          Live
        </div>
      </div>

      {/* ── 2. Energy Today card ─────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 overflow-hidden relative"
        style={{
          background: "linear-gradient(135deg, rgba(10,34,64,0.8) 0%, rgba(7,20,39,0.9) 100%)",
          border: "1px solid rgba(217,188,130,0.18)",
        }}
      >
        {/* Ambient glow */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${energy.color}20 0%, transparent 70%)` }} />

        <div className="relative flex items-center justify-between gap-4">
          {/* Energy info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#94A3B8] font-medium tracking-wide mb-1">พลังงานขณะนี้</p>
            <p className="font-display text-xl font-bold leading-tight" style={{ color: energy.color }}>
              {energy.th}
            </p>
            <p className="text-sm text-[#94A3B8] mt-1">
              {yam.period === "day" ? "☀ กลางวัน" : "☾ กลางคืน"}
              {moon.isWanPhra ? " · วันพระ ✦" : ` · จันทร์ ${Math.round(moon.illumination)}%`}
            </p>
          </div>

          {/* Large glyph */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 font-display"
            style={{
              background: `${energy.color}18`,
              border: `1px solid ${energy.color}30`,
              color: energy.color,
            }}
          >
            {energy.glyph}
          </div>
        </div>

        {/* CTA */}
        <Link
          to="/dashboard/chat"
          className="mt-3 flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: "rgba(198,169,107,0.12)", border: "1px solid rgba(198,169,107,0.2)", color: "#D9BC82" }}
        >
          <span>ถาม Wisdom เกี่ยวกับพลังงานวันนี้</span>
          <span>→</span>
        </Link>
      </div>

      {/* ── 3. App Grid — iPhone style ───────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#4A5568] mb-3">ทางลัด</p>
        <div className="grid grid-cols-4 gap-3">
          {APPS.map(app => (
            <Link key={app.to} to={app.to} className="flex flex-col items-center gap-2 group">
              {/* Icon square — iOS style */}
              <div
                className="w-full aspect-square rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200 group-active:scale-90 group-hover:scale-105"
                style={{ background: app.bg, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}
              >
                {app.icon}
              </div>
              <span className="text-[11px] text-[#94A3B8] text-center leading-tight group-hover:text-[#F8F6F1] transition-colors">
                {app.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── 4. Birth data prompt (if not filled) ─────────────────────────── */}
      {!hasBirthData && (
        <Link to="/dashboard/settings" className="block group">
          <div
            className="rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-all hover:border-[#C6A96B]/40"
            style={{ background: "rgba(10,34,64,0.5)", border: "1px dashed rgba(217,188,130,0.25)" }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(198,169,107,0.12)", border: "1px solid rgba(198,169,107,0.25)" }}>
              <span className="text-[#C6A96B]">✦</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#D9BC82]">เพิ่มวันเกิดเพื่อการวิเคราะห์เชิงลึก</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">Wisdom จะแม่นยำขึ้นมากเมื่อรู้จักคุณ</p>
            </div>
            <span className="text-[#C6A96B]/60 group-hover:text-[#C6A96B] transition-colors text-lg">→</span>
          </div>
        </Link>
      )}

      {/* ── 5. Today's intention task ─────────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#4A5568] mb-3">วันนี้ของคุณ</p>
        <div className="space-y-2.5">

          <TaskRow
            to="/dashboard/chat?cat=timing"
            icon="⚡"
            iconColor="#F59E0B"
            label="เช็คพลังงานวันนี้เหมาะทำอะไร"
            sub="ถาม Wisdom ได้เลย"
          />
          <TaskRow
            to="/dashboard/planner"
            icon="📝"
            iconColor="#8B7FD4"
            label="บันทึกเจตนาและแผนของวัน"
            sub="จดสิ่งที่ตั้งใจทำวันนี้"
          />
          <TaskRow
            to="/dashboard/chat?cat=life"
            icon="✦"
            iconColor="#C6A96B"
            label="ขอคำแนะนำชีวิตจาก Wisdom"
            sub="มีอะไรอยากถามไหม?"
          />
        </div>
      </div>

      {/* ── 6. Admin/Operator panel ───────────────────────────────────────── */}
      {isAdminOp && (
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#38BDF8]/60 mb-3">
            ⌘ ระบบผู้ดูแล
          </p>
          <Link to="/admin/approvals" className="block group">
            <div
              className="rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-all"
              style={{
                background: "rgba(14,30,55,0.8)",
                border: "1px solid rgba(56,189,248,0.25)",
              }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.25)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth={1.8} className="w-5 h-5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#38BDF8]">
                  Admin Panel
                  {pendingCount > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#38BDF8] text-[#020617] text-xs font-bold">
                      {pendingCount}
                    </span>
                  )}
                </p>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  {pendingCount > 0 ? `มีคำขออนุมัติ ${pendingCount} รายการ` : "อนุมัติสมาชิก · จัดการระบบ"}
                </p>
              </div>
              <span className="text-[#38BDF8]/60 group-hover:text-[#38BDF8] transition-colors">→</span>
            </div>
          </Link>
        </div>
      )}

    </div>
  );
}

// ─── TaskRow ──────────────────────────────────────────────────────────────────

function TaskRow({
  to, icon, iconColor, label, sub,
}: { to: string; icon: string; iconColor: string; label: string; sub: string }) {
  return (
    <Link to={to} className="block group">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all group-hover:border-white/10"
        style={{ background: "rgba(10,34,64,0.45)", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
          style={{ background: `${iconColor}18`, border: `1px solid ${iconColor}28`, color: iconColor }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#F8F6F1] leading-tight">{label}</p>
          <p className="text-xs text-[#94A3B8] mt-0.5">{sub}</p>
        </div>
        <span className="text-[#4A5568] group-hover:text-[#C6A96B] transition-colors text-sm">→</span>
      </div>
    </Link>
  );
}

// ─── App Icons ────────────────────────────────────────────────────────────────

function IcoWisdom() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} className="w-7 h-7">
      <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IcoJourney() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} className="w-7 h-7">
      <path d="M12 22V12" strokeLinecap="round" />
      <path d="M12 12C12 12 7 9 7 5a5 5 0 0 1 10 0c0 4-5 7-5 7z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 22h14" strokeLinecap="round" />
    </svg>
  );
}

function IcoJournal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} className="w-7 h-7">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 7h7M9 11h5" strokeLinecap="round" />
    </svg>
  );
}

function IcoProfile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} className="w-7 h-7">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
    </svg>
  );
}
