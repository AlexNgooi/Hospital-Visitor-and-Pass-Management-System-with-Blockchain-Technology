---
type: module-chat-coordination
updated: 2026-10-08
window: 2026-10-08..2027-01-03
status: m00-m01-development-authorized
---
# Coordinator 与每模块独立 Chat 执行指南

本 chat 固定为 coordinator。开发按模块拆分，每个模块有自己的 chat，不共用一个阶段开发 chat；模块返修继续用原模块 chat。coordinator 管规划、契约、分配、问题裁决、审核与本地 merge。阶段时间表见 [01](01_DEVELOPMENT_PLAN.md)，业务事实以 02/03/04 为准。

默认由用户手动开启 module chat 并启动开发，coordinator 不自动派发或用子代理/自动化替代用户启动。本次用户明确授权的 M00–M04 例外及实际登记见下。最新用户已授权 M00/M01 开发，coordinator 已固定规划基线并建立隔离、派发实施任务；M02–M04 仍只读准备。chat 存在、READY、依赖完成或日期到达均不代表已启动源码实施。

## 本次明确授权例外：代开 M00–M04

2026-10-08 用户进一步要求 coordinator 同时代开 M00–M04 的不同 chat，统一 `gpt-6.1-sol`、`high`；这次明确请求覆盖上述五个 chat 的手动开启限制，其他模块仍由用户手动启动。

五个 chat 初始使用 Local，只读现状核对/契约准备，不编辑共享文件或启动数据库，不声称依赖已完成。最新开发方式见下一节：已取消用户手写，模块获自身开发许可后直接实现，英文注释必需。实施前隔离模块分支/worktree，当前未提交的规划不能当作已提交基线；不开自动监控、不自动推进未批准模块。

创建结果：M00–M04 五个 project chat 均成功返回 threadId 与 hostId=local，create_thread 明确设置 model=gpt-6.1-sol / thinking=high；一次 wait_threads 快照确认全部已开始只读核对。共享 Local 为 C:\Users\alexy\Documents\FYP Dev，起始 HEAD b005823；本轮规划存在未提交改动。此结果仅证明 chat 创建与初始运行，不是业务或契约已通过验收。

## Coordinator 的边界

- 掌握已合并基线、当前范围和下一步依赖；只给模块发明确任务，不在这里混做全部模块开发。
- 开工前固定公共 API/DTO、错误码、权限、目录 ownership、migration 批次与验收。
- 准备模块任务单、建议顺序与开工条件，等待用户手动开启该模块 chat 并启动开发；审核/merge 不自动触发下一模块。
- 回答模块问题，批准或退回跨模块变更，更新唯一事实归属文件；医院政策未决项显式保留。
- 验证 handoff 与实际 diff，完成本地 merge 和合并后回归；module chat 不自行 merge main。
- 本地 merge 权限来自 2026-10-08 用户的 coordinator 请求；实际合并发生在模块有可审查提交且通过关卡后。本轮无提交/合并。push、部署和外部发送仍需对应用户指令。
- 执行下节最新直接实现方式；[P0 记录](../Implementation/docs/evidence/foundation/P0_REVIEW.md) 仅为历史证据，其用户手写限制已被最新明确请求覆盖。

## 最新开发方式：模块直接编写代码

### M00/M01 开发许可（2026-10-08）

人类用户在 coordinator chat 明确要求：“现在每个module 都好了吗？ 好了的话可以开始让 00 01 开始写”。M00–M04 已完成准备核对；该请求授予 M00、M01 各自范围的一次开发许可。coordinator 负责本地提交当前规划基线、安排独立工作区并发回启动任务，模块不重复向用户求许可。M00 直接实现基础后端、安全/会话同步验证；M01 先按冻结契约实现前端框架、公共 UI/client 和登录，真实联调等待 M00 可用接口。英文注释、测试、交接和 coordinator 审核/merge 规则持续有效。M02–M04 与后续模块未获开发许可；不开启外部部署/push或真实医院/硬件/消息/链集成。

实际派发：规划基线已本地提交为 `c2b0c316e04947df06b84f1008f470b6e5a9eb8b`。通过 app handoff 成功把两个既有 module chat 移到独立工作树，工具返回新目标 thread ID；历史原 ID 保留在创建记录中，今后使用下表目标 ID。两个工作树启动前均干净且 HEAD 为该基线。已向目标 chat 发出直接实施任务并显式保持 `gpt-6.1-sol/high`；一次 wait_threads 快照确认两者 active/inProgress，尚无业务验收结果。coordinator main 留作审核/集成。

