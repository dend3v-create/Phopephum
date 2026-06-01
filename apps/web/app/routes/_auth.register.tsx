import { json, redirect } from "@remix-run/cloudflare";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { signUp } from "~/services/auth.server";
import { logEvent, EVENTS } from "~/services/analytics.server";
import { notifyNewRegistration } from "~/services/line.server";
import { createSupabaseClient, createServiceRoleClient } from "~/services/supabase.server";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";
import { useState, useEffect } from "react";

export const meta: MetaFunction = () => [
  { title: "สมัครสมาชิก — PhopePhum" },
];

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const formData = await request.formData();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "");
  const displayName = String(formData.get("displayName") ?? "");
  const referralCode = String(formData.get("referralCode") ?? "");
  
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
          plan: isAdmin ? "imperial" : "basic",
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

  return redirect("/dashboard", { headers });
}

export default function RegisterPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  // ดึงค่าแนะนำจาก URL ?ref=CODE
  const [refParam, setRefParam] = useState("");
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setRefParam(urlParams.get("ref") || "");
  }, []);

  return (
    <Card glow className="max-w-xl mx-auto my-8">
      <div className="text-center mb-8">
        <h2 className="font-display text-2xl font-bold text-[#F3EFE8] mb-2">
          ลงทะเบียนวิเคราะห์ชะตาชีวิต
        </h2>
        <p className="text-[#8A8070] text-sm">
          ปัญญาศาสตร์ เลข 7 ตัว 9 ฐาน + ยามอัฏฐกาลเฉพาะบุคคล
        </p>
      </div>

      <Form method="post" className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            name="fullName"
            type="text"
            label="ชื่อ-นามสกุลจริง"
            placeholder="กรอกชื่อ-นามสกุล ของคุณ"
            required
          />
          <div className="flex flex-col gap-1.5">
             <label className="text-xs font-semibold text-[#8A8070] uppercase tracking-wider ml-1">เพศ</label>
             <select name="gender" className="w-full bg-[#0A1628]/50 border border-[#D9BC82]/20 rounded-xl px-4 py-2.5 text-sm text-[#F8F6F1] focus:outline-none focus:border-[#D9BC82]/50">
                <option value="ชาย">ชาย</option>
                <option value="หญิง">หญิง</option>
             </select>
          </div>
        </div>

        {/* วันเกิด พ.ศ. — แยก 3 ช่อง */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#8A8070] uppercase tracking-wider ml-1">
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

        <Input
          name="birthTime"
          type="time"
          label="เวลาเกิด"
          placeholder="00:00"
        />

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

      <p className="text-center text-[#8A8070] text-sm mt-8">
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
