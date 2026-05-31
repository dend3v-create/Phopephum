import { json } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, useLoaderData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { logEvent, EVENTS } from "~/services/analytics.server";
import {
  horoscopeEngine,
  calculateSevenNumbersNineBases,
  calculateWisdomTaksa,
  getYamPrediction,
  DAY_NAMES_THAI,
  calcTaksaMaha,
  buddhToCS,
  STAR_NAMES,
} from "@phopephum/engine";
import type {
  TaksaMahaResult,
  StarAlert,
  AlertLevel,
  StarNumber,
  MahaBhop,
  TaksaBhop,
} from "@phopephum/engine";
import { HoroscopeInputSchema } from "@phopephum/validators";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";
import type { HoroscopeResult } from "@phopephum/types";
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
  const user = await requireAuth(request, env);

  const formData = await request.formData();
  const raw = {
    birthDate: String(formData.get("birthDate") ?? ""),
    birthTime: String(formData.get("birthTime") ?? "") || undefined,
    birthPlace: String(formData.get("birthPlace") ?? "") || undefined,
  };

  const parsed = HoroscopeInputSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: `ข้อมูลไม่ถูกต้อง: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`, result: null }, { status: 400 });
  }

  const baseResult = await horoscopeEngine(parsed.data);
  const dayNum = baseResult.sevenNumbers.base[0];
  const monthNum = baseResult.sevenNumbers.base[1];
  const yearNum = baseResult.sevenNumbers.base[2];
  const matrix = calculateSevenNumbersNineBases(dayNum, monthNum, yearNum);
  const age = baseResult.transitPhase.currentAge;
  const taksaResult = calculateWisdomTaksa(dayNum, age);

  // ── ข้อมูลวันเวลาทำนาย (วันจร) ──
  const transitDate = String(formData.get("transitDate") ?? "") || new Date().toISOString().split("T")[0];
  const transitTime = String(formData.get("transitTime") ?? "") || "00:00";
  const transitPlace = String(formData.get("transitPlace") ?? "") || undefined;

  const [ty, tm, td] = transitDate.split("-").map(Number);
  const [th, tmin] = transitTime.split(":").map(Number);
  const checkDate = new Date(ty, tm - 1, td, th, tmin, 0);

  // ── ระบบทักษา + มหาภูติ ใหม่ v3 (9-slot algorithm) ──
  const birthDateObj = new Date(parsed.data.birthDate);
  const birthYearThai = birthDateObj.getFullYear() + 543;
  const currentYearThai = checkDate.getFullYear() + 543;
  const csNatal = buddhToCS(birthYearThai);
  const csTransit = buddhToCS(currentYearThai);

  const taksaMaha = calcTaksaMaha({
    birthDate: birthDateObj,
    checkDate,
    csNatal,
    csTransit,
  });

  await logEvent(request, env, EVENTS.CALC_HORA, {
    birthYear: parsed.data.birthDate.split("-")[0],
    province: parsed.data.birthPlace,
  });

  const { createSupabaseClient } = await import("~/services/supabase.server");
  const { supabase } = createSupabaseClient(request, env);
  await supabase.from("profiles").update({
    birth_date: parsed.data.birthDate,
    birth_time: parsed.data.birthTime,
    birth_place: parsed.data.birthPlace,
  }).eq("id", user.id);

  return json({
    result: baseResult,
    matrix,
    taksaResult,
    taksaMaha,
    birthDate: parsed.data.birthDate,
    birthYearThai,
    currentYearThai,
    transitDate,
    transitTime,
    transitPlace,
    error: null,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function HoroscopePage() {
  const { profile } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";
  const [hoverNum, setHoverNum] = useState<number | null>(null);

  const ad = actionData as any;

  return (
    <div className="space-y-8 max-w-5xl pb-20">
      <header>
        <h1 className="font-display text-3xl font-bold text-[#F3EFE8] mb-1">
          คำนวณดวงชะตา <span className="text-[#C9A96E] text-sm font-normal ml-2">Wisdom Standard</span>
        </h1>
        <p className="text-[#8A8070] text-sm italic">
          เลข 7 ตัว 9 ฐาน · ทักษากำเนิด/จร · มหาภูติ · ยามอัฏฐกาล
        </p>
      </header>

      {/* ── Form ── */}
      <Card className="border-[#C9A96E]/20 bg-slate-900/40 backdrop-blur-md">
        <Form method="post" className="space-y-6">
          
          {/* ส่วนที่ 1: วันกำเนิด */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#C9A96E]/15 pb-2">
              <span className="text-xs text-[#C9A96E] font-bold uppercase tracking-wider">วันกำเนิด (วันเกิด)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input name="birthDate" type="date" label="วันเกิด * (ค.ศ.)" defaultValue={profile?.birth_date ?? ""} required />
              <Input name="birthTime" type="time" label="เวลาเกิด" defaultValue={profile?.birth_time ?? ""} />
              <Input name="birthPlace" label="จังหวัดที่เกิด" defaultValue={profile?.birth_place ?? ""} placeholder="กรุงเทพมหานคร" />
            </div>
          </div>

          {/* ส่วนที่ 2: วันจร (ทำนาย) */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between border-b border-[#C9A96E]/15 pb-2">
              <span className="text-xs text-[#C9A96E] font-bold uppercase tracking-wider">วันจร (ทำนาย)</span>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const dateInput = document.querySelector('input[name="transitDate"]') as HTMLInputElement;
                  const timeInput = document.querySelector('input[name="transitTime"]') as HTMLInputElement;
                  if (dateInput) dateInput.value = now.toISOString().split("T")[0];
                  if (timeInput) timeInput.value = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
                }}
                className="text-[10px] font-bold border border-[#C9A96E]/40 text-[#C9A96E] px-2.5 py-1 rounded-md hover:bg-[#C9A96E]/10 transition-all"
              >
                ใช้เวลาขณะนี้
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input name="transitDate" type="date" label="วันที่จร * (ค.ศ.)" defaultValue={ad?.transitDate ?? new Date().toISOString().split("T")[0]} required />
              <Input name="transitTime" type="time" label="เวลาที่จร" defaultValue={ad?.transitTime ?? `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`} />
              <Input name="transitPlace" label="จังหวัดที่จร" defaultValue={ad?.transitPlace ?? "กรุงเทพมหานคร"} placeholder="กรุงเทพมหานคร" />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={isLoading} className="w-full md:w-auto px-12 h-[46px]">
              คำนวณดวงชะตาจร
            </Button>
          </div>
        </Form>
      </Card>

      {ad?.error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm animate-in fade-in">
          {ad.error}
        </div>
      )}

      {ad?.result && !ad?.error && (
        <HoroscopeResultDisplay result={ad.result} />
      )}

      {ad?.matrix && !ad?.error && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <FateMatrixPanel
            matrix={ad.matrix}
            activeNum={hoverNum}
            onNumClick={(n) => setHoverNum(n === hoverNum ? null : n)}
            taksaMaha={ad.taksaMaha}
          />
        </div>
      )}

      {/* ── ระบบทักษา + มหาภูติ ใหม่ ── */}
      {ad?.taksaMaha && !ad?.error && (
        <TaksaMahaSection
          taksaMaha={ad.taksaMaha}
          birthYearThai={ad.birthYearThai}
          currentYearThai={ad.currentYearThai}
        />
      )}

      <div className="pt-6">
        <YamCalculatorSection />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Colors
// ─────────────────────────────────────────────────────────────────────────────

const STAR_COLORS: Record<number, { bg: string; text: string; border: string; ring: string }> = {
  1: { bg: "bg-amber-500/15",   text: "text-amber-300",   border: "border-amber-500/30",   ring: "ring-amber-500/40" },
  2: { bg: "bg-sky-500/15",     text: "text-sky-300",     border: "border-sky-500/30",     ring: "ring-sky-500/40" },
  3: { bg: "bg-rose-500/15",    text: "text-rose-300",    border: "border-rose-500/30",    ring: "ring-rose-500/40" },
  4: { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/30", ring: "ring-emerald-500/40" },
  5: { bg: "bg-violet-500/15",  text: "text-violet-300",  border: "border-violet-500/30",  ring: "ring-violet-500/40" },
  6: { bg: "bg-pink-500/15",    text: "text-pink-300",    border: "border-pink-500/30",    ring: "ring-pink-500/40" },
  7: { bg: "bg-cyan-500/15",    text: "text-cyan-300",    border: "border-cyan-500/30",    ring: "ring-cyan-500/40" },
  8: { bg: "bg-indigo-500/15",  text: "text-indigo-300",  border: "border-indigo-500/30",  ring: "ring-indigo-500/40" },
};

const ALERT_STYLES: Record<AlertLevel, { bg: string; border: string; text: string; badge: string; icon: string }> = {
  danger: { bg: "bg-red-500/10",    border: "border-red-500/40",    text: "text-red-300",    badge: "bg-red-500/20 text-red-300",    icon: "⚠️" },
  warn:   { bg: "bg-amber-500/10",  border: "border-amber-500/40",  text: "text-amber-300",  badge: "bg-amber-500/20 text-amber-300",  icon: "⚡" },
  info:   { bg: "bg-blue-500/10",   border: "border-blue-500/30",   text: "text-blue-300",   badge: "bg-blue-500/20 text-blue-300",   icon: "✦" },
  good:   { bg: "bg-emerald-500/10",border: "border-emerald-500/30",text: "text-emerald-300",badge: "bg-emerald-500/20 text-emerald-300",icon: "★" },
};

const BHOP_DANGER = new Set<TaksaBhop>(["กาลกิณี"]);
const MAHA_DANGER_SET = new Set<MahaBhop>(["โลกาวินาศ", "มรณะ", "อริ"]);
const MAHA_GOOD_SET = new Set<MahaBhop>(["ราชา", "ธงชัย", "ขุมทรัพย์"]);

const ELEMENT_ICONS: Record<string, string> = { ไฟ: "🔥", ดิน: "🌿", ลม: "💨", น้ำ: "💧" };
const ELEMENT_COLORS: Record<string, { active: string; inactive: string }> = {
  ไฟ:  { active: "border-orange-400/60 bg-orange-500/10 text-orange-300", inactive: "border-white/10 bg-white/5 text-[#8A8070]" },
  ดิน: { active: "border-green-400/60 bg-green-500/10 text-green-300",   inactive: "border-white/10 bg-white/5 text-[#8A8070]" },
  ลม:  { active: "border-sky-400/60 bg-sky-500/10 text-sky-300",         inactive: "border-white/10 bg-white/5 text-[#8A8070]" },
  น้ำ: { active: "border-blue-400/60 bg-blue-500/10 text-blue-300",      inactive: "border-white/10 bg-white/5 text-[#8A8070]" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared Indicators logic
// ─────────────────────────────────────────────────────────────────────────────

export function getTaksaTransitIndicator(star: number, taksaMaha?: any) {
  if (!taksaMaha?.taksaTransit?.map) return null;
  const bhop = taksaMaha.taksaTransit.map[star];
  switch (bhop) {
    case "ศรี":
      return { label: "ศรี", fullName: "ศรีจร (โชคลาภ/โอกาสดี)", color: "text-emerald-400 bg-emerald-950/80 border-emerald-500/30" };
    case "มนตรี":
      return { label: "มนตรี", fullName: "มนตรีจร (ผู้อุปถัมภ์/สนับสนุน)", color: "text-sky-400 bg-sky-950/80 border-sky-500/30" };
    case "เดช":
      return { label: "เดช", fullName: "เดชจร (เกียรติยศ/อำนาจบารมี)", color: "text-amber-400 bg-amber-950/80 border-amber-500/30" };
    case "กาลกิณี":
      return { label: "กาลี", fullName: "กาลกิณีจร (อุปสรรค/ข้อควรระวัง)", color: "text-red-400 bg-red-950/80 border-red-500/30" };
    default:
      return null;
  }
}

export function getMahaTransitIndicator(star: number, taksaMaha?: any) {
  if (!taksaMaha?.mahaTransit?.map) return null;
  const map = taksaMaha.mahaTransit.map;
  let bhop: string | null = null;
  for (const [key, val] of Object.entries(map)) {
    if (val === star) {
      bhop = key;
      break;
    }
  }
  
  switch (bhop) {
    case "โลกาวินาศ":
      return { label: "วินาศ", fullName: "โลกาวินาศจร (ความแปรปรวน/ความเครียดภายใน)", color: "text-rose-400 bg-rose-950/80 border-rose-500/30" };
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TaksaMahaSection — Main New Display
// ─────────────────────────────────────────────────────────────────────────────

function TaksaMahaSection({
  taksaMaha,
  birthYearThai,
  currentYearThai,
}: {
  taksaMaha: TaksaMahaResult;
  birthYearThai: number;
  currentYearThai: number;
}) {
  const { taksaNatal, taksaTransit, mahaNatal, mahaTransit } = taksaMaha;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Section Header ── */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#C9A96E]/20" />
        <p className="text-[#C9A96E] text-[10px] tracking-[0.25em] uppercase font-bold">
          ระบบทักษา · มหาภูติ (Taksa-Mahabhuti Combined)
        </p>
        <div className="h-px flex-1 bg-[#C9A96E]/20" />
      </div>

      {/* ── Taksa & Maha Combined Panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CombinedTaksaCard
          taksaNatal={taksaNatal}
          taksaTransit={taksaTransit}
          taksaMaha={taksaMaha}
        />
        <CombinedMahaCard
          natal={mahaNatal}
          transit={mahaTransit}
          birthYearThai={birthYearThai}
          currentYearThai={currentYearThai}
          taksaMaha={taksaMaha}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Combined Taksa Card (กำเนิด + จร ยุบรวมในตารางเดียว)
// ─────────────────────────────────────────────────────────────────────────────

type GridSlot = StarNumber | null;

const TAKSA_GRID_3X3: GridSlot[][] = [
  [1, 2, 3],
  [6, null, 4],
  [8, 5, 7],
];

function CombinedTaksaCard({
  taksaNatal,
  taksaTransit,
  taksaMaha,
}: {
  taksaNatal: any;
  taksaTransit: any;
  taksaMaha: any;
}) {
  return (
    <Card className="p-0 overflow-hidden border-[#C9A96E]/20 shadow-2xl bg-slate-900/40 backdrop-blur-md">
      <div className="p-4 border-b border-[#C9A96E]/20 bg-[#C9A96E]/5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#C9A96E]">ตารางทักษาคู่ (ทักษากำเนิด / ทักษาจร)</p>
        <p className="text-[#8A8070] text-[11px] mt-0.5">
          บริวารเกิด: {STAR_NAMES[taksaNatal.bariStar as StarNumber]} ({taksaNatal.bariStar}) · บริวารจร: {STAR_NAMES[taksaTransit.bariStar as StarNumber]} ({taksaTransit.bariStar})
        </p>
      </div>
      <div className="p-4 bg-slate-950/15">
        <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
          {TAKSA_GRID_3X3.map((row, rIdx) =>
            row.map((star, cIdx) => {
              if (star === null) {
                return (
                  <div
                    key={`center-taksa`}
                    className="aspect-square flex flex-col items-center justify-center rounded-2xl border border-[#C9A96E]/20 bg-[#C9A96E]/10 p-2 text-center"
                  >
                    <span className="text-[#C9A96E] text-xs md:text-sm font-bold leading-none">อายุย่าง</span>
                    <span className="text-[#F8F6F1] font-display text-2xl md:text-3xl font-bold my-1">{taksaTransit.ageYang}</span>
                    <span className="text-[#8A8070] text-xs md:text-sm leading-none">ปี</span>
                  </div>
                );
              }
              const bhopNatal = taksaNatal.map[star] as string | undefined;
              const bhopTransit = taksaTransit.map[star] as string | undefined;
              
              const isKalaNatal = bhopNatal === "กาลกิณี";
              const isBariNatal = bhopNatal === "บริวาร";
              
              const isKalaTransit = bhopTransit === "กาลกิณี";
              const isBariTransit = bhopTransit === "บริวาร";

              return (
                <div
                  key={`star-combined-${star}`}
                  className="aspect-square flex flex-col items-center justify-between rounded-2xl border border-white/5 bg-slate-900/35 p-2 relative overflow-hidden transition-all hover:border-[#C9A96E]/30"
                >
                  {/* ทักษากำเนิด (ด้านบน) */}
                  <span className="text-xs md:text-sm font-semibold leading-none text-[#8A8070]">
                    {bhopNatal ?? "—"}
                  </span>

                  {/* ตัวเลขดาว (ตรงกลาง) */}
                  <div className="flex flex-col items-center justify-center my-0.5">
                    <span className="font-display text-3xl md:text-4xl font-bold leading-none text-[#F8F6F1]">
                      {star}
                    </span>
                    <span className="text-[11px] md:text-xs text-[#8A8070] font-medium mt-0.5">
                      {STAR_NAMES[star as StarNumber]}
                    </span>
                  </div>

                  {/* ทักษาจร (ด้านล่าง) */}
                  <span className={`text-xs md:text-sm font-bold leading-none ${
                    isKalaTransit
                      ? "text-rose-400 bg-red-950/40 border border-red-500/25 px-2 py-0.5 rounded-md"
                      : isBariTransit
                      ? "text-[#C9A96E] bg-[#C9A96E]/10 border border-[#C9A96E]/20 px-2 py-0.5 rounded-md"
                      : "text-[#C9A96E]"
                  }`}>
                    {bhopTransit ? `${bhopTransit}จร` : "—"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Combined Maha Card (กำเนิด + จร ยุบรวมในตารางเดียว)
// ─────────────────────────────────────────────────────────────────────────────

const MAHA_GRID_3X3: (MahaBhop | null)[][] = [
  ["ราชา",   "อธิบดี",    "ธงชัย"],
  [null,     "ขุมทรัพย์", null  ],
  ["มรณะ",   "โลกาวินาศ", "อริ" ],
];

function CombinedMahaCard({
  natal,
  transit,
  birthYearThai,
  currentYearThai,
  taksaMaha,
}: {
  natal: { cs: number; remainder: number; map: Record<string, number> };
  transit: { cs: number; remainder: number; map: Record<string, number> };
  birthYearThai: number;
  currentYearThai: number;
  taksaMaha?: any;
}) {
  return (
    <Card className="p-0 overflow-hidden border-[#C9A96E]/20 shadow-2xl bg-slate-900/40 backdrop-blur-md">
      <div className="p-4 border-b border-[#C9A96E]/20 bg-[#C9A96E]/5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#C9A96E]">มหาภูติกำเนิด จ.ศ.{natal.cs} / จร จ.ศ.{transit.cs}</p>
        <p className="text-[#8A8070] text-[11px] mt-0.5">
          เศษกำเนิด: {natal.remainder} · เศษจร: {transit.remainder}
        </p>
      </div>
      <div className="p-4 bg-slate-950/15">
        <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
          {MAHA_GRID_3X3.map((row, rIdx) =>
            row.map((bhop, cIdx) => {
              if (bhop === null) {
                return (
                  <div
                    key={`maha-empty-combined-${rIdx}-${cIdx}`}
                    className="aspect-square flex items-center justify-center rounded-2xl border border-dashed border-white/5 bg-transparent"
                  >
                    <span className="text-[#8A8070] text-xs">—</span>
                  </div>
                );
              }
              const starNatal = natal.map[bhop] as StarNumber;
              const starTransit = transit.map[bhop] as StarNumber;
              
              return (
                <div
                  key={`maha-combined-${bhop}`}
                  className="aspect-square flex flex-col items-center justify-between rounded-2xl border border-white/5 bg-slate-900/35 p-2 relative overflow-hidden transition-all hover:border-[#C9A96E]/30"
                >
                  {/* ภพมหาภูติกำเนิด (ด้านบน) */}
                  <span className="text-xs md:text-sm font-bold leading-none text-[#8A8070]">
                    {bhop}
                  </span>

                  {/* ดาวมหาภูติกำเนิด (ตรงกลาง) */}
                  <div className="flex flex-col items-center justify-center my-0.5">
                    <span className="font-display text-3xl md:text-4xl font-bold leading-none text-[#F8F6F1]">
                      {starNatal}
                    </span>
                    <span className="text-[11px] md:text-xs text-[#8A8070] font-medium mt-0.5">
                      {STAR_NAMES[starNatal]}
                    </span>
                  </div>

                  {/* ดาวมหาภูติจร (ด้านล่าง) */}
                  <span className={`text-xs md:text-sm font-bold leading-none ${
                    bhop === "โลกาวินาศ"
                      ? "text-amber-500 bg-amber-950/20 border border-amber-500/30 px-2 py-0.5 rounded-md"
                      : "text-[#C9A96E]"
                  }`}>
                    {starTransit} จร
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Existing Components (kept as-is)
// ─────────────────────────────────────────────────────────────────────────────

const NUM_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "bg-amber-500/20",  text: "text-amber-300",  border: "border-amber-500/30" },
  2: { bg: "bg-sky-500/20",    text: "text-sky-300",    border: "border-sky-500/30" },
  3: { bg: "bg-rose-500/20",   text: "text-rose-300",   border: "border-rose-500/30" },
  4: { bg: "bg-emerald-500/20",text: "text-emerald-300",border: "border-emerald-500/30" },
  5: { bg: "bg-violet-500/20", text: "text-violet-300", border: "border-violet-500/30" },
  6: { bg: "bg-pink-500/20",   text: "text-pink-300",   border: "border-pink-500/30" },
  7: { bg: "bg-cyan-500/20",   text: "text-cyan-300",   border: "border-cyan-500/30" },
  8: { bg: "bg-indigo-500/20", text: "text-indigo-300", border: "border-indigo-500/30" },
};

function numColor(n: number, isActive: boolean = false) {
  if (isActive) {
    return {
      bg: "bg-[#C9A96E]",
      text: "text-[#020617]",
      border: "border-[#F8F6F1]",
    };
  }
  return {
    bg: "bg-slate-900/60",
    text: "text-[#F3EFE8]",
    border: "border-[#C9A96E]/20",
  };
}

function HoroscopeResultDisplay({ result }: { result: HoroscopeResult }) {
  const lunar = result.lunarDateInfo;
  return (
    <Card className="border-[#C9A96E]/20 relative">
      <div className="absolute top-4 right-4">
        <span className="text-[#C9A96E] text-xs font-bold bg-[#C9A96E]/10 px-3 py-1 rounded-full border border-[#C9A96E]/20">อายุย่าง {result.transitPhase.currentAge} ปี</span>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-[#C9A96E] rounded-full animate-pulse" />
        <p className="text-[#C9A96E] text-[10px] uppercase tracking-widest font-bold">ปฏิทินจันทรคติไทย (ปฏิทิน 100 ปี)</p>
      </div>
      <p className="text-[#F3EFE8] font-semibold text-lg">
        วัน{lunar.dayName} เดือน{lunar.lunarMonthName} ปี{lunar.zodiacName}
        <span className="text-[#C9A96E] ml-3 text-sm font-normal">({lunar.moonPhase})</span>
      </p>
      <div className="flex gap-4 mt-4 text-xs text-[#8A8070]">
        <span className="bg-white/5 px-3 py-1 rounded-full">ดาวประจำวัน: <span className="text-[#C9A96E] font-bold">{lunar.dayPlanet}</span></span>
        <span className="bg-white/5 px-3 py-1 rounded-full">ขึ้น {lunar.lunarDay} ค่ำ เดือน {lunar.lunarMonth}</span>
      </div>
    </Card>
  );
}

const ROW_META = [
  { label: "ฐาน ๑", sub: "วันเกิด",           phopNames: ["อัตตะ","หินะ","ธนัง","ปิตา","มาตา","โภคา","มัชฌิมา"] },
  { label: "ฐาน ๒", sub: "เดือนเกิด",         phopNames: ["ตนุ","กฎุมภะ","สหัชชะ","พันธุ","ปุตตะ","อริ","ปัตนิ"] },
  { label: "ฐาน ๓", sub: "ปีเกิด",            phopNames: ["มรณะ","ศุภะ","กัมมะ","ลาภะ","พยายะ","ทาสา","ทาสี"] },
  { label: "ฐาน ๔", sub: "ฐานบวก (มหาจักร)", phopNames: null },
  { label: "ฐาน ๕", sub: "ฐานเศษ (มหาภูติ)", phopNames: null },
  { label: "ฐาน ๖", sub: "กำลังพระเคราะห์",  phopNames: null },
  { label: "ฐาน ๗", sub: "กำลังพระเคราะห์",  phopNames: null },
  { label: "ฐาน ๘", sub: "อาตมะ",            phopNames: ["อาตมะ","ทาสา","สิทธิโชค","โภคทรัพย์","โจร","อุบาทว์","อุปถัมภ์"] },
  { label: "ฐาน ๙", sub: "ภริยัง",           phopNames: ["อัตตะ","สักกะ","ญาติ","ธนัง","เคหัง","นาวัง","ภริยัง"] },
];

const BASE4_MEANINGS: Record<number, string> = {
  3: 'อังคารเล็ก', 4: 'พุธเล็ก', 5: 'พฤหัสเล็ก', 6: 'พระอาทิตย์', 7: 'เสาร์เล็ก',
  8: 'อังคารใหญ่', 9: 'พระเกตุ', 10: 'พระเสาร์', 11: 'ราชาโชค', 12: 'พระราหู',
  13: 'มหาอุจ', 14: 'จักรพรรดิ', 15: 'พระจันทร์', 16: 'โสฬสมงคล',
  17: 'พุธใหญ่', 18: 'มหาจักรพรรดิ์', 19: 'พระพฤหัส', 20: 'เสาร์ใหญ่', 21: 'พระศุกร์',
};

function FateMatrixPanel({ matrix, activeNum, onNumClick, taksaMaha }: {
  matrix: number[][];
  activeNum: number | null;
  onNumClick: (n: number) => void;
  taksaMaha?: any;
}) {
  return (
    <Card className="p-0 overflow-hidden border-[#D9BC82]/20 shadow-2xl">
      <div className="bg-[#D9BC82]/10 p-4 border-b border-[#D9BC82]/20 flex justify-between items-center">
        <p className="text-[#D9BC82] text-sm font-bold uppercase tracking-widest">ผังดวงเลข 7 ตัว 9 ฐาน (35 ภพเรือนสมบูรณ์)</p>
        <span className="text-[10px] text-[#8A8070]">แตะตัวเลขเพื่อดูความเชื่อมโยง</span>
      </div>
      <div className="overflow-x-auto p-6 bg-slate-900/30">
        <table className="w-full border-collapse">
          <tbody>
            {matrix.map((row, rIdx) => {
              const isBase4 = rIdx === 3;
              const isTargetRow = [0, 1, 2, 7, 8].includes(rIdx);
              return (
                <tr key={rIdx} className={`group transition-all ${isBase4 ? "bg-[#C9A96E]/5 border-y border-[#C9A96E]/30" : "hover:bg-white/5"}`}>
                  <td className="py-2 pr-6 text-left whitespace-nowrap min-w-[110px]">
                    <p className={`text-[11px] font-bold ${isBase4 ? "text-[#C9A96E]" : "text-[#F8F6F1]"}`}>{ROW_META[rIdx].label}</p>
                    <p className="text-[#8A8070] text-[9px] uppercase tracking-tighter">{ROW_META[rIdx].sub}</p>
                  </td>
                  {row.map((num, cIdx) => {
                    const actualNum = num % 7 || 7;
                    const isHighlighted = activeNum !== null && (isBase4 ? matrix[2]?.[cIdx] === activeNum : (actualNum === activeNum && isTargetRow));
                    const c = numColor(num, isHighlighted);
                    const houseName = isBase4 ? BASE4_MEANINGS[num] : ROW_META[rIdx].phopNames?.[cIdx];
                    
                    const skipIndicators = [3, 4, 5, 6].includes(rIdx);
                    const taksaInd = skipIndicators ? null : getTaksaTransitIndicator(actualNum, taksaMaha);
                    const mahaInd = skipIndicators ? null : getMahaTransitIndicator(actualNum, taksaMaha);

                    return (
                      <td key={cIdx} className="p-1.5 min-w-[54px]">
                        <button
                          onClick={() => onNumClick(isBase4 ? matrix[2]?.[cIdx] : actualNum)}
                          type="button"
                          className="flex flex-col items-center gap-1 w-full focus:outline-none relative group/cell"
                        >
                          <div className="relative">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display text-xl font-bold border shadow-inner transition-all transform ${isHighlighted ? "scale-125 z-10" : ""} ${c.bg} ${c.text} ${c.border}`}>
                              {num}
                            </div>
                            
                            {/* Taksa Transit Badge (Top-Right) */}
                            {taksaInd && (
                              <span 
                                title={taksaInd.fullName}
                                className={`absolute -top-1.5 -right-2 text-[7px] font-bold px-1 py-[1px] rounded-md border leading-none shadow-sm transition-all group-hover/cell:scale-105 ${taksaInd.color}`}
                              >
                                {taksaInd.label}
                              </span>
                            )}
                            
                            {/* Maha Transit Badge (Top-Left) */}
                            {mahaInd && (
                              <span 
                                title={mahaInd.fullName}
                                className={`absolute -top-1.5 -left-2 text-[7px] font-bold px-1 py-[1px] rounded-md border leading-none shadow-sm transition-all group-hover/cell:scale-105 ${mahaInd.color}`}
                              >
                                {mahaInd.label}
                              </span>
                            )}
                          </div>
                          {houseName && (
                            <span className={`text-[9px] leading-tight text-center font-medium ${isHighlighted ? "text-[#C9A96E] font-bold scale-110" : "text-[#8A8070]"}`}>{houseName}</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Legend Block */}
      {taksaMaha && (
        <div className="bg-[#0f172a]/50 p-4 border-t border-[#D9BC82]/10 text-[10px] space-y-2 text-[#8A8070]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-bold text-[#D9BC82] uppercase tracking-wider text-[9px]">ปัจจัยภายนอก (ทักษาจร):</span>
            <div className="flex items-center gap-1.5">
              <span className="px-1 py-[0.5px] rounded border text-[7px] font-bold text-emerald-400 bg-emerald-950/80 border-emerald-500/30">ศรี</span>
              <span>ศรีจร (โอกาส/โชคลาภ)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1 py-[0.5px] rounded border text-[7px] font-bold text-sky-400 bg-sky-950/80 border-sky-500/30">มนตรี</span>
              <span>มนตรีจร (ผู้อุปถัมภ์/สนับสนุน)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1 py-[0.5px] rounded border text-[7px] font-bold text-amber-400 bg-amber-950/80 border-amber-500/30">เดช</span>
              <span>เดชจร (เกียรติยศ/อำนาจ)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1 py-[0.5px] rounded border text-[7px] font-bold text-red-400 bg-red-950/80 border-red-500/30">กาลี</span>
              <span>กาลกิณีจร (อุปสรรค/ควรระวัง)</span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 border-t border-white/5">
            <span className="font-bold text-[#D9BC82] uppercase tracking-wider text-[9px]">ปัจจัยภายใน (มหาภูติจร):</span>
            <div className="flex items-center gap-1.5">
              <span className="px-1 py-[0.5px] rounded border text-[7px] font-bold text-rose-400 bg-rose-950/80 border-rose-500/30">วินาศ</span>
              <span>โลกาวินาศจร (ความแปรปรวน/ความเครียด)</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Yam Section
// ─────────────────────────────────────────────────────────────────────────────

const PLANET_SYMBOLS: Record<string, string> = {
  สุริยะ: "☉", ระวิ: "☉", จันเทา: "☽", คะศิ: "☽",
  ภุมมะ: "♂", ภุมโม: "♂", พุทธะ: "☿", พุทโธ: "☿",
  ครู: "♃", ชีโว: "♃", ศุกระ: "♀", ศุโกร: "♀",
  เสารี: "♄", โสโร: "♄",
};
const PHASE_LABEL: Record<string, string> = { start: "ยามต้น", middle: "ยามกลาง", end: "ยามปลาย" };
const PERIOD_LABEL: Record<string, string> = { day: "กลางวัน", night: "กลางคืน" };

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
    setDateVal(toLocalDateStr(now));
    setTimeVal(toLocalTimeStr(now));
  }

  const displayDayName = yam ? `วัน${DAY_NAMES_THAI[yam.dayName]}` : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#D9BC82]/20" />
        <p className="text-[#D9BC82] text-[10px] tracking-widest uppercase font-bold">ยามอัฏฐกาลอัตโนมัติ (Ashta-Kala Realtime)</p>
        <div className="h-px flex-1 bg-[#D9BC82]/20" />
      </div>
      <Card className="bg-slate-900/50">
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div className="flex-1 min-w-[150px]">
            <label className="text-[#8A8070] text-[10px] uppercase tracking-widest block mb-1.5 font-bold">เลือกวัน</label>
            <input type="date" value={dateVal} onChange={e => setDateVal(e.target.value)} className="w-full bg-[#0A1628] border border-[#2A2018] text-[#F3EFE8] rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-[#8A8070] text-[10px] uppercase tracking-widest block mb-1.5 font-bold">เวลา</label>
            <input type="time" value={timeVal} onChange={e => setTimeVal(e.target.value)} className="w-full bg-[#0A1628] border border-[#2A2018] text-[#F3EFE8] rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
          </div>
          <button onClick={setNow} className="px-6 py-2.5 rounded-xl text-xs font-bold border border-[#C9A96E]/40 text-[#C9A96E] hover:bg-[#C9A96E]/10 transition-all">ปัจจุบัน</button>
        </div>
        {yam && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-[#8A8070] text-[9px] uppercase tracking-widest mb-1">วัน · ช่วงเวลา</p>
              <p className="text-[#F3EFE8] font-bold text-lg">{displayDayName} · {PERIOD_LABEL[yam.period]}</p>
            </div>
            <div className="p-4 bg-[#C9A96E]/10 rounded-2xl border border-[#C9A96E]/20">
              <p className="text-[#C9A96E] text-[9px] uppercase tracking-widest mb-1">ยามที่ · ดาวเสวยยาม</p>
              <p className="text-[#C9A96E] font-bold text-lg">{PLANET_SYMBOLS[yam.yamName] ?? "✦"} ยาม{yam.yamNumber} · {yam.yamName}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-[#8A8070] text-[9px] uppercase tracking-widest mb-1">ยามย่อย</p>
              <p className="text-[#F3EFE8] font-bold text-lg">{PHASE_LABEL[yam.phase]}</p>
            </div>
          </div>
        )}
      </Card>
      {yam?.prediction && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center p-4 bg-white/5 border-transparent">
            <p className="text-[10px] text-[#C9A96E] uppercase font-bold mb-1">ข่าวสาร</p>
            <p className="text-xs text-[#D9CDB7]">{yam.prediction.news}</p>
          </Card>
          <Card className="text-center p-4 bg-white/5 border-transparent">
            <p className="text-[10px] text-[#C9A96E] uppercase font-bold mb-1">อาการเจ็บป่วย</p>
            <p className="text-xs text-[#D9CDB7]">{yam.prediction.sickness}</p>
          </Card>
          <Card className="text-center p-4 bg-white/5 border-transparent">
            <p className="text-[10px] text-[#C9A96E] uppercase font-bold mb-1">ของหาย</p>
            <p className="text-xs text-[#D9CDB7]">{yam.prediction.lostItem}</p>
          </Card>
          <Card className="text-center p-4 bg-white/5 border-transparent">
            <p className="text-[10px] text-[#C9A96E] uppercase font-bold mb-1">เวลามงคล</p>
            <p className="text-xs text-[#D9CDB7]">{yam.prediction.bestTime}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
