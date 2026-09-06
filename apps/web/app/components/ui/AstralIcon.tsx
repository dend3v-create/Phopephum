import React from "react";

export type AstralIconName =
  | "career"
  | "finance"
  | "relationship"
  | "wellness"
  | "horanu"
  | "yam"
  | "timeline"
  | "sub-yam"
  | "portal"
  | "sandglass"
  | "wisdom"
  | "spark"
  | "balance"
  | "check"
  | "crown"
  | "shield"
  | "compass"
  | "calendar"
  | "moon"
  | "sun"
  | "gem"
  | "scroll"
  | "star";

export type AstralIconVariant =
  | "gold"
  | "mystic"
  | "emerald"
  | "rose"
  | "amber"
  | "sky"
  | "current";

export type AstralIconSize = "xs" | "sm" | "md" | "lg" | "xl" | number;

interface AstralIconProps extends React.SVGProps<SVGSVGElement> {
  name: AstralIconName | string;
  size?: AstralIconSize;
  variant?: AstralIconVariant;
  className?: string;
  glow?: boolean;
}

const SIZE_MAP: Record<string, number> = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

const VARIANT_COLOR_CLASSES: Record<AstralIconVariant, string> = {
  gold: "text-[#C6A96B] dark:text-[#F2D49B] [data-theme=light]:text-[#8C6D2D]",
  mystic: "text-[#4B6FAE] dark:text-[#9AB3D9] [data-theme=light]:text-[#3D5361]",
  emerald: "text-emerald-600 dark:text-emerald-400 [data-theme=light]:text-emerald-700",
  rose: "text-rose-600 dark:text-rose-400 [data-theme=light]:text-rose-700",
  amber: "text-amber-600 dark:text-amber-400 [data-theme=light]:text-amber-700",
  sky: "text-sky-600 dark:text-sky-400 [data-theme=light]:text-sky-700",
  current: "currentColor",
};

