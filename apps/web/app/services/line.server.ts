/**
 * services/line.server.ts
 * LINE Messaging API — Flex Message notifications
 *
 * ส่ง Flex Message ไปยัง Admin LINE OA เมื่อ:
 *   1. มีสมาชิกสมัครใหม่ (registration)
 *   2. มีคำขออัปเกรดแพ็กเกจ (package_upgrade)
 *
 * Admin กดปุ่ม "อนุมัติ" ใน LINE → เปิด browser ไปหน้า /admin/approvals
 */

import type { Env } from "~/env.server";

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

export const PLAN_LABEL: Record<string, string> = {
  free: "เริ่มทดลอง (FREE)",
  basic: "ยกระดับชีวิต (Premium ฿89/ด.)",
  premium: "ยกระดับชีวิต (Premium ฿89/ด.)",
  pro: "มืออาชีพ (Professional ฿289/ด.)",
  pro_annual: "มืออาชีพ (Professional รายปี ฿2,770/ปี)",
  master: "โหราจารย์ (Master ฿1,289/ด.)",
  imperial: "โหราจารย์ (Master ฿1,289/ด.)",
  sands_50: "50 ละอองทรายกาลเวลา (฿59)",
  sands_150: "150 ละอองทรายกาลเวลา (฿149)",
  sands_500: "500 ละอองทรายกาลเวลา (฿399)",
};

export const PLAN_COLOR: Record<string, string> = {
  free: "#94A3B8",
  basic: "#34D399",
  premium: "#34D399",
  pro: "#D9BC82",
  pro_annual: "#D9BC82",
  master: "#C6A96B",
  imperial: "#C6A96B",
  sands_50: "#C6A96B",
  sands_150: "#C6A96B",
  sands_500: "#C6A96B",
};

// ─── Push helper ─────────────────────────────────────────────────────────────

async function pushMessage(token: string, to: string, messages: object[]) {
  const res = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to, messages }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[LINE] push failed:", res.status, text);
  }
}

// ─── New Registration Notification ───────────────────────────────────────────

export async function notifyNewRegistration(
  env: Env,
  data: {
    requestId: string;
    userId: string;
    displayName: string;
    email: string;
    createdAt: string;
  }
) {
  if (!env.LINE_CHANNEL_ACCESS_TOKEN || !env.LINE_ADMIN_USER_ID) return;

  const appUrl = env.APP_URL || "https://phopephum.com";
  const approveUrl = `${appUrl}/admin/users`;
  const timeStr = new Date(data.createdAt).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "short",
    timeStyle: "short",
  });

  const message = {
    type: "flex",
    altText: `🌟 สมาชิกใหม่: ${data.displayName}`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        backgroundColor: "#020617",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: "✦",
                color: "#C6A96B",
                size: "lg",
                flex: 0,
              },
              {
                type: "text",
                text: "PhopePhum OS",
                color: "#F8F6F1",
                weight: "bold",
                size: "lg",
                margin: "sm",
              },
            ],
          },
          {
            type: "text",
            text: "🌟 สมาชิกใหม่สมัครเข้าใช้งาน",
            color: "#C6A96B",
            size: "xs",
            margin: "sm",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        backgroundColor: "#0A1628",
        spacing: "sm",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#0F2040",
            cornerRadius: "8px",
            paddingAll: "12px",
            contents: [
              infoRow("☽", "ชื่อ", data.displayName),
              infoRow("◈", "อีเมล", data.email),
              infoRow("⌘", "ระดับสมาชิก", "เริ่มทดลอง (FREE)"),
              infoRow("⟁", "เวลาสมัคร", timeStr),
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        backgroundColor: "#020617",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#C6A96B",
            height: "sm",
            action: {
              type: "uri",
              label: "👥 ดูรายชื่อสมาชิก",
              uri: approveUrl,
            },
          },
        ],
      },
    },
  };

  await pushMessage(env.LINE_CHANNEL_ACCESS_TOKEN, env.LINE_ADMIN_USER_ID, [message]);
}

// ─── Package Upgrade Notification ────────────────────────────────────────────

export async function notifyPackageRequest(
  env: Env,
  data: {
    requestId: string;
    userId: string;
    displayName: string;
    email: string;
    plan: string;
    note?: string;
    createdAt: string;
  }
) {
  if (!env.LINE_CHANNEL_ACCESS_TOKEN || !env.LINE_ADMIN_USER_ID) return;

  const appUrl = env.APP_URL || "https://phopephum.com";
  const planLabel = PLAN_LABEL[data.plan] ?? data.plan;
  const planColor = PLAN_COLOR[data.plan] ?? "#C6A96B";
  const timeStr = new Date(data.createdAt).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "short",
    timeStyle: "short",
  });

  const message = {
    type: "flex",
    altText: `💎 รายการสั่งซื้อใหม่: ${data.displayName} (${planLabel})`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        backgroundColor: "#020617",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "✦", color: planColor, size: "lg", flex: 0 },
              { type: "text", text: "PhopePhum OS", color: "#F8F6F1", weight: "bold", size: "lg", margin: "sm" },
            ],
          },
          {
            type: "text",
            text: "💎 รายการสั่งซื้อ / อัปเกรดสมาชิก",
            color: planColor,
            size: "xs",
            margin: "sm",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        backgroundColor: "#0A1628",
        spacing: "sm",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#0F2040",
            cornerRadius: "8px",
            paddingAll: "12px",
            contents: [
              infoRow("☽", "ชื่อ", data.displayName),
              infoRow("◈", "อีเมล", data.email),
              {
                type: "box",
                layout: "horizontal",
                margin: "sm",
                contents: [
                  { type: "text", text: "✦  แพ็กเกจ", color: "#94A3B8", size: "xs", flex: 3 },
                  { type: "text", text: planLabel, color: planColor, size: "xs", flex: 5, weight: "bold", wrap: true },
                ],
              },
              infoRow("⟁", "เวลา", timeStr),
              ...(data.note ? [infoRow("💬", "หมายเหตุ", data.note)] : []),
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        backgroundColor: "#020617",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: planColor,
            height: "sm",
            action: {
              type: "uri",
              label: "📊 ดูประวัติธุรกรรม",
              uri: `${appUrl}/admin/payouts`,
            },
          },
        ],
      },
    },
  };

  await pushMessage(env.LINE_CHANNEL_ACCESS_TOKEN, env.LINE_ADMIN_USER_ID, [message]);
}

