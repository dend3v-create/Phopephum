import { json, redirect } from "@remix-run/cloudflare";
import { Outlet, Form, useLoaderData, Link, useLocation } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { logEvent, EVENTS } from "~/services/analytics.server";
import { NavLink } from "~/components/ui/NavLink";
import { ProtectedContent } from "~/components/ui/ProtectedContent";
import { ThemeToggle } from "~/components/ThemeToggle";
import { LanguageSwitcher } from "~/components/LanguageSwitcher";
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

    if (!profile?.birth_date && profile?.role === "user") {
      throw redirect("/onboarding");
    }

    await logEvent(request, env, EVENTS.DAILY_VISIT, { source: "web" });
    return json({ user, profile });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error("Dashboard Layout Loader Error:", err);
    return json({ user, profile: null });
  }
}

// ── Single source of truth for main nav (5 items) ────────────────────────────
const NAV_ITEMS = [
  { to: "/dashboard",            label: "แดชบอร์ด",         icon: "grid",    exact: true  },
  { to: "/dashboard/check-yam",  label: "เช็คฤกษ์ยาม",     icon: "yam",     exact: false },
  { to: "/dashboard/horoscope",  label: "ตั้งดวงชะตา",     icon: "journey", exact: false },
  { to: "/dashboard/planner",    label: "แผนงาน",           icon: "journal", exact: false },
  { to: "/dashboard/settings",   label: "โปรไฟล์",         icon: "profile", exact: false },
] as const;

type IconKey = typeof NAV_ITEMS[number]["icon"];

