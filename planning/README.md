# HSAAS FYP 当前规划入口

更新日期：2026-10-09。当前 chat 为 project coordinator；每个模块使用独立 chat，完成后交回审核、本地 merge 与集成复验。M00/M01 当前本地基础/UI/C01范围已开发、审核、合并并完成真实联调；M02–M04 已准备但未获开发许可，其他模块未开启。

每个 module 的 chat 和开发必须由用户手动开启和启动；coordinator/助手准备任务和开工条件，不代开、不自动启动下一模块。

2026-10-08 用户要求 coordinator 代开 M00–M04 五个 chat，模型 gpt-6.1-sol / high；初始 Local 只读准备。最新又明确取消 guide/用户手写方式：获各模块一次开发许可后，由模块助手直接编写、测试、修复和交接，所有新写/修改代码有英文注释。其他模块不自动开启。实际登记见 12。

最新沟通规则：模块主动把问题/交接发给 coordinator，coordinator 可回复；用户只审批每个 module 的开发许可，已批准范围内不逐步重复求授权。M00/M01 已获用户许可并完成基础交接，M02–M04 仍未获开发许可；技术答复不替代用户许可。具体协议与消息授权见 12。

需要用户裁决的 conflict、需求不清或无法确定的选择，统一由 coordinator 在本 chat 整理选项后询问用户，再将决定发回模块。

当前优先前端、基础 backend/MySQL、动态 QR 扫码登记。实体卡/reader 与医院病人 API 未准备，先以 synthetic simulation / MRN mock/manual 建立边界；WhatsApp 和 blockchain 默认 disabled。当前验证：backend40、frontend68、harness隔离16与真实28wire通过；访客/QR/登记/审核业务仍未实施/验收，生产HTTPS仍NOT_RUN。历史初始化见 [P0](../Implementation/docs/evidence/foundation/P0_REVIEW.md)，当前证据见 [M00 REVIEW](../Implementation/docs/evidence/modules/M00/REVIEW.md) / [M01 REVIEW](../Implementation/docs/evidence/modules/M01/REVIEW.md)。

## 从这里进入

| 任务 | 当前文件 |
|---|---|
| Coordinator、模块分配、依赖、答疑、审核/merge | [模块 Chat 协议](12_THREE_MONTH_CHAT_PLAN.md) |
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

本轮不更新外部 [Trello board](https://trello.com/b/XnospkpS/fyp-hsaas-visitor-pass-management-system) 或 Figma。M00/M01 已完成当前本地验收与类型生成；M02 的基础依赖已满足，等待用户许可，M03/M04 同样不自动启动。模块交接后仍由 coordinator 审核合并。
