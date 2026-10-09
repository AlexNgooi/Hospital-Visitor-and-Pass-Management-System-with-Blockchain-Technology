# M02 Dynamic Registration QR — submitted for coordinator review

- Module/chat: M02; active isolated chat `01a11db3-31c9-7da0-bfb2-217e71081355`; original `01a11ba4-e2bd-74a3-beee-1f47860bfc01`.
- Owner: module assistant implements/tests/repairs; coordinator `01a11b84-212d-7273-93a5-5dc16c698bdb` owns review and main merge. All new/modified handwritten code has English responsibility/business/security comments.
- Human development authorization: user's explicit **“开启m02”**, 2026-10-09, recorded in planning/12 and coordinator START. Prior direct-code instruction replaces old hand-writing guidance. Permission persists within M02 scope; no M03/M04 work was started.
- Workspace: `C:/Users/alexy/.codex/worktrees/bd17/FYP Dev`; branch `codex/hsaas-m02-dynamic-registration`.
- Original baseline: `98a7f7d5a1869922a752a14ee19492fe97c3cf3f`.
- Tested submitted source: **`239caa8d367e7c8eda8c8477595e9ce9a88525e7`**. Includes M02 checkpoint 256b858, reviewed M00 cf10a71 via effaec2, M02 recovery 548b232, reviewed M01 858b74d via 05c8e0c, screenshot helper a639bf0 and countdown correction 239caa8. Evidence delivery is a following documentation/artifact-only commit; its exact SHA is sent to coordinator after commit.
- No push, deployment or main merge was performed by this module. REVIEW.md/approval belongs to coordinator.

The staff page renders an actual locally encoded QR from strict HS256 server challenges, anchored to fixed display UTC slots (30s rotation/45s expiry). Visitors exchange the shared challenge for independent anonymous-bound grants lasting 20 minutes absolutely. The one-form pointer supports same-scope reuse and explicit atomic cross-scope replacement with C12 linkage. Display/offline/sleep/expiry, logout/permission/owner validity and server recovery fail closed. Public entry clears the fragment before React/API, keeps capability data in memory and never silently rebinds old input to a new context.

Future M03 can render children with the exact accepted EntryGrant and join the provided grant lock/consume port in its transaction. Current UI states visitor fields are unavailable and no registration was submitted. Synthetic transaction probes exercise consume/audit/idempotency composition only. Reader, live MRN, WhatsApp, blockchain and M03/M04 APIs are not implemented.

## Scope and shared exceptions

| Files | Reason / ownership |
|---|---|
| backend registrationentry package | Own controllers/configuration/token/clock/limiter/current-entry/grant port; English security comments |
| backend V4__dynamic_registration_entry.sql | Coordinator allocated V4; four QR tables, uniqueness/foreign-key/C12/consumption constraints; V1–V3 immutable |
| backend registrationentry tests | Owned real servlet/MySQL/race/rollback/disabled/config/OpenAPI evidence |
| backend HsaasBackendApplicationTests.java | Coordinator's minimal exception: latest applied count 3→4 and V1 upgrade 2→3; original security tests preserved |
| frontend features/registration-qr and tests/registration-qr* | Own scoped feature, strict wire port, encoder/decoder test, isolated browser harness |
| frontend package.json/pnpm-lock.yaml | Coordinator authorized qrcode 1.5.4, @types/qrcode 1.5.6, test-only jsqr 1.4.0; no remote encoder |
| frontend src/main.tsx | Coordinator authorized exported FeatureSlots injection into existing App; entry import remains first |
| docs/evidence/modules/M02 | Own generated API, run/lock/consumer contract and sanitized receipts |

Shared App/auth/client/generated schemas/global CSS were not edited by M02. Shared UI changes and M00's request-end session fix arrive solely from reviewed dependency commits. Compare final module branch with 858b74d to isolate M02 changes: 35 source/documentation files before final evidence. No edits to planning or generated M01 client. No uncommitted application work remains after delivery.

## Validation and limits

- Complete backend `./mvnw -B verify`: **67 PASS, 0 failures/errors/skips, exit 0**, package success at 13:14:46+08. M02 accounts for 22; foundation/security includes reviewed M00 maintenance. Backend bytecode is unchanged by subsequent frontend/evidence commits.
- Complete frontend on M01 maintenance: **84 PASS**, final check 13:19:15+08; test TypeScript, production build and lint exit 0. Synthetic proxy also exit 0. Final frontend source includes only the countdown correction after the earlier 84-test run; complete tests/type/build/lint were repeated for it.
- Real browser: **12 checks**, actual MySQL/servlet/Vite with synthetic records; exact final receipt in [browser-verification.json](browser-verification.json). Long IDs preserve string semantics; 1440×1000 and 375×812 plus 200% CSS zoom simulation have no horizontal overflow or axe violations. Physical browser zoom/phone camera/production HTTPS are not claimed.
- Actual PNG decode, no-store/no-referrer, memory-only fragment cleanup, independent visitors, boundary/revoke/owner scope, first-insert/replacement/consume races, actual SQL audit failure, idempotency replay after expiry and receipt transaction fence are recorded in [TEST_RESULTS.md](TEST_RESULTS.md). No excluded tests in final backend run.
- Failed attempts remain documented: pre-fix owner renewal RED, earlier offline recovery timeout, own JAR lock during packaging, landmark/shared select overflow, duplicate nav link and zoom coordinate-mask redaction failure. Final results do not erase these failures.
- Key config defaults disabled; explicit enabled configuration requires valid keyring/controlled origin and refuses early live-key removal. Per-process bounded rate limiting is engineering local protection; distributed throttling, cleanup retention and production deployment remain open operational work.
- Mobile camera, production TLS, physical OS sleep/power loss, live MRN/reader/hospital UAT/load and full M03 registration submission are **NOT_RUN**. No known local blocking defect remains in submitted M02 scope; coordinator must independently review before merge.

## Review / downstream first action

Review V4 immutability/hash and C12 constraints, the full discovery/prefix/display/context/challenge/grant order, actual M00 metadata guard and no-public-owner-renewal regression. Confirm port consumption is in the caller's transaction and a successful safe replay is checked before new-command grant use. Review [LOCK_GRAPH.md](LOCK_GRAPH.md), [README.md](README.md) and [openapi.json](openapi.json); then run the commands in README against disposable MySQL. No developer .env or native DB is needed.

Migration/run/key rotation/recovery instructions are in README. QR is disabled by default, so enabled tests are required separately from foundation startup. M03's future migration owns its registration FK and actual visitor aggregate; it must use originalFormContext and server GrantAccess scope, never automatically adopt GET's new context. No downstream module should start without its human development permission.

Browser resources are strictly module-owned (ports 18292/15292/15293, container label m02-bd17-integration) and are stopped after receipt capture. Cleanup receipt and independent port/container checks are included with delivery. User port 5173 and native MySQL were untouched. Raw logs/runtime classpath remain ignored local diagnostics; delivered screenshots hide QR pixels at screenshot time, including under CSS zoom.
