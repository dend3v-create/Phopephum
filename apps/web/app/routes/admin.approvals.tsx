/**
 * admin.approvals.tsx
 * หน้าจัดการคำขออนุมัติสมาชิกและแพ็กเกจ
 * แอดมินกด "อนุมัติ" / "ปฏิเสธ" / "อนุมัติทั้งหมด" ได้ที่นี่
 * รองรับระบบอัตโนมัติ (Instant Auto-Approval) พร้อมเก็บบันทึกประวัติครบถ้วน
 */
import { json } from "@remix-run/cloudflare";
import { useLoaderData, Form, useNavigation, useSearchParams } from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAdmin } from "~/services/auth.server";
import { createSupabaseClient, createServiceRoleClient } from "~/services/supabase.server";
import { autoFulfillAndApprove } from "~/services/fulfillment.server";
import { sendApprovalEmail } from "~/services/resend.server";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [{ title: "อนุมัติคำขอ — PhopePhum Admin" }];

interface RequestRow {
  id: string;
  user_id: string;
  type: string;
  plan: string;
  status: string;
  note?: string;
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

  // นับจำนวนรายการที่รออนุมัติ
  const { count: pendingCount } = await supabase
    .from("subscription_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return json({
    requests: (requests ?? []) as unknown as RequestRow[],
    filter,
    adminId: user.id,
    pendingCount: pendingCount || 0,
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);
  const supabase = createServiceRoleClient(env);

  const formData = await request.formData();
  const actionType = String(formData.get("actionType") ?? "");

  // ─── ACTION 1: อนุมัติคำขอที่ค้างอยู่ทั้งหมด (Approve All Pending) ──────────
  if (actionType === "approve_all") {
    const { data: pendingList } = await supabase
      .from("subscription_requests")
      .select("id, user_id, type, plan")
      .eq("status", "pending");

    if (pendingList && pendingList.length > 0) {
      for (const item of pendingList) {
        try {
          await autoFulfillAndApprove({
            userId: item.user_id,
            planOrSku: item.plan,
            type: item.type,
            source: "admin_manual",
            requestId: item.id,
            note: "[แอดมิน] อนุมัติแบบกลุ่มทั้งหมด (Batch Approved)",
            env,
          });
        } catch (e) {
          console.error(`[admin/approvals] Batch approve error on item ${item.id}:`, e);
        }
      }
    }
    return json({ success: true, count: pendingList?.length || 0 });
  }

  // ─── ACTION 2: อนุมัติ / ปฏิเสธ รายการเดี่ยว ───────────────────────────────
  const requestId = String(formData.get("requestId") ?? "");
  const decision  = String(formData.get("decision") ?? ""); // "approved" | "rejected"
  const note      = String(formData.get("note") ?? "").trim();

  if (!requestId || !["approved", "rejected"].includes(decision)) {
    return json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const { data: req } = await supabase
    .from("subscription_requests")
    .select("id, user_id, type, plan")
    .eq("id", requestId)
    .single();

  if (!req) return json({ error: "ไม่พบคำขอ" }, { status: 404 });

  if (decision === "approved") {
    // ใช้งาน centralized autoFulfillAndApprove เพื่อความถูกต้อง 100%
    await autoFulfillAndApprove({
      userId: req.user_id,
      planOrSku: req.plan,
      type: req.type,
      source: "admin_manual",
      requestId: req.id,
      note: note || "[แอดมิน] ตรวจสอบและอนุมัติเรียบร้อย",
      env,
    });
  } else {
    // ปฏิเสธคำขอ
    await supabase
      .from("subscription_requests")
      .update({
        status: "rejected",
        approved_at: new Date().toISOString(),
        note: note || "[แอดมิน] ไม่อนุมัติคำขอ",
      })
      .eq("id", requestId);

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("id", req.user_id)
      .single();

    if (userProfile?.email) {
      await sendApprovalEmail(
        env,
        userProfile.email,
        userProfile.display_name ?? "สมาชิก",
        req.plan,
        false,
        note || undefined
      ).catch(console.error);
    }
  }

  return json({ success: true });
}

const TYPE_LABEL: Record<string, { label: string; icon: string }> = {
  registration: { label: "สมัครสมาชิกใหม่", icon: "🌟" },
  package_upgrade: { label: "อัปเกรดแพ็กเกจ", icon: "💎" },
  subscription: { label: "สมัครสมาชิก", icon: "💎" },
  sands_refill: { label: "เติมทรายกาลเวลา", icon: "⏳" },
  sands: { label: "เติมทรายกาลเวลา", icon: "⏳" },
};

const PLAN_COLOR: Record<string, string> = {
  free: "#94A3B8",
  basic: "#34D399",
  premium: "#34D399",
  pro: "#38BDF8",
  pro_annual: "#38BDF8",
  imperial: "#D9BC82",
  master: "#D9BC82",
  sands_50: "#C6A96B",
  sands_150: "#C6A96B",
  sands_500: "#F59E0B",
};

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "รอการอนุมัติ", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.15)" },
  approved: { label: "อนุมัติแล้ว", color: "#10B981", bg: "rgba(16, 185, 129, 0.15)" },
  rejected: { label: "ปฏิเสธ", color: "#EF4444", bg: "rgba(239, 68, 68, 0.15)" },
};

