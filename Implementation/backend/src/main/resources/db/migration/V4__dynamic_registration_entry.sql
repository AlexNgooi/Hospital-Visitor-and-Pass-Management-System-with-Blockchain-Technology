-- M02 owns entry capabilities. Framework sessions are referenced only through M00 domain bindings.
CREATE TABLE registration_qr_sessions (
 id CHAR(36) PRIMARY KEY, actor_id BIGINT NOT NULL, owner_context_id CHAR(36) NOT NULL,
 counter_id BIGINT NOT NULL, category_scope BIGINT NULL, environment VARCHAR(16) NOT NULL,
 created_at DATETIME(6) NOT NULL, revoked_at DATETIME(6) NULL,
 FOREIGN KEY(actor_id) REFERENCES users(id), FOREIGN KEY(owner_context_id) REFERENCES auth_session_contexts(id),
 FOREIGN KEY(counter_id) REFERENCES counters(id), FOREIGN KEY(category_scope) REFERENCES visitor_categories(id),
 INDEX qr_owner(owner_context_id,id), INDEX qr_counter(counter_id,id)
);
CREATE TABLE registration_qr_challenges (
 id CHAR(36) PRIMARY KEY, display_session_id CHAR(36) NOT NULL, rotation_slot BIGINT NOT NULL,
 nonce CHAR(43) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 token_version INT NOT NULL, key_version VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 issued_at DATETIME(6) NOT NULL, rotate_at DATETIME(6) NOT NULL, expires_at DATETIME(6) NOT NULL,
 revoked_at DATETIME(6) NULL,
 FOREIGN KEY(display_session_id) REFERENCES registration_qr_sessions(id),
 UNIQUE(display_session_id,rotation_slot), INDEX qr_key_expiry(key_version,expires_at),
 CONSTRAINT qr_slot CHECK(rotation_slot >= 0), CONSTRAINT qr_window CHECK(issued_at < rotate_at AND rotate_at < expires_at)
);
-- M03's registration table does not exist yet; a future migration adds its foreign key.
CREATE TABLE registration_entry_grants (
 id CHAR(36) PRIMARY KEY, grant_reference CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 binding_version BIGINT NOT NULL, anonymous_session_binding CHAR(36) NOT NULL,
 anonymous_scope_id CHAR(36) NOT NULL, challenge_id CHAR(36) NOT NULL, display_session_id CHAR(36) NOT NULL,
 counter_id BIGINT NOT NULL, category_scope BIGINT NULL, environment VARCHAR(16) NOT NULL,
 issued_at DATETIME(6) NOT NULL, expires_at DATETIME(6) NOT NULL, consumed_at DATETIME(6) NULL,
 registration_id BIGINT NULL UNIQUE, revoked_at DATETIME(6) NULL,
 replaces_grant_id CHAR(36) NULL, replaces_binding_version BIGINT NULL,
 FOREIGN KEY(anonymous_session_binding) REFERENCES app_session_bindings(id),
 FOREIGN KEY(challenge_id) REFERENCES registration_qr_challenges(id),
 FOREIGN KEY(display_session_id) REFERENCES registration_qr_sessions(id),
 FOREIGN KEY(counter_id) REFERENCES counters(id), FOREIGN KEY(category_scope) REFERENCES visitor_categories(id),
 FOREIGN KEY(replaces_grant_id) REFERENCES registration_entry_grants(id),
 UNIQUE(anonymous_scope_id,replaces_binding_version), INDEX grant_display(display_session_id,id),
 CONSTRAINT grant_version CHECK(binding_version BETWEEN 1 AND 9007199254740991),
 CONSTRAINT grant_replacement CHECK((replaces_grant_id IS NULL AND replaces_binding_version IS NULL)
  OR (replaces_grant_id IS NOT NULL AND replaces_binding_version IS NOT NULL)),
 CONSTRAINT grant_consumption CHECK((consumed_at IS NULL AND registration_id IS NULL)
  OR (consumed_at IS NOT NULL AND registration_id IS NOT NULL)),
 CONSTRAINT grant_window CHECK(issued_at < expires_at)
);
-- Lock this pointer before challenges/grants; only one current form exists per stable browser scope.
CREATE TABLE registration_entry_contexts (
 anonymous_scope_id CHAR(36) PRIMARY KEY, current_grant_id CHAR(36) NULL,
 binding_version BIGINT NOT NULL DEFAULT 0, updated_at DATETIME(6) NOT NULL,
 FOREIGN KEY(current_grant_id) REFERENCES registration_entry_grants(id),
 CONSTRAINT entry_version CHECK(binding_version BETWEEN 0 AND 9007199254740991)
);
