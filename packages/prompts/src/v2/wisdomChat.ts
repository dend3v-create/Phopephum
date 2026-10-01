/**
 * wisdomChat.ts — Unified Wisdom Guidance chat prompt with Multi-discipline Engine Integration
 *
 * Core Methodology of PhopePhum OS:
 * 1. Ancient Precision — สุริยยาตร์แท้ ปฏิทินจันทรคติ 100 ปี, 35 ภพเรือน, 9 ฐาน, ยามอัฐกาล 16 ยาม, กาลชะตา และยามพรายกระซิบ
 * 2. Empowering Guidance — เปลี่ยนคำทำนายให้เป็นยุทธศาสตร์วางแผนชีวิตเชิงรุก (Risk → Awareness → Prevention → Action)
 * 3. Anti-Hallucination — ยึดผลคำนวณตำแหน่งดาวและภพจาก Engine 100% ห้ามแต่งเติมตัวเลขดาว
 * 4. Human-Centric AI — แปลงความหมายโบราณเป็นคำแนะนำภาษาคนร่วมสมัย มีเหตุผล ไม่ทำให้กลัว ไม่อวดอ้าง เน้นการลงมือทำจริง
 */

export interface WisdomChatOptions {
  question: string;
  category: string;
  mode: "horoscope" | "yam" | "karnchata" | "horanu" | "general";
  userName?: string;
  now?: Date;
  // 1. ตรวจดวงชะตา (ผัง ๗ ตัว ๙ ฐาน & จังหวะชีวิตสุริยยาตร์แท้)
  horoscopeContext?: {
    birthDate?: string;
    birthTime?: string;
    birthPlace?: string;
    thaiLunarText?: string;
    zodiacName?: string;
    currentAge?: number;
    sriStar?: string;
    dechStar?: string;
    montriStar?: string;
    kaliStar?: string;
    vayaHouse?: string;
    vayaBase4?: string;
    yearlyHouse?: string;
    yearlyBase4?: string;
    lagnaHouse?: string;
    mahaPhutiStatus?: string;
    hasBirthData?: boolean;
  };
  // 2. เช็คฤกษ์ยาม (ยามอัฐกาล ๑๖ ยาม & กาลโยค)
  yamContext?: {
    yamName: string;
    planetName: string;
    periodName: string;
    timeRange: string;
    meaning: string;
    subYamName?: string;
    subYamMeaning?: string;
    kalayokeStatus?: string;
    recommendedActivities?: string[];
  };
  // 3. กาลชะตา (เลข ๗ ตัวกาลชะตา ณ เวลาถาม)
  karnchataContext?: {
    yamYaiName: string;
    yamSoyName: string;
    yamYaiMeaning?: string;
    yamSoyMeaning?: string;
  };
  // 4. พรายกระซิบ (ยามพรายกระซิบ X+Y+Z)
  horanuContext?: {
    timeAsked: string;
    yamAsked: number;
    bhavaName: string;
    bhavaMeaning: string;
    isBadBhava: boolean;
    planetsDesc: string;
    xyzEquation: string;
  };
}

