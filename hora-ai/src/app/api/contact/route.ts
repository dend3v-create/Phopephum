import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendContactEmail } from '@/lib/resend'
import { notifyAdminNewUser } from '@/lib/line-messaging'
import { z } from 'zod'

const ContactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  message: z.string().min(10).max(2000),
})

// POST /api/contact
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = ContactSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name, email, message } = parsed.data

    // ส่ง Email ผ่าน Resend
    await sendContactEmail(name, email, message)

    // แจ้ง Admin ผ่าน LINE (ถ้ามี token)
    try {
      await notifyAdminNewUser(name, email, 'contact_form')
    } catch { /* non-blocking */ }

    // บันทึกลง DB (optional)
    try {
      const supabase = await createServerSupabaseClient()
      await supabase.from('behavior_logs').insert({
        user_id: null,
        event_type: 'contact_form',
        event_data: { name, email },
      })
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[/api/contact]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
