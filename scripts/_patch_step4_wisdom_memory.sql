-- ==============================================================================
-- 🏛️ PHOPEPHUM V3 — STEP 4: UNIFIED WISDOM MEMORY MIGRATION PATCH
-- File: scripts/_patch_step4_wisdom_memory.sql
-- Run this in Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Ensure updated_at trigger function exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create wisdom_queries table
CREATE TABLE IF NOT EXISTS public.wisdom_queries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Question & Intent
  question          TEXT NOT NULL,
  intent_category   TEXT NOT NULL CHECK (intent_category IN (
    'timing', 'finance', 'relationship', 'lost', 'career', 'health', 'general',
    'horanu', 'yam', 'karnchata', 'rahu'
  )),
  context_type      TEXT NOT NULL DEFAULT 'horary' CHECK (context_type IN ('horary', 'natal', 'daily_transit', 'timing_comparison')),
  confidence        TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  
  -- Plain Language Prediction (L1)
  answer            TEXT NOT NULL,
  actionable        TEXT NOT NULL DEFAULT '',
  best_window       JSONB,
  prediction_score  INTEGER CHECK (prediction_score >= 0 AND prediction_score <= 100),
  
  -- Snapshots: Evidence (L2) & Engine (Immutable freeze at calculation time)
  evidence_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  engine_snapshot   JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- State & Timestamps
  is_bookmarked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Database-level Security: Composite Unique key to allow Composite Foreign Key enforcement
  CONSTRAINT wisdom_queries_id_user_id_uq UNIQUE (id, user_id)
);

-- If table already existed with older check constraint, update it safely
DO $$
BEGIN
  ALTER TABLE public.wisdom_queries DROP CONSTRAINT IF EXISTS wisdom_queries_intent_category_check;
  ALTER TABLE public.wisdom_queries ADD CONSTRAINT wisdom_queries_intent_category_check 
    CHECK (intent_category IN (
      'timing', 'finance', 'relationship', 'lost', 'career', 'health', 'general',
      'horanu', 'yam', 'karnchata', 'rahu'
    ));
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 3. Create wisdom_outcomes table (Outcome Tracking)
CREATE TABLE IF NOT EXISTS public.wisdom_outcomes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id          UUID NOT NULL,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tracking & Status
  status            TEXT NOT NULL DEFAULT 'pending' 
                    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  action_taken      BOOLEAN DEFAULT NULL,
  actual_result     TEXT CHECK (actual_result IN ('accurate_success', 'accurate_neutral', 'partially_accurate', 'inaccurate', 'unresolved')),
  user_notes        TEXT,
  occurred_at       TIMESTAMPTZ,
  feedback_rating   SMALLINT CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Database-level Security: Enforce that outcome.user_id MUST MATCH wisdom_queries.user_id!
  CONSTRAINT fk_wisdom_outcomes_query_user 
    FOREIGN KEY (query_id, user_id) 
    REFERENCES public.wisdom_queries(id, user_id) 
    ON DELETE CASCADE
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.wisdom_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wisdom_outcomes ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for wisdom_queries
DROP POLICY IF EXISTS "wisdom_queries_select_own" ON public.wisdom_queries;
CREATE POLICY "wisdom_queries_select_own"
  ON public.wisdom_queries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wisdom_queries_insert_own" ON public.wisdom_queries;
CREATE POLICY "wisdom_queries_insert_own"
  ON public.wisdom_queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wisdom_queries_update_own" ON public.wisdom_queries;
CREATE POLICY "wisdom_queries_update_own"
  ON public.wisdom_queries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wisdom_queries_delete_own" ON public.wisdom_queries;
CREATE POLICY "wisdom_queries_delete_own"
  ON public.wisdom_queries FOR DELETE
  USING (auth.uid() = user_id);

-- 6. RLS Policies for wisdom_outcomes (with cross-user validation check)
DROP POLICY IF EXISTS "wisdom_outcomes_select_own" ON public.wisdom_outcomes;
CREATE POLICY "wisdom_outcomes_select_own"
  ON public.wisdom_outcomes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wisdom_outcomes_insert_own" ON public.wisdom_outcomes;
CREATE POLICY "wisdom_outcomes_insert_own"
  ON public.wisdom_outcomes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.wisdom_queries q
      WHERE q.id = query_id AND q.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "wisdom_outcomes_update_own" ON public.wisdom_outcomes;
CREATE POLICY "wisdom_outcomes_update_own"
  ON public.wisdom_outcomes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.wisdom_queries q
      WHERE q.id = query_id AND q.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "wisdom_outcomes_delete_own" ON public.wisdom_outcomes;
CREATE POLICY "wisdom_outcomes_delete_own"
  ON public.wisdom_outcomes FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Automated updated_at triggers
DROP TRIGGER IF EXISTS trg_wisdom_queries_updated_at ON public.wisdom_queries;
CREATE TRIGGER trg_wisdom_queries_updated_at
  BEFORE UPDATE ON public.wisdom_queries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_wisdom_outcomes_updated_at ON public.wisdom_outcomes;
CREATE TRIGGER trg_wisdom_outcomes_updated_at
  BEFORE UPDATE ON public.wisdom_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 8. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_wisdom_queries_user_created
  ON public.wisdom_queries (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wisdom_queries_bookmarked
  ON public.wisdom_queries (user_id, created_at DESC)
  WHERE is_bookmarked = TRUE;

CREATE INDEX IF NOT EXISTS idx_wisdom_queries_user_intent
  ON public.wisdom_queries (user_id, intent_category);

CREATE INDEX IF NOT EXISTS idx_wisdom_outcomes_query_id
  ON public.wisdom_outcomes (query_id);

CREATE INDEX IF NOT EXISTS idx_wisdom_outcomes_user_status
  ON public.wisdom_outcomes (user_id, status);

-- 9. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
