# 🏛️ PhopePhum v3 — CI/CD & Production Deployment SOP

## 1. Overview & Core Principles

> **Architecture Status:** `GREEN & LOCKED`  
> **Economic Architecture:** `PHOPEPHUM V3 ECONOMIC ARCHITECTURE v2 — FROZEN`  
> **Primary Rule:** Change → Test → Invariant Gate → Build → Deploy → Observe.  
> **Hard Stop:** Any failure in TypeScript typechecking, build integrity, or financial invariant verification halts the deployment pipeline immediately.

---

## 2. The 7-Gate CI/CD Deployment Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                 GITHUB COMMIT / PULL REQUEST                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 🛡️ GATE 1: CODE QUALITY & LINTING                            │
│ Command: pnpm lint                                          │
│ Scope: ESLint code style & formatting across monorepo       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 🛡️ GATE 2: FULL MONOREPO TYPECHECK (8 PACKAGES)              │
│ Command: pnpm typecheck                                     │
│ Scope: Strict TypeScript zero-error across all workspaces   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 🛡️ GATE 3: ENGINE CALCULATION & UNIT TESTS                  │
│ Command: pnpm test                                          │
│ Scope: Thai Lunar, Yam AtthaKarn, Hora Nu, Astro math      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 🏛️ GATE 4: FINANCIAL & ECONOMIC INVARIANTS ASSURANCE        │
│ Command: pnpm exec tsx scripts/ci-gate-financial-regression │
│ Scope: INV-01..07 (Gross/Net/VAT arithmetic, Sands balance) │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 🔨 GATE 5: PRODUCTION MONOREPO BUILD                        │
│ Command: pnpm build                                         │
│ Scope: Remix Vite SSR bundle + Client assets                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ ☁️ GATE 6: TOPOLOGICAL CLOUDFLARE DEPLOYMENT                 │
│ Order: 1. AI Proxy Worker -> 2. Pages Web App               │
│ Scope: wrangler deploy (Worker) + wrangler pages deploy     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 🏥 GATE 7: POST-DEPLOYMENT LIVE HEALTH & TELEMETRY          │
│ Command: pnpm exec tsx scripts/ci-post-deploy-verify.ts     │
│ Scope: GET /api/health (200 OK, latency < 3s, zero anomaly) │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
                    🟢 PRODUCTION LIVE & ACTIVE
```

---

## 3. GitHub Actions Secrets Configuration

To enable automated CI/CD deployments via GitHub Actions, configure the following secrets in **GitHub Repository Settings → Secrets and variables → Actions**:

| Secret Name | Description | Required Permissions / Source |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token for Pages & Workers | `Account.Cloudflare Pages:Edit`, `Account.Workers Scripts:Edit` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID | Found on Cloudflare Dashboard sidebar |
| `SUPABASE_URL` | Live Supabase Project URL | e.g. `https://zogmmylndlpcpzhjoutv.supabase.co` |
| `SUPABASE_ANON_KEY` | Public Anon JWT Key | Supabase Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY`| Service Role Secret Key (CI tests only) | Supabase Project Settings → API |
| `HEALTH_CHECK_SECRET` | Secret token for `/api/admin/metrics` | Random 32-character hex string |
| `OMISE_PUBLIC_KEY` | Omise Thailand Public Key | `pkey_live_...` or `pkey_test_...` |
| `OMISE_SECRET_KEY` | Omise Thailand Secret Key | `skey_live_...` or `skey_test_...` |
| `LINE_CHANNEL_ACCESS_TOKEN`| LINE Messaging API Channel Token | LINE Developers Console |
| `LINE_ADMIN_USER_ID` | Admin LINE User ID for alerts | LINE User ID (`U...`) |

---

## 4. Environment Separation Matrix

```
                ┌────────────────────────────────────────────────────────┐
                │                  ENVIRONMENT TIERS                     │
                └────────────────────────────────────────────────────────┘
                               /                         \
                              /                           \
                             ▼                             ▼
        ┌─────────────────────────┐          ┌─────────────────────────┐
        │   DEVELOPMENT (Local)   │          │   PREVIEW (PR Branch)   │
        │ - localhost:8080        │          │ - *.pages.dev (Cloudflare│
        │ - .dev.vars             │          │ - Mock/Sandbox Keys     │
        │ - Local Fast Iteration  │          │ - Team E2E Verification │
        └─────────────────────────┘          └─────────────────────────┘
                                                           │
                                                           ▼ (Merge to main)
                                             ┌─────────────────────────┐
                                             │  PRODUCTION (Live)      │
                                             │ - phopephum.com         │
                                             │ - Live Supabase & Omise │
                                             │ - 24/7 Health Telemetry │
                                             └─────────────────────────┘
```

---

## 5. Standard Operating Procedures: Emergency Rollback

### SOP-RB-01: Instant Cloudflare Pages Rollback
If a newly deployed web application introduces a runtime defect or degraded performance:

1. **List Recent Deployments:**
   ```bash
   bash scripts/rollback-production.sh
   ```
2. **Execute Instant Rollback to Prior Deployment ID:**
   ```bash
   bash scripts/rollback-production.sh <DEPLOYMENT_ID>
   ```
3. **Automated Gate 7 Verification:**
   The script automatically calls `ci-post-deploy-verify.ts` to confirm that the rollback is live and operational.

### SOP-RB-02: Worker Rollback
If the AI Proxy Worker requires rollback:
```bash
cd infrastructure/workers/ai-proxy
npx wrangler rollback [DEPLOYMENT_ID]
```

---

## 6. Local Pre-Flight & Manual Deploy Command

Before pushing code or running manual deployments, execute the pre-flight suite locally:

```bash
# Run full 5-gate local pre-flight
pnpm ci:verify
pnpm ci:financial-gate
pnpm build

# Deploy via deploy.sh
bash deploy.sh
```
