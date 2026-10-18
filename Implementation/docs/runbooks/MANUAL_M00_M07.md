# M00–M07：本机演示启动、停止与恢复

2026-10-18：M00–M06功能已在本机main合并，运行源码为 `761491e89910566c83fa184cb0aaa79ee625f128`；本M07文档提交由coordinator审核合并。**用户业务/数据库/启动/备份恢复验收均NOT_RUN，状态MERGED_PENDING_USER_MANUAL_TEST。** 文档按真实源码整理，不把功能合并或构建当业务PASS。

业务验收见 [逐项清单](MANUAL_ACCEPTANCE_M00_M07.md)，版本与历史证据见 [release manifest](RELEASE_MANIFEST_M00_M07.md)。新启动、业务、备份/恢复均 NOT_RUN；助手没有启动服务、浏览器或数据库。

## 环境与边界

使用Java21、项目锁定的Node/pnpm依赖、Docker Engine、一个全新独立MySQL8.0.45演示容器。只用TEST_ID/DEMO-与DEMO-MRN-合成资料，SIMULATED reader/交付，MRN mock/manual，本地审计。WhatsApp/blockchain disabled，没有外部调用/任务/历史补发。不修改旧native3306库，不读取或复制`.env`，不运行Flyway repair/baseline/clean。

正常应用从`/login`进入，不能以模块harness页代替已接线功能。loopback URL只适合同电脑浏览器；手机扫码后的127.0.0.1会指向手机，跨设备HTTPS/真机相机验收保持NOT_RUN。QR/grant是能力，不能把完整entry URL、cookie、CSRF或QR像素存到证据。不同职员/访客使用隔离浏览器cookie。

## 已核对的运行契约

| 输入 | 源码事实 |
|---|---|
| M05/M06源码与合并SHA | M05 source`cbf738e`、merge`6e458b7`；M06 C22 source`0a14f3a`、finaldelivery`ba940e7`、merge`0917266`；完整SHA见manifest |
| startup入口、端口、控制口、容器owner/name与存储生命周期 | `Implementation/scripts/manual-demo.mjs` + `ManualDemoSeed.java`已读；web15417/backend18407/control15418，container `hsaas-manual-m00-m07`；启动先拒绝占用，不停止已有服务 |
| V6/V7实际文件与开启开关 | `V6__card_assignment_simulation.sql` / `V7__administration_reporting.sql`；V1–V5不变；launcher显式启用QR/registration/review/lifecycle，M06复用现有ADMIN安全链，不需额外flag |
| DEMO用户/柜台/profile/device/card seed | 已定`demo_staff_a/b`柜台1、`demo_staff_other`柜台2、`demo_admin_a/b`仅ADMIN，公开合成密码`Public-synthetic-demo_1`；只种reference，不种登记/借用。M05设备按柜台创建，ADMIN正常ENROLL入库 |
| 完整功能路由/FeatureSlots | 已在main.tsx接线，见下表；ADMIN不能自动发卡 |
| dueAt与scheduler周期 | 发卡时按当前类别hours冻结UTC dueAt/key/version；默认24小时、最短1小时。monitor首次/每轮间隔30秒，最多50笔/轮；当前overdue读取按active且dueAt<=serverNow，不依赖monitor已运行 |
| lost/restore演示证据与政策 | ADMIN理由必选；LOST关闭活动借用并保留遗失case。RESTORE必须扫描同一sample、确认找回与可复用检查，reason=DEMO_RECOVERED_AND_CHECKED，旧借用仍关闭；非医院批准政策 |
| backup/restart/restore入口 | 已有`start`、`stop`、`backup`、`start --restore <backupDirectory>`；dump+匹配keys存gitignored `Implementation/tmp/manual-demo/backups/`。restore创建新owner容器/随机MySQL端口，stop删原DB，备份另留；恢复启动前撤销旧capability；startup中断在当前操作返回后清本次owned资源 |

M05演示边界：`hsaas.lifecycle.enabled=true`、reader mock、environment test；固定48个sample：`DEMO-{EXECUTIVE|PENJAGA|VENDOR|CONTRACTOR}-{001..012}`，UID/profile由服务器固定映射，不手填。归还仅允许**原发卡柜台**。四类return_hours初值24、可调1..720，是演示规则，既有借用dueAt冻结。

