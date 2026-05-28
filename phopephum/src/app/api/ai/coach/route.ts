import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { calculateSevenBase } from '@/engine/seven-base-calculator'
import { getCurrentHora, PLANETS } from '@/engine/phopephum-calculator'
import { SEVEN_BASE_ROLE_SYSTEM, HORA_CHAT_SYSTEM } from '@/constants/ai-prompts'

export const runtime = 'edge'

// 1. POST /api/ai/coach — ระบบแชทพยากรณ์และแนะนำเชิงลึก (AI Personal Coach)
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ดึงข้อมูลโปรไฟล์ดวงชะตากำเนิดของผู้ใช้
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { messages, context } = body // [{ role: 'user', content: '...' }], optional context string
    
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    const latestMessage = messages[messages.length - 1].content.trim()

    // 1. คำนวณเลข 7 ตัว 9 ฐาน กำเนิดของผู้ใช้
    const sevenBaseData = calculateSevenBase(profile.birth_date, profile.birth_time || "12:00")
    
    // 2. คำนวณยามอัฐกาลปัจจุบันที่กำลังรันอยู่ ณ ขณะนี้
    const currentHoraData = getCurrentHora()
    const currentPlanet = currentHoraData.currentHora?.subSlot.planet || PLANETS.jupiter
    const currentMajorYam = currentHoraData.currentHora
    
    // 2b. ข้อมูลวัน/เวลาปัจจุบัน สำหรับ context เชิงกาลเวลา
    const now = new Date()
    const thaiDayNames = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']
    const thaiMonthNames = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
    const todayDayName = thaiDayNames[now.getDay()]
    const todayDate = `${now.getDate()} ${thaiMonthNames[now.getMonth()]} ${now.getFullYear() + 543}`
    const currentTimeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} น.`
    const periodLabel = now.getHours() >= 6 && now.getHours() < 18 ? 'กลางวัน' : 'กลางคืน'
    
    // สร้าง 7 วัน ข้างหน้า พร้อมชื่อวัน
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(now.getDate() + i)
      return { dayName: thaiDayNames[d.getDay()], date: `${d.getDate()}/${d.getMonth()+1}`, label: i === 0 ? 'วันนี้' : i === 1 ? 'พรุ่งนี้' : `อีก ${i} วัน` }
    })

    // 3. ดึง RAG Knowledge Base จาก Supabase เพื่อใช้ในการพยากรณ์
    const { data: knowledgeItems } = await supabase
      .from('knowledge_base')
      .select('title, content, category')
      .limit(3)

    let systemContext = `คุณคือ WISDOM COACH (LIVING WISDOM & ASTROLOGY GUIDANCE) ผู้เชี่ยวชาญศาสตร์พยากรณ์เลข 7 ตัว 9 ฐาน และยามอัฐกาล
ทำหน้าที่ให้คำแนะนำเชิงกลยุทธ์ (Destiny Management) ด้วยภาษาสุภาพ น่าเชื่อถือ และมั่นใจ
เน้นการตอบที่กระชับมาก (ความยาว 1-3 ประโยค) โดยอ้างอิงข้อมูลจาก "ยามปัจจุบัน" เป็นหลัก

## TONE & STYLE
- สุภาพ นิ่ง และมีความเป็นมืออาชีพสูง
- ไม่ใช้อีโมจิหรือสัญลักษณ์
- **สำคัญ:** ต้องเริ่มต้นหรือระบุถึง "ยามปัจจุบัน" (เช่น ยามระวิ, ยามโสระ) และให้คำแนะนำหรือคำเตือนที่สอดคล้องกับพลังงานของดาวนั้นทันที

## แนวทางการตอบตัวอย่าง:
- "ยามนี้ ระวิ ให้ระวังเรื่องร้อนใจ คิดใคร่ครวญดี และมีสติก่อนตัดสินใจครับ"
- "แนะนำให้นอนหลับพักผ่อนหรือหยุดพักก่อน เพื่อรอให้ผ่านพ้นยามนี้ไปก่อนนะครับ"
- "ในยามชีโวนี้ เป็นจังหวะดีของการเจรจาและการใช้ปัญญาเพื่อหาทางออกที่มั่นคงครับ"`

    if (context) {
      systemContext += `\n\nหัวข้อคำถามนี้ต้องการเน้นวิเคราะห์: ${context}`
    }

    systemContext += `\n\nข้อมูลดวงชะตา:
- ชื่อ: คุณ${profile.full_name}
- ปฏิทินจันทรคติ: ${sevenBaseData.thaiLunarDateText}
- ผังดวง: ${JSON.stringify(sevenBaseData.chart)}
- ทักษา: ${JSON.stringify(sevenBaseData.taksa)}
- มหาภูติ: ${JSON.stringify(sevenBaseData.mahaPhute)}
- ยามปัจจุบัน: ยามที่ ${currentMajorYam?.yamNumber || '-'} — ดาว${currentPlanet.nameThai} (${currentPlanet.description}) เวลา ${currentMajorYam?.activeSubYam?.startTime || ''}–${currentMajorYam?.activeSubYam?.endTime || ''}

