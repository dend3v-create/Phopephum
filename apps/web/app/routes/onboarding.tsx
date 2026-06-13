import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, useActionData, Link } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import type { Env } from "~/env.server";
import { useState, useEffect } from "react";

export const meta: MetaFunction = () => [
  { title: "ยินดีต้อนรับสู่ ภพภูมิ | เริ่มต้นตั้งดวงชะตาของคุณ" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  // หากตั้งวันเกิดเรียบร้อยแล้ว ให้ข้ามไปที่ Dashboard ได้เลย
  if (profile?.birth_date) {
    return redirect("/dashboard");
  }

  return json({ user, profile });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const formData = await request.formData();
  
  const { supabase } = createSupabaseClient(request, env);

  const displayName = String(formData.get("displayName") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim();
  const birthDay = parseInt(String(formData.get("birthDay") ?? "0"), 10);
  const birthMonth = parseInt(String(formData.get("birthMonth") ?? "0"), 10);
  const birthYearBE = parseInt(String(formData.get("birthYear") ?? "0"), 10);
  const birthTime = String(formData.get("birthTime") ?? "").trim();
  const birthPlace = String(formData.get("birthPlace") ?? "").trim();
  const unknownTime = formData.get("unknownTime") === "true";

  if (!displayName) {
    return json({ error: "กรุณากรอกชื่อของคุณสำหรับแสดงผล" }, { status: 400 });
  }
  if (!gender) {
    return json({ error: "กรุณาเลือกเพศสำหรับคำนวณทักษาโหราจร" }, { status: 400 });
  }
  if (birthDay <= 0 || birthMonth <= 0 || birthYearBE < 2400) {
    return json({ error: "กรุณากรอกวัน เดือน ปีเกิด (พ.ศ.) ให้ถูกต้อง" }, { status: 400 });
  }

  // แปลง พ.ศ. → ค.ศ. (ลบ 543)
  const birthYearCE = birthYearBE - 543;
  const birthDate = `${birthYearCE}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`;

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      birth_date: birthDate,
      birth_time: unknownTime ? null : (birthTime || null),
      birth_place: birthPlace || null,
      gender,
      // แถมเครดิตต้อนรับ หรือเปิดสถานะเริ่มต้น
      membership_status: "active",
      time_sands: 15, // มอบทรายต้อนรับ 15 ละอองทราย (Sands of Time)
    })
    .eq("id", user.id);

  if (error) {
    console.error("[onboarding] error:", error);
    return json({ error: `ไม่สามารถบันทึกข้อมูลได้: ${error.message}` }, { status: 500 });
  }

  return json({ success: true });
}

