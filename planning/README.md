> **2026-10-18 最新授权（M05–M07）**：用户已指定新 coordinator chat `01a14da5-91fe-7bf1-a120-183975085f8b`（local），授权代开三个独立模块 chat/worktree、直接开发、双向答疑、审核和仅本地 merge；只做必要 testing，合并后由用户手动启动及业务测试。本条覆盖下文旧的 M05–M07 自行协调/未许可/禁止一切测试安排；M08–M11 未启动、不 push、不部署、不修改旧 native 库。当前执行与共享契约见 `planning/14_M05_M07_COORDINATION.md`（从仓库根目录解析）。

# HSAAS FYP 当前规划入口

**2026-10-27 模块启动：[R01–R03分工与协调](16_MANUAL_PASS_MODULE_COORDINATION.md)**。用户已授权本chat代开独立chat/worktree并开始实施新变更，覆盖昨日design-only安排；Penjaga仅IC、每登记一张活动pass已确认。功能与验收尚未完成，不自动merge main或改动当前运行demo。

**2026-10-26 新需求/设计入口：[手动 pass 与表单变更](15_MANUAL_PASS_AND_FORM_CHANGE.md)**。用户要求取消 pass reader，staff 手动选卡/发还；Vendor/Contractor 多张多地点、Executive 一张；归还期限可设或不设，发/还时间即进/出日期时间；按 PDF 更新 Penjaga 字段，以假 MRN API 回填患者/ward/bed，条款勾选并记时间。用户明确本轮**先更新需求和设计，暂不改应用代码**。02/03/04 的 2026-10-26 增量优先于冲突旧规则；新功能 **NOT_IMPLEMENTED / NOT_RUN**。旧图/UI 原型尚未同步，以下 M00–M07 状态仅代表旧实现。

更新2026-10-18：**M00–M06功能及M07交付文档已合并本机main**，M05 merge `6e458b7`、M06 `0917266`、M07 `8100520`，组合运行源码 `761491e89910566c83fa184cb0aaa79ee625f128`。当前包括动态QR/四类DEMO登记/审核、模拟库存与发还卡/逾期/遗失恢复、管理/报表/本地审计。新coordinator及准确交付记录见[14](14_M05_M07_COORDINATION.md)。

用户授权只做必要testing。当前组合后端打包（跳过测试正文）、前端构建/lint/类型及启动器/seed静态检查通过；Docker引擎不可用，数据库/业务/浏览器/恢复仍NOT_RUN。状态 **MERGED_PENDING_USER_MANUAL_TEST**；准确检查范围见[组合收据](../Implementation/docs/evidence/modules/M07/COORDINATOR_CHECKS.md)，不继承历史PASS作完整验收。

用户2026-10-18已授权本coordinator代开M05–M07三个独立chat/worktree、答疑、审核及仅本地merge，现已完成。M08–M11仍未启动；不自动扩大授权。[用户启动指南](13_USER_MODULE_START_GUIDE.md)的旧M05–M07模板仅保留历史参考。

[当前启动/停止/备份恢复指南](../Implementation/docs/runbooks/MANUAL_M00_M07.md)、[40项手动检查](../Implementation/docs/runbooks/MANUAL_ACCEPTANCE_M00_M07.md)和[release manifest](../Implementation/docs/runbooks/RELEASE_MANIFEST_M00_M07.md)供用户自己执行。先启动Docker Engine，使用专用临时库与公开合成账号；不修改旧native库。真实硬件/跨设备HTTPS/医院API仍deferred，WhatsApp/blockchain disabled，GitHub未push。TEST_ID/DEMO-/DEMO-MRN-仅演示契约。

## 从这里进入

| 任务 | 当前文件 |
|---|---|
| 2026-10-26 新表单、manual pass、多 pass、可选期限、假 MRN 与已确认时间/条款决定 | [变更依据和设计](15_MANUAL_PASS_AND_FORM_CHANGE.md) → [需求](03_REQUIREMENTS_AND_TEST_PLAN.md) / [架构](02_TECHNICAL_ARCHITECTURE.md) / [数据/API](04_DATA_MODEL_AND_API_PLAN.md) |
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
