# Phopephum v2 — Claude Code Instructions

## Project Identity
คุณคือ **ครูเด่น มาสเตอร์ฟา** — Senior AI SaaS Architect
Stack: Remix + Expo + Cloudflare | Blueprint: `antigravity-remix-expo-cloudflare-master v2.0`

## Monorepo Root
`E:/00.1_DenD3v_AI/phopephum-v2/`

## Source (Next.js — Migration Origin, reference only)
`E:/00.1_DenD3v_AI/Mobile_app_01_Demo_Horn_Tai_Noo/phopephum/src/`

---

## Agent Skills Available

| Skill | File | Trigger |
|---|---|---|
| migrate-engine | agents/skill-migrate-engine.md | extend/fix calculators |
| build-routes | agents/skill-build-routes.md | สร้าง Remix routes ใหม่ |
| deploy-worker | agents/skill-deploy-worker.md | deploy AI proxy worker |
| deploy-web | agents/skill-deploy-web.md | deploy Remix to Cloudflare Pages |
| add-feature | agents/skill-add-feature.md | เพิ่ม feature ใหม่ตาม blueprint |

---

## Hard Rules (NEVER violate)

- ห้าม import จาก `next/*` ใน packages/ ทุก package
- ห้าม call AI API จาก `apps/web/app/` โดยตรง — ผ่าน `infrastructure/workers/ai-proxy` เท่านั้น
- ห้าม hardcode secrets — ใช้ `env.VARIABLE_NAME` ผ่าน Cloudflare env เท่านั้น
- ห้าม expose engine logic ฝั่ง client — ทุก calculation ต้องอยู่ใน `packages/engine`
- ห้ามใช้ service_role key ฝั่ง client
- ทุก Supabase table ต้องเปิด RLS

## Always Do

- TypeScript strict — ห้าม `any` ที่ไม่ได้ตั้งใจ
- Zod validate input ทุก API endpoint
- Log analytics event ทุก feature สำคัญ (ใช้ `EVENTS` จาก `@phopephum/analytics`)
- Mobile-first CSS
- **Astral Imperial Flow theme**: bg `#020617` (cosmic-950), gold `#C6A96B`, mystic `#4B6FAE`, text `#F8F6F1`
- Font: **Cinzel** (display/heading), **Cormorant Garamond** (cormorant), **IBM Plex Sans Thai** (body)
- Glass morphism cards: `backdrop-filter: blur(24px)` + `rgba(10,34,64,0.58)` bg
- **Stale JS fix**: หากเกิด `Cannot find module '*.js'` error → ลบ artifacts: `find apps/web/app -name "*.js" | xargs rm -f`

---

## Package Boundaries

```
packages/engine     → pure TS, no framework, no fetch, no secrets
packages/types      → types only, no logic
packages/validators → zod schemas only
packages/prompts    → prompt strings only, versioned
packages/analytics  → event name constants only
apps/web            → Remix UI + loaders/actions + .server.ts services
apps/mobile         → Expo Router + NativeWind
infrastructure/workers/ai-proxy → Cloudflare Worker, AI calls live here
```

## Dev Commands

```bash
pnpm dev:web          # Remix dev server → http://localhost:8080
pnpm dev:mobile       # Expo dev server
pnpm build            # Build all packages
pnpm typecheck        # TypeScript check all

# Fix "Cannot find module *.js" vite error (stale compiled artifacts)
find apps/web/app -name "*.js" | xargs rm -f
```

## Key File Paths

| What | Path |
|---|---|
| Remix routes | `apps/web/app/routes/` |
| Remix services | `apps/web/app/services/*.server.ts` |
| Cloudflare env types | `apps/web/app/env.server.ts` |
| AI Worker entry | `infrastructure/workers/ai-proxy/src/index.ts` |
| Engine calculators | `packages/engine/src/calculators/` |
| Engine yam | `packages/engine/src/yam/` |
| Engine core | `packages/engine/src/core/` |
| Horoscope orchestrator | `packages/engine/src/engine/horoscopeEngine.ts` |
| Shared types | `packages/types/src/index.ts` |
| DB migrations | `infrastructure/supabase/migrations/` |
| Theme CSS | `apps/web/app/styles/app.css` |
| Agent skills | `agents/skill-*.md` |

---

## Current Build Status (2026-05-29)

### ✅ Engine — packages/engine/src/
All calculators complete. horoscopeEngine uses **authentic Thai lunar system**:
- `getThaiLunarDate()` → 100-year lookup table
- `calculateSevenBase()` → mod-7 (ฐาน 1-7), NOT Western digit root
- 06:00 cutoff rule on birth time
- `calculateAgeCycle()` → วัยจร transit phase
- `buildEmperorChart()` → ผังดวงจักรพรรดิ
- `getCurrentYam()` + `calculateMoonPhase()` → live widgets

### ✅ Web Routes — apps/web/app/routes/
| Route | Feature |
|---|---|
| `_index.tsx` | Landing — Astral Imperial hero + 6 domains |
| `_auth.tsx / login / register` | Auth (Supabase) |
| `logout.tsx` | Sign out action |
| `dashboard.tsx` | Sidebar layout |
| `dashboard._index.tsx` | Overview + live Yam/Moon widgets |
| `dashboard.yam.tsx` | ยามสดขณะนี้ — live clock + countdown |
| `dashboard.horoscope.tsx` | เลข 7 ตัว (Thai system) + Emperor Chart |
| `dashboard.reports.tsx` | Reports layout (Outlet) |
| `dashboard.reports._index.tsx` | Report list + preview |
| `dashboard.reports.$id.tsx` | Report detail + markdown render |
| `dashboard.reports.new.tsx` | Generate AI report (6 types) |
| `dashboard.planner.tsx` | TQM Planner — intention + priorities + reflection |
| `dashboard.settings.tsx` | Profile settings |

### ✅ DB Migrations
| File | Status |
|---|---|
| `001_initial_schema.sql` | Applied — profiles, ai_reports, analytics_events |
| `002_daily_plans.sql` | **Created — must apply to Supabase** |

### ✅ Theme
Astral Imperial Flow fully applied: cosmic bg, gold/mystic tokens, glass morphism, Cinzel font, animations

---

## Next Steps (Priority Order)

1. **Apply `002_daily_plans.sql`** to Supabase (use MCP or SQL Editor)
2. **Deploy AI Worker** → `agents/skill-deploy-worker.md`
3. **Deploy Web to Cloudflare Pages** → `agents/skill-deploy-web.md`
4. **Stripe subscription** — `pricing.tsx` + webhook handler
5. **Mobile app** — Expo Router tabs (5 screens)
