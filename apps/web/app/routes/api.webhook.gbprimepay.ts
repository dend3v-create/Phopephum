import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { GBPrimePayService, getPaymentConfig } from "~/services/payment.server";
import { createClient } from "@supabase/supabase-js";
import { sendPaymentSuccessEmail } from "~/services/resend.server";
import type { Env } from "~/env.server";

/**
 * API: POST /api/webhook/gbprimepay
 * รับสัญญาณการจ่ายเงินสำเร็จจาก GBPrimePay
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const payload = await request.json() as any;
    console.log("[Webhook] Received GBPrimePay signal:", payload);

    // 1. ตรวจสอบความถูกต้องของข้อมูล (Signature/IP)
    const paymentService = new GBPrimePayService(getPaymentConfig(env));
    // ในโปรเจกต์จริงควรตรวจสอบ Signature ตรงนี้
    // if (!paymentService.verifySignature(JSON.stringify(payload), request.headers.get("x-gbp-signature"))) {
    //   return json({ error: "Invalid signature" }, { status: 401 });
    // }

    const { referenceNo, resultCode, amount } = payload;

    // 2. ถ้าจ่ายเงินสำเร็จ (resultCode "00" ตามสเปค GB)
    if (resultCode === "00") {
      // ใช้ Service Role เพื่อข้าม RLS เนื่องจากเป็นระบบจัดการหลังบ้าน
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

      // ก. ค้นหา Request เพื่อดูว่าใครเป็นคนสั่ง และสั่ง Plan ไหน
      const { data: subReq, error: reqError } = await supabase
        .from("subscription_requests")
        .select("*, profiles!inner(email, display_name)")
        .eq("id", referenceNo)
        .single();

      if (reqError || !subReq) {
        console.error("[Webhook] Request not found:", referenceNo);
        return json({ error: "Request not found" }, { status: 404 });
      }

      // ข. อัปเดตสถานะ Request เป็น Success
      await supabase
        .from("subscription_requests")
        .update({ 
          status: "success",
          approved_at: new Date().toISOString()
        })
        .eq("id", referenceNo);

      // ค. อัปเดตสิทธิ์สมาชิกใน Profile ของ User
      // คำนวณวันหมดอายุ (30 วันจากวันที่ชำระเงิน)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          plan: subReq.plan, // 'basic', 'pro', 'imperial'
          subscription: subReq.plan === 'imperial' ? 'premium' : 'basic', 
          membership_status: "active",
          membership_expires_at: expiresAt.toISOString() // บันทึกวันหมดอายุ
        })
        .eq("id", subReq.user_id);

      if (profileError) {
        console.error("[Webhook] Failed to update profile:", profileError);
        return json({ error: "Failed to update profile" }, { status: 500 });
      }

      // ง. ส่งอีเมลแจ้งเตือนลูกค้า
      const userEmail = (subReq.profiles as any).email;
      const displayName = (subReq.profiles as any).display_name || "ผู้ใช้งาน";
      
      await sendPaymentSuccessEmail(
        env,
        userEmail,
        displayName,
        subReq.plan,
        expiresAt.toISOString()
      ).catch(err => console.error("[Webhook] Email notification failed:", err));

      console.log(`[Webhook] Successfully upgraded User ${subReq.user_id} to ${subReq.plan}`);
    }

    // 3. ตอบกลับ GBPrimePay ว่าได้รับข้อมูลแล้ว (เขามักต้องการแค่ HTTP 200)
    return new Response("OK", { status: 200 });

  } catch (error: any) {
    console.error("[Webhook] Error:", error);
    return json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
