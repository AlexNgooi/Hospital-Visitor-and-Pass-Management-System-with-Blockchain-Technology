# M03 coordinator dependency review

Date: 2026-10-09, Asia/Singapore. Module status: IN_PROGRESS.
This is **APPROVED_DEPENDENCY_SNAPSHOT**, not complete M03 approval or main
runtime integration. No root SQL adapter, registration API, V5, visitor UI or
hospital policy is accepted by this record.

Reviewed source: `4d70df4e50a1e5bb2917e7f64344ebe755778cd6`, including C09
increment `de7119efcb3365ee09349657757abe9799f029d0`. Isolated branch:
codex/hsaas-m03-visitor-registration; worktree:
C:/Users/alexy/.codex/worktrees/m03-visitor-registration/FYP Dev.
Source/worktree was clean and stable during the coordinator run.

## Accepted dependency files

Under backend/src/main/java/eduupm/hsaas/registration:
ManualEvidence.java, SyntheticReviewRules.java, RegistrationReviewPort.java,
RegistrationVersions.java. Corresponding tests:
SyntheticReviewRulesTests.java and RegistrationReviewPortTests.java.

Reviewed immutable C09 evidence, rejection of mock matching as attestation,
cross-category injection, safe diagnostic representations, decimal IDs and
safe versions. Reviewed package-only receipt capture with private constructor,
internally created marker/resource, exact active READ_COMMITTED synchronization
identity checked before any adapter SQL, one-use release and completion cleanup.
Suspended outer resources do not authorize REQUIRES_NEW; resumed outer receipt
remains usable. Lock permits terminal states for the caller's second successful
replay lookup; only a new decision enforces SUBMITTED/version.

## Independent verification and limits

Coordinator command from the module backend:
`.\mvnw.cmd -B -Dtest=SyntheticReviewRulesTests,RegistrationReviewPortTests test`.
Finished **19:38:41 +08**, exit 0, BUILD SUCCESS: **9 tests**, zero
failures/errors/skips (4 C09, 5 receipt/version). Ignored raw log:
backend/target/coordinator-c13-contract-test.log. Diff whitespace check passed.
All changed handwritten code has English responsibility/boundary comments.

Tests exercise actual Spring synchronization suspend/resume/completion through
a stub transaction manager and mock root SQL-entry counters. They do not prove
real SQL locking, staff authorization, persistence, review races, audit/idem
composition, V5 clean/upgrade, frontend behavior or complete registration.
These gates remain NOT_RUN until their actual implementations are reviewed.

M04 may absorb only the six exact files above into its own isolated branch,
record this source SHA, remove its duplicate validator and rerun affected tests.
M04 must not change the imported M03 contract, copy an unreviewed root adapter
or treat this dependency approval as main/module acceptance. Future contract
changes require coordinator/M04 version coordination. No partial runtime was
merged to main; current main application remains the accepted M00-M02 source.

On 2026-10-10 the human selected DEMO-only identity/MRN input in the coordinator
chat (C14): TEST_ID / DEMO- and DEMO-MRN-. This removes the input-choice blocker;
remaining fields/read wire/V5 must receive technical review before implementation.
Real hospital data/MRN, production privacy, hardware and external integrations
remain deferred. No native DB/.env, service startup, push or deployment was used
for this dependency verification.

## C15 read dependency snapshot — 2026-10-10

**APPROVED_READ_DEPENDENCY_SNAPSHOT**, exact source
`f5a9c7f388ec6232ca9be8f9677e3c8872f32756`. New dependency files only:
RegistrationReadPort.java and RegistrationReadPortTests.java under the same root
source/test package. The six previous C13 files are unchanged by Git comparison.
M04 may import these exact two files and must preserve M03 ownership.

Coordinator checked the owner-only factory signature, private/package-captured
scope, original RC/exact synchronization/resource guard before reads, one-operation
release, completion cleanup, suspended-inner rejection and outer resume. Jackson
explicitly denies scope serialization/deserialization. DTOs retain M04 flat fields
and required nulls; lists are copied; query offset/size/null-filter rules agree.

