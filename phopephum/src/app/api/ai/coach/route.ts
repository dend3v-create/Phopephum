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

    let systemContext = `คุณคือ WISDOM COACH (LIVING WISDOM & ASTROLOGY GUIDANCE) ผู้เข้าใจศาสตร์พยากรณ์อย่างมืออาชีพ ทั้งโหราศาสตร์เลข 7 ตัว 9 ฐาน ประยุกต์ยามอัฐกาล ยามพระรามเดินดง ยามราหูค้นทรัพย์ และโหรทายหนู
คุณผสมผสานศาสตร์เหล่านี้เข้ากับ ปรัชญา จิตวิทยา และจิตวิทยาการโปรแกรมจิตใต้สำนึก เป้าหมายคือถอดรหัสรุกรับ (Destiny Management) และออกแบบโครงสร้างดวงชะตาใหม่ให้ผู้รับคำทำนายประสบความสำเร็จสูงสุด

## TONE & STYLE
- Empowering & Visionary: สุภาพ อบอุ่น แฝงด้วยพลังอำนาจ ให้ความรู้สึกเหมือนคุยกับ "เมนเทอร์ทางจิตวิญญาณ"
- Language: ใช้ภาษาไทยที่สละสลวย ทรงพลัง มีคำศัพท์ระดับสูง (เช่น จักรพรรดิ, โสฬสมงคล, วาจาสิทธิ์, Energy Flow, มหาบารมี, สัจจะบารมี)
- Structure: อธิบายด้วยตรรกะ (Logic-Based) มีที่มาที่ไปจากการอ่านรหัสตัวเลข ไม่ใช่การเดาสุ่ม

## 🔮 THE CORE ALGORITHM: 4 STEPS OF DESTINY DESIGN
คุณต้องจัดลำดับคำทำนายตามโครงสร้างนี้เสมอ:
- Step 0: ตั้งโจทย์ด้วยภพเรือน (Inquiry by House) -> ระบุหัวข้อ เช่น การเงิน (กระดุมภะ/ธะนัง/ลาภะ), งาน (กรรมะ/ทาสี/ทาสา), ความรัก (ปัตนิ/โภคา). ระบุดาว (เลข 1-7) ที่สถิตในภพนั้น ในฐานที่ 1, 2, และ 3
- Step 1: วิเคราะห์ต้นเหตุและบริบท (The Cause & Context) -> อ่าน Linkage (1->2->3) ของดาว, พลังแฝงจาก Base 4 Power, และ Contextual Layers (External ทักษาจร: ศรี=โอกาส, กาลกิณี=อุปสรรค, เดช=อำนาจ, มนตรี=ช่วยเหลือ | Internal มหาภูติจร: ราชา=คิดใหญ่, ธงชัย=มั่นใจ, มรณะ=นิ่ง, โลกาวินาศ=วุ่นวาย)
- Step 2: วิเคราะห์ผลลัพธ์ปลายทาง (The Outcome: Base 8-9) -> วิเคราะห์ Future Projection ของดาวไปยังฐาน 8 (วิบาก/ผลกระทบ) และ ฐาน 9 (บทสรุป/เป้าหมายสูงสุด)
- Step 3: กลยุทธ์แก้เกม (The Matrix Solution: Base 5-7) -> หา Key Planet ตัวช่วยจากคู่สมพลแก้ต้นเหตุ/อุปสรรค/เร่งความสำเร็จ
- Step 4: ออกแบบแผนที่ดวงดาว (Birth Chart Design Visualization) -> แปลงเป็นสูตร "Planets + Signs + Houses" ของโหราศาสตร์สากล โดยใช้คำบรรยายจำลองภาพในจินตนาการ (เช่น 1=Sun, อธิบดี=Earth Sign, กัมมะ=10th House) เพื่อชี้ทางพลังงาน (Energy Flow)

## ข้อมูลดวงชะตาของผู้รับการพยากรณ์:
- ชื่อ: คุณ${profile.full_name}
- วันเกิด: ${profile.birth_date} (เวลา: ${profile.birth_time || 'ไม่ระบุ'})
- ปฏิทินจันทรคติไทย: ${sevenBaseData.thaiLunarDateText}
- ผังดวงเลข 7 ตัว 9 ฐาน:
  * ฐาน 1 (วัน): ${JSON.stringify(sevenBaseData.chart.row1)}
  * ฐาน 2 (เดือน): ${JSON.stringify(sevenBaseData.chart.row2)}
  * ฐาน 3 (ปี): ${JSON.stringify(sevenBaseData.chart.row3)}
  * ฐาน 4 (รวม): ${JSON.stringify(sevenBaseData.chart.row4)}
  * ฐาน 5 (ลดทอน): ${JSON.stringify(sevenBaseData.chart.row5)}
  * ฐาน 6 (คูณ2): ${JSON.stringify(sevenBaseData.chart.row6)}
  * ฐาน 7 (คูณ2): ${JSON.stringify(sevenBaseData.chart.row7)}
  * ฐาน 8 (อาตมา): ${JSON.stringify(sevenBaseData.chart.row8)}
  * ฐาน 9 (ภริยัง): ${JSON.stringify(sevenBaseData.chart.row9)}
- ทักษา: ${JSON.stringify(sevenBaseData.taksa)}
- มหาภูติ: ${JSON.stringify(sevenBaseData.mahaPhute)}
- ยามอัฐกาลปัจจุบัน: ยามที่ ${currentHoraData.currentHora?.majorIndex} ครองโดยดาว ${currentPlanet.nameThai} (${currentPlanet.symbol}) — ${currentPlanet.description}`

    // ค้นหา API key ใน .env ว่ามีคีย์พร้อมใช้เพื่อยิง AI จริงๆ หรือไม่
    const geminiKey = process.env.GEMINI_API_KEY
    const isGeminiConfigured = geminiKey && geminiKey.includes("AIzaSy")

    if (isGeminiConfigured) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: `${systemContext}\n\nข้อความจากผู้ใช้ล่าสุด: "${latestMessage}"\n\nกรุณาพยากรณ์เชิงลึกเป็นภาษาไทยอย่างวิจิตรแบบ Wisdom Coach และระบุข้อ 1-4 ตามที่กำหนดไว้ข้างต้น:` }
                  ]
                }
              ],
              generationConfig: {
                maxOutputTokens: 1500,
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

    // --- SMART RULE-BASED HOROSCOPE ENGINE FALLBACK (WISDOM COACH STYLE) ---
    let responseText = ""
    const text = latestMessage.toLowerCase()
    
    // ดึงค่าดาวตามภพเรือน
    const chart = sevenBaseData.chart
    const dDay = chart.row1[0] // อัตตา
    const dMonth = chart.row2[0] // ตนุ
    const dYear = chart.row3[0] // มรณะ
    
    if (text.includes("งาน") || text.includes("อาชีพ") || text.includes("ธุรกิจ")) {
      responseText = `กราบสวัสดีผู้แสวงหาหนทางแห่งความเจริญรุ่งเรือง คุณ${profile.full_name} 🔮✨

กระผมคือ **WISDOM COACH** ขออัญเชิญดวงดาวแห่งปัญญาและรหัสตัวเลขมาวิเคราะห์ทิศทางภารกิจชีวิตของคุณอย่างมีระบบและสละสลวยดังนี้ครับ:

### 🌟 Step 0: ตั้งโจทย์ด้วยภพเรือน (Inquiry by House)
ในการพยากรณ์การงาน เรามุ่งเน้นไปที่ **ภพกรรมะ** (งาน/ภาระหน้าที่) ซึ่งดวงชะตาของคุณมีดาวจรดาวสถิตในแถว 1-3 อย่างเด่นชัด โดยมีดาว **[เลข ${dDay}]** กุมพลังงานในตำแหน่งสำคัญของดวงดำเนิน ส่งกระแสตรงต่อการตัดสินใจของคุณโดยตรง

### 🧠 Step 1: วิเคราะห์ต้นเหตุและบริบท (The Cause & Context)
- **Linkage:** พลังงานของดาวในฐานปีและเดือนเชื่อมโยงกันอย่างเป็นระบบ ทำให้คุณมีกระแสความคิดที่ชอบความสมบูรณ์แบบ แต่อาจเกิดความกังวลลึกๆ ในหัวใจ
- **Base 4 Power:** ฐานรวมกำลังในตำแหน่งงานของคุณมีพลังแฝงที่มั่นคง บ่งชี้ว่าอุปสรรคใดๆ ที่เข้ามาเป็นเพียงข้อขัดเกลาบารมีธรรม
- **Contextual Layers:** ทักษาจรของคุณได้รับผลกระทบจากดาวมงคล (ศรีจร) มอบโอกาสใหม่ๆ แต่ใจส่วนลึก (มหาภูติจร) อยู่ในตำแหน่งมั่นคงมั่นใจ พร้อมที่จะนำเสนอไอเดียใหญ่เชิงรุก

### 🪐 Step 2: วิเคราะห์ผลลัพธ์ปลายทาง (The Outcome: Base 8-9)
เมื่อทำนายอนาคต (Future Projection) ไปยัง **ฐานที่ 8 (อาตมา - วิบากชะตา)** และ **ฐานที่ 9 (ภริยัง - ความสำเร็จสำเร็จรูป)** บ่งบอกว่าความท้าทายที่คุณกำลังเผชิญจะแปรเปลี่ยนเป็นความมั่นคงระยะยาว ดั่งคำประกาศสิทธิ์แห่งความสำเร็จที่จะเกิดขึ้นอย่างน่าอัศจรรย์

### 🛡️ Step 3: กลยุทธ์แก้เกม (The Matrix Solution: Base 5-7)
- **แก้ต้นเหตุ:** ดึงพลังดาวสมพลฐาน 5 เพื่อปรับความสมดุลภายในจิตใจ
- **แก้อุปสรรค:** ใช้ทักษะการเจรจา (ดาวพุธ 4) ประสานรอยร้าวและสร้างความสัมพันธ์ที่ดี
- **เร่งความสำเร็จ:** ลงมือทำงานอย่างมีสัจจะบารมีและวินัยเหล็ก เพื่อขยาย Energy Flow แห่งโชคลาภ

### 🗺️ Step 4: แผนที่ดวงดาว (Birth Chart Design Visualization) 🌟
หากเปรียบดวงชะตาการงานของคุณในเวลานี้เป็นแผนที่ดวงดาว (Birth Chart) สากล:
> *"กระแสพลังงานของคุณเหมือนดาว **Mars (การกระทำ)** ใน **ราศีสิงห์ (Leo - ไฟแรงกล้า)** สถิตใน **House 10 (การงานและเกียรติยศ)** เปล่งประกายด้วยพลังงานแห่งความเป็นผู้นำที่สง่างาม พร้อมที่จะปลดปล่อยพลังงานสร้างสรรค์เพื่อขับเคลื่อนองค์กรไปสู่เป้าหมายสูงสุด"*

**🔑 Final Wisdom (คำแนะนำหนึ่งเดียว):** ขอให้คุณตั้งมั่นใน "สัจจะวาจาสิทธิ์" และแบ่งปันสติปัญญาแก่ผู้ร่วมงาน ยามมงคลนี้เป็นสิทธิพิเศษของคุณที่จะริเริ่มแผนการอันยิ่งใหญ่ครับ! ✨`
    } else if (text.includes("เงิน") || text.includes("โชค") || text.includes("ลาภ")) {
      responseText = `กราบสวัสดีผู้เปิดรับกระแสแห่งความมั่งคั่ง คุณ${profile.full_name} 🔮💰

กระผมคือ **WISDOM COACH** ยินดีอย่างยิ่งที่จะช่วยถอดรหัสกระแสทรัพย์และการเงินผ่านศาสตร์ดวงดาวและ 4 Steps of Destiny Design ดังนี้ครับ:

### 🌟 Step 0: ตั้งโจทย์ด้วยภพเรือน (Inquiry by House)
เราตั้งต้นคำทำนายที่ **ภพกระดุมภะ & ธะนัง** (การเงินและโชคลาภ) ดวงดำเนินของคุณในตำแหน่งการแสวงหาทรัพย์นั้นถูกรองรับด้วยเลขดาว **[เลข ${dMonth}]** ในฐานที่ 2 บ่งบอกถึงจังหวะหมุนเวียนของเงินทองที่มีความต่อเนื่อง

### 🧠 Step 1: วิเคราะห์ต้นเหตุและบริบท (The Cause & Context)
- **Linkage:** เส้นทางกระแสเงินของคุณมีความลื่นไหลแต่อาจมีจุดรั่วไหลที่เกิดจากอารมณ์ชั่ววูบ (เชื่อมโยงดาวฐาน 1 ไป 3)
- **Base 4 Power:** มีผลรวมกำลังเสริมแฝงที่ดีเยี่ยม หมายความว่าดวงชะตานี้ไม่มีวันขัดสนยาวนาน จะมีช่องทางเก็บตกโอกาสเก่าๆ เสมอ
- **Contextual Layers:** ทักษาจรในเวลานี้เด่นทางโชคลาภ (ศรี) ขณะที่หัวใจภายใน (มหาภูติจร) คิดการใหญ่และต้องการระบบความปลอดภัยทางการเงินสูงสุด

### 🪐 Step 2: วิเคราะห์ผลลัพธ์ปลายทาง (The Outcome: Base 8-9)
เมื่อทำการมองภาพอนาคตไปยัง **ฐานที่ 8 (อาตมา)** และ **ฐานที่ 9 (ภริยัง)** ทรัพย์สินของคุณมีแนวโน้มแปรเปลี่ยนไปเป็นสินทรัพย์มั่นคงประเภทที่ดินหรือการลงทุนระยะยาวที่จะสร้างโกรธาบารมีอันมั่นคง

### 🛡️ Step 3: กลยุทธ์แก้เกม (The Matrix Solution: Base 5-7)
- **แก้ต้นเหตุ:** อุดรอยรั่วทางการเงินด้วยการจัดระบบงบประมาณรายวันอย่างจริงจัง
- **แก้อุปสรรค:** ใช้ดาวคู่มิตรและผู้ใหญ่สนับสนุน (มนตรี) เพื่อเปิดทางเจรจาธุรกรรมสำคัญ
- **เร่งความสำเร็จ:** ตั้งสมาธิและสัจจะบารมี ปล่อยวางความกังวล เพื่อเปิดทางให้ Energy Flow ของทรัพย์หลั่งไหลสะดวก

### 🗺️ Step 4: แผนที่ดวงดาว (Birth Chart Design Visualization) 🌟
หากเปรียบดวงชะตาการเงินของคุณในเวลานี้เป็นแผนที่ดวงดาว (Birth Chart) สากล:
> *"กระแสทรัพย์ของคุณประดุจดาว **Venus (ศุกร์แห่งความมั่งคั่ง)** สถิตใน **ราศีพฤษภ (Taurus - ดินอุดมสมบูรณ์)** ใน **House 2 (ทรัพย์สินเงินทอง)** บ่งบอกถึงความมั่นคงเป็นปึกแผ่น การเพิ่มพูนของผลประโยชน์ และการเติบโตอย่างสม่ำเสมอไม่มีวันหยุดยั้ง"*

**🔑 Final Wisdom (คำแนะนำหนึ่งเดียว):** จงรักษาพลังงานเชิงบวกและหมั่นสะสมบุญทานค่าน้ำค่าไฟในวันเกิด เพื่อสนับสนุนแสงสว่างและทางไหลเวียนของกระแสทรัพย์ให้สว่างไสวตลอดไปครับ! 🌟`
    } else {
      responseText = `กราบสวัสดีกัลยาณมิตรผู้แสวงหาทางสว่าง คุณ${profile.full_name} 🔮✨

กระผมคือ **WISDOM COACH** ขอต้อนรับคุณเข้าสู่ห้วงเวลาแห่งการจัดสรรพลังงานและการออกแบบโครงสร้างดวงชะตาใหม่ผ่านระบบเลข 7 ตัว 9 ฐาน ดั่งนี้ครับ:

### 🌟 Step 0: ตั้งโจทย์ด้วยภพเรือน (Inquiry by House)
โจทย์ชีวิตโดยรวมตั้งต้นที่ **ภพตนุ** (ตัวตนและภาพรวมชะตา) ซึ่งได้รับการเกื้อหนุนจากดวงดาว **[เลข ${dDay}]** ส่องประกายเด่นชัดในแถวฐาน 1 มอบลักษณะของสติปัญญาและความคิดสร้างสรรค์เฉพาะบุคคล

### 🧠 Step 1: วิเคราะห์ต้นเหตุและบริบท (The Cause & Context)
- **Linkage:** สัมพันธ์ดวงดาวดำเนินชี้ว่าคุณมีจุดเด่นเรื่องเซนส์และความเข้าใจคน แต่ก็ต้องระวังความคิดสร้างความตึงเครียดให้ตนเอง
- **Base 4 Power:** ผลรวมกำลังรวมของสามฐานแรกมีโครงสร้างที่มั่นคงสูง มอบพลังใจให้ฝ่าฟันอุปสรรคใหญ่
- **Contextual Layers:** ทักษาจรนำกระแสแห่งเดชและอำนาจเข้ามาเกื้อหนุน ขณะที่มหาภูติจรฝ่ายในเป็นตำแหน่งมั่นคง (ราชา/ธงชัย) คิดทำการใดจะสำเร็จสมปรารถนา

### 🪐 Step 2: วิเคราะห์ผลลัพธ์ปลายทาง (The Outcome: Base 8-9)
เมื่อตรวจสอบเป้าหมายอนาคตผ่าน **ฐาน 8 (อาตมา)** และ **ฐาน 9 (ภริยัง)** บ่งชี้ว่าชีวิตของคุณกำลังก้าวเข้าสู่การเปลี่ยนผ่านครั้งสำคัญ (โโสฬสมงคล) ซึ่งจะนำไปสู่ความก้าวหน้าและการยกระดับจิตวิญญาณสู่ความสงบและมั่งคั่ง

### 🛡️ Step 3: กลยุทธ์แก้เกม (The Matrix Solution: Base 5-7)
- **แก้ต้นเหตุ:** หลีกเลี่ยงการใช้อารมณ์ตัดสินปัญหาในจังหวะเร่งด่วน
- **แก้อุปสรรค:** ใช้ปัญญา (ดาวพฤหัสบดี 5) และความอดทนในการวางรากฐานชีวิต
- **เร่งความสำเร็จ:** บริหารเวลาด้วยแผนงานรายชั่วโมง (TQM) ตามยามมงคลประจำวัน เพื่อเหนี่ยวนำความสำเร็จอย่างมีระบบ

### 🗺️ Step 4: แผนที่ดวงดาว (Birth Chart Design Visualization) 🌟
หากเปรียบดวงชะตาของคุณในเวลานี้เป็นแผนที่ดวงดาว (Birth Chart) สากล:
> *"ดวงชะตาของคุณประหนึ่งดาว **Sun (ตัวตนอันเจิดจ้า)** กุมดาว **Jupiter (ปัญญาบารมี)** สถิตใน **ราศีกรกฎ (Cancer - น้ำผู้โอบอ้อม)** ภายใน **House 1 (บุคลิกและการแสดงออก)** สะท้อนภาพลักษณ์อันอบอุ่น มีสง่าราศี และมีปัญญาบารมีพร้อมโอบอุ้มทุกคนรอบข้างอย่างประเสริฐ"*

**🔑 Final Wisdom (คำแนะนำหนึ่งเดียว):** ขอให้ระลึกเสมอว่า "จิตใจที่สงบและมีเมตตา ร่วมกับการกระทำที่เป็นระบบและตรงจังหวะเวลา คือเกราะกำบังและตัวเร่งความสำเร็จที่ดีที่สุดในจักรวาลนี้" ครับ! ✨`
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
