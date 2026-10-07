---
type: phase-chat-plan
updated: 2026-10-05
window: 2026-10-12..2027-01-03
status: ready-after-p0
---
# 每阶段新 Chat 执行指南

P0 由你按 [手动初始化指南](11_ENVIRONMENT_AND_MANUAL_INITIALIZATION.md) 完成。之后按顺序建立 6 个新 chat。不要一次把全部 chat 都开出来；上一阶段满足关卡并写好 handoff 后，才启动下一阶段。

## 所有新 chat 的共同规则

把对应阶段的“开场消息”复制到新的 Codex chat。每个 chat 必须：

1. 先读根 `AGENTS.md`、本文件指定规范、实际代码和上一阶段 handoff。
2. 正式代码、配置、测试与实施证据只写入 `Implementation/`；不要在其中创建第二个 Git 仓库。
3. 先验证现状，再实现；不得根据计划文件声称功能已完成。
4. 只做本阶段范围，遇到 Should/Could 新需求放回 backlog。
5. 所有业务状态变更、并发、权限和 PII 边界都有测试。
6. 完成时写 `Implementation/docs/evidence/phase-XX/HANDOFF.md`，包含 commit、已完成需求 ID、命令与结果、未决风险、下一 chat 精确入口。

## Chat 01 — 基础、安全与可行性

日期：12–25 Oct 2026。先读 02、03 的非功能需求、04 的 migration/API 规则、09、10，以及手动初始化结果。

```text
检查我在 Implementation/ 内手动初始化的 HSAAS workspace，然后完成 P1 基础与安全阶段。所有正式代码、配置、测试与证据都留在 Implementation/，不要在其中再次 git init。范围仅限：真实 MySQL/Flyway 基线、服务端 session + CSRF、login/logout/me、Counter Staff/Admin RBAC、最小用户模型、health、同源 Vite proxy、CI，以及 NFC reader/profile 和部署兼容性 spike。使用 Java 21、项目 Maven Wrapper、pnpm；不要重建我已初始化的骨架。按 planning/01、02、03、04、09、10、11、12 执行。完成后运行真实构建/测试，记录 401/403/CSRF/session 证据和硬件 spike 结论，写 Implementation/docs/evidence/phase-01/HANDOFF.md；不进入登记、发卡或 Sui 业务。
```

退出关卡：frontend build；backend verify；真实 MySQL migration/session 集成；匿名/错误角色/无 CSRF 行为正确；没有秘密进入 bundle/log/Git；reader 路径不再是未知假设。

## Chat 02 — 四类登记与审核

日期：26 Oct–8 Nov。输入上一阶段 handoff、需求 R01–R04/S01、UI v4、API/状态规范。

```text
基于 Implementation/docs/evidence/phase-01/HANDOFF.md 完成 P2 登记与审核纵向路径。实现四类 QR 公共登记、版本化字段白名单、privacy 与可选 WhatsApp consent 分离、随机 public reference、Penjaga MRN adapter 的 mock/manual fallback、职员队列、masked detail、approve/reject 与审计。严格覆盖 R01–R04、S01；R05 live MRN 只有获批 sandbox/credentials 才实现，否则保持明确限制。批准不得创建 Pass ID、借用或消息。运行 valid/boundary/invalid、401/403、冲突与 E2E 测试，更新证据并写 Implementation/docs/evidence/phase-02/HANDOFF.md；不进入卡生命周期。
```

退出关卡：手机四类路径可用；公共 reference 不泄露 PII；MRN timeout 不丢表单；未核实 Penjaga 不能批准；审核冲突可控；M1 demo 可重现。

## Chat 03 — NFC、卡库存与借用生命周期

日期：9–22 Nov。输入上一阶段 handoff、C01–C02/P01–P05、扫描与发卡 Archify 图。

```text
基于 Implementation/docs/evidence/phase-02/HANDOFF.md 完成 P3 卡与借用生命周期。在 Implementation/ 内创建或完善 reader-agent，只按已验证的 PC/SC/profile 结论实现 cloud ScanJob；实现 card enrollment/inventory、设备绑定/nonce/expiry/fencing、原子 issue/return、due_at、overdue scheduler、lost/disabled/restore、幂等与并发保护。严格覆盖 C01–C02、P01–P05；未知 profile 不允许手填绕过。Sui 和 WhatsApp 只能写 durable task/outbox 边界，不执行外部发送。运行真实 MySQL 并发、重放、过期、错误设备、断电/回滚和 E2E 测试，写 Implementation/docs/evidence/phase-03/HANDOFF.md。
```

