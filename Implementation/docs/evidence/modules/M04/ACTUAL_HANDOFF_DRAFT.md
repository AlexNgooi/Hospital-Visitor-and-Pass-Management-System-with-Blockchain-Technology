# M04 actual integration handoff draft

Status: **IN_PROGRESS / NOT FINAL ACCEPTANCE**, 2026-10-10. Coordinator has inspected current gap-test source; corrected actual25, full backend and actual browser acceptance remain pending. This draft is review preparation and does not request merge or transfer unfinished work as complete.

## Exact candidate

- Branch/worktree: `codex/hsaas-m04-counter-review`, `C:/Users/alexy/.codex/worktrees/hsaas-m04-counter-review/FYP Dev`.
- Review runtime and R2 UI: `4b7fca6cf3889f4c7220cc826b4e1fc1909b3797`; current gap-test/comment source: `6477dcd5fdf9f45a5b650b0913b11e533315c040`.
- Approved actual M03 dependency869c6cb imported as a99a91d; approved Unicode dependency8623e7c imported as b3b5a0b. Exact full hashes and historical contract pins are preserved in [ACTUAL_INTEGRATION_PROGRESS.md](ACTUAL_INTEGRATION_PROGRESS.md) and [GET_HANDOFF.md](GET_HANDOFF.md).
- Evidence727114f8f1bf04d757aab2bbdf5ab95a0fc9c8b8 records actual failed intermediate attempts. This draft's delivery changes documentation only.

M04 owns review orchestration, masked review frontend, module tests/harness and evidence. M03 owns the root aggregate, SQL/V5, hospital adapter and read/write facets. Shared FeatureSlot wiring, configuration, coordinator REVIEW and main merge remain coordinator duties. Continuing module permission already covers implementation, repairs and tests.

## Review behavior

Strict protected GET and POST use actual current server session/role/counter authority. Reads use the approved one-operation root scope and return masked typed data; writes serialize the authorization prefix, root decision, audit and successful idempotency result. Replay is authorized against current permissions. Actual1062 recovery rolls back first and only reads a successful winner in a new authorized transaction; it cannot reapply the root or generate a new key.

Synthetic Penjaga requires three explicit human checks even after mock MATCH. MRN manual mode returns UNAVAILABLE without a verification token. Safe rejection reasons are required; free notes, client actor/time/source and external verification claims are unavailable. Identity/MRN remain approved DEMO-only inputs.

After acknowledgement uncertainty, the UI retains the original command key/body/version through failed recovery4xx and GET refresh. Actual access loss hides cached details; changing actor/counter remounts the workspace. A fixed late framework-session-save503 can be classified only after durable SQL winner assertions, with its exact safe envelope and denial of the revoked session's original replay.

## Acceptance gates still open

| Gate | Current evidence | Required completion |
|---|---|---|
| Current real mixed24 plus manual1 | Prior targeted25 had4 setup errors; subsequent focused5 passed4 and failed the original late-ACK expectation | Rerun corrected25 together; preserve genuine failures and inspect any new defect |
| Full backend verify/JAR | Previous partial dependency checkpoint133 passed; latest actual dependency package/classpath used skipTests | Run final fullverify against frozen actual source; record actual total and timestamp |
| Frontend126 and compatibility | Module and independent R2 runs passed; subsequent change is an English test comment | Record exact final-source applicability; rerun only when required by final changes/review |
| Real browser and layout/privacy evidence | Candidate NOT_RUN; previous19-browser receipt is synthetic | Run owned actual harness, original-key recovery with real403, four categories, conflict and current revocation; inspect masked screenshots and sanitized receipt |
| Resource cleanup | No owned runtime active while waiting for slot | After runtime, await exact child exit, confirm owned container removal and ports18404/15414/15415 absent, close only dedicated browser |
| Independent review/main integration | Bounded earlier checkpoints and R2 were independently accepted | Coordinator verifies final actual evidence, wires FeatureSlot, performs local merge and main revalidation |

The coordinator will explicitly release the SQL/browser slot after M03 and independent browser cleanup. Until then, no M04 Testcontainers/runtime/browser starts. No M05 launch, push, deployment, native database or environment-file access is included.
