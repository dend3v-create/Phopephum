import { json } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { compareTimingWindows } from "~/services/timingComparison.server";
import type { CandidateWindowInput } from "@phopephum/types";
import type { Env } from "~/env.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  const contentType = request.headers.get("content-type") || "";
  let question = "";
  let activity = "ทำสัญญา";
  let date = "";
  let customWindows: CandidateWindowInput[] | undefined;

  if (contentType.includes("application/json")) {
    const body = await request.json<any>();
    question = String(body.question || "").trim();
    activity = String(body.activity || "ทำสัญญา").trim();
    date = String(body.date || "").trim();
    if (Array.isArray(body.windows) && body.windows.length >= 2) {
      customWindows = body.windows;
    }
  } else {
    const formData = await request.formData();
    question = String(formData.get("question") || "").trim();
    activity = String(formData.get("activity") || "ทำสัญญา").trim();
    date = String(formData.get("date") || "").trim();

    const winAStart = String(formData.get("winA_start") || "").trim();
    const winAEnd = String(formData.get("winA_end") || "").trim();
    const winBStart = String(formData.get("winB_start") || "").trim();
    const winBEnd = String(formData.get("winB_end") || "").trim();
    const winCStart = String(formData.get("winC_start") || "").trim();
    const winCEnd = String(formData.get("winC_end") || "").trim();

    if (winAStart && winAEnd && winBStart && winBEnd) {
      customWindows = [
        { id: "A", label: "ช่วงเวลา A", start: winAStart, end: winAEnd },
        { id: "B", label: "ช่วงเวลา B", start: winBStart, end: winBEnd },
      ];
      if (winCStart && winCEnd) {
        customWindows.push({ id: "C", label: "ช่วงเวลา C", start: winCStart, end: winCEnd });
      }
    }
  }

  const { supabase } = createSupabaseClient(request, env);

  try {
    const result = await compareTimingWindows({
      question,
      activity,
      date: date || undefined,
      customWindows,
      userId: user.id,
      supabase,
      aiWorkerUrl: env.AI_WORKER_URL,
      aiWorkerSecret: env.AI_WORKER_SECRET,
      userName: profile?.display_name || "คุณ",
    });

    return json({ success: true, result });
  } catch (err: any) {
    console.error("[api.timing-compare] Error comparing timing windows:", err);
    return json(
      { error: err?.message || "เกิดข้อผิดพลาดในการเปรียบเทียบช่วงเวลา" },
      { status: 500 }
    );
  }
}
