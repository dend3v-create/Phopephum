---
name: kru-den-mobile-app-dev
description: >
  ครูเด่น มาสเตอร์ฟา — Framework พัฒนา Mobile Application (iOS + Android) สำหรับลูกค้าที่ต้องการต่อยอดจาก Web App สู่แอปพลิเคชันบน Play Store และ App Store อย่างเป็นระบบ

  ใช้ทักษะนี้ทุกครั้งที่ต้องการ:
  - วิเคราะห์ความพร้อมของ Web App เพื่อ Convert เป็น Mobile App
  - ออกแบบ Mobile App Architecture (React Native + Expo)
  - วางแผน Phase และประมาณการต้นทุนสำหรับลูกค้า
  - สร้างใบเสนอราคา Mobile App Development
  - วางแผนส่ง App ขึ้น Google Play Store และ Apple App Store
  - ออกแบบ Subscription + In-App Purchase System
  - วางแผน AI Integration สำหรับ Mobile (Anthropic + Gemini)

  Stack มาตรฐาน: React Native + Expo EAS + Supabase + Cloudflare + Anthropic API + Gemini API

  Trigger: "พัฒนาแอพ", "สร้าง mobile app", "ต่อยอดเป็นแอพ", "ขึ้น Play Store", "ขึ้น App Store",
  "iOS Android", "React Native", "Expo", "แอพพลิเคชัน", "mobile application", "web to app",
  "แอปมือถือ", "ใบเสนอราคาแอพ", "ราคาพัฒนาแอพ", "subscription app", "in-app purchase",
  หรือเมื่อลูกค้ามี Web App อยู่แล้วและต้องการขยายไปสู่ Mobile Platform

  ใช้ร่วมกับ: kru-den-webdev (Web App Foundation) → kru-den-mobile-app-dev (Mobile Extension)
  → kru-den-closing (ปิดการขาย) → kru-den-onboarding (เก็บข้อมูลเริ่มโปรเจกต์)
---

# 📱 KruDen Mobile App Dev Framework
## "เปลี่ยน Web App เป็น Mobile App — ด้วย Codebase เดียวกัน"

---

## ภาพรวม Framework

```
Web App ที่มีอยู่แล้ว (Next.js + Supabase)
           ↓
[STEP 1] วิเคราะห์ Web App + Mobile Readiness
           ↓
[STEP 2] เลือก Mobile Strategy + Architecture
           ↓
[STEP 3] สร้าง Project Structure (Monorepo)
           ↓
[STEP 4] วาง Phase Plan + ใบเสนอราคา
           ↓
[STEP 5] Store Submission Plan (iOS + Android)
           ↓
[STEP 6] Monetization Design (IAP + Subscription)
           ↓
[STEP 7] Launch & Monitor Plan
```

**Mobile Stack มาตรฐาน (ทุกโปรเจกต์):**
```
Frontend Mobile:  React Native + Expo SDK 52+ (TypeScript)
Navigation:       Expo Router (File-based, เหมือน Next.js)
Build & Deploy:   Expo EAS (Build + Submit + Update)
Backend:          Next.js API Routes (ใช้ร่วมกับ Web)
Database:         Supabase (PostgreSQL + Auth + Realtime)
Hosting:          Cloudflare Pages + Workers + KV
AI (Chat):        Anthropic Claude API (claude-sonnet-4)
AI (Structured):  Google Gemini API (gemini-2.0-flash)
Payments:         RevenueCat SDK (IAP iOS + Android)
Push Notify:      Expo Notifications + Supabase Edge Functions
Monitoring:       Sentry + Firebase Crashlytics
```

---

## STEP 1 — วิเคราะห์ Web App + Mobile Readiness

อ่าน `references/01-readiness-analysis.md` เพื่อ Checklist ประเมินความพร้อม

