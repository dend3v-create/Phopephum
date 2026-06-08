import { json, redirect } from "@remix-run/cloudflare";
import { Outlet, Form, useLoaderData, Link } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { logEvent, EVENTS } from "~/services/analytics.server";
import { NavLink } from "~/components/ui/NavLink";
import { ProtectedContent } from "~/components/ui/ProtectedContent";
import type { Env } from "~/env.server";
import { useState } from "react";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);

  try {
    const profile = await getProfile(user.id, request, env);

    // Gate: ถ้า membership ยังรอการอนุมัติ → redirect ไปหน้า pending
    if (profile?.membership_status === "pending" && profile?.role === "user") {
      throw redirect("/pending-approval");
    }

    await logEvent(request, env, EVENTS.DAILY_VISIT, { source: "web" });
    return json({ user, profile });
  } catch (err) {
    if (err instanceof Response) throw err; // re-throw redirects
    console.error("Dashboard Layout Loader Error:", err);
    return json({ user, profile: null });
  }
}

export default function DashboardLayout() {
  const { user, profile } = useLoaderData<typeof loader>();
  const displayName =
    profile?.display_name ?? profile?.email ?? "ผู้ใช้งาน";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`flex flex-col w-64 p-5 fixed h-full border-r z-40 transition-transform duration-300 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
        style={{
          background: "rgba(2,6,23,0.95)",
          backdropFilter: "blur(20px)",
          borderColor: "rgba(217,188,130,0.12)",
        }}
      >
        {/* Logo */}
        <div className="mb-8 pl-1 flex items-center gap-3">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-[#C6A96B]/30 bg-[#C6A96B]/5" />
            <span className="text-[#C6A96B] text-xs font-bold z-10 font-display">P</span>
            <div className="absolute inset-0 opacity-20">
               <svg viewBox="0 0 40 40" fill="none">
                 <circle cx="20" cy="20" r="18" stroke="#C6A96B" strokeWidth="0.5" strokeDasharray="2 2" />
               </svg>
            </div>
          </div>
          <div>
            <p className="text-[#D9BC82] text-[8px] tracking-[0.2em] uppercase mb-0.5 opacity-70">
              Living Wisdom OS
            </p>
            <h2 className="font-display text-xl font-bold text-[#F8F6F1] glow-gold leading-none">
              PhopePhum
            </h2>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 flex-1">
          <NavLink to="/dashboard"           icon={<IconHome />}     label="ภาพรวม" />
          
          <NavLink to="/dashboard/horoscope" 
            icon={<IconPlanet />}   
            label={<span>ตรวจดวงชะตา {profile?.plan === 'free' || profile?.plan === 'basic' ? '🔒' : ''}</span>} 
          />
          
          <NavLink to="/dashboard/yam"       
            icon={<IconYam />}      
            label={<span>ฤกษ์งามยามดี {profile?.plan === 'free' || profile?.plan === 'basic' ? '🔒' : ''}</span>} 
          />
          
          <NavLink to="/dashboard/rahu"      
            icon={<IconRahu />}     
            label={<span>ยามราหูค้นทรัพย์ {profile?.plan === 'free' || profile?.plan === 'basic' ? '🔒' : ''}</span>} 
          />
          
          <NavLink to="/dashboard/karnchata" 
            icon={<IconHourglass />}   
            label={<span>ทำนายกาลชะตา {profile?.plan === 'free' || profile?.plan === 'basic' ? '🔒' : ''}</span>} 
          />
          
          <NavLink to="/dashboard/horanu" 
            icon={<IconHoraNu />}   
            label={<span>โหรทายหนู {profile?.plan === 'free' || profile?.plan === 'basic' ? '🔒' : ''}</span>} 
          />
          
          <NavLink to="/dashboard/planner"   
            icon={<IconCalendar />} 
            label={<span>วางแผนชีวิต {profile?.plan === 'free' || profile?.plan === 'basic' ? '🔒' : ''}</span>} 
          />

          <NavLink to="/dashboard/calendar"   
            icon={<IconListCalendar />} 
            label={<span>ปฏิทิน 100 ปี</span>} 
          />

          <NavLink to="/dashboard/how-to-use" 
            icon={<IconHelp />} 
            label="วิธีการใช้งาน" 
          />
          
          <NavLink to="/dashboard/settings"  icon={<IconSettings />} label="ตั้งค่าโปรไฟล์" />
          
          {(profile?.role === 'admin' || profile?.role === 'operator') && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(217,188,130,0.12)" }}>
              <NavLink to="/operator" icon={<IconOperator />} label="ระบบ Operator" />
            </div>
          )}

          {profile?.role === 'admin' && (
            <div className="mt-2">
              <NavLink to="/admin/approvals" icon={<IconApprove />} label="อนุมัติคำขอ" />
            </div>
          )}
        </nav>

        {/* User + Admin CTA */}
        <div className="border-t pt-4 mt-4 space-y-3" style={{ borderColor: "rgba(217,188,130,0.12)" }}>

          {/* Upgrade CTA — แสดงเมื่อยังไม่เป็น Imperial */}
          {profile?.plan !== 'imperial' && profile?.role !== 'admin' && (
            <Link
              to="/dashboard/upgrade"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #C6A96B, #D9BC82)",
                color: "#020617",
                boxShadow: "0 4px 12px rgba(198,169,107,0.15)",
              }}
            >
              <IconSparkles />
              อัปเกรดสมาชิก
            </Link>
          )}

          {/* Admin CTA — เห็นเฉพาะ admin */}
          {profile?.role === 'admin' && (
            <a
              href="/admin"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #1e3a5f, #2d5490)",
                border: "1px solid rgba(56,189,248,0.35)",
                color: "#38BDF8",
                boxShadow: "0 0 16px rgba(56,189,248,0.12)",
              }}
            >
              <IconAdmin />
              จัดการระบบ (Admin)
            </a>
          )}

          {/* User info */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#D9BC82] text-sm font-bold shrink-0"
              style={{ background: "rgba(198,169,107,0.15)", border: "1px solid rgba(217,188,130,0.25)" }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#F8F6F1] truncate font-medium">{displayName}</p>
              <p className="text-[10px] text-[#94A3B8]/60 truncate">{user.email}</p>
              <p className="text-[10px] truncate capitalize font-semibold"
                style={{ color: profile?.role === 'admin' ? "#38BDF8" : profile?.plan === 'imperial' ? "#C6A96B" : "#94A3B8" }}>
                {profile?.role === 'admin' ? '⌘ Administrator' : profile?.plan === 'imperial' ? '✦ Imperial' : profile?.plan === 'pro' ? '◈ Pro' : 'Basic'}
              </p>
            </div>
          </div>

          <Form method="post" action="/logout">
            <button
              type="submit"
              className="w-full text-left text-xs text-[#94A3B8] hover:text-[#F8F6F1] px-2 py-1.5 rounded-lg transition-colors"
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(75,111,174,0.12)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              ออกจากระบบ
            </button>
          </Form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: "rgba(2,6,23,0.95)",
          backdropFilter: "blur(16px)",
          borderColor: "rgba(217,188,130,0.12)",
        }}
      >
        <h2 className="font-display text-xl font-bold text-[#F8F6F1]">
          PhopePhum
        </h2>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-lg hover:bg-white/5 active:scale-95 transition-all text-[#C9A96E]"
          aria-label="เมนู"
        >
          <MobileMenu />
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen">
        <ProtectedContent
          userLabel={profile?.display_name ? `${profile.display_name} · ${user.email}` : user.email}
          className="max-w-5xl mx-auto px-4 py-8"
        >
          <Outlet />
        </ProtectedContent>
      </main>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconYam() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path d="M3 12L12 3l9 9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 21V12h6v9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v11h14V10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPlanet() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <circle cx="12" cy="12" r="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-20 12 12)" />
    </svg>
  );
}

function IconSparkles() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" />
    </svg>
  );
}

function MobileMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6 text-[#C9A96E]">
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

function IconApprove() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
    </svg>
  );
}

function IconAdmin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-[#38BDF8]">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconOperator() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-[#10B981]">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconRahu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-[#C6A96B]">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12c0-2.21.72-4.25 1.94-5.91" />
      <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
    </svg>
  );
}

function IconListCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconHourglass() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-[#C6A96B]">
      <path d="M5 2h14M5 22h14M19 2v4a7 7 0 0 1-7 7 7 7 0 0 1-7-7V2M5 22v-4a7 7 0 0 1 7-7 7 7 0 0 1 7 7v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 2v4M12 18v4" strokeLinecap="round" />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-[#C9A96E]">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 17H12.01" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
    </svg>
  );
}

function IconHoraNu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-[#C6A96B]">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}
