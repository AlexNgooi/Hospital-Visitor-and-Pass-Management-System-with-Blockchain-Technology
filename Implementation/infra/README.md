# P0 本地基础设施

## 当前使用方式

当前开发主路径仍为本机 MySQL：`localhost:3306/hsaas_db`，后端账号为 `hsaas`。本次不修改后端连接配置，也不启动容器。

`compose.yaml` 提供可选的容器数据库，通过 `optional-db` profile 显式启用；它不是 P1 自动化测试库。P1 再选择独立测试库或 Testcontainers，并验证与开发数据库的隔离。

容器使用 `mysql:8.0.45`；P0 检查已确认该标签的 manifest 可访问。镜像尚未拉取，容器启动、连接和数据持久化均未验收。本机已知的 8.0.45 是 MySQL client 版本，不代表本次确认了本机 server 版本。

## 文件与变量

- `CONTEXT.md`：目录职责和验证入口。
- `compose.yaml`：服务、端口、数据卷和健康检查。
- `.env.example`：可提交的变量模板，密码仅为占位值。
- `.env`：需要运行容器时由开发者本地创建，根 `.gitignore` 忽略；不提交、不贴入聊天。

| 变量 | 用途 |
|---|---|
| `MYSQL_HOST_PORT` | Compose 主机端口，默认 3307 |
| `MYSQL_DATABASE` | 首次初始化创建的数据库，示例 hsaas_db |
| `MYSQL_USER` | 首次初始化创建的普通数据库账号，示例 hsaas |
| `MYSQL_PASSWORD` | 普通账号密码；实际使用前替换占位值 |
| `MYSQL_ROOT_PASSWORD` | root 管理员密码；实际使用前替换占位值 |

这些变量不会自动改变后端配置。后端继续从 `Implementation/backend/.env` 按 Java Properties 格式导入 `HSAAS_DB_PASSWORD`；infra/.env 是由 Docker Compose 读取的另一份配置。

## P0 静态验证

在本目录执行：

```powershell
docker compose --profile optional-db --env-file .env.example config --quiet
$LASTEXITCODE
```

`--profile optional-db` 选中可选服务，`--env-file` 指定变量来源，`config --quiet` 解析并验证配置但不输出配置值。退出码为 0 表示配置解析通过；不会拉取镜像、创建容器或验收数据库连接。不要使用示例密码启动数据库。

## 后续需要容器时

1. 在编辑器中将 `.env.example` 复制为本目录的 `.env`；若已有 .env，先检查内容，不覆盖已有配置。
2. 将两个密码占位值分别改为本地强密码。不要复用现有本机 MySQL 的密码。
3. 确认 Docker Desktop 正在运行，3307 可用；在本目录用本机 .env 先验证，再启动：

```powershell
docker compose --profile optional-db --env-file .env config --quiet
docker compose --profile optional-db --env-file .env up -d mysql
docker compose --profile optional-db --env-file .env ps
```

仅在静态验证成功后执行启动命令。主机连接地址为 `127.0.0.1:3307`，映射到容器内部的 3306；绑定 127.0.0.1 限制为本机访问。即使数据库名相同，它也与本机 3306 的数据库完全独立；没有自动迁移或同步数据。

默认健康检查使用 `mysqladmin ping` 判断服务响应，不验证应用账号权限、Flyway migrations 或业务表；这些需要单独连接/集成测试。若未来切换后端连接目标，必须显式调整连接配置并重新验收，本次未做切换。

停止容器但保留数据卷：

```powershell
docker compose --profile optional-db --env-file .env down
```

`mysql-data` 保存数据库数据。不要给停止命令添加 `--volumes` 或 `-v`，这些选项会删除数据卷。

MySQL 初始化变量只对空数据目录首次初始化生效。修改 .env 中的密码或数据库名不会自动修改已有卷中的账号或数据库；不要通过删除数据卷来处理此类配置变化。

## 官方依据

- [MySQL 官方镜像：环境变量、首次初始化与数据存储](https://hub.docker.com/_/mysql)
- [Compose 变量插值与 --env-file](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)
- [Compose profiles](https://docs.docker.com/compose/how-tos/profiles/)
