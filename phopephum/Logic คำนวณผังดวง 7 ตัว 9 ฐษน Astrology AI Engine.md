โครงสร้างด้านล่างนี้ คือ “Astrology AI Engine” ที่พร้อมนำไปวางใน Antigravity IDE ได้ทันที
โดยออกแบบให้

* รองรับ RAG Knowledge Base
* รองรับ Agent Skill
* แยก Logic คำนวณออกจาก AI
* ต่อ OpenAI / Local LLM ได้
* ใช้กับ Next.js + Cloudflare ได้ทันที

---

# โครงสร้างโปรเจกต์

```txt id="38zjlwm"
src/
├── app/
│   └── api/
│       └── horoscope/
│           └── route.ts
│
├── lib/
│   └── astrology/
│
│       ├── calculators/
│       │   ├── calculateBase.ts
│       │   ├── calculatePower.ts
│       │   ├── calculateHouse.ts
│       │   └── calculateTransit.ts
│
│       ├── datasets/
│       │   ├── meanings.json
│       │   ├── houses.json
│       │   └── planets.json
│
│       ├── engine/
│       │   ├── horoscopeEngine.ts
│       │   ├── ragContextEngine.ts
│       │   └── aiNarrativeEngine.ts
│
│       ├── prompts/
│       │   └── predictionPrompt.ts
│
│       └── types/
│           └── horoscope.ts
```

---

# 1) TYPE DEFINITIONS

## `/types/horoscope.ts`

```ts id="9g76xt"
export interface HoroscopeInput {
  name?: string
  birthDate: string
  birthTime: string
}

export interface HoroscopeResult {
  base: number
  power: number
  house: string
  transit: string
}
```

---

# 2) CALCULATORS

## `/calculators/calculateBase.ts`

```ts id="j9d6q5"
export function calculateBase(day: number): number {
  return day % 9 || 9
}
```

---

## `/calculators/calculatePower.ts`

```ts id="rdt17n"
export function calculatePower(values: number[]): number {
  return values.reduce((sum, val) => sum + val, 0)
}
```

---

## `/calculators/calculateHouse.ts`

```ts id="es7t9z"
const houses = [
  "ตนุ",
  "กดุมภะ",
  "สหัชชะ",
  "พันธุ",
  "ปุตตะ",
  "อริ",
  "ปัตนิ",
  "มรณะ",
  "ศุภะ"
]

export function calculateHouse(base: number): string {
  return houses[(base - 1) % houses.length]
}
```

---

## `/calculators/calculateTransit.ts`

```ts id="jlwmk8"
export function calculateTransit(month: number): string {
  const transits = [
    "เริ่มต้นใหม่",
    "ขยายงาน",
    "พัฒนาความสัมพันธ์",
    "ปรับโครงสร้าง",
    "เติบโตด้านการเงิน",
    "สะสางกรรมเก่า",
    "ขยายเครือข่าย",
    "เก็บเกี่ยวผลลัพธ์",
    "เชื่อมโยงจิตวิญญาณ",
    "เปิดพลังใหม่",
    "สร้างชื่อเสียง",
    "เปลี่ยนผ่านครั้งสำคัญ"
  ]

  return transits[month - 1]
}
```

---

# 3) DATASET

## `/datasets/meanings.json`

```json id="kl2f3i"
{
  "1": {
    "title": "ผู้นำ",
    "strength": "กล้าตัดสินใจ",
    "challenge": "แบกรับมากเกินไป"
  },
  "2": {
    "title": "นักประสานงาน",
    "strength": "เข้าใจคน",
    "challenge": "ลังเลง่าย"
  },
  "7": {
    "title": "นักวางระบบ",
    "strength": "คิดลึก วิเคราะห์เก่ง",
    "challenge": "เครียดง่าย"
  }
}
```

---

# 4) HOROSCOPE ENGINE

## `/engine/horoscopeEngine.ts`

```ts id="9w9f2j"
import { calculateBase } from "../calculators/calculateBase"
import { calculatePower } from "../calculators/calculatePower"
import { calculateHouse } from "../calculators/calculateHouse"
import { calculateTransit } from "../calculators/calculateTransit"

import { HoroscopeInput } from "../types/horoscope"

export async function horoscopeEngine(
  input: HoroscopeInput
) {
  const birth = new Date(input.birthDate)

  const day = birth.getDate()
  const month = birth.getMonth() + 1
  const year = birth.getFullYear()

  const base = calculateBase(day)

  const power = calculatePower([
    day,
    month,
    year
  ])

  const house = calculateHouse(base)

  const transit = calculateTransit(month)

  return {
    base,
    power,
    house,
    transit
  }
}
```

---

# 5) RAG CONTEXT ENGINE

