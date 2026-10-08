---
type: compact-system-map
revision: current
verified_date: 2026-10-08
subject: local-planning-workspace
---
# 项目修改影响索引

这是小型 ICM map，保留主规范唯一事实归属。工作区已有用户初始化骨架与 P0 证据，业务仍未验收；不创建声称业务已验证的代码对象卡。`live`=当前文档在用；`ghost`=目标业务尚未验收，不代表骨架不存在。

| 对象 / 名称映射 | Universe | 事实归属 | 修改首先影响 |
|---|---|---|---|
| Registration；UI Approved=VERIFIED | live 规范 / ghost 实现 | [需求](03_REQUIREMENTS_AND_TEST_PLAN.md) | [数据/API](04_DATA_MODEL_AND_API_PLAN.md)、[登记工作流](diagrams/v3/03-registration-issue-workflow.archify.json)、UI v4 |
| Dynamic registration QR / entry grant | live 新规范 / ghost 业务 | [需求 R01/R06](03_REQUIREMENTS_AND_TEST_PLAN.md) | [架构 §9](02_TECHNICAL_ARCHITECTURE.md)、[QR 数据/API](04_DATA_MODEL_AND_API_PLAN.md)、M02/M03、UI static print 覆盖；旧图待同步 |
| Card；旧 Pass inventory=cards | live 规范 / ghost 实现 | [数据/API](04_DATA_MODEL_AND_API_PLAN.md) | [需求](03_REQUIREMENTS_AND_TEST_PLAN.md)、[归还工作流](diagrams/v3/04-return-overdue-workflow.archify.json)、未来 Flyway |
| Assignment；UI Pass ID=pass_reference | live 规范 / ghost 实现 | [数据/API](04_DATA_MODEL_AND_API_PLAN.md) | [发卡时序](diagrams/v3/05-scan-issue-sequence.archify.json)、通知任务、验收 T-P01/P02/P03 |
| ScanJob / Reader Agent | live 规范 / ghost 实现 | [架构](02_TECHNICAL_ARCHITECTURE.md) | [数据/API](04_DATA_MODEL_AND_API_PLAN.md)、[发卡时序](diagrams/v3/05-scan-issue-sequence.archify.json)、[未决硬件](10_BASELINE_REVIEW.md) |
| One combined WhatsApp / disabled now | live 后续契约 / deferred M10 | [需求 N01/N02](03_REQUIREMENTS_AND_TEST_PLAN.md) | [架构](02_TECHNICAL_ARCHITECTURE.md)、[数据/API](04_DATA_MODEL_AND_API_PLAN.md)、[UI v4](../output/ui-redesign-v4/README.md)、旧异步图未表达 disabled |
| Commitment / Proof | live 规范 / ghost 实现 | [架构](02_TECHNICAL_ARCHITECTURE.md) | [数据/API](04_DATA_MODEL_AND_API_PLAN.md)、未来 worker/Move、T-B01/B02/B03；不改成访客钱包 |
| Auth / role / privacy | live 规范 / ghost 实现 | [架构](02_TECHNICAL_ARCHITECTURE.md) | [需求](03_REQUIREMENTS_AND_TEST_PLAN.md)、所有 protected API、未来 session/device chains |
| Implementation/ 代码边界与模块契约 | live 骨架 / ghost 业务 | [目录](09_FOLDER_STRUCTURE.md) | [AGENTS](../AGENTS.md)、[P0 evidence](../Implementation/docs/evidence/foundation/P0_REVIEW.md)、目录图待同步 |
| Coordinator / module chat / handoff / review / merge | live 新计划 / ghost 模块交接 | [模块 Chat](12_THREE_MONTH_CHAT_PLAN.md) | [开发计划](01_DEVELOPMENT_PLAN.md)、[初始化参考](11_ENVIRONMENT_AND_MANUAL_INITIALIZATION.md)、[handoff 模板](_templates/module-handoff.md) |

真实正在执行的流程是“规划评审 -> 编辑主规范 -> 验证并交付图 -> 留存证据”。柜台业务、设备和链上流程当前是目标设计；不存在所谓正在运行的 job pipeline。

Cold walk：根 AGENTS.md -> 本索引 -> 一份事实归属规范，可定位概念和一阶影响。更改消息策略首先打开 UI v4/需求 N01，再同步通知状态和异步图；它不要求更改库存 AVAILABLE/ISSUED 定义。更改 NFC profile 先核实硬件契约，它不等于更改 MRN API。

2026-10-08 新规划覆盖旧阶段 chat/静态 QR/强制 P4 外部集成。当前修改规范/导航，未改外部 Trello/Figma。v3 六图保留长期目标，动态 QR/coordinator/disabled 语义尚待重绘；其他目录搬迁仍需 referrer 调查。
