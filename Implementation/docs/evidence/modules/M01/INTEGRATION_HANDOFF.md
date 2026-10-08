# M01 real C01 integration handoff

Updated: 2026-10-09, Asia/Singapore. Status: **REVIEW_READY** for this integration
slice; coordinator alone approves/merges and records INTEGRATION_VERIFIED.
The previously merged foundation remains merged. This delivery adds real local
M00 integration evidence and one frontend recovery fix, not whole-system acceptance.

- Branch/worktree: `codex/hsaas-m01-frontend-shell`, `C:\Users\alexy\.codex\worktrees\4156\FYP Dev`.
- Integration baseline: `03fda7fe56d1de94e04083b8f58370ac9cf80c7f`, fast-forwarded into this feature branch only; no main checkout/branch operation.
- Tested source implementation: `2baded5ca1acef2ff0e6cc5391a59cbfa30731f0`.
- Actual backend source: `42bc95c68df2bc392fbd2e3ad72096a53929975e`; unchanged reviewed backend tree on the integration baseline.
- The following documentation-only commit records receipts/screenshots. Exact delivery HEAD is reported in the coordinator handoff message, avoiding a self-referential hash.
- Authorization: existing human M01 implementation permit and coordinator's real integration task. No new module, backend production code/migration, native DB, external integration, push/deploy or merge back to main.

## Actual resources and provenance

The reviewed Spring Boot executable was packaged with `mvnw -B -DskipTests
package`: BUILD SUCCESS; this is packaging, **not a new backend 40-test run**.
Maven dependency:build-classpath supplied the same Spring password encoder/JDBC
libraries to a test-only Java fixture. The actual executable used explicit
`integration-m01` profile, empty config import, loopback address and `test`
environment/non-Secure HTTP cookies. No `.env` was read/copied, no local profile
or console bootstrap was run, and no native database was used.

The labelled Docker container `hsaas-m01-real-4156` ran real `mysql:8.0.45`, image
digest `sha256:4af1f8815716546f5b12410f7621f37f93db8dd11a184706ef59111930b8c2ff`.
It owned a new empty `hsaas_m01_integration` database and random in-memory DB
credentials. Flyway applied unchanged V1–V3. Synthetic staff/admin/counter fixture
IDs above JavaScript's safe integer range were inserted only there using Spring's
password encoder. The test principal has temporary database-wide privileges; the
test-only binary-log trigger setting is not a production grant/configuration.

Backend listened on `127.0.0.1:18091`, Vite dev on `127.0.0.1:15191`, fixed-action
fixture controls on `127.0.0.1:15192`, MySQL on random loopback port 56124 in the
final run. Vite forwarded the actual `/api` requests/responses/cookies; no synthetic
HTTP auth server was substituted. Reader/notifications/blockchain stayed disabled,
MRN manual. See [reproduction instructions](../../../../frontend/tests/real-integration/README.md).

## Results

The actual wire run was `2026-10-08T22:12:50.181Z`–`22:12:58.532Z` (06:12 MYT).
The final browser receipt followed the corrected source and all seven screenshots
were visually inspected. Sanitized request/status/code receipts and hashes are in
[integration-verification.json](integration-verification.json).

