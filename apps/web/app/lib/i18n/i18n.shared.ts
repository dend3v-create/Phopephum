import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { supportedLngs, fallbackLng } from "./language";

import thCommon from "../../locales/th/common.json";
import thHoroscope from "../../locales/th/horoscope.json";
import thYam from "../../locales/th/yam.json";

import enCommon from "../../locales/en/common.json";
import enHoroscope from "../../locales/en/horoscope.json";
import enYam from "../../locales/en/yam.json";

import zhCommon from "../../locales/zh/common.json";
import zhHoroscope from "../../locales/zh/horoscope.json";
import zhYam from "../../locales/zh/yam.json";

if (typeof window !== "undefined") {
  i18n.use(LanguageDetector);
}

i18n
  .use(initReactI18next)
  .init({
    lng: "th",
    fallbackLng,
    supportedLngs,
    defaultNS: "common",
    resources: {
      th: { common: thCommon, horoscope: thHoroscope, yam: thYam },
      en: { common: enCommon, horoscope: enHoroscope, yam: enYam },
      zh: { common: zhCommon, horoscope: zhHoroscope, yam: zhYam }
    },
    detection: typeof window !== "undefined" ? {
      // Order is critical for hydration sync
      order: ["cookie", "htmlTag", "localStorage", "navigator"],
      lookupCookie: "locale",
      caches: ["cookie"],
    } : undefined,
    interpolation: {
      escapeValue: false
    },
    // Prevent initialization until we have detection result
    initImmediate: false,
  } as any);

export default i18n;
