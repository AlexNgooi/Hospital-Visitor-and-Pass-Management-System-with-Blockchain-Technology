# common contract

- **Inputs**: planning/04 C02/C06/C10/C11 and M00 API_BASELINE.md; new DTO schemas require coordinator agreement.
- **Responsibility**: safe error envelopes, versioned explicit request encoding, local audit, successful-command retention and minimal readiness/capabilities.
- **Outputs**: typed safe ports joined to the caller's transaction. No PII payload extension, external audit jobs or provider calls.
- **Verification**: backend Maven verify; encoding vectors, old HMAC versions, same-key concurrency and JDBC/JPA rollback are tested on temporary MySQL.
- **Review**: current authorization precedes replay. Recheck after domain locks; full rollback/retry on insertion races. Retention expiry never authorizes a second business command. Hashing secrets remain backend-only.
