/**
 * types/horoscope.ts
 * Unified types for Thai Astrology Engine.
 */

export interface BirthInput {
  fullName?: string;
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:MM
  province: string;
  latitude?: number;
  longitude?: number;
}

export interface EngineLunarDate {
  lunarDay: number;
  lunarMonth: number;
  lunarYear: number;
  moonPhase: string;
  thaiDateText: string;
  isWanPhra: boolean;
}

export interface TaksaResult {
  position: number;
  meaning: string;
  isAuspicious: boolean;
}

export interface HoroscopeResult {
  lunar: EngineLunarDate;
  sevenBase: number[][]; // 9x7 Matrix
  taksa: string[];
  ageCycle: number;
  emperorChart: any;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}
