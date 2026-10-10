---
type: compact-system-map
revision: current
verified_date: 2026-10-08
subject: local-planning-workspace
---
# 项目修改影响索引

这是小型 ICM map，保留主规范唯一事实归属。M00/M01 当前本地基础/UI范围已验收，M02 已审核合并；准确测试与限制见各 REVIEW。实际登记/审核/发卡与外部集成仍未验收。`live`=当前文档或已注明的本地实现；`ghost`=目标业务尚未验收，不代表骨架不存在。

| 对象 / 名称映射 | Universe | 事实归属 | 修改首先影响 |
|---|---|---|---|
| Registration；UI Approved=VERIFIED | live 规范 / ghost 实现 | [需求](03_REQUIREMENTS_AND_TEST_PLAN.md) | [数据/API](04_DATA_MODEL_AND_API_PLAN.md)、[登记工作流](diagrams/v3/03-registration-issue-workflow.archify.json)、UI v4 |
| Dynamic registration QR / entry grant | M02–M04功能本地已合并；组合用户手动验收待完成，生产未验收 | [需求 R01/R06](03_REQUIREMENTS_AND_TEST_PLAN.md) | [架构 §9](02_TECHNICAL_ARCHITECTURE.md)、[QR 数据/API](04_DATA_MODEL_AND_API_PLAN.md)、[M02 REVIEW](../Implementation/docs/evidence/modules/M02/REVIEW.md)、M03/M04 REVIEW、手动运行指南；旧图待同步 |
| Card；旧 Pass inventory=cards | live 规范 / ghost 实现 | [数据/API](04_DATA_MODEL_AND_API_PLAN.md) | [需求](03_REQUIREMENTS_AND_TEST_PLAN.md)、[归还工作流](diagrams/v3/04-return-overdue-workflow.archify.json)、未来 Flyway |
| Assignment；UI Pass ID=pass_reference | live 规范 / ghost 实现 | [数据/API](04_DATA_MODEL_AND_API_PLAN.md) | [发卡时序](diagrams/v3/05-scan-issue-sequence.archify.json)、通知任务、验收 T-P01/P02/P03 |
| ScanJob / Reader Agent | live 规范 / ghost 实现 | [架构](02_TECHNICAL_ARCHITECTURE.md) | [数据/API](04_DATA_MODEL_AND_API_PLAN.md)、[发卡时序](diagrams/v3/05-scan-issue-sequence.archify.json)、[未决硬件](10_BASELINE_REVIEW.md) |
| One combined WhatsApp / disabled now | live 后续契约 / deferred M10 | [需求 N01/N02](03_REQUIREMENTS_AND_TEST_PLAN.md) | [架构](02_TECHNICAL_ARCHITECTURE.md)、[数据/API](04_DATA_MODEL_AND_API_PLAN.md)、[UI v4](../output/ui-redesign-v4/README.md)、旧异步图未表达 disabled |
| Commitment / Proof | live 规范 / ghost 实现 | [架构](02_TECHNICAL_ARCHITECTURE.md) | [数据/API](04_DATA_MODEL_AND_API_PLAN.md)、未来 worker/Move、T-B01/B02/B03；不改成访客钱包 |
| Auth / role / privacy | live 规范 / M00/M01 本地已验收；生产待验收 | [架构](02_TECHNICAL_ARCHITECTURE.md) | [需求](03_REQUIREMENTS_AND_TEST_PLAN.md)、所有 protected API、未来 session/device chains |
| Implementation/ 代码边界与模块契约 | live M00–M02 / 后续业务 ghost | [目录](09_FOLDER_STRUCTURE.md) | [AGENTS](../AGENTS.md)、[P0 evidence](../Implementation/docs/evidence/foundation/P0_REVIEW.md)、模块REVIEW、目录图待同步 |
| Coordinator / module chat / handoff / review / merge | live 协作与已记录交接 | [模块 Chat](12_THREE_MONTH_CHAT_PLAN.md) | [开发计划](01_DEVELOPMENT_PLAN.md)、[初始化参考](11_ENVIRONMENT_AND_MANUAL_INITIALIZATION.md)、[handoff 模板](_templates/module-handoff.md) |
| M03/M04后用户接管协调 / 新chat启动 | live M00–M04功能已合并 / 用户手动验收待完成 | [模块 Chat](12_THREE_MONTH_CHAT_PLAN.md) | [用户启动指南](13_USER_MODULE_START_GUIDE.md)、根AGENTS、Implementation契约 |

当前协作流程是“用户启动模块 -> 隔离实现英文注释功能 -> 用户手动测试/原chat返修 -> 用户决定审核/merge”。M00–M04功能已合并，组合未复验，旧coordinator不再协调后续模块。真实柜台登记/发卡、设备与链上流程仍是后续目标，不以本地QR/port测试代替；现有旧图仍待语义同步。

Cold walk：根 AGENTS.md -> 本索引 -> 一份事实归属规范，可定位概念和一阶影响。更改消息策略首先打开 UI v4/需求 N01，再同步通知状态和异步图；它不要求更改库存 AVAILABLE/ISSUED 定义。更改 NFC profile 先核实硬件契约，它不等于更改 MRN API。

2026-10-08 新规划覆盖旧阶段 chat/静态 QR/强制 P4 外部集成。当前修改规范/导航，未改外部 Trello/Figma。v3 六图保留长期目标，动态 QR/coordinator/disabled 语义尚待重绘；其他目录搬迁仍需 referrer 调查。

当前手动运行入口：Implementation/docs/runbooks/MANUAL_M00_M04.md；后续每模块可复制启动消息：planning/13_USER_MODULE_START_GUIDE.md。助手不自动测试、push或启动M05–M11。
