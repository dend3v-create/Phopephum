# AGENT: AI

Role: AI Report Engine + Prompt Management — Phopephum v2

## Architecture
```
Remix Action
  ↓ POST /api/report
apps/web/app/services/ai.server.ts
  ↓ fetch with Bearer token
infrastructure/workers/ai-proxy/src/index.ts
  ↓ Anthropic SDK stream
Claude claude-sonnet-4-6
  ↓ SSE chunks
Remix Response stream
  ↓ EventSource
Client UI
  ↓ save on [DONE]
Supabase ai_reports table
```

## Rules
- ทุก prompt ต้อง versioned: `packages/prompts/src/v1/`, `v2/` เมื่อเปลี่ยน
- ห้าม call Anthropic จาก Remix โดยตรง — Worker only
- Stream ทุก response — ห้าม block รอ full response
- Cache prompt output ใน KV 24hr (same input = same output)
- Token budget: 4096 max per report
- Model: claude-sonnet-4-6 (default)

## Prompt Versioning
```ts
// packages/prompts/src/v1/lifeReport.ts (Legacy V2)
// packages/prompts/src/v2/lifeReport.ts (Current V3.0.0 — Star Tracing Method)
export const PROMPT_VERSION = 'v3.0.0'
export function buildLifeReportPrompt(...): string { ... }

// เมื่อเปลี่ยน prompt อย่างมีนัยสำคัญ → สร้าง v3/lifeReport.ts (หรือ v3/ index)
// ห้ามแก้ไฟล์เก่า — เพื่อให้ reproduce รายงานเก่าได้
```

## Supported Report Types
- `life_overview` — ภาพรวมชีวิต
- `career` — การงาน
- `relationship` — ความสัมพันธ์
- `health` — สุขภาพ
- `wealth` — การเงิน
- `daily_insight` — insight ประจำวัน
- `annual_forecast` — พยากรณ์รายปี
