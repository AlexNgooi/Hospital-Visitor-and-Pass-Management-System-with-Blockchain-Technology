---
type: folder-contract
updated: 2026-10-08
---
# planning 契约

单一职责：维护可执行、可追溯的项目设计规范。

输入：../FYP Proposal Alex Hospital Visitor and Pass Management System with Blockchain Technology.pdf；../output/ui-redesign-v4/README.md；10_BASELINE_REVIEW.md 的来源与未决项。

处理：先从 README.md 或 PROJECT_MAP.md 路由；修改归属文件，再同步受影响的 API、验收与图。planning 只保留当前版本；图的源与收据由 diagrams/v3/CONTEXT.md 约束。

输出：01 三个月当前范围计划、02/03/04 主规范、09 目录计划、10 评审记录、11 初始化参考、12 coordinator/独立模块 chat 指南、PROJECT_MAP.md 修改影响索引。

人工检查：更新来源与状态，确认业务改变不是假定医院已批准；图未同步时必须在入口标明语义范围和待同步内容，不拿旧图作为新 QR/coordinator 规范。将来的 change record / module handoff 从 _templates/ 复制实例化，不把模板当事实或完成证据。

2026-10-10最新交付与测试规则（覆盖旧验收/自动测试指令）：M00–M04功能已合并本机main，M03 merge0067637、M04 merge446f887，组合入口dc6982341ed6135b0917a5cfafc4200f06e43e96；最新组合状态MERGED_PENDING_USER_MANUAL_TEST，未另行构建/测试，不冒充完整验收。用户要求“只需要把功能做出来，我自己手动测试”：助手不自行新增或执行测试、不进行浏览器/业务验收，不因旧测试关卡未执行阻止已授权的功能交付；源码/diff审阅可继续，额外构建/运行按用户后续明确要求。旧PASS保留原范围，未执行写NOT_RUN。当前已无已知阻塞交付的生产功能缺陷。本chat至M04结束协调，M05–M11由用户在新chat手动启动并自己协调，问题/共享契约/迁移/依赖直接问用户，不自动向旧coordinator或其他chat发消息；不自动创建/启动/审核/merge后续模块。用户明确启动指定模块即为一次开发许可，助手直接写有准确英文注释的功能并交回用户审核。不push、不部署、不修改旧native数据库。启动见planning/13_USER_MODULE_START_GUIDE.md；当前手动运行见Implementation/docs/runbooks/MANUAL_M00_M04.md。
