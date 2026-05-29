import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, useActionData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { generateAIReport } from "~/services/ai.server";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "สร้างรายงาน AI — PhopePhum" },
];

const REPORT_TYPES = [
  { value: "general_prediction", label: "พยากรณ์ทั่วไป",  icon: "🪐", desc: "ภาพรวมดวงชะตาและเส้นทางชีวิต" },
  { value: "life_overview",      label: "ภาพรวมชีวิต",    icon: "✨", desc: "วิเคราะห์โครงสร้างชีวิตเชิงลึก" },
  { value: "career",             label: "การงาน",          icon: "💼", desc: "ดวงและโอกาสด้านการงาน" },
  { value: "relationship",       label: "ความสัมพันธ์",   icon: "💫", desc: "ดวงความรักและการเชื่อมต่อ" },
  { value: "wealth",             label: "การเงิน",         icon: "💎", desc: "ดวงทรัพย์และโอกาสการเงิน" },
  { value: "annual_forecast",    label: "พยากรณ์รายปี",   icon: "📅", desc: "แผนที่พลังงานรายปี" },
] as const;

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);
  return json({ profile });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  const formData = await request.formData();
  const reportType = String(formData.get("reportType") ?? "general_prediction");

  if (!profile?.birth_date) {
    return json(
      { error: "กรุณากรอกวันเกิดในหน้าตั้งค่าก่อนสร้างรายงาน" },
      { status: 400 }
    );
  }

  try {
    const stream = await generateAIReport(
      {
        userId: user.id,
        reportType,
        context: {
          birthDate:  profile.birth_date,
          birthTime:  profile.birth_time  ?? null,
          birthPlace: profile.birth_place ?? null,
          displayName: profile.display_name ?? "ผู้ใช้งาน",
        },
      },
      env
    );

    // Collect stream → text
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }

    // Save to DB
    const { supabase } = createSupabaseClient(request, env);
    const { data: report, error } = await supabase
      .from("ai_reports")
      .insert({
        user_id:     user.id,
        report_type: reportType,
        content:     { text },
      })
      .select("id")
      .single();

    if (error || !report) {
      return json({ error: "บันทึกรายงานไม่สำเร็จ" }, { status: 500 });
    }

    return redirect(`/dashboard/reports/${report.id}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    return json({ error: `ไม่สามารถสร้างรายงานได้: ${msg}` }, { status: 500 });
  }
}

export default function NewReportPage() {
  const { profile } = useLoaderData<typeof loader>();
  const actionData  = useActionData<typeof action>();
  const navigation  = useNavigation();
  const isGenerating = navigation.state === "submitting";

  const hasProfile = Boolean(profile?.birth_date);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <p className="text-[#D9BC82] text-xs tracking-widest uppercase mb-2">สร้างใหม่</p>
        <h1 className="font-display text-3xl font-bold text-[#F8F6F1]">รายงาน AI</h1>
        <p className="text-[#94A3B8] text-sm mt-1">
          เลือกประเภทรายงานที่ต้องการวิเคราะห์
        </p>
      </div>

      {/* No profile warning */}
      {!hasProfile && (
        <div className="rounded-xl border border-[#D9BC82]/30 bg-[#D9BC82]/5 px-5 py-4 text-sm text-[#D9BC82]">
          กรุณา{" "}
          <a href="/dashboard/settings" className="underline underline-offset-2 hover:text-[#F2D49B]">
            กรอกวันเกิด
          </a>{" "}
          ในหน้าตั้งค่าก่อนสร้างรายงาน
        </div>
      )}

      {/* Error */}
      {actionData?.error && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/5 px-5 py-4 text-sm text-red-400">
          {actionData.error}
        </div>
      )}

      <Form method="post">
        {/* Report type grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {REPORT_TYPES.map((type) => (
            <label key={type.value} className="cursor-pointer group">
              <input
                type="radio"
                name="reportType"
                value={type.value}
                defaultChecked={type.value === "general_prediction"}
                className="sr-only peer"
              />
              <div className="card-glass p-4 flex items-start gap-3 peer-checked:border-[#C6A96B]/60 peer-checked:bg-[#C6A96B]/8 transition-all group-hover:border-[#C6A96B]/30">
                <span className="text-2xl mt-0.5">{type.icon}</span>
                <div>
                  <p className="text-[#F8F6F1] font-medium text-sm peer-checked:text-[#D9BC82]">
                    {type.label}
                  </p>
                  <p className="text-[#94A3B8] text-xs mt-0.5">{type.desc}</p>
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          loading={isGenerating}
          disabled={!hasProfile || isGenerating}
          className="w-full btn-gold-shine border-0"
        >
          {isGenerating ? "กำลังวิเคราะห์ด้วย AI..." : "สร้างรายงาน"}
        </Button>
      </Form>
    </div>
  );
}
