/**
 * wisdom.server.ts — Unified Wisdom Memory Service (STEP 4.2 & 4.3)
 *
 * Thin server service for managing wisdom queries, stored snapshots, bookmarks,
 * and outcome tracking (Prediction → Decision → Action → Outcome → Feedback → Personal Wisdom).
 * Enforces authenticated user ownership and Supabase RLS boundaries on every database call.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type OutcomeStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type ActualResult =
  | "accurate_success"
  | "accurate_neutral"
  | "partially_accurate"
  | "inaccurate"
  | "unresolved";

export interface WisdomOutcomeRecord {
  id: string;
  query_id: string;
  user_id: string;
  status: OutcomeStatus;
  action_taken: boolean | null;
  actual_result: ActualResult | null;
  user_notes: string | null;
  occurred_at: string | null;
  feedback_rating: number | null; // 1 to 5
  created_at: string;
  updated_at: string;
}

export interface SaveWisdomOutcomeInput {
  queryId: string;
  status?: OutcomeStatus;
  actionTaken?: boolean | null;
  actualResult?: ActualResult | null;
  userNotes?: string | null;
  occurredAt?: string | null;
  feedbackRating?: number | null;
}

export interface PersonalWisdomStats {
  totalQueries: number;
  trackedOutcomes: number;
  actionTakenCount: number;
  successRate: number; // 0-100%
  averageRating: number; // 0-5
}

export interface SaveWisdomQueryInput {
  question: string;
  intentCategory: string;
  contextType?: "horary" | "natal" | "daily_transit" | "timing_comparison";
  confidence: "high" | "medium" | "low";
  answer: string;
  actionable: string;
  bestWindow?: {
    timeRange: string;
    description: string;
    [key: string]: any;
  } | null;
  predictionScore?: number | null;
  evidenceSnapshot?: Array<{
    source: string;
    finding: string;
    weight: string;
  }> | null;
  engineSnapshot?: Record<string, any> | null;
}

export interface WisdomQueryRecord {
  id: string;
  user_id: string;
  question: string;
  intent_category: string;
  context_type: string;
  confidence: "high" | "medium" | "low";
  answer: string;
  actionable: string;
  best_window: {
    timeRange?: string;
    description?: string;
    [key: string]: any;
  } | null;
  prediction_score: number | null;
  evidence_snapshot: Array<{
    source: string;
    finding: string;
    weight: string;
  }>;
  engine_snapshot: Record<string, any>;
  is_bookmarked: boolean;
  created_at: string;
  updated_at: string;
  outcome?: WisdomOutcomeRecord | null;
}

export interface WisdomHistoryFilters {
  intent?: string;
  bookmarkedOnly?: boolean;
  limit?: number;
  offset?: number;
}

export function normalizeWisdomIntentCategory(raw?: string): string {
  if (!raw) return "general";
  const valid = ["timing", "finance", "relationship", "lost", "career", "health", "general"];
  if (valid.includes(raw)) return raw;
  switch (raw) {
    case "horanu":
      return "general";
    case "yam":
      return "timing";
    case "karnchata":
      return "career";
    case "rahu":
      return "lost";
    default:
      return "general";
  }
}

/**
 * Phase A — Save wisdom query to database
 * Only saves successful, valid predictions (skips empty questions, errors, or keystrokes)
 */
