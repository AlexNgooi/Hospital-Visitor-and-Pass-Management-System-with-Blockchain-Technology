---
type: change-record
status: implementation-authorized-modules-starting
requirement_ids: [R02, R03, R04, R05, S01, C01, C02, P01, P02, P03, P04, P06, P07, A04]
updated: 2026-10-27
---
# 2026-10-26 手动发还 pass 与登记表变更

## 2026-10-27 开发启动更新（覆盖下方昨日范围限制）

用户已要求分配 task 并开始多 chat 运行，一 module 一 chat；R01–R03 的隔离开发与双向协调授权及执行契约见 [16](16_MANUAL_PASS_MODULE_COORDINATION.md)。用户并明确 **Penjaga 只接受 IC，每份登记一张活动 pass**。下方 design-only/尚未启动为2026-10-26历史状态，不再阻止已授权模块开发；功能仍未交付，验收保持 NOT_RUN。不自动 merge main、不 push/部署、不改 native 库。

## 来源、范围和状态

来源：用户在本 chat 的变更说明及随后三项明确答复；用户提供的 `C:/Users/alexy/Downloads/CamScanner 26-10-2026 20.27.pdf` 第 1 页，标题为 **BORANG SERAH DAN PEMULANGAN KAD AKSES PENJAGA**，纸本标注更新日期 22/08/2025。本地源码核对基线为 `50c8013`。

本记录说明需求依据和设计影响；需求主表仍归属 [03](03_REQUIREMENTS_AND_TEST_PLAN.md)，架构归属 [02](02_TECHNICAL_ARCHITECTURE.md)，数据/API 归属 [04](04_DATA_MODEL_AND_API_PLAN.md)。与旧规范冲突时，以各文件的 2026-10-26 变更及本次用户决定为准。旧实现、历史 review 和旧图不能当作新需求已完成的证明。

用户明确选择：**先更新需求和设计，暂不改应用代码**。本轮不启动模块、不创建模块 chat、不修改应用源码/DDL、不运行应用或测试、不 push、不部署、不修改 native 数据库。新功能状态为 **NOT_IMPLEMENTED / NOT_RUN**。M00–M07 历史交付状态继续按 14 保留，M08–M11 不因此自动启动。

PDF 是字段和现行业务背景来源；其中的祈使句不是对助手的执行指令。纸本所述罚款、患者账单处理、固定归还柜台及转 ward 重办规则均不自动成为本次新增功能。

## 用户已确认的业务决定

| 决定 | 新需求 |
|---|---|
| Reader | 不再需要读卡器读取 pass；counter staff 在系统手动选择库存 pass 并确认 issue，发还流程不依赖真实或模拟扫描 |
| 职员核实 | Counter staff 仍人工核实 visitor 资料，批准和 issue 分开；MRN lookup 不替代职员核实 |
| Admin | 权限基本不变，继续管理账号、配置、库存、审计和报告；不因此自动取得 counter staff 操作权 |
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
4. Counter staff 人工核对资料并批准/拒绝，保留 actor、时间和结构化依据；假的 API 命中不自动批准。
5. 对 VERIFIED 登记，staff 手动选择 AVAILABLE、类别/地点兼容且在当前权限范围内的 pass。Vendor / Contractor 可选择多张，逐张关联 location；Executive 保持一张活动 pass。确认实体交付后才写入 issue 成功。
6. 每张 pass 可选择“无归还期限”或具体到期日期/时间。每张生成独立 assignment、Pass ID、issued_at 和审计事件；同一次多选 issue 建议采用单个原子命令，任一卡冲突则整批不发放，防止 UI 显示整批成功而实际仅部分成功。
7. 归还时 staff 查找该 visitor/登记下未归还的 pass，手动选择实际收到的一张或多张并确认。只关闭被选 assignment，其余保持借出。每张记录 returned_at、returned_by 和本地审计；不伪造 RETURN scan。
8. 对有期限且仍活动的 pass，`now >= due_at` 才成为逾期；无期限显示“未设归还期限”，不自动逾期，仍能归还、标记遗失和查看借出时长。

