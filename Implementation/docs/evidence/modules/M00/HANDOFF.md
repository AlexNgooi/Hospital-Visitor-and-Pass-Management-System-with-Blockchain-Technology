# M00 Foundation & Security handoff

Status: REVIEW_READY, not coordinator-approved/merged. Module assistant directly implemented, tested and documented this approved scope, with English code comments.

- Module chat: 01a11bcf-a53d-7323-a74e-edffa8092c50 (migrated from 01a11ba4-d95a-7260-976f-f997b683c403); coordinator 01a11b84-212d-7273-93a5-5dc16c698bdb, host local.
- Baseline: `c2b0c316e04947df06b84f1008f470b6e5a9eb8b`.
- Branch: `codex/hsaas-m00-foundation`; isolated worktree `C:\Users\alexy\.codex\worktrees\ced2\FYP Dev`.
- Submitted implementation head: `42bc95c68df2bc392fbd2e3ad72096a53929975e`. The following evidence-only commit includes this handoff/results/manifest; its exact review artifact HEAD is supplied in the accompanying coordinator dispatch. Both have identical backend source, migrations, dependency and API contract files. This distinguishes the tested code SHA from the evidence commit without a self-referential commit hash.
- User approval: 2026-10-08 human coordinator message “现在每个module 都好了吗？ 好了的话可以开始让 00 01 开始写”, recorded in planning/12; direct implementation/English comments rule overrides old handwritten-source guidance. Technical replies are not approval for another module.
- Ownership: Implementation/backend auth/config/common, main/config/dependency baseline, V1–V3, tests/contexts/runbook; Implementation/docs/evidence/modules/M00. No frontend/planning/main checkout edits, push, merge, deployed service or unapproved module startup.
- Dependencies/decisions: [QUESTIONS](QUESTIONS.md) records C01/C02/C03/C10/C11/C12, cookie/TTL/bootstrap, migration reservation and approved JPA/JDBC manager. Retain eduupm.hsaas. M01 mock work may consume the baseline; real integration waits for coordinator review.

Implemented behavior: explicit database readiness; framework browser CSRF and credential login; persisted Session fixation/CSRF rotation; current role/counter/epoch authority; durable logout/expiry/policy capability barriers; first-admin guarded offline command; typed safe errors/capabilities; closed unavailable integration paths; local audit plus versioned HMAC-backed command retention. Stable anonymous and staff capability ports enable downstream domain transactions without locking framework Session rows. See [API baseline](API_BASELINE.md), [OpenAPI](openapi.json), [session spike](SESSION_SPIKE.md), [migration ledger](MIGRATIONS.md) and [backend runbook](../../../../backend/README.md).

API changes implement C01 endpoints and minimal capabilities, not QR/registration/review/account CRUD. Me/login IDs and counter IDs are strings. Optional C10 details is typed and restricted to restart errors but no restart endpoint exists. Single role ADMIN/COUNTER_STAFF, ADMIN has no implicit counter role. Future object controllers still need current counter scope and frozen 404 semantics. M06 internal mutation ports protect last active admin and advance epoch; account password administration is later-owned.

Migrations V1–V3 create identity/reference/permission/audit/idempotency, official pinned JDBC Session and separate binding/context guards. No default staff/password, hospital catalogue, QR/business/provider tables or disabled tasks. Clean/upgrade testing is disposable-container-only; native history remains uninspected. All future schema versions require coordinator allocation. Applied migrations are immutable after integration.

English comments document class/function responsibilities, before/after-save ordering, irreversible revocation, lock acquisition, current DB authority, serialization/credential boundaries, explicit DTO encoding and transaction rollback. All 29 changed/added Java files have responsibility documentation; critical-rule comments were manually reviewed alongside tests. The non-secret tracked local profile was deliberately added despite the repository's broad application-local.yaml ignore pattern; no .env or secret file was staged.

Modes: reader disabled by default (mock only synthetic/test), MRN manual/mock configuration only, notifications/blockchain disabled. API reports NOT_ENABLED/LOCAL_ONLY, no fake task/delivery/proof. Live MRN/reader/card/WhatsApp/chain verification remains NOT_RUN. Nimbus 10.10 fixed HS256 compatibility PASS is dependency evidence only; M02 owns strict entry token/key ring/nonce/challenge lifecycle.

| Requirement / contract subset | Scope | Result | Command / exit / finish | Evidence | Implementation SHA |
|---|---|---|---|---|---|
| Q05 / C01–C03 security foundation | current subset | PASS; whole Q05 not yet accepted | Maven verify / 0 / 2026-10-09 05:49:56 +08 | TEST_RESULTS, TEST_MANIFEST | 42bc95c |
| Q04 persisted Session + DB outage | current subset | PASS; full deployment/worker recovery NOT_RUN | same run | SESSION_SPIKE, TEST_RESULTS | 42bc95c |
| C06/C11 safe audit/idempotency + hybrid transaction | current foundation | PASS; full business commands NOT_RUN | same run | TEST_RESULTS, TEST_MANIFEST | 42bc95c |
| C12 security prefix/confirmed save | current prefix | PASS; full QR/domain race graph NOT_RUN | same run | SESSION_SPIKE | 42bc95c |
| V1–V3 clean/temporary upgrade | current foundation | PASS; native schema NOT_RUN | same run | MIGRATIONS, TEST_RESULTS | 42bc95c |
| C10 typed error/Nimbus HS256 dependency | current shared types/dependency | PASS; entry/restart lifecycle NOT_RUN | same run | API_BASELINE, TEST_RESULTS | 42bc95c |
| Q01–Q03/Q06–Q07/full D01/E2E | later modules | NOT_RUN | — | TEST_RESULTS limits | 42bc95c |
| live reader/MRN/WhatsApp/blockchain/Q08 | deferred | NOT_RUN / disabled | — | no live evidence | 42bc95c |

Final build: 40 tests, failures/errors/skips 0, BUILD SUCCESS and executable JAR. Actual failure cases include expired/missing role/current authority, malformed input, unchanged deadlines after save fault, no buffered successful login/cookie on tail failure, durable logout barrier after delete fault, policy/login race, multiple context-path applications, same-key concurrency, real audit SQL rollback and temporary DB outage. Final code was not changed after that successful run. Raw reports/artifacts are ignored; only sanitized test metadata is committed.

Known limitations: no blocking unresolved M00 contract. Single-instance in-memory limits need a distributed design before multi-instance untrusted exposure; O07 TTL/password/hospital policy approval remains pending. No capability/idempotency physical cleanup task; retention/references must be coordinated later. Console interaction, native schema compatibility, deployment HTTPS/forwarded proxy acceptance, complete QR/registration/lifecycle/backup/performance are NOT_RUN. Testcontainer setup requires Docker; a missing daemon fails tests, never silently skips or uses native DB.

Recovery/run instructions: [backend README](../../../../backend/README.md); explicit local profile only, no secret/default account; migration validate-only/no auto-baseline/repair/clean. Preserve original key on uncertain command outcome; do not resubmit with a new key to bypass domain state. Real bootstrap/recovery is a separate explicitly selected operational action and was not performed here.

Working-tree changes excluded from submitted head: none at final dispatch; only ignored local target artifacts remain. Coordinator first checks exact branch/implementation/evidence heads and diff, reviews lock/save/transaction contracts, reproduces Maven verify with Docker, then controls local merge and integration regression. M01 then tests proxy cookies/CSRF/login/logout against the reviewed backend; M02 consumes the approved prefix only after its own human startup/permission. This handoff does not automatically launch any module. Coordinator records review/merge in REVIEW.md; M00 has not claimed APPROVED/MERGED.
