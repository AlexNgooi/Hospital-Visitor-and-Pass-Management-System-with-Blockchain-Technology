# M00 evidence contract

- **Inputs**: exact isolated implementation commit, Maven/Docker results and coordinator C01–C12 decisions. Human module permission is recorded in planning/12.
- **Responsibility**: preserve foundation implementation/test facts and downstream security/API contracts. No complete-business or production acceptance claims.
- **Outputs**: HANDOFF, TEST_RESULTS, sanitized TEST_MANIFEST, API/OpenAPI baseline, migration ledger, session spike and resolved questions. Coordinator owns REVIEW.md.
- **Verification**: reproduce Maven verify with Docker; compare baseline/implementation SHA and diff, migration allocation, no secrets/uncommitted code and OpenAPI references.
- **Review**: PASS only for actually executed foundation checks; maintain NOT_RUN limits for console/native deployment, full QR/E2E, performance/recovery and live integration. Module never marks itself APPROVED/MERGED.
