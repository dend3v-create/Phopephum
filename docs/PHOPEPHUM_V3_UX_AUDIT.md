# 🧭 PHOPEPHUM v3 — Product & UX Audit Report
**Project:** PhopePhum (Wisdom Guidance OS / Daily Auspicious Timing Web App)  
**Target:** V3 Transformation — จากระบบเครื่องมือโหราศาสตร์เฉพาะกลุ่ม สู่ Daily Auspicious Timing & Personal Energy Companion ที่ใช้งานง่ายเหมือน Mobile App  
**Date:** September 2026  
**Auditor:** ครูเด่น มาสเตอร์ฟา — Senior AI SaaS Architect  
**Constraint Check:** Zero code modification in Step 1. Pure Audit & Strategic Blueprint.

---

## 1. Executive Summary

### 1.1 ที่มาและเป้าหมายของ V3
PhopePhum.com เป็นแพลตฟอร์ม Web Application ที่สร้างขึ้นด้วยสถาปัตยกรรมระดับโมเดิร์น (Remix v2, Cloudflare Pages, Cloudflare Worker AI Proxy, Supabase RLS) และขับเคลื่อนด้วย **Engine โหราศาสตร์ไทยแท้ที่แม่นยำสูง** (ปฏิทินจันทรคติ 100 ปี, เลข ๗ ตัว ๙ ฐาน, ผังดวงจักรพรรดิ, มหาทักษา, มหาภูติ, ยามอัฏฐกาล 16 ยาม, กาลชะตาระดับนาที, ยามพรายกระซิบ 112 ผัง, ยามราหูค้นทรัพย์)

อย่างไรก็ตาม ในเวอร์ชันปัจจุบัน (V2) ตัวแอปพลิเคชันถูกออกแบบในลักษณะ **"Astrological Workbench"** หรือห้องทำงานของนักพยากรณ์มืออาชีพ ซึ่งเต็มไปด้วยศัพท์เฉพาะทาง (Jargon), แผงควบคุมที่ซับซ้อน, และการแสดงผลข้อมูลแบบตารางขนาดใหญ่ ทำให้ผู้ใช้งานทั่วไป (General Users / Business Owners / Working Professionals) ที่ต้องการเพียงคำตอบง่ายๆ เช่น:
* *"วันนี้ฉันควรเริ่มคุยงานตอนกี่โมงดี?"*
* *"วันนี้เป็นวันดีของฉันไหม เหมาะกับเรื่องเงินหรือเรื่องงาน?"*
* *"ถ้าต้องเซ็นสัญญาบ่ายนี้ มีช่วงเวลาไหนที่เป็นฤกษ์ทอง?"*

เกิดความรู้สึก **Cognitive Overload (ล้นเกินความเข้าใจ)** และไม่ทราบว่าจะต้องเริ่มกดตรงไหน

### 1.2 วิสัยทัศน์ V3 (The Transformation)
> **"เปลี่ยน PhopePhum ให้เป็น Daily Auspicious Timing Web App ที่เปิดดูทุกเช้า รู้ผลใน 3 วินาที ใช้งานง่ายเหมือน Mobile App บนมือถือ และมีระบบ 'หาฤกษ์ให้ฉัน' ที่ฉลาดโดยไม่ต้องเข้าใจโหราศาสตร์"**

โดยที่ **ไม่ลบ Calculation Engine เดิมแม้แต่ตัวเดียว** และ **ไม่ลบ Pro Tools เดิม** แต่จัดระเบียบสถาปัตยกรรมข้อมูล (Information Architecture) ใหม่หมด ภายใต้ 5 แท็บหลัก: **วันนี้ · ฤกษ์ · ปฏิทิน · ดวง · ฉัน**

---

## 2. Current Architecture & Codebase Inventory

### 2.1 Technology Stack & Monorepo Structure
```
phopephum-v2/
├── apps/
│   ├── web/                        # Remix v2 (App Router) + Cloudflare Pages + Tailwind CSS
│   │   ├── app/
│   │   │   ├── routes/             # 54 Route files (Landing, Auth, Dashboard, APIs, Admin)
│   │   │   ├── services/           # Server-side services (Auth, Supabase, Identity, Advisor, Stripe, AI)
│   │   │   ├── components/         # UI tokens, cards, horoscope matrices, language switcher
│   │   │   ├── lib/i18n/           # Multi-language system (TH, EN, ZH)
│   │   │   └── styles/app.css      # Astral Imperial Flow theme (Dark/Light tokens)
│   └── mobile/                     # Expo Router project (Native mobile client)
├── packages/
│   ├── engine/                     # Pure TypeScript calculation engine (Zero framework/fetch/secrets)
│   ├── types/                      # Shared TypeScript interfaces & types
│   ├── validators/                 # Zod validation schemas
│   ├── prompts/                    # Versioned AI prompt templates
│   └── analytics/                  # Analytics event definitions (EVENTS)
├── infrastructure/
│   ├── workers/ai-proxy/           # Cloudflare Worker AI Gateway (Anthropic/Gemini/OpenAI routing)
│   └── supabase/migrations/        # 17 Migration files (RLS, Profiles, Plans, Appointments, History)
```

