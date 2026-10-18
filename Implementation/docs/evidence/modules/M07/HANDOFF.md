# M07 Manual QA & Release Handoff

Date: 2026-10-18, Asia/Singapore. Status: **DOCUMENTATION_REVIEW_READY / PENDING_COORDINATOR_LOCAL_MERGE**. M00–M06 functionality is MERGED_PENDING_USER_MANUAL_TEST. Documentation completion is not user/business/DB acceptance. M07 does not self-approve or merge main.

## Identity and authorization

- Module chat: `01a14da7-806e-7ca2-98cb-6c342806f2e3`; current coordinator `01a14da5-91fe-7bf1-a120-183975085f8b`, host local.
- Human authorization: 2026-10-18 M05–M07 direct-development delegation and AGENTS/planning14 authorize this documentation lane, current-coordinator questions/progress/HANDOFF and coordinator replies. Older user-led coordination/no-testing instructions are superseded for these modules only. M08–M11 remain unstarted.
- Initial clean detached baseline: `d103b888527c4ba8e90f37d93059daf2d78ed02f`; dedicated branch created before writes: `codex/m07-manual-release`.
- Exact own worktree: `C:/Users/alexy/.codex/worktrees/7a60/FYP Dev`. No shared Local or other module checkout was edited by M07.
- Checked combined runtime source: `761491e89910566c83fa184cb0aaa79ee625f128`.
- Latest absorbed coordinator evidence: `06a9ce472dcda246b22d9a6466d0dc4fa4a53a28` (runtime unchanged).
- Frozen documentation content commit: `efc13a60a0efe081900c6ca30c50fbda3c8c4967`. This subsequent handoff-only commit and its exact final HEAD are sent in the coordinator dispatch, avoiding a self-referential SHA. No uncommitted content is part of the submitted delivery.
- Read M05 source `cbf738eed60886b18141b08d05b84e688ffa0db2`, delivery `40340e537d4337af308ea1ee9d2e560be260bbd9`, local merge `6e458b71fd21337f84a07a6786224dee9c974848`; M06 C22 source `0a14f3acf90af5b44193c3aca0d034106104cbe5`, delivery `ba940e749454910fe9f5d03f19c28aba911ceaac`, local merge `0917266984a9afa35efc5a970599585a6f9a12dd`, their final HANDOFF/REVIEW and actual merged code.

## Delivered documents and ownership

| File | Responsibility |
|---|---|
| [MANUAL_M00_M07.md](../../../runbooks/MANUAL_M00_M07.md) | Dedicated user startup, real routes/accounts, QR→four categories→review→SIMULATED enroll/issue/return, overdue/lost/recovery/admin/report steps; private backup/restore/stop and limits |
| [MANUAL_ACCEPTANCE_M00_M07.md](../../../runbooks/MANUAL_ACCEPTANCE_M00_M07.md) |40 user scenarios, all33 requirement IDs, permissions/replay/expiry/concurrency/PII/UNKNOWN/recovery, optional expected accounting ledger; every new manual result NOT_RUN |
| [RELEASE_MANIFEST_M00_M07.md](../../../runbooks/RELEASE_MANIFEST_M00_M07.md) | Exact source/merge/artifact Git objects, V1–V7 inventory, modes/report semantics, historical PASS at original SHA/scope and exact current compilation boundary |
| CONTEXT.md / PREPARATION.md / HANDOFF.md | Module boundary, explicitly historical dependency-wait record, final delivery identity and review action |

Only these six documentation files are M07-authored changes against coordinator main. `COORDINATOR_CHECKS.md` is coordinator-owned, inherited unchanged; M07 neither overwrites it nor authors REVIEW.md. Old MANUAL_M00_M04 and prior evidence remain unchanged as historical references. No business code, API/DTO/permission/state/migration/dependency/generated file/shared composition modification is authored by M07.

## Source reconciliation

- V1–V5 Git blobs match the original baseline. V6 `V6__card_assignment_simulation.sql` blob `00f20240b6fe2b99e6902d16d07a7fddab0322f2`; V7 `V7__administration_reporting.sql` blob `a2c857e27b439a9b1a1faa1969d4e40fb07d732d`. These are source identities, not Flyway checksums or migration execution evidence.
- Confirmed main.tsx composes actual PUBLIC registration/M02 QR, M04 review, M05 staff lifecycle/ADMIN inventory and M06 ADMIN accounts/settings/reports/audit slots. No harness is offered as a normal application page; ADMIN never inherits staff issue/return authority.
- Confirmed48 fixed trusted samples, current actor/session/counter/purpose/target/nonce/lease binding,120s single device job, server-derived UID/profile, fixed same-issue-counter return. No physical reader or machine credential endpoint is enabled.
- Confirmed default24h/category and1..720 range; issued dueAt/key/version frozen, monitor30s/50batch, active-due read predicate independent of materialization. Minimum manual overdue demonstration requires a new1h loan and real waiting, not clock/DB edits.
- Confirmed LOST closes an active loan and retains unresolved case; DEMO restore scans the same sample, requires both explicit confirmations and DEMO_RECOVERED_AND_CHECKED, keeps the old loan closed. Hospital recovery policy is not approved.
- Confirmed reveal is only currently authorized active-overdue; each actual response is freshly audited and UI exposure capped30s. UNKNOWN review/lifecycle handles remain original commands; M04 has status-check/retry, M05 only same-command retry plus separate scan refresh. M06 management uses authoritative refresh/version inspection, not an invented shared retry UI.
- Confirmed C22 current-environment/SYNTHETIC/SIMULATED predicates in every metric/group/preview/export path, MYT inclusive dates→UTC half-open interval, max366days, period/current/ward/inventory distinctions, snapshot vs later preview,5s freshness and no fake-zero fallback. Export metadata never selects raw visitor fields;10,000-row and1,047,552-byte escaped JSON bounds reject rather than truncate; audit can commit before a lost download response.

