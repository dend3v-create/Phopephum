import { json } from "@remix-run/cloudflare";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import type { Env } from "~/env.server";
import { executeHourlyReconciliation } from "~/services/reconciliation.server";

// ==============================================================================
// 🏛️ PHOPEPHUM V3 — STEP 7.2E.3: AUTOMATED RECONCILIATION CRON ENDPOINT
// ==============================================================================
// Accessible by Cloudflare Scheduled Cron Worker (Bearer Authorization) or Admin
// ==============================================================================

function verifyCronAuthorization(request: Request, env: Env): boolean {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.slice(7).trim();
  const validSecret = env.CRON_SECRET || env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(validSecret && token === validSecret);
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  
  if (!verifyCronAuthorization(request, env)) {
    return json({ error: "UNAUTHORIZED_CRON_ACCESS" }, { status: 401 });
  }

  const result = await executeHourlyReconciliation({
    runType: "hourly_surveillance",
    env,
  });

  return json({
    success: result.success,
    runId: result.runId,
    status: result.status,
    discrepancyCount: result.discrepancyCount,
    paymentsChecked: result.paymentsChecked,
    commissionsChecked: result.commissionsChecked,
    transfersChecked: result.transfersChecked,
    partnersChecked: result.partnersChecked,
    timestamp: new Date().toISOString(),
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  return loader({ request, context } as LoaderFunctionArgs);
}
