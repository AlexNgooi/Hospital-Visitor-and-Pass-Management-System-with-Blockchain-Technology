---
type: requirements
revision: v3
updated: 2026-10-27
status: proposed-implementation
---
# HSAAS 需求与验收基线 v3

**2026-10-27 最新决定**：用户授权按[16](16_MANUAL_PASS_MODULE_COORDINATION.md)启动R01–R03独立模块chat/worktree开发，覆盖下方昨日design-only限制；功能尚未交付，验收NOT_RUN。Penjaga已确认**仅IC、每登记最多一张活动pass**，旧IC/Passport与卡数未决项已解决。

范围保留 proposal 的长期目标，并按 2026-10-08 用户决定分为当前版与 deferred 集成。本文是当前实施需求的唯一主表；未表示医院已签署或软件已通过测试。依据与未决项见 [10](10_BASELINE_REVIEW.md)，模块分配见 [12](12_THREE_MONTH_CHAT_PLAN.md)。

## 2026-10-26 当前需求变更（优先于旧扫描/synthetic 字段规则）

用户明确要求本轮**只更新需求和设计，暂不改应用代码**。取消 reader 依赖，counter staff 手动选 pass、人工核实与发还；Vendor/Contractor 可借多张，Executive 每份登记最多一张活动 pass；期限可设或不设。用户确认“进/出”就是发/还 pass 的日期时间，Penjaga MRN 暂用假 API 回填患者姓名和 ward/bed，条款只勾选并记录时间，不要电子签名。完整来源、字段责任、设计与未决项见 [15](15_MANUAL_PASS_AND_FORM_CHANGE.md)。这些是新需求，状态 **NOT_IMPLEMENTED / NOT_RUN**，不能套用 M00–M07 历史 PASS。

| 类别 | 本版所需字段与来源 |
|---|---|
| Penjaga | 自填姓名、电话、证件号码、现住址、MRN；lookup 回填 Nama Pesakit、Nama Wad/Katil；勾选访问卡条款并由服务器记录版本/时间。PDF 的 IC/Passport 标签差异待确认 |
| Executive Visitor | Nama、IC/Lesen 类型二选一及对应号码、手机号、Wad、Nama Pesakit；不强加 MRN、organisation/contactPerson/purpose |
| Vendor / Contractor | Nama、IC、手机号、Company、Location（支持多个目的地）；不强加旧 contactPerson/purpose |

旧 relationship、额外 organisation/contactPerson/purpose 不继续作为新表单必填，旧 schema 历史保留。Penjaga 暂沿用单登记一张活动 pass，是否改变待确认。PDF 的归还/职员签核不转成 visitor 自填项，收费/罚款不自动纳入本轮。动态登记 QR 仍保留，取消的是 pass reader。

## 范围和术语

- 仅处理必须在柜台登记并领取实体卡的访客：Executive Visitor、Penjaga、Vendor、Contractor。普通探访、定位、门禁开启、完整病历、native app、Sui Mainnet 不在范围内。
- Registration 是申请；数据库批准状态统一为 VERIFIED，UI 的 Approved 映射到 VERIFIED。批准本身没有 Pass ID/card assignment/due_at。
- Card 是可重复使用的实体库存；Assignment 是一次借用，其 public pass_reference 在 UI 显示为 Pass ID。RETURNED 是事件，库存归还后变 AVAILABLE。
- Visitor 不建账号；COUNTER_STAFF 操作柜台；ADMIN 管用户、配置、库存、审计、报告。系统服务和设备拥有独立凭据，不能冒充职员。

## 功能需求与验收矩阵

Must 是当前目标版要求；Conditional/Deferred 是外部条件满足并由用户启动后才验收的路径。下列 test IDs 是验收计划，不授权执行测试。2026-10-26 变更项全部 NOT_IMPLEMENTED / NOT_RUN；旧扫描模拟交付与历史测试仍只证明当时版本。链/消息验收不进入当前 release 的 Must 分母。

