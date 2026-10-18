# M06 Administration & Reporting handoff

Status at this review snapshot: **REVIEW_READY_PENDING_M05_MAIN_INTEGRATION**. This is implemented source, not business acceptance. M00-M04 manual acceptance remains pending; no historical PASS is extended to M06.

2026-10-18 C22 follow-up: coordinator cross-checked M05's final read contract and requested explicit environment/provenance predicates. ReportingService now injects FoundationProperties and binds the current configured environment for every registration period/group/preview/export, requiring SYNTHETIC registration origin; assignment metrics additionally bind the configured environment and SIMULATED operation origin; current card metrics bind the environment and SIMULATED data origin. Report origin includes the environment. MYT/filter/masking/one-statement metric semantics are unchanged. Source/parameter ordering reviewed; no additional tests rerun because the four date/CSV rules are unchanged. Coordinator owns the final combined build after M05 absorption. This correction supersedes the earlier unscoped query implementation at a4ca126; its exact correction SHA is sent with the handoff message.

- Human authorization: 2026-10-18 M05-M07 delegation and necessary testing, recorded in AGENTS.md and planning/14. Current coordinator is `01a14da5-91fe-7bf1-a120-183975085f8b`, host local; bidirectional questions/handoff are authorized. No old coordinator contacted.
- Actual isolated worktree: `C:/Users/alexy/.codex/worktrees/ca56/FYP Dev`.
- Branch: `codex/m06-administration-reporting`.
- Initial clean baseline: `d103b888527c4ba8e90f37d93059daf2d78ed02f`.
- Shared C18 integration: fast-forwarded coordinator commit `fd18ef67cba40aadc37b4b1ea4b021b32571b8ea` (audit/idempotency whitelist + coordination record).
- Review implementation commit: `a4ca1266b70983cdaa553a89b3cf9289457354c2`. A later evidence commit contains this file and is supplied separately to avoid a self-referential SHA.
- Shared writes by M06: **none**. auth/AccountChanges, common, config, registration, main.tsx/shell/generated/API baseline/dependencies and V1-V6 are unchanged by M06. Coordinator owns final FeatureSlot composition and manual demo launcher.
- Runtime dependency: approved exact M05 V6 schema inspected in `cb05` worktree; final M05 local-main merge still awaits coordinator notification. M06 does not copy another module's unmerged migration. V7 is not a replacement for V6.

## Delivered functionality

ADMIN can create canonical staff logins with adaptive password hashes; choose ADMIN or COUNTER_STAFF; activate/deactivate/change role with an expected version; and grant/revoke individual counters. Existing AccountChanges/SessionCapabilities enforce current persisted authority, account epoch revocation and identity-policy-gate serialization for the last active administrator. ADMIN has no implicit counter workflow. Passwords/security epochs are excluded from response SQL. Initial password is never returned or logged; there is no new public signup or password-reset surface.

Category names/active state, ward/destination code creation and name/active edits, and counter creation/name/active edits are versioned. Existing codes are immutable; category form schemas remain the four M03 categories. No deletion/cascade or historical registration/assignment rewrite is present. Setting forms maintain V6's four integer `return_hours_<CATEGORY>` values (1-720 hours, demo default 24). History preserves whitelisted before/after values, versions, actor, fixed reason and time in the same transaction. New assignment issue reads the rule/version through M05 and stores its original due_at; M06 never updates prior assignments.

The report/overview is real MySQL SQL over visitor_registrations, cards and card_assignments. Inclusive MYT calendar dates map to UTC `[from midnight,to+1 midnight)`, maximum 366 calendar days. Registration count uses submitted_at; issued/returned/lost counts use issued_at/returned_at/closed_at+LOST. Category/ward filters join registration. Current open and overdue counts use one captured serverUpdatedAt and ignore historical date selection. Overdue means `closed_at IS NULL AND due_at<=asOf`, regardless of scheduler execution. Inventory and utilisation are current and category-only; unassigned inventory has no ward. Utilisation is ISSUED/OVERDUE cards divided by all enrolled cards (including LOST/DISABLED), explicitly labelled rather than implied historical occupancy.

All metrics and day/category groups share one UNION statement snapshot. Preview is a following bounded statement and can briefly see a concurrent submission before the counts; the next poll converges. No historical-as-of state reconstruction is claimed. Frontend refreshes every 5 seconds without overlapping requests, aborts on filter/unmount, labels serverUpdatedAt and stale/error, and clears protected data on 401/403. A successful zero is different from a failed read; no failure fallback zeros or fixture dataset is used.

