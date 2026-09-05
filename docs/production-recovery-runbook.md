# 🏛️ PHOPEPHUM V3 — PRODUCTION RECOVERY RUNBOOK
**Classification: High-Availability Standard Operating Procedure (SOP)**
**Author: ครูเด่น มาสเตอร์ฟา — Senior AI SaaS Architect**
**Version: 3.0.0 (Production Release Candidate)**

---

## 1. INCIDENT 1: PAYMENT GATEWAY & WEBHOOK INCIDENTS

### Symptoms
- User reports PromptPay QR paid but UI stuck on pending modal.
- Omise webhook latency or connection drops.

### Diagnostic Steps
1. Run status query via Supabase SQL / CLI:
   ```sql
   SELECT id, user_id, provider_transaction_id, status, gross_amount_thb, subscription_plan_code, created_at
   FROM public.payment_transactions
   WHERE provider_transaction_id = '<OMISE_CHARGE_ID>' OR user_id = '<USER_ID>';
   ```
2. Verify charge status directly from Omise Dashboard / API:
   ```bash
   curl -u "$OMISE_SECRET_KEY:" https://api.omise.co/charges/<OMISE_CHARGE_ID>
   ```

### Resolution Procedure
- If Omise reports `status: "successful"` and `paid: true`:
  Execute atomic activation via PostgreSQL RPC:
  ```sql
  SELECT public.record_omise_payment_and_activate_atomic(
    p_user_id := '<USER_ID>',
    p_omise_charge_id := '<OMISE_CHARGE_ID>',
    p_payment_method := 'promptpay',
    p_gross_amount_thb := 289, -- or exact catalog price
    p_gateway_fee_thb := 4.77,
    p_gateway_vat_thb := 0.33,
    p_net_received_thb := 283.90,
    p_subscription_plan_code := 'pro',
    p_vat_rate := 0.07,
    p_idempotency_key := 'manual_fix:<OMISE_CHARGE_ID>'
  );
  ```
- If purchase was a Sands Refill Pack, run:
  ```sql
  SELECT public.credit_sands(
    p_user_id := '<USER_ID>',
    p_amount := 150,
    p_reward_class := 'adjustment',
    p_activity_type := 'sands_purchase',
    p_reference_id := 'manual_sands:<OMISE_CHARGE_ID>',
    p_description := 'Manual Recovery Credit for charge <OMISE_CHARGE_ID>'
  );
  ```

---

## 2. INCIDENT 2: ENTITLEMENT & QUOTA MISMATCH

### Symptoms
- User profile shows `free` despite active paid subscription.
- User cannot generate AI report or save person profiles.

### Diagnostic Steps
1. Check profile state:
   ```sql
   SELECT id, email, plan, subscription, membership_status, membership_expires_at, time_sands
   FROM public.profiles
   WHERE id = '<USER_ID>' OR email = '<USER_EMAIL>';
   ```
2. Check recent payment transactions:
   ```sql
   SELECT * FROM public.payment_transactions
   WHERE user_id = '<USER_ID>' AND status = 'successful'
   ORDER BY created_at DESC LIMIT 5;
   ```

### Resolution Procedure
- If verified payment exists and expiry is in the future:
  ```sql
  UPDATE public.profiles
  SET plan = '<CANONICAL_SKU>',
      subscription = CASE WHEN '<CANONICAL_SKU>' = 'imperial' THEN 'lifetime' ELSE '<CANONICAL_SKU>' END,
      membership_status = 'active',
      membership_expires_at = COALESCE(membership_expires_at, now() + interval '30 days'),
      updated_at = now()
  WHERE id = '<USER_ID>';
  ```

---

## 3. INCIDENT 3: SANDS LEDGER BALANCE MISMATCH

### Symptoms
- `profiles.time_sands` does not match `SUM(sands_ledger.amount)`.

### Diagnostic Steps
1. Compute ledger sum vs profile balance:
   ```sql
   SELECT
     p.id,
     p.time_sands AS cached_balance,
     COALESCE(SUM(l.amount), 0) AS calculated_balance,
     (p.time_sands - COALESCE(SUM(l.amount), 0)) AS discrepancy
   FROM public.profiles p
   LEFT JOIN public.sands_ledger l ON l.user_id = p.id
   WHERE p.id = '<USER_ID>'
   GROUP BY p.id, p.time_sands;
   ```

### Resolution Procedure
- Realign profile cache to match immutable ledger truth:
  ```sql
  UPDATE public.profiles p
  SET time_sands = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.sands_ledger
    WHERE user_id = p.id
  ),
  updated_at = now()
  WHERE p.id = '<USER_ID>';
  ```

---

## 4. INCIDENT 4: DATABASE CONNECTION OR TIMEOUT FAILURE

### Symptoms
- API returns 500 error or Supabase connection timeout.

### Diagnostic Steps
1. Check Supabase health status and active pool connections.
2. Verify Cloudflare Worker connection string:
   - Ensure transaction pooler port 6543 / Direct port 5432 is reachable.

### Resolution Procedure
- If connection pool exhausted, restart Supabase pooler or switch client to pooler endpoint.
- All failed client requests can safely retry due to idempotency keys on every transaction.

---

## 5. INCIDENT 5: WEBHOOK FORGERY / DROPPED WEBHOOKS

### Symptoms
- 401 Unauthorized logged on `/api/webhook/omise`.
- Omise reports failed webhook delivery.

### Diagnostic Steps
1. Verify `OMISE_SECRET_KEY` in Cloudflare Secrets.
2. Check `verifyOmiseWebhookEvent` logs in Cloudflare Logs.

### Resolution Procedure
- Ensure HMAC / Basic Auth verification is configured with valid live/test key.
- Resend dropped webhooks from Omise Dashboard Webhook Management.

---

## 6. INCIDENT 6: EMERGENCY DEPLOYMENT ROLLBACK

### Symptoms
- Production build runtime error or Vite asset missing (`Cannot find module *.js`).

### Diagnostic Steps
1. Inspect Cloudflare Pages deployment log.
2. Clean local stale artifacts:
   ```bash
   find apps/web/app -name "*.js" | xargs rm -f
   pnpm build
   ```

### Resolution Procedure
- Rollback to previous known-good deployment via Cloudflare Pages dashboard with 1-click instant rollback.
- Re-run full test gate:
  ```bash
  pnpm exec tsx scripts/test-phase6-7-production-readiness.ts
  ```
