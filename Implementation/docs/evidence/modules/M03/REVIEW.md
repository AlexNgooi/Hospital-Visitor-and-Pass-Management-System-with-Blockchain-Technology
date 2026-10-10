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
