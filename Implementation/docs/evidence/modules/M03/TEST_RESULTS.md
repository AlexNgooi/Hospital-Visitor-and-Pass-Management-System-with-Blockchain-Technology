# M03 test results — initial independent increment

Date: 2026-10-09, Asia/Singapore. Baseline f59baf3; branch codex/hsaas-m03-visitor-registration. Source is an uncommitted module increment, not a completed delivery.

| Command / check | Result | Evidence and scope |
|---|---|---|
| backend: `.\mvnw.cmd -B -Dtest=SyntheticReviewRulesTests test` | PASS, exit 0; 4 tests, 0 failures/errors/skips | Initial result 19:24:49 +08; repeated after input-diagnostic redaction at 19:28:57 +08, also 4 PASS; unit rules only, no database/server |
| frontend: `pnpm install --frozen-lockfile` | PASS, exit 0 | Uses baseline lockfile; no dependency or lock changes |
| Docker availability: `docker version --format '{{.Server.Version}}'` | PASS, 29.8.0 | Read-only availability, not MySQL business acceptance |
| Full backend verify / V5 clean-upgrade | NOT_RUN | Candidate field/data contract and migration remain unapproved |
| Visitor UI / registration API / atomic submit / MRN integration | NOT_RUN | Not implemented in this initial increment |
| Real hospital MRN, production HTTPS/phone scan, hardware, messages, blockchain | NOT_RUN | External/current-scope boundaries preserved |

The four unit cases cover complete Penjaga evidence and each missing basis, false/missing confirmation, mock/live method spoofing without diagnostic echo (including redacted record representation), duplicate/unknown basis, non-Penjaga MRN/ward injection including explicit false, null values and immutable evidence snapshots. This does not demonstrate authorized staff review, persistence, grant consumption or complete registration.

No developer `.env`, native database, real PII, service startup, external provider, push or main merge was used. The generated ignored target reports are local diagnostics; no raw reports are delivered.
