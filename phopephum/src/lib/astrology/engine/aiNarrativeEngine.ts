/**
 * engine/aiNarrativeEngine.ts
 * AI Narrative Engine — ใช้ Claude (via Worker Proxy) เป็นหลัก
 * รองรับ: Claude (default) | OpenAI | Gemini | Local LLM
 */

export type AIProvider = 'claude' | 'openai' | 'gemini' | 'local'

interface NarrativeRequest {
  prompt: string
  provider?: AIProvider
  maxTokens?: number
}

/**
 * สร้าง AI Narrative จาก prompt
 * Default: ใช้ Claude ผ่าน Cloudflare Worker Proxy
 */
export async function generateNarrative(req: NarrativeRequest): Promise<string> {
  const { prompt, provider = 'claude', maxTokens = 1500 } = req

  switch (provider) {
    case 'claude':
      return callClaude(prompt, maxTokens)
    case 'openai':
      return callOpenAI(prompt, maxTokens)
    case 'gemini':
      return callGemini(prompt, maxTokens)
    default:
      return callClaude(prompt, maxTokens)
  }
}

// ─── Claude (Cloudflare Worker Proxy) ─────────────────────────────────────
async function callClaude(prompt: string, maxTokens: number): Promise<string> {
  const workerUrl = process.env.NEXT_PUBLIC_AI_WORKER_URL
  if (!workerUrl) {
    throw new Error('AI_WORKER_URL not configured')
  }

  const { SEVEN_BASE_ROLE_SYSTEM } = await import('@/constants/ai-prompts')

  const response = await fetch(`${workerUrl}/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: `${SEVEN_BASE_ROLE_SYSTEM}\n\nตอบภาษาไทย เน้นเชิงบวก อบอุ่น มีพลัง ดั่ง Life Coach`,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude error: ${response.status} — ${err}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text ?? ''
}

// ─── OpenAI (pluggable) ────────────────────────────────────────────────────
async function callOpenAI(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: maxTokens,
      temperature: 0.85,
      messages: [
        { role: 'system', content: 'คุณคือ AI นักพยากรณ์เชิง transformative learning ตอบภาษาไทย เน้นบวกและมีพลัง' },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI error: ${response.status} — ${err}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// ─── Gemini (pluggable) ────────────────────────────────────────────────────
async function callGemini(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.85 },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini error: ${response.status} — ${err}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}
