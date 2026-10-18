# M00–M07：本机演示启动、停止与恢复

2026-10-18，DRAFT_WAITING_M05_M06_MERGE。文档准备基线 `d103b888527c4ba8e90f37d93059daf2d78ed02f`，尚未收到 M05/M06 合并通知。专用启动器已按 `f7b3e490b59061ae6946beae9b3ad1137004e21a` 源码核对；下面命令仍等待完整功能合并及恢复修订，**暂不要把此草稿作为已完成交付运行**。M05/M06完成与新手动检查均未获验收。

业务验收见 [逐项清单](MANUAL_ACCEPTANCE_M00_M07.md)，版本与历史证据见 [release manifest](RELEASE_MANIFEST_M00_M07.md)。新启动、业务、备份/恢复均 NOT_RUN；助手没有启动服务、浏览器或数据库。

## 环境与边界

使用Java21、项目锁定的Node/pnpm依赖、Docker Engine、一个全新独立MySQL8.0.45演示容器。只用TEST_ID/DEMO-与DEMO-MRN-合成资料，SIMULATED reader/交付，MRN mock/manual，本地审计。WhatsApp/blockchain disabled，没有外部调用/任务/历史补发。不修改旧native3306库，不读取或复制`.env`，不运行Flyway repair/baseline/clean。

正常应用从`/login`进入，不能以模块harness页代替已接线功能。loopback URL只适合同电脑浏览器；手机扫码后的127.0.0.1会指向手机，跨设备HTTPS/真机相机验收保持NOT_RUN。QR/grant是能力，不能把完整entry URL、cookie、CSRF或QR像素存到证据。不同职员/访客使用隔离浏览器cookie。

## 最终启动器必须核对的输入

| 输入 | 当前事实 / 所需确认 |
|---|---|
| M05/M06源码与合并SHA | 等coordinator提供并在本worktree核对 |
| startup入口、端口、控制口、容器owner/name与存储生命周期 | `Implementation/scripts/manual-demo.mjs` + `ManualDemoSeed.java`已读；web15417/backend18407/control15418，container `hsaas-manual-m00-m07`；启动先拒绝占用，不停止已有服务 |
| V6/V7实际文件与开启开关 | 待最终核对；V1–V5不可修改 |
| DEMO用户/柜台/profile/device/card seed | 已定`demo_staff_a/b`柜台1、`demo_staff_other`柜台2、`demo_admin_a/b`仅ADMIN，公开合成密码`Public-synthetic-demo_1`；只种reference，不种登记/借用。M05设备按柜台创建，ADMIN正常ENROLL入库 |
| 完整功能路由/FeatureSlots | coordinator接线后核对，ADMIN不能自动发卡 |
| 最短可演示dueAt与scheduler周期 | M05待确认；不通过改系统时钟或历史SQL制造逾期 |
| lost/restore演示证据与政策 | M05待确认；需清楚标医院未批准 |
| backup/restart/restore入口 | 已有`start`、`stop`、`backup`、`start --restore <backupDirectory>`；dump+匹配keys存gitignored `Implementation/tmp/manual-demo/backups/`。restore创建新owner容器/随机MySQL端口，stop删原DB，备份另留；restore撤销旧capability与startup信号cleanup待coordinator修订 |

coordinator已确认的M05演示边界：`hsaas.lifecycle.enabled=true`、reader mock、environment test；固定48个sample：`DEMO-{EXECUTIVE|PENJAGA|VENDOR|CONTRACTOR}-{001..012}`，UID/profile由服务器固定映射，不手填。归还仅允许**原发卡柜台**。四类return_hours初值24、可调1..720，是演示规则，既有借用dueAt冻结；具体scheduler与UI仍待最终源码核对。

旧[M00–M04手动指南](MANUAL_M00_M04.md)只覆盖到审核。其`tests/counter-review-real/harness.mjs`显式`reader-mode=disabled`且停止时删除其临时库；不能把该命令直接称为M00–M07完整启动器，也不能以停止后重开它代表数据恢复。

## 用户操作顺序（完整功能合并后执行）

1. 在已合并的本机main核对HEAD、clean状态和manifest；保留准确运行SHA。不要默认从尚未push的远端重新clone。
2. 安装锁定前端依赖，按最终入口需要打包backend（skip tests）并准备classpath。每一步成功才继续；构建成功不是业务通过。
3. 在普通干净终端手动启动专用临时环境；不携带SPRING_/JVM/Node配置覆盖或native数据库URL。启动器必须打印安全的owner/端口/模式，不能打印秘密。
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

## UNKNOWN与恢复原则

超时、网络异常、服务停止均可能发生在commit之前或之后。先保留页面内存中的原key/body/version/context，不自动重放写请求；Check current status只读，Retry original command保留原命令。后续4xx不能证明原命令未提交。更换身份/柜台不得执行旧作用域命令；整页刷新可能丢失内存句柄，应先核对reference、借用和审计事实，不能换新key“重做”。重新登录恢复当前权限也不是重新授予旧命令权限。

## 备份、还原与停止（恢复撤销修订待核对）

仅对本次独立demo库操作：记下源码HEAD、镜像、迁移版本、UTC备份点及业务记录/事件数量；停写；备份数据库到被忽略且受控的本地目录，同时受控保存QR/hash密钥及版本映射，不写入Git。数据库备份可能包含session、合成contact与内部token，按敏感资料处理，不能上传聊天。

还原到**另一全新临时库**并使用匹配源码/密钥/迁移；不要downgrade schema或修补旧native库。核对Flyway版本/失败项、登记审核、活动唯一性、LOST case、事件/审计和幂等结果，之后以新浏览器会话进入；备份中的旧QR、任务、会话不可被假定仍有效。过期/撤销应由服务器当前时间和权限判断。没有备份的可丢弃环境停止后即丢数据，应新建演示而不是称为恢复成功。

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

restore不连接旧native数据库，不复用原容器，不重新seed，不自动合并备份后发生的写入。它恢复匹配keys以读取原幂等结果；coordinator正补充启动前撤销旧会话/QR/未完成scan的固定处理，最终源码核对后才可声称该边界已实现。普通`start`产生全新空演示；它不是恢复命令。

需要重启并保留数据时使用backup→stop→start --restore；当前没有保留DB的restart-backend子命令。没有backup就stop会丢失数据。旧M04停机地址15415不适用于本启动器；不要直接用浏览器访问15418控制口，它只接受私有本地CLI凭据且拒绝浏览器Origin。当前所有执行状态NOT_RUN，RPO24h/RTO4h只是建议目标。

## FYP限制

这是当前本机synthetic演示交付；医院实际字段、隐私保留/冻结/删除政策、lost恢复制度、真实reader/profile、live MRN、HTTPS手机跨设备、生产会话/代理、WhatsApp、链/Sui证明、UAT/SUS、性能与实际恢复演练均未因此获得批准或PASS。M08–M11没有启动；不push、不部署。
