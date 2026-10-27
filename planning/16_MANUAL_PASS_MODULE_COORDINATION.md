---
type: module-coordination
updated: 2026-10-27
status: three-module-chats-started
---
# Manual pass change — R01–R03 coordination

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
| R01 | 01a17ab3-135b-7fd2-b581-28455a3e3591 / local | C:/Users/alexy/.codex/worktrees/a527/FYP Dev / codex/r01-registration-mrn | STARTED; active turn and clean baseline confirmed |
| R02 | 01a17ab3-1361-7e42-a8c4-44a3e5d6d79a / local | C:/Users/alexy/.codex/worktrees/b799/FYP Dev / codex/r02-manual-pass | STARTED; active turn and branch confirmed |
| R03 | 01a17ab3-1270-7892-827f-c87162b13d80 / local | C:/Users/alexy/.codex/worktrees/8add/FYP Dev / codex/r03-admin-reporting | STARTED; active turn and branch confirmed |

Shared committed startup baseline: `cbd4025d92a5d8dc3faeb3d874de16ba4589c89c`. All three app worktrees were verified at this SHA; each module sent its actual isolation confirmation to the current coordinator. A single wait_threads snapshot confirmed all three initial turns inProgress with initial assistant/tool activity. No model/thinking override was supplied.

Coordinator relayed R03's exact system_settings/destination/actor/source column request to R02 and its normalized destination request to R01, acknowledged the dependency to R03 and instructed both owners to send compatible small checkpoints. Precise wire/DDL/port proposals are still awaiting review, not approved merely by chat startup. No implementation completion, tests, database execution, main implementation merge or live integration is claimed.
