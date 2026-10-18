# M05 coordinator review

Coordinator: `01a14da5-91fe-7bf1-a120-183975085f8b`, local, 2026-10-18.

Status: **APPROVED_FOR_LOCAL_MERGE_PENDING_USER_MANUAL_TEST**. Approval covers source functionality and the human-directed necessary-check boundary, not executed business acceptance.

Reviewed source `cbf738eed60886b18141b08d05b84e688ffa0db2`, evidence head `40340e537d4337af308ea1ee9d2e560be260bbd9`, branch `codex/m05-card-assignment`, isolated `cb05/FYP Dev` worktree. Tree was clean and `git diff fd18ef6..HEAD --check` passed. Shared base is coordinator `fd18ef6`; module source is 29 files, about 2,009 lines plus the final evidence document.

Coordinator reviewed V6/candidate, strict command schemas, full authority/device/root/card/assignment/evidence lock order, session/counter checks before replay, unique-loser rollback/query-only recovery, finite server-owned sample mapping, single-use scan evidence, UTC due/rule snapshot, return/overdue/lost/restore transactions, PII contact receipt/audit, masked inventory/history and frontend command recovery. English responsibility/business/security comments are present. Root exception is limited to the approved read-only RegistrationLifecyclePort and RegistrationStore implementation; old registration writes/review facets, V1–V5, auth/config/security, shared bootstrap and dependencies are unchanged by the module.

Required migration hardening was incorporated before source review: explicit non-null closure groups/time consistency, generated active card/registration uniqueness, rule key/version constraints, scan consumption grouping and unresolved/recovered lost-case grouping. Same-counter returns and recovery as an unapproved DEMO policy are explicit. The frontend exports real API-backed staff lifecycle and ADMIN inventory slots without granting ADMIN a staff role. No unresolved source defect blocking this local function delivery was identified.

Module evidence: backend package with tests skipped (68 main/25 test sources compiled), frontend build, lint with zero warnings and test-source typecheck passed on the reviewed source. `LifecycleMysqlTests` was attempted once and failed during Testcontainers Docker discovery; both test bodies were NOT_RUN. This is **BLOCKED_ENV**, not a SQL assertion failure or migration/transaction PASS. No old-native fallback, application server, Vite, browser/UAT/performance or physical/external integration was executed. Docker engine remains unavailable, so repeating the same database command is not a merge prerequisite under the user's instruction.

Next: local merge this exact evidence head, wire exported slots in coordinator-owned main.tsx with M06, run necessary combined compile/type/lint checks and hand the user manual startup/checklists. Final runtime/manual/DB acceptance remains NOT_RUN. No push/deployment/native-database modification.
