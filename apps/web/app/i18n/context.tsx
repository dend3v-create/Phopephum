import { createContext, useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Locale, Namespace } from "./translations";

interface LocaleContextValue {
  locale: Locale;
  theme: "dark" | "light";
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: "th",
  theme: "dark",
});

export function useLocale() {
  return useContext(LocaleContext).locale;
}

export function useTheme() {
  return useContext(LocaleContext).theme;
}

/** useT — returns a translation function scoped to a namespace */
export function useT(ns: Namespace) {
  const { t } = useTranslation(ns);
  return t;
}

export function LocaleProvider({ 
  locale, 
  theme, 
  children 
}: LocaleContextValue & { children: React.ReactNode }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale, i18n]);

  return (
    <LocaleContext.Provider value={{ locale, theme }}>
      {children}
    </LocaleContext.Provider>
  );
}
