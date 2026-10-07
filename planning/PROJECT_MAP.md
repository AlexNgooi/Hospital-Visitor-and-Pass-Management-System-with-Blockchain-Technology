---
type: compact-system-map
revision: current
verified_date: 2026-10-05
subject: local-planning-workspace
---
# 项目修改影响索引

这是小型 ICM map，保留主规范的唯一事实归属，不复制功能描述。工作区没有正式应用源码，因此不创建声称已验证的代码对象卡。`live`=当前文档在用；`ghost`=目标应用尚未实现。

| 对象 / 名称映射 | Universe | 事实归属 | 修改首先影响 |
|---|---|---|---|
| Registration；UI Approved=VERIFIED | live 规范 / ghost 实现 | [需求](03_REQUIREMENTS_AND_TEST_PLAN.md) | [数据/API](04_DATA_MODEL_AND_API_PLAN.md)、[登记工作流](diagrams/v3/03-registration-issue-workflow.archify.json)、UI v4 |
| Card；旧 Pass inventory=cards | live 规范 / ghost 实现 | [数据/API](04_DATA_MODEL_AND_API_PLAN.md) | [需求](03_REQUIREMENTS_AND_TEST_PLAN.md)、[归还工作流](diagrams/v3/04-return-overdue-workflow.archify.json)、未来 Flyway |
| Assignment；UI Pass ID=pass_reference | live 规范 / ghost 实现 | [数据/API](04_DATA_MODEL_AND_API_PLAN.md) | [发卡时序](diagrams/v3/05-scan-issue-sequence.archify.json)、通知任务、验收 T-P01/P02/P03 |
| ScanJob / Reader Agent | live 规范 / ghost 实现 | [架构](02_TECHNICAL_ARCHITECTURE.md) | [数据/API](04_DATA_MODEL_AND_API_PLAN.md)、[发卡时序](diagrams/v3/05-scan-issue-sequence.archify.json)、[未决硬件](10_BASELINE_REVIEW.md) |
| One combined WhatsApp | live 决策 / ghost 实现 | [UI v4](../output/ui-redesign-v4/README.md) -> [需求 N01/N02](03_REQUIREMENTS_AND_TEST_PLAN.md) | [架构](02_TECHNICAL_ARCHITECTURE.md)、[数据/API](04_DATA_MODEL_AND_API_PLAN.md)、[异步时序](diagrams/v3/06-async-delivery-sequence.archify.json) |
| Commitment / Proof | live 规范 / ghost 实现 | [架构](02_TECHNICAL_ARCHITECTURE.md) | [数据/API](04_DATA_MODEL_AND_API_PLAN.md)、未来 worker/Move、T-B01/B02/B03；不改成访客钱包 |
| Auth / role / privacy | live 规范 / ghost 实现 | [架构](02_TECHNICAL_ARCHITECTURE.md) | [需求](03_REQUIREMENTS_AND_TEST_PLAN.md)、所有 protected API、未来 session/device chains |
| Implementation/ 代码边界与模块契约 | live 空目录 / ghost 实现 | [目录](09_FOLDER_STRUCTURE.md) | [AGENTS](../AGENTS.md)、[planning 契约](CONTEXT.md)、[目录导航图](diagrams/v3/02-folder-structure.archify.json) |
| 三个月阶段与 chat handoff | live 计划 / ghost evidence | [开发计划](01_DEVELOPMENT_PLAN.md) | [手动初始化](11_ENVIRONMENT_AND_MANUAL_INITIALIZATION.md)、[阶段 Chat](12_THREE_MONTH_CHAT_PLAN.md)、未来 docs/evidence |

真实正在执行的流程是“规划评审 -> 编辑主规范 -> 验证并交付图 -> 留存证据”。柜台业务、设备和链上流程当前是目标设计；不存在所谓正在运行的 job pipeline。

Cold walk：根 AGENTS.md -> 本索引 -> 一份事实归属规范，可定位概念和一阶影响。更改消息策略首先打开 UI v4/需求 N01，再同步通知状态和异步图；它不要求更改库存 AVAILABLE/ISSUED 定义。更改 NFC profile 先核实硬件契约，它不等于更改 MRN API。

2026-10-05 已清理 planning 历史/v2 文件并更新引用；没有改外部 Trello/Figma。其他目录若要搬迁，仍需单独做 referrer 调查。
