/**
 * dashboard.horanu.tsx — ยามพรายกระซิบ
 * ผังดวงโหรทายหนู V2 — ระบบยามอัฐกาล + ดาวลอย 11 ดวง + ภพ 12 หลัง
 */
import { json } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, useLoaderData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireMinPlan, requireAuth } from "~/services/auth.server";
import {
  calculateHoraTaynoo,
  generateHoraTaynooSVG,
  PLANET_INFO,
  ZODIAC_ORDER,
  BHAVA_NAMES,
} from "@phopephum/engine";
import type { HoraTaynooResult } from "@phopephum/engine";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import type { Env } from "~/env.server";
import { useState, useEffect, useCallback } from "react";

export const meta: MetaFunction = () => [
  { title: "ยามพรายกระซิบ — PhopePhum" },
  { name: "description", content: "ผังดวงโหรทายหนู ระบบยามอัฐกาลและดาวลอยโบราณ 11 ดวง ภพ 12 หลัง" },
];

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireMinPlan("basic", request, env);

  const now = new Date();
  try {
    const result = calculateHoraTaynoo({ dateAsked: now });
    const svg = generateHoraTaynooSVG(result, { size: 520, theme: "dark" });
    return json({ result, svg, serverTime: now.toISOString(), error: null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
    return json({ result: null, svg: null, serverTime: now.toISOString(), error: msg }, { status: 200 });
  }
}

// ─── Action ───────────────────────────────────────────────────────────────────

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAuth(request, env);

  const formData = await request.formData();
  const mode = formData.get("mode") as string;

  let targetDate = new Date();

  if (mode === "custom") {
    const day   = Number(formData.get("day")   ?? 0);
    const month = Number(formData.get("month") ?? 0);
    const year  = Number(formData.get("year")  ?? 0);
    const time  = String(formData.get("time")  ?? "12:00");
    const [h, m] = time.split(":").map(Number);
    if (day && month && year) {
      targetDate = new Date(year - 543, month - 1, day, h, m, 0);
    }
  }

  const result = calculateHoraTaynoo({ dateAsked: targetDate });
  const svg = generateHoraTaynooSVG(result, { size: 520, theme: "dark" });

  return json({ result, svg });
}

// ─── Planet display helpers ───────────────────────────────────────────────────

const DAY_NAMES_TH = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์","เสาร์"];

function planetColor(num: number | null): string {
  if (!num) return "#8A8070";
  return PLANET_INFO[num]?.color ?? "#C9A96E";
}

