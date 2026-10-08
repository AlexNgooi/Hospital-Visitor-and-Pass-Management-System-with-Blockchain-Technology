-- M00 owns identity/reference tables. No real account or credential is seeded.
CREATE TABLE identity_policy_gate (id INT PRIMARY KEY);
INSERT INTO identity_policy_gate VALUES (1);
CREATE TABLE bootstrap_state (id INT PRIMARY KEY, completed BOOLEAN NOT NULL DEFAULT FALSE);
INSERT INTO bootstrap_state VALUES (1, FALSE);
CREATE TABLE users (
 id BIGINT PRIMARY KEY AUTO_INCREMENT,
 login VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL, role VARCHAR(32) NOT NULL,
 active BOOLEAN NOT NULL DEFAULT TRUE, version BIGINT NOT NULL DEFAULT 0,
 security_epoch BIGINT NOT NULL DEFAULT 0,
 created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
 CONSTRAINT users_role CHECK (role IN ('ADMIN','COUNTER_STAFF')),
 CONSTRAINT users_login CHECK (REGEXP_LIKE(login, '^[a-z0-9][a-z0-9._-]{2,63}$', 'c')
  AND NOT REGEXP_LIKE(login, '[^a-z0-9._-]', 'c'))
);
CREATE TABLE counters (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, code VARCHAR(64) NOT NULL UNIQUE,
 name VARCHAR(120) NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, version BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE visitor_categories (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, code VARCHAR(64) NOT NULL UNIQUE,
 name VARCHAR(120) NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, version BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE destinations (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, code VARCHAR(64) NOT NULL UNIQUE,
 name VARCHAR(120) NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, version BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE user_counter_permissions (
 user_id BIGINT NOT NULL, counter_id BIGINT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
 version BIGINT NOT NULL DEFAULT 0, PRIMARY KEY (user_id,counter_id),
 FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (counter_id) REFERENCES counters(id)
);
-- Safe actions share the caller's transaction. There is no notification/outbox table.
CREATE TABLE audit_events (
 event_id CHAR(36) PRIMARY KEY, action VARCHAR(64) NOT NULL, target_ref VARCHAR(128) NOT NULL,
 actor_id BIGINT NULL, snapshot_version INT NOT NULL, safe_snapshot JSON NOT NULL,
 occurred_at DATETIME(6) NOT NULL, FOREIGN KEY(actor_id) REFERENCES users(id)
);
CREATE TABLE idempotency_records (
 scope_kind VARCHAR(16) NOT NULL, scope_id VARCHAR(64) NOT NULL,
 operation VARCHAR(64) NOT NULL, target_ref VARCHAR(128) NOT NULL,
 command_key CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 request_hash BINARY(32) NOT NULL, encoding_version INT NOT NULL, hash_key_version VARCHAR(64) NOT NULL,
 http_status INT NOT NULL, safe_result JSON NOT NULL,
 created_at DATETIME(6) NOT NULL, expires_at DATETIME(6) NOT NULL,
 PRIMARY KEY(scope_kind,scope_id,operation,target_ref,command_key),
 CONSTRAINT idempotency_scope CHECK(scope_kind IN ('USER','ANONYMOUS'))
);
