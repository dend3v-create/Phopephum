/**
 * app/api/horoscope/route.ts
 * Astrology AI Engine — Main API Endpoint
 *
 * Flow:
 * POST /api/horoscope
 *   → horoscopeEngine (calculators + rule engine)
 *   → ragContextEngine (Supabase knowledge base)
 *   → buildPredictionPrompt
 *   → aiNarrativeEngine (Claude / OpenAI / Gemini)
 *   → Response
 */

import { NextRequest, NextResponse } from 'next/server'
import { horoscopeEngine } from '@/lib/astrology/engine/horoscopeEngine'
import { getRagContext } from '@/lib/astrology/engine/ragContextEngine'
import { buildPredictionPrompt } from '@/lib/astrology/prompts/predictionPrompt'
import { generateNarrative, AIProvider } from '@/lib/astrology/engine/aiNarrativeEngine'
import { HoroscopeInput } from '@/lib/astrology/types/horoscope'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as HoroscopeInput & { provider?: AIProvider }

    // Validate
    if (!body.birthDate) {
      return NextResponse.json({ success: false, error: 'birthDate is required' }, { status: 400 })
    }

    // 1) คำนวณดวงชะตา + Rule Engine
    const { input, data, rules } = await horoscopeEngine(body)

    // 2) ดึง RAG Context จาก Supabase knowledge_base
    const ragContext = await getRagContext(data, rules)

    // 3) สร้าง Prompt ครบ 9 หัวข้อ
    const prompt = buildPredictionPrompt(data, ragContext, rules, body.name)

    // 4) Generate AI Narrative (default: gemini — worker proxy removed)
    const prediction = await generateNarrative({
      prompt,
      provider: body.provider ?? 'gemini',
      maxTokens: 2000,
    })

    return NextResponse.json({
      success: true,
      data: {
        base:       data.base,
        power:      data.power,
        house:      data.house,
        transit:    data.transit,
        vayaChorn:  data.vayaChorn,
        taksa:      data.taksa,
        zodiacYear: data.zodiacYear,
        dayName:    data.dayName,
        atthakarn:  data.atthakarn,
        navamsa:    data.navamsa,
        rules:      rules.slice(0, 5), // top 5 rules
      },
      prediction,
    })
  } catch (error) {
    console.error('[/api/horoscope]', error)
    return NextResponse.json({ success: false, error: 'Prediction failed' }, { status: 500 })
  }
}

// Example Usage (for documentation):
// POST /api/horoscope
// { "birthDate": "1982-09-23", "birthTime": "09:00", "name": "Den", "provider": "claude" }
//
// Response:
// {
//   "success": true,
//   "data": { "base": 5, "power": 17, "house": "ปุตตะ", ... },
//   "prediction": "..." (AI-generated narrative)
// }