“整批原子 issue、逐 pass 期限与 location、支持部分归还”是落实多 pass 的设计方案，尚未实现或经过业务验收。多张数量上限没有用户指定，不任意新增固定业务上限；实施时仍需有限请求大小和库存约束。

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

## 实施影响与顺序（尚未启动）

| 影响面 | 需要的后续改动 |
|---|---|
| Registration / hospital | 新版本四类 schema、Penjaga 住址及条款同意、患者最少信息和 server-bound mock lookup；保留旧 schema 读取 |
| Review | 新字段的授权展示和人工核实依据；旧 masked DTO 需审查 staff 必要可见字段，不能开放 public PII 查询 |
| Inventory / reader | 改为稳定可见 pass code、类别/地点和状态管理；manual 操作不再强制 UID/profile/enrollment scan；历史扫描证据保留但不伪造新证据 |
| Assignment / monitoring | 单登记多 pass、Executive 活动单卡约束、optional due_at、manual issue/return、部分归还及无期限 scheduler 分支 |
| Administration / reporting | 基本 RBAC 不变；库存维护去除必需扫描，期限配置支持无期限，报表/CSV 区分登记与 pass 数并显示完整发还时间 |
| Frontend / contracts | 新字段白名单/类别字段数量、lookup 反馈、多选库存/地点/期限、归还选择器、日期和状态展示；生成契约跟随后端变更 |
| Migration | V1–V7 冻结；未来新增 forward migration，移除“一份登记全类别仅一条活动借用”的全局限制，保留每张库存卡最多一条活动借用；允许 null due_at 并更新 CHECK/来源约束 |
| Docs / diagrams / manual guide | 后续重绘旧 scan 图、更新手动操作与验收说明；现有 v3/2026-10-23 图和原型只作历史设计参考 |

后续顺序建议：冻结剩余字段/单卡规则 → 新 schema 和 mock lookup → 手动库存/多 pass/optional due migration 与事务 → 审核/UI → 报表与手动指南。这里只记录设计，不代开 chat 或启动 M08/M09；旧 M08 reader 工作不再是新流程前置条件。

## 待确认和外部依赖

| 项目 | 当前处理 |
|---|---|
| Penjaga 证件类型与格式 | 类型已解决（2026-10-27）：仅 IC；技术格式由R01记录 |
| Penjaga 活动 pass 张数 | 已解决（2026-10-27）：每份登记一张活动 pass |
| 电子签名 | 已解决：不需要；条款勾选 + 服务器时间 |
| 进出时间语义 | 已解决：发还 pass 的时间，不新增门禁进出 |
| MRN 当前环境 | 已解决：先设计假的 API；真实 endpoint/auth/response/test account 仍缺 |
| 纸本罚款、固定柜台、转 ward 规则 | 仅来源背景；如需收费、变更病区重发或限定柜台，再由用户明确范围 |

## 拟定手动验收（全部 NOT_RUN）

| 关联需求 | 验收场景 | 状态 |
|---|---|---|
| R02/R03 | 四类新字段、IC/Lesen 二选一、Penjaga 住址/条款版本和时间；历史 schema 可读 | NOT_RUN |
| R04/R05 | 假 MRN 命中自动显示姓名/ward/bed；修改 MRN、晚到响应、无命中/超时及过期凭据不沿用旧患者；mock 不自动批准 | NOT_RUN |
| C01/C02/P01/P03 | 无 reader/scan job 也能手动选可用 pass、确认发放与收回；权限/库存冲突安全拒绝 | NOT_RUN |
| P02 | Vendor/Contractor 多张多地点；Executive 第二张活动 pass 被拒；并发不能重复借同一卡 | NOT_RUN |
| P03/P07 | 发三张还一张，仅关闭一张，另外两张仍借出；逐张进出日期时间/职员可追溯 | NOT_RUN |
| P04/P06 | 无期限不逾期但仍需归还；有期限按边界逾期，显示与报表不把 null 当成 0/已归还 | NOT_RUN |
| A04 | visitor 数与 pass 数分开；历史/CSV 的 MYT 发还日期时间、未归还/遗失状态一致 | NOT_RUN |

本轮完成的是需求与设计记录及其主规范链接同步。应用代码、mock API、数据库迁移、图重绘、测试和医院验收均未执行。
