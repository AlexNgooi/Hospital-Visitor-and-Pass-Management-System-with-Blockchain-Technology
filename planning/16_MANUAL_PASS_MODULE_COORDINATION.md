---
type: module-coordination
updated: 2026-10-27
status: merged-pending-user-manual-test
---
# Manual pass change — R01–R03 coordination

## Latest: user-authorized local main merge — 2026-10-27

The user explicitly requested “把R01 -03 merge 去main” in chat `01a17d68-73a3-7962-b09b-46eb13c34bdc`. Reviewed integration head `7af56594908daec51ce65dc5fb5d61c2c3d431f7` was merged without conflicts into local main `84c1008` as `c4cf3d3a7143501b00426ad1a0364b64938ac0fd`. Status is **MERGED_PENDING_USER_MANUAL_TEST**; earlier not-merged statements below describe the historical integration review.

Post-merge comparison `git diff --exit-code codex/manual-pass-integration HEAD -- Implementation` passed with no difference before this documentation update; `git diff --check HEAD^1 HEAD` passed. The merged application sources exactly match the already built/linted integration source, so build/test suites were not repeated. Existing untracked industry output was preserved. UI commit `ccfca27` remains separate. No push, deployment, service restart, database access or V8/V9 execution occurred; SQL/business/manual acceptance remains NOT_RUN. New feature work remains deferred in favour of UI under planning/17.

## Human authorization and limits

On 2026-10-27 the user asked this chat to allocate tasks and start multiple chats, one module per chat, implementing planning/15. This supersedes the 2026-10-26 design-only restriction and old coordinator-creation prohibition for R01–R03 only. Each assigned module has its one-time development permission; do not ask again. These change IDs do not start or rename old M08–M11.

Coordinator: `01a17867-7222-74d0-8dc6-c33b0e939c15`, host `local`, title `Update pass issuance flow`. Task allocation and multi-chat execution authorize module questions, checkpoints, progress and handoffs to this coordinator and its technical replies/repair requests. Do not message either old coordinator. Material business choices go to the human here.

The user confirmed on 2026-10-27: **Penjaga accepts IC only and has at most one active pass per registration.** Executive max one; Vendor/Contractor may have multiple. The earlier Penjaga questions in15 are resolved. MRN uses only a clearly labelled mock API and synthetic fixtures; no live hospital API is available.

Implement directly with accurate English comments explaining responsibilities and business/security/transaction/concurrency rules. Preserve old data/schema readability, role/counter scope, session/grant/CSRF, idempotency and local audit. No push, deployment, real integrations, native database changes, automatic seeding or deletion of demo data. Do not start/stop current demo services from module worktrees.

Only source/diff review and necessary compile/build/lint checks; backend packaging skips test execution. Do not add/run broad test suites, browser/UAT, application/business acceptance or migrations against any database. Record compilation of old test sources separately from tests actually executed. SQL/business/concurrency/restore remain NOT_RUN for user manual testing; build success is not business PASS.

Today's instruction covers startup/development, not automatic main merges or changes to the running demo. Modules commit their own work and hand back. Coordinator reviews and prepares integration; main merge/application startup need a subsequent human instruction. No watcher/automation.

## Baseline and isolation

Application baseline is local main `50c8013`. Commit pending 2026-10-26 specifications and this authorization before creating chats so new app worktrees receive actual local main, not an old remote default. Exclude unrelated untracked industry-meeting/UI output. Use the app-returned workspace path explicitly; never edit the shared root checkout from module chats. Do not reset/reuse/delete old M00–M07 worktrees.

If the app starts detached, each chat creates its listed `codex/` branch in its own worktree. Today's user selected no model/thinking override; use configured defaults.

## Ownership and dependency checkpoints

Paths below are relative to Implementation/. Each module owns a feature slice and its `docs/evidence/changes/Rxx/` contract/handoff records. Read relevant specs and owned directory CONTEXT files, not the entire workspace.

