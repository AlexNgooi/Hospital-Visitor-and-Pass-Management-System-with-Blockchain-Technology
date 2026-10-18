# M00–M07 release manifest

Frozen from source: 2026-10-18 (+08:00). M00–M06 function status: **MERGED_PENDING_USER_MANUAL_TEST**. M07 documentation is submitted for coordinator review/local merge; no business acceptance or publication is claimed. The coordinator owns REVIEW and final merge identity.

## Identity and source boundary

| Field | Value |
|---|---|
| Preparation baseline | `d103b888527c4ba8e90f37d93059daf2d78ed02f` (local main, unpushed) |
| M07 worktree | `C:/Users/alexy/.codex/worktrees/7a60/FYP Dev` |
| M07 branch | `codex/m07-manual-release` |
| M07 documentation identity | Versioned with this manifest; content commit is recorded in HANDOFF and final submitted HEAD in coordinator dispatch/REVIEW, avoiding a self-referential hash |
| Checked runtime source / composition | `761491e89910566c83fa184cb0aaa79ee625f128` |
| Coordinator check receipt commit | `06a9ce472dcda246b22d9a6466d0dc4fa4a53a28` (evidence only; runtime unchanged) |
| M05 source / delivery / local merge | `cbf738eed60886b18141b08d05b84e688ffa0db2` / `40340e537d4337af308ea1ee9d2e560be260bbd9` / `6e458b71fd21337f84a07a6786224dee9c974848` |
| M06 initial source / C22 correction | `a4ca1266b70983cdaa553a89b3cf9289457354c2` / `0a14f3acf90af5b44193c3aca0d034106104cbe5` |
| M06 final delivery / local merge | `ba940e749454910fe9f5d03f19c28aba911ceaac` / `0917266984a9afa35efc5a970599585a6f9a12dd` |
| Manual acceptance | NOT_RUN, user owns execution |
| Push / deployment / native database | NOT_PERFORMED |

## Immutable baseline migrations

Values below are **Git blob IDs** at checked runtime source, not Flyway checksums, raw Windows file hashes or database inspection. V1–V5 match the preparation baseline exactly; V6/V7 match their reviewed source. No migration has been executed by M07. New V6/V7 clean/upgrade execution remains NOT_RUN because Docker was unavailable.

| File in backend/src/main/resources/db/migration | Git blob |
|---|---|
| V1__foundation_identity_reference.sql | `291606b81ae4dbb6989df325dfba394643f1e2d2` |
| V2__spring_session_jdbc.sql | `79f7ab4529fe24b192ad464e49481a3df04c8e43` |
| V3__session_capability_guards.sql | `163f949275b8729edd3673ea4ff7ef96cc825a07` |
| V4__dynamic_registration_entry.sql | `8a19b32cf14f25c4c1262bf060367187aa0f6946` |
| V5__visitor_registration.sql | `aff98e50167d8c0e1fddd50adb412f3f6e8e7fb5` |
| V6__card_assignment_simulation.sql | `00f20240b6fe2b99e6902d16d07a7fddab0322f2` |
| V7__administration_reporting.sql | `a2c857e27b439a9b1a1faa1969d4e40fb07d732d` |

## Frozen runtime/configuration inventory

Java21; Spring Boot parent4.1.1; backend artifact `hsaas-backend-0.0.1-SNAPSHOT.jar`. Frontend package/lockfile and backend pom pin the dependency graph. Coordinator built the checked runtime source; M07 did not independently rebuild or run it. These Git IDs identify sources, not built JAR/bundle hashes or a reproducible binary build claim.

| Source artifact | Git object ID |
|---|---|
| backend/src/main tree | `3c2b9ff1757d428d1a45dde31fb43ec80b6cfaf8` |
| frontend/src tree | `f54b12a1bf4ecb7fe63ba508700c6c22cee6067a` |
| backend/pom.xml | `7b43ae43965938295e567b0abdae2c49da5fa028` |
| frontend/package.json | `8fa6f2beb417013fe6b3e0c5af4747e158bcc798` |
| frontend/pnpm-lock.yaml | `ac0ae2508873b23df33aee21c10368dfa918b432` |
| frontend/src/main.tsx | `c885307217f92bcf4156156869ace91bd3373ece` |
| scripts/manual-demo.mjs | `2c1899d6ea04909156fb1876e03aa48169c302be` |
| scripts/ManualDemoSeed.java | `9c83a37c49f6d5fe0d480e4344c1002607e268ce` |

The [runbook](MANUAL_M00_M07.md) lists actual role-gated routes, accounts, startup and recovery commands. Runtime modes are environment=test, reader=mock, MRN=mock, notification/blockchain=disabled, audit=LOCAL_ONLY. Explicit flags: `hsaas.qr.enabled=true`, `hsaas.registration.enabled=true`, `hsaas.review.enabled=true`, `hsaas.lifecycle.enabled=true`; M06 has no additional flag. Production cannot enable synthetic registration/lifecycle. Local cookie Secure=false is limited to the explicit loopback demo configuration.

