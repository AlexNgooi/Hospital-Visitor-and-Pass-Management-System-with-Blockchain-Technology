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

## R1-R3 returned source and remaining viewport gate

Returned source `835689f44368596b26198e1db6a7419acfec4050`, delivery
`5c149d020bab4a292f977974d8b5ea6a8e5c6ed7`. Coordinator reviewed the unique
synchronization-identity check before SQL, availability event epoch across all
acceptance paths, explicit-scan capability reset, and retained original display
ID/counter for uncertain revoke recovery. Coordinator independently reran 95
frontend tests, typing/build/lint from 13:38:30 +08: PASS. Module's real R1 RED
entered SQL and waited on the outer lock; its returned MySQL regression proves
immediate SQL-free refusal and correct outer resumption/rollback/commit. The
coordinator's separate backend test run completed at 13:44:55 +08: 68 tests,
zero failures/errors/skips, BUILD SUCCESS. This was `test`, without JAR
repackaging while the module harness owned the JAR. Module reports a
fresh actual 15-check browser run with exact original-path revoke retry.

R4 remains CHANGES_REQUESTED for the human's current viewport requirement.
Visual review of the original 375x812 live-display capture shows a roughly 1541px
page with countdown/fullscreen below the first viewport. Compact the feature's
core display/controls in normal 1366x768 and 375x812 sizes; keep the entire QR and
quiet zone, readable text, expiry/revoke/fullscreen and 44px actions reachable.
Long explanatory guidance can use accessible disclosure; unknown revoke must
not retain a huge empty scan card. Expanded guidance, tiny/zoomed/short screens
may scroll safely. Measure actual bounds and decode the rendered current QR in
memory without persisting its capability pixels. No shared UI/API/schema change
or physical-camera/production acceptance is inferred from these layout tests.
