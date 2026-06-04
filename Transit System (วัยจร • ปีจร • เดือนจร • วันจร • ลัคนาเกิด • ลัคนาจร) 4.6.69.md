# Phopephum Horoscope Engine v2.0

## Transit System (วัยจร • ปีจร • เดือนจร • วันจร • ลัคนาเกิด • ลัคนาจร)

Version: 2.0

Platform:

* Remix
* Cloudflare
* Supabase
* Antigravity IDE

---

# 1. Transit Architecture

ระบบจรของเลข 7 ตัว 9 ฐาน ประกอบด้วย

1. วัยจร (Life Cycle)
2. ปีจร (Annual Transit)
3. เดือนจร (Monthly Transit)
4. วันจร (Daily Transit)
5. ลัคนาเกิด (Birth Lagna)
6. ลัคนาจร (Progressive Lagna)

---

# 2. วัยจร (Life Cycle)

## ความหมาย

ใช้ดู

* ธีมชีวิตตามช่วงอายุ
* บทเรียนสำคัญ
* เหตุการณ์เด่น
* จังหวะขึ้นลงของชีวิต

---

## หลักการนับ

ใช้เฉพาะ

* ฐาน 1 (วัน)
* ฐาน 2 (เดือน)
* ฐาน 3 (ปี)

ไม่นับฐาน 4

---

## วิธีนับ

อ่านทีละคอลัมน์

จากบนลงล่าง

ตัวอย่าง

คอลัมน์ที่ 1

ฐานวัน
↓
ฐานเดือน
↓
ฐานปี

แล้วจึงย้ายไปคอลัมน์ถัดไป

---

## Formula

```ts
type LifeCycleCell = {
  house: string;
  base: 1 | 2 | 3;
  startAge: number;
  endAge: number;
  star: number;
};
```

---

## Example

```txt
อัตตะ   1-3
ตนุ     4-7
มรณะ   8-12

หินะ   13-16
กดุมภะ 17-21
สุภะ   22-27
```

ระบบต้องสร้าง Timeline อัตโนมัติทั้งกระดาน

---

# 3. ปีจร (Annual Transit)

## ความหมาย

เรื่องที่จะถูกเปิดขึ้นมาเด่นที่สุดในปีนั้น

---

## Input

อายุย่าง

เช่น

อายุเต็ม 30

ใช้

31

---

## วิธีคำนวณ

นับแนวนอน

```txt
ฐาน 1

อัตตะ
หินะ
ธนัง
ปิตา
มาตา
โภคา
มัชฌิมา

= 1-7
```

```txt
ฐาน 2

ตนุ
กดุมภะ
สหัชชะ
พันธุ
ปุตตะ
อริ
ปัตนิ

= 8-14
```

```txt
ฐาน 3

มรณะ
สุภะ
กัมมะ
ลาภะ
พยายะ
ทาสา
ทาสี

= 15-21
```

ครบ 21 ปี

วนกลับใหม่

---

## Formula

```ts
const position = (ageEntering - 1) % 21;

const row = Math.floor(position / 7);

const col = position % 7;
```

---

# 4. ดาวย้ำปีจร

ใช้ขยายความหมายปีจร

---

กรณี

ฐานวัน

ดูดาวย้ำฐาน 5

```txt
Base 1
↓
Base 5
```

---

ฐานเดือน

ดูดาวย้ำฐาน 6

```txt
Base 2
↓
Base 6
```

---

ฐานปี

ดูดาวย้ำฐาน 7

```txt
Base 3
↓
Base 7
```

---

Output

```ts
{
  house: "สหัชชะ",
  transitStar: 6,
  emphasizeStar: 7
}
```

---

# 5. เดือนจร (Monthly Transit)

## ความหมาย

เรื่องที่ถูกกระตุ้นในแต่ละเดือน

ใช้เดือนจันทรคติ

---

## จุดเริ่มต้น

เริ่มที่

ภพพันธุ

เท่ากับ

เดือน 1

---

## ลำดับ

```txt
พันธุ   = เดือน 1
ปุตตะ   = เดือน 2
อริ     = เดือน 3
ปัตนิ   = เดือน 4
ตนุ     = เดือน 5
กดุมภะ = เดือน 6
สหัชชะ = เดือน 7
พันธุ   = เดือน 8
...
```

