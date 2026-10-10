-- M03 V5 was approved by coordinator C15; V1-V4 remain immutable.
-- Synthetic registrations are per application, never a merged person or patient master.
CREATE TABLE visitor_registrations (
 id BIGINT PRIMARY KEY AUTO_INCREMENT,
 public_reference VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 entry_grant_id CHAR(36) NOT NULL UNIQUE, anonymous_scope_id CHAR(36) NOT NULL,
 counter_id BIGINT NOT NULL, category_id BIGINT NOT NULL, category_code VARCHAR(16) NOT NULL,
 destination_id BIGINT NOT NULL, field_schema_version VARCHAR(64) NOT NULL,
 form_data JSON NOT NULL, environment VARCHAR(16) NOT NULL, data_origin VARCHAR(16) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'SUBMITTED', version BIGINT NOT NULL DEFAULT 0,
 mrn_mode VARCHAR(8) NULL, mrn_feedback VARCHAR(16) NULL,
 mrn_verified BOOLEAN NULL, ward_verified BOOLEAN NULL,
 submitted_at DATETIME(6) NOT NULL,
 reviewer_id BIGINT NULL, reviewed_at DATETIME(6) NULL,
 review_source VARCHAR(32) NULL, review_evidence JSON NULL, reject_reason VARCHAR(64) NULL,
 FOREIGN KEY(entry_grant_id) REFERENCES registration_entry_grants(id),
 FOREIGN KEY(counter_id) REFERENCES counters(id), FOREIGN KEY(category_id) REFERENCES visitor_categories(id),
 FOREIGN KEY(destination_id) REFERENCES destinations(id), FOREIGN KEY(reviewer_id) REFERENCES users(id),
 CONSTRAINT registration_category CHECK(category_code IN ('EXECUTIVE','PENJAGA','VENDOR','CONTRACTOR')),
 CONSTRAINT registration_state CHECK(status IN ('SUBMITTED','VERIFIED','REJECTED','CANCELLED')),
 CONSTRAINT registration_version CHECK(version BETWEEN 0 AND 9007199254740991),
 CONSTRAINT registration_synthetic CHECK(data_origin='SYNTHETIC'),
 CONSTRAINT registration_environment CHECK(environment IN ('development','synthetic','test')),
 CONSTRAINT registration_mrn_mode CHECK(mrn_mode IS NULL OR mrn_mode IN ('mock','manual')),
 CONSTRAINT registration_mrn_feedback CHECK(mrn_feedback IS NULL OR mrn_feedback IN ('NOT_CHECKED','MATCH','NO_MATCH','TIMEOUT','UNAVAILABLE')),
 CONSTRAINT registration_review_source CHECK(review_source IS NULL OR review_source IN ('SYNTHETIC_MANUAL','LOCAL')),
 INDEX registration_queue(counter_id,status,submitted_at,id),
 INDEX registration_category_time(category_code,submitted_at,id)
);
-- The parent row is inserted before the grant is consumed, all in the same domain transaction.
ALTER TABLE registration_entry_grants ADD CONSTRAINT grant_registration_parent
 FOREIGN KEY(registration_id) REFERENCES visitor_registrations(id);
-- Only the required privacy acknowledgement exists; disabled WhatsApp has no consent or job row.
CREATE TABLE registration_consents (
 registration_id BIGINT NOT NULL, purpose VARCHAR(32) NOT NULL,
 granted BOOLEAN NOT NULL, policy_version VARCHAR(64) NOT NULL, captured_at DATETIME(6) NOT NULL,
 PRIMARY KEY(registration_id,purpose), FOREIGN KEY(registration_id) REFERENCES visitor_registrations(id),
 CONSTRAINT registration_privacy_only CHECK(purpose='PRIVACY_ACK' AND granted=TRUE)
);
-- Feedback capabilities retain a digest, not the token/MRN/body; staff confirmation remains a separate decision.
CREATE TABLE mrn_validation_records (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, token_digest BINARY(32) NOT NULL UNIQUE,
 anonymous_scope_id CHAR(36) NOT NULL, grant_id CHAR(36) NOT NULL, binding_version BIGINT NOT NULL,
 mrn_fingerprint BINARY(32) NOT NULL, fingerprint_key_version VARCHAR(64) NOT NULL,
 ward_id BIGINT NOT NULL, mode VARCHAR(8) NOT NULL, adapter_version VARCHAR(64) NOT NULL,
 outcome VARCHAR(16) NOT NULL, created_at DATETIME(6) NOT NULL, expires_at DATETIME(6) NOT NULL,
 FOREIGN KEY(grant_id) REFERENCES registration_entry_grants(id), FOREIGN KEY(ward_id) REFERENCES destinations(id),
 CONSTRAINT mrn_feedback_mode CHECK(mode IN ('mock','manual')),
 CONSTRAINT mrn_feedback_outcome CHECK(outcome IN ('MATCH','NO_MATCH','TIMEOUT','UNAVAILABLE')),
 CONSTRAINT mrn_feedback_version CHECK(binding_version BETWEEN 1 AND 9007199254740991),
 CONSTRAINT mrn_feedback_window CHECK(created_at<expires_at),
 INDEX mrn_feedback_expiry(expires_at,id)
);