function planetThai(num: number | null): string {
  if (!num) return "—";
  return PLANET_INFO[num]?.thai ?? `ดาว${num}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
  const dayP  = PLANET_INFO[result.dayPlanet];
  const yamP  = PLANET_INFO[result.yamPlanet];

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
  const lagna = result.planetEntries[8]; // ล
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
          const bhava = result.bhavaMap[entry.zodiacIndex] ?? "";
          return (
            <div
              key={i}
              className={`rounded-xl p-2 text-center border transition-all ${
                entry.isLagna
                  ? "border-[#4B6FAE]/40 bg-[#4B6FAE]/10"
                  : "border-white/5 bg-slate-950/20 hover:border-[#C9A96E]/20"
              }`}
            >
              <div className="font-display text-xl font-bold mb-0.5" style={{ color }}>
                {entry.label}
              </div>
              <div className="text-[10px] text-[#8A8070] leading-tight">{zodiac?.name}</div>
              {bhava && (
                <div className="text-[9px] mt-0.5 font-medium" style={{ color: `${color}cc` }}>
                  {bhava}
                </div>
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
  const entries = Object.entries(result.bhavaMap).map(([zodiacIdx, bhava]) => ({
    zodiacIndex: Number(zodiacIdx),
    bhava,
    zodiacName: ZODIAC_ORDER[Number(zodiacIdx)]?.name ?? "",
    planets: result.planetEntries.filter(e => e.zodiacIndex === Number(zodiacIdx)),
  }));

  const bhavaOrder = BHAVA_NAMES.map((name, i) =>
    entries.find(e => e.bhava === name) ?? { bhava: name, zodiacName: "—", planets: [], zodiacIndex: -1 }
  );

  const goodBhava = new Set(["ตนุ","กฎุมภะ","ปุตตะ","ปัตนิ","ศุภะ","กัมมะ","ลาภะ"]);
  const badBhava  = new Set(["อริ","มรณะ","วินาศ"]);

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
          const hasPlanets = b.planets.length > 0;
          return (
            <div key={i}
              className={`rounded-xl p-2.5 border ${
                isBad  ? "border-rose-500/20 bg-rose-950/10" :
                isGood && hasPlanets ? "border-emerald-500/20 bg-emerald-950/10" :
                "border-white/5 bg-slate-950/20"
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  isBad ? "text-rose-400" : isGood ? "text-emerald-400" : "text-[#8A8070]"
                }`}>{i + 1}. {b.bhava}</span>
                {hasPlanets && (
                  <span className="text-[9px] text-[#C9A96E] font-bold">
                    {b.planets.map(p => p.label).join(",")}
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

function SubTimePanel({ result }: { result: HoraTaynooResult }) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  return (
    <Card className="border-[#C9A96E]/15 bg-slate-900/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-[#C9A96E] rounded-full animate-pulse" />
        <p className="text-[#C9A96E] text-[11px] uppercase tracking-widest font-bold">ยามย่อย (7.5 นาที × 12)</p>
      </div>
      <div className="space-y-1.5">
        {result.subTimeSlots.map((slot, i) => {
          const isCurrent = nowMin >= slot.startMin && nowMin < slot.endMin;
          return (
            <div key={i}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                isCurrent
                  ? "bg-[#C9A96E]/15 border border-[#C9A96E]/30"
                  : "border border-transparent hover:border-white/5 hover:bg-white/2"
              }`}
            >
              {isCurrent && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#C9A96E] animate-pulse shrink-0" />
              )}
              {!isCurrent && <span className="w-1.5 h-1.5 shrink-0" />}
              <span className="w-14 font-mono text-[11px] text-[#8A8070]">{slot.startStr}</span>
              <span className="flex-1 font-medium text-[#F8F6F1]">{slot.zodiacName}</span>
              <span className={`text-[10px] font-bold ${
                ["ตนุ","ลาภะ","กัมมะ","ศุภะ"].includes(slot.bhavaName)
                  ? "text-emerald-400"
                  : ["อริ","มรณะ","วินาศ"].includes(slot.bhavaName)
                  ? "text-rose-400"
                  : "text-[#8A8070]"
              }`}>{slot.bhavaName}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CustomTimeForm() {
  const now = new Date();
  return (
    <Card className="border-[#C9A96E]/15 bg-slate-900/40 p-5">
      <p className="text-[#C9A96E] text-[11px] uppercase tracking-widest font-bold mb-4">ตั้งเวลาเอง</p>
      <Form method="post" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="mode" value="custom" />
        {[
          { name: "day",   label: "วัน",  placeholder: now.getDate(),       w: "w-16" },
          { name: "month", label: "เดือน", placeholder: now.getMonth() + 1,  w: "w-16" },
          { name: "year",  label: "ปี พ.ศ.", placeholder: now.getFullYear() + 543, w: "w-24" },
        ].map(f => (
          <div key={f.name}>
            <label className="text-[10px] text-[#8A8070] uppercase tracking-wider mb-1 block">{f.label}</label>
            <input name={f.name} type="number" placeholder={String(f.placeholder)}
              className={`${f.w} bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F8F6F1] focus:outline-none focus:border-[#C9A96E]/40`} />
          </div>
        ))}
        <div>
          <label className="text-[10px] text-[#8A8070] uppercase tracking-wider mb-1 block">เวลา</label>
          <input name="time" type="time"
            defaultValue={`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`}
            className="w-32 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F8F6F1] focus:outline-none focus:border-[#C9A96E]/40" />
        </div>
        <Button type="submit" className="self-end">คำนวณ</Button>
      </Form>
    </Card>
  );
}

