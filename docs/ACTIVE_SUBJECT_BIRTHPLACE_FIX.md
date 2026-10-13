# Active subject birthplace updates

The horoscope loader sent birthplace into the calculation but omitted it from the returned initial result. The view then fell back to the account owner location. Add/edit also closed the form and reloaded after 800ms, even if persistence had not finished or failed.

Return the active subject birthplace in the chart result, use active subject metadata for location fallback, and sync saved loader updates while preserving a fresh manual calculation action. Add/edit stays open until fetcher completion, blocks duplicate submissions and reports save errors. Creating from the banner returns the saved ID, sets the active subject cookie and navigates to that subject. Update requires an owned row to report success.

No engine formulas changed. A birthplace update changes saved/displayed context; date/time-based matrix values need not differ only because a province changes.

Regression test: `pnpm --filter @phopephum/web test` runs real create/update actions, active-subject resolution and horoscope loader against isolated database/auth/engine fixtures. Covers account/customer location isolation, edit/reload handoff to engine input, new subject activation, stale action precedence, missing/foreign IDs and persistence errors. TypeScript and production build checked. Test is included in existing web package test/CI pipeline.

Production personal records were not changed in tests. A signed-in real-device save/edit visual check remains necessary.
