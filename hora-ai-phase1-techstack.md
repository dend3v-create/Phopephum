# Hora AI — Phase 1 Web App MVP
## Tech Stack + Folder Structure (8-Stack มาตรฐานครูเด่น)

---

## Stack Overview

```
Stack #  Service                   บทบาท                         ไฟล์หลัก
─────────────────────────────────────────────────────────────────────────────
①       Next.js 15 (App Router)   Full-stack Web App             src/app/
②       TypeScript (Strict)       Type Safety ทุก Layer          src/types/
③       Tailwind CSS + shadcn/ui  Design System (Dark Premium)   tailwind.config.ts
④       Supabase                  DB + Auth + RLS + Realtime      src/lib/supabase*.ts
⑤       Cloudflare R2             PDF Report Storage              src/lib/r2.ts
⑥       Cloudflare Pages          Hosting + CDN + Edge            next.config.ts
⑦       Resend                    Email (Welcome, Report, Alert)  src/lib/resend.ts
⑧       LINE Notify + CF Workers  Push + AI Proxy (Claude)        workers/
         + Anthropic Claude        AI Report Generation            src/lib/claude.ts
```

---

## Folder Structure (สมบูรณ์)

```
hora-ai/
│
├── src/
│   ├── app/                              ← Next.js App Router
│   │   ├── layout.tsx                    ← Root layout (fonts, metadata, providers)
│   │   ├── globals.css                   ← Design tokens (--hora-gold, --hora-dark)
│   │   ├── page.tsx                      ← Landing page (SSG)
│   │   ├── middleware.ts                 ← Auth guard (Supabase SSR)
│   │   │
│   │   ├── (auth)/                       ← Auth route group
│   │   │   ├── login/page.tsx            ← Login (Email + Google)
│   │   │   ├── register/page.tsx         ← สมัครสมาชิก + กรอกวันเกิด
│   │   │   ├── onboarding/page.tsx       ← Welcome flow (ชื่อ/เกิด/เพศ/จังหวัด)
│   │   │   └── callback/route.ts         ← Supabase OAuth callback
│   │   │
│   │   ├── (app)/                        ← App route group (auth required)
│   │   │   ├── dashboard/page.tsx        ← หน้าหลัก: สรุปดวงวันนี้ + จร
│   │   │   ├── calculator/
│   │   │   │   ├── page.tsx              ← เลือกวัน/เวลาคำนวณ
│   │   │   │   └── result/page.tsx       ← ผลลัพธ์ยาม + โหรทายหนู
│   │   │   ├── chart/
│   │   │   │   ├── page.tsx              ← จักรกำเนิด + ดวงชะตา
│   │   │   │   └── transit/page.tsx      ← วัยจร/ปีจร/เดือนจร/วันจร
│   │   │   ├── report/
│   │   │   │   ├── page.tsx              ← AI Life Report 1 เพจ
│   │   │   │   └── [id]/page.tsx         ← ดู Report ที่บันทึกไว้
│   │   │   ├── profile/page.tsx          ← แก้ไขข้อมูลส่วนตัว + ดวงชะตา
│   │   │   └── subscription/page.tsx     ← จัดการ Plan / Upgrade
│   │   │
│   │   ├── (admin)/                      ← Admin route group
│   │   │   └── admin/
│   │   │       ├── page.tsx              ← Dashboard (users, MRR, logs)
│   │   │       ├── users/page.tsx        ← จัดการ Users
│   │   │       └── logs/page.tsx         ← User Behavior Logs
│   │   │
│   │   └── api/                          ← Route Handlers
│   │       ├── calculate/
│   │       │   ├── hora/route.ts         ← POST: ยามอัฐกาล engine
│   │       │   ├── chart/route.ts        ← POST: จักรกำเนิด + เลข 7 ตัว 9 ฐาน
│   │       │   └── transit/route.ts      ← POST: ระบบจร (วัย/ปี/เดือน/วัน)
│   │       ├── ai/
│   │       │   └── report/route.ts       ← POST: Generate AI Report → Claude
│   │       ├── subscription/
│   │       │   ├── create/route.ts       ← POST: สร้าง subscription
│   │       │   └── webhook/route.ts      ← Stripe webhook
│   │       ├── report/
│   │       │   └── export/route.ts       ← POST: Export PDF → R2
│   │       ├── upload/route.ts           ← POST: R2 presigned URL
│   │       ├── notify/route.ts           ← POST: LINE Notify
│   │       └── contact/route.ts          ← POST: Contact → Resend + LINE
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx                ← Top nav (logo, menu, user avatar)
│   │   │   ├── Sidebar.tsx               ← App sidebar (desktop)
│   │   │   ├── BottomNav.tsx             ← Mobile bottom nav
│   │   │   └── Footer.tsx                ← Footer (landing only)
│   │   │
│   │   ├── ui/                           ← shadcn/ui components (customized)
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── Toast.tsx
│   │   │
│   │   ├── hora/                         ← Core Hora feature components
│   │   │   ├── HoraWheel.tsx             ← วงล้อยาม (interactive SVG)
│   │   │   ├── PlanetGrid.tsx            ← ตารางดาว 7 ตัว 9 ฐาน
│   │   │   ├── TransitTimeline.tsx       ← Timeline วัยจร/ปีจร
│   │   │   ├── DaySelector.tsx           ← เลือกวัน/เวลา + ยามปัจจุบัน
│   │   │   └── ResultCard.tsx            ← แสดงผลยาม + คำอธิบาย AI
│   │   │
│   │   ├── report/                       ← AI Report components
│   │   │   ├── ReportPage.tsx            ← Layout 1 เพจ (printable)
│   │   │   ├── ReportSection.tsx         ← แต่ละ section ของ Report
│   │   │   ├── TQMPlanner.tsx            ← ตาราง MON-SUN TQM
│   │   │   └── AffirmationCard.tsx       ← Affirmation ประจำตัว
│   │   │
│   │   ├── subscription/
│   │   │   ├── PricingCard.tsx           ← Free/Pro/Premium card
│   │   │   └── PaymentForm.tsx           ← Stripe payment form
│   │   │
│   │   └── landing/                      ← Landing page sections
│   │       ├── Hero.tsx
│   │       ├── Features.tsx
│   │       ├── HowItWorks.tsx
│   │       ├── Testimonials.tsx
│   │       └── CTA.tsx
│   │
│   ├── lib/
│   │   ├── supabase.ts                   ← Browser client
│   │   ├── supabase-server.ts            ← Server client + Service role
│   │   ├── claude.ts                     ← Anthropic Claude API (via Workers)
│   │   ├── r2.ts                         ← Cloudflare R2 (PDF storage)
│   │   ├── resend.ts                     ← Email templates
│   │   ├── line-notify.ts                ← LINE push
│   │   ├── stripe.ts                     ← Stripe subscription
│   │   └── analytics.ts                  ← User behavior logging
│   │
│   ├── engine/                           ← 🔐 Core Algorithm (IP เฉพาะ)
│   │   ├── hora-calculator.ts            ← ยามอัฐกาล engine
│   │   ├── chart-calculator.ts           ← จักรกำเนิด + 9 ฐาน
│   │   ├── transit-calculator.ts         ← วัยจร/ปีจร/เดือนจร/วันจร
│   │   ├── seven-numbers.ts              ← เลข 7 ตัว 9 ฐาน (Core IP)
│   │   └── hora-utils.ts                 ← Thai calendar + planet helpers
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                    ← Auth state + user profile
│   │   ├── useHoraCalculator.ts          ← Calculator state + results
│   │   ├── useSubscription.ts            ← Subscription status + limits
│   │   └── useReport.ts                  ← Report generation state
│   │
│   ├── types/
│   │   ├── index.ts                      ← All domain types
│   │   ├── hora.ts                       ← HoraResult, Planet, Transit types
│   │   ├── user.ts                       ← UserProfile, BirthData types
│   │   ├── report.ts                     ← AIReport, TQMData types
│   │   └── subscription.ts               ← Plan, Tier, Quota types
│   │
│   └── constants/
│       ├── planets.ts                    ← ดาว 7 ดวง + properties
│       ├── houses.ts                     ← ภพ 12 ภพ + ความหมาย
│       ├── subscription-tiers.ts         ← Free/Pro/Premium limits
│       └── ai-prompts.ts                 ← Prompt templates (โหราศาสตร์ไทย)
│
├── workers/
│   └── proxy.ts                          ← CF Workers: Claude API proxy
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_users.sql                 ← users + profiles table
│   │   ├── 002_calculations.sql          ← calculation history
│   │   ├── 003_reports.sql               ← AI reports
│   │   ├── 004_subscriptions.sql         ← subscription plans
│   │   └── 005_behavior_logs.sql         ← user behavior tracking
│   └── seed.sql                          ← Initial data (subscription tiers)
│
├── public/
│   ├── fonts/                            ← Sarabun (Thai), Inter
│   └── icons/                            ← App icons, planet symbols
│
├── .env.local                            ← Environment variables (local)
├── .env.production                       ← Production env (Cloudflare)
├── next.config.ts                        ← Next.js + Cloudflare Pages config
├── tailwind.config.ts                    ← Design system config
├── wrangler.toml                         ← CF Workers config
└── package.json
```

