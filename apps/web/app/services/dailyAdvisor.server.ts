import type { PhopephumResult, StarNumber } from "@phopephum/types";

export interface DailyAdvice {
  work: {
    status: "excellent" | "good" | "warning";
    title: string;
    description: string;
  };
  wealth: {
    status: "excellent" | "good" | "warning";
    title: string;
    description: string;
  };
  love: {
    status: "excellent" | "good" | "warning";
    title: string;
    description: string;
  };
  health: {
    status: "excellent" | "good" | "warning";
    title: string;
    description: string;
  };
}

const STAR_NAMES: Record<string, Record<number, string>> = {
  th: {
    1: "อาทิตย์", 2: "จันทร์", 3: "อังคาร", 4: "พุธ",
    5: "พฤหัสบดี", 6: "ศุกร์", 7: "เสาร์", 8: "ราหู"
  },
  en: {
    1: "Sun", 2: "Moon", 3: "Mars", 4: "Mercury",
    5: "Jupiter", 6: "Venus", 7: "Saturn", 8: "Rahu"
  },
  zh: {
    1: "太阳星", 2: "太阴星", 3: "火星", 4: "水星",
    5: "木星", 6: "金星", 7: "土星", 8: "罗睺星"
  }
};

const TRANSLATIONS: Record<string, any> = {
  th: {
    work: {
      excellent: {
        title: "การงานรุ่งโรจน์ โอกาสทองจากดาว {sriName}",
        desc: "วันนี้เป็นช่วงเวลาที่ยอดเยี่ยมที่สุดในการเสนองาน ขายโปรเจกต์ หรือเริ่มงานใหม่ พลังงานแห่งชื่อเสียงและความมงคลพร้อมสนับสนุนคุณเต็มที่"
      },
      warning: {
        title: "ระวังอุปสรรคในการงานจากดาว {kalaName}",
        desc: "วันนี้งานอาจเกิดความล่าช้า เอกสารมีข้อผิดพลาด หรือเกิดความเข้าใจผิดในการประสานงาน ควรตรวจสอบความถูกต้องเป็นสองเท่าและหลีกเลี่ยงความใจร้อน"
      },
      defaultTitle: "ขับเคลื่อนแผนงานด้วยดาว {utsahaName}",
      defaultDesc: "วันนี้ควรเน้นลงมือทำงานอย่างสม่ำเสมอ แผนงานที่วางไว้จะมีผู้ช่วยเกื้อหนุนตามจังหวะดาวมงคล",
      utsahaDesc: {
        1: "เหมาะกับการเจรจากับผู้มีอำนาจ ทำหน้าที่ผู้นำ หรือจัดระเบียบแผนยุทธศาสตร์ระยะยาว",
        2: "เด่นด้านการบริการ งานที่ต้องใช้อารมณ์ความรู้สึก จินตนาการ หรืองานประสานความเข้าใจในทีม",
        3: "ช่วงเวลาแห่งการลงมือแก้ไขปัญยากๆ งานบุกเบิกตลาดใหม่ หรืองานขายเชิงรุกที่ต้องการความเด็ดเดี่ยว",
        4: "เด่นมากในเรื่องการเจรจา การเขียน แบรนดิ้ง ประชาสัมพันธ์ และการเปิดตัวสื่อสารสู่สาธารณะ",
        5: "เหมาะกับการเข้าหาครูบาอาจารย์ ผู้ใหญ่ แสวงหาความรู้ใหม่ หรือการฝึกอบรมพัฒนาตนเอง",
        6: "งานด้านศิลปะ ความคิดสร้างสรรค์ การออกแบบ และงานสร้างความรื่นรมย์ผ่อนคลายจะมีผลลัพธ์ที่ดี",
        7: "เหมาะกับการสะสางงานคงค้าง วางระบบหลังบ้าน หรืองานที่ต้องใช้ความอดทนและรายละเอียดสูง",
        8: "เน้นการพลิกแพลงตามกระแส การทำตลาดออนไลน์ ค้าขายต่างประเทศ หรือมองหาช่องทางลัดสู่ผลสำเร็จ"
      }
    },
    wealth: {
      excellent: {
        title: "โชคลาภหลั่งไหล ความมั่งคั่งมงคลสูง",
        desc: "พลังเงินทรัพย์ในวันนี้หนุนนำด้วยดาวธาตุดินที่สมบูรณ์ เหมาะกับการเจรจาขอสินเชื่อ ปรับแผนภาษี หรือได้รับเงินสนับสนุนปันผล"
      },
      warning: {
        title: "ระวังรายจ่ายกะทันหัน หรือข้อผิดพลาดทางบัญชี",
        desc: "หลีกเลี่ยงการตัดสินใจลงทุนแบบเร่งด่วนตามอารมณ์ ระวังความประมาทเลินเล่อที่ทำให้เงินทองรั่วไหล เลี่ยงการเซ็นค้ำประกันในวันนี้"
      },
      defaultTitle: "พลังดึงดูดทรัพย์โดยดาว {sriName}",
      defaultDesc: "โชคลาภการเงินในวันนี้ขับเคลื่อนโดยดาว {sriName} ควรใช้จังหวะนี้เจรจาธุรกิจหรือจัดสรรงบประมาณ หรือสวมใส่เสื้อผ้าโทนสีที่เกื้อหนุนดาว {sriName} เพื่อเสริมพลังทรัพย์"
    },
    love: {
      excellent: {
        title: "ความรักเบ่งบาน เสน่ห์เมตตาเปี่ยมล้น",
        desc: "คนมีคู่มีเกณฑ์ได้ทำกิจกรรมพิเศษร่วมกันเพื่อเติมความหวาน คนโสดมีเสน่ห์ดึงดูดสายตาผู้คนเป็นพิเศษ มีสิทธิ์พบคนอุปถัมภ์ที่เข้าใจคุณลึกซึ้ง"
      },
      warning: {
        title: "ระวังอารมณ์ร้อนหรือคำพูดเฉือนใจ",
        desc: "วันนี้พลังงานลบลอยตัวได้ง่าย ควรลดความตึงเครียด ไม่พูดจาจับผิดหรือนำความขัดแย้งเก่ามาคุยกัน ฝึกการระงับอารมณ์และพูดคุยด้วยสติ"
      },
      defaultTitle: "ใจเกื้อหนุนด้วยดาว {montriName}",
      defaultDesc: "ความสัมพันธ์ดำเนินไปอย่างเกื้อกูล คู่ครองคอยซัพพอร์ตให้คำแนะนำดีๆ เสมือนเป็นทั้งเพื่อนคู่คิดและกัลยาณมิตร"
    },
    health: {
      warning: {
        title: "พลังชีวิตอ่อนโยน ควรดูแลกายใจเป็นพิเศษ",
        desc: "ระวังความเครียดสะสม อาการปวดหัวไมเกรน หรือระบบทางเดินอาหารแปรปรวน แนะนำให้งดกิจกรรมหักโหม ดื่มน้ำอุ่น และเข้านอนก่อนเวลาปกติ"
      },
      defaultTitle: "ฟื้นฟูสุขภาพด้วยดาว {ageName}",
      defaultDesc: "พลังกายวันนี้อยู่ในระดับปกติ ควรเสริมภูมิคุ้มกันด้วยการยืดเหยียดร่างกายสั้นๆ และควบคุมความเครียดที่สมองผ่านการฝึกหายใจสงบ"
    }
  },
  en: {
    work: {
      excellent: {
        title: "Prosperous Career, Golden Opportunity by {sriName}",
        desc: "Today is the best time to present projects, make sales pitches, or start a new job. The energy of reputation and fortune is fully backing you."
      },
      warning: {
        title: "Beware of Work Obstacles from {kalaName}",
        desc: "Today, work might be delayed, documents may contain errors, or misunderstandings in coordination may arise. Double check accuracy and avoid impatience."
      },
      defaultTitle: "Driving Plans with {utsahaName}",
      defaultDesc: "Focus on working consistently today. Planned works will be backed by helpers according to auspicious planet movements.",
      utsahaDesc: {
        1: "Suitable for negotiating with authorities, taking leadership roles, or organizing long-term strategic plans.",
        2: "Outstanding for service roles, tasks requiring emotional intelligence, imagination, or team harmonization.",
        3: "Time for tackling difficult problems, pioneering new markets, or proactive sales requiring decisiveness.",
        4: "Highly outstanding for negotiations, writing, branding, PR, and launching public communications.",
        5: "Suitable for approaching mentors/elders, seeking new knowledge, or training for self-development.",
        6: "Arts, creative tasks, design, and activities bringing relaxation and pleasure will yield good results.",
        7: "Ideal for clearing backlog, setting up backend systems, or tasks requiring high patience and detail.",
        8: "Focus on adapting to trends, online marketing, international trade, or seeking shortcuts to success."
      }
    },
    wealth: {
      excellent: {
        title: "Wealth Inflow, Auspicious Abundance",
        desc: "Today's financial energy is backed by rich earth element stars. Suitable for loan negotiations, tax planning, or receiving dividend support."
      },
      warning: {
        title: "Beware of Sudden Expenses or Accounting Errors",
        desc: "Avoid hasty investment decisions driven by emotions. Watch out for negligence causing leakage, and avoid signing guarantees today."
      },
      defaultTitle: "Wealth Attraction Energy by {sriName}",
      defaultDesc: "Financial fortune is driven by {sriName}. Take this opportunity for business negotiations or budgeting, or wear colors supporting {sriName} to boost wealth."
    },
    love: {
      excellent: {
        title: "Love Blooms, Abundant Charm & Kindness",
        desc: "Couples are likely to share special activities to add sweetness. Singles possess outstanding attraction, with high chances of meeting supportive mentors."
      },
      warning: {
        title: "Beware of Hot Tempers or Sharp Words",
        desc: "Today negative energy can easily float. Reduce stress, avoid nitpicking or bringing up old conflicts. Practice self-restraint and speak mindfully."
      },
      defaultTitle: "Heart Supported by {montriName}",
      defaultDesc: "Relationships flow supportively. Partners provide great advice, acting as both reliable companions and supportive friends."
    },
    health: {
      warning: {
        title: "Fragile Vitality, Take Special Care of Body & Mind",
        desc: "Watch out for accumulated stress, migraines, or digestive fluctuations. Avoid strenuous activities, drink warm water, and sleep early."
      },
      defaultTitle: "Restore Health with {ageName}",
      defaultDesc: "Physical energy is normal today. Support immunity with light stretching and manage mental stress through calm breathing exercises."
    }
  },
  zh: {
    work: {
      excellent: {
        title: "事业兴旺，{sriName}带来的黄金机遇",
        desc: "今天是展示项目、开展销售或开启新工作的最佳时机。声誉与福运的能量正全力支持你。"
      },
      warning: {
        title: "防范{kalaName}带来的工作阻碍",
        desc: "今天工作可能会出现延误、文档出错或协调误解。请加倍核对准确度，切忌急躁。"
      },
      defaultTitle: "借由{utsahaName}推动计划",
      defaultDesc: "今天应保持稳步工作。根据吉星轨迹，既定计划将得到贵人相助。",
      utsahaDesc: {
        1: "适合与权威人士谈判、担任领导角色或整理长期战略规划。",
        2: "服务行业、需要情感共鸣与想象力的工作或团队沟通协调表现突出。",
        3: "适合解决棘手问题、开拓新市场或需要果断力的主动式销售。",
        4: "在谈判、撰写、品牌推广、公关以及公开发表和沟通方面非常突出。",
        5: "适合拜访导师或长辈、寻求新知识或进行自我提升的培训。",
        6: "艺术、创意任务、设计以及带来轻松愉悦感的活动将取得良好效果。",
        7: "适合清理积压工作、搭建后台系统或需要极高耐心和细节的工作。",
        8: "注重顺应潮流、网络营销、跨境贸易或寻找成功的快捷路径。"
      }
    },
    wealth: {
      excellent: {
        title: "财源广进，富贵吉祥",
        desc: "今日财运得到丰沛土象星辰支持。适合谈判贷款、规划税务或获取分红支持。"
      },
      warning: {
        title: "防范突发开支或财务对账失误",
        desc: "避免因情绪冲动做出仓促投资决定。谨防粗心导致财物流失，今日忌签担保书。"
      },
      defaultTitle: "借由{sriName}吸引财富之能",
      defaultDesc: "今日财运由{sriName}主导。宜抓住时机进行商务谈判或预算规划，或穿着与${sriName}相合的色调以增旺财气。"
    },
    love: {
      excellent: {
        title: "桃花盛开，魅力与人缘极佳",
        desc: "有伴侣者有望共同参与特别活动以增进感情。单身者魅力四射，极易遇到深知你心的支持型贵人。"
      },
      warning: {
        title: "防范情绪急躁或伤人言辞",
        desc: "今日负能量易抬头。应减轻压力，忌挑剔或翻旧账。克制情绪，保持理性沟通。"
      },
      defaultTitle: "内心得到{montriName}护佑",
      defaultDesc: "感情关系融洽互助。伴侣能给予宝贵建议，既是知己又是良友。"
    },
    health: {
      warning: {
        title: "生命力偏弱，需格外呵护身心",
        desc: "注意防范压力积累、偏头痛或肠胃不适。建议暂停剧烈运动，多喝温水，提早入睡。"
      },
      defaultTitle: "依仗{ageName}重焕健康活力",
      defaultDesc: "今日身体能量处于正常水平。宜通过伸展运动增强免疫力，并通过平稳呼吸调节大脑压力。"
    }
  }
};

