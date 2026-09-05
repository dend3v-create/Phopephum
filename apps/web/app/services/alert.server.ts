/**
 * services/alert.server.ts
 * ระบบแจ้งเตือนแอดมินเมื่อเกิดปัญหาในระบบ
 *
 * Features:
 * - ส่ง LINE Flex Message แบบ "Alert" ไปแอดมินทันที
 * - Cooldown per error type (KV_CACHE) → ไม่ spam เดิมซ้ำๆ ภายใน 5 นาที
 * - Severity levels: 🔴 CRITICAL | 🟡 WARNING | 🔵 INFO
 * - แสดงข้อมูลผู้ใช้ที่ได้รับผลกระทบ (ถ้ามี)
 * - ปุ่ม "ไปแก้ไขทันที" link ตรงไป /admin
 */

import type { Env } from "~/env.server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertSeverity = "critical" | "warning" | "info";

export type AlertType =
  | "ai_generation_failed"    // AI สร้างรายงานไม่ได้
  | "ai_worker_unreachable"   // AI Worker ตอบไม่ได้
  | "report_save_failed"      // บันทึก report ลง DB ไม่ได้
  | "payment_failed"          // การชำระเงินล้มเหลว
  | "database_error"          // DB query error
  | "auth_error"              // Auth ระบบมีปัญหา
  | "quota_exceeded"          // ใช้เกิน quota (warning)
  | "health_check_failed"     // Health check ล้มเหลว
  | "unhandled_error"         // Error ที่ไม่ได้ handle
  | "financial_reconciliation_mismatch" // ยอดเงินไม่ตรง (INV-07)
  | "sands_ledger_discrepancy"          // ยอดทรายไม่ตรงกับ Ledger (ECON-03)
  | "webhook_replay_anomaly"            // Webhook ผิดปกติ
  | "payout_settlement_failed"          // โอนเงิน Partner ล้มเหลว
  | "security_cross_tenant_attempt";    // การพยายามเข้าถึงข้ามบัญชี

export interface AlertPayload {
  type: AlertType;
  severity: AlertSeverity;
  message: string;              // สรุปปัญหาสั้นๆ
  details?: string;             // รายละเอียดเพิ่มเติม (เช่น stack trace)
  userId?: string;              // user ที่ได้รับผลกระทบ
  userEmail?: string;           // email ของ user
  reportType?: string;          // ถ้าเกิดตอนสร้าง report
  path?: string;                // URL path ที่เกิดปัญหา
}

// ─── Cooldown config ─────────────────────────────────────────────────────────

const COOLDOWN_SECONDS: Record<AlertSeverity, number> = {
  critical: 60,    // 1 นาที — critical ต้องรู้เร็ว
  warning:  300,   // 5 นาที
  info:     600,   // 10 นาที
};

// ─── Severity styles ─────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<AlertSeverity, {
  emoji: string;
  label: string;
  headerColor: string;
  headerTextColor: string;
}> = {
  critical: {
    emoji: "🔴",
    label: "CRITICAL — ต้องแก้ด่วน!",
    headerColor: "#7f1d1d",
    headerTextColor: "#fca5a5",
  },
  warning: {
    emoji: "🟡",
    label: "WARNING — ควรตรวจสอบ",
    headerColor: "#78350f",
    headerTextColor: "#fcd34d",
  },
  info: {
    emoji: "🔵",
    label: "INFO — ข้อมูลระบบ",
    headerColor: "#1e3a5f",
    headerTextColor: "#93c5fd",
  },
};

const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  ai_generation_failed:  "AI สร้างรายงานล้มเหลว",
  ai_worker_unreachable: "AI Worker ตอบไม่ได้",
  report_save_failed:    "บันทึก Report ล้มเหลว",
  payment_failed:        "ชำระเงินล้มเหลว",
  database_error:        "Database Error",
  auth_error:            "Auth Error",
  quota_exceeded:        "ใช้เกิน Quota",
  health_check_failed:   "Health Check ล้มเหลว",
  unhandled_error:       "Unhandled Error",
  financial_reconciliation_mismatch: "ยอดเงินไม่ตรง (Reconciliation Mismatch)",
  sands_ledger_discrepancy: "ยอดทรายไม่ตรงกับ Ledger (Sands Discrepancy)",
  webhook_replay_anomaly: "พบ Webhook ซ้ำซ้อนผิดปกติ (Webhook Anomaly)",
  payout_settlement_failed: "โอนเงิน Partner ล้มเหลว (Payout Failed)",
  security_cross_tenant_attempt: "ตรวจพบการเข้าถึงข้ามบัญชี (Security Breach Attempt)",
};

// ─── LINE push ───────────────────────────────────────────────────────────────

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

async function pushLineMessage(token: string, to: string, messages: object[]) {
  try {
    const res = await fetch(LINE_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to, messages }),
    });
    if (!res.ok) {
      console.error("[Alert] LINE push failed:", res.status, await res.text());
    }
  } catch (e) {
    console.error("[Alert] LINE push exception:", e);
  }
}

// ─── Build Flex Message ───────────────────────────────────────────────────────

