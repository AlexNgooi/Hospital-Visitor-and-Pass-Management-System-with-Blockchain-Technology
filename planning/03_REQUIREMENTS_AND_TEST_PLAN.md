---
type: requirements
revision: v3
updated: 2026-09-30
status: proposed-implementation
---
# HSAAS 需求与验收基线 v3

范围保留 proposal 的四个目标与五个业务模块，并吸收后续 NFC 和 UI v4 一条 WhatsApp 要求。本文是当前实施需求的唯一主表；未表示医院已签署或软件已通过测试。依据与未决项见 [10](10_BASELINE_REVIEW.md)。

## 范围和术语

- 仅处理必须在柜台登记并领取实体卡的访客：Executive Visitor、Penjaga、Vendor、Contractor。普通探访、定位、门禁开启、完整病历、native app、Sui Mainnet 不在范围内。
- Registration 是申请；数据库批准状态统一为 VERIFIED，UI 的 Approved 映射到 VERIFIED。批准本身没有 Pass ID/card assignment/due_at。
- Card 是可重复使用的实体库存；Assignment 是一次借用，其 public pass_reference 在 UI 显示为 Pass ID。RETURNED 是事件，库存归还后变 AVAILABLE。
- Visitor 不建账号；COUNTER_STAFF 操作柜台；ADMIN 管用户、配置、库存、审计、报告。系统服务和设备拥有独立凭据，不能冒充职员。

## 功能需求与验收矩阵

优先级 Must 是当前计划内必须交付；Conditional 是外部接口批准后才启用的路径。下列 test IDs 是验收计划，当前结果均为 NOT_RUN。

