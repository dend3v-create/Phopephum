import { Link, Form, useLocation } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "~/components/ThemeToggle";

export interface DesktopSidebarProps {
  displayName: string;
  email: string;
  plan: string;
  role: string;
  timeSands: number;
  isPro: boolean;
  isMobileDrawerOpen: boolean;
  onCloseMobileDrawer: () => void;
}

const PRIMARY_NAV = [
  { to: "/dashboard", labelKey: "today", defaultLabel: "วันนี้", icon: "today", exact: true },
  { to: "/dashboard/check-yam", labelKey: "timing", defaultLabel: "ฤกษ์", icon: "timing", exact: false },
  { to: "/dashboard/calendar", labelKey: "calendar", defaultLabel: "ปฏิทิน", icon: "calendar", exact: false },
  { to: "/dashboard/horoscope", labelKey: "destiny", defaultLabel: "ดวง", icon: "destiny", exact: false },
  { to: "/dashboard/settings", labelKey: "me", defaultLabel: "ฉัน / ตั้งค่า", icon: "me", exact: false },
] as const;

const SECONDARY_NAV = [
  { to: "/dashboard/reports", labelKey: "reports", defaultLabel: "รายงานชีวิต", icon: "reports" },
  { to: "/dashboard/planner", labelKey: "planner", defaultLabel: "แผนงาน TQM", icon: "journal" },
  { to: "/dashboard/community", labelKey: "community", defaultLabel: "ชะตาพันธมิตร", icon: "community" },
] as const;

const PRO_TOOLS = [
  { to: "/dashboard/yam", labelKey: "yam_pro", defaultLabel: "ยามอัฏฐกาล 16 ยาม", icon: "yam" },
  { to: "/dashboard/karnchata", labelKey: "karnchata", defaultLabel: "กาลชะตาระดับนาที", icon: "karnchata" },
  { to: "/dashboard/horanu", labelKey: "yam_whisper", defaultLabel: "ยามพรายกระซิบ 112 ผัง", icon: "horanu" },
  { to: "/dashboard/rahu", labelKey: "rahu", defaultLabel: "ยามราหูค้นทรัพย์", icon: "rahu" },
  { to: "/dashboard/mahathaksa", labelKey: "taksa", defaultLabel: "มหาทักษาพยากรณ์", icon: "taksa" },
  { to: "/dashboard/mahaphuti", labelKey: "phuti", defaultLabel: "มหาภูติกำเนิด/จร", icon: "phuti" },
  { to: "/dashboard/people", labelKey: "people", defaultLabel: "บันทึกดวงลูกค้า (CRM)", icon: "people" },
] as const;

function SidebarIcon({ name }: { name: string }) {
  const cls = "w-4 h-4 shrink-0";

  if (name === "today") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "timing" || name === "yam") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
        <rect x="3" y="4" width="18" height="18" rx="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "destiny") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 8v8M8 12h8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "me") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
        <circle cx="12" cy="8" r="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 20c0-3.8 3.6-6.5 8-6.5s8 2.7 8 6.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "reports") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "journal") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "community" || name === "people") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "karnchata") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
        <path d="M5 2h14M5 22h14M19 2v4a7 7 0 0 1-7 7 7 7 0 0 1-7-7V2M5 22v-4a7 7 0 0 1 7-7 7 7 0 0 1 7 7v4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "horanu") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
        <circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" strokeLinecap="round" /><circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    );
  }

  if (name === "rahu") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
        <circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12" strokeLinecap="round" /><circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  if (name === "taksa" || name === "phuti") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v9l5 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

