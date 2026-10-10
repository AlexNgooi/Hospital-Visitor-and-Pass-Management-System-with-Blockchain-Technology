# M03 Visitor Registration — implementation and validation handoff

**Current delivery update — 2026-10-10:** functionally reviewed and merged locally
as0067637; combined QR/registration/review entry isdc69823. The user's latest
instruction stops further assistant testing and assigns manual acceptance to the
user. Older coordinator-run/merged-regression gates below are historical,
superseded instructions. See REVIEW and [manual runbook](../../../runbooks/MANUAL_M00_M04.md)
for the current boundary; no complete combined acceptance or push is claimed.

- Module/chat: M03, 01a11ba4-e814-7832-bd40-f471edf417b4; module assistant directly implemented, tested and repaired.
- Human development approval: user replied “继续” in this M03 chat on 2026-10-09; coordinator independently confirmed its scope. Permission is retained; C15/C16 are technical decisions, not a replacement human approval or a new module start.
- Application baseline: f59baf350feeec024bf7178bf4d421aec4a6d41e.
- Branch/worktree: codex/hsaas-m03-visitor-registration; C:/Users/alexy/.codex/worktrees/m03-visitor-registration/FYP Dev.
- Stable executable source: 9d9baf658fd6c7151b4d7a83a3d85d380dc982c6; backend dependency 869c6cb725dd1ea7a104bf6d646c50f8102e93db and Unicode correction 8623e7c9f49dd964684b30ee0ae5d0722c3121b3.
- Frozen browser/harness source: bdb05624db58aa5fac2b4954cfaf31cdfe8a873c; observed-exit cleanup e90df7c. Final browser receipt and hash manifest are in browser/manifest.json. Evidence is finalized in the delivery commit; no main merge, push or deployment.

## Behavior and scope

Signed current QR opens one immutable original context. Four versioned DEMO-only visitor categories collect their approved whitelist in three steps, require synthetic privacy acknowledgement and optionally obtain synthetic MRN feedback. Mock MATCH never verifies the visitor. The server atomically creates one root and privacy row, consumes the original grant, writes safe local audit and records idempotency; the public 201 contains only a random R- reference for staff counter verification.

Ordinary inputs remain inside the reviewed M02 disabled fieldset. Submission dispatch unmounts entry polling. An uncertain result retains one original serialized body/context/key and provides an explicit retry outside the fieldset; later 403/410/network errors cannot create a new command or rebind old input. Metadata retry is explicit and original-context-bound after parent revalidation. Drafts/tokens/commands are memory-only; full reload closes that recovery state and requires counter assistance, rather than a public lookup or device persistence.

Root read/write facets provide M04 exact masked DTOs and one-use RC receipts; the root remains the sole persisted aggregate. M04 owns its staff HTTP/orchestration/audit/idempotency and separate feature. M04 full acceptance is not claimed by this M03 handoff.

Owned directories are backend registration/hospital, frontend features/registration, corresponding own tests/harness and M03 evidence. Shared exceptions: real V5 migration, minimal QrMysqlTests parent fixtures/cleanup, exact foundation migration counts, main.tsx single PUBLIC composition, and C16 optional compact M02 entry.tsx/scoped CSS/CONTEXT/default+compact assertions. C13/read eight stable dependency files and V1–V4 are unchanged. App/auth/client/generated/dependencies/global CSS and coordinator REVIEW are untouched.

## Contracts and security

See IMPLEMENTATION_CONTRACT, BACKEND_CHECKPOINT, UNICODE_CHECKPOINT and frontend/tests/registration/README. Public module-owned POST schema/MRN/submit require real session/CSRF and original context. Server scope/source/time/actor are derived internally; UUIDv4 idempotency preserves parsed-original values/presence, including NFC-equivalent different bodies. Original controls/FORMAT/surrogates fail before NFC and printable Unicode-space trimming. Active reference locks are category then destination, after the grant prefix; configuration writers must not hold reference locks then call back into grant/root workflows.

