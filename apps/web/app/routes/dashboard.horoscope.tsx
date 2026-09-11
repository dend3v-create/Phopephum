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
import { InteractiveTaksaCard } from "~/components/taksa/InteractiveTaksaCard";
import { CombinedMahaCard } from "~/components/taksa/CombinedMahaCard";
import type { Env } from "~/env.server";
import type { HoroscopeResult } from "@phopephum/types";
import type { YamResult } from "@phopephum/engine";
import { useState, useEffect, useCallback, useRef } from "react";
import { useT } from "~/i18n/context";

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

import { resolveActiveSubject } from "~/services/activeSubject.server";
import { ActiveSubjectBanner } from "~/components/subject/ActiveSubjectBanner";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { user, profile } = await requireMinPlan("basic", request, env);

  const { createSupabaseClient } = await import("~/services/supabase.server");
  const { supabase } = createSupabaseClient(request, env);

  // 1. ตรวจสอบและดึงข้อมูลเจ้าชะตาที่กำลัง Active (ดวงตนเอง หรือ ลูกดวงที่เลือกไว้)
  const {
    activeSubject,
    customers,
    personLimit,
    currentCustomerCount,
    hasReachedLimit,
  } = await resolveActiveSubject(request, env, user, profile);

  // 2. ดึงรายงานล่าสุด
  const { data: reports } = await supabase
    .from("ai_reports")
    .select("id, report_type, created_at, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // 3. ดึงประวัติการคำนวณล่าสุด (History)
  const { data: history } = await supabase
    .from("calculations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  // 4. คำนวณผลลัพธ์เริ่มต้นสำหรับเจ้าชะตาที่กำลัง Active
  let initialResult = null;
  if (activeSubject.birthDate) {
    try {
      const bTimeStr = (activeSubject.birthTime || "12:00").slice(0, 5);
      const birthDateObj = new Date(`${activeSubject.birthDate}T${bTimeStr}:00+07:00`);
      const birthYamResult = getYamPrediction(birthDateObj);

      const phopephumResult = await calculatePhopephum({
        birthDate: activeSubject.birthDate,
        birthTime: activeSubject.birthTime || "12:00",
        birthPlace: activeSubject.birthPlace || "กรุงเทพมหานคร",
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
        birthDate: activeSubject.birthDate,
        birthTime: activeSubject.birthTime || "",
        transitDate: new Date().toISOString().split("T")[0],
        transitTime: "12:00",
        lagnaNakshatra: calculateLagnaNakshatra(activeSubject.birthDate, activeSubject.birthTime || "12:00"),
        birthYamResult,
        customerId: activeSubject.isCustomer ? activeSubject.id : undefined,
        customerName: activeSubject.isCustomer ? activeSubject.name : undefined,
        subjectName: activeSubject.name,
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
    activeSubject,
    personLimit,
    currentCustomerCount,
    hasReachedLimit,
    isProLocked: !canAccess(profile, "pro"),
    initialResult,
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);
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

    const bTimeStr = (parsed.data.birthTime || "12:00").slice(0, 5);
    const bDateObj = new Date(`${parsed.data.birthDate}T${bTimeStr}:00+07:00`);
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
    const isSaveCustomer = formData.get("saveCustomer") === "on";
    const customerName = String(formData.get("customerName") ?? "").trim();
    const subjectName = customerName || profile?.display_name || "เจ้าชะตา";

    await supabase.from("calculations").insert({
      user_id: user.id,
      calc_type: "phopephum_v2",
      input_data: { 
        birthDate: parsed.data.birthDate, 
        birthTime: parsed.data.birthTime,
        birthPlace: parsed.data.birthPlace,
        checkDate: checkDate.toISOString(),
        customerName: customerName || undefined,
        subjectName,
      },
      result_data: {
        ...phopephumResult,
        subjectName,
        customerName: customerName || undefined,
        birthDate: parsed.data.birthDate,
        birthTime: parsed.data.birthTime,
        birthPlace: parsed.data.birthPlace,
      },
    });

    // ── 4. Save Customer if requested ──
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

    // อัปเดตข้อมูลส่วนตัวเฉพาะกรณีที่เป็นการคำนวณของตนเอง (ไม่ใช่ลูกค้า)
    if (!customerName && !isSaveCustomer) {
      await supabase.from("profiles").update({
        birth_date: parsed.data.birthDate,
        birth_time: parsed.data.birthTime,
        birth_place: parsed.data.birthPlace,
      }).eq("id", user.id);
    }

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
      birthTime: parsed.data.birthTime || "",
      birthPlace: parsed.data.birthPlace || "",
      birthYearThai: new Date(parsed.data.birthDate).getFullYear() + 543,
      currentYearThai: checkDate.getFullYear() + 543,
      transitDate,
      transitTime,
      transitPlace: String(formData.get("transitPlace") ?? ""),
      lagnaNakshatra: calculateLagnaNakshatra(parsed.data.birthDate, parsed.data.birthTime || "12:00"),
      birthYamResult,
      subjectName,
      customerName: customerName || undefined,
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

// ─── PhopePhum Custom Astral Icons (Theme-specific, no generic GPT emojis) ───

function PhopephumMandalaIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeDasharray="1.5 1.5" />
      <path d="M12 3v18M3 12h18M5.64 5.64l12.72 12.72M18.36 5.64L5.64 18.36" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function PhopephumCompassIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" />
      <polygon points="12,4 14.5,12 12,10 9.5,12" fill="currentColor" />
      <polygon points="12,20 14.5,12 12,14 9.5,12" fill="none" stroke="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" strokeLinecap="round" />
    </svg>
  );
}

function PhopephumScrollIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M8 3h10a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h1" strokeLinecap="round" />
      <path d="M4 6a2 2 0 0 1 2-2h2v14H6a2 2 0 0 1-2-2V6z" fill="currentColor" fillOpacity={0.2} />
      <path d="M11 8h6M11 12h6M11 16h4" strokeLinecap="round" />
    </svg>
  );
}

function PhopephumCalculateIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="19" cy="9" r="1" fill="currentColor" />
    </svg>
  );
}

function DomainWisdomIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="14" stroke="#A78BFA" strokeWidth={1.5} strokeDasharray="3 2" />
      <path d="M16 6c-3 5-7 8-7 13a7 7 0 0 0 14 0c0-5-4-8-7-13z" fill="url(#wisdom-grad)" stroke="#C4B5FD" strokeWidth={1.5} />
      <circle cx="16" cy="18" r="2.5" fill="#DDD6FE" />
      <path d="M16 9v3M11 15l2.5 1M21 15l-2.5 1" stroke="#F5F3FF" strokeLinecap="round" />
      <defs>
        <linearGradient id="wisdom-grad" x1="16" y1="6" x2="16" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C3AED" stopOpacity="0.8" />
          <stop stopColor="#4C1D95" stopOpacity="0.4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function DomainIdentityIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="14" stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="3 2" />
      <circle cx="16" cy="16" r="6" fill="url(#identity-grad)" stroke="#FBBF24" strokeWidth={1.5} />
      <path d="M16 4v4M16 24v4M4 16h4M24 16h4M7.5 7.5l2.8 2.8M21.7 21.7l2.8 2.8M7.5 24.5l2.8-2.8M21.7 10.3l2.8-2.8" stroke="#FDE68A" strokeLinecap="round" strokeWidth={1.5} />
      <polygon points="16,12 18,16 16,15 14,16" fill="#FFFBEB" />
      <defs>
        <linearGradient id="identity-grad" x1="10" y1="10" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D97706" stopOpacity="0.9" />
          <stop stopColor="#78350F" stopOpacity="0.5" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function DomainCareerIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="14" stroke="#38BDF8" strokeWidth={1.5} strokeDasharray="3 2" />
      <path d="M16 6l8 16H8l8-16z" fill="url(#career-grad)" stroke="#7DD3FC" strokeWidth={1.5} />
      <path d="M16 11v8M13 16h6" stroke="#E0F2FE" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx="16" cy="6" r="1.5" fill="#BAE6FD" />
      <defs>
        <linearGradient id="career-grad" x1="16" y1="6" x2="16" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0284C7" stopOpacity="0.85" />
          <stop stopColor="#0C4A6E" stopOpacity="0.4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function DomainRelationshipIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="14" stroke="#FB7185" strokeWidth={1.5} strokeDasharray="3 2" />
      <path d="M16 23.5s-8-5.5-8-10.5a4.5 4.5 0 0 1 8-2.5 4.5 4.5 0 0 1 8 2.5c0 5-8 10.5-8 10.5z" fill="url(#rel-grad)" stroke="#FDA4AF" strokeWidth={1.5} />
      <circle cx="16" cy="14" r="2" fill="#FFE4E6" />
      <defs>
        <linearGradient id="rel-grad" x1="16" y1="8" x2="16" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E11D48" stopOpacity="0.8" />
          <stop stopColor="#881337" stopOpacity="0.4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function DomainWealthIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="14" stroke="#34D399" strokeWidth={1.5} strokeDasharray="3 2" />
      <path d="M8 12h16l-3 12H11L8 12z" fill="url(#wealth-grad)" stroke="#6EE7B7" strokeWidth={1.5} />
      <ellipse cx="16" cy="12" rx="8" ry="3" fill="#059669" stroke="#A7F3D0" strokeWidth={1.5} />
      <circle cx="16" cy="12" r="2" fill="#ECFDF5" />
      <path d="M16 15v5M14 17.5h4" stroke="#D1FAE5" strokeWidth={1.2} strokeLinecap="round" />
      <defs>
        <linearGradient id="wealth-grad" x1="16" y1="9" x2="16" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#059669" stopOpacity="0.85" />
          <stop stopColor="#064E3B" stopOpacity="0.4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function DomainAnnualIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="14" stroke="#22D3EE" strokeWidth={1.5} strokeDasharray="3 2" />
      <rect x="7" y="8" width="18" height="17" rx="3" fill="url(#annual-grad)" stroke="#67E8F9" strokeWidth={1.5} />
      <path d="M7 13h18M11 6v4M21 6v4" stroke="#A5F3FC" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx="12" cy="17" r="1.2" fill="#ECFEFF" />
      <circle cx="16" cy="17" r="1.2" fill="#ECFEFF" />
      <circle cx="20" cy="17" r="1.2" fill="#ECFEFF" />
      <circle cx="12" cy="21" r="1.2" fill="#ECFEFF" />
      <circle cx="16" cy="21" r="1.2" fill="#22D3EE" />
      <circle cx="20" cy="21" r="1.2" fill="#ECFEFF" />
      <defs>
        <linearGradient id="annual-grad" x1="16" y1="8" x2="16" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0891B2" stopOpacity="0.8" />
          <stop stopColor="#164E63" stopOpacity="0.4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ชุดข้อมูลทำนายระบบดาว ทักษาจร และมหาภูติจรแบบ Dynamic
// ─────────────────────────────────────────────────────────────────────────────

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

const TAKSA_QUALITY_MEANINGS: Record<string, { label: string; tone: "good" | "neutral" | "bad"; desc: string }> = {
  บริวาร: { label: "บริวารจร", tone: "good", desc: "ปีนี้มีพลังแห่งความเกื้อหนุนร่วมมือ มีการเริ่มโครงการใหม่ร่วมกับผู้อื่น หรือมีผู้ช่วยงาน ลูกน้อง คนรัก ครอบครัวช่วยส่งเสริมผลักดัน" },
  อายุ: { label: "อายุจร", tone: "neutral", desc: "ปีนี้จะโฟกัสที่การดำเนินชีวิต สุขภาพร่างกาย และการปรับสมดุลวิถีชีวิต มีความมั่นคงในการดูแลตนเอง การเดินทางปลอดภัย" },
  เดช: { label: "เดชจร", tone: "good", desc: "ปีนี้อำนาจบารมีโดดเด่นมาก ชนะอุปสรรคทั้งปวง มีเกียรติยศชื่อเสียง ได้รับตำแหน่ง คุมงาน คุมคน หรือมีพลังตัดสินใจเฉียบคมเด็ดขาด" },
  ศรี: { label: "ศรีจร", tone: "good", desc: "ปีนี้คือ 'ปีทองและสิริมงคลสูงสุด' ของท่านในด้านดาวดวงนี้ จะนำมาซึ่งโชคลาภ ทรัพย์สิน ความสุข ความรักอันหวานชื่น และความราบรื่นในทุกมิติชีวิต" },
  มูละ: { label: "มูละจร", tone: "good", desc: "ปีนี้มีความโดดเด่นด้านหลักทรัพย์ มรดก รากฐานชีวิตที่มั่นคง การซื้อที่อยู่อาศัย ยานพาหนะ หรือการออมเงินทองที่มีมูลค่าสูง" },
  อุตสาหะ: { label: "อุตสาหะจร", tone: "neutral", desc: "ปีนี้เน้นความพากเพียรพยายาม การทำงานหนัก โครงการที่ต้องฝ่าฟันอุปสรรค เหนื่อยแต่จะประสบความสำเร็จลุล่วงด้วยน้ำพักน้ำแรง" },
  มนตรี: { label: "มนตรีจร", tone: "good", desc: "ปีนี้ได้รับความเมตตาปรานีจากผู้ใหญ่ ครูอาจารย์ หรือมีผู้มีอิทธิพลคอยช่วยเหลือ สนับสนุนอุปถัมภ์ ชี้ช่องทางการงานการเงินให้สำเร็จได้ง่าย" },
  กาลกิณี: { label: "กาลกิณีจร", tone: "bad", desc: "ปีนี้ควรดำเนินชีวิตด้วยความระมัดระวังสูงสุด ดาวดวงนี้จะทำหน้าที่เตือนภัยเรื่องการเสียชื่อเสียง ขัดแย้ง คดีความ หรือสุขภาพทรุดโทรม อย่าประมาท" }
};

const MAHA_QUALITY_MEANINGS: Record<string, { label: string; tone: "good" | "neutral" | "bad"; desc: string }> = {
  อธิบดี: { label: "อธิบดีจร", tone: "good", desc: "จิตใจและพลังภายในมีความเข้มแข็งและกล้าหาญพร้อมรับบทบาทสำคัญในการปกครอง นำทัพ หรือตัดสินใจเรื่องใหญ่ๆ ได้อย่างยอดเยี่ยม" },
  ราชา: { label: "ราชาจร", tone: "good", desc: "มีสภาวะภายในที่สง่างาม ได้รับความสะดวกสบาย มีสง่าราศีดึงดูดสิ่งพรีเมียมหรูหรา และได้รับความเคารพยกย่องสูง" },
  ธงชัย: { label: "ธงชัยจร", tone: "good", desc: "จิตใจมีพลังแห่งชัยชนะ การตั้งเป้าหมายสิ่งใดจะมีแรงบันดาลใจนำพาไปสู่ความสำเร็จและมีโชคดีไม่คาดฝันคอยหนุนหลัง" },
  ขุมทรัพย์: { label: "ขุมทรัพย์จร", tone: "good", desc: "สภาวะภายในเป็นปีแห่งการกักเก็บความมั่นคง ค้นพบโอกาสสร้างรายได้ หรือมีคลังปัญญาที่มองเห็นโอกาสสร้างผลประโยชน์ก้อนโต" },
  มรณะ: { label: "มรณะจร", tone: "bad", desc: "มีความคิดอยากเปลี่ยนแปลงขนานใหญ่ ต้องการลบล้างสิ่งเดิมเพื่อเริ่มต้นบทเรียนชีวิตบทใหม่ หรือมีความกังวลเกี่ยวกับการพลัดพรากเดินทางไกล" },
  อริ: { label: "อริจร", tone: "bad", desc: "สภาวะจิตใจต้องเผชิญหน้ากับความกดดัน ปัญหาขัดแย้ง และการแก้ไขปัญหารายวันค่อนข้างถี่ ต้องมีสติระงับอารมณ์และอดทนอย่างยิ่ง" },
  โลกาวินาศ: { label: "โลกาวินาศจร", tone: "bad", desc: "สภาวะอารมณ์ภายในแปรปรวนลึกๆ มีเรื่องคาดไม่ถึงพลิกผันให้แก้ไข แนะนำให้รักษาความนิ่ง ปรับตัวตามสถานการณ์ และไม่แบกความเครียดไว้คนเดียว" }
};

