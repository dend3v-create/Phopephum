import Stripe from "stripe";
import { SUBSCRIPTION_PLANS, SANDS_REFILL_PACKS, resolveProductFromSku } from "../lib/plans";
import type { Env } from "~/env.server";

export const PLAN_PRICES: Record<string, number> = {
  free: 0,
  basic: SUBSCRIPTION_PLANS.basic.priceThb,
  pro: SUBSCRIPTION_PLANS.pro.priceThb,
  pro_annual: SUBSCRIPTION_PLANS.pro_annual.priceThb,
  imperial: SUBSCRIPTION_PLANS.imperial.priceThb,
};

/**
 * คำนวณค่าธรรมเนียม Stripe Gateway (+ VAT 7% ของค่าธรรมเนียม)
 * - บัตรเครดิต/เดบิต (Card): 3.65% + 10 บาท (+ VAT 7%)
 * - PromptPay QR: 1.65% (+ VAT 7%)
 */
export function calculateStripeFee(amountThb: number, paymentMethod: string = "promptpay"): {
  feeThb: number;
  feeVatThb: number;
  totalDeductionThb: number;
  netReceivedThb: number;
} {
  let fee = 0;
  const method = (paymentMethod || "").toLowerCase();

  if (method === "promptpay" || method.includes("promptpay")) {
    // PromptPay: 1.65%
    fee = Math.round((amountThb * 0.0165 + Number.EPSILON) * 100) / 100;
  } else if (method === "card" || method === "credit_card" || method.includes("card")) {
    // Card: 3.65% + 10 THB fixed fee
    fee = Math.round(((amountThb * 0.0365) + 10.0 + Number.EPSILON) * 100) / 100;
  } else {
    // Default fallback to Card standard rate
    fee = Math.round(((amountThb * 0.0365) + 10.0 + Number.EPSILON) * 100) / 100;
  }

  const feeVat = Math.round((fee * 0.07 + Number.EPSILON) * 100) / 100;
  const totalDeduction = Math.round((fee + feeVat + Number.EPSILON) * 100) / 100;
  const netReceived = Math.max(0, Math.round((amountThb - totalDeduction + Number.EPSILON) * 100) / 100);

  return {
    feeThb: fee,
    feeVatThb: feeVat,
    totalDeductionThb: totalDeduction,
    netReceivedThb: netReceived,
  };
}

/**
 * Stripe Service Wrapper (Cloudflare Workers fetch client compatible)
 */
export class StripeService {
  public stripe: Stripe;

  constructor(apiKey: string) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: "2024-12-18.acacia" as any,
      httpClient: Stripe.createFetchHttpClient(), // Required for Cloudflare Workers
    });
  }

  /**
   * Create a Checkout Session supporting Card and PromptPay
   */
  async createCheckoutSession(params: {
    planId: string;
    amount: number;
    userId: string;
    userEmail?: string;
    successUrl: string;
    cancelUrl: string;
    referralCode?: string | null;
    requestType?: string;
    itemName?: string;
  }) {
    const itemTitle = params.itemName || `PhopePhum: ${params.planId.toUpperCase()}`;
    console.log(`[Stripe] Creating session for User: ${params.userId}, Item: ${params.planId}, Amount: ฿${params.amount}`);

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card", "promptpay"],
      line_items: [
        {
          price_data: {
            currency: "thb",
            product_data: {
              name: itemTitle,
              description: `ชำระค่าบริการ ${itemTitle} — PhopePhum OS Data Science ของชีวิต`,
            },
            unit_amount: Math.round(params.amount * 100), // satang
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: params.userEmail || undefined,
      metadata: {
        userId: params.userId,
        planId: params.planId,
        planCode: params.planId,
        requestType: params.requestType || "membership",
        referralCode: params.referralCode || "",
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    return session;
  }

  /**
   * Retrieve Checkout Session
   */
  async getSession(sessionId: string) {
    return await this.stripe.checkout.sessions.retrieve(sessionId);
  }

  /**
   * Issue a Refund
   */
  async createRefund(params: {
    paymentIntentId: string;
    amountThb?: number;
    reason?: "duplicate" | "fraudulent" | "requested_by_customer";
    metadata?: Record<string, string>;
  }) {
    const payload: Stripe.RefundCreateParams = {
      payment_intent: params.paymentIntentId,
      reason: params.reason || "requested_by_customer",
      metadata: params.metadata,
    };
    if (params.amountThb && params.amountThb > 0) {
      payload.amount = Math.round(params.amountThb * 100);
    }
    return await this.stripe.refunds.create(payload);
  }

  /**
   * Construct and verify Webhook Event
   */
  async constructEvent(payload: string, signature: string, secret: string) {
    return await this.stripe.webhooks.constructEventAsync(payload, signature, secret);
  }
}

export function getStripeService(env: Env | any): StripeService {
  let apiKey = env?.STRIPE_SECRET_KEY;
  if (typeof apiKey === "string") {
    apiKey = apiKey.trim();
  }
  if (!apiKey) {
    throw new Error(
      "[StripeService] Missing STRIPE_SECRET_KEY in environment bindings. Please configure it in Cloudflare Pages."
    );
  }
  return new StripeService(apiKey);
}

