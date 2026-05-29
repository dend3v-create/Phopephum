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

    // 2. สร้าง Data Snapshot สำหรับ AI (ข้อมูลดวงชะตา)
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

    // ค้นหา API key ใน .env
    const geminiKey = process.env.GEMINI_API_KEY
    const isGeminiConfigured = geminiKey && geminiKey.includes("AIzaSy")

    if (isGeminiConfigured) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: GENERAL_PREDICTION_SYSTEM }]
              },
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `ข้อมูลดวงชะตาพื้นฐานของผู้รับคำพยากรณ์:\n${JSON.stringify(dataSnapshot, null, 2)}\n\n**ข้อควรจำ:** กรุณาส่งมอบคำพยากรณ์ให้ตรงตาม โครงสร้างคำตอบ (Response Structure) 4 ข้อ ที่กำหนดไว้อย่างครบถ้วนเท่านั้น ไม่ต้องตอบในรูปแบบแชท\n\nเริ่มทำการวิเคราะห์ดวงชะตาและส่งมอบคำพยากรณ์ได้เลย`
                    }
                  ]
                }
              ],
              generationConfig: {
                maxOutputTokens: 8192,
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

          // Gemini returned OK but no text (e.g. safety filter or empty candidates)
          const finishReason = resData.candidates?.[0]?.finishReason || 'UNKNOWN'
          console.error('[/api/ai/coach] Gemini returned empty response, finishReason:', finishReason, JSON.stringify(resData))
          return NextResponse.json({
            success: false,
            message: `⚠️ ระบบ AI ไม่สามารถสร้างคำพยากรณ์ได้ในขณะนี้ (${finishReason}) กรุณาลองใหม่อีกครั้งครับ`,
            source: 'empty-response'
          })
        } else {
          console.error('[/api/ai/coach] Gemini API failed with status:', geminiRes.status, resData)
          return NextResponse.json({
            success: false,
            message: `⚠️ ระบบ AI ขัดข้องชั่วคราว (API Error: ${geminiRes.status}) - ${resData?.error?.message || 'Unknown error'}`,
            source: 'gemini-error'
          })
        }
      } catch (err: any) {
        console.error('[/api/ai/coach] Gemini API request error:', err)
        return NextResponse.json({
          success: false,
          message: `⚠️ ไม่สามารถเชื่อมต่อกับ AI ได้ (Fetch Error: ${err.message})`,
          source: 'fetch-error'
        })
      }
    } else {
      return NextResponse.json({
        success: false,
        message: `⚠️ ไม่พบ GEMINI_API_KEY ในระบบ กรุณาตรวจสอบการตั้งค่า Environment Variables`,
        source: 'wisdom-fallback'
      })
    }
  } catch (error) {
    console.error('[/api/ai/coach] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
