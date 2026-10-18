# M05 Card & Assignment Simulation handoff

Status: **REVIEW_READY / PENDING_USER_MANUAL_TEST**, 2026-10-18. This module has not merged main, pushed or deployed. Necessary static/build checks passed; the narrow SQL check was blocked before its test bodies. This is not business acceptance.

## Identity, authorization and source

- Current coordinator: `01a14da5-91fe-7bf1-a120-183975085f8b`, host local. M05 chat: `01a14da7-8089-7203-a52e-2a7b03f918bf`.
- Human 2026-10-18 authorization and module delegation permit direct implementation, necessary checks, bidirectional coordinator questions/repairs and coordinator-only local merge. No repeated routine permission is needed. planning/14 supersedes older coordination/testing rules for M05-M07.
- Actual isolated path: `C:/Users/alexy/.codex/worktrees/cb05/FYP Dev`.
- Branch: `codex/m05-card-assignment`.
- Initial baseline: `d103b888527c4ba8e90f37d93059daf2d78ed02f`, clean/detached; a dedicated branch was created before writes.
- Shared dependency fast-forward: `fd18ef67cba40aadc37b4b1ea4b021b32571b8ea`, coordinator's fixed audit/idempotency enum extension and planning C18 record. M05 did not edit those common files.
- Stable implementation source: `cbf738eed60886b18141b08d05b84e688ffa0db2`. This handoff is in a subsequent evidence-only commit; the exact final evidence HEAD is dispatched to coordinator, avoiding a self-referential hash.
- M00-M04 already merged locally but combined manual acceptance remains pending. Historical PASS receipts retain their original scope; none proves M05 behavior.

## Delivered behavior

Real protected backend and frontend functionality covers C01/C02/P01-P05/N03/local B01 within simulation:

- ADMIN enrolls a finite trusted sample using ENROLL scan evidence. UID/profile/category are derived exclusively by server SyntheticReader. Inventory exposes masked UID, category/state/version and safe local history.
- Per counter, a lazily provisioned SIMULATED device has one active 120-second scan job. Actor, exact session owner, device, counter, purpose, target, environment, nonce/lease digest and expiry bind accepted evidence. Nonce/lease use domain-separated HMAC and are only returned to the job's original currently authorized actor/session. Cancel/expiry/consumption fences old evidence.
- Staff issue requires VERIFIED synthetic root, AVAILABLE matching card, same environment, valid ISSUE evidence, original registration version and explicit simulated handover. Assignment, inventory state, consumed scan, lifecycle event, local audit and successful idempotency result commit atomically. Pass ID is assignment reference, never UID.
- Issue snapshots current category `return_hours_*` hours/key/version. Defaults are 24 hours, adjustable by M06 within 1..720 hours. Stored due_at never changes when configuration changes; this is DEMO policy, not hospital approval.
- Staff RETURN requires the assignment's original issue/return counter, current counter permission, valid RETURN evidence and explicit simulated receipt. The old loan closes RETURNED and inventory becomes AVAILABLE atomically; LOST direct return is refused. A return at/after due also records the unique overdue transition if the monitor has not run yet.
- A bounded 30-second internal monitor materializes at most 50 overdue loans per tick, each under registration/card/assignment locks and one transaction. Derived active-overdue reads use server `now >= due_at` even before materialization. One overdue event and internal alert per assignment; return/lost closure resolves the alert.
- Staff can reveal a phone only for a currently authorized active overdue assignment. Every actual reveal response has a fresh audit in the same transaction as the contact read; idempotency stores a safe receipt, never PII. UI caps display at 30 seconds, clears on selection/access changes and never writes to storage/clipboard/links/logs. Manual followup accepts only fixed safe outcome codes and sends no message.
- ADMIN mark-lost requires a safe reason, closes an active assignment LOST and opens an unresolved case. Disable is AVAILABLE-only. Restore requires the same card's RESTORE scan, two explicit recovery/inventory confirmations and DEMO_RECOVERED_AND_CHECKED; it resolves a lost case and restores AVAILABLE while keeping the old loan closed. UI labels this unapproved demonstration recovery rule.
- Current authority always precedes successful replay. Same key/body returns safe original success before old scan expiry/state/version validation; a different body conflicts. Unique losers fully roll back, then only query a winner under new authority. UNKNOWN client handles preserve exact body/key/version in memory; later 4xx does not prove the original attempt failed.

Notifications/blockchain stay NOT_ENABLED, audit LOCAL_ONLY, scan/issue SIMULATED. Physical reader, real MRN/hospital fields and production policy remain deferred. No external call, notification/outbox job, queue or historical backfill exists.

