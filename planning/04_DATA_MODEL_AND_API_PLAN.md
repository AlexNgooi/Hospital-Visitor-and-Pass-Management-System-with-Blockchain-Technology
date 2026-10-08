---
type: data-api-contract
revision: v3
updated: 2026-10-08
status: proposed-implementation
---
# HSAAS 数据模型与 API 契约 v3

状态和业务验收以 [03](03_REQUIREMENTS_AND_TEST_PLAN.md) 为准，执行边界以 [02](02_TECHNICAL_ARCHITECTURE.md) 为准。本文件是目标模型，尚未创建正式 Flyway migrations。旧 `passes/pass_assignments/pass_events` 命名统一到 `cards/card_assignments/lifecycle_events`；UI 的 Pass ID 是一次 Assignment 的 `pass_reference`，不是 NFC UID。

## 1. 聚合与实体

当前 schema 先落实核心数据、QR、幂等、synthetic 扫描和本地审计。notification_jobs/receipts、audit_outbox、proof_verification_jobs 为后续迁移目标，disabled 时不建任务。下面长表同时列出长期模型，不能据此声称当前已存在这些表。

| 表 / 模型 | 主要字段与约束 |
|---|---|
| users | id、login UNIQUE、password_hash、role、active、version、timestamps；最后管理员保护用事务锁 |
| user_counter_permissions | user_id + counter_id UNIQUE、active、version；职员对象/QR 操作只在当前获授权的 counter 范围，停用/修改触发能力撤销；M00 基础模型，M06 后续管理 |
| visitor_categories / destinations / counters | code UNIQUE、名称、active、字段规则或位置配置版本；历史引用不能级联删除 |
| visitor_registrations | id、public_reference UNIQUE、counter_id（来自 grant）、category/destination、status、field_schema_version、按批准字段白名单保存的 form_data、MRN status/mode、reviewer/review time/reason、version；M03 根模型 owner，M04 通过领域接口审核 |
| registration_qr_sessions | id、actor_id、counter_id、category_scope（可空=四类选择）、environment、created_at、revoked_at；只允许授权职员绑定柜台，保留来源以撤销未提交 grant |
| registration_qr_challenges | id、display_session_id、rotation_slot、nonce、token_version/key_version、issued_at、rotate_at、expires_at、revoked_at；UNIQUE(display_session_id, rotation_slot)，scope 从 session 决定，不存 PII |
| registration_entry_grants | id、grant_reference UNIQUE、binding_version、anonymous_session_binding、challenge/display FK、counter/category_scope、environment、issued_at、expires_at、consumed_at、registration_id UNIQUE nullable、revoked_at；nullable replaces_grant_id / replaces_binding_version 成对出现，确认替换关联；每 grant 最多登记一次，关联 session 使用服务端安全映射而非泄露 cookie |
| registration_entry_contexts | anonymous_scope_id UNIQUE/PK、current_grant_id nullable、binding_version BIGINT、updated_at；M02 所有，M00 登记迁移；单份表单指针/版本参与领域事务，不放 HttpSession 属性独立提交 |
| registration_consents | registration_id、purpose、granted、policy_version、captured_at、revoked_at；隐私 acknowledgement 和 WhatsApp opt-in 分开 |
| cards | id、normalized_uid UNIQUE、card_code UNIQUE、category_id、approved profile mapping、status、version、enrolled_by/time、data_origin=SIMULATED/PHYSICAL、environment；掩码呈现 UID |
| card_assignments | id、pass_reference UNIQUE、card_id、registration_id、issued_by/at、due_at、return_rule_version、handover_confirmed_at、returned_by/at、closed_at、closure_reason、return_counter_id、operation_origin/environment；模拟交付不作真实实体交付证据 |
| lifecycle_events | id、assignment/card/registration FK、event_type、actor 或 SYSTEM、occurred_at、safe reason、commitment_event_id；业务历史不可变 |
| audit_events | eventId UUID UNIQUE、target、action、actor、snapshot_version、canonical_bytes、private nonce、payload_hash、occurred_at；敏感快照受访问和 retention 控制 |
| audit_outbox | audit_event_id UNIQUE、event_type/version/hash/time、status、attempts、next_attempt_at、lease_token/owner/expiry、submitted_digest、confirmed_digest、network/package/registry、checkpoint、safe error；不复制 PII |
| reader_devices | id、counter_id、allowed profile、token_verifier、active、last_seen；设备 token 可轮换、不可当 user session |
| scan_jobs / scan_results | device/actor/counter、purpose、target_id、nonce、expires_at、lease_token/expiry、status；UID/profile/result/error、consumed_at、source=SIMULATED/PHYSICAL、environment；来源由 adapter/服务端决定，每 job 至多一个 accepted result |
| idempotency_records | scope_kind(ANONYMOUS/USER)、server scope_id、operation、target_ref NOT NULL、key 的联合 UNIQUE；request_hash、encoding_version、hash_key_version、成功HTTP status/最少安全结果、created/expiry；原 body/canonical bytes 不存储 |
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