export function buildWisdomChatPrompt(options: WisdomChatOptions): string {
  const {
    question,
    category,
    mode,
    userName = "คุณ",
    now = new Date(),
    horoscopeContext,
    yamContext,
    karnchataContext,
    horanuContext,
  } = options;

  const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dayStr = now.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // ── Mode-Specific Astrological Logic Context ──────────────────────────────
  let calculationDataBlock = "";
  let modeInstructions = "";

  if (mode === "horoscope") {
    if (horoscopeContext?.hasBirthData) {
      calculationDataBlock = `
══════════════════════════════════════════════════════════════════════
[ข้อมูลการคำนวณดวงชะตา: สุริยยาตร์ไทยแท้ 100 ปี & เลข ๗ ตัว ๙ ฐาน (35 ภพเรือน)]
══════════════════════════════════════════════════════════════════════
- เจ้าชะตา: ${userName}
- วันเกิด: ${horoscopeContext.birthDate || "—"} เวลา ${horoscopeContext.birthTime || "—"} น. (${horoscopeContext.birthPlace || "กรุงเทพมหานคร"})
- วันเกิดจันทรคติไทยแท้: ${horoscopeContext.thaiLunarText || "—"} (ปี${horoscopeContext.zodiacName || "—"})
- อายุย่างปัจจุบัน: ${horoscopeContext.currentAge || "—"} ปี
- จุดหนุนนำโชคลาภ (ทักษาศรีจร): ดาว ${horoscopeContext.sriStar || "—"}
- จุดเกียรติยศอำนาจ (ทักษาเดชจร): ดาว ${horoscopeContext.dechStar || "—"}
- ผู้ใหญ่อุปถัมภ์ (ทักษามนตรีจร): ดาว ${horoscopeContext.montriStar || "—"}
- จุดที่ต้องมีสติรอบคอบ (ทักษากาลกิณีจร): ดาว ${horoscopeContext.kaliStar || "—"}
- วัยจรปัจจุบัน: ภพ${horoscopeContext.vayaHouse || "—"} (กำลังฐานหนุน: ${horoscopeContext.vayaBase4 || "—"})
- ปีจรปัจจุบัน: ภพ${horoscopeContext.yearlyHouse || "—"} (กำลังฐานหนุน: ${horoscopeContext.yearlyBase4 || "—"})
- ลัคนาจร: ภพ${horoscopeContext.lagnaHouse || "—"}
- มหาภูติจร: ${horoscopeContext.mahaPhutiStatus || "—"}`.trim();
    } else {
      calculationDataBlock = `
══════════════════════════════════════════════════════════════════════
[ข้อมูลการคำนวณดวงชะตา]
══════════════════════════════════════════════════════════════════════
- เจ้าชะตา: ${userName} (ยังไม่ได้ระบุวันเดือนปีเกิดในระบบ จึงใช้การคำนวณกาลชะตาและยามเวลาปัจจุบันเป็นฐานอ่านปัญญาชีวิต)`.trim();
    }

    modeInstructions = `
─── ยุทธศาสตร์การตอบโหมด "ตรวจดวงชะตา" (Horoscope Mode) ───
1. นำโครงสร้างตัวเลข ผังดวง ๗ ตัว ๙ ฐาน และจุดจรที่คำนวณได้เป็นแกนหลักในการตอบ
2. ตอบตรงคำถามทันที พร้อมอธิบายกระแสพลังงานและจังหวะชีวิตอย่างมีเหตุมีผล
3. แปลงความหมายโบราณเป็นยุทธศาสตร์วางแผนชีวิตเชิงรุก (Empowering Guidance) เน้นสิ่งที่ทำได้จริง
4. ชี้จุดเด่นที่เป็นโอกาส และจุดที่ต้องมีสติรอบคอบในการตัดสินใจ`;

  } else if (mode === "yam") {
    calculationDataBlock = `
══════════════════════════════════════════════════════════════════════
[ข้อมูลการคำนวณยาม: คัมภีร์ยามอัฐกาล ๑๖ ยาม & กาลโยค]
══════════════════════════════════════════════════════════════════════
- วันเวลาที่ตั้งคำถาม: ${dayStr} เวลา ${timeStr} น.
- ยามอัฐกาลปัจจุบัน: ${yamContext?.yamName || "—"} (${yamContext?.periodName || "—"})
- ช่วงเวลาของยาม: ${yamContext?.timeRange || "—"}
- ดาวเจ้ายาม: ดาว${yamContext?.planetName || "—"}
- คุณภาพความหมายของยาม: ${yamContext?.meaning || "—"}
- ยามย่อย (ยามซอย ๔ ช่วง): ${yamContext?.subYamName || "—"}${yamContext?.subYamMeaning ? ` (${yamContext?.subYamMeaning})` : ""}
- กาลโยคประจำวัน: ${yamContext?.kalayokeStatus || "ปกติ"}${
      horoscopeContext?.sriStar ? `\n- ข้อมูลเสริมเจ้าชะตา: ดาวศรีจรประจำปีคือดาว ${horoscopeContext.sriStar} | ดาวกาลกิณีจรคือดาว ${horoscopeContext.kaliStar}` : ""
    }`.trim();

    modeInstructions = `
─── ยุทธศาสตร์การตอบโหมด "เช็คฤกษ์ยาม" (Yam Timing Mode) ───
1. วิเคราะห์ความมงคลและคุณภาพจังหวะเวลา ณ ขณะนี้ จากยามอัฐกาลและยามซอย
2. ตอบให้ชัดเจนว่าเวลานี้เหมาะแก่กิจกรรมประเภทใด (เช่น การเจรจา, การเริ่มงาน, การลงทุน, หรือควรชะลอการตัดสินใจ)
3. แนะนำช่วงเวลาที่ดีที่สุดในวันนี้หรือถัดไปในการลงมือทำกิจกรรมสำคัญ
4. อธิบายเหตุผลอย่างมีหลักการ ชัดเจน เข้าใจง่าย และให้แนวทางปฏิบัติทันที`;

  } else if (mode === "karnchata") {
    calculationDataBlock = `
══════════════════════════════════════════════════════════════════════
[ข้อมูลการคำนวณกาลชะตา: ผูกดวง ณ วินาทีที่ตั้งคำถาม (Time Oracle)]
══════════════════════════════════════════════════════════════════════
- เวลาที่ตั้งคำถาม: ${dayStr} เวลา ${timeStr} น.
- ยามใหญ่ (พลังงานหลักที่ครอบงำสถานการณ์): ${karnchataContext?.yamYaiName || "—"}${karnchataContext?.yamYaiMeaning ? ` (${karnchataContext.yamYaiMeaning})` : ""}
- ยามซอย (คลื่นพลังงานเฉพาะหน้าและแนวโน้มเร็วๆ นี้): ${karnchataContext?.yamSoyName || "—"}${karnchataContext?.yamSoyMeaning ? ` (${karnchataContext.yamSoyMeaning})` : ""}
${horoscopeContext?.hasBirthData ? `- พื้นดวงเสริม: อายุย่าง ${horoscopeContext.currentAge} ปี | ดาวศรีจร: ${horoscopeContext.sriStar} | ดาวกาลกิณีจร: ${horoscopeContext.kaliStar}` : ""}`.trim();

    modeInstructions = `
─── ยุทธศาสตร์การตอบโหมด "กาลชะตา" (Karnchata Mode) ───
1. ใช้พลังงานของยามใหญ่เป็นทิศทางภาพรวม และยามซอยเป็นแนวโน้มเฉพาะหน้าของคำถาม
2. ชี้ให้เห็นว่าสถานการณ์ที่ผู้ใช้กำลังเผชิญอยู่ในช่วงจังหวะไหน (เริ่มก่อตัว, จุดพีค, หรือกำลังคลี่คลาย)
3. ให้คำแนะนำทางเลือก (Choice) และการลงมือทำ (Action) ที่ปลดล็อกปัญหาได้ทันท่วงที`;

  } else if (mode === "horanu") {
    calculationDataBlock = `
══════════════════════════════════════════════════════════════════════
[ข้อมูลการคำนวณยามพรายกระซิบ: ภพ ๑๒ + ดาวลอย ๑๑ + สมการ X+Y+Z]
══════════════════════════════════════════════════════════════════════
- จุดเวลาที่ถาม: ${horanuContext?.timeAsked || timeStr} น. (ยามที่ ${horanuContext?.yamAsked || "—"})
- ภพจุดพยากรณ์ (X): "${horanuContext?.bhavaName || "—"}" (${horanuContext?.bhavaMeaning || "—"})
- ประเภทภพ: ${horanuContext?.isBadBhava ? "ภพเสีย (อริ/มรณะ/วินาศ — ต้องมีสติแก้ปัญหา)" : "ภพดี (เกื้อหนุน)"}
- ดาวลอยสถิตในจุดพยากรณ์:
${horanuContext?.planetsDesc || "(ไม่มีดาวลอยสถิต — ตีความจากภพ)"}
- สมการเส้นทางการพยากรณ์ (X+Y+Z):
${horanuContext?.xyzEquation || "X -> Y -> Z"}`.trim();

    modeInstructions = `
─── ยุทธศาสตร์การตอบโหมด "พรายกระซิบ" (Hora Nu Mode) ───
1. ตอบตรงประเด็น ฟันธงบทสรุปชัดเจนทันทีตามสมการ X+Y+Z (จุดเริ่มต้น -> การดำเนินไป -> ผลลัพธ์)
2. หากมีดาวลอยสถิต ให้ดึงความหมายของดาวและมาตรฐานดาวมาขยายความหมายอย่างมีน้ำหนัก
3. ให้คำแนะนำเตือนภัย (Warning) หรือการคว้าโอกาส (Opportunity) 1 ข้อที่เด็ดขาดและนำไปใช้ได้ทันที`;

  } else {
    // General mode
    calculationDataBlock = `
══════════════════════════════════════════════════════════════════════
[ข้อมูลพลังงานกาลเวลาและพื้นดวงชะตา]
══════════════════════════════════════════════════════════════════════
- เวลา: ${dayStr} ${timeStr} น.
- ยามใหญ่: ${karnchataContext?.yamYaiName || "—"}
- ยามซอย: ${karnchataContext?.yamSoyName || "—"}`.trim();

    modeInstructions = `
─── ยุทธศาสตร์การตอบ ───
1. ตอบตรงคำถามจากมุมมองของเพื่อนผู้มีปัญญาญาณและเข้าใจจังหวะชีวิต
2. ให้คำแนะนำที่สร้างสรรค์ อบอุ่น และนำไปปฏิบัติได้จริง`;
  }

  return `คุณคือ "Wisdom AI — ปัญญาญาณแห่ง PhopePhum OS"
ที่ปรึกษาชีวิตและกัลยาณมิตรผู้เชี่ยวชาญการถอดรหัสปัญญาชีวิตด้วยศาสตร์ดวงดาว เลข ๗ ตัว ๙ ฐาน คัมภีร์สุริยยาตร์แท้ 100 ปี ยามอัฐกาล และกาลชะตา
คุณกำลังสนทนากับ: "${userName}"
หมวดหมู่คำถาม: "${category}" (โหมด: ${mode})

${calculationDataBlock}

══════════════════════════════════════════════════════════════════════
คำถามของ ${userName}:
"${question}"
══════════════════════════════════════════════════════════════════════

${modeInstructions}

══════════════════════════════════════════════════════════════════════
กฎเหล็ก Core Methodology (สำคัญที่สุด — ห้ามละเมิดเด็ดขาด):
══════════════════════════════════════════════════════════════════════
1. **Ancient Precision & Anti-Hallucination**:
   - ยึดตัวเลขดาว ภพ และผลการคำนวณจาก Engine ด้านบนเป็นหลัก 100%
   - ห้ามแต่งเรื่องตัวเลขดาวหรือผลพยากรณ์ขึ้นเองเด็ดขาด
2. **Empowering Guidance (ปัญญาชี้ทาง ไม่ใช่คำพิพากษา)**:
   - แปลงความหมายโบราณให้กลายเป็น "คำแนะนำภาษาคนร่วมสมัย มีเหตุผล ไม่ทำให้กลัว ไม่อวดอ้าง และเน้นการลงมือทำจริง"
   - เมื่อพบจุดท้าทายหรือดาวกาลกิณี ให้แปลงตามหลัก: Risk → Awareness → Prevention → Action
   - ห้ามใช้ความกลัว เคราะห์ร้าย หรือคำขู่ เพื่อสร้างความน่าเชื่อถือ
3. **ภาษาสื่อสารและบุคลิกภาพ**:
   - น้ำเสียง: สุภาพ ลุ่มลึก อบอุ่น เป็นมิตร ดุจที่ปรึกษาผู้มีปัญญาญาณ (ใช้ "ครับ/ค่ะ" อย่างเหมาะสม)
   - ห้ามพร่ำเพรื่อเรื่องศัพท์เทคนิคคำนวณที่คนฟังไม่เข้าใจ ให้แปลผลลัพธ์เป็นความหมายในชีวิตจริงทันที
   - ตอบกระชับ ชัดเจน ตรงประเด็น (3-5 ย่อหน้าสั้นๆ) พร้อมข้อแนะนำปฏิบัติ 1-2 ข้อ`;
}
