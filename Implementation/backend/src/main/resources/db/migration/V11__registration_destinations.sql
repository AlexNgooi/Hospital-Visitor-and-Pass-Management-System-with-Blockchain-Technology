-- Forward-only: retain old inventory bindings and assignment snapshots as historical evidence.
ALTER TABLE destinations ADD destination_kind VARCHAR(8) NOT NULL DEFAULT 'OTHER',
 ADD CONSTRAINT destination_kind_allowed CHECK(destination_kind IN ('WARD','OTHER'));
-- Existing ward codes and ward references are classified without inventing new hospital locations.
UPDATE destinations d SET destination_kind='WARD' WHERE d.code='DEMO_WARD' OR d.code LIKE 'WARD%'
 OR EXISTS(SELECT 1 FROM visitor_registrations r WHERE r.destination_id=d.id AND r.category_code IN ('EXECUTIVE','PENJAGA'))
 OR EXISTS(SELECT 1 FROM mrn_validation_records m WHERE m.ward_id=d.id);

-- The first snapshot captures migration-time labels; older names cannot be reconstructed reliably.
ALTER TABLE registration_destinations ADD destination_code VARCHAR(64) NULL,
 ADD destination_name VARCHAR(120) NULL;
UPDATE registration_destinations rd JOIN destinations d ON d.id=rd.destination_id
 SET rd.destination_code=d.code,rd.destination_name=d.name;
ALTER TABLE registration_destinations MODIFY destination_code VARCHAR(64) NOT NULL,
 MODIFY destination_name VARCHAR(120) NOT NULL;

-- New physical stock has no destination restriction; old bindings remain readable but are not eligibility rules.
ALTER TABLE cards DROP CHECK card_provenance;
ALTER TABLE cards ADD CONSTRAINT card_provenance CHECK(environment IN ('synthetic','test') AND
 ((enrollment_method='SCAN' AND data_origin='SIMULATED' AND normalized_uid IS NOT NULL AND profile_code IS NOT NULL)
 OR (enrollment_method='MANUAL' AND data_origin='SYNTHETIC' AND normalized_uid IS NULL AND profile_code IS NULL)));

-- New loans inherit the complete registered set. Legacy per-pass destinations are never rewritten.
ALTER TABLE card_assignments ADD destination_scope VARCHAR(12) NOT NULL DEFAULT 'LEGACY',
 DROP CHECK assignment_provenance;
ALTER TABLE card_assignments ADD CONSTRAINT assignment_provenance CHECK(environment IN ('synthetic','test') AND
 destination_scope IN ('LEGACY','REGISTRATION') AND
 ((operation_origin='SIMULATED' AND data_origin='SIMULATED' AND destination_scope='LEGACY') OR
 (operation_origin='MANUAL' AND data_origin='SYNTHETIC' AND
  ((destination_scope='LEGACY' AND destination_id IS NOT NULL AND destination_code IS NOT NULL AND destination_name IS NOT NULL)
   OR (destination_scope='REGISTRATION' AND destination_id IS NULL AND destination_code IS NULL AND destination_name IS NULL)))));
CREATE TABLE assignment_destinations (
 assignment_id CHAR(36) NOT NULL,
 destination_id BIGINT NOT NULL,
 destination_code VARCHAR(64) NOT NULL,
 destination_name VARCHAR(120) NOT NULL,
 PRIMARY KEY(assignment_id,destination_id),
 FOREIGN KEY(assignment_id) REFERENCES card_assignments(id),
 FOREIGN KEY(destination_id) REFERENCES destinations(id)
);
