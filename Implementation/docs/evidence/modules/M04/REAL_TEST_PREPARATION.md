# M04 actual integration candidates — NOT_RUN

Prepared 2026-10-10 under continuing M04 permission and coordinator's explicit request to progress while M03's actual baseline is reviewed. The previously accepted GET source remains `cb8de73` / evidence delivery `beaca640`. This increment changes only M04-owned tests/harness/evidence, not runtime code or root contracts.

## Prepared scope

`backend/.../review/ReviewMysqlTests.java` has **20 candidate cases** using owned Testcontainers MySQL 8.0.45 and a real RANDOM_PORT Spring servlet. Both root facets must be supplied by the actual M03 registration bean. Every root is created by real QR display/current/exchange, original formContext schema and public registration POST. Operational IDs come from the protected real queue. No M03 private test helper/implementation type or registration INSERT is used. SQL assertions read root/version plus audit/idempotency outcomes, and fixed fault triggers operate only on this disposable database.

Cases cover four categories and masks, stable DESC pagination, duplicate/unknown/invalid GET queries, anonymous/ADMIN/counter boundaries, CSRF/strict JSON/overflow, mandatory Penjaga human checks with mock MATCH, adverse feedback preserving SUBMITTED, persisted approve/reject/replay, current permission/counter/role/session/logout denial after success, same-key and different-key verify/reject competition, real audit rollback, controlled actual 1062 replay-only MISS, and actual root read scope factory/suspension/one-use/completion fencing before SQL.

The 1062 case is labeled controlled SQL fault injection, not a naturally observed race. It proves the intended rollback/new-transaction MISS/no-reapply path only when actually run; successful-winner recovery remains separately covered by existing mock orchestration until further real evidence is established. Role/permission mutations without epoch invalidation deliberately isolate 403/404; expiry/logout isolate 401. The M00 limiter fixture is cleared only within this owned test context between cases, preserving actual rate limits inside a case. V4 consumption pointers (`consumed_at` and `registration_id`) are cleared together before deleting V5 roots; no FK-check bypass or migration alteration exists.

`frontend/tests/counter-review-real/` provides a dedicated test App boot with the exported M04 slot and actual auth/review clients, a reference-only Java fixture, an owned Docker/Java/Vite harness and Playwright CLI browser expression. Browser candidates create four roots via real public HTTP, verify masked manual checks, drop a response only after actual commit for original-handle UNKNOWN recovery, reject with reason on mobile, produce an actual competing-staff conflict and revoke the actual saved session epoch. Secrets, fragments, command key values and request bodies stay in memory; screenshots target masked review states only, with no trace/HAR.

Ownership: backend 18404 / web 15414 / control 15415; Docker `hsaas-m04-review-real-ecca`, label `m04-ecca-real-review`, random mapped MySQL port/database `hsaas_m04_integration`. Busy ports and an existing container name are refused. M01 cleanChildEnvironment is imported read-only; only explicit disposable configuration and OS/runtime variables reach children. No `.env`, native DB, real bootstrap, main/shared wiring or external integration is used. See the [harness README](../../../../frontend/tests/counter-review-real/README.md) for execution prerequisites and owned cleanup.

## Checks actually performed

| Check | Result / precise boundary |
|---|---|
| Maven `-DskipTests test-compile` | Exit 0; candidates compile against approved public ports. It does not instantiate the real root, execute a test, run Flyway, or prove SQL/HTTP acceptance. |
| Node `--check` harness.mjs/browser.js | Exit 0; syntax only, no script launch, port/Docker/database/browser activity. |
| Frontend test typing | Exit 0; dedicated TSX boot type-compatible with existing App/FeatureSlot/real clients. |
| Frontend lint | Exit 0; no warnings observed. |
| Actual ReviewMysqlTests / browser / real protected HTTP | **NOT_RUN** awaiting approved M03 actual V5/root/API files and exact dependency SHA. |

First candidate Java compilation failed because the fixture `verify(category)` helper shadowed Mockito.verify. Calls for actual-port count assertions are now explicitly qualified; subsequent compile checks passed. The first proposed feedback marker was corrected to the coordinator-confirmed `DEMO-MRN-MATCH` before any actual run. Static V4 inspection found the coupled consumption CHECK and corrected cleanup before execution. These repairs are preparation, not a failed/passed business test history.

## Remaining work

Import only coordinator-approved actual M03 dependency files/SHA, preserving the eight reviewed root contract files. Run real SQL/HTTP candidates, fix actual failures and add missing matrix cases as evidence warrants, then run the owned browser and record sanitized results/screenshots/hash/cleanup. Concurrent authority-revocation and successful-winner recovery must not be inferred from sequential checks or the injected-MISS case. Manual-mode MRN, actual masked-wire/privacy/log output, required full regressions and shared main revalidation still require the complete baseline. Do not merge candidates alone into a missing-root main or count compilation as PASS. Full M04 remains IN_PROGRESS, without new permission or M05 startup.
