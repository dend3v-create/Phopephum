# โครงสร้างระบบ “ยามอัฐกาล Engine”

จากตำรา + ตารางที่คุณแนบมา
สามารถถอดเป็น “Modular TypeScript Architecture” สำหรับใช้งานใน:

* Next.js
* Cloudflare Workers
* Supabase
* Claude Code
* Antigravity IDE

ได้ทันที

---

# โครงสร้างระบบที่แนะนำ

```txt
/src
 ├── modules
 │    └── yam
 │         ├── constants
 │         │     ├── dayMap.ts
 │         │     ├── yamDayTable.ts
 │         │     ├── yamNightTable.ts
 │         │     ├── yamMeaning.ts
 │         │     └── phaseMeaning.ts
 │         │
 │         ├── core
 │         │     ├── timeUtils.ts
 │         │     ├── yamCalculator.ts
 │         │     ├── phaseCalculator.ts
 │         │     └── predictionEngine.ts
 │         │
 │         ├── types
 │         │     └── yam.types.ts
 │         │
 │         ├── services
 │         │     └── yamService.ts
 │         │
 │         └── index.ts
```

---

# 1) Types

## `/types/yam.types.ts`

```ts
export type DayName =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export type PeriodType = "day" | "night";

export type PhaseType = "start" | "middle" | "end";

export interface YamResult {
  date: Date;
  dayName: DayName;
  period: PeriodType;
  yamNumber: number;
  yamName: string;
  phase: PhaseType;
  prediction?: PredictionResult;
}

export interface PredictionResult {
  news: string;
  sickness: string;
  lostItem: string;
  travel: {
    start: string;
    middle: string;
    end: string;
  };
}
```

---

# 2) ตารางยามกลางวัน

## `/constants/yamDayTable.ts`

```ts
import { DayName } from "../types/yam.types";

export const yamDayTable: Record<DayName, string[]> = {
  sunday: [
    "สุริยะ",
    "ศุกระ",
    "พุธ",
    "จันเทา",
    "เสาร์",
    "ครู",
    "ภูมมะ",
    "สุริยะ",
  ],

  monday: [
    "จันเทา",
    "เสาร์",
    "ครู",
    "ภูมมะ",
    "สุริยะ",
    "ศุกระ",
    "พุธ",
    "จันเทา",
  ],

  tuesday: [
    "ภูมมะ",
    "สุริยะ",
    "ศุกระ",
    "พุธ",
    "จันเทา",
    "เสาร์",
    "ครู",
    "ภูมมะ",
  ],

  wednesday: [
    "พุธ",
    "จันเทา",
    "เสาร์",
    "ครู",
    "ภูมมะ",
    "สุริยะ",
    "ศุกระ",
    "พุธ",
  ],

  thursday: [
    "ครู",
    "ภูมมะ",
    "สุริยะ",
    "ศุกระ",
    "พุธ",
    "จันเทา",
    "เสาร์",
    "ครู",
  ],

  friday: [
    "ศุกระ",
    "พุธ",
    "จันเทา",
    "เสาร์",
    "ครู",
    "ภูมมะ",
    "สุริยะ",
    "ศุกระ",
  ],

  saturday: [
    "เสาร์",
    "ครู",
    "ภูมมะ",
    "สุริยะ",
    "ศุกระ",
    "พุธ",
    "จันเทา",
    "เสาร์",
  ],
};
```

---

# 3) ตารางยามกลางคืน

## `/constants/yamNightTable.ts`

```ts
import { DayName } from "../types/yam.types";

export const yamNightTable: Record<DayName, string[]> = {
  sunday: [
    "รวี",
    "ชีโว",
    "คะดิ",
    "ศุภโร",
    "ภูมโม",
    "โสโร",
    "พุทโธ",
    "รวี",
  ],

  monday: [
    "คะดิ",
    "ศุภโร",
    "ภูมโม",
    "โสโร",
    "พุทโธ",
    "รวี",
    "ชีโว",
    "คะดิ",
  ],

  tuesday: [
    "ภูมโม",
    "โสโร",
    "พุทโธ",
    "รวี",
    "ชีโว",
    "คะดิ",
    "ศุภโร",
    "ภูมโม",
  ],

  wednesday: [
    "พุทโธ",
    "รวี",
    "ชีโว",
    "คะดิ",
    "ศุภโร",
    "ภูมโม",
    "โสโร",
    "พุทโธ",
  ],

  thursday: [
    "ชีโว",
    "คะดิ",
    "ศุภโร",
    "ภูมโม",
    "โสโร",
    "พุทโธ",
    "รวี",
    "ชีโว",
  ],

  friday: [
    "ศุภโร",
    "ภูมโม",
    "โสโร",
    "พุทโธ",
    "รวี",
    "ชีโว",
    "คะดิ",
    "ศุภโร",
  ],

  saturday: [
    "โสโร",
    "พุทโธ",
    "รวี",
    "ชีโว",
    "คะดิ",
    "ศุภโร",
    "ภูมโม",
    "โสโร",
  ],
};
```

---

# 4) Time Utils

## `/core/timeUtils.ts`

```ts
export function getMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function isDayTime(minutes: number): boolean {
  return minutes >= 360 && minutes < 1080;
}
```

---

# 5) คำนวณยาม

