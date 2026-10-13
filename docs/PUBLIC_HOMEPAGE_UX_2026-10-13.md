# Public homepage UX — 13 October 2026

Entry point: `/` (phopephum.com), visible without signing in.

The preceding mobile UX change affected `/dashboard`. This change adds the requested mobile-app-inspired design to the public homepage itself.

## UI changes

- A new split hero on desktop and stacked hero on mobile, with the brand promise, a calm Navy–Gold message card and a decorative solar motif.
- Three task shortcuts: timing demo, existing personal horoscope and existing planner. Member-only shortcuts are explicitly labelled as requiring sign-in.
- A mobile navigation dock: วันนี้ / ฤกษ์ / ปฏิทิน / ดวง / ฉัน, linked to existing sections and routes.
- Responsive public navigation through tablet widths; no hidden-navigation gap between the mobile and desktop breakpoints.
- Light mode uses cream surfaces and dark gold text; dark mode uses Navy–Gold.
- Shorter anonymous homepage cache (300 seconds at the edge, browser revalidation) to limit stale homepage presentation. Signed-in responses retain their private cache policy. Referral attribution behavior is preserved.

No fabricated forecasts, demo scores or birth-chart artwork are added. The decorative solar rings have no calculation meaning. Existing timing widget, pricing, engine, entitlement and payment behavior are preserved.

## Verification

Web TypeScript and production build passed locally. CI and a deployed public preview must be checked before production merge. Verify the homepage heading and three task cards, the timing anchor, menu drawer, theme toggle, keyboard focus and narrow-screen wrapping. Check the public root after deployment, rather than using a stylesheet fingerprint alone as evidence of the requested UI change.

The previous production health-check issue remains an independent operational concern; this UI change does not alter or relax the health gate.