export async function saveWisdomQuery(
  supabase: SupabaseClient,
  userId: string,
  input: SaveWisdomQueryInput
): Promise<WisdomQueryRecord | null> {
  const cleanQuestion = (input.question || "").trim();
  const cleanAnswer = (input.answer || "").trim();

  // Guard: Do not save empty, incomplete, or keystroke drafts
  if (!cleanQuestion || !cleanAnswer || !userId) {
    return null;
  }

  try {
    const normalizedCategory = normalizeWisdomIntentCategory(input.intentCategory);
    const engineSnapshot = {
      ...(input.engineSnapshot || {}),
      sacredEngine: input.intentCategory || "general",
    };

    const { data, error } = await supabase
      .from("wisdom_queries")
      .insert({
        user_id: userId,
        question: cleanQuestion,
        intent_category: normalizedCategory,
        context_type: input.contextType || "horary",
        confidence: input.confidence || "medium",
        answer: cleanAnswer,
        actionable: (input.actionable || "").trim(),
        best_window: input.bestWindow || null,
        prediction_score:
          typeof input.predictionScore === "number"
            ? Math.round(input.predictionScore)
            : null,
        evidence_snapshot: input.evidenceSnapshot || [],
        engine_snapshot: engineSnapshot,
        is_bookmarked: false,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[saveWisdomQuery] Supabase insert error:", error);
      return null;
    }

    return data as WisdomQueryRecord;
  } catch (err) {
    console.error("[saveWisdomQuery] Unexpected error:", err);
    return null;
  }
}

/**
 * Phase B & C — Retrieve wisdom history with optional filters
 * Enforces ownership: only records belonging to `userId` are retrieved.
 * Seamlessly joins with `wisdom_outcomes` for complete outcome tracking.
 */
export async function getWisdomHistory(
  supabase: SupabaseClient,
  userId: string,
  filters?: WisdomHistoryFilters
): Promise<WisdomQueryRecord[]> {
  if (!userId) return [];

  try {
    let query = supabase
      .from("wisdom_queries")
      .select("*")
      .eq("user_id", userId);

    if (filters?.bookmarkedOnly) {
      query = query.eq("is_bookmarked", true);
    }

    if (filters?.intent && filters.intent !== "all") {
      query = query.eq("intent_category", filters.intent);
    }

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: queries, error } = await query;

    if (error || !queries) {
      console.error("[getWisdomHistory] Supabase fetch error:", error);
      return [];
    }

    // Load matching outcomes for these queries to provide instant outcome tracking
    const queryIds = queries.map((q) => q.id);
    const outcomeMap = new Map<string, WisdomOutcomeRecord>();

    if (queryIds.length > 0) {
      const { data: outcomes, error: outErr } = await supabase
        .from("wisdom_outcomes")
        .select("*")
        .eq("user_id", userId)
        .in("query_id", queryIds);

      if (!outErr && outcomes) {
        for (const out of outcomes) {
          outcomeMap.set(out.query_id, out as WisdomOutcomeRecord);
        }
      }
    }

    return queries.map((q) => ({
      ...q,
      outcome: outcomeMap.get(q.id) || null,
    })) as WisdomQueryRecord[];
  } catch (err) {
    console.error("[getWisdomHistory] Unexpected error:", err);
    return [];
  }
}

/**
 * Phase B & D — Retrieve a specific stored wisdom query by ID
 * Reads strictly from stored snapshot without recalculating.
 * Enforces ownership: verifies `user_id === userId`.
 */
export async function getWisdomQuery(
  supabase: SupabaseClient,
  userId: string,
  queryId: string
): Promise<WisdomQueryRecord | null> {
  if (!userId || !queryId) return null;

  try {
    const [queryRes, outcomeRes] = await Promise.all([
      supabase
        .from("wisdom_queries")
        .select("*")
        .eq("user_id", userId)
        .eq("id", queryId)
        .single(),
      supabase
        .from("wisdom_outcomes")
        .select("*")
        .eq("user_id", userId)
        .eq("query_id", queryId)
        .maybeSingle(),
    ]);

    if (queryRes.error || !queryRes.data) {
      return null;
    }

    return {
      ...(queryRes.data as WisdomQueryRecord),
      outcome: (outcomeRes.data as WisdomOutcomeRecord) || null,
    };
  } catch (err) {
    console.error("[getWisdomQuery] Unexpected error:", err);
    return null;
  }
}

/**
 * Phase B & E — Toggle or set bookmark state
 * Enforces ownership: only updates if `user_id === userId`.
 */
