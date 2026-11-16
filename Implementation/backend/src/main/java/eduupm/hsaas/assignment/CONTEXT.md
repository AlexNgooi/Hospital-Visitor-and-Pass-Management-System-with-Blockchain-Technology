# 2026-11-16 atomic approval and issue

## Inventory naming

Manual CARD_ENROLL now calls card.PassNaming after idempotent replay lookup: EXECUTIVE exec-, PENJAGA penj-, VENDOR vend-, CONTRACTOR cont-, followed by an operator-chosen integer 1..9999. Leading zeros canonicalize; mismatched prefixes and invalid numbers fail. The existing request fields and encoding remain unchanged, preserving historical successful replay even for old labels. Duplicate checks and the global unique card_code constraint retain names across all statuses; no automatic number allocation is introduced. Explicit native maintenance renames existing labels in place and increments card versions without changing IDs, assignments, states, provenance or enrollment metadata. CARD_RENAMED is local audit only, not an issue/return lifecycle event.

## Explicit no-pass disposition

POST /api/staff/card-assignments/approve-without-pass uses APPROVE_NO_PASS to atomically approve SUBMITTED and append REGISTRATION_NO_PASS. POST /api/staff/card-assignments/no-pass uses NO_PASS for an already VERIFIED registration. Strict bodies carry registrationId/expectedVersion/noPassConfirmed, with reviewConfirmed required only for approval. Their distinct canonical namespaces preserve legacy ISSUE replay. Both require current staff/session/counter/root authority, VERIFIED eligibility and zero active assignments, and reject a second recorded disposition under the root lock. Same-command replay returns its original VERIFIED receipt. No inventory, assignment, handover, return deadline or lifecycle card event is created; audit and idempotency roll back with approval. No migration is required.

The protected issue-context includes noPassRecorded, derived from the permanent local audit under the same authorized root lock. This is a historical marker, not a claim that no pass has ever subsequently been issued. Later physical issue remains allowed under existing eligibility rules. Pass return/history feeds remain assignment-only and therefore exclude no-pass decisions.

## Staff return list/history reads

StaffPassReadService owns POST /api/staff/passes/search and POST /api/staff/passes/history-export. Current staff/counter/session authority is locked before reads; search values remain in strict CSRF-protected JSON bodies, never URLs/cursors or diagnostics. Assignment/card source/environment guards remain. Bounded keyset batches support scrolling without visible page buttons; root-owned passVisitors returns only bounded name/category labels and an internal full-name search boolean. Lifecycle does not parse registration JSON or duplicate root SQL.

Active reads exclude closed loans and compute overdue from non-null server deadlines. History selects only actual RETURNED closures with returned_at in the requested MYT days, including both endpoints via a next-day exclusive bound. Export traverses every matching batch, escapes formulas through CsvSafety, audits REPORT_EXPORTED before returning, and refuses over 5000 rows / bounded response size without partial download. Existing return/issue commands and schema remain unchanged; no migration is needed.

POST /api/staff/card-assignments/approve-and-issue uses strict APPROVE_ISSUE input/encoding and its own idempotency namespace. ManualLifecycle uses the existing RegistrationReviewPort to record the staff decision inside the existing lifecycle transaction, after current authority and reference/root locks and before sorted card locks. Approval, all assignments/inventory changes, audit and replay commit together or all roll back. issue-context accepts SUBMITTED/VERIFIED for advisory stock preview. Legacy ISSUE/verify behavior stays compatible; no migration. This supersedes the older statement that lifecycle never changes review status.

# M05 assignment simulation

## R02 current manual lifecycle (2026-10-27)

Current inputs: planning/15 and planning/16, approved C-R01/C-R02/C-R03 contracts in docs/evidence/changes/R02/CONTRACT.md. ManualInput/ManualLifecycle implement ADMIN visible-code inventory and recovery, staff atomic 1..50-card issue, explicit nullable deadlines and selected-pass returns. No manual command discovers or consumes ScanJob/UID/profile evidence. Old scan tables/history remain readable; legacy reader endpoints remain separately gated. Synthetic/test provenance remains explicit; production/live use is not enabled.

V9 is forward-only, coordinator-approved and not executed here. R01 owns V8/registration_destinations and the only registration port. Lock order for manual staff operations: current account/counter/session/permission prefix, category/requested references, registration, sorted cards, sorted assignments, overdue/lost rows, audit/idempotency. System monitoring has no human actor and uses root/card/assignment order. Inactive destinations/category do not block actual returns/lost closures; they only remove issue eligibility. No root SQL or form-data parsing belongs here.

R02 checks are source/diff review, backend package with test execution skipped and frontend build/lint. SQL, runtime/concurrency, tests, browser/business/UAT and restore execution remain NOT_RUN. The historical test instruction below is not R02 authorization. Do not start an application/database or run migrations from this module worktree.

Inputs: planning/03 C01/C02/P01-P05/N03/local B01, planning/04, planning/14 C18/C19; existing M00 authority/audit/idempotency and M03 registration root.

Responsibilities: real persisted synthetic scan, card/assignment orchestration, same-counter issue/return, overdue alerts/followup, audited transient contact reveal, and ADMIN inventory exceptions. Reader mapping lives in sibling reader/, transition helpers in card/, scheduling in monitoring/. All new handwritten code carries English responsibility and security/transaction comments.

Authority locks precede device and domain locks. Use READ_COMMITTED on the existing JPA manager. No root SQL/entity duplication, no real device endpoint, no notification/outbox, no production simulation. RegistrationLifecyclePort is an approved read-only extension of the existing root; it never changes review status.

Checks: backend `mvnw.cmd -B -DskipTests package`; narrowly scoped `mvnw.cmd -B -Dtest=LifecycleMysqlTests test` only on owned temporary MySQL. SQL execution requires the explicit dedicated native test account; no application-schema fallback. Full business/browser/UAT remain user-run. Evidence: Implementation/docs/evidence/modules/M05/.
