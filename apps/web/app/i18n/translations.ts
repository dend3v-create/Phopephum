export type Locale = "th" | "en" | "zh";

export const LOCALES: Locale[] = ["th", "en", "zh"];

export const LOCALE_LABELS: Record<Locale, string> = {
  th: "TH",
  en: "EN",
  zh: "中",
};

export const LOCALE_LANG: Record<Locale, string> = {
  th: "th",
  en: "en",
  zh: "zh-Hans",
};

// ── Common namespace ──────────────────────────────────────────────────────────
const common = {
  th: {
    nav: {
      dashboard: "วันนี้",
      horoscope: "ตั้งดวงชะตา",
      yam: "เช็คฤกษ์ยาม",
      reports: "รายงาน",
      planner: "บันทึก",
      settings: "โปรไฟล์",
    },
    auth: {
      login: "เข้าสู่ระบบ",
      register: "สมัครสมาชิก",
      logout: "ออกจากระบบ",
      email: "อีเมล",
      password: "รหัสผ่าน",
      name: "ชื่อ",
    },
    theme: { dark: "ธีมมืด", light: "ธีมสว่าง" },
    language: { label: "ภาษา", th: "ไทย", en: "English", zh: "中文" },
    action: {
      calculate: "คำนวณ",
      save: "บันทึก",
      cancel: "ยกเลิก",
      generate: "สร้างรายงาน",
      back: "กลับ",
      more: "ดูเพิ่มเติม",
    },
    brand: {
      name: "PhopePhum",
      tagline: "ถอดรหัสพลังงานชีวิต",
    },
  },
  en: {
    nav: {
      dashboard: "Today",
      horoscope: "Fate Chart",
      yam: "Auspicious Time",
      reports: "Reports",
      planner: "Journal",
      settings: "Profile",
    },
    auth: {
      login: "Sign In",
      register: "Sign Up",
      logout: "Sign Out",
      email: "Email",
      password: "Password",
      name: "Name",
    },
    theme: { dark: "Dark", light: "Light" },
    language: { label: "Language", th: "Thai", en: "English", zh: "Chinese" },
    action: {
      calculate: "Calculate",
      save: "Save",
      cancel: "Cancel",
      generate: "Generate Report",
      back: "Back",
      more: "See More",
    },
    brand: {
      name: "PhopePhum",
      tagline: "Decode the Energy of Life",
    },
  },
  zh: {
    nav: {
      dashboard: "今日",
      horoscope: "命盘",
      yam: "吉时查询",
      reports: "报告",
      planner: "日记",
      settings: "个人资料",
    },
    auth: {
      login: "登录",
      register: "注册",
      logout: "退出",
      email: "电子邮件",
      password: "密码",
      name: "姓名",
    },
    theme: { dark: "深色", light: "浅色" },
    language: { label: "语言", th: "泰语", en: "英语", zh: "中文" },
    action: {
      calculate: "计算",
      save: "保存",
      cancel: "取消",
      generate: "生成报告",
      back: "返回",
      more: "查看更多",
    },
    brand: {
      name: "PhopePhum",
      tagline: "解码生命能量",
    },
  },
} as const;

// ── Horoscope namespace ───────────────────────────────────────────────────────
const horoscope = {
  th: {
    planets: {
      "1": "อาทิตย์", "2": "จันทร์", "3": "อังคาร",
      "4": "พุธ", "5": "พฤหัส", "6": "ศุกร์",
      "7": "เสาร์", "8": "ราหู", "9": "เกตุ",
    },
    bases: {
      "1": "ฐาน ๑ · วันเกิด", "2": "ฐาน ๒ · เดือนเกิด", "3": "ฐาน ๓ · ปีเกิด",
      "4": "ฐาน ๔ · มหาจักร", "5": "ฐาน ๕ · มหาภูติ", "6": "ฐาน ๖ · กำลัง",
      "7": "ฐาน ๗ · กำลัง", "8": "ฐาน ๘ · อาตมะ", "9": "ฐาน ๙ · ภริยัง",
    },
    chart: {
      title: "ผังดวง ๗ ตัว ๙ ฐาน",
      subtitle: "๓๕ ภพเรือนสมบูรณ์",
      tap_hint: "แตะตัวเลขเพื่อดูความเชื่อมโยง",
      natal: "กำเนิด",
      transit: "จร",
    },
  },
  en: {
    planets: {
      "1": "Sun", "2": "Moon", "3": "Mars",
      "4": "Mercury", "5": "Jupiter", "6": "Venus",
      "7": "Saturn", "8": "Rahu", "9": "Ketu",
    },
    bases: {
      "1": "Base 1 · Birth Day", "2": "Base 2 · Birth Month", "3": "Base 3 · Birth Year",
      "4": "Base 4 · Grand Cycle", "5": "Base 5 · Elemental", "6": "Base 6 · Power",
      "7": "Base 7 · Power", "8": "Base 8 · Ātma", "9": "Base 9 · Spouse",
    },
    chart: {
      title: "7-Star 9-Base Fate Chart",
      subtitle: "35 Complete Celestial Houses",
      tap_hint: "Tap a number to see connections",
      natal: "Natal",
      transit: "Transit",
    },
  },
  zh: {
    planets: {
      "1": "太阳", "2": "月亮", "3": "火星",
      "4": "水星", "5": "木星", "6": "金星",
      "7": "土星", "8": "罗睺", "9": "计都",
    },
    bases: {
      "1": "第一宫 · 生日", "2": "第二宫 · 生月", "3": "第三宫 · 生年",
      "4": "第四宫 · 大轮", "5": "第五宫 · 元素", "6": "第六宫 · 力量",
      "7": "第七宫 · 力量", "8": "第八宫 · 自我", "9": "第九宫 · 配偶",
    },
    chart: {
      title: "七星九宫命盘",
      subtitle: "三十五宫完整天命",
      tap_hint: "点击数字查看关联",
      natal: "本命",
      transit: "流年",
    },
  },
} as const;

// ── Yam namespace ─────────────────────────────────────────────────────────────
const yam = {
  th: {
    title: "ยามสดขณะนี้",
    subtitle: "พลังงานแห่งช่วงเวลา",
    current: "ยามปัจจุบัน",
    next: "ยามถัดไป",
    countdown: "อีก",
    auspicious: "เป็นมงคล",
    inauspicious: "ควรระวัง",
  },
  en: {
    title: "Current Auspicious Time",
    subtitle: "Energy of the Moment",
    current: "Current Yam",
    next: "Next Yam",
    countdown: "in",
    auspicious: "Auspicious",
    inauspicious: "Caution",
  },
  zh: {
    title: "当前时辰",
    subtitle: "当下的能量",
    current: "当前时辰",
    next: "下一时辰",
    countdown: "还有",
    auspicious: "吉",
    inauspicious: "凶",
  },
} as const;

// ── Translation registry ──────────────────────────────────────────────────────
export const translations = { common, horoscope, yam } as const;

export type Namespace = keyof typeof translations;

type DeepValue<T> = T extends object
  ? { [K in keyof T]: DeepValue<T[K]> }
  : T;

/** Lookup a translation by dot-notation key, e.g. "nav.dashboard" */
export function t<N extends Namespace>(
  ns: N,
  locale: Locale,
  key: string
): string {
  const nsObj = translations[ns] as any;
  const localeObj = nsObj?.[locale] ?? nsObj?.["th"] ?? {};
  const parts = key.split(".");
  let val: any = localeObj;
  for (const part of parts) {
    val = val?.[part];
    if (val === undefined) break;
  }
  return typeof val === "string" ? val : key;
}