| ID | 优先级 / 来源 | 要求与可验证条件 | 主要验收案例 |
|---|---|---|---|
| R01 | Must / proposal + user 2026-10-08 | 柜台 QR 是服务端轮换的限时登记入口，包含 HTTPS URL + 非敏感短期 entry token；手机无需账号进入四类表单，禁止静态 URL QR 替代 | T-R01：真机扫码、连续两轮 payload 改变、解码无 PII；静态/无 grant 绕过失败 |
| R02 | Must / user 2026-10-26 + PDF | 服务端按本页新四类字段的版本化白名单检查字段、长度和必填；旧 schema/history 可读；公共 reference 随机且不授予 PII 读取权限 | T-R02：新四类字段/IC-Lesen选择、历史兼容、边界/未知字段拒绝；重复提交受控 |
| R03 | Must / user confirmed 2026-10-26 | Penjaga 勾选访问卡条款，服务器记录版本/同意时间，不需要电子签名；条款、隐私告知和未来 WhatsApp 同意区分。WhatsApp disabled 时不采集发送 opt-in、不建任务，将来默认未勾选且拒绝仍可登记 | T-R03：条款未同意/同意版本和时间；disabled 零发送同意/任务；未来 opt-out 独立测试 |
| R04 | Must / user 2026-10-26 + PDF | Penjaga 自填 MRN 后 lookup 自动显示最少患者姓名、ward/bed；改变 MRN 清空旧结果，失败保留输入并转人工核实；staff actor/时间/依据独立记录，不保存病历 | T-R04：回填、改变 MRN/晚到响应、timeout、人工核实、未核实禁止批准 |
| R05 | Must mock / Conditional live | 用户确认先设计假的 MRN API，明确 MOCK/SYNTHETIC；live 仍需医院 endpoint/auth/response/test account，不能把假数据当医院验证 | T-R05：受 grant 保护的假查询及来源标记；live 获批 sandbox，当前 NOT_RUN |
| R06 | Must / user 2026-10-08 | QR challenge 服务端过期/撤销/范围校验；成功扫描换取绑定匿名会话的限时单次提交 grant，QR 换码不影响已有效进入的表单；公共二维码允许多访客扫描 | T-R06：过期边界、撤销、篡改 counter/category、跨会话、grant 过期/重复提交/并发、扫码后换码继续填、断网/休眠恢复 |
| S01 | Must / proposal + UI v4 | 职员登录后查看授权队列；批准/拒绝写审计，拒绝理由必填；批准不自动发卡或发消息 | T-S01：401/403、审核冲突、拒绝、批准无借用 |
| C01 | Must / user 2026-10-26 | 库存按可辨识 pass code、类别/地点和状态管理，staff 手动选择 AVAILABLE pass；新办理流程不要求 UID/profile/reader 扫描，旧库存和扫描历史保留 | T-C01：无 reader 仍可维护/选库存，重复 pass code 和无效库存拒绝 |
| C02 | Superseded / user 2026-10-26 | reader ScanJob 不再是发还前置；旧 job/result 仅保留历史，不为 manual 操作伪造扫描证据；staff 权限、counter scope、版本和幂等仍须校验 | T-C02：无设备/scan result 可办理；越权/跨柜台/重复命令仍安全拒绝 |
| P01 | Must / user 2026-10-26 | VERIFIED + AVAILABLE + 类别/地点兼容 + staff 手动选卡和确认实体交付；每张独立 assignment/Pass ID/发放时间/可选期限，业务与本地审计原子完成 | T-P01：手动发卡、库存冲突/回滚、来源/actor/time |
| P02 | Must / user 2026-10-26 | 每张库存卡最多一条活动借用；Vendor/Contractor 同登记可多张/多地点，Executive 最多一张活动 pass；Penjaga 暂沿用一张待确认；相同 key/body 重放原结果，不同 body 为409 | T-P02：多卡/多地点、Executive 第二张拒绝、并发同卡仅一赢家、幂等重放 |
| P03 | Must / user 2026-10-26 | staff 手动选择实际收到的 pass 并确认，正常/逾期借用可归还，无需 RETURN scan；多 pass 支持部分归还，其余不关闭；库存/returned_at/actor/审计原子完成，LOST 仍走遗失流程 | T-P03：还一张不关闭其他借用、重复归还/回滚、LOST 拒绝正常归还 |
| P04 | Must / user 2026-10-26 | 仅 due_at 非空、仍活动且 ISSUED，并且 UTC now >= due_at 才逾期；无期限不产生逾期；每借用一条逾期事件/告警，配置不回写既有 due_at | T-P04：null 期限、截止边界、scheduler replay、归还竞争 |
| P06 | Must / user 2026-10-26 | 每张发放可设归还日期时间或明确不设；不设仍须实际归还，UI 显示“未设归还期限”，不能自动套24小时或无限远日期 | T-P06：有期限/无期限、无期限归还/遗失、历史兼容 |
| P07 | Must / user confirmed 2026-10-26 | 每张记录 issued_at=进、returned_at=出，显示完整日期时间和经办人；未归还/遗失不得伪装实际归还；统计区分 visitor 登记数与 pass 数，UTC 存储/MYT 显示 | T-P07：多 pass 独立时间、跨日、未归还/遗失、CSV 与列表一致 |
| P05 | Must / UI v4 + proposed closure rule | ADMIN 标记 LOST/DISABLED 必填理由；Issued/Overdue 标 Lost 同时结束活动借用并保留 unresolved lost case；找回后经核实才 Restore | T-P05：遗失不可借；直接归还拒绝；恢复规则/原因有审计。恢复细则待医院确认 |
| N01 | Deferred / UI v4 + user scope | 将来启用后 VERIFIED + ISSUED + opt-in 且真实交付确认，每 assignment 一条 COMBINED_PASS_DETAILS；含问候、姓名/类别/reference、Pass ID、card code、地点、MYT 截止时间/归还柜台；不含 IC、MRN、电话字段；当前不建 job、不发送 | T-N01：当前 disabled 零任务/外部调用；live 单条组合消息/模板验证 NOT_RUN |
| N02 | Deferred / UI v4 + user scope | 当前显示 NOT_ENABLED；将来启用后只显示实际任务状态，无批准/拒绝/提醒/归还消息，UNKNOWN/SENT/DELIVERED 不盲目重发 | T-N02：当前未启用无 resend；provider accepted ≠ delivered、超时/回调测试 NOT_RUN |
| N03 | Must / proposal + UI v4 | 逾期通知是内部 alert；授权职员可 reveal 联系方式并记录人工跟进，均有审计；不触发 WhatsApp | T-N03：无 opt-in 仍出现内部告警；越权 reveal 拒绝 |
| A01 | Must / proposal | ADMIN 维护账号与角色，停用/降级撤销会话；最后一个 active admin 被保护 | T-A01：并发停用两个管理员不能导致零管理员；职员 API 403 |
| A02 | Must / proposal | category/ward/settings 变更有版本、原因、审计；已有借用/history 不因 reference data 停用而损坏 | T-A02：配置并发冲突；停用类别不毁历史 |
| A03 | Must / proposal | Dashboard 指标定义明确、含数据更新时间；5 秒 polling 初值，失败显示 stale/error，不以 0 代替失败 | T-A03：golden dataset；数据变更 10 秒内可见；错误状态与跨日 MYT 边界 |
| A04 | Should / prior plan + UI v4 | 报告筛选 category/ward/time，导出默认掩码；导出授权和操作记审计 | T-A04：范围/时区一致；CSV formula injection 防护；未授权导出拒绝 |
| B01 | Deferred anchor / Must local audit | 事件目录保留 ISSUED、RETURNED、OVERDUE、MARKED_LOST、DISABLED、RESTORED、CARD_REGISTERED、关键 ADMIN_CHANGED；当前只写本地不可变事件/审计，未来启用后同事务 durable outbox | T-B01：当前 eventId/本地审计原子；上链 outbox 覆盖 NOT_RUN |
| B02 | Deferred / proposal + user scope | 当前无 Sui 调用或待上链积压；未来 Sui 慢/离线不阻断柜台，eventId 去重，未知提交先对账 | T-B02：当前 disabled 零调用/队列；低 gas、429、unknown/crash/lease NOT_RUN |
| B03 | Deferred / proposal + user scope | 当前 proof 为 NOT_ENABLED，无 Verify/Retry；未来重算本地快照并核对实际链上绑定，区分匹配/待确认/失败/不匹配/RPC故障/证据清除 | T-B03：当前不伪装 MATCH；真实链篡改/正常历史/证据删除 NOT_RUN |
| D01 | Must / proposal + prior plan | PII 留在受控 MySQL；日志/链/二维码无 PII。分类配置保留期、最小权限、掩码、备份、删除/冻结规则 | T-D01：链 payload 和日志 inspection；retention dry-run、权限与恢复演练 |

