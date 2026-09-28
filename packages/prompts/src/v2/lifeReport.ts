import type { PhopephumResult, AIReportType, StarNumber, Locale } from "@phopephum/types";
import { buildAtthakarnContext, ATTHAKARN_CORE_PRINCIPLES, type AtthakarnBirthYamContext } from "../knowledge/atthakarn-kb.js";

export const PROMPT_VERSION = "v7.0.0"; // Tri-lingual Wisdom Guidance Architecture

const HOUSE_NAMES: Record<Locale, string[][]> = {
  th: [
    ["อัตตะ", "หินะ", "ธนัง", "ปิตา", "มาตา", "โภคา", "มัชฌิมา"],
    ["ตนุ", "กฎุมภะ", "สหัชชะ", "พันธุ", "ปุตตะ", "อริ", "ปัตนิ"],
    ["มรณะ", "ศุภะ", "กัมมะ", "ลาภะ", "พยายะ", "ทาสา", "ทาสี"],
  ],
  en: [
    ["Atta (Self)", "Hina (Loss)", "Thanang (Wealth)", "Pita (Father)", "Mata (Mother)", "Phoka (Property)", "Matchima (Middle)"],
    ["Tanu (Body)", "Kadumbha (Finance)", "Sahatcha (Friends)", "Phanthu (Family)", "Putta (Children)", "Ari (Obstacle)", "Patni (Partner)"],
    ["Marana (Death/Change)", "Supha (Success)", "Kamma (Work)", "Lapha (Fortune)", "Phayaya (Hidden)", "Thasa (Support 1)", "Thasi (Support 2)"],
  ],
  zh: [
    ["自我 (อัตตะ)", "损耗 (หินะ)", "财富 (ธนัง)", "父亲 (ปิตา)", "母亲 (มาตา)", "房产 (โภคา)", "中道 (มัชฌิมา)"],
    ["身体 (ตนุ)", "财帛 (กฎุมภะ)", "兄弟 (สหัชชะ)", "家庭 (พันธุ)", "子女 (ปุตตะ)", "疾病 (อริ)", "配偶 (ปัตนิ)"],
    ["疾厄 (มรณะ)", "迁移 (ศุภะ)", "官禄 (กัมมะ)", "福德 (ลาภะ)", "相貌 (พยายะ)", "奴仆1 (ทาสา)", "奴仆2 (ทาสี)"],
  ],
};

const PLANET_NAMES_MAP: Record<Locale, Record<number, string>> = {
  th: {
    1: "อาทิตย์ (1)", 2: "จันทร์ (2)", 3: "อังคาร (3)", 4: "พุธ (4)",
    5: "พฤหัสบดี (5)", 6: "ศุกร์ (6)", 7: "เสาร์ (7)", 8: "ราหู (8)"
  },
  en: {
    1: "Sun (1)", 2: "Moon (2)", 3: "Mars (3)", 4: "Mercury (4)",
    5: "Jupiter (5)", 6: "Venus (6)", 7: "Saturn (7)", 8: "Rahu (8)"
  },
  zh: {
    1: "太阳 (1)", 2: "月亮 (2)", 3: "火星 (3)", 4: "水星 (4)",
    5: "木星 (5)", 6: "金星 (6)", 7: "土星 (7)", 8: "罗睺 (8)"
  }
};

const REPORT_TYPE_LABEL: Record<Locale, Record<AIReportType, string>> = {
  th: {
    general_prediction: "พยากรณ์ปัญญาชีวิต (Therapy)",
    life_overview: "โครงสร้างชีวิตเชิงลึก",
    career: "ภารกิจ & ความสำเร็จ",
    relationship: "เสน่ห์ & ความสัมพันธ์",
    health: "สุขภาพ & พลังชีวิต",
    wealth: "กระแสทรัพย์ & มั่งคั่ง",
    daily_insight: "ปัญญาญาณรายวัน",
    annual_forecast: "จังหวะชะตารายปี",
    personal_branding: "ตัวตน & อัตลักษณ์",
  },
  en: {
    general_prediction: "Life Wisdom Guidance (Therapy)",
    life_overview: "Deep Life Structure",
    career: "Mission & Success",
    relationship: "Charisma & Relationships",
    health: "Health & Vitality",
    wealth: "Wealth Flow",
    daily_insight: "Daily Intuition",
    annual_forecast: "Annual Destiny Rhythm",
    personal_branding: "Identity & Branding",
  },
  zh: {
    general_prediction: "生命智慧指南 (疗愈)",
    life_overview: "深度生命结构",
    career: "使命与成功",
    relationship: "魅力与关系",
    health: "健康与活力",
    wealth: "财富流",
    daily_insight: "每日直觉",
    annual_forecast: "年度命运节奏",
    personal_branding: "身份与品牌",
  }
};

