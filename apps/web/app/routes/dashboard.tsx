import { json, redirect } from "@remix-run/cloudflare";
import { Outlet, Form, useLoaderData, Link, useLocation } from "@remix-run/react";
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

    if (profile?.membership_status === "pending" && profile?.role === "user") {
      throw redirect("/pending-approval");
    }

    await logEvent(request, env, EVENTS.DAILY_VISIT, { source: "web" });
    return json({ user, profile });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error("Dashboard Layout Loader Error:", err);
    return json({ user, profile: null });
  }
}

// ── Route → tab mapping for mobile bottom bar ────────────────────────────────
const MAIN_TABS = [
  { to: "/dashboard",         label: "วันนี้",        icon: <IcoToday /> },
  { to: "/dashboard/horoscope", label: "เส้นทางชีวิต", icon: <IcoJourney /> },
  { to: "/dashboard/reports/new", label: "Wisdom AI",  icon: <IcoAI /> },
  { to: "/dashboard/planner", label: "บันทึก",        icon: <IcoJournal /> },
  { to: "/dashboard/settings", label: "โปรไฟล์",      icon: <IcoProfile /> },
] as const;

export default function DashboardLayout() {
  const { user, profile } = useLoaderData<typeof loader>();
  const location = useLocation();
  const displayName = profile?.display_name ?? profile?.email ?? "ผู้ใช้งาน";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isPro = profile?.role === "admin" || profile?.role === "operator" || profile?.plan === "imperial";

  return (
    <div className="min-h-screen flex">
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className={`flex flex-col w-64 p-5 fixed h-full border-r z-40 transition-transform duration-300 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
        style={{
          background: "rgba(2,6,23,0.97)",
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
            <p className="text-[#D9BC82] text-[10px] tracking-[0.2em] uppercase mb-0.5 opacity-60">
              Wisdom Guidance OS
            </p>
            <h2 className="font-display text-xl font-bold text-[#F8F6F1] glow-gold leading-none">
              PhopePhum
            </h2>
          </div>
        </div>

        {/* ── Primary Nav (5 items) ── */}
        <nav className="flex flex-col gap-0.5 flex-1">

          {/* Section: Main */}
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A5568] px-3 mb-2">เมนูหลัก</p>

          <NavLink to="/dashboard" icon={<IcoToday />} label="วันนี้" exact />

          <NavLink
            to="/dashboard/horoscope"
            icon={<IcoJourney />}
            label="เส้นทางชีวิต"
          />

          <NavLink
            to="/dashboard/reports/new"
            icon={<IcoAI />}
            label="Wisdom AI"
          />

          <NavLink
            to="/dashboard/planner"
            icon={<IcoJournal />}
            label="บันทึก"
          />

          <NavLink
            to="/dashboard/settings"
            icon={<IcoProfile />}
            label="โปรไฟล์"
          />

          {/* ── Pro Astrologer Tools (hidden from general users) ── */}
          {isPro && (
            <div className="mt-6 pt-4 border-t" style={{ borderColor: "rgba(217,188,130,0.08)" }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C6A96B]/50 px-3 mb-2">
                ✦ Pro Astrologer Tools
              </p>
              <NavLink to="/dashboard/yam"        icon={<IcoYam />}       label="Wisdom Timing Engine" />
              <NavLink to="/dashboard/karnchata"  icon={<IcoHourglass />} label="Time Oracle Engine" />
              <NavLink to="/dashboard/horanu"     icon={<IcoHoraNu />}    label="Hora Nu Chart" />
              <NavLink to="/dashboard/rahu"       icon={<IcoRahu />}      label="Rahu Transit" />
              <NavLink to="/dashboard/calendar"   icon={<IcoList />}      label="100-Year Calendar" />
            </div>
          )}

          {/* ── Admin / Operator ── */}
          {(profile?.role === "admin" || profile?.role === "operator") && (
            <div className="mt-2">
              <NavLink to="/operator" icon={<IcoOperator />} label="ระบบ Operator" />
            </div>
          )}
          {profile?.role === "admin" && (
            <div className="mt-1">
              <NavLink to="/admin/approvals" icon={<IcoApprove />} label="อนุมัติคำขอ" />
            </div>
          )}
        </nav>

        {/* ── Footer ── */}
        <div className="border-t pt-4 mt-4 space-y-3" style={{ borderColor: "rgba(217,188,130,0.12)" }}>
          {/* Upgrade CTA */}
          {profile?.plan !== "imperial" && profile?.role !== "admin" && (
            <Link
              to="/dashboard/upgrade"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #C6A96B, #D9BC82)",
                color: "#020617",
                boxShadow: "0 4px 12px rgba(198,169,107,0.15)",
              }}
            >
              <IcoSparkles />
              อัปเกรดสมาชิก
            </Link>
          )}

          {/* Admin CTA */}
          {profile?.role === "admin" && (
            <a
              href="/admin"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all"
              style={{
                background: "linear-gradient(135deg, #1e3a5f, #2d5490)",
                border: "1px solid rgba(56,189,248,0.35)",
                color: "#38BDF8",
              }}
            >
              <IcoAdmin />
              Admin Dashboard
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
              <p className="text-[12px] text-[#94A3B8]/60 truncate">{user.email}</p>
              <p
                className="text-[12px] truncate capitalize font-semibold"
                style={{
                  color:
                    profile?.role === "admin"
                      ? "#38BDF8"
                      : profile?.plan === "imperial"
                      ? "#C6A96B"
                      : "#94A3B8",
                }}
              >
                {profile?.role === "admin"
                  ? "⌘ Administrator"
                  : profile?.plan === "imperial"
                  ? "✦ Imperial"
                  : profile?.plan === "pro"
                  ? "◈ Pro"
                  : "Basic"}
              </p>
            </div>
          </div>

          <Form method="post" action="/logout">
            <button
              type="submit"
              className="w-full text-left text-xs text-[#94A3B8] hover:text-[#F8F6F1] px-2 py-1.5 rounded-lg transition-colors hover:bg-white/5"
            >
              ออกจากระบบ
            </button>
          </Form>
        </div>
      </aside>

      {/* ── Mobile Top Bar ─────────────────────────────────────────────────── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: "rgba(2,6,23,0.97)",
          backdropFilter: "blur(16px)",
          borderColor: "rgba(217,188,130,0.12)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="font-display text-lg font-bold text-[#F8F6F1]">PhopePhum</span>
          <span className="text-[10px] text-[#C6A96B]/60 font-medium tracking-wider uppercase hidden xs:block">Wisdom OS</span>
        </div>

        {/* Hamburger (for Pro tools on mobile) */}
        {isPro ? (
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg hover:bg-white/5 active:scale-95 transition-all text-[#C9A96E]"
            aria-label="Pro Tools"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
              <path d="M4 6h16M4 12h10M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
        ) : (
          <Link
            to="/dashboard/upgrade"
            className="text-[11px] font-bold text-[#C6A96B] border border-[#C6A96B]/30 px-2.5 py-1 rounded-full hover:bg-[#C6A96B]/10 transition-colors"
          >
            ✦ Upgrade
          </Link>
        )}
      </div>

      {/* ── Mobile Bottom Tab Bar ──────────────────────────────────────────── */}
      <MobileBottomBar currentPath={location.pathname} />

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main className="flex-1 md:ml-64 pt-14 md:pt-0 pb-20 md:pb-0 min-h-screen">
        <ProtectedContent
          userLabel={
            profile?.display_name
              ? `${profile.display_name} · ${user.email}`
              : user.email
          }
          className="max-w-5xl mx-auto px-4 py-8"
        >
          <Outlet />
        </ProtectedContent>
      </main>
    </div>
  );
}

// ─── Mobile Bottom Tab Bar ────────────────────────────────────────────────────

function MobileBottomBar({ currentPath }: { currentPath: string }) {
  const tabs = [
    { to: "/dashboard",              label: "วันนี้",        icon: <IcoToday />,   exact: true },
    { to: "/dashboard/horoscope",    label: "เส้นทางชีวิต", icon: <IcoJourney />, exact: false },
    { to: "/dashboard/reports/new",  label: "AI",            icon: <IcoAI />,      exact: false },
    { to: "/dashboard/planner",      label: "บันทึก",        icon: <IcoJournal />, exact: false },
    { to: "/dashboard/settings",     label: "โปรไฟล์",      icon: <IcoProfile />, exact: false },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex items-stretch border-t"
      style={{
        background: "rgba(2,6,23,0.97)",
        backdropFilter: "blur(20px)",
        borderColor: "rgba(217,188,130,0.12)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? currentPath === tab.to
          : currentPath.startsWith(tab.to);

        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-all ${
              isActive
                ? "text-[#C6A96B]"
                : "text-[#4A5568] hover:text-[#8A8070]"
            }`}
          >
            <span className={`transition-transform ${isActive ? "scale-110" : ""}`}>
              {tab.icon}
            </span>
            <span className={`text-[10px] font-medium leading-none tracking-wide ${
              isActive ? "text-[#C6A96B]" : "text-[#4A5568]"
            }`}>
              {tab.label}
            </span>
            {isActive && (
              <span
                className="absolute bottom-0 w-8 h-0.5 rounded-full"
                style={{ background: "#C6A96B" }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IcoToday() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  );
}

function IcoJourney() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path d="M12 22V12" strokeLinecap="round" />
      <path d="M12 12C12 12 7 9 7 5a5 5 0 0 1 10 0c0 4-5 7-5 7z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 22h14" strokeLinecap="round" />
    </svg>
  );
}

function IcoAI() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IcoJournal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 7h7M9 11h5" strokeLinecap="round" />
    </svg>
  );
}

function IcoProfile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
    </svg>
  );
}

function IcoYam() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IcoHourglass() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path d="M5 2h14M5 22h14M19 2v4a7 7 0 0 1-7 7 7 7 0 0 1-7-7V2M5 22v-4a7 7 0 0 1 7-7 7 7 0 0 1 7 7v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IcoHoraNu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

function IcoRahu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IcoList() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IcoSparkles() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IcoAdmin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IcoOperator() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IcoApprove() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