// ─── Payment Success Notification ───────────────────────────────────────────

export async function notifyPaymentSuccess(
  env: Env,
  data: {
    userId: string;
    displayName: string;
    plan: string;
    amount: number;
    expiresAt: string;
  }
) {
  if (!env.LINE_CHANNEL_ACCESS_TOKEN || !env.LINE_ADMIN_USER_ID) return;

  const isSands = data.plan.startsWith("sands_");
  const planLabel = PLAN_LABEL[data.plan] ?? data.plan;
  const planColor = PLAN_COLOR[data.plan] ?? "#34D399";
  const expiryStr = data.expiresAt
    ? new Date(data.expiresAt).toLocaleDateString("th-TH", { dateStyle: "medium" })
    : "ไม่มีวันหมดอายุ";

  const message = {
    type: "flex",
    altText: `💰 รับเงินสำเร็จ: ฿${data.amount.toLocaleString()} จาก ${data.displayName} (${planLabel})`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        backgroundColor: "#020617",
        contents: [
          {
            type: "text",
            text: isSands ? "⌛ SANDS REFILL RECEIVED" : "💎 MEMBERSHIP PAYMENT SUCCESS",
            color: "#34D399",
            weight: "bold",
            size: "xs",
            letterSpacing: "0.1em",
          },
          {
            type: "text",
            text: `฿${data.amount.toLocaleString()}`,
            color: "#F8F6F1",
            weight: "bold",
            size: "xxl",
            margin: "sm",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        backgroundColor: "#0A1628",
        contents: [
          infoRow("☽", "ลูกค้า", data.displayName),
          infoRow("✦", "รายการ", planLabel),
          infoRow(isSands ? "⌛" : "📅", isSands ? "อายุใช้งาน" : "หมดอายุ", expiryStr),
        ],
      },
    },
  };

  await pushMessage(env.LINE_CHANNEL_ACCESS_TOKEN, env.LINE_ADMIN_USER_ID, [message]);
}

// ─── Withdrawal Request Notification ─────────────────────────────────────────

export async function notifyWithdrawalRequest(
  env: Env,
  data: {
    userId: string;
    displayName: string;
    amount: number;
    bankName: string;
    accountName: string;
    accountNumber: string;
  }
) {
  if (!env.LINE_CHANNEL_ACCESS_TOKEN || !env.LINE_ADMIN_USER_ID) return;

  const appUrl = env.APP_URL || "https://phopephum-web.pages.dev";
  const manageUrl = `${appUrl}/admin/payouts`; // สมมติว่ามีหน้านี้

  const message = {
    type: "flex",
    altText: `💸 คำขอถอนเงิน: ฿${data.amount} จาก ${data.displayName}`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        backgroundColor: "#020617",
        contents: [
          { type: "text", text: "💸 WITHDRAWAL REQUEST", color: "#E8A44A", weight: "bold", size: "xs", letterSpacing: "0.1em" },
          { type: "text", text: `฿${data.amount.toLocaleString()}`, color: "#F8F6F1", weight: "bold", size: "xxl", margin: "sm" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        backgroundColor: "#0A1628",
        contents: [
          infoRow("👤", "ชื่อผู้ขอ", data.displayName),
          infoRow("🏦", "ธนาคาร", data.bankName),
          infoRow("💳", "เลขบัญชี", data.accountNumber),
          infoRow("📝", "ชื่อบัญชี", data.accountName),
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#020617",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#E8A44A",
            action: { type: "uri", label: "จัดการการโอนเงิน", uri: manageUrl },
          },
        ],
      },
    },
  };

  await pushMessage(env.LINE_CHANNEL_ACCESS_TOKEN, env.LINE_ADMIN_USER_ID, [message]);
}

// ─── Helper: info row ─────────────────────────────────────────────────────────

function infoRow(icon: string, label: string, value: string) {
  return {
    type: "box",
    layout: "horizontal",
    margin: "sm",
    contents: [
      { type: "text", text: `${icon}  ${label}`, color: "#94A3B8", size: "xs", flex: 3 },
      { type: "text", text: value, color: "#F8F6F1", size: "xs", flex: 5, wrap: true },
    ],
  };
}
