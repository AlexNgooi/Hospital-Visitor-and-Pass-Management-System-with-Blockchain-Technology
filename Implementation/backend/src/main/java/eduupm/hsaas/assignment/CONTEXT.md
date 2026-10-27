# M05 assignment simulation

## R02 current manual lifecycle (2026-10-27)

Current inputs: planning/15 and planning/16, approved C-R01/C-R02/C-R03 contracts in docs/evidence/changes/R02/CONTRACT.md. ManualInput/ManualLifecycle implement ADMIN visible-code inventory and recovery, staff atomic 1..50-card issue, explicit nullable deadlines and selected-pass returns. No manual command discovers or consumes ScanJob/UID/profile evidence. Old scan tables/history remain readable; legacy reader endpoints remain separately gated. Synthetic/test provenance remains explicit; production/live use is not enabled.

V9 is forward-only, coordinator-approved and not executed here. R01 owns V8/registration_destinations and the only registration port. Lock order for manual staff operations: current account/counter/session/permission prefix, category/requested references, registration, sorted cards, sorted assignments, overdue/lost rows, audit/idempotency. System monitoring has no human actor and uses root/card/assignment order. Inactive destinations/category do not block actual returns/lost closures; they only remove issue eligibility. No root SQL or form-data parsing belongs here.

R02 checks are source/diff review, backend package with test execution skipped and frontend build/lint. SQL, runtime/concurrency, tests, browser/business/UAT and restore execution remain NOT_RUN. The historical test instruction below is not R02 authorization. Do not start an application/database or run migrations from this module worktree.

Inputs: planning/03 C01/C02/P01-P05/N03/local B01, planning/04, planning/14 C18/C19; existing M00 authority/audit/idempotency and M03 registration root.

Responsibilities: real persisted synthetic scan, card/assignment orchestration, same-counter issue/return, overdue alerts/followup, audited transient contact reveal, and ADMIN inventory exceptions. Reader mapping lives in sibling reader/, transition helpers in card/, scheduling in monitoring/. All new handwritten code carries English responsibility and security/transaction comments.

Authority locks precede device and domain locks. Use READ_COMMITTED on the existing JPA manager. No root SQL/entity duplication, no real device endpoint, no notification/outbox, no production simulation. RegistrationLifecyclePort is an approved read-only extension of the existing root; it never changes review status.

Checks: backend `mvnw.cmd -B -DskipTests package`; narrowly scoped `mvnw.cmd -B -Dtest=LifecycleMysqlTests test` only on owned temporary MySQL. Docker unavailable is BLOCKED_ENV, never native fallback. Full business/browser/UAT remain user-run. Evidence: Implementation/docs/evidence/modules/M05/.