---

## Supabase Schema (Phase 1)

```sql
-- 1. users (extend Supabase Auth)
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name     TEXT NOT NULL,
  birth_date    DATE NOT NULL,           -- วันเกิด
  birth_time    TIME,                    -- เวลาเกิด
  birth_province TEXT,                  -- จังหวัดเกิด
  gender        TEXT CHECK (gender IN ('male','female','other')),
  plan          TEXT DEFAULT 'free' CHECK (plan IN ('free','pro','premium')),
  plan_expires_at TIMESTAMPTZ,
  ai_tokens_used INTEGER DEFAULT 0,     -- quota tracking
  ai_tokens_limit INTEGER DEFAULT 5,    -- free=5, pro=50, premium=unlimited
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. calculations (history)
CREATE TABLE calculations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  calc_type     TEXT CHECK (calc_type IN ('hora','chart','transit')),
  input_data    JSONB NOT NULL,          -- วัน/เวลาที่คำนวณ
  result_data   JSONB NOT NULL,          -- ผลลัพธ์เต็ม
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ai_reports
CREATE TABLE ai_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  report_type   TEXT DEFAULT 'life_report',
  content       JSONB NOT NULL,          -- report sections
  pdf_url       TEXT,                    -- R2 URL
  tokens_used   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. subscriptions
CREATE TABLE subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_sub_id TEXT UNIQUE,
  plan          TEXT NOT NULL,
  status        TEXT DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 5. behavior_logs (User Behavior Tracking → Feature Roadmap)
CREATE TABLE behavior_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,           -- 'page_view','calc_run','ai_ask','report_gen'
  event_data    JSONB,                   -- { page, feature, question, duration }
  session_id    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_logs   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own data" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users own calculations" ON calculations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own reports" ON ai_reports
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own subs" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users own logs" ON behavior_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## Subscription Tiers

```typescript
// src/constants/subscription-tiers.ts
export const TIERS = {
  free: {
    name: 'ฟรี',
    price: 0,
    aiReportsPerMonth: 1,
    calculationsPerDay: 5,
    transitAccess: false,      // วัยจร/ปีจร
    sevenNumbersAccess: false, // เลข 7 ตัว 9 ฐาน
    pdfExport: false,
    features: ['ยามอัฐกาล 5 ครั้ง/วัน', 'จักรกำเนิดพื้นฐาน', 'AI Report 1 ครั้ง/เดือน'],
  },
  pro: {
    name: 'Pro',
    price: 149, // ฿/เดือน
    aiReportsPerMonth: 10,
    calculationsPerDay: -1,    // unlimited
    transitAccess: true,
    sevenNumbersAccess: false,
    pdfExport: true,
    features: ['ยามอัฐกาลไม่จำกัด', 'ระบบจรครบ', 'AI Report 10 ครั้ง/เดือน', 'Export PDF'],
  },
  premium: {
    name: 'Premium',
    price: 299, // ฿/เดือน
    aiReportsPerMonth: -1,     // unlimited
    calculationsPerDay: -1,
    transitAccess: true,
    sevenNumbersAccess: true,  // เลข 7 ตัว 9 ฐาน (Unique IP)
    pdfExport: true,
    features: ['ทุก Feature ไม่จำกัด', 'เลข 7 ตัว 9 ฐาน', 'AI Report ไม่จำกัด', 'Priority Support'],
  },
} as const;
```

---

## Environment Variables

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Anthropic Claude (via CF Workers)
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_AI_WORKER_URL=https://hora-ai-proxy.workers.dev

# Cloudflare R2
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=hora-reports
R2_PUBLIC_URL=https://cdn.hora-ai.com

# Resend
RESEND_API_KEY=re_...
RESEND_FROM=noreply@hora-ai.com

# LINE Notify
LINE_NOTIFY_TOKEN=...
LINE_ADMIN_TOKEN=...   # แจ้ง Admin เมื่อมี user ใหม่

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Setup Commands (เริ่มต้น)

```bash
# 1. สร้าง Project
npx create-next-app@latest hora-ai \
  --typescript --tailwind --app --src-dir --import-alias "@/*"

