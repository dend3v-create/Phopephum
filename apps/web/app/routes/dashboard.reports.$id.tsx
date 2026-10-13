import { json } from "@remix-run/cloudflare";
import { useLoaderData, Link } from "@remix-run/react";
import { useState, useMemo } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { calculatePhopephum } from "@phopephum/engine";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { SocialStoryModal } from "~/components/cards/SocialStoryModal";
import { AstralIcon } from "~/components/ui/AstralIcon";
import type { AstralIconName, AstralIconVariant } from "~/components/ui/AstralIcon";
import type { Env } from "~/env.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `${data?.label ?? "รายงานการถอดรหัสชะตาชีวิต"} — PhopePhum Wisdom OS` },
  { name: "description", content: "รายงานการถอดรหัสปัญญาชะตาชีวิต ผังดวง ๗ ตัว ๙ ฐาน และมหาภูติทักษาจักรพรรดิ" },
];

interface ReportMetaItem {
  label: string;
  iconName: AstralIconName;
  variant: AstralIconVariant;
  desc: string;
  iconBg: string;
}

const REPORT_LABELS: Record<string, ReportMetaItem> = {
  general_prediction: {
    label: "พยากรณ์ปัญญาชีวิต (Therapy)",
    iconName: "wisdom",
    variant: "gold",
    desc: "แนวทางบำบัดและไกด์เส้นทางชีวิตหลัก",
    iconBg: "bg-violet-500/20 border-violet-400/30 text-violet-300 shadow-[0_0_15px_rgba(168,85,247,0.25)]",
  },
  life_overview: {
    label: "โครงสร้างชีวิตเชิงลึก",
    iconName: "horanu",
    variant: "gold",
    desc: "แก่นแท้และจุดมุ่งหมายชีวิต",
    iconBg: "bg-amber-500/20 border-amber-400/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]",
  },
  personal_branding: {
    label: "ตัวตน & อัตลักษณ์",
    iconName: "crown",
    variant: "amber",
    desc: "เสน่ห์จากพื้นดวงและแบรนด์บุคคล",
    iconBg: "bg-amber-500/20 border-amber-400/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]",
  },
  career: {
    label: "ภารกิจ & ความสำเร็จ",
    iconName: "career",
    variant: "sky",
    desc: "หน้าที่ความรับผิดชอบและเป้าหมายชีวิต",
    iconBg: "bg-sky-500/20 border-sky-400/30 text-sky-300 shadow-[0_0_15px_rgba(14,165,233,0.25)]",
  },
  relationship: {
    label: "เสน่ห์ & ความสัมพันธ์",
    iconName: "relationship",
    variant: "rose",
    desc: "สายใยบทเรียนและเมตตาบารมี",
    iconBg: "bg-rose-500/20 border-rose-400/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.25)]",
  },
  health: {
    label: "สุขภาพ & พลังชีวิต",
    iconName: "wellness",
    variant: "emerald",
    desc: "ความสมดุลของธาตุและพลังชีวิต",
    iconBg: "bg-emerald-500/20 border-emerald-400/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]",
  },
  wealth: {
    label: "กระแสทรัพย์ & มั่งคั่ง",
    iconName: "finance",
    variant: "emerald",
    desc: "คลังสมบัติประจำดวงและวิถีดึงดูดทรัพย์",
    iconBg: "bg-emerald-500/20 border-emerald-400/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]",
  },
  daily_insight: {
    label: "ปัญญาญาณรายวัน",
    iconName: "spark",
    variant: "gold",
    desc: "แนวทางปฏิบัติและการเจริญสติ",
    iconBg: "bg-yellow-500/20 border-yellow-400/30 text-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.25)]",
  },
  annual_forecast: {
    label: "จังหวะชะตารายปี",
    iconName: "calendar",
    variant: "gold",
    desc: "แผนที่พลังงานและบทเรียนปีจร",
    iconBg: "bg-cyan-500/20 border-cyan-400/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]",
  },
};

const BASE_ROW_NAMES = [
  "ฐ.๑",
  "ฐ.๒",
  "ฐ.๓",
  "ฐ.๔",
  "ฐ.๕",
  "ฐ.๖",
  "ฐ.๗",
  "ฐ.๘",
  "ฐ.๙",
];


