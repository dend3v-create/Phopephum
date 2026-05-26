import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { callClaude, buildHoraReportSystemPrompt } from '@/lib/claude'
import { HORA_REPORT_PROMPT } from '@/constants/ai-prompts'

// POST /api/ai/report
// Body: { birthDate, birthTime?, horaData?, transitData? }
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ตรวจ Quota
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_tokens_used, ai_tokens_limit, plan')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const isUnlimited = profile.ai_tokens_limit === -1
    if (!isUnlimited && profile.ai_tokens_used >= profile.ai_tokens_limit) {
      return NextResponse.json(
        { error: 'AI quota exceeded. Please upgrade your plan.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { birthDate, birthTime, horaData } = body

    // สร้าง prompt
    const userMessage = `${HORA_REPORT_PROMPT}

ข้อมูลเกิด: วันที่ ${birthDate}${birthTime ? ` เวลา ${birthTime}` : ''}
ข้อมูลยามอัฐกาลวันนี้: ${JSON.stringify(horaData ?? {})}`

    const result = await callClaude({
      systemPrompt: buildHoraReportSystemPrompt(),
      userMessage,
      maxTokens: 2048,
    })

    // บันทึก Report ลง DB
    const { data: report, error: dbError } = await supabase
      .from('ai_reports')
      .insert({
        user_id: user.id,
        report_type: 'life_report',
        content: JSON.parse(result.content),
        tokens_used: result.tokensUsed,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[/api/ai/report] DB error:', dbError)
    }

    // อัปเดต quota
    await supabase
      .from('profiles')
      .update({ ai_tokens_used: profile.ai_tokens_used + 1 })
      .eq('id', user.id)

    return NextResponse.json({
      success: true,
      data: { content: JSON.parse(result.content), reportId: report?.id },
    })
  } catch (error) {
    console.error('[/api/ai/report]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
