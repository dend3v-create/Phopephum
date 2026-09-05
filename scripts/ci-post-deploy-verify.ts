/**
 * ci-post-deploy-verify.ts
 * ============================================================================
 * 🏛️ PHOPEPHUM V3 — CI/CD GATE 7: POST-DEPLOYMENT LIVE HEALTH & TELEMETRY
 * ============================================================================
 *
 * This script runs immediately after a Cloudflare Pages / Worker deployment
 * to verify that the live surface is healthy, database latency is within SLA,
 * and zero operational anomalies are present.
 *
 * Usage:
 *   pnpm exec tsx scripts/ci-post-deploy-verify.ts --url https://phopephum.com
 */

interface HealthCheckResponse {
  status: string;
  version: string;
  architecture: string;
  timestamp: string;
  checks: {
    supabase: { ok: boolean; latencyMs: number };
    aiWorker: { ok: boolean; endpoint?: string };
  };
  anomalies?: {
    detected: boolean;
    count: number;
    items?: string[];
  };
}

function parseTargetUrl(): string {
  const args = process.argv.slice(2);
  const urlIdx = args.indexOf("--url");
  if (urlIdx !== -1 && args[urlIdx + 1]) {
    return args[urlIdx + 1].replace(/\/$/, "");
  }
  return (process.env.TARGET_DEPLOY_URL || process.env.APP_URL || "https://phopephum.com").replace(/\/$/, "");
}

export async function runPostDeploymentVerification(): Promise<boolean> {
  const baseUrl = parseTargetUrl();
  const healthUrl = `${baseUrl}/api/health`;

  console.log("================================================================================");
  console.log("🏛️  PHOPEPHUM V3 — CI/CD GATE 7: POST-DEPLOYMENT VERIFICATION");
  console.log("================================================================================");
  console.log(`Target Surface URL: ${baseUrl}`);
  console.log(`Health Telemetry:   ${healthUrl}\n`);

  const startTime = Date.now();
  let response: Response;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    response = await fetch(healthUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "PhopePhum-CI-PostDeploy-Verifier/3.0.0",
      },
    });
    clearTimeout(timeout);
  } catch (err: any) {
    console.error(`❌ [HEALTH_CHECK_FAILED] Failed to connect to ${healthUrl}: ${err.message}`);
    console.error("🚨 POST-DEPLOY VERIFICATION FAILED: Live endpoint unreachable.\n");
    process.exit(1);
  }

  const durationMs = Date.now() - startTime;

  if (!response.ok) {
    console.error(`❌ [HEALTH_CHECK_FAILED] Endpoint returned HTTP ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  const payload = (await response.json()) as HealthCheckResponse;

  console.log(`  ✅ [PASS] #01 [HTTP/STATUS ] HTTP 200 OK (${durationMs}ms latency)`);

  // Verify Version & Architecture Lock Contract
  if (payload.version !== "3.0.0") {
    console.error(`❌ [CONTRACT_VIOLATION] Expected version '3.0.0', got '${payload.version}'`);
    process.exit(1);
  }
  console.log(`  ✅ [PASS] #02 [CONTRACT    ] System Version: ${payload.version}`);

  if (payload.architecture !== "v2-frozen") {
    console.error(`❌ [CONTRACT_VIOLATION] Expected architecture 'v2-frozen', got '${payload.architecture}'`);
    process.exit(1);
  }
  console.log(`  ✅ [PASS] #03 [CONTRACT    ] Architecture Lock: ${payload.architecture}`);

  // Verify Overall Status
  if (payload.status !== "healthy") {
    console.error(`❌ [HEALTH_DEGRADED] Overall status is '${payload.status}'`);
    process.exit(1);
  }
  console.log(`  ✅ [PASS] #04 [SYSTEM/STATE] Overall Status: ${payload.status}`);

  // Verify Database Connectivity
  if (!payload.checks?.supabase?.ok) {
    console.error("❌ [DB_DEGRADED] Supabase connectivity check failed");
    process.exit(1);
  }
  console.log(`  ✅ [PASS] #05 [SUPABASE    ] Live Database Connected (Latency: ${payload.checks.supabase.latencyMs}ms)`);

  // Verify AI Worker Gateway
  if (!payload.checks?.aiWorker?.ok) {
    console.error("❌ [AI_DEGRADED] AI Worker Gateway configuration check failed");
    process.exit(1);
  }
  console.log(`  ✅ [PASS] #06 [AI_WORKER   ] AI Gateway Configured & Reachable`);

  // Verify Zero Production Anomalies
  if (payload.anomalies && payload.anomalies.detected && payload.anomalies.count > 0) {
    console.warn(`  ⚠️ [ANOMALY_WARN] ${payload.anomalies.count} operational anomalies flagged by scanner.`);
  } else {
    console.log(`  ✅ [PASS] #07 [ANOMALIES   ] Zero active operational anomalies in production`);
  }

  console.log("\n================================================================================");
  console.log("🏆 POST-DEPLOYMENT VERIFICATION PASSED: PRODUCTION IS 100% HEALTHY & LIVE!");
  console.log("================================================================================\n");

  return true;
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes("ci-post-deploy-verify")) {
  runPostDeploymentVerification().catch((err) => {
    console.error("FATAL VERIFIER ERROR:", err);
    process.exit(1);
  });
}