Independent clean source worktree:
C:/Users/alexy/.codex/worktrees/coordinator-m03-m04-review/FYP Dev, at the exact
source above. Command `mvnw.cmd -B -Dtest=RegistrationReadPortTests,SyntheticReviewRulesTests,RegistrationReviewPortTests test`
finished **07:53:01 +08**, exit0: **14 tests**, zero failure/error/skip.
Ignored raw log: backend/target/coordinator-c15-read.log. An initial shell redirect
could not create the log because target did not exist; no test ran in that command.
After creating the ignored directory, the actual command above passed. No source
repair or dirty module files participated in this independent reproduction.

These are five read lifecycle/projection cases plus the previous nine C13 cases;
the datastore/permission implementation is modeled. Actual root factory/current
authority/SQL, V5, HTTP and complete visitor/review flow remain pending. Module's
additional six local decision/masking tests are not in this source and are not
included in the coordinator's count. All modified handwritten dependency code has
English responsibilities/security comments. No runtime source was merged to main.

## C15 actual backend dependency snapshot — 2026-10-10

**APPROVED_BACKEND_DEPENDENCY_SNAPSHOT**, exact source
`869c6cb725dd1ea7a104bf6d646c50f8102e93db`, parent `f5a9c7f`.
Coordinator independently ran `mvnw.cmd -B clean verify` in the clean isolated
review worktree. Finished **08:31:49 +08**, exit0: **109 tests**, zero
failures/errors/skips, JAR built. The runner uses the reviewed clean child
environment, excludes inherited application secrets/JVM overrides and reads no
native .env. Raw ignored evidence: `tmp/coordinator-logs/m03-backend-869c6cb.log`.

This snapshot contains twenty changed backend files plus BACKEND_CHECKPOINT.md:
three hospital files, nine registration implementation files, V5, five new root
test classes and the two authorized legacy fixture/count adaptations. All eight
C13/C15 contract files and V1–V4/M02 production source remain unchanged.
Reviewed receipt validation before SQL, root-only review row locking, category
then destination shared reference locks, original-input hashing and control
rejection, atomic parent/consent/grant/audit/idempotency persistence, current
authority masked reads and bounded temporary MRN cleanup. The actual MySQL
suite exercises the synthetic runtime; it does not represent a live hospital
integration or production acceptance.

M04 may import exactly those twenty backend files while preserving its review
subdomain; it may cite the backend checkpoint. This approval excludes unfinished
M03 frontend and does not permit replacing the whole registration directory or
coordinator planning/review records. Subsequent whitespace normalization fixes
need their own exact revision and focused reproduction. M03/M04 remain
IN_PROGRESS, unmerged; final UI/browser/review integration gates are pending.

## C16 limited presentation exception — 2026-10-10

Coordinator permits M03 to add an optional `compact` presentation prop (default
false) to M02 RegistrationEntry, scoped registration-qr CSS, folder context and
necessary default/compact tests. M03 alone passes true. The heading, current
authority and counter remain visible; explanatory duration/privacy/no-account
copy may move into keyboard-accessible native details with a 44px summary.
No grant, scope, polling, restart, timer, security, fieldset or callback behavior
may change. App/auth/client/global CSS/dependencies remain outside this exception.

Remove fixed form actions that cover fields. Verify default 1366×768 and 375×812
steps/errors and measure action bounds/document height. Expanded help, unusually
long content, small viewports or zoom may require accessible scrolling and must
be recorded honestly. This is limited implementation direction within the
existing viewport request, not complete UI acceptance or M02 reimplementation.

Coordinator visual review of the module's first compact screenshots still found
normal mobile documents around 897px (identity) and 882px (contractor review) at
375×812, with collapsed help below the viewport. Multiple errors were around
1093px. Primary action fit is therefore insufficient evidence for full-page fit.
**R3** requests further normal-layout reduction and actual document-height checks,
including the collapsed help, while preserving labels, 44px controls, error focus
and all expandable explanatory copy. The first module browser report of 29
checks is not final R3 acceptance. Unusually long values/help/zoom may scroll
accessibly; no clipping or unreadable shrinking is permitted.

## Unicode dependency correction — 2026-10-10

**APPROVED_DEPENDENCY_CORRECTION**, exact source
`8623e7c9f49dd964684b30ee0ae5d0722c3121b3`, parent 869c6cb. Only three backend
files change: RegistrationFields.java, RegistrationFieldTests.java and
RegistrationMysqlTests.java, plus the module UNICODE_CHECKPOINT.md evidence.
Eight frozen contracts and V1–V5 remain unchanged. Printable Unicode outer
spaces use Character.isWhitespace/isSpaceChar after original controls/FORMAT and
surrogate validation. All-space input fails; original parsed HMAC values remain.

