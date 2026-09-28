import React, { useState } from "react";
import { Link, useLocation } from "@remix-run/react";

export function MobileFloatingSpeedDial() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const toggle = () => setIsOpen((prev) => !prev);
  const close = () => setIsOpen(false);

  const menuItems = [
    {
      to: "/dashboard/chat",
      label: "Wisdom AI ปัญญาญาณ",
      icon: (
        <span className="text-base">✨</span>
      ),
      badgeColor: "bg-[#1E3A8A] text-white",
    },
    {
      to: "/dashboard",
      label: "แดชบอร์ดภาพรวม",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
      badgeColor: "bg-white text-black",
    },
    {
      to: "/dashboard/horoscope",
      label: "ผังดวง ๗ ตัว ๙ ฐาน",
      icon: (
        <span className="font-serif font-black text-sm">∑</span>
      ),
      badgeColor: "bg-white text-black",
    },
    {
      to: "/dashboard/check-yam",
      label: "ยามอัฏฐกาล ๑๖ ยาม",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      badgeColor: "bg-white text-black",
    },
    {
      to: "/dashboard/calendar",
      label: "ปฏิทินมงคล ๑๐๐ ปี",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" />
          <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
        </svg>
      ),
      badgeColor: "bg-white text-black",
    },
  ];

  return (
    <div className="md:hidden fixed bottom-[76px] right-4 z-50 select-none">
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={close}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity animate-fadeIn"
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
                <span className="px-3 py-1.5 rounded-xl bg-[#0F172A]/90 backdrop-blur-md border border-[#C6A96B]/20 text-[#F8F6F1] font-sans text-xs font-semibold shadow-lg shadow-black/50">
                  {item.label}
                </span>
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg border border-white/20 transition-transform group-hover:scale-105 ${item.badgeColor}`}
                >
                  {item.icon}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Main Floating Trigger Button */}
        <button
          type="button"
          onClick={toggle}
          className={`w-13 h-13 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-90 cursor-pointer ${
            isOpen
              ? "bg-white text-black rotate-90 border-2 border-[#C6A96B]"
              : "bg-gradient-to-tr from-[#1E3A8A] via-[#2563EB] to-[#3B82F6] text-white shadow-[#2563EB]/40 border border-white/30"
          }`}
          style={{ width: "52px", height: "52px" }}
          aria-label="Toggle Quick Navigation"
        >
          {isOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6L12 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
