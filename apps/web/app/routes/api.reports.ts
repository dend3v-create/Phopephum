import { json } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { generateAIReport } from "~/services/ai.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { getProfile } from "~/services/auth.server";
import { getUserPlan, getAiReportLimit, getUserBillingCycleWindow } from "~/services/permissions.server";
import type { Env } from "~/env.server";

/**
 * POST /api/reports
 * รองรับการยิงคำขอสร้างรายงาน AI จากแอปมือถือ (Expo)
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  // 1. ตรวจสอบ Bearer Token
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return json({ error: "Unauthorized: Missing Bearer Token" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1]!;
  const { supabase } = createSupabaseClient(request, env);

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return json({ error: "Unauthorized: Invalid token" }, { status: 401 });
  }

  // 2. ดึงข้อมูล Profile และตรวจสอบวันเกิด
  const profile = await getProfile(user.id, request, env);
  if (!profile?.birth_date) {
    return json({ error: "กรุณากรอกข้อมูลวันเกิดของคุณในหน้าตั้งค่าก่อนสร้างรายงาน" }, { status: 400 });
  }

  // 3. รับข้อมูลประเภทรายงานจาก Body
  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { report_type } = body;
  if (!report_type) {
    return json({ error: "กรุณาระบุประเภทรายงาน (report_type)" }, { status: 400 });
  }

  // Mapping ประเภทรายงานระหว่างมือถือ (snake_case) กับหลังบ้าน
  const reportTypeMap: Record<string, string> = {
    life_overview: "general_prediction",
    yearly_forecast: "annual_forecast",
    monthly_forecast: "general_prediction",
    relationship: "relationship",
    career: "career",
    health: "general_prediction",
    personal_branding: "personal_branding",
    wealth: "wealth",
  };
  const backendReportType = reportTypeMap[report_type] || "general_prediction";

  // 4. Server-Side AI Cost Guard (Pre-Flight: Auth → Entitlement → Quota → Rate Limit → Concurrency → Payload)
  const { guardAiRequestPreflight, recordAiExecutionTelemetry } = await import("~/services/aiCostGuard.server");

  const guard = await guardAiRequestPreflight({
    userId: user.id,
    profile,
    featureType: "ai_report",
    promptText: backendReportType,
    env,
    supabase,
  });

  if (!guard.allowed) {
    return json({
      error: guard.errorMessage,
      code: guard.errorCode,
    }, { status: guard.status });
  }

  // 5. ตรวจสอบทรายกาลเวลา (Sands of Time)
  const userPlan = getUserPlan(profile);
  const isMasterOrAdmin = userPlan === "master" || profile?.role === "admin" || profile?.role === "operator";
  const currentSands = profile?.time_sands ?? 0;

  if (!isMasterOrAdmin && currentSands <= 0) {
    await guard.releaseSlot();
    return json({ error: "ขออภัย ทรายกาลเวลา (Sands of Time) ในนาฬิกาทรายของคุณหมดแล้ว กรุณาเติมทรายหรืออัปเกรดเพื่อรับทรายเพิ่ม" }, { status: 403 });
  }

  try {
    // 6. รัน AI Report (ผ่าน Stream)
    const stream = await generateAIReport(
      {
        userId: user.id,
        reportType: backendReportType,
        context: {
          birthDate: profile.birth_date,
          birthTime: profile.birth_time || null,
          birthPlace: profile.birth_place || null,
          displayName: profile.display_name || "ผู้ใช้งาน",
        },
        locale: (profile.language as any) || "th",
      },
      env
    );

    // 6. รวบรวมข้อมูล Stream เป็น Plain Text
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let text = "";
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.text) text += parsed.text;
          } catch (e) {
            // skip malformed chunk
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!text || text.length < 50) {
      await recordAiExecutionTelemetry({
        userId: user.id,
        profile,
        reportType: backendReportType,
        outputText: text,
        env,
        isSuccess: false,
        error: new Error("AI output empty or too short (< 50 chars)"),
        releaseSlot: guard.releaseSlot,
        refundSandsIfNeeded: guard.refundSandsIfNeeded,
      });
      return json({ error: "ระบบพยากรณ์ไม่ส่งเนื้อหากลับมา หรือเนื้อหาสั้นเกินไป กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
    }

    // 7. บันทึกผลรายงานลงตาราง ai_reports
    const { data: report, error: insertError } = await supabase
      .from("ai_reports")
      .insert({
        user_id: user.id,
        report_type: backendReportType,
        content: text,
      })
      .select("id")
      .single();

    if (insertError || !report) {
      await recordAiExecutionTelemetry({
        userId: user.id,
        profile,
        reportType: backendReportType,
        outputText: text,
        env,
        isSuccess: false,
        error: insertError || new Error("Unknown insert error"),
        releaseSlot: guard.releaseSlot,
        refundSandsIfNeeded: guard.refundSandsIfNeeded,
      });
      return json({ error: `บันทึกรายงานไม่สำเร็จ: ${insertError?.message || "Unknown error"}` }, { status: 500 });
    }

    // 8. บันทึกการใช้งานและ Telemetry (SSoT Cost & Anomaly Detection)
    await recordAiExecutionTelemetry({
      userId: user.id,
      profile,
      reportType: backendReportType,
      outputText: text,
      env,
      isSuccess: true,
      releaseSlot: guard.releaseSlot,
      refundSandsIfNeeded: guard.refundSandsIfNeeded,
    });

    supabase.from("ai_report_usage").insert({
      user_id: user.id,
      report_type: backendReportType,
      tier: profile?.plan || "free",
    }).then(({ error }) => {
      if (error) console.error("[api.reports] Usage record error:", error);
    });

    return json({ 
      success: true, 
      reportId: report.id,
      isPayPerUse: guard.isPayPerUse,
      sandsCharged: guard.sandsCharged,
    });

  } catch (err: any) {
    console.error("[api.reports] Critical error:", err);
    await recordAiExecutionTelemetry({
      userId: user.id,
      profile,
      reportType: backendReportType,
      env,
      isSuccess: false,
      error: err,
      releaseSlot: guard.releaseSlot,
      refundSandsIfNeeded: guard.refundSandsIfNeeded,
    });
    return json({ error: `ขออภัย เกิดข้อผิดพลาดของระบบ: ${err.message || "Unknown error"}` }, { status: 500 });
  }
}
