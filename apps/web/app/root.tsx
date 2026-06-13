import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import stylesheet from "~/styles/app.css?url";
import { getLocaleFromRequest, getThemeFromRequest } from "~/i18n/locale.server";
import { LocaleContext } from "~/i18n/context";
import { LOCALE_LANG } from "~/i18n/translations";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const locale = getLocaleFromRequest(request);
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
  // useLoaderData is safe inside Layout — Remix v2 supports it here
  const data = useLoaderData<typeof loader>();
  const theme = data?.theme ?? "dark";
  const locale = data?.locale ?? "th";

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

        {/* Technical SEO & Mobile */}
        <meta name="theme-color" content={themeColor} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />

        <Meta />
        <Links />
      </head>
      <body className="cosmic-ocean-bg text-theme-body font-sarabun antialiased">
        <LocaleContext.Provider value={{ locale, theme }}>
          {children}
        </LocaleContext.Provider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
