// Cloudflare Pages env — accessed via context.cloudflare.env
export interface Env {
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;

  // AI Worker
  AI_WORKER_URL: string;
  AI_WORKER_SECRET: string;

  // Stripe
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;

  // Resend
  RESEND_API_KEY: string;

  // Cloudflare Bindings
  KV_CACHE: KVNamespace;
  R2_REPORTS: R2Bucket;

  ENVIRONMENT: "development" | "production";
}