export function DesktopSidebar({
  displayName,
  email,
  plan,
  role,
  timeSands,
  isPro,
  isMobileDrawerOpen,
  onCloseMobileDrawer,
}: DesktopSidebarProps) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const currentPath = location.pathname;

  const [isProHubOpen, setIsProHubOpen] = useState(false);

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={onCloseMobileDrawer}
        />
      )}

      <aside
        className={`flex flex-col w-64 p-4 fixed h-full border-r z-50 transition-transform duration-300 ${
          isMobileDrawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{
          background: "var(--sidebar-bg, rgba(2,6,23,0.98))",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderColor: "var(--border-gold, rgba(217,188,130,0.18))",
        }}
      >
        {/* ── Brand Header ── */}
        <div className="mb-6 flex items-center justify-between">
          <Link to="/dashboard" onClick={onCloseMobileDrawer} className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-[#C6A96B] to-[#D9BC82] flex items-center justify-center shadow-lg shadow-[#C6A96B]/20 shrink-0">
              <span className="text-[#020617] text-sm font-black font-display">P</span>
            </div>
            <div>
              <p className="text-[9px] tracking-[0.22em] uppercase font-bold text-[#C6A96B] opacity-80 leading-none mb-1">
                Wisdom Guidance OS
              </p>
              <h2 className="font-display text-lg font-bold text-[var(--text-body)] leading-none">
                PhopePhum
              </h2>
            </div>
          </Link>

          {/* Close button on mobile drawer */}
          <button
            onClick={onCloseMobileDrawer}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
            aria-label="Close menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable Navigation Items ── */}
        <nav className="flex-1 overflow-y-auto space-y-5 pr-1 -mr-1">
          {/* Main 5 Tabs */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#94A3B8] dark:text-[#64748B] px-3 mb-1.5 opacity-80">
              {t("nav.main_menu", "เมนูหลัก")}
            </p>
            <div className="space-y-0.5">
              {PRIMARY_NAV.map((item) => {
                const isActive = item.exact
                  ? currentPath === item.to
                  : currentPath.startsWith(item.to);
                const label = t(`nav.${item.labelKey}`, item.defaultLabel);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onCloseMobileDrawer}
                    className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? "text-[#C6A96B] dark:text-[#F2D49B] bg-[rgba(198,169,107,0.12)] shadow-sm"
                        : "text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-white/5"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#C6A96B] rounded-r-full shadow-[0_0_8px_rgba(198,169,107,0.8)]" />
                    )}
                    <SidebarIcon name={item.icon} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Secondary Features */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#94A3B8] dark:text-[#64748B] px-3 mb-1.5 opacity-80">
              {t("nav.features", "เครื่องมือเสริม")}
            </p>
            <div className="space-y-0.5">
              {SECONDARY_NAV.map((item) => {
                const isActive = currentPath.startsWith(item.to);
                const label = t(`nav.${item.labelKey}`, item.defaultLabel);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onCloseMobileDrawer}
                    className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? "text-[#C6A96B] dark:text-[#F2D49B] bg-[rgba(198,169,107,0.12)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-white/5"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#C6A96B] rounded-r-full" />
                    )}
                    <SidebarIcon name={item.icon} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Pro Tools Hub (Collapsible Accordion) */}
          <div className="pt-2 border-t border-[rgba(217,188,130,0.1)]">
            <button
              type="button"
              onClick={() => setIsProHubOpen(!isProHubOpen)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.22em] text-[#C6A96B]/80 hover:text-[#C6A96B] transition-colors"
            >
              <span>{t("nav.pro_tools", "✦ โหมดโหราจารย์")}</span>
              <span className={`text-xs transition-transform duration-200 ${isProHubOpen ? "rotate-180" : ""}`}>
                ▼
              </span>
            </button>

            {(isProHubOpen || isPro) && (
              <div className="space-y-0.5 mt-1 animate-fade-in">
                {PRO_TOOLS.map((item) => {
                  const isActive = currentPath.startsWith(item.to);
                  const label = t(`nav.${item.labelKey}`, item.defaultLabel);

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onCloseMobileDrawer}
                      className={`relative flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                        isActive
                          ? "text-[#C6A96B] bg-[rgba(198,169,107,0.12)]"
                          : "text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-white/5"
                      }`}
                    >
                      <SidebarIcon name={item.icon} />
                      <span className="truncate">{label}</span>
                    </Link>
                  );
                })}

                {/* Operator / Admin links */}
                {(role === "admin" || role === "operator") && (
                  <div className="pt-2 mt-2 border-t border-white/5 space-y-0.5">
                    <Link
                      to="/operator"
                      onClick={onCloseMobileDrawer}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-sky-400 hover:bg-sky-500/10"
                    >
                      <span>🛡️ {t("nav.operator_system", "ระบบ Operator")}</span>
                    </Link>
                    {role === "admin" && (
                      <Link
                        to="/admin/approvals"
                        onClick={onCloseMobileDrawer}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-amber-400 hover:bg-amber-500/10"
                      >
                        <span>⚡ {t("nav.approvals", "อนุมัติคำขอ")}</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* ── Sidebar Footer ── */}
        <div className="border-t pt-3 mt-2 space-y-2.5" style={{ borderColor: "rgba(217,188,130,0.12)" }}>
          {/* Upgrade Banner for Free Users */}
          {!isPro && (
            <Link
              to="/dashboard/upgrade"
              onClick={onCloseMobileDrawer}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-[#C6A96B]/15"
              style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)", color: "#020617" }}
            >
              <span>✦</span>
              <span>{t("nav.upgrade_membership", "อัปเกรดสมาชิก PRO")}</span>
            </Link>
          )}

          {/* Sands of Time Token Progress */}
          <div
            className="px-3 py-1.5 rounded-xl border"
            style={{ background: "rgba(198,169,107,0.05)", borderColor: "rgba(198,169,107,0.15)" }}
          >
            <div className="flex justify-between items-center text-[10px] font-bold text-[#C6A96B]">
              <span className="tracking-wider">⏳ {t("sands_of_time", "ทรายกาลเวลา")}</span>
              {isPro ? (
                <span className="text-[10px] uppercase font-extrabold">{t("unlimited", "UNLIMITED")}</span>
              ) : (
                <span className="font-mono">{timeSands}</span>
              )}
            </div>
            {!isPro && (
              <div className="w-full h-1 rounded-full overflow-hidden mt-1" style={{ background: "var(--bg-base)" }}>
                <div
                  className="bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (timeSands / 15) * 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* User info & Controls */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border"
                style={{
                  background: "rgba(198,169,107,0.15)",
                  borderColor: "rgba(217,188,130,0.25)",
                  color: "var(--accent-gold)",
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs truncate font-semibold leading-tight text-[var(--text-body)]">
                  {displayName}
                </p>
                <p className="text-[10px] truncate text-[var(--text-muted)] leading-tight">
                  {email}
                </p>
              </div>
            </div>

            <ThemeToggle />
          </div>

          {/* Logout button */}
          <Form method="post" action="/logout">
            <button
              type="submit"
              className="w-full text-left text-[11px] px-2 py-1 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-white/5 transition-colors"
            >
              ← {t("nav.logout", "ออกจากระบบ")}
            </button>
          </Form>
        </div>
      </aside>
    </>
  );
}
