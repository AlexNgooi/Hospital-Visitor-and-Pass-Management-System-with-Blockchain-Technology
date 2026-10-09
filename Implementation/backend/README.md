# M00 backend foundation

Java 21, Maven Wrapper, Spring Boot 4.1.1; package `eduupm.hsaas` is retained. API contracts and test evidence are in [M00](../docs/evidence/modules/M00/HANDOFF.md). This foundation supplies login/CSRF, current authorization, database readiness, closed integration modes, local audit/idempotency and capability ports. Registration/QR/card/reporting workflows belong to later modules.

## Test and package

From this directory, run `.\mvnw.cmd -B verify`. Docker must be available. Tests start `mysql:8.0.45` on a random mapped port, override every datasource credential and do not import `.env`. Fixtures, root access for the migration probe, failure triggers and database pause are confined to that disposable container. A Docker failure fails the test; there is no H2 or native-database fallback. `target/` reports and JARs are ignored.

## Run

Provide `HSAAS_DB_URL`, `HSAAS_DB_USER`, `HSAAS_DB_PASSWORD` in the process environment, then run `java -jar target/hsaas-backend-0.0.1-SNAPSHOT.jar`. Default port is 8080 (`HSAAS_PORT` can override). Production cookies require HTTPS. The application does not trust caller `Forwarded`/`X-Forwarded-*` headers; deployment proxy/HTTPS acceptance is a separate integration gate.

For explicitly local HTTP development, add `--spring.profiles.active=local`. The tracked `application-local.yaml` contains no secret and is the only profile importing `optional:file:./.env[.properties]`; it binds `127.0.0.1`, sets development mode and allows a non-Secure cookie. Local defaults are `jdbc:mysql://localhost:3306/hsaas_db` / user `hsaas`; a password is still required. `.env` is untracked Java Properties syntax (no shell quoting; escape backslashes). Never copy a developer `.env` into another checkout or attach it as evidence.

Flyway runs V1–V3 and validates checksums; Hibernate only validates the schema. The database must already exist. Use a controlled migration-capable principal for initialization and review production grants separately. No migration seeds a staff credential or hospital reference catalogue. Do not automatically baseline an existing database, repair mismatches, clean schemas or edit applied SQL; see [migration ledger](../docs/evidence/modules/M00/MIGRATIONS.md).

## First administrator

Normal Web startup does not create users. With an explicitly selected empty application database and an interactive console, the one-shot command is `java -jar target/hsaas-backend-0.0.1-SNAPSHOT.jar --spring.main.web-application-type=none --hsaas.bootstrap.enabled=true` (append the local profile only for local development). It prompts for a canonical staff account and a non-echoed password, closes its context after success, and exposes no HTTP bootstrap route. Password must have at least 12 characters and at most 72 UTF-8 bytes; no default or command-line password is supported. Noninteractive/Web execution fails. The policy singleton plus bootstrap singleton serialize concurrent attempts; existing users or completed bootstrap reject another initialization.

No real database/bootstrap was run by M00. Console interaction is NOT_RUN; the service, concurrent synthetic initialization and no-console failure were tested. Recovery of a populated account database requires a separately reviewed recovery action: do not reset bootstrap_state, delete users or insert plaintext passwords as a shortcut.

## Security and command configuration

Cookie `HSAAS_SESSION` is HttpOnly, SameSite=Lax, Path=/, host-only and browser-session scoped. Request idle defaults to 30m; staff absolute is 8h, anonymous identity absolute 24h, pending activation 1m. These engineering defaults are not hospital O07 approval. Normal staff polling can refresh the confirmed owner idle deadline; public anonymous traffic under `/api/public/**` cannot activate or renew a staff owner even with the same signed-in cookie. Public Session saves retain all validation and persistence-failure behavior. Absolute deadlines never refresh.

Frontend uses a same-origin `/api` proxy, `credentials: include`, framework CSRF bootstrap and `X-CSRF-TOKEN` on writes. Refetch CSRF after login/logout; do not cache it or cookies in localStorage. Login failure, session save failure and database outage return safe JSON; a 503 may follow a committed business command, so preserve its original command key and retry only under that domain's idempotency protocol. See [API baseline](../docs/evidence/modules/M00/API_BASELINE.md).

Commands using idempotency require independent Base64 secret material of at least 32 bytes via `IDEMPOTENCY_HMAC_KEY` and a safe `IDEMPOTENCY_KEY_VERSION`. No secret is generated as a fallback. Missing keys leave ordinary auth available but hashing fails closed with 503. Retained versions use private `hsaas.hash-keys.<version>` properties; keep old keys for all retained results (24h) plus bounded in-flight work. Key loss prevents replay validation. Hash inputs/raw request bodies are not stored. Entry signing keys must be independent; their key ring, strict token parsing and lifecycle are M02-owned. M00 pins Nimbus 10.10 and proves HS256 compatibility only.

Defaults: reader disabled, MRN manual, notifications/blockchain disabled. Reader mock is allowed only in synthetic/test; live modes and enabled providers fail startup. Disabled device/integration paths reject 409 before a provider/job mutation. No outbox, notification worker or historical backfill is created. In-memory login throttling is bounded and per instance; distributed throttling is required before multi-instance exposure to untrusted traffic.

## Transaction and downstream integration

One `JpaTransactionManager` explicitly shares the DataSource with JdbcTemplate. Use the provided REQUIRED/READ_COMMITTED domain template, or equivalent isolation declared on the outer service. `LocalAuditPort` and `IdempotencyPort` require an existing transaction. Do not use JPA NESTED/savepoints or swallow uniqueness failures; roll back the whole command and retry in a fresh transaction.

Take the complete security lock prefix before QR/business locks; see [session spike](../docs/evidence/modules/M00/SESSION_SPIKE.md). JPA owners must discover IDs without authority, lock/re-read current rows, avoid stale first-level-cache claims (refresh/clear or deliberate JDBC current projections), flush business changes before their dependent JDBC writes, and keep audit/idempotency in the same transaction. No external calls or framework session writes may run while these locks are held. Account/password changes must advance security_epoch; M06 must use guarded mutation ports and add its own approved password-change implementation.
