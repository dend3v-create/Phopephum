# Thai Lunar Engine Production Architecture

ระบบนี้ออกแบบสำหรับ Web App โหราศาสตร์เลข 7 ตัว 9 ฐาน
โดยใช้ปฏิทินจันทรคติ 100 ปี เป็นแกนกลาง

รองรับ:

- Next.js
- Cloudflare Pages
- Antigravity IDE
- RAG
- AI Agent
- Modular Architecture
- TypeScript

---

# 1) Project Structure

```txt
src/
├── app/
│   └── api/
│       └── horoscope/
│           └── route.ts
│
├── lib/
│   └── astrology/
│
│       ├── core/
│       │   ├── lunarCalendar.ts
│       │   ├── thaiDate.ts
│       │   ├── geoLocation.ts
│       │   ├── astroTime.ts
│       │   └── ephemeris.ts
│
│       ├── calculators/
│       │   ├── sevenBase.ts
│       │   ├── nineBase.ts
│       │   ├── taksa.ts
│       │   ├── ageCycle.ts
│       │   ├── emperorChart.ts
│       │   ├── lagna.ts
│       │   ├── planetaryPower.ts
│       │   └── lunarPhase.ts
│
│       ├── datasets/
│       │   ├── lunar100year.json
│       │   ├── provinces.json
│       │   ├── planets.json
│       │   ├── taksa.json
│       │   └── meanings.json
│
│       ├── engine/
│       │   ├── horoscopeEngine.ts
│       │   ├── ragEngine.ts
│       │   ├── predictionEngine.ts
│       │   └── chartBuilder.ts
│
│       ├── prompts/
│       │   └── predictionPrompt.ts
│
│       └── types/
│           └── horoscope.ts
```

---

# 2) Install Dependencies

```bash
npm install dayjs tz-lookup swisseph
npm install cheerio axios
npm install openai
```

---

# 3) Horoscope Types

## src/lib/astrology/types/horoscope.ts

```ts
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
  lunar: LunarDate

  sevenBase: number[]
  nineBase: number[]

  taksa: string[]

  ageCycle: number

  emperorChart: any

  coordinates: {
    latitude: number
    longitude: number
  }
}
```

---

# 4) จังหวัดและพิกัด

## src/lib/astrology/datasets/provinces.json

```json
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
  },
  {
    "name": "เชียงใหม่",
    "latitude": 18.7883,
    "longitude": 98.9853
  }
]
```

---

# 5) Geo Location Engine

## src/lib/astrology/core/geoLocation.ts

```ts
import provinces from "../datasets/provinces.json"

export function getProvinceCoords(
  provinceName: string
) {
  const province = provinces.find(
    (p) => p.name === provinceName
  )

  if (!province) {
    throw new Error(
      "ไม่พบข้อมูลจังหวัด"
    )
  }

  return {
    latitude: province.latitude,
    longitude: province.longitude
  }
}
```

---

# 6) Lunar Calendar Dataset

## src/lib/astrology/datasets/lunar100year.json

```json
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

# 7) Thai Lunar Calendar Engine

## src/lib/astrology/core/lunarCalendar.ts

```ts
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
      "ไม่พบข้อมูลจันทรคติ"
    )
  }

  return result
}
```

---

# 8) Astro Time Engine

## src/lib/astrology/core/astroTime.ts

```ts
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

# 9) Seven Base Calculator

## src/lib/astrology/calculators/sevenBase.ts

```ts
export function calculateSevenBase(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number
) {
  return [
    lunarDay % 7 || 7,
    lunarMonth % 7 || 7,
    lunarYear % 7 || 7
  ]
}
```

---

# 10) Nine Base Calculator

## src/lib/astrology/calculators/nineBase.ts

```ts
export function calculateNineBase(
  values: number[]
) {
  return values.map(
    (v) => v % 9 || 9
  )
}
```

---

# 11) Taksa Calculator

## src/lib/astrology/calculators/taksa.ts

```ts
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

# 12) Age Cycle

## src/lib/astrology/calculators/ageCycle.ts

```ts
export function calculateAgeCycle(
  birthYear: number,
  currentYear: number
) {
  return currentYear - birthYear
}
```

---

# 13) Emperor Chart

## src/lib/astrology/calculators/emperorChart.ts

```ts
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

# 14) Horoscope Engine

## src/lib/astrology/engine/horoscopeEngine.ts

