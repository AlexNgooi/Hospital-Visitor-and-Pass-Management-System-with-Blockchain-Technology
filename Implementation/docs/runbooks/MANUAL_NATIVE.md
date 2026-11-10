# 最新版：本机运行与多页面操作

2026-11-10。用户已明确要求将最新UI及 `codex/no-docker-multi-page` 的本机运行/多页面/规划清理成果合并并推送main。本指南使用主项目checkout；Git更新不会自动重启应用或迁移数据库。

## 一次性准备

Java 21、Node/pnpm、本机 MySQL 8.0；全部日常运行与测试工具使用本机进程。由用户在 MySQL 管理工具中创建新的专用数据库 `hsaas_manual_native`，字符集 utf8mb4；创建同名账号 `hsaas_manual_native`，允许从 `127.0.0.1` 连接，并且只授予该库所需的建表、迁移及数据读写权限。使用独立密码，不以 root 运行应用，不连接原 `hsaas_db`。若库/账号已存在先核对，不删除已有资料来满足初始化条件。

在 `Implementation/infra/` 将 `.env.native.example.json` 复制为 `.env.native.json`，填入专用密码、端口（默认3306）和本机 mysql.exe/mysqldump.exe 路径。该私有文件被 Git 忽略，不提交或分享。

本checkout为 `C:/Users/alexy/Documents/FYP Dev`，main已纳入本轮源码；若从GitHub获取，先更新main，再核对本机私有配置与构建产物。

## 构建与首次启动

```powershell
# Prepare the locked frontend dependencies and current UI.
Set-Location -LiteralPath 'C:/Users/alexy/Documents/FYP Dev/Implementation/frontend'
pnpm.cmd install --frozen-lockfile
pnpm.cmd run build

# Package the backend and prepare the seed classpath without running tests.
Set-Location -LiteralPath 'C:/Users/alexy/Documents/FYP Dev/Implementation/backend'
.\mvnw.cmd -B -DskipTests package dependency:build-classpath '-Dmdep.outputFile=target/manual-demo-classpath.txt'

# Read-only preparation: verify the dedicated database, artifacts and application ports.
Set-Location -LiteralPath 'C:/Users/alexy/Documents/FYP Dev'
node Implementation/scripts/manual-demo.mjs check

# First launch only: migrate an empty dedicated schema and seed synthetic accounts/reference data.
node Implementation/scripts/manual-demo.mjs start --initialize
```

等 `READY manual demonstration: http://127.0.0.1:15417/login` 后打开该地址。web15417/backend18407/control15418；占用端口会拒绝启动，不停止旧服务。Flyway 仅针对这个新的专用演示库执行 V1–V9，不执行 repair/baseline/clean。

以后启动：`node Implementation/scripts/manual-demo.mjs start`，`resume` 同义。普通重启不重新 seed、不删除数据。初始化中断可能留下已完成的 MySQL DDL；保留库、日志及 keys，核对失败阶段，不盲目重复初始化或清库。

启动器以 `tmp/manual-demo-native/launcher.lock` 防止并发启动。强制断电可能留下锁；先确认其中 PID 已退出、三个应用端口无人使用，再手动移除该锁文件。不要删除密钥或数据库来清理锁。

公开合成账号：`demo_staff_a` / `demo_staff_b` 柜台1；`demo_staff_other` 柜台2；`demo_admin_a` / `demo_admin_b` 为 ADMIN。初始公开演示密码为 `Public-synthetic-demo_1`，仅用于此合成环境。只 seed 账号/类别/地点，不伪造业务登记、库存或借还记录。

## 同时打开审核与二维码

1. 登录 Counter Staff，进入 Registration review。
2. 点击柜台栏 **Open QR in new tab**，审核页保留；新页继承当前柜台并由服务器校验权限。
3. 新页点 **Display registration QR**。可以把两页拖成并排窗口，无需重复登录。
4. QR 页的 **Open review in new tab** 可反向打开审核。导航菜单各入口右侧箭头也可另开页面，包括 ADMIN 工具。
5. 侧边栏默认隐藏，左上角菜单打开；点击关闭/遮罩或按 Escape 收起，焦点返回菜单按钮。

同一浏览器 profile 共享 staff session，退出会影响其他标签。不同角色和访客测试使用独立 profile 或私密窗口。普通同标签导航仍切换工具；使用新标签入口保留当前页面。隐藏后台 QR 标签时旧码会隐藏，恢复可见后重新验证；并排窗口可保持两页挂载。

## Scan 与 Copy link

QR 显示区有 **Copy link**，复制当前完整的 `/register#entry=...` 链接，访客立即粘贴到地址栏可进入同一登记表单。浏览器限制剪贴板时出现只读链接框，手动选中复制；该框仅在对应 QR 仍是当前有效码时显示。

链接与 QR 同一权限：30秒轮换、45秒过期、撤销同步生效，有效表单20分钟提交期限。不提供永久链接。复制内容必须保留 `#` 后全部内容；不把完整链接、QR 像素或私有密钥写入证据、日志或 Git。

当前 `127.0.0.1` 链接适合同电脑浏览器。手机扫码/跨设备访问仍需另外配置手机可达的 HTTPS 地址；Copy link 不改变网络前提。

## 停止、备份与恢复

在第二个 PowerShell 窗口切到本 checkout 根目录：

```powershell
# Save a private native database-and-key bundle while the launcher is running.
node Implementation/scripts/manual-demo.mjs backup

# Stop only owned application processes; native MySQL, data and keys remain.
node Implementation/scripts/manual-demo.mjs stop

# Resume the same persistent data without re-seeding.
node Implementation/scripts/manual-demo.mjs start
```

备份位于忽略目录 `Implementation/tmp/manual-demo-native/backups/`，有 database.sql、keys.json 与 complete.json。保留 `runtime-keys.json`；现有库缺密钥会拒绝生成替代密钥。

恢复需先停止应用，并由用户另行准备空的专用 schema，同时保留完整备份。`start --restore <备份完整目录>` 只接受本 native 备份根内的完整 bundle，非空库拒绝；不自动删除或覆盖现有数据。恢复保留业务历史，撤销旧登录、QR 与未完成扫描，需要重新登录。失败可能留下部分导入数据，启动器不会自动清库。

旧环境数据和旧格式bundle保持原样，不自动迁移或删除。旧bundle不能直接用新native恢复命令；迁移需另行核对备份、schema与匹配私有密钥。旧浏览器启动器已退役，SQL测试使用 [专用本机fixture](../../backend/LOCAL_TESTING.md)。

## 验证范围

本次仅做必要静态/构建检查：前端 build/lint、launcher syntax、后端 skip-tests package 和 seed 编译。真实启动、迁移、并排浏览器、剪贴板、业务与备份恢复均为用户手测（NOT_RUN）。业务检查沿用 MANUAL_R01_R03.md，不沿用旧 M00–M07 扫描发卡步骤。