cd hora-ai

# 2. Install dependencies
npm install @supabase/ssr @supabase/supabase-js
npm install @anthropic-ai/sdk
npm install stripe @stripe/stripe-js
npm install resend
npm install @radix-ui/react-* class-variance-authority clsx tailwind-merge
npm install lucide-react
npm install react-hook-form zod @hookform/resolvers
npm install date-fns          # Thai date utilities
npm install jspdf html2canvas  # PDF export

# 3. shadcn/ui init
npx shadcn@latest init

# 4. Supabase
npm install supabase --save-dev
npx supabase init
npx supabase link --project-ref YOUR_REF
npx supabase db push

# 5. Cloudflare Workers
npm install -g wrangler
wrangler login
wrangler init workers/proxy

# 6. Deploy
npx wrangler deploy        # Workers first
# Then connect GitHub → Cloudflare Pages Dashboard
```

---

## Behavior Log Helper (User Tracking)

```typescript
// src/lib/analytics.ts
import { createClient } from '@/lib/supabase'

export type EventType = 
  | 'page_view'
  | 'calc_hora'        // คำนวณยาม
  | 'calc_chart'       // ดูดวงชะตา
  | 'calc_transit'     // ดูจร
  | 'ai_report_gen'    // สร้าง AI Report
  | 'ai_question'      // ถาม AI (จะมี Phase 2)
  | 'pdf_export'       // Export PDF
  | 'upgrade_click'    // คลิก Upgrade
  | 'feature_blocked'  // ถูก Block เพราะ Plan ไม่พอ