```ts
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

export async function horoscopeEngine(
  input: any
) {
  const lunar =
    getThaiLunarDate(
      input.birthDate
    )

  const coordinates =
    getProvinceCoords(
      input.province
    )

  const astroTime =
    convertBirthTime(
      input.birthTime
    )

  const sevenBase =
    calculateSevenBase(
      lunar.lunarDay,
      lunar.lunarMonth,
      lunar.lunarYear
    )

  const nineBase =
    calculateNineBase(
      sevenBase
    )

  const taksa =
    calculateTaksa(
      new Date(
        input.birthDate
      ).getDay()
    )

  const ageCycle =
    calculateAgeCycle(
      lunar.lunarYear,
      2569
    )

  const emperorChart =
    buildEmperorChart(
      sevenBase,
      nineBase,
      taksa
    )

  return {
    coordinates,
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

# 15) AI Prompt Builder

## src/lib/astrology/prompts/predictionPrompt.ts

```ts
export function buildPredictionPrompt(
  horoscopeData: any,
  ragContext: string
) {
  return `
คุณคือ AI นักพยากรณ์บำบัด

ข้อมูลดวง:
- เลข 7 ตัว: ${JSON.stringify(horoscopeData.sevenBase)}
- เลข 9 ฐาน: ${JSON.stringify(horoscopeData.nineBase)}
- วัยจร: ${horoscopeData.ageCycle}
- จังหวะชีวิต: ${horoscopeData.lunar.moonPhase}

องค์ความรู้:
${ragContext}

จงวิเคราะห์:
1. บุคลิก
2. จุดเด่น
3. จุดท้าทาย
4. การงาน
5. การเงิน
6. ความรัก
7. จิตวิญญาณ
8. แนวทางเติบโต
9. Affirmation
`
}
```

---

# 16) OpenAI Prediction Engine

## src/lib/astrology/engine/predictionEngine.ts

```ts
import OpenAI from "openai"

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function generatePrediction(
  prompt: string
) {
  const response =
    await client.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content:
            "คุณคือ AI นักพยากรณ์เชิง transformative learning"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.9
    })

  return response.choices[0]
    .message.content
}
```

---

# 17) API Route

## src/app/api/horoscope/route.ts

```ts
import { NextRequest }
from "next/server"

import { NextResponse }
from "next/server"

import { horoscopeEngine }
from "@/lib/astrology/engine/horoscopeEngine"

import { buildPredictionPrompt }
from "@/lib/astrology/prompts/predictionPrompt"

import { generatePrediction }
from "@/lib/astrology/engine/predictionEngine"

