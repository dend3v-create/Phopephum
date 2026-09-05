import { createClient } from "@supabase/supabase-js";
import type { Env } from "~/env.server";
import { creditSandsAtomic } from "./rewards.server";

export const REF_COOKIE_NAME = "phope_ref";
export const VID_COOKIE_NAME = "phope_vid";
export const ATTRIBUTION_WINDOW_SECONDS = 30 * 24 * 60 * 60; // 30 Days

function getServiceRoleClient(env: Env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * ดึง Cookie จาก Request Header
 */
function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * สร้าง SHA-256 Hash ของ Client IP (ใช้เป็น Risk Signal ไม่ใช่ Sole Proof)
 */
export async function hashClientIp(request: Request): Promise<string> {
  const ip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1";

  const msgUint8 = new TextEncoder().encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * ดึงหรือสร้าง Anonymous Visitor ID
 */
export function getOrCreateVisitorId(request: Request): { visitorId: string; isNew: boolean } {
  const existingVid = getCookie(request, VID_COOKIE_NAME);
  if (existingVid && existingVid.length >= 10) {
    return { visitorId: existingVid, isNew: false };
  }
  return { visitorId: crypto.randomUUID(), isNew: true };
}

/**
 * 1. บันทึกการคลิกลิงก์แนะนำ (Referral Click Capture + 30-Day Cookie)
 */
export async function captureReferralClick(options: {
  request: Request;
  partnerCode: string;
  campaignCode?: string | null;
  env: Env;
}): Promise<{
  success: boolean;
  partnerId?: string;
  partnerCode?: string;
  attributionId?: string;
  headers: Headers;
  error?: string;
}> {
  const { request, partnerCode, campaignCode, env } = options;
  const headers = new Headers();

  const { visitorId, isNew } = getOrCreateVisitorId(request);
  const ipHash = await hashClientIp(request);
  const userAgent = request.headers.get("user-agent") || "";
  const url = new URL(request.url);
  const landingPage = url.pathname + url.search;
  const referrerUrl = request.headers.get("referer");

  const supabase = getServiceRoleClient(env);

  const { data, error } = await supabase.rpc("capture_referral_click_atomic", {
    p_partner_code: partnerCode.trim(),
    p_visitor_anonymous_id: visitorId,
    p_campaign_code: campaignCode || null,
    p_ip_hash: ipHash,
    p_user_agent: userAgent,
    p_landing_page: landingPage,
    p_referrer_url: referrerUrl || null,
  });

  if (error || !data || !data.success) {
    return {
      success: false,
      error: data?.message || error?.message || "Failed to capture referral click",
      headers,
    };
  }

  // เซ็ต Cookie อายุ 30 วัน
  const cookiePayload = encodeURIComponent(
    JSON.stringify({
      code: data.partner_code,
      id: data.partner_id,
      attrId: data.attribution_id,
      ts: Date.now(),
    })
  );

  headers.append(
    "Set-Cookie",
    `${REF_COOKIE_NAME}=${cookiePayload}; Max-Age=${ATTRIBUTION_WINDOW_SECONDS}; Path=/; SameSite=Lax; HttpOnly`
  );

  if (isNew) {
    headers.append(
      "Set-Cookie",
      `${VID_COOKIE_NAME}=${visitorId}; Max-Age=${365 * 24 * 60 * 60}; Path=/; SameSite=Lax; HttpOnly`
    );
  }

  return {
    success: true,
    partnerId: data.partner_id,
    partnerCode: data.partner_code,
    attributionId: data.attribution_id,
    headers,
  };
}

/**
 * 2. แปลงผลการแนะนำเมื่อผู้ใช้สมัครสมาชิก (Atomic Conversion + Fraud Check)
 */
export async function convertAttributionOnSignup(options: {
  userId: string;
  request: Request;
  manualPartnerCode?: string | null;
  userTaxId?: string | null;
  env: Env;
}): Promise<{
  success: boolean;
  converted: boolean;
  partnerId?: string;
  partnerCode?: string;
  blocked?: boolean;
  reason?: string;
  headers: Headers;
}> {
  const { userId, request, manualPartnerCode, userTaxId, env } = options;
  const headers = new Headers();

  const visitorId = getCookie(request, VID_COOKIE_NAME);
  const refCookieRaw = getCookie(request, REF_COOKIE_NAME);
  let cookiePartnerCode: string | null = null;

  if (refCookieRaw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(refCookieRaw));
      cookiePartnerCode = parsed.code || null;
    } catch {
      // invalid cookie format
    }
  }

  const effectiveCode = manualPartnerCode?.trim() || cookiePartnerCode;
  const ipHash = await hashClientIp(request);
  const userAgent = request.headers.get("user-agent") || "";

  const supabase = getServiceRoleClient(env);

  const { data, error } = await supabase.rpc("convert_referral_attribution_atomic", {
    p_referred_user_id: userId,
    p_visitor_anonymous_id: visitorId || null,
    p_manual_partner_code: effectiveCode || null,
    p_ip_hash: ipHash,
    p_user_agent: userAgent,
    p_user_tax_id: userTaxId || null,
  });

  if (error || !data) {
    console.error("[attribution.server] convert_referral_attribution_atomic error:", error);
    return { success: false, converted: false, headers };
  }

  if (data.blocked) {
    console.warn(`[attribution.server] Self-referral blocked for user ${userId}:`, data.reason);
    return { success: true, converted: false, blocked: true, reason: data.reason, headers };
  }

  if (data.converted) {
    // ให้รางวัล Non-Monetary Sands of Time (+20 Sands) ให้แก่ Partner
    try {
      await creditSandsAtomic({
        userId: data.partner_id,
        amount: 20,
        rewardClass: "community",
        activityType: "referral_signup",
        referenceId: `referral_signup:${data.partner_id}:${userId}`,
        description: `กัลยาณมิตรใหม่ลงทะเบียนผ่านการแนะนำของคุณ (+20 ทราย)`,
        metadata: { referredUserId: userId, attributionId: data.attribution_id },
        env,
      });
    } catch (rewardErr) {
      console.error("[attribution.server] Error crediting referral signup sands:", rewardErr);
    }
  }

  return {
    success: true,
    converted: Boolean(data.converted || data.already_converted),
    partnerId: data.partner_id,
    partnerCode: data.partner_code,
    headers,
  };
}

/**
 * 3. ตรวจสอบ Partner Code จาก Request (เพื่อนำไป Prefill ในหน้า Register)
 */
export function getReferralCodeFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  const refFromQuery = url.searchParams.get("ref");
  if (refFromQuery && refFromQuery.trim()) {
    return refFromQuery.trim();
  }

  const refCookie = getCookie(request, REF_COOKIE_NAME);
  if (refCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(refCookie));
      return parsed.code || null;
    } catch {
      return null;
    }
  }

  return null;
}
