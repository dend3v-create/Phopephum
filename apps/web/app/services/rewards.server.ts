import { createClient } from "@supabase/supabase-js";
import type { Env } from "~/env.server";

export interface RewardResult {
  success: boolean;
  earned: number;
  message: string;
  newBalance: number;
}

function getServiceRoleClient(env: Env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Get current date in Asia/Bangkok YYYY-MM-DD */
export function getThailandTodayDateString(): string {
  const options = { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" } as const;
  const formatter = new Intl.DateTimeFormat("en-CA", options); // en-CA gives YYYY-MM-DD format
  return formatter.format(new Date());
}

/**
 * 1. ระบบ Login รายวัน (+1 Soul Ink)
 */
export async function checkAndAwardDailyLogin(userId: string, env: Env): Promise<RewardResult> {
  const supabase = getServiceRoleClient(env);
  const today = getThailandTodayDateString();

  // ดึงโปรไฟล์เพื่อเช็คล็อคอินล่าสุด
  const { data: profile, error: fetchErr } = await supabase
    .from("profiles")
    .select("last_login_reward_at, soul_ink")
    .eq("id", userId)
    .single();

  if (fetchErr || !profile) {
    return { success: false, earned: 0, message: "ไม่สามารถดึงข้อมูลโปรไฟล์ได้", newBalance: 0 };
  }

  // เทียบวันเกิดสิทธิ
  if (profile.last_login_reward_at === today) {
    return { success: false, earned: 0, message: "วันนี้รับรางวัลไปแล้ว", newBalance: profile.soul_ink || 0 };
  }

  const newBalance = (profile.soul_ink || 0) + 1;

  // อัปเดตข้อมูลรับรางวัล
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({
      last_login_reward_at: today,
      soul_ink: newBalance
    })
    .eq("id", userId);

  if (updateErr) {
    console.error("[rewards] Daily login reward update failed:", updateErr);
    return { success: false, earned: 0, message: "อัปเดตเหรียญรางวัลล้มเหลว", newBalance: profile.soul_ink || 0 };
  }

  return {
    success: true,
    earned: 1,
    message: "ได้รับรางวัลล็อกอินรายวันประจำวัน +1 Soul Ink!",
    newBalance
  };
}

/**
 * 2. รางวัลเช็คอิน/เปิดไพ่ประจำวัน (+1 Soul Ink)
 */
export async function awardCheckinReward(userId: string, env: Env): Promise<RewardResult> {
  const supabase = getServiceRoleClient(env);
  const today = getThailandTodayDateString();

  // ดึงแผนเพื่อเช็คสถานะการเคลม
  const { data: plan, error: planErr } = await supabase
    .from("daily_plans")
    .select("checkin_reward_claimed")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  if (planErr && planErr.code !== "PGRST116") { // PGRST116 = no rows found
    return { success: false, earned: 0, message: "ไม่สามารถดึงแผนงานรายวันได้", newBalance: 0 };
  }

  if (plan?.checkin_reward_claimed) {
    const { data: p } = await supabase.from("profiles").select("soul_ink").eq("id", userId).single();
    return { success: false, earned: 0, message: "เคลมรางวัลจับไพ่ไปแล้วในวันนี้", newBalance: p?.soul_ink || 0 };
  }

  // ดึงโปรไฟล์เพื่อรับคะแนน
  const { data: profile } = await supabase.from("profiles").select("soul_ink").eq("id", userId).single();
  const currentInk = profile?.soul_ink || 0;
  const newBalance = currentInk + 1;

  // บันทึกและเคลม
  await supabase.from("daily_plans").upsert({
    user_id: userId,
    date: today,
    checkin_reward_claimed: true
  }, { onConflict: "user_id,date" });

  await supabase.from("profiles").update({ soul_ink: newBalance }).eq("id", userId);

  return {
    success: true,
    earned: 1,
    message: "ได้รับรางวัลเปิดไพ่ประจำวัน +1 Soul Ink!",
    newBalance
  };
}

/**
 * 3. รางวัลตั้งเป้าหมายยามเช้า / Intention (+3 Soul Ink)
 */
export async function awardIntentionReward(userId: string, env: Env): Promise<RewardResult> {
  const supabase = getServiceRoleClient(env);
  const today = getThailandTodayDateString();

  const { data: plan } = await supabase
    .from("daily_plans")
    .select("intention_reward_claimed")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  if (plan?.intention_reward_claimed) {
    const { data: p } = await supabase.from("profiles").select("soul_ink").eq("id", userId).single();
    return { success: false, earned: 0, message: "เคลมรางวัลความตั้งใจเช้านี้ไปแล้ว", newBalance: p?.soul_ink || 0 };
  }

  const { data: profile } = await supabase.from("profiles").select("soul_ink").eq("id", userId).single();
  const currentInk = profile?.soul_ink || 0;
  const newBalance = currentInk + 3;

  await supabase.from("daily_plans").upsert({
    user_id: userId,
    date: today,
    intention_reward_claimed: true
  }, { onConflict: "user_id,date" });

  await supabase.from("profiles").update({ soul_ink: newBalance }).eq("id", userId);

  return {
    success: true,
    earned: 3,
    message: "บันทึกความตั้งใจรายวันเสร็จสิ้น ได้รับ +3 Soul Ink!",
    newBalance
  };
}

/**
 * 4. รางวัลทบทวนสะท้อนสติยามเย็น / Reflection (+5 Soul Ink)
 */
export async function awardReflectionReward(userId: string, env: Env): Promise<RewardResult> {
  const supabase = getServiceRoleClient(env);
  const today = getThailandTodayDateString();

  const { data: plan } = await supabase
    .from("daily_plans")
    .select("reflection_reward_claimed")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  if (plan?.reflection_reward_claimed) {
    const { data: p } = await supabase.from("profiles").select("soul_ink").eq("id", userId).single();
    return { success: false, earned: 0, message: "เคลมรางวัลทบทวนชีวิตยามเย็นไปแล้ว", newBalance: p?.soul_ink || 0 };
  }

  const { data: profile } = await supabase.from("profiles").select("soul_ink").eq("id", userId).single();
  const currentInk = profile?.soul_ink || 0;
  const newBalance = currentInk + 5;

  await supabase.from("daily_plans").upsert({
    user_id: userId,
    date: today,
    reflection_reward_claimed: true
  }, { onConflict: "user_id,date" });

  await supabase.from("profiles").update({ soul_ink: newBalance }).eq("id", userId);

  return {
    success: true,
    earned: 5,
    message: "บันทึกสะท้อนคิดยามเย็นเรียบร้อย ได้รับ +5 Soul Ink!",
    newBalance
  };
}

/**
 * 5. รางวัลชวนเพื่อนสมัคร (+50 Soul Ink เข้าผู้แนะนำ)
 */
export async function awardReferralSignupReward(referrerCode: string, referredUserId: string, env: Env): Promise<boolean> {
  if (!referrerCode) return false;
  const supabase = getServiceRoleClient(env);

  // หาผู้แนะนำจากรหัสแนะนำ (referral_code)
  const { data: referrer, error } = await supabase
    .from("profiles")
    .select("id, soul_ink, email")
    .eq("referral_code", referrerCode.trim())
    .single();

  if (error || !referrer) {
    console.error("[rewards] Referral signup lookup error:", error);
    return false;
  }

  // ป้องกันการแฮกชวนตัวเอง
  if (referrer.id === referredUserId) {
    return false;
  }

  // ตรวจสอบว่าเคยเคลมไปหรือยัง (affiliate_referrals)
  const { data: existingRef } = await supabase
    .from("affiliate_referrals")
    .select("id")
    .eq("referrer_id", referrer.id)
    .eq("referred_id", referredUserId)
    .single();

  if (existingRef) {
    return false;
  }

  // อัปเดต Soul Ink ให้ผู้แนะนำ
  const newBalance = (referrer.soul_ink || 0) + 50;
  await supabase
    .from("profiles")
    .update({ soul_ink: newBalance })
    .eq("id", referrer.id);

  // บันทึกการแนะนำสำเร็จในตาราง affiliate_referrals
  await supabase.from("affiliate_referrals").insert({
    referrer_id: referrer.id,
    referred_id: referredUserId,
    status: "approved"
  });

  return true;
}
