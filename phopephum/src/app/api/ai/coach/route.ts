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
    const { messages } = body // [{ role: 'user', content: '...' }]
    
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    const latestMessage = messages[messages.length - 1].content.trim()

    // 1. คำนวณเลข 7 ตัว 9 ฐาน กำเนิดของผู้ใช้
    const sevenBaseData = calculateSevenBase(profile.birth_date, profile.birth_time || "12:00")
    
    // 2. คำนวณยามอัฐกาลปัจจุบันที่กำลังรันอยู่ ณ ขณะนี้
    const currentHoraData = getCurrentHora()
    const currentPlanet = currentHoraData.currentHora?.subSlot.planet || PLANETS.jupiter

    // 3. ดึง RAG Knowledge Base จาก Supabase เพื่อใช้ในการพยากรณ์
    const { data: knowledgeItems } = await supabase
      .from('knowledge_base')
      .select('title, content, category')
      .limit(3)

    let systemContext = `คุณคือ WISDOM COACH (LIVING WISDOM & ASTROLOGY GUIDANCE) ผู้เชี่ยวชาญศาสตร์พยากรณ์เลข 7 ตัว 9 ฐาน และยามอัฐกาล
ทำหน้าที่ให้คำแนะนำเชิงกลยุทธ์ (Destiny Management) ด้วยภาษาสุภาพ น่าเชื่อถือ และมั่นใจ
เน้นการตอบที่กระชับ ตรงประเด็น (ความยาว 1-5 ประโยค) โดยอ้างอิงข้อมูลจากฐานข้อมูลระบบเป็นหลัก

## TONE & STYLE
- สุภาพ นิ่ง และมีความเป็นมืออาชีพสูง (Professional & Credible)
- ไม่ใช้อีโมจิหรือสัญลักษณ์ที่ไม่จำเป็น
- ใช้ข้อมูลจากผังดวงและยามอัฐกาลประกอบการวิเคราะห์เสมอ

## โครงสร้างการตอบ (วิเคราะห์ตามขั้นตอนแต่สรุปให้กระชับ):
1. วิเคราะห์ภพเรือนและดาวที่เกี่ยวข้อง
2. วิเคราะห์ต้นเหตุและบริบท (Linkage/Base 4/ทักษาจร)
3. สรุปผลลัพธ์ปลายทาง (Base 8-9)
4. เสนอกลยุทธ์แก้เกมหรือแผนการดำเนินงาน

ข้อมูลดวงชะตา:
- ชื่อ: คุณ${profile.full_name}
- ปฏิทินจันทรคติ: ${sevenBaseData.thaiLunarDateText}
- ผังดวง: ${JSON.stringify(sevenBaseData.chart)}
- ทักษา: ${JSON.stringify(sevenBaseData.taksa)}
- มหาภูติ: ${JSON.stringify(sevenBaseData.mahaPhute)}
- ยามปัจจุบัน: ${currentPlanet.nameThai} (${currentPlanet.description})`

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
                    { text: `${systemContext}\n\nข้อความจากผู้ใช้ล่าสุด: "${latestMessage}"\n\nกรุณาพยากรณ์เชิงลึกเป็นภาษาไทยอย่างสุภาพและกระชับ (1-5 ประโยค) ตามข้อมูลดวงชะตาข้างต้น:` }
                  ]
                }
              ],
              generationConfig: {
                maxOutputTokens: 800,
                temperature: 0.5
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

    // --- SMART RULE-BASED HOROSCOPE ENGINE FALLBACK (NEW CONCISE STYLE) ---
    let responseText = ""
    const text = latestMessage.toLowerCase()
    
    // ดึงค่าดาวตามภพเรือน
    const chart = sevenBaseData.chart
    const dDay = chart.row1[0] // อัตตา
    const dMonth = chart.row2[0] // ตนุ
    
    if (text.includes("งาน") || text.includes("อาชีพ") || text.includes("ธุรกิจ")) {
      responseText = `กราบสวัสดีครับ สำหรับดวงชะตาด้านการงานของคุณนั้นมีดาวเลข ${dDay} กุมพลังในตำแหน่งสำคัญ บ่งบอกถึงศักยภาพในการเป็นผู้นำและมีความคิดสร้างสรรค์ที่โดดเด่นครับ ในช่วงนี้ทักษาจรส่งเสริมโอกาสใหม่ๆ จากผู้ใหญ่ แต่ควรระวังความกังวลภายในใจที่อาจส่งผลต่อการตัดสินใจครับ ผมแนะนำให้คุณใช้ปัญญาและความอดทนในการวางรากฐาน และคว้าโอกาสที่เข้ามาในยามมงคลนี้เพื่อสร้างความสำเร็จที่ยั่งยืนครับ`
    } else if (text.includes("เงิน") || text.includes("โชค") || text.includes("ลาภ")) {
      responseText = `กราบสวัสดีครับ วิเคราะห์กระแสทรัพย์ของคุณพบดาวเลข ${dMonth} ในภพธะนัง ส่งผลให้การเงินมีความลื่นไหลและมีจังหวะหมุนเวียนที่ดีอย่างต่อเนื่องครับ อย่างไรก็ตามควรระมัดระวังจุดรั่วไหลจากอารมณ์ชั่ววูบและเน้นการจัดระบบงบประมาณรายวันอย่างเคร่งครัดครับ ในช่วงนี้การขอคำปรึกษาจากผู้ใหญ่หรือผู้ที่มีอำนาจจะช่วยเปิดทางธุรกรรมสำคัญให้ราบรื่นและมั่นคงยิ่งขึ้นครับ`
    } else {
      responseText = `กราบสวัสดีครับ จากการตรวจสอบผังดวงชะตาโดยรวม พบว่าตัวตนของคุณได้รับการเกื้อหนุนจากดาวเลข ${dDay} มอบสติปัญญาและไหวพริบในการแก้ปัญหาได้เป็นอย่างดีครับ แม้จะมีอุปสรรคเข้ามาบ้างแต่พลังจากฐานรวมที่มั่นคงจะช่วยให้คุณผ่านพ้นไปได้และก้าวไปสู่จุดเปลี่ยนที่สำคัญของชีวิตครับ ผมแนะนำให้คุณบริหารจัดการเวลาตามยามมงคลประจำวันและรักษาสมาธิเพื่อเหนี่ยวนำพลังงานบวกเข้าสู่ตนเองครับ`
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
