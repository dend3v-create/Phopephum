import { useState, useEffect, useRef } from "react";
import { useFetcher } from "@remix-run/react";
import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const fetcher = useFetcher();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: "th", label: "ไทย", flag: "🇹🇭" },
    { code: "en", label: "EN", flag: "🇺🇸" },
    { code: "zh", label: "中文", flag: "🇨🇳" },
  ];

  const currentLang = languages.find((lang) => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (lng: string) => {
    // 1. Instant client update for UX
    i18n.changeLanguage(lng);
    
    // 2. Server-side update for persistence (Set-Cookie)
    const formData = new FormData();
    formData.append("locale", lng);
    fetcher.submit(formData, { method: "post", action: "/action/preferences" });
    
    setIsOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* ── Desktop Version ── */}
      <div className="hidden md:flex items-center gap-1.5 p-1 rounded-full bg-[var(--input-bg)] border border-[var(--border-dim)] backdrop-blur-sm">
        {languages.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => handleLanguageChange(lang.code)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap inline-flex items-center ${
              i18n.language === lang.code
                ? "bg-[var(--accent-blue)] text-white shadow-md shadow-[var(--accent-blue)]/10"
                : "text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            <span className="mr-1.5">{lang.flag}</span>
            {lang.label}
          </button>
        ))}
      </div>

      {/* ── Mobile Version (1 Button with Dropdown) ── */}
      <div className="md:hidden flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="h-8 px-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all inline-flex items-center gap-1 card-glass border border-[var(--border-dim)] text-[var(--text-body)] hover:bg-white/5 active:scale-95"
          style={{ border: "1px solid rgba(198,169,107,0.25)" }}
        >
          <span>{currentLang.flag}</span>
          <span>{currentLang.label}</span>
          <svg
            className={`w-3 h-3 text-[var(--accent-gold)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {isOpen && (
          <div
            className="absolute right-0 top-full mt-1.5 w-28 rounded-xl overflow-hidden z-50 border border-[rgba(198,169,107,0.25)] shadow-xl animate-fade-in card-glass-premium"
          >
            <div className="py-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full px-3 py-2 text-left text-xs font-medium transition-all inline-flex items-center gap-2 ${
                    i18n.language === lang.code
                      ? "text-[var(--accent-gold)] bg-white/5"
                      : "text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-white/5"
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