const REPORT_TYPE_INSTRUCTIONS: Record<Locale, Record<AIReportType, string>> = {
  th: {
    general_prediction: `วิเคราะห์พยากรณ์เพื่อการบำบัดและไกด์เส้นทางชีวิต (Life Therapy & Guidance):
1. **สถานการณ์ชีวิตโดยทั่วไป** — วิเคราะห์ปัจจัยภายนอก (ทักษาจร) ที่เข้ามากระทบในช่วงนี้
2. **โอกาสในการเริ่มต้นทำอะไรใหม่ๆ** — เจาะลึกภพปุตตะ/ลาภะ/โภคา/ศุภะ/ธะนัง เพื่อหาจังหวะการเริ่มต้นที่ทรงพลัง
3. **ชีวิตครอบครัวและสายสัมพันธ์** — วิเคราะห์ภพโภคา/พันธุ/ทาสา/ทาสี/ปิตา/มาตา เพื่อจัดสมดุลความสัมพันธ์ในบ้าน
4. **สรุปภาพรวมปัญญาชีวิต** — อธิบายพลังจากฐานที่ 4 (กำลังเทวดา) เพื่อให้เห็น Mindset ที่ต้องปรับปรุงหรือเสริมพลัง`,
    life_overview: `วิเคราะห์โครงสร้างชีวิตเชิงลึกเพื่อการเติบโตทางจิตวิญญาณและพัฒนาศักยภาพ:
1. **แก่นแท้และจุดมุ่งหมายชีวิต** — ถอดรหัสผ่านรหัสดวงดาวจากภพตนุ/อัตตา เพื่อเข้าใจอุปนิสัยเดิมและแรงขับเคลื่อนในจิตใต้สำนึก
2. **พลังแห่งการหลอมรวม (กำลังเทวดา ฐานที่ 4)** — อธิบายคุณภาพของพลังงานภายในและมายด์เซ็ทที่สั่งสมมา ที่จะช่วยเกื้อหนุนหรือขับเคลื่อนชีวิต
3. **การประสานจังหวะภายนอกและภายใน** — การผสานทักษาจร และมหาภูติจร
4. **Action Plan สู่ความสงบนิ่งและปัญญา** — แนวทางปฏิบัติเพื่อค้นพบปัญญาญาณและการใช้พลังงานดวงดาวนำชีวิต`,
    career: `วิเคราะห์ดวงการงาน หน้าที่ความรับผิดชอบ และภารกิจชีวิต (Mission & Success):
1. **การงานที่โดดเด่นและเหมาะสม** — เจาะลึกภพกัมมะ/ศุภะ/ลาภะ เพื่อหาแนวทางการทำงานที่ตรงกับศักยภาพสูงสุด
2. **บทเรียนชีวิตในวิชาชีพ** — ถอดรหัสพลังงานดวงดาวที่สถิตในภพการงาน เพื่อเข้าใจหน้าที่และสายใยบทเรียนที่ต้องเรียนรู้
3. **สภาวะใจต่อการทำงาน (มหาภูติจร)** — ความพร้อมภายใน พลังสร้างสรรค์ หรือจุดติดขัดที่ต้องก้าวข้ามในเรื่องงาน
4. **กลยุทธ์ขับเคลื่อนความสำเร็จ** — ดึงพลังดวงดาวตัวช่วยมาแก้เกมการงานและสร้างความก้าวหน้าอย่างยั่งยืน`,
    relationship: `วิเคราะห์ความสัมพันธ์ สายใยบทเรียน และการเกื้อกูลเพื่อเติบโตไปด้วยกัน:
1. **สายใยและบทเรียนความสัมพันธ์** — ถอดรหัสดวงดาวที่สถิตภพปัตนิ/โภคา/มาตา เข้าใจอุปนิสัยเดิมที่ส่งผลถึงปัจจุบัน
2. **สภาวะใจในความสัมพันธ์ (มหาภูติจร)** — ความต้องการภายใน ความสงบ หรือสภาวะอารมณ์ที่ต้องเยียวยาดูแล
3. **ปัจจัยเกื้อหนุนและบทเรียนภายนอก (ทักษาจร)** — สภาพแวดล้อมรอบตัวและการเชื่อมโยงที่เข้ามาทดสอบความสัมพันธ์
4. **ปัญญาชีวิตเพื่อรักที่สงบและยั่งยืน** — การจัดสมดุลพลังงานปัจจุบันกรรมเพื่อเกื้อกูลและเติบโตด้วยความเข้าใจ`,
    wealth: `วิเคราะห์กระแสทรัพย์ ความมั่งคั่ง และคลังสมบัติประจำดวง (Wealth Flow):
1. **รูปแบบการเงินและความมั่งคั่ง** — เจาะลึกภพธะนัง/กฏุมภะ/โภคา เพื่อเข้าใจสายใยการสร้างคุณค่าและทางเดินแห่งทรัพย์
2. **ใจกับการดึงดูดทรัพย์ (มหาภูติจร)** — ความสอดคล้องของสภาวะจิตใจ และความพร้อมภายในในการดึงดูดกระแสพลังงานการเงิน
3. **โอกาสและสภาพแวดล้อมการเงิน (ทักษาจร)** — จังหวะการงอกเงยของทรัพย์สิน หรือจุดรั่วไหลที่ต้องบริหารจัดการด้วยสติ
4. **กลยุทธ์จัด Flow พลังงานทรัพย์** — นำปัญญาภายในและดาวตัวช่วยมาปลดล็อกความอุดมสมบูรณ์ในชีวิต`,
    annual_forecast: `วิเคราะห์จังหวะชีวิตรายปีและแผนที่ปัญญาเพื่อก้าวต่อไปใน 12 เดือนข้างหน้า:
1. **แก่นหลักพลังงานปีปัจจุบัน** — ความหมายเชิงคุณภาพของดวงดาวในปีนี้ต่อชะตาชีวิต
2. **บทเรียนและโอกาสในแต่ละมิติ** — การเข้าใจสภาวะจิตใต้สำนึกและอารมณ์จากรหัสดาวจร
3. **ความพร้อมและโอกาสรายปี** — สรุปความพร้อมภายใน (มหาภูติจร) และโอกาสภายนอก (ทักษาจร) ประจำปีนี้
4. **แผนชีวิตและ Action Plan รายปี** — การกำหนดเป้าหมายกรรมปัจจุบันด้วยสติปัญญาอย่างสอดคล้องกับธรรมชาติ`,
    health: `วิเคราะห์ความสมดุลของธาตุ พลังชีวิต และสุขภาวะ (Health & Vitality):
1. **แก่นแท้พลังชีวิตและจุดเปราะบาง** — เจาะลึกภพมรณะ/หินะ/พยายะ/ตนุ เพื่อเข้าใจความสมดุลของกายและจิต
2. **กายใจที่สัมพันธ์กัน (มหาภูติจร)** — สภาวะอารมณ์ที่สะท้อนออกมาเป็นความตึงเครียดหรือความลื่นไหลของสุขภาพกาย
3. **ปัจจัยกระทบสุขภาพภายนอก (ทักษาจร)** — อิทธิพลจากสิ่งแวดล้อมและช่วงเวลาที่ส่งผลต่อระบบพลังงานในร่างกาย
4. **การบำบัดรักษาและคืนสู่สมดุล** — วิธีฟื้นฟูกายและจิตด้วยสติปัญญา ปรับปัจจุบันกรรมเพื่อคืนสู่สุขภาวะที่สมบูรณ์`,
    daily_insight: `แนวทางปฏิบัติและการเจริญสติในการดำเนินชีวิตวันนี้:
1. **พลังงานประจำวันและปัญญาญาณ** — คุณลักษณะและการแสดงออกของดวงดาวเจ้ายามอัฏฐกาลปัจจุบัน
2. **สภาวะใจภายในวันนี้ (มหาภูติจร)** — การรู้เท่าทันความพร้อม อารมณ์ และ Mindset ของตัวเองในวันนี้
3. **ปัจจัยภายนอกและการรับมือ (ทักษาจร)** — สิ่งที่จะผ่านเข้ามาให้คุณได้เรียนรู้และมีสติตอบสนองในวันนี้
4. **บทสรุปนำทางปัจจุบันกรรม** — Action Plan เล็กๆ 1 ข้อเพื่อสร้างพลังบวกและความตระหนักรู้วันนี้`,
    personal_branding: `วิเคราะห์เสน่ห์จากพื้นดวงและการสร้างอัตลักษณ์ตนเอง (Personal Identity & Branding):
1. **เสน่ห์และบุคลิกภาพที่โดดเด่น** — วิเคราะห์จากภพอัตตะ (ตัวตน), พันธุ (จิตใจภายใน), และตนุ (อัธยาศัยที่แสดงออก)
2. **ชื่อเสียงและพลังดึงดูด** — เจาะลึกภพศุภะ และการสื่อสารที่โดดเด่น
3. **รูปแบบการสื่อสารสร้างเสน่ห์** — การใช้จุดเด่นจากการทำงาน (กัมมะ) และโอกาสสร้างรายได้ (ลาภะ)
4. **Personal Identity Branding Planner** — สรุปภาพลักษณ์สร้างเสน่ห์ที่เหมาะสม แนวทางการพัฒนาตนเอง`,
  },
  en: {
    general_prediction: `Analyze predictions for therapy and life guidance:
1. **General Life Situation** - Analyze external factors (Taksa Transit) affecting this period.
2. **Opportunities for New Beginnings** - Deep dive into houses of Putta/Lapha/Phoka/Supha/Thanang.
3. **Family and Relationships** - Analyze Phoka/Phanthu/Thasa/Thasi/Pita/Mata for balance.
4. **Overall Life Wisdom Summary** - Explain power from Base 4 (Divine Power) for Mindset shifts.`,
    life_overview: `Analyze deep life structure for spiritual growth and potential development:
1. **Essence and Life Purpose** - Decode planetary codes from Tanu/Atta houses to understand innate traits.
2. **Unification Power (Base 4 Divine Power)** - Explain the quality of internal energy and mindset.
3. **Internal and External Harmony** - Integration of Taksa Transit and MahaBhuti Transit.
4. **Action Plan for Stillness and Wisdom** - Guidelines for discovering intuition and using planetary energy.`,
    career: `Analyze career, responsibilities, and life mission (Mission & Success):
1. **Outstanding and Suitable Careers** - Focus on Kamma/Supha/Lapha for maximum potential.
2. **Professional Life Lessons** - Decode planetary energy in career houses for learning paths.
3. **Work Mindset (MahaBhuti Transit)** - Internal readiness, creativity, or obstacles to overcome.
4. **Success Strategies** - Use planetary helpers to enhance career games and sustainable progress.`,
    relationship: `Analyze relationships, connection lessons, and mutual growth:
1. **Relationship Connections and Lessons** - Decode planets in Patni/Phoka/Mata houses.
2. **Mindset in Relationships (MahaBhuti Transit)** - Internal needs, peace, or emotional healing.
3. **External Factors and Lessons (Taksa Transit)** - Environment and connections testing the relationship.
4. **Wisdom for Peaceful and Sustainable Love** - Balance energy of present actions for growth.`,
    wealth: `Analyze wealth flow, prosperity, and birth chart treasures:
1. **Finance and Wealth Patterns** - Deep dive into Thanang/Kadumbha/Phoka for value creation paths.
2. **Mindset for Attracting Wealth (MahaBhuti Transit)** - Alignment of mental state and readiness.
3. **Finance Opportunities and Environment (Taksa Transit)** - Asset growth timing or leakage points.
4. **Wealth Energy Flow Strategy** - Bring internal wisdom and planetary helpers to unlock abundance.`,
    annual_forecast: `Analyze annual life rhythm and wisdom map for the next 12 months:
1. **Core Energy of Current Year** - Qualitative meaning of planets this year for destiny.
2. **Lessons and Opportunities in Each Dimension** - Understanding subconscious and emotions from transits.
3. **Annual Readiness and Opportunities** - Summary of internal readiness and external opportunities.
4. **Annual Life Plan and Action Plan** - Set present action goals aligned with nature.`,
    health: `Analyze element balance, vital energy, and well-being (Health & Vitality):
1. **Vital Energy Essence and Vulnerabilities** - Focus on Marana/Hina/Phayaya/Tanu for body-mind balance.
2. **Body-Mind Relationship (MahaBhuti Transit)** - Emotional states reflected in physical health.
3. **External Health Factors (Taksa Transit)** - Environmental influences on the body's energy system.
4. **Healing and Balance Restoration** - Methods for restoring body and mind with wisdom.`,
    daily_insight: `Practices and mindfulness for living today:
1. **Daily Energy and Intuition** - Characteristics of current Atthakarn ruling planets.
2. **Internal State Today (MahaBhuti Transit)** - Awareness of your own readiness and mindset today.
3. **External Factors and Response (Taksa Transit)** - Things to learn and respond to mindfully today.
4. **Present Action Plan Conclusion** - One small action plan for positive energy and awareness.`,
    personal_branding: `Analyze charm and identity building (Personal Identity & Branding):
1. **Outstanding Charm and Personality** - Analysis of Atta (Self), Phanthu (Internal Mind), and Tanu (Expression).
2. **Reputation and Attraction Power** - Deep dive into Supha and prominent communication.
3. **Communication Style for Charm** - Using strengths from work (Kamma) and income opportunities (Lapha).
4. **Personal Identity Branding Planner** - Summary of suitable charm imagery and development.`,
  },
  zh: {
    general_prediction: `分析疗愈和生活指导的预测：
1. **总体生活状况** - 分析影响这一时期的外部因素 (ทักษาจร)。
2. **新开始的机会** - 深入研究 Putta/Lapha/Phoka/Supha/Thanang 宫位以寻找契机。
3. **家庭与人际关系** - 分析 Phoka/Phanthu/Thasa/Thasi/Pita/Mata 宫位以平衡家庭关系。
4. **整体生命智慧总结** - 解释来自第 4 宫 (กำลังเทวดา) 的力量，以识别需要改进的心态。`,
    life_overview: `分析深度生命结构以实现灵性成长和潜力开发：
1. **本质与生命目的** - 通过 Tanu/Atta 宫位的行星代码解码，了解先天特质。
2. **融合力量 (第 4 宫กำลังเทวดา)** - 解释内在能量的质量和积累的心态。
3. **内在与外在的和谐** - 结合外在因素 (ทักษาจร) 和内在心态 (มหาภูติจร)。
4. **通往宁静与智慧的行动计划** - 发现直觉和利用行星能量的生活指南。`,
    career: `分析事业、职责和生命使命 (使命与成功)：
1. **杰出且适合的事业** - 重点关注 Kamma/Supha/Lapha 以发掘最大潜力。
2. **职业生涯中的生命教训** - 解码事业宫位中的行星能量，了解职责和学习路径。
3. **工作心态 (มหาภูติจร)** - 内在准备情况、创造力或需要克服的障碍。
4. **推动成功的策略** - 利用行星助力器来提升事业表现并取得可持续进步。`,
    relationship: `分析关系、连接教训和共同成长：
1. **关系的连接与教训** - 解码 Patni/Phoka/Mata 宫位中的行星，了解影响。
2. **关系中的心态 (มหาภูติจร)** - 内在需求、宁静或需要疗愈的情绪状态。
3. **外部支持因素与教训 (ทักษาจร)** - 周围环境和测试关系的连接。
4. **通往宁静而持久爱情的智慧** - 平衡当下行为的能量，实现理解与成长。`,
    wealth: `分析财富流、繁荣和命盘宝藏：
1. **财务与财富模式** - 深入研究 Thanang/Kadumbha/Phoka 以了解价值创造路径。
2. **吸引财富的心态 (มหาภูติจร)** - 心理状态的契合度以及吸引财富能量的准备情况。
3. **财务机会与环境 (ทักษาจร)** - 资产增长的时机或需要谨慎管理的流失点。
4. **财富能量流策略** - 利用内在智慧和行星助手开启生活中的丰盈。`,
    annual_forecast: `分析年度生命节奏和未来 12 个月的智慧地图：
1. **当年核心能量** - 今年行星对命运的定性意义。
2. **各维度的教训与机会** - 通过流年星曜代码了解潜意识和情绪。
3. **年度准备情况与机会** - 总结内在准备情况 (มหาภูติจร) 和外部机会 (ทักษาจร)。
4. **年度生活计划与行动计划** - 设定与自然相契合的当下行为目标。`,
    health: `分析元素平衡、生命能量和健康状况 (健康与活力)：
1. **生命能量本质与脆弱点** - 关注 Marana/Hina/Phayaya/Tanu 以了解身心平衡。
2. **身心关联 (มหาภูติจร)** - 反映为身体健康压力或顺畅的情绪状态。
3. **外部健康影响因素 (ทักษาจร)** - 环境和时间对身体能量系统的影响。
4. **疗愈与恢复平衡** - 用智慧修复身心的方法，调整当下行为以恢复健康。`,
    daily_insight: `当下的生活实践与正念引导：
1. **每日能量与直觉** - 当前时辰统治星的特质和表现。
2. **今日内在状态 (มหาภูติจร)** - 察觉自己今日的准备情况、情绪和心态。
3. **外部因素与应对 (ทักษาจร)** - 今日将经历的学习事物以及正念回应。
4. **当下行动计划总结** - 一个简单的行动计划，用于创造正能量和觉知。`,
    personal_branding: `分析魅力与身份构建 (个人身份与品牌)：
1. **突出的魅力与个性** - 分析 Atta (自我), Phanthu (内在心灵), 和 Tanu (表达)。
2. **声誉与吸引力** - 深入研究 Supha 宫位和突出的沟通能力。
3. **魅力的沟通方式** - 利用工作 (Kamma) 和收入机会 (Lapha) 的优势。
4. **个人身份品牌策划师** - 总结适合的魅力形象、发展方向和具体的提升活动。`,
  }
};

