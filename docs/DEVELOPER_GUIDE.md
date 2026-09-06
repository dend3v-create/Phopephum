# สรุปภาพรวมสถาปัตยกรรมเว็บไซต์ Phopephum v2 (Developer Master Guide)

> **Identity**: Living Wisdom Operating System (OS แห่งปัญญาและกาลเวลาชีวิต)  
> **Architecture Blueprint**: `antigravity-remix-expo-cloudflare-master v2.0`  
> **Production URL**: [https://phopephum.com](https://phopephum.com)  
> **Staging URL**: [https://phopephum-web.pages.dev](https://phopephum-web.pages.dev)  
> **Repository Root**: `e:/00.1_DenD3v_AI/69_phopephum-v2`

---

## 1. Monorepo Architecture & Package Boundaries

โปรเจกต์ได้รับการออกแบบภายใต้ **Turborepo Monorepo** แบ่งแยกความรับผิดชอบอย่างเคร่งครัด:

```
69_phopephum-v2/
├── apps/
│   ├── web/                        # Remix (Vite) SSR Web Application บน Cloudflare Pages
│   └── mobile/                     # Expo Router (React Native) + NativeWind
├── packages/
│   ├── engine/                     # Pure TypeScript — ระบบคำนวณโหราศาสตร์ไทยแท้ 100%
│   ├── types/                      # Type Definitions ทั้งหมดของระบบ (Data Contract)
│   ├── validators/                 # Zod Schemas สำหรับ Input Validation ทุก Endpoint
│   ├── prompts/                    # Versioned Prompt Strings สำหรับ AI
│   └── analytics/                  # Event Constants สำหรับระบบสถิติ
└── infrastructure/
    ├── workers/ai-proxy/           # Cloudflare Worker — Gateway เรียก AI ป้องกัน API Key หลุด
    └── supabase/migrations/        # Database Migrations (001 - 019) พร้อม RLS ทุกตาราง
```

### กฎเหล็กของสถาปัตยกรรม (Architecture Hard Rules)
1. **`packages/engine`**: Pure Logic เท่านั้น ห้ามมี Framework, ห้ามเรียก `fetch()`, ห้ามมี Secret Keys
2. **AI Calls**: ทุกการเรียก AI ต้องผ่าน `infrastructure/workers/ai-proxy` เท่านั้น ห้ามยิงตรงจากฝั่ง client
3. **Database Security**: ทุกตารางใน Supabase ต้องเปิดใช้งาน **RLS (Row Level Security)** 100%
4. **Calculations**: Logic การคำนวณดวงและยามต้องอยู่บน Server / Engine เสมอ ห้าม expose สู่ client

---

## 2. โครงสร้างหน้าเว็บและลิงก์ทั้งหมด (Full Site Map & Routes)

### หมวดที่ 1: Public & Authentication
| Route Path | File | หน้าที่และรายละเอียด |
|---|---|---|
| `/` | `_index.tsx` | Landing Page แนะนำระบบ Astral Imperial Hero + 6 มิติชีวิต |
| `/pricing` | `pricing.tsx` | หน้าราคาสมาชิก (Monthly/Annual) + Sands of Time Micro-Economy |
| `/onboarding` | `onboarding.tsx` | หน้ากรอกข้อมูลวันเดือนปีเกิดและสถานที่ตกฟากสำหรับผู้ใช้ใหม่ |
| `/_auth/login` | `_auth.login.tsx` | หน้าเข้าสู่ระบบ (Supabase Auth / Google OAuth) |
| `/_auth/register` | `_auth.register.tsx` | หน้าสมัครสมาชิก |
| `/_auth/forgot-password` | `_auth.forgot-password.tsx` | หน้าขอรีเซ็ตรหัสผ่าน |
| `/r/$code` | `r.$code.tsx` | ลิงก์แนะนำและ Attribution Engine (บันทึก First-Touch Cookie 60 วัน) |

### หมวดที่ 2: Core Dashboard & Daily Guidance
| Route Path | File | หน้าที่และรายละเอียด |
|---|---|---|
| `/dashboard` | `dashboard._index.tsx` | **ภาพรวมวันนี้**: รางวัลทรายกาลเวลา, Golden Window, 4 มิติชีวิต, ปัญญาชีวิตเฉพาะตน, นัดหมาย |
| `/dashboard/check-yam` | `dashboard.check-yam.tsx` | **ถามฤกษ์ & ไขคำถามกาลเวลา**: ๔ ประตูศาสตร์พยากรณ์หลัก, ถามทันที, เปรียบเทียบ 3 ช่วงเวลา |
| `/dashboard/calendar` | `dashboard.calendar.tsx` | **ปฏิทินกาลเวลา**: ไทม์ไลน์ 24 ชม., ช่วงเวลามงคล/ต้องระวัง, กิจกรรมที่ส่งเสริม |
| `/dashboard/horoscope` | `dashboard.horoscope.tsx` | **ผังดวงเลข ๗ ตัว ๔ ฐาน / ๙ ฐาน**: คำนวณตามปฏิทินจันทรคติไทยแท้ 100 ปี + ผังดวงจักรพรรดิ |
| `/dashboard/settings` | `dashboard.settings.tsx` | **ตั้งค่าบัญชี & โปรไฟล์**: ข้อมูลส่วนบุคคล, ข้อมูลภาษี, คลังปัญญา (Wisdom Vault) |

### หมวดที่ 3: Professional Astrological Engines (เครื่องมือโหรอาชีพ)
| Route Path | File | ศาสตร์และการคำนวณ |
|---|---|---|
| `/dashboard/yam` | `dashboard.yam.tsx` | **ยามอัฏฐกาล ๑๖ ยาม**: คำนวณช่วงเวลา 90 นาทีตามเวลาพระอาทิตย์ขึ้น-ตกจริง |
| `/dashboard/karnchata` | `dashboard.karnchata.tsx` | **กาลชะตาระดับนาที**: วิเคราะห์จังหวะดาวจรตามนาทีที่ตั้งคำถาม |
| `/dashboard/horanu` | `dashboard.horanu.tsx` | **โหรทายหนู / ยามพรายกระซิบ ๑๑๒ ผัง**: จับยามเฉพาะกิจ ตอบคำถามฉับพลัน |
| `/dashboard/rahu` | `dashboard.rahu.tsx` | **ยามราหูค้นทรัพย์ & ฤกษ์ย่อย ๑๐ นาที**: ตรวจสอบเวลาให้คุณ/โทษ และตามหาของหาย |
| `/dashboard/mahathaksa` | `dashboard.mahathaksa.tsx` | **มหาทักษาพยากรณ์**: ดาวเสวยอายุ, ดาวแทรก, บริวาร, อายุ, เดช, ศรี, มูละ, อุตสาหะ, มนตรี, กาลกิณี |
| `/dashboard/mahaphuti` | `dashboard.mahaphuti.tsx` | **มหาภูติกำเนิดและจร**: วิเคราะห์โครงสร้างธาตุและฐานพลังงานชีวิต |
| `/dashboard/people` | `dashboard.people.tsx` | **ระบบบันทึกดวงลูกค้า (CRM)**: จัดการฐานข้อมูลดวงสำหรับโหราจารย์ |

### หมวดที่ 4: AI Reports & Wisdom System
| Route Path | File | หน้าที่และรายละเอียด |
|---|---|---|
| `/dashboard/reports` | `dashboard.reports._index.tsx` | รายการรายงานชีวิต AI ที่สร้างไว้ทั้งหมด |
| `/dashboard/reports/new` | `dashboard.reports.new.tsx` | สร้างรายงานวิเคราะห์เชิงลึก 6 มิติ (แลกด้วยทรายกาลเวลา) |
| `/dashboard/reports/$id` | `dashboard.reports.$id.tsx` | หน้ารายงานฉบับสมบูรณ์ (Markdown Rendering + วิเคราะห์สัจธรรม) |
| `/dashboard/chat` | `dashboard.chat.tsx` | สนทนาสดกับ Wisdom AI ปรึกษาคำถามชีวิต |
| `/dashboard/planner` | `dashboard.planner.tsx` | แผนงาน TQM: บันทึกเจตจำนงรายวันและประเมินผลหลังลงมือทำ |

### หมวดที่ 5: Monetization & Partner Portal
| Route Path | File | หน้าที่และรายละเอียด |
|---|---|---|
| `/dashboard/upgrade` | `dashboard.upgrade.tsx` | อัปเกรดแพ็กเกจ (Pro / Imperial) หรือเติมละอองทรายกาลเวลา |
| `/dashboard/partner` | `dashboard.partner.tsx` | **ศูนย์ปฏิบัติการพันธมิตร**: ระบบค่าคอมมิชชัน 3 ระดับ (7%, 15%, 25%), ขอถอนเงิน, ลิงก์แคมเปญ, สมุดบัญชีแยกประเภท (Double-Entry Ledger) |

### หมวดที่ 6: Admin & Operator
| Route Path | File | หน้าที่และรายละเอียด |
|---|---|---|
| `/admin` | `admin._index.tsx` | แดชบอร์ดสรุปตัวเลขและสุขภาพระบบ |
| `/admin/payouts` | `admin.payouts.tsx` | ตรวจสอบและอนุมัติการจ่ายเงินคอมมิชชันพันธมิตร พร้อมออก ภ.ง.ด. 50 ทวิ |
| `/admin/approvals` | `admin.approvals.tsx` | ตรวจสอบและอนุมัติคำขอสมัครสมาชิก |
| `/admin/users` | `admin.users.tsx` | จัดการข้อมูลผู้ใช้งานและสิทธิ์การเข้าถึง |
| `/admin/yam-editor` | `admin.yam-editor.tsx` | เครื่องมือปรับแต่งฐานข้อมูลคำพยากรณ์ยาม |

---

## 3. Design System & Theme Identity

เว็บไซต์รองรับ **Dual-Theme** อย่างสมบูรณ์แบบ ผ่าน CSS Variables ใน `apps/web/app/styles/app.css`:

| องค์ประกอบ | โหมดมืด (Astral Imperial Flow) | โหมดสว่าง (Astral Ivory) |
|---|---|---|
| **พื้นหลังหลัก (Base)** | `#020617` (Cosmic-950) | `#F9F7F3` (Sacred Paper / Ivory) |
| **พื้นผิวการ์ด (Surface)** | `rgba(10, 34, 64, 0.58)` + Blur | `rgba(255, 255, 255, 0.88)` + Blur |
| **สีทองหลัก (Gold)** | `#C6A96B` (Imperial Gold) | `#8C6D2D` (Deep Imperial Gold - WCAG AA) |
| **สีฟ้าคอสมิก (Mystic)** | `#4B6FAE` / `#6D8FC7` | `#3D5361` / `#4C6475` |
| **ตัวหนังสือหลัก (Body)** | `#F8F6F1` | `#1D2939` (Deep Charcoal) |
| **ตัวหนังสือรอง (Muted)** | `#94A3B8` | `#475467` / `#334155` |
| **ระบบไอคอน (Icons)** | เวกเตอร์ `AstralIcon` เรืองแสงสีทอง | เวกเตอร์ `AstralIcon` เส้นคมชัดสี Deep Gold |

### ฟอนต์มาตรฐานของระบบ
1. **Heading & Display**: `"Cinzel"`, `"Cormorant Garamond"`, serif
2. **Body & UI**: `"IBM Plex Sans Thai"`, `"Sarabun"`, sans-serif

---

## 4. โครงสร้างฐานข้อมูล Supabase (Core Tables)

1. `profiles`: ข้อมูลผู้ใช้, วันเดือนปีเกิด, เวลาเกิด, สถานที่เกิด, แพลน, referral_code
2. `time_sands_balances` & `time_sands_transactions`: บันทึกยอดคงเหลือและประวัติการใช้/ได้รับละอองทรายกาลเวลา
3. `partner_entities`: ข้อมูลพันธมิตร, ระดับชั้น (Affiliate/Creator/Master), อัตราคอมมิชชัน
4. `partner_ledger`: บันทึกธุรกรรมทางการเงินแบบ Double-entry
5. `payout_requests`: คำขอเบิกเงินคอมมิชชันของพันธมิตร
6. `ai_reports`: บันทึกประวัติรายงาน AI ที่ผู้ใช้สร้าง
7. `appointments`: ตารางกิจกรรมและนัดหมายประจำวันของผู้ใช้

---

## 5. คำสั่งที่จำเป็นสำหรับนักพัฒนา (Developer Commands)

```bash
# 1. ติดตั้ง Dependencies
pnpm install

# 2. รัน Local Development (Web) -> http://localhost:8081
pnpm dev:web

# 3. รัน Typecheck ตรวจสอบความถูกต้องของ TypeScript ทั้งโปรเจกต์
pnpm typecheck

# 4. บิลด์โปรดักชัน
pnpm build

# 5. ดีพลอยขึ้น Cloudflare Pages (Production)
pnpm --filter @phopephum/web run deploy

# 6. ดีพลอย AI Gateway Worker
pnpm deploy:workers
```