function NavIcon({ name, size = 5 }: { name: IconKey | string; size?: number | string }) {
  const cls = `w-${size} h-${size}`;
  if (name === "grid") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (name === "calendar") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (name === "today") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  );
  if (name === "ai") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (name === "journey") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <path d="M12 22V12" strokeLinecap="round" />
      <path d="M12 12C12 12 7 9 7 5a5 5 0 0 1 10 0c0 4-5 7-5 7z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 22h14" strokeLinecap="round" />
    </svg>
  );
  if (name === "journal") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 7h7M9 11h5" strokeLinecap="round" />
    </svg>
  );
  if (name === "profile") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
    </svg>
  );
  // Pro tool icons
  if (name === "yam") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <circle cx="12" cy="12" r="9" /><path d="M12 3v4M12 17v4M3 12h4M17 12h4" strokeLinecap="round" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
  if (name === "hourglass") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <path d="M5 2h14M5 22h14M19 2v4a7 7 0 0 1-7 7 7 7 0 0 1-7-7V2M5 22v-4a7 7 0 0 1 7-7 7 7 0 0 1 7 7v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (name === "horanu") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" strokeLinecap="round" /><circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
  if (name === "rahu") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12" strokeLinecap="round" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
  if (name === "list") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (name === "people") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (name === "operator") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (name === "approve") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="9" />
    </svg>
  );
  if (name === "admin") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (name === "sparkles") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (name === "taksa") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v9l5 3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
  if (name === "phuti") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M7 10c0-2.761 2.239-5 5-5s5 2.239 5 5-4 6-5 7c-1-1-5-4.239-5-7z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="1.5" fill="currentColor" />
    </svg>
  );
  return null;
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function DashboardLayout() {
  const { user, profile } = useLoaderData<typeof loader>();
  const location = useLocation();
  const displayName = profile?.display_name ?? profile?.email ?? "ผู้ใช้งาน";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);

  const isPro = profile?.role === "admin" || profile?.role === "operator" || profile?.plan === "imperial";

  return (
    <div className="min-h-screen flex bg-[#020617]">

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Desktop Sidebar (hidden on mobile unless menu open) ──────────────── */}
      <aside
        className={`flex flex-col w-60 p-4 fixed h-full border-r z-40 transition-transform duration-300 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        onClick={() => isMobileMenuOpen && setIsMobileMenuOpen(false)}
        style={{
          background: "var(--sidebar-bg)",
          backdropFilter: "blur(20px)",
          borderColor: "var(--sidebar-border)",
        }}
      >
        {/* Logo */}
        <div className="mb-6 pl-1 flex items-center gap-3">
          <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-[#C6A96B]/60 dark:border-[#C6A96B]/40 bg-[#C6A96B]/10 dark:bg-[#C6A96B]/5" />
            <span className="text-[#A68444] dark:text-[#C6A96B] text-xs font-bold z-10 font-display">P</span>
            <div className="absolute inset-0 opacity-50 dark:opacity-25">
              <svg viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="18" stroke="#C6A96B" strokeWidth="0.8" strokeDasharray="2 2" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-[9px] tracking-[0.2em] uppercase mb-0.5 opacity-60" style={{ color: "var(--accent-gold)" }}>
              Wisdom Guidance OS
            </p>
            <h2 className="font-display text-lg font-bold glow-gold leading-none" style={{ color: "var(--text-body)" }}>
              PhopePhum
            </h2>
          </div>
        </div>

        {/* ── Main Nav — exactly 5 items ── */}
        <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto">
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#94A3B8] px-3 mb-1.5 opacity-70">เมนูหลัก</p>

          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              exact={item.exact}
              icon={<NavIcon name={item.icon} />}
              label={item.label}
            />
          ))}

          <NavLink
            to="/dashboard/community"
            exact={false}
            icon={<NavIcon name="people" />}
            label="ชะตาพันธมิตร"
          />

          {/* ── Pro Astrologer Tools ── */}
          {isPro && (
            <div className="mt-5 pt-4 border-t" style={{ borderColor: "rgba(217,188,130,0.08)" }}>
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#C6A96B]/50 px-3 mb-1.5">
                ✦ เครื่องมือนักพยากรณ์
              </p>
              <NavLink to="/dashboard/yam"          exact={false} icon={<NavIcon name="yam" />}        label="ยามอัฐกาลชั้นฉาย" />
              <NavLink to="/dashboard/karnchata"    exact={false} icon={<NavIcon name="hourglass" />}  label="เลข ๗ ตัวกาลชะตา" />
              <NavLink to="/dashboard/horanu"       exact={false} icon={<NavIcon name="horanu" />}     label="ยามพรายกระซิบ" />
              <NavLink to="/dashboard/rahu"         exact={false} icon={<NavIcon name="rahu" />}       label="ยามราหูค้นทรัพย์" />
              <NavLink to="/dashboard/mahathaksa"   exact={false} icon={<NavIcon name="taksa" />}     label="มหาทักษาพยากรณ์" />
              <NavLink to="/dashboard/mahaphuti"    exact={false} icon={<NavIcon name="phuti" />}     label="มหาภูติกำเนิด" />
              <NavLink to="/dashboard/people"       exact={false} icon={<NavIcon name="people" />}    label="โปรไฟล์บุคคล" />
              <NavLink to="/dashboard/calendar"     exact={false} icon={<NavIcon name="list" />}       label="ปฏิทิน 100 ปี" />
            </div>
          )}

          {/* ── Admin / Operator ── */}
          {(profile?.role === "admin" || profile?.role === "operator") && (
            <div className="mt-2">
              <NavLink to="/operator" exact={false} icon={<NavIcon name="operator" />} label="ระบบ Operator" />
            </div>
          )}
          {profile?.role === "admin" && (
            <div className="mt-1">
              <NavLink to="/admin/approvals" exact={false} icon={<NavIcon name="approve" />} label="อนุมัติคำขอ" />
            </div>
          )}
        </nav>

        {/* ── Sidebar Footer ── */}
        <div className="border-t pt-3 mt-3 space-y-2.5" style={{ borderColor: "rgba(217,188,130,0.12)" }}>
          {profile?.plan !== "imperial" && profile?.role !== "admin" && (
            <Link
              to="/dashboard/upgrade"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)", color: "#020617" }}
            >
              <NavIcon name="sparkles" size={4} />
              อัปเกรดสมาชิก
            </Link>
          )}
          {profile?.role === "admin" && (
            <a href="/admin"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold tracking-wide"
              style={{ background: "linear-gradient(135deg, #1e3a5f, #2d5490)", border: "1px solid rgba(56,189,248,0.35)", color: "#38BDF8" }}>
              <NavIcon name="admin" size={4} />
              Admin Dashboard
            </a>
          )}
          {/* ── Sands of Time Token Progress Bar ── */}
          <div className="px-3 py-2 rounded-xl mb-1.5" style={{ background: "rgba(198,169,107,0.05)", border: "1px solid rgba(198,169,107,0.15)" }}>
            <div className="flex justify-between items-center text-[10px] font-bold text-[#C6A96B] mb-1">
              <span className="tracking-wider">⏳ SANDS OF TIME</span>
              {isPro ? (
                <span className="text-xs">♾️ Unlimited</span>
              ) : (
                <span>{profile?.time_sands ?? 0} / 15 เม็ด</span>
              )}
            </div>
            {!isPro && (
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-base)", border: "1px solid var(--border-dim)" }}>
                <div
                  className="bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (((profile?.time_sands ?? 0) / 15) * 100))}%` }}
                />
              </div>
            )}
          </div>

          {/* ── Preference controls ── */}
          <div className="flex items-center justify-between pb-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: "rgba(198,169,107,0.15)", border: "1px solid rgba(217,188,130,0.25)", color: "var(--accent-gold)" }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate font-medium leading-tight" style={{ color: "var(--text-body)" }}>{displayName}</p>
              <p className="text-[11px] truncate leading-tight" style={{ color: "var(--text-muted)" }} title={user.email}>{user.email}</p>
            </div>
          </div>
          <Form method="post" action="/logout">
            <button type="submit" className="w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ color: "var(--text-muted)" }}>
              ออกจากระบบ
            </button>
          </Form>
        </div>
      </aside>

      {/* ── Mobile Top Bar ─────────────────────────────────────────────────── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 h-12 border-b"
        style={{ background: "var(--sidebar-bg)", backdropFilter: "blur(16px)", borderColor: "var(--sidebar-border)" }}
      >
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="font-display text-base font-bold" style={{ color: "var(--text-body)" }}>PhopePhum</span>
          <span className="text-[9px] font-medium tracking-widest uppercase hidden xs:inline" style={{ color: "var(--accent-gold)", opacity: 0.6 }}>Wisdom OS</span>
        </Link>

        {/* Controls: Language + Theme + Menu */}
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />

        {isPro ? (
          /* Pro: hamburger opens sidebar for Pro tools */
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-white/5 active:scale-95 transition-all text-[#C9A96E]"
            aria-label="Pro Tools"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
              <path d="M4 6h16M4 12h10M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
        ) : (
          /* Free user: upgrade button */
          <Link
            to="/dashboard/upgrade"
            className="text-[11px] font-bold text-[#C6A96B] border border-[#C6A96B]/30 px-3 py-1 rounded-full hover:bg-[#C6A96B]/10 transition-colors"
          >
            ✦ Upgrade
          </Link>
        )}
        </div>
      </div>

      {/* ── Mobile Bottom Tab Bar (5 tabs — custom layout with popup) ─────────── */}
      <MobileBottomBar
        currentPath={location.pathname}
        isQuickMenuOpen={isQuickMenuOpen}
        setIsQuickMenuOpen={setIsQuickMenuOpen}
      />

      {/* ── Mobile Quick Menu Overlay ─────────────────────────────────────── */}
      {isQuickMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-45 md:hidden animate-fade-in"
          onClick={() => setIsQuickMenuOpen(false)}
        >
          <div
            className="absolute bottom-20 right-4 flex flex-col items-end gap-3.5 z-50 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Circular Buttons Column */}
            <div className="flex flex-col items-end gap-3.5 mr-1">
              {/* Sesheta (Wisdom AI) */}
              <Link
                to="/dashboard/chat"
                onClick={() => setIsQuickMenuOpen(false)}
                className="flex items-center gap-2.5 group"
              >
                <span className="text-xs font-bold text-[#F8F6F1] bg-black/65 px-2.5 py-1.5 rounded-xl border border-[#C6A96B]/20 backdrop-blur-md opacity-90 group-hover:opacity-100 transition-opacity">
                  Wisdom AI
                </span>
                <div className="w-12 h-12 rounded-full bg-[#0A2240] border-2 border-[#C6A96B] flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all text-[#C6A96B] glow-gold-box">
                  <NavIcon name="sparkles" size={5} />
                </div>
              </Link>

              {/* แดชบอร์ด */}
              <Link
                to="/dashboard"
                onClick={() => setIsQuickMenuOpen(false)}
                className="flex items-center gap-2.5 group"
              >
                <span className="text-xs font-bold text-[#F8F6F1] bg-black/65 px-2.5 py-1.5 rounded-xl border border-[#C6A96B]/20 backdrop-blur-md opacity-90 group-hover:opacity-100 transition-opacity">
                  แดชบอร์ด
                </span>
                <div className="w-12 h-12 rounded-full bg-[var(--text-body)] border-2 border-[#C6A96B] flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all text-[var(--bg-base)]">
                  <NavIcon name="grid" size={5} />
                </div>
              </Link>
            </div>

            {/* Bottom Row (Capsule + Close Button) */}
            <div className="flex items-center gap-3">
              {/* Capsule Menu */}
              <div
                className="flex items-center gap-2 px-3.5 py-2 rounded-full border shadow-2xl backdrop-blur-2xl"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-gold)",
                }}
              >
                {/* ตั้งดวงชะตา */}
                <Link
                  to="/dashboard/horoscope"
                  onClick={() => setIsQuickMenuOpen(false)}
                  className="flex flex-col items-center justify-center w-14 h-11 text-[var(--text-secondary)] hover:text-[#C6A96B] transition-colors"
                >
                  <NavIcon name="journey" size={4.5} />
                  <span className="text-[9px] font-bold mt-1 text-center truncate w-full">ตั้งดวง</span>
                </Link>

                {/* ปฏิทินมงคล */}
                <Link
                  to="/dashboard/calendar"
                  onClick={() => setIsQuickMenuOpen(false)}
                  className="flex flex-col items-center justify-center w-14 h-11 text-[var(--text-secondary)] hover:text-[#C6A96B] transition-colors"
                >
                  <NavIcon name="calendar" size={4.5} />
                  <span className="text-[9px] font-bold mt-1 text-center truncate w-full">ปฏิทินมงคล</span>
                </Link>

                {/* เช็คฤกษ์ยาม */}
                <Link
                  to="/dashboard/check-yam"
                  onClick={() => setIsQuickMenuOpen(false)}
                  className="flex flex-col items-center justify-center w-14 h-11 text-[var(--text-secondary)] hover:text-[#C6A96B] transition-colors"
                >
                  <NavIcon name="yam" size={4.5} />
                  <span className="text-[9px] font-bold mt-1 text-center truncate w-full">ฤกษ์ยาม</span>
                </Link>

                {/* เครือข่ายพันธมิตร */}
                <Link
                  to="/dashboard/community"
                  onClick={() => setIsQuickMenuOpen(false)}
                  className="flex flex-col items-center justify-center w-16 h-11 text-[var(--text-secondary)] hover:text-[#C6A96B] transition-colors"
                >
                  <NavIcon name="people" size={4.5} />
                  <span className="text-[9px] font-bold mt-1 text-center truncate w-full leading-none">พันธมิตร</span>
                </Link>
              </div>

              {/* Close Button 'X' */}
              <button
                onClick={() => setIsQuickMenuOpen(false)}
                className="w-12 h-12 rounded-full bg-[var(--text-body)] border border-slate-300 dark:border-slate-700 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all text-[var(--bg-base)]"
                aria-label="ปิดเมนูด่วน"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main className="flex-1 md:ml-60 min-h-screen" style={{ paddingTop: "var(--topbar-h, 48px)", paddingBottom: "var(--bottombar-h, 64px)" }}>
        <style>{`
          @media (min-width: 768px) {
            main { --topbar-h: 0px; --bottombar-h: 0px; }
          }
        `}</style>
        <ProtectedContent
          userLabel={profile?.display_name ? `${profile.display_name} · ${user.email}` : user.email}
          className="max-w-5xl mx-auto px-4 py-6"
        >
          <Outlet />
        </ProtectedContent>
      </main>
    </div>
  );
}

