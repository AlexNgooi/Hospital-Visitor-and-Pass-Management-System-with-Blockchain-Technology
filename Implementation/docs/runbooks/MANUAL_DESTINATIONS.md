# Registration destinations and visitor records — 2026-11-17

This increment is implemented on `codex/admin-management-redesign`. The user explicitly authorized V11 and the latest-version switch on 2026-11-17. V11 is now applied successfully to the existing dedicated `hsaas_manual_native` schema, and the latest worktree is running at http://127.0.0.1:15417/login. Backend health and web readiness returned HTTP 200. Before/after counts remained 10 registrations, 9 cards and 7 loans; original runtime keys were verified unchanged. These startup/read-only checks are not browser, business or concurrency acceptance, which remain NOT_RUN.

## Business behavior

- Executive: select an active **Ward**, enter patient name and bed number. New forms use `manual-registration-v3`; v1/v2 history and successful replay encodings remain readable. Old records are not assigned invented bed numbers.
- Penjaga: retain mock MRN lookup, trusted read-only patient/ward/bed snapshots, separate terms and existing staff manual fallback. Only Ward references are selectable. This is not a live hospital API or automatic staff approval. Existing special pass category and one-active-pass rule remain.
- Vendor/Contractor: retain company and one-or-more destinations, including Wards and Other destinations. No new patient, MRN or company verification requirement. Their multiple-active-pass exception remains.
- Physical passes have a category/code/status, without a destination restriction. Old `cards.destination_id` remains historical and is ignored for new manual eligibility. Enrollment no longer needs a destination; the old destination query filter is rejected rather than misleadingly filtering inventory.
- New loans snapshot the **complete registered destination set**, independently for every selected card. Two passes for one A/B registration both refer to A/B, not invented individual A/B recipients. Returns/lost closures and existing deadlines/idempotency/card uniqueness are retained.
- Every referenced location must still be active for new issue. Disabling a reference never blocks return/lost/history. Registrations and loan snapshots are immutable; reference corrections apply to future registrations.

## Admin experience

The hidden drawer now has Overview, Staff management, Pass management, Destination management and System audit. Destination management follows the compact task shell, filter modal, internally scrolling table and create/edit modal. Codes are immutable; names, Ward/Other type and active state use versioned audited edits. Referenced destinations are not deleted. Operational settings retains its existing reference editor with the same kind field/API.

Overview → View details offers explicit **Visitor registrations**, **Pass borrowing history**, and **Visitor activities** views (50 rows/page), plus a registration timeline across all recorded dates. Names load only after a deliberate selection and a CSRF-protected, current-ADMIN check. A field-free `REPORT_VIEWED` audit commits before response. No IC, phone, address, patient name/bed or MRN enters these projections. Names are root-owned through `RegistrationReportingPort`, not independently parsed by reporting.

Activities combine registration submitted/approved/rejected/No pass audits with issued/returned/lost/recorded-overdue lifecycle events. No pass therefore appears even when no assignment exists. A No pass historical marker is not the current custody status if cards were later issued. Issue/return remain staff handover/receipt, not physical door movement; destinations are intended registered locations. Borrowing contacts are registration owners, not separately verified recipients of each card.

## CSV semantics

Export CSV opens a report-type modal, defaulting to Pass borrowing history. Each file has one row grain; the mixed 25-column compiled file is no longer exposed. Its old endpoint delegates to a pass-history export.

| Report | Period filter | Row and snapshot meaning |
|---|---|---|
| Registrations | Submitted time in inclusive MYT dates | One registration, visitor name, requested destinations, review status; lifetime issued count, current unreturned count and historical No pass marker are labelled separately |
| Pass borrowing history | Issued time in inclusive MYT dates | One loan, physical code, visitor/registration, destination snapshot/basis, full MYT issue/deadline/actual-return/closure times and readable current staff name/login |
| Activities | Event time in inclusive MYT dates | One recorded event, visitor/registration, card where applicable, registered destinations and actor |
| Summary | Per-metric basis | Counts retain separate registration/pass grains; current counts ignore dates, inventory also ignores destination |

Destination filters use the registration relation via EXISTS and count each registration/loan once. New loans show all captured destinations; legacy per-loan snapshots retain their old meaning. No deadline, not returned and lost closure remain distinct. Staff names/logins are current account labels, not immutable historical identity snapshots. Full matching results are exported, not just the loaded page; >10000 rows or the escaped 1 MiB response bound rejects without partial CSV. UTF-8 BOM, quoted fields, formula neutralization and committed export audit remain. CSV content/names never enter audit, history or diagnostics. Chart PNG export is unchanged. A failed/uncertain response may have committed its audit; exports do not retry automatically.

