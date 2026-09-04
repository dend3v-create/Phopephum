import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, useActionData, Link, useFetcher, useSearchParams } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { getWisdomHistory, toggleWisdomBookmark, type WisdomQueryRecord } from "~/services/wisdom.server";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";
import { useState, useEffect } from "react";
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

  const url = new URL(request.url);
  const initialTab = url.searchParams.get("tab") || "personal";

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

  // STEP 4.2 — Load Wisdom Queries history
  let wisdomQueries: WisdomQueryRecord[] = [];
  let wisdomError: string | null = null;
  try {
    wisdomQueries = await getWisdomHistory(supabase, user.id, { limit: 100 });
  } catch (wErr) {
    console.warn("[dashboard.settings] Failed to load wisdom queries:", wErr);
    wisdomError = "ไม่สามารถเชื่อมต่อคลังปัญญาได้ในขณะนี้";
  }

  return json({
    user,
    profile,
    currentLocale,
    initialTab,
    wisdomQueries,
    wisdomError,
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

  // STEP 4.2 — Toggle Bookmark Action
  if (formType === "toggleBookmark") {
    const queryId = String(formData.get("queryId") ?? "").trim();
    if (!queryId) return json({ error: "queryId is required" }, { status: 400 });

    const desiredStateRaw = formData.get("desiredState");
    const desiredState =
      desiredStateRaw !== null && desiredStateRaw !== undefined
        ? desiredStateRaw === "true" || desiredStateRaw === "1"
        : undefined;

    const result = await toggleWisdomBookmark(supabase, user.id, queryId, desiredState);
    if (!result) {
      return json({ error: "Failed to update bookmark" }, { status: 500 });
    }
    return json({ success: true, bookmark: result });
  }

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

const INTENT_META: Record<string, { label: string; emoji: string; color: string }> = {
  all:          { label: "ทั้งหมด", emoji: "✦", color: "text-[#C6A96B] border-[#C6A96B]/40 bg-[#C6A96B]/10" },
  timing:       { label: "จังหวะเวลา", emoji: "✈️", color: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
  finance:      { label: "การเงิน",  emoji: "💰", color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" },
  relationship: { label: "ความรัก",      emoji: "💛", color: "text-rose-400 border-rose-400/30 bg-rose-400/10" },
  lost:         { label: "ค้นหาของ",     emoji: "🔍", color: "text-sky-400 border-sky-400/30 bg-sky-400/10" },
  career:       { label: "การงาน",    emoji: "💼", color: "text-indigo-400 border-indigo-400/30 bg-indigo-400/10" },
  health:       { label: "สุขภาพ", emoji: "🌿", color: "text-teal-400 border-teal-400/30 bg-teal-400/10" },
  general:      { label: "ทั่วไป",      emoji: "✦",  color: "text-[#C6A96B] border-[#C6A96B]/30 bg-[#C6A96B]/10" },
};

export default function SettingsPage() {
  const { profile, wallet, currentLocale, initialTab, wisdomQueries, wisdomError } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";
  const { t } = useTranslation(["common"]);

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(initialTab || "personal");

  // Wisdom Tab filters & states
  const [activeIntent, setActiveIntent] = useState("all");
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [selectedDetailQuery, setSelectedDetailQuery] = useState<WisdomQueryRecord | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null);

  // Optimistic bookmark tracking
  const [localBookmarks, setLocalBookmarks] = useState<Record<string, boolean>>({});
  const bookmarkFetcher = useFetcher<any>();

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && (tabParam === "personal" || tabParam === "wisdom" || tabParam === "affiliate")) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    }, { replace: true });
  };

  const handleToggleBookmark = (q: WisdomQueryRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentStatus = localBookmarks[q.id] ?? q.is_bookmarked;
    const nextStatus = !currentStatus;
    setLocalBookmarks((prev) => ({ ...prev, [q.id]: nextStatus }));

    bookmarkFetcher.submit(
      { queryId: q.id, desiredState: String(nextStatus) },
      { method: "post", action: "/api/wisdom-bookmark" }
    );
  };

  const handleCopyAnswer = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedQueryId(id);
        setTimeout(() => setCopiedQueryId(null), 2000);
      });
    }
  };

  const filteredQueries = wisdomQueries.filter((q) => {
    const isBookmarked = localBookmarks[q.id] ?? q.is_bookmarked;
    if (showBookmarkedOnly && !isBookmarked) return false;
    if (activeIntent !== "all" && q.intent_category !== activeIntent) return false;
    return true;
  });

  const bookmarkedTotalCount = wisdomQueries.filter(
    (q) => (localBookmarks[q.id] ?? q.is_bookmarked)
  ).length;

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
          onClick={() => handleTabChange("personal")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "personal"
              ? "bg-[#D9BC82] text-[#0A1628]"
              : "border-transparent text-[#C6B79F] hover:text-[#F8F6F1]"
          }`}
        >
          {t("common:settings.personal_tab", "ข้อมูลส่วนตัว")}
        </button>
        <button
          onClick={() => handleTabChange("wisdom")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "wisdom"
              ? "bg-[#D9BC82] text-[#0A1628]"
              : "border-transparent text-[#C6B79F] hover:text-[#F8F6F1]"
          }`}
        >
          <span>🧠</span>
          <span>{t("common:settings.wisdom_tab", "คลังปัญญาของฉัน")}</span>
          {wisdomQueries.length > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeTab === "wisdom"
                  ? "bg-[#0A1628]/20 text-[#0A1628]"
                  : "bg-[#C6A96B]/20 text-[#C6A96B]"
              }`}
            >
              {wisdomQueries.length}
            </span>
          )}
        </button>
        <button
          onClick={() => handleTabChange("affiliate")}
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

      {/* 2. แท็บคลังปัญญาของฉัน (PHASE C, D, E, F) */}
      {activeTab === "wisdom" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Subheader and Controls */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-[#F8F6F1] font-display text-lg font-bold flex items-center gap-2">
                  <span>🧠</span>
                  <span>{t("common:settings.wisdom_title", "คลังปัญญา & ประวัติคำทำนาย")}</span>
                </h2>
                <p className="text-xs text-[#94A3B8]">
                  บันทึกประวัติคำถาม, ผลพยากรณ์, และจังหวะเวลาเฉพาะตัวคุณ
                </p>
              </div>

              {/* Bookmark vs All toggle */}
              <div className="flex items-center gap-1 bg-[#0A1628]/70 border border-white/10 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowBookmarkedOnly(false)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    !showBookmarkedOnly
                      ? "bg-[#C6A96B] text-[#0A1628]"
                      : "text-[#C6B79F] hover:text-white"
                  }`}
                >
                  ทั้งหมด ({wisdomQueries.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowBookmarkedOnly(true)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                    showBookmarkedOnly
                      ? "bg-amber-400 text-[#0A1628]"
                      : "text-[#C6B79F] hover:text-white"
                  }`}
                >
                  <span>★</span>
                  <span>บุ๊กมาร์ก ({bookmarkedTotalCount})</span>
                </button>
              </div>
            </div>

            {/* Category Filter Chips (horizontal scroll on mobile) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar -mx-1 px-1">
              {Object.entries(INTENT_META).map(([key, meta]) => {
                const isSelected = activeIntent === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveIntent(key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                      isSelected
                        ? "bg-[#C6A96B]/20 border-[#C6A96B] text-[#F8F6F1] shadow-sm shadow-[#C6A96B]/20"
                        : "bg-[#0A1628]/60 border-white/10 text-[#94A3B8] hover:text-[#F8F6F1] hover:border-white/20"
                    }`}
                  >
                    <span>{meta.emoji}</span>
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Alert */}
          {wisdomError && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center justify-between">
              <span>{wisdomError}</span>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="underline font-bold hover:text-white"
              >
                ลองใหม่
              </button>
            </div>
          )}

          {/* Query List */}
          {filteredQueries.length > 0 ? (
            <div className="space-y-3">
              {filteredQueries.map((item) => {
                const isBookmarked = localBookmarks[item.id] ?? item.is_bookmarked;
                const meta = INTENT_META[item.intent_category] || INTENT_META.general;
                const dateStr = new Date(item.created_at).toLocaleString("th-TH", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedDetailQuery(item);
                      setShowEvidence(false);
                    }}
                    className="group relative cursor-pointer rounded-2xl border border-white/10 bg-[#0A1628]/70 hover:border-[#C6A96B]/40 hover:bg-[#0A1628]/90 transition-all p-4 sm:p-5 shadow-lg space-y-3"
                  >
                    {/* Top Row: Meta Badge, Date, Bookmark button */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${meta.color}`}
                        >
                          <span>{meta.emoji}</span>
                          <span>{meta.label}</span>
                        </span>
                        <span className="text-[11px] text-[#64748B]">{dateStr}</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleToggleBookmark(item, e)}
                        title={isBookmarked ? "ยกเลิกบุ๊กมาร์ก" : "บันทึกในบุ๊กมาร์ก"}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isBookmarked
                            ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
                            : "bg-white/5 text-[#64748B] border-white/10 hover:text-white hover:border-white/20"
                        }`}
                      >
                        <span className="text-sm leading-none">{isBookmarked ? "★" : "☆"}</span>
                      </button>
                    </div>

                    {/* Question */}
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-[#F8F6F1] group-hover:text-[#C6A96B] transition-colors leading-snug">
                        “{item.question}”
                      </h3>
                    </div>

                    {/* Best Window or Score Pill */}
                    {(item.best_window?.timeRange || typeof item.prediction_score === "number") && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {item.best_window?.timeRange && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-300 text-[11px] font-medium">
                            <span>⏳ ช่วงเวลา:</span>
                            <span className="font-bold text-white">{item.best_window.timeRange}</span>
                          </span>
                        )}
                        {typeof item.prediction_score === "number" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-[11px] font-medium">
                            <span>พลังงาน:</span>
                            <span className="font-bold text-white">{item.prediction_score}/100</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Answer Preview */}
                    <p className="text-xs sm:text-sm text-[#94A3B8] line-clamp-2 leading-relaxed">
                      {item.answer}
                    </p>

                    {/* Footer View Link */}
                    <div className="pt-1 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-400/80 font-medium truncate max-w-[70%]">
                        ✓ {item.actionable || "มีข้อแนะนำที่ทำได้ทันที"}
                      </span>
                      <span className="text-[#C6A96B] group-hover:underline font-bold flex items-center gap-0.5">
                        <span>ดูคำทำนายฉบับเต็ม</span>
                        <span>→</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="rounded-3xl border border-dashed border-[#C6A96B]/20 bg-slate-950/40 p-8 sm:p-10 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#C6A96B]/10 border border-[#C6A96B]/20 flex items-center justify-center text-2xl">
                🧠
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-[#F8F6F1]">
                  {showBookmarkedOnly
                    ? "ยังไม่มีคำถามที่บุ๊กมาร์กไว้"
                    : activeIntent !== "all"
                    ? "ไม่พบคำถามในหมวดหมู่นี้"
                    : "ยังไม่มีบันทึกคำถาม"}
                </h3>
                <p className="text-xs text-[#94A3B8] max-w-xs mx-auto">
                  {showBookmarkedOnly || activeIntent !== "all"
                    ? "ลองเลือกดูหมวดอื่น หรือกดดูทั้งหมด"
                    : "ลองถามเรื่องแรกของคุณได้เลย ระบบจะบันทึกคำทำนายและจังหวะเวลาไว้ในคลังปัญญานี้โดยอัตโนมัติ"}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/dashboard/check-yam"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#0A1628] font-bold text-xs sm:text-sm shadow-lg shadow-[#C6A96B]/20 hover:brightness-110 active:scale-95 transition-all"
                >
                  <span>🔎</span>
                  <span>หาฤกษ์ให้ฉัน</span>
                </Link>
              </div>
            </div>
          )}

          {/* PHASE D — Detail Modal (Reads from immutable stored snapshot) */}
          {selectedDetailQuery && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
              onClick={() => setSelectedDetailQuery(null)}
            >
              <div
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-[#C6A96B]/30 bg-[#0A1628] p-5 sm:p-7 shadow-2xl space-y-5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                          (INTENT_META[selectedDetailQuery.intent_category] || INTENT_META.general).color
                        }`}
                      >
                        <span>{(INTENT_META[selectedDetailQuery.intent_category] || INTENT_META.general).emoji}</span>
                        <span>{(INTENT_META[selectedDetailQuery.intent_category] || INTENT_META.general).label}</span>
                      </span>
                      <span className="text-[11px] text-[#64748B]">
                        {new Date(selectedDetailQuery.created_at).toLocaleString("th-TH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#F8F6F1]">
                      “{selectedDetailQuery.question}”
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedDetailQuery(null)}
                    className="p-1.5 rounded-full bg-white/5 border border-white/10 text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Score & Best Window Row */}
                {(selectedDetailQuery.best_window?.timeRange || typeof selectedDetailQuery.prediction_score === "number") && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedDetailQuery.best_window?.timeRange && (
                      <div className="p-3 rounded-xl border border-amber-400/30 bg-amber-400/10 space-y-0.5">
                        <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                          ⏳ ช่วงเวลาทองที่แนะนำ
                        </p>
                        <p className="text-sm font-bold text-white">
                          {selectedDetailQuery.best_window.timeRange}
                        </p>
                        {selectedDetailQuery.best_window.description && (
                          <p className="text-[11px] text-amber-200/80">
                            {selectedDetailQuery.best_window.description}
                          </p>
                        )}
                      </div>
                    )}
                    {typeof selectedDetailQuery.prediction_score === "number" && (
                      <div className="p-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 space-y-0.5">
                        <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                          ✦ คะแนนพลังงาน
                        </p>
                        <p className="text-sm font-bold text-white">
                          {selectedDetailQuery.prediction_score} / 100
                        </p>
                        <p className="text-[11px] text-emerald-200/80">
                          ความสอดคล้อง: {selectedDetailQuery.confidence === "high" ? "สูงมาก" : selectedDetailQuery.confidence === "medium" ? "ปานกลาง" : "แนะนำสังเกตการณ์"}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Main Stored Answer (Plain Thai) */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C6A96B]">
                    ✦ คำแนะนำสำหรับคุณ
                  </p>
                  <p className="text-sm sm:text-base text-[#F8F6F1] leading-relaxed whitespace-pre-line">
                    {selectedDetailQuery.answer}
                  </p>
                </div>

                {/* Actionable Advice */}
                <div className="p-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 flex items-start gap-3">
                  <span className="text-emerald-400 text-base mt-0.5">✓</span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-0.5">
                      ข้อแนะนำที่ทำได้ทันที
                    </p>
                    <p className="text-xs sm:text-sm text-[#E2E8F0] font-medium leading-snug">
                      {selectedDetailQuery.actionable}
                    </p>
                  </div>
                </div>

                {/* Level 2: Evidence Snapshot Accordion (Plain language, no raw jargon) */}
                {selectedDetailQuery.evidence_snapshot && selectedDetailQuery.evidence_snapshot.length > 0 && (
                  <div className="pt-2 border-t border-white/8">
                    <button
                      type="button"
                      onClick={() => setShowEvidence(!showEvidence)}
                      className="flex items-center justify-between w-full text-left py-1 text-xs font-bold text-[#94A3B8] hover:text-[#C6A96B] transition-colors"
                    >
                      <span>🔍 ดูปัจจัยพลังงานเชิงลึก (Evidence Chain)</span>
                      <span>{showEvidence ? "▲ ย่อ" : "▼ ขยาย"}</span>
                    </button>

                    {showEvidence && (
                      <div className="mt-2 space-y-2 pl-2 border-l-2 border-[#C6A96B]/30 animate-fade-up">
                        {selectedDetailQuery.evidence_snapshot.map((item, idx) => (
                          <div key={idx} className="text-xs space-y-0.5">
                            <span className="font-bold text-[#C6A96B]">{item.source}:</span>
                            <p className="text-[#CBD5E1]">{item.finding}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Snapshot Immutability Disclaimer */}
                <div className="rounded-xl bg-white/5 border border-white/5 p-2.5 text-center">
                  <p className="text-[10px] text-[#64748B]">
                    🔒 บันทึกความทรงจำจาก Snapshot ณ เวลาที่ถาม (ไม่เปลี่ยนแปลงตามการอัปเดตระบบ)
                  </p>
                </div>

                {/* Modal Footer Controls */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={(e) => handleToggleBookmark(selectedDetailQuery, e)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                      (localBookmarks[selectedDetailQuery.id] ?? selectedDetailQuery.is_bookmarked)
                        ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
                        : "bg-white/5 text-[#94A3B8] border-white/10 hover:text-white"
                    }`}
                  >
                    <span>{(localBookmarks[selectedDetailQuery.id] ?? selectedDetailQuery.is_bookmarked) ? "★" : "☆"}</span>
                    <span>{(localBookmarks[selectedDetailQuery.id] ?? selectedDetailQuery.is_bookmarked) ? "บุ๊กมาร์กแล้ว" : "บุ๊กมาร์ก"}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleCopyAnswer(selectedDetailQuery.answer, selectedDetailQuery.id, e)}
                      className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-[#D9CDB7] transition-colors"
                    >
                      {copiedQueryId === selectedDetailQuery.id ? "✓ คัดลอกแล้ว" : "คัดลอกคำแนะนำ"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDetailQuery(null)}
                      className="px-4 py-1.5 rounded-xl bg-[#C6A96B] text-[#0A1628] font-bold text-xs hover:brightness-110 transition-all"
                    >
                      ปิด
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. แท็บ Affiliate & E-Wallet */}
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
