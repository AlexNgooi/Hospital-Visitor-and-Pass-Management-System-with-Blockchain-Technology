# infra 目录契约

- **输入规范**：[架构规范](../../planning/02_TECHNICAL_ARCHITECTURE.md)、[目录计划](../../planning/09_FOLDER_STRUCTURE.md)、[初始化指南](../../planning/11_ENVIRONMENT_AND_MANUAL_INITIALIZATION.md)。
- **单一职责**：保存 HSAAS 的本地基础设施与部署配置。当前开发主路径使用本机 MySQL，端口为 3306；Compose 作为可选容器环境，计划使用主机端口 3307。
- **输出**：compose.yaml、无真实密码的 .env.example、README.md；后续按阶段需要补充部署配置。
- **验证命令**：在本目录执行 `docker compose --profile optional-db --env-file .env.example config --quiet`。此命令检查配置，不代表数据库运行验收通过。
- **人工检查**：确认端口不冲突、真实密码不进入 Git，并明确本机数据库与容器数据库的用途。
