/**
 * dashboard.horanu.tsx — ยามพรายกระซิบ
 * ผังดวงยามพรายกระซิบ V2 — 2 Modes: คำนวณสด + ดวงยามสำเร็จ 112 ผัง
 */
import { json } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, useLoaderData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireMinPlan, requireAuth } from "~/services/auth.server";
import {
  calculateHoraTaynoo,
  generateHoraTaynooSVG,
  loadSuccessYam,
  getSuccessYamMeta,
  getYamTimeRange,
  interpretChart,
  PLANET_INFO,
  ZODIAC_ORDER,
  BHAVA_NAMES,
} from "@phopephum/engine";
import type { HoraTaynooResult, SuccessYamMeta, ChartConfig, ChartInterpretation } from "@phopephum/engine";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import type { Env } from "~/env.server";
import { getYamLibrary } from "~/services/yam-library.server";
import type { YamLibraryRow } from "~/services/yam-library.server";
import { useState, useEffect, useRef } from "react";

export const meta: MetaFunction = () => [
  { title: "ยามพรายกระซิบ — PhopePhum" },
  { name: "description", content: "ผังดวงยามพรายกระซิบ ระบบยามอัฐกาลและดาวลอยโบราณ 11 ดวง ภพ 12 หลัง" },
];

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireMinPlan("basic", request, env);

  const now    = new Date();
  const result = calculateHoraTaynoo({ dateAsked: now });
  const interpretation = interpretChart(result);
  const svg    = generateHoraTaynooSVG(result, { size: 520, theme: "dark" });
  const meta   = getSuccessYamMeta();
  const library = await getYamLibrary(env);

  return json({ result, interpretation, svg, serverTime: now.toISOString(), meta, library });
}

// ─── Action ───────────────────────────────────────────────────────────────────

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAuth(request, env);

  const formData = await request.formData();
  const mode     = formData.get("mode") as string;

  let result: HoraTaynooResult;

  if (mode === "success-yam") {
    const weekday = Number(formData.get("weekday") ?? 0);
    const period  = (formData.get("period") ?? "day") as "day" | "night";
    const yamNo   = Number(formData.get("yamNo") ?? 1);
    result = loadSuccessYam(weekday, period, yamNo);
  } else {
    // custom time
    let targetDate = new Date();
    const day   = Number(formData.get("day")   ?? 0);
    const month = Number(formData.get("month") ?? 0);
    const year  = Number(formData.get("year")  ?? 0);
    const time  = String(formData.get("time")  ?? "12:00");
    const [h, m] = time.split(":").map(Number);
    if (day && month && year) {
      targetDate = new Date(year - 543, month - 1, day, h, m, 0);
    }
    result = calculateHoraTaynoo({ dateAsked: targetDate });
  }

  const interpretation = interpretChart(result);
  const svg = generateHoraTaynooSVG(result, { size: 520, theme: "dark" });
  return json({ result, interpretation, svg, mode });
}

// ─── Display helpers ──────────────────────────────────────────────────────────