## 状态转换

| 对象 / 原状态 | 操作 | 新状态 / 副作用 |
|---|---|---|
| Registration SUBMITTED | 授权核实通过 | VERIFIED；还没有借用 |
| Registration SUBMITTED | 拒绝 / 取消 | REJECTED / CANCELLED；不发卡或消息 |
| Card AVAILABLE | ISSUE | ISSUED + OPEN Assignment + ISSUED event |
| Card ISSUED | 已设截止时间到且仍 OPEN | OVERDUE + 唯一 OVERDUE event/internal alert；无期限不进入此 transition |
| Card ISSUED / OVERDUE | RETURN | AVAILABLE + CLOSED Assignment + RETURNED event |
| Card AVAILABLE / ISSUED / OVERDUE | ADMIN MARK_LOST | LOST；如有借用则 CLOSED_LOST，保留历史和未结遗失处理 |
| Card AVAILABLE | ADMIN DISABLE | DISABLED；无活动借用 |
| Card LOST / DISABLED | ADMIN RESTORE | AVAILABLE；找回/恢复条件和原因满足，写 RESTORED |

未列出的 transition 一律 409 且不产生业务副作用。已完成幂等重放是返回原结果，不是再次执行 transition。上表的遗失关闭与恢复细节是待医院确认的建议，但不能留下一张 AVAILABLE 卡同时存在活动借用。