// ─── Live Clock ───────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HoraNuPage() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  const result  = (actionData as any)?.result ?? loaderData.result;
  const svgStr  = (actionData as any)?.svg    ?? loaderData.svg;
  const errMsg  = (loaderData as any)?.error;

  if (errMsg || !result) {
    return (
      <div className="p-6">
        <h1 className="text-red-400 font-bold mb-2">Engine Error</h1>
        <pre className="text-xs text-red-300 bg-red-950/30 border border-red-500/20 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">{errMsg ?? "result is null"}</pre>
      </div>
    );
  }

  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="space-y-5 pb-10">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-[#C9A96E] rounded-full animate-pulse" />
            <p className="text-[#C9A96E] text-[11px] tracking-[0.3em] uppercase font-bold">Hora Taynoo System</p>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-[#F8F6F1] font-bold">ยามพรายกระซิบ</h1>
          <p className="text-[#8A8070] text-sm mt-1">ผังดวงโหรทายหนู — ยามอัฐกาล + ดาวลอย 11 + ภพ 12</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <LiveClock serverTime={loaderData.serverTime} />
          <button
            onClick={() => setShowCustom(v => !v)}
            className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all ${
              showCustom
                ? "bg-[#C9A96E]/10 border-[#C9A96E]/40 text-[#C9A96E]"
                : "border-white/10 text-[#8A8070] hover:border-[#C9A96E]/30 hover:text-[#C9A96E]"
            }`}
          >
            {showCustom ? "✕ ปิด" : "⚙ ตั้งเวลา"}
          </button>
        </div>
      </div>

      {/* Custom time form */}
      {showCustom && <CustomTimeForm />}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── Left: Chart + Legend ── */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-4">
          {/* SVG Chart */}
          <Card className="p-4 sm:p-6 border-[#C9A96E]/20 bg-[#020617]/70">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-bold text-[#C9A96E] uppercase tracking-widest">ผังดวงโหรทายหนู</p>
                <p className="text-[10px] text-[#8A8070] mt-0.5">12 ราศี · ยาม {result.yamAsked} · ลัคนา {ZODIAC_ORDER[result.lagnaZodiacIndex]?.name}</p>
              </div>
              <div className="text-right text-[10px] text-[#8A8070]">
                <p>เกษตร: <span className="text-[#C9A96E] font-bold">{ZODIAC_ORDER[result.kasternZodiacIndex]?.name}</span></p>
                <p>ดาวยาม: <span className="text-[#C9A96E] font-bold">{PLANET_INFO[result.yamPlanet]?.thai}</span></p>
              </div>
            </div>
            {/* SVG */}
            <div
              className="w-full max-w-[480px] mx-auto"
              dangerouslySetInnerHTML={{ __html: svgStr }}
            />
          </Card>

          {/* Yam badges */}
          <Card className="border-[#C9A96E]/15 bg-slate-900/40 p-4">
            <YamBadge result={result} />
            <div className="mt-3">
              <PlanetSummary result={result} />
            </div>
          </Card>
        </div>

        {/* ── Right: Tables ── */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-4">
          <PlanetTable result={result} />
          <SubTimePanel result={result} />
          <BhavaTable result={result} />
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#020617] border border-[#C9A96E]/30 rounded-2xl p-8 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-[#C9A96E]/30 border-t-[#C9A96E] rounded-full animate-spin" />
            <p className="text-[#C9A96E] text-sm font-bold">กำลังคำนวณยาม...</p>
          </div>
        </div>
      )}
    </div>
  );
}
