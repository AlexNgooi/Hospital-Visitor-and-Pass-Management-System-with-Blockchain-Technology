# M03 questions and decisions

Baseline f59baf3; implementation permission confirmed 2026-10-09. Technical questions are sent directly to the coordinator; human decisions remain centralized there.

| Item | Status | Owner / next action |
|---|---|---|
| Isolated baseline/branch | Resolved | Managed worktree created; branch codex/hsaas-m03-visitor-registration |
| V5 migration allocation | C15 approved and actual V5 implemented | 869c6cb checkpoint, clean/upgrade tested; V1–V4 immutable |
| Legacy QR parent fixtures / migration count changes | Approved minimal exception | M03 adapts only after real registration FK exists, preserving original assertions |
| main.tsx feature composition | Approved minimal exception | M03 supplies one PUBLIC registration slot wrapped in M02 RegistrationEntry and retains M02 staff slot |
| DEMO-only vs formal-looking identity/MRN fields | Resolved C14, DEMO-only | Only TEST_ID/DEMO-/DEMO-MRN- implemented; formal hospital formats remain deferred |
| C09 evidence / source | Frozen | methodCode SYNTHETIC_RECORD_COMPARISON; basis whitelist; no note/attachment; server SYNTHETIC_MANUAL; mock does not verify |
| RegistrationReviewPort writes | Approved C13 direction; implemented/tested independent snapshot | One shared discover/lock/recordDecision; M03 owns exact-TX receipt and single implemented root adapter, M04 HTTP/orchestration |
| RegistrationReviewPort reads | C15 approved and implemented | No generic form_data DTO or alternative pagination; page/pageSize/items/total/serverNow wire retained |
| MRN status feedback / token bound | C15 implemented/tested | MATCH/NO_MATCH/TIMEOUT/UNAVAILABLE; maximum five minutes and no later than grant; changed MRN/ward/context rejects old token; never patient data |

S-V1 candidate field lengths and privacy copy were sent to the coordinator. They are not hospital-approved data collection or retention policy.

C15 actual SQL/API/read dependency checkpoint: 869c6cb, independently accepted by coordinator for M04 integration. C16 approved the minimal compact M02 presentation exception; no auth/grant/poll/fieldset behavior change. Schema initial-failure retry is explicit, original-context-bound, and guarded by the unchanged parent. A fixed action overlay was rejected/removed after actual measurements; final UI evidence measures normal actions and separate expanded-help/error/zoom scrolling.
