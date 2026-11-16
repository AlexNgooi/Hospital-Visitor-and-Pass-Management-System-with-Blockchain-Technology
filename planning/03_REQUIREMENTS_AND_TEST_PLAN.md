# 当前需求与验收

更新：2026-11-16。Overview、默认显示 QR、队列 modal、审核/发卡合并、归还历史/CSV、No pass、staff 面包屑和库存命名按用户确认执行；`codex/visitor-review-issue-dashboard` 至 `1866a6c` 纳入用户明确要求的本机/GitHub main 发布。四类表单、manual pass、MRN mock、条款/日期规则按用户2026-10-26/27确认执行；本机运行和多页面/Copy link 按2026-11-10要求。R01–R03 源码已合并 main；当前手测状态见 [10](10_BASELINE_REVIEW.md)。

业务字段来源：用户说明及 `CamScanner 26-10-2026 20.27.pdf` 第1页（BORANG SERAH DAN PEMULANGAN KAD AKSES PENJAGA，22/08/2025）。PDF 的罚款、收费、固定柜台及转 ward 重办背景不自动成为新增功能。演示只用合成资料，真实 IC/MRN 采集与保留待医院批准。

## 当前使用体验

- Pass returns 不展示 Counter 标签或 Registration ID；主列表仅列未归还 Issued/Overdue pass，字段为 Visitor name、Category、Pass ID、Destination、Status 和 Return pass。医院当前仅一个柜台的使用体验不取消服务端既有权限校验。
- Return pass 打开基本资料确认 modal，实际收到该卡后点击 Confirm return；成功后该行移入 history，toast 约 5 秒后以 250ms 渐隐。同访客的其他 pass 不受影响，UNKNOWN 保留原命令且阻止关闭。
- View pass history 才读取已完成发放/实际归还记录。时间筛选用下拉列表 This day / This month / This year / Customize；仅 Customize 展示 Start date、End date、Apply。按归还日期的 MYT 整天范围筛选，CSV 导出所有匹配记录而非当前已加载行。主列表及 history 均以内部滚动自动加载，不显示 Previous/Next。

- Staff 队列姓名正常显示前 12 个 Unicode 字符，超出用省略号；证件/电话等仍按原规则脱敏。短姓名不加星号，完整资料仍由受审计 modal 展示。
- 同一个当前有效 QR 支持不同访客/独立浏览器会话同时进入，各自获得单次提交 grant；不需要刷新柜台 QR。相同浏览器仅保留一份未提交表单；提交确认后重新扫码当前 QR，可继续下一份登记，不需重载柜台页面。

- Staff Overview 直接展示动态 QR 与 registration queue；QR 开页自动准备，不再点击 Display。Registration review 只展示队列，打开记录后在 modal 自动读取完整资料（保留服务端权限/version/审计），不再 Reveal 或核实 checklist。QR 与审核仍可通过新标签入口独立打开，继承当前授权柜台和登录。
- 导航默认隐藏，菜单打开，Escape/遮罩/关闭按钮收起，键盘焦点可返回。
- Copy link 复制当前有效动态登记地址；与扫码共用过期/撤销/grant 规则，无永久入口。剪贴板被限制时允许手动复制当前只读链接。
- 本机 loopback 链接仅适合同电脑；手机访问需可达 HTTPS 地址和实际真机验收。

## 用户已确认的业务决定

| 决定 | 新需求 |
|---|---|
| Reader | 不再需要读卡器读取 pass；counter staff 在系统手动选择库存 pass 并确认 issue，发还流程不依赖真实或模拟扫描 |
| 职员核实 | Counter staff 在同一 modal 人工核对完整资料、选择 pass/期限或 No pass；实体 pass 用 Approve & issue pass，无卡用 Approve without pass；批准与对应记录同事务，MRN lookup 不替代职员核实 |
| Admin | 权限基本不变，继续管理账号、配置、库存、审计和报告；不因此自动取得 counter staff 操作权 |
| Pass naming | 系统固定前缀 Executive `exec-`、Penjaga `penj-`、Vendor `vend-`、Contractor `cont-`；操作员自填 1–9999 整数，去除前置零，完整 code 全局唯一。归还不释放编号，遗失/停用不复用；No pass 无编号。现有库存按创建时间/ID、各类别从 1 一次重排，以后新增不要求连续或自动编号 |
| 多张 pass | Vendor / Contractor 同一登记可借多张 pass，支持去多个 location；Executive 同一登记最多一张活动 pass |
| 归还期限 | 可选择设定归还日期/时间，或不设期限；不设期限仍需实际归还并保留记录 |
| 进出时间 | 用户明确选择 **发 pass 时间=进；还 pass 时间=出**，不新增独立门禁或 Check-in / Check-out 事件 |
| MRN | Penjaga 手工输入 MRN，系统 lookup/verify 后自动显示患者姓名及 ward/bed；医院尚无 API 文档，先设计假的 API 和完全合成的数据 |
| 条款 | 用户明确选择 **勾选同意并记录时间**，不需要电子签名/手写签名画板 |

2026-10-27 用户已确认 Penjaga 每份登记最多一张活动 pass；Vendor / Contractor 才适用多张例外。

