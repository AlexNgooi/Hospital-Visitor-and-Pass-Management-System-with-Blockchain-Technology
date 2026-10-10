# M03 backend integration checkpoint

2026-10-10, Asia/Singapore. Isolated branch codex/hsaas-m03-visitor-registration, parent f5a9c7f. The source checkpoint is the commit containing this file. This is a candidate dependency for coordinator review and M04 integration, not complete M03 acceptance or a main merge.

## Included

Approved C14/C15 synthetic schema/strict parsed-original encoding; actual V5 per-registration root, PRIVACY_ACK and digest-only temporary feedback; root read/write SQL facets; server-only mock/manual hospital feedback; CSRF/session public schema/MRN/submit endpoints; 201 publicReference only; default-off/production-fail-closed wiring. The previously approved C13 six files and read two files remain unchanged.

Shared exceptions are limited to V5 migration count assertions in HsaasBackendApplicationTests and QrMysqlTests synthetic parent fixtures/cleanup. Original receipt, concurrent, rollback, audit and replay assertions remain. V1–V4 and M02 production source are unchanged.

## Executed validation

| Command in backend | Result |
|---|---|
| .\mvnw.cmd -B -Dtest=QrMysqlTests,HsaasBackendApplicationTests test | 52 PASS, no failures/errors/skips, exit 0, 08:14:07 +08; real temporary MySQL clean/upgrade and legacy regressions |
| .\mvnw.cmd -B -Dtest=RegistrationMysqlTests test | 11 PASS, no failures/errors/skips, exit 0, 08:19:42 +08 |
| .\mvnw.cmd -B verify dependency:build-classpath -Dmdep.outputFile=../frontend/output/playwright/m03-runtime-classpath.txt | 105 PASS, no failures/errors/skips, JAR/classpath built, exit 0, 08:24:20 +08 |
| .\mvnw.cmd -B -Dtest=RegistrationConfigurationTests test | 4 additional PASS, no failures/errors/skips, exit 0, 08:26:19 +08; default-off, production rejection, missing real QR dependency, mock/manual status cases |

The 105-test full run includes the NFC regression: 300 raw UTF16 units normalize to exactly 100 codepoints and pass; 101 rejects; original composed/decomposed request encoding differs. Public parsing is bounded at 8192. Original control/FORMAT values are rejected before strip.

The 11 live MySQL scenarios cover four categories/minimal receipt, original-context/schema/CSRF/privacy invalid input, successful replay after consumed/revoked/expired grant with current anonymous authority, changed body/different key, competing identical/different commands, real parent FK and audit rollback, mock feedback digest/fingerprint/context/field binding without staff verification, timeout/expiry/manual deferral/cleanup, actual grant-create/root-write/read receipt REQUIRES_NEW SQL-zero rejection and outer resumption, masked single-counter/history/manual metadata/current role/permission/session, reference deactivation serialization and public staff-cookie requests without owner renewal.

Initial MySQL run had two fixture expectations corrected: shared write errors return 503; internal SessionMetadata checks persisted EXPIRY_TIME. The added configuration runner initially treated InitializingBean as SQL and lacked QR for its production test; fixed fixtures permit only afterPropertiesSet and supply an explicit mock QR solely for production guard coverage. These are recorded failures, not skipped cases.

## Enablement and lock contract

For an isolated owned database, explicitly enable hsaas.qr.enabled with origin/keyring and hsaas.registration.enabled=true, environment test/development/synthetic, mrn-mode mock/manual, all unavailable integrations disabled; use explicit hashing key/version. Missing QR fails startup and production registration is refused. Do not enable this against the developer .env/native database.

New submission: initial anonymous-guarded replay in its own completed transaction; complete M02 account/counter/binding/owner/display/context/grant prefix; second replay; active category FOR SHARE then active destination FOR SHARE; root insert/ack; exact grant consume; local audit; idempotency. Reference configuration writers may deactivate rows in their own transaction, but must not hold a reference lock then call back into grant/root workflows. Unique conflicts fully roll back and perform guarded query-only replay.

M04 uses this sole RegistrationStore through stable C13 and read facets. M04 owns staff outer authority, current-account locking, command hashing, audit, idempotency and HTTP; this checkpoint does not claim M04 endpoints or M04 full E2E have passed.

## Still in progress

M03 UI/real-browser/full handoff; M04 actual service/HTTP/E2E integration and coordinator independent review. Hospital live formats/API, physical reader/cards, production HTTPS/camera, notifications and blockchain remain NOT_RUN/disabled. No push, main merge, native database or developer secrets were used.
