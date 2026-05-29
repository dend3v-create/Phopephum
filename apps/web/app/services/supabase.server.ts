import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { serialize, parse } from "cookie";
import type { Env } from "~/env.server";

// สร้าง Supabase client พร้อม headers สำหรับ set cookies
export function createSupabaseClient(request: Request, env: Env) {
  const responseHeaders = new Headers();
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const cookies = parse(cookieHeader);

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return Object.entries(cookies).map(([name, value]) => ({
          name,
          value: value ?? "",
        }));
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          responseHeaders.append(
            "Set-Cookie",
            serialize(name, value, {
              path: "/",
              httpOnly: true,
              sameSite: "lax",
              secure: env.ENVIRONMENT === "production",
              maxAge: 60 * 60 * 24 * 365, // 1 year
              ...options,
            })
          );
        });
      },
    },
  });

  return { supabase, headers: responseHeaders };
}

export async function requireUser(request: Request, env: Env) {
  const { supabase } = createSupabaseClient(request, env);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return user;
}
