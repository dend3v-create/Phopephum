import { Link } from "@remix-run/react";
import { ThemeToggle } from "~/components/ThemeToggle";
import { TimingReminderBell } from "~/components/timing/TimingReminderBell";
import { useTranslation } from "react-i18next";
import { AstralIcon } from "~/components/ui/AstralIcon";

export interface AppTopBarProps {
  displayName: string;
  timeSands: number;
  isPro: boolean;
  onOpenProDrawer?: () => void;
}

export function AppTopBar({
  displayName,
  timeSands,
  isPro,
  onOpenProDrawer,
}: AppTopBarProps) {
  const { t } = useTranslation("common");

  return (
    <header
      className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3.5 border-b select-none touch-manipulation"
      style={{
        background: "var(--sidebar-bg, rgba(2,6,23,0.97))",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: "var(--border-gold, rgba(217,188,130,0.18))",
        paddingTop: "env(safe-area-inset-top, 0px)",
        height: "calc(56px + env(safe-area-inset-top, 0px))",
      }}
    >
      {/* ── Brand Logo ── */}
      <Link
        to="/dashboard"
        className="flex items-center gap-2 min-h-[44px] py-1 active:scale-95 transition-transform"
        aria-label="PhopePhum Home"
      >
        <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[#C6A96B] to-[#D9BC82] flex items-center justify-center shadow-md shadow-[#C6A96B]/20 shrink-0">
          <span className="text-[#020617] text-sm font-black font-display">P</span>
        </div>
        <div className="flex flex-col">
          <span className="font-display text-base font-bold tracking-tight text-[var(--text-body)] leading-none">
            PhopePhum
          </span>
          <span className="text-[9px] tracking-[0.18em] uppercase text-[#C6A96B] font-semibold mt-0.5 opacity-90">
            Wisdom OS
          </span>
        </div>
      </Link>

      {/* ── Actions on Right ── */}
      <div className="flex items-center gap-1.5">
        {/* Timing Reminder Bell */}
        <div className="flex items-center justify-center min-w-[40px] min-h-[44px]">
          <TimingReminderBell />
        </div>

        {/* Sands of Time Token Badge */}
        <Link
          to="/dashboard/upgrade?tab=sands"
          className="flex items-center gap-1.5 px-2.5 min-h-[36px] rounded-full text-xs font-bold transition-all active:scale-95 border"
          style={{
            background: "rgba(198, 169, 107, 0.08)",
            borderColor: "rgba(198, 169, 107, 0.25)",
            color: "var(--accent-gold, #C6A96B)",
          }}
          title={t("sands_of_time", "ทรายกาลเวลา")}
          aria-label={t("sands_of_time", "ทรายกาลเวลา")}
        >
          <AstralIcon name="sandglass" variant="gold" size={13} glow />
          {isPro ? (
            <span className="text-[10px] uppercase tracking-wider font-extrabold">{t("unlimited", "PRO")}</span>
          ) : (
            <span className="font-mono text-xs font-extrabold">{timeSands}</span>
          )}
        </Link>

        {/* Theme Toggle */}
        <div className="flex items-center justify-center min-w-[40px] min-h-[44px]">
          <ThemeToggle />
        </div>

        {/* Pro Menu Toggle / Upgrade button */}
        {isPro && onOpenProDrawer ? (
          <button
            type="button"
            onClick={onOpenProDrawer}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-[var(--border-gold)] text-[#C6A96B] hover:bg-white/5 active:scale-95 transition-all"
            aria-label={t("nav.pro_tools", "เครื่องมือโหร")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
        ) : !isPro ? (
          <Link
            to="/dashboard/upgrade"
            className="text-[10px] font-extrabold text-[#020617] bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] px-2.5 min-h-[36px] flex items-center justify-center rounded-full hover:scale-105 active:scale-95 transition-all shadow-sm"
          >
            ✦ PRO
          </Link>
        ) : null}
      </div>
    </header>
  );
}
