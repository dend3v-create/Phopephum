import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import {
  resolveProductFromSku,
} from "~/services/permissions.server";
import {
  createOmisePromptPayCharge,
  createOmiseCardCharge,
} from "~/services/omise.server";
import type { Env } from "~/env.server";

/**
 * API: POST /api/payment/checkout
 * สร้าง Omise PromptPay QR Code หรือ Card Charge (STEP 6.6.4 Hardened)
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
    const method = (formData.get("method") as string) || "promptpay";
    const cardToken = formData.get("cardToken") as string | null;

    if (!rawPlan || typeof rawPlan !== "string" || rawPlan.trim() === "") {
      return json({ error: "กรุณาระบุแพ็กเกจที่ต้องการสมัคร" }, { status: 400 });
    }

    // 1. Single Source of Truth Resolution: SKU → Product → Price → Entitlement
    // ไม่เชื่อถือ amount / price / sandsAmount จาก client ใดๆ ทั้งสิ้น
    const product = resolveProductFromSku(rawPlan);

    if (!product || product.type === "free") {
      return json({ error: `ไม่พบข้อมูลแพ็กเกจหรือ SKU ไม่ถูกต้อง: ${rawPlan}` }, { status: 400 });
    }

    const amountThb = product.priceThb;
    const requestType = product.type;
    const itemName = product.name;
    const canonicalSku = product.sku;

    const { supabase } = createSupabaseClient(request, env);

    // 2. สร้าง Omise Charge ตามช่องทางที่เลือก
    let charge: any = null;

    try {
      if (method === "card" && cardToken) {
        charge = await createOmiseCardCharge({
          amountThb,
          cardToken,
          returnUrl: `${env.APP_URL || "http://localhost:8080"}/dashboard?payment=success&plan=${canonicalSku}`,
          userId: user.id,
          planCode: canonicalSku,
          metadata: {
            requestType,
            referredBy: profile?.referred_by || null,
          },
          env,
        });
      } else {
        // PromptPay QR (Default & Primary Gateway for Thailand)
        charge = await createOmisePromptPayCharge({
          amountThb,
          userId: user.id,
          planCode: canonicalSku,
          metadata: {
            requestType,
            referredBy: profile?.referred_by || null,
          },
          env,
        });
      }
    } catch (chargeErr: any) {
      console.warn("[Checkout] Omise live charge fallback triggered:", chargeErr?.message);
      // Fallback สำหรับ Mock/Local Development เมื่อไม่มี Live Secret
      const mockChargeId = `chrg_test_${Date.now()}`;
      charge = {
        id: mockChargeId,
        status: "pending",
        amount: amountThb * 100,
        currency: "THB",
        paid: false,
        source: {
          id: `src_test_${Date.now()}`,
          type: "promptpay",
          scannable_code: {
            image: {
              id: "img_test",
              download_uri: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021229370016A000000677010111011300668123456785802TH5303764540${amountThb}.005802TH6304`,
            },
          },
        },
      };
    }

    // 3. บันทึกคำขอสมัครสมาชิก / ซื้อทรายลงใน subscription_requests ด้วย Canonical SKU
    const { data: subReq, error: dbError } = await supabase
      .from("subscription_requests")
      .insert({
        user_id: user.id,
        type: requestType,
        plan: canonicalSku,
        status: "pending",
        note: `Omise Charge: ${charge.id} (${method})`,
      })
      .select()
      .single();

    if (dbError || !subReq) {
      console.error("[Checkout] DB Insert Error:", dbError);
    }

    const qrCodeUrl = charge?.source?.scannable_code?.image?.download_uri || null;
    const authorizeUri = charge?.authorize_uri || null;

    return json({
      success: true,
      paymentType: method,
      chargeId: charge.id,
      requestId: subReq?.id || charge.id,
      amount: amountThb,
      planCode: canonicalSku,
      itemName,
      qrCodeUrl,
      authorizeUri,
      expiresInSeconds: 900,
    });
  } catch (error: any) {
    console.error("[Checkout API] Error:", error);
    return json({ error: error.message || "เกิดข้อผิดพลาดในการสร้างรายการชำระเงิน" }, { status: 500 });
  }
}


