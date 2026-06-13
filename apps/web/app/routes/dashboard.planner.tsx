import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, useActionData, useSubmit } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { useState, useRef, useEffect } from "react";
import { requireMinPlan } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { calculateMoonPhase, getCurrentYam, calculateAtthakarn } from "@phopephum/engine";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Sparkles, Calendar, BookOpen, Zap, Target, Heart, Plus, Save, CheckCircle, Smile } from "lucide-react";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "TQM Planner — วางแผนชีวิตตามภูมิปัญญา" },
];

const TODAY = () => new Date().toISOString().split("T")[0]!;

// 16 ยาม (8 กลางวัน + 8 กลางคืน) - ยามละ 90 นาที (1.5 ชม.)
const YAM_SLOTS = [
  { label: "กลางวัน ยามที่ 1", start: "06:00", end: "07:30" },
  { label: "กลางวัน ยามที่ 2", start: "07:30", end: "09:00" },
  { label: "กลางวัน ยามที่ 3", start: "09:00", end: "10:30" },
  { label: "กลางวัน ยามที่ 4", start: "10:30", end: "12:00" },
  { label: "กลางวัน ยามที่ 5", start: "12:00", end: "13:30" },
  { label: "กลางวัน ยามที่ 6", start: "13:30", end: "15:00" },
  { label: "กลางวัน ยามที่ 7", start: "15:00", end: "16:30" },
  { label: "กลางวัน ยามที่ 8", start: "16:30", end: "18:00" },
  { label: "กลางคืน ยามที่ 1", start: "18:00", end: "19:30" },
  { label: "กลางคืน ยามที่ 2", start: "19:30", end: "21:00" },
  { label: "กลางคืน ยามที่ 3", start: "21:00", end: "22:30" },
  { label: "กลางคืน ยามที่ 4", start: "22:30", end: "00:00" },
  { label: "กลางคืน ยามที่ 5", start: "00:00", end: "01:30" },
  { label: "กลางคืน ยามที่ 6", start: "01:30", end: "03:00" },
  { label: "กลางคืน ยามที่ 7", start: "03:00", end: "04:30" },
  { label: "กลางคืน ยามที่ 8", start: "04:30", end: "06:00" },
];

const PLANET_DATA: Record<string, { label: string; color: string; symbol: string; meaning: string; promotes: string[]; warns: string[] }> = {
  "อาทิตย์": { 
    label: "อาทิตย์", color: "#EF4444", symbol: "☉", 
    meaning: "เป็นเรื่องจริง เชื่อถือได้ เป็นเรื่องจริง ทำจริง มีเรื่องร้อนใจ", 
    promotes: ["ผู้นำ", "การเจรจา", "ความมีชื่อเสียง", "สุขภาพ"], 
    warns: ["อัตตาสูง", "ความเย่อหยิ่ง"] 
  },
  "จันทร์": { 
    label: "จันเทา", color: "#FBBF24", symbol: "☽", 
    meaning: "จริงครึ่ง เท็จครึ่ง พูดด้วยอารมณ์อ่อนไหว มีจริตมารยา พูดกลับไปกลับมา", 
    promotes: ["ความสัมพันธ์", "การดูแล", "ความคิดสร้างสรรค์", "การค้าขาย"], 
    warns: ["อารมณ์แปรปรวน", "ตัดสินใจด้วยอารมณ์"] 
  },
  "อังคาร": { 
    label: "ภุมมะ", color: "#EC4899", symbol: "♂", 
    meaning: "เป็นเรื่องเท็จ เชื่อถือไม่ได้", 
    promotes: ["ความกล้าหาญ", "พลังงาน", "ความเด็ดเดี่ยว", "ธุรกิจ"], 
    warns: ["ความขัดแย้ง", "อุบัติเหตุ", "ความโกรธ"] 
  },
  "พุธ": { 
    label: "พุทธะ", color: "#10B981", symbol: "☿", 
    meaning: "เป็นเรื่องจริง เชื่อถือได้", 
    promotes: ["การสื่อสาร", "ธุรกิจ", "การเรียนรู้", "เทคโนโลยี", "การเขียน"], 
    warns: ["ความไม่ซื่อสัตย์", "ความลังเล"] 
  },
  "พฤหัส": { 
    label: "ครู", color: "#F97316", symbol: "♃", 
    meaning: "จริงเท่าเทียมกัน อย่างพึงเชื่อ", 
    promotes: ["โชคลาภ", "ปัญญา", "จิตวิญญาณ", "การศึกษา", "กฎหมาย"], 
    warns: ["การสุรุ่ยสุร่าย", "การประมาทเลินเล่อ"] 
  },
  "ศุกร์": { 
    label: "ศุกระ", color: "#3B82F6", symbol: "♀", 
    meaning: "เป็นเรื่องไม่จริง เชื่อถือไม่ได้", 
    promotes: ["ความรัก", "ศิลปะ", "ความงาม", "ความบันเทิง", "สันติภาพ"], 
    warns: ["ความฟุ่มเฟือย", "ความโลภ"] 
  },
  "เสาร์": { 
    label: "เสารี", color: "#8B5CF6", symbol: "♄", 
    meaning: "เป็นเรื่องจริง เชื่อถือได้", 
    promotes: ["ความอดทน", "วินัย", "ความพยายาม", "งานหนัก"], 
    warns: ["ความล่าช้า", "อุปสรรค", "โรคภัย"] 
  },
};

