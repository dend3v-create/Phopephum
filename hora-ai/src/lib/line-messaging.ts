/**
 * line-messaging.ts
 * LINE Messaging API Client (Flex Messages) สำหรับ Hora AI
 * รองรับการส่งแจ้งเตือนแชนแนล ID 2010206779 ไปยังผู้ดูแลระบบ (Admin)
 */

const LINE_PUSH_API = 'https://api.line.me/v2/bot/message/push'

interface LineMessagingConfig {
  channelAccessToken: string
  adminUserId: string
}

function getLineConfig(): LineMessagingConfig | null {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const adminUserId = process.env.LINE_ADMIN_USER_ID

  if (!channelAccessToken || !adminUserId) {
    console.warn("WARNING: LINE_CHANNEL_ACCESS_TOKEN or LINE_ADMIN_USER_ID is missing. LINE Alert bypassed.")
    return null
  }

  return { channelAccessToken, adminUserId }
}

async function sendLineFlexMessage(
  altText: string,
  flexContents: Record<string, unknown>
): Promise<void> {
  const config = getLineConfig()
  if (!config) return

  const res = await fetch(LINE_PUSH_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.channelAccessToken}`,
    },
    body: JSON.stringify({
      to: config.adminUserId,
      messages: [
        {
          type: 'flex',
          altText,
          contents: flexContents,
        },
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LINE Messaging API error: ${res.status} — ${text}`)
  }
}

