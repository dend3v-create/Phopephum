import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
  useRouteLoaderData,
} from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { I18nextProvider } from "react-i18next";
import stylesheet from "~/styles/app.css?url";
import { getThemeFromRequest } from "~/i18n/locale.server";
import i18next from "~/lib/i18n/i18n.server";
import { LocaleProvider } from "~/i18n/context";
import { LOCALE_LANG } from "~/i18n/translations";
import type { Locale } from "~/i18n/translations";
import i18nInstance from "~/lib/i18n/i18n.shared";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const locale = await i18next.getLocale(request);
  const theme = getThemeFromRequest(request);
  return json({ locale, theme });
};

export const links: LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  { rel: "apple-touch-icon", href: "/favicon.svg" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Sarabun:wght@300;400;500;600;700&family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Sans+Thai:wght@300;400;500;600&display=swap",
  },
  { rel: "stylesheet", href: stylesheet },
];

export function Layout({ children }: { children: React.ReactNode }) {
  // useRouteLoaderData returns undefined (instead of throwing) when called in
  // error boundary context — safe to use in the Layout export which wraps
  // both normal renders AND ErrorBoundary renders.
  const data = useRouteLoaderData<typeof loader>("root");
  const theme = data?.theme ?? "dark";
  const locale = (data?.locale ?? "th") as Locale;

  const themeColor = theme === "light" ? "#F5F0E8" : "#020617";

  return (
    <html
      lang={LOCALE_LANG[locale] ?? "th"}
      data-theme={theme}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={themeColor} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <Meta />
        <Links />
      </head>
      <body className="cosmic-ocean-bg text-theme-body font-sarabun antialiased">
        <I18nextProvider i18n={i18nInstance}>
          <LocaleProvider locale={locale} theme={theme}>
            {children}
          </LocaleProvider>
        </I18nextProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  let status = 500;
  let title = "เกิดข้อผิดพลาดในการเชื่อมต่อมิติกาลเวลา";
  let message = "ระบบไม่สามารถประมวลผลคำขอนี้ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง";

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (status === 404) {
      title = "404 — ไม่พบหน้านี้ในระบบกาลเวลา";
      message = "หน้าที่คุณกำลังค้นหาอาจถูกย้าย หรือไม่มีอยู่ในมิตินี้ กรุณาตรวจสอบ URL หรือกลับสู่หน้าหลัก";
    } else {
      title = `${status} — เกิดข้อผิดพลาดในระบบ`;
      message = error.data?.message || error.statusText || message;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#020617] text-[#F8F6F1]">
      <div className="max-w-md w-full rounded-2xl border border-[#C6A96B]/30 bg-[#0A1628]/85 backdrop-blur-xl p-6 sm:p-8 text-center shadow-2xl shadow-black/50">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#C6A96B]/15 border border-[#C6A96B]/40 flex items-center justify-center text-2xl font-bold font-display text-[#C6A96B]">
          {status === 404 ? "✦" : "!"}
        </div>
        <h1 className="text-xl sm:text-2xl font-bold font-display text-[#F8F6F1] mb-2 tracking-wide">
          {title}
        </h1>
        <p className="text-sm text-slate-300 dark:text-slate-400 mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2.5 rounded-xl border border-[#C6A96B]/40 text-[#F6D88C] hover:bg-[#C6A96B]/10 font-semibold text-sm transition-all"
          >
            โหลดใหม่อีกครั้ง
          </button>
          <a
            href="/"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] font-bold text-sm shadow-md shadow-[#C6A96B]/20 hover:scale-102 active:scale-98 transition-all"
          >
            กลับสู่หน้าหลัก
          </a>
        </div>
      </div>
    </div>
  );
}
