# M05 C18/C19 read and API contract

Approved coordinator: `01a14da5-91fe-7bf1-a120-183975085f8b`, 2026-10-18. Exact migration: `Implementation/backend/src/main/resources/db/migration/V6__card_assignment_simulation.sql`; mirror: V6_CANDIDATE.sql. V1-V5 remain immutable. The migration has **not** been run: Docker initialization blocked the necessary check. M06 owns settings writes/history in V7, not a second system_settings table.

## Stable reporting columns

| Object | Definition / stable columns |
|---|---|
| `cards` | UUID `id`, unique `normalized_uid` and `card_code`, `category_id`, `category_code`, `profile_code`, inventory `status`, JS-safe `version`, `enrolled_by/enrolled_at`, `data_origin='SIMULATED'`, `environment` |
| `card_assignments` | UUID `id`, unique `pass_reference` (Pass ID, not UID), `card_id`, existing root `registration_id`, `issue_counter_id`, `return_counter_id`, `issued_by/issued_at`, `due_at`, `return_rule_key`, BIGINT `return_rule_version`, `handover_confirmed_at`, `returned_by/returned_at`, `closed_at/closure_reason`, JS-safe `version`, `operation_origin='SIMULATED'`, `environment` |
| Activity | `closed_at IS NULL`; generated `active_card_id` and `active_registration_id` are separately unique. A closed lost loan is not active. Subsequent reuse creates a new assignment; never reopen an old one. |
| Overdue | Active and `due_at <= serverNow` in UTC, regardless of scheduler lag. Card status eventually materializes OVERDUE; reporting must use the due predicate. |
| Issue / return counts | Issue by `issued_at`; return by non-null `returned_at` (only `closure_reason='RETURNED'`). Lost closure is not a returned card. Date range `[from,to)`, display MYT. |
| Category / destination | Join `registration_id` to existing visitor_registrations for category/destination/current historical identifiers. No lifecycle form_data copies. Filter matching `environment` before aggregating. |
| `lifecycle_events` | UUID `id`, nullable `assignment_id/registration_id`, required `card_id`, `event_type`, nullable SYSTEM `actor_id`, UTC `occurred_at`, fixed-enum `reason_code`, unique `commitment_event_id` FK to local audit. Derived overdue assignment UUID has unique index. Join card for provenance. |
| `overdue_alerts` | PK `assignment_id`, `created_at`, nullable `resolved_at`, nullable `last_followup_at`. Materialized internally, not an external notification. Return or lost closure resolves it. |
| `lost_cases` | UUID `id`, `card_id`, nullable `assignment_id`, `opened_at/opened_by/reason_code`, grouped `resolved_at/resolved_by/recovery_scan_result_id`. Generated unresolved_card_id unique. Card remains LOST until explicit simulated recovery. |
| `system_settings` | BIGINT `id`, unique `setting_key`, `value_int` in 1..720, JS-safe `version`, nullable `updated_by`, `updated_at`. Four keys `return_hours_EXECUTIVE/PENJAGA/VENDOR/CONTRACTOR`, seed 24/version0. Ordinary single-row read during issue freezes hours/key/version/due instant, without holding a setting lock or rewriting old loans. DEMO policy, not hospital approval. |

## Scan and transaction rules

One reader is provisioned lazily per counter, deterministic UUID + unique counter key; no launcher device/card seed is needed. Starting a scan claims a 120-second job immediately within the protected simulation flow. One device pointer fences CLAIMED/SUCCEEDED jobs until cancelled, expired or consumed. Purpose is ENROLL/ISSUE/RETURN/RESTORE; target is REGISTER/registration decimal ID/assignment UUID/card UUID respectively.

`scan_jobs` records actor, exact owner context, device, counter, purpose, target, nonce/lease digests, key version, absolute expiry and state. Nonce/lease are domain-separated HMAC-derived capabilities using the stored key version; GET returns them only to the original currently authorized actor/session while live. Missing old keys fail 503. Tokens/UID/body are never logged or audit payloads. Device machine routes remain disabled. The finite catalogue maps `DEMO-{EXECUTIVE|PENJAGA|VENDOR|CONTRACTOR}-{001..012}` to server UID/profile/cardCode; browser commands accept only sampleCode.

Relative lock graph (each path takes a subsequence):

`account -> all counters sorted -> binding -> context -> category share (enrollment only) -> device -> registration -> card -> assignment -> scan job -> result -> successful idempotency insert / local audit`.

