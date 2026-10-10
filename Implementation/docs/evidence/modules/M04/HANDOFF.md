# M04 independent checkpoint handoff

Historical 2026-10-09 source/delivery checkpoint below. C14/C15 follow-up and GET source are recorded separately in [GET_HANDOFF.md](GET_HANDOFF.md). Current actual integration results and remaining acceptance are in [ACTUAL_INTEGRATION_PROGRESS.md](ACTUAL_INTEGRATION_PROGRESS.md) and [ACTUAL_HANDOFF_DRAFT.md](ACTUAL_HANDOFF_DRAFT.md); complete M04 is still IN_PROGRESS.

Status: **IN_PROGRESS; bounded independent-checkpoint review requested**. Full M04 is not accepted or merged. S-V1 and M03 actual root/read integration remain external dependencies handled by coordinator.

## Identity and versions

- Module/chat/owner: M04 Counter Review / `01a11ba4-ecca-7ca3-a224-c3dde42d1edd` / module assistant directly implements, tests and fixes with English comments.
- Human development permission: user **“继续”** in this chat on 2026-10-09, continuing the outstanding M04 permission request; independently confirmed by coordinator. Permission remains valid for the eventual integration follow-up.
- Application baseline: `f59baf350feeec024bf7178bf4d421aec4a6d41e`.
- Branch/worktree: `codex/hsaas-m04-counter-review` / `C:/Users/alexy/.codex/worktrees/hsaas-m04-counter-review/FYP Dev`.
- Coordinator input: doc-only `01905a9` absorbed as `e127a6318f56360926c2d4c9f849f65048a000a3`; C13 clarification read from `d2de04a68b1b290d5f13aac403fe86aba0a90438`.
- Approved M03 dependency: six files from `4d70df4e50a1e5bb2917e7f64344ebe755778cd6`, pinned unchanged in `840d979f843092c0b5415959abfde174fc005e56`.
- Final tested source: `03eca76ba860f0e0c5590006a8137a493c1d4d6f`. Delivery commit adds this evidence and is identified by its exact SHA in the coordinator handoff message.
- No uncommitted source change remains after the final source commit; delivery does not change runtime files. No merge to main, push, deployment, or new module start was performed.

## Scope and behavior

M04 authored only `backend/.../registration/review`, matching review tests, `frontend/src/features/counter/review`, matching frontend tests/harness, and `docs/evidence/modules/M04`. The six M03 contract files are a separately approved immutable dependency. Planning/root AGENTS changes in branch ancestry are the imported coordinator doc commit, not M04 edits.

- Strict review JSON rejects unknown/duplicate/trailing fields, scalar coercion, unsafe versions, unsupported evidence/reasons and caller actor/time/source/note extensions. Fixed C11 encoding preserves missing optional attestations and semantic basis-set order.
- Default-off POST service/controllers implement current session/role/counter authorization, READ_COMMITTED outer transaction, replay before and after root lock, root decision followed by one local audit and safe successful-result record. Audit/storage failure is not reported as success.
- A uniqueness loser exits the rolled-back transaction and only queries its winner under fresh authority in a new transaction. Missing/different-body winner remains conflict; no automatic new decision, audit, key or result insert occurs.
- Wrong current role remains 403; expired owner/session remains 401; invisible registration/counter uses 404 NOT_FOUND. Authorization precedes body/key validation to avoid distinguishing hidden records through malformed input.
- Exported FeatureSlot provides masked queue/detail, explicit synthetic staff checks, reason-required rejection, loading/empty/error/stale/access recovery, version conflict reset and exact-handle UNKNOWN retry. An UNKNOWN rejection keeps recovery visible after its detail read closes the dialog. Session/counter transitions fence stale reads; access loss clears data and stops polling.
- Approval means VERIFIED. The code adds no assignment, Pass ID, due time, notification/provider/chain job, patient lookup or PII reveal.

Current modes follow the existing baseline: real reader/live MRN deferred, notification/blockchain disabled. Synthetic UI fixtures are dedicated test-only files, never imported by main or used as a production fallback.

## Contracts and activation boundaries

Writes use the approved M03 RegistrationReviewPort, ManualEvidence, SyntheticReviewRules and RegistrationVersions. M03 owns the aggregate, CAS/evidence persistence, server actor/time/environment/source and transaction-bound opaque receipt. M04 did not create a registration entity, root adapter or migration. V1–V4 remain unchanged; no V5 was added.

`hsaas.review.enabled` is absent/off by default. Explicit enabling without the real root port fails startup. This checkpoint's POST code is not activated in main; actual M04 HTTP/SQL tests await the adapter. Candidate masked read schemas/client use page/pageSize/items/total/serverNow, page 0, UI size 10, maximum 50 and frozen category/feedback vocabulary. Exact read DTO/root queries remain pending S-V1; there is no GET controller or arbitrary form-data rendering fallback here.

Shared app/lib/main/generated/lockfile/configuration/migrations were not edited. M04 exports its FeatureSlot for the owner to wire after review and dependency integration; the shared production bootstrap still shows the reserved slot.

## Verification

All final checks were run after the fixed source commit: **104 backend tests/JAR**, **122 frontend tests**, typing/build/lint/proxy exit 0, and **19 synthetic Chromium checks**. See [TEST_RESULTS.md](TEST_RESULTS.md), [browser-receipt.json](browser-receipt.json), [browser-manifest.json](browser-manifest.json) and [START.md](START.md). Imported contract files have no Git diff against their approved source.

The 104 total includes existing foundation/QR temporary-MySQL regression; M04 service tests use mock root/audit/idempotency with real Spring transaction lifecycle. The browser uses explicit synthetic ports. None establishes actual M04 SQL durability, staff HTTP review permissions, concurrent persisted approvals or complete registration-to-review E2E. Those remain NOT_RUN, as do production HTTPS, native toolbar zoom, live hospital/physical/provider/chain acceptance.

Normal 1366×768 and 375×812 primary review actions were visually inspected. Zoom/short landscape support necessary scrolling; screenshots do not claim universally scroll-free layouts. Failures and fixes are preserved separately from final PASS in TEST_RESULTS.

## Coordinator's next bounded review

1. Compare the six dependency files with `4d70df4...` and review the M04 source commit independently of imported docs.
2. Inspect authority/lock/replay ordering and default-off assembly; run the targeted 11 DTO + 16 service + 9 imported contract tests and frontend tests. Inspect synthetic screenshot hashes/provenance.
3. Record a bounded result in coordinator-owned REVIEW.md; do not mark full M04 complete or merge an unreviewed M03 adapter.
4. After the human S-V1 decision and reviewed M03 root/read checkpoint, coordinate exact projections/GET authorization, real MySQL/HTTP/concurrency/rollback/expiry tests and shared FeatureSlot wiring under the existing M04 permission.

Remaining dependencies and known limits are in [QUESTIONS.md](QUESTIONS.md). Cleanup of the owned test Vite/browser is recorded in CLEANUP.md; main/dev services and native databases are not touched.
