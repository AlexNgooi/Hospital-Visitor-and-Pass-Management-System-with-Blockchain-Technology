# Native startup and parallel workspace handoff

User request: inspect the latest webapp, remove unnecessary Docker from normal operation, open counter review and QR concurrently, hide navigation on demand, and copy a registration link.

Baseline: latest UI branch `codex/ui-first-polish` at `ccfca27`, containing reviewed R01–R03 integration. Delivery branch: `codex/no-docker-multi-page`; isolated checkout under the current chat's work directory. No automatic merge, push, deployment, application restart, database connection or migration was performed.

Findings: the normal demo launcher required Docker only to manage a disposable MySQL database. The backend already uses an explicit MySQL datasource. Staff routes share server-cookie authentication and have no per-tab exclusivity in the inspected code; same-tab navigation unmounts the QR display and discards its component state. This change adds explicit parallel-tab entry points without weakening authentication or retaining QR tokens in browser storage. The observed user issue has not been reproduced in a running browser under the existing user-run acceptance boundary.

Changes: native-only application launcher and restricted schema/account configuration; persistent keys/data on stop; explicit empty-schema initialization; native private backup/empty-schema restore; exclusive launch lock; removed Compose runtime config. Shared shell now uses the existing accessible drawer at all screen widths, with per-route new-tab links and direct counter review/QR shortcuts carrying only the permission-checked counter ID. QR offers freshness-checked Clipboard API copy plus a readonly manual-copy fallback, with feedback/fallback fenced to the current display value. Expiry, rotation, revocation and anonymous grant exchange remain unchanged.

Checks completed on 2026-11-10:

- `pnpm.cmd install --frozen-lockfile --ignore-scripts`: PASS, lockfile unchanged.
- `pnpm.cmd run build`: PASS; existing bundle-size warning remains (about 574 kB minified).
- `pnpm.cmd run lint`: PASS.
- `node --check Implementation/scripts/manual-demo.mjs`: PASS.
- Backend `mvnw.cmd -B -DskipTests package dependency:build-classpath -Dmdep.outputFile=target/manual-demo-classpath.txt`: BUILD SUCCESS; tests skipped.
- `javac --release 21` with generated runtime classpath, compiling ManualDemoSeed.java into ignored backend target: PASS, no seed execution.
- `git diff --check`: PASS.
- Private `.env.native.json` ignore rule: confirmed.

NOT_RUN: application startup, native connection, V1–V9 migrations, actual two-tab/browser/clipboard behavior, registration/approval/pass operations, native backup/restore and mobile access. No new automated tests were added or run, in keeping with the repository's user-manual acceptance rule. Historical Docker/Testcontainers test fixtures remain optional and are not invoked by normal startup. Existing Docker data is neither deleted nor migrated; old Docker backup bundles are incompatible with native restore. Native setup requires a dedicated schema/account configured by the user. An interrupted first migration/seed may need manual inspection before proceeding; no repair/clean/drop automation is provided.

User startup and manual verification: `Implementation/docs/runbooks/MANUAL_NATIVE.md`. Use a separate anonymous browser profile for visitor registration and the existing R01–R03 business checklist. Same-profile staff tabs share identity/logout, and hidden QR tabs revalidate on visibility return.
