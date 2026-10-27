# R01 registration, mock MRN and staff review handoff

2026-10-27 · status: IMPLEMENTED_PENDING_COORDINATOR_REVIEW_AND_USER_MANUAL_TEST.

Worktree `C:/Users/alexy/.codex/worktrees/a527/FYP Dev`, branch `codex/r01-registration-mrn`, actual local-main baseline `cbd4025d92a5d8dc3faeb3d874de16ba4589c89c`. No main merge, push, deployment, app/demo start/stop, seeding or database operation. No old module worktree was edited.

## Exact implementation commits

| Order | SHA | Scope |
|---|---|---|
| 1 | bb963e6e4887141e1d69390ac82b3a072b12add3 | New forms/server mock/terms, normalized V8, compatible lifecycle port, audited explicit review fields, initial contract |
| 2 | 58bb6dbda4f52871720e52463e76b110b35cdeb3 | Coordinator-required schema-aware legacy-only destination fallback repair |
| 3 | e3782f2445424530ecf2c3e5153db30bb4d152de | V1 replay injection boundary, original lookup capture time, accurate IC labels and backend contexts |
| 4 | 8dee3ed50e96e1010436629cd741d82edb1c60ca | Four frontend forms, mock patient/terms/multiple locations, explicit staff reveal and frontend contexts |

Original documentation delivery was 81081702b04e40457a5b802492bc86a747709a51. The coordinator-requested automatic MRN follow-up below extends that chain; resolve the final documentation head with `git rev-parse codex/r01-registration-mrn`. Coordinator already source-reviewed/approved commits 1+2 for R02/R03 dependency import; full feature acceptance is still pending. R01 imported no other module commit.

## Delivered behavior and boundaries

Fresh registrations use manual-registration-v2. Penjaga accepts IC/name/phone/current address/MRN and independent required pass terms/privacy acknowledgements. Executive accepts IC or LESEN, name/phone/ward/patient name. Vendor/Contractor accept IC/name/phone/company/multiple destination codes. Removed old extra mandatory fields do not reappear in v2; legacy schema/history/retained successful request encoding is preserved. The 1–50 destination bound is a request-size bound, not an active-card business limit.

Protected lookup accepts formContext+synthetic MRN and returns the fixed minimum MOCK/SYNTHETIC patient view. Grant validation runs before and after adapter execution, retaining existing anonymous session/CSRF/rate limits. Token digest records bind original scope/context/MRN fingerprint/patient/ward/adapter/schema/expiry; Penjaga submission binds only the server snapshot. MRN/category/context changes fence late responses and clear old proof/display. Failure retains inputs and offers manual catalogue ward selection; no patient data is invented. All outcomes remain SUBMITTED until current staff explicitly approves with the existing manual evidence checklist. No live hospital API exists.

V8 adds registration_destinations with old singleton backfill and temporary patient/schema proof columns; widens consent CHECK to PRIVACY_ACK/PASS_TERMS. V1–V7 unchanged. Primary root destination_id stays for old joins; only known legacy roots have singleton fallback. Source-compatible lifecycle Access adds schema/current active allowed destinations/category cardinality. Category then numeric destination SHARE locks precede root/recheck; inactive references do not themselves block existing return/lost/history. R02 still owns card cardinality, actual issued destination snapshot, assignment/version locks and transactions. R03 owns scoped aggregate joins without registration multiplication. Full exact wire/DDL/lock decisions are in CONTRACT.md.

Queue/detail remain masked. Explicit staff-only review-fields POST revalidates current session/COUNTER_STAFF/counter scope/expected version and commits a PII-free REGISTRATION_REVIEW_FIELDS_VIEWED audit before returning a bounded old/new schema field list. Raw values are excluded from idempotency/audit/default DTO/report/CSV and kept only in selected-version UI memory. Shared-file exception was limited to this one finite audit enum value and its English comment in common/LocalAuditPort.java, approved by coordinator C-R02. No shared config/client/main/generated/seed/runbook files were edited.

## Checks actually executed

| Check | Result / limit |
|---|---|
| Backend `.\mvnw.cmd -DskipTests package` | SUCCESS, latest 79 production and 26 existing test source files compiled; Surefire explicitly skipped all tests |
| Frontend `pnpm install --frozen-lockfile --ignore-scripts` | Existing lockfile dependencies materialized in ignored node_modules; no package/lockfile edits |
| Frontend `pnpm run build` | SUCCESS, TypeScript + Vite; existing single-bundle >500 kB advisory remains |
| Frontend `pnpm run lint` | SUCCESS, final run no diagnostics |
| `git diff --check`, staged diff check, source UTF-8 decode | SUCCESS |

Initial backend syntax and frontend encoding build failures were corrected before the final passes; two intermediate frontend effect lint warnings were also corrected. No tests were added or executed. Existing test source compilation is not a test PASS; historical runtime fixtures still describe the old form wire and require future manual-scope-aware maintenance before any separately authorized suite run.

