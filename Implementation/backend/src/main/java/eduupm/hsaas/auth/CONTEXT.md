# auth contract

- **Inputs**: planning/02, planning/04 C01/C03/C12 and M00 SESSION_SPIKE.md; coordinator owns cross-module decisions.
- **Responsibility**: credential verification, stable browser identity, current account/counter authorization, irreversible capability revocation and explicit offline bootstrap. No QR business tables or token login.
- **Outputs**: guarded Spring Session repository, server-only owner/anonymous capability ports, minimal C01 HTTP DTOs and M06 guarded account mutation ports.
- **Verification**: backend Maven verify against disposable MySQL; session save failures, expiry, policy/logout competition, multiple instances and bootstrap races must pass.
- **Review**: acquire users/counters/bindings/contexts before later domain locks. Framework writes only outside domain transactions. Never bind Proof/owner IDs from JSON or serialize credentials/internal projections.
