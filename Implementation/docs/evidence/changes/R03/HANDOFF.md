# R03 handoff — administration, optional defaults and reports

Status: **IMPLEMENTED_PENDING_COORDINATOR_FINAL_REVIEW / USER_MANUAL_TEST**. All approved dependency checkpoints are imported. This is a source delivery, not SQL/business acceptance. No service or database was started, stopped or modified. No main merge, push or deployment.

## Source and dependencies

- Worktree: `C:\Users\alexy\.codex\worktrees\8add\FYP Dev`.
- Branch: `codex/r03-admin-reporting`.
- Baseline: `cbd4025d92a5d8dc3faeb3d874de16ba4589c89c`.
- R03 functional source commit: `b55bec85e967218f76241de94972c377ac8123f6`.
- Reviewed source/dependency head before final evidence: `2d43605f2a30e147ddcd696a661c7e50bdff559d`; the evidence-only final commit/head is reported in the coordinator handoff message.
- Coordinator-requested copy repairs: `ccef771e3d11136a3d66f8ae62855c133c44ec48` (inventory filter scope/comment), `0cea15b35f3bbacb210dd634a0def52a4149d550` (manual pass handling/legacy reader capability text). Text/comment-only diffs were reviewed without repeating builds per coordinator instruction.
- Coordinator-reviewed R02 V9 source: `5b80b0ac22aba150d1aabd024cc50302ff967c2d`, imported as `900acccc8c3378a46e328cf6afea1e5622445355` with explicit coordinator instruction. Imported files are R02-owned and were not edited by R03.
- Coordinator-approved R01 V8/port checkpoint `bb963e6e4887141e1d69390ac82b3a072b12add3` and legacy-only fallback repair `58bb6dbda4f52871720e52463e76b110b35cdeb3` were imported in order as `ef67819d4ecb847298c4267e23a5d6c7989c6bd5` and `2d43605f2a30e147ddcd696a661c7e50bdff559d`. Exact V8 relation/backfill and V9 assignment columns match R03 read SQL. These imported files remain R01-owned, including its approved shared audit-enum checkpoint; R03 did not edit them.
- Coordinator decisions C-R01/C-R02/C-R03 authorize the exact nullable settings/source-pair/destination/export history shape in CONTRACT.md. No V10 or shared source/config/generated/launcher/seed/runbook edits.

## Result

- Existing ADMIN account creation, role/permission mutation, last-admin gate, session revocation, reference history and counter behavior are retained. ADMIN does not gain staff issue/return authority.
- Return-hours defaults accept an explicit null for no deadline or integer 1..720, with existing key/version/reason, canonical authority/setting locks, local audit and immutable before/after history. Missing value is rejected. Strict JSON parsing rejects unknown/duplicate/missing/coerced/trailing fields; JDBC null is not zero. No historical due_at is recalculated.
- Reports distinguish submitted registrations, distinct registrations issued/open, pass issues/actual returns/lost closures, current open passes, no-deadline passes and overdue passes. Distinct registrations are not claimed to be distinct people. Current metrics ignore historical date filters.
- Inventory/utilisation deliberately apply category only and ignore the issued-destination filter, including destination-bound new manual inventory. Coordinator source review requested and received this explicit wording correction.
- Settings capabilities explicitly label configured mock reader as historical/simulation and state that manual issue/return requires no reader. Configuration remains unchanged.
- Registration filters use EXISTS over requested destinations; labels aggregate/sort without fan-out or GROUP_CONCAT truncation. Pass filters use actual issued destination snapshots, with root fallback only for genuinely legacy SIMULATED rows lacking assignment.destination_id.
- Pass history shows full MYT issue/actual-return/deadline/closure dates and seconds, staff actor IDs, method and data origin. Null due is displayed as no return deadline and excluded from overdue. Partial returns remain separate pass rows. Lost closure never supplies an actual return, unknown legacy closer is explicitly unavailable.
- Registration export remains available. New deliberate POST `/api/admin/reports/pass-exports` uses the same ADMIN proof/CSRF boundary, formula-protected quoted CSV, at-most-10000 row policy, actual escaped-JSON UTF8 bound, local export audit and history commit. Safe history whitelist records exportKind, rowCount, from, to, categoryId and destinationId only. Exports never auto-retry, and duplicate clicks are guarded synchronously.
- General reports/CSV never query/output form_data, patient name, MRN, IC, phone or address. Existing reference text validation remains applied. All source/method pairs and deployment environments are explicit; PHYSICAL/live records are not broadened into reports.

