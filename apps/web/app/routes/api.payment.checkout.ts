import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth } from "~/services/auth.server";
import { GBPrimePayService, getPaymentConfig, PLAN_PRICES } from "~/services/payment.server";
import { createSupabaseClient } from "~/services/supabase.server";
import type { Env } from "~/env.server";

/**
 * API: POST /api/payment/checkout
 * จัดการการสั่งซื้อแพ็กเกจสมาชิก
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const plan = formData.get("plan") as string; // 'basic', 'pro', 'imperial'
    
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
        type: "package_upgrade", // เปลี่ยนให้ตรงกับที่ loader ในหน้าจอตรวจสอบ
        plan: plan,
        status: "pending",
        note: `Upgrade to ${plan} via PromptPay`,
      })
      .select()
      .single();

    if (dbError || !subReq) {
      throw new Error(`Database error: ${dbError?.message}`);
    }

    // 2. เรียก GBPrimePay เพื่อขอ QR Code
    const paymentService = new GBPrimePayService(getPaymentConfig(env));
    const gbpResponse = await paymentService.createPromptPayQR({
      amount: amount,
      referenceNo: subReq.id, // ใช้ ID ของ request เป็นเลขรหัสอ้างอิง
      backgroundUrl: `${env.SITE_URL}/api/webhook/gbprimepay`, // Webhook กลับมาเมื่อจ่ายสำเร็จ
      detail: `Phopephum v2 Membership: ${plan}`,
      customerName: user.email,
    });

    if (gbpResponse.status !== "00") {
      // อัปเดตสถานะเป็นล้มเหลวถ้า Gateway มีปัญหา
      await supabase.from("subscription_requests").update({ status: "failed" }).eq("id", subReq.id);
      return json({ error: "Payment gateway error: " + gbpResponse.message }, { status: 500 });
    }

    // 3. ส่งข้อมูล QR Code กลับไปให้ Frontend
    return json({
      success: true,
      requestId: subReq.id,
      amount: amount,
      qrcode: gbpResponse.qrcode, // Base64 หรือ URL
    });

  } catch (error: any) {
    console.error("[Checkout] Error:", error);
    return json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
