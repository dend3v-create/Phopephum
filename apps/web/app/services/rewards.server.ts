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
 * 1. ระบบ Login รายวัน (+1 Sands of Time)
 */
export async function checkAndAwardDailyLogin(userId: string, env: Env): Promise<RewardResult> {
  const supabase = getServiceRoleClient(env);
  const today = getThailandTodayDateString();

  // ดึงโปรไฟล์เพื่อเช็คล็อคอินล่าสุด
  const { data: profile, error: fetchErr } = await supabase
    .from("profiles")
    .select("last_login_reward_at, time_sands")
    .eq("id", userId)
    .single();

  if (fetchErr || !profile) {
    return { success: false, earned: 0, message: "ไม่สามารถดึงข้อมูลโปรไฟล์ได้", newBalance: 0 };
  }

  // เทียบวันเกิดสิทธิ
  if (profile.last_login_reward_at === today) {
    return { success: false, earned: 0, message: "วันนี้รับทรายกาลเวลาไปแล้ว", newBalance: profile.time_sands || 0 };
  }

  const newBalance = (profile.time_sands || 0) + 1;

  // อัปเดตข้อมูลรับรางวัล
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({
      last_login_reward_at: today,
      time_sands: newBalance
    })
    .eq("id", userId);

  if (updateErr) {
    console.error("[rewards] Daily login reward update failed:", updateErr);
    return { success: false, earned: 0, message: "อัปเดตทรายกาลเวลารางวัลล้มเหลว", newBalance: profile.time_sands || 0 };
  }

  return {
    success: true,
    earned: 1,
    message: "ได้รับทรายกาลเวลารายวัน +1 ละอองทราย!",
    newBalance
  };
}

/**
 * 2. รางวัลเช็คอิน/เปิดไพ่ประจำวัน (+1 Sands of Time)
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
    const { data: p } = await supabase.from("profiles").select("time_sands").eq("id", userId).single();
    return { success: false, earned: 0, message: "เคลมรางวัลจับไพ่ไปแล้วในวันนี้", newBalance: p?.time_sands || 0 };
  }

  // ดึงโปรไฟล์เพื่อรับคะแนน
  const { data: profile } = await supabase.from("profiles").select("time_sands").eq("id", userId).single();
  const currentSands = profile?.time_sands || 0;
  const newBalance = currentSands + 1;

  // บันทึกและเคลม
  await supabase.from("daily_plans").upsert({
    user_id: userId,
    date: today,
    checkin_reward_claimed: true
  }, { onConflict: "user_id,date" });

  await supabase.from("profiles").update({ time_sands: newBalance }).eq("id", userId);

  return {
    success: true,
    earned: 1,
    message: "ได้รับทรายกาลเวลาจากการเปิดไพ่ +1 ละอองทราย!",
    newBalance
  };
}

/**
 * 3. รางวัลตั้งเป้าหมายยามเช้า / Intention (+3 Sands of Time)
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
    const { data: p } = await supabase.from("profiles").select("time_sands").eq("id", userId).single();
    return { success: false, earned: 0, message: "เคลมรางวัลความตั้งใจเช้านี้ไปแล้ว", newBalance: p?.time_sands || 0 };
  }

  const { data: profile } = await supabase.from("profiles").select("time_sands").eq("id", userId).single();
  const currentSands = profile?.time_sands || 0;
  const newBalance = currentSands + 3;

  await supabase.from("daily_plans").upsert({
    user_id: userId,
    date: today,
    intention_reward_claimed: true
  }, { onConflict: "user_id,date" });

  await supabase.from("profiles").update({ time_sands: newBalance }).eq("id", userId);

  return {
    success: true,
    earned: 3,
    message: "บันทึกความตั้งใจสัจจะบารมี ได้รับทรายกาลเวลา +3 ละอองทราย!",
    newBalance
  };
}

/**
 * 4. รางวัลทบทวนสะท้อนสติยามเย็น / Reflection (+5 Sands of Time)
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
    const { data: p } = await supabase.from("profiles").select("time_sands").eq("id", userId).single();
    return { success: false, earned: 0, message: "เคลมรางวัลทบทวนชีวิตยามเย็นไปแล้ว", newBalance: p?.time_sands || 0 };
  }

  const { data: profile } = await supabase.from("profiles").select("time_sands").eq("id", userId).single();
  const currentSands = profile?.time_sands || 0;
  const newBalance = currentSands + 5;

  await supabase.from("daily_plans").upsert({
    user_id: userId,
    date: today,
    reflection_reward_claimed: true
  }, { onConflict: "user_id,date" });

  await supabase.from("profiles").update({ time_sands: newBalance }).eq("id", userId);

  return {
    success: true,
    earned: 5,
    message: "บันทึกสะท้อนคิดยามเย็น ได้รับทรายกาลเวลา +5 ละอองทราย!",
    newBalance
  };
}

/**
 * 5. รางวัลชวนเพื่อนสมัคร (+50 Sands of Time เข้าผู้แนะนำ)
 */
export async function awardReferralSignupReward(referrerCode: string, referredUserId: string, env: Env): Promise<boolean> {
  if (!referrerCode) return false;
  const supabase = getServiceRoleClient(env);

  // หาผู้แนะนำจากรหัสแนะนำ (referral_code)
  const { data: referrer, error } = await supabase
    .from("profiles")
    .select("id, time_sands, email")
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

  // อัปเดตทรายกาลเวลาให้ผู้แนะนำ
  const newBalance = (referrer.time_sands || 0) + 50;
  await supabase
    .from("profiles")
    .update({ time_sands: newBalance })
    .eq("id", referrer.id);

  // บันทึกการแนะนำสำเร็จในตาราง affiliate_referrals
  await supabase.from("affiliate_referrals").insert({
    referrer_id: referrer.id,
    referred_id: referredUserId,
    status: "approved"
  });

  return true;
}
