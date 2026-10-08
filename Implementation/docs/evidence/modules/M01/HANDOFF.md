# M01 Frontend Shell & Shared UI · candidate handoff

Updated: 2026-10-09, Asia/Singapore. Status: ready for coordinator review of the
independent frontend slice after CHANGES_REQUESTED fixes; **real M00 auth/CSRF integration is NOT_RUN**.
This document does not mark the module APPROVED, MERGED or INTEGRATION_VERIFIED.

## Approval, identity and immutable input

- Human approval, recorded in baseline planning/12: “现在每个module 都好了吗？ 好了的话可以开始让 00 01 开始写”. Latest AGENTS explicitly starts M00/M01 and permits assistant implementation with English comments.
- Module: M01; chat `01a11bcf-e448-7be0-88c1-f7910300e82e` (original `01a11ba4-ddd4-78f1-bcb1-340650645d3e`). Implementation owner: module assistant.
- Baseline: `c2b0c316e04947df06b84f1008f470b6e5a9eb8b`.
- Branch: `codex/hsaas-m01-frontend-shell`.
- Worktree: `C:\Users\alexy\.codex\worktrees\4156\FYP Dev`. No writes in source Local or M00 checkout.
- Source implementation head: `fcad282656c0d00b8a21c7514eabc3a34f9e18b4`.
- Previously reviewed delivery: `c8b9804e6653408fd49db7d1d95069c585a58ceb`, source `99e860c1ae11b2198e3b63b1153f6d52fce14247` (original implementation `8522d43754f5f80fd68163d9d0a6025016a4747e`). Coordinator requested three fixes; this revision returns them for review, not self-approval.
- This handoff/screenshots/receipt and frontend CONTEXT update are a subsequent documentation-only commit. Exact delivery HEAD is reported in the coordinator HANDOFF message and is resolvable from this module branch.

Input: planning/02/03/04/07/09/12, frontend/docs CONTEXT, UI v4. Coordinator
messages additionally freeze C01 IDs as strings and C10 scope as
`{environment:string,counterId:string,categoryScope:string|null}` with safe-integer
bindingVersion. Technical decisions are separate from the human development approval.

## Delivered behavior and scope

The Vite welcome page is replaced by a red/white staff sign-in page and distinct
Counter Staff/Administrator responsive workspaces. Username/Staff account follows
C11 ASCII normalization; password bytes are preserved and cleared after requests.
No public signup, role picker, fake dashboard metrics or production mock login.
Unconnected modules show honest empty/unavailable states; they execute no business
API. Integration badges remain disabled/unavailable, never simulated success.

Public `/register` is BM-first and unavailable until M02 connects it. The memory
entry vault sanitizes initial and native same-document hash/back navigation before
entry consumers act. It preserves Router history metadata, publishes changes and
supports `clear(expectedToken)` so a slow previous exchange cannot erase a new
entry. This code does not exchange tokens, generate QR, register or review visitors.

Allowed changes: Implementation/frontend and this M01 evidence directory. Runtime
ownership includes app/providers/router, UI primitives, lib client/CSRF/errors/time,
generated entry, global CSS/assets, package/lockfile, Vite proxy and tests. No
backend, migrations, infra or planning change was made.

## Shared extension and safety contracts

Exact export paths and usage are in frontend/README.md:

- App.features / FeatureSlot: reviewed role-bound feature injection; PUBLIC only `/register`. Reserved routes are replaceable, not implemented business features.
- useAuth: loading/anonymous/authenticated/error; server-backed identity, opaque string IDs and role. Additive logoutState and mutationPending expose recovery. Protected 401 clears local identity even if its body is malformed. Sign-out clears identity immediately; async generations fence stale results, and explicit reads cannot undo sign-out intent.
- useCounterScope: authorised counter view selection only; does not confer backend object access.
- entryVault.read/subscribe/clear: memory only. M02 should use useSyncExternalStore and fenced clear after terminal handling. No storage/log/analytics.
- ApiClient.get/post/command: same-origin `/api`, runtime response schemas, no-store/no-referrer, redirect rejection, bounded responses and distinct transport/cancellation errors. Protected feature requests require authRequired=true. No automatic write retry.
- Command handle: immutable path/method/auth policy/serialized body/key across UNKNOWN/manual retries; new UUIDv4 per new business command. Auth/CSRF has no business key. Void commands require HTTP 204. No frontend HMAC or secret.
- ClientError.restartDetails: C10 frozen validator, only RESTART_REQUIRED; other or invalid details ignored. Scope IDs are decimal strings, null is the four-category entry, bindingVersion must be safe integer. M02 adapts controlled labels; raw objects are not displayed.
- RestartConfirmation: BM controlled focus-trapped dialog with cancellation first. It only calls callbacks; M02/M03 own exchange/CAS and old-form retention/recovery.
- Safe error copy supports BM visitors; raw messages, rejected values, token/PII and stack traces are never displayed. UTC display uses MYT without deciding expiry.

