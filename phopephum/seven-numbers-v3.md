โครงสร้างด้านล่างนี้ คือ “Production Architecture” สำหรับระบบผูกดวงชะตา
ตามหลัก “เลข 7 ตัว 9 ฐาน จันทรคติ 100 ปี”
ที่ออกแบบให้ใช้ได้จริงกับ

[Hora Time Web App](https://hora-time.pages.dev/?utm_source=chatgpt.com)

โดยเน้น

* คำนวณแบบ Modular
* อิงปฏิทินจันทรคติ 100 ปี
* รองรับจังหวัด/พิกัดเกิด
* รองรับ Timezone
* รองรับ AI Agent + RAG
* รองรับ Cloudflare + Next.js

---

# Architecture ที่ควรใช้

```txt id="2q6kkn"
src/
├── lib/
│   └── astrology/
│
│       ├── core/
│       │   ├── lunarCalendar.ts
│       │   ├── thaiDateConverter.ts
│       │   ├── astroTime.ts
│       │   ├── geoLocation.ts
│       │   └── ephemeris.ts
│
│       ├── calculators/
│       │   ├── sevenBase.ts
│       │   ├── nineBase.ts
│       │   ├── emperorChart.ts
│       │   ├── transit.ts
│       │   ├── taksa.ts
│       │   ├── ageCycle.ts
│       │   ├── lunarPhase.ts
│       │   └── planetaryPower.ts
│
│       ├── datasets/
│       │   ├── lunar100year.json
│       │   ├── provinces.json
│       │   ├── taksa.json
│       │   ├── planets.json
│       │   └── meanings.json
│
│       ├── engine/
│       │   ├── horoscopeEngine.ts
│       │   ├── chartBuilder.ts
│       │   ├── ragEngine.ts
│       │   └── predictionEngine.ts
│
│       ├── prompts/
│       └── types/
```

---

# STEP 1 — TYPE DEFINITIONS

## `/types/horoscope.ts`

```ts id="mwdjlwm"
export interface BirthInput {
  fullName?: string

  birthDate: string
  birthTime: string

  province: string

  latitude?: number
  longitude?: number
}

export interface LunarDate {
  lunarDay: number
  lunarMonth: number
  lunarYear: number

  moonPhase: string
}

export interface HoroscopeResult {
  sevenBase: number[]
  nineBase: number[]

  taksa: string[]

  ageCycle: number

  lunar: LunarDate

  emperorChart: any
}
```

---

# STEP 2 — ปฏิทินจันทรคติ 100 ปี

## `/datasets/lunar100year.json`

ตัวอย่างโครงสร้าง

```json id="r6v7xj"
{
  "1982-03-25": {
    "lunarDay": 1,
    "lunarMonth": 5,
    "lunarYear": 2525,
    "moonPhase": "ขึ้น 1 ค่ำ"
  }
}
```

---

# STEP 3 — THAI LUNAR CONVERTER

## `/core/lunarCalendar.ts`

```ts id="5xjlwm"
import lunarData
from "../datasets/lunar100year.json"

export function getThaiLunarDate(
  date: string
) {
  const result =
    lunarData[
      date as keyof typeof lunarData
    ]

  if (!result) {
    throw new Error(
      "ไม่พบข้อมูลปฏิทินจันทรคติ"
    )
  }

  return result
}
```

---

# STEP 4 — LOCATION ENGINE

## `/core/geoLocation.ts`

```ts id="wdjlwm"
import provinces
from "../datasets/provinces.json"

export function getProvinceCoords(
  provinceName: string
) {
  const province = provinces.find(
    (p) => p.name === provinceName
  )

  if (!province) {
    throw new Error(
      "ไม่พบจังหวัด"
    )
  }

  return {
    latitude: province.latitude,
    longitude: province.longitude
  }
}
```

---

# ตัวอย่าง provinces.json

```json id="3jlwmn"
[
  {
    "name": "กรุงเทพมหานคร",
    "latitude": 13.7563,
    "longitude": 100.5018
  },
  {
    "name": "หนองคาย",
    "latitude": 17.8783,
    "longitude": 102.7413
  }
]
```

---

# STEP 5 — เวลาโหราศาสตร์

## `/core/astroTime.ts`

```ts id="jjlwmn"
export function convertBirthTime(
  birthTime: string
) {
  const [hour, minute] =
    birthTime.split(":").map(Number)

  const totalMinutes =
    hour * 60 + minute

  return {
    hour,
    minute,
    totalMinutes
  }
}
```

---

# STEP 6 — ระบบเลข 7 ตัว

## `/calculators/sevenBase.ts`

```ts id="djlwmn"
export function calculateSevenBase(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number
) {
  const result = [
    lunarDay % 7 || 7,
    lunarMonth % 7 || 7,
    lunarYear % 7 || 7
  ]

  return result
}
```

---

# STEP 7 — ระบบ 9 ฐาน

## `/calculators/nineBase.ts`

```ts id="tjlwmn"
export function calculateNineBase(
  values: number[]
) {
  return values.map(
    (v) => v % 9 || 9
  )
}
```

---

# STEP 8 — ทักษา

## `/calculators/taksa.ts`

```ts id="wjlwmn"
const taksaMap = [
  "บริวาร",
  "อายุ",
  "เดช",
  "ศรี",
  "มูละ",
  "อุตสาหะ",
  "มนตรี",
  "กาลกิณี"
]

export function calculateTaksa(
  birthDay: number
) {
  return taksaMap.map(
    (_, index) =>
      taksaMap[
        (birthDay + index)
        % taksaMap.length
      ]
  )
}
```

---

# STEP 9 — วัยจร

## `/calculators/ageCycle.ts`

```ts id="zjlwmn"
export function calculateAgeCycle(
  birthYear: number,
  currentYear: number
) {
  return currentYear - birthYear
}
```

---

# STEP 10 — จัดผังดวงจักรพรรดิ

## `/calculators/emperorChart.ts`

```ts id="fjlwmn"
export function buildEmperorChart(
  sevenBase: number[],
  nineBase: number[],
  taksa: string[]
) {
  return {
    destiny: sevenBase[0],
    wealth: nineBase[1],
    work: taksa[2]
  }
}
```

---

# STEP 11 — HOROSCOPE ENGINE

## `/engine/horoscopeEngine.ts`

```ts id="xjlwmq"
import { getThaiLunarDate }
from "../core/lunarCalendar"

import { getProvinceCoords }
from "../core/geoLocation"

import { convertBirthTime }
from "../core/astroTime"

import { calculateSevenBase }
from "../calculators/sevenBase"

import { calculateNineBase }
from "../calculators/nineBase"

import { calculateTaksa }
from "../calculators/taksa"

import { calculateAgeCycle }
from "../calculators/ageCycle"

import { buildEmperorChart }
from "../calculators/emperorChart"

export async function
horoscopeEngine(input: any) {

  // 1) ดึงจันทรคติ
  const lunar =
    getThaiLunarDate(
      input.birthDate
    )

  // 2) พิกัดจังหวัด
  const coords =
    getProvinceCoords(
      input.province
    )

  // 3) เวลาเกิด
  const astroTime =
    convertBirthTime(
      input.birthTime
    )

  // 4) คำนวณเลข 7 ตัว
  const sevenBase =
    calculateSevenBase(
      lunar.lunarDay,
      lunar.lunarMonth,
      lunar.lunarYear
    )

  // 5) คำนวณ 9 ฐาน
  const nineBase =
    calculateNineBase(
      sevenBase
    )

  // 6) ทักษา
  const taksa =
    calculateTaksa(
      new Date(
        input.birthDate
      ).getDay()
    )

  // 7) วัยจร
  const ageCycle =
    calculateAgeCycle(
      lunar.lunarYear,
      2569
    )

  // 8) ผังจักรพรรดิ
  const emperorChart =
    buildEmperorChart(
      sevenBase,
      nineBase,
      taksa
    )

  return {
    coords,
    astroTime,

    lunar,

    sevenBase,
    nineBase,

    taksa,

    ageCycle,

    emperorChart
  }
}
```

---

# STEP 12 — API ROUTE

## `/app/api/horoscope/route.ts`

```ts id="5jlwmn"
import { NextRequest }
from "next/server"

import { NextResponse }
from "next/server"

import { horoscopeEngine }
from "@/lib/astrology/engine/horoscopeEngine"

export async function POST(
  req: NextRequest
) {
  try {

    const body =
      await req.json()

    const result =
      await horoscopeEngine(body)

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {

    return NextResponse.json({
      success: false,
      error: String(error)
    })
  }
}
```

---

# STEP 13 — Frontend Dashboard

## `/dashboard/page.tsx`

```tsx id="7jlwmn"
const response = await fetch(
  "/api/horoscope",
  {
    method: "POST",
    headers: {
      "Content-Type":
        "application/json"
    },

    body: JSON.stringify({
      birthDate: "1982-03-25",
      birthTime: "07:20",
      province: "หนองคาย"
    })
  }
)

const result =
  await response.json()

console.log(result)
```

---

# จุดสำคัญมาก

## สูตรจริงของเลข 7 ตัว 9 ฐาน

ครูเด่นควร “แยกทุกสูตร” ออกจาก UI

เช่น

```txt id="kjlwmn"
calculateLagna()
calculateTaksa()
calculateNawangka()
calculateAuspiciousTime()
calculatePlanetaryPower()
calculateMoonPhase()
```

เพราะอนาคตจะเชื่อม

* AI
* RAG
* Agent Skill
* Prompt Routing
* Multi-Model

ได้ง่ายมาก

---

# สิ่งที่ควรทำต่อทันที

## 1) สร้าง JSON จากปฏิทิน 100 ปี

อิงจาก

[MyHora Calendar](https://myhora.com/calendar/?utm_source=chatgpt.com)

และ

[Thai Astro Calendar 2569](https://myhora.com/calendar/thai-astro-2569.aspx?utm_source=chatgpt.com)

---

## 2) ทำ Ephemeris Engine

สำหรับ

* ดาวจร
* ลัคนา
* องศาดาว
* เรือนชะตา

---

## 3) สร้าง Rule Engine

```txt id="jlwmna"
/rules
```

เช่น

```ts id="jlwmnb"
if (
  sevenBase[0] === 7
  &&
  ageCycle > 40
)
```

---

# Architecture สุดท้ายที่ควรไปให้ถึง

```txt id="jlwmnc"
User Input
   ↓
Thai Lunar Engine
   ↓
7 Base Engine
   ↓
9 Base Engine
   ↓
Astrology Rules
   ↓
RAG Knowledge
   ↓
AI Interpretation
   ↓
Prediction Output
```

นี่คือโครงสร้างที่ “พร้อม Production”
และสามารถใช้กับระบบ AI พยากรณ์ระดับลึกได้จริงครับ
