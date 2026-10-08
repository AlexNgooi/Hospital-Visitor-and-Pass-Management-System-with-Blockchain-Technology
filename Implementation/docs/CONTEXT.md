# docs 契约

- **输入规范**：[需求与测试计划](../../planning/03_REQUIREMENTS_AND_TEST_PLAN.md)、[初始化指南](../../planning/11_ENVIRONMENT_AND_MANUAL_INITIALIZATION.md)、[阶段指南](../../planning/12_THREE_MONTH_CHAT_PLAN.md)，以及实际代码 commit 与运行结果。
- **单一职责**：保存可追溯的实施检查、阶段 handoff 和运维说明；不把规划或骨架测试当作业务验收。
- **输出**：evidence/foundation/ 保存 P0 历史检查；后续 evidence/modules/Mxx/HANDOFF.md、QUESTIONS.md 保存模块交接/问题，REVIEW.md 由 coordinator 记录审核/merge/回归。阶段仍是时间关卡，使用独立 module chat。
- **验证命令**：在 frontend/ 执行 `pnpm run build`，在 backend/ 执行 `.\mvnw.cmd test` 或阶段要求的 verify；核对证据中的命令、时间、结果与 Git 状态。
- **人工检查**：记录失败、未执行项与限制，不保存密码、cookie、私钥或真实 PII；只有实际测试通过才标 PASS。