第 7 条的 outbox/notification 是启用后的目标：当前 disabled 只写本地事件/审计/幂等，不产生空队列或外部 job。synthetic origin 由服务端环境/fixture/adapter 决定，不接受前端自行选择或把真实登记挂到模拟卡；不同 origin/environment 的 evidence 不可互换。

8. 登记事务锁住 grant，校验 session/scope/environment、`now < expires_at`、未撤销/消费、counter active，再插入 registration/consent/idempotency result 并消费 grant，失败同回滚。相同 actor-scope/key/body 的成功重放先返回受限原结果，不能因 grant 已消费而失败；其他 key/body 再用此 grant 为 409。跨匿名会话不得取得原结果。
9. 轮换创建与撤销均锁定 display session；撤销会话/停用 counter 与 exchange/submit 的 QR 域顺序统一为 counter（升序）→ display session（升序）→ entry context（升序）→ challenge/grant（固定类型/ID顺序）→ registration/idempotency。context 在 grant 前，协调 M03 的提交编排与 M02 单份指针，不混用双方旧候选顺序。非锁预读只发现 IDs，锁后重读当前 pointer/version；发现绑定已变到未锁资源时回滚/返回冲突，不持锁追锁。owner auth-session guard/账号权限撤销加入此顺序的准确位置仍待 M00/M02 联合提交所有写路径的锁图并经真实 MySQL 竞争测试；在完成前不放行关联实施。自然 QR 过期只影响新 exchange，显式撤销检查同样影响已有未提交 grant。

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
| QR display / challenge | session ACTIVE → REVOKED；challenge ACTIVE → EXPIRED / REVOKED，server now >= expires_at 即过期，不依赖 scheduler 是否已写状态 |
| Registration grant | OPEN → CONSUMED / EXPIRED / REVOKED；grant 不随 challenge 自然过期而失效，但显式 session/counter 撤销与绝对 expiry 有效 |

模式关闭返回的 NOT_ENABLED（消息/链）、LOCAL_ONLY（审计）是 derived capability/UI 状态，没有 job row；不要给 job 状态机硬加 fake CONFIRMED。mock 启用是未来 adapter 测试状态，不等于 disabled。

Outbox worker claim 用短事务和 lease fencing，不持有 DB lock 等待 provider。审计 PROCESSING lease 过期可重新对账；消息 SUBMITTING lease 过期转 UNKNOWN，不能简单回 QUEUED。撤回消息同意：发送前重查当前 consent，未提交任务 CANCELLED；已被 provider 受理则不能声称能撤回发送。

## 4. API 清单与权限

以下路径是拟定契约，OpenAPI 在正式项目初始化后固化。浏览器写请求带 CSRF；重要命令带 `Idempotency-Key`。设备上传带独立 device token 和 lease_token。role 控制之外还校验 counter/job ownership。

### 公共契约预冻结：C01–C06（准备阶段，非开发批准）

