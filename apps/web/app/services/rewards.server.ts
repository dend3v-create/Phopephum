import { createClient } from "@supabase/supabase-js";
import type { Env } from "~/env.server";
import type {
  SandsActivityType,
  SandsRewardClass,
  SandsLedgerEntry,
  SandsDailySummary,
  SandsRedemptionItem,
} from "@phopephum/types";

export interface RewardResult {
  success: boolean;
  earned: number;
  message: string;
  newBalance: number;
  capReached?: boolean;
}

export const DAILY_RITUAL_SANDS_CAP = 15; // ขีดจำกัดสูงสุดการรับทรายจากกิจกรรมประจำวัน

function getServiceRoleClient(env: Env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

import { getAstrologicalDateStr } from "@phopephum/engine";

/** Get current astrological date in Asia/Bangkok YYYY-MM-DD (06:01 AM cutoff) */
export function getThailandTodayDateString(): string {
  return getAstrologicalDateStr();
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ฟังก์ชันแกนกลาง ATOMIC TRANSACTION:
 * เพิ่มหรือลดละอองทรายกาลเวลาผ่าน PostgreSQL Stored Procedure (RPC)
 * รับประกัน ACID, Row-level Lock (FOR UPDATE), Idempotency และ Daily Cap
 * ─────────────────────────────────────────────────────────────────────────────
 */

export async function creditSandsAtomic(options: {
  userId: string;
  amount: number;
  rewardClass: SandsRewardClass;
  activityType: SandsActivityType;
  referenceId: string; // บังคับระบุเพื่อ Idempotency
  description?: string;
  metadata?: Record<string, unknown>;
  env: Env;
}): Promise<{ success: boolean; newBalance: number; earned: number; capReached?: boolean; error?: string }> {
  const { userId, amount, rewardClass, activityType, referenceId, description, metadata = {}, env } = options;
  const supabase = getServiceRoleClient(env);

  const { data, error } = await supabase.rpc("credit_sands", {
    p_user_id: userId,
    p_amount: Math.abs(amount),
    p_reward_class: rewardClass,
    p_activity_type: activityType,
    p_reference_id: referenceId,
    p_description: description || null,
    p_metadata: metadata,
  });

  if (error) {
    console.error("[creditSandsAtomic] RPC error:", error);
    return {
      success: false,
      newBalance: 0,
      earned: 0,
      error: error.message || "เกิดข้อผิดพลาดในการบันทึกทรายกาลเวลา",
    };
  }

  const res = data as any;
  if (!res.success) {
    return {
      success: false,
      newBalance: res.current_balance ?? 0,
      earned: 0,
      capReached: res.cap_reached ?? false,
      error: res.error || "ไม่สามารถเพิ่มละอองทรายได้",
    };
  }

  return {
    success: true,
    newBalance: res.new_balance,
    earned: res.amount_credited,
  };
}

export async function debitSandsAtomic(options: {
  userId: string;
  amount: number;
  activityType: SandsActivityType;
  referenceId?: string | null;
  description?: string;
  metadata?: Record<string, unknown>;
  env: Env;
}): Promise<{ success: boolean; newBalance: number; amountDebited: number; error?: string }> {
  const { userId, amount, activityType, referenceId, description, metadata = {}, env } = options;
  const supabase = getServiceRoleClient(env);

  const { data, error } = await supabase.rpc("debit_sands", {
    p_user_id: userId,
    p_amount: Math.abs(amount),
    p_activity_type: activityType,
    p_reference_id: referenceId || null,
    p_description: description || null,
    p_metadata: metadata,
  });

  if (error) {
    console.error("[debitSandsAtomic] RPC error:", error);
    return {
      success: false,
      newBalance: 0,
      amountDebited: 0,
      error: error.message || "เกิดข้อผิดพลาดในการหักทรายกาลเวลา",
    };
  }

  const res = data as any;
  if (!res.success) {
    return {
      success: false,
      newBalance: res.current_balance ?? 0,
      amountDebited: 0,
      error: res.error || "ละอองทรายกาลเวลาไม่เพียงพอ",
    };
  }

  return {
    success: true,
    newBalance: res.new_balance,
    amountDebited: res.amount_debited,
  };
}

/**
 * Backward-compatible helper for legacy calls (routes traffic to atomic RPC)
 */
export async function recordSandsTransaction(options: {
  userId: string;
  amount: number; // positive = earn, negative = spend
  activityType: SandsActivityType;
  rewardClass?: SandsRewardClass;
  referenceId?: string | null;
  description?: string | null;
  env: Env;
}): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const { userId, amount, activityType, referenceId, description, env } = options;
  
  if (amount < 0) {
    const res = await debitSandsAtomic({
      userId,
      amount: Math.abs(amount),
      activityType,
      referenceId,
      description: description || undefined,
      env,
    });
    return { success: res.success, newBalance: res.newBalance, error: res.error };
  } else {
    const rewardClass: SandsRewardClass = options.rewardClass || (
      ["daily_login", "checkin", "intention", "reflection", "golden_window_action"].includes(activityType)
        ? "daily_ritual"
        : ["referral_signup", "friend_first_action", "creator_contribution"].includes(activityType)
        ? "community"
        : "wisdom"
    );
    const refId = referenceId || `${activityType}:${userId}:${Date.now()}`;
    const res = await creditSandsAtomic({
      userId,
      amount,
      rewardClass,
      activityType,
      referenceId: refId,
      description: description || undefined,
      env,
    });
    return { success: res.success, newBalance: res.newBalance, error: res.error };
  }
}

/**
 * สรุปยอดทรายประจำวัน (Sands Daily Summary) สำหรับหน้า UI Personal Space
 */
export async function getTodaySandsSummary(
  userId: string,
  env: Env
): Promise<SandsDailySummary> {
  const supabase = getServiceRoleClient(env);
  const today = getThailandTodayDateString();

  // 1. ดึงยอดปัจจุบันจาก Cache (profiles)
  const { data: profile } = await supabase
    .from("profiles")
    .select("time_sands")
    .eq("id", userId)
    .single();

  const currentBalance = profile?.time_sands || 0;

  // 2. ดึงยอดสะสมของหมวด daily_ritual ในวันนี้จาก Ledger (Source of Truth)
  const startOfToday = `${today}T00:00:00+07:00`;
  const { data: rituals } = await supabase
    .from("sands_ledger")
    .select("amount")
    .eq("user_id", userId)
    .eq("reward_class", "daily_ritual")
    .gt("amount", 0)
    .gte("created_at", startOfToday);

  const todayEarned = (rituals || []).reduce((sum, row) => sum + (row.amount || 0), 0);
  const remainingDailyQuota = Math.max(0, DAILY_RITUAL_SANDS_CAP - todayEarned);

  return {
    currentBalance,
    todayEarned,
    dailyCap: DAILY_RITUAL_SANDS_CAP,
    remainingDailyQuota,
    isDailyCapReached: todayEarned >= DAILY_RITUAL_SANDS_CAP,
  };
}

/**
 * ดึงประวัติการเคลื่อนไหวของทรายกาลเวลา (Sands Ledger History)
 */
export async function getSandsLedgerHistory(
  userId: string,
  env: Env,
  limit = 25
): Promise<SandsLedgerEntry[]> {
  const supabase = getServiceRoleClient(env);
  const { data, error } = await supabase
    .from("sands_ledger")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    amount: row.amount,
    balanceBefore: row.balance_before ?? 0,
    balanceAfter: row.balance_after,
    rewardClass: row.reward_class || "daily_ritual",
    activityType: row.activity_type,
    referenceId: row.reference_id,
    description: row.description,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  }));
}

