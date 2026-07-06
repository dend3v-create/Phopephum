import { redirect, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { createSupabaseClient } from "~/services/supabase.server";
import type { Env } from "~/env.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  if (code) {
    const { supabase, headers } = createSupabaseClient(request, env);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return redirect(next, {
        headers,
      });
    }
    
    console.error("Exchange code error:", error);
  }

  // หากไม่มี code หรือมี error ให้กลับไปหน้าเข้าสู่ระบบ
  return redirect("/login");
}
