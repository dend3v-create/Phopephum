/**
 * theme.ts — Astral Imperial Mobile Design Tokens
 * ============================================================================
 * Design System tokens for PhopePhum Mobile App
 * Background: Cosmic Dark (#020617)
 * Accents: Imperial Gold (#C6A96B), Mystic Blue (#4B6FAE)
 * Text: Celestial White (#F8F6F1)
 */

export const ASTRAL_THEME = {
  colors: {
    // Cosmic Backgrounds
    bg: "#020617",
    bgCard: "rgba(10, 34, 64, 0.58)",
    bgCardSolid: "#0A2240",
    bgCardBorder: "rgba(198, 169, 107, 0.25)",
    bgOverlay: "rgba(2, 6, 23, 0.95)",
    bgElevated: "#0F172A",

    // Imperial Gold Accents
    gold: "#C6A96B",
    goldLight: "#DFCA97",
    goldMuted: "rgba(198, 169, 107, 0.4)",
    goldGlow: "rgba(198, 169, 107, 0.15)",
    goldBorder: "rgba(198, 169, 107, 0.3)",

    // Mystic Blue Accents
    mystic: "#4B6FAE",
    mysticLight: "#7B9AD0",
    mysticMuted: "rgba(75, 111, 174, 0.3)",

    // Celestial Text
    text: "#F8F6F1",
    textMuted: "rgba(248, 246, 241, 0.65)",
    textDim: "rgba(248, 246, 241, 0.4)",

    // Status Colors
    success: "#10B981",
    successBg: "rgba(16, 185, 129, 0.15)",
    warning: "#F59E0B",
    warningBg: "rgba(245, 158, 11, 0.15)",
    danger: "#EF4444",
    dangerBg: "rgba(239, 68, 68, 0.15)",
    info: "#38BDF8",
    infoBg: "rgba(56, 189, 248, 0.15)",
  },

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};