**ข้อมูลที่ต้องได้ก่อนเริ่ม:**
- Web App ที่มีอยู่ใช้ Stack อะไร? (Next.js / Other)
- มี API Layer แยกออกมาหรือยัง?
- กลุ่มผู้ใช้หลักใช้มือถือ % เท่าไร?
- Feature หลักที่ต้องการบน Mobile (ทั้งหมด / บางส่วน)
- ต้องการ Offline Support หรือไม่?
- ระบบ Auth ปัจจุบันใช้อะไร?
- มี Subscription/Payment อยู่แล้วหรือยัง?

**Mobile Readiness Score:**

| ปัจจัย | ได้คะแนน | คำอธิบาย |
|---|---|---|
| มี REST/GraphQL API แยก | +20 | ต่อ Mobile ได้ทันที |
| ใช้ Supabase แล้ว | +15 | Auth + DB ใช้ร่วมได้ |
| TypeScript ทั้งหมด | +10 | Share Types ได้ |
| UI Components แยก | +10 | บาง Component ใช้ร่วมได้ |
| มี Auth System | +15 | ลด Dev Time |
| มี Mobile Traffic >50% | +20 | Demand ชัดเจน |
| **รวมสูงสุด** | **90** | |

- **70–90 คะแนน** → พร้อมมาก ใช้ Monorepo แชร์ Code ได้เยอะ
- **40–69 คะแนน** → พร้อมปานกลาง ต้อง Refactor บางส่วน
- **0–39 คะแนน** → ต้องสร้าง API Layer ใหม่ก่อน

---

## STEP 2 — เลือก Mobile Strategy

อ่าน `references/02-mobile-strategy.md` เพื่อ Decision Matrix เต็ม

**3 Strategy หลัก:**

```
A. MONOREPO FULL-SHARE (แนะนำถ้า Web เป็น Next.js)
   └── packages/
       ├── shared/     ← Types, Utils, API Calls, Constants
       ├── web/        ← Next.js (ที่มีอยู่แล้ว)
       └── mobile/     ← Expo React Native (ใหม่)
   ✅ ประหยัดสูงสุด, ลด Bug, Update พร้อมกัน
   ⚠️ Setup ซับซ้อนกว่า

B. SEPARATE REPO + SHARED API
   ├── web-repo/       ← Next.js เดิม
   └── mobile-repo/    ← Expo ใหม่ เรียก API เดียวกัน
   ✅ Simple, ง่ายต่อการจัดการทีม
   ⚠️ Duplicate บาง Logic

C. EXPO + NEXT.JS UNIVERSAL (ขั้นสูง)
   └── ใช้ Solito library เขียน Component เดียว
       รัน Web + Mobile ได้พร้อมกัน
   ✅ Maximum Code Share
   ⚠️ Learning Curve สูง, ยังใหม่
```

**เลือกตาม Business Type:**

| Business Type | Strategy | เหตุผล |
|---|---|---|
| Startup / MVP | B (Separate) | เร็ว, ยืดหยุ่น |
| SaaS / Platform | A (Monorepo) | Scale ได้, Consistent |
| Commerce / Market | A (Monorepo) | Shared Catalog/Cart |
| AI App / Tool | B (Separate) | API Heavy, Simple |
| Content / Media | C (Universal) | UI ต้องเหมือนกันมาก |

---

## STEP 3 — Project Structure (Monorepo Standard)

อ่าน `references/03-project-structure.md` เพื่อ Full Boilerplate + Setup Commands

