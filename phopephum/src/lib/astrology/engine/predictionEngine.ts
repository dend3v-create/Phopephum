/**
 * engine/predictionEngine.ts
 * AI Prediction Engine — Gemini 2.0 Flash (default), pluggable
 *
 * รองรับ: Gemini (default) | Claude | OpenAI
 * Default: Gemini เพราะ GEMINI_API_KEY set ใน Cloudflare Pages
 */

export type PredictionProvider = 'gemini' | 'claude' | 'openai'

export interface PredictionRequest {
  prompt:      string
  provider?:   PredictionProvider
  maxTokens?:  number
  temperature?: number
  systemPrompt?: string
}

/**
 * สร้างคำพยากรณ์ AI จาก prompt
 * @param req PredictionRequest
 * @returns คำพยากรณ์ภาษาไทย
 */
export async function generatePrediction(req: PredictionRequest): Promise<string> {
  const {
    prompt,
    provider    = 'gemini',
    maxTokens   = 1500,
    temperature = 0.85,
    systemPrompt = 'คุณคือ AI นักพยากรณ์เชิง transformative learning ตอบภาษาไทย เน้นบวก อบอุ่น สร้างพลังใจ',
  } = req

  switch (provider) {
    case 'gemini':
      return callGemini(prompt, systemPrompt, maxTokens, temperature)
    case 'claude':
      return callClaude(prompt, systemPrompt, maxTokens)
    case 'openai':
      return callOpenAI(prompt, systemPrompt, maxTokens, temperature)
    default:
      return callGemini(prompt, systemPrompt, maxTokens, temperature)
  }
}

// ─── Gemini 2.0 Flash ─────────────────────────────────────────────────────────

async function callGemini(
  prompt:      string,
  system:      string,
  maxTokens:   number,
  temperature: number,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const fullPrompt = `${system}\n\n${prompt}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini error ${response.status}: ${err}`)
  }

  const data = await response.json()
  return (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    ?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// ─── Claude (via NEXT_PUBLIC_AI_WORKER_URL if set) ────────────────────────────

async function callClaude(
  prompt:    string,
  system:    string,
  maxTokens: number,
): Promise<string> {
  const workerUrl = process.env.NEXT_PUBLIC_AI_WORKER_URL
  if (!workerUrl) {
    // Fallback to Gemini if no worker URL
    return callGemini(prompt, system, maxTokens, 0.85)
  }

  const response = await fetch(`${workerUrl}/claude`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) throw new Error(`Claude error ${response.status}`)

  const data = await response.json()
  return (data as { content?: Array<{ text?: string }> })?.content?.[0]?.text ?? ''
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

async function callOpenAI(
  prompt:      string,
  system:      string,
  maxTokens:   number,
  temperature: number,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model:       'gpt-4o',
      max_tokens:  maxTokens,
      temperature,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: prompt },
      ],
    }),
  })

  if (!response.ok) throw new Error(`OpenAI error ${response.status}`)

  const data = await response.json()
  return (data as { choices?: Array<{ message?: { content?: string } }> })
    ?.choices?.[0]?.message?.content ?? ''
}
