# M00–M07：本机演示启动、停止与恢复

2026-10-18，DRAFT_WAITING_M05_M06_MERGE。文档准备基线 `d103b888527c4ba8e90f37d93059daf2d78ed02f`，尚未收到 M05/M06 合并通知。**当前不提供未经源码核对的完整生命周期启动命令，不表示M05/M06已交付。** 最终版本必须补齐下面待定输入，再作为用户执行指南。

业务验收见 [逐项清单](MANUAL_ACCEPTANCE_M00_M07.md)，版本与历史证据见 [release manifest](RELEASE_MANIFEST_M00_M07.md)。新启动、业务、备份/恢复均 NOT_RUN；助手没有启动服务、浏览器或数据库。

## 环境与边界

使用Java21、项目锁定的Node/pnpm依赖、Docker Engine、一个全新独立MySQL8.0.45演示容器。只用TEST_ID/DEMO-与DEMO-MRN-合成资料，SIMULATED reader/交付，MRN mock/manual，本地审计。WhatsApp/blockchain disabled，没有外部调用/任务/历史补发。不修改旧native3306库，不读取或复制`.env`，不运行Flyway repair/baseline/clean。

正常应用从`/login`进入，不能以模块harness页代替已接线功能。loopback URL只适合同电脑浏览器；手机扫码后的127.0.0.1会指向手机，跨设备HTTPS/真机相机验收保持NOT_RUN。QR/grant是能力，不能把完整entry URL、cookie、CSRF或QR像素存到证据。不同职员/访客使用隔离浏览器cookie。

## 最终启动器必须核对的输入

| 输入 | 当前事实 / 所需确认 |
|---|---|
| M05/M06源码与合并SHA | 等coordinator提供并在本worktree核对 |
| startup入口、端口、控制口、容器owner/name与存储生命周期 | 待合并源码；启动前应拒绝占用，不停止已有服务 |
| V6/V7实际文件与开启开关 | 待最终核对；V1–V5不可修改 |
| DEMO用户/柜台/profile/device/card seed | M05/M06待确认；需至少两名同柜台职员、跨柜台角色、ADMIN以执行权限场景 |
| 完整功能路由/FeatureSlots | coordinator接线后核对，ADMIN不能自动发卡 |
| 最短可演示dueAt与scheduler周期 | M05待确认；不通过改系统时钟或历史SQL制造逾期 |
| lost/restore演示证据与政策 | M05待确认；需清楚标医院未批准 |
| backup/restart/restore入口 | 需明确先停写、保留DB、独立恢复目标、密钥与会话处理；旧M04 stop删除DB不能作保留数据重启 |

旧[M00–M04手动指南](MANUAL_M00_M04.md)只覆盖到审核。其`tests/counter-review-real/harness.mjs`显式`reader-mode=disabled`且停止时删除其临时库；不能把该命令直接称为M00–M07完整启动器，也不能以停止后重开它代表数据恢复。

## 用户操作顺序（命令待最终源码确认）

1. 在已合并的本机main核对HEAD、clean状态和manifest；保留准确运行SHA。不要默认从尚未push的远端重新clone。
2. 安装锁定前端依赖，按最终入口需要打包backend（skip tests）并准备classpath。每一步成功才继续；构建成功不是业务通过。
3. 在普通干净终端手动启动专用临时环境；不携带SPRING_/JVM/Node配置覆盖或native数据库URL。启动器必须打印安全的owner/端口/模式，不能打印秘密。
4. 等真实backend和Vite就绪才打开正常`/login`；从navigation进入QR、review、lifecycle、ADMIN库存/账号/设置/报表。无槽位或能力disabled先记录缺项，不将空页当功能成功。
5. 按清单依次执行四类登记、人工审核、SIMULATED扫描/交付/借用/归还，另建记录做逾期、lost/restore和并发负面检查。
6. 需要留数据时先完成备份流程，再使用本次环境的stop入口。只停止本次拥有的进程/容器，不批量kill java/node/docker，不清理其他模块worktree。

## UNKNOWN与恢复原则

超时、网络异常、服务停止均可能发生在commit之前或之后。先保留页面内存中的原key/body/version/context，不自动重放写请求；Check current status只读，Retry original command保留原命令。后续4xx不能证明原命令未提交。更换身份/柜台不得执行旧作用域命令；整页刷新可能丢失内存句柄，应先核对reference、借用和审计事实，不能换新key“重做”。重新登录恢复当前权限也不是重新授予旧命令权限。

## 备份、还原与停止的待核对流程

仅对本次独立demo库操作：记下源码HEAD、镜像、迁移版本、UTC备份点及业务记录/事件数量；停写；备份数据库到被忽略且受控的本地目录，同时受控保存QR/hash密钥及版本映射，不写入Git。数据库备份可能包含session、合成contact与内部token，按敏感资料处理，不能上传聊天。

还原到**另一全新临时库**并使用匹配源码/密钥/迁移；不要downgrade schema或修补旧native库。核对Flyway版本/失败项、登记审核、活动唯一性、LOST case、事件/审计和幂等结果，之后以新浏览器会话进入；备份中的旧QR、任务、会话不可被假定仍有效。过期/撤销应由服务器当前时间和权限判断。没有备份的可丢弃环境停止后即丢数据，应新建演示而不是称为恢复成功。

具体备份/restore命令须与最终启动器的容器owner、凭据存储、DB名及保留/删除行为一起补齐。当前执行状态NOT_RUN，RPO24h/RTO4h只是规划建议，不是已测承诺。

## FYP限制

这是当前本机synthetic演示交付；医院实际字段、隐私保留/冻结/删除政策、lost恢复制度、真实reader/profile、live MRN、HTTPS手机跨设备、生产会话/代理、WhatsApp、链/Sui证明、UAT/SUS、性能与实际恢复演练均未因此获得批准或PASS。M08–M11没有启动；不push、不部署。
