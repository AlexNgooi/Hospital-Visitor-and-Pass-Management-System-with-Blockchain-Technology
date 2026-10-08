# Implementation 契约

- **输入规范**：[目录计划](../planning/09_FOLDER_STRUCTURE.md)、[初始化指南](../planning/11_ENVIRONMENT_AND_MANUAL_INITIALIZATION.md)、[阶段指南](../planning/12_THREE_MONTH_CHAT_PLAN.md)；业务依据按任务读取 [架构](../planning/02_TECHNICAL_ARCHITECTURE.md)、[需求](../planning/03_REQUIREMENTS_AND_TEST_PLAN.md)、[数据/API](../planning/04_DATA_MODEL_AND_API_PLAN.md)。
- **单一职责**：保存 HSAAS 正式应用代码、运行配置和实施证据；沿用根 Git 仓库。当前 frontend/backend 为手动初始化的骨架，其余现有空目录不代表模块已实现。
- **输出**：frontend/、backend/ 内代码与配置；实际开发时按需增加其他模块；实施结果写入 docs/evidence/modules/Mxx/HANDOFF.md，由 coordinator 在 REVIEW.md 记录审核/本地 merge。已有 foundation 证据保留。
- **验证命令**：在 frontend/ 执行 `pnpm run build`；在 backend/ 执行 `.\mvnw.cmd test`，阶段验收执行 `.\mvnw.cmd verify`；在根目录执行 `git diff --cached --check`。构建通过不代表业务验收通过。
- **代码注释**：所有新写或修改的手写代码及指导示例必须有英文注释。主要模块/类/函数说明职责；关键业务、权限、事务、并发、QR 过期/撤销、错误恢复逻辑说明原因与约束。修改代码时同步维护注释；自动生成文件不手改，说明写在生成入口或相邻手写封装。
- **模块启动**：模块 chat 与开发仅由用户手动开启和启动；coordinator 准备任务、记录用户启动后的状态、答疑、审核与本地 merge，不代开模块或自动推进下一模块。
- **最新沟通/许可**：M00–M04 已按明确例外代开。所有模块主动向 coordinator 报问题/交接，coordinator 可回复技术决定；用户只给每模块一次明确开发许可。未经许可/依赖关卡/隔离仍不实施，范围内不重复求授权。用户已明确取消手写/guide方式：模块助手直接实现、测试、修复与交接，所有新增/修改代码有英文注释。具体 thread ID 和双向消息授权见 planning/12。
- **人工检查**：按 planning/12 使用独立 module chat/branch/worktree，模块直接编写有英文注释的代码，coordinator 管共享契约、审核与本地 merge。确认当前/deferred 范围、真实测试和未决项；密码只在被忽略本机文件或环境变量，不提交 .env/依赖/产物/PII，不再次 git init。WhatsApp/blockchain disabled，reader mock 只用于 synthetic demo/test；准备阶段不冒充源码实施。