### 2.2 Existing Routes Audit (54 Routes)
| Route Path | Category | Purpose & Current Implementation |
|---|---|---|
| `_index.tsx` | Landing | Astral Imperial Hero, Features showcase, Pricing preview, CTA |
| `_auth.login.tsx`, `_auth.register.tsx`, `_auth.forgot-password.tsx` | Auth | Supabase Email/Password + OAuth callbacks, Password reset |
| `onboarding.tsx` | Onboarding | เก็บข้อมูลตั้งต้น: วันเกิด (พ.ศ.), เวลาเกิด, สถานที่เกิด, เพศ, มอบ 15 Sands of Time |
| `dashboard._index.tsx` | Dashboard (Today) | รวม 9 Sections: Identity, Tarot Pull, Daily Advice, Eco Hub, Yam Hero, Timeline 16 Slots, TQM, Rank, Login Modal |
| `dashboard.check-yam.tsx` | Timing Hub | แดชบอร์ดแสดงสถานะ 4 ยาม (อัฏฐกาล, กาลชะตา, พรายกระซิบ, ราหู) + ลิงก์เครื่องมือ 5 ตัว |
| `dashboard.calendar.tsx` | Calendar | ปฏิทินจันทรคติ 100 ปี + ระบบวิเคราะห์นัดหมายฤกษ์มงคล + บันทึก Appointments + Google Calendar Sync |
| `dashboard.horoscope.tsx` | Horoscope | เลข ๗ ตัว ๙ ฐาน, ผังจักรพรรดิ, ทักษา/มหาภูติกำเนิด-จร, ตัวกรองดาว, ประวัติคำนวณ (2,486 บรรทัด) |
| `dashboard.yam.tsx` | Pro Tool | คัมภีร์ยามอัฏฐกาลชั้นฉาย 16 ยามย่อย, ตาราง 24 ช่วง, คำทำนายโบราณ (2,642 บรรทัด) |
| `dashboard.karnchata.tsx` | Pro Tool | เลข ๗ ตัวกาลชะตา Real-time รายนาที, ยามใหญ่, ยามซอย, แชทถามตอบดวงกาล |
| `dashboard.horanu.tsx` | Pro Tool | ยามพรายกระซิบ 112 ผัง, ดาวลอย 11 ดวง 12 ภพ, SVG Render |
| `dashboard.rahu.tsx` | Pro Tool | ยามราหูค้นทรัพย์ Real-time, ตารางช่วงเวลาร้าย/ดีประจำวัน, แจ้งเตือนเสียง |
| `dashboard.mahathaksa.tsx` | Pro Tool | มหาทักษา 8 ทิศ ดาวเสวยอายุ ทักษาจรรายปี |
| `dashboard.mahaphuti.tsx` | Pro Tool | มหาภูติพยากรณ์ 8 ภูมิ สมดุลธาตุ |
| `dashboard.planner.tsx` | Productivity | TQM Planner (Intention, 3 Priorities, Evening Reflection) + แลกรางวัล Sands of Time |
| `dashboard.reports.*` | AI Reports | สร้างรายงานเชิงลึก 6 มิติ (ตัวตน, การงาน, การเงิน, ความรัก, ปีจร, ทั่วไป) + Markdown reader |
| `dashboard.people.tsx` | Pro Tool | ระบบบันทึกรายชื่อลูกค้า / ดวงบุคคลอื่น (Customer CRM) |
| `dashboard.community.tsx` | Growth | Affiliate Referral System, ลิงก์ชวนเพื่อน, คอมมิชชัน 3-10%, กระเป๋าเงิน |
| `dashboard.chat.tsx` | AI Chat | แชทสนทนากับ Sesheta / Wisdom AI |
| `dashboard.settings.tsx` | Settings | แก้ไขโปรไฟล์, วันเกิด, ภาษา, ธีม, สถิติ Affiliate, ข้อมูลกระเป๋าเงิน |
| `dashboard.upgrade.tsx` & `pricing.tsx` | Monetization | แพ็กเกจ Basic (฿59), Pro (฿259), Imperial (฿789) ผ่าน Stripe Checkout |
| `api.daily-card.ts` | API | สุ่มไพ่ประจำวัน + บันทึกลง daily_plans + ให้เครดิต |
| `api.payment.checkout.ts` | API | สร้าง Stripe Checkout Session |
| `api.webhook.stripe.ts` | API | รับ Webhook จาก Stripe, ปลดล็อกสิทธิ์ membership, จ่าย Affiliate |
| `api.reports.ts`, `api.horanu-chat.ts`, `api.karnchata-chat.ts`, `api.wisdom-chat.ts` | API | เรียก Worker AI Proxy เพื่อ Generate คำทำนาย |
| `admin.*` & `operator.*` | Backoffice | อนุมัติสลิป, จัดการผู้ใช้, Seed ข้อมูลยาม, แก้ไขคำทำนาย |

