/**
 * GET /api/admin/metrics
 * Endpoint รวมรวม Real-time Observability Telemetry สำหรับ Admin & Operational Dashboards
 *
 * Security:
 * - Admin Auth Session (requireRole 'admin') OR
 * - Bearer Token matching HEALTH_CHECK_SECRET
 */

import { json } from "@remix-run/cloudflare";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import type { Env } from "~/env.server";
import { requireAdmin } from "~/services/auth.server";
import {
  getOperationalSystemMetrics,
  detectOperationalAnomalies,
  runFinancialReconciliation,
} from "~/services/observability.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;

  // 1. Authorization check
  const authHeader = request.headers.get("Authorization");
  const monitorSecret = env.HEALTH_CHECK_SECRET;
  const isAuthorizedBearer = monitorSecret && authHeader === `Bearer ${monitorSecret}`;

  if (!isAuthorizedBearer) {
    // Fall back to session admin role check
    await requireAdmin(request, env);
  }

  // 2. Parse query parameters
  const url = new URL(request.url);
  const timeWindowHours = Number(url.searchParams.get("window") || "24");
  const lookbackDays = Number(url.searchParams.get("reconcileDays") || "7");

  // 3. Fetch telemetry in parallel
  const [metrics, anomalies, reconciliation] = await Promise.all([
    getOperationalSystemMetrics(env, timeWindowHours),
    detectOperationalAnomalies(env),
    runFinancialReconciliation(env, lookbackDays),
  ]);

  return json({
    status: "ok",
    version: "3.0.0",
    architecture: "v2-frozen",
    timestamp: new Date().toISOString(),
    windowHours: timeWindowHours,
    metrics,
    anomalies: {
      hasAnomalies: anomalies.hasAnomalies,
      count: anomalies.anomalyCount,
      items: anomalies.anomalies,
    },
    reconciliation: {
      period: reconciliation.period,
      grossSalesThb: reconciliation.grossSalesThb,
      netReceivedThb: reconciliation.netReceivedThb,
      gatewayFeesThb: reconciliation.gatewayFeesThb,
      gatewayFeeVatThb: reconciliation.gatewayFeeVatThb,
      pmarketInvoiceVatThb: reconciliation.pmarketInvoiceVatThb,
      successfulTransactions: reconciliation.successfulTransactions,
      unreconciledTransactions: reconciliation.unreconciledCount,
      isBalanced: reconciliation.isBalanced,
    },
  });
}
