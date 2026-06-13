import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, useActionData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { notifyWithdrawalRequest } from "~/services/line.server";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import type { Env } from "~/env.server";
import { useState } from "react";
import { 
  Users, 
  Award, 
  DollarSign, 
  Share2, 
  Copy, 
  Check, 
  History, 
  ArrowUpRight, 
  ShieldCheck, 
  Wallet,
  Coins,
  Send,
  HelpCircle,
  TrendingUp,
  Star
} from "lucide-react";

export const meta: MetaFunction = () => [
  { title: "ชะตาพันธมิตร (Community & Affiliate 2.0) — PhopePhum" },
];

interface RankInfo {
  name: string;
  minReferrals: number;
  maxReferrals: number;
  bonusRate: number;
  title: string;
  color: string;
  desc: string;
}

const RANKS: RankInfo[] = [
  { name: "Explorer", minReferrals: 0, maxReferrals: 2, bonusRate: 3, title: "ผู้บุกเบิกดวงดาว", color: "#94A3B8", desc: "ผู้เริ่มต้นเดินบนเส้นทางแห่งแสงสว่าง เริ่มต้นบอกต่อสัจธรรมสู่กัลยาณมิตร" },
  { name: "Guide", minReferrals: 3, maxReferrals: 9, bonusRate: 5, title: "ผู้นำทางวิญญาณ", color: "#4B6FAE", desc: "ผู้เริ่มชี้แนะให้กัลยาณมิตรเห็นแสงสว่าง ได้รับส่วนแบ่งพิเศษเพิ่มขึ้น" },
  { name: "Master", minReferrals: 10, maxReferrals: 29, bonusRate: 10, title: "คุรุผู้เจริญญาน", color: "#C6A96B", desc: "ครูผู้แบ่งปันสติปัญญา พลังงานของท่านเริ่มแผ่ขยายเพื่อช่วยเหลือผู้อื่น" },
  { name: "Mentor", minReferrals: 30, maxReferrals: 99, bonusRate: 12, title: "ผู้ประสิทธิ์ประสาทดวงดาว", color: "#EC4899", desc: "ที่ปรึกษาใหญ่ผู้ชี้แนะวิถีชีวิตดวงดาวด้วยความกรุณา" },
  { name: "Sage", minReferrals: 100, maxReferrals: 299, bonusRate: 15, title: "มหาปราชญ์ดาราศาสตร์", color: "#8B5CF6", desc: "ปราชญ์วิเศษผู้สร้างแรงกระเพื่อมใหญ่แด่คนหมู่มาก" },
  { name: "Oracle", minReferrals: 300, maxReferrals: 999999, bonusRate: 20, title: "ผู้นำสารจากทิพยสถาน", color: "#EF4444", desc: "ระดับสูงสุดของจิตวิญญาณ เป็นสื่อกลางส่งต่อพลังบารมีให้กัลยาณมิตรทุกหนแห่ง" },
];