### 2.3 Existing Calculation Engines (`packages/engine`)
ระบบคำนวณทั้งหมดเป็น Pure TypeScript ปราศจาก Framework Dependency:
1. `horoscopeEngine.ts` / `phopephum-v2.ts`: คำนวณผังดวง ๗ ตัว ๙ ฐาน, ผังจักรพรรดิ, ฐานที่ ๔ กำลังพระเคราะห์
2. `calendarConverter.ts` / `gregorianToThaiLunarV3()`: ปฏิทินจันทรคติไทย 100 ปี (ข้างขึ้น/ข้างแรม, เดือนไทย, ปีนักษัตร, วันพระ)
3. `calculateAtthakarn.ts` / `yam/`: ยามอัฏฐกาล 16 ยาม (8 ยามกลางวัน + 8 ยามกลางคืน) อิงเวลาพระอาทิตย์ขึ้น-ตกจริง (`getSunTimes`)
4. `calculateTaksa.ts` / `taksa-mahabhuti/`: ทักษากำเนิด, ทักษาจร (บริวาร, อายุ, เดช, ศรี, มูละ, อุตสาหะ, มนตรี, กาลกิณี)
5. `calculateAgeCycle.ts` / `calculateJorn.ts`: วัยจร, ปีจร, เดือนจร, วันจร
6. `calculateRahu.ts`: ยามราหูค้นทรัพย์ (ช่วงเวลาบวก/ลบของการเงิน)
7. `calculateHoraThaiNu.ts`: ยามพรายกระซิบ 112 รูปแบบ
8. `karnchataCalculator.ts`: เลข ๗ ตัวกาลชะตา

### 2.4 Existing Supabase Database Schema
* `profiles`: `id`, `email`, `display_name`, `birth_date`, `birth_time`, `birth_place`, `gender`, `role`, `plan`, `subscription`, `time_sands`, `wallet_balance`, `referral_code`, `referred_by`
* `daily_plans`: `id`, `user_id`, `date`, `intention`, `priorities`, `reflection`, `daily_card`, `daily_card_reading`
* `appointments`: `id`, `user_id`, `title`, `event_type`, `event_date`, `event_time`, `score`, `verdict`, `advice`, `yam_name`, `bhop`, `status`
* `calculations`: `id`, `user_id`, `calc_type`, `input_data`, `result_data`, `created_at`
* `ai_reports`: `id`, `user_id`, `report_type`, `content`, `tokens_used`, `created_at`
* `subscription_requests`: `id`, `user_id`, `type`, `plan`, `status`, `created_at`, `approved_at`
* `customers`: `id`, `user_id`, `name`, `birth_date`, `birth_time`, `birth_place`, `gender`
* `events`: `id`, `user_id`, `event`, `properties`, `created_at`

---

## 3. Current User Journey Audit (A)

```
[ผู้ใช้ใหม่]
 Landing Page (/) ──► Register / Login ──► Onboarding (/onboarding) ──► Dashboard (/dashboard)

[ผู้ใช้เก่าที่ Login แล้ว]
 เข้าสู่ระบบ ──► เข้าหน้า /dashboard ──► เจอกล่องข้อความและวิดเจ็ต 9 ชั้น (Scroll ยาว)
```

### การดูฤกษ์ในระบบปัจจุบัน
1. ผู้ใช้เข้าหน้า `/dashboard` จะพบกับ:
   * รหัสชีวิต (Identity OS Blueprint)
   * กล่องจับไพ่ทาโรต์ (Daily Ritual Check-in)
   * คำแนะนำประจำวัน 4 ด้าน (งาน, เงิน, รัก, สุขภาพ)
   * ปุ่มเมนู Ecosystem Hub 6 ปุ่ม (WHO, WHAT, WHEN, HOW, WHY, REFLECT)
   * การ์ดฤกษ์ยามขณะนี้ (Active Yam Hero)
   * ตารางยาม Timeline 16 ช่อง (กดสลับกลางวัน/กลางคืน)
   * ลิงก์ TQM Planner และ Community Rank
