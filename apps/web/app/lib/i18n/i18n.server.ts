import { createCookie } from "@remix-run/cloudflare";
import { RemixI18Next } from "remix-i18next/server";
import { supportedLngs, fallbackLng } from "./language";

import thCommon from "../../locales/th/common.json";
import thHoroscope from "../../locales/th/horoscope.json";
import thYam from "../../locales/th/yam.json";

export const localeCookie = createCookie("locale", {
  path: "/",
  sameSite: "lax",
  secure: false, // Allow in dev (HTTP)
  httpOnly: false,
  maxAge: 31536000,
});

const i18next = new RemixI18Next({
  detection: {
    supportedLanguages: ["th"],
    fallbackLanguage: "th",
    cookie: localeCookie,
  },
  i18next: {
    supportedLngs: ["th"],
    fallbackLng: "th",
    defaultNS: "common",
    resources: {
      th: { common: thCommon, horoscope: thHoroscope, yam: thYam },
    }
  },
});

export default i18next;