CSV export returns registration metadata with visitor label `***`, never selecting form_data/phone/ID/MRN. Every field is quoted, embedded quotes escaped and formula prefixes neutralized after leading control/space/format characters. Select LIMIT 10001 and reject >10000 instead of silently truncating. The actual serialized Export JSON envelope is measured in UTF-8 and rejected above 1047552 bytes before audit/history inserts, leaving margin below the shared client's 1MiB response cap. Successful export record, REPORT_EXPORTED local event and history commit before the response. A lost response can leave a legitimate audit without a downloaded file; no automatic export retry is issued. The frontend uses a temporary revoked Blob URL and no persistent browser storage.

Local audit supports MYT date, actor and event-action filters, bounded 100-item pages, safe event snapshots and configuration before/after history. Action filter applies to the event stream; date/actor apply to both streams, explicitly labelled. Capabilities read the existing backend configuration and show SIMULATED reader/manual-or-mock MRN, LOCAL_ONLY audit and NOT_ENABLED WhatsApp/blockchain/live reader/live patient API. No queue, send, proof, backfill, notification retry or external call is added.

## API and schema

All paths reuse `/api/admin/**` role/session enforcement and CSRF on writes; actor/binding/context come only from the framework session. IDs are decimal strings, versions exact nonnegative safe integers, reason values a fixed code list. Request DTOs never accept a caller actor/time, raw inventory state, visitor body or authority.

| Endpoint | Contract |
| --- | --- |
| GET /api/admin/users | id/login/role/active/version + individual permission versions; no credentials |
| POST /api/admin/users | login/password/role/reason; active new account; `{saved:true}` |
| PATCH /api/admin/users/{id} | version/role/active/reason; current sessions revoked |
| PATCH /api/admin/users/{id}/counters/{counterId} | permission version (0 absent)/active/reason; epoch and user version advanced |
| GET /api/admin/categories,destinations,counters | explicit code/name/active/version projection |
| POST /api/admin/destinations,counters | code/name/reason; no category-schema creation |
| PATCH /api/admin/{categories,destinations,counters}/{id} | version/name/active/reason; code immutable |
| GET /api/admin/settings | V6 return-hour rows only |
| PATCH /api/admin/settings/{id} | version/value integer1-720/reason |
| GET /api/admin/reports | from/to/categoryId/destinationId; period/current metrics, origin, serverUpdatedAt, first51 preview rows (UI displays50) |
| POST /api/admin/reports/exports | same query filters, bounded masked CSV JSON envelope; local audit before response |
| GET /api/admin/audit-events | from/to/actorId/action/page; events/changes and more flags |
| GET /api/admin/integrations | existing shared capability endpoint, unchanged |

V7 `V7__administration_reporting.sql` (coordinator C19-approved candidate) adds only administration_history and report_exports with NOT NULL/FK/check/version/range/count constraints and target/time indexes. V1-V5 are immutable; V6/system_settings belong to M05. No schema was migrated against a database during M06 work. No new runtime dependency or environment flag is required; administration/reporting beans use the existing secured API, with V6+V7 applied by the user's selected demo database startup.

## Transaction and lock contract

- All M06 domain transactions explicitly use READ_COMMITTED and the existing TransactionTemplate manager/DataSource. The outer transaction starts without locks; nonlocking safe snapshot discovery may precede the M00 mutation port, and its expected version must succeed before history commits.
- Account role/status path delegates identity gate -> sorted actor/target user locks -> current binding/context to M00. Last-admin checks are serialized there; epoch update/audit/history share one transaction.
- Permission path delegates sorted users -> counter -> permission -> current binding/context; target epoch/user version and reason/history share the transaction. No separate REQUIRES_NEW mutation/history is used.
- Existing counterActive is reused for counter name/active edits, preserving user -> counter -> binding/context, then name/history under the already-held counter lock; one version increment and one local change audit.
- Other reference/settings writes use actor user -> live binding/context -> reference/setting row. They do not call QR, registration or assignment domains while holding the reference/setting lock. Expected versions protect concurrent edits.
- Export takes current ADMIN authority before reading report data and inserting its audit/record. Database/audit/unique/version failures roll back all writes; safe global error responses hide SQL and rejected inputs.

## Necessary checks and limits