Launcher uses mysql:8.0.45, container `hsaas-manual-m00-m07`, ownership label `hsaas.demo.owner=hsaas-manual-m00-m07-v1`, DB `hsaas_manual_m00_m07`, user `manual_demo`, random loopback MySQL port (not3306), backend18407/web15417/control15418. Child environment is allowlisted; classpath config only; no .env/native database fallback. Key identifiers are `demo` for QR and idempotency; values are generated and kept private, not stored here. Account/reference-only seeds; actual public/staff/admin operations create roots/cards/assignments/events.

Fixed catalogue: 12 samples for each EXECUTIVE/PENJAGA/VENDOR/CONTRACTOR (`DEMO-<CATEGORY>-001..012`); server derives UID/profile. A counter reader is provisioned lazily, one active120s job. Return requires original issue counter. V6 seeds four return-hours settings24/version0, valid1..720; issue snapshots dueAt/key/version. Overdue monitor30s, at most50/tick; read/report overdue derives active+dueAt<=captured serverNow. Restore requires same sample scan and two explicit confirmations with DEMO_RECOVERED_AND_CHECKED; old lost loan stays closed. These are DEMO rules, not hospital approval.

Backup bundles contain database.sql, matching keys.json and complete.json inside ignored Implementation/tmp/manual-demo/backups. Stop deletes the owned DB but retains bundles. Restore imports a complete local bundle into a fresh owned container and revokes old framework/auth/QR/unconsumed grant/unfinished scan authority before Java starts; history/consumed links/keys remain. No startup/backup/restore/signal cleanup execution is claimed. Strong termination or shutdown can bypass cleanup; exact-name/label diagnostics are in the runbook.

## Reporting definitions

All registration branches require the current server-selected environment and SYNTHETIC origin; assignment branches also require current environment/SIMULATED operation origin; card inventory requires current environment/SIMULATED data origin. Callers cannot choose another environment.

| Metric / output | Exact scope |
|---|---|
| Registrations submitted / category/day groups | submitted_at in selected MYT period; category/ward filters |
| Passes issued / returned / closed lost | issued_at / returned_at / closed_at with closure_reason LOST in the period; join registration for category/ward; lost is not returned |
| Open / overdue assignments | closed_at NULL; overdue additionally due_at<=serverUpdatedAt; category/ward apply, historical dates do not |
| Available / all / issued-card fraction | Current card status; category only, no ward/date filter. Fraction=(ISSUED+OVERDUE)/all enrolled, including LOST/DISABLED in denominator; empty inventory is labelled |
| Date semantics | Inclusive MYT from/to calendar dates -> UTC `[from midnight,to+1 midnight)`; default today, max366 calendar days, years2000..2100 |
| Freshness | Metrics/groups share one UNION statement snapshot; preview is a later query and may briefly differ.5s poll; stale/error retains last successful timestamp, 401/403 clears protected data; no failure-as-zero |
| Preview / export | Preview first50 from bounded51 fetch. CSV is registration metadata only: reference,visitor***,category,destination,current registration status,submittedMYT; never form_data/phone/ID/MRN. No historical-as-of state reconstruction |
| CSV bounds / safety | Every field quoted/escaped, formula prefixes neutralized; >10000 rows or serialized export JSON>1047552UTF8 bytes returns422 EXPORT_TOO_LARGE before export/audit inserts, no truncation. Successful export audit commits before download; lost response can still have audit, no automatic retry |
| Local audit | MYT date+actor apply to events and reference-change history; action filter applies to events only; page size100. No proof/notification retry surface |

No .env, cookies, key values, entry token, raw form dump, backup or binary artifact belongs in this manifest. The public synthetic demo password is listed only in the runbook for the isolated environment.

## Historical results, kept at original source/scope

Read linked REVIEW for failures/repairs and the distinction between module and independent results. Counts below are historical and are **not rerun on this release**.