/** แจ้งเตือนข้อความผู้ติดต่อใหม่ผ่าน Flex Message ธีม Dark Luxury สีทอง-ดำ */
export async function notifyAdminNewUser(
  name: string,
  email: string,
  source: string = 'contact_form'
): Promise<void> {
  const formattedDate = new Date().toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const flexContents = {
    type: 'bubble',
    size: 'giga',
    styles: {
      header: { backgroundColor: '#0A0806' },
      body: { backgroundColor: '#0A0806' },
      footer: { backgroundColor: '#0A0806' }
    },
    header: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: 'HORA AI — NOTIFICATION',
          color: '#C9A96E',
          weight: 'bold',
          size: 'xs',
          tracking: '0.15em'
        },
        {
          type: 'text',
          text: '📥 มีข้อความติดต่อใหม่เข้ามา',
          color: '#F5F0E8',
          weight: 'bold',
          size: 'lg'
        }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        {
          type: 'separator',
          color: '#C9A96E22'
        },
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              width: '70px',
              contents: [
                {
                  type: 'text',
                  text: 'ผู้ติดต่อ',
                  color: '#8B7E6E',
                  size: 'sm'
                }
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: name,
                  color: '#F5F0E8',
                  size: 'sm',
                  weight: 'bold'
                }
              ]
            }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              width: '70px',
              contents: [
                {
                  type: 'text',
                  text: 'อีเมล',
                  color: '#8B7E6E',
                  size: 'sm'
                }
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: email,
                  color: '#C9A96E',
                  size: 'sm',
                  decoration: 'underline'
                }
              ]
            }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              width: '70px',
              contents: [
                {
                  type: 'text',
                  text: 'แหล่งที่มา',
                  color: '#8B7E6E',
                  size: 'sm'
                }
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: source.toUpperCase(),
                  color: '#C9A96E',
                  size: 'xs',
                  weight: 'bold'
                }
              ]
            }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              width: '70px',
              contents: [
                {
                  type: 'text',
                  text: 'เวลาบันทึก',
                  color: '#8B7E6E',
                  size: 'sm'
                }
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: `${formattedDate} น.`,
                  color: '#8B7E6E',
                  size: 'xs'
                }
              ]
            }
          ]
        },
        {
          type: 'separator',
          color: '#C9A96E22'
        },
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#14110C',
          cornerRadius: 'md',
          paddingAll: '12px',
          borderWidth: '1px',
          borderColor: '#C9A96E33',
          contents: [
            {
              type: 'text',
              text: 'สามารถเข้าไปตรวจสอบข้อความจริงได้ในระบบหลังบ้านหรือกล่องจดหมายหลักของแอดมิน เพื่อความรวดเร็วและปลอดภัยระดับสูง',
              color: '#F5F0E8A8',
              size: 'xs',
              wrap: true,
              style: 'italic'
            }
          ]
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: 'เปิด Dashboard',
            uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`
          },
          style: 'primary',
          color: '#C9A96E'
        }
      ]
    }
  }

  await sendLineFlexMessage(
    `📥 [Hora AI] มีข้อความติดต่อใหม่จากคุณ ${name}`,
    flexContents
  )
}

/** แจ้งเตือนการอัปเกรดสมาชิกระดับพรีเมียม (Stripe Upgrade) ด้วย Flex Message หรูหรา */
export async function notifyAdminUpgrade(
  name: string,
  plan: string
): Promise<void> {
  const formattedDate = new Date().toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const flexContents = {
    type: 'bubble',
    size: 'giga',
    styles: {
      header: { backgroundColor: '#0A0806' },
      body: { backgroundColor: '#0A0806' },
      footer: { backgroundColor: '#0A0806' }
    },
    header: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: 'HORA AI — PREMIUM MEMBER',
          color: '#C9A96E',
          weight: 'bold',
          size: 'xs',
          tracking: '0.15em'
        },
        {
          type: 'text',
          text: '💎 มีการอัปเกรดแผนสมาชิกสำเร็จ!',
          color: '#F5F0E8',
          weight: 'bold',
          size: 'lg'
        }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        {
          type: 'separator',
          color: '#C9A96E22'
        },
        {
          type: 'box',
          layout: 'vertical',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#14110C',
          cornerRadius: 'md',
          paddingAll: '16px',
          borderWidth: '2px',
          borderColor: '#C9A96E',
          contents: [
            {
              type: 'text',
              text: plan.toUpperCase(),
              color: '#C9A96E',
              weight: 'bold',
              size: 'xxl',
              align: 'center'
            },
            {
              type: 'text',
              text: 'ACTIVE SUBSCRIBER',
              color: '#F5F0E8',
              size: 'xs',
              weight: 'bold',
              align: 'center',
              margin: 'sm',
              tracking: '0.1em'
            }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              width: '80px',
              contents: [
                {
                  type: 'text',
                  text: 'ชื่อผู้ใช้งาน',
                  color: '#8B7E6E',
                  size: 'sm'
                }
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: name,
                  color: '#F5F0E8',
                  size: 'sm',
                  weight: 'bold'
                }
              ]
            }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              width: '80px',
              contents: [
                {
                  type: 'text',
                  text: 'ระดับสมาชิก',
                  color: '#8B7E6E',
                  size: 'sm'
                }
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: plan === 'pro' ? 'Pro Plan (฿149/ด.)' : 'Premium Plan (฿299/ด.)',
                  color: '#C9A96E',
                  size: 'sm',
                  weight: 'bold'
                }
              ]
            }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              width: '80px',
              contents: [
                {
                  type: 'text',
                  text: 'สถานะชำระ',
                  color: '#8B7E6E',
                  size: 'sm'
                }
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: 'ชำระเงินสำเร็จ 🟢',
                  color: '#F5F0E8',
                  size: 'sm'
                }
              ]
            }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              width: '80px',
              contents: [
                {
                  type: 'text',
                  text: 'เวลาอัปเกรด',
                  color: '#8B7E6E',
                  size: 'sm'
                }
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: `${formattedDate} น.`,
                  color: '#8B7E6E',
                  size: 'xs'
                }
              ]
            }
          ]
        },
        {
          type: 'separator',
          color: '#C9A96E22'
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: 'เปิด Stripe Dashboard',
            uri: 'https://dashboard.stripe.com'
          },
          style: 'primary',
          color: '#C9A96E'
        }
      ]
    }
  }

  await sendLineFlexMessage(
    `💎 [Hora AI] ขอบพระคุณ! คุณ ${name} ได้อัปเกรดเป็นแพ็กเกจ ${plan} สำเร็จ`,
    flexContents
  )
}
