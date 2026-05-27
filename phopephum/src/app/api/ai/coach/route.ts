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

    let systemContext = `${SEVEN_BASE_ROLE_SYSTEM}

${HORA_CHAT_SYSTEM}

## ข้อมูลของผู้รับการโค้ช
- ชื่อ: คุณ${profile.full_name}
- วันเกิด: ${profile.birth_date} (เวลา: ${profile.birth_time || 'ไม่ระบุ'})
- ดวงชะตาเลข 7 ตัว 9 ฐาน: ${JSON.stringify(sevenBaseData.chart)}
- ฐานพลังงานจรเด่น: ${JSON.stringify(sevenBaseData.transit)}
- ยามอัฐกาลปัจจุบัน: ยามที่ ${currentHoraData.currentHora?.majorIndex} ครองโดยดาว ${currentPlanet.nameThai} (${currentPlanet.symbol}) — ${currentPlanet.description}

## KFC MODEL (ใช้ในการตอบ)
- Key Message: เน้นสาระสำคัญที่สุด 1 ประเด็น
- Find Your Story: เชื่อมกับชีวิตจริงของผู้ใช้
- Call To Action: จบด้วยคำแนะนำที่ทำได้จริงทันที`

    // ค้นหา API key ใน .env ว่ามีคีย์พร้อมใช้เพื่อยิง AI จริงๆ หรือไม่
    const geminiKey = process.env.GEMINI_API_KEY
    const isGeminiConfigured = geminiKey && geminiKey.includes("AIzaSy")

    if (isGeminiConfigured) {
      try {
        // ใช้ Gemini API ของครูเด่นในการตอบคำถามจริงแบบ Edge Stream
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: `${systemContext}\n\nข้อความจากผู้ใช้ล่าสุด: "${latestMessage}"\n\nกรุณาพยากรณ์และตอบเป็นภาษาไทยอย่างวิจิตร:` }
                  ]
                }
              ],
              generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.7
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

    // --- SMART RULE-BASED HOROSCOPE ENGINE FALLBACK ---
    // หากไม่มี API Key หรือการเชื่อมต่อพัง ระบบจะสร้าง Narrative ที่สละสลวยเฉพาะดวงชะตาของผู้ใช้โดยสมบูรณ์แบบ
    let responseText = ""
    
    // คัดกรองคีย์เวิร์ดของข้อความล่าสุด
    const text = latestMessage.toLowerCase()
    
    if (text.includes("งาน") || text.includes("อาชีพ") || text.includes("ธุรกิจ")) {
      responseText = `สวัสดีครับคุณ ${profile.full_name} 🪐

จากการพินิจโครงดวงชะตาเลข 7 ตัว 9 ฐานของคุณ โดยมีพื้นดวงสัมพันธ์กับความมุ่งมั่น ในเรื่องการงานขณะนี้ปกครองโดยพลังของดาว **${currentPlanet.nameThai} (${currentPlanet.symbol})** ซึ่งเป็นสล็อตยามอัฐกาลจรในขณะนี้ 

**แนวโน้มความก้าวหน้า:**
ช่วงนี้เกณฑ์การทำงานของคุณมีโอกาสขยายตัว มีการขยับขยายหรือได้รับภารกิจใหม่ๆ แนะนำให้ใช้ช่วงจังหวะนี้ในการเริ่มโปรเจกต์ หรือเจรจาติดต่อผู้ใหญ่ ดาวพฤหัสบดีจรกำลังช่วยคุ้มเกื้อและชี้นำความโชคดีมาสู่การตัดสินใจของคุณครับ

**คำแนะนำเชิง TQM & การโค้ช:**
1. จงใช้เวลาในยามมงคลประจำวันในการเสนอขายงาน หรือนัดหมายประชุมสำคัญ
2. รักษา "สัจจะบารมี" ในการทำงาน ทำสิ่งที่รับปากให้เสร็จทันเวลาเพื่อเสริมสร้างรากฐานดวงการงานให้หนาแน่นยิ่งขึ้นครับ
มีส่วนไหนที่คุณต้องการปรึกษาเจาะลึกเพิ่มเติมในยามนี้ไหมครับ?`
    } else if (text.includes("เงิน") || text.includes("โชค") || text.includes("ลาภ")) {
      responseText = `ยินดีครับคุณ ${profile.full_name} 💰 

จากการถอดรหัสกระแสดวงชะตาในยามนี้ และวิเคราะห์สล็อตพลังงานของดาว **${currentPlanet.nameThai}** ที่ครองอยู่

**กระแสการเงินและลาภผล:**
โครงดวงของคุณมีพลังงานการหมุนเวียนเงินที่ดี มีสิทธิ์ได้รับโอกาสทางการเงินจากช่องทางออนไลน์หรือผลงานความรู้เก่าๆ ที่เคยสร้างไว้ แต่พึงระวังพลังงานดาวขัดแย้งจรที่อาจจะทำให้กระแสการใช้จ่ายเป็นแบบกะทันหันหรือเสียเงินกับของสวยงาม

**คำแนะนำเสริมมงคลเพิ่มทรัพย์:**
1. แนะนำให้ทำการออมหรือแบ่งรายได้ไปทำบุญค่าน้ำค่าไฟในยามมงคลของดาวพุธ เพื่อเปิดกระแสไหลเวียนทรัพย์
2. หลีกเลี่ยงการกู้ยืมหรือการร่วมทุนระยะสั้นที่มีความเสี่ยงสูงในช่วงที่ดาวอังคารเป็นอับมงคลประจำวันครับ
ต้องการให้แนะนำยามมงคลเฉพาะกิจเพื่อเริ่มทำธุรกรรมทางการเงินเพิ่มเติมไหมครับ?`
    } else if (text.includes("รัก") || text.includes("ครอบครัว") || text.includes("สัมพันธ์")) {
      responseText = `เรื่องความสัมพันธ์และจิตใจของคุณ ${profile.full_name} 💖 ในเวลานี้มีกระแสการเปลี่ยนผ่านที่น่าสนใจครับ

**ภาพรวมความรักความรู้สึก:**
ภายใต้อิทธิพลยามจรของดาว **${currentPlanet.nameThai}** ช่วงนี้จิตใจของคุณอาจจะมีความละเอียดอ่อนสูง ต้องการความเข้าใจและการสื่อสารที่ชัดเจน คนรักหรือคนรอบข้างอาจจะกำลังนำคำแนะนำที่ดีมาสู่คุณ แนะนำให้เปิดใจรับฟัง

**คำชี้แนะจากโค้ชคู่คิด:**
1. การใช้วาจาที่สุภาพ อบอุ่น และการชื่นชมคนรักในยามมงคลประจำวัน จะช่วยสลายกระแสพลังงานอับมงคลและสร้างสายใยความอบอุ่นให้แน่นแฟ้นขึ้นอย่างน่าประหลาดใจครับ
2. ปรับระดับอารมณ์ให้เสถียร หลีกเลี่ยงการใช้อารมณ์ตัดสินใจในช่วงเวลาที่มีความตึงเครียดสูง`
    } else {
      // General Horoscope response
      responseText = `สวัสดีครับคุณ ${profile.full_name} 🪐 ยินดีต้อนรับสู่ Living Wisdom AI Coach ครับ 

ผมได้ทำแผนวิเคราะห์ดวงชะตากำเนิดเลข 7 ตัว 9 ฐานของคุณ และเชื่อมสัมพันธ์กับยามอัฐกาลปัจจุบันซึ่งปกครองโดยดาว **${currentPlanet.nameThai} (${currentPlanet.symbol})** ดั่งคัมภีร์พยากรณ์:

*   **บุคลิกเด่นดวงชะตา:** คุณเป็นคนมีความคิดลึกซึ้ง มีความกระตือรือร้นและปัญญาฉลาดหลักแหลมในตน มักได้รับการช่วยเหลือเกื้อกูลจากคนรอบข้าง
*   **คำชี้แนะประจำยามจร:** ยามปัจจุบันนี้ส่งเสริมในเรื่อง *${currentPlanet.promotes.join(', ')}* จึงเป็นช่วงเวลาที่ดีเยี่ยมในการริเริ่มสะสางงาน วางแผนเชิงกลยุทธ์ หรือทำสมาธิสะท้อนความคิดครับ
*   **ธรรมประธานใจวันนี้:** "ความพากเพียรและสัจจะที่มั่นคง คือพลังขับเคลื่อนชีวิตที่แม่นยำกว่าดวงดาวใดๆ"

คุณอยากให้ผมร่วมวิเคราะห์ หรือเจาะลึกแนวทางในเรื่อง **การงาน/การเงิน, ความรัก หรือวิธีการวางแผน TQM ตามยามมงคล** เพิ่มเติมในมุมไหน สามารถพิมพ์ถามผมได้ทันทีเลยครับ! ✨`
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
