# R03 administration/settings/reporting contract

- Baseline: `cbd4025d92a5d8dc3faeb3d874de16ba4589c89c` (actual local main).
- Branch: `codex/r03-admin-reporting`; app worktree: `C:\Users\alexy\.codex\worktrees\8add\FYP Dev`.
- Authority: planning/16 and coordinator `01a17867-7222-74d0-8dc6-c33b0e939c15`, local. Scope is owned administration/reporting backend and administration frontend only. No main merge, push, service/database operations, tests or browser acceptance.

## Approved dependency contracts

Coordinator C-R01 approved the existing `return_hours_CATEGORY` keys and nullable `value_int`; null explicitly means no deadline by default. Settings GET retains `{id,key,value,version}`, widening value to `integer|null`; PATCH retains `{version,value,reason}` with required explicit null or integer 1..720. Missing/duplicate/unknown fields, scalar coercion, trailing JSON and bodies over 512 characters fail. Existing expected-version/history/local-audit transaction stays intact. Staff per-pass deadline choices remain independent. No V10.

Coordinator C-R02 approved V8 `registration_destinations(registration_id,destination_id)` with composite PK/FKs and old-root singleton backfill. Counts use EXISTS and display all reference labels through correlated JSON_ARRAYAGG, existing bounded reference text validation, deterministic Java sorting and CSV escaping. No form_data is selected. Missing relation data fails explicitly. Approved R01 checkpoint `bb963e6e4887141e1d69390ac82b3a072b12add3` and repair `58bb6dbda4f52871720e52463e76b110b35cdeb3` were imported in order as `ef67819` and `2d43605`. V8 relation/backfill and legacy-only root repair were source-reviewed; no SQL execution.

Reviewed R02 V9 checkpoint `5b80b0ac22aba150d1aabd024cc50302ff967c2d` was imported with coordinator approval as `900accc`. Exact assignment columns are `category_code,data_origin,destination_id,destination_code,destination_name,closed_by` plus existing timestamps/actors/operation_origin. New manual assignments require destination snapshots and SYNTHETIC source; legacy SIMULATED assignments retain SIMULATED source and only fall back to root destination if assignment.destination_id IS NULL. Known legacy closers are backfilled; unknown historical closer remains null, new manual closures require actor. Cards use `enrollment_method` pairs SCAN/SIMULATED or MANUAL/SYNTHETIC. All queries also require backend-selected environment. No PHYSICAL/live broadening. V9 was read, never executed.

## Implemented report API

- Retain `/api/admin/reports` and registration `POST /api/admin/reports/exports`.
- Extend report with `passPreview` (first 50 plus one overflow indicator row) and metrics: issued distinct registrations, current distinct open registrations, current open passes without deadline. Existing visits/issued/returned/lost keys retain their meaning.
- Add `POST /api/admin/reports/pass-exports`, same bounded/audited envelope as registration export, filename `hsaas-passes-FROM-TO.csv`.
- Pass activity rows use issue, actual return or lost-closure within selected inclusive MYT dates (OR, once per assignment); current metrics ignore historical dates. Actual assignment destination drives pass filtering; requested destinations drive submitted registration filtering.
- Pass rows show registration reference, pass reference/code/category, actual issued destination, status, issued/returned/due/closed timestamps and staff actor IDs, plus approved operation method. Lost closure never becomes returnedAt. No raw name/IC/MRN/phone/address or form_data is selected.
- UTC DATETIME storage/ISO8601 API; UI and CSV render full MYT date/time. Null due means no return deadline, null actual return means not returned.
- All reads/exports retain ADMIN session authority, configured environment and allowed synthetic provenance. CSV fields remain quoted and formula-neutralized; select 10001 and reject over 10000, bound escaped JSON below shared 1 MiB limit. Export audit/history commits before response. No automatic export retry.

Coordinator C-R03 approved unchanged `report_exports` and finite `REPORT_EXPORTED`/`EXPORTED`/`LOCAL` audit. Export history `current_value` has exactly the service-derived safe whitelist `{exportKind:REGISTRATIONS|PASSES,rowCount:int,from:YYYY-MM-DD,to:YYYY-MM-DD,categoryId:decimalString|null,destinationId:decimalString|null}`. No CSV/body/reference list or PII enters history.

Pass API fields: `reference,passReference,cardCode,category,destination,status,issuedAt,issuedBy,dueAt,returnedAt,returnedBy,closedAt,closedBy,operationMethod,origin`. Status is OPEN/OVERDUE/RETURNED/LOST at captured report now; actor IDs are decimal strings, nullable for actual return/closure when absent. Method is MANUAL or SCAN (legacy), origin SYNTHETIC or SIMULATED. Pass preview and CSV contain the same row definition. MYT ISO offset CSV timestamps include full dates. Unknown legacy closedBy renders `Unavailable (legacy)`; null returnedAt renders `Not returned`, null dueAt `No return deadline`.

## Verification boundary

Necessary source review, backend compile/package with tests skipped, frontend build/lint only. SQL/migration/business/concurrency/browser/UAT remain NOT_RUN. Old test sources may compile but tests must not execute.
