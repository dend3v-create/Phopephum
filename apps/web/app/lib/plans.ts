import type { CanonicalPlan } from "@phopephum/types";

export interface SubscriptionPlanDef {
  id: string;
  name: string;
  subtitle: string;
  priceThb: number;
  interval: "month" | "year";
  durationDays: number;
  canonicalPlan: CanonicalPlan;
  color: string;
  tag?: string | null;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlanDef> = {
  basic: {
    id: "basic",
    name: "ยกระดับชีวิต (Premium)",
    subtitle: "วางแผนชีวิตและการเงินส่วนบุคคล",
    priceThb: 89,
    interval: "month",
    durationDays: 30,
    canonicalPlan: "premium",
    color: "#94A3B8",
    tag: null,
    features: [
      "ยามอัฏฐกาลเต็มผัง (กลางวัน-กลางคืน)",
      "วิชาเลข ๗ ตัว ๙ ฐาน 35 ภพเรือน ฐานกำลังพระเคราะห์ 19 ฐาน (ตนเอง)",
      "ปฏิทินจันทรคติไทย 100 ปีแท้ (สุริยยาตร์)",
      "AI Life Report 1 ครั้ง/เดือน",
      "Wisdom AI 10 ครั้ง/เดือน",
      "บันทึกดวงตนเอง + 5 โปรไฟล์",
      "เก็บบันทึกประวัติคำทำนาย 90 วัน",
      "รับ Sands +50 ละอองทราย/เดือน",
    ],
  },
  pro: {
    id: "pro",
    name: "มืออาชีพ (Professional)",
    subtitle: "วางแผนงานเฉพาะวิชาชีพ สามารถใช้งานระบบแบบ Custom มากขึ้น",
    priceThb: 289,
    interval: "month",
    durationDays: 30,
    canonicalPlan: "pro",
    color: "#C6A96B",
    tag: "แนะนำยอดนิยม",
    features: [
      "วางแผนงานเฉพาะวิชาชีพ Custom ระบบได้มากขึ้น",
      "KARNCHATA ENGINE V2.0 เต็มระบบ",
      "Multi-select Overlay Filter บนผังจักรพรรดิ",
      "ยามพรายกระซิบ 12 ภพ & ราหูค้นทรัพย์",
      "AI Life Report 5 ครั้ง/เดือน",
      "Wisdom AI 50 ครั้ง/เดือน",
      "บันทึกดวงผู้อื่น 20 รายชื่อ",
      "เก็บบันทึกประวัติคำทำนาย 180 วัน",
      "รับ Sands +150 ละอองทราย/เดือน",
    ],
  },
  pro_annual: {
    id: "pro_annual",
    name: "มืออาชีพ Professional (รายปี)",
    subtitle: "วางแผนงานเฉพาะวิชาชีพ Custom ระบบได้มากขึ้น (ประหยัด 20%)",
    priceThb: 2770,
    interval: "year",
    durationDays: 365,
    canonicalPlan: "pro",
    color: "#C6A96B",
    tag: "แนะนำยอดนิยม",
    features: [
      "สิทธิ์ระดับ Pro ครบถ้วนตลอด 1 ปีเต็ม",
      "วางแผนงานเฉพาะวิชาชีพ Custom ระบบได้มากขึ้น",
      "KARNCHATA ENGINE V2.0 เต็มระบบ",
      "Multi-select Overlay Filter บนผังจักรพรรดิ",
      "ยามพรายกระซิบ 12 ภพ & ราหูค้นทรัพย์",
      "AI Life Report 5 ครั้ง/เดือน",
      "Wisdom AI 50 ครั้ง/เดือน",
      "บันทึกดวงผู้อื่น 20 รายชื่อ",
      "เก็บบันทึกประวัติคำทำนาย 180 วัน",
      "รับโบนัส Sands +1,800 ละอองทราย",
    ],
  },
  imperial: {
    id: "imperial",
    name: "โหราจารย์ (Master)",
    subtitle: "ปลดล็อคเครื่องมือสำหรับนักพยากรณ์ เข้าถึงหลักวิชาและหลักการโหราศาสตร์เพื่อใช้ในการพยากรณ์ได้อย่างลึกซึ้งมากขึ้น",
    priceThb: 1289,
    interval: "month",
    durationDays: 30,
    canonicalPlan: "master",
    color: "#4B6FAE",
    tag: "Master Class",
    features: [
      "ปลดล็อคเครื่องมือสำหรับนักพยากรณ์ เข้าถึงหลักวิชาลึกซึ้ง",
      "ผังดวงจักรพรรดิ 35 ภพ 19 ฐาน + สุริยยาตร์แท้",
      "AI Life Report 10 ครั้ง/เดือน (Fair Use)",
      "Wisdom AI 100 ครั้ง/เดือน (Fair Use)",
      "บันทึกดวงสูงสุด 100 รายชื่อ",
      "เก็บบันทึกประวัติคำทำนาย 365 วัน (1 ปี)",
      "ส่งออกรายงาน AI Life Report พรีเมียม (PDF)",
      "Pro Tools: 16 ยาม + ยามพรายกระซิบ + ราหูค้นทรัพย์",
      "รับ Sands +500 ละอองทราย/เดือน",
    ],
  },
};

export interface SandsRefillPackDef {
  id: string;
  name: string;
  sandsAmount: number;
  priceThb: number;
  pricePerUnit: number;
  popular?: boolean;
  bonusText?: string;
}

export const SANDS_REFILL_PACKS: Record<string, SandsRefillPackDef> = {
  sands_50: {
    id: "sands_50",
    name: "50 ละอองทราย",
    sandsAmount: 50,
    priceThb: 59,
    pricePerUnit: 1.18,
    popular: false,
    bonusText: "เริ่มต้นทดลองใช้",
  },
  sands_150: {
    id: "sands_150",
    name: "150 ละอองทราย",
    sandsAmount: 150,
    priceThb: 149,
    pricePerUnit: 0.99,
    popular: true,
    bonusText: "ยอดนิยม (คุ้มค่า)",
  },
  sands_500: {
    id: "sands_500",
    name: "500 ละอองทราย",
    sandsAmount: 500,
    priceThb: 399,
    pricePerUnit: 0.80,
    popular: false,
    bonusText: "แพ็กเกจจุใจ + ประหยัด 32%",
  },
};

// ─── CANONICAL SKU HARDENING & ZERO-TRUST RESOLUTION (STEP 6.6.4) ─────────────

export type CanonicalSku =
  | "free"
  | "basic"
  | "pro"
  | "pro_annual"
  | "imperial"
  | "sands_50"
  | "sands_150"
  | "sands_500";

export const CANONICAL_SKUS: readonly CanonicalSku[] = [
  "free",
  "basic",
  "pro",
  "pro_annual",
  "imperial",
  "sands_50",
  "sands_150",
  "sands_500",
] as const;

export const LEGACY_SKU_ALIASES: Record<string, CanonicalSku> = {
  premium: "basic",
  premium_monthly: "basic",
  basic_monthly: "basic",
  master: "imperial",
  master_monthly: "imperial",
  master_lifetime: "imperial",
  pro_monthly: "pro",
  lifetime: "imperial",
};

/**
 * Normalize any input plan/SKU string to Canonical SKU.
 * Returns null if unrecognized.
 */
export function normalizeSku(inputSku: string | null | undefined): CanonicalSku | null {
  if (!inputSku) return null;
  const cleaned = inputSku.trim().toLowerCase();
  if (CANONICAL_SKUS.includes(cleaned as CanonicalSku)) {
    return cleaned as CanonicalSku;
  }
  if (LEGACY_SKU_ALIASES[cleaned]) {
    return LEGACY_SKU_ALIASES[cleaned];
  }
  return null;
}

export function isCanonicalSku(inputSku: string | null | undefined): boolean {
  if (!inputSku) return false;
  return CANONICAL_SKUS.includes(inputSku.trim().toLowerCase() as CanonicalSku);
}

export interface ResolvedProduct {
  sku: CanonicalSku;
  type: "free" | "package_upgrade" | "sands_refill";
  name: string;
  priceThb: number;
  sandsAmount?: number;
  durationDays?: number;
  canonicalPlan: string;
}

/**
 * Single Source of Truth Product Resolver
 * Resolves SKU → Product → Price → Entitlement safely on the server.
 */
export function resolveProductFromSku(inputSku: string | null | undefined): ResolvedProduct | null {
  const canonical = normalizeSku(inputSku);
  if (!canonical) return null;

  if (canonical === "free") {
    return {
      sku: "free",
      type: "free",
      name: "เริ่มต้น (Free)",
      priceThb: 0,
      durationDays: 36500,
      canonicalPlan: "free",
    };
  }

  if (SUBSCRIPTION_PLANS[canonical]) {
    const plan = SUBSCRIPTION_PLANS[canonical];
    return {
      sku: canonical,
      type: "package_upgrade",
      name: plan.name,
      priceThb: plan.priceThb,
      durationDays: plan.durationDays,
      canonicalPlan: canonical === "pro_annual" ? "pro" : canonical,
    };
  }

  if (SANDS_REFILL_PACKS[canonical]) {
    const pack = SANDS_REFILL_PACKS[canonical];
    return {
      sku: canonical,
      type: "sands_refill",
      name: pack.name,
      priceThb: pack.priceThb,
      sandsAmount: pack.sandsAmount,
      canonicalPlan: "sands",
    };
  }

  return null;
}