## 表单字段与填写责任

| 类别 | Visitor 手工填写 | 系统 lookup 后显示 | 系统自动记录 |
|---|---|---|---|
| Penjaga | Nama、No. Telefon、证件号码、Alamat Terkini、No. MRN；勾选条款同意 | Nama Pesakit、Nama Wad / Katil | 条款版本/同意时间、登记时间、MRN 结果来源和时间 |
| Executive Visitor | Nama、证件类型 IC 或 Lesen（二选一）及对应号码、手机号、Wad、Nama Pesakit | 无需强加 Penjaga 的 MRN 流程 | 登记时间 |
| Vendor | Nama、IC、手机号、Company、Location（支持多个目的地） | 无 | 登记时间 |
| Contractor | Nama、IC、手机号、Company、Location（支持多个目的地） | 无 | 登记时间 |

Penjaga 的纸本证件栏马来文为 **No. Kad Pengenalan**，英文为 **Passport Num.**，两种标签不完全一致。2026-10-27 用户已裁决新表单 **只接受 IC**，不提供 Passport/Lesen；Executive 的 IC/Lesen 选项独立保留。具体字段校验在R01契约中记录。

纸本 A 区的住址是本次 Penjaga 新增输入；B 区患者姓名及 ward/bed 改由 MRN lookup 回填，访客不能随意修改 lookup 结果。纸本没有 relationship 栏。旧 synthetic 表单中的 relationship、Executive organisation/contactPerson/visitPurpose、Vendor/Contractor contactPerson/deliveryPurpose/workPurpose 不再作为这版表单额外必填；历史记录保留原 schema 和原字段，不能抹除旧资料。

纸本的收卡确认、security officer 姓名/签核/日期、收据引用、security section 备注属于职员办理区，不放进 visitor 注册表单。新系统由已登录 staff 的 actor、操作时间与归还确认代替手写办理记录。罚款/收据/收费功能未纳入本次范围。条款同意和隐私告知分别保留版本及时间，不把同意条款当成 WhatsApp opt-in。

## 新办理流程设计

1. Visitor 经现有动态 QR/grant 进入所属类别表单。
2. Penjaga 输入 MRN 后触发 lookup；显示“查询中 / 找到 / 未找到 / 暂时不可用”，成功自动回填最少患者姓名和 ward/bed。改变 MRN 时立即清除旧患者显示和旧验证凭据；晚到响应不得覆盖较新的 MRN 结果。
3. Visitor 填完本类别字段并提交；Penjaga 勾选访问卡条款，服务器记录版本与时间。登记进入待审核状态。
4. Counter staff 从 Overview 或 Registration review 队列打开 modal，直接读取并人工核对资料。拒绝仍需理由；不显示核实 checklist，假的 API 命中不自动批准。
5. 在同一 modal 选择 AVAILABLE、类别/地点兼容且在当前权限范围内的 pass。Vendor / Contractor 可多卡、多地点；Executive/Penjaga 同登记最多一张活动 pass。每张可选无期限或具体 MYT 日期时间。
6. 比对资料并实际交付后，点击 Approve & issue pass 明确确认核实与交付；一次命令在同一事务写入 VERIFIED、独立 assignment/Pass ID/issued_at、库存、审计和幂等结果。任一卡冲突连同审批整体回滚。已 VERIFIED 的旧登记仍可在同一 modal 选卡 Issue pass；旧独立 verify/issue API 保留兼容。
7. 归还时 staff 在 Pass returns 未归还列表点选实际收到的那张 pass 的 Return pass，经 modal 核对访客基本资料后 Confirm return。只关闭被选 assignment，其余保持借出。每张记录 returned_at、returned_by 和本地审计；不伪造 RETURN scan。完成记录从主列表移至需主动打开的 history。
8. 对有期限且仍活动的 pass，`now >= due_at` 才成为逾期；无期限显示“未设归还期限”，不自动逾期，仍能归还、标记遗失和查看借出时长。

“整批原子 issue、逐 pass 期限与 location、支持部分归还”已落实到 R01–R03 源码，仍需用户业务验收。多张数量上限没有用户指定，不任意新增固定业务上限；实施时仍需有限请求大小和库存约束。

## 日期、时间和报告口径

- 每个 assignment 显示完整发放日期/时间、实际归还日期/时间、经办职员和地点。UTC 存储、ISO8601 API、MYT（Asia/Kuala_Lumpur）展示沿用原契约。
- 用户选择的“进/出”是发还 pass 的记录口径，不宣称检测到医院真实门禁进出。多 pass 每张独立记进出；如需登记级摘要，可显示最早 issued_at、尚未归还数量及全部正常归还后的最后 returned_at。
- `due_at` 是预计期限，`returned_at` 才是实际“出”时间；无期限不能用占位日期、无限远日期或 24 小时默认值伪装。
- 未归还显示“未归还”，returned_at 保持 null；遗失关闭显示遗失时间/状态，不能写成正常归还时间。
- 报表分别统计登记数、发放 pass 数、未归还 pass 数、无期限借出及逾期数；Vendor 一份登记发三张不能被计为三位 visitor。借出历史和导出保留同样的日期、时区和状态口径。

