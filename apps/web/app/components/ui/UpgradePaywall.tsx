import { Link } from "@remix-run/react";
import React from "react";
import { AstralIcon } from "./AstralIcon";

export interface UpgradePaywallProps {
  featureName?: string;
  title?: string;
  description?: string;
  requiredTier?: "premium" | "pro" | "master";
  requiredPlan?: "premium" | "pro" | "master";
  userPlan?: string;
  currentPlan?: string;
  timeSands?: number;
  sandsCost?: number;
  onUnlockWithSands?: () => void;
  isUnlocking?: boolean;
  isLocked?: boolean;
  children?: React.ReactNode;
}

const TIER_DISPLAY_MAP: Record<string, { label: string; badgeCls: string; price: string }> = {
  free: { label: "FREE (เริ่มต้น)", badgeCls: "bg-slate-500/20 text-slate-300 border-slate-500/30", price: "0฿" },
  basic: { label: "BASIC (เริ่มต้น)", badgeCls: "bg-amber-500/20 text-amber-300 border-amber-500/30", price: "89฿/ด." },
  premium: { label: "PREMIUM (ยกระดับ)", badgeCls: "bg-amber-500/20 text-amber-300 border-amber-500/30", price: "89฿/ด." },
  pro: { label: "PROFESSIONAL (มืออาชีพ)", badgeCls: "bg-sky-500/20 text-sky-300 border-sky-500/30", price: "289฿/ด." },
  master: { label: "MASTER (โหราจารย์)", badgeCls: "bg-purple-500/20 text-purple-300 border-purple-500/30", price: "1,289฿/ด." },
  imperial: { label: "MASTER (โหราจารย์)", badgeCls: "bg-purple-500/20 text-purple-300 border-purple-500/30", price: "1,289฿/ด." },
};

