# M04 actual integration handoff draft

**Superseded scope:** the human stopped further automated tests and requested function delivery/manual testing. See [FUNCTION_HANDOFF.md](FUNCTION_HANDOFF.md) for the current delivery and class-report results. The former automated acceptance gates below are historical preparation, not outstanding instructions to start tests.

Current status: **USER_MANUAL_ACCEPTANCE_PENDING**, 2026-10-10. Coordinator inspected the gap source and function delivery. The human-authorized local merge proceeds without further automated fullverify/browser prerequisites; no new run is requested by this historical draft.

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

## Evidence limits after the scope change

| Item | Current evidence | Disposition |
|---|---|---|
| Current real mixed24 plus manual1 | Current class reports passed25,0fail/error/skip; final Maven exit unavailable | Earlier failed attempts preserved; no repeat run requested |
| Full backend verify/JAR | Previous partial dependency checkpoint133 passed; actual-dependency package/classpath used skipTests | NOT_RUN / USER_REQUESTED_STOP for the final actual full suite |
| Frontend126 and compatibility | Module and independent R2 runs passed; subsequent change is an English test comment | Existing evidence preserved; no repeat run requested |
| Real browser and layout/privacy evidence | Actual candidate NOT_RUN; previous19-browser receipt is synthetic | NOT_RUN / USER_REQUESTED_STOP; user handles manual acceptance |
| Resource cleanup | Exact test processes0, no TC/owned harness container, three owned ports unbound | Complete; no actual browser resource was launched |
| Local main integration | No known explicit production bug blocks function delivery | Coordinator wires FeatureSlot and merges locally under the human request; no automatic tests or push |

The former scheduling slot is closed for this task. No M04 Testcontainers/runtime/browser starts. No M05 launch, push, deployment, native database or environment-file access is included.
