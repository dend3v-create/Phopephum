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
import {
  saveWisdomQuery,
  getWisdomHistory,
  type WisdomQueryRecord,
  type ActualResult,
  type OutcomeStatus,
} from "~/services/wisdom.server";
import {
  getCurrentYam,
  calculateKarnchata,
  calculateHoraTaynoo,
  calculateRahu,
  calculateAuspiciousTime,
  PLANET_INFO,
  ZODIAC_ORDER,
} from "@phopephum/engine";
import { parseIntent, SUGGESTION_CHIPS, SACRED_ENGINES } from "~/services/intentParser.server";
import { orchestratePrediction, type PredictionResult } from "~/services/predictionOrchestrator.server";
import { compareTimingWindows } from "~/services/timingComparison.server";
import type {
  CandidateWindow,
  CandidateWindowInput,
  TimingComparisonResult,
  TimingSuitability,
} from "@phopephum/types";
import type { Env } from "~/env.server";
import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import i18next from "~/lib/i18n/i18n.server";

export const meta: MetaFunction = () => [
  { title: "ถามฤกษ์ & ไขคำถาม ๔ ศาสตร์ — PhopePhum" },
  { name: "description", content: "ค้นหาจังหวะเวลาและคำตอบจากพลังงานจักรวาล ตอบตรงประเด็นด้วยภาษาชีวิตจริงตาม ๔ ศาสตร์พยากรณ์โบราณ" },
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

  const { supabase } = createSupabaseClient(request, env);
  let savedQueries: WisdomQueryRecord[] = [];
  try {
    savedQueries = await getWisdomHistory(supabase, user.id, { limit: 50 });
  } catch (err) {
    console.warn("[dashboard.check-yam] Failed to fetch saved queries in loader:", err);
  }

  return json({
    serverTime: now.toISOString(),
    formattedDate,
    userName: profile?.display_name || "คุณ",
    suggestionChips: SUGGESTION_CHIPS,
    sacredEngines: SACRED_ENGINES,
    savedQueries,
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
  excellent: "text-amber-900 dark:text-[#C6A96B] border-amber-400/60 dark:border-[#C6A96B]/40 bg-amber-500/15 dark:bg-[#C6A96B]/8",
  very_good: "text-amber-800 dark:text-[#D9BC82] border-amber-300/60 dark:border-[#D9BC82]/30 bg-amber-500/10 dark:bg-[#D9BC82]/6",
  good:      "text-slate-800 dark:text-[#F8F6F1] border-slate-300 dark:border-[#F8F6F1]/20 bg-slate-100 dark:bg-white/5",
  bad:       "text-slate-600 dark:text-[#6D8FC7] border-slate-300 dark:border-[#6D8FC7]/20 bg-slate-50 dark:bg-[#4B6FAE]/5",
};

const CATEGORY_ICONS: Record<string, { label: string; emoji: string; color: string; route?: string }> = {
  horanu:       { label: "โหรทายหนู · เรื่องเฉพาะหน้า", emoji: "🎯", color: "text-amber-800 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-400/10 border-amber-300/80 dark:border-amber-400/30", route: "/dashboard/horanu" },
  yam:          { label: "ยามอัฏฐกาล · ช่วงเวลาสำเร็จ",  emoji: "⏰", color: "text-sky-800 dark:text-sky-400 bg-sky-100/80 dark:bg-sky-400/10 border-sky-300/80 dark:border-sky-400/30", route: "/dashboard/yam" },
  karnchata:    { label: "กาลชะตา · แผนรายชั่วโมง",    emoji: "📅", color: "text-purple-800 dark:text-purple-400 bg-purple-100/80 dark:bg-purple-400/10 border-purple-300/80 dark:border-purple-400/30", route: "/dashboard/karnchata" },
  rahu:         { label: "ราหูค้นทรัพย์ · ๑๐ นาที/ของหาย", emoji: "🧭", color: "text-emerald-800 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-400/10 border-emerald-300/80 dark:border-emerald-400/30", route: "/dashboard/rahu" },
  timing:       { label: "ยามมงคล & ฤกษ์", emoji: "⏰", color: "text-sky-800 dark:text-sky-400 bg-sky-100/80 dark:bg-sky-400/10 border-sky-300/80 dark:border-sky-400/30", route: "/dashboard/yam" },
  finance:      { label: "การเงิน & ธุรกิจ",  emoji: "💰", color: "text-emerald-800 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-400/10 border-emerald-300/80 dark:border-emerald-400/30", route: "/dashboard/yam" },
  relationship: { label: "ความสัมพันธ์",      emoji: "💛", color: "text-rose-800 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-400/10 border-rose-300/80 dark:border-rose-400/30", route: "/dashboard/karnchata" },
  lost:         { label: "ค้นหาสิ่งของ (ราหู)", emoji: "🔍", color: "text-emerald-800 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-400/10 border-emerald-300/80 dark:border-emerald-400/30", route: "/dashboard/rahu" },
  career:       { label: "การงาน & ปิดดีล",    emoji: "💼", color: "text-indigo-800 dark:text-indigo-400 bg-indigo-100/80 dark:bg-indigo-400/10 border-indigo-300/80 dark:border-indigo-400/30", route: "/dashboard/karnchata" },
  health:       { label: "สุขภาพ & ความเป็นอยู่", emoji: "🌿", color: "text-teal-800 dark:text-teal-400 bg-teal-100/80 dark:bg-teal-400/10 border-teal-300/80 dark:border-teal-400/30", route: "/dashboard/horanu" },
  general:      { label: "คำถามทั่วไป (โหรทายหนู)", emoji: "🎯", color: "text-amber-900 dark:text-[#C6A96B] bg-amber-100/80 dark:bg-[#C6A96B]/10 border-amber-300/80 dark:border-[#C6A96B]/30", route: "/dashboard/horanu" },
};

const SUITABILITY_META: Record<
  TimingSuitability,
  { label: string; emoji: string; badgeColor: string; cardBorder: string; bg: string }
> = {
  optimal: {
    label: "ช่วงเวลาทอง (ดีเลิศ)",
    emoji: "🌟",
    badgeColor: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-400/40",
    cardBorder: "border-emerald-400/50 shadow-lg shadow-emerald-500/10",
    bg: "bg-gradient-to-b from-emerald-50 via-white to-emerald-50/30 dark:from-emerald-950/40 dark:via-[#0A1A2F] dark:to-[#020617]",
  },
  favorable: {
    label: "จังหวะส่งเสริม (ดี)",
    emoji: "✨",
    badgeColor: "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-400/40",
    cardBorder: "border-blue-400/40 shadow-md shadow-blue-500/10",
    bg: "bg-gradient-to-b from-blue-50 via-white to-blue-50/30 dark:from-blue-950/30 dark:via-[#0A1A2F] dark:to-[#020617]",
  },
  neutral: {
    label: "ปานกลาง (พอใช้)",
    emoji: "⚖️",
    badgeColor: "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-400/30",
    cardBorder: "border-slate-200 dark:border-white/10",
    bg: "bg-white/95 dark:bg-[#0A1A2F]/80",
  },
  cautious: {
    label: "ควรระวัง (ชะลอ)",
    emoji: "⚠️",
    badgeColor: "bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-400/30",
    cardBorder: "border-orange-300 dark:border-orange-500/30",
    bg: "bg-white/95 dark:bg-[#0A1A2F]/80",
  },
  avoid: {
    label: "ควรหลีกเลี่ยง",
    emoji: "✕",
    badgeColor: "bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-400/30",
    cardBorder: "border-rose-300 dark:border-rose-500/30",
    bg: "bg-white/95 dark:bg-[#0A1A2F]/80",
  },
};

const OUTCOME_OPTIONS: { id: ActualResult; label: string; emoji: string; color: string }[] = [
  {
    id: "accurate_success",
    label: "ตรงมาก + ผลสำเร็จยอดเยี่ยม",
    emoji: "🎯",
    color: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-400/30",
  },
  {
    id: "accurate_neutral",
    label: "ตรงตามคำทำนาย",
    emoji: "✨",
    color: "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-400/30",
  },
  {
    id: "partially_accurate",
    label: "ตรงบางส่วน",
    emoji: "⚖️",
    color: "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-400/30",
  },
  {
    id: "inaccurate",
    label: "ไม่ตรงกับที่เกิดขึ้น",
    emoji: "✕",
    color: "bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-400/30",
  },
  {
    id: "unresolved",
    label: "ยังไม่ทราบผล / รอติดตาม",
    emoji: "⏳",
    color: "bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-500/30",
  },
];

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

  // Vault & Outcome Tracking State
  const [allSavedQueries, setAllSavedQueries] = useState<WisdomQueryRecord[]>(data.savedQueries || []);
  const [vaultFilter, setVaultFilter] = useState<"all" | "bookmarked" | "resolved" | "pending">("all");
  const [vaultEngineFilter, setVaultEngineFilter] = useState<"all" | "horanu" | "yam" | "karnchata" | "rahu">("all");
  const [vaultSearch, setVaultSearch] = useState("");
  const [expandedQueryId, setExpandedQueryId] = useState<string | null>(null);
  const [editingOutcomeId, setEditingOutcomeId] = useState<string | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [localOutcomes, setLocalOutcomes] = useState<Record<string, { actual_result?: ActualResult; notes?: string }>>({});
  const [outcomeSavedId, setOutcomeSavedId] = useState<string | null>(null);
  const outcomeFetcher = useFetcher();

  // Sync loader data when revalidated
  useEffect(() => {
    if (data.savedQueries) {
      setAllSavedQueries(data.savedQueries);
    }
  }, [data.savedQueries]);

  // Prepend newly asked prediction into vault list
  useEffect(() => {
    if (prediction && prediction.queryId) {
      setAllSavedQueries((prev) => {
        if (prev.some((q) => q.id === prediction.queryId)) return prev;
        const newRecord: WisdomQueryRecord = {
          id: prediction.queryId!,
          user_id: "",
          question: prediction.question,
          intent_category: prediction.intentCategory,
          context_type: "horary",
          confidence: prediction.confidence,
          answer: prediction.answer,
          actionable: prediction.actionable,
          best_window: prediction.bestWindow ?? null,
          prediction_score: prediction.predictionScore ?? null,
          evidence_snapshot: prediction.evidenceChain || [],
          engine_snapshot: prediction.engineSnapshot || {},
          is_bookmarked: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          outcome: null,
        };
        return [newRecord, ...prev];
      });
    }
  }, [prediction]);

  const handleSaveOutcome = (queryId: string, actualResult: ActualResult, userNotes?: string) => {
    setLocalOutcomes((prev) => ({
      ...prev,
      [queryId]: { actual_result: actualResult, notes: userNotes },
    }));
    setOutcomeSavedId(queryId);
    setEditingOutcomeId(null);
    setOutcomeNotes("");
    setTimeout(() => setOutcomeSavedId(null), 4000);

    const fd = new FormData();
    fd.append("intent", "upsert");
    fd.append("queryId", queryId);
    fd.append("actualResult", actualResult);
    fd.append("status", actualResult === "unresolved" ? "in_progress" : "completed");
    if (userNotes) {
      fd.append("userNotes", userNotes);
    }
    outcomeFetcher.submit(fd, { method: "post", action: "/api/wisdom-outcome" });
  };

  const handleToggleVaultBookmark = (queryId: string, currentStatus: boolean) => {
    const nextState = !currentStatus;
    setAllSavedQueries((prev) =>
      prev.map((q) => (q.id === queryId ? { ...q, is_bookmarked: nextState } : q))
    );
    bookmarkFetcher.submit(
      { queryId, desiredState: String(nextState) },
      { method: "post", action: "/api/wisdom-bookmark" }
    );
  };

  const filteredVaultQueries = useMemo(() => {
    return allSavedQueries.filter((q) => {
      const outcome = localOutcomes[q.id]?.actual_result ?? q.outcome?.actual_result;
      const isResolved = Boolean(outcome && outcome !== "unresolved");
      const isPending = !isResolved;

      if (vaultFilter === "bookmarked" && !q.is_bookmarked) return false;
      if (vaultFilter === "resolved" && !isResolved) return false;
      if (vaultFilter === "pending" && !isPending) return false;

      if (vaultEngineFilter !== "all") {
        const cat = q.intent_category;
        if (vaultEngineFilter === "horanu" && !["horanu", "general", "health"].includes(cat)) return false;
        if (vaultEngineFilter === "yam" && !["yam", "timing"].includes(cat)) return false;
        if (vaultEngineFilter === "karnchata" && !["karnchata", "career", "relationship", "finance"].includes(cat)) return false;
        if (vaultEngineFilter === "rahu" && !["rahu", "lost"].includes(cat)) return false;
      }

      if (vaultSearch.trim()) {
        const query = vaultSearch.toLowerCase().trim();
        return (
          q.question.toLowerCase().includes(query) ||
          q.answer.toLowerCase().includes(query) ||
          (q.actionable && q.actionable.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [allSavedQueries, vaultFilter, vaultSearch, localOutcomes]);

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

  const { yam, karnchata, hora, rahu, suggestionChips, sacredEngines } = data;
  const yamLevelColor = LEVEL_COLOR[yam.level] ?? "text-[#C6B79F] border-white/10";
  const horaP = PLANET_INFO[hora.yamPlanet];

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500 max-w-4xl mx-auto w-full max-w-full min-w-0 overflow-x-hidden">

      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-black/10 dark:border-white/8 pb-4">
        <div>
          <span className="text-[#C6A96B] text-[10px] tracking-[0.3em] uppercase font-bold block mb-1">
            ✦ ๔ ศาสตร์พยากรณ์กาลเวลา · SACRED TIMING & HORARY HUB
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#F8F6F1]">
            ถามฤกษ์ & ไขคำถามกาลเวลา
          </h1>
          <p className="text-slate-600 dark:text-[#94A3B8] text-xs sm:text-sm mt-1">
            เลือกเชื่อมตรงสู่ ๔ ศาสตร์พยากรณ์แท้จริง หรือพิมพ์คำถามเพื่อให้ระบบนำทางสู่ศาสตร์ที่แม่นยำที่สุด
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1">
          <LiveClock />
          <p className="text-[10px] text-slate-500 dark:text-[#64748B]">{data.formattedDate}</p>
        </div>
      </div>

      {/* ── 4 Sacred Doors (๔ ประตูเปิดดวงกาลเวลา) ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C6A96B] flex items-center gap-1.5">
            <span>🏛️</span>
            <span>เลือกเข้าสู่ ๔ ศาสตร์พยากรณ์หลัก (Direct Engine Portals)</span>
          </span>
          <span className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
            คลิกเพื่อดูผังฉบับเต็ม หรือกดลองถาม
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Door 1: โหรทายหนู */}
          <div className="rounded-2xl p-4 border border-amber-300/60 dark:border-amber-400/25 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-white/95 dark:from-[#0A1A2F]/95 dark:to-[#071324] shadow-sm hover:shadow-md hover:border-amber-400 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xl">🎯</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                  ผังดวง ๑๒ ภพ
                </span>
              </div>
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                ถามเรื่องเฉพาะหน้า
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] mt-1 leading-relaxed">
                จะได้ไหม? จะสำเร็จไหม? ตอบคำถามเฉพาะกิจและสถานการณ์ด่วน
              </p>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleChipClick("เรื่องนี้จะมีเกณฑ์สำเร็จลุล่วงสมหวังไหม?")}
                className="flex-1 text-[11px] font-bold py-1.5 px-2.5 rounded-xl border border-amber-400/40 bg-white dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-amber-400/20 text-amber-900 dark:text-amber-200 transition-all text-center"
              >
                ลองถามที่นี่
              </button>
              <Link
                to="/dashboard/horanu"
                className="p-1.5 px-2 rounded-xl border border-amber-400/40 bg-amber-500/10 hover:bg-amber-400/25 text-amber-700 dark:text-amber-300 transition-all font-bold text-xs"
                title="เปิดหน้าระบบโหรทายหนูฉบับเต็ม"
              >
                ผังเต็ม ↗
              </Link>
            </div>
          </div>

          {/* Door 2: ยามอัฏฐกาล */}
          <div className="rounded-2xl p-4 border border-sky-300/60 dark:border-sky-400/25 bg-gradient-to-b from-sky-500/10 via-sky-500/5 to-white/95 dark:from-[#0A1A2F]/95 dark:to-[#071324] shadow-sm hover:shadow-md hover:border-sky-400 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xl">⏰</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/30">
                  ๘ ยาม ๙๐ นาที
                </span>
              </div>
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                ยามเดินทาง & เจรจา
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] mt-1 leading-relaxed">
                เลือกช่วงเวลาในวัน วันเดินทางไกล และเวลาเจรจาธุรกิจสำเร็จ
              </p>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleChipClick("วันนี้ควรออกเดินทางและติดต่อเจรจาช่วงยามใดดีที่สุด?")}
                className="flex-1 text-[11px] font-bold py-1.5 px-2.5 rounded-xl border border-sky-400/40 bg-white dark:bg-white/5 hover:bg-sky-100 dark:hover:bg-sky-400/20 text-sky-900 dark:text-sky-200 transition-all text-center"
              >
                ลองถามที่นี่
              </button>
              <Link
                to="/dashboard/yam"
                className="p-1.5 px-2 rounded-xl border border-sky-400/40 bg-sky-500/10 hover:bg-sky-400/25 text-sky-700 dark:text-sky-300 transition-all font-bold text-xs"
                title="เปิดหน้าระบบยามอัฏฐกาลฉบับเต็ม"
              >
                ผังเต็ม ↗
              </Link>
            </div>
          </div>

          {/* Door 3: กาลชะตา */}
          <div className="rounded-2xl p-4 border border-purple-300/60 dark:border-purple-400/25 bg-gradient-to-b from-purple-500/10 via-purple-500/5 to-white/95 dark:from-[#0A1A2F]/95 dark:to-[#071324] shadow-sm hover:shadow-md hover:border-purple-400 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xl">📅</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30">
                  ยามซอยรายชั่วโมง
                </span>
              </div>
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                วางแผนรายวัน รายชั่วโมง
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] mt-1 leading-relaxed">
                จัดไทม์ไลน์รายชั่วโมงในการเจรจา ขอแต่งงาน หรือปิดการขาย
              </p>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleChipClick("วางแผนไทม์ไลน์รายชั่วโมงในการเจรจาและปิดการขายวันนี้")}
                className="flex-1 text-[11px] font-bold py-1.5 px-2.5 rounded-xl border border-purple-400/40 bg-white dark:bg-white/5 hover:bg-purple-100 dark:hover:bg-purple-400/20 text-purple-900 dark:text-purple-200 transition-all text-center"
              >
                ลองถามที่นี่
              </button>
              <Link
                to="/dashboard/karnchata"
                className="p-1.5 px-2 rounded-xl border border-purple-400/40 bg-purple-500/10 hover:bg-purple-400/25 text-purple-700 dark:text-purple-300 transition-all font-bold text-xs"
                title="เปิดหน้าระบบกาลชะตาฉบับเต็ม"
              >
                ผังเต็ม ↗
              </Link>
            </div>
          </div>

          {/* Door 4: ราหูค้นทรัพย์ */}
          <div className="rounded-2xl p-4 border border-emerald-300/60 dark:border-emerald-400/25 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-white/95 dark:from-[#0A1A2F]/95 dark:to-[#071324] shadow-sm hover:shadow-md hover:border-emerald-400 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xl">🧭</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                  ๙ ฤกษ์ย่อย ๑๐ นาที
                </span>
              </div>
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                ฤกษ์ย่อย & ตามหาของหาย
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] mt-1 leading-relaxed">
                ฤกษ์ด่วนฉับพลัน สแกนทิศและตำแหน่งสิ่งของตกหล่น
              </p>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleChipClick("ของที่ทำหล่นหายไป อยู่ทิศไหนและจะหาเจอได้อย่างไร?")}
                className="flex-1 text-[11px] font-bold py-1.5 px-2.5 rounded-xl border border-emerald-400/40 bg-white dark:bg-white/5 hover:bg-emerald-100 dark:hover:bg-emerald-400/20 text-emerald-900 dark:text-emerald-200 transition-all text-center"
              >
                ลองถามที่นี่
              </button>
              <Link
                to="/dashboard/rahu"
                className="p-1.5 px-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 hover:bg-emerald-400/25 text-emerald-700 dark:text-emerald-300 transition-all font-bold text-xs"
                title="เปิดหน้าระบบราหูค้นทรัพย์ฉบับเต็ม"
              >
                ผังเต็ม ↗
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── 1. HERO INTERACTION AREA (Mode Switcher + Forms) ── */}
      <div
        className="rounded-3xl p-4 sm:p-7 border border-[#C6A96B]/30 shadow-xl relative overflow-hidden w-full max-w-full bg-white/95 dark:bg-[#0A1A2F]/80 backdrop-blur-xl"
      >
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#C6A96B]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Mode Switcher Tabs */}
        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-1.5 p-1 rounded-2xl bg-slate-100/90 dark:bg-[#020617]/70 border border-slate-200 dark:border-white/10 w-full xs:w-fit mb-5 relative z-10">
          <button
            type="button"
            onClick={() => setActiveMode("instant")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeMode === "instant"
                ? "bg-[#C6A96B] text-[#0A1628] shadow-md shadow-[#C6A96B]/20"
                : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>⚡</span>
            <span>ถามเรื่องทันที</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("compare")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeMode === "compare"
                ? "bg-gradient-to-r from-amber-400 to-[#C6A96B] text-[#0A1628] shadow-md shadow-amber-400/20"
                : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
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
                  placeholder="เช่น วันเสาร์นี้ จะได้เงินจากการทำงาน และ นำมาจ่ายค่าห้องได้ทันเวลาไหม?"
                  disabled={isSubmitting}
                  className="w-full bg-white dark:bg-[#020617]/80 border border-amber-200/80 dark:border-white/15 focus:border-[#C6A96B] focus:ring-2 focus:ring-[#C6A96B]/20 rounded-2xl px-4 py-4 pr-32 text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all outline-none shadow-sm"
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
                <p className="text-xs text-rose-500 mt-2 font-medium">{actionData.error}</p>
              )}
            </div>

            {/* Suggestion Chips */}
            <div>
              <p className="text-[11px] font-bold text-[#C6A96B] dark:text-[#94A3B8] mb-2 uppercase tracking-wide">
                หรือเลือกหัวข้อแนะนำ:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestionChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleChipClick(chip.question)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/5 hover:border-[#C6A96B]/50 hover:bg-[#C6A96B]/10 text-xs text-slate-800 dark:text-[#E2E8F0] transition-all active:scale-95 shadow-sm"
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
                          : "bg-slate-100/80 dark:bg-white/5 text-slate-700 dark:text-[#CBD5E1] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
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
                <label className="block text-[11px] font-bold text-slate-600 dark:text-[#94A3B8] uppercase">
                  วันที่ต้องการทำกิจกรรม:
                </label>
                <input
                  type="date"
                  name="date"
                  value={compareDate}
                  onChange={(e) => setCompareDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#020617]/80 border border-slate-200 dark:border-white/15 focus:border-[#C6A96B] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-[#94A3B8] uppercase">
                  คำถามหรือรายละเอียดเพิ่มเติม (ไม่บังคับ):
                </label>
                <input
                  type="text"
                  name="question"
                  value={compareQuestion}
                  onChange={(e) => setCompareQuestion(e.target.value)}
                  placeholder="เช่น เปรียบเทียบช่วงเวลาเซ็นสัญญากับพาร์ทเนอร์"
                  className="w-full bg-slate-50 dark:bg-[#020617]/80 border border-slate-200 dark:border-white/15 focus:border-[#C6A96B] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-white/[0.03] border border-amber-200/70 dark:border-[#C6A96B]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300">ตัวเลือก A (ช่วงเช้า)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-400/10 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-400/20 font-bold">A</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] block">เริ่ม:</span>
                      <input
                        type="time"
                        name="winA_start"
                        value={winAStart}
                        onChange={(e) => setWinAStart(e.target.value)}
                        className="w-full bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-lg p-1.5 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] block">สิ้นสุด:</span>
                      <input
                        type="time"
                        name="winA_end"
                        value={winAEnd}
                        onChange={(e) => setWinAEnd(e.target.value)}
                        className="w-full bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-lg p-1.5 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Window B */}
                <div className="p-3.5 rounded-2xl bg-sky-50/50 dark:bg-white/[0.03] border border-sky-200/70 dark:border-[#C6A96B]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-800 dark:text-sky-300">ตัวเลือก B (ช่วงบ่ายต้น)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-400/10 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-400/20 font-bold">B</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] block">เริ่ม:</span>
                      <input
                        type="time"
                        name="winB_start"
                        value={winBStart}
                        onChange={(e) => setWinBStart(e.target.value)}
                        className="w-full bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-lg p-1.5 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] block">สิ้นสุด:</span>
                      <input
                        type="time"
                        name="winB_end"
                        value={winBEnd}
                        onChange={(e) => setWinBEnd(e.target.value)}
                        className="w-full bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-lg p-1.5 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Window C */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-white/[0.03] border border-emerald-200/70 dark:border-[#C6A96B]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">ตัวเลือก C (ช่วงบ่ายแก่)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-400/10 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/20 font-bold">C</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] block">เริ่ม:</span>
                      <input
                        type="time"
                        name="winC_start"
                        value={winCStart}
                        onChange={(e) => setWinCStart(e.target.value)}
                        className="w-full bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-lg p-1.5 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] block">สิ้นสุด:</span>
                      <input
                        type="time"
                        name="winC_end"
                        value={winCEnd}
                        onChange={(e) => setWinCEnd(e.target.value)}
                        className="w-full bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-lg p-1.5 text-xs text-slate-900 dark:text-white"
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
              <p className="text-xs text-rose-500 font-medium">{actionData.error}</p>
            )}
          </Form>
        )}
      </div>
      {comparisonResult && activeMode === "compare" && (
        <div className="space-y-6 animate-fade-up">
          {/* 1. Champion Winner Card */}
          <div className="rounded-3xl p-6 sm:p-8 border-2 border-[#C6A96B] bg-gradient-to-br from-amber-50 via-white to-amber-50/40 dark:from-[#0D223F] dark:via-[#0A1A2F] dark:to-[#020617] shadow-xl space-y-5 relative overflow-hidden text-slate-900 dark:text-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🏆</span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C6A96B]">
                    BEST TIMING RECOMMENDATION
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    ช่วงเวลาที่แนะนำสูงสุด: ตัวเลือก {comparisonResult.recommendedCandidate.id} ({comparisonResult.recommendedCandidate.start}–{comparisonResult.recommendedCandidate.end} น.)
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${SUITABILITY_META[comparisonResult.recommendedCandidate.suitability].badgeColor}`}>
                  <span>{SUITABILITY_META[comparisonResult.recommendedCandidate.suitability].emoji}</span>{" "}
                  <span>{SUITABILITY_META[comparisonResult.recommendedCandidate.suitability].label}</span>
                </span>
                <span className="text-xs font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-400/10 border border-amber-300 dark:border-amber-400/30 px-2.5 py-1 rounded-full">
                  คะแนน {comparisonResult.recommendedCandidate.score}/100
                </span>

                {comparisonResult.queryId && (
                  <button
                    type="button"
                    onClick={handleToggleBookmark}
                    title={bookmarked ? "ยกเลิกบุ๊กมาร์ก" : "บันทึกในบุ๊กมาร์ก"}
                    className={`p-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 ${
                      bookmarked
                        ? "bg-amber-100 dark:bg-amber-400/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-400/40"
                        : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#94A3B8] border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white"
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
              <p className="text-sm sm:text-base text-slate-800 dark:text-[#F8F6F1] leading-relaxed font-medium whitespace-pre-line">
                {comparisonResult.reason}
              </p>
            </div>

            {/* Actionable Tip */}
            {comparisonResult.actionable && (
              <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-400/20 bg-emerald-50/90 dark:bg-emerald-500/10 flex items-start gap-3">
                <span className="text-emerald-600 dark:text-emerald-400 text-base mt-0.5">✓</span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 mb-0.5">
                    ข้อแนะนำในการลงมือทำ
                  </p>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-[#E2E8F0] font-medium leading-snug">
                    {comparisonResult.actionable}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 2. Side-by-side Comparative Cards A / B / C */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-[#F8F6F1] flex items-center gap-2">
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
                        ? "border-[#C6A96B] bg-gradient-to-b from-amber-50/90 to-white dark:from-[#0D223F] dark:to-[#0A1628] shadow-lg shadow-[#C6A96B]/10 ring-1 ring-[#C6A96B]/50"
                        : `${meta.cardBorder} bg-white/95 dark:bg-[#0A1628]/80 hover:border-amber-300/60 dark:hover:border-white/20 shadow-sm`
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-black/10 dark:border-white/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-[#C6A96B]/20 border border-amber-300 dark:border-[#C6A96B]/40 text-amber-800 dark:text-[#C6A96B] flex items-center justify-center font-bold text-xs">
                            {cand.id}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-white">{cand.label}</span>
                        </div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-1">
                          {cand.start} – {cand.end} น.
                        </p>
                      </div>

                      {isWinner && (
                        <span className="px-2 py-0.5 rounded-full bg-[#C6A96B] text-[#0A1628] text-[10px] font-black uppercase shadow-sm">
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
                      <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                        {cand.score} <span className="text-xs text-slate-500 dark:text-[#94A3B8] font-normal">/100</span>
                      </span>
                    </div>

                    {/* Strengths */}
                    <div className="space-y-1.5 text-xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        จุดเด่น & พลังงานเกื้อหนุน:
                      </p>
                      <ul className="space-y-1">
                        {cand.strengths.map((s, idx) => (
                          <li key={idx} className="text-slate-700 dark:text-[#CBD5E1] flex items-start gap-1.5">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Cautions */}
                    <div className="space-y-1.5 text-xs pt-1 border-t border-black/5 dark:border-white/5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        ข้อควรระวัง / สิ่งที่ต้องคำนึง:
                      </p>
                      <ul className="space-y-1">
                        {cand.cautions.map((c, idx) => (
                          <li key={idx} className="text-slate-600 dark:text-[#94A3B8] flex items-start gap-1.5">
                            <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">!</span>
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
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-[#94A3B8]">
              <span>🔒</span>
              <span>บันทึกผลการเปรียบเทียบเข้าสู่คลังปัญญา (Unified Wisdom Memory) โดยอัตโนมัติแล้ว</span>
            </div>
            <a
              href="#wisdom-vault-section"
              className="text-[#C6A96B] font-bold hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span>ดูประวัติในคลังคำตอบด้านล่าง</span>
              <span>↓</span>
            </a>
          </div>
        </div>
      )}

      {/* ── 2B. PREDICTION RESULT DISPLAY (Instant Question) ── */}
      {prediction && activeMode === "instant" && (
        <div
          className="rounded-3xl p-6 sm:p-8 border border-amber-200/90 dark:border-emerald-500/30 bg-white/95 dark:bg-[#0A1A2F]/90 backdrop-blur-2xl shadow-xl space-y-6 animate-fade-up relative overflow-hidden text-slate-900 dark:text-white"
        >
          {/* Category Tag Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                  CATEGORY_ICONS[prediction.intentCategory]?.color || CATEGORY_ICONS.general.color
                }`}
              >
                <span>{CATEGORY_ICONS[prediction.intentCategory]?.emoji}</span>
                <span>{CATEGORY_ICONS[prediction.intentCategory]?.label}</span>
              </span>
              <span className="text-xs text-slate-600 dark:text-[#94A3B8] italic font-medium">
                "{prediction.question}"
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 dark:text-[#94A3B8]">ระดับความสอดคล้อง:</span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  prediction.confidence === "high"
                    ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400"
                    : prediction.confidence === "medium"
                    ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400"
                    : "bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300"
                }`}
              >
                {prediction.confidence === "high" ? "สูงมาก" : prediction.confidence === "medium" ? "ปานกลาง" : "แนะนำสังเกตการณ์"}
              </span>

              {prediction.queryId && (
                <button
                  type="button"
                  onClick={handleToggleBookmark}
                  title={bookmarked ? "ยกเลิกบุ๊กมาร์ก" : "บันทึกในบุ๊กมาร์ก"}
                  className={`px-2.5 py-1 rounded-md border text-xs font-bold transition-all flex items-center gap-1 ${
                    bookmarked
                      ? "bg-amber-100 dark:bg-amber-400/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-400/40"
                      : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#94A3B8] border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white"
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
            <p className="text-base sm:text-lg text-slate-900 dark:text-[#F8F6F1] leading-relaxed font-sans font-medium whitespace-pre-line">
              {prediction.answer}
            </p>
          </div>

          {/* Best Window Box (if exists) */}
          {prediction.bestWindow && (
            <div className="p-4 rounded-2xl border border-amber-300/80 dark:border-amber-400/30 bg-amber-50/90 dark:bg-amber-400/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-900 dark:text-white">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏳</span>
                <div>
                  <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-widest">
                    ช่วงเวลาที่แนะนำมากที่สุด
                  </p>
                  <p className="text-base font-bold text-slate-900 dark:text-white">
                    {prediction.bestWindow.timeRange}
                  </p>
                </div>
              </div>
              {prediction.bestWindow.description && (
                <span className="text-xs text-slate-700 dark:text-amber-200/90 font-medium">
                  {prediction.bestWindow.description}
                </span>
              )}
            </div>
          )}

          {/* Actionable Advice Box */}
          <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-400/20 bg-emerald-50/90 dark:bg-emerald-500/5 flex items-start gap-3">
            <span className="text-emerald-600 dark:text-emerald-400 text-base mt-0.5">✓</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 mb-0.5">
                ข้อแนะนำที่ทำได้ทันที
              </p>
              <p className="text-sm text-slate-800 dark:text-[#E2E8F0] font-medium leading-snug">
                {prediction.actionable}
              </p>
            </div>
          </div>

          {/* Deep Engine Link Portal (เชื่อมตรงสู่ ๔ ศาสตร์หลัก) */}
          {prediction.targetRoute && (
            <div className="p-4 sm:p-5 rounded-2xl border border-[#C6A96B]/50 bg-gradient-to-r from-amber-500/15 via-[#C6A96B]/10 to-transparent dark:from-[#0A1A2F] dark:to-[#071324] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C6A96B] flex items-center gap-1.5">
                  <span>🏛️</span>
                  <span>ระบบการพยากรณ์ที่ตรงหลักวิชาการแท้จริง</span>
                </span>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {prediction.targetEngineTitle || "เปิดดูผังคำนวณเจาะลึก"}
                </p>
                <p className="text-xs text-slate-600 dark:text-[#CBD5E1] leading-relaxed max-w-xl">
                  {prediction.targetEngineReason || "ดูผังดวงดาวและสมการเวลาฉบับเต็มเพื่อความแม่นยำสูงสุด"}
                </p>
              </div>
              <Link
                to={`${prediction.targetRoute}?q=${encodeURIComponent(prediction.question)}`}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-[#C6A96B] bg-gradient-to-r from-[#C6A96B] to-[#F2D49B] text-[#0A1628] hover:opacity-90 active:scale-95 transition-all shrink-0 flex items-center gap-2 shadow-lg shadow-[#C6A96B]/25"
              >
                <span>เปิดผังวิเคราะห์ ↗</span>
              </Link>
            </div>
          )}

          {/* Level 2: Evidence Chain Accordion */}
          {prediction.evidenceChain && prediction.evidenceChain.length > 0 && (
            <div className="pt-2 border-t border-black/10 dark:border-white/8">
              <button
                type="button"
                onClick={() => setShowEvidence(!showEvidence)}
                className="flex items-center justify-between w-full text-left py-2 text-xs font-bold text-slate-600 dark:text-[#94A3B8] hover:text-[#C6A96B] transition-colors"
              >
                <span>🔍 ดูปัจจัยพลังงานเชิงลึก (Evidence Chain — Level 2)</span>
                <span>{showEvidence ? "▲ ย่อ" : "▼ ขยาย"}</span>
              </button>

              {showEvidence && (
                <div className="mt-3 space-y-2 pl-3 border-l-2 border-[#C6A96B]/40 animate-fade-up">
                  {prediction.evidenceChain.map((ev, idx) => (
                    <div key={idx} className="text-xs space-y-0.5">
                      <span className="font-bold text-[#C6A96B]">{ev.source}:</span>
                      <p className="text-slate-700 dark:text-[#CBD5E1]">{ev.finding}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Inline Outcome Tracker for this Prediction */}
          {prediction.queryId && (
            <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🎯</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-amber-200 uppercase tracking-wide">
                    บันทึกผลลัพธ์ความเป็นจริง (Outcome Tracking)
                  </span>
                </div>
                {localOutcomes[prediction.queryId]?.actual_result && (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span>✓</span>
                    <span>บันทึกผลแล้ว: {OUTCOME_OPTIONS.find(o => o.id === localOutcomes[prediction.queryId!]?.actual_result)?.label}</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">
                เมื่อคุณได้ดำเนินการตามฤกษ์หรือผ่านพ้นเวลานั้นแล้ว มาร่วมบันทึกผลจริงเพื่อตรวจสอบความแม่นยำและเก็บบันทึกในคลังปัญญา
              </p>

              <div className="flex flex-wrap gap-2">
                {OUTCOME_OPTIONS.map((opt) => {
                  const currentOutcome = localOutcomes[prediction.queryId!]?.actual_result;
                  const isSelected = currentOutcome === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSaveOutcome(prediction.queryId!, opt.id, localOutcomes[prediction.queryId!]?.notes)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? `${opt.color} ring-2 ring-amber-400/50 scale-105 shadow-sm`
                          : "bg-slate-100/80 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-amber-300/80 dark:hover:border-white/20"
                      }`}
                    >
                      <span>{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {outcomeSavedId === prediction.queryId && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-fade-in flex items-center gap-1">
                  <span>✓</span>
                  <span>บันทึกผลการติดตามเข้าสู่คลังปัญญาเรียบร้อยแล้ว</span>
                </p>
              )}
            </div>
          )}

          {/* Auto-saved Wisdom Query Notice */}
          {prediction.queryId && (
            <div className="pt-3 border-t border-black/10 dark:border-white/8 flex items-center justify-between text-xs text-slate-500 dark:text-[#94A3B8]">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <span>บันทึกลงคลังคำตอบโดยอัตโนมัติแล้ว</span>
              </span>
              <a
                href="#wisdom-vault-section"
                className="text-[#C6A96B] hover:underline font-bold flex items-center gap-1"
              >
                <span>ดูในคลังคำตอบด้านล่าง</span>
                <span>↓</span>
              </a>
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

      {/* ── 3. WISDOM HISTORY & OUTCOME VAULT ("คลังคำตอบ & ติดตามผลย้อนหลัง") ── */}
      <div id="wisdom-vault-section" className="rounded-3xl p-5 sm:p-7 border border-[#C6A96B]/30 bg-white/95 dark:bg-[#0A1A2F]/80 backdrop-blur-xl shadow-xl space-y-5 relative overflow-hidden">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🏛️</span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C6A96B]">
                WISDOM MEMORY & OUTCOME VAULT
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                คลังคำตอบ & ติดตามผลย้อนหลัง
              </h2>
              <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-0.5">
                บันทึกประวัติคำถาม-คำตอบ พร้อมระบบติดตามผลลัพธ์จริงในชีวิตของคุณ ({allSavedQueries.length} รายการ)
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-[#020617]/70 border border-slate-200 dark:border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setVaultFilter("all")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                vaultFilter === "all"
                  ? "bg-[#C6A96B] text-[#0A1628] shadow-sm"
                  : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              ทั้งหมด ({allSavedQueries.length})
            </button>
            <button
              type="button"
              onClick={() => setVaultFilter("bookmarked")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
                vaultFilter === "bookmarked"
                  ? "bg-amber-400 text-[#0A1628] shadow-sm"
                  : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>★</span>
              <span>บุ๊กมาร์ก ({allSavedQueries.filter(q => q.is_bookmarked).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setVaultFilter("resolved")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                vaultFilter === "resolved"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              บันทึกผลแล้ว ({allSavedQueries.filter(q => {
                const out = localOutcomes[q.id]?.actual_result ?? q.outcome?.actual_result;
                return out && out !== "unresolved";
              }).length})
            </button>
            <button
              type="button"
              onClick={() => setVaultFilter("pending")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                vaultFilter === "pending"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              รอติดตามผล
            </button>
          </div>
        </div>

        {/* Sacred Engines Filter Pills (คัดกรองตาม ๔ ศาสตร์) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-[#94A3B8] mr-1">
            แยกตามศาสตร์:
          </span>
          {[
            { id: "all", label: "ทุกศาสตร์", emoji: "🌟" },
            { id: "horanu", label: "โหรทายหนู (เฉพาะหน้า)", emoji: "🎯" },
            { id: "yam", label: "ยามอัฏฐกาล (เดินทาง)", emoji: "⏰" },
            { id: "karnchata", label: "กาลชะตา (แผนรายชั่วโมง)", emoji: "📅" },
            { id: "rahu", label: "ราหูค้นทรัพย์ (๑๐ นาที/ของหาย)", emoji: "🧭" },
          ].map((eng) => (
            <button
              key={eng.id}
              type="button"
              onClick={() => setVaultEngineFilter(eng.id as any)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                vaultEngineFilter === eng.id
                  ? "bg-[#C6A96B]/20 border-[#C6A96B] text-[#C6A96B] font-bold shadow-sm"
                  : "bg-white/80 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#94A3B8] hover:border-amber-300 dark:hover:border-white/20"
              }`}
            >
              <span>{eng.emoji}</span>
              <span>{eng.label}</span>
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative">
          <input
            type="text"
            value={vaultSearch}
            onChange={(e) => setVaultSearch(e.target.value)}
            placeholder="🔍 ค้นหาคำถาม, คำแนะนำ หรือบันทึกย้อนหลัง..."
            className="w-full bg-slate-50 dark:bg-[#020617]/70 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-[#C6A96B] transition-all"
          />
          {vaultSearch && (
            <button
              type="button"
              onClick={() => setVaultSearch("")}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              ✕ ล้างค้นหา
            </button>
          )}
        </div>

        {/* Query Cards List */}
        {filteredVaultQueries.length === 0 ? (
          <div className="py-10 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 space-y-2">
            <span className="text-3xl block">📜</span>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {allSavedQueries.length === 0
                ? "ยังไม่มีประวัติคำถามในคลัง"
                : "ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา"}
            </p>
            <p className="text-xs text-slate-500">
              พิมพ์ถามคำถามด้านบน ระบบจะบันทึกผลการวิเคราะห์และฤกษ์เวลาลงในคลังนี้โดยอัตโนมัติ
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredVaultQueries.map((item) => {
              const isExpanded = expandedQueryId === item.id;
              const isEditing = editingOutcomeId === item.id;
              const outcome = localOutcomes[item.id]?.actual_result ?? item.outcome?.actual_result;
              const outcomeNote = localOutcomes[item.id]?.notes ?? item.outcome?.user_notes;
              const matchedOutcome = OUTCOME_OPTIONS.find((o) => o.id === outcome);
              const catMeta = CATEGORY_ICONS[item.intent_category] || CATEGORY_ICONS.general;
              const itemDate = new Date(item.created_at).toLocaleDateString("th-TH", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={item.id}
                  className="rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-white/10 bg-slate-50/60 dark:bg-[#020617]/50 hover:border-amber-300/80 dark:hover:border-white/20 transition-all space-y-3"
                >
                  {/* Header row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${catMeta.color}`}>
                        <span>{catMeta.emoji}</span>
                        <span>{catMeta.label}</span>
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {itemDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {matchedOutcome ? (
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${matchedOutcome.color}`}>
                          <span>{matchedOutcome.emoji}</span>
                          <span>{matchedOutcome.label}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                          ⏳ รอติดตามผล
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleVaultBookmark(item.id, item.is_bookmarked)}
                        title={item.is_bookmarked ? "ยกเลิกบุ๊กมาร์ก" : "บันทึกในบุ๊กมาร์ก"}
                        className={`p-1 rounded-lg border text-xs transition-all ${
                          item.is_bookmarked
                            ? "bg-amber-100 dark:bg-amber-400/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-400/40"
                            : "bg-white dark:bg-white/5 text-slate-400 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:text-amber-500"
                        }`}
                      >
                        <span>{item.is_bookmarked ? "★" : "☆"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Question */}
                  <div className="space-y-1">
                    <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      "{item.question}"
                    </p>
                    {/* Answer Preview or Full */}
                    <p className={`text-xs sm:text-sm text-slate-700 dark:text-[#E2E8F0] leading-relaxed ${!isExpanded ? "line-clamp-2" : "whitespace-pre-line"}`}>
                      {item.answer}
                    </p>
                  </div>

                  {/* Best Window if available */}
                  {item.best_window && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-400/30 bg-amber-50/80 dark:bg-amber-400/10 text-xs text-amber-900 dark:text-amber-200 font-medium">
                      <span>⏳ ช่วงเวลาแนะนำ:</span>
                      <span className="font-bold">{item.best_window.timeRange}</span>
                      {item.best_window.description && (
                        <span className="text-slate-600 dark:text-slate-300">({item.best_window.description})</span>
                      )}
                    </div>
                  )}

                  {/* Actionable tip if expanded */}
                  {isExpanded && item.actionable && (
                    <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-400/20 bg-emerald-50/80 dark:bg-emerald-500/5 text-xs text-slate-800 dark:text-slate-200 font-medium space-y-0.5">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 block">✓ คำแนะนำลงมือทำ:</span>
                      <p>{item.actionable}</p>
                    </div>
                  )}

                  {/* User Outcome Note Display (if recorded) */}
                  {outcomeNote && (
                    <div className="p-2.5 rounded-xl border border-blue-200 dark:border-blue-400/20 bg-blue-50/70 dark:bg-blue-950/20 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                      <span className="text-blue-500 font-bold">📝</span>
                      <div>
                        <span className="font-bold text-blue-800 dark:text-blue-300">บันทึกผลจริง: </span>
                        <span>{outcomeNote}</span>
                      </div>
                    </div>
                  )}

                  {/* Outcome Update Drawer */}
                  {isEditing ? (
                    <div className="p-3.5 rounded-xl border border-amber-300/80 dark:border-amber-400/30 bg-white dark:bg-[#0A1A2F] space-y-3 animate-fade-in shadow-sm">
                      <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>🎯</span>
                        <span>ระบุผลลัพธ์ความเป็นจริงที่เกิดขึ้น:</span>
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {OUTCOME_OPTIONS.map((opt) => {
                          const isSelected = outcome === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleSaveOutcome(item.id, opt.id, outcomeNotes || outcomeNote || undefined)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                                isSelected
                                  ? `${opt.color} ring-2 ring-amber-400/40 shadow-sm`
                                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-amber-300"
                              }`}
                            >
                              <span>{opt.emoji}</span>
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          บันทึกรายละเอียดหรือข้อสังเกตเพิ่มเติม (ไม่บังคับ):
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            defaultValue={outcomeNote || ""}
                            onChange={(e) => setOutcomeNotes(e.target.value)}
                            placeholder="เช่น การเจรจาราบรื่น ได้ผลตามคาด..."
                            className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-[#C6A96B]"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveOutcome(item.id, outcome || "accurate_success", outcomeNotes || outcomeNote || undefined)}
                            className="px-4 py-1.5 rounded-lg bg-[#C6A96B] text-[#0A1628] font-bold text-xs shrink-0 shadow-sm"
                          >
                            บันทึก
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingOutcomeId(null)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Bottom Card Controls */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setExpandedQueryId(isExpanded ? null : item.id)}
                      className="text-slate-500 dark:text-slate-400 hover:text-[#C6A96B] font-medium flex items-center gap-1"
                    >
                      <span>{isExpanded ? "▲ ย่อคำแนะนำ" : "▼ อ่านคำแนะนำฉบับเต็ม"}</span>
                    </button>

                    <div className="flex items-center gap-3">
                      <Link
                        to={`${catMeta.route || "/dashboard/horanu"}?q=${encodeURIComponent(item.question)}`}
                        className="text-amber-700 dark:text-[#C6A96B] font-bold hover:underline flex items-center gap-1"
                        title="เปิดดูผังคำนวณของศาสตร์นี้"
                      >
                        <span>เปิดผังวิเคราะห์</span>
                        <span>↗</span>
                      </Link>

                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingOutcomeId(item.id);
                            setOutcomeNotes(outcomeNote || "");
                          }}
                          className="text-[#C6A96B] font-bold hover:underline flex items-center gap-1"
                        >
                          <span>📝</span>
                          <span>{outcome ? "แก้ไขผลลัพธ์จริง" : "บันทึกผลลัพธ์จริง"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 4. CURRENT LIVE ENERGY SNAPSHOT ── */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C6A96B]">
            ✦ พลังงานจักรวาล ณ ขณะนี้ (LIVE ENERGY)
          </p>
          <span className="text-[10px] text-slate-500 dark:text-[#64748B]">อัปเดตอัตโนมัติ</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* ยามอัฐกาล */}
          <div className="bg-white/95 dark:bg-[#020617] border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
            <p className="text-[10px] text-slate-600 dark:text-[#94A3B8] uppercase tracking-widest font-bold">ยามอัฏฐกาล</p>
            <p className="text-lg font-display font-bold text-slate-900 dark:text-[#F8F6F1] leading-tight">{yam.yamName}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${yamLevelColor}`}>
                {yam.label}
              </span>
              <Ticks ticks={yam.ticks} />
            </div>
            <p className="text-[10px] text-slate-500 dark:text-[#64748B]">
              ยามที่ {yam.yamNumber} · {yam.period === "day" ? "กลางวัน" : "กลางคืน"}
            </p>
          </div>

          {/* กาลชะตา */}
          <div className="bg-white/95 dark:bg-[#020617] border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
            <p className="text-[10px] text-slate-600 dark:text-[#94A3B8] uppercase tracking-widest font-bold">กาลชะตา</p>
            <p className="text-lg font-display font-bold text-slate-900 dark:text-[#F8F6F1] leading-tight">{karnchata.yamYaiName}</p>
            <p className="text-[11px] text-slate-600 dark:text-[#94A3B8]">
              ดาวประจำวัน: ดาว {karnchata.dayStarNumber}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-[#64748B]">
              ยามซอย: {karnchata.yamSoyName} · เดือน {karnchata.lunarMonthName}
            </p>
          </div>

          {/* ยามพรายกระซิบ */}
          <div className="bg-white/95 dark:bg-[#020617] border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
            <p className="text-[10px] text-slate-600 dark:text-[#94A3B8] uppercase tracking-widest font-bold">ยามพรายกระซิบ</p>
            <p className="text-lg font-display font-bold text-slate-900 dark:text-[#F8F6F1] leading-tight">
              {horaP?.thai ?? `ดาว ${hora.yamPlanet}`}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-[#94A3B8]">
              ลัคนา: {hora.lagnaName}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-[#64748B]">
              {hora.yamStartStr} – {hora.yamEndStr}
            </p>
          </div>

          {/* ราหูค้นทรัพย์ */}
          <div className="bg-white/95 dark:bg-[#020617] border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
            <p className="text-[10px] text-slate-600 dark:text-[#94A3B8] uppercase tracking-widest font-bold">ราหูค้นทรัพย์</p>
            <p className="text-lg font-display font-bold text-slate-900 dark:text-[#F8F6F1] leading-tight">
              {rahu?.yamName ?? "—"}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] truncate">
              {rahu?.verdict ?? "ปกติ"}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-[#64748B]">
              {rahu ? `${rahu.startTime} – ${rahu.endTime}` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ── 5. PRO TOOLS ACCORDION (For Advanced Astrologers) ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/8 bg-slate-50/70 dark:bg-[#020617]/50 p-4">
        <button
          type="button"
          onClick={() => setShowProTools(!showProTools)}
          className="flex items-center justify-between w-full text-left text-xs font-bold text-slate-600 dark:text-[#94A3B8] hover:text-[#C6A96B] transition-colors"
        >
          <span className="flex items-center gap-2">
            <span>⚙️</span>
            <span>เครื่องมือวิเคราะห์เชิงลึกสำหรับผู้เชี่ยวชาญ (Pro Astrologer Tools)</span>
          </span>
          <span>{showProTools ? "▲ ปิด" : "▼ เปิด"}</span>
        </button>

        {showProTools && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-200 dark:border-white/5 animate-fade-up">
            <Link
              to="/dashboard/yam"
              className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:border-[#C6A96B]/40 transition-all flex flex-col gap-1 shadow-sm"
            >
              <span className="text-sm font-bold text-slate-900 dark:text-white">ยามอัฏฐกาลเต็มผัง</span>
              <span className="text-xs text-slate-500 dark:text-[#94A3B8]">ดูตาราง 8 ช่วงเวลาและทิศมงคลประจำวัน</span>
            </Link>

            <Link
              to="/dashboard/horanu"
              className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:border-[#C6A96B]/40 transition-all flex flex-col gap-1 shadow-sm"
            >
              <span className="text-sm font-bold text-slate-900 dark:text-white">ยามพรายกระซิบ 12 ภพ</span>
              <span className="text-xs text-slate-500 dark:text-[#94A3B8]">คำนวณดาวลอย ผังจักรราศี และโยคเกณฑ์</span>
            </Link>

            <Link
              to="/dashboard/karnchata"
              className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:border-[#C6A96B]/40 transition-all flex flex-col gap-1 shadow-sm"
            >
              <span className="text-sm font-bold text-slate-900 dark:text-white">กาลชะตากำเนิด</span>
              <span className="text-xs text-slate-500 dark:text-[#94A3B8]">ยามใหญ่ ยามซอย และสัมพันธภาพจักรราศี</span>
            </Link>

            <Link
              to="/dashboard/rahu"
              className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:border-[#C6A96B]/40 transition-all flex flex-col gap-1 shadow-sm"
            >
              <span className="text-sm font-bold text-slate-900 dark:text-white">ราหูค้นทรัพย์</span>
              <span className="text-xs text-slate-500 dark:text-[#94A3B8]">วิเคราะห์การตามหาของหายและทิศเสี่ยงโชค</span>
            </Link>

            <Link
              to="/dashboard/horoscope"
              className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:border-[#C6A96B]/40 transition-all flex flex-col gap-1 shadow-sm"
            >
              <span className="text-sm font-bold text-slate-900 dark:text-white">ผังดวงจักรพรรดิ</span>
              <span className="text-xs text-slate-500 dark:text-[#94A3B8]">เลข ๗ ตัว ๙ ฐาน ทักษา และวัยจร</span>
            </Link>

            <Link
              to="/dashboard/reports/new"
              className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:border-[#C6A96B]/40 transition-all flex flex-col gap-1 shadow-sm"
            >
              <span className="text-sm font-bold text-slate-900 dark:text-white">สร้างรายงานฉบับเต็ม</span>
              <span className="text-xs text-slate-500 dark:text-[#94A3B8]">วิเคราะห์ดวงชะตาเชิงลึกด้วย AI</span>
            </Link>
          </div>
        )}
      </div>

    </div>
  );
}