Independent coordinator command `mvnw.cmd -B -Dtest=RegistrationFieldTests,RegistrationMysqlTests test`
finished **13:32:54 +08**, exit0: **17 tests** (six fields, eleven actual MySQL),
zero failure/error/skip. Clean source in the same isolated review worktree;
ignored log `tmp/coordinator-logs/m03-unicode-8623e7c.log`. Actual HTTP accepts
100 NFC codepoints supplied as 300 decomposed UTF16 units and retains original
successful replay after consumed/expired/revoked grant; composed replacement
with the same key yields 409 despite equal normalized persistence.

M04 may import these exact three files and cite the evidence. The module's
corrected full run passed 109 tests but packaging failed because its owned
browser server held the Windows target JAR; that run is not full verify PASS.
Stop the owned server before final packaging. This focused independent result
does not claim JAR packaging, complete UI or main integration acceptance.

## Stable visitor UI source independently checked — 2026-10-10

**APPROVED_UI_SOURCE_SNAPSHOT**, exact
`9d9baf658fd6c7151b4d7a83a3d85d380dc982c6`, parent 8623e7c.
Reviewed the seventeen-file increment, optional compact default=false preserving
M02 authority/timer/fieldset logic, scoped density and in-flow actions, native
help and short error disclosure with visible inline errors, meaningful focus
without stealing it during corrections, original-context metadata retry and
memory-only immutable UNKNOWN command outside the disabled fieldset. Main
composition retains the QR staff slot and entry pre-bootstrap capture.
Handwritten source includes English responsibility/security/recovery comments.

Independent coordinator frontend `pnpm run test`, `typecheck:test`, `build`,
`lint` and `test:proxy` all exited0 on a clean exact review snapshot: **110 tests**,
five files, lint zero warnings/errors. Tests started **13:43:22 +08**; final proxy
log closed **13:43:46 +08**. Ignored logs `tmp/coordinator-logs/m03-9d9baf6-*.log`.
Default and compact entry both retain offline fieldset protection and the draft.
Proxy checks are synthetic forwarding, distinct from actual backend/browser.

The module's earlier 42-browser result predates the final folded-error source;
its final actual replay, screenshots/hashes, packaging, cleanup and HANDOFF are
pending. A later full backend run hit temporary MySQL/Flyway connection closure
and must be recorded/reproduced separately; neither that failure nor previous
held-JAR packaging failure is relabeled PASS. Complete M03 remains unmerged and
IN_PROGRESS until actual final browser/combined integration acceptance.

## Final source review and local merge — 2026-10-10

**FUNCTIONALLY_APPROVED / MERGED_PENDING_USER_MANUAL_TEST**. Delivery
`2d2c28b73ed98ba7141e71fc014fd1424b38366b` was merged locally as `0067637`.
Application source9d9baf6 and frozen harnessbdb0562 are unchanged. Canonical Git
blob hashes and recorded byte lengths of all79 archived application/harness/
receipt/PNG files were inspected and matched the module manifest. Coordinator
also inspected its own final identity, invalid and vendor-review mobile images.

Before the human stopped further testing, the independent coordinator fresh
actual servlet/MySQL/Vite browser run completed47 unique checks, with zero
browser exceptions or axe violations and31 ordinary viewport geometry audits.
Sanitized receipt and observed-exit cleanup are preserved in
`coordinator-browser/`. Ordinary desktop/mobile document heights were768/812;
expanded help/errors, long content, tiny viewports and zoom retain safe scrolling.
Exact backend/Vite exits were observed, the owned container was removed and
ports18303/15303/15304 were unbound. Module final109/JAR and final47-browser
evidence are separately preserved in HANDOFF/browser; earlier failures remain.

Latest human instruction supersedes the earlier requirement for additional
merged regression: finish through M04, merge locally, stop assistant testing,
and let the user test manually. The combined main source has not been rebuilt
or retested after composition. No hospital, hardware, production or complete
combined acceptance is claimed. Native database and GitHub were not modified.