## `/core/yamCalculator.ts`

```ts
import { yamDayTable } from "../constants/yamDayTable";
import { yamNightTable } from "../constants/yamNightTable";
import { DayName } from "../types/yam.types";
import { getMinutes, isDayTime } from "./timeUtils";

const dayNames: DayName[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function calculateYam(date: Date) {
  const dayName = dayNames[date.getDay()];
  const minutes = getMinutes(date);

  const dayTime = isDayTime(minutes);

  let yamIndex = 0;

  if (dayTime) {
    yamIndex = Math.floor((minutes - 360) / 90);
  } else {
    const adjusted =
      minutes < 360 ? minutes + 360 : minutes - 1080;

    yamIndex = Math.floor(adjusted / 90);
  }

  const table = dayTime
    ? yamDayTable[dayName]
    : yamNightTable[dayName];

  return {
    dayName,
    period: dayTime ? "day" : "night",
    yamNumber: yamIndex + 1,
    yamName: table[yamIndex],
  };
}
```

---

# 6) คำนวณยามต้น กลาง ปลาย

## `/core/phaseCalculator.ts`

```ts
import { PhaseType } from "../types/yam.types";

export function calculatePhase(date: Date): PhaseType {
  const minute = date.getMinutes();

  if (minute < 30) {
    return "start";
  }

  if (minute < 60) {
    return "middle";
  }

  return "end";
}
```

---

# 7) ฐานข้อมูลคำพยากรณ์

## `/constants/yamMeaning.ts`

```ts
export const yamMeaning = {
  สุริยะ: {
    news: "เรื่องจริง เชื่อถือได้",
    sickness: "อาการหนัก",
    lostItem: "อยู่ที่สูง ใกล้แสงไฟ",
  },

  จันเทา: {
    news: "จริงครึ่งเท็จครึ่ง",
    sickness: "เรื้อรัง",
    lostItem: "อยู่ใกล้น้ำ",
  },

  ภูมมะ: {
    news: "ข่าวลวง",
    sickness: "หายเร็ว",
    lostItem: "ใกล้เครื่องมือช่าง",
  },

  พุธ: {
    news: "เชื่อถือได้",
    sickness: "อันตราย",
    lostItem: "ใกล้เอกสาร",
  },

  เสาร์: {
    news: "จริง",
    sickness: "รักษานาน",
    lostItem: "อยู่มืด ๆ",
  },

  ครู: {
    news: "ยังไม่ชัด",
    sickness: "ต้องใช้ยา",
    lostItem: "ใกล้ตำรา",
  },

  ศุกระ: {
    news: "ไม่จริง",
    sickness: "หายได้",
    lostItem: "ใกล้เสื้อผ้า",
  },
};
```

---

# 8) Prediction Engine

## `/core/predictionEngine.ts`

```ts
import { yamMeaning } from "../constants/yamMeaning";

export function getPrediction(yamName: string) {
  return yamMeaning[yamName as keyof typeof yamMeaning];
}
```

---

# 9) Service Layer

## `/services/yamService.ts`

```ts
import { calculateYam } from "../core/yamCalculator";
import { calculatePhase } from "../core/phaseCalculator";
import { getPrediction } from "../core/predictionEngine";

export function getYamPrediction(date: Date) {
  const yam = calculateYam(date);

  const phase = calculatePhase(date);

  const prediction = getPrediction(yam.yamName);

  return {
    ...yam,
    phase,
    prediction,
  };
}
```

---

# 10) Export

## `/index.ts`

```ts
export * from "./services/yamService";
```

---

# วิธีใช้งานใน Dashboard

## React Example

```tsx
"use client";

import { getYamPrediction } from "@/modules/yam";

export default function YamCard() {
  const result = getYamPrediction(new Date());

  return (
    <div>
      <h2>{result.yamName}</h2>

      <p>ช่วง: {result.phase}</p>

      <p>{result.prediction?.news}</p>
    </div>
  );
}
```

---

# จุดเด่น Architecture นี้

## รองรับ:

* RAG AI
* Supabase
* JSON Rules
* Dynamic Prompt
* Claude Code
* Antigravity IDE
* Cloudflare Workers

---

# Phase ถัดไปที่ควรทำ

## 1) Dynamic Sunrise/Sunset

แทน fix 06:00 / 18:00

ใช้:

* suncalc
* dayjs

---

## 2) AI Prompt Layer

```ts
generatePrediction({
  yam: "พุธ",
  phase: "middle",
  topic: "travel"
})
```

---

## 3) Rule Engine JSON

```json id="yam-rule"
{
  "yam": "พุธ",
  "topic": "travel",
  "phase": "middle",
  "prediction": "เดินทางแล้วสำเร็จ"
}
```

---

# สถาปัตยกรรมที่ถูกต้องจริง ๆ

สิ่งที่คุณกำลังสร้างคือ

## “Temporal Divination Engine”

หรือ

## “Thai Astro Timing Intelligence System”

ซึ่งสามารถต่อยอดเป็น:

* AI ฤกษ์ยาม
* AI โหราศาสตร์ไทย
* AI พยากรณ์เหตุการณ์
* AI วิเคราะห์เวลาเหมาะสม
* AI Human Timing Advisor

ได้ครบทั้งระบบในอนาคต
