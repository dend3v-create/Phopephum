import { createContext, useContext } from "react";
import type { Locale, Namespace } from "./translations";
import { t as tFn } from "./translations";

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
  const locale = useLocale();
  return (key: string) => tFn(ns, locale, key);
}
