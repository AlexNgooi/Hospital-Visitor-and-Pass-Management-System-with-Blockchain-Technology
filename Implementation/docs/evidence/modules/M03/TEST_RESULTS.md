# M03 test results — initial independent increment

Date: 2026-10-09, Asia/Singapore. Application baseline f59baf3; branch codex/hsaas-m03-visitor-registration. Independent source checkpoint de7119e; coordinator document-only 01905a9 absorbed as 850a068. This is a contract increment, not a completed module delivery.

| Command / check | Result | Evidence and scope |
|---|---|---|
| backend: `.\mvnw.cmd -B -Dtest=SyntheticReviewRulesTests test` | PASS, exit 0; 4 tests, 0 failures/errors/skips | Initial result 19:24:49 +08; repeated after input-diagnostic redaction at 19:28:57 +08, also 4 PASS; unit rules only, no database/server |
| backend: `.\mvnw.cmd -B -Dtest=SyntheticReviewRulesTests,RegistrationReviewPortTests test` | PASS, exit 0; 9 tests, 0 failures/errors/skips | 19:36:24 +08; C09 rules plus Spring transaction-lifecycle receipt tests, not SQL/authorization acceptance |
| frontend: `pnpm install --frozen-lockfile` | PASS, exit 0 | Uses baseline lockfile; no dependency or lock changes |
| Docker availability: `docker version --format '{{.Server.Version}}'` | PASS, 29.8.0 | Read-only availability, not MySQL business acceptance |
| Full backend verify / V5 clean-upgrade | NOT_RUN | Candidate field/data contract and migration remain unapproved |
| Visitor UI / registration API / atomic submit / MRN integration | NOT_RUN | Not implemented in this initial increment |
| Real hospital MRN, production HTTPS/phone scan, hardware, messages, blockchain | NOT_RUN | External/current-scope boundaries preserved |

The four unit cases cover complete Penjaga evidence and each missing basis, false/missing confirmation, mock/live method spoofing without diagnostic echo (including redacted record representation), duplicate/unknown basis, non-Penjaga MRN/ward injection including explicit false, null values and immutable evidence snapshots. This does not demonstrate authorized staff review, persistence, grant consumption or complete registration.

Five additional mock-root tests use AbstractPlatformTransactionManager's real synchronization suspend/resume/completion lifecycle. They cover one-use, completion/rollback invalidation before modeled SQL reads, REQUIRES_NEW rejection before reads with outer receipt still usable after resume, locking already terminal states for successful replay before a new decision's state/version guard, wrong isolation/out-of-transaction capture, and safe-integer bounds/no wrap. Modeled SQL reads are counters, not a live database; the root SQL adapter and actual review authorization remain NOT_RUN.

No developer `.env`, native database, real PII, service startup, external provider, push or main merge was used. The generated ignored target reports are local diagnostics; no raw reports are delivered.
