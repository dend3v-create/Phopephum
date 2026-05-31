import { json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { Link } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { getCurrentYam, calculateMoonPhase } from "@phopephum/engine";
import { Card } from "~/components/ui/Card";
import { MembershipBadge, MembershipStatusBadge } from "~/components/MembershipBadge";
import type { Env } from "~/env.server";
import { useState, useEffect } from "react";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  const { supabase } = createSupabaseClient(request, env);
  const { count: reportCount } = await supabase
    .from("ai_reports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const yam  = getCurrentYam();
  const moon = calculateMoonPhase();

  const PLANET_SYMBOLS: Record<string, string> = {
    สุริยะ:"☉",ระวิ:"☉",จันเทา:"☽",คะศิ:"☽",ภุมมะ:"♂",ภุมโม:"♂",
    พุทธะ:"☿",พุทโธ:"☿",ครู:"♃",ชีโว:"♃",ศุกระ:"♀",ศุโกร:"♀",เสารี:"♄",โสโร:"♄",
  };

  let daysRemaining = 0;
  if (profile?.membership_expires_at) {
    const expiresAt = new Date(profile.membership_expires_at).getTime();
    const now = Date.now();
    daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
  }

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "อรุณสวัสดิ์" : hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";
  const dateLabel = now.toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return json({
    user,
    profile,
    reportCount: reportCount ?? 0,
    daysRemaining,
    greeting,
    dateLabel,
    yam: {
      yamName:   yam.yamName,
      yamNumber: yam.yamNumber,
      period:    yam.period,
      symbol:    PLANET_SYMBOLS[yam.yamName] ?? "✦",
    },
    moon: {
      moonPhase:    moon.moonPhase,
      illumination: moon.illumination,
      isWanPhra:    moon.isWanPhra,
      guidance:     moon.guidance,
    },
  });
}

export default function DashboardIndex() {
  const { user, profile, reportCount, daysRemaining, greeting: initialGreeting, dateLabel: initialDateLabel, yam, moon } = useLoaderData<typeof loader>();
  const displayName = profile?.display_name ?? "ผู้ใช้งาน";

  const [greeting, setGreeting] = useState(initialGreeting);
  const [dateLabel, setDateLabel] = useState(initialDateLabel);

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    setGreeting(hour < 12 ? "อรุณสวัสดิ์" : hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น");
    setDateLabel(now.toLocaleDateString("th-TH", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }));
  }, []);

  // ดึงระดับสิทธิ์ใช้งานโดยให้ความสำคัญกับ profile.plan เป็นหลัก เพื่อความสอดคล้องกันของข้อมูล
  const membershipType = profile?.plan || profile?.membership_type || profile?.subscription || "free";
  const membershipStatus = profile?.membership_status || "active";

  return (
    <div className="space-y-8">


      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[#8A8070] text-sm mb-1">{greeting}</p>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold text-[#F3EFE8]">
              สวัสดี, {displayName}
            </h1>
            <MembershipBadge type={membershipType} />
          </div>
        </div>
        {membershipType !== "free" && (
          <div className="flex items-center gap-2 text-sm bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
            <span className="text-[#8A8070]">สถานะ:</span>
            <MembershipStatusBadge status={membershipStatus} />
            {daysRemaining > 0 && (
              <span className="text-slate-300 ml-2">เหลือ {daysRemaining} วัน</span>
            )}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="บทวิเคราะห์"
          value={String(reportCount)}
          sub="รายงานทั้งหมด"
        />
        <StatCard
          label="แพ็กเกจ"
          value={membershipType === "free" ? "ฟรี" : membershipType.toUpperCase()}
          sub="แผนปัจจุบัน"
          highlight={membershipType !== "free"}
        />
        <StatCard
          label="วันนี้"
          value={dateLabel}
          sub="วันที่"
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* Yam + Moon live widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Yam widget */}
        <Link to="/dashboard/yam" className="group">
          <Card className="flex items-center gap-4 hover:border-[#C6A96B]/40 transition-all">
            <span className="text-4xl text-[#D9BC82] leading-none" style={{ fontFamily: "serif" }}>
              {yam.symbol}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[#94A3B8] text-xs uppercase tracking-wide mb-0.5">ยามอัฏฐกาลขณะนี้</p>
              <p className="font-display text-xl font-bold text-[#D9BC82] group-hover:glow-gold transition-all">
                ยาม{yam.yamName}
              </p>
              <p className="text-[#94A3B8] text-xs">
                ยามที่ {yam.yamNumber} · {yam.period === "day" ? "กลางวัน" : "กลางคืน"}
              </p>
            </div>
            <span className="text-[#C6A96B] text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0">→</span>
          </Card>
        </Link>

        {/* Moon widget */}
        <Card className="flex items-center gap-4">
          <span className="text-4xl leading-none">
            {moon.isWanPhra ? "🌕" : moon.illumination > 50 ? "🌖" : "🌒"}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[#94A3B8] text-xs uppercase tracking-wide mb-0.5">จันทรคติวันนี้</p>
            <p className="text-[#F8F6F1] font-medium">{moon.moonPhase}</p>
            <p className="text-[#94A3B8] text-xs mt-0.5 line-clamp-1">{moon.guidance}</p>
          </div>
          {moon.isWanPhra && (
            <span className="shrink-0 px-2 py-0.5 text-[10px] rounded-full text-[#D9BC82]"
              style={{ background: "rgba(198,169,107,0.15)", border: "1px solid rgba(198,169,107,0.3)" }}>
              วันพระ
            </span>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-[#C9A96E] text-xs tracking-widest uppercase mb-4">
          เริ่มต้นได้เลย
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <QuickAction
            to="/dashboard/horoscope"
            title="คำนวณดวงชะตา"
            desc="เลข 7 ตัว 9 ฐาน + ยามอัฏฐกาล"
            icon="🪐"
          />
          <QuickAction
            to="/dashboard/reports"
            title="บทวิเคราะห์ชีวิต"
            desc="บทวิเคราะห์ชีวิตเชิงลึกจากปัญญาศาสตร์"
            icon="✨"
          />
          <QuickAction
            to="/dashboard/planner"
            title="วางแผนชีวิต"
            desc="TQM Planner รายวัน/รายเดือน"
            icon="📅"
          />
          <QuickAction
            to="/dashboard/settings"
            title="ตั้งค่าโปรไฟล์"
            desc="กรอกวันเกิดเพื่อความแม่นยำสูงสุด"
            icon="⚙️"
          />
        </div>
      </div>

      {/* Admin Panel — เห็นเฉพาะ admin */}
      {profile?.role === "admin" && (
        <div>
          <h2 className="text-[#38BDF8] text-xs tracking-widest uppercase mb-4 flex items-center gap-2">
            <span>⌘</span> ระบบผู้ดูแล
          </h2>
          <Link to="/admin" className="group block">
            <div
              className="rounded-2xl p-5 flex items-center gap-5 transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: "linear-gradient(135deg, rgba(14,30,55,0.9), rgba(22,48,88,0.8))",
                border: "1px solid rgba(56,189,248,0.3)",
                boxShadow: "0 0 24px rgba(56,189,248,0.08)",
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(56,189,248,0.12)",
                  border: "1px solid rgba(56,189,248,0.25)",
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth={1.8} className="w-6 h-6">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[#38BDF8] font-bold text-base mb-0.5 group-hover:text-sky-300 transition-colors">
                  ผู้จัดการระบบ (แอดมิน)
                </p>
                <p className="text-[#94A3B8] text-sm">
                  จัดการผู้ใช้ · อนุมัติคำขอ · ดูสถิติระบบ
                </p>
              </div>
              <span className="text-[#38BDF8] text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0">→</span>
            </div>
          </Link>
        </div>
      )}

      {/* Upgrade banner (free tier) */}
      {membershipType === "free" && (
        <Card className="border-[#C9A96E]/30 bg-gradient-to-br from-[#15120F] to-[#1A1410]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[#C9A96E] font-semibold mb-1">
                อัพเกรดเป็น Premium
              </p>
              <p className="text-[#8A8070] text-sm">
                ปลดล็อกบทวิเคราะห์ไม่จำกัด + พยากรณ์รายปี
              </p>
            </div>
            <Link
              to="/pricing"
              className="shrink-0 bg-[#C9A96E] text-[#0A0806] font-semibold px-5 py-2 rounded-full text-sm hover:bg-[#E8D4A8] transition-colors"
            >
              ดูแผน
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  highlight = false,
  className = "",
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <Card className={className}>
      <p className="text-[#8A8070] text-xs uppercase tracking-wide mb-2">
        {label}
      </p>
      <p
        className={`text-2xl font-bold font-display ${
          highlight ? "text-[#C9A96E]" : "text-[#F3EFE8]"
        }`}
      >
        {value}
      </p>
      <p className="text-[#8A8070] text-xs mt-1">{sub}</p>
    </Card>
  );
}

function QuickAction({
  to,
  title,
  desc,
  icon,
}: {
  to: string;
  title: string;
  desc: string;
  icon: string;
}) {
  return (
    <Link to={to} className="group">
      <Card className="flex items-start gap-4 hover:border-[#C9A96E]/40 transition-colors group-hover:bg-[#1A1410]">
        <span className="text-2xl mt-0.5">{icon}</span>
        <div>
          <p className="text-[#F3EFE8] font-medium mb-1 group-hover:text-[#C9A96E] transition-colors">
            {title}
          </p>
          <p className="text-[#8A8070] text-sm">{desc}</p>
        </div>
      </Card>
    </Link>
  );
}

