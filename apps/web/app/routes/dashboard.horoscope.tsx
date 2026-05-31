import { json } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, useLoaderData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requirePaidPlan, getProfile } from "~/services/auth.server";
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
  { title: "เลข 7 ตัว 9 ฐาน และผังดวงจักรพรรดิ — PhopePhum" },
  { name: "description", content: "คำนวณผูกดวงชะตาเชิงลึกด้วยคัมภีร์ เลข 7 ตัว 9 ฐาน และ ผังดวงจักรพรรดิ ตรวจสอบวัยจร ปีจร ทักษากำเนิดและมหาภูติตามหลักเกณฑ์จันทรคติไทยแท้" },
  
  // Open Graph / Facebook
  { property: "og:type", content: "website" },
  { property: "og:url", content: "https://phopephum.com/dashboard/horoscope" },
  { property: "og:title", content: "เลข 7 ตัว 9 ฐาน และผังดวงจักรพรรดิ — PhopePhum" },
  { property: "og:description", content: "ถอดรหัสชะตาจรระดับจักรพรรดิ ตรวจทักษา มหาภูติ และคัมภีร์ดวงชะตาชีวิต ด้วยระบบภูมิปัญญาพยากรณ์อัจฉริยะ" },
  { property: "og:image", content: "https://phopephum.com/favicon.svg" },

  // Twitter
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: "เลข 7 ตัว 9 ฐาน และผังดวงจักรพรรดิ — PhopePhum" },
  { name: "twitter:description", content: "วิเคราะห์ผูกดวงชะตาด้วยเลข 7 ตัว 9 ฐาน และระบบทักษาจรจันทรคติไทย" },

  // Keywords
  { name: "keywords", content: "เลข 7 ตัว 9 ฐาน, ผังดวงจักรพรรดิ, ตรวจดวงชะตา, ดูดวงเลข 7 ตัว, ทักษากำเนิด, มหาภูติจร, พยากรณ์ชีวิต, ภพภูมิ, PhopePhum" }
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { user, profile } = await requirePaidPlan(request, env);

  const { createSupabaseClient } = await import("~/services/supabase.server");
  const { supabase } = createSupabaseClient(request, env);
  
  // 1. ดึงรายงานล่าสุด
  const { data: reports } = await supabase
    .from("ai_reports")
    .select("id, report_type, created_at, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // 2. ดึงประวัติการคำนวณล่าสุด (History)
  const { data: history } = await supabase
    .from("calculations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  return json({ profile, reports: reports ?? [], history: history ?? [] });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const { createSupabaseClient } = await import("~/services/supabase.server");
  const { supabase } = createSupabaseClient(request, env);

  try {
    const formData = await request.formData();

    // ── แปลงวันที่เกิด พ.ศ. ➔ ค.ศ. ──
    const bDay = Number(formData.get("birthDay") ?? "0");
    const bMonth = Number(formData.get("birthMonth") ?? "0");
    const bYear = Number(formData.get("birthYear") ?? "0");
    const bYearCE = bYear - 543;
    const birthDateStr = bDay && bMonth && bYear 
      ? `${bYearCE}-${String(bMonth).padStart(2, "0")}-${String(bDay).padStart(2, "0")}` 
      : "";

    const raw = {
      birthDate: birthDateStr,
      birthTime: String(formData.get("birthTime") ?? "") || undefined,
      birthPlace: String(formData.get("birthPlace") ?? "") || undefined,
    };

    const parsed = HoroscopeInputSchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: `ข้อมูลไม่ถูกต้อง: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`, result: null }, { status: 400 });
    }

    // ── 1. Calculate Integrated Phopephum Result (v2.0 Systematic) ──
    const tDay = Number(formData.get("transitDay") ?? "0");
    const tMonth = Number(formData.get("transitMonth") ?? "0");
    const tYear = Number(formData.get("transitYear") ?? "0");
    const tYearCE = tYear - 543;
    const transitDate = tDay && tMonth && tYear 
      ? `${tYearCE}-${String(tMonth).padStart(2, "0")}-${String(tDay).padStart(2, "0")}` 
      : new Date().toISOString().split("T")[0];

    const transitTime = String(formData.get("transitTime") ?? "") || "00:00";
    const [ty, tm, td] = transitDate.split("-").map(Number);
    const [th, tmin] = transitTime.split(":").map(Number);
    const checkDate = new Date(ty, tm - 1, td, th, tmin, 0);

    const phopephumResult = await calculatePhopephum(parsed.data, checkDate);

    // ── 2. Legacy Support (Maintain UI compatibility) ──
    const baseResult = await horoscopeEngine(parsed.data);
    const matrix = phopephumResult.nineBase.bases;
    const taksaResult = calculateWisdomTaksa(phopephumResult.nineBase.bases[0][0], phopephumResult.taksaTransit.ageYang);

    // ── 3. Save to History (New calculations table) ──
    await supabase.from("calculations").insert({
      user_id: user.id,
      calc_type: "phopephum_v2",
      input_data: { 
        birthDate: parsed.data.birthDate, 
        birthTime: parsed.data.birthTime,
        checkDate: checkDate.toISOString() 
      },
      result_data: phopephumResult,
    });

    await logEvent(request, env, EVENTS.CALC_HORA, {
      birthYear: parsed.data.birthDate.split("-")[0],
      province: parsed.data.birthPlace,
    });

    await supabase.from("profiles").update({
      birth_date: parsed.data.birthDate,
      birth_time: parsed.data.birthTime,
      birth_place: parsed.data.birthPlace,
    }).eq("id", user.id);

    return json({
      result: baseResult,
      phopephumResult,
      matrix,
      taksaResult,
      taksaMaha: {
        taksaNatal: phopephumResult.taksaNatal,
        taksaTransit: phopephumResult.taksaTransit,
        mahaNatal: phopephumResult.mahaNatal,
        mahaTransit: phopephumResult.mahaTransit,
        elementPairFlags: phopephumResult.crossCheck.elementPairFlags,
        alerts: phopephumResult.crossCheck.alerts,
      },
      birthDate: parsed.data.birthDate,
      birthYearThai: new Date(parsed.data.birthDate).getFullYear() + 543,
      currentYearThai: checkDate.getFullYear() + 543,
      transitDate,
      transitTime,
      transitPlace: String(formData.get("transitPlace") ?? ""),
      error: null,
    });
  } catch (err) {
    console.error("Horoscope Action Error:", err);
    return json({ error: "เกิดข้อผิดพลาดในการคำนวณชะตาชีวิต กรุณาตรวจสอบข้อมูลวันเดือนปีเกิดอีกครั้ง", result: null }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────────────────────

import { UpgradePaywall } from "~/components/ui/UpgradePaywall";

export default function HoroscopePage() {
  const { profile, reports, history } = useLoaderData<typeof loader>();
  const isLocked = profile?.plan === 'free' || profile?.plan === 'basic';

  if (isLocked) {
    return <UpgradePaywall featureName="ตรวจดวงชะตาเลข 7 ตัว 9 ฐาน" description="ปลดล็อกเพื่อเข้าถึงการวิเคราะห์ดวงชะตาฉบับเต็มด้วยระบบ 7 ตัว 9 ฐาน พร้อมคำพยากรณ์พื้นดวงและดวงจรแบบละเอียด" />;
  }
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";
  const ad = actionData as any;

  const [hoverNum, setHoverNum] = useState<number | null>(null);

  // ── คำนวณค่าเริ่มต้นวันเกิด (พ.ศ.) ──
  const birthDateObj = profile?.birth_date ? new Date(profile.birth_date) : null;
  const defaultBDay = birthDateObj ? birthDateObj.getDate() : 15;
  const defaultBMonth = birthDateObj ? birthDateObj.getMonth() + 1 : 6;
  const defaultBYear = birthDateObj ? birthDateObj.getFullYear() + 543 : 2540;

  // ── คำนวณค่าเริ่มต้นวันจร (พ.ศ.) ──
  const transitDateObj = ad?.transitDate ? new Date(ad.transitDate) : new Date();
  const defaultTDay = transitDateObj.getDate();
  const defaultTMonth = transitDateObj.getMonth() + 1;
  const defaultTYear = transitDateObj.getFullYear() + 543;

  return (
    <div className="space-y-8 max-w-5xl pb-20 animate-fade-up">
      <header>
        <h1 className="font-display text-3xl font-bold text-[#F3EFE8] mb-1">
          ถอดรหัสชะตาชีวิต <span className="text-[#C9A96E] text-sm font-normal ml-2 tracking-widest">LIVING WISDOM</span>
        </h1>
        <p className="text-[#8A8070] text-sm italic">
          เจาะลึก 7 ตัว 9 ฐาน · ทักษากำเนิด/จร · มหาภูติ · ปฏิทินจันทรคติไทย
        </p>
      </header>

      {/* ── ประวัติการวิเคราะห์ล่าสุด (Sticky History) ── */}
      {!ad?.phopephumResult && history && history.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <p className="text-[#C6A96B] text-[10px] tracking-[0.2em] uppercase font-bold mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C6A96B]" />
            ดวงชะตาที่วิเคราะห์ล่าสุด
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {history.map((h: any) => (
              <Card key={h.id} className="border-[#C6A96B]/10 p-4 bg-slate-950/20 hover:border-[#C6A96B]/30 transition-all flex flex-col gap-1.5">
                <p className="text-[11px] font-bold text-[#F8F6F1]">
                  {h.result_data.nineBase.lunarDate.thaiDateText}
                </p>
                <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/5">
                   <span className="text-[9px] text-[#94A3B8]">
                     {new Date(h.created_at).toLocaleDateString("th-TH")}
                   </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Form ── */}
      <Card className="border-[#C9A96E]/20 bg-slate-900/40 backdrop-blur-md">
        <Form method="post" className="space-y-6">
          
          {/* ส่วนที่ 1: วันกำเนิด */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#C9A96E]/15 pb-2">
              <span className="text-xs text-[#C9A96E] font-bold uppercase tracking-wider">วันกำเนิด (วันเกิด)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* วันเกิด พ.ศ. Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">วันเกิด (พ.ศ.) *</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <select name="birthDay" defaultValue={defaultBDay} className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-2.5 py-2.5 text-xs focus:border-[#C9A96E]/50 outline-none">
                    {Array.from({ length: 31 }).map((_, i) => (
                      <option key={i + 1} value={i + 1} className="bg-[#020617]">{i + 1}</option>
                    ))}
                  </select>
                  <select name="birthMonth" defaultValue={defaultBMonth} className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-2.5 py-2.5 text-xs focus:border-[#C9A96E]/50 outline-none">
                    {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => (
                      <option key={i + 1} value={i + 1} className="bg-[#020617]">{m}</option>
                    ))}
                  </select>
                  <select name="birthYear" defaultValue={defaultBYear} className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-2.5 py-2.5 text-xs focus:border-[#C9A96E]/50 outline-none">
                    {Array.from({ length: 120 }).map((_, i) => {
                      const y = new Date().getFullYear() + 543 - i;
                      return <option key={y} value={y} className="bg-[#020617]">{y}</option>;
                    })}
                  </select>
                </div>
              </div>

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
                  const dSel = document.querySelector('select[name="transitDay"]') as any;
                  const mSel = document.querySelector('select[name="transitMonth"]') as any;
                  const ySel = document.querySelector('select[name="transitYear"]') as any;
                  const timeInput = document.querySelector('input[name="transitTime"]') as any;
                  
                  if (dSel) dSel.value = String(now.getDate());
                  if (mSel) mSel.value = String(now.getMonth() + 1);
                  if (ySel) ySel.value = String(now.getFullYear() + 543);
                  if (timeInput) timeInput.value = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
                }}
                className="text-[10px] font-bold border border-[#C9A96E]/40 text-[#C9A96E] px-2.5 py-1 rounded-md hover:bg-[#C9A96E]/10 transition-all"
              >
                ใช้เวลาขณะนี้
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* วันจร พ.ศ. Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">วันที่จร (พ.ศ.) *</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <select name="transitDay" defaultValue={defaultTDay} className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-2.5 py-2.5 text-xs focus:border-[#C9A96E]/50 outline-none">
                    {Array.from({ length: 31 }).map((_, i) => (
                      <option key={i + 1} value={i + 1} className="bg-[#020617]">{i + 1}</option>
                    ))}
                  </select>
                  <select name="transitMonth" defaultValue={defaultTMonth} className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-2.5 py-2.5 text-xs focus:border-[#C9A96E]/50 outline-none">
                    {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => (
                      <option key={i + 1} value={i + 1} className="bg-[#020617]">{m}</option>
                    ))}
                  </select>
                  <select name="transitYear" defaultValue={defaultTYear} className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-2.5 py-2.5 text-xs focus:border-[#C9A96E]/50 outline-none">
                    {Array.from({ length: 30 }).map((_, i) => {
                      const y = new Date().getFullYear() + 543 + 10 - i; // ให้เลือกได้ล่วงหน้า 10 ปี
                      return <option key={y} value={y} className="bg-[#020617]">{y}</option>;
                    })}
                  </select>
                </div>
              </div>

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

      {/* ── ส่วนรายงานชะตาชีวิต (AI Reports & Categories) ── */}
      <div className="space-y-6 pt-8 border-t border-[#C9A96E]/20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div>
          <span className="text-[#C9A96E] text-[10px] tracking-[0.25em] uppercase font-bold block mb-1">
            ✦ ระบบภูมิปัญญาพยากรณ์
          </span>
          <h2 className="font-display text-2xl font-bold text-[#F8F6F1] glow-gold">
            บทวิเคราะห์ชีวิตเชิงลึก
          </h2>
          <p className="text-[#8A8070] text-sm italic">
            เลือกหมวดหมู่ที่ต้องการให้ระบบถอดรหัสชะตาชีวิตของท่าน จากระบบทักษา มหาภูติ และคัมภีร์เลข 7 ตัว
          </p>
        </div>

        {/* หมวดหมู่แนะนำเป็น Premium Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            {
              value: "general_prediction",
              label: "ภาพรวมชะตาชีวิต",
              icon: "🪐",
              desc: "เส้นทางชีวิตหลัก",
              color: "from-violet-950/40 to-purple-900/10 border-violet-500/20 hover:border-violet-500/55",
            },
            {
              value: "career",
              label: "การงาน & ธุรกิจ",
              icon: "💼",
              desc: "โอกาสและความสำเร็จ",
              color: "from-sky-950/40 to-blue-900/10 border-sky-500/20 hover:border-sky-500/55",
            },
            {
              value: "relationship",
              label: "ความรัก & คู่ครอง",
              icon: "💖",
              desc: "เนื้อคู่และเสน่ห์เมตตา",
              color: "from-rose-950/40 to-pink-900/10 border-rose-500/20 hover:border-rose-500/55",
            },
            {
              value: "wealth",
              label: "โชคลาภ & การเงิน",
              icon: "💎",
              desc: "คลังสมบัติประจำดวง",
              color: "from-emerald-950/40 to-green-900/10 border-emerald-500/20 hover:border-emerald-500/55",
            },
            {
              value: "annual_forecast",
              label: "จังหวะชะตารายปี",
              icon: "📅",
              desc: "แผนที่พลังงานปีจร",
              color: "from-cyan-950/40 to-teal-900/10 border-cyan-500/20 hover:border-cyan-500/55",
            },
          ].map((cat) => (
            <a
              key={cat.value}
              href={`/dashboard/reports/new?type=${cat.value}`}
              className={`relative overflow-hidden rounded-2xl border p-4 bg-gradient-to-br ${cat.color} transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group flex flex-col justify-between min-h-[140px]`}
            >
              <span className="text-3xl mb-2">{cat.icon}</span>
              <div>
                <p className="font-semibold text-xs text-[#F8F6F1] group-hover:text-[#C9A96E] transition-colors leading-tight">
                  {cat.label}
                </p>
                <p className="text-[10px] text-[#8A8070] mt-1 leading-snug">
                  {cat.desc}
                </p>
              </div>
              <span className="absolute bottom-2.5 right-3 text-[10px] text-[#C9A96E] opacity-0 group-hover:opacity-100 transition-opacity">
                ตรวจดวง ➔
              </span>
            </a>
          ))}
        </div>

        {/* ประวัติรายงานล่าสุด */}
        <div className="space-y-3 pt-4">
          <h3 className="text-sm font-bold text-[#D9BC82] uppercase tracking-wider">
            📜 ประวัติรายงานชะตาชีวิตของคุณ
          </h3>
          {reports.length === 0 ? (
            <Card className="text-center py-8 border-dashed border-white/5 bg-transparent">
              <p className="text-xs text-[#8A8070]">
                ยังไม่พบรายงานที่ท่านเคยสร้างไว้ เลือกหมวดหมู่การ์ดด้านบนเพื่อเริ่มต้นตรวจดวงชะตาเชิงลึกชิ้นแรก!
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reports.map((rep: any) => {
                const typeLabels: Record<string, string> = {
                  general_prediction: "ภาพรวมชะตาชีวิต",
                  life_overview: "ภาพรวมชีวิตเชิงลึก",
                  career: "การงาน & ธุรกิจ",
                  relationship: "ความรัก & คู่ครอง",
                  wealth: "โชคลาภ & การเงิน",
                  annual_forecast: "พยากรณ์รายปีจร",
                };
                return (
                  <a
                    key={rep.id}
                    href={`/dashboard/reports/${rep.id}`}
                    className="block group"
                  >
                    <Card className="hover:border-[#C9A96E]/40 bg-slate-950/20 transition-all py-3.5 px-4 flex items-center justify-between gap-4 cursor-pointer">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#F8F6F1] group-hover:text-[#C9A96E] transition-colors">
                          ✨ {typeLabels[rep.report_type] ?? rep.report_type}
                        </p>
                        <p className="text-[10px] text-[#8A8070] mt-1 truncate">
                          {new Date(rep.created_at).toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <span className="text-xs text-[#C9A96E] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        อ่าน ➔
                      </span>
                    </Card>
                  </a>
                );
              })}
            </div>
          )}
        </div>
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
      return { label: "เดช", fullName: "เดชจร (เกียรติยศ/อำนาจบารมี)", color: "text-[#F8F6F1] bg-white/20 border-white/40" };
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
      return { label: "วินาศ", fullName: "โลกาวินาศจร (ความแปรปรวน/ความเครียดภายใน)", color: "text-amber-400 bg-amber-950/80 border-amber-500/30" };
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
                    const isBase4 = rIdx === 3;
                    const getStarFromBase4 = (n: number): number => {
                      switch (n) {
                        case 3: return 3;
                        case 4: return 4;
                        case 5: return 5;
                        case 6: return 1;
                        case 7: return 7;
                        case 8: return 8;
                        case 10: return 7;
                        case 11: return 4;
                        case 12: return 8;
                        case 13: return 1;
                        case 14: return 5;
                        case 15: return 2;
                        case 16: return 6;
                        case 17: return 4;
                        case 18: return 5;
                        case 19: return 5;
                        case 20: return 7;
                        case 21: return 6;
                        default: return n % 7 || 7;
                      }
                    };

                    const actualNum = isBase4 ? getStarFromBase4(num) : (num % 7 || 7);
                    const isHighlighted = activeNum !== null && (isBase4 ? matrix[2]?.[cIdx] === activeNum : (actualNum === activeNum && isTargetRow));
                    const c = numColor(num, isHighlighted);
                    const houseName = isBase4 ? BASE4_MEANINGS[num] : ROW_META[rIdx].phopNames?.[cIdx];
                    
                    const skipIndicators = [4, 5, 6].includes(rIdx);
                    const showInd = !skipIndicators && actualNum !== 9;
                    const taksaInd = showInd ? getTaksaTransitIndicator(actualNum, taksaMaha) : null;
                    const mahaInd = showInd ? getMahaTransitIndicator(actualNum, taksaMaha) : null;

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
              <span className="px-1 py-[0.5px] rounded border text-[7px] font-bold text-[#F8F6F1] bg-white/20 border-white/40">เดช</span>
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
              <span className="px-1 py-[0.5px] rounded border text-[7px] font-bold text-amber-400 bg-amber-950/80 border-amber-500/30">วินาศ</span>
              <span>โลกาวินาศจร (ความแปรปรวน/ความเครียด)</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
