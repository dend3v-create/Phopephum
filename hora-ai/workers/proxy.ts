/**
 * Cloudflare Worker — AI Proxy
 * ทำหน้าที่เป็นตัวกลางระหว่าง Next.js App และ Claude API
 * เพื่อซ่อน API Key และควบคุม Rate Limit
 */

interface Env {
  ANTHROPIC_API_KEY: string
  ALLOWED_ORIGIN: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS
    const origin = request.headers.get('Origin') ?? ''
    const allowedOrigin = env.ALLOWED_ORIGIN ?? 'http://localhost:3000'

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    const url = new URL(request.url)

    // Route: /claude
    if (url.pathname === '/claude') {
      try {
        const body = await request.json()

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })

        const data = await response.json()

        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Proxy error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
    }

    return new Response('Not Found', { status: 404 })
  },
}
