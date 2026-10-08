# Generated API boundary

This directory has no generated DTOs yet: backend OpenAPI has not been delivered.
The handwritten `lib/contracts.ts` validates frozen C01/C02 wire responses; it is
not presented as generated OpenAPI. Each backend owner supplies its reviewed schema.

Run `pnpm run api:generate` only after `../docs/api/openapi.json` exists. The command
fails if that input is absent. Generated files must never be edited manually.
Keep runtime validation at the handwritten client boundary after generation.
