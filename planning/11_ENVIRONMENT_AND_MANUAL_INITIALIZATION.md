---
type: manual-initialization-guide
updated: 2026-10-05
status: user-executed
---
# 环境检查与手动初始化指南

本文件只给操作步骤；Codex 不初始化应用、创建 Implementation 模块或安装工具，目录结构由开发者手动管理。检查发生在 Windows PowerShell 7.6.5、`C:\Users\alexy\Documents\FYP Dev`。

## 当前环境结论

| 项目 | 检查结果 | 开始开发前判断 |
|---|---|---|
| Git | 2.50.1；`main`；用户信息已配置；仓库零 commit、全部文件未跟踪 | **先做首次基线 commit**，否则没有可靠回滚点 |
| Java | OpenJDK/Javac 21.0.12.1 | 可用，符合项目 Java 21 决策 |
| Spring Boot | Initializr 当前默认 4.1.1.RELEASE；Java 默认 17 | 建议明确选 Java 21、Maven；不要依赖网页默认值 |
| Maven | 全局 `mvn` 不存在 | 不阻塞；Initializr 生成并提交 `mvnw.cmd`，以后统一用 Wrapper |
| Node/npm/pnpm | Node 24.20.0、npm 11.19.0；此前 pnpm 来自 Codex 私有 fallback，普通终端不可用 | Node/npm 可用；开发者先安装 pnpm 11.19.0 并在自己的终端验证 |
| Docker | CLI/Engine 29.8.0；Desktop engine 可响应；12 CPU、7.6 GiB | 可用；Desktop Windows 服务显示 Manual/Stopped 但引擎正在响应，以 `docker info` 为准 |
| MySQL | client 8.0.45；MySQL 服务运行，3306 正在监听 | 可用；先为项目创建独立 database/user，不使用 root 运行应用 |
| 端口 | 8080、5173 空闲；3306 已由 MySQL 使用 | 当前无前后端端口冲突 |
| Sui CLI | 未安装 | P0 不阻塞；最迟 P4 前安装并固定 Testnet 兼容版本 |
| WSL | 只有 `docker-desktop`，没有 Ubuntu 开发发行版 | 若采用 `suiup`，先装 Ubuntu WSL；也可按官方 Windows Chocolatey 路径 |
| 磁盘 | C 盘约 207.5 GiB 可用 | 足够当前开发 |

结论：**可以开始 P0 手动初始化和 P1 的 Web/数据库开发**。目前不能直接执行 Move/Sui CLI 测试；这不会阻止前三个阶段，但必须在 P4 前解决。

## 0. 先建立可回滚基线

1. 在根目录手动创建 `.gitignore`，至少包含：

```gitignore
.env
.env.*
!.env.example
node_modules/
dist/
target/
.idea/
.vscode/
tmp/
*.log
planning/.chrome-*/
```

2. 检查将提交的文件，不要把真实密钥、病人资料或临时浏览器 profile 放入 Git：

```powershell
Set-Location 'C:\Users\alexy\Documents\FYP Dev'
git status --short
git add .gitignore AGENTS.md CONTEXT.md planning output
git diff --cached --stat
git diff --cached --check
git commit -m 'docs: baseline current HSAAS planning'
```

如果 proposal PDF 需要版本控制，先确认大小和学校资料规则，再单独 `git add`。`tmp/` 不应进入首次提交。

## 1. 手动初始化前端

先在你自己的 PowerShell 中安装固定版本的 pnpm。此前检测到的 pnpm 来自 Codex 自带运行环境，不能作为普通终端已安装的证据：

```powershell
npm.cmd install --global pnpm@11.19.0
pnpm.cmd --version
```

若安装后仍找不到命令，关闭并重新打开终端，再执行 `pnpm.cmd --version`。确认输出 11.19.0 后继续。安装只由开发者手动执行。

Vite 官方支持 React TypeScript 模板。执行：

```powershell
Set-Location 'C:\Users\alexy\Documents\FYP Dev\Implementation'
pnpm create vite frontend --template react-ts
Set-Location frontend
pnpm install
pnpm run build
```

构建成功后再加 router、测试和 UI 依赖。先提交 Vite 生成的 lockfile；整个仓库只使用 pnpm，不混用 npm/yarn lockfile。

