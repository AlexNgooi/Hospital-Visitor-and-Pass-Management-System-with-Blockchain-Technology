# M04 remaining dependency work

Source: `03eca76ba860f0e0c5590006a8137a493c1d4d6f`. Questions/progress were sent directly to coordinator; no user copying or new module permission is required.

| Item | State / owner | Effect / next action |
|---|---|---|
| M03 ownership and root write receipt | RESOLVED by C13; M03 owns one interface/adapter | Six reviewed contract files are pinned. Do not copy an unreviewed adapter or maintain another predicate. |
| Manual approval / rejection vocabulary | RESOLVED by U03/C09 | Reuse SyntheticReviewRules. Mock MATCH is never sufficient. No free notes/attachments. |
| Staff role/counter/404 | RESOLVED by C03/C13 | Current role/session/counter authorization precedes replay; invisible objects use 404 NOT_FOUND. |
| Duplicate-key recovery | RESOLVED by coordinator / C13 | Entire failed transaction rolls back; a new authorized transaction reads the same namespace/body/key only. Miss stays conflict; no automatic reapply. |
| S-V1 identity input strategy | RESOLVED by C14, 2026-10-10 | Coordinator reports the explicit human DEMO-only choice: TEST_ID `DEMO-` and MRN `DEMO-MRN-`; formal hospital formats are future work. |
| Root masked GET projection and real adapter | PENDING M03/coordinator checkpoint | Exact existing frontend wire and opaque scope requirements were sent to coordinator. M04 implements strict query preparation and integration test design, without duplicating root SQL/interfaces. |
| Shared FeatureSlot registration | PENDING coordinator/M01 | M04 exports its slot; main.tsx/app/lib were not edited. Integrate after the required real contracts and bounded review. |
| Actual M04 SQL/HTTP/permission/concurrency/E2E | NOT_RUN until root/read integration | Imported contracts and mockroot transaction counters do not prove SQL durability. Preserve the same module permission for the follow-up. |

Real hardware, live MRN, WhatsApp and blockchain remain deferred/disabled. The current independent work adds no card assignment, pass reference, deadline or external jobs.

2026-10-10 follow-up: independent checkpoint review passed; full M04 remains IN_PROGRESS. The C14 planning snapshot `376233b` was imported selectively as `0c37139`, excluding coordinator-owned M03 REVIEW to avoid overwriting review history. See [INTEGRATION_TEST_PLAN.md](INTEGRATION_TEST_PLAN.md) for the exact real integration matrix and honest NOT_RUN boundaries. Continuing permission covers this follow-up without another user request.
