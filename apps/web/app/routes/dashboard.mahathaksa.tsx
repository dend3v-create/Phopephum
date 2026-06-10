/**
 * dashboard.mahathaksa.tsx
 * มหาทักษาพยากรณ์ — ระบบทักษาดาว 8 ดวง กำเนิด/จร + คำพยากรณ์รายดาว
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
import type { StarNumber, TaksaMahaResult } from "@phopephum/engine";
import { HoroscopeInputSchema } from "@phopephum/validators";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import type { Env } from "~/env.server";
import { useState, useEffect } from "react";

export const meta: MetaFunction = () => [
  { title: "มหาทักษาพยากรณ์ — PhopePhum" },
  { name: "description", content: "วิเคราะห์ระบบทักษาดาว 8 ดวง ทักษากำเนิด/ทักษาจร คำพยากรณ์รายดาว และดาวเสวยอายุ" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { profile } = await requireMinPlan("basic", request, env);

  let initialResult: any = null;
  if (profile?.birth_date) {
    try {
      const checkDate = new Date();
      const birthCE = new Date(profile.birth_date).getFullYear();
      const phopephumResult = await calculatePhopephum({
        birthDate: profile.birth_date,
        birthTime: profile.birth_time || "12:00",
        birthPlace: profile.birth_place || "กรุงเทพมหานคร",
      }, checkDate);

      const taksaMahaFull = calcTaksaMaha({
        birthDate: new Date(profile.birth_date + "T12:00:00"),
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
        birthDate: profile.birth_date,
        birthTime: profile.birth_time || "",
        birthYearThai: birthCE + 543,
        currentYearThai: checkDate.getFullYear() + 543,
      };
    } catch (e) {
      console.error("mahathaksa loader error:", e);
    }
  }

  return json({ profile, initialResult });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);

  try {
    const formData = await request.formData();
    const bDay = Number(formData.get("birthDay") ?? "0");
    const bMonth = Number(formData.get("birthMonth") ?? "0");
    const bYear = Number(formData.get("birthYear") ?? "0");
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
      source: "mahathaksa",
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
    console.error("mahathaksa action error:", err);
    return json({ error: "เกิดข้อผิดพลาดในการคำนวณ", result: null }, { status: 500 });
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TAKSA_GRID_3X3: (StarNumber | null)[][] = [
  [1, 2, 3],
  [6, null, 4],
  [8, 5, 7],
];

const STAR_DIRECTIONS: Record<number, string> = {
  1: "ตะวันออกเฉียงเหนือ", // NE
  2: "ตะวันออก",          // E
  3: "ตะวันออกเฉียงใต้",    // SE
  4: "ทิศใต้",           // S
  7: "ตะวันตกเฉียงใต้",    // SW
  5: "ตะวันตก",          // W
  8: "ตะวันตกเฉียงเหนือ",   // NW
  6: "ทิศเหนือ",          // N
};

const ELEMENT_ICONS: Record<string, string> = { ไฟ: "🔥", ดิน: "🌿", ลม: "💨", น้ำ: "💧" };

const STAR_CORE_MEANINGS: Record<number, { title: string; element: string; desc: string }> = {
  1: { title: "ดาวอาทิตย์ (๑)", element: "ไฟ",  desc: "สัญลักษณ์แห่งเกียรติยศ ชื่อเสียง ความเป็นผู้นำ และการแสดงออกถึงศักดิ์ศรีและความคิดสร้างสรรค์ระดับจักรพรรดิ" },
  2: { title: "ดาวจันทร์ (๒)",   element: "ดิน", desc: "สัญลักษณ์แห่งเสน่ห์เมตตามหานิยม ความอ่อนโยน การบริการ โชคลาภ และวิถีอารมณ์ความรู้สึกที่ละเอียดอ่อน" },
  3: { title: "ดาวอังคาร (๓)",   element: "ลม",  desc: "สัญลักษณ์แห่งความกล้าหาญ การลงมือทำอย่างรวดเร็ว พลังขับเคลื่อน พละกำลัง และการแข่งขันเพื่อชัยชนะ" },
  4: { title: "ดาวพุธ (๔)",      element: "น้ำ", desc: "สัญลักษณ์แห่งปัญญาปฏิภาณ ไหวพริบ การสื่อสาร เจรจา การประสานสัมพันธ์อันดี และการค้าขายสร้างรายได้" },
  5: { title: "ดาวพฤหัสบดี (๕)", element: "ดิน", desc: "สัญลักษณ์แห่งปัญญาญาณอันสูงส่ง ความรู้ คุณธรรม ความมั่นคง ศีลธรรม และผู้ใหญ่อุปถัมภ์คำชูที่เป็นมงคล" },
  6: { title: "ดาวศุกร์ (๖)",    element: "น้ำ", desc: "สัญลักษณ์แห่งศิลปะ ความรัก โชคลาภการเงิน ความสุขสำราญทางโลก และเสน่ห์ดึงดูดสิ่งสวยงามเข้ามาหาตัว" },
  7: { title: "ดาวเสาร์ (๗)",    element: "ไฟ",  desc: "สัญลักษณ์แห่งความอดทน ความเพียรพยายาม ภารกิจระยะยาวอันหนักหน่วง และการสร้างรากฐานชีวิตที่ยั่งยืน" },
  8: { title: "ดาวราหู (๘)",     element: "ลม",  desc: "สัญลักษณ์แห่งความกล้าได้กล้าเสีย การเสี่ยงโชค ทางลัด การพลิกฟื้นดวงชะตา การต่างประเทศ หรือความลุ่มหลงนวัตกรรมใหม่ๆ" },
};

const TAKSA_QUALITY: Record<string, { tone: "good" | "neutral" | "bad"; desc: string }> = {
  บริวาร:   { tone: "good",    desc: "มีพลังแห่งความเกื้อหนุนร่วมมือ มีผู้ช่วยงาน ลูกน้อง คนรัก ครอบครัวช่วยส่งเสริมผลักดัน" },
  อายุ:     { tone: "neutral", desc: "โฟกัสที่การดำเนินชีวิต สุขภาพร่างกาย และการปรับสมดุลวิถีชีวิต" },
  เดช:      { tone: "good",    desc: "อำนาจบารมีโดดเด่น ชนะอุปสรรค มีเกียรติยศ ได้รับตำแหน่ง คุมงาน คุมคน" },
  ศรี:      { tone: "good",    desc: "'ปีทองสิริมงคลสูงสุด' มีโชคลาภ ทรัพย์สิน ความสุข ความรักอันหวานชื่น และความราบรื่นในทุกมิติ" },
  มูละ:     { tone: "good",    desc: "โดดเด่นด้านหลักทรัพย์ มรดก รากฐานมั่นคง การซื้อที่อยู่อาศัย ยานพาหนะ หรือการออมเงิน" },
  อุตสาหะ:  { tone: "neutral", desc: "เน้นความพากเพียรพยายาม การทำงานหนัก เหนื่อยแต่จะประสบความสำเร็จ" },
  มนตรี:   { tone: "good",    desc: "ได้รับความเมตตาจากผู้ใหญ่ ครูอาจารย์ มีผู้มีอิทธิพลคอยช่วยเหลือสนับสนุน" },
  กาลกิณี:  { tone: "bad",     desc: "ระวังการเสียชื่อเสียง ขัดแย้ง คดีความ หรือสุขภาพทรุดโทรม ดำเนินชีวิตด้วยความระมัดระวังสูงสุด" },
};

const ELEMENT_PAIRS = [
  { element: "ไฟ",  stars: [1, 7] as [StarNumber, StarNumber], nature: "ชื่อเสียง เกียรติยศ รวดเร็ว รุนแรง" },
  { element: "ดิน", stars: [2, 5] as [StarNumber, StarNumber], nature: "ความมั่นคง สมบูรณ์ ค่อยเป็นค่อยไป" },
  { element: "ลม",  stars: [3, 8] as [StarNumber, StarNumber], nature: "ว่องไว กระฉับกระเฉง กล้าแสดงออก" },
  { element: "น้ำ", stars: [4, 6] as [StarNumber, StarNumber], nature: "ความสุข ครอบครัว สบายๆ เรื่อยๆ" },
];

// ─── Components ───────────────────────────────────────────────────────────────

function TaksaGrid({ taksaMaha }: { taksaMaha: any }) {
  const { taksaNatal, taksaTransit } = taksaMaha;
  return (
    <Card className="p-0 overflow-hidden border-[#C9A96E]/20 shadow-2xl bg-slate-900/40 backdrop-blur-md">
      <div className="p-4 border-b border-[#C9A96E]/20 bg-[#C9A96E]/5">
        <p className="text-[14px] font-bold uppercase tracking-widest text-[#C9A96E]">ตารางทักษาคู่ (ทักษากำเนิด / ทักษาจร)</p>
        <p className="text-[#8A8070] text-sm mt-0.5">
          บริวารเกิด: {STAR_NAMES[taksaNatal.bariStar as StarNumber]} ({taksaNatal.bariStar})
          &nbsp;·&nbsp;
          บริวารจร: {STAR_NAMES[taksaTransit.bariStar as StarNumber]} ({taksaTransit.bariStar})
        </p>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
          {TAKSA_GRID_3X3.map((row, rIdx) =>
            row.map((star, cIdx) => {
              if (star === null) {
                return (
                  <div key="center" className="aspect-square flex flex-col items-center justify-center rounded-2xl border border-[#C9A96E]/20 bg-[#C9A96E]/10 p-2 text-center">
                    <span className="text-[#C9A96E] text-xs font-bold">อายุย่าง</span>
                    <span className="font-display text-3xl font-bold text-[#F8F6F1] my-1">{taksaTransit.ageYang}</span>
                    <span className="text-[#8A8070] text-xs">ปี</span>
                  </div>
                );
              }
              const bhopNatal = taksaNatal.map[star] as string;
              const bhopTransit = taksaTransit.map[star] as string;
              const isKalaTransit = bhopTransit === "กาลกิณี";
              const isBariTransit = bhopTransit === "บริวาร";
              return (
                <div key={`star-${star}`} className="aspect-square flex flex-col items-center justify-between rounded-2xl border border-white/5 bg-slate-900/35 p-2 hover:border-[#C9A96E]/30 transition-all">
                  <span className="text-xs font-semibold text-[#8A8070]">{bhopNatal ?? "—"}</span>
                  <div className="flex flex-col items-center my-0.5">
                    <span className="font-display text-3xl font-bold text-[#F8F6F1]">{star}</span>
                    <span className="text-xs text-[#8A8070]">{STAR_NAMES[star as StarNumber]}</span>
                  </div>
                  <span className={`text-xs font-bold ${
                    isKalaTransit ? "text-rose-400 bg-red-950/40 border border-red-500/25 px-2 py-0.5 rounded-md"
                    : isBariTransit ? "text-[#C9A96E] bg-[#C9A96E]/10 border border-[#C9A96E]/20 px-2 py-0.5 rounded-md"
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

function SawaiCard({ sawai }: { sawai: any }) {
  if (!sawai) return null;

  const startDate = new Date(sawai.sawaiDateStart);
  const endDate   = new Date(sawai.sawaiDateEnd);
  const subStart  = new Date(sawai.subDateStart);
  const subEnd    = new Date(sawai.subDateEnd);
  const fmt = (d: Date) => d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

  const now = new Date();
  const totalMs = endDate.getTime() - startDate.getTime();
  const elapsedMs = Math.max(0, now.getTime() - startDate.getTime());
  const pct = Math.min(100, Math.round((elapsedMs / totalMs) * 100));

  return (
    <Card className="border-[#C9A96E]/20 bg-gradient-to-br from-[#0A2240]/60 to-[#020617]/90 backdrop-blur-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-[#C9A96E] rounded-full animate-pulse" />
        <p className="text-[#C9A96E] text-[13px] uppercase tracking-widest font-bold">ดาวเสวยอายุ + ดาวแทรก</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#C9A96E]/5 border border-[#C9A96E]/20 rounded-2xl p-4">
          <p className="text-xs text-[#8A8070] uppercase tracking-wider mb-1">ดาวเสวยอายุหลัก</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#C9A96E]/15 border border-[#C9A96E]/35 flex items-center justify-center font-display text-2xl font-bold text-[#C9A96E]">
              {sawai.sawaiStar}
            </div>
            <div>
              <p className="text-[#F8F6F1] font-bold text-lg">{sawai.sawaiStarName}</p>
              <p className="text-xs text-[#8A8070]">อายุ {sawai.sawaiAgeStart}–{sawai.sawaiAgeEnd} ปี</p>
            </div>
          </div>
          <p className="text-xs text-[#8A8070] mt-3">{fmt(startDate)} — {fmt(endDate)}</p>
          <div className="mt-2">
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#C9A96E] to-[#D9BC82]" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-[#8A8070] mt-1 text-right">{pct}% ผ่านไปแล้ว</p>
          </div>
        </div>
        <div className="bg-[#4B6FAE]/5 border border-[#4B6FAE]/20 rounded-2xl p-4">
          <p className="text-xs text-[#8A8070] uppercase tracking-wider mb-1">ดาวแทรก (Sub-period)</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#4B6FAE]/15 border border-[#4B6FAE]/35 flex items-center justify-center font-display text-2xl font-bold text-[#4B6FAE]">
              {sawai.subStar}
            </div>
            <div>
              <p className="text-[#F8F6F1] font-bold text-lg">{sawai.subStarName}</p>
              <p className="text-xs text-[#8A8070]">{sawai.subDurationDays} วัน</p>
            </div>
          </div>
          <p className="text-xs text-[#8A8070] mt-3">{fmt(subStart)} — {fmt(subEnd)}</p>
        </div>
      </div>
    </Card>
  );
}

function ElementPairsCard({ taksaMaha }: { taksaMaha: any }) {
  const flags = taksaMaha.elementPairFlags;
  if (!flags?.length) return null;

  return (
    <Card className="border-[#C9A96E]/20 bg-slate-900/40 backdrop-blur-md p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-[#C9A96E] rounded-full" />
        <p className="text-[#C9A96E] text-[13px] uppercase tracking-widest font-bold">คู่ธาตุ (Element Pairs)</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {flags.map((flag: any) => (
          <div
            key={flag.element}
            className={`rounded-2xl p-3 border text-center ${
              flag.isPermanent
                ? "border-[#C9A96E]/40 bg-[#C9A96E]/10"
                : flag.inTransit
                ? "border-sky-500/30 bg-sky-500/5"
                : "border-white/5 bg-white/2"
            }`}
          >
            <p className="text-2xl mb-1">{ELEMENT_ICONS[flag.element]}</p>
            <p className="text-xs font-bold text-[#F8F6F1]">ธาตุ{flag.element}</p>
            <p className="text-[10px] text-[#8A8070] mt-0.5">{flag.stars[0]} + {flag.stars[1]}</p>
            {flag.isPermanent && <span className="text-[10px] text-[#C9A96E] font-bold">ถาวร</span>}
            {!flag.isPermanent && flag.inTransit && <span className="text-[10px] text-sky-400 font-bold">จรปีนี้</span>}
            {!flag.isPermanent && !flag.inTransit && <span className="text-[10px] text-[#4A5568]">ไม่เกิด</span>}
          </div>
        ))}
      </div>
    </Card>
  );
}

function StarPredictionPanel({ star, taksaMaha }: { star: number; taksaMaha: any }) {
  const { taksaNatal, taksaTransit, mahaTransit } = taksaMaha;
  const starInfo = STAR_CORE_MEANINGS[star];
  if (!starInfo) return null;

  const bhopTransit = taksaTransit.map[star] as string;
  const bhopNatal   = taksaNatal.map[star] as string;
  const quality = bhopTransit ? TAKSA_QUALITY[bhopTransit] : null;

  let currentMaha: string | null = null;
  if (mahaTransit?.map) {
    for (const [bhop, sNum] of Object.entries(mahaTransit.map)) {
      if (sNum === star) { currentMaha = bhop; break; }
    }
  }

  const tone = quality?.tone ?? "neutral";

  return (
    <Card className={`border p-4 relative overflow-hidden transition-all ${
      tone === "good"    ? "border-emerald-500/20 bg-emerald-950/10" :
      tone === "bad"     ? "border-rose-500/20 bg-rose-950/10" :
                           "border-white/8 bg-slate-900/30"
    }`}>
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -z-10 opacity-20"
        style={{ background: tone === "good" ? "#10b981" : tone === "bad" ? "#f43f5e" : "#C9A96E" }} />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-display text-xl font-bold shrink-0 border ${
            tone === "good" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" :
            tone === "bad"  ? "bg-rose-500/15 border-rose-500/30 text-rose-300" :
                              "bg-[#C9A96E]/15 border-[#C9A96E]/30 text-[#C9A96E]"
          }`}>{star}</div>
          <div>
            <p className="text-[#F8F6F1] font-bold text-sm">{starInfo.title}</p>
            <p className="text-[#8A8070] text-xs">ธาตุ{starInfo.element} {ELEMENT_ICONS[starInfo.element]}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {bhopTransit && (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
              bhopTransit === "ศรี"      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
              bhopTransit === "กาลกิณี" ? "bg-rose-500/10 border-rose-500/30 text-rose-400" :
              bhopTransit === "เดช"     ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                                           "bg-slate-900/80 border-[#C9A96E]/25 text-[#C9A96E]"
            }`}>
              ทักษาจร: {bhopTransit}
            </span>
          )}
          {currentMaha && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg border bg-[#4B6FAE]/10 border-[#4B6FAE]/25 text-[#4B6FAE]">
              มหาจร: {currentMaha}
            </span>
          )}
        </div>
      </div>

      <p className="text-[11px] text-[#8A8070] italic mb-2 leading-relaxed">{starInfo.desc}</p>

      {quality && (
        <div className={`rounded-xl p-3 text-xs border ${
          tone === "good" ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-200" :
          tone === "bad"  ? "bg-rose-500/5 border-rose-500/10 text-rose-200" :
                            "bg-white/3 border-white/5 text-[#F8F6F1]"
        }`}>
          {quality.desc}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] text-[#8A8070]">
        <div className="bg-slate-950/20 p-2 rounded-xl border border-white/5">
          <span>ทักษากำเนิด: </span>
          <span className="font-bold text-[#F8F6F1]">{bhopNatal || "—"}</span>
        </div>
        <div className="bg-slate-950/20 p-2 rounded-xl border border-white/5">
          <span>มหาภูติจร: </span>
          <span className="font-bold text-[#F8F6F1]">{currentMaha || "—"}</span>
        </div>
      </div>
    </Card>
  );
}

function AlertsPanel({ taksaMaha }: { taksaMaha: any }) {
  const alerts = taksaMaha.alerts;
  if (!alerts?.length) return null;

  const levelColor: Record<string, string> = {
    danger: "border-rose-500/40 bg-rose-950/20 text-rose-400",
    warn:   "border-amber-500/40 bg-amber-950/20 text-amber-400",
    good:   "border-emerald-500/40 bg-emerald-950/20 text-emerald-400",
    info:   "border-sky-500/40 bg-sky-950/20 text-sky-400",
  };

  return (
    <Card className="border-[#C9A96E]/20 bg-slate-900/40 p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-rose-400 rounded-full animate-pulse" />
        <p className="text-[#C9A96E] text-[13px] uppercase tracking-widest font-bold">การแจ้งเตือนชะตา</p>
      </div>
      <div className="space-y-2">
        {alerts.map((a: any, i: number) => (
          <div key={i} className={`rounded-xl p-3 border text-xs ${levelColor[a.level] ?? levelColor.info}`}>
            <span className="font-bold">ดาว{a.starName} (ทักษา{a.taksaTransit}จร) — </span>
            {a.message}
          </div>
        ))}
      </div>
    </Card>
  );
}

function BirthForm() {
  const now = new Date();
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
          <Button type="submit" className="w-full">
            คำนวณทักษาดาว
          </Button>
        </div>
      </Form>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MahaThaksaPage() {
  const { profile, initialResult } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";
  const ad = actionData as any;

  const [activeResult, setActiveResult] = useState<any>(initialResult);
  useEffect(() => {
    if (ad && !ad.error) setActiveResult(ad);
  }, [ad]);

  const [selectedStar, setSelectedStar] = useState<number | null>(null);

  const taksaMaha = activeResult?.taksaMaha;
  const sawai = activeResult?.sawai;

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-[#C9A96E] rounded-full animate-pulse" />
            <p className="text-[#C9A96E] text-[11px] tracking-[0.3em] uppercase font-bold">Taksa System</p>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-[#F8F6F1] font-bold">มหาทักษาพยากรณ์</h1>
          <p className="text-[#8A8070] text-sm mt-1">วิเคราะห์ระบบทักษาดาว 8 ดวง ทักษากำเนิด + ทักษาจร</p>
        </div>
        {taksaMaha && (
          <div className="text-right text-xs text-[#8A8070] shrink-0">
            <p>อายุย่าง</p>
            <p className="font-display text-3xl text-[#C9A96E] font-bold leading-none">{taksaMaha.taksaTransit?.ageYang}</p>
            <p>ปี</p>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {ad?.error && (
        <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-4 text-rose-400 text-sm">
          {ad.error}
        </div>
      )}

      {/* ── Form (ถ้ายังไม่มีผล) ── */}
      {!taksaMaha && <BirthForm />}

      {/* ── Result ── */}
      {taksaMaha && (
        <div className="space-y-6">
          {/* Taksa Grid + Sawai side-by-side on lg */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TaksaGrid taksaMaha={taksaMaha} />
            <SawaiCard sawai={sawai} />
          </div>

          {/* Element Pairs */}
          <ElementPairsCard taksaMaha={taksaMaha} />

          {/* Alerts */}
          <AlertsPanel taksaMaha={taksaMaha} />

          {/* Star-by-Star Yearly Prediction */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-[#C9A96E]/20" />
              <p className="text-[#C9A96E] text-[13px] tracking-[0.25em] uppercase font-bold">คำพยากรณ์รายดาว (ปีนี้)</p>
              <div className="h-px flex-1 bg-[#C9A96E]/20" />
            </div>

            {/* Star selector pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setSelectedStar(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  selectedStar === null
                    ? "bg-[#C9A96E] text-[#020617] border-[#C9A96E]"
                    : "bg-white/5 text-[#8A8070] border-white/10 hover:border-[#C9A96E]/30"
                }`}
              >
                ทั้งหมด
              </button>
              {([1, 2, 3, 4, 5, 6, 7, 8] as StarNumber[]).map(s => {
                const bhop = taksaMaha.taksaTransit?.map?.[s];
                const tone = bhop ? (TAKSA_QUALITY[bhop]?.tone ?? "neutral") : "neutral";
                return (
                  <button
                    key={s}
                    onClick={() => setSelectedStar(prev => prev === s ? null : s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      selectedStar === s
                        ? tone === "good" ? "bg-emerald-500 text-white border-emerald-500"
                          : tone === "bad" ? "bg-rose-500 text-white border-rose-500"
                          : "bg-[#C9A96E] text-[#020617] border-[#C9A96E]"
                        : "bg-white/5 text-[#8A8070] border-white/10 hover:border-[#C9A96E]/30"
                    }`}
                  >
                    {s} {STAR_NAMES[s as StarNumber]}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(([1, 2, 3, 4, 5, 6, 7, 8] as StarNumber[])
                .filter(s => selectedStar === null || s === selectedStar)
              ).map(s => (
                <StarPredictionPanel key={s} star={s} taksaMaha={taksaMaha} />
              ))}
            </div>
          </div>

          {/* Re-calculate button */}
          <BirthForm />
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#020617] border border-[#C9A96E]/30 rounded-2xl p-8 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-[#C9A96E]/30 border-t-[#C9A96E] rounded-full animate-spin" />
            <p className="text-[#C9A96E] text-sm font-bold">กำลังคำนวณทักษาดาว...</p>
          </div>
        </div>
      )}
    </div>
  );
}