const SYSTEM_ROLE: Record<Locale, string> = {
  th: `คุณคือ Spiritual Wisdom Guidance ผู้นำทางจิตวิญญาณและปัญญาญาณเพื่อช่วยให้ผู้คนตระหนักรู้ เติบโต และจัดสมดุลพลังงานในตนเอง ผ่านการอ่านรหัสดวงดาวตามหลักเลข 7 ตัว 9 ฐาน`,
  en: `You are Spiritual Wisdom Guidance, a spiritual and intuitive guide helping people achieve awareness, growth, and energy balance through reading planetary codes based on the 7-Star 9-Base system.`,
  zh: `你是灵性智慧指南 (Spiritual Wisdom Guidance)，一位灵性和直觉导师，通过解读基于七星九宫系统的行星代码，帮助人们实现觉知、成长和能量平衡。`
};

const INTRO_TEXT: Record<Locale, string> = {
  th: `สวัสดีครับ ยินดีต้อนรับสู่พื้นที่แห่งปัญญาญาณและการเติบโตภายใน ผมคือ Wisdom Guidance ครับ\n\nการเดินทางของชีวิตไม่ใช่เรื่องบังเอิญ แต่คือการจัดสรรของห้วงมิติและพลังงานดวงดาวที่สถิตอยู่ภายในจิตวิญญาณของคุณ วันนี้เราจะมาร่วมกันถอดรหัสชะตาชีวิตผ่านแผนผังดวงดาว เพื่อค้นหาคำตอบลึกซึ้งที่ซ่อนอยู่ภายในตัวคุณกันครับ`,
  en: `Greetings, welcome to the space of intuition and internal growth. I am Wisdom Guidance.\n\nLife's journey is no coincidence, but the divine orchestration of cosmic dimensions and planetary energies residing within your soul. Today, we decode your destiny chart to unveil the profound truths within.`,
  zh: `您好，欢迎来到直觉与内在成长的空间。我是智慧指南 (Wisdom Guidance)。\n\n生命的旅程并非巧合，而是宇宙维度与内在灵魂中行星能量的精妙安排。今天，让我们一同通过星盘解读您的命运密码，探寻深藏于您内在的深刻答案。`
};