/**
 * นำทรายกาลเวลาไปแลกฟีเจอร์หรือรายงานพิเศษ
 */
export async function spendSandsForFeature(options: {
  userId: string;
  amount: number;
  activityType?: SandsActivityType;
  referenceId?: string;
  description?: string;
  env: Env;
}): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const { userId, amount, activityType = "ai_report_redeem", referenceId, description, env } = options;
  const res = await debitSandsAtomic({
    userId,
    amount,
    activityType,
    referenceId,
    description: description || `แลกรับสิทธิ์ ${activityType}`,
    env,
  });
  return { success: res.success, newBalance: res.newBalance, error: res.error };
}

// ─── 1. ระบบ Login รายวัน (+1 Sands of Time) ──────────────────────────────────
export async function checkAndAwardDailyLogin(
  userId: string,
  env: Env
): Promise<RewardResult> {
  const today = getThailandTodayDateString();
  const refId = `daily_login:${userId}:${today}`;

  const res = await creditSandsAtomic({
    userId,
    amount: 1,
    rewardClass: "daily_ritual",
    activityType: "daily_login",
    referenceId: refId,
    description: "รางวัลการเข้าสู่ระบบประจำวัน",
    env,
  });

  if (!res.success) {
    return {
      success: false,
      earned: 0,
      message: res.error || "วันนี้รับทรายกาลเวลาจากการเข้าสู่ระบบไปแล้ว",
      newBalance: res.newBalance,
      capReached: res.capReached,
    };
  }

  return {
    success: true,
    earned: res.earned,
    message: `ได้รับทรายกาลเวลารายวัน +${res.earned} ละอองทราย!`,
    newBalance: res.newBalance,
  };
}

