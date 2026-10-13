import React from "react";
import { WisdomAtmosphere } from "~/components/theme/WisdomAtmosphere";
import { PublicNavbar } from "./PublicNavbar";
import { PublicFooter } from "./PublicFooter";

interface PublicLayoutProps {
  children: React.ReactNode;
  isLoggedIn?: boolean;
  className?: string;
}

export function PublicLayout({ children, isLoggedIn = false, className = "" }: PublicLayoutProps) {
  return (
    <div className={`pp-theme-shell relative min-h-screen flex flex-col overflow-x-clip bg-[var(--bg-base)] text-[var(--text-body)] transition-colors duration-200 ${className}`}>
      
      <WisdomAtmosphere />

      {/* ── Accessible Skip to Main Content ── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-[#C6A96B] focus:text-[#020617] focus:font-bold focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#C6A96B] focus:ring-offset-2"
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>

      {/* ── Sticky Public Navigation ── */}
      <PublicNavbar isLoggedIn={isLoggedIn} />

      {/* ── Main Page Content ── */}
      <main id="main-content" className="relative z-10 flex-grow" tabIndex={-1}>
        {children}
      </main>

      {/* ── Production Public Footer ── */}
      <PublicFooter />

    </div>
  );
}
