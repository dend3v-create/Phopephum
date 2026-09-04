/**
 * api.wisdom-intelligence.ts — STEP 4.5 Personal Wisdom Intelligence API
 *
 * GET /api/wisdom-intelligence
 * Fetches the user's aggregated patterns, personal wisdom intelligence, and action recommendations.
 */

import { json } from "@remix-run/cloudflare";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { generatePersonalWisdomIntelligence } from "~/services/wisdomIntelligence.server";
import type { Env } from "~/env.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const { supabase } = createSupabaseClient(request, env);

  try {
    const intelligence = await generatePersonalWisdomIntelligence({
      userId: user.id,
      supabase,
      aiWorkerUrl: env.AI_WORKER_URL,
      aiWorkerSecret: env.AI_WORKER_SECRET,
      userName: user.user_metadata?.full_name || user.email?.split("@")[0],
    });

    return json({ success: true, intelligence });
  } catch (err: any) {
    console.error("[api.wisdom-intelligence] Error generating intelligence:", err);
    return json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