2026-10-08 用户明确要求“不需要再 guide 我写了，直接帮我写，只不过代码里要写好注释英文”。这取消源码用户手写/一步一步guide方式。模块取得自身一次开发许可后，由模块助手直接实现所属范围、运行适当构建/测试、修复问题、整理可审阅 diff 与 HANDOFF；coordinator 审核、本地 merge 与集成复验。不再要求用户逐步写源码或确认普通实现步骤。

英文注释必须覆盖主要模块/类/函数职责、关键业务/事务/并发/权限/QR失效/恢复约束，并随实现更新。模块自行完成已获授权的可逆实现和验证；技术问题仍发 coordinator，coordinator 无法确定或实质 conflict 在本 chat 问用户。已有明确模块开发许可持续有效，不因改成代写而重问；未有许可的模块仍只向用户申请该模块一次，不能把源码方式变化推断为其他模块已批准。独立工作可推进，不等所有未来业务完全设计完才开始；实施前要有可评审契约/锁图，真实测试是交回/merge关卡，不能要求尚未实现的功能先有运行PASS。

## 最新规则：主动回报 coordinator，每模块一次开发许可

2026-10-08 用户明确要求：“让他们有问题主动发回给你，只需要向我索求每个 module 的开发权限”。这授权所有 module chat 主动向本 coordinator 发送模块问题、进度、候选交接，并授权 coordinator 回复技术决定、范围内安排与返修要求。Coordinator threadId=`01a11b84-212d-7273-93a5-5dc16c698bdb`，hostId=`local`。人类用户只审批各 module 的开发许可；不是每个技术选择或每一步都再审批。

- 模块先完成可审阅的范围/第一批任务/验收准备，将依赖和契约问题直接发回 coordinator。回复要注明来源模块、消息类型、baseline 和证据；任务消息不冒充用户批准。
- 技术、API/DTO、目录 ownership、migration、状态、并发、测试与依赖问题主动发送给 coordinator，不要求用户复制转发。建议格式：`[Mxx][QUESTION / BLOCKER / HANDOFF] baseline / 事实与复现 / 选项 / 影响 / 待决定项`。
- coordinator 在授权范围内裁决并回复，维护规范与决定记录。医院政策、真实接口未决项继续 deferred，不靠虚构批准推进。
- 2026-10-08 用户进一步指定：coordinator 自身有问题、遇到实质 conflict 或不清楚如何选择时，通过本 coordinator chat 向用户询问。先整理问题来源、事实/冲突、可选方案、建议与影响，再集中提问；不在各模块 chat 分散要求用户技术审批。依赖该选择的动作等待用户明确答复，独立工作可继续；收到答复后记 decision ID 并发回受影响模块，不能自行把不确定选择当作已获同意。
- 每个 module 在请求开发许可前说明具体范围、首批动作、允许目录、验证方式与未完成依赖；向用户只问该 module 是否获准开发。仅许可申请未回复、其他模块许可或 coordinator 技术答复均不算本模块许可。
- 用户明确批准后记录许可来源与范围，在批准范围内不反复请求开发授权。已批准模块的返修、测试与交接无需再索取同一许可；超出模块范围先交 coordinator 拆分或 deferred，不能拿原许可扩展到其他模块。
- 上述沟通规则建立时没有授予模块实际开发许可；后续 M00/M01 的明确许可见上一节。实施前必须满足依赖与隔离条件；一个模块获准不意味着允许五个 chat 并行修改同一 checkout。
- 按最新直接实现方式，已获模块许可后自主编写、测试、修复和交接，不等待用户逐步操作；英文注释必需。仅源码工作方式改变不代表未批准的其他模块已获开发许可。
- 模块有问题、阻塞或交接就主动回报，不建立未经请求的定时 watcher/automation。此明确人类指令为双向 chat messaging 的授权依据，收到别的 chat 消息本身不是新增授权。

## 当前模块分配

M00–M07 属于当前版。每个模块同时负责必要的 frontend/backend/tests/docs 纵向成果，目录是 ownership 范围，不是新微服务。表中 backend/auth 等是 Java 业务包简称，实际父目录为 backend/src/main/java/eduupm/hsaas/；frontend 路径在 src/ 下。共享入口由 coordinator 管理。