| Module / evidence | Exact source or merge | Bounded historical result |
|---|---|---|
| [M00 REVIEW](../evidence/modules/M00/REVIEW.md) | source `42bc95c68df2bc392fbd2e3ad72096a53929975e`, local merge `a137acd205b9b6d2224b7edb8e072e521f2b116d` | Independent verify40/JAR and postmerge40; foundation only. Later owner-activity source `1fd99b6263d2c94597a993deaf656b14beb4a13a` independently verify45, merged `cf10a71adf04c9a533e4c6c7e68a1344b3328276`; later package skipped tests |
| [M01 REVIEW](../evidence/modules/M01/REVIEW.md) | final integration `e8ca80ab56ae676a2dd97b34d6fb2a05979a0331`; maintenance source `ed5875ae4a803f6abe040c098e2b402693b30bf9`, lint delivery `fafd74c406876935c38d48a1cb3739b2a1b8f300`, final merge `9f5b7a1fd9ee9943271dde7343b3910565aa8461` | Historical actual proxy/auth28 checks; UI maintenance69 tests/typing/build/lint plus bounded viewport evidence; no current combined acceptance |
| [M02 REVIEW](../evidence/modules/M02/REVIEW.md) | final source `f81512dfe571469386352e73bf54ef234534869b`, main merge `3c0c229ffa8caaa9b9d88d1609da2c94049ced19` | Main backend68/JAR, frontend95/typing/build/lint/proxy; final independent browser28 at reviewed source; physical camera/production HTTPS NOT_RUN |
| [M03 REVIEW](../evidence/modules/M03/REVIEW.md) | backend `869c6cb725dd1ea7a104bf6d646c50f8102e93db`; UI `9d9baf658fd6c7151b4d7a83a3d85d380dc982c6`; delivery `2d2c28b73ed98ba7141e71fc014fd1424b38366b`, merge `0067637cb6141fc9d7486a27171e5144db4f1e33` | Independent backend109/JAR at backend snapshot; independent UI110/typing/build/lint/proxy at UI snapshot. Final47-browser evidence source-bound in REVIEW; merged composition not retested |
| [M04 REVIEW](../evidence/modules/M04/REVIEW.md) | frontend `4b7fca6cf3889f4c7220cc826b4e1fc1909b3797`; actual fixtures `6477dcd5fdf9f45a5b650b0913b11e533315c040`; delivery `b6036a596ab772771c1d139e76568c514e583770`, merge `446f887566fe1a6a2c08c663b564e072f5fe3881` | Independent frontend126/typing/build/lint/proxy at frontend source; final actual25 class-report results are not fullverify exit. Final full backend/real M04 browser NOT_RUN / USER_REQUESTED_STOP |
| Previous M00–M04 combined entry | `dc6982341ed6135b0917a5cfafc4200f06e43e96` | MERGED_PENDING_USER_MANUAL_TEST, no subsequent combined build/test claimed by that delivery |
| [M05 HANDOFF](../evidence/modules/M05/HANDOFF.md) | `cbf738eed60886b18141b08d05b84e688ffa0db2` | Package(skipTests), frontend build/lint/typecheck reported PASS. LifecycleMysqlTests attempted once: Testcontainers Docker discovery exit1; both method bodies BLOCKED_ENV/NOT_RUN, no SQL assertion ran |
| [M06 HANDOFF](../evidence/modules/M06/HANDOFF.md) | initial source `a4ca1266b70983cdaa553a89b3cf9289457354c2`; C22 `0a14f3acf90af5b44193c3aca0d034106104cbe5` | Initial production package/build/lint and4/4 MYT/filter/CSV rule tests reported PASS. Those test bodies were not rerun after C22; actual SQL/races/rollback NOT_RUN |
| M07 new manual/business/recovery/browser/performance/UAT | This documentation release | NOT_RUN |

## Current combined necessary checks

The coordinator's [exact-source receipt](../evidence/modules/M07/COORDINATOR_CHECKS.md) records source`761491e89910566c83fa184cb0aaa79ee625f128`, 2026-10-18. M07 read the receipt; it did not perform these runs independently.

| Command / scope | Observed result |
|---|---|
| backend `mvnw.cmd -B -DskipTests package dependency:build-classpath -Dmdep.outputFile=target/manual-demo-classpath.txt` | exit0,14:38:31+08;78 main/26 test sources compiled, JAR/classpath; all test bodies skipped |
| `javac --class-path <runtime classpath> -d target/manual-demo-seed-check ../scripts/ManualDemoSeed.java` | exit0; compile only, seed not executed |
| frontend `pnpm.cmd run build`, `pnpm.cmd run lint`, `pnpm.cmd run typecheck:test` | all exit0; composed TypeScript/Vite build, zero lint warnings, test typing only |
| `node --check Implementation/scripts/manual-demo.mjs` | exit0, syntax only |
| `git diff --check` / runtime worktree | exit0 / clean |

Warnings are retained: RegistrationStore deprecated Jackson accessor; minified Vite chunk about553kB/gzip168kB exceeds500kB guidance. No optimization or warning suppression was done to manufacture PASS. Docker daemon was unavailable; V6/V7 migration, constraints/queries, concurrency, rollback, runtime startup, business/browser/UAT/performance and backup/restore remain NOT_RUN.

## Coverage and release limitations

[Manual checklist](MANUAL_ACCEPTANCE_M00_M07.md) maps all33 requirement IDs to40 user scenarios, including deferred/live slices and a four-category expected ledger. Every new manual row is NOT_RUN. [Runbook](MANUAL_M00_M07.md) provides the dedicated user-operated entry. Final function status remains MERGED_PENDING_USER_MANUAL_TEST until the human supplies actual outcomes; source approval and successful builds do not close business acceptance. Coordinator alone records the M07 review/merge; this document does not self-approve that merge.

Only current synthetic/local flows are in scope. Real hospital fields/privacy policy, MRN integration, physical cards/reader, production TLS, WhatsApp delivery, blockchain proofs, performance, hospital UAT/SUS and actual restore goals remain NOT_RUN/deferred. No notification/audit outbox or historical backfill is implied by local events. No future module is started by this manifest.
