/**
 * generate-success-yam-data.ts
 * Run via: pnpm --filter @phopephum/engine test --run scripts/generate-success-yam-data
 * Generates fresh success-yam-data.ts using the corrected bounce algorithm.
 */

import { describe, it } from 'vitest'
import {
  calculateHoraTaynoo,
  YAM_START,
} from '../src/hora-thai-nu/hora-taynoo-engine'
import { writeFileSync } from 'fs'
import { join } from 'path'

const WEEKDAY_ID = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

describe('generate-success-yam-data', () => {
  it('generates 112 charts and writes success-yam-data.ts', () => {
    const records: Record<string, {
      planets: Record<string, number>
      lagnaZodiacIndex: number
      statuses: Record<string, string>
    }> = {}

    for (let w = 0; w < 7; w++) {
      for (const period of ['day', 'night'] as const) {
        for (let y = 1; y <= 8; y++) {
          const id = `${WEEKDAY_ID[w]}-${period}-${y}`
          const startMin = YAM_START[period][y - 1]
          const safeMin = ((startMin % 1440) + 1440) % 1440
          const h = Math.floor(safeMin / 60)
          const m = safeMin % 60

          const result = calculateHoraTaynoo({ dayOverride: w, hour: h, minute: m })

          // planets: label → zodiacIndex
          const planets: Record<string, number> = {}
          for (const entry of result.planetEntries) {
            const key = entry.label === 'ล' ? 'la' : entry.label
            planets[key] = entry.zodiacIndex
          }

          // statuses: only non-null
          const statuses: Record<string, string> = {}
          for (const entry of result.planetEntries) {
            if (entry.status && entry.planetNum != null) {
              const key = entry.label === 'ล' ? 'la' : entry.label
              statuses[key] = entry.status
            }
          }

          records[id] = {
            planets,
            lagnaZodiacIndex: result.lagnaZodiacIndex,
            statuses,
          }
        }
      }
    }

    const output = `/**
 * success-yam-data.ts
 * ฐานข้อมูลดวงยามสำเร็จ 112 ผัง (คำนวณจากสูตรตรงตามเอกสารอ้างอิง)
 * Generated: ${new Date().toISOString()}
 */

export const SUCCESS_YAM_DATA: Record<string, {
  planets: Record<string, number>;
  lagnaZodiacIndex: number;
  statuses: Record<string, string>;
}> = ${JSON.stringify(records, null, 2)};
`

    const outPath = join(__dirname, '../src/hora-thai-nu/datasets/success-yam-data.ts')
    writeFileSync(outPath, output, 'utf-8')

    const count = Object.keys(records).length
    console.log(`✓ Generated ${count} charts → success-yam-data.ts`)
  })
})
