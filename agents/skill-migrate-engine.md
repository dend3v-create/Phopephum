# SKILL: migrate-engine

## Purpose
Extend or fix calculation logic in `packages/engine/src/`
ห้าม import framework ใดๆ — pure TypeScript เท่านั้น

## Status: ✅ Phase 1 Migration COMPLETE

ทุก calculator จาก Next.js source ได้รับการ migrate แล้ว
horoscopeEngine ใช้ **Thai lunar system** แล้ว (ไม่ใช่ Western digit root)

---

## What's Built

### calculators/ (all complete)
| File | Status | Notes |
|---|---|---|
| `calculateBase.ts` | ✅ | digit root helper (Western, ใช้เฉพาะ legacy) |
| `calculateSevenNumbers.ts` | ✅ | Western system — superseded by sevenBase.ts |
| `sevenBase.ts` | ✅ | **Thai mod-7 system** — primary calculator |
| `nineBase.ts` | ✅ | แปลง 7-base → 9-base (รวม ราหู/เกตุ) |
| `matrixBuilder.ts` | ✅ | ผัง 9×7 matrix |
| `emperorChart.ts` | ✅ | ผังดวงจักรพรรดิ |
| `ageCycle.ts` | ✅ | วัยจร 7 ช่วง |
| `taksa.ts` | ✅ | ทักษา 8 ตำแหน่ง (1-arg: returns string[]) |
| `calculateTransit.ts` | ✅ | monthly transit + vaya chon |
| `calculateMoonPhase.ts` | ✅ | moon phase + isWanPhra |
| `calculateAtthakarn.ts` | ✅ | อัฐกาล |
| `calculateAuspiciousTime.ts` | ✅ | ฤกษ์มงคล |
| `calculateLagna.ts` | ✅ | ลัคนา |
| `calculateNavamsa.ts` | ✅ | นวางค์ |
| `calculateHouse.ts` | ✅ | บ้าน |
| `calculatePower.ts` | ✅ | กำลังดาว |
| `calendarConverter.ts` | ✅ | ปฏิทินแปลง |
| `houseMapper.ts` | ✅ | แผนที่บ้าน |
| `planetaryPower.ts` | ✅ | พลังดาวเคราะห์ |
| `transit.ts` | ✅ | ดาวจรแบบ real-time |

### core/ (complete)
| File | Status | Notes |
|---|---|---|
| `lunarCalendar.ts` | ✅ | 100-year lookup + Suriyayat fallback |
| `geoLocation.ts` | ✅ | 77 จังหวัด Thai provinces |
| `thaiLunar.ts` | ✅ | Thai lunar helpers |
| `thaiDate.ts` | ✅ | Thai date formatting |
| `astroTime.ts` | ✅ | sunrise/sunset |
| `julianDay.ts` | ✅ | JD calculations |
| `ephemeris.ts` | ✅ | planetary ephemeris |
| `zodiac.ts` | ✅ | zodiac signs |
| `newMoon.ts` | ✅ | new moon dates |

### yam/ (complete)
All yam calculation modules built and wired in `getCurrentYam()`

### engine/ (orchestrators)
| File | Status |
|---|---|
| `horoscopeEngine.ts` | ✅ Thai lunar — getThaiLunarDate + calculateSevenBase + 06:00 cutoff |

---

## Authentic Thai Horoscope Algorithm

**horoscopeEngine.ts flow:**
1. Apply 06:00 cutoff: เกิดก่อน 06:00 → ใช้วันก่อนหน้า
2. `getThaiLunarDate(effectiveDateStr)` → lunarDay, lunarMonth, lunarYear
3. `calculateSevenBase(lunarDay, lunarMonth, lunarYear)` → [dayBase, monthBase, yearBase] (mod 7, 1-7)
4. `calculateSevenMasterBase(sevenBase)` → masterBase
5. Derived: karmic = mod7(day+year), crown = mod7(month+master)
6. `calculateAgeCycle(birthYear)` → transit phase
7. Return SevenNumbers + transitPhase

**Key rules:**
- ใช้ `mod7(n) = n % 7 || 7` — ไม่ใช่ digit root
- ใช้ lunarDay/Month/Year — ไม่ใช่ Gregorian
- `calculateTaksa(birthDay)` returns `string[]` (8 positions) — export จาก `taksa.ts` ไม่ใช่ `calculateTransit.ts`

---

## Barrel Export Rules

`calculators/index.ts` — important rules:
- `calculateTaksa` exported from `./taksa.js` only (via `export *`)
- `calculateTransit` exported from `./calculateTransit.js` named export (no `calculateTaksa`)
- ห้าม export ชื่อซ้ำจาก 2 files

---

## When to Use This Skill

- แก้ calculation bug ในระบบ engine
- เพิ่ม calculator ใหม่ (เช่น ฤกษ์มงคล extended)
- ปรับปรุง algorithm ให้แม่นยำขึ้น
- เพิ่ม dataset ใหม่ใน `packages/engine/src/datasets/`

## Migration Rules (still apply for new files)

1. No framework imports (`next/*`, `react`, `react-native`)
2. Named exports only: `export function calculateXxx()`
3. Add to barrel: `packages/engine/src/calculators/index.ts`
4. Add types to `packages/types/src/index.ts` if needed
5. No side effects, no console.log, no fetch