const HOUSE_NAMES_ROW1 = ["อัตตะ", "หินะ", "ธนัง", "ปิตา", "มาตา", "โภคา", "มัชฌิมา"];
const HOUSE_NAMES_ROW2 = ["ตนุ", "กฎุมภะ", "สหัชชะ", "พันธุ", "ปุตตะ", "อริ", "ปัตนิ"];
const HOUSE_NAMES_ROW3 = ["มรณะ", "ศุภะ", "กัมมะ", "ลาภะ", "พยายะ", "ทาสา", "ทาสี"];
const HOUSE_NAMES_ROW8 = ["อาตมะ", "ทาสา", "สิทธิโชค", "โภคทรัพย์", "โจร", "อุบาทว์", "อุปถัมภ์"];
const HOUSE_NAMES_ROW9 = ["อัตตะ", "สักกะ", "ญาติ", "ธนัง", "เคหัง", "นาวัง", "ภริยัง"];

const POWER_NAMES: Record<number, string> = {
  3: "พระอังคาร",
  4: "พระพุธ",
  5: "พระพฤหัส",
  6: "พระอาทิตย์",
  7: "พระเสาร์",
  8: "พระอังคาร",
  9: "พระเกตุ",
  10: "พระเสาร์",
  11: "ราชาโชค",
  12: "พระราหู",
  13: "มหาอุจจ์",
  14: "จักรพรรดิ",
  15: "พระจันทร์",
  16: "โสฬส",
  17: "พระพุธ",
  18: "มหาจักร",
  19: "พระพฤหัส",
  20: "เสาร์กำลังสอง",
  21: "พระศุกร์",
};

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  const { supabase } = createSupabaseClient(request, env);
  const { data: report, error } = await supabase
    .from("ai_reports")
    .select("id, report_type, created_at, content")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !report) {
    throw new Response("ไม่พบรายงาน", { status: 404 });
  }

  const metaItem = REPORT_LABELS[report.report_type] ?? {
    label: report.report_type,
    iconName: "wisdom" as AstralIconName,
    variant: "gold" as AstralIconVariant,
    desc: "รายงานการถอดรหัสชะตาชีวิต",
    iconBg: "bg-amber-500/20 border-amber-400/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]",
  };
  const label = metaItem.label;
  const iconName = metaItem.iconName;
  const variant = metaItem.variant;
  const iconBg = metaItem.iconBg;
  const desc = metaItem.desc;
  const text = extractText(report.content);

  // Determine membership tier
  const rawPlan = (profile?.plan || profile?.subscription || "free").toLowerCase();
  const role = profile?.role || "user";
  const isMaster = role === "admin" || ["master", "imperial", "lifetime"].includes(rawPlan);
  const isPro = isMaster || role === "operator" || ["pro", "unlimited"].includes(rawPlan);
  const tierName = isMaster ? "IMPERIAL MASTER" : isPro ? "WISDOM PRO" : "BASIC MEMBER";

  // Calculate 7-Base 9-Row Chart if profile birthDate exists
  let chartData: {
    bases: number[][];
    thaiDateText?: string;
    vayaJorn?: { houseName: string; row: number; col: number; star: number; ageRange?: string };
    ageYang?: number;
    taksaTransitRole?: string;
  } | null = null;

  if (profile?.birth_date) {
    try {
      const bTime = (profile.birth_time || "12:00").slice(0, 5);
      const calculated = await calculatePhopephum({
        birthDate: profile.birth_date,
        birthTime: bTime,
        birthPlace: profile.birth_place || "กรุงเทพมหานคร",
      });

      chartData = {
        bases: calculated.nineBase.bases,
        thaiDateText: calculated.nineBase.lunarDate.thaiDateText,
        vayaJorn: calculated.vayaJorn,
        ageYang: calculated.taksaTransit.ageYang,
      };
    } catch (err) {
      console.error("Horoscope chart calculation error:", err);
    }
  }

  return json({
    report,
    label,
    iconName,
    variant,
    iconBg,
    desc,
    text,
    tierName,
    isPro,
    isMaster,
    profile: {
      displayName: profile?.display_name || user.email || "ผู้ใช้งาน",
      birthDate: profile?.birth_date || "",
      birthTime: profile?.birth_time || "",
      birthPlace: profile?.birth_place || "",
      email: user.email || "",
    },
    chartData,
  });
}

