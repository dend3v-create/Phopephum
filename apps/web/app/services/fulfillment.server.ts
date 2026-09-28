/**
 * fulfillment.server.ts — Single source of truth for automated fulfillment & approval
 * รองรับการอนุมัติและเปิดใช้งานอัตโนมัติ (Instant Auto-Activation):
 *   1. การสมัครใช้งานฟรี (Free Registration) -> เปิดใช้งานทันที + มอบทรายเริ่มต้น
 *   2. การอัปเกรดสมาชิก (Plan Upgrade: Basic, Pro, Master) -> ปรับระดับ + ขยายวันหมดอายุ + โบนัสทราย
 *   3. การซื้อทรายเวลา (Sands Refill: 50, 150, 500) -> เติมละอองทรายเข้า balance ทันที
 *   4. แจ้งเตือนแอดมิน & LINE OA ทันทีทุกรายการ
 */

import type { Env } from "~/env.server";
import { createServiceRoleClient } from "./supabase.server";
import { notifyPackageRequest, notifyNewRegistration, notifyPaymentSuccess } from "./line.server";
import { sendApprovalEmail, sendWelcomeEmail } from "./resend.server";
import { SANDS_REFILL_PACKS, SUBSCRIPTION_PLANS } from "~/lib/plans";

export interface FulfillOrderParams {
  userId: string;
  planOrSku: string;
  type?: string; // "registration" | "package_upgrade" | "sands_refill" | "subscription"
  source?: "auto" | "admin_manual" | "stripe_webhook" | "checkout";
  note?: string;
  requestId?: string;
  env: Env;
}

