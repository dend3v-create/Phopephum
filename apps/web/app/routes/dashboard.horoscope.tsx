import { json } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, useLoaderData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireMinPlan, getProfile, requireAuth, canAccess } from "~/services/auth.server";
import { logEvent, EVENTS } from "~/services/analytics.server";

import {
  calculateImperial,
  calcTaksaMaha,
  buddhToCS,
  STAR_NAMES,
} from "@phopephum/engine";
import type {
  TaksaMahaResult,
  StarNumber,
  MahaBhop,
  TaksaBhop,
} from "@phopephum/engine";
import { BuddhistDatePartsSchema, HoroscopeInputSchema } from "@phopephum/validators";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";
import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import {
  buddhistPartsToISODate,
  currentBuddhistParts,
  isoDateToBuddhistParts,
} from "~/lib/buddhist-year";

type HoroscopeActionResult = {
  phopephumResult?: any;
  matrix?: number[][];
  taksaMaha?: any;
  birthDate?: string;
  transitDate?: string;
  transitTime?: string;
  error?: string | null;
};

type CustomerOption = {
  id: string;
  name: string;
  birth_date: string;
  birth_time?: string | null;
  birth_place?: string | null;
};

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

function parseBuddhistDateParts(formData: FormData, prefix: "birth" | "transit") {
  const parsed = BuddhistDatePartsSchema.safeParse({
    day: Number(formData.get(`${prefix}Day`) ?? "0"),
    month: Number(formData.get(`${prefix}Month`) ?? "0"),
    yearBE: Number(formData.get(`${prefix}Year`) ?? "0"),
  });

  if (!parsed.success) return null;
  return buddhistPartsToISODate(parsed.data);
}

// ─── Meta & Loader ──────────────────────────────────────────────────────────

