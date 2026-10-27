# R01 contract checkpoint — 2026-10-27

Baseline cbd4025d92a5d8dc3faeb3d874de16ba4589c89c; branch codex/r01-registration-mrn; app worktree C:/Users/alexy/.codex/worktrees/a527/FYP Dev.

## Exact proposed shared read contract (review requested)

V8 creates `registration_destinations(registration_id BIGINT NOT NULL, destination_id BIGINT NOT NULL, PRIMARY KEY(registration_id,destination_id), FOREIGN KEY(registration_id) REFERENCES visitor_registrations(id), FOREIGN KEY(destination_id) REFERENCES destinations(id))`. Backfill each existing registration's destination_id with INSERT SELECT; retain the root destination_id as the first requested destination for historical joins. New multi-select codes are distinct, 1–50, and normalized into this relation in the creation transaction. Fifty is a transport bound, not a business card limit. No additional registration writer.

RegistrationLifecyclePort.Access gains `fieldSchemaVersion()`, `destinations(): List<Destination>` and `multipleActivePassesAllowed(): boolean`. Destination is the public immutable record `Destination(String id,String code,String label)`. New root constructor carries schema and destinations; existing package constructor remains source compatible and delegates. Existing Access fields unchanged. Destinations are loaded after the root lock without new reference locks; registration destinations are immutable. Only VENDOR/CONTRACTOR return true. The port exposes no form_data/patient fields. R02 enforces current category/destination/inventory compatibility under its authority -> root -> sorted card -> assignment order. R03 can join the normalized relation for aggregate/masked reports without parsing form_data. Existing root destination_id remains a compatible primary location; do not multiply counts by joining destinations unaggregated.

## New version/wire

`fieldSchemaVersion=manual-registration-v2`, privacy retains synthetic-privacy-v1. Common formData: fullName (100), identificationType (`IC`, or Executive `IC|LESEN`), identificationNumber (IC 12 digits, optional conventional hyphens normalized to digits; LESEN 5–30 ASCII alphanumeric/hyphen), phone (+ and 8–15 digits). All examples synthetic, no live hospital claim.

PENJAGA adds currentAddress (500), mrn (DEMO-MRN- plus 4–16 uppercase/digits); patient fields are NOT accepted from caller. Adds top-level `termsAcknowledgement:{acknowledged:true,policyVersion:"penjaga-pass-terms-v1"}`. Schema response adds nullable `terms:{policyVersion,text}` (common metadata, rendered only for Penjaga). Terms are a separate consent purpose `PASS_TERMS`, captured with server time. Fallback Penjaga adds optional wardCode only when no successful proof exists, selected from current catalogue for staff manual confirmation; no patient name is fabricated. A failed lookup may submit without proof but must choose manual ward.

EXECUTIVE adds wardCode and patientName (100); VENDOR/CONTRACTOR add company (120) and destinationCodes:string[] (distinct, 1–50). Old relationship/organisation/contact/purpose fields remain readable history, rejected by v2 submission whitelist. New submissions use v2 only; retained old successful idempotent replays must retain v1 original canonical encoding.

POST /api/public/mrn-validations accepts `{formContext,mrn}` (ward no longer required); reply existing feedback/mode/source/token/expiry plus nullable `patient:{patientName,wardCode,wardLabel,bed}`. Only MATCH in mock mode has patient. Synthetic fixture DEMO-MRN-4821 / DEMO-MRN-MATCH resolves deterministic synthetic patient and an existing active catalogue ward; no list endpoint. Grant is checked before and after adapter work; existing session, CSRF, rate limits preserved.

V8 also adds nullable `patient_name VARCHAR(100)`, `bed_label VARCHAR(64)`, `field_schema_version VARCHAR(64)` to temporary mrn_validation_records. Token digest row binds patient/ward fields, MRN HMAC, scope/context/adapter/schema/expiry. Successful submission persists only server-bound patient snapshot in root form JSON, never trusts browser patient name/ward for Penjaga. Clear stale proof/display on MRN/context/category change; revision fence rejects late responses. No-proof manual path remains SUBMITTED with NOT_CHECKED or failure feedback; staff explicitly confirms identity/MRN/ward as before.

V8 drops/replaces registration_consents `registration_privacy_only` CHECK with `purpose IN ('PRIVACY_ACK','PASS_TERMS') AND granted=TRUE`; old consent rows preserved. V1–V7 untouched; V8 actual migration awaits coordinator approval. No migration execution.

## Staff review / shared proposal

Masked queue/detail remain unchanged. Proposed explicit current-counter staff-only POST `/api/staff/registrations/{id}/review-fields` reveals a bounded versioned field list for necessary comparison, requires CSRF/current authority and no-store, and appends finite audit action `REGISTRATION_REVIEW_FIELDS_VIEWED` without any raw PII. Coordinator owns this audit enum addition. Default remains masked; reveal clears on selection/version/access change and is never persisted in browser storage/idempotency. Patient fields never enter reports/CSV/QR/logs. No live approval policy is introduced.

Checks: source/diff/necessary compile/build/lint only; test execution, database/SQL, browser, business/concurrency/UAT NOT_RUN.

## Coordinator decision C-R02 / implemented backend checkpoint

Coordinator approved V8/port/reveal and the narrow audit enum edit. Lifecycle ordering is authority prefix -> discover immutable category/destination IDs -> category FOR SHARE -> destination IDs ascending numeric FOR SHARE -> root FOR UPDATE -> re-read same reference set -> R02 sorted cards/assignments. Changed references fail with VERSION_CONFLICT rather than chasing an earlier lock. Inactive category/locations produce no issue choices but do not prevent return/lost/history. New submissions similarly lock category then numeric destination IDs; immutable temporary proof snapshots need no FOR UPDATE.

Actual mock fixture ward is `DEMO_WARD`, matching the existing explicit seed (no seed/data changes). `DEMO-MRN-4821` and `DEMO-MRN-MATCH` yield `Pesakit Demo 4821`, ward DEMO_WARD, bed DEMO-BED-01. Missing/disabled fixture ward returns UNAVAILABLE without changing its location. Non-MATCH/manual responses have null patient/token/expiry; manual submission needs catalogue ward and carries NOT_CHECKED. Adapter version synthetic-mrn-v2.

Review reveal exact wire: POST /api/staff/registrations/{id}/review-fields body `{expectedVersion:integer}`; response `{id,version,fieldSchemaVersion,fields:[{name,label,value}],terms:null|{policyVersion,capturedAt}}`. Auth/current counter and root lock/version guard precede fields; transaction appends REGISTRATION_REVIEW_FIELDS_VIEWED with current status/version and SYNTHETIC_MANUAL before return. No PII idempotency result exists. Old masked DTO shape is unchanged.

Backend package `mvnw.cmd -DskipTests package` succeeds after correcting an initial Java syntax error; latest pass compiled 79 production and 26 existing test source files. Surefire explicitly skipped all tests. V8 and all SQL/business/concurrency/manual checks NOT_RUN.