## Owned files

- Backend administration: `AdministrationController.java`, `AdministrationService.java`, `CONTEXT.md`.
- Backend reporting: `ReportFilter.java`, `ReportingController.java`, `ReportingService.java`, new `PassReportRow.java`, `CONTEXT.md`.
- Frontend administration: `contracts.ts`, `reports.tsx`, `settings.tsx`, `CONTEXT.md`.
- Evidence: `docs/evidence/changes/R03/CONTRACT.md`, this HANDOFF.md.

## Checks actually executed

| Check | Result / meaning |
|---|---|
| `pnpm install --frozen-lockfile` | PASS, ignored node_modules only; tracked lockfile unchanged |
| `pnpm run build` | PASS; TypeScript and Vite production bundle, no browser/application startup |
| `pnpm run lint` | PASS, oxlint |
| `.\mvnw.cmd -DskipTests package` | PASS after final R03 functional source changes (79 main/26 existing test sources) and again after approved R01 Java dependencies at source head `2d43605` (80 main/26 existing test sources, BUILD SUCCESS, 2026-10-27 08:22 MYT). Surefire explicitly `Tests are skipped.` No test bodies executed |
| `git diff --check` / staged check | PASS; Git LF/CRLF normalization warnings only |
| Source/diff/schema contract review | Completed for R03 and reviewed exact R01 V8 / R02 V9 checkpoints; SQL not executed |

Vite emitted a >500 kB bundle warning (557.71 kB JS, 169.18 kB gzip). No dependency, global bundle, generated-contract or unrelated optimization change was made. Maven notes the existing RegistrationStore deprecated API.

**NOT_RUN:** unit/integration/business/concurrency tests, SQL/migration execution, old-database upgrade verification, application/demo startup/shutdown, browser/UAT, live integrations, restore/backup drills. Build success is not business PASS. No native or demo database access/change.

## Manual checks after separately authorized complete integration

1. With the complete reviewed R01/R02/R03 source/schema set and the user's chosen backup/startup procedure, inspect preserved old registration/pass history and old deadlines. Do not apply this module alone to a running demo.
2. As ADMIN, change a category default from hours to explicit no deadline and back; verify reason/history/version, stale version conflict and missing/duplicate/value-boundary rejections. Confirm old assignments keep their recorded due_at and staff per-pass choices can override defaults.
3. For Vendor/Contractor one registration with three passes across destinations, verify one submitted registration, one distinct issued registration and three issued passes. Return one pass and inspect one actual return, two open passes and correct remaining registration count.
4. Inspect an active pass without deadline separately from overdue counts, including one issued before the selected report period. An expired dated open pass counts overdue at the server boundary; null due does not.
5. Compare pass list/CSV issue/actual-return/closure dates and staff IDs across MYT midnight. Lost has no actual return/out; known old closers are retained and unknown old closer is unavailable.
6. Compare requested-location registration filtering versus actual-issued-location pass filtering, including inactive historical references and legacy single-destination records. Missing new destination data must not silently fall back.
7. Verify both CSV kinds remain fully masked/formula-protected, enforce row/escaped-byte limits without truncation and create distinguishable safe export history. Inspect no raw patient/IC/MRN/form/CSV data enters audit/history. Check unauthorized/stale views and uncertain export response without automatic retry.

Coordinator retains integration/review ownership. Main merge and application startup require the later human instruction in planning/16.