- C01 Auth/CSRF：`GET /api/public/csrf` 返回 `{headerName, token}`，headerName 初值 `X-CSRF-TOKEN`；M00 使用框架生成/校验 token，不自制 CSRF。`POST /api/auth/login` 为 JSON `{login,password}`，成功 200；login 成功与 `GET /api/auth/me` 均返回 `{id,login,role,counterIds}`，role 单值 `COUNTER_STAFF / ADMIN`，counterIds 由当前授权计算。logout 成功 204；匿名/失效 me 为 401。登录/注销后重新 bootstrap CSRF。U01 用户确认 login 为用户名/职员账号，不强制邮箱；UI 使用 Username / Staff account 标签，账号语法/归一化由 M00 准备统一规则，不能套用 email validator。
- C02 安全错误：fieldErrors 固定为 `{field,code,message}` 数组，未有字段错误时 `[]`，不含 rejectedValue/raw input；其余字段按 §6。filter/controller 都使用同一安全格式。错误码最低集 `VALIDATION_FAILED / INVALID_CREDENTIALS / AUTHENTICATION_REQUIRED / ACCESS_DENIED / CSRF_INVALID / INTEGRATION_DISABLED / SERVICE_UNAVAILABLE`，QR/grant 专有码按后文。无网络或非 JSON 是 client fallback，不冒充 backend 错误对象。
- C03 权限：ADMIN 不默认拥有 review 或柜台操作；错误角色 endpoint 为 403；角色正确但对象不存在/超出 counter scope 为 404；staff 列表只筛当前授权柜台。counter 来源从 grant/服务端记录取得，不能 caller 自选替换。用户绑定/停用变化要求 session 与 QR 能力撤销接口，M00 管权限决定，M02 管其 display/grant 执行。
- C04 Review：`verify/reject` 命令带 `expectedVersion` 与 Idempotency-Key，核实依据/批准或必填拒绝理由、version、本地 audit 与幂等结果同事务。manual evidence 仅有服务端 actor/time、结构化核实方法/安全依据码，可选受限 safe note；精确 enum/长度由 M03/M04 提交 synthetic v1 契约再经 coordinator 评审，患者详情/病历不进入 note。U03 用户确认：synthetic Penjaga 必须由职员模拟人工核实后才可批准，mock 匹配/成功本身不改变 verified predicate；模拟核实保留 SYNTHETIC_MANUAL 来源、actor/time/依据，不能标为真实患者核验。
- C05 Grant/幂等：M03 通过 M02 port 加入同一外层事务，锁序按 §2，不独立提前消费；幂等 scope 用服务端稳定 anonymousScopeId + operation，不能用 caller 自填 scope 或暴露 cookie。会话 ID 轮换保留服务端 scope 属性；会话丢失不能用 reference 重建授权。相同 scope/key/body 的已成功命令，在安全响应保留窗口内可返回原非敏感 reference，即便 grant 已自然过期/消费/撤销；新命令仍按当前状态拒绝。幂等保留期初值 24h，匿名授权会话本身必须仍有效，清理/过期后不得伪造原结果或创建第二个登记。
- C06 本地审计：M00 提供可参与外层事务的 LocalAuditPort，当前包含 `REGISTRATION_SUBMITTED / REGISTRATION_VERIFIED / REGISTRATION_REJECTED` 本地 action；只含所需安全关联/状态/version/actor/time，不复制表单/证件/MRN/note 原文。审计失败业务回滚，不自动加入链 catalogue 或发消息。schema 与 OpenAPI 由各 backend owner 提供，M01 管 generated client 入口，不手改生成代码；冻结前只能使用明确的 mock port。

C01–C06 是 coordinator 的技术决定。2026-10-09 C01/C02 与基础权限、审计/幂等 port 已在 M00/M01 当前本地范围实现并验证；具体登记/审核/grant 命令仍由未启动的业务模块实现，不把基础 port PASS 当完整业务 PASS。cookie/工程 session TTL 已采用02方案，QR签名方向见该文件；M02 的完整token/keyring/lifecycle仍需实测。用户只批准M00/M01，不扩展至其他模块。

C01 wire ID 补充（M01 实施问题）：login/me 的 `id` 为 JSON string，`counterIds` 为 JSON string 数组；数值主键在 HTTP 层输出十进制字符串，前端按 opaque string 保存/比较，不转 JavaScript Number，避免 Java long 超出精确整数范围。其他 DTO 的数据库主键遵循同一 string 原则；此决定不改变 version/期限等非 ID 字段契约。C10 scope 精确 DTO 现已在下文冻结；共享 restart 组件保留适配入口，接收业务模块校验后的安全标签/context，未知 details 不渲染或回显原对象，不代 M02 实现 exchange。

