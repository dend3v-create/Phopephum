import React from "react";
import { PublicNavbar } from "./PublicNavbar";
import { PublicFooter } from "./PublicFooter";

interface PublicLayoutProps {
  children: React.ReactNode;
  isLoggedIn?: boolean;
}

export function PublicLayout({ children, isLoggedIn = false }: PublicLayoutProps) {
  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden bg-[var(--bg-base)] text-[var(--text-body)] transition-colors duration-200">
      
      {/* ── Background Cosmic Ambience ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Soft aura top */}
        <div
          className="absolute w-[600px] sm:w-[900px] h-[600px] sm:h-[900px] -top-64 left-1/2 -translate-x-1/2 rounded-full opacity-60 dark:opacity-40 animate-aura-pulse"
          style={{
            background: "radial-gradient(circle, rgba(75,111,174,0.18) 0%, rgba(198,169,107,0.08) 45%, transparent 70%)",
          }}
        />
        {/* Subtle accent bottom right */}
        <div
          className="absolute w-[450px] sm:w-[650px] h-[450px] sm:h-[650px] -bottom-32 -right-32 rounded-full opacity-40 dark:opacity-20 animate-aura-pulse"
          style={{
            background: "radial-gradient(circle, rgba(198,169,107,0.15) 0%, transparent 65%)",
            animationDelay: "3s",
          }}
        />
      </div>

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