export async function toggleWisdomBookmark(
  supabase: SupabaseClient,
  userId: string,
  queryId: string,
  desiredState?: boolean
): Promise<{ id: string; is_bookmarked: boolean } | null> {
  if (!userId || !queryId) return null;

  try {
    let targetState = desiredState;

    // If desiredState not explicitly given, fetch current state first
    if (typeof targetState !== "boolean") {
      const { data: current, error: fetchErr } = await supabase
        .from("wisdom_queries")
        .select("is_bookmarked")
        .eq("user_id", userId)
        .eq("id", queryId)
        .single();

      if (fetchErr || !current) {
        return null;
      }
      targetState = !current.is_bookmarked;
    }

    const { data, error } = await supabase
      .from("wisdom_queries")
      .update({
        is_bookmarked: targetState,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("id", queryId)
      .select("id, is_bookmarked")
      .single();

    if (error || !data) {
      console.error("[toggleWisdomBookmark] Supabase update error:", error);
      return null;
    }

    return data as { id: string; is_bookmarked: boolean };
  } catch (err) {
    console.error("[toggleWisdomBookmark] Unexpected error:", err);
    return null;
  }
}

/**
 * Phase B — Retrieve all bookmarked wisdom records for the user
 */
export async function getBookmarkedWisdom(
  supabase: SupabaseClient,
  userId: string
): Promise<WisdomQueryRecord[]> {
  return getWisdomHistory(supabase, userId, { bookmarkedOnly: true });
}

/**
 * STEP 4.3 — Outcome Tracking: Upsert outcome feedback for a query
 * Loop: Prediction → Decision → Action → Outcome → Feedback → Personal Wisdom
 * Enforces database-level ownership check on parent query_id.
 */
export async function upsertWisdomOutcome(
  supabase: SupabaseClient,
  userId: string,
  input: SaveWisdomOutcomeInput
): Promise<WisdomOutcomeRecord | null> {
  if (!userId || !input.queryId) return null;

  try {
    // 1. Verify parent query ownership
    const { data: parentQuery, error: parentErr } = await supabase
      .from("wisdom_queries")
      .select("id, user_id")
      .eq("id", input.queryId)
      .eq("user_id", userId)
      .single();

    if (parentErr || !parentQuery) {
      console.warn("[upsertWisdomOutcome] Parent query not found or not owned by user");
      return null;
    }

    // 2. Check if an outcome already exists for this query
    const { data: existing } = await supabase
      .from("wisdom_outcomes")
      .select("id")
      .eq("query_id", input.queryId)
      .eq("user_id", userId)
      .maybeSingle();

    const payload = {
      query_id: input.queryId,
      user_id: userId,
      status: input.status || "completed",
      action_taken: input.actionTaken !== undefined ? input.actionTaken : null,
      actual_result: input.actualResult || null,
      user_notes: input.userNotes !== undefined ? (input.userNotes || "").trim() : null,
      occurred_at: input.occurredAt
        ? new Date(input.occurredAt).toISOString()
        : new Date().toISOString(),
      feedback_rating:
        typeof input.feedbackRating === "number" && input.feedbackRating > 0
          ? Math.max(1, Math.min(5, Math.round(input.feedbackRating)))
          : null,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing?.id) {
      const { data, error } = await supabase
        .from("wisdom_outcomes")
        .update(payload)
        .eq("id", existing.id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from("wisdom_outcomes")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) throw error;
      result = data;
    }

    return result as WisdomOutcomeRecord;
  } catch (err) {
    console.error("[upsertWisdomOutcome] Unexpected error:", err);
    return null;
  }
}

/**
 * STEP 4.3 — Outcome Tracking: Delete outcome record
 */
export async function deleteWisdomOutcome(
  supabase: SupabaseClient,
  userId: string,
  queryId: string
): Promise<boolean> {
  if (!userId || !queryId) return false;

  try {
    const { error } = await supabase
      .from("wisdom_outcomes")
      .delete()
      .eq("query_id", queryId)
      .eq("user_id", userId);

    return !error;
  } catch (err) {
    console.error("[deleteWisdomOutcome] Unexpected error:", err);
    return false;
  }
}

/**
 * STEP 4.3 — Personal Wisdom Statistics: Computes user's wisdom loop metrics
 * Does NOT self-modify engine logic — purely summarizes user reflection & accuracy
 */
export async function getWisdomStats(
  supabase: SupabaseClient,
  userId: string
): Promise<PersonalWisdomStats> {
  if (!userId) {
    return {
      totalQueries: 0,
      trackedOutcomes: 0,
      actionTakenCount: 0,
      successRate: 0,
      averageRating: 0,
    };
  }

  try {
    const [queriesRes, outcomesRes] = await Promise.all([
      supabase
        .from("wisdom_queries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("wisdom_outcomes")
        .select("id, status, action_taken, actual_result, feedback_rating")
        .eq("user_id", userId),
    ]);

    const totalQueries = queriesRes.count || 0;
    const outcomes = (outcomesRes.data || []) as WisdomOutcomeRecord[];
    const completedOutcomes = outcomes.filter((o) => o.actual_result !== null);
    const trackedOutcomes = completedOutcomes.length;
    const actionTakenCount = completedOutcomes.filter((o) => o.action_taken === true).length;

    const successfulOutcomes = completedOutcomes.filter(
      (o) => o.actual_result === "accurate_success" || o.actual_result === "accurate_neutral"
    ).length;

    const successRate =
      trackedOutcomes > 0
        ? Math.round((successfulOutcomes / trackedOutcomes) * 100)
        : 0;

    const ratings = completedOutcomes
      .map((o) => o.feedback_rating)
      .filter((r): r is number => typeof r === "number" && r > 0);

    const averageRating =
      ratings.length > 0
        ? Number((ratings.reduce((acc, cur) => acc + cur, 0) / ratings.length).toFixed(1))
        : 0;

    return {
      totalQueries,
      trackedOutcomes,
      actionTakenCount,
      successRate,
      averageRating,
    };
  } catch (err) {
    console.error("[getWisdomStats] Error calculating stats:", err);
    return {
      totalQueries: 0,
      trackedOutcomes: 0,
      actionTakenCount: 0,
      successRate: 0,
      averageRating: 0,
    };
  }
}