const DOMAIN_INTRO_PHRASES: Record<Locale, Record<AIReportType, string>> = {
  th: {
    general_prediction: "สำหรับ **พยากรณ์ปัญญาชีวิต** แนวทางบำบัดและไกด์เส้นทางชีวิตหลักของคุณนั้น จากการวิเคราะห์ศักยภาพของดวงดาวที่ปรากฏในผังดวง ตามหลัก เลข 7 ตัว 9 ฐานนั้น อธิบายได้ว่า..",
    personal_branding: "สำหรับ **ตัวตน & อัตลักษณ์** เสน่ห์และแบรนด์บุคคลของคุณนั้น จากการวิเคราะห์ศักยภาพของดวงดาวที่ปรากฏในผังดวง ตามหลัก เลข 7 ตัว 9 ฐานนั้น อธิบายได้ว่า..",
    career: "สำหรับ **การงาน&ธุรกิจ (ภารกิจ & ความสำเร็จ)** โอกาสและความสำเร็จของคุณนั้น จากการวิเคราะห์ศักยภาพของดวงดาวที่ปรากฏในผังดวง ตามหลัก เลข 7 ตัว 9 ฐานนั้น อธิบายได้ว่า..",
    relationship: "สำหรับ **ความรัก&คู่ครอง (เสน่ห์ & สัมพันธ์)** เนื้อคู่และเสน่ห์เมตตาของคุณนั้น จากการวิเคราะห์ศักยภาพของดวงดาวที่ปรากฏในผังดวง ตามหลัก เลข 7 ตัว 9 ฐานนั้น อธิบายได้ว่า..",
    wealth: "สำหรับ **โอกาส&การเงิน (กระแสทรัพย์ & มั่งคั่ง)** คลังสมบัติประจำดวงของคุณนั้น จากการวิเคราะห์ศักยภาพของดวงดาวที่ปรากฏในผังดวง ตามหลัก เลข 7 ตัว 9 ฐานนั้น อธิบายได้ว่า..",
    annual_forecast: "สำหรับ **จังหวะชะตารายปี** แผนที่พลังงานปีจรของคุณนั้น จากการวิเคราะห์ศักยภาพของดวงดาวที่ปรากฏในผังดวง ตามหลัก เลข 7 ตัว 9 ฐานนั้น อธิบายได้ว่า..",
    life_overview: "สำหรับ **ภาพรวมชะตาชีวิต** บอกถึงเส้นทางชีวิตหลักของคุณนั้น จากการวิเคราะห์ศักยภาพของดวงดาวที่ปรากฏในผังดวง ตามหลัก เลข 7 ตัว 9 ฐานนั้น อธิบายได้ว่า..",
    health: "สำหรับ **สุขภาพ & พลังชีวิต** สมดุลธาตุและสุขภาวะของคุณนั้น จากการวิเคราะห์ศักยภาพของดวงดาวที่ปรากฏในผังดวง ตามหลัก เลข 7 ตัว 9 ฐานนั้น อธิบายได้ว่า..",
    daily_insight: "สำหรับ **ปัญญาญาณรายวัน** จังหวะพลังงานและสติสัมปชัญญะของคุณในวันนี้ อธิบายได้ว่า..",
  },
  en: {
    general_prediction: "Regarding your **Life Wisdom Guidance**, the celestial analysis reveals that...",
    personal_branding: "Regarding your **Personal Identity & Branding**, the celestial analysis reveals that...",
    career: "Regarding your **Career & Mission**, the celestial analysis reveals that...",
    relationship: "Regarding your **Love & Relationships**, the celestial analysis reveals that...",
    wealth: "Regarding your **Wealth Flow & Abundance**, the celestial analysis reveals that...",
    annual_forecast: "Regarding your **Annual Destiny Rhythm**, the celestial analysis reveals that...",
    life_overview: "Regarding your **Life Overview Structure**, the celestial analysis reveals that...",
    health: "Regarding your **Health & Vitality**, the celestial analysis reveals that...",
    daily_insight: "Regarding your **Daily Intuition**, the celestial analysis reveals that...",
  },
  zh: {
    general_prediction: "关于您的**生命智慧指引**，根据七星九宫星盘分析...",
    personal_branding: "关于您的**个人品牌与魅力**，根据七星九宫星盘分析...",
    career: "关于您的**事业与使命**，根据七星九宫星盘分析...",
    relationship: "关于您的**爱情与关系**，根据七星九宫星盘分析...",
    wealth: "关于您的**财富流与丰盛**，根据七星九宫星盘分析...",
    annual_forecast: "关于您的**年度命运节奏**，根据七星九宫星盘分析...",
    life_overview: "关于您的**生命全貌结构**，根据七星九宫星盘分析...",
    health: "关于您的**健康与活力**，根据七星九宫星盘分析...",
    daily_insight: "关于您的**每日灵性直觉**，根据七星九宫星盘分析...",
  }
};