// ─── 2. รางวัลเช็คอิน/สำรวจดวงดาวประจำวัน (+1 Sands of Time) ──────────────────
export async function awardCheckinReward(
  userId: string,
  env: Env
): Promise<RewardResult> {
  const today = getThailandTodayDateString();
  const refId = `checkin:${userId}:${today}`;

  const res = await creditSandsAtomic({
    userId,
    amount: 1,
    rewardClass: "daily_ritual",
    activityType: "checkin",
    referenceId: refId,
    description: "รางวัลการเปิดไพ่สำรวจดวงดาวประจำวัน",
    env,
  });

  if (!res.success) {
    return {
      success: false,
      earned: 0,
      message: res.error || "วันนี้สำรวจดวงดาวรับทรายไปแล้ว",
      newBalance: res.newBalance,
      capReached: res.capReached,
    };
  }

  // มาร์กใน daily_plans ด้วย
  const supabase = getServiceRoleClient(env);
  await supabase.from("daily_plans").upsert(
    { user_id: userId, date: today, checkin_reward_claimed: true },
    { onConflict: "user_id,date" }
  );

  return {
    success: true,
    earned: res.earned,
    message: `ได้รับทรายกาลเวลาจากการเปิดไพ่ +${res.earned} ละอองทราย!`,
    newBalance: res.newBalance,
  };
}

// ─── 3. รางวัลตั้งเป้าหมายยามเช้า / Intention (+3 Sands of Time) ───────────────
export async function awardIntentionReward(
  userId: string,
  env: Env
): Promise<RewardResult> {
  const today = getThailandTodayDateString();
  const refId = `intention:${userId}:${today}`;

  const res = await creditSandsAtomic({
    userId,
    amount: 3,
    rewardClass: "daily_ritual",
    activityType: "intention",
    referenceId: refId,
    description: "รางวัลบันทึกความตั้งใจสัจจะบารมียามเช้า",
    env,
  });

  if (!res.success) {
    return {
      success: false,
      earned: 0,
      message: res.error || "บันทึกความตั้งใจเช้านี้รับทรายไปแล้ว",
      newBalance: res.newBalance,
      capReached: res.capReached,
    };
  }

  const supabase = getServiceRoleClient(env);
  await supabase.from("daily_plans").upsert(
    { user_id: userId, date: today, intention_reward_claimed: true },
    { onConflict: "user_id,date" }
  );

  return {
    success: true,
    earned: res.earned,
    message: `บันทึกความตั้งใจสัจจะบารมี ได้รับทรายกาลเวลา +${res.earned} ละอองทราย!`,
    newBalance: res.newBalance,
  };
}

