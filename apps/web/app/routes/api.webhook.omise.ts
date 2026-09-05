import { type ActionFunctionArgs } from "@remix-run/cloudflare";
import { createServiceRoleClient } from "~/services/supabase.server";
import { calculateOmiseFee, verifyOmiseWebhookEvent } from "~/services/omise.server";
import { processSubscriptionCommission, processRefundClawback, transitionPayoutStatus } from "~/services/partner.server";
import { awardPurchasedSandsPack } from "~/services/rewards.server";
import { sendPaymentSuccessEmail } from "~/services/resend.server";
import { notifyPaymentSuccess } from "~/services/line.server";
import type { Env } from "~/env.server";

/**
 * API: POST /api/webhook/omise
 * รับ Webhook จาก Omise (Opn Payments)
 * เชื่อมโยง:
 * - charge.complete (successful) -> record_omise_payment_and_activate_atomic -> process_subscription_commission_atomic
 * - charge.refund -> process_refund_clawback_atomic
 * - transfer.paid / transfer.failed -> transition_payout_status_atomic
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;

  // Business Invoice VAT Rate (read from env — NOT hardcoded to avoid tax assumption leakage)
  // This is the VAT on subscription revenue for PhopePhum's invoices to customers.
  // SEPARATE from: (1) Omise Gateway VAT (fee * 0.07 on gateway charges, computed in omise.server.ts)
  //                (2) Partner WHT/CIT (resolved dynamically from tax_rules table in DB)
  const BUSINESS_INVOICE_VAT_RATE = env.INVOICE_VAT_RATE ? Number(env.INVOICE_VAT_RATE) : 0.07;

  try {
    const payloadText = await request.text();
    const event = JSON.parse(payloadText);

    // ─────────────────────────────────────────────────────────────────────────
    // 0. ตรวจสอบความถูกต้องแท้จริงของ Webhook (Webhook Mutation Integrity & Forgery Rejection)
    // ─────────────────────────────────────────────────────────────────────────
    const verification = await verifyOmiseWebhookEvent(event, env);
    if (!verification.authentic) {
      console.error(`[Omise Webhook] Forged or unauthorized webhook rejected: ${verification.error}`);
      return new Response(JSON.stringify({ error: verification.error }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`[Omise Webhook] Event verified authentic: ${event.key || event.type}, id: ${event.id}`);

    const supabase = createServiceRoleClient(env);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. จัดการเหตุการณ์ชำระเงินสำเร็จ (Charge Completed / Paid)
    // ─────────────────────────────────────────────────────────────────────────
    if (event.key === "charge.complete" || event.key === "charge.capture") {
      const charge = event.data;

      if (charge.status === "successful" && charge.paid === true) {
        const metadata = charge.metadata || {};
        const userId = metadata.userId;
        const planCode = metadata.planCode || "pro_monthly";
        const grossAmountThb = charge.amount / 100; // satang -> THB
        const paymentMethod = charge.source?.type || (charge.card ? "card" : "promptpay");

        if (!userId) {
          console.warn(`[Omise Webhook] Skipping charge ${charge.id}: No userId found in metadata`);
          return new Response("No userId found in metadata", { status: 200 });
        }

        // 1.1 คำนวณค่าธรรมเนียม Omise ตามอัตราจริง (+ VAT 7%)
        const feeBreakdown = calculateOmiseFee(grossAmountThb, paymentMethod);

        // 1.2 บันทึกธุรกรรมลง payment_transactions + เปิดใช้งาน Subscription สมาชิก (Atomic RPC)
        const { data: activateRes, error: activateErr } = await supabase.rpc(
          "record_omise_payment_and_activate_atomic",
          {
            p_user_id: userId,
            p_omise_charge_id: charge.id,
            p_payment_method: paymentMethod,
            p_gross_amount_thb: grossAmountThb,
            p_gateway_fee_thb: feeBreakdown.feeThb,
            p_gateway_vat_thb: feeBreakdown.feeVatThb,
            p_net_received_thb: feeBreakdown.netReceivedThb,
            p_subscription_plan_code: planCode,
            // Business Invoice VAT on subscription revenue (not Omise Gateway VAT)
            p_vat_rate: BUSINESS_INVOICE_VAT_RATE,
            p_idempotency_key: `omise_charge:${charge.id}`,
            p_metadata: {
              omise_charge_id: charge.id,
              event_id: event.id,
              payment_method: paymentMethod,
              fee_breakdown: feeBreakdown,
            },
          }
        );

        if (activateErr) {
          console.error("[Omise Webhook] record_omise_payment_and_activate_atomic error:", activateErr);
          throw activateErr;
        }

        // 1.2.1 หากเป็นการซื้อแพ็กเกจละอองทรายกาลเวลา (Sands Refill Pack) ให้เติมทรายเข้า Wallet ทันที
        if (planCode.startsWith("sands_")) {
          const sandsAmount = planCode === "sands_500" ? 500 : planCode === "sands_150" ? 150 : 50;
          await awardPurchasedSandsPack({
            userId,
            packId: planCode,
            sandsAmount,
            chargeId: charge.id,
            grossAmountThb,
            env,
          });
          console.log(`[Omise Webhook] Successfully credited +${sandsAmount} sands to user ${userId}`);
        }

        const paymentTransactionId = (activateRes as any)?.transaction_id || (activateRes as any)?.payment_transaction_id || charge.id;

        // 1.3 ประมวลผลและคำนวณคอมมิชชันพันธมิตร (Winning Converted Attribution -> Plan Priority -> 14-Day Holding)
        // กฎเหล็ก: ห้ามอ่าน referral code จาก URL/Cookie โดยตรง
        const commResult = await processSubscriptionCommission({
          paymentId: paymentTransactionId,
          payerUserId: userId,
          planCode,
          grossAmountThb,
          // Business Invoice VAT for commission base separation (not Omise Gateway VAT)
          vatRate: BUSINESS_INVOICE_VAT_RATE,
          idempotencyKey: `comm_omise:${charge.id}`,
          env,
        });

        console.log(`[Omise Webhook] Commission processed for charge ${charge.id}:`, commResult);

        // 1.4 ดึงข้อมูลสมาชิกเพื่อส่งการแจ้งเตือน (Email & LINE)
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, display_name, membership_expires_at")
          .eq("id", userId)
          .single();

        if (profile) {
          await sendPaymentSuccessEmail(
            env,
            profile.email,
            profile.display_name || "ผู้ใช้งาน",
            planCode,
            profile.membership_expires_at || new Date(Date.now() + 30 * 86400000).toISOString()
          ).catch((e) => console.error("[Omise Webhook] Email error:", e));

          await notifyPaymentSuccess(env, {
            userId,
            displayName: profile.display_name || profile.email,
            plan: planCode,
            amount: grossAmountThb,
            expiresAt: profile.membership_expires_at || new Date(Date.now() + 30 * 86400000).toISOString(),
          }).catch((e) => console.error("[Omise Webhook] LINE error:", e));
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. จัดการเหตุการณ์คืนเงิน / ยกเลิก (Charge Refunded)
    // ─────────────────────────────────────────────────────────────────────────
    else if (event.key === "refund.create" || event.key === "charge.refund") {
      const refund = event.data;
      const chargeId = refund.charge || refund.id;
      const refundReason = refund.metadata?.reason || "Omise Customer Refund / Chargeback";

      console.log(`[Omise Webhook] Processing refund clawback for charge: ${chargeId}`);

      const { data: payTx } = await supabase
        .from("payment_transactions")
        .select("id")
        .eq("provider_transaction_id", chargeId)
        .maybeSingle();

      const paymentTxId = payTx?.id || chargeId;

      const clawbackResult = await processRefundClawback({
        paymentId: paymentTxId,
        reason: refundReason,
        idempotencyKey: `refund_omise:${event.id}:${chargeId}`,
        env,
      });

      console.log(`[Omise Webhook] Refund clawback result:`, clawbackResult);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. จัดการเหตุการณ์โอนเงินออกให้พันธมิตรสำเร็จ (Omise Transfer Paid)
    // ─────────────────────────────────────────────────────────────────────────
    else if (event.key === "transfer.paid" || event.key === "transfer.complete") {
      const transfer = event.data;
      let payoutRequestId = transfer.metadata?.payoutRequestId;

      if (!payoutRequestId) {
        const { data: dbTransfer } = await supabase
          .from("omise_transfers")
          .select("payout_request_id")
          .eq("omise_transfer_id", transfer.id)
          .maybeSingle();
        if (dbTransfer?.payout_request_id) {
          payoutRequestId = dbTransfer.payout_request_id;
        }
      }

      if (payoutRequestId) {
        console.log(`[Omise Webhook] Transfer paid for payout request: ${payoutRequestId}`);

        const { data: adminProfile } = await supabase
          .from("profiles")
          .select("id")
          .in("role", ["admin", "finance_officer"])
          .limit(1)
          .maybeSingle();

        const adminId = adminProfile?.id || "00000000-0000-0000-0000-000000000000";

        const transRes = await transitionPayoutStatus({
          payoutRequestId,
          newStatus: "completed",
          reviewedBy: adminId,
          reason: `Omise Transfer Paid (trsf_${transfer.id})`,
          idempotencyKey: `omise_trans_paid:${transfer.id}`,
          env,
        });

        // อัปเดตสถานะใน omise_transfers
        await supabase
          .from("omise_transfers")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("omise_transfer_id", transfer.id);

        console.log(`[Omise Webhook] Payout request ${payoutRequestId} marked as completed:`, transRes);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. จัดการเหตุการณ์โอนเงินออกให้พันธมิตรล้มเหลว (Omise Transfer Failed)
    // ─────────────────────────────────────────────────────────────────────────
    else if (event.key === "transfer.fail" || event.key === "transfer.failed") {
      const transfer = event.data;
      let payoutRequestId = transfer.metadata?.payoutRequestId;

      if (!payoutRequestId) {
        const { data: dbTransfer } = await supabase
          .from("omise_transfers")
          .select("payout_request_id")
          .eq("omise_transfer_id", transfer.id)
          .maybeSingle();
        if (dbTransfer?.payout_request_id) {
          payoutRequestId = dbTransfer.payout_request_id;
        }
      }

      if (payoutRequestId) {
        console.warn(`[Omise Webhook] Transfer failed for payout request ${payoutRequestId}: ${transfer.failure_message}`);

        const { data: adminProfile } = await supabase
          .from("profiles")
          .select("id")
          .in("role", ["admin", "finance_officer"])
          .limit(1)
          .maybeSingle();

        const adminId = adminProfile?.id || "00000000-0000-0000-0000-000000000000";

        // สั่งเปลี่ยนสถานะเป็น rejected ซึ่งจะทำการคืนเงินสำรองกลับเข้า available_balance โดยอัตโนมัติ
        const transRes = await transitionPayoutStatus({
          payoutRequestId,
          newStatus: "rejected",
          reviewedBy: adminId,
          reason: `Omise Transfer Failed: ${transfer.failure_message || transfer.failure_code}`,
          idempotencyKey: `omise_trans_fail:${transfer.id}`,
          env,
        });

        await supabase
          .from("omise_transfers")
          .update({
            status: "failed",
            failure_code: transfer.failure_code,
            failure_message: transfer.failure_message,
            updated_at: new Date().toISOString(),
          })
          .eq("omise_transfer_id", transfer.id);

        console.log(`[Omise Webhook] Payout request ${payoutRequestId} reverted to available:`, transRes);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error: any) {
    console.error("[Omise Webhook] Error:", error.message);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }
}