export async function POST(
  req: NextRequest
) {
  try {

    const body =
      await req.json()

    const horoscopeData =
      await horoscopeEngine(body)

    const ragContext = `
    พื้นฐานดวงมีพลังของนักวางระบบ
    และมีแนวโน้มเติบโตด้านการพัฒนา
    จิตใจภายใน
    `

    const prompt =
      buildPredictionPrompt(
        horoscopeData,
        ragContext
      )

    const prediction =
      await generatePrediction(prompt)

    return NextResponse.json({
      success: true,
      data: horoscopeData,
      prediction
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

# 18) Frontend Dashboard Example

## src/app/dashboard/page.tsx

```tsx
async function getHoroscope() {

  const response = await fetch(
    "/api/horoscope",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        birthDate: "1982-03-25",
        birthTime: "07:20",
        province: "หนองคาย"
      })
    }
  )

  return response.json()
}

export default async function Dashboard() {

  const result =
    await getHoroscope()

  return (
    <div>

      <h1>
        ผังดวงจักรพรรดิ
      </h1>

      <pre>
        {JSON.stringify(
          result,
          null,
          2
        )}
      </pre>

    </div>
  )
}
```

---

# 19) ระบบ RAG ที่ควรเชื่อม

แนะนำ:

- Pinecone
- Supabase Vector
- Weaviate
- ChromaDB
- Qdrant

---

# 20) ขั้นต่อไปที่สำคัญมาก

## ย้ายสูตรจาก Google Sheet ออกมาเป็น:

```txt
/calculators
/rules
/core
```

เช่น:

```txt
calculateLagna()
calculatePlanetaryPower()
calculateNawangka()
calculateMoonPhase()
calculateTransit()
calculateAuspiciousTime()
```

---

# 21) Production Architecture

```txt
User Input
    ↓
Thai Lunar Calendar
    ↓
Geo Location Engine
    ↓
Astrology Calculators
    ↓
Rule Engine
    ↓
RAG Knowledge
    ↓
AI Narrative Engine
    ↓
Prediction Output
```

---

# 22) สิ่งที่ควรทำต่อทันที

## Phase 1

- สร้าง JSON ปฏิทิน 100 ปี
- สร้าง Lunar Engine
- เชื่อมจังหวัดและพิกัด

## Phase 2

- ทำลัคนา
- ทำดาวจร
- ทำเรือนชะตา
- ทำกำลังดาว

## Phase 3

- เชื่อม RAG
- เชื่อม AI Agent
- ทำ Prompt Routing
- ทำ Personalized Prediction

---

# 23) เป้าหมายสุดท้าย

สร้าง

"Astrology AI Operating System"

ที่รวม:

- โหราศาสตร์
- AI
- RAG
- Coaching
- Transformative Learning
- Behavioral Psychology
- Personal Growth

อยู่บน Engine เดียวกัน

---

# 24) Ephemeris Engine (ระบบดาวจร ลัคนา และองศาดาว)

ระบบนี้คือหัวใจสำคัญของการคำนวณดวงระดับจักรพรรดิ
โดยใช้:

- วันเกิด
- เวลาเกิด
- พิกัดเกิด
- Timezone
- Julian Day
- Swiss Ephemeris

ในการคำนวณ:

- ลัคนา
- องศาดาว
- เรือนชะตา
- ดาวจร
- มุมสัมพันธ์ดาว

---

# Install Swiss Ephemeris

```bash
npm install swisseph
```

---

# 25) Ephemeris Core

## src/lib/astrology/core/ephemeris.ts

```ts
import swisseph from "swisseph"

swisseph.swe_set_ephe_path("./ephe")

export async function calculatePlanetPosition(
  julianDay: number,
  planet: number
) {
  return new Promise((resolve, reject) => {

    swisseph.swe_calc_ut(
      julianDay,
      planet,
      swisseph.SEFLG_SPEED,
      (result: any) => {

        if (result.error) {
          reject(result.error)
          return
        }

        resolve({
          longitude: result.longitude,
          latitude: result.latitude,
          distance: result.distance,
          speed: result.speedLong
        })
      }
    )
  })
}
```

---

# 26) Julian Day Converter

## src/lib/astrology/core/julianDay.ts

```ts
import swisseph from "swisseph"

export function createJulianDay(
  year: number,
  month: number,
  day: number,
  hourDecimal: number
) {
  return swisseph.swe_julday(
    year,
    month,
    day,
    hourDecimal,
    swisseph.SE_GREG_CAL
  )
}
```

---

# 27) ลัคนา (Ascendant)

## src/lib/astrology/calculators/lagna.ts

```ts
import swisseph from "swisseph"

export async function calculateLagna(
  julianDay: number,
  latitude: number,
  longitude: number
) {
  return new Promise((resolve, reject) => {

    swisseph.swe_houses(
      julianDay,
      latitude,
      longitude,
      "P",
      (result: any) => {

        if (result.error) {
          reject(result.error)
          return
        }

        resolve({
          ascendant: result.ascendant,
          mc: result.mc,
          houses: result.house
        })
      }
    )
  })
}
```

---

# 28) ระบบราศี

## src/lib/astrology/core/zodiac.ts

```ts
const zodiacSigns = [
  "เมษ",
  "พฤษภ",
  "มิถุน",
  "กรกฎ",
  "สิงห์",
  "กันย์",
  "ตุลย์",
  "พิจิก",
  "ธนู",
  "มังกร",
  "กุมภ์",
  "มีน"
]

export function getZodiacSign(
  longitude: number
) {
  const index = Math.floor(
    longitude / 30
  )

  return zodiacSigns[index]
}
```

---

# 29) Planetary Power Engine

## src/lib/astrology/calculators/planetaryPower.ts

```ts
export function calculatePlanetaryPower(
  longitude: number
) {

  const degreeInSign =
    longitude % 30

  if (
    degreeInSign >= 0 &&
    degreeInSign <= 10
  ) {
    return "เข้มแข็ง"
  }

  if (
    degreeInSign > 10 &&
    degreeInSign <= 20
  ) {
    return "ปานกลาง"
  }

  return "แปรปรวน"
}
```

---

# 30) ดาวจร (Transit Engine)

## src/lib/astrology/calculators/transit.ts

```ts
import swisseph from "swisseph"

import { calculatePlanetPosition }
from "../core/ephemeris"

export async function calculateTransit(
  julianDay: number
) {

  const jupiter =
    await calculatePlanetPosition(
      julianDay,
      swisseph.SE_JUPITER
    )

  const saturn =
    await calculatePlanetPosition(
      julianDay,
      swisseph.SE_SATURN
    )

  return {
    jupiter,
    saturn
  }
}
```

---

# 31) House Mapping Engine

## src/lib/astrology/calculators/houseMapping.ts

```ts
export function mapPlanetToHouse(
  longitude: number,
  houses: number[]
) {

  for (let i = 0; i < houses.length; i++) {

    const current = houses[i]
    const next = houses[i + 1] || 360

    if (
      longitude >= current &&
      longitude < next
    ) {
      return i + 1
    }
  }

  return 1
}
```

---

# 32) Full Birth Chart Engine

## src/lib/astrology/engine/chartBuilder.ts

```ts
import swisseph from "swisseph"

import { createJulianDay }
from "../core/julianDay"

import { calculateLagna }
from "../calculators/lagna"

import { calculatePlanetPosition }
from "../core/ephemeris"

import { getZodiacSign }
from "../core/zodiac"

import { mapPlanetToHouse }
from "../calculators/houseMapping"

export async function buildBirthChart(
  input: any,
  coordinates: any
) {

  const birth = new Date(
    `${input.birthDate}T${input.birthTime}:00`
  )

  const year = birth.getFullYear()
  const month = birth.getMonth() + 1
  const day = birth.getDate()

  const hourDecimal =
    birth.getHours() +
    birth.getMinutes() / 60

  const julianDay =
    createJulianDay(
      year,
      month,
      day,
      hourDecimal
    )

  const lagna =
    await calculateLagna(
      julianDay,
      coordinates.latitude,
      coordinates.longitude
    )

  const sun =
    await calculatePlanetPosition(
      julianDay,
      swisseph.SE_SUN
    )

  const moon =
    await calculatePlanetPosition(
      julianDay,
      swisseph.SE_MOON
    )

  return {
    julianDay,

    ascendant: {
      degree: lagna.ascendant,
      sign: getZodiacSign(
        lagna.ascendant
      )
    },

    planets: {
      sun: {
        longitude: sun.longitude,
        sign: getZodiacSign(
          sun.longitude
        ),
        house: mapPlanetToHouse(
          sun.longitude,
          lagna.houses
        )
      },

      moon: {
        longitude: moon.longitude,
        sign: getZodiacSign(
          moon.longitude
        ),
        house: mapPlanetToHouse(
          moon.longitude,
          lagna.houses
        )
      }
    },

    houses: lagna.houses
  }
}
```

---

# 33) Update Horoscope Engine

เพิ่มใน horoscopeEngine.ts

```ts
import { buildBirthChart }
from "./chartBuilder"
```

และเพิ่ม:

```ts
const birthChart =
  await buildBirthChart(
    input,
    coordinates
  )
```

ส่งกลับ:

```ts
birthChart
```

---

# 34) โครงสร้างผลลัพธ์ดวงเต็ม

```json
{
  "ascendant": {
    "degree": 120.45,
    "sign": "กรกฎ"
  },

  "planets": {
    "sun": {
      "longitude": 15.2,
      "sign": "เมษ",
      "house": 10
    },

    "moon": {
      "longitude": 180.5,
      "sign": "ตุลย์",
      "house": 4
    }
  }
}
```

---

# 35) สิ่งที่ควรทำต่อทันที

## เพิ่ม:

- ดาวทั้ง 9
- ราหู
- เกตุ
- มฤตยู
- นวางค์
- องศาเกษตร
- องศาอุจจ์
- องศาประ
- มุมสัมพันธ์ดาว
- ดาวจรปัจจุบัน
- ยามอัฐกาล
- ลัคนาจร
- ดิถี
- ฤกษ์
- ฤกษ์บนฤกษ์ล่าง

---

# 36) เป้าหมายระดับ Production

สร้างระบบ:

"Thai Astrology Computation Engine"

ที่สามารถ:

- คำนวณดวงเต็ม
- วิเคราะห์ดาวจร
- วิเคราะห์วัยจร
- วิเคราะห์จิตวิทยาเชิงลึก
- เชื่อม RAG
- เชื่อม AI Agent
- สร้างคำพยากรณ์เฉพาะบุคคล
- วิเคราะห์ Pattern ชีวิต
- วิเคราะห์จังหวะเวลา

บน Engine เดียว