退出关卡：AVAILABLE→ISSUED→AVAILABLE 与 OVERDUE 路径通过；同一卡/登记只有一个 active assignment；双发卡恰好一项成功；lost 不可普通归还；本地流程不依赖链可用性。

## Chat 04 — 单条消息与 Sui 审计

日期：23 Nov–6 Dec。输入上一阶段 handoff、N01–N03/B01–B03、异步时序图和 Sui Testnet 工具链。

```text
基于 Implementation/docs/evidence/phase-03/HANDOFF.md 完成 P4 异步集成。实现每 assignment 最多一条 COMBINED_PASS_DETAILS、opt-in/状态机/callback 签名/未知结果对账；不新增批准、提醒、逾期、拒绝或归还消息。在 Implementation/ 内实现 canonical audit snapshot、MySQL outbox、私有 sui-worker、最小 Move audit package、eventId 幂等与 proof verifier，覆盖 N01–N03、B01–B03。Sui/消息 provider 慢或离线不能阻断柜台；Testnet payload 不得含 PII。对 429、低 gas、断网、未知提交、worker crash、重复 callback 与本地篡改做测试，写 Implementation/docs/evidence/phase-04/HANDOFF.md。
```

退出关卡：M3；选定事件最终上链且可核验，篡改显示 MISMATCH，RPC 故障与证据缺失不混淆；消息 UNKNOWN 不盲目重发。

## Chat 05 — 管理、分析与隐私

日期：7–20 Dec。输入上一阶段 handoff、A01–A04/D01、UI v4 admin screens。

```text
基于 Implementation/docs/evidence/phase-04/HANDOFF.md 完成 P5 管理、分析与隐私。实现账号/角色/停用与最后管理员保护、ward/category/settings 版本化、dashboard 指标与 stale/error 状态、审计查看、masked CSV 报表、retention dry-run 与最小权限检查，覆盖 A01–A04、D01。用固定 golden dataset 验证统计、MYT/UTC 边界和 CSV formula injection；不得用加载失败时的 0 伪装数据。完成后冻结 Must 功能，更新回归证据和 Implementation/docs/evidence/phase-05/HANDOFF.md；不再加入新功能。
```

退出关卡：指标可从 golden dataset 重算；最后管理员并发保护通过；导出默认掩码且有审计；日志、QR、链、测试证据无 PII。

## Chat 06 — 发布、UAT 与 FYP 证据

日期：21 Dec 2026–3 Jan 2027。输入全部 handoff、需求测试矩阵、风险、部署与报告资料。

```text
基于 Implementation/docs/evidence/phase-05/HANDOFF.md 完成 HSAAS P6 发布阶段。不要新增功能；修复 Must 范围缺陷，执行全量 regression、E2E、安全、隐私、性能、并发、备份恢复、migration/rollback 和部署 smoke。整理可重复的 UAT/SUS、操作手册、部署/恢复 runbook、OpenAPI/ERD、需求到证据矩阵和 FYP 限制说明。真实 HSAAS/MRN/WhatsApp/reader 未获得的证据必须写成限制，不能把 mock 标成通过。目标是可部署 release candidate、无 P0/P1，并写 Implementation/docs/evidence/phase-06/HANDOFF.md 与最终 release manifest。
```

退出关卡：全部 Must 需求有 PASS/FAIL/NOT_RUN 的真实状态；无未处理 P0/P1；部署和恢复演练可复现；UAT/SUS 结果或未执行原因清楚；最终报告可引用证据路径。

## 阶段切换检查表

- 工作树状态和 commit SHA 已记录。
- 需求 ID 与测试 ID 状态已更新。
- 构建、测试、浏览器/设备/链证据有路径和时间。
- 未完成项说明原因、影响、owner、最迟日期。
- 风险登记更新；真实外部依赖与 mock 明确区分。
- 下一 chat 的第一项动作明确，不需要读取旧 chat 才能理解。
