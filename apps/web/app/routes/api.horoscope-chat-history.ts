import { json } from "@remix-run/cloudflare";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import type { Env } from "~/env.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const url = new URL(request.url);
  const subjectName = (url.searchParams.get("subjectName") || "").trim();

  const { supabase } = createSupabaseClient(request, env);

  try {
    let query = supabase
      .from("horoscope_chats")
      .select("id, subject_name, question, answer, filter_type, filter_value, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(30);

    if (subjectName) {
      query = query.eq("subject_name", subjectName);
    }

    const { data, error } = await query;

    if (error) {
      // If table doesn't exist yet, return empty list gracefully
      return json({ chats: [] });
    }

    return json({ chats: data || [] });
  } catch {
    return json({ chats: [] });
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);

  let body: {
    subjectName?: string;
    birthDate?: string;
    question: string;
    answer: string;
    filterType?: string;
    filterValue?: string;
  };

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { question, answer } = body;
  if (!question || !answer) {
    return json({ error: "Missing question or answer" }, { status: 400 });
  }

  const { supabase } = createSupabaseClient(request, env);

  try {
    const { data, error } = await supabase
      .from("horoscope_chats")
      .insert({
        user_id: user.id,
        subject_name: body.subjectName?.trim() || "เจ้าชะตา",
        birth_date: body.birthDate || null,
        question: question.trim(),
        answer: answer.trim(),
        filter_type: body.filterType || null,
        filter_value: body.filterValue ? String(body.filterValue) : null,
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[api.horoscope-chat-history] Save error:", error.message);
      return json({ success: false, error: error.message });
    }

    return json({ success: true, id: data?.id });
  } catch (err: any) {
    return json({ success: false, error: err?.message || "Internal error" });
  }
}
