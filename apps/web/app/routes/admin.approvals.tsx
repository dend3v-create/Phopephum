/**
 * admin.approvals.tsx
 * หน้าจัดการคำขออนุมัติสมาชิกและแพ็กเกจ
 * แอดมินกด "อนุมัติ" / "ปฏิเสธ" ได้ที่นี่
 * (เข้าถึงได้จากปุ่มใน LINE Flex Message)
 */
import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData, Form, useNavigation, useSearchParams } from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAdmin } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [{ title: "อนุมัติคำขอ — Admin" }];

interface RequestRow {
  id: string;
  user_id: string;
  type: string;
  plan: string;
  status: string;
  created_at: string;
  approved_at?: string;
  profiles: {
    display_name: string;
    email: string;
  };
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { user } = await requireAdmin(request, env);
  const { supabase } = createSupabaseClient(request, env);

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") || "pending";

  let query = supabase
    .from("subscription_requests")
    .select("*, profiles(display_name, email)")
    .order("created_at", { ascending: false });

  if (filter !== "all") {
    query.eq("status", filter);
  }

  const { data: requests, error } = await query;
  if (error) console.error("[admin/approvals] loader error:", error);

  return json({ requests: (requests ?? []) as unknown as RequestRow[], filter, adminId: user.id });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { user } = await requireAdmin(request, env);
  const { supabase } = createSupabaseClient(request, env);

  const formData = await request.formData();
  const requestId = String(formData.get("requestId") ?? "");
  const decision  = String(formData.get("decision") ?? ""); // "approved" | "rejected"
  const note      = String(formData.get("note") ?? "").trim();

  if (!requestId || !["approved", "rejected"].includes(decision)) {
    return json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  // ดึง request ที่จะ approve
  const { data: req } = await supabase
    .from("subscription_requests")
    .select("id, user_id, type, plan")
    .eq("id", requestId)
    .single();

  if (!req) return json({ error: "ไม่พบคำขอ" }, { status: 404 });

  // อัปเดต status
  const { error: updateError } = await supabase
    .from("subscription_requests")
    .update({
      status: decision,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      note: note || null,
    })
    .eq("id", requestId);

  if (updateError) {
    return json({ error: "เกิดข้อผิดพลาดในการอัปเดต" }, { status: 500 });
  }

  // อัปเดตสิทธิ์ผู้ใช้เมื่อแอดมินอนุมัติคำขอ
  if (decision === "approved") {
    if (req.type === "package_upgrade") {
      const isImperial = req.plan === "imperial";
      await supabase
        .from("profiles")
        .update({
          subscription: isImperial ? "lifetime" : "basic",
          plan: req.plan,
        })
        .eq("id", req.user_id);
    } else if (req.type === "registration") {
       const isImperial = req.plan === "imperial";
       await supabase
        .from("profiles")
        .update({
          subscription: isImperial ? "lifetime" : "free",
          plan: req.plan,
        })
        .eq("id", req.user_id);
    }
  }

  return json({ success: true });
}

const TYPE_LABEL: Record<string, string> = {
  registration: "สมัครสมาชิกใหม่",
  package_upgrade: "อัปเกรดแพ็กเกจ",
};

const PLAN_COLOR: Record<string, string> = {
  basic: "#34D399",
  pro: "#38BDF8",
  imperial: "#D9BC82",
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "รอดำเนินการ", color: "#FBBF24" },
  approved: { label: "อนุมัติแล้ว", color: "#34D399" },
  rejected: { label: "ปฏิเสธ", color: "#F87171" },
};

export default function AdminApprovals() {
  const { requests, filter } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get("highlight");
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const tabs = [
    { key: "pending", label: "รอการอนุมัติ" },
    { key: "approved", label: "ประวัติอนุมัติ" },
    { key: "all", label: "ทั้งหมด" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-[#F8F6F1] mb-1">อนุมัติคำขอ</h1>
        <p className="text-[#94A3B8] text-xs md:text-sm">
          จัดการคำขอสมาชิกและอัปเกรดแพ็กเกจ · กดปุ่มใน LINE เพื่อเปิดหน้านี้โดยตรง
        </p>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((tab) => (
          <a
            key={tab.key}
            href={`/admin/approvals?filter=${tab.key}`}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              filter === tab.key
                ? "text-[#020617]"
                : "text-[#94A3B8] border border-white/10 hover:border-[#C6A96B]/30"
            }`}
            style={filter === tab.key ? { background: "linear-gradient(135deg, #C6A96B, #D9BC82)" } : {}}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* Empty state */}
      {requests.length === 0 && (
        <div className="text-center py-16 text-[#94A3B8]">
          <p className="text-3xl mb-3 opacity-50">☽</p>
          <p className="text-sm italic">ไม่มีคำขอในขณะนี้</p>
        </div>
      )}

      {/* Request cards */}
      <div className="space-y-4">
        {requests.map((req) => {
          const isHighlighted = req.id === highlight;
          const planColor = PLAN_COLOR[req.plan] ?? "#94A3B8";
          const statusInfo = STATUS_LABEL[req.status] ?? { label: req.status, color: "#94A3B8" };

          return (
            <div
              key={req.id}
              id={req.id}
              className={`rounded-2xl border p-4 md:p-5 transition-all ${
                isHighlighted ? "border-[#C6A96B]/60 ring-1 ring-[#C6A96B]/20" : "border-white/10"
              }`}
              style={{
                background: isHighlighted ? "rgba(198,169,107,0.08)" : "rgba(15,23,42,0.6)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-sm font-bold text-[#F8F6F1]">
                      {req.profiles?.display_name || "ไม่มีชื่อ"}
                    </span>
                    <span className="text-[10px] text-[#94A3B8] truncate max-w-[150px]">{req.profiles?.email}</span>
                  </div>
                  
                  <div className="flex gap-2 items-center flex-wrap mb-3">
                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[#94A3B8]">
                      {TYPE_LABEL[req.type] || req.type}
                    </span>
                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-md" 
                          style={{ backgroundColor: `${planColor}15`, color: planColor, border: `1px solid ${planColor}30` }}>
                      {req.plan}
                    </span>
                  </div>

                  <p className="text-[10px] text-[#8A8070]">
                    ขอเมื่อ: {new Date(req.created_at).toLocaleString("th-TH")}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full border"
                        style={{ color: statusInfo.color, borderColor: `${statusInfo.color}30`, backgroundColor: `${statusInfo.color}10` }}>
                    {statusInfo.label}
                  </span>
                  
                  {req.status === "pending" && (
                    <Form method="post" className="flex items-center gap-2">
                      <input type="hidden" name="requestId" value={req.id} />
                      <button
                        name="decision"
                        value="approved"
                        disabled={isSubmitting}
                        className="bg-[#38BDF8] text-[#020617] px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                      >
                        อนุมัติ
                      </button>
                      <button
                        name="decision"
                        value="rejected"
                        disabled={isSubmitting}
                        className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all disabled:opacity-50"
                      >
                        ปฏิเสธ
                      </button>
                    </Form>
                  )}
                  
                  {req.approved_at && (
                    <p className="text-[9px] text-[#8A8070] italic">
                      Action at: {new Date(req.approved_at).toLocaleDateString("th-TH")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
