# R01–R03 combined source review and build receipt

Date: 2026-10-27 (Asia/Singapore). Status: **INTEGRATED_SOURCE_BUILD_CHECKED_NOT_MERGED_PENDING_USER_MANUAL_TEST**.

Coordinator chat: `01a17867-7222-74d0-8dc6-c33b0e939c15`, local. User authorization and exact shared decisions are in `planning/16_MANUAL_PASS_MODULE_COORDINATION.md` from the repository root. This is a source/build review, not hospital approval, SQL execution or business acceptance.

## Reviewed source and isolation

- Application baseline: `50c8013`; module startup baseline: `cbd4025d92a5d8dc3faeb3d874de16ba4589c89c`.
- Coordinator worktree: `C:/Users/alexy/.codex/worktrees/manual-pass-integration/FYP Dev`.
- Integration branch: `codex/manual-pass-integration`, initially based on local main `b997e7a097d0bb2423b34201e2154ac16f47b3f2`.
- Exact combined source checked: `f68095e6c089be2388a873483cd90d88076114fe`. Later coordinator record/guide commits change documentation only.
- All module source and requested repairs were reviewed before importing. Imports were conflict-free. Module dependency cherry-picks were not duplicated. The user-running main checkout contains only planning/coordination/API-scope documentation changes from this work, not the new application implementation.

| Module | Original reviewed owned commits in import order | Integration copies |
|---|---|---|
| R01 backend/port, legacy repair, final backend, frontend, first evidence, automatic lookup repair, final evidence | bb963e6 → 58bb6db → e3782f2 → 8dee3ed → 8108170 → 61a132e → 3fddf56 | a4d683e → e303206 → 28cf304 → fe22137 → 022db40 → 1b38822 → bf61496 |
| R02 V9, runtime/UI, evidence | 5b80b0a → f2a2cd9 → e31dc5c | 65c785a → 2887fd1 → 4857d4a |
| R03 runtime/UI, inventory wording, capabilities wording, evidence | b55bec8 → ccef771 → 0cea15b → 2f58825 | af5ddb4 → 035c034 → ddb45ef → ac223e5 |

Full original SHAs and exact module-local dependency mappings remain in each R01/R02/R03 CONTRACT/HANDOFF and planning/16. Coordinator documentation `40af340` was imported as `f68095e`; subsequent `923d8c2` records the completed combined checks without changing runtime.

## Source findings and repairs

- Manual inventory, available-card selection, issue/return and custody-checked recovery no longer depend on real/simulated scan evidence. Existing historical source, UID/profile and scan records remain truthful; no fabricated UID/result is used to satisfy old constraints.
- Penjaga/Executive permit one active pass per registration; Vendor/Contractor permit multiple and requested/actual issued destinations are distinct, versioned concepts. Root serialization, sorted card locks, active-card uniqueness and generated category-specific uniqueness provide the intended defenses; real SQL/concurrency behavior is still untested.
- Per-pass deadlines explicitly allow null. Null is neither overdue nor returned, and old deadlines are not recalculated. Actual issued/returned dates and actors are separate from lost closure. Partial return closes only the selected physically received pass.
- R01 legacy-only destination fallback repair was required and accepted. Missing v2 destination relations/unknown schemas fail safely. Current-authority reference locks precede root/card locks; inactive references do not prevent physical returns/history.
- MRN lookup uses only fixed synthetic fixtures, current grant/CSRF and bound server patient/ward/bed proof. Raw caller patient data cannot replace a Penjaga result. The final requested repair automatically checks a completed valid MRN on blur, deduplicates in-flight requests and fences/aborts stale work; explicit button retry and manual failure fallback remain. Mock lookup never approves the registration.
- Versioned v2 forms contain the requested fields and independent Penjaga terms consent/server time, with IC-only Penjaga and Executive IC/Lesen selection. Legacy successful replay encoding does not silently ignore new v2-only fields.
- Staff review starts masked and uses a current-version/counter authorized, CSRF-protected, audited explicit reveal. Raw data stays out of idempotency/audit/report/QR and clears on selection/version/scope changes.
- R03 uses nullable settings with strict explicit keys, safe immutable history, distinct registration/pass counts, EXISTS registration destination filters, actual issued destination snapshots and legacy-only fallback. Reports/CSV keep patient/IC/MRN/contact/address data out. Export kind/history and size/formula limits remain bounded and audited.
- Existing role prefixes cover the new admin/staff routes; no shared role expansion was needed. Shared audit change is limited to the approved finite review-fields action. The shared OpenAPI/generated mirror still covers foundation only, with that limitation explicitly documented rather than claiming complete new-route generation.

## Necessary checks actually executed by coordinator

| Check at combined source f68095e | Result / exact scope |
|---|---|
| Backend `mvnw.cmd -B -DskipTests package` | BUILD SUCCESS; 82 main and 26 historical test source files compiled with Java21. Surefire explicitly reports tests skipped. JAR/repackage only, no service start |
| Frontend `pnpm install --frozen-lockfile --ignore-scripts` | PASS; existing lock graph reused, ignored node_modules only; package/lockfile unchanged |
| Frontend `pnpm run build` | PASS; TypeScript production build and Vite bundle; no browser/app start |
| Frontend `pnpm run lint` | PASS; oxlint, no diagnostics |
| Compare V1–V7 and frontend package.json/pnpm-lock.yaml with application baseline50c8013 | Unchanged; only new V8/V9 migrations added |
| `git diff --check` | PASS; ordinary LF/CRLF normalization warnings only |

Local command logs are under ignored `tmp/manual-pass-integration/{backend-package,frontend-build,frontend-lint}.log` in this worktree. Backend notes RegistrationStore's existing deprecated API. Vite warns about a >500kB bundle: combined JS 568.47kB / gzip171.62kB. No unrelated dependency/bundle optimization was introduced.

## Explicitly not executed / not authorized by these checks

**NOT_RUN:** all test bodies, SQL/Flyway application, actual clean/upgrade/backfill validation, rollback/concurrency/business tests, browser/visual/keyboard/UAT, restore/backup drills and live integrations. Old scan/form-centric test fixtures remain historical; compilation does not validate the new workflow and those fixtures need separately scoped maintenance before a future suite run.

No native/demo database was accessed or changed. No application, reader, Docker container or current demo was started/stopped. No main implementation merge, push, deployment, live hospital/API integration or old M08–M11 startup occurred. Old worktrees and unrelated industry-output directories were preserved.

## Ready for the next user decision

All three modules are source-reviewed and the complete source passes necessary combined build/lint checks on this separate branch. This is a concrete reviewable integration result, not a running upgrade. Main merge and changes to the existing demo still require the user's later instruction under planning/16. Preserve the user's data/keys and choose a backup/upgrade procedure before any later startup that applies V8/V9.

The new [user checklist](../../../runbooks/MANUAL_R01_R03.md) replaces obsolete scan-centric business steps for this prepared version; every manual case remains NOT_RUN. Current old-main services do not automatically gain these features. No known blocking source issue remains from this review; SQL, runtime and human acceptance limitations remain explicit.