| 正常页面 | 角色 / 导航 |
|---|---|
| `/login`，`/staff`，`/admin` | 登录与按角色工作台 |
| `/staff/registration-qr` | COUNTER_STAFF / Registration QR |
| `/register` | PUBLIC，但必须通过有效动态entry/grant进入 |
| `/staff/registrations` | COUNTER_STAFF / Registration review |
| `/staff/passes` | COUNTER_STAFF / Pass lifecycle |
| `/admin/cards` | ADMIN / Card inventory |
| `/admin/users` | ADMIN / Staff accounts |
| `/admin/settings` | ADMIN / Operational settings |
| `/admin/reports` | ADMIN / Reports & overview |
| `/admin/audit` | ADMIN / Local audit |

旧[M00–M04手动指南](MANUAL_M00_M04.md)只覆盖到审核。其`tests/counter-review-real/harness.mjs`显式`reader-mode=disabled`且停止时删除其临时库；不能把该命令直接称为M00–M07完整启动器，也不能以停止后重开它代表数据恢复。

## 用户操作顺序

1. 在已合并的本机main核对HEAD、clean状态和manifest；保留准确运行SHA。不要默认从尚未push的远端重新clone。
2. 安装锁定前端依赖，按最终入口需要打包backend（skip tests）并准备classpath。每一步成功才继续；构建成功不是业务通过。
3. 先由用户启动Docker Engine，再在普通干净终端手动启动专用临时环境；不携带SPRING_/JVM/Node配置覆盖或native数据库URL。当前助手检查时Docker daemon不可用，启动失败不能改用native库；不要为通过启动而repair旧库。
4. 等真实backend和Vite就绪才打开正常`/login`；从navigation进入QR、review、lifecycle、ADMIN库存/账号/设置/报表。无槽位或能力disabled先记录缺项，不将空页当功能成功。
5. 按清单依次执行四类登记、人工审核、SIMULATED扫描/交付/借用/归还，另建记录做逾期、lost/restore和并发负面检查。
6. 需要留数据时先完成备份流程，再使用本次环境的stop入口。只停止本次拥有的进程/容器，不批量kill java/node/docker，不清理其他模块worktree。

PowerShell窗口1，每步成功才继续；路径为用户本机main，不能默认从未更新的远端取代本机提交：

```powershell
# Check the local release identity before preparing the isolated demonstration.
Set-Location -LiteralPath 'C:/Users/alexy/Documents/FYP Dev'
git status --short
git rev-parse HEAD

# Install exactly the committed frontend dependency graph.
Set-Location -LiteralPath 'C:/Users/alexy/Documents/FYP Dev/Implementation/frontend'
pnpm.cmd install --frozen-lockfile

# Package the application and generate its runtime classpath without running tests.
Set-Location -LiteralPath 'C:/Users/alexy/Documents/FYP Dev/Implementation/backend'
.\mvnw.cmd -B -DskipTests package dependency:build-classpath "-Dmdep.outputFile=target/manual-demo-classpath.txt"

# Start only the owned disposable database, real backend and frontend.
Set-Location -LiteralPath 'C:/Users/alexy/Documents/FYP Dev'
node Implementation/scripts/manual-demo.mjs start
```

