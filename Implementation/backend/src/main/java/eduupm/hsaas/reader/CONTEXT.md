# M05 trusted synthetic reader

ReaderPort separates a trusted adapter Reading from browser commands. SyntheticReader exposes 48 fixed samples (four categories, serial 001-012); profile/category/UID come only from the server mapping. It is wired only by explicitly enabled M05 lifecycle configuration in synthetic/test with reader-mode mock. Physical devices and /api/device remain disabled and deferred to M08. Scans retain actor/owner/counter/purpose/target/nonce/lease/expiry binding in assignment persistence.

Do not accept caller UID, source, profile or category as scan evidence. No machine credentials or external integration are introduced. Parent backend/assignment CONTEXT and M05 HANDOFF define checks and locks.
