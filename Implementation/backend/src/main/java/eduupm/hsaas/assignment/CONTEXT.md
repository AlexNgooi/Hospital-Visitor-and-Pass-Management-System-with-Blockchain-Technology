# M05 assignment simulation

Inputs: planning/03 C01/C02/P01-P05/N03/local B01, planning/04, planning/14 C18/C19; existing M00 authority/audit/idempotency and M03 registration root.

Responsibilities: real persisted synthetic scan, card/assignment orchestration, same-counter issue/return, overdue alerts/followup, audited transient contact reveal, and ADMIN inventory exceptions. Reader mapping lives in sibling reader/, transition helpers in card/, scheduling in monitoring/. All new handwritten code carries English responsibility and security/transaction comments.

Authority locks precede device and domain locks. Use READ_COMMITTED on the existing JPA manager. No root SQL/entity duplication, no real device endpoint, no notification/outbox, no production simulation. RegistrationLifecyclePort is an approved read-only extension of the existing root; it never changes review status.

Checks: backend `mvnw.cmd -B -DskipTests package`; narrowly scoped `mvnw.cmd -B -Dtest=LifecycleMysqlTests test` only on owned temporary MySQL. Docker unavailable is BLOCKED_ENV, never native fallback. Full business/browser/UAT remain user-run. Evidence: Implementation/docs/evidence/modules/M05/.
