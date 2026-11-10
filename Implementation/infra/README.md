# 本机 MySQL 配置

运行见 [MANUAL_NATIVE.md](../docs/runbooks/MANUAL_NATIVE.md)。配置模板 `.env.native.example.json` 复制为被忽略的 `.env.native.json`，填写专用密码、端口与mysql/mysqldump路径。

演示库和账号为 `hsaas_manual_native`，只授予该库权限，不连接原hsaas_db。停止应用保留库、密钥及备份，不控制MySQL服务。旧环境数据与旧格式bundle不自动迁移/导入；需单独核对schema及匹配密钥。

SQL测试使用独立账号和随机库，见 [LOCAL_TESTING](../backend/LOCAL_TESTING.md)。不复用演示或业务数据。助手本轮未启动应用/数据库、执行迁移或恢复。
