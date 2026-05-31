/**
 * GET /api/health
 * ตรวจสอบสถานะระบบ: Supabase + AI Worker
 * ใช้สำหรับ uptime monitoring และ admin dashboard
 */

import { json } from "@remix-run/cloudflare";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import type { Env } from "~/env.server";
import { sendAdminAlert } from "~/services/alert.server";

type CheckResult = {
  ok: boolean;
  latencyMs?: number;
  error?: string;
};

async function checkSupabase(env: Env): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
    });
    return { ok: res.ok, latencyMs: Date.now() - start };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - start, error: String(e) };
  }
}

async function checkAIWorker(env: Env): Promise<CheckResult> {
  if (!env.AI_WORKER_URL) return { ok: false, error: "AI_WORKER_URL not configured" };
  const start = Date.now();
  try {
    const res = await fetch(`${env.AI_WORKER_URL}/health`, {
      headers: { Authorization: `Bearer ${env.AI_WORKER_SECRET}` },
    });
    return { ok: res.ok, latencyMs: Date.now() - start };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - start, error: String(e) };
  }
}

export async function loader({ context, request }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;

  // ตรวจสอบ Bearer token สำหรับ external monitoring (optional)
  const authHeader = request.headers.get("Authorization");
  const monitorSecret = env.HEALTH_CHECK_SECRET;
  if (monitorSecret && authHeader !== `Bearer ${monitorSecret}`) {
    // Allow unauthenticated pings — return minimal response
    return json({ status: "ok" }, { status: 200 });
  }

  const [supabase, aiWorker] = await Promise.all([
    checkSupabase(env),
    checkAIWorker(env),
  ]);

  const allOk = supabase.ok && aiWorker.ok;

  // แจ้งเตือนแอดมินถ้า service ล้ม
  if (!supabase.ok) {
    sendAdminAlert(env, {
      type: "health_check_failed",
      severity: "critical",
      message: `Supabase ไม่ตอบสนอง: ${supabase.error || "HTTP error"}`,
    }).catch(console.error);
  }
  if (!aiWorker.ok) {
    sendAdminAlert(env, {
      type: "health_check_failed",
      severity: "critical",
      message: `AI Worker ไม่ตอบสนอง: ${aiWorker.error || "HTTP error"}`,
    }).catch(console.error);
  }

  return json(
    {
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks: {
        supabase,
        aiWorker,
      },
    },
    { status: allOk ? 200 : 503 }
  );
}
