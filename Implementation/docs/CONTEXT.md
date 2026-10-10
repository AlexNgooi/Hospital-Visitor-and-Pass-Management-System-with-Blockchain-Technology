# docs 契约

- **输入规范**：[需求与测试计划](../../planning/03_REQUIREMENTS_AND_TEST_PLAN.md)、[初始化指南](../../planning/11_ENVIRONMENT_AND_MANUAL_INITIALIZATION.md)、[阶段指南](../../planning/12_THREE_MONTH_CHAT_PLAN.md)，以及实际代码 commit 与运行结果。
- **单一职责**：保存可追溯的实施检查、阶段 handoff 和运维说明；不把规划或骨架测试当作业务验收。
- **输出**：evidence/foundation/ 保存 P0 历史检查；后续 evidence/modules/Mxx/HANDOFF.md、QUESTIONS.md 保存模块交接/问题，REVIEW.md 由 coordinator 记录审核/merge/回归。阶段仍是时间关卡，使用独立 module chat。
- **验证命令**：在 frontend/ 执行 `pnpm run build`，在 backend/ 执行 `.\mvnw.cmd test` 或阶段要求的 verify；核对证据中的命令、时间、结果与 Git 状态。
- **人工检查**：记录失败、未执行项与限制，不保存密码、cookie、私钥或真实 PII；只有实际测试通过才标 PASS。

2026-10-10最新交付与测试规则（覆盖旧验收/自动测试指令）：M00–M04功能已合并本机main，M03 merge0067637、M04 merge446f887，组合入口dc6982341ed6135b0917a5cfafc4200f06e43e96；最新组合状态MERGED_PENDING_USER_MANUAL_TEST，未另行构建/测试，不冒充完整验收。用户要求“只需要把功能做出来，我自己手动测试”：助手不自行新增或执行测试、不进行浏览器/业务验收，不因旧测试关卡未执行阻止已授权的功能交付；源码/diff审阅可继续，额外构建/运行按用户后续明确要求。旧PASS保留原范围，未执行写NOT_RUN。当前已无已知阻塞交付的生产功能缺陷。本chat至M04结束协调，M05–M11由用户在新chat手动启动并自己协调，问题/共享契约/迁移/依赖直接问用户，不自动向旧coordinator或其他chat发消息；不自动创建/启动/审核/merge后续模块。用户明确启动指定模块即为一次开发许可，助手直接写有准确英文注释的功能并交回用户审核。不push、不部署、不修改旧native数据库。启动见planning/13_USER_MODULE_START_GUIDE.md；当前手动运行见Implementation/docs/runbooks/MANUAL_M00_M04.md。
