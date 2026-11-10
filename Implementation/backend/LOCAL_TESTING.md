# 本机隔离 MySQL 测试

更新：2026-11-10。保留现有七组SQL业务测试，测试环境改为本机MySQL；测试默认不连接数据库，只有用户明确启用后才运行。当前仅编译检查，未执行native SQL测试。

## 隔离边界

- 专用账号固定为 `hsaas_test_runner`，密码从 `HSAAS_TEST_DB_PASSWORD` 读取，TCP仅连接127.0.0.1，端口为 `HSAAS_TEST_DB_PORT`（默认3306）。不读取应用.env，不接受业务库名或root账号。
- 由用户为该账号配置仅针对 `hsaas_test_` 前缀随机库的创建、删除、DDL/DML和测试trigger权限；不授予原hsaas_db或演示库权限。可使用独立本机MySQL测试实例的端口以进一步隔离。
- `testing/LocalMysql.java` 每个fixture生成UUID库名，cleanup只能删除它自己成功创建的精确库。测试数据可丢弃，不能把真实资料写入该前缀的库。
- 测试需要原生MySQL 8.0能力及测试trigger支持；实例的二进制日志/权限政策若禁止trigger，测试应失败，由用户在专用测试实例处理，助手不自动修改全局MySQL配置。
- 断线场景只关闭该fixture自己的loopback代理连接；MySQL服务、其他数据库及应用连接不受控制。
- 迁移probe也使用另一个随机专用库，不创建固定migration_probe，不使用root。进程被强制终止可能留下随机测试库；先确认没有测试进程使用，再由用户按精确库名检查清理。

## 用户运行方式

先在私有本机环境配置专用测试密码；不要把值写入Git、命令行参数或聊天。普通打包使用 `mvnw.cmd -B -DskipTests package`，不会执行测试。

```powershell
# Explicitly enable only the dedicated native test fixtures after provisioning the restricted account.
$env:HSAAS_LOCAL_MYSQL_TESTS = 'true'
$env:HSAAS_TEST_DB_PORT = '3306'
# Set HSAAS_TEST_DB_PASSWORD privately before this command; do not print it.
.\mvnw.cmd -B verify
```

未设置opt-in时，七组数据库测试由JUnit condition跳过；这不等于通过SQL验收。纯单元测试不依赖MySQL。项目现行安排由用户自行决定和执行测试，助手只做必要编译/构建检查。
