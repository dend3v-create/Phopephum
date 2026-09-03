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
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.8} className={cls}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "timing") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.8} className={cls}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16.5 4.5l1.5-1.5M7.5 4.5L6 3" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.8} className={cls}>
        <rect x="3" y="4" width="18" height="18" rx="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="15" r="1.5" fill="currentColor" />
      </svg>
    );
  }

  if (name === "destiny") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.8} className={cls}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 8v8M8 12h8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "me") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.8} className={cls}>
        <circle cx="12" cy="8" r="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 20c0-3.8 3.6-6.5 8-6.5s8 2.7 8 6.5" strokeLinecap="round" />
      </svg>
    );
  }

  return null;
}

export function MobileBottomNav({ currentPath }: MobileBottomNavProps) {
  const { t } = useTranslation("common");

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-stretch select-none"
      style={{
        background: "var(--sidebar-bg, rgba(2,6,23,0.97))",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderColor: "var(--border-gold, rgba(217,188,130,0.18))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        height: "calc(62px + env(safe-area-inset-bottom, 0px))",
      }}
      aria-label={t("nav.main_menu", "เมนูหลัก")}
    >
      {NAV_TABS.map((tab) => {
        const isActive = tab.exact
          ? currentPath === tab.to
          : currentPath.startsWith(tab.to);

        const label = t(`nav.${tab.labelKey}`, tab.defaultLabel);

        return (
          <Link
            key={tab.to}
            to={tab.to}
            className="relative flex-1 flex flex-col items-center justify-center gap-1 transition-colors active:scale-95"
            style={{
              color: isActive
                ? "var(--accent-gold, #C6A96B)"
                : "var(--text-muted, #94A3B8)",
            }}
          >
            {/* Active top edge indicator with gold glow */}
            {isActive && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 h-[2.5px] w-9 rounded-full"
                style={{
                  background: "linear-gradient(90deg, #C6A96B, #F2D49B, #C6A96B)",
                  boxShadow: "0 0 10px rgba(232, 196, 106, 0.6)",
                }}
              />
            )}

            <span className="flex items-center justify-center">
              <TabIcon name={tab.icon} isActive={isActive} />
            </span>

            <span
              className={`text-[10px] tracking-wide leading-none ${
                isActive ? "font-bold text-[#C6A96B] dark:text-[#F2D49B]" : "font-medium"
              }`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
