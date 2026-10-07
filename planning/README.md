# HSAAS FYP 当前规划入口

更新日期：2026-10-05。项目：QR-Based Hospital Visitor and Pass Management System with Blockchain Technology。

本轮已核对 proposal、最新实施指南和 UI v4，更新需求、架构、数据/API，并生成六张 Archify 图。当前为实施设计与静态原型；正式应用、真实硬件和外部接口尚未验收。

## 从这里进入

| 任务 | 当前文件 |
|---|---|
| 浏览图与完整目录树 | [Archify v3 总入口](diagrams/v3/index.html) |
| 系统组件 | [系统架构图](diagrams/v3/01-architecture.html) / [架构规范](02_TECHNICAL_ARCHITECTURE.md) |
| 目录与修改影响 | [目录图](diagrams/v3/02-folder-structure.html) / [完整目录计划](09_FOLDER_STRUCTURE.md) / [ICM map](PROJECT_MAP.md) |
| 登记、审核、发卡 | [工作流](diagrams/v3/03-registration-issue-workflow.html) |
| 归还、逾期、遗失 | [工作流](diagrams/v3/04-return-overdue-workflow.html) |
| NFC 扫描与事务 | [时序图](diagrams/v3/05-scan-issue-sequence.html) |
| Sui 与单次消息 | [异步时序图](diagrams/v3/06-async-delivery-sequence.html) |
| 需求和测试追溯 | [需求基线](03_REQUIREMENTS_AND_TEST_PLAN.md) |
| 实体、约束、状态、endpoint | [数据/API 契约](04_DATA_MODEL_AND_API_PLAN.md) |
| 本轮修订依据与待确认 | [基线评审](10_BASELINE_REVIEW.md) |
| 三个月开发时间表 | [开发计划](01_DEVELOPMENT_PLAN.md) |
| 手动初始化与环境检查 | [环境与初始化指南](11_ENVIRONMENT_AND_MANUAL_INITIALIZATION.md) |
| 每阶段开启新 chat | [阶段 Chat 指南](12_THREE_MONTH_CHAT_PLAN.md) |
| UI 交互和消息内容 | [UI v4 inventory](../output/ui-redesign-v4/README.md) |
| 文本版图 | [生成的 Mermaid 语义镜像](08_MERMAID_DIAGRAMS.md) |

## 事实归属

需求由 03 管理，架构由 02 管理，数据/API 由 04 管理，目录由 09 管理；导航与图通过链接/生成保持同步。角色、字段和单条消息冲突按 [来源优先级](10_BASELINE_REVIEW.md) 解释。根 [AGENTS.md](../AGENTS.md) 为小型路由；每个已纳入工作流的目录有 CONTEXT.md。

[开发计划](01_DEVELOPMENT_PLAN.md)、[风险](05_RISK_REGISTER.md)、[Kanban 指南](06_TRELLO_BOARD_GUIDE.md) 和 [Figma 规格](07_FIGMA_UI_SPEC.md) 均为当前规划。planning 内的历史快照、v2 图和临时 v2 预览已删除，只保留当前规范与 `diagrams/v3/` 交付图。

外部 [Trello board](https://trello.com/b/XnospkpS/fyp-hsaas-visitor-pass-management-system) 是既有引用，本轮没有读取或更新 board，也没有向外发送消息。

## 复现和证据

- 图的编辑面为 `diagrams/v3/*.archify.json`；不要直接改交付 HTML。
- `python planning/build_archify_v3.py` 验证六个图源；`--deliver` 才更新 HTML 和浏览器证据。
- `python planning/sync_mermaid.py` 更新文本语义镜像；`python planning/build_delivery_hub.py` 更新导航与哈希清单。
- `python planning/verify_planning_v3.py` 检查文件链接、需求 ID、artifact/收据绑定；业务测试仍 NOT_RUN。
- [交付清单](diagrams/v3/delivery-manifest.json)、[人工截图评审](diagrams/v3/review-receipt.json)、[规划 QA](diagrams/v3/planning-qa.json)、[skill 安装记录](skill-installation.json)。

下一步由开发者在 `Implementation/` 内按 11 手动初始化；之后按 12 为每个阶段开一个新 chat。真实 MRN、WhatsApp、reader 或医院数据的完成状态需实测证据；不以 mock 替代。
