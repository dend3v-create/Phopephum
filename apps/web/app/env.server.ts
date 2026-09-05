// Cloudflare Pages env — accessed via context.cloudflare.env
export interface Env {
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;

  // AI Worker
  AI_WORKER_URL: string;
  AI_WORKER_SECRET: string;

  // Stripe (Legacy / Alternative)
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;

  // Omise (Primary Thailand Gateway)
  OMISE_PUBLIC_KEY?: string;
  OMISE_SECRET_KEY?: string;
  OMISE_WEBHOOK_SECRET?: string;

  // Business Tax Configuration
  // INVOICE_VAT_RATE: Business Invoice VAT applied to subscription revenue (e.g. "0.07" for 7%)
  // NOTE: This is SEPARATE from Omise Gateway VAT (which is a cost-of-revenue fee on gateway charges).
  //       Do NOT confuse with partner WHT/CIT which come from tax_rules table (never hardcoded).
  INVOICE_VAT_RATE?: string;

  // Resend
  RESEND_API_KEY: string;

  // LINE Messaging API
  LINE_CHANNEL_ACCESS_TOKEN: string;  // Channel Access Token (Long-lived)
  LINE_ADMIN_USER_ID: string;         // Admin's LINE User ID (U...)
  APP_URL: string;                    // e.g. https://phopephum-web.pages.dev
  HEALTH_CHECK_SECRET?: string;       // Optional secret for /api/health external monitors
  CRON_SECRET?: string;               // Optional secret for /api/cron/* scheduled jobs

  // Cloudflare Bindings
  KV_CACHE: KVNamespace;
  R2_REPORTS: R2Bucket;

  ENVIRONMENT: "development" | "production";
}
