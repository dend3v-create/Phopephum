/**
 * dashboard.upgrade.tsx
 * หน้ายื่นคำขออัปเกรดแพ็กเกจ (ช่วง manual approval)
 */
import { json, redirect } from "@remix-run/cloudflare";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { notifyPackageRequest } from "~/services/line.server";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [{ title: "อัปเกรดแพ็กเกจ — PhopePhum" }];

const PLANS = [
  {
    id: "pro",
    name: "PROFESSIONAL SAGE",
    price: "฿149 / เดือน",
    color: "#C6A96B",
    features: ["ยามอัฏฐกาลไม่จำกัด", "ระบบจรครบถ้วน", "Life Report 10 ครั้ง/เดือน", "Export PDF พรีเมียม"],
  },
  {
    id: "imperial",
    name: "IMPERIAL MASTER",
    price: "฿299 / เดือน",
    color: "#4B6FAE",
    features: ["ทุกฟีเจอร์ไม่จำกัด", "เลข 7 ตัว 9 ฐาน (Core IP)", "Life Report ไม่จำกัด", "Priority Wisdom Support"],
  },
] as const;

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  // ตรวจดู pending request ที่มีอยู่
  const { supabase } = createSupabaseClient(request, env);
  const { data: pending } = await supabase
    .from("subscription_requests")
    .select("id, plan, status, created_at")
    .eq("user_id", user.id)
    .eq("type", "package_upgrade")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return json({ profile, pending });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);
  const { supabase } = createSupabaseClient(request, env);

  const formData = await request.formData();
  const plan = String(formData.get("plan") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!["pro", "imperial"].includes(plan)) {
    return json({ error: "กรุณาเลือกแพ็กเกจที่ถูกต้อง" }, { status: 400 });
  }

  // ตรวจว่ามี pending request อยู่แล้วไหม
  const { data: existing } = await supabase
    .from("subscription_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "package_upgrade")
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return json({ error: "คุณมีคำขอที่รอการอนุมัติอยู่แล้ว กรุณารอแอดมินตรวจสอบก่อน" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: reqRow, error: dbError } = await supabase
    .from("subscription_requests")
    .insert({
      user_id: user.id,
      type: "package_upgrade",
      plan,
      status: "pending",
      note: note || null,
      created_at: now,
    })
    .select("id")
    .single();

  if (dbError) {
    return json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" }, { status: 500 });
  }

  // ส่ง LINE notification ไปหาแอดมิน
  await notifyPackageRequest(env, {
    requestId: reqRow.id,
    userId: user.id,
    displayName: profile?.display_name ?? "ผู้ใช้",
    email: profile?.email ?? "",
    plan,
    note: note || undefined,
    createdAt: now,
  }).catch(console.error);

  return redirect("/dashboard/upgrade?sent=1");
}

export default function UpgradePage() {
  const { profile, pending } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const sent = new URL(typeof window !== "undefined" ? window.location.href : "http://x").searchParams.get("sent");

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link to="/pricing" className="text-[#94A3B8] text-xs hover:text-[#C6A96B] transition-colors mb-4 inline-flex items-center gap-1">
          ← ดูรายละเอียดแผนทั้งหมด
        </Link>
        <h1 className="font-display text-3xl font-bold text-[#F8F6F1] mt-2">อัปเกรดแพ็กเกจ</h1>
        <p className="text-[#94A3B8] text-sm mt-1">
          ช่วงทดสอบระบบ — แอดมินจะอนุมัติและเปิดสิทธิ์ให้คุณภายใน 24 ชั่วโมง
        </p>
      </div>

      {/* Success state */}
      {sent === "1" && (
        <div className="rounded-2xl border border-[#C6A96B]/30 p-6 mb-6"
          style={{ background: "rgba(198,169,107,0.08)", backdropFilter: "blur(12px)" }}>
          <p className="text-[#C6A96B] font-semibold text-lg mb-1">✅ ส่งคำขอสำเร็จ!</p>
          <p className="text-[#D9CDB7] text-sm">
            แอดมินได้รับการแจ้งเตือนทาง LINE แล้ว จะอนุมัติและเปิดสิทธิ์ให้คุณภายใน 24 ชั่วโมง
          </p>
        </div>
      )}

      {/* Pending request */}
      {pending && (
        <div className="rounded-2xl border border-yellow-500/30 p-5 mb-6"
          style={{ background: "rgba(234,179,8,0.06)" }}>
          <p className="text-yellow-400 font-semibold text-sm mb-1">⏳ มีคำขอที่รอการอนุมัติอยู่</p>
          <p className="text-[#94A3B8] text-xs">
            แพ็กเกจ: <span className="text-[#C6A96B] font-medium uppercase">{pending.plan}</span>
            {" · "}ส่งเมื่อ: {new Date(pending.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
          </p>
        </div>
      )}

      {/* Plan selection form */}
      {!pending && sent !== "1" && (
        <Form method="post" className="space-y-5">
          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PLANS.map((plan) => (
              <label key={plan.id} className="cursor-pointer group">
                <input type="radio" name="plan" value={plan.id} className="sr-only peer" required />
                <div className="rounded-2xl border border-white/10 p-5 transition-all duration-200 peer-checked:border-[var(--pc)] peer-checked:shadow-[0_0_20px_var(--pc-dim)]"
                  style={{ "--pc": plan.color, "--pc-dim": `${plan.color}22`, background: "rgba(10,34,64,0.5)", backdropFilter: "blur(16px)" } as React.CSSProperties}>
                  <p className="font-display text-xs tracking-widest uppercase mb-1" style={{ color: plan.color }}>{plan.name}</p>
                  <p className="text-[#F8F6F1] font-bold text-xl mb-3">{plan.price}</p>
                  <ul className="space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-[#94A3B8] text-xs">
                        <span style={{ color: plan.color }}>✦</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </label>
            ))}
          </div>

          {/* Note */}
          <div>
            <label className="block text-[#94A3B8] text-xs mb-1.5">หมายเหตุ (ถ้ามี)</label>
            <textarea
              name="note"
              rows={2}
              placeholder="เช่น ช่องทางติดต่อ, โปรโมโค้ด ฯลฯ"
              className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-[#F8F6F1] placeholder-[#94A3B8]/40 resize-none focus:outline-none focus:border-[#C6A96B]/50"
              style={{ background: "rgba(10,34,64,0.5)", backdropFilter: "blur(12px)" }}
            />
          </div>

          {actionData?.error && (
            <p className="text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-sm">
              {actionData.error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl font-bold text-[#020617] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)" }}
          >
            {isSubmitting ? "กำลังส่งคำขอ..." : "ส่งคำขออัปเกรด →"}
          </button>

          <p className="text-center text-[#94A3B8]/50 text-[11px]">
            ช่วงทดสอบ: ยังไม่มีการเรียกเก็บเงินอัตโนมัติ แอดมินจะติดต่อกลับหลังอนุมัติ
          </p>
        </Form>
      )}
    </div>
  );
}