---

## Formula

```ts
const startIndex = 3;

const target =
(startIndex + (lunarMonth - 1)) % 7;
```

---

## ดาวย้ำ

ดูฐาน 6

```txt
Base 2
↓
Base 6
```

---

# 6. วันจร (Daily Transit)

## ความหมาย

พลังงานรายวัน

เรื่องที่เหมาะทำ

เรื่องที่ควรระวัง

---

## Mapping

```ts
const dayMap = {
  7: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
};
```

---

ผลลัพธ์

```txt
เสาร์ = อัตตะ
อาทิตย์ = หินะ
จันทร์ = ธนัง
อังคาร = ปิตา
พุธ = มาตา
พฤหัส = โภคา
ศุกร์ = มัชฌิมา
```

---

## ดาวย้ำ

ดูฐาน 5

```txt
Base 1
↓
Base 5
```

---

# 7. ลัคนาเกิด (Birth Lagna)

## ความหมาย

จุดตั้งต้นพลังงานชีวิต

---

## คำนวณจาก

เวลาเกิด

---

## ระบบยาม

1 ยามใหญ่

90 นาที

แบ่งเป็น

```txt
ยามต้น 30 นาที
ยามกลาง 30 นาที
ยามปลาย 30 นาที
```

---

## Mapping

```txt
ยามต้น
→ ฐานวัน

ยามกลาง
→ ฐานเดือน

ยามปลาย
→ ฐานปี
```

---

## Output

```ts
{
 lagnaHouse: "สหัชชะ",
 lagnaBase: 2
}
```

---

# 8. ลัคนาจร (Progressive Lagna)

## ความหมาย

วิวัฒนาการตัวตนตามช่วงอายุ

---

## วิธีคำนวณ

เริ่มจากตำแหน่ง ล

แล้วเดินทีละภพ

ตามอายุย่าง

---

Formula

```ts
lagnaTransit =
(
 lagnaBirthPosition
 +
 ageEntering
)
%
21;
```

---

## Example

```txt
ลัคนาเกิด
=
ปุตตะ

อายุย่าง
=
31

ลัคนาจร
=
สหัชชะ
```

---

# 9. JSON Output Structure

```ts
export interface TransitResult {

 lifeCycle: {
   startAge: number;
   endAge: number;
   house: string;
   star: number;
 };

 annualTransit: {
   house: string;
   star: number;
   emphasizeStar: number;
 };

 monthlyTransit: {
   lunarMonth: number;
   house: string;
   emphasizeStar: number;
 };

 dailyTransit: {
   weekday: number;
   house: string;
   emphasizeStar: number;
 };

 birthLagna: {
   house: string;
   base: number;
 };

 transitLagna: {
   house: string;
 };
}
```

---

# 10. Dashboard Components

## Horoscope Dashboard

Tabs

```txt
[พื้นดวง]

[วัยจร]

[ปีจร]

[เดือนจร]

[วันจร]

[ลัคนา]

[ยามอัฐกาล]

[AI Report]
```

---

# 11. AI Narrative Engine

สูตรการตีความ

```txt
ภพ
+
ดาว
+
ดาวย้ำ
+
วัยจร
+
ปีจร
+
ลัคนาจร
=
คำพยากรณ์
```

---

# Example

```txt
วัยจร
=
สหัชชะ

ปีจร
=
สหัชชะ

ดาวย้ำ
=
เสาร์

ลัคนาจร
=
อริ
```

AI Insight

* เด่นเรื่องการสื่อสาร
* ขยายเครือข่าย
* ระวังความขัดแย้งจากคำพูด
* เหมาะสร้างระบบงานระยะยาว
* ควรลงทุนกับการเรียนรู้และความร่วมมือ

````

---

# Future Module

```txt
Transit Engine v3
├── วัยจร
├── ปีจร
├── เดือนจร
├── วันจร
├── ลัคนาเกิด
├── ลัคนาจร
├── ยามอัฐกาล
├── กาลชะตา
├── ฤกษ์ยามจร
└── AI Prediction Engine
````
