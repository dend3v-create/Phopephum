# SKILL: deploy-worker

## Purpose
Deploy Cloudflare AI Proxy Worker
Worker นี้คือ gateway เดียวที่ call Anthropic Claude API

## Worker Directory
`infrastructure/workers/ai-proxy/`

---

## Pre-Deploy Checklist

### Secrets (run once)
```bash
cd infrastructure/workers/ai-proxy

# Required secrets
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put AI_WORKER_SECRET

# AI_WORKER_SECRET = random string สำหรับ auth ระหว่าง Remix ↔ Worker
# เช่น: openssl rand -hex 32
```

### KV Namespace (run once)
```bash
# Create KV for prompt cache
wrangler kv:namespace create "KV_PROMPT_CACHE"
wrangler kv:namespace create "KV_PROMPT_CACHE" --preview

# Copy the IDs ที่ได้ ไปใส่ใน wrangler.toml
```

### Update wrangler.toml
แก้ `REPLACE_WITH_KV_ID` และ `REPLACE_WITH_KV_PREVIEW_ID` ใน:
`infrastructure/workers/ai-proxy/wrangler.toml`

---

## Deploy Steps

```bash
cd E:/00.1_DenD3v_AI/phopephum-v2

# 1. Install worker deps
pnpm --filter @phopephum/workers-ai-proxy install

# 2. TypeScript check
pnpm --filter @phopephum/workers-ai-proxy typecheck

# 3. Deploy
pnpm --filter @phopephum/workers-ai-proxy deploy
# หรือ: pnpm deploy:workers
```

---

## Post-Deploy

1. Copy worker URL จาก output (เช่น `https://phopephum-ai-proxy.xxxxx.workers.dev`)
2. Set ใน Remix web app:
   ```bash
   # ใน apps/web — Cloudflare Pages environment variables
   AI_WORKER_URL = https://phopephum-ai-proxy.xxxxx.workers.dev
   AI_WORKER_SECRET = [same secret ที่ set ใน worker]
   ```

---

## Test Worker

```bash
curl -X POST https://phopephum-ai-proxy.xxxxx.workers.dev/generate \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","reportType":"life_overview","context":{},"prompt":"สวัสดี ทดสอบระบบ"}'
```

ต้องได้ SSE stream กลับมา

---

## Rate Limit (TODO: implement)

เพิ่มใน worker:
```ts
async function checkRateLimit(userId: string, env: Env): Promise<boolean> {
  const key = `rate:${userId}:${new Date().toISOString().slice(0,13)}`
  const count = parseInt(await env.KV_PROMPT_CACHE.get(key) ?? '0')
  if (count >= 10) return false  // 10 requests/hour free tier
  await env.KV_PROMPT_CACHE.put(key, String(count + 1), { expirationTtl: 3600 })
  return true
}
```