export async function logEvent(
  eventType: EventType,
  eventData?: Record<string, unknown>
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('behavior_logs').insert({
    user_id: user.id,
    event_type: eventType,
    event_data: eventData,
    session_id: getSessionId(),
  })
}

// ใช้ตอน feature blocked → บอก product team ว่า user อยาก upgrade
export async function logFeatureBlocked(feature: string) {
  await logEvent('feature_blocked', { feature, timestamp: Date.now() })
}
```

---

## Key Design Tokens (Hora AI Brand)

```css
/* src/app/globals.css */
:root {
  --hora-gold: #C9A96E;
  --hora-gold-light: #E8D5A3;
  --hora-dark: #0A0806;
  --hora-dark-card: #12100E;
  --hora-dark-border: rgba(201, 169, 110, 0.2);
  --hora-text: #F5F0E8;
  --hora-text-muted: #8B7E6E;
}

.glass-hora {
  background: rgba(18, 16, 14, 0.8);
  border: 1px solid var(--hora-dark-border);
  backdrop-filter: blur(12px);
}

.btn-hora {
  background: var(--hora-gold);
  color: var(--hora-dark);
  font-weight: 600;
  border-radius: 8px;
  transition: opacity 0.2s;
}

.btn-hora:hover { opacity: 0.9; }
```

