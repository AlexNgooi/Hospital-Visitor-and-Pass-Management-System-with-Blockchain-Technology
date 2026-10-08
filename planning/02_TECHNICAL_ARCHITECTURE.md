---
type: architecture
revision: v3
updated: 2026-10-08
status: proposed-implementation
---
# HSAAS 技术架构 v3

这是基于 proposal、实施指南、UI v4 与 2026-10-08 用户范围调整的目标架构。正式边界是 `Implementation/`，已有 frontend/backend 骨架和 infra/P0 证据，尚无业务验收。需求由 [03](03_REQUIREMENTS_AND_TEST_PLAN.md) 管理，数据/API 由 [04](04_DATA_MODEL_AND_API_PLAN.md) 管理，目录由 [09](09_FOLDER_STRUCTURE.md) 管理，变更依据见 [10](10_BASELINE_REVIEW.md)，模块/coordinator 见 [12](12_THREE_MONTH_CHAT_PLAN.md)。

## 当前启用边界（2026-10-08）

当前只启用 Web、backend/MySQL、本地审计、动态 QR、synthetic 卡扫描及 MRN mock/manual 模型。`READER_MODE=mock` 仅允许 synthetic demo/test 环境，production 设 disabled 且禁止模拟发卡；`MRN_MODE=mock/manual`；`NOTIFICATION_MODE=disabled`；`BLOCKCHAIN_MODE=disabled`。默认配置、服务启动和 API 均校验模式，不只是隐藏前端按钮。

保留 ReaderPort、HospitalVerificationPort、NotificationPort、AuditAnchorPort 的依赖方向与版本 DTO，未来 adapter 替换不改领域规则。当前不初始化/运行 reader-agent、sui-worker、Move 或 provider poller，不生成 notification_jobs/audit_outbox 积压。业务事务仍写本地 lifecycle/audit 和幂等结果。未来启用后才在同一业务事务加入合格 outbox/通知 job，不自动补发历史消息或上链 synthetic 数据。

