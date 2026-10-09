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

S-V1 identity/MRN input choice is pending the human answer in the coordinator
chat. Dependent fields/API/schema/V5 final DDL wait; other frozen work continues.
Real hospital data/MRN, production privacy, hardware and external integrations
remain deferred. No native DB/.env, service startup, push or deployment was used
for this dependency verification.