2. หากผู้ใช้ต้องการ "ดูฤกษ์สำหรับกิจกรรมเฉพาะ" (เช่น นัดเซ็นสัญญาบ่าย 2 พรุ่งนี้):
   * ผู้ใช้ต้องกดเมนู "เช็คฤกษ์ยาม" (`/dashboard/check-yam`)
   * ในหน้านั้นจะเจอการสรุป 4 กล่องยามที่มีศัพท์เทคนิคต่างกัน (ยามอัฏฐกาลบอกว่า "ดีมาก", ราหูบอกว่า "ฤกษ์ดี", พรายกระซิบมีดาวลอย, กาลชะตามีดาวประจำวัน)
   * ผู้ใช้ต้องเลือกว่าจะกดเข้าเครื่องมือตัวไหนต่อระหว่าง 5 เครื่องมือย่อย
   * หรือต้องกดเข้าหน้า "ปฏิทินสำเร็จ 100 ปี" (`/dashboard/calendar`) เพื่อกรอกวันที่ เวลา และประเภทกิจกรรม จึงจะได้คะแนนความเหมาะสม

---

## 4. Core User Job (B)

ผู้ใช้ไม่ได้เปิด PhopePhum เพราะต้องการดูสูตรคำนวณดวงดาว แต่ผู้ใช้เข้ามาเพราะต้องการทำงาน 3 ประการนี้ให้สำเร็จ (Jobs-to-be-Done):

| # | Core User Job | คำถามในใจของผู้ใช้ | คุณค่าที่ส่งมอบ |
|---|---|---|---|
| **Job 1** | **Daily Energy Check** | *"วันนี้เป็นยังไงบ้างสำหรับฉัน? มีอะไรต้องระวังไหม?"* | ความมั่นใจ ความสบายใจ และแนวทางระวังตัวในแต่ละวัน |
| **Job 2** | **Auspicious Timing for Intent** | *"ฉันจะไปคุยงาน / ปิดดีล / เซ็นสัญญา / ออกรถ ช่วงกี่โมงดีที่สุด?"* | เวลาที่ให้แต้มต่อทางจิตวิทยาและจังหวะพลังงานที่ดีที่สุด |
| **Job 3** | **Personal Life & Destiny Clarity** | *"ฉันเป็นคนแบบไหน ช่วงอายุนี้กำลังเผชิญกับอะไร อนาคตจะไปทางไหน?"* | ความเข้าใจตนเองและการวางแผนชีวิตระยะยาว |

---

## 5. UX Audit & Core Problems (C)

### 🚨 ปัญหาหลัก 5 ประการใน V2

#### 1. Cognitive Overload & ขาด Information Hierarchy ที่ชัดเจน
หน้าแรก (`/dashboard`) มีวิดเจ็ตอัดแน่นมากเกินไป (9 เลเยอร์) ทำให้ผู้ใช้ไม่รู้ว่าจุดสำคัญที่สุดของวันนี้คืออะไร ต้องใช้เวลาเลื่อนหน้าจอเกิน 30 วินาทีเพื่อทำความเข้าใจ

#### 2. Technical Jargon Barrier (กำแพงศัพท์แสงโหราศาสตร์)
คำว่า *อัฏฐกาลชั้นฉาย, กาลชะตายามซอย, ฐานกำลังพระเคราะห์ ฐาน 4, มหาภูติจร, พรายกระซิบ, ภพ 12* เป็นภาษาที่เหมาะกับ "นักพยากรณ์" แต่ทำให้ "ผู้ใช้ทั่วไป" รู้สึกว่าระบบใช้งานยากและไม่กล้าตัดสินใจ

#### 3. Fragmented Timing Tools (เครื่องมือดูฤกษ์กระจัดกระจาย)
มีหน้าดูฤกษ์ถึง 5 หน้าที่แยกกัน (`/dashboard/yam`, `/dashboard/check-yam`, `/dashboard/calendar`, `/dashboard/rahu`, `/dashboard/karnchata`) ซึ่งให้ผลลัพธ์ในมุมที่ต่างกัน ทำให้ผู้ใช้สับสนว่าควรเชื่อหน้าไหน

#### 4. Desktop-First Density บน Mobile Screen
ตาราง 16 ยามย่อย และตาราง 9 ฐาน ถูกออกแบบให้มีคอลัมน์เยอะ เมื่อเปิดบนหน้าจอมือถือ (390px - 414px) ตัวอักษรจะเล็ก เบียดเสียด และต้องเลื่อนซ้ายขวา

#### 5. ขาด Instant Intent-Based Action ("หาฤกษ์ให้ฉัน")
ยังไม่มีฟังก์ชันแบบ 1-Click ที่ให้ผู้ใช้เลือกกิจกรรม เช่น *"เจรจาธุรกิจ"* แล้วระบบคัดกรองช่วงเวลาทอง (Golden Hours) ของวันนี้หรือสัปดาห์นี้ออกมาให้ทันที

---

## 6. Feature Prioritization (D)