function buildAlertFlexMessage(payload: AlertPayload, appUrl: string): object {
  const sc = SEVERITY_CONFIG[payload.severity];
  const typeLabel = ALERT_TYPE_LABEL[payload.type];
  const thaiTime = new Date().toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const bodyContents: object[] = [
    {
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: "⏰ เวลา:", color: "#C6B79F", size: "xs", flex: 2 },
        { type: "text", text: thaiTime, color: "#F8F6F1", size: "xs", flex: 5, wrap: true },
      ],
    },
    {
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: "🚨 ประเภท:", color: "#C6B79F", size: "xs", flex: 2 },
        { type: "text", text: typeLabel, color: "#F8F6F1", size: "xs", flex: 5, wrap: true, weight: "bold" },
      ],
    },
    { type: "separator", margin: "sm" },
    {
      type: "text",
      text: payload.message,
      color: "#F8F6F1",
      size: "sm",
      wrap: true,
      margin: "sm",
    },
  ];

  // รายละเอียดเพิ่มเติม
  if (payload.details) {
    bodyContents.push({
      type: "text",
      text: `📋 ${payload.details.substring(0, 200)}`,
      color: "#94A3B8",
      size: "xxs",
      wrap: true,
      margin: "sm",
    } as object);
  }

  // ข้อมูลผู้ใช้ที่ได้รับผลกระทบ
  if (payload.userEmail || payload.userId) {
    bodyContents.push({ type: "separator", margin: "sm" } as object);
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: "👤 User:", color: "#C6B79F", size: "xs", flex: 2 },
        {
          type: "text",
          text: payload.userEmail || payload.userId?.substring(0, 12) + "..." || "-",
          color: "#C6A96B",
          size: "xs",
          flex: 5,
          wrap: true,
        },
      ],
      margin: "sm",
    } as object);
  }

  return {
    type: "flex",
    altText: `${sc.emoji} [PhopePhum Alert] ${payload.message}`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: sc.headerColor,
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: `${sc.emoji} ${sc.label}`,
            color: sc.headerTextColor,
            size: "sm",
            weight: "bold",
          },
          {
            type: "text",
            text: "PhopePhum — System Alert",
            color: "#64748B",
            size: "xxs",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0F172A",
        paddingAll: "16px",
        spacing: "sm",
        contents: bodyContents,
      },
      footer: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0F172A",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "🔧 เข้าแก้ไขทันที → Admin",
              uri: `${appUrl}/admin`,
            },
            style: "primary",
            color: payload.severity === "critical" ? "#ef4444" : "#C6A96B",
            height: "sm",
          },
        ],
      },
    },
  };
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * ส่งแจ้งเตือนแอดมินผ่าน LINE
 * มี cooldown per error type — ไม่ส่ง spam เดิมซ้ำ
 */
export async function sendAdminAlert(
  env: Env,
  payload: AlertPayload
): Promise<void> {
  if (!env.LINE_CHANNEL_ACCESS_TOKEN || !env.LINE_ADMIN_USER_ID) {
    console.warn("[Alert] LINE credentials not configured — skipping alert");
    return;
  }

  // ── Cooldown check via KV ─────────────────────────────────────────────────
  const kvKey = `alert:cooldown:${payload.type}`;
  try {
    if (env.KV_CACHE && typeof env.KV_CACHE.get === "function") {
      const last = await env.KV_CACHE.get(kvKey);
      if (last) {
        console.log(`[Alert] Cooldown active for ${payload.type}, skipping`);
        return;
      }
      // Set cooldown
      const ttl = COOLDOWN_SECONDS[payload.severity];
      await env.KV_CACHE.put(kvKey, "1", { expirationTtl: ttl });
    }
  } catch (kvErr) {
    // KV ไม่พร้อม — ส่งไปเลยโดยไม่มี cooldown
    console.warn("[Alert] KV cooldown check failed, sending anyway:", kvErr);
  }

  // ── Build & send LINE message ─────────────────────────────────────────────
  const appUrl = env.APP_URL || "https://phopephum.com";
  const message = buildAlertFlexMessage(payload, appUrl);
  await pushLineMessage(env.LINE_CHANNEL_ACCESS_TOKEN, env.LINE_ADMIN_USER_ID, [message]);

  console.log(`[Alert] Sent ${payload.severity} alert: ${payload.type} — ${payload.message}`);
}

/**
 * Convenience: ส่ง CRITICAL alert (AI ล้มเหลว)
 */
export async function alertAIFailed(
  env: Env,
  err: unknown,
  context: { userId?: string; userEmail?: string; reportType?: string }
): Promise<void> {
  const msg = err instanceof Error ? err.message : String(err);
  await sendAdminAlert(env, {
    type: "ai_generation_failed",
    severity: "critical",
    message: `AI สร้างรายงานล้มเหลว: ${msg.substring(0, 120)}`,
    details: err instanceof Error ? err.stack?.substring(0, 200) : undefined,
    userId: context.userId,
    userEmail: context.userEmail,
    reportType: context.reportType,
  }).catch(console.error);
}

/**
 * Convenience: ส่ง WARNING alert (DB error)
 */
export async function alertDatabaseError(
  env: Env,
  operation: string,
  err: unknown,
  userId?: string
): Promise<void> {
  const msg = err instanceof Error ? err.message : String(err);
  await sendAdminAlert(env, {
    type: "database_error",
    severity: "warning",
    message: `DB Error ใน ${operation}: ${msg.substring(0, 120)}`,
    userId,
  }).catch(console.error);
}
