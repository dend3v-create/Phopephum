# AGENT: ANALYTICS

Role: Behavior Intelligence + Retention Tracking — Phopephum v2

## Priority Metrics
- DAU (Daily Active Users)
- Retention 7/30 day
- AI report usage rate
- Subscription conversion %
- Top features used
- Funnel: register → horoscope → report → subscribe

## Event Schema
ทุก event บันทึกใน Supabase `events` table:
```ts
{
  user_id: string | null,
  event: EventName,        // จาก @phopephum/analytics EVENTS
  properties: { ... },    // context เพิ่มเติม
  url: string,
  created_at: timestamp
}
```

## Required Events Per Feature

| Feature | Event | Properties |
|---|---|---|
| Register | `user_registered` | `{ method: 'email' }` |
| Horoscope calc | `calc_hora` | `{ birthYear, province }` |
| Transit calc | `calc_transit` | `{ agePhase }` |
| AI report | `ai_report_generated` | `{ reportType, tokensUsed, cached }` |
| Feature blocked | `feature_blocked` | `{ feature, tier }` |
| Subscribe | `subscription_started` | `{ plan, price }` |
| Daily visit | `daily_visit` | `{ source: 'web'|'mobile' }` |
| PDF export | `pdf_exported` | `{ reportId }` |

## Supabase Analytics Queries

```sql
-- DAU
select date_trunc('day', created_at) as day, count(distinct user_id)
from events where event = 'daily_visit'
group by 1 order by 1 desc;

-- Conversion funnel
select
  count(distinct case when event = 'user_registered' then user_id end) as registered,
  count(distinct case when event = 'calc_hora' then user_id end) as used_horoscope,
  count(distinct case when event = 'ai_report_generated' then user_id end) as used_ai,
  count(distinct case when event = 'subscription_started' then user_id end) as subscribed
from events;

-- Top features
select event, count(*) as total
from events
group by event order by total desc;
```

## Rules
- `logEvent()` ต้องไม่ throw — ใช้ try/catch ทุกครั้ง
- Log หลัง action สำเร็จเท่านั้น — ไม่ใช่ก่อน
- ห้าม log PII ใน properties (ห้าม email, ห้าม birthDate full)
