import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, useActionData, useSearchParams } from "@remix-run/react";
import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireMinPlan, requireAuth, getProfile } from "~/services/auth.server";
import { getUserPlan, getAiReportLimit } from "~/services/permissions.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { generateAIReport } from "~/services/ai.server";
import { alertAIFailed, alertDatabaseError } from "~/services/alert.server";
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
    label: "พยากรณ์ปัญญาชีวิต",
    icon: "🧘",
    desc: "แนวทางบำบัดและไกด์เส้นทางชีวิตหลัก",
    color: "from-violet-500/20 to-purple-500/10",
    border: "border-violet-500/30",
    glow: "shadow-violet-500/10",
  },
  {
    value: "personal_branding",
    label: "ตัวตน & อัตลักษณ์",
    icon: "🎭",
    desc: "เสน่ห์จากพื้นดวงและแบรนด์บุคคล",
    color: "from-amber-500/20 to-orange-500/10",
    border: "border-amber-500/30",
    glow: "shadow-amber-500/10",
  },
  {
    value: "career",
    label: "ภารกิจ & ความสำเร็จ",
    icon: "🚀",
    desc: "หน้าที่ความรับผิดชอบและเป้าหมายชีวิต",
    color: "from-sky-500/20 to-blue-500/10",
    border: "border-sky-500/30",
    glow: "shadow-sky-500/10",
  },
  {
    value: "relationship",
    label: "เสน่ห์ & สัมพันธ์",
    icon: "✨",
    desc: "สายใยบทเรียนและเมตตาบารมี",
    color: "from-rose-500/20 to-pink-500/10",
    border: "border-rose-500/30",
    glow: "shadow-rose-500/10",
  },
  {
    value: "wealth",
    label: "กระแสทรัพย์ & มั่งคั่ง",
    icon: "💰",
    desc: "คลังสมบัติประจำดวงและวิถีดึงดูดทรัพย์",
    color: "from-emerald-500/20 to-green-500/10",
    border: "border-emerald-500/30",
    glow: "shadow-emerald-500/10",
  },
  {
    value: "annual_forecast",
    label: "จังหวะชะตารายปี",
    icon: "📅",
    desc: "แผนที่พลังงานและบทเรียนปีจร",
    color: "from-cyan-500/20 to-teal-500/10",
    border: "border-cyan-500/30",
    glow: "shadow-cyan-500/10",
  },
] as const;

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { profile } = await requireMinPlan("basic", request, env);
  const aiLimit = getAiReportLimit(profile);
  return json({ profile, aiLimit });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);

  const formData = await request.formData();
  const reportType = String(formData.get("reportType") ?? "general_prediction");
  const displayName = String(formData.get("displayName") ?? "");
  
  // ── แปลงวันที่เกิด พ.ศ. ➔ ค.ศ. ──
  const bDay = Number(formData.get("birthDay") ?? "0");
  const bMonth = Number(formData.get("birthMonth") ?? "0");
  const bYear = Number(formData.get("birthYear") ?? "0");
  const bYearCE = bYear - 543;
  const birthDate = bDay && bMonth && bYear 
    ? `${bYearCE}-${String(bMonth).padStart(2, "0")}-${String(bDay).padStart(2, "0")}` 
    : "";

  const birthTime = String(formData.get("birthTime") ?? "");
  const birthPlace = String(formData.get("birthPlace") ?? "");

  if (!birthDate) {
    return json({ error: "กรุณาเลือกวันเกิดก่อนสร้างรายงาน" });
  }

  try {
    const { supabase } = createSupabaseClient(request, env);
    const profile = await getProfile(user.id, request, env);

    // ── 1. Quota Check — enforce time_sands balance for non-imperial plans ──
    const userPlan = getUserPlan(profile);
    const isPremium = userPlan === "imperial" || profile?.role === "admin" || profile?.role === "operator";
    const currentSands = profile?.time_sands ?? 0;

    if (!isPremium) {
      if (currentSands <= 0) {
        return json({ error: "ขออภัย ท่านไม่มีทรายกาลเวลา (Sands of Time) คงเหลือในระบบนาฬิกาทราย กรุณาอัปเกรดแผนสมาชิกหรือเติมเม็ดทรายกาลเวลาเพื่อสร้างรายงานใหม่" });
      }
    }

    // ── 2. Update Profile ──
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({
        ...(displayName && { display_name: displayName }),
        ...(birthDate && { birth_date: birthDate }),
        ...(birthTime && { birth_time: birthTime }),
        ...(birthPlace && { birth_place: birthPlace }),
      })
      .eq("id", user.id);

    if (profileUpdateError) {
      console.warn("Profile update during report gen warning:", profileUpdateError);
    }

    // ── 3. Call AI Service ──
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

    // ── 4. Collect SSE stream → plain text ──
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
            console.error("Malformed SSE chunk:", raw, e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!text || text.length < 50) {
      return json({ error: "ระบบพยากรณ์ไม่ส่งเนื้อหากลับมา หรือเนื้อหาสั้นเกินไป กรุณาลองใหม่อีกครั้ง" });
    }

    // ── 5. Save to Database ──
    const { data: report, error: insertError } = await supabase
      .from("ai_reports")
      .insert({
        user_id: user.id,
        report_type: reportType,
        content: text,
      })
      .select("id")
      .single();

    if (insertError || !report) {
      console.error("Report save error:", insertError);
      alertDatabaseError(env, "insert ai_reports", insertError, user.id).catch(console.error);
      return json({ error: `บันทึกรายงานไม่สำเร็จ: ${insertError?.message || "Unknown error"}` });
    }

    // ── 5.1 Decrement Sands of Time if not premium (ไหลลดลง 1 ละอองทราย) ──
    if (!isPremium) {
      const { error: decrementError } = await supabase
        .from("profiles")
        .update({ time_sands: currentSands - 1 })
        .eq("id", user.id);
      
      if (decrementError) {
        console.error("Failed to decrement time_sands:", decrementError);
      }
    }

    // ── 6. Record Usage (Non-blocking) ──
    supabase.from("ai_report_usage").insert({
      user_id: user.id,
      report_type: reportType,
      tier: profile?.plan || "free",
    }).then(({ error }) => {
      if (error) console.error("Usage record error:", error);
    });

    return redirect(`/dashboard/reports/${report.id}`);

  } catch (err) {
    const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
    console.error("Report generation critical error:", msg);
    alertAIFailed(env, err, { userId: user.id, reportType }).catch(console.error);
    return json({ error: `ขออภัย ระบบเกิดข้อผิดพลาด: ${msg}` });
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

  const [searchParams] = useSearchParams();
  const defaultType = searchParams.get("type") || "general_prediction";

  const [selectedType, setSelectedType] = useState<string>(defaultType);
  const selectedMeta = REPORT_TYPES.find((t) => t.value === selectedType);

  // ── Hydration Fix ──
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // ── คำนวณค่าเริ่มต้นวันเกิด (พ.ศ.) ──
  const birthDateObj = profile?.birth_date ? new Date(profile.birth_date) : null;
  const defaultBDay = birthDateObj ? birthDateObj.getDate() : 15;
  const defaultBMonth = birthDateObj ? birthDateObj.getMonth() + 1 : 6;
  const defaultBYear = birthDateObj ? birthDateObj.getFullYear() + 543 : 2540;

  if (!mounted) {
    return (
      <div className="max-w-2xl space-y-8 pb-20 animate-pulse">
        <div className="h-24 bg-white/5 rounded-2xl" />
        <div className="h-64 bg-white/5 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8 pb-20 animate-fade-in">

      {/* ── Header ── */}
      <div className="relative">
        <div className="absolute -top-4 -left-4 w-32 h-32 bg-[#C6A96B]/8 rounded-full blur-3xl pointer-events-none" />
        <p className="text-[#C9A96E] text-[13px] tracking-[0.25em] uppercase font-bold mb-2">
          ✦ สร้างใหม่
        </p>
        <h1 className="font-display text-3xl font-bold text-[#F8F6F1]">
          บทวิเคราะห์ชีวิต
        </h1>
        <p className="text-[#8A8070] text-sm mt-1">
          ถอดรหัสชะตาชีวิตด้วยระบบ Living Wisdom Engine · ทักษา · มหาภูติ · เลข 7 ตัว
        </p>
      </div>

      {/* ── Error ── */}
      {actionData?.error && (
        <div className="animate-in fade-in rounded-2xl border border-red-400/30 bg-red-400/5 px-5 py-4 flex items-start gap-3">
          <span className="text-red-400 text-lg flex-shrink-0 mt-0.5">⚠</span>
          <div>
            <p className="text-sm font-semibold text-red-300 mb-0.5">เกิดข้อผิดพลาด</p>
            <p className="text-xs text-red-200/80 leading-relaxed">{actionData.error}</p>
          </div>
        </div>
      )}

      <Form method="post" className="space-y-8">

        {/* ── Report Type Grid ── */}
        <div>
          <p className="text-[#8A8070] text-[13px] uppercase tracking-widest font-bold mb-3">
            เลือกประเภทรายงาน
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REPORT_TYPES.map((type) => (
              <label
                key={type.value}
                className={`
                  relative cursor-pointer group rounded-2xl border p-4 transition-all duration-300
                  ${selectedType === type.value 
                    ? `bg-gradient-to-br ${type.color} ${type.border} shadow-[0_0_20px_rgba(198,169,107,0.05)]` 
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                  }
                `}
              >
                <input
                  type="radio"
                  name="reportType"
                  value={type.value}
                  checked={selectedType === type.value}
                  onChange={() => setSelectedType(type.value)}
                  className="sr-only"
                />
                <div className="flex gap-4">
                  <span className={`text-2xl transition-transform duration-300 ${selectedType === type.value ? 'scale-110' : 'group-hover:scale-105'}`}>
                    {type.icon}
                  </span>
                  <div>
                    <p className={`text-sm font-bold ${selectedType === type.value ? 'text-[#F8F6F1]' : 'text-[#D9CDB7]'}`}>
                      {type.label}
                    </p>
                    <p className="text-[13px] text-[#8A8070] mt-0.5 leading-relaxed">
                      {type.desc}
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ── Profile Info ── */}
        <div className="space-y-6">
          <div>
            <p className="text-[#8A8070] text-[13px] uppercase tracking-widest font-bold mb-3 flex items-center justify-between">
              <span>ข้อมูลสำหรับผูกดวง</span>
              <span className="font-normal normal-case opacity-60">ดึงจากโปรไฟล์อัตโนมัติ - แก้ไขได้เพื่อใช้ในรายงานนี้</span>
            </p>
            
            <div className="card-glass border-white/5 p-6 rounded-2xl space-y-6">
              <Input
                name="displayName"
                label="ชื่อที่ใช้แสดงในรายงาน"
                defaultValue={profile?.display_name || ""}
                placeholder="ระบุชื่อของคุณ"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-[#8A8070] uppercase tracking-wider ml-1">วันเกิด (พ.ศ.)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select name="birthDay" defaultValue={defaultBDay} className="bg-black/40 border border-white/10 rounded-xl px-2 py-2.5 text-xs text-[#F8F6F1] focus:border-[#C6A96B] transition-all">
                      {Array.from({ length: 31 }, (_, i) => (
                        <option key={i+1} value={i+1}>{i+1}</option>
                      ))}
                    </select>
                    <select name="birthMonth" defaultValue={defaultBMonth} className="bg-black/40 border border-white/10 rounded-xl px-2 py-2.5 text-xs text-[#F8F6F1] focus:border-[#C6A96B] transition-all">
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i+1} value={i+1}>{i+1}</option>
                      ))}
                    </select>
                    <select name="birthYear" defaultValue={defaultBYear} className="bg-black/40 border border-white/10 rounded-xl px-2 py-2.5 text-xs text-[#F8F6F1] focus:border-[#C6A96B] transition-all">
                      {Array.from({ length: 100 }, (_, i) => {
                        const y = new Date().getFullYear() + 543 - i;
                        return <option key={y} value={y}>{y}</option>;
                      })}
                    </select>
                  </div>
                </div>

                <Input
                  name="birthTime"
                  type="time"
                  label="เวลาเกิด"
                  defaultValue={profile?.birth_time || ""}
                />

                <Input
                  name="birthPlace"
                  label="จังหวัดที่เกิด"
                  defaultValue={profile?.birth_place || ""}
                  placeholder="เช่น กรุงเทพฯ"
                />
              </div>
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
              <p className="text-[#C9A96E] text-[13px] font-bold uppercase">Wisdom Guidance</p>
              <p className="text-[#8A8070] text-[13px]">~30–60 วิ</p>
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
              กำลังประมวลผล... (30–60 วิ)
            </span>
          ) : (
            `✨ สร้างบทวิเคราะห์ · ${selectedMeta?.label ?? ""}`
          )}
        </Button>

        <p className="text-center text-[#8A8070] text-[14px]">
          ระบบ Living Wisdom ใช้เฉพาะข้อมูลดวงชะตาของคุณ ไม่เก็บข้อมูลส่วนตัวอื่น
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
                ระบบกำลังวิเคราะห์ทักษา มหาภูติ และเลข 7 ตัว<br />กรุณารอสักครู่...
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
