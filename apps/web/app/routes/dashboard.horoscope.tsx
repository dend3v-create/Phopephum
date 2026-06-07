import { json } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, useLoaderData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireMinPlan, getProfile, requireAuth, canAccess } from "~/services/auth.server";
import { logEvent, EVENTS } from "~/services/analytics.server";

import {
  horoscopeEngine,
  calculatePhopephum,
  calculateWisdomTaksa,
  getYamPrediction,
  DAY_NAMES_THAI,
  calcTaksaMaha,
  buddhToCS,
  STAR_NAMES,
  calculateLagnaNakshatra,
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
  const { user, profile } = await requireMinPlan("basic", request, env);

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

  // 3. ดึงรายชื่อลูกค้าที่บันทึกไว้
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // 3. คำนวณผลลัพธ์เริ่มต้นหากมีข้อมูลวันเกิดในโปรไฟล์
  let initialResult = null;
  if (profile?.birth_date) {
    try {
      const birthDateObj = new Date(profile.birth_date);
      const [bh, bm] = (profile.birth_time || "12:00").split(":");
      birthDateObj.setHours(parseInt(bh, 10), parseInt(bm, 10), 0);
      const birthYamResult = getYamPrediction(birthDateObj);

      const phopephumResult = await calculatePhopephum({
        birthDate: profile.birth_date,
        birthTime: profile.birth_time || "12:00",
        birthPlace: profile.birth_place || "กรุงเทพมหานคร",
      }, new Date());

      initialResult = {
        phopephumResult,
        matrix: phopephumResult.nineBase.bases,
        taksaMaha: {
          taksaNatal: phopephumResult.taksaNatal,
          taksaTransit: phopephumResult.taksaTransit,
          mahaNatal: phopephumResult.mahaNatal,
          mahaTransit: phopephumResult.mahaTransit,
          elementPairFlags: phopephumResult.crossCheck.elementPairFlags,
          alerts: phopephumResult.crossCheck.alerts,
        },
        birthDate: profile.birth_date,
        transitDate: new Date().toISOString().split("T")[0],
        transitTime: "12:00",
        lagnaNakshatra: calculateLagnaNakshatra(profile.birth_date, profile.birth_time || "12:00"),
        birthYamResult,
      };
    } catch (e) {
      console.error("Initial load calculation error:", e);
    }
  }

  return json({
    profile,
    reports: reports ?? [],
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

    const bDateObj = new Date(parsed.data.birthDate);
    const [bh, bm] = (parsed.data.birthTime || "12:00").split(":");
    bDateObj.setHours(parseInt(bh, 10), parseInt(bm, 10), 0);
    const birthYamResult = getYamPrediction(bDateObj);

    const phopephumResult = await calculatePhopephum(parsed.data, checkDate);

    // ── 2. Legacy Support (Maintain UI compatibility) ──
    const baseResult = await horoscopeEngine({
      birthDate: parsed.data.birthDate,
      birthTime: parsed.data.birthTime ?? "00:00",
      province: parsed.data.birthPlace ?? "กรุงเทพมหานคร",
    });
    const matrix = phopephumResult.nineBase.bases;
    const taksaResult = calculateWisdomTaksa(phopephumResult.nineBase.bases[0][0], phopephumResult.taksaTransit.ageYang);

    // ── 3. Save to History (New calculations table) ──
    const ownerName = String(formData.get("customerName") ?? "").trim() || user.email || "ไม่ระบุ";
    
    await supabase.from("calculations").insert({
      user_id: user.id,
      calc_type: "phopephum_v2",
      input_data: { 
        name: ownerName,
        birthDate: parsed.data.birthDate, 
        birthTime: parsed.data.birthTime,
        checkDate: checkDate.toISOString() 
      },
      result_data: phopephumResult,
    });

    // ── 4. Save Customer if requested ──
    const isSaveCustomer = formData.get("saveCustomer") === "on";
    const customerName = String(formData.get("customerName") ?? "").trim();
    if (isSaveCustomer && customerName) {
      await supabase.from("customers").insert({
        user_id: user.id,
        name: customerName,
        birth_date: parsed.data.birthDate,
        birth_time: parsed.data.birthTime,
        birth_place: parsed.data.birthPlace,
      });
    }

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
      lagnaNakshatra: calculateLagnaNakshatra(parsed.data.birthDate, parsed.data.birthTime || "12:00"),
      birthYamResult,
      error: null,
    });
  } catch (err) {
    console.error("Horoscope Action Error:", err);
    return json({ error: "เกิดข้อผิดพลาดในการคำนวณชะตาชีวิต กรุณาตรวจสอบข้อมูลวันเดือนปีเกิดอีกครั้ง", result: null }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// New Refactored Components
// ─────────────────────────────────────────────────────────────────────────────

function WisdomBirthGuidanceCard({ profile, activeResult, lunar }: { profile: any, activeResult: any, lunar: any }) {
  const birthDateThai = activeResult?.birthDate 
    ? new Date(activeResult.birthDate).getFullYear() + 543 
    : (profile?.birth_date ? new Date(profile.birth_date).getFullYear() + 543 : null);
  
  const birthDay = activeResult?.birthDate 
    ? new Date(activeResult.birthDate).getDate() 
    : (profile?.birth_date ? new Date(profile.birth_date).getDate() : null);
    
  const birthMonth = activeResult?.birthDate 
    ? new Date(activeResult.birthDate).getMonth() + 1 
    : (profile?.birth_date ? new Date(profile.birth_date).getMonth() + 1 : null);

  const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const birthDateText = birthDay && birthMonth && birthDateThai 
    ? `${birthDay} ${monthNames[birthMonth - 1]} พ.ศ. ${birthDateThai}` 
    : "—";

  const isWaxing = lunar?.moonPhase?.includes("ขึ้น");
  const moonPhaseText = lunar?.moonPhase || "—";
  const match = lunar?.moonPhase?.match(/\d+/);
  const lunarDay = match ? parseInt(match[0], 10) : 1;
  const brightness = isWaxing ? Math.round((lunarDay / 15) * 100) : Math.round(((15 - lunarDay) / 15) * 100);

  const transitDateObj = activeResult?.transitDate ? new Date(activeResult.transitDate) : new Date();
  const tDateThai = transitDateObj.getFullYear() + 543;
  const tDay = transitDateObj.getDate();
  const tMonth = transitDateObj.getMonth() + 1;
  const transitDateText = `${tDay} ${monthNames[tMonth - 1]} ${tDateThai}`;

  // Lunar Birth
  const natalLunar = activeResult?.phopephumResult?.nineBase?.lunarDate?.thaiDateText || activeResult?.lunar?.thaiDateText || "—";
  const currentAge = activeResult?.phopephumResult?.taksaTransit?.ageYang || 0;

  return (
    <Card className="border-[#C6A96B]/20 bg-gradient-to-br from-[#0A2240]/80 to-[#020617]/90 backdrop-blur-xl p-5 relative overflow-hidden shadow-2xl rounded-2xl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#C6A96B]/10 rounded-full blur-3xl -z-10" />
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3 border-b border-[#C6A96B]/20 pb-3">
            <div className="text-[#C6A96B] text-xl">⚜️</div>
            <div>
              <h3 className="font-display font-bold text-[#C6A96B] text-xs tracking-[0.2em] uppercase">
                WISDOM BIRTH GUIDANCE · ภูมิปัญญาพื้นดวงชะตา
              </h3>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-[#F8F6F1]">ดวงชะตาของ คุณ {profile?.display_name ?? profile?.full_name ?? profile?.username ?? "ไม่ระบุ"}</h2>
              <p className="text-xs text-[#8A8070] mt-1">ประจำวันที่ {transitDateText}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#C6A96B] border-b border-white/10 pb-1 inline-block">ข้อมูลการถือกำเนิด</p>
                <div className="space-y-1 text-sm text-[#F8F6F1]">
                  <p><span className="text-[#8A8070]">วันเกิด:</span> {birthDateText}</p>
                  <p><span className="text-[#8A8070]">เวลาเกิด:</span> {activeResult?.phopephumResult?.input_data?.birthTime ?? profile?.birth_time ?? "—"} น.</p>
                  <p><span className="text-[#8A8070]">จังหวัดเกิด:</span> {activeResult?.phopephumResult?.input_data?.birthPlace ?? profile?.birth_place ?? "—"}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#C6A96B] border-b border-white/10 pb-1 inline-block">ปฏิทินจันทรคติและสัจจะอายุ</p>
                <div className="space-y-1 text-sm text-[#F8F6F1]">
                  <p><span className="text-[#8A8070]">วันจันทรคติเกิด:</span> {natalLunar}</p>
                  <p><span className="text-[#8A8070]">อายุย่างปีนี้:</span> <span className="font-bold text-[#C6A96B]">{currentAge} ปี</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-64 shrink-0">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-[#C6A96B]/20 h-full flex flex-col items-center justify-center text-center">
            <p className="text-[10px] text-[#8A8070] uppercase font-bold mb-2 tracking-widest">จันทรคติจรปัจจุบัน</p>
            <div className="text-4xl mb-2">{isWaxing ? "🌕" : "🌑"}</div>
            <p className="text-[#F8F6F1] font-bold text-sm">{moonPhaseText}</p>
            <p className="text-xs text-[#8A8070] mt-1 italic leading-tight">
              ({isWaxing ? "ช่วงเวลาแห่งการเติบโตและสะสมพลังงาน" : "จุดเริ่มต้น - ปลูกเมล็ดพันธุ์แห่งความตั้งใจใหม่"})
            </p>
            <div className="mt-3 w-full bg-slate-950/60 rounded-full h-1.5 overflow-hidden border border-white/5">
              <div className="bg-[#C6A96B] h-full transition-all duration-500 shadow-[0_0_10px_#C6A96B]" style={{ width: `${brightness}%` }} />
            </div>
            <p className="text-[10px] text-[#C6A96B] mt-1 font-bold">ความสว่าง {brightness}%</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ComparisonCard({ activeResult }: { activeResult: any }) {
  const natal = activeResult?.phopephumResult?.lagna;
  const transit = activeResult?.phopephumResult?.lagnaTransit;
  const nakshatra = activeResult?.lagnaNakshatra;
  const yam = activeResult?.birthYamResult?.yam;

  if (!natal && !transit) return null;

  return (
    <Card className="border-[#C6A96B]/20 bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl md:col-span-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-white/5 pb-3">
        <h3 className="text-xs font-bold text-[#C6A96B] uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#C6A96B] animate-pulse" />
          วิเคราะห์จุดเจ้าชะตา: ลัคนากำเนิด VS ลัคนาจร
        </h3>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ลัคนากำเนิด */}
        <div className="space-y-3 p-4 rounded-xl bg-slate-950/40 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#C6A96B]/10 rounded-full blur-2xl -z-10" />
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <div className="w-6 h-6 rounded-full bg-[#C6A96B] text-[#020617] text-[10px] font-bold flex items-center justify-center">ล</div>
            <span className="text-xs font-bold text-[#F8F6F1]">ลัคนากำเนิด (Natal Lagna)</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] items-center">
              <span className="text-[#8A8070]">ตำแหน่งบนผังดวง</span>
              <span className="text-[#F8F6F1] font-bold px-2 py-0.5 rounded bg-white/5">{natal ? `ฐาน ${natal.row} ช่อง ${natal.col}` : "—"}</span>
            </div>
            <div className="flex justify-between text-[11px] items-center">
              <span className="text-[#8A8070]">ดาวครองลัคนา</span>
              <span className="text-[#C6A96B] font-bold text-base">{natal ? `${natal.star}` : "—"}</span>
            </div>
            <div className="flex justify-between text-[11px] items-center">
              <span className="text-[#8A8070]">ชื่อดาว</span>
              <span className="text-[#F8F6F1]">{natal ? STAR_NAMES[natal.star as StarNumber] : "—"}</span>
            </div>
          </div>
        </div>

        {/* ลัคนาจร */}
        <div className="space-y-3 p-4 rounded-xl bg-slate-950/40 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -z-10" />
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <div className="w-6 h-6 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border border-red-400">ลอ</div>
            <span className="text-xs font-bold text-[#F8F6F1]">ลัคนาจร (Transit Lagna)</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] items-center">
              <span className="text-[#8A8070]">ตำแหน่งปัจจุบัน</span>
              <span className="text-[#F8F6F1] font-bold px-2 py-0.5 rounded bg-white/5">{transit ? `ฐาน ${transit.row} ช่อง ${transit.col}` : "—"}</span>
            </div>
            <div className="flex justify-between text-[11px] items-center">
              <span className="text-[#8A8070]">ดาวครองลัคนาจร</span>
              <span className="text-red-400 font-bold text-base">{transit ? `${transit.star}` : "—"}</span>
            </div>
            <div className="flex justify-between text-[11px] items-center">
              <span className="text-[#8A8070]">ชื่อดาว</span>
              <span className="text-[#F8F6F1]">{transit ? STAR_NAMES[transit.star as StarNumber] : "—"}</span>
            </div>
          </div>
        </div>

        {/* ฤกษ์และยามกำเนิด */}
        <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-[#0A2240]/40 to-[#020617]/60 border border-sky-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl -z-10" />
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <span className="text-base">⏳</span>
            <span className="text-xs font-bold text-sky-400">ฤกษ์และยามกำเนิด</span>
          </div>
          <div className="space-y-3">
            {nakshatra ? (
              <div>
                <p className="text-[10px] text-[#8A8070] mb-1">นักษัตรฤกษ์ที่เกาะ</p>
                <p className="text-xs text-[#F8F6F1] font-bold leading-tight">{nakshatra.name} ({nakshatra.category})</p>
                <p className="text-[9px] text-[#8A8070] mt-1">{nakshatra.meaning}</p>
              </div>
            ) : null}
            {yam ? (
              <div>
                <p className="text-[10px] text-[#8A8070] mb-1">ยามเวลาเกิด</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded font-bold">ยาม {yam.name}</span>
                  <span className="text-[10px] text-[#8A8070]">({yam.type})</span>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-[#8A8070] italic">ไม่พบข้อมูลเวลาเกิดที่ระบุแน่ชัด</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function DynamicExplanationBox({ activeResult }: { activeResult: any }) {
  const currentAge = activeResult?.phopephumResult?.taksaTransit?.ageYang ?? 0;
  const yearlyJornPhop = activeResult?.phopephumResult?.yearlyJorn?.phopName ?? "—";
  const yearlyJornStar = activeResult?.phopephumResult?.yearlyJorn?.star ?? "—";

  return (
    <div className="p-4 rounded-2xl bg-[#C6A96B]/5 border border-[#C6A96B]/20 mt-4">
      <p className="text-sm text-[#F8F6F1] leading-relaxed">
        <span className="text-[#C6A96B] font-bold">วิเคราะห์สถานะปัจจุบัน:</span> ปัจจุบันอายุย่าง <span className="font-bold underline text-[#C6A96B]">{currentAge} ปี</span> 
        ปีจรตกภพ <span className="font-bold text-[#C6A96B]">{yearlyJornPhop}</span> 
        ครองด้วยดาว <span className="font-bold text-[#C6A96B]">{yearlyJornStar} ({STAR_NAMES[yearlyJornStar as StarNumber] ?? "—"})</span> 
        พลังงานชีวิตในปีนี้ขับเคลื่อนด้วยอิทธิพลของภพเรือนและดวงดาวดังกล่าวเป็นเกณฑ์หลัก
      </p>
    </div>
  );
}

function SummaryParagraph({ activeResult }: { activeResult: any }) {
  const currentAge = activeResult?.phopephumResult?.taksaTransit?.ageYang ?? 0;
  const taksaSri = activeResult?.phopephumResult?.taksaTransit?.map ? Object.entries(activeResult.phopephumResult.taksaTransit.map).find(([_, bhop]) => bhop === "ศรี")?.[0] : null;
  const taksaKala = activeResult?.phopephumResult?.taksaTransit?.map ? Object.entries(activeResult.phopephumResult.taksaTransit.map).find(([_, bhop]) => bhop === "กาลกิณี")?.[0] : null;

  return (
    <Card className="border-[#C6A96B]/20 bg-gradient-to-br from-[#0A2240]/40 to-[#020617]/60 p-5 rounded-2xl">
      <p className="text-sm text-[#F8F6F1] leading-relaxed">
        <span className="text-xl mr-2">✨</span>
        ในวัยย่าง <span className="font-bold text-[#C6A96B]">{currentAge} ปี</span> นี้ 
        วิถีชะตาของคุณถูกกำหนดด้วยทักษาจรที่มีดาว <span className="font-bold text-emerald-400">{taksaSri ?? "—"} เป็นศรีจร</span> นำพาโชคลาภและการสนับสนุน 
        ในขณะที่ควรระมัดระวังดาว <span className="font-bold text-rose-400">{taksaKala ?? "—"} ที่เป็นกาลกิณีจร</span> 
        ภาพรวมชะตาในปีนี้เน้นการสร้างรากฐานและการจัดการปัญหาที่ค้างคาเพื่อให้เกิดความมั่นคงในระยะยาว
      </p>
    </Card>
  );
}

function DateDropdowns({ prefix, defaultDay, defaultMonth, defaultYear, onChange }: { prefix: string, defaultDay: number, defaultMonth: number, defaultYear: number, onChange?: any }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      <select name={`${prefix}Day`} onChange={onChange} defaultValue={defaultDay} className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-2.5 py-2.5 text-xs focus:border-[#C9A96E]/50 outline-none">
        {Array.from({ length: 31 }).map((_, i) => (
          <option key={i + 1} value={i + 1} className="bg-[#020617]">{i + 1}</option>
        ))}
      </select>
      <select name={`${prefix}Month`} onChange={onChange} defaultValue={defaultMonth} className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-2.5 py-2.5 text-xs focus:border-[#C9A96E]/50 outline-none">
        {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => (
          <option key={i + 1} value={i + 1} className="bg-[#020617]">{m}</option>
        ))}
      </select>
      <select name={`${prefix}Year`} onChange={onChange} defaultValue={defaultYear} className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-2.5 py-2.5 text-xs focus:border-[#C9A96E]/50 outline-none">
        {Array.from({ length: 150 }).map((_, i) => {
          const y = new Date().getFullYear() + 543 + 10 - i;
          return <option key={y} value={y} className="bg-[#020617]">{y}</option>;
        })}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Legend & Base 4 Effect Panels
// ─────────────────────────────────────────────────────────────────────────────

function LegendPanel() {
  return (
    <div className="mt-6 p-4 rounded-2xl bg-slate-900/40 border border-white/5">
      <h4 className="text-[10px] font-bold text-[#C6A96B] uppercase tracking-widest mb-3 flex items-center gap-2">
        <span className="text-base">📋</span> คำอธิบายสัญลักษณ์ (Legend)
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C6A96B] animate-pulse shadow-[0_0_5px_#C6A96B]"></span>
          <span className="text-xs text-[#8A8070]">ดาววัยจร</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4B6FAE] shadow-[0_0_5px_#4B6FAE]"></span>
          <span className="text-xs text-[#8A8070]">ดาวปีจร</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_5px_#f59e0b]"></span>
          <span className="text-xs text-[#8A8070]">ดาวเดือนจร</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_5px_#f43f5e]"></span>
          <span className="text-xs text-[#8A8070]">ดาววันจร</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold bg-[#C6A96B] text-black px-1.5 py-0.5 rounded-full border border-black/20">ล</span>
          <span className="text-xs text-[#8A8070]">ลัคนากำเนิด</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full border border-red-400">ลอ</span>
          <span className="text-xs text-[#8A8070]">ลัคนาจร</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold bg-sky-500 text-white px-1.5 py-0.5 rounded-full border border-sky-400">ลจ</span>
          <span className="text-xs text-[#8A8070]">ลัคนาจรปัจจุบัน</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-bold text-amber-400">✨ ย้ำ</span>
          <span className="text-xs text-[#8A8070]">ดาวย้ำ (พลังงานทวีคูณ)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full ring-1 ring-[#C6A96B] flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C6A96B]"></span>
          </span>
          <span className="text-xs text-[#8A8070]">ฐาน 4 (กำลังเทวดา)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500 text-white font-bold">ศรี</span>
          <span className="text-xs text-[#8A8070]">ทักษาจร (มงคล/โชคลาภ)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500 text-white font-bold">กาลี</span>
          <span className="text-xs text-[#8A8070]">ทักษาจร (อุปสรรค)</span>
        </div>
      </div>
    </div>
  );
}

function Base4EffectPanel({ activeResult }: { activeResult: any }) {
  const matrix = activeResult?.matrix;
  
  // หาตัวเลขที่ซ้ำในฐาน 1-3
  let repeatedStars: number[] = [];
  if (matrix) {
    const counts = new Array(8).fill(0);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 7; c++) {
        const val = matrix[r][c];
        if (val >= 1 && val <= 7) counts[val]++;
      }
    }
    repeatedStars = counts.map((v, i) => v > 1 ? i : 0).filter(v => v !== 0);
  }

  return (
    <Card className="mt-6 border-[#C6A96B]/20 bg-gradient-to-br from-[#0A2240]/40 to-[#020617]/60 p-5 rounded-2xl">
      <h3 className="text-xs font-bold text-[#C6A96B] uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-white/5 pb-2">
        <span className="text-base">⚡</span> วิเคราะห์ดาวย้ำ และกำลังส่งผลจากฐานที่ 4 (มหาจักร)
      </h3>
      <div className="space-y-4">
        <p className="text-sm text-[#F8F6F1] leading-relaxed">
          ระบบ <span className="font-bold text-[#C6A96B]">ดาวย้ำ</span> หรือดาวที่ปรากฏซ้ำในหลายภพเรือน บ่งชี้ถึงพลังงานที่ส่งผลรุนแรงและมีอิทธิพลต่อดวงชะตาเป็นพิเศษ 
          โดยเฉพาะเมื่อได้รับการหนุนนำจาก <span className="font-bold text-[#4B6FAE]">ฐานที่ 4 (มหาจักร)</span> ซึ่งเป็นฐานแห่งกำลังและการขยายผล
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
            <p className="text-[10px] text-[#8A8070] uppercase font-bold mb-3 tracking-widest">ดาวย้ำที่พบในพื้นดวงชะตา (ฐาน 1-3)</p>
            {repeatedStars.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {repeatedStars.map(star => (
                  <span key={star} className="px-3 py-1.5 rounded-lg bg-[#C6A96B]/10 border border-[#C6A96B]/30 text-xs text-[#C6A96B] font-bold">
                    ดาว {star} ({STAR_NAMES[star as StarNumber] || "—"})
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8A8070] italic">ไม่พบดาวย้ำในพื้นดวง</p>
            )}
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
            <p className="text-[10px] text-[#8A8070] uppercase font-bold mb-2 tracking-widest">ผลกระทบจากฐานที่ 4 (มหาจักร)</p>
            <p className="text-xs text-[#F8F6F1] leading-relaxed">
              ดาวที่ตั้งอยู่บนฐาน 4 มีกำลังเป็นมหาจักร ส่งผลให้เรื่องราวในภพนั้นๆ มีโอกาสประสบความสำเร็จอย่างยิ่งใหญ่ แต่ต้องแลกมาด้วยความเหน็ดเหนื่อยและการต่อสู้ฟันฝ่า
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────────────────────

import { UpgradePaywall } from "~/components/ui/UpgradePaywall";

export default function HoroscopePage() {
  const { profile, reports, history, customers, isProLocked, initialResult } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";
  const ad = actionData as any;

  // ── ผลลัพธ์ที่แสดงผลปัจจุบัน (ลำดับความสำคัญ: actionData > initialResult) ──
  const [activeResult, setActiveResult] = useState<any>(ad || initialResult);
  
  // อัปเดตเมื่อ actionData มีการเปลี่ยนแปลง (เช่น กดปุ่มคำนวณ)
  useEffect(() => {
    if (ad && !ad.error) {
      setActiveResult(ad);
    }
  }, [ad]);

  const [hoverNum, setHoverNum] = useState<number | null>(null);

  // ── ระบบ Filter ทักษาจร / มหาภูติจร ──
  const [filterType, setFilterType] = useState<"star" | "taksa" | "maha" | null>(null);
  const [filterValue, setFilterValue] = useState<string | number | null>(null);

  // ── ระบบจัดการ Tabs ย่อย (3 Tabs) ──
  const [activeTab, setActiveTab] = useState<"calc" | "chart" | "analysis">("chart");
  const [analysisSubTab, setAnalysisSubTab] = useState<"general" | "career" | "love" | "wealth" | "yearly">("general");

  // Auto-fallback: ถ้าโหลดหน้าแรกแล้วไม่มี birth data (activeResult เป็น null) ให้สลับไปที่หน้ากรอกวันเดือนปีเกิด (calc)
  useEffect(() => {
    if (!activeResult) {
      setActiveTab("calc");
    }
  }, [activeResult]);

  // ── ส่วนแชทพยากรณ์อัจฉริยะตาม Filter ──
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      sender: "ai",
      text: "ยินดีต้อนรับสู่พื้นที่แชทพยากรณ์อัจฉริยะค่ะ 🔮 เลือกดวงดาว ทักษา หรือมหาภูติที่คุณสนใจบนแผงควบคุมด้านบนได้เลยนะคะ ระบบจะวิเคราะห์ดวงชะตาเฉพาะจุดและให้คำแนะนำแบบสดๆ ทันทีค่ะ!",
      time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
    }
  ]);
  const [userInput, setUserInput] = useState("");

  // ── ระบบ Filter เปิด/ปิด การแสดงผลสัญลักษณ์และภพเรือน ──
  const [showVayaJorn, setShowVayaJorn] = useState(true);
  const [showYearlyJorn, setShowYearlyJorn] = useState(true);
  const [showMonthlyJorn, setShowMonthlyJorn] = useState(false);
  const [showDailyJorn, setShowDailyJorn] = useState(false);
  const [showNatalLagna, setShowNatalLagna] = useState(true);
  const [showTransitLagna, setShowTransitLagna] = useState(true);
  const [showTaksaJorn, setShowTaksaJorn] = useState(false);
  const [showMahaJorn, setShowMahaJorn] = useState(false);
  const [showTaksaDirection, setShowTaksaDirection] = useState(false);

  // ดึงค่าระบบจรจาก activeResult เพื่อนำมาหาดาวเป้าหมาย
  const taksaTransit = activeResult?.taksaMaha?.taksaTransit || activeResult?.phopephumResult?.taksaTransit;
  const mahaTransit = activeResult?.taksaMaha?.mahaTransit || activeResult?.phopephumResult?.mahaTransit;

  const getHighlightedStars = useCallback(() => {
    if (!filterType || !filterValue || !activeResult) return new Set<number>();
    const stars = new Set<number>();

    if (filterType === "star") {
      stars.add(Number(filterValue));
    } else if (filterType === "taksa" && taksaTransit?.map) {
      Object.entries(taksaTransit.map).forEach(([starStr, bhop]) => {
        if (bhop === filterValue) {
          stars.add(Number(starStr));
        }
      });
    } else if (filterType === "maha" && mahaTransit?.map) {
      const targetStar = mahaTransit.map[filterValue as string];
      if (targetStar) {
        stars.add(Number(targetStar));
      }
    }
    return stars;
  }, [filterType, filterValue, activeResult, taksaTransit, mahaTransit]);

  const highlightedStars = getHighlightedStars();
  const isFiltering = filterType !== null;

  // ── อัปเดตคำทำนายจาก AI เมื่อมีการคลิกเปลี่ยน Filter ของผู้ใช้แบบเรียลไทม์ ──
  useEffect(() => {
    if (filterType && filterValue && activeResult) {
      let adviceText = "";
      if (filterType === "star") {
        const starNum = Number(filterValue);
        const starInfo = STAR_CORE_MEANINGS[starNum];
        const tBhop = taksaTransit?.map?.[starNum as StarNumber];
        
        let subText = "";
        if (tBhop === "ศรี") {
          subText = "ปีนี้จัดเป็น 'ปีแห่งสิริมงคลสูงสุด' นำมาซึ่งเงินทองไหลมาเทมา ความสำเร็จและการอุปถัมภ์ที่น่ายินดีอย่างยิ่งค่ะ ✨";
        } else if (tBhop === "กาลกิณี") {
          subText = "ปีนี้จัดเป็นภพกาลกิณีจร พึงระวังอุบัติเหตุ การขัดแย้งเชิงคดีความ หรือมีเรื่องขุ่นข้องหมองใจ ควรมีสติตั้งมั่นและเลี่ยงความเสี่ยงสูงค่ะ ⚠️";
        } else if (tBhop === "มนตรี") {
          subText = "ปีนี้จัดเป็นภพมนตรีจร มีผู้ใหญ่คอยเมตตาอุปถัมภ์ สนับสนุนให้ได้รับโอกาสดีๆ หรือเลื่อนขั้นการทำงานอย่างดีงามค่ะ ✦";
        } else if (tBhop === "เดช") {
          subText = "ปีนี้เสวยเดชจร อำนาจบารมีและเกียรติยศโดดเด่นมาก ชนะศัตรูหมู่มารและอุปสรรคได้อย่างสง่างามค่ะ ★";
        } else {
          subText = `ปีนี้ตกในเกณฑ์ ${tBhop}จร พลังดวงดาวหนุนนำด้านความมั่นคงและจังหวะชีวิตที่เป็นสัดส่วนในระดับปานกลางค่ะ`;
        }

        adviceText = `สำหรับ ${starInfo?.title || 'ดาวจร'} ธาตุ${starInfo?.element || 'ดาว'} ของคุณปีนี้วิเคราะห์ในระบบทักษาจรตกเป็นเกณฑ์ "${tBhop ?? 'ปกติ'}" ${subText}`;
      } else if (filterType === "taksa") {
        adviceText = `คุณได้เลือกฟิลเตอร์ทักษาจรในหมวดหมู่ "${filterValue}จร" ค่ะ ภพนี้คือตัวชี้วัดทิศทางพลังงานภายนอกที่จะมีผลขับเคลื่อนแผนงานและชีวิตประจำวันของท่านโดยตรง แนะนำให้วิเคราะห์ตัวดาวคู่ที่รองรับเพื่อกำหนดกลยุทธ์ก้าวไปข้างหน้าค่ะ`;
      } else if (filterType === "maha") {
        adviceText = `คุณได้กรองพลังงานระบบมหาภูติจรเสวยภพ "${filterValue}จร" ค่ะ ภพนี้แสดงถึงสภาวะอารมณ์ คลังปัญญา และจิตวิญญาณภายในที่จะนำพาทิศทางความคิดและการประคองสติชีวิตในปีนี้ค่ะ`;
      }

      setChatMessages(prev => [
        ...prev,
        {
          sender: "ai",
          text: `🔮 [วิเคราะห์ด่วน: ${filterType === 'star' ? 'ดาวดวงที่ ' + filterValue : filterType === 'taksa' ? 'ทักษาจร ' + filterValue : 'มหาภูติจร ' + filterValue}] — ${adviceText}`,
          time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
        }
      ]);
    }
  }, [filterType, filterValue, activeResult, taksaTransit]);

  // ฟังก์ชันอัปเดตตัวกรอง
  const handleFilterClick = useCallback((type: "star" | "taksa" | "maha", value: string | number) => {
    if (filterType === type && filterValue === value) {
      setFilterType(null);
      setFilterValue(null);
      setHoverNum(null);
    } else {
      setFilterType(type);
      setFilterValue(value);
      
      let targetStar: number | null = null;
      if (type === "star") {
        targetStar = Number(value);
      } else if (type === "taksa" && taksaTransit?.map) {
        const found = Object.entries(taksaTransit.map).find(([_, bhop]) => bhop === value);
        if (found) targetStar = Number(found[0]);
      } else if (type === "maha" && mahaTransit?.map) {
        const found = mahaTransit.map[value as string];
        if (found) targetStar = Number(found);
      }
      setHoverNum(targetStar);
    }
  }, [filterType, filterValue, taksaTransit, mahaTransit]);

  const handleResetFilter = useCallback(() => {
    setFilterType(null);
    setFilterValue(null);
    setHoverNum(null);
  }, []);

  // ── ฟังก์ชันคำนวณแบบเรียลไทม์ (เมื่อเปลี่ยนวันที่จร) ──
  const triggerRealtimeUpdate = useCallback(async () => {
    const dSel = document.querySelector('select[name="transitDay"]') as any;
    const mSel = document.querySelector('select[name="transitMonth"]') as any;
    const ySel = document.querySelector('select[name="transitYear"]') as any;
    const timeInput = document.querySelector('input[name="transitTime"]') as any;

    if (!dSel || !mSel || !ySel || !activeResult?.birthDate) return;

    const tDay = Number(dSel.value);
    const tMonth = Number(mSel.value);
    const tYear = Number(ySel.value);
    const tYearCE = tYear - 543;
    const transitDate = `${tYearCE}-${String(tMonth).padStart(2, "0")}-${String(tDay).padStart(2, "0")}`;
    const transitTime = timeInput?.value || "00:00";

    const [ty, tm, td] = transitDate.split("-").map(Number);
    const [th, tmin] = transitTime.split(":").map(Number);
    const checkDate = new Date(ty, tm - 1, td, th, tmin, 0);

    try {
      const res = await calculatePhopephum({
        birthDate: activeResult.birthDate,
        birthTime: activeResult.phopephumResult?.input_data?.birthTime || profile?.birth_time || "12:00",
        birthPlace: profile?.birth_place || "กรุงเทพมหานคร",
      }, checkDate);

      setActiveResult((prev: any) => ({
        ...prev,
        phopephumResult: res,
        matrix: res.nineBase.bases,
        taksaMaha: {
          taksaNatal: res.taksaNatal,
          taksaTransit: res.taksaTransit,
          mahaNatal: res.mahaNatal,
          mahaTransit: res.mahaTransit,
          elementPairFlags: res.crossCheck.elementPairFlags,
          alerts: res.crossCheck.alerts,
        },
        transitDate,
        transitTime,
      }));
    } catch (e) {
      console.error("Realtime update error:", e);
    }
  }, [activeResult?.birthDate, profile]);

  // ── คำนวณค่าเริ่มต้นวันเกิด (พ.ศ.) ──
  const birthDateObj = profile?.birth_date ? new Date(profile.birth_date) : null;
  const defaultBDay = birthDateObj ? birthDateObj.getDate() : 15;
  const defaultBMonth = birthDateObj ? birthDateObj.getMonth() + 1 : 6;
  const defaultBYear = birthDateObj ? birthDateObj.getFullYear() + 543 : 2540;

  // ── คำนวณค่าเริ่มต้นวันจร (พ.ศ.) ──
  const transitDateObj = activeResult?.transitDate ? new Date(activeResult.transitDate) : new Date();
  const defaultTDay = transitDateObj.getDate();
  const defaultTMonth = transitDateObj.getMonth() + 1;
  const defaultTYear = transitDateObj.getFullYear() + 543;

  // ── คำนวณความสว่างและสัญลักษณ์ ข้างขึ้น/แรม ตามผังดวง ──
  const lunar = activeResult?.phopephumResult?.nineBase?.lunarDate || activeResult?.lunarDateInfo || activeResult?.lunar;
  const currentAge = activeResult?.phopephumResult?.taksaTransit?.ageYang || activeResult?.transitPhase?.currentAge || activeResult?.ageCycle || 0;

  const placeholderMatrix = Array(9).fill(0).map(() => Array(7).fill(0));

  return (
    <div className="space-y-8 max-w-5xl pb-20 animate-fade-up">
      <header className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[#C6A96B] text-[10px] tracking-[0.3em] uppercase font-bold">
              ดวงดีมีชัย · ตรวจดวงชะตา
            </p>
            <h1 className="font-display text-4xl font-extrabold text-[#F8F6F1] tracking-tight mt-1">
              ผังดวงจักรพรรดิ
            </h1>
            <p className="text-[#8A8070] text-xs font-medium mt-1 font-sans">
              อายุย่างปีจร: {currentAge ? `${currentAge} ปี` : "—"}
            </p>
          </div>
        </div>
      </header>

      {/* ── Tab Navigation (3 แท็บ) ── */}
      <div className="flex gap-2">
        {[
          { id: "chart",    label: "1. พื้นดวง",        icon: "🔮" },
          { id: "analysis", label: "2. ภูมิปัญญาวิถี",  icon: "📜" },
          { id: "calc",     label: "3. คำนวณชะตา",       icon: "📝" },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                isSelected
                  ? "bg-[#C6A96B] border-[#F8F6F1]/10 text-[#020617] shadow-[0_4px_20px_rgba(198,169,107,0.3)]"
                  : "bg-[#0A2240]/45 border-white/8 text-[#8A8070] hover:text-[#F8F6F1] hover:border-[#C6A96B]/30"
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: พื้นดวง ── */}
      {activeTab === "chart" && activeResult?.matrix && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <WisdomBirthGuidanceCard profile={profile} activeResult={activeResult} lunar={lunar} />
          
          {/* ส่วนที่ 3: ตัวกรองมุมมองดวงชะตา (TRANSIT & OVERLAY FILTERS) */}
          <Card className="border-[#C6A96B]/20 bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-white/5 pb-3">
              <h3 className="text-xs font-bold text-[#C6A96B] uppercase tracking-widest flex items-center gap-2">
                <span className="text-base">🎛️</span> ตัวกรองมุมมองดวงชะตา (TRANSIT & OVERLAY FILTERS)
              </h3>
              <p className="text-[10px] text-[#8A8070] italic">(เลือกเปิด/ปิดเพื่อแสดงสัญลักษณ์ทับซ้อนบนผังดวง)</p>
            </div>
            
            <div className="flex flex-wrap gap-3 items-center">
              <button onClick={() => setShowVayaJorn(!showVayaJorn)} className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all flex items-center gap-2 ${showVayaJorn ? "bg-[#C6A96B]/10 border-[#C6A96B]/40 text-[#C6A96B]" : "bg-transparent border-white/10 text-[#8A8070] hover:border-white/30"}`}>
                <span className={`w-2 h-2 rounded-full ${showVayaJorn ? "bg-[#C6A96B] animate-pulse" : "bg-[#8A8070]"}`}></span> วัยจร
              </button>
              <button onClick={() => setShowYearlyJorn(!showYearlyJorn)} className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all flex items-center gap-2 ${showYearlyJorn ? "bg-[#4B6FAE]/10 border-[#4B6FAE]/40 text-[#4B6FAE]" : "bg-transparent border-white/10 text-[#8A8070] hover:border-white/30"}`}>
                <span className={`w-2 h-2 rounded-full ${showYearlyJorn ? "bg-[#4B6FAE]" : "bg-[#8A8070]"}`}></span> ปีจร
              </button>
              <button onClick={() => setShowMonthlyJorn(!showMonthlyJorn)} className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all flex items-center gap-2 ${showMonthlyJorn ? "bg-amber-500/10 border-amber-500/40 text-amber-500" : "bg-transparent border-white/10 text-[#8A8070] hover:border-white/30"}`}>
                <span className={`w-2 h-2 rounded-full ${showMonthlyJorn ? "bg-amber-500" : "bg-[#8A8070]"}`}></span> เดือนจร
              </button>
              <button onClick={() => setShowDailyJorn(!showDailyJorn)} className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all flex items-center gap-2 ${showDailyJorn ? "bg-rose-500/10 border-rose-500/40 text-rose-500" : "bg-transparent border-white/10 text-[#8A8070] hover:border-white/30"}`}>
                <span className={`w-2 h-2 rounded-full ${showDailyJorn ? "bg-rose-500" : "bg-[#8A8070]"}`}></span> วันจร
              </button>
              
              <div className="w-px h-6 bg-white/10 mx-1"></div>
              
              <button onClick={() => setShowNatalLagna(!showNatalLagna)} className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all flex items-center gap-2 ${showNatalLagna ? "bg-white/5 border-white/20 text-[#F8F6F1]" : "bg-transparent border-white/10 text-[#8A8070] hover:border-white/30"}`}>
                <span className={`text-[10px] bg-[#C6A96B] text-black rounded-full w-4 h-4 flex items-center justify-center ${showNatalLagna ? "opacity-100" : "opacity-50 grayscale"}`}>ล</span> ลัคนาเกิด
              </button>
              <button onClick={() => setShowTransitLagna(!showTransitLagna)} className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all flex items-center gap-2 ${showTransitLagna ? "bg-white/5 border-white/20 text-[#F8F6F1]" : "bg-transparent border-white/10 text-[#8A8070] hover:border-white/30"}`}>
                <span className={`text-[10px] bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center ${showTransitLagna ? "opacity-100" : "opacity-50 grayscale"}`}>ลอ</span> ลัคนาจร
              </button>
              
              <div className="w-px h-6 bg-white/10 mx-1"></div>
              
              <button onClick={() => setShowTaksaJorn(!showTaksaJorn)} className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all flex items-center gap-2 ${showTaksaJorn ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-transparent border-white/10 text-[#8A8070] hover:border-white/30"}`}>
                <span className="text-xs">✨</span> ทักษาจร
              </button>
              <button onClick={() => setShowMahaJorn(!showMahaJorn)} className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all flex items-center gap-2 ${showMahaJorn ? "bg-violet-500/10 border-violet-500/40 text-violet-400" : "bg-transparent border-white/10 text-[#8A8070] hover:border-white/30"}`}>
                <span className="text-xs">🔮</span> มหาภูติจร
              </button>
              <button onClick={() => setShowTaksaDirection(!showTaksaDirection)} className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all flex items-center gap-2 ${showTaksaDirection ? "bg-sky-500/10 border-sky-500/40 text-sky-400" : "bg-transparent border-white/10 text-[#8A8070] hover:border-white/30"}`}>
                <span className="text-xs">🧭</span> ทิศทักษา
              </button>
              
              {isFiltering && (
                <button onClick={handleResetFilter} className="px-3 py-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition-all">
                  ✕ ล้างตัวกรอง
                </button>
              )}
            </div>

            {/* Sub-filters for Taksa and Mahabhuti categories */}
            <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-bold text-[#8A8070] uppercase tracking-widest mr-2">กรองทักษา:</span>
                {["บริวาร", "อายุ", "เดช", "ศรี", "มูละ", "อุตสาหะ", "มนตรี", "กาลกิณี"].map((cat) => {
                  const isSel = filterType === "taksa" && filterValue === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        handleFilterClick("taksa", cat);
                        if (!showTaksaJorn) setShowTaksaJorn(true);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                        isSel 
                          ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]" 
                          : "bg-slate-900/60 border-white/10 text-[#8A8070] hover:border-emerald-500/30 hover:text-emerald-400"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-bold text-[#8A8070] uppercase tracking-widest mr-2">กรองมหาภูติ:</span>
                {["อธิบดี", "ราชา", "ธงชัย", "ขุมทรัพย์", "มรณะ", "อริ", "โลกาวินาศ"].map((cat) => {
                  const isSel = filterType === "maha" && filterValue === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        handleFilterClick("maha", cat);
                        if (!showMahaJorn) setShowMahaJorn(true);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                        isSel 
                          ? "bg-violet-600 border-violet-400 text-white shadow-[0_0_10px_rgba(139,92,246,0.4)]" 
                          : "bg-slate-900/60 border-white/10 text-[#8A8070] hover:border-violet-500/30 hover:text-violet-400"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          <FateMatrixPanel
            matrix={activeResult?.matrix ?? placeholderMatrix}
            activeNum={hoverNum}
            onNumClick={(n) => {
              if (n === null) {
                setHoverNum(null);
                setFilterType(null);
                setFilterValue(null);
              } else {
                setHoverNum(n === hoverNum ? null : n);
                setFilterType(n === hoverNum ? null : "star");
                setFilterValue(n === hoverNum ? null : n);
              }
            }}
            taksaMaha={activeResult?.taksaMaha}
            phopephumResult={activeResult?.phopephumResult}
            highlightedStars={highlightedStars}
            isFiltering={isFiltering}
            showNatalLagna={showNatalLagna}
            showTransitLagna={showTransitLagna}
            showVayaJorn={showVayaJorn}
            showYearlyJorn={showYearlyJorn}
            showMonthlyJorn={showMonthlyJorn}
            showDailyJorn={showDailyJorn}
            showTaksaJorn={showTaksaJorn}
            showMahaJorn={showMahaJorn}
          />

          <DetailedGuidancePanel />

          <LegendPanel />
          <Base4EffectPanel activeResult={activeResult} />

          <DynamicExplanationBox activeResult={activeResult} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ComparisonCard activeResult={activeResult} />
          </div>

          <TaksaMahaSection
            taksaMaha={activeResult?.taksaMaha}
            birthYearThai={activeResult?.birthDate ? new Date(activeResult.birthDate).getFullYear() + 543 : 2540}
            currentYearThai={activeResult?.transitDate ? new Date(activeResult.transitDate).getFullYear() + 543 : new Date().getFullYear() + 543}
          />
        </div>
      )}

      {/* ── TAB 2: ภูมิปัญญาวิถี ── */}
      {activeTab === "analysis" && activeResult?.matrix && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <SummaryParagraph activeResult={activeResult} />

          <div className="flex flex-wrap gap-2">
            {[
              { id: "general", label: "ทั่วไป", icon: "🌟" },
              { id: "career",  label: "การงาน", icon: "💼" },
              { id: "love",    label: "ความรัก", icon: "💖" },
              { id: "wealth",  label: "การเงิน", icon: "💰" },
              { id: "yearly",  label: "ปีจร",   icon: "📅" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setAnalysisSubTab(t.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[11px] font-bold transition-all ${
                  analysisSubTab === t.id
                    ? "bg-[#C6A96B] border-[#F8F6F1]/10 text-[#020617] shadow-lg"
                    : "bg-[#0A2240]/45 border-white/5 text-[#8A8070] hover:text-[#F8F6F1]"
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {analysisSubTab === "yearly" ? (
            <div className="space-y-6">
              {hoverNum !== null ? (
                <YearlyStarPredictionPanel 
                  star={hoverNum} 
                  taksaMaha={activeResult?.taksaMaha}
                />
              ) : (
                <Card className="border-[#C9A96E]/20 bg-slate-950/20 py-6 px-4 text-center">
                  <p className="text-xs text-[#8A8070]">
                    💡 เลือกดาวดวงใดดวงหนึ่งในผังดวงชะตา เพื่อดูคำพยากรณ์ปีจรเจาะลึกที่นี่ค่ะ
                  </p>
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Card className="p-8 text-center border-dashed border-white/10 bg-transparent">
                <p className="text-[#8A8070] text-sm">บทวิเคราะห์หมวด {analysisSubTab} กำลังประมวลผลภูมิปัญญา...</p>
              </Card>
            </div>
          )}

          <div className="pt-6 border-t border-[#C6A96B]/20">
             <h3 className="text-sm font-bold text-[#C6A96B] uppercase tracking-wider mb-4">
               📜 Wisdom Guidance Chamber (ปรึกษาภูมิปัญญาอัจฉริยะ)
             </h3>
             <div className="bg-[#0A2240]/40 rounded-2xl border border-[#C6A96B]/15 overflow-hidden">
                <div className="p-4 h-[300px] overflow-y-auto space-y-4">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] p-3 rounded-2xl text-xs ${
                        msg.sender === "user" 
                          ? "bg-[#C6A96B] text-[#020617] font-bold" 
                          : "bg-slate-950/60 text-[#F8F6F1] border border-white/5"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-slate-950/40 border-t border-white/5 flex gap-2">
                  <input 
                    type="text" 
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    placeholder="พิมพ์คำถามของคุณที่นี่..."
                    className="flex-1 bg-transparent border-none outline-none text-xs text-[#F8F6F1]"
                  />
                  <button className="text-[#C6A96B] font-bold text-xs px-3">ส่ง ➔</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: คำนวณชะตา ── */}
      {activeTab === "calc" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Card className="border-[#C9A96E]/20 bg-slate-900/40 backdrop-blur-md p-6">
            <Form method="post" className="space-y-8" onSubmit={() => {
              setTimeout(() => setActiveTab("chart"), 1000);
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="border-b border-[#C9A96E]/20 pb-2">
                    <h3 className="text-sm font-bold text-[#C9A96E] uppercase tracking-wider">ข้อมูลวันกำเนิด (Birth Info)</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">วันเกิด (พ.ศ.) *</label>
                      <DateDropdowns prefix="birth" defaultDay={defaultBDay} defaultMonth={defaultBMonth} defaultYear={defaultBYear} />
                    </div>
                    <Input name="birthTime" type="time" label="เวลาเกิด" defaultValue={profile?.birth_time ?? ""} />
                    <Input name="birthPlace" label="จังหวัดที่เกิด" defaultValue={profile?.birth_place ?? ""} placeholder="กรุงเทพมหานคร" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="border-b border-[#C9A96E]/20 pb-2">
                    <h3 className="text-sm font-bold text-[#C9A96E] uppercase tracking-wider">ข้อมูลวันจร (Transit Info)</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">วันที่จร (พ.ศ.) *</label>
                      <DateDropdowns prefix="transit" defaultDay={defaultTDay} defaultMonth={defaultTMonth} defaultYear={defaultTYear} onChange={triggerRealtimeUpdate} />
                    </div>
                    <Input name="transitTime" type="time" label="เวลาที่จร" onChange={triggerRealtimeUpdate} defaultValue={activeResult?.transitTime ?? `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`} />
                    <Input name="transitPlace" label="จังหวัดที่จร" defaultValue={activeResult?.transitPlace ?? "กรุงเทพมหานคร"} placeholder="กรุงเทพมหานคร" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <input type="checkbox" name="saveCustomer" id="saveCustomer" className="w-4 h-4 accent-[#C9A96E] rounded cursor-pointer" />
                  <label htmlFor="saveCustomer" className="text-xs text-[#94A3B8] cursor-pointer">บันทึกรายชื่อลูกค้าใหม่</label>
                  <input type="text" name="customerName" placeholder="ระบุชื่อลูกค้า..." className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#C9A96E]/50" />
                </div>
                <Button type="submit" loading={isLoading} className="w-full md:w-auto px-12 h-[50px] text-base">
                  คำนวณและผูกดวงชะตา
                </Button>
              </div>
            </Form>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Colors & Constants
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

export function getTaksaTransitIndicator(star: number, taksaMaha?: any) {
  if (!taksaMaha?.taksaTransit?.map) return null;
  const bhop = taksaMaha.taksaTransit.map[star];
  switch (bhop) {
    case "ศรี":
      return { label: "ศรี", fullName: "ศรีจร", color: "text-[#00FF00] bg-emerald-950/90 border-emerald-500/50 shadow-[0_0_8px_rgba(0,255,0,0.4)]" };
    case "มนตรี":
      return { label: "มนตรี", fullName: "มนตรีจร", color: "text-sky-300 bg-sky-950/90 border-sky-500/50 shadow-[0_0_8px_rgba(125,211,252,0.4)]" };
    case "เดช":
      return { label: "เดช", fullName: "เดชจร", color: "text-slate-100 bg-slate-800/90 border-white/40 shadow-[0_0_8px_rgba(255,255,255,0.4)]" };
    case "กาลกิณี":
      return { label: "กาลี", fullName: "กาลกิณีจร", color: "text-rose-400 bg-rose-950/90 border-rose-500/50 shadow-[0_0_8px_rgba(251,113,133,0.4)]" };
    case "บริวาร":
      return { label: "บริวาร", fullName: "บริวารจร", color: "text-amber-300 bg-amber-950/90 border-amber-500/50" };
    case "อายุ":
      return { label: "อายุ", fullName: "อายุจร", color: "text-blue-300 bg-blue-950/90 border-blue-500/50" };
    case "มูละ":
      return { label: "มูละ", fullName: "มูละจร", color: "text-orange-300 bg-orange-950/90 border-orange-500/50" };
    case "อุตสาหะ":
      return { label: "อุตสาหะ", fullName: "อุตสาหะจร", color: "text-purple-300 bg-purple-950/90 border-purple-500/50" };
    default:
      return { label: bhop, fullName: `${bhop}จร`, color: "text-slate-300 bg-slate-800/90 border-slate-700/50" };
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
  
  if (!bhop) return null;

  switch (bhop) {
    case "โลกาวินาศ":
      return { label: "วินาศ", fullName: "โลกาวินาศจร", color: "text-amber-400 bg-slate-900/95 border-amber-600/60 shadow-[0_0_8px_rgba(251,191,36,0.3)]" };
    case "ธงชัย":
      return { label: "ธงชัย", fullName: "ธงชัยจร", color: "text-yellow-300 bg-slate-900/95 border-yellow-500/60 shadow-[0_0_8px_rgba(253,224,71,0.3)]" };
    case "อธิบดี":
      return { label: "อธิบดี", fullName: "อธิบดีจร", color: "text-red-300 bg-slate-900/95 border-red-500/60 shadow-[0_0_8px_rgba(252,165,165,0.3)]" };
    case "ราชา":
      return { label: "ราชา", fullName: "ราชาจร", color: "text-pink-300 bg-slate-900/95 border-pink-500/60 shadow-[0_0_8px_rgba(249,168,212,0.3)]" };
    case "ขุมทรัพย์":
      return { label: "ทรัพย์", fullName: "ขุมทรัพย์จร", color: "text-emerald-300 bg-slate-900/95 border-emerald-500/60 shadow-[0_0_8px_rgba(110,231,183,0.3)]" };
    case "มรณะ":
      return { label: "มรณะ", fullName: "มรณะจร", color: "text-gray-400 bg-slate-900/95 border-gray-600/60" };
    case "อริ":
      return { label: "อริ", fullName: "อริจร", color: "text-orange-400 bg-slate-900/95 border-orange-600/60" };
    default:
      return { label: bhop, fullName: `${bhop}จร`, color: "text-violet-300 bg-slate-900/95 border-violet-500/60" };
  }
}

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
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#C9A96E]/20" />
        <p className="text-[#C9A96E] text-[10px] tracking-[0.25em] uppercase font-bold">
          ระบบทักษา · มหาภูติ
        </p>
        <div className="h-px flex-1 bg-[#C9A96E]/20" />
      </div>

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
    <Card className="p-0 overflow-hidden border-[#C6A96B]/20 shadow-2xl bg-slate-900/40 backdrop-blur-md rounded-2xl">
      <div className="p-4 border-b border-[#C6A96B]/20 bg-gradient-to-r from-[#C6A96B]/10 to-transparent">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#C6A96B]">ตารางทักษา (กำเนิด / จร)</h3>
        </div>
      </div>
      <div className="p-5 bg-slate-950/20">
        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
          {TAKSA_GRID_3X3.map((row, rIdx) =>
            row.map((star, cIdx) => {
              if (star === null) {
                return (
                  <div
                    key={`center-taksa`}
                    className="aspect-square flex flex-col items-center justify-center rounded-2xl border border-[#C6A96B]/30 bg-[#C6A96B]/15 p-2 text-center shadow-[0_0_15px_rgba(198,169,107,0.1)] relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                    <span className="text-[#C6A96B] text-[10px] font-bold leading-none uppercase tracking-widest relative z-10">อายุย่าง</span>
                    <span className="text-[#F8F6F1] font-display text-3xl font-bold my-1 relative z-10 drop-shadow-md">{taksaTransit.ageYang}</span>
                    <span className="text-[#8A8070] text-[10px] leading-none font-bold relative z-10">ปี</span>
                  </div>
                );
              }
              const bhopNatal = taksaNatal?.map?.[star];
              const bhopTransit = taksaTransit?.map?.[star];
              
              // กำหนดสีตามความหมายของทักษาจร
              let transitColorClass = "text-[#C6A96B]";
              if (bhopTransit === "กาลกิณี") transitColorClass = "text-rose-400";
              else if (bhopTransit === "ศรี") transitColorClass = "text-emerald-400";
              else if (bhopTransit === "มนตรี") transitColorClass = "text-sky-400";
              
              return (
                <div
                  key={`star-combined-${star}`}
                  className="aspect-square flex flex-col items-center justify-between rounded-xl border border-white/10 bg-slate-900/50 p-2 relative transition-all hover:border-[#C6A96B]/40 hover:bg-slate-800/60 shadow-inner group"
                >
                  <span className="text-[9px] font-bold text-[#8A8070] uppercase group-hover:text-white/70 transition-colors">{bhopNatal ?? "—"}</span>
                  <div className="flex flex-col items-center my-1">
                    <span className="font-display text-2xl font-black text-[#F8F6F1] drop-shadow-sm">{star}</span>
                  </div>
                  <span className={`text-[10px] font-bold bg-black/40 px-1.5 py-0.5 rounded w-full text-center truncate ${transitColorClass}`}>
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
  natal: any;
  transit: any;
  birthYearThai: number;
  currentYearThai: number;
  taksaMaha?: any;
}) {
  return (
    <Card className="p-0 overflow-hidden border-[#C6A96B]/20 shadow-2xl bg-slate-900/40 backdrop-blur-md rounded-2xl">
      <div className="p-4 border-b border-[#C6A96B]/20 bg-gradient-to-r from-violet-500/10 to-transparent">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔮</span>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#C6A96B]">มหาภูติ (กำเนิด / จร)</h3>
        </div>
      </div>
      <div className="p-5 bg-slate-950/20">
        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
          {MAHA_GRID_3X3.map((row, rIdx) =>
            row.map((bhop, cIdx) => {
              if (bhop === null) {
                return <div key={`maha-empty-${rIdx}-${cIdx}`} className="aspect-square" />;
              }
              const starNatal = natal?.map?.[bhop];
              const starTransit = transit?.map?.[bhop];
              
              return (
                <div
                  key={`maha-combined-${bhop}`}
                  className="aspect-square flex flex-col items-center justify-between rounded-xl border border-white/10 bg-slate-900/50 p-2 transition-all hover:border-violet-500/40 hover:bg-slate-800/60 shadow-inner group"
                >
                  <span className="text-[9px] font-bold text-[#8A8070] uppercase group-hover:text-white/70 transition-colors">{bhop}</span>
                  <span className="font-display text-2xl font-black text-[#F8F6F1] drop-shadow-sm my-1">{starNatal ?? "—"}</span>
                  <span className="text-[10px] font-bold bg-black/40 px-1.5 py-0.5 rounded w-full text-center truncate text-violet-400">{starTransit ?? "—"} จร</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}

const STAR_CORE_MEANINGS: Record<number, { title: string; element: string; desc: string; keywords: string[] }> = {
  1: { title: "ดาวอาทิตย์ (๑)", element: "ไฟ", desc: "สัญลักษณ์แห่งเกียรติยศ ชื่อเสียง ความเป็นผู้นำ และการแสดงออกถึงศักดิ์ศรีและความคิดสร้างสรรค์ระดับจักรพรรดิ", keywords: ["เกียรติยศ", "ชื่อเสียง", "ผู้นำ", "ความร้อนแรง"] },
  2: { title: "ดาวจันทร์ (๒)", element: "ดิน", desc: "สัญลักษณ์แห่งเสน่ห์เมตตามหานิยม ความอ่อนโยน การบริการ โชคลาภ และวิถีอารมณ์ความรู้สึกที่ละเอียดอ่อน", keywords: ["เสน่ห์", "เมตตา", "ความอ่อนโยน", "เงินทองไหลมา"] },
  3: { title: "ดาวอังคาร (๓)", element: "ลม", desc: "สัญลักษณ์แห่งความกล้าหาญ การลงมือทำอย่างรวดเร็ว พลังขับเคลื่อน พละกำลัง และการแข่งขันเพื่อชัยชนะ", keywords: ["ความกล้าหาญ", "ขยันขันแข็ง", "รวดเร็ว", "ชัยชนะ"] },
  4: { title: "ดาวพุธ (๔)", element: "น้ำ", desc: "สัญลักษณ์แห่งปัญญาปฏิภาณ ไหวพริบ การสื่อสาร เจรจา การประสานสัมพันธ์อันดี และการค้าขายสร้างรายได้", keywords: ["การเจรจา", "เอกสารสัญญา", "การค้า", "ไหวพริบ"] },
  5: { title: "ดาวพฤหัสบดี (๕)", element: "ดิน", desc: "สัญลักษณ์แห่งปัญญาญาณอันสูงส่ง ความรู้ คุณธรรม ความมั่นคง ศีลธรรม และผู้ใหญ่อุปถัมภ์คำชูที่เป็นมงคล", keywords: ["ปัญญา", "ความรู้", "ความมั่นคง", "ผู้ใหญ่สนับสนุน"] },
  6: { title: "ดาวศุกร์ (๖)", element: "น้ำ", desc: "สัญลักษณ์แห่งศิลปะ ความรัก โชคลาภการเงิน ความสุขสำราญทางโลก และเสน่ห์ดึงดูดสิ่งสวยงามเข้ามาหาตัว", keywords: ["ความรัก", "ศิลปะ", "เงินตรา", "ความสุขสมบูรณ์"] },
  7: { title: "ดาวเสาร์ (๗)", element: "ไฟ", desc: "สัญลักษณ์แห่งความอดทน ความเพียรพยายาม ภารกิจระยะยาวอันหนักหน่วง และการสร้างรากฐานชีวิตที่ยั่งยืน", keywords: ["ความอดทน", "ความรับผิดชอบ", "งานใหญ่", "รากฐานมั่นคง"] },
  8: { title: "ดาวราหู (๘)", element: "ลม", desc: "สัญลักษณ์แห่งความกล้าได้กล้าเสีย การเสี่ยงโชค ทางลัด การพลิกฟื้นดวงชะตา การต่างประเทศ หรือความลุ่มหลงนวัตกรรมใหม่ๆ", keywords: ["การต่างประเทศ", "เสี่ยงโชค", "นวัตกรรม", "พลิกแพลงชะตา"] }
};

function YearlyStarPredictionPanel({ star, taksaMaha }: { star: number; taksaMaha: any }) {
  const starInfo = STAR_CORE_MEANINGS[star];
  if (!starInfo) return null;
  const currentTaksa = taksaMaha?.taksaTransit?.map?.[star];
  
  return (
    <Card className="border-[#C9A96E]/30 bg-gradient-to-br from-[#0A2240]/60 to-[#020617]/90 p-5 rounded-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/15 border border-[#C9A96E]/35 flex items-center justify-center font-display text-xl font-bold text-[#C9A96E]">
          {star}
        </div>
        <div>
          <h4 className="font-display font-bold text-[#F8F6F1]">{starInfo.title}</h4>
          <p className="text-[10px] text-[#8A8070] uppercase tracking-widest">ธาตุ{starInfo.element}</p>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-[#F8F6F1] leading-relaxed">
          ปีจรนี้ดาว {starInfo.title} ตกเป็นเกณฑ์ <span className="font-bold text-[#C9A96E]">{currentTaksa ?? "ปกติ"}จร</span>
        </p>
        <p className="text-[11px] text-[#8A8070] italic">{starInfo.desc}</p>
      </div>
    </Card>
  );
}

function numColor(n: number, isActive: boolean = false) {
  if (isActive) {
    return {
      bg: "bg-[#C9A96E]",
      text: "text-[#020617] font-black",
      border: "border-[#F8F6F1] shadow-[0_0_15px_rgba(201,169,110,0.8)]",
    };
  }
  return {
    bg: "bg-slate-900/80",
    text: "text-[#F8F6F1] font-black drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)]",
    border: "border-[#C9A96E]/50",
  };
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

function GuidanceItem({ label, desc, color }: { label: string, desc: string, color?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={`text-[13px] font-bold font-thai ${color || "text-[#C6A96B]"}`}>{label}:</span>
      <p className="text-[11px] text-[#8A8070] leading-relaxed font-thai">{desc}</p>
    </div>
  );
}

function DetailedGuidancePanel() {
  return (
    <Card className="mt-8 border-[#C6A96B]/30 bg-[#0A1628]/60 p-6 rounded-3xl space-y-8 backdrop-blur-xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ปัจจัยภายนอก (ทักษาจรปีนี้) */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-[#C6A96B]/20 pb-3">
             <span className="text-xl">✨</span>
             <h3 className="font-bold text-[#F8F6F1] text-base font-thai">ปัจจัยภายนอก (ทักษาจรปีนี้):</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GuidanceItem label="บริวาร" desc="ลูกน้อง คนรัก ครอบครัว หรือโครงการร่วมมือกันใหม่ๆ" />
            <GuidanceItem label="อายุ" desc="สุขภาพร่างกาย พลังชีวิต และความมั่นคงในการดูแลตนเอง" />
            <GuidanceItem label="เดช" desc="อำนาจบารมี เกียรติยศ ชัยชนะ และสิทธิ์ขาดการตัดสินใจ (ขาวสว่าง)" color="text-[#FFFFFF]" />
            <GuidanceItem label="ศรี" desc="สิริมงคลสูงสุด โชคลาภ ความรักราบรื่น ทรัพย์สินเงินทอง (เขียวสว่าง)" color="text-[#00FF00]" />
            <GuidanceItem label="มูละ" desc="ฐานรากชีวิตที่มั่นคง มรดก การออม ทรัพย์สินชิ้นใหญ่ บ้าน/ที่ดิน" />
            <GuidanceItem label="อุตสาหะ" desc="ความเพียรพยายาม งานหนัก โครงการที่ต้องฝ่าฟันลุล่วง" />
            <GuidanceItem label="มนตรี" desc="ผู้ใหญ่เมตตาเอ็นดู ผู้อุปถัมภ์ช่วยเหลือ คอยเกื้อหนุนแนะนำ" />
            <GuidanceItem label="กาลกิณี" desc="สิ่งที่ควรระวัง อุปสรรคขัดข้อง ความขัดแย้ง หรือสุขภาพ (แดงสว่าง)" color="text-[#FF0000]" />
          </div>
        </div>

        {/* ปัจจัยภายใน (มหาภูติจรปีนี้) */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-[#C6A96B]/20 pb-3">
             <span className="text-xl">🧠</span>
             <h3 className="font-bold text-[#F8F6F1] text-base font-thai">ปัจจัยภายใน (มหาภูติจรปีนี้):</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GuidanceItem label="อธิบดี" desc="สภาวะจิตใจเข้มแข็ง ความคิดกล้าหาญพร้อมปกครองหรือคุมงานใหญ่" />
            <GuidanceItem label="ราชา" desc="สภาวะภายในรุ่งโรจน์ สง่างาม ได้รับความเอ็นดูเคารพรัก" />
            <GuidanceItem label="ธงชัย" desc="แรงขับเคลื่อนภายในสู่ชัยชนะ ความสำเร็จ และสัจจะชัยชนะของจิตใจ" color="text-[#FFFF00]" />
            <GuidanceItem label="ขุมทรัพย์" desc="ความสมบูรณ์ของความรู้สึกภายใน คลังปัญญา หรือจังหวะชีวิตทำเงิน" />
            <GuidanceItem label="มรณะ" desc="ความคิดที่อยากปรับปรุง เปลี่ยนแปลง ยุติบางสิ่งเพื่อก้าวข้ามสู่บทเรียนใหม่" />
            <GuidanceItem label="อริ" desc="จิตใจต้องอดทนต่อแรงกดดัน การแก้ปัญหาเรื่องขัดข้องรายวัน" />
            <GuidanceItem label="โลกาวินาศ" desc="ความแปรปรวนพลิกผันของสภาวะจิตใจ เรื่องหลังบ้านแปรปรวน (ส้มเหลืองสว่าง)" color="text-[#FFD700]" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-white/5">
        {/* สัญลักษณ์ผังดวง */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
             <h3 className="font-bold text-[#F8F6F1] text-sm font-thai uppercase tracking-wider">สัญลักษณ์ผังดวง:</h3>
          </div>
          <div className="flex gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#C6A96B] text-black text-[10px] font-bold flex items-center justify-center border border-black/20 shadow-sm">ล</div>
              <span className="text-xs text-[#8A8070] font-thai">ลัคนากำเนิด</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border border-red-400 shadow-sm">ลอ</div>
              <span className="text-xs text-[#8A8070] font-thai">ลัคนาจร</span>
            </div>
          </div>
        </div>

        {/* ดาวย้ำ และกำลังส่งผลจากฐานที่ 4 */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
             <h3 className="font-bold text-[#F8F6F1] text-sm font-thai uppercase tracking-wider">ดาวย้ำ และกำลังส่งผลจากฐานที่ 4 (กำลังเทวดา):</h3>
          </div>
          <div className="space-y-3">
            <p className="text-[11px] text-[#8A8070] leading-relaxed font-thai">
              <span className="text-[#C6A96B] font-bold">1) ดาวย้ำ (Yum Star):</span> บ่งบอกถึงพลังงานที่ถูกเน้นย้ำเป็นพิเศษตามกาลเวลา (วัน/เดือน/ปี) โดยจะปรากฏในฐานที่ 5, 6, 7 ในคอลัมน์ที่ตรงกับจุดจรนั้นๆ
            </p>
            <p className="text-[11px] text-[#8A8070] leading-relaxed font-thai">
              <span className="text-[#C6A96B] font-bold">2) สูตรการดู:</span>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-[11px] text-[#8A8070] font-thai">
              <li>ตกฐานวัน (แถว 1): ย้ำที่ <span className="text-amber-400 font-bold">ฐาน 5</span> (ฐานเศษ/มหาภูติ)</li>
              <li>ตกฐานเดือน (แถว 2): ย้ำที่ <span className="text-amber-400 font-bold">ฐาน 6</span> (กำลังพระเคราะห์)</li>
              <li>ตกฐานปี (แถว 3): ย้ำที่ <span className="text-amber-400 font-bold">ฐาน 7</span> (กำลังพระเคราะห์)</li>
            </ul>
            <p className="text-[11px] text-[#8A8070] leading-relaxed font-thai bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-[#C6A96B] font-bold">3) กำลังส่งผลจากฐานที่ 4:</span> ฐานนี้ทำหน้าที่เป็น <span className="text-[#F8F6F1] font-bold">"แบตเตอรี่สำรอง"</span> ที่แผ่พลังงานไปยังดาวทุกดวงในคอลัมน์เดียวกัน หากจุดจร (วัย/ปี/ลัคนา) ตกในคอลัมน์ที่มีกำลังเทวดาสูง (มหาจักร) เรื่องราวนั้นจะขยายผลรุนแรงและชัดเจนยิ่งขึ้น
            </p>
            <p className="text-[12px] text-sky-400 font-bold font-thai text-center py-2 bg-sky-500/10 rounded-lg border border-sky-500/20">
              📍 สัญลักษณ์ ลจ: คือลัคนาจร ณ ปัจจุบันนาที (กาลชะตา) เพื่อดูจังหวะตัดสินใจในเสี้ยวเวลา
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function FateMatrixPanel({ 
  matrix, 
  activeNum, 
  onNumClick, 
  taksaMaha, 
  phopephumResult,
  highlightedStars = new Set<number>(),
  isFiltering = false,
  showNatalLagna = true,
  showTransitLagna = true,
  showVayaJorn = true,
  showYearlyJorn = true,
  showMonthlyJorn = true,
  showDailyJorn = true,
  showTaksaJorn = false,
  showMahaJorn = false,
}: {
  matrix: number[][];
  activeNum: number | null;
  onNumClick: (n: number | null) => void;
  taksaMaha?: any;
  phopephumResult?: any;
  highlightedStars?: Set<number>;
  isFiltering?: boolean;
  showNatalLagna?: boolean;
  showTransitLagna?: boolean;
  showVayaJorn?: boolean;
  showYearlyJorn?: boolean;
  showMonthlyJorn?: boolean;
  showDailyJorn?: boolean;
  showTaksaJorn?: boolean;
  showMahaJorn?: boolean;
}) {
  return (
    <div onClick={() => onNumClick(null)} className="w-full">
      <Card className="p-0 overflow-hidden border-[#D9BC82]/20 shadow-2xl bg-[#020617]/40 backdrop-blur-2xl">
        <div onClick={(e) => e.stopPropagation()} className="bg-[#D9BC82]/10 p-4 border-b border-[#D9BC82]/20 flex justify-between items-center">
          <p className="text-[#D9BC82] text-sm font-bold uppercase tracking-widest font-thai">ผังดวงเลข 7 ตัว 9 ฐาน (35 ภพเรือนสมบูรณ์)</p>
        </div>
        <div className="overflow-x-auto p-6 bg-slate-900/30">
          <table className="w-full border-collapse">
            <tbody>
              {matrix.map((row, rIdx) => (
                <tr key={rIdx} className={rIdx === 3 ? "bg-[#4B6FAE]/15 border-y border-[#4B6FAE]/45" : "hover:bg-white/5"}>
                  <td className="py-4 pr-6 text-left whitespace-nowrap min-w-[120px] border-r border-white/5">
                    <p className="text-xs font-black text-[#F8F6F1] leading-tight font-thai">{ROW_META[rIdx].label}</p>
                    <p className="text-[10px] text-[#8A8070] font-bold uppercase tracking-tighter mt-1 font-thai">{ROW_META[rIdx].sub}</p>
                  </td>
                  {row.map((num, cIdx) => {
                    const getStarFromBase4 = (n: number): number => {
                      const mapping: Record<number, number> = { 6: 1, 15: 2, 8: 3, 4: 4, 11: 4, 17: 4, 5: 5, 14: 5, 18: 5, 19: 5, 16: 6, 21: 6, 7: 7, 10: 7, 20: 7, 12: 8 };
                      return mapping[n] || (n % 7 || 7);
                    };
                    const isBase4 = rIdx === 3;
                    const phopName = ROW_META[rIdx].phopNames ? ROW_META[rIdx].phopNames[cIdx] : (isBase4 ? BASE4_MEANINGS[num] : null);
                    
                    const actualNum = isBase4 ? getStarFromBase4(num) : (num % 7 || 7);
                    const isHighlighted = (activeNum !== null && (isBase4 ? matrix[2]?.[cIdx] === activeNum : (actualNum === activeNum && [0,1,2,7,8].includes(rIdx)))) || (isFiltering && highlightedStars.has(isBase4 ? matrix[2]?.[cIdx] : actualNum));
                    const isDimmed = isFiltering && !highlightedStars.has(isBase4 ? matrix[2]?.[cIdx] : actualNum);
                    const c = numColor(num, isHighlighted);
                    const isRow012 = [0, 1, 2, 7, 8].includes(rIdx);
                    
                    const lagnaNatal = phopephumResult?.lagna;
                    const isLagnaNatal = isRow012 && lagnaNatal?.row === (rIdx + 1) && lagnaNatal?.col === (cIdx + 1);
                    
                    const lagnaTransit = phopephumResult?.lagnaTransit;
                    const isLagnaTransit = isRow012 && lagnaTransit?.row === (rIdx + 1) && lagnaTransit?.col === (cIdx + 1);
                    
                    const isVayaJorn = isRow012 && phopephumResult?.vayaJorn?.row === (rIdx + 1) && phopephumResult?.vayaJorn?.col === (cIdx + 1);
                    const isYearlyJorn = isRow012 && phopephumResult?.yearlyJorn?.row === (rIdx + 1) && phopephumResult?.yearlyJorn?.col === (cIdx + 1);
                    const isMonthlyJorn = isRow012 && phopephumResult?.monthlyJorn?.row === (rIdx + 1) && phopephumResult?.monthlyJorn?.col === (cIdx + 1);
                    const isDailyJorn = isRow012 && phopephumResult?.dailyJorn?.row === (rIdx + 1) && phopephumResult?.dailyJorn?.col === (cIdx + 1);
                    const isLagnaMoment = isRow012 && phopephumResult?.lagnaMoment?.row === (rIdx + 1) && phopephumResult?.lagnaMoment?.col === (cIdx + 1);

                    // ยามย้ำ (Yum Star) - ลากแนวดิ่งลงมาหาฐาน 5, 6, 7
                    const isYumYearly = (rIdx === 6) && phopephumResult?.yearlyJorn?.col === (cIdx + 1) && phopephumResult?.yearlyJorn?.row !== null;
                    const isYumMonthly = (rIdx === 5) && phopephumResult?.monthlyJorn?.col === (cIdx + 1);
                    const isYumDaily = (rIdx === 4) && phopephumResult?.dailyJorn?.col === (cIdx + 1);

                    const taksaIndicator = isRow012 ? getTaksaTransitIndicator(actualNum, taksaMaha) : null;
                    const mahaIndicator = isRow012 ? getMahaTransitIndicator(actualNum, taksaMaha) : null;

                    return (
                      <td key={cIdx} className="p-2 min-w-[80px]">
                        <button onClick={(e) => { e.stopPropagation(); onNumClick(isBase4 ? matrix[2]?.[cIdx] : actualNum); }} type="button" className={`flex flex-col items-center gap-1.5 focus:outline-none relative w-full ${isDimmed ? "opacity-30" : ""}`}>
                          {phopName && (
                            <span className={`text-[9px] font-black uppercase text-center w-full leading-tight h-6 flex items-center justify-center transition-colors font-thai ${isHighlighted ? "text-[#D9BC82]" : "text-[#8A8070]"}`}>
                              {phopName}
                            </span>
                          )}
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center font-sans text-xl border transition-all ${isHighlighted ? "scale-110 z-10 border-[#C9A96E]" : ""} ${isBase4 && (isVayaJorn || isYearlyJorn || isLagnaNatal || isLagnaTransit) ? "ring-2 ring-offset-2 ring-[#C9A96E] ring-offset-[#020617]" : ""} ${c.bg} ${c.text} ${c.border}`}>
                            {num}
                          </div>
                          
                          {showNatalLagna && isLagnaNatal && (
                            <span className="absolute -bottom-1 -left-1 text-[8px] font-bold bg-[#C6A96B] text-[#020617] border border-[#C6A96B]/60 px-1 rounded-full z-10 shadow-sm font-thai">ล</span>
                          )}
                          {showTransitLagna && isLagnaTransit && (
                            <span className="absolute -bottom-1 -right-1 text-[9px] font-bold bg-red-500 text-white border border-red-400 px-1 rounded-full z-10 shadow-sm font-thai">ลอ</span>
                          )}
                          {isLagnaMoment && (
                            <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-sky-500 text-white border border-sky-400 px-1 rounded-full z-10 shadow-sm font-thai">ลจ</span>
                          )}

                          {/* ดาวย้ำ (Yum Star) Indicators */}
                          {(isYumYearly || isYumMonthly || isYumDaily) && (
                            <span className="absolute -top-3 flex items-center gap-0.5">
                              <span className="text-[8px] font-bold text-amber-400 animate-pulse">✨ ย้ำ</span>
                            </span>
                          )}

                          <div className="absolute -bottom-3 flex gap-0.5">
                            {showVayaJorn && isVayaJorn && <span className="w-2 h-2 rounded-full bg-[#C6A96B] animate-pulse shadow-[0_0_5px_#C6A96B]" />}
                            {showYearlyJorn && isYearlyJorn && <span className="w-2 h-2 rounded-full bg-[#4B6FAE] shadow-[0_0_5px_#4B6FAE]" />}
                            {showMonthlyJorn && isMonthlyJorn && <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_5px_#f59e0b]" />}
                            {showDailyJorn && isDailyJorn && <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_5px_#f43f5e]" />}
                          </div>
                          
                          {/* Taksa & Maha Badges Overlay - Refined Positioning & Set Separation */}
                          {isRow012 && (
                            <>
                              {showTaksaJorn && taksaIndicator && (
                                <div className="absolute -top-1 -right-2 z-20">
                                   <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold shadow-lg border font-thai ${taksaIndicator.color}`}>
                                     {taksaIndicator.label}
                                   </span>
                                </div>
                              )}
                              {showMahaJorn && mahaIndicator && (
                                <div className="absolute -top-1 -left-2 z-20">
                                   <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold shadow-lg border font-thai ${mahaIndicator.color}`}>
                                     {mahaIndicator.label}
                                   </span>
                                </div>
                              )}
                            </>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
