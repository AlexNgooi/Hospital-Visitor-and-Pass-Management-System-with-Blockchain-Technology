---
type: development-plan
revision: current
updated: 2026-10-05
window: 2026-10-05..2027-01-03
status: ready-for-manual-initialization
---
# 三个月开发计划

本计划从 2026-10-05 开始，到 2027-01-03 完成，共 13 周，不超过三个月；2027-01-04 只作为一天应急余量。第 1 周由开发者手动初始化；之后每两周一个阶段，每个阶段使用一个新的 Codex chat。当前工作区只有规划与静态原型，任何功能只有在相应测试证据产生后才算完成。

## 交付策略

- 单人开发，Kanban WIP 上限为 2；任何任务超过 2–3 个工作日必须拆分。
- 每个阶段只实现该阶段的 Must 范围，阶段最后两天用于集成、缺陷修复和留证。
- 每个新 chat 先读 `AGENTS.md`，再读该阶段指定规范和上一阶段 handoff；不把旧 chat 的记忆当事实。
- 每个阶段结束必须产生：构建/测试结果、需求 ID 状态、风险变化、未决项、下一阶段 handoff。
- 外部依赖未到位时保留 adapter + mock/manual 路径，并明确标成未完成的 live integration。

## 时间表与阶段关卡

| 阶段 | 日期 | 新 chat | 主要范围 | 阶段关卡 |
|---|---|---|---|---|
| P0 手动初始化 | 5–11 Oct | 不开开发 chat；按 11 手动操作 | 首次 Git 基线、`Implementation/frontend`、`backend`、`infra` 最小骨架、MySQL、Wrapper、目录契约 | 前后端空骨架可构建；首次 commit；秘密未入库 |
| P1 基础与安全 | 12–25 Oct | Chat 01 | session/CSRF、登录、RBAC、用户最小模型、Flyway、健康检查、CI、部署兼容 spike、NFC 设备 spike | M0：真实 MySQL 集成测试通过；401/403/CSRF 行为有证据；硬件路径有结论 |
| P2 登记与审核 | 26 Oct–8 Nov | Chat 02 | R01–R04、S01；四类别表单、隐私/消息同意、登记 reference、队列、批准/拒绝、MRN adapter/manual fallback | M1：四类登记到审核端到端通过；批准不会提前发卡或发消息 |
| P3 卡与借用生命周期 | 9–22 Nov | Chat 03 | C01–C02、P01–P05；库存、ScanJob/Reader Agent、发卡、归还、逾期、遗失、并发与幂等 | M2：真实或批准的 reader profile 下完成 issue/return；双发卡恰好一项成功 |
| P4 异步消息与链上审计 | 23 Nov–6 Dec | Chat 04 | N01–N03、B01–B03；单条组合消息、outbox、Sui worker、Move、proof verifier、故障恢复 | M3：Sui 慢/离线不阻断柜台；Testnet proof 可核验；链上无 PII |
| P5 管理、分析与隐私 | 7–20 Dec | Chat 05 | A01–A04、D01；账号/配置、dashboard、掩码 CSV、审计、保留策略、golden dataset | M4：Must 功能冻结；指标可从数据库重算；最后管理员保护通过 |
| P6 发布、UAT 与报告 | 21 Dec–3 Jan | Chat 06 | 全量回归、安全/性能/恢复、部署演练、UAT/SUS、操作手册、FYP 证据与最终报告 | M5：无 P0/P1；发布候选可部署；UAT 结果和限制已记录 |

## 每阶段容量

每个两周阶段按 10 个工作日规划：6 天功能与测试、2 天集成、1 天文档/证据、1 天缓冲。只承诺 70–80% 容量，保留其余时间处理缺陷、学习成本、外部接口和部署问题。

## 完成定义

阶段只有同时满足以下条件才关闭：

- 对应验收条件已执行，结果不是占位的 `PASS`。
- 单元、真实 MySQL 集成和必要 E2E/人工测试通过；失败项有明确 owner 与日期。
- RBAC、PII、日志、链上 payload、并发、幂等和错误状态按阶段范围检查。
- API、schema、运行说明和 evidence 路径已更新。
- 新 chat 写出 handoff；下一阶段不得依赖聊天记忆才能继续。

## 三个月内的范围保护

以下内容不进入 Must 路径：Sui Mainnet、原生手机 App、完整医院信息系统集成、室内定位、一般无需实体卡访客、复杂异常检测、多语言、额外 WhatsApp 模板。若进度落后，依次削减高级图表/自定义报表、live MRN、非关键 UI polish；不得削减发卡/归还一致性、隐私、链上完整性测试、部署证据与 UAT。

## 每周节奏

- 周一：确认本周最多两项 In Progress，以及依赖和验收。
- 周三：检查 blocker、测试债务和剩余时间；阻塞超过 2 个工作日立即升级。
- 周五：运行阶段回归、更新风险和 evidence；只把满足完成定义的工作移到 Done。
- 每两周：演示、冻结阶段结果、写 handoff、关闭当前 chat，再启动下一个 chat。

## 硬截止与决策点

- 11 Oct：手动初始化结束。若骨架仍不可构建，先修环境，不进入 P1。
- 25 Oct：会话/权限与 reader 可行性必须有证据；未知硬件 profile 不得拖到 P3 才发现。
- 22 Nov：本地完整 pass lifecycle 必须完成；否则暂停 Sui UI polish，先保住核心流程。
- 6 Dec：链上与消息异步边界必须稳定；真实 provider 未批则保留 mock 并记录限制。
- 20 Dec：功能冻结，之后只修缺陷、测试、部署、UAT 和报告。
- 3 Jan：发布候选与 FYP 证据包完成；4 Jan 仅留作应急余量。
