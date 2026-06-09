# CLAUDE.md — Hora AI: โหรทายหนู Engine
## Master Instruction File สำหรับ Antigravity IDE + Claude Code

> อ้างอิง: อ.กานดา เอกสาร 1–8 + เอกสารประกอบ 3 ฉบับ
> สถานะ: พร้อม dev ทันที

---

## 🗂️ โครงสร้างไฟล์ที่ต้องสร้าง

```
src/engine/
├── hora-taynoo-engine.ts        ← Engine หลัก (สร้างจาก spec นี้)
├── hora-taynoo-chart.tsx        ← SVG Chart Component
├── hora-taynoo-types.ts         ← Type definitions ทั้งหมด
└── hora-taynoo-calculator.ts    ← Pure calculation functions

src/components/hora/
├── HoraTaynooChart.tsx          ← Full chart component
├── HoraTaynooPanel.tsx          ← Panel แสดงผล + คำพยากรณ์
└── HoraTaynooTimeline.tsx       ← แถบยามอัฐกาล 8 ยาม
```

---

## 📐 สูตรคณิตศาสตร์ผัง (SVG Constants)

```typescript
// ค่าคงที่ผัง — ห้ามเปลี่ยน
export const CHART = {
  CX: 340,          // จุดศูนย์กลาง x
  CY: 340,          // จุดศูนย์กลาง y (ใช้ 340x340 viewBox)
  R_OUTER: 240,     // วงนอกสุด (เส้นกรอบ)
  R_ZODIAC_IN: 176, // ขอบในวงราศี
  R_YAM_IN: 140,    // ขอบในวงยามย่อย
  R_GRID: 106,      // วงกรอบ inner grid
  R_LABEL: 208,     // ตำแหน่งชื่อราศี (midpoint ระหว่าง R_OUTER และ R_ZODIAC_IN)
  R_NUM: 158,       // ตำแหน่งเลขยาม (midpoint ระหว่าง R_ZODIAC_IN และ R_YAM_IN)
  R_CORNER: 256,    // ตำแหน่งตัวเลขอารบิกมุมนอก
}

// แปลง sector index → มุม (degrees)
// sector 0 = พฤษก = บนซ้าย = 255°
// เดิน CCW ทีละ 30°
function sectorAngle(i: number): number {
  return 255 + i * 30
}

// แปลง boundary index → มุม
// boundary 0 = เส้นแบ่ง พฤษก/เมถุน = 240°
function boundaryAngle(i: number): number {
  return 240 + i * 30
}

// polar → SVG coordinates
function polar(angleDeg: number, r: number, cx: number, cy: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}
```

---

## 🌐 ลำดับราศี 12 ช่อง (CCW จาก sector 0)

```typescript
export const ZODIAC_ORDER = [
  { index: 0,  name: 'พฤษก',  nameEn: 'Taurus',      angle: 255 }, // บนซ้าย — จุดเริ่มต้น
  { index: 1,  name: 'เมษ',   nameEn: 'Aries',       angle: 285 }, // บนกลาง
  { index: 2,  name: 'มีน',   nameEn: 'Pisces',      angle: 315 }, // บนขวา
  { index: 3,  name: 'กุมภ์',  nameEn: 'Aquarius',    angle: 345 }, // ขวาบน
  { index: 4,  name: 'มกร',   nameEn: 'Capricorn',   angle: 15  }, // ขวาล่าง
  { index: 5,  name: 'ธนู',   nameEn: 'Sagittarius', angle: 45  }, // ล่างขวา
  { index: 6,  name: 'พิจก',  nameEn: 'Scorpio',     angle: 75  }, // ล่างกลาง
  { index: 7,  name: 'ตุลย์',  nameEn: 'Libra',       angle: 105 }, // ล่างซ้าย
  { index: 8,  name: 'กันย์',  nameEn: 'Virgo',       angle: 135 }, // ซ้ายล่าง
  { index: 9,  name: 'สิงห์',  nameEn: 'Leo',         angle: 165 }, // ซ้ายกลาง
  { index: 10, name: 'กรกฎ',  nameEn: 'Cancer',      angle: 195 }, // ซ้ายบน
  { index: 11, name: 'เมถุน',  nameEn: 'Gemini',      angle: 225 }, // บนซ้ายในสุด
]
```

