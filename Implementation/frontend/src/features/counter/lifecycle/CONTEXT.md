# 2026-11-16 combined review and issue

## Explicit No pass choice

ManualIssue adds No pass to the pass dropdown, mutually exclusive with selected cards for every category. It hides physical destination/deadline requirements, explains the saved disposition and uses Approve without pass (SUBMITTED) or Record no pass (VERIFIED). No handover confirmation is sent. Existing active assignments or an already recorded decision disable No pass, while later eligible physical issue remains possible. The protected issue-context displays the historical no-pass marker; older responses default this additive marker to false. Distinct immutable commands validate the VERIFIED receipt before closing and announcing success. UNKNOWN still permits only original-command recovery. No-pass records never enter assignment-based return/history lists. Browser/business/SQL acceptance remains user-run / NOT_RUN.

## Current pass returns and history

StaffLifecycle now shows only outstanding issued/overdue pass rows with bounded visitor names, category, Pass ID, destination, status and Return pass. No counter label, registration list/ID, checklist or Previous/Next controls appear. PassTable and usePassFeed consume keyset batches automatically inside a keyboard-accessible scroll region; filters cancel/fence stale reads. Completed returns appear only in the explicitly opened history modal. Time period is a dropdown (This day/month/year/Customize); only Customize shows start/end dates and Apply. MYT return dates define the inclusive day range. CSV is a CSRF-protected, audited server export across all filtered batches, never just loaded rows; limits fail explicitly rather than truncate.

Return details use the existing audited registration field read, render only basic visitor fields, and clear on close/scope/conflict. Pending/UNKNOWN guards prevent dismissal and retain only original-command recovery. A validated RETURN receipt removes the row, closes the modal and shows the shared success toast; shared toasts now fade for 250ms after their normal timeout. Browser, business, scrolling, CSV and SQL acceptance remain user-run / NOT_RUN.

ManualIssue now renders dropdown pass selection, per-pass destination and deadline segments inside the review modal. SUBMITTED uses the atomic approve-and-issue endpoint; VERIFIED uses the existing issue endpoint. Final action confirms handover without a separate checklist. Vendor/Contractor multi-card rules remain. Pass returns owns assignment lookup/return/history; it no longer requires a separate Prepare issue flow. UNKNOWN handles remain immutable in the parent workspace.

# M05 lifecycle and inventory UI

## 2026-11-11 inventory modals

Enrollment and card details use controlled Radix modals. The card row opens through an Eye icon with a card-specific accessible name and an Open card tooltip. Details include card metadata, custody/recovery or lost/disable controls, and local history with explicit loading/retry states. Late history reads are fenced on close; pending/UNKNOWN commands block dismissal and retain original-command recovery inside the modal. Focus returns to the row icon after close/refresh, falling back to enrollment or the inventory heading when needed. Shared toast feedback remains in use. Build/lint are the implementation checks; browser/business acceptance remains user-run / NOT_RUN.

## R02 current manual UI (2026-10-27)

Inputs now include planning/15, planning/16 and docs/evidence/changes/R02/CONTRACT.md. Existing slots remain /staff/passes and /admin/cards. AdminInventory enrolls visible unique codes with category/destination and restores with explicit custody checks; StaffLifecycle/ManualIssue select bounded compatible inventory, actual issued destinations and per-pass deadline/no-deadline. Vendor/Contractor may select multiple cards; Executive/Penjaga have one active pass. Individual returns support partial return without closing other loans. Registration-scoped lists expose full MYT issue/actual-return times, server actor IDs and lost closure separately. No manual UI invokes a scan API or creates synthetic evidence. Legacy scan.tsx remains unused by these slots.

Current source contracts distinguish MANUAL method from SYNTHETIC data and historical SCAN/SIMULATED data. Nullable deadlines never call the date formatter and never imply return. UNKNOWN commands retain the immutable original handle; current access loss clears selected registrations/cards/contacts. Deadline wall time is explicitly MYT, independent of the browser timezone. No shared shell/client/generated/dependency edits.

R02 checks: frontend build/lint and source review only. Browser, business/UAT and tests NOT_RUN. See changes/R02/HANDOFF.md for dependency commits, manual scenarios and exact verification limits.

Inputs: planning/03 C/P/N03/local B01, planning/04, planning/14 C18/C19, UI v4 S06-S11/A02-A04 and existing M01 FeatureSlot/ApiClient contracts. Existing shell colors and shared primitives remain authoritative; ui-ux-pro-max interaction guidance was applied without introducing a new design system.

Outputs: counterLifecycleFeatures at /staff/passes and adminInventoryFeatures at /admin/cards. Coordinator owns main.tsx composition. Runtime Zod contracts reject raw UID/form/entity extensions; only real protected APIs are used. No fixture/mock API is bundled.

One immutable UNKNOWN command remains in memory and permits only explicit original-handle retry; later 4xx never proves the original did not commit. Actor/counter change unmounts state. Current access loss clears cached records/contact/evidence. Phones are audited on each actual response and displayed at most 30 seconds, with no storage, links, clipboard or logging. Scan capabilities are memory-only and actor-session-bound.

Initial checks: pnpm run build, pnpm run lint, pnpm run typecheck:test. These are compile/static checks, not UI/business acceptance. No browser/UAT was run. New feature slots are not composed by this module; coordinator will wire and build the integrated bundle. See M05 HANDOFF for manual flow and limitations.