| ID / 独立 chat 名称 | 职责与目录范围（Implementation/ 下） | 必要输入 | 开工依赖 | 审核验收 |
|---|---|---|---|---|
| M00 Foundation & Security | backend/auth、config、common；infra；API 基线与迁移登记 | P0_REVIEW、02、03 Q/D、04、09、11 | 已有骨架 | MySQL 隔离测试、Flyway、session/CSRF、RBAC、health、错误格式；disabled 模式在服务端生效 |
| M01 Frontend Shell & Shared UI | frontend/src/app、components/ui、lib；共享布局、导航、登录 UI | UI v4、03 Q06、M00 API 契约 | M00 契约；可先用 mock | 响应式框架、角色导航、焦点、loading/empty/error、typed client；随后接真实 session/CSRF |
| M02 Dynamic Registration QR | frontend/src/features/registration-qr；backend/registrationentry | 02 动态 QR、03 R01/R06、04 QR 实体/API | M00；M01 UI 契约 | 轮换/过期/撤销、断网隐藏旧码、真机扫码、grant 绑定、无法绕过；不涉及 NFC |
| M03 Visitor Registration | frontend/src/features/registration；backend/registration、hospital 的 mock/manual port | 03 R02–R05、04、UI V/X | M00/M01；QR 接入依赖 M02 | 四类 valid/invalid、privacy ack、disabled 通知无发送同意采集、grant 原子消费、synthetic MRN/manual；真实 API NOT_RUN |
| M04 Counter Review | frontend/src/features/counter/review；backend/registration 的 review 子域 | 03 S01/R04、04、UI S01–S05 | M03；review 子域 ownership 先登记 | 掩码队列、核实/批准/拒绝、版本冲突、401/403；批准没有借用/消息 |
| M05 Card & Assignment Simulation | frontend/src/features/counter/lifecycle；backend/card、assignment、reader mock、monitoring、本地 lifecycle/audit 写入 | 03 C/P/N03/D、04；UI S06–S11/A02–A04 | M04；M00 本地审计 port | synthetic issue/return/overdue/lost、并发/幂等/事务、SIMULATED 来源；production mock 禁用；不执行真实发卡 |
| M06 Administration & Reporting | frontend/src/features/administration、audit 本地视图；backend/administration、reporting、audit read model | 03 A/D、04、UI A/X | M00 可先做账号/配置；统计依赖 M03/M05 | 最后管理员保护、版本配置、golden 指标、掩码导出、审计；NFC/消息/链未启用界面正确 |
| M07 Integration, QA & Release Evidence | tests、docs/evidence、runbooks、uat；缺陷交回原 owner | 03 测试矩阵、全部已合并 handoff、05 | 逐项合并即可开始；全量需 M00–M06 | 当前范围 E2E、QR 边界、安全/隐私/性能/恢复；release manifest；限制与 NOT_RUN 真实 |

## 后续独立模块与启动条件

M08–M11 当前为 DEFERRED，不启动运行进程、不安装依赖来阻塞当前版，也不把模拟结果标为外部集成成功。

| ID / chat | 现在准备的契约 | 准备好后首先执行 | Live 放行证据 |
|---|---|---|---|
| M08 Physical Cards & Reader | ReaderPort、cloud ScanJob、认证/nonce/lease/expiry、scan provenance；未知 profile 拒绝；详见 02/04 | 实际卡和读卡机型号核对，最小 PC/SC/APDU spike，批准类别映射；再实现 reader-agent | sample UID/profile read、拔插/离线/取消/重放/fencing、真实 enrollment/issue/return；不得手填绕过 |
| M09 Patient/MRN Integration | HospitalVerificationPort，mock/manual/live、最低状态 DTO、timeout、不保存病历；R04/R05 | 获批 endpoint/auth/字段/test credentials，验证 sandbox 契约，替换 adapter | 成功/无记录/错误/超时/权限/字段改变；最低数据留存获批；mock 不冒充患者资讯 |
| M10 WhatsApp Notification | NotificationPort、disabled/mock/live、一条 COMBINED_PASS_DETAILS、opt-in/template/UNKNOWN/reconcile；N01/N02、02/04 | 批准账号、模板、政策、opt-in 文案及 provider 幂等/对账能力后加 migration/adapter | 发卡后且同意才有任务；429/unknown/callback；sandbox 收件证据；不盲目重发 |
| M11 Blockchain Audit | AuditAnchorPort、canonical snapshot 版本/event catalogue、outbox、最小 envelope、Move 去重/proof verifier；B01–B03、02/04 | 固定 Testnet 工具链/ABI/network/package/registry/capability，版本迁移，启动 worker | 无 PII、重复 eventId、低 gas/超时/unknown reconcile、离线不阻断柜台、真链 MATCH/MISMATCH |