// ─── 4. รางวัลทบทวนสะท้อนสติยามเย็น / Reflection (+5 Sands of Time) ────────────
export async function awardReflectionReward(
  userId: string,
  env: Env
): Promise<RewardResult> {
  const today = getThailandTodayDateString();
  const refId = `reflection:${userId}:${today}`;

  const res = await creditSandsAtomic({
    userId,
    amount: 5,
    rewardClass: "daily_ritual",
    activityType: "reflection",
    referenceId: refId,
    description: "รางวัลทบทวนสะท้อนสติยามเย็น",
    env,
  });

  if (!res.success) {
    return {
      success: false,
      earned: 0,
      message: res.error || "สะท้อนสติยามเย็นรับทรายไปแล้ว",
      newBalance: res.newBalance,
      capReached: res.capReached,
    };
  }

  const supabase = getServiceRoleClient(env);
  await supabase.from("daily_plans").upsert(
    { user_id: userId, date: today, reflection_reward_claimed: true },
    { onConflict: "user_id,date" }
  );

  return {
    success: true,
    earned: res.earned,
    message: `บันทึกสะท้อนคิดยามเย็น ได้รับทรายกาลเวลา +${res.earned} ละอองทราย!`,
    newBalance: res.newBalance,
  };
}

// ─── 5. รางวัลกระทำในช่วง Golden Window (+5 Sands of Time) ────────────────────
export async function awardGoldenWindowActionReward(
  userId: string,
  windowId: string,
  env: Env
): Promise<RewardResult> {
  const today = getThailandTodayDateString();
  const refId = `golden_window:${userId}:${today}:${windowId}`;

  const res = await creditSandsAtomic({
    userId,
    amount: 5,
    rewardClass: "daily_ritual",
    activityType: "golden_window_action",
    referenceId: refId,
    description: `ลงมือทำในช่วงเวลาทองคำ (${windowId})`,
    metadata: { windowId, date: today },
    env,
  });

  if (!res.success) {
    return {
      success: false,
      earned: 0,
      message: res.error || "บันทึกการกระทำช่วงเวลาทองคำวันนี้ไปแล้ว",
      newBalance: res.newBalance,
      capReached: res.capReached,
    };
  }

  return {
    success: true,
    earned: res.earned,
    message: `ลงมือทำในช่วงเวลาทองคำ ได้รับทรายกาลเวลา +${res.earned} ละอองทราย!`,
    newBalance: res.newBalance,
  };
}

// ─── 6. รางวัลบันทึกผลลัพธ์จริงสู่ปัญญา / Outcome Tracking (+3 Sands) ──────────
export async function awardOutcomeTrackingReward(
  userId: string,
  queryId: string,
  env: Env
): Promise<RewardResult> {
  const refId = `outcome_tracking:${userId}:${queryId}`;

  const res = await creditSandsAtomic({
    userId,
    amount: 3,
    rewardClass: "wisdom",
    activityType: "outcome_tracking",
    referenceId: refId,
    description: "บันทึกผลลัพธ์จริงเพื่อขัดเกลาปัญญาเฉพาะตน",
    metadata: { queryId },
    env,
  });

  if (!res.success) {
    return {
      success: false,
      earned: 0,
      message: res.error || "บันทึกผลลัพธ์คำถามนี้ไปแล้ว",
      newBalance: res.newBalance,
    };
  }

  return {
    success: true,
    earned: res.earned,
    message: `ส่งต่อผลลัพธ์สู่คลังปัญญา ได้รับทรายกาลเวลา +${res.earned} ละอองทราย!`,
    newBalance: res.newBalance,
  };
}

// ─── 7. รางวัลแนะนำเพื่อน / Referral Signup (+20 Sands of Time) ───────────────
export async function awardReferralSignupReward(
  referrerCode: string,
  referredUserId: string,
  env: Env
): Promise<boolean> {
  if (!referrerCode) return false;
  const supabase = getServiceRoleClient(env);

  const { data: referrer, error } = await supabase
    .from("profiles")
    .select("id, time_sands, email")
    .eq("referral_code", referrerCode.trim())
    .single();

  if (error || !referrer || referrer.id === referredUserId) {
    return false;
  }

  const refId = `referral_signup:${referrer.id}:${referredUserId}`;

  // บันทึกผ่าน Atomic Credit ในหมวด Community (ไม่อยู่ใต้ Daily Cap)
  const res = await creditSandsAtomic({
    userId: referrer.id,
    amount: 20, // ปรับให้สมดุลตาม Phase 6.4 Earn Matrix
    rewardClass: "community",
    activityType: "referral_signup",
    referenceId: refId,
    description: `โบนัสแนะนำเพื่อนใหม่สมัครใช้งาน (${referrerCode})`,
    metadata: { referredUserId, referrerCode },
    env,
  });

  if (!res.success) return false;

  await supabase.from("affiliate_referrals").insert({
    referrer_id: referrer.id,
    referred_id: referredUserId,
    status: "approved",
  });

  return true;
}

