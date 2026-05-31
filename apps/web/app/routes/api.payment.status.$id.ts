import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import type { Env } from "~/env.server";

/**
 * API: GET /api/payment/status/$id
 * ตรวจสอบสถานะการจ่ายเงิน
 */
export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const requestId = params.id;

  if (!requestId) {
    return json({ error: "Missing request ID" }, { status: 400 });
  }

  const { supabase } = createSupabaseClient(request, env);
  const { data, error } = await supabase
    .from("subscription_requests")
    .select("status, plan")
    .eq("id", requestId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return json({ error: "Request not found" }, { status: 404 });
  }

  return json({
    status: data.status,
    plan: data.plan,
  });
}
