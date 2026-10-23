# Manual demonstration scripts contract

Input: reviewed M00–M07 application, module flags and `docs/runbooks/MANUAL_M00_M07.md`.

Responsibility: user-invoked isolated demonstration startup, exact owned-resource cleanup and local demonstration backup/restore. These scripts do not run acceptance tests or touch the native database. Reference/account seeds are explicitly synthetic; registration/card/assignment workflows remain real application operations.

Output: ignored `Implementation/tmp/manual-demo/` runtime logs, control metadata and backup bundles. Bundles contain synthetic database data and matching demonstration keys; keep them private and outside Git. Stop deletes only the verified owned disposable container; backups survive.

Resume support (2026-10-23): `resume` accepts only the exact saved container ID with matching name/owner label and demonstration database/user, and never re-seeds or deletes that database. Cleanup/stop retains a resumed database, its identity and private runtime keys. New launches retain versioned signing/hash keys in ignored runtime-keys.json for future resumes. Legacy containers without persisted keys use a new key version and revoke old browser/QR/unfinished-scan authority before service startup; old unavailable key versions fail closed. Connection credentials are read internally only from this verified container and never printed. Fresh `start`/restore retains its original disposable-stop behavior.

Verification: `node --check manual-demo.mjs` is a syntax check only. User-invoked `node manual-demo.mjs check` performs read-only Java/artifact/Docker/port/container-name preflight and never creates containers, starts applications or writes runtime files. Fixed error codes/stages explain preparation failures without printing raw subprocess errors or private arguments. Java/backend compilation and successful preflight do not establish startup, migrations or business acceptance. The user starts and tests the application.
