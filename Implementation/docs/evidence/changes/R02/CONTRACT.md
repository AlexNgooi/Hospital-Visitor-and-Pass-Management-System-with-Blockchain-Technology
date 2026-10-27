# R02 manual inventory and pass lifecycle

Baseline: `cbd4025d92a5d8dc3faeb3d874de16ba4589c89c`; branch `codex/r02-manual-pass`; isolated worktree `C:/Users/alexy/.codex/worktrees/b799/FYP Dev`.

## Approved schema checkpoint (C-R01 / C-R02 / C-R03)

V1–V7 remain immutable. V9 is reserved for this forward migration; no SQL is executed.

* `system_settings.value_int INT NULL`; replace `setting_hours` with CHECK(value_int IS NULL OR value_int BETWEEN 1 AND 720). NULL is the no-deadline default. Existing numeric defaults remain unchanged. Settings API/history belong to R03.
* `cards.normalized_uid/profile_code` become nullable. Add `enrollment_method VARCHAR(16) NOT NULL DEFAULT 'SCAN'`, `destination_id BIGINT NULL REFERENCES destinations(id)`. New MANUAL inventory uses SYNTHETIC provenance, no UID/profile. Historical SIMULATED/SCAN remains readable.
* `card_assignments.due_at` becomes nullable, with null-or-after-issue check. Add `closed_by` (known legacy actors backfilled from normal return/lost cases; genuinely unknown historical SIMULATED actors remain NULL), `category_code`, `data_origin` (old SIMULATED/new SYNTHETIC), `destination_id`, `destination_code`, `destination_name`; destination snapshots contain reference data only, no patient fields. `operation_origin` allows MANUAL and SIMULATED. Existing issued_by/at and returned_by/at are unchanged UTC fields. Null return means unreturned, including lost closure.
* Keep unique active_card_id. Replace unique active_registration_id with a nonunique lookup and generated unique active_single_registration_id only for Executive/Penjaga. Backfill category from cards before making it required.
* `lost_cases.recovery_method` allows SCAN/MANUAL; old resolved cases backfill SCAN; manual recovery has null scan FK and never reopens a closed assignment.

## Implemented API and transaction contract

Existing protected endpoints retain CSRF/session/counter authority. Enroll `{cardCode,categoryCode,destinationId}`; issue `{registrationId,expectedVersion,handoverConfirmed,passes:[{cardId,expectedVersion,destinationId,dueAt}]}`. `dueAt` is required and nullable; no fallback deadline. Bound issue to 1..50 selections for request/transaction safety, not a registration lifetime business cap. Return `{expectedVersion,physicalReceived}` closes only that selected assignment. Partial returns use individual selected-pass commands; there is no exposed batch-return endpoint. Same command key/body replays the same existing SafeResult envelope; batch issue receipt ID is registration ID and scoped list supplies individual pass receipts. Manual commands use DTO encoding version 2 with ordered nested selection fields; request property order does not change identity, selection-array order does.

Lock order: current account -> sorted active counters -> session/permissions -> category reference -> requested destination references ascending FOR SHARE -> registration root -> sorted cards -> sorted assignments -> overdue/lost rows -> local audit/idempotency. Recheck discovered active mapping after locks; abort changed mappings rather than chase an earlier root. Admin lost follows its current ADMIN authority/root/card/assignment prefix. Restore has no active root to lock and rejects any active card mapping under its card lock. System monitoring uses root/card/assignment order with no human actor. Enrollment locks category then destination before creating the card. Any failed selected card/version/destination/deadline rolls back the entire command. Root serializes category counts; generated unique single-registration and active-card indexes provide database defense. No new reference locks are acquired after root/card locks. Inactive reference rows remove issue choices without blocking actual return/lost closure.

R01 approved facet: Access.fieldSchemaVersion(), Access.multipleActivePassesAllowed() (only Vendor/Contractor), Access.destinations(): List<Destination(String id,String code,String label)> for active authorized choices, including historical singleton; R01 alone reads registration fields/JSON and freezes references in its root lock prefix. Issue context returns root version/category/destinations, current default settings, and a bounded page of compatible available cards. No duplicate registration SQL in R02.

Use existing finite audit origin SYNTHETIC_MANUAL for manual events; this is separate from assignment MANUAL method and SYNTHETIC data provenance. No shared enum expansion is needed. UI must label synthetic context; manual confirmation never claims live reader or hospital verification.

## Verification boundary

Only necessary compile/build/lint and source/diff review. Database migration, concurrency execution, business/UAT/browser, restore execution and tests: NOT_RUN. No app startup/shutdown, database writes, push, deployment or main merge.

Actual migration: `backend/src/main/resources/db/migration/V9__manual_pass_lifecycle.sql`, approved after historical actor-null correction. No SQL executed. Legacy report destination fallback is allowed only for SIMULATED rows with NULL assignment destination. New MANUAL rows require actual issued destination id/code/name and SYNTHETIC data_origin. Current return_rule_key/version records the advisory default context; explicit per-pass due_at always wins.

## Exact routes and safe responses

All routes are existing protected `/api/admin/**` or `/api/staff/**` routes. Controllers set Cache-Control no-store and Referrer-Policy no-referrer. Coordinator reviewed role routing; no shared SecurityConfig, OpenAPI mirror or generated client changes are required for this module. The shared mirror currently describes foundation only; these feature-local schemas are authoritative for this slice.