C07/U02 单份表单：同一 anonymousScopeId 最多一条有效未提交 grant；exchange 发现不同入口已有有效表单先返回 409 `REGISTRATION_ENTRY_RESTART_REQUIRED` 与最小旧/新 scope 信息，不自动覆盖。客户端只在明确确认重新开始后重试（绑定 expected old grant reference/version）；服务端同时校验当前绑定与新 entry 有效性，原子撤销旧 grant/创建新 grant。取消/替换失败保留原 grant，旧页以原 grant reference/version 提交必须被拒，不能借共享 cookie 误用新 grant。成功重放按 C05，不把新的 grant 身份作为 PII 查询授权；同码同会话重试保持原 expiry。M02 提出具体 DTO/锁序/CAS 模型供 coordinator 评审，M03 必须显式校验提交表单上下文。

C08 职员命令幂等：先验证当前 session/role、CSRF、对象/counter 权限，再按 server actorId + operation + targetId + key 查成功记录并比较 request_hash。同 key/body 返回原安全结果、不重新验证旧 SUBMITTED/version、不写第二份审计；同 key 不同 body 为 409 IDEMPOTENCY_CONFLICT。未成功记录才检查合法状态/expectedVersion，分别为 REGISTRATION_STATE_CONFLICT / VERSION_CONFLICT。保留初值 24h；撤销角色/counter 权限后禁止借重放绕过权限。M00 提供 request hash 的版本化 DTO encoding，保留 null/缺失语义，不能用原始 JSON 属性顺序直接散列；日志不得记录原 body/hash 输入中的 PII。

C09 synthetic manual evidence v1：统一 M03/M04 的候选字段，verify payload 使用 `expectedVersion / identityConfirmed / manualEvidence`；Penjaga 加 `mrnConfirmed / wardConfirmed`。manualEvidence 为 `{methodCode,basisCodes}`，当前 synthetic methodCode=`SYNTHETIC_RECORD_COMPARISON`；basisCodes 白名单为 `IDENTITY_MATCH_CONFIRMED / MRN_MATCH_CONFIRMED / WARD_MATCH_CONFIRMED`，Penjaga 必须完整三项，其他类别仅身份项并拒绝 MRN/ward 注入。enum 最大 64 ASCII chars，未知字段/码拒绝，不开放自由 note/附件。schemaVersion=1、actor/time/environment/source/registration版本由服务端产生，source=SYNTHETIC_MANUAL；这不定义未来医院 manual 证据政策。拒绝 reasonCode 初值 `INFORMATION_INCOMPLETE / IDENTITY_NOT_CONFIRMED / MRN_WARD_NOT_CONFIRMED / INFORMATION_NOT_CONFIRMED`（MRN码仅Penjaga），必填且映射可读理由，当前不另加自由文本。

M03 的其余 synthetic-registration-v1 字段与 MRN enum/validation token 方案仍是准备提案，coordinator 后续统一评审；不能写成真实医院 schema 获批。C09 是协调双方提案的技术命名/最小字段，不扩大 U03 的“职员模拟人工核实”决定。

C10 单份表单 DTO/CAS 决定：

