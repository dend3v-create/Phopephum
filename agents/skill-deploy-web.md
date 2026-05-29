# SKILL: deploy-web

## Purpose
Deploy Remix Web App → Cloudflare Pages

## App Directory
`apps/web/`

---

## Pre-Deploy Checklist

### 1. Apply Supabase Migrations
```sql
-- ใน Supabase Dashboard → SQL Editor หรือ Supabase MCP

-- 001_initial_schema.sql (ถ้ายังไม่ได้ apply)
-- 002_daily_plans.sql ← MUST APPLY (TQM Planner)
```

### 2. KV Namespace for web app
```bash
cd apps/web
wrangler kv:namespace create "KV_CACHE"
wrangler kv:namespace create "KV_CACHE" --preview
# แก้ wrangler.toml ใส่ IDs ที่ได้
```

### 3. R2 Bucket for reports/PDFs
```bash
wrangler r2 bucket create phopephum-reports
# wrangler.toml มี binding R2_REPORTS อยู่แล้ว
```

### 4. Cloudflare Pages — Environment Variables
Set ใน Cloudflare Dashboard → Pages → phopephum-web → Settings → Environment variables:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJxxx...` |
| `AI_WORKER_URL` | `https://phopephum-ai-proxy.xxx.workers.dev` |
| `AI_WORKER_SECRET` | [same as worker secret] |
| `STRIPE_SECRET_KEY` | `sk_live_xxx` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxx` |
| `RESEND_API_KEY` | `re_xxx` |
| `ENVIRONMENT` | `production` |

---

## Deploy Steps

```bash
cd E:/00.1_DenD3v_AI/phopephum-v2

# 1. Clean stale JS artifacts (critical!)
find apps/web/app -name "*.js" | xargs rm -f

# 2. TypeScript check
pnpm --filter @phopephum/web typecheck

# 3. Build
pnpm --filter @phopephum/web build

# 4. Deploy to Cloudflare Pages
pnpm --filter @phopephum/web deploy
```

---

## First Time Setup (GitHub → Cloudflare Pages CI)

```bash
# 1. Init git
cd E:/00.1_DenD3v_AI/phopephum-v2
git init
git add .
git commit -m "feat: phopephum v2 — Remix + Cloudflare"

# 2. Push to GitHub
gh repo create phopephum-v2 --private
git push -u origin main

# 3. Connect Cloudflare Pages to GitHub
# Dashboard → Pages → Create project → Connect Git
# Build command: pnpm --filter @phopephum/web build
# Build output: apps/web/build/client
# Root directory: /
# Node version: 20
```

---

## Post-Deploy Verification Checklist

- [ ] Landing page (`/`) loads with Astral Imperial theme
- [ ] `/login` → form renders
- [ ] `/register` → creates account in Supabase
- [ ] `/dashboard` → redirect if not logged in
- [ ] `/dashboard/yam` → shows live yam + countdown
- [ ] `/dashboard/horoscope` → calculate with Thai lunar dates
- [ ] `/dashboard/reports/new` → AI report generates
- [ ] `/dashboard/planner` → saves daily plan to Supabase
- [ ] Analytics events appear in `analytics_events` table
