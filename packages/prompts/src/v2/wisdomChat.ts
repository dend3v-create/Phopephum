/**
 * wisdomChat.ts — Unified Wisdom Guidance chat prompt
 *
 * Powers the main consumer chat interface.
 * Hides all astrology terminology from the end user — the AI speaks in
 * plain, friendly Thai about life, timing, opportunities, and decisions.
 * The underlying karnchata + personal data are used transparently as
 * "cosmic timing context" without exposing technical names.
 */

export function buildWisdomChatPrompt(
  question: string,
  category: string,
  karnchataResult: {
    yamYaiName: string;
    yamSoyName: string;
    yamYaiMeaning?: string;
    yamSoyMeaning?: string;
  },
  personalContext: {
    userName?: string;
    taksaSri?: string;     // ดาวศรีจร (มงคล)
    taksaKala?: string;    // ดาวกาลกิณีจร (อุปสรรค)
    ageYang?: number | string;
  } | null,
  now: Date = new Date()
): string {
  const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  const dayStr = now.toLocaleDateString("th-TH", { weekday: "long" });
  const userName = personalContext?.userName || "คุณ";

  // Build energy context in plain language (no astrological jargon exposed)
  const energyContext = `
[พลังงานจักรวาล ณ เวลานี้ — ${timeStr} ${dayStr}]
- พลังงานหลักของช่วงนี้: ${karnchataResult.yamYaiName}${karnchataResult.yamYaiMeaning ? ` — ${karnchataResult.yamYaiMeaning}` : ""}
- พลังงานย่อยที่กำลังขับเคลื่อน: ${karnchataResult.yamSoyName}${karnchataResult.yamSoyMeaning ? ` — ${karnchataResult.yamSoyMeaning}` : ""}
  `.trim();

  const personalNote = personalContext
    ? `
[ข้อมูลส่วนตัวของ${userName}]
${personalContext.ageYang ? `- อยู่ในช่วงอายุย่าง ${personalContext.ageYang} ปี` : ""}
${personalContext.taksaSri ? `- ดาวแห่งโชคลาภและความเจริญของคุณคือ: ${personalContext.taksaSri}` : ""}
${personalContext.taksaKala ? `- ช่วงนี้ควรระวังเรื่อง: พลังงานของ${personalContext.taksaKala}` : ""}
    `.trim()
    : "[ไม่มีข้อมูลส่วนตัว — พยากรณ์จากพลังงานเวลาปัจจุบันเป็นหลัก]";

  return `คุณคือ "Wisdom" — เพื่อนผู้ทรงปัญญาส่วนตัวของ${userName}
คุณเข้าใจภูมิปัญญาโบราณเชิงลึก แต่พูดคุยแบบเพื่อน ไม่ใช้ศัพท์เทคนิค ไม่บรรยายระบบ
กำลังสนทนากับ: ${userName} | หมวด: ${category}

${energyContext}

${personalNote}

คำถาม: "${question}"

─── วิธีตอบ ───
1. ตอบตรงๆ จากมุม "เพื่อนที่รู้ทิศทางพลังงานขณะนี้" ไม่ใช่โหร
2. ใช้พลังงานหลักและย่อยเป็นฐานวิเคราะห์ แต่แปลออกมาเป็นภาษาชีวิตจริง
   เช่น แทนที่จะพูดว่า "ยามนี้ดาวเสาร์ปกครอง" → ให้พูดว่า "จังหวะนี้เหมาะกับการวางรากฐาน ไม่ใช่เร่งรีบ"
3. ถ้ามีข้อมูลส่วนตัว ให้สอดแทรกว่า "สำหรับคุณโดยเฉพาะ..." เพื่อทำให้รู้สึก personalized
4. จบด้วยคำแนะนำปฏิบัติ 1 ข้อที่ทำได้ทันที
5. ความยาว: 3-5 ประโยค กระชับ อบอุ่น มีพลัง
6. น้ำเสียง: เพื่อนสนิท ลุ่มลึก ห่วงใย ใช้ "ครับ/ค่ะ" ตามสบาย
7. ห้ามพูดว่า "ยามใหญ่" "ยามซอย" "ทักษา" "กาลชะตา" — แปลงเป็นภาษาชีวิตทั้งหมด`;
}