---

## ⭐ ตัวเลขอารบิกมุมนอก (Corner Numbers)

```typescript
// ตัวเลขที่ขอบนอก r=256 ณ จุดตัดเส้นแบ่ง
// 12 จุด เริ่มจาก boundary 0 (240°=บนซ้าย)
// จาก boundary 0 ไป 11 ตาม CCW:
// Boundary angles: 240,270,300,330,0,30,60,90,120,150,180,210
export const CORNER_NUMBERS = [2, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3]
// ↑ pattern จากภาพ อ.กานดา หน้า 5,6,7,8:
// หน้า 5: bottom shows 1,2,3
// หน้า 7: top shows 1 (star nap 1), side shows 2,3
// หน้า 8: top shows 6,7; sides show 4,5
// Pattern สมมาตร: 1 ที่บน (270°), เพิ่มขึ้น 1 ทั้งซ้ายและขวา

// Corrected corner number sequence (boundary index 0..11):
// boundary at 270° = "1" (top, หน้าผังพฤษก)
// วนซ้ายขึ้น: 2,3,4,5,6,7
// วนขวาลง: 2,3,4,5,6,7 (mirror)
export const CORNER_NUMBERS_CORRECT: number[] = [
// idx: 0    1    2    3    4    5    6    7    8    9   10   11
//    240°,270°,300°,330°, 0°, 30°, 60°, 90°,120°,150°,180°,210°
        2,   1,   2,   3,   4,   5,   6,   7,   6,   5,   4,   3
]
```

---

## 🔢 อัลกอริทึม "พับยาม + พับย้ำ" ฉบับสมบูรณ์

```typescript
/**
 * STEP 1: หา "จำนวนก้าว" ของดาวลอยแต่ละดวง
 * โดยใช้ระบบ "พับยาม" (Period Folding)
 *
 * Input:
 *   - day: DayOfWeek (0-6)
 *   - yamAsked: YamNumber (1-8) — ยามที่ผู้ถามมาถาม
 *   - period: 'day' | 'night'
 *
 * Output:
 *   - steps[]: number[11] — จำนวนก้าวสำหรับดาวลอย 11 ดวง
 *     ลำดับ: [ดาว1, ดาว2, ดาว3, ดาว4, ดาว5, ดาว6, ดาว7, ดาว8, ลัคนา, ดาว9, ดาว0]
 */
function getPlanetSteps(
  day: number,      // 0=อาทิตย์..6=เสาร์
  yamAsked: number, // 1-8
  period: 'day' | 'night'
): number[] {
  const table = period === 'day' ? DAY_YAM_TABLE : NIGHT_YAM_TABLE
  const yamRow = table[day] // เช่น วันพุธ day = [4,2,7,5,3,1,6,4]

  // ดาวลอย 11 ดวง: 1,2,3,4,5,6,7,8,ลัคนา(ล),9,0
  const PLANET_SEQUENCE = [1,2,3,4,5,6,7,8,'ล',9,0]
  const steps: number[] = []

  // Phase 1: เดินหน้า (yamAsked → yam8)
  let yamIdx = yamAsked - 1 // 0-based
  let direction: 'forward' | 'backward' = 'forward'
  let foldDone = false

  for (let p = 0; p < 11; p++) {
    steps.push(yamRow[yamIdx])

    if (!foldDone) {
      if (yamIdx === 7) {
        // ถึงยาม 8 → พับย้ำ (ใช้ยาม8 ซ้ำ 1 ครั้งก่อนถอย)
        foldDone = true
        direction = 'backward'
        // yamIdx ยังคงที่ 7 สำหรับดาวดวงถัดไป (พับย้ำ)
      } else {
        yamIdx++ // เดินหน้า
      }
    } else {
      yamIdx-- // เดินถอย
    }
  }
  return steps
}

/**
 * STEP 2: "พับย้ำ" — เดินดาวลงผัง (Chained Counting)
 *
 * Input:
 *   - steps[11]: จำนวนก้าวจาก STEP 1
 *
 * Output:
 *   - positions[11]: zodiacIndex (0-11) ที่ดาวแต่ละดวงตกถึง
 */
function calculatePlanetPositions(steps: number[]): number[] {
  const positions: number[] = []
  let currentPos = 1 // เริ่มที่ zodiacIndex 1 = พฤษก

  for (let p = 0; p < 11; p++) {
    // นับ steps[p] ช่อง CCW จาก currentPos (นับย้ำ: ช่องเริ่ม = 1)
    // (currentPos + steps[p] - 1) % 12
    const landPos = (currentPos + steps[p] - 1) % 12
    positions.push(landPos)
    currentPos = landPos // ดาวถัดไปเริ่มนับจากตรงนี้ (พับย้ำ)
  }
  return positions
}
```

