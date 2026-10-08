# M00 resolved decisions and retained boundaries

Source: human M00 development approval recorded in planning/12 (2026-10-08), and direct technical exchanges with coordinator chat 01a11b84-212d-7273-93a5-5dc16c698bdb. These replies do not authorize another module, external deployment or native database changes.

| Decision | Resolution applied |
|---|---|
| Package/dependency baseline | Retain eduupm.hsaas; Spring Boot 4.1.1, Java 21. M00 owns backend dependencies/config/common. |
| C01/C02/C03 | Minimal me/login IDs and counter IDs as decimal strings; one role; framework CSRF; safe filter/controller errors; ADMIN does not inherit staff. |
| Migration allocation | M00 V1–V3 reserved; later owners request fresh numbers from coordinator. No QR/provider tables in this batch. |
| Session engineering defaults | HSAAS_SESSION cookie; request idle 30m, staff absolute 8h, anonymous absolute 24h, pending activation 1m. O07 hospital approval remains pending. |
| First admin | Explicit offline/interactive one-shot bootstrap, no Web/default/admin seed, singleton serialization and mandatory local audit. Real execution not authorized/run here. |
| C10 details scope | environment server-defined; counterId string; categoryScope nullable category DB ID string, null = four-category scope; bindingVersion ≤ 2^53−1. |
| C11 command encoding | Explicit ordered DTO schema and missing/null semantics; UUID v4 key namespace; independent versioned HMAC key ring; safe success retention 24h, current auth before replay and locked recheck. |
| C12 Session guard | User → counter → binding → context prefix; pre-save validation may revoke but cannot activate/renew; all locks release before framework save, then REQUIRED confirmed hook. |
| JPA/JDBC manager | Coordinator approved JpaTransactionManager on explicit same DataSource; real single connection/READ_COMMITTED/flush+rollback proof required and completed. No NESTED; isolated framework save only outside domain locks. |
| Entry signing direction | Nimbus 10.10 actual dependency compatibility for fixed HS256, ≥32-byte key. Strict entry parsing/key ring/lifecycle belongs to M02; Session login remains Spring Session. |

No unresolved foundation contract blocks this handoff. Limits needing later owners: M01 real proxy/login integration; M02 complete QR/domain race tests and entry key management; M06 password/account administration routes and production recovery; M07 full deployment, backup/restore, distributed limits/performance. Reader/live MRN/WhatsApp/blockchain remain deferred/disabled. No startup of unapproved modules is implied by this handoff.
