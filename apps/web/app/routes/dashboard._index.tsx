import { json } from "@remix-run/cloudflare";
import { useLoaderData, Link, useRevalidator } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import {
  getCurrentYam,
  calculateMoonPhase,
  calculateKarnchata,
  calculateRahu,
  calculateHoraTaynoo,
  PLANET_INFO,
} from "@phopephum/engine";
import type { Env } from "~/env.server";
import { useState, useEffect } from "react";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);
  const { supabase } = createSupabaseClient(request, env);

  let pendingCount = 0;
  if (profile?.role === "admin" || profile?.role === "operator") {
    const { count } = await supabase
      .from("subscription_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  const now       = new Date();
  const yam       = getCurrentYam();
  const moon      = calculateMoonPhase();
  const karnchata = calculateKarnchata(now);
  const rahu      = calculateRahu(now);
  const hora      = calculateHoraTaynoo({ dateAsked: now });

  const STAR_TH: Record<number, string> = { 1:"อาทิตย์",2:"จันทร์",3:"อังคาร",4:"พุธ",5:"พฤหัส",6:"ศุกร์",7:"เสาร์" };

  return json({
    user, profile, pendingCount,
    now: now.toISOString(),
    yam: {
      name:    yam.yamName,
      number:  yam.yamNumber,
      period:  yam.period,
      level:   yam.travelAuspiciousness.level,
      label:   yam.travelAuspiciousness.label,
      ticks:   yam.travelAuspiciousness.ticks,
      shouldDo: yam.prediction?.shouldDo ?? "",
    },
    moon: {
      phase:        moon.moonPhase,
      illumination: moon.illumination,
      isWanPhra:    moon.isWanPhra,
    },
    karnchata: {
      yamYaiName:   karnchata.yamYaiName,
      yamYaiNumber: karnchata.yamYaiNumber,
      dayStar:      STAR_TH[karnchata.dayStarNumber] ?? String(karnchata.dayStarNumber),
    },
    rahu: rahu ? {
      isGood:  rahu.is_current_moment_good,
      verdict: rahu.summary.overall_verdict,
      start:   rahu.main_block.start_time,
      end:     rahu.main_block.end_time,
    } : null,
    hora: {
      yamAsked:  hora.yamAsked,
      period:    hora.period,
      yamPlanet: PLANET_INFO[hora.yamPlanet]?.thai ?? String(hora.yamPlanet),
    },
  });
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const LEVEL_STYLE: Record<string, { bar: string; badge: string }> = {
  excellent: { bar: "bg-emerald-400", badge: "text-emerald-400 border-emerald-500/40 bg-emerald-500/8" },
  very_good: { bar: "bg-sky-400",     badge: "text-sky-400 border-sky-500/40 bg-sky-500/8" },
  good:      { bar: "bg-amber-400",   badge: "text-amber-400 border-amber-500/40 bg-amber-500/8" },
  bad:       { bar: "bg-rose-400",    badge: "text-rose-400 border-rose-500/40 bg-rose-500/8" },
};

const PERIOD_TH: Record<string, string> = { day: "กลางวัน", night: "กลางคืน" };

// ─── Live clock ───────────────────────────────────────────────────────────────

function LiveClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  const p = (n: number) => String(n).padStart(2, "0");
  return <span className="font-mono tabular-nums">{p(t.getHours())}:{p(t.getMinutes())}:{p(t.getSeconds())}</span>;
}

// ─── Ticks ────────────────────────────────────────────────────────────────────

function Ticks({ n, bar }: { n: number; bar: string }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3].map(i => <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= n ? bar : "bg-white/10"}`} />)}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardIndex() {
  const d = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();
  const { profile, yam, moon, karnchata, rahu, hora, pendingCount } = d;

  const displayName = profile?.display_name ?? "คุณ";
  const isPro       = profile?.role === "admin" || profile?.role === "operator" || profile?.plan === "imperial";
  const isAdminOp   = profile?.role === "admin" || profile?.role === "operator";
  const hasBirth    = !!(profile?.birth_date);

  const [greeting, setGreeting] = useState("");
  const [dateLabel, setDateLabel] = useState("");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 5 ? "ราตรีสวัสดิ์" : h < 12 ? "อรุณสวัสดิ์" : h < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น");
    setDateLabel(new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" }));
  }, []);

  useEffect(() => { const id = setInterval(revalidate, 60_000); return () => clearInterval(id); }, [revalidate]);

  const ls = LEVEL_STYLE[yam.level] ?? LEVEL_STYLE.good;

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-6">

      {/* ── 1. Header ── */}
      <div className="flex items-start justify-between pt-1 gap-3">
        <div>
          <p className="text-[#94A3B8] text-xs">{greeting} · {dateLabel}</p>
          <h1 className="font-display text-xl font-bold text-[#F8F6F1] mt-0.5">
            สวัสดี, <span className="text-[#C6A96B]">{displayName}</span>
          </h1>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mt-1 px-2.5 py-1 rounded-full border text-xs font-bold"
          style={{ borderColor:"rgba(77,184,160,0.3)", color:"#4DB8A0", background:"rgba(77,184,160,0.08)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#4DB8A0] animate-ping" />
          <LiveClock />
        </div>
      </div>

      {/* ── 2. ฤกษ์ยามขณะนี้ Hero ── */}
      <Link to="/dashboard/check-yam" className="block group">
        <div className="rounded-2xl p-4 border border-[#C6A96B]/20 bg-[#0A1628]/80 transition-all group-hover:border-[#C6A96B]/40 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full pointer-events-none"
            style={{ background:"radial-gradient(circle, rgba(198,169,107,0.12) 0%, transparent 70%)" }} />
          <div className="relative">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-[10px] text-[#C6A96B]/70 uppercase tracking-widest font-bold mb-1">✦ ฤกษ์ยามขณะนี้</p>
                <p className="font-display text-2xl font-bold text-[#F8F6F1] leading-none">{yam.name}</p>
                <p className="text-xs text-[#8A8070] mt-1">
                  ยาม {yam.number} · {PERIOD_TH[yam.period]}
                  {moon.isWanPhra ? " · 🔆 วันพระ" : ` · จันทร์ ${Math.round(moon.illumination)}%`}
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1.5">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${ls.badge}`}>{yam.label}</span>
                <Ticks n={yam.ticks} bar={ls.bar} />
              </div>
            </div>
            {yam.shouldDo && (
              <p className="text-xs text-[#8A8070] leading-relaxed mb-3 line-clamp-2">{yam.shouldDo}</p>
            )}
            <div className="flex items-center justify-between text-xs text-[#C6A96B]/60 group-hover:text-[#C6A96B] transition-colors font-bold">
              <span>ดูทุกเครื่องมือฤกษ์ยาม</span>
              <span>→</span>
            </div>
          </div>
        </div>
      </Link>

      {/* ── 3. เครื่องมือพยากรณ์หลัก (4 tools) ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C6A96B]/50 mb-3">✦ เครื่องมือพยากรณ์</p>
        <div className="grid grid-cols-2 gap-3">

          {/* ยามอัฐกาล */}
          <Link to="/dashboard/yam" className="group flex flex-col gap-2 p-4 rounded-2xl border border-white/5 bg-[#0A1628]/60 hover:border-[#C6A96B]/30 transition-all active:scale-[0.97]">
            <div className="flex items-center justify-between">
              <span className="text-[#C6A96B]/70 group-hover:text-[#C6A96B] transition-colors"><IcoYam /></span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${ls.badge}`}>{yam.label}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-[#F8F6F1]">ยามอัฐกาล</p>
              <p className="text-[11px] text-[#C6A96B] font-bold mt-0.5">{yam.name}</p>
              <p className="text-[10px] text-[#8A8070] mt-0.5">{PERIOD_TH[yam.period]} · ยาม {yam.number}</p>
            </div>
          </Link>

          {/* กาลชะตา */}
          <Link to="/dashboard/karnchata" className="group flex flex-col gap-2 p-4 rounded-2xl border border-white/5 bg-[#0A1628]/60 hover:border-[#C6A96B]/30 transition-all active:scale-[0.97]">
            <div className="flex items-center justify-between">
              <span className="text-[#C6A96B]/70 group-hover:text-[#C6A96B] transition-colors"><IcoHourglass /></span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border text-[#C6A96B] border-[#C6A96B]/30 bg-[#C6A96B]/8">{karnchata.dayStar}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-[#F8F6F1]">เลข ๗ กาลชะตา</p>
              <p className="text-[11px] text-[#C6A96B] font-bold mt-0.5">{karnchata.yamYaiName}</p>
              <p className="text-[10px] text-[#8A8070] mt-0.5">ดาว{karnchata.dayStar} · รายวัน/ชั่วโมง/นาที</p>
            </div>
          </Link>

          {/* โหรทายหนู */}
          <Link to="/dashboard/horanu" className="group flex flex-col gap-2 p-4 rounded-2xl border border-white/5 bg-[#0A1628]/60 hover:border-[#4B6FAE]/40 transition-all active:scale-[0.97]">
            <div className="flex items-center justify-between">
              <span className="text-[#4B6FAE]/70 group-hover:text-[#4B6FAE] transition-colors"><IcoStarCross /></span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border text-[#4B6FAE] border-[#4B6FAE]/40 bg-[#4B6FAE]/8">ยาม {hora.yamAsked}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-[#F8F6F1]">ยามพรายกระซิบ</p>
              <p className="text-[11px] text-[#4B6FAE] font-bold mt-0.5">{hora.yamPlanet}</p>
              <p className="text-[10px] text-[#8A8070] mt-0.5">{PERIOD_TH[hora.period]} · ผัง ดาวลอย 11</p>
            </div>
          </Link>

          {/* ราหู */}
          <Link to="/dashboard/rahu" className={`group flex flex-col gap-2 p-4 rounded-2xl border transition-all active:scale-[0.97] ${rahu?.isGood ? "border-emerald-500/20 bg-emerald-950/15 hover:border-emerald-500/40" : "border-rose-500/15 bg-rose-950/10 hover:border-rose-500/30"}`}>
            <div className="flex items-center justify-between">
              <span className={rahu?.isGood ? "text-emerald-400/70" : "text-rose-400/70"}><IcoRahu /></span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${rahu?.isGood ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/8" : "text-rose-400 border-rose-500/40 bg-rose-500/8"}`}>
                {rahu?.isGood ? "ฤกษ์ดี" : "ระวัง"}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-[#F8F6F1]">ราหูค้นทรัพย์</p>
              <p className={`text-[11px] font-bold mt-0.5 line-clamp-1 ${rahu?.isGood ? "text-emerald-400" : "text-rose-400"}`}>
                {rahu ? rahu.verdict : "คำนวณ..."}
              </p>
              <p className="text-[10px] text-[#8A8070] mt-0.5">{rahu ? `${rahu.start}–${rahu.end}` : "ตารางยามมงคล"}</p>
            </div>
          </Link>

        </div>
      </div>

      {/* ── 4. เครื่องมือวิเคราะห์ดวง ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#4B6FAE]/60 mb-3">✦ วิเคราะห์ดวงชะตา</p>
        <div className="grid grid-cols-2 gap-2.5">

          <Link to="/dashboard/horoscope" className="group flex items-center gap-3 p-3.5 rounded-2xl border border-white/5 bg-[#0A1628]/60 hover:border-[#4B6FAE]/30 transition-all active:scale-[0.97]">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[#4B6FAE]"
              style={{ background:"rgba(75,111,174,0.12)", border:"1px solid rgba(75,111,174,0.25)" }}>
              <IcoCompass />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#F8F6F1] leading-tight">ตั้งดวงชะตา</p>
              <p className="text-[10px] text-[#8A8070] mt-0.5">เลข ๗ ตัว ผังจักรพรรดิ</p>
            </div>
          </Link>

          <Link to="/dashboard/mahathaksa" className="group flex items-center gap-3 p-3.5 rounded-2xl border border-white/5 bg-[#0A1628]/60 hover:border-[#C6A96B]/20 transition-all active:scale-[0.97]">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[#C6A96B]"
              style={{ background:"rgba(198,169,107,0.10)", border:"1px solid rgba(198,169,107,0.22)" }}>
              <IcoTaksa />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#F8F6F1] leading-tight">มหาทักษา</p>
              <p className="text-[10px] text-[#8A8070] mt-0.5">พยากรณ์ชีวิต</p>
            </div>
          </Link>

          <Link to="/dashboard/mahaphuti" className="group flex items-center gap-3 p-3.5 rounded-2xl border border-white/5 bg-[#0A1628]/60 hover:border-[#C6A96B]/20 transition-all active:scale-[0.97]">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[#C6A96B]"
              style={{ background:"rgba(198,169,107,0.10)", border:"1px solid rgba(198,169,107,0.22)" }}>
              <IcoPhuti />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#F8F6F1] leading-tight">มหาภูติ</p>
              <p className="text-[10px] text-[#8A8070] mt-0.5">ธาตุกำเนิด</p>
            </div>
          </Link>

          <Link to="/dashboard/calendar" className="group flex items-center gap-3 p-3.5 rounded-2xl border border-white/5 bg-[#0A1628]/60 hover:border-[#8A8070]/30 transition-all active:scale-[0.97]">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[#8A8070]"
              style={{ background:"rgba(138,128,112,0.10)", border:"1px solid rgba(138,128,112,0.22)" }}>
              <IcoList />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#F8F6F1] leading-tight">ปฏิทิน 100 ปี</p>
              <p className="text-[10px] text-[#8A8070] mt-0.5">จันทรคติไทย</p>
            </div>
          </Link>

        </div>
      </div>

      {/* ── 5. Utility row ── */}
      <div className="grid grid-cols-2 gap-2.5">
        <Link to="/dashboard/planner" className="group flex items-center gap-2.5 p-3 rounded-xl border border-white/5 bg-[#0A1628]/40 hover:border-[#8B7FD4]/30 transition-all">
          <span className="text-[#8B7FD4]"><IcoJournal /></span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#F8F6F1]">บันทึก</p>
            <p className="text-[10px] text-[#8A8070]">วางแผน + จดบันทึก</p>
          </div>
        </Link>
        <Link to="/dashboard/settings" className="group flex items-center gap-2.5 p-3 rounded-xl border border-white/5 bg-[#0A1628]/40 hover:border-white/10 transition-all">
          <span className="text-[#8A8070]"><IcoProfile /></span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#F8F6F1]">โปรไฟล์</p>
            <p className="text-[10px] text-[#8A8070]">{hasBirth ? "ข้อมูลส่วนตัว" : "⚠ ยังไม่ได้ตั้งวันเกิด"}</p>
          </div>
        </Link>
      </div>

      {/* ── 6. Birth prompt ── */}
      {!hasBirth && (
        <Link to="/dashboard/settings" className="block group">
          <div className="rounded-xl px-4 py-3 flex items-center gap-3 border border-dashed border-[#C6A96B]/25 bg-[#C6A96B]/4 hover:border-[#C6A96B]/40 transition-all">
            <span className="text-[#C6A96B] text-sm">✦</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#D9BC82]">เพิ่มวันเกิด เพื่อดวงชะตาแม่นยำ</p>
              <p className="text-[10px] text-[#94A3B8] mt-0.5">ใช้กับ ตั้งดวงชะตา · มหาทักษา · มหาภูติ</p>
            </div>
            <span className="text-[#C6A96B]/50 group-hover:text-[#C6A96B] transition-colors">→</span>
          </div>
        </Link>
      )}

      {/* ── 7. Upgrade prompt (free users) ── */}
      {!isPro && profile?.role !== "admin" && (
        <Link to="/dashboard/upgrade" className="block group">
          <div className="rounded-xl px-4 py-3 flex items-center gap-3 border border-[#C6A96B]/20 transition-all group-hover:border-[#C6A96B]/40"
            style={{ background:"linear-gradient(135deg, rgba(198,169,107,0.06) 0%, rgba(10,34,64,0.4) 100%)" }}>
            <span className="text-[#C6A96B] text-base">✦</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#C6A96B]">อัปเกรด Imperial</p>
              <p className="text-[10px] text-[#8A8070] mt-0.5">ปลดล็อกทุกเครื่องมือ + AI วิเคราะห์เต็มรูปแบบ</p>
            </div>
            <span className="text-[#C6A96B]/50 group-hover:text-[#C6A96B] text-xs font-bold transition-colors">อัปเกรด →</span>
          </div>
        </Link>
      )}

      {/* ── 8. Admin panel ── */}
      {isAdminOp && (
        <Link to="/admin/approvals" className="block group">
          <div className="rounded-xl px-4 py-3 flex items-center gap-3 border border-sky-500/20 bg-sky-950/15 hover:border-sky-500/40 transition-all">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background:"rgba(56,189,248,0.12)", border:"1px solid rgba(56,189,248,0.25)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth={1.8} className="w-4 h-4">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-sky-400">
                Admin Panel
                {pendingCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-400 text-[#020617] text-[9px] font-black">
                    {pendingCount}
                  </span>
                )}
              </p>
              <p className="text-[10px] text-[#8A8070] mt-0.5">
                {pendingCount > 0 ? `คำขออนุมัติ ${pendingCount} รายการ` : "อนุมัติสมาชิก · จัดการระบบ"}
              </p>
            </div>
            <span className="text-sky-400/50 group-hover:text-sky-400 transition-colors">→</span>
          </div>
        </Link>
      )}

    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IcoYam() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <circle cx="12" cy="12" r="9"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4" strokeLinecap="round"/><circle cx="12" cy="12" r="3"/>
  </svg>;
}
function IcoHourglass() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path d="M5 2h14M5 22h14M19 2v4a7 7 0 0 1-7 7 7 7 0 0 1-7-7V2M5 22v-4a7 7 0 0 1 7-7 7 7 0 0 1 7 7v4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
function IcoStarCross() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" strokeLinecap="round"/><circle cx="12" cy="12" r="2" fill="currentColor"/>
  </svg>;
}
function IcoRahu() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12" strokeLinecap="round"/><circle cx="12" cy="12" r="3"/>
  </svg>;
}
function IcoCompass() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path d="M12 22V12" strokeLinecap="round"/>
    <path d="M12 12C12 12 7 9 7 5a5 5 0 0 1 10 0c0 4-5 7-5 7z" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 22h14" strokeLinecap="round"/>
  </svg>;
}
function IcoTaksa() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <circle cx="12" cy="12" r="9"/><path d="M12 3v9l5 3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="2" fill="currentColor"/>
  </svg>;
}
function IcoPhuti() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
    <path d="M7 10c0-2.761 2.239-5 5-5s5 2.239 5 5-4 6-5 7c-1-1-5-4.239-5-7z" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="10" r="1.5" fill="currentColor"/>
  </svg>;
}
function IcoList() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
function IcoJournal() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 7h7M9 11h5" strokeLinecap="round"/>
  </svg>;
}
function IcoProfile() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round"/>
  </svg>;
}