---

## 🏠 ระบบภพ 12 หลัง (จากตำแหน่งลัคนา)

```typescript
export const BHAVA_NAMES = [
  'ตนุ',      // 1 — ตัวเอง
  'กฎุมภะ',   // 2 — ทรัพย์สิน
  'สหัชชะ',   // 3 — พี่น้อง
  'พันธุ',    // 4 — บ้าน/แม่
  'ปุตตะ',    // 5 — บุตร
  'อริ',      // 6 — ศัตรู/โรค
  'ปัตนิ',    // 7 — คู่ครอง
  'มรณะ',    // 8 — มรณะ
  'ศุภะ',    // 9 — บุญ/ธรรม
  'กัมมะ',   // 10 — การงาน
  'ลาภะ',    // 11 — ลาภ
  'วินาศ',   // 12 — วินาศ
]

// กำหนดภพจากตำแหน่งลัคนา
function assignBhava(lagnaZodiacIndex: number): Record<number, string> {
  const bhava: Record<number, string> = {}
  for (let b = 0; b < 12; b++) {
    const zodiacIdx = (lagnaZodiacIndex + b) % 12
    bhava[zodiacIdx] = BHAVA_NAMES[b]
  }
  return bhava
}
```

---

## ⏱️ ระบบลงเวลายามย่อย 7.5 นาที

```typescript
/**
 * คำนวณเวลายามย่อย 12 ช่อง (ช่องละ 7 นาที 30 วินาที)
 *
 * Input:
 *   - yamStartMinute: เวลาเริ่มยามใหญ่ (minutes from midnight)
 *   - startingZodiacIndex: zodiac index ที่เป็น "จุดลงเวลา"
 *     (= zodiac ที่ดาวเจ้าเรือนลัคนา ลอยอยู่)
 *
 * Output:
 *   - timeSlots[12]: { zodiacIndex, startMin, endMin, startStr, endStr }
 */
function calculateSubTimeSlots(
  yamStartMinute: number,
  startingZodiacIndex: number
): SubTimeSlot[] {
  const SLOT_DURATION = 7.5 // นาที
  const slots: SubTimeSlot[] = []

  for (let i = 0; i < 12; i++) {
    const zodiacIdx = (startingZodiacIndex + i) % 12
    const startMin = yamStartMinute + i * SLOT_DURATION
    const endMin = startMin + SLOT_DURATION
    slots.push({
      zodiacIndex: zodiacIdx,
      zodiacName: ZODIAC_ORDER[zodiacIdx].name,
      startMin,
      endMin,
      startStr: minutesToHHMM(startMin),
      endStr: minutesToHHMM(endMin),
    })
  }
  return slots
}

function minutesToHHMM(minutes: number): string {
  const totalMin = Math.round(minutes * 2) / 2 // ปัด 0.5
  const h = Math.floor(totalMin / 60) % 24
  const m = Math.round((totalMin % 60) * 10) / 10
  const mStr = m === 0 ? '00' : m === 30 ? '30' : String(m).padStart(2,'0')
  return `${String(h).padStart(2,'0')}:${mStr}`
}
```