| Route | Role | Request/result |
|---|---|---|
| GET `/api/admin/cards/references` | ADMIN | `{categories:[{id,code,label}],destinations:[{id,code,label}]}`; active categories limited to four known codes; active destinations bounded 500, oversized catalogue fails closed rather than silently truncating |
| GET `/api/admin/cards?page=0` | ADMIN | Existing page envelope `{page,pageSize:25,total,items,serverNow}`; CardView below |
| POST `/api/admin/cards` | ADMIN | Enroll body above; unique visible ASCII code `[A-Za-z0-9_-]{1,64}`; destination/category must currently be active; SafeResult `{id:cardId,reference:cardCode,status:AVAILABLE,version:0}` |
| POST `/api/admin/cards/{id}/restore` | ADMIN | `{expectedVersion,physicalFoundConfirmed,inventoryCheckedConfirmed,reasonCode:DEMO_RECOVERED_AND_CHECKED}`; both confirmations true; LOST/DISABLED only, no active loan; SafeResult RESTORED |
| POST `/api/admin/cards/{id}/mark-lost` or `/disable` | ADMIN | Existing `{expectedVersion,reasonCode}`; lost records current closed_by and never returned_at/by; disable requires AVAILABLE and no active loan |
| GET `/api/staff/registrations/{id}/issue-context?page=0` | COUNTER_STAFF | `{registrationId,publicReference,categoryCode,version,multipleActivePassesAllowed,activePassCount,destinations:[{id,code,label}],defaultReturnHours:null\|1..720,returnRuleVersion,cards:Page<CardView>}`; current root counter scope and VERIFIED required |
| POST `/api/staff/card-assignments` | COUNTER_STAFF | Atomic issue body above; SafeResult `{id:registrationId,reference:null,status:ISSUED,version:rootVersion}`. Refresh scoped pass list before presenting individual pass results |
| GET `/api/staff/card-assignments` or `/overdue` | COUNTER_STAFF | Required counterId, optional page and registrationId narrowing. Identical authority/environment/source/filter predicates for count and items. Overdue additionally requires active and nonnull due_at <= server UTC now |
| GET `/api/staff/card-assignments/{id}` | COUNTER_STAFF | AssignmentView below, current issue/return counter authority |
| POST `/api/staff/card-assignments/{id}/return` | COUNTER_STAFF | Return body above; physicalReceived true; active ISSUED/OVERDUE only, LOST cannot normal-return; SafeResult `{id:assignmentId,reference:passReference,status:RETURNED,version:nextAssignmentVersion}` |

Existing assignment/card history, overdue contact reveal (at most 30 seconds, each display audited), local followup and legacy scan-history reads remain. Legacy scan actions are separately reader-mode gated and never called by the manual UI. No manual path creates/consumes a scan or sets a fake UID/profile.

CardView fields: `id,cardCode,maskedUid(nullable),categoryCode,status,version,source,environment,destinationId(nullable legacy),destinationLabel(nullable legacy),enrollmentMethod`. Allowed source pairs are SCAN/SIMULATED and MANUAL/SYNTHETIC only, with synthetic/test environment. These pairs are checked in SQL counts/items, direct row mapping and browser runtime contracts.

AssignmentView fields: `id,passReference,cardId,cardCode,registrationId,counterId,status,issuedAt,dueAt(nullable),returnRuleKey,returnRuleVersion,returnedAt(nullable),closedAt(nullable),closureReason(nullable),version,operationOrigin,environment,dataSource,destinationId,destinationCode,destinationLabel,issuedBy,returnedBy(nullable),closedBy(nullable unknown legacy)`. `destinationLabel` maps immutable `destination_name`, and dataSource maps `data_origin`; no patient fields are included. Method/data pairs are SIMULATED/SIMULATED or MANUAL/SYNTHETIC. Legacy UI explicitly says when an issued destination was not snapshotted; it does not invent one. UTC ISO instants are displayed with full MYT dates/times. Lost closure has a separate time/actor and no actual return.

Writes require Idempotency-Key UUID v4 and current server actor; no actor/source/origin/UID/status fields are accepted. Unknown/duplicate fields, omitted deadlines, duplicate cards, malformed instants and >microsecond precision fail 400 VALIDATION_FAILED. Authority failures retain existing 401/403/404 behavior. Version, category/card/destination/confirmation/deadline/state conflicts fail 409; same key with changed input fails IDEMPOTENCY_CONFLICT. Any write/audit/unique failure rolls back the complete batch. UNKNOWN browser commands retain the original immutable request/key and permit only explicit original-handle retry.

## Approved dependency imports

R01 coordinator-approved sequence imported without editing its owned files:

* `bb963e6e4887141e1d69390ac82b3a072b12add3` -> local `30ca75fe59a52ff3ed1727dec49a8a1e8e725ac0` (V8, forms/root facet).
* `58bb6dbda4f52871720e52463e76b110b35cdeb3` -> local `37a108acf5a4fdd5eb6af4390a8cd49d95f7e111` (legacy-only fallback repair).

R02 schema checkpoint: `5b80b0ac22aba150d1aabd024cc50302ff967c2d`, approved and supplied independently to R03. Runtime delivery must integrate with R03 nullable settings/reporting before manual deployment. R01 final MRN/UI changes remain its separate delivery.
