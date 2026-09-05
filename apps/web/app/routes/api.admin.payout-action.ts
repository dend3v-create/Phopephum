import { json } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import {
  adminApprovePayoutRequest,
  adminRejectPayoutRequest,
  executeOmisePayoutTransfer,
} from "~/services/payoutOperations.server";
import { runHoldingClearanceJob, getPartnerReconciliationAudit } from "~/services/settlement.server";
import type { Env } from "~/env.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  // RBAC Enforcement: Only Admin and Finance Officer
  if (!profile || !["admin", "finance_officer"].includes(profile.role)) {
    return json({ error: "FORBIDDEN: สิทธิ์เฉพาะผู้ดูแลระบบและเจ้าหน้าที่การเงินเท่านั้น" }, { status: 403 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const ipAddress = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || undefined;
  const userAgent = request.headers.get("user-agent") || undefined;

  try {
    switch (intent) {
      case "approve": {
        const payoutRequestId = formData.get("payoutRequestId") as string;
        const reason = formData.get("reason") as string || "Approved by Admin";
        if (!payoutRequestId) {
          return json({ error: "MISSING_PAYOUT_ID: ต้องระบุรหัสคำขอถอนเงิน" }, { status: 400 });
        }

        const result = await adminApprovePayoutRequest({
          payoutRequestId,
          adminId: user.id,
          reason,
          ipAddress,
          userAgent,
          env,
        });

        if (!result.success) {
          return json({ error: result.error || "Approve failed" }, { status: 400 });
        }
        return json({ success: true, result });
      }

      case "reject": {
        const payoutRequestId = formData.get("payoutRequestId") as string;
        const reason = formData.get("reason") as string;
        const evidenceUrl = (formData.get("evidenceUrl") as string) || undefined;

        if (!payoutRequestId || !reason || reason.trim() === "") {
          return json({ error: "REASON_REQUIRED: ต้องระบุเหตุผลในการปฏิเสธคำขอ" }, { status: 400 });
        }

        const result = await adminRejectPayoutRequest({
          payoutRequestId,
          adminId: user.id,
          reason: reason.trim(),
          evidenceUrl,
          ipAddress,
          userAgent,
          env,
        });

        if (!result.success) {
          return json({ error: result.error || "Reject failed" }, { status: 400 });
        }
        return json({ success: true, result });
      }

      case "transfer": {
        const payoutRequestId = formData.get("payoutRequestId") as string;
        if (!payoutRequestId) {
          return json({ error: "MISSING_PAYOUT_ID: ต้องระบุรหัสคำขอถอนเงิน" }, { status: 400 });
        }

        const result = await executeOmisePayoutTransfer({
          payoutRequestId,
          adminId: user.id,
          ipAddress,
          userAgent,
          env,
        });

        if (!result.success) {
          return json({ error: result.error || "Transfer dispatch failed" }, { status: 400 });
        }
        return json({ success: true, result });
      }

      case "run_clearance": {
        const limit = parseInt(formData.get("limit") as string || "100", 10);
        const result = await runHoldingClearanceJob({ limit, env });
        return json({ success: true, result });
      }

      case "run_reconciliation": {
        const partnerId = (formData.get("partnerId") as string) || undefined;
        const result = await getPartnerReconciliationAudit({ partnerId, env });
        return json({ success: true, result });
      }

      default:
        return json({ error: `UNKNOWN_INTENT: ไม่รู้จักคำสั่ง ${intent}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[api.admin.payout-action] Unhandled error:", err);
    return json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
