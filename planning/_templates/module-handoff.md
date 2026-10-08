# Mxx 模块交接模板

此文件是模板；复制到 `Implementation/docs/evidence/modules/Mxx/HANDOFF.md` 后填写，勿把占位项标成已完成。

- Module / chat ID / owner / task：
- Baseline SHA / branch / worktree / submitted head SHA：
- Scope / allowed directories / changed files：
- Dependency handoffs / coordinator decisions：
- User module development approval: source / date / approved scope; coordinator replies are not user approval：
- Implementation owner: module assistant writes, tests and fixes directly; English comments verified：
- Summary and user-visible behavior：
- API / DTO / permission / state / migration / shared-file changes：
- English code comments: responsibilities, business rules, design rationale and security boundaries; comments updated with code：
- Modes: reader / MRN / notification / blockchain；mock/synthetic/live provenance：

| Requirement / Test ID | Current / Deferred | PASS / FAIL / NOT_RUN | Command / exit code / time | Evidence path | Implementation SHA |
|---|---|---|---|---|---|
| 待填写 | 待填写 | NOT_RUN | 待填写 | 待填写 | 待填写 |

- Build / MySQL isolation / relevant E2E or manual results：
- Negative cases: permissions, expiry/replay, concurrency, offline/errors, disabled integrations：
- Mock verification vs live verification not run：
- Known issues / severity / blocker / owner / next action：
- Working-tree changes not included in submitted head：
- Run / migration / recovery instructions：
- First action for coordinator review and downstream integration：

Coordinator 将审核结果、返修、复验、merge SHA 与合并后回归记录在同目录 `REVIEW.md`；模块不自行填入 APPROVED/MERGED。