## 非功能需求

| ID | 验收目标（建议值需在 UAT 前确认） | 测量方式 |
|---|---|---|
| Q01 | 队列 5 秒 poll，状态变更 10 秒内可见（建议目标） | 同一环境记录 commit 与 UI 出现时间 |
| Q02 | 10 并发操作客户端 + 5000 synthetic registration 下，普通 API p95 < 2 秒、首屏 < 3 秒；外部读取/链确认分开计时 | warm instance、指定 PC/网络，至少 1000 请求报告 p50/p95/error rate |
| Q03 | 工作流程无需安装 visitor app，SUS 均值 >=68，登记至发卡平均 <5 分钟 | 四类别脚本、起止定义、样本量与原始数据；医院参与人数待确认 |
| Q04 | backend 重启恢复；manual 发还不依赖 reader 在线；数据库不可用不得宣称发卡成功，UNKNOWN 保留原命令以核查 | 故障注入 + 状态核对；不承诺云 free tier SLA |
| Q05 | 多层 RBAC、CSRF、过期会话、input whitelist、加密/掩码策略、秘密隔离 | threat cases、日志和 bundle/secret scanning |
| Q06 | Must flows 有 keyboard、焦点、标签、错误汇总、非仅颜色提示和移动视口证据 | 浏览器手工与自动 accessibility 检查 |
| Q07 | 演示恢复目标建议 RPO 24h / RTO 4h；备份含数据库与必要 nonce/key 恢复流程 | 实际还原计时；医院批准前不作为 production 保证 |
| Q08 | 已选事件的 100% 在受控测试恢复与排空后得到 proof；计时窗口、样本与网络写入证据 | outbox 与 catalogue 分母核对，报告未确认项；不以零事件获得 100% |

Q08 随 M11 deferred；当前不报告链覆盖率。2026-10-26 目标流程是动态 QR → 新字段/假 MRN 回填 → 人工审核 → 手动选卡/确认交付 → 单/多 pass 借还；新流程尚未实现/测试。旧 synthetic 扫描 E2E 仅保留历史范围。真实 patient API、消息送达与链核验保持 NOT_RUN。

## 动态 QR 验收细则

参数是当前工程默认值，可由 coordinator 随受控测试调整：每 30 秒换码、challenge 45 秒过期（最多 15 秒扫描交界重叠）、表单 grant 20 分钟绝对有效期。服务器 UTC 为最终时间依据；二维码本身的图案和 token 必须改变，仅改变固定 URL 的目标页面不满足动态要求。

当前可用 QR 仅为动态登记入口；登记完成页显示文字 public reference，不交付静态 receipt/pass QR。未来若增加回执/Pass QR，同样必须动态、实时校验，但先定义用途、持有人权限和过期/撤销规则，不复用登记 entry token 来查询 PII 或发卡。