| Module / chat title | Owned implementation | First checkpoint / dependency |
|---|---|---|
| R01 Registration, Mock MRN & Review | backend registration/ including review/root adapters and hospital/; frontend features/registration and features/counter/review; V8 registration migration if required; own evidence | Four new versioned forms, Penjaga IC/address/terms, Executive IC-or-Lesen, multi locations for Vendor/Contractor; mock name/ward/bed autofill; authorized staff review/manual verification. First send schema/wire and RegistrationLifecyclePort eligibility/destinations proposal for R02, preserving existing callers |
| R02 Manual Pass Inventory & Lifecycle | backend assignment/, card/, reader/, monitoring/; frontend features/counter/lifecycle including admin inventory; V9 manual lifecycle/settings migration; own evidence | Manual inventory enrollment/restore and staff issue/return, category cardinality, multi locations, optional due, partial return, dates/actors/audit. First send exact V9 DDL/lock graph/API/read contract for R03 and port requests for R01; implement independent pieces while awaiting reviewed R01 checkpoint |
| R03 Administration, Settings & Reporting | backend administration/, reporting/; frontend features/administration; own evidence; V10 only if separately needed/approved | Preserve admin RBAC/history; adapt settings/reports/CSV for optional due, destinations, distinct registration/pass counts and full dates. Start inspection/proposals and independent work now, then import approved R02 schema/checkpoint before final read-model integration |

Coordinator owns planning/root contracts, shared main.tsx/shell/client/generated/dependencies/config, scripts/seed/runbooks and combined integration records. Send exact minimal proposals for shared files, do not edit them concurrently. Owned directory CONTEXT corrections are allowed. No unsolicited redesign or dependencies; retain UI conventions.

## Shared contracts

1. V1–V7 immutable. Reserve **V8 R01 registration**, **V9 R02 manual lifecycle/return-settings structure**, **V10 R03 only if justified/approved**. Send DDL draft in own evidence for coordinator review before actual migration. Do not create empty migrations to fill numbers; no database execution.
2. R01 is the sole registration persistence owner. R02 uses RegistrationLifecyclePort and requests minimal additions via coordinator; no registration SQL/form_data parsing in assignment. R01 owns port and adapter changes with source compatibility until reviewed checkpoint integration. R03 may retain authorized masked/aggregate report joins, never another root writer/public PII query.
3. Vendor/Contractor request multiple location codes; Executive supplies ward/patient, Penjaga gets mock-resolved ward/bed. R02 snapshots/reference-binds the actual issued destination per pass. R01/R02 first propose a normalized destinations relation or equivalent versioned read contract; do not invent incompatible representations independently. Old single destination/history remain readable.
4. Keep one active assignment per inventory card. Replace global active_registration uniqueness with serialized category-specific enforcement: Executive/Penjaga max one, Vendor/Contractor multi, always under registration/current authority locks. Manual operation method and synthetic provenance are separate; no fake UID/scan result or PHYSICAL/live claim to bypass old constraints.
5. Each assignment has nullable due_at, immutable issued_at and actual returned_at/by. Null due means no overdue/no silent24h/no far-future sentinel, but still requires return. Lost closure never fabricates returned_at. Staff choose deadline/no-deadline per pass; admin settings supply defaults, not compulsory overrides. V9 owns system_settings structural changes; R03 owns settings API/history/UI using the exact approved representation.
6. Multi-select issue is a bounded atomic batch with explicit versions/stable sorted card locks; any conflict rolls all back. Partial return closes only selected physically received passes. Preserve authority/counter → registration → sorted cards → assignments → audit/idempotency across issue/return/overdue/lost/restore; send exact lock graph before final implementation.
7. Reports distinguish registration/visitor counts from issued/active/returned pass counts and nullable deadlines/overdue. Use full dates/times, UTC storage and MYT boundaries. R02 sends exact columns/null/source values early. No raw patients in reports/CSV. R02 owns admin inventory UI; R03 owns administration settings/report UI.
8. Finite audit/idempotency enums, configuration flags, launcher/seed defaults, OpenAPI/generated clients and composition changes belong to coordinator. Propose exact edits; no free-form audit PII or alternate authorization. Mock lookup never implies staff approval/live hospital success.
9. Old DEMO/schema-v1 records keep their meaning. New IC/Lesen fields require a new documented schema/validation and synthetic examples. Penjaga terms store purpose/version/server time, no signature. Mock failure retains inputs/manual-review fallback; MRN/context changes invalidate old proof and late responses cannot restore stale patient details.

