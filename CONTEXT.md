---
type: workspace-contract
updated: 2026-10-05
---
# 工作区契约

单一职责：保存 HSAAS FYP 的需求、设计、原型和实施证据。

输入：根目录 proposal PDF、planning/README.md 指定的基线、output/ui-redesign-v4/README.md 的最新 UI 决策。

处理：需求事实归属 planning/03_REQUIREMENTS_AND_TEST_PLAN.md；架构归属 planning/02_TECHNICAL_ARCHITECTURE.md；数据/API 归属 planning/04_DATA_MODEL_AND_API_PLAN.md。按 AGENTS.md 路由选择读取，不把整个 output/tmp 当实现代码。

输出：planning/ 内可编辑规范与 Archify JSON/HTML；output/ 内原型/导出；tmp/ 内临时检查文件；Implementation/ 内正式代码与实施证据。

人工检查：阅读需求变更、确认医院业务未决项、审阅最终图和验收证据。设计文档完成不代表医院认可或业务软件实现完成。

planning 只保留当前版本；Implementation/ 由开发者按 planning/11 手动初始化，使用根 Git 仓库。其他目录若要删除/搬迁，先检查 referrer 与路径冲突。
