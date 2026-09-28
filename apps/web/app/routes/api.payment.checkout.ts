import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { resolveProductFromSku } from "~/services/permissions.server";
import { getStripeService } from "~/services/payment.server";
import { notifyPackageRequest } from "~/services/line.server";
import type { Env } from "~/env.server";

/**
 * API: POST /api/payment/checkout
 * สร้าง Stripe Checkout Session (รองรับ PromptPay QR และบัตรเครดิต/เดบิต)
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

    const { supabase } = createSupabaseClient(request, env);
    const stripe = getStripeService(env);

    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin || "https://phopephum.com";
    const appBaseUrl = env.APP_URL || origin;
    const successUrl = `${appBaseUrl}/dashboard?payment=success&plan=${canonicalSku}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appBaseUrl}/dashboard/upgrade?payment=cancelled&plan=${canonicalSku}`;

    // 2. สร้าง Stripe Checkout Session
    const session = await stripe.createCheckoutSession({
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

    if (!session || !session.id) {
      console.error("[Checkout] Stripe session creation failed or returned empty response");
      return json({ error: "ไม่สามารถสร้างรายการชำระเงินกับเกตเวย์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง" }, { status: 502 });
    }

    // 3. บันทึกคำขอสมัครสมาชิก / ซื้อทรายลงใน subscription_requests
    const { data: subReq, error: dbError } = await supabase
      .from("subscription_requests")
      .insert({
        user_id: user.id,
        type: requestType,
        plan: canonicalSku,
        status: "pending",
        note: `Stripe Session: ${session.id} (${method})`,
      })
      .select()
      .single();

    if (dbError) {
      console.error("[Checkout] DB Insert Error:", dbError);
    }

    // 4. ส่ง Flex Message แจ้งเตือนแอดมินทาง LINE OA
    notifyPackageRequest(env, {
      requestId: subReq?.id || session.id,
      userId: user.id,
      displayName: profile?.display_name || user.email || "ผู้ใช้งาน",
      email: profile?.email || user.email || "",
      plan: canonicalSku,
      note: `สร้างรายการชำระเงิน Stripe ฿${amountThb.toLocaleString()}`,
      createdAt: new Date().toISOString(),
    }).catch((err) => console.warn("[Checkout] LINE notify warning:", err));

    return json({
      success: true,
      paymentType: method,
      sessionId: session.id,
      checkoutUrl: session.url,
      requestId: subReq?.id || session.id,
      amount: amountThb,
      planCode: canonicalSku,
      itemName,
      expiresInSeconds: 1800, // 30 นาทีสำหรับ Stripe Checkout
    });
  } catch (error: any) {
    console.error("[Checkout API] Error:", error);
    return json({ error: error.message || "เกิดข้อผิดพลาดในการสร้างรายการชำระเงิน" }, { status: 500 });
  }
}
