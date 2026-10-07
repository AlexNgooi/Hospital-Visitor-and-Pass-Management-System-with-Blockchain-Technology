---
type: data-api-contract
revision: v3
updated: 2026-09-30
status: proposed-implementation
---
# HSAAS 数据模型与 API 契约 v3

状态和业务验收以 [03](03_REQUIREMENTS_AND_TEST_PLAN.md) 为准，执行边界以 [02](02_TECHNICAL_ARCHITECTURE.md) 为准。本文件是目标模型，尚未创建正式 Flyway migrations。旧 `passes/pass_assignments/pass_events` 命名统一到 `cards/card_assignments/lifecycle_events`；UI 的 Pass ID 是一次 Assignment 的 `pass_reference`，不是 NFC UID。

## 1. 聚合与实体

| 表 / 模型 | 主要字段与约束 |
|---|---|
| users | id、login UNIQUE、password_hash、role、active、version、timestamps；最后管理员保护用事务锁 |
| visitor_categories / destinations / counters | code UNIQUE、名称、active、字段规则或位置配置版本；历史引用不能级联删除 |
| visitor_registrations | id、public_reference UNIQUE、category/destination、status、field_schema_version、按批准字段白名单保存的 form_data、MRN status/mode、reviewer/review time/reason、version |
| registration_consents | registration_id、purpose、granted、policy_version、captured_at、revoked_at；隐私 acknowledgement 和 WhatsApp opt-in 分开 |
| cards | id、normalized_uid UNIQUE、card_code UNIQUE、category_id、approved profile mapping、status、version、enrolled_by/time；掩码呈现 UID |
| card_assignments | id、pass_reference UNIQUE、card_id、registration_id、issued_by/at、due_at、return_rule_version、handover_confirmed_at、returned_by/at、closed_at、closure_reason、return_counter_id |
| lifecycle_events | id、assignment/card/registration FK、event_type、actor 或 SYSTEM、occurred_at、safe reason、commitment_event_id；业务历史不可变 |
| audit_events | eventId UUID UNIQUE、target、action、actor、snapshot_version、canonical_bytes、private nonce、payload_hash、occurred_at；敏感快照受访问和 retention 控制 |
| audit_outbox | audit_event_id UNIQUE、event_type/version/hash/time、status、attempts、next_attempt_at、lease_token/owner/expiry、submitted_digest、confirmed_digest、network/package/registry、checkpoint、safe error；不复制 PII |
| reader_devices | id、counter_id、allowed profile、token_verifier、active、last_seen；设备 token 可轮换、不可当 user session |
| scan_jobs / scan_results | device/actor/counter、purpose、target_id、nonce、expires_at、lease_token/expiry、status；UID/profile/result/error、consumed_at；每 job 至多一个 accepted result |
| idempotency_records | actor_scope + operation + key UNIQUE、request_hash、status、entity/result reference、created/expiry；必要响应受控存储 |
| notification_jobs | assignment_id + kind UNIQUE、consent_id、template_version、payload受控快照、status、lease_token/expiry、attempt phase、provider_message_id UNIQUE nullable、safe error、timestamps |
| notification_receipts | provider callback event ID UNIQUE、job FK、verified status、occurred_at；不存完整 raw callback/PII |
| overdue_alerts / staff_followups | assignment_id + alert kind UNIQUE、opened/closed time；actor、disposition、safe note；closing LOST 结束普通 overdue alert，遗失 case 独立保留 |
| lost_cases | assignment/card、opened_by/time、resolution、resolved_by/time/reason；找到卡前不 Restore |
| proof_verification_jobs | audit_event_id、requester、status、lease、observed hash/event/version/network/package/registry/digest、checked_at、safe error；worker 不读取 PII snapshot |
| system_settings / setting_history | key、typed value、version、actor、timestamp、safe old/new；配置修改不回写旧 due_at |
| Spring Session JDBC tables | 使用所选 Spring Session 官方兼容 schema，由 Flyway 管理，含 expiration cleanup |

访客信息按一次登记存储，起步不做以姓名/IC/手机号跨登记自动合并的“人员主档”。完整 IC 是否必要、加密字段和搜索 token 设计在医院批准后确定；浏览器和报表 DTO 默认掩码。保存临床数据不在允许字段中。

## 2. MySQL 一致性约束