V5 stores per-registration synthetic JSON, PRIVACY_ACK and temporary digest/keyed-fingerprint feedback. Real parent FK joins the same transaction; no person master, sending opt-in, notification/outbox, pass/card/assignment or clinical record is added. Failed unique commands fully roll back and perform fresh anonymous-guarded query-only replay. Read/root/create receipts reject completion, reuse and suspended REQUIRES_NEW before SQL; read SQL filters the exact currently authorized counter.

Modes: demonstration environment only; reader disabled, MRN mock/manual, notification/blockchain disabled, all registration data origin SYNTHETIC. Production enabled registration fails closed. Live hospital/privacy/retention approval remains deferred.

All handwritten code has English responsibility, business-rule, transaction, authority, privacy and recovery comments. C16 is presentation only; original grant/vault/scope/restart/poll/timer/fieldset logic stays unchanged.

## Executed checks and requirements

| Requirement / scope | Result | Evidence |
|---|---|---|
| R02 four synthetic categories / strict valid-invalid | PASS unit/real servlet/MySQL | TEST_RESULTS; RegistrationFieldTests/RegistrationMysqlTests |
| R03 privacy / disabled notifications | PASS required acknowledgement only, no sending consent/job | TEST_RESULTS and V5 |
| R04–R05 synthetic feedback/manual boundary | PASS digest/fingerprint/expiry/timeout/defer; no mock verification | TEST_RESULTS; live hospital NOT_RUN |
| R01/R06 integration / atomic grant / original recovery | PASS real MySQL and original M02 regressions | Final 109 backend, dependency checkpoints |
| S01 read/write root dependency only | PASS masked current counter/role/session/version/receipt/C09 metadata | Actual M03 tests; M04 full HTTP/UI acceptance remains separate |
| UI states/C16/UNKNOWN/privacy/Unicode | PASS 110 frontend + typing/build/lint/proxy | UI_CHECKPOINT/TEST_RESULTS |
| Final real browser, sanitized geometry/PNG hashes and cleanup | PASS 47 unique checks, zero browser exceptions/axe violations; actual backend/MySQL; three unbound ports | browser/manifest.json and browser/browser-verification.json |
| Hardware, native camera/toolbar zoom, production HTTPS, hospital live, messages/chain | NOT_RUN/deferred | Scope boundary |

Final backend verify: .\mvnw.cmd -B verify, exit 0, 109 tests/zero failure/error/skip and repackaged JAR at 13:47:24 +08. Earlier Windows held-JAR packaging failure and transient Flyway startup failure are retained in TEST_RESULTS; no test was skipped or production timeout changed.

## Coordinator action and remaining boundary

Backend 869 and Unicode 8623e7c were independently accepted for M04 integration. UI9d9 was independently checked at 110 tests plus typing/build/lint/proxy. Final module browser evidence is archived. Independent coordinator browser review, APPROVED/main merge and merged regression remain coordinator-owned. Coordinator should review the stable diff and English comments, run the owned harness sequentially (fixed ports/name), preserve M02 staff slot and compose M04 separately after its gate; do not enable against developer .env/native DB.

Beyond application9d9, later commits harden only the owned browser harness and its evidence naming. The delivery commit finalizes module evidence and owned directory documentation; the final tree is required to be clean. No user secrets or real PII/raw logs/capabilities are delivered. M05+ remains unstarted; subsequent coordination belongs to the user under the latest planning boundary.

Final browser receipt written 2026-10-10T14:06:19+08:00; cleanup 2026-10-10T14:06:36+08:00. Backend/Vite each have observed SIGTERM exit, the exact owned container was removed, all three owned ports were unbound and CLI closed. Four categories × three steps × two viewports are measured; normal document heights are 768/812, controls at least 44px. Expanded native help/error links and CSS 200%/375×568 allow scrolling, with keyboard reachability checked. Long 500-codepoint content remains intact in a labelled keyboard-scrollable review region. The corrected final zoom screenshot has an active, enabled original-context form. Earlier weak predicates/timeouts are preserved in TEST_RESULTS.