界面用 NOT_ENABLED 表达链/消息未启用，LOCAL_ONLY 表达本地审计，SIMULATED 表达模拟扫描/交付。真实核验与 simulated/MRN mock 来源必须留在证据和数据，不能混同 PASS。以下 reader、Sui、WhatsApp 章节保留的是后续目标设计，启用条件见 [12](12_THREE_MONTH_CHAT_PLAN.md#后续独立模块与启动条件)。

## 1. 架构决策

保留 React + Spring Boot + MySQL + TypeScript Sui worker + Move 的技术路线。Spring Boot 使用按业务域划分的模块化单体，负责业务规则、访问控制、事务和读模型；不引入微服务、Redis、Kafka 或医院门禁控制。Windows Reader Agent 是设备边界，Sui Worker 是签名与链上重试边界。ICM 用于项目文档和开发上下文组织，不充当线上业务编排引擎。

| 组件 | 职责 | 部署目标 / 当前状态 |
|---|---|---|
| frontend | 访客 BM-first 四类表单；职员、管理员工作台；动态 QR 与错误反馈 | 已有骨架；业务待实施，Vercel 为后续部署目标 |
| backend | Spring Security、业务模块、MySQL 事务、动态 QR/模拟扫描、内部逾期告警 | 已有骨架；业务待实施，Railway 为后续部署目标 |
| MySQL | 当前业务记录、会话、扫描来源、本地审计；后续两个任务队列 | 本机连接有 P0 证据；业务 migration 尚未验收 |
| reader-agent | Java 21、PC/SC、厂商读取适配器；出站 HTTPS 领取扫描任务 | 柜台 Windows PC，硬件待验证 |
| sui-worker | TypeScript、官方 Sui SDK、服务钱包；锚定、重试、对账、证明核验 | Railway 私有进程，待实施 |
| move | AuditWriter 能力、eventId 去重、承诺查询与事件 | Sui Testnet，待发布 |
| MRN adapter | mock/manual 为可交付路径；有批准的 API 后接入 live 模式 | 外部依赖尚未确认 |
| WhatsApp adapter | 后续一次组合消息；当前默认 disabled | 不运行 poller/发送，不把 mock 标为已送达 |

Java 21 沿用指南。Spring Boot、React、SDK、MySQL 和 Node 的具体兼容版本在初始化时确认并锁定；不从旧教程复制依赖版本。当前官方 Sui 文档将 SuiGrpcClient 列为推荐默认客户端，采用 gRPC 接入，[官方 SDK 文档](https://sdk.mystenlabs.com/sui/clients/grpc)。

## 2. 浏览器、会话与访问边界

- 浏览器只请求 frontend 同源 `/api/**`，Vite 本地代理和 Vercel 生产转发再访问 backend。验收必须实际验证 POST、Set-Cookie、状态码、路径、CSRF 和 HTTPS 转发。
- 采用 Spring Security 服务端会话、HttpOnly/Secure/SameSite=Lax cookie 和 CSRF；用 Spring Session JDBC 持久化会话。删除旧计划中 JWT_SECRET/自制 refresh 流程的实施要求。
- 匿名访客通过同源 CSRF bootstrap 进行写请求，另设速率/长度/提交频率限制。随机 reference 不是读取个人资料的授权令牌。公开状态页默认不实现；若确需实现，使用另外的高熵、限时访问 token，响应仅含最小状态。
- COUNTER_STAFF 与 ADMIN 的 endpoint 和对象权限分别验证。管理员账号不自动获得发卡权限；医院若需要兼岗，应明确授权再扩展矩阵。设备凭据仅可调用 `/api/device/**`，不具有人类职员权限。
- 后端角色变更、停用账号须撤销旧会话；最后一个有效管理员不得停用/降级。配置和报表等敏感动作都写本地审计。
- 用户登录、CSRF、个人资料和扫描结果使用 `Cache-Control: no-store`；不向浏览器暴露钱包、数据库或 provider 密钥。

### 模块准备阶段的公共职责决定（2026-10-08）

保留实际 Java 包名 `eduupm.hsaas`，不重建或批量迁移包。M00 负责 backend/pom、auth/config/common、隔离 MySQL 测试、全局 migration 登记、最小 reference/counter 权限与本地 audit/idempotency 基础；M01 是 frontend 入口、全局 CSS、依赖/lockfile、router/client 和 Vite proxy 的唯一执行 owner，M00 提供 proxy 的安全/验收契约，其他模块不直接改这些共享文件。

M03 拥有 registration 根聚合/实体/持久化和字段 schema；M04 拥有 review 子域与审核命令，通过冻结的 registration 领域接口更新，不各自复制 registration 实体。verify 一次命令原子保存核实依据并批准，不添加审核草稿 endpoint；actor/time 从服务端取得。M02 提供参与现有事务的 grant 检查/消费 port，M03 提交外层事务，禁止提前独立提交 grant 消费。

HTTP 公共形状与权限决定见 04。用户已在 coordinator chat 确认 U01–U03：登录用用户名/职员账号（不强制邮箱）；同一匿名会话只保留一份有效登记表单，再扫不同入口先确认重新开始，确认后撤销旧 grant；synthetic Penjaga 仍需职员模拟人工核实，mock 结果本身不满足批准。技术选择已解决，但不等于模块开发许可。

M00 工程方案经 coordinator 评审采用：cookie 名 `HSAAS_SESSION`，HttpOnly/SameSite=Lax/Path=/、不设 Domain 或持久 Max-Age；生产 Secure=true，仅明确 localhost HTTP dev/test 可 false，不从不可信转发头降级。请求 idle timeout 初值 30 分钟，职员登录后绝对 8 小时，匿名 scope 创建后绝对 24 小时；重启/sessionId 轮换不得延长绝对期限。grant 仍绝对 20 分钟。轮询可能刷新请求 idle，不能宣传为“用户 30 分钟没操作就锁屏”。这些是可配置工程默认，医院 O07 仍未获批准，实际配置/API 与锁定依赖须测试。

首管理员采用 M00 的显式一次性本地 bootstrap 命令方案：不随 Web 启动、不提供 HTTP signup/bootstrap、不写默认密码到 migration/日志。用户交互输入 login 和不回显 password，无 console 时失败；事务锁定无秘密的 bootstrap_state 单行，users 空且尚未完成才允许创建一名 ADMIN/密码 hash/安全审计并置完成。重复或并发只能一份成功，已有用户则失败；测试账号仅测试 fixture，恢复另走受控 runbook。这里只批准方案属于 M00 范围，不授权模块开始实施或执行命令。

实现参考 [Spring Session JDBC](https://docs.spring.io/spring-session/reference/configuration/jdbc.html) 的数据库专用 schema 与 [Custom Cookie](https://docs.spring.io/spring-session/reference/guides/java-custom-cookie.html)，以及 [Spring Security CSRF](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html)。项目名称/TTL/bootstrap 是本项目设计，不是官方默认；正式 API兼容性仍按项目解析的依赖验证。

## 3. NFC 扫描采用云端任务

当前只在隔离的 synthetic demo/test 通过 MockReaderAdapter 走同一任务/消费规则，扫描记录保留 source=SIMULATED、test profile 与环境。禁止公开模拟设备 endpoint 或客户端自选 source，production 不接受模拟证据。下面的真机 PC/SC 路径 deferred 至 M08；动态 QR 不替代该证据。

Web -> Backend 创建 ENROLL / ISSUE / RETURN ScanJob -> Windows agent 出站领取 -> PC/SC 读卡 -> 上传结果 -> Web 轮询 -> Backend 在业务事务中消费证据。浏览器不访问 localhost，agent 不直接连接 MySQL，也不持有 Sui 私钥。

任务绑定 device、counter、actor、purpose、目标 registration/assignment、随机 nonce 和 expiry；每台设备最多一个活动任务。租约用 lease_token 做 fencing，过期/取消/错误设备的结果被拒绝。证据只能用于其绑定的业务操作且只能消费一次；取消任务不得被晚到结果完成。

`java.smartcardio` 提供 PC/SC 通信，不保证任何 NFC 卡都有可读的类别字段，[Java 21 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.smartcardio/javax/smartcardio/package-summary.html)。实施必须用实际卡和型号验证 UID/APDU/profile；普通 UID 不编码访客类别。类别来自经过批准的卡 profile 映射；若类别不可读取，需要医院选择预登记映射或管理员分类策略后更新需求，不能静默手填或根据 UID 猜测。UID 是库存标识，不构成防克隆凭证，也不负责开启医院门禁。

## 4. 发卡、归还与异步边界

Backend 先完成服务端校验，一笔 MySQL 事务同时更新 inventory/assignment、消费扫描证据、写 lifecycle_event、audit_event 和幂等结果；当前 disabled 不写外部任务，将来分别启用后再同事务写合格 audit_outbox/notification_job；commit 后响应。任何外部网络调用都不放进这笔事务。

消息轮询器作为 backend 内的独立任务模块运行，使用自己的线程池、claim lease、超时和错误状态；无需为 FYP 增加第四个云端服务。它与逾期 scheduler/Sui Worker 互不等待。Sui Worker 仅具有读取承诺、更新 proof 状态的数据库权限；不读取姓名、IC、电话、MRN 或消息正文。

逾期依据 `now >= due_at`，UTC 存储，Asia/Kuala_Lumpur 展示。发卡时保存 due_at 和规则版本，后续配置变化不追溯修改现有借用。逾期、归还、遗失使用一致锁顺序和状态条件，避免归还后再次创建逾期告警。

## 5. 两种异步恢复不能混用

**审计锚定**：audit_outbox 中租约过期可恢复领取；同一 eventId 的链上写入必须受 Move 原子去重约束。提交前保存签名交易的 digest/必要恢复数据。执行失败、RPC 超时、低 gas 和已成功但本地尚未写回分开处理。未知提交先按 digest / registry 对账；若已有相同承诺写 CONFIRMED，不一致报安全错误，未知且无法证明不存在时保持待对账。有限次退避后 FAILED，管理员 retry 不生成新 eventId。

**一次消息**：唯一 `(assignment_id, COMBINED_PASS_DETAILS)` 只保证本地创建一次任务。消息提交前保存提交 attempt；超时或进程在提交窗口崩溃视为 UNKNOWN。仅在 provider 支持幂等或能证明未受理时才允许重新提交同一任务。UNKNOWN、SENT、DELIVERED 禁止盲目/人工重发。外部 provider 若无幂等能力，不能承诺严格 exactly-once delivery；保守停止重发以符合一条消息政策。

回调须验证 provider 签名、去重、绑定 provider_message_id，阻止乱序回调让 DELIVERED 回退。ACCEPTED 是 provider 已受理，SENT 是 provider 报告已发送，DELIVERED 才是报告已送达；mock 单独标为 MOCK_RECORDED。消息策略的业务内容由 [需求 N01](03_REQUIREMENTS_AND_TEST_PLAN.md#功能需求与验收矩阵) 管理；实际通道遵循批准的 opt-in/template 配置，[WhatsApp 官方政策](https://whatsappbusiness.com/policy/)。

## 6. 审计承诺与证明核验

生成随机 eventId 与至少 256-bit 随机 nonce；明确版本化的字段顺序、UTF-8 编码、UTC 时间精度和 null 表达。将事件不可变快照的 canonical bytes 和 nonce 存于受控本地存储，计算 `SHA-256(domain || version || nonce || canonical_bytes)`。Sui 只写 eventId、版本、hash、事件类型/时间等最少元数据；不写 cardUID、人员映射、Pass ID、nonce、姓名、IC、电话或 MRN。

Move registry 必须持久化 eventId -> commitment，而不是只 emit 事件后无法高效核验/去重。capability 授权专用钱包；同 eventId 同承诺返回既有结果，不同承诺拒绝。FYP 可用一个 shared registry，需测试写竞争和 Testnet reset；复杂并发分片不作为初始需求。

核验由 Backend 创建 verification_job，Sui Worker 只读取链上 proof并写回 observed hash/network/package/registry/digest；Backend 重算本地快照、核对绑定再显示结果。不能仅比较两个缓存哈希。事件发生后的正常归还不应修改旧 ISSUED 快照。改动证明所承诺的快照会产生 MISMATCH；全部历史数据都免篡改不是这一设计能保证的结论。快照按保留规则清除后显示 LOCAL_EVIDENCE_UNAVAILABLE，不再声称可重算证明。

## 7. 部署与配置契约

| 边界 | 配置示例（名称，不含密钥值） |
|---|---|
| frontend | VITE_API_BASE_URL=/api，public network/explorer 标识 |
| backend | DB_URL、DB_USER、DB_PASSWORD、SESSION_*、APP_TIMEZONE、READER_*、MRN_MODE、NOTIFICATION_MODE、provider secrets |
| reader-agent | API_BASE_URL、DEVICE_ID、DEVICE_TOKEN、READER_PROFILE；仅设备权限 |
| sui-worker | DB_* 专用账户、SUI_GRPC_URL、SUI_SERVICE_PRIVATE_KEY、SUI_SERVICE_ADDRESS、SUI_PACKAGE_ID、SUI_REGISTRY_ID、POLL_INTERVAL_MS、MAX_ATTEMPTS |
| local infra | 本地 MySQL、mock provider、synthetic seeds；秘密放未跟踪 .env |

云端服务只公开所需 API；数据库和 worker 私有，读卡代理留在 Windows。公开 Sui Testnet endpoint 配置可替换；QuickNode 是可选 RPC provider，不是另一个链网络。先验证兼容性再选择，不作永久免费或运行预算保证。

部署证据需包括 proxy/session/CSRF smoke、Flyway clean + upgrade、数据库恢复、worker 重启、reader 离线恢复和 release manifest。Testnet package/registry/wallet 映射必须写进环境 manifest；网络重置后保存旧 epoch 证明状态，不把旧 proof 指向新 registry。

## 8. 图与实施顺序

[系统架构](diagrams/v3/01-architecture.html) · [扫描发卡时序](diagrams/v3/05-scan-issue-sequence.html) · [异步处理时序](diagrams/v3/06-async-delivery-sequence.html)。

当前顺序是基础安全/API 契约 → 前端框架 → 动态 QR → 四类登记 → 审核 → synthetic 生命周期 → 管理/报表 → 当前版验收。硬件/profile、live MRN、消息与链按 M08–M11 条件独立启动；旧图体现后续完整设计，尚未包含新 QR 与模块协作。图的哈希/视觉通过不表示新范围语义已同步。

## 9. 动态 QR 登记入口

当前将“实时更新 QR”落实为柜台屏幕定时轮换的短期登记挑战。服务端每 30 秒产生新 challenge，45 秒过期（15 秒扫描交界重叠）；display session 绑定授权职员、counter、可选 category 与 active/revoked 状态。多个显示页可以独立 display session，不互相意外撤销；每显示会话/轮换时间槽只有一个当前 challenge，读取不能任意延长 expiry。

rotation_slot 从服务器 UTC 与会话固定 epoch 计算；issued_at/rotate_at/expires_at 按 slot 起点定义（分别为起点、+30s、+45s），不是首次 GET 时间 + TTL，以免迟到请求延长旧轮次。轮换按服务器当前 slot 懒创建即可，活跃显示页按 poll/轮换点获取；无显示页面时不需要持续产生无人使用的 token。

使用服务端签名的 entry token（固定算法/版本、随机 nonce ≥128 bit，建议 256 bit），加 challenge 存储实现提前撤销；token 只含随机 challenge 标识、nonce、有效期和最小非敏感 scope。签名钥只在 backend。校验签名、服务端记录和时间，不信任 caller 自填 counter/category/expiry。算法/library 与 key version 在 M00/M02 契约冻结；不使用可预测时间戳作为唯一 token。

M02 的最小方向采用 Nimbus JOSE JWS compact + 固定 HS256，仅用于 entry 挑战；人类登录继续 Spring Session。header 白名单 alg/typ/kid，payload v/cid/n/expiresAt，scope/environment 从服务端 challenge→display 取，nonce 32 字节随机，输入 token 工程上限 2048 chars，未知/重复字段或额外 header 拒绝。密钥至少 256-bit、受限本机 key ring、缺失/非法/不足位数 fail closed、不临时生成 fallback、不远程取钥；created challenge 保留原 kid/slot expiry，同轮 GET 不换 key 或续期。旧 key 留到该 kid 最后 challenge 到期后移除，已 exchange grant 不因自然 key 退休失效；泄露需显式撤销受影响能力。具体 Nimbus 版本由 M00 按解析依赖锁定并验证。依据：[Nimbus HMAC JWS 示例](https://connect2id.com/products/nimbus-jose-jwt/examples/jws-with-hmac)、[RFC 7518 §3.2](https://www.rfc-editor.org/rfc/rfc7518.html#section-3.2)，这些来源证明技术接口/密钥要求，不证明本项目兼容测试通过。

已核对 [Spring Session JDBC Javadoc](https://docs.spring.io/spring-session/reference/api/java/org/springframework/session/jdbc/JdbcIndexedSessionRepository.html)：该实现不发布 session events；其 [事务说明](https://docs.spring.io/spring-session/reference/configuration/jdbc.html#customizing-how-spring-session-jdbc-uses-transactions) 默认 REQUIRES_NEW。因此不能仅靠 SessionDestroyedEvent、unload 或清理作业保证 QR owner 到期立即失效，也不能把 HttpSession 属性保存当作 grant 外层事务原子性。

owner guard 优先准备 M00 的 stable auth-session context/capability port 方向，由 M00 管 schema/期限/撤销，M02 引用安全 owner context ID，不直接访问或锁框架 session 表。领域 guard 必须参与业务校验并证明与实际 session/账号/counter 失效一致，匿名 exchange 不能延长职员期限；超过期限即拒绝，reaper 只清理不决定有效性。具体持久化/Session同步/完整锁图仍须 M00/M02 联合提交与验证，禁止先把复制的 expiry 或 REQUIRES_NEW guard 当作已证明安全。单会话 logout/expiry 撤销该 owner context 的 display/未提交 grant；账号停用/降级/柜台权限移除撤销相关全部 owner contexts。此为最小隔离范围，不波及无关职员会话。

显示页从 authenticated no-store API 获取 current QR、serverNow、rotateAt、expiresAt，5 秒 poll 为初值；按 serverNow 对齐倒计时，到轮换点取新码，断网/旧码到期必须隐藏可扫描区域。sleep/tab 恢复先重取；不靠浏览器本地 timer 或随机图片来伪造服务端有效性。静态打印码不作为登记入口，UI v4 的 print/copy-static-URL 行为由本要求覆盖。

QR 链接为受控 HTTPS `/register#entry=<token>`，使用 fragment 降低 access log 泄漏；进入页面先暂存 token 于内存并清除地址栏 fragment，再 bootstrap CSRF，POST exchange。不得加载 token analytics/第三方脚本；设置 Referrer-Policy: no-referrer、Cache-Control: no-store，错误/evidence 不暴露 token。

exchange 校验有效 challenge 后，在匿名 HttpOnly/Secure/SameSite 会话里绑定 registration grant（20 分钟绝对有效期，单次成功提交），返回最小 counter/category/form schema。QR 是多人共享入口，不做一次扫码即耗尽；每个访客得到独立 grant。grant 不是职员授权，也不授予 PII 查询或发卡权限。成功 exchange 后 QR 自然换码/过期不影响该 grant；display session 显式撤销或 counter 停用则撤销其未提交 grant。提交时以 DB 状态原子检查/消费 grant 与创建登记，重试走幂等；无 grant 直接访问或直接 POST 被拒绝。

U02 已获用户确认：同一匿名浏览器会话只有一份有效未提交表单。已有 grant 时再扫别柜台/类别不后台替换，先告知重新开始会放弃原表单；取消保留原 grant/内容，明确确认且新 entry 仍有效后，原子撤销旧 grant 并创建新的限时 grant。旧标签页不能自动采用新 grant 继续提交，其表单上下文必须绑定原 grant 的非敏感 reference/version，替换后提交拒绝。替换失败/新码已过期不得先丢掉原 grant；M02/M03 在 exchange 与 submit 共同验证此规则。

上述匿名会话、随机 token、no-store 和 cookie 边界参考 [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)。受限 token exchange 与 referrer/限流原则参考 [OWASP URL token guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html#url-tokens)；这里是本项目设计推导，不是把多人 QR 当作单人密码重置 token。30/45 秒与 20 分钟是工程默认值，非标准规定。

轮换只缩短旧链接复用窗口，不证明物理在场，也不能阻止有效期内转发；职员核实与未来真实 NFC 边界仍独立。扫码使用手机系统相机即可，visitor Web 不强制申请相机权限。