**Monorepo Structure มาตรฐาน:**
```
[project-name]/
├── apps/
│   ├── web/                    ← Next.js (ที่มีอยู่แล้ว หรือสร้างใหม่)
│   │   ├── app/                (App Router)
│   │   ├── components/
│   │   └── package.json
│   └── mobile/                 ← Expo React Native (ใหม่)
│       ├── app/                (Expo Router - File-based)
│       │   ├── (tabs)/
│       │   │   ├── index.tsx   (Home Tab)
│       │   │   ├── calculator.tsx
│       │   │   ├── history.tsx
│       │   │   ├── ai-chat.tsx
│       │   │   └── profile.tsx
│       │   ├── auth/
│       │   │   ├── login.tsx
│       │   │   ├── register.tsx
│       │   │   └── onboarding.tsx
│       │   ├── _layout.tsx     (Root Layout)
│       │   └── +not-found.tsx
│       ├── components/
│       │   ├── ui/             (Button, Card, Input — Mobile-optimized)
│       │   ├── shared/         (บาง Component ใช้ทั้ง Web+Mobile)
│       │   └── [feature]/
│       ├── hooks/              (useAuth, useSupabase, useAI)
│       ├── lib/
│       │   ├── supabase.ts
│       │   ├── anthropic.ts    (API calls)
│       │   ├── gemini.ts
│       │   └── revenue-cat.ts
│       ├── assets/             (images, fonts, icons)
│       ├── app.json            (Expo Config)
│       ├── eas.json            (EAS Build Config)
│       └── package.json
├── packages/
│   └── shared/                 ← Shared Types + Utils + Constants
│       ├── types/
│       │   ├── user.ts
│       │   ├── subscription.ts
│       │   └── [domain].ts
│       ├── utils/
│       │   ├── date.ts
│       │   ├── calculation.ts  (Core Business Logic)
│       │   └── format.ts
│       └── constants/
│           ├── api.ts          (API Endpoints)
│           └── config.ts       (App Config)
├── supabase/
│   ├── migrations/             (DB Schema)
│   └── functions/              (Edge Functions)
├── package.json                (Root — Workspaces)
└── turbo.json                  (Turborepo Config)
```

**Key Setup Commands:**
```bash
# 1. Init Monorepo
npx create-turbo@latest [project-name]

# 2. Add Expo Mobile App
cd apps && npx create-expo-app mobile --template

# 3. Setup EAS
cd apps/mobile && npx eas-cli@latest init
npx eas build:configure

# 4. Setup Supabase
npx supabase init
npx supabase link --project-ref [YOUR_REF]

# 5. Install RevenueCat
npx expo install react-native-purchases
```

---

## STEP 4 — Phase Plan + ใบเสนอราคา

อ่าน `references/04-pricing-phases.md` เพื่อ Pricing Framework ครบถ้วน

**Phase Structure มาตรฐาน:**

| Phase | ชื่อ | ระยะเวลา | ราคาเริ่มต้น |
|---|---|---|---|
| 1 | Foundation (Setup + Auth + Core UI) | 3 สัปดาห์ | ฿30,000–50,000 |
| 2 | Core Features (Business Logic + API) | 4 สัปดาห์ | ฿40,000–65,000 |
| 3 | AI Integration (Anthropic + Gemini) | 3 สัปดาห์ | ฿25,000–45,000 |
| 4 | Payment (IAP + RevenueCat) | 2 สัปดาห์ | ฿20,000–35,000 |
| 5 | Submit + Launch (Testing + Store) | 2 สัปดาห์ | ฿15,000–25,000 |
| **รวม** | **iOS + Android + Web** | **~14 สัปดาห์** | **฿130,000–220,000** |

**ปัจจัยที่ปรับราคา:**
```
+ AI Features ซับซ้อน        → +฿15,000–30,000
+ Offline Mode เต็มรูปแบบ   → +฿10,000–20,000
+ Push Notification ระบบ     → +฿8,000–15,000
+ Community/Feed Feature      → +฿20,000–40,000
+ Admin Dashboard (Mobile)    → +฿10,000–20,000
+ Multi-language (EN+TH)      → +฿5,000–10,000
```

---

## STEP 5 — Store Submission Plan

อ่าน `references/05-store-submission.md` เพื่อ Checklist + Timeline ครบถ้วน

**Apple App Store Prerequisites:**
```
□ Apple Developer Account ($99/ปี ≈ ฿3,500)
□ Apple Sign-In Integration (บังคับถ้ามี Social Login อื่น)
□ In-App Purchase (บังคับถ้ามี Subscription)
□ Privacy Policy URL
□ App Screenshots: iPhone 6.9", 6.5", iPad 12.9"
□ App Preview Video (optional แต่ช่วย Conversion)
□ Age Rating + Content Declarations
□ App Review Information (Test Account)
```

