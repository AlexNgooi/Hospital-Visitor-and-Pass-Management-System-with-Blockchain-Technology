# P0 初始化检查与 P1 入口

检查日期：2026-10-08（Asia/Singapore）。首次检查时 HEAD：`7454dcc`；分支：`main`。本文件保留首次检查证据，并在下方记录 P0 补齐结果。这是初始化检查，不是 P1 或业务功能验收。

## 首次检查结果（历史证据）

| 项目 | 命令 / 依据 | 结果 |
|---|---|---|
| 前端构建 | frontend/：`pnpm run build` | PASS，exit 0，Vite 8.3.2 构建成功 |
| 后端骨架测试 | backend/：`.\mvnw.cmd -B test` | PASS，exit 0，1 test，0 failures，0 errors |
| MySQL 连接 | 本次后端测试中的 Hikari/Flyway 日志 | PASS，连接 localhost:3306/hsaas_db；配置账号 hsaas |
| Flyway 初始化 | 本次后端测试日志 | 创建 flyway_schema_history；0 migrations，尚无业务 schema 基线 |
| Git 基线 | `git log -3 --oneline` | 已有本地提交；本次未执行 fetch/push，不判断远程同步状态 |
| 秘密文件隔离 | `git check-ignore -v Implementation/backend/.env` 与 `git ls-files` | .env 被根规则忽略，未跟踪；未记录密码 |
| 目录契约 | Implementation/、frontend/、backend/ 的 CONTEXT.md | 已存在；本次补 docs/ 契约 |
| 工具版本 | 版本命令 | Node 24.20.0；pnpm 11.19.0；Java 21.0.12.1；MySQL client 8.0.45 |
| Docker 引擎 | `docker info --format '{{.ServerVersion}}'` | FAIL，dockerDesktopLinuxEngine 管道不存在，引擎当前不可用 |
| infra 基础文件 | 实际目录检查 | 缺 compose.yaml、.env.example、CONTEXT.md |

测试依赖开发数据库和 backend/.env；本次 Flyway 在开发库创建了历史表。此测试不是隔离的业务集成测试，P1 应建立独立测试库或 Testcontainers MySQL。不要提交 target/ 下原始报告中的默认开发安全密码。

## P0 补齐检查

补齐检查开始：2026-10-08 15:10（Asia/Singapore）。检查时 HEAD：`6c14a81eef58c5db416e51a0791c83027645f8b3`；分支：`main`；修改前 `git status --short` 无输出。用户授权助手补齐非 source code 的 P0 配置和文档，源码仍由用户手写；助手不执行 commit/push。

| 项目 | 命令 / 依据 | 结果 |
|---|---|---|
| Docker 引擎 | `docker info --format '{{.ServerVersion}}'` | PASS，exit 0，29.8.0；用户截图和本次只读检查均通过，首次检查的失败已解除 |
| Compose CLI | `docker compose version` | PASS，exit 0，v5.5.1 |
| MySQL 镜像标签 | `docker manifest inspect mysql:8.0.45` | PASS，exit 0，manifest 可访问；未拉取镜像、未启动容器 |
| 端口现状 | `Get-NetTCPConnection -State Listen -LocalPort 3306,3307 -ErrorAction SilentlyContinue` | 3306 有监听；3307 当前无监听；未停止本机 MySQL |
| infra 最小文件 | 实际文件检查 | PASS，compose.yaml、.env.example、CONTEXT.md 已齐；新增 README.md 说明用途与操作 |
| Compose 静态验证 | infra/：`docker compose --profile optional-db --env-file .env.example config --quiet` | PASS，exit 0；只解析配置，不启动容器 |
| 解析后的关键配置 | `config --format json` 的内存解析，未保存完整配置输出 | PASS，固定 mysql:8.0.45、optional-db profile、127.0.0.1:3307 → 容器 3306、命名数据卷、两个密码均为模板占位值 |
| 秘密隔离 | `git check-ignore -v Implementation/backend/.env Implementation/infra/.env` 与 `git ls-files --` 两个路径 | PASS，两个 .env 路径受根规则忽略，均未跟踪；未读取真实密码文件 |
| 模板可提交 | `git check-ignore -q --no-index Implementation/infra/.env.example` | exit 1，表示未被忽略，符合预期 |
| 空白检查 | `git diff --check` | PASS，exit 0；LF/CRLF 提示不影响本次检查 |
| 容器状态 | `docker ps --filter label=com.docker.compose.project=hsaas-infra --format '{{.Names}} {{.Status}}'` | 无输出，本项目没有运行中的 Compose 容器 |
| 旧的未提交项 | `git show -1 --stat` 与修改前的 clean status | application.yaml、docs/CONTEXT.md、首次 P0_REVIEW.md、infra/CONTEXT.md 已包含在用户最新提交中 |

本轮未重跑前端 build 或后端 test；沿用首次检查的 PASS 证据，本轮未改动前后端源码或后端连接配置。Compose 数据库是可选环境，不是已建立的 P1 测试隔离方案。容器启动、连接和持久化验证均 NOT_RUN；当前后端继续使用本机 MySQL 3306。

## 当前状态与用户下一步

**P0 技术初始化关卡已补齐，可进入 P1；本轮配置和检查记录仍待用户审阅并手动提交。P1 尚未开始。**

本轮变更：infra/compose.yaml、infra/.env.example、infra/README.md、infra/CONTEXT.md，以及本文件。未创建实际 infra/.env；未执行容器启动、构建、测试、commit、fetch 或 push。

用户下一步只审阅并提交本轮 P0 文件。远程同步仍由用户自行决定和执行，不以当前本地检查推断远程状态。后续阶段按 12 写独立 handoff，并保存当时的 commit 与实际验收结果。

## P1 第一项动作

先读本文件和根 AGENTS.md；检查用户本轮提交后的工作树，再读取 planning/02、03 的非功能需求、04 的 migration/API 规则、09、10 和 backend/CONTEXT.md。第一个小任务是核对现有后端依赖、包名、测试和配置，形成 P1 初始化决策，确定独立测试数据库路径；不立即添加业务功能。沿用现有骨架和 backend/.env 导入方式。

之后按 planning/12 的 Chat 01 范围逐步完成 P1：MySQL/Flyway 基线、session/CSRF、login/logout/me、最小用户模型、Counter Staff/Admin RBAC、health、Vite 同源 proxy、CI、NFC/profile 与部署兼容性 spike。不进入登记、发卡或 Sui 业务，不自动 push。助手处理用户授权的非 source code 工作；源码由用户手写，每次只指导一个小步骤，解释目的、原理、操作和验收，等待用户反馈再继续。

现有 Spring 包名为 eduupm.hsaas，planning 建议 edu.upm.hsaas；P1 初始化审查时统一或记录决策，不重建整个项目。
