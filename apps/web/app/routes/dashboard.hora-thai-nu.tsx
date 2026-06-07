import { json } from "@remix-run/cloudflare";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { useEffect, useState } from "react";
import { requireMinPlan } from "~/services/auth.server";
import {
  calculateHoraThaiNu,
  HORA_THAI_NU_PLANETS,
} from "@phopephum/engine";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "โหรทายหนู — ศาสตร์ยามพยากรณ์แม่นยำ — PhopePhum" },
  { name: "description", content: "โหรทายหนู วิชาพยากรณ์กาลชะตาโบราณของไทย คำนวณยามอัฐกาล 90 นาที และยามย่อย 7.5 นาที หาดาวเจ้ายาม ผังภพ 12 หลัง เพื่อตอบปัญหาเฉพาะหน้าได้โดยไม่ต้องรู้วันเกิด" },
  { property: "og:type", content: "website" },
  { property: "og:title", content: "โหรทายหนู — ศาสตร์ยามพยากรณ์แม่นยำ — PhopePhum" },
  { property: "og:description", content: "คำนวณยามอัฐกาลและยามย่อย 7.5 นาที ด้วยวิชาโหรทายหนู ศาสตร์โบราณแห่งกรุงศรีอยุธยา" },
  { property: "og:image", content: "https://phopephum.com/favicon.svg" },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "keywords", content: "โหรทายหนู, ยามอัฐกาล, ยามพยากรณ์, ดาวเจ้ายาม, ผังภพ, โหราศาสตร์ไทย, ตามดาวเจ้าเรือน, PhopePhum" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireMinPlan("basic", request, env);

  const now = new Date();
  const result = calculateHoraThaiNu(now);

  return json({ result, serverTime: now.toISOString() });
}

// ─── Planet color map ────────────────────────────────────────────────────────
const PLANET_BG: Record<number, string> = {
  1: "rgba(239,68,68,0.15)",
  2: "rgba(251,191,36,0.15)",
  3: "rgba(249,115,22,0.15)",
  4: "rgba(16,185,129,0.15)",
  5: "rgba(245,158,11,0.15)",
  6: "rgba(236,72,153,0.15)",
  7: "rgba(139,92,246,0.15)",
};
const PLANET_BORDER: Record<number, string> = {
  1: "rgba(239,68,68,0.35)",
  2: "rgba(251,191,36,0.35)",
  3: "rgba(249,115,22,0.35)",
  4: "rgba(16,185,129,0.35)",
  5: "rgba(245,158,11,0.35)",
  6: "rgba(236,72,153,0.35)",
  7: "rgba(139,92,246,0.35)",
};

