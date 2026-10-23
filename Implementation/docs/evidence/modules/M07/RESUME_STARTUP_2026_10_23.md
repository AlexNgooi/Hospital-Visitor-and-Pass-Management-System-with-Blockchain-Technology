# User-requested demonstration startup — 2026-10-23

The user explicitly requested starting the currently testable application. Docker Linux Engine was reachable, but application ports were free and the exact original demonstration container was stopped. Its full ID matched the saved control identity, exact name and original owner label. The container was not removed or re-seeded.

Coordinator added safe `resume` support in `394285b02ba30576394259e5a4cdf6d236a91794`. Resume checks the saved identity plus container name/label and demonstration database/user; connection credentials are read only internally from that verified container and never printed. It restarts this database and the existing backend/frontend. Stop/failure cleanup retains a resumed database and private runtime key/identity files, while fresh-start disposable behavior is unchanged.

The legacy launcher had not saved its in-memory signing/hash keys. This resume used a new key version and revoked old login, QR and incomplete scan authority before app startup. Business roots, loans and audit/history were retained; no reference/user seed was repeated. Private versioned runtime keys are now saved only under ignored tmp/manual-demo/runtime-keys.json for subsequent resumes. Missing historical keys do not become a replay bypass.

Observed startup result:

- Launcher PID 20484 reported READY; existing owned container became running.
- Backend loopback18407 `/api/health`: HTTP200.
- Frontend loopback15417 `/login`: HTTP200.
- Private control loopback15418 belongs to the launcher.
- Node source syntax and Git whitespace checks passed. Post-start strict key-version type guards were source/syntax reviewed; no unnecessary restart was performed for those fail-closed guard changes.

The launcher was started hidden in the background so the user can continue testing. These are infrastructure/readiness results only: no login, registration, review, issue/return, report, browser/UAT or backup/restore business checks were executed. The old native database and unrelated user output directories were untouched. No push/deployment or new module startup.
