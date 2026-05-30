import { json } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAdmin } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
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
  const { supabase } = createSupabaseClient(request, env);

  const formData = await request.formData();
  const userId = String(formData.get("userId") ?? "");
  const action = String(formData.get("_action") ?? "");

  if (!userId) return json({ error: "ไม่พบ ID ผู้ใช้" }, { status: 400 });

  if (action === "updateRole") {
    const newRole = String(formData.get("role") ?? "");
    if (!["user", "admin", "operator"].includes(newRole)) {
      return json({ error: "Role ไม่ถูกต้อง" }, { status: 400 });
    }
    
    // ป้องกันการปลดตัวเองออกจากการเป็น Admin
    if (userId === admin.id && newRole !== "admin") {
      return json({ error: "ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้" }, { status: 400 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) return json({ error: error.message }, { status: 500 });
  }

  if (action === "updatePlan") {
    const newPlan = String(formData.get("plan") ?? "");
    const plans = ["free", "basic", "premium", "lifetime"];
    if (!plans.includes(newPlan)) {
      return json({ error: "Plan ไม่ถูกต้อง" }, { status: 400 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({ subscription: newPlan })
      .eq("id", userId);

    if (error) return json({ error: error.message }, { status: 500 });
  }

  return json({ success: true });
}

export default function AdminUsersPage() {
  const { users, search, roleFilter, planFilter } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

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
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              <th className="px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">ผู้ใช้งาน</th>
              <th className="px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">บทบาท (Role)</th>
              <th className="px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">แพ็กเกจ (Plan)</th>
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
                    <Form method="post" className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="_action" value="updateRole" />
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="bg-[#0A1628] border border-white/20 rounded-lg px-2 py-1 text-xs text-[#F8F6F1]"
                      >
                        <option value="user">User</option>
                        <option value="operator">Operator</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button type="submit" className="bg-[#38BDF8] text-[#020617] p-1 rounded hover:bg-white transition-colors">
                        <IconCheck className="w-3 h-3" />
                      </button>
                    </Form>
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
                    <Form method="post" className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="_action" value="updatePlan" />
                      <select
                        name="plan"
                        defaultValue={u.subscription}
                        className="bg-[#0A1628] border border-white/20 rounded-lg px-2 py-1 text-xs text-[#F8F6F1]"
                      >
                        <option value="free">Free</option>
                        <option value="basic">Basic</option>
                        <option value="premium">Premium</option>
                        <option value="lifetime">Lifetime</option>
                      </select>
                      <button type="submit" className="bg-[#38BDF8] text-[#020617] p-1 rounded hover:bg-white transition-colors">
                        <IconCheck className="w-3 h-3" />
                      </button>
                    </Form>
                  ) : (
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      u.subscription === 'lifetime' ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' :
                      u.subscription === 'premium' ? 'border-cyan-500/50 text-cyan-400 bg-cyan-500/10' :
                      u.subscription === 'basic' ? 'border-green-500/50 text-green-400 bg-green-500/10' :
                      'border-slate-500/50 text-slate-400 bg-slate-500/10'
                    }`}>
                      {u.subscription}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setEditingUserId(editingUserId === u.id ? null : u.id)}
                    className="text-xs text-[#94A3B8] hover:text-[#38BDF8] transition-colors font-medium"
                  >
                    {editingUserId === u.id ? "ยกเลิก" : "แก้ไขสิทธิ์/แพ็กเกจ"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {users.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-[#94A3B8] text-sm italic">ไม่พบข้อมูลผู้ใช้งาน</p>
          </div>
        )}
      </div>
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
