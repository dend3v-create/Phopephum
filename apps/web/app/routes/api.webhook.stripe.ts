import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { getStripeService } from "~/services/payment.server";
import { createServiceRoleClient } from "~/services/supabase.server";
import { sendPaymentSuccessEmail } from "~/services/resend.server";
import { notifyPaymentSuccess } from "~/services/line.server";
import { processSubscriptionCommission, processRefundClawback } from "~/services/partner.server";
import type { Env } from "~/env.server";

/**
 * API: POST /api/webhook/stripe
 * รับสัญญาณจาก Stripe Webhook
 * เชื่อมต่อ: Subscription Payment -> Winning Attribution -> Commission Plan -> Holding -> Partner Ledger
 * พร้อมระบบ Refund Clawback อัตโนมัติเมื่อเกิดการคืนเงิน
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const stripe = getStripeService(env);
  const signature = request.headers.get("stripe-signature");

  if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Missing signature or secret", { status: 400 });
  }

  try {
    const payload = await request.text();
    const event = await stripe.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);

    console.log(`[Stripe Webhook] Received event: ${event.type}, id: ${event.id}`);

    // 1. จัดการเหตุการณ์ชำระเงินสำเร็จ (First Payment & Subscription Renewals)
    if (event.type === "checkout.session.completed" || event.type === "invoice.payment_succeeded") {
      const session = event.data.object as any;
      const metadata = session.metadata || {};
      const userId = metadata.userId || session.client_reference_id;
      const planId = metadata.planId || "pro_monthly";
      const amount = (session.amount_total || session.amount_paid || 0) / 100;
      const paymentId = session.payment_intent || session.id || event.id;

      if (!userId) {
        console.warn(`[Stripe Webhook] Skipping event ${event.id}: No userId found in metadata`);
        return new Response("No userId found", { status: 200 });
      }

      const supabase = createServiceRoleClient(env);

      // 0. Mapping Plan to Subscription Tier
      const planMapping: Record<string, string> = {
        free: "free",
        basic: "basic",
        pro: "premium",
        pro_monthly: "premium",
        pro_annual: "premium",
        imperial: "lifetime",
      };
      const subscriptionTier = planMapping[planId] || "basic";

      // 1. อัปเดตวันหมดอายุ (30 วัน)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // 2. อัปเดต Profile สมาชิก
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .update({
          plan: planId,
          subscription: subscriptionTier, 
          membership_status: "active",
          membership_expires_at: expiresAt.toISOString()
        })
        .eq("id", userId)
        .select("display_name, email")
        .single();

      if (profileError) throw profileError;

      // 3. บันทึกคำขอเป็น Approved
      await supabase
        .from("subscription_requests")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("status", "pending")
        .eq("plan", planId);

      // 4. ส่งแจ้งเตือน (Email & LINE)
      await sendPaymentSuccessEmail(env, profile.email, profile.display_name || "ผู้ใช้งาน", planId, expiresAt.toISOString())
        .catch(e => console.error("Email error:", e));

      await notifyPaymentSuccess(env, {
        userId,
        displayName: profile.display_name || profile.email,
        plan: planId,
        amount: amount,
        expiresAt: expiresAt.toISOString()
      }).catch(e => console.error("LINE error:", e));

      // 5. ประมวลผลและคำนวณคอมมิชชันผ่าน Commission Engine ขั้นสูง (Idempotent + Atomic)
      // กฎเหล็ก: ห้ามอ่าน referralCode จาก metadata/cookie โดยตรง
      // ระบบจะค้นหา Winning Converted Attribution ที่แท้จริงจากฐานข้อมูลเท่านั้น
      const commResult = await processSubscriptionCommission({
        paymentId,
        payerUserId: userId,
        planCode: planId,
        grossAmountThb: amount,
        vatRate: 0.07, // dynamic VAT rate
        idempotencyKey: `comm_stripe:${event.id}:${userId}`,
        env,
      });

      console.log(`[Stripe Webhook] Commission processed for user ${userId}:`, commResult);
    }

    // 2. จัดการเหตุการณ์คืนเงิน / ยกเลิก (Charge Refunded & Subscription Deleted)
    else if (event.type === "charge.refunded") {
      const charge = event.data.object as any;
      const paymentId = charge.payment_intent || charge.id;
      const refundReason = charge.refunds?.data?.[0]?.reason || "Stripe customer refund";

      console.log(`[Stripe Webhook] Processing refund clawback for payment: ${paymentId}`);

      const clawbackResult = await processRefundClawback({
        paymentId,
        reason: refundReason,
        idempotencyKey: `refund_clawback:${event.id}:${paymentId}`,
        env,
      });

      console.log(`[Stripe Webhook] Refund clawback result:`, clawbackResult);
    }

    return new Response("OK", { status: 200 });

  } catch (error: any) {
    console.error("[Stripe Webhook] Error:", error.message);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }
}

