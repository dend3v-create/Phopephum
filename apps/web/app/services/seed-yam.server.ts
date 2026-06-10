/**
 * seed-yam.server.ts — Generate + Upsert ดวงยามสำเร็จ 112 ผัง → Supabase
 * ใช้ createServiceRoleClient (bypasses RLS)
 */
import { createServiceRoleClient } from "~/services/supabase.server";
import {
  loadSuccessYam,
  getYamTimeRange,
  interpretChart,
  ZODIAC_ORDER,
} from "@phopephum/engine";
import type { Env } from "~/env.server";

// ─── Constants ────────────────────────────────────────────────────────────────

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

  // planets: label → zodiacIndex
  const planets: Record<string, number> = {};
  for (const entry of result.planetEntries) {
    const key = PLANET_KEY_MAP[entry.label];
    if (key !== undefined) planets[key] = entry.zodiacIndex;
  }

  // houses: bhavaName(TH) → zodiacIndex (invert bhavaMap)
  const houses: Record<string, number> = {};
  for (const [zodiacIdxStr, bhavaName] of Object.entries(result.bhavaMap)) {
    const key = BHAVA_KEY_MAP[bhavaName];
    if (key) houses[key] = Number(zodiacIdxStr);
  }

  // time slots (start times of 12 sub-slots)
  const timeSlots = result.subTimeSlots.map(s => s.startStr);

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
    chart_snapshot:  null, // ไม่เก็บ full snapshot เพื่อประหยัด storage
  };
}

// ─── Seed Function ────────────────────────────────────────────────────────────

export async function seedSuccessYamCharts(
  env: Env
): Promise<{ success: boolean; upserted: number; errors: number; error?: string }> {
  const supabase = createServiceRoleClient(env);

  // Generate all 112 rows
  const rows = [];
  for (let w = 0; w < 7; w++) {
    for (const period of ["day", "night"] as const) {
      for (let y = 1; y <= 8; y++) {
        rows.push(buildRow(w, period, y));
      }
    }
  }

  // Upsert in batches of 20 (Supabase limit)
  const BATCH = 20;
  let upserted = 0;
  let errors   = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("success_yam_charts")
      .upsert(batch, { onConflict: "id" });

    if (error) {
      console.error(`Batch ${i / BATCH + 1} error:`, error.message);
      errors += batch.length;
    } else {
      upserted += batch.length;
    }
  }

  return { success: errors === 0, upserted, errors };
}
