---
type: workspace-contract
updated: 2026-10-08
---
# 工作区契约

单一职责：保存 HSAAS FYP 的需求、设计、原型和实施证据。

输入：根目录 proposal PDF、planning/README.md 指定的基线、output/ui-redesign-v4/README.md 的最新 UI 决策。

处理：需求事实归属 planning/03_REQUIREMENTS_AND_TEST_PLAN.md；架构归属 planning/02_TECHNICAL_ARCHITECTURE.md；数据/API 归属 planning/04_DATA_MODEL_AND_API_PLAN.md。按 AGENTS.md 路由选择读取，不把整个 output/tmp 当实现代码。

输出：planning/ 内可编辑规范与 Archify JSON/HTML；output/ 内原型/导出；tmp/ 内临时检查文件；Implementation/ 内正式代码与实施证据。

人工检查：阅读需求变更、确认医院业务未决项、审阅最终图和验收证据。设计文档完成不代表医院认可或业务软件实现完成。

planning 只保留当前版本；Implementation/ 已有用户手动初始化的骨架，使用根 Git 仓库，实际状态先看 docs/evidence/foundation/P0_REVIEW.md。本 chat 为 coordinator，按 planning/12 分配独立 module chat、审核并本地 merge。最新用户要求改为模块助手直接编写源码/测试/交接，必须有英文注释；每模块开发许可仍一次确认，已有许可不重复问。当前优先 Web/基础后端/动态 QR，硬件/live MRN deferred，WhatsApp/blockchain disabled。其他目录若要删除/搬迁，先检查 referrer 与路径冲突。

2026-10-10用户将本chat协调范围收束到完成M03/M04及其审核/本地merge/复验。之后M05–M11由用户自己coordinate，启动方式见planning/13_USER_MODULE_START_GUIDE.md；旧coordinator不自动派发后续任务，后续模块直接交用户处理跨模块问题与审核。

2026-10-10最新交付与测试规则（覆盖旧验收/自动测试指令）：M00–M04功能已合并本机main，M03 merge0067637、M04 merge446f887，组合入口dc6982341ed6135b0917a5cfafc4200f06e43e96；最新组合状态MERGED_PENDING_USER_MANUAL_TEST，未另行构建/测试，不冒充完整验收。用户要求“只需要把功能做出来，我自己手动测试”：助手不自行新增或执行测试、不进行浏览器/业务验收，不因旧测试关卡未执行阻止已授权的功能交付；源码/diff审阅可继续，额外构建/运行按用户后续明确要求。旧PASS保留原范围，未执行写NOT_RUN。当前已无已知阻塞交付的生产功能缺陷。本chat至M04结束协调，M05–M11由用户在新chat手动启动并自己协调，问题/共享契约/迁移/依赖直接问用户，不自动向旧coordinator或其他chat发消息；不自动创建/启动/审核/merge后续模块。用户明确启动指定模块即为一次开发许可，助手直接写有准确英文注释的功能并交回用户审核。不push、不部署、不修改旧native数据库。启动见planning/13_USER_MODULE_START_GUIDE.md；当前手动运行见Implementation/docs/runbooks/MANUAL_M00_M04.md。
