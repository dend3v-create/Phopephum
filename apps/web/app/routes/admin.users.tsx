import { json } from "@remix-run/cloudflare";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAdmin } from "~/services/auth.server";
import { createSupabaseClient, createServiceRoleClient } from "~/services/supabase.server";
import type { Env } from "~/env.server";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export const meta: MetaFunction = () => [{ title: "จัดการสมาชิก — Admin" }];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { user: admin } = await requireAdmin(request, env);
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

  return json({
    users: users ?? [],
    search,
    roleFilter,
    planFilter,
    currentAdminId: admin.id,
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { user: admin } = await requireAdmin(request, env);
  const adminSupabase = createServiceRoleClient(env);

  const formData = await request.formData();
  const actionType = String(formData.get("_action") ?? "");

  // ── ลบสมาชิก (เดี่ยว หรือ เลือกหลายคนพร้อมกัน) ──
  if (actionType === "deleteUsers" || actionType === "deleteUser") {
    let idsToDelete: string[] = [];
    if (actionType === "deleteUsers") {
      const rawIds = formData.get("userIds");
      if (typeof rawIds === "string") {
        try {
          idsToDelete = JSON.parse(rawIds);
        } catch {
          idsToDelete = rawIds.split(",").map(s => s.trim()).filter(Boolean);
        }
      } else {
        idsToDelete = formData.getAll("userIds") as string[];
      }
    } else {
      const singleId = String(formData.get("userId") ?? "");
      if (singleId) idsToDelete = [singleId];
    }

    // ป้องกันการลบบัญชีของ Admin ที่กำลังล็อกอินอยู่
    idsToDelete = idsToDelete.filter(id => Boolean(id) && id !== admin.id);

    if (idsToDelete.length === 0) {
      return json({ error: "ไม่พบผู้ใช้ที่สามารถลบได้ หรือไม่สามารถลบบัญชีตนเองได้" }, { status: 400 });
    }

    let deletedCount = 0;
    const errors: string[] = [];

    for (const id of idsToDelete) {
      try {
        // 1. ลบจาก Supabase Auth (ซึ่งจะ cascade ไปยัง child tables)
        const { error: authErr } = await adminSupabase.auth.admin.deleteUser(id);
        if (authErr) {
          console.warn(`[admin/users] auth deleteUser warning for ${id}:`, authErr.message);
        }
      } catch (err: any) {
        console.warn(`[admin/users] auth deleteUser exception for ${id}:`, err?.message);
      }

      // 2. ลบออกจากตาราง profiles โดยตรง (ในกรณีที่เป็น test seed profile ที่ไม่มี auth record)
      const { error: profileErr } = await adminSupabase
        .from("profiles")
        .delete()
        .eq("id", id);

      if (profileErr) {
        errors.push(`ID ${id}: ${profileErr.message}`);
      } else {
        deletedCount++;
      }
    }

    if (errors.length > 0 && deletedCount === 0) {
      return json({ error: `ลบไม่สำเร็จ: ${errors.join(", ")}` }, { status: 500 });
    }

    return json({
      success: true,
      message: `ลบสมาชิกสำเร็จ ${deletedCount} รายการ`,
      deletedCount,
    });
  }

  // ── อัปเดตสิทธิ์ / สถานะสมาชิก ──
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return json({ error: "ไม่พบ ID ผู้ใช้" }, { status: 400 });

  if (actionType === "updateUser") {
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
      membership_status: status,
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

    return json({ success: true, message: "อัปเดตสิทธิ์สมาชิกสำเร็จ" });
  }

  return json({ success: true });
}

export default function AdminUsersPage() {
  const { users, search, roleFilter, planFilter, currentAdminId } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [userToDeleteSingle, setUserToDeleteSingle] = useState<{ id: string; name: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    setMounted(true);
  }, []);

  // เมื่อบันทึกหรือลบสำเร็จ เคลียร์สถานะการเลือกและปิด Modal
  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success) {
      setSelectedUserIds([]);
      setIsBulkDeleteModalOpen(false);
      setUserToDeleteSingle(null);
      setEditingUserId(null);
    }
  }, [actionData]);

  if (editingUserId && navigation.state === "loading") {
    setEditingUserId(null);
  }

  // ผู้ใช้ที่สามารถเลือกเพื่อลบได้ (ตัดบัญชีของตัวเองออก)
  const selectableUsers = users.filter((u: any) => u.id !== currentAdminId);
  const isAllSelected = selectableUsers.length > 0 && selectableUsers.every((u: any) => selectedUserIds.includes(u.id));
  const isIndeterminate = selectedUserIds.length > 0 && !isAllSelected;

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(selectableUsers.map((u: any) => u.id));
    }
  };

  const handleToggleUser = (userId: string) => {
    if (userId === currentAdminId) return;
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // รายชื่อผู้ใช้ที่เลือกไว้ (สำหรับแสดงใน Modal ยืนยัน)
  const selectedUsersList = users.filter((u: any) => selectedUserIds.includes(u.id));

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#F8F6F1] mb-1">จัดการสมาชิก</h1>
          <p className="text-[#94A3B8] text-sm">ค้นหา ตรวจสอบ แก้ไขสิทธิ์ และลบบัญชีทดสอบที่ไม่ใช้งานออกจากระบบ</p>
        </div>
      </header>

      {/* แจ้งเตือนข้อความสถานะ */}
      {actionData && "message" in actionData && (actionData as any).message ? (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{String((actionData as any).message)}</span>
          </div>
        </div>
      ) : null}
      {actionData && "error" in actionData && (actionData as any).error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{String((actionData as any).error)}</span>
          </div>
        </div>
      ) : null}

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

      {/* ── แถบดำเนินการเมื่อมีการเลือกสมาชิก (Bulk Action Bar) ── */}
      {selectedUserIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-rose-950/70 via-[#0A1628] to-rose-950/70 border border-rose-500/40 p-4 rounded-2xl shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span className="text-sm font-semibold text-[#F8F6F1]">
              เลือกสมาชิกอยู่ <strong className="text-rose-300 text-base">{selectedUserIds.length}</strong> คน (จากที่แสดง {users.length} คน)
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedUserIds([])}
              className="px-3 py-1.5 rounded-xl border border-white/15 hover:bg-white/10 text-xs text-[#C6B79F] transition-all"
            >
              ยกเลิกการเลือก
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
            >
              <span>🗑️</span>
              <span>ลบสมาชิกที่เลือก ({selectedUserIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10" style={{ background: "var(--card-dark-bg)", backdropFilter: "blur(12px)" }}>
        <div className="min-w-[1000px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                {/* Checkbox Header */}
                <th className="w-12 px-4 py-4 text-center">
                  <input
                    type="checkbox"
                    title="เลือกทั้งหมดในหน้านี้"
                    checked={isAllSelected}
                    ref={el => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={handleToggleAll}
                    className="w-4 h-4 rounded border-white/30 bg-[#0A1628] text-rose-500 focus:ring-rose-500 focus:ring-offset-0 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">ผู้ใช้งาน</th>
                <th className="px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">บทบาท (Role)</th>
                <th className="px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">แพ็กเกจ (Tier/Plan)</th>
                <th className="px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">สถานะ (Status)</th>
                <th className="px-6 py-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u: any) => {
                const isSelected = selectedUserIds.includes(u.id);
                const isSelf = u.id === currentAdminId;

                return (
                  <tr
                    key={u.id}
                    className={`transition-colors group ${
                      isSelected ? "bg-rose-950/20 hover:bg-rose-950/30" : "hover:bg-white/5"
                    }`}
                  >
                    {/* Row Checkbox */}
                    <td className="w-12 px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                      {isSelf ? (
                        <span className="text-xs text-[#94A3B8]" title="บัญชีของคุณ (ไม่สามารถลบได้)">
                          🔒
                        </span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleUser(u.id)}
                          className="w-4 h-4 rounded border-white/30 bg-[#0A1628] text-rose-500 focus:ring-rose-500 focus:ring-offset-0 cursor-pointer"
                        />
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-[#38BDF8]">
                          {(u.display_name || u.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#F8F6F1]">{u.display_name || "ไม่มีชื่อ"}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30 px-1.5 py-0.2 rounded font-bold">
                                คุณ
                              </span>
                            )}
                          </div>
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
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            u.role === "admin"
                              ? "border-purple-500/50 text-purple-400 bg-purple-500/10"
                              : u.role === "operator"
                              ? "border-blue-500/50 text-blue-400 bg-blue-500/10"
                              : "border-slate-500/50 text-slate-400 bg-slate-500/10"
                          }`}
                        >
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
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border w-fit ${
                              u.subscription === "lifetime"
                                ? "border-amber-500/50 text-amber-400 bg-amber-500/10"
                                : u.subscription === "premium"
                                ? "border-cyan-500/50 text-cyan-400 bg-cyan-500/10"
                                : u.subscription === "basic"
                                ? "border-green-500/50 text-green-400 bg-green-500/10"
                                : "border-slate-500/50 text-slate-400 bg-slate-500/10"
                            }`}
                          >
                            {u.subscription}
                          </span>
                          <span className="text-[9px] text-[#94A3B8] ml-1">Plan: {u.plan || "free"}</span>
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
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                            u.membership_status === "active"
                              ? "text-green-400 bg-green-500/10"
                              : u.membership_status === "pending"
                              ? "text-yellow-400 bg-yellow-500/10"
                              : "text-red-400 bg-red-500/10"
                          }`}
                        >
                          {u.membership_status || "active"}
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
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => setEditingUserId(u.id)}
                            className="text-xs text-[#94A3B8] hover:text-[#38BDF8] transition-colors font-medium"
                          >
                            แก้ไขสิทธิ์
                          </button>

                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => setUserToDeleteSingle({ id: u.id, name: u.display_name || u.email || u.id })}
                              className="px-2 py-1 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 text-xs transition-all flex items-center gap-1"
                              title="ลบสมาชิกรายนี้"
                            >
                              <span>🗑️</span>
                              <span className="hidden sm:inline">ลบ</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {users.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-[#94A3B8] text-sm italic">ไม่พบข้อมูลผู้ใช้งาน</p>
        </div>
      )}

      {/* ── Modal ยืนยันการลบสมาชิกรายเดียว ── */}
      {mounted && userToDeleteSingle && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[999999] overflow-y-auto bg-black/80 backdrop-blur-md p-4 flex min-h-full items-center justify-center">
          <div className="fixed inset-0" onClick={() => setUserToDeleteSingle(null)} aria-hidden="true" />
          <div className="relative bg-[#0A2240] border border-rose-500/40 rounded-2xl p-6 max-w-md w-full my-auto shadow-2xl text-[#F8F6F1] space-y-4 z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-400">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-bold">ยืนยันการลบสมาชิก</h3>
            </div>
            <p className="text-sm text-[#C6B79F]">
              คุณต้องการลบผู้ใช้งาน <strong className="text-[#F8F6F1]">"{userToDeleteSingle.name}"</strong> ออกจากระบบอย่างถาวรใช่หรือไม่?
            </p>
            <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 p-2.5 rounded-xl">
              ⚠️ การดำเนินการนี้จะลบทั้งบัญชีผู้ใช้งาน (Auth) และข้อมูลโปรไฟล์ทั้งหมด ไม่สามารถกู้คืนได้
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDeleteSingle(null)}
                className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-sm text-[#C6B79F]"
              >
                ยกเลิก
              </button>
              <Form method="post">
                <input type="hidden" name="_action" value="deleteUser" />
                <input type="hidden" name="userId" value={userToDeleteSingle.id} />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? "กำลังลบ..." : "ยืนยันการลบ"}
                </button>
              </Form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal ยืนยันการลบสมาชิกหลายคน (Bulk Delete) ── */}
      {mounted && isBulkDeleteModalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[999999] overflow-y-auto bg-black/80 backdrop-blur-md p-4 flex min-h-full items-center justify-center">
          <div className="fixed inset-0" onClick={() => setIsBulkDeleteModalOpen(false)} aria-hidden="true" />
          <div className="relative bg-[#0A2240] border border-rose-500/40 rounded-2xl p-6 max-w-lg w-full my-auto shadow-2xl text-[#F8F6F1] space-y-4 max-h-[85vh] overflow-y-auto z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-400">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-bold">ยืนยันการลบสมาชิกพร้อมกัน ({selectedUserIds.length} คน)</h3>
            </div>
            <p className="text-sm text-[#C6B79F]">
              คุณกำลังจะลบสมาชิกที่เลือกจำนวน <strong className="text-rose-400 font-bold">{selectedUserIds.length}</strong> รายการ ออกจากระบบอย่างถาวร
            </p>

            {/* รายชื่อสรุปที่เลือก */}
            <div className="bg-slate-950/60 border border-white/10 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1.5 text-xs">
              <p className="text-[#94A3B8] font-semibold mb-1">รายชื่อที่จะถูกลบ:</p>
              {selectedUsersList.map(u => (
                <div key={u.id} className="flex items-center justify-between text-[#F8F6F1] py-0.5 border-b border-white/5 last:border-0">
                  <span className="truncate">{u.display_name || u.email || u.id}</span>
                  <span className="text-[10px] text-[#94A3B8] ml-2 shrink-0">{u.role}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 p-2.5 rounded-xl">
              ⚠️ การดำเนินการนี้เหมาะสำหรับการลบบัญชีทดสอบ (Test accounts) ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-sm text-[#C6B79F]"
              >
                ยกเลิก
              </button>
              <Form method="post">
                <input type="hidden" name="_action" value="deleteUsers" />
                <input type="hidden" name="userIds" value={JSON.stringify(selectedUserIds)} />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? "กำลังลบทั้งหมด..." : `ยืนยันการลบ ${selectedUserIds.length} รายการ`}
                </button>
              </Form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
