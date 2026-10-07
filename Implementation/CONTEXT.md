# Implementation 契约

- **输入规范**：[目录计划](../planning/09_FOLDER_STRUCTURE.md)、[初始化指南](../planning/11_ENVIRONMENT_AND_MANUAL_INITIALIZATION.md)、[阶段指南](../planning/12_THREE_MONTH_CHAT_PLAN.md)；业务依据按任务读取 [架构](../planning/02_TECHNICAL_ARCHITECTURE.md)、[需求](../planning/03_REQUIREMENTS_AND_TEST_PLAN.md)、[数据/API](../planning/04_DATA_MODEL_AND_API_PLAN.md)。
- **单一职责**：保存 HSAAS 正式应用代码、运行配置和实施证据；沿用根 Git 仓库。当前 frontend/backend 为手动初始化的骨架，其余现有空目录不代表模块已实现。
- **输出**：frontend/、backend/ 内代码与配置；实际开发时按需增加其他模块；实施结果写入 docs/evidence/，每阶段结束保存 HANDOFF.md。
- **验证命令**：在 frontend/ 执行 `pnpm run build`；在 backend/ 执行 `.\mvnw.cmd test`，阶段验收执行 `.\mvnw.cmd verify`；在根目录执行 `git diff --cached --check`。构建通过不代表业务验收通过。
- **人工检查**：确认阶段范围、真实测试结果和未决项；密码只保存在被忽略的本机文件或环境变量中，不提交 .env、依赖目录、构建产物或真实 PII；不在本目录再次 git init。
