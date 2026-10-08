# Trello Board Guide

> 2026-10-08：本文件只指导本地任务组织，本轮未读取/修改外部 board。模块 ID 与 ownership 以 [12](12_THREE_MONTH_CHAT_PLAN.md) 为准；一个模块一个 chat，coordinator 审核/本地 merge。卡片增加 Module ID、chat、branch/worktree、baseline/head、Current/Deferred、handoff、review、merge SHA。当前 Done 须已集成验证；消息/链 deferred 放 Backlog，不靠日期自动移入 In Progress。

Live board: https://trello.com/b/XnospkpS/fyp-hsaas-visitor-pass-management-system

## 1. Lists from left to right

1. **00 Project Rules & Templates** - fixed rules, DoR, DoD, architecture decisions, milestones, risk register and card template.
2. **01 Inbox / New Feedback** - unanalysed supervisor/HSAAS feedback and new ideas.
3. **02 Product Backlog** - clarified work that is not ready for immediate implementation.
4. **03 Ready** - dependencies and acceptance criteria are complete; recommended maximum 8.
5. **04 In Progress (WIP 2)** - actively implemented work; hard limit 2.
6. **05 Review & Testing (WIP 2)** - implementation is complete and evidence is being produced; hard limit 2.
7. **06 HSAAS Validation (WIP 2)** - only cards requiring operational review/sign-off.
8. **07 Blocked** - blocker, owner, next action and review date are mandatory.
9. **08 Done - Current Milestone** - meets DoD but has not yet been archived as a release.
10. **09 Released / Archived** - completed milestone cards retained for cycle-time and FYP process evidence.

## 2. Card title rules

```text
[E3-US02][PASS][P0] Issue an available pass
[E3-US02-T01][BE] Implement transactional issue service
[BUG-014][S1][PASS] Prevent concurrent double assignment
[RISK-006][MRN] Hospital API access unavailable
```

Use a verb and one verifiable outcome. Split work that will take more than 2-3 working days.

## 3. Card description template

```text
ID / Type / Module / Priority / Size / Milestone / Target date

User story:
As a <role>, I want <capability>, so that <value>.

Business rules:
-

In scope / Out of scope:
-

Acceptance criteria:
- Given <context>, when <action>, then <result>.
- Given <boundary/invalid context>, when <action>, then <safe result>.

Data and privacy impact:
- PII fields:
- On-chain fields:
- Logging rule:

Dependencies / blockers:
-

Implementation checklist:
- [ ] Backend
- [ ] Frontend
- [ ] Database/migration
- [ ] Documentation

Test evidence:
- [ ] Unit
- [ ] Integration
- [ ] E2E/manual
- [ ] Screenshot/report link

Stakeholder feedback/sign-off:
-
```

## 4. Recommended labels

- Registration & QR.
- Pass Lifecycle.
- Blockchain.
- Analytics & Dashboard.
- Admin & RBAC.
- Infra / Deployment.
- Security / PDPA.
- Testing / UAT.
- Documentation / Research.
- Stakeholder Feedback.

Keep priority and type in the title/description, or use Trello Custom Fields if available. Recommended metadata: Work Item ID, Type, Priority, T-shirt Size, Milestone, Target Cycle/Week, Owner, Dependency, Risk Level, Test Status and Stakeholder Status.

## 5. Operating cadence

- Daily: 10-minute personal board review; update blockers and aging cards.
- Weekly: refine Inbox/Backlog, review risks and prepare the next Ready items.
- Every two weeks: supervisor/HSAAS demo, acceptance review and milestone decision.
- End of milestone: attach evidence, move eligible cards from Done to Released/Archived and record throughput/cycle-time metrics.

## 6. Useful process evidence for the FYP report

- Throughput per two-week review period.
- Median cycle time.
- Total blocked days and major causes.
- WIP-limit breaches.
- Defects found after Done.
- Acceptance-criteria pass rate.
- UAT pass rate and SUS score.
- Examples of stakeholder feedback changing backlog priority.

## 7. Automation suggestions

- When a card enters In Progress, record a start date.
- If no activity occurs for 5 days, add an aging marker/reminder.
- When a card enters Blocked, require the blocker fields and remind after 48 hours.
- When a card enters Review & Testing, add the standard test checklist.
- Do not move to Done while acceptance criteria, tests, documentation or required HSAAS validation are incomplete.

Automation is optional. The workflow and evidence rules remain authoritative even if Trello's free plan does not support every suggested automation or custom field.
