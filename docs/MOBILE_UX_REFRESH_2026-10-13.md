# Phopephum mobile web UX refresh — 13 October 2026

## Intent and references

Bring the mobile-app references supplied by the owner into the existing Remix website. This change targets the mobile website, not the Expo application.

- SOULRA Message reference (`8fc0a5a1e83bb6f2ade4386eae3bc619.jpg`): a prominent daily message, restrained decorative orbit and separate guidance cards.
- SOULRA Solar Return reference (`70a50bbcdd380c02a466241979c8660b.jpg`): clearly grouped life domains and a dedicated timing card.
- Relationship analysis reference (`34ef5d748449df0fc345cb915585c4ca.jpg`): simple navigation with an obvious selected state.
- Retain Phopephum's Navy–Gold identity and its existing five routes. Reference branding, Western chart systems and predictions are not copied.

## Result

The Today screen now starts with a daily theme and summary, the existing overall score, a prominent timing action, four domain cards when provided, and a recommended time card. All content comes from the existing authenticated loader's `CalendarDayIntelligence`. No new API, calculation, score conversion or AI-generated prediction is introduced. No-window and empty-domain states are handled explicitly.

The detailed live-yam card is inside a native disclosure, preserving its clock and links while reducing initial screen density. Timeline labels are more readable and period buttons have larger touch targets.

Navigation links expose `aria-current`, rather than pretending to be tab panels. The header is compact at narrow widths, the reminder panel stays inside the viewport, and the floating action respects the device safe area. The viewport includes `viewport-fit=cover`. Daily cards use semantic theme tokens and a darker gold text color in light mode.

## Boundaries

Only web presentation files are changed. Engine, database, auth checks, entitlements, payment/Sands transactions, pricing and server loader behavior are unchanged. The numeric scores are presented as /100, not as outcome probabilities. The daily recommended window is labelled as a recommendation for the day, not as a guaranteed future window.

## Validation

- Web TypeScript: PASS using `node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit`.
- Web production build: PASS using `corepack pnpm --filter @phopephum/web build` with the repository's pnpm 9.15.0.
- `git diff --check`: PASS.
- Root Turbo typecheck was not a valid result in this environment: it invoked the system pnpm 11 wrapper. The direct web compiler check above was run successfully instead.
- Browser/device visual QA: NOT COMPLETE. The cloud browser cannot access this workspace's localhost preview. No authenticated dashboard screenshot or real-device test is claimed.

## Before release

On a preview deployment or locally in Antigravity, verify widths 320, 390 and 430 px, portrait/landscape, both themes, keyboard focus and enlarged text. Check Free and Pro headers, each navigation route, the reminder dropdown, timing action, golden-window calendar link and the live-yam disclosure. Confirm a long display name/summary and the no-window state. Verify that the server-provided scores/time/message match the previous version for the same account and date.

This branch is for review; it does not merge or deploy production.