- `formContext={grantReference,bindingVersion}`。grantReference 是随机非敏感引用，不是授权 bearer；exchange/GET entry 返回此 context、scope/serverNow/grantExpiresAt，M03 schema 由其 owner 定义。schema/MRN/submission 都传表单最初的 context；不能先 GET 新 context 把旧输入悄悄换绑。request hash 同时覆盖 formContext。
- C10 wire scope 已于 2026-10-09 冻结为 `{environment:string,counterId:string,categoryScope:string|null}`。counterId/categoryScope 为对应数据库主键的十进制字符串；categoryScope 唯一表示 visitor_categories ID，不混用 code 或显示名称。null 表示本环境当前四类允许类别的选择入口，非 NULL 限于指定类别；服务器校验其存在/启用与入口授权，不接受 details 改写 grant。environment 来自服务端配置/入口，仅用作范围比较，不由客户端切环境。`bindingVersion` 保持 JSON number，但必须为 0–9007199254740991 内整数；客户端严格校验，服务端 CAS/递增不得越界或回绕，达到上限须拒绝状态变更。`RestartDetails={currentFormContext,currentScope,requestedScope}` 只用于 RESTART_REQUIRED，其他错误不输出 details；不加 name/token/PII，M01 使用受控适配得到展示标签。
- exchange 确认重试带 `restartConfirmed=true`、`expectedFormContext`；未确认不得自选 counter/category。已有不同 canonical scope 的有效 grant 返回 RESTART_REQUIRED，不修改 version/pointer；canonical scope 包括 environment/counter/categoryScope，同 scope 的另一 display 可复用原有效 grant，但保留原 display/owner 来源与撤销语义，不延长 expiry、不换绑。
- 首次与 replace 在领域事务中更新 entry_context，CAS 检查 pointer/version，成功一次才撤销旧 grant/创建新 grant；失败完整回滚。消费成功清 current_grant_id 并增加 binding_version，保留原 grant 与幂等历史。未知提交结果不能宣称“替换失败、旧 grant 有效”，客户端先 GET entry 核对，只在明确新绑定后清旧输入。
- 统一 409 `REGISTRATION_ENTRY_CONTEXT_CHANGED` 表示预期 pointer/version 已改变。RESTART_REQUIRED 的统一安全错误允许可选 typed `details={currentFormContext,currentScope,requestedScope}`，仅此白名单形状，无 PII/token/raw input；其他错误默认 details 缺省。不要把 JSON 塞 message/fieldErrors，M00/M01 按 error code 解析明确类型。
- 确认的网络重试：同一匿名 scope 的当前 grant 必须能证明创建自同一 confirmation transition（绑定 expected old context、新 challenge、当前新 context）。新 entry 仍有效时只返回这份新 grant，不再创建/续期；entry 已过期则返回 410 并引导 GET entry 恢复，GET 返回不是接受过期码的新 exchange。不得任意通过同 scope 相似字符串接受确认重放，transition 关联字段由 M02 提交，跨 expiry 幂等扩展不在当前契约。

C10/§2 的局部顺序与 DTO 为技术决定；完整 auth guard 锁图、首次 context 唯一插入竞争、replace/submit/revoke/权限更新与 Session JDBC 事务交互仍是实施前明确关卡，测试均 NOT_RUN。

C12 最小确认关联（采纳 M02 补充）：只在新 grant 增 `replaces_grant_id`（FK旧 grant）与 `replaces_binding_version`（首次提示时的 expected version），两者同空/同非空；同 anonymous scope + 非 NULL replaces_binding_version 唯一。由 M02 定义目标模型，M00 登记 migration；没有新 confirmation 表/endpoint/token。关联、旧 grant 撤销、新 grant 与 context CAS 在同一领域事务更新。

确认重试必须在有效匿名会话中，new entry 签名/期限有效；当前 pointer/version 指向同一未撤销、未消费、20分钟未过期的新 grant；该 grant 的 challenge_id 等于本次新 challenge，replaces_grant_id 的引用与 expectedFormContext.grantReference 相同，replaces_binding_version 相同，scope/env/new display owner 能力全部有效。只返回这一已有 grant，不续期/增版本；不匹配返回 CONTEXT_CHANGED 或对应状态错误。旧 display 后来失效不影响以另一 owner/display 正常创建的新 grant，不能把新旧来源混用。entry 已过期按 C10 返回 410 后 GET 恢复，不新增跨 expiry 确认幂等协议。