| Status | Feature / Route / Logic | Action & Rationale |
|---|---|---|
| **KEEP** | **Thai Lunar Engine & 100-Year Table** | แกนหลักความแม่นยำทางดาราศาสตร์และจันทรคติไทย ห้ามแตะต้อง |
| **KEEP** | **Seven Base & Emperor Chart Engine** | หัวใจการผูกดวง ๗ ตัว ๙ ฐาน |
| **KEEP** | **Real-time Yam & Sun Calculation Engine** | ระบบคำนวณยามตามเวลาขึ้น-ตกของพระอาทิตย์จริง |
| **KEEP** | **Taksa & Mahaphuti Transit Engine** | ระบบคำนวณทักษาจรและมหาภูติจรรายวัน/รายปี |
| **KEEP** | **Supabase Auth, Profiles, RLS, Stripe** | โครงสร้างความปลอดภัยและการชำระเงินที่สมบูรณ์แล้ว |
| **KEEP** | **AI Proxy Worker & Report Engine** | ระบบรายงานและสนทนา AI ผ่าน Worker Gateway |
| **KEEP** | **Appointments DB & Google Calendar Sync** | ระบบบันทึกนัดหมายฤกษ์มงคล |
| **REFACTOR** | **`dashboard._index.tsx` ➔ "วันนี้" (Today Screen)** | ปรับให้อ่านจบใน 3 วินาที แสดงสรุปพลังงานวัน + ช่วงเวลาทอง + ข้อควรระวัง + ปุ่มหาฤกษ์ด่วน |
| **REFACTOR** | **`dashboard.check-yam.tsx` ➔ "ฤกษ์" (Timing Finder)** | ปรับเป็นระบบ "หาฤกษ์ให้ฉัน" ตามกิจกรรม (เจรจา/ปิดการขาย/เซ็นสัญญา/เปิดตัว) |
| **REFACTOR** | **`dashboard.calendar.tsx` ➔ "ปฏิทิน" (Living Calendar)** | ปรับ UI ปฏิทินให้เหมาะกับมือถือ แสดงจุดสีมงคลรายวัน และกดดูรายละเอียดนัดหมายได้ทันที |
| **REFACTOR** | **`dashboard.horoscope.tsx` ➔ "ดวง" (My Destiny)** | จัดกลุ่มเป็น: รหัสชีวิต + วงจรชีวิตปัจจุบัน (วัยจร/ปีจร) + ปุ่มสลับดูผังจักรพรรดิแบบ Pro |
| **REFACTOR** | **`dashboard.tsx` (Main Layout & Navigation)** | รวมเมนูหลักเหลือ 5 แท็บมาตรฐานที่สอดคล้องทั้ง Mobile Bottom Bar และ Desktop Sidebar |
| **HIDE FROM MAIN NAV** | **Pro Astrologer Tools** (`/dashboard/yam`, `/dashboard/karnchata`, `/dashboard/horanu`, `/dashboard/rahu`, `/dashboard/mahathaksa`, `/dashboard/mahaphuti`, `/dashboard/people`) | **ห้ามลบ Route** แต่ซ่อนจาก Main Bottom Bar โดยรวมไว้ในหน้า *"โหมดโหราจารย์ / Pro Tools Hub"* ในแท็บ "ฉัน" หรือเปิดให้เฉพาะ Pro/Imperial |
| **HIDE FROM MAIN NAV** | **TQM Planner, Community, Chat** | ย้ายการเข้าถึงไปไว้ในแท็บ "ฉัน" หรือการ์ดทางลัดในหน้า "วันนี้" เพื่อไม่ให้รบกวน Navigation หลัก 5 แท็บ |
| **DEFER** | **Multi-client Customer CRM Enhancement** | ใช้งานระบบ `customers` เดิมที่มีอยู่แล้ว ยังไม่ต้องขยายระบบใหญ่ใน V3 |
| **DEFER** | **Stripe Connect Automated Payout** | ใช้ระบบถอนเงินคอมมิชชันแบบ Manual Approval ของเดิมไปก่อน |
| **REMOVE ONLY IF JUSTIFIED** | **Redundant Widget Clutter** | ตัดกล่อง Ecosystem Hub 6 ปุ่มในหน้าแรกออก เนื่องจากซ้ำซ้อนกับ Bottom Navigation |

---

## 7. Recommended V3 Information Architecture (E)

