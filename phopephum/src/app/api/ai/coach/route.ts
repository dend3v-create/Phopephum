import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { horoscopeEngine } from '@/lib/astrology/engine/horoscopeEngine'
import { getCurrentHora, PLANETS, calculateHora } from '@/engine/phopephum-calculator'
import { HORA_CHAT_SYSTEM } from '@/constants/ai-prompts'

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
    const { messages, context } = body 
    
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    const latestMessage = messages[messages.length - 1].content.trim()

    // 1. คำนวณดวงชะตาด้วย Engine ตัวเต็ม (v3)
    const hResult = await horoscopeEngine({
      birthDate: profile.birth_date,
      birthTime: profile.birth_time || "12:00",
      name: profile.full_name
    })
    
    // 2. คำนวณยามอัฐกาลปัจจุบันที่กำลังรันอยู่ ณ ขณะนี้
    // แปลงเวลาให้เป็นเวลาไทย (UTC+7) เพื่อป้องกันปัญหายามไม่ตรงกันบนเซิร์ฟเวอร์
    const bkkTimeString = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
    const now = new Date(bkkTimeString)
    
    const currentHoraData = getCurrentHora(now)
    const currentPlanet = currentHoraData.currentHora?.subSlot.planet || PLANETS.jupiter
    const currentMajorYam = currentHoraData.currentHora
    
    // 2b. ข้อมูลวัน/เวลาปัจจุบัน สำหรับ context เชิงกาลเวลา
    const thaiDayNames = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']
    const thaiMonthNames = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
    const todayDayName = thaiDayNames[now.getDay()]
    const todayDate = `${now.getDate()} ${thaiMonthNames[now.getMonth()]} ${now.getFullYear() + 543}`
    const currentTimeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} น.`
    const periodLabel = now.getHours() >= 6 && now.getHours() < 18 ? 'กลางวัน' : 'กลางคืน'
    
    // สร้าง 7 วัน ข้างหน้า พร้อมชื่อวัน และตารางยามอัฐกาล
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(now.getDate() + i)
      const dayName = thaiDayNames[d.getDay()]
      const isToday = i === 0
      const isTomorrow = i === 1
      const label = isToday ? 'วันนี้' : isTomorrow ? 'พรุ่งนี้' : `อีก ${i} วัน`
      const dateStr = `${d.getDate()}/${d.getMonth()+1}`
      return { dateObj: d, dayName, date: dateStr, label }
    })

    // 3. เตรียม System Context
    let systemContext = HORA_CHAT_SYSTEM

    if (context) {
      systemContext += `\n\nหัวข้อที่เน้น: ${context}`
    }

    // สร้าง Data Snapshot สำหรับ AI
    const dataSnapshot = {
      user: profile.full_name,
      lunarDate: hResult.lunar?.thaiLunarDateText || hResult.data.dayName,
      chart: {
        base1_3: hResult.sevenBase,
        base4_9: hResult.nineBase,
        emperor: hResult.emperorChart
      },
      rules: hResult.rules.map((r: any) => r.insight),
      taksa: hResult.data.taksa,
      currentYam: {
        name: currentPlanet.nameThai,
        description: currentPlanet.description,
        yamNumber: currentMajorYam?.majorIndex !== undefined ? currentMajorYam.majorIndex + 1 : '-',
        timeRange: currentMajorYam?.subSlot ? `${currentMajorYam.subSlot.startTime}–${currentMajorYam.subSlot.endTime}` : '-'
      }
    }

    systemContext += `\n\nข้อมูลดวงชะตาปัจจุบัน:\n${JSON.stringify(dataSnapshot, null, 2)}`

    // สร้างข้อมูลตารางยาม 7 วัน เพื่อให้ AI ใช้วิเคราะห์ได้แม่นยำ
    const scheduleContext = weekDays.map(w => {
      const hRes = calculateHora({ date: w.dateObj })
      const dayYams = hRes.majorSlots.filter(m => m.period === 'day').map(m => `${m.startTime}-${m.endTime}=ยาม${m.starName}`).join(', ')
      return `- ${w.label} (วัน${w.dayName} ${w.date}): ${dayYams}`
    }).join('\n')

    systemContext += `\n\n## ข้อมูลเวลาปัจจุบันและตารางยาม 7 วัน (สำหรับวางแผนเชิงกาลเวลา):
- วันที่: ${todayDate}
- วันนี้คือ: วัน${todayDayName} ${periodLabel}
- เวลาปัจจุบัน: ${currentTimeStr}
- ตารางยามกลางวัน (06:00-18:00) 7 วันข้างหน้า:
${scheduleContext}

**กฎสำคัญ:** 
1. เมื่อผู้ใช้ถามเรื่อง วัน/เวลา/สัปดาห์ หรือขอฤกษ์มงคล ให้ใช้ข้อมูลตารางยามด้านบนในการคำนวณและตอบ 
2. แนะนำ "ยามมงคล" (เช่น ยามที่มีดาวศุภเคราะห์: ครู/ชีโว(พฤหัส), ศุกระ/ศุโกร(ศุกร์), พุทธะ/พุทโธ(พุธ)) ให้ตรงกับเรื่องที่ถาม เช่น ความรักใช้ศุกร์, การงาน/ผู้ใหญ่ใช้พฤหัส 
3. ตอบอย่างเป็นธรรมชาติและอ้างอิงยามให้ถูกต้องตามข้อมูลที่ให้ไป ห้ามแต่งยามขึ้นเอง`

    // ค้นหา API key ใน .env
    const geminiKey = process.env.GEMINI_API_KEY
    const isGeminiConfigured = geminiKey && geminiKey.includes("AIzaSy")

    if (isGeminiConfigured) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: `${systemContext}\n\nข้อความจากผู้ใช้ล่าสุด: "${latestMessage}"` }
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

        const resData = await geminiRes.json()
        
        if (geminiRes.ok) {
          const aiResponse = resData.candidates?.[0]?.content?.parts?.[0]?.text

          if (aiResponse) {
            return NextResponse.json({
              success: true,
              message: aiResponse,
              source: 'gemini-ai'
            })
          }
        } else {
          console.error('[/api/ai/coach] Gemini API failed with status:', geminiRes.status, resData)
        }
      } catch (err) {
        console.error('[/api/ai/coach] Gemini API request error:', err)
      }
    }

    // --- FALLBACK ---
    const pName = currentPlanet.nameThai
    const text = latestMessage.toLowerCase()
    let responseText = ""
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
      source: 'wisdom-fallback'
    })
  } catch (error) {
    console.error('[/api/ai/coach] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