M00/M02 合并锁图已采用为实现验证基线：identity_policy_gate（仅身份/最后管理员路径）→ users/principals（ID升序）→ counters（ID升序）→ user_counter_permissions（修改权限时，user/counter升序）→ app_session_bindings（ID升序）→ auth_session_contexts（ID升序）→ display（ID升序）→ entry_context（ID升序）→ challenge/grant（固定类型/ID）→ registration/idempotency → local audit。2026-10-09 coordinator 审核 M00 后将 counter/permission 位置同步为实际已测试的 counter 在先；其他模块不得保留反序。各路径取其子序列；先非锁发现全部 actor/target/新旧 owner 与 counter ID，按序锁后重读。绑定指向未锁资源时完整回滚/重试或冲突，不持 binding/context 锁追锁 counter。M00 安全前缀已通过独立 MySQL 测试；完整 QR/登记图仍 NOT_RUN，不将局部验证扩大为全图无死锁保证。

M00 owner guard 采用“先冻结 port，再做登录持久化/失效 spike”：M00 port 封装实际 Session metadata 的非锁读取，M02 不锁/依赖框架表。app_session_bindings / auth_session_contexts 与 users.security_epoch 的具体 DDL 待实现验证。auth context 的 confirmed_idle_expires_at 是成功保存确认后的保守期限上限；guard 取它、8h绝对期限、实际持久化 Session expiry 的最早值，同时检查真实 Session 存在、principal/mapping/current pointer/generation/epoch/当前授权，不把该字段当框架期限的权威副本。

framework save/flush/delete 阶段不持领域锁、不在领域事务内；成功 save 后用有界 REQUIRED 领域事务按 user→binding→context 重新校验并激活 PENDING 或续期 ACTIVE，hook 不再调用 save。首次登录必须确认持久化和激活才响应成功，PENDING 使用独立短 activation TTL。续期只允许正常已登录 owner 的成功 save；必须尚未超过旧 confirmed/absolute deadline 且全部映射有效，新上限不得超过持久化 expiry/absolute deadline。匿名 exchange/submit 不续 owner 期限，失败保存、迟到/旧 generation 保存不得复活失效或撤销能力。8h/24h 起点固定。

logout 先按 user→binding→context 提交逻辑撤销，再删除框架 Session；delete 失败仍拒绝能力。账号/角色/权限更新与 target user epoch/audit 同事务；counter 关闭按 actor user→counter→actor binding/context 校验并停用，不反向追锁所有 owner。grant/display 可依据当前权威 guard 逻辑失效，物理清理为后续工作；API 不把仍 OPEN 的失效 grant 显示为有效。业务已提交但请求结束自动 save 失败为响应 UNKNOWN，不宣称业务回滚或换幂等 key；按 C05/C08 在有效会话内核查原命令。框架 reaper 不直接调用领域 hook。

M00 已直接实现 spike，并经 coordinator 独立及合并后 verify40tests和真实C01联调验证、审核合并。安全前缀可供获自身用户许可后的 M02/M03 接入；新模块必须验证自己的完整QR/grant/registration事务图，不把基础前缀通过当全图通过。

C11 M00 公共工程契约：

