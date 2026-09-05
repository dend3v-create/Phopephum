/**
 * authStore.ts — Zustand Authentication & Profile Store
 * ============================================================================
 * Manages mobile user session, profile data, and entitlement tier
 */

import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  email?: string;
  display_name?: string;
  full_name?: string;
  birth_date?: string;
  birth_time?: string;
  birth_place?: string;
  gender?: string;
  plan?: string;
  subscription?: string;
  membership_status?: string;
  membership_expires_at?: string;
  time_sands?: number;
  role?: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  setSession: (session: Session | null) => void;
  fetchProfile: () => Promise<UserProfile | null>;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  setSession: (session) => {
    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
    });
    if (session?.user) {
      get().fetchProfile();
    } else {
      set({ profile: null });
    }
  },

  fetchProfile: async () => {
    const user = get().user;
    if (!user) {
      set({ profile: null });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        set({ profile: data as UserProfile });
        return data as UserProfile;
      }
    } catch {
      // Non-blocking catch
    }
    return null;
  },

  signOut: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({
      session: null,
      user: null,
      profile: null,
      isLoading: false,
    });
  },

  initializeAuth: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        get().setSession(data.session);
      } else {
        set({ session: null, user: null, profile: null, isLoading: false });
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        get().setSession(session);
      });
    } catch {
      set({ isLoading: false });
    } finally {
      set({ isInitialized: true });
    }
  },
}));
