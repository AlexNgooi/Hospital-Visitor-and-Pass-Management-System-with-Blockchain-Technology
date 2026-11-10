# Planning consolidation and native-only tooling

User request on 2026-11-10: remove superseded planning, keep necessary current material, verify future Sui Testnet does not require container infrastructure, and remove that infrastructure throughout active tooling.

Baseline: `c82c3eb`, branch `codex/no-docker-multi-page`, isolated checkout. This cleanup remains on that branch; no main merge/push/deployment/service startup/database connection/migration/Sui wallet or transaction was performed.

## Consolidation

- Removed 88 planning artifacts: obsolete coordination/chat ledgers, old diagrams/receipts/screenshots, old Figma import assets/state, and their generators. Their current business rules, field provenance and reviewed R01–R03 shared decisions were consolidated into 01/02/03/04/10. No stale diagram is presented as the current system.
- Removed four superseded environment/acceptance/release runbooks and 19 obsolete pre-R01 browser harness/fixture files. Current runtime is MANUAL_NATIVE; business acceptance is MANUAL_R01_R03.
- Kept 12 current planning documents, three stable template documents and one read-only planning checker. Updated root and component routes plus surviving Markdown references. A before-deletion path/hash/referrer inventory was saved in this chat's work directory; Git retains removed versions.
- Historical implementation receipts retain their actual version, environment, checks and methods. Their original PASS is not relabelled as native testing; evidence/CONTEXT makes the provenance boundary explicit. They are not active setup instructions.

## Active tooling

- Removed Testcontainers Maven dependencies and all four obsolete executable browser environment launchers plus the wire runner. No current source/launch path invokes Docker or Compose; generated runtime classpath has no Testcontainers/docker-java dependency.
- Kept all seven existing backend SQL test classes, converting their infrastructure to `testing/LocalMysql`: explicit opt-in, fixed restricted test account, loopback-only connection and per-fixture random schema. Exact-owned-schema cleanup never controls the MySQL service or application databases. The upgrade probe uses another random schema instead of root/fixed migration_probe.
- The database outage test severs only its own proxy connections and resumes them, preserving the real database-readiness scenario without pausing the shared server. Schema assertions now match the existing V1–V9 files.
- Moved the unchanged shared child environment guard into scripts/child-environment.mjs; its old test path re-exports it. Source parity with the baseline guard was verified. Existing environment-refusal regression points at the native launcher; syntax checked, not executed.
- Native application setup/account and private backup rules remain in MANUAL_NATIVE. SQL test provisioning/opt-in is documented separately in backend/LOCAL_TESTING. Old environment data is not automatically imported, migrated or deleted.

## Sui conclusion and evidence

Official docs checked on 2026-11-10: [Install Sui](https://docs.sui.io/getting-started/onboarding/sui-install), [Networks](https://docs.sui.io/develop/sui-architecture/networks), [Client CLI](https://docs.sui.io/references/cli/client). A local client/SDK can connect to remote Testnet; the project's selected client path does not require a self-hosted full node. Local application/MySQL/worker plus remote Testnet is the future plan. Testnet data is public and persistence is not guaranteed. BLOCKCHAIN_MODE remains disabled; this is verification/planning, not implementation or publication.

## Checks and limits

- PASS: backend skip-tests package and test-source compilation (27 source files); runtime classpath generated without retired dependencies.
- PASS: frontend production build and lint; existing approximately 574 kB bundle warning remains.
- PASS: native launcher, shared environment guard and environment regression JavaScript syntax.
- PASS: planning checker (24 current documents, 116 source/config files), repository Markdown target audit and git diff whitespace check.
- Existing failure, unchanged from baseline: `pnpm run typecheck:test` finds old `tests/registration.test.tsx` v1 fixtures incompatible with the current v2 schema and required patient field. The fixture, production contracts and lockfile were verified unchanged from c82c3eb; this cleanup does not claim a passing complete test typecheck or migrate those unrelated form cases.
- NOT_RUN: actual native SQL tests, unit/browser test execution, application startup, schema migration, backup/restore, business/clipboard/parallel-page acceptance and Sui interaction. User-manual testing boundaries remain in force.

The deleted artifact set totals 111 tracked files. This does not delete old runtime databases, installed applications or other worktrees. Current execution and reference cleanup are complete; future tests and deployments remain explicit user work.