export default function ReportDetail() {
  const { report, label, iconName, variant, iconBg, desc, text, tierName, isPro, isMaster, profile, chartData } =
    useLoaderData<typeof loader>();

  const [selectedStar, setSelectedStar] = useState<number | null>(null);
  const [showChartOnScreen, setShowChartOnScreen] = useState<boolean>(true);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState<boolean>(false);

  const formattedDate = useMemo(() => {
    return new Date(report.created_at).toLocaleDateString("th-TH", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [report.created_at]);

  const shortDate = useMemo(() => {
    return new Date(report.created_at).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  }, [report.created_at]);

  // Social story data payload
  const storyData = useMemo(() => {
    const quoteMatches = text.match(/"([^"]+)"|“([^”]+)”/);
    const quote = quoteMatches ? quoteMatches[1] || quoteMatches[2] : "";
    return {
      userName: profile.displayName,
      userTier: tierName,
      dateStr: formattedDate,
      lunarStr: chartData?.thaiDateText || "คัมภีร์ดวงดาวจักรพรรดิ",
      wisdomTitle: label,
      wisdomQuote: quote || "ทุกสรรพสิ่งล้วนเชื่อมโยงเป็นสายใยและบทเรียนรู้ที่ช่วยให้เราเติบโตในแบบของตัวเอง",
      doList: ["ตั้งสติและตระหนักรู้ในปัจจุบันกรรม", "บริหารจัดการด้วยปัญญาและความรอบคอบ"],
      avoidList: ["การตัดสินใจด้วยความหุนหันพลันแล่น"],
      energyScore: 92,
    };
  }, [text, profile.displayName, tierName, formattedDate, chartData, label]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* ══════════════════════════════════════════════════════════
          PRINT-ONLY OFFICIAL CERTIFICATE HEADER
          ══════════════════════════════════════════════════════════ */}
      <div className="hidden print:block border-b-2 border-[#1E293B] pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-[#0F172A] flex items-center justify-center font-bold text-lg">
              P
            </div>
            <div>
              <h1 className="text-xl font-bold font-serif text-[#0F172A] tracking-wider uppercase">
                PhopePhum Wisdom OS
              </h1>
              <p className="text-[10pt] text-[#475467] font-medium">
                รายงานการถอดรหัสปัญญาชะตาชีวิต · {label}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-0.5 rounded text-[9pt] font-bold border border-[#0F172A] bg-[#F1F5F9] text-[#0F172A]">
              {tierName}
            </span>
            <p className="text-[8pt] text-[#64748B] mt-1">รหัสเอกสาร: {report.id.slice(0, 13)}</p>
          </div>
        </div>

        {/* Subject Information Box */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-200 text-[9pt] text-[#1E293B]">
          <div>
            <span className="text-slate-500 block text-[8pt]">เจ้าชะตา</span>
            <strong className="text-slate-900">{profile.displayName}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[8pt]">วันเกิดสุริยคติ</span>
            <span>{profile.birthDate || "-"} {profile.birthTime ? `(${profile.birthTime} น.)` : ""}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[8pt]">จันทรคติไทย</span>
            <span>{chartData?.thaiDateText || "เทียบตามปฏิทิน 100 ปี"}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[8pt]">วันที่วิเคราะห์</span>
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* ── Web Top Navigation Bar ── */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Link
          to="/dashboard/reports"
          className="inline-flex items-center gap-2 text-sm text-[#94A3B8] hover:text-[#D9BC82] transition-colors active:scale-95"
        >
          <span className="text-base">←</span>
          <span>รายงานทั้งหมด</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Social Share Button */}
          <button
            type="button"
            onClick={() => setIsStoryModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/10 hover:border-[#C6A96B]/50 bg-white/5 hover:bg-[#C6A96B]/10 text-xs font-semibold text-[#D9CDB7] hover:text-[#F8F6F1] transition-all shadow-sm active:scale-95"
          >
            <AstralIcon name="spark" variant="gold" size="sm" glow={false} />
            <span className="hidden sm:inline">แชร์ Social Story</span>
          </button>

          {/* Print PDF Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#C6A96B]/40 hover:border-[#C6A96B] bg-gradient-to-r from-[#C6A96B]/20 to-[#D9BC82]/10 hover:from-[#C6A96B]/30 hover:to-[#D9BC82]/20 text-[#D9BC82] hover:text-[#F8F6F1] transition-all text-xs font-bold shadow-sm active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>พิมพ์ / PDF</span>
          </button>
        </div>
      </div>

      {/* ── Report Title Header (Web View) ── */}
      <div className="card-glass p-5 md:p-6 border-[#C6A96B]/20 relative overflow-hidden print:hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#C6A96B]/10 to-transparent pointer-events-none rounded-full blur-2xl" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 border ${iconBg}`}>
              <AstralIcon name={iconName} variant={variant} size="xl" glow />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#C6A96B]/15 border border-[#C6A96B]/30 text-[#D9BC82]">
                  {tierName}
                </span>
                <span className="text-xs text-[#94A3B8]">· {formattedDate}</span>
              </div>

              <h1 className="font-display text-2xl md:text-3xl font-bold text-[#F8F6F1]">
                {label}
              </h1>

              <p className="text-sm text-[#C6B79F] mt-1 leading-relaxed">{desc}</p>
            </div>
          </div>

          {/* Quick Chart Toggle */}
          {chartData && (
            <button
              type="button"
              onClick={() => setShowChartOnScreen(!showChartOnScreen)}
              className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/10 bg-black/30 hover:bg-black/50 text-xs text-[#D9CDB7] hover:text-[#F8F6F1] transition-all self-start sm:self-auto"
            >
              <AstralIcon name="horoscope" variant="gold" size="sm" glow={false} />
              <span>{showChartOnScreen ? "ซ่อนผังดวง" : "แสดงผังดวง ๗ ตัว"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          7-BASE 9-ROW CHART (INTERACTIVE ON SCREEN & CRISP IN PRINT)
          ══════════════════════════════════════════════════════════ */}
      {chartData && (
        <div
          className={`print-avoid-break transition-all duration-300 ${
            showChartOnScreen ? "block" : "hidden"
          } print:block`}
        >
          <div className="card-glass-premium p-4 md:p-5 border-[#C6A96B]/30 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 print:border-slate-300 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔮</span>
                <h3 className="font-display text-base md:text-lg font-bold text-[#F8F6F1] print:text-[#0F172A]">
                  ผังดวง ๗ ตัว ๙ ฐาน (7-Base 9-Row Chart)
                </h3>
              </div>
              <p className="text-[11px] text-[#C6B79F] print:text-slate-600">
                {selectedStar ? `แตะดาว ${selectedStar} เพื่อดูสายใยสัมพันธ์` : "แตะตัวเลขเพื่อดูความเชื่อมโยง"}
              </p>
            </div>

             {/* Matrix Table — Full Mobile Responsive with Clean Capsule Cards */}
            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed border-separate border-spacing-1 sm:border-spacing-1.5 text-center">
                <tbody className="font-mono">
                  {chartData.bases.map((row, rIdx) => {
                    const rowName = BASE_ROW_NAMES[rIdx] || `ฐ.${rIdx + 1}`;
                    const isBase4 = rIdx === 3;
                    const isLinkedBase = rIdx === 0 || rIdx === 1 || rIdx === 2 || rIdx === 7 || rIdx === 8;
                    const col3Star = selectedStar !== null ? chartData.bases[2]?.indexOf(selectedStar) : -1;

                    return (
                      <tr key={rIdx}>
                        {/* Row Header ฐ.๑ - ฐ.๙ */}
                        <td className="w-[34px] sm:w-[44px] py-1 text-center font-sans text-xs sm:text-sm font-bold text-[#D9BC82] print:text-slate-800 whitespace-nowrap select-none">
                          {rowName}
                        </td>

                        {/* 7 Columns */}
                        {row.map((val, cIdx) => {
                          const isHighlighted = selectedStar !== null && isLinkedBase && val === selectedStar;
                          const isBase4Linked = selectedStar !== null && isBase4 && cIdx === col3Star;
                          const houseName =
                            rIdx === 0
                              ? HOUSE_NAMES_ROW1[cIdx]
                              : rIdx === 1
                              ? HOUSE_NAMES_ROW2[cIdx]
                              : rIdx === 2
                              ? HOUSE_NAMES_ROW3[cIdx]
                              : rIdx === 7
                              ? HOUSE_NAMES_ROW8[cIdx]
                              : rIdx === 8
                              ? HOUSE_NAMES_ROW9[cIdx]
                              : "";

                          const powerName = isBase4 ? POWER_NAMES[val] || "" : "";

                          const handleClick = () => {
                            if (isBase4) {
                              const starInRow3 = chartData.bases[2]?.[cIdx];
                              if (starInRow3) setSelectedStar(selectedStar === starInRow3 ? null : starInRow3);
                            } else {
                              setSelectedStar(selectedStar === val ? null : val);
                            }
                          };

                          return (
                            <td
                              key={cIdx}
                              onClick={handleClick}
                              className="p-0 select-none cursor-pointer"
                            >
                              <div
                                className={`rounded-xl sm:rounded-2xl py-1.5 px-0.5 sm:px-1 flex flex-col items-center justify-center min-h-[50px] sm:min-h-[58px] transition-all duration-200 border ${
                                  isHighlighted
                                    ? "bg-gradient-to-br from-[#E8D4A8] via-[#C6A96B] to-[#9D7F3E] text-[#020617] font-black shadow-lg shadow-[#C6A96B]/30 border-[#FFF8E7] scale-[1.04]"
                                    : isBase4Linked
                                    ? "bg-gradient-to-br from-[#FDE047] via-[#F59E0B] to-[#D97706] text-[#020617] font-black shadow-lg shadow-amber-500/40 border-white scale-[1.04]"
                                    : isBase4
                                    ? "bg-[var(--pp-surface-0b1e38)]/85 hover:bg-[var(--pp-surface-0b1e38)] border-[#C6A96B]/35 hover:border-[#C6A96B]/60 text-[#F8F6F1] shadow-sm"
                                    : "bg-[var(--pp-surface-061426)]/75 hover:bg-[var(--pp-surface-0a2240)]/80 border-white/10 hover:border-[#C6A96B]/40 text-[#F8F6F1]"
                                }`}
                              >
                                <span
                                  className={`text-sm sm:text-base md:text-lg font-display font-extrabold leading-tight ${
                                    isHighlighted || isBase4Linked
                                      ? "text-[#020617]"
                                      : isBase4
                                      ? "text-[#F8E3B6] print:text-amber-900"
                                      : "text-[#F8F6F1] print:text-slate-900"
                                  }`}
                                >
                                  {val}
                                </span>

                                {/* House or Power subtitle */}
                                {houseName && (
                                  <span
                                    className={`text-[9px] sm:text-[10.5px] md:text-[11.5px] font-sans tracking-tight truncate max-w-full block leading-none mt-0.5 ${
                                      isHighlighted
                                        ? "text-[#020617] font-bold"
                                        : "text-[#C6B79F] print:text-slate-600 font-medium"
                                    }`}
                                  >
                                    {houseName}
                                  </span>
                                )}
                                {powerName && (
                                  <span
                                    className={`text-[8.5px] sm:text-[10px] md:text-[11px] font-sans tracking-tight truncate max-w-full block leading-none mt-0.5 ${
                                      isBase4Linked
                                        ? "text-[#020617] font-black"
                                        : "text-[#D9BC82] print:text-amber-800 font-bold"
                                    }`}
                                  >
                                    {powerName}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════════════════════
          REPORT CONTENT (THE 4 SACRED SECTIONS)
          ══════════════════════════════════════════════════════════ */}
      <Card className="print:border print:border-slate-200 print:shadow-none print:p-0">
        <div className="prose prose-invert max-w-none print:prose-neutral">
          <ReportBody text={text} isPro={isPro} />
        </div>
      </Card>

      {/* ══════════════════════════════════════════════════════════
          PRINT FOOTER & AUTHENTICITY SEAL
          ══════════════════════════════════════════════════════════ */}
      <div className="hidden print:block pt-6 border-t border-slate-300 mt-8 text-center text-[9pt] text-slate-600">
        <p className="font-serif font-semibold text-slate-800">
          ✦ PHOPEPHUM LIVING WISDOM ENGINE — CERTIFIED DECODING REPORT ✦
        </p>
        <p className="text-[8pt] text-slate-500 mt-0.5">
          เอกสารวิเคราะห์ดวงชะตาส่วนบุคคลเพื่อการเจริญสติและพัฒนาปัญญาญาณภายใน · สงวนลิขสิทธิ์เฉพาะ {profile.displayName}
        </p>
      </div>

      {/* ── Social Story Modal ── */}
      <SocialStoryModal
        isOpen={isStoryModalOpen}
        onClose={() => setIsStoryModalOpen(false)}
        data={storyData}
      />
    </div>
  );
}

/** Render markdown-ish text with high-contrast formatting for both Screen and PDF */
function ReportBody({ text, isPro }: { text: string; isPro: boolean }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-3.5 text-[#D9CDB7] print:text-[#1E293B] leading-relaxed text-sm md:text-[15px]">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        // Header 1 or 2 (The Awakening, The Decoding, etc.)
        if (/^#{1,2}\s/.test(line)) {
          const content = line.replace(/^#{1,2}\s+/, "");
          const isSectionNumber = /^[1-4]\.\s/.test(content);

          return (
            <div
              key={i}
              className={`print-avoid-break mt-6 mb-3 pt-3 border-t border-white/10 print:border-slate-300 first:border-0 first:pt-0 ${
                isSectionNumber ? "scroll-mt-4" : ""
              }`}
            >
              <h2 className="font-display text-xl md:text-2xl font-bold text-[#F8F6F1] print:text-[#0F172A] flex items-center gap-2">
                <span className="text-[#C6A96B] print:text-[#7A5C2E]">✦</span>
                <span>{content}</span>
              </h2>
            </div>
          );
        }

        // Header 3
        if (/^###/.test(line)) {
          const content = line.replace(/^###\s+/, "");
          return (
            <h3
              key={i}
              className="font-display text-base md:text-lg font-semibold text-[#D9BC82] print:text-[#7A5C2E] mt-4 mb-1.5 print-avoid-break"
            >
              {content}
            </h3>
          );
        }

        // Bullet point
        if (/^[-*]\s/.test(line)) {
          const content = line.replace(/^[-*]\s+/, "");
          return (
            <div key={i} className="flex items-start gap-2.5 ml-1">
              <span className="text-[#C6A96B] print:text-[#7A5C2E] mt-1 shrink-0 text-xs">◆</span>
              <div className="flex-1">{renderInline(content)}</div>
            </div>
          );
        }

        // Numbered list
        if (/^\d+\.\s/.test(line)) {
          const match = line.match(/^(\d+)\.\s+(.*)$/);
          if (match) {
            return (
              <div key={i} className="flex items-start gap-2.5 ml-1 my-1">
                <span className="font-bold text-[#D9BC82] print:text-[#0F172A] shrink-0 text-xs mt-0.5 w-5">
                  {match[1]}.
                </span>
                <div className="flex-1">{renderInline(match[2])}</div>
              </div>
            );
          }
        }

        // Blockquote
        if (/^>\s/.test(line)) {
          const content = line.replace(/^>\s+/, "");
          return (
            <blockquote
              key={i}
              className="my-3 pl-4 py-2 border-l-2 border-[#C6A96B] print:border-[#7A5C2E] bg-[#C6A96B]/5 print:bg-slate-50 text-[#F2D49B] print:text-[#1E293B] italic rounded-r-lg"
            >
              {renderInline(content)}
            </blockquote>
          );
        }

        // Horizontal Rule
        if (/^---|^___/.test(line)) {
          return <hr key={i} className="my-5 border-white/10 print:border-slate-200" />;
        }

        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

/** Bold, italic, and highlighted inline parser */
function renderInline(text: string) {
  const parts = text.split(/(\*{1,3}[^*]+\*{1,3}|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (/^\*{3}.+\*{3}$/.test(part)) {
      return (
        <strong key={i} className="text-[#F2D49B] print:text-[#0F172A] font-bold">
          {part.slice(3, -3)}
        </strong>
      );
    }
    if (/^\*{2}.+\*{2}$/.test(part)) {
      return (
        <strong key={i} className="text-[#F8F6F1] print:text-[#0F172A] font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (/^\*.+\*$/.test(part)) {
      return (
        <em key={i} className="text-[#D9BC82] print:text-[#7A5C2E] not-italic font-medium">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (/^`[^`]+`$/.test(part)) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-white/10 print:bg-slate-100 text-[#F2D49B] print:text-[#0F172A] text-xs font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (content && typeof content === "object") {
    const c = content as Record<string, unknown>;
    if (typeof c.text === "string") return c.text;
    if (typeof c.content === "string") return c.content;
    if (typeof c.summary === "string") return c.summary;
  }
  return "";
}
