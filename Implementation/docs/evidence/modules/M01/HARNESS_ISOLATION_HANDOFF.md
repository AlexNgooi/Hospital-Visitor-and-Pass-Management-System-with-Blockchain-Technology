# M01 harness isolation review return

Updated: 2026-10-09, Asia/Singapore. Status: REVIEW_READY; coordinator owns final
approval/integration status and merge. Existing M01 development permit covers
this test-only correction.

- Branch/worktree: codex/hsaas-m01-frontend-shell / isolated 4156.
- Returned delivery: `8e5ffcffdccd8530a9e30da8244e46f33c2029f2`.
- New tested harness source: `4979d6d38b1a4c3101b514462f4924e4e0d04a08`.
- A following evidence-only commit contains this return; exact delivery SHA is in
  the coordinator message. No main operation, push/deploy or other module startup.

Coordinator accepted auth.ts's finally CSRF fence/me401 invalidation, reproduced
68 frontend tests/typecheck/build/lint/synthetic proxy and the actual 28-request
M00/MySQL/Vite wire suite. The reported independent run first checked inherited
override variable names and found no Spring/JVM overrides, then stopped resources.
Those results and our original seven browser states remain valid historical
evidence in [INTEGRATION_HANDOFF](INTEGRATION_HANDOFF.md) and
[integration-verification.json](integration-verification.json). Their source and
resource metadata are not replaced by this harness-only smoke.

## Isolation decision and implementation

The original harness spread process.env into children. Spring's high-priority
environment properties or JSON could supersede HSAAS_DB_URL; JVM options could
inject properties. FixtureSeed's own URL check does not protect backend/Flyway
startup. The correction rejects inherited `SPRING_*` and common JVM/Node injection
variables **before any filesystem writes, port operations, Docker/Java or Flyway**.
It emits only a fixed refusal message, never host names/values or random secrets.

All child launches, including Docker inspection/cleanup/control actions, now use
one OS/runtime allowlist from environment.mjs. Backend and fixture receive the
same clean environment plus explicit disposable DB credentials/port/test modes.
Vite receives only that clean environment and the owned backend origin; inherited
HSAAS credentials and other application/configuration variables do not survive.

Backend config location is explicitly `classpath:/application.yaml` from the
reviewed executable. Additional locations/import/profile includes/integration
group are empty, active profile is integration-m01. Host config-location and
external profile/include/group entrypoints cannot select cwd files or a local
profile. Backend source/migrations, auth.ts, generated types/spec and wire/browser
scripts are unchanged by this correction. English isolation comments and the
reproduction README were updated.

## Actual checks

| Check | Result |
|---|---|
| `node --test --test-reporter=spec tests/real-integration/environment-check.mjs` | PASS: 16 tests, 0 failures/skips, runner exit0. Separate from the historical 68 Vitest tests. |
| OS/runtime environment allowlist | PASS: inherited application credentials/configuration dropped; preserved runtime names canonicalized case-insensitively. |
| Spring/JVM injection negative cases | PASS: datasource/JSON/config-location/import/config-name/profile/include/group and Java/Node option entrypoints rejected, including spelling aliases. |
| Actual harness with `SPRING_DATASOURCE_URL=jdbc:mysql://127.0.0.1:9/ignored` | PASS expected refusal exit1, fixed stderr, empty stdout and empty owned scratch directory. Override value is not reflected; no target connection/probe, container or JVM startup occurs. |
| Normal isolated startup smoke | PASS: clean child environment starts actual reviewed M00 + owned MySQL8.0.45; unchanged Flyway/seed completes, Vite starts, actual proxied health200/UP observed. This is startup smoke, not a new auth/business/browser run. |
| lint / strict test typing / whitespace | PASS: pnpm run lint0 warnings, typecheck:test exit0, diff/staged whitespace exit0. |
| Smoke cleanup | PASS: stop204, ownership-checked exact container removed; independent owned listener/container counts0. No browser was opened in this return. |
| New 28-wire/7-browser/68-Vitest replay | NOT_RUN / not required for this test-only correction; accepted prior receipts preserved unchanged. |
| Production HTTPS and whole-system business acceptance | NOT_RUN, unchanged limitation. |

The first lint run flagged a throwing path in a test finally block. Scratch target
resolution/parent/basename validation was moved before the try/finally; the final
16-check and lint runs passed without suppressing the rule. Recursive cleanup
only uses the verified mkdtemp target, never a user workspace path.

The normal smoke used container hsaas-m01-real-4156, backend18091/Vite15191/
control15192 and random loopback MySQL53354. Explicit modes remained test /
disabled reader / manual MRN / disabled notifications+blockchain; no .env/native
DB/console bootstrap or backend code change. The smoke was stopped immediately
after readiness and health inspection. Its sanitized metadata and check receipt
are in [harness-isolation-verification.json](harness-isolation-verification.json).

Source commit contains only four frontend test-harness files. The following
documentation-only commit supplies this evidence and a link from the original
handoff. Coordinator should review the guard's placement, unified child env,
classpath/profile pinning, inert negative case and cleanup before merge.