export const meta: MetaFunction = () => [
  { title: "เลข 7 ตัว 9 ฐาน และผังดวงจักรพรรดิ — PhopePhum" },
  { name: "description", content: "คำนวณผูกดวงชะตาเชิงลึกด้วยคัมภีร์ เลข 7 ตัว 9 ฐาน และ ผังดวงจักรพรรดิ" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { user, profile } = await requireMinPlan("basic", request, env);

  const { createSupabaseClient } = await import("~/services/supabase.server");
  const { supabase } = createSupabaseClient(request, env);
  
  const historyResult = await supabase
    .from("calculations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  if (historyResult.error) {
    console.warn("[horoscope] calculations history unavailable:", historyResult.error.message);
  }
  const history = historyResult.error ? [] : historyResult.data;

  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  let initialResult = null;
  if (profile?.birth_date) {
    try {
      const imperialResult = await calculateImperial({
        birthDate: profile.birth_date,
        birthTime: profile.birth_time || "12:00",
        birthPlace: profile.birth_place || "กรุงเทพมหานคร",
      }, new Date());

      const birthYearThai = Number(profile.birth_date.slice(0, 4)) + 543;
      const checkDate = new Date();

      initialResult = {
        phopephumResult: imperialResult,
        matrix: imperialResult.matrix,
        taksaMaha: calcTaksaMaha({
          birthDate: new Date(`${profile.birth_date}T12:00:00+07:00`),
          checkDate,
          csNatal: buddhToCS(birthYearThai),
          csTransit: buddhToCS(checkDate.getFullYear() + 543),
        }),
        birthDate: profile.birth_date,
        transitDate: new Date().toISOString().split("T")[0],
        transitTime: "12:00",
      };
    } catch (e) { console.error(e); }
  }

  return json({
    profile,
    history: history ?? [],
    customers: customers ?? [],
    isProLocked: !canAccess(profile, "pro"),
    initialResult,
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const { createSupabaseClient } = await import("~/services/supabase.server");
  const { supabase } = createSupabaseClient(request, env);

  try {
    const formData = await request.formData();
    const birthDateStr = parseBuddhistDateParts(formData, "birth");

    if (!birthDateStr) {
      return json({ error: "กรุณาตรวจสอบวันเดือนปีเกิด", result: null }, { status: 400 });
    }

    const raw = {
      birthDate: birthDateStr,
      birthTime: String(formData.get("birthTime") ?? "") || undefined,
      birthPlace: String(formData.get("birthPlace") ?? "") || undefined,
    };

    const parsed = HoroscopeInputSchema.safeParse(raw);
    if (!parsed.success) return json({ error: "ข้อมูลไม่ถูกต้อง", result: null }, { status: 400 });

    const todayParts = currentBuddhistParts();
    const hasTransitParts =
      formData.has("transitDay") && formData.has("transitMonth") && formData.has("transitYear");
    const transitDate = hasTransitParts
      ? parseBuddhistDateParts(formData, "transit") ?? buddhistPartsToISODate(todayParts)
      : buddhistPartsToISODate(todayParts);

    if (!transitDate) {
      return json({ error: "กรุณาตรวจสอบวันจร", result: null }, { status: 400 });
    }

    const tYear = Number(formData.get("transitYear") ?? todayParts.yearBE);
    const transitTime = String(formData.get("transitTime") ?? "") || "12:00";
    
    const [ty, tm, td] = transitDate.split("-").map(Number);
    const [th, tmin] = transitTime.split(":").map(Number);
    const checkDate = new Date(ty, tm - 1, td, th, tmin, 0);

    const imperialResult = await calculateImperial(parsed.data, checkDate);
    const birthYearThai = Number(parsed.data.birthDate.slice(0, 4)) + 543;
    const taksaMaha = calcTaksaMaha({
      birthDate: new Date(`${parsed.data.birthDate}T12:00:00+07:00`),
      checkDate,
      csNatal: buddhToCS(birthYearThai),
      csTransit: buddhToCS(tYear),
    });

    const ownerName = String(formData.get("customerName") ?? "").trim() || user.email || "ไม่ระบุ";
    await supabase.from("calculations").insert({
      user_id: user.id,
      calc_type: "imperial_v4",
      input_data: { name: ownerName, birthDate: parsed.data.birthDate, birthTime: parsed.data.birthTime, checkDate: checkDate.toISOString() },
      result_data: imperialResult,
    }).then(({ error }) => {
      if (error) console.warn("[horoscope] calculation history insert skipped:", error.message);
    });

    return json({
      phopephumResult: imperialResult,
      matrix: imperialResult.matrix,
      taksaMaha,
      birthDate: parsed.data.birthDate,
      transitDate,
      transitTime,
      error: null,
    });
  } catch (err) { return json({ error: "คำนวณผิดพลาด" }, { status: 500 }); }
}

// ─── Helper Components ───────────────────────────────────────────────────────

function WisdomBirthGuidanceCard({ profile, activeResult, lunar }: { profile: any, activeResult: any, lunar: any }) {
  const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const bDate = activeResult?.birthDate ? new Date(activeResult.birthDate) : (profile?.birth_date ? new Date(profile.birth_date) : null);
  const birthDateText = bDate ? `${bDate.getDate()} ${monthNames[bDate.getMonth()]} พ.ศ. ${bDate.getFullYear() + 543}` : "—";
  
  const transitDateObj = activeResult?.transitDate ? new Date(activeResult.transitDate) : new Date();
  const transitDateText = `${transitDateObj.getDate()} ${monthNames[transitDateObj.getMonth()]} ${transitDateObj.getFullYear() + 543}`;

  const isWaxing = lunar?.moonPhase?.includes("ขึ้น");
  const match = lunar?.moonPhase?.match(/\d+/);
  const brightness = isWaxing ? Math.round((parseInt(match?.[0] || "1") / 15) * 100) : Math.round(((15 - parseInt(match?.[0] || "1")) / 15) * 100);

  return (
    <Card className="border-[#C6A96B]/20 bg-gradient-to-br from-[#0A2240]/80 to-[#020617]/90 backdrop-blur-xl p-6 rounded-[2rem] shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#C6A96B]/5 rounded-full blur-[100px]" />
      <div className="flex flex-col md:flex-row gap-8 relative z-10">
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <span className="text-2xl">⚜️</span>
            <div>
              <h3 className="font-display font-bold text-[#C6A96B] text-[10px] tracking-[0.3em] uppercase opacity-80">WISDOM BIRTH GUIDANCE · ภูมิปัญญาพื้นดวงชะตา</h3>
              <h2 className="text-2xl font-black text-[#F8F6F1] mt-1">ดวงชะตาของ คุณ {profile?.display_name ?? profile?.full_name ?? "ไม่ระบุ"}</h2>
              <p className="text-[11px] text-[#8A8070] mt-1 font-bold">ประจำวันที่ {transitDateText}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-[10px] font-black text-[#C6A96B] uppercase tracking-widest border-l-2 border-[#C6A96B] pl-2">ข้อมูลการถือกำเนิด</p>
              <div className="space-y-1.5 text-xs text-[#F8F6F1] font-thai">
                <p><span className="text-[#8A8070]">วันเกิด:</span> {birthDateText}</p>
                <p><span className="text-[#8A8070]">เวลาเกิด:</span> {activeResult?.phopephumResult?.input_data?.birthTime || "—"} น.</p>
                <p><span className="text-[#8A8070]">จังหวัด:</span> {activeResult?.phopephumResult?.input_data?.birthPlace || "—"}</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-black text-[#C6A96B] uppercase tracking-widest border-l-2 border-[#C6A96B] pl-2">ปฏิทินจันทรคติและอายุ</p>
              <div className="space-y-1.5 text-xs text-[#F8F6F1] font-thai">
                <p><span className="text-[#8A8070]">วันจันทรคติเกิด:</span> {activeResult?.phopephumResult?.lunar?.thaiDateText || "—"}</p>
                <p><span className="text-[#8A8070]">อายุย่างปีนี้:</span> <span className="font-black text-[#C6A96B] text-sm">{activeResult?.phopephumResult?.ageYang} ปี</span></p>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full md:w-60 shrink-0">
          <div className="p-6 rounded-[2rem] bg-slate-900/60 border border-white/5 h-full flex flex-col items-center justify-center text-center shadow-inner">
            <p className="text-[10px] text-[#8A8070] uppercase font-black mb-3 tracking-[0.2em]">จันทรคติจรปัจจุบัน</p>
            <div className="text-5xl mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{isWaxing ? "🌕" : "🌑"}</div>
            <p className="text-[#F8F6F1] font-black text-sm">{lunar?.moonPhase || "—"}</p>
            <p className="text-[10px] text-[#8A8070] mt-2 italic leading-tight px-2 font-thai">({isWaxing ? "ช่วงเวลาแห่งการเติบโต" : "จุดเริ่มต้นแห่งความตั้งใจใหม่"})</p>
            <div className="mt-4 w-full bg-black/40 rounded-full h-1 overflow-hidden border border-white/5">
              <div className="bg-[#C6A96B] h-full transition-all duration-1000 shadow-[0_0_10px_#C6A96B]" style={{ width: `${brightness}%` }} />
            </div>
            <p className="text-[9px] text-[#C6A96B] mt-2 font-black uppercase">Brightness {brightness}%</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function GuidanceItem({ label, desc, color }: { label: string, desc: string, color?: string }) {
  return (
    <div className="flex flex-col gap-1.5 p-3.5 rounded-2xl bg-white/5 border border-white/5 transition-all hover:bg-white/10 group">
      <span className={`text-[13px] font-black font-thai tracking-wide ${color || "text-[#C6A96B]"}`}>{label}:</span>
      <p className="text-[11px] text-[#8A8070] leading-relaxed font-thai font-medium group-hover:text-[#94A3B8] transition-colors">{desc}</p>
    </div>
  );
}

function DetailedGuidancePanel() {
  return (
    <Card className="mt-8 border-[#C6A96B]/30 bg-[#020617]/60 p-10 rounded-[3rem] space-y-12 backdrop-blur-3xl relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-[#C6A96B]/40 to-transparent opacity-40" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-[#C6A96B]/20 pb-5">
             <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(16,185,129,0.15)] border border-emerald-500/20">✨</div>
             <div>
               <h3 className="font-black text-[#F8F6F1] text-xl font-thai tracking-tight">4.2) ปัจจัยภายนอก (ทักษาจรปีนี้)</h3>
               <p className="text-[10px] text-[#8A8070] uppercase font-black tracking-[0.25em] opacity-60">External Life Theme</p>
             </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GuidanceItem label="บริวาร" desc="ลูกน้อง คนรัก ครอบครัว หรือโครงการร่วมมือกันใหม่ๆ" />
            <GuidanceItem label="อายุ" desc="สุขภาพร่างกาย พลังชีวิต และความมั่นคงในการดูแลตนเอง" />
            <GuidanceItem label="เดช" desc="อำนาจบารมี เกียรติยศ ชัยชนะ และสิทธิ์ขาดการตัดสินใจ (ขาวสว่าง)" color="text-slate-100" />
            <GuidanceItem label="ศรี" desc="สิริมงคลสูงสุด โชคลาภ ความรักราบรื่น ทรัพย์สินเงินทอง (เขียวสว่าง)" color="text-[#00FF00]" />
            <GuidanceItem label="มูละ" desc="รากฐานชีวิตที่มั่นคง มรดก การออม ทรัพย์สินชิ้นใหญ่ บ้าน/ที่ดิน" />
            <GuidanceItem label="อุตสาหะ" desc="ความเพียรพยายาม งานหนัก โครงการที่ต้องฝ่าฟันลุล่วง" />
            <GuidanceItem label="มนตรี" desc="ผู้ใหญ่เมตตาเอ็นดู ผู้อุปถัมภ์ช่วยเหลือ คอยเกื้อหนุนแนะนำ" />
            <GuidanceItem label="กาลกิณี" desc="สิ่งที่ควรระวัง อุปสรรคขัดข้อง ความขัดแย้ง หรือสุขภาพ (แดงสว่าง)" color="text-rose-500" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-[#C6A96B]/20 pb-5">
             <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(139,92,246,0.15)] border border-violet-500/20">🧠</div>
             <div>
               <h3 className="font-black text-[#F8F6F1] text-xl font-thai tracking-tight">4.3) ปัจจัยภายใน (มหาภูติจรปีนี้)</h3>
               <p className="text-[10px] text-[#8A8070] uppercase font-black tracking-[0.25em] opacity-60">Internal Energy State</p>
             </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GuidanceItem label="อธิบดี" desc="สภาวะจิตใจเข้มแข็ง ความคิดกล้าหาญพร้อมปกครองหรือคุมงานใหญ่" />
            <GuidanceItem label="ราชา" desc="สภาวะภายในรุ่งโรจน์ สง่างาม ได้รับความเอ็นดูเคารพรัก" />
            <GuidanceItem label="ธงชัย" desc="แรงขับเคลื่อนภายในสู่ชัยชนะ ความสำเร็จ และสัจจะชัยชนะของจิตใจ" color="text-yellow-300" />
            <GuidanceItem label="ขุมทรัพย์" desc="ความสมบูรณ์ของความรู้สึกภายใน คลังปัญญา หรือจังหวะชีวิตทำเงิน" />
            <GuidanceItem label="มรณะ" desc="ความคิดที่อยากปรับปรุง เปลี่ยนแปลง ยุติบางสิ่งเพื่อก้าวข้ามสู่บทเรียนใหม่" />
            <GuidanceItem label="อริ" desc="จิตใจต้องอดทนต่อแรงกดดัน การแก้ปัญหาเรื่องขัดข้องรายวัน" />
            <GuidanceItem label="โลกาวินาศ" desc="ความแปรปรวนพลิกผันของสภาวะจิตใจ เรื่องหลังบ้านแปรปรวน (ส้มเหลืองสว่าง)" color="text-amber-500" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-10 border-t border-white/10">
        <div className="space-y-6">
          <h3 className="font-black text-[#F8F6F1] text-sm font-thai uppercase tracking-widest border-l-4 border-sky-500 pl-4">4.4) สัญลักษณ์ผังดวง</h3>
          <div className="flex flex-wrap gap-8 items-center">
            <div className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-2xl bg-[#C6A96B] text-[#020617] text-lg font-black flex items-center justify-center shadow-xl border-2 border-white/20 transform group-hover:scale-110 transition-all">ล</div>
              <span className="text-xs text-[#8A8070] font-black uppercase tracking-widest">ลัคนากำเนิด</span>
            </div>
            <div className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-2xl bg-sky-500 text-white text-lg font-black flex items-center justify-center shadow-xl border-2 border-white/20 transform group-hover:scale-110 transition-all">ลอ</div>
              <span className="text-xs text-[#8A8070] font-black uppercase tracking-widest">ลัคนาจร</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-inner">
               <span className="text-xs font-black text-amber-400 animate-pulse">✨ ย้ำ</span>
               <span className="text-[10px] text-[#8A8070] font-bold uppercase tracking-tighter">ดาวย้ำ (Double Energy)</span>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <h3 className="font-black text-[#F8F6F1] text-sm font-thai uppercase tracking-widest border-l-4 border-amber-500 pl-4">4.5) ดาวย้ำ & กำลังฐาน 4</h3>
          <div className="space-y-4">
            <p className="text-[11px] text-[#8A8070] leading-relaxed font-thai font-medium bg-slate-900/50 p-4 rounded-2xl border border-white/5 shadow-inner">
              <span className="text-[#C6A96B] font-black mr-1 underline">ดาวย้ำ:</span> บ่งบอกถึงพลังงานที่ถูกเน้นย้ำตามกาลเวลา โดยจะปรากฏในฐานล่างที่ตรงกับคอลัมน์ของจุดจรนั้นๆ
            </p>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20">
              <p className="text-[11px] text-[#F8F6F1] font-black font-thai italic tracking-wide">
                📍 สรุปจำง่าย: ฐานวัน-ย้ำฐาน 5 | ฐานเดือน-ย้ำฐาน 6 | ฐานปี-ย้ำฐาน 7
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SummaryParagraph({ activeResult }: { activeResult: any }) {
  const res = activeResult?.phopephumResult;
  if (!res) return null;
  return (
    <Card className="mt-10 border-[#C6A96B]/40 bg-gradient-to-br from-[#020617] to-[#0A2240] p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#C6A96B]/5 rounded-full blur-[100px] -z-10" />
      <h3 className="font-black text-[#C6A96B] text-base font-thai uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
         <div className="w-1.5 h-6 bg-[#C6A96B] rounded-full" /> 4.6) ตัวอย่างการคำนวณจริงจากอายุย่าง {res.ageYang} ปี ของเจ้าชะตา:
      </h3>
      <div className="space-y-6">
        <p className="text-base text-[#F8F6F1] leading-relaxed font-thai font-medium">
          ปัจจุบันอายุย่าง <span className="text-[#C6A96B] font-black text-xl underline mx-1">{res.ageYang} ปี</span> 
          ปีจรตกที่ ภพ <span className="text-sky-400 font-black text-xl mx-1">{res.yearly?.houseName}</span> 
          ซึ่งอยู่ใน <span className="text-[#F8F6F1] font-black opacity-80">ฐานปี (แถวล่าง)</span> 
          เมื่อลากตรงแนวดิ่งลงมา จะพบอิทธิพลกำลังเทวดาที่ <span className="text-[#C6A96B] font-black underline mx-1">ฐานที่ 4</span> คือกำลัง <span className="text-amber-400 font-black text-xl mx-1">{res.yearly?.b4Power} ({res.yearly?.b4Meaning})</span> 
          ซึ่งกำลังนี้จะส่งอิทธิพลครอบคลุมทั้งตัวภพปีจรหลัก และแผ่ไปถึงดาวย้ำที่ <span className="text-emerald-400 font-black underline mx-1">ฐานที่ 7</span> ซึ่งได้แก่ ดาว <span className="text-emerald-400 font-black text-xl mx-1">{res.yearly?.yumStar}</span>
        </p>
        <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 shadow-inner">
          <p className="text-sm text-[#8A8070] font-thai leading-relaxed italic">
            <span className="text-[#C6A96B] font-black not-italic text-base mr-2">การอ่านทำนาย:</span> 
            ปีจรตกภพ {res.yearly?.houseName} ได้รับอิทธิพลร่วมของกำลัง {res.yearly?.b4Power} ({res.yearly?.b4Meaning}) และเนื่องจากตกฐานปี จึงลากลงไปดูดาวย้ำฐานที่ 7 คือดาว {res.yearly?.yumStar} แล้วนำความหมายทั้งหมดมารวมเพื่อพยากรณ์ชะตาชีวิตในปีนี้
          </p>
        </div>
      </div>
    </Card>
  );
}

function NatalInfoPanel({ activeResult }: { activeResult: any }) {
  const natal = activeResult?.phopephumResult?.natal;
  if (!natal) return null;
  return (
    <Card className="mt-10 border-[#C6A96B]/20 bg-slate-900/60 backdrop-blur-3xl p-8 rounded-[2.5rem] shadow-2xl">
      <h3 className="text-xs font-black text-[#C6A96B] uppercase tracking-[0.3em] mb-8 flex items-center gap-3 border-b border-white/10 pb-5 opacity-80">
        <span className="text-2xl">⌛</span> ส่วนที่ 5: ข้อมูลลัคนากำเนิด ฤกษ์เกิด และยามกำเนิด
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {[
          { label: "ตำแหน่งลัคนา", val: `แถว ${natal.row} / คอล ${natal.col}`, sub: `ดาวประจำลัคนา: ${STAR_NAMES[natal.star as StarNumber]}` },
          { label: "ฤกษ์เกิด", val: natal.reksName, sub: `หมวด: ${natal.reksSlot <= 3 ? "ทาสา/ทาสี" : natal.reksSlot <= 6 ? "มหาอุจ/โสฬส" : "ธนบดินทร์/นักพรต"}` },
          { label: "ยามตกฟาก", val: natal.yamName, sub: `กาล: ${natal.isDay ? "กลางวัน (สุริชะ)" : "กลางคืน (จันทรชะ)"}` },
        ].map((item, i) => (
          <div key={i} className="space-y-3 p-6 rounded-[2rem] bg-white/5 border border-white/5 shadow-inner hover:bg-white/10 transition-all group">
            <p className="text-[10px] text-[#8A8070] uppercase font-black tracking-[0.2em] group-hover:text-[#C6A96B] transition-colors">{item.label}</p>
            <p className="text-2xl text-[#F8F6F1] font-thai font-black tracking-tight">{item.val}</p>
            <p className="text-[11px] text-sky-400 font-bold font-thai opacity-80">{item.sub}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ComparisonCard({ activeResult }: { activeResult: any }) {
  const natal = activeResult?.phopephumResult?.natal;
  const transit = activeResult?.phopephumResult?.transit;
  if (!natal || !transit) return null;
  return (
    <Card className="mt-10 border-[#C6A96B]/20 bg-slate-900/60 backdrop-blur-3xl p-8 rounded-[2.5rem] shadow-2xl">
      <h3 className="text-xs font-black text-[#C6A96B] uppercase tracking-[0.3em] mb-8 flex items-center gap-3 border-b border-white/10 pb-5 opacity-80">
        <span className="text-2xl">⚖️</span> ส่วนที่ 6: เปรียบเทียบลัคนากำเนิด และลัคนาจร
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-4 p-8 rounded-[2.5rem] bg-slate-950/60 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#C6A96B]/10 rounded-full blur-[60px] -z-10 group-hover:bg-[#C6A96B]/20 transition-all" />
          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-[#C6A96B] text-[#020617] text-xl font-black flex items-center justify-center shadow-2xl border-2 border-white/20">ล</div>
            <span className="text-sm font-black text-[#F8F6F1] uppercase tracking-widest">Natal Lagna</span>
          </div>
          <div className="space-y-4">
             <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
               <span className="text-xs text-[#8A8070] font-bold">ภพที่สถิต:</span>
               <span className="text-base text-[#F8F6F1] font-black">{natal.houseName}</span>
             </div>
             <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
               <span className="text-xs text-[#8A8070] font-bold">ฐานเสวยยามใหญ่:</span>
               <span className="text-base text-[#C6A96B] font-black">ฐาน {natal.row}</span>
             </div>
          </div>
        </div>
        <div className="space-y-4 p-8 rounded-[2.5rem] bg-slate-950/60 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-[60px] -z-10 group-hover:bg-sky-500/20 transition-all" />
          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white text-xl font-black flex items-center justify-center shadow-2xl border-2 border-white/20">ลอ</div>
            <span className="text-sm font-black text-[#F8F6F1] uppercase tracking-widest">Progressive Lagna</span>
          </div>
          <div className="space-y-4">
             <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
               <span className="text-xs text-[#8A8070] font-bold">ภพสถิตปัจจุบัน:</span>
               <span className="text-base text-sky-400 font-black">{transit.houseName}</span>
             </div>
             <div className="bg-sky-500/5 p-4 rounded-[1.5rem] border border-sky-500/10 mt-2">
                <p className="text-[10px] text-[#8A8070] font-black uppercase tracking-widest mb-1">วิวัฒนาการชะตาตามอายุย่าง:</p>
                <p className="text-xs text-[#F8F6F1] font-thai font-medium">จากภพ <span className="text-[#C6A96B] font-black underline">{natal.houseName}</span> ➔ <span className="text-sky-400 font-black underline">{transit.houseName}</span></p>
             </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function FateMatrixPanel({ 
  matrix, 
  onNumClick, 
  taksaMaha, 
  phopephumResult,
  showNatalLagna = true,
  showTransitLagna = true,
  showVayaRanges = false,
}: {
  matrix: number[][];
  onNumClick: (n: number | null) => void;
  taksaMaha?: any;
  phopephumResult?: any;
  showNatalLagna?: boolean;
  showTransitLagna?: boolean;
  showVayaRanges?: boolean;
}) {
  const ROW_META = [
    { label: "ฐาน ๑", phopNames: ["อัตตะ","หินะ","ธนัง","ปิตา","มาตา","โภคา","มัชฌิมา"] },
    { label: "ฐาน ๒", phopNames: ["ตนุ","กฎุมภะ","สหัชชะ","พันธุ","ปุตตะ","อริ","ปัตนิ"] },
    { label: "ฐาน ๓", phopNames: ["มรณะ","ศุภะ","กัมมะ","ลาภะ","พยายะ","ทาสา","ทาสี"] },
    { label: "ฐาน ๔", phopNames: null },
    { label: "ฐาน ๕", phopNames: null },
    { label: "ฐาน ๖", phopNames: null },
    { label: "ฐาน ๗", phopNames: null },
    { label: "ฐาน ๘", phopNames: ["อาตมะ","ทาสา","สิทธิโชค","โภคทรัพย์","โจร","อุบาทว์","อุปถัมภ์"] },
    { label: "ฐาน ๙", phopNames: ["อัตตะ","สักกะ","ญาติ","ธนัง","เคหัง","นาวัง","ภริยัง"] },
  ];

  return (
    <Card className="p-0 overflow-hidden border-[#D9BC82]/30 shadow-2xl bg-[#020617]/60 backdrop-blur-3xl rounded-[2.5rem]">
      <div className="bg-gradient-to-r from-[#D9BC82]/20 to-transparent p-6 border-b border-[#D9BC82]/20 flex justify-between items-center">
        <h3 className="text-[#D9BC82] text-sm font-black uppercase tracking-[0.2em] font-thai">4.1) ผังดวงเลข 7 ตัว 9 ฐาน (35 ภพเรือนสมบูรณ์)</h3>
      </div>
      <div className="overflow-x-auto p-8 bg-slate-950/20">
        <table className="w-full border-collapse">
          <tbody>
            {matrix.map((row, rIdx) => (
              <tr key={rIdx} className={rIdx === 3 ? "bg-[#C6A96B]/5 border-y border-[#C6A96B]/20" : "hover:bg-white/5 transition-colors"}>
                <td className="py-5 pr-8 text-left border-r border-white/5 min-w-[120px]">
                  <p className="text-xs font-black text-[#F8F6F1] font-thai opacity-80 uppercase tracking-widest">{ROW_META[rIdx].label}</p>
                </td>
                {row.map((num, cIdx) => {
                  const actualNum = num % 7 || 7;
                  const isBase123 = rIdx < 3;
                  const phopName = ROW_META[rIdx].phopNames ? ROW_META[rIdx].phopNames[cIdx] : null;

                  const isLagnaNatal = showNatalLagna && phopephumResult?.natal?.row === (rIdx + 1) && phopephumResult?.natal?.col === (cIdx + 1);
                  const isLagnaTransit = showTransitLagna && phopephumResult?.transit?.row === (rIdx + 1) && phopephumResult?.transit?.col === (cIdx + 1);

                  // ดาวย้ำ Logic
                  const isYum = (rIdx === 4 && phopephumResult?.daily?.col === (cIdx+1)) || 
                                (rIdx === 5 && phopephumResult?.monthly?.col === (cIdx+1)) || 
                                (rIdx === 6 && phopephumResult?.yearly?.col === (cIdx+1));

                  return (
                    <td key={cIdx} className="p-3 min-w-[90px]">
                      <div className="flex flex-col items-center gap-2 relative">
                        <div className="h-6 flex items-center justify-center">
                          {phopName && !showVayaRanges && <span className="text-[10px] font-black text-[#8A8070] font-thai uppercase">{phopName}</span>}
                          {showVayaRanges && isBase123 && phopephumResult?.vayaRanges && (
                            <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg px-2 py-0.5 shadow-lg">
                               <span className="text-[10px] font-black text-amber-300">
                                 {phopephumResult.vayaRanges.find((r:any)=>r.row===(rIdx+1)&&r.col===(cIdx+1))?.start}-
                                 {phopephumResult.vayaRanges.find((r:any)=>r.row===(rIdx+1)&&r.col===(cIdx+1))?.end}
                               </span>
                            </div>
                          )}
                        </div>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-sans text-2xl font-black border-2 shadow-inner transition-all ${isLagnaNatal||isLagnaTransit ? "scale-110 ring-4 ring-white/5" : ""} ${rIdx===3 ? "bg-[#C6A96B] text-[#020617] border-white/20" : "bg-slate-900/80 text-[#F8F6F1] border-white/10"}`}>
                           {num}
                        </div>
                        {isLagnaNatal && (
                          <span className="absolute -top-1 -left-2 w-7 h-7 rounded-lg bg-[#C6A96B] text-[#020617] text-xs font-black flex items-center justify-center shadow-2xl border-2 border-[#F8F6F1] z-20 animate-bounce-subtle">ล</span>
                        )}
                        {isLagnaTransit && (
                          <span className="absolute -top-1 -right-2 w-7 h-7 rounded-lg bg-sky-500 text-white text-xs font-black flex items-center justify-center shadow-2xl border-2 border-white z-20 animate-pulse">ลอ</span>
                        )}
                        {isYum && (
                          <span className="absolute -bottom-4 text-[9px] font-black text-amber-400 animate-pulse">✨ ย้ำ</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type TabId = "chart" | "analysis" | "calc";

function TabButton({
  id,
  label,
  activeTab,
  disabled,
  onTabChange,
}: {
  id: TabId;
  label: string;
  activeTab: TabId;
  disabled?: boolean;
  onTabChange: (tab: TabId) => void;
}) {
  const isActive = activeTab === id;
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={isActive}
      onClick={() => onTabChange(id)}
      className={`min-h-11 rounded-2xl border px-4 py-2 text-xs font-black transition-all focus:outline-none focus:ring-2 focus:ring-[#C6A96B]/60 disabled:cursor-not-allowed disabled:opacity-40 ${
        isActive
          ? "bg-[#C6A96B] text-[#020617] border-white/20 shadow-xl"
          : "bg-slate-900/40 text-[#D9CDB7] border-white/10 hover:text-white hover:border-[#C6A96B]/40"
      }`}
    >
      {label}
    </button>
  );
}

function HoroscopeHeader({
  activeTab,
  onTabChange,
  hasResult,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hasResult: boolean;
}) {
  return (
    <header className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div>
          <p className="text-[#C6A96B] text-[10px] sm:text-[11px] font-black tracking-[0.3em] uppercase opacity-80 mb-2">
            PhopePhum Imperial Engine
          </p>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-[#F8F6F1] leading-tight">
            ผังดวงจักรพรรดิ
          </h1>
        </div>
        <div className="hidden sm:flex flex-wrap gap-2" role="tablist" aria-label="Horoscope dashboard views">
          <TabButton id="chart" label="พื้นดวง" activeTab={activeTab} onTabChange={onTabChange} disabled={!hasResult} />
          <TabButton id="analysis" label="วิเคราะห์" activeTab={activeTab} onTabChange={onTabChange} disabled={!hasResult} />
          <TabButton id="calc" label="คำนวณ" activeTab={activeTab} onTabChange={onTabChange} />
        </div>
      </div>
    </header>
  );
}

function HoroscopeSkeleton() {
  return (
    <div className="space-y-4" aria-label="กำลังคำนวณดวงชะตา">
      <div className="h-28 rounded-2xl bg-white/5 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-32 rounded-2xl bg-white/5 animate-pulse" />
        <div className="h-32 rounded-2xl bg-white/5 animate-pulse md:col-span-2" />
      </div>
      <div className="h-72 rounded-2xl bg-white/5 animate-pulse" />
    </div>
  );
}

function HoroscopeEmptyState({
  hasProfileBirthData,
  hasCustomers,
  onOpenCalculator,
}: {
  hasProfileBirthData: boolean;
  hasCustomers: boolean;
  onOpenCalculator: () => void;
}) {
  return (
    <Card className="border-[#C6A96B]/20 bg-[#020617]/70 p-6 sm:p-8 rounded-2xl shadow-2xl">
      <div className="max-w-2xl space-y-5">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#C6A96B]">Ready for calculation</p>
        <h2 className="font-display text-2xl sm:text-3xl font-black text-[#F8F6F1]">เลือกโปรไฟล์หรือกรอกข้อมูลเกิดให้ครบ</h2>
        <p className="text-sm leading-relaxed text-[#D9CDB7]">
          {hasProfileBirthData
            ? "มีข้อมูลเกิดในโปรไฟล์แล้ว แต่ยังไม่มีผลคำนวณพร้อมแสดงผล กรุณาคำนวณอีกครั้งเพื่อสร้างผังดวงล่าสุด"
            : hasCustomers
              ? "เลือกข้อมูลลูกค้าจากฐานข้อมูล หรือกรอกวันเดือนปีเกิด เวลาเกิด และจังหวัดเกิดเพื่อเริ่มผูกดวง"
              : "ยังไม่มีข้อมูลเกิดที่พร้อมใช้งาน กรอกข้อมูลเจ้าชะตาก่อนเพื่อสร้างพื้นดวงและลัคนาจร"}
        </p>
        <Button type="button" onClick={onOpenCalculator} className="rounded-2xl">ไปหน้าคำนวณ</Button>
      </div>
    </Card>
  );
}

function SelectField({ name, label, value, onChange, children }: { name: string; label: string; value: number | string; onChange: (value: number) => void; children: ReactNode; }) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-[10px] font-black text-[#8A8070] uppercase tracking-widest">{label}</label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        className="w-full min-h-12 bg-slate-950 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#C6A96B] focus:ring-2 focus:ring-[#C6A96B]/20"
      >
        {children}
      </select>
    </div>
  );
}

function ProfileSelector({ customers, onSelectCustomer }: { customers: CustomerOption[]; onSelectCustomer: (customerId: string) => void; }) {
  return (
    <div className="border-b border-white/10 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <h2 className="text-base sm:text-lg font-black text-[#C6A96B] font-thai uppercase tracking-widest">ตั้งค่าคำนวณชะตา</h2>
      {customers.length > 0 && (
        <div className="w-full sm:w-72">
          <label htmlFor="profileSelector" className="sr-only">เลือกโปรไฟล์เจ้าชะตา</label>
          <select
            id="profileSelector"
            className="w-full min-h-11 bg-slate-950 border border-white/10 text-[#C6A96B] text-xs rounded-xl px-3 py-2 outline-none focus:border-[#C6A96B] focus:ring-2 focus:ring-[#C6A96B]/20"
            onChange={(event) => onSelectCustomer(event.currentTarget.value)}
          >
            <option value="">เลือกจากฐานข้อมูลลูกค้า...</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

function BirthDataForm(props: {
  birthDay: number; birthMonth: number; birthYear: number; birthTime: string; birthPlace: string; customerName: string;
  onBirthDayChange: (value: number) => void; onBirthMonthChange: (value: number) => void; onBirthYearChange: (value: number) => void;
  onBirthTimeChange: (value: string) => void; onBirthPlaceChange: (value: string) => void; onCustomerNameChange: (value: string) => void;
}) {
  const maxYear = currentBuddhistParts().yearBE + 6;
  return (
    <section className="space-y-5" aria-labelledby="birth-data-title">
      <h3 id="birth-data-title" className="text-[11px] font-black text-[#C6A96B] uppercase tracking-widest">ข้อมูลเกิด</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SelectField name="birthDay" label="วันเกิด" value={props.birthDay} onChange={props.onBirthDayChange}>
          {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
        </SelectField>
        <SelectField name="birthMonth" label="เดือนเกิด" value={props.birthMonth} onChange={props.onBirthMonthChange}>
          {THAI_MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
        </SelectField>
        <SelectField name="birthYear" label="ปีเกิด (พ.ศ.)" value={props.birthYear} onChange={props.onBirthYearChange}>
          {Array.from({ length: 120 }, (_, i) => {
            const year = maxYear - i;
            return <option key={year} value={year}>{year}</option>;
          })}
        </SelectField>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input name="birthTime" type="time" label="เวลาเกิด" value={props.birthTime} onChange={(event) => props.onBirthTimeChange(event.currentTarget.value)} />
        <Input name="birthPlace" label="จังหวัดเกิด" value={props.birthPlace} onChange={(event) => props.onBirthPlaceChange(event.currentTarget.value)} placeholder="เช่น กรุงเทพมหานคร" />
      </div>
      <Input name="customerName" label="ชื่อเจ้าชะตา" value={props.customerName} onChange={(event) => props.onCustomerNameChange(event.currentTarget.value)} placeholder="ระบุชื่อเพื่อบันทึกประวัติ" />
    </section>
  );
}

function TransitDateForm(props: {
  transitDay: number; transitMonth: number; transitYear: number; transitTime: string;
  onTransitDayChange: (value: number) => void; onTransitMonthChange: (value: number) => void; onTransitYearChange: (value: number) => void; onTransitTimeChange: (value: string) => void;
}) {
  const currentYear = currentBuddhistParts().yearBE;
  return (
    <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5" aria-labelledby="transit-date-title">
      <h3 id="transit-date-title" className="text-[11px] font-black text-[#C6A96B] uppercase tracking-widest">วันจรที่ต้องการตรวจ</h3>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <SelectField name="transitDay" label="วัน" value={props.transitDay} onChange={props.onTransitDayChange}>{Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</SelectField>
        <SelectField name="transitMonth" label="เดือน" value={props.transitMonth} onChange={props.onTransitMonthChange}>{THAI_MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</SelectField>
        <SelectField name="transitYear" label="ปี (พ.ศ.)" value={props.transitYear} onChange={props.onTransitYearChange}>{Array.from({ length: 12 }, (_, i) => { const year = currentYear - 5 + i; return <option key={year} value={year}>{year}</option>; })}</SelectField>
        <Input name="transitTime" type="time" label="เวลา" value={props.transitTime} onChange={(event) => props.onTransitTimeChange(event.currentTarget.value)} />
      </div>
    </section>
  );
}

function TogglePill({ active, onClick, label, activeClass }: { active: boolean; onClick: () => void; label: string; activeClass: string; }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-10 rounded-full border px-4 py-2 text-[11px] font-black transition-all focus:outline-none focus:ring-2 focus:ring-[#C6A96B]/50 ${active ? `${activeClass} border-white/20 shadow-lg` : "bg-slate-950/40 text-[#D9CDB7] border-white/10"}`}>
      {label}
    </button>
  );
}

function TransitControls(props: {
  showVayaRanges: boolean; showNatalLagna: boolean; showTransitLagna: boolean;
  onToggleVayaRanges: () => void; onToggleNatalLagna: () => void; onToggleTransitLagna: () => void;
}) {
  return (
    <Card className="border-[#C6A96B]/20 bg-slate-900/40 p-4 sm:p-5 rounded-2xl">
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-center">
        <h3 className="text-[10px] font-black text-[#C6A96B] uppercase tracking-widest sm:mr-2">Transit Filters</h3>
        <TogglePill active={props.showVayaRanges} onClick={props.onToggleVayaRanges} label="ช่วงอายุวัยจร" activeClass="bg-amber-500 text-white" />
        <TogglePill active={props.showNatalLagna} onClick={props.onToggleNatalLagna} label="ลัคนาเกิด" activeClass="bg-[#C6A96B] text-[#020617]" />
        <TogglePill active={props.showTransitLagna} onClick={props.onToggleTransitLagna} label="ลัคนาจร" activeClass="bg-sky-500 text-white" />
      </div>
    </Card>
  );
}

function MobileStickyActions({ activeTab, hasResult, isLoading, onTabChange }: { activeTab: TabId; hasResult: boolean; isLoading: boolean; onTabChange: (tab: TabId) => void; }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#C6A96B]/20 bg-[#020617]/95 px-3 py-3 backdrop-blur-xl sm:hidden">
      <div className="grid grid-cols-3 gap-2">
        <TabButton id="chart" label="พื้นดวง" activeTab={activeTab} onTabChange={onTabChange} disabled={!hasResult} />
        <TabButton id="analysis" label="วิเคราะห์" activeTab={activeTab} onTabChange={onTabChange} disabled={!hasResult} />
        {activeTab === "calc" ? (
          <button type="submit" form="horoscope-form" disabled={isLoading} className="min-h-11 rounded-2xl bg-[#C6A96B] px-3 py-2 text-xs font-black text-[#020617] disabled:opacity-50">คำนวณ</button>
        ) : (
          <TabButton id="calc" label="คำนวณ" activeTab={activeTab} onTabChange={onTabChange} />
        )}
      </div>
    </div>
  );
}

export default function HoroscopePage() {
  const { profile, customers, initialResult } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as HoroscopeActionResult | undefined;
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";
  const initialBirthParts = isoDateToBuddhistParts(profile?.birth_date) ?? { day: 15, month: 6, yearBE: 2530 };
  const initialTransitParts = currentBuddhistParts();

  const [activeTab, setActiveTab] = useState<"chart" | "analysis" | "calc">("chart");
  const [activeResult, setActiveResult] = useState<HoroscopeActionResult | null>(initialResult);
  const [birthDay, setBirthDay] = useState(initialBirthParts.day);
  const [birthMonth, setBirthMonth] = useState(initialBirthParts.month);
  const [birthYear, setBirthYear] = useState(initialBirthParts.yearBE);
  const [birthTime, setBirthTime] = useState(profile?.birth_time?.substring(0, 5) || "12:00");
  const [birthPlace, setBirthPlace] = useState(profile?.birth_place || "");
  const [customerName, setCustomerName] = useState(profile?.display_name || profile?.full_name || "");
  const [transitDay, setTransitDay] = useState(initialTransitParts.day);
  const [transitMonth, setTransitMonth] = useState(initialTransitParts.month);
  const [transitYear, setTransitYear] = useState(initialTransitParts.yearBE);
  const [transitTime, setTransitTime] = useState("12:00");
  const [showVayaRanges, setShowVayaRanges] = useState(false);
  const [showNatalLagna, setShowNatalLagna] = useState(true);
  const [showTransitLagna, setShowTransitLagna] = useState(true);

  useEffect(() => {
    if (actionData && !actionData.error) {
      setActiveResult(actionData);
      setActiveTab("chart");
    }
  }, [actionData]);

  const customerOptions = customers as CustomerOption[];
  const handleCustomerSelect = (customerId: string) => {
    const selected = customerOptions.find((customer) => customer.id === customerId);
    if (!selected) return;
    const parts = isoDateToBuddhistParts(selected.birth_date);
    if (parts) {
      setBirthDay(parts.day);
      setBirthMonth(parts.month);
      setBirthYear(parts.yearBE);
    }
    setBirthTime(selected.birth_time?.substring(0, 5) || "12:00");
    setBirthPlace(selected.birth_place || "");
    setCustomerName(selected.name);
  };

  return (
    <div className="space-y-6 sm:space-y-10 max-w-6xl pb-36 animate-fade-in">
      <HoroscopeHeader activeTab={activeTab} onTabChange={setActiveTab} hasResult={Boolean(activeResult)} />

      {isLoading && <HoroscopeSkeleton />}

      {!isLoading && activeTab !== "calc" && !activeResult && (
        <HoroscopeEmptyState
          hasProfileBirthData={Boolean(profile?.birth_date)}
          hasCustomers={customerOptions.length > 0}
          onOpenCalculator={() => setActiveTab("calc")}
        />
      )}

      {!isLoading && activeTab === "chart" && activeResult && activeResult.matrix && (
        <div className="space-y-6 sm:space-y-10 animate-in fade-in duration-700">
          <WisdomBirthGuidanceCard profile={profile} activeResult={activeResult} lunar={activeResult.phopephumResult?.lunar} />
          <SummaryParagraph activeResult={activeResult} />
          <TransitControls
            showVayaRanges={showVayaRanges}
            showNatalLagna={showNatalLagna}
            showTransitLagna={showTransitLagna}
            onToggleVayaRanges={() => setShowVayaRanges((value) => !value)}
            onToggleNatalLagna={() => setShowNatalLagna((value) => !value)}
            onToggleTransitLagna={() => setShowTransitLagna((value) => !value)}
          />
          <FateMatrixPanel
            matrix={activeResult.matrix}
            onNumClick={() => {}}
            phopephumResult={activeResult.phopephumResult}
            showVayaRanges={showVayaRanges}
            showNatalLagna={showNatalLagna}
            showTransitLagna={showTransitLagna}
          />
        </div>
      )}

      {!isLoading && activeTab === "analysis" && activeResult && (
        <div className="space-y-6 sm:space-y-10 animate-in fade-in duration-700">
          <details className="group" open>
            <summary className="cursor-pointer list-none rounded-2xl border border-[#C6A96B]/20 bg-slate-900/50 px-5 py-4 text-sm font-black text-[#C6A96B] focus:outline-none focus:ring-2 focus:ring-[#C6A96B]/50">
              บทวิเคราะห์เชิงลึก
            </summary>
            <DetailedGuidancePanel />
          </details>
          <NatalInfoPanel activeResult={activeResult} />
          <ComparisonCard activeResult={activeResult} />
        </div>
      )}

      {activeTab === "calc" && (
        <div className="max-w-3xl mx-auto animate-in zoom-in duration-500">
          <Card className="border-[#C6A96B]/30 bg-slate-900/60 p-5 sm:p-8 lg:p-10 rounded-2xl sm:rounded-[2rem] shadow-2xl">
            <Form id="horoscope-form" method="post" className="space-y-8">
              <ProfileSelector customers={customerOptions} onSelectCustomer={handleCustomerSelect} />

              {actionData?.error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold text-center" role="alert">
                  {actionData.error}
                </div>
              )}

              <BirthDataForm
                birthDay={birthDay}
                birthMonth={birthMonth}
                birthYear={birthYear}
                birthTime={birthTime}
                birthPlace={birthPlace}
                customerName={customerName}
                onBirthDayChange={setBirthDay}
                onBirthMonthChange={setBirthMonth}
                onBirthYearChange={setBirthYear}
                onBirthTimeChange={setBirthTime}
                onBirthPlaceChange={setBirthPlace}
                onCustomerNameChange={setCustomerName}
              />

              <TransitDateForm
                transitDay={transitDay}
                transitMonth={transitMonth}
                transitYear={transitYear}
                transitTime={transitTime}
                onTransitDayChange={setTransitDay}
                onTransitMonthChange={setTransitMonth}
                onTransitYearChange={setTransitYear}
                onTransitTimeChange={setTransitTime}
              />

              <Button type="submit" loading={isLoading} className="w-full min-h-14 sm:h-16 rounded-2xl text-sm sm:text-lg font-black tracking-[0.08em] sm:tracking-[0.2em]">
                ผูกดวงชะตาจักรพรรดิ
              </Button>
            </Form>
          </Card>
        </div>
      )}

      <MobileStickyActions activeTab={activeTab} hasResult={Boolean(activeResult)} isLoading={isLoading} onTabChange={setActiveTab} />
    </div>
  );
}

function LegacyHoroscopePage() {
  const { profile, history, customers, initialResult } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";
  const [activeTab, setActiveTab] = useState<"calc" | "chart" | "analysis">("chart");
  const [activeResult, setActiveResult] = useState<any>(actionData || initialResult);
  const [showVayaRanges, setShowVayaRanges] = useState(false);
  const [showNatalLagna, setShowNatalLagna] = useState(true);
  const [showTransitLagna, setShowTransitLagna] = useState(true);

  useEffect(() => { 
    if (actionData && !actionData.error) {
      setActiveResult(actionData);
      setActiveTab("chart");
    }
  }, [actionData]);

  useEffect(() => { if (!activeResult) setActiveTab("calc"); }, [activeResult]);

  return (
    <div className="space-y-10 max-w-6xl pb-32 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <p className="text-[#C6A96B] text-[11px] font-black tracking-[0.4em] uppercase opacity-80 mb-2">PhopePhum Imperial Engine</p>
           <h1 className="font-display text-5xl font-black text-[#F8F6F1] tracking-tighter">ผังดวงจักรพรรดิ</h1>
        </div>
        <div className="flex gap-3">
          {[
            { id: "chart", label: "1. พื้นดวง", icon: "🔮" },
            { id: "analysis", label: "2. วิเคราะห์ชะตา", icon: "📜" },
            { id: "calc", label: "3. คำนวณชะตา", icon: "📝" },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`px-6 py-3 rounded-[1.5rem] border font-black text-xs transition-all ${activeTab === t.id ? "bg-[#C6A96B] text-[#020617] border-white/20 shadow-xl" : "bg-slate-900/40 text-[#8A8070] border-white/5 hover:text-white"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </header>

      {activeTab === "chart" && activeResult && (
        <div className="space-y-10 animate-in fade-in duration-700">
           <WisdomBirthGuidanceCard profile={profile} activeResult={activeResult} lunar={activeResult.phopephumResult?.lunar} />
           
           <Card className="border-[#C6A96B]/20 bg-slate-900/40 p-6 rounded-[2rem]">
              <div className="flex flex-wrap gap-4 items-center">
                 <h3 className="text-[10px] font-black text-[#C6A96B] uppercase tracking-widest mr-4">Transit Filters:</h3>
                 <button onClick={() => setShowVayaRanges(!showVayaRanges)} className={`px-5 py-2 rounded-full border text-[11px] font-black transition-all ${showVayaRanges ? "bg-amber-500 text-white border-white/20 shadow-lg" : "bg-slate-950/40 text-[#8A8070] border-white/5"}`}>📊 ช่วงอายุวัยจร</button>
                 <button onClick={() => setShowNatalLagna(!showNatalLagna)} className={`px-5 py-2 rounded-full border text-[11px] font-black transition-all ${showNatalLagna ? "bg-[#C6A96B] text-[#020617] border-white/20" : "bg-slate-950/40 text-[#8A8070] border-white/5"}`}>ลัคนาเกิด</button>
                 <button onClick={() => setShowTransitLagna(!showTransitLagna)} className={`px-5 py-2 rounded-full border text-[11px] font-black transition-all ${showTransitLagna ? "bg-sky-500 text-white border-white/20" : "bg-slate-950/40 text-[#8A8070] border-white/5"}`}>ลัคนาจร</button>
                 <button className="px-5 py-2 rounded-full bg-slate-950/40 text-[#8A8070] border border-white/5 text-[11px] font-black cursor-not-allowed opacity-50">⏳ กาลชะตา (3.45น.)</button>
              </div>
           </Card>

           <FateMatrixPanel 
             matrix={activeResult.matrix} 
             onNumClick={() => {}} 
             phopephumResult={activeResult.phopephumResult} 
             showVayaRanges={showVayaRanges} 
             showNatalLagna={showNatalLagna}
             showTransitLagna={showTransitLagna}
           />
           
           <DetailedGuidancePanel />
           
           <SummaryParagraph activeResult={activeResult} />
           
           <NatalInfoPanel activeResult={activeResult} />
           
           <ComparisonCard activeResult={activeResult} />
        </div>
      )}

      {activeTab === "calc" && (
        <div className="max-w-3xl mx-auto animate-in zoom-in duration-500">
           <Card className="border-[#C6A96B]/30 bg-slate-900/60 p-10 rounded-[3rem] shadow-2xl">
              <Form method="post" className="space-y-10">
                 <div className="space-y-8">
                    <div className="border-b border-white/10 pb-4 flex justify-between items-center">
                       <h3 className="text-lg font-black text-[#C6A96B] font-thai uppercase tracking-widest">ตั้งค่าคำนวณชะตา</h3>
                       {customers?.length > 0 && (
                         <select 
                           className="bg-slate-900 border border-white/10 text-[#C6A96B] text-[10px] rounded px-2 py-1 outline-none"
                           onChange={(e) => {
                             const c = customers.find(c => c.id === e.target.value);
                             if (c) {
                               const [by, bm, bd] = c.birth_date.split("-").map(Number);
                               (document.querySelector('select[name="birthDay"]') as any).value = bd;
                               (document.querySelector('select[name="birthMonth"]') as any).value = bm;
                               (document.querySelector('select[name="birthYear"]') as any).value = by + 543;
                               (document.querySelector('input[name="birthTime"]') as any).value = c.birth_time?.substring(0,5) || "12:00";
                               (document.querySelector('input[name="customerName"]') as any).value = c.name;
                             }
                           }}
                         >
                           <option value="">เลือกจากฐานข้อมูลลูกค้า...</option>
                           {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                       )}
                    </div>

                    {actionData?.error && (
                      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold text-center animate-shake">
                        ⚠️ {actionData.error}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-[#8A8070] uppercase tracking-widest">วันเกิด</label>
                         <select name="birthDay" className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white text-sm outline-none">
                           {Array.from({length:31},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}
                         </select>
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-[#8A8070] uppercase tracking-widest">เดือนเกิด</label>
                         <select name="birthMonth" className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white text-sm outline-none">
                           {["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"].map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                         </select>
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-[#8A8070] uppercase tracking-widest">ปีเกิด (พ.ศ.)</label>
                         <select name="birthYear" defaultValue={2530} className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white text-sm outline-none">
                           {Array.from({length:100},(_,i)=><option key={2575-i} value={2575-i}>{2575-i}</option>)}
                         </select>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <Input name="birthTime" type="time" label="เวลาเกิด" defaultValue="12:00" />
                       <Input name="customerName" label="ชื่อเจ้าชะตา" placeholder="ระบุชื่อเพื่อบันทึก..." />
                    </div>
                 </div>
                 <div className="pt-6">
                    <Button type="submit" loading={isLoading} className="w-full h-16 rounded-[2rem] text-lg font-black tracking-[0.2em]">ผูกดวงชะตาจักรพรรดิ ➔</Button>
                 </div>
              </Form>
           </Card>
        </div>
      )}
    </div>
  );
}
