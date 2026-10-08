# Risk Register

> 2026-10-08 当前版：按 01/12 的 coordinator 与独立 module chat 计划推进；动态 QR 当前 Must，真实卡/reader/API、WhatsApp/blockchain deferred（后两者 disabled）。下面涉及 provider/链的风险为启用前 readiness；当前不因它们阻塞 Web 版。需求/架构/API 为 02/03/04，UI v4 的 static print 等由 07 覆盖。

Review this register weekly and at every two-week demo. When a risk triggers, create or move a Trello card to Blocked with an owner, next action and review date.

| ID | Risk | Probability | Impact | Trigger | Mitigation | Contingency |
|---|---|---:|---:|---|---|---|
| R01 | HSAAS feedback or UAT participants are unavailable | High | High | Review response takes more than 5 working days or no UAT date by December | Book reviews two weeks ahead; send written acceptance criteria and short demo evidence | Request supervisor provisional decision; record assumptions and reschedule validation |
| R02 | Hospital MRN API specification, approval or credentials are unavailable | High | High | M09 live readiness lacks approved contract/credentials | Build synthetic mock/manual port now; live remains Conditional/DEFERRED | Current release documents mock/manual limitation; do not claim hospital API validation |
| R03 | Sui Testnet/public RPC/QuickNode is slow, rate-limited or unavailable | Medium | High | Repeated 429, timeout, indexing delay or failed demo smoke test | Local DB-first outbox; async worker; bounded backoff; idempotency; public/QuickNode endpoint switch | Keep pass operations local; show Pending; retry/reconcile later; switch provider for demo if justified |
| R04 | Testnet wallet has insufficient gas or key is unavailable | Medium | High | Low balance warning or worker start validation fails | Dedicated Testnet wallet, balance check before reviews, secret backup procedure | Refill through official Testnet faucet; rotate to a prepared wallet and update AuditWriter capability if necessary |
| R05 | Railway free credit/resource policy is insufficient | High | High | Usage alert, sleeping service, OOM, or projected cost above allowance | Develop locally; W2 deployment spike; small JVM/DB pool; start worker only for tests/demo; usage alerts | Obtain approval for a small temporary budget or shorten online windows; document free-plan limitation |
| R06 | Vercel-to-Railway CORS or environment mismatch | Medium | Medium | Local works but preview/production fails | Separate preview/production variables; explicit origins; HTTPS; staging smoke checklist | Roll back environment change and redeploy a known-good configuration |
| R07 | PII appears in logs, Testnet payload or test evidence | Medium | Critical | Name/IC/phone/MRN detected outside approved storage | Allowlisted payload schema; masked logs; synthetic data; automated/manual PII inspection | Stop deployment, rotate exposed secrets, remove off-chain copies where possible, report impact; Testnet data cannot be deleted, so prevention is mandatory |
| R08 | Concurrent staff actions double-issue a pass | Medium | High | Two issue requests succeed for one pass | DB transaction, locking/versioning, uniqueness rule, 409 conflict and concurrency test | Correct through audited admin workflow and open a P0 defect |
| R09 | Blockchain confirmation blocks the counter workflow | Medium | High | Issue/return response time follows RPC latency | Commit business event and outbox locally, return immediately, process chain asynchronously | Disable worker temporarily; continue local operation and reconcile later |
| R10 | Solo-developer overload or scope creep | High | High | WIP breach, card aging over 5 days, repeated new Should/Could work | WIP=2; Must/Should/Could; two-week review; split large cards; freeze scope by 20 December | Remove advanced export/charts, then live MRN, then cosmetic work; preserve correctness/testing/UAT |
| R11 | Dashboard data or timezone is incorrect | Medium | High | Display differs from database/golden fixture | Use Asia/Kuala_Lumpur policy, UTC storage, golden data and reconciliation tests | Disable misleading metric, correct aggregation and rerun evidence before release |
| R12 | Migration failure or database loss | Low | High | Failed Flyway deploy, corrupt/empty data, restore failure | Versioned migrations, pre-migration backup, restore rehearsal, controlled forward-fix/rollback notes | Restore last verified backup; redeploy known-good version; document any data loss |
| R13 | Stakeholder asks to use real visitor/patient data in demo | Medium | Critical | Real names/IC/MRN supplied or requested | Synthetic/anonymised data by default; documented data handling boundary | Do not use real data without written approval, minimum-data plan and institution policy review |
| R14 | Third Railway service for Sui worker raises cost/complexity | Medium | Medium | Worker pushes usage beyond budget or creates deployment instability | Keep worker minimal/private; poll MySQL; run locally for most development | Start it only during integration/demo; process queued PENDING events when available |
| R15 | Sui SDK/protocol changes during development | Medium | Medium | Build warnings, deprecated APIs or incompatible network change | Pin versions, follow official migration notes, isolate integration in worker/Gateway | Upgrade worker in a dedicated spike; keep local pass workflow unaffected |
| R16 | Paper form fields or business rules are not fully confirmed | High | Medium | HSAAS changes category fields after implementation | Baseline forms early; configurable references; validate through P1/P2 demo | Create controlled change cards and defer low-value fields to later cycle |
| R17 | Dynamic QR expires during scan or stale code remains displayed | Medium | High | Mobile cannot exchange during boundary; offline/sleep shows expired QR | Server UTC, 30s rotation/45s TTL defaults, no-store, hide expired code; grant independent of natural QR expiry | Preserve local form safely while grant valid; otherwise rescan; no static bypass |
| R18 | QR/grant can be bypassed or reused across scopes | Medium | High | Direct POST succeeds without grant; counter/category/session changed | Signed challenge + server row/revoke; atomic grant consumption/session binding/idempotency; rate limit | Block release of registration flow, correct server-side checks and rerun negative tests |
| R19 | Module chats overwrite shared files or merge incompatible contracts | Medium | High | Concurrent writes in same checkout; DTO/schema drift | Independent branch/worktree, ownership, coordinator contract/migration ledger, handoff/diff review | Return to owner; resolve against accepted contract; integration test before dependency release |
| R20 | Disabled integrations accumulate jobs or simulation is mistaken for real operation | Medium | High | Pending chain/message jobs with mode off; production accepts mock | Server gates, NOT_ENABLED/LOCAL_ONLY/SIMULATED, synthetic provenance and separated evidence; no automatic backfill | Stop affected path, fix mode enforcement; keep live tests NOT_RUN and revise report claims |

## Risk review record

For each weekly review record:

```text
Date | Risk ID | Current probability/impact | Trigger status | Action | Owner | Due date | Evidence
```

## Escalation thresholds

- Any privacy/real-patient-data risk: stop affected work immediately and request institutional/supervisor direction.
- Any P0 correctness defect in pass issue/return: stop release work until fixed or safely isolated.
- Blocked for more than two working days: escalate to the supervisor or relevant HSAAS contact.
- Railway/provider usage warning: stop unnecessary services and reassess the deployment window.
