# M07 historical preparation checkpoint

This records the earlier dependency wait, not the current delivery status. M05/M06 were later merged and the coordinator resumed M07; final source/check boundaries and documentation delivery are in [HANDOFF.md](HANDOFF.md).

Date: 2026-10-18, Asia/Singapore. Status: WAITING_FINAL_M05_M06. This is not final HANDOFF or approval. The coordinator explicitly instructed M07 to finish this preparation turn and wait for an active message after M05/M06 merge and necessary checks; no polling or fabricated final completion is required.

- Chat: `01a14da7-806e-7ca2-98cb-6c342806f2e3`; current coordinator `01a14da5-91fe-7bf1-a120-183975085f8b`, host local.
- User's 2026-10-18 authorization grants this documentation module; AGENTS and planning/14 expressly authorize progress/questions/HANDOFF messages to current coordinator. No message goes to the old coordinator.
- Own worktree: `C:/Users/alexy/.codex/worktrees/7a60/FYP Dev`; initial detached clean HEAD `d103b888527c4ba8e90f37d93059daf2d78ed02f`; isolated branch created `codex/m07-manual-release` before writes. No second repository or secret copying.
- Read root AGENTS/CONTEXT; Implementation/docs/runbooks contracts; planning/README, 02,03,04,05,09,13,14; latest M00–M04 REVIEW and relevant M03/M04 HANDOFF; existing MANUAL_M00_M04; actual M04 launcher/seed/environment and application config. Older instructions are historical where superseded by the latest human authorization.
- Coordinator accepted the three new runbook paths plus own evidence. Main/planning/shared frontend and business code remain coordinator/module owners. No shared changes, API, migration, state, permission, lock order or dependency changes by M07.

## Work prepared

Forty user-executable cases cover QR entry and all four DEMO categories, manual review, SIMULATED inventory/scans/issue/received-confirmation/return, active uniqueness, overdue/internal reveal/followup, lost/restore, admin account/version/settings/report/export, UNKNOWN/current authority, privacy, recovery and keyboard/mobile checks. Every new business result is NOT_RUN. Requirement coverage explicitly retains deferred/live and performance/UAT gaps.

Manifest preserves source-specific historical results without claiming current combined PASS. Immutable V1–V5 Git blobs were read from baseline; no database was contacted or migrated. Startup draft marks missing final facts and does not invent enable flags, schema, seed fixtures or release SHAs.

## Open integration input reported to coordinator

The old M04 launcher explicitly sets READER_MODE / hsaas.reader-mode disabled, has no lifecycle/admin flags, only two same-counter staff and one ADMIN, and always deletes its temporary database on stop. Its control endpoints can install audit fault SQL and revoke staff. Its HMAC/QR material lives only in memory. Reusing it unmodified is not a full M00–M07 startup or persistent restart/restore path.

Proposed dedicated user launcher owned by coordinator: isolated labeled container and loopback ports, classpath-only sanitized child environment, exact M05/M06 enablement, real `/login` entry, synthetic account/reference/device seeds, no fixture-fault controls, precise owned cleanup, and explicit backup/retained-DB/restart/independent-restore procedure with protected key version mapping. No program is implemented or run by M07.

Coordinator accepted ownership of `Implementation/scripts/manual-demo.mjs` + `ManualDemoSeed.java`: proposed web15417/backend18407/control15418, isolated `hsaas-manual-m00-m07` container, `hsaas_manual_m00_m07` database, `manual_demo` user; sanitized test/mock/mock/disabled/disabled environment; start/stop/backup/start --restore directory; backups include matching HMAC/QR keys and dump under ignored Implementation/tmp/manual-demo/backups. Stop deletes the original container, backups remain separately. Actual script must be reviewed before final commands are published. Public synthetic accounts demo_staff_a/b counter1, demo_staff_other counter2, demo_admin_a/b ADMIN; public demo password is documented only for this disposable environment. M05 confirmed lifecycle flag, fixed48 sample mapping and same-issue-counter return restriction. Inventory must use actual ADMIN ENROLL, never seeded assignments or lifecycle events.

Pending final inputs: exact M05/M06 reviewed and merge SHAs, final source with feature wiring, V6/V7 filenames/blobs, actual routes/modes/seed profiles/devices/permissions, due/scheduler/lost rules, report definitions/export bound, check commands/time/exit and startup/stop/backup entry. Planning/14 C18/C19 were read from main as preparation facts: default return_hours four categories24 with1..720 range; new assignments freeze rule and old due_at stays; report overdue can derive active/due independently of scheduler; export bound10,000 with rejection rather than truncation. Actual final code must still be checked after merge.

## Validation boundary

Only source/document review and Git whitespace/link/identity checks are appropriate for this documentation-only lane. Backend/frontend compile, package, test suites, business/browser/UAT/performance, real device/provider/chain and restore are NOT_RUN by M07. No service/container was started; no native DB, .env, remote, push/deployment, main merge or future module was touched. Coordinator supplies any actual integration-check results at finalization.

## End-of-turn preparation facts

The proposals above describe the initial checkpoint. Coordinator subsequently implemented the dedicated launcher in `f7b3e490b59061ae6946beae9b3ad1137004e21a`, restore revocation in `182cd80825a3dac17f772d51227bc14d9c7945cb`, and startup signal cleanup in `0c99d38ad40a630f77288cf99a2dd5d8f71b4b0e`. These commits were absorbed into this isolated branch through merges from main, not authored by M07. Only the five M07 documentation files are this module's authored change relative to coordinator main.

M07 source review identified two concrete launcher gaps and reported them to coordinator: restore could resurrect old session/QR/scan authority; SIGINT/SIGTERM during startup could skip owned cleanup. Coordinator supplied the above corrective commits. M07 reviewed the corrections statically and documented the actual strategy, private backup commands, exact container label and strong-termination limitation. Actual startup, restore, signal/failure execution and RPO/RTO remain NOT_RUN. Final scan CHECK compatibility must still be compared to merged V6.

Current docs include40 NOT_RUN cases, all33 requirement IDs from planning/03, and an optional four-category expected ledger for user report reconciliation. The ledger is a design expectation, not a result. Local Markdown targets and staged whitespace were checked with no missing targets or whitespace errors. All newly added command comments are English. Historical SHA/scope evidence remains separate.

Remaining work after coordinator wakes this chat: absorb exact merged source, read M05/M06 final HANDOFF/REVIEW, reconcile V6/V7 and enablement/routes/report/due/lost rules, replace draft markers with source-verified facts, record actual build-check evidence and NOT_RUN limits, write final HANDOFF and send precise committed head for coordinator review. Do not merge main or mark business/manual acceptance PASS.
