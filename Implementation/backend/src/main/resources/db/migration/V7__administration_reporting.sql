-- M06 C19-approved migration: configuration/permission reasons and immutable safe before/after reference values.
-- system_settings is V6-owned; V7 must not duplicate it or rewrite V1-V6.
CREATE TABLE administration_history (
 id BIGINT PRIMARY KEY AUTO_INCREMENT,
 entity_kind VARCHAR(16) NOT NULL, entity_id VARCHAR(128) NOT NULL,
 previous_version BIGINT NULL, version BIGINT NOT NULL,
 previous_value JSON NULL, current_value JSON NULL,
 reason_code VARCHAR(32) NOT NULL, actor_id BIGINT NOT NULL, changed_at DATETIME(6) NOT NULL,
 FOREIGN KEY(actor_id) REFERENCES users(id),
 CONSTRAINT administration_history_kind CHECK(entity_kind IN ('USER','PERMISSION','CATEGORY','DESTINATION','COUNTER','SETTING','EXPORT')),
 CONSTRAINT administration_history_reason CHECK(reason_code IN ('POLICY_UPDATE','STAFF_ONBOARDING','ACCESS_REVIEW','REFERENCE_CORRECTION','OPERATIONS_CHANGE','REPORT_EXPORT')),
 CONSTRAINT administration_history_version CHECK(version BETWEEN 0 AND 9007199254740991 AND (previous_version IS NULL OR previous_version BETWEEN 0 AND 9007199254740990)),
 INDEX administration_history_time(changed_at,id), INDEX administration_history_target(entity_kind,entity_id,id)
);
-- Exports record only bounded filters, count and the administrator; CSV bodies never enter audit storage.
CREATE TABLE report_exports (
 id CHAR(36) PRIMARY KEY, actor_id BIGINT NOT NULL,
 from_date DATE NOT NULL, to_date DATE NOT NULL,
 category_id BIGINT NULL, destination_id BIGINT NULL,
 created_at DATETIME(6) NOT NULL, row_count INT NOT NULL,
 FOREIGN KEY(actor_id) REFERENCES users(id), FOREIGN KEY(category_id) REFERENCES visitor_categories(id),
 FOREIGN KEY(destination_id) REFERENCES destinations(id),
 CONSTRAINT report_export_range CHECK(from_date<=to_date), CONSTRAINT report_export_count CHECK(row_count BETWEEN 0 AND 10000),
 INDEX report_export_actor_time(actor_id,created_at)
);
