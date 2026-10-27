# R01 current contract — 2026-10-27

- planning/16 and coordinator C-R02 authorize manual-registration-v2, V8, four current forms and separate Penjaga pass terms. Legacy synthetic-registration-v1 history and its retained successful request encoding remain readable; fresh submissions require v2.
- Sole registration persistence/port owner. Normalized registration_destinations is immutable after creation; lifecycle locks current authority -> category -> ascending numeric destination SHARE locks -> root/recheck -> caller cards/assignments. Only known legacy records may fall back to primary destination. Unknown schema or missing v2 relation fails safely.
- Lifecycle Access exposes active allowed catalogue choices and category cardinality without patient/form JSON. Inactive references never block existing return/lost operations by active filtering alone.
- Default queue/detail remains masked. Explicit current-counter staff review-fields POST requires CSRF/expected version and safe local audit before response; no PII in audit/idempotency/reports/public read.
- Current verification: necessary backend compile/package with tests skipped only; SQL, app, browser, business/concurrency/UAT NOT_RUN. Earlier M03 text below is historical and does not authorize test execution.

# M03 registration root contract

- Inputs: planning/03 R02–R05 and R06 submission; planning/04 C05/C09–C12; reviewed M00/M02 ports and LOCK_GRAPH.
- Responsibility: the sole persisted registration root implements the frozen write/review and masked read facets, versioned fields, privacy acknowledgement, random reference and atomic grant consumption. M04 owns staff review HTTP/orchestration, audit and idempotency through these facets; it creates no second root.
- Boundaries: root/create/read receipts are exact original READ_COMMITTED transaction resources, reject suspension/reuse/completion before SQL, and enforce current anonymous/public or staff authority as appropriate. Read scope uses the current account role and exact currently authorized counter; queue/detail expose only the frozen masked DTOs.
- Scope: the approved synthetic DEMO field/privacy contract is implemented. Mock MRN matching never approves a Penjaga registration. New/live hospital fields and clinical/privacy/retention policy remain deferred; notifications/blockchain remain disabled.
- Outputs: module source/tests and [M03 handoff](../../../../../../../docs/evidence/modules/M03/HANDOFF.md). Actual V5 is implemented under the approved shared-file exception and awaits final coordinator acceptance; V1–V4 stay immutable.
- Verification: disposable Testcontainers MySQL and an owned browser MySQL harness only; servlet/CSRF, whitelist, same-context submit, concurrency, replay, audit rollback and masked read lifecycle. See [browser verification](../../../../../../../frontend/tests/registration/README.md). No developer secrets or native database fallback.
- Authorization: user replied “继续” in M03 on 2026-10-09 after the existing module permission request. Assistant directly implements/tests with English comments in the isolated codex/hsaas-m03-visitor-registration branch; coordinator reviews/merges.
