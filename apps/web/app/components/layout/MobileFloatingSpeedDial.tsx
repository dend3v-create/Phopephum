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
    <div className="md:hidden fixed bottom-[76px] right-4 z-50 select-none">
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
          <div className="flex flex-col items-end gap-2.5 mb-1 animate-scaleUp">
            {menuItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={close}
                className="flex items-center gap-2.5 group active:scale-95 transition-all"
              >
                {/* High-Contrast Crisp Label Pill in Light & Dark Themes */}
                <span className="px-3.5 py-1.5 rounded-xl bg-white/95 dark:bg-[#071427]/95 backdrop-blur-md border border-[#C6A96B]/40 text-[#0F172A] dark:text-[#F8F6F1] font-sans text-xs font-bold shadow-lg shadow-black/20 dark:shadow-black/60 tracking-wide transition-colors">
                  {item.label}
                </span>

                {/* Distinct Astrological Icon Badge */}
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 ${item.badgeClass}`}
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
          className={`w-13 h-13 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-90 cursor-pointer ${
            isOpen
              ? "bg-white dark:bg-[#0A2240] text-[#C6A96B] rotate-90 border-2 border-[#C6A96B] shadow-amber-500/20"
              : "bg-gradient-to-tr from-[#0F172A] via-[#1E3A8A] to-[#2563EB] text-[#F8F6F1] shadow-[#1E3A8A]/50 border-2 border-[#C6A96B]/60 hover:border-[#C6A96B]"
          }`}
          style={{ width: "52px", height: "52px" }}
          aria-label="Toggle Quick Navigation"
        >
          {isOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
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
