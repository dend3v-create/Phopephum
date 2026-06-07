import { json } from "@remix-run/cloudflare";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { useEffect, useRef, useState, useCallback } from "react";
import { requireMinPlan } from "~/services/auth.server";
import { calculateHoraNu, HORA_NU_PLANETS } from "@phopephum/engine";
import { HoraNuChart } from "~/components/hora-thai-nu/HoraNuChart";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "โหรทายหนู — ผังยามพยากรณ์แม่นยำ — PhopePhum" },
  { name: "description", content: "ผังโหรทายหนู วงล้อ 12 ราศี 8 ทิศ ดาวประจำยาม คำนวณยามอัฐกาล 90 นาที ยามย่อย 7.5 นาที ยามซอย 3 นาที 45 วินาที พยากรณ์เฉพาะหน้าโดยไม่ต้องรู้วันเกิด" },
  { property: "og:type", content: "website" },
  { property: "og:title", content: "โหรทายหนู — ผังยามพยากรณ์แม่นยำ — PhopePhum" },
  { property: "og:description", content: "วงล้อทำนายยามแบบ 12 ราศี + 8 ทิศ + ดาวประจำยาม ศาสตร์โบราณแห่งกรุงศรีอยุธยา" },
  { property: "og:image", content: "https://phopephum.com/favicon.svg" },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "keywords", content: "โหรทายหนู, ผังยาม, วงล้อทำนาย, ยามอัฐกาล, ดาวเจ้ายาม, 12 ราศี, 8 ทิศ, โหราศาสตร์ไทย, PhopePhum" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireMinPlan("basic", request, env);
  // Cloudflare Workers run in UTC — shift to Asia/Bangkok (UTC+7)
  const nowUTC = new Date();
  const nowBangkok = new Date(nowUTC.getTime() + 7 * 60 * 60 * 1000);
  const data = calculateHoraNu(nowBangkok);
  return json({ data, serverTime: nowUTC.toISOString() });
}

// ─── Planet color helpers ─────────────────────────────────────────────────────
const P_BG:     Record<number, string> = {
  1:"rgba(239,68,68,0.12)",   2:"rgba(251,191,36,0.12)", 3:"rgba(249,115,22,0.12)",
  4:"rgba(16,185,129,0.12)",  5:"rgba(245,158,11,0.12)", 6:"rgba(236,72,153,0.12)",
  7:"rgba(139,92,246,0.12)",
};
const P_BORDER: Record<number, string> = {
  1:"rgba(239,68,68,0.35)",   2:"rgba(251,191,36,0.35)", 3:"rgba(249,115,22,0.35)",
  4:"rgba(16,185,129,0.35)",  5:"rgba(245,158,11,0.35)", 6:"rgba(236,72,153,0.35)",
  7:"rgba(139,92,246,0.35)",
};

