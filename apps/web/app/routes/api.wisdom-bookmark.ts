import { json } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { toggleWisdomBookmark } from "~/services/wisdom.server";
import type { Env } from "~/env.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const formData = await request.formData();

  const queryId = String(formData.get("queryId") || "").trim();
  const desiredStateRaw = formData.get("desiredState");
  const desiredState =
    desiredStateRaw !== null && desiredStateRaw !== undefined
      ? desiredStateRaw === "true" || desiredStateRaw === "1"
      : undefined;

  if (!queryId) {
    return json({ error: "queryId is required" }, { status: 400 });
  }

  const { supabase } = createSupabaseClient(request, env);
  const result = await toggleWisdomBookmark(supabase, user.id, queryId, desiredState);

  if (!result) {
    return json(
      { error: "ไม่สามารถอัปเดตบุ๊กมาร์กได้ หรือไม่พบข้อมูลที่เป็นของคุณ" },
      { status: 404 }
    );
  }

  return json({ success: true, result });
}
