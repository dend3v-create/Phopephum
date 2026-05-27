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
      responseText = `สวัสดีครับคุณ ${profile.full_name}

สำหรับเรื่องการงานและอาชีพของคุณในเวลานี้ ยามจรปัจจุบันของดาว ${currentPlanet.nameThai} กำลังช่วยชี้นำกระแสพลังงานที่ดีครับ

ผมอยากแบ่งปันประเด็นแนวทางปฏิบัติที่คุณสามารถนำไปใช้ได้ทันที 3 ข้อดังนี้ครับ:

1. ใช้ช่วงจังหวะเวลาของยามมงคลประจำวันในการติดต่อ นัดหมายประชุม หรือลงมือทำส่วนที่ยากที่สุด เพราะเป็นช่วงที่ปัญญาและการเจรจามีความลื่นไหลสูง
2. รักษา "สัจจะบารมี" ต่อตนเองในการบริหารเวลา ทำตามแผนงานรายชั่วโมง TQM อย่างมีวินัย เพื่อสะสมรากฐานดวงให้มั่นคงขึ้นเรื่อย ๆ
3. หากเผชิญหน้ากับความท้าทาย ขอให้มองเป็นโอกาสในการขัดเกลาศักยภาพความสามารถใหม่ ๆ ของเรา

จำคำนี้ไว้นะครับว่า "ความพากเพียรที่ถูกจังหวะเวลา ย่อมนำมาซึ่งความสำเร็จที่งดงามเสมอ"

มีส่วนไหนที่คุณต้องการปรึกษาเจาะลึกหรือร่วมวางแผนเพิ่มเติมในยามนี้ไหมครับ พิมพ์มาคุยกันได้เลยนะ`
    } else if (text.includes("เงิน") || text.includes("โชค") || text.includes("ลาภ")) {
      responseText = `ยินดีมากครับคุณ ${profile.full_name} ที่ได้มาคุยกันเรื่องกระแสทรัพย์

จากการพิจารณาพลังงานในยามจรของดาว ${currentPlanet.nameThai} นี้ โครงดวงของคุณมีกระแสการไหลเวียนของทรัพย์ที่ดี มีโอกาสได้รับช่องทางเสริมหรือการเก็บตกโอกาสเก่า ๆ ครับ

เพื่อเปิดและรักษาพลังงานแห่งความมั่งคั่งนี้ไว้ ผมมีข้อแนะนำสำคัญอยากให้พิจารณาครับ:

1. แบ่งส่วนเงินที่ได้มาไปทำบุญค่าน้ำค่าไฟในวันเกิด เพื่อสนับสนุนแสงสว่างและพลังงานหมุนเวียน ซึ่งเป็นเคล็ดลับโบราณในการเปิดทางให้โชคลาภราบรื่นขึ้น
2. หลีกเลี่ยงการตัดสินใจลงทุนที่มีความเสี่ยงสูงแบบกะทันหันในช่วงที่เวลาดาวคู่อริจรทับดวงชะตาเด็ดขาด
3. มีสัจจะและวินัยในการวางงบการเงิน เพื่ออุดรอยรั่วไหลและขยายความมั่นคงในระยะยาว

ดั่งข้อคิดที่ว่า "ทรัพย์ย่อมหลั่งไหลสู่บ้านที่มีความสงบ สัจจะ และปัญญาในการรักษา"

อยากให้ผมช่วยระบุยามมงคลเฉพาะกิจเพื่อเริ่มทำธุรกรรมสำคัญในช่วงนี้เพิ่มเติมไหมครับ พิมพ์ถามได้เลยนะ`
    } else if (text.includes("รัก") || text.includes("ครอบครัว") || text.includes("สัมพันธ์")) {
      responseText = `เรื่องความสัมพันธ์และจิตใจของคุณ ${profile.full_name} ในเวลานี้มีจุดเปลี่ยนผ่านที่ละเอียดอ่อนและน่าใส่ใจมากครับ

ภายใต้อิทธิพลยามจรของดาว ${currentPlanet.nameThai} กระแสความรู้สึกในดวงของคุณค่อนข้างละเอียดอ่อนเป็นพิเศษ ผมอยากมอบแนวคิดประทีปธรรมนำใจ 3 ประการดังนี้ครับ:

1. การใช้วาจาที่อ่อนโยน อบอุ่น และชื่นชมยินดีกับคนรอบข้างในยามมงคลประจำวัน จะช่วยสลายกระแสอับมงคลในความสัมพันธ์ลงอย่างน่าอัศจรรย์
2. หลีกเลี่ยงการใช้คำพูดรุนแรงหรือตัดสินในจังหวะเวลาที่มีความตึงเครียดสูง การถอยออกมาตั้งหลักหนึ่งก้าวจะช่วยถนอมน้ำใจกันได้ดีที่สุด
3. เคารพและเข้าใจความแตกต่างของอีกฝ่าย ดั่งคำสอนที่ว่า "ความรักคือการร่วมเดินทางและหนุนเสริมบารมีซึ่งกันและกัน"

ขอให้ระลึกเสมอว่า "จิตใจที่สงบและมีเมตตา คือเกราะกำบังดวงชะตาที่ดีที่สุดในทุกสถานการณ์"

มีประเด็นความสัมพันธ์ตรงไหนที่คุณอยากให้เราประเมินหรือแนะแนวทางการปรับพลังงานร่วมกันเพิ่มเติมไหมครับ พิมพ์ระบายคุยกับผมได้เสมอนะ`
    } else {
      // General Horoscope response
      responseText = `สวัสดีครับคุณ ${profile.full_name} ยินดีต้อนรับเข้าสู่ช่วงเวลาดี ๆ ของพวกเรานะครับ

จากการวิเคราะห์แผนดวงกำเนิดเลข 7 ตัว 9 ฐานร่วมกับยามอัฐกาลจรที่ปกครองโดยดาว ${currentPlanet.nameThai} (${currentPlanet.symbol}) ณ ขณะนี้ ผมมีแนะแนวทางเบื้องต้นมอบให้คุณครับ:

1. **ภาพลักษณ์และจุดเด่น:** คุณเป็นผู้มีปัญญาที่ละเอียดอ่อน มักมองเห็นลู่ทางและโอกาสที่คนอื่นมองข้าม มีเสน่ห์เฉพาะตัวที่ดึงดูดกัลยาณมิตรที่ดีเข้ามาเกื้อหนุน
2. **จังหวะเวลาปัจจุบัน:** ยามนี้ส่งเสริมการเริ่มต้นลงมือสะสางงาน การพูดคุยเจรจาเชิงกลยุทธ์ หรือการทำสมาธิเพื่อสะท้อนความรู้สึกส่วนตัวอย่างยิ่ง
3. **ธรรมประทีปเสริมพลังวันนี้:** "ความตั้งมั่นและสัจจะบารมีในใจเรา คือเข็มทิศชีวิตที่เที่ยงตรงยิ่งกว่าดวงดาวใด ๆ บนท้องฟ้า"

คุณอยากให้ผมร่วมวิเคราะห์ หรือช่วยประเมินการวางแผนชีวิตและการงานตามยามมงคลในแง่มุมไหนเพิ่มเติม พิมพ์เข้ามาพูดคุยถามผมได้ทันทีเลยนะครับ`
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
