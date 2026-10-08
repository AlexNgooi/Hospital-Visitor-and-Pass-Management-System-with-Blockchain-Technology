-- Framework session rows are read by M00; no foreign key couples their cleanup to domain state.
CREATE TABLE app_session_bindings (
 id CHAR(36) PRIMARY KEY, spring_primary_id CHAR(36) NOT NULL UNIQUE,
 anonymous_scope_id CHAR(36) NOT NULL UNIQUE,
 anonymous_created_at DATETIME(6) NOT NULL, anonymous_expires_at DATETIME(6) NOT NULL,
 current_owner_context_id CHAR(36) NULL, generation BIGINT NOT NULL DEFAULT 0,
 invalidated_at DATETIME(6) NULL
);
CREATE TABLE auth_session_contexts (
 id CHAR(36) PRIMARY KEY, binding_id CHAR(36) NOT NULL, actor_id BIGINT NOT NULL,
 captured_security_epoch BIGINT NOT NULL, generation BIGINT NOT NULL,
 authenticated_at DATETIME(6) NOT NULL, absolute_expires_at DATETIME(6) NOT NULL,
 activation_expires_at DATETIME(6) NOT NULL, confirmed_idle_expires_at DATETIME(6) NULL,
 state VARCHAR(16) NOT NULL, revoked_at DATETIME(6) NULL,
 FOREIGN KEY(binding_id) REFERENCES app_session_bindings(id),
 FOREIGN KEY(actor_id) REFERENCES users(id),
 CONSTRAINT auth_context_state CHECK(state IN ('PENDING','ACTIVE','REVOKED')),
 INDEX auth_context_actor(actor_id,binding_id)
);
-- The current pointer is set only after a context exists; old context IDs are never reused.
ALTER TABLE app_session_bindings ADD CONSTRAINT binding_owner_context
 FOREIGN KEY(current_owner_context_id) REFERENCES auth_session_contexts(id);
