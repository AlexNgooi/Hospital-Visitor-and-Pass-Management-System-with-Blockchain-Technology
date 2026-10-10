# M03 hospital boundary

- Inputs: C14/C15 synthetic MRN decision and R04/R05; no approved live endpoint or patient schema exists.
- Responsibility: minimum MATCH/NO_MATCH/TIMEOUT/UNAVAILABLE feedback outside registration transaction locks.
- Outputs: one port and deterministic mock/manual adapter; no network, patient details, clinical record or message.
- Verification: synthetic fixture outcomes and original-session/context/MRN/ward token binding; mock success never marks staff verification.
- Future: live adapter requires separately approved hospital integration and cannot be enabled by changing a public field.
