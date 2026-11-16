-- Preserve existing credentials; only newly onboarded staff must replace a temporary password.
ALTER TABLE users
 ADD COLUMN full_name VARCHAR(120) NULL,
 ADD COLUMN email VARCHAR(254) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
 ADD COLUMN password_change_required BOOLEAN NOT NULL DEFAULT FALSE,
 ADD COLUMN temporary_password_expires_at DATETIME(6) NULL,
 ADD COLUMN onboarding_delivery VARCHAR(24) NOT NULL DEFAULT 'NOT_REQUIRED',
 ADD CONSTRAINT users_email_unique UNIQUE(email),
 ADD CONSTRAINT users_onboarding_delivery CHECK (onboarding_delivery IN ('NOT_REQUIRED','PENDING','ACCEPTED','UNKNOWN'));
-- A login is a safe fallback until an administrator supplies the staff member's display name.
UPDATE users SET full_name=login WHERE full_name IS NULL;
