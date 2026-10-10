# HSAAS FYP 当前规划入口

更新2026-10-10：**M00–M04功能已合并本机main**，M03 merge0067637、M04 merge446f887，组合入口dc6982341ed6135b0917a5cfafc4200f06e43e96。职员登录/柜台、实时动态QR、四类DEMO登记、掩码队列/人工批准拒绝已交付；发卡/借用/归还为M05，尚未启动。

用户最新要求助手只完成功能、用户手动测试。组合后没有另行构建或测试，M03/M04状态MERGED_PENDING_USER_MANUAL_TEST，不声称全系统或生产验收；已有历史检查保留准确SHA/范围，见[M03 REVIEW](../Implementation/docs/evidence/modules/M03/REVIEW.md)和[M04 REVIEW](../Implementation/docs/evidence/modules/M04/REVIEW.md)。

本chat协调至M04结束，M05–M11由用户自己coordinate；每个模块手动开独立新chat、从本机已合并main隔离worktree、一次范围许可后由助手直接写有英文注释的功能。不自动收发后续模块消息，不自动启动/审核/merge或测试。可复制每模块消息见[用户启动指南](13_USER_MODULE_START_GUIDE.md)。

[手动运行/检查指南](../Implementation/docs/runbooks/MANUAL_M00_M04.md)包含独立临时数据库、公开演示账号、QR→登记→审核流程和停止命令。旧native数据库checksum问题未修复，真实硬件/手机跨设备HTTPS/医院API仍deferred；WhatsApp/blockchain disabled。GitHub未push，指南提供git push origin main供用户执行。S-V1为TEST_ID/DEMO-与DEMO-MRN-，不代表正式医院字段批准。

## 从这里进入

| 任务 | 当前文件 |
|---|---|
| Coordinator、模块分配、依赖、答疑、审核/merge | [模块 Chat 协议](12_THREE_MONTH_CHAT_PLAN.md) |
| M03/M04之后由用户协调、每个模块的新chat启动方式 | [用户模块启动指南](13_USER_MODULE_START_GUIDE.md) |
| 三个月当前范围与关卡 | [开发计划](01_DEVELOPMENT_PLAN.md) |
| 动态 QR、启用/停用边界、安全与长期 adapter | [架构规范](02_TECHNICAL_ARCHITECTURE.md) |
| 当前/deferred 需求及 QR 验收 | [需求基线](03_REQUIREMENTS_AND_TEST_PLAN.md) |
| QR challenge/grant、schema、状态、API、迁移 | [数据/API 契约](04_DATA_MODEL_AND_API_PLAN.md) |
| 目录 ownership 与修改影响 | [完整目录计划](09_FOLDER_STRUCTURE.md) / [PROJECT_MAP](PROJECT_MAP.md) |
| 本次决策、实际状态与外部未决项 | [基线评审](10_BASELINE_REVIEW.md) |
| 既有初始化步骤/环境快照 | [初始化参考](11_ENVIRONMENT_AND_MANUAL_INITIALIZATION.md)；先读 P0 证据，不重复初始化 |
| 模块 handoff | [稳定模板](_templates/module-handoff.md)，实例在 Implementation/docs/evidence/modules/Mxx/ |
| UI 外观、当前能力覆盖 | [UI v4 inventory](../output/ui-redesign-v4/README.md) / [当前 UI 规格覆盖](07_FIGMA_UI_SPEC.md) |
| 风险与本地 Kanban 指南 | [风险](05_RISK_REGISTER.md) / [Kanban](06_TRELLO_BOARD_GUIDE.md) |
| 长期完整架构/工作流图（尚待同步新范围） | [Archify v3 入口](diagrams/v3/index.html) / [文本镜像](08_MERMAID_DIAGRAMS.md) |

## 事实归属与版本边界

需求由 03 管理，架构由 02 管理，数据/API 由 04 管理，目录由 09 管理，coordinator/模块协议由 12 管理。用户 2026-10-08 决定覆盖旧“每阶段一个 chat”、强制 P4 消息/上链与静态登记 QR 行为。UI v4 仍作外观/交互输入；它的 print/copy-static-URL、消息启用和真链成功画面不能作为当前实现默认。

v3 六张图保留完整长期集成设计，图源和视觉收据未重绘：**尚未包含动态 QR token/grant、coordinator 与 module chat、当前 disabled 策略**。修改新流程按 02/03/04/12；图的哈希/视觉通过仅证明旧 artifact 完整，不代表 2026-10-08 语义同步或业务测试通过。后续重绘按 diagrams/v3/CONTEXT.md 重新生成/验证/留证。

## 验证和外部边界

- python planning/verify_planning_v3.py：仅校验当前链接、需求 ID、旧图 artifact/收据；应用测试状态以模块 REVIEW 为准，该脚本不执行应用测试。
- 图编辑面是 diagrams/v3/*.archify.json；build_archify_v3.py --deliver 才更新六图，不直接改生成 HTML。
- sync_mermaid.py 更新文本镜像；build_delivery_hub.py 更新导航、哈希与范围提示。
- [旧图交付清单](diagrams/v3/delivery-manifest.json)、[人工截图评审](diagrams/v3/review-receipt.json)、[规划 QA](diagrams/v3/planning-qa.json)。

本轮不更新外部 [Trello board](https://trello.com/b/XnospkpS/fyp-hsaas-visitor-pass-management-system) 或 Figma。M00/M01 已完成当前本地验收与类型生成，M02 按用户明确指令隔离实施并经 coordinator 审核合并；M03/M04 不自动启动。模块交接/审核与准确验收边界继续见12及各REVIEW。
