# INSTALL.md — Antigravity IDE Quick Start
## โหรทายหนู Engine — วิธีนำเข้า Project ทันที

---

## 📁 ไฟล์ที่ได้รับ (3 ไฟล์)

| ไฟล์ | วางที่ | หน้าที่ |
|------|--------|---------|
| `CLAUDE.md` | root ของ project | Claude Code instruction file |
| `hora-taynoo-engine.ts` | `src/engine/` | Engine หลัก + SVG generator |
| `hora-taynoo-engine.test.ts` | `src/engine/` | Vitest tests |

---

## 🚀 วิธีนำเข้าใน Antigravity IDE

### Step 1 — วางไฟล์

```bash
cp CLAUDE.md ./CLAUDE.md
cp hora-taynoo-engine.ts ./src/engine/hora-taynoo-engine.ts
cp hora-taynoo-engine.test.ts ./src/engine/hora-taynoo-engine.test.ts
```

### Step 2 — เพิ่ม export ใน index.ts

```typescript
// src/engine/index.ts — เพิ่มบรรทัดเหล่านี้:
export {
  calculateHoraTaynoo,
  calculateNow,
  calculateAt,
  generateHoraTaynooSVG,
  getPlanetSteps,
  calculatePositions,
  buildBhavaMap,
  ZODIAC_ORDER,
  PLANET_INFO,
  DAY_YAM,
  NIGHT_YAM,
} from './hora-taynoo-engine'

export type {
  HoraTaynooInput,
  HoraTaynooResult,
  SubTimeSlot,
  PlanetEntry,
} from './hora-taynoo-engine'
```

### Step 3 — Run Tests

```bash
npx vitest run src/engine/hora-taynoo-engine.test.ts
```

**Expected:** ✅ ผ่านทั้งหมด ~25 tests

### Step 4 — สร้าง API Route

```typescript
// src/app/api/hora/taynoo/route.ts
import { calculateHoraTaynoo, generateHoraTaynooSVG } from '@/engine/hora-taynoo-engine'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const datetime = searchParams.get('datetime')
  const theme = (searchParams.get('theme') ?? 'dark') as 'dark'|'light'

  const date = datetime ? new Date(datetime) : new Date()
  const result = calculateHoraTaynoo({ dateAsked: date })
  const svg = generateHoraTaynooSVG(result, { theme })

  return Response.json({ result, svg })
}
```

### Step 5 — ใช้ใน React Component

```tsx
// src/components/hora/HoraTaynooWidget.tsx
'use client'
import { useEffect, useState } from 'react'
import { calculateHoraTaynoo, generateHoraTaynooSVG } from '@/engine/hora-taynoo-engine'
import type { HoraTaynooResult } from '@/engine/hora-taynoo-engine'

export function HoraTaynooWidget() {
  const [result, setResult] = useState<HoraTaynooResult | null>(null)
  const [svg, setSvg] = useState('')

  useEffect(() => {
    const r = calculateHoraTaynoo()
    setResult(r)
    setSvg(generateHoraTaynooSVG(r, { theme: 'dark', size: 400 }))
  }, [])

  if (!result) return null

  return (
    <div>
      {/* ผังดวง */}
      <div dangerouslySetInnerHTML={{ __html: svg }} />

      {/* ข้อมูลสรุป */}
      <div>
        <p>วัน{result.dayName} ยาม {result.yamAsked} {result.period === 'day' ? 'กลางวัน' : 'กลางคืน'}</p>
        <p>ดาวลอยที่ราศี{result.lagnaZodiacName}</p>
        <p>{result.yamStartStr}–{result.yamEndStr}</p>
      </div>

      {/* ตารางเวลายามย่อย */}
      <table>
        <thead>
          <tr><th>เวลา</th><th>ราศี</th><th>ภพ</th></tr>
        </thead>
        <tbody>
          {result.subTimeSlots.map((slot, i) => (
            <tr key={i}>
              <td>{slot.startStr}–{slot.endStr}</td>
              <td>{slot.zodiacName}</td>
              <td>{slot.bhavaName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

## 🔌 Integration กับ Claude AI

```typescript
// src/lib/claude.ts — buildHoraContext สำหรับ AI Report
import { calculateHoraTaynoo } from '@/engine/hora-taynoo-engine'

export function buildTaynooContext(date?: Date): string {
  const r = calculateHoraTaynoo({ dateAsked: date })
  const planets = r.planetEntries.map(e =>
    `ดาว${e.label}→ราศี${e.zodiacName}(${e.steps}ช่อง)`
  ).join(', ')

  return `
ผังดวงโหรทายหนู:
- วัน${r.dayName} ยามที่${r.yamAsked} ${r.period === 'day' ? 'กลางวัน' : 'กลางคืน'} (${r.yamStartStr}–${r.yamEndStr})
- ดาวประจำวัน: ดาว${r.dayPlanet} | ดาวเจ้ายาม: ดาว${r.yamPlanet}
- ลัคนา: ราศี${r.lagnaZodiacName} (ภพตนุ)
- ตำแหน่งดาวลอย: ${planets}
- เวลาปัจจุบันตกภพ: ${r.subTimeSlots.find(s => s.startMin <= Date.now()/60000 % 1440 && s.endMin > Date.now()/60000 % 1440)?.bhavaName ?? r.subTimeSlots[0].bhavaName}
  `
}
```

---

## ⚡ TypeScript Strict Mode

Engine นี้ compatible กับ `strict: true` ใน tsconfig.json ทั้งหมด

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

---

## 📊 สรุป API ทั้งหมด

| Function | Input | Output | ใช้เมื่อ |
|----------|-------|--------|---------|
| `calculateHoraTaynoo(input?)` | HoraTaynooInput | HoraTaynooResult | คำนวณเต็มรูปแบบ |
| `calculateNow(theme?)` | 'dark'\|'light' | {result, svg} | ใช้ปัจจุบัน + SVG |
| `calculateAt(day, hour, min?)` | number,number,number | HoraTaynooResult | test/demo |
| `generateHoraTaynooSVG(result, config?)` | result + config | string (SVG) | render ผัง |
| `getPlanetSteps(day, yam, period)` | numbers | number[11] | debug |
| `calculatePositions(steps)` | number[11] | number[11] | debug |
| `buildSubTimeSlots(start, zodiac, bhava)` | numbers+map | SubTimeSlot[12] | เวลายามย่อย |
