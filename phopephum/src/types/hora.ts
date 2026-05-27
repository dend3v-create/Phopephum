/**
 * types/hora.ts
 * Re-export types จาก hora-calculator engine
 */
export type {
  DayOfWeek,
  PlanetId,
  HourPeriod,
  Planet,
  HoraSlot,
  HoraMajorSlot,
  HoraResult,
  CurrentHoraInfo,
  HoraInput,
} from '@/engine/phopephum-calculator'

// Transit types
export interface TransitPeriod {
  type: 'age' | 'year' | 'month' | 'day'
  startDate: string
  endDate: string
  rulerPlanetId: string
  description?: string
}

export interface TransitResult {
  agePeriod: TransitPeriod
  yearPeriod: TransitPeriod
  monthPeriod: TransitPeriod
  dayPeriod: TransitPeriod
}

// Chart types
export interface ChartPosition {
  houseNumber: number       // ภพที่ 1-12
  planetId: string
  degree: number
}

export interface NatalChart {
  positions: ChartPosition[]
  ascendant: ChartPosition
  sevenNumbers?: number[]   // เลข 7 ตัว 9 ฐาน (Premium only)
}