export default function HoroscopePage() {
  const {
    profile,
    reports,
    history,
    customers,
    activeSubject,
    personLimit,
    hasReachedLimit,
    isProLocked,
    initialResult,
  } = useLoaderData<typeof loader>();
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

  // ── ระบบจัดการ Tabs ย่อย (4 Tabs) ──
  const [activeTab, setActiveTab] = useState<"calc" | "chart" | "taksa" | "analysis">("analysis");

  // สกัดข้อมูลดวงดาวจรสำคัญเพื่อแสดงผลภาพรวม Personal Insight
  const taksaTransitMap = activeResult?.taksaMaha?.taksaTransit?.map || activeResult?.phopephumResult?.taksaTransit?.map;
  const sriStarNum = taksaTransitMap ? Number(Object.entries(taksaTransitMap).find(([_, b]) => b === "ศรี")?.[0] || 0) : 0;
  const dechStarNum = taksaTransitMap ? Number(Object.entries(taksaTransitMap).find(([_, b]) => b === "เดช")?.[0] || 0) : 0;
  const montriStarNum = taksaTransitMap ? Number(Object.entries(taksaTransitMap).find(([_, b]) => b === "มนตรี")?.[0] || 0) : 0;
  const kaliStarNum = taksaTransitMap ? Number(Object.entries(taksaTransitMap).find(([_, b]) => b === "กาลกิณี")?.[0] || 0) : 0;
  const ayuStarNum = taksaTransitMap ? Number(Object.entries(taksaTransitMap).find(([_, b]) => b === "อายุ")?.[0] || 0) : 0;
  const mulaStarNum = taksaTransitMap ? Number(Object.entries(taksaTransitMap).find(([_, b]) => b === "มูละ")?.[0] || 0) : 0;
  const currentYearThai = new Date(activeResult?.transitDate || new Date()).getFullYear() + 543;

  // Auto-fallback: ถ้าโหลดหน้าแรกแล้วไม่มี birth data (activeResult เป็น null) ให้สลับไปที่หน้ากรอกวันเดือนปีเกิด (calc)
  useEffect(() => {
    if (!activeResult) {
      setActiveTab("calc");
    }
  }, [activeResult]);

  // ── จัดการชื่อเจ้าชะตาแบบเรียลไทม์ ──
  const [subjectName, setSubjectName] = useState<string>(
    (initialResult as any)?.subjectName || (initialResult as any)?.customerName || profile?.display_name || "เจ้าชะตา"
  );
  const currentSubjectName = activeResult?.subjectName || activeResult?.customerName || subjectName || profile?.display_name || "เจ้าชะตา";
  const currentBirthPlace = activeResult?.birthPlace || profile?.birth_place || "กรุงเทพมหานคร";

  // ── ส่วนแชทพยากรณ์อัจฉริยะตามผังดวง พร้อมระบบบันทึกประวัติแยกตามเจ้าชะตา ──
  const [forecastMode, setForecastMode] = useState<"natal" | "transit">("transit");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // เลื่อนหน้าจอแชทลงล่างสุดอัตโนมัติ
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  // โหลดประวัติแชทเมื่อเปลี่ยนเจ้าชะตา
  useEffect(() => {
    let isCancelled = false;
    const cacheKey = `phopephum_chat_${currentSubjectName}`;
    
    // 1. โหลดจาก LocalStorage ก่อนเพื่อความรวดเร็ว
    try {
      const local = localStorage.getItem(cacheKey);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatMessages(parsed);
        }
      }
    } catch {}

    // 2. ดึงประวัติจาก API
    fetch(`/api/horoscope-chat-history?subjectName=${encodeURIComponent(currentSubjectName)}`)
      .then(res => res.json())
      .then((data: any) => {
        if (!isCancelled && data?.chats && Array.isArray(data.chats) && data.chats.length > 0) {
          const formatted: any[] = [];
          data.chats.forEach((c: any) => {
            formatted.push({
              sender: "user",
              text: c.question,
              time: new Date(c.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
            });
            formatted.push({
              sender: "ai",
              text: c.answer,
              time: new Date(c.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
            });
          });
          setChatMessages(formatted);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(formatted));
          } catch {}
        } else if (!isCancelled) {
          setChatMessages(prev => {
            if (prev.length > 0) return prev;
            return [
              {
                sender: "ai",
                text: `ยินดีต้อนรับสู่พื้นที่แชทพยากรณ์อัจฉริยะสำหรับดวงชะตาของ "${currentSubjectName}" ค่ะ 🔮 ท่านสามารถสอบถามเรื่องคดีความ การงาน การเงิน ความรัก หรือคลิกเลือกดาว/ทักษาบนผังดวงเพื่อตรวจดูคำพยากรณ์เฉพาะจุดได้เลยนะคะ`,
                time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
              }
            ];
          });
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [currentSubjectName]);

  const handleSendMessage = useCallback(async (msgToSend?: string) => {
    const text = (msgToSend || userInput).trim();
    if (!text || isChatLoading) return;

    setUserInput("");
    setIsChatLoading(true);

    const userMsg = {
      sender: "user",
      text,
      time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
    };

    const aiPlaceholder = {
      sender: "ai",
      text: "",
      isStreaming: true,
      time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages(prev => [...prev, userMsg, aiPlaceholder]);

    const historyContext = chatMessages
      .filter(m => m.text && !m.isStreaming)
      .slice(-6)
      .map(m => ({
        role: (m.sender === "user" ? "user" : "assistant") as "user" | "assistant",
        content: m.text,
      }));

    try {
      const res = await fetch("/api/horoscope-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          subjectName: currentSubjectName,
          birthDate: activeResult?.birthDate || profile?.birth_date || "1994-04-17",
          birthTime: activeResult?.birthTime || profile?.birth_time || "12:00",
          birthPlace: currentBirthPlace,
          transitDate: activeResult?.transitDate,
          transitTime: activeResult?.transitTime,
          filterType,
          filterValue,
          forecastMode,
          history: historyContext,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("ระบบ AI ไม่ตอบสนอง");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullAnswer = "";

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
            if (parsed.text) {
              fullAnswer += parsed.text;
              setChatMessages(prev => {
                const copy = [...prev];
                const lastIdx = copy.length - 1;
                if (lastIdx >= 0 && copy[lastIdx].sender === "ai") {
                  copy[lastIdx] = {
                    ...copy[lastIdx],
                    text: fullAnswer,
                    isStreaming: true,
                  };
                }
                return copy;
              });
            }
          } catch {}
        }
      }

      const finalCleanAnswer = fullAnswer.trim() || "ระบบได้วิเคราะห์ผังดวงของท่านเรียบร้อยแล้วค่ะ";
      
      setChatMessages(prev => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        if (lastIdx >= 0 && copy[lastIdx].sender === "ai") {
          copy[lastIdx] = {
            ...copy[lastIdx],
            text: finalCleanAnswer,
            isStreaming: false,
          };
        }
        try {
          localStorage.setItem(`phopephum_chat_${currentSubjectName}`, JSON.stringify(copy));
        } catch {}
        return copy;
      });

      // บันทึกคำถาม-คำตอบลงฐานข้อมูลในตาราง horoscope_chats เพื่อให้กลับมาทบทวนหรือถามต่อเนื่องได้
      fetch("/api/horoscope-chat-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectName: currentSubjectName,
          birthDate: activeResult?.birthDate || profile?.birth_date,
          question: text,
          answer: finalCleanAnswer,
          filterType: filterType || undefined,
          filterValue: filterValue ? String(filterValue) : undefined,
          forecastMode,
        }),
      }).catch(err => console.warn("Failed to persist horoscope chat:", err));

    } catch (err: any) {
      console.error("Chat error:", err);
      setChatMessages(prev => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        if (lastIdx >= 0 && copy[lastIdx].sender === "ai") {
          copy[lastIdx] = {
            ...copy[lastIdx],
            text: "ขออภัยค่ะ ระบบพยากรณ์กำลังประมวลผลผังดวงชะตาหนาแน่น กรุณาลองส่งข้อความใหม่อีกครั้งนะคะ",
            isStreaming: false,
          };
        }
        return copy;
      });
    } finally {
      setIsChatLoading(false);
    }
  }, [userInput, isChatLoading, currentSubjectName, activeResult, profile, currentBirthPlace, filterType, filterValue]);

  // ── ระบบ Filter เปิด/ปิด การแสดงผลสัญลักษณ์และภพเรือน ──
  const [showNatalLagna, setShowNatalLagna] = useState(true);
  const [showTransitLagna, setShowTransitLagna] = useState(true);
  const [showVayaJorn, setShowVayaJorn] = useState(false);
  const [showYearlyJorn, setShowYearlyJorn] = useState(false);
  const [showMonthlyJorn, setShowMonthlyJorn] = useState(false);
  const [showDailyJorn, setShowDailyJorn] = useState(false);
  const [showAgeRange, setShowAgeRange] = useState(false);
  const [showHouseNames, setShowHouseNames] = useState(true);
  const [showTaksaJorn, setShowTaksaJorn] = useState(false);
  const [showMahaJorn, setShowMahaJorn] = useState(false);

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
        birthTime: activeResult.birthTime || profile?.birth_time || "12:00",
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
  }, [activeResult?.birthDate, activeResult?.birthTime, profile]);

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

  const isWaxing = lunar?.moonPhase?.includes("ขึ้น");
  const moonPhaseText = lunar?.moonPhase || "แรม ๑ ค่ำ";
  const match = lunar?.moonPhase?.match(/\d+/);
  const lunarDay = match ? parseInt(match[0], 10) : 1;
  const brightness = isWaxing ? Math.round((lunarDay / 15) * 100) : Math.round(((15 - lunarDay) / 15) * 100);
  const brightnessText = `${brightness}%`;

  let lunarDescText = "จุดเริ่มต้น — ปลูกเมล็ดพันธุ์แห่งความตั้งใจใหม่";
  if (isWaxing) {
    if (lunarDay <= 5) lunarDescText = "ข้างขึ้นอ่อน — พลังงานแห่งการเติบโตและการสะสมโอกาส";
    else if (lunarDay <= 10) lunarDescText = "ข้างขึ้นปานกลาง — เหมาะแก่การลงมือทำและขับเคลื่อนแผนงาน";
    else lunarDescText = "จันทร์เพ็ญเต็มดวง — พลังงานบารมีสูงสุด เหมาะแก่งานมงคลและเจรจาสำเร็จ";
  } else {
    if (lunarDay <= 5) lunarDescText = "ข้างแรมอ่อน — ช่วงเวลาแห่งการทบทวนและสะสางอุปสรรค";
    else if (lunarDay <= 10) lunarDescText = "ข้างแรมปานกลาง — พึงใช้สติและความสงบในการตัดสินใจเรื่องสำคัญ";
    else lunarDescText = "จันทร์ดับ — ช่วงเวลาแห่งการถือศีล บำเพ็ญภาวนา และวางแผนภายใน";
  }

  const formattedTransitDate = activeResult?.transitDate
    ? new Date(activeResult.transitDate).toLocaleDateString("th-TH", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("th-TH", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  // ── Placeholder Matrix (7 columns x 9 rows) ──
  const placeholderMatrix = Array(9).fill(0).map(() => Array(7).fill(0));

  return (
    <div className="space-y-6 max-w-2xl pb-20 animate-fade-up w-full" style={{ overflowX: "hidden" }}>

      {/* ── แถบสลับและจัดการเจ้าชะตาแบบเรียลไทม์ (Active Subject Banner) ── */}
      {activeSubject && (
        <ActiveSubjectBanner
          currentSubject={{
            id: activeSubject.id,
            name: currentSubjectName,
            birthDate: activeResult?.birthDate || activeSubject.birthDate,
            birthTime: activeResult?.birthTime || activeSubject.birthTime,
            birthPlace: currentBirthPlace,
            isCustomer: activeSubject.isCustomer,
          }}
          customers={customers || []}
          profileName={profile?.display_name || "ฉัน (เจ้าของบัญชี)"}
          personLimit={personLimit}
          hasReachedLimit={hasReachedLimit}
        />
      )}

      {/* ── เมนูหลัก (Page Header) ── */}
      <div>
        <p className="text-[#D9BC82] text-xs tracking-widest uppercase mb-1 font-bold">
          ดวงดีมีชัย · ตรวจดวงชะตา {activeResult?.customerName ? `(ดวงชะตาของ ${activeResult.customerName})` : `(ดวงชะตาของ ${currentSubjectName})`}
        </p>
        <h1 className="font-display text-3xl font-bold text-[#F8F6F1]">
          เส้นทางชีวิต
        </h1>
        <p className="text-[#94A3B8] text-sm mt-1">
          {formattedTransitDate}
        </p>
      </div>

      {/* ── Sub-menu Card Navigation — บนสุด ── */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { id: "analysis", label: "ภาพรวมชีวิต & คำแนะนำ", renderIcon: () => <PhopephumScrollIcon className="w-5 h-5" />, desc: "จุดเด่น & จังหวะปีนี้" },
          { id: "chart", label: "ผังดวงจักรพรรดิ", renderIcon: () => <PhopephumMandalaIcon className="w-5 h-5" />, desc: "เลข 7 ตัว 9 ฐาน (Pro)" },
          { id: "taksa", label: "ทักษา / มหาภูติ", renderIcon: () => <PhopephumCompassIcon className="w-5 h-5" />, desc: "ผังพลังงานวิถีจร (Pro)" },
          { id: "calc", label: "ข้อมูลวันเกิด", renderIcon: () => <PhopephumCalculateIcon className="w-5 h-5" />, desc: "เปลี่ยนข้อมูลวันเกิด" },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id !== "calc" && !activeResult) {
                  alert("กรุณากรอกและคำนวณดวงชะตาก่อนนะคะ เพื่อการแสดงผังที่ถูกต้องค่ะ");
                  return;
                }
                setActiveTab(tab.id as any);
              }}
              className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all duration-300 min-h-[56px] text-left hover:scale-[1.01] active:scale-[0.99] ${
                isSelected
                  ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] border-[#C6A96B] text-[#020617] shadow-md shadow-[#C6A96B]/20 font-bold"
                  : "bg-white/90 border-slate-200/90 text-slate-700 hover:text-slate-900 hover:border-[#C6A96B]/50 hover:bg-white dark:bg-[#0A2240]/45 dark:border-white/5 dark:text-[#C6B79F] dark:hover:text-[#F8F6F1] dark:hover:border-[#C6A96B]/25 shadow-sm"
              }`}
            >
              <span className={`shrink-0 ${isSelected ? "text-[#020617]" : "text-[#8C6D2D] dark:text-[#C6A96B]"}`}>
                {tab.renderIcon()}
              </span>
              <div className="flex flex-col min-w-0">
                <span className={`text-sm font-bold leading-tight ${isSelected ? "text-[#020617]" : "text-slate-900 dark:text-[#F8F6F1]"}`}>
                  {tab.label}
                </span>
                <span className={`text-[13px] mt-0.5 leading-tight ${isSelected ? "text-[#020617]/80" : "text-slate-500 dark:text-[#C6B79F]"}`}>
                  {tab.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: คำนวณดวงชะตา ── */}
      {activeTab === "calc" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* ── ประวัติการวิเคราะห์ล่าสุด (Sticky History) ── */}
          {history && history.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
              <p className="text-[#C6A96B] text-[13px] tracking-[0.2em] uppercase font-bold mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C6A96B]" />
                ดวงชะตาที่วิเคราะห์ล่าสุด
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {history.map((h: any) => (
                  <div
                    key={h.id}
                    onClick={() => {
                      const sName = h.result_data?.subjectName || h.input_data?.subjectName || h.result_data?.customerName || h.input_data?.customerName || profile?.display_name || "เจ้าชะตา";
                      setSubjectName(sName);
                      setActiveResult({
                        ...h.result_data,
                        subjectName: sName,
                        customerName: sName,
                        birthDate: h.input_data?.birthDate || h.result_data?.birthDate,
                        birthTime: h.input_data?.birthTime || h.result_data?.birthTime,
                        birthPlace: h.input_data?.birthPlace || h.result_data?.birthPlace,
                      });
                      setActiveTab("chart");
                    }}
                    className="cursor-pointer group hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    <Card className="border-[#C6A96B]/10 p-4 bg-slate-950/20 group-hover:border-[#C6A96B]/30 transition-all flex flex-col gap-1.5">
                      <p className="text-[14px] font-bold text-[#F8F6F1] truncate">
                        👤 {h.result_data?.subjectName || h.input_data?.subjectName || h.result_data?.customerName || profile?.display_name || "เจ้าชะตา"}
                      </p>
                      <p className="text-xs text-[#C6A96B] truncate">
                        ✨ {h.result_data?.nineBase?.lunarDate?.thaiDateText ?? "คำนวณสด"}
                      </p>
                      <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/5">
                         <span className="text-[12px] text-[#94A3B8]">
                           {new Date(h.created_at).toLocaleDateString("th-TH")}
                         </span>
                         <span className="text-[12px] text-[#C9A96E] font-bold">ใช้ข้อมูลนี้ ➔</span>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Form ── */}
          <Card className="border-[#C9A96E]/20 bg-slate-900/40 backdrop-blur-md">
            <Form 
              method="post" 
              className="space-y-6"
              onSubmit={() => {
                // เปลี่ยนหน้าไปแท็บ 2 อัตโนมัติเมื่อกดคำนวณสำเร็จ
                setTimeout(() => {
                  setActiveTab("chart");
                }, 1000);
              }}
            >
              {/* ส่วนที่ 1: วันกำเนิด */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#C9A96E]/15 pb-2">
                  <span className="text-xs text-[#C9A96E] font-bold uppercase tracking-wider">วันกำเนิด (วันเกิด)</span>
                  {customers && customers.length > 0 && (
                    <select 
                      className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#C9A96E] rounded px-2 py-1 text-[13px] outline-none"
                      onChange={async (e) => {
                        const cust = customers.find((c: any) => c.id === e.target.value);
                        if (cust) {
                          setSubjectName(cust.name);
                          const dSel = document.querySelector('select[name="birthDay"]') as unknown as HTMLSelectElement | null;
                          const mSel = document.querySelector('select[name="birthMonth"]') as unknown as HTMLSelectElement | null;
                          const ySel = document.querySelector('select[name="birthYear"]') as unknown as HTMLSelectElement | null;
                          const timeInput = document.querySelector('input[name="birthTime"]') as HTMLInputElement;
                          const placeInput = document.querySelector('input[name="birthPlace"]') as HTMLInputElement;
                          const nameInput = document.querySelector('input[name="customerName"]') as HTMLInputElement;
                          
                          if (cust.birth_date) {
                            const [y, m, d] = cust.birth_date.split('-');
                            if (dSel) dSel.value = parseInt(d, 10).toString();
                            if (mSel) mSel.value = parseInt(m, 10).toString();
                            if (ySel) ySel.value = (parseInt(y, 10) + 543).toString();
                          }
                          if (timeInput) timeInput.value = cust.birth_time || '';
                          if (placeInput) placeInput.value = cust.birth_place || '';
                          if (nameInput) nameInput.value = cust.name || '';

                          // คำนวณผังดวงสดให้ทันที พร้อมอัปเดตชื่อเจ้าชะตา
                          try {
                            const bTime = cust.birth_time || "12:00";
                            const bPlace = cust.birth_place || "กรุงเทพมหานคร";
                            const checkDate = new Date();
                            const res = await calculatePhopephum({
                              birthDate: cust.birth_date,
                              birthTime: bTime,
                              birthPlace: bPlace,
                            }, checkDate);

                            const bTimeStr = bTime.slice(0, 5);
                            const bDateObj = new Date(`${cust.birth_date}T${bTimeStr}:00+07:00`);
                            const birthYamResult = getYamPrediction(bDateObj);

                            setActiveResult({
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
                              birthDate: cust.birth_date,
                              birthTime: bTime,
                              birthPlace: bPlace,
                              subjectName: cust.name,
                              customerName: cust.name,
                              transitDate: checkDate.toISOString().split("T")[0],
                              transitTime: "12:00",
                              lagnaNakshatra: calculateLagnaNakshatra(cust.birth_date, bTime),
                              birthYamResult,
                            });
                            setActiveTab("chart");
                          } catch (err) {
                            console.error("Auto calculation for customer failed:", err);
                          }
                        } else {
                          setSubjectName(profile?.display_name || "เจ้าชะตา");
                        }
                      }}
                    >
                      <option value="">-- เลือกลูกค้าที่บันทึกไว้ --</option>
                      {customers.map((c: any) => (
                        <option key={c.id} value={c.id} className="bg-[#020617]">{c.name}</option>
                      ))}
                    </select>
                  )}
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
                
                {/* Save Customer Checkbox */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex items-center gap-1.5">
                    <input type="checkbox" name="saveCustomer" id="saveCustomer" className="w-3.5 h-3.5 accent-[#C9A96E] rounded cursor-pointer" />
                    <label htmlFor="saveCustomer" className="text-[14px] text-[#94A3B8] cursor-pointer">บันทึกเป็นลูกค้าใหม่</label>
                  </div>
                  <input 
                    type="text" 
                    name="customerName" 
                    value={subjectName !== (profile?.display_name || "เจ้าชะตา") ? subjectName : ""}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="ชื่อลูกค้า (สำหรับบันทึก)..." 
                    className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded px-2.5 py-1.5 text-[14px] outline-none focus:border-[#C9A96E]/50 flex-1 max-w-[200px]" 
                  />
                </div>
              </div>

              {/* ส่วนที่ 2: วันจร (ทำนาย) — PRO+ เท่านั้น */}
              {isProLocked ? (
                <div className="pt-4 border-t border-white/5">
                  <UpgradePaywall featureName="ระบบจร (วัยจร / ปีจร)" description="ปลดล็อกระบบคำนวณดวงจรวันจรแบบเต็มสำหรับสมาชิก PRO ขึ้นไป" />
                </div>
              ) : (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between border-b border-[#C9A96E]/15 pb-2">
                    <span className="text-xs text-[#C9A96E] font-bold uppercase tracking-wider">วันจร (ทำนาย) <span className="text-[12px] font-normal lowercase ml-1">(เปลี่ยนค่าเพื่อดูผลแบบเรียลไทม์)</span></span>
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
                        
                        triggerRealtimeUpdate();
                      }}
                      className="text-[13px] font-bold border border-[#C9A96E]/40 text-[#C9A96E] px-2.5 py-1 rounded-md hover:bg-[#C9A96E]/10 transition-all"
                    >
                      ใช้เวลาขณะนี้
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* วันจร พ.ศ. Dropdown */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">วันที่จร (พ.ศ.) *</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <select name="transitDay" onChange={triggerRealtimeUpdate} defaultValue={defaultTDay} className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-2.5 py-2.5 text-xs focus:border-[#C9A96E]/50 outline-none">
                          {Array.from({ length: 31 }).map((_, i) => (
                            <option key={i + 1} value={i + 1} className="bg-[#020617]">{i + 1}</option>
                          ))}
                        </select>
                        <select name="transitMonth" onChange={triggerRealtimeUpdate} defaultValue={defaultTMonth} className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-2.5 py-2.5 text-xs focus:border-[#C9A96E]/50 outline-none">
                          {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => (
                            <option key={i + 1} value={i + 1} className="bg-[#020617]">{m}</option>
                          ))}
                        </select>
                        <select name="transitYear" onChange={triggerRealtimeUpdate} defaultValue={defaultTYear} className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-2.5 py-2.5 text-xs focus:border-[#C9A96E]/50 outline-none">
                          {Array.from({ length: 30 }).map((_, i) => {
                            const y = new Date().getFullYear() + 543 + 10 - i;
                            return <option key={y} value={y} className="bg-[#020617]">{y}</option>;
                          })}
                        </select>
                      </div>
                    </div>

                    <Input name="transitTime" type="time" label="เวลาที่จร" onChange={triggerRealtimeUpdate} defaultValue={activeResult?.transitTime ?? `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`} />
                    <Input name="transitPlace" label="จังหวัดที่จร" defaultValue={activeResult?.transitPlace ?? "กรุงเทพมหานคร"} placeholder="กรุงเทพมหานคร" />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button type="submit" loading={isLoading} className="w-full md:w-auto px-12 h-[46px]">
                  คำนวณและบันทึกดวงชะตา
                </Button>
              </div>
            </Form>
          </Card>
        </div>
      )}

      {/* ── TAB 2: ผังดวงชะตา + Filter + พื้นที่แชทตรวจดวงชะตาตาม Filter ── */}
      {activeTab === "chart" && activeResult?.matrix && (
        <div className="space-y-6 animate-in fade-in duration-300">

          {/* ── ข้อมูลเจ้าชะตา (ด้านบนสุดของผัง) ── */}
          {activeResult?.birthDate && (
            <div className="relative rounded-2xl border border-slate-200 dark:border-[#C6A96B]/30 bg-gradient-to-r from-[#F5F0ED] via-white to-[#F5F0ED] dark:from-[#0A2240]/70 dark:via-[#0A1628]/80 dark:to-[#0A2240]/70 backdrop-blur-xl px-5 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] overflow-hidden">
              {/* Glow bg */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#C6A96B]/5 via-transparent to-[#4B6FAE]/5 pointer-events-none" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-[#C6A96B]/40 to-transparent" />

              <div className="relative z-10 space-y-3">
                {/* แถวบน: Moon Phase + วันที่จร */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#C6A96B]/15">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-950/40 flex items-center justify-center text-xl border border-slate-300 dark:border-[#C6A96B]/20 shadow-[0_0_12px_rgba(198,169,107,0.1)] dark:shadow-[0_0_12px_rgba(198,169,107,0.2)] select-none shrink-0">
                      {isWaxing ? "🌕" : "🌑"}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-slate-900 dark:text-[#F8F6F1] font-extrabold text-base leading-tight flex flex-wrap items-center gap-1.5">
                        <span>{moonPhaseText}</span>
                        <span className="text-[#A68444] dark:text-[#C6A96B] text-xs font-normal border border-[#A68444]/25 dark:border-[#C6A96B]/25 px-1.5 py-[0.5px] rounded-md bg-[#A68444]/5 dark:bg-[#C6A96B]/5">
                          {(() => {
                            const m = lunar?.lunarMonthName || lunar?.lunarMonth;
                            const mStr = m ? (String(m).startsWith("เดือน") ? m : `เดือน ${m}`) : "";
                            return `${mStr} ปี ${lunar?.zodiacName || ''}`.trim();
                          })()}
                        </span>
                      </span>
                      <span className="text-slate-500 dark:text-[#C6B79F] text-xs italic leading-tight">{lunarDescText}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-3 border-l border-slate-200 dark:border-white/10">
                    <span className="text-[#A68444] dark:text-[#C6A96B] font-display font-extrabold text-xl leading-tight block">{brightnessText}</span>
                    <span className="text-slate-500 dark:text-[#C6B79F] text-xs uppercase tracking-widest font-bold">ความสว่าง</span>
                    <span className="text-xs text-slate-500 dark:text-[#C6B79F] block mt-0.5">{formattedTransitDate}</span>
                  </div>
                </div>

                {/* แถวกลาง: ชื่อเจ้าชะตา + ข้อมูลเกิด */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  {/* ชื่อ */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#A68444]/70 dark:text-[#C6A96B]/70">เจ้าชะตา</span>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-2xl font-extrabold text-slate-900 dark:text-[#F8F6F1] leading-tight">
                        {currentSubjectName}
                      </span>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl border border-slate-300 dark:border-[#C6A96B]/30 hover:border-[#C6A96B] bg-slate-100 dark:bg-[#C6A96B]/10 text-slate-800 dark:text-[#C6A96B] hover:text-black dark:hover:text-[#F8F6F1] transition-all text-xs font-semibold shadow-sm"
                        title="พิมพ์หรือบันทึกผังดวงเป็น PDF"
                      >
                        <span>🖨️</span>
                        <span className="hidden sm:inline">พิมพ์ / PDF ผังดวง</span>
                      </button>
                    </div>
                  </div>

                  {/* ข้อมูลเกิด */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 md:justify-end text-xs sm:text-sm">
                    {/* วันเกิด */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#A68444] dark:text-[#C6A96B]">#</span>
                      <span className="text-slate-500 dark:text-[#C6B79F]">วันเกิด</span>
                      <span className="text-slate-900 dark:text-[#F8F6F1] font-semibold">
                        {(() => {
                          const d = new Date(activeResult.birthDate);
                          return d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
                        })()}
                      </span>
                    </div>
                    {/* เวลาเกิด */}
                    {(activeResult?.birthTime || profile?.birth_time) && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#A68444] dark:text-[#C6A96B]">◷</span>
                        <span className="text-slate-500 dark:text-[#C6B79F]">เวลาเกิด</span>
                        <span className="text-slate-900 dark:text-[#F8F6F1] font-semibold">{activeResult?.birthTime || profile?.birth_time} น.</span>
                      </div>
                    )}
                    {/* จังหวัดเกิด */}
                    {(activeResult?.birthPlace || profile?.birth_place) && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#A68444] dark:text-[#C6A96B]">@</span>
                        <span className="text-slate-500 dark:text-[#C6B79F]">จังหวัด</span>
                        <span className="text-slate-900 dark:text-[#F8F6F1] font-semibold">{currentBirthPlace}</span>
                      </div>
                    )}
                    {/* อายุย่าง */}
                    {currentAge > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#A68444] dark:text-[#C6A96B]">·</span>
                        <span className="text-slate-500 dark:text-[#C6B79F]">อายุย่าง</span>
                        <span className="text-[#A68444] dark:text-[#C6A96B] font-extrabold font-display">{currentAge} ปี</span>
                      </div>
                    )}
                    {/* วันจันทรคติเกิด */}
                    {lunar?.dayName && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#A68444] dark:text-[#C6A96B]">☽</span>
                        <span className="text-slate-500 dark:text-[#C6B79F]">จันทรคติเกิด</span>
                        <span className="text-slate-900 dark:text-[#F8F6F1] font-semibold">
                          วัน{lunar.dayName} {(() => {
                            const m = lunar.lunarMonthName ?? lunar.lunarMonth;
                            return m ? (String(m).startsWith("เดือน") ? m : `เดือน${m}`) : "";
                          })()} ปี{lunar.zodiacName ?? ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Chart Display Config (ด้านบนผัง) ── */}
          <Card className="border-slate-200 dark:border-[#C9A96E]/20 bg-white/80 dark:bg-slate-950/40 backdrop-blur-md p-4 space-y-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#C9A96E] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C9A96E]" />
                ตัวเลือกการแสดงผลสัญลักษณ์ผังดวง (Chart Display Config)
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 text-xs sm:text-sm">
              <button
                type="button"
                onClick={() => setShowNatalLagna(!showNatalLagna)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  showNatalLagna ? "bg-[#C6A96B]/15 border-[#C6A96B]/50 text-slate-900 dark:text-[#F8F6F1] font-bold" : "bg-black/[0.02] dark:bg-transparent border-black/10 dark:border-white/5 text-slate-700 dark:text-[#C6B79F] hover:border-[#C6A96B]/40"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black bg-gradient-to-br from-[#F5E2B3] via-[#C6A96B] to-[#9A7D3C] text-[#020617] px-1.5 py-[0.5px] rounded shadow-[0_0_8px_rgba(198,169,107,0.7)] border border-[#F5E2B3]/60 leading-none">ล</span>
                  <span>ลัคนาเกิด</span>
                </span>
                <span className={`w-2 h-2 rounded-full transition-all ${showNatalLagna ? "bg-[#C6A96B] shadow-[0_0_8px_#C6A96B]" : "bg-slate-300 dark:bg-white/10 border border-slate-400/30 dark:border-transparent"}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowTransitLagna(!showTransitLagna)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  showTransitLagna ? "bg-[#3B82F6]/15 border-[#3B82F6]/50 text-slate-900 dark:text-[#F8F6F1] font-bold" : "bg-black/[0.02] dark:bg-transparent border-black/10 dark:border-white/5 text-slate-700 dark:text-[#C6B79F] hover:border-[#3B82F6]/40"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black bg-gradient-to-br from-[#93C5FD] via-[#3B82F6] to-[#1D4ED8] text-white px-1.5 py-[0.5px] rounded shadow-[0_0_8px_rgba(59,130,246,0.7)] border border-[#93C5FD]/60 leading-none animate-pulse">ลจ</span>
                  <span>ลัคนาจร</span>
                </span>
                <span className={`w-2 h-2 rounded-full transition-all ${showTransitLagna ? "bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]" : "bg-slate-300 dark:bg-white/10 border border-slate-400/30 dark:border-transparent"}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowTaksaJorn(!showTaksaJorn)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  showTaksaJorn ? "bg-amber-500/15 border-amber-500/50 text-slate-900 dark:text-[#F8F6F1] font-bold" : "bg-black/[0.02] dark:bg-transparent border-black/10 dark:border-white/5 text-slate-700 dark:text-[#C6B79F] hover:border-amber-500/40"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-[0.5px] rounded border border-amber-500/40 leading-none">ท</span>
                  <span>ทักษาจร (มุมล่างขวา)</span>
                </span>
                <span className={`w-2 h-2 rounded-full transition-all ${showTaksaJorn ? "bg-amber-400 shadow-[0_0_8px_#F59E0B]" : "bg-slate-300 dark:bg-white/10 border border-slate-400/30 dark:border-transparent"}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowMahaJorn(!showMahaJorn)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  showMahaJorn ? "bg-violet-500/15 border-violet-500/50 text-slate-900 dark:text-[#F8F6F1] font-bold" : "bg-black/[0.02] dark:bg-transparent border-black/10 dark:border-white/5 text-slate-700 dark:text-[#C6B79F] hover:border-violet-500/40"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-violet-300 bg-violet-500/20 px-1.5 py-[0.5px] rounded border border-violet-500/40 leading-none">ม</span>
                  <span>มหาภูติจร (มุมล่างซ้าย)</span>
                </span>
                <span className={`w-2 h-2 rounded-full transition-all ${showMahaJorn ? "bg-violet-400 shadow-[0_0_8px_#8B5CF6]" : "bg-slate-300 dark:bg-white/10 border border-slate-400/30 dark:border-transparent"}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowVayaJorn(!showVayaJorn)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  showVayaJorn ? "bg-[#C6A96B]/15 border-[#C6A96B]/50 text-slate-900 dark:text-[#F8F6F1] font-bold" : "bg-black/[0.02] dark:bg-transparent border-black/10 dark:border-white/5 text-slate-700 dark:text-[#C6B79F] hover:border-[#C6A96B]/40"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black px-1.5 py-[0.5px] rounded bg-[#C6A96B] text-[#020617] leading-none shadow-[0_0_6px_rgba(198,169,107,0.5)]">วัย</span>
                  <span>วัยจร</span>
                </span>
                <span className={`w-2 h-2 rounded-full transition-all ${showVayaJorn ? "bg-[#C6A96B] shadow-[0_0_8px_#C6A96B]" : "bg-slate-300 dark:bg-white/10 border border-slate-400/30 dark:border-transparent"}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowYearlyJorn(!showYearlyJorn)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  showYearlyJorn ? "bg-[#3B82F6]/15 border-[#3B82F6]/50 text-slate-900 dark:text-[#F8F6F1] font-bold" : "bg-black/[0.02] dark:bg-transparent border-black/10 dark:border-white/5 text-slate-700 dark:text-[#C6B79F] hover:border-[#3B82F6]/40"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black px-1.5 py-[0.5px] rounded bg-[#3B82F6] text-white leading-none shadow-[0_0_6px_rgba(59,130,246,0.5)]">ปี</span>
                  <span>ปีจร</span>
                </span>
                <span className={`w-2 h-2 rounded-full transition-all ${showYearlyJorn ? "bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]" : "bg-slate-300 dark:bg-white/10 border border-slate-400/30 dark:border-transparent"}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowMonthlyJorn(!showMonthlyJorn)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  showMonthlyJorn ? "bg-[#06B6D4]/15 border-[#06B6D4]/50 text-slate-900 dark:text-[#F8F6F1] font-bold" : "bg-black/[0.02] dark:bg-transparent border-black/10 dark:border-white/5 text-slate-700 dark:text-[#C6B79F] hover:border-[#06B6D4]/40"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black px-1.5 py-[0.5px] rounded bg-[#06B6D4] text-[#020617] leading-none shadow-[0_0_6px_rgba(6,182,212,0.5)]">ด</span>
                  <span>เดือนจร</span>
                </span>
                <span className={`w-2 h-2 rounded-full transition-all ${showMonthlyJorn ? "bg-[#06B6D4] shadow-[0_0_8px_rgba(6,182,212,0.6)]" : "bg-slate-300 dark:bg-white/10 border border-slate-400/30 dark:border-transparent"}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowDailyJorn(!showDailyJorn)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  showDailyJorn ? "bg-[#10B981]/15 border-[#10B981]/50 text-slate-900 dark:text-[#F8F6F1] font-bold" : "bg-black/[0.02] dark:bg-transparent border-black/10 dark:border-white/5 text-slate-700 dark:text-[#C6B79F] hover:border-[#10B981]/40"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black px-1.5 py-[0.5px] rounded bg-[#10B981] text-white leading-none shadow-[0_0_6px_rgba(16,185,129,0.5)]">ว</span>
                  <span>วันจร</span>
                </span>
                <span className={`w-2 h-2 rounded-full transition-all ${showDailyJorn ? "bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-slate-300 dark:bg-white/10 border border-slate-400/30 dark:border-transparent"}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowAgeRange(!showAgeRange)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  showAgeRange ? "bg-[#C9A96E]/15 border-[#C9A96E]/50 text-slate-900 dark:text-[#F8F6F1] font-bold" : "bg-black/[0.02] dark:bg-transparent border-black/10 dark:border-white/5 text-slate-700 dark:text-[#C6B79F] hover:border-[#C9A96E]/40"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#C6A96B]/50" />
                  <span>ช่วงอายุ (วัยจร)</span>
                </span>
                <span className={`w-2 h-2 rounded-full transition-all ${showAgeRange ? "bg-[#C6A96B]/70" : "bg-slate-300 dark:bg-white/10 border border-slate-400/30 dark:border-transparent"}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowHouseNames(!showHouseNames)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  showHouseNames ? "bg-[#C9A96E]/15 border-[#C9A96E]/50 text-slate-900 dark:text-[#F8F6F1] font-bold" : "bg-black/[0.02] dark:bg-transparent border-black/10 dark:border-white/5 text-slate-700 dark:text-[#C6B79F] hover:border-[#C9A96E]/40"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#C6A96B]/60" />
                  <span>ชื่อภพเรือน (35 ภพ)</span>
                </span>
                <span className={`w-2 h-2 rounded-full transition-all ${showHouseNames ? "bg-[#C9A96E] shadow-[0_0_8px_#C9A96E]" : "bg-slate-300 dark:bg-white/10 border border-slate-400/30 dark:border-transparent"}`} />
              </button>
            </div>
          </Card>

          {/* ผังดวงจักรพรรดิเลข 7 ตัว 9 ฐาน */}
          <FateMatrixPanel
            matrix={activeResult.matrix}
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
            taksaMaha={activeResult.taksaMaha}
            phopephumResult={activeResult.phopephumResult}
            highlightedStars={highlightedStars}
            isFiltering={isFiltering}
            showNatalLagna={showNatalLagna}
            showTransitLagna={showTransitLagna}
            showVayaJorn={showVayaJorn}
            showYearlyJorn={showYearlyJorn}
            showMonthlyJorn={showMonthlyJorn}
            showDailyJorn={showDailyJorn}
            showAgeRange={showAgeRange}
            showHouseNames={showHouseNames}
            showTaksaJorn={showTaksaJorn}
            showMahaJorn={showMahaJorn}
          />

          {/* ── [ยกระดับ!] พื้นที่แชทตรวจดวงชะตาสดตาม Filter และผังดวงจริง ── */}
          <Card className="border-[#C9A96E]/20 bg-[#0A2240]/40 backdrop-blur-md p-5 space-y-4 rounded-2xl relative overflow-hidden">
            {/* Background Aura */}
            <div className="absolute inset-0 bg-radial-gradient from-[#4B6FAE]/5 via-transparent to-transparent pointer-events-none" />
            
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#C9A96E]/15 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C9A96E] animate-ping" />
                <span className="text-xs text-[#C9A96E] font-bold uppercase tracking-wider">
                  พื้นที่แชทตรวจดวงชะตาสด (AI Chat Assistant)
                </span>
                <span className="bg-[#C6A96B]/15 text-[#C6A96B] border border-[#C6A96B]/30 text-[11px] px-2 py-0.5 rounded-full font-semibold">
                  {currentSubjectName}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#C6B79F]">
                <span>Wisdom Guidance วิเคราะห์ตามผังดวงจริง</span>
                {chatMessages.length > 1 && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`ต้องการล้างประวัติการสนทนาของ "${currentSubjectName}" หรือไม่?`)) {
                        setChatMessages([]);
                        try {
                          localStorage.removeItem(`phopephum_chat_${currentSubjectName}`);
                          await fetch(`/api/horoscope-chat-history?subjectName=${encodeURIComponent(currentSubjectName)}`, {
                            method: "DELETE",
                          });
                        } catch {}
                      }
                    }}
                    className="text-[11px] text-red-400/80 hover:text-red-300 underline ml-2"
                  >
                    ล้างประวัติ
                  </button>
                )}
              </div>
            </div>

            {/* ── [ยกระดับ!] ปุ่มเลือกโหมดการพยากรณ์: ดวงจร vs พื้นดวงเดิม ── */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-slate-950/60 rounded-xl border border-[#C6A96B]/20">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-[#C6B79F] font-semibold pl-1 pr-0.5">เลือกโหมด:</span>
                <button
                  type="button"
                  onClick={() => setForecastMode("transit")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    forecastMode === "transit"
                      ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-md ring-1 ring-[#C6A96B]"
                      : "text-[#C6B79F] hover:text-[#F8F6F1] hover:bg-white/5"
                  }`}
                >
                  <span>⚡</span>
                  <span>อ่านดวงแบบจร (Transit Dynamics)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForecastMode("natal")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    forecastMode === "natal"
                      ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-md ring-1 ring-[#C6A96B]"
                      : "text-[#C6B79F] hover:text-[#F8F6F1] hover:bg-white/5"
                  }`}
                >
                  <span>🏛️</span>
                  <span>อ่านพื้นดวงเดิม (Natal Destiny)</span>
                </button>
              </div>
              <span className="text-[11px] text-[#D9BC82]/80 italic px-2">
                {forecastMode === "transit" 
                  ? "✦ เจาะลึก วัยจร/ปีจร/ลัคนาจร ด้วยพลังฐาน ๔ และดาวย้ำลูกโซ่" 
                  : "✦ วิเคราะห์ศักยภาพ วาสนาบารมี และจุดเปราะบางประจำตัว"}
              </span>
            </div>

            {/* Quick Suggestion Chips (คำถามเชิงสนทนาในชีวิตจริง) */}
            <div className="flex flex-wrap gap-1.5 pb-1">
              {(forecastMode === "transit" ? [
                { label: "🌟 ภาพรวมจังหวะชีวิตและโอกาสในปีนี้", q: "ภาพรวมจังหวะชีวิตและโอกาสสำคัญในช่วงปีนี้เป็นอย่างไรบ้าง" },
                { label: "💰 การเงินและสภาพคล่องในช่วงนี้", q: "กระแสการเงินและช่องทางสร้างรายได้ในช่วงนี้มีทิศทางอย่างไร" },
                { label: "💼 ทิศทางการงานและโปรเจกต์ใหม่", q: "ทิศทางการงานและการตัดสินใจเรื่องงานในช่วงนี้ควรเดินหน้าอย่างไร" },
                { label: "⚖️ แนวทางคลี่คลายข้อพิพาทหรือคดีความ", q: "ข้อพิพาท คดีความ หรืออุปสรรคที่มีอยู่ มีแนวโน้มคลี่คลายอย่างไรและควรรับมืออย่างไร" },
                { label: "💖 ความรักและความสัมพันธ์", q: "ความรักและสายสัมพันธ์กับคนใกล้ชิดในช่วงนี้เป็นอย่างไร" },
              ] : [
                { label: "🌟 ศักยภาพและจุดเด่นประจำตัว", q: "วิเคราะห์ศักยภาพ วาสนา และจุดเด่นประจำตัวตามพื้นดวงเดิม" },
                { label: "💼 อาชีพและธุรกิจที่ถูกโฉลก", q: "อาชีพหรือรูปแบบธุรกิจที่สอดคล้องกับพื้นดวงชะตาที่สุด" },
                { label: "💰 คลังสมบัติและวิธีเก็บทรัพย์", q: "โอกาสในการสร้างความมั่นคงทางการเงินและการบริหารทรัพย์สิน" },
                { label: "💖 ลักษณะเนื้อคู่ตามพื้นชะตา", q: "ลักษณะเนื้อคู่และเกณฑ์คู่ครองตามพื้นดวงเดิม" },
                { label: "🛡️ แนวทางเสริมดวงและความสงบใจ", q: "ข้อควรระวังประจำตัวและแนวทางเสริมพลังบารมีให้ชีวิตราบรื่น" },
              ]).map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isChatLoading}
                  onClick={() => handleSendMessage(chip.q)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-white/10 hover:border-[#C6A96B]/50 bg-slate-950/40 hover:bg-[#C6A96B]/10 text-[#C6B79F] hover:text-[#F8F6F1] transition-all disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>
            
            {/* กล่องประวัติแชท */}
            <div className="space-y-3.5 max-h-[360px] overflow-y-auto p-4 bg-slate-950/70 rounded-2xl border border-white/5 shadow-inner">
              {chatMessages.map((msg, index) => {
                // จัดรูปแบบข้อความให้อ่านง่าย แปลง **หัวข้อ** เป็นตัวหนาและตัด ** ออก
                const formattedText = msg.text ? (
                  <div className="space-y-2">
                    {msg.text.split("\n\n").map((para: string, pIdx: number) => {
                      const trimmed = para.trim();
                      if (!trimmed) return null;
                      
                      // ตรวจสอบว่าพารากราฟเริ่มต้นด้วยหัวข้อตัวหนาหรือไม่ เช่น **ประเด็นสำคัญ**
                      const headerMatch = trimmed.match(/^\*\*([^*]+)\*\*\s*([\s\S]*)$/);
                      if (headerMatch) {
                        return (
                          <div key={pIdx} className="space-y-1">
                            <h4 className="font-bold text-[#C6A96B] text-xs sm:text-sm">
                              {headerMatch[1]}
                            </h4>
                            {headerMatch[2] && (
                              <p className="text-slate-100 dark:text-[#F8F6F1] leading-relaxed">
                                {headerMatch[2].replace(/\*\*([^*]+)\*\*/g, "$1")}
                              </p>
                            )}
                          </div>
                        );
                      }
                      
                      return (
                        <p key={pIdx} className="leading-relaxed">
                          {trimmed.replace(/\*\*([^*]+)\*\*/g, "$1")}
                        </p>
                      );
                    })}
                  </div>
                ) : null;

                return (
                  <div key={index} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                    <div className={`max-w-[90%] md:max-w-[82%] rounded-2xl px-4 py-3 text-xs sm:text-[13px] leading-relaxed ${
                      msg.sender === "user" 
                        ? "bg-gradient-to-br from-[#C6A96B] to-[#D9BC82] text-[#020617] font-semibold rounded-tr-none shadow-md" 
                        : "bg-[#0A2240]/80 border border-[#C6A96B]/20 text-[#F8F6F1] rounded-tl-none shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
                    }`}>
                      {formattedText || (msg.isStreaming ? (
                        <span className="flex items-center gap-2 text-[#C6A96B] italic animate-pulse">
                          <span>🔮</span>
                          <span>กำลังประมวลผลดวงชะตาของ {currentSubjectName}...</span>
                        </span>
                      ) : "")}
                    </div>
                    <span className="text-[11px] text-[#C6B79F]/70 mt-1 px-1">{msg.time}</span>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* กล่องกรอกข้อมูลเพื่อพูดคุย */}
            <div className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                disabled={isChatLoading}
                placeholder={`สอบถามคำทำนายเพิ่มเติมเกี่ยวกับดวงชะตาของ ${currentSubjectName}...`}
                className="flex-1 bg-slate-950/50 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-4 py-2.5 text-xs sm:text-[13px] focus:border-[#C9A96E]/60 outline-none disabled:opacity-50"
                onKeyDown={e => {
                  if (e.key === "Enter" && userInput.trim() && !isChatLoading) {
                    handleSendMessage();
                  }
                }}
              />
              <button
                type="button"
                disabled={isChatLoading || !userInput.trim()}
                onClick={() => handleSendMessage()}
                className="bg-[#C9A96E] hover:bg-[#C9A96E]/90 disabled:opacity-50 text-[#020617] font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-[0_4px_12px_rgba(198,169,107,0.2)] shrink-0 flex items-center gap-1.5"
              >
                {isChatLoading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>กำลังตรวจดวง...</span>
                  </>
                ) : (
                  <span>ส่งคำถาม ➔</span>
                )}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 3: ผังทักษา/มหาภูติ ── */}
      {activeTab === "taksa" && activeResult?.taksaMaha && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <TaksaMahaSection
            taksaMaha={activeResult.taksaMaha}
            birthYearThai={new Date(activeResult.birthDate).getFullYear() + 543}
            currentYearThai={new Date(activeResult.transitDate || new Date()).getFullYear() + 543}
          />
        </div>
      )}

      {/* ── TAB 4: บทวิเคราะห์ชีวิตเชิงลึก ── */}
      {activeTab === "analysis" && activeResult?.matrix && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* กล่องแสดงคำพยากรณ์คุณภาพดาวปีจรแบบ Dynamic */}
          {hoverNum !== null && activeResult?.taksaMaha && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <YearlyStarPredictionPanel 
                star={hoverNum} 
                taksaMaha={activeResult.taksaMaha}
              />
            </div>
          )}
          {/* 1. Personal Life Rhythm & Transit Overview Card */}
          <div className="relative rounded-3xl border-2 border-slate-200 dark:border-[#C6A96B]/40 bg-white/95 dark:bg-gradient-to-br dark:from-[#0a2240] dark:via-[#0d1f38] dark:to-[#020617] p-5 sm:p-7 shadow-xl space-y-6 overflow-hidden">
            <div
              className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none opacity-20 blur-3xl"
              style={{ background: "radial-gradient(circle, #C6A96B 0%, transparent 70%)" }}
            />

            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 dark:border-white/10 pb-4 relative z-10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8C6D2D] dark:text-[#C6A96B] block mb-1">
                  ✦ PERSONAL ASTRAL INSIGHT
                </span>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-white">
                  แผนที่ชีวิต & จังหวะดวงดาว {profile?.display_name ? `(${profile.display_name})` : ""}
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  วิเคราะห์จังหวะชีวิต วัยจร และพลังงานเกื้อหนุนในวัยย่าง {currentAge} ปี (พ.ศ. {currentYearThai})
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold px-3 py-1 rounded-full border border-[#C6A96B]/30 bg-[#C6A96B]/10 text-[#8C6D2D] dark:text-[#F3D68B]">
                  วัยย่าง {currentAge} ปี
                </span>
                {lunar?.moonPhase && (
                  <span className="text-xs font-bold px-3 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                    {lunar.moonPhase}
                  </span>
                )}
              </div>
            </div>

            {/* 2. 4 Key Transit Pillars (๔ เสาหลักดวงดาวประจำปีนี้) */}
            <div className="space-y-3 relative z-10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#C6A96B]">
                ๔ เสาหลักพลังงานดวงดาวจรปีนี้ (4 TRANSIT PILLARS):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* ศรีจร */}
                <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <span>🌟</span>
                      <span>ดาวศรีจร — โชคลาภ & โอกาสทอง</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      หนุนสูงสุด
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {sriStarNum ? STAR_CORE_MEANINGS[sriStarNum]?.title : "กำลังวิเคราะห์"}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                    {sriStarNum ? STAR_CORE_MEANINGS[sriStarNum]?.desc : "พลังงานแห่งสิริมงคล โชคลาภ และความเจริญรุ่งเรือง"}
                  </p>
                </div>

                {/* เดชจร */}
                <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <span>👑</span>
                      <span>ดาวเดชจร — อำนาจ & ความสำเร็จ</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      บารมีเด่น
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {dechStarNum ? STAR_CORE_MEANINGS[dechStarNum]?.title : "กำลังวิเคราะห์"}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                    {dechStarNum ? STAR_CORE_MEANINGS[dechStarNum]?.desc : "พลังอำนาจบารมี ชัยชนะในการเจรจา และการเลื่อนขั้นตำแหน่ง"}
                  </p>
                </div>

                {/* มนตรีจร */}
                <div className="p-3.5 rounded-2xl border border-sky-500/30 bg-sky-500/5 dark:bg-sky-950/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                      <span>🤝</span>
                      <span>ดาวมนตรีจร — ผู้ใหญ่อุปถัมภ์ & เมตตา</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-300">
                      แรงหนุนดี
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {montriStarNum ? STAR_CORE_MEANINGS[montriStarNum]?.title : "กำลังวิเคราะห์"}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                    {montriStarNum ? STAR_CORE_MEANINGS[montriStarNum]?.desc : "ได้รับความเมตตาช่วยเหลือจากผู้ใหญ่และกัลยาณมิตร"}
                  </p>
                </div>

                {/* กาลกิณีจร */}
                <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>ดาวกาลกิณีจร — สิ่งที่ควรมีสติระวัง</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300">
                      พึงระวัง
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {kaliStarNum ? STAR_CORE_MEANINGS[kaliStarNum]?.title : "กำลังวิเคราะห์"}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                    พึงระมัดระวังเรื่อง {kaliStarNum ? STAR_CORE_MEANINGS[kaliStarNum]?.keywords.join(", ") : "การตัดสินใจด้วยอารมณ์"} เลี่ยงความเสี่ยงสูงและตรวจเอกสารสัญญาอย่างรอบคอบ
                  </p>
                </div>
              </div>
            </div>

            {/* 3. 4 Life Domains Alignment (๔ มิติชีวิต) */}
            <div className="space-y-3 relative z-10 pt-2 border-t border-black/5 dark:border-white/10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#C6A96B]">
                เข็มทิศ ๔ มิติชีวิตประจำปี (4 LIFE DOMAINS):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-1">
                  <span className="text-xl block">💼</span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">การงาน & ธุรกิจ</p>
                  <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] leading-tight">
                    {dechStarNum ? `ครองดาวเดช (${STAR_CORE_MEANINGS[dechStarNum]?.title.split(" ")[0]}) เด่นเรื่องการนำทัพ` : "ขับเคลื่อนตามเป้าหมาย"}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-1">
                  <span className="text-xl block">💰</span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">การเงิน & โชคลาภ</p>
                  <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] leading-tight">
                    {sriStarNum ? `ครองดาวศรี (${STAR_CORE_MEANINGS[sriStarNum]?.title.split(" ")[0]}) มีโชคลาภการเงิน` : "หมุนเวียนคล่องตัว"}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-1">
                  <span className="text-xl block">🤝</span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">ความสัมพันธ์</p>
                  <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] leading-tight">
                    {montriStarNum ? `ครองดาวมนตรี (${STAR_CORE_MEANINGS[montriStarNum]?.title.split(" ")[0]}) ผู้ใหญ่เมตตา` : "รักษาสายสัมพันธ์ดี"}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-1">
                  <span className="text-xl block">🌿</span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">สุขภาพ & จิตใจ</p>
                  <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] leading-tight">
                    {ayuStarNum ? `ครองดาวอายุ (${STAR_CORE_MEANINGS[ayuStarNum]?.title.split(" ")[0]}) ปรับสมดุลกายใจ` : "รักษาวินัยพักผ่อน"}
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Pro Astrology Direct Jump Buttons (Progressive Disclosure) */}
            <div className="pt-3 border-t border-black/5 dark:border-white/10 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-[#94A3B8]">
                ต้องการตรวจสอบโครงสร้างผังดวงเชิงลึกทางโหราศาสตร์?
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("chart")}
                  className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-[#C6A96B] border border-[#C6A96B]/40 hover:bg-[#C6A96B]/10 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>📊</span>
                  <span>ผังดวง 7 ตัว 9 ฐาน (Pro)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("taksa")}
                  className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 hover:bg-white/5 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>🧭</span>
                  <span>ผังทักษา/มหาภูติ (Pro)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Star Explorer (คลิกเจาะจงดาว ๑ ถึง ๘) */}
          <div className="space-y-3 p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-950/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-[#F8F6F1] flex items-center gap-1.5">
                <span>🔍</span>
                <span>วิเคราะห์เจาะจงดาวแต่ละดวง (คลิกเพื่อดูคำทำนายสด):</span>
              </span>
              {hoverNum !== null && (
                <button
                  type="button"
                  onClick={() => setHoverNum(null)}
                  className="text-[11px] text-[#C6A96B] hover:underline font-bold"
                >
                  ✕ ซ่อนคำทำนายเจาะลึก
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
                const info = STAR_CORE_MEANINGS[s];
                const isSelected = hoverNum === s;
                const tBhop = taksaTransitMap?.[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setHoverNum(isSelected ? null : s)}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-0.5 ${
                      isSelected
                        ? "bg-[#C6A96B] text-[#020617] border-[#C6A96B] font-bold shadow-md"
                        : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white hover:border-[#C6A96B]/50"
                    }`}
                  >
                    <span className="text-xs font-black">ดาว {s}</span>
                    <span className={`text-[10px] ${isSelected ? "text-[#020617]/80" : "text-[#C6A96B]"}`}>
                      {tBhop || info?.title.split(" ")[0] || ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ส่วนรายงานชะตาชีวิต (AI Reports & Categories) */}
          <div className="space-y-6 pt-6 border-t border-[#C9A96E]/20">
            <div>
              <span className="text-[#C9A96E] text-[13px] tracking-[0.25em] uppercase font-bold block mb-1">
                ✦ ระบบภูมิปัญญาพยากรณ์
              </span>
              <h2 className="font-display text-2xl font-bold text-[#F8F6F1] glow-gold">
                บทวิเคราะห์ชีวิตเชิงลึก
              </h2>
              <p className="text-[#C6B79F] text-sm italic">
                เลือกหมวดหมู่ที่ต้องการให้ระบบถอดรหัสชะตาชีวิตของท่าน จากระบบทักษา มหาภูติ และคัมภีร์เลข 7 ตัว
              </p>
            </div>

            {/* หมวดหมู่แนะนำเป็น Premium Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                {
                  value: "general_prediction",
                  label: "พยากรณ์ปัญญาชีวิต",
                  renderIcon: () => <DomainWisdomIcon className="w-8 h-8" />,
                  desc: "แนวทางบำบัดชะตา",
                  color: "from-violet-950/40 to-purple-900/10 border-violet-500/20 hover:border-violet-500/55",
                },
                {
                  value: "personal_branding",
                  label: "ตัวตน & อัตลักษณ์",
                  renderIcon: () => <DomainIdentityIcon className="w-8 h-8" />,
                  desc: "เสน่ห์และแบรนด์บุคคล",
                  color: "from-amber-950/40 to-orange-900/10 border-amber-500/20 hover:border-amber-500/55",
                },
                {
                  value: "career",
                  label: "ภารกิจ & ความสำเร็จ",
                  renderIcon: () => <DomainCareerIcon className="w-8 h-8" />,
                  desc: "โอกาสและเป้าหมาย",
                  color: "from-sky-950/40 to-blue-900/10 border-sky-500/20 hover:border-sky-500/55",
                },
                {
                  value: "relationship",
                  label: "เสน่ห์ & สัมพันธ์",
                  renderIcon: () => <DomainRelationshipIcon className="w-8 h-8" />,
                  desc: "สายใยและเมตตา",
                  color: "from-rose-950/40 to-pink-900/10 border-rose-500/20 hover:border-rose-500/55",
                },
                {
                  value: "wealth",
                  label: "กระแสทรัพย์ & มั่งคั่ง",
                  renderIcon: () => <DomainWealthIcon className="w-8 h-8" />,
                  desc: "คลังสมบัติและ Flow",
                  color: "from-emerald-950/40 to-green-900/10 border-emerald-500/20 hover:border-emerald-500/55",
                },
                {
                  value: "annual_forecast",
                  label: "จังหวะชะตารายปี",
                  renderIcon: () => <DomainAnnualIcon className="w-8 h-8" />,
                  desc: "แผนที่พลังงานปีจร",
                  color: "from-cyan-950/40 to-teal-900/10 border-cyan-500/20 hover:border-cyan-500/55",
                },
              ].map((cat) => (
                <a
                  key={cat.value}
                  href={`/dashboard/reports/new?type=${cat.value}&name=${encodeURIComponent(currentSubjectName)}&birthDate=${activeResult?.birthDate || profile?.birth_date || ''}&birthTime=${encodeURIComponent(activeResult?.birthTime || profile?.birth_time || '')}&birthPlace=${encodeURIComponent(currentBirthPlace)}`}
                  className={`relative overflow-hidden rounded-2xl border p-4 bg-gradient-to-br ${cat.color} transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group flex flex-col justify-between min-h-[140px]`}
                >
                  <div className="mb-2">{cat.renderIcon()}</div>
                  <div>
                    <p className="font-semibold text-xs text-[#F8F6F1] group-hover:text-[#C9A96E] transition-colors leading-tight">
                      {cat.label}
                    </p>
                    <p className="text-[13px] text-[#C6B79F] mt-1 leading-snug">
                      {cat.desc}
                    </p>
                  </div>
                  <span className="absolute bottom-2.5 right-3 text-[13px] text-[#C9A96E] opacity-0 group-hover:opacity-100 transition-opacity">
                    ถอดรหัส ➔
                  </span>
                </a>
              ))}
            </div>

            {/* ประวัติรายงานล่าสุด */}
            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-bold text-[#D9BC82] uppercase tracking-wider flex items-center gap-2">
                <span className="text-xs text-[#C6A96B]">✦</span> ประวัติรายงานชะตาชีวิตของคุณ
              </h3>
              {reports.length === 0 ? (
                <Card className="text-center py-8 border-dashed border-white/5 bg-transparent">
                  <p className="text-xs text-[#C6B79F]">
                    ยังไม่พบรายงานที่ท่านเคยสร้างไว้ เลือกหมวดหมู่การ์ดด้านบนเพื่อเริ่มต้นตรวจดวงชะตาเชิงลึกชิ้นแรก!
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {reports.map((rep: any) => {
                    const typeLabels: Record<string, string> = {
                      general_prediction: "พยากรณ์ปัญญาชีวิต (Therapy)",
                      life_overview: "โครงสร้างชีวิตเชิงลึก",
                      personal_branding: "ตัวตน & อัตลักษณ์",
                      career: "ภารกิจ & ความสำเร็จ",
                      relationship: "เสน่ห์ & ความสัมพันธ์",
                      wealth: "กระแสทรัพย์ & มั่งคั่ง",
                      annual_forecast: "จังหวะชะตารายปี",
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
                            <p className="text-[13px] text-[#C6B79F] mt-1 truncate">
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
      )}
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
  ไฟ:  { active: "border-orange-400/60 bg-orange-500/10 text-orange-300", inactive: "border-white/10 bg-white/5 text-[#C6B79F]" },
  ดิน: { active: "border-green-400/60 bg-green-500/10 text-green-300",   inactive: "border-white/10 bg-white/5 text-[#C6B79F]" },
  ลม:  { active: "border-sky-400/60 bg-sky-500/10 text-sky-300",         inactive: "border-white/10 bg-white/5 text-[#C6B79F]" },
  น้ำ: { active: "border-blue-400/60 bg-blue-500/10 text-blue-300",      inactive: "border-white/10 bg-white/5 text-[#C6B79F]" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared Indicators logic
// ─────────────────────────────────────────────────────────────────────────────

export function getTaksaTransitIndicator(star: number, taksaMaha?: any) {
  if (!taksaMaha?.taksaTransit?.map) return null;
  const bhop = taksaMaha.taksaTransit.map[star];
  switch (bhop) {
    case "บริวาร":
      return { label: "บริวาร", fullName: "บริวารจร (บริวาร/ผู้ติดตาม/สังคม)", color: "text-slate-300 bg-slate-800/80 border-slate-500/30" };
    case "อายุ":
      return { label: "อายุ", fullName: "อายุจร (สุขภาพ/อายุ/ความมั่นคง)", color: "text-teal-300 bg-teal-950/80 border-teal-500/30" };
    case "เดช":
      return { label: "เดช", fullName: "เดชจร (เกียรติยศ/อำนาจบารมี)", color: "text-[#F8F6F1] bg-white/20 border-white/40" };
    case "ศรี":
      return { label: "ศรี", fullName: "ศรีจร (โชคลาภ/โอกาสดี/ทรัพย์สิน)", color: "text-emerald-400 bg-emerald-950/80 border-emerald-500/30" };
    case "มูละ":
      return { label: "มูละ", fullName: "มูละจร (รากฐาน/ที่อยู่/ครอบครัว)", color: "text-orange-300 bg-orange-950/80 border-orange-500/30" };
    case "อุตสาหะ":
      return { label: "อุตสาหะ", fullName: "อุตสาหะจร (ความขยัน/แรงบันดาลใจ/การงาน)", color: "text-yellow-300 bg-yellow-950/80 border-yellow-500/30" };
    case "มนตรี":
      return { label: "มนตรี", fullName: "มนตรีจร (ผู้อุปถัมภ์/สนับสนุน/เมตตา)", color: "text-sky-400 bg-sky-950/80 border-sky-500/30" };
    case "กาลกิณี":
      return { label: "กาลี", fullName: "กาลกิณีจร (อุปสรรค/ข้อควรระวัง/อัปมงคล)", color: "text-red-400 bg-red-950/80 border-red-500/30" };
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
    case "ราชา":
      return { label: "ราชา", fullName: "ราชาจร (ความเป็นใหญ่/บารมีสูงสุด/ผู้นำ)", color: "text-[#C6A96B] bg-[#C6A96B]/10 border-[#C6A96B]/40" };
    case "อธิบดี":
      return { label: "อธิบดี", fullName: "อธิบดีจร (การควบคุม/ผู้บัญชาการ/บริหาร)", color: "text-violet-300 bg-violet-950/80 border-violet-500/30" };
    case "ธงชัย":
      return { label: "ธงชัย", fullName: "ธงชัยจร (ชัยชนะ/ความสำเร็จ/เกียรติยศ)", color: "text-lime-300 bg-lime-950/80 border-lime-500/30" };
    case "ขุมทรัพย์":
      return { label: "ขุมทรัพย์", fullName: "ขุมทรัพย์จร (ทรัพย์สมบัติ/โชคลาภ/รายได้)", color: "text-emerald-300 bg-emerald-950/80 border-emerald-500/30" };
    case "มรณะ":
      return { label: "มรณะ", fullName: "มรณะจร (การสูญเสีย/อันตราย/การเปลี่ยนแปลงครั้งใหญ่)", color: "text-rose-400 bg-rose-950/80 border-rose-500/30" };
    case "โลกาวินาศ":
      return { label: "วินาศ", fullName: "โลกาวินาศจร (ความแปรปรวน/ความเครียดภายใน/วิกฤต)", color: "text-amber-400 bg-amber-950/80 border-amber-500/30" };
    case "อริ":
      return { label: "อริ", fullName: "อริจร (ศัตรู/การต่อสู้/ความขัดแย้ง)", color: "text-red-300 bg-red-950/60 border-red-400/30" };
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
        <p className="text-[#C9A96E] text-[13px] tracking-[0.25em] uppercase font-bold">
          ระบบทักษา · มหาภูติ (Taksa-Mahabhuti Combined)
        </p>
        <div className="h-px flex-1 bg-[#C9A96E]/20" />
      </div>

      {/* ── Taksa & Maha Combined Panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <InteractiveTaksaCard
          taksaNatal={taksaNatal}
          taksaTransit={taksaTransit}
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




function YearlyStarPredictionPanel({ star, taksaMaha }: { star: number; taksaMaha: any }) {
  const { taksaNatal, taksaTransit, mahaNatal, mahaTransit } = taksaMaha;

  const starInfo = STAR_CORE_MEANINGS[star];
  if (!starInfo) return null;

  const currentTaksa = taksaTransit.map[star] as string | undefined;
  const natalTaksa = taksaNatal.map[star] as string | undefined;

  let currentMaha: string | null = null;
  if (mahaTransit?.map) {
    for (const [bhop, starNum] of Object.entries(mahaTransit.map)) {
      if (starNum === star) {
        currentMaha = bhop;
        break;
      }
    }
  }

  let natalMaha: string | null = null;
  if (mahaNatal?.map) {
    for (const [bhop, starNum] of Object.entries(mahaNatal.map)) {
      if (starNum === star) {
        natalMaha = bhop;
        break;
      }
    }
  }

  const taksaDetail = currentTaksa ? TAKSA_QUALITY_MEANINGS[currentTaksa] : null;
  const mahaDetail = currentMaha ? MAHA_QUALITY_MEANINGS[currentMaha] : null;

  let forecastSentence = "";
  if (currentTaksa === "ศรี") {
    forecastSentence = `ปีจรนี้ ดาว${starInfo.title} ได้รับพลังมงคลจรสูงสุดในตำแหน่ง "ศรีจร" ส่งผลให้อุปสรรคทั้งปวงคลี่คลาย มีโอกาสได้รับเกียรติยศ ลาภยศ ทรัพย์สินเงินทอง หรือความรักที่สุขสมหวังอย่างเด่นชัดโดดเด่นสูงสุด`;
  } else if (currentTaksa === "กาลกิณี") {
    forecastSentence = `ปีจรนี้ ดาว${starInfo.title} เสวยบทบาท "กาลกิณีจร" ซึ่งเป็นช่วงเวลาที่พึงหลีกเลี่ยงความเสี่ยง โทสะ หรือการตัดสินใจสำคัญด้วยความรีบร้อน ระวังการขัดแย้ง เสียชื่อเสียง หรือมีเรื่องจุกจิกเรื่องสุขภาพ ขอให้ก้าวอย่างมีสติอย่างยิ่ง`;
  } else if (currentTaksa === "มนตรี") {
    forecastSentence = `ปีจรนี้ ดาว${starInfo.title} ทำหน้าที่เป็น "มนตรีจร" ส่งผลให้ได้รับความช่วยเหลืออุปถัมภ์ สนับสนุนจากผู้ใหญ่ ครูบาอาจารย์ หรือผู้มีอารีจิตอย่างงดงาม เจรจาสัญญาสำคัญจะผ่านพ้นไปได้ด้วยดี`;
  } else if (currentTaksa === "เดช") {
    forecastSentence = `ปีจรนี้ ดาว${starInfo.title} โดดเด่นในบทบาท "เดชจร" ส่งผลถึงความมีพลังอำนาจ มีเกียรติยศชื่อเสียง มีสมาธิและความกล้าหาญในการเอาชนะศัตรูอุปสรรคและขึ้นมาเป็นผู้นำอย่างสง่างาม`;
  } else if (currentTaksa) {
    forecastSentence = `ปีจรนี้ ดาว${starInfo.title} โคจรเข้าสู่ภพ "${currentTaksa}จร" ทำให้ได้รับอิทธิพลในการบริหารงาน จัดความพากเพียรพยายาม ${taksaDetail?.desc || ''}`;
  }

  let mahaSentence = "";
  if (currentMaha) {
    if (currentMaha === "โลกาวินาศ") {
      mahaSentence = `ร่วมกับสภาพมหาภูติจรในตำแหน่ง "โลกาวินาศจร" บ่งบอกว่าจะมีสภาวะจิตใจหรือเรื่องหลังบ้านที่แปรปรวนลึกๆ มีเรื่องให้ต้องแก้ปัญหาเฉพาะหน้าแบบไม่คาดฝัน ขอให้นิ่งสงบสติอารมณ์เพื่อรักษาความมั่นคงภายในไว้`;
    } else if (["ธงชัย", "ขุมทรัพย์", "ราชา", "อธิบดี"].includes(currentMaha)) {
      mahaSentence = `ร่วมกับสภาวะมหาภูติจรในตำแหน่งมงคลอย่าง "${currentMaha}จร" หนุนนำให้จิตใจเบิกบาน มีแรงขับเคลื่อนแห่งความสำเร็จ มีคลังสมบัติภายใน หรือได้รับชัยชนะในเป้าหมายชีวิตแบบไม่คาดคิด`;
    } else {
      mahaSentence = `ร่วมกับสภาพจิตใจและปัจจัยมหาภูติภายในที่อยู่ในตำแหน่ง "${currentMaha}จร" ทำให้อารมณ์และความรู้สึกมีเกณฑ์ปรับเปลี่ยนตามลักษณะดวงดาว ${mahaDetail?.desc || ''}`;
    }
  }

  let pairNotice = "";
  const elementPairs = [
    { element: "ไฟ",  stars: [1, 7], nature: "ชื่อเสียง เกียรติยศ รวดเร็ว รุนแรง" },
    { element: "ดิน", stars: [2, 5], nature: "ความมั่นคง สมบูรณ์ ค่อยเป็นค่อยไป" },
    { element: "ลม",  stars: [3, 8], nature: "ว่องไว กระฉับกระเฉง กล้าแสดงออก" },
    { element: "น้ำ", stars: [4, 6], nature: "ความสุข ครอบครัว สบายๆ เรื่อยๆ" },
  ] as const;

  const pairInfo = elementPairs.find((p: { element: string; stars: readonly number[]; nature: string }) => 
    p.stars.includes(star)
  );
  if (pairInfo) {
    pairNotice = `ดาวครองธาตุ${pairInfo.element} (${pairInfo.nature})`;
  }

  return (
    <Card className="border-slate-200 dark:border-[#C9A96E]/30 bg-white/95 dark:bg-gradient-to-br dark:from-[#0A2240]/60 dark:to-[#020617]/90 backdrop-blur-xl p-5 relative overflow-hidden shadow-md dark:shadow-2xl rounded-2xl">
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#C9A96E]/5 rounded-full blur-3xl -z-10" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-300/30 dark:border-[#C9A96E]/20 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#C9A96E]/15 border border-[#C9A96E]/35 flex items-center justify-center font-display text-2xl font-bold text-[#8C6D2D] dark:text-[#C9A96E] shadow-inner animate-pulse">
            {star}
          </div>
          <div>
            <h4 className="font-display text-lg font-bold text-slate-900 dark:text-[#F8F6F1] glow-gold flex items-center gap-2">
              ถอดรหัสดาวชะตา: {starInfo.title}
            </h4>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="text-[12px] font-semibold bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[#C6B79F]">
                ธาตุ{starInfo.element} {ELEMENT_ICONS[starInfo.element]}
              </span>
              {pairNotice && pairInfo && (
                <span className="text-[12px] font-semibold bg-[#C9A96E]/10 border border-[#C9A96E]/25 px-2 py-0.5 rounded-full text-[#C9A96E]">
                  คู่ธาตุ{pairInfo.element}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 md:justify-end">
          {currentTaksa && (
            <span className={`text-[13px] font-bold px-2.5 py-1 rounded-xl border ${
              currentTaksa === "ศรี"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : currentTaksa === "กาลกิณี"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : "bg-slate-900/80 border-[#C9A96E]/25 text-[#C9A96E]"
            }`}>
              ทักษาจร: {currentTaksa}จร
            </span>
          )}
          {currentMaha && (
            <span className={`text-[13px] font-bold px-2.5 py-1 rounded-xl border ${
              ["ธงชัย", "ขุมทรัพย์", "ราชา", "อธิบดี"].includes(currentMaha)
                ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                : ["อริ", "มรณะ", "โลกาวินาศ"].includes(currentMaha)
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-slate-900/80 border-[#C9A96E]/25 text-[#C9A96E]"
            }`}>
              มหาภูติจร: {currentMaha}จร
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4 text-xs md:text-sm text-[#F3EFE8] leading-relaxed">
        <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
          <p className="text-[13px] uppercase font-bold text-[#C6B79F] tracking-wider mb-1">บทบาทและอุปนิสัยดวงดาว</p>
          <p className="text-xs text-[#C6B79F] italic">{starInfo.desc}</p>
        </div>

        <div className="space-y-3 pt-1">
          <div>
            <p className="text-[13px] uppercase font-bold text-[#C9A96E] tracking-wider mb-1 flex items-center gap-1.5">
              <span>🍃</span> ปัจจัยภายนอก (ทักษาจรทำนายปีนี้)
            </p>
            <p className="text-xs bg-[#C9A96E]/5 border border-[#C9A96E]/10 rounded-xl p-3 text-[#F8F6F1]">
              {forecastSentence}
            </p>
          </div>

          {currentMaha && (
            <div>
              <p className="text-[13px] uppercase font-bold text-[#4B6FAE] tracking-wider mb-1 flex items-center gap-1.5">
                <span>🌊</span> สภาวะภายใน (มหาภูติจรทำนายจิตใจ)
              </p>
              <p className="text-xs bg-[#4B6FAE]/5 border border-[#4B6FAE]/10 rounded-xl p-3 text-[#F8F6F1]">
                {mahaSentence}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 text-[13px] text-[#C6B79F] border-t border-white/5">
          <div className="flex flex-col gap-0.5 bg-slate-950/20 p-2 rounded-xl border border-white/5">
            <span>พื้นเพดวงเดิม (ทักษากำเนิด):</span>
            <span className="font-bold text-[#F8F6F1]">{natalTaksa ? `${natalTaksa}กำเนิด` : "ไม่มีตำแหน่งสำคัญ"}</span>
          </div>
          <div className="flex flex-col gap-0.5 bg-slate-950/20 p-2 rounded-xl border border-white/5">
            <span>สภาวะภายในเดิม (มหาภูติกำเนิด):</span>
            <span className="font-bold text-[#F8F6F1]">{natalMaha ? `${natalMaha}กำเนิด` : "ไม่มีตำแหน่งสำคัญ"}</span>
          </div>
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

// ── Single-color system: ตัวเลขสีขาวเหมือนกันทั้งหมด ──
// แต่ละภพมีกรอบการ์ด (bg + gold border)
// ฐาน ๔ ใช้ bg ต่าง (blue-tinted) เพื่อแยกแถว

function numColor(
  _n: number,
  opts: {
    isActive?: boolean;
    isDimmed?: boolean;
    isBase4?: boolean;
    isGlowFiltered?: boolean;
  } = {}
) {
  const { isActive, isDimmed, isBase4, isGlowFiltered } = opts;

  const base4Card = "bg-[#071E3D]/75 border-[#6D8FC7]/22";
  const normalCard = "bg-[#071427]/75 border-[#C6A96B]/18";

  if (isDimmed) {
    return {
      card: isBase4 ? `${base4Card} opacity-30` : `${normalCard} opacity-30`,
      text: "text-[#F8F6F1] font-bold",
    };
  }
  if (isActive || isGlowFiltered) {
    return {
      card: isBase4
        ? "bg-[#0D2245]/90 border-[#C6A96B]/60 shadow-[0_0_16px_rgba(198,169,107,0.22),inset_0_1px_0_rgba(198,169,107,0.10)]"
        : "bg-[#0A1A30]/90 border-[#C6A96B]/60 shadow-[0_0_16px_rgba(198,169,107,0.22),inset_0_1px_0_rgba(198,169,107,0.10)]",
      text: "text-[#F8F6F1] font-black",
    };
  }
  return {
    card: isBase4
      ? `${base4Card} hover:border-[#C6A96B]/30`
      : `${normalCard} hover:border-[#C6A96B]/32`,
    text: "text-[#F8F6F1] font-bold",
  };
}

function HoroscopeResultDisplay({ result, phopephumResult }: { result: any; phopephumResult?: any }) {
  const lunar = phopephumResult?.nineBase?.lunarDate || result?.lunarDateInfo || result?.lunar;
  const currentAge = phopephumResult?.taksaTransit?.ageYang || result?.transitPhase?.currentAge || result?.ageCycle || 0;

  if (!lunar) return null;

  return (
    <Card className="border-[#C9A96E]/20 relative">
      <div className="absolute top-4 right-4">
        <span className="text-[#C9A96E] text-xs font-bold bg-[#C9A96E]/10 px-3 py-1 rounded-full border border-[#C9A96E]/20">อายุย่าง {currentAge} ปี</span>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-[#C9A96E] rounded-full animate-pulse" />
        <p className="text-[#C9A96E] text-[13px] uppercase tracking-widest font-bold">ปฏิทินจันทรคติไทย (ปฏิทิน 100 ปี)</p>
      </div>
      <p className="text-slate-900 dark:text-[#F3EFE8] font-semibold text-lg">
        วัน{lunar.dayName || lunar.dayPlanet} {(() => {
          const m = lunar.lunarMonthName || lunar.lunarMonth;
          return m ? (String(m).startsWith("เดือน") ? m : `เดือน${m}`) : "";
        })()} ปี{lunar.zodiacName || ''}
        <span className="text-[#8C6D2D] dark:text-[#C9A96E] ml-3 text-sm font-normal">({lunar.moonPhase})</span>
      </p>
      <div className="flex flex-wrap gap-2 mt-4 text-xs text-slate-500 dark:text-[#C6B79F]">
        <span className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-transparent px-3 py-1 rounded-full">ดาวประจำวัน: <span className="text-[#8C6D2D] dark:text-[#C9A96E] font-bold">{lunar.dayPlanet}</span></span>
        <span className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-transparent px-3 py-1 rounded-full">ขึ้น/แรม: {lunar.moonPhase || `ขึ้น ${lunar.lunarDay} ค่ำ เดือน ${lunar.lunarMonth}`}</span>
      </div>
    </Card>
  );
}

const ROW_META = [
  { label: "ฐาน วัน", sub: "วันเกิด",           phopNames: ["อัตตะ","หินะ","ธนัง","ปิตา","มาตา","โภคา","มัชฌิมา"] },
  { label: "ฐาน เดือน", sub: "เดือนเกิด",         phopNames: ["ตนุ","กฎุมภะ","สหัชชะ","พันธุ","ปุตตะ","อริ","ปัตนิ"] },
  { label: "ฐาน ปี", sub: "ปีเกิด",            phopNames: ["มรณะ","ศุภะ","กัมมะ","ลาภะ","พยายะ","ทาสา","ทาสี"] },
  { label: "ฐานกำลัง", sub: "ฐานบวก (มหาจักร)", phopNames: null },
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
  showAgeRange = false,
  showHouseNames = true,
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
  showAgeRange?: boolean;
  showHouseNames?: boolean;
  showTaksaJorn?: boolean;
  showMahaJorn?: boolean;
}) {
  const tHoro = useT("horoscope");
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // ฟังก์ชันคำนวณช่วงอายุสะสมของทุกช่องใน 3 แถวแรก (วัยจร Mod-7 ระบบคัมภีร์ดวงไทย)
  const getCellAgeRange = (row: number, col: number, mat: number[][]) => {
    let currentAgeStart = 1;
    for (let c = 0; c < 7; c++) {
      for (let r = 0; r < 3; r++) {
        const star = mat[r]?.[c] ? mat[r][c] : 7;
        const currentAgeEnd = currentAgeStart + star - 1;
        if (r === row && c === col) {
          return `${currentAgeStart}-${currentAgeEnd}`;
        }
        currentAgeStart = currentAgeEnd + 1;
      }
    }
    return "";
  };

  return (
    <div onClick={() => onNumClick(null)} className="w-full">
      <Card className="p-0 overflow-hidden border-[#C6A96B]/15 shadow-2xl cursor-default">
      <div
        onClick={(e) => e.stopPropagation()}
        className="px-4 py-3 border-b border-[#C6A96B]/12 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1"
      >
        <div className="flex items-center gap-3">
          <div className="w-px h-5 bg-[#C6A96B]/60" />
          <p className="text-[#C6A96B] text-sm sm:text-base font-bold uppercase tracking-[0.18em]">{tHoro("chart.title")}</p>
          <span className="hidden sm:inline text-[#F8F6F1]/50 text-xs">·</span>
          <span className="hidden sm:inline text-[#F8F6F1]/75 text-xs tracking-wide">{tHoro("chart.subtitle")}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] sm:text-xs text-[#F8F6F1]/70 tracking-wider">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#C6A96B] inline-block" />{tHoro("chart.natal")}</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#6D8FC7] inline-block" />{tHoro("chart.transit")}</span>
          <span className="text-[#F8F6F1]/65 font-medium">{tHoro("chart.tap_hint")}</span>
        </div>
      </div>
      <div className="overflow-x-auto p-1 sm:p-5 bg-transparent">
        <table className="w-full border-collapse table-fixed">
          <tbody>
            {matrix.map((row, rIdx) => {
              const isBase4 = rIdx === 3;
              const isTargetRow = [0, 1, 2, 7, 8].includes(rIdx); // แสดงดาวลิงค์เฉพาะฐาน 1-2-3-8-9
              return (
                <tr 
                  key={rIdx} 
                  className={`group transition-all ${
                    isBase4
                      ? "bg-[#0A2240]/25 border-y border-[#4B6FAE]/10"
                      : ""
                  }`}
                >
                  <td className="py-[3px] sm:py-1 pr-1 sm:pr-2 text-left whitespace-nowrap w-[54px] sm:w-[80px]">
                    <p className={`text-[11px] sm:text-[12px] font-extrabold tracking-wider ${isBase4 ? "text-[#6D8FC7]/90" : "text-[#F8F6F1]/75"}`}>
                      {tHoro("bases." + (rIdx + 1), ROW_META[rIdx].label)}
                    </p>
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
                    
                    const isBaseHighlight = activeNum !== null && (isBase4 ? matrix[2]?.[cIdx] === activeNum : (actualNum === activeNum && isTargetRow));
                    // isGlowFiltered: จำกัดเฉพาะฐาน 1-3-4-8-9 (ไม่รวมฐาน 5-6-7)
                    const isGlowFiltered = isFiltering && (isTargetRow || isBase4) && highlightedStars.has(isBase4 ? matrix[2]?.[cIdx] : actualNum);
                    const isHighlighted = isBaseHighlight || isGlowFiltered;
                    const isDimmed = isFiltering && !isGlowFiltered;

                    const c = numColor(num, {
                      isActive: isHighlighted,
                      isDimmed,
                      isBase4,
                      isGlowFiltered,
                    });
                    const houseName = isBase4 ? BASE4_MEANINGS[num] : ROW_META[rIdx].phopNames?.[cIdx];
                    
                    const skipIndicators = [3, 4, 5, 6].includes(rIdx);
                    const showInd = !skipIndicators && actualNum !== 9;
                    const taksaInd = showInd ? getTaksaTransitIndicator(actualNum, taksaMaha) : null;
                    const mahaInd = showInd ? getMahaTransitIndicator(actualNum, taksaMaha) : null;

                    // ── สัญญาณลัคนาและดวงจร (เฉพาะ 3 แถวแรก ฐาน 1-3) ──
                    const isRow012 = [0, 1, 2].includes(rIdx);
                    const isLagnaNatal = isRow012 && phopephumResult?.lagna && 
                      phopephumResult.lagna.row === (rIdx + 1) && 
                      phopephumResult.lagna.col === (cIdx + 1);
                    
                    const isLagnaTransit = isRow012 && phopephumResult?.lagnaTransit && 
                      phopephumResult.lagnaTransit.row === (rIdx + 1) && 
                      phopephumResult.lagnaTransit.col === (cIdx + 1);
                    
                    const isVayaJorn = isRow012 && phopephumResult?.vayaJorn && 
                      phopephumResult.vayaJorn.row === (rIdx + 1) && 
                      phopephumResult.vayaJorn.col === (cIdx + 1);
                    
                    const isYearlyJorn = isRow012 && phopephumResult?.yearlyJorn && 
                      phopephumResult.yearlyJorn.row === (rIdx + 1) && 
                      phopephumResult.yearlyJorn.col === (cIdx + 1);

                    const isMonthlyJorn = isRow012 && phopephumResult?.monthlyJorn && 
                      phopephumResult.monthlyJorn.row === (rIdx + 1) && 
                      phopephumResult.monthlyJorn.col === (cIdx + 1);

                    const isDailyJorn = isRow012 && phopephumResult?.dailyJorn && 
                      phopephumResult.dailyJorn.row === (rIdx + 1) && 
                      phopephumResult.dailyJorn.col === (cIdx + 1);

                    return (
                      <td key={cIdx} className="p-[3px] sm:p-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNumClick(isBase4 ? matrix[2]?.[cIdx] : actualNum);
                          }}
                          type="button"
                          className="w-full focus:outline-none group/cell"
                        >
                          {/* ── Card: กรอบภพ ── */}
                          <div className={`
                            relative flex flex-col items-center justify-center
                            rounded-lg border
                            py-1.5 sm:py-2 px-0.5
                            min-h-[50px] sm:min-h-[64px]
                            transition-all duration-200
                            ${c.card}
                            ${showNatalLagna && isLagnaNatal ? "ring-1.5 ring-[#C6A96B] border-[#C6A96B] shadow-[0_0_12px_rgba(198,169,107,0.3)]" : ""}
                            ${showTransitLagna && isLagnaTransit ? "ring-1.5 ring-[#3B82F6] border-[#3B82F6] shadow-[0_0_12px_rgba(59,130,246,0.3)]" : ""}
                            ${isHighlighted ? "scale-[1.06] z-10" : ""}
                            ${isGlowFiltered ? "animate-pulse" : ""}
                          `}>

                            {/* ── ตัวเลขหลัก ── */}
                            <span className={`font-display text-[19px] sm:text-[24px] leading-none select-none ${c.text}`}>
                              {num}
                            </span>

                            {/* ── ชื่อภพ ── */}
                            {showHouseNames && houseName && (
                              <span className="text-[9.5px] sm:text-[11px] text-[#F8F6F1]/70 mt-1 leading-tight text-center font-bold px-0.5">
                                {isBase4 
                                  ? tHoro("base4_meanings." + houseName, houseName) 
                                  : tHoro("houses." + houseName, houseName)}
                              </span>
                            )}

                            {/* ── ช่วงอายุ ── */}
                            {showAgeRange && rIdx < 3 && (
                              <span className="text-[9.5px] text-[#F8F6F1]/65 mt-0.5 leading-none font-medium">
                                {getCellAgeRange(rIdx, cIdx, matrix)}
                              </span>
                            )}

                            {/* ── ลัคนากำเนิด badge (ล) [มุมบนซ้าย Top-Left] ── */}
                            {showNatalLagna && isLagnaNatal && (
                              <span
                                title={`ลัคนาเกิด (ลัคนากำเนิด ฐาน ${phopephumResult?.lagna?.row ?? (rIdx + 1)} ภพ${phopephumResult?.lagna?.houseName ?? houseName})`}
                                className="absolute -top-2 -left-1.5 text-[9px] sm:text-[10px] font-black bg-gradient-to-br from-[#F5E2B3] via-[#C6A96B] to-[#9A7D3C] text-[#020617] px-1.5 py-[0.5px] rounded shadow-[0_0_8px_rgba(198,169,107,0.85)] border border-[#F5E2B3]/60 leading-none select-none z-20"
                              >ล</span>
                            )}

                            {/* ── ลัคนาจร badge (ลจ) [มุมบนขวา Top-Right] ── */}
                            {showTransitLagna && isLagnaTransit && (
                              <span
                                title={`ลัคนาจร (อายุย่าง ${phopephumResult?.taksaTransit?.ageYang ?? 0} ปี ฐาน ${phopephumResult?.lagnaTransit?.row ?? (rIdx + 1)} ภพ${phopephumResult?.lagnaTransit?.houseName ?? houseName})`}
                                className="absolute -top-2 -right-1.5 text-[9px] sm:text-[10px] font-black bg-gradient-to-br from-[#93C5FD] via-[#3B82F6] to-[#1D4ED8] text-white px-1.5 py-[0.5px] rounded shadow-[0_0_8px_rgba(59,130,246,0.85)] border border-[#93C5FD]/60 leading-none select-none animate-pulse z-20"
                              >ลจ</span>
                            )}

                            {/* ── Maha badge [มุมล่างซ้าย Bottom-Left] ── */}
                            {showMahaJorn && mahaInd && (
                              <span
                                title={mahaInd.fullName}
                                className={`absolute -bottom-2 -left-1 text-[8px] sm:text-[9px] font-bold px-1 py-[0.5px] rounded border leading-none shadow-md z-15 ${mahaInd.color}`}
                              >{mahaInd.label}</span>
                            )}

                            {/* ── Taksa badge [มุมล่างขวา Bottom-Right] ── */}
                            {showTaksaJorn && taksaInd && (
                              <span
                                title={taksaInd.fullName}
                                className={`absolute -bottom-2 -right-1 text-[8px] sm:text-[9px] font-bold px-1 py-[0.5px] rounded border leading-none shadow-md z-15 ${taksaInd.color}`}
                              >{taksaInd.label}</span>
                            )}

                            {/* ── ป้ายบอกระดับดวงจร 4 ระบบ (วัย / ปี / เดือน / วัน) [แถบกลางล่าง] ── */}
                            {((showVayaJorn && isVayaJorn) ||
                              (showYearlyJorn && isYearlyJorn) ||
                              (showMonthlyJorn && isMonthlyJorn) ||
                              (showDailyJorn && isDailyJorn)) && (
                              <div className="flex items-center justify-center gap-1 mt-1 z-10 flex-wrap">
                                {showVayaJorn && isVayaJorn && (
                                  <span
                                    title={`วัยจร (ฐาน ${phopephumResult?.vayaJorn?.row} ภพ${phopephumResult?.vayaJorn?.houseName})`}
                                    className="text-[8px] font-extrabold px-1 py-[1px] rounded bg-[#C6A96B] text-[#020617] border border-[#C6A96B]/80 leading-none shadow-[0_0_6px_rgba(198,169,107,0.6)] animate-pulse select-none"
                                  >
                                    วัย
                                  </span>
                                )}
                                {showYearlyJorn && isYearlyJorn && (
                                  <span
                                    title={`ปีจร (ฐาน ${phopephumResult?.yearlyJorn?.row} ภพ${phopephumResult?.yearlyJorn?.houseName})`}
                                    className="text-[8px] font-extrabold px-1 py-[1px] rounded bg-[#3B82F6] text-white border border-[#60A5FA]/80 leading-none shadow-[0_0_6px_rgba(59,130,246,0.6)] select-none"
                                  >
                                    ปี
                                  </span>
                                )}
                                {showMonthlyJorn && isMonthlyJorn && (
                                  <span
                                    title={`เดือนจร (ฐาน ${phopephumResult?.monthlyJorn?.row} ภพ${phopephumResult?.monthlyJorn?.houseName})`}
                                    className="text-[8px] font-extrabold px-1 py-[1px] rounded bg-[#06B6D4] text-[#020617] border border-[#22D3EE]/80 leading-none shadow-[0_0_6px_rgba(6,182,212,0.5)] select-none"
                                  >
                                    ด
                                  </span>
                                )}
                                {showDailyJorn && isDailyJorn && (
                                  <span
                                    title={`วันจร (ฐาน ${phopephumResult?.dailyJorn?.row} ภพ${phopephumResult?.dailyJorn?.houseName})`}
                                    className="text-[8px] font-extrabold px-1 py-[1px] rounded bg-[#10B981] text-white border border-[#34D399]/80 leading-none shadow-[0_0_6px_rgba(16,185,129,0.5)] select-none"
                                  >
                                    ว
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
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

      {/* ── คู่มือสัญลักษณ์ & คำอธิบายผังดวง (Collapsible Dropdown Accordion) ── */}
      <div className="border-t border-[#C6A96B]/20 bg-[#020617]/80">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsLegendOpen(!isLegendOpen);
          }}
          className="w-full px-4 py-3 flex items-center justify-between text-left transition-colors hover:bg-[#C6A96B]/5 text-xs sm:text-sm font-semibold text-[#D9BC82]"
          aria-expanded={isLegendOpen}
        >
          <span className="flex items-center gap-2">
            <span className="text-[#C6A96B]">✦</span>
            <span>คู่มือสัญลักษณ์ & คำอธิบายผังดวง (กดเพื่อดูคำอธิบาย)</span>
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#C6A96B]/10 border border-[#C6A96B]/30 text-[#C6A96B] flex items-center gap-1">
            {isLegendOpen ? "ซ่อน ▲" : "แสดงคำอธิบาย ▼"}
          </span>
        </button>

        {isLegendOpen && (
          <div className="border-t border-[#C6A96B]/10 space-y-0 animate-in fade-in duration-200">
            {/* ── ลัคนาเกิด / ลัคนาจร Detail Panel ── */}
            {phopephumResult?.lagna && (
              <div className="bg-[#020617]/60 px-3 sm:px-5 py-3 space-y-2 text-xs sm:text-sm">
                {/* ลัคนาเกิด */}
                {showNatalLagna && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="px-1.5 py-[1px] rounded-full text-[11px] font-bold bg-[#C6A96B] text-[#020617] leading-none select-none shrink-0">ล</span>
                    <span className="text-[#C6A96B] font-semibold shrink-0">ลัคนาเกิด</span>
                    <span className="text-[#C6B79F]">ยามที่</span>
                    <span className="text-[#F8F6F1] font-bold">
                      {phopephumResult.lagna.yamPeriodNumber ?? phopephumResult.lagna.yamYaiNumber ?? "—"}
                      {phopephumResult.lagna.yamYaiName ? ` (${phopephumResult.lagna.yamYaiName})` : ""}
                    </span>
                    <span className="text-[#C6B79F]">ดาว</span>
                    <span className="text-[#F8F6F1] font-bold">{STAR_NAMES[phopephumResult.lagna.star as 1|2|3|4|5|6|7] ?? "—"}</span>
                    <span className="text-[#C6B79F]">{phopephumResult.lagna.subPeriod === 'early' ? 'ยามต้น' : phopephumResult.lagna.subPeriod === 'middle' ? 'ยามกลาง' : 'ยามปลาย'}</span>
                    <span className="text-[#C6B79F]">ฤกษ์</span>
                    <span className="text-[#F8F6F1] font-bold">{phopephumResult.lagna.reksName ?? "—"}</span>
                    <span className="text-[#C6B79F]">→</span>
                    <span className="text-[#C6A96B] font-bold">ฐาน {phopephumResult.lagna.row}</span>
                    <span className="text-[#F8F6F1] font-semibold">ภพ{phopephumResult.lagna.houseName}</span>
                  </div>
                )}
                {/* วัยจร */}
                {showVayaJorn && phopephumResult?.vayaJorn && (() => {
                  const j = phopephumResult.vayaJorn;
                  const b4val = matrix[3]?.[j.col - 1];
                  const b4name = BASE4_MEANINGS[b4val] ?? "—";
                  return (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-white/5">
                      <span className="px-1.5 py-[1px] rounded text-[10px] font-black bg-[#C6A96B] text-[#020617] leading-none shrink-0 shadow-[0_0_6px_rgba(198,169,107,0.5)]">วัย</span>
                      <span className="text-[#C6A96B] font-semibold shrink-0">วัยจร</span>
                      <span className="text-[#C6B79F]">อายุย่าง</span>
                      <span className="text-[#F8F6F1] font-bold">{phopephumResult.taksaTransit?.ageYang ?? "—"} ปี</span>
                      <span className="text-[#C6B79F]">ช่วง</span>
                      <span className="text-[#F8F6F1] font-bold">{j.ageRange ?? "—"}</span>
                      <span className="text-[#C6B79F]">→</span>
                      <span className="text-[#C6A96B] font-bold">ฐาน {j.row}</span>
                      <span className="text-[#F8F6F1] font-semibold">ภพ{j.houseName}</span>
                      {j.yumStar && (
                        <>
                          <span className="text-[#C6B79F]">ดาวยํ้าฐาน {j.yumBase ?? "—"}</span>
                          <span className="text-amber-300 font-bold">{STAR_NAMES[j.yumStar as 1|2|3|4|5|6|7] ?? j.yumStar}({j.yumStar})</span>
                        </>
                      )}
                      <span className="text-[#C6B79F]">กำลัง</span>
                      <span className="text-[#C6A96B] font-bold">{b4name}({b4val})</span>
                    </div>
                  );
                })()}
                {/* ปีจร */}
                {showYearlyJorn && phopephumResult?.yearlyJorn && (() => {
                  const j = phopephumResult.yearlyJorn;
                  const b4val = matrix[3]?.[j.col - 1];
                  const b4name = BASE4_MEANINGS[b4val] ?? "—";
                  return (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-white/5">
                      <span className="px-1.5 py-[1px] rounded text-[10px] font-black bg-[#3B82F6] text-white leading-none shrink-0 shadow-[0_0_6px_rgba(59,130,246,0.5)]">ปี</span>
                      <span className="text-[#3B82F6] font-semibold shrink-0">ปีจร</span>
                      <span className="text-[#C6B79F]">อายุย่าง</span>
                      <span className="text-[#F8F6F1] font-bold">{phopephumResult.taksaTransit?.ageYang ?? "—"} ปี</span>
                      <span className="text-[#C6B79F]">→</span>
                      <span className="text-[#3B82F6] font-bold">ฐาน {j.row}</span>
                      <span className="text-[#F8F6F1] font-semibold">ภพ{j.houseName}</span>
                      {j.yumStar && (
                        <>
                          <span className="text-[#C6B79F]">ดาวยํ้าฐาน {j.yumBase ?? "—"}</span>
                          <span className="text-sky-300 font-bold">{STAR_NAMES[j.yumStar as 1|2|3|4|5|6|7] ?? j.yumStar}({j.yumStar})</span>
                        </>
                      )}
                      <span className="text-[#C6B79F]">กำลัง</span>
                      <span className="text-[#3B82F6] font-bold">{b4name}({b4val})</span>
                    </div>
                  );
                })()}
                {/* ลัคนาจร */}
                {showTransitLagna && phopephumResult?.lagnaTransit && (() => {
                  const j = phopephumResult.lagnaTransit;
                  const b4val = matrix[3]?.[j.col - 1];
                  const b4name = BASE4_MEANINGS[b4val] ?? "—";
                  return (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-white/5">
                      <span className="px-1.5 py-[1px] rounded text-[10px] font-black bg-gradient-to-br from-[#93C5FD] via-[#3B82F6] to-[#1D4ED8] text-white leading-none select-none shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.7)] animate-pulse">ลจ</span>
                      <span className="text-[#3B82F6] font-semibold shrink-0">ลัคนาจร</span>
                      <span className="text-[#C6B79F]">อายุย่าง</span>
                      <span className="text-[#F8F6F1] font-bold">{phopephumResult.taksaTransit?.ageYang ?? "—"} ปี</span>
                      <span className="text-[#C6B79F]">นับจาก</span>
                      <span className="text-[#C6A96B]">ฐาน {phopephumResult.lagna.row} {phopephumResult.lagna.houseName}</span>
                      <span className="text-[#C6B79F]">→</span>
                      <span className="text-[#3B82F6] font-bold">ฐาน {j.row}</span>
                      <span className="text-[#F8F6F1] font-semibold">ภพ{j.houseName}</span>
                      {j.yumStar && (
                        <>
                          <span className="text-[#C6B79F]">ดาวยํ้าฐาน {j.yumBase ?? "—"}</span>
                          <span className="text-violet-300 font-bold">{STAR_NAMES[j.yumStar as 1|2|3|4|5|6|7] ?? j.yumStar}({j.yumStar})</span>
                        </>
                      )}
                      <span className="text-[#C6B79F]">กำลัง</span>
                      <span className="text-violet-300 font-bold">{b4name}({b4val})</span>
                    </div>
                  );
                })()}
                {/* เดือนจร */}
                {showMonthlyJorn && phopephumResult?.monthlyJorn && (() => {
                  const j = phopephumResult.monthlyJorn;
                  const b4val = matrix[3]?.[j.col - 1];
                  const b4name = BASE4_MEANINGS[b4val] ?? "—";
                  return (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-white/5">
                      <span className="px-1.5 py-[1px] rounded text-[10px] font-black bg-[#06B6D4] text-[#020617] leading-none shrink-0 shadow-[0_0_6px_rgba(6,182,212,0.5)]">ด</span>
                      <span className="text-[#06B6D4] font-semibold shrink-0">เดือนจร</span>
                      <span className="text-[#C6B79F]">เดือน</span>
                      <span className="text-[#F8F6F1] font-bold">
                        {phopephumResult.horary?.lunarDate?.lunarMonthName ?? phopephumResult.horary?.lunarDate?.lunarMonth ?? "—"}
                      </span>
                      <span className="text-[#C6B79F]">→</span>
                      <span className="text-[#06B6D4] font-bold">ฐาน {j.row}</span>
                      <span className="text-[#F8F6F1] font-semibold">ภพ{j.houseName}</span>
                      {j.yumStar && (
                        <>
                          <span className="text-[#C6B79F]">ดาวยํ้าฐาน {j.yumBase ?? 6}</span>
                          <span className="text-cyan-300 font-bold">{STAR_NAMES[j.yumStar as 1|2|3|4|5|6|7] ?? j.yumStar}({j.yumStar})</span>
                        </>
                      )}
                      <span className="text-[#C6B79F]">กำลัง</span>
                      <span className="text-cyan-300 font-bold">{b4name}({b4val})</span>
                    </div>
                  );
                })()}
                {/* วันจร */}
                {showDailyJorn && phopephumResult?.dailyJorn && (() => {
                  const j = phopephumResult.dailyJorn;
                  const b4val = matrix[3]?.[j.col - 1];
                  const b4name = BASE4_MEANINGS[b4val] ?? "—";
                  return (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-white/5">
                      <span className="px-1.5 py-[1px] rounded text-[10px] font-black bg-[#10B981] text-white leading-none shrink-0 shadow-[0_0_6px_rgba(16,185,129,0.5)]">ว</span>
                      <span className="text-[#10B981] font-semibold shrink-0">วันจร</span>
                      <span className="text-[#C6B79F]">วัน</span>
                      <span className="text-[#F8F6F1] font-bold">
                        {phopephumResult.horary?.lunarDate?.dayName ?? "—"}
                      </span>
                      <span className="text-[#C6B79F]">→</span>
                      <span className="text-[#10B981] font-bold">ฐาน {j.row}</span>
                      <span className="text-[#F8F6F1] font-semibold">ภพ{j.houseName}</span>
                      {j.yumStar && (
                        <>
                          <span className="text-[#C6B79F]">ดาวยํ้าฐาน {j.yumBase ?? 5}</span>
                          <span className="text-emerald-300 font-bold">{STAR_NAMES[j.yumStar as 1|2|3|4|5|6|7] ?? j.yumStar}({j.yumStar})</span>
                        </>
                      )}
                      <span className="text-[#C6B79F]">กำลัง</span>
                      <span className="text-emerald-300 font-bold">{b4name}({b4val})</span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Legend Block */}
            {taksaMaha && (
              <div className="bg-[#0f172a]/50 p-4 border-t border-[#D9BC82]/10 text-[13px] space-y-2 text-[#C6B79F]">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="font-bold text-[#D9BC82] uppercase tracking-wider text-[12px] w-full">ปัจจัยภายนอก (ทักษาจร — 8 ภพ [มุมล่างขวาของการ์ด]):</span>
                  {[
                    { label: "บริวาร", desc: "บริวาร/สังคม/ผู้ติดตาม",            cls: "text-slate-300 bg-slate-800/80 border-slate-500/30" },
                    { label: "อายุ",   desc: "สุขภาพ/อายุ/ความมั่นคง",             cls: "text-teal-300 bg-teal-950/80 border-teal-500/30" },
                    { label: "เดช",    desc: "เกียรติยศ/อำนาจบารมี",               cls: "text-[#F8F6F1] bg-white/20 border-white/40" },
                    { label: "ศรี",    desc: "โชคลาภ/โอกาสดี/ทรัพย์สิน",          cls: "text-emerald-400 bg-emerald-950/80 border-emerald-500/30" },
                    { label: "มูละ",   desc: "รากฐาน/ที่อยู่/ครอบครัว",            cls: "text-orange-300 bg-orange-950/80 border-orange-500/30" },
                    { label: "อุตสาหะ",desc: "ความขยัน/แรงบันดาลใจ/การงาน",       cls: "text-yellow-300 bg-yellow-950/80 border-yellow-500/30" },
                    { label: "มนตรี",  desc: "ผู้อุปถัมภ์/สนับสนุน/เมตตา",        cls: "text-sky-400 bg-sky-950/80 border-sky-500/30" },
                    { label: "กาลี",   desc: "กาลกิณี — อุปสรรค/อัปมงคล/ระวัง",  cls: "text-red-400 bg-red-950/80 border-red-500/30" },
                  ].map(({ label, desc, cls }) => (
                    <div key={label} className="flex items-center gap-1">
                      <span className={`px-1 py-[0.5px] rounded border text-[10px] font-bold leading-none ${cls}`}>{label}</span>
                      <span className="text-[12px]">{desc}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1 border-t border-white/5">
                  <span className="font-bold text-[#D9BC82] uppercase tracking-wider text-[12px] w-full">ปัจจัยภายใน (มหาภูติจร — 7 ตำแหน่ง [มุมล่างซ้ายของการ์ด]):</span>
                  {[
                    { label: "ราชา",    desc: "ความเป็นใหญ่/บารมีสูงสุด/ผู้นำ",             cls: "text-[#C6A96B] bg-[#C6A96B]/10 border-[#C6A96B]/40" },
                    { label: "อธิบดี",  desc: "การควบคุม/ผู้บัญชาการ/บริหาร",              cls: "text-violet-300 bg-violet-950/80 border-violet-500/30" },
                    { label: "ธงชัย",   desc: "ชัยชนะ/ความสำเร็จ/เกียรติยศ",               cls: "text-lime-300 bg-lime-950/80 border-lime-500/30" },
                    { label: "ขุมทรัพย์",desc: "ทรัพย์สมบัติ/โชคลาภ/รายได้",              cls: "text-emerald-300 bg-emerald-950/80 border-emerald-500/30" },
                    { label: "มรณะ",    desc: "การสูญเสีย/อันตราย/เปลี่ยนแปลงครั้งใหญ่", cls: "text-rose-400 bg-rose-950/80 border-rose-500/30" },
                    { label: "วินาศ",   desc: "โลกาวินาศ — ความแปรปรวน/วิกฤต",            cls: "text-amber-400 bg-amber-950/80 border-amber-500/30" },
                    { label: "อริ",     desc: "ศัตรู/การต่อสู้/ความขัดแย้ง",               cls: "text-red-300 bg-red-950/60 border-red-400/30" },
                  ].map(({ label, desc, cls }) => (
                    <div key={label} className="flex items-center gap-1">
                      <span className={`px-1 py-[0.5px] rounded border text-[10px] font-bold leading-none ${cls}`}>{label}</span>
                      <span className="text-[12px]">{desc}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 border-t border-white/5">
                  <span className="font-bold text-[#D9BC82] uppercase tracking-wider text-[12px]">สัญลักษณ์ผังดวง:</span>
                  {showNatalLagna && (
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-[0.5px] rounded text-[10px] font-black bg-gradient-to-br from-[#F5E2B3] via-[#C6A96B] to-[#9A7D3C] text-[#020617] border border-[#F5E2B3]/60 leading-none select-none">ล</span>
                      <span>ลัคนาเกิด (มุมบนซ้าย)</span>
                    </div>
                  )}
                  {showTransitLagna && (
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-[0.5px] rounded text-[10px] font-black bg-gradient-to-br from-[#93C5FD] via-[#3B82F6] to-[#1D4ED8] text-white border border-[#93C5FD]/60 leading-none select-none animate-pulse">ลจ</span>
                      <span>ลัคนาจร (มุมบนขวา)</span>
                    </div>
                  )}
                  {showVayaJorn && (
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-[0.5px] rounded text-[9px] font-black bg-[#C6A96B] text-[#020617] leading-none select-none">วัย</span>
                      <span>วัยจร (แถบล่าง)</span>
                    </div>
                  )}
                  {showYearlyJorn && (
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-[0.5px] rounded text-[9px] font-black bg-[#3B82F6] text-white leading-none select-none">ปี</span>
                      <span>ปีจร (แถบล่าง)</span>
                    </div>
                  )}
                  {showMonthlyJorn && (
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-[0.5px] rounded text-[9px] font-black bg-[#06B6D4] text-[#020617] leading-none select-none">ด</span>
                      <span>เดือนจร (แถบล่าง)</span>
                    </div>
                  )}
                  {showDailyJorn && (
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-[0.5px] rounded text-[9px] font-black bg-[#10B981] text-white leading-none select-none">ว</span>
                      <span>วันจร (แถบล่าง)</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
    </div>
  );
}
