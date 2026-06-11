จากภาพที่แนบมา เป็นเอกสารต้นฉบับการตั้งผัง "โหรทายหนู" หรือ "ยามอัฐกาลแบบวงล้อ" ซึ่งประกอบด้วย 3 ส่วนสำคัญ

1. ระบบยามอัฐกาล (Day/Night)
2. ระบบวางดาวลอย
3. ระบบลงภพและลงเวลา

หากต้องการพัฒนาเป็น Web Application บน Antigravity IDE หรือ Remix/Next.js ควรแยกเป็น Engine ดังนี้

---

# Architecture

```text
HoraThaiNu Engine

├── Time Engine
│   ├── Sunrise/Sunset
│   ├── Day Yama
│   ├── Night Yama
│   └── Current Yama

├── AshtaKala Engine
│   ├── Yama Matrix
│   ├── Starting Point
│   ├── Planet Rotation
│   └── Floating Planet

├── HoraNu Chart Engine
│   ├── Draw Wheel
│   ├── Place Planets
│   ├── Place Houses
│   └── Place Time Segments

├── Interpretation Engine
│   ├── Planet Meaning
│   ├── House Meaning
│   ├── Yama Meaning
│   └── AI Prediction

└── Report Generator
```

---

# STEP 1 : ตารางยามอัฐกาล

จากภาพ

กลางวัน

```text
06:00-07:30 = ยาม1
07:30-09:00 = ยาม2
09:00-10:30 = ยาม3
10:30-12:00 = ยาม4
12:00-13:30 = ยาม5
13:30-15:00 = ยาม6
15:00-16:30 = ยาม7
16:30-18:00 = ยาม8
```

กลางคืน

```text
18:00-19:30 = ยาม1
19:30-21:00 = ยาม2
21:00-22:30 = ยาม3
22:30-00:00 = ยาม4
00:00-01:30 = ยาม5
01:30-03:00 = ยาม6
03:00-04:30 = ยาม7
04:30-06:00 = ยาม8
```

---

# STEP 2 : ตารางอัฐกาล

สร้างเป็น Database

```typescript
export const ASHTA_KALA_DAY = {

  sunday:[1,6,5,2,7,4,3,1],
  monday:[2,7,4,3,1,6,5,2],
  tuesday:[3,1,6,5,2,7,4,3],
  wednesday:[4,2,7,4,3,1,6,4],
  thursday:[5,3,1,6,4,2,7,5],
  friday:[6,4,2,7,5,3,1,6],
  saturday:[7,5,3,1,6,4,2,7]

}
```

กลางคืน

```typescript
export const ASHTA_KALA_NIGHT = {

  sunday:[1,5,2,6,3,7,4,1],
  monday:[2,6,3,7,4,1,5,2],
  tuesday:[3,7,4,1,5,2,6,3],
  wednesday:[4,1,5,2,6,3,7,4],
  thursday:[5,2,6,3,7,4,1,5],
  friday:[6,3,7,4,1,5,2,6],
  saturday:[7,4,1,5,2,6,3,7]

}
```

---

# STEP 3 : หา "ดาวเจ้าของยาม"

ตัวอย่าง

```typescript
function getYamaPlanet(
 dayOfWeek:number,
 yama:number,
 isDay:boolean
){

 if(isDay){
   return ASHTA_KALA_DAY[dayOfWeek][yama-1]
 }

 return ASHTA_KALA_NIGHT[dayOfWeek][yama-1]

}
```

ผลลัพธ์

```text
วันพุธ
เวลา 10:45

อยู่ยาม 4

ยามอัฐกาล = ดาว 8
```

---

# STEP 4 : ดาวลอย

จากภาพ

ใช้ดาว

```text
1
2
3
4
5
6
7
8
9
0
```

ลำดับการลอย

```text
1→2→3→4→5→6→7→8→9→0
```

เริ่มที่ราศี "พฤษภ"

---

# STEP 5 : สูตรคำนวณดาวลอย

จากคู่มือ

```text
ดาวเจ้าของยาม
นับช่องยาม
แล้ววางดาวลอย
```

สูตร

```typescript
floatingIndex
=
(startPosition + yamaCount)
% 10
```

ตัวอย่าง

```typescript
const startPlanet = 1

const yama = 4

floatingPlanet =
(startPlanet + yama -1)%10
```

