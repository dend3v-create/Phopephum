/**
 * admin.yam-editor.tsx — กรอกข้อมูลดวงยามสำเร็จด้วยตัวเอง (แบบ A)
 * ทีละวัน 16 ยาม (8 กลางวัน + 8 กลางคืน) → upsert ลง Supabase
 */
import { json, redirect } from "@remix-run/cloudflare";
import {
  Form, useLoaderData, useNavigation, useSearchParams, useActionData,
} from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAdmin } from "~/services/auth.server";
import { createServiceRoleClient } from "~/services/supabase.server";
import {
  ZODIAC_ORDER,
  BHAVA_NAMES,
  PLANET_INFO,
  DAY_YAM,
  NIGHT_YAM,
  getYamTimeRange,
  getPlanetStatus,
  buildBhavaMap,
  BHAVA_KNOWLEDGE,
  PLANET_KNOWLEDGE,
  STATUS_KNOWLEDGE,
} from "@phopephum/engine";
import type { Env } from "~/env.server";

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAY_ID   = ["sun","mon","tue","wed","thu","fri","sat"] as const;
const WEEKDAY_THAI = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์","เสาร์"] as const;
const DAY_COLORS   = ["#E8920A","#7B8FA1","#C0392B","#27AE60","#B8860B","#9B59B6","#546E7A"];

// ดาวลอย 11 ดวง ที่ต้องกรอก (label, key, thai name)
const PLANET_INPUTS = [
  { key: "1",  label: "๑", name: "อาทิตย์" },
  { key: "2",  label: "๒", name: "จันทร์" },
  { key: "3",  label: "๓", name: "อังคาร" },
  { key: "4",  label: "๔", name: "พุธ" },
  { key: "5",  label: "๕", name: "พฤหัส" },
  { key: "6",  label: "๖", name: "ศุกร์" },
  { key: "7",  label: "๗", name: "เสาร์" },
  { key: "8",  label: "๘", name: "ราหู" },
  { key: "9",  label: "๙", name: "เกตุ/9" },
  { key: "0",  label: "๐", name: "0" },
  { key: "la", label: "ลั", name: "ลัคนา" },
] as const;

// ราศี options
const ZODIAC_OPTIONS = ZODIAC_ORDER.map(z => ({ value: z.index, label: `${z.index} — ${z.name}` }));

const BHAVA_KEY_MAP: Record<string, string> = {
  "ตนุ":"tanu","กฎุมภะ":"dhan","สหัชชะ":"saha","พันธุ":"bandhu",
  "ปุตตะ":"putta","อริ":"ari","ปัตนิ":"patni","มรณะ":"marana",
  "ศุภะ":"subha","กัมมะ":"karma","ลาภะ":"labha","วินาศ":"vinasa",
};

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);

  const url        = new URL(request.url);
  const weekdayNum = Number(url.searchParams.get("day") ?? 0);

  const supabase = createServiceRoleClient(env);
  const { data }  = await supabase
    .from("success_yam_charts")
    .select("id,period,yam_no,start_time,end_time,planets,lagna_zodiac_index,overall_score,grade")
    .eq("weekday_num", weekdayNum)
    .order("period").order("yam_no");

  return json({ weekdayNum, rows: data ?? [] });
}

// ─── Action ───────────────────────────────────────────────────────────────────

