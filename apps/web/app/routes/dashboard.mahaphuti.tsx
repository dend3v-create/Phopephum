/**
 * dashboard.mahaphuti.tsx
 * มหาภูติกำเนิด — ระบบมหาภูติ 7 ภพ กำเนิด/จร + วิเคราะห์จิตใจ
 */
import { json } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, useLoaderData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireMinPlan, requireAuth } from "~/services/auth.server";
import { logEvent, EVENTS } from "~/services/analytics.server";
import {
  calculatePhopephum,
  calcTaksaMaha,
  buddhToCS,
  STAR_NAMES,
} from "@phopephum/engine";
import type { StarNumber, MahaBhop } from "@phopephum/engine";
import { HoroscopeInputSchema } from "@phopephum/validators";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import type { Env } from "~/env.server";
import { useState, useEffect } from "react";

export const meta: MetaFunction = () => [
  { title: "มหาภูติกำเนิด — PhopePhum" },
  { name: "description", content: "วิเคราะห์ระบบมหาภูติ 7 ภพ กำเนิด/จร สภาวะจิตใจ พลังภายใน และคำพยากรณ์มหาภูติรายภพ" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const { getProfile } = await import("~/services/auth.server");
  const profile = await getProfile(user.id, request, env);

  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");

  const { createSupabaseClient } = await import("~/services/supabase.server");
  const { supabase } = createSupabaseClient(request, env);

  // ดึงรายชื่อลูกค้าที่บันทึกไว้ เพื่อใช้หาข้อมูลตาม customerId
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", user.id);

  let targetPerson = profile;
  let selectedCust = null;
  if (customerId && customers) {
    selectedCust = customers.find(c => c.id === customerId);
    if (selectedCust) {
      targetPerson = {
        id: selectedCust.id,
        birth_date: selectedCust.birth_date,
        birth_time: selectedCust.birth_time,
        birth_place: selectedCust.birth_place,
        display_name: selectedCust.name,
      } as any;
    }
  }

  let initialResult: any = null;
  if (targetPerson?.birth_date) {
    try {
      const checkDate = new Date();
      const birthCE = new Date(targetPerson.birth_date).getFullYear();
      const phopephumResult = await calculatePhopephum({
        birthDate: targetPerson.birth_date,
        birthTime: targetPerson.birth_time || "12:00",
        birthPlace: targetPerson.birth_place || "กรุงเทพมหานคร",
      }, checkDate);

      const taksaMahaFull = calcTaksaMaha({
        birthDate: new Date(targetPerson.birth_date + "T12:00:00"),
        checkDate,
        csNatal:   buddhToCS(birthCE + 543),
        csTransit: buddhToCS(checkDate.getFullYear() + 543),
      });

      initialResult = {
        taksaMaha: {
          taksaNatal: phopephumResult.taksaNatal,
          taksaTransit: phopephumResult.taksaTransit,
          mahaNatal: phopephumResult.mahaNatal,
          mahaTransit: phopephumResult.mahaTransit,
          elementPairFlags: phopephumResult.crossCheck.elementPairFlags,
          alerts: phopephumResult.crossCheck.alerts,
        },
        sawai: taksaMahaFull.sawai,
        birthDate: targetPerson.birth_date,
        birthTime: targetPerson.birth_time || "",
        birthYearThai: birthCE + 543,
        currentYearThai: checkDate.getFullYear() + 543,
        customerId: customerId || undefined,
        customerName: selectedCust ? selectedCust.name : undefined,
      };
    } catch (e) {
      console.error("mahaphuti loader error:", e);
    }
  }

  return json({ profile, initialResult });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);

  try {
    const formData = await request.formData();
    const bDay   = Number(formData.get("birthDay")   ?? "0");
    const bMonth = Number(formData.get("birthMonth") ?? "0");
    const bYear  = Number(formData.get("birthYear")  ?? "0");
    const bYearCE = bYear - 543;
    const birthDateStr = `${bYearCE}-${String(bMonth).padStart(2, "0")}-${String(bDay).padStart(2, "0")}`;

    const raw = {
      birthDate: birthDateStr,
      birthTime: String(formData.get("birthTime") ?? "") || undefined,
      birthPlace: "กรุงเทพมหานคร",
    };

    const parsed = HoroscopeInputSchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: "ข้อมูลวันเกิดไม่ถูกต้อง", result: null }, { status: 400 });
    }

    const checkDate = new Date();
    const birthCE = new Date(parsed.data.birthDate).getFullYear();
    const phopephumResult = await calculatePhopephum(parsed.data, checkDate);

    const taksaMahaFull = calcTaksaMaha({
      birthDate: new Date(parsed.data.birthDate + "T12:00:00"),
      checkDate,
      csNatal:   buddhToCS(birthCE + 543),
      csTransit: buddhToCS(checkDate.getFullYear() + 543),
    });

    await logEvent(request, env, EVENTS.CALC_HORA, {
      birthYear: parsed.data.birthDate.split("-")[0],
      source: "mahaphuti",
    });

    return json({
      taksaMaha: {
        taksaNatal: phopephumResult.taksaNatal,
        taksaTransit: phopephumResult.taksaTransit,
        mahaNatal: phopephumResult.mahaNatal,
        mahaTransit: phopephumResult.mahaTransit,
        elementPairFlags: phopephumResult.crossCheck.elementPairFlags,
        alerts: phopephumResult.crossCheck.alerts,
      },
      sawai: taksaMahaFull.sawai,
      birthDate: parsed.data.birthDate,
      birthTime: parsed.data.birthTime || "",
      birthYearThai: birthCE + 543,
      currentYearThai: checkDate.getFullYear() + 543,
      error: null,
    });
  } catch (err) {
    console.error("mahaphuti action error:", err);
    return json({ error: "เกิดข้อผิดพลาดในการคำนวณ", result: null }, { status: 500 });
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAHA_GRID_3X3: (MahaBhop | null)[][] = [
  ["ราชา",   "อธิบดี",    "ธงชัย"],
  [null,     "ขุมทรัพย์", null   ],
  ["มรณะ",   "โลกาวินาศ", "อริ"  ],
];

const MAHA_QUALITY: Record<string, { tone: "good" | "neutral" | "bad"; icon: string; desc: string; insight: string }> = {
  ราชา:       { tone: "good",    icon: "👑", desc: "มีสง่าราศี ได้รับความเคารพ ได้รับสิ่งพรีเมียม",         insight: "สภาวะภายในสง่างาม ดึงดูดความสำเร็จและความหรูหรา" },
  อธิบดี:     { tone: "good",    icon: "⚔️", desc: "จิตใจเข้มแข็ง กล้าหาญ พร้อมรับบทบาทสำคัญ",           insight: "พลังงานในตัวสูง เหมาะตัดสินใจเรื่องใหญ่ได้อย่างยอดเยี่ยม" },
  ธงชัย:      { tone: "good",    icon: "🏆", desc: "จิตใจมีพลังชัยชนะ มีโชคดีไม่คาดฝัน",                  insight: "ตั้งเป้าหมายสิ่งใดมีแรงบันดาลใจนำพาสู่ความสำเร็จ" },
  ขุมทรัพย์:  { tone: "good",    icon: "💰", desc: "ปีแห่งการกักเก็บความมั่นคง ค้นพบโอกาสสร้างรายได้",     insight: "คลังปัญญามองเห็นโอกาสสร้างผลประโยชน์ก้อนโต" },
  มรณะ:       { tone: "bad",     icon: "🌑", desc: "อยากเปลี่ยนแปลงขนานใหญ่ ต้องการลบล้างสิ่งเดิม",       insight: "มีความกังวลเกี่ยวกับการพลัดพรากหรือเดินทางไกล" },
  อริ:         { tone: "bad",     icon: "⚡", desc: "เผชิญหน้ากับความกดดัน ปัญหาขัดแย้งถี่",               insight: "ต้องมีสติระงับอารมณ์และอดทนอย่างยิ่ง" },
  โลกาวินาศ:  { tone: "bad",     icon: "🌪️", desc: "อารมณ์ภายในแปรปรวนลึกๆ มีเรื่องคาดไม่ถึงพลิกผัน",   insight: "รักษาความนิ่ง ปรับตัวตามสถานการณ์ ไม่แบกความเครียดคนเดียว" },
};

const MAHA_TONE_COLOR: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  good:    { border: "border-emerald-500/25", bg: "bg-emerald-950/15", text: "text-emerald-400", badge: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" },
  neutral: { border: "border-white/8",        bg: "bg-slate-900/30",   text: "text-[#8A8070]",  badge: "bg-white/5 border-white/10 text-[#8A8070]" },
  bad:     { border: "border-rose-500/25",    bg: "bg-rose-950/10",    text: "text-rose-400",   badge: "bg-rose-500/10 border-rose-500/30 text-rose-300" },
};

const MAHA_SEQUENCE_DISPLAY: MahaBhop[] = ["ราชา", "อธิบดี", "ธงชัย", "ขุมทรัพย์", "มรณะ", "อริ", "โลกาวินาศ"];

// ─── Components ───────────────────────────────────────────────────────────────

function MahaGrid({
  natal,
  transit,
  birthYearThai,
  currentYearThai,
}: {
  natal: { cs: number; remainder: number; map: Record<string, number> };
  transit: { cs: number; remainder: number; map: Record<string, number> };
  birthYearThai: number;
  currentYearThai: number;
}) {
  return (
    <Card className="p-0 overflow-hidden border-[#C9A96E]/20 shadow-2xl bg-slate-900/40 backdrop-blur-md">
      <div className="p-4 border-b border-[#C9A96E]/20 bg-[#C9A96E]/5">
        <p className="text-[14px] font-bold uppercase tracking-widest text-[#C9A96E]">
          มหาภูติกำเนิด จ.ศ.{natal.cs} / จร จ.ศ.{transit.cs}
        </p>
        <p className="text-[#8A8070] text-sm mt-0.5">
          เศษกำเนิด: {natal.remainder} · เศษจร: {transit.remainder}
        </p>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
          {MAHA_GRID_3X3.map((row, rIdx) =>
            row.map((bhop, cIdx) => {
              if (bhop === null) {
                return (
                  <div key={`empty-${rIdx}-${cIdx}`}
                    className="aspect-square flex items-center justify-center rounded-2xl border border-dashed border-white/5 bg-transparent">
                    <span className="text-[#8A8070] text-xs">—</span>
                  </div>
                );
              }
              const starNatal   = natal.map[bhop] as StarNumber;
              const starTransit = transit.map[bhop] as StarNumber;
              const quality = MAHA_QUALITY[bhop];
              const tone = quality?.tone ?? "neutral";
              const colors = MAHA_TONE_COLOR[tone];

              return (
                <div key={`maha-${bhop}`}
                  className={`aspect-square flex flex-col items-between justify-between rounded-2xl border p-2 hover:border-[#C9A96E]/30 transition-all ${colors.border} ${colors.bg}`}>
                  <span className="text-[11px] font-bold text-center leading-tight text-[#8A8070]">{bhop}</span>
                  <div className="flex flex-col items-center my-0.5">
                    <span className="font-display text-3xl font-bold text-[#F8F6F1]">{starNatal}</span>
                    <span className="text-[11px] text-[#8A8070]">{STAR_NAMES[starNatal as StarNumber]}</span>
                  </div>
                  <span className={`text-[11px] font-bold text-center ${colors.text}`}>
                    {starTransit} จร
                  </span>
                </div>
              );
            })
          )}
        </div>
        <div className="flex justify-center gap-6 mt-4 text-xs text-[#8A8070]">
          <span className="flex items-center gap-1"><span className="text-[#F8F6F1] font-bold">เลขใหญ่</span> = กำเนิด</span>
          <span className="flex items-center gap-1"><span className="text-emerald-400 font-bold">X จร</span> = จรปีนี้</span>
        </div>
      </div>
    </Card>
  );
}

function MahaPhupPredictionPanel({ bhop, natal, transit }: {
  bhop: MahaBhop;
  natal: { map: Record<string, number> };
  transit: { map: Record<string, number> };
}) {
  const quality = MAHA_QUALITY[bhop];
  const tone = quality?.tone ?? "neutral";
  const colors = MAHA_TONE_COLOR[tone];
  const starNatal   = natal.map[bhop] as StarNumber;
  const starTransit = transit.map[bhop] as StarNumber;
  const sameAsNatal = starNatal === starTransit;

  return (
    <Card className={`border p-4 relative overflow-hidden ${colors.border} ${colors.bg}`}>
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl -z-10 opacity-20"
        style={{ background: tone === "good" ? "#10b981" : tone === "bad" ? "#f43f5e" : "#C9A96E" }} />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0`}>
            {quality?.icon ?? "✦"}
          </div>
          <div>
            <p className="text-[#F8F6F1] font-bold text-sm">{bhop}</p>
            <p className="text-[#8A8070] text-xs">{quality?.desc}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${colors.badge}`}>
            กำเนิด: ดาว {starNatal} ({STAR_NAMES[starNatal as StarNumber]})
          </span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
            sameAsNatal
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "bg-[#4B6FAE]/10 border-[#4B6FAE]/25 text-[#4B6FAE]"
          }`}>
            จรปีนี้: ดาว {starTransit} ({STAR_NAMES[starTransit as StarNumber]})
          </span>
        </div>
      </div>

      <div className={`rounded-xl p-3 text-xs border ${colors.border} bg-black/10`}>
        <p className="text-[#F8F6F1] leading-relaxed">{quality?.insight}</p>
      </div>

      {sameAsNatal && (
        <p className="text-[11px] text-amber-400 mt-2 bg-amber-950/20 border border-amber-500/20 rounded-xl px-3 py-2">
          ⚠️ ดาวกำเนิดและดาวจรตรงกัน — พลังภพ{bhop}ขยายแรงเป็นสองเท่า
        </p>
      )}
    </Card>
  );
}

function MahaCrossCheckPanel({ taksaMaha }: { taksaMaha: any }) {
  const { alerts, taksaTransit, mahaTransit } = taksaMaha;
  if (!alerts?.length) return null;

  const levelColor: Record<string, string> = {
    danger: "border-rose-500/40 bg-rose-950/20 text-rose-300",
    warn:   "border-amber-500/40 bg-amber-950/20 text-amber-300",
    good:   "border-emerald-500/40 bg-emerald-950/20 text-emerald-300",
    info:   "border-sky-500/40 bg-sky-950/20 text-sky-300",
  };
  const levelIcon: Record<string, string> = {
    danger: "🚨", warn: "⚠️", good: "✅", info: "ℹ️",
  };

  return (
    <Card className="border-[#C9A96E]/20 bg-slate-900/40 p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-rose-400 rounded-full animate-pulse" />
        <p className="text-[#C9A96E] text-[13px] uppercase tracking-widest font-bold">Cross-Check ชะตาชีวิต</p>
      </div>
      <div className="space-y-2">
        {alerts.map((a: any, i: number) => (
          <div key={i} className={`rounded-xl p-3.5 border text-xs leading-relaxed ${levelColor[a.level] ?? levelColor.info}`}>
            <div className="flex items-start gap-2">
              <span className="text-sm shrink-0 mt-0.5">{levelIcon[a.level] ?? "ℹ️"}</span>
              <div>
                <span className="font-bold">ดาว{a.starName} — </span>
                {a.message}
                <div className="flex gap-2 mt-1.5 text-[10px] opacity-70">
                  <span>ทักษาจร: {a.taksaTransit}</span>
                  {a.mahaTransit && <span>มหาจร: {a.mahaTransit}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MahaSummaryBar({ natal, transit }: {
  natal: { map: Record<string, number> };
  transit: { map: Record<string, number> };
}) {
  const goodBhops: MahaBhop[]    = ["ราชา", "อธิบดี", "ธงชัย", "ขุมทรัพย์"];
  const badBhops: MahaBhop[]     = ["มรณะ", "อริ", "โลกาวินาศ"];

  const goodTransitStars  = goodBhops.map(b => transit.map[b]).filter(Boolean);
  const badTransitStars   = badBhops.map(b => transit.map[b]).filter(Boolean);
  const transitGoodScore  = goodTransitStars.length;
  const transitBadScore   = badTransitStars.length;

  return (
    <Card className="border-[#C9A96E]/20 bg-gradient-to-r from-[#0A2240]/60 to-[#020617]/80 p-5">
      <p className="text-[#C9A96E] text-[13px] uppercase tracking-widest font-bold mb-4">สรุปพลังมหาภูติปีนี้</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 text-center">
          <p className="text-emerald-400 text-xs uppercase tracking-wider mb-1">ภพมงคล</p>
          <p className="font-display text-4xl font-bold text-emerald-300">{transitGoodScore}</p>
          <p className="text-xs text-[#8A8070] mt-1">ราชา · อธิบดี · ธงชัย · ขุมทรัพย์</p>
          <div className="flex flex-wrap gap-1 mt-2 justify-center">
            {goodBhops.map(b => (
              <span key={b} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                {b}: ดาว{transit.map[b]}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-rose-950/15 border border-rose-500/20 rounded-2xl p-4 text-center">
          <p className="text-rose-400 text-xs uppercase tracking-wider mb-1">ภพอัปมงคล</p>
          <p className="font-display text-4xl font-bold text-rose-300">{transitBadScore}</p>
          <p className="text-xs text-[#8A8070] mt-1">มรณะ · อริ · โลกาวินาศ</p>
          <div className="flex flex-wrap gap-1 mt-2 justify-center">
            {badBhops.map(b => (
              <span key={b} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
                {b}: ดาว{transit.map[b]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function BirthForm() {
  return (
    <Card className="border-[#C9A96E]/20 bg-slate-900/40 p-5">
      <p className="text-[#C9A96E] text-[13px] uppercase tracking-widest font-bold mb-4">ป้อนวันเดือนปีเกิด</p>
      <Form method="post" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-[#8A8070] mb-1 block">วัน</label>
          <input name="birthDay" type="number" min={1} max={31} placeholder="15"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F8F6F1] focus:outline-none focus:border-[#C9A96E]/40" />
        </div>
        <div>
          <label className="text-xs text-[#8A8070] mb-1 block">เดือน</label>
          <input name="birthMonth" type="number" min={1} max={12} placeholder="6"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F8F6F1] focus:outline-none focus:border-[#C9A96E]/40" />
        </div>
        <div>
          <label className="text-xs text-[#8A8070] mb-1 block">ปี พ.ศ.</label>
          <input name="birthYear" type="number" min={2400} max={2600} placeholder="2500"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F8F6F1] focus:outline-none focus:border-[#C9A96E]/40" />
        </div>
        <div>
          <label className="text-xs text-[#8A8070] mb-1 block">เวลาเกิด</label>
          <input name="birthTime" type="time" defaultValue="06:00"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F8F6F1] focus:outline-none focus:border-[#C9A96E]/40" />
        </div>
        <div className="col-span-2 sm:col-span-4">
          <Button type="submit" className="w-full">คำนวณมหาภูติ</Button>
        </div>
      </Form>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MahaPhuti() {
  const { profile, initialResult } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";
  const ad = actionData as any;

  const [activeResult, setActiveResult] = useState<any>(initialResult);
  useEffect(() => {
    if (ad && !ad.error) setActiveResult(ad);
  }, [ad]);

  const taksaMaha = activeResult?.taksaMaha;
  const natal    = taksaMaha?.mahaNatal;
  const transit  = taksaMaha?.mahaTransit;

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-[#4B6FAE] rounded-full animate-pulse" />
            <p className="text-[#4B6FAE] text-[11px] tracking-[0.3em] uppercase font-bold">Mahabhuti System</p>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-[#F8F6F1] font-bold">
            มหาภูติกำเนิด {activeResult?.customerName ? `(${activeResult.customerName})` : ""}
          </h1>
          <p className="text-[#8A8070] text-sm mt-1">ระบบมหาภูติ 7 ภพ — พลังงานวิถีจิตใจ กำเนิด/จร</p>
        </div>
        {natal && (
          <div className="text-right text-xs text-[#8A8070] shrink-0">
            <p>จ.ศ.กำเนิด</p>
            <p className="font-display text-3xl text-[#4B6FAE] font-bold leading-none">{natal.cs}</p>
            <p>เศษ {natal.remainder}</p>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {ad?.error && (
        <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-4 text-rose-400 text-sm">
          {ad.error}
        </div>
      )}

      {/* ── Form ── */}
      {!taksaMaha && <BirthForm />}

      {/* ── Result ── */}
      {taksaMaha && natal && transit && (
        <div className="space-y-6">
          {/* Summary bar */}
          <MahaSummaryBar natal={natal} transit={transit} />

          {/* Grid */}
          <MahaGrid
            natal={natal}
            transit={transit}
            birthYearThai={activeResult.birthYearThai}
            currentYearThai={activeResult.currentYearThai}
          />

          {/* Per-bhop prediction panels */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-[#C9A96E]/20" />
              <p className="text-[#C9A96E] text-[13px] tracking-[0.25em] uppercase font-bold">คำพยากรณ์รายภพ (ปีนี้)</p>
              <div className="h-px flex-1 bg-[#C9A96E]/20" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MAHA_SEQUENCE_DISPLAY.map(bhop => (
                <MahaPhupPredictionPanel
                  key={bhop}
                  bhop={bhop}
                  natal={natal}
                  transit={transit}
                />
              ))}
            </div>
          </div>

          {/* Cross-check alerts */}
          <MahaCrossCheckPanel taksaMaha={taksaMaha} />

          {/* Re-calculate */}
          <BirthForm />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#020617] border border-[#4B6FAE]/30 rounded-2xl p-8 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-[#4B6FAE]/30 border-t-[#4B6FAE] rounded-full animate-spin" />
            <p className="text-[#4B6FAE] text-sm font-bold">กำลังคำนวณมหาภูติ...</p>
          </div>
        </div>
      )}
    </div>
  );
}
