# M06 administration boundary

- Inputs: planning/03 A01-A04/D, planning/04 C12/C18-C20, planning/14 coordinator decisions; immutable M00 AccountChanges/SessionCapabilities and M05 V6 settings.
- Responsibility: ADMIN account/reference/settings commands and bounded local audit reads. The server session supplies all authority; ADMIN never implies COUNTER_STAFF.
- Outputs: /api/admin/users, categories/destinations/counters, settings, audit-events; V7 administration_history and report_exports. No deletes, password response, provider job or raw visitor payload.
- Transaction order: empty READ_COMMITTED outer transaction delegates account/permission changes to M00 first, then appends reason/history before the same commit. User changes preserve identity gate -> sorted principals -> capability; permissions preserve principals -> counter/permission -> capability. Counter edits use M00 counterActive then name in that same transaction. Other reference/settings writes are principal -> current binding/context -> reference/setting. No callback to QR/registration/assignment while holding references.
- Snapshot discovery is nonlocking and expected-version validation precedes history commit. History only records role/active, grant active, reference code/name/active or setting key/integer. No request/entity serialization or secrets.
- Verification: package with tests skipped, four focused reporting security/date checks, frontend build/lint. SQL/concurrency execution remains NOT_RUN while disposable Docker is unavailable; never fall back to native DB.
- Manual review: last active admin concurrency, old-session denial after role/grant/status mutation, version conflicts, reference history and unchanged old due_at.
