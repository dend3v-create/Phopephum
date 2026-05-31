/**
 * services/resend.server.ts
 * Resend Email API — ส่ง transactional email
 *
 * ใช้งาน:
 *   1. sendApprovalEmail()  — แจ้ง User ผลอนุมัติ/ปฏิเสธ
 *   2. sendWelcomeEmail()   — ต้อนรับสมาชิกใหม่เมื่ออนุมัติ registration
 */
import type { Env } from "~/env.server";

const RESEND_API_URL = "https://api.resend.com/emails";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
}

// ─── Core send function ───────────────────────────────────────────────────────

async function sendEmail(apiKey: string, payload: EmailPayload): Promise<void> {
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[Resend] Send failed:", res.status, body);
    throw new Error(`Resend email failed: ${res.status}`);
  }
}

// ─── Email Templates ──────────────────────────────────────────────────────────

const BASE_STYLE = `
  font-family: 'Georgia', serif;
  background: #020617;
  color: #F8F6F1;
`;

const CONTAINER_STYLE = `
  max-width: 560px;
  margin: 0 auto;
  background: #071427;
  border: 1px solid rgba(198,169,107,0.25);
  border-radius: 16px;
  overflow: hidden;
`;

const HEADER_STYLE = `
  background: linear-gradient(135deg, #020617 0%, #071427 100%);
  padding: 28px 32px 20px;
  border-bottom: 1px solid rgba(198,169,107,0.15);
`;

const BODY_STYLE = `
  padding: 28px 32px;
  background: #071427;
`;

const FOOTER_STYLE = `
  padding: 16px 32px;
  background: rgba(2,6,23,0.8);
  border-top: 1px solid rgba(198,169,107,0.10);
  text-align: center;
`;

