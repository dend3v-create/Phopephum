/**
 * api.reminders.ts — STEP 5.2 Personal Timing Reminder API Endpoint
 * 
 * Handles:
 * GET  /api/reminders           -> Fetch eligible reminders, unread count & user settings
 * POST /api/reminders           -> Mark reminder as read / dismiss
 * PUT  /api/reminders           -> Update user reminder preferences
 */

import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth } from "../services/auth.server";
import { createSupabaseClient } from "../services/supabase.server";
import { getProfile } from "../services/auth.server";
import {
  getTimingRemindersForUser,
  markReminderAsRead,
  updateReminderSettings,
} from "../services/timingReminder.server";
import type { Env } from "../env.server";
import type { TimingReminderSettings } from "@phopephum/types";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);
  const { supabase, headers } = createSupabaseClient(request, env);

  const url = new URL(request.url);
  const dateStr = url.searchParams.get("date") || undefined;

  const result = await getTimingRemindersForUser({
    userId: user.id,
    supabase,
    dateStr,
    profile: profile
      ? {
          birthDate: profile.birthDate,
          birthTime: profile.birthTime,
          displayName: profile.displayName,
        }
      : null,
  });

  return json(
    {
      ok: true,
      reminders: result.reminders,
      unreadCount: result.unreadCount,
      settings: result.settings,
    },
    { headers }
  );
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const { supabase, headers } = createSupabaseClient(request, env);

  let body: any = {};
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    }
  } catch (err) {
    return json({ ok: false, error: "Invalid payload" }, { status: 400, headers });
  }

  const intent = body.intent || body._action;

  // 1. Mark as read
  if (intent === "mark_read") {
    const reminderId = body.reminderId as string;
    if (!reminderId) {
      return json({ ok: false, error: "Missing reminderId" }, { status: 400, headers });
    }

    const success = await markReminderAsRead(user.id, reminderId, supabase);
    return json({ ok: true, success }, { headers });
  }

  // 2. Update settings
  if (intent === "update_settings") {
    const newSettings = body.settings as Partial<TimingReminderSettings>;
    if (!newSettings || typeof newSettings !== "object") {
      return json({ ok: false, error: "Invalid settings payload" }, { status: 400, headers });
    }

    const success = await updateReminderSettings(user.id, newSettings, supabase);
    return json({ ok: true, success }, { headers });
  }

  return json({ ok: false, error: "Unknown intent" }, { status: 400, headers });
}
