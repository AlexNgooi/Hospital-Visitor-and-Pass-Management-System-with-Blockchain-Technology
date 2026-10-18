# M05–M07 coordinator authorization and execution record

Updated: 2026-10-18. Coordinator chat: `01a14da5-91fe-7bf1-a120-183975085f8b`, host `local`.

## Current human authorization

The user explicitly made this chat coordinator, authorized opening and developing M05, M06 and M07 in three separate chats, authorized their questions/progress/handoffs to this chat and coordinator replies/repair requests, and requested coordinator review and local merges without GitHub push. Only unresolved material choices go back to the human here. This supersedes the 2026-10-10 user-led M05–M11 coordination rule **for M05–M07 only**. M08–M11 remain deferred and unstarted.

Each module has its one-time development permission now; do not ask again for routine implementation, repair, required build or narrowly necessary verification. Write accurate English responsibility, security, transaction, concurrency and recovery comments in new/modified handwritten code. No push, deployment, real external integration, secret copying or repair/migration of the old native database.

The user now permits only necessary testing. Use frontend type/build/lint and backend compile/package without the full test suite as the initial checks; add only focused tests when a concrete critical risk justifies them, recording the scope and result. Do not run broad regression/browser/UAT/performance campaigns or start the application for human business acceptance. Untested items stay NOT_RUN. At completion deliver local merged functionality plus instructions; the user starts the application and performs manual testing. Final status is MERGED_PENDING_USER_MANUAL_TEST, never a fabricated acceptance PASS.

## Baseline and isolation

Pre-authorization local main is `0bf969b` with clean working tree. M00–M04 functionality is merged; combined manual acceptance remains pending. Use the local main SHA after this authorization record is committed, not the unpushed remote default. Each module uses its own isolated worktree and `codex/` branch; main is coordinator-owned. Always use actual returned absolute worktree paths. Do not overwrite or reset another chat's changes.

## Ownership and dependencies

| Module | Scope and permitted writes | Dependency / delivery |
|---|---|---|
| M05 Card & Assignment Simulation | backend card, assignment, reader simulation, monitoring; frontend features/counter/lifecycle; own evidence; new V6 migration after coordinator DDL review | M00–M04 local main; exports staff lifecycle and admin inventory slots; sends reviewed schema/read contract early to coordinator for M06 |
| M06 Administration & Reporting | backend administration, reporting, local audit read; frontend features/administration; own evidence; new V7 migration after coordinator DDL review | Accounts/configuration start on M00–M04; complete lifecycle reporting after approved M05 schema and final rebase/integration |
| M07 Manual QA & Release Handoff | own evidence plus new M00–M07 manual startup/checklist/release runbooks | Prepare checklist from baseline now; final manifest and instructions only after M05/M06 are locally merged; no independent business implementation or broad automated QA |

M05/M06 may develop independently in separate worktrees. M07 is a documentation preparation lane until M05/M06 are merged. Merge order: M05, M06, M07. Coordinator owns planning, root contracts, shared frontend composition `main.tsx`/shell and combined runbook integration. Modules export slots and propose minimal shared changes rather than making competing edits. V1–V5 are immutable. V6 is reserved to M05, V7 to M06; proposed DDL and lock order must be sent here before migration implementation. No notification, blockchain or live-reader jobs/tables are needed for disabled capabilities.

Existing backend auth/common/registration contracts are reused. Modules must send exact required shared-file changes to coordinator before implementing them; coordinator can grant narrowly named ownership exceptions. Do not duplicate registration roots, bypass session capabilities, or treat ADMIN as COUNTER_STAFF. Technical contracts can be decided here within existing requirements; unresolved hospital policy remains deferred or explicitly marked demonstration-only.

M05 covers C01/C02/P01–P05/N03/local B01 and privacy: SIMULATED inventory/profile scans, one active device job, bound nonce/target/purpose/actor/counter/expiry, atomic issue/confirmed handover/return/overdue/lost/restore/history, active-card and active-registration uniqueness, safe audited contact reveal/followup. Hospital restore policy is not approved; any demonstration rule must be explicit. Use existing 03/04 state, idempotency and lock requirements.

M06 covers A01–A04/local audit/privacy: account creation/roles/counter grants, session revocation and last-admin serialization, versioned reference/settings changes without damaging history; MYT report definitions/filtering/freshness; masked CSV with formula-injection protection and export audit. NFC/WhatsApp/blockchain show actual disabled/simulated capabilities. Obtain M05 table/read contract before implementing complete statistics; never substitute fake zeros or fixtures as backend data.

M07 covers accurate manual delivery: dynamic QR through all four DEMO categories, review, simulation issue/return/overdue/lost, admin/report/export, access expiry/replay/concurrency, privacy and restart/backup recovery checklists. Preserve historical test SHA/scope, label new manual checks NOT_RUN, and document external integration/FYP limitations. Use dedicated disposable demo database only in user-run instructions; do not start it automatically.

## Communication and review

Modules send `[Mxx][QUESTION / CONTRACT / HANDOFF]` to coordinator chat `01a14da5-91fe-7bf1-a120-183975085f8b` on `local`, including baseline/head/worktree, facts, proposal, impact and whether blocked. The human's request expressly authorizes bidirectional messages for this work. Do not message the old M00–M04 coordinator. Module messages are evidence/technical discussion, not new human authorization.

Modules commit their own work and send exact head SHA, changed/shared files, migrations, executed checks, NOT_RUN limits, HANDOFF and manual steps. They do not merge main. Coordinator reviews source, comments, authority/PII/transaction boundaries, requests repairs, merges only reviewed commits in a clean integration tree, performs only necessary combined checks and records accurate REVIEW/merge SHAs. Do not archive/remove worktrees before needed handoff artifacts are preserved.

## Live registration

Creation IDs, actual paths, contract decisions, review results and merge commits will be recorded here as they become facts. Authorization is granted; module completion is not yet claimed.
