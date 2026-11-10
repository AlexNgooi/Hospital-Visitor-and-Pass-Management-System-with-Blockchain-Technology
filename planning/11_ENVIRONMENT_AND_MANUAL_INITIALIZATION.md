# 本机环境与运行入口

更新：2026-11-10。日常使用本机 Node/pnpm、Java21与MySQL；无需容器或云端服务才能登记/审核/发还。

- 当前应用启动、专用数据库/账号、配置、端口、密钥、备份与恢复：[MANUAL_NATIVE.md](../Implementation/docs/runbooks/MANUAL_NATIVE.md)。不重复初始化，不复制旧私有配置或替换原业务库。
- 当前业务与多页面检查：[MANUAL_R01_R03.md](../Implementation/docs/runbooks/MANUAL_R01_R03.md)。
- 后端必要打包：在backend执行 `mvnw.cmd -B -DskipTests package`；前端build/lint使用锁定pnpm依赖。
- SQL集成测试：[本机隔离测试说明](../Implementation/backend/LOCAL_TESTING.md)。默认不开数据库，仅用户显式opt-in后使用固定受限账号与随机测试库。
- 后续链工具和网络：[SUI_TESTNET.md](SUI_TESTNET.md)。本机CLI/worker连接远程Testnet；不搭建full node/localnet，不安装或启动其他服务来替代现有计划。

助手本轮不启动数据库/应用、执行迁移/测试或发送链交易；构建与文档检查结果必须与用户业务验收分开报告。
