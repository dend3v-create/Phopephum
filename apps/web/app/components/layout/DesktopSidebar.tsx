import { Link, Form, useLocation } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "~/components/ThemeToggle";
import { TimingReminderBell } from "~/components/timing/TimingReminderBell";
import { AstralIcon } from "~/components/ui/AstralIcon";

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
  { to: "/dashboard/partner", labelKey: "partner", defaultLabel: "ระบบพันธมิตร (Partner)", icon: "community" },
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

  const [isProHubOpen, setIsProHubOpen] = useState(true);

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] md:hidden transition-opacity duration-300 animate-fade-in"
          onClick={onCloseMobileDrawer}
          aria-hidden="true"
        />
      )}

      <aside
        className={`flex flex-col w-80 max-w-[88vw] md:w-64 p-4 fixed top-0 bottom-0 left-0 border-r z-[70] md:z-30 transition-transform duration-300 ease-out touch-manipulation select-none ${
          isMobileDrawerOpen ? "translate-x-0 shadow-2xl shadow-black/80" : "-translate-x-full md:translate-x-0"
        }`}
        style={{
          background: "var(--sidebar-bg, rgba(2,6,23,0.98))",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderColor: "var(--border-gold, rgba(217,188,130,0.18))",
          paddingTop: "max(1rem, env(safe-area-inset-top, 0px))",
          paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* ── Brand Header & Mobile Close Button ── */}
        <div className="mb-4 pb-3 border-b border-white/10 flex items-center justify-between shrink-0">
          <Link to="/dashboard" onClick={onCloseMobileDrawer} className="flex items-center gap-3 min-h-[44px]">
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

          {/* Close / Hide Button on Mobile Drawer */}
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 text-xs text-[#94A3B8] hover:text-[#F8F6F1] transition-all"
            aria-label="ซ่อนเมนู"
          >
            <span className="text-xs">✕</span>
            <span className="font-medium text-[11px]">ซ่อน</span>
          </button>
        </div>

        {/* ── Scrollable Container for ALL Navigation & Footer on Mobile ── */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain space-y-5 pr-1 -mr-1 scrollbar-thin scrollbar-thumb-white/10"
          style={{
            WebkitOverflowScrolling: "touch",
            paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {/* Main 5 Tabs */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#94A3B8] dark:text-[#64748B] px-3 mb-1.5 opacity-80">
              {t("nav.main_menu", "เมนูหลัก")}
            </p>
            <div className="space-y-1">
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
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-[0.98] ${
                      isActive
                        ? "text-[#C6A96B] dark:text-[#F2D49B] bg-[rgba(198,169,107,0.14)] shadow-sm border border-[#C6A96B]/30"
                        : "text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-white/5"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#C6A96B] rounded-r-full shadow-[0_0_10px_rgba(198,169,107,0.9)]" />
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
            <div className="space-y-1">
              {SECONDARY_NAV.map((item) => {
                const isActive = currentPath.startsWith(item.to);
                const label = t(`nav.${item.labelKey}`, item.defaultLabel);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onCloseMobileDrawer}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 active:scale-[0.98] ${
                      isActive
                        ? "text-[#C6A96B] dark:text-[#F2D49B] bg-[rgba(198,169,107,0.14)] border border-[#C6A96B]/30"
                        : "text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-white/5"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#C6A96B] rounded-r-full" />
                    )}
                    <SidebarIcon name={item.icon} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Pro Tools Hub (Collapsible Accordion) */}
          <div className="pt-2 border-t border-[rgba(217,188,130,0.12)]">
            <button
              type="button"
              onClick={() => setIsProHubOpen(!isProHubOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] text-[#C6A96B] hover:bg-white/5 transition-all"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <span>✦</span>
                <span className="truncate">{t("nav.pro_tools", "เครื่องมือนักพยากรณ์")}</span>
                {!isPro && (
                  <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#C6A96B]/15 text-[#D9BC82] border border-[#C6A96B]/30 flex items-center gap-1 shrink-0">
                    <span>🔒</span>
                    <span>PRO</span>
                  </span>
                )}
              </span>
              <span className={`text-xs transition-transform duration-200 text-[#C6A96B] shrink-0 ml-1 ${isProHubOpen ? "rotate-180" : ""}`}>
                ▼
              </span>
            </button>

            {isProHubOpen && (
              <div className="space-y-1 mt-1.5 pl-1 animate-fade-in">
                {PRO_TOOLS.map((item) => {
                  const isActive = currentPath.startsWith(item.to);
                  const label = t(`nav.${item.labelKey}`, item.defaultLabel);
                  const isItemLocked = !isPro;

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onCloseMobileDrawer}
                      className={`relative flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-[0.98] ${
                        isActive
                          ? "text-[#C6A96B] bg-[rgba(198,169,107,0.14)] border border-[#C6A96B]/30"
                          : isItemLocked
                          ? "text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-white/5 opacity-85"
                          : "text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate min-w-0">
                        <SidebarIcon name={item.icon} />
                        <span className="truncate">{label}</span>
                      </div>
                      {isItemLocked && (
                        <span className="text-[10px] shrink-0 text-[#C6A96B]/70 bg-[#C6A96B]/10 px-1.5 py-0.5 rounded border border-[#C6A96B]/20 flex items-center gap-1" title="สิทธิ์เฉพาะสมาชิก PRO หรือใช้ทรายกาลเวลา">
                          <span>🔒</span>
                          <span className="font-mono text-[9px]">PRO</span>
                        </span>
                      )}
                    </Link>
                  );
                })}

                {/* Operator / Admin links */}
                {(role === "admin" || role === "operator") && (
                  <div className="pt-2 mt-2 border-t border-white/10 space-y-1">
                    <Link
                      to="/operator"
                      onClick={onCloseMobileDrawer}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-sky-400 hover:bg-sky-500/10 border border-sky-500/20"
                    >
                      <span>🛡️ {t("nav.operator_system", "ระบบ Operator")}</span>
                    </Link>
                    {role === "admin" && (
                      <Link
                        to="/admin/approvals"
                        onClick={onCloseMobileDrawer}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-400 hover:bg-amber-500/10 border border-amber-500/20"
                      >
                        <span>⚡ {t("nav.approvals", "อนุมัติคำขอ")}</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Integrated Footer Section inside Scroll Container for Full Visibility ── */}
          <div className="border-t pt-4 mt-4 space-y-3" style={{ borderColor: "rgba(217,188,130,0.18)" }}>
            {/* Upgrade Banner for Free Users */}
            {!isPro && (
              <Link
                to="/dashboard/upgrade"
                onClick={onCloseMobileDrawer}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-xs font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#C6A96B]/20"
                style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)", color: "#020617" }}
              >
                <span>✦</span>
                <span>{t("nav.upgrade_membership", "อัปเกรดสมาชิก PRO")}</span>
              </Link>
            )}

            {/* Sands of Time Token Progress */}
            <Link
              to="/dashboard/upgrade?tab=sands"
              onClick={onCloseMobileDrawer}
              className="block px-3.5 py-2.5 rounded-2xl border transition-all hover:border-[#C6A96B]/40 hover:bg-[#C6A96B]/[0.08]"
              style={{ background: "rgba(198,169,107,0.06)", borderColor: "rgba(198,169,107,0.20)" }}
            >
              <div className="flex justify-between items-center text-xs font-bold text-[#C6A96B]">
                <span className="tracking-wider flex items-center gap-2">
                  <AstralIcon name="sandglass" size="sm" variant="gold" />
                  <span>{t("sands_of_time", "SANDS OF TIME")}</span>
                </span>
                {isPro ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#C6A96B]/20 text-[#C6A96B] uppercase font-extrabold">
                    {t("unlimited", "UNLIMITED")}
                  </span>
                ) : (
                  <span className="font-mono flex items-center gap-1.5">
                    <span>{timeSands}</span>
                    <span className="text-[10px] text-[#C6A96B]/80 font-normal underline">+ เติม</span>
                  </span>
                )}
              </div>
              {!isPro && (
                <div className="w-full h-1.5 rounded-full overflow-hidden mt-2" style={{ background: "var(--bg-base)" }}>
                  <div
                    className="bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (timeSands / 15) * 100)}%` }}
                  />
                </div>
              )}
            </Link>

            {/* User info & Controls */}
            <div className="flex items-center justify-between p-2 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border"
                  style={{
                    background: "rgba(198,169,107,0.15)",
                    borderColor: "rgba(217,188,130,0.30)",
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

              <div className="flex items-center gap-1">
                <TimingReminderBell />
                <ThemeToggle />
              </div>
            </div>

            {/* Logout button */}
            <Form method="post" action="/logout">
              <button
                type="submit"
                className="w-full text-center text-xs font-semibold py-2 px-3 rounded-xl border border-rose-500/20 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 transition-colors"
              >
                ← {t("nav.logout", "ออกจากระบบ")}
              </button>
            </Form>
          </div>
        </div>
      </aside>
    </>
  );
}