## Files and shared exceptions

Owned backend additions: assignment/, card/, reader/, monitoring/, V6 migration, the narrowly scoped assignment/LifecycleMysqlTests. Owned frontend: features/counter/lifecycle/. Evidence: this directory.

Coordinator C18 approved the only registration shared exception: new `registration/RegistrationLifecyclePort.java` and minimal `RegistrationStore.java` implementation of that read-only facet. It retains the original root SQL owner, uses the original current authority prefix and opaque exact-transaction contact receipt, never writes registration status or modifies existing review/read behavior. Existing RegistrationReviewPort, config/auth/common code and V1-V5 were not changed by M05. RegistrationConfiguration needs no edit because its concrete store bean implements the new facet.

V6 is `V6__card_assignment_simulation.sql`, C18/C19-approved. It introduces system_settings, reader_devices, scan_jobs/results, cards, card_assignments with generated active-card/registration UNIQUE constraints, lifecycle_events with unique overdue marker, overdue_alerts, assignment_followups and lost_cases with unresolved-card UNIQUE. Nullable closure/recovery CHECKs explicitly reject incomplete groups. Exact schema and M06 reporting definitions are in [READ_CONTRACT.md](READ_CONTRACT.md); V6_CANDIDATE.sql is the final mirror.

Exported slots in `frontend/src/features/counter/lifecycle/index.tsx`:

- `counterLifecycleFeatures`: `/staff/passes`, COUNTER_STAFF.
- `adminInventoryFeatures`: `/admin/cards`, ADMIN.

Coordinator owns main.tsx composition. This module did not change main.tsx/shell/App/global CSS/client/generated types/dependencies/package lock. New slots were typechecked but are not imported by this branch's shared bootstrap; coordinator must wire and build the integrated bundle. The M05 frontend has no synthetic fixture fallback and calls real backend APIs.

## Lock and recovery contract

Full path uses the relevant subsequence of:

`accounts -> counters ascending -> bindings -> contexts -> category share(enrollment) -> device -> registration -> card -> assignment -> scan job -> result -> successful idempotency/audit`.

All IDs are discovered without locking, then immutable coordinates and active mappings are re-read after ordered locks. A changed active mapping conflicts instead of chasing earlier locks. Existing JPA transaction manager + READ_COMMITTED joins JdbcTemplate changes/audit/idempotency. Settings are a single ordinary read snapshot; M06 configuration writers cannot call back to roots. Monitor has only registration -> card -> assignment. See READ_CONTRACT for the full API/DTO list, per-path rules and source/environment boundaries.

Keep original UNKNOWN command key/body and page open. Explicit retry is the same command; do not create another key or transfer a handle across actor/counter. Full reload loses in-memory recovery, so current protected inventory/history/assignment reads are needed before any fresh command; do not assume a timeout means no commit. Database UNIQUE and state constraints remain the final safety barrier. An abandoned scan may hold its device until its two-minute expiry; restarting the backend does not renew it. A new scan clears an expired fence. Key rotation must retain old key versions for their command retention and scan window; absent old key fails 503.

## Necessary checks actually executed

All commands used this isolated worktree. No application server, Vite dev server, browser/UAT or native database was started or modified.

| Command | Result and exact scope |
|---|---|
| frontend `pnpm.cmd install --frozen-lockfile` | exit0; existing pinned lock reused, packages restored from local store; no lock/dependency change |
| frontend `pnpm.cmd run build` | exit0, 2026-10-18; TypeScript project and Vite shared bundle build. New slots statically checked, coordinator composition still pending |
| frontend `pnpm.cmd run lint` | final exit0, 0 warnings/errors. Initial five effect/ref warnings were corrected before the final run |
| frontend `pnpm.cmd run typecheck:test` | exit0; test source typing only, no test bodies run |
| backend `mvnw.cmd -B -DskipTests package` | final exit0 at 2026-10-18 14:34:27 +08, source cbf738e; 68 main/25 test sources compiled, executable JAR produced, tests explicitly skipped. Existing/new RegistrationStore deprecated-Jackson accessor warning only |
| backend `mvnw.cmd -B -Dtest=LifecycleMysqlTests test` | exit1 at 2026-10-18 14:30:47 +08: Testcontainers initialization `Could not find a valid Docker environment`. Class-level error1, failures0; **both planned method bodies NOT_RUN / BLOCKED_ENV**. No DB migration/constraint/rollback assertion executed |
| `git diff --cached --check` | exit0 before implementation commit |

