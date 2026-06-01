import { json } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAdmin } from "~/services/auth.server";
import { createSupabaseClient, createServiceRoleClient } from "~/services/supabase.server";
import type { Env } from "~/env.server";
import { useState } from "react";

export const meta: MetaFunction = () => [{ title: "จัดการสมาชิก — Admin" }];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);
  const { supabase } = createSupabaseClient(request, env);

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() || "";
  const roleFilter = url.searchParams.get("role") || "all";
  const planFilter = url.searchParams.get("plan") || "all";

  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
  }
  if (roleFilter !== "all") {
    query = query.eq("role", roleFilter);
  }
  if (planFilter !== "all") {
    query = query.eq("subscription", planFilter);
  }

  const { data: users, error } = await query.limit(100);
  if (error) console.error("[admin/users] loader error:", error);

  return json({ users: users ?? [], search, roleFilter, planFilter });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { user: admin } = await requireAdmin(request, env);
  const adminSupabase = createServiceRoleClient(env);

  const formData = await request.formData();
  const userId = String(formData.get("userId") ?? "");
  const action = String(formData.get("_action") ?? "");

  if (!userId) return json({ error: "ไม่พบ ID ผู้ใช้" }, { status: 400 });

  if (action === "updateUser") {
    const subscription = String(formData.get("subscription") ?? "");
    const plan = String(formData.get("plan") ?? "");
    const status = String(formData.get("status") ?? "active");
    const role = String(formData.get("role") ?? "");

    const subscriptions = ["free", "basic", "premium", "lifetime"];
    const plans = ["free", "basic", "pro", "imperial"];
    const roles = ["user", "admin", "operator"];
    
    if (subscription && !subscriptions.includes(subscription)) {
      return json({ error: "Subscription ไม่ถูกต้อง" }, { status: 400 });
    }
    
    if (plan && !plans.includes(plan)) {
      return json({ error: "Plan ไม่ถูกต้อง" }, { status: 400 });
    }

    const updateData: any = { 
      membership_status: status 
    };

    if (subscription) updateData.subscription = subscription;
    if (plan) updateData.plan = plan;

    if (role && roles.includes(role)) {
      // ป้องกันการปลดตัวเองออกจากการเป็น Admin
      if (userId === admin.id && role !== "admin") {
        return json({ error: "ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้" }, { status: 400 });
      }
      updateData.role = role;
    }

    const { error } = await adminSupabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId);

    if (error) return json({ error: error.message }, { status: 500 });
  }

  return json({ success: true });
}

