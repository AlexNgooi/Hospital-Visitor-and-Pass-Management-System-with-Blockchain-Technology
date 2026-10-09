# Counter review contract · M04

- Inputs: planning/03 S01/R04, planning/04 C03/C04/C08/C09/C11, and the M00 audit/idempotency ports.
- Responsibility: strictly parse review commands and encode explicit versioned requests. M03 owns the registration aggregate, sole C09 evidence predicate and persistence adapter; M04 references its reviewed contract.
- Outputs: strict command types/encoding, bounded duplicate-preserving GET query validation, and default-off POST orchestration/configuration. No registration entity, migration, mock production repository, card assignment, notification, or external verification is provided here.
- Verification: targeted ReviewCommandsTests, imported root contract tests and backend verify. Pure tests do not prove MySQL review transactions or HTTP authorization.
- Integration: `hsaas.review.enabled=true` requires the reviewed M03 root adapter; default remains absent. C14 resolved S-V1 to DEMO-only inputs; GET projections, opaque authorized scope and real MySQL review validation await the approved M03 checkpoint. A validated query selection grants no root authority. Current authority must precede parsing/replay; a uniqueness loser only reads its winner in a new transaction. English comments describe business and security constraints.
