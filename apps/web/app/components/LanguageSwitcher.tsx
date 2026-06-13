import { useFetcher } from "@remix-run/react";
import { useLocale } from "~/i18n/context";
import { LOCALES, LOCALE_LABELS } from "~/i18n/translations";
import type { Locale } from "~/i18n/translations";

export function LanguageSwitcher() {
  const fetcher = useFetcher();
  const locale = useLocale();

  function handleSwitch(next: Locale) {
    if (next === locale) return;
    fetcher.submit(
      { locale: next },
      { method: "post", action: "/action/preferences" }
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => handleSwitch(l)}
          className={`px-2 py-1 text-[11px] font-bold tracking-wider rounded transition-all duration-200 ${
            l === locale
              ? "text-[var(--accent-gold)] bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/30"
              : "text-[var(--text-muted)] hover:text-[var(--text-body)] border border-transparent"
          }`}
          aria-label={`Switch to ${l}`}
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
