import { json, redirect } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { serialize } from "cookie";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const theme = formData.get("theme") as string | null;
  const locale = formData.get("locale") as string | null;

  const headers = new Headers();

  const cookieOpts = {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax" as const,
    httpOnly: false, // readable by JS for instant UI update
    secure: true, // Cloudflare Pages always serves over HTTPS
  };

  if (theme === "dark" || theme === "light") {
    headers.append("Set-Cookie", serialize("theme", theme, cookieOpts));
  }
  if (locale === "th" || locale === "en" || locale === "zh") {
    headers.append("Set-Cookie", serialize("locale", locale, cookieOpts));
  }

  // Redirect back to referer or root
  const referer = request.headers.get("Referer") ?? "/";
  return redirect(referer, { headers });
}

// No loader needed — action only
export async function loader() {
  return json({ ok: true });
}
