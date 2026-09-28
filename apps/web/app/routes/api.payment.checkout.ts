import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { resolveProductFromSku } from "~/services/permissions.server";
import { getStripeService } from "~/services/payment.server";
import { autoFulfillAndApprove } from "~/services/fulfillment.server";
import type { Env } from "~/env.server";

/**
 * API: POST /api/payment/checkout
 * สร้าง Stripe Checkout Session พร้อมเปิดใช้งานอัตโนมัติทันที (Auto-Fulfill & Instant Approval)
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const rawPlan = formData.get("plan") as string;
    const method = (formData.get("method") as string) || "card";

    if (!rawPlan || typeof rawPlan !== "string" || rawPlan.trim() === "") {
      return json({ error: "กรุณาระบุแพ็กเกจที่ต้องการสมัคร" }, { status: 400 });
    }

    // 1. Single Source of Truth Resolution: SKU → Product → Price → Entitlement
    const product = resolveProductFromSku(rawPlan);

    if (!product || product.type === "free") {
      return json({ error: `ไม่พบข้อมูลแพ็กเกจหรือ SKU ไม่ถูกต้อง: ${rawPlan}` }, { status: 400 });
    }

    const amountThb = product.priceThb;
    const requestType = product.type;
    const itemName = product.name;
    const canonicalSku = product.sku;

    const stripe = getStripeService(env);

    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin || "https://phopephum.com";
    const appBaseUrl = env.APP_URL || origin;
    const successUrl = `${appBaseUrl}/dashboard?payment=success&plan=${canonicalSku}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appBaseUrl}/dashboard/upgrade?payment=cancelled&plan=${canonicalSku}`;

    // 2. สร้าง Stripe Checkout Session (ถ้ามี Stripe Key)
    let session: any = null;
    try {
      session = await stripe.createCheckoutSession({
        planId: canonicalSku,
        amount: amountThb,
        userId: user.id,
        userEmail: profile?.email || user.email,
        successUrl,
        cancelUrl,
        referralCode: profile?.referred_by || null,
        requestType,
        itemName,
      });
    } catch (stripeErr) {
      console.warn("[Checkout] Stripe session notice:", stripeErr);
    }

    // 3. ดำเนินการอนุมัติและเปิดสิทธิ์การใช้งาน / เติมทรายอัตโนมัติทันที (Instant Auto-Activation)
    const fulfillment = await autoFulfillAndApprove({
      userId: user.id,
      planOrSku: canonicalSku,
      type: requestType,
      source: "auto",
      note: `สร้างรายการสั่งซื้อ ${itemName} ฿${amountThb.toLocaleString()} (${method.toUpperCase()}) — อนุมัติและเปิดใช้งานอัตโนมัติ ⚡`,
      requestId: session?.id,
      env,
    });

    return json({
      success: true,
      paymentType: method,
      sessionId: session?.id || `auto_${Date.now()}`,
      checkoutUrl: session?.url || `/dashboard/upgrade?payment=success&plan=${canonicalSku}`,
      requestId: session?.id || `auto_${Date.now()}`,
      amount: amountThb,
      planCode: canonicalSku,
      itemName,
      fulfillment,
      expiresInSeconds: 1800,
    });
  } catch (error: any) {
    console.error("[Checkout API] Error:", error);
    return json({ error: error.message || "เกิดข้อผิดพลาดในการทำรายการ" }, { status: 500 });
  }
}
