/**
 * regen_success_yam_data.mts — Regenerate success-yam-data.ts
 * Run: npx tsx ./scripts/regen_success_yam_data.mts
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import engine directly (relative path works in ESM)
import { calculateHoraTaynoo } from '../packages/engine/src/hora-thai-nu/hora-taynoo-engine.js';

const WEEKDAY_ID = ['sun','mon','tue','wed','thu','fri','sat'] as const;

function generate() {
  const resultObj: Record<string, any> = {};

  for (let w = 0; w < 7; w++) {
    for (const period of ['day','night'] as const) {
      for (let y = 1; y <= 8; y++) {
        const startMin = period === 'day' ? 360 + (y - 1) * 90 : 1080 + (y - 1) * 90;
        const hour = Math.floor((startMin % 1440) / 60);
        const minute = startMin % 60;
        
        const res = calculateHoraTaynoo({
          dayOverride: w,
          hour,
          minute
        });

        const id = `${WEEKDAY_ID[w]}-${period}-${y}`;
        const planets: Record<string, number> = {};
        const statuses: Record<string, string> = {};

        const KEYS = ['1','2','3','4','5','6','7','8','la','9','0'];
        res.planetEntries.forEach((entry, idx) => {
          const key = KEYS[idx];
          planets[key] = entry.zodiacIndex;
          if (entry.status) {
            statuses[key] = entry.status;
          }
        });

        resultObj[id] = {
          planets,
          lagnaZodiacIndex: res.lagnaZodiacIndex,
          statuses
        };
      }
    }
  }

  // Format as Typescript code
  const code = `
/**
 * success-yam-data.ts
 * ฐานข้อมูลดวงยามสำเร็จ 112 ผัง (คำนวณจากสูตรตรงตามเอกสารอ้างอิง)
 * อ้างอิง: วิธีการลงดาวลอยแบบละเอียด V.2.md + การระวังในการวาง มฤตยู(๐).md
 */

export const SUCCESS_YAM_DATA: Record<string, {
  planets: Record<string, number>;
  lagnaZodiacIndex: number;
  statuses: Record<string, string>;
}> = ${JSON.stringify(resultObj, null, 2)};
`;

  const destPath = path.resolve(__dirname, '../packages/engine/src/hora-thai-nu/datasets/success-yam-data.ts');
  fs.writeFileSync(destPath, code, 'utf-8');
  console.log(`Successfully regenerated success-yam-data.ts at ${destPath}`);
}

generate();