function getRank(referralsCount: number): RankInfo {
  return RANKS.find(r => referralsCount >= r.minReferrals && referralsCount <= r.maxReferrals) || RANKS[0]!;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  let profile = await getProfile(user.id, request, env);
  const { supabase } = createSupabaseClient(request, env);

  // ตรวจสอบความถูกต้องของ referral_code หากยังไม่มี ให้สร้างขึ้นมา
  if (profile && !profile.referral_code) {
    const fallbackCode = user.id.replace(/-/g, "").substring(0, 8).toUpperCase();
    await supabase
      .from("profiles")
      .update({ referral_code: fallbackCode })
      .eq("id", user.id);
    profile = { ...profile, referral_code: fallbackCode };
  }

  // 1. ดึงประวัติธุรกรรม (Wallet Transactions)
  const { data: walletHistory } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // 2. ดึงประวัติการขอถอนเงิน (Withdrawal Requests)
  const { data: withdrawals } = await supabase
    .from("withdrawal_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // 3. นับจำนวนการแนะนำเพื่อนสำเร็จ
  const { count: referralsCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("referred_by", profile?.referral_code);

  // 4. ดึงรายชื่อเพื่อนที่แนะนำสำเร็จล่าสุด
  const { data: referralsList } = await supabase
    .from("profiles")
    .select("created_at, display_name, plan, email")
    .eq("referred_by", profile?.referral_code)
    .order("created_at", { ascending: false })
    .limit(10);

  return json({
    user,
    profile,
    referralsCount: referralsCount || 0,
    referralsList: referralsList || [],
    walletHistory: walletHistory || [],
    withdrawals: withdrawals || [],
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const { supabase } = createSupabaseClient(request, env);

  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  if (actionType === "redeem_sands") {
    const amountStr = formData.get("amount") as string;
    const amount = Number(amountStr);

    if (isNaN(amount) || amount <= 0) {
      return json({ error: "กรุณาระบุจำนวนเงินที่ถูกต้อง" }, { status: 400 });
    }

    // ดึงโปรไฟล์มาตรวจสอบยอดเงินคงเหลือปัจจุบัน
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("wallet_balance, time_sands")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return json({ error: "ไม่พบข้อมูลโปรไฟล์ผู้ใช้" }, { status: 404 });
    }

    const currentBalance = Number(profile.wallet_balance || 0);
    if (amount > currentBalance) {
      return json({ error: "ยอดเงินสะสมของคุณไม่เพียงพอสำหรับการแลกเปลี่ยน" }, { status: 400 });
    }

    // ดำเนินการหักเงินสะสมและเพิ่มทรายกาลเวลา
    // 1. หักยอดเงิน และเพิ่มทรายกาลเวลาใน profiles
    const newWalletBalance = currentBalance - amount;
    const newTimeSands = Number(profile.time_sands || 0) + amount; // 1 บาท = 1 ทรายกาลเวลา

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        wallet_balance: newWalletBalance,
        time_sands: newTimeSands
      })
      .eq("id", user.id);

    if (updateError) {
      return json({ error: "เกิดข้อผิดพลาดในการอัปเดตระบบฐานข้อมูล: " + updateError.message }, { status: 500 });
    }

    // 2. บันทึกประวัติลงใน wallet_transactions (amount เป็นลบเพื่อระบุการแลก/เบิกออก)
    const { error: txError } = await supabase
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        amount: -amount,
        type: "withdrawal",
        description: `แลกรับทรายกาลเวลา +${amount} เม็ดทราย ⏳`
      });

    if (txError) {
      console.error("[Redeem Sands] Error creating wallet transaction:", txError.message);
    }

    return json({ success: true, message: `แลกเปลี่ยนสำเร็จ! ได้รับทรายกาลเวลา +${amount} เม็ดทรายเรียบร้อยแล้ว` });
  }

  return json({ error: "การกระทำที่ไม่สนับสนุน" }, { status: 400 });
}

