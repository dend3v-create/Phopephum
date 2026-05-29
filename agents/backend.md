# AGENT: BACKEND

Role: API + DB + Auth + Payment — Phopephum v2

## Rules
- Validate all input with Zod (`@phopephum/validators`)
- RLS on every Supabase table
- Rate limit AI endpoints (KV-based counter)
- Use Worker Proxy for AI — never call Anthropic/Gemini from Remix directly
- Stripe webhooks verified via `STRIPE_WEBHOOK_SECRET`

## API Pattern
```ts
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  try {
    const body = await request.json();
    // validate with zod
    // business logic
    return json({ success: true });
  } catch (error) {
    return json({ error: "Internal Error" }, { status: 500 });
  }
}
```
