# C13 registration review port — proposed Java contract

Status: coordinator approved C13 write direction; write interface and receipt rules implemented and tested. SQL adapter and masked read DTO remain pending. M03 owns the only root adapter. M04 references the reviewed same contract. Application baseline f59baf3, initial independent increment de7119e; document-only 01905a9 absorbed as 850a068. Exact contract delivery SHA is reported to the coordinator after commit.

The write contract below is independent of the pending identity/MRN input strategy. Masked read DTO field lists will be added once S-V1 is frozen; no alternate cursor wire is introduced. Queue wire remains page/pageSize/items/total/serverNow, page 0 by default, size 10 and maximum 50, stable submittedAt/id ordering.

[Implemented Java contract](../../../../backend/src/main/java/eduupm/hsaas/registration/RegistrationReviewPort.java)

The implementation keeps the approved public methods/records. The receipt uses a package-only capture factory and private constructor; the marker is generated internally rather than accepted as a constructor argument. consumeReceipt is package-only, requires exact READ_COMMITTED transaction identity before any SQL, and unbinds the resource immediately for one-use. Completion releases unused receipts. [Version bounds](../../../../backend/src/main/java/eduupm/hsaas/registration/RegistrationVersions.java) reject invalid versions and terminal increments.

Root adapter duties: bind the receipt to its unique transaction synchronization and resource, require that exact marker at recordDecision, invalidate it after one decision and after completion, compare re-read immutable counter/id, and refuse use in a suspended REQUIRES_NEW transaction. Root lock does not require SUBMITTED; the caller's second successful replay lookup must happen first. Only a new decision enforces SUBMITTED/expectedVersion and a conditional UPDATE. Invalid or suspended receipts are rejected before any SQL mutation.

M04 obtains binding/context from the framework Session, not JSON. If requireHuman is used for identity projection, call it before the outer write transaction. Within the write transaction use the full current lockOwners prefix, successful replay, root lock, second replay, decision, one local audit and one idempotency success. Root reads actor from the already guarded serverOwnerContextId and time from Clock; it verifies the owner/counter mapping without chasing a later counter lock. QR-specific 410 permission failures are mapped to review object 404 by M04; authentication 401 and role 403 stay distinct.

Source/source environment cannot be a caller choice. C09/SYNTHETIC_MANUAL applies only in allowed synthetic environments; mock MRN outcome never substitutes for staff confirmation. No attachment/note/raw form_data crosses this port.

Read signatures and fields remain a single follow-up addendum after S-V1: owner context must be server-derived, SQL joins current account/permission/counter state, and counterIds supplied by a caller alone cannot authorize reads. Raw form_data is never a read DTO or returned to M04 for generic rendering.