---

## 🎨 SVG Chart Generator (ฟังก์ชันหลัก)

```typescript
/**
 * generateChartSVG — สร้าง SVG string สำหรับผังดวงโหรทายหนู
 *
 * Input: ChartData (ผลจาก calculateHoraTaynoo)
 * Output: string (SVG markup)
 */
export function generateChartSVG(data: HoraTaynooResult): string {
  const { CX, CY, R_OUTER, R_ZODIAC_IN, R_YAM_IN, R_GRID, R_LABEL, R_CORNER } = CHART

  // 1. วาดโครงวงกลม 4 ชั้น
  // 2. วาดเส้นแบ่ง 12 เส้น
  // 3. วางชื่อราศี + เลขยาม
  // 4. วางตัวเลขมุมนอก
  // 5. วาด inner grid
  // 6. วางดาวลอย + highlight

  // โครงสร้าง SVG:
  return `
<svg viewBox="0 0 ${CX*2} ${CY*2}" xmlns="http://www.w3.org/2000/svg">
  <!-- วงกลม 4 ชั้น -->
  <circle cx="${CX}" cy="${CY}" r="${R_OUTER}" fill="none" stroke="#C9A96E" stroke-width="1.5"/>
  <circle cx="${CX}" cy="${CY}" r="${R_ZODIAC_IN}" fill="none" stroke="#C9A96E" stroke-width="0.8"/>
  <circle cx="${CX}" cy="${CY}" r="${R_YAM_IN}" fill="none" stroke="#C9A96E40" stroke-width="0.5"/>
  <circle cx="${CX}" cy="${CY}" r="${R_GRID}" fill="none" stroke="#C9A96E" stroke-width="1"/>

  <!-- เส้นแบ่ง 12 ช่อง -->
  ${generate12Dividers(CX, CY, R_YAM_IN, R_OUTER)}

  <!-- ชื่อราศี -->
  ${generateZodiacLabels(CX, CY, R_LABEL, data.planetPositions)}

  <!-- เลขยาม (inner ring) -->
  ${generateYamNumbers(CX, CY)}

  <!-- ตัวเลขมุมนอก -->
  ${generateCornerNumbers(CX, CY, R_CORNER)}

  <!-- Inner grid 3×3 -->
  ${generateInnerGrid(CX, CY, R_GRID)}

  <!-- ดาวลอย -->
  ${generateFloatingPlanets(CX, CY, R_LABEL, data.planetPositions)}
</svg>`
}
```

---

## 📋 Type Definitions ครบชุด

```typescript
// hora-taynoo-types.ts

export interface HoraTaynooInput {
  /** วันที่ถาม (Date object) */
  dateAsked: Date
  /** ถ้าไม่ระบุ ใช้เวลาปัจจุบัน */
  timeOverride?: { hour: number; minute: number }
}

export interface HoraTaynooResult {
  /** Input */
  input: HoraTaynooInput
  /** วันในสัปดาห์ (0-6) */
  dayOfWeek: number
  /** ชื่อวัน */
  dayName: string
  /** กลางวัน/กลางคืน */
  period: 'day' | 'night'
  /** ยามใหญ่ที่ถาม (1-8) */
  yamAsked: number
  /** เวลาเริ่มยามใหญ่ (minutes from midnight) */
  yamStartMinute: number
  /** ดาวประจำวัน (1-7) */
  dayPlanet: number
  /** ดาวเจ้ายาม (1-7) */
  yamPlanet: number
  /** ราศีเกษตร (zodiac index ที่ดาวประจำวันปกครอง) */
  kasternZodiacIndex: number
  /** จำนวนก้าวของดาวลอยแต่ละดวง [11 ดวง] */
  planetSteps: number[]
  /** zodiac index ที่ดาวลอยแต่ละดวงตกถึง [11 ดวง] */
  planetPositions: number[]
  /** zodiac index ของลัคนา */
  lagnaZodiacIndex: number
  /** ภพ 12 หลัง (zodiacIndex → ชื่อภพ) */
  bhavaMap: Record<number, string>
  /** เวลายามย่อย 12 ช่อง */
  subTimeSlots: SubTimeSlot[]
  /** zodiac index จุดลงเวลา (จากดาวเจ้าเรือนลัคนา) */
  timeStartZodiacIndex: number
}

export interface SubTimeSlot {
  zodiacIndex: number
  zodiacName: string
  startMin: number
  endMin: number
  startStr: string
  endStr: string
  bhavaName?: string
}

export interface PlanetPosition {
  /** ดาวลอยที่ (1-7, 8, ล, 9, 0) */
  planetLabel: string
  zodiacIndex: number
  zodiacName: string
  steps: number
}
```

