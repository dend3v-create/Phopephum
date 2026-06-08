import { json } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, useLoaderData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { calculatePhopephum } from "@phopephum/engine";
import { Card } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import type { Env } from "~/env.server";
import { useState, useEffect } from "react";
import { currentBuddhistParts, buddhistPartsToISODate } from "~/lib/buddhist-year";

export const meta: MetaFunction = () => [
  { title: "ระบบคำนวณชะตาชีวิต (Baseline) — PhopePhum" },
  { name: "description", content: "ผูกดวงชะตาด้วยระบบ Phopephum Engine v3.0" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  const todayParts = currentBuddhistParts();

  return json({
    profile,
    todayParts
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAuth(request, env);

  try {
    const formData = await request.formData();
    
    // วันเกิด
    const bDay = Number(formData.get("birthDay"));
    const bMonth = Number(formData.get("birthMonth"));
    const bYear = Number(formData.get("birthYear"));
    const birthTime = String(formData.get("birthTime") || "12:00");
    
    // วันจร
    const tDay = Number(formData.get("transitDay"));
    const tMonth = Number(formData.get("transitMonth"));
    const tYear = Number(formData.get("transitYear"));
    const transitTime = String(formData.get("transitTime") || "12:00");

    if (!bDay || !bMonth || !bYear || !tDay || !tMonth || !tYear) {
      return json({ error: "กรุณาระบุข้อมูลวันเดือนปีให้ครบถ้วน" }, { status: 400 });
    }

    const birthDateISO = buddhistPartsToISODate({ day: bDay, month: bMonth, yearBE: bYear });
    const transitDateISO = buddhistPartsToISODate({ day: tDay, month: tMonth, yearBE: tYear });

    if (!birthDateISO || !transitDateISO) {
      return json({ error: "รูปแบบวันที่ไม่ถูกต้อง" }, { status: 400 });
    }

    const [ty, tm, td] = transitDateISO.split("-").map(Number);
    const [th, tmin] = transitTime.split(":").map(Number);
    // Construct local Date for the check date
    const checkDate = new Date(ty, tm - 1, td, th, tmin, 0);

    const result = await calculatePhopephum({
      birthDate: birthDateISO,
      birthTime,
      birthPlace: "กรุงเทพมหานคร",
    }, checkDate);

    return json({
      result,
      error: null
    });

  } catch (err: any) {
    console.error("[horoscope-baseline] Action Error:", err);
    return json({ error: err.message || "เกิดข้อผิดพลาดในการคำนวณ" }, { status: 500 });
  }
}

export default function HoroscopeBaselinePage() {
  const { profile, todayParts } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle";

  const [birthYear, setBirthYear] = useState(profile?.birth_date ? Number(profile.birth_date.slice(0, 4)) + 543 : 2525);
  const [birthMonth, setBirthMonth] = useState(profile?.birth_date ? Number(profile.birth_date.slice(5, 7)) : 1);
  const [birthDay, setBirthDay] = useState(profile?.birth_date ? Number(profile.birth_date.slice(8, 10)) : 1);
  const [birthTime, setBirthTime] = useState(profile?.birth_time || "12:00");

  const [transitYear, setTransitYear] = useState(todayParts.yearBE);
  const [transitMonth, setTransitMonth] = useState(todayParts.month);
  const [transitDay, setTransitDay] = useState(todayParts.day);
  const [transitTime, setTransitTime] = useState("12:00");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-black text-[#F8F6F1]">ระบบคำนวณดวงชะตา (Baseline)</h1>
        <p className="text-[#8A8070] text-sm">จุดเริ่มต้นการพัฒนาระบบคำนวณ Phopephum Engine v3.0</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Panel */}
        <Card className="lg:col-span-4 p-6 bg-[#0A1628] border-[#C6A96B]/20">
          <Form method="post" className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-[#C6A96B] font-bold border-b border-[#C6A96B]/20 pb-2">ข้อมูลกำเนิด</h2>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-[#8A8070] mb-1 block">วันที่</label>
                  <Input name="birthDay" type="number" min="1" max="31" value={birthDay} onChange={(e) => setBirthDay(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs text-[#8A8070] mb-1 block">เดือน</label>
                  <Input name="birthMonth" type="number" min="1" max="12" value={birthMonth} onChange={(e) => setBirthMonth(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs text-[#8A8070] mb-1 block">ปี พ.ศ.</label>
                  <Input name="birthYear" type="number" value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#8A8070] mb-1 block">เวลาเกิด</label>
                <Input name="birthTime" type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <h2 className="text-sky-400 font-bold border-b border-sky-400/20 pb-2">ข้อมูลวันจร (กาลปัจจุบัน)</h2>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-[#8A8070] mb-1 block">วันที่</label>
                  <Input name="transitDay" type="number" min="1" max="31" value={transitDay} onChange={(e) => setTransitDay(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs text-[#8A8070] mb-1 block">เดือน</label>
                  <Input name="transitMonth" type="number" min="1" max="12" value={transitMonth} onChange={(e) => setTransitMonth(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs text-[#8A8070] mb-1 block">ปี พ.ศ.</label>
                  <Input name="transitYear" type="number" value={transitYear} onChange={(e) => setTransitYear(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#8A8070] mb-1 block">เวลาจร</label>
                <Input name="transitTime" type="time" value={transitTime} onChange={(e) => setTransitTime(e.target.value)} />
              </div>
            </div>

            {actionData?.error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {actionData.error}
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full bg-[#C6A96B] hover:bg-[#D9CDB7] text-[#020617] font-bold">
              {isLoading ? "กำลังคำนวณ..." : "คำนวณดวงชะตา"}
            </Button>
          </Form>
        </Card>

        {/* Result Panel */}
        <Card className="lg:col-span-8 p-6 bg-[#020617] border-white/5 h-[800px] overflow-auto">
          {actionData?.result ? (
            <div className="space-y-4">
              <h2 className="text-[#F8F6F1] font-bold text-lg">PhopephumResult Data (Raw)</h2>
              <pre className="text-xs text-[#D9CDB7] bg-black/50 p-4 rounded-xl overflow-x-auto">
                {JSON.stringify(actionData.result, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-[#8A8070]">
              <p>กรอกข้อมูลและกดคำนวณเพื่อแสดงผลลัพธ์</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
