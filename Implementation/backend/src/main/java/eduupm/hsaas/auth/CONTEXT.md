# auth contract

- **Inputs**: planning/02, planning/04 C01/C03/C12 and M00 SESSION_SPIKE.md; coordinator owns cross-module decisions.
- **Responsibility**: credential verification, stable browser identity, current account/counter authorization, irreversible capability revocation and explicit offline bootstrap. No QR business tables or token login.
- **Outputs**: guarded Spring Session repository, server-only owner/anonymous capability ports, minimal C01 HTTP DTOs and M06 guarded account mutation ports.
- **Verification**: backend Maven verify against disposable MySQL; session save failures, expiry, policy/logout competition, multiple instances and bootstrap races must pass.
- **Review**: acquire users/counters/bindings/contexts before later domain locks. Framework writes only outside domain transactions. Public anonymous requests retain save validation but never activate/renew owners; unscoped saves also default to no owner renewal. Never bind Proof/owner IDs from JSON or serialize credentials/internal projections.

## 2026-11-16 staff onboarding increment

V10 adds staff metadata, required initial-password change, expiry and email status without changing existing credentials. Accounts.Me includes passwordChangeRequired. requireCredentialSession is restricted to auth identity/password operations; requireHuman rejects pending setup for every business owner. InitialPasswordController verifies the temporary secret and confirmation under account/session locks, updates hash/epoch/version and invalidates the session. StaffOnboardingMail uses explicit disabled-by-default STARTTLS settings and only deliberate create/resend commands; it stores no plaintext, logs no mail body and treats transport exceptions as UNKNOWN. Last-admin protection counts active admins whose password setup is complete. No email/configuration was used or sent during implementation; live acceptance remains NOT_RUN.

## V12 staff access

Superseded on 2026-11-24: active is the single account access switch. Active COUNTER_STAFF accounts can handle visitors/passes after password setup; inactive accounts cannot authenticate or use existing sessions. staffAccessEnabled in Me is a derived capability only. The V12 staff_access_enabled column remains unused for migration compatibility. The separate staff-access mutation port is removed; versioned account changes retain the security epoch, last-admin protection, audit and account/binding/context lock order.