---

## 🔑 ตารางอ้างอิงหลัก

```typescript
// ดาวเกษตร (zodiac index ที่ดาวแต่ละดวงปกครอง)
export const PLANET_KASTERN: Record<number, number[]> = {
  1: [4],       // อาทิตย์ → สิงห์ (index 9)
  2: [6],       // จันทร์  → กรกฎ (index 10) — แก้ไขตาม zodiac order
  3: [0, 6],    // อังคาร  → เมษ (0), พิจก (6)
  4: [11, 8],   // พุธ     → เมถุน (11), กันย์ (8)
  5: [5, 2],    // พฤหัส   → ธนู (5), มีน (2)
  6: [0, 7],    // ศุกร์    → พฤษก (0), ตุลย์ (7)
  7: [4, 3],    // เสาร์    → มกร (4), กุมภ์ (3)
}
// หมายเหตุ: zodiac index อ้างอิงตาม ZODIAC_ORDER ข้างบน

// ยามอัฐกาลกลางวัน
export const DAY_YAM_TABLE: number[][] = [
//   ย1  ย2  ย3  ย4  ย5  ย6  ย7  ย8
  [  1,  6,  4,  2,  7,  5,  3,  1 ], // อาทิตย์
  [  2,  7,  5,  3,  1,  6,  4,  2 ], // จันทร์
  [  3,  1,  6,  4,  2,  7,  5,  3 ], // อังคาร
  [  4,  2,  7,  5,  3,  1,  6,  4 ], // พุธ
  [  5,  3,  1,  6,  4,  2,  7,  5 ], // พฤหัส
  [  6,  4,  2,  7,  5,  3,  1,  6 ], // ศุกร์
  [  7,  5,  3,  1,  6,  4,  2,  7 ], // เสาร์
]

// ยามอัฐกาลกลางคืน
export const NIGHT_YAM_TABLE: number[][] = [
  [  1,  5,  2,  6,  3,  7,  4,  1 ], // อาทิตย์
  [  2,  6,  3,  7,  4,  1,  5,  2 ], // จันทร์
  [  3,  7,  4,  1,  5,  2,  6,  3 ], // อังคาร
  [  4,  1,  5,  2,  6,  3,  7,  4 ], // พุธ
  [  5,  2,  6,  3,  7,  4,  1,  5 ], // พฤหัส
  [  6,  3,  7,  4,  1,  5,  2,  6 ], // ศุกร์
  [  7,  4,  1,  5,  2,  6,  3,  7 ], // เสาร์
]

// เวลาเริ่มยาม (minutes from midnight)
export const YAM_START_MINUTES = {
  day:   [360, 450, 540, 630, 720, 810, 900, 990],  // 06:00–16:30
  night: [1080,1170,1260,1350,  0,  90, 180, 270],  // 18:00–04:30
}

// ชื่อดาวพระเคราะห์
export const PLANET_NAMES: Record<number, { day: string; night: string; thai: string }> = {
  1: { day: 'สุริชะ',  night: 'ระวิ',   thai: 'พระอาทิตย์' },
  2: { day: 'จันเทา',  night: 'ศะศิ',   thai: 'พระจันทร์'  },
  3: { day: 'ภุมมะ',   night: 'ภุมโม',  thai: 'พระอังคาร'  },
  4: { day: 'พุธะ',    night: 'พุโธ',   thai: 'พระพุธ'    },
  5: { day: 'ครู',     night: 'ชีโว',   thai: 'พระพฤหัส'  },
  6: { day: 'ศุกระ',   night: 'ศุโกร',  thai: 'พระศุกร์'  },
  7: { day: 'เสารี',   night: 'โสโร',   thai: 'พระเสาร์'  },
}
```

