/**
 * admin.approvals.tsx
 * หน้าจัดการคำขออนุมัติสมาชิกและแพ็กเกจ
 * แอดมินกด "อนุมัติ" / "ปฏิเสธ" ได้ที่นี่
 * (เข้าถึงได้จากปุ่มใน LINE Flex Message)
 */
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAdmin } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [{ title: "อนุมัติคำขอ — Admin" }];

type RequestRow = {
  id: string;
  type: "registration" | "package_upgrade";
  plan: string;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  created_at: string;
  approved_at: string | null;
  profiles: {
    id: string;
    display_name: string | null;
    email: string | null;
    plan: string | null;
  } | null;
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { user } = await requireAdmin(request, env);
  const { supabase } = createSupabaseClient(request, env);

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") ?? "pending";

  const query = supabase
    .from("subscription_requests")
    .select(`
      id, type, plan, status, note, created_at, approved_at,
      profiles ( id, display_name, email, plan )
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (filter !== "all") {
    query.eq("status", filter);
  }

  const { data: requests, error } = await query;
  if (error) console.error("[admin/approvals] loader error:", error);

  return json({ requests: (requests ?? []) as RequestRow[], filter, adminId: user.id });
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

  // ถ้าอนุมัติ package_upgrade → update profile.plan
  if (decision === "approved" && req.type === "package_upgrade") {
    await supabase
      .from("profiles")
      .update({ plan: req.plan })
      .eq("id", req.user_id);
  }

  // ถ้าอนุมัติ registration → update profile.plan = basic (already default)

  return redirect("/admin/approvals?filter=pending");
}

// ─── Component ────────────────────────────────────────────────────────────────

const PLAN_COLOR: Record<string, string> = {
  basic:    "#94A3B8",
  pro:      "#C6A96B",
  imperial: "#4B6FAE",
};

const TYPE_LABEL: Record<string, string> = {
  registration:    "สมัครสมาชิกใหม่",
  package_upgrade: "อัปเกรดแพ็กเกจ",
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:  { label: "⏳ รออนุมัติ",  color: "#E8A44A" },
  approved: { label: "✅ อนุมัติแล้ว", color: "#34D399" },
  rejected: { label: "❌ ปฏิเสธ",     color: "#F87171" },
};

export default function AdminApprovalsPage() {
  const { requests, filter } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get("highlight");
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const tabs = [
    { key: "pending",  label: "รออนุมัติ" },
    { key: "approved", label: "อนุมัติแล้ว" },
    { key: "rejected", label: "ปฏิเสธ" },
    { key: "all",      label: "ทั้งหมด" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-[#F8F6F1] mb-1">อนุมัติคำขอ</h1>
        <p className="text-[#94A3B8] text-sm">
          จัดการคำขอสมาชิกและอัปเกรดแพ็กเกจ · กดปุ่มใน LINE เพื่อเปิดหน้านี้โดยตรง
        </p>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <a
            key={tab.key}
            href={`/admin/approvals?filter=${tab.key}`}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === tab.key
                ? "text-[#020617]"
                : "text-[#94A3B8] border border-white/10 hover:border-[#C6A96B]/30 hover:text-[#C6A96B]"
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
          <p className="text-4xl mb-3">☽</p>
          <p className="text-sm">ไม่มีคำขอในขณะนี้</p>
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
              className={`rounded-2xl border p-5 transition-all ${
                isHighlighted ? "border-[#C6A96B]/60 shadow-[0_0_30px_rgba(198,169,107,0.15)]" : "border-white/8"
              }`}
              style={{
                background: isHighlighted ? "rgba(198,169,107,0.06)" : "rgba(10,34,64,0.5)",
                backdropFilter: "blur(16px)",
              }}
            >
              {/* Top row */}
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[#F8F6F1]">
                      {req.profiles?.display_name ?? "—"}
                    </span>
                    <span className="text-[10px] text-[#94A3B8]">{req.profiles?.email}</span>
                    {isHighlighted && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider"
                        style={{ background: "rgba(198,169,107,0.2)", color: "#C6A96B" }}>
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-[#94A3B8] border border-white/10 rounded-full px-2 py-0.5">
                      {TYPE_LABEL[req.type] ?? req.type}
                    </span>
                    <span className="text-[10px] font-bold uppercase rounded-full px-2 py-0.5 border"
                      style={{ color: planColor, borderColor: `${planColor}40` }}>
                      {req.plan}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-semibold" style={{ color: statusInfo.color }}>
                    {statusInfo.label}
                  </p>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5">
                    {new Date(req.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
                  </p>
                </div>
              </div>

              {/* Note */}
              {req.note && (
                <p className="text-xs text-[#D9CDB7] bg-white/5 rounded-lg px-3 py-2 mb-4">
                  💬 {req.note}
                </p>
              )}

              {/* Actions — only for pending */}
              {req.status === "pending" && (
                <Form method="post" className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="requestId" value={req.id} />
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-[#94A3B8] text-[10px] mb-1">หมายเหตุแอดมิน (ถ้ามี)</label>
                    <input
                      name="note"
                      type="text"
                      placeholder="เช่น โอนเงินแล้ว, ยืนยันตัวตนแล้ว"
                      className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs text-[#F8F6F1] placeholder-[#94A3B8]/40 focus:outline-none focus:border-[#C6A96B]/50"
                      style={{ background: "rgba(10,34,64,0.6)" }}
                    />
                  </div>
                  <button
                    type="submit"
                    name="decision"
                    value="approved"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-[#020617] transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)" }}
                  >
                    ✅ อนุมัติ
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="rejected"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl text-xs font-medium border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-60"
                  >
                    ❌ ปฏิเสธ
                  </button>
                </Form>
              )}

              {/* Approved info */}
              {req.status === "approved" && req.approved_at && (
                <p className="text-[10px] text-[#34D399]/70">
                  อนุมัติเมื่อ: {new Date(req.approved_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
