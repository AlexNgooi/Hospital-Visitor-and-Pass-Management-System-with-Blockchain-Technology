# M04 function delivery — 2026-10-10

Status: **FUNCTION_DELIVERY_READY / MANUAL_ACCEPTANCE_PENDING**. The human changed the completion scope in the coordinator chat: finish through M04, stop further automated tests, deliver the implemented functions for manual testing, merge locally when no known functional defect blocks it, and do not push GitHub. Coordinator owns shared wiring, local main merge and the final user response. This is not a claim of full automated or hospital acceptance.

## Exact source and ownership

- Functional source and current gap fixtures: `6477dcd5fdf9f45a5b650b0913b11e533315c040`; R2 frontend runtime is unchanged from `4b7fca6cf3889f4c7220cc826b4e1fc1909b3797`.
- Branch/worktree: `codex/hsaas-m04-counter-review`, `C:/Users/alexy/.codex/worktrees/hsaas-m04-counter-review/FYP Dev`.
- Approved actual M03 backend869c6cb725dd1ea7a104bf6d646c50f8102e93db was imported as a99a91de12662237a2a6ca97e949eedaa30620cf; approved Unicode8623e7c9f49dd964684b30ee0ae5d0722c3121b3 was imported as b3b5a0bde98d6682275d0a6e832e75066abd3655. The20 backend files, including the3 updated Unicode files, were compared to their respective approved sources with zero differences. Original C13 six files and C15 two files remain unchanged from their approved pins.
- Historical evidence727114f8f1bf04d757aab2bbdf5ab95a0fc9c8b8 preserves intermediate failures. Documentation-only3709db22233f519d220e4e8b6246de743d386f7b prepared the earlier acceptance draft. The final documentation-only delivery SHA is supplied in the coordinator message.

M04 owns `backend/.../registration/review`, its tests, `frontend/src/features/counter/review`, its tests/harness, and this evidence directory. M03 owns the root aggregate, read/write facets, V5 and hospital adapter. No M04 production root SQL, shared routing, dependency or migration rewrite exists. English comments explain the implemented responsibilities, business rules and security boundaries.

## Delivered functions

Counter staff can read an authorized masked queue with category/status filters and pagination, open masked details, explicitly check synthetic identity evidence, approve, or reject with a safe required reason. Penjaga also requires explicit synthetic MRN and ward checks; mock MATCH cannot approve automatically. Review changes only registration status/version and local audit/idempotency metadata, without issuing a card/Pass ID, deadline or message.

Actual protected GET/POST use current session, role and counter permission. Reads hold the approved prefix and use the M03 one-operation scope. Writes authorize before replay, serialize through the root, and commit root/audit/successful result atomically. A uniqueness loser fully rolls back before replay-only fresh authorized recovery; no automatic second decision or new key exists. Removed permission, inactive counter, role/session loss and invisible roots fail closed.

After an uncertain acknowledgement, the UI retains the original key/body/version through GET and failed retry4xx. It blocks new commands until the original outcome is resolved. Current access loss hides cached details; actor/counter changes unmount the workspace. Conflict refresh requires evidence to be checked again. The UI uses the approved v4 layout and typed actual HTTP client; no production mock fallback is included.

## Coordinator integration

Register exported `counterReviewFeatures` from `frontend/src/features/counter/review/index.tsx` with the existing shared FeatureSlot assembly. Its route is `/staff/registrations`, role `COUNTER_STAFF`, navigation label `Registration review`. Enable `hsaas.review.enabled=true` only with the approved M03 registration configuration and both actual facets; missing dependencies fail startup. Preserve disabled reader/notification/blockchain, approved DEMO-only identity/MRN and deferred live hospital formats. No new permission request is needed for this already authorized M04 scope.

No explicit production defect is known at delivery. Remaining missing automated coverage is disclosed below; it is not represented as a passed run. Any actual functional defect found during integration must be fixed within the existing module scope and reported specifically.

## Existing results and stopped work

| Evidence | Actual result / limit |
|---|---|
| Current mixed-mode class report |24 tests,0 failures/errors/skips;44.97s; report updated14:18:42 Asia/Singapore. Includes the corrected late framework-save acknowledgement case. |
| Current independently configured manual-mode class report |1 test,0 failures/errors/skips;22.55s; report updated14:17:57. |
| Current25 launcher status |Already exited before the stop instruction was handled. The17073 tool session no longer existed; exact launcher/worktree Java processes were0. Final Maven exit/BUILD SUCCESS output was unavailable, so these are class-report results, not a verified full build. |
| R2 frontend |Prior module and independent126/typing/lint/build/proxy passed at4b; later frontend source change is a responsibility comment in a test only. |
| Historical backend |Partial-contract checkpoint133/fullverify/JAR passed atcb8de73; this does not prove the final actual-dependency full suite. Latest actual-dependency JAR/classpath was built with skipTests13:52:08. |
| Full actual backend suite and actual browser |**NOT_RUN / USER_REQUESTED_STOP**. No further fullverify, real browser, new tests or runtime resources were started after the instruction. Earlier19-browser evidence remains synthetic. |
| Cleanup |Exact M04 launchers/worktree Java processes0; Docker Testcontainers listing empty and exact M04 harness container absent; ports18404/15414/15415 have0 listeners. The actual browser harness was never launched. |

[ACTUAL_INTEGRATION_PROGRESS.md](ACTUAL_INTEGRATION_PROGRESS.md) preserves earlier failed fixtures and their repairs. No raw build XML/system properties, secrets, cookies, key/body/QR fragment or new unverified screenshots are exported. No native database, environment file, push or new module was touched.

## User manual acceptance after local integration

1. Follow the existing initialization/environment guide with disposable synthetic data, sign in as counter staff and select an authorized counter. Open `Registration review`; check all four category filters, status filters, pagination and masked details.
2. Submit each category through the dynamic QR public flow. Use TEST_ID `DEMO-` plus4–24 uppercase letters/digits and Penjaga MRN `DEMO-MRN-` plus4–16 uppercase letters/digits. Check the queue entry and ensure raw identity/phone/MRN are not rendered in staff details.
3. For Penjaga, confirm approval is unavailable until all three synthetic checks are selected; mock MATCH alone must not enable it. Approve and refresh: status remains VERIFIED, with no card/Pass ID or message.
4. Reject another submitted record: a reason is required. Confirm REJECTED after refresh. In a second authorized staff session, review a record already open in the first; the first must show conflict and require refreshed evidence.
5. If a write acknowledgement is lost, use `Check current status` and `Retry original command`. Keep the original recovery action; GET must not write or create a new key. Check phone layout, keyboard/dialog focus and access loss after logout or permission removal.

No further module is started by this chat. User coordinates M05–M11 in future chats. Coordinator will provide the local merge outcome and push instructions separately; this module does not push.