### 5 แท็บหลักบน Mobile Bottom Bar & Desktop Sidebar

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PHOPEPHUM V3 IA                               │
├─────────────┬─────────────┬─────────────┬──────────────┬───────────────┤
│   1. วันนี้  │   2. ฤกษ์    │  3. ปฏิทิน  │    4. ดวง    │    5. ฉัน     │
│   (Today)   │  (Timing)   │ (Calendar)  │ (Horoscope)  │ (Profile/Hub) │
├─────────────┼─────────────┼─────────────┼──────────────┼───────────────┤
│ • พลังงานวัน │ • หาฤกษ์ให้ฉัน │ • ปฏิทินไทย │ • รหัสตัวตน   │ • ข้อมูลส่วนตัว│
│ • ฤกษ์ขณะนี้ │ • เลือกตามงาน│   100 ปี    │ • วัยจร/ปีจร │ • แพ็กเกจ/เติมทราย│
│ • ช่วงเวลาทอง│ • ยาม 16 ช่อง│ • วันมงคล   │ • ผังจักรพรรดิ│ • AI Reports  │
│ • สิ่งที่ควรทำ │ • ปฏิทิน 7 วัน│ • นัดหมายฤกษ์│ • คำแนะนำดวง │ • Pro Tools Hub│
└─────────────┴─────────────┴─────────────┴──────────────┴───────────────┘
```

### URL Mapping & Route Preservation Strategy
* **แท็บ 1 [วันนี้]:** `/dashboard` (`apps/web/app/routes/dashboard._index.tsx`)
* **แท็บ 2 [ฤกษ์]:** `/dashboard/check-yam` (`apps/web/app/routes/dashboard.check-yam.tsx`)
* **แท็บ 3 [ปฏิทิน]:** `/dashboard/calendar` (`apps/web/app/routes/dashboard.calendar.tsx`)
* **แท็บ 4 [ดวง]:** `/dashboard/horoscope` (`apps/web/app/routes/dashboard.horoscope.tsx`)
* **แท็บ 5 [ฉัน]:** `/dashboard/settings` (`apps/web/app/routes/dashboard.settings.tsx`)

> **กฎเหล็ก:** ทุก Route เดิม (`/dashboard/yam`, `/dashboard/karnchata`, `/dashboard/horanu`, `/dashboard/rahu`, `/dashboard/mahathaksa`, `/dashboard/mahaphuti`, `/dashboard/planner`, `/dashboard/reports`, `/dashboard/community`, `/dashboard/people`) **ยังคงอยู่และทำงานได้ 100%** โดยสามารถเข้าถึงได้ผ่านปุ่มทางลัดในแท็บ "ฉัน" (Pro Tools Hub) หรือลิงก์ภายในแอป

---

## 8. Today Screen Specification (F) — กฎ 3 วินาที

เป้าหมาย: เมื่อผู้ใช้เปิดหน้า `/dashboard` จะต้องรู้ข้อมูล 4 ข้อนี้ภายใน 3 วินาที โดยไม่ต้องเลื่อนหน้าจอมาก:

```
┌──────────────────────────────────────────────────────────────┐
│  ☀️ อรุณสวัสดิ์, คุณเด่น  [พุธ 4 ก.ย. · ขึ้น 3 ค่ำ เดือน 10]    │
├──────────────────────────────────────────────────────────────┤
│  ⚡ [CARD 1: วันนี้เป็นอย่างไร]                              │
│  "วันพุธธาตุไม้ — วันแห่งการสื่อสาร เจรจา และเปิดตัวโอกาสใหม่"      │
│  สรุป: พลังงานราบรื่น 85% · ดาวพุธให้คุณเรื่องการค้า            │
├──────────────────────────────────────────────────────────────┤
│  ⏰ [CARD 2: ฤกษ์ยามขณะนี้ & ช่วงเวลาทองของวัน]              │
│  ขณะนี้: ยาม ๔ (พุธะ) 10:31-12:00 น. ✦ มงคลยิ่ง (ยามศรี)     │
│  ⏳ เหลืออีก 42 นาที 15 วินาที                               │
│  🌟 ช่วงเวลาทองวันนี้: 10:31-12:00 น. และ 15:01-16:30 น.     │
├──────────────────────────────────────────────────────────────┤
│  🎯 [CARD 3: สิ่งที่ควรทำ / สิ่งที่ควรเลี่ยงวันนี้]             │
│  ✅ ควรทำ: นัดคุยข้อตกลง, โทรเสนองาน, วางแผนการเงิน           │
│  ⚠️ ควรเลี่ยง: การใช้อารมณ์ตัดสินใจช่วง 13:30-15:00 น. (ยามกาล)│
├──────────────────────────────────────────────────────────────┤
│  🚀 [CARD 4: Quick Action หาฤกษ์เฉพาะกิจ]                    │
│  [ ⚡ ค้นหาฤกษ์มงคลสำหรับกิจกรรมของคุณวันนี้/พรุ่งนี้ ➔ ]        │
└──────────────────────────────────────────────────────────────┘
```

---

## 9. Timing Finder Specification (G) — "หาฤกษ์ให้ฉัน"

ปรับปรุงหน้า `/dashboard/check-yam` ให้กลายเป็น **Intent-Driven Timing Finder**:

### User Flow
1. **เลือกกิจกรรม (Intent):**
   * 💼 เจรจาธุรกิจ / ติดต่องานสำคัญ (`negotiation`)
   * 💰 เสนอขาย / ปิดดีล / รับเงิน (`closing`)
   * 🚀 เปิดตัวโครงการ / เริ่มต้นสิ่งใหม่ (`launch`)
   * 📝 เซ็นสัญญา / ธุรกรรมการเงิน (`investment`)
   * 🚗 ออกเดินทาง / เดินทางไกล (`travel`)
2. **เลือกวัน:**
   * วันนี้ (Today) / พรุ่งนี้ (Tomorrow) / เลือกวันเอง (Date Picker)
3. **ผลลัพธ์ที่คำนวณจาก Engine เดิม:**
   * คำนวณความสัมพันธ์ระหว่าง **ดาวเจ้ายาม (Atthakarn Planet)** กับ **ทักษาจรของผู้ใช้ (Taksa Transit)**
   * ยามศรี = 95% (มงคลสูงสุด)
   * ยามเดช = 85% (อำนาจบารมี ชัยชนะ)
   * ยามมนตรี = 80% (ผู้ใหญ่สนับสนุน)
   * ยามมูละ = 75% (ความมั่นคง ทรัพย์สิน)
   * ยามกาลกิณี = 30% (อุปสรรค พึงหลีกเลี่ยง)
   * ตรวจสอบร่วมกับ `calculateRahu()` หากตรงกับช่วงราหูค้นทรัพย์เบียดเบียนจะหักคะแนน 10%
4. **Action Output:**
   * ปุ่ม **"บันทึกลงปฏิทินนัดหมาย"** (Insert ลงตาราง `appointments`)
   * ปุ่ม **"เพิ่มเข้า Google Calendar"** (1-Click Add to Google Calendar)

---

## 10. Technical Reuse Analysis (H)

| Asset | Type | Current Location | V3 Reuse Strategy |
|---|---|---|---|
| `calculatePhopephum()` | Engine | `packages/engine/src/engine/` | ใช้คำนวณผลรวมดวงชะตาและทักษาจรในทุกหน้า |
| `calculateDailyYamSlots()` | Helper | `dashboard._index.tsx` & `dashboard.yam.tsx` | นำมาเป็นฟังก์ชันกลางสำหรับคำนวณ 16 ยามย่อย |
| `getSunTimes()` | Engine | `packages/engine/src/yam/` | คำนวณเวลาพระอาทิตย์ขึ้น-ตกจริงตามพิกัด |
| `calculateRahu()` | Engine | `packages/engine/src/calculators/` | ใช้ตัดเกรดยามราหูในระบบหาฤกษ์ |
| `appointments` Table | DB Table | Supabase | ใช้งานร่วมกับทั้ง Timing Finder และปฏิทิน 100 ปี |
| `daily_plans` Table | DB Table | Supabase | ใช้งานสำหรับบันทึกการจับไพ่และ TQM |
| `dailyAdvisor.server.ts` | Service | `apps/web/app/services/` | สรุปคำแนะนำรายวัน 4 ด้าน (งาน, เงิน, รัก, สุขภาพ) |
| `identity.server.ts` | Service | `apps/web/app/services/` | แปลงวันเกิดเป็น Archetype และตัวตน 8 รูปแบบ |
| `payment.server.ts` | Service | `apps/web/app/services/` | จัดการ Stripe Checkout และ Subscription |
| `ai.server.ts` & Worker | Service | `apps/web/app/services/` + Cloudflare Worker | ให้บริการ AI Chat และ AI Life Reports |

---

## 11. Technical Debt & Risks Audit (I)

### 1. Stale `.js` Artifacts ใน Vite Build
* **อาการ:** บางครั้งเมื่อ build หรือ dev จะพบข้อผิดพลาด `Cannot find module '*.js'` ในโฟลเดอร์ `apps/web/app/`
* **วิธีแก้:** ต้องรันคำสั่งล้าง artifact เสมอ: `find apps/web/app -name "*.js" | xargs rm -f`

### 2. Monolithic Route Files (ขนาดไฟล์ใหญ่เกินไป)
* `dashboard.horoscope.tsx` มีความยาวถึง 2,486 บรรทัด
* `dashboard.yam.tsx` มีความยาวถึง 2,642 บรรทัด
* `dashboard.horanu.tsx` มีความยาวถึง 1,947 บรรทัด
* **ความเสี่ยง:** การ Maintain ยาก และ bundle size ฝั่ง client ใหญ่ขึ้น
* **แนวทาง V3:** แยก Sub-components เช่น Chart SVG, Filter Bars, Result Modals ออกเป็นไฟล์ย่อยใน `components/horoscope/` และ `components/yam/`

### 3. Client/Server Hydration Mismatch ในเรื่องเวลา
* การคำนวณ `new Date()` ระหว่าง Cloudflare Worker Server กับ Browser ฝั่ง Client อาจเหลื่อมล้ำกันไม่กี่วินาที
* **แนวทาง V3:** ใช้ `useEffect` หรือโครงสร้าง `LiveClock` ที่รองรับ Hydration เพื่อไม่ให้เกิดข้อผิดพลาด React Hydration Error

### 4. Subscription & Plan Mapping Consistency
* ในตาราง `profiles` มีทั้งคอลัมน์ `plan` (`free`, `basic`, `pro`, `imperial`) และ `subscription` (`free`, `basic`, `premium`, `lifetime`)
* **แนวทาง V3:** ใช้ `plan` เป็น Single Source of Truth สำหรับการตรวจสอบสิทธิ์ผ่าน `canAccess(profile, requiredPlan)`

---

## 12. Recommended Development Order & Roadmap

```
STEP 1: Product & UX Audit (Completed ✅)
  │
  ▼