1. `normalized_uid`、`card_code`、public reference、pass reference、eventId 唯一。
2. `card_assignments` 对 `closed_at IS NULL` 生成 `active_card_id` 与 `active_registration_id`，各建 UNIQUE。其他历史行生成 NULL。MySQL 的 unique index 允许多个 NULL，可支持这种策略；实施在实际 MySQL 上验证，[MySQL 官方索引说明](https://dev.mysql.com/doc/refman/8.4/en/create-index.html)。
3. 活动扫描以 `reader_devices.active_scan_job_id` 在锁住 device 的事务中分配/清除，并辅以 job 状态约束；租约到期和上传均校验 fencing token。
4. 每个 assignment 的 OVERDUE 事件唯一；每个事件 outbox 唯一；每个 assignment 仅一个 COMBINED_PASS_DETAILS notification_job。
5. 发卡统一锁顺序：registration -> card -> assignment -> scan result -> idempotency record，返回/逾期/遗失先发现 IDs，再按同一相对顺序锁并重读。幂等预登记/唯一插入竞争有显式协议，不能在两个路径中倒置锁顺序。
6. 业务状态限制不能只靠前端下拉框；所有更新带旧 state/version 条件并检查 affected rows。FK、NOT NULL、枚举/检查约束和索引由 migration 管理。
7. 事务内写所有业务变更、审计、outbox、条件消息任务和幂等最终结果；提交失败一起回滚。扫描证据不能提前消耗导致用户无法重试。

主要索引：registration(status, registered_at)、card(status, category_id)、assignment(closed_at, due_at)、event(assignment_id, occurred_at)、outbox(status, next_attempt_at)、job(device_id, status, expiry)、notification(status, next_attempt_at)、report(category/destination/time)。

## 3. 状态与恢复

| 对象 | 状态 |
|---|---|
| Registration | SUBMITTED、VERIFIED、REJECTED、CANCELLED |
| Card | AVAILABLE、ISSUED、OVERDUE、LOST、DISABLED |
| Assignment | 用 closed_at + closure_reason 派生 OPEN / CLOSED_RETURNED / CLOSED_LOST；不和 Card status 混用 |
| ScanJob | CREATED -> CLAIMED -> SUCCEEDED / FAILED；任一未完成可 CANCELLED / EXPIRED；accepted result 后才可 CONSUMED |
| Audit outbox | PENDING -> PROCESSING -> CONFIRMED；可恢复失败回 PENDING；未知提交 RECONCILING；达到限额 FAILED |
| Notification | QUEUED -> SUBMITTING -> ACCEPTED -> SENT -> DELIVERED；明确失败 FAILED；提交可能成功但未知 UNKNOWN；mock 为 MOCK_RECORDED；撤销且尚未提交 CANCELLED |
| Proof verification | REQUESTED -> PROCESSING -> MATCH / MISMATCH / PENDING / FAILED / RPC_UNAVAILABLE / LOCAL_EVIDENCE_UNAVAILABLE |

Outbox worker claim 用短事务和 lease fencing，不持有 DB lock 等待 provider。审计 PROCESSING lease 过期可重新对账；消息 SUBMITTING lease 过期转 UNKNOWN，不能简单回 QUEUED。撤回消息同意：发送前重查当前 consent，未提交任务 CANCELLED；已被 provider 受理则不能声称能撤回发送。

## 4. API 清单与权限

以下路径是拟定契约，OpenAPI 在正式项目初始化后固化。浏览器写请求带 CSRF；重要命令带 `Idempotency-Key`。设备上传带独立 device token 和 lease_token。role 控制之外还校验 counter/job ownership。

| 权限边界 | 方法 / 路径 | 返回与条件 |
|---|---|---|
| Public | GET /api/public/csrf；GET /api/public/config/registration | 最少公开配置，版本和 CSRF bootstrap；no-store |
| Public | POST /api/public/registrations | 201 public_reference，不返回个人资料/card/pass/due_at；同提交 key 重放同一结果 |
| Public | POST /api/public/mrn-validations | 功能开关/限流；仅返回最低验证状态和绑定的限时 token，不返回患者姓名等；live 未批准时 mock/manual |
| Human session | POST /api/auth/login；POST /api/auth/logout；GET /api/auth/me | 无 public signup；login/logout 的 CSRF 及 session fixation 处理 |
| COUNTER_STAFF | GET /api/staff/registrations；GET /api/staff/registrations/{id} | 最少 operational DTO、分页/筛选/掩码 |
| COUNTER_STAFF | POST /api/staff/registrations/{id}/verify；POST /api/staff/registrations/{id}/reject | 合法 SUBMITTED transition；手工 MRN evidence 和 rejection reason |
| COUNTER_STAFF | POST /api/staff/scan-jobs；GET /api/staff/scan-jobs/{id}；POST .../{id}/cancel | 仅 ISSUE/RETURN、本人柜台设备与 target；202 job reference |
| COUNTER_STAFF | POST /api/staff/card-assignments | scan_result_id、registration_id、due_at、handover_confirmed；201 Pass ID，不信任前端声称类别/卡状态 |
| COUNTER_STAFF | POST /api/staff/card-assignments/{id}/return | RETURN 证据、physical_received；200 原借用结果；仅 ISSUED/OVERDUE |
| COUNTER_STAFF | GET /api/staff/overdue；POST /api/staff/assignments/{id}/followups；POST .../{id}/contact-reveal | 内部跟进，reveal 有审计；不发消息 |
| ADMIN | GET/POST/PATCH /api/admin/users；GET/PATCH /api/admin/settings | version 检查、保护最后管理员、撤销旧 session |
| ADMIN | GET /api/admin/cards；POST /api/admin/scan-jobs；POST /api/admin/cards | enrollment 证据；未知 category profile 阻止注册 |
| ADMIN | POST /api/admin/cards/{id}/mark-lost；.../disable；.../restore | 状态、原因、找回 evidence；不可任意 PATCH inventory status |
| ADMIN | GET/POST/PATCH /api/admin/categories；GET/POST/PATCH /api/admin/destinations | validated field whitelist、version、历史引用保留 |
| ADMIN | GET /api/admin/audit-events；GET /api/admin/blockchain-proofs | 掩码、实际 proof 状态，缺失与 mismatch 区分 |
| ADMIN | POST /api/admin/blockchain-proofs/{id}/verify；.../{id}/retry | 202 verification job；retry 同 eventId，无消息重发副作用 |
| ADMIN | GET /api/admin/integrations；GET /api/admin/notification-jobs | 健康、任务状态；无盲目 resend endpoint |
| role-specific reads | GET /api/dashboard/summary；GET /api/dashboard/visitors-by-category；GET /api/dashboard/pass-utilisation | COUNTER_STAFF operational；ADMIN aggregate/report，明确掩码和时间范围 |
| ADMIN | GET /api/reports/visitor-trends；POST /api/reports/exports | 时间/类别/地点；导出授权/审计/掩码与 CSV 转义 |
| Device only | POST /api/device/scan-jobs/claim；POST .../{id}/results；POST /api/device/heartbeat | stateless scoped token；CSRF 例外只在 device chain；fencing/one-result |
| Provider only | POST /api/integrations/whatsapp/webhook | provider 签名、事件去重、状态单调更新；不能信任裸 provider ID |

“.../{id}” 在实现时展开为同一行最近的资源路径，最终 OpenAPI 必须是完整路径。MRN validation token 绑定匿名会话/nonce、MRN fingerprint、ward、mode/version 和 expiry；提交不能更换字段后沿用结果。访客公开 status lookup 默认不创建。

## 5. 发卡命令与响应示例

```json
{
  "registrationId": 123,
  "scanResultId": "scan-example-only",
  "dueAt": "2026-09-30T10:00:00Z",
  "handoverConfirmed": true,
  "returnCounterId": 1
}
```

API 不接收 caller 自选 actor、UID、category 或 status 来替代扫描证据。服务器校验截止时间符合类别规则/获批 override，必要 override 要 actor/reason。相同 key/body 返回第一次成功的 assignment、Pass ID、due_at 和消息/审计任务引用；因过期重试不能二次发卡。

```json
{
  "assignmentId": 456,
  "passReference": "P-DEMO-456",
  "cardCode": "C-DEMO-248",
  "status": "ISSUED",
  "dueAt": "2026-09-30T10:00:00Z",
  "auditStatus": "PENDING",
  "notificationStatus": "QUEUED"
}
```

未 opt-in 时 notificationStatus=NOT_OPTED_IN（derived UI 状态，无 job）。provider 或 Sui 失败不能把已 committed 的借用改为未发卡。职员在实际交付并确认后提交；若交付后 API 失败/超时，保留同 idempotency key 核查结果并核对实体卡，不能另建新命令。

## 6. 时间、错误与隐私契约

所有业务 timestamp 存 UTC Instant / DATETIME(6)，API 以 ISO8601 Z 返回，报表范围为 `[from, to)`；逾期为 `now >= due_at`，显示 MYT。canonical encoding 使用固化微秒精度，不依赖 Java/JS 默认序列化。

统一错误：`timestamp/status/code/message/correlationId/fieldErrors`；400=输入校验，401=未登录，403=授权/CSRF，404=不存在或隐藏受限资源，409=状态/版本/幂等冲突，429=限流，503=服务暂不可用。外部失败有内部安全诊断，前端无 SQL、stack trace、token、原始 PII。

审计 snapshot 的精确字段应只包含证明需要的业务属性（随机内部关联 ID、事件类型、时间、due_at、规则版本、actor pseudonymous ID等）；除非有医院明确批准，不承诺 IC/姓名/MRN。读取 PII 快照、联系方式 reveal、导出和删除都审计。保留规则区分 registration、contact、scan UID、message payload、commitment snapshot、日志与备份；未解决 lost case/legal hold 不能被自动清理。仅保留链上 hash 不保证清除本地证据后还能验证。

## 7. Migration 顺序与验收

V1 identity/reference/session -> V2 registration/consent/cards -> V3 assignments/active unique/lifecycle -> V4 audit/outbox -> V5 device/scan/idempotency -> V6 notification/receipts/alerts/followups/lost/verification jobs。每批 migration 带真实 MySQL clean/upgrade、约束和 rollback/forward-fix 演练。已应用共享环境 migration 不重写。表设计落实后生成 ERD 与 OpenAPI；目前二者仍是实施规划。
