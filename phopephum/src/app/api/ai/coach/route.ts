import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { horoscopeEngine } from '@/lib/astrology/engine/horoscopeEngine'
import { getCurrentHora, PLANETS } from '@/engine/phopephum-calculator'
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

    systemContext += `\n\n## ข้อมูลเวลาปัจจุบัน (สำหรับวางแผนเชิงกาลเวลา):
- วันที่: ${todayDate}
- วันนี้คือ: วัน${todayDayName} ${periodLabel}
- เวลาปัจจุบัน: ${currentTimeStr}
- 7 วันของสัปดาห์นี้: ${weekDays.map(w => `${w.label} (วัน${w.dayName} ${w.date})`).join(' | ')}

**กฎ:** เมื่อผู้ใช้ถามเรื่อง วัน/เวลา/สัปดาห์ ให้ใช้ข้อมูลเวลาด้านบนนี้ระบุอย่างชัดเจน เช่น "วัน${todayDayName}นี้" หรือ "วันหน้า (${weekDays[1]?.date})" เพื่อให้ผู้ใช้นำไปบันทึกใน Planner ได้ทันที`

    // ค้นหา API key ใน .env
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
        console.error('[/api/ai/coach] Gemini API error:', err)
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