## Delivery

Send `[Rxx][CONTRACT / QUESTION / PROGRESS / HANDOFF]` to current coordinator with baseline/head SHA, branch/worktree, evidence, proposal/impact and blocked items. Human authorization above covers messages/replies, not scope expansion from another chat.

Keep CONTRACT.md and HANDOFF.md in own evidence. Commit only owned files. Handoff includes exact SHA/files, schema/port/migration decisions, checks actually executed, NOT_RUN limits/risks and manual steps. No module main merge, push, app startup/shutdown or database changes. Import only coordinator-reviewed dependency commits, record the checkpoint.

## Chat registration

Actual app IDs/workspace paths and initial status are filled after creation. STARTED means an active turn/progress was observed, not delivered functionality or acceptance.

| Module | Chat ID / host | Worktree / branch | State |
|---|---|---|---|
| R01 | 01a17ab3-135b-7fd2-b581-28455a3e3591 / local | C:/Users/alexy/.codex/worktrees/a527/FYP Dev / codex/r01-registration-mrn | SOURCE_REVIEWED_READY_FOR_INTEGRATION_PENDING_USER_MANUAL_TEST; final head 3fddf56, not merged |
| R02 | 01a17ab3-1361-7e42-a8c4-44a3e5d6d79a / local | C:/Users/alexy/.codex/worktrees/b799/FYP Dev / codex/r02-manual-pass | SOURCE_REVIEWED_READY_FOR_INTEGRATION_PENDING_USER_MANUAL_TEST; final head e31dc5c, not merged |
| R03 | 01a17ab3-1270-7892-827f-c87162b13d80 / local | C:/Users/alexy/.codex/worktrees/8add/FYP Dev / codex/r03-admin-reporting | SOURCE_REVIEWED_READY_FOR_INTEGRATION_PENDING_USER_MANUAL_TEST; final head 2f58825, not merged |

Shared committed startup baseline: `cbd4025d92a5d8dc3faeb3d874de16ba4589c89c`. All three app worktrees were verified at this SHA; each module sent its actual isolation confirmation to the current coordinator. A single wait_threads snapshot confirmed all three initial turns inProgress with initial assistant/tool activity. No model/thinking override was supplied.

Coordinator relayed R03's exact system_settings/destination/actor/source column request to R02 and its normalized destination request to R01, acknowledged the dependency to R03 and instructed both owners to send compatible small checkpoints. Precise wire/DDL/port proposals are still awaiting review, not approved merely by chat startup. No implementation completion, tests, database execution, main implementation merge or live integration is claimed.

## Reviewed shared decisions — 2026-10-27

These decisions follow actual source review of the R01/R03 contract records, R02 V9_DRAFT.sql and existing V5–V7/root/audit/admin/report code. They authorize implementation of the specified changes, not database execution or acceptance PASS. Each module received the exact decision by an authorized coordinator message.

### C-R01 nullable settings and separate pass reports

