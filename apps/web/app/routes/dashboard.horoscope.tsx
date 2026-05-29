import { json } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, useLoaderData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { logEvent, EVENTS } from "~/services/analytics.server";
import {
  horoscopeEngine,
  calculateNineBase,
  calculateTaksa,
  buildEmperorChart,
  MatrixBuilder,
  getYamPrediction,
  DAY_NAMES_THAI,
} from "@phopephum/engine";
import { HoroscopeInputSchema } from "@phopephum/validators";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";
import type { HoroscopeResult, TaksaPosition } from "@phopephum/types";
import type { YamResult } from "@phopephum/engine";
import { useState, useEffect, useCallback } from "react";

export const meta: MetaFunction = () => [
  { title: "คำนวณดวงชะตา — PhopePhum" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);
  return json({ profile });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAuth(request, env);

  const formData = await request.formData();
  const raw = {
    birthDate: String(formData.get("birthDate") ?? ""),
    birthTime: String(formData.get("birthTime") ?? "") || undefined,
    birthPlace: String(formData.get("birthPlace") ?? "") || undefined,
  };

  const parsed = HoroscopeInputSchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง", result: null },
      { status: 400 }
    );
  }

  const result = await horoscopeEngine(parsed.data);

  // Emperor Chart
  const base = result.sevenNumbers.base as number[];
  const sevenBase: [number, number, number] = [base[0] ?? 1, base[1] ?? 1, base[2] ?? 1];
  const nine = calculateNineBase(sevenBase) as [number, number, number];
  const dayOfWeek = new Date(parsed.data.birthDate).getDay();
  const taksaNames = calculateTaksa(dayOfWeek);
  const emperor = buildEmperorChart(sevenBase, nine, taksaNames);

  await logEvent(request, env, EVENTS.CALC_HORA, {
    birthYear: parsed.data.birthDate.split("-")[0],
    province: parsed.data.birthPlace,
  });

  const matrix = MatrixBuilder.buildMatrix({
    dayNum: base[0] ?? 1,
    monthNum: base[1] ?? 1,
    yearNum: base[2] ?? 1,
  });

  return json({ result, emperor, matrix, birthDate: parsed.data.birthDate, error: null });
}

export default function HoroscopePage() {
  const { profile } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#F3EFE8] mb-1">
          คำนวณดวงชะตา
        </h1>
        <p className="text-[#8A8070] text-sm">
          เลข 7 ตัว 9 ฐาน · ยามอัฐกาล · จักรกำเนิด
        </p>
      </div>

      <Card>
        <Form method="post" className="flex flex-col gap-5">
          <Input
            name="birthDate"
            type="date"
            label="วันเกิด * (ค.ศ.)"
            defaultValue={profile?.birth_date ?? ""}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              name="birthTime"
              type="time"
              label="เวลาเกิด (ถ้าทราบ)"
              defaultValue={profile?.birth_time ?? ""}
            />
            <Input
              name="birthPlace"
              label="จังหวัดที่เกิด"
              defaultValue={profile?.birth_place ?? ""}
              placeholder="เช่น เชียงใหม่"
            />
          </div>

          {actionData?.error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
              {actionData.error}
            </p>
          )}

          <Button type="submit" loading={isLoading} className="w-full">
            คำนวณดวงชะตา
          </Button>
        </Form>
      </Card>

      {actionData && "result" in actionData && actionData.result && (
        <HoroscopeResult result={actionData.result as HoroscopeResult} />
      )}

      {actionData && "matrix" in actionData && actionData.matrix && actionData.result && (
        <FateMatrixPanel
          matrix={actionData.matrix as number[][]}
          taksa={(actionData.result as HoroscopeResult).taksa}
          birthDate={(actionData as { birthDate: string }).birthDate}
        />
      )}

      {actionData && "emperor" in actionData && actionData.emperor && (
        <EmperorChartPanel chart={actionData.emperor as EmperorChart} />
      )}

      {/* ─── ยามอัฐกาลอัตโนมัติ ─────────────────────────────────── */}
      <YamCalculatorSection />
    </div>
  );
}

