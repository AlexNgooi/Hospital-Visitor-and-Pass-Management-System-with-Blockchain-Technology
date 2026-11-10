# Native infrastructure contract

Input: explicit user request on 2026-11-10 to remove Docker from normal webapp operation.
Responsibility: loopback native MySQL configuration for a dedicated synthetic schema/account, hsaas_manual_native.
Outputs: .env.native.example.json, README and MANUAL_NATIVE.md. Private .env.native.json is ignored. Compose was removed.
Verification: static config review, launcher syntax and application build checks only. The assistant does not start services or execute migrations.
Boundary: no access to old hsaas_db, automatic Docker data adoption, container deletion or Testcontainers fallback. Stop retains the dedicated schema, keys and backups.
