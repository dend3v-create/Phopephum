/**
 * resend.ts
 * Email client สำหรับ Hora AI (Welcome, Report, Alert)
 */
import { Resend } from 'resend'

const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("WARNING: RESEND_API_KEY is not defined. Email will not be sent.")
    return null
  }
  return new Resend(apiKey)
}

const FROM = process.env.RESEND_FROM ?? 'noreply@hora-ai.com'

// ─── Email Templates ─────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  const resend = getResend()
  if (!resend) return null
  return resend.emails.send({
    from: FROM,
    to,
    subject: `ยินดีต้อนรับสู่ Hora AI, คุณ${name}! 🌟`,
    html: `
      <div style="font-family:'Sarabun',sans-serif;background:#0A0806;color:#F5F0E8;padding:40px;border-radius:12px;max-width:600px;margin:0 auto">
        <h1 style="color:#C9A96E;font-size:24px;margin-bottom:16px">ยินดีต้อนรับสู่ Hora AI ✨</h1>
        <p style="font-size:16px;line-height:1.7">สวัสดีคุณ<strong style="color:#C9A96E">${name}</strong>,</p>
        <p style="font-size:16px;line-height:1.7">ขอบคุณที่เลือกใช้บริการ <strong>Hora AI</strong> — แพลตฟอร์มพยากรณ์ยามอัฐกาลและดวงชะตาชีวิตระดับพรีเมียม</p>
        <p style="font-size:16px;line-height:1.7">เริ่มต้นค้นหาดวงชะตาของคุณได้แล้ววันนี้!</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
           style="background:#C9A96E;color:#0A0806;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;margin-top:20px">
          เข้าสู่ Dashboard →
        </a>
        <p style="font-size:13px;color:#8B7E6E;margin-top:32px">© ${new Date().getFullYear()} Hora AI — ระบบดวงชะตาและยามอัฐกาล</p>
      </div>
    `,
  })
}

export async function sendReportReadyEmail(
  to: string,
  name: string,
  reportUrl: string
) {
  const resend = getResend()
  if (!resend) return null
  return resend.emails.send({
    from: FROM,
    to,
    subject: `รายงานดวงชะตาของคุณพร้อมแล้ว! 📜`,
    html: `
      <div style="font-family:'Sarabun',sans-serif;background:#0A0806;color:#F5F0E8;padding:40px;border-radius:12px;max-width:600px;margin:0 auto">
        <h1 style="color:#C9A96E;font-size:24px">รายงานชีวิตของคุณพร้อมแล้ว ✨</h1>
        <p style="font-size:16px;line-height:1.7">สวัสดีคุณ<strong style="color:#C9A96E">${name}</strong>,</p>
        <p style="font-size:16px;line-height:1.7">ระบบ AI ได้วิเคราะห์ดวงชะตาและจัดทำรายงานชีวิตเฉพาะตัวของคุณเสร็จเรียบร้อยแล้ว</p>
        <a href="${reportUrl}" 
           style="background:#C9A96E;color:#0A0806;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;margin-top:20px">
          ดาวน์โหลดรายงาน PDF →
        </a>
      </div>
    `,
  })
}

export async function sendContactEmail(
  name: string,
  email: string,
  message: string
) {
  const resend = getResend()
  if (!resend) return null
  return resend.emails.send({
    from: FROM,
    to: process.env.ADMIN_EMAIL ?? FROM,
    replyTo: email,
    subject: `[Hora AI] ข้อความจาก ${name}`,
    html: `<p><strong>จาก:</strong> ${name} (${email})</p><p><strong>ข้อความ:</strong><br/>${message}</p>`,
  })
}
