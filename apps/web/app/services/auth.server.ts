import { redirect } from "@remix-run/cloudflare";
import { createSupabaseClient } from "./supabase.server";
import type { Env } from "~/env.server";

export async function getUser(request: Request, env: Env) {
  const { supabase } = createSupabaseClient(request, env);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth(request: Request, env: Env) {
  const user = await getUser(request, env);
  if (!user) throw redirect("/login");
  return user;
}

export async function requireAdmin(request: Request, env: Env) {
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);
  if (profile?.role !== "admin") {
    throw redirect("/dashboard");
  }
  return { user, profile };
}

export async function redirectIfAuthed(request: Request, env: Env) {
  const user = await getUser(request, env);
  if (user) throw redirect("/dashboard");
}

export async function signIn(
  email: string,
  password: string,
  request: Request,
  env: Env
) {
  const { supabase, headers } = createSupabaseClient(request, env);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { user: data.user, session: data.session, error, headers };
}

export async function signUp(
  email: string,
  password: string,
  displayName: string,
  request: Request,
  env: Env
) {
  const { supabase, headers } = createSupabaseClient(request, env);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  return { user: data.user, session: data.session, error, headers };
}

export async function signOut(request: Request, env: Env) {
  const { supabase, headers } = createSupabaseClient(request, env);
  await supabase.auth.signOut();
  return { headers };
}

export async function getProfile(userId: string, request: Request, env: Env) {
  const { supabase } = createSupabaseClient(request, env);
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
}
