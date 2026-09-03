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
import { useLoaderData, useActionData, useNavigation, Form, Link, useRevalidator } from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
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
  const question = String(formData.get("question") || "").trim();

  if (!question) {
    return json<{ error?: string; prediction?: PredictionResult }>({ error: "กรุณาระบุคำถามหรือเรื่องที่ต้องการทราบ" }, { status: 400 });
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

  return json<{ error?: string; prediction?: PredictionResult }>({ prediction });
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

  const [inputQuery, setInputQuery] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);
  const [showProTools, setShowProTools] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isSubmitting = navigation.state === "submitting" || navigation.state === "loading";
  const prediction = actionData?.prediction;

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
            ✦ INTENT PREDICTION & TIMING
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F8F6F1]">
            ถามเรื่องที่อยากรู้
          </h1>
          <p className="text-[#94A3B8] text-xs sm:text-sm mt-1">
            ค้นหาจังหวะเวลาและคำตอบจากพลังงานจักรวาล ไม่ต้องรู้ชื่อศาสตร์
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1">
          <LiveClock />
          <p className="text-[10px] text-[#64748B]">{data.formattedDate}</p>
        </div>
      </div>

      {/* ── 1. HERO INTENT INPUT BOX ── */}
      <div
        className="rounded-3xl p-5 sm:p-7 border border-[#C6A96B]/30 shadow-2xl relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(10,34,64,0.7) 0%, rgba(2,6,23,0.9) 100%)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#C6A96B]/10 rounded-full blur-3xl pointer-events-none" />

        <Form method="post" className="space-y-4 relative z-10">
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
      </div>

      {/* ── 2. PREDICTION RESULT DISPLAY ── */}
      {prediction && (
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
                <span>🔍 ดูปัจจัยพลังงานเชิงลึก (Evidence Chain)</span>
                <span>{showEvidence ? "▲ ย่อ" : "▼ ขยาย"}</span>
              </button>

              {showEvidence && (
                <div className="mt-3 space-y-2 pl-2 border-l-2 border-[#C6A96B]/30 animate-fade-up">
                  {prediction.evidenceChain.map((item, idx) => (
                    <div key={idx} className="text-xs space-y-0.5 py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#C6A96B]">{item.source}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-[#94A3B8]">
                          {item.weight === "primary" ? "ปัจจัยหลัก" : "ปัจจัยสนับสนุน"}
                        </span>
                      </div>
                      <p className="text-[#CBD5E1]">{item.finding}</p>
                    </div>
                  ))}
                </div>
              )}
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
