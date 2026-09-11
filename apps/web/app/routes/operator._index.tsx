import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData, Form, useNavigation, useActionData, Link } from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireOperator } from "~/services/auth.server";
import { createServiceRoleClient } from "~/services/supabase.server";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { MembershipBadge, MembershipStatusBadge } from "~/components/MembershipBadge";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "ระบบ Operator — จัดการสิทธิ์สมาชิก | PhopePhum" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireOperator(request, env);

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() || "";
  const roleFilter = url.searchParams.get("role") || "all";
  const statusFilter = url.searchParams.get("status") || "all";

  const adminSupabase = createServiceRoleClient(env);
  
  let query = adminSupabase
    .from("profiles")
    .select("id, display_name, email, role, subscription, plan, membership_status, membership_expires_at, created_at")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
  }
  if (roleFilter !== "all") {
    query = query.eq("role", roleFilter);
  }
  if (statusFilter !== "all") {
    query = query.eq("membership_status", statusFilter);
  }

  const { data: users, error } = await query.limit(100);

  if (error) {
    console.error("[Operator Dashboard] loader error:", error);
  }

  // Quick stats summary
  const allUsers = users || [];
  const stats = {
    total: allUsers.length,
    active: allUsers.filter(u => (u.membership_status || "active") === "active").length,
    pending: allUsers.filter(u => u.membership_status === "pending").length,
    expired: allUsers.filter(u => u.membership_status === "expired").length,
  };

  return json({
    users: allUsers,
    stats,
    search,
    roleFilter,
    statusFilter,
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireOperator(request, env);
  const formData = await request.formData();
  
  const intent = String(formData.get("intent") ?? "");
  const targetUserId = String(formData.get("userId") ?? "");
  
  if (!targetUserId) {
    return json({ error: "ไม่พบรหัสผู้ใช้งาน (User ID)" }, { status: 400 });
  }

  const adminSupabase = createServiceRoleClient(env);

  if (intent === "approve") {
    const { error } = await adminSupabase
      .from("profiles")
      .update({ 
        membership_status: "active",
        plan: "basic",
        subscription: "basic",
      })
      .eq("id", targetUserId);
    if (error) return json({ error: error.message }, { status: 500 });
  } 
  else if (intent === "set_pro") {
    const { error } = await adminSupabase
      .from("profiles")
      .update({ 
        subscription: "pro",
        plan: "pro",
        membership_status: "active"
      })
      .eq("id", targetUserId);
    if (error) return json({ error: error.message }, { status: 500 });
  }
  else if (intent === "set_master") {
    const { error } = await adminSupabase
      .from("profiles")
      .update({ 
        subscription: "imperial",
        plan: "imperial",
        membership_status: "active"
      })
      .eq("id", targetUserId);
    if (error) return json({ error: error.message }, { status: 500 });
  }
  else if (intent === "add_30_days") {
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("membership_expires_at")
      .eq("id", targetUserId)
      .single();

    let currentExpires = profile?.membership_expires_at ? new Date(profile.membership_expires_at) : new Date();
    if (currentExpires.getTime() < Date.now()) {
      currentExpires = new Date();
    }
    currentExpires.setDate(currentExpires.getDate() + 30);
    
    const { error } = await adminSupabase
      .from("profiles")
      .update({ 
        membership_expires_at: currentExpires.toISOString(),
        membership_status: "active",
      })
      .eq("id", targetUserId);
    if (error) return json({ error: error.message }, { status: 500 });
  }

  return redirect("/operator");
}

export default function OperatorDashboard() {
  const { users, stats, search, roleFilter, statusFilter } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isActionLoading = navigation.state === "submitting";

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
              OPERATOR SYSTEM
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">ควบคุมสิทธิ์และสมาชิก</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-[#F8F6F1]">
            ระบบปฏิบัติการสมาชิก (Operator Dashboard)
          </h1>
          <p className="text-slate-600 dark:text-[#94A3B8] text-xs sm:text-sm mt-1">
            ตรวจสอบข้อมูลสิทธิ์ผู้ใช้งาน ปรับเปลี่ยนระดับแพ็กเกจ และต่ออายุสมาชิกแบบทันที
          </p>
        </div>

        {/* Shortcut to Admin Panel */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/admin"
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            ← System Overview
          </Link>
          <Link
            to="/admin/approvals"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#C6A96B]/15 text-[#8C6D2D] dark:text-[#D9BC82] border border-[#C6A96B]/30 hover:bg-[#C6A96B]/25 transition-colors"
          >
            อนุมัติคำขอ (Approvals) →
          </Link>
        </div>
      </header>

      {/* ── Error Banner ── */}
      {actionData?.error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 rounded-2xl text-sm shadow-sm">
          ⚠️ เกิดข้อผิดพลาด: {actionData.error}
        </div>
      )}

      {/* ── Stats Summary Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#07172A]/80 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">ผู้ใช้ทั้งหมด</p>
          <p className="text-2xl font-bold font-display text-slate-900 dark:text-[#F8F6F1] mt-1">{stats.total}</p>
        </div>
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#07172A]/80 shadow-sm">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider">Active</p>
          <p className="text-2xl font-bold font-display text-emerald-700 dark:text-emerald-400 mt-1">{stats.active}</p>
        </div>
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#07172A]/80 shadow-sm">
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-bold font-display text-amber-700 dark:text-amber-400 mt-1">{stats.pending}</p>
        </div>
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#07172A]/80 shadow-sm">
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium uppercase tracking-wider">Expired</p>
          <p className="text-2xl font-bold font-display text-rose-700 dark:text-rose-400 mt-1">{stats.expired}</p>
        </div>
      </div>

      {/* ── Search & Filter Form ── */}
      <Form method="get" className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#07172A]/80 shadow-sm">
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
            ค้นหาชื่อ / อีเมล
          </label>
          <input
            name="search"
            type="text"
            defaultValue={search}
            placeholder="พิมพ์ชื่อ หรือ email..."
            className="w-full bg-slate-50 dark:bg-[#0A1628] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-[#F8F6F1] placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
            สถานะ (Status)
          </label>
          <select
            name="status"
            defaultValue={statusFilter}
            className="w-full bg-slate-50 dark:bg-[#0A1628] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-[#F8F6F1] focus:outline-none"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="active">Active (ปกติ)</option>
            <option value="pending">Pending (รออนุมัติ)</option>
            <option value="expired">Expired (หมดอายุ)</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="flex-1 bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] font-bold py-2 rounded-xl text-sm shadow hover:opacity-90 transition-opacity"
          >
            🔍 ค้นหา
          </button>
          {search && (
            <Link
              to="/operator"
              className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl border border-slate-200 dark:border-white/10"
            >
              ล้าง
            </Link>
          )}
        </div>
      </Form>

      {/* ── Users Table ── */}
      <Card className="overflow-x-auto border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#07172A]/80 shadow-md">
        <table className="w-full text-left border-collapse min-w-[860px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/5">
              <th className="py-3 px-4 font-bold text-slate-700 dark:text-[#C6B79F] text-xs uppercase">ผู้ใช้งาน (User)</th>
              <th className="py-3 px-4 font-bold text-slate-700 dark:text-[#C6B79F] text-xs uppercase">บทบาท (Role)</th>
              <th className="py-3 px-4 font-bold text-slate-700 dark:text-[#C6B79F] text-xs uppercase">แพ็กเกจ (Plan)</th>
              <th className="py-3 px-4 font-bold text-slate-700 dark:text-[#C6B79F] text-xs uppercase">สถานะ (Status)</th>
              <th className="py-3 px-4 font-bold text-slate-700 dark:text-[#C6B79F] text-xs uppercase text-right">ดำเนินการด่วน (Actions)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                  {search ? `ไม่พบผู้ใช้งานที่ตรงกับ "${search}"` : "ยังไม่มีข้อมูลผู้ใช้งานในระบบ"}
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const planCode = u.subscription || u.plan || "free";
                const membershipStatus = u.membership_status || "active";
                let daysRemaining = 0;
                if (u.membership_expires_at) {
                  daysRemaining = Math.max(0, Math.ceil((new Date(u.membership_expires_at).getTime() - Date.now()) / 86400000));
                }

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors">
                    {/* User Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-sky-700 dark:text-sky-300 shrink-0">
                          {(u.display_name || u.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-slate-900 dark:text-[#F8F6F1] font-bold text-sm truncate">
                            {u.display_name || "ไม่มีชื่อ"}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {u.email}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate">
                            ID: {u.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">
                      {u.role === "admin" ? (
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-bold">
                          Admin
                        </span>
                      ) : u.role === "operator" ? (
                        <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/20 font-bold">
                          Operator
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400">
                          User
                        </span>
                      )}
                    </td>

                    {/* Plan Badge */}
                    <td className="py-3.5 px-4">
                      <MembershipBadge type={planCode} showIcon={true} />
                    </td>

                    {/* Status & Expiry */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <MembershipStatusBadge status={membershipStatus} />
                        {daysRemaining > 0 ? (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            คงเหลือ {daysRemaining} วัน
                          </span>
                        ) : u.membership_expires_at ? (
                          <span className="text-[11px] text-rose-500 font-semibold">
                            หมดอายุแล้ว
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            ไม่มีกำหนด
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Quick Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {membershipStatus === "pending" && (
                          <Form method="post">
                            <input type="hidden" name="userId" value={u.id} />
                            <Button
                              name="intent"
                              value="approve"
                              disabled={isActionLoading}
                              className="h-7 text-xs px-2.5 bg-emerald-600 text-white hover:bg-emerald-700 border-none font-bold"
                            >
                              ✓ อนุมัติ
                            </Button>
                          </Form>
                        )}

                        {planCode !== "pro" && (
                          <Form method="post">
                            <input type="hidden" name="userId" value={u.id} />
                            <Button
                              name="intent"
                              value="set_pro"
                              disabled={isActionLoading}
                              className="h-7 text-xs px-2.5 bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 border border-amber-500/30"
                            >
                              + Pro
                            </Button>
                          </Form>
                        )}

                        {planCode !== "imperial" && (
                          <Form method="post">
                            <input type="hidden" name="userId" value={u.id} />
                            <Button
                              name="intent"
                              value="set_master"
                              disabled={isActionLoading}
                              className="h-7 text-xs px-2.5 bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/30"
                            >
                              + Master
                            </Button>
                          </Form>
                        )}

                        <Form method="post">
                          <input type="hidden" name="userId" value={u.id} />
                          <Button
                            name="intent"
                            value="add_30_days"
                            disabled={isActionLoading}
                            variant="outline"
                            className="h-7 text-xs px-2.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            +30 วัน
                          </Button>
                        </Form>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
