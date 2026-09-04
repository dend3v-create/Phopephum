/**
 * wisdom.server.ts — Unified Wisdom Memory Service (STEP 4.2)
 *
 * Thin server service for managing wisdom queries, stored snapshots, and bookmarks.
 * Enforces authenticated user ownership and Supabase RLS boundaries on every database call.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

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
}

export interface WisdomHistoryFilters {
  intent?: string;
  bookmarkedOnly?: boolean;
  limit?: number;
  offset?: number;
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
    const { data, error } = await supabase
      .from("wisdom_queries")
      .insert({
        user_id: userId,
        question: cleanQuestion,
        intent_category: input.intentCategory || "general",
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
        engine_snapshot: input.engineSnapshot || {},
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
 * Phase B — Retrieve wisdom history with optional filters
 * Enforces ownership: only records belonging to `userId` are retrieved.
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

    const { data, error } = await query;

    if (error) {
      console.error("[getWisdomHistory] Supabase fetch error:", error);
      return [];
    }

    return (data || []) as WisdomQueryRecord[];
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
    const { data, error } = await supabase
      .from("wisdom_queries")
      .select("*")
      .eq("user_id", userId)
      .eq("id", queryId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as WisdomQueryRecord;
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