const DAY_NAMES_TH = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์","เสาร์"];
const DAY_COLORS   = ["#E8920A","#7B8FA1","#C0392B","#27AE60","#B8860B","#9B59B6","#546E7A"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChartInterpretationPanel({ interpretation }: { interpretation: ChartInterpretation }) {
  const { overallScore, grade, categories } = interpretation;
  const gradeColor = grade === 'A' ? 'text-emerald-400' : grade === 'B' ? 'text-blue-400' : grade === 'C' ? 'text-yellow-400' : 'text-rose-400';
  
  return (
    <Card className="border-[#C9A96E]/15 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[#6EB0F5] rounded-full" />
          <p className="text-[#C9A96E] text-[11px] uppercase tracking-widest font-bold">คำพยากรณ์ดวงยาม (Rule-Based)</p>
        </div>
        <div className="text-right flex items-end gap-2">
          <span className={`font-display text-2xl font-bold leading-none ${gradeColor}`}>{grade}</span>
          <span className="text-[#8A8070] text-[10px]">Score: {overallScore}/100</span>
        </div>
      </div>
      
      <div className="space-y-2">
        {[
          { label: 'การเงิน', text: categories.finance, icon: '💰' },
          { label: 'การงาน', text: categories.work, icon: '💼' },
          { label: 'ความรัก', text: categories.love, icon: '❤️' },
          { label: 'สุขภาพ', text: categories.health, icon: '🏥' },
          { label: 'คดีความ', text: categories.law, icon: '⚖️' },
        ].map(cat => (
          <div key={cat.label} className="bg-[#020617]/50 rounded-xl p-3 border border-white/5">
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">{cat.icon}</span>
              <div>
                <p className="text-[10px] text-[#C9A96E] font-bold mb-0.5">{cat.label}</p>
                <p className="text-xs text-[#F8F6F1] leading-relaxed">{cat.text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function YamBadge({ result }: { result: HoraTaynooResult }) {
  return (
    <div className="grid grid-cols-3 gap-3 text-center">
      <div className="bg-[#C9A96E]/10 border border-[#C9A96E]/25 rounded-2xl p-3">
        <p className="text-[10px] text-[#8A8070] uppercase tracking-wider mb-1">วัน</p>
        <p className="font-display text-lg font-bold text-[#F8F6F1]">{DAY_NAMES_TH[result.dayOfWeek]}</p>
      </div>
      <div className="bg-[#C9A96E]/10 border border-[#C9A96E]/25 rounded-2xl p-3">
        <p className="text-[10px] text-[#8A8070] uppercase tracking-wider mb-1">ยามที่</p>
        <p className="font-display text-3xl font-bold text-[#C9A96E]">{result.yamAsked}</p>
        <p className="text-[10px] text-[#8A8070]">{result.period === "day" ? "กลางวัน" : "กลางคืน"}</p>
      </div>
      <div className="bg-[#C9A96E]/10 border border-[#C9A96E]/25 rounded-2xl p-3">
        <p className="text-[10px] text-[#8A8070] uppercase tracking-wider mb-1">เวลายาม</p>
        <p className="text-sm font-bold text-[#F8F6F1]">{result.yamStartStr}</p>
        <p className="text-[10px] text-[#8A8070]">— {result.yamEndStr}</p>
      </div>
    </div>
  );
}

function PlanetSummary({ result }: { result: HoraTaynooResult }) {
  const dayP = PLANET_INFO[result.dayPlanet];
  const yamP = PLANET_INFO[result.yamPlanet];
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="border border-white/8 bg-slate-900/30 rounded-2xl p-4">
        <p className="text-[10px] text-[#8A8070] uppercase tracking-wider mb-2">ดาวประจำวัน</p>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-display text-lg font-bold shrink-0"
            style={{ background: `${dayP?.color}20`, border: `1px solid ${dayP?.color}50`, color: dayP?.color }}>
            {result.dayPlanet}
          </div>
          <div>
            <p className="text-sm font-bold text-[#F8F6F1]">{dayP?.thai}</p>
            <p className="text-[10px] text-[#8A8070]">{result.period === "day" ? dayP?.day : dayP?.night}</p>
          </div>
        </div>
      </div>
      <div className="border border-white/8 bg-slate-900/30 rounded-2xl p-4">
        <p className="text-[10px] text-[#8A8070] uppercase tracking-wider mb-2">ดาวเจ้ายาม</p>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-display text-lg font-bold shrink-0"
            style={{ background: `${yamP?.color}20`, border: `1px solid ${yamP?.color}50`, color: yamP?.color }}>
            {result.yamPlanet}
          </div>
          <div>
            <p className="text-sm font-bold text-[#F8F6F1]">{yamP?.thai}</p>
            <p className="text-[10px] text-[#8A8070]">เกษตร: {ZODIAC_ORDER[result.kasternZodiacIndex]?.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanetTable({ result }: { result: HoraTaynooResult }) {
  return (
    <Card className="border-[#C9A96E]/15 bg-slate-900/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-[#C9A96E] rounded-full" />
        <p className="text-[#C9A96E] text-[11px] uppercase tracking-widest font-bold">ดาวลอย 11 ดวง</p>
        <span className="ml-auto text-[10px] text-[#8A8070]">ลัคนา: {ZODIAC_ORDER[result.lagnaZodiacIndex]?.name}</span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {result.planetEntries.map((entry, i) => {
          const pInfo = entry.planetNum ? PLANET_INFO[entry.planetNum] : null;
          const color = pInfo?.color ?? (entry.isLagna ? "#4B6FAE" : "#5A5148");
          const zodiac = ZODIAC_ORDER[entry.zodiacIndex];
          const bhava  = result.bhavaMap[entry.zodiacIndex] ?? "";
          return (
            <div key={i} className={`rounded-xl p-2 text-center border transition-all ${
              entry.isLagna
                ? "border-[#4B6FAE]/40 bg-[#4B6FAE]/10"
                : "border-white/5 bg-slate-950/20 hover:border-[#C9A96E]/20"
            }`}>
              <div className="font-display text-xl font-bold mb-0.5" style={{ color }}>
                {entry.labelThai}
              </div>
              <div className="text-[10px] text-[#8A8070] leading-tight">{zodiac?.name}</div>
              {bhava && (
                <div className="text-[9px] mt-0.5 font-medium" style={{ color: `${color}cc` }}>{bhava}</div>
              )}
              <div className="text-[9px] text-[#4A5568] mt-0.5">{entry.steps}ก้าว</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function BhavaTable({ result }: { result: HoraTaynooResult }) {
  const goodBhava = new Set(["ตนุ","กฎุมภะ","ปุตตะ","ปัตนิ","ศุภะ","กัมมะ","ลาภะ"]);
  const badBhava  = new Set(["อริ","มรณะ","วินาศ"]);

  const bhavaOrder = BHAVA_NAMES.map(name => {
    const zIdx = Object.entries(result.bhavaMap).find(([,v]) => v === name)?.[0];
    const zodiacName = zIdx != null ? (ZODIAC_ORDER[Number(zIdx)]?.name ?? "—") : "—";
    const planets = zIdx != null ? result.planetEntries.filter(e => e.zodiacIndex === Number(zIdx)) : [];
    return { bhava: name, zodiacName, planets };
  });

  return (
    <Card className="border-[#C9A96E]/15 bg-slate-900/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-[#4B6FAE] rounded-full" />
        <p className="text-[#C9A96E] text-[11px] uppercase tracking-widest font-bold">ภพ 12 หลัง</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {bhavaOrder.map((b, i) => {
          const isGood = goodBhava.has(b.bhava);
          const isBad  = badBhava.has(b.bhava);
          return (
            <div key={i} className={`rounded-xl p-2.5 border ${
              isBad  ? "border-rose-500/20 bg-rose-950/10" :
              isGood && b.planets.length > 0 ? "border-emerald-500/20 bg-emerald-950/10" :
              "border-white/5 bg-slate-950/20"
            }`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  isBad ? "text-rose-400" : isGood ? "text-emerald-400" : "text-[#8A8070]"
                }`}>{i + 1}. {b.bhava}</span>
                {b.planets.length > 0 && (
                  <span className="text-[9px] text-[#C9A96E] font-bold">
                    {b.planets.map(p => p.labelThai).join(",")}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#F8F6F1] font-medium">{b.zodiacName}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SubTimePanel({ result, isLive }: { result: HoraTaynooResult; isLive: boolean }) {
  const now    = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  return (
    <Card className="border-[#C9A96E]/15 bg-slate-900/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 bg-[#C9A96E] rounded-full ${isLive ? "animate-pulse" : ""}`} />
        <p className="text-[#C9A96E] text-[11px] uppercase tracking-widest font-bold">ยามย่อย (7.5 นาที × 12)</p>
      </div>
      <div className="space-y-1.5">
        {result.subTimeSlots.map((slot, i) => {
          const isCurrent = isLive && nowMin >= slot.startMin && nowMin < slot.endMin;
          return (
            <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
              isCurrent
                ? "bg-[#C9A96E]/15 border border-[#C9A96E]/30"
                : "border border-transparent hover:border-white/5 hover:bg-white/2"
            }`}>
              {isCurrent
                ? <span className="w-1.5 h-1.5 rounded-full bg-[#C9A96E] animate-pulse shrink-0" />
                : <span className="w-1.5 h-1.5 shrink-0" />
              }
              <span className="w-14 font-mono text-[11px] text-[#8A8070]">{slot.startStr}</span>
              <span className="flex-1 font-medium text-[#F8F6F1]">{slot.zodiacName}</span>
              <span className={`text-[10px] font-bold ${
                ["ตนุ","ลาภะ","กัมมะ","ศุภะ"].includes(slot.bhavaName) ? "text-emerald-400" :
                ["อริ","มรณะ","วินาศ"].includes(slot.bhavaName)         ? "text-rose-400"    :
                "text-[#8A8070]"
              }`}>{slot.bhavaName}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Status Legend ────────────────────────────────────────────────────────────

function PlanetStatusLegend() {
  const statuses = [
    { glyph: '✿', char: 'มหาอุจจ์', color: '#22C55E', desc: 'กำลังสูงสุด' },
    { glyph: '△', char: 'เกษตร',   color: '#EF4444', desc: 'ความมั่นคง' },
    { glyph: '⬡', char: 'ราชาโชค', color: '#3B82F6', desc: 'โชคลาภนิยม' },
    { glyph: '□', char: 'มหาจักร',  color: '#EAB308', desc: 'ความรุ่งโรจน์' },
    { glyph: '○', char: 'ประ',    color: '#EF4444', desc: 'อ่อนกำลัง' },
    { glyph: '✳', char: 'นิจ',     color: '#EF4444', desc: 'ตกต่ำ' },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-4 border-t border-[#C9A96E]/10 mt-2">
      {statuses.map(s => (
        <div key={s.char} className="flex items-center gap-1.5">
          <span className="text-lg font-bold" style={{ color: s.color }}>{s.glyph}</span>
          <span className="text-[10px] text-[#F8F6F1] font-bold whitespace-nowrap">{s.char}</span>
          <span className="text-[9px] text-[#8A8070] hidden sm:inline">({s.desc})</span>
        </div>
      ))}
    </div>
  );
}

// ─── Success Yam Browser ──────────────────────────────────────────────────────

// ─── Grade helpers ────────────────────────────────────────────────────────────

const GRADE_COLOR: Record<string, string> = {
  A: "text-emerald-400 border-emerald-500/40 bg-emerald-950/30",
  B: "text-blue-400   border-blue-500/40   bg-blue-950/30",
  C: "text-amber-400  border-amber-500/40  bg-amber-950/30",
  D: "text-orange-400 border-orange-500/40 bg-orange-950/30",
  F: "text-rose-400   border-rose-500/40   bg-rose-950/30",
};

const GRADE_DOT: Record<string, string> = {
  A: "bg-emerald-400", B: "bg-blue-400", C: "bg-amber-400",
  D: "bg-orange-400",  F: "bg-rose-400",
};

// ─── Library Grid (112 ผัง จาก Supabase) ─────────────────────────────────────

function LibraryGrid({ library }: { library: YamLibraryRow[] }) {
  const [filterDay,    setFilterDay]    = useState<number | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<"day" | "night" | null>(null);
  const [filterGrade,  setFilterGrade]  = useState<string | null>(null);
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [formVals, setFormVals] = useState({ weekday: 0, period: "day" as "day"|"night", yamNo: 1 });

  const filtered = library.filter(row => {
    if (filterDay    !== null && row.weekday_num !== filterDay)    return false;
    if (filterPeriod !== null && row.period      !== filterPeriod) return false;
    if (filterGrade  !== null && row.grade       !== filterGrade)  return false;
    return true;
  });

  const handleSelect = (row: YamLibraryRow) => {
    setSelectedId(row.id);
    setFormVals({ weekday: row.weekday_num, period: row.period, yamNo: row.yam_no });
    setTimeout(() => formRef.current?.requestSubmit(), 50);
  };

  // Grade distribution
  const gradeCounts = library.reduce((acc, r) => {
    acc[r.grade] = (acc[r.grade] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Hidden submit form */}
      <Form method="post" ref={formRef}>
        <input type="hidden" name="mode"    value="success-yam" />
        <input type="hidden" name="weekday" value={formVals.weekday} />
        <input type="hidden" name="period"  value={formVals.period} />
        <input type="hidden" name="yamNo"   value={formVals.yamNo} />
      </Form>

      <Card className="border-[#C9A96E]/15 bg-slate-900/40 p-4">
        {/* Header + stats */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#C9A96E] rounded-full" />
            <p className="text-[#C9A96E] text-[11px] uppercase tracking-widest font-bold">
              ดวงยามสำเร็จ {filtered.length}/{library.length} ผัง
            </p>
          </div>
          {/* Grade legend */}
          <div className="flex gap-2 flex-wrap">
            {(["A","B","C","D","F"] as const).map(g => (
              <button key={g} type="button"
                onClick={() => setFilterGrade(filterGrade === g ? null : g)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                  filterGrade === g
                    ? GRADE_COLOR[g]
                    : "border-white/10 text-[#8A8070] hover:border-white/20"
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${GRADE_DOT[g]}`} />
                {g} ({gradeCounts[g] ?? 0})
              </button>
            ))}
          </div>
        </div>

        {/* Day filter */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button type="button"
            onClick={() => setFilterDay(null)}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
              filterDay === null
                ? "border-[#C9A96E]/50 bg-[#C9A96E]/10 text-[#C9A96E]"
                : "border-white/10 text-[#8A8070] hover:border-white/20"
            }`}>ทั้งหมด</button>
          {DAY_NAMES_TH.map((name, i) => (
            <button key={i} type="button"
              onClick={() => setFilterDay(filterDay === i ? null : i)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                filterDay === i
                  ? "border-[#C9A96E]/50 text-[#C9A96E]"
                  : "border-white/10 text-[#8A8070] hover:border-white/20 hover:text-[#F8F6F1]"
              }`}
              style={filterDay === i ? { background: `${DAY_COLORS[i]}20` } : {}}>
              {name}
            </button>
          ))}
        </div>

        {/* Period filter */}
        <div className="flex gap-2 mb-4">
          {([null, "day", "night"] as const).map(p => (
            <button key={String(p)} type="button"
              onClick={() => setFilterPeriod(p)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                filterPeriod === p
                  ? "bg-[#4B6FAE]/15 border-[#4B6FAE]/40 text-[#4B6FAE]"
                  : "border-white/8 text-[#8A8070] hover:border-white/15"
              }`}>
              {p === null ? "ทั้งวัน" : p === "day" ? "☀ กลางวัน" : "☽ กลางคืน"}
            </button>
          ))}
        </div>

        {/* Grid */}
        {library.length === 0 ? (
          <div className="text-center py-10 text-[#8A8070] text-sm">
            ไม่พบข้อมูล — กรุณา Seed ที่ /admin/seed-yam ก่อน
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
            {filtered.map(row => {
              const isSelected = selectedId === row.id;
              const gc = GRADE_COLOR[row.grade] ?? "";
              return (
                <button key={row.id} type="button"
                  onClick={() => handleSelect(row)}
                  className={`rounded-xl p-2.5 border text-left transition-all hover:scale-[1.02] active:scale-95 ${
                    isSelected
                      ? `${gc} shadow-lg`
                      : "border-white/8 bg-slate-950/30 hover:border-[#C9A96E]/25"
                  }`}>
                  {/* Grade badge */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-display font-bold ${
                      isSelected ? "" : (GRADE_COLOR[row.grade]?.split(" ")[0] ?? "text-[#8A8070]")
                    }`}>{row.grade}</span>
                    <span className="text-[9px] text-[#5A5148] font-mono">
                      {row.period === "day" ? "☀" : "☽"}{row.yam_no}
                    </span>
                  </div>
                  {/* Day name */}
                  <p className="text-[10px] font-bold text-[#F8F6F1] leading-tight truncate">
                    {row.weekday_name_th}
                  </p>
                  {/* Time */}
                  <p className="text-[9px] text-[#8A8070] font-mono mt-0.5 leading-tight">
                    {row.start_time}
                  </p>
                  {/* Lagna */}
                  {row.lagna_zodiac_name && (
                    <p className="text-[9px] text-[#C9A96E] mt-0.5 truncate leading-tight">
                      {row.lagna_zodiac_name}
                    </p>
                  )}
                  {/* Score bar */}
                  <div className="mt-2 h-0.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${GRADE_DOT[row.grade] ?? "bg-white/20"}`}
                      style={{ width: `${row.overall_score ?? 0}%` }}
                    />
                  </div>
                  <p className="text-[8px] text-[#5A5148] mt-0.5 text-right">{row.overall_score}</p>
                </button>
              );
            })}
          </div>
        )}

        {filtered.length === 0 && library.length > 0 && (
          <p className="text-center text-[#8A8070] text-sm py-8">ไม่มีผังที่ตรงกับ filter</p>
        )}
      </Card>
    </div>
  );
}

function CustomTimeForm() {
  const now = new Date();
  return (
    <Card className="border-[#C9A96E]/15 bg-slate-900/40 p-5">
      <p className="text-[#C9A96E] text-[11px] uppercase tracking-widest font-bold mb-4">ตั้งเวลาเอง</p>
      <Form method="post" className="grid grid-cols-2 sm:flex sm:flex-wrap items-end gap-3">
        <input type="hidden" name="mode" value="custom" />
        {[
          { name: "day",   label: "วัน",     placeholder: String(now.getDate()),           w: "w-full sm:w-16" },
          { name: "month", label: "เดือน",    placeholder: String(now.getMonth() + 1),     w: "w-full sm:w-16" },
          { name: "year",  label: "ปี พ.ศ.", placeholder: String(now.getFullYear() + 543),  w: "w-full sm:w-24" },
        ].map(f => (
          <div key={f.name}>
            <label className="text-[10px] text-[#8A8070] uppercase tracking-wider mb-1 block">{f.label}</label>
            <input name={f.name} type="number" placeholder={f.placeholder}
              className={`${f.w} bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F8F6F1] focus:outline-none focus:border-[#C9A96E]/40`} />
          </div>
        ))}
        <div>
          <label className="text-[10px] text-[#8A8070] uppercase tracking-wider mb-1 block">เวลา</label>
          <input name="time" type="time"
            defaultValue={`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`}
            className="w-full sm:w-32 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F8F6F1] focus:outline-none focus:border-[#C9A96E]/40" />
        </div>
        <Button type="submit" className="self-end">คำนวณ</Button>
      </Form>
    </Card>
  );
}

function LiveClock({ serverTime }: { serverTime: string }) {
  const [t, setT] = useState(new Date(serverTime));
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const fmt = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="font-mono text-[#C9A96E] text-sm font-bold tabular-nums">
      {fmt(t.getHours())}:{fmt(t.getMinutes())}:{fmt(t.getSeconds())}
    </span>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  "การเงินช่วงนี้เป็นอย่างไร?",
  "งานที่ทำอยู่จะสำเร็จไหม?",
  "ความรักจะพัฒนาไปได้ไหม?",
  "ปัญหาที่มีจะคลี่คลายไหม?",
  "โชคลาภช่วงนี้เป็นอย่างไร?",
];

function HoranuChatPanel() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lockedTime, setLockedTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  const handleAsk = async () => {
    if (!question.trim() || isLoading) return;

    const now = new Date().toISOString();
    setLockedTime(now);
    setAnswer("");
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/horanu-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), isoTime: now }),
      });

      if (!res.ok || !res.body) {
        setError("เกิดข้อผิดพลาดจาก AI service กรุณาลองใหม่อีกครั้ง");
        setIsLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const parsed = JSON.parse(raw) as { text?: string };
            if (parsed.text) setAnswer(prev => prev + parsed.text);
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to answer as it streams
  useEffect(() => {
    if (answer && answerRef.current) {
      answerRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [answer]);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <Card className="border-[#C9A96E]/20 bg-[#020617]/60 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full ${isLoading ? "bg-[#C9A96E] animate-pulse" : "bg-[#C9A96E]"}`} />
        <p className="text-[#C9A96E] text-[11px] uppercase tracking-widest font-bold">ถามโหรพรายกระซิบ</p>
        <span className="ml-1 text-[10px] text-[#5A5148]">— ตีความตามดวงยาม ณ เวลาที่กดถาม</span>
        {lockedTime && (
          <span className="ml-auto text-[9px] text-[#8A8070] font-mono shrink-0">
            ล็อกเวลา {fmtTime(lockedTime)} น.
          </span>
        )}
      </div>

      {/* Suggested questions */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {SUGGESTED_QUESTIONS.map(q => (
          <button
            key={q}
            type="button"
            onClick={() => setQuestion(q)}
            disabled={isLoading}
            className="text-[10px] px-2.5 py-1 rounded-full border border-white/10 text-[#8A8070] hover:border-[#C9A96E]/30 hover:text-[#C9A96E] disabled:opacity-40 transition-all"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAsk()}
          placeholder="พิมพ์คำถามของคุณ... (กด Enter หรือปุ่ม ถามยาม)"
          disabled={isLoading}
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#F8F6F1] placeholder:text-[#5A5148] focus:outline-none focus:border-[#C9A96E]/40 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleAsk}
          disabled={isLoading || !question.trim()}
          className="px-5 py-2.5 rounded-xl font-bold text-sm border border-[#C9A96E]/40 bg-[#C9A96E]/10 text-[#C9A96E] hover:bg-[#C9A96E]/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
        >
          {isLoading ? "กำลังอ่าน..." : "ถามยาม"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-3 text-xs text-rose-400 px-1">{error}</p>
      )}

      {/* Streaming answer */}
      {(answer || (isLoading && !error)) && (
        <div
          ref={answerRef}
          className="mt-4 p-4 rounded-xl bg-[#020617]/80 border border-[#C9A96E]/10 text-sm text-[#F8F6F1] leading-relaxed whitespace-pre-wrap"
        >
          {isLoading && !answer ? (
            <span className="inline-flex items-center gap-2 text-[#8A8070]">
              <span className="w-1.5 h-1.5 bg-[#C9A96E] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-[#C9A96E] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-[#C9A96E] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              <span className="text-xs">กำลังอ่านดวง...</span>
            </span>
          ) : (
            <>
              {answer}
              {isLoading && (
                <span className="inline-block w-0.5 h-4 bg-[#C9A96E] animate-pulse ml-0.5 align-middle" />
              )}
            </>
          )}
        </div>
      )}

      {/* Hint */}
      <p className="text-[9px] text-[#4A5568] mt-3 text-center">
        เวลาที่กดปุ่มถามคือเวลาที่ใช้คำนวณผังดวง — ผลลัพธ์จะเปลี่ยนทุก 7.5 นาที
      </p>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HoraNuPage() {
  const loaderData   = useLoaderData<typeof loader>();
  const actionData   = useActionData<typeof action>();
  const navigation   = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const activeMode  = (actionData as any)?.mode ?? "live";
  const result: HoraTaynooResult = (actionData as any)?.result ?? loaderData.result;
  const interpretation: ChartInterpretation = (actionData as any)?.interpretation ?? (loaderData as any).interpretation;
  const initialSvg  = (actionData as any)?.svg    ?? loaderData.svg;
  const isLive      = activeMode !== "success-yam";

  const library = (loaderData as any).library as YamLibraryRow[] ?? [];

  const [tab,       setTab]       = useState<"live"|"library">("live");
  const [showCustom,setShowCustom] = useState(false);

  // Chart Options State
  const [options, setOptions] = useState<ChartConfig>({
    showKasternFixed: true,
    showFloatingPlanets: true,
    showPlanetStatus: true,
    showTimeRing: true,
    showLagnaRulerMarker: true,
  });

  const [svgStr, setSvgStr] = useState(initialSvg);

  // Re-generate SVG when options or result change
  useEffect(() => {
    const newSvg = generateHoraTaynooSVG(result, { ...options, size: 520, theme: "dark" });
    setSvgStr(newSvg);
  }, [result, options]);

  // switch to library tab when success-yam result arrives
  useEffect(() => {
    if (activeMode === "success-yam") setTab("library");
  }, [activeMode]);

  return (
    <div className="space-y-5 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-[#C9A96E] rounded-full animate-pulse" />
            <p className="text-[#C9A96E] text-[11px] tracking-[0.3em] uppercase font-bold">Hora Taynoo System</p>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-[#F8F6F1] font-bold">ยามพรายกระซิบ</h1>
          <p className="text-[#8A8070] text-sm mt-1">ผังดวงยามพรายกระซิบ — ยามอัฐกาล + ดาวลอย 11 + ภพ 12</p>
        </div>
        {isLive && (
          <div className="flex items-center sm:flex-col sm:items-end gap-2 shrink-0">
            <LiveClock serverTime={loaderData.serverTime} />
            <div className="flex gap-2">
              <button onClick={() => setShowCustom(v => !v)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                  showCustom
                    ? "bg-[#C9A96E]/10 border-[#C9A96E]/40 text-[#C9A96E]"
                    : "border-white/10 text-[#8A8070] hover:border-[#C9A96E]/30 hover:text-[#C9A96E]"
                }`}>{showCustom ? "✕ ปิด" : "⚙ ตั้งเวลา"}</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-2xl">
        {(["live", "library"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === t
                ? "bg-[#C9A96E]/15 text-[#C9A96E]"
                : "text-[#8A8070] hover:text-[#F8F6F1]"
            }`}>
            {t === "live" ? "⚡ คำนวณสด" : <><span className="hidden sm:inline">📚 ดวงยามสำเร็จ (112 ผัง)</span><span className="sm:hidden">📚 ดวงยามสำเร็จ</span></>}
          </button>
        ))}
      </div>

      {/* ── Live mode controls ── */}
      {tab === "live" && showCustom && <CustomTimeForm />}

      {/* ── Library mode browser ── */}
      {tab === "library" && <LibraryGrid library={library} />}

      {/* ── Main chart grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Left: Chart */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-4">
          <Card className="p-4 sm:p-6 border-[#C9A96E]/20 bg-[#020617]/70">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-bold text-[#C9A96E] uppercase tracking-widest">ผังดวงยามพรายกระซิบ</p>
                  {!isLive && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full border border-[#4B6FAE]/40 bg-[#4B6FAE]/10 text-[#4B6FAE] font-bold">
                      ยามสำเร็จ
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#8A8070] mt-0.5">
                  ยาม {result.yamAsked} · {result.period === "day" ? "กลางวัน" : "กลางคืน"} · ลัคนา {ZODIAC_ORDER[result.lagnaZodiacIndex]?.name}
                </p>
              </div>
              <div className="text-right text-[10px] text-[#8A8070]">
                <p>เกษตร: <span className="text-[#C9A96E] font-bold">{ZODIAC_ORDER[result.kasternZodiacIndex]?.name}</span></p>
                <p>ดาวยาม: <span className="text-[#C9A96E] font-bold">{PLANET_INFO[result.yamPlanet]?.thai}</span></p>
              </div>
            </div>
            
            <div className="w-full max-w-[480px] mx-auto"
              dangerouslySetInnerHTML={{ __html: svgStr }} />

            {/* Display Toggles */}
            <div className="mt-6 pt-6 border-t border-[#C9A96E]/10 flex flex-wrap gap-x-4 gap-y-2 justify-center">
              {[
                { key: 'showKasternFixed', label: 'ดาวเกษตรคงที่' },
                { key: 'showFloatingPlanets', label: 'ดาวลอย' },
                { key: 'showPlanetStatus', label: 'มาตรฐานดาว' },
                { key: 'showTimeRing', label: 'เวลารอบผัง' },
                { key: 'showLagnaRulerMarker', label: 'จุดลงเวลา' },
              ].map(opt => (
                <label key={opt.key} className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={(options as any)[opt.key]}
                    onChange={(e) => setOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                    className="w-3.5 h-3.5 rounded border-[#C9A96E]/30 bg-slate-900 text-[#C9A96E] focus:ring-[#C9A96E]/50"
                  />
                  <span className="text-[11px] text-[#8A8070] group-hover:text-[#C9A96E] transition-colors">{opt.label}</span>
                </label>
              ))}
            </div>

            {/* Planet Status Legend */}
            <PlanetStatusLegend />
          </Card>

          <Card className="border-[#C9A96E]/15 bg-slate-900/40 p-4">
            <YamBadge result={result} />
            <div className="mt-3"><PlanetSummary result={result} /></div>
          </Card>
        </div>

        {/* Right: Tables & Interpretation */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-4">
          {interpretation && <ChartInterpretationPanel interpretation={interpretation} />}
          <PlanetTable result={result} />
          <SubTimePanel result={result} isLive={isLive} />
          <BhavaTable result={result} />
        </div>
      </div>

      {/* ── Horanu Chat ── */}
      <HoranuChatPanel />

      {/* Loading overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#020617] border border-[#C9A96E]/30 rounded-2xl p-8 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-[#C9A96E]/30 border-t-[#C9A96E] rounded-full animate-spin" />
            <p className="text-[#C9A96E] text-sm font-bold">กำลังโหลดดวงยาม...</p>
          </div>
        </div>
      )}
    </div>
  );
}
