# M00 API baseline, schema version 1

These are implemented foundation endpoints, aligned with coordinator C01–C03/C10. [openapi.json](openapi.json) is the machine-readable baseline; M01 owns generated clients and the same-origin Vite proxy. The local test API is not a deployed hospital service.

| Request | Access | Success | Failure contract |
|---|---|---|---|
| GET /api/health | public | 200 `{status:"UP"}` only after SELECT 1 | database unavailable: safe 503 |
| GET /api/public/csrf | public browser session | 200 `{headerName:"X-CSRF-TOKEN",token}`; persists stable binding | 429 throttling; 503 persistence/database failure |
| POST /api/auth/login | framework CSRF required | 200 `{id,login,role,counterIds}` after confirmed Session persistence; rotates session ID and CSRF | 400 invalid/unknown/duplicate fields; 401 generic credentials; 403 CSRF; 429; 503 |
| GET /api/auth/me | current human Session | 200 same minimal staff DTO, current permissions | 401 missing/expired/revoked/policy epoch changed; 503 database |
| POST /api/auth/logout | framework CSRF required | 204; durable capability revoke before Session delete | 403 CSRF; 503 if persistence fails, with revoke barrier retained |
| GET /api/public/config/registration | public | 200 minimal capability DTO | 503 if request Session persistence fails |
| GET /api/admin/integrations | current ADMIN | 200 same capability DTO | 401/403/503 |
| POST /api/admin/blockchain-proofs/{id}/verify or /retry | current ADMIN + CSRF | no successful mutation | 409 INTEGRATION_DISABLED; 401/403/503 apply first |
| /api/device/** or /api/integrations/** | closed machine surfaces | no provider/job mutation | 409 INTEGRATION_DISABLED before CSRF/endpoint processing; database/session faults can still fail 503 |

`id` and `counterIds` are decimal strings. Roles are exactly ADMIN or COUNTER_STAFF; ADMIN has no implicit staff access and gets an empty counter list. Account input accepts ASCII only; trims outer U+0020 spaces, then lowercases with Locale.ROOT. Canonical account is 3–64 characters, first `[a-z0-9]`, remaining `[a-z0-9._-]`; internal spaces/tabs/email/non-ASCII reject. Raw input cap is 256. Password is never trimmed or normalized; login requires nonempty input at most 72 UTF-8 bytes. Unknown/disabled account and wrong password all yield INVALID_CREDENTIALS. No signup/password reset/account CRUD HTTP endpoints are supplied.

Capabilities are `{schemaVersion:1,environment,readerMode,mrnMode,notificationStatus:"NOT_ENABLED",blockchainStatus:"NOT_ENABLED",auditStatus:"LOCAL_ONLY"}`. This is configuration, not a delivery/proof state. Counter/category/form business data is not supplied by this endpoint; M02/M03 own entry-specific configuration.

All errors use `{timestamp,status,code,message,correlationId,fieldErrors}` with UTC ISO timestamp and fieldErrors array of `{field,code,message}` (normally empty). Parser/filter errors do not echo rejected values, exception/SQL messages, secrets or tokens. Correlation IDs are server-generated and also returned in X-Correlation-ID. Responses have no-store/no-referrer; errors restore nosniff/frame denial after persistence-failure reset.

The sole optional `details` type is for 409 REGISTRATION_ENTRY_RESTART_REQUIRED: `{currentFormContext:{grantReference,bindingVersion},currentScope:{environment,counterId,categoryScope},requestedScope:{environment,counterId,categoryScope}}`. Counter/category database IDs are strings; categoryScope is nullable (null means the four-category scope), bindingVersion is a nonnegative safe integer ≤ 9007199254740991. No token, visitor name, form data or raw caller fields. M00 supplies/validates this shared type but implements no restart/exchange endpoint.

M01 sequence: GET csrf → POST login with returned header/token → GET csrf again → authenticated reads/writes → POST logout with current CSRF → GET csrf again for a new anonymous binding. Always use browser cookies via credentials include. On 401 invalidate cached account/form authority and bootstrap a fresh Session as appropriate; cookie loss never permits reconstruction from a reference. Failed saves do not release a buffered successful login or Set-Cookie. 503 is an uncertain command outcome, not evidence of business rollback; retain the original command key.

Staff/admin prefixes enforce role/current Session; future object controllers must enforce counter scope and return the specified 404 for missing/out-of-scope objects. M00 tests the role boundary with unavailable future paths; it does not claim those controllers are implemented. No CORS allowlist or caller-selected scope is introduced. Proxy cookie/CSRF forwarding and production HTTPS remain M01/M07 integration tests.