- Preserve `return_hours_<CATEGORY>` keys; V9 widens `value_int` to nullable with `value_int IS NULL OR value_int BETWEEN 1 AND 720`. NULL explicitly means default no deadline; no separate deadline_mode column or numeric sentinel. Preserve existing numeric defaults and historical assignment deadlines.
- Settings GET uses nullable Integer, never getInt NULL→0. PATCH requires explicit present version/value/reason keys; null value means no deadline, missing value is rejected. Keep required version/reason, CAS and safe history including explicit JSON null. Staff per-pass explicit date/no-deadline choice overrides defaults.
- R03 may add passPreview and ADMIN+CSRF `POST /api/admin/reports/pass-exports`, using the same bounded, audited Export envelope, safe CSV and actual escaped-JSON UTF8 response bound as registration exports. Use a separate hsaas-passes filename; preserve old registration export.
- Submitted registrations, distinct issued registrations and current open registrations are different from issued/current/returned pass counts. Use EXISTS for requested multi-location filtering, never fan-out registration counts. Pass activity preview/export selects assignments with issue OR actual return OR lost closure in the selected MYT period, once per assignment; current metrics ignore historic dates. Null due is separate from overdue.

### C-R02 normalized locations, lifecycle port and source boundaries

- R01 V8 approved: `registration_destinations(registration_id,destination_id)` composite PK with both FKs, backfill old root singleton, retain root primary destination. Additional proposed temporary mock patient/bed/schema columns and PASS_TERMS consent purpose are approved; old schema/idempotent replays retain their canonical meaning. No real hospital integration or patient report fields.
- Exact R01-owned port: `Destination(String id,String code,String label)` and Access `fieldSchemaVersion()`, `destinations()`, `multipleActivePassesAllowed()`; only Vendor/Contractor permit multiple active passes. Retain existing source-compatible constructor/callers.
- After current authority is re-entered and before root/card locks, R01 lockLifecycle internally discovers immutable category/requested destination IDs, locks category then destination rows in ascending numeric ID FOR SHARE, locks root and revalidates coordinates/reference set. Changed IDs cause conflict rather than chasing earlier locks. New issue eligibility exposes active allowed choices (empty if category inactive); inactive references must not block return/lost/history. R02 takes no reverse-order reference locks after root/card; enrollment uses the same reference-type ordering.
- Narrow ownership exception: R01 may append only `Action.REGISTRATION_REVIEW_FIELDS_VIEWED` and its English explanation to common/LocalAuditPort.java. No widening snapshot/state/origin whitelists. Staff review-fields POST requires current role/counter authority, CSRF, expected version, bounded schema-aware fields and no-store. Audit uses REGISTRATION/current allowed state/version/SYNTHETIC_MANUAL, commits before response and contains no raw PII; revealed values never enter idempotency or persistent browser storage and clear on auth/selection/version changes.
- V9 assignments retain issued_by/at and actual returned_by/at, add closed_by, category_code, data_origin and destination_id/code/name snapshots. New method operation_origin=MANUAL pairs with data_origin=SYNTHETIC and required destination fields. Historical SIMULATED/SIMULATED remains distinct; fallback to root destination is allowed only for SIMULATED rows whose issued destination is null.
- New MANUAL inventory has synthetic provenance, no fabricated UID/profile and a required destination. Historical SCAN/SIMULATED unbound inventory remains readable and can be manually issued only to an eligible root-approved location; new bound inventory must match the selected destination. Reports enforce configured environment and explicit allowed method/source pairs, never a live/PHYSICAL wildcard.

### C-R03 V9 approval and export history

