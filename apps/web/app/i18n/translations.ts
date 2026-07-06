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
      community: "ชะตาพันธมิตร",
      pro_tools: "✦ เครื่องมือนักพยากรณ์",
      yam_pro: "ยามอัฐกาลชั้นฉาย",
      karnchata: "เลข ๗ ตัวกาลชะตา",
      yam_whisper: "ยามพรายกระซิบ",
      rahu: "ยามราหูค้นทรัพย์",
      taksa: "มหาทักษาพยากรณ์",
      phuti: "มหาภูติกำเนิด",
      people: "โปรไฟล์บุคคล",
      calendar_100: "ปฏิทิน 100 ปี",
      operator_system: "ระบบ Operator",
      approvals: "อนุมัติคำขอ",
      upgrade_membership: "อัปเกรดสมาชิก",
      admin_dashboard: "Admin Dashboard",
      logout: "ออกจากระบบ"
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
    sands_of_time: "⏳ SANDS OF TIME",
    unlimited: "♾️ Unlimited",
    sands_unit: "{{count}} / 15 เม็ด"
  },
  en: {
    nav: {
      dashboard: "Today",
      horoscope: "Fate Chart",
      yam: "Auspicious Time",
      reports: "Reports",
      planner: "Journal",
      settings: "Profile",
      community: "Destiny Alliance",
      pro_tools: "✦ Astrologer Tools",
      yam_pro: "Atthakarn Solar Yam",
      karnchata: "7-Star Horary Fate",
      yam_whisper: "Whispering Yam",
      rahu: "Rahu Wealth Yam",
      taksa: "Maha Taksa Chart",
      phuti: "Mahabhuti Elemental",
      people: "People Profiles",
      calendar_100: "100-Year Calendar",
      operator_system: "Operator System",
      approvals: "Approve Requests",
      upgrade_membership: "Upgrade Membership",
      admin_dashboard: "Admin Dashboard",
      logout: "Sign Out"
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
    sands_of_time: "⏳ SANDS OF TIME",
    unlimited: "♾️ Unlimited",
    sands_unit: "{{count}} / 15 sands"
  },
  zh: {
    nav: {
      dashboard: "今日运势",
      horoscope: "命运盘",
      yam: "吉时查询",
      reports: "报告",
      planner: "生活日记",
      settings: "个人资料",
      community: "命运盟友",
      pro_tools: "✦ 占星师工具",
      yam_pro: "八卦日晷时辰",
      karnchata: "七星占卜法",
      yam_whisper: "耳语吉时",
      rahu: "罗睺寻宝时辰",
      taksa: "大达沙预测",
      phuti: "五行大本命",
      people: "人物档案",
      calendar_100: "百年历书",
      operator_system: "操作员系统",
      approvals: "审批申请",
      upgrade_membership: "升级会员",
      admin_dashboard: "管理员面板",
      logout: "退出登录"
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
    sands_of_time: "⏳ 时间沙漏",
    unlimited: "♾️ 无限制",
    sands_unit: "{{count}} / 15 粒"
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
    houses: {
      "อัตตะ": "อัตตะ", "หินะ": "หินะ", "ธนัง": "ธนัง", "ปิตา": "ปิตา", "มาตา": "มาตา", "โภคา": "โภคา", "มัชฌิมา": "มัชฌิมา",
      "สักกะ": "สักกะ", "ญาติ": "ญาติ", "เคหัง": "เคหัง", "นาวัง": "นาวัง", "ภริยัง": "ภริยัง",
      "ตนุ": "ตนุ", "กดุมภะ": "กดุมภะ", "สหัชชะ": "สหัชชะ", "พันธุ": "พันธุ", "ปุตตะ": "ปุตตะ", "อริ": "อริ", "ปัตนิ": "ปัตนิ", "มรณะ": "มรณะ", "ศุภะ": "ศุภะ", "กัมมะ": "กัมมะ", "ลาภะ": "ลาภะ", "วินาศน์": "วินาศน์"
    },
    standards: {
      "เกษตร": "เกษตร", "มหาอุจ": "มหาอุจ", "มหาอุจจ์": "มหาอุจจ์", "ราชาโชค": "ราชาโชค", "มหาจักร": "มหาจักร", "ประ": "ประ", "นิจ": "นิจ",
      "จักรพรรดิ": "จักรพรรดิ", "พระจันทร์": "พระจันทร์", "โสฬสมงคล": "โสฬสมงคล"
    }
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
    houses: {
      "อัตตะ": "Atta (Self)", "หินะ": "Hina (Obstacle)", "ธนัง": "Thanang (Wealth)", "ปิตา": "Pita (Father)", "มาตา": "Mata (Mother)", "โภคา": "Phoka (Asset)", "มัชฌิมา": "Matchima (Middle)",
      "สักกะ": "Sakka (Honor)", "ญาติ": "Yati (Relatives)", "เคหัง": "Kehang (Home)", "นาวัง": "Nawang (Journey)", "ภริยัง": "Phariyang (Spouse)",
      "ตนุ": "Tanu (Self)", "กดุมภะ": "Kadumbha (Finance)", "สหัชชะ": "Sahatcha (Friends)", "พันธุ": "Phanthu (Family)", "ปุตตะ": "Putta (Children)", "อริ": "Ari (Enemy)", "ปัตนิ": "Patni (Partner)", "มรณะ": "Morana (Loss)", "ศุภะ": "Supha (Success)", "กัมมะ": "Kamma (Career)", "ลาภะ": "Lapha (Fortune)", "วินาศน์": "Winat (Crisis)"
    },
    standards: {
      "เกษตร": "Kaset (Stable)", "มหาอุจ": "Maha Uch (Exalted)", "มหาอุจจ์": "Maha Uch (Exalted)", "ราชาโชค": "Racha Chok (Fortune)", "มหาจักร": "Maha Chak (Great)", "ประ": "Pra (Weak)", "นิจ": "Neech (Debilitated)",
      "จักรพรรดิ": "Emperor", "พระจันทร์": "Moon Power", "โสฬสมงคล": "Solas Mongkol"
    }
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
    houses: {
      "อัตตะ": "自我 (Atta)", "หินะ": "阻碍 (Hina)", "ธนัง": "财富 (Thanang)", "ปิตา": "父亲 (Pita)", "มาตา": "母亲 (Mata)", "โภคา": "资产 (Phoka)", "มัชฌิมา": "中庸 (Matchima)",
      "สักกะ": "荣誉 (Sakka)", "ญาติ": "亲属 (Yati)", "เคหัง": "家宅 (Kehang)", "นาวัง": "旅程 (Nawang)", "ภริยัง": "配偶 (Phariyang)",
      "ตนุ": "身宫 (Tanu)", "กดุมภะ": "财帛 (Kadumbha)", "สหัชชะ": "兄弟 (Sahatcha)", "พันธุ": "田宅 (Phanthu)", "ปุตตะ": "子女 (Putta)", "อริ": "疾厄 (Ari)", "ปัตนิ": "夫妻 (Patni)", "มรณะ": "奴仆 (Morana)", "ศุภะ": "官禄 (Supha)", "กัมมะ": "福德 (Kamma)", "ลาภะ": "迁移 (Lapha)", "วินาศน์": "相貌 (Winat)"
    },
    standards: {
      "เกษตร": "本位 (Kaset)", "มหาอุจ": "耀升 (Maha Uch)", "มหาอุจจ์": "耀升 (Maha Uch)", "ราชาโชค": "王赐 (Racha Chok)", "มหาจักร": "大轮 (Maha Chak)", "ประ": "失陷 (Pra)", "นิจ": "落陷 (Neech)",
      "จักรพรรดิ": "帝王 (Emperor)", "พระจันทร์": "月德 (Moon Power)", "โสฬสมงคล": "十六吉兆"
    }
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
    yam_names: {
      "สุริยะ": "สุริยะ", "ระวิ": "ระวิ", "จันเทา": "จันเทา", "คะศิ": "คะศิ", "ภุมมะ": "ภุมมะ", "ภุมรา": "ภุมรา",
      "ทิวา": "ทิวา", "วาณี": "วาณี", "ชีโว": "ชีโว", "คุรุ": "คุรุ", "ศุกระ": "ศุกระ", "ภัสสะ": "ภัสสะ",
      "โสระ": "โสระ", "เสารี": "เสารี", "อสุรินทร์": "อสุรินทร์", "ราหู": "ราหู"
    }
  },
  en: {
    title: "Current Auspicious Time",
    subtitle: "Energy of the Moment",
    current: "Current Yam",
    next: "Next Yam",
    countdown: "in",
    auspicious: "Auspicious",
    inauspicious: "Caution",
    yam_names: {
      "สุริยะ": "Suriya (Sun)", "ระวิ": "Rawi (Sun)", "จันเทา": "Chanthau (Moon)", "คะศิ": "Khasi (Moon)", "ภุมมะ": "Bhumma (Mars)", "ภุมรา": "Bhumra (Mars)",
      "ทิวา": "Thiwa (Mercury)", "วาณี": "Wanee (Mercury)", "ชีโว": "Cheewo (Jupiter)", "คุรุ": "Khuru (Jupiter)", "ศุกระ": "Sukra (Venus)", "ภัสสะ": "Phatsa (Venus)",
      "โสระ": "Sora (Saturn)", "เสารี": "Sauree (Saturn)", "อสุรินทร์": "Asurin (Rahu)", "ราหู": "Rahu"
    }
  },
  zh: {
    title: "当前时辰",
    subtitle: "当下的能量",
    current: "当前时辰",
    next: "下一时辰",
    countdown: "还有",
    auspicious: "吉",
    inauspicious: "凶",
    yam_names: {
      "สุริยะ": "日华 (Suriya)", "ระวิ": "烈阳 (Rawi)", "จันเทา": "皎月 (Chanthau)", "คะศิ": "月魄 (Khasi)", "ภุมมะ": "荧惑 (Bhumma)", "ภุมรา": "战神 (Bhumra)",
      "ทิวา": "辰星 (Thiwa)", "วาณี": "水星 (Wanee)", "ชีโว": "岁星 (Cheewo)", "คุรุ": "木星 (Khuru)", "ศุกระ": "太白 (Sukra)", "ภัสสะ": "金星 (Phatsa)",
      "โสระ": "镇星 (Sora)", "เสารี": "土星 (Sauree)", "อสุรินทร์": "蚀神 (Asurin)", "ราหู": "罗睺 (Rahu)"
    }
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