STEP 2: Information Architecture & Navigation Polish
  ├── ปรับปรุง apps/web/app/routes/dashboard.tsx (5 Fixed Bottom Tabs + Clean Desktop Sidebar)
  └── เพิ่ม "Pro Tools Hub" สำหรับเข้าถึงเครื่องมือเฉพาะทาง
  │
  ▼
STEP 3: Today Screen Refactoring (`dashboard._index.tsx`)
  ├── วางโครงสร้าง 3-Second Glance UI
  ├── สรุปพลังงานวัน + ยามปัจจุบัน + Golden Hour Highlight
  └── Quick Action Button ไปยัง Timing Finder
  │
  ▼
STEP 4: "หาฤกษ์ให้ฉัน" Timing Finder Refactoring (`dashboard.check-yam.tsx`)
  ├── สร้าง UI เลือกกิจกรรม (Intent-Based Form)
  ├── เชื่อมโยง Engine คำนวณคะแนนฤกษ์ (Sri/Dech/Montri/Rahu)
  └── ระบบ 1-Click บันทึกนัดหมายลง Appointments + Google Calendar
  │
  ▼
STEP 5: Mobile Living Calendar Experience (`dashboard.calendar.tsx`)
  ├── ปรับแต่ง Grid ปฏิทินจันทรคติ 100 ปีให้ Clean บนมือถือ
  └── แสดงจุดแจ้งเตือนนัดหมายฤกษ์มงคลในแต่ละวัน
  │
  ▼