## 假 MRN API 设计边界

继续使用 HospitalVerificationPort 的服务端 adapter 边界；假 API 只返回明确标示 **MOCK / SYNTHETIC** 的虚构 MRN、patient display name、ward 和可用 bed 信息，不读取真实医院系统或病历。界面明确显示演示来源。正式 MRN 的格式、授权、响应及测试环境继续待医院提供，不能因假 API 工作就宣称 live integration 完成。

公共 lookup 受当前匿名会话、有效 QR grant/formContext、CSRF 和限流约束，不提供不受保护的全患者清单。成功结果通过服务器凭据绑定 MRN、患者最少字段、会话/上下文、adapter/schema 版本和有效期；提交不信任浏览器自行传入的患者姓名/ward。患者返回字段必须在隐私白名单内，默认不进入日志、二维码、审计原文或一般报表。

Mock 未找到/超时/不可用时保留 visitor 已填内容，显示原因并允许 staff 按既有人工核实路径处理；不捏造患者资料、不自动批准。保留原 DEMO 记录语义，通过新 schema 承载这次字段；不把旧 TEST_ID/DEMO-only 校验当成新 IC/Lesen 设计已经实现。


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
| S01 | Must / proposal + UI v4 | 职员登录后查看授权队列；批准/拒绝写审计，拒绝理由必填；合并按钮批准并发卡同事务；拒绝不发卡，均不发消息；旧 verify API 仍只批准 | T-S01：401/403、审核冲突、拒绝、批准无借用 |
| C01 | Must / user 2026-10-26 | 库存按可辨识 pass code、类别/地点和状态管理，staff 手动选择 AVAILABLE pass；新办理流程不要求 UID/profile/reader 扫描，旧库存和扫描历史保留 | T-C01：无 reader 仍可维护/选库存，重复 pass code 和无效库存拒绝 |
| C02 | Superseded / user 2026-10-26 | reader ScanJob 不再是发还前置；旧 job/result 仅保留历史，不为 manual 操作伪造扫描证据；staff 权限、counter scope、版本和幂等仍须校验 | T-C02：无设备/scan result 可办理；越权/跨柜台/重复命令仍安全拒绝 |
| P01 | Must / user 2026-10-26 | VERIFIED + AVAILABLE + 类别/地点兼容 + staff 手动选卡和确认实体交付；每张独立 assignment/Pass ID/发放时间/可选期限，业务与本地审计原子完成 | T-P01：手动发卡、库存冲突/回滚、来源/actor/time |
| P01-N | Must / user 2026-11-16 | 发卡下拉提供互斥 No pass：审批和明确无卡决定原子保存；已批准登记也能记录。保留登记关联、经办人/时间/审计，不创建实体 pass/借用/归还期限，不参与 Pass returns 或归还 history；已有活动 pass 或重复决定拒绝，原 key/body 可重放；后续按原规则仍可实际发卡 | T-P01-N：四类别 No pass、无库存、取消切换、审批回滚、重复/UNKNOWN、活动 pass 拒绝、记录可见、归还列表排除（NOT_RUN） |
| P02 | Must / user 2026-10-26 | 每张库存卡最多一条活动借用；Vendor/Contractor 同登记可多张/多地点，Executive 最多一张活动 pass；Penjaga 每份登记最多一张活动 pass；相同 key/body 重放原结果，不同 body 为409 | T-P02：多卡/多地点、Executive 第二张拒绝、并发同卡仅一赢家、幂等重放 |
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

Q08 随 M11 deferred；当前不报告链覆盖率。2026-10-26 目标流程是动态 QR → 新字段/假 MRN 回填 → 人工审核 → 手动选卡/确认交付 → 单/多 pass 借还；R01–R03 源码已实现，当前业务手测未完成。旧 synthetic 扫描 E2E 仅保留历史范围。真实 patient API、消息送达与链核验保持 NOT_RUN。


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
- T-R06-G：旧码在有效期内被转发仍可能被扫描；轮换不能证明人在柜台，也不能取代职员核实。静态打印二维码不是当前登记替代入口。


## 验收与完成条件

业务手测执行 [R01–R03 清单](../Implementation/docs/runbooks/MANUAL_R01_R03.md)，环境与并行页面按 [本机运行指南](../Implementation/docs/runbooks/MANUAL_NATIVE.md)。本机 SQL 集成测试使用独立随机测试库和受限账号，需显式 opt-in；不连接演示或业务库。

检查层次：纯单元/组件 → 隔离本机 MySQL 事务/迁移/并发 → 四类真实应用操作 → 故障/恢复 → 获批外部接口/Testnet。现有手动流程不再以模拟/真实扫描作为 E2E 前置。

每项验收记录 `Requirement ID | acceptance | source/commit | NOT_RUN/PASS/FAIL | evidence | reviewer`。未执行不能标 PASS；历史 PASS 只证明当时版本和环境。当前 UI/本机切换未执行浏览器、迁移、业务或恢复验收；通知和真实链交易仍 deferred。未决事项见 [10](10_BASELINE_REVIEW.md)。
