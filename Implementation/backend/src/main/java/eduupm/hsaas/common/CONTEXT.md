# common contract

- **2026-11-16 Inventory naming**: finite CARD_RENAMED denotes explicitly requested native maintenance. Its safe snapshot carries only card state/version, generated target and LOCAL origin; the maintenance actor is null, never an impersonated account. It does not enqueue external work or rewrite card lifecycle history.

- **2026-11-16 No pass**: finite local action REGISTRATION_NO_PASS records only the generated registration target, actor/time and VERIFIED/version snapshot. It joins the outer approval/disposition transaction and does not create a card event, notification or external work.

- **Inputs**: planning/04 C02/C06/C10/C11 and M00 API_BASELINE.md; new DTO schemas require coordinator agreement.
- **Responsibility**: safe error envelopes, versioned explicit request encoding, local audit, successful-command retention and minimal readiness/capabilities.
- **Outputs**: typed safe ports joined to the caller's transaction. No PII payload extension, external audit jobs or provider calls.
- **Verification**: backend Maven verify; encoding vectors, old HMAC versions, same-key concurrency and JDBC/JPA rollback are tested on temporary MySQL.
- **Review**: current authorization precedes replay. Recheck after domain locks; full rollback/retry on insertion races. Retention expiry never authorizes a second business command. Hashing secrets remain backend-only.
