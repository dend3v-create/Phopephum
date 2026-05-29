# SKILL: build-routes

## Purpose
สร้างหรือแก้ไข Remix routes ใน `apps/web/app/routes/`
ทุก route ใช้ Remix loader/action pattern — ห้าม fetch จาก component โดยตรง

## Routes Directory
`apps/web/app/routes/`

---

## Status: ✅ Phase 1 + Phase 2 COMPLETE

### ✅ Auth Routes
| Route | Status |
|---|---|
| `_auth.tsx` | ✅ Layout — redirect if logged in |
| `_auth.login.tsx` | ✅ Login form + Supabase signInWithPassword |
| `_auth.register.tsx` | ✅ Register form + Supabase signUp |
| `logout.tsx` | ✅ Action-only signOut |

### ✅ Dashboard Routes
| Route | Status |
|---|---|
| `dashboard.tsx` | ✅ Sidebar layout + mobile top bar + user footer |
| `dashboard._index.tsx` | ✅ Overview: greeting + stats + Yam/Moon widgets + quick actions |
| `dashboard.yam.tsx` | ✅ ยามสดขณะนี้ — live clock + countdown + predictions |
| `dashboard.horoscope.tsx` | ✅ เลข 7 ตัว (Thai lunar) + Emperor Chart |
| `dashboard.reports.tsx` | ✅ Layout (Outlet only) |
| `dashboard.reports._index.tsx` | ✅ Report list + extractText + Thai labels |
| `dashboard.reports.$id.tsx` | ✅ Report detail + markdown renderer |
| `dashboard.reports.new.tsx` | ✅ 6-type radio + AI generate + upsert |
| `dashboard.planner.tsx` | ✅ TQM Planner — intention/priorities/reflection + yam context |
| `dashboard.settings.tsx` | ✅ Profile: display_name, birth_date, birth_time, birth_place |

### ✅ Public
| Route | Status |
|---|---|
| `_index.tsx` | ✅ Landing — Astral Imperial hero + 6 domains |

### 🔲 TODO
| Route | Priority |
|---|---|
| `pricing.tsx` | High — needed for Stripe |
| `about.tsx` | Low |
| `api.stripe.webhook.ts` | High — Stripe subscription |

---

## Routing Conventions (Remix flat-file)

```
dashboard.reports.tsx       → layout (must have <Outlet />)
dashboard.reports._index.tsx → /dashboard/reports (index)
dashboard.reports.$id.tsx   → /dashboard/reports/:id
dashboard.reports.new.tsx   → /dashboard/reports/new
```

**Critical rule**: If a route has children, it MUST export `<Outlet />` or children never render.

---

## Standard Loader Pattern

```ts
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env
  const user = await requireAuth(request, env)
  const { supabase } = createSupabaseClient(request, env)
  // fetch data
  return json({ data })
}
```

## Standard Action Pattern

```ts
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env
  await requireAuth(request, env)
  const formData = await request.formData()
  const parsed = SomeSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }
  // business logic
  await logEvent(request, env, EVENTS.SOME_EVENT, {})
  return json({ success: true })
}
```

## Theme Rules (Astral Imperial Flow)

```ts
// Text colors
text-[#F8F6F1]   // primary text
text-[#D9BC82]   // gold accent
text-[#94A3B8]   // muted/secondary

// Background
bg-[#020617]     // cosmic deep

// Cards: use <Card> component (glass morphism built-in)
// Buttons: use <Button> component
// Inputs: use <Input> component
```

## Analytics — Always Log

```ts
import { logEvent, EVENTS } from "~/services/analytics.server"
await logEvent(request, env, EVENTS.FEATURE_USED, { context })
```

## Stale JS Fix

หลัง typecheck ก่อน dev:
```bash
find apps/web/app -name "*.js" | xargs rm -f
```
