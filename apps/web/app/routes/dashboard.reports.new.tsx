import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, useActionData } from "@remix-run/react";
import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { generateAIReport } from "~/services/ai.server";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
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

  const formData = await request.formData();
  const reportType = String(formData.get("reportType") ?? "general_prediction");
  
  const displayName = String(formData.get("displayName") ?? "");
  const birthDate = String(formData.get("birthDate") ?? "");
  const birthTime = String(formData.get("birthTime") ?? "");
  const birthPlace = String(formData.get("birthPlace") ?? "");

  if (!birthDate) {
    return json(
      { error: "กรุณากรอกวันเกิดก่อนสร้างรายงาน" },
      { status: 400 }
    );
  }

  try {
    // Optional: Update the user's profile with the new data so it's saved for next time
    const { supabase } = createSupabaseClient(request, env);
    await supabase.rpc("update_profile", {
      p_display_name: displayName,
      p_birth_date: birthDate || null,
      p_birth_time: birthTime || null,
      p_birth_place: birthPlace || null,
    });

    const stream = await generateAIReport(
      {
        userId: user.id,
        reportType,
        context: {
          birthDate:  birthDate,
          birthTime:  birthTime  || null,
          birthPlace: birthPlace || null,
          displayName: displayName || "ผู้ใช้งาน",
        },
      },
      env
    );

    // Collect stream → text
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let text = "";
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === "[DONE]") continue;

        try {
          const parsed = JSON.parse(raw);
          if (parsed.text) {
            text += parsed.text;
          }
        } catch {
          // skip invalid json chunks
        }
      }
    }

    // Save to DB
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

  const [selectedType, setSelectedType] = useState<string>("general_prediction");

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

      {/* Error */}
      {actionData?.error && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/5 px-5 py-4 text-sm text-red-400">
          {actionData.error}
        </div>
      )}

      <Form method="post" className="space-y-8">
        {/* Report type grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {REPORT_TYPES.map((type) => {
            const isSelected = selectedType === type.value;
            return (
              <label key={type.value} className="cursor-pointer group">
                <input
                  type="radio"
                  name="reportType"
                  value={type.value}
                  checked={isSelected}
                  onChange={() => setSelectedType(type.value)}
                  className="sr-only"
                />
                <div className={`card-glass p-4 flex items-start gap-3 transition-all ${
                  isSelected 
                    ? "border-[#C6A96B]/60 bg-[#C6A96B]/8" 
                    : "border-transparent group-hover:border-[#C6A96B]/30"
                }`}>
                  <span className="text-2xl mt-0.5">{type.icon}</span>
                  <div>
                    <p className={`font-medium text-sm transition-colors ${
                      isSelected ? "text-[#D9BC82]" : "text-[#F8F6F1]"
                    }`}>
                      {type.label}
                    </p>
                    <p className="text-[#94A3B8] text-xs mt-0.5">{type.desc}</p>
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Profile Editing Section */}
        <div className="pt-6 border-t border-slate-800">
          <h2 className="text-lg font-semibold text-[#F8F6F1] mb-1">ข้อมูลสำหรับผูกดวง</h2>
          <p className="text-[#94A3B8] text-xs mb-4">ข้อมูลดึงมาจากโปรไฟล์ของคุณ สามารถแก้ไขเพื่อใช้ในรายงานนี้ได้</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                name="displayName"
                label="ชื่อที่ใช้แสดง"
                defaultValue={profile?.display_name ?? ""}
                required
              />
            </div>
            <Input
              name="birthDate"
              type="date"
              label="วันเกิด (ค.ศ.)"
              defaultValue={profile?.birth_date ?? ""}
              required
            />
            <Input
              name="birthTime"
              type="time"
              label="เวลาเกิด (ถ้าทราบ)"
              defaultValue={profile?.birth_time ?? ""}
            />
            <div className="sm:col-span-2">
              <Input
                name="birthPlace"
                label="จังหวัดที่เกิด"
                defaultValue={profile?.birth_place ?? profile?.birth_location ?? ""}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          loading={isGenerating}
          disabled={isGenerating}
          className="w-full btn-gold-shine border-0"
        >
          {isGenerating ? "กำลังวิเคราะห์ด้วย AI..." : "สร้างรายงาน"}
        </Button>
      </Form>
    </div>
  );
}
