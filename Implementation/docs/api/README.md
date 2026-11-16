# Reviewed OpenAPI generation input

`openapi.json` is an exact input mirror of
`../evidence/modules/M00/openapi.json`, source commit
`42bc95c68df2bc392fbd2e3ad72096a53929975e`. It was synchronized on the M01
integration baseline `03fda7fe56d1de94e04083b8f58370ac9cf80c7f`.

M00's evidence copy remains authoritative for the implemented foundation routes.
This mirror lets `frontend/pnpm run api:generate` consume a stable reviewed input;
M01 does not edit the original spec. Future combined module specifications require
coordinator review. Generated frontend declarations are never hand-edited and do
not replace runtime response validation or prove unimplemented business APIs.

## 2026-10-27 manual-pass change scope

The R01–R03 changes use feature-local runtime response schemas and module-owned
contracts in `Implementation/docs/evidence/changes/Rxx/CONTRACT.md`. This shared
input mirror still covers only the reviewed foundation routes; it is not a
combined OpenAPI description of registration, manual inventory/lifecycle or
administration/reporting. New paths remain on the existing ADMIN or COUNTER_STAFF
security prefixes, with service-level current authority/counter checks and CSRF
for writes. No role broadening or hand-edit of generated declarations is needed.

Exact checkpoint/source review and dependency approval are tracked in
`planning/04_DATA_MODEL_AND_API_PLAN.md`. Consolidating a new generated
input requires a later reviewed combined specification; the old foundation input
must not be silently relabelled as complete coverage of the new application.

## 2026-11-16 administrator redesign increment

[admin-management.openapi.json](admin-management.openapi.json) documents the current authorized account/onboarding, current Me, filtered inventory and export increment. It supplements the frozen foundation mirror, which remains byte-for-byte historical and is not relabelled as current complete coverage. Frontend runtime contracts extend the minimal generated foundation projection with the first-login restriction; generated declarations are not hand-edited. Audit module/action behavior and user-run verification are in [MANUAL_ADMIN](../runbooks/MANUAL_ADMIN.md).
