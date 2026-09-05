/**
 * api.calendar-day.ts — STEP 5.1 Calendar Day Intelligence API
 *
 * GET /api/calendar-day?date=YYYY-MM-DD
 * Returns detailed CalendarDayIntelligence (Golden Window, Timeline, 4 Domains, Plain-language Theme)
 */

import { json } from "@remix-run/cloudflare";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { getProfile, requireAuth } from "~/services/auth.server";
import { calculateDayIntelligence } from "~/services/calendarIntelligence.server";
import { getAstrologicalDateStr } from "@phopephum/engine";
import type { Env } from "~/env.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  const url = new URL(request.url);
  const dateStr = url.searchParams.get("date") || getAstrologicalDateStr();

  try {
    const dayIntelligence = await calculateDayIntelligence(dateStr, profile ? {
      birthDate: profile.birth_date,
      birthTime: profile.birth_time,
      birthPlace: profile.birth_place,
      displayName: profile.display_name,
    } : null);

    return json({ success: true, dayIntelligence });
  } catch (err: any) {
    console.error("[api.calendar-day] Error calculating day intelligence:", err);
    return json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