- 账号 canonical login：首尾仅去 U+0020 空格，Locale.ROOT 小写，3–64 ASCII 字符，`[a-z0-9][a-z0-9._-]{2,63}`；其他空白/控制/非ASCII/@拒绝，不做 Unicode 模糊转换。所有创建/修改/bootstrap/login/唯一约束/限流共享入口，me 返回 canonical login；password 原样，不 trim/casefold/normalize。不存在/错误密码/停用统一 INVALID_CREDENTIALS，非法语法为安全 VALIDATION_FAILED。MySQL collation 与 UNIQUE 须实测。
- 幂等唯一 namespace 为 `(scope_kind,server_scope_id,operation,target_ref,key)`；匿名 registration submit target_ref 固定 `REGISTER`，不能随 grant 换 namespace；staff verify/reject 用 registrationId 为 target，operation 区分。Idempotency-Key 是严格 UUID v4 文本、canonical 小写；新命令新 key，unknown/重试保留原 key/body/expectedVersion；auth/CSRF 不套用此业务协议。
- request hash 采用独立 key 的 HMAC-SHA-256（至少 256-bit 随机秘密，不能复用 QR 签名 key）；encoding/version/key_version 持久化，原 body/canonical bytes 不保存或写日志。编码 v1 按每 operation 的显式 DTO 字段 schema、固定次序/UTF-8、presence(MISSING/NULL/VALUE)/type/value，包含 scope/operation/target/dtoSchemaVersion/formContext/expectedVersion/全部业务字段。JSON 属性顺序/等价转义不影响已解析语义，普通数组保序，C09 basisCodes 集合排序且重复拒绝；未知/重复属性、非法 Unicode/数值拒绝，不进行未定义全局 trim。精确 wire encoding 固定样例须在 M00 验证，不宣称这就是通用 canonical JSON 标准。
- 旧 key/version 保留到相关 24h 记录和有界在途窗口结束；无法取得旧 key 时为 503、禁止当新命令执行。初次成功记录读查不是领域锁；缺记录时先按领域顺序锁，locking current-read 重查成功记录要优先旧 state/version 判定，以处理等锁期间成功提交。所有变更/幂等成功结果/audit 在一个外层事务，无独立 claim/REQUIRES_NEW PROCESSING 状态。UNIQUE 冲突必须完整回滚，在新事务重新鉴权并读取结果，不在 rollback-only 事务继续写。
- 每域依其已冻结对象锁序执行，M00 不代实现业务；并发/权限撤销/回滚/key轮换等验证必须真实 MySQL留证，当前 NOT_RUN。C11 技术方案不代表模块开发批准。
- 2026-10-09 公共领域事务 manager 统一为 JpaTransactionManager（同 EntityManagerFactory/DataSource、READ_COMMITTED），JPA 聚合写与 JdbcTemplate audit/idempotency 加入同一 REQUIRED 外层事务；不混用两个默认 manager 分别提交。实际共享连接、flush/缓存边界与失败回滚由 M00 测试证明，后续模块沿此 port/事务契约实施，详见02。framework Session 持久化仍独立，不参加 grant/registration/audit/idempotency 原子提交。

| 权限边界 | 方法 / 路径 | 返回与条件 |
|---|---|---|
| Public | GET /api/public/csrf；GET /api/public/config/registration | 最少公开配置，版本和 CSRF bootstrap；no-store |
| Public | POST /api/public/registration-entry/exchange | CSRF + entryToken；校验签名/服务端 expiry/scope/撤销，绑定匿名会话 grant；返回最低 scope/serverNow/grantExpiresAt，不返回 PII |
| Public | GET /api/public/registration-entry | 读取本匿名会话当前 grant 的最少范围/expiry；无 grant 不可开启登记；no-store |
| Public | POST /api/public/registrations | 有效 grant + CSRF + Idempotency-Key；原子消费并创建；201 public_reference，不返回个人资料/card/pass/due_at |
| Public | POST /api/public/mrn-validations | 功能开关/限流；仅返回最低验证状态和绑定的限时 token，不返回患者姓名等；live 未批准时 mock/manual |
| Human session | POST /api/auth/login；POST /api/auth/logout；GET /api/auth/me | 无 public signup；login/logout 的 CSRF 及 session fixation 处理 |
| COUNTER_STAFF | GET /api/staff/registrations；GET /api/staff/registrations/{id} | 最少 operational DTO、分页/筛选/掩码 |
| COUNTER_STAFF | POST /api/staff/registration-qr-sessions | CSRF；已授权 counter + 可选 category scope，创建绑定 actor 的显示会话 |
| COUNTER_STAFF | GET /api/staff/registration-qr-sessions/{id}/current | ownership + counter 权限；当前时间槽的签名 entry URL/serverNow/rotateAt/expiresAt；锁定创建或重用 challenge，no-store |
| COUNTER_STAFF | POST /api/staff/registration-qr-sessions/{id}/revoke | CSRF + ownership；撤销显示会话、challenge 和未提交 grant；刷新客户端无法复活旧会话 |
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

公共 config/CSRF 可以无 grant 读取最低 bootstrap；MRN validation、表单 schema/scope、登记提交要求有效 grant，避免动态入口被直接 API 绕过。entry token 在 QR URL fragment 中，页面清除 fragment 后经 POST body exchange；grant 身份用匿名会话 cookie，不放 URL/localStorage。exchange 同一有效 challenge 对同匿名会话重试重用有效 grant，不延长 grant 初始 expiry；多人各建自己的 grant。登记 payload 的 counter/category 必须匹配服务端 grant，不能自选柜台或脱离 category scope。

