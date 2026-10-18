# M07 documentation boundary

Inputs: `../../../../../planning/14_M05_M07_COORDINATION.md`, requirements 03, architecture 02, data/API 04, risk register 05, module M00–M06 HANDOFF/REVIEW, and the exact locally merged source. Historical planning text does not override the 2026-10-18 authorization.

Responsibility: prepare truthful user-run startup, acceptance, recovery and release evidence. No business implementation, service startup, broad automated QA, browser acceptance, native database operations, push or deployment.

Outputs: this module's evidence and new documents in `../../../runbooks/`: `MANUAL_M00_M07.md`, `MANUAL_ACCEPTANCE_M00_M07.md`, `RELEASE_MANIFEST_M00_M07.md`. Coordinator owns final integration and REVIEW.

Validation: review source references, links, requirement coverage, command comments, Git diff whitespace and exact release SHAs. New business/recovery checks stay NOT_RUN until actually executed. M05/M06 merges and checked runtime761491e are recorded in the coordinator-owned COORDINATOR_CHECKS.md; M07 reads that receipt without editing or independently reproducing it. HANDOFF records final delivery; PREPARATION is historical. Do not recast source/build review as manual acceptance or self-approve the coordinator merge.
