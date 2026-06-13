import { RemixI18Next } from "remix-i18next/server";
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

const i18next = new RemixI18Next({
  detection: {
    supportedLanguages: supportedLngs,
    fallbackLanguage: fallbackLng,
  },
  i18next: {
    supportedLngs,
    fallbackLng,
    defaultNS: "common",
    resources: {
      th: { common: thCommon, horoscope: thHoroscope, yam: thYam },
      en: { common: enCommon, horoscope: enHoroscope, yam: enYam },
      zh: { common: zhCommon, horoscope: zhHoroscope, yam: zhYam }
    }
  },
});

export default i18next;
