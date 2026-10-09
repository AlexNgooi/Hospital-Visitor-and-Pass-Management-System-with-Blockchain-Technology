# M04 verification results

Final code source: `03eca76ba860f0e0c5590006a8137a493c1d4d6f`, tested after its commit with a clean tracked worktree. Times below use Asia/Singapore. Delivery only adds evidence.

## Final checks on the fixed source

| Check | Command | Result / exit | Time / scope |
|---|---|---|---|
| Backend full regression / JAR | backend: `.\mvnw.cmd -B verify` | PASS; 104 tests, 0 failure/error/skip; exit 0; JAR repackaged | Finished `2026-10-09T20:25:58+08:00`. Breakdown below. Existing M00/M02 MySQL tests used temporary Testcontainers MySQL; no native DB fallback. |
| Frontend full suite | frontend: `pnpm test` | PASS; 122 tests across 4 files; exit 0 | Started `20:24:22`, duration 7.97s. Includes 27 M04 component/client tests and 95 existing tests. |
| Test typing | `pnpm run typecheck:test` | PASS; exit 0 | Same fixed source, final validation batch started `20:24`. |
| Lint | `pnpm run lint` | PASS; 0 warnings; exit 0 | Same fixed source. |
| Production build | `pnpm run build` | PASS; exit 0 | Same fixed source. Shared production bootstrap still does not register M04; this is build/type compatibility, not business activation. |
| Proxy regression | `pnpm run test:proxy` | PASS; exit 0 | Synthetic HTTP fixture checks existing forwarding. Not actual M04/backend/DB/HTTPS integration. |
| Chromium browser | `npx --no-install --package @playwright/cli playwright-cli -s=m04-review run-code --filename tests/counter-review/browser.js --raw` | PASS; 19 checks; exit 0; page errors 0 | Dedicated explicit synthetic harness, source recorded in browser-receipt.json. 14 state audits: axe violations 0, no horizontal overflow, controls >=44px, storage empty. |
| Diff whitespace | `git diff --check` and staged equivalent | PASS; exit 0 | Source commit was clean. LF/CRLF notices were line-ending conversion notices, not failed whitespace checks. |

Backend breakdown is **68 existing foundation/QR tests + 9 imported M03 pure/receipt contract tests + 11 M04 strict DTO/encoding tests + 16 M04 mockroot/Spring transaction service tests = 104**. No total is an actual M04 MySQL review count. The stale historical ReviewRulesTests report from 19:27 is excluded; that duplicate source was removed and is not part of the final suite.

The 16 service tests prove ordered port calls/current authority, READ_COMMITTED Spring boundaries, two replay lookups, no second decision/audit on successful replay, uniqueness-loss rollback before read-only recovery, no reapply on a missing winner, changed-body conflict, counter/role/session revocation, audit failure propagation, root conflict/result validation, caller-transaction rejection and default-off/missing-root assembly. Root/audit/idempotency implementations are Mockito ports in this layer; durable SQL rollback and real HTTP security are not proved here.

Browser state audits cover desktop queue/detail/UNKNOWN/approved/conflict/reason-required/rejected; mobile queue/detail/rejection/stale/access-revoked; 200% CSS zoom and landscape reduced motion. Additional checks cover mock MATCH not approving, inherited fieldset disabled state, original command handle/key after generic detail refresh, conflict evidence reset, and dialog focus return. CSS zoom is a reflow simulation; native browser toolbar zoom remains NOT_RUN. Normal phone/desktop screenshots preserve necessary vertical scrolling and do not claim every page fits every viewport without scrolling.

## Intermediate attempts — not substituted for final results

| Earlier worktree state | Observation | Correction / disposition |
|---|---|---|
| Uncommitted first isolated predicate, baseline f59 | 18 local pure tests PASS at `19:27:07` | Historical only. Duplicate M04 predicate was deleted after the approved M03 contract became available. Final tests call the single root rule. |
| Initial frontend WIP from dependency head 840d979 | First build failed: unknown truthiness expression was not a ReactNode | Explicit boolean condition; subsequent builds PASS. |
| Initial frontend 24-test WIP | 23 PASS / 1 FAIL at `19:39:19`; test checked `input.disabled` instead of fieldset-inherited disabled state | Test uses native `:disabled`; 24/24 passed at `19:42:58`. Actual Chromium independently checks inheritance. |
| Intermediate WIP | Lint flagged control regex/effect startup/ref cleanup | Explicit control-character check and scheduled polling startup/cancel helper; final lint 0 warnings. |
| Intermediate browser WIP | UNKNOWN scrollable queue had no keyboard focus target when all rows were disabled | Named focusable scroll list with visible focus ring; final axe 0. |
| Intermediate browser script | Exact label-based selector timed out in reason dropdown | Role/name selector from the current snapshot; application selection worked. Final browser PASS. |
| Intermediate browser WIP | CSS zoom 200% overflowed master-detail layout | Container-width reflow, preserving text/actions; final horizontal overflow false. |
| Intermediate verification before frozen source | 103 backend PASS/JAR at `20:03:52`; 119 frontend PASS at `20:02:10` | Partial WIP results, not final source. Added authorization-before-validation and UNKNOWN recovery regressions. |
| Later pre-final source snapshot | 104 backend PASS at `20:09:16`; 121 frontend PASS at `20:07:42` | Still before last frontend regression/refinement. Final fixed source is 104 backend / 122 frontend / 19 browser. |

PowerShell also rejected an unquoted comma-separated `-Dtest` argument before Maven ran. Quoting the native argument produced the subsequent 20-test contract/encoding PASS; this shell error is not a failed business test.

## Requirements and limits

| Requirement | Implemented checkpoint evidence | Full requirement status |
|---|---|---|
| R04 / T-R04 | Strict C09 parsing, single root predicate, explicit synthetic identity/MRN/ward checks, mock feedback not approval | PARTIAL; actual registration/manual persistence and timeout-to-review integration NOT_RUN. Live MRN NOT_RUN. |
| S01 / T-S01 | Mock authority/role/counter/replay/conflict/audit flow and synthetic queue/detail/reject/approve UI | PARTIAL; actual M04 SQL/HTTP/permission/concurrency/E2E NOT_RUN. |
| Q05 / D01 | Candidate read schema rejects raw identifiers/unknown entities; current authority precedes replay and parsing; no free notes; no storage/log payload extension | PARTIAL; real M03 SQL masking/authorization/retention inspection NOT_RUN. |
| Q06 | Synthetic real-browser keyboard/focus/reflow/contrast/touch states PASS | PARTIAL; production data/real HTTP/hospital UAT and native toolbar zoom NOT_RUN. |
| N/B / physical reader / live patient | No external call/job/assignment implementation added | Deferred/disabled; no successful live integration claimed. |
