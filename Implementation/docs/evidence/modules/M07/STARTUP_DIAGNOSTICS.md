# Manual startup diagnostic follow-up — 2026-10-18

The user reported `manual-demo.mjs start` returning only the generic failure message. Coordinator inspection found the JAR, classpath and Vite dependency present, demonstration ports free, and Docker's Linux Engine named pipe unavailable. No native database fallback or application launch was attempted.

Source fix: `6eafa345bfa2a87c36e6c2526f8a0154acca614e`; current launcher Git blob `5f38f30f4b6aa1182302be3ed7924289b05b6a5a`. This supersedes only the original launcher/error instructions from runtime baseline `761491e`; backend, frontend, schemas, seed and business behavior are unchanged.

The launcher now has a read-only `check` command for Java version, prepared artifacts, Linux Docker Engine, available ports and unused container name. Startup uses the same preflight before creating anything. Fixed error codes explain missing preparation, unavailable Docker Engine, occupied ports, existing container or refused inherited configuration. Later failures identify a fixed stage/log path. Raw subprocess error messages, private arguments and configuration values are never printed. No safety guard is removed and Docker is not automatically started.

Necessary checks:

- `node --check Implementation/scripts/manual-demo.mjs`: exit0.
- `node Implementation/scripts/manual-demo.mjs check`: exit0 after Docker became available during diagnosis; read-only Docker information identified Linux Engine 29.8.0. No container, runtime file, seed or application was started by this command.
- A child process with an injected diagnostic-only Spring configuration value returned exit1 / CONFIGURATION_REFUSED, without echoing that value. No resources started.
- `git diff --check`: exit0. Backend/frontend sources unchanged, so their completed build checks were not repeated.

Actual application startup, V6/V7 migration, business testing and backup/restore remain NOT_RUN by the assistant. The user runs `start` and performs manual testing. No push, deployment or native-database operation.
