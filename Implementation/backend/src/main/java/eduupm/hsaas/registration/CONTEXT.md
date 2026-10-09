# M03 registration root contract

- Inputs: planning/03 R02–R05 and R06 submission; planning/04 C05/C09–C12; reviewed M00/M02 ports and LOCK_GRAPH.
- Responsibility: versioned registration fields, privacy acknowledgement, random public reference, submission aggregate and same-transaction grant consumption. M04 owns review HTTP commands and invokes the coordinator-frozen root port.
- Scope: synthetic local demonstration only until hospital field/privacy policy is approved. Mock MRN matching never approves a Penjaga registration. Notifications/blockchain remain disabled.
- Outputs: module source/tests and evidence/modules/M03. V5 is coordinator-reserved; V1–V4 stay immutable.
- Verification: disposable Testcontainers MySQL only; servlet/CSRF, field whitelist, same-context submit, concurrency, replay and audit rollback. No developer secrets or native database fallback.
- Authorization: user replied “继续” in M03 on 2026-10-09 after the existing module permission request. Assistant directly implements/tests with English comments in the isolated codex/hsaas-m03-visitor-registration branch; coordinator reviews/merges.
