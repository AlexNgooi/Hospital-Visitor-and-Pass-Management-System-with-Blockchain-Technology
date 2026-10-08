---
type: requirements
revision: v3
updated: 2026-10-08
status: proposed-implementation
---
# HSAAS 需求与验收基线 v3

范围保留 proposal 的长期目标，并按 2026-10-08 用户决定分为当前版与 deferred 集成。本文是当前实施需求的唯一主表；未表示医院已签署或软件已通过测试。依据与未决项见 [10](10_BASELINE_REVIEW.md)，模块分配见 [12](12_THREE_MONTH_CHAT_PLAN.md)。

## 范围和术语

- 仅处理必须在柜台登记并领取实体卡的访客：Executive Visitor、Penjaga、Vendor、Contractor。普通探访、定位、门禁开启、完整病历、native app、Sui Mainnet 不在范围内。
- Registration 是申请；数据库批准状态统一为 VERIFIED，UI 的 Approved 映射到 VERIFIED。批准本身没有 Pass ID/card assignment/due_at。
- Card 是可重复使用的实体库存；Assignment 是一次借用，其 public pass_reference 在 UI 显示为 Pass ID。RETURNED 是事件，库存归还后变 AVAILABLE。
- Visitor 不建账号；COUNTER_STAFF 操作柜台；ADMIN 管用户、配置、库存、审计、报告。系统服务和设备拥有独立凭据，不能冒充职员。

## 功能需求与验收矩阵

Must 是当前版必须交付；Conditional/Deferred 是外部条件满足并由 coordinator 启动后才验收的路径。下列 test IDs 是计划，业务结果仍 NOT_RUN。C01/C02/P01/P03 当前只验收 synthetic simulation 的对应规则，真实 hardware 条件保持 NOT_RUN；链/消息验收不进入当前 release 的 Must 分母。

| ID | 优先级 / 来源 | 要求与可验证条件 | 主要验收案例 |
|---|---|---|---|
| R01 | Must / proposal + user 2026-10-08 | 柜台 QR 是服务端轮换的限时登记入口，包含 HTTPS URL + 非敏感短期 entry token；手机无需账号进入四类表单，禁止静态 URL QR 替代 | T-R01：真机扫码、连续两轮 payload 改变、解码无 PII；静态/无 grant 绕过失败 |
| R02 | Must / proposal | 服务端按 category 的版本化白名单检查字段、长度和必填；公共 reference 随机且不授予 PII 读取权限 | T-R02：四类 valid/boundary/invalid；越权字段拒绝；重复提交受控 |
| R03 | Must / guide + user scope | 隐私告知与将来的 WhatsApp 同意分开；disabled 时不采集发送 opt-in、界面显示未启用；将来开启后默认未勾选且拒绝仍可登记发卡 | T-R03：disabled 不生成发送同意/任务，注入 opt-in 被拒；未来 opt-out/consent version 独立测试 |
| R04 | Must / proposal + guide | Penjaga 记录 MRN/ward 核实状态；超时保持表单/登记，转人工；人工核实记录 actor、时间、依据，不保存病历 | T-R04：timeout、mock、manual、未核实禁止批准 |
| R05 | Conditional / hospital | live MRN 只在批准 endpoint、auth、字段契约、test account 到位后启用；不得宣称 mock 是医院验证 | T-R05：真实获批 sandbox 和错误契约 |
| R06 | Must / user 2026-10-08 | QR challenge 服务端过期/撤销/范围校验；成功扫描换取绑定匿名会话的限时单次提交 grant，QR 换码不影响已有效进入的表单；公共二维码允许多访客扫描 | T-R06：过期边界、撤销、篡改 counter/category、跨会话、grant 过期/重复提交/并发、扫码后换码继续填、断网/休眠恢复 |
| S01 | Must / proposal + UI v4 | 职员登录后查看授权队列；批准/拒绝写审计，拒绝理由必填；批准不自动发卡或发消息 | T-S01：401/403、审核冲突、拒绝、批准无借用 |
| C01 | Must simulation / Conditional hardware | 当前 synthetic 库存只由 mock adapter 提供固定测试 profile，标 SIMULATED；未来 enrollment 必须真实扫描 UID 和批准 profile，未知 profile/重复 UID 拒绝 | T-C01：simulation 重复/未知 profile；真实 sample 卡另留证，当前 NOT_RUN |
| C02 | Must / guide | 每台设备一个活动 ScanJob；结果绑定 actor/device/counter/purpose/target/nonce/expiry，业务事务消费一次 | T-C02：错误设备、跨柜台、重放、过期、取消后上传全部拒绝 |
| P01 | Must simulation / Conditional hardware | 发卡必须 VERIFIED + AVAILABLE + 类别兼容 + 有效扫描 + 职员交付确认；当前 synthetic 借用/截止时间/ISSUED/本地审计原子完成，未来 live 追加合格异步任务 | T-P01：模拟交付/回滚；真实发卡与交付另留证，当前 NOT_RUN |
| P02 | Must / guide | 一张卡和一个登记各最多一条活动借用；相同幂等命令重放同一结果；同 key 不同 body 为 409 | T-P02：两个职员同时发同卡，恰好一个成功；重复点击不重复任务 |
| P03 | Must simulation / Conditional hardware | 归还需 RETURN 扫描、交付/收到确认、借用为 ISSUED/OVERDUE；当前模拟关闭借用/库存 AVAILABLE/RETURNED/本地审计原子完成，live 必须实体收到且链启用才写 outbox | T-P03：模拟正常/逾期归还与重放；LOST 拒绝；真实归还当前 NOT_RUN |
| P04 | Must / proposal | UTC now >= due_at 时仍活动且 ISSUED 才转 OVERDUE；每个借用只一条逾期事件/告警；配置修改不变既有 due_at | T-P04：截止边界、scheduler replay、归还竞争 |
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
| Card ISSUED | 截止时间到且仍 OPEN | OVERDUE + 唯一 OVERDUE event/internal alert |
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
| Q04 | backend/worker 重启恢复，离线 reader 阻止发卡且保留登记；数据库不可用不得宣称发卡成功 | 故障注入 + 状态核对；不承诺云 free tier SLA |
| Q05 | 多层 RBAC、CSRF、过期会话、input whitelist、加密/掩码策略、秘密隔离 | threat cases、日志和 bundle/secret scanning |
| Q06 | Must flows 有 keyboard、焦点、标签、错误汇总、非仅颜色提示和移动视口证据 | 浏览器手工与自动 accessibility 检查 |
| Q07 | 演示恢复目标建议 RPO 24h / RTO 4h；备份含数据库与必要 nonce/key 恢复流程 | 实际还原计时；医院批准前不作为 production 保证 |
| Q08 | 已选事件的 100% 在受控测试恢复与排空后得到 proof；计时窗口、样本与网络写入证据 | outbox 与 catalogue 分母核对，报告未确认项；不以零事件获得 100% |

Q08 随 M11 deferred；当前不报告链覆盖率。当前 E2E 是动态 QR → 登记 → 审核 → synthetic 扫描/模拟交付 → 模拟借用/归还；真实交付、patient API、消息送达与链核验分开保持 NOT_RUN。

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

实际四类字段、IC/MRN 采集目的与保留、硬件/profile/category 来源、遗失恢复规则、live MRN 契约、WhatsApp approved provider/template、session timeout、性能/UAT样本与恢复值，统一登记在 [10](10_BASELINE_REVIEW.md#待确认事项)。所有配置样例使用 synthetic data。