Vite dev/preview preserves path/method/body/status/content-type/Set-Cookie with no
rewrite. HSAAS_BACKEND_ORIGIN is a server process variable, not browser VITE config.
Production `/api` routing and HTML privacy headers remain deployment integration
requirements. Generated runtime types are **not** claimed complete: backend
OpenAPI is absent. The pinned isolated CLI was tested on a synthetic schema only.

## Actual verification

All commands below run in Implementation/frontend unless explicitly marked root.
Revision test run started `2026-10-08T21:51:43.719Z` = 2026-10-09 05:51 MYT.
Results and screenshot hashes are recorded in verification.json.

| Requirement / boundary | Scope | Result | Evidence |
|---|---|---|---|
| Q05 / C01/C02/C03/C10/C11 client slice | Explicit synthetic fetch/component tests | PASS, 63 tests, 0 failed, command exit 0 | pnpm test; verification.json |
| Q06 M01 slice | Input labels/summary focus, role routes, dialog cancellation/Escape, reduced motion/responsive UI | PASS for inspected pages; not all downstream Must flows | Component tests; screenshots; browser audit |
| Runtime typing | Strict app and test TypeScript | PASS, exit 0 | pnpm run typecheck:test |
| Frontend build | Revised independent application | PASS, exit 0 | pnpm run build; JS ~420 kB / ~131 kB gzip, not a measured Q02 performance result |
| Lint / dependencies | Lint rerun; dependencies unchanged since reviewed delivery | PASS, exit 0 | pnpm run lint; prior reviewed pnpm peers check / frozen-lockfile install receipts retained |
| Proxy wire behavior | Actual Vite forwarding to ephemeral synthetic HTTP server | PASS, exit 0 | pnpm run test:proxy; tests/proxy-smoke.mjs |
| C10 / T-R06-H shared UI slice | Typed restart details and dialog, not backend transaction/CAS | PASS for shared slice; business NOT_RUN | Numeric IDs/category codes/unsafe version rejected; cancellation/busy tests |
| R06-F shared ingress privacy | Initial and repeated same-document fragment removal, zero persistent storage | PASS, exit 0, synthetic only | tests/browser-entry-check.js; visitor-entry-mobile.png |
| OpenAPI generation tool | Synthetic string-ID fixture only | PASS, exit 0 | Hoisted isolated openapi-typescript 7.13.0 / TS 5.9.3 generated an id:string type |
| Git whitespace | Module diff/staged diff | PASS, exit 0 | root git diff --check / git diff --cached --check |
| Real login/CSRF/session/MySQL/HTTPS proxy | M00 integration | NOT_RUN | Await M00 safe auth handoff and coordinator integration |
| Q02/Q04 full system / actual QR exchange / registration/review | Downstream modules and infrastructure | NOT_RUN | Not implemented by M01 |

Negative coverage includes invalid username/control/Unicode/email syntax; unsafe
paths; unsafe long numeric ID responses; malformed JSON/HTML; safe error/privacy
fallbacks; CSRF invalidation and inflight rotation; timeout/cancel; immutable
idempotency retry body; public grant errors separated from staff expiry; wrong role;
stale login after invalidation; password clearing; empty/error/loading; restart
unknown/invalid details; stale entry clear and preserved Router history metadata.