| ID | 优先级 / 来源 | 要求与可验证条件 | 主要验收案例 |
|---|---|---|---|
| R01 | Must / proposal p14-17 | QR 只编码公共登记 URL 和允许的非敏感 counter 参数；手机无需账号能进入四类表单 | T-R01：真机扫描四类入口；解码 QR 不含 PII |
| R02 | Must / proposal | 服务端按 category 的版本化白名单检查字段、长度和必填；公共 reference 随机且不授予 PII 读取权限 | T-R02：四类 valid/boundary/invalid；越权字段拒绝；重复提交受控 |
| R03 | Must / guide + UI v4 | 隐私告知与可选 WhatsApp 同意分开；消息同意默认未勾选，拒绝同意仍可登记发卡 | T-R03：opt-out 成功登记；篡改 consent/version 请求拒绝 |
| R04 | Must / proposal + guide | Penjaga 记录 MRN/ward 核实状态；超时保持表单/登记，转人工；人工核实记录 actor、时间、依据，不保存病历 | T-R04：timeout、mock、manual、未核实禁止批准 |
| R05 | Conditional / hospital | live MRN 只在批准 endpoint、auth、字段契约、test account 到位后启用；不得宣称 mock 是医院验证 | T-R05：真实获批 sandbox 和错误契约 |
| S01 | Must / proposal + UI v4 | 职员登录后查看授权队列；批准/拒绝写审计，拒绝理由必填；批准不自动发卡或发消息 | T-S01：401/403、审核冲突、拒绝、批准无借用 |
| C01 | Must / NFC revision | 管理员 enrollment 由扫描取得 UID 和经过批准的 profile 类别；UID 唯一、未知 profile/重复 UID 不入库 | T-C01：实际卡/profile、重复 UID；未批准手填路径禁用 |
| C02 | Must / guide | 每台设备一个活动 ScanJob；结果绑定 actor/device/counter/purpose/target/nonce/expiry，业务事务消费一次 | T-C02：错误设备、跨柜台、重放、过期、取消后上传全部拒绝 |
| P01 | Must / proposal + UI v4 | 发卡必须 VERIFIED + AVAILABLE + 类别兼容 + 有效扫描 + 职员交付确认；创建借用/截止时间/ISSUED/审计/任务原子完成 | T-P01：有效发卡；断电/回滚无部分写入 |
| P02 | Must / guide | 一张卡和一个登记各最多一条活动借用；相同幂等命令重放同一结果；同 key 不同 body 为 409 | T-P02：两个职员同时发同卡，恰好一个成功；重复点击不重复任务 |
| P03 | Must / proposal + UI v4 | 归还需 RETURN 扫描、实体卡收到确认、活动借用为 ISSUED/OVERDUE；关闭借用、库存 AVAILABLE、写 RETURNED 与 outbox 原子完成 | T-P03：正常/逾期归还；重放归还无新事件；LOST 禁止普通归还 |
| P04 | Must / proposal | UTC now >= due_at 时仍活动且 ISSUED 才转 OVERDUE；每个借用只一条逾期事件/告警；配置修改不变既有 due_at | T-P04：截止边界、scheduler replay、归还竞争 |
| P05 | Must / UI v4 + proposed closure rule | ADMIN 标记 LOST/DISABLED 必填理由；Issued/Overdue 标 Lost 同时结束活动借用并保留 unresolved lost case；找回后经核实才 Restore | T-P05：遗失不可借；直接归还拒绝；恢复规则/原因有审计。恢复细则待医院确认 |
| N01 | Must / UI v4 2026-09-24 | VERIFIED + ISSUED + opt-in 且交付确认后，每 assignment 一条 COMBINED_PASS_DETAILS；含问候、姓名/类别/reference、Pass ID、card code、地点、MYT 截止时间/归还柜台；不含 IC、MRN、电话字段 | T-N01：批准无消息、拒绝无消息、未同意无消息、成功发卡只有一任务；模板数据检查 |
| N02 | Must / UI v4 | 只显示当前任务状态；无独立批准、拒绝、预提醒、逾期或归还消息；UNKNOWN/SENT/DELIVERED 无重发按钮，UNKNOWN 先核查 | T-N02：provider accepted ≠ delivered；发送超时不盲目重发；回调签名/重复/乱序 |
| N03 | Must / proposal + UI v4 | 逾期通知是内部 alert；授权职员可 reveal 联系方式并记录人工跟进，均有审计；不触发 WhatsApp | T-N03：无 opt-in 仍出现内部告警；越权 reveal 拒绝 |
| A01 | Must / proposal | ADMIN 维护账号与角色，停用/降级撤销会话；最后一个 active admin 被保护 | T-A01：并发停用两个管理员不能导致零管理员；职员 API 403 |
| A02 | Must / proposal | category/ward/settings 变更有版本、原因、审计；已有借用/history 不因 reference data 停用而损坏 | T-A02：配置并发冲突；停用类别不毁历史 |
| A03 | Must / proposal | Dashboard 指标定义明确、含数据更新时间；5 秒 polling 初值，失败显示 stale/error，不以 0 代替失败 | T-A03：golden dataset；数据变更 10 秒内可见；错误状态与跨日 MYT 边界 |
| A04 | Should / prior plan + UI v4 | 报告筛选 category/ward/time，导出默认掩码；导出授权和操作记审计 | T-A04：范围/时区一致；CSV formula injection 防护；未授权导出拒绝 |
| B01 | Must / proposal p15-17 | 明确事件目录：ISSUED、RETURNED、OVERDUE、MARKED_LOST、DISABLED、RESTORED、CARD_REGISTERED、指定关键 ADMIN_CHANGED 均 durable outbox | T-B01：event catalogue 所有案例都有 eventId，business commit 与 outbox 同事务 |
| B02 | Must / proposal + guide | Sui 慢/离线不阻断柜台；eventId 链上去重，未知提交先对账；失败可见而非伪装 Confirmed | T-B02：低 gas、429、断网、链成功本地写回前崩溃、租约过期 |
| B03 | Must / proposal | 本地承诺快照重算，再核对实际链上 network/package/registry/eventId/hash/digest；匹配、待确认、失败、不匹配、RPC不可用、证据已清除区别显示 | T-B03：篡改已承诺字段 -> MISMATCH；正常后续事件不误报；删除本地快照 -> UNAVAILABLE |
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
