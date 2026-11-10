# 本机 MySQL（无需 Docker）

正常运行入口见 [MANUAL_NATIVE.md](../docs/runbooks/MANUAL_NATIVE.md)。`manual-demo.mjs` 已改为持久化本机 MySQL；Compose 与旧容器变量模板已移除。

将 `.env.native.example.json` 复制为被忽略的 `.env.native.json`，填写专用密码、端口和 mysql/mysqldump 路径。新演示库与账号均为 `hsaas_manual_native`，账号仅限这个库，不连接原 `hsaas_db`。配置、密钥和数据库备份不提交或分享。

停止应用保留数据库与密钥，不控制 MySQL 服务。现有 Docker 容器、数据卷与旧 demo 数据不自动迁移或删除。旧 Docker bundle 不能直接用 native launcher 恢复。

历史 Testcontainers/集成 harness 仍是可选隔离测试设施，不是 webapp 的运行依赖。助手本轮仅做静态/构建检查，没有执行数据库、服务启动或迁移。
