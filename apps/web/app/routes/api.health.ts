import { json } from "@remix-run/cloudflare";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import type { Env } from "~/env.server";
import { sendAdminAlert } from "~/services/alert.server";
import { detectOperationalAnomalies } from "~/services/observability.server";

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
  if (!env.AI_WORKER_URL) return { ok: true, latencyMs: 0 }; // Non-blocking if mock
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

  // Optional monitor secret
  const authHeader = request.headers.get("Authorization");
  const monitorSecret = env.HEALTH_CHECK_SECRET;
  const isAuthorizedMonitor = monitorSecret ? authHeader === `Bearer ${monitorSecret}` : true;

  const [supabase, aiWorker, anomalyReport] = await Promise.all([
    checkSupabase(env),
    checkAIWorker(env),
    detectOperationalAnomalies(env),
  ]);

  const allHealthy = supabase.ok && (!env.AI_WORKER_URL || aiWorker.ok) && !anomalyReport.hasAnomalies;

  // Send admin alert if database is down
  if (!supabase.ok) {
    sendAdminAlert(env, {
      type: "health_check_failed",
      severity: "critical",
      message: `Supabase ไม่ตอบสนอง: ${supabase.error || "HTTP error"}`,
      path: "/api/health",
    }).catch(console.error);
  }

  // Send alert if critical anomaly detected
  if (anomalyReport.hasAnomalies) {
    const criticalAnomaly = anomalyReport.anomalies.find((a) => a.severity === "critical");
    if (criticalAnomaly) {
      sendAdminAlert(env, {
        type: "financial_reconciliation_mismatch",
        severity: "critical",
        message: criticalAnomaly.description,
        path: "/api/health",
      }).catch(console.error);
    }
  }

  return json(
    {
      status: allHealthy ? "healthy" : "degraded",
      version: "3.0.0",
      architecture: "v2-frozen",
      timestamp: new Date().toISOString(),
      checks: {
        supabase,
        aiWorker,
      },
      anomalies: isAuthorizedMonitor
        ? {
            detected: anomalyReport.hasAnomalies,
            count: anomalyReport.anomalyCount,
            items: anomalyReport.anomalies,
          }
        : {
            detected: anomalyReport.hasAnomalies,
            count: anomalyReport.anomalyCount,
          },
    },
    { status: allHealthy ? 200 : (supabase.ok ? 200 : 503) }
  );
}
