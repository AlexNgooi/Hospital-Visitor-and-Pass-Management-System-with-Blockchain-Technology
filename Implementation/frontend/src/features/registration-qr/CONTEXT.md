# Dynamic registration QR

- Inputs: planning/02 section 9, planning/03 R01/R06, planning/04 C07/C10/C12 and M01 feature/client/vault contracts.
- Responsibility: guarded live display and anonymous entry exchange/restart/recovery. Never implement M03 visitor fields or assume a QR proves physical presence.
- Outputs: feature-local React/TypeScript/CSS; main only injects exported FeatureSlots. QR rendering uses a locally bundled encoder; decoder is test-only.
- Verification: frontend test/typecheck/build/lint, actual QR decoding and visibility/offline/deadline/restart tests. Mobile camera and production HTTPS need separate evidence.
- Boundaries: memory-only entry and form context; no token/reference logging, static QR fallback, localStorage or direct cookie access. Shared API/auth/errors/router stay with M01.
- C16 coordinator exception (2026-10-10): M03 may opt into compact presentation. Its optional prop defaults false, preserves the heading/current authority/counter and relocates existing account/20-minute/privacy copy into native keyboard-accessible details. Presentation only; vault, grant, scope, restart, polling, timers and the exact disabled fieldset gate remain unchanged. M03 owns this small reviewed UI addition and its evidence.