const DAY_NAMES = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { user } = await requireMinPlan("basic", request, env);
  const todayDate = TODAY();

  const { supabase } = createSupabaseClient(request, env);
  const { data: plan } = await supabase
    .from("daily_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", todayDate)
    .single();

  const moon = calculateMoonPhase();
  const dayOfWeek = new Date().getDay();
  const dayName = DAY_NAMES[dayOfWeek]!;
  
  // Calculate rulers for all 16 slots
  const slotsWithRulers = YAM_SLOTS.map((slot, index) => {
    // calculateAtthakarn needs a time. We'll use the start time.
    const result = calculateAtthakarn(todayDate, slot.start);
    return {
      ...slot,
      ruler: PLANET_DATA[result.horaPlanet] || PLANET_DATA["พฤหัส"],
      planetName: result.horaPlanet,
    };
  });

  return json({ 
    plan, 
    moon, 
    todayDate, 
    dayName,
    slots: slotsWithRulers
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { user } = await requireMinPlan("basic", request, env);
  const todayDate = TODAY();

  const formData = await request.formData();
  const intention = String(formData.get("intention") ?? "");
  const energyLevel = parseInt(String(formData.get("energy_level") ?? "3"));
  const successNotes = String(formData.get("success_notes") ?? "");
  const reflection = String(formData.get("reflection") ?? "");
  const dharmaTeaching = String(formData.get("dharma_teaching") ?? "");
  
  // Extract hora activities from hidden input or parse from prefixed inputs
  const horaActivities: Record<string, string> = {};
  YAM_SLOTS.forEach((_, i) => {
    const activity = formData.get(`hora_activity_${i}`);
    if (activity) horaActivities[i] = String(activity);
  });

  const { supabase } = createSupabaseClient(request, env);
  await supabase.from("daily_plans").upsert({
    user_id: user.id,
    date: todayDate,
    intention,
    energy_level: energyLevel,
    success_notes: successNotes,
    reflection,
    dharma_teaching: dharmaTeaching,
    hora_activities: horaActivities,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,date" });

  return redirect("/dashboard/planner?saved=1");
}

import { UpgradePaywall } from "~/components/ui/UpgradePaywall";

export default function PlannerPage() {
  const { plan, moon, dayName, slots } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isSaving = navigation.state === "submitting";
  
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
  const saved = url?.searchParams.get("saved") === "1";
  const displayDate = new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });

  const currentRuler = slots[0]?.ruler; // Default to first slot for guide

  return (
    <div className="space-y-8 max-w-2xl pb-20">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[#D9BC82] text-xs tracking-widest uppercase mb-1">TQM Planner</p>
          <h1 className="font-display text-3xl font-bold text-[#F8F6F1]">จัดการแผนงาน</h1>
          <p className="text-[#94A3B8] text-sm mt-1">{displayDate}</p>
        </div>
      </div>

      <Form ref={formRef} method="post" className="space-y-8">
        {/* DAILY WISDOM GUIDE */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-[#D9BC82] text-xs font-bold uppercase tracking-widest">
            <Zap className="w-4 h-4" /> DAILY WISDOM GUIDE
          </div>
          <Card className="bg-[#0A1628]/40 border-[#D9BC82]/10 p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#F8F6F1]">พลังงานวัน{dayName}</h3>
                <div className="text-right">
                  <span className="text-[13px] text-[#94A3B8] uppercase block">ผู้ปกครอง</span>
                  <span className="text-lg font-bold text-[#D9BC82]">{currentRuler?.label} ({currentRuler?.symbol})</span>
                </div>
              </div>
              
              <div className="p-4 bg-[#D9BC82]/5 rounded-xl border border-[#D9BC82]/10">
                <p className="text-sm text-[#D9CDB7] leading-relaxed">
                  วันนี้ปกครองโดยดาว <span className="text-[#D9BC82] font-bold">{currentRuler?.label}</span> ซึ่งมีลักษณะพลังงานเด่นคือ
                  <br />
                  <span className="text-[#F8F6F1] font-bold italic">{currentRuler?.meaning}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[13px] text-[#C6A96B] uppercase font-bold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> เกื้อหนุนเป็นพิเศษ
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentRuler?.promotes.map(p => (
                      <span key={p} className="px-2 py-0.5 bg-[#C6A96B]/10 text-[#C6A96B] text-[13px] rounded-full border border-[#C6A96B]/20">{p}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-[13px] text-[#F8F6F1]/50 uppercase font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3" /> พึงระวัง
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentRuler?.warns.map(w => (
                      <span key={w} className="px-2 py-0.5 bg-white/5 text-[#F8F6F1]/50 text-[13px] rounded-full border border-white/10">{w}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* 16 HORA CALENDAR */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-[#D9BC82] text-xs font-bold uppercase tracking-widest">
            <Calendar className="w-4 h-4" /> ปฏิทินยามอัฏฐกาลและแผนงาน TQM
          </div>
          <div className="space-y-3">
            {slots.map((slot, i) => (
              <Card key={i} className={`p-4 transition-all border-[#D9BC82]/10 ${activeSlot === i ? 'ring-1 ring-[#D9BC82]/40 bg-[#D9BC82]/5' : 'bg-[#0A1628]/20'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1E293B] border border-white/5 flex items-center justify-center shrink-0">
                      <span className="text-xl" style={{ color: slot.ruler.color }}>{slot.ruler.symbol}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-[#94A3B8]">{slot.start} - {slot.end} น.</span>
                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-[12px] font-bold text-[#D9BC82] uppercase">{slot.label}</span>
                      </div>
                      <h4 className="text-sm font-bold text-[#F8F6F1]">ผู้ครองยาม: {slot.ruler.label}</h4>
                      <p className="text-[13px] text-[#94A3B8] italic mt-0.5">{slot.ruler.meaning}</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 max-w-md">
                    <div className="relative group">
                      <input
                        name={`hora_activity_${i}`}
                        defaultValue={(plan?.hora_activities as any)?.[i] ?? ""}
                        placeholder="ยังไม่มีการบันทึกแผนงาน..."
                        onFocus={() => setActiveSlot(i)}
                        className="w-full bg-transparent text-sm text-[#D9CDB7] placeholder-[#94A3B8]/40 border-b border-[#D9BC82]/10 py-1.5 focus:border-[#D9BC82]/40 outline-none transition-all"
                      />
                      {!(plan?.hora_activities as any)?.[i] && (
                        <button type="button" className="absolute right-0 top-1/2 -translate-y-1/2 text-[#D9BC82]/40 hover:text-[#D9BC82]">
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* REFLECTION JOURNAL */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-[#D9BC82] text-xs font-bold uppercase tracking-widest">
            <BookOpen className="w-4 h-4" /> REFLECTION JOURNAL
          </div>
          <Card className="bg-[#0A1628]/40 border-[#D9BC82]/10 p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-[#F8F6F1]">บันทึกพลังงาน & สะท้อนคิด</h3>
              
              <div className="space-y-3">
                <span className="text-[13px] text-[#94A3B8] uppercase font-bold flex items-center gap-2">
                  <Zap className="w-3 h-3 text-[#D9BC82]" /> ระดับพลังงานวันนี้ (Energy Level)
                </span>
                <div className="flex justify-between items-center gap-2 px-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <label key={level} className="flex flex-col items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="energy_level"
                        value={level}
                        defaultChecked={(plan?.energy_level ?? 3) === level}
                        className="sr-only"
                      />
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        (plan?.energy_level ?? 3) === level 
                          ? 'border-[#D9BC82] bg-[#D9BC82]/10 text-[#D9BC82]' 
                          : 'border-white/5 bg-[#1E293B]/40 text-[#94A3B8] group-hover:border-white/10'
                      }`}>
                        {level}
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex justify-between text-[11px] text-[#94A3B8] font-bold uppercase tracking-widest px-1">
                  <span>น้อยที่สุด</span>
                  <span>ยอดเยี่ยมที่สุด</span>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[13px] text-[#94A3B8] uppercase font-bold flex items-center gap-2">
                  <Target className="w-3 h-3 text-gold-400" /> ข้อสะท้อนคิดประจำวัน / ความสำเร็จวันนี้
                </span>
                <textarea
                  name="success_notes"
                  defaultValue={plan?.success_notes ?? ""}
                  placeholder="วันนี้ได้สัจจะบารมีเรื่องใดบ้าง? หรือมีสิ่งใดให้เรียนรู้เพิ่มเติม..."
                  rows={4}
                  className="w-full bg-[#1E293B]/30 border border-white/5 rounded-xl p-4 text-sm text-[#D9CDB7] placeholder-[#94A3B8]/40 focus:border-[#D9BC82]/20 outline-none transition-all resize-none"
                />
              </div>

              <div className="space-y-3">
                <span className="text-[13px] text-[#94A3B8] uppercase font-bold flex items-center gap-2">
                  <Heart className="w-3 h-3 text-red-400/60" /> ธรรมประธาน / คำสอนเติมพลังใจ
                </span>
                <textarea
                  name="dharma_teaching"
                  defaultValue={plan?.dharma_teaching ?? "ความอดทนในวันลำบาก คือความสำเร็จในวันหน้า..."}
                  rows={2}
                  className="w-full bg-[#D9BC82]/5 border border-[#D9BC82]/10 rounded-xl p-4 text-sm italic text-[#D9BC82] placeholder-[#94A3B8]/40 focus:border-[#D9BC82]/20 outline-none transition-all resize-none"
                />
              </div>
            </div>
          </Card>
        </section>

        {/* Footer Actions */}
        <div className="fixed bottom-[64px] md:bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#020617] via-[#020617] to-transparent pointer-events-none z-10">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <Button type="submit" loading={isSaving} className="w-full h-12 btn-gold-shine border-0 text-base font-bold flex items-center justify-center gap-2 shadow-2xl">
              <Save className="w-5 h-5" />
              บันทึกข้อมูลสะท้อนคิด
            </Button>
            {saved && (
              <div className="flex items-center justify-center gap-1.5 mt-2 animate-bounce-slow">
                <Smile className="w-4 h-4 text-green-400" />
                <p className="text-xs text-green-400 font-bold uppercase tracking-widest">บันทึกสำเร็จแล้ว</p>
              </div>
            )}
          </div>
        </div>
      </Form>
    </div>
  );
}
