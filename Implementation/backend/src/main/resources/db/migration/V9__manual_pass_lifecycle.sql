-- R02 forward-only migration approved by coordinator C-R03; V1-V7 remain immutable.
-- Existing settings keep their numeric defaults. NULL is an explicit no-deadline default.
ALTER TABLE system_settings DROP CHECK setting_hours;
ALTER TABLE system_settings MODIFY value_int INT NULL;
ALTER TABLE system_settings ADD CONSTRAINT setting_hours CHECK(value_int IS NULL OR value_int BETWEEN 1 AND 720);

-- Manual enrollment has no invented UID/profile; historical scan evidence keeps its original meaning.
ALTER TABLE cards DROP CHECK card_simulation;
ALTER TABLE cards MODIFY normalized_uid VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL,
 MODIFY profile_code VARCHAR(64) NULL,
 ADD enrollment_method VARCHAR(16) NOT NULL DEFAULT 'SCAN',
 ADD destination_id BIGINT NULL,
 ADD CONSTRAINT card_destination FOREIGN KEY(destination_id) REFERENCES destinations(id),
 ADD CONSTRAINT card_provenance CHECK(environment IN ('synthetic','test') AND
  ((enrollment_method='SCAN' AND data_origin='SIMULATED' AND normalized_uid IS NOT NULL AND profile_code IS NOT NULL)
   OR (enrollment_method='MANUAL' AND data_origin='SYNTHETIC' AND normalized_uid IS NULL AND profile_code IS NULL AND destination_id IS NOT NULL)));

-- Preserve old rows, their deadlines and method. New destinations are immutable reference snapshots, never patient data.
ALTER TABLE card_assignments DROP CHECK assignment_window, DROP CHECK assignment_simulation,
 MODIFY due_at DATETIME(6) NULL,
 ADD category_code VARCHAR(16) NULL,
 ADD data_origin VARCHAR(16) NOT NULL DEFAULT 'SIMULATED',
 ADD destination_id BIGINT NULL,
 ADD destination_code VARCHAR(64) NULL,
 ADD destination_name VARCHAR(120) NULL,
 ADD closed_by BIGINT NULL,
 ADD CONSTRAINT assignment_destination FOREIGN KEY(destination_id) REFERENCES destinations(id),
 ADD CONSTRAINT assignment_closer FOREIGN KEY(closed_by) REFERENCES users(id);
UPDATE card_assignments a JOIN cards c ON c.id=a.card_id SET a.category_code=c.category_code;
UPDATE card_assignments SET closed_by=returned_by WHERE closure_reason='RETURNED';
UPDATE card_assignments a JOIN lost_cases l ON l.assignment_id=a.id SET a.closed_by=l.opened_by WHERE a.closure_reason='LOST';
-- The original active_registration_id generated column remains as a nonunique lookup for old queries.
ALTER TABLE card_assignments DROP INDEX active_registration_id,
 MODIFY category_code VARCHAR(16) NOT NULL,
 ADD INDEX assignment_active_registration(active_registration_id),
 ADD active_single_registration_id BIGINT GENERATED ALWAYS AS
  (CASE WHEN closed_at IS NULL AND category_code IN ('EXECUTIVE','PENJAGA') THEN registration_id ELSE NULL END) STORED,
 ADD UNIQUE KEY assignment_single_registration(active_single_registration_id),
 ADD CONSTRAINT assignment_category CHECK(category_code IN ('EXECUTIVE','PENJAGA','VENDOR','CONTRACTOR')),
 ADD CONSTRAINT assignment_window CHECK(due_at IS NULL OR issued_at<due_at),
 ADD CONSTRAINT assignment_provenance CHECK(environment IN ('synthetic','test') AND
  ((operation_origin='SIMULATED' AND data_origin='SIMULATED') OR
   (operation_origin='MANUAL' AND data_origin='SYNTHETIC' AND destination_id IS NOT NULL AND destination_code IS NOT NULL AND destination_name IS NOT NULL))),
 ADD CONSTRAINT assignment_closed_actor CHECK((closed_at IS NULL AND closed_by IS NULL) OR (closed_at IS NOT NULL AND (closed_by IS NOT NULL OR operation_origin='SIMULATED')));

-- Finding a lost card never fabricates a RETURN scan or returned_at on its closed loan.
ALTER TABLE lost_cases DROP CHECK lost_resolution, ADD recovery_method VARCHAR(16) NULL;
UPDATE lost_cases SET recovery_method='SCAN' WHERE resolved_at IS NOT NULL;
ALTER TABLE lost_cases ADD CONSTRAINT lost_resolution CHECK
 ((resolved_at IS NULL AND resolved_by IS NULL AND recovery_scan_result_id IS NULL AND recovery_method IS NULL)
  OR (resolved_at IS NOT NULL AND resolved_at>=opened_at AND resolved_by IS NOT NULL AND recovery_method IS NOT NULL
   AND ((recovery_method='SCAN' AND recovery_scan_result_id IS NOT NULL) OR (recovery_method='MANUAL' AND recovery_scan_result_id IS NULL))));
