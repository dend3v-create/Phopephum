# Light theme consistency

The horoscope reading used `#07192F` and inactive topic chips used slate-900/70, while light-theme text became dark. These surfaces now use theme variables.

Shared theme surface tokens cover legacy backgrounds and gradient stops across public, auth, member, calendar, chat, reports, partner and admin UI. Each dark token preserves its previous color; light surfaces use ivory/white. Explicit dark variants and colored CTA fills are retained. No engine, entitlement, data, pricing or auth changes. PDF legal document styling is outside the web theme.

Muted light text uses #64748B, gold semantic text uses #76590B, and native controls use color-scheme. Reminder dropdown and protected-content dialog use theme surfaces and text. Gold button fills remain gold with dark lettering.

Validation: TypeScript, production build, CI gates, public preview dark/light toggle and navigation persistence. Authenticated screens are checked through source and generated stylesheet; a signed-in real mobile session remains necessary for end-to-end visual verification. Existing degraded production health gate remains separate.
