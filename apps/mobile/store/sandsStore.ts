/**
 * sandsStore.ts — Zustand Sands Micro-Economy Store
 * ============================================================================
 * Reactive state for Sands of Time balance and refill workflows
 */

import { create } from "zustand";
import { supabase } from "../lib/supabase";

interface SandsState {
  balance: number;
  isLoading: boolean;
  fetchBalance: (userId: string) => Promise<number>;
  setBalance: (balance: number) => void;
}

export const useSandsStore = create<SandsState>((set) => ({
  balance: 0,
  isLoading: false,

  fetchBalance: async (userId: string) => {
    if (!userId) return 0;
    set({ isLoading: true });

    try {
      // 1. Try server RPC first
      const { data: rpcBalance, error: rpcErr } = await supabase.rpc("get_user_sands_balance", {
        p_user_id: userId,
      });

      if (!rpcErr && typeof rpcBalance === "number") {
        set({ balance: rpcBalance, isLoading: false });
        return rpcBalance;
      }

      // 2. Fallback to profile table
      const { data: profile } = await supabase
        .from("profiles")
        .select("time_sands")
        .eq("id", userId)
        .single();

      const bal = profile?.time_sands ?? 0;
      set({ balance: bal, isLoading: false });
      return bal;
    } catch {
      set({ isLoading: false });
      return 0;
    }
  },

  setBalance: (balance: number) => set({ balance }),
}));
