/**
 * api.ts — Centralized Mobile API Client
 * ============================================================================
 * Thin Client API layer communicating with PhopePhum Web Backend
 * Server remains Single Source of Truth for Quota, Sands, and Entitlement.
 */

import { supabase } from "../lib/supabase";

const API_BASE_URL = (process.env.EXPO_PUBLIC_APP_URL || "https://phopephum.com").replace(/\/$/, "");

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

/**
 * Generic Authenticated Fetch Helper
 */
async function authFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string; status: number }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "PhopePhum-Mobile/3.0.0",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const status = response.status;
    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = (json as any)?.error || `Request failed with status ${status}`;
      return { success: false, error: errorMsg, status };
    }

    return { success: true, data: json as T, status };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Network error. Please check your internet connection.",
      status: 0,
    };
  }
}

// ─── API Endpoints ────────────────────────────────────────────────────────────

/**
 * Generate AI Report via Server
 * Deducts Sands and verifies Quota securely on the backend.
 */
export async function generateAiReportApi(reportType: string): Promise<{
  success: boolean;
  report?: any;
  error?: string;
}> {
  const res = await authFetch("/api/reports", {
    method: "POST",
    body: JSON.stringify({ report_type: reportType }),
  });

  if (!res.success) {
    return { success: false, error: res.error };
  }

  return { success: true, report: res.data };
}

/**
 * Save Daily TQM Planner Journal
 */
export async function saveDailyJournalApi(payload: {
  date: string;
  intention?: string;
  priorities?: string[];
  reflection?: string;
}): Promise<{ success: boolean; error?: string }> {
  const res = await authFetch("/api/journal-save", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return { success: res.success, error: res.error };
}

/**
 * Pull Daily Energy Card & Receive Daily Ritual Reward
 */
export async function pullDailyCardApi(): Promise<{
  success: boolean;
  card?: any;
  sandsReward?: number;
  error?: string;
}> {
  const res = await authFetch("/api/daily-card", {
    method: "POST",
    body: JSON.stringify({ action: "draw_daily_card" }),
  });

  if (!res.success) {
    return { success: false, error: res.error };
  }

  return { success: true, card: res.data };
}

/**
 * Create PromptPay QR Checkout for Sands Refill or Subscription Upgrade
 */
export async function createCheckoutQrApi(sku: string): Promise<{
  success: boolean;
  checkout?: {
    chargeId: string;
    amountThb: number;
    qrDownloadUri?: string;
    qrRawData?: string;
    expiresAt?: string;
    sku: string;
  };
  error?: string;
}> {
  const res = await authFetch("/api/payment/checkout", {
    method: "POST",
    body: JSON.stringify({ sku }),
  });

  if (!res.success) {
    return { success: false, error: res.error };
  }

  return { success: true, checkout: res.data };
}

/**
 * Poll Payment Status
 */
export async function pollPaymentStatusApi(chargeId: string): Promise<{
  success: boolean;
  payment?: {
    status: "pending" | "successful" | "failed" | "expired";
    isFulfilled: boolean;
    sku: string;
    grossAmountThb: number;
  };
  error?: string;
}> {
  const res = await authFetch(`/api/payment/status/${chargeId}`, {
    method: "GET",
  });

  if (!res.success) {
    return { success: false, error: res.error };
  }

  return { success: true, payment: res.data };
}
