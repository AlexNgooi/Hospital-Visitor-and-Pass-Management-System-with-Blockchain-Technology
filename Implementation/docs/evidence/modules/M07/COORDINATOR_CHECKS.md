# M00–M07 necessary integration checks

Source: `761491e89910566c83fa184cb0aaa79ee625f128`, local main, 2026-10-18. Coordinator chat `01a14da5-91fe-7bf1-a120-183975085f8b`.

M05 delivery `40340e537d4337af308ea1ee9d2e560be260bbd9` merged as `6e458b71fd21337f84a07a6786224dee9c974848`. M06 delivery `ba940e749454910fe9f5d03f19c28aba911ceaac`, including C22 environment/origin filtering `0a14f3acf90af5b44193c3aca0d034106104cbe5`, merged as `0917266984a9afa35efc5a970599585a6f9a12dd`. The checked source wires their exported slots with the existing QR/registration/review bootstrap. It also maintains two old migration-count expectations for future V7 test runs, preserving upgrade/no-op/data-survival assertions; that test suite was not executed.

| Necessary command | Observed result / boundary |
|---|---|
| backend `mvnw.cmd -B -DskipTests package dependency:build-classpath -Dmdep.outputFile=target/manual-demo-classpath.txt` | exit0, BUILD SUCCESS at 2026-10-18 14:38:31 +08. 78 main and 26 test sources compiled, executable JAR/classpath produced; **all test bodies skipped** |
| `javac --class-path <generated runtime classpath> -d target/manual-demo-seed-check ../scripts/ManualDemoSeed.java` | exit0; compilation only, seed not executed |
| frontend `pnpm.cmd run build` | exit0; composed production TypeScript and Vite bundle built |
| frontend `pnpm.cmd run lint` | exit0; no lint warnings/errors |
| frontend `pnpm.cmd run typecheck:test` | exit0; test source typing only |
| `node --check Implementation/scripts/manual-demo.mjs` | exit0; syntax only, no start/backup/restore/stop command executed |
| `git diff --check` / final source worktree | exit0 / clean |

Build diagnostics retained accurately: RegistrationStore uses a deprecated Jackson accessor; Vite reports a minified application chunk above 500 kB (about 553 kB, gzip 168 kB). They are warnings, not failed checks. No size-limit suppression, runtime dependency change or unrelated optimization was introduced to hide them.

The earlier M06 4/4 reporting-rule tests retain their exact source scope in M06 HANDOFF; they are not repeated or represented as database acceptance. The single M05 LifecycleMysqlTests attempt failed during Testcontainers Docker discovery; **both method bodies NOT_RUN / BLOCKED_ENV**. Docker engine was unavailable. No repeat of that blocked command, Docker Desktop startup or native-database fallback occurred.

NOT_RUN: actual V6/V7 clean/upgrade migration, database constraints/query/transaction/race verification, complete business/server/browser/UAT, performance, backup/restore/signal cleanup execution, physical cards/reader, approved hospital MRN, WhatsApp and blockchain. No application stack was started, no old native DB modified, no push or deployment performed.

Function delivery status: **MERGED_PENDING_USER_MANUAL_TEST**. The user starts the dedicated manual-demo environment and checks the documented workflows. Static compilation/source review does not establish migration, runtime or hospital/production approval.
