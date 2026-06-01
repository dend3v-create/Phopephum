import { redirect } from "@remix-run/cloudflare";
import { createSupabaseClient } from "./supabase.server";
import { createClient } from "@supabase/supabase-js"; // เพิ่มการ import client ปกติ
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

export async function requireOperator(request: Request, env: Env) {
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);
  if (profile?.role !== "operator" && profile?.role !== "admin") {
    throw redirect("/dashboard");
  }
  return { user, profile };
}

/**
 * ตรวจสอบว่าผู้ใช้เป็นสมาชิกที่ชำระเงินแล้ว
 * Free tier (subscription="free") → redirect ไป /pricing?upgrade=1
 */
export async function requirePaidPlan(request: Request, env: Env) {
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);
  // isPaid = subscription เป็นค่าชำระเงินแล้ว (basic/premium/lifetime)
  // null, undefined, "free" ทั้งหมดถือว่า free tier
  const PAID_SUBS = ["basic", "premium", "lifetime"];
  const isPaid = profile && PAID_SUBS.includes(profile.subscription ?? "");
  if (!isPaid) {
    throw redirect("/pricing?upgrade=1");
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
  env: Env,
  metadata?: {
    fullName?: string;
    birthDate?: string;
    birthTime?: string;
    birthPlace?: string;
    gender?: string;
    referred_by?: string;
  }
) {
  const { supabase, headers } = createSupabaseClient(request, env);
  
  // 1. สมัครสมาชิกในระบบ Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { 
      data: { 
        display_name: displayName,
      } 
    },
  });

  if (error) return { user: null, error, headers };
  if (!data.user) return { user: null, error: new Error("Registration failed"), headers };

  // 2. สร้าง Profile โดยใช้ Service Role (ถ้ามี) เพื่อข้าม RLS
  const isAdmin = email === "dend3v@gmail.com";
  
  // ใช้ Service Role Key เพื่อความชัวร์ในการเขียนข้อมูลสิทธิ์
  const adminClient = env.SUPABASE_SERVICE_ROLE_KEY 
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    : supabase;

  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert({
      id: data.user.id,
      email: email,
      display_name: displayName,
      full_name: metadata?.fullName || displayName,
      birth_date: metadata?.birthDate || null,
      birth_time: metadata?.birthTime || null,
      birth_place: metadata?.birthPlace || null,
      gender: metadata?.gender || null,
      referred_by: metadata?.referred_by || null,
      role: isAdmin ? "admin" : "user",
      subscription: isAdmin ? "lifetime" : "free",
      plan: isAdmin ? "imperial" : "basic",
      membership_status: isAdmin ? "active" : "pending"
    });

  if (profileError) {
    console.error("Profile creation error:", profileError);
  }
  
  return { user: data.user, session: data.session, error: null, headers };
}

export async function signOut(request: Request, env: Env) {
  const { supabase, headers } = createSupabaseClient(request, env);
  await supabase.auth.signOut();
  return { headers };
}

export async function getProfile(userId: string, request: Request, env: Env) {
  const { supabase } = createSupabaseClient(request, env);
  
  // 1. ดึงข้อมูลโปรไฟล์ปัจจุบัน
  let { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  // 2. ระบบ Self-Healing สำหรับ System Admin (คุณเด่น)
  // ถ้าเป็นคุณเด่น แต่ข้อมูลหาย (เพราะ Reset DB) หรือยังไม่เป็น Admin
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user?.email === "dend3v@gmail.com" && (error || !data || data.role !== 'admin')) {
    console.log("🛠️ Detecting Admin account - Triggering Self-Healing...");
    
    const adminClient = env.SUPABASE_SERVICE_ROLE_KEY 
      ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
      : supabase;

    const { data: healedProfile, error: healError } = await adminClient
      .from("profiles")
      .upsert({
        id: userId,
        email: user.email,
        display_name: data?.display_name || "System Admin",
        role: 'admin',
        subscription: 'lifetime',
        plan: 'imperial',
        membership_status: 'active'
      })
      .select()
      .single();

    if (!healError && healedProfile) {
      return healedProfile;
    } else {
      console.error("❌ Admin Self-Healing failed:", healError);
    }
  }

  return data;
}