export default function Onboarding() {
  const { profile } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [gender, setGender] = useState<string>("");
  const [unknownTime, setUnknownTime] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);

  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success) {
      setShowModal(true);
    }
  }, [actionData]);

  return (
    <div className="min-h-screen cosmic-ocean-bg star-field flex items-center justify-center p-4 relative overflow-hidden text-[#F8F6F1]">
      
      {/* Background radial glow */}
      <div className="absolute w-[600px] h-[600px] rounded-full pointer-events-none bg-radial from-mystic-500/10 to-transparent blur-3xl -top-40 -left-40" />
      <div className="absolute w-[600px] h-[600px] rounded-full pointer-events-none bg-radial from-gold-500/10 to-transparent blur-3xl -bottom-40 -right-40" />

      {/* Main Container Card */}
      <div className="card-glass-premium w-full max-w-md p-6 sm:p-8 border border-border-gold/30 shadow-2xl relative z-10 animate-fade-up">
        
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-gold-500/30 bg-gold-500/5 mb-3 animate-float">
            <span className="font-display text-[#C6A96B] font-bold text-base">P</span>
          </div>
          <p className="text-[#D9BC82] text-[9px] tracking-[0.25em] uppercase mb-1 opacity-70">
            Wisdom Guidance OS
          </p>
          <h2 className="font-display text-2xl font-bold text-text-primary glow-gold">
            ประตูสู่ชะตาฟ้า
          </h2>
          <p className="text-text-muted text-xs mt-1.5 font-sans-thai">
            บันทึกข้อมูลดวงชะตากำเนิดเพื่อเริ่มต้นนำทางพลังงานชีวิตคุณ
          </p>
        </div>

        {/* Error message */}
        {actionData && "error" in actionData && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center font-bold">
            ⚠ {actionData.error}
          </div>
        )}

        <Form method="post" className="space-y-4">
          <input type="hidden" name="gender" value={gender} />
          <input type="hidden" name="unknownTime" value={String(unknownTime)} />

          {/* 1. ชื่อ */}
          <div className="space-y-1.5">
            <label className="text-[#8A8070] text-[11px] uppercase tracking-wider block font-bold">
              ✦ ชื่อดวงชะตา (ใช้แสดงในระบบ)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold-500/60 text-xs">👤</span>
              <input
                name="displayName"
                type="text"
                placeholder="เช่น คุณดวงดี มีสุข"
                required
                className="w-full bg-[#020617]/70 border border-[#C6A96B]/20 focus:border-gold-liquid text-text-primary placeholder:text-text-muted/40 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* 2. เลือกเพศ (เหมือนปุ่มกดของมือถือ) */}
          <div className="space-y-1.5">
            <label className="text-[#8A8070] text-[11px] uppercase tracking-wider block font-bold">
              ✦ เพศกำเนิด (สำหรับทักษาจรชะตา)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setGender("male")}
                className={`py-2 rounded-xl text-xs font-bold transition-all border
                  ${gender === "male"
                    ? "bg-gold-500 text-cosmic-950 border-gold-liquid shadow-[0_0_15px_rgba(232,196,106,0.25)]"
                    : "bg-[#020617]/40 border-white/5 text-[#8A8070] hover:text-text-primary hover:border-gold-500/30"}`}
              >
                ♂ ชาย
              </button>
              <button
                type="button"
                onClick={() => setGender("female")}
                className={`py-2 rounded-xl text-xs font-bold transition-all border
                  ${gender === "female"
                    ? "bg-gold-500 text-cosmic-950 border-gold-liquid shadow-[0_0_15px_rgba(232,196,106,0.25)]"
                    : "bg-[#020617]/40 border-white/5 text-[#8A8070] hover:text-text-primary hover:border-gold-500/30"}`}
              >
                ♀ หญิง
              </button>
              <button
                type="button"
                onClick={() => setGender("other")}
                className={`py-2 rounded-xl text-xs font-bold transition-all border
                  ${gender === "other"
                    ? "bg-mystic-500 text-text-primary border-mystic-400 shadow-[0_0_15px_rgba(109,143,199,0.25)]"
                    : "bg-[#020617]/40 border-white/5 text-[#8A8070] hover:text-text-primary hover:border-gold-500/30"}`}
              >
                ⚧ อื่นๆ
              </button>
            </div>
          </div>

          {/* 3. วันเกิด (วัน / เดือน / ปี) */}
          <div className="space-y-1.5">
            <label className="text-[#8A8070] text-[11px] uppercase tracking-wider block font-bold">
              ✦ วัน เดือน ปีเกิด (พ.ศ.)
            </label>
            <div className="grid grid-cols-12 gap-2">
              <input
                name="birthDay"
                type="number"
                min={1}
                max={31}
                placeholder="วัน"
                required
                className="col-span-3 text-center bg-[#020617]/70 border border-[#C6A96B]/20 focus:border-gold-liquid text-text-primary placeholder:text-text-muted/40 rounded-xl py-2.5 text-xs focus:outline-none transition-colors"
              />
              <select
                name="birthMonth"
                required
                className="col-span-5 bg-[#020617]/70 border border-[#C6A96B]/20 focus:border-gold-liquid text-text-primary rounded-xl px-2 py-2.5 text-xs focus:outline-none transition-colors"
              >
                <option value="">เดือน...</option>
                <option value="1">มกราคม</option>
                <option value="2">กุมภาพันธ์</option>
                <option value="3">มีนาคม</option>
                <option value="4">เมษายน</option>
                <option value="5">พฤษภาคม</option>
                <option value="6">มิถุนายน</option>
                <option value="7">กรกฎาคม</option>
                <option value="8">สิงหาคม</option>
                <option value="9">กันยายน</option>
                <option value="10">ตุลาคม</option>
                <option value="11">พฤศจิกายน</option>
                <option value="12">ธันวาคม</option>
              </select>
              <input
                name="birthYear"
                type="number"
                min={2400}
                max={2600}
                placeholder="พ.ศ."
                required
                className="col-span-4 text-center bg-[#020617]/70 border border-[#C6A96B]/20 focus:border-gold-liquid text-text-primary placeholder:text-text-muted/40 rounded-xl py-2.5 text-xs focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* 4. เวลาเกิด */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[#8A8070] text-[11px] uppercase tracking-wider block font-bold">
                ✦ เวลาเกิด
              </label>
              <input
                name="birthTime"
                type="time"
                disabled={unknownTime}
                className="w-full bg-[#020617]/70 border border-[#C6A96B]/20 focus:border-gold-liquid text-text-primary rounded-xl px-3 py-2.5 text-xs focus:outline-none transition-colors disabled:opacity-30 disabled:border-white/5"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[#8A8070] text-[11px] uppercase tracking-wider block font-bold">
                ✦ จังหวัดเกิด
              </label>
              <input
                name="birthPlace"
                type="text"
                placeholder="เช่น กรุงเทพฯ"
                className="w-full bg-[#020617]/70 border border-[#C6A96B]/20 focus:border-gold-liquid text-text-primary placeholder:text-text-muted/40 rounded-xl px-3 py-2.5 text-xs focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* 5. ไม่ทราบเวลาเกิด */}
          <div className="flex items-center gap-2 pt-1">
            <input
              id="unknownTimeCheckbox"
              type="checkbox"
              checked={unknownTime}
              onChange={(e) => setUnknownTime(e.target.checked)}
              className="w-4 h-4 rounded border-white/10 bg-[#020617]/70 text-gold-500 focus:ring-0 focus:ring-offset-0"
            />
            <label htmlFor="unknownTimeCheckbox" className="text-xs text-text-muted cursor-pointer font-sans-thai select-none">
              ไม่ทราบเวลาเกิดที่แน่นอน
            </label>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 btn-gold-shine py-3 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              <span>กำลังคำนวณวิถีชะตา...</span>
            ) : (
              <>
                <span>💾 บันทึกและเปิดดวงชะตา</span>
              </>
            )}
          </button>
        </Form>
      </div>

      {/* ── Welcome Reward Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/95 backdrop-blur-md animate-fade-up">
          <div className="relative w-full max-w-sm bg-cosmic-900 rounded-[2.5rem] border border-gold-500/25 p-8 text-center shadow-2xl overflow-hidden">
            {/* Modal Glow Decoration */}
            <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full pointer-events-none bg-radial from-gold-500/10 to-transparent blur-xl" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 rounded-full pointer-events-none bg-radial from-mystic-500/10 to-transparent blur-xl" />

            <div className="relative space-y-5">
              {/* Star Emblem */}
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-gold-500/25 bg-gold-500/5 text-[#C6A96B] text-3xl animate-float">
                ✨
              </div>

              {/* Title */}
              <div>
                <h3 className="font-display text-2xl font-bold text-text-primary tracking-wide">
                  🎁 ยินดีต้อนรับสู่ ภพภูมิ!
                </h3>
                <p className="text-text-muted text-xs mt-1.5 font-sans-thai leading-relaxed">
                  รหัสพลังงานฟ้าเริ่มเชื่อมต่อแล้ว คุณได้รับทรายกาลเวลาฟรีสำหรับเริ่มต้นคำนวณแผนชีวิต
                </p>
              </div>

              {/* Reward Badge */}
              <div className="card-glass py-4 px-6 border border-emerald-500/20 bg-emerald-950/10 inline-block">
                <span className="text-emerald-400 font-display text-3xl font-black block">+15</span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.25em] mt-1 block">✦ Sands of Time ฟรี</span>
              </div>

              {/* Start Button */}
              <div className="pt-2">
                <Link
                  to="/dashboard"
                  className="w-full inline-flex items-center justify-center py-3 rounded-xl text-xs font-bold text-cosmic-950 bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-[#C6A96B]/20"
                >
                  🚀 เริ่มต้นใช้งานเลขาชีวิต AI
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
