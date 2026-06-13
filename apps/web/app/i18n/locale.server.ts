import { parse as parseCookie } from "cookie";
import type { Locale } from "./translations";
import { LOCALES } from "./translations";

export function getLocaleFromRequest(request: Request): Locale {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const cookies = parseCookie(cookieHeader);

  // 1. Cookie preference
  if (cookies.locale && LOCALES.includes(cookies.locale as Locale)) {
    return cookies.locale as Locale;
  }

  // 2. Accept-Language header
  const acceptLang = request.headers.get("Accept-Language") ?? "";
  if (acceptLang.includes("zh")) return "zh";
  if (acceptLang.includes("en")) return "en";

  // 3. Default: Thai
  return "th";
}

export function getThemeFromRequest(request: Request): "dark" | "light" {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const cookies = parseCookie(cookieHeader);
  return cookies.theme === "light" ? "light" : "dark";
}
