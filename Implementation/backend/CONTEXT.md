# backend 契约

- **输入规范**：[技术架构](../../planning/02_TECHNICAL_ARCHITECTURE.md)、[需求与验收](../../planning/03_REQUIREMENTS_AND_TEST_PLAN.md)、[数据/API](../../planning/04_DATA_MODEL_AND_API_PLAN.md)；目录边界见 [目录计划](../../planning/09_FOLDER_STRUCTURE.md)。
- **单一职责**：Java 21 / Maven Wrapper / Spring Boot 服务端，按业务域管理 API、权限和 MySQL 事务；当前为初始化骨架，session/RBAC 和业务模块尚未验收。实际生成包名为 eduupm.hsaas，后续是否迁移须在实施阶段处理。
- **输出**：src/main/ 内代码、配置和后续 Flyway migrations；src/test/ 内测试；pom.xml 与 Maven Wrapper；证据保存到 ../docs/evidence/。target/ 不提交。
- **验证命令**：在本目录执行 `.\mvnw.cmd test`；阶段验收执行 `.\mvnw.cmd verify`；启动执行 `.\mvnw.cmd spring-boot:run`。application.yaml 使用 `optional:file:./.env[.properties]` 导入本目录 .env 并引用 HSAAS_DB_PASSWORD；.env 按 Java Properties 格式读取，不加引号，反斜杠需转义。
- **人工检查**：使用项目专用 MySQL 账号，确认数据库已创建；检查事务一致性、RBAC、CSRF、扫描任务隔离与 callback 校验；不提交 .env，不在日志/证据中保存密码或真实 PII；测试通过与运行成功须分别记录。
