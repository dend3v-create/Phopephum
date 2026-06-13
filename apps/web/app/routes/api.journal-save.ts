import { json } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { getThailandTodayDateString } from "~/services/rewards.server";
import type { Env } from "~/env.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const formData = await request.formData();
  
  const question = String(formData.get("question") || "").trim();
  const answer = String(formData.get("answer") || "").trim();
  const energyRating = parseInt(String(formData.get("energyRating") || "3"), 10);

  if (!question || !answer) {
    return json({ error: "ข้อมูลคำถามหรือคำตอบไม่ครบถ้วน" }, { status: 400 });
  }

  const { supabase } = createSupabaseClient(request, env);
  const today = getThailandTodayDateString();

  const { data, error } = await supabase
    .from("user_journals")
    .insert({
      user_id: user.id,
      journal_date: today,
      journal_content: answer, // Save AI answer here
      affirmation_received: question, // Save user question here
      energy_rating: energyRating,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[api.journal-save] Error saving journal:", error);
    return json({ error: `ไม่สามารถบันทึก Wisdom Journal ได้: ${error.message}` }, { status: 500 });
  }

  return json({ success: true, journalId: data.id });
}