## ข้อมูลเวลาปัจจุบัน (สำหรับวางแผนเชิงกาลเวลา):
- วันที่: ${todayDate}
- วันนี้คือ: วัน${todayDayName} ${periodLabel}
- เวลาปัจจุบัน: ${currentTimeStr}
- 7 วันของสัปดาห์นี้: ${weekDays.map(w => `${w.label} (วัน${w.dayName} ${w.date})`).join(' | ')}

**กฎ:** เมื่อผู้ใช้ถามเรื่อง วัน/เวลา/สัปดาห์ ให้ใช้ข้อมูลวันข้างต้นระบุอย่างชัดเจน เช่น "วัน${todayDayName}นี้" หรือ "วันพุธหน้า (28/5)" เพื่อให้ผู้ใช้นำไปบันทึกใน Planner ได้ทันที`

    // ค้นหา API key ใน .env ว่ามีคีย์พร้อมใช้เพื่อยิง AI จริงๆ หรือไม่
    const geminiKey = process.env.GEMINI_API_KEY
    const isGeminiConfigured = geminiKey && geminiKey.includes("AIzaSy")

    if (isGeminiConfigured) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: `${systemContext}\n\nข้อความจากผู้ใช้ล่าสุด: "${latestMessage}"\n\nกรุณาตอบคำถามอย่างสุภาพและกระชับมาก (1-3 ประโยค) โดยอ้างอิงยามปัจจุบันข้างต้น:` }
                  ]
                }
              ],
              generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.4
              }
            })
          }
        )

        if (geminiRes.ok) {
          const resData = await geminiRes.json()
          const aiResponse = resData.candidates?.[0]?.content?.parts?.[0]?.text

          if (aiResponse) {
            return NextResponse.json({
              success: true,
              message: aiResponse,
              source: 'gemini-ai'
            })
          }
        }
      } catch (err) {
        console.error('[/api/ai/coach] Gemini API error, falling back to rule-engine:', err)
      }
    }

    // --- SMART RULE-BASED HOROSCOPE ENGINE FALLBACK (NEW CONCISE YAM STYLE) ---
    let responseText = ""
    const text = latestMessage.toLowerCase()
    const pName = currentPlanet.nameThai
    
    if (text.includes("ระวัง") || text.includes("อุปสรรค") || text.includes("ปัญหา")) {
      responseText = `กราบสวัสดีครับ ในยาม${pName}นี้ แนะนำให้คุณระมัดระวังเรื่องอารมณ์และเรื่องร้อนใจเป็นพิเศษครับ ควรใช้สติคิดใคร่ครวญให้รอบคอบก่อนตัดสินใจ หรือหากเป็นไปได้ แนะนำให้พักผ่อนและรอให้ผ่านพ้นช่วงยามนี้ไปก่อนจะดีที่สุดครับ`
    } else if (text.includes("งาน") || text.includes("อาชีพ") || text.includes("ธุรกิจ")) {
      responseText = `กราบสวัสดีครับ สำหรับการงานในยาม${pName}นี้ เป็นจังหวะที่ต้องใช้ความอดทนและปัญญาในการวางรากฐานครับ แนะนำให้เน้นการเจรจาอย่างประนีประนอมและคว้าโอกาสในช่วงเวลาที่ดาวมงคลเกื้อหนุนเพื่อความสำเร็จที่ยั่งยืนครับ`
    } else if (text.includes("เงิน") || text.includes("โชค") || text.includes("ลาภ")) {
      responseText = `กราบสวัสดีครับ วิเคราะห์กระแสทรัพย์ในยาม${pName}นี้ พบจังหวะหมุนเวียนของการเงินที่ค่อนข้างรวดเร็วครับ ควรระมัดระวังจุดรั่วไหลจากการตัดสินใจชั่ววูบและเน้นการจัดระบบงบประมาณให้รัดกุมเพื่อรักษาความมั่งคั่งไว้ครับ`
    } else {
      responseText = `กราบสวัสดีครับ จากดวงชะตาและยาม${pName}ในขณะนี้ แนะนำให้คุณรักษาสมาธิและจิตใจให้มั่นคงเพื่อรับพลังงานบวกครับ พลังจากฐานดวงที่แข็งแกร่งจะช่วยนำพาคุณไปสู่ทางออกและโอกาสใหม่ๆ ที่กำลังจะเข้ามาในเร็วๆ นี้ครับ`
    }


    return NextResponse.json({
      success: true,
      message: responseText,
      source: 'wisdom-rule-engine'
    })
  } catch (error) {
    console.error('[/api/ai/coach] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