เชื่อมกับคลังองค์ความรู้

## `/engine/ragContextEngine.ts`

```ts id="hjlwmn"
export async function getRagContext(
  horoscopeData: any
) {
  /*
    ตรงนี้เชื่อมกับ:
    - Pinecone
    - Supabase Vector
    - Weaviate
    - LangChain
    - Local Vector DB
  */

  const context = `
  บุคคลฐาน ${horoscopeData.base}
  มีแนวโน้มด้านการพัฒนาภายในสูง
  เหมาะกับการสร้างระบบชีวิต
  `

  return context
}
```

---

# 6) PROMPT ENGINE

## `/prompts/predictionPrompt.ts`

```ts id="rjlwmn"
export function buildPredictionPrompt(
  data: any,
  ragContext: string
) {
  return `
คุณคือ AI นักพยากรณ์บำบัดเชิงลึก

ข้อมูลดวง:
- ฐาน: ${data.base}
- ภพ: ${data.house}
- กำลัง: ${data.power}
- จังหวะชีวิต: ${data.transit}

องค์ความรู้:
${ragContext}

จงวิเคราะห์:
1. บุคลิกภายใน
2. จุดเด่น
3. จุดท้าทาย
4. งาน
5. การเงิน
6. ความสัมพันธ์
7. การพัฒนาจิตใจ
8. คำแนะนำเชิงโค้ช
9. Affirmation

ใช้ภาษาลึกแต่เข้าใจง่าย
เน้นการเสริมพลังเชิงบวก
`
}
```

---

# 7) AI NARRATIVE ENGINE

## `/engine/aiNarrativeEngine.ts`

```ts id="9m5nvc"
import OpenAI from "openai"

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function generateNarrative(
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

  return response.choices[0].message.content
}
```

---

# 8) API ROUTE

## `/app/api/horoscope/route.ts`

```ts id="7ivxzr"
import { NextRequest, NextResponse }
from "next/server"

import { horoscopeEngine }
from "@/lib/astrology/engine/horoscopeEngine"

import { getRagContext }
from "@/lib/astrology/engine/ragContextEngine"

import { buildPredictionPrompt }
from "@/lib/astrology/prompts/predictionPrompt"

import { generateNarrative }
from "@/lib/astrology/engine/aiNarrativeEngine"

export async function POST(
  req: NextRequest
) {
  try {
    const body = await req.json()

    // 1) คำนวณดวง
    const horoscopeData =
      await horoscopeEngine(body)

    // 2) ดึง RAG Context
    const ragContext =
      await getRagContext(horoscopeData)

    // 3) สร้าง Prompt
    const prompt =
      buildPredictionPrompt(
        horoscopeData,
        ragContext
      )

    // 4) Generate AI Narrative
    const prediction =
      await generateNarrative(prompt)

    return NextResponse.json({
      success: true,
      data: horoscopeData,
      prediction
    })

  } catch (error) {
    console.error(error)

    return NextResponse.json({
      success: false,
      error: "Prediction failed"
    })
  }
}
```

---

# 9) FRONTEND FETCH

## ตัวอย่างเรียกใช้งาน

```ts id="ytjlwm"
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
      birthTime: "07:20"
    })
  }
)

const result = await response.json()

console.log(result)
```

---

# Response Structure

```json id="xjlwmn"
{
  "success": true,
  "data": {
    "base": 7,
    "power": 2010,
    "house": "ปัตนิ",
    "transit": "ขยายเครือข่าย"
  },
  "prediction": "..."
}
```

---

# ขั้นต่อไปที่สำคัญมาก

หลังจากนี้ให้ครูเด่นทำ 3 เรื่อง

---

# 1) ย้ายสูตรทั้งหมดจาก Google Sheet → Calculators

เช่น

* วัยจร
* ทักษา
* ฐาน
* กำลัง
* อัฏฐกาล
* นวางค์
* เลข 7 ตัว 9 ฐาน

---

# 2) แยก “Rule Engine”

สร้าง

```txt id="pjlwmn"
/rules
```

เช่น

```ts id="jlwmnv"
if (base === 7 && power > 15)
```

เพื่อให้ AI ใช้ร่วมกับ Logic จริง

---

# 3) เชื่อม Agent Skill

ตอนนี้ระบบพร้อมแล้วสำหรับ

* LangChain
* CrewAI
* OpenAI Assistants
* MCP Tools
* Local Agents
* RAG Pipeline

ได้ทั้งหมด

---

# Architecture สุดท้ายที่ควรไปให้ถึง

```txt id="9jlwmn"
User
 ↓
Astrology Engine
 ↓
Rule Engine
 ↓
RAG Knowledge
 ↓
AI Narrative
 ↓
Personalized Prediction
```


