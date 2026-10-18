-- M05 V6: coordinator C18/C19 approved this simulation schema; V1-V5 remain immutable.
-- Simulation has no machine credential, notification queue, outbox or external calls.
CREATE TABLE system_settings (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, setting_key VARCHAR(64) NOT NULL UNIQUE,
 value_int INT NOT NULL, version BIGINT NOT NULL DEFAULT 0,
 updated_by BIGINT NULL, updated_at DATETIME(6) NOT NULL,
 FOREIGN KEY(updated_by) REFERENCES users(id),
 CONSTRAINT setting_hours CHECK(value_int BETWEEN 1 AND 720),
 CONSTRAINT setting_version CHECK(version BETWEEN 0 AND 9007199254740991)
);
-- These 24-hour defaults are explicit demonstration rules, never approved hospital policy.
INSERT INTO system_settings(setting_key,value_int,version,updated_at) VALUES
 ('return_hours_EXECUTIVE',24,0,UTC_TIMESTAMP(6)),('return_hours_PENJAGA',24,0,UTC_TIMESTAMP(6)),
 ('return_hours_VENDOR',24,0,UTC_TIMESTAMP(6)),('return_hours_CONTRACTOR',24,0,UTC_TIMESTAMP(6));
CREATE TABLE reader_devices (
 id CHAR(36) PRIMARY KEY, counter_id BIGINT NOT NULL UNIQUE, active BOOLEAN NOT NULL DEFAULT TRUE,
 active_scan_job_id CHAR(36) NULL, data_origin VARCHAR(16) NOT NULL, environment VARCHAR(16) NOT NULL,
 FOREIGN KEY(counter_id) REFERENCES counters(id),
 CONSTRAINT reader_simulation CHECK(data_origin='SIMULATED' AND environment IN ('synthetic','test'))
);
CREATE TABLE scan_jobs (
 id CHAR(36) PRIMARY KEY, device_id CHAR(36) NOT NULL, actor_id BIGINT NOT NULL,
 owner_context_id CHAR(36) NOT NULL, counter_id BIGINT NOT NULL, purpose VARCHAR(16) NOT NULL,
 target_ref VARCHAR(64) NOT NULL, nonce_digest BINARY(32) NOT NULL, lease_digest BINARY(32) NOT NULL,
 capability_key_version VARCHAR(64) NOT NULL,
 expires_at DATETIME(6) NOT NULL, status VARCHAR(16) NOT NULL, created_at DATETIME(6) NOT NULL,
 consumed_at DATETIME(6) NULL, environment VARCHAR(16) NOT NULL,
 FOREIGN KEY(device_id) REFERENCES reader_devices(id), FOREIGN KEY(actor_id) REFERENCES users(id),
 FOREIGN KEY(owner_context_id) REFERENCES auth_session_contexts(id), FOREIGN KEY(counter_id) REFERENCES counters(id),
 CONSTRAINT scan_purpose CHECK(purpose IN ('ENROLL','ISSUE','RETURN','RESTORE')),
 CONSTRAINT scan_status CHECK(status IN ('CLAIMED','SUCCEEDED','CONSUMED','CANCELLED','EXPIRED')),
 CONSTRAINT scan_environment CHECK(environment IN ('synthetic','test')),
 CONSTRAINT scan_consumption CHECK((status='CONSUMED' AND consumed_at IS NOT NULL) OR (status<>'CONSUMED' AND consumed_at IS NULL)),
 CONSTRAINT scan_window CHECK(created_at<expires_at), INDEX scan_expiry(status,expires_at)
);
ALTER TABLE reader_devices ADD CONSTRAINT active_scan_parent FOREIGN KEY(active_scan_job_id) REFERENCES scan_jobs(id);
CREATE TABLE scan_results (
 id CHAR(36) PRIMARY KEY, job_id CHAR(36) NOT NULL UNIQUE, normalized_uid VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 profile_code VARCHAR(64) NOT NULL, category_code VARCHAR(16) NOT NULL, sample_code VARCHAR(64) NOT NULL,
 data_origin VARCHAR(16) NOT NULL, environment VARCHAR(16) NOT NULL, accepted_at DATETIME(6) NOT NULL,
 FOREIGN KEY(job_id) REFERENCES scan_jobs(id),
 CONSTRAINT result_simulation CHECK(data_origin='SIMULATED' AND environment IN ('synthetic','test'))
);
CREATE TABLE cards (
 id CHAR(36) PRIMARY KEY, normalized_uid VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 card_code VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 category_id BIGINT NOT NULL, category_code VARCHAR(16) NOT NULL, profile_code VARCHAR(64) NOT NULL,
 status VARCHAR(16) NOT NULL, version BIGINT NOT NULL DEFAULT 0,
 enrolled_by BIGINT NOT NULL, enrolled_at DATETIME(6) NOT NULL,
 data_origin VARCHAR(16) NOT NULL, environment VARCHAR(16) NOT NULL,
 FOREIGN KEY(category_id) REFERENCES visitor_categories(id), FOREIGN KEY(enrolled_by) REFERENCES users(id),
 CONSTRAINT card_status CHECK(status IN ('AVAILABLE','ISSUED','OVERDUE','LOST','DISABLED')),
 CONSTRAINT card_category CHECK(category_code IN ('EXECUTIVE','PENJAGA','VENDOR','CONTRACTOR')),
 CONSTRAINT card_version CHECK(version BETWEEN 0 AND 9007199254740991),
 CONSTRAINT card_simulation CHECK(data_origin='SIMULATED' AND environment IN ('synthetic','test')),
 INDEX card_inventory(status,category_code,id)
);
CREATE TABLE card_assignments (
 id CHAR(36) PRIMARY KEY, pass_reference VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 card_id CHAR(36) NOT NULL, registration_id BIGINT NOT NULL, issue_counter_id BIGINT NOT NULL,
 return_counter_id BIGINT NOT NULL, issued_by BIGINT NOT NULL, issued_at DATETIME(6) NOT NULL,
 due_at DATETIME(6) NOT NULL, return_rule_key VARCHAR(64) NOT NULL, return_rule_version BIGINT NOT NULL,
 handover_confirmed_at DATETIME(6) NOT NULL, returned_by BIGINT NULL, returned_at DATETIME(6) NULL,
 closed_at DATETIME(6) NULL, closure_reason VARCHAR(16) NULL, version BIGINT NOT NULL DEFAULT 0,
 operation_origin VARCHAR(16) NOT NULL, environment VARCHAR(16) NOT NULL,
 active_card_id CHAR(36) GENERATED ALWAYS AS (CASE WHEN closed_at IS NULL THEN card_id ELSE NULL END) STORED,
 active_registration_id BIGINT GENERATED ALWAYS AS (CASE WHEN closed_at IS NULL THEN registration_id ELSE NULL END) STORED,
 UNIQUE(active_card_id), UNIQUE(active_registration_id),
 FOREIGN KEY(card_id) REFERENCES cards(id), FOREIGN KEY(registration_id) REFERENCES visitor_registrations(id),
 FOREIGN KEY(issue_counter_id) REFERENCES counters(id), FOREIGN KEY(return_counter_id) REFERENCES counters(id),
 FOREIGN KEY(issued_by) REFERENCES users(id), FOREIGN KEY(returned_by) REFERENCES users(id),
 CONSTRAINT assignment_window CHECK(issued_at<due_at),
 CONSTRAINT assignment_handover CHECK(handover_confirmed_at=issued_at),
 CONSTRAINT assignment_rule_version CHECK(return_rule_version BETWEEN 0 AND 9007199254740991),
 CONSTRAINT assignment_rule_key CHECK(return_rule_key IN ('return_hours_EXECUTIVE','return_hours_PENJAGA','return_hours_VENDOR','return_hours_CONTRACTOR')),
 CONSTRAINT assignment_version CHECK(version BETWEEN 0 AND 9007199254740991),
 CONSTRAINT assignment_simulation CHECK(operation_origin='SIMULATED' AND environment IN ('synthetic','test')),
 CONSTRAINT assignment_closure CHECK((closed_at IS NULL AND closure_reason IS NULL AND returned_at IS NULL AND returned_by IS NULL)
  OR (closed_at IS NOT NULL AND closed_at>=issued_at AND closure_reason IS NOT NULL AND closure_reason='LOST' AND returned_at IS NULL AND returned_by IS NULL)
  OR (closed_at IS NOT NULL AND closed_at>=issued_at AND closure_reason IS NOT NULL AND closure_reason='RETURNED' AND returned_at IS NOT NULL AND returned_at=closed_at AND returned_by IS NOT NULL)),
 INDEX assignment_due(closed_at,due_at,id), INDEX assignment_issued(issued_at,id),
 INDEX assignment_returned(returned_at,id), INDEX assignment_registration(registration_id,issued_at)
);
CREATE TABLE lifecycle_events (
 id CHAR(36) PRIMARY KEY, assignment_id CHAR(36) NULL, card_id CHAR(36) NOT NULL, registration_id BIGINT NULL,
 event_type VARCHAR(32) NOT NULL, actor_id BIGINT NULL, occurred_at DATETIME(6) NOT NULL,
 reason_code VARCHAR(64) NULL, commitment_event_id CHAR(36) NOT NULL UNIQUE,
 overdue_assignment_id CHAR(36) GENERATED ALWAYS AS (CASE WHEN event_type='OVERDUE' THEN assignment_id ELSE NULL END) STORED UNIQUE,
 FOREIGN KEY(assignment_id) REFERENCES card_assignments(id), FOREIGN KEY(card_id) REFERENCES cards(id),
 FOREIGN KEY(registration_id) REFERENCES visitor_registrations(id), FOREIGN KEY(actor_id) REFERENCES users(id),
 FOREIGN KEY(commitment_event_id) REFERENCES audit_events(event_id),
 CONSTRAINT lifecycle_type CHECK(event_type IN ('CARD_REGISTERED','ISSUED','RETURNED','OVERDUE','MARKED_LOST','DISABLED','RESTORED','CONTACT_REVEALED','FOLLOWUP_RECORDED')),
 INDEX lifecycle_history(card_id,occurred_at,id), INDEX lifecycle_assignment(assignment_id,occurred_at,id)
);
CREATE TABLE overdue_alerts (
 assignment_id CHAR(36) PRIMARY KEY, created_at DATETIME(6) NOT NULL, resolved_at DATETIME(6) NULL,
 last_followup_at DATETIME(6) NULL, FOREIGN KEY(assignment_id) REFERENCES card_assignments(id)
);
CREATE TABLE assignment_followups (
 id CHAR(36) PRIMARY KEY, assignment_id CHAR(36) NOT NULL, actor_id BIGINT NOT NULL,
 reason_code VARCHAR(64) NOT NULL, created_at DATETIME(6) NOT NULL,
 FOREIGN KEY(assignment_id) REFERENCES card_assignments(id), FOREIGN KEY(actor_id) REFERENCES users(id),
 CONSTRAINT followup_reason CHECK(reason_code IN ('CONTACT_ATTEMPTED','CONTACTED_RETURN_REQUESTED','NO_ANSWER','ESCALATED_INTERNALLY')),
 INDEX followup_history(assignment_id,created_at,id)
);
CREATE TABLE lost_cases (
 id CHAR(36) PRIMARY KEY, card_id CHAR(36) NOT NULL, assignment_id CHAR(36) NULL,
 opened_at DATETIME(6) NOT NULL, opened_by BIGINT NOT NULL, reason_code VARCHAR(64) NOT NULL,
 resolved_at DATETIME(6) NULL, resolved_by BIGINT NULL, recovery_scan_result_id CHAR(36) NULL,
 unresolved_card_id CHAR(36) GENERATED ALWAYS AS (CASE WHEN resolved_at IS NULL THEN card_id ELSE NULL END) STORED UNIQUE,
 FOREIGN KEY(card_id) REFERENCES cards(id), FOREIGN KEY(assignment_id) REFERENCES card_assignments(id),
 FOREIGN KEY(opened_by) REFERENCES users(id), FOREIGN KEY(resolved_by) REFERENCES users(id),
 FOREIGN KEY(recovery_scan_result_id) REFERENCES scan_results(id),
 CONSTRAINT lost_resolution CHECK((resolved_at IS NULL AND resolved_by IS NULL AND recovery_scan_result_id IS NULL)
  OR (resolved_at IS NOT NULL AND resolved_at>=opened_at AND resolved_by IS NOT NULL AND recovery_scan_result_id IS NOT NULL))
);
