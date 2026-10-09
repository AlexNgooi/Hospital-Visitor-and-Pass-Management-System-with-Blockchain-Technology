# M04 C15 masked GET checkpoint

Status: **IN_PROGRESS; bounded GET orchestration review passed, actual root integration pending**. Prepared 2026-10-10 under the continuing M04 permission. The previous independent checkpoint remains `03eca76` / delivery `398a244`; this increment does not replace its synthetic browser evidence with a real integration claim.

## Exact versions and ownership

- Worktree: `C:/Users/alexy/.codex/worktrees/hsaas-m04-counter-review/FYP Dev`; branch `codex/hsaas-m04-counter-review`.
- C14 docs snapshot: `376233beea70e240e88459c9514035b998658045`, selectively absorbed as `0c37139b5654dd847ec60671bf033989863465e8`, excluding coordinator-owned M03 REVIEW.
- Strict GET query/test-plan source: `98021a882156d8c64f9052545c3f8c2d661b9d31`.
- C15 approved read dependency: exactly `RegistrationReadPort.java` and `RegistrationReadPortTests.java` from `f5a9c7f388ec6232ca9be8f9677e3c8872f32756`, pinned unchanged in `9bddf1a1c407d5ad2d331fc56922b50343d969fe`.
- GET/source-helper fixed source: `cb8de73d7da5a297a74e8e138fd13e4ba909fc44`. Evidence-only delivery SHA is reported in the coordinator handoff message.
- Original six C13 files remain M03-owned and unchanged from `4d70df4e50a1e5bb2917e7f64344ebe755778cd6`. No actual root adapter, V5, unreviewed runtime or M03 handoff document was imported.

M04 changed only its own backend review code/tests and evidence. No frontend runtime, shared wiring/configuration/generated/dependency files, production SQL/entity/migration, main merge, push or deployment was added. English comments explain responsibilities, actual-session extraction, lock order and scope boundaries.

## Behavior and integration contract

GET `/api/staff/registrations` accepts a duplicate-preserving multi-value map with only counterId/category/status/page/pageSize. Defaults are page 0 and size 10, size 1–50; noncanonical numbers, unknown/blank/duplicate filters and integer/offset overflow reject. Missing category/status becomes null internally, without a wire ALL value. A counter ID selects one view and cannot create authority.

GET `/api/staff/registrations/{id}` accepts no additional query parameters. Internal root discovery resolves counter coordinates without granting existence or read authority. Missing or inaccessible detail/counter uses fixed 404 NOT_FOUND; current role remains 403 and expired actual session remains 401. The root owns all SQL masking/filtering and the exact DTO wire matching existing `contracts.ts`.

Both services reject an ambient domain transaction, run `requireHuman` before their own transaction and then hold the current account-role and complete user/counter/binding/context prefix through the root query. GET uses normal READ_COMMITTED rather than a database read-only transaction because its authorization prefix requires locking reads. M04 passes only the actual server owner context to `captureReadScope(owner,counter)`; the M03 factory must safely re-enter that same prefix and revalidate actual metadata. Its opaque original-transaction scope permits one root read operation before any SQL, with no HTTP construction/serialization or suspended/future transaction reuse. Queue count/items are one operation, sorted submittedAt DESC/id DESC and scoped by SQL to the authorized counter.

Returned queue page/size/counters and detail coordinates are checked before serialization. An adapter contract violation fails closed without a second read. There is no raw form rendering fallback or PII reveal endpoint. GET adds no root decision/audit/idempotency mutation. POST orchestration is unchanged; shared ReviewHttp now uniformly rejects absent/anonymous/untrusted authentication, never creates a session and reads only framework attributes/principal, setting no-store/no-referrer headers before context failures.

Review is still default-off. Explicit enabling requires both real write and read facets; a missing read facet with an otherwise present write dependency fails startup. This checkpoint has no actual M03 adapter to activate, so it is not ready for partial main runtime merge or a production mock.

## Validation and limits

After importing the approved two-file interface, targeted backend tests passed **65**, zero failures/errors/skips, exit 0 (observed at 07:54:47 MYT on 2026-10-10): 14 M03 read/write/C09 contract tests plus 51 M04 tests (11 command, 16 write service, 6 query, 11 read service, 5 session/header helper, 2 standalone servlet binding). The two additional assembly and two binding cases extend the earlier proposed 47+14 selection.

Full fixed-source backend verify/JAR passed **133**, zero failures/errors/skips, exit 0, finished `2026-10-10T07:57:45+08:00` (02:24). Coordinator independently reviewed this increment and ran 9 classes/65 selected tests on `cb8de73`, finished `07:57:01+08:00`; it accepted the increment for subsequent actual root integration. These are distinct runs, recorded in [TEST_RESULTS.md](TEST_RESULTS.md). The intentional missing-facet startup warnings are expected assertions, not unhandled build failures. The new read/service tests use mock facets with actual Spring transaction lifecycle; helper/binding tests use mock framework sessions/standalone MVC, without the real security/CSRF/JDBC chain. They establish no actual M04 SQL durability, persisted authorization, real protected HTTP success or registration-to-review E2E.

Frontend source is unchanged since the prior 122-test/19-synthetic-browser checkpoint; no new browser/real backend UI test was run for this increment. Existing screenshots remain synthetic. Complete real integration requirements are in [INTEGRATION_TEST_PLAN.md](INTEGRATION_TEST_PLAN.md).

## Next coordinator action

The bounded GET/source review has passed. Provide the explicitly approved M03 V5/root SQL/API candidate baseline for actual real-MySQL/HTTP/concurrency/rollback/E2E tests. Coordinate shared FeatureSlot assembly only after the complete dependencies are reviewed, then merge and revalidate main. M04 permission continues without another human request. No M05 or subsequent module is started.
