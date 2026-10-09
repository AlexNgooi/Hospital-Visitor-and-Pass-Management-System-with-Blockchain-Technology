# M03 questions and decisions

Baseline f59baf3; implementation permission confirmed 2026-10-09. Technical questions are sent directly to the coordinator; human decisions remain centralized there.

| Item | Status | Owner / next action |
|---|---|---|
| Isolated baseline/branch | Resolved | Managed worktree created; branch codex/hsaas-m03-visitor-registration |
| V5 migration allocation | Reserved, DDL not approved | M03 supplies candidate DDL after input selection; coordinator reviews; V1–V4 immutable |
| Legacy QR parent fixtures / migration count changes | Approved minimal exception | M03 adapts only after real registration FK exists, preserving original assertions |
| main.tsx feature composition | Approved minimal exception | M03 supplies one PUBLIC registration slot wrapped in M02 RegistrationEntry and retains M02 staff slot |
| DEMO-only vs formal-looking identity/MRN fields | Waiting for human decision in coordinator chat | No dependent rules/API/schema/DDL implementation before explicit answer |
| C09 evidence / source | Frozen | methodCode SYNTHETIC_RECORD_COMPARISON; basis whitelist; no note/attachment; server SYNTHETIC_MANUAL; mock does not verify |
| RegistrationReviewPort writes | Approved C13 direction; implemented/tested independent snapshot | One shared discover/lock/recordDecision; M03 owns exact-TX receipt and eventual root adapter, M04 HTTP/orchestration |
| RegistrationReviewPort reads | Precise projection pending S-V1 | No generic form_data DTO or alternative pagination; page/pageSize/items/total/serverNow wire retained |
| MRN status feedback / token bound | Direction accepted | MATCH/NO_MATCH/TIMEOUT/UNAVAILABLE; maximum five minutes and no later than grant; changed MRN/ward/context rejects old token; never patient data |

S-V1 candidate field lengths and privacy copy were sent to the coordinator. They are not hospital-approved data collection or retention policy.
