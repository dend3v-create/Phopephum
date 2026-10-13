# PHOPEPHUM — Astral Dawn theme v1

Purpose: Ancient Wisdom × AI Intelligence × Time × Self Discovery, expressed as a calm mobile web-app experience.

## Visual system

- Midnight sky: #07172A and #050E1B.
- Insight: Royal Gold #D4AF37 and Warm Gold #F6D88C.
- Light mode: Sunrise Cream #FDF8E8 with readable dark-gold text #76590B.
- Static stars, a decorative celestial seal and a mountain-horizon silhouette form the background. The artwork is symbolic, not a calculated chart.
- Cards have quiet gold borders, translucent but sufficiently opaque surfaces, restrained depth and 22–28px radii.
- The mobile public navigation becomes a floating dock, keeping safe-area padding and existing route behavior.

## Implementation

`WisdomAtmosphere` and `CelestialSeal` are shared decorative React/SVG components. `astral-dawn.css` scopes presentation to `.pp-theme-shell`; both PublicLayout and DashboardLayout opt in. Existing theme preference persistence and light/dark switching are retained.

No raster background downloads, additional packages, animation loops, engine imports or computed astrology values are added. The SVG gradient IDs use React useId to avoid collisions between multiple decorative seals and remain SSR-safe.

The background is inert, aria-hidden and behind content. Card text stays on opaque surfaces. Reduced-motion and forced-colors modes are supported. The member layout keeps its existing dialog/sidebar stacking order.

## Validation

- Web TypeScript: PASS.
- Web production build: PASS.
- git diff --check: PASS.
- Review the deployed public preview in dark and light modes before merge.
- Real-device and authenticated member visual QA are not claimed by these build checks.

## Scope

Presentation only. Loaders, routes, authentication, engine, payment, Sands, pricing and entitlement checks remain unchanged. The existing production health-check timeout is not modified or bypassed by this theme.
