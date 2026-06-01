import Stripe from "stripe";

export const PLAN_PRICES: Record<string, number> = {
  free: 0,
  basic: 59,
  pro: 259,
  imperial: 789,
};

/**
 * Stripe Service Wrapper
 */
export class StripeService {
  private stripe: Stripe;

  constructor(apiKey: string) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: "2024-12-18.acacia" as any,
      httpClient: Stripe.createFetchHttpClient(), // Required for Cloudflare Workers
    });
  }

  /**
   * Create a Checkout Session
   */
  async createCheckoutSession(params: {
    planId: string;
    amount: number;
    userId: string;
    userEmail: string;
    successUrl: string;
    cancelUrl: string;
    referralCode?: string | null;
  }) {
    console.log(`[Stripe] Creating session for User: ${params.userId}, Plan: ${params.planId}`);

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card", "promptpay"], // รองรับทั้งบัตรและ PromptPay
      line_items: [
        {
          price_data: {
            currency: "thb",
            product_data: {
              name: `PhopePhum Membership: ${params.planId.toUpperCase()}`,
              description: `ยกระดับบัญชีของคุณเป็นระดับ ${params.planId}`,
            },
            unit_amount: params.amount * 100, // Stripe uses cents/satang
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: params.userEmail,
      metadata: {
        userId: params.userId,
        planId: params.planId,
        referralCode: params.referralCode || "",
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    return session;
  }

  /**
   * Construct Webhook Event
   */
  async constructEvent(payload: string, signature: string, secret: string) {
    return await this.stripe.webhooks.constructEventAsync(payload, signature, secret);
  }
}

export function getStripeService(env: any) {
  const apiKey = env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error("Missing STRIPE_SECRET_KEY");
  return new StripeService(apiKey);
}
