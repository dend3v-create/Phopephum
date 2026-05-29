import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { horoscopeEngine } from '@/lib/astrology/engine/horoscopeEngine'
import { GENERAL_PREDICTION_SYSTEM } from '@/constants/ai-prompts'

export const runtime = 'edge'

// 1. POST /api/ai/coach — ระบบวิเคราะห์และพยากรณ์พื้นดวงทั่วไป (General Prediction)
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

    // 1. คำนวณดวงชะตาด้วย Engine ตัวเต็ม (v3)
    const hResult = await horoscopeEngine({
      birthDate: profile.birth_date,
      birthTime: profile.birth_time || "12:00",
      name: profile.full_name
    })
    
    // 2. เตรียม System Context สำหรับการพยากรณ์ทั่วไป (General Prediction)
    let systemContext = GENERAL_PREDICTION_SYSTEM

    // สร้าง Data Snapshot สำหรับ AI (ข้อมูลดวงชะตา)
    const dataSnapshot = {
      user: profile.full_name,
      lunarDate: hResult.lunar?.thaiLunarDateText || hResult.data.dayName,
      chart: {
        matrix: hResult.matrix,
        emperor: hResult.emperorChart
      },
      rules: hResult.rules.map((r: any) => r.insight),
      taksa: hResult.data.taksa,
      vayaChorn: hResult.data.vayaChorn,
      transit: hResult.data.transit,
    }

    systemContext += `\n\nข้อมูลดวงชะตาพื้นฐานของคุณ:\n${JSON.stringify(dataSnapshot, null, 2)}`
    
    systemContext += `\n\n**ข้อควรจำ:**\nกรุณาส่งมอบคำพยากรณ์ให้ตรงตาม โครงสร้างคำตอบ (Response Structure) 4 ข้อ ที่กำหนดไว้อย่างครบถ้วนเท่านั้น ไม่ต้องตอบในรูปแบบแชท`

    // ค้นหา API key ใน .env
    const geminiKey = process.env.GEMINI_API_KEY
    const isGeminiConfigured = geminiKey && geminiKey.includes("AIzaSy")

    if (isGeminiConfigured) {
      try {
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
                    { text: `${systemContext}\n\nเริ่มทำการวิเคราะห์ดวงชะตาและส่งมอบคำพยากรณ์ได้เลย` }
                  ]
                }
              ],
              generationConfig: {
                maxOutputTokens: 3000,
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
    const responseText = `ระบบ AI กำลังอยู่ระหว่างการปรับปรุงและอัปเดตโมเดลพยากรณ์ กรุณาลองใหม่อีกครั้งในภายหลังครับ`


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
