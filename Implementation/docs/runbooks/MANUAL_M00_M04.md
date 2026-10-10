# M00–M04：用户手动运行与验收

2026-10-10：功能已合并本机 main；组合入口源 dc6982341ed6135b0917a5cfafc4200f06e43e96。助手依最新要求没有执行组合后的构建/测试或启动本指南环境。下面命令由你选择执行，结果由你确认，不预先标 PASS。

可检查：职员登录/注销/柜台选择 → 实时轮换 QR → 四类 DEMO 登记/隐私确认 → 掩码队列/详情 → 人工模拟核实、批准或拒绝。批准到 VERIFIED 为止；没有发卡、Pass ID、借用/归还、截止/逾期，后者属于 M05。医院 live、reader、WhatsApp、blockchain 未启用。

## 启动独立演示环境

需要 Java21、Node、项目 pnpm、Docker Engine。复用已交付 M04 隔离启动器，只启动真实后端、Vite 和演示参考数据；不要执行 browser.js、vitest、mvn verify 或其他测试脚本。打开正常应用 `/login`，不是模块独立 `harness.html`。

启动器使用随机映射端口的新 MySQL8.0.45 容器、classpath 配置及合成账号，不读取项目 `.env`，不连接 native3306。旧 native 库 checksum 问题未修复，不能用旧5173页面证明整合可运行。18404/15414/15415 被占用或同名容器存在时拒绝启动，不停原服务。继承配置被拒时用没有 SPRING_/JAVA_TOOL_OPTIONS/NODE_OPTIONS 等注入的普通终端，不绕过检查。

PowerShell 窗口1，准备依赖和功能 JAR，跳过测试；前一步成功才继续：

```powershell
# Install locked frontend dependencies and prepare the disposable launcher directory.
Set-Location -LiteralPath 'C:/Users/alexy/Documents/FYP Dev/Implementation/frontend'
pnpm.cmd install --frozen-lockfile
New-Item -ItemType Directory -Force -Path output/playwright | Out-Null

# Package application code and write the runtime classpath without running tests.
Set-Location -LiteralPath 'C:/Users/alexy/Documents/FYP Dev/Implementation/backend'
.\mvnw.cmd -B -DskipTests package dependency:build-classpath "-Dmdep.outputFile=../frontend/output/playwright/m04-runtime-classpath.txt"

# Launch only disposable servers; do not execute browser.js or other test runners.
Set-Location -LiteralPath 'C:/Users/alexy/Documents/FYP Dev/Implementation/frontend'
node tests/counter-review-real/harness.mjs
```

只在 Maven 成功且显示 `READY owned M04 real HTTP` 后打开 [本机演示登录](http://127.0.0.1:15414/login)。普通终端没有 pnpm 时按 [环境参考](../../../planning/11_ENVIRONMENT_AND_MANUAL_INITIALIZATION.md) 安装已有固定版本，不重新生成项目。

| 演示账号 | 角色 | 密码 / 范围 |
|---|---|---|
| review_a | COUNTER_STAFF | Public-synthetic-review_1；柜台1 |
| review_b | COUNTER_STAFF | Public-synthetic-review_1；柜台1，供第二浏览器操作 |
| review_admin | ADMIN | Public-synthetic-review_1；无柜台审核权限，M06尚未实现 |

以上是公开的临时合成账号，不能用于生产。柜台 Synthetic review counter；目的地 Synthetic Ward / Synthetic Office。环境重建会清空演示记录。

## 手动检查范围

1. review_a 登录，选择柜台1。可检查空密码、错误账号、会话失效和注销后访问职员页面。导航应有 **Registration QR** 和 **Registration review**。
2. `/staff/registration-qr` 点 **Display registration QR**。二维码每30秒轮换、有效45秒；断网/隐藏后重新确认有效性，不显示过期码。已开表单的20分钟为原期限，不随 QR 轮换延长。
3. 手机相机识别当前 QR，或浏览器开发者工具 Network 的 `.../current` 响应复制 `entryUrl`，立即放到本机另一浏览器/无痕窗口。必须保留 `#` 后部分，不存进交接文档或公开分享。此环境为 loopback，手机无法直接访问电脑127.0.0.1；跨设备真机/正式HTTPS未验收，需要以后单独配置。直接开 `/register` 不应绕过有效 QR。
4. 分别填 Penjaga、Executive、Vendor、Contractor 三步表单。用虚构姓名/电话和 TEST_ID，证件 `DEMO-ABCD`（DEMO-后4–24位大写字母/数字）；Penjaga MRN `DEMO-MRN-4821`（DEMO-MRN-后4–16位大写字母/数字）、Synthetic Ward。其他类别填虚构组织/公司/联系人、Synthetic Office 和用途；按要求填齐并确认演示隐私声明。
5. 检查空值/非法格式、上一步/下一步、信息确认、提交。成功只显示 `R-...` 参考号；MRN mock MATCH 不等于批准。公共页面无查询患者/访客 PII 的入口。
6. 回 `/staff/registrations`。队列约每5秒读取，也可 Refresh；筛选类别/状态，打开对应参考号，姓名/证件/电话/MRN 应掩码。每页10项，超过10条后可检查分页。
7. 非 Penjaga 勾身份模拟核实后才可批准；Penjaga 需身份、MRN、ward **三项**。批准后 VERIFIED、版本递增，刷新保持，无卡/Pass ID/截止/消息。
8. 另一条记录 Reject registration：不选理由不能提交，选理由确认后 REJECTED，刷新保持；已审核不能做新决定。
9. 另一独立浏览器 review_b 同开未审核记录。一方决定后另一方旧版本操作应冲突、刷新并重新检查；正常轮询可能先显示记录已改变，此时也阻止旧决定。
10. 可用开发者工具人为断网观察 UNKNOWN。**Check current status** 只读；**Retry original command** 保留原 key/body/version，不换新命令。仅断网不证明服务器已提交，需区分请求未达与回包丢失。恢复句柄仅在内存，整页刷新会丢失，应向柜台核对，不能假定未提交或重复建单。
11. 手机尺寸、错误提示、键盘操作由你检查。常见首屏已压缩；小屏、放大、展开帮助/错误、长内容保留必要滚动，保证按钮和内容可到达，不裁剪信息假装一屏完整。

同一公共浏览器已有未完成表单时，再开新 QR 应要求明确重新开始；取消保留旧表单，确认才撤销旧上下文。提交后的下一份可用新无痕会话，避免职员/访客共用 cookie。

## 停止

窗口2执行，只关闭启动器拥有的临时资源：

```powershell
# Stop the owned disposable backend, frontend and database through their loopback control.
Invoke-WebRequest -Method Post -Uri 'http://127.0.0.1:15415/stop'
```

启动窗口应显示 owned cleanup 并退出；临时容器被删除、不保留数据，不影响原数据库/旧服务。不要批量结束所有 java/node/docker 进程。

范围和历史结果见 [M03 REVIEW](../evidence/modules/M03/REVIEW.md)、[M04 REVIEW](../evidence/modules/M04/REVIEW.md)、[M04功能交接](../evidence/modules/M04/FUNCTION_HANDOFF.md)。问题继续对应模块 chat 返修；M05以后由你协调，[新 chat 启动指南](../../../planning/13_USER_MODULE_START_GUIDE.md) 提供每模块消息。