## 2. 手动初始化后端

到 [Spring Initializr](https://start.spring.io/) 选择：Project=Maven、Language=Java、Spring Boot=4.1.1、Group=`edu.upm`、Artifact=`hsaas-backend`、Package=`edu.upm.hsaas`、Packaging=Jar、Java=21。依赖选择：Spring Web、Validation、Spring Security、Spring Data JPA、JDBC API、Flyway Migration、MySQL Driver、Spring Session for JDBC、Actuator。

下载后把内容解压到 `Implementation/backend/`，确认其中有 `mvnw.cmd`，然后执行：

```powershell
Set-Location 'C:\Users\alexy\Documents\FYP Dev\Implementation\backend'
.\mvnw.cmd --version
.\mvnw.cmd test
```

不要为了缺少全局 Maven 再安装一套 Maven；Wrapper 是本项目的固定入口。

## 3. 建立最小目录，而不是一次创建所有空文件夹

P0 只创建已有真实职责的目录和文件：

```text
Implementation/
├── CONTEXT.md
├── frontend/                    Vite 实际工程 + CONTEXT.md
├── backend/                     Spring 实际工程 + CONTEXT.md
├── infra/compose.yaml           本地 MySQL/服务配置入口
├── infra/.env.example           只放变量名与安全示例
├── infra/CONTEXT.md
└── docs/evidence/foundation/    P0/P1 命令和测试收据
```

`Implementation/reader-agent/` 在 P1 硬件 spike 开始时创建，`Implementation/sui-worker/` 与 `Implementation/move/` 在 P4 开始时创建。不要在 `Implementation/` 内再次执行 `git init`，也不要预建空的 `controller/service/repository` 树；按业务域在有第一份真实代码时创建。完整目标结构见 [09_FOLDER_STRUCTURE.md](09_FOLDER_STRUCTURE.md)。

每个 `CONTEXT.md` 只写五项：输入规范、单一职责、输出、验证命令、人工检查。

## 4. 准备本地 MySQL

MySQL 已在 3306 运行。用管理员账号进入 MySQL 后，手动创建项目专用 database 和最小权限用户；密码只放本机 `.env`，不写入文档或 Git。

```sql
CREATE DATABASE hsaas_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'hsaas_app'@'localhost' IDENTIFIED BY '<local-strong-password>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON hsaas_dev.* TO 'hsaas_app'@'localhost';
FLUSH PRIVILEGES;
```

让 Flyway 成为 schema 唯一创建入口；不要用 Hibernate 自动更新生产结构。测试阶段应另外创建 `hsaas_test` 或使用 Testcontainers MySQL。

## 5. P0 验收命令

```powershell
git status --short
git log -1 --oneline
node --version
pnpm --version
java --version
docker info
mysql --version
Set-Location Implementation\frontend; pnpm run build
Set-Location ..\backend; .\mvnw.cmd test
```

P0 的完成证据要保存命令、时间、exit code 与必要摘要，不保存 `.env`、cookie、密码、私钥或真实 PII。

## 6. P4 前安装 Sui

官方当前推荐 `suiup` 并用 `suiup install sui@testnet` 安装与 Testnet 匹配的工具链。Windows 也支持 `choco install sui`，但官方说明 `suiup` 更适合版本切换。当前机器已有 Chocolatey，但没有一般用途的 WSL Ubuntu；选择一种路线即可，不要同时维护多个 Sui 安装。

- 路线 A：安装 Ubuntu WSL，在 WSL 内按 [Sui Install](https://docs.sui.io/getting-started/onboarding/sui-install) 安装 `suiup`。
- 路线 B：以管理员 PowerShell 执行 `choco install sui`，然后重新打开终端。

完成后验证 `sui --version`、Testnet client environment、测试钱包与 faucet；私钥不得提交到 Git。

## 初始化停止点

当 frontend build、backend Wrapper test、MySQL 连接、首次 Git commit 都成功后停止继续加业务代码。接着按 [12_THREE_MONTH_CHAT_PLAN.md](12_THREE_MONTH_CHAT_PLAN.md) 启动 Chat 01，让新 chat 先验证你手动创建的结构。
