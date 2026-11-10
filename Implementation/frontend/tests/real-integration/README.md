# Environment guard checks

The shared child-process allowlist now lives in `Implementation/scripts/child-environment.mjs`. This folder keeps the existing test import path and environment-check.mjs regression cases.

Pre-R01 real-browser launchers and their obsolete scanned-form fixtures were retired. Current browser/business acceptance uses the real application under [MANUAL_NATIVE](../../../docs/runbooks/MANUAL_NATIVE.md) and [R01-R03](../../../docs/runbooks/MANUAL_R01_R03.md). Backend SQL cases use [isolated native schemas](../../../backend/LOCAL_TESTING.md).

The environment tests check public inert values and refusal before resources are created. They never connect to a database or start application services. They were updated but not executed in this cleanup; syntax checks are separate from test PASS.