---

# STEP 6 : ผังราศี

ใช้ 12 ราศี

```typescript
const RASI = [

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
```

เริ่มวางจาก

```text
พฤษภ
```

ตามคู่มือภาพที่ 3

---

# STEP 7 : ผังโหรทายหนู

Model

```typescript
interface HoraNuChart{

 currentYama:number

 yamaPlanet:number

 floatingPlanet:number

 houses:House[]

 planets:Planet[]

}
```

---

# STEP 8 : ภพทั้ง 12

จากภาพสุดท้าย

```typescript
const HOUSES = [

"ตนุ",
"กดุมภะ",
"สหัชชะ",
"พันธุ",

"ปุตตะ",
"อริ",
"ปัตนิ",
"มรณะ",

"ศุภะ",
"กัมมะ",
"ลาภะ",
"วินาศ"

]
```

---

# STEP 9 : ลงเวลา

แบ่งยามละ

```text
90 นาที
```

แต่ละช่อง

```text
90 / 8

=
11.25 นาที
```

เท่ากับ

```text
11 นาที 15 วินาที
```

สูตร

```typescript
const SLOT_DURATION =

11*60+15
```

---

# STEP 10 : คำนวณเวลาจริง

```typescript
function buildTimeWheel(
 startTime:Date
){

 const result=[]

 for(let i=0;i<8;i++){

   result.push(

      addSeconds(
        startTime,
        i*675
      )

   )

 }

 return result

}
```

675 วินาที

```text
11 นาที 15 วินาที
```

---

# STEP 11 : AI Prediction Engine

สร้าง Prompt

```typescript
interface PredictionInput{

 currentPlanet:number

 floatingPlanet:number

 house:string

 yama:number

 weekday:string

}
```

Prompt

```text
วิเคราะห์โหรทายหนู

ดาวเจ้าของยาม : {currentPlanet}

ดาวลอย : {floatingPlanet}

ภพ : {house}

ยาม : {yama}

จงพยากรณ์

1. งาน
2. เงิน
3. ความรัก
4. สุขภาพ
5. สิ่งควรระวัง
6. เคล็ดเสริมดวง

ตอบแบบกระชับ
```

---

# Database Structure

```sql
hora_nu_sessions

id
birth_date
weekday
query_time

current_yama
yama_planet

floating_planet

current_house

prediction

created_at
```

---

# API Structure

```text
POST

/api/hora-nu/calculate
```

Request

```json
{
  "datetime":"2026-06-08T10:45:00",
  "latitude":13.75,
  "longitude":100.50
}
```

Response

```json
{
  "yama":4,
  "yamaPlanet":8,
  "floatingPlanet":1,
  "house":"อริ",
  "prediction":"..."
}
```

---

# โครงสร้างโฟลเดอร์สำหรับ Antigravity IDE

```text
src/

modules/

hora-nu/

├── engine/
│   ├── yamaEngine.ts
│   ├── ashtaKalaEngine.ts
│   ├── floatingStarEngine.ts
│   ├── houseEngine.ts
│   ├── timeWheelEngine.ts
│
├── ai/
│   ├── predictionPrompt.ts
│
├── ui/
│   ├── HoraNuWheel.tsx
│   ├── HoraNuResult.tsx
│
├── api/
│   ├── calculate.ts
│
└── database/
    ├── planets.json
    ├── houses.json
    ├── yama.json
```

อย่างไรก็ตาม จากภาพที่ส่งมา ยังมี "กฎการนับช่องยาม", "จุดเริ่มวางดาว", "สูตรการพันยามของดาวแต่ละดวง (๑-๘)", "จุดลงภพ" และ "จุดลงเวลา" ที่เป็นรายละเอียดเฉพาะของตำราโหรทายหนู ซึ่งควรถอดเป็น Rule Engine 100% จากต้นฉบับก่อน เพื่อให้ผลลัพธ์ตรงกับการคำนวณแบบโบราณทุกประการ

หากต้องการพัฒนาระบบจริง ผมสามารถช่วยสรุปเป็นเอกสาร **Database.md + PRD + TypeScript Engine Specification + Prompt AI พยากรณ์โหรทายหนู Version 1.0 สำหรับ Antigravity IDE** แบบครบทั้งระบบพร้อมนำไปสร้าง Agent Skill ได้ทันที.
