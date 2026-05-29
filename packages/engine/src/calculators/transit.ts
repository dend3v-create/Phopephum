/**
 * calculators/transit.ts
 * ดาวจร (Transit) — ตำแหน่งดาวปัจจุบัน ณ วันที่ระบุ
 *
 * ใช้ pure JS ephemeris (edge-compatible)
 * ดาวจรสำคัญ: พฤหัส (กำลัง/โชค), เสาร์ (วินัย/กรรม), ราหู (โอกาสพิเศษ)
 */

import { dateToJulianDay } from '../core/julianDay.js'
import { calculateAllPlanets, AllPlanets, PlanetPosition } from '../core/ephemeris.js'
import { getZodiacSign } from '../core/zodiac.js'
import { calculatePlanetaryPower, PlanetPowerResult } from './planetaryPower.js'

export interface TransitPlanet {
  planet:    string
  nameThai:  string
  longitude: number
  signName:  string
  power:     PlanetPowerResult
  speed:     number
  retrograde: boolean
}

export interface TransitResult {
  date:     Date
  planets:  Record<string, TransitPlanet>
  /** ดาวสำคัญที่กระทบวันนี้ */
  keyTransits: string[]
  /** สรุปดาวจรประจำวัน */
  dailyTransitSummary: string
}

function toPlanetTransit(p: PlanetPosition): TransitPlanet {
  return {
    planet:    p.name,
    nameThai:  p.nameThai,
    longitude: p.longitude,
    signName:  getZodiacSign(p.longitude),
    power:     calculatePlanetaryPower(p.longitude, p.name),
    speed:     p.speed,
    retrograde: p.speed < 0,
  }
}

/**
 * คำนวณดาวจรทั้ง 9 ณ วันที่กำหนด
 * @param date วันที่ (default: วันนี้)
 */
export function calculateTransit(date: Date = new Date()): TransitResult {
  const jd = dateToJulianDay(date)
  const all: AllPlanets = calculateAllPlanets(jd)

  const planets: Record<string, TransitPlanet> = {
    sun:     toPlanetTransit(all.sun),
    moon:    toPlanetTransit(all.moon),
    mercury: toPlanetTransit(all.mercury),
    venus:   toPlanetTransit(all.venus),
    mars:    toPlanetTransit(all.mars),
    jupiter: toPlanetTransit(all.jupiter),
    saturn:  toPlanetTransit(all.saturn),
    rahu:    toPlanetTransit(all.rahu),
    ketu:    toPlanetTransit(all.ketu),
  }

  // ดาวสำคัญ: พลังสูง (score >= 8)
  const keyTransits = Object.values(planets)
    .filter(p => p.power.powerScore >= 8)
    .map(p => `${p.nameThai} ใน${p.signName} (${p.power.powerLevel})`)

  const dailyTransitSummary =
    `ดวงอาทิตย์: ${planets.sun.signName} | ` +
    `ดวงจันทร์: ${planets.moon.signName} | ` +
    `พฤหัส: ${planets.jupiter.signName} | ` +
    `เสาร์: ${planets.saturn.signName}` +
    (planets.saturn.retrograde ? ' (ถอยหลัง)' : '')

  return { date, planets, keyTransits, dailyTransitSummary }
}

/**
 * ดาวจรพฤหัส + เสาร์ (ใช้สำหรับ RAG context)
 */
export function getMajorTransits(date: Date = new Date()): {
  jupiter: TransitPlanet
  saturn:  TransitPlanet
  rahu:    TransitPlanet
} {
  const result = calculateTransit(date)
  return {
    jupiter: result.planets.jupiter!,
    saturn:  result.planets.saturn!,
    rahu:    result.planets.rahu!,
  }
}
