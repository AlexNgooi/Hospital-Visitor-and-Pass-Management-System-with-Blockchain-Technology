# M00 coordinator review

- Date: 2026-10-09 (Asia/Singapore).
- Status: INTEGRATION_VERIFIED for the approved local foundation/C01 slice; production HTTPS and downstream business gates NOT_RUN.
- Baseline: `c2b0c316e04947df06b84f1008f470b6e5a9eb8b`.
- Tested source: `42bc95c68df2bc392fbd2e3ad72096a53929975e`.
- Reviewed delivery: `1b2d8f2657f14689da8c66e25baf0ea428d5f02c`.
- Branch: `codex/hsaas-m00-foundation`.

## Evidence independently checked

Coordinator ran `.\mvnw.cmd -B verify` in the ced2 isolated backend directory.
It exited 0 at 2026-10-09 05:53:24 +08:00: 40 tests, zero failures/errors/skips,
BUILD SUCCESS and executable JAR. Tests used disposable MySQL 8.0.45;
the developer database and real bootstrap were not used. Module whitespace and
working-tree checks passed. The delivery-only commit changes three evidence files;
backend implementation/configuration/schema match the tested source commit.

Reviewed security filters, response buffering, credential/CSRF flow, session
repository adapter, actual metadata reads, current epoch/pointer/generation
guards, account/counter mutation locks, bootstrap, hybrid transaction setup,
audit/idempotency/encoding ports, V1–V3 and their negative/concurrency tests.
English comments explain responsibilities, safety boundaries and recovery rules.
No blocking finding in this foundation slice.

## Integration boundaries

- Adopt actual permission mutation order: sorted users → sorted counters →
  permission rows → sorted bindings → sorted auth contexts. Coordinator planning
  C12 is corrected to match; there is no competing permission-before-counter path
  in this submission. QR/domain owners must preserve the full future lock order.
- JPA and JDBC share one domain transaction; Session saving is independent and
  prohibited while a domain transaction holds locks. Framework write faults do
  not claim business rollback or permit changing a retry key.
- The reviewed guard covers the security prefix, not unimplemented QR/grant/
  registration races. Those modules must test their complete transaction graph.
- V1–V3 are allocated to M00. They become immutable after integration; no native
  database baseline/repair/clean or real first-admin execution is authorized here.
- M01 may perform real C01/proxy integration in a disposable synthetic environment
  after merge. Its three return findings still require correction and re-review.
- HTTPS/production proxy, distributed throttling, physical cleanup, actual console
  interaction, full hospital policy/UAT/load/restore and all live external
  integrations remain NOT_RUN or deferred. Whole Q05/Q04 are not accepted by this
  foundation-only test result. M02–M04 do not start automatically.

## Merge and regression

Local merge: `a137acd205b9b6d2224b7edb8e072e521f2b116d`.
Coordinator reran `.\mvnw.cmd -B verify` from the main backend directory after
merge: exit 0, 40 tests, zero failures/errors/skips, executable JAR, finished
2026-10-09 05:56:54 +08:00. The log is the ignored
`Implementation/backend/target/coordinator-post-merge-verify.log`; this review
preserves its bounded result. No push/deployment or native database action.

Subsequent M01 integration review independently reproduced 28 actual wire checks
through Vite to this reviewed executable and disposable MySQL. Cookie/CSRF/login/
logout/role errors and DB outage recovery passed. Final accepted integration merge
is `e8ca80ab56ae676a2dd97b34d6fb2a05979a0331`; backend production code/schema were
unchanged. M01 REVIEW records frontend recovery, isolation returns and acceptance.
This completes local C01 foundation integration, not HTTPS/full-domain acceptance.
# Public owner-activity maintenance review (2026-10-09)

Approved source `1fd99b6263d2c94597a993deaf656b14beb4a13a`, delivery
`12940cb5734cf5466fa8b1d008156534be034550`, baseline `6bb3893`.
Local integration merge: `cf10a71adf04c9a533e4c6c7e68a1344b3328276`.

Coordinator reviewed decoded servlet namespace classification, the outer filter's
scope over explicit and request-end persistence, finally cleanup, default-denied
unscoped saves, and the no-update return after all metadata/mapping/epoch/prior
deadline checks. Public requests still validate and persist framework state;
they cannot activate or renew the owner. Normal staff/login activity retains
renewal. No business endpoint, DTO, migration or domain lock order changed.

Coordinator independently ran the exact delivery's full Maven verify in ced2:
45 tests, zero failures/errors/skips, JAR PASS, finished 2026-10-09 12:55:16 +08.
After merge, the backend tree exactly matches the reviewed delivery; main package
with tests skipped passed at 12:56:14 +08. The latter is a packaging check, not a
second 45-test run. Native database and .env were not used.

M02's actual entry same-cookie test had reproduced a +600ms owner renewal on the
previous baseline. M02 has been directed to consume this reviewed merge and prove
that exact test GREEN before its QR acceptance. M00's public fixture evidence is
accepted; complete QR/domain behavior, HTTPS and live integrations remain separate
gates. Original security review and its historical evidence are retained below.
