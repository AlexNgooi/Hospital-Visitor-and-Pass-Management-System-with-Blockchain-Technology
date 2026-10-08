# config contract

- **Inputs**: planning/02 security boundaries and M00 SESSION_SPIKE.md/README.md. Shared changes belong to M00/coordinator.
- **Responsibility**: validate closed capabilities, configure one JPA/JDBC transaction manager, Spring Session/CSRF/security and safe API response persistence.
- **Outputs**: secure host-only cookies by default; explicit loopback local profile; buffered API responses until session persistence completes.
- **Verification**: backend Maven verify; cookie invariance, real persistence faults, current role/epoch and mixed transaction connection identity.
- **Review**: no permissive CORS/forwarded-header trust, generated admin or secret fallback. Production mode rejects reader mock/insecure cookies/provider enablement. Never expose configuration secrets through diagnostics.
