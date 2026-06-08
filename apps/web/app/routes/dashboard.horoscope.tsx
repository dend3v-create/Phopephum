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
        birthTime: profile.birth_time || "",
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
      birthTime: parsed.data.birthTime || "",
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

  // ── ระบบจัดการ Tabs ย่อย (4 Tabs) ──
  const [activeTab, setActiveTab] = useState<"calc" | "chart" | "taksa" | "analysis">("chart");

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
  const [showNatalLagna, setShowNatalLagna] = useState(true);
  const [showTransitLagna, setShowTransitLagna] = useState(true);
  const [showVayaJorn, setShowVayaJorn] = useState(false);
  const [showYearlyJorn, setShowYearlyJorn] = useState(false);
  const [showMonthlyJorn, setShowMonthlyJorn] = useState(false);
  const [showDailyJorn, setShowDailyJorn] = useState(false);
  const [showAgeRange, setShowAgeRange] = useState(false);
  const [showHouseNames, setShowHouseNames] = useState(true);
  const [showTaksaMahaBadges, setShowTaksaMahaBadges] = useState(false);

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
    <div className="space-y-6 max-w-5xl pb-20 animate-fade-up">

      {/* ── เมนูหลัก (Page Header) ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
        <div>
          <p className="text-[#C6A96B] text-[10px] tracking-[0.3em] uppercase font-bold">
            ดวงดีมีชัย · ตรวจดวงชะตา
          </p>
          <h1 className="font-display text-4xl font-extrabold text-[#F8F6F1] tracking-tight mt-1">
            ผังดวงจักรพรรดิ
          </h1>
          <p className="text-[#8A8070] text-xs font-medium mt-1 font-sans">
            {formattedTransitDate}
          </p>
        </div>
      </div>

      {/* ── Sub-menu Card Navigation — บนสุด ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          { id: "chart", label: "ผังดวงจักรพรรดิ", icon: "☸️", desc: "เลข 7 ตัว 9 ฐาน" },
          { id: "taksa", label: "ทักษา / มหาภูติ", icon: "🧭", desc: "ผังพลังงานวิถีจร" },
          { id: "analysis", label: "บทวิเคราะห์ชีวิต", icon: "📜", desc: "คำทำนายเจาะลึก" },
          { id: "calc", label: "คำนวณชะตาใหม่", icon: "📝", desc: "เปลี่ยนข้อมูลวันเกิด" },
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
              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 min-h-[70px] text-left hover:scale-[1.01] active:scale-[0.99] ${
                isSelected
                  ? "bg-[#C6A96B] border-[#F8F6F1]/10 text-[#020617] shadow-[0_4px_20px_rgba(198,169,107,0.25)]"
                  : "bg-[#0A2240]/45 border-white/5 text-[#8A8070] hover:text-[#F8F6F1] hover:border-[#C6A96B]/25"
              }`}
            >
              <span className={`text-2xl shrink-0 ${isSelected ? "text-[#020617]" : "text-[#C6A96B]"}`}>
                {tab.icon}
              </span>
              <div className="flex flex-col min-w-0">
                <span className={`text-xs font-extrabold tracking-wide leading-tight ${isSelected ? "text-[#020617]" : "text-[#F8F6F1]"}`}>
                  {tab.label}
                </span>
                <span className={`text-[9px] mt-0.5 leading-none ${isSelected ? "text-[#020617]/70" : "text-[#8A8070]"}`}>
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
              <p className="text-[#C6A96B] text-[10px] tracking-[0.2em] uppercase font-bold mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C6A96B]" />
                ดวงชะตาที่วิเคราะห์ล่าสุด
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {history.map((h: any) => (
                  <div
                    key={h.id}
                    onClick={() => {
                      setActiveResult(h.result_data);
                      setActiveTab("chart");
                    }}
                    className="cursor-pointer group hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    <Card className="border-[#C6A96B]/10 p-4 bg-slate-950/20 group-hover:border-[#C6A96B]/30 transition-all flex flex-col gap-1.5">
                      <p className="text-[11px] font-bold text-[#F8F6F1] truncate">
                        ✨ {h.result_data?.nineBase?.lunarDate?.thaiDateText ?? "คำนวณสด"}
                      </p>
                      <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/5">
                         <span className="text-[9px] text-[#94A3B8]">
                           {new Date(h.created_at).toLocaleDateString("th-TH")}
                         </span>
                         <span className="text-[9px] text-[#C9A96E] font-bold">ใช้ข้อมูลนี้ ➔</span>
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
                      className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#C9A96E] rounded px-2 py-1 text-[10px] outline-none"
                      onChange={(e) => {
                        const cust = customers.find((c: any) => c.id === e.target.value);
                        if (cust) {
                          const dSel = document.querySelector('select[name="birthDay"]') as unknown as HTMLSelectElement | null;
                          const mSel = document.querySelector('select[name="birthMonth"]') as unknown as HTMLSelectElement | null;
                          const ySel = document.querySelector('select[name="birthYear"]') as unknown as HTMLSelectElement | null;
                          const timeInput = document.querySelector('input[name="birthTime"]') as HTMLInputElement;
                          const placeInput = document.querySelector('input[name="birthPlace"]') as HTMLInputElement;
                          
                          if (cust.birth_date) {
                            const [y, m, d] = cust.birth_date.split('-');
                            if (dSel) dSel.value = parseInt(d, 10).toString();
                            if (mSel) mSel.value = parseInt(m, 10).toString();
                            if (ySel) ySel.value = (parseInt(y, 10) + 543).toString();
                          }
                          if (timeInput) timeInput.value = cust.birth_time || '';
                          if (placeInput) placeInput.value = cust.birth_place || '';
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
                    <label htmlFor="saveCustomer" className="text-[11px] text-[#94A3B8] cursor-pointer">บันทึกเป็นลูกค้าใหม่</label>
                  </div>
                  <input 
                    type="text" 
                    name="customerName" 
                    placeholder="ชื่อลูกค้า (สำหรับบันทึก)..." 
                    className="bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded px-2.5 py-1.5 text-[11px] outline-none focus:border-[#C9A96E]/50 flex-1 max-w-[200px]" 
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
                    <span className="text-xs text-[#C9A96E] font-bold uppercase tracking-wider">วันจร (ทำนาย) <span className="text-[9px] font-normal lowercase ml-1">(เปลี่ยนค่าเพื่อดูผลแบบเรียลไทม์)</span></span>
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
            <div className="relative rounded-2xl border border-[#C6A96B]/30 bg-gradient-to-r from-[#0A2240]/70 via-[#0A1628]/80 to-[#0A2240]/70 backdrop-blur-xl px-5 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)] overflow-hidden">
              {/* Glow bg */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#C6A96B]/5 via-transparent to-[#4B6FAE]/5 pointer-events-none" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-[#C6A96B]/40 to-transparent" />

              <div className="relative z-10 space-y-3">
                {/* แถวบน: Moon Phase + วันที่จร */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#C6A96B]/15">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-950/40 flex items-center justify-center text-xl border border-[#C6A96B]/20 shadow-[0_0_12px_rgba(198,169,107,0.2)] select-none shrink-0">
                      {isWaxing ? "🌕" : "🌑"}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[#F8F6F1] font-extrabold text-sm leading-tight flex flex-wrap items-center gap-1.5">
                        <span>{moonPhaseText}</span>
                        <span className="text-[#C6A96B] text-[9px] font-normal border border-[#C6A96B]/25 px-1.5 py-[0.5px] rounded-md bg-[#C6A96B]/5">
                          เดือน {lunar?.lunarMonthName || lunar?.lunarMonth} ปี {lunar?.zodiacName || ''}
                        </span>
                      </span>
                      <span className="text-[#8A8070] text-[10px] italic leading-tight">{lunarDescText}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-3 border-l border-white/10">
                    <span className="text-[#C6A96B] font-display font-extrabold text-lg leading-tight block">{brightnessText}</span>
                    <span className="text-[#8A8070] text-[8px] uppercase tracking-widest font-bold">ความสว่าง</span>
                    <span className="text-[9px] text-[#8A8070] block mt-0.5">{formattedTransitDate}</span>
                  </div>
                </div>

                {/* แถวกลาง: ชื่อเจ้าชะตา + ข้อมูลเกิด */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  {/* ชื่อ */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#C6A96B]/70">เจ้าชะตา</span>
                    <span className="font-display text-xl font-extrabold text-[#F8F6F1] leading-tight">
                      {profile?.display_name ?? "ไม่ระบุชื่อ"}
                    </span>
                  </div>

                  {/* ข้อมูลเกิด */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 md:justify-end text-[10px]">
                    {/* วันเกิด */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#C6A96B]">#</span>
                      <span className="text-[#8A8070]">วันเกิด</span>
                      <span className="text-[#F8F6F1] font-semibold">
                        {(() => {
                          const d = new Date(activeResult.birthDate);
                          return d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
                        })()}
                      </span>
                    </div>
                    {/* เวลาเกิด */}
                    {(activeResult?.birthTime || profile?.birth_time) && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#C6A96B]">◷</span>
                        <span className="text-[#8A8070]">เวลาเกิด</span>
                        <span className="text-[#F8F6F1] font-semibold">{activeResult?.birthTime || profile?.birth_time} น.</span>
                      </div>
                    )}
                    {/* จังหวัดเกิด */}
                    {profile?.birth_place && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#C6A96B]">@</span>
                        <span className="text-[#8A8070]">จังหวัด</span>
                        <span className="text-[#F8F6F1] font-semibold">{profile.birth_place}</span>
                      </div>
                    )}
                    {/* อายุย่าง */}
                    {currentAge > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#C6A96B]">·</span>
                        <span className="text-[#8A8070]">อายุย่าง</span>
                        <span className="text-[#C6A96B] font-extrabold font-display">{currentAge} ปี</span>
                      </div>
                    )}
                    {/* วันจันทรคติเกิด */}
                    {lunar?.dayName && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#C6A96B]">☽</span>
                        <span className="text-[#8A8070]">จันทรคติเกิด</span>
                        <span className="text-[#F8F6F1] font-semibold">
                          วัน{lunar.dayName} เดือน{lunar.lunarMonthName ?? lunar.lunarMonth} ปี{lunar.zodiacName ?? ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Chart Display Config (ด้านบนผัง) ── */}
          <Card className="border-[#C9A96E]/20 bg-slate-950/40 backdrop-blur-md p-4 space-y-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#C9A96E] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C9A96E]" />
                ตัวเลือกการแสดงผลสัญลักษณ์ผังดวง (Chart Display Config)
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setShowNatalLagna(!showNatalLagna)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  showNatalLagna ? "bg-[#C6A96B]/10 border-[#C6A96B]/40 text-[#F8F6F1]" : "bg-transparent border-white/5 text-[#8A8070]"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-[8px] font-bold bg-[#C6A96B] text-[#020617] px-1.5 py-[0.5px] rounded-full border border-[#C6A96B]/60 leading-none">ล</span>
                  <span>ลัคนาเกิด</span>
                </span>
                <span className={`w-2 h-2 rounded-full transition-all ${showNatalLagna ? "bg-[#C6A96B] shadow-[0_0_8px_#C6A96B]" : "bg-white/10"}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowTransitLagna(!showTransitLagna)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  showTransitLagna ? "bg-[#4B6FAE]/10 border-[#4B6FAE]/40 text-[#F8F6F1]" : "bg-transparent border-white/5 text-[#8A8070]"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-[8px] font-bold bg-[#4B6FAE] text-[#F8F6F1] px-1 py-[0.5px] rounded-full border border-[#4B6FAE]/60 leading-none animate-pulse">ลจ</span>
                  <span>ลัคนาจร</span>
                </span>
                <span className={`w-2 h-2 rounded-full transition-all ${showTransitLagna ? "bg-[#4B6FAE] shadow-[0_0_8px_#4B6FAE]" : "bg-white/10"}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowTaksaMahaBadges(!showTaksaMahaBadges)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  showTaksaMahaBadges ? "bg-[#C9A96E]/10 border-[#C9A96E]/40 text-[#F8F6F1]" : "bg-transparent border-white/5 text-[#8A8070]"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[#C9A96E] bg-white/5 px-1 py-[0.5px] rounded border border-white/10 leading-none">ท/ม</span>
                  <span>ทักษาจร</span>
                </span>
                <span className={`w-2 h-2 rounded-full transition-all ${showTaksaMahaBadges ? "bg-[#C9A96E] shadow-[0_0_8px_#C9A96E]" : "bg-white/10"}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowVayaJorn(!showVayaJorn)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  showVayaJorn ? "bg-[#C9A96E]/10 border-[#C9A96E]/40 text-[#F8F6F1]" : "bg-transparent border-white/5 text-[#8A8070]"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#C6A96B] animate-pulse" />
                  <span>วัยจร</span>
                </span>
                <span className={`w-2 h-2 rounded-full transition-all ${showVayaJorn ? "bg-[#C9A96E] shadow-[0_0_8px_#C9A96E]" : "bg-white/10"}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowYearlyJorn(!showYearlyJorn)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  showYearlyJorn ? "bg-[#C9A96E]/10 border-[#C9A96E]/40 text-[#F8F6F1]" : "bg-transparent border-white/5 text-[#8A8070]"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#4B6FAE]" />
                  <span>ปีจร</span>
                </span>
                <span className={`w-2 h-2 rounded-full transition-all ${showYearlyJorn ? "bg-[#C9A96E] shadow-[0_0_8px_#C9A96E]" : "bg-white/10"}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowMonthlyJorn(!showMonthlyJorn)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  showMonthlyJorn ? "bg-pink-500/10 border-pink-500/40 text-[#F8F6F1]" : "bg-transparent border-white/5 text-[#8A8070]"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                  <span>เดือนจร</span>
                </span>
                <span className={`w-2 h-2 rounded-full transition-all ${showMonthlyJorn ? "bg-pink-500 shadow-[0_0_8px_#ec4899]" : "bg-white/10"}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowDailyJorn(!showDailyJorn)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  showDailyJorn ? "bg-emerald-500/10 border-emerald-500/40 text-[#F8F6F1]" : "bg-transparent border-white/5 text-[#8A8070]"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>วันจร</span>
                </span>
                <span className={`w-2 h-2 rounded-full transition-all ${showDailyJorn ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-white/10"}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowAgeRange(!showAgeRange)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  showAgeRange ? "bg-[#C9A96E]/10 border-[#C9A96E]/40 text-[#F8F6F1]" : "bg-transparent border-white/5 text-[#8A8070]"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500/50" />
                  <span>ช่วงอายุ (วัยจร)</span>
                </span>
                <span className={`w-2 h-2 rounded-full transition-all ${showAgeRange ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]" : "bg-white/10"}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowHouseNames(!showHouseNames)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  showHouseNames ? "bg-[#C9A96E]/10 border-[#C9A96E]/40 text-[#F8F6F1]" : "bg-transparent border-white/5 text-[#8A8070]"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#C6A96B]/60" />
                  <span>ชื่อภพเรือน (35 ภพ)</span>
                </span>
                <span className={`w-2 h-2 rounded-full transition-all ${showHouseNames ? "bg-[#C9A96E] shadow-[0_0_8px_#C9A96E]" : "bg-white/10"}`} />
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
            showTaksaMahaBadges={showTaksaMahaBadges}
          />

          {/* ── [ใหม่!] พื้นที่แชทตรวจดวงชะตาสดตาม Filter ── */}
          <Card className="border-[#C9A96E]/20 bg-[#0A2240]/40 backdrop-blur-md p-5 space-y-4 rounded-2xl relative overflow-hidden">
            {/* Background Aura */}
            <div className="absolute inset-0 bg-radial-gradient from-[#4B6FAE]/5 via-transparent to-transparent pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-[#C9A96E]/15 pb-2">
              <span className="text-xs text-[#C9A96E] font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C9A96E] animate-ping" />
                พื้นที่แชทตรวจดวงชะตาสด (AI Chat Assistant)
              </span>
              <span className="text-[10px] text-[#8A8070]">ครูเด่น มาสเตอร์ฟา วิเคราะห์</span>
            </div>
            
            {/* กล่องประวัติแชท */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto p-3 bg-slate-950/60 rounded-2xl border border-white/5">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    msg.sender === "user" 
                      ? "bg-gradient-to-br from-[#C6A96B] to-[#D9BC82] text-[#020617] font-semibold rounded-tr-none" 
                      : "bg-[#0A2240]/60 border border-[#C6A96B]/15 text-[#F8F6F1] rounded-tl-none"
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-[#8A8070] mt-1 px-1">{msg.time}</span>
                </div>
              ))}
            </div>

            {/* กล่องกรอกข้อมูลเพื่อพูดคุย */}
            <div className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                placeholder="สอบถามคำทำนายเพิ่มเติมเกี่ยวกับดวงชะตาของท่านหรือดาวจรที่กรองไว้ได้เลยค่ะ..."
                className="flex-1 bg-slate-950/40 border border-[#C9A96E]/20 text-[#F8F6F1] rounded-xl px-4 py-2.5 text-xs focus:border-[#C9A96E]/50 outline-none"
                onKeyDown={e => {
                  if (e.key === "Enter" && userInput.trim()) {
                    const userMsgText = userInput.trim();
                    setChatMessages(prev => [
                      ...prev,
                      {
                        sender: "user",
                        text: userMsgText,
                        time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
                      }
                    ]);
                    setUserInput("");
                    
                    // สุ่มคำทำนายเชิงบวกและให้กำลังใจตามสไตล์คัมภีร์ดวง
                    setTimeout(() => {
                      setChatMessages(prev => [
                        ...prev,
                        {
                          sender: "ai",
                          text: `🔮 จากคำถามของคุณที่เกี่ยวข้องกับ "${userMsgText}" ครูเด่นได้วิเคราะห์ทิศทางปีจรจักรพรรดิและยามอัฏฐกาลแล้วพบว่า ปีจรนี้คุณมีพลังการจัดการที่ดียิ่งค่ะ ปัจจัยภายนอกที่เป็นอุปสรรคจะเริ่มคลี่คลายตัวลง แนะนำให้นิ่งประคองจิตใจ เสริมบุญด้วยเมตตาบารมี แล้วความเจริญงอกงามจะบังเกิดสู่ท่านอย่างแน่นอนค่ะ`,
                          time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
                        }
                      ]);
                    }, 1000);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (userInput.trim()) {
                    const userMsgText = userInput.trim();
                    setChatMessages(prev => [
                      ...prev,
                      {
                        sender: "user",
                        text: userMsgText,
                        time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
                      }
                    ]);
                    setUserInput("");
                    
                    setTimeout(() => {
                      setChatMessages(prev => [
                        ...prev,
                        {
                          sender: "ai",
                          text: `🔮 จากคำถามของคุณที่เกี่ยวข้องกับ "${userMsgText}" ครูเด่นได้วิเคราะห์ทิศทางปีจรจักรพรรดิและยามอัฏฐกาลแล้วพบว่า ปีจรนี้คุณมีพลังการจัดการที่ดียิ่งค่ะ ปัจจัยภายนอกที่เป็นอุปสรรคจะเริ่มคลี่คลายตัวลง แนะนำให้นิ่งประคองจิตใจ เสริมบุญด้วยเมตตาบารมี แล้วความเจริญงอกงามจะบังเกิดสู่ท่านอย่างแน่นอนค่ะ`,
                          time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
                        }
                      ]);
                    }, 1000);
                  }
                }}
                className="bg-[#C9A96E] hover:bg-[#C9A96E]/80 text-[#020617] font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-[0_4px_12px_rgba(198,169,107,0.15)] shrink-0"
              >
                ส่งข้อความ
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
          {hoverNum !== null && activeResult?.taksaMaha ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <YearlyStarPredictionPanel 
                star={hoverNum} 
                taksaMaha={activeResult.taksaMaha}
              />
            </div>
          ) : (
            <Card className="border-[#C9A96E]/20 bg-slate-950/20 py-6 px-4 text-center">
              <p className="text-xs text-[#8A8070]">
                💡 ลองสลับไปที่เมนู **ผังดวงจักรพรรดิ** แล้วคลิกเลือกดาวดวงใดดวงหนึ่งในผังดวงชะตา เพื่อดึงคำพยากรณ์ปีจรเฉพาะบุคคลแบบเจาะลึกมาแสดงผลตรงนี้ทันทีค่ะ
              </p>
            </Card>
          )}

          {/* ส่วนรายงานชะตาชีวิต (AI Reports & Categories) */}
          <div className="space-y-6 pt-6 border-t border-[#C9A96E]/20">
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
    <Card className="border-[#C9A96E]/30 bg-gradient-to-br from-[#0A2240]/60 to-[#020617]/90 backdrop-blur-xl p-5 relative overflow-hidden shadow-2xl rounded-2xl">
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#C9A96E]/5 rounded-full blur-3xl -z-10" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#C9A96E]/20 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#C9A96E]/15 border border-[#C9A96E]/35 flex items-center justify-center font-display text-2xl font-bold text-[#C9A96E] shadow-inner animate-pulse">
            {star}
          </div>
          <div>
            <h4 className="font-display text-lg font-bold text-[#F8F6F1] glow-gold flex items-center gap-2">
              ถอดรหัสดาวชะตา: {starInfo.title}
            </h4>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="text-[9px] font-semibold bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[#8A8070]">
                ธาตุ{starInfo.element} {ELEMENT_ICONS[starInfo.element]}
              </span>
              {pairNotice && pairInfo && (
                <span className="text-[9px] font-semibold bg-[#C9A96E]/10 border border-[#C9A96E]/25 px-2 py-0.5 rounded-full text-[#C9A96E]">
                  คู่ธาตุ{pairInfo.element}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 md:justify-end">
          {currentTaksa && (
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border ${
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
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border ${
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
          <p className="text-[10px] uppercase font-bold text-[#8A8070] tracking-wider mb-1">บทบาทและอุปนิสัยดวงดาว</p>
          <p className="text-xs text-[#8A8070] italic">{starInfo.desc}</p>
        </div>

        <div className="space-y-3 pt-1">
          <div>
            <p className="text-[10px] uppercase font-bold text-[#C9A96E] tracking-wider mb-1 flex items-center gap-1.5">
              <span>🍃</span> ปัจจัยภายนอก (ทักษาจรทำนายปีนี้)
            </p>
            <p className="text-xs bg-[#C9A96E]/5 border border-[#C9A96E]/10 rounded-xl p-3 text-[#F8F6F1]">
              {forecastSentence}
            </p>
          </div>

          {currentMaha && (
            <div>
              <p className="text-[10px] uppercase font-bold text-[#4B6FAE] tracking-wider mb-1 flex items-center gap-1.5">
                <span>🌊</span> สภาวะภายใน (มหาภูติจรทำนายจิตใจ)
              </p>
              <p className="text-xs bg-[#4B6FAE]/5 border border-[#4B6FAE]/10 rounded-xl p-3 text-[#F8F6F1]">
                {mahaSentence}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 text-[10px] text-[#8A8070] border-t border-white/5">
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
    border: "border-[#C9A96E]/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]",
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
        <p className="text-[#C9A96E] text-[10px] uppercase tracking-widest font-bold">ปฏิทินจันทรคติไทย (ปฏิทิน 100 ปี)</p>
      </div>
      <p className="text-[#F3EFE8] font-semibold text-lg">
        วัน{lunar.dayName || lunar.dayPlanet} เดือน{lunar.lunarMonthName || lunar.lunarMonth} ปี{lunar.zodiacName || ''}
        <span className="text-[#C9A96E] ml-3 text-sm font-normal">({lunar.moonPhase})</span>
      </p>
      <div className="flex gap-4 mt-4 text-xs text-[#8A8070]">
        <span className="bg-white/5 px-3 py-1 rounded-full">ดาวประจำวัน: <span className="text-[#C9A96E] font-bold">{lunar.dayPlanet}</span></span>
        <span className="bg-white/5 px-3 py-1 rounded-full">ขึ้น/แรม: {lunar.moonPhase || `ขึ้น ${lunar.lunarDay} ค่ำ เดือน ${lunar.lunarMonth}`}</span>
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
  showTaksaMahaBadges = false,
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
  showTaksaMahaBadges?: boolean;
}) {
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
      <Card className="p-0 overflow-hidden border-[#D9BC82]/20 shadow-2xl cursor-default">
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="bg-[#D9BC82]/10 p-4 border-b border-[#D9BC82]/20 flex justify-between items-center"
      >
        <p className="text-[#D9BC82] text-base font-bold uppercase tracking-widest">ผังดวงเลข 7 ตัว 9 ฐาน (35 ภพเรือนสมบูรณ์)</p>
        <span className="text-xs text-[#8A8070]">แตะตัวเลขเพื่อดูความเชื่อมโยง</span>
      </div>
      <div className="overflow-x-auto p-6 bg-slate-900/30">
        <table className="w-full border-collapse">
          <tbody>
            {matrix.map((row, rIdx) => {
              const isBase4 = rIdx === 3;
              const isTargetRow = [0, 1, 2, 7, 8].includes(rIdx);
              return (
                <tr 
                  key={rIdx} 
                  className={`group transition-all ${
                    isBase4 
                      ? "bg-[#4B6FAE]/15 border-y border-[#4B6FAE]/45 shadow-[inset_0_1px_3px_rgba(75,110,174,0.15)]" 
                      : "hover:bg-white/5"
                  }`}
                >
                  <td className="py-2 pr-6 text-left whitespace-nowrap min-w-[120px]">
                    <p className={`text-sm font-bold ${isBase4 ? "text-[#8AA7DF]" : "text-[#F8F6F1]"}`}>{ROW_META[rIdx].label}</p>
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
                    const isGlowFiltered = isFiltering && highlightedStars.has(isBase4 ? matrix[2]?.[cIdx] : actualNum);
                    const isHighlighted = isBaseHighlight || isGlowFiltered;
                    const isDimmed = isFiltering && !isGlowFiltered;
                    
                    const c = numColor(num, isHighlighted);
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
                      <td key={cIdx} className="p-2 min-w-[64px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNumClick(isBase4 ? matrix[2]?.[cIdx] : actualNum);
                          }}
                          type="button"
                          className="flex flex-col items-center gap-1.5 w-full focus:outline-none relative group/cell"
                        >
                          <div className="relative">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-sans text-[22px] border transition-all duration-300 transform 
                              ${isHighlighted ? "scale-125 z-10 shadow-[0_0_15px_rgba(201,169,110,0.6)] border-[#C9A96E]" : ""} 
                              ${isDimmed ? "opacity-25 scale-90 border-white/5 saturate-50" : ""} 
                              ${isGlowFiltered ? "animate-pulse ring-2 ring-[#C9A96E] ring-offset-2 ring-offset-slate-950" : ""}
                              ${c.bg} ${c.text} ${c.border}`}>
                              {num}
                            </div>
                            
                            {/* Taksa Transit Badge (Top-Right) */}
                            {showTaksaMahaBadges && taksaInd && (
                              <span 
                                title={taksaInd.fullName}
                                className={`absolute -top-1.5 -right-2 text-[7px] font-bold px-1 py-[1px] rounded-md border leading-none shadow-sm transition-all group-hover/cell:scale-105 ${taksaInd.color}`}
                              >
                                {taksaInd.label}
                              </span>
                            )}
                            
                            {/* Maha Transit Badge (Top-Left) */}
                            {showTaksaMahaBadges && mahaInd && (
                              <span 
                                title={mahaInd.fullName}
                                className={`absolute -top-1.5 -left-2 text-[7px] font-bold px-1 py-[1px] rounded-md border leading-none shadow-sm transition-all group-hover/cell:scale-105 ${mahaInd.color}`}
                              >
                                {mahaInd.label}
                              </span>
                            )}

                            {/* ลัคนากำเนิด (ล) - Bottom Left */}
                            {showNatalLagna && isLagnaNatal && (
                              <span 
                                title="ลัคนากำเนิด"
                                className="absolute -bottom-1 -left-2.5 text-[8px] font-bold bg-[#C6A96B] text-[#020617] border border-[#C6A96B]/60 px-1 py-[0.5px] rounded-full leading-none shadow-md transition-all group-hover/cell:scale-105 select-none z-10"
                              >
                                ล
                              </span>
                            )}

                            {/* ลัคนาจร (ลจ) - Bottom Right */}
                            {showTransitLagna && isLagnaTransit && (
                              <span
                                title={`ลัคนาจร (อายุย่าง ${phopephumResult?.taksaTransit?.ageYang ?? 0} ปี)`}
                                className="absolute -bottom-1 -right-2.5 text-[8px] font-bold bg-[#4B6FAE] text-[#F8F6F1] border border-[#4B6FAE]/60 px-1 py-[0.5px] rounded-full leading-none shadow-md transition-all group-hover/cell:scale-105 select-none animate-pulse z-10"
                              >
                                ลจ
                              </span>
                            )}

                            {/* วัยจร / ปีจร / เดือนจร / วันจร Dots - Bottom Center */}
                            {((showVayaJorn && isVayaJorn) || 
                              (showYearlyJorn && isYearlyJorn) || 
                              (showMonthlyJorn && isMonthlyJorn) || 
                              (showDailyJorn && isDailyJorn)) && (
                              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-center justify-center gap-0.5 bg-slate-950/90 px-1.5 py-[1.5px] rounded-full border border-white/10 shadow-sm z-20">
                                {showVayaJorn && isVayaJorn && (
                                  <span 
                                    title="วัยจร"
                                    className="w-1.5 h-1.5 rounded-full bg-[#C6A96B] animate-pulse"
                                  />
                                )}
                                {showYearlyJorn && isYearlyJorn && (
                                  <span 
                                    title="ปีจร"
                                    className="w-1.5 h-1.5 rounded-full bg-[#4B6FAE]"
                                  />
                                )}
                                {showMonthlyJorn && isMonthlyJorn && (
                                  <span 
                                    title="เดือนจร"
                                    className="w-1.5 h-1.5 rounded-full bg-pink-500"
                                  />
                                )}
                                {showDailyJorn && isDailyJorn && (
                                  <span 
                                    title="วันจร"
                                    className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col items-center mt-1">
                            {showHouseNames && houseName && (
                              <span className={`text-[12px] font-bold leading-none mb-0.5 transition-colors ${
                                isHighlighted 
                                  ? "text-[#C9A96E] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" 
                                  : "text-[#B4A790] drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]"
                              }`}>
                                {houseName}
                              </span>
                            )}
                            {showAgeRange && rIdx < 3 && (
                              <span className="text-[10px] text-[#8A8070]/70 mt-1 leading-none font-sans font-semibold">
                                {getCellAgeRange(rIdx, cIdx, matrix)} ปี
                              </span>
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

      {/* ── ลัคนาเกิด / ลัคนาจร Detail Panel ── */}
      {phopephumResult?.lagna && (
        <div className="bg-[#020617]/60 border-t border-[#C6A96B]/15 px-5 py-3 space-y-2 text-[11px]">
          {/* ลัคนาเกิด */}
          {showNatalLagna && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="px-1.5 py-[1px] rounded-full text-[8px] font-bold bg-[#C6A96B] text-[#020617] leading-none select-none shrink-0">ล</span>
              <span className="text-[#C6A96B] font-semibold shrink-0">ลัคนาเกิด</span>
              <span className="text-[#8A8070]">ยามที่</span>
              <span className="text-[#F8F6F1] font-bold">{phopephumResult.lagna.yamYaiNumber ?? "—"}</span>
              <span className="text-[#8A8070]">ดาว</span>
              <span className="text-[#F8F6F1] font-bold">{STAR_NAMES[phopephumResult.lagna.star as 1|2|3|4|5|6|7] ?? "—"}</span>
              <span className="text-[#8A8070]">{phopephumResult.lagna.subPeriod === 'early' ? 'ยามต้น' : phopephumResult.lagna.subPeriod === 'middle' ? 'ยามกลาง' : 'ยามปลาย'}</span>
              <span className="text-[#8A8070]">ฤกษ์</span>
              <span className="text-[#F8F6F1] font-bold">{phopephumResult.lagna.reksName ?? "—"}</span>
              <span className="text-[#8A8070]">→</span>
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
                <span className="w-2 h-2 rounded-full bg-[#C6A96B] animate-pulse shrink-0" />
                <span className="text-[#C6A96B] font-semibold shrink-0">วัยจร</span>
                <span className="text-[#8A8070]">อายุย่าง</span>
                <span className="text-[#F8F6F1] font-bold">{phopephumResult.taksaTransit?.ageYang ?? "—"} ปี</span>
                <span className="text-[#8A8070]">ช่วง</span>
                <span className="text-[#F8F6F1] font-bold">{j.ageRange ?? "—"}</span>
                <span className="text-[#8A8070]">→</span>
                <span className="text-[#C6A96B] font-bold">ฐาน {j.row}</span>
                <span className="text-[#F8F6F1] font-semibold">ภพ{j.houseName}</span>
                {j.yumStar && (
                  <>
                    <span className="text-[#8A8070]">ดาวยํ้าฐาน {j.yumBase ?? "—"}</span>
                    <span className="text-amber-300 font-bold">{STAR_NAMES[j.yumStar as 1|2|3|4|5|6|7] ?? j.yumStar}({j.yumStar})</span>
                  </>
                )}
                <span className="text-[#8A8070]">กำลัง</span>
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
                <span className="w-2 h-2 rounded-full bg-[#4B6FAE] shrink-0" />
                <span className="text-[#4B6FAE] font-semibold shrink-0">ปีจร</span>
                <span className="text-[#8A8070]">อายุย่าง</span>
                <span className="text-[#F8F6F1] font-bold">{phopephumResult.taksaTransit?.ageYang ?? "—"} ปี</span>
                <span className="text-[#8A8070]">→</span>
                <span className="text-[#4B6FAE] font-bold">ฐาน {j.row}</span>
                <span className="text-[#F8F6F1] font-semibold">ภพ{j.houseName}</span>
                {j.yumStar && (
                  <>
                    <span className="text-[#8A8070]">ดาวยํ้าฐาน {j.yumBase ?? "—"}</span>
                    <span className="text-sky-300 font-bold">{STAR_NAMES[j.yumStar as 1|2|3|4|5|6|7] ?? j.yumStar}({j.yumStar})</span>
                  </>
                )}
                <span className="text-[#8A8070]">กำลัง</span>
                <span className="text-[#4B6FAE] font-bold">{b4name}({b4val})</span>
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
                <span className="px-1 py-[1px] rounded-full text-[8px] font-bold bg-[#4B6FAE] text-[#F8F6F1] leading-none select-none shrink-0">ลจ</span>
                <span className="text-[#4B6FAE] font-semibold shrink-0">ลัคนาจร</span>
                <span className="text-[#8A8070]">อายุย่าง</span>
                <span className="text-[#F8F6F1] font-bold">{phopephumResult.taksaTransit?.ageYang ?? "—"} ปี</span>
                <span className="text-[#8A8070]">นับจาก</span>
                <span className="text-[#C6A96B]">ฐาน {phopephumResult.lagna.row} {phopephumResult.lagna.houseName}</span>
                <span className="text-[#8A8070]">→</span>
                <span className="text-[#4B6FAE] font-bold">ฐาน {j.row}</span>
                <span className="text-[#F8F6F1] font-semibold">ภพ{j.houseName}</span>
                {j.yumStar && (
                  <>
                    <span className="text-[#8A8070]">ดาวยํ้าฐาน {j.yumBase ?? "—"}</span>
                    <span className="text-violet-300 font-bold">{STAR_NAMES[j.yumStar as 1|2|3|4|5|6|7] ?? j.yumStar}({j.yumStar})</span>
                  </>
                )}
                <span className="text-[#8A8070]">กำลัง</span>
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
                <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
                <span className="text-pink-400 font-semibold shrink-0">เดือนจร</span>
                <span className="text-[#8A8070]">เดือน</span>
                <span className="text-[#F8F6F1] font-bold">
                  {phopephumResult.horary?.lunarDate?.lunarMonthName ?? phopephumResult.horary?.lunarDate?.lunarMonth ?? "—"}
                </span>
                <span className="text-[#8A8070]">→</span>
                <span className="text-pink-400 font-bold">ฐาน {j.row}</span>
                <span className="text-[#F8F6F1] font-semibold">ภพ{j.houseName}</span>
                {j.yumStar && (
                  <>
                    <span className="text-[#8A8070]">ดาวยํ้าฐาน {j.yumBase ?? 6}</span>
                    <span className="text-pink-300 font-bold">{STAR_NAMES[j.yumStar as 1|2|3|4|5|6|7] ?? j.yumStar}({j.yumStar})</span>
                  </>
                )}
                <span className="text-[#8A8070]">กำลัง</span>
                <span className="text-pink-300 font-bold">{b4name}({b4val})</span>
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
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-emerald-400 font-semibold shrink-0">วันจร</span>
                <span className="text-[#8A8070]">วัน</span>
                <span className="text-[#F8F6F1] font-bold">
                  {phopephumResult.horary?.lunarDate?.dayName ?? "—"}
                </span>
                <span className="text-[#8A8070]">→</span>
                <span className="text-emerald-400 font-bold">ฐาน {j.row}</span>
                <span className="text-[#F8F6F1] font-semibold">ภพ{j.houseName}</span>
                {j.yumStar && (
                  <>
                    <span className="text-[#8A8070]">ดาวยํ้าฐาน {j.yumBase ?? 5}</span>
                    <span className="text-emerald-300 font-bold">{STAR_NAMES[j.yumStar as 1|2|3|4|5|6|7] ?? j.yumStar}({j.yumStar})</span>
                  </>
                )}
                <span className="text-[#8A8070]">กำลัง</span>
                <span className="text-emerald-300 font-bold">{b4name}({b4val})</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Legend Block */}
      {taksaMaha && (
        <div className="bg-[#0f172a]/50 p-4 border-t border-[#D9BC82]/10 text-[10px] space-y-2 text-[#8A8070]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-bold text-[#D9BC82] uppercase tracking-wider text-[9px] w-full">ปัจจัยภายนอก (ทักษาจร — 8 ภพ):</span>
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
                <span className={`px-1 py-[0.5px] rounded border text-[7px] font-bold leading-none ${cls}`}>{label}</span>
                <span className="text-[9px]">{desc}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1 border-t border-white/5">
            <span className="font-bold text-[#D9BC82] uppercase tracking-wider text-[9px] w-full">ปัจจัยภายใน (มหาภูติจร — 7 ตำแหน่ง):</span>
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
                <span className={`px-1 py-[0.5px] rounded border text-[7px] font-bold leading-none ${cls}`}>{label}</span>
                <span className="text-[9px]">{desc}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 border-t border-white/5">
            <span className="font-bold text-[#D9BC82] uppercase tracking-wider text-[9px]">สัญลักษณ์ผังดวง:</span>
            {showNatalLagna && (
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-[0.5px] rounded-full text-[8px] font-bold bg-[#C6A96B] text-[#020617] border border-[#C6A96B]/60 leading-none select-none">ล</span>
                <span>ลัคนากำเนิด</span>
              </div>
            )}
            {showTransitLagna && (
              <div className="flex items-center gap-1.5">
                <span className="px-1 py-[0.5px] rounded-full text-[9px] font-bold bg-[#4B6FAE] text-[#F8F6F1] border border-[#4B6FAE]/60 leading-none select-none">ลจ</span>
                <span>ลัคนาจร</span>
              </div>
            )}
            {showVayaJorn && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C6A96B] animate-pulse" />
                <span>วัยจร</span>
              </div>
            )}
            {showYearlyJorn && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4B6FAE]" />
                <span>ปีจร</span>
              </div>
            )}
            {showMonthlyJorn && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                <span>เดือนจร</span>
              </div>
            )}
            {showDailyJorn && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>วันจร</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
    </div>
  );
}