U02 用户已确认单份表单规则：同一匿名会话已有未提交表单时再扫不同柜台/类别，先明确提示是否重新开始；取消保留原表单，确认且新 entry 有效才原子撤销旧 grant 并建立新 grant。旧页不能误用新 grant 提交，替换失败不能先使原 grant 无效。对应 T-R06-H：取消/确认/新码过期/并发替换/旧标签页提交与一次消费验证。

U03 用户已确认 synthetic Penjaga 审批：mock 结果本身不能作为已核实，必须职员模拟人工核实并记录来源/actor/time/依据后才允许批准。T-R04 增加 mock success 仍不允许批准、模拟 manual 完整 evidence 后可走 demo 批准；真实 MRN/患者核验仍 NOT_RUN。

- T-R06-A：同一显示会话连续轮换 payload 不同；`now >= expires_at` 拒绝 exchange；不存在无限续期的旧截图。
- T-R06-B：多人可在有效窗口扫同一码，各获自己的 grant；共享 QR 不因第一位扫码而耗尽，grant 最多成功登记一次。
- T-R06-C：QR 更新/自然过期不使既有 grant 失效；重复点击/网络重试按同 key/body 返回原 reference；另一 body/key 不可再次消费。
- T-R06-D：直接打开 `/register`、跳过 exchange、跨 cookie/session、篡改 counter/category 或停用显示会话均不能登记；注销/撤销显示会话同时撤销其未提交 grant。
- T-R06-E：断网、服务器失联、浏览器休眠/恢复时不把过期码作为当前有效码；清楚显示刷新失败、过期和重新扫码动作。恢复先向服务端同步时间和新码。
- T-R06-F：生产 HTTPS 真机扫描（手机系统相机/二维码 reader 即可，无 visitor app），公共入口无相机权限要求；QR 不含 PII，entry/grant 不写日志/URL analytics，证据遮挡 token。
- T-R06-G：旧码在有效期内被转发仍可能被扫描；轮换不能证明人在柜台，也不能取代职员核实或 NFC。静态打印二维码不是当前登记替代入口。

## 测试分层与完成条件

1. 单元：四类别规则、状态矩阵、截止时间、commitment 固定样例、报表算式。
2. MySQL 集成：Flyway clean/upgrade、generated active unique 约束、相同锁顺序、业务/outbox/notification 原子写入、lease fencing。
3. Device 集成：mock deterministic reader + 真机 enrollment/issue/return；错误 profile、拔插、取消、重放、旧 lease 拒绝。
4. Provider resilience：MRN timeout/manual、WhatsApp ambiguous acceptance、重复/乱序 callback；Sui ambiguous commit/reconciliation、duplicate eventId、Testnet smoke。
5. E2E：四类 QR -> review -> scan -> handover -> issue -> return；overdue/lost/admin/export/opt-out 与角色限制。
6. UAT：counter 与 administrator 脚本、SUS、任务时间、数据核对、篡改演示、恢复与培训。

P0=0；P1=0，或有医院/导师记录的例外；每个 Must requirement 有 test result、实现版本和 evidence。未执行的测试不得标 PASS；mock 与真实接口分开留证。需求变更沿用 Kanban WIP 2，与 [01](01_DEVELOPMENT_PLAN.md) 的阶段门对齐，但不根据计划日期推断完成。

Traceability 字段：`Requirement ID | 来源路径/页 | 任务链接 | acceptance | commit/artifact | test | NOT_RUN/PASS/FAIL | evidence | reviewer`。

## 未决需求

2026-10-26 四类新字段、manual pass、mock MRN、条款同意与时间口径已按用户说明明确；Penjaga 证件类型/格式及是否改变单卡规则仍见 [15](15_MANUAL_PASS_AND_FORM_CHANGE.md)。硬件/profile 不再是新发还流程依赖。真实 IC/MRN 采集目的与保留、遗失恢复政策、live MRN 契约、WhatsApp provider/template、session timeout、性能/UAT样本与恢复值，继续登记在 [10](10_BASELINE_REVIEW.md#待确认事项)。所有演示样例使用 synthetic data。