等输出`READY manual demonstration: http://127.0.0.1:15417/login`，再开[演示登录](http://127.0.0.1:15417/login)。启动器不是业务测试，不会代填表单、登记库存、审核或发还卡。它使用独立MySQL8.0.45随机loopback端口，DB `hsaas_manual_m00_m07`、用户`manual_demo`，不连接native3306。日志/control metadata只在gitignored `Implementation/tmp/manual-demo/`；control bearer不应复制分享。

| 合成账号 | 权限 / 柜台 | 公开演示密码 |
|---|---|---|
| demo_staff_a / demo_staff_b | COUNTER_STAFF，柜台1 | Public-synthetic-demo_1 |
| demo_staff_other | COUNTER_STAFF，柜台2 | Public-synthetic-demo_1 |
| demo_admin_a / demo_admin_b | 仅ADMIN，无柜台发卡权限 | Public-synthetic-demo_1 |

这些是临时合成环境的公开账号；不要用于真实部署。reference seed只有四类别、`DEMO_WARD`/Synthetic Ward、`DEMO_OFFICE`/Synthetic Office与两柜台。库存由ADMIN正常ENROLL生成，登记/借用/事件不预种。恢复备份不会重新seed；如果用户改了账号/密码/权限，恢复后以备份点的值为准。

## 从QR到模拟归还的正常演示

1. 在ADMIN独立浏览器以`demo_admin_a`打开Card inventory：`Enroll a sample card`→Reader counter选柜台1→Synthetic sample选`DEMO-EXECUTIVE-001`→`Start bound scan`→`Read synthetic sample`→`Register scanned synthetic card`。其余三类各用`DEMO-<CATEGORY>-001`重复；UID/profile/类别由服务器确定。每笔scan须120秒内完成业务消费。同设备忙时取消原scan或等到期，不新开窗口绕过。
2. 在职员浏览器以`demo_staff_a`登录、选柜台1，打开Registration QR并点`Display registration QR`。默认每30秒换码、45秒challenge期限。此loopback环境可从开发者工具Network当前`/current`响应临时复制`entryUrl`，完整保留`#`后内容，立即放进**另一隔离匿名浏览器**。不把链接或QR截图写进证据；直接访问`/register`不能绕过入口。
3. 按[四类资料表](MANUAL_ACCEPTANCE_M00_M07.md)每类填写TEST_ID/DEMO-，Penjaga另填DEMO-MRN-/Synthetic Ward，其他类别Synthetic Office与相应组织/用途。确认演示隐私声明后提交，保存安全R-reference。grant默认20分钟，QR自然换码不让有效表单失效。下一份用新匿名会话或明确重新开始；不要与职员共用cookie。
4. 职员到Registration review：对reference打开详情、勾模拟身份核实；Penjaga须身份/MRN/ward三项。Approve后状态VERIFIED，**此时没有借用或Pass ID**；mock MATCH不能替代人工核实。拒绝单独用新记录且必选理由。
5. 职员到Pass lifecycle→Approved registrations选择`Prepare issue`。选对应已ENROLL的同类别sample→`Start bound scan`→`Read synthetic sample`，勾模拟已交付，点`Confirm simulated issue`。在receipt确认Pass ID、卡号、MYT dueAt、规则key/version与SIMULATED；不要用UID作Pass ID。
6. 归还在**原发卡柜台**的Pass lifecycle→`Open assignment`，RETURN扫描选择同一张sample，勾确认已收回，点`Confirm simulated return`。记录RETURNED且库存AVAILABLE，检查历史；错误sample、LOST或另一柜台均应被拒。列表不自动假定实时，使用`Refresh lists`/`Refresh inventory`读取当前状态。
7. 逾期请ADMIN在Operational settings先将要演示的类别设1小时，**再发新借用并实际等待至少1小时**；旧dueAt不受改设置影响。用`Only active overdue`与刷新核对server deadline，materialized内部告警可能等下一次30秒tick。等待后若会话到期，重新登录并选柜台，借用dueAt不延期。当前没有加速时间按钮，不改系统时钟或数据库造结果。活跃逾期可`Reveal phone for 30 seconds`，随后`Record internal follow-up`；每次真实reveal有新审计，不发送WhatsApp。
8. 遗失在ADMIN Card inventory→`Open card`，选REPORTED_LOST或MISSING_DURING_CHECK→`Mark LOST and close active loan`。恢复时选同sample完成RESTORE scan，并勾找回与复用检查，再`Restore sample to AVAILABLE`；固定DEMO_RECOVERED_AND_CHECKED，不复活旧借用。DISABLED仅从AVAILABLE通过DAMAGED/REMOVED_FROM_SERVICE产生，也需该扫描/确认流程恢复。

账号/设置/报表：Staff accounts可创建3–64字符canonical login、至少12字符且最多72UTF8 bytes初始密码的新职员，再显式分配柜台；角色/停用/权限变更会撤销旧会话，最后active ADMIN受保护。Operational settings修改须原因/版本，历史不删、既有dueAt不重算。Reports & overview先设MYT日期/category/ward并`Apply filters`，5秒poll；current assignments不随日期回溯，inventory只按category，掩码CSV最多10000条且有体积上限。Local audit核对这些动作，完整定义与限制见[manifest](RELEASE_MANIFEST_M00_M07.md)。

## UNKNOWN与恢复原则

超时、网络异常、服务停止均可能发生在commit之前或之后。M03登记与M04审核、M05生命周期保留页面内存中的原key/body/version/context，不自动重放写请求；后续4xx不能证明原命令未提交。M04有只读`Check current status`及`Retry original command`；M05有`Retry original command`，并没有同名通用状态核对按钮，扫描单独有`Refresh scan status`。当前权限仍须有效，必要时用另一个获授权会话只读核对历史，不能跨身份执行原命令。

M06账号/配置采用版本化写入，未知结果后应刷新权威列表/版本、账户login或本地审计再决定，不提供上述同名恢复句柄；创建账号先查canonical login，防止盲目重复创建。导出丢失响应仍可能已写export审计，不自动重试下载。整页刷新、换身份/柜台会丢失或卸载旧页面内存状态，先核对reference/借用/审计，不假定未提交。重新登录不自动恢复旧授权。

## 备份、还原与停止

仅对本次独立demo库操作：记下源码HEAD、镜像、迁移版本、UTC备份点及业务记录/事件数量；停写；备份数据库到被忽略且受控的本地目录，同时受控保存QR/hash密钥及版本映射，不写入Git。数据库备份可能包含session、合成contact与内部token，按敏感资料处理，不能上传聊天。

还原到**另一全新临时库**并使用备份时匹配的源码/密钥/迁移；不承诺跨schema版本升级恢复，不downgrade或修补旧native库。核对Flyway版本/失败项、登记审核、活动唯一性、LOST case、事件/审计和幂等结果，之后以新浏览器会话进入；备份中的旧QR、任务、会话应已被恢复流程撤销。没有备份的可丢弃环境停止后即丢数据，应新建演示而不是称为恢复成功。

在第二个普通PowerShell窗口执行。先停止手动写入，记录最后reference/Pass ID/事件和UTC时间，再backup。scheduler可能仍运行，dump采用single-transaction快照；不要把完成文件时间误当精确最后业务commit时间。

```powershell
# Save a private bundle before deleting this disposable database.
Set-Location -LiteralPath 'C:/Users/alexy/Documents/FYP Dev'
node Implementation/scripts/manual-demo.mjs backup

# Stop only this launcher's owned resources; saved bundles remain on disk.
node Implementation/scripts/manual-demo.mjs stop
```

backup成功会返回`Backup saved: <绝对目录>`，只接受`Implementation/tmp/manual-demo/backups/`下本启动器完整bundle。目录包含`database.sql`、`keys.json`及`complete.json`；失败/不完整bundle不能当备份成功，不能手改完成标记或密钥。不要把含keys或数据库的目录上传Git/聊天。

恢复前等待原窗口确认owned资源停止。把下面路径替换为backup刚返回的完整绝对目录，不输入尖括号占位：

```powershell
# Restore the selected private bundle into a new owned disposable database.
Set-Location -LiteralPath 'C:/Users/alexy/Documents/FYP Dev'
node Implementation/scripts/manual-demo.mjs start --restore 'C:/Users/alexy/Documents/FYP Dev/Implementation/tmp/manual-demo/backups/REPLACE_WITH_BACKUP_DIRECTORY'
```

restore不连接旧native数据库，不复用原容器，不重新seed，不自动合并备份后发生的写入。匹配keys与业务/历史/幂等结果一并保存；这不授权跨新旧会话执行旧命令。源码在导入后、Java启动前同事务撤销auth contexts、使bindings失效、撤销QR sessions/challenges/未消费grants、清device活动指针、取消CLAIMED/SUCCEEDED scan并删除framework sessions；业务根/借用/事件/已消费关联保留。用户须新会话登录、重新选柜台/创建QR和scan；旧cookie、QR或未完成扫描不能作恢复入口。该策略只做源码核对，**restore实际执行仍NOT_RUN**。普通`start`产生全新空演示；它不是恢复命令。

需要重启并保留数据时使用backup→stop→start --restore；当前没有保留DB的restart-backend子命令。没有backup就stop会丢失数据。旧M04停机地址15415不适用于本启动器；不要直接用浏览器访问15418控制口，它只接受私有本地CLI凭据且拒绝浏览器Origin。当前所有执行状态NOT_RUN，RPO24h/RTO4h只是建议目标。

正常stop或Ctrl+C会尝试精确子进程与owner container清理；启动中断会等正在进行的资源操作返回，捕获container ID后清理。强制结束进程、关闭窗口或关机不能保证清理完成。下次遇端口/同名容器占用时不要重复启动或批量kill；先只读核对占用和精确容器标签，再把安全诊断交coordinator处理，不贴含密码的完整docker inspect或control.json：

```powershell
# Inspect only the expected name and ownership label, without revealing container environment secrets.
docker inspect --format '{{.Name}}|{{index .Config.Labels "hsaas.demo.owner"}}' hsaas-manual-m00-m07

# Identify occupied demonstration listeners without stopping unrelated processes.
Get-NetTCPConnection -State Listen -LocalPort 18407,15417,15418 -ErrorAction SilentlyContinue |
    Select-Object LocalAddress,LocalPort,OwningProcess
```

本启动器拥有的容器应为`/hsaas-manual-m00-m07|hsaas-manual-m00-m07-v1`。标签不匹配不应认领/删除；无容器时inspect失败仅表示需另查端口，不是业务状态证明。

## FYP限制

这是当前本机synthetic演示交付；医院实际字段、隐私保留/冻结/删除政策、lost恢复制度、真实reader/profile、live MRN、HTTPS手机跨设备、生产会话/代理、WhatsApp、链/Sui证明、UAT/SUS、性能与实际恢复演练均未因此获得批准或PASS。M08–M11没有启动；不push、不部署。