STEP 6: Personal Horoscope & Blueprint Screen (`dashboard.horoscope.tsx`)
  ├── แยก Tab: รหัสตัวตน & วงจรชีวิตปัจจุบัน (Default สำหรับผู้ใช้ทั่วไป)
  └── Tab ผังจักรพรรดิ ๗ ตัว ๙ ฐานฉบับเต็ม (สำหรับผู้สนใจเชิงลึก/Pro)
  │
  ▼
STEP 7: Settings & Hub Polish (`dashboard.settings.tsx` & `dashboard.upgrade.tsx`)
  ├── จัดระเบียบหน้าโปรไฟล์ การเติมทรายกาลเวลา และแพ็กเกจ
  └── ทดสอบ Responsive และ E2E Flow ทั้งหมด
```

---

## 13. Acceptance Criteria สำหรับ V3

1. **Mobile-First UX:** เมนูหลักด้านล่าง (Bottom Tab Bar) แสดง 5 แท็บชัดเจนบนหน้าจอมือถือ (ความสูง 64px มี Active Indicator ชัดเจน)
2. **3-Second Rule บนหน้า Today:** ผู้ใช้เข้าใจสถานะพลังงานวันของตนเองและช่วงเวลาทองได้ภายใน 3 วินาทีโดยไม่ต้องเลื่อนหน้าจอเกิน 1 หน้า
3. **Intent-Based Timing Finder:** ผู้ใช้สามารถเลือกกิจกรรม เช่น "เจรจาธุรกิจ" แล้วระบบแสดงช่วงเวลาที่แนะนำพร้อมคะแนนความเหมาะสม (Score %) ทันที
4. **Zero Calculation Loss:** เครื่องมือโหราศาสตร์เดิมทั้ง 7 ระบบ (อัฏฐกาล, กาลชะตา, พรายกระซิบ, ราหู, เลข ๗ ตัว ๙ ฐาน, มหาทักษา, มหาภูติ) ยังคงคำนวณถูกต้องตามคัมภีร์ 100%
5. **No Broken Links:** ทุก URL เส้นทางเดิมยังสามารถเข้าใช้งานได้ ไม่เกิด 404
6. **Performance & Clean Build:** ไม่มี TypeScript Error, ไม่มี Stale JS Error, และโหลดหน้า Dashboard ได้รวดเร็วบน Cloudflare Pages

---
*เอกสารนี้จัดทำขึ้นสำหรับเตรียมความพร้อมในการพัฒนา PhopePhum V3 — พร้อมดำเนินการต่อใน STEP 2 ทันทีที่ได้รับคำสั่ง*