export function generateDailyAdvice(phResult: PhopephumResult, userLocale = "th"): DailyAdvice {
  const locale = userLocale === "zh" ? "zh" : userLocale === "en" ? "en" : "th";
  
  const taksaMap = phResult.taksaTransit.map as Record<number, string>;
  const stars = STAR_NAMES[locale];

  const getStarOfBhop = (bhopName: string): StarNumber => {
    const entry = Object.entries(taksaMap).find(([, v]) => v === bhopName);
    return entry ? (parseInt(entry[0], 10) as StarNumber) : 1;
  };

  const sriStar = getStarOfBhop("ศรี");
  const kalaStar = getStarOfBhop("กาลกิณี");
  const utsahaStar = getStarOfBhop("อุตสาหะ");
  const dechStar = getStarOfBhop("เดช");
  const ageStar = getStarOfBhop("อายุ");
  const montriStar = getStarOfBhop("มนตรี");

  const sriName = stars[sriStar] || "";
  const kalaName = stars[kalaStar] || "";
  const utsahaName = stars[utsahaStar] || "";
  const dechName = stars[dechStar] || "";
  const ageName = stars[ageStar] || "";
  const montriName = stars[montriStar] || "";

  const trans = TRANSLATIONS[locale];

  // 1. Career (Work)
  let workStatus: "excellent" | "good" | "warning" = "good";
  let workTitle = trans.work.defaultTitle.replace("{utsahaName}", utsahaName);
  let workDesc = trans.work.utsahaDesc[utsahaStar] || trans.work.defaultDesc;

  if (utsahaStar === sriStar || dechStar === sriStar) {
    workStatus = "excellent";
    workTitle = trans.work.excellent.title.replace("{sriName}", sriName);
    workDesc = trans.work.excellent.desc;
  } else if (utsahaStar === kalaStar || dechStar === kalaStar) {
    workStatus = "warning";
    workTitle = trans.work.warning.title.replace("{kalaName}", kalaName);
    workDesc = trans.work.warning.desc;
  }

  // 2. Wealth
  let wealthStatus: "excellent" | "good" | "warning" = "good";
  let wealthTitle = trans.wealth.defaultTitle.replace("{sriName}", sriName);
  let wealthDesc = trans.wealth.defaultDesc.replace(/{sriName}/g, sriName);

  if (sriStar === 5 || sriStar === 2) {
    wealthStatus = "excellent";
    wealthTitle = trans.wealth.excellent.title;
    wealthDesc = trans.wealth.excellent.desc;
  } else if (kalaStar === 1 || kalaStar === 7) {
    wealthStatus = "warning";
    wealthTitle = trans.wealth.warning.title;
    wealthDesc = trans.wealth.warning.desc;
  }

  // 3. Love
  let loveStatus: "excellent" | "good" | "warning" = "good";
  let loveTitle = trans.love.defaultTitle.replace("{montriName}", montriName);
  let loveDesc = trans.love.defaultDesc;

  if (montriStar === 6 || sriStar === 6) {
    loveStatus = "excellent";
    loveTitle = trans.love.excellent.title;
    loveDesc = trans.love.excellent.desc;
  } else if (kalaStar === 3 || kalaStar === 8) {
    loveStatus = "warning";
    loveTitle = trans.love.warning.title;
    loveDesc = trans.love.warning.desc;
  }

  // 4. Health
  let healthStatus: "excellent" | "good" | "warning" = "good";
  let healthTitle = trans.health.defaultTitle.replace("{ageName}", ageName);
  let healthDesc = trans.health.defaultDesc;

  if (ageStar === kalaStar) {
    healthStatus = "warning";
    healthTitle = trans.health.warning.title;
    healthDesc = trans.health.warning.desc;
  }

  return {
    work: { status: workStatus, title: workTitle, description: workDesc },
    wealth: { status: wealthStatus, title: wealthTitle, description: wealthDesc },
    love: { status: loveStatus, title: loveTitle, description: loveDesc },
    health: { status: healthStatus, title: healthTitle, description: healthDesc }
  };
}
