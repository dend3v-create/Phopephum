import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createCheckoutSession } from '@/lib/stripe'
import { z } from 'zod'

export const runtime = 'edge'

const CreateSubSchema = z.object({
  plan: z.enum(['pro', 'premium']),
})

// POST /api/subscription/create
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = CreateSubSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const { plan } = parsed.data
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const checkoutUrl = await createCheckoutSession(
      user.id,
      user.email!,
      plan,
      `${baseUrl}/subscription?success=true`,
      `${baseUrl}/subscription?canceled=true`
    )

    return NextResponse.json({ success: true, url: checkoutUrl })
  } catch (error) {
    console.error('[/api/subscription/create]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
