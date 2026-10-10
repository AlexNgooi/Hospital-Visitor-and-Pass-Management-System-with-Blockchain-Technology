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

On 2026-10-10 the human chose DEMO-only identity/MRN input (C14), and the
coordinator approved the synthetic schema/V5/public API/read direction (C15).
Under continuing permission, implement/test actual root integration and shared
wiring before full acceptance. The input-choice blocker is resolved.
Production TLS/native zoom, real patient/card/reader/provider/chain work remains
deferred. This approval preserves a reusable independent checkpoint; it does
not start M05, deploy, push or mark M04 complete.

## C15 GET orchestration checkpoint — 2026-10-10

Source `cb8de73d7da5a297a74e8e138fd13e4ba909fc44` includes strict multi-value
queue queries, current staff read orchestration, GET routes and shared server
session transport extraction. Exact read dependency imported in
`9bddf1a1c407d5ad2d331fc56922b50343d969fe` matches M03 `f5a9c7f` by Git comparison;
the previous six C13 files also remain unchanged. M03 retains root-port ownership.

Coordinator inspected query/controller/helper/config/service/tests, including
pre-transaction requireHuman, current role before the ordered counter/session
prefix, one selected counter, typed root-coordinate checks and no-store headers.
Explicit enablement requires both root facets; absence has no mock fallback.

Independent clean coordinator worktree at the exact source ran:
`mvnw.cmd -B -Dtest=SyntheticReviewRulesTests,RegistrationReviewPortTests,RegistrationReadPortTests,ReviewCommandsTests,ReviewServiceTests,ReviewQueriesTests,ReviewReadServiceTests,ReviewHttpTests,ReviewControllerTests test`.
Finished **07:57:01 +08**, exit0: **65 tests**, zero failure/error/skip; ignored
raw log backend/target/coordinator-m04-get.log. Counts are 14 root contracts and
51 M04 cases (11 commands,16 write service,6 query,11 read service,5 HTTP context,
2 standalone servlet bindings). Expected missing-bean context warnings belong
to assertions and are not test failures.

This independently reproduces the GET checkpoint only. Root SQL/current actual
permissions and protected servlet HTTP are mocked in these cases; standalone
bindings omit the security chain. No new frontend/browser result is claimed and
the module's forthcoming full verify must be recorded separately. The new root
adapter/V5 and complete real review integration remain pending; no M04 runtime
source is merged to main by this record.

Module later reported full verify/JAR on the same cb8de73 source finished
**07:57:45 +08**, exit0, **133 tests**, zero failure/error/skip: 68 existing
foundation/QR disposable-MySQL regression cases plus 14 root contracts and 51
M04 cases. Evidence-only delivery `beaca640b719bed7f0c30f18a4d62c4c3783b9e0`
changes five M04 documents, preserves the source and clean state, and adds no new
frontend/browser claim. This is the module's full run, separate from the
coordinator's independently reproduced 65; actual new M04 root SQL/HTTP gates
remain pending. Maven/Testcontainers exited and no additional dev service ran.

## Actual root integration and R2 recovery review — 2026-10-10

Module imported exactly the twenty approved M03 backend files from `869c6cb`
into `a99a91d`, preserving its review subdomain and the eight frozen contracts.
The coordinator's independent M03 clean verify result (109/JAR) is recorded in
M03 REVIEW; it does not itself accept the complete M04 workflow.

First module-owned real MySQL/servlet run finished **13:24:35 +08**, exit1:
20 cases, 19 passed and one failed, no errors/skips. The failing logout case
expected 200 instead of M00's frozen 204. Fix the fixture expectation, preserve
the auth implementation and rerun. This is module evidence, not an independent
coordinator reproduction. Concurrent revocation, successful winner recovery and
manual-mode coverage still need completion or a justified explicit boundary.