Browser fixture is explicitly started test-only. Final dist preview was inspected
at 1440×1024, 1024×768, 768×1024 and 375×812. Inspected login, staff/admin overview,
access-denied, mobile drawer, unconnected module and visitor entry pages passed
axe (including colour contrast), stylesLoaded=true and no horizontal overflow.
Escape restored the mobile trigger focus. This is scoped evidence, not a claim of
complete WCAG conformance or real hospital UAT. No real identity/session cookie or
patient data was used. Screenshots are synthetic and token-free.

The original 13 captures and broader viewport/ingress checks are retained as
historical evidence for source `99e860c`; they were not all recaptured for this
revision. The revision production build was exercised at 375×812 for ambiguous
login after post-login CSRF failure, unknown sign-out, a still-active server
session and confirmed explicit retry. All four states passed stylesLoaded, zero
axe violations and no horizontal overflow; four new screenshots were visually
inspected. The synthetic browser flow issued exactly one login POST; its explicit
GET session check did not replay credentials, and a still-active session did not
restore protected content. Expected simulated HTTP 401/503 network console errors
occurred; no uncaught JavaScript exception occurred in the executed flow.

## Coordinator review fixes returned

1. P1 sign-out: local identity/protected content is cleared before the request
   settles. Pending and rejected outcomes stay cleared; UNKNOWN has explicit
   retry and session status checks. Delayed me/login results are fenced. An
   explicit me200 reports still-active sign-out without restoring old identity;
   me401 confirms absence of authority. No automatic logout replay.
2. P2 login recovery: the persistent explicit session action covers network-unknown
   login and successful login POST followed by failed CSRF bootstrap. Tests use the
   real client/auth adapter with synthetic fetch, asserting one login POST and
   either me200 recovery or clear me401 feedback. No automatic login replay.
3. P2 command immutability: method and authRequired are captured at handle creation,
   alongside existing path/body/key. Regression tests mutate the caller options
   and body between executions, preserving PATCH/body/key and original expiry
   handling for both public/protected policies.

Related safety tightening: a schema-free logout response must be HTTP 204;
unexpected JSON 200 is rejected instead of falsely confirming sign-out. This
shared-client contract is documented in frontend/README.md and tested.

## Failures found and repaired

- Initial TS parameter properties violated erasableSyntaxOnly; replaced with explicit fields. Build then passed.
- Initial API generator peer mismatch and Windows dlx junction failure: tool is pinned/isolated with hoisted linking; application retains TS 6. No unsupported peer override.
- Two sidebar small-text contrast checks failed (4.49/4.26); colours changed to the existing muted token and browser checks repeated successfully.
- Dev server once served an empty CSS module during checks. That screenshot/result was rejected; final dist preview was inspected with an explicit stylesLoaded guard.
- Final browser entry repeat exposed same-document hash ingress being missed. Navigation capture/subscription/fenced clear added and tests/browser check passed. No grant exchange added.
- Two check commands accidentally used repository root and failed with no package.json. They were rerun in frontend and passed. These failures are not represented as successful runs.
- During this revision, two existing input tests initially typed before session bootstrap completed. They now wait for enabled inputs, matching the deliberate pending-auth disable rule; final 63 tests passed. A test probe assignment was moved to an effect to remove a lint warning.

## Remaining dependencies and review actions

No known failing independent frontend check. P1 integration dependency: M00 real
auth/session-save/fault/concurrency and HTTPS forwarding remain NOT_RUN here.
Coordinator should review this exact source/delivery branch, then coordinate the
real csrf→login→me→logout→me401, missing-CSRF403, wrong-role403, object404,
readiness503/no-store tests once M00 is ready. No frontend test can validate
backend RBAC or database atomicity. API schema generation waits for backend OpenAPI.

M02/M03/M04 remain absent, not implicitly started. Hardware/live MRN are deferred;
WhatsApp/blockchain disabled. No migrations, external sends, push/deploy or main
merge. English comments were checked across handwritten modules, security logic,
entry recovery, tests, fixtures and configuration; generated output is untouched.

Source worktree was clean after its last source commit. Documentation-only evidence
is included by a following commit; ignored node_modules/dist/Playwright caches
remain outside delivery. Temporary preview/fixture services are stopped after
evidence collection. Coordinator alone records review and merge in REVIEW.md.
