# M01 coordinator review

- Review date: 2026-10-09 (Asia/Singapore).
- Status: INTEGRATION_VERIFIED for the approved local frontend/C01 slice; production HTTPS and downstream business gates NOT_RUN.
- Reviewed delivery: `c8b9804e6653408fd49db7d1d95069c585a58ceb`.
- Implementation: `99e860c1ae11b2198e3b63b1153f6d52fce14247`.
- Baseline: `c2b0c316e04947df06b84f1008f470b6e5a9eb8b`.
- Branch: `codex/hsaas-m01-frontend-shell`.

## Independent verification

Coordinator reran these commands in the M01 isolated frontend directory:

| Check | Result |
|---|---|
| `pnpm test` | PASS: 53 tests, 2 files |
| `pnpm run typecheck:test` | PASS |
| `pnpm run build` | PASS |
| `pnpm run lint` | PASS |
| `pnpm run test:proxy` | PASS against explicit synthetic HTTP fixture |
| Module diff whitespace | PASS |
| Submitted screenshot hashes | 13 checked, no mismatches |

Reviewed shared client/auth/entry/route/confirmation code and English comments;
inspected the submitted mobile login and desktop staff screenshots. Browser
axe/responsive claims are module evidence, not a new coordinator browser run.
Real M00 authentication/CSRF/session persistence and HTTPS integration remain
NOT_RUN. The current tests do not cover the failures below.

## Required corrections

1. **[P1] Hide protected content when sign-out begins, including UNKNOWN outcomes.**
   In `src/app/auth-provider.tsx`, logout changes auth state only after
   `await port.logout()` succeeds. A network failure/timeout or a 503 after backend
   revocation leaves the previous authenticated user and protected feature mounted;
   shell.tsx only adds an error. Clear/fence local identity and unmount protected
   content immediately. Keep remote sign-out status explicitly unknown on failure,
   with a controlled retry/recovery action; do not claim server logout succeeded
   or automatically restore the previous identity. Test pending and rejected
   logout with protected content, plus stale async results after that transition.

2. **Withdrawn finding: unknown-login session check action.**
   On full diff reinspection, the original source already had a
   `message && Check current session` button covering the login error case.
   Coordinator's initial missing-action claim was inaccurate and is withdrawn.
   The revision's always-visible session check and additional recovery tests are
   accepted improvements, not a repair of a proven missing original button.

3. **[P2] Snapshot command options before exposing a retry handle.**
   `ApiClient.command()` captures serialized body/key, but execute reads mutable
   caller `options.method` and `options.authRequired` on each attempt. Mutating that
   object between UNKNOWN and retry changes the request operation/auth expiry
   handling under the same handle. Capture method/authRequired values at handle
   creation. Add a negative test that mutates the options and confirms retries
   keep the original path/method/body/key/auth handling.

Fix on the existing M01 branch/chat, update English recovery comments, rerun
affected tests/typecheck/build and update HANDOFF with the new source/delivery
SHA. Coordinator will re-review the changed paths before local merge. M02–M04
remain unstarted; this return is covered by the existing M01 development permit.

## Revision re-review

Reviewed source `fcad282656c0d00b8a21c7514eabc3a34f9e18b4`, delivery
`ad23099774c06bfb9a40c72fa93eea1a9ddfbe37`. R1 and R3 are resolved:
sign-out immediately fences identity and unmounts protected content; pending/
UNKNOWN/retry/status checking does not revive the previous user. Command policy
is captured with its body/key. Explicit login checks do not replay credentials.
Void requests now require the expected 204. English recovery comments updated.

Coordinator independently reran 63 tests, strict test typing, build, lint and
synthetic proxy checks: all PASS. Checked 17 screenshot hashes with no mismatch;
visually inspected the revised mobile UNKNOWN/still-active logout page. New tests
exercise pending/rejected logout, post-revocation 503, late login/me, explicit
recovery and mutated command options. No blocking independent-slice finding.

Production/real M00 integration remains NOT_RUN until the separate C01 session/
cookie/proxy checks complete. Coordinator will record merge SHA and post-merge
checks after local integration; no push or deployment is authorized.

