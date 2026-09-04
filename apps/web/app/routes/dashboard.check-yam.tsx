/**
 * dashboard.check-yam.tsx — Intent-Based Prediction & Timing Hub (PhopePhum V3)
 *
 * Core Concept:
 * USER ไม่ต้องเลือกศาสตร์/ยาม
 * USER เลือกหรือพิมพ์ "เรื่องที่ต้องการรู้"
 * → ระบบ parse intent และดึง energy logic ที่ตรงจุดที่สุด (ยามอัฏฐกาล, พรายกระซิบ, ราหูค้นทรัพย์, ฤกษ์มงคล, ทักษา)
 * → แปลงผลลัพธ์เป็นคำแนะนำภาษาคน (Level 1: No Jargon) พร้อม Evidence Chain (Level 2)
 */

import { json } from "@remix-run/cloudflare";
import { useLoaderData, useActionData, useNavigation, Form, Link, useRevalidator, useFetcher } from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { saveWisdomQuery } from "~/services/wisdom.server";
import {
  getCurrentYam,
  calculateKarnchata,
  calculateHoraTaynoo,
  calculateRahu,
  calculateAuspiciousTime,
  PLANET_INFO,
  ZODIAC_ORDER,
} from "@phopephum/engine";
import { parseIntent, SUGGESTION_CHIPS } from "~/services/intentParser.server";
import { orchestratePrediction, type PredictionResult } from "~/services/predictionOrchestrator.server";
import { compareTimingWindows } from "~/services/timingComparison.server";
import type {
  CandidateWindow,
  CandidateWindowInput,
  TimingComparisonResult,
  TimingSuitability,
} from "@phopephum/types";
import type { Env } from "~/env.server";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import i18next from "~/lib/i18n/i18n.server";

export const meta: MetaFunction = () => [
  { title: "ถามฤกษ์ & ไขคำถาม — PhopePhum" },
  { name: "description", content: "ค้นหาจังหวะเวลาและคำตอบจากพลังงานจักรวาล ตอบตรงประเด็นด้วยภาษาชีวิตจริง" },
];

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  const locale = await i18next.getLocale(request);
  const currentLocale = locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "th-TH";

  const now = new Date();

  const yam = getCurrentYam();
  const karnchata = calculateKarnchata(now);
  const hora = calculateHoraTaynoo({ dateAsked: now });
  const rahu = calculateRahu(now);
  const auspicious = calculateAuspiciousTime(now);

  const formattedDate = now.toLocaleDateString(currentLocale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return json({
    serverTime: now.toISOString(),
    formattedDate,
    userName: profile?.display_name || "คุณ",
    suggestionChips: SUGGESTION_CHIPS,
    yam: {
      yamNumber: yam.yamNumber,
      yamName:   yam.yamName,
      period:    yam.period,
      phase:     yam.phase,
      level:     yam.travelAuspiciousness.level,
      label:     yam.travelAuspiciousness.label,
      ticks:     yam.travelAuspiciousness.ticks,
      shouldDo:  yam.prediction?.shouldDo ?? "",
    },
    karnchata: {
      yamYaiName:     karnchata.yamYaiName,
      yamYaiNumber:   karnchata.yamYaiNumber,
      yamSoyName:     karnchata.yamSoyName,
      yamSoyNumber:   karnchata.yamSoyNumber,
      dayStarNumber:  karnchata.dayStarNumber,
      lunarMonthName: karnchata.lunarMonthName,
    },
    hora: {
      yamAsked:    hora.yamAsked,
      period:      hora.period,
      yamPlanet:   hora.yamPlanet,
      dayPlanet:   hora.dayPlanet,
      yamStartStr: hora.yamStartStr,
      yamEndStr:   hora.yamEndStr,
      lagnaName:   ZODIAC_ORDER[hora.lagnaZodiacIndex]?.name ?? "—",
    },
    rahu: rahu ? {
      isGood:    rahu.is_current_moment_good,
      verdict:   rahu.summary.overall_verdict,
      advice:    rahu.summary.advice,
      yamName:   rahu.summary.current_yam_name,
      phase:     rahu.summary.phase,
      startTime: rahu.main_block.start_time,
      endTime:   rahu.main_block.end_time,
    } : null,
    auspiciousBestSlot: auspicious.bestSlot ? {
      timeRange: auspicious.bestSlot.timeRange,
      suitableFor: auspicious.bestSlot.suitableFor,
    } : null,
  });
}

