-- R01 / coordinator C-R02: preserve all legacy roots, consents and immutable V1-V7 migrations.
-- The old primary destination remains compatible; the relation is the authoritative requested set for v2.
CREATE TABLE registration_destinations (
 registration_id BIGINT NOT NULL,
 destination_id BIGINT NOT NULL,
 PRIMARY KEY(registration_id,destination_id),
 FOREIGN KEY(registration_id) REFERENCES visitor_registrations(id),
 FOREIGN KEY(destination_id) REFERENCES destinations(id)
);
INSERT INTO registration_destinations(registration_id,destination_id)
 SELECT id,destination_id FROM visitor_registrations;

-- Temporary proof rows bind the minimal synthetic lookup snapshot without storing a raw MRN or token.
-- NULL preserves old proof history; new submissions reject old schema/adapter proof bindings.
ALTER TABLE mrn_validation_records
 ADD COLUMN patient_name VARCHAR(100) NULL,
 ADD COLUMN bed_label VARCHAR(64) NULL,
 ADD COLUMN field_schema_version VARCHAR(64) NULL;

-- Separate purposes retain independent policy versions and server timestamps; no signature or sending consent.
ALTER TABLE registration_consents DROP CHECK registration_privacy_only;
ALTER TABLE registration_consents ADD CONSTRAINT registration_consent_purpose
 CHECK(purpose IN ('PRIVACY_ACK','PASS_TERMS') AND granted=TRUE);
