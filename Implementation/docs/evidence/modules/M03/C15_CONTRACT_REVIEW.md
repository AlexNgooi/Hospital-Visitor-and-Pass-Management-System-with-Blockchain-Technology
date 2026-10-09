# C15 implementation contract review

Date: 2026-10-10, Asia/Singapore. Outcome: **APPROVED_IMPLEMENTATION_DIRECTION**
with the alignment amendments in planning/04 C15. M03 and M04 remain IN_PROGRESS.
This is not SQL execution, dependency-source approval, a test run or full module
acceptance. C14 is the human's DEMO-only identity/MRN decision.

Coordinator read these candidate files in the isolated M03 worktree before actual
Flyway/source implementation. Original reviewed SHA-256 values:

| Candidate | SHA-256 |
|---|---|
| IMPLEMENTATION_CONTRACT.md | 8dae2c7460954495f87be285c35871c1d64e94e4385d7fedfd957b4b803dc38a |
| V5_CANDIDATE.sql | 220b39eae334e38e53198eae749e9524f4854ffce4a1023dd8e92e760e895dd2 |
| READ_PORT_CANDIDATE.md | 323b060ac8833454ffba66e01408f5611d9cffb80b9d3ee03119f390f3f31c24 |

These hashes identify the reviewed drafts, not their later corrected versions.
Draft ascending ordering and the one-million-page cap are superseded by C15:
submittedAt/id descending and the same bounded int offset rule as M04 queries.
The final read factory accepts the server owner context and one selected counter;
it validates current role before the M00 counter/session guard and returns an
opaque exact-transaction one-operation receipt. It must not call requireHuman
inside an outer transaction before taking new counter locks.

Approved the strict synthetic field schema/privacy acknowledgement, original
presence-sensitive encoding, module-owned public schema/MRN/submit endpoints,
public-reference-only completion, per-registration root/consent/temporary
feedback schema and grant parent FK. Source is synthetic; enabled demonstration
is restricted to development/synthetic/test. MRN matching never attests identity,
MRN or ward. No notification/chain tasks or hospital approval are implied.

Replay misses must release preliminary anonymous binding locks before the QR
owner prefix. Root/consent/grant consumption/audit/idempotency share one commit.
Rollback recovery reauthorizes and queries only, without automatically applying
the command again. Temporary feedback is bound to original context/fingerprint,
has at most five minutes and never exceeds the grant deadline; cleanup touches
only temporary rows.

M03 may now implement the reviewed V5, adapter, HTTP and frontend within existing
ownership and shared-file exceptions. It first supplies the exact read interface
and tests as a stable dependency checkpoint for independent review and M04 use.
All real MySQL/HTTP/browser and merged regression gates remain pending. No native
database migration, secret read, push or deployment was performed for this review.
