import { json } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import {
  upsertWisdomOutcome,
  deleteWisdomOutcome,
  type ActualResult,
  type OutcomeStatus,
} from "~/services/wisdom.server";
import type { Env } from "~/env.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const formData = await request.formData();

  const intent = String(formData.get("intent") || "upsert").trim();
  const queryId = String(formData.get("queryId") || "").trim();

  if (!queryId) {
    return json({ error: "queryId is required" }, { status: 400 });
  }

  const { supabase } = createSupabaseClient(request, env);

  if (intent === "delete") {
    const ok = await deleteWisdomOutcome(supabase, user.id, queryId);
    return json({ success: ok });
  }

  const status = (formData.get("status") as OutcomeStatus) || "completed";
  const actionTakenRaw = formData.get("actionTaken");
  const actionTaken =
    actionTakenRaw === "true" || actionTakenRaw === "1"
      ? true
      : actionTakenRaw === "false" || actionTakenRaw === "0"
      ? false
      : null;

  const actualResult = (formData.get("actualResult") as ActualResult) || null;
  const userNotes = formData.get("userNotes") ? String(formData.get("userNotes")).trim() : null;
  const occurredAt = formData.get("occurredAt") ? String(formData.get("occurredAt")).trim() : null;

  const ratingRaw = formData.get("feedbackRating");
  const feedbackRating = ratingRaw ? parseInt(String(ratingRaw), 10) : null;

  const outcome = await upsertWisdomOutcome(supabase, user.id, {
    queryId,
    status,
    actionTaken,
    actualResult,
    userNotes,
    occurredAt,
    feedbackRating,
  });

  if (!outcome) {
    return json(
      { error: "ไม่สามารถบันทึกผลลัพธ์ได้ กรุณาตรวจสอบสิทธิ์ของคำถามนี้" },
      { status: 403 }
    );
  }

  return json({ success: true, outcome });
}