export default function AdminApprovals() {
  const { requests, filter, pendingCount } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get("highlight");
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const tabs = [
    { key: "pending", label: `รอการอนุมัติ ${pendingCount > 0 ? `(${pendingCount})` : ""}` },
    { key: "approved", label: "ประวัติอนุมัติ" },
    { key: "all", label: "ทั้งหมด" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-1">
            ระบบอนุมัติคำขอ & สมาชิก
          </h1>
          <p className="text-slate-500 dark:text-[#94A3B8] text-xs md:text-sm">
            ระบบทำงานอนุมัติอัตโนมัติ (Instant Auto-Approval) · บันทึกประวัติและแจ้งเตือน LINE OA ทันทีทุกรายการ
          </p>
        </div>

        {/* ปุ่มอนุมัติค้างทั้งหมด */}
        {pendingCount > 0 && (
          <Form method="post">
            <input type="hidden" name="actionType" value="approve_all" />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-slate-950 shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span>⚡</span>
              <span>อนุมัติคำขอค้างทั้งหมด ({pendingCount})</span>
            </button>
          </Form>
        )}
      </header>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((tab) => (
          <a
            key={tab.key}
            href={`/admin/approvals?filter=${tab.key}`}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              filter === tab.key
                ? "text-slate-950 shadow-sm"
                : "text-slate-600 dark:text-[#94A3B8] border border-slate-200 dark:border-white/10 hover:border-[#C6A96B]/50 hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
            style={filter === tab.key ? { background: "linear-gradient(135deg, #C6A96B, #D9BC82)" } : {}}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* Empty state */}
      {requests.length === 0 && (
        <div className="text-center py-16 text-slate-400 dark:text-[#94A3B8] bg-white/50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
          <p className="text-3xl mb-3 opacity-50">✨</p>
          <p className="text-sm font-semibold">ไม่มีคำขอในหมวดนี้</p>
          <p className="text-xs mt-1 text-slate-400">รายการใหม่จะได้รับการอนุมัติและเปิดสิทธิ์ให้อัตโนมัติทันที</p>
        </div>
      )}

      {/* Request cards */}
      <div className="space-y-4">
        {requests.map((req) => {
          const isHighlighted = req.id === highlight;
          const planColor = PLAN_COLOR[req.plan] ?? "#94A3B8";
          const statusInfo = STATUS_LABEL[req.status] ?? { label: req.status, color: "#94A3B8", bg: "rgba(148, 163, 184, 0.15)" };
          const typeInfo = TYPE_LABEL[req.type] ?? { label: req.type, icon: "✦" };

          return (
            <div
              key={req.id}
              id={req.id}
              className={`rounded-2xl border p-4 md:p-5 transition-all shadow-sm ${
                isHighlighted
                  ? "border-[#C6A96B] ring-1 ring-[#C6A96B]/30 bg-amber-50/70 dark:bg-[#C6A96B]/15"
                  : "border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/70 backdrop-blur-md"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-sm font-bold text-slate-900 dark:text-[#F8F6F1]">
                      {req.profiles?.display_name || "ไม่มีชื่อ"}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-[#94A3B8]">{req.profiles?.email}</span>
                  </div>

                  <div className="flex gap-2 items-center flex-wrap mb-2.5">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 flex items-center gap-1">
                      <span>{typeInfo.icon}</span>
                      <span>{typeInfo.label}</span>
                    </span>
                    <span
                      className="text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase"
                      style={{
                        backgroundColor: `${planColor}20`,
                        color: planColor,
                        border: `1px solid ${planColor}40`,
                      }}
                    >
                      {req.plan}
                    </span>
                  </div>

                  {req.note && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-white/10 mb-2 font-mono">
                      {req.note}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-[#94A3B8]">
                    <span>ขอเมื่อ: {new Date(req.created_at).toLocaleString("th-TH")}</span>
                    {req.approved_at && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ อนุมัติเมื่อ: {new Date(req.approved_at).toLocaleString("th-TH")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 self-end sm:self-auto">
                  <span
                    className="text-[10px] font-bold px-3 py-1 rounded-full border"
                    style={{
                      color: statusInfo.color,
                      borderColor: `${statusInfo.color}40`,
                      backgroundColor: statusInfo.bg,
                    }}
                  >
                    {statusInfo.label}
                  </span>

                  {req.status === "pending" && (
                    <Form method="post" className="flex items-center gap-2 mt-1">
                      <input type="hidden" name="requestId" value={req.id} />
                      <button
                        name="decision"
                        value="approved"
                        disabled={isSubmitting}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
                      >
                        อนุมัติ
                      </button>
                      <button
                        name="decision"
                        value="rejected"
                        disabled={isSubmitting}
                        className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      >
                        ปฏิเสธ
                      </button>
                    </Form>
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