export function AstralIcon({
  name,
  size = "md",
  variant = "current",
  className = "",
  glow = false,
  ...props
}: AstralIconProps) {
  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size] ?? 20;
  const colorClass = VARIANT_COLOR_CLASSES[variant] || "";
  const glowClass = glow
    ? variant === "gold"
      ? "drop-shadow-[0_0_8px_rgba(198,169,107,0.5)]"
      : variant === "mystic"
      ? "drop-shadow-[0_0_8px_rgba(75,111,174,0.5)]"
      : "drop-shadow-[0_0_8px_currentColor]"
    : "";

  const commonProps = {
    width: pixelSize,
    height: pixelSize,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: `shrink-0 transition-colors duration-200 ${colorClass} ${glowClass} ${className}`,
    ...props,
  };

  switch (name) {
    // ── 4 มิติชีวิต (4 Life Domains) ──
    case "career":
      return (
        <svg {...commonProps}>
          {/* Briefcase with central star */}
          <rect x="3" y="7" width="18" height="13" rx="2.5" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M12 11v3" />
          <circle cx="12" cy="13.5" r="1" fill="currentColor" />
          <path d="M3 13h4M17 13h4" />
        </svg>
      );

    case "finance":
      return (
        <svg {...commonProps}>
          {/* Celestial Coin / Treasury Gem */}
          <circle cx="12" cy="12" r="9" />
          <path d="M12 6v12M15 9.5a2.5 2.5 0 0 0-2.5-2.5h-1a2.5 2.5 0 0 0 0 5h1a2.5 2.5 0 0 1 0 5h-1A2.5 2.5 0 0 1 9 14.5" />
          <circle cx="12" cy="12" r="6" strokeDasharray="1.5 2.5" strokeOpacity="0.6" />
        </svg>
      );

    case "relationship":
      return (
        <svg {...commonProps}>
          {/* Harmony Hands / Two Rings of Union */}
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          <path d="M12 5v4M10 7h4" strokeWidth="1.4" />
        </svg>
      );

    case "wellness":
      return (
        <svg {...commonProps}>
          {/* Sacred Leaf / Lotus Balance */}
          <path d="M12 21a9 9 0 0 0 9-9c0-4.97-4.03-9-9-9s-9 4.03-9 9a9 9 0 0 0 9 9Z" />
          <path d="M12 3c0 9 9 9 9 9" />
          <path d="M12 12c-4 0-6 4-6 6" />
          <path d="M8 12c2-2 4-2 4-2" />
        </svg>
      );

    // ── ๔ ศาสตร์พยากรณ์ (Sacred Engine Doors) ──
    case "horanu":
      return (
        <svg {...commonProps}>
          {/* 12-House Astrological Ring & Needle */}
          <circle cx="12" cy="12" r="9.5" />
          <circle cx="12" cy="12" r="5" strokeDasharray="2 2" strokeOpacity="0.7" />
          <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" />
          <polygon points="12 8 13.5 12 12 16 10.5 12" fill="currentColor" fillOpacity="0.25" />
        </svg>
      );

    case "yam":
      return (
        <svg {...commonProps}>
          {/* Octagonal Astrological Clock (8 Yam) */}
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <path d="M12 2v1.5M12 20.5V22M2 12h1.5M20.5 12H22M4.93 4.93l1.06 1.06M17.95 17.95l1.06 1.06M4.93 19.07l1.06-1.06M17.95 6.05l1.06-1.06" strokeWidth="1.2" />
        </svg>
      );

    case "timeline":
      return (
        <svg {...commonProps}>
          {/* Hourly Timeline Grid */}
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeWidth="2.5" />
        </svg>
      );

    case "sub-yam":
    case "compass":
      return (
        <svg {...commonProps}>
          {/* Sacred 9-Sub-Yam Compass */}
          <circle cx="12" cy="12" r="9" />
          <polygon points="12 6 15 12 12 18 9 12" fill="currentColor" fillOpacity="0.2" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <path d="m14 10 2-2M8 16l2-2" strokeWidth="1.2" />
        </svg>
      );

    case "portal":
      return (
        <svg {...commonProps}>
          {/* Sacred Temple / Door Portal */}
          <path d="M3 21h18M4 21V10l8-6 8 6v11" />
          <path d="M9 21v-7a3 3 0 0 1 6 0v7" />
          <circle cx="12" cy="8" r="1.2" fill="currentColor" />
        </svg>
      );

    // ── ฟังก์ชัน & กาลเวลา (Timing & Wisdom Features) ──
    case "sandglass":
      return (
        <svg {...commonProps}>
          {/* Sacred Hourglass with Flowing Sand */}
          <path d="M5 3h14M5 21h14" />
          <path d="M6 3v4.5a6 6 0 0 0 3 5.2 6 6 0 0 0-3 5.2V21M18 3v4.5a6 6 0 0 1-3 5.2 6 6 0 0 1 3 5.2V21" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <path d="M12 14v3" strokeDasharray="1 1" />
        </svg>
      );

    case "wisdom":
      return (
        <svg {...commonProps}>
          {/* Third Eye / Radiant Lotus Wisdom */}
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3.5" fill="currentColor" fillOpacity="0.25" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <path d="M12 2v2M12 20v2M5 5l1.5 1.5M17.5 17.5 19 19" strokeWidth="1.3" />
        </svg>
      );

    case "spark":
      return (
        <svg {...commonProps}>
          {/* Divine Spark / Instant Auspicious Strike */}
          <polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2" fill="currentColor" fillOpacity="0.2" />
        </svg>
      );

    case "balance":
      return (
        <svg {...commonProps}>
          {/* Celestial Scales of Time Comparison */}
          <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
          <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
          <path d="M7 21h10M12 3v18M3 7h18" />
        </svg>
      );

    case "check":
      return (
        <svg {...commonProps}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );

    case "crown":
      return (
        <svg {...commonProps}>
          <path d="M3 18h18M4 18l2-10 5 4 5-4 2 10" />
          <circle cx="4" cy="7" r="1" fill="currentColor" />
          <circle cx="12" cy="7" r="1" fill="currentColor" />
          <circle cx="20" cy="7" r="1" fill="currentColor" />
        </svg>
      );

    case "shield":
      return (
        <svg {...commonProps}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M12 7v6M10 10h4" strokeWidth="1.4" />
        </svg>
      );

    case "gem":
      return (
        <svg {...commonProps}>
          <path d="M6 3h12l4 6-10 12L2 9l4-6Z" fill="currentColor" fillOpacity="0.15" />
          <path d="M12 21 8 9h8l-4 12Z" />
          <path d="M2 9h20" />
        </svg>
      );

    case "scroll":
      return (
        <svg {...commonProps}>
          <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
          <path d="M19 17V5a2 2 0 0 0-2-2H4" />
          <path d="M10 8h6M10 12h4" strokeWidth="1.3" />
        </svg>
      );

    case "star":
      return (
        <svg {...commonProps}>
          <path d="m12 2 2.7 6.3 6.8.6-5.1 4.5 1.5 6.6-5.9-3.5-5.9 3.5 1.5-6.6-5.1-4.5 6.8-.6L12 2Z" fill="currentColor" fillOpacity="0.2" />
        </svg>
      );

    case "moon":
      return (
        <svg {...commonProps}>
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="currentColor" fillOpacity="0.2" />
        </svg>
      );

    case "sun":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.2" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...commonProps}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );

    default:
      // Fallback celestial star
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="3" r="1.5" fill="currentColor" />
          <circle cx="12" cy="21" r="1.5" fill="currentColor" />
          <circle cx="3" cy="12" r="1.5" fill="currentColor" />
          <circle cx="21" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.2" />
          <path d="M12 7v10M7 12h10" />
        </svg>
      );
  }
}