export async function autoFulfillAndApprove({
  userId,
  planOrSku,
  type,
  source = "auto",
  note,
  requestId,
  env,
}: FulfillOrderParams) {
  const supabase = createServiceRoleClient(env);
  const now = new Date().toISOString();
  const normalizedSku = (planOrSku || "free").toLowerCase().trim();

  // 1. ดึงข้อมูล User Profile ปัจจุบัน
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, plan, subscription, role, time_sands_balance, membership_status")
    .eq("id", userId)
    .single();

  const userEmail = profile?.email || "";
  const userName = profile?.display_name || "สมาชิก";
  const currentSands = profile?.time_sands_balance || 0;

  // ─── CASE A: เติมละอองทรายกาลเวลา (Sands Refill) ─────────────────────────
  if (normalizedSku.startsWith("sands_") || type === "sands_refill" || type === "sands") {
    let sandsToAdd = 50;
    if (normalizedSku === "sands_500" || normalizedSku.includes("500")) sandsToAdd = 500;
    else if (normalizedSku === "sands_150" || normalizedSku.includes("150")) sandsToAdd = 150;
    else if (normalizedSku === "sands_50" || normalizedSku.includes("50")) sandsToAdd = 50;

    const newBalance = currentSands + sandsToAdd;

    // อัปเดต Profile ทันที
    await supabase
      .from("profiles")
      .update({
        time_sands_balance: newBalance,
        membership_status: "active",
      })
      .eq("id", userId);

    // บันทึก/อัปเดต subscription_requests
    let subReqId = requestId;
    if (requestId) {
      await supabase
        .from("subscription_requests")
        .update({
          status: "approved",
          approved_at: now,
          approved_by: source === "admin_manual" ? "admin" : "system_auto",
          note: note || `[อัตโนมัติ] เติมทราย +${sandsToAdd} ละออง สำเร็จ (ยอดคงเหลือ ${newBalance})`,
        })
        .eq("id", requestId);
    } else {
      const { data: newReq } = await supabase
        .from("subscription_requests")
        .insert({
          user_id: userId,
          type: "sands_refill",
          plan: normalizedSku,
          status: "approved",
          approved_at: now,
          approved_by: source === "admin_manual" ? "admin" : "system_auto",
          created_at: now,
          note: note || `[อัตโนมัติ] เติมทราย +${sandsToAdd} ละออง สำเร็จ`,
        })
        .select("id")
        .single();
      subReqId = newReq?.id;
    }

    // แจ้งเตือน LINE OA
    await notifyPackageRequest(env, {
      requestId: subReqId || userId,
      userId,
      displayName: userName,
      email: userEmail,
      plan: normalizedSku,
      note: `⚡ [อนุมัติอัตโนมัติ] เติมทราย +${sandsToAdd} ละออง (คงเหลือ ${newBalance})`,
      createdAt: now,
    }).catch(console.error);

    return {
      success: true,
      type: "sands_refill",
      plan: normalizedSku,
      sandsAdded: sandsToAdd,
      newBalance,
    };
  }

  // ─── CASE B: สมัครสมาชิกฟรี (Free Registration) ─────────────────────────
  if (normalizedSku === "free" || type === "registration") {
    // ปรับ profile ให้ active ทันที และมีทรายเริ่มต้น 50 ถ้ายังไม่มี
    await supabase
      .from("profiles")
      .update({
        plan: "free",
        subscription: "free",
        membership_status: "active",
        time_sands_balance: Math.max(currentSands, 50),
      })
      .eq("id", userId);

    let subReqId = requestId;
    if (requestId) {
      await supabase
        .from("subscription_requests")
        .update({
          status: "approved",
          approved_at: now,
          approved_by: source === "admin_manual" ? "admin" : "system_auto",
          note: note || "[อัตโนมัติ] สมาชิกฟรีเปิดใช้งานทันที",
        })
        .eq("id", requestId);
    } else {
      const { data: newReq } = await supabase
        .from("subscription_requests")
        .insert({
          user_id: userId,
          type: "registration",
          plan: "free",
          status: "approved",
          approved_at: now,
          approved_by: "system_auto",
          created_at: now,
          note: "[อัตโนมัติ] สมัครใช้งานฟรี (เปิดใช้งานทันที)",
        })
        .select("id")
        .single();
      subReqId = newReq?.id;
    }

    // ส่งอีเมลต้อนรับ
    if (userEmail) {
      await sendWelcomeEmail(env, userEmail, userName).catch(console.error);
    }

    // แจ้งเตือน LINE OA
    await notifyNewRegistration(env, {
      requestId: subReqId || userId,
      userId,
      displayName: userName,
      email: userEmail,
      createdAt: now,
    }).catch(console.error);

    return {
      success: true,
      type: "registration",
      plan: "free",
    };
  }

  // ─── CASE C: อัปเกรดแพ็กเกจสมาชิก (Plan Upgrade: Basic, Pro, Master) ──────
  const planMapping: Record<string, { tier: string; canonical: string; durationDays: number; bonusSands: number }> = {
    basic: { tier: "premium", canonical: "basic", durationDays: 30, bonusSands: 50 },
    premium: { tier: "premium", canonical: "basic", durationDays: 30, bonusSands: 50 },
    pro: { tier: "pro", canonical: "pro", durationDays: 30, bonusSands: 150 },
    pro_monthly: { tier: "pro", canonical: "pro", durationDays: 30, bonusSands: 150 },
    pro_annual: { tier: "pro", canonical: "pro_annual", durationDays: 365, bonusSands: 1800 },
    master: { tier: "master", canonical: "imperial", durationDays: 30, bonusSands: 500 },
    imperial: { tier: "master", canonical: "imperial", durationDays: 30, bonusSands: 500 },
  };

  const planConfig = planMapping[normalizedSku] || {
    tier: "premium",
    canonical: normalizedSku,
    durationDays: 30,
    bonusSands: 50,
  };

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + planConfig.durationDays);
  const newBalance = currentSands + planConfig.bonusSands;

  // อัปเดต Profile ให้ใช้งานได้ทันที
  await supabase
    .from("profiles")
    .update({
      plan: planConfig.canonical,
      subscription: planConfig.tier,
      membership_status: "active",
      membership_expires_at: expiresAt.toISOString(),
      time_sands_balance: newBalance,
    })
    .eq("id", userId);

  let subReqId = requestId;
  if (requestId) {
    await supabase
      .from("subscription_requests")
      .update({
        status: "approved",
        approved_at: now,
        approved_by: source === "admin_manual" ? "admin" : "system_auto",
        note: note || `[อัตโนมัติ] อัปเกรดเป็น ${planConfig.canonical.toUpperCase()} สำเร็จ (+${planConfig.bonusSands} ทราย)`,
      })
      .eq("id", requestId);
  } else {
    const { data: newReq } = await supabase
      .from("subscription_requests")
      .insert({
        user_id: userId,
        type: "package_upgrade",
        plan: planConfig.canonical,
        status: "approved",
        approved_at: now,
        approved_by: source === "admin_manual" ? "admin" : "system_auto",
        created_at: now,
        note: note || `[อัตโนมัติ] อัปเกรดเป็น ${planConfig.canonical.toUpperCase()} สำเร็จ`,
      })
      .select("id")
      .single();
    subReqId = newReq?.id;
  }

  // ส่งอีเมลแจ้งผลการอนุมัติ
  if (userEmail) {
    await sendApprovalEmail(
      env,
      userEmail,
      userName,
      planConfig.canonical,
      true,
      `เปิดใช้งานแพ็กเกจ ${planConfig.canonical.toUpperCase()} อัตโนมัติเรียบร้อยแล้ว`
    ).catch(console.error);
  }

  // แจ้งเตือน LINE OA
  await notifyPackageRequest(env, {
    requestId: subReqId || userId,
    userId,
    displayName: userName,
    email: userEmail,
    plan: planConfig.canonical,
    note: `⚡ [อนุมัติอัตโนมัติ] แพ็กเกจ ${planConfig.canonical.toUpperCase()} (+${planConfig.bonusSands} ทราย) หมดอายุ ${expiresAt.toLocaleDateString("th-TH")}`,
    createdAt: now,
  }).catch(console.error);

  return {
    success: true,
    type: "package_upgrade",
    plan: planConfig.canonical,
    tier: planConfig.tier,
    expiresAt: expiresAt.toISOString(),
    newBalance,
  };
}