| Contract/check | Result and practical scope |
|---|---|
| csrf → login200 → CSRF rotation → me → logout204 → new csrf/me401 | PASS against actual M00/MySQL through Vite; session cookie changed and pre-login CSRF rejected with 403 after login. |
| C01 ID encoding | PASS: staff id `9007199254740993`, counter id `9007199254741001` remain decimal strings, admin counters empty; actual browser receives staff/admin roles. |
| Missing/wrong CSRF | PASS: actual login403 / CSRF_INVALID. No automatic POST retry. |
| Bad credentials | PASS: login401 / INVALID_CREDENTIALS, next me401; actual login UI remains anonymous and shows safe allowlisted copy. |
| Role separation / absent route | PASS: staff→admin403 and admin→staff403; correct-role missing object routes return safe404. **These routes are unimplemented; this does not prove later business object scope semantics.** |
| Cookie / privacy | PASS: Set-Cookie forwarded with no Domain, HttpOnly, SameSite=Lax, Path=/; actual browser cookie is session-scoped and invisible to document.cookie. App persistent storage remains empty. Secure=false only in this explicit loopback HTTP test. |
| Error shape / capabilities | PASS: actual errors carry status/code/timestamp/correlationId/fieldErrors and matching correlation header, without password/SQL/stack/rejectedValue reflection. Public metadata reports test / disabled reader / manual MRN / NOT_ENABLED notifications+blockchain / LOCAL_ONLY audit. |
| no-store | PASS for all 28 real wire responses including auth failures, 204 and readiness503. |
| Actual DB outage readiness | PASS: pausing only this MySQL container produces real health503 / SERVICE_UNAVAILABLE; unpause restores health200. |
| Actual logout UNKNOWN/recovery | PASS: a real MySQL BEFORE DELETE SPRING_SESSION failure produces backend503 **after durable revocation**. Protected workspace clears immediately; after removing trigger explicit me401 confirms absence. No automatic logout replay or old identity restoration. |
| Actual expiry hook | PASS: test fixture advances staff security_epoch; same singleton ApiClient protected me returns401, actual AuthProvider subscription clears the workspace. This is a fixed fixture mutation, not implementation of M06 account administration. |
| Actual login + transport UNKNOWN | PASS: successful actual login200 followed by deliberately dropping the post-login CSRF response after it reaches M00. Explicit me200 restores the actual server identity; exactly one login POST, no credential replay. The dropped response is a **transport fault injection**, not a claim of backend-generated503. |
| Browser / Q06 slice | PASS at 375×812 and 1440×1024 for seven recorded states: styles loaded, zero axe violations, no horizontal overflow, no uncaught JS exceptions. Expected real401/503 and injected network-failure console entries occurred; this is not complete WCAG/UAT. |
| Frontend regression | PASS: 68/68 tests, failures0, strict test typing, lint0 warnings, production build, synthetic proxy regression and whitespace checks. Unit start `2026-10-08T22:11:55.322Z`. Build JS ~420 kB/~131 kB gzip; no Q02 performance claim. |
| Reviewed OpenAPI generation | PASS: exact M00 spec mirror, SHA256 `f8bc1c31cb267269fab1523f9e5ddfecb4ac72c167bdf49ffe44fd4445631498`; pinned generator produced api.d.ts. Session/CSRF/error Zod outputs compile against generated shapes; declarations were not hand-edited. |
| Production HTTPS / Secure forwarding | **NOT_RUN**: no TLS/reverse-proxy fixture. HTTP tests cannot prove deployment cookie/forwarded-header acceptance. |
| Whole-system business/object authorization, QR, registration/review, live MRN/reader/WhatsApp/blockchain, console bootstrap | **NOT_RUN / unimplemented or deferred**. No external action was performed. |

## Finding fixed in this delivery

The first actual fault flow exposed a frontend issue: createAuthPort only cleared
cached CSRF after a successful logout. Backend durable revocation returned503;
the explicit me401 confirmed absence, but the next explicit login reused the
old cached session/token rather than bootstrapping. Actual M00 rejected it with
AUTHENTICATION_REQUIRED401 on the revoked binding; no fake user appeared.

Now both login/logout clear cached CSRF in `finally`, including network/503
UNKNOWN. Explicit me401 also clears that cache. A later explicit action obtains
a current anonymous token/binding; no authentication POST is automatically
replayed. The corrected actual flow logs in successfully after fault recovery.
Five additional unit regressions cover network/503 for both mutations and the
explicit me401 cache fence. Backend production source/migrations were unchanged.

The coordinator was informed of the actual finding before implementation. This
handoff does not retain the earlier withdrawn R2 missing-button claim: the
original UI already had a conditional session-check action, as corrected in REVIEW.

## Harness failures and repair history

- A Maven property argument was initially split by PowerShell; quoting the `-D`
  argument fixed classpath generation. The failed invocation is not a PASS.
- A compile-time generated type was initially named ApiError; actual spec uses
  Error. Corrected the handwritten assertion only; generated declarations untouched.
- Initial browser harness waited for hidden mobile navigation. It now waits for
  visible sign-out control and asserts the actual `.workspace` root disappears.
- The temporary MySQL binary-log guard rejected a failure trigger. The harness
  sets log_bin_trust_function_creators only on its owned disposable server before
  fixture creation; a fresh resource run proved reproducibility.
- The desktop axe check initially ran between URL change and React route commit,
  reporting region/skip-link. It now waits for the actual administrator navigation
  and heading before auditing. The completed audit has zero violations; no check
  is disabled or ignored.

## Cleanup and coordinator review

Final harness stop verified the ownership label before removing its exact created
container. Backend/Vite/control services were stopped, the named test browser
closed, and the four owned listening ports had no listeners. Docker reports no
remaining container with this name. Random credentials and raw diagnostics remain
outside committed evidence; receipts/screenshots contain no token/cookie/password.

The source worktree was clean after source commit. This subsequent evidence commit
adds seven screenshots and the sanitized receipt, preserving the previous
independent/historical evidence separately. Coordinator should review auth.ts cache
fencing, spec provenance/generated boundary, harness isolation and actual receipt,
then decide integration status and merge. No whole-M01/production status is inferred
from a local real C01 PASS slice.