---

## ✅ ตัวอย่างการใช้งาน (Test Case จาก อ.กานดา)

```typescript
// Test: วันพุธ 10:32 น. (ยาม 4 กลางวัน)
// Expected results:
//   dayOfWeek = 3 (พุธ)
//   yamAsked  = 4
//   yamPlanet = DAY_YAM_TABLE[3][3] = 5 (ครู)
//   dayPlanet = 4 (พุธะ)
//
//   planetSteps = [5, 3, 1, 6, 4, 4, 6, 1, 3, 5, 7]
//   ลำดับ:        [1, 2, 3, 4, 5, 6, 7, 8, ล, 9, 0]
//
//   planetPositions (เริ่มนับจาก พฤษก=index0):
//     ดาว 1: นับ 5 จาก index0 → (0+5-1)%12 = 4 (มกร)
//     ดาว 2: นับ 3 จาก index4 → (4+3-1)%12 = 6 (พิจก)
//     ดาว 3: นับ 1 จาก index6 → (6+1-1)%12 = 6 (พิจก) ← ซ้อน
//     ดาว 4: นับ 6 จาก index6 → (6+6-1)%12 = 11 (เมถุน)
//     ดาว 5: นับ 4 จาก index11 → (11+4-1)%12 = 2 (มีน)
//     ดาว 6: นับ 4 จาก index2  → (2+4-1)%12 = 5 (ธนู)
//     ดาว 7: นับ 6 จาก index5  → (5+6-1)%12 = 10 (กรกฎ)
//     ดาว 8: นับ 1 จาก index10 → (10+1-1)%12 = 10 (กรกฎ) ← ซ้อน
//     ลัคนา: นับ 3 จาก index10 → (10+3-1)%12 = 0 (พฤษก)
//     ดาว 9: นับ 5 จาก index0  → (0+5-1)%12 = 4 (มกร)
//     ดาว 0: นับ 7 จาก index4  → (4+7-1)%12 = 10 (กรกฎ)

const testResult = calculateHoraTaynoo({
  dateAsked: new Date('2025-01-15T10:32:00'), // วันพุธ
})
console.assert(testResult.yamAsked === 4)
console.assert(testResult.yamPlanet === 5)
console.assert(testResult.lagnaZodiacIndex === 0)
```

---

## 🚀 Claude Code Commands

```bash
# สร้าง engine ทั้งหมดใน src/engine/
create src/engine/hora-taynoo-types.ts
create src/engine/hora-taynoo-engine.ts
create src/engine/hora-taynoo-chart.tsx
create src/components/hora/HoraTaynooPanel.tsx

# Test
npx vitest run hora-taynoo

# Build
npm run build
```

---

## 📌 Integration กับ hora-calculator.ts ที่มีอยู่

```typescript
// ใน src/engine/index.ts เพิ่ม:
export { calculateHoraTaynoo } from './hora-taynoo-engine'
export type { HoraTaynooResult, SubTimeSlot } from './hora-taynoo-types'

// ใน API route:
// app/api/hora/taynoo/route.ts
import { calculateHoraTaynoo } from '@/engine/hora-taynoo-engine'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const datetime = searchParams.get('datetime')
  const result = calculateHoraTaynoo({
    dateAsked: datetime ? new Date(datetime) : new Date()
  })
  return Response.json(result)
}
```
