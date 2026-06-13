import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    // Persistence: Set cookie for the server to pick up
    document.cookie = `locale=${lng}; path=/; max-age=31536000; SameSite=Lax`;
    // Optional: reload to ensure server-side translations are consistent (or just let Remix re-fetch)
    window.location.reload();
  };

  const languages = [
    { code: "th", label: "ไทย", flag: "🇹🇭" },
    { code: "en", label: "EN", flag: "🇺🇸" },
    { code: "zh", label: "中文", flag: "🇨🇳" },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLanguage(lang.code)}
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
