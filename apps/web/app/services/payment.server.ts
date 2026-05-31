import type { SubscriptionTier } from "@phopephum/types";

export interface GBPrimePayConfig {
  publicKey: string;
  privateKey: string;
  token: string;
  baseUrl: string;
}

export interface GBPayQRCodeRequest {
  amount: number;
  referenceNo: string;
  backgroundUrl: string;
  detail?: string;
  customerName?: string;
}

export interface GBPayQRCodeResponse {
  status: string;
  message?: string;
  qrcode?: string; // Base64 or URL
}

/**
 * GBPrimePay Service - Mock implementation for now
 */
export class GBPrimePayService {
  private config: GBPrimePayConfig;

  constructor(config: GBPrimePayConfig) {
    this.config = config;
  }

  /**
   * Create a PromptPay QR Code
   * GB API: POST /v3/qrcode
   */
  async createPromptPayQR(req: GBPayQRCodeRequest): Promise<GBPayQRCodeResponse> {
    console.log("[GBPrimePay] Creating QR Code for ref:", req.referenceNo, "Amount:", req.amount);
    
    // In real implementation:
    // const response = await fetch(`${this.config.baseUrl}/v3/qrcode`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/x-www-form-urlencoded" },
    //   body: new URLSearchParams({
    //     token: this.config.token,
    //     amount: req.amount.toString(),
    //     referenceNo: req.referenceNo,
    //     backgroundUrl: req.backgroundUrl,
    //   })
    // });
    // return response.json();

    // Mock successful response
    return {
      status: "00",
      qrcode: "MOCK_QR_CODE_BASE64_DATA",
    };
  }

  /**
   * Verify Webhook Signature
   */
  verifySignature(payload: string, signature: string): boolean {
    // GB usually uses HMAC-SHA256 or similar
    return true;
  }
}

export function getPaymentConfig(env: any): GBPrimePayConfig {
  return {
    publicKey: env.GB_PUBLIC_KEY || "mock_public",
    privateKey: env.GB_PRIVATE_KEY || "mock_private",
    token: env.GB_TOKEN || "mock_token",
    baseUrl: env.GB_BASE_URL || "https://api.gbprimepay.com",
  };
}

export const PLAN_PRICES: Record<string, number> = {
  free: 0,
  basic: 9,
  pro: 259,
  imperial: 789,
};
