# config contract

- **Inputs**: planning/02 security boundaries and M00 SESSION_SPIKE.md/README.md. Shared changes belong to M00/coordinator.
- **Responsibility**: validate closed capabilities, configure one JPA/JDBC transaction manager, Spring Session/CSRF/security and safe API response persistence.
- **Outputs**: secure host-only cookies by default; explicit loopback local profile; buffered API responses until session persistence completes.
- **Verification**: backend Maven verify; cookie invariance, real persistence faults, current role/epoch and mixed transaction connection identity.
- **Review**: no permissive CORS/forwarded-header trust, generated admin or secret fallback. Production mode rejects reader mock/insecure cookies/provider enablement. Decoded public request scope excludes owner activation/renewal and is cleared on all request exits. Never expose configuration secrets through diagnostics.

## 2026-11-16 first-login restriction

The browser filter revalidates restricted credential sessions for auth/me and auth/change-password. Pending initial-password setup is denied on both admin and staff API prefixes; service requireHuman applies the same restriction independently. Existing CSRF, cookie, session-save, revocation and machine-integration boundaries remain intact. Staff SMTP configuration is independent, explicit and disabled by default.
