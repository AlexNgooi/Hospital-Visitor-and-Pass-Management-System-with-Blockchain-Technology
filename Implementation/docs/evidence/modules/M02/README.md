# M02 dynamic registration entry

The staff Registration QR page displays a locally encoded, server-signed entry. A display's UTC creation time anchors fixed 30-second slots; each challenge expires 45 seconds after its slot starts. Reading late cannot extend a screenshot's expiry. Challenges are created lazily under a display lock. Several visitors can exchange the same challenge for separate browser-bound grants.

Grants last 20 minutes absolutely. Rotation/natural challenge expiry does not close an existing form. Same canonical environment/counter/category scope reuses a valid grant without changing its source or deadline. Different scope requires confirmation. Confirmation atomically revokes the old grant, records the exact replacement link and changes the single current-form pointer. Cancel and invalid/expired new challenges preserve the old grant. Old tabs retain their original context and input; they disable the form when recovery discovers a different context. Explicit adoption rechecks the proposed context and starts a fresh form.

M02 provides entry authority and a transaction port for M03. The current public page accurately says visitor fields are not available and no application was submitted. No visitor-registration aggregate, MRN lookup, review, pass/card issuance or receipt QR is implemented here. QR possession cannot prove physical presence.

## Configuration

QR is disabled by default. GET `/api/public/registration-entry/capabilities` reports only `{enabled:false}`; stateful entry/display routes return 409 `INTEGRATION_DISABLED` and do not write QR rows. Foundation login remains usable without QR secrets.

To enable a deployment, supply these explicit backend properties through its controlled environment/configuration:

| Property | Meaning |
|---|---|
| `hsaas.qr.enabled` | `true` |
| `hsaas.qr.origin` | Exact trusted HTTPS origin serving `/register`; never derived from request Host/forwarded headers |
| `hsaas.qr.active-key` | Identifier of the signing key, 1–64 ASCII letters/digits/underscore/hyphen |
| `hsaas.qr.keys.<identifier>` | Standard Base64 of at least 32 cryptographically random bytes for every retained key |

Only explicit foundation `development`/`test` allows HTTP on localhost/127.0.0.1/IPv6 loopback. Enabled configuration with missing/invalid keys or origin fails startup. There is no fallback secret. Keys stay backend-only. Configuration and exchange request `toString()` redact their secret/token values.

Rotate by deploying the old and new keys together, selecting the new active key, and retaining every old key until its last unrevoked challenge has expired in server UTC. Startup compares live challenge key versions against the configured keyring and refuses early removal. Keep the same retained keyring on every serving instance. This implementation does not provide an operator key-management UI or a distributed deployment rollout.

## Migration and API

Flyway V4 adds display sessions, challenges, grants and one context pointer per stable anonymous scope. V1–V3 are unchanged. V4 SHA-256: `05c0dae3fe31d93ecc63845932cc66e585afda44c5acac2f827e11c2c88fe4d8`.

V4 grants have paired nullable `replaces_grant_id`/`replaces_binding_version` and unique `(anonymous_scope_id,replaces_binding_version)` for non-null replacements. `registration_id` is unique and paired with `consumed_at`; its future FK belongs to M03's migration after that aggregate exists. Do not edit applied migrations or manually clear rows to repair checksum failures. Back up and apply through the normal deployment procedure; no production/native developer database was migrated for this evidence.

The checked module [OpenAPI](openapi.json) is generated from actual controller mappings/record DTOs. It does not replace M00's authoritative artifact or M01's generated client. Generate with `./mvnw -B -Dtest=QrOpenApiTests -Dm02.generateOpenApi=true test` from backend; normal verify compares the checked artifact. IDs stay decimal strings, timestamps are UTC with six fractional digits, bindingVersion stays a JavaScript-safe integer. CSRF is required for writes; only COUNTER_STAFF can operate its currently authorized counters/displays. All authority is resolved from server session/domain rows.

## Local verification

From backend run `./mvnw -B verify` with Docker available. Testcontainers uses disposable MySQL 8.0.45; no `.env` or native DB is read. From frontend run `pnpm test`, `pnpm typecheck:test`, `pnpm build`, `pnpm lint`, `pnpm test:proxy`.

For the real browser harness, first package backend while no harness holds its JAR, then run `./mvnw -B dependency:build-classpath -Dmdep.outputFile=../frontend/output/playwright/m02-runtime-classpath.txt`. From frontend run `node tests/registration-qr/harness.mjs`, then Playwright CLI `-s=hsaas-m02-real open http://127.0.0.1:15292/login` and `-s=hsaas-m02-real run-code --filename=tests/registration-qr/browser.js`. The harness rejects inherited Spring/JVM injection before resources start, uses an OS/runtime allowlist, random test-only key and disposable synthetic records. Ports 18292/15292/15293 are its own loopback resources; existing listeners cause refusal. Stop through POST `http://127.0.0.1:15293/stop`; cleanup verifies the exact owned Docker ID/label. Never stop port 5173 or another user's process.

Browser screenshots mask QR pixels. Receipts contain checks/status paths only, never cookies, token URLs or form references. PNG generation is decoded with jsQR in the component test. Browser payload-change observation checks the actual next server slot. Physical phone camera scanning, production HTTPS, production retention/load testing and M03 end-to-end submission are NOT_RUN.

The exchange limiter is bounded in-memory per process: 30/binding/minute, 300/socket/minute, maximum 10,000 buckets. It uses trusted socket/binding coordinates, never caller forwarding headers or token contents. Multi-instance throttling and reverse-proxy policy remain deployment work. No QR cleanup scheduler exists; expiry is checked on every use and does not depend on cleanup. Retention deletion must respect domain foreign keys and downstream history.