// ─── Countdown hook ──────────────────────────────────────────────────────────
function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    setRemaining(seconds);
    const id = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds]);
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatMinutes(min: number): string {
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  if (s === 0) return `${m} นาที`;
  return `${m} นาที ${s} วินาที`;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function HoraThaiNuDashboard() {
  const { result, serverTime } = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(revalidate, 30_000);
    return () => clearInterval(id);
  }, [revalidate]);

  const mainCountdown = useCountdown(Math.round(result.minutesRemainingInMainPeriod * 60));
  const subCountdown = useCountdown(Math.round(result.minutesRemainingInSubPeriod * 60));

  const planet = HORA_THAI_NU_PLANETS[result.currentMainPlanet]!;

  return (
    <div className="space-y-8">
      {/* ── Hero ── */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs tracking-widest uppercase"
          style={{ background: "rgba(198,169,107,0.1)", border: "1px solid rgba(198,169,107,0.25)", color: "#C6A96B" }}>
          <IconMouse /> โหรทายหนู
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-[#F8F6F1] glow-gold leading-tight">
          ศาสตร์ยามพยากรณ์<br className="md:hidden" />แม่นยำยิ่งกว่าตาเห็น
        </h1>
        <p className="text-[#94A3B8] max-w-xl mx-auto text-sm leading-relaxed">
          วิชาโบราณแห่งกรุงศรีอยุธยา คำนวณยามอัฐกาล ตอบปัญหาเฉพาะหน้าได้โดยไม่ต้องรู้วันเกิด
        </p>
      </div>

      {/* ── Current Yam Status ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Main Period Card */}
        <Card>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#94A3B8] tracking-widest uppercase">ยามใหญ่ปัจจุบัน (90 นาที)</p>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(198,169,107,0.12)", color: "#C6A96B" }}>
                {result.phase === "day" ? "☀ กลางวัน" : "☾ กลางคืน"}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold text-xl shrink-0"
                style={{ background: PLANET_BG[result.currentMainPlanet], border: `1px solid ${PLANET_BORDER[result.currentMainPlanet]}`, color: planet.color }}>
                <span className="text-2xl">{planet.symbol}</span>
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-[#F8F6F1]">
                  ยามที่ {result.currentMainPeriod}
                </p>
                <p className="text-base font-semibold" style={{ color: planet.color }}>
                  ดาว{result.currentMainPlanetName}
                </p>
                <p className="text-xs text-[#94A3B8]">
                  {result.mainPeriodStartTime} — {result.mainPeriodEndTime} น.
                </p>
              </div>
            </div>

            <div className="rounded-xl p-3 text-center"
              style={{ background: "rgba(198,169,107,0.06)", border: "1px solid rgba(198,169,107,0.15)" }}>
              <p className="text-xs text-[#94A3B8] mb-1">เหลือเวลาในยามใหญ่</p>
              <p className="font-mono text-2xl font-bold text-[#C6A96B]">{mainCountdown}</p>
            </div>
          </div>
        </Card>

        {/* Sub Period Card */}
        <Card>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#94A3B8] tracking-widest uppercase">ยามย่อยปัจจุบัน (7.5 นาที)</p>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(75,111,174,0.15)", color: "#7BA4E8" }}>
                ละเอียดระดับนาที
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold shrink-0"
                style={{ background: "rgba(75,111,174,0.12)", border: "1px solid rgba(75,111,174,0.3)", color: "#7BA4E8" }}>
                <span className="text-xs text-[#94A3B8]">ย่อย</span>
                <span className="text-2xl font-display">{result.currentSubPeriod}</span>
                <span className="text-xs text-[#94A3B8]">/12</span>
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-[#F8F6F1]">
                  ยามย่อยที่ {result.currentSubPeriod}
                </p>
                <p className="text-xs text-[#94A3B8]">
                  {result.subPeriodStartTime} — {result.subPeriodEndTime} น.
                </p>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  {result.dayName} · ประธานวัน: ดาว{result.dayRulerName}
                </p>
              </div>
            </div>

            <div className="rounded-xl p-3 text-center"
              style={{ background: "rgba(75,111,174,0.08)", border: "1px solid rgba(75,111,174,0.2)" }}>
              <p className="text-xs text-[#94A3B8] mb-1">เหลือเวลาในยามย่อย</p>
              <p className="font-mono text-2xl font-bold text-[#7BA4E8]">{subCountdown}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Full Day Schedule ── */}
      <Card>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-[#F8F6F1]">
              ตารางยามอัฐกาล — {result.phase === "day" ? "ภาคกลางวัน" : "ภาคกลางคืน"}
            </h2>
            <span className="text-xs text-[#94A3B8]">8 ยาม × 90 นาที</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {result.allMainPeriods.map((p) => {
              const pInfo = HORA_THAI_NU_PLANETS[p.planet]!;
              return (
                <div key={p.periodNum}
                  className="rounded-xl p-3 transition-all"
                  style={{
                    background: p.isCurrent ? PLANET_BG[p.planet] : "rgba(255,255,255,0.03)",
                    border: `1px solid ${p.isCurrent ? PLANET_BORDER[p.planet] : "rgba(255,255,255,0.07)"}`,
                    boxShadow: p.isCurrent ? `0 0 20px ${pInfo.color}18` : "none",
                  }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#94A3B8]">ยามที่ {p.periodNum}</span>
                    {p.isCurrent && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: pInfo.color + "22", color: pInfo.color }}>
                        ▶ ปัจจุบัน
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl" style={{ color: pInfo.color }}>{pInfo.symbol}</span>
                    <div>
                      <p className="text-sm font-semibold text-[#F8F6F1]">ดาว{pInfo.name}</p>
                      <p className="text-xs text-[#94A3B8]">{p.startTime}–{p.endTime}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── Sub Periods ── */}
      <Card>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-[#F8F6F1]">
              ยามย่อย — ยามใหญ่ที่ {result.currentMainPeriod}
            </h2>
            <span className="text-xs text-[#94A3B8]">12 ย่อย × 7.5 นาที</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {result.subPeriods.map((sp) => (
              <div key={sp.subNum}
                className="rounded-lg p-2 text-center transition-all"
                style={{
                  background: sp.isCurrent ? "rgba(198,169,107,0.15)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${sp.isCurrent ? "rgba(198,169,107,0.4)" : "rgba(255,255,255,0.07)"}`,
                }}>
                <p className="text-xs text-[#94A3B8]">ย่อย {sp.subNum}</p>
                <p className={`text-xs font-mono mt-0.5 ${sp.isCurrent ? "text-[#C6A96B] font-bold" : "text-[#64748B]"}`}>
                  {sp.startTime}
                </p>
                {sp.isCurrent && (
                  <p className="text-[10px] text-[#C6A96B] mt-0.5">▶ ขณะนี้</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── 12 Houses Chart ── */}
      <Card>
        <div className="p-5">
          <div className="mb-4">
            <h2 className="font-display text-lg font-bold text-[#F8F6F1]">ผังภพ 12 หลัง</h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              ราศีพฤษภเป็นภพลัคนาที่ 1 เสมอ — ใช้ "ตามดาวเจ้าเรือน" เพื่อพยากรณ์
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {result.houses.map((house) => {
              const lordColor = HORA_THAI_NU_PLANETS[house.lordPlanet]?.color ?? "#C6A96B";
              return (
                <div key={house.houseNum}
                  className="rounded-xl p-3 space-y-1.5"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#64748B]">ภพที่ {house.houseNum}</span>
                    <span className="text-xs font-bold" style={{ color: lordColor }}>
                      {house.lordPlanetSymbol}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#C6A96B]">{house.houseName}</p>
                    <p className="text-xs text-[#94A3B8]">ราศี{house.zodiacName}</p>
                  </div>
                  <div className="pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <p className="text-[10px] text-[#64748B]">{house.houseQuestion}</p>
                    <p className="text-[10px]" style={{ color: lordColor + "cc" }}>
                      เจ้าเรือน: ดาว{house.lordPlanetName}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── Lord Tracking Guide ── */}
      <Card>
        <div className="p-5 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#F8F6F1]">วิธีการตามดาวเจ้าเรือน</h2>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            หัวใจสำคัญของวิชาโหรทายหนู คือการ <span className="text-[#C6A96B]">สะกดรอยตามดาว</span> จากคำถามไปสู่บทสรุปฟันธง
          </p>

          <div className="space-y-3">
            {[
              { step: "1", title: "แปลคำถาม → ภพ", desc: "ของหาย = กฎุมภะ (ภพ 2) · ลูกหลาน = ปุตตะ (ภพ 5) · โรค = อริ (ภพ 6) · คู่ครอง = ปัตนิ (ภพ 7)" },
              { step: "2", title: "หาราศีของภพ", desc: "ดูในผังภพด้านบนว่าภพนั้นตกอยู่ในราศีใด (เช่น ภพ 2 = ราศีเมถุน)" },
              { step: "3", title: "ดาวเจ้าเรือนคือใคร", desc: "ดาวที่ปกครองราศีนั้น (เช่น ราศีเมถุน → เจ้าเรือน = พุธ)" },
              { step: "4", title: "สะกดรอยดาว", desc: "ดาวเจ้าเรือนโคจรไปอยู่ที่ภพใดในผังยาม? ภพนั้นคือคำตอบ" },
            ].map((item) => (
              <div key={item.step} className="flex gap-3 rounded-xl p-3"
                style={{ background: "rgba(198,169,107,0.05)", border: "1px solid rgba(198,169,107,0.12)" }}>
                <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold font-display"
                  style={{ background: "rgba(198,169,107,0.2)", color: "#C6A96B" }}>
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#F8F6F1]">{item.title}</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Use Cases ── */}
      <Card>
        <div className="p-5 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#F8F6F1]">7 กรณีที่วิชานี้ช่วยได้</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {USE_CASES.map((uc) => (
              <div key={uc.no} className="flex gap-3 rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span className="text-xl shrink-0">{uc.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-[#F8F6F1]">{uc.title}</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5 leading-relaxed">{uc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Footer Note ── */}
      <div className="text-center space-y-1 pb-4">
        <p className="text-xs text-[#475569]">
          อ้างอิง: ตำราโหรทายหนู อ.ประทีป อัครา (พ.ศ. 2528) · อัปเดตอัตโนมัติทุก 30 วินาที
        </p>
        <p className="text-xs text-[#475569]">
          เวลาเซิร์ฟเวอร์: {new Date(serverTime).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
        </p>
      </div>
    </div>
  );
}

// ─── Use Cases Data ───────────────────────────────────────────────────────────
const USE_CASES = [
  {
    no: 1,
    icon: "🔍",
    title: "ตามหาของหายและคนหาย",
    desc: "ระบุทิศทางและตำแหน่งของสิ่งของหรือบุคคลที่หายไป",
  },
  {
    no: 2,
    icon: "🏥",
    title: "วิกฤตสุขภาพ",
    desc: "ประเมินความรุนแรง ชี้โรคเฉพาะ เตรียมตัวรับมือได้ทันท่วงที",
  },
  {
    no: 3,
    icon: "💼",
    title: "การตัดสินใจสำคัญ",
    desc: "ควรเปลี่ยนงาน? คู่ครองมีคนอื่น? ตอบแบบฟันธงได้",
  },
  {
    no: 4,
    icon: "🌟",
    title: "สอบลัคนาและปรับเวลาเกิด",
    desc: "ช่วยผู้ที่ไม่ทราบเวลาเกิดหาลัคนาดวงชะตาที่แม่นยำ",
  },
  {
    no: 5,
    icon: "💭",
    title: "ทำนายฝันและลางสังหรณ์",
    desc: "ถอดรหัสความหมายจากเวลาที่ฝันหรือสัมผัสได้",
  },
  {
    no: 6,
    icon: "🔮",
    title: "รู้วาระซ่อนเร้น",
    desc: "โหรชำนาญสามารถทำนายใจผู้คนได้ก่อนที่จะเอ่ยปาก",
  },
  {
    no: 7,
    icon: "📅",
    title: "ช่วยหาฤกษ์ยาม",
    desc: "ประกอบกับระบบฤกษ์อื่นเพื่อหาเวลามงคลที่เหมาะสมที่สุด",
  },
];

// ─── Icons ───────────────────────────────────────────────────────────────────
function IconMouse() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <ellipse cx="12" cy="12" rx="6" ry="9" />
      <path d="M12 3v5" strokeLinecap="round" />
      <circle cx="12" cy="10" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
