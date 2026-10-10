# M04 actual integration progress — 2026-10-10

Current status: **FUNCTION_DELIVERY_READY / MANUAL_ACCEPTANCE_PENDING**, under the human's latest instruction to stop further automated tests and deliver the functions through M04. See [FUNCTION_HANDOFF.md](FUNCTION_HANDOFF.md). This preserves intermediate real results without replacing a missing final run with compilation or another module's evidence. Earlier coordinated slot waiting and approval history below are historical; M04 has no owned running SQL/browser/dev-server resource.

## Versions

- Approved actual M03 backend: `869c6cb725dd1ea7a104bf6d646c50f8102e93db`, exactly20 backend files imported unchanged as `a99a91de12662237a2a6ca97e949eedaa30620cf`. No entire-directory or ancestor-doc import.
- Approved Unicode correction: `8623e7c9f49dd964684b30ee0ae5d0722c3121b3`, exactly3 backend files imported as `b3b5a0bde98d6682275d0a6e832e75066abd3655`; eight contracts and V1–V5 unchanged.
- R2 UNKNOWN UI correction: `4b7fca6cf3889f4c7220cc826b4e1fc1909b3797`.
- Current actual-gap tests/comment source: `6477dcd5fdf9f45a5b650b0913b11e533315c040`. The approved precise post-prefix acknowledgement assertion ran in the current mixed24 class report; the final observation below states its evidence limits.

The assertion subsequently ran in the current24-case class report with zero failures/errors/skips; see the final observation below. No production change followed6477dcd.

## Actual results, in order

| Run | Observed result | Repair / actual boundary |
|---|---|---|
| First actual ReviewMysqlTests20 | 19 PASS / 1 FAIL; zero errors/skips; exit1; finished13:24:35 +08 | Fixture expected logout200; frozen M00 AuthController deliberately returns204. Changed only the test. Other real public-registration/review/SQL/concurrency/rollback/scope cases ran; no full suite PASS claim. |
| R2 frontend full suite | 126 PASS / typing/lint/build/proxy exit0 | 95 existing +31 M04 component/client tests. Includes committed UNKNOWN then retry403/409/400 plus GET and original-handle success, access loss and counter remount. Build/proxy are compatibility/synthetic checks, not actual browser proof. |
| Coordinator independent R2 frontend | Separate126/typing/build/lint0/proxy all exit0, completed13:38:36 +08 | Independent exact-source review at4b7fca6; standalone routing is not main wiring. |
| Actual targeted25 (manual1 + mixed24) | Manual1 PASS; mixed20 PASS /4 ERROR; zero assertion failures; exit1; finished13:42:41 +08 | Two winner-recovery hook setup calls hit Spring MANDATORY outside a transaction and left Mockito stubbing state affecting two following setup methods. Not root SQL failure or DB timeout. Configure the actual target spy with AopTestUtils; real application continues through its transaction proxy. |
| Focused actual5 after target-spy fix | 4 PASS /1 FAIL, zero errors/skips; exit1; finished13:46:50 +08 | Same-body committed winner recovery, different valid rejection-body winner conflict, actual M00 revocation before guard and logout204 passed. Post-prefix revocation returned503, beyond the original fixture's200/401 expectation. |
| Package/classpath only | Exit0, JAR/classpath built, finished13:52:08 +08 | `-DskipTests package dependency:build-classpath`; not fullverify PASS. No container/database/runtime launched. |
| Harness injection refusal | PASS defensive entry check | Actual M04 Node script rejects synthetic SPRING_CONFIG_IMPORT before resource startup; exit1 refusal expected, no resources manifest creation. No browser/SQL execution. |

The failed post-prefix case's actual stack identifies `ApiFailure.unauthenticated -> SessionCapabilities.checkMapping -> beforeFrameworkSave -> GuardedSessionRepository.save -> SessionRepositoryFilter.commitSession`. M00 SessionResponseFilter converts a late save rejection after buffered status200 into503 `SERVICE_UNAVAILABLE`, message `Request outcome unavailable. Keep the original command key.` This confirms the framework-save cause, not a socket failure.

The coordinator approved the corrected test boundary: await review/admin futures, **first** prove persisted VERIFIED/version1 plus exactly1 review audit/idempotency result, **then** classify200/401 or only that specific503 envelope as post-commit acknowledgement uncertainty, and finally deny original-session/key replay401. Domain rollback cannot pass those SQL assertions. No M00 production change or arbitrary503 allowance exists. At the earlier preparation checkpoint this correction was NOT_RERUN; the current class report below now records its result.

## New genuine cases

Mixed-mode24 plus independent manual-mode1 cover previous20 plus two controlled actual1062 winner-recovery cases and two serialized actual M00 permission-revocation orders. Winner recovery injects a unique error only on the original held SQL connection; after its actual database rollback, a separately saved real HTTP context commits the contender using the same actor/operation/target/key. Recovery observes a fresh RC transaction without the failed marker; each HTTP thread applies the root once, with exactly1 persisted audit/result. The changed-body variant uses two valid reject reasons. This is controlled timing/SQL injection, not a claimed naturally inevitable root-lock uniqueness race; no synthetic winner row or fake root success is inserted.

The manual case starts a separately configured real application/container with mrn-mode=manual, gets UNAVAILABLE/no token from the actual adapter, submits via actual QR/public API, remains SUBMITTED and requires three explicit synthetic human checks. It does not simulate mode with a mock bean or claim hospital verification.

R2 keeps the original UNKNOWN handle after any failed recovery4xx, without clearing on GET or creating a new key. Current access loss hides cached details and actor/counter changes unmount the workspace. The real browser candidate now sends one intentionally wrong CSRF header to the **actual** backend after committed-response loss, then GET and the third original-handle retry; it never fulfils a fake403. This actual browser scenario remains NOT_RUN.

## Final observation and human-directed stop

The coordinator released the slot and the current25 selection started before the human changed the request. At stop handling, the exact launcher and worktree Java processes were already0 and tool session17073 no longer existed. Current sure-fire text reports contain manual1/0/0/0 (22.55s, updated14:17:57) and mixed24/0/0/0 (44.97s, updated14:18:42), Asia/Singapore. Final Maven exit/BUILD SUCCESS output was unavailable; only the two class results are reported as25 passing cases. This is not fullverify/JAR acceptance.

Further full actual backend and real-browser work are **NOT_RUN / USER_REQUESTED_STOP**. No new test, runtime or browser was started after the instruction. Exact M04 harness container and Testcontainers listing were empty; ports18404/15414/15415 have0 listeners. Existing intermediate failures above are retained. Coordinator proceeds with functional review/shared FeatureSlot assembly and local main merge; user handles manual acceptance. No M05 startup, push, deployment, native DB or `.env` work is performed.
