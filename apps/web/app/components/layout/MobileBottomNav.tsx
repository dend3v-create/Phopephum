import { Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";

export interface MobileBottomNavProps {
  currentPath: string;
}

const NAV_TABS = [
  {
    to: "/dashboard",
    labelKey: "today",
    defaultLabel: "วันนี้",
    exact: true,
    icon: "today",
  },
  {
    to: "/dashboard/check-yam",
    labelKey: "timing",
    defaultLabel: "ฤกษ์",
    exact: false,
    icon: "timing",
  },
  {
    to: "/dashboard/calendar",
    labelKey: "calendar",
    defaultLabel: "ปฏิทิน",
    exact: false,
    icon: "calendar",
  },
  {
    to: "/dashboard/horoscope",
    labelKey: "destiny",
    defaultLabel: "ดวง",
    exact: false,
    icon: "destiny",
  },
  {
    to: "/dashboard/settings",
    labelKey: "me",
    defaultLabel: "ฉัน",
    exact: false,
    icon: "me",
  },
] as const;

function TabIcon({ name, isActive }: { name: string; isActive: boolean }) {
  const cls = `w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : "scale-100"}`;

  if (name === "today") {
    // Sacred Solar Star of Daily Wisdom (ดวงตะวัน ๘ แฉกแห่งปัญญา)
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2 : 1.7} className={cls}>
        <circle cx="12" cy="12" r="4.5" fill={isActive ? "currentColor" : "none"} fillOpacity={isActive ? 0.25 : 0} />
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "timing") {
    // Sacred 8-Directional Ashtakarn Wheel (กงล้อยามอัฏฐกาล)
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2 : 1.7} className={cls}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v18M3 12h18M5.64 5.64l12.72 12.72M5.64 18.36L18.36 5.64" strokeLinecap="round" opacity={0.65} />
        <circle cx="12" cy="12" r="3" fill={isActive ? "currentColor" : "none"} fillOpacity={isActive ? 0.3 : 0} />
      </svg>
    );
  }

  if (name === "calendar") {
    // 100-Year Lunar & Solar Sacred Almanac (คัมภีร์ปฏิทินจันทรคติ ๑๐๐ ปี)
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2 : 1.7} className={cls}>
        <rect x="3" y="4" width="18" height="17" rx="2.5" />
        <path d="M16 2v4M8 2v4M3 9.5h18" strokeLinecap="round" />
        <path d="M12 13a2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 1-2.5 2.5 2.5 2.5 0 0 1-2.5-2.5 2.5 2.5 0 0 0 2.5-2.5z" fill={isActive ? "currentColor" : "none"} fillOpacity={isActive ? 0.35 : 0} />
      </svg>
    );
  }

  if (name === "destiny") {
    // Sacred 7-Star Emperor Matrix Seal (ผังจักรพรรดิ ๗ ตัว ๙ ฐาน)
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2 : 1.7} className={cls}>
        <polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" strokeLinejoin="round" fill={isActive ? "currentColor" : "none"} fillOpacity={isActive ? 0.2 : 0} />
        <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      </svg>
    );
  }

  if (name === "me") {
    // Sacred Soul Lotus (ดวงจิตและปัญญาญาณตนเอง)
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2 : 1.7} className={cls}>
        <path d="M12 3c-1.5 3-4 6-4 9a4 4 0 0 0 8 0c0-3-2.5-6-4-9z" fill={isActive ? "currentColor" : "none"} fillOpacity={isActive ? 0.25 : 0} />
        <path d="M4 14c2-1 4.5-1 6.5 1M20 14c-2-1-4.5-1-6.5 1" strokeLinecap="round" />
        <path d="M6 19c3-1.5 9-1.5 12 0" strokeLinecap="round" />
      </svg>
    );
  }

  return null;
}

export function MobileBottomNav({ currentPath }: MobileBottomNavProps) {
  const { t } = useTranslation("common");

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t flex items-stretch select-none touch-manipulation"
      style={{
        background: "var(--sidebar-bg, rgba(2,6,23,0.97))",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderColor: "var(--border-gold, rgba(217,188,130,0.18))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        height: "calc(64px + env(safe-area-inset-bottom, 0px))",
      }}
      aria-label={t("nav.main_menu", "เมนูหลัก")}
      role="navigation"
    >
      <div className="flex w-full items-stretch" role="tablist">
        {NAV_TABS.map((tab) => {
          const isActive = tab.exact
            ? currentPath === tab.to
            : currentPath.startsWith(tab.to);

          const label = t(`nav.${tab.labelKey}`, tab.defaultLabel);

          return (
            <Link
              key={tab.to}
              to={tab.to}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              className="relative flex-1 min-h-[48px] flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C6A96B]"
              style={{
                color: isActive
                  ? "var(--accent-gold, #C6A96B)"
                  : "var(--text-muted, #94A3B8)",
              }}
            >
              {/* Active top edge indicator with gold glow */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2.5px] w-10 rounded-full"
                  style={{
                    background: "linear-gradient(90deg, #C6A96B, #F2D49B, #C6A96B)",
                    boxShadow: "0 0 10px rgba(232, 196, 106, 0.6)",
                  }}
                />
              )}

              <span className="flex items-center justify-center shrink-0">
                <TabIcon name={tab.icon} isActive={isActive} />
              </span>

              <span
                className={`text-[11px] font-sarabun tracking-tight leading-none ${
                  isActive ? "font-bold text-[#C6A96B] dark:text-[#F2D49B]" : "font-medium"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
