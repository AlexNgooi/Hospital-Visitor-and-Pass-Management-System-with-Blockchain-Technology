# R02 manual inventory and pass lifecycle

Baseline: `cbd4025d92a5d8dc3faeb3d874de16ba4589c89c`; branch `codex/r02-manual-pass`; isolated worktree `C:/Users/alexy/.codex/worktrees/b799/FYP Dev`.

## Approved schema checkpoint (C-R01 / C-R02 / C-R03)

V1–V7 remain immutable. V9 is reserved for this forward migration; no SQL is executed.

* `system_settings.value_int INT NULL`; replace `setting_hours` with CHECK(value_int IS NULL OR value_int BETWEEN 1 AND 720). NULL is the no-deadline default. Existing numeric defaults remain unchanged. Settings API/history belong to R03.
* `cards.normalized_uid/profile_code` become nullable. Add `enrollment_method VARCHAR(16) NOT NULL DEFAULT 'SCAN'`, `destination_id BIGINT NULL REFERENCES destinations(id)`. New MANUAL inventory uses SYNTHETIC provenance, no UID/profile. Historical SIMULATED/SCAN remains readable.
* `card_assignments.due_at` becomes nullable, with null-or-after-issue check. Add `closed_by` (known legacy actors backfilled from normal return/lost cases; genuinely unknown historical SIMULATED actors remain NULL), `category_code`, `data_origin` (old SIMULATED/new SYNTHETIC), `destination_id`, `destination_code`, `destination_name`; destination snapshots contain reference data only, no patient fields. `operation_origin` allows MANUAL and SIMULATED. Existing issued_by/at and returned_by/at are unchanged UTC fields. Null return means unreturned, including lost closure.
* Keep unique active_card_id. Replace unique active_registration_id with a nonunique lookup and generated unique active_single_registration_id only for Executive/Penjaga. Backfill category from cards before making it required.
* `lost_cases.recovery_method` allows SCAN/MANUAL; old resolved cases backfill SCAN; manual recovery has null scan FK and never reopens a closed assignment.

## API and transaction proposal

Existing protected endpoints retain CSRF/session/counter authority. Enroll `{cardCode,categoryCode,destinationId}`; issue `{registrationId,expectedVersion,handoverConfirmed,passes:[{cardId,expectedVersion,destinationId,dueAt}]}`. `dueAt` is required and nullable; no fallback deadline. Bound issue to 1..50 selections for request/transaction safety, not a registration lifetime business cap. Return `{expectedVersion,physicalReceived}` closes only that selected assignment. Batch return can atomically close a selected subset of one registration. Same command key/body replays the same existing SafeResult envelope; batch issue receipt ID is registration ID and scoped list supplies individual pass receipts.

Lock order: current account -> sorted active counters -> session/permissions -> category reference -> requested destination references ascending FOR SHARE -> registration root -> sorted cards -> sorted assignments -> overdue/lost rows -> local audit/idempotency. Recheck discovered active mapping after locks; abort changed mappings rather than chase an earlier root. Monitor/lost/restore keep this graph. Any failed selected card/version/destination/deadline rolls back the entire command. Root serializes category counts; generated unique single-registration and active-card indexes provide database defense.

R01 approved facet: Access.fieldSchemaVersion(), Access.multipleActivePassesAllowed() (only Vendor/Contractor), Access.destinations(): List<Destination(String id,String code,String label)> for active authorized choices, including historical singleton; R01 alone reads registration fields/JSON and freezes references in its root lock prefix. Issue context returns root version/category/destinations, current default settings, and a bounded page of compatible available cards. No duplicate registration SQL in R02.

Use existing finite audit origin SYNTHETIC_MANUAL for manual events; this is separate from assignment MANUAL method and SYNTHETIC data provenance. No shared enum expansion is needed. UI must label synthetic context; manual confirmation never claims live reader or hospital verification.

## Verification boundary

Only necessary compile/build/lint and source/diff review. Database migration, concurrency execution, business/UAT/browser, restore execution and tests: NOT_RUN. No app startup/shutdown, database writes, push, deployment or main merge.

Actual migration: `backend/src/main/resources/db/migration/V9__manual_pass_lifecycle.sql`, approved after historical actor-null correction. No SQL executed. Legacy report destination fallback is allowed only for SIMULATED rows with NULL assignment destination. New MANUAL rows require actual issued destination id/code/name and SYNTHETIC data_origin. Current return_rule_key/version records the advisory default context; explicit per-pass due_at always wins.
