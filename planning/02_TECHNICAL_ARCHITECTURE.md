# 当前技术架构

更新：2026-11-10。当前部署形态为本机进程；具体数据/锁序/错误协议见 [04](04_DATA_MODEL_AND_API_PLAN.md)，业务与验收见 [03](03_REQUIREMENTS_AND_TEST_PLAN.md)。

| 组件 | 当前职责与边界 |
|---|---|
| frontend | React/TypeScript/Vite；同源 `/api` 代理、角色工作台、四类表单、QR/Copy link；按需导航和多标签入口 |
| backend | Java 21/Spring Boot，服务端会话/CSRF、权限、登记/审核、手动发还、管理与本地审计 |
| MySQL | 本机专用演示库保存业务、会话、grant、幂等/审计；Flyway V1–V9，Hibernate validate |
| MRN adapter | 服务端 MOCK/SYNTHETIC，患者最少字段、proof/context/expiry绑定；live 待获批 |
| 通知 adapter | disabled，不创建发送任务，不把未启用显示为已发送 |
| sui-worker / Move | 后续本机 Node/官方 SDK 与 CLI，对接远程 Testnet；当前未实施/发布，见 [计划](SUI_TESTNET.md) |
| reader-agent | 已退出当前手动办理路径；不为新 manual 命令制造扫描证据 |

## 安全与会话

浏览器只调用同源 API；Spring Session JDBC、HttpOnly/SameSite=Lax cookie，生产 Secure，明确本机 HTTP 才可关闭 Secure。所有写入校验 CSRF。角色与对象/counter 权限都由当前服务器状态计算，ADMIN 不自动具有柜台办理权。账号停用/降级/权限变化撤销旧能力，最后一个 active ADMIN 受保护。

工程初值：请求 idle 30分钟、职员绝对8小时、匿名绝对24小时、pending activation 1分钟；轮询可能刷新 idle，绝对期限不续期。会话 ID 轮换不能延长绝对期限。普通 staff 新标签复用 cookie，不要求重新登录；访客或其他角色测试使用独立 profile。退出影响同 profile 的其他标签，后台显示恢复先验证。

## 动态登记入口

QR/Copy link 共用服务端签名的 `/register#entry=<token>`，token 不含 PII。entry fragment 先捕获到内存并从地址栏清除，再进行 CSRF/exchange。30秒轮换、45秒 challenge、20分钟单次提交 grant；成功 exchange 后自然换码不撤销有效表单，显式 revoke/counter 停用会撤销未提交 grant。

display 绑定 staff owner/counter；多个 display session 可独立存在。服务端 slot 决定 expiry，GET不续期；离线、到期、隐藏/恢复须隐藏旧码或重取验证。签名采用严格 HS256/key version、32-byte nonce、白名单字段和输入上限；旧 key 保留至对应 challenge 全部到期，不产生临时 fallback key。二维码不证明人在柜台，人工核实仍必要。

同一匿名 session 只保留一个未提交 grant；再打开其他入口必须明确确认重新开始，新入口有效才原子替换。旧页不能静默采用新 grant。登录、PII、QR 和令牌响应 no-store/no-referrer；不记录 token、表单正文、cookie 或钱包秘密。

## 事务与手动 pass

JpaTransactionManager 与 JdbcTemplate 共享同一 DataSource/READ_COMMITTED；业务、本地审计、幂等和 grant 消费同一外层事务。按完整 authority/counter、reference/root、sorted card、assignment 顺序锁定和重读，具体图见04。不能在持锁时调用外部 provider、保存 framework session 或用 savepoint 冒充完整领域回滚。

审核与发放分开。手动 issue 的多选批次原子提交，每张库存卡最多一条活动借用；Executive/Penjaga 同登记活动单卡，Vendor/Contractor 可多卡/多地点。实际归还逐张关闭，不影响其他卡。due_at 可为 null；无期限仍需归还，不产生逾期；LOST关闭不能伪造 returned_at。UNKNOWN 保留原 body/key/version/context，先核对事实，再显式重试原命令。

## 本机运行、隔离与后续集成

Node/Vite、Java 后端、MySQL 均使用本机进程。启动/备份/停止见 [本机指南](../Implementation/docs/runbooks/MANUAL_NATIVE.md)。应用不创建/删除数据库或控制 MySQL 服务；初始化仅用户显式指定的空专用库。密钥独立且持久保存，丢失时拒绝用新值替代历史密钥。

SQL 测试以受限 test runner 创建随机测试库；故障场景仅断开测试 fixture 自己的 loopback 代理连接，不暂停 MySQL 或影响其他库。应用不读测试凭据，测试不读应用 .env。

通知/上链将来启用时采用同事务 durable outbox；worker 领取短 lease 后释放数据库锁再调用外部接口。未知链提交先对账，eventId 去重；历史本地事件不自动补发。证明重算 canonical snapshot/nonce并核对实际链绑定；本地缺证据、RPC故障与 mismatch 分开。PII 不上链，Sui Testnet 不作为永久保存业务记录的数据库。
