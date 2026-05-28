/**
 * engine/chartBuilder.ts
 * Full Birth Chart Builder — รวม ephemeris + lagna + house mapping
 *
 * Pipeline:
 *   birthDate + birthTime + coordinates
 *     → Julian Day
 *     → calculateLagna (Ascendant + houses)
 *     → calculateAllPlanets (Sun/Moon/Mercury/...)
 *     → mapAllPlanetsToHouses
 *     → calculatePlanetaryPower for each planet
 *     → BirthChart result
 */

import { createJulianDay } from '../core/julianDay'
import { calculateAllPlanets } from '../core/ephemeris'
import { calculateLagna, LagnaResult } from '../calculators/lagna'
import { mapAllPlanetsToHouses, PlanetInHouse } from '../calculators/houseMapping'
import { calculatePlanetaryPower, PlanetPowerResult } from '../calculators/planetaryPower'
import { getZodiacSign } from '../core/zodiac'

export interface PlanetData {
  planet:     string
  nameThai:   string
  longitude:  number
  signName:   string
  house:      number
  houseTheme: string
  power:      PlanetPowerResult
  retrograde: boolean
}

export interface BirthChart {
  /** Julian Day ณ เวลาเกิด */
  julianDay:  number

  /** ลัคนา (Ascendant) */
  ascendant: {
    degree:  number
    sign:    string
    ruler:   string
    degreeInSign: number
  }

  /** มัธยลัคนา (Midheaven / MC) */
  mc: { degree: number; sign: string }

  /** เรือนทั้ง 12 (องศาเริ่มต้น) */
  houses: number[]

  /** ดาวทั้ง 9 พร้อมตำแหน่งเรือน */
  planets: Record<string, PlanetData>

  /** ดาวเรียงตามเรือน */
  planetsInHouses: PlanetInHouse[]

  /** สรุปแผนที่ดาว */
  chartSummary: string
}

/**
 * สร้าง Birth Chart เต็มรูปแบบ
 *
 * @param birthDate  "YYYY-MM-DD"
 * @param birthTime  "HH:MM" (เวลาเกิดท้องถิ่น Thailand)
 * @param latitude   ละติจูดเกิด
 * @param longitude  ลองจิจูดเกิด
 */
export async function buildBirthChart(
  birthDate: string,
  birthTime: string,
  latitude:  number,
  longitude: number,
): Promise<BirthChart> {
  const [yStr, mStr, dStr] = birthDate.split('-')
  const [hStr, minStr]     = birthTime.split(':')

  const year     = parseInt(yStr  ?? '2000', 10)
  const month    = parseInt(mStr  ?? '1',    10)
  const day      = parseInt(dStr  ?? '1',    10)
  const hour     = parseInt(hStr  ?? '12',   10)
  const minute   = parseInt(minStr ?? '0',   10)
  const decHour  = hour + minute / 60

  const jd   = createJulianDay(year, month, day, decHour)
  const lagna: LagnaResult = calculateLagna(jd, latitude, longitude)
  const allPlanets         = calculateAllPlanets(jd)

  // Build planet data with house + power
  const planetsRaw: Record<string, { longitude: number; nameThai: string; speed: number }> = {
    sun:     { longitude: allPlanets.sun.longitude,     nameThai: allPlanets.sun.nameThai,     speed: allPlanets.sun.speed },
    moon:    { longitude: allPlanets.moon.longitude,    nameThai: allPlanets.moon.nameThai,    speed: allPlanets.moon.speed },
    mercury: { longitude: allPlanets.mercury.longitude, nameThai: allPlanets.mercury.nameThai, speed: allPlanets.mercury.speed },
    venus:   { longitude: allPlanets.venus.longitude,   nameThai: allPlanets.venus.nameThai,   speed: allPlanets.venus.speed },
    mars:    { longitude: allPlanets.mars.longitude,    nameThai: allPlanets.mars.nameThai,    speed: allPlanets.mars.speed },
    jupiter: { longitude: allPlanets.jupiter.longitude, nameThai: allPlanets.jupiter.nameThai, speed: allPlanets.jupiter.speed },
    saturn:  { longitude: allPlanets.saturn.longitude,  nameThai: allPlanets.saturn.nameThai,  speed: allPlanets.saturn.speed },
    rahu:    { longitude: allPlanets.rahu.longitude,    nameThai: allPlanets.rahu.nameThai,    speed: allPlanets.rahu.speed },
    ketu:    { longitude: allPlanets.ketu.longitude,    nameThai: allPlanets.ketu.nameThai,    speed: allPlanets.ketu.speed },
  }

  const planetsInHousesRaw = mapAllPlanetsToHouses(planetsRaw, lagna.houses)
  const houseMap: Record<string, number> = {}
  planetsInHousesRaw.forEach(p => { houseMap[p.planet] = p.house })

  const planets: Record<string, PlanetData> = {}
  planetsInHousesRaw.forEach(p => {
    const raw = planetsRaw[p.planet]!
    planets[p.planet] = {
      planet:     p.planet,
      nameThai:   p.planetThai,
      longitude:  raw.longitude,
      signName:   p.signName,
      house:      p.house,
      houseTheme: p.houseTheme,
      power:      calculatePlanetaryPower(raw.longitude, p.planet),
      retrograde: raw.speed < 0,
    }
  })

  const ascSign = getZodiacSign(lagna.ascendant)
  const mcSign  = getZodiacSign(lagna.mc)

  const chartSummary =
    `ลัคนา: ${ascSign} ${lagna.degreeInSign.toFixed(1)}° | ` +
    `อาทิตย์: ${planets.sun?.signName ?? ''} เรือน ${planets.sun?.house ?? ''} | ` +
    `จันทร์: ${planets.moon?.signName ?? ''} เรือน ${planets.moon?.house ?? ''} | ` +
    `พฤหัส: ${planets.jupiter?.signName ?? ''} เรือน ${planets.jupiter?.house ?? ''}`

  return {
    julianDay: jd,
    ascendant: {
      degree:       lagna.ascendant,
      sign:         ascSign,
      ruler:        lagna.lagnaRuler,
      degreeInSign: lagna.degreeInSign,
    },
    mc:              { degree: lagna.mc, sign: mcSign },
    houses:          lagna.houses,
    planets,
    planetsInHouses: planetsInHousesRaw,
    chartSummary,
  }
}
