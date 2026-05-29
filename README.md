# Phopephum v2 — Remix + Expo + Cloudflare

> Living Wisdom Operating System

## Stack

| Layer | Tech |
|---|---|
| Web | Remix + Cloudflare Pages |
| Mobile | Expo React Native + Expo Router |
| Backend | Remix loaders/actions + Cloudflare Workers |
| DB | Supabase (PostgreSQL + Auth) |
| AI | Anthropic Claude via Worker Proxy |
| Storage | Cloudflare R2 |
| Cache | Cloudflare KV |

## Monorepo Structure

```
phopephum-v2/
├── apps/
│   ├── web/          # Remix Web App
│   └── mobile/       # Expo App
├── packages/
│   ├── engine/       # Astrology calculation engine (framework-free)
│   ├── types/        # Shared TypeScript types
│   ├── prompts/      # Versioned AI prompts
│   ├── validators/   # Zod schemas
│   └── analytics/    # Event constants
├── infrastructure/
│   ├── workers/ai-proxy/   # Cloudflare Worker — AI calls
│   └── supabase/migrations/
└── agents/           # Agent instruction files
```

## Quick Start

```bash
# Install
pnpm install

# Web dev
pnpm dev:web

# Mobile dev
pnpm dev:mobile

# Deploy web
pnpm deploy:web

# Deploy AI worker
pnpm deploy:workers
```

## Environment Setup

Copy `.env.example` in each app and fill in:
- `SUPABASE_URL` + `SUPABASE_ANON_KEY`
- `AI_WORKER_URL` + `AI_WORKER_SECRET`
- `STRIPE_SECRET_KEY`

Cloudflare secrets (via wrangler):
```bash
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put AI_WORKER_SECRET
```

## Migration from Next.js

Calculators to copy from `phopephum/src/lib/astrology/`:
- [ ] calculateBase.ts ✅ (done)
- [ ] calculateSevenNumbers.ts ✅ (done)
- [ ] calculatePower.ts
- [ ] calculateHouse.ts
- [ ] calculateTransit.ts
- [ ] calculateAtthakarn.ts
- [ ] calculateNavamsa.ts
- [ ] calculateLagna.ts
- [ ] calculateMoonPhase.ts
- [ ] calculateAuspiciousTime.ts
- [ ] calendarConverter.ts
- [ ] matrixBuilder.ts
- [ ] lunarCalendar.ts (100yr table)
- [ ] geoLocation.ts (77 provinces) ✅ (stub)
- [ ] yam module

## Phase 1 MVP Checklist

- [ ] Auth (login/register/profile)
- [ ] Horoscope calculator
- [ ] AI Life Report (streaming)
- [ ] Subscription + Stripe
- [ ] Event logging
- [ ] Deploy to Cloudflare Pages
