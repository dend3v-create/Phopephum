import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
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
import i18nInstance from "~/lib/i18n/i18n.client";

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
    href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Sans+Thai:wght@300;400;500;600&display=swap",
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

  // CRITICAL: Synchronously sync i18n instance with loader locale before render
  // This prevents hydration mismatch #418/#423
  if (typeof window !== "undefined" && i18nInstance.language !== locale) {
    i18nInstance.changeLanguage(locale);
  }

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
