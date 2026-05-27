import { NextResponse } from 'next/server'

export const runtime = 'edge'

// ─── Line Flex Message Builder ─────────────────────────────────────────────

function buildNewMemberFlexMessage(member: {
  id: string
  full_name: string
  email: string
  birth_date: string
  birth_time?: string
  created_at: string
}) {
  const approveUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://hora-time.pages.dev'}/api/admin/approve`
  const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://hora-time.pages.dev'}/admin`
  const birthDisplay = member.birth_date 
    ? new Date(member.birth_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-'
  const joinedDisplay = new Date(member.created_at).toLocaleString('th-TH', { 
    year: 'numeric', month: 'short', day: 'numeric', 
    hour: '2-digit', minute: '2-digit'
  })

  return {
    type: 'flex',
    altText: `🔔 สมาชิกใหม่สมัคร: ${member.full_name}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '🌟 PHOPEPHUM',
                color: '#C9A96E',
                size: 'sm',
                weight: 'bold',
                flex: 1
              },
              {
                type: 'text',
                text: 'ADMIN ALERT',
                color: '#FF6B6B',
                size: 'xs',
                align: 'end'
              }
            ]
          },
          {
            type: 'text',
            text: '🔔 สมาชิกใหม่รอการอนุมัติ',
            color: '#FFFFFF',
            size: 'lg',
            weight: 'bold',
            margin: 'sm'
          }
        ],
        backgroundColor: '#0A1628',
        paddingAll: '16px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: member.full_name || 'ไม่ระบุชื่อ',
                    size: 'xl',
                    weight: 'bold',
                    color: '#1A1A2E'
                  },
                  {
                    type: 'text',
                    text: member.email || '-',
                    size: 'sm',
                    color: '#6B7280',
                    margin: 'xs'
                  }
                ],
                flex: 1
              }
            ],
            margin: 'sm'
          },
          {
            type: 'separator',
            margin: 'md',
            color: '#E5E7EB'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: '🎂 วันเกิด', size: 'sm', color: '#6B7280', flex: 3 },
                  { type: 'text', text: birthDisplay, size: 'sm', color: '#1A1A2E', weight: 'bold', flex: 5 }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'sm',
                contents: [
                  { type: 'text', text: '⏰ เวลาเกิด', size: 'sm', color: '#6B7280', flex: 3 },
                  { type: 'text', text: member.birth_time || 'ไม่ระบุ', size: 'sm', color: '#1A1A2E', weight: 'bold', flex: 5 }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'sm',
                contents: [
                  { type: 'text', text: '📅 สมัครเมื่อ', size: 'sm', color: '#6B7280', flex: 3 },
                  { type: 'text', text: joinedDisplay, size: 'sm', color: '#1A1A2E', weight: 'bold', flex: 5 }
                ]
              }
            ]
          }
        ],
        backgroundColor: '#FFFFFF',
        paddingAll: '16px'
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '🟢 อนุมัติ Premium — 1 Click',
              uri: `${approveUrl}?userId=${member.id}&action=approve&plan=premium`
            },
            style: 'primary',
            color: '#C9A96E',
            height: 'sm'
          },
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '📋 จัดการบน Admin Panel',
              uri: adminUrl
            },
            style: 'secondary',
            height: 'sm',
            margin: 'sm'
          },
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '🔴 ปฏิเสธสิทธิ์',
              uri: `${approveUrl}?userId=${member.id}&action=reject`
            },
            style: 'secondary',
            color: '#EF4444',
            height: 'sm',
            margin: 'sm'
          }
        ],
        backgroundColor: '#F9FAFB',
        paddingAll: '12px'
      }
    }
  }
}

// ─── POST /api/notify/line — ส่ง Flex Message แจ้งเตือนครูเด่น ─────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, member } = body

    const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
    const adminUserId = process.env.LINE_ADMIN_USER_ID

    if (!lineToken || !adminUserId) {
      console.warn('[/api/notify/line] LINE credentials not configured, skipping notification')
      return NextResponse.json({ success: false, message: 'LINE not configured' })
    }

    let message: object

    if (type === 'new_member' && member) {
      message = buildNewMemberFlexMessage(member)
    } else if (type === 'approve_success') {
      message = {
        type: 'text',
        text: `✅ อนุมัติสมาชิก ${body.name || ''} สำเร็จแล้ว!\nสิทธิ์ปัจจุบัน: ${body.plan || 'premium'} 🌟\nตรวจสอบเพิ่มเติมที่: ${process.env.NEXT_PUBLIC_APP_URL}/admin`
      }
    } else if (type === 'reject_success') {
      message = {
        type: 'text',
        text: `❌ ปฏิเสธสิทธิ์สมาชิก ${body.name || ''} เรียบร้อย`
      }
    } else {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }

    // ส่งข้อความผ่าน Line Messaging API
    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lineToken}`
      },
      body: JSON.stringify({
        to: adminUserId,
        messages: [message]
      })
    })

    if (!lineRes.ok) {
      const errText = await lineRes.text()
      console.error('[/api/notify/line] LINE API error:', errText)
      return NextResponse.json({ success: false, error: errText }, { status: 502 })
    }

    return NextResponse.json({ success: true, message: 'LINE notification sent' })

  } catch (error) {
    console.error('[/api/notify/line] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
