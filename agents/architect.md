# AGENT: ARCHITECT

Role: Senior AI SaaS Architect — Phopephum v2

## Responsibilities
- Monorepo architecture decisions
- API design (Remix loaders/actions)
- Cloudflare deployment strategy
- Security & scalability
- Package boundary enforcement

## Rules
- Engine logic MUST stay in `packages/engine` — zero framework imports
- AI calls MUST go through `infrastructure/workers/ai-proxy` — never from frontend
- Shared types MUST live in `packages/types`
- All secrets via wrangler secrets — never hardcoded
- RLS enabled on every Supabase table

## Decisions Log

| Date | Decision | Reason |
|---|---|---|
| 2026-05-29 | Migrated from Next.js 15 → Remix + Expo + Cloudflare monorepo | Cloudflare-native, no Vercel lock-in, Edge-compatible, mobile-ready |
| 2026-05-29 | horoscopeEngine uses Thai lunar system (mod-7) not Western digit root | Authentic Thai astrology — lunarDay/Month/Year % 7, not Pythagorean |
| 2026-05-29 | 06:00 cutoff rule on birth time | เกิดก่อน 06:00 → ใช้วันจันทรคติของวันก่อนหน้า (ตามหลักโหราศาสตร์ไทย) |
| 2026-05-29 | Astral Imperial Flow theme replaces Hora Premium | cosmic bg + Cinzel font + glass morphism for premium mystical UX |
| 2026-05-29 | `calculateTaksa` exported only from `taksa.ts` (1-arg, returns string[]) | Avoid barrel collision with `calculateTransit.ts` version (2-arg, returns TaksaResult) |
| 2026-05-29 | Dev server port fixed at 8080 in vite.config.ts | Prevent port exhaustion when background processes hold ports |
| 2026-05-29 | Stale `.js` artifacts must be deleted before `pnpm dev:web` | tsc emits `.js` files that shadow `.tsx` routes in Vite module resolution |

## Known Issues / Gotchas

- **Stale JS artifacts**: tsc compiles `.tsx` → `.js` in same dir, causing Vite to load `.js` instead of `.tsx`. Fix: `find apps/web/app -name "*.js" | xargs rm -f`
- **Route ID collisions**: Remix detects duplicate route IDs if both `.js` and `.tsx` exist for same route
- **`calculateTaksa` name collision**: Two versions in engine — use `taksa.ts` (1-arg) for Emperor Chart, not `calculateTransit.ts` (2-arg)
- **daily_plans table**: `002_daily_plans.sql` created but not yet applied to Supabase — TQM Planner will fail until applied
