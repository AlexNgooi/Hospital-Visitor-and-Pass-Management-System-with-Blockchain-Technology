# M02 verification receipt — 2026-10-09

This is the original source-239caa8 receipt. Current source-835689f repairs and newer 68-backend/95-frontend results are in [RETURN_R1_R3.md](RETURN_R1_R3.md); current browser-verification.json and delivery-manifest.json supersede the original browser capture. The failed review cases and successful repairs remain explicitly separate.

All times below use Asia/Singapore (+08). Records are synthetic. MySQL, servlet sessions/CSRF, cryptographic signing and QR pixels are real. Backend tests use Testcontainers MySQL 8.0.45; the browser harness uses its separately owned disposable MySQL. No developer `.env`, native database or production service was used.

| Check | Actual result | Command / time / evidence |
|---|---|---|
| Complete backend, including reviewed M00 repair | PASS: 67 tests, failures 0, errors 0, skipped 0; verify exit 0, package success | `./mvnw -B verify`; 13:14:46; ignored `backend/target/m02-final-verify-retry.log` and Surefire XML |
| M02 backend subset within that run | PASS: 14 MySQL + 6 rule + 1 disabled + 1 OpenAPI = 22 | Same complete verify; no excluded tests |
| Owner public traffic regression | RED then GREEN; final complete run PASS | Single test `QrMysqlTests#publicEntryDoesNotRenewStaffOwner`; RED 12:44:12, GREEN 12:58:44; ignored target/m02-owner-red.log and m02-owner-green.log |
| Complete frontend on reviewed shared UI | PASS: 84 tests across 3 files, 0 failed | `pnpm test`; 13:14:43 start (ignored frontend/m02-all-ui.log), final countdown correction rechecked 13:19:15 start |
| Test TypeScript / production build / lint | PASS, exit 0 | `pnpm typecheck:test`, `pnpm build`, `pnpm lint`; final run 13:19; build 2105 modules, JS 458.27kB / gzip 144.11kB |
| Synthetic Vite API proxy | PASS, exit 0; not production HTTPS evidence | `pnpm test:proxy`; same command sequence |
| Real browser | See checked browser-verification.json and visual receipt | Playwright CLI named hsaas-m02-real + tests/registration-qr/browser.js; actual backend/JAR, owned MySQL, synthetic records |
| QR PNG decode | PASS; rendered locally generated PNG decoded by jsQR to exact entry URL | Frontend component suite; decoder is test-only |

Backend source tested includes baseline 98a7f7d, M02 checkpoint 256b858, and reviewed M00 public-path fix cf10a71 (source 1fd99b6 / delivery 12940cb; module merge effaec2). Shared frontend maintenance 858b74d is included by M02 merge 05c8e0c. Final submitted source identity is recorded in HANDOFF; subsequent artifact-only commits do not change the tested application.

## Requirement boundaries

| Requirement | Local evidence and status | Remaining boundary |
|---|---|---|
| R01 / T-R01 | PASS local signing, strict payload, real PNG decode and actual next-slot image change | Physical phone camera + production HTTPS NOT_RUN; M03 four-category form not implemented |
| T-R06-A | PASS stable same slot, 30/45 boundaries, expired exchange rejection | No scheduler-based renewal |
| T-R06-B | PASS shared challenge creates independent visitor grants; synthetic consumer exactly once | Real registration aggregate/submission belongs to M03 |
| T-R06-C | PASS grant survives natural challenge expiry; no grant expiry extension; synthetic M00 replay after expiry and cross-scope/body rejection | End-to-end M03 registration reference/command replay NOT_RUN |
| T-R06-D | PASS CSRF/role/object scope, required browser binding, tamper/unknown JSON rejection, logout/permission/owner expiry/revoke guard | No identity or physical presence claim |
| T-R06-E | PASS display offline/hidden/resume safety, public input preserved/disabled, GET recovery, immutable context/expiry and explicit adoption | Real sleep/power loss on physical mobile NOT_RUN |
| T-R06-F | PASS local privacy headers/fragment cleanup/memory-only checks, no remote QR encoder, masked visual artifacts | Production HTTPS/camera/analytics infrastructure NOT_RUN |
| T-R06-G | PASS UI accurately states QR does not prove identity/presence; no static entry fallback | Forwarding a still-live capability remains possible within its window |
| T-R06-H | PASS cancel, exact confirmation linkage/replay, invalid new expiry rollback, first insert/replace/consume/revoke/permission/logout MySQL competition | Actual M03 submit integration remains required |

The synthetic consumer deliberately writes no visitor aggregate. Its actual SQL audit trigger failure rolls back consume/pointer/idempotency; successful replay proves the foundation port composition, not a delivered registration API. Receipts from another transaction cannot consume a grant. Database races use bounded concurrent futures and allow only safe application conflicts; SQL lock/deadlock exceptions fail tests.

## Failed attempts and corrections

- Before the reviewed M00 repair, public requests carrying a staff cookie renewed confirmed owner idle expiry. The dedicated regression failed, was sent to coordinator, and passed after merging the reviewed repair. No test was weakened or excluded in the final run.
- Earlier broad backend run had an existing database-offline recovery HTTP timeout. Both later full suites passed all 67 tests. Keep that earlier failure distinct from the final receipt.
- The first final verify passed all 67 tests but failed repackage because the module's old browser harness held the JAR. Owned harness resources were stopped through its control endpoint; complete verify was rerun and passed.
- Initial browser audit found duplicate unnamed landmarks; the feature aside received an accurate label. The 200% zoom audit then identified the shared native counter select overflow; coordinator assigned M01 and reviewed 858b74d, which M02 merged before final checks.
- Shared dashboard added a second Registration QR link; the browser script now selects the observed Counter navigation link explicitly.
- Visual inspection caught Playwright's coordinate mask moving under CSS zoom. The unsafe zoom screenshot was deleted and all screenshots regenerated with temporary CSS that hides every QR image, including a concurrently replaced image. No unredacted QR is part of delivery.
- Test TypeScript caught direct visibility-state narrowing across an await; a live availability function now checks current visibility/network after response. Typecheck passes.

Expected browser console 401 for the initial unauthenticated `/api/auth/me` probe is normal foundation behavior. `browserErrors` counts uncaught page exceptions, not that expected HTTP negative result. Browser response-loss injection aborts one already-processed POST on purpose; recovery reads current state without retrying the write.

Production deployment, physical camera, real hospital MRN, card/reader, production throughput/distributed limiter, cleanup retention policy and browser/OS sleep are NOT_RUN. WhatsApp/blockchain remain disabled. Coordinator approval/merge is pending its review; this receipt does not self-approve M02.