function buildApprovalHtml(
  displayName: string,
  plan: string,
  approved: boolean,
  adminNote?: string,
  appUrl = "https://phopephum-web.pages.dev"
): string {
  const planLabel =
    plan === "imperial"
      ? "✦ Imperial Master"
      : plan === "pro"
      ? "◈ Professional Sage"
      : "⚡ Basic";

  const planColor =
    plan === "imperial" ? "#C6A96B" : plan === "pro" ? "#6D8FC7" : "#34D399";

  const statusColor = approved ? "#34D399" : "#F87171";
  const statusTitle = approved ? "✅ อนุมัติแล้ว!" : "❌ ยังไม่ผ่านการอนุมัติ";
  const statusMsg = approved
    ? `คำขออัปเกรดแพ็กเกจ <strong style="color:${planColor}">${planLabel}</strong> ของคุณได้รับการอนุมัติแล้วครับ สามารถเข้าใช้งานได้ทันที`
    : `คำขออัปเกรดแพ็กเกจของคุณยังไม่ผ่านการอนุมัติในครั้งนี้ กรุณาติดต่อทีมงานเพื่อสอบถามข้อมูลเพิ่มเติม`;

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${statusTitle} — PhopePhum</title>
</head>
<body style="${BASE_STYLE}; margin:0; padding: 24px 16px;">
  <div style="${CONTAINER_STYLE}">
    
    <!-- Header -->
    <div style="${HEADER_STYLE}">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
        <span style="color:#C6A96B; font-size:20px;">✦</span>
        <span style="color:#F8F6F1; font-size:18px; font-weight:bold; letter-spacing:0.08em;">PhopePhum</span>
      </div>
      <p style="color:#94A3B8; font-size:11px; margin:0; letter-spacing:0.12em; text-transform:uppercase;">
        Living Wisdom OS · การแจ้งเตือนระบบ
      </p>
    </div>

    <!-- Body -->
    <div style="${BODY_STYLE}">
      <div style="background: rgba(${approved ? "52,211,153" : "248,113,113"},0.08); border: 1px solid rgba(${approved ? "52,211,153" : "248,113,113"},0.25); border-radius:12px; padding:16px 20px; margin-bottom:20px;">
        <p style="color:${statusColor}; font-weight:bold; font-size:16px; margin:0 0 4px;">${statusTitle}</p>
        <p style="color:#D9CDB7; font-size:13px; margin:0; line-height:1.6;">${statusMsg}</p>
      </div>

      <p style="color:#F8F6F1; font-size:14px; margin:0 0 8px;">สวัสดี <strong style="color:#C6A96B;">${displayName}</strong>,</p>
      <p style="color:#D9CDB7; font-size:13px; line-height:1.7; margin:0 0 16px;">
        ${approved
          ? `ขอบคุณที่เลือกใช้งาน PhopePhum ✨ แพ็กเกจของคุณเปิดใช้งานแล้ว สามารถเข้าสู่ระบบและใช้ฟีเจอร์ทั้งหมดได้ทันทีครับ`
          : `ขออภัยในความไม่สะดวก หากมีข้อสงสัย กรุณาติดต่อทีมงานผ่าน LINE OA หรือ อีเมลของเราครับ`}
      </p>

      ${adminNote
        ? `<div style="background:rgba(148,163,184,0.06); border:1px solid rgba(148,163,184,0.15); border-radius:8px; padding:12px 16px; margin-bottom:16px;">
             <p style="color:#94A3B8; font-size:11px; text-transform:uppercase; letter-spacing:0.08em; margin:0 0 4px;">หมายเหตุจากแอดมิน</p>
             <p style="color:#D9CDB7; font-size:13px; margin:0;">${adminNote}</p>
           </div>`
        : ""}

      ${approved
        ? `<div style="text-align:center; margin-top:24px;">
             <a href="${appUrl}/dashboard" 
                style="display:inline-block; background:linear-gradient(135deg, #C6A96B, #D9BC82); color:#020617; font-weight:bold; font-size:14px; padding:14px 32px; border-radius:50px; text-decoration:none; letter-spacing:0.05em;">
               เข้าสู่แดชบอร์ด →
             </a>
           </div>`
        : `<div style="text-align:center; margin-top:24px;">
             <a href="https://line.me/R/ti/p/@phopephum" 
                style="display:inline-block; background:rgba(198,169,107,0.12); color:#C6A96B; font-weight:bold; font-size:13px; padding:12px 28px; border-radius:50px; text-decoration:none; border:1px solid rgba(198,169,107,0.30);">
               ติดต่อทีมงาน
             </a>
           </div>`}
    </div>

    <!-- Footer -->
    <div style="${FOOTER_STYLE}">
      <p style="color:#94A3B8; font-size:11px; margin:0 0 4px;">
        © 2025 PhopePhum · Astral Imperial Living Wisdom OS
      </p>
      <p style="color:#94A3B8; font-size:11px; margin:0;">
        <a href="${appUrl}" style="color:#C6A96B; text-decoration:none;">phopephum-web.pages.dev</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildWelcomeHtml(
  displayName: string,
  appUrl = "https://phopephum-web.pages.dev"
): string {
  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ยินดีต้อนรับสู่ PhopePhum</title>
</head>
<body style="${BASE_STYLE}; margin:0; padding: 24px 16px;">
  <div style="${CONTAINER_STYLE}">
    <div style="${HEADER_STYLE}">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
        <span style="color:#C6A96B; font-size:20px;">✦</span>
        <span style="color:#F8F6F1; font-size:18px; font-weight:bold; letter-spacing:0.08em;">PhopePhum</span>
      </div>
      <p style="color:#C6A96B; font-size:12px; margin:0; letter-spacing:0.10em;">Living Wisdom OS</p>
    </div>
    <div style="${BODY_STYLE}">
      <p style="color:#C6A96B; font-size:22px; font-weight:bold; margin:0 0 12px;">✨ ยินดีต้อนรับ!</p>
      <p style="color:#F8F6F1; font-size:14px; margin:0 0 8px;">สวัสดี <strong style="color:#C6A96B;">${displayName}</strong>,</p>
      <p style="color:#D9CDB7; font-size:13px; line-height:1.7; margin:0 0 20px;">
        บัญชีของคุณได้รับการอนุมัติแล้ว คุณสามารถเข้าใช้งาน <strong>PhopePhum</strong> — ระบบโหราศาสตร์ไทยประยุกต์ AI ได้ทันทีครับ 🌟
      </p>
      <div style="background:rgba(198,169,107,0.06); border:1px solid rgba(198,169,107,0.20); border-radius:12px; padding:16px 20px; margin-bottom:24px;">
        <p style="color:#C6A96B; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:0.10em; margin:0 0 10px;">ฟีเจอร์ที่พร้อมใช้งาน</p>
        ${["🕐 ยามอัฏฐกาลขณะนี้ (Live)", "☽ ดิถีจันทรคติและวันพระ", "✦ ตรวจดวงชะตาเบื้องต้น", "📅 วางแผนชีวิต TQM"].map(
          (f) => `<p style="color:#D9CDB7; font-size:13px; margin:4px 0;">${f}</p>`
        ).join("")}
      </div>
      <div style="text-align:center;">
        <a href="${appUrl}/dashboard" 
           style="display:inline-block; background:linear-gradient(135deg, #C6A96B, #D9BC82); color:#020617; font-weight:bold; font-size:14px; padding:14px 36px; border-radius:50px; text-decoration:none; letter-spacing:0.05em;">
          เริ่มใช้งานได้เลย →
        </a>
      </div>
    </div>
    <div style="${FOOTER_STYLE}">
      <p style="color:#94A3B8; font-size:11px; margin:0;">
        © 2025 PhopePhum · <a href="${appUrl}" style="color:#C6A96B; text-decoration:none;">phopephum-web.pages.dev</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * ส่ง Email แจ้งผล Approve/Reject
 * ใช้ใน: admin.approvals.tsx action
 */
export async function sendApprovalEmail(
  env: Env,
  toEmail: string,
  displayName: string,
  plan: string,
  approved: boolean,
  adminNote?: string
): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Resend] Missing RESEND_API_KEY — skipping email");
    return;
  }

  const appUrl = env.APP_URL ?? "https://phopephum-web.pages.dev";
  const subject = approved
    ? `✅ แพ็กเกจของคุณได้รับการอนุมัติแล้ว — PhopePhum`
    : `แจ้งผลการพิจารณาคำขอ — PhopePhum`;

  await sendEmail(apiKey, {
    from: "PhopePhum <noreply@phopephum.com>",
    to: [toEmail],
    subject,
    html: buildApprovalHtml(displayName, plan, approved, adminNote, appUrl),
  });
}

