# SKILL: add-feature

## Purpose
เพิ่ม feature ใหม่อย่างเป็นระบบ ตาม Phopephum blueprint
ทุก feature ต้อง: ทำงานได้ → log behavior → mobile-responsive

---

## Current Feature Status

### ✅ Phase 1 — DONE
| Feature | Route / Component |
|---|---|
| Auth (login/register) | `_auth.login.tsx`, `_auth.register.tsx` |
| Horoscope Calculator (Thai system) | `dashboard.horoscope.tsx` |
| Emperor Chart (ผังดวงจักรพรรดิ) | component in horoscope.tsx |
| AI Life Report (6 types) | `dashboard.reports.new.tsx` |
| Report viewer (markdown) | `dashboard.reports.$id.tsx` |
| Event Logging | `analytics.server.ts` |
| Dashboard overview | `dashboard._index.tsx` |
| Profile Settings | `dashboard.settings.tsx` |

### ✅ Phase 2 — DONE
| Feature | Route / Component |
|---|---|
| ยามสดขณะนี้ (live countdown) | `dashboard.yam.tsx` |
| Moon Phase Widget | in yam + dashboard._index |
| TQM Planner (daily plan) | `dashboard.planner.tsx` |
| Astral Imperial Flow theme | `styles/app.css` + `Card.tsx` |

### 🔲 Phase 3 — TODO
| Feature | Priority | Notes |
|---|---|---|
| Stripe Subscription | 🔴 High | `pricing.tsx` + `api.stripe.webhook.ts` |
| Mobile App (Expo) | 🔴 High | 5 tabs in `apps/mobile/` |
| Annual Forecast Report | 🟡 Medium | new report type |
| Push Notifications | 🟡 Medium | Expo + OneSignal |
| AI Coach (chat) | 🟢 Low | Phase 3 |
| Planetary Transit Calendar | 🟢 Low | month view |

---

## Feature Development Workflow

### Step 1: วิเคราะห์ก่อนเขียนโค้ด
- Feature นี้อยู่ใน Phase ไหน?
- ต้องการ DB table ใหม่ไหม? → สร้าง migration `00X_name.sql`
- มี shared types ที่ต้องเพิ่มไหม? → `packages/types/src/index.ts`
- ต้อง log event อะไร? → `packages/analytics/src/index.ts`

### Step 2: DB Migration (ถ้าต้องการ)
```sql
-- infrastructure/supabase/migrations/00X_feature_name.sql
create table public.feature_name (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.feature_name enable row level security;
create policy "Users manage own data"
  on public.feature_name for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Step 3: Types + Validators
```ts
// packages/types/src/index.ts
export interface NewFeatureData { ... }

// packages/validators/src/index.ts
export const NewFeatureSchema = z.object({ ... })
```

### Step 4: Engine (ถ้ามี calculation)
```ts
// packages/engine/src/calculators/calculateNewFeature.ts
export function calculateNewFeature(input: Input): Output { ... }
// เพิ่มใน calculators/index.ts
```

### Step 5: Route
```ts
// apps/web/app/routes/dashboard.new-feature.tsx
export async function loader({ request, context }: LoaderFunctionArgs) { ... }
export async function action({ request, context }: ActionFunctionArgs) { ... }
export default function NewFeaturePage() { ... }
```

### Step 6: Analytics
```ts
// packages/analytics/src/index.ts — เพิ่ม event constant
NEW_FEATURE_USED: 'new_feature_used',

// ในๆ action:
await logEvent(request, env, EVENTS.NEW_FEATURE_USED, { context })
```

### Step 7: Nav Link (ถ้าต้องการ)
เพิ่ม `<NavLink>` ใน `apps/web/app/routes/dashboard.tsx` sidebar + mobile nav

---

## DB Migration Reference

| File | Applied | Tables |
|---|---|---|
| `001_initial_schema.sql` | ✅ | profiles, ai_reports, analytics_events |
| `002_daily_plans.sql` | ⚠️ Apply to Supabase | daily_plans |

---

## Feature Complete Definition

Feature ถือว่าเสร็จเมื่อ:
- [ ] TypeScript compile ผ่าน (`pnpm typecheck`)
- [ ] Analytics event log แล้ว
- [ ] Mobile-responsive
- [ ] Supabase RLS ถูกต้อง
- [ ] Stale JS artifacts ถูกลบแล้ว
- [ ] ทดสอบ manual ผ่านแล้ว
