/**
 * claude.ts
 * Anthropic Claude API client (via Cloudflare Worker Proxy)
 * ห้ามเรียก Claude API โดยตรงจาก client-side
 */
import { SEVEN_BASE_ROLE_SYSTEM } from '@/constants/ai-prompts'

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeReportRequest {
  systemPrompt: string
  userMessage: string
  maxTokens?: number
}

export interface ClaudeReportResponse {
  content: string
  tokensUsed: number
}

/**
 * เรียก Claude ผ่าน Cloudflare Worker Proxy
 * ใช้เฉพาะใน Server-side (Route Handlers)
 */
export async function callClaude(
  req: ClaudeReportRequest
): Promise<ClaudeReportResponse> {
  const workerUrl = process.env.NEXT_PUBLIC_AI_WORKER_URL
  if (!workerUrl) {
    throw new Error('AI_WORKER_URL is not configured')
  }

  const response = await fetch(`${workerUrl}/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: req.maxTokens ?? 2048,
      system: req.systemPrompt,
      messages: [{ role: 'user', content: req.userMessage }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error: ${response.status} — ${error}`)
  }

  const data = await response.json()
  return {
    content: data.content?.[0]?.text ?? '',
    tokensUsed: data.usage?.output_tokens ?? 0,
  }
}

/**
 * สร้าง System Prompt สำหรับ Phopephum Life Report
 * ใช้ SEVEN_BASE_ROLE_SYSTEM เป็นฐาน + กำหนด output format JSON
 */
export function buildHoraReportSystemPrompt(): string {
  return `${SEVEN_BASE_ROLE_SYSTEM}

## OUTPUT FORMAT
ตอบในรูปแบบ JSON ตาม schema ที่กำหนดเสมอ ไม่ตอบนอกเหนือจากที่ขอ
ภาษาไทยเป็นหลัก เน้นคำแนะนำเชิงบวกและปฏิบัติได้จริง`
}