// ─── Mobile Bottom Tab Bar ────────────────────────────────────────────────────

function MobileBottomBar({
  currentPath,
  isQuickMenuOpen,
  setIsQuickMenuOpen,
}: {
  currentPath: string;
  isQuickMenuOpen: boolean;
  setIsQuickMenuOpen: (open: boolean) => void;
}) {
  const tabs = [
    { to: "/dashboard",           label: "แดชบอร์ด",    icon: "grid",     exact: true },
    { to: "/dashboard/calendar",  label: "ปฏิทินมงคล",  icon: "calendar", exact: false },
    { type: "quick-menu",         label: "เมนูด่วน",    icon: "sparkles" },
    { to: "/dashboard/planner",   label: "แผนงาน",      icon: "journal",  exact: false },
    { to: "/dashboard/settings",  label: "โปรไฟล์",    icon: "profile",  exact: false },
  ] as const;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-stretch"
      style={{
        background: "rgba(2,6,23,0.98)",
        backdropFilter: "blur(20px)",
        borderColor: "rgba(217,188,130,0.12)",
        height: "64px",
      }}
    >
      {tabs.map((tab, idx) => {
        if ("type" in tab && tab.type === "quick-menu") {
          return (
            <button
              key="quick-menu-trigger"
              onClick={() => setIsQuickMenuOpen(!isQuickMenuOpen)}
              className="relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
              style={{ color: isQuickMenuOpen ? "#C6A96B" : "#94A3B8" }}
              aria-label="เปิดเมนูด่วน"
            >
              <span className={`w-9 h-9 rounded-full flex items-center justify-center transition-all bg-[#0a2240]/60 border border-[#C6A96B]/30 hover:scale-105 active:scale-95 ${isQuickMenuOpen ? "rotate-45" : ""}`}>
                <NavIcon name="sparkles" size={5} />
              </span>
              <span className="text-[10px] font-medium leading-none tracking-wide">
                {tab.label}
              </span>
            </button>
          );
        }

        const navLink = tab as { readonly to: string; readonly label: string; readonly icon: string; readonly exact: boolean };
        const isActive = navLink.exact
          ? currentPath === navLink.to
          : currentPath.startsWith(navLink.to);

        return (
          <Link
            key={navLink.to}
            to={navLink.to}
            className="relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
            style={{ color: isActive ? "#C6A96B" : "#94A3B8" }}
          >
            {/* Active top-edge indicator */}
            {isActive && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                style={{ background: "#C6A96B" }}
              />
            )}
            <span className={`transition-transform duration-200 ${isActive ? "scale-110" : ""}`}>
              <NavIcon name={navLink.icon} size={5} />
            </span>
            <span className="text-[10px] font-medium leading-none tracking-wide">
              {navLink.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