function computeInterpretation(
  planets: Record<string, number>,
  lagnaIdx: number,
  yamPlanet: number,
) {
  const bhavaMap = buildBhavaMap(lagnaIdx);

  // build mock interpretations
  const interps: { bhavaName: string; planetScore: number; bhavaScore: number; statusScore: number; totalScore: number }[] = [];

  for (const [key, zodiacIndex] of Object.entries(planets)) {
    const planetNum = key === "la" ? null : Number(key);
    if (!planetNum || planetNum > 8) continue;

    const bhavaName = bhavaMap[zodiacIndex];
    const bhavaInfo = BHAVA_KNOWLEDGE[bhavaName];
    const pInfo     = PLANET_KNOWLEDGE[planetNum];
    if (!bhavaInfo || !pInfo) continue;

    const status    = getPlanetStatus(planetNum, zodiacIndex);
    const sInfo     = STATUS_KNOWLEDGE[status ?? "neutral"];
    const total     = Math.round(bhavaInfo.score * 0.4 + pInfo.score * 0.3 + sInfo.score * 0.3);
    interps.push({ bhavaName, planetScore: pInfo.score, bhavaScore: bhavaInfo.score, statusScore: sInfo.score, totalScore: total });
  }

  const getScore = (bhavas: string[]) => {
    const rel = interps.filter(p => bhavas.includes(p.bhavaName));
    return rel.length ? rel.reduce((s, p) => s + p.totalScore, 0) / rel.length : 50;
  };

  const narrate = (score: number, good: string, bad: string) =>
    score >= 75 ? `ดีเยี่ยม: ${good}` :
    score >= 50 ? "ปานกลาง: มีแนวโน้มไปในทางบวก แต่ยังต้องอาศัยความพยายาม" :
    `ควรระวัง: ${bad}`;

  const avg        = interps.length ? interps.reduce((s, p) => s + p.totalScore, 0) / interps.length : 50;
  const yamInterp  = interps.find(p => {
    const bhavaMap2 = buildBhavaMap(lagnaIdx);
    return Object.entries(planets).some(([k, zi]) => k === String(yamPlanet) && bhavaMap2[zi] === p.bhavaName);
  });

  const overall = Math.round(avg * 0.6 + (yamInterp?.totalScore ?? 50) * 0.4);

  const grade = overall >= 80 ? "A" : overall >= 65 ? "B" : overall >= 50 ? "C" : overall >= 40 ? "D" : "F";

  return {
    overall_score: overall,
    grade,
    interp_finance: narrate(getScore(["กฎุมภะ","ลาภะ","พันธุ"]),  "สภาพคล่องดี มีเกณฑ์ได้เงินก้อน", "ระวังรายจ่ายฉุกเฉิน หนี้สิน"),
    interp_work:    narrate(getScore(["กัมมะ","ศุภะ","สหัชชะ"]), "การงานก้าวหน้า ผู้ใหญ่สนับสนุน", "ติดขัดเรื่องงาน ปัญหาการประสานงาน"),
    interp_love:    narrate(getScore(["ปัตนิ","ปุตตะ","ตนุ"]),   "ความรักสดใส มีเกณฑ์พบคนถูกใจ", "ระวังขัดแย้งกับคนรัก"),
    interp_health:  narrate(getScore(["ตนุ","อริ","มรณะ"]),       "สุขภาพแข็งแรง ปลอดภัย", "มีเกณฑ์เจ็บป่วยหรืออุบัติเหตุ"),
    interp_law:     narrate(getScore(["อริ","ศุภะ","ลาภะ"]),      "คดีความคลี่คลายเป็นต่อ", "มีความเสี่ยงทางกฎหมาย"),
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);

  const fd          = await request.formData();
  const weekdayNum  = Number(fd.get("weekday_num") ?? 0);
  const supabase    = createServiceRoleClient(env);

  // Build 16 rows from form fields: yam{i}_p{key} + yam{i}_lagna
  const rows = [];
  for (let i = 0; i < 16; i++) {
    const period  = i < 8 ? "day" : "night";
    const yamNo   = (i % 8) + 1;
    const id      = `${WEEKDAY_ID[weekdayNum]}-${period}-${yamNo}`;
    const { start, end } = getYamTimeRange(period, yamNo);

    const lagnaIdx = Number(fd.get(`yam${i}_lagna`) ?? 0);

    // planets
    const planets: Record<string, number> = {};
    for (const { key } of PLANET_INPUTS) {
      const val = fd.get(`yam${i}_p${key}`);
      if (val !== null && val !== "") planets[key] = Number(val);
    }

    // houses from lagna
    const bhavaMap = buildBhavaMap(lagnaIdx);
    const houses: Record<string, number> = {};
    for (const [zodiacIdxStr, bhavaName] of Object.entries(bhavaMap)) {
      const hKey = BHAVA_KEY_MAP[bhavaName];
      if (hKey) houses[hKey] = Number(zodiacIdxStr);
    }

    // yam planet
    const yamPlanetArr = period === "day" ? DAY_YAM[weekdayNum] : NIGHT_YAM[weekdayNum];
    const yamPlanet    = yamPlanetArr?.[yamNo - 1] ?? 1;

    const interp = computeInterpretation(planets, lagnaIdx, yamPlanet);

    rows.push({
      id,
      weekday:          WEEKDAY_ID[weekdayNum],
      weekday_num:      weekdayNum,
      weekday_name_th:  WEEKDAY_THAI[weekdayNum],
      period,
      yam_no:           yamNo,
      start_time:       start,
      end_time:         end,
      planets,
      houses,
      lagna_zodiac_index: lagnaIdx,
      lagna_zodiac_name:  ZODIAC_ORDER[lagnaIdx]?.name ?? null,
      yam_planet:       yamPlanet,
      day_planet:       yamPlanetArr?.[0] ?? 1,
      ...interp,
      chart_snapshot:   null,
    });
  }

  let upserted = 0;
  let errors   = 0;
  for (const row of rows) {
    const { error } = await supabase
      .from("success_yam_charts")
      .upsert(row, { onConflict: "id" });
    if (error) { console.error(row.id, error.message); errors++; }
    else upserted++;
  }

  return json({ success: errors === 0, upserted, errors, weekdayNum });
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function ZodiacSelect({ name, defaultValue }: { name: string; defaultValue?: number }) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? 0}
      className="w-full bg-[#020617] border border-white/10 rounded-lg px-1.5 py-1 text-xs text-[#F8F6F1] focus:outline-none focus:border-[#C9A96E]/40"
    >
      {ZODIAC_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function YamEditorPage() {
  const { weekdayNum, rows } = useLoaderData<typeof loader>();
  const actionData           = useActionData<typeof action>();
  const nav                  = useNavigation();
  const [, setSearch]        = useSearchParams();
  const isSaving             = nav.state === "submitting";

  // Build lookup: id → current planets + lagna
  const rowMap = Object.fromEntries(rows.map(r => [r.id, r]));

  // 16 yam definitions
  const yams = Array.from({ length: 16 }, (_, i) => {
    const period  = i < 8 ? "day" as const : "night" as const;
    const yamNo   = (i % 8) + 1;
    const id      = `${WEEKDAY_ID[weekdayNum]}-${period}-${yamNo}`;
    const { start, end } = getYamTimeRange(period, yamNo);
    const existing = rowMap[id];
    return { i, period, yamNo, id, start, end, existing };
  });

  return (
    <div className="space-y-5 pb-16 px-2 sm:px-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-xl font-bold text-[#C9A96E]">กรอกข้อมูลดวงยาม</h1>
          <p className="text-[#8A8070] text-xs mt-0.5">วัน{WEEKDAY_THAI[weekdayNum]} — 16 ยาม (8 กลางวัน + 8 กลางคืน)</p>
        </div>
        <a href="/admin/seed-yam" className="ml-auto text-xs text-[#8A8070] hover:text-[#C9A96E] border border-white/10 px-3 py-1.5 rounded-xl">
          ← Seed อัตโนมัติ
        </a>
      </div>

      {/* Day selector */}
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAY_THAI.map((name, i) => (
          <button key={i} type="button"
            onClick={() => {
              const sp = new URLSearchParams();
              sp.set("day", String(i));
              setSearch(sp);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              weekdayNum === i
                ? "border-[#C9A96E]/50 text-[#C9A96E]"
                : "border-white/10 text-[#8A8070] hover:border-white/20 hover:text-[#F8F6F1]"
            }`}
            style={weekdayNum === i ? { background: `${DAY_COLORS[i]}20` } : {}}>
            {name}
          </button>
        ))}
      </div>

      {/* Result banner */}
      {actionData && (
        <div className={`rounded-xl p-3 border text-sm ${
          actionData.success
            ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
            : "bg-rose-950/30 border-rose-500/30 text-rose-300"
        }`}>
          {actionData.success
            ? `✅ บันทึกสำเร็จ ${actionData.upserted} ยาม — วัน${WEEKDAY_THAI[actionData.weekdayNum]}`
            : `❌ ข้อผิดพลาด: ${actionData.errors} ยามบันทึกไม่ได้`}
        </div>
      )}

      {/* Main form */}
      <Form method="post">
        <input type="hidden" name="weekday_num" value={weekdayNum} />

        {/* Grid: Day (left) + Night (right) */}
        {(["day","night"] as const).map(period => (
          <div key={period} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-[#C9A96E]">
                {period === "day" ? "☀ กลางวัน (ยาม 1–8)" : "☽ กลางคืน (ยาม 1–8)"}
              </span>
            </div>

            <div className="space-y-3">
              {yams.filter(y => y.period === period).map(({ i, yamNo, id, start, end, existing }) => {
                const existingPlanets = (existing?.planets ?? {}) as Record<string, number>;
                const existingLagna  = existing?.lagna_zodiac_index ?? 0;
                const hasData        = existing && Object.keys(existingPlanets).length > 0;

                return (
                  <div key={id} className={`rounded-xl border p-3 ${
                    hasData
                      ? "border-[#C9A96E]/20 bg-slate-900/40"
                      : "border-white/8 bg-slate-950/20"
                  }`}>
                    {/* Yam header */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-display text-lg font-bold text-[#C9A96E] w-6 text-center">{yamNo}</span>
                      <span className="text-xs text-[#8A8070] font-mono">{start}–{end}</span>
                      {hasData && (
                        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          existing.grade === "A" ? "text-emerald-400 border-emerald-500/40 bg-emerald-950/30" :
                          existing.grade === "B" ? "text-blue-400 border-blue-500/40 bg-blue-950/30" :
                          existing.grade === "C" ? "text-amber-400 border-amber-500/40 bg-amber-950/30" :
                          "text-rose-400 border-rose-500/40 bg-rose-950/30"
                        }`}>{existing.grade} {existing.overall_score}</span>
                      )}
                    </div>

                    {/* Planet grid */}
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 mb-2">
                      {PLANET_INPUTS.map(({ key, label, name }) => (
                        <div key={key}>
                          <label className="block text-[9px] text-[#5A5148] mb-0.5 text-center">
                            <span className="text-[#C9A96E] font-bold">{label}</span> {name}
                          </label>
                          <ZodiacSelect
                            name={`yam${i}_p${key}`}
                            defaultValue={existingPlanets[key] ?? 0}
                          />
                        </div>
                      ))}

                      {/* Lagna */}
                      <div>
                        <label className="block text-[9px] text-[#5A5148] mb-0.5 text-center">
                          <span className="text-blue-400 font-bold">ลัคนา</span>
                        </label>
                        <ZodiacSelect
                          name={`yam${i}_lagna`}
                          defaultValue={existingLagna}
                        />
                      </div>
                    </div>

                    {/* Preview existing bhava if saved */}
                    {hasData && ZODIAC_ORDER[existingLagna] && (
                      <p className="text-[9px] text-[#8A8070]">
                        ลัคนา: <span className="text-[#C9A96E]">{ZODIAC_ORDER[existingLagna]?.name}</span>
                        {" · "}ภพตนุ = {ZODIAC_ORDER[existingLagna]?.name}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Submit */}
        <div className="sticky bottom-4 mt-6">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3.5 rounded-xl font-bold text-sm border border-[#C9A96E]/40 bg-[#C9A96E]/10 text-[#C9A96E] hover:bg-[#C9A96E]/20 disabled:opacity-50 transition-all shadow-lg"
          >
            {isSaving
              ? "⏳ กำลังบันทึก..."
              : `💾 บันทึกทั้ง 16 ยาม — วัน${WEEKDAY_THAI[weekdayNum]}`}
          </button>
        </div>
      </Form>
    </div>
  );
}