Coordinator's source review additionally requests **R2**: after a command became
UNKNOWN, an explicit recovery attempt returning API 4xx must not erase the saved
original key/body/version or unlock a new command. A later CSRF failure/conflict
does not prove the original write did not commit. Preserve the handle and require
explicit recovery; authority loss still hides cached data and may require a
session refresh. Do not carry commands across a changed user/counter workspace.
Initial known 4xx handling remains distinct. Verify meaningful component behavior
and actual-browser recovery where applicable, with honest fault-source labeling.

M04 remains IN_PROGRESS/CHANGES_REQUESTED for this increment, unmerged. No main
runtime, native database, external integration or later module is started.

## R2 frontend correction independently reproduced — 2026-10-10

**APPROVED_FRONTEND_CORRECTION_SNAPSHOT**, source
`4b7fca6cf3889f4c7220cc826b4e1fc1909b3797`, with exact three-file Unicode
dependency import `b3b5a0b`. The UNKNOWN recovery branch retains the original
handle after later API 4xx, blocks new commands and preserves current-scope
recovery through GET refresh. Authority loss still hides cached operational data;
counter/user changes unmount the old workspace. Initial known errors retain
their distinct handling. Reviewed responsibility/security English comments.

Coordinator independently ran frontend `pnpm run test`, `typecheck:test`, `build`,
`lint` and `test:proxy` on the clean exact snapshot in the isolated review
worktree. All exited0, **126 component/client tests**, lint zero warnings/errors.
Commands ran 13:37–13:38 +08; final proxy evidence log closed **13:38:36 +08**.
Ignored logs: `tmp/coordinator-logs/m04-4b7fca6-*.log`. Three meaningful cases
cover committed UNKNOWN → retry 403/409/400 → GET → original handle success;
another covers authority loss and preventing cross-counter execution.

Proxy validation is synthetic forwarding. Build confirms source compatibility;
M04 production routing is still unregistered in this checkpoint. Browser script
now sends a wrong header to the actual CSRF filter after real commit/response
loss, but its execution is still pending. New real SQL/winner/revocation/manual
tests remain uncommitted module work and are excluded from this snapshot's
approval. Complete M04/main integration remains IN_PROGRESS and unmerged.

## Functional delivery, source approval and local merge — 2026-10-10

**FUNCTIONALLY_APPROVED / MERGED_PENDING_USER_MANUAL_TEST**. The latest human
instruction requests function delivery through M04, local main merge without
GitHub push, and no further assistant testing. It supersedes the older automated
acceptance gates. Final delivery `b6036a596ab772771c1d139e76568c514e583770`
was merged locally as `446f887`; runtimeR2 remains4b7fca6, actual fixtures6477dcd.
The final documentation-only deliverycebef09 was also merged; it removes
superseded automated merge prerequisites without changing runtime source.

Reviewed source uses the same M03 root/read/write facets and V5 without duplicate
SQL or migrations. Protected reads derive current selected-counter authority;
review writes serialize authority/root, versioned manual decision, audit and
idempotent result. Uniqueness recovery fully rolls back before authorized,
query-only replay. UNKNOWN retains its original immutable command through
later4xx and GET; identity/counter change cannot carry it into another scope.
Penjaga still needs three human attestations. Comments explain these boundaries.
Coordinator main composition adds the exported protected review slot alongside
M03 registration/M02 QR, retaining entry fragment capture before rendering.

Current actual MySQL class reports show24 mixed-mode and1 manual-mode cases,
zero failures/errors/skips, last updated14:18:42 and14:17:57 +08. Module reported
its test process already exited before the stop instruction; final Maven exit
output was unavailable. These are **25 class-report results**, not fullverify or
combined-main build acceptance. Prior independent frontend126/build/typing/
lint/proxy evidence remains scoped to4b7fca6; no new run was dispatched.

Actual final full backend suite and real M04 browser are
**NOT_RUN / USER_REQUESTED_STOP**. Earlier19-browser evidence is synthetic.
Intermediate fixture failures and repairs remain in ACTUAL_INTEGRATION_PROGRESS;
FUNCTION_HANDOFF records no known production defect and exact cleanup limits.
No owned M04 process/container/listener remained. Combined main compilation,
browser flow and manual acceptance belong to the user; no push, native database
mutation or subsequent module start was performed.
