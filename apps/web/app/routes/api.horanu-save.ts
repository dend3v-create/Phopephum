import { json } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import type { Env } from "~/env.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const formData = await request.formData();
  
  const question = String(formData.get("question") || "").trim();
  const answer = String(formData.get("answer") || "").trim();
  const lockedTime = String(formData.get("lockedTime") || "").trim();

  if (!question || !answer) {
    return json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  }

  const { supabase } = createSupabaseClient(request, env);

  const { data, error } = await supabase
    .from("horanu_chats")
    .insert({
      user_id: user.id,
      question,
      answer,
      locked_time: lockedTime ? new Date(lockedTime).toISOString() : new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[api.horanu-save] Error saving chat:", error);
    return json({ error: `ไม่สามารถบันทึกประวัติการถามตอบได้: ${error.message}` }, { status: 500 });
  }

  return json({ success: true, chatId: data?.id });
}
