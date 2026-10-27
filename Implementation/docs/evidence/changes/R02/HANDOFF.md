# R02 manual inventory and lifecycle handoff

Date: 2026-10-27 (Asia/Singapore). State: IMPLEMENTED_SOURCE_CHECKED_PENDING_COORDINATOR_REVIEW_AND_USER_MANUAL_TEST.

Worktree: `C:/Users/alexy/.codex/worktrees/b799/FYP Dev`; branch: `codex/r02-manual-pass`.

## Exact commits and integration order

Baseline is `cbd4025d92a5d8dc3faeb3d874de16ba4589c89c` from actual local main.

| Responsibility | Original commit | Local branch commit |
|---|---|---|
| R02 approved V9 schema and initial contract | `5b80b0ac22aba150d1aabd024cc50302ff967c2d` | same |
| R01 approved V8/root port checkpoint | `bb963e6e4887141e1d69390ac82b3a072b12add3` | `30ca75fe59a52ff3ed1727dec49a8a1e8e725ac0` |
| R01 required legacy-only fallback repair | `58bb6dbda4f52871720e52463e76b110b35cdeb3` | `37a108acf5a4fdd5eb6af4390a8cd49d95f7e111` |
| R02 owned runtime/UI and final wire contract | `f2a2cd9e4e0c48cb879a75de48a09fb10ee8f846` | same |

The final branch head additionally contains this handoff-only commit (exact head is sent to the coordinator). R01 imports were approved by the current coordinator before cherry-pick and were not edited by R02. If the integration branch already contains the originals, import only the two R02 functional commits and handoff; do not duplicate the dependency patches. V9's filename sorts after V8 even though its separate checkpoint was committed first. No migration was executed.

R03 may already contain the isolated V9 checkpoint. Integrate R03 nullable settings/history/reporting plus R01 final MRN/UI delivery before any human-authorized startup. This module does not merge main or modify the running demo.

## Delivered behavior and files

* `backend/.../assignment/ManualInput.java`, `ManualLifecycle.java`: strict fixed-schema manual commands, bounded 1..50 atomic issue, explicit nullable per-pass deadlines, root-owned destinations/category policy, sorted card/assignment locks, current authority, unchanged transaction-local audit/idempotency, selected-pass actual returns and custody-checked recovery. Existing SafeResult holds the batch receipt with registration ID; UI refreshes the scoped assignment list.
* `assignment/LifecycleService.java`, `LifecycleStore.java`, `LifecycleController.java`, `LifecycleInput.java`, `LifecycleConfiguration.java`, `card/CardRules.java`: safe metadata and issue-context reads, optional registration-scoped pass lists, exact source pairs on counts/items/direct rows, null-aware overdue/return/lost transitions, actual actors/times, and manual operation independent of reader mode. The synthetic/test environment restriction is retained. Obsolete scan-dependent enrollment/issue/return/recovery writers were removed; historical scan tables/read support and gated legacy reader actions remain.
* `backend/src/main/resources/db/migration/V9__manual_pass_lifecycle.sql`: nullable settings default/due_at and UID/profile; manual enrollment method and bound destination; assignment method/data provenance and immutable issued destination snapshot; category-specific active-single-registration unique index plus preserved active-card unique; closure actor backfill with unknown historical actor kept null; manual lost recovery without scan evidence. V1–V7 are unchanged.
* `frontend/src/features/counter/lifecycle/{admin,staff,manual-issue,client,contracts,commands,shared}.tsx/.ts`, `lifecycle.css`: manual visible-code inventory/restore, compatible paged inventory selection, multi-destination issue for Vendor/Contractor, one-active Executive/Penjaga, editable category default with explicit no-deadline choice, MYT wall-time editing, individual partial return and registration-specific list, full issue/actual return/closure dates and server actor IDs. Existing FeatureSlots, theme, role split, sticky UNKNOWN command handling and transient audited phone reveal remain.
* Owned CONTEXT files and `CONTRACT.md`: exact source/DDL/locking/wire/null/time contracts, limits and dependency mappings. No shared frontend shell/client/generated/dependency/config/audit/launcher/seed/runbook files were edited.

Manual means operation method, not physical-reader/live-hospital evidence. New assignments use MANUAL/SYNTHETIC, and manual audit uses the existing SYNTHETIC_MANUAL vocabulary. Old SCAN/SIMULATED inventory can be reused manually; unbound legacy stock must still use a root-approved destination. New manual stock is bound to its selected inventory destination. No patient details are stored in the new snapshot or exposed in lifecycle/report routes.

## Checks actually executed

