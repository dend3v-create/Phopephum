import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { supportedLngs, fallbackLng } from "./language";

import thCommon from "../../locales/th/common.json";
import thHoroscope from "../../locales/th/horoscope.json";
import thYam from "../../locales/th/yam.json";

i18n
  .use(initReactI18next)
  .init({
    lng: "th",
    fallbackLng: "th",
    supportedLngs: ["th"],
    defaultNS: "common",
    resources: {
      th: { common: thCommon, horoscope: thHoroscope, yam: thYam },
    },
    interpolation: {
      escapeValue: false
    },
    initImmediate: false,
  } as any);

export default i18n;
