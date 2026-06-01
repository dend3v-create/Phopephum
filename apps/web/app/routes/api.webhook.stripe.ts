import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { getStripeService } from "~/services/payment.server";
import { createClient } from "@supabase/supabase-js";
import { sendPaymentSuccessEmail } from "~/services/resend.server";
import { notifyPaymentSuccess } from "~/services/line.server";
import type { Env } from "~/env.server";

/**
 * API: POST /api/webhook/stripe
 * รับสัญญาณจาก Stripe Webhook
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

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const { userId, planId, referralCode } = session.metadata;
      const amount = session.amount_total / 100;

      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

      // 0. Mapping Plan to Subscription Tier
      const planMapping: Record<string, string> = {
        free: "free",
        basic: "basic",
        pro: "premium",
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

      // 5. คำนวณ Affiliate Commission
      if (referralCode) {
        const { data: referrer } = await supabase
          .from("profiles")
          .select("id, plan, wallet_balance")
          .eq("referral_code", referralCode)
          .single();

        if (referrer) {
          const rate = referrer.plan === 'imperial' ? 0.10 : referrer.plan === 'pro' ? 0.05 : 0.03;
          const commission = amount * rate;

          if (commission > 0) {
            await supabase
              .from("profiles")
              .update({ wallet_balance: (Number(referrer.wallet_balance || 0) + commission) })
              .eq("id", referrer.id);

            await supabase
              .from("wallet_transactions")
              .insert({
                user_id: referrer.id,
                amount: commission,
                type: "commission",
                description: `ค่าแนะนำจากสมาชิกใหม่ สมัครแพ็กเกจ ${planId.toUpperCase()}`
              });
          }
        }
      }
    }

    return new Response("OK", { status: 200 });

  } catch (error: any) {
    console.error("[Stripe Webhook] Error:", error.message);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }
}
