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

All three chats were created and confirmed active on the committed authorization baseline `d103b888527c4ba8e90f37d93059daf2d78ed02f`:

| Module | Chat ID (host local) | Isolated worktree | State |
|---|---|---|---|
| M05 | `01a14da7-8089-7203-a52e-2a7b03f918bf` | `C:/Users/alexy/.codex/worktrees/cb05/FYP Dev` | IN_PROGRESS; initial baseline/contract preparation |
| M06 | `01a14da7-807a-7cb0-b105-e89171c72150` | `C:/Users/alexy/.codex/worktrees/ca56/FYP Dev` | IN_PROGRESS; account/configuration first |
| M07 | `01a14da7-806e-7ca2-98cb-6c342806f2e3` | `C:/Users/alexy/.codex/worktrees/7a60/FYP Dev` | IN_PROGRESS; documentation preparation, final dependency pending |

The app created isolated detached worktrees; each module was instructed to create its own `codex/` feature branch before implementation. Model/thinking overrides were omitted because today's user request did not select a model. Actual paths and baseline were verified from the app and `git worktree list`; no implementation completion is claimed here.

## C18 shared contract decisions

- Coordinator owns the finite LocalAuditPort action/target/state extensions and IdempotencyPort safe-result states for both modules. Existing wire encoding/version and old results are preserved; no free-form audit payload is added. M05/M06 import the exact coordinator commit rather than competing on these shared files.
- V6 owns `system_settings(id BIGINT AUTO_INCREMENT PK, setting_key VARCHAR(64) UNIQUE, value_int INT, version BIGINT, updated_by nullable FK users, updated_at DATETIME(6))`, with required/check constraints. Four `return_hours_<CATEGORY_CODE>` values initially 24, range 1–720; version starts 0. This is an explicit demonstration default, not hospital policy. M05 reads hours/version and freezes due_at/rule key/version on issuance; M06 writes settings with CAS and same-transaction history. V7 does not recreate this table. Old assignments never get recalculated.
- M05 may add `registration/RegistrationLifecyclePort.java` and minimally extend `RegistrationStore` to implement that read-only root facet, plus minimal registration bean wiring if necessary. Preserve current review/public contracts. Masked access and audited contact reveal require current authorized counter and an opaque exact-transaction receipt; no duplicate registration entity or independent lifecycle SQL adapter for registration fields.
- M06 can compose existing AccountChanges inside an initially empty READ_COMMITTED REQUIRED transaction and append typed reason history before the same commit; it need not edit AccountChanges. Preserve the existing identity gate/principal/counter/binding ordering. New reference/settings commands use principal → binding/context validation → reference/setting locks and never call QR/root/assignment while holding reference locks. Existing counter/permission paths retain their canonical ordering.
- M05 lifecycle read definitions for M06: cards.status is current inventory; assignment closed_at NULL is active; overdue means active and due_at <= now even if scheduler lags; issue count uses issued_at, return count only returned_at, lost closure uses closure_reason LOST. Join registration for category/destination/counter. Timestamps are UTC; report input/output uses explicit MYT boundaries.
- M07 owns new MANUAL_M00_M07.md, MANUAL_ACCEPTANCE_M00_M07.md and RELEASE_MANIFEST_M00_M07.md in docs/runbooks plus its own evidence. The old M04 harness is not automatically an M00–M07 launcher; exact enablement and seed changes require source review and a dedicated launcher/integration decision.

C19: reviewed precise M05 `V6_CANDIDATE.sql` and M06 `V7_CANDIDATE.sql` from their isolated evidence directories and approved new migration implementation. V6 must harden nullable closure CHECK branches with explicit non-null reason, event-time consistency, safe return-rule key/version and grouped lost resolution/scan consumption. V7 history JSON is a service-owned whitelist of reference/role/active/permission/integer-setting values, never credentials or visitor data. Exports use an explicit 10,000-row bound and reject larger ranges rather than silently truncating. Full business/DB acceptance remains NOT_RUN. M06 may implement real reporting SQL against approved V6 columns, then absorb the reviewed M05/main dependency before final delivery.

C20: approved MYT inclusive date inputs converted to UTC `[start, end)`; period registration/issue/return/lost activity is displayed separately from current active/overdue inventory. Unassigned cards cannot be attributed to a ward; category-only inventory filtering must be explicit. M06 export is masked and does not select form_data. Coordinator source review required measuring the actual serialized JSON export envelope rather than estimating CSV bytes; M06 implemented rejection before audit/history inserts when the shared client response limit would be exceeded.

C21: coordinator added `Implementation/scripts/manual-demo.mjs`, `ManualDemoSeed.java` and scripts CONTEXT in `f7b3e49`, restore capability revocation in `182cd80`, and startup interruption handling in `0c99d38`. This is a user-run disposable environment, not an executed acceptance harness. Source/syntax checks only so far. Fixed loopback web/backend/control ports 15417/18407/15418, exact container name/ownership label, random non-3306 MySQL mapping, fresh reference-only synthetic identities and two counters, mock reader/MRN and disabled external services. ADMIN enrollment uses the real application API; no registrations/cards/loans are inserted by the seed. M06 has no separate feature flag.

M07's source review identified restore reviving old capabilities and startup signals bypassing cleanup. Both were corrected: restored database rows keep business/audit/idempotency/keys but revoke framework sessions, owner bindings/contexts, QR displays/challenges/unconsumed grants and incomplete scan authority before Java starts; signal handlers register before resources and unwind in-flight startup after capturing Docker's returned ID. `start`, `backup`, `stop`, and `start --restore <owned backup directory>` remain user-invoked and operationally NOT_RUN. Stop removes only exact owned disposable resources and retains backup bundles, which contain private demonstration data/keys and are ignored by Git.

Necessary verification agreed with M05: one narrow real-MySQL test class for new migration syntax, active-card/registration uniqueness and a rollback case; no complete historical foundation/QR/browser suite. After M06 merge the same narrow class may validate combined V5→V6→V7 migration compatibility. Existing historical migration-count expectations are not an executed PASS for this release.