// ─── Action ───────────────────────────────────────────────────────────────────

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  const formData = await request.formData();
  const formType = String(formData.get("formType") || "instant");

  // ── STEP 4.4: Timing Comparison Action ─────────────────────────────────────
  if (formType === "compareTiming") {
    const activity = String(formData.get("activity") || "ทำสัญญา").trim();
    const date = String(formData.get("date") || "").trim();
    const question = String(formData.get("question") || "").trim();

    const winAStart = String(formData.get("winA_start") || "").trim();
    const winAEnd = String(formData.get("winA_end") || "").trim();
    const winBStart = String(formData.get("winB_start") || "").trim();
    const winBEnd = String(formData.get("winB_end") || "").trim();
    const winCStart = String(formData.get("winC_start") || "").trim();
    const winCEnd = String(formData.get("winC_end") || "").trim();

    let customWindows: CandidateWindowInput[] | undefined;
    if (winAStart && winAEnd && winBStart && winBEnd) {
      customWindows = [
        { id: "A", label: "ช่วงเวลา A", start: winAStart, end: winAEnd },
        { id: "B", label: "ช่วงเวลา B", start: winBStart, end: winBEnd },
      ];
      if (winCStart && winCEnd) {
        customWindows.push({ id: "C", label: "ช่วงเวลา C", start: winCStart, end: winCEnd });
      }
    }

    try {
      const { supabase } = createSupabaseClient(request, env);
      const comparisonResult = await compareTimingWindows({
        question,
        activity,
        date: date || undefined,
        customWindows,
        userId: user.id,
        supabase,
        aiWorkerUrl: env.AI_WORKER_URL,
        aiWorkerSecret: env.AI_WORKER_SECRET,
        userName: profile?.display_name || "คุณ",
      });

      return json<{ error?: string; prediction?: PredictionResult; comparisonResult?: TimingComparisonResult }>({
        comparisonResult,
      });
    } catch (err: any) {
      return json<{ error?: string; prediction?: PredictionResult; comparisonResult?: TimingComparisonResult }>(
        { error: err?.message || "เกิดข้อผิดพลาดในการเปรียบเทียบช่วงเวลา" },
        { status: 500 }
      );
    }
  }

  // ── Existing Instant Prediction Action ─────────────────────────────────────
  const question = String(formData.get("question") || "").trim();

  if (!question) {
    return json<{ error?: string; prediction?: PredictionResult; comparisonResult?: TimingComparisonResult }>({ error: "กรุณาระบุคำถามหรือเรื่องที่ต้องการทราบ" }, { status: 400 });
  }

  const now = new Date();

  // 1. Rule-based Intent Parsing (Zero AI token cost)
  const parsedIntent = parseIntent(question);

  // 2. Orchestrate Prediction (Synthesizes relevant engines + AI translation)
  const prediction = await orchestratePrediction(
    parsedIntent,
    profile ? {
      displayName: profile.display_name,
      birthDate: profile.birth_date,
      birthTime: profile.birth_time,
      birthPlace: profile.birth_place,
    } : null,
    env.AI_WORKER_URL,
    env.AI_WORKER_SECRET,
    now
  );

  // 3. Auto-save valid prediction to Unified Wisdom Memory (STEP 4.1 & 4.2)
  if (prediction && prediction.answer && !prediction.error) {
    try {
      const { supabase } = createSupabaseClient(request, env);
      const saved = await saveWisdomQuery(supabase, user.id, {
        question: prediction.question,
        intentCategory: prediction.intentCategory,
        contextType: "horary",
        confidence: prediction.confidence,
        answer: prediction.answer,
        actionable: prediction.actionable,
        bestWindow: prediction.bestWindow,
        predictionScore: prediction.predictionScore,
        evidenceSnapshot: prediction.evidenceChain,
        engineSnapshot: prediction.engineSnapshot,
      });
      if (saved?.id) {
        prediction.queryId = saved.id;
        prediction.isBookmarked = saved.is_bookmarked;
      }
    } catch (saveErr) {
      console.warn("[dashboard.check-yam] Auto-save wisdom query failed:", saveErr);
    }
  }

  return json<{ error?: string; prediction?: PredictionResult; comparisonResult?: TimingComparisonResult }>({ prediction });
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<string, string> = {
  excellent: "text-[#C6A96B] border-[#C6A96B]/40 bg-[#C6A96B]/8",
  very_good: "text-[#D9BC82] border-[#D9BC82]/30 bg-[#D9BC82]/6",
  good:      "text-[#F8F6F1] border-[#F8F6F1]/20 bg-white/5",
  bad:       "text-[#6D8FC7] border-[#6D8FC7]/20 bg-[#4B6FAE]/5",
};

