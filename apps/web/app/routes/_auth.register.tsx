import { json, redirect } from "@remix-run/cloudflare";
import { Form, Link, useActionData, useNavigation, useLoaderData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { signUp } from "~/services/auth.server";
import { logEvent, EVENTS } from "~/services/analytics.server";
import { notifyNewRegistration } from "~/services/line.server";
import { createServiceRoleClient } from "~/services/supabase.server";
import { convertAttributionOnSignup, getReferralCodeFromRequest } from "~/services/attribution.server";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";
import { useState, useEffect } from "react";

export const meta: MetaFunction = () => [
  { title: "สมัครสมาชิก — PhopePhum" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const initialReferralCode = getReferralCodeFromRequest(request) || "";
  const initialPlan = url.searchParams.get("plan") || "";
  const initialTab = url.searchParams.get("tab") || "";

  return json({
    initialReferralCode,
    initialPlan,
    initialTab,
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const formData = await request.formData();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "");
  const displayName = String(formData.get("displayName") ?? "");
  const referralCode = String(formData.get("referralCode") ?? "");
  const plan = String(formData.get("plan") ?? "");
  const tab = String(formData.get("tab") ?? "");
  
  const birthDateRaw = String(formData.get("birthDate") ?? "");
  const birthTime = String(formData.get("birthTime") ?? "");
  const birthPlace = String(formData.get("birthPlace") ?? "");
  const gender = String(formData.get("gender") ?? "ชาย");

  // ประกอบ birthDate จาก 3 ช่อง แล้วแปลง พ.ศ. → ค.ศ.
  const birthDay   = String(formData.get("birthDay") ?? "");
  const birthMonth = String(formData.get("birthMonth") ?? "");
  const birthYearBE = parseInt(String(formData.get("birthYear") ?? "0"), 10);
  const birthYearCE = birthYearBE >= 2400 ? birthYearBE - 543 : birthYearBE;
  let birthDate = birthDateRaw; // fallback
  if (birthDay && birthMonth && birthYearCE) {
    birthDate = `${birthYearCE}-${birthMonth}-${birthDay}`;
  }

  if (!email || !password || !fullName || !birthDay || !birthMonth || !birthYearBE || !birthPlace) {
    return json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
  }

  if (password.length < 6) {
    return json(
      { error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" },
      { status: 400 }
    );
  }

  const { user, error, headers } = await signUp(
    email, 
    password, 
    displayName || fullName, 
    request, 
    env,
    { fullName, birthDate, birthTime, birthPlace, gender, referred_by: referralCode }
  );

  if (error) {
    const msg =
      error.message.includes("already registered")
        ? "อีเมลนี้ถูกใช้งานแล้ว"
        : "เกิดข้อผิดพลาด กรุณาลองใหม่: " + error.message;
    return json({ error: msg }, { status: 400 });
  }

  if (user) {
    await logEvent(request, env, EVENTS.USER_REGISTERED, { method: "email" });

    // แปลงผล Referral Attribution แบบ Atomic (Persist ลง profiles + referral_attributions)
    try {
      const attrResult = await convertAttributionOnSignup({
        userId: user.id,
        request,
        manualPartnerCode: referralCode || null,
        env,
      });
      if (attrResult.headers) {
        for (const [key, val] of attrResult.headers.entries()) {
          headers.append(key, val);
        }
      }
    } catch (attrErr) {
      console.error("[register] convertAttributionOnSignup error:", attrErr);
    }

    // สร้าง subscription_request และส่ง LINE notification
    try {
      const supabase = createServiceRoleClient(env);
      const now = new Date().toISOString();
      const isAdmin = email === "dend3v@gmail.com";
      
      const { data: reqRow } = await supabase
        .from("subscription_requests")
        .insert({
          user_id: user.id,
          type: "registration",
          plan: isAdmin ? "imperial" : (plan || "basic"),
          status: isAdmin ? "approved" : "pending",
          created_at: now,
          approved_at: isAdmin ? now : null
        })
        .select("id")
        .single();

      await notifyNewRegistration(env, {
        requestId: reqRow?.id ?? user.id,
        userId: user.id,
        displayName: displayName || fullName,
        email,
        createdAt: now,
      }).catch(console.error);
    } catch (e) {
      console.error("[register] LINE notify error:", e);
    }
  }

  if (plan) {
    const targetUrl = tab === "sands"
      ? `/dashboard/upgrade?tab=sands&plan=${plan}`
      : `/dashboard/upgrade?plan=${plan}`;
    return redirect(targetUrl, { headers });
  }

  return redirect("/dashboard", { headers });
}

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  sands_50: "50 ละอองทราย (฿59)",
  sands_150: "150 ละอองทราย ยอดนิยม (฿149)",
  sands_500: "500 ละอองทราย คุ้มค่าจุใจ (฿399)",
  free: "เริ่มทดลอง (ฟรี)",
  premium: "Premium (฿89/เดือน)",
  pro: "Pro (฿289/เดือน)",
  pro_annual: "Pro รายปี (฿2,770/ปี)",
  master: "Master (฿1,289/เดือน)",
};

export default function RegisterPage() {
  const { initialReferralCode, initialPlan, initialTab } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  // Time picker state (Hour / Minute / Unknown)
  const [selectedHour, setSelectedHour] = useState("09");
  const [selectedMinute, setSelectedMinute] = useState("09");
  const [unknownTime, setUnknownTime] = useState(false);

  const formattedPlanName = initialPlan
    ? PLAN_DISPLAY_NAMES[initialPlan.toLowerCase()] || initialPlan.toUpperCase()
    : "";

  // ดึงค่าแนะนำจาก URL หรือ Loader (30-day Cookie)
  const [refParam, setRefParam] = useState(initialReferralCode || "");
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryRef = urlParams.get("ref");
    if (queryRef) {
      setRefParam(queryRef);
    } else if (initialReferralCode) {
      setRefParam(initialReferralCode);
    }
  }, [initialReferralCode]);

  return (
    <Card glow className="max-w-xl mx-auto my-8">
      <div className="text-center mb-8">
        <h2 className="font-display text-2xl font-bold text-[#F3EFE8] mb-2">
          ลงทะเบียนวิเคราะห์ชะตาชีวิต
        </h2>
        <p className="text-[#C6B79F] text-sm">
          ปัญญาศาสตร์ เลข 7 ตัว 9 ฐาน + ยามอัฏฐกาลเฉพาะบุคคล
        </p>

        {initialPlan && (
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full bg-[#C6A96B]/15 border border-[#C6A96B]/35 text-xs sm:text-sm text-[#F8F6F1] font-semibold shadow-sm">
            <span className="text-[#C6A96B]">✦</span>
            <span>แพ็กเกจที่เลือก: <strong className="text-amber-400 font-bold">{formattedPlanName}</strong> (จะพาไปชำระเงินหลังลงทะเบียน)</span>
          </div>
        )}
      </div>

      <Form method="post" className="flex flex-col gap-6">
        <input type="hidden" name="plan" value={initialPlan || ""} />
        <input type="hidden" name="tab" value={initialTab || ""} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            name="fullName"
            type="text"
            label="ชื่อ-นามสกุลจริง"
            placeholder="กรอกชื่อ-นามสกุล ของคุณ"
            required
          />
          <div className="flex flex-col gap-1.5">
             <label className="text-xs font-semibold text-[#C6B79F] uppercase tracking-wider ml-1">เพศ</label>
             <select name="gender" className="w-full bg-[#0A1628]/50 border border-[#D9BC82]/20 rounded-xl px-4 py-2.5 text-sm text-[#F8F6F1] focus:outline-none focus:border-[#D9BC82]/50">
                <option value="ชาย">ชาย</option>
                <option value="หญิง">หญิง</option>
             </select>
          </div>
        </div>

        {/* วันเกิด พ.ศ. — แยก 3 ช่อง */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#C6B79F] uppercase tracking-wider ml-1">
            วันเกิด (พ.ศ.) <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <select
              name="birthDay"
              required
              className="w-full bg-[#0A1628]/50 border border-[#D9BC82]/20 rounded-xl px-3 py-2.5 text-sm text-[#F8F6F1] focus:outline-none focus:border-[#D9BC82]/50"
            >
              <option value="">วัน</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={String(d).padStart(2, "0")}>{d}</option>
              ))}
            </select>
            <select
              name="birthMonth"
              required
              className="w-full bg-[#0A1628]/50 border border-[#D9BC82]/20 rounded-xl px-3 py-2.5 text-sm text-[#F8F6F1] focus:outline-none focus:border-[#D9BC82]/50"
            >
              <option value="">เดือน</option>
              {["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
                "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"]
                .map((m, i) => (
                  <option key={i} value={String(i + 1).padStart(2, "0")}>{m}</option>
                ))}
            </select>
            <input
              name="birthYear"
              type="number"
              required
              min={2400}
              max={2580}
              placeholder="พ.ศ."
              className="w-full bg-[#0A1628]/50 border border-[#D9BC82]/20 rounded-xl px-3 py-2.5 text-sm text-[#F8F6F1] placeholder-[#94A3B8]/40 focus:outline-none focus:border-[#D9BC82]/50"
            />
          </div>
        </div>

        {/* เวลาเกิด — หมุนเลือกชั่วโมงและนาที */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between ml-1">
            <label className="text-xs font-semibold text-[#C6B79F] uppercase tracking-wider">
              เวลาเกิด
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#C6A96B] cursor-pointer transition-colors select-none">
              <input
                type="checkbox"
                checked={unknownTime}
                onChange={(e) => setUnknownTime(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-[#D9BC82]/30 text-amber-500 focus:ring-amber-500/30 bg-[#0A1628]/50"
              />
              <span>ไม่ทราบเวลาเกิดแน่นอน</span>
            </label>
          </div>

          <input
            type="hidden"
            name="birthTime"
            value={unknownTime ? "12:00" : `${selectedHour}:${selectedMinute}`}
          />

          {unknownTime ? (
            <div className="p-3.5 rounded-xl border border-[#D9BC82]/20 bg-[#0A1628]/40 text-xs sm:text-sm text-[#C6B79F] flex items-center justify-between font-sarabun">
              <span>✦ ใช้เวลามาตรฐานสากล: <strong className="text-[#F8F6F1]">12:00 น. (เที่ยงวัน)</strong></span>
              <span className="text-[11px] text-amber-400/90 font-medium">คำนวณตำแหน่งดาวระดับวัน</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2.5">
                {/* หมุนเลือกชั่วโมง */}
                <div className="relative">
                  <select
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(e.target.value)}
                    className="w-full bg-[#0A1628]/50 border border-[#D9BC82]/20 rounded-xl px-3.5 py-2.5 text-sm text-[#F8F6F1] font-mono focus:outline-none focus:border-[#D9BC82]/50 appearance-none cursor-pointer"
                  >
                    {Array.from({ length: 24 }, (_, i) => {
                      const h = String(i).padStart(2, "0");
                      const period = i < 6 ? "ดึก" : i < 12 ? "เช้า" : i < 18 ? "บ่าย" : "ค่ำ";
                      return (
                        <option key={h} value={h} className="bg-[#0A1628] text-[#F8F6F1]">
                          {h} นาฬิกา ({period})
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-[#C6A96B]">
                    ▼
                  </div>
                </div>

                {/* หมุนเลือกนาที */}
                <div className="relative">
                  <select
                    value={selectedMinute}
                    onChange={(e) => setSelectedMinute(e.target.value)}
                    className="w-full bg-[#0A1628]/50 border border-[#D9BC82]/20 rounded-xl px-3.5 py-2.5 text-sm text-[#F8F6F1] font-mono focus:outline-none focus:border-[#D9BC82]/50 appearance-none cursor-pointer"
                  >
                    {Array.from({ length: 60 }, (_, i) => {
                      const m = String(i).padStart(2, "0");
                      return (
                        <option key={m} value={m} className="bg-[#0A1628] text-[#F8F6F1]">
                          {m} นาที
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-[#C6A96B]">
                    ▼
                  </div>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto no-scrollbar">
                <span className="text-[11px] text-[#94A3B8] shrink-0 font-sarabun">เวลายอดนิยม:</span>
                {[
                  { label: "06:09 เช้า", h: "06", m: "09" },
                  { label: "09:09 มงคล", h: "09", m: "09" },
                  { label: "12:00 เที่ยง", h: "12", m: "00" },
                  { label: "15:30 บ่าย", h: "15", m: "30" },
                  { label: "18:00 เย็น", h: "18", m: "00" },
                  { label: "21:00 ค่ำ", h: "21", m: "00" },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setSelectedHour(preset.h);
                      setSelectedMinute(preset.m);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-sarabun transition-all shrink-0 ${
                      selectedHour === preset.h && selectedMinute === preset.m
                        ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] font-bold shadow-xs"
                        : "bg-[#0A1628]/40 border border-[#D9BC82]/15 text-[#C6B79F] hover:border-[#D9BC82]/40"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Input
          name="birthPlace"
          type="text"
          label="จังหวัดเกิด"
          placeholder="เช่น กรุงเทพฯ, เชียงใหม่"
          required
        />

        <div className="h-px bg-[#D9BC82]/10 my-2" />

        <Input
          name="email"
          type="email"
          label="อีเมลสำหรับ Login"
          placeholder="name@example.com"
          required
        />
        <Input
          name="password"
          type="password"
          label="ตั้งรหัสผ่าน"
          placeholder="6 ตัวอักษรขึ้นไป"
          required
          minLength={6}
        />

        <div className="h-px bg-[#D9BC82]/10 my-2" />
        
        <Input
          name="referralCode"
          label="รหัสผู้แนะนำ (ถ้ามี)"
          defaultValue={refParam}
          placeholder="กรอกรหัสแนะนำ 6 หลัก"
        />
        
        <input type="hidden" name="displayName" value="" />

        {actionData?.error && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
            {actionData.error}
          </p>
        )}

        <Button type="submit" loading={isLoading} className="w-full mt-2 py-6 text-lg font-bold shadow-lg shadow-gold/20">
          บันทึกดวงชะตา & เริ่มใช้งาน
        </Button>
      </Form>

      <p className="text-center text-[#C6B79F] text-sm mt-8">
        มีบัญชีวิเคราะห์อยู่แล้ว?{" "}
        <Link
          to="/login"
          className="text-[#C9A96E] hover:text-[#E8D4A8] font-bold transition-colors"
        >
          เข้าสู่ระบบ
        </Link>
      </p>
    </Card>
  );
}
