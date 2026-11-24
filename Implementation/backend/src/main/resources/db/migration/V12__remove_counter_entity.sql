-- Preserve effective staff grants before removing the location-specific permission table.
ALTER TABLE users
    ADD COLUMN staff_access_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD CONSTRAINT users_staff_access_enabled CHECK (staff_access_enabled IN (FALSE, TRUE));

UPDATE users u SET staff_access_enabled = TRUE
WHERE u.role = 'COUNTER_STAFF'
  AND EXISTS (
    SELECT 1 FROM user_counter_permissions p JOIN counters c ON c.id = p.counter_id
    WHERE p.user_id = u.id AND p.active = TRUE AND c.active = TRUE
  );

-- Old in-flight capabilities were issued under location-specific rules. Preserve completed records.
UPDATE registration_qr_sessions SET revoked_at = UTC_TIMESTAMP(6) WHERE revoked_at IS NULL;
UPDATE registration_qr_challenges SET revoked_at = UTC_TIMESTAMP(6)
WHERE revoked_at IS NULL AND expires_at > UTC_TIMESTAMP(6);
UPDATE registration_entry_grants SET revoked_at = UTC_TIMESTAMP(6)
WHERE revoked_at IS NULL AND consumed_at IS NULL AND expires_at > UTC_TIMESTAMP(6);
UPDATE reader_devices SET active_scan_job_id = NULL WHERE active_scan_job_id IS NOT NULL;
UPDATE scan_jobs SET status = 'CANCELLED' WHERE status IN ('CLAIMED','SUCCEEDED');

-- InnoDB named the foreign keys in creation order in V4, V5 and V6.
ALTER TABLE registration_qr_sessions DROP FOREIGN KEY registration_qr_sessions_ibfk_3;
ALTER TABLE registration_qr_sessions DROP INDEX qr_counter, DROP COLUMN counter_id;

ALTER TABLE registration_entry_grants DROP FOREIGN KEY registration_entry_grants_ibfk_4;
ALTER TABLE registration_entry_grants DROP COLUMN counter_id;

ALTER TABLE visitor_registrations DROP FOREIGN KEY visitor_registrations_ibfk_2;
ALTER TABLE visitor_registrations DROP INDEX registration_queue, DROP COLUMN counter_id,
    ADD INDEX registration_queue (environment, submitted_at, id),
    ADD INDEX registration_queue_status (environment, status, submitted_at, id);

ALTER TABLE scan_jobs DROP FOREIGN KEY scan_jobs_ibfk_4;
ALTER TABLE scan_jobs DROP COLUMN counter_id;

ALTER TABLE reader_devices DROP FOREIGN KEY reader_devices_ibfk_1;
ALTER TABLE reader_devices DROP COLUMN counter_id;

ALTER TABLE card_assignments
    DROP FOREIGN KEY card_assignments_ibfk_3,
    DROP FOREIGN KEY card_assignments_ibfk_4;
ALTER TABLE card_assignments DROP COLUMN issue_counter_id, DROP COLUMN return_counter_id,
    ADD INDEX assignment_staff_open (environment, closed_at, issued_at, id),
    ADD INDEX assignment_staff_returned (environment, closure_reason, returned_at, id);

DROP TABLE user_counter_permissions;
DROP TABLE counters;
