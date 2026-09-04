/**
 * dashboard.horanu.tsx — ยามพรายกระซิบ
 * ผังดวงยามพรายกระซิบ V2 — 2 Modes: คำนวณสด + ดวงยามสำเร็จ 112 ผัง
 */
import { json } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, useLoaderData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireMinPlan, requireAuth } from "~/services/auth.server";
import {
  calculateHoraTaynoo,
  generateHoraTaynooSVG,
  loadSuccessYam,
  getSuccessYamMeta,
  interpretChart,
  PLANET_INFO,
  ZODIAC_ORDER,
  BHAVA_NAMES,
  PLANET_KASTERN,
  KASTERN_FIXED,
} from "@phopephum/engine";
import type { HoraTaynooResult, ChartConfig, ChartInterpretation, PlanetEntry } from "@phopephum/engine";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import type { Env } from "~/env.server";
import { getYamLibrary } from "~/services/yam-library.server";
import { createSupabaseClient } from "~/services/supabase.server";
import type { YamLibraryRow } from "~/services/yam-library.server";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "~/i18n/context";

export const meta: MetaFunction = () => [
  { title: "โหรทายหนู (ยามพรายกระซิบ) — PhopePhum" },
  { name: "description", content: "โหรทายหนู (หรือเรียกว่า วิชายามพรายกระซิบ หรือยามอัฏฐกาล) เป็นศาสตร์การพยากรณ์ยามโบราณของไทยที่ใช้คำนวณเหตุการณ์เฉพาะหน้าหรือตอบคำถามเร่งด่วน โดยอาศัยหลักการเทียบเวลาและวันเกิดเหตุการณ์จริงกับตำแหน่งดาว" },
];

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  await requireMinPlan("basic", request, env);

  const now    = new Date();
  const result = calculateHoraTaynoo({ dateAsked: now });
  const interpretation = interpretChart(result);
  const svg    = generateHoraTaynooSVG(result, { size: 520, theme: "dark" });
  const meta   = getSuccessYamMeta();
  const library = await getYamLibrary(env);

  const { supabase } = createSupabaseClient(request, env);
  const { data: pastChats } = await supabase
    .from("horanu_chats")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return json({
    result,
    interpretation,
    svg,
    serverTime: now.toISOString(),
    meta,
    library,
    pastChats: pastChats || [],
  });
}

// ─── Action ───────────────────────────────────────────────────────────────────

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAuth(request, env);

  const formData = await request.formData();
  const mode     = formData.get("mode") as string;

  let result: HoraTaynooResult;

  if (mode === "success-yam") {
    const weekday = Number(formData.get("weekday") ?? 0);
    const period  = (formData.get("period") ?? "day") as "day" | "night";
    const yamNo   = Number(formData.get("yamNo") ?? 1);

    result = loadSuccessYam(weekday, period, yamNo);
  } else {
    // custom time
    let targetDate = new Date();
    const day   = Number(formData.get("day")   ?? 0);
    const month = Number(formData.get("month") ?? 0);
    const year  = Number(formData.get("year")  ?? 0);
    const time  = String(formData.get("time")  ?? "12:00");
    const [h, m] = time.split(":").map(Number);
    
    if (day && month && year) {
      // ใช้ ISO Format พร้อม Timezone Offset (+07:00) เพื่อความแม่นยำ
      const iso = `${year - 543}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00+07:00`;
      targetDate = new Date(iso);
    }
    
    result = calculateHoraTaynoo({ dateAsked: targetDate });
  }


  const interpretation = interpretChart(result);
  const svg = generateHoraTaynooSVG(result, { size: 520, theme: "dark" });
  return json({ result, interpretation, svg, mode });
}

// ─── Display helpers ──────────────────────────────────────────────────────────

const DAY_NAMES_TH = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์","เสาร์"];
const DAY_COLORS   = ["#F59E0B","#CBD5E1","#EF4444","#10B981","#EAB308","#A855F7","#94A3B8"];

// ─── Sub-components ───────────────────────────────────────────────────────────


function YamBadge({ result }: { result: HoraTaynooResult }) {
  return (
    <div className="grid grid-cols-3 gap-3 text-center">
      <div className="bg-[#C9A96E]/10 border border-[#C9A96E]/25 rounded-2xl p-3">
        <p className="text-[10px] text-[#D9CDB7] uppercase tracking-wider mb-1">วัน</p>
        <p className="font-display text-lg font-bold text-[#F8F6F1]">{DAY_NAMES_TH[result.dayOfWeek]}</p>
      </div>
      <div className="bg-[#C9A96E]/10 border border-[#C9A96E]/25 rounded-2xl p-3">
        <p className="text-[10px] text-[#D9CDB7] uppercase tracking-wider mb-1">ยามที่</p>
        <p className="font-display text-3xl font-bold text-[#C9A96E]">{result.yamAsked}</p>
        <p className="text-[10px] text-[#D9CDB7]">{result.period === "day" ? "กลางวัน" : "กลางคืน"}</p>
      </div>
      <div className="bg-[#C9A96E]/10 border border-[#C9A96E]/25 rounded-2xl p-3">
        <p className="text-[10px] text-[#D9CDB7] uppercase tracking-wider mb-1">เวลายาม</p>
        <p className="text-sm font-bold text-[#F8F6F1]">{result.yamStartStr}</p>
        <p className="text-[10px] text-[#D9CDB7]">— {result.yamEndStr}</p>
      </div>
    </div>
  );
}