export function UpgradePaywall({
  featureName,
  title,
  description,
  requiredTier,
  requiredPlan,
  userPlan,
  currentPlan,
  timeSands = 0,
  sandsCost = 5,
  onUnlockWithSands,
  isUnlocking = false,
  isLocked = true,
  children,
}: UpgradePaywallProps) {
  if (isLocked === false) {
    return <>{children}</>;
  }

  const effectiveTitle = title || featureName || "ปลดล็อกสิทธิพิเศษสำหรับนักพยากรณ์";
  const effectiveRequiredTier = (requiredPlan || requiredTier || "pro") as "premium" | "pro" | "master";
  const effectiveUserPlan = currentPlan || userPlan || "basic";

  const currentTierInfo = TIER_DISPLAY_MAP[effectiveUserPlan.toLowerCase()] || TIER_DISPLAY_MAP.basic;
  const requiredTierInfo = TIER_DISPLAY_MAP[effectiveRequiredTier] || TIER_DISPLAY_MAP.pro;
  const hasEnoughSands = timeSands >= sandsCost;

  const cardContent = (
    <div className="relative z-10 max-w-lg w-full px-5 py-8 sm:px-8 sm:py-10 text-center rounded-3xl border border-[#C6A96B]/30 bg-[var(--pp-surface-020617)]/90 shadow-2xl shadow-black/90 backdrop-blur-2xl">
      {/* ── Lock Icon with Astral Radial Glow ── */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-[#C6A96B]/15 blur-xl animate-pulse" />
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-b from-[#C6A96B]/25 to-black/60 rounded-full flex items-center justify-center border border-[#C6A96B]/40 shadow-lg shadow-[#C6A96B]/20">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[#D9BC82]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      </div>

      {/* ── Badge ── */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase mb-3 bg-[#C6A96B]/15 text-[#D9BC82] border border-[#C6A96B]/30">
        <span>✦</span>
        <span>สิทธิพิเศษระดับ {requiredTierInfo?.label.split(" ")[0]} ขึ้นไป</span>
      </div>

      {/* ── Title ── */}
      <h2 className="font-display text-xl sm:text-2xl font-bold text-[#F8F6F1] mb-2 uppercase tracking-wide">
        {effectiveTitle}
      </h2>

      {/* ── Description ── */}
      <p className="text-[#94A3B8] text-xs sm:text-sm leading-relaxed mb-6">
        {description || `เครื่องมือนี้ออกแบบสำหรับนักพยากรณ์และผู้ต้องการการวิเคราะห์ดวงชะตาเชิงลึกระดับสูง ปลดล็อกสิทธิ์เพื่อเข้าถึงฟังก์ชันเต็มรูปแบบ`}
      </p>

      {/* ── Tier Comparison Box ── */}
      <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 mb-6 text-left">
        <div className="space-y-1">
          <p className="text-[10px] text-[#94A3B8] uppercase font-semibold">ระดับของคุณปัจจุบัน</p>
          <div className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${currentTierInfo?.badgeCls}`}>
            {currentTierInfo?.label.split(" ")[0]}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-[#C6A96B] uppercase font-semibold">ระดับที่ปลดล็อกได้</p>
          <div className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${requiredTierInfo?.badgeCls}`}>
            {requiredTierInfo?.label}
          </div>
        </div>
      </div>

      {/* ── Actions: Upgrade or Use Sands ── */}
      <div className="space-y-3">
        {/* Main Upgrade Button */}
        <Link
          to={`/pricing?upgrade=1&plan=${requiredTier}`}
          className="flex items-center justify-center gap-2 w-full py-3.5 min-h-[48px] rounded-2xl font-bold text-[#020617] text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#C6A96B]/20"
          style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)" }}
        >
          <span>✦</span>
          <span>อัปเกรดเป็น {requiredTierInfo?.label.split(" ")[0]} ({requiredTierInfo?.price}) →</span>
        </Link>

        {/* Unlock with Sands / Buy Sands */}
        {onUnlockWithSands ? (
          <button
            type="button"
            onClick={onUnlockWithSands}
            disabled={!hasEnoughSands || isUnlocking}
            className={`flex items-center justify-center gap-2 w-full py-3 min-h-[44px] rounded-2xl font-bold text-xs transition-all border ${
              hasEnoughSands
                ? "bg-amber-500/10 border-amber-500/30 text-[#D9BC82] hover:bg-amber-500/20 active:scale-98"
                : "bg-white/5 border-white/10 text-slate-500 cursor-not-allowed"
            }`}
          >
            <AstralIcon name="sandglass" size="xs" variant="gold" />
            <span>
              {isUnlocking
                ? "กำลังปลดล็อก..."
                : hasEnoughSands
                ? `ใช้ ${sandsCost} ละอองทราย เพื่อปลดล็อกใช้งาน (คงเหลือ ${timeSands})`
                : `ทรายไม่พอ (ต้องการ ${sandsCost} ละออง, คุณมี ${timeSands})`}
            </span>
          </button>
        ) : (
          <Link
            to="/dashboard/upgrade?tab=sands"
            className="flex items-center justify-center gap-2 w-full py-2.5 min-h-[40px] rounded-2xl font-semibold text-xs border border-amber-500/25 bg-amber-500/5 text-[#D9BC82] hover:bg-amber-500/10 transition-colors"
          >
            <AstralIcon name="sandglass" size="xs" variant="gold" />
            <span>เติมทรายกาลเวลา (Time Sands) สำหรับปลดล็อกรายครั้ง</span>
          </Link>
        )}

        <Link
          to="/dashboard"
          className="block pt-2 text-[#94A3B8] text-xs hover:text-[#F8F6F1] transition-colors"
        >
          ← กลับไปหน้าภาพรวม (Dashboard)
        </Link>
      </div>

      {/* Footer Assurance */}
      <p className="mt-6 text-[10px] text-[#C6A96B]/60 tracking-widest uppercase font-bold">
        WISDOM GUIDANCE OS · PHOPEPHUM ARCHITECTURE
      </p>
    </div>
  );

  if (children) {
    return (
      <div className="relative w-full min-h-[500px] overflow-hidden rounded-3xl">
        {/* ── Background Content with Soft Blur & Opacity ── */}
        <div
          className="filter blur-md opacity-30 select-none pointer-events-none transition-all duration-500"
          aria-hidden="true"
        >
          {children}
        </div>

        {/* ── Centered Lock Modal ── */}
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-[var(--pp-surface-020617)]/60 backdrop-blur-sm">
          {cardContent}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-[450px] sm:min-h-[550px] flex items-center justify-center rounded-3xl border border-white/5 overflow-hidden p-4"
      style={{ background: "var(--card-dark-bg, #020617)" }}
    >
      {/* Blurred background preview effect */}
      <div className="absolute inset-0 opacity-20 pointer-events-none select-none overflow-hidden" aria-hidden="true">
        <div className="grid grid-cols-2 gap-4 p-8 blur-md">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 rounded-3xl bg-white/10 border border-white/10" />
          ))}
        </div>
      </div>

      {cardContent}
    </div>
  );
}