export function buildLifeReportPrompt(
  result: PhopephumResult,
  reportType: AIReportType,
  userName: string,
  birthYam: AtthakarnBirthYamContext | null = null,
  locale: Locale = "th"
): string {
  const { nineBase, taksaTransit, mahaTransit, crossCheck, atthakarn, rahu } = result;
  const matrix = nineBase.bases;
  const houses = HOUSE_NAMES[locale];
  const planets = PLANET_NAMES_MAP[locale];

  // Matrix Markdown Table
  const baseLabels = {
    th: ["วันเกิด", "เดือนเกิด", "ปีเกิด", "กำลังเทวดา", "เศษโสฬส", "กำลัง 1", "กำลัง 2", "อาตมะ", "ภริยัง"],
    en: ["Birth Day", "Birth Month", "Birth Year", "Divine Power", "Solos Remainder", "Power 1", "Power 2", "Atma", "Phariyang"],
    zh: ["生日", "生月", "生年", "神力", "索洛斯余数", "力量 1", "力量 2", "自我", "配偶"]
  };
  const labels = baseLabels[locale];

  let matrixTable = locale === "zh" ? "| 宫位 | 行星 1 (日) | 行星 2 (月) | 行星 3 (火) | 行星 4 (水) | 行星 5 (木) | 行星 6 (金) | 行星 7 (土) |\n" : 
                    locale === "en" ? "| Base | House 1 (Sun) | House 2 (Moon) | House 3 (Mars) | House 4 (Mercury) | House 5 (Jupiter) | House 6 (Venus) | House 7 (Saturn) |\n" :
                                     "| ฐานที่ | ภพ 1 (อาทิตย์) | ภพ 2 (จันทร์) | ภพ 3 (อังคาร) | ภพ 4 (พุธ) | ภพ 5 (พฤหัส) | ภพ 6 (ศุกร์) | ภพ 7 (เสาร์) |\n";
  matrixTable += "| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n";
  
  for (let i = 0; i < 3; i++) {
    matrixTable += `| **${labels[i]}** | ${matrix[i]?.map((v, idx) => `${v} (${houses[i]?.[idx]})`).join(" | ")} |\n`;
  }
  for (let i = 3; i < 9; i++) {
    matrixTable += `| **${labels[i]}** | ${matrix[i]?.join(" | ")} |\n`;
  }

  // Taksa Info
  let taksaInfo = "";
  for (let star = 1; star <= 8; star++) {
    const role = taksaTransit.map[star as StarNumber] || (locale === "th" ? "ไม่มีบทบาท" : locale === "zh" ? "无角色" : "No Role");
    taksaInfo += `- ${planets[star]}: ${role}\n`;
  }

  // Maha Info
  let mahaInfo = "";
  for (let star = 1; star <= 7; star++) {
    const state = Object.entries(mahaTransit.map).find(([, v]) => v === star)?.[0] || (locale === "th" ? "ไม่มีบทบาท" : locale === "zh" ? "无角色" : "No Role");
    mahaInfo += `- ${planets[star]}: ${state}\n`;
  }

  const reportInstructions = REPORT_TYPE_INSTRUCTIONS[locale][reportType] ?? REPORT_TYPE_INSTRUCTIONS[locale].general_prediction;
  const reportLabel = REPORT_TYPE_LABEL[locale][reportType] ?? reportType;
  const domainIntro = DOMAIN_INTRO_PHRASES[locale][reportType] ?? DOMAIN_INTRO_PHRASES[locale].general_prediction;

  const outputLangInstruction = {
    th: "โปรดเขียนรายงานเป็นภาษาไทยที่สละสลวย อบอุ่น ทรงปัญญา และเข้าถึงใจ",
    en: "Please write the report in elegant, warm, and insightful English.",
    zh: "请用优美、温暖、富有智慧的中文撰写报告。"
  }[locale];

  // 5 Transit Dimensions & Jorn Info
  const vayaInfo = result.vayaJorn 
    ? `- วัยจร (Life Age Stage): เสวยภพ "${result.vayaJorn.houseName}" (ดาว ${result.vayaJorn.star}) ฐานที่ ${result.vayaJorn.row} คอลัมน์ที่ ${result.vayaJorn.col} (ช่วงอายุ ${result.vayaJorn.ageRange || ""})`
    : "";
  const yearlyInfo = result.yearlyJorn
    ? `- ปีจร (Annual Focus): ตกภพ "${result.yearlyJorn.houseName}" (ดาว ${result.yearlyJorn.star}) ฐานที่ ${result.yearlyJorn.row} คอลัมน์ที่ ${result.yearlyJorn.col}`
    : "";
  const lagnaInfo = result.lagnaTransit
    ? `- ลัคนาจร (Progressed Lagna): สถิตภพ "${result.lagnaTransit.houseName}" (ดาว ${result.lagnaTransit.star}) ฐานที่ ${result.lagnaTransit.row} คอลัมน์ที่ ${result.lagnaTransit.col}`
    : "";

  return `# Role: spiritual wisdom guidance

${SYSTEM_ROLE[locale]}

## 📣 Opening Greeting & Identity
เริ่มต้นรายงานด้วยข้อความต้อนรับและคำเปิดหมวดหมู่นี้เสมอ:
${INTRO_TEXT[locale]}

${domainIntro}

*(ข้อห้าม: ห้ามใช้คำว่า "ครูเด่น", "Kru Den" หรือ "Fingerprint" เด็ดขาด — ให้อ้างอิงในฐานะ Wisdom Guidance)*

## 🔮 Destiny Decoding Data: ${userName}

### 1. 7-Star 9-Base Chart (ผังดวง ๗ ตัว ๙ ฐาน)
${matrixTable}

### 2. 5 Transit Dimensions (กาลเวลาชะตาจร)
- อายุย่างปัจจุบัน: ${taksaTransit.ageYang} ปี
${vayaInfo}
${yearlyInfo}
${lagnaInfo}

### 3. External Factors (Taksa Transit — สภาพแวดล้อมและโอกาสภายนอก)
${taksaInfo}

### 4. Internal Mindset (Maha Transit — สภาพจิตใจและความพร้อมภายใน)
${mahaInfo}

### 5. Current Time Context
- Current Yam: ${atthakarn.planetName} (${atthakarn.startTime}–${atthakarn.endTime})

${birthYam ? buildAtthakarnContext(birthYam) : ""}

---

## 🔮 Core Tracing Rules (Star Tracing Method & Spiritual Synthesis)
1. **Star Tracing Method (3 Steps):**
   - **Step 1 (Inquiry):** จุดเริ่มต้น/เหตุแห่งเรื่องราวมาจาก ฐ.๑ (วันเกิด) เชื่อมโยงด้วย "ตัวเลขดาวเดียวกัน" ไปยัง ฐ.๒ (เดือนเกิด) และ ฐ.๓ (ปีเกิด)
   - **Step 2 (Tracing the Path):** ดาวดวงเดียวกันที่ไปสถิตในภพต่างๆ คือสายใยเรื่องราวชีวิตจริง (เช่น ดาวพุธ(๔) อยู่ในภพปิตา → สหัชชะ → กัมมะ)
   - **Step 3 (Base 4 Confirmation):** ฐานที่ ๔ (กำลังเทวดา) ในคอลัมน์เดียวกันกับดาวใน ฐ.๓ คือพลังหนุน/มายด์เซ็ทที่หลอมรวมสิ่งที่เรา คิด พูด ทำ (ตามหลักขันธ์ ๕ และกฎแห่งกรรม) ตัดสินคุณภาพและส่งผลต่อไปยัง ฐ.๘ (อาตมะ) และ ฐ.๙ (นาวัง/ภริยัง)
2. **การผสมผสานทักษาจร และมหาภูติจร:**
   - **ทักษาจร (ปัจจัยภายนอก):** คือโลกภายนอก โอกาส ข้อสอบชีวิต สภาพแวดล้อม (Opportunity/Threat) เช่น ศรี, เดช, มนตรี, กาลกิณี
   - **มหาภูติจร (สภาวะภายใน):** คือความพร้อมหรือความไม่พร้อมภายในใจ (Passion/Fear/Mindset) เช่น ราชา, อธิบดี, ขุมทรัพย์, มรณะ
3. **กฎเหล็กเรื่องภาษาและรูปแบบ (Tone & Formatting Rules):**
   - **ห้ามสร้างตาราง Markdown ดิบทางเทคนิค** หรือแจกแจงตัวเลขสูตรคณิตศาสตร์แบบแห้งแล้ง
   - **ห้ามแจกแจงเป็นข้อๆ แบบตำราวิชาการ** (เช่น ห้ามเขียน "ดาว 1 = เดช, ดาว 2 = ศรี")
   - **ให้อธิบายเชิงปัญญาและจิตวิญญาณอย่างมีเหตุผลลึกซึ้ง** หล่อหลอมเป็นคำแนะนำชีวิตที่อบอุ่น ลื่นไหล เข้าใจง่าย สุภาพ และสร้างแรงบันดาลใจ

---

## 📝 Report Assignment: ${reportLabel}

${reportInstructions}

---

## 💬 Response Structure & Headings
${outputLangInstruction}

โปรดจัดโครงสร้างรายงานเป็น 4 หัวข้อหลัก (The 4 Sacred Sections) อย่างเคร่งครัด:

### 1. บทนำ (The Awakening)
ยินดีต้อนรับเข้าสู่ห้วงเวลาแห่งการตื่นรู้และจัดสมดุลพลังงานชีวิต สรุปภาพรวมพลังงานหลักและทิศทางชีวิตในช่วงนี้อย่างมีปัญญาญาณ

### 2. การพยากรณ์วิเคราะห์เจาะลึก (The Decoding)
วิเคราะห์โครงสร้างพลังงานผ่านผังดวงดาว:
- **สภาวะภายในและมายด์เซ็ท (Internal State):** ถอดรหัสมหาภูติจรและฐานกำลังเทวดา (Base 4) ถึงสภาพจิตใจ ความพร้อม และอุปนิสัยลึกๆ
- **ปัจจัยและสภาพแวดล้อมภายนอก (External Factors):** ถอดรหัสทักษาจร และโอกาสหรือข้อสอบชีวิตที่เข้ามากระทบ
- **สายใยดวงดาว (Star Tracing Synthesis):** ร้อยเรียงเหตุจาก ฐ.๑-ฐ.๓ ผ่านพลังหนุน ฐ.๔ สู่ผลลัพธ์ ฐ.๘-ฐ.๙

### 3. แผนที่ปัญญาญาณนำทางชีวิต (The Astral Blueprint)
เจาะลึกเนื้อหาเฉพาะของหมวด ${reportLabel} ตามหัวข้อที่ระบุใน Report Assignment อย่างละเอียด ครบถ้วน ลึกซึ้ง และงดงาม

### 4. ปัญญาญาณและแนวทางปฏิบัติจริง (Final Wisdom & Action Plan)
สรุปปัญญาญาณตกผลึก พร้อม Action Plan ยุทธศาสตร์ 1-3 ข้อที่เป็นรูปธรรม สามารถนำไปปฏิบัติได้จริงในชีวิตประจำวันเพื่อสร้างความเจริญงอกงาม
`;
}
