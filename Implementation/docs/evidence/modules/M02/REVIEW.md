# M02 coordinator review

Date: 2026-10-09, Asia/Singapore. Status: CHANGES_REQUESTED.
Original tested source: `239caa8d367e7c8eda8c8477595e9ce9a88525e7`.
Delivery: `41dede4d8c17f268896c449bb6826a1f2572ad0b`.
No M02 main merge or downstream module start accompanies this review.

Coordinator independently ran the original candidate's complete Maven verify:
67 tests, zero failures/errors/skips, JAR PASS at 13:26:33 +08. Frontend 84 tests
passed from 13:24:59 +08, along with strict test typing, production build and lint.
These passing runs are associated with the original source, not later returns.
Module's actual browser/MySQL evidence is separate from these independent runs.

Reviewed fixed-slot rotation, strict JOSE/configuration, V4/C12 linkage, sorted
prefix/display/context/challenge/grant acquisition, original form-context fencing,
disabled capability and narrow shared-file exceptions. The branch's omission of
later main-only UI receipts is ancestry, not a module deletion; integration will
preserve main's already-approved UI/runtime and evidence.

## Required returns

1. R1: `QrEntryService.lockGrant/consume` binds a receipt to the thread resource
   map, then checks only `hasResource`. A suspended outer transaction can leave
   that arbitrary resource available to a `REQUIRES_NEW` child. Require the exact
   original transaction synchronization, rejecting before SQL in the independent
   child and preserving normal consume after outer resumption. Exercise actual
   JpaTransactionManager/MySQL rollback and commit. Spring distinguishes thread
   resources from transaction synchronizations in its [official API](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/transaction/support/TransactionSynchronizationManager.html).
2. R2: `RegistrationEntry.accept` unconditionally marks authority validated. A
   late initial/exchange/recovery/confirmation/adoption success after offline can
   override the offline fence; periodic checks skip unavailable pages. Retain
   confirmed context but keep fields disabled while offline/hidden; revalidate
   through GET on resume. Deferred-response regression must preserve input and
   avoid automatic POST replay.
3. R3: staff revoke clears `display` before its request settles and loses the
   original display identity on UNKNOWN. Retain the original ID/counter in an
   independent pending/unknown state, keep its QR hidden and polling stopped,
   and expose explicit same-command recovery/retry. A changed chooser must not
   obscure which counter's display is being revoked. Test failed/deferred revoke,
   same-ID explicit retry and no automatic replay or QR restoration.

All returns were sent to the original M02 chat under its continuing development
permission. They require no new endpoint, shared CSS/auth change, M03 work or
human business-policy choice. Module implements/tests and returns exact source
and bounded evidence; coordinator re-reviews and locally merges only after the
returns pass. Production TLS/physical camera/OS sleep, actual M03 submission,
distributed throttling and operational retention remain separate gates.