function PlanetSummary({ result }: { result: HoraTaynooResult }) {
  const dayP = PLANET_INFO[result.dayPlanet];
  const yamP = PLANET_INFO[result.yamPlanet];
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="border border-white/8 bg-slate-900/30 rounded-2xl p-4">
        <p className="text-[10px] text-[#D9CDB7] uppercase tracking-wider mb-2">ดาวประจำวัน</p>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-display text-lg font-bold shrink-0"
            style={{ background: `${dayP?.color}20`, border: `1px solid ${dayP?.color}50`, color: dayP?.color }}>
            {result.dayPlanet}
          </div>
          <div>
            <p className="text-sm font-bold text-[#F8F6F1]">{dayP?.thai}</p>
            <p className="text-[10px] text-[#D9CDB7]">{result.period === "day" ? dayP?.day : dayP?.night}</p>
          </div>
        </div>
      </div>
      <div className="border border-white/8 bg-slate-900/30 rounded-2xl p-4">
        <p className="text-[10px] text-[#D9CDB7] uppercase tracking-wider mb-2">ดาวเจ้ายาม</p>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-display text-lg font-bold shrink-0"
            style={{ background: `${yamP?.color}20`, border: `1px solid ${yamP?.color}50`, color: yamP?.color }}>
            {result.yamPlanet}
          </div>
          <div>
            <p className="text-sm font-bold text-[#F8F6F1]">{yamP?.thai}</p>
            <p className="text-[10px] text-[#D9CDB7]">เกษตร: {ZODIAC_ORDER[result.kasternZodiacIndex]?.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getPlanetThreeBhavas(planetNum: number, zodiacIndex: number, bhavaMap: Record<number, string>, status: string | null): string[] {
  const occBhava = bhavaMap[zodiacIndex] ?? "—";
  const ownedZodiacs = PLANET_KASTERN[planetNum] ?? [];
  const ownedBhavas = ownedZodiacs.map(z => bhavaMap[z] ?? "—");
  
  if (ownedBhavas.length === 1) {
    return [ownedBhavas[0], ownedBhavas[0], occBhava];
  } else if (ownedBhavas.length === 2) {
    return [ownedBhavas[0], ownedBhavas[1], occBhava];
  }
  
  return [occBhava, occBhava, occBhava];
}

function ThreeBhavaTable({ result }: { result: HoraTaynooResult }) {
  const planetsList = [1, 2, 3, 4, 5, 6, 7, 8];
  return (
    <Card className="border-[#C9A96E]/15 bg-slate-900/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-[#C9A96E] rounded-full" />
        <p className="text-[#C9A96E] text-[11px] uppercase tracking-widest font-bold font-display">ดาว 3 ภพ (เจ้าเรือน + สถิต)</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {planetsList.map(pNum => {
          const pInfo = PLANET_INFO[pNum];
          const entry = result.planetEntries.find(e => e.planetNum === pNum);
          if (!entry) return null;
          const threeBhavas = getPlanetThreeBhavas(pNum, entry.zodiacIndex, result.bhavaMap, entry.status);
          return (
            <div key={pNum} className="rounded-xl p-2 text-center border border-white/5 bg-slate-950/20">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] text-[#D9CDB7] font-bold">ดาว {pNum}</span>
                {entry.status && (
                  <span className="text-[7.5px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                    {entry.status === 'kaset' ? 'เกษตร' : entry.status === 'maha-uccj' ? 'อุจจ์' : entry.status === 'racha-chok' ? 'ราชาโชค' : entry.status === 'maha-chakr' ? 'มหาจักร' : entry.status === 'pra' ? 'ประ' : 'นิจ'}
                  </span>
                )}
              </div>
              <div className="font-display text-sm font-bold text-[#F8F6F1] mb-0.5">
                {pInfo?.thai.replace('พระ', '') ?? `ดาว ${pNum}`}
              </div>
              <div className="text-[9px] text-[#C9A96E] font-medium leading-relaxed">
                {threeBhavas.join(' - ')}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CurrentPredictionPoint({ result }: { result: HoraTaynooResult }) {
  const [nowMin, setNowMin] = useState(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setNowMin(now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  let activeSlot = result.subTimeSlots.find(slot => nowMin >= slot.startMin && nowMin < slot.endMin);
  if (!activeSlot) activeSlot = result.subTimeSlots[0];

  const planetsInSlot = result.planetEntries.filter(e => e.zodiacIndex === activeSlot.zodiacIndex && !e.isLagna);
  
  const STATUS_GLYPHS: Record<string, { char: string; color: string; label: string }> = {
    'maha-uccj': { char: '✿', color: '#22C55E', label: 'มหาอุจจ์' },
    'kaset': { char: '△', color: '#EF4444', label: 'เกษตร' },
    'racha-chok': { char: '⬡', color: '#3B82F6', label: 'ราชาโชค' },
    'maha-chakr': { char: '□', color: '#EAB308', label: 'มหาจักร' },
    'pra': { char: '○', color: '#EF4444', label: 'ประ' },
    'nij': { char: '✳', color: '#EF4444', label: 'นิจ' },
  };

  return (
    <div className="border border-[#C9A96E]/20 bg-[#C9A96E]/5 rounded-2xl p-4 mt-3">
      <p className="text-[10px] text-[#C9A96E] uppercase tracking-wider mb-2 font-bold flex items-center gap-1.5 font-display">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        จุดพยากรณ์ปัจจุบัน (ยามย่อยขณะนี้)
      </p>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-[#F8F6F1] font-display">
            ภพ{activeSlot.bhavaName} ({activeSlot.zodiacName})
          </p>
          <p className="text-[10px] text-[#D9CDB7] mt-0.5">
            เวลา: {activeSlot.startStr} - {activeSlot.endStr} น.
          </p>
        </div>
        <div className="flex gap-2">
          {planetsInSlot.length === 0 ? (
            <span className="text-[10px] text-[#D9CDB7] italic">ไม่มีดาวลอย</span>
          ) : (
            planetsInSlot.map((p, idx) => {
              const pInfo = p.planetNum !== null ? PLANET_INFO[p.planetNum] : null;
              const st = p.status ? STATUS_GLYPHS[p.status] : null;
              return (
                <div key={idx} className="flex flex-col items-center bg-slate-950/40 border border-white/5 rounded-lg px-2 py-0.5">
                  <span className="text-sm font-bold font-serif" style={{ color: pInfo?.color ?? '#C9A96E' }}>
                    {p.labelThai}
                  </span>
                  {st ? (
                    <span className="text-[8px] font-bold flex items-center gap-0.5" style={{ color: st.color }}>
                      {st.char} {st.label}
                    </span>
                  ) : (
                    <span className="text-[8px] text-[#D9CDB7]">ปกติ</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ✦ PhopePhum Sacred Celestial Symbols (สัญลักษณ์ภพภูมิและดวงดาว) ✦
// ─────────────────────────────────────────────────────────────────────────────

function BhavaSymbol({
  bhava,
  className = "w-5 h-5",
  color,
}: {
  bhava: string;
  className?: string;
  color?: string;
}) {
  const iconColor = color ?? "currentColor";

  switch (bhava) {
    case "กดุมภะ": // ทรัพย์สิน / เงินทอง
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9.5" strokeOpacity="0.35" />
          <path d="M7 10h10v7a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-7z" fill={iconColor} fillOpacity="0.18" />
          <path d="M7 10a5 5 0 0 1 10 0" />
          <circle cx="12" cy="13.5" r="1.5" fill={iconColor} />
          <path d="M12 15v2" />
        </svg>
      );
    case "กัมมะ": // หน้าที่การงาน / ธุรกิจ
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="7" width="16" height="13" rx="2.5" fill={iconColor} fillOpacity="0.18" />
          <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          <path d="M4 12h16" strokeOpacity="0.35" />
          <circle cx="12" cy="13.5" r="1.2" fill={iconColor} />
          <path d="M12 10.5v1.5" />
        </svg>
      );
    case "ปุตตะ": // บุตรบริวาร / สิ่งใหม่ / คนหาย
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3c-2.5 4-5 7-5 11a5 5 0 0 0 10 0c0-4-2.5-7-5-11z" fill={iconColor} fillOpacity="0.18" />
          <path d="M12 4v14" strokeOpacity="0.5" />
          <circle cx="12" cy="8.5" r="1.2" fill={iconColor} />
          <path d="m9.5 13 2.5 2 2.5-2" />
        </svg>
      );
    case "พันธุ": // ครอบครัว / บ้าน / หลักเรือน
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.5L3.5 9.5v10a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5v-10L12 2.5z" fill={iconColor} fillOpacity="0.18" />
          <path d="M9.5 21v-6.5a2.5 2.5 0 0 1 5 0V21" />
          <circle cx="12" cy="7.5" r="1.2" fill={iconColor} />
        </svg>
      );
    case "ปัตนิ": // คู่ครอง / หุ้นส่วน / สัญญา
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="12" r="5.5" fill={iconColor} fillOpacity="0.12" />
          <circle cx="15" cy="12" r="5.5" fill={iconColor} fillOpacity="0.12" />
          <path d="M12 8.5a5.5 5.5 0 0 1 0 7" strokeWidth="2" />
          <circle cx="12" cy="4" r="0.75" fill={iconColor} />
          <circle cx="12" cy="20" r="0.75" fill={iconColor} />
        </svg>
      );
    case "ลาภะ": // โชคลาภ / ผลประโยชน์
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4h12v4a6 6 0 0 1-12 0V4z" fill={iconColor} fillOpacity="0.18" />
          <path d="M6 6H4a2 2 0 0 0-2 2v1a3 3 0 0 0 3 3h1" />
          <path d="M18 6h2a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3h-1" />
          <path d="M12 14v4" />
          <path d="M8 21h8" strokeWidth="2" />
          <circle cx="12" cy="8" r="1.5" fill={iconColor} />
        </svg>
      );
    case "ศุภะ": // ความสำเร็จ / ผู้ใหญ่เมตตา / มงคล
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" fill={iconColor} fillOpacity="0.25" />
          <path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22" strokeWidth="1.8" />
          <path d="m5 5 2.5 2.5M16.5 16.5 19 19M5 19l2.5-2.5M16.5 7.5 19 5" strokeOpacity="0.6" />
          <circle cx="12" cy="12" r="1.5" fill={iconColor} />
        </svg>
      );
    case "มรณะ": // ของหาย / การเปลี่ยนแปลง / แดนไกล
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" strokeOpacity="0.3" />
          <path d="M12 3a9 9 0 0 1 6.36 15.36L12 12V3z" fill={iconColor} fillOpacity="0.18" />
          <circle cx="12" cy="12" r="4.5" strokeDasharray="2 2" />
          <circle cx="12" cy="12" r="1.5" fill={iconColor} />
        </svg>
      );
    case "อริ": // อุปสรรค / ปัญหาเฉพาะหน้า
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3.5L4.5 7v6c0 5 3.5 8.5 7.5 9.5 4-1 7.5-4.5 7.5-9.5V7l-7.5-3.5z" fill={iconColor} fillOpacity="0.18" />
          <path d="M12 8v7.5" strokeWidth="1.8" />
          <path d="M9 11.5h6" strokeWidth="1.5" />
          <circle cx="12" cy="7.5" r="1" fill={iconColor} />
        </svg>
      );
    case "วินาศ": // เรื่องลับ / สิ่งซ่อนเร้น / เบื้องหลัง
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 12c3-6 7.5-8 9.5-8s6.5 2 9.5 8c-3 6-7.5 8-9.5 8s-6.5-2-9.5-8z" fill={iconColor} fillOpacity="0.15" />
          <circle cx="12" cy="12" r="3.5" />
          <circle cx="12" cy="12" r="1.5" fill={iconColor} />
          <path d="M12 4v2M12 18v2" strokeOpacity="0.5" />
        </svg>
      );
    case "สหัชชะ": // การเจรจา / มิตรสหาย / ติดต่อ
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="7" cy="12" r="3.5" fill={iconColor} fillOpacity="0.18" />
          <circle cx="17" cy="12" r="3.5" fill={iconColor} fillOpacity="0.18" />
          <path d="M10.5 12h3" strokeWidth="2" strokeDasharray="1 1" />
          <path d="M12 6c-2 2-2 4 0 6 2 2 2 4 0 6" strokeOpacity="0.6" />
          <circle cx="12" cy="12" r="1.2" fill={iconColor} />
        </svg>
      );
    case "ตนุ": // ตนเอง / กายใจ / การตัดสินใจ
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" fill={iconColor} fillOpacity="0.22" />
          <path d="M5.5 20.5c0-3.8 3-6.8 6.5-6.8s6.5 3 6.5 6.8" fill={iconColor} fillOpacity="0.12" />
          <circle cx="12" cy="8" r="1.2" fill={iconColor} />
          <path d="M12 2v2M12 20v2" strokeOpacity="0.4" />
        </svg>
      );
  }
}

function ModeSymbol({
  mode,
  className = "w-5 h-5",
}: {
  mode: "bhava" | "time";
  className?: string;
}) {
  if (mode === "bhava") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" strokeOpacity="0.35" />
        <path d="m14.5 9.5-5 2 2 5 5-2-2-5z" fill="currentColor" fillOpacity="0.2" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21" strokeOpacity="0.5" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" strokeOpacity="0.35" />
      <path d="M12 7v5l3.5 2" strokeWidth="1.8" />
      <path d="M12 3a9 9 0 0 1 8.5 6" strokeOpacity="0.7" strokeDasharray="2 2" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="m17.5 4.5 2 2" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ✦ Two-Stage Bhava Predictor (การพยากรณ์เชื่อมโยง ๒ ภพ) ✦
// ─────────────────────────────────────────────────────────────────────────────

interface BhavaQuestionCategory {
  id: string;
  bhava: string;
  name: string;
  color: string;
  category: string;
  keywords: string;
  sampleQuestion: string;
}

const BHAVA_QUESTION_CATEGORIES: BhavaQuestionCategory[] = [
  { id: "wealth", bhava: "กดุมภะ", name: "การเงิน / ของมีค่า / หนี้สิน", color: "#F59E0B", category: "ทรัพย์สินเงินทอง", keywords: "เงินทอง, ของมีค่า, ทรัพย์สมบัติ, หนี้สินที่จะทวง", sampleQuestion: "ถามเรื่องการเงินและทรัพย์สิน: จะได้รับเงินก้อนหรือของมีค่าที่รอคอยไหม?" },
  { id: "career", bhava: "กัมมะ", name: "การงาน / ธุรกิจ / กิจการ", color: "#38BDF8", category: "หน้าที่การงาน", keywords: "หน้าที่การงาน, ธุรกิจ, การค้าขาย, ความรับผิดชอบ", sampleQuestion: "ถามเรื่องการงานและธุรกิจ: งานที่ดำเนินอยู่หรือการเจรจาจะสำเร็จลุล่วงไหม?" },
  { id: "children", bhava: "ปุตตะ", name: "บุตร / บริวาร / คนหาย", color: "#EC4899", category: "บุตรบริวารและการเริ่มต้น", keywords: "บุตรหลาน, บริวาร, คนหาย, สัตว์เลี้ยง, โครงการใหม่", sampleQuestion: "ถามเรื่องบุตรบริวารหรือคนหาย: คน/สิ่งของที่ตามหาจะพบเจอหรือไม่?" },
  { id: "family", bhava: "พันธุ", name: "บ้าน / รถยนต์ / ครอบครัว", color: "#10B981", category: "หลักทรัพย์และครอบครัว", keywords: "ที่อยู่อาศัย, ที่ดิน, รถยนต์, ครอบครัว, ของหายในบ้าน", sampleQuestion: "ถามเรื่องบ้านและครอบครัว: เรื่องที่ดิน ยานพาหนะ หรือคนในบ้านจะเป็นอย่างไร?" },
  { id: "partner", bhava: "ปัตนิ", name: "คู่ครอง / ความรัก / หุ้นส่วน", color: "#F43F5E", category: "คู่ครองและสัญญา", keywords: "คนรัก, คู่ครอง, หุ้นส่วนธุรกิจ, สัญญาผูกพัน", sampleQuestion: "ถามเรื่องคู่ครองและหุ้นส่วน: ความสัมพันธ์หรือสัญญาข้อตกลงจะราบรื่นไหม?" },
  { id: "fortune", bhava: "ลาภะ", name: "โชคลาภ / ผลกำไร / สมหวัง", color: "#FBBF24", category: "โชคลาภและความสำเร็จ", keywords: "โชคลาภ, ลาภผล, เงินก้อน, ผลตอบแทน", sampleQuestion: "ถามเรื่องโชคลาภ: จะมีลาภลอยหรือความสำเร็จสมหวังเข้ามาไหม?" },
  { id: "success", bhava: "ศุภะ", name: "ความสำเร็จ / ผู้ใหญ่เมตตา", color: "#A855F7", category: "ความสำเร็จและมงคล", keywords: "ความสำเร็จ, ผู้ใหญ่สนับสนุน, การศึกษา, ต่างประเทศ", sampleQuestion: "ถามเรื่องความสำเร็จ: ผู้ใหญ่จะเมตตาช่วยเหลือและสนับสนุนไหม?" },
  { id: "lost", bhava: "มรณะ", name: "ของหาย / สูญเสีย / ต่างแดน", color: "#94A3B8", category: "ความสูญเสียและต่างแดน", keywords: "ของหาย, คนพลัดพราก, สิ่งเก่า, มรดก, แดนไกล", sampleQuestion: "ถามเรื่องของหายหรือการสูญเสีย: ของที่สูญหายจะได้คืนไหมหรือตกหล่นที่ใด?" },
  { id: "obstacle", bhava: "อริ", name: "อุปสรรค / ศัตรู / คดีความ", color: "#FB7185", category: "ปัญหาและคู่แข่ง", keywords: "ปัญหาเฉพาะหน้า, หนี้สิน, ศัตรูคู่แข่ง, คดีความ", sampleQuestion: "ถามเรื่องอุปสรรคและข้อพิพาท: ปัญหาติดขัดหรือคู่แข่งจะคลี่คลายอย่างไร?" },
  { id: "secret", bhava: "วินาศ", name: "เรื่องลับ / ซ่อนเร้น / ที่ลับตา", color: "#818CF8", category: "สิ่งลี้ลับและเบื้องหลัง", keywords: "ความลับ, เบื้องหลัง, ตกหล่นในที่ลับตา, เรื่องคาดไม่ถึง", sampleQuestion: "ถามเรื่องที่ปิดบังซ่อนเร้น: มีสิ่งใดซ่อนเร้นอยู่เบื้องหลัง หรือตกหล่นในที่ลับตาไหม?" },
  { id: "negotiation", bhava: "สหัชชะ", name: "การเจรจา / มิตรสหาย / ติดต่อ", color: "#2DD4BF", category: "การสื่อสารและมิตรภาพ", keywords: "การติดต่อสื่อสาร, การเดินทางใกล้, มิตรสหาย, การนัดหมาย", sampleQuestion: "ถามเรื่องการเจรจาและมิตรสหาย: การติดต่อสื่อสารและการเดินทางจะราบรื่นไหม?" },
  { id: "self", bhava: "ตนุ", name: "ตนเอง / สุขภาพ / การตัดสินใจ", color: "#C6A96B", category: "ตัวตนและการตัดสินใจ", keywords: "สุขภาพกาย-ใจ, ความเป็นอยู่, การกระทำส่วนตัว", sampleQuestion: "ถามเรื่องตนเองและการตัดสินใจ: สิ่งที่กำลังตัดสินใจควรเดินหน้าอย่างไร?" },
];

function TwoStageBhavaPredictor({
  result,
  onAskAI,
}: {
  result: HoraTaynooResult;
  onAskAI: (prompt: string) => void;
}) {
  const [selectedBhava, setSelectedBhava] = useState<string>("กดุมภะ");

  const currentCategory = BHAVA_QUESTION_CATEGORIES.find(c => c.bhava === selectedBhava) ?? BHAVA_QUESTION_CATEGORIES[0];

  // ── 1. Origin Bhava Calculation ──
  const originZodiacEntry = Object.entries(result.bhavaMap).find(([_, name]) => name === selectedBhava);
  const originZodiacIndex = originZodiacEntry ? Number(originZodiacEntry[0]) : 0;
  const originZodiac = ZODIAC_ORDER[originZodiacIndex];

  // Ruling Planet
  const rulingPlanetNum = KASTERN_FIXED[originZodiacIndex];
  const rulingPlanetInfo = PLANET_INFO[rulingPlanetNum];

  // Planets currently floating in origin zodiac
  const originFloatingPlanets = result.planetEntries.filter(
    p => p.zodiacIndex === originZodiacIndex && !p.isLagna
  );

  // ── 2. Destination Bhava Calculation (Two-Stage Link) ──
  const rulingPlanetEntry = result.planetEntries.find(p => p.planetNum === rulingPlanetNum);
  const destZodiacIndex = rulingPlanetEntry ? rulingPlanetEntry.zodiacIndex : originZodiacIndex;
  const destZodiac = ZODIAC_ORDER[destZodiacIndex];
  const destBhavaName = result.bhavaMap[destZodiacIndex] ?? "ตนุ";

  // Planet status at destination
  const planetStatus = rulingPlanetEntry?.status ?? null;
  const STATUS_THAI: Record<string, { label: string; glyph: string; color: string }> = {
    "maha-uccj": { label: "มหาอุจจ์ (กำลังสูงสุด)", glyph: "✿", color: "#22C55E" },
    "kaset": { label: "เกษตร (มั่นคงเข้มแข็ง)", glyph: "△", color: "#EF4444" },
    "racha-chok": { label: "ราชาโชค (นิยมโชคลาภ)", glyph: "⬡", color: "#3B82F6" },
    "maha-chakr": { label: "มหาจักร (รุ่งโรจน์ยิ่งใหญ่)", glyph: "□", color: "#EAB308" },
    "pra": { label: "ประ (อ่อนกำลัง)", glyph: "○", color: "#F97316" },
    "nij": { label: "นิจ (ตกต่ำด้อยค่า)", glyph: "✳", color: "#EF4444" },
  };
  const statusInfo = planetStatus ? (STATUS_THAI[planetStatus] ?? { label: "มาตรฐานปกติ", glyph: "✦", color: "#C6A96B" }) : { label: "มาตรฐานปกติ", glyph: "✦", color: "#C6A96B" };

  // Co-occupying planets in destination
  const destCoPlanets = result.planetEntries.filter(
    p => p.zodiacIndex === destZodiacIndex && p.planetNum !== rulingPlanetNum && !p.isLagna
  );

  // ── 3. Synthetic Astrological Reading ──
  const getSynthesis = () => {
    let verdict = "";
    let indicator: "good" | "warning" | "neutral" = "good";
    let indicatorText = "เกณฑ์ดีเยี่ยม / มีผลสำเร็จสมหวัง";
    let advice = "";

    if (destBhavaName === "ลาภะ") {
      indicator = "good";
      indicatorText = "เกณฑ์ดีมาก • ได้ลาภผลสำเร็จ";
      verdict = `ดาวเจ้าเรือน${selectedBhava} (ดาว ${rulingPlanetInfo?.thai ?? rulingPlanetNum}) จรเข้าสู่ "ภพลาภะ" บ่งชี้ถึงผลลัพธ์ที่ให้คุณสูงยิ่ง เรื่องที่ถามมีเกณฑ์สำเร็จสมหวัง ได้รับผลประโยชน์ ผลกำไร หรือมีโชคลาภเข้ามาเกื้อหนุนอย่างน่าพึงพอใจ`;
      advice = `เหมาะแก่การเจรจา ปิดการขาย ทวงถามผลประโยชน์ หรือเดินหน้าอย่างเต็มที่ จะได้รับผลตอบแทนคุ้มค่า`;
    } else if (destBhavaName === "ศุภะ") {
      indicator = "good";
      indicatorText = "เกณฑ์ดีมาก • ผู้ใหญ่เมตตาอุปถัมภ์";
      verdict = `ดาวเจ้าเรือน${selectedBhava} จรเข้าสู่ "ภพศุภะ" บ่งชี้ถึงความเจริญก้าวหน้า มีผู้ใหญ่ ครูบาอาจารย์ หรือโอกาสดีคอยช่วยเหลือ เรื่องที่ดำเนินอยู่จะราบรื่นและนำมาซึ่งชื่อเสียงเกียรติยศ`;
      advice = `เข้าหาผู้ใหญ่ ขอคำปรึกษา หรืออาศัยความซื่อสัตย์สุจริตเป็นที่ตั้ง จะได้รับความร่วมมือเป็นอย่างดี`;
    } else if (destBhavaName === "กัมมะ") {
      indicator = "neutral";
      indicatorText = "เกณฑ์ปานกลาง • ต้องลงมือทำจริงจัง";
      verdict = `ดาวเจ้าเรือน${selectedBhava} จรเข้าสู่ "ภพกัมมะ" บ่งบอกว่าเรื่องนี้ขึ้นอยู่กับการลงมือทำ ความรับผิดชอบ และความต่อเนื่อง ผลลัพธ์จะตามมาด้วยความพยายาม`;
      advice = `วางแผนการทำงานให้ชัดเจน ติดตามงานอย่างใกล้ชิด อย่าปล่อยให้ล่าช้า`;
    } else if (destBhavaName === "กดุมภะ") {
      indicator = "good";
      indicatorText = "เกณฑ์ดี • ส่งผลต่อทรัพย์สินเงินทอง";
      verdict = `ดาวเจ้าเรือน${selectedBhava} จรเข้าสู่ "ภพกดุมภะ" ชี้ชัดว่าเรื่องนี้จะนำมาซึ่งความมั่นคงทางการเงิน หรือได้ทรัพย์สินของมีค่ากลับคืนมา`;
      advice = `เน้นการบริหารจัดการเรื่องเงินทองและผลประโยชน์ให้รอบคอบ`;
    } else if (destBhavaName === "พันธุ") {
      indicator = "good";
      indicatorText = "เกณฑ์ดี • คนใกล้ชิด/ครอบครัวช่วย";
      verdict = `ดาวเจ้าเรือน${selectedBhava} จรเข้าสู่ "ภพพันธุ" สื่อถึงความเกี่ยวข้องกับคนในครอบครัว บ้าน หรือสถานที่เดิม หากตามหาของหรือบุคคล มีเกณฑ์พบในที่ใกล้ชิด`;
      advice = `ติดต่อสอบถามคนในบ้าน ญาติมิตร หรือค้นหาในสถานที่ที่คุ้นเคยเป็นอันดับแรก`;
    } else if (destBhavaName === "ปุตตะ") {
      indicator = "good";
      indicatorText = "เกณฑ์ดี • มีสิ่งใหม่/บริวารหนุน";
      verdict = `ดาวเจ้าเรือน${selectedBhava} จรเข้าสู่ "ภพปุตตะ" สื่อถึงการเริ่มต้นใหม่ ข่าวดีจากคนอายุน้อยกว่า หรือบริวารสัตว์เลี้ยงที่ให้คุณ`;
      advice = `เปิดรับแนวคิดใหม่ๆ และมอบหมายงานให้บริวารช่วยดูแล`;
    } else if (destBhavaName === "ปัตนิ") {
      indicator = "good";
      indicatorText = "เกณฑ์ดี • หุ้นส่วน/คู่ครองมีส่วนสำคัญ";
      verdict = `ดาวเจ้าเรือน${selectedBhava} จรเข้าสู่ "ภพปัตนิ" ชี้ถึงความร่วมมือจากคู่ครอง หุ้นส่วน หรือคู่ค้าภายนอกที่จะเป็นกุญแจสำคัญสู่ความสำเร็จ`;
      advice = `ประสานงานอย่างเปิดเผยและให้เกียรติซึ่งกันและกัน`;
    } else if (destBhavaName === "สหัชชะ") {
      indicator = "good";
      indicatorText = "เกณฑ์ดี • การสื่อสาร/เพื่อนฝูงนำทาง";
      verdict = `ดาวเจ้าเรือน${selectedBhava} จรเข้าสู่ "ภพสหัชชะ" การติดต่อสื่อสาร มิตรสหาย และการเดินทางใกล้จะนำพาคำตอบหรือทางออกที่ดีมาให้`;
      advice = `ใช้การโทรศัพท์ สอบถาม หรือเดินทางไปดูด้วยตนเอง`;
    } else if (destBhavaName === "ตนุ") {
      indicator = "good";
      indicatorText = "เกณฑ์ดี • ขึ้นอยู่กับตนเองโดยตรง";
      verdict = `ดาวเจ้าเรือน${selectedBhava} จรกลับมาสถิต "ภพตนุ" (กุมลัคนา) เรื่องนี้จะสำเร็จหรือไม่ขึ้นอยู่กับการตัดสินใจและความเด็ดขาดของคุณเอง`;
      advice = `มั่นใจในการตัดสินใจของตนเองและลงมือทำอย่างตั้งใจ`;
    } else if (destBhavaName === "อริ") {
      indicator = "warning";
      indicatorText = "เกณฑ์ระวัง • มีอุปสรรคหรือข้อขัดแย้ง";
      verdict = `ดาวเจ้าเรือน${selectedBhava} จรตก "ภพอริ" บ่งชี้ว่าเรื่องนี้อาจมีอุปสรรค มีคู่แข่ง หรือมีข้อขัดแย้งแทรกซ้อน ต้องใช้ความอดทนและระมัดระวัง`;
      advice = `ตรวจสอบสัญญาและหลักฐานให้รัดกุม หลีกเลี่ยงการปะทะอารมณ์`;
    } else if (destBhavaName === "มรณะ") {
      indicator = "warning";
      indicatorText = "เกณฑ์ระวัง • ความสูญเสีย/แดนไกล";
      verdict = `ดาวเจ้าเรือน${selectedBhava} จรตก "ภพมรณะ" บ่งชี้ถึงการเปลี่ยนแปลง การพลัดพราก หรือความไม่แน่นอน หากตามหาของหายมักสูญหายไปไกลหรือต้องใช้เวลา`;
      advice = `เตรียมแผนสำรอง และอย่าเพิ่งรีบร้อนตัดสินใจเรื่องสำคัญ`;
    } else if (destBhavaName === "วินาศ") {
      indicator = "warning";
      indicatorText = "เกณฑ์ระวัง • สิ่งปิดบัง/ที่ลับตา";
      verdict = `ดาวเจ้าเรือน${selectedBhava} จรตก "ภพวินาศ" บ่งบอกว่ามีเรื่องปิดบัง ซ่อนเร้น หรืออยู่เบื้องหลัง หากเป็นของหายมีเกณฑ์ตกหล่นในมุมอับ/ที่ลับตา`;
      advice = `ตรวจดูในที่มิดชิด ซอกมุมลับตา หรือสอบถามผู้ที่อยู่เบื้องหลัง`;
    }

    return { verdict, indicator, indicatorText, advice };
  };

  const synthesis = getSynthesis();

  const handleAskAIWithTopic = () => {
    const prompt = `ขอคำพยากรณ์โหรทายหนู (ยามพรายกระซิบ) เรื่อง: "${currentCategory.name}"\n` +
      `- ภพตั้งต้นเรื่องคำถาม (จังหวะที่ ๑): ภพ${selectedBhava} (ราศี${originZodiac?.name}) ดาวเจ้าเรือนเกษตรคือ ดาว ${rulingPlanetNum} (${rulingPlanetInfo?.thai ?? rulingPlanetNum})\n` +
      `- ภพปลายทางที่ดาวจรไปสถิต (จังหวะที่ ๒): ภพ${destBhavaName} (ราศี${destZodiac?.name}) ได้มาตรฐาน "${statusInfo.label}"\n` +
      `- คำถามเจาะจง: ${currentCategory.sampleQuestion}\n` +
      `กรุณาพยากรณ์ตามหลักโหรทายหนูโบราณอย่างละเอียด ชี้แนะทิศทาง ผลลัพธ์ และข้อควรปฏิบัติเฉพาะหน้า`;
    onAskAI(prompt);
  };

  return (
    <div className="border border-[#C6A96B]/30 bg-gradient-to-b from-[#07132b] to-[#040a18] backdrop-blur-md rounded-2xl p-5 sm:p-7 shadow-xl shadow-black/60 space-y-5 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#C6A96B]/20 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#C6A96B]/30 bg-[#C6A96B]/10 text-[#C6A96B] text-[10.5px] font-bold tracking-[0.2em] uppercase font-display mb-1.5">
            ✦ โหรทายหนู · อ่านดาว ๒ จังหวะ ✦
          </div>
          <h2 className="text-lg sm:text-xl font-display font-bold text-[#F8F6F1]">
            พยากรณ์เจาะลึกเรื่องที่ถาม (เชื่อมโยง ๒ ภพ)
          </h2>
          <p className="text-xs text-[#D9CDB7]/80 mt-0.5">
            เลือกเรื่องที่ต้องการสอบถาม เพื่อเชื่อมโยงดาวเจ้าเรือนจากภพคำถาม ➔ ไปยังภพที่ดาวจรไปสถิต
          </p>
        </div>
      </div>

      {/* Bhava Selector Chips */}
      <div>
        <label className="block text-[11px] font-bold text-[#C6A96B] uppercase tracking-wider mb-2.5 font-display">
          ๑. เลือกเรื่องหรือภพที่ต้องการถาม:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {BHAVA_QUESTION_CATEGORIES.map(cat => {
            const isSelected = selectedBhava === cat.bhava;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedBhava(cat.bhava)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  isSelected
                    ? "border-[#C6A96B] bg-[#C6A96B]/20 text-[#F8F6F1] shadow-md shadow-[#C6A96B]/20 ring-1 ring-[#C6A96B]/40"
                    : "border-white/10 bg-[#091838]/50 text-[#D9CDB7] hover:border-[#C6A96B]/40 hover:text-[#F8F6F1]"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                    isSelected
                      ? "bg-[#C6A96B]/25 border-[#C6A96B]/60 shadow-inner"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <BhavaSymbol bhava={cat.bhava} className="w-4 h-4" color={isSelected ? "#F8F6F1" : cat.color} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold font-display text-[#C6A96B]">{cat.bhava}</span>
                  </div>
                  <p className="text-[10px] text-[#D9CDB7]/80 truncate">{cat.name.split('/')[0]}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two-Stage Visual Flow */}
      <div className="bg-[#091838]/70 border border-[#C6A96B]/20 rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#C6A96B] uppercase tracking-wider font-display">
            ๒. การเชื่อมโยงเส้นทางดาว (๒ จังหวะ):
          </span>
          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
            synthesis.indicator === "good" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
            synthesis.indicator === "warning" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
            "bg-blue-500/10 text-blue-400 border-blue-500/30"
          }`}>
            {synthesis.indicatorText}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
          {/* Stage 1: Origin Card */}
          <div className="md:col-span-5 rounded-xl border border-[#C6A96B]/30 bg-[#07132b] p-4 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#C6A96B] font-bold font-display uppercase tracking-wider">
                จังหวะที่ ๑: ภพตั้งต้นเรื่องที่ถาม
              </span>
              <span className="text-[10px] text-[#D9CDB7] font-mono">ราศี{originZodiac?.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-inner"
                style={{
                  background: `${currentCategory.color}18`,
                  borderColor: `${currentCategory.color}45`,
                }}
              >
                <BhavaSymbol bhava={selectedBhava} className="w-6 h-6" color={currentCategory.color} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#F8F6F1] font-display">
                  ภพ{selectedBhava} ({currentCategory.name})
                </p>
                <p className="text-[11px] text-[#D9BC82] mt-0.5">
                  ดาวเจ้าเรือนเกษตร: <b className="text-[#F8F6F1]">ดาว {rulingPlanetNum} ({rulingPlanetInfo?.thai ?? rulingPlanetNum})</b>
                </p>
              </div>
            </div>
            {originFloatingPlanets.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center gap-1.5 text-[10px] text-[#D9CDB7]">
                <span>ดาวลอยในภพนี้:</span>
                {originFloatingPlanets.map((p, idx) => (
                  <span key={idx} className="font-serif font-bold text-[#C6A96B]">ดาว {p.labelThai}</span>
                ))}
              </div>
            )}
          </div>

          {/* Transition Arrow */}
          <div className="md:col-span-1 flex flex-col items-center justify-center py-1">
            <div className="w-8 h-8 rounded-full bg-[#C6A96B]/15 border border-[#C6A96B]/40 flex items-center justify-center text-[#C6A96B] font-bold shadow-md shadow-[#C6A96B]/20">
              ➔
            </div>
            <span className="text-[8.5px] text-[#C6A96B] font-mono mt-1 text-center">ดาว {rulingPlanetNum} จรไป</span>
          </div>

          {/* Stage 2: Destination Card */}
          <div className="md:col-span-5 rounded-xl border border-[#C6A96B]/30 bg-[#07132b] p-4 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#C6A96B] font-bold font-display uppercase tracking-wider">
                จังหวะที่ ๒: ภพปลายทางผลลัพธ์
              </span>
              <span className="text-[10px] text-[#D9CDB7] font-mono">ราศี{destZodiac?.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold font-serif shrink-0 border"
                style={{
                  background: `${statusInfo.color}15`,
                  borderColor: `${statusInfo.color}40`,
                  color: statusInfo.color,
                }}
              >
                {rulingPlanetNum}
              </div>
              <div>
                <p className="text-sm font-bold text-[#F8F6F1] font-display">
                  ภพ{destBhavaName}
                </p>
                <p className="text-[11px] font-medium" style={{ color: statusInfo.color }}>
                  มาตรฐาน: {statusInfo.label}
                </p>
              </div>
            </div>
            {destCoPlanets.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center gap-1.5 text-[10px] text-[#D9CDB7]">
                <span>ดาวร่วมเรือน:</span>
                {destCoPlanets.map((p, idx) => (
                  <span key={idx} className="font-serif font-bold text-[#F8F6F1]">ดาว {p.labelThai}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Synthetic Astrological Verdict Box */}
        <div className="rounded-xl border border-[#C6A96B]/25 bg-[#07132b]/90 p-4 space-y-2 text-left">
          <div className="flex items-center gap-2">
            <span className="text-[#C6A96B] text-xs">✦</span>
            <p className="text-xs font-bold text-[#C6A96B] uppercase tracking-wide font-display">
              คำพยากรณ์สังเคราะห์ (ตามหลักโหรทายหนูโบราณ):
            </p>
          </div>
          <p className="text-xs sm:text-sm text-[#F8F6F1] leading-relaxed">
            {synthesis.verdict}
          </p>
          <div className="pt-2 border-t border-white/5 text-[11px] text-[#D9CDB7]/90 flex items-start gap-1.5">
            <span className="text-[#C6A96B] font-bold shrink-0">💡 ข้อแนะนำ:</span>
            <span>{synthesis.advice}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[10px] text-[#D9CDB7]/70 italic">
            คำถามตัวอย่าง: "{currentCategory.sampleQuestion}"
          </p>
          <button
            type="button"
            onClick={handleAskAIWithTopic}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs border border-[#C6A96B]/50 bg-gradient-to-r from-[#C6A96B]/25 to-[#D9BC82]/30 text-[#F8F6F1] hover:from-[#C6A96B]/35 hover:to-[#D9BC82]/40 active:scale-95 transition-all shadow-md shadow-[#C6A96B]/15 flex items-center justify-center gap-2 font-display cursor-pointer"
          >
            <span>✦ ถามโหรพรายกระซิบ AI เจาะลึกเรื่องนี้ ✦</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PhraKrasibCalcTable({
  result,
  onAskAI,
}: {
  result: HoraTaynooResult;
  onAskAI?: (prompt: string) => void;
}) {
  const [nowMin, setNowMin] = useState(0);
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setNowMin(now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60);
      setTimeStr(now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  let activeSlot = result.subTimeSlots.find(slot => nowMin >= slot.startMin && nowMin < slot.endMin);
  if (!activeSlot) activeSlot = result.subTimeSlots[0];

  // Step X
  const xZIdx = activeSlot.zodiacIndex;
  const xBhava = result.bhavaMap[xZIdx] ?? "—";
  const xZodiac = ZODIAC_ORDER[xZIdx];
  const xPlanets = result.planetEntries.filter(p => p.zodiacIndex === xZIdx && !p.isLagna);

  // Step Y
  const xLord = KASTERN_FIXED[xZIdx];
  const xLordInfo = PLANET_INFO[xLord];
  const xLordEntry = result.planetEntries.find(p => p.planetNum === xLord);
  const yZIdx = xLordEntry ? xLordEntry.zodiacIndex : xZIdx;
  const yBhava = result.bhavaMap[yZIdx] ?? "—";
  const yZodiac = ZODIAC_ORDER[yZIdx];
  const yPlanets = result.planetEntries.filter(p => p.zodiacIndex === yZIdx && !p.isLagna);

  // Step Z
  const yLord = KASTERN_FIXED[yZIdx];
  const yLordInfo = PLANET_INFO[yLord];
  const yLordEntry = result.planetEntries.find(p => p.planetNum === yLord);
  const zZIdx = yLordEntry ? yLordEntry.zodiacIndex : yZIdx;
  const zBhava = result.bhavaMap[zZIdx] ?? "—";
  const zZodiac = ZODIAC_ORDER[zZIdx];
  const zPlanets = result.planetEntries.filter(p => p.zodiacIndex === zZIdx && !p.isLagna);

  const STATUS_GLYPHS_SIMPLE: Record<string, string> = {
    'maha-uccj': '✿',
    'kaset': '△',
    'racha-chok': '⬡',
    'maha-chakr': '□',
    'pra': '○',
    'nij': '✳',
  };

  const renderPlanets = (planets: PlanetEntry[]) => {
    if (planets.length === 0) return <span className="text-[#D9CDB7]/40">—</span>;
    return (
      <div className="flex justify-center gap-1.5 flex-wrap">
        {planets.map((p, idx) => {
          const glyph = p.status ? (STATUS_GLYPHS_SIMPLE[p.status] ?? "") : "";
          const statusColors: Record<string, string> = {
            'maha-uccj': '#22C55E', 'kaset': '#EF4444',
            'racha-chok': '#3B82F6', 'maha-chakr': '#EAB308',
            'pra': '#EF4444', 'nij': '#EF4444'
          };
          const color = p.status ? statusColors[p.status] : '#F8F6F1';
          return (
            <span key={idx} className="font-serif font-bold text-sm" style={{ color }}>
              {p.labelThai}
              {glyph && <span className="text-[10px] ml-0.5" style={{ color }}>{glyph}</span>}
            </span>
          );
        })}
      </div>
    );
  };

  const handleAskTimeAI = () => {
    const prompt = `ขอคำพยากรณ์โหรทายหนู (ยามพรายกระซิบ) ตามเวลาเกิดเหตุ (${timeStr} น. / ยามย่อย ${activeSlot.startStr}-${activeSlot.endStr} น.):\n` +
      `- สมการจุดพยากรณ์: X (${xBhava} ราศี${xZodiac?.name}) ➔ Y (${yBhava} ราศี${yZodiac?.name}) ➔ Z (${zBhava} ราศี${zZodiac?.name})\n` +
      `- ดาวนำทาง: ดาวเกษตรเจ้าเรือน X (ดาว ${xLord} ${xLordInfo?.thai}) จรไป Y, ดาวเกษตรเจ้าเรือน Y (ดาว ${yLord} ${yLordInfo?.thai}) จรไป Z\n` +
      `กรุณาพยากรณ์ทิศทางของเหตุการณ์เฉพาะหน้าตามสมการจุดพยากรณ์นี้อย่างละเอียด`;
    onAskAI?.(prompt);
  };

  return (
    <div className="border border-[#C6A96B]/30 bg-gradient-to-b from-[#07132b] to-[#040a18] backdrop-blur-md rounded-2xl p-5 sm:p-7 shadow-xl shadow-black/60 space-y-5 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#C6A96B]/20 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#C6A96B]/30 bg-[#C6A96B]/10 text-[#C6A96B] text-[10.5px] font-bold tracking-[0.2em] uppercase font-display mb-1.5">
            ✦ โหรทายหนู · ยามพรายกระซิบ ✦
          </div>
          <h2 className="text-lg sm:text-xl font-display font-bold text-[#F8F6F1]">
            พยากรณ์ตามเวลาที่เกิดเหตุ (สมการจุดพยากรณ์ X ➔ Y ➔ Z)
          </h2>
          <p className="text-xs text-[#D9CDB7]/80 mt-0.5">
            คำนวณตามเวลาจริงที่เกิดเรื่อง (ยามย่อย 7.5 นาที) เพื่อถอดรหัสสมการลูกโซ่ ๓ จุดพยากรณ์
          </p>
        </div>
        <div className="text-right font-mono text-xs text-[#C6A96B] font-bold shrink-0">
          เวลาขณะนี้: {timeStr} น.
        </div>
      </div>

      {/* 3 Step Equation Flow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Step X */}
        <div className="rounded-xl border border-[#C6A96B]/30 bg-[#07132b] p-4 shadow-inner">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[#C6A96B] font-bold font-display uppercase">จุดพยากรณ์แรก (X)</span>
            <span className="text-[10px] text-[#D9CDB7] font-mono">{activeSlot.startStr}-{activeSlot.endStr}</span>
          </div>
          <p className="text-base font-bold text-[#F8F6F1] font-display">ภพ{xBhava} (ราศี{xZodiac?.name})</p>
          <p className="text-xs text-[#D9BC82] mt-1">ดาวเจ้าเรือน: <b>ดาว {xLord} ({xLordInfo?.thai})</b></p>
          <div className="mt-2 pt-2 border-t border-white/5 text-[11px] text-[#D9CDB7]">
            ดาวลอย: {renderPlanets(xPlanets)}
          </div>
        </div>

        {/* Step Y */}
        <div className="rounded-xl border border-[#C6A96B]/30 bg-[#07132b] p-4 shadow-inner">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[#C6A96B] font-bold font-display uppercase">จุดพยากรณ์สอง (Y)</span>
            <span className="text-[10px] text-[#C6A96B] font-mono">ดาว {xLord} จรไป</span>
          </div>
          <p className="text-base font-bold text-[#F8F6F1] font-display">ภพ{yBhava} (ราศี{yZodiac?.name})</p>
          <p className="text-xs text-[#D9BC82] mt-1">ดาวเจ้าเรือน: <b>ดาว {yLord} ({yLordInfo?.thai})</b></p>
          <div className="mt-2 pt-2 border-t border-white/5 text-[11px] text-[#D9CDB7]">
            ดาวลอย: {renderPlanets(yPlanets)}
          </div>
        </div>

        {/* Step Z */}
        <div className="rounded-xl border border-[#C6A96B]/30 bg-[#07132b] p-4 shadow-inner">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[#C6A96B] font-bold font-display uppercase">จุดพยากรณ์สาม (Z)</span>
            <span className="text-[10px] text-[#C6A96B] font-mono">ดาว {yLord} จรไป</span>
          </div>
          <p className="text-base font-bold text-[#F8F6F1] font-display">ภพ{zBhava} (ราศี{zZodiac?.name})</p>
          <p className="text-xs text-[#D9BC82] mt-1">ผลลัพธ์ปลายทาง</p>
          <div className="mt-2 pt-2 border-t border-white/5 text-[11px] text-[#D9CDB7]">
            ดาวลอย: {renderPlanets(zPlanets)}
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="overflow-x-auto rounded-xl border border-[#C6A96B]/20 bg-[#091838]/60 p-2">
        <table className="w-full text-center border-collapse">
          <thead>
            <tr className="border-b border-[#C6A96B]/20 text-[11px] text-[#C6A96B] font-bold">
              <th className="py-2.5 bg-[#C6A96B]/10 px-3 rounded-l-lg">เวลายามย่อย</th>
              <th className="py-2.5 bg-[#C6A96B]/10 px-3">X: {xBhava}</th>
              <th className="py-2.5 bg-[#C6A96B]/10 px-3">Y: {yBhava}</th>
              <th className="py-2.5 bg-[#C6A96B]/10 px-3 rounded-r-lg">Z: {zBhava}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-xs text-[#F8F6F1] font-semibold">
              <td className="py-3 font-mono text-[#D9CDB7]">{activeSlot.startStr} - {activeSlot.endStr} น.</td>
              <td className="py-3 font-serif text-sm text-[#F8F6F1]">{renderPlanets(xPlanets)}</td>
              <td className="py-3 font-serif text-sm text-[#F8F6F1]">{renderPlanets(yPlanets)}</td>
              <td className="py-3 font-serif text-sm text-[#F8F6F1]">{renderPlanets(zPlanets)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Action Button */}
      {onAskAI && (
        <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[10px] text-[#D9CDB7]/70 italic">
            สมการ: {xBhava} ➔ {yBhava} ➔ {zBhava} ณ เวลา {timeStr} น.
          </p>
          <button
            type="button"
            onClick={handleAskTimeAI}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs border border-[#C6A96B]/50 bg-gradient-to-r from-[#C6A96B]/25 to-[#D9BC82]/30 text-[#F8F6F1] hover:from-[#C6A96B]/35 hover:to-[#D9BC82]/40 active:scale-95 transition-all shadow-md shadow-[#C6A96B]/15 flex items-center justify-center gap-2 font-display cursor-pointer"
          >
            <span>✦ ถามโหรพรายกระซิบ AI ตามสมการเวลานี้ ✦</span>
          </button>
        </div>
      )}
    </div>
  );
}

function PlanetTable({ result }: { result: HoraTaynooResult }) {
  return (
    <Card className="border-[#C9A96E]/15 bg-slate-900/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-[#C9A96E] rounded-full" />
        <p className="text-[#C9A96E] text-[11px] uppercase tracking-widest font-bold">ดาวลอย 11 ดวง</p>
        <span className="ml-auto text-[10px] text-[#D9CDB7]">ลัคนา: {ZODIAC_ORDER[result.lagnaZodiacIndex]?.name}</span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {result.planetEntries.map((entry, i) => {
          const pInfo = entry.planetNum ? PLANET_INFO[entry.planetNum] : null;
          const color = pInfo?.color ?? (entry.isLagna ? "#6D8FC7" : "#F2D49B");
          const zodiac = ZODIAC_ORDER[entry.zodiacIndex];
          const bhava  = result.bhavaMap[entry.zodiacIndex] ?? "";
          return (
            <div key={i} className={`rounded-xl p-2 text-center border transition-all ${
              entry.isLagna
                ? "border-[#4B6FAE]/40 bg-[#4B6FAE]/10"
                : "border-white/5 bg-slate-950/20 hover:border-[#C9A96E]/20"
            }`}>
              <div className="font-display text-xl font-bold mb-0.5" style={{ color }}>
                {entry.labelThai}
              </div>
              <div className="text-[10px] text-[#D9CDB7] leading-tight">{zodiac?.name}</div>
              {bhava && (
                <div className="text-[9px] mt-0.5 font-medium" style={{ color: `${color}cc` }}>{bhava}</div>
              )}
              <div className="text-[9px] text-[#94A3B8] mt-0.5">{entry.steps}ก้าว</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function BhavaTable({ result }: { result: HoraTaynooResult }) {
  const goodBhava = new Set(["ตนุ","กฎุมภะ","ปุตตะ","ปัตนิ","ศุภะ","กัมมะ","ลาภะ"]);
  const badBhava  = new Set(["อริ","มรณะ","วินาศ"]);

  const bhavaOrder = BHAVA_NAMES.map(name => {
    const zIdx = Object.entries(result.bhavaMap).find(([,v]) => v === name)?.[0];
    const zodiacName = zIdx != null ? (ZODIAC_ORDER[Number(zIdx)]?.name ?? "—") : "—";
    const planets = zIdx != null ? result.planetEntries.filter(e => e.zodiacIndex === Number(zIdx)) : [];
    return { bhava: name, zodiacName, planets };
  });

  return (
    <Card className="border-[#C9A96E]/15 bg-slate-900/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-[#4B6FAE] rounded-full" />
        <p className="text-[#C9A96E] text-[11px] uppercase tracking-widest font-bold">ภพ 12 หลัง</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {bhavaOrder.map((b, i) => {
          const isGood = goodBhava.has(b.bhava);
          const isBad  = badBhava.has(b.bhava);
          return (
            <div key={i} className={`rounded-xl p-2.5 border ${
              isBad  ? "border-rose-500/20 bg-rose-950/10" :
              isGood && b.planets.length > 0 ? "border-emerald-500/20 bg-emerald-950/10" :
              "border-white/5 bg-slate-950/20"
            }`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  isBad ? "text-rose-400" : isGood ? "text-emerald-400" : "text-[#D9CDB7]"
                }`}>{i + 1}. {b.bhava}</span>
                {b.planets.length > 0 && (
                  <span className="text-[9px] text-[#C9A96E] font-bold">
                    {b.planets.map(p => p.labelThai).join(",")}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#F8F6F1] font-medium">{b.zodiacName}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SubTimePanel({ result, isLive }: { result: HoraTaynooResult; isLive: boolean }) {
  const now    = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  const STATUS_GLYPHS: Record<string, string> = {
    'maha-uccj': '✿',
    'kaset': '△',
    'racha-chok': '⬡',
    'maha-chakr': '□',
    'pra': '○',
    'nij': '✳',
  };

  return (
    <Card className="border-[#C9A96E]/15 bg-slate-900/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 bg-[#C9A96E] rounded-full ${isLive ? "animate-pulse" : ""}`} />
        <p className="text-[#C9A96E] text-[11px] uppercase tracking-widest font-bold font-display">ยามย่อย (7.5 นาที × 12)</p>
      </div>
      <div className="space-y-1.5">
        {result.subTimeSlots.map((slot, i) => {
          const isCurrent = isLive && nowMin >= slot.startMin && nowMin < slot.endMin;
          const planetsInSlot = result.planetEntries.filter(
            e => e.zodiacIndex === slot.zodiacIndex && e.planetNum !== null
          );
          return (
            <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
              isCurrent
                ? "bg-[#C9A96E]/15 border border-[#C9A96E]/30"
                : "border border-transparent hover:border-white/5 hover:bg-white/2"
            }`}>
              {isCurrent
                ? <span className="w-1.5 h-1.5 rounded-full bg-[#C9A96E] animate-pulse shrink-0" />
                : <span className="w-1.5 h-1.5 shrink-0" />
              }
              <span className="w-14 font-mono text-[11px] text-[#D9CDB7]">{slot.startStr}</span>
              <span className="w-20 font-medium text-[#F8F6F1]">{slot.zodiacName}</span>
              <span className={`w-16 font-bold ${
                ["ตนุ","ลาภะ","กัมมะ","ศุภะ"].includes(slot.bhavaName) ? "text-emerald-400" :
                ["อริ","มรณะ","วินาศ"].includes(slot.bhavaName)         ? "text-rose-400"    :
                "text-[#D9CDB7]"
              }`}>{slot.bhavaName}</span>

              <div className="flex-1 flex flex-wrap gap-1.5 items-center justify-end">
                {planetsInSlot.map((p, pIdx) => {
                  const glyph = p.status ? STATUS_GLYPHS[p.status] : '';
                  const statusColors: Record<string, string> = {
                    'maha-uccj': '#22C55E', 'kaset': '#EF4444',
                    'racha-chok': '#3B82F6', 'maha-chakr': '#EAB308',
                    'pra': '#EF4444', 'nij': '#EF4444'
                  };
                  const color = p.status ? statusColors[p.status] : '#C9A96E';
                  return (
                    <span key={pIdx} className="text-[11.5px] font-bold font-serif flex items-center gap-0.5" style={{ color }}>
                      {p.labelThai}
                      {glyph && <span className="text-[8.5px] font-sans font-bold">{glyph}</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Status Legend ────────────────────────────────────────────────────────────

function PlanetStatusLegend() {
  const statuses = [
    { glyph: '✿', char: 'มหาอุจจ์', color: '#22C55E', desc: 'กำลังสูงสุด' },
    { glyph: '△', char: 'เกษตร',   color: '#EF4444', desc: 'ความมั่นคง' },
    { glyph: '⬡', char: 'ราชาโชค', color: '#3B82F6', desc: 'โชคลาภนิยม' },
    { glyph: '□', char: 'มหาจักร',  color: '#EAB308', desc: 'ความรุ่งโรจน์' },
    { glyph: '○', char: 'ประ',    color: '#EF4444', desc: 'อ่อนกำลัง' },
    { glyph: '✳', char: 'นิจ',     color: '#EF4444', desc: 'ตกต่ำ' },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-4 border-t border-[#C9A96E]/10 mt-2">
      {statuses.map(s => (
        <div key={s.char} className="flex items-center gap-1.5">
          <span className="text-lg font-bold" style={{ color: s.color }}>{s.glyph}</span>
          <span className="text-[10px] text-[#F8F6F1] font-bold whitespace-nowrap">{s.char}</span>
          <span className="text-[9px] text-[#D9CDB7] hidden sm:inline">({s.desc})</span>
        </div>
      ))}
    </div>
  );
}

// ─── Success Yam Browser ──────────────────────────────────────────────────────

// ─── Grade helpers ────────────────────────────────────────────────────────────

const GRADE_COLOR: Record<string, string> = {
  A: "text-emerald-400 border-emerald-500/40 bg-emerald-950/30",
  B: "text-blue-400   border-blue-500/40   bg-blue-950/30",
  C: "text-amber-400  border-amber-500/40  bg-amber-950/30",
  D: "text-orange-400 border-orange-500/40 bg-orange-950/30",
  F: "text-rose-400   border-rose-500/40   bg-rose-950/30",
};

const GRADE_DOT: Record<string, string> = {
  A: "bg-emerald-400", B: "bg-blue-400", C: "bg-amber-400",
  D: "bg-orange-400",  F: "bg-rose-400",
};

// ─── Library Grid (112 ผัง จาก Supabase) ─────────────────────────────────────

function LibraryGrid({ library }: { library: YamLibraryRow[] }) {
  const [filterDay,    setFilterDay]    = useState<number | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<"day" | "night" | null>(null);
  const [filterGrade,  setFilterGrade]  = useState<string | null>(null);
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [formVals, setFormVals] = useState({ weekday: 0, period: "day" as "day"|"night", yamNo: 1 });

  const filtered = library.filter(row => {
    if (filterDay    !== null && row.weekday_num !== filterDay)    return false;
    if (filterPeriod !== null && row.period      !== filterPeriod) return false;
    if (filterGrade  !== null && row.grade       !== filterGrade)  return false;
    return true;
  });

  const handleSelect = (row: YamLibraryRow) => {
    setSelectedId(row.id);
    setFormVals({ weekday: row.weekday_num, period: row.period, yamNo: row.yam_no });
    setTimeout(() => formRef.current?.requestSubmit(), 50);
  };

  // Grade distribution
  const gradeCounts = library.reduce((acc, r) => {
    acc[r.grade] = (acc[r.grade] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Hidden submit form */}
      <Form method="post" ref={formRef}>
        <input type="hidden" name="mode"    value="success-yam" />
        <input type="hidden" name="weekday" value={formVals.weekday} />
        <input type="hidden" name="period"  value={formVals.period} />
        <input type="hidden" name="yamNo"   value={formVals.yamNo} />
      </Form>

      <Card className="border-[#C9A96E]/15 bg-slate-900/40 p-4">
        {/* Header + stats */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#C9A96E] rounded-full" />
            <p className="text-[#C9A96E] text-[11px] uppercase tracking-widest font-bold">
              ดวงยามสำเร็จ {filtered.length}/{library.length} ผัง
            </p>
          </div>
          {/* Grade legend */}
          <div className="flex gap-2 flex-wrap">
            {(["A","B","C","D","F"] as const).map(g => (
              <button key={g} type="button"
                onClick={() => setFilterGrade(filterGrade === g ? null : g)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                  filterGrade === g
                    ? GRADE_COLOR[g]
                    : "border-white/10 text-[#D9CDB7] hover:border-white/20"
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${GRADE_DOT[g]}`} />
                {g} ({gradeCounts[g] ?? 0})
              </button>
            ))}
          </div>
        </div>

        {/* Day filter */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button type="button"
            onClick={() => setFilterDay(null)}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
              filterDay === null
                ? "border-[#C9A96E]/50 bg-[#C9A96E]/10 text-[#C9A96E]"
                : "border-white/10 text-[#D9CDB7] hover:border-white/20"
            }`}>ทั้งหมด</button>
          {DAY_NAMES_TH.map((name, i) => (
            <button key={i} type="button"
              onClick={() => setFilterDay(filterDay === i ? null : i)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                filterDay === i
                  ? "border-[#C9A96E]/50 text-[#C9A96E]"
                  : "border-white/10 text-[#D9CDB7] hover:border-white/20 hover:text-[#F8F6F1]"
              }`}
              style={filterDay === i ? { background: `${DAY_COLORS[i]}20` } : {}}>
              {name}
            </button>
          ))}
        </div>

        {/* Period filter */}
        <div className="flex gap-2 mb-4">
          {([null, "day", "night"] as const).map(p => (
            <button key={String(p)} type="button"
              onClick={() => setFilterPeriod(p)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                filterPeriod === p
                  ? "bg-[#4B6FAE]/15 border-[#4B6FAE]/40 text-[#4B6FAE]"
                  : "border-white/8 text-[#D9CDB7] hover:border-white/15"
              }`}>
              {p === null ? "ทั้งวัน" : p === "day" ? "☀ กลางวัน" : "☽ กลางคืน"}
            </button>
          ))}
        </div>

        {/* Grid */}
        {library.length === 0 ? (
          <div className="text-center py-10 text-[#D9CDB7] text-sm">
            ไม่พบข้อมูล — กรุณา Seed ที่ /admin/seed-yam ก่อน
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
            {filtered.map(row => {
              const isSelected = selectedId === row.id;
              const gc = GRADE_COLOR[row.grade] ?? "";
              return (
                <button key={row.id} type="button"
                  onClick={() => handleSelect(row)}
                  className={`rounded-xl p-2.5 border text-left transition-all hover:scale-[1.02] active:scale-95 ${
                    isSelected
                      ? `${gc} shadow-lg`
                      : "border-white/8 bg-slate-950/30 hover:border-[#C9A96E]/25"
                  }`}>
                  {/* Grade badge */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-display font-bold ${
                      isSelected ? "" : (GRADE_COLOR[row.grade]?.split(" ")[0] ?? "text-[#D9CDB7]")
                    }`}>{row.grade}</span>
                    <span className="text-[10px] text-[#D9CDB7]/80 font-mono">
                      {row.period === "day" ? "☀" : "☽"}{row.yam_no}
                    </span>
                  </div>
                  {/* Day name */}
                  <p className="text-[10px] font-bold text-[#F8F6F1] leading-tight truncate">
                    {row.weekday_name_th}
                  </p>
                  {/* Time */}
                  <p className="text-[9px] text-[#D9CDB7] font-mono mt-0.5 leading-tight">
                    {row.start_time}
                  </p>
                  {/* Lagna */}
                  {row.lagna_zodiac_name && (
                    <p className="text-[9px] text-[#C9A96E] mt-0.5 truncate leading-tight">
                      {row.lagna_zodiac_name}
                    </p>
                  )}
                  {/* Score bar */}
                  <div className="mt-2 h-0.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${GRADE_DOT[row.grade] ?? "bg-white/20"}`}
                      style={{ width: `${row.overall_score ?? 0}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[#D9CDB7]/80 mt-0.5 text-right font-medium">{row.overall_score}</p>
                </button>
              );
            })}
          </div>
        )}

        {filtered.length === 0 && library.length > 0 && (
          <p className="text-center text-[#D9CDB7] text-sm py-8">ไม่มีผังที่ตรงกับ filter</p>
        )}
      </Card>
    </div>
  );
}

function CustomTimeForm() {
  const now = new Date();
  return (
    <Card className="border-[#C9A96E]/15 bg-slate-900/40 p-5">
      <p className="text-[#C9A96E] text-[11px] uppercase tracking-widest font-bold mb-4">ตั้งเวลาเอง</p>
      <Form method="post" className="grid grid-cols-2 sm:flex sm:flex-wrap items-end gap-3">
        <input type="hidden" name="mode" value="custom" />
        {[
          { name: "day",   label: "วัน",     placeholder: String(now.getDate()),           w: "w-full sm:w-16" },
          { name: "month", label: "เดือน",    placeholder: String(now.getMonth() + 1),     w: "w-full sm:w-16" },
          { name: "year",  label: "ปี พ.ศ.", placeholder: String(now.getFullYear() + 543),  w: "w-full sm:w-24" },
        ].map(f => (
          <div key={f.name}>
            <label className="text-[10px] text-[#D9CDB7] uppercase tracking-wider mb-1 block">{f.label}</label>
            <input name={f.name} type="number" placeholder={f.placeholder}
              className={`${f.w} bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F8F6F1] focus:outline-none focus:border-[#C9A96E]/40`} />
          </div>
        ))}
        <div>
          <label className="text-[10px] text-[#D9CDB7] uppercase tracking-wider mb-1 block">เวลา</label>
          <input name="time" type="time"
            defaultValue={`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`}
            className="w-full sm:w-32 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F8F6F1] focus:outline-none focus:border-[#C9A96E]/40" />
        </div>
        <Button type="submit" className="self-end">คำนวณ</Button>
      </Form>
    </Card>
  );
}

function LiveClock({ serverTime }: { serverTime: string }) {
  const [t, setT] = useState(new Date(serverTime));
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const fmt = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="font-mono text-[#C9A96E] text-sm font-bold tabular-nums">
      {fmt(t.getHours())}:{fmt(t.getMinutes())}:{fmt(t.getSeconds())}
    </span>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────

const QUESTION_CATEGORIES = [
  {
    key: "work",
    label: "กัมมะ · การงาน",
    questions: [
      "งานที่ทำอยู่จะสำเร็จลุล่วงไหม?",
      "วันนี้เหมาะกับการเจรจาธุรกิจไหม?",
      "ควรนำเสนองานตอนนี้หรือรอก่อน?",
      "โปรเจกต์ที่รอผลอยู่จะได้รับการอนุมัติไหม?",
      "การเปลี่ยนงานตอนนี้เป็นทางที่ดีไหม?",
    ],
  },
  {
    key: "money",
    label: "กดุมภะ · การเงิน",
    questions: [
      "การเงินช่วงนี้ไหลเข้าหรือไหลออก?",
      "วันนี้เหมาะกับการลงทุนไหม?",
      "ควรจ่ายเงินก้อนใหญ่ตอนนี้หรือเปล่า?",
      "โชคลาภจากภายนอกจะเข้ามาไหม?",
      "หนี้สินหรือปัญหาการเงินจะคลี่คลายไหม?",
    ],
  },
  {
    key: "love",
    label: "ปัตนิ · ความรัก",
    questions: [
      "ความสัมพันธ์ที่มีอยู่จะพัฒนาต่อไปได้ไหม?",
      "คนที่รอผลอยู่จะตอบรับไหม?",
      "ช่วงนี้เหมาะกับการพูดคุยเรื่องสำคัญในความรักไหม?",
      "ความขัดแย้งในครอบครัวจะคลี่คลายได้ไหม?",
      "มีคนดีเข้ามาในชีวิตช่วงนี้ไหม?",
    ],
  },
  {
    key: "health",
    label: "ตนุ · สุขภาพ",
    questions: [
      "พลังงานวันนี้เป็นอย่างไร ควรพักหรือลุย?",
      "อาการที่เป็นอยู่จะดีขึ้นเร็วไหม?",
      "ช่วงนี้ควรระวังสุขภาพด้านไหน?",
      "การรักษาที่วางแผนไว้เหมาะกับช่วงนี้ไหม?",
      "จิตใจช่วงนี้จะผ่อนคลายขึ้นไหม?",
    ],
  },
  {
    key: "travel",
    label: "สหัชชะ · เดินทาง",
    questions: [
      "ตอนนี้เหมาะกับการออกเดินทางไหม?",
      "ทิศทางไหนเป็นมงคลสำหรับวันนี้?",
      "ควรออกจากบ้านตอนนี้หรือรอยามหน้า?",
      "การนัดหมายที่กำหนดไว้จะราบรื่นไหม?",
      "เดินทางกลับบ้านช่วงนี้ปลอดภัยไหม?",
    ],
  },
  {
    key: "decide",
    label: "ศุภะ · ตัดสินใจ",
    questions: [
      "ปัญหาที่กำลังเผชิญจะคลี่คลายไหม?",
      "สิ่งที่รอคำตอบอยู่จะมีข่าวดีไหม?",
      "ควรลงมือทำเดี๋ยวนี้หรือรอก่อน?",
      "อุปสรรคที่มีจะผ่านพ้นได้ไหม?",
      "ความพยายามที่ทำอยู่จะเห็นผลเร็วไหม?",
    ],
  },
];

function HoranuChatPanel({
  initialPastChats = [],
  externalPrompt,
  onPromptHandled,
}: {
  initialPastChats?: any[];
  externalPrompt?: string;
  onPromptHandled?: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lockedTime, setLockedTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("work");
  const [pastChats, setPastChats] = useState<any[]>(initialPastChats);
  const [showHistory, setShowHistory] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);

  const handleAsk = async (overrideQuestion?: string) => {
    const q = (overrideQuestion ?? question).trim();
    if (!q || isLoading) return;

    const now = new Date().toISOString();
    setLockedTime(now);
    setAnswer("");
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/horanu-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, isoTime: now }),
      });

      if (!res.ok || !res.body) {
        setError("เกิดข้อผิดพลาดจาก AI service กรุณาลองใหม่อีกครั้ง");
        setIsLoading(false);
        return;
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
              setAnswer(prev => prev + parsed.text);
              fullAnswer += parsed.text;
            }
          } catch { /* skip malformed */ }
        }
      }

      // Save to database
      if (fullAnswer.trim()) {
        const formData = new FormData();
        formData.append("question", q);
        formData.append("answer", fullAnswer.trim());
        formData.append("lockedTime", now);

        try {
          const saveRes = await fetch("/api/horanu-save", {
            method: "POST",
            body: formData,
          });
          if (saveRes.ok) {
            const saveResult = await saveRes.json() as { success: boolean; chatId: string };
            if (saveResult.success) {
              setPastChats(prev => [
                {
                  id: saveResult.chatId,
                  question: q,
                  answer: fullAnswer.trim(),
                  locked_time: now,
                  created_at: now,
                },
                ...prev,
              ]);
            }
          }
        } catch (e) {
          console.error("Error saving chat history:", e);
        }
      }

    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle external prompt trigger from 2-stage predictor
  useEffect(() => {
    if (externalPrompt && externalPrompt.trim()) {
      const p = externalPrompt.trim();
      setQuestion(p);
      onPromptHandled?.();
      handleAsk(p);
    }
  }, [externalPrompt]);

  // Auto-scroll to answer as it streams
  useEffect(() => {
    if (answer && answerRef.current) {
      answerRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [answer]);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const selectPastChat = (chat: any) => {
    setQuestion(chat.question);
    setAnswer(chat.answer);
    setLockedTime(chat.locked_time);
  };

  return (
    <div className="border border-[#C6A96B]/25 bg-[#07132b]/85 backdrop-blur-md rounded-2xl p-6 shadow-xl shadow-black/50 text-left">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full ${isLoading ? "bg-[#C6A96B] animate-pulse" : "bg-[#C6A96B]"}`} />
        <p className="text-[#C6A96B] text-[11px] uppercase tracking-widest font-bold font-display">✦ ถามโหรพรายกระซิบ ✦</p>
        <span className="ml-2 text-[11px] text-[#D9CDB7]/80 font-medium">— ตีความตามดวงยาม ณ เวลาที่กดถาม</span>
        {lockedTime && (
          <span className="ml-auto text-[9px] text-[#C6A96B] font-mono shrink-0">
            ล็อกเวลา {fmtTime(lockedTime)} น.
          </span>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {QUESTION_CATEGORIES.map(cat => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setActiveCategory(cat.key)}
            disabled={isLoading}
            className={`text-[10px] px-3 py-1.5 rounded-full border transition-all disabled:opacity-40 ${
              activeCategory === cat.key
                ? "border-[#C6A96B] bg-[#C6A96B]/20 text-[#C6A96B] font-bold shadow-sm shadow-[#C6A96B]/20"
                : "border-[#C6A96B]/20 bg-[#091838]/40 text-[#D9CDB7] hover:border-[#C6A96B]/50 hover:text-[#F8F6F1]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Suggested questions for active category */}
      <div className="flex flex-wrap gap-1.5 mb-3.5">
        {(QUESTION_CATEGORIES.find(c => c.key === activeCategory)?.questions ?? []).map(q => (
          <button
            key={q}
            type="button"
            onClick={() => setQuestion(q)}
            disabled={isLoading}
            className="text-[10px] px-3 py-1.5 rounded-full border border-[#C6A96B]/15 bg-[#091838]/60 text-[#D9CDB7] hover:border-[#C6A96B]/40 hover:text-[#F8F6F1] disabled:opacity-40 transition-all text-left"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAsk();
            }
          }}
          placeholder="พิมพ์คำถามของคุณที่นี่... (กด Enter เพื่อส่งคำถาม หรือ Shift+Enter เพื่อขึ้นบรรทัดใหม่)"
          disabled={isLoading}
          rows={3}
          className="flex-1 min-w-0 bg-[#091838]/70 border border-[#C6A96B]/25 rounded-xl px-4 py-3 text-sm text-[#F8F6F1] placeholder:text-[#D9CDB7]/40 focus:outline-none focus:border-[#C6A96B]/60 disabled:opacity-60 resize-none"
        />
        <button
          type="button"
          onClick={() => handleAsk()}
          disabled={isLoading || !question.trim()}
          className="px-6 py-3 rounded-xl font-bold text-sm border border-[#C6A96B]/50 bg-gradient-to-r from-[#C6A96B]/25 to-[#D9BC82]/30 text-[#F8F6F1] hover:from-[#C6A96B]/35 hover:to-[#D9BC82]/40 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 flex items-center justify-center font-display"
        >
          {isLoading ? "กำลังอ่าน..." : "✦ ถามยาม ✦"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-3 text-xs text-rose-400 px-1">{error}</p>
      )}

      {/* Streaming answer */}
      {(answer || (isLoading && !error)) && (
        <div
          ref={answerRef}
          className="mt-4 p-5 rounded-xl bg-[#091838]/80 border border-[#C6A96B]/20 text-sm text-[#F8F6F1] leading-relaxed whitespace-pre-wrap text-left shadow-inner"
        >
          {isLoading && !answer ? (
            <span className="inline-flex items-center gap-2 text-[#D9CDB7]">
              <span className="w-1.5 h-1.5 bg-[#C6A96B] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-[#C6A96B] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-[#C6A96B] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              <span className="text-xs">กำลังอ่านดวงยามพรายกระซิบ...</span>
            </span>
          ) : (
            <>
              {answer}
              {isLoading && (
                <span className="inline-block w-0.5 h-4 bg-[#C6A96B] animate-pulse ml-0.5 align-middle" />
              )}
            </>
          )}
        </div>
      )}

      {/* Collapsible History Section */}
      <div className="mt-6 pt-5 border-t border-[#C6A96B]/15">
        <button
          type="button"
          onClick={() => setShowHistory(v => !v)}
          className="flex items-center justify-center gap-2 text-[10px] text-[#C6A96B] hover:text-[#C6A96B]/80 transition-colors font-bold uppercase tracking-wider mx-auto"
        >
          <span>{showHistory ? "▼ ซ่อนประวัติถามยาม" : `▶ แสดงประวัติถามยาม (${pastChats.length})`}</span>
        </button>

        {showHistory && (
          <div className="mt-4 space-y-2 max-h-52 overflow-y-auto pr-2 custom-scrollbar">
            {pastChats.length === 0 ? (
              <p className="text-xs text-[#D9CDB7]/40 text-center py-4">ยังไม่มีประวัติการถามยาม</p>
            ) : (
              pastChats.map((c: any) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectPastChat(c)}
                  className="w-full p-3 rounded-xl bg-[#091838]/60 border border-[#C6A96B]/15 hover:border-[#C6A96B]/40 transition-all cursor-pointer text-left block"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] text-[#D9CDB7]/60 font-mono">
                      {new Date(c.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })} • {new Date(c.locked_time).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#C6A96B]/10 text-[#C6A96B] font-medium border border-[#C6A96B]/20">
                      ย้อนหลัง
                    </span>
                  </div>
                  <p className="text-xs text-[#F8F6F1] font-bold line-clamp-1">{c.question}</p>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Hint */}
      <p className="text-[9px] text-[#D9CDB7]/60 mt-3 text-center">
        เวลาที่กดปุ่มถามคือเวลาที่ใช้คำนวณผังดวง — ผลลัพธ์จะเปลี่ยนทุก 7.5 นาที
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HoraNuPage() {
  const loaderData   = useLoaderData<typeof loader>();
  const actionData   = useActionData<typeof action>();
  const navigation   = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const activeMode  = (actionData as any)?.mode ?? "live";
  const result: HoraTaynooResult = (actionData as any)?.result ?? loaderData.result;
  const interpretation: ChartInterpretation = (actionData as any)?.interpretation ?? (loaderData as any).interpretation;
  const initialSvg  = (actionData as any)?.svg    ?? loaderData.svg;
  const isLive      = activeMode !== "success-yam";

  const [showCustom, setShowCustom] = useState(false);
  const currentTheme = useTheme();
  const [externalPrompt, setExternalPrompt] = useState<string>("");
  const [predictionMethod, setPredictionMethod] = useState<"bhava" | "time">("time");

  // Chart Options State
  const [options, setOptions] = useState<ChartConfig>({
    showKasternFixed: true,
    showFloatingPlanets: true,
    showPlanetStatus: true,
    showTimeRing: true,
    showLagnaRulerMarker: true,
  });

  const [svgStr, setSvgStr] = useState(initialSvg);

  // Re-generate SVG when options, result, or theme changes
  useEffect(() => {
    const newSvg = generateHoraTaynooSVG(result, { ...options, size: 520, theme: currentTheme });
    setSvgStr(newSvg);
  }, [result, options, currentTheme]);

  const handleAskAIWithTopic = (prompt: string) => {
    setExternalPrompt(prompt);
    const el = document.getElementById("horanu-chat-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">

      {/* ── Grand Astral Book Cover Frame ── */}
      <div className="relative rounded-3xl border-2 border-[#C6A96B]/35 bg-gradient-to-b from-[#07132b] via-[#091a3e] to-[#050e24] p-6 sm:p-10 shadow-2xl shadow-black/80 overflow-hidden text-center">
        
        {/* Subtle Decorative Star Accents */}
        <div className="absolute top-3.5 left-3.5 text-[#C6A96B]/50 text-xs select-none">✦</div>
        <div className="absolute top-3.5 right-3.5 text-[#C6A96B]/50 text-xs select-none">✦</div>
        <div className="absolute bottom-3.5 left-3.5 text-[#C6A96B]/50 text-xs select-none">✦</div>
        <div className="absolute bottom-3.5 right-3.5 text-[#C6A96B]/50 text-xs select-none">✦</div>

        {/* Inner double border */}
        <div className="absolute inset-2.5 sm:inset-3.5 border border-[#C6A96B]/20 rounded-[20px] pointer-events-none" />

        {/* ── Header ── */}
        <div className="relative z-10 space-y-3 mb-6 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#C6A96B]/30 bg-[#C6A96B]/10 text-[#C6A96B] text-[11px] font-bold tracking-[0.25em] uppercase font-display">
            ✦ ภพภูมิ · โหรทายหนู ✦
          </div>
          <h1 className="font-display text-2xl sm:text-4xl text-[#F8F6F1] font-bold tracking-wide">
            ผังดวงยามพรายกระซิบ ๑๒ ภพ
          </h1>
          <p className="text-xs sm:text-sm text-[#D9CDB7] leading-relaxed font-normal">
            โหรทายหนู (หรือเรียกว่า วิชายามพรายกระซิบ หรือยามอัฏฐกาล) เป็นศาสตร์การพยากรณ์ยามโบราณของไทยที่ใช้คำนวณเหตุการณ์เฉพาะหน้าหรือตอบคำถามเร่งด่วน โดยอาศัยหลักการเทียบเวลาและวันเกิดเหตุการณ์จริงกับตำแหน่งดาว
          </p>
          <div className="text-[11px] text-[#D9CDB7]/80 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-1">
            <span>ยาม {result.yamAsked} ({result.period === "day" ? "กลางวัน" : "กลางคืน"})</span>
            <span>•</span>
            <span>ลัคนา <b className="text-[#F8F6F1]">{ZODIAC_ORDER[result.lagnaZodiacIndex]?.name}</b></span>
            <span>•</span>
            <span>เกษตร <b className="text-[#C6A96B]">{ZODIAC_ORDER[result.kasternZodiacIndex]?.name}</b></span>
            <span>•</span>
            <span>ดาวยาม <b className="text-[#C6A96B]">{PLANET_INFO[result.yamPlanet]?.thai}</b></span>
          </div>

          {isLive && (
            <div className="flex items-center justify-center gap-3 pt-3">
              <LiveClock serverTime={loaderData.serverTime} />
              <button
                onClick={() => setShowCustom(v => !v)}
                className={`text-[11px] font-bold px-3 py-1 rounded-full border transition-all ${
                  showCustom
                    ? "bg-[#C6A96B]/20 border-[#C6A96B]/50 text-[#C6A96B]"
                    : "border-[#C6A96B]/25 bg-[#091838]/40 text-[#D9CDB7] hover:border-[#C6A96B]/60 hover:text-[#C6A96B]"
                }`}
              >
                {showCustom ? "✕ ปิด" : "⚙ ตั้งเวลา"}
              </button>
            </div>
          )}
        </div>

        {/* ── Live mode controls ── */}
        {showCustom && <div className="relative z-10 mb-6 text-left"><CustomTimeForm /></div>}

        {/* ── Center Astrological Wheel ── */}
        <div className="relative z-10 max-w-lg mx-auto">
          <div className="w-full flex justify-center py-2">
            <div
              className="w-full max-w-[480px] drop-shadow-[0_0_35px_rgba(198,169,107,0.12)]"
              dangerouslySetInnerHTML={{ __html: svgStr }}
            />
          </div>

          {/* Display Toggles */}
          <div className="mt-4 pt-4 border-t border-[#C6A96B]/20 flex flex-wrap gap-x-4 gap-y-2 justify-center">
            {[
              { key: 'showKasternFixed', label: 'ดาวเกษตรคงที่' },
              { key: 'showFloatingPlanets', label: 'ดาวลอย' },
              { key: 'showPlanetStatus', label: 'มาตรฐานดาว' },
              { key: 'showTimeRing', label: 'เวลารอบผัง' },
              { key: 'showLagnaRulerMarker', label: 'จุดลงเวลา' },
            ].map(opt => (
              <label key={opt.key} className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={(options as any)[opt.key]}
                  onChange={(e) => setOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded border-[#C6A96B]/30 bg-[#091838] text-[#C6A96B] focus:ring-[#C6A96B]/50"
                />
                <span className="text-[11px] text-[#D9CDB7] group-hover:text-[#C6A96B] transition-colors">{opt.label}</span>
              </label>
            ))}
          </div>

          {/* Planet Status Legend */}
          <PlanetStatusLegend />
        </div>
      </div>

      {/* ── 2 Prediction Mode Switcher (แท็บเลือกวิธีการพยากรณ์ ๒ แบบ) ── */}
      <div className="flex flex-col sm:flex-row gap-2.5 p-1.5 rounded-2xl bg-[#07132b]/90 border border-[#C6A96B]/30 shadow-xl shadow-black/50">
        <button
          type="button"
          onClick={() => setPredictionMethod("time")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold font-display transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
            predictionMethod === "time"
              ? "bg-gradient-to-r from-[#C6A96B]/30 to-[#D9BC82]/35 border border-[#C6A96B] text-[#F8F6F1] shadow-md shadow-[#C6A96B]/20"
              : "border border-transparent text-[#D9CDB7] hover:text-[#F8F6F1] hover:bg-[#091838]/60"
          }`}
        >
          <ModeSymbol mode="time" className="w-5 h-5 text-[#C6A96B] shrink-0" />
          <span>๑. อ่านตามดวงยาม ณ เวลาที่ถาม (สมการจุดพยากรณ์)</span>
        </button>

        <button
          type="button"
          onClick={() => setPredictionMethod("bhava")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold font-display transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
            predictionMethod === "bhava"
              ? "bg-gradient-to-r from-[#C6A96B]/30 to-[#D9BC82]/35 border border-[#C6A96B] text-[#F8F6F1] shadow-md shadow-[#C6A96B]/20"
              : "border border-transparent text-[#D9CDB7] hover:text-[#F8F6F1] hover:bg-[#091838]/60"
          }`}
        >
          <ModeSymbol mode="bhava" className="w-5 h-5 text-[#C6A96B] shrink-0" />
          <span>๒. อ่านจากเรื่องที่ถาม (เจาะลึก ๑๒ ภพ)</span>
        </button>
      </div>

      {/* ── Active Prediction Method View ── */}
      {predictionMethod === "time" ? (
        <PhraKrasibCalcTable result={result} onAskAI={handleAskAIWithTopic} />
      ) : (
        <TwoStageBhavaPredictor result={result} onAskAI={handleAskAIWithTopic} />
      )}

      {/* ── Horanu Chat ── */}
      <div id="horanu-chat-section">
        <HoranuChatPanel
          initialPastChats={loaderData.pastChats}
          externalPrompt={externalPrompt}
          onPromptHandled={() => setExternalPrompt("")}
        />
      </div>

      {/* Loading overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#07132b] border border-[#C6A96B]/40 rounded-2xl p-8 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-[#C6A96B]/30 border-t-[#C6A96B] rounded-full animate-spin" />
            <p className="text-[#C6A96B] text-sm font-bold">กำลังโหลดดวงยาม...</p>
          </div>
        </div>
      )}
    </div>
  );
}
