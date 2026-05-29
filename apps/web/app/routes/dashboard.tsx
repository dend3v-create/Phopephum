import { json } from "@remix-run/cloudflare";
import { Outlet, Form, useLoaderData } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { logEvent, EVENTS } from "~/services/analytics.server";
import { NavLink } from "~/components/ui/NavLink";
import type { Env } from "~/env.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  await logEvent(request, env, EVENTS.DAILY_VISIT, { source: "web" });

  return json({ user, profile });
}

export default function DashboardLayout() {
  const { profile } = useLoaderData<typeof loader>();
  const displayName =
    profile?.display_name ?? profile?.email ?? "ผู้ใช้งาน";

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className="hidden md:flex flex-col w-64 p-5 fixed h-full border-r"
        style={{
          background: "rgba(2,6,23,0.92)",
          backdropFilter: "blur(20px)",
          borderColor: "rgba(217,188,130,0.12)",
        }}
      >
        {/* Logo */}
        <div className="mb-8 pl-1">
          <p className="text-[#D9BC82] text-[9px] tracking-[0.3em] uppercase mb-1.5 opacity-70">
            Living Wisdom OS
          </p>
          <h2 className="font-display text-2xl font-bold text-[#F8F6F1] glow-gold">
            PhopePhum
          </h2>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 flex-1">
          <NavLink to="/dashboard"           icon={<IconHome />}     label="ภาพรวม" />
          <NavLink to="/dashboard/yam"       icon={<IconYam />}      label="ยามสด" />
          <NavLink to="/dashboard/horoscope" icon={<IconPlanet />}   label="ดวงชะตา" />
          <NavLink to="/dashboard/reports"   icon={<IconSparkles />} label="รายงาน" />
          <NavLink to="/dashboard/planner"   icon={<IconCalendar />} label="วางแผนชีวิต" />
          <NavLink to="/dashboard/settings"  icon={<IconSettings />} label="ตั้งค่า" />
          
          {profile?.role === 'admin' && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(217,188,130,0.12)" }}>
              <NavLink to="/admin" icon={<IconAdmin />} label="ระบบแอดมิน" />
            </div>
          )}
        </nav>

        {/* User */}
        <div className="border-t pt-4 mt-4" style={{ borderColor: "rgba(217,188,130,0.12)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#D9BC82] text-sm font-semibold"
              style={{ background: "rgba(198,169,107,0.15)", border: "1px solid rgba(217,188,130,0.25)" }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#F8F6F1] truncate">{displayName}</p>
              <p className="text-xs text-[#94A3B8] truncate capitalize">
                {profile?.subscription ?? "free"}
              </p>
            </div>
          </div>
          <Form method="post" action="/logout">
            <button
              type="submit"
              className="w-full text-left text-xs text-[#94A3B8] hover:text-[#F8F6F1] px-2 py-1.5 rounded-lg transition-colors"
              style={{ "--hover-bg": "rgba(75,111,174,0.12)" } as React.CSSProperties}
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
        <MobileMenu />
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Outlet />
        </div>
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

function IconAdmin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-[#38BDF8]">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