// ─── Number color palette (1-7) ──────────────────────────────────────────────
const NUM_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "bg-amber-500/20",  text: "text-amber-300",  border: "border-amber-500/30" },
  2: { bg: "bg-sky-500/20",    text: "text-sky-300",    border: "border-sky-500/30" },
  3: { bg: "bg-rose-500/20",   text: "text-rose-300",   border: "border-rose-500/30" },
  4: { bg: "bg-emerald-500/20",text: "text-emerald-300",border: "border-emerald-500/30" },
  5: { bg: "bg-violet-500/20", text: "text-violet-300", border: "border-violet-500/30" },
  6: { bg: "bg-pink-500/20",   text: "text-pink-300",   border: "border-pink-500/30" },
  7: { bg: "bg-cyan-500/20",   text: "text-cyan-300",   border: "border-cyan-500/30" },
};

function numColor(n: number) {
  return NUM_COLORS[n] ?? { bg: "bg-[#2A2018]", text: "text-[#F3EFE8]", border: "border-[#2A2018]" };
}

function HoroscopeResult({ result }: { result: HoroscopeResult }) {
  const { sevenNumbers } = result;
  const lunar = result.lunarDateInfo;

  const numberLabels = [
    { key: "soul",    label: "อัตตา",    desc: "ตัวตนที่แท้จริง" },
    { key: "destiny", label: "ชะตาชีวิต", desc: "เส้นทางชีวิต" },
    { key: "power",   label: "พลังงาน",   desc: "จุดแข็ง" },
    { key: "mission", label: "ภารกิจ",    desc: "พันธกิจชีวิต" },
    { key: "karmic",  label: "กรรมเก่า",  desc: "บทเรียนชีวิต" },
    { key: "crown",   label: "มงกุฎ",     desc: "ศักยภาพสูงสุด" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* ── ปฏิทินจันทรคติ ── */}
      {lunar && (
        <Card>
          <p className="text-[#8A8070] text-[10px] uppercase tracking-widest mb-2">ปฏิทินจันทรคติไทย</p>
          <p className="text-[#F3EFE8] font-semibold text-sm">
            วัน{lunar.dayName} เดือน{lunar.lunarMonthName} ปี{lunar.zodiacName}
            <span className="text-[#C9A96E] ml-2">({lunar.moonPhase})</span>
          </p>
          {lunar.isApproximate && (
            <p className="text-[#8A8070] text-xs mt-1">* ประมาณ (ไม่มีข้อมูลปฏิทิน 100 ปีสำหรับปีนี้)</p>
          )}
          <div className="flex gap-3 mt-3 text-xs text-[#8A8070]">
            <span>ดาวประจำวัน: <span className="text-[#C9A96E]">{lunar.dayPlanet}</span></span>
            <span>·</span>
            <span>วันขึ้น {lunar.lunarDay} ค่ำ เดือน {lunar.lunarMonth}</span>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#2A2018]" />
        <p className="text-[#C9A96E] text-xs tracking-widest uppercase">
          สิริมงคลดวงดำเนิน — เลข 7 ตัว 9 ฐาน
        </p>
        <div className="h-px flex-1 bg-[#2A2018]" />
      </div>

      {/* 6 Named Numbers */}
      <div className="grid grid-cols-3 gap-3">
        {numberLabels.map(({ key, label, desc }) => {
          const val = sevenNumbers[key];
          const c = numColor(val);
          return (
            <Card key={key} className="text-center py-4">
              <span className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-display text-3xl font-bold mb-2 border ${c.bg} ${c.text} ${c.border}`}>
                {val}
              </span>
              <p className="text-[#F3EFE8] text-sm font-medium">{label}</p>
              <p className="text-[#8A8070] text-xs">{desc}</p>
            </Card>
          );
        })}
      </div>

      {/* Transit phase */}
      {result.transitPhase.phase && (
        <Card>
          <p className="text-[#8A8070] text-xs uppercase tracking-wide mb-3">ช่วงวัยปัจจุบัน</p>
          <p className="text-[#C9A96E] font-semibold mb-1">{result.transitPhase.phase}</p>
          <p className="text-[#8A8070] text-sm">
            อายุ {result.transitPhase.phaseStart}–{result.transitPhase.phaseEnd} ปี
          </p>
          {result.transitPhase.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {result.transitPhase.keywords.map((kw) => (
                <span key={kw} className="px-3 py-1 bg-[#C9A96E]/10 text-[#C9A96E] text-xs rounded-full">
                  {kw}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── Fate Matrix Panel ────────────────────────────────────────────────────────

const ROW_META = [
  { label: "ฐาน ๑", sub: "วันเกิด",        phopNames: ["อัตตะ","หินะ","ธนัง","ปิตา","มาตา","โภคา","มัชฌิมา"] as string[] | null },
  { label: "ฐาน ๒", sub: "เดือนเกิด",      phopNames: ["ตนุ","กฎุมภะ","สหัชชะ","พันธุ","ปุตตะ","อริ","ปัตนิ"] as string[] | null },
  { label: "ฐาน ๓", sub: "ปีเกิด",         phopNames: ["มรณะ","ศุภะ","กัมมะ","ลาภะ","พยายะ","ทาสา","ทาสี"] as string[] | null },
  { label: "ฐาน ๔", sub: "กำลังเทวดา",     phopNames: null },
  { label: "ฐาน ๕", sub: "ลดทอน",          phopNames: null },
  { label: "ฐาน ๖", sub: "×๒",             phopNames: null },
  { label: "ฐาน ๗", sub: "×๒",             phopNames: null },
  { label: "ฐาน ๘", sub: "อาตมา",          phopNames: ["อาตมะ","ทาสา","สิทธิโชค","โภคทรัพย์","โจร","อุบาทว์","อุปถัมภ์"] as string[] | null },
  { label: "ฐาน ๙", sub: "ภริยัง",         phopNames: ["อัตตะ","สักกะ","ญาติ","ธนัง","เคหัง","นาวัง","ภริยัง"] as string[] | null },
];

const MAHABHUTI_NAMES = ["ราชา","อธิบดี","ธงชัย","ขุมทรัพย์","อริ","โลกาวินาศ","มรณะ"];

function MatrixRows({ rows, matrix, large }: {
  rows: typeof ROW_META;
  matrix: number[][];
  large?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <tbody>
          {rows.map((row, rowIdx) => {
            const rowData = matrix[rowIdx] ?? [];
            return (
              <tr key={row.label} className={rowIdx > 0 ? "border-t border-[#2A2018]/60" : ""}>
                <td className="py-1.5 pr-2 whitespace-nowrap" style={{ minWidth: "4.5rem" }}>
                  <span className="text-[#F3EFE8] text-[11px] font-semibold">{row.label}</span>
                  {row.sub && <span className="text-[#8A8070] text-[9px] ml-1">{row.sub}</span>}
                </td>
                {rowData.map((num, colIdx) => {
                  const c = numColor(num);
                  const houseName = row.phopNames?.[colIdx];
                  const sz = large ? "w-8 h-8 text-sm" : "w-7 h-7 text-xs";
                  return (
                    <td key={colIdx} className="text-center py-1" style={{ minWidth: "2.8rem" }}>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`inline-flex items-center justify-center ${sz} rounded-full font-display font-bold border ${c.bg} ${c.text} ${c.border}`}>
                          {num}
                        </span>
                        {houseName && (
                          <span className="text-[#8A8070] text-[8px] leading-tight text-center">{houseName}</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-[#2A2018]" />
      <p className="text-[#C9A96E] text-[10px] tracking-widest uppercase whitespace-nowrap">{label}</p>
      <div className="h-px flex-1 bg-[#2A2018]" />
    </div>
  );
}

function FateMatrixPanel({ matrix, taksa, birthDate }: {
  matrix: number[][];
  taksa: TaksaPosition[];
  birthDate: string;
}) {
  const today = new Date().toLocaleDateString("th-TH", {
    year: "numeric", month: "long", day: "numeric",
  });
  const mahaRow = matrix[6] ?? [];

  return (
    <div className="space-y-4 mt-2">
      <SectionDivider label="พื้นดวงชะตา" />

      {/* บริบทชีวิต */}
      <Card>
        <p className="text-[#8A8070] text-[10px] uppercase tracking-widest mb-2">บริบทชีวิต</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="text-[#8A8070]">เกิด: <span className="text-[#F3EFE8] font-medium">{birthDate}</span></span>
          <span className="text-[#8A8070]">วันที่วิเคราะห์: <span className="text-[#F3EFE8] font-medium">{today}</span></span>
        </div>
      </Card>

      <SectionDivider label="ถอดรหัสโครงสร้างดวงชะตาส่วนบุคคล 9 มิติกำลัง" />

      {/* ฐาน 1-3 : 21 ภพเรือน */}
      <Card>
        <p className="text-[#8A8070] text-[10px] uppercase tracking-widest mb-3">
          ฐานที่ 1, 2, 3 · 21 ภพเรือน และดาวพระเคราะห์ประจำภพเรือน
        </p>
        <MatrixRows rows={ROW_META.slice(0, 3)} matrix={matrix.slice(0, 3)} large />
      </Card>

      {/* ฐาน 4 */}
      <Card>
        <p className="text-[#8A8070] text-[10px] uppercase tracking-widest mb-3">
          ฐานที่ 4 · เลขกำลังเทวดา (ฐานรวมดาวพระเคราะห์)
        </p>
        <MatrixRows rows={ROW_META.slice(3, 4)} matrix={matrix.slice(3, 4)} />
      </Card>

      {/* ฐาน 5-7 */}
      <Card>
        <MatrixRows rows={ROW_META.slice(4, 7)} matrix={matrix.slice(4, 7)} />
      </Card>

      {/* ฐาน 8-9 : 14 ภพเรือน */}
      <Card>
        <p className="text-[#8A8070] text-[10px] uppercase tracking-widest mb-3">
          ฐานที่ 8, 9 · 14 ภพเรือน และดาวพระเคราะห์ประจำภพเรือน
        </p>
        <MatrixRows rows={ROW_META.slice(7, 9)} matrix={matrix.slice(7, 9)} large />
      </Card>

      {/* ทักษาจร คู่ธาตุ */}
      <Card>
        <p className="text-[#8A8070] text-[10px] uppercase tracking-widest mb-3">ทักษาจร · คู่ธาตุ</p>
        <div className="grid grid-cols-4 gap-2">
          {taksa.slice(0, 8).map((t) => {
            const c = numColor(t.number);
            return (
              <div key={t.name} className={`rounded-lg p-2 text-center border ${c.bg} ${c.border}`}>
                <p className={`text-[9px] font-medium ${c.text} leading-tight`}>{t.name}จร</p>
                <p className={`font-display text-xl font-bold ${c.text} my-0.5`}>{t.number}</p>
                <p className="text-[#8A8070] text-[8px]">{t.planet}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* มหาภูติจร */}
      <Card>
        <p className="text-[#8A8070] text-[10px] uppercase tracking-widest mb-3">มหาภูติจร</p>
        <div className="grid grid-cols-7 gap-1.5">
          {MAHABHUTI_NAMES.map((name, i) => {
            const num = mahaRow[i] ?? 0;
            const c = numColor(num);
            return (
              <div key={name} className={`rounded-lg px-1 py-2 text-center border ${c.bg} ${c.border}`}>
                <p className={`text-[8px] font-medium ${c.text} leading-tight mb-1`}>{name}</p>
                <p className={`font-display text-base font-bold ${c.text}`}>{num}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─── Emperor Chart Panel ──────────────────────────────────────────────────────

type EmperorChart = {
  destiny:    { base: number; planet: string; power: string };
  wealth:     { base: number; planet: string; power: string };
  work:       { taksa: string; isAuspicious: boolean };
  totalPower: number;
  powerLevel: string;
  summary:    string;
};

const POWER_LEVEL_COLOR: Record<string, string> = {
  มหาเศรษฐี: "#F2D49B",
  เจ้าสัว:   "#D9BC82",
  ผู้นำ:     "#C6A96B",
  ปานกลาง:  "#9AB3D9",
  ต้องสร้าง: "#94A3B8",
};

function EmperorChartPanel({ chart }: { chart: EmperorChart }) {
  const color = POWER_LEVEL_COLOR[chart.powerLevel] ?? "#D9BC82";

  return (
    <div className="space-y-4 mt-2">
      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1" style={{ background: "rgba(198,169,107,0.2)" }} />
        <p className="text-[#D9BC82] text-xs tracking-widest uppercase">ผังดวงจักรพรรดิ</p>
        <div className="h-px flex-1" style={{ background: "rgba(198,169,107,0.2)" }} />
      </div>

      {/* Power level */}
      <Card glow className="text-center py-5">
        <p className="text-[#94A3B8] text-xs uppercase tracking-widest mb-2">ระดับดวงชะตา</p>
        <p className="font-display text-4xl font-bold mb-1" style={{ color, textShadow: `0 0 30px ${color}55` }}>
          {chart.powerLevel}
        </p>
        <p className="text-[#94A3B8] text-sm">กำลังดวงรวม {chart.totalPower} คะแนน</p>
        <div className="mt-4 mx-auto max-w-xs h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(75,111,174,0.2)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, (chart.totalPower / 21) * 100)}%`,
              background: `linear-gradient(90deg, ${color}80, ${color})`,
            }}
          />
        </div>
      </Card>

      {/* 3 pillars */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center py-4">
          <p className="text-[#94A3B8] text-[10px] uppercase tracking-wide mb-2">ชะตาหลัก</p>
          <p className="font-display text-3xl font-bold text-[#D9BC82] mb-1">{chart.destiny.base}</p>
          <p className="text-[#F8F6F1] text-sm font-medium">{chart.destiny.planet}</p>
          <p className="text-[#94A3B8] text-[10px] mt-1">{chart.destiny.power}</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-[#94A3B8] text-[10px] uppercase tracking-wide mb-2">ทรัพย์สิน</p>
          <p className="font-display text-3xl font-bold text-[#9AB3D9] mb-1">{chart.wealth.base}</p>
          <p className="text-[#F8F6F1] text-sm font-medium">{chart.wealth.planet}</p>
          <p className="text-[#94A3B8] text-[10px] mt-1">{chart.wealth.power}</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-[#94A3B8] text-[10px] uppercase tracking-wide mb-2">การงาน</p>
          <p className="font-display text-2xl font-bold mb-1" style={{ color: chart.work.isAuspicious ? "#D9BC82" : "#94A3B8" }}>
            {chart.work.taksa}
          </p>
          <p className="text-[#94A3B8] text-[10px] mt-1">
            {chart.work.isAuspicious ? "ทักษามงคล ✦" : "ระวังอุปสรรค"}
          </p>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <p className="text-[#94A3B8] text-xs uppercase tracking-wide mb-2">สรุปผังดวง</p>
        <p className="text-[#D9CDB7] text-sm leading-relaxed">{chart.summary}</p>
      </Card>
    </div>
  );
}

// ─── ยามอัฐกาลอัตโนมัติ ─────────────────────────────────────────────────────

const PLANET_SYMBOLS: Record<string, string> = {
  สุริยะ: "☉", ระวิ:  "☉",
  จันเทา: "☽", คะศิ:  "☽",
  ภุมมะ:  "♂", ภุมโม: "♂",
  พุทธะ:  "☿", พุทโธ: "☿",
  ครู:    "♃", ชีโว:  "♃",
  ศุกระ:  "♀", ศุโกร: "♀",
  เสารี:  "♄", โสโร:  "♄",
};

const PHASE_LABEL: Record<string, string> = {
  start: "ยามต้น", middle: "ยามกลาง", end: "ยามปลาย",
};
const PERIOD_LABEL: Record<string, string> = {
  day: "กลางวัน", night: "กลางคืน",
};

function toLocalDateStr(d: Date): string {
  const y   = d.getFullYear();
  const mo  = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}
function toLocalTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function YamCalculatorSection() {
  const [dateVal, setDateVal] = useState("");
  const [timeVal, setTimeVal] = useState("");
  const [yam, setYam] = useState<YamResult | null>(null);

  const compute = useCallback((dv: string, tv: string) => {
    if (!dv || !tv) return;
    const [hStr, mStr] = tv.split(":");
    const [yStr, moStr, dayStr] = dv.split("-");
    const dt = new Date(Number(yStr), Number(moStr) - 1, Number(dayStr), Number(hStr ?? 0), Number(mStr ?? 0), 0);
    setYam(getYamPrediction(dt));
  }, []);

  useEffect(() => {
    const now = new Date();
    const dv = toLocalDateStr(now);
    const tv = toLocalTimeStr(now);
    setDateVal(dv);
    setTimeVal(tv);
    compute(dv, tv);
  }, [compute]);

  useEffect(() => { compute(dateVal, timeVal); }, [dateVal, timeVal, compute]);

  function setNow() {
    const now = new Date();
    const dv = toLocalDateStr(now);
    const tv = toLocalTimeStr(now);
    setDateVal(dv);
    setTimeVal(tv);
  }

  const displayDayName = yam ? `วัน${DAY_NAMES_THAI[yam.dayName]}` : "";

  const yamWindow = (() => {
    if (!yam) return null;
    const rise  = yam.sunTimes.sunrise.getTime();
    const set   = yam.sunTimes.sunset.getTime();
    const dayMs = set - rise;
    const winMs = yam.period === "day" ? dayMs / 8 : (86400000 - dayMs) / 8;
    const base  = yam.period === "day" ? rise : set;
    const start = new Date(base + (yam.yamNumber - 1) * winMs);
    const end   = new Date(start.getTime() + winMs);
    const phaseMs    = winMs / 3;
    const phaseIdx   = ["start", "middle", "end"].indexOf(yam.phase);
    const phaseStart = new Date(start.getTime() + phaseIdx * phaseMs);
    const phaseEnd   = new Date(phaseStart.getTime() + phaseMs);
    const fmt = (d: Date) => d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    return { yamRange: `${fmt(start)} – ${fmt(end)}`, phaseRange: `${fmt(phaseStart)} – ${fmt(phaseEnd)}` };
  })();

  return (
    <div className="space-y-4 mt-2">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1" style={{ background: "rgba(198,169,107,0.2)" }} />
        <p className="text-[#D9BC82] text-[10px] tracking-widest uppercase whitespace-nowrap">ยามอัฐกาลอัตโนมัติ</p>
        <div className="h-px flex-1" style={{ background: "rgba(198,169,107,0.2)" }} />
      </div>

      {/* Inputs */}
      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="text-[#8A8070] text-[10px] uppercase tracking-widest block mb-1">เลือกวัน</label>
            <input
              type="date"
              value={dateVal}
              onChange={e => setDateVal(e.target.value)}
              className="w-full bg-[#0A1628] border border-[#2A2018] text-[#F3EFE8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A96E]"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-[#8A8070] text-[10px] uppercase tracking-widest block mb-1">เวลา (ชั่วโมง:นาที)</label>
            <input
              type="time"
              value={timeVal}
              onChange={e => setTimeVal(e.target.value)}
              className="w-full bg-[#0A1628] border border-[#2A2018] text-[#F3EFE8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A96E]"
            />
          </div>
          <button
            onClick={setNow}
            className="px-4 py-2 rounded-lg text-xs font-bold border border-[#C9A96E]/40 text-[#C9A96E] hover:bg-[#C9A96E]/10 transition-colors whitespace-nowrap"
          >
            ปัจจุบัน
          </button>
        </div>
      </Card>

      {/* Result */}
      {yam && (
        <>
          <Card>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[#8A8070] text-[9px] uppercase tracking-widest mb-1">วัน · ช่วง</p>
                <p className="text-[#F3EFE8] font-semibold text-sm">{displayDayName} · {PERIOD_LABEL[yam.period]}</p>
              </div>
              <div>
                <p className="text-[#8A8070] text-[9px] uppercase tracking-widest mb-1">ยามที่ · ดาวเสวยยาม</p>
                <p className="text-[#C9A96E] font-bold text-sm">
                  {PLANET_SYMBOLS[yam.yamName] ?? "✦"} ยาม{yam.yamNumber} · {yam.yamName}
                </p>
              </div>
              <div>
                <p className="text-[#8A8070] text-[9px] uppercase tracking-widest mb-1">ยามย่อย</p>
                <p className="text-[#F3EFE8] font-semibold text-sm">
                  {PHASE_LABEL[yam.phase]}
                  {yamWindow && <span className="text-[#8A8070] text-xs ml-1">{yamWindow.phaseRange}</span>}
                </p>
              </div>
            </div>
            {yamWindow && (
              <p className="text-[#8A8070] text-[10px] mt-3">ช่วงยาม: {yamWindow.yamRange}</p>
            )}
          </Card>

          {yam.prediction && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "📰", label: "เรื่องที่ได้ยิน",       val: yam.prediction.news },
                  { icon: "💊", label: "คนเจ็บไข้",             val: yam.prediction.sickness },
                  { icon: "🔍", label: "ของหาย",                val: yam.prediction.lostItem },
                  { icon: "🌟", label: "เวลามงคลที่ดีที่สุด",   val: yam.prediction.bestTime },
                ].map(({ icon, label, val }) => (
                  <Card key={label} className="flex items-start gap-2 p-3 bg-white/5 border-transparent">
                    <span className="text-lg shrink-0">{icon}</span>
                    <div>
                      <p className="text-[#C9A96E] text-[9px] font-bold uppercase tracking-wider mb-0.5">{label}</p>
                      <p className="text-[#D9CDB7] text-xs leading-relaxed">{val}</p>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="p-0 overflow-hidden bg-[#0A1628]/40 border-[#D9BC82]/10">
                <div className="p-3 bg-[#D9BC82]/5 border-b border-[#D9BC82]/10 flex items-center gap-2">
                  <span className="text-[#D9BC82]">✨</span>
                  <span className="text-[9px] font-bold text-[#D9BC82] uppercase tracking-widest">พลังงานมงคลและคำแนะนำ</span>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-[9px] text-[#8A8070] uppercase font-bold mb-1">ด้านมงคลเด่น</p>
                    <p className="text-sm font-bold text-[#F3EFE8]">{yam.prediction.auspicious}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[9px] text-green-400/70 uppercase font-bold mb-1">สิ่งที่ควรทำ</p>
                      <p className="text-xs text-[#D9CDB7] leading-relaxed">{yam.prediction.shouldDo}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-red-400/70 uppercase font-bold mb-1">ไม่ควรทำ / ควรระวัง</p>
                      <p className="text-xs text-[#D9CDB7] leading-relaxed">{yam.prediction.shouldNotDo}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-[9px] text-blue-400/70 uppercase font-bold mb-1">ถ้าจะทำ ทำแบบไหน</p>
                    <p className="text-xs italic text-[#8A8070] leading-relaxed">{yam.prediction.howTo}</p>
                  </div>
                </div>
              </Card>

              <div className="space-y-2">
                <p className="text-[#C9A96E] text-[10px] tracking-widest uppercase flex items-center gap-2">
                  🚗 การเดินทางตามช่วงยาม (ต้น/กลาง/ปลาย)
                </p>
                {[
                  { label: "ยามต้น",  val: yam.prediction.travel.start,  phase: "start" },
                  { label: "ยามกลาง", val: yam.prediction.travel.middle, phase: "middle" },
                  { label: "ยามปลาย", val: yam.prediction.travel.end,    phase: "end" },
                ].map(({ label, val, phase }) => {
                  const active = yam.phase === phase;
                  return (
                    <div key={phase} className={`p-3 rounded-xl border text-xs transition-all ${
                      active ? "bg-[#D9BC82]/10 border-[#D9BC82]/30" : "bg-white/5 border-transparent opacity-60"
                    }`}>
                      <div className="flex justify-between items-center mb-0.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${active ? "text-[#C9A96E]" : "text-[#8A8070]"}`}>
                          {label}
                        </span>
                        {active && <span className="text-[8px] bg-[#D9BC82] text-[#0A1628] px-2 py-0.5 rounded-full font-bold uppercase">ปัจจุบัน</span>}
                      </div>
                      <p className={active ? "text-[#F3EFE8] font-medium" : "text-[#8A8070]"}>{val}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