- Reviewed R02 evidence `V9_DRAFT.sql`: nullable settings/card UID/profile, enrollment method/destination, nullable due, source/snapshot/category fields, generated single-active Executive/Penjaga constraint, retained active-card uniqueness/nonunique active-registration lookup and manual lost recovery are approved for the actual forward V9.
- Required correction before copying: open assignments always have closed_by NULL; all new MANUAL closures require the current server actor. Backfill historical normal closures from returned_by and lost closures from lost_cases.opened_by where known, but allow genuinely unavailable historical SIMULATED closed_by to remain NULL. Do not fabricate actors or returned_at. R02 may implement this correction without another permission round; actual migration execution remains NOT_RUN.
- Exact allowed export administration_history.current_value: `{exportKind:REGISTRATIONS|PASSES,rowCount:int,from:YYYY-MM-DD,to:YYYY-MM-DD,categoryId:decimalString|null,destinationId:decimalString|null}`. Values are service-derived/validated; no CSV/body/references/PII. report_exports stays unchanged, finite local audit remains REPORT_EXPORTED/EXPORTED/LOCAL. No V10 is required for this plan.
- R01/R02 must provide small compatible dependency commit SHAs before R03 final SQL integration. Draft approval is not evidence that code is complete, imports succeeded, migrations ran or business checks passed.

R02 isolated schema checkpoint `5b80b0ac22aba150d1aabd024cc50302ff967c2d` was then source-reviewed: only actual V9 migration plus R02 contract/draft evidence, including the required legacy closed_by correction. Coordinator approved R03 importing this checkpoint into its isolated branch; R01 V8/port checkpoint remains pending. No SQL/migration execution occurred. Cards exact inventory pairs are enrollment_method SCAN/data_origin SIMULATED or enrollment_method MANUAL/data_origin SYNTHETIC, always configured environment. Correlated destination-name JSON aggregation with deterministic Java sorting is accepted for registration previews/CSV, retaining inactive referenced history labels and avoiding fan-out/truncated concatenation.

### Initial source review and route coverage

R03 imported the V9 checkpoint as local `900accc` and submitted owned functional commit `b55bec85e967218f76241de94972c377ac8123f6`. Coordinator reviewed its settings parser/JDBC/history, source-scoped aggregate/preview/export SQL, JSON destination aggregation, report DTO/CSV and feature-local frontend changes. Definitions align with C-R01–03; a text correction was required because new manual inventory cards are location-bound even while report inventory totals intentionally ignore the selected issued-destination filter. Final dependency/source handoff review remains pending.

Existing SecurityConfig matches `/api/staff/**` only to COUNTER_STAFF and `/api/admin/**` only to ADMIN, with protected session revalidation. Source review confirms R02's GET admin cards/references and GET staff registrations/{id}/issue-context fit these boundaries, preserve no-store and service reauthorization; no shared security expansion is required. R02 was instructed to enforce identical explicit method/source predicates in stock count/items/inventory/direct reads rather than rely only on DDL. The shared OpenAPI mirror still covers foundation only; feature-local contracts remain in module evidence, with that limitation documented in the API README. No generated declaration edits or API-coverage PASS are claimed.

R01 backend/V8/port checkpoint `bb963e6e4887141e1d69390ac82b3a072b12add3` arrived and V8/port/root ordering were inspected. Dependency import approval is pending a specific repair: primary-location fallback in lifecycleReferences must be restricted to LEGACY_VERSION; missing v2 or unknown-schema relation data must fail safely rather than fabricate eligible locations. R01 was asked for a separate backend repair commit before R02/R03 import. New migrations and business/SQL execution remain NOT_RUN.

R01's actual repair `58bb6dbda4f52871720e52463e76b110b35cdeb3` was inspected and accepted: only known legacy roots can use primary-location fallback; v2 missing relation and unknown schemas fail safely, and the rechecked reference snapshot includes schema/primary destination. Coordinator approved R02/R03 importing `bb963e6` then `58bb6db` in that order into their own worktrees. This is coherent dependency/source approval only; R01 frontend and proof/idempotency follow-up still require final review, and no database or feature acceptance is inferred.

R03 copy/comment repair `ccef771e3d11136a3d66f8ae62855c133c44ec48` and capability wording `0cea15b35f3bbacb210dd634a0def52a4149d550` were inspected and accepted. Inventory totals explicitly ignore the selected issued-destination filter without falsely claiming all stock lacks location; pass handling is explicitly MANUAL and the configured mock reader is labelled legacy simulation. No build/test repetition is required for those text-only changes. Final handoff/dependency checks remain pending.