The single narrow class is `eduupm.hsaas.assignment.LifecycleMysqlTests`. It deliberately uses only an owned temporary mysql:8.0.45, first Flyway target5 then all current migrations (also usable after V7), a real JpaTransactionManager and no servlet server. Its intended checks are generated uniqueness/NULL closure CHECK and audit-trigger failure rolling back enrollment/card/event/scan/idempotency, followed by expired successful replay and current-authority rejection. It is compiled, not passed. Do not report it as SQL validation or re-run the broad old foundation suite to satisfy migration-count assertions. Per coordinator, no Docker Desktop startup/install/native fallback or repeated blocked run was attempted.

NOT_RUN: real MySQL V6 clean/upgrade/check semantics, actual service/session HTTP lifecycle, concurrent staff issue/return/lost/scheduler races, phone authorization/replay in a live app, browser visual flows, complete four-category end-to-end/UAT, performance, backup/restore, production HTTPS and every physical/hospital/provider/chain integration.

## User startup and manual checks

The coordinator/M07 combined manual launcher/runbook is the final startup owner. Use only its dedicated disposable demo database and demo accounts; do not apply this migration to or repair the old native database. Existing M00-M04 runbook explains baseline setup, QR keys, idempotency keys and reference/account requirements. Retain those explicit settings and add:

```powershell
# Enable only the reviewed local simulation against the dedicated disposable demo database.
$env:HSAAS_ENVIRONMENT = 'test'
$env:READER_MODE = 'mock'
# Pass these arguments to the existing reviewed backend startup command.
# --hsaas.lifecycle.enabled=true --hsaas.registration.enabled=true --hsaas.review.enabled=true --hsaas.qr.enabled=true
```

Missing real root/incorrect environment/reader mode fails closed. No device/card seed is needed: device is lazily provisioned, inventory is created by ADMIN through ENROLL. Keep notifications/blockchain disabled. Frontend slots must be composed by coordinator first.

Manual checklist (all currently NOT_RUN):

1. Sign in ADMIN, open Card inventory, enroll one of `DEMO-EXECUTIVE-001`, `DEMO-PENJAGA-001`, `DEMO-VENDOR-001`, `DEMO-CONTRACTOR-001` through Start bound scan -> Read synthetic sample -> Register. Duplicate sample/unknown profile must not create a second card. All UID displays remain masked.
2. Sign in authorized Counter Staff, use current dynamic QR and four DEMO-only registration forms; review/verify through M04. Open Pass lifecycle and select an approved row. Scan the matching enrolled sample and confirm simulated handover. Before successful issue there is no Pass ID; afterward receipt has `P-DEMO-...`, exact MYT due and rule version.
3. Try wrong category, missing confirmation, expired/cancelled evidence, another target/counter/actor-session and replayed scan. They must not issue or consume valid unrelated evidence. Compare another-tab simultaneous issue of the same card/registration: at most one active assignment. Inspect current inventory/history after any uncertain result.
4. For the issued loan, scan the same sample under RETURN and confirm receipt at its original counter. Loan closes RETURNED, stock AVAILABLE, one RETURNED event. Repeating the original exact command returns its safe original result. Another counter without current scope cannot read/reveal/return it.
5. Observe an active assignment at its stored due instant (M06 supports DEMO minimum one hour for new loans). It appears overdue using server time; within a monitor tick one event/internal alert is materialized. Reveal phone, ensure it clears within 30 seconds/selection/session changes, record safe followup and confirm no message is sent. Return resolves the alert. There is no business endpoint that rewrites an existing deadline for faster testing.
6. ADMIN mark an available/issued/overdue card LOST with reason; active loan closes LOST, unresolved case remains, direct return is refused. Recover through same sample RESTORE scan + both DEMO checks. Inventory becomes AVAILABLE, old loan remains LOST/closed, case resolves with recovery evidence. AVAILABLE-only disable plus scanned DEMO restore also works.
7. For interrupted requests, keep the original command page and use Retry original command only. A later 4xx must retain UNKNOWN. Revoke current permission/session and verify replay cannot bypass it. Re-login/counter change must clear prior contacts/evidence/handles.
8. Restart the dedicated demo stack using the coordinator's stop/start instructions: committed assignment/history persist only if that chosen demo database persists; scan deadlines do not extend. Monitor catches up active overdue loans. Follow M07 explicit backup/restore instructions in a disposable copy, never native repair.

Known limits: no hardware or hospital-approved lost policy, DEMO-only identity/MRN, same-counter returns, 48 samples, page sizes25/registration10, history latest100, in-memory UNKNOWN handles lost on full reload, bounded single-instance monitor and no physical retention cleanup policy. Combined manual/business acceptance and Docker-backed SQL evidence are outstanding. No known source-review blocking defect remains; coordinator review controls integration and may request repairs here.
