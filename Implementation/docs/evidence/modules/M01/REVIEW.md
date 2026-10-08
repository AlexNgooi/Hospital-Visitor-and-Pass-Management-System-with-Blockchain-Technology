# M01 coordinator review

- Review date: 2026-10-09 (Asia/Singapore).
- Status: CHANGES_REQUESTED; no merge or integration approval.
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

2. **[P2] Provide an actual action to check an unknown login result.**
   `login-page.tsx` tells users to use the session check after a timeout, but its
   check button exists only for the initial `auth.state.kind === error` state.
   A failed login request or failed post-login CSRF bootstrap usually leaves an
   anonymous state, so this advice has no action. Offer an explicit session check
   for uncertain sign-in outcomes; do not automatically retry login. Test committed
   login followed by failed CSRF bootstrap, and transport-unknown login recovery.

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
