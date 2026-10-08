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
