import { useFetcher } from "@remix-run/react";
import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const fetcher = useFetcher();

  const languages = [
    { code: "th", label: "ไทย", flag: "🇹🇭" },
    { code: "en", label: "EN", flag: "🇺🇸" },
    { code: "zh", label: "中文", flag: "🇨🇳" },
  ];

  const handleLanguageChange = (lng: string) => {
    // 1. Instant client update for UX
    i18n.changeLanguage(lng);
    
    // 2. Server-side update for persistence (Set-Cookie)
    const formData = new FormData();
    formData.append("locale", lng);
    fetcher.submit(formData, { method: "post", action: "/action/preferences" });
  };

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm">
      {languages.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => handleLanguageChange(lang.code)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
            i18n.language === lang.code
              ? "bg-theme-accent text-white shadow-lg shadow-theme-accent/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <span className="mr-1.5">{lang.flag}</span>
          {lang.label}
        </button>
      ))}
    </div>
  );
}
