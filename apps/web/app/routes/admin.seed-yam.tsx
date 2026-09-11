/**
 * admin.seed-yam.tsx — Seed ดวงยามสำเร็จ 112 ผัง → Supabase
 * Protected: Admin only
 * POST → generate + upsert → return result
 */
import { json } from "@remix-run/cloudflare";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAdmin } from "~/services/auth.server";
import { createServiceRoleClient } from "~/services/supabase.server";
import { seedSuccessYamCharts } from "~/services/seed-yam.server";
import type { Env } from "~/env.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);

  try {
    const supabase = createServiceRoleClient(env);
    const { count, error } = await supabase
      .from("success_yam_charts")
      .select("*", { count: "exact", head: true });

    const isTableReady = !error;
    const currentCount = count ?? 0;

    return json({
      ready: true,
      isTableReady,
      currentCount,
      dbError: error?.message || null,
    });
  } catch (err: any) {
    return json({
      ready: true,
      isTableReady: false,
      currentCount: 0,
      dbError: err?.message || "Cannot connect to Supabase",
    });
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);

  const start = Date.now();
  const result = await seedSuccessYamCharts(env);
  const elapsed = Date.now() - start;

  return json({ ...result, elapsed });
}

export default function SeedYamPage() {
  const { isTableReady, currentCount, dbError } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const isSeeding = nav.state === "submitting";

  return (
    <div className="max-w-xl mx-auto p-6 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#C9A96E] font-display">Seed ดวงยามสำเร็จ</h1>
        <p className="text-slate-600 dark:text-[#C6B79F] text-sm mt-1">
          บันทึก 112 ผัง (7 วัน × 2 ช่วงเวลากลางวัน-กลางคืน × 8 ยาม) ลงฐานข้อมูล Supabase
        </p>
      </div>

      {/* ── ข้อมูลสถานะฐานข้อมูลแบบ Realtime ── */}
      {isTableReady ? (
        <div className="rounded-2xl p-5 border border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="font-bold text-base">ฐานข้อมูลพร้อมใช้งาน (Migration 009 Applied)</p>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
              Active
            </span>
          </div>
          <p className="text-sm font-sarabun text-slate-700 dark:text-emerald-200/90">
            พบข้อมูลดวงยามสำเร็จในตาราง <code className="font-mono font-bold text-emerald-800 dark:text-emerald-300">success_yam_charts</code>:{" "}
            <strong className="text-emerald-800 dark:text-emerald-300 font-display text-lg">{currentCount} / 112 ผัง</strong>
            {currentCount === 112 ? " (ครบถ้วนสมบูรณ์ 100%)" : " (ข้อมูลยังไม่ครบ 112 ผัง)"}
          </p>
          <p className="text-xs text-slate-500 dark:text-[#C6B79F]">
            โครงสร้าง: 7 วัน × 2 ช่วง (กลางวัน/กลางคืน) × 8 ยาม = 112 ผังการตีความมาตรฐาน (ดาวลอย 11 ดวง, 12 ภพ, ยามย่อย 12 ช่อง)
          </p>
        </div>
      ) : (
        <div className="rounded-2xl p-5 border border-rose-500/30 bg-rose-50/80 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 shadow-sm space-y-2">
          <p className="font-bold text-base">⚠️ ยังไม่พบตาราง success_yam_charts ในฐานข้อมูล</p>
          <p className="text-sm font-sarabun">
            กรุณา Apply migration <code className="font-mono font-bold bg-rose-200/50 dark:bg-rose-900/50 px-1.5 py-0.5 rounded text-rose-950 dark:text-rose-200">009_success_yam_charts.sql</code> ใน Supabase SQL Editor ก่อนดำเนินการ
          </p>
          {dbError && (
            <p className="text-xs font-mono text-rose-700 dark:text-rose-400 bg-rose-100/60 dark:bg-rose-950/60 p-2 rounded-lg">
              Error details: {dbError}
            </p>
          )}
        </div>
      )}

      {/* ── คำแนะนำ & Requirement ── */}
      <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-400/40 dark:border-amber-500/30 rounded-2xl p-4 text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-relaxed font-sarabun">
        <p className="font-bold mb-1 flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
          <span>ℹ️</span> หมายเหตุการทำงานของระบบ Seed
        </p>
        <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-amber-200/80">
          <li>ระบบจะประมวลผลผังดวงยามทั้ง 112 ผังผ่าน Engine และทำการ Upsert (อัปเดตหากมีอยู่แล้ว)</li>
          <li>ทำงานอัตโนมัติในระดับ Server-side ด้วยสิทธิ์สูงสุด (Service Role Key)</li>
          <li>ไม่กระทบต่อผู้ใช้งานทั่วไป และข้อมูลจะถูกนำไปใช้วิเคราะห์ผลกาลชะตาแบบทันที</li>
        </ul>
      </div>

      {/* ── Action Form ── */}
      <Form method="post">
        <button
          type="submit"
          disabled={isSeeding}
          className="w-full py-3.5 rounded-2xl font-bold bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-lg shadow-[#C6A96B]/20 hover:opacity-95 active:scale-[0.99] disabled:opacity-50 transition-all text-sm flex items-center justify-center gap-2"
        >
          {isSeeding ? (
            <>
              <span className="animate-spin text-base">⏳</span>
              <span>กำลังประมวลผลและ Upsert 112 ผัง...</span>
            </>
          ) : currentCount === 112 ? (
            <>
              <span>🔄</span>
              <span>อัปเดตข้อมูล / Re-Seed 112 ผัง</span>
            </>
          ) : (
            <>
              <span>🌟</span>
              <span>เริ่ม Seed 112 ผังลง Supabase</span>
            </>
          )}
        </button>
      </Form>

      {/* ── ผลลัพธ์หลัง Seed ── */}
      {actionData && (
        <div className={`rounded-2xl p-5 border text-sm space-y-2 shadow-md animate-in fade-in duration-300 ${
          actionData.success
            ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500/40 text-emerald-900 dark:text-emerald-200"
            : "bg-rose-50/90 dark:bg-rose-950/40 border-rose-500/40 text-rose-900 dark:text-rose-200"
        }`}>
          {actionData.success ? (
            <>
              <p className="font-bold text-base flex items-center gap-2">
                <span>✅</span>
                <span>บันทึกและซิงค์ข้อมูลดวงยามสำเร็จ 112 ผังเรียบร้อยแล้ว</span>
              </p>
              <div className="text-xs space-y-1 font-sarabun text-slate-700 dark:text-emerald-200/90 pl-6">
                <p>จำนวนที่บันทึกสำเร็จ (Upserted): <strong>{(actionData as any).upserted}</strong> ผัง</p>
                <p>ข้อผิดพลาด (Errors): <strong>{(actionData as any).errors}</strong></p>
                <p>ระยะเวลาที่ใช้: <strong>{(actionData as any).elapsed} ms</strong></p>
              </div>
            </>
          ) : (
            <>
              <p className="font-bold text-base flex items-center gap-2">
                <span>❌</span>
                <span>การ Seed ข้อมูลล้มเหลว</span>
              </p>
              <p className="text-xs font-mono pl-6 text-rose-700 dark:text-rose-300">{(actionData as any).error}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