Database/Flyway execution, SQL constraints/backfill on an actual database, business/concurrency/rollback/restore, browser/visual/keyboard/UAT, live hospital/native database and application startup are all NOT_RUN. Build success is not business acceptance.

## Manual scenarios for the user after separately authorized integration/startup

1. Use the user's synthetic environment/current valid QR grant. Use invented names/address, IC `000000000001` (syntax sample only), phone `+999123456789`; do not use real patient records. Executive LESEN example `DEMO-LESEN01` should be accepted; Penjaga/Vendor/Contractor must not accept LESEN or TEST_ID.
2. Existing explicit seed has DEMO_WARD; MRNs DEMO-MRN-4821 or DEMO-MRN-MATCH should show Pesakit Demo 4821 / DEMO_WARD / DEMO-BED-01. Disabled/missing fixture ward yields unavailable without catalogue/data changes. DEMO-MRN-TIMEOUT, DEMO-MRN-UNAVAILABLE and an unknown synthetic MRN exercise fallback labels.
3. Change MRN during lookup and again after MATCH. Previous patient/proof must disappear and an old response must not restore it. Repeat after original context/grant expiry/replacement. Expired/changed proof should require lookup again or explicit manual ward fallback, preserving other input.
4. Submit Penjaga without terms, with a wrong policy version or forged patient fields: reject. Successful creation must capture independent PRIVACY_ACK and PASS_TERMS versions/server times and remain SUBMITTED with mrn_verified/ward_verified false. No WhatsApp consent/job.
5. Executive needs ward/patient name only, without old organisation/contact/purpose/MRN. Vendor/Contractor select two existing locations; verify one root and two normalized destination rows, not two visitors. Check duplicate/unknown/inactive locations and cross-category properties reject.
6. Reuse the same submit command key/body for exact replay; changed original strings/arrays/terms must conflict. Inspect old v1 historical queue/detail/review and retained successful v1 replay without rewriting old fields; v1 extra v2 properties must reject.
7. Staff queue/detail must initially show masked identity. Explicit reveal should show necessary current-schema fields, all requested locations and Penjaga terms/patient snapshot with safe audit. Hide, change selected row/counter/session, revoke access or change version; sensitive display/request must clear. Admin/public/cross-counter/stale-version requests must not reveal data.
8. Mock MATCH must not enable approval without staff identity/MRN/ward confirmations. Approve/reject remains a separate audited/versioned operation, with no pass issued by R01.
9. Coordinate R02 manual single/multiple card and actual destination checks, and R03 scoped counts/filter/report checks. Disable a category/location after issuance: issue choices should become empty/ineligible while existing returns remain possible. Unknown schema or missing v2 destination relation must fail safely.

## Integration follow-up owned by coordinator

Update shared OpenAPI/generated contracts for v2 form metadata, termsAcknowledgement, destinationCodes, nullable mock patient/token/expiry outcomes, ward-free lookup input and explicit review-fields POST/DTO. No shared runtime composition change is required: existing registration/review beans/features load owned changes. V8 must be included before R02 V9/R03 readers, but no migration was executed here. Preserve approval boundaries for combined source checks/main merge/application startup and manual SQL/business checks.

## Coordinator final-review repair: automatic MRN lookup

Repair commit `61a132ecbcc59bc5feef83ed02266c9314d05d5b` follows 81081702b04e40457a5b802492bc86a747709a51 and changes only registration frontend contracts.ts, registration.tsx and CONTEXT.md. Valid completed Penjaga MRN input now automatically looks up on blur in the visit-details step. The existing button remains an explicit retry. Both triggers share the protected transport and one current context+normalized-MRN in-flight key. An automatic-attempt key prevents repeated blur from retrying the same completed success/failure; MRN edit resets that attempt eligibility. No retry timer or failure loop exists.

MRN/ward edits abort and invalidate prior requests while clearing feedback/proof immediately; category/context/unmount also abort and fence pending work. Optional AbortSignal is forwarded by the owned port, with no backend endpoint/dependency/shared client change. Responses still require the captured revision, and mock lookup never changes staff approval. Manual ward fallback remains available after failure.

For this actual frontend logic change, `pnpm run build` and `pnpm run lint` both succeeded again (same existing >500 kB bundle advisory, no lint diagnostics); staged diff check passed. Backend sources unchanged, so no backend packaging was repeated. Database/app/browser/test/business execution all remain NOT_RUN.

Additional user manual scenarios (NOT_RUN): tab/click away from a valid MRN and observe lookup without pressing the button; invalid/incomplete MRN must not dispatch. Blur then activate retry while lookup is pending must not duplicate the request. After failure, repeated blur must not create a retry loop; explicit retry remains available. Edit MRN during a request or change category/context/unmount and verify stale patient/proof cannot return. Staff confirmation must remain unchecked even after automatic MATCH.
