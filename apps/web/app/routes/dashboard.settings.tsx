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
import { useTranslation } from "react-i18next";
import i18next from "~/lib/i18n/i18n.server";

export const meta: MetaFunction = () => [
  { title: "Settings — PhopePhum" },
];

function generateReferralCode(userId: string): string {
  return userId.replace(/-/g, "").substring(0, 8).toUpperCase();
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  let profile = await getProfile(user.id, request, env);

  const locale = await i18next.getLocale(request);
  const currentLocale = locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "th-TH";

  const { supabase } = createSupabaseClient(request, env);

  if (profile && !profile.referral_code) {
    const newCode = generateReferralCode(user.id);
    await supabase
      .from("profiles")
      .update({ referral_code: newCode })
      .eq("id", user.id);
    profile = { ...profile, referral_code: newCode };
  }

  const { data: walletHistory } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const withdrawals: any[] = [];

  const { count: referralsCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("referred_by", profile?.referral_code);

  const { data: referralsList } = await supabase
    .from("profiles")
    .select("created_at, display_name, plan")
    .eq("referred_by", profile?.referral_code)
    .order("created_at", { ascending: false })
    .limit(10);

  const commissionRate = profile?.plan === 'imperial' ? 10 : profile?.plan === 'pro' ? 5 : 3;

  return json({
    user,
    profile,
    currentLocale,
    wallet: {
      balance: Number(profile?.wallet_balance || 0),
      history: walletHistory || [],
      withdrawals: withdrawals || [],
      referralsCount: referralsCount || 0,
      referralsList: referralsList || [],
      commissionRate
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
    const birthDay = parseInt(String(formData.get("birthDay") ?? "0"), 10);
    const birthMonth = parseInt(String(formData.get("birthMonth") ?? "0"), 10);
    const birthYearBE = parseInt(String(formData.get("birthYear") ?? "0"), 10);
    const birthTime = String(formData.get("birthTime") ?? "");
    const birthPlace = String(formData.get("birthPlace") ?? "");
    const gender = String(formData.get("gender") ?? "");

    if (!displayName) {
      return json({ error: "displayName is required" }, { status: 400 });
    }

    let birthDate: string | null = null;
    if (birthDay > 0 && birthMonth > 0 && birthYearBE >= 2400) {
      const birthYearCE = birthYearBE - 543;
      birthDate = `${birthYearCE}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        birth_date: birthDate,
        birth_time: birthTime || null,
        birth_place: birthPlace || null,
        gender: gender || null,
      })
      .eq("id", user.id);

    if (error) {
      return json({ error: `Save profile error: ${error.message}` }, { status: 500 });
    }

    return redirect("/dashboard/settings?saved=personal");
  }

  return json({ error: "Invalid action" }, { status: 400 });
}

export default function SettingsPage() {
  const { profile, wallet, currentLocale } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";
  const { t } = useTranslation(["common"]);

  const [activeTab, setActiveTab] = useState("personal");

  const birthDateBE = (() => {
    if (!profile?.birth_date) return { day: "", month: "", year: "" };
    const d = new Date(profile.birth_date + "T12:00:00");
    return {
      day: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear() + 543,
    };
  })();

  const affiliateCode = profile?.referral_code ?? "";
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== "undefined" && affiliateCode) {
      const url = `${window.location.origin}/register?ref=${affiliateCode}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const isFreetier = profile?.plan !== 'pro' && profile?.plan !== 'imperial';

  return (
    <div className="space-y-8 max-w-2xl pb-20">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[#D9BC82] text-xs tracking-widest uppercase mb-1">
            {t("common:nav.settings", "โปรไฟล์")}
          </p>
          <h1 className="font-display text-3xl font-bold text-[#F8F6F1]">
            {t("common:settings.title", "ตั้งค่าโปรไฟล์และดวงชะตา")}
          </h1>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-white/5 bg-[#0A1628]/45 p-1 rounded-2xl border border-[#D9BC82]/10 gap-1 w-full">
        <button
          onClick={() => setActiveTab("personal")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "personal"
              ? "bg-[#D9BC82] text-[#0A1628]"
              : "border-transparent text-[#C6B79F] hover:text-[#F8F6F1]"
          }`}
        >
          {t("common:settings.personal_tab", "ข้อมูลส่วนตัว")}
        </button>
        <button
          onClick={() => setActiveTab("affiliate")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "affiliate"
              ? "bg-[#D9BC82] text-[#0A1628]"
              : "border-transparent text-[#C6B79F] hover:text-[#F8F6F1]"
          }`}
        >
          {t("common:settings.affiliate_tab", "พันธมิตร & รายได้")}
        </button>
      </div>

      {/* 1. แท็บข้อมูลส่วนตัวและการเกิด */}
      {activeTab === "personal" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="space-y-6">
            <Card className="border-[#C6A96B]/10 p-6 bg-slate-950/40">
              <h2 className="text-[#C6A96B] font-display text-lg font-bold mb-4 flex items-center gap-2">
                <span>✦</span> {t("common:settings.birth_chart_data", "ข้อมูลดวงชะตากำเนิด")}
              </h2>
              
              <Form method="post" className="flex flex-col gap-5">
                <input type="hidden" name="formType" value="personal" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    name="displayName"
                    label={t("common:settings.display_name", "ชื่อดวงชะตา (ใช้แสดง)")}
                    defaultValue={profile?.display_name ?? ""}
                    placeholder={t("common:settings.display_name_placeholder", "เช่น คุณดวงดี มีโชค")}
                    required
                  />

                  <div className="flex flex-col">
                    <label className="text-[#C6B79F] text-[14px] uppercase tracking-widest block mb-2 font-bold">
                      {t("common:settings.gender", "เพศกำเนิด (สำหรับโหราจร)")}
                    </label>
                    <select
                      name="gender"
                      defaultValue={profile?.gender ?? ""}
                      className="w-full bg-[#0A1628]/70 border border-[#C6A96B]/20 text-[#F8F6F1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C6A96B]"
                    >
                      <option value="">{t("common:settings.select_gender", "เลือกเพศ...")}</option>
                      <option value="male">{t("common:settings.male", "ชาย (Male)")}</option>
                      <option value="female">{t("common:settings.female", "หญิง (Female)")}</option>
                      <option value="other">{t("common:settings.other", "อื่น ๆ (Other)")}</option>
                    </select>
                  </div>
                </div>

                {/* วัน / เดือน / ปี พ.ศ. */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col">
                    <label className="text-[#C6B79F] text-[14px] uppercase tracking-widest block mb-2 font-bold">
                      {t("common:settings.birth_day", "วันเกิด")}
                    </label>
                    <input
                      name="birthDay"
                      type="number"
                      min={1}
                      max={31}
                      defaultValue={birthDateBE.day}
                      placeholder={t("common:settings.birth_day", "วัน")}
                      className="w-full bg-[#0A1628]/70 border border-[#C6A96B]/20 text-[#F8F6F1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C6A96B]"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[#C6B79F] text-[14px] uppercase tracking-widest block mb-2 font-bold">
                      {t("common:settings.birth_month", "เดือนเกิด")}
                    </label>
                    <select
                      name="birthMonth"
                      defaultValue={birthDateBE.month}
                      className="w-full bg-[#0A1628]/70 border border-[#C6A96B]/20 text-[#F8F6F1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C6A96B]"
                    >
                      <option value="">{t("common:settings.birth_month", "เดือน...")}</option>
                      <option value="1">{t("common:language.th") === "ไทย" ? "มกราคม" : "January"}</option>
                      <option value="2">{t("common:language.th") === "ไทย" ? "กุมภาพันธ์" : "February"}</option>
                      <option value="3">{t("common:language.th") === "ไทย" ? "มีนาคม" : "March"}</option>
                      <option value="4">{t("common:language.th") === "ไทย" ? "เมษายน" : "April"}</option>
                      <option value="5">{t("common:language.th") === "ไทย" ? "พฤษภาคม" : "May"}</option>
                      <option value="6">{t("common:language.th") === "ไทย" ? "มิถุนายน" : "June"}</option>
                      <option value="7">{t("common:language.th") === "ไทย" ? "กรกฎาคม" : "July"}</option>
                      <option value="8">{t("common:language.th") === "ไทย" ? "สิงหาคม" : "August"}</option>
                      <option value="9">{t("common:language.th") === "ไทย" ? "กันยายน" : "September"}</option>
                      <option value="10">{t("common:language.th") === "ไทย" ? "ตุลาคม" : "October"}</option>
                      <option value="11">{t("common:language.th") === "ไทย" ? "พฤศจิกายน" : "November"}</option>
                      <option value="12">{t("common:language.th") === "ไทย" ? "ธันวาคม" : "December"}</option>
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[#C6B79F] text-[14px] uppercase tracking-widest block mb-2 font-bold">
                      {t("common:settings.birth_year", "ปีเกิด (พ.ศ.)")}
                    </label>
                    <input
                      name="birthYear"
                      type="number"
                      min={2400}
                      max={2600}
                      defaultValue={birthDateBE.year}
                      placeholder="เช่น 2525"
                      className="w-full bg-[#0A1628]/70 border border-[#C6A96B]/20 text-[#F8F6F1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C6A96B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    name="birthTime"
                    type="time"
                    label={t("common:settings.birth_time", "เวลาเกิด (ตามสูติบัตร)")}
                    defaultValue={profile?.birth_time ?? ""}
                  />

                  <Input
                    name="birthPlace"
                    label={t("common:settings.birth_place", "จังหวัดที่เกิด")}
                    defaultValue={profile?.birth_place ?? ""}
                    placeholder="เช่น กรุงเทพมหานคร"
                  />
                </div>

                {actionData && (actionData as any).error && (
                  <p className="text-red-400 text-xs font-bold">{(actionData as any).error}</p>
                )}

                <Button type="submit" loading={isLoading} className="mt-2">
                  {t("common:settings.save_birth_data", "บันทึกข้อมูลดวงเกิด")}
                </Button>
              </Form>
            </Card>
          </div>

          <Card className="border-[#C6A96B]/20 p-5 bg-gradient-to-b from-[#0A1628] to-[#020617]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-[#94A3B8] mb-1">
                  {t("common:settings.current_plan", "ระดับสมาชิกปัจจุบัน")}
                </p>
                <p className="text-2xl font-black font-display text-[#F8F6F1] uppercase">{profile?.plan || 'FREE'}</p>
              </div>
              <a href="/dashboard/upgrade"
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#020617] whitespace-nowrap"
                style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)" }}>
                {t("common:settings.upgrade", "อัปเกรด →")}
              </a>
            </div>
          </Card>
        </div>
      )}

      {/* 2. แท็บ Affiliate & E-Wallet */}
      {activeTab === "affiliate" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Affiliate Explanation Card */}
          <Card className="border-[#C6A96B]/30 bg-gradient-to-br from-[#0B1528] to-[#020617] overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="p-6 md:w-2/3 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🤝</span>
                  <h2 className="font-display text-xl font-bold text-[#F8F6F1]">
                    {t("common:settings.affiliate_title", "โปรแกรมแนะนำเพื่อน (Affiliate)")}
                  </h2>
                </div>
                <p className="text-[#94A3B8] text-sm leading-relaxed">
                  {t("common:landing.features.items.4.desc", "ร่วมเป็นส่วนหนึ่งและสร้างรายได้ง่ายๆ เพียงแนะนำเพื่อนให้รู้จักกับระบบภูมิปัญญาของเรา")}
                </p>
              </div>
            </div>
          </Card>

          {/* Wallet & Stats Dashboard */}
          <div className="grid grid-cols-1 gap-4">
            <Card className="relative overflow-hidden border-[#C6A96B]/30 p-6 bg-gradient-to-br from-[#0B1528] to-[#020617] shadow-xl">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">💰</div>
              <p className="text-[#C6B79F] text-[13px] uppercase tracking-widest font-bold mb-1">
                {t("common:settings.wallet_balance", "ยอดเงินสะสมในกระเป๋าพันธมิตร")}
              </p>
              <h3 className="text-3xl font-black font-display text-[#F8F6F1]">฿{wallet.balance.toLocaleString(currentLocale, { minimumFractionDigits: 2 })}</h3>
              <div className="mt-4 w-full py-2 bg-[#C6A96B]/5 text-[#C6A96B] border border-[#C6A96B]/20 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5 uppercase tracking-wider">
                {t("common:settings.redeem_service", "แลกรับบริการภายในแอป")}
              </div>
            </Card>

            <Card className="border-white/5 p-6 bg-slate-900/40">
              <p className="text-[#C6B79F] text-[13px] uppercase tracking-widest font-bold mb-1">
                {t("common:settings.referred_friends", "แนะนำเพื่อนสำเร็จ")}
              </p>
              <h3 className="text-3xl font-black font-display text-[#F8F6F1]">
                {wallet.referralsCount} <span className="text-sm font-normal text-[#C6B79F]">{t("common:settings.friends_unit", "ท่าน")}</span>
              </h3>
            </Card>

            <Card className="border-white/5 p-6 bg-slate-900/40">
              <p className="text-[#C6B79F] text-[13px] uppercase tracking-widest font-bold mb-1">
                {t("common:settings.referred_code_label", "รหัสแนะนำของคุณ")}
              </p>
              {affiliateCode ? (
                <>
                  <h3 className="text-3xl font-black font-display text-[#C6A96B] tracking-widest">{affiliateCode}</h3>
                  <button
                    onClick={handleCopyLink}
                    className="mt-3 text-[13px] font-bold text-[#F8F6F1] underline hover:text-[#C6A96B] transition-colors"
                  >
                    {copied ? t("common:settings.copied_link", "✓ คัดลอกลิงก์แล้ว") : t("common:settings.copy_link_btn", "คัดลอกลิงก์แนะนำเพื่อน")}
                  </button>
                </>
              ) : (
                <p className="text-[#4A5568] text-xs mt-2 italic">Generating code...</p>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            {/* Transaction History Table */}
            <Card className="border-white/5 p-0 overflow-hidden bg-slate-900/40">
              <div className="px-6 py-4 border-b border-white/5 bg-white/5">
                <h3 className="text-[#F8F6F1] font-display text-sm font-bold">
                  {t("common:settings.wallet_history", "ประวัติกระเป๋าเงิน (Wallet History)")}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/60 text-[#C6B79F] uppercase font-bold tracking-widest text-[12px]">
                      <th className="px-6 py-3">{t("common:settings.tx_datetime", "วัน/เวลา")}</th>
                      <th className="px-6 py-3">{t("common:settings.tx_type", "รายการ")}</th>
                      <th className="px-6 py-3 text-right">{t("common:settings.tx_amount", "จำนวนเงิน")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {wallet.history.length > 0 ? (
                      wallet.history.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-white/5 text-[#D9CDB7]">
                          <td className="px-6 py-4 text-[13px]">
                            {new Date(tx.created_at).toLocaleString(currentLocale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-4">{tx.description}</td>
                          <td className={`px-6 py-4 text-right font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} ฿
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-10 text-center text-[#C6B79F] italic">
                          {t("common:settings.no_tx_history", "ยังไม่มีรายการในขณะนี้")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
