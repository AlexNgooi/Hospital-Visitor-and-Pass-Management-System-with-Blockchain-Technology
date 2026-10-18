# M05 lifecycle and inventory UI

Inputs: planning/03 C/P/N03/local B01, planning/04, planning/14 C18/C19, UI v4 S06-S11/A02-A04 and existing M01 FeatureSlot/ApiClient contracts. Existing shell colors and shared primitives remain authoritative; ui-ux-pro-max interaction guidance was applied without introducing a new design system.

Outputs: counterLifecycleFeatures at /staff/passes and adminInventoryFeatures at /admin/cards. Coordinator owns main.tsx composition. Runtime Zod contracts reject raw UID/form/entity extensions; only real protected APIs are used. No fixture/mock API is bundled.

One immutable UNKNOWN command remains in memory and permits only explicit original-handle retry; later 4xx never proves the original did not commit. Actor/counter change unmounts state. Current access loss clears cached records/contact/evidence. Phones are audited on each actual response and displayed at most 30 seconds, with no storage, links, clipboard or logging. Scan capabilities are memory-only and actor-session-bound.

Initial checks: pnpm run build, pnpm run lint, pnpm run typecheck:test. These are compile/static checks, not UI/business acceptance. No browser/UAT was run. New feature slots are not composed by this module; coordinator will wire and build the integrated bundle. See M05 HANDOFF for manual flow and limitations.
