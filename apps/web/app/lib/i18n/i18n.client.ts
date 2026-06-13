import i18n from "i18next";
import { initReactI18next } from "react-i18next";
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

i18n
  .use(initReactI18next)
  .init({
    fallbackLng,
    supportedLngs,
    defaultNS: "common",
    resources: {
      th: { common: thCommon, horoscope: thHoroscope, yam: thYam },
      en: { common: enCommon, horoscope: enHoroscope, yam: enYam },
      zh: { common: zhCommon, horoscope: zhHoroscope, yam: zhYam }
    },
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
