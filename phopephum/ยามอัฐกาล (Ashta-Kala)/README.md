# Hora Engine — Modular TypeScript

> ระบบคำนวณยามอัฐกาล แยกเป็นโมดูลย่อยสำหรับ Dashboard + Mobile App

---

## 📁 โครงสร้างโมดูล

```
hora-engine/
├── types/
│   └── index.ts          ← Type definitions ทั้งหมด
│
├── constants/
│   └── planets.ts        ← ดาว 7 ดวง, Chaldean order, Day rulers, Time constants
│
├── utils/
│   ├── time.ts           ← แปลงเวลา, minutes ↔ HH:MM, range check
│   └── planet.ts         ← Chaldean index, activity scoring, classification
│
├── core/
│   ├── slot-builder.ts   ← สร้าง HoraMajorSlot[] และ HoraSlot[]
│   ├── current-hora.ts   ← หายามปัจจุบัน + ยามถัดไป
│   └── calculator.ts     ← Main API: calculateHora, findAuspiciousHoras, ฯลฯ
│
├── helpers/
│   └── dashboard.ts      ← แปลง HoraResult → UI-ready data สำหรับ Dashboard
│
└── index.ts              ← Barrel export ทุกอย่าง
```

---

## 🚀 การใช้งาน (Import จาก index)

```typescript
// Import จากจุดเดียว
import {
  calculateHora,
  getCurrentHora,
  getHoraAt,
  findAuspiciousHoras,
  findAuspiciousHorasByActivity,
  getDailyOverview,
  toCurrentHoraCard,
  toHoraTable,
} from "@/engine";

import type {
  HoraResult,
  CurrentHoraInfo,
  Planet,
  DailyOverview,
} from "@/engine";
```

---

## 📖 API Reference

### Core Functions

```typescript
// คำนวณยามทั้งวัน + ยามปัจจุบัน
const result = calculateHora({ date: new Date(), currentTime: new Date() });

// ยามปัจจุบัน (shorthand)
const current = getCurrentHora();

// ยาม ณ เวลาที่กำหนด
const at = getHoraAt(date, time);

// ยามมงคลสำหรับดาวที่เลือก
const auspicious = findAuspiciousHoras(date, ["jupiter", "venus"]);

// ยามมงคลตามกิจกรรม (business, love, finance, study, ...)
const businessHoras = findAuspiciousHorasByActivity(date, "business");
```

### Dashboard Helpers

```typescript
// Overview สำหรับหน้าแรก Dashboard
const overview = getDailyOverview();
// → { dayNameThai, currentHoraCard, nextHoraCard, topBusinessHoras, ... }

// Card data สำหรับ CurrentHoraCard component
const card = toCurrentHoraCard(horaResult);
// → { planet, progressPercent, minutesRemaining, badge, cardColor, ... }

// Table rows สำหรับ HoraTable component
const rows = toHoraTable(horaResult);
// → HoraTableRow[] พร้อม isCurrentMajor, isCurrentSlot
```

---

## 🔧 ติดตั้งใน Project (Monorepo)

### วาง engine ใน packages/engine/

```
hora-ai/
├── packages/
│   └── engine/       ← วางไฟล์ hora-engine/ ทั้งหมดไว้ที่นี่
│       ├── index.ts
│       ├── types/
│       ├── constants/
│       ├── utils/
│       ├── core/
│       └── helpers/
├── apps/
│   ├── web/          ← import from "@hora/engine"
│   └── mobile/       ← import from "@hora/engine"
```

### package.json (packages/engine)

```json
{
  "name": "@hora/engine",
  "version": "1.0.0",
  "main": "./index.ts",
  "exports": {
    ".": "./index.ts"
  }
}
```

### tsconfig path alias (apps/web/tsconfig.json)

```json
{
  "compilerOptions": {
    "paths": {
      "@/engine": ["../../packages/engine/index.ts"],
      "@/engine/*": ["../../packages/engine/*"]
    }
  }
}
```

---

## 📊 โมดูลแยกตาม Concern

| โมดูล | หน้าที่ | ใช้ใน |
|-------|---------|-------|
| `types/` | Type definitions | ทุกไฟล์ |
| `constants/planets.ts` | ข้อมูลดาว + เวลา | core, utils |
| `utils/time.ts` | แปลงเวลา | core, helpers |
| `utils/planet.ts` | Chaldean logic + scoring | core, helpers |
| `core/slot-builder.ts` | สร้างโครงสร้างยาม | calculator |
| `core/current-hora.ts` | หายามปัจจุบัน | calculator, dashboard |
| `core/calculator.ts` | Main engine API | helpers, UI |
| `helpers/dashboard.ts` | UI-ready data | Web Dashboard |

---

## ✅ Checklist ก่อน Deploy

- [ ] import path ถูกต้องทั้งหมด
- [ ] ไม่มี `require()` (ใช้ ES import เท่านั้น)
- [ ] TypeScript strict ผ่านทั้งหมด
- [ ] Unit tests ผ่าน (ดู hora-calculator.test.ts)
- [ ] ไม่ expose engine logic ฝั่ง client โดยตรง (ผ่าน API route เท่านั้น)