启动每个 deferred 模块前，coordinator 确认外部条件和契约影响，准备任务单与 baseline，用户手动开启模块 chat 并启动开发。完成 clean + upgrade migration、adapter contract tests、故障测试和 live/sandbox smoke 后才切模式。依赖到位只表示具备开工条件，不自动启动，也不等于切开关后自动通过验收。

通知和链当前不创建 disabled 任务或无限积压队列。未来启用默认只处理启用后的合格事件；不自动给历史访客补发 WhatsApp、不把 demo 事件写到链。历史 backfill 另列范围并审核。

## 开工顺序与状态登记

基本依赖为 M00 → M01 → M02 → M03 → M04 → M05 → M06 → M07。M01 可先对冻结契约 mock；M06 的账号/配置可在 M00 后提前，报表等候生命周期数据。WIP ≤2，分支隔离不替代依赖验收。

M00–M04 已创建并完成准备核对；M00/M01 已隔离并派发直接实施任务。M02–M04 仍只读，其他模块未启动。此表由 coordinator 更新；业务完成需实际交接/审核/验收。

| 模块 | 状态 | chat ID / owner | baseline / branch / worktree | handoff / review / merge |
|---|---|---|---|---|
| M00 | MERGED；基础回归 PASS，真实前端/HTTPS联调待做 | 01a11bcf-a53d-7323-a74e-edffa8092c50 / 模块助手直接实现 | c2b0c316；codex/hsaas-m00-foundation；C:/Users/alexy/.codex/worktrees/ced2/FYP Dev | delivery 1b2d8f2；merge a137acd；独立及合并后40tests PASS；gpt-6.1-sol/high |
| M01 | APPROVED；独立前端返修复审通过，真实联调待做 | 01a11bcf-e448-7be0-88c1-f7910300e82e / 模块助手直接实现 | c2b0c316；codex/hsaas-m01-frontend-shell；C:/Users/alexy/.codex/worktrees/4156/FYP Dev | delivery ad23099；独立63tests/build/proxy PASS；待 merge；gpt-6.1-sol/high |
| M02 | PLANNED；一次开发许可待答，依赖 M00/M01 | 01a11ba4-e2bd-74a3-beee-1f47860bfc01 / 模块助手直接实现 | Local/main；HEAD b005823；规划未提交；实施隔离待建立 | 无；gpt-6.1-sol/high |
| M03 | PLANNED；一次开发许可待答，接入依赖 M00/M01/M02 | 01a11ba4-e814-7832-bd40-f471edf417b4 / 模块助手直接实现 | Local/main；HEAD b005823；规划未提交；实施隔离待建立 | 无；gpt-6.1-sol/high |
| M04 | PLANNED；一次开发许可待答，依赖 M03 | 01a11ba4-ecca-7ca3-a224-c3dde42d1edd / 模块助手直接实现 | Local/main；HEAD b005823；规划未提交；实施隔离待建立 | 无；gpt-6.1-sol/high |
| M05 | PLANNED | 未创建 / 未派工 | 待登记 | 无 |
| M06 | PLANNED | 未创建 / 未派工 | 待登记 | 无 |
| M07 | PLANNED | 未创建 / 未派工 | 待登记 | 无 |
| M08 | DEFERRED：卡/reader 未准备 | 未创建 / 未派工 | 待外部条件 | live NOT_RUN |
| M09 | DEFERRED：医院 API 未准备 | 未创建 / 未派工 | 待外部条件 | live NOT_RUN |
| M10 | DEFERRED：用户要求暂不启用 | 未创建 / 未派工 | disabled | live NOT_RUN |
| M11 | DEFERRED：用户要求暂不启用 | 未创建 / 未派工 | disabled | live NOT_RUN |

