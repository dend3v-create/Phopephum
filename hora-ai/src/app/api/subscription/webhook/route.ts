import { NextResponse } from 'next/server'
import { constructWebhookEvent } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase-server'
import { notifyAdminUpgrade } from '@/lib/line-messaging'
import Stripe from 'stripe'

// POST /api/subscription/webhook
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const payload = await request.text()
    event = constructWebhookEvent(payload, signature)
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const { userId, plan } = session.metadata ?? {}
        if (!userId || !plan) break

        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_sub_id: session.subscription as string,
          plan,
          status: 'active',
        })

        await supabase.from('profiles').update({
          plan,
          ai_tokens_used: 0,
          ai_tokens_limit: plan === 'pro' ? 10 : -1,
        }).eq('id', userId)

        // แจ้ง Admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single()
        if (profile) {
          await notifyAdminUpgrade(profile.full_name, plan).catch(() => {})
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_sub_id', sub.id)

        // Downgrade to free
        const { data: userSub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_sub_id', sub.id)
          .single()
        if (userSub) {
          await supabase.from('profiles').update({
            plan: 'free',
            ai_tokens_limit: 5,
          }).eq('id', userSub.user_id)
        }
        break
      }
    }
  } catch (error) {
    console.error('[Stripe Webhook] Handler error:', error)
  }

  return NextResponse.json({ received: true })
}
