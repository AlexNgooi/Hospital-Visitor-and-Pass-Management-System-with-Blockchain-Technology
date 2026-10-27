> **2026-10-27 最新授权（R01–R03）**：用户已在当前 coordinator chat `01a17867-7222-74d0-8dc6-c33b0e939c15`（local）明确要求分配任务并启动多 chat，一模块一 chat，实施 planning/15 的新变更。授权为三个模块创建独立 chat/worktree、直接开发、双向技术答疑与交接，覆盖旧的本轮 design-only/不得代开限制；每模块不再重复问开发许可。Penjaga 已确认仅 IC、每登记一张活动 pass。执行/ownership/迁移/检查边界以 `planning/16_MANUAL_PASS_MODULE_COORDINATION.md` 为准；仅必要静态/构建检查，不运行应用/数据库/业务验收，不 push/部署/改 native 库，不自动 merge main，旧 M08–M11 不启动。

---
type: folder-contract
updated: 2026-10-26
---

> **2026-10-18 最新授权（M05–M07）**：用户已指定新 coordinator chat `01a14da5-91fe-7bf1-a120-183975085f8b`（local），授权代开三个独立模块 chat/worktree、直接开发、双向答疑、审核和仅本地 merge；只做必要 testing，合并后由用户手动启动及业务测试。本条覆盖下文旧的 M05–M07 自行协调/未许可/禁止一切测试安排；M08–M11 未启动、不 push、不部署、不修改旧 native 库。当前执行与共享契约见 `planning/14_M05_M07_COORDINATION.md`（从仓库根目录解析）。

# planning 契约

2026-10-26 新需求入口为 [15_MANUAL_PASS_AND_FORM_CHANGE.md](15_MANUAL_PASS_AND_FORM_CHANGE.md)，主规范02/03/04的同日增量覆盖旧reader、单活动registration和强制期限规则。用户明确本轮仅更新需求/设计，暂不改应用代码；不启动模块、不运行应用/测试。新功能 NOT_IMPLEMENTED / NOT_RUN；历史M00–M07交付事实保留，旧图/UI尚未同步。

单一职责：维护可执行、可追溯的项目设计规范。

输入：../FYP Proposal Alex Hospital Visitor and Pass Management System with Blockchain Technology.pdf；../output/ui-redesign-v4/README.md；10_BASELINE_REVIEW.md 的来源与未决项。

处理：先从 README.md 或 PROJECT_MAP.md 路由；修改归属文件，再同步受影响的 API、验收与图。planning 只保留当前版本；图的源与收据由 diagrams/v3/CONTEXT.md 约束。

输出：01 三个月当前范围计划、02/03/04 主规范、09 目录计划、10 评审记录、11 初始化参考、12 coordinator/独立模块 chat 指南、PROJECT_MAP.md 修改影响索引。

人工检查：更新来源与状态，确认业务改变不是假定医院已批准；图未同步时必须在入口标明语义范围和待同步内容，不拿旧图作为新 QR/coordinator 规范。将来的 change record / module handoff 从 _templates/ 复制实例化，不把模板当事实或完成证据。

2026-10-10最新交付与测试规则（覆盖旧验收/自动测试指令）：M00–M04功能已合并本机main，M03 merge0067637、M04 merge446f887，组合入口dc6982341ed6135b0917a5cfafc4200f06e43e96；最新组合状态MERGED_PENDING_USER_MANUAL_TEST，未另行构建/测试，不冒充完整验收。用户要求“只需要把功能做出来，我自己手动测试”：助手不自行新增或执行测试、不进行浏览器/业务验收，不因旧测试关卡未执行阻止已授权的功能交付；源码/diff审阅可继续，额外构建/运行按用户后续明确要求。旧PASS保留原范围，未执行写NOT_RUN。当前已无已知阻塞交付的生产功能缺陷。本chat至M04结束协调，M05–M11由用户在新chat手动启动并自己协调，问题/共享契约/迁移/依赖直接问用户，不自动向旧coordinator或其他chat发消息；不自动创建/启动/审核/merge后续模块。用户明确启动指定模块即为一次开发许可，助手直接写有准确英文注释的功能并交回用户审核。不push、不部署、不修改旧native数据库。启动见planning/13_USER_MODULE_START_GUIDE.md；当前手动运行见Implementation/docs/runbooks/MANUAL_M00_M04.md。
