import React, { useState } from "react";
import { Link } from "@remix-run/react";

export function MobileFloatingSpeedDial() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen((prev) => !prev);
  const close = () => setIsOpen(false);

  const menuItems = [
    {
      to: "/dashboard/chat",
      label: "Wisdom AI ปัญญาญาณ",
      // Sacred AI Wisdom Eye / Radiant Merkaba Spark
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.5} className="opacity-40" />
          <path
            d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z"
            fill="currentColor"
          />
          <circle cx="12" cy="10" r="1.5" fill="#FFF" />
          <circle cx="18" cy="17" r="1.5" fill="currentColor" />
          <circle cx="6" cy="17" r="1" fill="currentColor" />
        </svg>
      ),
      badgeClass: "bg-gradient-to-tr from-[#1E3A8A] to-[#2563EB] text-[#F8F6F1] border border-[#C6A96B]/50 shadow-md shadow-blue-900/30",
    },
    {
      to: "/dashboard",
      label: "แดชบอร์ดภาพรวม",
      // Sacred 4-Quadrant Astrological Mandala
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 2.5V21.5M2.5 12H21.5" strokeLinecap="round" />
          <circle cx="12" cy="12" r="4.5" strokeDasharray="2 2" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
      ),
      badgeClass: "bg-white dark:bg-[#0A2240] text-[#C6A96B] dark:text-[#F8F6F1] border border-[#C6A96B]/40 shadow-md",
    },
    {
      to: "/dashboard/horoscope",
      label: "ผังดวง ๗ ตัว ๙ ฐาน",
      // Sacred 7-Star Emperor Matrix Seal
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
          <polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" />
        </svg>
      ),
      badgeClass: "bg-white dark:bg-[#0A2240] text-[#C6A96B] dark:text-[#F8F6F1] border border-[#C6A96B]/40 shadow-md",
    },
    {
      to: "/dashboard/check-yam",
      label: "ยามอัฏฐกาล ๑๖ ยาม",
      // Sacred 8-Spoke Ashtakarn Wheel
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 2.5v19M2.5 12h19M5.3 5.3l13.4 13.4M5.3 18.7L18.7 5.3" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity={0.2} />
        </svg>
      ),
      badgeClass: "bg-white dark:bg-[#0A2240] text-[#C6A96B] dark:text-[#F8F6F1] border border-[#C6A96B]/40 shadow-md",
    },
    {
      to: "/dashboard/calendar",
      label: "ปฏิทินมงคล ๑๐๐ ปี",
      // Sacred Lunar Crescent Almanac
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
          <rect x="3" y="4" width="18" height="17" rx="2.5" />
          <path d="M16 2v4M8 2v4M3 9.5h18" strokeLinecap="round" />
          <path d="M12 12a3 3 0 0 0 3 3 3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 0 3-3z" fill="currentColor" fillOpacity={0.25} />
        </svg>
      ),
      badgeClass: "bg-white dark:bg-[#0A2240] text-[#C6A96B] dark:text-[#F8F6F1] border border-[#C6A96B]/40 shadow-md",
    },
  ];

  return (
    <div className="md:hidden fixed right-4 z-50 select-none" style={{ bottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={close}
          className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-sm z-40 transition-opacity animate-fadeIn"
        />
      )}

      {/* Floating Speed Dial Actions */}
      <div className="relative z-50 flex flex-col items-end gap-3">
        {isOpen && (
          <div id="mobile-quick-menu" className="flex flex-col items-end gap-3 mb-1 motion-safe:animate-scaleUp">
            {menuItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={close}
                className="flex items-center gap-3 group active:scale-95 transition-all"
              >
                {/* High-Contrast Crisp Large Label Pill in Light & Dark Themes */}
                <span className="px-4 py-2 rounded-2xl bg-white/95 dark:bg-[#071427]/95 backdrop-blur-md border border-[#C6A96B]/50 text-slate-900 dark:text-[#F8F6F1] font-sarabun text-[14px] sm:text-[15px] font-bold shadow-xl shadow-black/20 dark:shadow-black/70 tracking-normal transition-colors">
                  {item.label}
                </span>

                {/* Distinct Astrological Icon Badge */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 shrink-0 ${item.badgeClass}`}
                >
                  {item.icon}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Main Floating Trigger Button — Astral Imperial Crest */}
        <button
          type="button"
          onClick={toggle}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-90 cursor-pointer ${
            isOpen
              ? "bg-white dark:bg-[#0A2240] text-[#C6A96B] rotate-90 border-2 border-[#C6A96B] shadow-amber-500/20"
              : "bg-[#07172A] text-[#FDF8E8] shadow-black/30 border-2 border-[#C6A96B]/60 hover:border-[#C6A96B]"
          }`}
          style={{ width: "56px", height: "56px" }}
          aria-label={isOpen ? "ปิดเมนูลัด" : "เปิดเมนูลัด"}
          aria-expanded={isOpen}
          aria-controls={isOpen ? "mobile-quick-menu" : undefined}
        >
          {isOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-6 h-6">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
              {/* 8-Ray Auspicious Astrological Star */}
              <path
                d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z"
                fill="#C6A96B"
              />
              <path
                d="M12 5.5L13.5 10L18 11.5L13.5 13L12 17.5L10.5 13L6 11.5L10.5 10L12 5.5Z"
                fill="#FFF"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
