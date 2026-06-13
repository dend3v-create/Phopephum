import { useFetcher } from "@remix-run/react";
import { useTheme, useT } from "~/i18n/context";

export function ThemeToggle() {
  const fetcher = useFetcher();
  const t = useT("common");
  const currentTheme = useTheme();
  const nextTheme = currentTheme === "dark" ? "light" : "dark";

  return (
    <fetcher.Form method="post" action="/action/preferences">
      <input type="hidden" name="theme" value={nextTheme} />
      <button
        type="submit"
        title={nextTheme === "light" ? t("theme.light") : t("theme.dark")}
        className="flex items-center justify-center w-8 h-8 rounded-full border border-[var(--border-gold)] text-[var(--text-muted)] hover:text-[var(--accent-gold)] hover:border-[var(--accent-gold)] transition-all duration-200"
        aria-label="Toggle theme"
      >
        {currentTheme === "dark" ? (
          /* Sun icon */
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
          </svg>
        ) : (
          /* Moon icon */
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </fetcher.Form>
  );
}