export default function AdminUsersPage() {
  const { users, search, roleFilter, planFilter } = useLoaderData<typeof loader>();
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // เมื่อบันทึกสำเร็จ (actionData หรือ state เปลี่ยน) ให้ปิดโหมดแก้ไข
  // ใน Remix การกด Submit จะทำให้ navigation.state เป็น 'loading' หรือ 'submitting'
  // เมื่อกลับมาเป็น 'idle' และไม่มี error เราควรจะปิด editing mode
  if (editingUserId && navigation.state === "loading") {
    setEditingUserId(null);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#F8F6F1] mb-1">จัดการสมาชิก</h1>
          <p className="text-[#94A3B8] text-sm">ค้นหา ตรวจสอบ และแก้ไขสิทธิ์ผู้ใช้งานทั้งหมดในระบบ</p>
        </div>
      </header>

      {/* Filters */}
      <Form method="get" className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="md:col-span-2">
          <label className="block text-[10px] text-[#94A3B8] uppercase tracking-wider mb-1.5 ml-1">ค้นหา (ชื่อ/อีเมล)</label>
          <input
            name="search"
            type="text"
            defaultValue={search}
            placeholder="ค้นหา..."
            className="w-full bg-[#0A1628] border border-white/10 rounded-xl px-4 py-2 text-sm text-[#F8F6F1] focus:outline-none focus:border-[#38BDF8]/50"
          />
        </div>
        <div>
          <label className="block text-[10px] text-[#94A3B8] uppercase tracking-wider mb-1.5 ml-1">สิทธิ์ (Role)</label>
          <select
            name="role"
            defaultValue={roleFilter}
            className="w-full bg-[#0A1628] border border-white/10 rounded-xl px-4 py-2 text-sm text-[#F8F6F1] focus:outline-none"
          >
            <option value="all">ทั้งหมด</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="operator">Operator</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#020617] font-bold py-2 rounded-xl text-sm transition-colors"
          >
            กรองข้อมูล
          </button>
        </div>
      </Form>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10" style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(12px)" }}>
        <div className="min-w-[1000px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">ผู้ใช้งาน</th>
                <th className="px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">บทบาท (Role)</th>
                <th className="px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">แพ็กเกจ (Tier/Plan)</th>
                <th className="px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">สถานะ (Status)</th>
                <th className="px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u: any) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-[#38BDF8]">
                        {(u.display_name || u.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-[#F8F6F1]">{u.display_name || "ไม่มีชื่อ"}</span>
                        <span className="text-xs text-[#94A3B8]">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {editingUserId === u.id ? (
                      <select
                        form={`edit-form-${u.id}`}
                        name="role"
                        defaultValue={u.role}
                        className="bg-[#0A1628] border border-white/20 rounded-lg px-2 py-1.5 text-xs text-[#F8F6F1] w-full"
                      >
                        <option value="user">User</option>
                        <option value="operator">Operator</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        u.role === 'admin' ? 'border-purple-500/50 text-purple-400 bg-purple-500/10' :
                        u.role === 'operator' ? 'border-blue-500/50 text-blue-400 bg-blue-500/10' :
                        'border-slate-500/50 text-slate-400 bg-slate-500/10'
                      }`}>
                        {u.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingUserId === u.id ? (
                      <div className="flex flex-col gap-2">
                        <select
                          form={`edit-form-${u.id}`}
                          name="subscription"
                          defaultValue={u.subscription}
                          className="bg-[#0A1628] border border-white/20 rounded-lg px-2 py-1.5 text-[10px] text-[#F8F6F1]"
                        >
                          <option value="free">Tier: Free</option>
                          <option value="basic">Tier: Basic</option>
                          <option value="premium">Tier: Premium</option>
                          <option value="lifetime">Tier: Lifetime</option>
                        </select>
                        <select
                          form={`edit-form-${u.id}`}
                          name="plan"
                          defaultValue={u.plan}
                          className="bg-[#0A1628] border border-white/20 rounded-lg px-2 py-1.5 text-[10px] text-[#F8F6F1]"
                        >
                          <option value="free">Plan: Free</option>
                          <option value="basic">Plan: Basic</option>
                          <option value="pro">Plan: Pro</option>
                          <option value="imperial">Plan: Imperial</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border w-fit ${
                          u.subscription === 'lifetime' ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' :
                          u.subscription === 'premium' ? 'border-cyan-500/50 text-cyan-400 bg-cyan-500/10' :
                          u.subscription === 'basic' ? 'border-green-500/50 text-green-400 bg-green-500/10' :
                          'border-slate-500/50 text-slate-400 bg-slate-500/10'
                        }`}>
                          {u.subscription}
                        </span>
                        <span className="text-[9px] text-[#94A3B8] ml-1">Plan: {u.plan || 'free'}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingUserId === u.id ? (
                      <select
                        form={`edit-form-${u.id}`}
                        name="status"
                        defaultValue={u.membership_status || "active"}
                        className="bg-[#0A1628] border border-white/20 rounded-lg px-2 py-1.5 text-[10px] text-[#F8F6F1] w-full"
                      >
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    ) : (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                        u.membership_status === 'active' ? 'text-green-400 bg-green-500/10' :
                        u.membership_status === 'pending' ? 'text-yellow-400 bg-yellow-500/10' :
                        'text-red-400 bg-red-500/10'
                      }`}>
                        {u.membership_status || 'active'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingUserId === u.id ? (
                      <div className="flex flex-col gap-2">
                        <Form method="post" id={`edit-form-${u.id}`} className="contents">
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="_action" value="updateUser" />
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#020617] text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
                          </button>
                        </Form>
                        <button
                          onClick={() => setEditingUserId(null)}
                          className="text-[11px] text-[#94A3B8] hover:text-white transition-colors"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingUserId(u.id)}
                        className="text-xs text-[#94A3B8] hover:text-[#38BDF8] transition-colors font-medium"
                      >
                        แก้ไขสิทธิ์/แพ็กเกจ
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        
      {users.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-[#94A3B8] text-sm italic">ไม่พบข้อมูลผู้ใช้งาน</p>
        </div>
      )}
    </div>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
