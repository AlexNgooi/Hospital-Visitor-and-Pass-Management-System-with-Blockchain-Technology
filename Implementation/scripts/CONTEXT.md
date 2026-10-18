# Manual demonstration scripts contract

Input: reviewed M00–M07 application, module flags and `docs/runbooks/MANUAL_M00_M07.md`.

Responsibility: user-invoked isolated demonstration startup, exact owned-resource cleanup and local demonstration backup/restore. These scripts do not run acceptance tests or touch the native database. Reference/account seeds are explicitly synthetic; registration/card/assignment workflows remain real application operations.

Output: ignored `Implementation/tmp/manual-demo/` runtime logs, control metadata and backup bundles. Bundles contain synthetic database data and matching demonstration keys; keep them private and outside Git. Stop deletes only the verified owned disposable container; backups survive.

Verification: `node --check manual-demo.mjs` is a syntax check only. Java/backend compilation does not establish startup, migrations or business acceptance. The user starts and tests the application.
