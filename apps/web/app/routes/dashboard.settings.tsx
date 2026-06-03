import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, useActionData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { notifyWithdrawalRequest } from "~/services/line.server";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";
import { useState } from "react";

export const meta: MetaFunction = () => [
  { title: "ตั้งค่าโปรไฟล์และรายได้แนะนำ — PhopePhum" },
];

/** สร้าง referral_code แบบ unique จาก userId */
function generateReferralCode(userId: string): string {
  return userId.replace(/-/g, "").substring(0, 8).toUpperCase();
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  let profile = await getProfile(user.id, request, env);

  const { supabase } = createSupabaseClient(request, env);

  // Auto-generate referral_code ถ้ายังไม่มี (ทุก member รวมถึง free tier)
  if (profile && !profile.referral_code) {
    const newCode = generateReferralCode(user.id);
    await supabase
      .from("profiles")
      .update({ referral_code: newCode })
      .eq("id", user.id);
    profile = { ...profile, referral_code: newCode };
  }

  // 1. ดึงข้อมูลประวัติกระเป๋าเงิน (Wallet Transactions)
  const { data: walletHistory } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // 2. ดึงข้อมูลคำขอถอนเงิน (Withdrawal Requests)
  const { data: withdrawals } = await supabase
    .from("withdrawal_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // 3. นับจำนวนคนที่แนะนำมา
  const { count: referralsCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("referred_by", profile?.referral_code);

  // 4. ดึงรายชื่อคนที่ชวนมาล่าสุด
  const { data: referralsList } = await supabase
    .from("profiles")
    .select("created_at, display_name, plan")
    .eq("referred_by", profile?.referral_code)
    .order("created_at", { ascending: false })
    .limit(10);

  // 5. คำนวณเปอร์เซ็นต์ตามแผนปัจจุบัน
  const commissionRate = profile?.plan === 'imperial' ? 10 : profile?.plan === 'pro' ? 5 : 3;

  return json({
    user,
    profile,
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

  if (formType === "withdrawal_request") {
    const amount = Number(formData.get("amount") ?? 0);
    const bankName = String(formData.get("bankName") ?? "");
    const accountName = String(formData.get("accountName") ?? "");
    const accountNumber = String(formData.get("accountNumber") ?? "");

    if (amount < 100) {
      return json({ error: "ยอดถอนขั้นต่ำคือ 100 บาท" }, { status: 400 });
    }

    if (!bankName || !accountName || !accountNumber) {
      return json({ error: "กรุณากรอกข้อมูลธนาคารให้ครบถ้วน" }, { status: 400 });
    }

    // ตรวจสอบยอดเงินคงเหลือ
    const profile = await getProfile(user.id, request, env);
    const currentBalance = Number(profile?.wallet_balance || 0);

    if (currentBalance < amount) {
      return json({ error: "ยอดเงินในกระเป๋าไม่เพียงพอ" }, { status: 400 });
    }

    // 1. สร้างคำขอถอนเงิน
    const { error: withdrawError } = await supabase
      .from("withdrawal_requests")
      .insert({
        user_id: user.id,
        amount,
        bank_name: bankName,
        account_name: accountName,
        account_number: accountNumber,
        status: "pending",
      });

    if (withdrawError) {
      return json({ error: `ไม่สามารถส่งคำขอถอนเงินได้: ${withdrawError.message}` }, { status: 500 });
    }

    // 1.1 ส่ง LINE แจ้งเตือนแอดมิน
    await notifyWithdrawalRequest(env, {
      userId: user.id,
      displayName: profile?.display_name || user.email,
      amount,
      bankName,
      accountName,
      accountNumber,
    }).catch(err => console.error("[Settings] LINE notify failed:", err));

    // 2. หักเงินจากกระเป๋า
    await supabase
      .from("profiles")
      .update({ wallet_balance: currentBalance - amount })
      .eq("id", user.id);

    // 3. บันทึก Transaction
    await supabase
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        amount: -amount,
        type: "withdrawal",
        description: `ถอนเงินเข้าบัญชี ${bankName} (${accountNumber})`,
      });

    return redirect("/dashboard/settings?saved=withdraw&tab=affiliate");
  }

  return json({ error: "รูปแบบการทำงานไม่ถูกต้อง" }, { status: 400 });
}

export default function SettingsPage() {
  const { profile, wallet } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  // จัดการแท็บ
  const [activeTab, setActiveTab] = useState("personal");
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // รหัสแนะนำเฉพาะตัว
  const affiliateCode = profile?.referral_code || "";
  const referralLink = affiliateCode
    ? `https://phopephum.com/register?ref=${affiliateCode}`
    : "";
  const [copied, setCopied] = useState(false);
  const isFreetier = !profile?.subscription || profile.subscription === "free";

  const handleCopyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).catch(() => {
      // fallback สำหรับ browser ที่ไม่รองรับ
      const el = document.createElement("textarea");
      el.value = referralLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#F8F6F1] mb-1">
          การตั้งค่า <span className="text-[#C6A96B] font-normal text-base block sm:inline sm:ml-2">Settings & Dashboard</span>
        </h1>
        <p className="text-[#8A8070] text-sm">
          ปรับแต่งข้อมูลดวงชะตากำเนิด ตรวจสอบสิทธิ์สมาชิก และแผงควบคุมรายได้ Affiliate
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
          onClick={() => setActiveTab("affiliate")}
          className={`py-3 px-5 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === "affiliate"
              ? "border-[#C6A96B] text-[#C6A96B] bg-white/5"
              : "border-transparent text-[#8A8070] hover:text-[#F8F6F1]"
          }`}
        >
          พันธมิตร & รายได้ (Affiliate)
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

                <Button type="submit" loading={isLoading} className="mt-2">
                  บันทึกข้อมูลดวงเกิด
                </Button>
              </Form>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-[#C6A96B]/20 p-6 bg-gradient-to-b from-[#0A1628] to-[#020617]">
              <h3 className="font-display font-bold text-[#F8F6F1] text-base mb-2">ระดับสมาชิกปัจจุบัน</h3>
              <div className="p-4 rounded-2xl bg-white/5 border border-[#C6A96B]/20 text-center mb-4">
                 <p className="text-[10px] text-[#C6A96B] font-bold uppercase tracking-widest mb-1">Current Plan</p>
                 <p className="text-2xl font-black text-[#F8F6F1] uppercase">{profile?.plan || 'FREE'}</p>
              </div>
              <p className="text-[#8A8070] text-xs leading-relaxed">
                สมาชิกระดับสูงจะได้รับเปอร์เซ็นต์ค่าแนะนำเพื่อนที่มากขึ้น (สูงสุด 10%) คุณสามารถอัปเกรดเพื่อรับรายได้ที่สูงขึ้นได้เสมอครับ
              </p>
            </Card>
          </div>
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
                  <h2 className="font-display text-xl font-bold text-[#F8F6F1]">โปรแกรมแนะนำเพื่อน (Affiliate)</h2>
                </div>
                <p className="text-[#94A3B8] text-sm leading-relaxed">
                  ร่วมเป็นส่วนหนึ่งกับ <span className="text-[#C6A96B] font-bold">ภพภูมิ</span> และสร้างรายได้ง่ายๆ เพียงแนะนำเพื่อนให้รู้จักกับระบบภูมิปัญญาพยากรณ์ของเรา <span className="text-[#F8F6F1] font-medium italic">"สมาชิกแบบฟรีก็สร้างรายได้ได้ทันที!"</span>
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                    <p className="text-[10px] text-[#8A8070] uppercase font-bold mb-1">สมาชิกทั่วไป/Basic</p>
                    <p className="text-xl font-black text-[#F8F6F1]">3%</p>
                  </div>
                  <div className="bg-[#C6A96B]/10 border border-[#C6A96B]/30 rounded-2xl p-3 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-[#C6A96B] text-[#020617] text-[8px] px-2 font-bold uppercase">Popular</div>
                    <p className="text-[10px] text-[#C6A96B] uppercase font-bold mb-1">สมาชิกระดับ PRO</p>
                    <p className="text-xl font-black text-[#C6A96B]">5%</p>
                  </div>
                  <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-3 text-center">
                    <p className="text-[10px] text-indigo-400 uppercase font-bold mb-1">ระดับ IMPERIAL</p>
                    <p className="text-xl font-black text-indigo-400">10%</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 p-6 md:w-1/3 border-t md:border-t-0 md:border-l border-white/10">
                <h3 className="text-[#F8F6F1] font-bold text-sm mb-4">เงื่อนไขการรับรายได้</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-xs">
                    <span className="text-[#C6A96B]">✓</span>
                    <span className="text-[#D9CDB7]">ถอนเงินขั้นต่ำ <span className="font-bold text-[#F8F6F1]">100 บาท</span></span>
                  </li>
                  <li className="flex items-start gap-2 text-xs">
                    <span className="text-[#C6A96B]">✓</span>
                    <span className="text-[#D9CDB7]">คำนวณยอดเงินแบบเรียลไทม์</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs">
                    <span className="text-[#C6A96B]">✓</span>
                    <span className="text-[#D9CDB7]">สรุปยอดชัดเจนที่หน้าแดชบอร์ดนี้</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs">
                    <span className="text-[#C6A96B]">✓</span>
                    <span className="text-[#D9CDB7]">ถอนเข้าบัญชีธนาคารไทยได้ทุกธนาคาร</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Commission upgrade prompt สำหรับ free member */}
          {isFreetier && (
            <div className="rounded-2xl border border-[#C6A96B]/25 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              style={{ background: "rgba(198,169,107,0.06)" }}>
              <div>
                <p className="text-[#C6A96B] text-xs font-bold mb-0.5">✦ อัปเกรดเพื่อรับคอมมิชชั่นสูงขึ้น</p>
                <p className="text-[#94A3B8] text-[11px]">
                  Free: 3% · Basic: 3% · Pro: 5% · Imperial: 10% — ยิ่งระดับสูง ยิ่งได้มากขึ้น
                </p>
              </div>
              <a href="/dashboard/upgrade"
                className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-[#020617] whitespace-nowrap"
                style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)" }}>
                อัปเกรดสมาชิก →
              </a>
            </div>
          )}

          {/* Wallet & Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="relative overflow-hidden border-[#C6A96B]/30 p-6 bg-gradient-to-br from-[#0B1528] to-[#020617] shadow-xl">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">💰</div>
              <p className="text-[#8A8070] text-[10px] uppercase tracking-widest font-bold mb-1">ยอดเงินคงเหลือในกระเป๋า</p>
              <h3 className="text-3xl font-black font-display text-[#F8F6F1]">฿{wallet.balance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</h3>
              <button
                onClick={() => setShowWithdrawModal(true)}
                disabled={wallet.balance < 100}
                className="mt-4 w-full py-2 rounded-xl text-xs font-bold bg-[#C6A96B] text-[#020617] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                title={wallet.balance < 100 ? "ต้องมียอดอย่างน้อย 100฿ จึงจะถอนได้" : undefined}
              >
                ถอนเงินเข้าบัญชี {wallet.balance < 100 ? `(ขาดอีก ฿${(100 - wallet.balance).toFixed(0)})` : "(ขั้นต่ำ 100฿)"}
              </button>
            </Card>

            <Card className="border-white/5 p-6 bg-slate-900/40">
              <p className="text-[#8A8070] text-[10px] uppercase tracking-widest font-bold mb-1">แนะนำเพื่อนสำเร็จ</p>
              <h3 className="text-3xl font-black font-display text-[#F8F6F1]">{wallet.referralsCount} <span className="text-sm font-normal text-[#8A8070]">ท่าน</span></h3>
              <p className="text-[10px] text-[#C6A96B] mt-2 font-bold uppercase tracking-tighter">
                คอมมิชชั่นปัจจุบัน {wallet.commissionRate}%
                {isFreetier && <span className="text-[#4A5568] ml-1">(อัปเกรดเพื่อเพิ่ม)</span>}
              </p>
            </Card>

            <Card className="border-white/5 p-6 bg-slate-900/40">
              <p className="text-[#8A8070] text-[10px] uppercase tracking-widest font-bold mb-1">รหัสแนะนำของคุณ</p>
              {affiliateCode ? (
                <>
                  <h3 className="text-3xl font-black font-display text-[#C6A96B] tracking-widest">{affiliateCode}</h3>
                  <button
                    onClick={handleCopyLink}
                    className="mt-3 text-[10px] font-bold text-[#F8F6F1] underline hover:text-[#C6A96B] transition-colors"
                  >
                    {copied ? "✓ คัดลอกลิงก์แล้ว" : "คัดลอกลิงก์แนะนำเพื่อน"}
                  </button>
                </>
              ) : (
                <p className="text-[#4A5568] text-xs mt-2 italic">กำลังสร้างรหัส...</p>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Transaction History Table */}
              <Card className="border-white/5 p-0 overflow-hidden bg-slate-900/40">
                <div className="px-6 py-4 border-b border-white/5 bg-white/5">
                  <h3 className="text-[#F8F6F1] font-display text-sm font-bold">ประวัติกระเป๋าเงิน (Wallet History)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950/60 text-[#8A8070] uppercase font-bold tracking-widest text-[9px]">
                        <th className="px-6 py-3">วัน/เวลา</th>
                        <th className="px-6 py-3">รายการ</th>
                        <th className="px-6 py-3 text-right">จำนวนเงิน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {wallet.history.length > 0 ? (
                        wallet.history.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-white/5 text-[#D9CDB7]">
                            <td className="px-6 py-4 text-[10px]">
                              {new Date(tx.created_at).toLocaleString("th-TH", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-6 py-4">{tx.description}</td>
                            <td className={`px-6 py-4 text-right font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} ฿
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={3} className="px-6 py-10 text-center text-[#8A8070] italic">ยังไม่มีรายการในขณะนี้</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Withdrawal Status */}
              <Card className="border-white/5 p-0 overflow-hidden bg-slate-900/40">
                <div className="px-5 py-4 border-b border-white/5 bg-white/5">
                  <h3 className="text-[#F8F6F1] font-display text-sm font-bold">สถานะการถอนเงิน</h3>
                </div>
                <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                  {wallet.withdrawals.length > 0 ? (
                    wallet.withdrawals.map((w: any) => (
                      <div key={w.id} className="p-3 rounded-xl bg-black/20 border border-white/5 text-xs flex justify-between items-center">
                        <div className="space-y-1">
                          <p className="text-[#F8F6F1] font-bold">ถอน ฿{w.amount.toLocaleString()}</p>
                          <p className="text-[9px] text-[#8A8070]">{new Date(w.created_at).toLocaleDateString("th-TH")}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                          w.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          w.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {w.status === 'completed' ? 'สำเร็จ' : w.status === 'rejected' ? 'ปฏิเสธ' : 'รอดำเนินการ'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-6 text-[#8A8070] italic">ไม่มีคำขอถอนเงิน</p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0a2240] rounded-[2.5rem] border border-white/10 p-8 shadow-2xl">
            <h3 className="font-display text-2xl font-bold text-[#F8F6F1] mb-6 text-center">ถอนรายได้สะสม</h3>
            
            <Form method="post" className="space-y-5" onSubmit={() => setShowWithdrawModal(false)}>
              <input type="hidden" name="formType" value="withdrawal_request" />
              
              <Input 
                name="amount" 
                type="number" 
                label="จำนวนเงินที่ต้องการถอน (฿)" 
                min={100} 
                max={wallet.balance} 
                defaultValue={wallet.balance}
                required 
              />

              <div className="space-y-1.5">
                <label className="text-[#8A8070] text-[10px] uppercase tracking-widest block font-bold">ธนาคาร</label>
                <select name="bankName" className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#F8F6F1]" required>
                  <option value="กสิกรไทย">ธนาคารกสิกรไทย (KBANK)</option>
                  <option value="ไทยพาณิชย์">ธนาคารไทยพาณิชย์ (SCB)</option>
                  <option value="กรุงเทพ">ธนาคารกรุงเทพ (BBL)</option>
                  <option value="กรุงไทย">ธนาคารกรุงไทย (KTB)</option>
                  <option value="กรุงศรีอยุธยา">ธนาคารกรุงศรีอยุธยา (BAY)</option>
                  <option value="ออมสิน">ธนาคารออมสิน (GSB)</option>
                </select>
              </div>

              <Input name="accountNumber" label="เลขที่บัญชี" placeholder="000-0-00000-0" required />
              <Input name="accountName" label="ชื่อบัญชี (ภาษาไทย/อังกฤษ)" placeholder="ระบุชื่อตามหน้าสมุดบัญชี" required />

              <div className="pt-4 space-y-3">
                <Button type="submit" className="w-full">ยืนยันการถอนเงิน</Button>
                <button 
                  type="button" 
                  onClick={() => setShowWithdrawModal(false)}
                  className="w-full py-2 text-[#94A3B8] text-xs hover:text-[#F8F6F1] transition-colors"
                >
                  ยกเลิก
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
