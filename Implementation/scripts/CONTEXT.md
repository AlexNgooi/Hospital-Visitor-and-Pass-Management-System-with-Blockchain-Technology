# Native application scripts contract

Input: reviewed application, current planning, and ignored infra/.env.native.json.
Responsibility: user-run startup/backup/stop on a separately provisioned loopback schema/account hsaas_manual_native. child-environment.mjs owns the OS/runtime allowlist and rejects inherited Spring/JVM injection before resources exist.
Output: ignored tmp/manual-demo-native/ logs, launch lock, control identity, persisted keys and complete private backup bundles.
Lifecycle: explicit start --initialize requires an empty dedicated schema; normal start/resume never seeds. Stop terminates owned application children, retaining database, keys and backups. Restore targets only an empty dedicated schema and a complete native bundle, then revokes old browser/QR/unfinished-scan authority.
Boundary: never creates/drops application schemas, controls MySQL, adopts old environments, or reads application secrets into output. Missing historical keys fail closed. No business/browser acceptance is run by the assistant.
Checks: node syntax, skip-tests package, seed compilation and frontend build/lint only. User-run check verifies Java/artifacts/dedicated native connection/ports without starting applications or mutating data. See docs/runbooks/MANUAL_NATIVE.md.

2026-11-16 user-authorized startup: --runtime-root explicitly selects an existing Implementation runtime directory while application artifacts stay in the source worktree. Private config/keys/control remain in place and are never copied between checkouts. --no-migrate disables Flyway for existing-schema startup and is rejected with initialize/restore. Stop retains the private control ownership guard.
