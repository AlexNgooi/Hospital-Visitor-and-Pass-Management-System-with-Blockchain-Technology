# M05 lifecycle and inventory UI

## R02 current manual UI (2026-10-27)

Inputs now include planning/15, planning/16 and docs/evidence/changes/R02/CONTRACT.md. Existing slots remain /staff/passes and /admin/cards. AdminInventory enrolls visible unique codes with category/destination and restores with explicit custody checks; StaffLifecycle/ManualIssue select bounded compatible inventory, actual issued destinations and per-pass deadline/no-deadline. Vendor/Contractor may select multiple cards; Executive/Penjaga have one active pass. Individual returns support partial return without closing other loans. Registration-scoped lists expose full MYT issue/actual-return times, server actor IDs and lost closure separately. No manual UI invokes a scan API or creates synthetic evidence. Legacy scan.tsx remains unused by these slots.

Current source contracts distinguish MANUAL method from SYNTHETIC data and historical SCAN/SIMULATED data. Nullable deadlines never call the date formatter and never imply return. UNKNOWN commands retain the immutable original handle; current access loss clears selected registrations/cards/contacts. Deadline wall time is explicitly MYT, independent of the browser timezone. No shared shell/client/generated/dependency edits.

R02 checks: frontend build/lint and source review only. Browser, business/UAT and tests NOT_RUN. See changes/R02/HANDOFF.md for dependency commits, manual scenarios and exact verification limits.

Inputs: planning/03 C/P/N03/local B01, planning/04, planning/14 C18/C19, UI v4 S06-S11/A02-A04 and existing M01 FeatureSlot/ApiClient contracts. Existing shell colors and shared primitives remain authoritative; ui-ux-pro-max interaction guidance was applied without introducing a new design system.

Outputs: counterLifecycleFeatures at /staff/passes and adminInventoryFeatures at /admin/cards. Coordinator owns main.tsx composition. Runtime Zod contracts reject raw UID/form/entity extensions; only real protected APIs are used. No fixture/mock API is bundled.

One immutable UNKNOWN command remains in memory and permits only explicit original-handle retry; later 4xx never proves the original did not commit. Actor/counter change unmounts state. Current access loss clears cached records/contact/evidence. Phones are audited on each actual response and displayed at most 30 seconds, with no storage, links, clipboard or logging. Scan capabilities are memory-only and actor-session-bound.

Initial checks: pnpm run build, pnpm run lint, pnpm run typecheck:test. These are compile/static checks, not UI/business acceptance. No browser/UAT was run. New feature slots are not composed by this module; coordinator will wire and build the integrated bundle. See M05 HANDOFF for manual flow and limitations.
