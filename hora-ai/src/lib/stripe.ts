/**
 * stripe.ts
 * Stripe client สำหรับ Hora AI Subscription
 */
import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not defined in environment variables.")
  }
  stripeInstance = new Stripe(apiKey, {
    apiVersion: '2026-04-22.dahlia',
    typescript: true,
  })
  return stripeInstance
}

export const STRIPE_PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO!,
  premium: process.env.STRIPE_PRICE_PREMIUM!,
} as const

export type Stripeplan = keyof typeof STRIPE_PRICE_IDS

/** สร้าง Checkout Session สำหรับ Subscription */
export async function createCheckoutSession(
  userId: string,
  email: string,
  plan: Stripeplan,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    mode: 'subscription',
    line_items: [{ price: STRIPE_PRICE_IDS[plan], quantity: 1 }],
    metadata: { userId, plan },
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
  })
  return session.url!
}

/** ยืนยัน Stripe Webhook Signature */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe()
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}