export default function CommunityPage() {
  const { profile, referralsCount, referralsList, walletHistory } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as { success?: boolean; message?: string; error?: string } | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [copied, setCopied] = useState(false);

  const referralCode = profile?.referral_code || "";
  const referralLink = referralCode 
    ? `${typeof window !== "undefined" ? window.location.origin : "https://phopephum.com"}/register?ref=${referralCode}`
    : "";

  const currentRank = getRank(referralsCount);
  const nextRank = RANKS.find(r => r.minReferrals > referralsCount);
  const progressPercent = nextRank 
    ? Math.min(100, (referralsCount / nextRank.minReferrals) * 100)
    : 100;

  const walletBalance = Number(profile?.wallet_balance || 0);

  const handleCopyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="text-[12px] font-bold px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">สำเร็จ</span>;
      case "rejected":
        return <span className="text-[12px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">ปฏิเสธ</span>;
      default:
        return <span className="text-[12px] font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">กำลังตรวจสอบ</span>;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl pb-24 text-[#F8F6F1]">
      {/* Title */}
      <div>
        <p className="text-[#D9BC82] text-xs tracking-widest uppercase mb-1 font-bold">Layer 6 — Affiliate 2.0</p>
        <h1 className="font-display text-3xl font-bold text-[#F8F6F1] flex items-center gap-2">
          ชะตาพันธมิตร <span className="text-[#C6A96B] font-normal text-xl">/ Community OS</span>
        </h1>
        <p className="text-[#94A3B8] text-sm mt-1">
          เชื่อมโยงเครือข่ายดวงดาวของคุณ แผ่ขยายบารมี ยกระดับจิตวิญญาณกัลยาณมิตร พร้อมสร้างรายได้เกื้อหนุนชีวิต
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Rank */}
        <Card className="bg-[#0A1628]/45 border-[#C6A96B]/15 p-6 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-2 right-2 opacity-5">
            <Award className="w-24 h-24 text-[#C6A96B]" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#C6A96B] tracking-widest uppercase">ระดับจิตวิญญาณ</span>
              <Award className="w-5 h-5 text-[#C6A96B]" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-[#F8F6F1] flex items-center gap-1.5" style={{ color: currentRank.color }}>
                {currentRank.name}
              </h2>
              <p className="text-xs text-[#94A3B8] font-bold tracking-wide mt-1">{currentRank.title}</p>
            </div>
            <p className="text-[12px] text-[#D9CDB7]/70 leading-relaxed italic">{currentRank.desc}</p>
          </div>
        </Card>

        {/* Card 2: Referrals */}
        <Card className="bg-[#0A1628]/45 border-[#C6A96B]/15 p-6 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-2 right-2 opacity-5">
            <Users className="w-24 h-24 text-[#4B6FAE]" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#4B6FAE] tracking-widest uppercase">เครือข่ายดวงชะตา</span>
              <Users className="w-5 h-5 text-[#4B6FAE]" />
            </div>
            <div>
              <h2 className="text-4xl font-display font-bold text-[#F8F6F1]">{referralsCount} <span className="text-sm text-[#94A3B8] font-sans font-normal">ท่าน</span></h2>
              <p className="text-xs text-[#94A3B8] mt-1">จำนวนเพื่อนร่วมเส้นทางที่คุณแนะนำสำเร็จ</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-[#94A3B8] font-bold">
                <span>อัตราค่าแนะนำปัจจุบัน</span>
                <span className="text-[#C6A96B]">{currentRank.bonusRate}% Commission</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Card 3: Wallet */}
        <Card className="bg-[#0A1628]/45 border-[#C6A96B]/15 p-6 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-2 right-2 opacity-5">
            <DollarSign className="w-24 h-24 text-[#C6A96B]" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#C6A96B] tracking-widest uppercase">กระเป๋าเงินพันธมิตร</span>
              <Wallet className="w-5 h-5 text-[#C6A96B]" />
            </div>
            <div>
              <h2 className="text-4xl font-display font-bold text-[#F8F6F1]">{walletBalance.toLocaleString("th-TH")} <span className="text-sm text-[#94A3B8] font-sans font-normal">บาท</span></h2>
              <p className="text-xs text-[#94A3B8] mt-1">สะสมสำหรับแลกรับบริการในแอป</p>
            </div>
            <div className="w-full py-2 bg-[#C6A96B]/5 text-[#C6A96B] border border-[#C6A96B]/20 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5 uppercase tracking-wider">
              ⏳ แลกรับบริการภายในแอป
            </div>
          </div>
        </Card>
      </div>

      {/* Rank Progression Bar */}
      {nextRank && (
        <Card className="bg-[#0A1628]/20 border-[#C6A96B]/10 p-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#C6A96B]" />
              <span className="text-[#D9CDB7]">เส้นทางยกระดับสู่จิตวิญญาณขั้นถัดไป: <strong style={{ color: nextRank.color }} className="font-display">{nextRank.name}</strong></span>
            </div>
            <span className="text-[#94A3B8]">{referralsCount} / {nextRank.minReferrals} แนะนำ</span>
          </div>
          <div className="w-full bg-[#1E293B]/40 rounded-full h-2 overflow-hidden border border-white/5 relative">
            <div 
              className="bg-gradient-to-r from-[#4B6FAE] to-[#C6A96B] h-full rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[12px] text-[#94A3B8]">
            แนะนำเพื่อนเพิ่มอีก <strong className="text-[#C6A96B]">{nextRank.minReferrals - referralsCount} คน</strong> เพื่อเลื่อนขั้นรับส่วนแบ่งสูงขึ้นเป็น <strong className="text-[#F8F6F1]">{nextRank.bonusRate}%</strong>!
          </p>
        </Card>
      )}

      {/* Referral Link & Redeem Info Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left: Invite & Referral Details */}
        <div className="space-y-6">
          <h3 className="font-display text-xl font-bold text-[#F8F6F1] flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#C6A96B]" /> ส่งต่อสัจธรรมชีวิต
          </h3>

          <Card className="bg-[#0A1628]/30 border-[#C6A96B]/10 p-6 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">ลิงก์ชวนเพื่อนของคุณ (Affiliate Link)</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="flex-1 bg-[#1E293B]/50 border border-[#D9BC82]/10 rounded-xl px-4 py-2.5 text-xs text-[#D9CDB7] outline-none"
                />
                <Button 
                  onClick={handleCopyLink}
                  className="bg-[#C6A96B] text-slate-950 hover:bg-[#E2C98A] px-4 font-bold text-xs rounded-xl flex items-center gap-1 shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "คัดลอกแล้ว" : "คัดลอก"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">รหัสแนะนำพิเศษ (Referral Code)</span>
              <div className="p-3 bg-[#C6A96B]/5 border border-[#C6A96B]/15 rounded-xl flex items-center justify-between">
                <span className="font-display font-bold text-lg text-[#C6A96B] tracking-widest">{referralCode}</span>
                <span className="text-[11px] text-[#94A3B8]">แจกสิทธิผู้ถูกชวน + รับ +50 เม็ดทรายกาลเวลา</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#C6A96B]/10 space-y-3 text-xs text-[#94A3B8] leading-relaxed">
              <p className="flex items-start gap-2">
                <span className="text-[#C6A96B] font-bold">✦</span>
                <span>ผู้ลงทะเบียนผ่านรหัสของคุณ จะได้รับแผนคำทำนายหรือพลังงานตั้งต้นพิเศษฟรี</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-[#C6A96B] font-bold">✦</span>
                <span>เมื่อเพื่อนสมัครใหม่ คุณจะได้รับทรายกาลเวลา <strong className="text-[#C6A96B]">+50 เม็ดทราย</strong> เพื่อใช้ปลดล็อกบทวิเคราะห์ชีวิต</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-[#C6A96B] font-bold">✦</span>
                <span>หากผู้สมัครนั้นทำการอัปเกรดเป็นแผนแบบพรีเมียม (Premium Subscription) คุณจะได้รับส่วนแบ่งรายเดือนเพื่อสะสมแลกรับบริการ</span>
              </p>
            </div>
          </Card>
        </div>

        {/* Right: Redeem Info Box */}
        <div className="space-y-6">
          <h3 className="font-display text-xl font-bold text-[#F8F6F1] flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#C6A96B]" /> การแลกเปลี่ยนกาลเวลา (Time Sands & Service Redeem)
          </h3>

          <Card className="bg-[#0A1628]/30 border-[#C6A96B]/10 p-6 space-y-5">
            <div className="flex justify-between items-center text-sm border-b border-[#C6A96B]/10 pb-3">
              <span className="text-[#94A3B8]">ยอดเงินสะสมในกระเป๋าพันธมิตร</span>
              <span className="text-lg font-bold text-[#C6A96B]">{walletBalance.toLocaleString("th-TH")} บาท</span>
            </div>

            <div className="space-y-4 text-xs text-[#D9CDB7] leading-relaxed">
              <p className="font-bold text-[#F8F6F1] text-sm">⏳ กาลเวลาแลกรับบริการในระบบภพภูมิ</p>
              <p>
                ระบบภพภูมิเปลี่ยนมาใช้โครงสร้างการแลกรับบริการภายในแอปพลิเคชันอย่างเป็นทางการ เพื่อความสอดคล้องกับแนวคิด **"Sands of Time" (ทรายกาลเวลา ⏳)**
              </p>
              <ul className="space-y-2.5 pl-2">
                <li className="flex items-start gap-2">
                  <span className="text-[#C6A96B] font-bold">✓</span>
                  <span><strong>แลกเปลี่ยนเป็นเม็ดทรายกาลเวลา</strong>: นำยอดเงินสะสมไปแลกเป็นทรายกาลเวลาสำหรับสร้างแผนและรายงานระดับสูงได้โดยตรง</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#C6A96B] font-bold">✓</span>
                  <span><strong>แลกรับรายงานพิเศษ</strong>: นำยอดสะสมไปปลดล็อกผังดวงจักรพรรดิ (Emperor Chart) หรือรับการวิเคราะห์พิเศษจากพระราหูและศาสตร์ยามสด</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#C6A96B] font-bold">✓</span>
                  <span><strong>ไม่มีขั้นต่ำในการแลกรับ</strong>: สามารถเลือกใช้มูลค่าเพื่อรับพลังพลังงานทรายได้ตามความเหมาะสมของสัจจะบารมีของท่าน</span>
                </li>
              </ul>
              <Form method="post" className="space-y-4 pt-3 border-t border-[#C6A96B]/10">
                <input type="hidden" name="actionType" value="redeem_sands" />
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider block">
                    ระบุยอดเงินที่ต้องการแลกเปลี่ยน (บาท)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="amount"
                      min={1}
                      max={walletBalance}
                      required
                      placeholder="ระบุจำนวนเงิน..."
                      className="flex-1 bg-[#1E293B]/50 border border-[#D9BC82]/10 rounded-xl px-4 py-2 text-xs text-[#F8F6F1] outline-none focus:border-[#C6A96B]/50"
                    />
                    <Button 
                      type="submit"
                      disabled={isSubmitting || walletBalance <= 0}
                      className="bg-[#C6A96B] text-slate-950 hover:bg-[#E2C98A] px-5 font-bold text-xs rounded-xl shrink-0 transition-all"
                    >
                      {isSubmitting ? "กำลังทำรายการ..." : "แลกรับทราย ⏳"}
                    </Button>
                  </div>
                </div>

                {actionData?.success && actionData?.message && (
                  <p className="text-xs text-green-400 bg-green-400/10 border border-green-500/20 rounded-lg px-3 py-2 text-left">
                    ✦ {actionData.message}
                  </p>
                )}

                {actionData?.error && (
                  <p className="text-xs text-red-400 bg-red-400/10 border border-red-500/20 rounded-lg px-3 py-2 text-left">
                    ✕ {actionData.error}
                  </p>
                )}
                
                <div className="text-[10px] text-[#94A3B8] text-center leading-relaxed">
                  * แลกเปลี่ยนทันทีแบบ Real-time: <strong>1 บาท = 1 ทรายกาลเวลา ⏳</strong><br />
                  ทรายที่ได้สามารถใช้เป็นโควตาในการทำนายและรับบริการวิเคราะห์ชะตาชีวิตได้
                </div>
              </Form>
            </div>
          </Card>
        </div>
      </div>

      {/* Referral Table & History Section */}
      <div className="space-y-6">
        <h3 className="font-display text-xl font-bold text-[#F8F6F1] flex items-center gap-2">
          <History className="w-5 h-5 text-[#4B6FAE]" /> รายการกัลยาณมิตร & ประวัติการทำธุรกรรม
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left: Referral Users */}
          <Card className="bg-[#0A1628]/35 border-[#C6A96B]/10 p-5 space-y-4">
            <h4 className="text-sm font-bold text-[#C6A96B] uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#4B6FAE]" /> เครือข่ายดวงชะตา 10 คนล่าสุด
            </h4>

            {referralsList.length === 0 ? (
              <div className="text-center py-10 text-[#94A3B8]/60 text-xs">
                ยังไม่มีการแนะนำเครือข่ายดวงชะตา ส่งลิงก์ชวนเพื่อนเพื่อรับ +50 Sands of Time ทันที!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#D9CDB7]">
                  <thead>
                    <tr className="border-b border-[#C6A96B]/15 text-[#94A3B8] font-bold">
                      <th className="pb-2">ชื่อดวง / อีเมล</th>
                      <th className="pb-2">แผนสมาชิก</th>
                      <th className="pb-2 text-right">วันที่ร่วมเดินทาง</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {referralsList.map((ref: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="py-2.5">
                          <div className="font-bold text-[#F8F6F1]">{ref.display_name || "กัลยาณมิตร"}</div>
                          <div className="text-[10px] text-[#94A3B8]">{ref.email ? ref.email.replace(/(.{3})(.*)(@.*)/, "$1***$3") : "ไม่มีอีเมล"}</div>
                        </td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            ref.plan === "imperial" 
                              ? "bg-amber-500/10 text-[#C6A96B] border border-[#C6A96B]/30" 
                              : ref.plan === "pro" 
                              ? "bg-[#4B6FAE]/10 text-[#4B6FAE] border border-[#4B6FAE]/30" 
                              : "bg-white/5 text-[#94A3B8] border border-white/10"
                          }`}>
                            {ref.plan || "free"}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-[11px] text-[#94A3B8]">
                          {new Date(ref.created_at).toLocaleDateString("th-TH")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Right: Wallet Transaction History */}
          <div className="space-y-6">
            {/* Wallet Transactions */}
            <Card className="bg-[#0A1628]/35 border-[#C6A96B]/10 p-5 space-y-4">
              <h4 className="text-sm font-bold text-[#C6A96B] uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#4B6FAE]" /> ประวัติกระเป๋าเงินพันธมิตร
              </h4>

              {walletHistory.length === 0 ? (
                <div className="text-center py-10 text-[#94A3B8]/60 text-xs">
                  ยังไม่มีรายการการรับส่วนแบ่งหรือการโอนในบัญชี
                </div>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {walletHistory.map((tx: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl text-xs">
                      <div className="flex-1 pr-4">
                        <div className="font-bold text-[#F8F6F1]">{tx.description || (tx.type === "commission" ? "ค่าแนะนำพันธมิตร" : "การโอนคะแนน")}</div>
                        <div className="text-[9px] text-[#94A3B8] mt-0.5">
                          {new Date(tx.created_at).toLocaleString("th-TH")}
                        </div>
                      </div>
                      <div className={`font-bold shrink-0 ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount} บาท
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
