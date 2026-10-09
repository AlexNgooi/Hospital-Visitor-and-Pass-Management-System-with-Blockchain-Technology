# M04 coordinator independent-checkpoint review

Date: 2026-10-09, Asia/Singapore. Result:
**APPROVED_INDEPENDENT_CHECKPOINT**. Full module status remains **IN_PROGRESS**.
No M04 runtime merge, main FeatureSlot wiring or real review activation is
performed by this record.

Reviewed/tested source: `03eca76ba860f0e0c5590006a8137a493c1d4d6f`.
Evidence-only delivery: `398a24424eae8897d204bb859e57046128677da0`.
Branch: codex/hsaas-m04-counter-review; worktree:
C:/Users/alexy/.codex/worktrees/hsaas-m04-counter-review/FYP Dev.
Application baseline: f59baf3. Module worktree remained clean during review.

## Scope and source review

The six imported M03 source/test contract files match approved dependency
`4d70df4e50a1e5bb2917e7f64344ebe755778cd6` exactly. M04's own source stays in
registration/review, features/counter/review and corresponding tests/harness.
Imported coordinator docs in branch ancestry are not M04 shared-file edits.
Source-to-delivery backend/frontend diff is empty; whitespace checks passed.

Reviewed strict JSON/unknown/duplicate/trailing rejection, missing optional
confirmation semantics (explicit JSON null rejected), fixed C11 encoding and
reuse of the single M03 C09 rule. Reviewed transaction-outside requireHuman,
current role and full user/counter/binding/context prefix before request/key
validation, both replay checks, root decision followed by one local audit/idem
success, and whole-transaction rollback before replay-only uniqueness recovery.
Recovery cannot reapply a decision, replace a key or bypass current authority.
401/403 remain distinct; invisible review objects use 404 NOT_FOUND.

Review POST/config is absent by default. Explicit enabling requires the M03
root bean; source contains no fake fallback. There is no root adapter/entity,
GET controller, V5, shared bootstrap/client/theme/lockfile change, PII reveal,
assignment/pass/deadline or notification/chain job in this checkpoint. Candidate
masked read DTOs remain pending S-V1 and actual M03 queries, not a frozen
production projection contract.

Reviewed UI immutable original command handle/key/body/version through UNKNOWN,
explicit GET/retry, no automatic write replay, confirmation reset on conflict,
identity/counter/read-generation fencing, access-loss hiding and stopped poll,
reason-required/focus-return dialog and synthetic manual checks. English
responsibility/authority/transaction/recovery comments accompany handwritten
source. Long content/zoom/short screens retain accessible necessary scrolling.

## Coordinator independent checks

- Backend command: `.\mvnw.cmd -B -Dtest=SyntheticReviewRulesTests,RegistrationReviewPortTests,ReviewCommandsTests,ReviewServiceTests test`.
  **36 PASS**, zero failures/errors/skips, exit 0, BUILD SUCCESS at
  **20:39:29 +08** (9 imported contract + 11 DTO + 16 mock service).
  Ignored raw log: backend/target/coordinator-m04-checkpoint.log.
- Frontend **122 PASS**, start **20:39:22 +08**, then test typing, production
  build, lint (zero warnings) and synthetic proxy PASS. Build excludes the
  unregistered M04 FeatureSlot; it establishes compatibility, not activation.
- Independently launched Chromium against the explicitly synthetic harness
  with an environment-allowlisted Vite child and inaccessible backend origin.
  **19 checks PASS**, zero page exceptions. Final independent receipt captured
  at **20:46:19 +08**: coordinator-browser-checkpoint.json. Normal desktop/mobile,
  reason/focus, native fieldset-disabled inheritance, UNKNOWN same-handle GET/
  retry, conflict/reset, stale/read/access fencing and CSS zoom/reduced-motion
  checks passed. Native toolbar zoom remains NOT_RUN.
- All **28 delivered PNG hashes** matched the source-bound manifest; desktop
  and mobile detail viewport captures were visually inspected. Primary controls
  remain reachable; evidence does not claim universal zero scrolling.
- Closed only coordinator browser hsaas-coordinator-m04 and its Vite exec child;
  independently confirmed port15404 listener absent. No native database/.env,
  existing dev server or unrelated browser was modified.

Module reports full Maven verify/JAR **104 PASS** at 20:25:58 +08, including
68 unchanged baseline foundation/QR temporary-MySQL regressions and the 36
selected tests above. This full count is module-reported, not a second
coordinator full-verify result. Module's frontend/browser capture is separate
from the independent runs. Its documented intermediate failures remain history.

## Required integration follow-up

Actual root SQL durability/CAS, real staff HTTP/CSRF/current-counter masking,
persisted concurrent approvals/replay, audit rollback and registration-to-review
E2E remain NOT_RUN. Mock root/audit/idem with real Spring lifecycle and synthetic
browser ports do not substitute for those gates. Enabled real application
assembly/missing-root behavior must also be exercised with the full reviewed
M03 dependency when integration is available.

S-V1 identity/MRN input choice still awaits the human answer in the coordinator
chat. Dependent read projections/root adapter/API/V5 final DDL wait. Under
continuing module permission, coordinate the next exact M03 read/root snapshot,
then implement/test actual integration and shared wiring before full acceptance.
Production TLS/native zoom, real patient/card/reader/provider/chain work remains
deferred. This approval preserves a reusable independent checkpoint; it does
not start M05, deploy, push or mark M04 complete.
