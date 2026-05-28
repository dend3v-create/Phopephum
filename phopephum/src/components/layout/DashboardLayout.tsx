"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardLayoutProps {
  children: React.ReactNode;
  /** ซ่อน BottomNav (เช่นหน้า fullscreen) */
  hideBottomNav?: boolean;
  /** แสดง Header */
  showHeader?: boolean;
  /** ชื่อหน้า */
  pageTitle?: string;
  /** แสดงปุ่ม Admin */
  isAdmin?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Layout Component
// ─────────────────────────────────────────────────────────────────────────────

export function DashboardLayout({
  children,
  hideBottomNav = false,
  showHeader = true,
  pageTitle,
  isAdmin = false,
}: DashboardLayoutProps) {
  const router = useRouter();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",       // dvh ดีกว่า vh บน mobile (คิด URL bar)
        maxWidth: "100vw",
        overflow: "hidden",
        backgroundColor: "var(--hora-dark)",
        paddingTop: "var(--safe-top)",
      }}
    >
      {/* Header */}
      {showHeader && (
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            backgroundColor: "rgba(10, 8, 6, 0.95)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--hora-dark-border)",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              color: "var(--hora-gold)",
              fontSize: "18px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              fontFamily: "'Playfair Display', serif",
            }}
          >
            PHOPEPHUM
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {pageTitle && (
              <span
                style={{
                  color: "var(--hora-text-muted)",
                  fontSize: "13px",
                }}
              >
                {pageTitle}
              </span>
            )}
            {isAdmin && (
              <button
                onClick={() => router.push("/admin")}
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#ef4444",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  cursor: "pointer",
                }}
              >
                ADMIN
              </button>
            )}
          </div>
        </header>
      )}

      {/* Scrollable Content Area */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",  // smooth scroll iOS
          paddingBottom: hideBottomNav
            ? "16px"
            : "calc(var(--bottom-nav-height) + var(--safe-bottom) + 8px)",
        }}
      >
        {/* Inner Container — จำกัดความกว้าง + padding */}
        <div
          style={{
            width: "100%",
            maxWidth: "480px",       // จำกัดบน tablet/desktop
            margin: "0 auto",
            padding: "16px 16px 0",
          }}
        >
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card Component — Mobile Optimized
// ─────────────────────────────────────────────────────────────────────────────

export interface HoraCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** padding preset */
  padding?: "sm" | "md" | "lg";
  /** มี glow effect */
  glow?: boolean;
}

const CARD_PADDING = { sm: "12px", md: "16px", lg: "20px" } as const;

export function HoraCard({
  children,
  style,
  padding = "md",
  glow = false,
}: HoraCardProps) {
  return (
    <div
      style={{
        backgroundColor: "var(--hora-dark-card)",
        border: "1px solid var(--hora-dark-border)",
        borderRadius: "12px",
        padding: CARD_PADDING[padding],
        marginBottom: "12px",
        width: "100%",
        overflow: "hidden",           // ป้องกัน child overflow
        boxSizing: "border-box",
        boxShadow: glow
          ? "0 0 20px rgba(201, 169, 110, 0.08)"
          : "0 2px 8px rgba(0,0,0,0.3)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom Navigation
// ─────────────────────────────────────────────────────────────────────────────

type TabId = "horoscope" | "planner" | "ai-coach" | "report";

interface NavTab {
  id: TabId;
  label: string;
  icon: string;
  href: string;
}

const NAV_TABS: NavTab[] = [
  { id: "horoscope", label: "ดวงชะตา",   icon: "◎",  href: "/dashboard" },
  { id: "planner",   label: "แพลนเนอร์", icon: "📅", href: "/dashboard/planner" },
  { id: "ai-coach",  label: "โค้ช AI",   icon: "✦",  href: "/dashboard/coach" },
  { id: "report",    label: "รายงาน",    icon: "⬇",  href: "/dashboard/report" },
];

function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // หา active tab จาก pathname จริง
  const active = React.useMemo<TabId>(() => {
    if (pathname === "/dashboard") return "horoscope";
    if (pathname.startsWith("/dashboard/planner")) return "planner";
    if (pathname.startsWith("/dashboard/coach")) return "ai-coach";
    if (pathname.startsWith("/dashboard/report")) return "report";
    return "horoscope";
  }, [pathname]);

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: "rgba(10, 8, 6, 0.97)",
        backdropFilter: "blur(16px)",
        borderTop: "1px solid var(--hora-dark-border)",
        display: "flex",
        alignItems: "stretch",
        height: "var(--bottom-nav-height)",
        paddingBottom: "var(--safe-bottom)",
      }}
    >
      {NAV_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => router.push(tab.href)}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "3px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            paddingTop: "8px",
            paddingBottom: "4px",
            transition: "opacity 0.15s",
            position: "relative",
          }}
        >
          <span style={{ fontSize: "18px", lineHeight: 1 }}>{tab.icon}</span>
          <span
            style={{
              fontSize: "10px",
              fontWeight: active === tab.id ? 600 : 400,
              color: active === tab.id
                ? "var(--hora-gold)"
                : "var(--hora-text-muted)",
              transition: "color 0.15s",
              letterSpacing: "0.02em",
            }}
          >
            {tab.label}
          </span>
          {/* Active indicator dot */}
          {active === tab.id && (
            <span
              style={{
                position: "absolute",
                top: "6px",
                width: "4px",
                height: "4px",
                borderRadius: "50%",
                backgroundColor: "var(--hora-gold)",
              }}
            />
          )}
        </button>
      ))}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Responsive Text — ป้องกัน overflow
// ─────────────────────────────────────────────────────────────────────────────

export function TruncatedText({
  children,
  lines = 1,
  style,
}: {
  children: React.ReactNode;
  lines?: number;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={{
        display: "-webkit-box",
        WebkitLineClamp: lines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        textOverflow: "ellipsis",
        wordBreak: "break-word",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Header
// ─────────────────────────────────────────────────────────────────────────────

export function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <h2
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "16px",
          fontWeight: 700,
          color: "var(--hora-gold)",
          margin: 0,
          fontFamily: "'Playfair Display', serif",
        }}
      >
        <span>{icon}</span>
        <span>{title}</span>
      </h2>
      {subtitle && (
        <p
          style={{
            fontSize: "12px",
            color: "var(--hora-text-muted)",
            marginTop: "4px",
            marginBottom: 0,
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