const CATEGORY_ICONS: Record<string, { label: string; emoji: string; color: string }> = {
  timing:       { label: "จังหวะเวลา & ฤกษ์", emoji: "✈️", color: "text-amber-400 bg-amber-400/10 border-amber-400/30" },
  finance:      { label: "การเงิน & ธุรกิจ",  emoji: "💰", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" },
  relationship: { label: "ความสัมพันธ์",      emoji: "💛", color: "text-rose-400 bg-rose-400/10 border-rose-400/30" },
  lost:         { label: "ค้นหาสิ่งของ",     emoji: "🔍", color: "text-sky-400 bg-sky-400/10 border-sky-400/30" },
  career:       { label: "การงาน & อาชีพ",    emoji: "💼", color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/30" },
  health:       { label: "สุขภาพ & ความเป็นอยู่", emoji: "🌿", color: "text-teal-400 bg-teal-400/10 border-teal-400/30" },
  general:      { label: "คำถามทั่วไป",      emoji: "✦",  color: "text-[#C6A96B] bg-[#C6A96B]/10 border-[#C6A96B]/30" },
};

const SUITABILITY_META: Record<
  TimingSuitability,
  { label: string; emoji: string; badgeColor: string; cardBorder: string; bg: string }
> = {
  optimal: {
    label: "ช่วงเวลาทอง (ดีเลิศ)",
    emoji: "🌟",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
    cardBorder: "border-emerald-400/50 shadow-lg shadow-emerald-500/10",
    bg: "bg-gradient-to-b from-emerald-950/40 via-[#0A1A2F] to-[#020617]",
  },
  favorable: {
    label: "จังหวะส่งเสริม (ดี)",
    emoji: "✨",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-400/40",
    cardBorder: "border-blue-400/40 shadow-md shadow-blue-500/10",
    bg: "bg-gradient-to-b from-blue-950/30 via-[#0A1A2F] to-[#020617]",
  },
  neutral: {
    label: "ปานกลาง (พอใช้)",
    emoji: "⚖️",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-400/30",
    cardBorder: "border-white/10",
    bg: "bg-[#0A1A2F]/80",
  },
  cautious: {
    label: "ควรระวัง (ชะลอ)",
    emoji: "⚠️",
    badgeColor: "bg-orange-500/20 text-orange-300 border-orange-400/30",
    cardBorder: "border-orange-500/30",
    bg: "bg-[#0A1A2F]/80",
  },
  avoid: {
    label: "ควรหลีกเลี่ยง",
    emoji: "✕",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-400/30",
    cardBorder: "border-rose-500/30",
    bg: "bg-[#0A1A2F]/80",
  },
};

const COMPARE_ACTIVITIES = [
  "ทำสัญญา",
  "เจรจาธุรกิจ",
  "เปิดตัว/เริ่มธุรกิจ",
  "ลงทุน/การเงิน",
  "เดินทาง/ออกรถ",
  "ความรัก/นัดหมาย",
  "ทั่วไป",
];

function LiveClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const fmt = (n: number) => String(n).padStart(2, "0");
  const h = t.getHours(), m = t.getMinutes(), s = t.getSeconds();
  return (
    <span className="font-mono text-[#C6A96B] text-xl sm:text-2xl font-bold tabular-nums tracking-widest">
      {fmt(h)}:{fmt(m)}:{fmt(s)}
    </span>
  );
}

function Ticks({ ticks }: { ticks: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3].map((i) => (
        <span key={i} className={`w-2 h-2 rounded-full ${i <= ticks ? "bg-[#C6A96B]" : "bg-white/10"}`} />
      ))}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CheckYamPage() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const { revalidate } = useRevalidator();
  const { t } = useTranslation(["yam", "common", "horoscope"]);

  // Modes: instant question vs compare timing windows
  const [activeMode, setActiveMode] = useState<"instant" | "compare">("instant");

  const [inputQuery, setInputQuery] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);
  const [showProTools, setShowProTools] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // STEP 4.4: Timing Comparison state
  const [selectedActivity, setSelectedActivity] = useState("ทำสัญญา");
  const [compareDate, setCompareDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [compareQuestion, setCompareQuestion] = useState("");
  const [winAStart, setWinAStart] = useState("09:00");
  const [winAEnd, setWinAEnd] = useState("10:30");
  const [winBStart, setWinBStart] = useState("13:30");
  const [winBEnd, setWinBEnd] = useState("15:00");
  const [winCStart, setWinCStart] = useState("15:00");
  const [winCEnd, setWinCEnd] = useState("16:30");

  const isSubmitting = navigation.state === "submitting" || navigation.state === "loading";
  const prediction = actionData?.prediction;
  const comparisonResult = actionData?.comparisonResult;

  const bookmarkFetcher = useFetcher<{ success?: boolean; result?: { is_bookmarked: boolean } }>();
  const [bookmarked, setBookmarked] = useState(false);

  // Auto-switch mode when result is returned
  useEffect(() => {
    if (comparisonResult) {
      setActiveMode("compare");
    }
  }, [comparisonResult]);

  const currentQueryId = prediction?.queryId || comparisonResult?.queryId;
  const currentIsBookmarked = prediction?.isBookmarked || comparisonResult?.isBookmarked;

  useEffect(() => {
    if (currentQueryId) {
      setBookmarked(Boolean(currentIsBookmarked));
    }
  }, [currentQueryId, currentIsBookmarked]);

  const handleToggleBookmark = () => {
    if (!currentQueryId) return;
    const nextState = !bookmarked;
    setBookmarked(nextState);
    bookmarkFetcher.submit(
      { queryId: currentQueryId, desiredState: String(nextState) },
      { method: "post", action: "/api/wisdom-bookmark" }
    );
  };

  const handleResetToPresets = () => {
    setWinAStart("09:00");
    setWinAEnd("10:30");
    setWinBStart("13:30");
    setWinBEnd("15:00");
    setWinCStart("15:00");
    setWinCEnd("16:30");
  };

  // Auto-revalidate live clock data every 60s
  useEffect(() => {
    const id = setInterval(revalidate, 60_000);
    return () => clearInterval(id);
  }, [revalidate]);

  const handleChipClick = (question: string) => {
    setInputQuery(question);
    if (inputRef.current) {
      inputRef.current.value = question;
      inputRef.current.focus();
    }
  };

  const { yam, karnchata, hora, rahu, suggestionChips } = data;
  const yamLevelColor = LEVEL_COLOR[yam.level] ?? "text-[#C6B79F] border-white/10";
  const horaP = PLANET_INFO[hora.yamPlanet];

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500 max-w-4xl mx-auto">

      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-white/8 pb-4">
        <div>
          <span className="text-[#C6A96B] text-[10px] tracking-[0.3em] uppercase font-bold block mb-1">
            ✦ INTENT PREDICTION & TIMING COMPARISON
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F8F6F1]">
            ถามฤกษ์ & เปรียบเทียบจังหวะเวลา
          </h1>
          <p className="text-[#94A3B8] text-xs sm:text-sm mt-1">
            ค้นหาจังหวะเวลาที่ดีที่สุดจากพลังงานจักรวาล ตอบตรงเป้าด้วยภาษาชีวิตจริง
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1">
          <LiveClock />
          <p className="text-[10px] text-[#64748B]">{data.formattedDate}</p>
        </div>
      </div>

      {/* ── 1. HERO INTERACTION AREA (Mode Switcher + Forms) ── */}
      <div
        className="rounded-3xl p-5 sm:p-7 border border-[#C6A96B]/30 shadow-2xl relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(10,34,64,0.7) 0%, rgba(2,6,23,0.9) 100%)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#C6A96B]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#020617]/70 border border-white/10 w-fit mb-5 relative z-10">
          <button
            type="button"
            onClick={() => setActiveMode("instant")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeMode === "instant"
                ? "bg-[#C6A96B] text-[#0A1628] shadow-md shadow-[#C6A96B]/20"
                : "text-[#94A3B8] hover:text-white"
            }`}
          >
            <span>⚡</span>
            <span>ถามเรื่องทันที</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("compare")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeMode === "compare"
                ? "bg-gradient-to-r from-amber-400 to-[#C6A96B] text-[#0A1628] shadow-md shadow-amber-400/20"
                : "text-[#94A3B8] hover:text-white"
            }`}
          >
            <span>⚖️</span>
            <span>เปรียบเทียบ 3 ช่วงเวลา (A / B / C)</span>
          </button>
        </div>

        {/* ── Mode 1: Instant Question Form ── */}
        {activeMode === "instant" && (
          <Form method="post" className="space-y-4 relative z-10 animate-in fade-in duration-200">
            <input type="hidden" name="formType" value="instant" />
            <div>
              <label htmlFor="question-input" className="block text-xs font-bold uppercase tracking-wider text-[#C6A96B] mb-2">
                พิมพ์คำถามของคุณได้อิสระ
              </label>
              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  id="question-input"
                  name="question"
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="เช่น เดินทางช่วงกี่โมงดี? หรือ วันนี้เหมาะกับการเจรจาธุรกิจไหม?"
                  disabled={isSubmitting}
                  className="w-full bg-[#020617]/80 border border-white/15 focus:border-[#C6A96B] focus:ring-2 focus:ring-[#C6A96B]/20 rounded-2xl px-4 py-4 pr-32 text-sm sm:text-base text-white placeholder:text-slate-500 transition-all outline-none"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !inputQuery.trim()}
                  className="absolute right-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-[#020617] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                  style={{
                    background: "linear-gradient(135deg, #C6A96B 0%, #F2D49B 100%)",
                  }}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <span className="animate-spin text-xs">⏳</span> กำลังวิเคราะห์...
                    </span>
                  ) : (
                    <span>ถาม ✦</span>
                  )}
                </button>
              </div>
              {actionData?.error && (
                <p className="text-xs text-rose-400 mt-2 font-medium">{actionData.error}</p>
              )}
            </div>

            {/* Suggestion Chips */}
            <div>
              <p className="text-[11px] font-bold text-[#94A3B8] mb-2 uppercase tracking-wide">
                หรือเลือกหัวข้อแนะนำ:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestionChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleChipClick(chip.question)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:border-[#C6A96B]/40 hover:bg-[#C6A96B]/10 text-xs text-[#E2E8F0] transition-all active:scale-95"
                  >
                    <span>{chip.emoji}</span>
                    <span className="font-medium">{chip.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Form>
        )}

        {/* ── Mode 2: STEP 4.4 Timing Comparison Form ── */}
        {activeMode === "compare" && (
          <Form method="post" className="space-y-5 relative z-10 animate-in fade-in duration-200">
            <input type="hidden" name="formType" value="compareTiming" />
            <input type="hidden" name="activity" value={selectedActivity} />

            {/* 1. Activity Selector Chips */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#C6A96B]">
                1. เลือกประเภทกิจกรรมที่ต้องการดำเนินการ:
              </label>
              <div className="flex flex-wrap gap-2">
                {COMPARE_ACTIVITIES.map((act) => {
                  const isSelected = selectedActivity === act;
                  return (
                    <button
                      key={act}
                      type="button"
                      onClick={() => setSelectedActivity(act)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        isSelected
                          ? "bg-[#C6A96B] text-[#0A1628] border-[#C6A96B] shadow-sm shadow-[#C6A96B]/30 scale-105"
                          : "bg-white/5 text-[#CBD5E1] border-white/10 hover:border-white/20"
                      }`}
                    >
                      {act}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Date and Custom Question */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-1">
                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase">
                  วันที่ต้องการทำกิจกรรม:
                </label>
                <input
                  type="date"
                  name="date"
                  value={compareDate}
                  onChange={(e) => setCompareDate(e.target.value)}
                  className="w-full bg-[#020617]/80 border border-white/15 focus:border-[#C6A96B] rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase">
                  คำถามหรือรายละเอียดเพิ่มเติม (ไม่บังคับ):
                </label>
                <input
                  type="text"
                  name="question"
                  value={compareQuestion}
                  onChange={(e) => setCompareQuestion(e.target.value)}
                  placeholder="เช่น เปรียบเทียบช่วงเวลาเซ็นสัญญากับพาร์ทเนอร์"
                  className="w-full bg-[#020617]/80 border border-white/15 focus:border-[#C6A96B] rounded-xl px-3 py-2 text-xs text-white outline-none placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* 3. Three Candidate Windows (A, B, C) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#C6A96B]">
                  2. กำหนดช่วงเวลาที่ต้องการเปรียบเทียบ (A / B / C):
                </label>
                <button
                  type="button"
                  onClick={handleResetToPresets}
                  className="text-[11px] text-[#C6A96B] hover:underline font-bold"
                >
                  ✨ ใช้ช่วงเวลาแนะนำอัตโนมัติ
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Window A */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-[#C6A96B]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300">ตัวเลือก A (ช่วงเช้า)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 font-bold">A</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-[#94A3B8] block">เริ่ม:</span>
                      <input
                        type="time"
                        name="winA_start"
                        value={winAStart}
                        onChange={(e) => setWinAStart(e.target.value)}
                        className="w-full bg-[#020617] border border-white/10 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#94A3B8] block">สิ้นสุด:</span>
                      <input
                        type="time"
                        name="winA_end"
                        value={winAEnd}
                        onChange={(e) => setWinAEnd(e.target.value)}
                        className="w-full bg-[#020617] border border-white/10 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Window B */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-[#C6A96B]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-300">ตัวเลือก B (ช่วงบ่ายต้น)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-400/10 text-sky-300 border border-sky-400/20 font-bold">B</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-[#94A3B8] block">เริ่ม:</span>
                      <input
                        type="time"
                        name="winB_start"
                        value={winBStart}
                        onChange={(e) => setWinBStart(e.target.value)}
                        className="w-full bg-[#020617] border border-white/10 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#94A3B8] block">สิ้นสุด:</span>
                      <input
                        type="time"
                        name="winB_end"
                        value={winBEnd}
                        onChange={(e) => setWinBEnd(e.target.value)}
                        className="w-full bg-[#020617] border border-white/10 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Window C */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-[#C6A96B]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300">ตัวเลือก C (ช่วงบ่ายแก่)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-400/10 text-emerald-300 border border-emerald-400/20 font-bold">C</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-[#94A3B8] block">เริ่ม:</span>
                      <input
                        type="time"
                        name="winC_start"
                        value={winCStart}
                        onChange={(e) => setWinCStart(e.target.value)}
                        className="w-full bg-[#020617] border border-white/10 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#94A3B8] block">สิ้นสุด:</span>
                      <input
                        type="time"
                        name="winC_end"
                        value={winCEnd}
                        onChange={(e) => setWinCEnd(e.target.value)}
                        className="w-full bg-[#020617] border border-white/10 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm text-[#020617] transition-all active:scale-[0.99] disabled:opacity-50 shadow-lg shadow-[#C6A96B]/20 flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #C6A96B 0%, #F2D49B 100%)",
                }}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span>
                    <span>กำลังเปรียบเทียบพลังงาน 3 ช่วงเวลา...</span>
                  </>
                ) : (
                  <>
                    <span>⚖️</span>
                    <span>วิเคราะห์และเปรียบเทียบช่วงเวลา A / B / C ✦</span>
                  </>
                )}
              </button>
            </div>
            {actionData?.error && (
              <p className="text-xs text-rose-400 font-medium">{actionData.error}</p>
            )}
          </Form>
        )}
      </div>

      {/* ── 2A. STEP 4.4 TIMING COMPARISON RESULT DISPLAY ── */}
      {comparisonResult && activeMode === "compare" && (
        <div className="space-y-6 animate-fade-up">
          {/* 1. Champion Winner Card */}
          <div className="rounded-3xl p-6 sm:p-8 border-2 border-[#C6A96B] bg-gradient-to-br from-[#0D223F] via-[#0A1A2F] to-[#020617] shadow-2xl space-y-5 relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🏆</span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C6A96B]">
                    BEST TIMING RECOMMENDATION
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    ช่วงเวลาที่แนะนำสูงสุด: ตัวเลือก {comparisonResult.recommendedCandidate.id} ({comparisonResult.recommendedCandidate.start}–{comparisonResult.recommendedCandidate.end} น.)
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${SUITABILITY_META[comparisonResult.recommendedCandidate.suitability].badgeColor}`}>
                  <span>{SUITABILITY_META[comparisonResult.recommendedCandidate.suitability].emoji}</span>{" "}
                  <span>{SUITABILITY_META[comparisonResult.recommendedCandidate.suitability].label}</span>
                </span>
                <span className="text-xs font-black text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-full">
                  คะแนน {comparisonResult.recommendedCandidate.score}/100
                </span>

                {comparisonResult.queryId && (
                  <button
                    type="button"
                    onClick={handleToggleBookmark}
                    title={bookmarked ? "ยกเลิกบุ๊กมาร์ก" : "บันทึกในบุ๊กมาร์ก"}
                    className={`p-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 ${
                      bookmarked
                        ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
                        : "bg-white/5 text-[#94A3B8] border-white/10 hover:text-white"
                    }`}
                  >
                    <span>{bookmarked ? "★" : "☆"}</span>
                    <span className="text-[10px]">{bookmarked ? "บันทึกแล้ว" : "บุ๊กมาร์ก"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Explanation / Reason */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C6A96B]">
                ✦ บทวิเคราะห์สรุป (PLAIN-LANGUAGE EXPLANATION)
              </p>
              <p className="text-sm sm:text-base text-[#F8F6F1] leading-relaxed font-medium whitespace-pre-line">
                {comparisonResult.reason}
              </p>
            </div>

            {/* Actionable Tip */}
            {comparisonResult.actionable && (
              <div className="p-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 flex items-start gap-3">
                <span className="text-emerald-400 text-base mt-0.5">✓</span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-0.5">
                    ข้อแนะนำในการลงมือทำ
                  </p>
                  <p className="text-xs sm:text-sm text-[#E2E8F0] font-medium leading-snug">
                    {comparisonResult.actionable}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 2. Side-by-side Comparative Cards A / B / C */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[#F8F6F1] flex items-center gap-2">
              <span>📊</span>
              <span>ตารางเปรียบเทียบเชิงลึก 3 ตัวเลือก (Candidate Windows Matrix)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {comparisonResult.candidates.map((cand) => {
                const isWinner = cand.id === comparisonResult.recommendedCandidate.id;
                const meta = SUITABILITY_META[cand.suitability];

                return (
                  <div
                    key={cand.id}
                    className={`rounded-2xl p-5 border transition-all space-y-4 relative ${
                      isWinner
                        ? "border-[#C6A96B] bg-gradient-to-b from-[#0D223F] to-[#0A1628] shadow-xl shadow-[#C6A96B]/10 ring-1 ring-[#C6A96B]/50"
                        : `${meta.cardBorder} bg-[#0A1628]/80 hover:border-white/20`
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#C6A96B]/20 border border-[#C6A96B]/40 text-[#C6A96B] flex items-center justify-center font-bold text-xs">
                            {cand.id}
                          </span>
                          <span className="text-xs font-bold text-white">{cand.label}</span>
                        </div>
                        <p className="text-lg font-bold text-white font-mono mt-1">
                          {cand.start} – {cand.end} น.
                        </p>
                      </div>

                      {isWinner && (
                        <span className="px-2 py-0.5 rounded-full bg-[#C6A96B] text-[#0A1628] text-[10px] font-black uppercase">
                          🏆 แนะนำ
                        </span>
                      )}
                    </div>

                    {/* Score & Suitability */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border flex items-center gap-1 ${meta.badgeColor}`}>
                        <span>{meta.emoji}</span>
                        <span>{meta.label}</span>
                      </span>
                      <span className="text-sm font-bold text-white font-mono">
                        {cand.score} <span className="text-xs text-[#94A3B8] font-normal">/100</span>
                      </span>
                    </div>

                    {/* Strengths */}
                    <div className="space-y-1.5 text-xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        จุดเด่น & พลังงานเกื้อหนุน:
                      </p>
                      <ul className="space-y-1">
                        {cand.strengths.map((s, idx) => (
                          <li key={idx} className="text-[#CBD5E1] flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold shrink-0">✓</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Cautions */}
                    <div className="space-y-1.5 text-xs pt-1 border-t border-white/5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        ข้อควรระวัง / สิ่งที่ต้องคำนึง:
                      </p>
                      <ul className="space-y-1">
                        {cand.cautions.map((c, idx) => (
                          <li key={idx} className="text-[#94A3B8] flex items-start gap-1.5">
                            <span className="text-amber-400 font-bold shrink-0">!</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unified Wisdom Memory Saved Notice */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <span>🔒</span>
              <span>บันทึกผลการเปรียบเทียบเข้าสู่คลังปัญญา (Unified Wisdom Memory) โดยอัตโนมัติแล้ว</span>
            </div>
            <Link
              to="/dashboard/settings?tab=wisdom"
              className="text-[#C6A96B] font-bold hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span>ดูประวัติในคลังปัญญา</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── 2B. PREDICTION RESULT DISPLAY (Instant Question) ── */}
      {prediction && activeMode === "instant" && (
        <div
          className="rounded-3xl p-6 sm:p-8 border border-emerald-500/30 bg-[#0A1A2F]/90 backdrop-blur-2xl shadow-2xl space-y-6 animate-fade-up relative overflow-hidden"
        >
          {/* Category Tag Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                  CATEGORY_ICONS[prediction.intentCategory]?.color || CATEGORY_ICONS.general.color
                }`}
              >
                <span>{CATEGORY_ICONS[prediction.intentCategory]?.emoji}</span>
                <span>{CATEGORY_ICONS[prediction.intentCategory]?.label}</span>
              </span>
              <span className="text-xs text-[#94A3B8] italic">
                "{prediction.question}"
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#94A3B8]">ระดับความสอดคล้อง:</span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  prediction.confidence === "high"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : prediction.confidence === "medium"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-slate-500/20 text-slate-300"
                }`}
              >
                {prediction.confidence === "high" ? "สูงมาก" : prediction.confidence === "medium" ? "ปานกลาง" : "แนะนำสังเกตการณ์"}
              </span>

              {prediction.queryId && (
                <button
                  type="button"
                  onClick={handleToggleBookmark}
                  title={bookmarked ? "ยกเลิกบุ๊กมาร์ก" : "บันทึกในบุ๊กมาร์ก"}
                  className={`px-2 py-0.5 rounded-md border text-xs font-bold transition-all flex items-center gap-1 ${
                    bookmarked
                      ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
                      : "bg-white/5 text-[#94A3B8] border-white/10 hover:text-white"
                  }`}
                >
                  <span>{bookmarked ? "★" : "☆"}</span>
                  <span className="hidden sm:inline text-[10px]">{bookmarked ? "บันทึกแล้ว" : "บุ๊กมาร์ก"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Level 1: Main Answer (Plain Thai, Wisdom-driven) */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C6A96B]">
              ✦ คำแนะนำสำหรับคุณ
            </p>
            <p className="text-base sm:text-lg text-[#F8F6F1] leading-relaxed font-sans font-medium whitespace-pre-line">
              {prediction.answer}
            </p>
          </div>

          {/* Best Window Box (if exists) */}
          {prediction.bestWindow && (
            <div className="p-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏳</span>
                <div>
                  <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
                    ช่วงเวลาที่แนะนำมากที่สุด
                  </p>
                  <p className="text-base font-bold text-white">
                    {prediction.bestWindow.timeRange}
                  </p>
                </div>
              </div>
              {prediction.bestWindow.description && (
                <span className="text-xs text-amber-200/90 font-medium">
                  {prediction.bestWindow.description}
                </span>
              )}
            </div>
          )}

          {/* Actionable Advice Box */}
          <div className="p-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 flex items-start gap-3">
            <span className="text-emerald-400 text-base mt-0.5">✓</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-0.5">
                ข้อแนะนำที่ทำได้ทันที
              </p>
              <p className="text-sm text-[#E2E8F0] font-medium leading-snug">
                {prediction.actionable}
              </p>
            </div>
          </div>

          {/* Level 2: Evidence Chain Accordion */}
          {prediction.evidenceChain && prediction.evidenceChain.length > 0 && (
            <div className="pt-2 border-t border-white/8">
              <button
                type="button"
                onClick={() => setShowEvidence(!showEvidence)}
                className="flex items-center justify-between w-full text-left py-2 text-xs font-bold text-[#94A3B8] hover:text-[#C6A96B] transition-colors"
              >
                <span>🔍 ดูปัจจัยพลังงานเชิงลึก (Evidence Chain — Level 2)</span>
                <span>{showEvidence ? "▲ ย่อ" : "▼ ขยาย"}</span>
              </button>

              {showEvidence && (
                <div className="mt-3 space-y-2 pl-3 border-l-2 border-[#C6A96B]/40 animate-fade-up">
                  {prediction.evidenceChain.map((ev, idx) => (
                    <div key={idx} className="text-xs space-y-0.5">
                      <span className="font-bold text-[#C6A96B]">{ev.source}:</span>
                      <p className="text-[#CBD5E1]">{ev.finding}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Auto-saved Wisdom Query Notice */}
          {prediction.queryId && (
            <div className="pt-2 border-t border-white/8 flex items-center justify-between text-xs text-[#94A3B8]">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span>
                <span>บันทึกลงคลังปัญญาอัตโนมัติแล้ว</span>
              </span>
              <Link
                to="/dashboard/settings?tab=wisdom"
                className="text-[#C6A96B] hover:underline font-medium flex items-center gap-1"
              >
                <span>ดูในคลังปัญญา</span>
                <span>→</span>
              </Link>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                setInputQuery("");
                if (inputRef.current) {
                  inputRef.current.value = "";
                  inputRef.current.focus();
                }
              }}
              className="text-xs text-[#C6A96B] font-bold hover:underline"
            >
              + ถามเรื่องใหม่อีกครั้ง
            </button>
          </div>
        </div>
      )}


      {/* ── 3. CURRENT LIVE ENERGY SNAPSHOT ── */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C6A96B]">
            ✦ พลังงานจักรวาล ณ ขณะนี้ (LIVE ENERGY)
          </p>
          <span className="text-[10px] text-[#64748B]">อัปเดตอัตโนมัติ</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* ยามอัฐกาล */}
          <div className="bg-[#020617] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold">ยามอัฏฐกาล</p>
            <p className="text-lg font-display font-bold text-[#F8F6F1] leading-tight">{yam.yamName}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${yamLevelColor}`}>
                {yam.label}
              </span>
              <Ticks ticks={yam.ticks} />
            </div>
            <p className="text-[10px] text-[#64748B]">
              ยามที่ {yam.yamNumber} · {yam.period === "day" ? "กลางวัน" : "กลางคืน"}
            </p>
          </div>

          {/* กาลชะตา */}
          <div className="bg-[#020617] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold">กาลชะตา</p>
            <p className="text-lg font-display font-bold text-[#F8F6F1] leading-tight">{karnchata.yamYaiName}</p>
            <p className="text-[11px] text-[#94A3B8]">
              ดาวประจำวัน: ดาว {karnchata.dayStarNumber}
            </p>
            <p className="text-[10px] text-[#64748B]">
              ยามซอย: {karnchata.yamSoyName} · เดือน {karnchata.lunarMonthName}
            </p>
          </div>

          {/* ยามพรายกระซิบ */}
          <div className="bg-[#020617] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold">ยามพรายกระซิบ</p>
            <p className="text-lg font-display font-bold text-[#F8F6F1] leading-tight">
              {horaP?.thai ?? `ดาว ${hora.yamPlanet}`}
            </p>
            <p className="text-[11px] text-[#94A3B8]">
              ลัคนา: {hora.lagnaName}
            </p>
            <p className="text-[10px] text-[#64748B]">
              {hora.yamStartStr} – {hora.yamEndStr}
            </p>
          </div>

          {/* ราหูค้นทรัพย์ */}
          <div className="bg-[#020617] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold">ราหูค้นทรัพย์</p>
            <p className="text-lg font-display font-bold text-[#F8F6F1] leading-tight">
              {rahu?.yamName ?? "—"}
            </p>
            <p className="text-[11px] text-[#94A3B8] truncate">
              {rahu?.verdict ?? "ปกติ"}
            </p>
            <p className="text-[10px] text-[#64748B]">
              {rahu ? `${rahu.startTime} – ${rahu.endTime}` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ── 4. PRO TOOLS ACCORDION (For Advanced Astrologers) ── */}
      <div className="rounded-2xl border border-white/8 bg-[#020617]/50 p-4">
        <button
          type="button"
          onClick={() => setShowProTools(!showProTools)}
          className="flex items-center justify-between w-full text-left text-xs font-bold text-[#94A3B8] hover:text-[#C6A96B] transition-colors"
        >
          <span className="flex items-center gap-2">
            <span>⚙️</span>
            <span>เครื่องมือวิเคราะห์เชิงลึกสำหรับผู้เชี่ยวชาญ (Pro Astrologer Tools)</span>
          </span>
          <span>{showProTools ? "▲ ปิด" : "▼ เปิด"}</span>
        </button>

        {showProTools && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 pt-3 border-t border-white/5 animate-fade-up">
            <Link
              to="/dashboard/yam"
              className="p-3 rounded-xl border border-white/5 bg-white/5 hover:border-[#C6A96B]/30 transition-all flex flex-col gap-1"
            >
              <span className="text-sm font-bold text-white">ยามอัฏฐกาลเต็มผัง</span>
              <span className="text-xs text-[#94A3B8]">ดูตาราง 8 ช่วงเวลาและทิศมงคลประจำวัน</span>
            </Link>

            <Link
              to="/dashboard/horanu"
              className="p-3 rounded-xl border border-white/5 bg-white/5 hover:border-[#C6A96B]/30 transition-all flex flex-col gap-1"
            >
              <span className="text-sm font-bold text-white">ยามพรายกระซิบ 12 ภพ</span>
              <span className="text-xs text-[#94A3B8]">คำนวณดาวลอย ผังจักรราศี และโยคเกณฑ์</span>
            </Link>

            <Link
              to="/dashboard/karnchata"
              className="p-3 rounded-xl border border-white/5 bg-white/5 hover:border-[#C6A96B]/30 transition-all flex flex-col gap-1"
            >
              <span className="text-sm font-bold text-white">กาลชะตากำเนิด</span>
              <span className="text-xs text-[#94A3B8]">ยามใหญ่ ยามซอย และสัมพันธภาพจักรราศี</span>
            </Link>

            <Link
              to="/dashboard/rahu"
              className="p-3 rounded-xl border border-white/5 bg-white/5 hover:border-[#C6A96B]/30 transition-all flex flex-col gap-1"
            >
              <span className="text-sm font-bold text-white">ราหูค้นทรัพย์</span>
              <span className="text-xs text-[#94A3B8]">วิเคราะห์การตามหาของหายและทิศเสี่ยงโชค</span>
            </Link>

            <Link
              to="/dashboard/horoscope"
              className="p-3 rounded-xl border border-white/5 bg-white/5 hover:border-[#C6A96B]/30 transition-all flex flex-col gap-1"
            >
              <span className="text-sm font-bold text-white">ผังดวงจักรพรรดิ</span>
              <span className="text-xs text-[#94A3B8]">เลข ๗ ตัว ๙ ฐาน ทักษา และวัยจร</span>
            </Link>

            <Link
              to="/dashboard/reports/new"
              className="p-3 rounded-xl border border-white/5 bg-white/5 hover:border-[#C6A96B]/30 transition-all flex flex-col gap-1"
            >
              <span className="text-sm font-bold text-white">สร้างรายงานฉบับเต็ม</span>
              <span className="text-xs text-[#94A3B8]">วิเคราะห์ดวงชะตาเชิงลึกด้วย AI</span>
            </Link>
          </div>
        )}
      </div>

    </div>
  );
}
