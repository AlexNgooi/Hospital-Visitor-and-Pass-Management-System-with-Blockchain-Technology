# M03 test results — current synthetic delivery

Date 2026-10-10, Asia/Singapore. Application baseline f59baf350feeec024bf7178bf4d421aec4a6d41e; current executable source checkpoint 9d9baf658fd6c7151b4d7a83a3d85d380dc982c6 on codex/hsaas-m03-visitor-registration. Backend checkpoint 869c6cb, Unicode correction 8623e7c and UI/C16 checkpoint 9d9baf6 are separately reviewable. Browser harness is frozen at bdb05624db58aa5fac2b4954cfaf31cdfe8a873c (R4 cleanup e90df7c). Coordinator independently accepted the backend 109, Unicode 17 and frontend 110 checkpoints; final module APPROVED/MERGED remains coordinator-owned.

| Command / check | Actual result and limits |
|---|---|
| backend .\mvnw.cmd -B verify, final retry | PASS exit 0, 109 tests, zero failures/errors/skips, repackaged JAR; 13:47:24 +08 |
| backend .\mvnw.cmd -B -Dtest=RegistrationFieldTests,RegistrationMysqlTests test | PASS exit 0, 17 tests, zero failures/errors/skips; 13:30:41 +08; actual NFC success/original-hash 409 and Unicode blank policy |
| frontend pnpm test | PASS exit 0, 110 tests/five files; latest final source run starts 13:38:58 +08 |
| frontend pnpm typecheck:test / pnpm build / pnpm lint | PASS exit 0; lint zero warnings on 9d9baf6 |
| frontend pnpm test:proxy | PASS exit 0, 13:47 +08; synthetic proxy-only evidence, not a database test |
| Final rebuilt-backend browser receipt and owned cleanup | PASS 47 unique checks, zero browser exceptions/axe violations; frozen harness bdb0562; receipt 2026-10-10T14:06:19+08:00; observed exits/exact container removal/all three ports unbound |
| Hospital live formats/API, physical camera/reader/cards, native browser toolbar zoom, production HTTPS, notifications/blockchain | NOT_RUN; unavailable integrations remain disabled/deferred |

The complete backend includes real disposable MySQL V1→V5 clean/upgrade; four whitelists and strict scalar/duplicate/unknown/CSRF/privacy failures; atomic parent/ack/grant/audit/idempotency; competing exact/different commands and full audit rollback; original success recovery after expiry/revoke; MRN digest/fingerprint/field/context/deadline binding, timeout/manual deferral and cleanup; exact RC root/read/create receipt SQL-zero suspension rejection and outer resume; masked single-counter history, role/session/permission/current metadata and reference deactivation serialization. No notification consent/job, pass, card or patient data result is created.

Frontend tests cover all four flows, explicit privacy, linked focus and editing without focus theft, retained draft across steps, metadata failure→parent revalidation→original-context explicit retry, MRN invalidation/manual deferral, NFC/codepoint/Unicode blank policy, strict wire data, exact serialized-body/key recovery and later UNKNOWN errors outside a disabled or unmounted M02 entry. C16 default/compact tests retain the reviewed M02 authority/availability gate.

## Failed attempts retained as facts

- Initial read-scope mapper returned an empty object instead of rejecting serialization; explicit serializers corrected it. See READ_CONTRACT_HANDOFF.
- Initial M03 MySQL run had two incorrect fixtures: foundation write failure is 503; internal authority checks persisted EXPIRY_TIME. Corrected fixtures pass all 11 live cases.
- Configuration runner initially counted JdbcTemplate InitializingBean as SQL and lacked QR for the production guard; corrected lifecycle/dependency fixtures pass four cases.
- Unicode full run at 13:27:36 executed all 109 tests successfully but packaging exited 1 because an owned browser server held the target JAR open on Windows. It is not recorded as a successful verify.
- Stopped-server full run at 13:44:02 failed with 11 context errors during M03 MySQL Flyway initialization (connection closed), rather than business assertions. No production/test-source timeout change or skip was made; the subsequent lower-concurrency fresh owned run passed all 109 and JAR at 13:47:24.
- First fresh final browser attempt stopped at schema-retry input wait without a safe response status capture; a later explicit retry returned 200 and a subsequent fresh 43-check run passed. The original timeout cause is not asserted. Later harness increments capture the exact retry status and require a present, enabled parent fieldset.
- The initial 47-check receipt had a weak ordinary-resume predicate: button.disabled does not reflect an inherited disabled fieldset. Screenshot QA caught a disabled zoom state. That receipt is rejected as final fresh-resume/normal-zoom evidence; the corrected scenario requires actual parent authority plus Playwright enabled state, without changing production logic. The subsequent fresh corrected bdb0562 scenario passed all 47 with an active enabled zoom form; its unique named PNGs and receipt are the archived final evidence.
- Early browser layout had normal document heights 897/882 and multiple-error 1093 with a visible primary action, and an earlier fixed-overlay draft had 1217/1184. These did not meet full-document fit and were rejected. Fixed overlays were removed; help moved to a native header disclosure, brand/step rows compacted and error links moved to a native summary retaining visible inline errors. Same-name development PNGs were overwritten and are not offered as proof of those old runs.
- Browser faults were corrected when Playwright route.fetch forwarded an offline intercepted request, and when CSS zoom fractional scroll alignment differed by 0.40625px. Final fault injection aborts offline before forwarding; geometry permits one pixel of normal rounding. Native details initially had an invalid alert role, removed after axe flagged it; it now uses polite live content and summary focus.

## Historical initial independent increment

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
