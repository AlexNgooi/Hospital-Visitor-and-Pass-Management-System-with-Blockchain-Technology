# R01 mock lookup boundary — 2026-10-27

- HospitalVerificationPort now provides source-compatible minimal lookup in addition to legacy feedback. SyntheticHospitalAdapter v2 returns only fixed synthetic name/ward/bed. No network or clinical record.
- Known mock MRNs DEMO-MRN-4821 / DEMO-MRN-MATCH resolve Pesakit Demo 4821, DEMO_WARD, DEMO-BED-01. Existing catalogue must contain active DEMO_WARD; missing/disabled ward produces UNAVAILABLE, never substitution or seeding.
- Current grant/session/formContext/CSRF/rate limit protects lookup before/after adapter work. Temporary server digest rows bind scope/context/MRN HMAC/ward/patient/adapter/schema/expiry. Browser Penjaga patient fields are rejected. No-match/timeout/unavailable/manual has null patient/proof; a selected manual ward remains available for staff confirmation.
- Lookup remains MOCK/SYNTHETIC and never staff approval. SQL, app, browser/business/live API checks NOT_RUN. Earlier M03 descriptions below are historical.

# M03 hospital boundary

- Inputs: C14/C15 synthetic MRN decision and R04/R05; no approved live endpoint or patient schema exists.
- Responsibility: minimum MATCH/NO_MATCH/TIMEOUT/UNAVAILABLE feedback outside registration transaction locks.
- Outputs: one port and deterministic mock/manual adapter; no network, patient details, clinical record or message.
- Verification: synthetic fixture outcomes and original-session/context/MRN/ward token binding; mock success never marks staff verification.
- Future: live adapter requires separately approved hospital integration and cannot be enabled by changing a public field.