Nonlocking discovery never authorizes. Locking rechecks immutable coordinates and any active assignment mapping; changed mapping aborts, never chases earlier locks. The monitor only takes registration -> card -> assignment, one loan per transaction, at most 50 per 30-second tick. Configuration writers must not call back to roots. Existing root receipts and lifecycle contact receipts require exact original READ_COMMITTED synchronization identity.

Every command first checks current session/epoch/role/counter, then successful replay before scan expiry/state/version. Success replays never consume evidence/audit/apply again. Same key with different body conflicts. A unique loser rolls back completely, then a fresh authorized transaction may only read a winner; no automatic reapply. Business/scan consumption/local event/audit/success record are one JPA transaction. No notification/outbox/worker/backfill is created.

CONTACT reveal is special: idempotency stores only a safe receipt, never phone. Every actual response is freshly authorized and audited in the same transaction as its contact read; a replay therefore adds a fresh access audit, not another business transition. Staff only and only active overdue. Returned/lost/unauthorized cases cannot reveal through replay.

## HTTP surface

All browser POSTs require CSRF and UUIDv4 Idempotency-Key. Fields are strict (unknown, duplicate, null/missing required values, trailing JSON and scalar coercion rejected). IDs are strings; versions are JS-safe integers; timestamps ISO UTC. GETs and POSTs are no-store. Safe writes return `{id,reference,status,version}`; use protected GET for due/receipt details.

| Role / endpoint | Request / response |
|---|---|
| Both `GET /api/{staff|admin}/lifecycle/samples` | Fixed sampleCode/categoryCode/label catalogue |
| ADMIN `GET /api/admin/lifecycle/counters` | Active counter id/code/name for device selection; no staff authority granted |
| Both `POST /api/{staff|admin}/scan-jobs` | counterId,purpose,targetId; staff ISSUE/RETURN, admin ENROLL/RESTORE |
| Both `GET /api/{staff|admin}/scan-jobs/{id}` | Exact owner's bound job incl transient nonce/lease, result ID, serverNow; no raw UID |
| Both `POST .../scan-jobs/{id}/simulate` | nonce,leaseToken,sampleCode -> SUCCEEDED safe result |
| Both `POST .../scan-jobs/{id}/cancel` | `{}` -> CANCELLED/EXPIRED |
| ADMIN `GET /api/admin/cards?page=0` | 25-row masked UID inventory page |
| ADMIN `POST /api/admin/cards` | scanResultId -> AVAILABLE card |
| ADMIN `POST /api/admin/cards/{id}/mark-lost` | expectedVersion,reasonCode REPORTED_LOST/MISSING_DURING_CHECK |
| ADMIN `POST .../{id}/disable` | expectedVersion,reasonCode DAMAGED/REMOVED_FROM_SERVICE; AVAILABLE only |
| ADMIN `POST .../{id}/restore` | expectedVersion,scanResultId,physicalFoundConfirmed=true,inventoryCheckedConfirmed=true,reasonCode=DEMO_RECOVERED_AND_CHECKED |
| STAFF `GET /api/staff/card-assignments?counterId=...&page=0` | 25-row same-counter assignment page incl Pass ID/due/rule snapshot |
| STAFF `GET /api/staff/overdue?counterId=...&page=0` | Same page restricted by active due predicate |
| STAFF `GET /api/staff/card-assignments/{id}` | Same-counter receipt detail |
| STAFF `POST /api/staff/card-assignments` | registrationId,expectedVersion(root),scanResultId,handoverConfirmed=true |
| STAFF `POST /api/staff/card-assignments/{id}/return` | expectedVersion(assignment),scanResultId,physicalReceived=true |
| STAFF `POST /api/staff/assignments/{id}/followups` | reasonCode CONTACT_ATTEMPTED/CONTACTED_RETURN_REQUESTED/NO_ANSWER/ESCALATED_INTERNALLY |
| STAFF `POST /api/staff/assignments/{id}/contact-reveal` | reasonCode=OVERDUE_RETURN_FOLLOWUP; response assignmentId,phone,expiresAt,source; 30s UI cap |
| ADMIN `GET /api/admin/cards/{id}/history` | Latest100 local safe events for card |
| STAFF `GET /api/staff/card-assignments/{id}/history` | Latest100 for this assignment only; no earlier other-counter loans |

This version fixes return_counter_id = issue_counter_id. Staff must currently hold that counter; cross-counter returns/search/contact are unavailable. ADMIN inventory/history has no contact and no staff issue authority. Recovery is explicitly DEMO-only and keeps the original lost assignment closed.
