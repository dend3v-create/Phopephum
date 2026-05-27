import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { callClaude, buildHoraReportSystemPrompt } from '@/lib/claude'
import { HORA_REPORT_PROMPT } from '@/constants/ai-prompts'
import { calculateSevenBase } from '@/engine/seven-base-calculator'

export const runtime = 'edge'

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

    // คำนวณดวงชะตาเลข 7 ตัว 9 ฐาน และดวงจร (วัยจร/อายุจร) แบบ Deterministic
    const sevenBaseData = calculateSevenBase(birthDate, birthTime || "12:00")

    // สร้าง prompt
    let reportPrompt = HORA_REPORT_PROMPT
    const isPremium = profile.plan === 'pro' || profile.plan === 'premium'
    
    if (!isPremium) {
      reportPrompt += "\n\n(Note: สำหรับผู้ใช้งานทั่วไป กรุณาเว้นว่างหัวข้อ goldenHourExecution, karmicBlueprint, adaptiveLifeScript และ imperialProsperityMap หรือใส่เป็น string ว่า 'Upgrade to Premium for this insight')"
    }

    const userMessage = `${reportPrompt}

ข้อมูลเกิด: วันที่ ${birthDate}${birthTime ? ` เวลา ${birthTime}` : ''}
ข้อมูลยามอัฐกาลวันนี้: ${JSON.stringify(horaData ?? {})}
ข้อมูลดวงชะตาเลข 7 ตัว 9 ฐาน และดวงจรปราบกรรม: ${JSON.stringify(sevenBaseData)}`

    // ดึงข้อมูลฐานความรู้เฉพาะจาก Supabase เพื่อประยุกต์ใช้ในการทำนาย (Dynamic RAG)
    const { data: knowledgeItems } = await supabase
      .from('knowledge_base')
      .select('title, content, category')

    let knowledgePrompt = ""
    if (knowledgeItems && knowledgeItems.length > 0) {
      knowledgePrompt = "\n\nคำแนะนำและ Logic การพยากรณ์จากวิทยาการ/คัมภีร์ดั้งเดิม (กรุณาทำตามกฎและหลักความหมายนี้อย่างเคร่งครัด):\n" +
        knowledgeItems.map(item => `[หัวข้อคัมภีร์: ${item.title}] (หมวดหมู่: ${item.category})\n${item.content}`).join("\n\n")
    }

    const result = await callClaude({
      systemPrompt: buildHoraReportSystemPrompt() + knowledgePrompt,
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
