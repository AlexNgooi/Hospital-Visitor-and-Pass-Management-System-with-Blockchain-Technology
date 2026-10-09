# Counter review · M04

- Inputs: planning/03 S01/R04/Q06, planning/04 C03/C04/C08/C09/C11, UI v4 S04/S05, and the existing M01 shared extension contract.
- Responsibility: authorized masked queues/details, explicit synthetic staff verification, reason-required rejection, stale/version conflict handling, and exact-handle recovery for unknown commands.
- Outputs: a FeatureSlot for `/staff/registrations`, runtime schemas, an injected ReviewPort, and local feature CSS. Shared app/lib/main/generated/dependency files remain owned by M01/coordinator.
- Verification: module component/client tests plus frontend test typing, build and lint. Test fixtures are explicit and synthetic; no fixture port is bundled as a production fallback.
- Boundary: M03 owns the real root/read adapter. Candidate read DTOs require coordinated integration. Approval means VERIFIED, without assignment, Pass ID, due time, notification, or external patient verification.
