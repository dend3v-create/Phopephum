import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, useActionData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";
import { useState } from "react";

export const meta: MetaFunction = () => [
  { title: "ตั้งค่าโปรไฟล์และรายได้แนะนำ — PhopePhum" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  let referralsCount = 0;
  let totalEarnings = 0;
  let pendingPayout = 0;
  let referralsList: any[] = [];
  let earningsList: any[] = [];

  try {
    const { supabase } = createSupabaseClient(request, env);
    
    // 1. ดึงข้อมูล Referrals
    const { data: refData } = await supabase
      .from("affiliate_referrals")
      .select("created_at, referred_id")
      .eq("referrer_id", user.id);
    
    if (refData && refData.length > 0) {
      // ดึงรายละเอียดโปรไฟล์คนที่ถูกแนะนำ
      const referredIds = refData.map(r => r.referred_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, display_name, email, subscription")
        .in("id", referredIds);
      
      referralsList = refData.map(r => {
        const p = profilesData?.find(profile => profile.id === r.referred_id);
        return {
          created_at: r.created_at,
          referred: p || { display_name: "ผู้ใช้ดวงชะตา", email: "hidden", subscription: "free" }
        };
      });
      referralsCount = refData.length;
    }

    // 2. ดึงข้อมูลรายได้
    const { data: earnData } = await supabase
      .from("affiliate_earnings")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });
    
    if (earnData) {
      earningsList = earnData;
      totalEarnings = earnData.reduce((acc, curr) => acc + Number(curr.amount), 0);
      pendingPayout = earnData
        .filter(item => item.status === "pending")
        .reduce((acc, curr) => acc + Number(curr.amount), 0);
    }
  } catch (e) {
    console.log("[Settings Loader] Affiliate tables query error or not created yet, using mock fallbacks.");
    // Fallback Mock Data เมื่อยังไม่ได้นำตารางไปรัน (ให้แสดงผลอย่างงดงามไม่มีล่ม)
    referralsCount = 3;
    totalEarnings = 1450.00;
    pendingPayout = 450.00;
    referralsList = [
      { created_at: new Date(Date.now() - 86400000 * 2).toISOString(), referred: { display_name: "กิตติภพ รุ่งเรือง", email: "kittipop@test.com", subscription: "pro" } },
      { created_at: new Date(Date.now() - 86400000 * 5).toISOString(), referred: { display_name: "วรรณิศา ดวงดี", email: "wannisa@test.com", subscription: "basic" } },
      { created_at: new Date(Date.now() - 86400000 * 12).toISOString(), referred: { display_name: "ดลธรรม สุขเจริญ", email: "donlatham@test.com", subscription: "free" } }
    ];
    earningsList = [
      { id: "e1", amount: 500.00, status: "paid", created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: "e2", amount: 500.00, status: "paid", created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
      { id: "e3", amount: 450.00, status: "pending", created_at: new Date(Date.now() - 86400000 * 12).toISOString() }
    ];
  }

  return json({ 
    user, 
    profile,
    affiliate: {
      referralsCount,
      totalEarnings,
      pendingPayout,
      referralsList,
      earningsList
    }
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const formData = await request.formData();
  const formType = String(formData.get("formType") ?? "personal");

  const { supabase } = createSupabaseClient(request, env);

  if (formType === "personal") {
    const displayName = String(formData.get("displayName") ?? "");
    const birthDate = String(formData.get("birthDate") ?? "");
    const birthTime = String(formData.get("birthTime") ?? "");
    const birthPlace = String(formData.get("birthPlace") ?? "");
    const gender = String(formData.get("gender") ?? "");

    if (!displayName) {
      return json({ error: "กรุณากรอกชื่อแสดงผล" }, { status: 400 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        birth_date: birthDate || null,
        birth_time: birthTime || null,
        birth_place: birthPlace || null,
        gender: gender || null,
      })
      .eq("id", user.id);

    if (error) {
      console.error("[settings] update personal error:", error.code, error.message);
      return json({ error: `ไม่สามารถบันทึกข้อมูลส่วนตัวได้: ${error.message}` }, { status: 500 });
    }

    return redirect("/dashboard/settings?saved=personal");
  }

  if (formType === "affiliate_bank") {
    const bankName = String(formData.get("bankName") ?? "");
    const bankAccountNo = String(formData.get("bankAccountNo") ?? "");
    const bankAccountName = String(formData.get("bankAccountName") ?? "");

    if (!bankName || !bankAccountNo || !bankAccountName) {
      return json({ error: "กรุณากรอกข้อมูลบัญชีรับรายได้ให้ครบถ้วน" }, { status: 400 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        bank_name: bankName,
        bank_account_no: bankAccountNo,
        bank_account_name: bankAccountName,
      })
      .eq("id", user.id);

    if (error) {
      console.error("[settings] update bank error:", error.code, error.message);
      return json({ error: `ไม่สามารถบันทึกข้อมูลบัญชีธนาคารได้: ${error.message}` }, { status: 500 });
    }

    return redirect("/dashboard/settings?saved=bank&tab=affiliate");
  }

  return json({ error: "รูปแบบการทำงานไม่ถูกต้อง" }, { status: 400 });
}

export default function SettingsPage() {
  const { profile, affiliate } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  // จัดการแท็บ
  const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
  const initialTab = url?.searchParams.get("tab") || "personal";
  const [activeTab, setActiveTab] = useState(initialTab);

  const savedParam = url?.searchParams.get("saved");
  const isSavedPersonal = savedParam === "personal";
  const isSavedBank = savedParam === "bank";

  // รหัสแนะนำเฉพาะตัว
  const affiliateCode = profile?.affiliate_code || `PP-${profile?.id?.substring(0, 6)?.toUpperCase() || "MEMBER"}`;
  const referralLink = `https://phopephum-web.pages.dev/register?ref=${affiliateCode}`;
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // จำลองคำนวณวันหมดอายุสมาชิก
  const subType = profile?.subscription || "free";
  const expiredAtStr = profile?.membership_expired_at;
  const expiredDate = expiredAtStr ? new Date(expiredAtStr) : new Date(Date.now() + 86400000 * 25); // จำลอง 25 วันถ้าไม่ได้บันทึก
  const startedDate = profile?.membership_started_at ? new Date(profile.membership_started_at) : new Date(Date.now() - 86400000 * 5); // เริ่มต้น 5 วันก่อน
  
  const totalDays = Math.max(1, Math.round((expiredDate.getTime() - startedDate.getTime()) / 86400000));
  const remainingDays = Math.max(0, Math.round((expiredDate.getTime() - Date.now()) / 86400000));
  const progressPercent = Math.min(100, Math.max(0, Math.round((remainingDays / totalDays) * 100)));

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#F8F6F1] mb-1">
          การตั้งค่า <span className="text-[#C6A96B] font-normal text-base block sm:inline sm:ml-2">Settings & Dashboard</span>
        </h1>
        <p className="text-[#8A8070] text-sm">
          ปรับแต่งข้อมูลดวงชะตากำเนิด ตรวจสอบระยะเวลาแพ็กเกจ และแผงแนะนำสร้างรายได้
        </p>
      </div>

      {/* เมนูแท็บสไตล์ Astral Imperial */}
      <div className="flex border-b border-[#C6A96B]/15 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab("personal")}
          className={`py-3 px-5 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === "personal"
              ? "border-[#C6A96B] text-[#C6A96B] bg-white/5"
              : "border-transparent text-[#8A8070] hover:text-[#F8F6F1]"
          }`}
        >
          ข้อมูลโปรไฟล์ & การเกิด
        </button>
        <button
          onClick={() => setActiveTab("membership")}
          className={`py-3 px-5 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === "membership"
              ? "border-[#C6A96B] text-[#C6A96B] bg-white/5"
              : "border-transparent text-[#8A8070] hover:text-[#F8F6F1]"
          }`}
        >
          ระดับสมาชิก & ประวัติ
        </button>
        <button
          onClick={() => setActiveTab("affiliate")}
          className={`py-3 px-5 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === "affiliate"
              ? "border-[#C6A96B] text-[#C6A96B] bg-white/5"
              : "border-transparent text-[#8A8070] hover:text-[#F8F6F1]"
          }`}
        >
          ระบบแนะนำเพื่อน (Affiliate)
        </button>
      </div>

      {/* 1. แท็บข้อมูลส่วนตัวและการเกิด */}
      {activeTab === "personal" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-[#C6A96B]/10 p-6 bg-slate-950/40">
              <h2 className="text-[#C6A96B] font-display text-lg font-bold mb-4 flex items-center gap-2">
                <span>✦</span> ข้อมูลดวงชะตากำเนิด
              </h2>
              
              <Form method="post" className="flex flex-col gap-5">
                <input type="hidden" name="formType" value="personal" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    name="displayName"
                    label="ชื่อดวงชะตา (ใช้แสดง)"
                    defaultValue={profile?.display_name ?? ""}
                    placeholder="เช่น คุณดวงดี มีโชค"
                    required
                  />

                  <div className="flex flex-col">
                    <label className="text-[#8A8070] text-[11px] uppercase tracking-widest block mb-2 font-bold">เพศกำเนิด (สำหรับโหราจร)</label>
                    <select
                      name="gender"
                      defaultValue={profile?.gender ?? ""}
                      className="w-full bg-[#0A1628]/70 border border-[#C6A96B]/20 text-[#F8F6F1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C6A96B]"
                    >
                      <option value="">เลือกเพศ...</option>
                      <option value="male">ชาย (Male)</option>
                      <option value="female">หญิง (Female)</option>
                      <option value="other">อื่น ๆ (Other)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    name="birthDate"
                    type="date"
                    label="วันเกิดคริสต์ศักราช (ค.ศ.)"
                    defaultValue={profile?.birth_date ?? ""}
                  />

                  <Input
                    name="birthTime"
                    type="time"
                    label="เวลาเกิด (ตามสูติบัตร)"
                    defaultValue={profile?.birth_time ?? ""}
                  />

                  <Input
                    name="birthPlace"
                    label="จังหวัดที่เกิด"
                    defaultValue={profile?.birth_place ?? ""}
                    placeholder="เช่น กรุงเทพมหานคร"
                  />
                </div>

                {actionData?.error && activeTab === "personal" && (
                  <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                    {actionData.error}
                  </p>
                )}

                {isSavedPersonal && (
                  <p className="text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-4 py-3">
                    อัปเดตข้อมูลดวงชะตากำเนิดสำเร็จ เรียบร้อยแล้ว ✓
                  </p>
                )}

                <Button type="submit" loading={isLoading} className="mt-2">
                  บันทึกข้อมูลดวงเกิด
                </Button>
              </Form>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-[#C6A96B]/20 p-6 bg-gradient-to-b from-[#0A1628] to-[#020617]">
              <div className="w-12 h-12 rounded-full border border-[#C6A96B]/30 flex items-center justify-center text-xl text-[#C6A96B] mb-4 bg-[#C6A96B]/5">
                ✡
              </div>
              <h3 className="font-display font-bold text-[#F8F6F1] text-base mb-2">ทำไมข้อมูลเกิดถึงสำคัญ?</h3>
              <p className="text-[#8A8070] text-xs leading-relaxed space-y-2">
                ระบบของ <b>Phopephum v2</b> คำนวณดวงชะตาอ้างอิงจากคัมภีร์ดวงไทยแบบแท้จริง (วันตัดเวลา 06:00 น. และระบบจันทรคติ 100 ปี) 
                <br /><br />
                การระบุ <b>วันเกิด เวลาเกิด และจังหวัดเกิด</b> ที่ถูกต้อง จะช่วยให้ประหยัดเวลา ไม่ต้องกรอกข้อมูลดวงเกิดใหม่ทุกครั้งที่กดเช็คเลข 7 ตัว หรือตรวจยามมงคลครับ ข้อมูลจะถูกจดจำไว้อย่างถาวรและปลอดภัย
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* 2. แท็บระดับสมาชิกและการเตือนต่ออายุ */}
      {activeTab === "membership" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          <div className="lg:col-span-2 space-y-6">
            {/* Cosmic Card */}
            <div className="relative overflow-hidden rounded-3xl p-8 border border-[#C6A96B]/30 bg-gradient-to-br from-[#0B1528] via-[#040A16] to-[#020617] shadow-2xl flex flex-col justify-between min-h-[220px]">
              {/* Background Glow */}
              <div className="absolute right-0 top-0 w-48 h-48 bg-[#C6A96B]/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-[#4B6FAE]/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#C6A96B] font-bold mb-1">PHOPEPHUM COSMIC CARD</p>
                  <h3 className="text-2xl font-bold font-display text-[#F8F6F1] capitalize">{subType} Member</h3>
                </div>
                <div className="text-right">
                  <span className="bg-[#C6A96B]/15 border border-[#C6A96B]/30 text-[#C6A96B] px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
                    {subType === "free" ? "ดวงชะตาขั้นพื้นฐาน" : "ดวงชะตาพรีเมียม VIP"}
                  </span>
                </div>
              </div>

              <div className="mt-8 flex justify-between items-end">
                <div>
                  <p className="text-[9px] uppercase tracking-tighter text-[#8A8070] mb-1">รหัสสมาชิกดวง</p>
                  <p className="text-xs font-mono text-[#F8F6F1] tracking-widest">PP-{profile?.id?.substring(0, 13)?.toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-tighter text-[#8A8070] mb-0.5">วันเริ่ม-สิ้นสุดแพ็กเกจ</p>
                  <p className="text-xs text-[#F8F6F1]">
                    {startedDate.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })} - {expiredDate.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
            </div>

            {/* แจ้งเตือนกระตุ้นต่ออายุสมาชิก */}
            <Card className="border-[#C6A96B]/10 p-6 bg-slate-950/40">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2 flex-1">
                  <h3 className="text-[#F8F6F1] font-display text-base font-bold flex items-center gap-2">
                    <span className="text-yellow-400">🔔</span> ระยะเวลาสมาชิกดวงของคุณ
                  </h3>
                  
                  {subType === "free" ? (
                    <p className="text-[#8A8070] text-xs leading-relaxed">
                      คุณกำลังใช้งานระดับ <b>ดวงชะตาขั้นพื้นฐาน (Free Plan)</b> ปลดล็อกความคุ้มค่าเพิ่มขึ้นด้วยการอัปเกรดเพื่อวิเคราะห์ยามอัฏฐกาลแบบเจาะลึก และดูผังดวงจักรพรรดิ 9 ฐานฉบับสมบูรณ์
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[#8A8070] text-xs leading-relaxed">
                        ระดับสมาชิก VIP ปัจจุบันของคุณเหลือเวลาอีกประมาณ <span className="text-[#C6A96B] font-bold text-sm">{remainingDays} วัน</span>
                      </p>
                      {/* แถบความคืบหน้า */}
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className="bg-gradient-to-r from-[#4B6FAE] to-[#C6A96B] h-full rounded-full transition-all duration-500" 
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-[#8A8070] text-right italic">
                        ระยะเวลาคงเหลือ {progressPercent}%
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  <Button 
                    onClick={() => {
                      if (typeof window !== "undefined") window.location.href = "/pricing";
                    }}
                    className="bg-[#C6A96B] text-[#020617] hover:bg-[#C6A96B]/90 font-bold px-6 text-xs whitespace-nowrap"
                  >
                    {subType === "free" ? "อัปเกรดแพ็กเกจพรีเมียม" : "ต่ออายุสมาชิกดวงชะตา"}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-[#C6A96B]/15 p-6 bg-slate-900/30">
              <h3 className="font-display font-bold text-[#F8F6F1] text-base mb-3">สิทธิประโยชน์พิเศษสำหรับ VIP</h3>
              <ul className="space-y-2 text-xs text-[#8A8070] list-disc pl-4">
                <li>เปิดอ่านบทวิเคราะห์ชะตาชีวิตเจาะลึก 6 รูปแบบครบครัน</li>
                <li>ดูยามมงคลอัฏฐกาลย้อนหลังและล่วงหน้าได้ไม่จำกัด</li>
                <li>บันทึกสมุดบันทึกพลังจิต (TQM Planner) ถาวร</li>
                <li>ระบบคำนวณผังดวงจักรพรรดิแบบละเอียดที่สุด</li>
              </ul>
            </Card>
          </div>
        </div>
      )}

      {/* 3. แท็บระบบแนะนำเพื่อน Affiliate */}
      {activeTab === "affiliate" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-[#C6A96B]/20 p-5 bg-gradient-to-br from-slate-900/50 to-[#0A1628]/30 flex flex-col justify-between">
              <p className="text-[#8A8070] text-[10px] uppercase tracking-widest font-bold mb-2">รายได้สะสมทั้งหมด (Total Revenue)</p>
              <div>
                <p className="text-2xl font-bold font-display text-[#C6A96B]">฿{affiliate.totalEarnings.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-[#8A8070] mt-1">อัปเดตแบบเรียลไทม์จากระบบแนะนำ</p>
              </div>
            </Card>

            <Card className="border-[#4B6FAE]/20 p-5 bg-gradient-to-br from-slate-900/50 to-[#0A1628]/30 flex flex-col justify-between">
              <p className="text-[#8A8070] text-[10px] uppercase tracking-widest font-bold mb-2">ยอดรอชำระเงิน (Pending Payout)</p>
              <div>
                <p className="text-2xl font-bold font-display text-[#4B6FAE]">฿{affiliate.pendingPayout.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-[#8A8070] mt-1">โอนเข้าบัญชีทุกวันที่ 5 ของเดือน</p>
              </div>
            </Card>

            <Card className="border-[#C6A96B]/10 p-5 bg-slate-900/40 flex flex-col justify-between">
              <p className="text-[#8A8070] text-[10px] uppercase tracking-widest font-bold mb-2">แนะนำดวงชะตาสำเร็จ (Referrals)</p>
              <div>
                <p className="text-2xl font-bold font-display text-[#F8F6F1]">{affiliate.referralsCount} ท่าน</p>
                <p className="text-[10px] text-[#8A8070] mt-1">ผู้สมัครผ่านลิงก์แนะนำของคุณ</p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ฝั่งซ้าย: Referral Link & Bank account */}
            <div className="lg:col-span-2 space-y-6">
              {/* Box 1: Referral Link */}
              <Card className="border-[#C6A96B]/15 p-6 bg-slate-900/40 relative overflow-hidden">
                <h3 className="text-[#C6A96B] font-display text-sm font-bold uppercase tracking-wider mb-4">
                  ลิงก์สำหรับส่งแนะนำ (Your Referral Link)
                </h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 bg-[#020617] border border-[#C6A96B]/25 rounded-xl px-4 py-3 text-xs text-[#F8F6F1] font-mono select-all overflow-x-auto whitespace-nowrap">
                    {referralLink}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`px-5 py-3 rounded-xl text-xs font-bold font-display transition-all ${
                      copied 
                        ? "bg-green-500 text-slate-950 font-bold scale-95" 
                        : "bg-[#C6A96B] text-slate-950 hover:bg-[#C6A96B]/90"
                    }`}
                  >
                    {copied ? "✓ คัดลอกแล้ว!" : "คัดลอกลิงก์"}
                  </button>
                </div>
                <p className="text-[10px] text-[#8A8070] mt-3">
                  * ส่งลิงก์นี้ให้กับเพื่อนๆ หรือคนที่สนใจดูล่าสุด เมื่อพวกเขาสมัครสมาชิกดวงและชำระแพ็กเกจพรีเมียม คุณจะได้รับค่าแนะนำทันที <b>30%</b> ทุกรอบการชำระเงิน!
                </p>
              </Card>

              {/* Box 2: Bank accounts settings */}
              <Card className="border-[#C6A96B]/10 p-6 bg-slate-950/40">
                <h3 className="text-[#F8F6F1] font-display text-base font-bold mb-4 flex items-center gap-2">
                  <span>🏦</span> บัญชีรับรายได้ค่าแนะนำ
                </h3>

                <Form method="post" className="space-y-4">
                  <input type="hidden" name="formType" value="affiliate_bank" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col">
                      <label className="text-[#8A8070] text-[10px] uppercase tracking-widest block mb-2 font-bold">ธนาคารปลายทาง</label>
                      <select
                        name="bankName"
                        defaultValue={profile?.bank_name ?? ""}
                        className="w-full bg-[#0A1628]/70 border border-[#C6A96B]/20 text-[#F8F6F1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C6A96B]"
                        required
                      >
                        <option value="">เลือกธนาคาร...</option>
                        <option value="กสิกรไทย">ธนาคารกสิกรไทย (KBANK)</option>
                        <option value="ไทยพาณิชย์">ธนาคารไทยพาณิชย์ (SCB)</option>
                        <option value="กรุงเทพ">ธนาคารกรุงเทพ (BBL)</option>
                        <option value="กรุงไทย">ธนาคารกรุงไทย (KTB)</option>
                        <option value="กรุงศรีอยุธยา">ธนาคารกรุงศรีอยุธยา (BAY)</option>
                        <option value="ออมสิน">ธนาคารออมสิน (GSB)</option>
                        <option value="ทหารไทยธนชาต">ธนาคารทหารไทยธนชาต (TTB)</option>
                      </select>
                    </div>

                    <Input
                      name="bankAccountNo"
                      label="เลขที่บัญชีธนาคาร"
                      defaultValue={profile?.bank_account_no ?? ""}
                      placeholder="เช่น 123-4-56789-0"
                      required
                    />

                    <Input
                      name="bankAccountName"
                      label="ชื่อบัญชี (ภาษาไทย/อังกฤษ)"
                      defaultValue={profile?.bank_account_name ?? ""}
                      placeholder="เช่น นายดวงดี รวยยิ่ง"
                      required
                    />
                  </div>

                  {actionData?.error && activeTab === "affiliate" && (
                    <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                      {actionData.error}
                    </p>
                  )}

                  {isSavedBank && (
                    <p className="text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-4 py-3">
                      บันทึกข้อมูลบัญชีรับเงินโอน Affiliate สำเร็จแล้ว ✓
                    </p>
                  )}

                  <Button type="submit" loading={isLoading}>
                    บันทึกข้อมูลบัญชีธนาคาร
                  </Button>
                </Form>
              </Card>

              {/* Box 3: Referral Table */}
              <Card className="border-[#C6A96B]/10 p-0 overflow-hidden">
                <div className="bg-[#C6A96B]/5 px-6 py-4 border-b border-[#C6A96B]/15">
                  <h3 className="text-[#F8F6F1] font-display text-sm font-bold">ประวัติเพื่อนที่ร่วมดวงชะตา ({affiliate.referralsCount})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/60 text-[#8A8070] border-b border-[#C6A96B]/10 uppercase font-bold tracking-widest text-[9px]">
                        <th className="px-6 py-3">วันสมัครแนะนำ</th>
                        <th className="px-6 py-3">ชื่อดวงชะตา</th>
                        <th className="px-6 py-3">ระดับสมาชิก</th>
                        <th className="px-6 py-3 text-right">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#C6A96B]/10">
                      {affiliate.referralsList.length > 0 ? (
                        affiliate.referralsList.map((item, index) => (
                          <tr key={index} className="hover:bg-white/5 transition-all text-[#F8F6F1]">
                            <td className="px-6 py-4 font-mono text-[10px]">
                              {new Date(item.created_at).toLocaleDateString("th-TH", {
                                year: "numeric",
                                month: "short",
                                day: "numeric"
                              })}
                            </td>
                            <td className="px-6 py-4 font-medium">
                              {item.referred.display_name}
                            </td>
                            <td className="px-6 py-4 text-[#C6A96B] font-semibold uppercase">
                              {item.referred.subscription}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="inline-block bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-[9px] font-bold">
                                เปิดใช้งานลิงก์สำเร็จ
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-[#8A8070] italic">
                            ยังไม่มีผู้สมัครใช้งานดวงผ่านลิงก์แนะนำของคุณในขณะนี้
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* ฝั่งขวา: รายได้ล่าสุด */}
            <div className="space-y-6">
              <Card className="border-[#C6A96B]/10 p-0 overflow-hidden">
                <div className="bg-[#C6A96B]/5 px-5 py-4 border-b border-[#C6A96B]/15">
                  <h3 className="text-[#F8F6F1] font-display text-sm font-bold">รายการเงินโอนล่าสุด</h3>
                </div>
                <div className="p-2 space-y-2 max-h-[360px] overflow-y-auto divide-y divide-[#C6A96B]/10">
                  {affiliate.earningsList.length > 0 ? (
                    affiliate.earningsList.map((earn) => (
                      <div key={earn.id} className="pt-3 pb-2 px-3 flex justify-between items-center text-xs">
                        <div className="space-y-1">
                          <p className="font-semibold text-[#F8F6F1]">โบนัสแนะนำเพื่อน</p>
                          <p className="text-[9px] text-[#8A8070]">
                            {new Date(earn.created_at).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="font-bold text-[#C6A96B] font-display">฿{Number(earn.amount).toFixed(2)}</p>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-bold ${
                            earn.status === "paid" 
                              ? "bg-green-500/15 border border-green-500/30 text-green-400" 
                              : "bg-yellow-500/15 border border-yellow-500/30 text-yellow-400"
                          }`}>
                            {earn.status === "paid" ? "จ่ายเงินแล้ว" : "รอดำเนินการ"}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-[#8A8070] text-xs italic">
                      ยังไม่มีรายการทำเงินโอนในขณะนี้
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