M07 adds no lock path. Existing M05 owner contract remains account→sorted counters→binding/context→optional category→device→registration→card→assignment→scan/result→audit/idempotency; M06 uses the existing AccountChanges gates or principal/context→reference/settings path without callbacks to QR/root/assignment. This is source reconciliation, not executed deadlock/transaction proof.

## Launcher findings and resolution

M07 reported two concrete gaps in the coordinator's new launcher. Coordinator fixed restore authority resurrection in `182cd80825a3dac17f772d51227bc14d9c7945cb` and early startup signal cleanup in `0c99d38ad40a630f77288cf99a2dd5d8f71b4b0e`; M07 inspected the code, not runtime behavior.

Restore imports a complete private bundle into a new owned DB, retains business/history/keys, then revokes auth/framework/QR/unconsumed grants and unfinished scans before Java starts. V6 confirms cancelling CLAIMED/SUCCEEDED jobs leaves consumed_at NULL and satisfies the scan-consumption group by source reasoning. Early signals wait for an in-flight resource result, capture its ID, block further launches and enter exact owned cleanup. Force-kill/shutdown cleanup is not guaranteed. Actual restore/signal execution and RPO/RTO remain NOT_RUN.

## Checks and honest limits

| Scope | Result / provenance |
|---|---|
| M07 staged/document `git diff --check`, `git diff --cached --check` | PASS, exit0; whitespace only |
| PowerShell local Markdown target and requirement/case review |33/33 requirement IDs covered,40/40 new case rows NOT_RUN, no missing local targets after HANDOFF creation; documentation inspection only |
| Runtime source/artifact comparison | Exact V1–V7 and manifest Git object IDs reconciled; backend/frontend/scripts unchanged by this module |
| [Coordinator combined checks](COORDINATOR_CHECKS.md), source761491e | Backend package/classpath exit0 at14:38:31+08 (78main/26test compile; all bodies skipped); seed javac exit0 only; frontend build/lint/typecheck exit0, zero lint warnings; launcher node--check exit0. These are coordinator results, not M07 reruns |
| M05 narrow MySQL attempt | Testcontainers discovery exit1; both intended method bodies BLOCKED_ENV/NOT_RUN, no SQL assertions ran; not an assertion failure or PASS |
| M06 earlier rules |4/4 MYT/filter/CSV rule tests reported at initial module source; not rerun after C22 and not SQL/business acceptance |
| New manual/business/DB migration/constraints/query/concurrency/rollback/browser/UAT/performance | NOT_RUN; Docker daemon unavailable and user owns manual execution; no native fallback |
| Startup/backup/restore/signal cleanup/physical hardware/live hospital/notification/blockchain | NOT_RUN/deferred; no external call/queue/backfill or future module startup |

Build warnings remain documented: deprecated RegistrationStore Jackson accessor, Vite application chunk about553kB/gzip168kB above500kB guidance. No unrelated optimization, false screenshot or runtime result was added. All new command snippets have English comments; no production handwritten code was changed. No secrets/.env/PII/backups/binaries were read/copied/committed by M07.

## User entry and coordinator action

User first ensures Docker Engine and locked project prerequisites are available, then follows the new MANUAL_M00_M07: frozen frontend install; backend skipTests package/runtime classpath; from root `node Implementation/scripts/manual-demo.mjs start`; wait READY and open loopback15417/login. Public demo accounts are explicitly isolated and synthetic. New inventory/registration/assignment workflows use actual protected UI/APIs, not fixture roots. No environment is auto-started by handing over this document.

Backup before stop if data is needed; stop deletes only the owned disposable container, bundles remain. `start --restore <returned private directory>` requires the matching source/schema and complete local bundle; old capabilities are revoked, new authorized sessions/scans required. The old native3306 database is never a target, and no repair/baseline/clean instruction exists. Detailed recovery and strong-termination diagnostics are in the runbook.

Coordinator reviews these six documentation files against unchanged runtime761491e and its receipt, records REVIEW/local merge, and gives the user the dedicated entry. No additional broad tests or repeat blocked MySQL command is needed to review this documentation. Runtime/manual findings go back to the responsible module; no unresolved documentation/source discrepancy is known at handoff, while NOT_RUN acceptance risks remain explicit. M07 does not push, deploy, merge main, archive worktrees or start M08–M11.
