# M00 coordinator review

- Date: 2026-10-09 (Asia/Singapore).
- Status: APPROVED for the M00 foundation slice; local merge and post-merge check pending.
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

Coordinator will record the exact local merge SHA and post-merge result here;
no push or deployment is part of this review.