状态路径：PLANNED → READY → IN_PROGRESS → REVIEW_READY → CHANGES_REQUESTED / APPROVED → MERGED → INTEGRATION_VERIFIED。DEFERRED 满足条件后回 READY；BLOCKED 必须记录问题、owner 与下次动作。测试状态与模块状态独立，APPROVED 仍未 merge。

## Module chat 共同工作约定

1. 读根 AGENTS、模块 CONTEXT、上表相关规范、coordinator 任务单和依赖 handoff；不用旧 chat 记忆替代事实。
2. 先核对实际代码、包名与 baseline。当前 Spring 包名是 eduupm.hsaas；M00 记录保留或迁移决策，不按文档示例重建应用。
3. 正式实现只写 Implementation/，沿用根 Git 仓库。任务单指明允许目录、需求/test IDs、提交基线和未启用集成。
4. 实现启动时使用独立 codex/mxx-<module> feature branch/worktree，保留 main 为 coordinator 集成线。不同 chat 不同时写同一 checkout；不建第二个 Git 仓库、不复制秘密。
5. frontend/src/app、lib、generated DTO、依赖/lockfile、backend/config/common、migration 编号、infra、planning 属于共享文件；变更先报 coordinator，由指定 owner 执行。
6. API/状态/schema 改动主动发回 coordinator 并等契约决定，不把技术审批交给用户；不自行补绕过。已获开发许可且不依赖该决定的模块内工作可继续。
7. 已获模块开发许可后，模块助手直接实现、测试、修复并交接，不再guide用户手写。所有源码变更均有英文注释；模块提交/可审阅版本按任务授权与coordinator契约准备，外部push/部署不在源码代写许可内。
8. 返修继续原模块 chat、branch；完成后交接到 coordinator，不自行合并或 push。
9. 所有新写或修改的手写代码必须有英文注释，助手指导提供的代码示例同样遵守。主要模块/类/函数说明职责，关键逻辑解释业务规则、设计原因、安全边界、事务/并发约束和错误恢复。注释与代码同步更新；无需逐行复述显然语法。自动生成代码不手改，说明放在生成入口或手写封装。

## 模块如何向 coordinator 提问

按最新人类授权，模块通过 send_message_to_thread 主动发送问题到本 coordinator，并可在已获写入许可的模块 evidence 中记录 QUESTIONS.md。包含模块/任务、baseline、准确文件或 endpoint、复现、预期/实际、依赖影响、建议选项与是否阻塞。当前只读准备阶段只发问题草稿、不编辑共享 checkout，不要求用户代为转发。

coordinator 记录答复/decision ID、影响规范与 owner，通过 send_message_to_thread 回复模块；模块从更新后的契约继续，但未经用户明确开发许可不能实施。医院未知规则待医院决定，不假造批准。同步为任务消息与问题回报，没有建立 watcher/automation。

## 交回、审核与本地合并

按 [handoff 模板](_templates/module-handoff.md) 写 Implementation/docs/evidence/modules/Mxx/HANDOFF.md，包含 baseline/head SHA、branch、ownership、需求/test 状态、改动摘要、契约/migration、命令/exit/time、evidence、known issues 和 deferred 边界。mock/live 分栏，未提交修改单独说明。review 与 merge 由 coordinator 另写 REVIEW.md，不改写原测试事实。

1. 核对 branch/head 与 handoff，检查 diff/秘密/范围，确认依赖与关键问题。
2. 在模块提交上执行适当 build、backend verify/MySQL、QR/权限/并发/E2E；核对 PII/disabled 模式，并检查新增/修改代码具有准确的英文注释。缺少所需注释或注释与行为不符须返修；只看截图不放行。
3. 失败则记录 CHANGES_REQUESTED、文件/问题/复验条件，交回原模块 chat。
4. 通过后记 APPROVED；coordinator 在干净的集成工作树本地 merge，不覆盖用户修改。冲突先核对契约，重大业务冲突交回 owner。
5. 合并后复验受影响依赖，记录 merge SHA 与结果。通过后标 INTEGRATION_VERIFIED 并放行下游；失败暂停依赖放行并返修。

## 下一项具体计划

M00–M04 已完成只读准备，最新方式为模块直接写代码。用户已批准 M00/M01，coordinator 固定基线和隔离后立即派发，两模块直接实现并交接，不重复询问许可。M01 真实联调等待 M00，独立 UI/client 可先推进。M02–M04 保持准备/等待许可，M05–M11 不自动开启，不重建项目或先要求外部硬件/API/消息/链到位。
