# M00–M07 release manifest

Prepared: 2026-10-18 (+08:00). Status: **DRAFT_WAITING_M05_M06_MERGE**. This is a source/evidence inventory, not acceptance or a published release. The coordinator owns REVIEW and local merge; M07 must not self-approve.

## Identity and source boundary

| Field | Value |
|---|---|
| Preparation baseline | `d103b888527c4ba8e90f37d93059daf2d78ed02f` (local main, unpushed) |
| M07 worktree | `C:/Users/alexy/.codex/worktrees/7a60/FYP Dev` |
| M07 branch | `codex/m07-manual-release` |
| M07 documentation head | PENDING_FINAL_HANDOFF (record exact SHA in HANDOFF after commit; avoid self-referential file hashes) |
| Final runtime source / combined main merge | PENDING_COORDINATOR_M05_M06_MERGES |
| M05 / M06 reviewed source, delivery, merge | PENDING, not represented as complete |
| Manual acceptance | NOT_RUN, user owns execution |
| Push / deployment / native database | NOT_PERFORMED |

## Immutable baseline migrations

Values below are **Git blob IDs** at preparation baseline, not Flyway checksums, raw Windows file hashes or runtime database inspection. At finalization compare V1–V5 unchanged and add exact V6/V7 reviewed source blobs. No migration has been executed by M07.

| File in backend/src/main/resources/db/migration | Git blob |
|---|---|
| V1__foundation_identity_reference.sql | `291606b81ae4dbb6989df325dfba394643f1e2d2` |
| V2__spring_session_jdbc.sql | `79f7ab4529fe24b192ad464e49481a3df04c8e43` |
| V3__session_capability_guards.sql | `163f949275b8729edd3673ea4ff7ef96cc825a07` |
| V4__dynamic_registration_entry.sql | `8a19b32cf14f25c4c1262bf060367187aa0f6946` |
| V5__visitor_registration.sql | `aff98e50167d8c0e1fddd50adb412f3f6e8e7fb5` |
| V6 (reserved M05) | PENDING actual file/source review |
| V7 (reserved M06) | PENDING actual file/source review |

## Runtime/configuration inventory to freeze after merges

Java21; backend artifact `hsaas-backend-0.0.1-SNAPSHOT.jar`; Spring Boot parent4.1.1 at preparation baseline. Frontend package/lockfile and backend pom resolve exact dependency versions; do not claim fresh installs/builds were run by M07. Intended disposable DB image: MySQL8.0.45; final launcher must confirm actual image and ports.

Final inventory must include feature slots/routes; backend environment and reader/MRN/notification/blockchain modes; QR/registration/review/lifecycle/admin enablement; key version identifiers without key values; seed users/counters/profile/device/card mapping; report metric/filter/timezone definitions; scheduler and dueAt demo defaults; startup/stop/backup/restore ownership. No .env, cookies, password material, entry token, raw form dump, database backup or JAR goes into this manifest.

## Historical results, kept at original source/scope

Read linked REVIEW for failures/repairs and the distinction between module and independent results. Counts below are historical and are **not rerun on this release**.

| Module / evidence | Exact source or merge | Bounded historical result |
|---|---|---|
| [M00 REVIEW](../evidence/modules/M00/REVIEW.md) | source `42bc95c68df2bc392fbd2e3ad72096a53929975e`, local merge `a137acd205b9b6d2224b7edb8e072e521f2b116d` | Independent verify40/JAR and postmerge40; foundation only. Later owner-activity source `1fd99b6263d2c94597a993deaf656b14beb4a13a` independently verify45, merged `cf10a71adf04c9a533e4c6c7e68a1344b3328276`; later package skipped tests |
| [M01 REVIEW](../evidence/modules/M01/REVIEW.md) | final integration `e8ca80ab56ae676a2dd97b34d6fb2a05979a0331`; maintenance source `ed5875ae4a803f6abe040c098e2b402693b30bf9`, lint delivery `fafd74c406876935c38d48a1cb3739b2a1b8f300`, final merge `9f5b7a1fd9ee9943271dde7343b3910565aa8461` | Historical actual proxy/auth28 checks; UI maintenance69 tests/typing/build/lint plus bounded viewport evidence; no current combined acceptance |
| [M02 REVIEW](../evidence/modules/M02/REVIEW.md) | final source `f81512dfe571469386352e73bf54ef234534869b`, main merge `3c0c229ffa8caaa9b9d88d1609da2c94049ced19` | Main backend68/JAR, frontend95/typing/build/lint/proxy; final independent browser28 at reviewed source; physical camera/production HTTPS NOT_RUN |
| [M03 REVIEW](../evidence/modules/M03/REVIEW.md) | backend `869c6cb725dd1ea7a104bf6d646c50f8102e93db`; UI `9d9baf658fd6c7151b4d7a83a3d85d380dc982c6`; delivery `2d2c28b73ed98ba7141e71fc014fd1424b38366b`, merge `0067637` | Independent backend109/JAR at backend snapshot; independent UI110/typing/build/lint/proxy at UI snapshot. Final47-browser evidence source-bound in REVIEW; merged composition not retested |
| [M04 REVIEW](../evidence/modules/M04/REVIEW.md) | frontend `4b7fca6cf3889f4c7220cc826b4e1fc1909b3797`; actual fixtures `6477dcd`; delivery `b6036a596ab772771c1d139e76568c514e583770`, merge `446f887` | Independent frontend126/typing/build/lint/proxy at frontend source; final actual25 class-report results are not fullverify exit. Final full backend/real M04 browser NOT_RUN / USER_REQUESTED_STOP |
| Previous M00–M04 combined entry | `dc6982341ed6135b0917a5cfafc4200f06e43e96` | MERGED_PENDING_USER_MANUAL_TEST, no subsequent combined build/test claimed by that delivery |
| M05/M06 current necessary checks | PENDING exact commands/source/time/exit from coordinator/module HANDOFF | PENDING; never inherit historical PASS |
| M07 new manual/business/recovery/browser/performance/UAT | This documentation release | NOT_RUN |

## Coverage and release limitations

[Manual checklist](MANUAL_ACCEPTANCE_M00_M07.md) maps every requirement ID including deferred/live slices. [Runbook](MANUAL_M00_M07.md) provides the final user-operated entry after dependencies are merged. Default final status must remain MERGED_PENDING_USER_MANUAL_TEST until the human supplies actual outcomes; source approval and a successful build do not close business acceptance.

Only current synthetic/local flows are in scope. Real hospital fields/privacy policy, MRN integration, physical cards/reader, production TLS, WhatsApp delivery, blockchain proofs, performance, hospital UAT/SUS and actual restore goals remain NOT_RUN/deferred. No notification/audit outbox or historical backfill is implied by local events. No future module is started by this manifest.
