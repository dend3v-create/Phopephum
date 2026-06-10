/**
 * admin.seed-yam.tsx — Seed ดวงยามสำเร็จ 112 ผัง → Supabase
 * Protected: Admin only
 * POST → generate + upsert → return result
 */
import { json } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAdmin } from "~/services/auth.server";
import { seedSuccessYamCharts } from "~/services/seed-yam.server";
import type { Env } from "~/env.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);
  return json({ ready: true });
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
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const isSeeding = nav.state === "submitting";

  return (
    <div className="max-w-lg mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#C9A96E] font-display">Seed ดวงยามสำเร็จ</h1>
        <p className="text-[#8A8070] text-sm mt-1">บันทึก 112 ผัง (7 วัน × 2 ช่วง × 8 ยาม) ลง Supabase</p>
      </div>

      <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-200">
        ⚠ ต้องตั้งค่า <code className="text-amber-100 font-mono">SUPABASE_SERVICE_ROLE_KEY</code> ใน environment ก่อน<br />
        และต้อง Apply migration <code className="font-mono text-amber-100">009_success_yam_charts.sql</code> ก่อนด้วย
      </div>

      <Form method="post">
        <button
          type="submit"
          disabled={isSeeding}
          className="w-full py-3 rounded-xl font-bold bg-[#C9A96E]/15 border border-[#C9A96E]/40 text-[#C9A96E] hover:bg-[#C9A96E]/25 disabled:opacity-50 transition-all"
        >
          {isSeeding ? "⏳ กำลัง Seed..." : "🌟 เริ่ม Seed 112 ผัง"}
        </button>
      </Form>

      {actionData && (
        <div className={`rounded-xl p-5 border text-sm space-y-2 ${
          actionData.success
            ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
            : "bg-rose-950/30 border-rose-500/30 text-rose-200"
        }`}>
          {actionData.success ? (
            <>
              <p className="font-bold text-lg">✅ Seed สำเร็จ</p>
              <p>Upserted: <strong>{(actionData as any).upserted}</strong> rows</p>
              <p>Errors: <strong>{(actionData as any).errors}</strong> rows</p>
              <p>ใช้เวลา: <strong>{(actionData as any).elapsed} ms</strong></p>
            </>
          ) : (
            <>
              <p className="font-bold">❌ Seed ล้มเหลว</p>
              <p>{(actionData as any).error}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
