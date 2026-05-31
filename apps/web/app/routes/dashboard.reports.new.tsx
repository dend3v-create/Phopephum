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
  { title: "สร้างบทวิเคราะห์ชีวิต — PhopePhum" },
];

const REPORT_TYPES = [
  {
    value: "general_prediction",
    label: "พยากรณ์ทั่วไป",
    icon: "🪐",
    desc: "ภาพรวมดวงชะตาและเส้นทางชีวิต",
    color: "from-violet-500/20 to-purple-500/10",
    border: "border-violet-500/30",
    glow: "shadow-violet-500/10",
  },
  {
    value: "life_overview",
    label: "ภาพรวมชีวิต",
    icon: "✨",
    desc: "วิเคราะห์โครงสร้างชีวิตเชิงลึก",
    color: "from-amber-500/20 to-yellow-500/10",
    border: "border-amber-500/30",
    glow: "shadow-amber-500/10",
  },
  {
    value: "career",
    label: "การงาน",
    icon: "💼",
    desc: "ดวงและโอกาสด้านการงาน",
    color: "from-sky-500/20 to-blue-500/10",
    border: "border-sky-500/30",
    glow: "shadow-sky-500/10",
  },
  {
    value: "relationship",
    label: "ความสัมพันธ์",
    icon: "💫",
    desc: "ดวงความรักและการเชื่อมต่อ",
    color: "from-rose-500/20 to-pink-500/10",
    border: "border-rose-500/30",
    glow: "shadow-rose-500/10",
  },
  {
    value: "wealth",
    label: "การเงิน",
    icon: "💎",
    desc: "ดวงทรัพย์และโอกาสการเงิน",
    color: "from-emerald-500/20 to-green-500/10",
    border: "border-emerald-500/30",
    glow: "shadow-emerald-500/10",
  },
  {
    value: "annual_forecast",
    label: "พยากรณ์รายปี",
    icon: "📅",
    desc: "แผนที่พลังงานรายปี",
    color: "from-cyan-500/20 to-teal-500/10",
    border: "border-cyan-500/30",
    glow: "shadow-cyan-500/10",
  },
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
    return json({ error: "กรุณากรอกวันเกิดก่อนสร้างรายงาน" });
  }

  try {
    const { supabase } = createSupabaseClient(request, env);

    // อัปเดต profile โดยตรง (ไม่ใช้ RPC)
    await supabase
      .from("profiles")
      .update({
        ...(displayName && { display_name: displayName }),
        ...(birthDate && { birth_date: birthDate }),
        ...(birthTime && { birth_time: birthTime }),
        ...(birthPlace && { birth_place: birthPlace }),
      })
      .eq("id", user.id);

    const stream = await generateAIReport(
      {
        userId: user.id,
        reportType,
        context: {
          birthDate,
          birthTime: birthTime || null,
          birthPlace: birthPlace || null,
          displayName: displayName || "ผู้ใช้งาน",
        },
      },
      env
    );

    // Collect SSE stream → plain text
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
          if (parsed.text) text += parsed.text;
        } catch {
          // skip malformed chunks
        }
      }
    }

    if (!text) {
      return json({ error: "AI ไม่ส่งเนื้อหากลับมา กรุณาลองใหม่อีกครั้ง" });
    }

    const { data: report, error: insertError } = await supabase
      .from("ai_reports")
      .insert({
        user_id: user.id,
        report_type: reportType,
        content: { text },
      })
      .select("id")
      .single();

    if (insertError || !report) {
      console.error("DB insert error:", insertError);
      return json({ error: "บันทึกรายงานไม่สำเร็จ กรุณาลองใหม่" });
    }

    return redirect(`/dashboard/reports/${report.id}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
    console.error("Report generation error:", msg);
    return json({ error: `ไม่สามารถสร้างรายงานได้: ${msg}` });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function NewReportPage() {
  const { profile } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isGenerating = navigation.state === "submitting";

  const [selectedType, setSelectedType] = useState<string>("general_prediction");
  const selectedMeta = REPORT_TYPES.find((t) => t.value === selectedType);

  return (
    <div className="max-w-2xl space-y-8 pb-20">

      {/* ── Header ── */}
      <div className="relative">
        <div className="absolute -top-4 -left-4 w-32 h-32 bg-[#C6A96B]/8 rounded-full blur-3xl pointer-events-none" />
        <p className="text-[#C9A96E] text-[10px] tracking-[0.25em] uppercase font-bold mb-2">
          ✦ สร้างใหม่
        </p>
        <h1 className="font-display text-3xl font-bold text-[#F8F6F1]">
          บทวิเคราะห์ชีวิต
        </h1>
        <p className="text-[#8A8070] text-sm mt-1">
          AI วิเคราะห์ดวงชะตาจากระบบ Wisdom Engine · ทักษา · มหาภูติ · เลข 7 ตัว
        </p>
      </div>

      {/* ── Error ── */}
      {actionData?.error && (
        <div className="animate-in fade-in rounded-2xl border border-red-400/30 bg-red-400/5 px-5 py-4 flex items-start gap-3">
          <span className="text-red-400 text-lg flex-shrink-0 mt-0.5">⚠</span>
          <div>
            <p className="text-sm font-semibold text-red-300 mb-0.5">เกิดข้อผิดพลาด</p>
            <p className="text-sm text-red-400/80">{actionData.error}</p>
          </div>
        </div>
      )}

      <Form method="post" className="space-y-8">

        {/* ── Report Type Grid ── */}
        <div>
          <p className="text-[#8A8070] text-[10px] uppercase tracking-widest font-bold mb-3">
            เลือกประเภทรายงาน
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REPORT_TYPES.map((type) => {
              const isSelected = selectedType === type.value;
              return (
                <label key={type.value} className="cursor-pointer group select-none">
                  <input
                    type="radio"
                    name="reportType"
                    value={type.value}
                    checked={isSelected}
                    onChange={() => setSelectedType(type.value)}
                    className="sr-only"
                  />
                  <div
                    className={`relative overflow-hidden rounded-2xl border p-4 flex items-start gap-3 transition-all duration-200 ${
                      isSelected
                        ? `bg-gradient-to-br ${type.color} ${type.border} shadow-lg ${type.glow}`
                        : "border-white/8 bg-slate-800/30 hover:border-white/15 hover:bg-slate-800/50"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#C9A96E] flex items-center justify-center">
                        <span className="text-[8px] text-black font-bold leading-none">✓</span>
                      </div>
                    )}
                    <span className="text-2xl mt-0.5 flex-shrink-0">{type.icon}</span>
                    <div className="min-w-0 pr-4">
                      <p className={`font-semibold text-sm ${isSelected ? "text-[#F8F6F1]" : "text-[#D9CDB7]"}`}>
                        {type.label}
                      </p>
                      <p className="text-[#8A8070] text-xs mt-0.5 leading-relaxed">{type.desc}</p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* ── Birth Info ── */}
        <div className="rounded-2xl border border-white/8 bg-slate-900/40 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 bg-white/3">
            <p className="text-[#F8F6F1] text-sm font-semibold">ข้อมูลสำหรับผูกดวง</p>
            <p className="text-[#8A8070] text-[11px] mt-0.5">
              ดึงจากโปรไฟล์อัตโนมัติ — แก้ไขได้เพื่อใช้ในรายงานนี้
            </p>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                name="displayName"
                label="ชื่อที่ใช้แสดงในรายงาน"
                defaultValue={profile?.display_name ?? ""}
                placeholder="ชื่อของคุณ"
              />
            </div>
            <Input
              name="birthDate"
              type="date"
              label="วันเกิด (ค.ศ.) *"
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
                defaultValue={profile?.birth_place ?? ""}
                placeholder="เช่น กรุงเทพฯ, เชียงใหม่"
              />
            </div>
          </div>
        </div>

        {/* ── Selected Preview ── */}
        {selectedMeta && (
          <div className={`rounded-2xl border bg-gradient-to-r ${selectedMeta.color} ${selectedMeta.border} p-4 flex items-center gap-4`}>
            <span className="text-3xl flex-shrink-0">{selectedMeta.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[#F8F6F1] font-semibold text-sm">{selectedMeta.label}</p>
              <p className="text-[#8A8070] text-xs">{selectedMeta.desc}</p>
            </div>
            <div className="text-right flex-shrink-0 hidden sm:block">
              <p className="text-[#C9A96E] text-[10px] font-bold uppercase">AI วิเคราะห์</p>
              <p className="text-[#8A8070] text-[10px]">~30–60 วิ</p>
            </div>
          </div>
        )}

        {/* ── Submit Button ── */}
        <Button
          type="submit"
          loading={isGenerating}
          disabled={isGenerating}
          className="w-full h-14 text-base font-bold"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              กำลังเปิดบทวิเคราะห์... (30–60 วิ)
            </span>
          ) : (
            `✨ สร้างบทวิเคราะห์ · ${selectedMeta?.label ?? ""}`
          )}
        </Button>

        <p className="text-center text-[#8A8070] text-[11px]">
          ระบบ AI ใช้เฉพาะข้อมูลดวงชะตาของคุณ ไม่เก็บข้อมูลส่วนตัวอื่น
        </p>
      </Form>

      {/* ── Full-screen Generating Overlay ── */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/85 backdrop-blur-md">
          <div className="text-center space-y-6 px-8 max-w-xs">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 rounded-full border border-[#C9A96E]/20 animate-ping" />
              <div
                className="absolute inset-2 rounded-full border border-[#C9A96E]/30 animate-ping"
                style={{ animationDelay: "0.3s" }}
              />
              <div className="relative w-24 h-24 rounded-full bg-[#C9A96E]/8 border border-[#C9A96E]/25 flex items-center justify-center">
                <span className="text-4xl">{selectedMeta?.icon ?? "✨"}</span>
              </div>
            </div>
            <div>
              <p className="font-display text-xl font-bold text-[#F8F6F1] mb-1">
                กำลังเปิดดวงชะตา
              </p>
              <p className="text-[#C9A96E] text-sm font-semibold mb-2">
                {selectedMeta?.label}
              </p>
              <p className="text-[#8A8070] text-xs leading-relaxed">
                AI กำลังวิเคราะห์ทักษา มหาภูติ และเลข 7 ตัว<br />กรุณารอสักครู่...
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#C9A96E]/60 animate-bounce"
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
