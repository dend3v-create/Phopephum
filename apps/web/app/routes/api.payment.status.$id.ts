import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import type { Env } from "~/env.server";

/**
 * API: GET /api/payment/status/$id
 * ตรวจสอบสถานะการชำระเงินแบบ Real-time (STEP 6.6)
 */
export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const requestId = params.id;

  if (!requestId) {
    return json({ error: "Missing request ID" }, { status: 400 });
  }

  const { supabase } = createSupabaseClient(request, env);

  // 1. ตรวจสอบจาก subscription_requests
  let { data: subReq } = await supabase
    .from("subscription_requests")
    .select("id, status, plan, type, note")
    .eq("user_id", user.id)
    .eq("id", requestId)
    .maybeSingle();

  // หากค้นหาด้วย ID ไม่เจอ ลองค้นหาจาก note ที่มี chargeId
  if (!subReq && requestId.startsWith("chrg_")) {
    const { data: byNote } = await supabase
      .from("subscription_requests")
      .select("id, status, plan, type, note")
      .eq("user_id", user.id)
      .ilike("note", `%${requestId}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    subReq = byNote;
  }

  // 2. ตรวจสอบสถานะว่าอนุมัติหรือสำเร็จแล้วหรือไม่
  if (subReq?.status === "approved" || subReq?.status === "successful") {
    return json({
      status: "success",
      plan: subReq.plan,
      type: subReq.type,
      message: "ชำระเงินและเปิดใช้งานสำเร็จเรียบร้อยแล้ว",
    });
  }

  // 3. ตรวจสอบจาก payment_transactions ว่ามีรายการ successful ที่ตรงกันหรือไม่
  const { data: payTx } = await supabase
    .from("payment_transactions")
    .select("id, status, subscription_plan_code")
    .eq("user_id", user.id)
    .or(`provider_transaction_id.eq.${requestId},idempotency_key.ilike.%${requestId}%`)
    .maybeSingle();

  if (payTx?.status === "successful") {
    return json({
      status: "success",
      plan: payTx.subscription_plan_code,
      message: "ยืนยันการชำระเงินสำเร็จ",
    });
  }

  // 4. ตรวจสอบโปรไฟล์ผู้ใช้ล่าสุด
  const profile = await getProfile(user.id, request, env);
  if (subReq?.plan && profile?.membership_status === "active" && (profile?.plan === subReq.plan || profile?.subscription === subReq.plan)) {
    return json({
      status: "success",
      plan: profile.plan,
      message: "สมาชิกเปิดใช้งานแล้ว",
    });
  }

  return json({
    status: subReq?.status || "pending",
    plan: subReq?.plan || null,
  });
}

