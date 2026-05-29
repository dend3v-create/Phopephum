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

const PLAN_LABEL: Record<string, string> = {
  basic:    "BASIC INITIATION (ฟรี)",
  pro:      "PROFESSIONAL SAGE (฿149/เดือน)",
  imperial: "IMPERIAL MASTER (฿299/เดือน)",
};

const PLAN_COLOR: Record<string, string> = {
  basic:    "#94A3B8",
  pro:      "#C6A96B",
  imperial: "#4B6FAE",
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

  const appUrl = env.APP_URL || "https://phopephum-web.pages.dev";
  const approveUrl = `${appUrl}/admin/approvals?highlight=${data.requestId}`;
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
                text: "PhopePhum",
                color: "#F8F6F1",
                weight: "bold",
                size: "lg",
                margin: "sm",
              },
            ],
          },
          {
            type: "text",
            text: "สมาชิกใหม่สมัครเข้าใช้งาน",
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
              infoRow("⌘", "แพ็กเกจ", "BASIC (ฟรี)"),
              infoRow("⟁", "เวลาสมัคร", timeStr),
            ],
          },
          {
            type: "text",
            text: "⏳ รอการอนุมัติจากแอดมิน",
            color: "#E8A44A",
            size: "xs",
            margin: "md",
            align: "center",
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
              label: "✅ อนุมัติ / จัดการ",
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

  const appUrl = env.APP_URL || "https://phopephum-web.pages.dev";
  const approveUrl = `${appUrl}/admin/approvals?highlight=${data.requestId}`;
  const planLabel = PLAN_LABEL[data.plan] ?? data.plan;
  const planColor = PLAN_COLOR[data.plan] ?? "#94A3B8";
  const timeStr = new Date(data.createdAt).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "short",
    timeStyle: "short",
  });

  const message = {
    type: "flex",
    altText: `💎 คำขออัปเกรด: ${data.displayName} → ${data.plan.toUpperCase()}`,
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
              { type: "text", text: "PhopePhum", color: "#F8F6F1", weight: "bold", size: "lg", margin: "sm" },
            ],
          },
          {
            type: "text",
            text: "คำขออัปเกรดแพ็กเกจ",
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
          {
            type: "text",
            text: "⏳ ยังไม่ได้ชำระเงิน — รอแอดมินอนุมัติ",
            color: "#E8A44A",
            size: "xs",
            margin: "md",
            align: "center",
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
              label: "✅ อนุมัติ / จัดการ",
              uri: approveUrl,
            },
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
