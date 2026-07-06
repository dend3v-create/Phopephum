/**
 * dashboard.check-yam.tsx — เช็คฤกษ์ยาม
 * Hub รวมทางลัด: ยามอัฐกาล · กาลชะตา · ยามพรายกระซิบ · ราหูค้นทรัพย์ · ดวงชะตา
 */
import { json } from "@remix-run/cloudflare";
import { useLoaderData, Link, useRevalidator } from "@remix-run/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireMinPlan } from "~/services/auth.server";
import {
  getCurrentYam,
  calculateKarnchata,
  calculateHoraTaynoo,
  calculateRahu,
  PLANET_INFO,
  ZODIAC_ORDER,
} from "@phopephum/engine";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18next from "~/lib/i18n/i18n.server";

export const meta: MetaFunction = () => [
  { title: "เช็คฤกษ์ยาม — PhopePhum" },
  { name: "description", content: "ทางลัดรวมเครื่องมือพยากรณ์: ยามอัฐกาล กาลชะตา ยามพรายกระซิบ ราหูค้นทรัพย์" },
];

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireMinPlan("basic", request, env);

  const locale = await i18next.getLocale(request);
  const currentLocale = locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "th-TH";

  const now = new Date();

  const yam      = getCurrentYam();
  const karnchata = calculateKarnchata(now);
  const hora      = calculateHoraTaynoo({ dateAsked: now });
  const rahu      = calculateRahu(now);

  const formattedDate = now.toLocaleDateString(currentLocale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return json({
    serverTime: now.toISOString(),
    formattedDate,
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
      yamYaiName:    karnchata.yamYaiName,
      yamYaiNumber:  karnchata.yamYaiNumber,
      yamSoyName:    karnchata.yamSoyName,
      yamSoyNumber:  karnchata.yamSoyNumber,
      dayStarNumber: karnchata.dayStarNumber,
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
      isGood:   rahu.is_current_moment_good,
      verdict:  rahu.summary.overall_verdict,
      advice:   rahu.summary.advice,
      yamName:  rahu.summary.current_yam_name,
      phase:    rahu.summary.phase,
      startTime: rahu.main_block.start_time,
      endTime:   rahu.main_block.end_time,
    } : null,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<string, string> = {
  excellent: "text-[#C6A96B] border-[#C6A96B]/40 bg-[#C6A96B]/8",
  very_good: "text-[#D9BC82] border-[#D9BC82]/30 bg-[#D9BC82]/6",
  good:      "text-[#F8F6F1] border-[#F8F6F1]/20 bg-white/5",
  bad:       "text-[#6D8FC7] border-[#6D8FC7]/20 bg-[#4B6FAE]/5",
};

// ─── Tool Card ────────────────────────────────────────────────────────────────

function ToolCard({
  to,
  icon,
  title,
  badge,
  badgeColor,
  lines,
  openLabel,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  badgeColor?: string;
  lines: string[];
  openLabel: string;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-3 p-4 rounded-2xl border border-white/5 bg-[#0A1628]/60 hover:border-[#C6A96B]/30 hover:bg-[#0A1628] transition-all active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start justify-between gap-2.5 w-full">
          <div className="flex items-center gap-2.5">
            <span className="text-[#C6A96B] opacity-70 group-hover:opacity-100 transition-opacity">
              {icon}
            </span>
            <span className="text-sm font-bold text-[#F8F6F1]">{title}</span>
          </div>
          {badge && (
            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor ?? "text-[#C6B79F] border-white/10"}`}>
              {badge}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1">
        {lines.map((line, i) => (
          <p key={i} className="text-xs text-[#C6B79F] leading-relaxed">{line}</p>
        ))}
      </div>
      <div className="flex items-center justify-end gap-1 text-[10px] text-[#C6A96B]/50 group-hover:text-[#C6A96B] transition-colors font-bold">
        {openLabel} <span>→</span>
      </div>
    </Link>
  );
}

// ─── Live Clock ───────────────────────────────────────────────────────────────

function LiveClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const fmt = (n: number) => String(n).padStart(2, "0");
  const h = t.getHours(), m = t.getMinutes(), s = t.getSeconds();
  return (
    <span className="font-mono text-[#C6A96B] text-2xl font-bold tabular-nums tracking-widest">
      {fmt(h)}:{fmt(m)}:{fmt(s)}
    </span>
  );
}

// ─── Ticks display ────────────────────────────────────────────────────────────

function Ticks({ ticks }: { ticks: number }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3].map(i => (
        <span key={i} className={`w-2 h-2 rounded-full ${i <= ticks ? "bg-[#C6A96B]" : "bg-white/10"}`} />
      ))}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckYamPage() {
  const data = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();
  const { t } = useTranslation(["yam", "common", "horoscope"]);

  // Auto-revalidate ทุก 60 วินาที
  useEffect(() => {
    const id = setInterval(revalidate, 60_000);
    return () => clearInterval(id);
  }, [revalidate]);

  const { yam, karnchata, hora, rahu } = data;
  const yamLevelColor = LEVEL_COLOR[yam.level] ?? "text-[#C6B79F] border-white/10";
  const horaP = PLANET_INFO[hora.yamPlanet];

  const translatedYamName = t("yam:yam_names." + yam.yamName, yam.yamName);
  const translatedKarnchataYamYai = t("yam:yam_names." + karnchata.yamYaiName, karnchata.yamYaiName);
  const translatedKarnchataYamSoy = t("yam:yam_names." + karnchata.yamSoyName, karnchata.yamSoyName);
  const translatedDayStar = t("horoscope:planets." + karnchata.dayStarNumber, String(karnchata.dayStarNumber));
  
  const translatedHoraPlanet = t("horoscope:planets." + hora.yamPlanet, horaP?.thai ?? `ดาว ${hora.yamPlanet}`);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <span className="text-[#C6A96B] text-[10px] tracking-[0.3em] uppercase font-bold block mb-1">
            {t("yam:check_yam_subtitle", "✦ ศูนย์รวมฤกษ์ยาม")}
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F8F6F1]">
            {t("yam:check_yam_title", "เช็คฤกษ์ยาม")}
          </h1>
          <p className="text-[#C6B79F] text-sm mt-1">{data.formattedDate}</p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1">
          <LiveClock />
          <p className="text-[10px] text-[#C6B79F]">{t("yam:check_yam_update", "อัปเดตทุก 60 วินาที")}</p>
        </div>
      </div>

      {/* ── 4 Status Widgets ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {/* ยามอัฐกาล */}
        <div className="bg-[#020617] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-[10px] text-[#C6B79F] uppercase tracking-widest font-bold">{t("common:nav.yam_pro", "ยามอัฐกาล")}</p>
          <p className="text-lg font-display font-bold text-[#F8F6F1] leading-tight">{translatedYamName}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${yamLevelColor}`}>
              {t("yam:" + yam.level, yam.label)}
            </span>
            <Ticks ticks={yam.ticks} />
          </div>
          <p className="text-[10px] text-[#C6B79F]">
            {t("yam:yam_order", { order: yam.yamNumber, defaultValue: `ยามที่ ${yam.yamNumber}` })} · {t("yam:period_" + yam.period, yam.period)} · {t("yam:phase_" + yam.phase, yam.phase)}
          </p>
        </div>

        {/* กาลชะตา */}
        <div className="bg-[#020617] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-[10px] text-[#C6B79F] uppercase tracking-widest font-bold">{t("common:nav.karnchata", "กาลชะตา")}</p>
          <p className="text-lg font-display font-bold text-[#F8F6F1] leading-tight">{translatedKarnchataYamYai}</p>
          <p className="text-[11px] text-[#C6B79F]">
            {t("yam:hora_day_star", { star: translatedDayStar, defaultValue: `ดาวประจำวัน: ${translatedDayStar}` })}
          </p>
          <p className="text-[10px] text-[#C6B79F]">
            {t("yam:karnchata_soy", { soy: translatedKarnchataYamSoy, month: karnchata.lunarMonthName, defaultValue: `ยามซอย: ${translatedKarnchataYamSoy} · เดือน ${karnchata.lunarMonthName}` })}
          </p>
        </div>

        {/* ยามพรายกระซิบ */}
        <div className="bg-[#020617] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-[10px] text-[#C6B79F] uppercase tracking-widest font-bold">{t("common:nav.yam_whisper", "ยามพรายกระซิบ")}</p>
          <p className="text-lg font-display font-bold leading-tight" style={{ color: horaP?.color ?? "#F8F6F1" }}>
            {translatedHoraPlanet}
          </p>
          <p className="text-[11px] text-[#C6B79F]">
            {t("yam:yam_number", { number: hora.yamAsked, defaultValue: `ยาม ${hora.yamAsked}` })} · {t("yam:period_" + hora.period, hora.period)}
          </p>
          <p className="text-[10px] text-[#C6B79F]">
            {hora.yamStartStr}–{hora.yamEndStr} · {t("yam:hora_lagna", { lagna: t("horoscope:houses." + hora.lagnaName, hora.lagnaName), defaultValue: `ลัคนา ${hora.lagnaName}` })}
          </p>
        </div>

        {/* ราหูค้นทรัพย์ */}
        <div className={`rounded-2xl p-4 flex flex-col gap-2 border ${rahu?.isGood ? "bg-[#C6A96B]/8 border-[#C6A96B]/20" : "bg-[#4B6FAE]/8 border-[#4B6FAE]/20"}`}>
          <p className="text-[10px] text-[#C6B79F] uppercase tracking-widest font-bold">{t("common:nav.rahu", "ราหูค้นทรัพย์")}</p>
          <p className={`text-lg font-display font-bold leading-tight ${rahu?.isGood ? "text-[#C6A96B]" : "text-[#6D8FC7]"}`}>
            {rahu?.isGood ? t("yam:rahu_good", "✓ ฤกษ์ดี") : t("yam:rahu_bad", "✕ ระวัง")}
          </p>
          {rahu && (
            <>
              <p className="text-[11px] text-[#C6B79F] truncate">{rahu.verdict}</p>
              <p className="text-[10px] text-[#C6B79F]">{(rahu.startTime)}–{(rahu.endTime)}</p>
            </>
          )}
        </div>
      </div>

      {/* ── ทางลัด 5 เครื่องมือ ── */}
      <div>
        <p className="text-[10px] text-[#C6A96B]/60 uppercase tracking-[0.25em] font-bold mb-3">
          {t("common:nav.pro_tools", "✦ เครื่องมือพยากรณ์")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

          <ToolCard
            to="/dashboard/yam"
            icon={<ClockIcon />}
            title={t("common:nav.yam_pro", "ยามอัฐกาลชั้นฉาย")}
            badge={t("yam:" + yam.level, yam.label)}
            badgeColor={yamLevelColor}
            lines={[
              `${t("yam:yam_number", { number: yam.yamNumber })} ${translatedYamName} · ${t("yam:period_" + yam.period, yam.period)}`,
              yam.shouldDo ? `✦ ${yam.shouldDo}` : "ดูตารางยาม 16 ยาม + คำทำนาย",
            ]}
            openLabel={t("yam:open_tool", "เปิดใช้งาน")}
          />

          <ToolCard
            to="/dashboard/karnchata"
            icon={<HourglassIcon />}
            title={t("common:nav.karnchata", "เลข ๗ ตัวกาลชะตา")}
            badge={`${t("horoscope:planets.planet", "ดาว")} ${translatedDayStar}`}
            badgeColor="text-[#C6A96B] border-[#C6A96B]/30 bg-[#C6A96B]/8"
            lines={[
              `ยามใหญ่: ${translatedKarnchataYamYai} (${karnchata.yamYaiNumber}) · ยามซอย: ${translatedKarnchataYamSoy}`,
              "ผัง 9 ฐาน รายวัน / รายชั่วโมง / รายนาที",
            ]}
            openLabel={t("yam:open_tool", "เปิดใช้งาน")}
          />

          <ToolCard
            to="/dashboard/horanu"
            icon={<StarCrossIcon />}
            title={t("common:nav.yam_whisper", "ยามพรายกระซิบ")}
            badge={`${t("yam:yam_number", { number: hora.yamAsked })} ${t("yam:period_" + hora.period, hora.period)}`}
            badgeColor="text-[#4B6FAE] border-[#4B6FAE]/40 bg-[#4B6FAE]/8"
            lines={[
              `ดาวเจ้ายาม: ${translatedHoraPlanet} · ลัคนา ${t("horoscope:houses." + hora.lagnaName, hora.lagnaName)}`,
              "ผังดวงยามพรายกระซิบ ดาวลอย 11 ภพ 12 + ยามย่อย",
            ]}
            openLabel={t("yam:open_tool", "เปิดใช้งาน")}
          />

          <ToolCard
            to="/dashboard/rahu"
            icon={<RahuIcon />}
            title={t("common:nav.rahu", "ยามราหูค้นทรัพย์")}
            badge={rahu?.isGood ? t("yam:rahu_good") : t("yam:rahu_bad")}
            badgeColor={rahu?.isGood
              ? "text-[#C6A96B] border-[#C6A96B]/40 bg-[#C6A96B]/8"
              : "text-[#6D8FC7] border-[#6D8FC7]/30 bg-[#4B6FAE]/6"}
            lines={[
              rahu ? rahu.verdict : "คำนวณฤกษ์ราหู",
              rahu ? `✦ ${rahu.advice}` : "ตารางยามมงคลรายวัน",
            ]}
            openLabel={t("yam:open_tool", "เปิดใช้งาน")}
          />

          <ToolCard
            to="/dashboard/horoscope"
            icon={<CompassIcon />}
            title={t("common:nav.horoscope", "ตั้งดวงชะตา")}
            lines={[
              "เลข ๗ ตัว ๙ ฐาน ผังจักรพรรดิ",
              "วิเคราะห์ดวงชาตาจากวันเกิด",
            ]}
            openLabel={t("yam:open_tool", "เปิดใช้งาน")}
          />

        </div>
      </div>

      {/* ── คำแนะนำยามปัจจุบัน ── */}
      {yam.shouldDo && (
        <Card className="border-[#C6A96B]/20 bg-[#020617] p-5">
          <p className="text-[10px] text-[#C6A96B] uppercase tracking-widest font-bold mb-3">
            {t("yam:yam_guideline", { name: translatedYamName, defaultValue: `✦ แนวทางยามปัจจุบัน — ${translatedYamName}` })}
          </p>
          <p className="text-base text-yellow-100 font-bold leading-relaxed">{yam.shouldDo}</p>
          {rahu?.advice && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-[10px] text-[#C6B79F] font-bold mb-1">ราหู: {rahu.verdict}</p>
              <p className="text-xs text-[#C6B79F] leading-relaxed">{rahu.advice}</p>
            </div>
          )}
        </Card>
      )}

    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <circle cx="12" cy="12" r="9" /><path d="M12 3v4M12 17v4M3 12h4M17 12h4" strokeLinecap="round" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function HourglassIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path d="M5 2h14M5 22h14M19 2v4a7 7 0 0 1-7 7 7 7 0 0 1-7-7V2M5 22v-4a7 7 0 0 1 7-7 7 7 0 0 1 7 7v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarCrossIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" strokeLinecap="round" /><circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

function RahuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12" strokeLinecap="round" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path d="M12 22V12" strokeLinecap="round" />
      <path d="M12 12C12 12 7 9 7 5a5 5 0 0 1 10 0c0 4-5 7-5 7z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 22h14" strokeLinecap="round" />
    </svg>
  );
}
