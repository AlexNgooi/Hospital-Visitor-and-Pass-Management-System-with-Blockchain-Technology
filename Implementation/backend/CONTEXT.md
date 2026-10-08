# backend 契约

- **输入规范**：[技术架构](../../planning/02_TECHNICAL_ARCHITECTURE.md)、[需求与验收](../../planning/03_REQUIREMENTS_AND_TEST_PLAN.md)、[数据/API](../../planning/04_DATA_MODEL_AND_API_PLAN.md)；目录边界见 [目录计划](../../planning/09_FOLDER_STRUCTURE.md)。
- **单一职责**：Java 21 / Maven Wrapper / Spring Boot 服务端。M00 已实现 auth/config/common、Flyway V1–V3、安全会话与事务基础；保留实际包名 eduupm.hsaas。模块证据不代表 QR/登记/发卡业务通过验收。
- **输出**：src/main/ 内代码、配置和后续 Flyway migrations；src/test/ 内测试；pom.xml 与 Maven Wrapper；证据保存到 ../docs/evidence/。target/ 不提交。
- **验证命令**：在本目录执行 `.\mvnw.cmd test` 或 `.\mvnw.cmd verify`；测试必须使用 Docker/Testcontainers 的临时 MySQL，无本机数据库 fallback。运行方式见 [README](README.md)。默认配置只接收显式数据库环境变量；仅 local profile 导入被忽略的 `.env`，按 Java Properties 格式读取。local profile 绑定 loopback，生产 cookie Secure。
- **人工检查**：按 [M00 handoff](../docs/evidence/modules/M00/HANDOFF.md) 审核实际提交；不修改已应用 migration、不自动 baseline/repair/clean。实际本机历史未检查，不能套用临时数据库的 upgrade PASS。所有代码有英文职责/关键规则注释；不提交秘密/target/真实 PII。
