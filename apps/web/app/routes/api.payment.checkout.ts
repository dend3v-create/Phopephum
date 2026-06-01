import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { getStripeService, PLAN_PRICES } from "~/services/payment.server";
import { createSupabaseClient } from "~/services/supabase.server";
import type { Env } from "~/env.server";

/**
 * API: POST /api/payment/checkout
 * สร้าง Stripe Checkout Session
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
    const plan = formData.get("plan") as string; 
    
    if (!plan || !PLAN_PRICES[plan]) {
      return json({ error: "Invalid plan selected" }, { status: 400 });
    }

    const amount = PLAN_PRICES[plan];
    const { supabase } = createSupabaseClient(request, env);

    // 1. บันทึกคำขอสมัครสมาชิก (Subscription Request)
    const { data: subReq, error: dbError } = await supabase
      .from("subscription_requests")
      .insert({
        user_id: user.id,
        type: "package_upgrade",
        plan: plan,
        status: "pending",
        note: `Upgrade to ${plan} via Stripe`,
      })
      .select()
      .single();

    if (dbError || !subReq) {
      throw new Error(`Database error: ${dbError?.message}`);
    }

    // 2. สร้าง Stripe Session
    const stripe = getStripeService(env);
    const session = await stripe.createCheckoutSession({
      planId: plan,
      amount: amount,
      userId: user.id,
      userEmail: user.email || "",
      referralCode: profile?.referred_by, // ส่งต่อข้อมูลผู้แนะนำ
      successUrl: `${env.APP_URL}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${env.APP_URL}/dashboard/upgrade?payment=cancel`,
    });

    if (!session.url) {
      throw new Error("Failed to create Stripe session URL");
    }

    // 3. ส่ง URL ไปให้หน้าบ้านเพื่อ Redirect
    return json({
      success: true,
      url: session.url, 
    });

  } catch (error: any) {
    console.error("[Stripe Checkout] Error:", error);
    return json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
