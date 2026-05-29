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

    let forceRefresh = false;
    try {
      const body = await request.json();
      if (body?.forceRefresh) forceRefresh = true;
    } catch(e) {}

    // ดึงข้อมูลโปรไฟล์ดวงชะตากำเนิดของผู้ใช้และโควต้า AI
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // --- STEP 1: CHECK CACHE ---
    if (!forceRefresh) {
      const { data: cachedReport } = await supabase
        .from('ai_reports')
        .select('content')
        .eq('user_id', user.id)
        .eq('report_type', 'general_prediction')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (cachedReport && cachedReport.content?.text) {
        return NextResponse.json({
          success: true,
          message: cachedReport.content.text,
          source: 'cache'
        });
      }
    }

    // --- STEP 2: CHECK QUOTA ---
    const tokensUsed = profile.ai_tokens_used || 0;
    const tokensLimit = profile.ai_tokens_limit ?? 5; // Default free limit
    
    if (tokensLimit !== -1 && tokensUsed >= tokensLimit) {
      return NextResponse.json({
        success: false,
        message: `⚠️ โควต้าการพยากรณ์ของคุณหมดแล้ว กรุณาอัปเกรดแพ็กเกจเพื่อใช้งานต่อ`,
        source: 'out_of_credits',
        isOutOfCredits: true
      });
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
            // --- STEP 3: UPDATE DB (Deduct Credit & Save Cache) ---
            
            // 3.1 Deduct Credit
            await supabase
              .from('profiles')
              .update({ ai_tokens_used: tokensUsed + 1 })
              .eq('id', user.id);
              
            // 3.2 Save to Cache (Delete old then Insert, or just insert and we always fetch newest)
            await supabase
              .from('ai_reports')
              .insert({
                user_id: user.id,
                report_type: 'general_prediction',
                content: { text: aiResponse }
              });

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
