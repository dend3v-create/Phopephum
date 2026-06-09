/**
 * types.ts — SuccessYam data types
 */

export interface SuccessYamEntry {
  id: string                    // "mon-day-1"
  weekday: string               // "monday" | "tuesday" | ...
  period: 'day' | 'night'
  yamNo: number                 // 1–8
  startTime: string             // "06:00"
  endTime: string               // "07:30"
  lagna: string                 // Thai zodiac name, e.g. "กรกฎ"

  /** planet label → Thai zodiac name */
  planets: {
    '1': string; '2': string; '3': string; '4': string;
    '5': string; '6': string; '7': string; '8': string;
    '9': string; '0': string; 'ล': string;
  }

  /** bhava key → Thai zodiac name */
  houses: {
    tanu: string;   dhan: string;   saha: string;    bandhu: string;
    putta: string;  ari: string;    patni: string;   marana: string;
    subha: string;  karma: string;  labha: string;   vinasa: string;
  }

  /** planets that have special dignity in this chart */
  specialMarks: { planet: string; type: string }[]
}

export interface WeekdayCharts {
  day1: SuccessYamEntry;   day2: SuccessYamEntry;   day3: SuccessYamEntry;   day4: SuccessYamEntry;
  day5: SuccessYamEntry;   day6: SuccessYamEntry;   day7: SuccessYamEntry;   day8: SuccessYamEntry;
  night1: SuccessYamEntry; night2: SuccessYamEntry; night3: SuccessYamEntry; night4: SuccessYamEntry;
  night5: SuccessYamEntry; night6: SuccessYamEntry; night7: SuccessYamEntry; night8: SuccessYamEntry;
}