**Google Play Store Prerequisites:**
```
□ Google Play Console ($25 ครั้งเดียว ≈ ฿875)
□ Feature Graphic 1024×500px
□ Screenshots: Phone + 7" Tablet + 10" Tablet
□ Privacy Policy URL
□ Data Safety Form
□ Target API Level (Android 14+)
□ App Signing (Google Play App Signing)
```

**Rejection Reasons ที่พบบ่อย + วิธีแก้:**
```
iOS:
- Missing Apple Sign-In → เพิ่ม apple-sign-in ก่อน Submit
- IAP Outside App → ลบ link ชำระเงินนอกแอป
- Guideline 4.3 (Spam) → ต้องมี Unique Value ชัดเจน
- Crashes on Review → ทดสอบบน Physical Device ก่อน

Android:
- Target API ต่ำเกินไป → ต้องใช้ targetSdkVersion 34+
- Permission ไม่จำเป็น → ลบ Permission ที่ไม่ได้ใช้ออก
- Policy Violation → ตรวจ Data Safety Form ให้ครบ
```

---

## STEP 6 — Monetization Design

อ่าน `references/06-monetization.md` เพื่อ Revenue Model Templates

**Subscription Tier Framework:**
```
FREE (ดึงดูดผู้ใช้)
├── Feature หลัก 3–5 อย่าง
├── จำกัด Usage (5 ครั้ง/วัน หรือ X items)
└── ไม่มี AI Features

PRO (฿99–149/เดือน)  ← Sweet Spot
├── Unlimited Core Features
├── AI Credits: 50 requests/เดือน
├── History ไม่จำกัด
└── Export PDF

PREMIUM (฿199–299/เดือน)
├── Unlimited AI
├── Priority Support
├── Early Access Features
└── API Access (สำหรับ Power Users)
```

**RevenueCat Integration (Standard):**
```typescript
// lib/revenue-cat.ts
import Purchases, { CustomerInfo } from 'react-native-purchases';

export const initRevenueCat = async () => {
  Purchases.configure({
    apiKey: Platform.select({
      ios: process.env.EXPO_PUBLIC_RC_IOS_KEY!,
      android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY!,
    })!,
  });
};

export const getSubscriptionStatus = async (): Promise<'free' | 'pro' | 'premium'> => {
  const info: CustomerInfo = await Purchases.getCustomerInfo();
  if (info.entitlements.active['premium']) return 'premium';
  if (info.entitlements.active['pro']) return 'pro';
  return 'free';
};
```

**Commission Structure ที่ต้องบวกเข้าราคา:**
```
Apple App Store:
  - 30% สำหรับรายได้ปีแรก > $1M
  - 15% สำหรับ Small Business Program (<$1M/ปี)

Google Play Store:
  - 30% มาตรฐาน
  - 15% สำหรับ $1M แรก/ปี

สูตรตั้งราคา: ราคา Store = รายได้สุทธิต้องการ ÷ 0.85
ตัวอย่าง: ต้องการ ฿100 สุทธิ → ตั้งราคา ฿118 บน Store
```

---

## STEP 7 — Launch & Monitor Plan

อ่าน `references/07-launch-monitor.md` เพื่อ Launch Checklist + KPI Framework

**Launch Phases:**
```
PRE-LAUNCH (2 สัปดาห์ก่อน)
├── Internal Beta: ทีมงาน + ผู้ใช้ 10–20 คน
├── TestFlight (iOS): อัปโหลด + แจก Beta Link
├── Google Play Internal: 20 Testers
├── Crash-free Rate: ต้องได้ >99%
├── ASO: Title, Description, Keywords (ภาษาไทย + อังกฤษ)
└── Screenshots + Preview Video

LAUNCH DAY
├── Submit App Store Review
├── Submit Google Play Review  
├── Announce: Social Media + LINE OA
└── Monitor: Sentry + Crashlytics Dashboard

POST-LAUNCH (30 วันแรก)
├── Week 1: Crash Fix Sprint (รีบแก้ทันที)
├── Week 2: User Feedback Analysis
├── Week 3: Feature Iteration
└── Week 4: Growth Optimization
```