// ─── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(initSeconds: number) {
  const [rem, setRem] = useState(initSeconds);
  useEffect(() => {
    setRem(initSeconds);
    const id = setInterval(() => setRem((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [initSeconds]);
  const m = Math.floor(rem / 60);
  const s = rem % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HoraThaiNuPage() {
  const { data, serverTime } = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();

  // Auto-refresh every 30 s
  useEffect(() => {
    const id = setInterval(revalidate, 30_000);
    return () => clearInterval(id);
  }, [revalidate]);

  const mainCD  = useCountdown(data.secondsRemainingMain);
  const subCD   = useCountdown(data.secondsRemainingSub);
  const microCD = useCountdown(data.secondsRemainingMicro);

  const pInfo = HORA_NU_PLANETS[data.currentPlanet]!;

  return (
    <div className="space-y-8">

      {/* ── Hero + Wheel ── */}
      <div className="flex flex-col items-center gap-6">

        {/* Title badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs tracking-widest uppercase"
          style={{ background:"rgba(198,169,107,0.1)", border:"1px solid rgba(198,169,107,0.25)", color:"#C6A96B" }}>
          <IconMouse /> โหรทายหนู — ผังวงล้อ 12 ราศี
        </div>

        {/* ════ ผังโหรทายหนู ════ */}
        <div className="w-full max-w-md">
          <HoraNuChart data={data} size={460} />
        </div>

        {/* Prediction card (sits directly under the wheel) */}
        <div className="w-full max-w-md rounded-2xl p-4 text-center space-y-1"
          style={{
            background: P_BG[data.currentPlanet],
            border: `1px solid ${P_BORDER[data.currentPlanet]}`,
            boxShadow: `0 0 24px ${pInfo.color}12`,
          }}>
          <p className="text-xs tracking-widest uppercase" style={{ color: pInfo.color }}>
            {pInfo.symbol} ดาว{data.currentPlanetName} · {data.currentStatusSymbol} {data.currentStatusLabel}
          </p>
          <p className="text-sm text-[#F8F6F1] leading-relaxed">{data.prediction}</p>
        </div>
      </div>

      {/* ── Yam Status Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        {/* Main yam */}
        <Card>
          <div className="p-4 space-y-3">
            <p className="text-xs text-[#94A3B8] tracking-widest uppercase">ยามใหญ่ (90 นาที)</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: P_BG[data.currentPlanet], border: `1px solid ${P_BORDER[data.currentPlanet]}`, color: pInfo.color }}>
                {pInfo.symbol}
              </div>
              <div>
                <p className="text-xl font-display font-bold text-[#F8F6F1]">ยามที่ {data.yamNumber}</p>
                <p className="text-sm" style={{ color: pInfo.color }}>ดาว{data.currentPlanetName}</p>
                <p className="text-xs text-[#94A3B8]">{data.mainPeriodStart}–{data.mainPeriodEnd}</p>
              </div>
            </div>
            <div className="rounded-xl p-2 text-center"
              style={{ background:"rgba(198,169,107,0.06)", border:"1px solid rgba(198,169,107,0.15)" }}>
              <p className="text-xs text-[#94A3B8] mb-0.5">เหลือ</p>
              <p className="font-mono text-xl font-bold text-[#C6A96B]">{mainCD}</p>
            </div>
          </div>
        </Card>

        {/* Sub-yam */}
        <Card>
          <div className="p-4 space-y-3">
            <p className="text-xs text-[#94A3B8] tracking-widest uppercase">ยามย่อย (7.5 นาที)</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-lg shrink-0"
                style={{ background:"rgba(75,111,174,0.12)", border:"1px solid rgba(75,111,174,0.3)", color:"#7BA4E8" }}>
                {data.subYamNumber}
              </div>
              <div>
                <p className="text-xl font-display font-bold text-[#F8F6F1]">ย่อยที่ {data.subYamNumber}</p>
                <p className="text-xs text-[#94A3B8]">{data.subPeriodStart}</p>
                <p className="text-xs text-[#94A3B8]">–{data.subPeriodEnd}</p>
              </div>
            </div>
            <div className="rounded-xl p-2 text-center"
              style={{ background:"rgba(75,111,174,0.08)", border:"1px solid rgba(75,111,174,0.2)" }}>
              <p className="text-xs text-[#94A3B8] mb-0.5">เหลือ</p>
              <p className="font-mono text-xl font-bold text-[#7BA4E8]">{subCD}</p>
            </div>
          </div>
        </Card>

        {/* Micro-yam */}
        <Card>
          <div className="p-4 space-y-3">
            <p className="text-xs text-[#94A3B8] tracking-widest uppercase">ยามซอย (3 น. 45 ว.)</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-lg shrink-0"
                style={{ background:"rgba(139,92,246,0.12)", border:"1px solid rgba(139,92,246,0.3)", color:"#A78BFA" }}>
                {data.microYamNumber}
              </div>
              <div>
                <p className="text-xl font-display font-bold text-[#F8F6F1]">ซอยที่ {data.microYamNumber}</p>
                <p className="text-xs text-[#94A3B8]">{data.dayName}</p>
                <p className="text-xs text-[#94A3B8]">ทิศ: {data.currentDirectionThai}</p>
              </div>
            </div>
            <div className="rounded-xl p-2 text-center"
              style={{ background:"rgba(139,92,246,0.08)", border:"1px solid rgba(139,92,246,0.2)" }}>
              <p className="text-xs text-[#94A3B8] mb-0.5">เหลือ</p>
              <p className="font-mono text-xl font-bold text-[#A78BFA]">{microCD}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Yam Schedule ── */}
      <Card>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-[#F8F6F1]">
              ตารางยามอัฐกาล — {data.phase === "day" ? "☀ กลางวัน" : "☾ กลางคืน"}
            </h2>
            <span className="text-xs text-[#94A3B8]">{data.dayName}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {data.yamSchedule.map((yam) => {
              const pi = HORA_NU_PLANETS[yam.planet]!;
              return (
                <div key={yam.periodNum}
                  className="rounded-xl p-3 transition-all"
                  style={{
                    background: yam.isCurrent ? P_BG[yam.planet] : "rgba(255,255,255,0.03)",
                    border: `1px solid ${yam.isCurrent ? P_BORDER[yam.planet] : "rgba(255,255,255,0.07)"}`,
                    boxShadow: yam.isCurrent ? `0 0 16px ${pi.color}18` : "none",
                  }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[#64748B]">ยาม {yam.periodNum}</span>
                    {yam.isCurrent && (
                      <span className="text-[10px] px-1 py-0.5 rounded-full font-bold"
                        style={{ background: `${pi.color}20`, color: pi.color }}>▶</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-lg" style={{ color: pi.color }}>{pi.symbol}</span>
                    <div>
                      <p className="text-xs font-semibold text-[#F8F6F1]">{pi.name}</p>
                      <p className="text-[10px] text-[#64748B] font-mono">{yam.startTime}–{yam.endTime}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#64748B]">ทิศ: {yam.direction}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── House Chart ── */}
      <Card>
        <div className="p-5">
          <div className="mb-4">
            <h2 className="font-display text-lg font-bold text-[#F8F6F1]">ผังภพ 12 หลัง</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">ราศีพฤษภ = ภพลัคนาที่ 1 เสมอ · ดาวทอง = ดาวประจำยามปัจจุบัน</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {data.houseChart.map((house) => {
              const lordColor = HORA_NU_PLANETS[house.lordPlanet]?.color ?? "#94A3B8";
              const isActive  = house.isCurrentYam;
              const isSecond  = house.isSecondaryKaset;
              return (
                <div key={house.houseNum}
                  className="rounded-xl p-2.5 space-y-1"
                  style={{
                    background: isActive ? P_BG[data.currentPlanet] : isSecond ? "rgba(198,169,107,0.05)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isActive ? P_BORDER[data.currentPlanet] : isSecond ? "rgba(198,169,107,0.2)" : "rgba(255,255,255,0.06)"}`,
                  }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#64748B]">ภพ {house.houseNum}</span>
                    <span className="text-xs" style={{ color: house.lordStatusColor }}>
                      {house.lordStatusSymbol}
                    </span>
                  </div>
                  <p className="text-xs font-bold" style={{ color: isActive ? data.currentPlanetColor : "#C6A96B" }}>
                    {house.houseName}
                  </p>
                  <p className="text-[10px] text-[#94A3B8]">{house.zodiacName}</p>
                  <p className="text-[10px]" style={{ color: isActive ? data.currentPlanetColor : lordColor + "cc" }}>
                    {house.lordSymbol} {house.lordName}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── Status Legend ── */}
      <Card>
        <div className="p-5">
          <h2 className="font-display text-base font-bold text-[#F8F6F1] mb-3">สัญลักษณ์สถานะดาว</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {STATUS_LEGEND.map((s) => (
              <div key={s.symbol} className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-lg shrink-0" style={{ color: s.color }}>{s.symbol}</span>
                <div>
                  <p className="text-xs font-semibold text-[#F8F6F1]">{s.label}</p>
                  <p className="text-[10px] text-[#64748B]">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Lord Tracking Guide ── */}
      <Card>
        <div className="p-5 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#F8F6F1]">วิธีตามดาวเจ้าเรือน</h2>
          <div className="space-y-2">
            {LORD_STEPS.map((step) => (
              <div key={step.n} className="flex gap-3 rounded-xl p-3"
                style={{ background:"rgba(198,169,107,0.05)", border:"1px solid rgba(198,169,107,0.12)" }}>
                <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold font-display"
                  style={{ background:"rgba(198,169,107,0.2)", color:"#C6A96B" }}>
                  {step.n}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#F8F6F1]">{step.title}</p>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Prediction Chat ── */}
      <HoraNuChat
        currentPlanet={data.currentPlanet}
        currentPlanetName={data.currentPlanetName}
        yamNumber={data.yamNumber}
      />

      {/* ── Footer ── */}
      <div className="text-center space-y-1 pb-4">
        <p className="text-xs text-[#475569]">อ้างอิง: ตำราโหรทายหนู อ.ประทีป อัครา (พ.ศ. 2528) · อัปเดตทุก 30 วินาที</p>
        <p className="text-xs text-[#475569]">
          เวลาเซิร์ฟเวอร์: {new Date(serverTime).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
        </p>
      </div>
    </div>
  );
}

// ─── Static data ──────────────────────────────────────────────────────────────
const STATUS_LEGEND = [
  { symbol: "△", color: "#C6A96B", label: "เกษตร",    desc: "บ้านดาว — พลังสูงสุด" },
  { symbol: "○", color: "#F59E0B", label: "มหาอุจจ์",  desc: "ยกชั้น — อัพสุดแกร่ง" },
  { symbol: "⬡", color: "#10B981", label: "ราชาโชค",  desc: "โชควาสนาพิเศษ" },
  { symbol: "□", color: "#8B5CF6", label: "มหาจักร",  desc: "พลังงานจักรวาล" },
  { symbol: "·", color: "#64748B", label: "กลาง",      desc: "สมดุล ปกติ" },
  { symbol: "⋮", color: "#94A3B8", label: "ประ",       desc: "อ่อนแอ อุปสรรค" },
  { symbol: "✳", color: "#EF4444", label: "นิจ",       desc: "ตกต่ำ — ระวัง" },
];

const LORD_STEPS = [
  { n:"1", title:"แปลคำถาม → ภพ",       desc:"ของหาย=กฎุมภะ · ลูกหลาน=ปุตตะ · โรค=อริ · คู่ครอง=ปัตนิ" },
  { n:"2", title:"หาราศีของภพ",          desc:"ดูในผังภพว่าภพนั้นตกอยู่ในราศีใด" },
  { n:"3", title:"ดาวเจ้าเรือนคือใคร",  desc:"ดูจากผังภพ 12 หลังว่าดาวอะไรปกครองราศีนั้น" },
  { n:"4", title:"สะกดรอยดาว",          desc:"ดาวเจ้าเรือนไปอยู่ภพใดในผังยาม? ภพนั้นคือคำตอบ" },
];

// ─── Chat categories & guides ────────────────────────────────────────────────
const CHAT_CATEGORIES = [
  { id: "ทั่วไป",          emoji: "✨", label: "ทั่วไป" },
  { id: "การเงิน/ธุรกิจ", emoji: "💰", label: "การเงิน" },
  { id: "ความรัก",         emoji: "❤️", label: "ความรัก" },
  { id: "การงาน/การเรียน", emoji: "💼", label: "การงาน" },
  { id: "สุขภาพ",          emoji: "🌿", label: "สุขภาพ" },
  { id: "ของหาย/เดินทาง", emoji: "🔍", label: "ของหาย" },
];

const QUESTION_GUIDES: Record<string, string[]> = {
  "ทั่วไป": [
    "วันนี้พลังงานดีไหม ควรทำอะไรเพื่อเสริมโชค?",
    "ช่วงนี้ควรตัดสินใจเรื่องใหญ่ไหม?",
    "มีเรื่องต้องระวังอะไรบ้างในช่วงนี้?",
  ],
  "การเงิน/ธุรกิจ": [
    "วันนี้เหมาะกับการลงทุนหรือทำธุรกิจไหม?",
    "โชคลาภจะเข้ามาทางไหน?",
    "ควรตัดสินใจเรื่องเงินตอนนี้ได้เลยไหม?",
    "ธุรกิจที่กำลังจะเริ่มมีโอกาสสำเร็จไหม?",
  ],
  "ความรัก": [
    "ความสัมพันธ์ตอนนี้เป็นยังไงบ้าง?",
    "คนที่ชอบอยู่รู้สึกยังไงกับเรา?",
    "เหมาะกับการเริ่มต้นความสัมพันธ์ใหม่ไหม?",
    "ควรบอกรักตอนนี้เลยไหม?",
  ],
  "การงาน/การเรียน": [
    "การสัมภาษณ์งานวันนี้จะผ่านไหม?",
    "ควรขอเลื่อนตำแหน่งหรือขึ้นเงินเดือนตอนนี้ไหม?",
    "การสอบหรืองานที่ต้องส่งจะสำเร็จไหม?",
    "ควรเปลี่ยนงานหรือเปล่า?",
  ],
  "สุขภาพ": [
    "สุขภาพโดยรวมช่วงนี้เป็นยังไง?",
    "ควรไปพบแพทย์หรือตรวจสุขภาพตอนนี้ไหม?",
    "อาการที่เป็นอยู่จะดีขึ้นเมื่อไหร่?",
  ],
  "ของหาย/เดินทาง": [
    "ของที่หายจะได้คืนไหม อยู่แถวไหน?",
    "การเดินทางวันนี้ปลอดภัยไหม?",
    "ควรออกเดินทางตอนนี้หรือรอก่อน?",
    "เดินทางทิศไหนดีที่สุดวันนี้?",
  ],
};

type ChatMsg = { role: "user" | "ai"; text: string };

function HoraNuChat({
  currentPlanet,
  currentPlanetName,
  yamNumber,
}: {
  currentPlanet: number;
  currentPlanetName: string;
  yamNumber: number;
}) {
  const [category, setCategory] = useState("ทั่วไป");
  const [input, setInput]       = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = useCallback(
    async (q: string) => {
      const question = q.trim();
      if (!question || streaming) return;

      setInput("");
      setError(null);
      setMessages((prev) => [...prev, { role: "user" as const, text: question }]);
      setStreaming(true);
      setMessages((prev) => [...prev, { role: "ai" as const, text: "" }]);

      try {
        const fd = new FormData();
        fd.append("question", question);
        fd.append("category", category);

        const res = await fetch("/api/hora-thai-nu-chat", { method: "POST", body: fd });

        if (!res.ok || !res.body) {
          const errBody = await res.json().catch(() => ({ error: "เกิดข้อผิดพลาด" })) as { error?: string };
          throw new Error(errBody.error ?? "เกิดข้อผิดพลาด");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let aiText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") break;
            try {
              const chunk = JSON.parse(raw) as { text?: string };
              if (chunk.text) {
                aiText += chunk.text;
                setMessages((prev) => {
                  const next = [...prev];
                  next[next.length - 1] = { role: "ai" as const, text: aiText };
                  return next;
                });
              }
            } catch { /* skip */ }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          return last?.role === "ai" && !last.text ? prev.slice(0, -1) : prev;
        });
      } finally {
        setStreaming(false);
      }
    },
    [category, streaming]
  );

  const guides = QUESTION_GUIDES[category] ?? QUESTION_GUIDES["ทั่วไป"]!;

  return (
    <Card>
      <div className="p-5 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: P_BG[currentPlanet], border: `1px solid ${P_BORDER[currentPlanet]}` }}>
            <IconChat />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-[#F8F6F1]">ถามโหรทายหนู</h2>
            <p className="text-xs text-[#64748B]">
              ยามที่ {yamNumber} · ดาว{currentPlanetName} เป็นเจ้ายาม · ตอบโดยอ้างอิงผังยามปัจจุบัน
            </p>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {CHAT_CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => setCategory(cat.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: category === cat.id ? "rgba(198,169,107,0.18)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${category === cat.id ? "rgba(198,169,107,0.45)" : "rgba(255,255,255,0.08)"}`,
                color: category === cat.id ? "#C6A96B" : "#94A3B8",
              }}>
              <span>{cat.emoji}</span><span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Quick guide chips */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-[#475569] tracking-widest uppercase">คำถามแนะนำ</p>
          <div className="flex flex-wrap gap-2">
            {guides.map((g) => (
              <button key={g} onClick={() => submit(g)} disabled={streaming}
                className="text-xs px-3 py-1.5 rounded-xl text-left transition-all disabled:opacity-40"
                style={{ background:"rgba(75,111,174,0.08)", border:"1px solid rgba(75,111,174,0.2)", color:"#7BA4E8" }}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Chat history */}
        {messages.length > 0 && (
          <div className="rounded-2xl p-3 space-y-3 max-h-96 overflow-y-auto"
            style={{ background:"rgba(2,6,23,0.6)", border:"1px solid rgba(255,255,255,0.06)" }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "ai" && (
                  <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-sm mt-0.5"
                    style={{ background:"rgba(198,169,107,0.15)", color:"#C6A96B" }}>☽</div>
                )}
                <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                  style={msg.role === "user" ? {
                    background:"rgba(75,111,174,0.15)", border:"1px solid rgba(75,111,174,0.25)", color:"#E2E8F0",
                  } : {
                    background:"rgba(198,169,107,0.07)", border:"1px solid rgba(198,169,107,0.15)", color:"#F8F6F1",
                  }}>
                  {msg.role === "ai" && !msg.text && streaming ? (
                    <span className="inline-flex gap-1 items-center" style={{ color:"#C6A96B" }}>
                      <span className="animate-pulse">●</span>
                      <span className="animate-pulse" style={{ animationDelay:"75ms" }}>●</span>
                      <span className="animate-pulse" style={{ animationDelay:"150ms" }}>●</span>
                    </span>
                  ) : (
                    <span style={{ whiteSpace:"pre-wrap" }}>{msg.text}</span>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs mt-0.5"
                    style={{ background:"rgba(75,111,174,0.2)", color:"#7BA4E8" }}>☉</div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl px-3 py-2 text-xs text-red-400"
            style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); } }}
            rows={2}
            placeholder="พิมพ์คำถามของคุณ… (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
            disabled={streaming}
            className="flex-1 resize-none rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all disabled:opacity-50"
            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(198,169,107,0.2)", color:"#F8F6F1", caretColor:"#C6A96B" }}
          />
          <button onClick={() => submit(input)} disabled={streaming || !input.trim()}
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
            style={{
              background: streaming || !input.trim() ? "rgba(198,169,107,0.1)" : "rgba(198,169,107,0.2)",
              border:"1px solid rgba(198,169,107,0.3)", color:"#C6A96B",
            }}>
            {streaming ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>

        <p className="text-[10px] text-[#334155] text-center">
          การพยากรณ์อ้างอิงจากยามโหรทายหนู ณ เวลาที่ถาม · ผลลัพธ์เป็นเพียงแนวทาง ไม่ใช่การตัดสินใจแทน
        </p>
      </div>
    </Card>
  );
}

// ─── Icon ─────────────────────────────────────────────────────────────────────
function IconChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#C6A96B" strokeWidth={1.8} className="w-4 h-4">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconMouse() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <ellipse cx="12" cy="12" rx="6" ry="9" />
      <path d="M12 3v5" strokeLinecap="round" />
      <circle cx="12" cy="10" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