### R03 final source review — accepted for later integration

Coordinator inspected final evidence commit/head `2f58825231da2242f6f6cd85da0531cfbd3d71da`, complete CONTRACT/HANDOFF and the clean `8add` worktree. No additional functional change followed reviewed `b55bec8` beyond accepted copy/comment repairs. Status is **SOURCE_REVIEWED_READY_FOR_INTEGRATION_PENDING_USER_MANUAL_TEST**, not merged or business acceptance PASS.

Owned integration sequence is `b55bec85e967218f76241de94972c377ac8123f6`, `ccef771e3d11136a3d66f8ae62855c133c44ec48`, `0cea15b35f3bbacb210dd634a0def52a4149d550`, then evidence `2f58825231da2242f6f6cd85da0531cfbd3d71da`. R03 imported R02 `5b80b0a` as `900acccc8c3378a46e328cf6afea1e5622445355`, R01 `bb963e6` as `ef67819d4ecb847298c4267e23a5d6c7989c6bd5`, and R01 repair `58bb6db` as `2d43605f2a30e147ddcd696a661c7e50bdff559d`. Later integration must not duplicate imported checkpoint patches.

Module-reported checks recorded in HANDOFF: frozen frontend install without lock changes, frontend build/lint, and backend `-DskipTests package` after approved dependency import at `2d43605` (80 main/26 existing test sources compiled, test bodies skipped); Vite >500kB warning and existing deprecated API note remain documented. Coordinator performed source/evidence/diff review, not independent command reruns. SQL/migrations/upgrade/concurrency/business/browser/UAT/restore/live integration remain NOT_RUN. No database/app operation or main implementation merge occurred. R03 remains available for concrete later integration repairs; no new work is required on the approved contract.

### R01 final feature review — automatic lookup repair requested

R01 submitted backend follow-up `e3782f2445424530ecf2c3e5153db30bb4d152de`, frontend `8dee3ed50e96e1010436629cd741d82edb1c60ca` and initial evidence head `81081702b04e40457a5b802492bc86a747709a51`. Coordinator inspected the versioned payload encoder, legacy replay boundaries, server MRN proof/context/expiry/patient binding, lookup capture timestamp, source field schemas, current-authority audited review reveal, form/review runtime schemas and stale-response/state clearing. Existing FoundationConfig supplies strict duplicate JSON detection to the registration parser; no unnecessary duplicate-parser change was requested.

The backend follow-up aligns with the reviewed contract: old v1 replays reject v2-only fields outside their old encoding, and patientResolvedAt uses the original proof created_at. No V8 schema/port change followed the previously approved dependency repair. R01-reported package/build/lint results remain scoped source checks, not independent coordinator reruns or runtime acceptance.

One required user-facing correction remains: the frontend at `8dee3ed` invokes MRN lookup only from its button, while the user requested automatic search after entering MRN. Coordinator requested automatic lookup on valid completed-field blur or short valid-input debounce, with the existing button retained for deliberate retry. Reuse context+MRN in-flight deduplication/stale-response fences, immediately clear old patient/proof on edits, cancel pending triggers on scope/category/unmount, preserve manual failure fallback, and avoid auto-approval or automatic failure retry loops. Frontend build/lint after this logic change are appropriate; no new backend endpoint, dependency, tests, DB or browser execution. Final source acceptance awaits separate repair SHA and updated handoff.

### R01/R02 final source acceptance and integration preparation

R01 repair `61a132ecbcc59bc5feef83ed02266c9314d05d5b` and final evidence/head `3fddf56038c4ff4b0bfc5d14811caa06ba71929e` were inspected with a clean module worktree. Valid MRN blur now automatically queries; explicit retry, in-flight context/MRN deduplication, one automatic attempt until edit, abort and revision fences match the requested correction. Source approval covers the original checkpoint/legacy repair, backend follow-up `e3782f2`, frontend `8dee3ed`, initial evidence `8108170`, automatic repair `61a132e` and final evidence `3fddf56`. No dependencies were imported by R01. Frontend build/lint after the repair were module-reported successful; backend unchanged and not repackaged solely for it.

