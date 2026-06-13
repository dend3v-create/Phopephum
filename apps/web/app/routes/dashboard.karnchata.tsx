import { json } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, useLoaderData, useSubmit } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile, requireMinPlan } from "~/services/auth.server";
import { calculateKarnchata, calculatePhopephum, gregorianToThaiLunarV3 } from "@phopephum/engine";
import { STAR_NAMES } from "@phopephum/types";
import type { Env } from "~/env.server";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { useState, useEffect, useRef, useMemo } from "react";

export const meta: MetaFunction = () => [
  { title: "ทำนายกาลชะตา V2.0 — PhopePhum" },
  { name: "description", content: "วิเคราะห์รหัสชะตาชีวิตระดับวินาทีด้วย 7 ตัว 9 ฐาน ผสมผสานระบบ Q&A แชทอัจฉริยะแบบเรียลไทม์" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { user, profile } = await requireMinPlan("basic", request, env);

  const now = new Date();
  const initialResult = calculateKarnchata(now);

  let phopephumResult = null;
  if (profile?.birth_date) {
    try {
      phopephumResult = await calculatePhopephum({
        birthDate: profile.birth_date,
        birthTime: profile.birth_time || "12:00",
        birthPlace: profile.birth_place || "กรุงเทพมหานคร",
      }, now);
    } catch (e) { /* fallback */ }
  }

  const thaiDateLabel = now.toLocaleDateString("th-TH", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  let lunarInfo: { moonPhaseText: string; isWaxing: boolean; lunarDay: number; thaiMonthName: string } | null = null;
  try {
    const lunar = gregorianToThaiLunarV3(now);
    lunarInfo = { moonPhaseText: lunar.moonPhaseText, isWaxing: lunar.isWaxing, lunarDay: lunar.lunarDay, thaiMonthName: lunar.thaiMonthName };
  } catch (e) { /* fallback */ }

  return json({ profile, initialResult, phopephumResult, thaiDateLabel, lunarInfo, currentTime: now.toISOString() });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const formData = await request.formData();
  const timeMode = formData.get("timeMode") as "live" | "custom";

  let targetDate = new Date();
  if (timeMode === "custom") {
    const tDay = Number(formData.get("customDay"));
    const tMonth = Number(formData.get("customMonth"));
    const tYear = Number(formData.get("customYear"));
    const tYearCE = tYear - 543;
    const timeStr = String(formData.get("customTime") || "12:00");
    const [th, tmin] = timeStr.split(":").map(Number);
    if (tDay && tMonth && tYear) {
      targetDate = new Date(Date.UTC(tYearCE, tMonth - 1, tDay, th - 7, tmin, 0));
    }
  }

  const result = calculateKarnchata(targetDate);
  let phopephumResult = null;
  const profile = await getProfile(user.id, request, env);
  if (profile?.birth_date) {
    try {
      phopephumResult = await calculatePhopephum({
        birthDate: profile.birth_date,
        birthTime: profile.birth_time || "12:00",
        birthPlace: profile.birth_place || "กรุงเทพมหานคร",
      }, targetDate);
    } catch (e) { /* fallback */ }
  }

  let lunarInfo: { moonPhaseText: string; isWaxing: boolean; lunarDay: number; thaiMonthName: string } | null = null;
  try {
    const lunar = gregorianToThaiLunarV3(targetDate);
    lunarInfo = { moonPhaseText: lunar.moonPhaseText, isWaxing: lunar.isWaxing, lunarDay: lunar.lunarDay, thaiMonthName: lunar.thaiMonthName };
  } catch (e) { /* fallback */ }

  return json({ result, phopephumResult, lunarInfo, timeMode });
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "work",     icon: "💼", label: "การงาน & เจรจา",       questions: ["การเจรจาตกลงทางธุรกิจในยามนี้จะประสบความสำเร็จหรือไม่?", "สภาพแวดล้อมหรือโอกาสความก้าวหน้าในยามนี้มีลักษณะอย่างไร?", "อยากเริ่มต้นโครงการงานใหม่ในนาทีนี้ควรทำทันทีหรือควรรอ?"] },
  { id: "wealth",   icon: "💎", label: "การเงิน & โชคลาภ",     questions: ["จังหวะนี้เหมาะกับการเสี่ยงโชคหรือลงทุนหรือไม่?", "เงินที่รอคอยอยู่จะได้รับภายในระยะเวลาอันใกล้นี้ไหม?", "ควรระมัดระวังการใช้จ่ายหรือจะเสียทรัพย์ในยามนี้หรือไม่?"] },
  { id: "love",     icon: "💖", label: "ความรัก & เมตตา",      questions: ["คนที่นึกถึงตอนนี้เขามีความรู้สึกอย่างไรกับเรา?", "การปรับความเข้าใจหรือสารภาพรักในเวลานี้จะราบรื่นไหม?", "ผู้ใหญ่หรือผู้บังคับบัญชาจะเมตตาเอ็นดูเราหรือไม่ในจังหวะนี้?"] },
  { id: "health",   icon: "💊", label: "สุขภาพ & เจ็บไข้",    questions: ["อาการป่วยที่เป็นอยู่จะทุเลาลงหรือต้องระวังภาวะแทรกซ้อน?", "ควรไปพบแพทย์หรือเปลี่ยนวิธีการรักษาในเวลานี้หรือไม่?", "คนป่วยที่นึกถึงมีเกณฑ์ฟื้นตัวในทิศทางใด?"] },
  { id: "travel",   icon: "🧭", label: "การเดินทาง & ทิศมงคล", questions: ["การเดินทางไปทิศ...ในยามนี้จะปลอดภัยและราบรื่นไหม?", "ควรหลีกเลี่ยงการเดินทางไปยังทิศใดเพื่อป้องกันอุปสรรค?", "จะพบโชคลาภหรือคนช่วยเหลือระหว่างการเดินทางหรือไม่?"] },
  { id: "obstacle", icon: "⚠️", label: "อุปสรรค & แก้เคล็ด",  questions: ["ปัญหาที่กำลังเผชิญหน้าอยู่จะมีทางออกหรือมีคนช่วยไหม?", "มีสิ่งใดที่กำลังขัดขวางความสำเร็จและควรแก้เคล็ดอย่างไร?", "ของที่สูญหายจะได้คืนหรือไม่ หรือควรค้นหาในทิศใด?"] },
];

const BHOP_NATAL_NAMES = [
  ["อัตตะ","หินะ","ธนัง","ปิตา","มาตา","โภคา","มัชฌิมา"],
  ["ตนุ","กฎุมภะ","สหัชชะ","พันธุ","ปุตตะ","อริ","ปัตนิ"],
  ["มรณะ","ศุภะ","กัมมะ","ลาภะ","พยายะ","ทาสา","ทาสี"],
];
const BASE4_POWER_NAMES: Record<number, string> = {
  3:"อังคารเล็ก", 4:"พุธเล็ก", 5:"พฤหัสเล็ก", 6:"พระอาทิตย์", 7:"เสาร์เล็ก",
  8:"อังคารใหญ่", 9:"พระเกตุ", 10:"พระเสาร์", 11:"ราชาโชค", 12:"พระราหู",
  13:"มหาอุจ", 14:"จักรพรรดิ", 15:"พระจันทร์", 16:"โสฬสมงคล",
  17:"พุธใหญ่", 18:"มหาจักรพรรดิ์", 19:"พระพฤหัส", 20:"เสาร์ใหญ่", 21:"พระศุกร์",
};
const BHOP_8_NAMES = ["อาตมะ","ทาสา","สิทธิโชค","โภคทรัพย์","โจร","อุบาทว์","อุปถัมภ์"];
const BHOP_9_NAMES = ["อัตตะ","สักกะ","ญาติ","ธนัง","เคหัง","นาวัง","ภริยัง"];
const PLANET_COLORS_BY_NUM: Record<number, string> = {
  1:"#EF4444", 2:"#FBBF24", 3:"#F97316", 4:"#10B981", 5:"#F59E0B", 6:"#EC4899", 7:"#8B5CF6",
};
const CHALDEAN_SEQ = [7, 5, 3, 1, 6, 4, 2] as const;
const _SEQ = [6, 1, 2, 3, 4, 7, 5, 8] as const;
const _BHOP = ["บริวาร","อายุ","เดช","ศรี","มูละ","อุตสาหะ","มนตรี","กาลกิณี"] as const;
const THAI_NUMS = ["๑","๒","๓","๔","๕","๖","๗","๘","๙"] as const;

const TAKSA_PLAN_ADVICE: Record<string, { emoji: string; th: string; level: 0|1|2|3 }> = {
  "บริวาร":  { emoji: "👥", th: "ประชุม บริหารทีม รับสั่งการ",           level: 2 },
  "อายุ":    { emoji: "🧘", th: "ดูแลสุขภาพ พักฟื้น ออกกำลังกาย",       level: 2 },
  "เดช":     { emoji: "⚡", th: "ตัดสินใจ เจรจาดีล ปิดสัญญา",           level: 3 },
  "ศรี":     { emoji: "💰", th: "ลงทุน ทำธุรกรรม รับโชคลาภ",            level: 3 },
  "มูละ":    { emoji: "🌱", th: "วางรากฐาน ริเริ่มโครงการระยะยาว",      level: 3 },
  "อุตสาหะ": { emoji: "💪", th: "ทำงานหนัก ขยัน ทุ่มเทความพยายาม",      level: 2 },
  "มนตรี":   { emoji: "🤝", th: "ใช้เส้นสาย หาพันธมิตร เจรจาชั้นสูง",  level: 3 },
  "กาลกิณี": { emoji: "⚠️", th: "ระวัง! หลีกเลี่ยงการตัดสินใจสำคัญ",   level: 0 },
};

const QUALITY_SCORES: Record<string, { trade: number; love: number; wealth: number; danger: number }> = {
  "บริวาร":  { trade: 65, love: 68, wealth: 60, danger: 15 },
  "อายุ":    { trade: 55, love: 72, wealth: 55, danger: 12 },
  "เดช":     { trade: 95, love: 60, wealth: 80, danger: 5  },
  "ศรี":     { trade: 75, love: 88, wealth: 95, danger: 5  },
  "มูละ":    { trade: 80, love: 58, wealth: 90, danger: 8  },
  "อุตสาหะ": { trade: 72, love: 56, wealth: 65, danger: 12 },
  "มนตรี":   { trade: 90, love: 82, wealth: 75, danger: 5  },
  "กาลกิณี": { trade: 20, love: 22, wealth: 15, danger: 85 },
};

const YAM_DESC: Record<number, { subtitle: string; desc: string; decision: string }> = {
  1: { subtitle:"อำนาจ/ผู้นำ",         desc:"ช่วงเวลาแห่งอำนาจบารมี เหมาะสำหรับการเป็นผู้นำ ตัดสินใจเด็ดขาด",                    decision:"เจรจากับผู้ใหญ่ ผู้มีอำนาจ หรือออกคำสั่งสำคัญได้ผลดีมาก" },
  2: { subtitle:"ความรู้สึก/ครอบครัว", desc:"ช่วงเวลาแห่งความรู้สึก เหมาะสำหรับการดูแลครอบครัว สร้างความสัมพันธ์",              decision:"เจรจาด้วยความอ่อนโยน ดูแลคนรัก หรือแก้ปัญหาครอบครัว" },
  3: { subtitle:"พลังงาน/ความกล้า",    desc:"ช่วงเวลาแห่งพลังงาน เหมาะสำหรับงานที่ต้องใช้กำลังและความกล้าหาญ",                 decision:"เริ่มงานที่ต้องพลังงานสูง แต่ระวังอารมณ์ร้อนและการทะเลาะวิวาท" },
  4: { subtitle:"สติปัญญา/การสื่อสาร", desc:"ช่วงเวลาแห่งสติปัญญา เหมาะสำหรับการเรียนรู้ เจรจาต่อรอง และงานสื่อสาร",         decision:"เซ็นสัญญา เจรจาสัญญา หรือนำเสนองานสำคัญ" },
  5: { subtitle:"ปัญญา/โชคลาภ",        desc:"ช่วงเวลาแห่งปัญญาและโชคลาภ เหมาะสำหรับการขอพร ขยายกิจการ ลงทุน",               decision:"ลงทุน ขยายธุรกิจ หรือขอพรสิ่งศักดิ์สิทธิ์" },
  6: { subtitle:"ความรัก/ศิลปะ",       desc:"ช่วงเวลาแห่งความรักและศิลปะ เหมาะสำหรับการสารภาพรัก สร้างมิตรภาพ และความงาม", decision:"สารภาพรัก สร้างมิตรภาพ หรืองานสร้างสรรค์ศิลปะ" },
  7: { subtitle:"ความมั่นคง/อดทน",     desc:"ช่วงเวลาแห่งความมั่นคง เหมาะสำหรับงานระยะยาว วางรากฐาน ปฏิบัติงานที่อดทน",    decision:"งานระยะยาว วางรากฐาน หรือสิ่งที่ต้องอดทนรอผล" },
};

const YAM_OMEN: Record<number, string> = {
  1: "อาทิตย์อวสาน ยาตราทำการ มิตีหนักหนา ได้เมื่อช่างทอง จำลองพระสิทธา แค้นเคืองหนักหนา มยุรากลืนแหวน",
  2: "จันทร์สาดแสงฉาย เมตตาอภัย สมบัติงามดี มีมิตรสหาย กายใจสบาย พ้นภัยพิบัติ ประกาศเกียรติยศ",
  3: "อังคารเดินทาง ระวางอันตราย อย่าไปทิศตะวันออก โลหกิจเจริญ เผ็ดร้อนเกริ่นกราย ชนะศัตรูได้",
  4: "พุธทรงปรีชา วาจาว่องไว พ่อค้าโชคดี มีกำไรงาม เจรจาสำเร็จ เลิศทางสติปัญญา ค้าขายวันนี้",
  5: "พฤหัสบดีโชค ปลดโศกทุกข์พ้น ทรัพย์สมบัติล้น ผลบุญส่งเสริม เพิ่มพูนความเจริญ เกริ่นชื่อเสียงดี",
  6: "ศุกร์งามพริ้งเพรา เสน่ห์เพริดแพร้ว รักหวานชื่นชม สมหวังทุกสิ่ง ยิ่งเมตตาดี มีสุขสมบูรณ์",
  7: "เสาร์หนักขวาง ระวางสิ่งร้าย อย่างระวังภัย ใจอดทนดี มีความมั่นคง คงชนะอุปสรรค พรากจากเสนียด",
};

// ─── Chart Component ──────────────────────────────────────────────────────────

function NineBaseChart({
  chart,
  hoverNum,
  setHoverNum,
  title,
  subtitle,
  base1Label = "ฐาน๑",
}: {
  chart: number[][];
  hoverNum: number | null;
  setHoverNum: (n: number | null) => void;
  title: string;
  subtitle: string;
  base1Label?: string;
}) {
  const connectionItems = useMemo(() => {
    if (hoverNum === null) return [];
    const items: Array<{ rIdx: number; colIdx: number; bhopName: string; baseThai: string }> = [];
    chart.forEach((row, rIdx) => {
      if (!Array.isArray(row)) return;
      const colIdx = row.indexOf(hoverNum);
      if (colIdx !== -1) {
        let bhopName = "";
        if (rIdx < 3) bhopName = BHOP_NATAL_NAMES[rIdx]?.[colIdx] ?? "";
        else if (rIdx === 7) bhopName = BHOP_8_NAMES[colIdx] ?? "";
        else if (rIdx === 8) bhopName = BHOP_9_NAMES[colIdx] ?? "";
        items.push({ rIdx, colIdx, bhopName, baseThai: THAI_NUMS[rIdx] });
      }
    });
    return items;
  }, [hoverNum, chart]);

  return (
    <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-6 sm:p-8 relative">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1">
          <h3 className="text-base font-bold text-[#F8F6F1]">{title}</h3>
          <p className="text-xs text-[#8A8070] mt-0.5">{subtitle}</p>
        </div>
        {hoverNum !== null && (
          <button type="button" onClick={() => setHoverNum(null)} className="shrink-0 text-xs text-[#8A8070] hover:text-[#F8F6F1] border border-white/10 px-3 py-1 rounded-lg">✕ ล้าง</button>
        )}
      </div>

      {hoverNum !== null && (
        <div className="mb-4 bg-[#071427]/75 border border-[#C6A96B]/30 rounded-xl p-3 animate-in fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold ring-2 ring-[#C6A96B] text-[#F8F6F1]">{hoverNum}</div>
            <p className="text-sm font-bold text-[#C6A96B]">ดาว {STAR_NAMES[hoverNum as keyof typeof STAR_NAMES]}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {connectionItems.map((occ, i) => (
              <div key={i} className="bg-[#071427]/75 border border-[#C6A96B]/12 rounded px-2 py-1 text-[10px] text-[#F8F6F1]">
                <span className="text-[#C6A96B] font-bold">ฐาน{occ.baseThai}</span> {occ.bhopName}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[340px] space-y-1.5">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((rIdx) => {
            const rowData = chart[rIdx] ?? [];
            if (rowData.length === 0) return null;
            const label = rIdx === 0 ? base1Label : `ฐาน${THAI_NUMS[rIdx]}`;
            const isBase4 = rIdx === 3;

            if (isBase4) {
              return (
                <div key={rIdx} className="flex items-stretch gap-2 bg-[#0A2240]/25 border border-[#6D8FC7]/15 rounded-xl py-1 px-1">
                  <div className="w-14 shrink-0 flex items-center justify-end">
                    <span className="text-[12px] font-black text-[#6D8FC7]">{label}</span>
                  </div>
                  <div className="flex-1 grid grid-cols-7 gap-1">
                    {rowData.map((s, cIdx) => (
                      <div key={cIdx} className="relative flex flex-col items-center justify-center rounded-lg border py-1.5 px-0.5 min-h-[50px] sm:min-h-[64px] bg-[#071E3D]/75 border-[#6D8FC7]/22 hover:border-[#C6A96B]/30 transition-all">
                        <span className="font-display text-[17px] sm:text-[22px] text-[#F8F6F1] font-bold leading-none">{s}</span>
                        <span className="text-[8px] text-[#F8F6F1]/32 truncate w-full text-center px-1 mt-0.5">{BASE4_POWER_NAMES[s]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <div key={rIdx} className="flex items-stretch gap-2">
                <div className="w-14 shrink-0 flex items-center justify-end">
                  <span className="text-[12px] font-black text-[#C6A96B]">{label}</span>
                </div>
                <div className="flex-1 grid grid-cols-7 gap-1">
                  {rowData.map((s, cIdx) => {
                    const bhopName = rIdx < 3 ? (BHOP_NATAL_NAMES[rIdx]?.[cIdx] ?? "") : rIdx === 7 ? BHOP_8_NAMES[cIdx] : rIdx === 8 ? BHOP_9_NAMES[cIdx] : "";
                    const isActive = hoverNum === s;
                    return (
                      <button key={cIdx} onClick={() => setHoverNum(isActive ? null : s)}
                        className={`relative flex flex-col items-center justify-center rounded-lg border py-1.5 px-0.5 min-h-[50px] sm:min-h-[64px] transition-all duration-200 ${
                          isActive
                            ? "bg-[#0A1A30]/90 border-[#C6A96B]/60 shadow-[0_0_16px_rgba(198,169,107,0.22),inset_0_1px_0_rgba(198,169,107,0.10)] scale-[1.06] z-10"
                            : "bg-[#071427]/75 border-[#C6A96B]/18 hover:border-[#C6A96B]/32"
                        }`}>
                        <span className={`font-display text-[17px] sm:text-[22px] leading-none text-[#F8F6F1] ${isActive ? "font-black" : "font-bold"}`}>{s}</span>
                        {bhopName && <span className="text-[8px] text-[#F8F6F1]/32 truncate w-full text-center px-1 mt-0.5">{bhopName}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className="flex flex-col items-center bg-[#020617] border border-white/5 rounded-2xl p-4">
      <span className="text-xs text-[#8A8070] font-bold mb-1">{label}</span>
      <span className={`text-2xl font-display font-bold ${colorClass}`}>{value}%</span>
      <div className="w-full mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorClass.replace("text-", "bg-")}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ─── Summary Card (Section 1) ─────────────────────────────────────────────────

function SummaryCard({
  title,
  starName,
  starNum,
  quality,
  yamDesc,
  omen,
  scores,
  extraInfo,
}: {
  title: string;
  starName: string;
  starNum: number;
  quality: string;
  yamDesc: { subtitle: string; desc: string; decision: string };
  omen?: string;
  scores: { trade: number; love: number; wealth: number; danger: number };
  extraInfo?: React.ReactNode;
}) {
  const advice = TAKSA_PLAN_ADVICE[quality];
  const levelColor = advice?.level === 3 ? "text-[#C6A96B] border-[#C6A96B]/40" : advice?.level === 0 ? "text-[#6D8FC7] border-[#6D8FC7]/40" : "text-[#D9BC82] border-[#D9BC82]/40";

  return (
    <Card className="border-[#C6A96B]/20 bg-[#020617] p-6 sm:p-8 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-[#C6A96B]/3 blur-3xl pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-5 gap-4">
          <div>
            <span className="text-[#C6A96B] text-xs tracking-widest uppercase font-bold block mb-1">✦ {title}</span>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-[#F8F6F1] leading-none">
              {starName}
              <span className="text-lg ml-3 text-[#8A8070]">({starNum})</span>
            </h2>
            <p className="text-sm text-[#8A8070] mt-1">{yamDesc.subtitle}</p>
          </div>
          {advice && (
            <div className={`shrink-0 border rounded-2xl px-4 py-2 text-center ${levelColor}`}>
              <p className="text-lg">{advice.emoji}</p>
              <p className="text-xs font-bold">{quality}</p>
              <p className="text-[10px] opacity-70">ระดับ {advice.level}/3</p>
            </div>
          )}
        </div>

        <div className="bg-[#0A1628] border border-white/5 rounded-2xl p-4 mb-5">
          <p className="text-sm text-[#D9CDB7] leading-relaxed mb-3">{yamDesc.desc}</p>
          <div className="border-t border-white/5 pt-3">
            <p className="text-xs text-[#C6A96B] font-bold mb-1">🎯 คำแนะนำสำหรับการตัดสินใจ</p>
            <p className="text-sm text-[#F8F6F1] leading-relaxed">{yamDesc.decision}</p>
          </div>
          {advice && (
            <div className="border-t border-white/5 pt-3 mt-3">
              <p className="text-xs text-[#8A8070] font-bold mb-1">✦ กิจกรรมเหมาะสม</p>
              <p className="text-sm text-[#D9CDB7]">{advice.th}</p>
            </div>
          )}
          {omen && (
            <p className="text-xs text-[#8A8070] italic mt-3 border-t border-white/5 pt-3">"{omen}"</p>
          )}
        </div>

        {extraInfo && <div className="mb-5">{extraInfo}</div>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ScoreBar label="การค้า"  value={scores.trade}  colorClass="text-[#C6A96B]" />
          <ScoreBar label="ความรัก" value={scores.love}   colorClass="text-[#D9BC82]" />
          <ScoreBar label="โชคลาภ" value={scores.wealth}  colorClass="text-[#C6A96B]" />
          <ScoreBar label="ภัยอันตราย" value={scores.danger} colorClass="text-[#6D8FC7]" />
        </div>
      </div>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KarnchataPage() {
  const { profile, initialResult, phopephumResult: initialPhopephum, thaiDateLabel, lunarInfo: initialLunar } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const activeResult = actionData?.result || initialResult;
  const activePhopephum = actionData?.phopephumResult || initialPhopephum;
  const activeLunar = actionData?.lunarInfo ?? initialLunar;

  const [hoverNum, setHoverNum] = useState<number | null>(null);
  const [timeMode, setTimeMode] = useState<"live" | "custom">("live");
  const [selectedCategory, setSelectedCategory] = useState("work");
  const [time, setTime] = useState<Date>(new Date());
  const [selectedYamKey, setSelectedYamKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"daily" | "hourly" | "minute">("hourly");

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      if (timeMode === "live") {
        const form = new FormData();
        form.append("timeMode", "live");
        submit(form, { method: "post", replace: true });
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [timeMode, submit]);

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  const bkkHour = (time.getUTCHours() + 7) % 24;
  const isDaytime = bkkHour >= 6 && bkkHour < 18;
  const yamSeq = Math.floor(((bkkHour - 6 + 24) % 24) / 1.5) % 8; // 0-indexed
  const yaiN = activeResult.yamYaiNumber || 1;
  const soyN = activeResult.yamSoyNumber || 1;

  // ยามซอย 3.75 นาที
  const soySlot = Math.floor((time.getUTCMinutes() % 30) / 3.75) + 1; // 1-8
  const secInCycle = (time.getUTCMinutes() % 30 * 60 + time.getUTCSeconds()) % Math.round(3.75 * 60);
  const cycleSec = Math.round(3.75 * 60);
  const lagnamPos = secInCycle < cycleSec / 3 ? "ยามต้น" : secInCycle < (cycleSec * 2) / 3 ? "ยามกลาง" : "ยามปลาย";

  // Taksa map (ยามใหญ่ → คุณภาพ)
  const dayStarN = (activeResult.dayStarNumber ?? 1) as number;
  const _si = _SEQ.indexOf(yaiN as any);
  const taksaYamMap: Record<string, number> = {};
  if (_si !== -1) { for (let i = 0; i < 8; i++) { taksaYamMap[_BHOP[i]] = _SEQ[(_si + i) % 8]; } }

  // คุณภาพยามปัจจุบัน
  const currentYamQuality = useMemo(() => {
    return Object.entries(taksaYamMap).find(([, num]) => num === yaiN)?.[0] ?? "";
  }, [taksaYamMap, yaiN]);

  // คุณภาพยามซอยปัจจุบัน
  const currentSoyQuality = useMemo(() => {
    return Object.entries(taksaYamMap).find(([, num]) => num === soyN)?.[0] ?? "";
  }, [taksaYamMap, soyN]);

  // คะแนนตามคุณภาพ
  const yamScores = QUALITY_SCORES[currentYamQuality] ?? { trade: 50, love: 50, wealth: 50, danger: 20 };
  const soyScores = QUALITY_SCORES[currentSoyQuality] ?? { trade: 50, love: 50, wealth: 50, danger: 20 };

  // ตารางยาม 16 ยาม
  const dayYamTable = useMemo(() => {
    const chaldIdx = CHALDEAN_SEQ.indexOf(dayStarN as any);
    const dayStarPos8 = _SEQ.indexOf(dayStarN as any);
    return Array.from({ length: 16 }, (_, i) => {
      const cIdx = chaldIdx !== -1 ? (chaldIdx + i) % 7 : i % 7;
      const star = CHALDEAN_SEQ[cIdx];
      const isDay = i < 8;
      const slot = i % 8;
      const hf = (isDay ? 6 : 18) + slot * 1.5;
      const ef = hf + 1.5;
      const fmt = (h: number, m: number) => `${String(Math.floor(h) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const timeStr = `${fmt(hf, hf % 1 ? 30 : 0)}–${fmt(ef, ef % 1 ? 30 : 0)}`;
      const yamStarPos8 = _SEQ.indexOf(star as any);
      const qualIdx = dayStarPos8 !== -1 && yamStarPos8 !== -1 ? (yamStarPos8 - dayStarPos8 + 8) % 8 : -1;
      const quality = qualIdx !== -1 ? (_BHOP[qualIdx] ?? "") : "";
      const bkkH = (time.getUTCHours() + 7) % 24;
      const totalMin = bkkH * 60 + time.getUTCMinutes();
      const slotStartMin = (isDay ? 6 : 18) * 60 + slot * 90;
      // Fix: night slots after midnight (slotStartMin ≥ 1440 → 00:00–06:00)
      const isCurrentYam = slotStartMin < 1440
        ? totalMin >= slotStartMin && totalMin < slotStartMin + 90
        : totalMin < 360 && totalMin >= slotStartMin - 1440 && totalMin < slotStartMin - 1440 + 90;
      return { yamNum: slot + 1, isDay, star, timeStr, quality, qualIdx, isCurrentYam };
    });
  }, [activeResult, time]);

  // ตาราง Yam Soy ในยามปัจจุบัน (minute tab Section 3)
  const yamSoyTable = useMemo(() => {
    const chalIdx = CHALDEAN_SEQ.indexOf(yaiN as any);
    const yamStartMin = (isDaytime ? 6 : 18) * 60 + yamSeq * 90;
    const dayStarPos8 = _SEQ.indexOf(dayStarN as any);
    return Array.from({ length: 8 }, (_, i) => {
      const planet = chalIdx !== -1 ? CHALDEAN_SEQ[(chalIdx + i) % 7] : 1;
      const slotStartMin = yamStartMin + Math.round(i * 3.75);
      const slotEndMin = yamStartMin + Math.round((i + 1) * 3.75);
      const fmt = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      const timeStr = `${fmt(slotStartMin)}–${fmt(slotEndMin)}`;
      const pos8 = _SEQ.indexOf(planet as any);
      const qualIdx = dayStarPos8 !== -1 && pos8 !== -1 ? (pos8 - dayStarPos8 + 8) % 8 : -1;
      const quality = qualIdx !== -1 ? (_BHOP[qualIdx] ?? "") : "";
      const isCurrent = soySlot - 1 === i;
      return { slot: i + 1, planet, timeStr, quality, isCurrent };
    });
  }, [yaiN, isDaytime, yamSeq, dayStarN, soySlot]);

  // วิเคราะห์ยามดีเด่นของวัน
  const bestDayYams = useMemo(() => dayYamTable.filter(y => TAKSA_PLAN_ADVICE[y.quality]?.level === 3), [dayYamTable]);
  const worstDayYam = useMemo(() => dayYamTable.find(y => y.quality === "กาลกิณี"), [dayYamTable]);

  // Daily summary scores (เฉลี่ยจากยามดี)
  const dailyScores = useMemo(() => {
    if (bestDayYams.length === 0) return { trade: 50, love: 50, wealth: 50, danger: 30 };
    const avg = (key: keyof typeof QUALITY_SCORES[string]) =>
      Math.round(bestDayYams.reduce((s, y) => s + (QUALITY_SCORES[y.quality]?.[key] ?? 50), 0) / bestDayYams.length);
    return { trade: avg("trade"), love: avg("love"), wealth: avg("wealth"), danger: avg("danger") };
  }, [bestDayYams]);

  const activeCategory = CATEGORIES.find(c => c.id === selectedCategory);

  // Chat
  const [chatMessages, setChatMessages] = useState([{ sender: "ai", text: "สวัสดีครับ พร้อมวิเคราะห์จังหวะชีวิตเรียลไทม์แล้วครับ ท่านอยากตรวจสอบเรื่องใด?", time: "" }]);
  const [userInput, setUserInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const doChatFetch = async (q: string) => {
    setChatMessages(prev => [...prev, { sender: "user", text: q, time: "" }, { sender: "ai", text: "กำลังเชื่อมต่อกระแสญาณ...", time: "" }]);
    setUserInput("");
    try {
      const formData = new FormData();
      formData.append("question", q);
      formData.append("category", CATEGORIES.find(c => c.id === selectedCategory)?.label || "ทั่วไป");
      formData.append("targetDate", time.toISOString());
      const res = await fetch("/api/karnchata-chat", { method: "POST", body: formData });
      if (!res.ok) throw new Error("API Error");
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (line.trim().startsWith("data: ")) {
              const raw = line.slice(6).trim();
              if (raw === "[DONE]") break;
              try { const p = JSON.parse(raw); if (p.text) aiText += p.text; } catch (e) {}
            }
          }
          setChatMessages(prev => { const a = [...prev]; a[a.length - 1] = { sender: "ai", text: aiText, time: "" }; return a; });
        }
      }
    } catch (e) {
      setChatMessages(prev => { const a = [...prev]; a[a.length - 1] = { sender: "ai", text: "ขออภัยครับ กระแสญาณขัดข้องชั่วคราว", time: "" }; return a; });
    }
  };

  const handleSendChat = (e: React.FormEvent) => { e.preventDefault(); if (userInput.trim()) doChatFetch(userInput); };

  const yamDesc = YAM_DESC[yaiN] || YAM_DESC[1];
  const soyDesc = YAM_DESC[soyN] || YAM_DESC[1];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[#C6A96B] text-xs tracking-[0.25em] uppercase font-bold block mb-1">✦ คัมภีร์พยากรณ์ลับเฉพาะกาล</span>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#F8F6F1] mb-2">ทำนายกาลชะตา V2.0</h1>
          <p className="text-[#D9CDB7] text-sm leading-relaxed max-w-xl">วิเคราะห์รหัสชะตาชีวิตด้วย 7 ตัว 9 ฐาน รายวัน / รายชั่วโมง / รายนาที (3.45 นาที)</p>
        </div>
        <div className="bg-[#C6A96B]/8 border border-[#C6A96B]/20 px-5 py-3 rounded-2xl self-start shrink-0">
          <p className="text-xs text-[#C6A96B] uppercase font-bold">วันกาลชะตา</p>
          <p className="text-sm font-bold text-[#F8F6F1]">{thaiDateLabel}</p>
          {activeLunar && <p className="text-xs text-[#8A8070] mt-0.5">{activeLunar.moonPhaseText} เดือน{activeLunar.thaiMonthName}</p>}
        </div>
      </div>

      {/* Time mode toggle */}
      <div className="bg-[#0A1628]/80 border border-white/5 rounded-2xl p-2">
        <div className="flex bg-[#020617] rounded-xl p-1 border border-white/5">
          <button onClick={() => setTimeMode("live")} className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${timeMode === "live" ? "bg-[#1E1730] text-[#F8F6F1]" : "text-[#8A8070]"}`}>⏱ เรียลไทม์</button>
          <button onClick={() => setTimeMode("custom")} className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${timeMode === "custom" ? "bg-[#C6A96B] text-[#020617]" : "text-[#8A8070]"}`}>📅 เลือกวัน/เวลา</button>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex bg-[#0A1628]/60 p-1.5 rounded-2xl border border-white/5 gap-1.5 sticky top-2 z-30 backdrop-blur-xl">
        {[
          { id: "daily",  label: "รายวัน",      icon: "📅" },
          { id: "hourly", label: "รายชั่วโมง",   icon: "⏱" },
          { id: "minute", label: "รายนาที 3.45", shortLabel: "นาที", icon: "🎯" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === tab.id ? "bg-[#C6A96B] text-[#020617]" : "text-[#8A8070] hover:text-[#F8F6F1]"}`}>
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{"shortLabel" in tab ? tab.shortLabel : tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════════ TAB: รายวัน ═══════════════ */}
      {activeTab === "daily" && (
        <>
          {/* Section 1: สรุปรายวัน */}
          <SummaryCard
            title={`สรุปกาลชะตาวันนี้ — ดาวประจำวัน ${STAR_NAMES[dayStarN as keyof typeof STAR_NAMES]}`}
            starName={STAR_NAMES[dayStarN as keyof typeof STAR_NAMES] ?? ""}
            starNum={dayStarN}
            quality={currentYamQuality}
            yamDesc={yamDesc}
            omen={YAM_OMEN[yaiN]}
            scores={dailyScores}
            extraInfo={
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#071427]/75 border border-[#C6A96B]/18 rounded-xl p-4">
                  <p className="text-xs font-bold text-[#C6A96B] mb-2">✨ ยามดีเด่นวันนี้ (ระดับ 3)</p>
                  {bestDayYams.length > 0 ? bestDayYams.map(y => (
                    <div key={y.timeStr} className="flex justify-between text-xs py-1 border-b border-white/5 last:border-0">
                      <span className="text-[#8A8070] font-mono">{y.timeStr}</span>
                      <span className="text-[#C6A96B] font-bold">{y.quality} {TAKSA_PLAN_ADVICE[y.quality]?.emoji}</span>
                    </div>
                  )) : <p className="text-xs text-[#8A8070]">ไม่มีในช่วงนี้</p>}
                </div>
                <div className="bg-[#071E3D]/75 border border-[#6D8FC7]/22 rounded-xl p-4">
                  <p className="text-xs font-bold text-[#6D8FC7] mb-2">⚠️ ยามกาลกิณี (ควรหลีกเลี่ยง)</p>
                  {worstDayYam ? (
                    <div>
                      <p className="text-sm font-bold text-[#4B6FAE]">{worstDayYam.timeStr}</p>
                      <p className="text-xs text-[#8A8070] mt-1">{worstDayYam.isDay ? "☀️ กลางวัน" : "🌙 กลางคืน"} — ยามที่ {worstDayYam.yamNum}</p>
                      <p className="text-xs text-[#6D8FC7]/70 mt-1">หลีกเลี่ยงการตัดสินใจสำคัญ การลงนามสัญญา หรือการเดินทางไกล</p>
                    </div>
                  ) : <p className="text-xs text-[#8A8070]">ไม่พบ</p>}
                </div>
              </div>
            }
          />

          {/* Section 2: ผังดวง 9 ฐาน รายวัน */}
          <NineBaseChart
            chart={activeResult.hourlyChart ?? []}
            hoverNum={hoverNum}
            setHoverNum={setHoverNum}
            title="ผังดวงกาลชะตา 9 ฐาน รายวัน"
            subtitle={`ฐาน๑=ยามใหญ่(${activeResult.yamYaiName}) ฐาน๒=ดาวประจำวัน(${STAR_NAMES[dayStarN as keyof typeof STAR_NAMES]}) ฐาน๓=เดือนจันทรคติ(${activeResult.lunarMonthName})`}
            base1Label="ฐาน๑(ยาม)"
          />

          {/* Section 3: ตารางยาม 16 ยาม */}
          <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-6 sm:p-8">
            <h3 className="text-base font-bold text-[#F8F6F1] mb-2">ตารางกาลชะตา 16 ยาม พร้อมคำอธิบาย</h3>
            <p className="text-xs text-[#8A8070] mb-5">กดที่ยามเพื่อดูคำอธิบายและแนวทางการตัดสินใจ — ยามที่ไฮไลต์คือปัจจุบัน</p>

            {/* ทักษา 8 ตำแหน่ง */}
            <div className="bg-[#020617] border border-[#C6A96B]/12 rounded-2xl p-4 mb-6">
              <p className="text-xs text-[#C6A96B] font-bold mb-3">ระดับทักษาประจำวัน (เรียงตามดาวประจำวัน)</p>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {_BHOP.map((bhop, idx) => {
                  const s = _SEQ[(_SEQ.indexOf(dayStarN as any) + idx + 8) % 8] as number;
                  const isNow = s === yaiN;
                  const adv = TAKSA_PLAN_ADVICE[bhop];
                  return (
                    <div key={bhop} className={`rounded-xl p-2 border text-center transition-colors ${isNow ? "bg-[#C6A96B]/10 border-[#C6A96B]/40" : adv?.level === 0 ? "border-[#6D8FC7]/30 bg-[#4B6FAE]/5" : "border-white/5 bg-[#071427]/75"}`}>
                      <p className={`text-[10px] font-bold ${isNow ? "text-[#C6A96B]" : adv?.level === 0 ? "text-[#6D8FC7]" : "text-[#8A8070]"}`}>{bhop}</p>
                      <p className={`text-sm font-display font-black ${isNow ? "text-[#C6A96B]" : "text-[#F8F6F1]"}`}>{s}</p>
                      <p className="text-[10px]">{adv?.emoji}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              {[
                { label: "☀️ กลางวัน (06:00–18:00)", filter: (y: typeof dayYamTable[0]) => y.isDay },
                { label: "🌙 กลางคืน (18:00–06:00)", filter: (y: typeof dayYamTable[0]) => !y.isDay },
              ].map(({ label, filter }) => (
                <div key={label}>
                  <p className={`text-xs font-bold mb-3 ${label.includes("☀️") ? "text-amber-400/80" : "text-indigo-400/80"}`}>{label}</p>
                  <div className="space-y-1.5">
                    {dayYamTable.filter(filter).map(y => {
                      const yamKey = `${y.isDay ? "day" : "night"}-${y.yamNum}`;
                      const isEx = selectedYamKey === yamKey;
                      const adv = TAKSA_PLAN_ADVICE[y.quality];
                      const desc = YAM_DESC[y.star] || YAM_DESC[1];
                      return (
                        <div key={yamKey} className="flex flex-col">
                          <button onClick={() => setSelectedYamKey(isEx ? null : yamKey)}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs transition-all ${y.isCurrentYam ? "bg-[#C6A96B]/10 border-[#C6A96B]/40" : adv?.level === 0 ? "bg-[#4B6FAE]/5 border-[#6D8FC7]/20" : "bg-[#071427]/75 border-[#C6A96B]/10 hover:border-[#C6A96B]/25"}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[#8A8070] shrink-0 text-[11px]">{y.timeStr}</span>
                                <span className={`font-bold truncate ${y.isCurrentYam ? "text-[#C6A96B]" : "text-[#F8F6F1]"}`}>{STAR_NAMES[y.star as keyof typeof STAR_NAMES]}</span>
                                <span className={`ml-auto shrink-0 font-bold text-[10px] ${adv?.level === 3 ? "text-[#C6A96B]" : adv?.level === 0 ? "text-[#6D8FC7]" : "text-[#8A8070]"}`}>{y.quality}</span>
                              </div>
                              {adv?.th && <p className="text-[10px] text-[#8A8070] truncate mt-0.5">{adv.th}</p>}
                            </div>
                            <span className="text-[#8A8070]/50 shrink-0">{isEx ? "▲" : "▼"}</span>
                          </button>
                          {isEx && (
                            <div className="px-4 py-4 bg-[#020617]/60 border-x border-b border-white/5 rounded-b-xl">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{adv?.emoji}</span>
                                <p className="text-sm font-bold text-[#C6A96B]">{y.quality} — {adv?.th}</p>
                              </div>
                              <p className="text-xs text-[#D9CDB7] leading-relaxed mb-2">{desc.desc}</p>
                              <div className="bg-[#0A1628] rounded-xl p-3 border border-white/5">
                                <p className="text-xs text-[#C6A96B] font-bold mb-1">🎯 แนวทางการตัดสินใจในยามนี้</p>
                                <p className="text-xs text-[#F8F6F1] leading-relaxed">{desc.decision}</p>
                              </div>
                              <p className="text-[10px] text-[#8A8070] italic mt-3">"{YAM_OMEN[y.star] || ""}"</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* ═══════════════ TAB: รายชั่วโมง ═══════════════ */}
      {activeTab === "hourly" && (
        <>
          {/* Section 1: สรุปยามปัจจุบัน */}
          <SummaryCard
            title={`กาลชะตายามปัจจุบัน — ยามที่ ${yamSeq + 1} (${isDaytime ? "กลางวัน" : "กลางคืน"})`}
            starName={activeResult.yamYaiName}
            starNum={yaiN}
            quality={currentYamQuality}
            yamDesc={yamDesc}
            omen={YAM_OMEN[yaiN]}
            scores={yamScores}
            extraInfo={
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-xs text-[#8A8070] uppercase font-bold mb-1">เวลาปัจจุบัน</p>
                  <p className="text-4xl font-display font-black text-[#F8F6F1]">{formatTime(time)}</p>
                </div>
                <div className={`border font-bold text-xs px-3 py-1.5 rounded-full ${isDaytime ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"}`}>
                  {isDaytime ? "☀️ กลางวัน" : "🌙 กลางคืน"}
                </div>
              </div>
            }
          />

          {/* Section 2: ผังดวง 9 ฐาน รายชั่วโมง */}
          <NineBaseChart
            chart={activeResult.hourlyChart ?? []}
            hoverNum={hoverNum}
            setHoverNum={setHoverNum}
            title="ผังดวงกาลชะตา 9 ฐาน รายชั่วโมง"
            subtitle={`ฐาน๑=ยามใหญ่(${activeResult.yamYaiName}) ฐาน๒=ดาวประจำวัน ฐาน๓=เดือนจันทรคติ(${activeResult.lunarMonthName})`}
            base1Label="ฐาน๑(ยาม)"
          />

          {/* Section 3: ตารางยาม 8 ยาม ช่วงปัจจุบัน */}
          <Card className="border-[#C6A96B]/20 bg-[#0A1628] p-6 sm:p-8">
            <h3 className="text-base font-bold text-[#F8F6F1] mb-1">ตารางยาม{isDaytime ? "กลางวัน" : "กลางคืน"} 8 ยาม</h3>
            <p className="text-xs text-[#8A8070] mb-5">กดที่ยามเพื่อดูคำอธิบาย — ยามไฮไลต์คือยามปัจจุบัน</p>
            <div className="space-y-1.5">
              {dayYamTable.filter(y => y.isDay === isDaytime).map(y => {
                const yamKey = `hourly-${y.isDay ? "d" : "n"}-${y.yamNum}`;
                const isEx = selectedYamKey === yamKey;
                const adv = TAKSA_PLAN_ADVICE[y.quality];
                const desc = YAM_DESC[y.star] || YAM_DESC[1];
                return (
                  <div key={yamKey} className="flex flex-col">
                    <button onClick={() => setSelectedYamKey(isEx ? null : yamKey)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-xs transition-all ${y.isCurrentYam ? "bg-[#C6A96B]/10 border-[#C6A96B]/40" : adv?.level === 0 ? "bg-[#4B6FAE]/5 border-[#6D8FC7]/20" : "bg-[#071427]/75 border-[#C6A96B]/10 hover:border-[#C6A96B]/25"}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${y.isCurrentYam ? "bg-[#C6A96B] text-[#020617]" : "bg-white/5 text-[#8A8070]"}`}>{y.yamNum}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#8A8070] text-[11px] shrink-0">{y.timeStr}</span>
                          <span className={`font-bold truncate ${y.isCurrentYam ? "text-[#C6A96B]" : "text-[#F8F6F1]"}`}>{STAR_NAMES[y.star as keyof typeof STAR_NAMES]}</span>
                          <span className={`ml-auto shrink-0 font-bold text-[10px] ${adv?.level === 3 ? "text-[#C6A96B]" : adv?.level === 0 ? "text-[#6D8FC7]" : "text-[#8A8070]"}`}>{y.quality} {adv?.emoji}</span>
                        </div>
                        {adv?.th && <p className="text-[10px] text-[#8A8070] truncate mt-0.5">{adv.th}</p>}
                      </div>
                      <span className="text-[#8A8070]/50 text-xs shrink-0">{isEx ? "▲" : "▼"}</span>
                    </button>
                    {isEx && (
                      <div className="px-4 py-4 bg-[#020617]/60 border-x border-b border-white/5 rounded-b-xl">
                        <p className="text-xs text-[#D9CDB7] leading-relaxed mb-2">{desc.desc}</p>
                        <div className="bg-[#0A1628] rounded-xl p-3 border border-white/5">
                          <p className="text-xs text-[#C6A96B] font-bold mb-1">🎯 แนวทางการตัดสินใจ</p>
                          <p className="text-xs text-[#F8F6F1] leading-relaxed">{desc.decision}</p>
                        </div>
                        <p className="text-[10px] text-[#8A8070] italic mt-2">"{YAM_OMEN[y.star] || ""}"</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {/* ═══════════════ TAB: รายนาที ═══════════════ */}
      {activeTab === "minute" && (
        <>
          {/* Section 1: สรุปยามซอยปัจจุบัน */}
          <SummaryCard
            title={`ยามซอยที่ ${soySlot} — ${lagnamPos} (ทุก 3.45 นาที)`}
            starName={activeResult.yamSoyName}
            starNum={soyN}
            quality={currentSoyQuality}
            yamDesc={soyDesc}
            scores={soyScores}
            extraInfo={
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#071E3D]/75 border border-[#6D8FC7]/22 rounded-xl p-4">
                  <p className="text-xs text-[#6D8FC7] font-bold mb-1">ยามใหญ่ (ตนุ)</p>
                  <p className="text-xl font-bold text-[#F8F6F1]">{activeResult.yamYaiName} ({yaiN})</p>
                  <p className="text-xs text-[#8A8070] mt-1">{currentYamQuality}</p>
                </div>
                <div className="bg-[#020617] border border-white/5 rounded-xl p-4">
                  <p className="text-xs text-[#8A8070] font-bold mb-1">เวลาปัจจุบัน</p>
                  <p className="text-xl font-bold text-[#F8F6F1]">{formatTime(time)}</p>
                  <p className="text-xs text-[#8A8070] mt-1">{isDaytime ? "☀️ กลางวัน" : "🌙 กลางคืน"}</p>
                </div>
              </div>
            }
          />

          {/* Section 2: ผังดวง 9 ฐาน รายนาที */}
          <NineBaseChart
            chart={activeResult.chart ?? []}
            hoverNum={hoverNum}
            setHoverNum={setHoverNum}
            title="ผังดวงกาลชะตา 9 ฐาน รายนาที"
            subtitle={`ฐาน๑=ยามซอย(${activeResult.yamSoyName}) ฐาน๒=ยามใหญ่(${activeResult.yamYaiName}) ฐาน๓=ดาวประจำวัน`}
            base1Label="ฐาน๑(ซอย)"
          />

          {/* Section 3: ตารางยามซอย 8 ช่วง */}
          <Card className="border-[#6D8FC7]/30 bg-[#0A1628] p-6 sm:p-8">
            <h3 className="text-base font-bold text-[#F8F6F1] mb-1">ตารางยามซอย 8 ช่วง — ยามใหญ่ {activeResult.yamYaiName}</h3>
            <p className="text-xs text-[#8A8070] mb-5">แต่ละซอยกินเวลา 3 นาที 45 วินาที (225 วินาที) — ไฮไลต์คือซอยปัจจุบัน</p>
            <div className="space-y-1.5">
              {yamSoyTable.map(soy => {
                const adv = TAKSA_PLAN_ADVICE[soy.quality];
                const desc = YAM_DESC[soy.planet] || YAM_DESC[1];
                const soyKey = `soy-${soy.slot}`;
                const isEx = selectedYamKey === soyKey;
                return (
                  <div key={soy.slot} className="flex flex-col">
                    <button onClick={() => setSelectedYamKey(isEx ? null : soyKey)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-xs transition-all ${soy.isCurrent ? "bg-[#4B6FAE]/10 border-[#4B6FAE]/40" : adv?.level === 0 ? "bg-[#4B6FAE]/5 border-[#6D8FC7]/20" : "bg-[#071427]/75 border-[#C6A96B]/10 hover:border-[#C6A96B]/25"}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${soy.isCurrent ? "bg-[#4B6FAE] text-white" : "bg-white/5 text-[#8A8070]"}`}>{soy.slot}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#8A8070] text-[11px] shrink-0">{soy.timeStr}</span>
                          <span className={`font-bold truncate ${soy.isCurrent ? "text-[#6D8FC7]" : "text-[#F8F6F1]"}`}>{STAR_NAMES[soy.planet as keyof typeof STAR_NAMES]}</span>
                          <span className={`ml-auto shrink-0 font-bold text-[10px] ${adv?.level === 3 ? "text-[#C6A96B]" : adv?.level === 0 ? "text-[#6D8FC7]" : "text-[#8A8070]"}`}>{soy.quality} {adv?.emoji}</span>
                        </div>
                        {adv?.th && <p className="text-[10px] text-[#8A8070] truncate mt-0.5">{adv.th}</p>}
                      </div>
                      <span className="text-[#8A8070]/50 shrink-0">{isEx ? "▲" : "▼"}</span>
                    </button>
                    {isEx && (
                      <div className="px-4 py-4 bg-[#020617]/60 border-x border-b border-white/5 rounded-b-xl">
                        <p className="text-xs text-[#D9CDB7] leading-relaxed mb-2">{desc.desc}</p>
                        <div className="bg-[#0A1628] rounded-xl p-3 border border-white/5">
                          <p className="text-xs text-[#6D8FC7] font-bold mb-1">🎯 แนวทางการตัดสินใจในซอยนี้</p>
                          <p className="text-xs text-[#F8F6F1] leading-relaxed">{desc.decision}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Q&A Chat */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <h3 className="text-sm font-bold text-[#F8F6F1] mb-4">🎯 ถามกระแสญาณ — หมวด</h3>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${selectedCategory === cat.id ? "bg-[#071E3D]/75 border-[#6D8FC7]/40" : "bg-[#071427]/75 border-white/5"}`}>
                    <span className="text-base">{cat.icon}</span>
                    <span className={`text-[10px] font-bold ${selectedCategory === cat.id ? "text-[#6D8FC7]" : "text-[#8A8070]"}`}>{cat.label.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
              <div className="bg-[#020617] border border-white/5 rounded-2xl p-4 mb-4">
                <p className="text-xs font-bold text-[#C6A96B] mb-3">💡 คำถามแนะนำ</p>
                <div className="space-y-2">
                  {activeCategory?.questions.map((q, i) => (
                    <button key={i} onClick={() => doChatFetch(q)} className="w-full flex gap-2 text-left group">
                      <span className="text-[#C6A96B] text-sm opacity-60 group-hover:opacity-100 shrink-0">✦</span>
                      <p className="text-xs text-[#D9CDB7] opacity-70 group-hover:opacity-100">{q}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-[#0A1628] border border-[#C6A96B]/20 rounded-2xl overflow-hidden">
                <div className="p-3 flex items-center gap-2 border-b border-white/5 bg-[#020617]/40">
                  <div className="w-2 h-2 rounded-full bg-[#C6A96B] shadow-[0_0_8px_rgba(198,169,107,0.6)] animate-pulse" />
                  <span className="text-xs font-bold text-[#F8F6F1]">WISDOM GUIDANCE</span>
                  <button onClick={() => setChatMessages([])} className="ml-auto text-xs text-[#8A8070] hover:text-[#F8F6F1]">ล้างแชท</button>
                </div>
                <div className="overflow-y-auto p-4 space-y-3 h-56">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                      {msg.sender === "ai" && <span className="text-[10px] text-[#C6A96B] font-bold uppercase mb-1">✦ WISDOM</span>}
                      <div className={`max-w-[90%] p-3 rounded-2xl text-xs ${msg.sender === "user" ? "bg-[#0A1628] text-[#F8F6F1] border border-white/10 rounded-tr-none" : "bg-[#020617] text-[#D9CDB7] border border-white/10 rounded-tl-none"}`}>{msg.text}</div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleSendChat} className="p-3 border-t border-white/5 flex gap-2">
                  <input type="text" autoComplete="off" value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="พิมพ์คำถาม..." className="flex-1 bg-[#0A1628] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#F8F6F1] outline-none" />
                  <Button type="submit" disabled={!userInput.trim()} className="px-3 py-2 rounded-xl bg-[#8A8070] text-[#020617] font-bold hover:bg-[#C6A96B] text-xs">ส่ง</Button>
                </form>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