动态 QR 错误码：QR_ENTRY_INVALID（400，签名/未知/篡改）、QR_ENTRY_EXPIRED（410）、QR_ENTRY_REVOKED（410）；REGISTRATION_ENTRY_REQUIRED（403）、REGISTRATION_ENTRY_EXPIRED/REVOKED（410）、REGISTRATION_ENTRY_USED（409）；限流 429、服务不可用 503。响应只含安全原因与重扫码动作，不回显 token/PII。匿名会话丢失时重扫码，不能用 public_reference 取回个人资料。

当前生产禁用模拟 scan/issue；synthetic demo/test 由受保护 adapter 提供结果，保留 C02 绑定/lease/expiry 校验。同一业务 API 不能接受客户端 UID/source 假造扫描。proof verify/retry、notification webhook 与 provider poller 在 disabled 模式不执行，操作请求返回 409 INTEGRATION_DISABLED，读取返回 capability 未启用。

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
  "auditStatus": "LOCAL_ONLY",
  "notificationStatus": "NOT_ENABLED",
  "blockchainStatus": "NOT_ENABLED",
  "operationOrigin": "SIMULATED"
}
```

以上响应是当前 synthetic 模式的示例，不是实体卡已交付声明。将来启用消息/链后才返回实际 QUEUED/PENDING；未 opt-in 为 NOT_OPTED_IN（derived，无 job）。provider/Sui 失败不能把 committed 借用改为未发卡。真实模式必须在实体交付确认后提交；超时保留同 idempotency key 核查，不能另建命令。

## 6. 时间、错误与隐私契约

所有业务 timestamp 存 UTC Instant / DATETIME(6)，API 以 ISO8601 Z 返回，报表范围为 `[from, to)`；逾期为 `now >= due_at`，显示 MYT。canonical encoding 使用固化微秒精度，不依赖 Java/JS 默认序列化。

统一错误：`timestamp/status/code/message/correlationId/fieldErrors`；400=输入校验，401=未登录，403=授权/CSRF/缺 grant，404=不存在或隐藏受限资源，409=状态/版本/幂等/未启用，410=QR/grant 过期或撤销，429=限流，503=服务暂不可用。外部失败有内部安全诊断，前端无 SQL、stack trace、token、原始 PII。

审计 snapshot 的精确字段应只包含证明需要的业务属性（随机内部关联 ID、事件类型、时间、due_at、规则版本、actor pseudonymous ID等）；除非有医院明确批准，不承诺 IC/姓名/MRN。读取 PII 快照、联系方式 reveal、导出和删除都审计。保留规则区分 registration、contact、scan UID、message payload、commitment snapshot、日志与备份；未解决 lost case/legal hold 不能被自动清理。仅保留链上 hash 不保证清除本地证据后还能验证。

## 7. Migration 顺序与验收

以下是依赖批次，不是已执行的 Flyway V 编号：identity/reference/session/idempotency/local audit → QR display/challenge/grant → registration/consent → synthetic cards/device/scan → assignment/active unique/lifecycle/alerts/lost → reporting/settings。M00 登记实际编号，每个 module 申请后使用；先检查库中已有 migration，不重写共享环境已应用版本。

M00 当前迁移登记（2026-10-09）：V1 `foundation_identity_reference`、V2 `spring_session_jdbc`、V3 `session_capability_guards` 已审核合并，临时MySQL clean/upgrade验证通过；已应用版本冻结，其他模块不得重用或重写。真实开发/生产库未在本次验证中使用。后续号继续由M00/coordinator台账登记；安全前缀已放行，但后续模块完整业务图仍需自己的验证。

M08 增加真设备/profile；M09 增加获批 MRN adapter 所需最少字段；M10 增 notification/receipts；M11 增 audit_outbox/verification jobs/链绑定。后两者在启用前完成 clean + upgrade、模式默认 disabled 与故障恢复验收。历史本地事件不自动入队，canonical snapshot 缺失或版本不兼容不能伪造历史承诺。表设计落地后生成 ERD/OpenAPI；当前仍为规划。