| Check | Result and boundary |
|---|---|
| `pnpm install --frozen-lockfile --offline` | PASS; reused all 161 packages from local store; no dependency/lockfile changes |
| Backend `./mvnw.cmd -DskipTests package` | PASS after final runtime source changes; 81 main and 26 existing test sources compiled; Surefire explicitly says Tests are skipped; no Spring application startup |
| Frontend `pnpm run build` | PASS after final UI changes; TypeScript + Vite; final JS bundle 556.41 kB / gzip 168.87 kB; ordinary >500 kB chunk warning, no build error |
| Frontend `pnpm run lint` | PASS after final UI changes |
| `git diff --check` and `git diff --cached --check` | PASS; Windows Git emitted only line-ending conversion notices |
| Source/diff ownership, SQL/DTO, lock graph, deadline/source/actor review | Completed; no registration SQL/form_data parsing exists in assignment code; every manual write uses server actor/UTC time and same transaction audit/idempotency |

Backend compilation noted deprecated API use in the imported R01 RegistrationStore; it did not fail packaging. Historical test-source compilation is not test execution. No test suite was added/run and frontend test-source typecheck was not run. Old scan-centric executable test fixtures still describe their historical workflow and require a separately authorized update before they can validate the new wire/schema.

Database migration/SQL validation, concurrent transaction execution, application/session/reader-disabled runtime, browser/UI layout, business/UAT, recovery/restore execution and report integration: **NOT_RUN**. Build success does not establish any of these. No push, deployment, main merge, database write/seed/delete, or application/demo startup/shutdown occurred.

## User manual scenarios (all NOT_RUN)

After coordinator review/integration and the human's separate startup instruction, use synthetic registrations/cards only and preserve existing data:

1. With reader disabled and lifecycle explicitly enabled in synthetic/test, log in as ADMIN. Enroll visible codes such as `MAN-DEMO-VENDOR-01` and `MAN-DEMO-VENDOR-02`, category Vendor, compatible active destinations. Confirm no UID/profile/scan is needed; duplicate code and inactive/missing references reject. Check inventory history. ADMIN must not issue/return.
2. Approve a synthetic Vendor/Contractor registration with multiple requested destinations using the R01 staff review flow. At its authorized counter choose Prepare issue. Select available cards across inventory pages, associate each actual eligible destination, leave one no deadline and give another a future MYT deadline. Confirm handover once. Check a distinct pass ID for each, identical immutable batch issue instant, actor, method/data source and destination snapshots.
3. Prepare an atomic batch containing one stale/issued/wrong-category/wrong-destination card or expired deadline. Verify the whole command rejects with no partial assignments/card changes/audit success. Repeat a valid original key/body for exact replay; altered selection/version/destination/deadline under the same key must 409. Simulate uncertain transport manually only in an authorized disposable environment and retry the original handle.
4. Issue one Executive and one Penjaga pass on separate registrations. A second active pass on either registration rejects. Vendor/Contractor may add another later atomic batch. Concurrent attempts for one card must leave one active borrower; simultaneous Executive/Penjaga issues must leave one active pass. Verify database uniqueness and transaction behavior manually; none were executed here.
5. Use View this registration's passes. Return one actually received card. Only that assignment closes, actual returned_at/by are present, its stock becomes AVAILABLE, and other passes stay active. Repeating the original key replays; a new key/stale version cannot fabricate another return.
6. No-deadline passes remain active and returnable/lost-markable, display No return deadline, and never produce overdue alerts/contact-followup eligibility. Due passes become overdue at now >= due_at, including a return/lost command before the periodic monitor has materialized its event. Verify only one overdue event/alert and correct actual-return timing.
7. Mark an active card LOST as ADMIN. Check current closed_by/time, null returned_at/by and resolved alert; normal return refuses it. Restore after confirming custody/code/inventory checks; recovery_method MANUAL and scan FK null, old lost assignment remains closed with no actual return. Disabled-stock recovery also needs explicit checks.
8. Disable a destination/category after issue. Existing actual return/lost/history must remain usable under current staff/counter authority; new issues no longer offer inactive choices. Revoke staff authority/current counter and verify cached selection/contact data clears, endpoints reject, and previous UNKNOWN request is not replaced by a new command.
9. Compare full MYT issue/return/lost dates and nullable due across lifecycle and R03 reports/CSV. Registration counts remain distinct from pass counts. Old SCAN/SIMULATED records keep their old deadline/source and unknown legacy closer remains unknown. Lifecycle explicitly labels unsnapshotted legacy destinations; only R03's reviewed legacy fallback may use the old registration singleton.

## Remaining limits

This is source delivery pending coordinator review and user manual validation. The 50-card command bound and 500-destination metadata bound are technical payload/transaction limits, not new lifetime borrowing policy. Return is deliberately one selected pass per command; there is no bulk-return endpoint. No source/environment expansion, physical reader, live MRN, notification/blockchain integration, new fees, native database policy or hospital-approved recovery policy is claimed.
