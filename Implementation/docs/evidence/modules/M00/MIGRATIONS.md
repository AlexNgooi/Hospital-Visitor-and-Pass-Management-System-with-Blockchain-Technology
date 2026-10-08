# M00 migration ledger

Coordinator allocation: V1–V3, owner M00. Locations are `Implementation/backend/src/main/resources/db/migration/`. Later module owners request the next version; they must not reuse these numbers or add QR/provider tables into this batch. The baseline contained no committed migration SQL. No native developer/hospital database history was inspected or modified during this implementation.

| Version / file | Purpose | Seed/upgrade effect |
|---|---|---|
| V1__foundation_identity_reference.sql | identity policy/bootstrap singleton, users, counters, visitor_categories, destinations, user_counter_permissions, safe local audit and idempotency | Only non-secret singleton gate/state rows; zero accounts/passwords/hospital catalogue. Username ASCII/canonical/unique and role constraints. |
| V2__spring_session_jdbc.sql | pinned Spring Session JDBC 4.1.1 MySQL schema | Official SPRING_SESSION and ATTRIBUTES schema with PRIMARY_ID stable identity, expiry/indexes, attributed Apache 2.0. Framework auto-initialization is not used. |
| V3__session_capability_guards.sql | app_session_bindings, auth_session_contexts | Stable anonymous binding, owner pointer/generation, captured user epoch, pending/confirmed/absolute deadlines and durable revoke state. No FK to/locking of framework rows. |

SHA-256 of UTF-8/LF file bytes at the submitted implementation (Windows CRLF checkout bytes may differ; Flyway's stored migration checksum remains authoritative):

| File | SHA-256 |
|---|---|
| V1 | 56a6b13caa92e503c5a67bdff0c0fbc2f2a6fd40a0251d3276e421a0da550b6a |
| V2 | 9e9c6cdc66a5af5ea58ef5e3bb071131f2345c88cfa6e15b2acb1b0379e590ff |
| V3 | 43e169b79c8f1d941ab66381f0a5618c3fdc5997a50219677b58af068c3518df |

Real disposable MySQL evidence: clean startup applies exactly three successful migrations; a separate empty temporary schema targets V1, inserts a synthetic counter, then upgrades to V3 and preserves that data. A repeated migrate reports zero migrations. The test runs with container-only credentials and does not run clean/repair or reach a native database. V1 database CHECK/unique rejects malformed or duplicate canonical accounts.

Before applying to an existing deployment, inspect its actual schema/history and backup/recovery conditions. Any preexisting tables or nonmatching history require coordinator review. There is no automatic baseline-on-migrate, checksum repair or schema deletion. Post-apply changes use a newly allocated forward migration; rollback/recovery uses a reviewed database restoration/forward-fix plan. The isolated upgrade PASS does not assert compatibility with an uninspected native schema.

No disabled message/chain queue, visitor entry context, QR display/challenge/grant, registration/card/assignment or external worker tables are created. Existing capability rows are not deleted by an app reaper; future cleanup must preserve referenced owner/anonymous bindings and comply with retention. Idempotency rows logically expire after 24h but have no physical cleanup task; domain invariants must prevent repeated business work after retention expires.