R02 runtime `f2a2cd9e4e0c48cb879a75de48a09fb10ee8f846` and final evidence/head `e31dc5cf6d5ba666407fa9fc42ce3aafe2c207a6` were reviewed against approved V9 `5b80b0a` and R01 port checkpoints. Coordinator inspected strict nested command encoding, current authority, root/sorted-card/assignment locks, atomic issue, category policy/unique fences, null deadlines/overdue, individual partial return, lost/restore actors and actual-return separation, explicit source pairs, field schemas and owned UI. The optional registrationId list filter narrows existing counter/environment/source scope. No blocking source issue was found. R02 imported R01 checkpoints as `30ca75fe59a52ff3ed1727dec49a8a1e8e725ac0` and `37a108acf5a4fdd5eb6af4390a8cd49d95f7e111`; later integration imports only its owned schema/runtime/evidence commits, not duplicate dependency patches.

All three modules are SOURCE_REVIEWED_READY_FOR_INTEGRATION_PENDING_USER_MANUAL_TEST. Module-reported static/build checks are not independent coordinator reruns or SQL/functional acceptance. Coordinator is preparing one separate integration worktree/branch with the final original owned commits for necessary combined compile/build/lint only. This does not merge main, start/stop applications, modify databases or execute test suites. Any combined-source conflict/failure is returned to its owner before claiming integration readiness.

### Combined integration source/build — ready, not merged

App-managed coordinator worktree: `C:/Users/alexy/.codex/worktrees/manual-pass-integration/FYP Dev`, branch `codex/manual-pass-integration`, created from main `b997e7a097d0bb2423b34201e2154ac16f47b3f2`. It contains the complete reviewed R01 chain through `3fddf56`, R02 owned schema/runtime/handoff through `e31dc5c`, and R03 owned functionality/repairs/handoff through `2f58825`, imported once each without their duplicate dependency cherry-picks. No conflicts occurred. Combined checked source head is `f68095e6c089be2388a873483cd90d88076114fe`; later review/guide commits are documentation only.

Coordinator actually executed these necessary combined checks in that isolated worktree: backend `mvnw.cmd -B -DskipTests package` BUILD SUCCESS (82 production sources plus 26 existing test sources compiled; Surefire explicitly skipped execution), frontend frozen install with scripts ignored, `pnpm run build` SUCCESS and `pnpm run lint` SUCCESS. Existing V1–V7 migrations plus package.json/pnpm-lock.yaml were compared with application baseline `50c8013` and are unchanged. Diff whitespace check passed. Backend notes RegistrationStore's deprecated API; frontend has the >500kB bundle advisory (568.47kB JS / 171.62kB gzip), without a new dependency or optimization scope.

Status is **INTEGRATED_SOURCE_BUILD_CHECKED_NOT_MERGED_PENDING_USER_MANUAL_TEST**. SQL/migration/upgrade/concurrency/business/browser/UAT/restore/live integration and all test bodies remain NOT_RUN. No application or database was started/stopped/changed; main has documentation/coordination commits only, not the new application implementation. Existing running demo and untracked industry output were preserved. Modules remain available for concrete integration repairs, with no additional autonomous module work required.

Combined review receipt and new user checklist live on the integration branch under `Implementation/docs/evidence/changes/COORDINATOR/INTEGRATION_REVIEW.md` and `Implementation/docs/runbooks/MANUAL_R01_R03.md`. The new guide replaces old scan/TEST_ID/forced-deadline business instructions only for this prepared source; it does not authorize startup or automatic ownership of the existing demo resources. User instruction is still required before main merge or running-demo change.
