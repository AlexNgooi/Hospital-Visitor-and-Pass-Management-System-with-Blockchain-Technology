---
type: architecture
revision: v3
updated: 2026-09-30
status: proposed-implementation
---
# HSAAS 技术架构 v3

这是基于现有 proposal、实施指南和 UI v4 的目标架构。正式代码边界是 `Implementation/`，模块结构由开发者手动初始化；当前未发现已初始化项目文件或已部署业务系统，因此本文不宣称功能已经实现。需求由 [03](03_REQUIREMENTS_AND_TEST_PLAN.md) 管理，数据/API 由 [04](04_DATA_MODEL_AND_API_PLAN.md) 管理，目录由 [09](09_FOLDER_STRUCTURE.md) 管理，变更依据见 [10](10_BASELINE_REVIEW.md)。

## 1. 架构决策

保留 React + Spring Boot + MySQL + TypeScript Sui worker + Move 的技术路线。Spring Boot 使用按业务域划分的模块化单体，负责业务规则、访问控制、事务和读模型；不引入微服务、Redis、Kafka 或医院门禁控制。Windows Reader Agent 是设备边界，Sui Worker 是签名与链上重试边界。ICM 用于项目文档和开发上下文组织，不充当线上业务编排引擎。

| 组件 | 职责 | 部署目标 / 当前状态 |
|---|---|---|
| frontend | 访客 BM-first 四类表单；职员、管理员英文工作台；状态和错误反馈 | Vercel，待创建正式应用 |
| backend | Spring Security、业务模块、MySQL 事务、扫描任务、内部逾期告警、消息轮询器 | Railway 单实例起步，待实施 |
| MySQL | 业务记录、会话、扫描证据、审计快照、两个独立任务队列 | 私有数据库，待实施 |
| reader-agent | Java 21、PC/SC、厂商读取适配器；出站 HTTPS 领取扫描任务 | 柜台 Windows PC，硬件待验证 |
| sui-worker | TypeScript、官方 Sui SDK、服务钱包；锚定、重试、对账、证明核验 | Railway 私有进程，待实施 |
| move | AuditWriter 能力、eventId 去重、承诺查询与事件 | Sui Testnet，待发布 |
| MRN adapter | mock/manual 为可交付路径；有批准的 API 后接入 live 模式 | 外部依赖尚未确认 |
| WhatsApp adapter | 一次组合消息；默认 mock；实际通道需医院和 provider 条件满足 | 不把 mock 标为已送达 |

Java 21 沿用指南。Spring Boot、React、SDK、MySQL 和 Node 的具体兼容版本在初始化时确认并锁定；不从旧教程复制依赖版本。当前官方 Sui 文档将 SuiGrpcClient 列为推荐默认客户端，采用 gRPC 接入，[官方 SDK 文档](https://sdk.mystenlabs.com/sui/clients/grpc)。

## 2. 浏览器、会话与访问边界

- 浏览器只请求 frontend 同源 `/api/**`，Vite 本地代理和 Vercel 生产转发再访问 backend。验收必须实际验证 POST、Set-Cookie、状态码、路径、CSRF 和 HTTPS 转发。
- 采用 Spring Security 服务端会话、HttpOnly/Secure/SameSite=Lax cookie 和 CSRF；用 Spring Session JDBC 持久化会话。删除旧计划中 JWT_SECRET/自制 refresh 流程的实施要求。
- 匿名访客通过同源 CSRF bootstrap 进行写请求，另设速率/长度/提交频率限制。随机 reference 不是读取个人资料的授权令牌。公开状态页默认不实现；若确需实现，使用另外的高熵、限时访问 token，响应仅含最小状态。
- COUNTER_STAFF 与 ADMIN 的 endpoint 和对象权限分别验证。管理员账号不自动获得发卡权限；医院若需要兼岗，应明确授权再扩展矩阵。设备凭据仅可调用 `/api/device/**`，不具有人类职员权限。
- 后端角色变更、停用账号须撤销旧会话；最后一个有效管理员不得停用/降级。配置和报表等敏感动作都写本地审计。
- 用户登录、CSRF、个人资料和扫描结果使用 `Cache-Control: no-store`；不向浏览器暴露钱包、数据库或 provider 密钥。

## 3. NFC 扫描采用云端任务

Web -> Backend 创建 ENROLL / ISSUE / RETURN ScanJob -> Windows agent 出站领取 -> PC/SC 读卡 -> 上传结果 -> Web 轮询 -> Backend 在业务事务中消费证据。浏览器不访问 localhost，agent 不直接连接 MySQL，也不持有 Sui 私钥。

任务绑定 device、counter、actor、purpose、目标 registration/assignment、随机 nonce 和 expiry；每台设备最多一个活动任务。租约用 lease_token 做 fencing，过期/取消/错误设备的结果被拒绝。证据只能用于其绑定的业务操作且只能消费一次；取消任务不得被晚到结果完成。

`java.smartcardio` 提供 PC/SC 通信，不保证任何 NFC 卡都有可读的类别字段，[Java 21 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.smartcardio/javax/smartcardio/package-summary.html)。实施必须用实际卡和型号验证 UID/APDU/profile；普通 UID 不编码访客类别。类别来自经过批准的卡 profile 映射；若类别不可读取，需要医院选择预登记映射或管理员分类策略后更新需求，不能静默手填或根据 UID 猜测。UID 是库存标识，不构成防克隆凭证，也不负责开启医院门禁。

## 4. 发卡、归还与异步边界

Backend 先完成服务端校验，一笔 MySQL 事务同时更新 inventory/assignment、消费扫描证据、写 lifecycle_event、audit_event、audit_outbox，以及符合条件时的 notification_job 和幂等结果；commit 后响应。任何外部网络调用都不放进这笔事务。

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

先做硬件/profile 和同源会话部署 spike，再做四类表单与审核、库存与原子发卡/归还、逾期、一次消息 mock、Sui 锚定与核验、报表与 UAT。按已验收的端到端增量推进；旧路线图日期是计划，不是已完成证据。
