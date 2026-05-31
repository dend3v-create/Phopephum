// Cloudflare Pages env — accessed via context.cloudflare.env
export interface Env {
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;

  // AI Worker
  AI_WORKER_URL: string;
  AI_WORKER_SECRET: string;

  // Stripe
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;

  // Resend
  RESEND_API_KEY: string;

  // LINE Messaging API
  LINE_CHANNEL_ACCESS_TOKEN: string;  // Channel Access Token (Long-lived)
  LINE_ADMIN_USER_ID: string;         // Admin's LINE User ID (U...)
  APP_URL: string;                    // e.g. https://phopephum-web.pages.dev

  // Cloudflare Bindings
  KV_CACHE: KVNamespace;
  R2_REPORTS: R2Bucket;

  ENVIRONMENT: "development" | "production";
}
