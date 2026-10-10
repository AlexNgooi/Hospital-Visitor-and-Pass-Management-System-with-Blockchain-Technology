# C14/C15 synthetic registration implementation contract

Application baseline f59baf3; backend checkpoint 869c6cb; isolated codex/hsaas-m03-visitor-registration. C14 DEMO-only input and coordinator C15 SQL/API/read/lock contract were approved on 2026-10-10 and implemented. V5_CANDIDATE.sql records the reviewed draft; actual Flyway V5__visitor_registration.sql is authoritative. No hospital data/privacy approval is claimed.

## Fields and privacy

Version synthetic-registration-v1. All common fields required: fullName 1–100 Unicode code points; identificationType TEST_ID; identificationNumber DEMO- followed by 4–24 uppercase letters/digits (9–29 total); phone '+' followed by 8–15 digits (9–16 total). Text is NFC+outer Unicode whitespace/space-character trim for validated persistence; original controls/FORMAT and invalid surrogates are rejected before normalization; invalid Unicode/control characters and overlength values fail rather than truncate. HMAC encoding retains parsed original strings/presence before persistence normalization, so a changed body cannot reuse a key.

| Category | Additional required fields |
|---|---|
| PENJAGA | mrn DEMO-MRN- plus 4–16 uppercase alphanumerics (13–25 total); active wardCode maximum 32; relationship PARENT/SPOUSE/SIBLING/CHILD/OTHER |
| EXECUTIVE | organisation 1–120, contactPerson 1–100, active destinationCode maximum 32, visitPurpose 1–500 |
| VENDOR | company 1–120, contactPerson 1–100, active destinationCode maximum 32, deliveryPurpose 1–500 |
| CONTRACTOR | company 1–120, contactPerson 1–100, active destinationCode maximum 32, workPurpose 1–500 |

Strict category whitelist rejects unknown/cross-category fields. No caller counter/status/actor/source/expiry/WhatsApp opt-in. Category ID/code is checked against active reference and grant restriction. Both ward/destination use V1 destinations; no hospital catalogue is seeded by migration.

Privacy policyVersion synthetic-privacy-v1; required acknowledged=true. BM copy: “Saya mengakui telah membaca notis demo ini. Gunakan data sintetik sahaja. Maklumat digunakan untuk pendaftaran dan pengesahan simulasi di kaunter; jangan masukkan maklumat pesakit sebenar.” Service produces capturedAt. WhatsApp displays NOT_ENABLED without checkbox/consent/job. Production enabled registration fails startup until a future approved schema/policy exists; enabled demonstration can run only in development/synthetic/test, always source SYNTHETIC.

## Implemented public wire

- POST /api/public/registration-schema: body only formContext. Module-owned endpoint avoids changing M00 bootstrap. Valid grant/CSRF; returns exact original formContext, fieldSchemaVersion, source=SYNTHETIC, notificationStatus=NOT_ENABLED, privacy policy/version/text, active scoped categories with definitions and active destinations. Schema reads never consume or renew grant.
- POST /api/public/mrn-validations: formContext/mrn/wardCode, no mode/source from caller; maximum five-minute token bounded by grant deadline. Response feedback/mode/source plus validationToken and expiresAt, both nullable when manual checks are deferred. Mock returns deterministic synthetic feedback; never patient name/data and never verified status. No token/timeout can proceed SUBMITTED/manual pending.
- POST /api/public/registrations: Idempotency-Key UUIDv4; exact formContext, categoryCode, fieldSchemaVersion, formData, privacyAcknowledgement; optional mrnValidationToken (omit or null means no feedback; presence differs in HMAC). Strict fixed field order/presence encoding. 201 only publicReference (R- plus 128-bit random base64url, consistent with M04 client). No PII/id/status/pass/card/due time or public lookup.

## Exact M04 masked GET wire

Root-owned RegistrationReadPort is a separate read facet of the same single root adapter, not another write/aggregate implementation. M04 obtains ownerContextId from its real framework StaffContext, takes the current user/counter/owner prefix, then calls captureReadScope(serverOwnerContextId,counterId). The root factory repeats lockOwners for exactly that same single counter (safe re-entry), derives actor from current server metadata, and returns a private-constructor exact-transaction one-use scope. It never trusts raw caller counterIds. ReadQuery(category,status,page,pageSize), defaults ALL/ALL/0/10, page>=0, size 1–50 and (long)page*pageSize<=Integer.MAX_VALUE, stable submittedAt/id descending. GET queue includes counterId query selected by M04; detail also uses the same server-authorized current counter. Wire matches source03eca76 exactly:

- QueuePage: items,total,page,pageSize,serverNow.
- QueueItem: id,publicReference,counterId,categoryCode,maskedVisitorName,destinationLabel,status,version,submittedAt.
- Detail: all QueueItem fields plus maskedIdentification,maskedPhone,maskedMrn,mrnMode,mrnFeedback,environment,source,review.
- Review metadata: actorId,reviewedAt,source,methodCode,basisCodes,reasonCode; nullable review before decision, nullable method for rejection, no note/evidence raw object/body.
- Non-Penjaga maskedMrn/mrnMode/mrnFeedback are null. Penjaga feedback NOT_CHECKED/MATCH/NO_MATCH/TIMEOUT/UNAVAILABLE; never an automatic staff confirmation. IDs decimal strings, versions safe integers, UTC timestamps microsecond Z. Names reveal at most one letter plus '***'; identifiers/MRN at most four safe suffix characters plus '***'; phone at most four digits plus '***'. New submissions require an active destination; historical reads retain its controlled label, maximum120 without controls. No reveal endpoint.

Read authorization: requireHuman before M04 outer transaction; current user then selected counter/owner prefix. captureReadScope locks/rechecks exactly that same server owner/counter; no post-binding discovery of another counter. Queue count/items or detail first consumes the scope before any SQL, requiring its exact RC synchronization/resource identity. SQL filters both current actor permission and bound single counter/account/counter state. Unknown/cross-counter detail uniformly404; role403/session401 unchanged. A second read uses a fresh scope; suspension/completion cannot reuse it. Missing selected-counter scope is not treated as permission to read all counters.

## V5 and transaction map

V5 tables: visitor_registrations, PRIVACY_ACK-only registration_consents, digest/fingerprint-only mrn_validation_records; real FK from grant.registration_id. Root stores per-registration schema/form JSON/source and C09 review metadata; no person master or external tasks. JSON contains only validated synthetic whitelist. MRN feedback rows store no token/raw MRN/patient/body; ward FK/grant context/outcome/expiry only. Five-minute maximum; bounded delete of expired temporary rows (index, <=500/batch, once/minute) does not touch registration/consent/audit/history. Hospital retention for real data remains deferred; no automatic registration-history deletion is invented.

Submit: resolve anonymous binding outside domain TX, parse/encode fixed request, initial successful replay in its own completed anonymous-guarded RC transaction (release binding before a new full grant prefix); replay branch revalidates anonymous authority and returns only old publicReference even after grant consumed/revoked/expired. Miss: original M02 lockGrant complete reviewed prefix/receipt -> second replay -> current schema and active category FOR SHARE then destination FOR SHARE, privacy and feedback checks -> INSERT registration/ack -> same exact TX consume -> audit -> idempotency success. No provider call/framework save inside locks. A unique/changed-pointer loser fully rolls back and only checks replay under fresh anonymous authority in a new transaction; no winner means safe conflict, never a new key or automatic second mutation. All inputs, raw hash bytes and tokens stay out of logs/results.

Feedback generation: check grant/schema in a short transaction, invoke mock/manual port outside locks, recheck original grant/current authority in another short transaction before saving digest-bound feedback; grant replacement/expiry between calls causes safe denial. Submit revalidates token context/MRN fingerprint/ward/mode/key/adapter/deadline after grant locks. It cannot substitute for U03/C09 evidence.

Review: existing C13 exact receipt barrier before any SQL; root re-read/CAS SUBMITTED+expectedVersion, current server owner/role/counter without acquiring earlier locks late, source/time/actor from server; root/evidence changes only. M04 owns audit/idempotency in its same outer transaction.

Approved shared exceptions are main.tsx single PUBLIC composition, legacy fixture/count updates and C16 optional compact RegistrationEntry presentation (default false). C16 relocates original help copy to native keyboard-accessible details; it changes no authority/polling/fieldset behavior. V1–V4/client/App/global CSS/generated/dependencies remain unchanged. Handwritten code has English responsibility and boundary comments. Actual validation is recorded in BACKEND_CHECKPOINT.md and TEST_RESULTS.md; M04 service/HTTP integration and coordinator module approval remain separate.
