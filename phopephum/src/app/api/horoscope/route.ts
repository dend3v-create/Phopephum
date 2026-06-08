/**
 * app/api/horoscope/route.ts
 * Astrology AI Engine — Main API Endpoint
 *
 * Flow:
 * POST /api/horoscope
 *   → horoscopeEngine (calculators + rule engine + lunar + ephemeris)
 *   → ragEngine (Supabase knowledge base)
 *   → buildPredictionPrompt
 *   → predictionEngine (Gemini 2.0 Flash default)
 *   → Response
 *
 * Input:
 * {
 *   "birthDate": "YYYY-MM-DD",
 *   "birthTime": "HH:MM",       // optional
 *   "province":  "เชียงใหม่",     // optional — enables ephemeris + birth chart
 *   "name":      "Den",          // optional
 *   "provider":  "gemini"        // optional: gemini | claude | openai
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { horoscopeEngine }        from '@/lib/astrology/engine/horoscopeEngine'
import { getRagContext }           from '@/lib/astrology/engine/ragEngine'
import { buildPredictionPrompt }   from '@/lib/astrology/prompts/predictionPrompt'
import { generatePrediction, PredictionProvider } from '@/lib/astrology/engine/predictionEngine'
import { HoroscopeInput }          from '@/lib/astrology/types/horoscope'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as HoroscopeInput & {
      province?: string
      provider?: PredictionProvider
    }

    // Validate
    if (!body.birthDate) {
      return NextResponse.json({ success: false, error: 'birthDate is required' }, { status: 400 })
    }

    // 1) คำนวณดวงชะตา (digit-root + lunar + ephemeris)
    const result = await horoscopeEngine(body)
    const { input, data, rules } = result

    // 2) RAG Context จาก Supabase knowledge_base
    const ragContext = await getRagContext({
      base:       data.base,
      categories: rules.slice(0, 3).map((r: { category: string }) => r.category),
    })

    // 3) สร้าง Prompt ครบ 9 หัวข้อ
    const prompt = buildPredictionPrompt(data, ragContext.text, rules, body.name)

    // 4) Generate AI Narrative (default: Gemini 2.0 Flash)
    const prediction = await generatePrediction({
      prompt,
      provider:  body.provider ?? 'gemini',
      maxTokens: 2000,
    })

    return NextResponse.json({
      success: true,
      data: {
        // ─── Digit-root layer ────────────────────────────────────────────
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
        rules:      rules.slice(0, 5),
        // ─── Lunar layer ─────────────────────────────────────────────────
        lunar:       result.lunar,
        matrix:      result.matrix,
        ageCycle:    result.ageCycle,
        emperorChart: result.emperorChart,
        currentTaksa8: result.currentTaksa8,
        // ─── Ephemeris layer (only if province provided) ─────────────────
        coordinates: result.coordinates,
        birthChart:  result.birthChart,
      },
      prediction,
      ragSource: ragContext.source,
    })

  } catch (error) {
    console.error('[/api/horoscope]', error)
    return NextResponse.json({ success: false, error: 'Prediction failed' }, { status: 500 })
  }
}

/*
 * Example Usage:
 * POST /api/horoscope
 * {
 *   "birthDate": "1982-09-23",
 *   "birthTime": "07:20",
 *   "province":  "หนองคาย",
 *   "name":      "Den",
 *   "provider":  "gemini"
 * }
 *
 * Response includes:
 * - data.base, power, house (digit-root system)
 * - data.sevenBase, nineBase, emperorChart (lunar system)
 * - data.birthChart.ascendant, planets, houses (ephemeris)
 * - prediction (AI narrative 9 topics)
 */