/**
 * ส่ง Welcome Email เมื่ออนุมัติ Registration
 * ใช้ใน: admin.approvals.tsx action (type === "registration")
 */
export async function sendWelcomeEmail(
  env: Env,
  toEmail: string,
  displayName: string
): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Resend] Missing RESEND_API_KEY — skipping welcome email");
    return;
  }

  const appUrl = env.APP_URL ?? "https://phopephum-web.pages.dev";

  await sendEmail(apiKey, {
    from: "PhopePhum <noreply@phopephum.com>",
    to: [toEmail],
    subject: "✨ ยินดีต้อนรับสู่ PhopePhum — บัญชีของคุณพร้อมใช้งานแล้ว!",
    html: buildWelcomeHtml(displayName, appUrl),
  });
}

/**
 * ส่ง Email แจ้งชำระเงินสำเร็จ
 * ใช้ใน: api.webhook.gbprimepay.ts
 */
export async function sendPaymentSuccessEmail(
  env: Env,
  toEmail: string,
  displayName: string,
  plan: string,
  expiresAt: string
): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Resend] Missing RESEND_API_KEY — skipping payment email");
    return;
  }

  const appUrl = env.APP_URL ?? "https://phopephum-web.pages.dev";
  const formattedExpiry = new Date(expiresAt).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  await sendEmail(apiKey, {
    from: "PhopePhum <noreply@phopephum.com>",
    to: [toEmail],
    subject: "✅ ขอบคุณสำหรับการชำระเงิน — แพ็กเกจของคุณพร้อมใช้งานแล้ว!",
    html: buildPaymentSuccessHtml(displayName, plan, formattedExpiry, appUrl),
  });
}

function buildPaymentSuccessHtml(
  displayName: string,
  plan: string,
  expiresAt: string,
  appUrl: string
): string {
  const planLabel =
    plan === "imperial"
      ? "✦ Imperial Master"
      : plan === "pro"
      ? "◈ Professional Sage"
      : "⚡ Basic";

  const planColor =
    plan === "imperial" ? "#C6A96B" : plan === "pro" ? "#6D8FC7" : "#34D399";

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="${BASE_STYLE}; margin:0; padding: 24px 16px;">
  <div style="${CONTAINER_STYLE}">
    <div style="${HEADER_STYLE}">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="color:#C6A96B; font-size:20px;">✦</span>
        <span style="color:#F8F6F1; font-size:18px; font-weight:bold; letter-spacing:0.08em;">PhopePhum</span>
      </div>
    </div>
    <div style="${BODY_STYLE}">
      <p style="color:#C6A96B; font-size:22px; font-weight:bold; margin:0 0 12px;">✅ ชำระเงินสำเร็จ!</p>
      <p style="color:#F8F6F1; font-size:14px; margin:0 0 8px;">สวัสดีคุณ <strong style="color:#C6A96B;">${displayName}</strong>,</p>
      <p style="color:#D9CDB7; font-size:13px; line-height:1.7; margin:0 0 20px;">
        ขอบคุณที่เลือกใช้บริการ <strong>PhopePhum</strong> ครับ ระบบได้รับการยืนยันการชำระเงินของคุณเรียบร้อยแล้ว และได้ทำการยกระดับสมาชิกของคุณเป็น:
      </p>
      <div style="background:rgba(198,169,107,0.06); border:1px solid rgba(198,169,107,0.20); border-radius:12px; padding:16px 20px; margin-bottom:24px; text-align:center;">
        <p style="color:${planColor}; font-size:18px; font-weight:bold; margin:0 0 5px;">${planLabel}</p>
        <p style="color:#94A3B8; font-size:12px; margin:0;">ใช้บริการได้ถึง: ${expiresAt}</p>
      </div>
      <div style="text-align:center;">
        <a href="${appUrl}/dashboard" 
           style="display:inline-block; background:linear-gradient(135deg, #C6A96B, #D9BC82); color:#020617; font-weight:bold; font-size:14px; padding:14px 36px; border-radius:50px; text-decoration:none;">
          กลับสู่หน้า Dashboard →
        </a>
      </div>
    </div>
    <div style="${FOOTER_STYLE}">
      <p style="color:#94A3B8; font-size:11px; margin:0;">
        © 2025 PhopePhum · <a href="${appUrl}" style="color:#C6A96B; text-decoration:none;">phopephum-web.pages.dev</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