| Command / scope | Result |
| --- | --- |
| backend `./mvnw.cmd -B '-Dmaven.test.skip=true' package` | PASS, exit0, final run 2026-10-18 14:29 +08; production compile/executable package only, tests skipped |
| frontend `pnpm install --frozen-lockfile` | PASS, exit0, existing lockfile unchanged |
| frontend `pnpm run build` | PASS, exit0, final pre-integration run 14:26 +08; tsc checks the feature source; main.tsx composition still coordinator-owned |
| frontend `pnpm run lint` | PASS, exit0, zero warnings after fixing initial Fast Refresh/date-purity warnings |
| backend `./mvnw.cmd -B '-Dtest=M06ReportRulesTests' test` | PASS 4 tests, failures/errors/skips0, 14:27 +08; MYT UTC boundary/default-midnight, invalid/duplicate/range filters, CSV formula/quote vectors |
| `git diff --cached --check` | PASS after removing one extra EOF blank line found in the initial staged snapshot |
| `docker info --format '{{.ServerVersion}}'` | Unavailable: Docker engine named pipe absent; no daemon started and no native DB fallback |
| V6/V7 execution, actual SQL result dataset, live session/transaction/last-admin race/rollback | NOT_RUN; disposable MySQL unavailable |
| broad regression, browser/responsive screenshots, UAT/performance, restart/backup acceptance | NOT_RUN by scope |

The first unquoted PowerShell Maven property invocation was rejected by Maven as an unknown lifecycle phase; the quoted command above corrected it. No source defect or business test result is inferred from that invocation. Historical M00-M04 tests retain their original SHA/scope and are not a substitute for the NOT_RUN rows here.

## User startup, manual checks and recovery

After coordinator merges M05 then M06 and composes `administrationFeatures` from `frontend/src/features/administration/index.tsx`, use the coordinator/M07 M00-M07 manual-demo launcher on a **new disposable demo database**. This module does not start services. Existing M00-M04 reference runbook is `Implementation/docs/runbooks/MANUAL_M00_M04.md`; final M00-M07 launcher/runbook is coordinator/M07-owned. Do not point V6/V7 at the old native database, run Flyway repair/baseline/clean or rewrite an applied migration. No new M06 enable flag is needed. Sign in with a demo ADMIN; new accounts require a staff login and 12+ character, <=72 UTF-8 byte initial password.

Manual checks remain **NOT_RUN**:

1. With two active ADMIN sessions, race deactivation/demotion; exactly one can remove an admin and the remaining active admin must be preserved. Old sessions of changed accounts must lose API access. Staff access to administration/report/audit endpoints must return403; ADMIN must not obtain counter workflow.
2. Create a staff account, grant one counter, sign in, then revoke permission/status/role using another ADMIN; current QR/staff operations must reject the old owner capability. Verify account and grant expected-version conflicts.
3. Change/disable a category, ward and counter with a fixed reason. Check immutable safe before/after history; previous registration/assignment records stay readable. Attempt a stale version from another browser and verify409 with no second history entry.
4. Issue a simulated pass, change its category return hours, then inspect old due_at/rule version and issue a new registration. Only the new assignment should use the new setting. Defaults and recovery policies remain explicit demonstration rules, not hospital approval.
5. Filter reports over a MYT midnight boundary/category/ward; manually compare submitted/issued/returned/lost event times and current snapshot counts. Trigger overdue at due_at without relying on the scheduler. Check all metrics are real database values, with date/current and ward/inventory distinctions visible.
6. Change data in another session and observe within the next polling interval (normally <=10sec); interrupt backend/DB connectivity and confirm stale/error keeps the last successful timestamp, never fake0. Reconnect and refresh. No browser acceptance was performed by M06.
7. Export masked metadata. Inspect no phone/ID/MRN/form_data, spreadsheet-safe labels and explicit audit. Exceed row/escaped-response size limits and verify rejection without partial CSV or export success audit. A network-uncertain export must not silently retry.
8. Check local audit date/actor/action filters and administration values. Verify unavailable integrations have no invented task/proof success and no external queue/call.

For an uncertain versioned write, refresh the authoritative list/version before deciding another command; for account creation check canonical login existence rather than blindly creating again. For a stale edit, close/reopen the editor against the current row. Self-demotion/deactivation or grant changes can commit and expire the current browser before a success response arrives; sign in through another remaining ADMIN and inspect the audit. A response lost after export commit does not mean the audit is false. If demo migration/startup fails, preserve diagnostics and the disposable database; do not repair the old native database or mutate applied migrations. Recovery/backup execution and hospital policy approval remain NOT_RUN/deferred.

No push, deployment, secret copying, old-native database access, module startup outside M06 or main merge was performed by this module. Final coordinator review and local merge are pending; desired post-merge status is MERGED_PENDING_USER_MANUAL_TEST.
