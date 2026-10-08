# Generated API boundary

`api.d.ts` is generated from the reviewed M00 foundation OpenAPI input mirror in
`Implementation/docs/api/openapi.json`, sourced from M00 commit
`42bc95c68df2bc392fbd2e3ad72096a53929975e`. Its source/provenance is documented
beside that input. It describes implemented foundation APIs, not later business routes.
The handwritten `lib/contracts.ts` retains runtime validation and compile-time
checks against generated C01 session/CSRF/error shapes.

Run `pnpm run api:generate` when the reviewed input mirror changes. The command
fails if that input is absent. Generated files must never be edited manually.
Keep runtime validation at the handwritten client boundary after generation.
