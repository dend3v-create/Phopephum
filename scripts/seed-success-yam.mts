/**
 * seed-success-yam.mts — Seed ดวงยามสำเร็จ 112 ผัง → Supabase
 * รัน: npx tsx scripts/seed-success-yam.mts
 */
import { createClient } from "@supabase/supabase-js";
import {
  loadSuccessYam,
  getYamTimeRange,
  interpretChart,
  ZODIAC_ORDER,
} from "../packages/engine/src/hora-thai-nu/index.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = "https://zogmmylndlpcpzhjoutv.supabase.co";
const SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ21teWxuZGxwY3B6aGpvdXR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTgwODA4OCwiZXhwIjoyMDk1Mzg0MDg4fQ.mJOv82byRKaIITCvQ6ON5LQrhGLvFFVG-YQDYfumo1U";

const WEEKDAY_ID   = ["sun","mon","tue","wed","thu","fri","sat"] as const;
const WEEKDAY_THAI = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์","เสาร์"] as const;

const PLANET_KEY_MAP: Record<string, string> = {
  "1":"1","2":"2","3":"3","4":"4","5":"5","6":"6","7":"7",
  "8":"8","9":"9","0":"0","ล":"la",
};

const BHAVA_KEY_MAP: Record<string, string> = {
  "ตนุ":"tanu","กฎุมภะ":"dhan","สหัชชะ":"saha","พันธุ":"bandhu",
  "ปุตตะ":"putta","อริ":"ari","ปัตนิ":"patni","มรณะ":"marana",
  "ศุภะ":"subha","กัมมะ":"karma","ลาภะ":"labha","วินาศ":"vinasa",
};

// ─── Row builder ──────────────────────────────────────────────────────────────

function buildRow(weekday: number, period: "day" | "night", yamNo: number) {
  const id = `${WEEKDAY_ID[weekday]}-${period}-${yamNo}`;
  const result = loadSuccessYam(weekday, period, yamNo);
  const interp  = interpretChart(result);
  const { start, end } = getYamTimeRange(period, yamNo);

  const planets: Record<string, number> = {};
  for (const entry of result.planetEntries) {
    const key = PLANET_KEY_MAP[entry.label];
    if (key !== undefined) planets[key] = entry.zodiacIndex;
  }

  const houses: Record<string, number> = {};
  for (const [zodiacIdxStr, bhavaName] of Object.entries(result.bhavaMap)) {
    const key = BHAVA_KEY_MAP[bhavaName];
    if (key) houses[key] = Number(zodiacIdxStr);
  }

  const timeSlots = result.subTimeSlots.map((s: any) => s.startStr);

  return {
    id,
    weekday:         WEEKDAY_ID[weekday],
    weekday_num:     weekday,
    weekday_name_th: WEEKDAY_THAI[weekday],
    period,
    yam_no:          yamNo,
    start_time:      start,
    end_time:        end,
    planets,
    houses,
    time_slots:      timeSlots,
    lagna_zodiac_index: result.lagnaZodiacIndex,
    lagna_zodiac_name:  ZODIAC_ORDER[result.lagnaZodiacIndex]?.name ?? null,
    yam_planet:      result.yamPlanet,
    day_planet:      result.dayPlanet,
    overall_score:   interp.overallScore,
    grade:           interp.grade,
    interp_finance:  interp.categories.finance,
    interp_work:     interp.categories.work,
    interp_love:     interp.categories.love,
    interp_health:   interp.categories.health,
    interp_law:      interp.categories.law,
    chart_snapshot:  null,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log("Building 112 rows...");
  const rows = [];
  for (let w = 0; w < 7; w++) {
    for (const period of ["day", "night"] as const) {
      for (let y = 1; y <= 8; y++) {
        rows.push(buildRow(w, period, y));
      }
    }
  }

  console.log(`Generated ${rows.length} rows. Upserting in batches...`);
  const BATCH = 20;
  let upserted = 0;
  let errors   = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("success_yam_charts")
      .upsert(batch, { onConflict: "id" });

    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH) + 1} error:`, error.message);
      errors += batch.length;
    } else {
      upserted += batch.length;
      console.log(`  ✓ Batch ${Math.floor(i / BATCH) + 1}: ${upserted} rows`);
    }
  }

  console.log(`\n${errors === 0 ? "✅" : "❌"} Done: upserted=${upserted}, errors=${errors}`);
}

main().catch(console.error);
