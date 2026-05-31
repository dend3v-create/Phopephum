import { json } from "@remix-run/cloudflare";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { calculatePhopephum } from "@phopephum/engine";
import type { Env } from "~/env.server";

/**
 * GET /api/hora
 * Returns systematic prediction for a user or a specific date.
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  
  // 1. Auth & Profile
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  // 2. Parse Check Date
  const url = new URL(request.url);
  const checkDateStr = url.searchParams.get("checkDate");
  const checkDate = checkDateStr ? new Date(checkDateStr) : new Date();

  // 3. Calculate (Systematic v2.0)
  const result = await calculatePhopephum({
    birthDate: profile?.birth_date ?? checkDate.toISOString().split('T')[0],
    birthTime: profile?.birth_time ?? undefined,
  }, checkDate);

  return json({
    success: true,
    data: result,
  });
}
