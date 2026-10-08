# API generation input contract

- **Inputs**: reviewed owner OpenAPI artifacts and coordinator-approved source SHAs.
- **Responsibility**: preserve a traceable generation input mirror; this directory is not a new API owner.
- **Outputs**: openapi.json and its source/provenance README; generated frontend declarations remain in frontend/src/generated.
- **Verification**: compare mirror/owner SHA256; run frontend `pnpm run api:generate` and strict TypeScript checks.
- **Manual review**: coordinator approves combined future module contracts; do not hand-edit generated output or overwrite owner evidence specs.