/**
 * แคตตาล็อกการแลกรับสิทธิ์ประโยชน์ (Campaign-configurable Redemption Catalog)
 */
export const SANDS_REDEMPTION_CATALOG: SandsRedemptionItem[] = [
  {
    id: "ai_in_depth_report",
    title: "AI In-depth Horoscope Report",
    description: "ปลดล็อกรายงานวิเคราะห์วิถีดวงดาวฉบับเต็ม 6 มิติ",
    sandsCost: 30,
    activityType: "ai_report_redeem",
    eligiblePlans: ["free", "premium", "pro"],
    icon: "📜",
    badge: "ยอดนิยม",
  },
  {
    id: "timing_comparison",
    title: "Timing Comparison Window",
    description: "เปรียบเทียบพลังงานฤกษ์เวลา 3 ตัวเลือกอย่างละเอียด",
    sandsCost: 10,
    activityType: "timing_comparison_redeem",
    eligiblePlans: ["free"],
    icon: "⚖️",
  },
  {
    id: "wisdom_deep_dive",
    title: "Personal Wisdom Deep Dive",
    description: "สังเคราะห์เจาะลึกแพทเทิร์นและพฤติกรรมความสำเร็จเฉพาะตน",
    sandsCost: 20,
    activityType: "wisdom_deep_dive",
    eligiblePlans: ["free", "premium"],
    icon: "🧠",
  },
  {
    id: "calendar_lookahead_30d",
    title: "Calendar Lookahead 30 Days",
    description: "เปิดมิติปฏิทินช่วงเวลาทองคำล่วงหน้า 30 วัน (ชั่วคราว 7 วัน)",
    sandsCost: 25,
    activityType: "calendar_lookahead",
    eligiblePlans: ["free"],
    icon: "📅",
  },
  {
    id: "master_consultation_voucher",
    title: "Master Consultation Privilege",
    description: "สิทธิพิเศษส่วนลดสำหรับนัดหมายวิเคราะห์ชะตากับปรมาจารย์ (ตามแคมเปญ)",
    sandsCost: 150,
    activityType: "consultation_voucher",
    eligiblePlans: ["free", "premium", "pro", "master"],
    icon: "🏛️",
    badge: "แคมเปญพิเศษ",
    isCampaignBenefit: true,
  },
];

// ─── 8. เติมทรายจากการซื้อแพ็กเกจ (Sands Refill Pack Purchase) ────────────────
export async function awardPurchasedSandsPack(options: {
  userId: string;
  packId: string;
  sandsAmount: number;
  chargeId: string;
  grossAmountThb: number;
  env: Env;
}): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const { userId, packId, sandsAmount, chargeId, grossAmountThb, env } = options;
  const refId = `sands_purchase:${chargeId}`;

  const res = await creditSandsAtomic({
    userId,
    amount: sandsAmount,
    rewardClass: "adjustment", // Not bounded by daily ritual cap
    activityType: "sands_purchase",
    referenceId: refId,
    description: `เติมทรายกาลเวลาสำเร็จ (+${sandsAmount} ละอองทราย)`,
    metadata: {
      packId,
      chargeId,
      grossAmountThb,
    },
    env,
  });

  if (!res.success) {
    return {
      success: false,
      newBalance: res.newBalance,
      error: res.error || "ไม่สามารถเพิ่มทรายจากการซื้อแพ็กเกจได้",
    };
  }

  return {
    success: true,
    newBalance: res.newBalance,
  };
}
