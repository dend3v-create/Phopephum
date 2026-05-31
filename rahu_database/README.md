# ยามราหูค้นทรัพย์ — Database Package

## ไฟล์ในชุดนี้

| ไฟล์ | คำอธิบาย |
|------|----------|
| `01_schema.sql` | SQL สร้างตาราง 4 ตาราง |
| `02_seed_data.sql` | Seed Data ครบทุกตาราง (112 rows yam_matrix) |
| `03_rahu_database.ts` | TypeScript types + data + Calculator Engine |
| `04_api_route.ts` | Next.js API Route (/api/rahu) |

## โครงสร้างฐานข้อมูล

```
time_blocks (16 rows)    ← รอบเวลา 1.5 ชม. (กลางวัน 8 + กลางคืน 8)
sub_blocks  (9 rows)     ← ยามย่อย 10 นาที (วนซ้ำทุกรอบ)
yam_rules   (7 rows)     ← คำทำนาย 4 มิติ ประจำยาม 1-7
yam_matrix  (112 rows)   ← 7 วัน × 16 รอบ = mapping วัน→ยาม
```

## การใช้งาน (TypeScript)

```typescript
import { calculateRahu } from './03_rahu_database';

const result = calculateRahu(new Date());
console.log(result?.summary.overall_verdict);
// → "✨ ฤกษ์ดี — เหมาะแก่การเดินทาง"

// ระบุเวลาเอง
const d = new Date();
d.setHours(14, 25);
const result2 = calculateRahu(d);
```

## Logic การคำนวณ

1. รับ Date → หา day_of_week (1-7) + totalMinutes
2. findTimeBlock() → หา time_block ที่ totalMinutes ตกอยู่
3. คำนวณ minutesElapsed = totalMinutes - block.start
4. SUB_BLOCKS.find() → หาชื่อยามย่อย + is_good
5. YAM_MATRIX.find(day + block_id) → yamNumber
6. YAM_RULES.find(yamNumber) → คำทำนาย
7. ตรวจ phase ว่าตรงกับ traibhum_result → verdict