Local merge: `014d03092f6328942ff66da060ecc69ee9ba4407`.
Coordinator ran frozen-lockfile install, 63 tests, strict test typing, build,
lint and synthetic proxy checks from main after merge: all exit 0 (test start
2026-10-09 05:58:44 +08:00). Backend post-merge 40-test verification is recorded
in M00 REVIEW. M01 real C01 integration is the next separately evidenced task.

## Real C01 integration candidate review

Source `2baded5ca1acef2ff0e6cc5391a59cbfa30731f0`, delivery
`8e5ffcffdccd8530a9e30da8244e46f33c2029f2`, baseline `03fda7f`.
Foundation remains merged; this additional candidate is CHANGES_REQUESTED and
not merged yet. Auth CSRF invalidation on both mutation outcomes and me401 is
accepted. Coordinator independently reran 68 tests, typing, build, lint and
synthetic proxy: PASS. OpenAPI mirror hashes match the unchanged M00 spec;
7 integration screenshot hashes match. Module browser results remain module
evidence, not a new coordinator browser run.

Coordinator also launched the submitted harness and independently reran 28 real
wire checks against the reviewed backend, disposable MySQL 8.0.45 and actual Vite
proxy: PASS, including CSRF/session rotation, role errors, no-store, cookie flags,
real DB pause503/resume200. Before launch, only inherited override variable names
were checked; no Spring/JVM override was present. This run did not use native DB
or .env. POST stop204 completed; the exact owned container and all three fixed
listening ports were independently confirmed removed/stopped.

Required harness correction: `...process.env` can inherit Spring datasource/
configuration/profile overrides or JVM options, overriding the HSAAS_* temporary
database values used by the backend. FixtureSeed URL checks protect fixture SQL,
not backend startup/Flyway. Create one isolated child environment or reject
unsafe inherited overrides before resource creation; backend and fixture must
both use it. Add a negative test using a harmless loopback port9 override, not a
native DB URL. Prove rejection with no resources, or continued exclusive use of
the owned temporary database. Preserve credentials in memory and English
isolation comments. No backend/business change or unrelated browser rerun needed.

HTTPS/production Secure forwarding and downstream object/QR/domain authorization
remain NOT_RUN. Return this minimal test-only correction on the existing M01
branch for re-review; existing module permission covers it.

## Isolation return approved

Reviewed test-only source `4979d6d38b1a4c3101b514462f4924e4e0d04a08`, delivery
`58b738a478e74da7460e2455a8785ba650e633a0`. Guard runs before output creation,
port probing or subprocess/resource startup. Inherited Spring/JVM/Node injection
is rejected with fixed non-sensitive diagnostics; all children use one OS/runtime
allowlist plus explicit disposable values. Packaged configuration/profile/import
locations are pinned. This resolves the environment-isolation return.

Coordinator independently ran 16 environment checks, including actual harness
subprocess rejection with harmless loopback-port9 override and an empty scratch
directory: PASS, no skipped/failed checks. Lint and strict test typing PASS.
Module's corrected normal-startup health200/cleanup smoke is separately recorded
in its isolation receipt; the coordinator's earlier 28 real-wire PASS remains
associated with the previous harness source, not falsely restamped as a rerun.
Backend, auth fix, generated types/spec and wire/browser scripts are unchanged
by the isolation return. Approved for local integration merge; post-merge checks
and exact merge SHA follow. HTTPS/full-system gates remain separate.

Final integration merge: `e8ca80ab56ae676a2dd97b34d6fb2a05979a0331`.
Coordinator's post-merge checks in main passed: 16 isolated environment checks,
68 frontend tests (start 2026-10-09 06:30:56 +08:00), strict typing, build,
lint and synthetic proxy regression. The reviewed runtime frontend/backend match
the earlier independently verified real 28-wire source; the isolation return
changes only the harness environment and its tests. Local C01 integration and
shared frontend scope are accepted. Production HTTPS/Secure forwarding, complete
object authorization/QR/registration/review and live integrations remain NOT_RUN.
No module auto-start, push/deployment or native DB action accompanies acceptance.
