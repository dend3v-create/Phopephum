import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export const runtime = 'edge'

// ─── GET /api/admin/approve — 1-Click approval via Line URL Button ──────────
// ใช้ GET เพราะ Line URI Action จะเปิด URL ในบราวเซอร์มือถือของครูเด่น

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const action = searchParams.get('action') // 'approve' | 'reject'
    const plan = searchParams.get('plan') || 'premium'

    if (!userId || !action) {
      return new Response(renderHTML('❌ ข้อมูลไม่ครบถ้วน', 'กรุณาลองใหม่อีกครั้ง', '#EF4444'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }

    const supabase = createAdminClient()

    if (action === 'approve') {
      // ยืนยันอีเมลผู้ใช้ผ่าน Supabase Auth REST API (reliable in edge runtime)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      try {
        const confirmRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: 'PUT',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email_confirm: true }),
        })
        if (!confirmRes.ok) {
          const errBody = await confirmRes.text()
          console.warn('[/api/admin/approve] Auth confirm failed:', confirmRes.status, errBody)
        }
      } catch (authError) {
        console.warn('[/api/admin/approve] Failed to auto-confirm email:', authError)
      }

      // อัปสิทธิ์เป็น premium + ปลดล็อก AI tokens
      const tokenLimit = plan === 'premium' ? 999999 : (plan === 'pro' ? 500 : 5)
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          plan: plan,
          ai_tokens_limit: tokenLimit,
          is_approved: true,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('full_name')
        .single()

      if (error) {
        console.error('[/api/admin/approve] Approve error:', error)
        return new Response(renderHTML('❌ เกิดข้อผิดพลาด', error.message, '#EF4444'), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
      }

      const memberName = (data as any)?.full_name || 'สมาชิก'

      // ส่งยืนยันกลับไป Line ว่าอนุมัติสำเร็จ
      await notifyLine('approve_success', { name: memberName, plan })

      return new Response(renderHTML(
        `✅ อนุมัติสิทธิ์สำเร็จ!`,
        `คุณ${memberName} ได้รับสิทธิ์ ${plan.toUpperCase()} แล้ว\nAI Coach โควตา: ${tokenLimit === 999999 ? 'ไม่จำกัด' : tokenLimit} ครั้ง`,
        '#10B981'
      ), { headers: { 'Content-Type': 'text/html; charset=utf-8' } })

    } else if (action === 'reject') {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          plan: 'free',
          ai_tokens_limit: 0,
          is_approved: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('full_name')
        .single()

      if (error) {
        return new Response(renderHTML('❌ เกิดข้อผิดพลาด', error.message, '#EF4444'), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
      }

      const memberName = (data as any)?.full_name || 'สมาชิก'
      await notifyLine('reject_success', { name: memberName })

      return new Response(renderHTML(
        `🚫 ปฏิเสธสิทธิ์แล้ว`,
        `คุณ${memberName} ถูกระงับสิทธิ์การใช้งาน`,
        '#6B7280'
      ), { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    }

    return new Response(renderHTML('❌ Action ไม่ถูกต้อง', 'กรุณาลองใหม่', '#EF4444'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })

  } catch (error) {
    console.error('[/api/admin/approve] Error:', error)
    return new Response(renderHTML('❌ Server Error', String(error), '#EF4444'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }
}

// ─── POST /api/admin/approve — อนุมัติจากหน้า Admin Panel ─────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, action, plan = 'premium', role = 'user' } = body

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 })
    }

    const supabase = createAdminClient()

    if (action === 'approve') {
      // ยืนยันอีเมลผู้ใช้ผ่าน Supabase Auth REST API (reliable in edge runtime)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      try {
        const confirmRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: 'PUT',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email_confirm: true }),
        })
        if (!confirmRes.ok) {
          const errBody = await confirmRes.text()
          console.warn('[/api/admin/approve] POST Auth confirm failed:', confirmRes.status, errBody)
        }
      } catch (authError) {
        console.warn('[/api/admin/approve] POST Failed to auto-confirm email:', authError)
      }

      // ปรับปรุงโควตา AI Tokens ตามแพ็กเกจ
      // plan 3 (imperial) = 999999999 (ไม่จำกัดสูงสุด)
      // plan 2 (premium) = 999999 (ไม่จำกัดทั่วไป)
      // plan 1 (pro) = 500
      // free = 5
      const tokenLimit = plan === 'imperial' ? 999999999 : (plan === 'premium' ? 999999 : (plan === 'pro' ? 500 : 5))
      const { data, error } = await supabase
        .from('profiles')
        .update({
          plan,
          role,
          ai_tokens_limit: tokenLimit,
          is_approved: true,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('full_name')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      
      const memberName = (data as any)?.full_name || 'สมาชิก'
      await notifyLine('approve_success', { name: memberName, plan })

      return NextResponse.json({ success: true, message: `อัปเดตสิทธิ์ ${memberName} เป็น ${plan} (${role}) สำเร็จ` })

    } else if (action === 'reject') {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          plan: 'free',
          ai_tokens_limit: 0,
          is_approved: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('full_name')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const memberName = (data as any)?.full_name || 'สมาชิก'
      await notifyLine('reject_success', { name: memberName })

      return NextResponse.json({ success: true, message: `ปฏิเสธสิทธิ์ ${memberName} สำเร็จ` })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('[/api/admin/approve] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Helper: ส่งแจ้งเตือน Line ─────────────────────────────────────────────

async function notifyLine(type: string, data: object) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hora-time.pages.dev'
    await fetch(`${appUrl}/api/notify/line`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...data })
    })
  } catch (err) {
    console.warn('[notifyLine] Failed to send Line notification:', err)
  }
}

// ─── Helper: HTML ผลลัพธ์ที่สวยงาม (สำหรับการเปิดผ่านมือถือ) ──────────────

function renderHTML(title: string, message: string, color: string) {
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #0A1628 0%, #0f2a4a 100%);
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .card {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(201,169,110,0.3);
      border-radius: 20px;
      padding: 40px 32px;
      text-align: center;
      max-width: 380px;
      width: 100%;
    }
    .icon { font-size: 64px; margin-bottom: 16px; }
    .title { color: ${color}; font-size: 22px; font-weight: 700; margin-bottom: 12px; }
    .message { color: rgba(255,255,255,0.7); font-size: 15px; line-height: 1.6; white-space: pre-line; }
    .brand { color: #C9A96E; font-size: 13px; margin-top: 24px; letter-spacing: 2px; }
    .btn {
      display: inline-block; margin-top: 20px; padding: 12px 24px;
      background: #C9A96E; color: #0A1628; border-radius: 12px;
      font-weight: 700; text-decoration: none; font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${color === '#10B981' ? '✅' : color === '#EF4444' ? '❌' : '🚫'}</div>
    <div class="title">${title}</div>
    <div class="message">${message}</div>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://hora-time.pages.dev'}/admin" class="btn">
      กลับหน้า Admin Panel
    </a>
    <div class="brand">🌟 PHOPEPHUM — Living Wisdom OS</div>
  </div>
</body>
</html>`
}