**KPIs ที่ต้อง Track:**
```
Acquisition:   Downloads/Day, Install Rate, ASO Ranking
Activation:    Onboarding Completion Rate (ควรได้ >70%)
Retention:     Day 1/7/30 Retention (Benchmark: 25%/10%/5%)
Revenue:       MRR, ARPU, Free-to-Paid Conversion Rate (ควรได้ >3%)
Engagement:    DAU/MAU, Session Length, Feature Usage
Technical:     Crash-free Rate (>99.5%), ANR Rate (<0.5%)
```

---

## Quick Commands สำหรับ AI Agent

```
"mobile readiness [web-app-url หรือ description]"
→ วิเคราะห์ความพร้อม Web App สำหรับต่อยอดเป็น Mobile

"mobile architecture [ชื่อโปรเจกต์] [business type]"
→ เลือก Strategy + สร้าง Folder Structure + Setup Commands

"mobile proposal [ชื่อลูกค้า] [features list]"
→ ออก Proposal PDF พร้อม Phase Plan + ราคา

"mobile store plan [iOS/Android/Both]"
→ สร้าง Store Submission Checklist + Timeline

"mobile monetization [business model]"
→ ออกแบบ Subscription Tier + RevenueCat Config

"mobile launch plan [app name] [launch date]"
→ สร้าง Pre-launch → Launch → Post-launch Checklist

"mobile full [client name] [web app details]"
→ ทำครบทุก Step (1–7) ในการประชุมครั้งเดียว
```

---

## Service Packages สำหรับลูกค้า

```
📦 STARTER PACKAGE — ฿130,000
   Web App ที่มีอยู่แล้ว → Mobile App (Android เท่านั้น)
   - Phase 1-5 (Foundation → Core → Launch)
   - ไม่รวม AI Features
   - ระยะเวลา: 3 เดือน

📦 STANDARD PACKAGE — ฿165,000  ← ขายดีสุด
   Web App → iOS + Android App
   - Phase 1-5 ครบ
   - Basic AI (Gemini สำหรับ Structured Data)
   - RevenueCat Subscription
   - ระยะเวลา: 4 เดือน

📦 PREMIUM PACKAGE — ฿220,000
   Web App → iOS + Android + Web (Unified)
   - Phase 1-5 ครบ
   - Full AI (Anthropic Chat + Gemini Analysis)
   - Advanced Analytics + Push Notification
   - ระยะเวลา: 5.5 เดือน

📦 RETAINER — ฿15,000/เดือน
   หลัง Launch: Update + Bug Fix + Store Management
   - OTA Updates ไม่จำกัด
   - Store Review Support
   - Monthly Report
```

---

## Web → Mobile Feature Mapping

| Web Feature | Mobile Equivalent | เพิ่มเติมบน Mobile |
|---|---|---|
| Next.js Pages | Expo Router Screens | Native Transitions |
| React Components | React Native Components | Touch Optimized |
| Supabase Auth | Supabase + Expo SecureStore | Biometric Login |
| REST API Calls | Same API (Shared) | Offline Cache |
| Stripe Payment | RevenueCat IAP | Native Payment Sheet |
| Email Notification | Push Notification | Local Notification |
| Web Analytics | Mobile Analytics | Session Recording |
| File Upload | Camera + Gallery Picker | Native File Access |

---

> อ่าน references/ ที่เกี่ยวข้องก่อนเริ่ม Step นั้นๆ เสมอ
> ใช้ร่วมกับ kru-den-webdev สำหรับโปรเจกต์ที่เริ่มจาก Web App
> ดู kru-den-closing สำหรับฟอร์มปิดการขาย + ชำระเงิน