## V11 preparation and rollout — dedicated native execution completed

1. Use the manual native runbook and the explicitly chosen dedicated demo schema; do not operate on `hsaas_db` or the MySQL service. Back up before migration. Actual execution requires separate explicit authorization.
2. Review destination kinds. V11 classifies `DEMO_WARD`, `WARD%`, existing Executive/Penjaga references and prior MRN ward references as Ward; others start as Other. This is an initial classification, not a verified hospital catalogue.
3. Registration destination snapshots backfill the labels visible **at migration time**. Older names cannot be reconstructed. Existing per-pass snapshots and old physical bindings are not rewritten. V1–V10 remain immutable.
4. Apply V11 and switch the coordinated backend/frontend together. Old application writers do not supply the new required registration snapshot columns; do not leave old/new writers sharing the migrated schema.
5. V11 relaxes physical-stock provenance without broadening source/environment pairs, adds explicit LEGACY/REGISTRATION loan scope and creates `assignment_destinations`. Existing active-card and Executive/Penjaga single-active uniqueness remain.
6. A failure after some MySQL DDL must be inspected against the backup; do not blindly replay, clean, repair or roll back with data deletion.

## User-run acceptance — all NOT_RUN

- Check 1480×667, 1159×667, 920×667 and narrow/zoomed layouts; drawer, filter drafts, modal focus/close behavior, sticky tables and pagination.
- Add Ward/Other, rename, reclassify and deactivate; stale versions conflict. New forms exclude inactive/incorrect-kind references, old registration and loan labels remain stable, existing return/lost operations still work.
- Executive requires patient name/bed and Ward; Vendor/Contractor accept multiple registered locations without new patient requirements. Confirm existing IC/Lesen rules.
- Penjaga mock success, changed/expired MRN, late response, failure/manual fallback and staff comparison. Non-Ward/disabled mock locations must not create successful verification.
- Enroll without destination; reuse old bound stock for another registered destination of the same category; reject wrong category or unavailable stock. Vendor A/B with two passes keeps A/B on both; partial return and lost remain independent. Executive/Penjaga still allow one active pass.
- Confirm No pass persists with no loan, later issue remains possible, and timeline distinguishes both operations.
- Compare all CSV types to the matching views, including zero rows, duplicate names, multiple loans, non-ASCII/formula-leading names, multiple destinations, no deadline, unreturned and lost records. Check complete export limits, auth/CSRF denial and audit-before-response.
- Check historical v1/v2 reveal and replay, v3 Executive bed, old pending-command recovery, role revocation, concurrent issue/reference changes and existing chart export.

## Static verification

Frontend TypeScript/Vite build and lint: PASS. Backend source compilation and executable JAR packaging using the unchanged dependency/plugin configuration with temporary source/resource/output paths and all tests skipped: PASS. The first ordinary target repackage failed because the running application held the target JAR; it was not stopped. Planning reference check and diff whitespace check are recorded with delivery. These are not SQL or business acceptance.

## Authorized native switch — 2026-11-17

The existing launcher/children were stopped through their private control; MySQL was not restarted. The verified executable artifact from `tmp/destination-backend-build/` was copied to this worktree backend target, preflight passed, and a hidden native launcher started from this worktree using `--runtime-root C:/Users/alexy/Documents/FYP Dev/Implementation`. Normal startup applied only pending V11 via Flyway, without initialize/reseed/restore. Current process IDs: launcher/control 23460, backend 26076, frontend 27348. Configuration, control, keys, logs and backups stay in the original runtime in place. No merge/push or original hsaas_db operation occurred.

The pre-migration backup is `2026-11-17T08-46-55-855Z-v11-4f7dfc` under that runtime's ignored `tmp/manual-demo-native/backups/`; post-migration backup is `2026-11-17T08-49-12-091Z-bf2201`. Both have completion markers. The initial launcher backup attempt failed because mysqldump 8.0 rejects `--connect-timeout=3`. `manual-demo.mjs` now retains that argument for mysql only; a guarded native dump completed before the switch, and the new launcher's backup command then completed successfully. The earlier incomplete backup directory is retained without a completion marker and must not be used for restore. No private backup contents enter Git.
