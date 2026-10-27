# R01 authorized staff comparison — 2026-10-27

- Existing masked queue/detail and explicit manual evidence remain the default. Production ReviewPort adds reviewFields POST with expected version/current authority/CSRF; raw fields are parsed independently and never included in normal detail.
- Explicit Reveal/Hide controls show a bounded old/new schema field list, requested locations, synthetic patient snapshot and separate pass terms/time. No raw data in browser storage, idempotency commands, URL, logs or report state.
- Selection, authorization refresh/loss, changed version, stale queue, conflict and unmount fence pending requests and clear sensitive memory. Mock feedback never prechecks identity/MRN/ward confirmations. Necessary frontend build/lint only; all browser/business/test execution NOT_RUN.

# Counter review · M04

- Inputs: planning/03 S01/R04/Q06, planning/04 C03/C04/C08/C09/C11, UI v4 S04/S05, and the existing M01 shared extension contract.
- Responsibility: authorized masked queues/details, explicit synthetic staff verification, reason-required rejection, stale/version conflict handling, and exact-handle recovery for unknown commands.
- Outputs: a FeatureSlot for `/staff/registrations`, runtime schemas, an injected ReviewPort, and local feature CSS. Shared app/lib/main/generated/dependency files remain owned by M01/coordinator.
- Verification: module component/client tests plus frontend test typing, build and lint. Test fixtures are explicit and synthetic; no fixture port is bundled as a production fallback.
- Boundary: M03 owns the real root/read adapter. Candidate read DTOs require coordinated integration. Approval means VERIFIED, without assignment, Pass ID, due time, notification, or external patient verification.
- UNKNOWN recovery: an explicit retry's 4xx is not proof that the original write never committed. Preserve the original handle/key/body/version, block new commands and retain recovery after GET. Current access loss clears cached details and denies interaction; actor/counter changes unmount the workspace rather than carrying old handles into another scope.
