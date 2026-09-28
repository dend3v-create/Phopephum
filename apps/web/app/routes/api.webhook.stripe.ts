import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { getStripeService, calculateStripeFee } from "~/services/payment.server";
import { createServiceRoleClient } from "~/services/supabase.server";
import { sendPaymentSuccessEmail } from "~/services/resend.server";
import { notifyPaymentSuccess } from "~/services/line.server";
import { processSubscriptionCommission, processRefundClawback } from "~/services/partner.server";
import { awardPurchasedSandsPack } from "~/services/rewards.server";
import type { Env } from "~/env.server";

/**
 * API: POST /api/webhook/stripe
 * รับสัญญาณจาก Stripe Webhook
 * เชื่อมต่อ: Subscription Payment -> Winning Attribution -> Commission Plan -> Holding -> Partner Ledger
 * พร้อมระบบ Sands Refill Pack และ Refund Clawback อัตโนมัติเมื่อเกิดการคืนเงิน
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const stripe = getStripeService(env);
  const signature = request.headers.get("stripe-signature");

  const rawWebhookSecret = env.STRIPE_WEBHOOK_SECRET;
  const webhookSecret =
    typeof rawWebhookSecret === "string" && rawWebhookSecret.trim().startsWith("whsec_")
      ? rawWebhookSecret.trim()
      : "whsec_PnOYZY6S5FvySNwaV9obP0KHa8tjZAUE";

  if (!signature || !webhookSecret) {
    return new Response("Missing signature or secret", { status: 400 });
  }

  const BUSINESS_INVOICE_VAT_RATE = env.INVOICE_VAT_RATE ? Number(env.INVOICE_VAT_RATE) : 0.07;

  try {
    const payload = await request.text();
    const event = await stripe.constructEvent(payload, signature, webhookSecret);

    console.log(`[Stripe Webhook] Received event: ${event.type}, id: ${event.id}`);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. จัดการเหตุการณ์ชำระเงินสำเร็จ (Checkout Session Completed / Invoice Paid)
    // ─────────────────────────────────────────────────────────────────────────
    if (event.type === "checkout.session.completed" || event.type === "invoice.payment_succeeded" || event.type === "payment_intent.succeeded") {
      const session = event.data.object as any;
      const metadata = session.metadata || {};
      const userId = metadata.userId || session.client_reference_id;
      const planCode = metadata.planCode || metadata.planId || "pro_monthly";
      const grossAmountThb = (session.amount_total || session.amount_paid || session.amount || 0) / 100;
      const paymentId = session.payment_intent || session.id || event.id;
      const paymentMethod = session.payment_method_types?.[0] || "card";

      if (!userId) {
        console.warn(`[Stripe Webhook] Skipping event ${event.id}: No userId found in metadata`);
        return new Response("No userId found", { status: 200 });
      }

      const supabase = createServiceRoleClient(env);

      // 1.1 คำนวณค่าธรรมเนียม Stripe Gateway
      const feeBreakdown = calculateStripeFee(grossAmountThb, paymentMethod);

      // 1.2 บันทึกรายการลง payment_transactions
      try {
        await supabase.from("payment_transactions").insert({
          user_id: userId,
          provider: "stripe",
          provider_transaction_id: String(paymentId),
          payment_method: paymentMethod,
          gross_amount_thb: grossAmountThb,
          gateway_fee_thb: feeBreakdown.feeThb,
          gateway_vat_thb: feeBreakdown.feeVatThb,
          net_received_thb: feeBreakdown.netReceivedThb,
          subscription_plan_code: planCode,
          status: "successful",
          idempotency_key: `stripe_charge:${session.id || paymentId}`,
          metadata: {
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent,
            event_id: event.id,
            fee_breakdown: feeBreakdown,
          },
        });
      } catch (insertErr) {
        console.warn("[Stripe Webhook] payment_transactions insert warning (may exist):", insertErr);
      }

      // 1.3 หากเป็นการซื้อแพ็กเกจละอองทรายกาลเวลา (Sands Refill Pack)
      if (planCode.startsWith("sands_")) {
        const sandsAmount = planCode === "sands_500" ? 500 : planCode === "sands_150" ? 150 : 50;
        await awardPurchasedSandsPack({
          userId,
          packId: planCode,
          sandsAmount,
          chargeId: String(paymentId),
          grossAmountThb,
          env,
        });
        console.log(`[Stripe Webhook] Successfully credited +${sandsAmount} sands to user ${userId}`);

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, email")
          .eq("id", userId)
          .single();

        const userEmail = profile?.email || session.customer_email;
        const userName = profile?.display_name || "ผู้ใช้งาน";

        if (userEmail) {
          await sendPaymentSuccessEmail(env, userEmail, userName, planCode, "").catch((e) =>
            console.error("[Stripe Webhook] Sands Email error:", e)
          );
        }

        await notifyPaymentSuccess(env, {
          userId,
          displayName: userName,
          plan: planCode,
          amount: grossAmountThb,
          expiresAt: "",
        }).catch((e) => console.error("[Stripe Webhook] LINE error:", e));
      } else {
        // 1.4 อัปเดตสถานะสมาชิกสำหรับ Subscription Plans
        const planMapping: Record<string, string> = {
          free: "free",
          basic: "basic",
          pro: "premium",
          pro_monthly: "premium",
          pro_annual: "premium",
          imperial: "master",
        };
        const subscriptionTier = planMapping[planCode] || "basic";

        const expiresAt = new Date();
        if (planCode === "pro_annual") {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        } else {
          expiresAt.setDate(expiresAt.getDate() + 30);
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .update({
            plan: planCode,
            subscription: subscriptionTier,
            membership_status: "active",
            membership_expires_at: expiresAt.toISOString(),
          })
          .eq("id", userId)
          .select("display_name, email")
          .single();

        if (profileError) {
          console.error("[Stripe Webhook] Profile update error:", profileError);
        }

        // 1.5 อัปเดตคำขอเป็น Approved
        await supabase
          .from("subscription_requests")
          .update({ status: "approved", approved_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("status", "pending")
          .eq("plan", planCode);

        // 1.6 ส่งแจ้งเตือน (Email & LINE)
        const userEmail = profile?.email || session.customer_email;
        const userName = profile?.display_name || "ผู้ใช้งาน";

        if (userEmail) {
          await sendPaymentSuccessEmail(env, userEmail, userName, planCode, expiresAt.toISOString()).catch((e) =>
            console.error("[Stripe Webhook] Email error:", e)
          );
        }

        await notifyPaymentSuccess(env, {
          userId,
          displayName: userName,
          plan: planCode,
          amount: grossAmountThb,
          expiresAt: expiresAt.toISOString(),
        }).catch((e) => console.error("[Stripe Webhook] LINE error:", e));
      }

      // 1.7 ประมวลผลและคำนวณคอมมิชชันพันธมิตร
      const commResult = await processSubscriptionCommission({
        paymentId: String(paymentId),
        payerUserId: userId,
        planCode,
        grossAmountThb,
        vatRate: BUSINESS_INVOICE_VAT_RATE,
        idempotencyKey: `comm_stripe:${event.id}:${userId}`,
        env,
      });

      console.log(`[Stripe Webhook] Commission processed for user ${userId}:`, commResult);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. จัดการเหตุการณ์คืนเงิน / ยกเลิก (Charge Refunded & Refund Created)
    // ─────────────────────────────────────────────────────────────────────────
    else if (event.type === "charge.refunded" || event.type === "refund.created" || event.type === "charge.refund.updated") {
      const charge = event.data.object as any;
      const paymentId = charge.payment_intent || charge.id;
      const refundReason = charge.refunds?.data?.[0]?.reason || charge.reason || "Stripe customer refund";

      console.log(`[Stripe Webhook] Processing refund clawback for payment: ${paymentId}`);

      const supabase = createServiceRoleClient(env);
      const { data: payTx } = await supabase
        .from("payment_transactions")
        .select("id")
        .eq("provider_transaction_id", String(paymentId))
        .maybeSingle();

      const paymentTxId = payTx?.id || String(paymentId);

      const clawbackResult = await processRefundClawback({
        paymentId: paymentTxId,
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
