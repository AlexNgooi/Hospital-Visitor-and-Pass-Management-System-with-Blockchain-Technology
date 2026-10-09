---
type: user-coordination-handover
updated: 2026-10-10
status: prepared-m03-m04-completion-pending
---
# 后续模块：用户自己协调与新 chat 启动

用户2026-10-10决定：原coordinator完成M03/M04并审核、本地合并、复验后停止协调后续模块；M05–M11由用户自己coordinate。本文件只准备启动方式，没有创建chat、授予后续模块许可或宣称M03/M04已完成。当前完成状态以[模块状态表](12_THREE_MONTH_CHAT_PLAN.md#开工顺序与状态登记)和Implementation/docs/evidence/modules/内实际REVIEW为准。

## 每个模块怎样开始

1. 在Codex的 **FYP Dev项目**里手动开一个全新chat，名称采用下表。每个模块一个chat，返修继续原chat。
2. 沿用你指定的 **gpt-6.1-sol / high**。这些是本项目已有chat的配置；以你的模型选择器实际提供的选项为准。
3. 每个chat使用独立 **Worktree**。起点必须是本机已经验收、合并的main提交；不能仅按远端默认分支创建，因为本项目验收提交目前只在本地。如果新chat最初在Local，先发送下面的启动消息，让它只读核对，再从已核实的本地main SHA创建并附加隔离worktree后才写代码。不要让两个模块同时改共享Local。
4. 复制“通用启动消息”，再加该模块的“模块任务消息”，一起发到新chat。这条消息明确授予该模块一次范围内开发许可，普通实现、测试、修复不反复询问。
5. 模块完成后给你HANDOFF和可审阅commit；由你决定审核、返修与本地merge。需要助手执行审核/merge时在对应chat明确提出。未审核、未合并的分支不能当下个模块的稳定依赖；构建成功也不能替代业务验收。

这里的项目、Local/Worktree与新chat隔离方式依据本机Codex app工具说明；没有假定你当前窗口的按钮位置，也没有代你创建任何后续chat。

## 通用启动消息

把Mxx替换成下表模块编号，并加对应任务消息：

```text
这是HSAAS Mxx的独立模块chat，我本人负责后续coordination，现在明确授权你直接开发本模块。
先读AGENTS.md、planning/README.md、planning/12_THREE_MONTH_CHAT_PLAN.md、planning/13_USER_MODULE_START_GUIDE.md，再按任务路由只读相关需求/架构/数据API/所属目录CONTEXT.md及依赖模块REVIEW/HANDOFF。
核实本机main的实际提交、依赖验收和工作树状态。从已合并基线创建/附加本模块独立worktree和codex/前缀分支；未隔离前只读，不编辑共享Local，不覆盖其他chat的改动。起点必须是核实后的本地main SHA，不能默认使用未同步远端。
在已批准模块范围内直接写代码、适当测试、修复并完成交接，不让我手写或逐步骤确认。所有新写/修改的手写代码必须有准确英文注释，说明职责及关键业务、权限、事务、并发和恢复约束。
技术问题、共享文件/API/schema/migration编号、需求conflict和不能确定的选择直接在本chat问我；我自己coordinate，不自动向旧coordinator或其他chat发送消息，也不自动启动任何其他模块。独立工作可以继续，依赖人类决定的动作等待答复。
优先前端和基础后端；动态QR不能改成static。真实医院MRN、实体卡/reader仍需外部条件；WhatsApp/blockchain保持disabled，不生成积压或历史补发/上链任务。mock/synthetic不能冒充live成功。
不得改已应用的Flyway迁移、手改generated代码、读取/输出/提交秘密、擅自修复旧native数据库、push或部署。新增迁移先列出现有编号和候选DDL给我核对，共享契约变更先给我可审阅方案。
按变更运行必要构建、MySQL隔离测试和浏览器/业务验收，记录真实PASS/FAIL/NOT_RUN、命令、时间、实现SHA和证据。完成后写Implementation/docs/evidence/modules/Mxx/HANDOFF.md，列出风险、共享变更、启动/迁移/恢复方式和最终clean状态，提交本模块成果交我审核；不自行merge main。
```

## 后续顺序与每个模块任务消息

先M05，再完成M06，最后M07。M06账号/配置可在M00基线上独立推进，但统计/报表须等M03/M05验收。M08–M11是外部条件到位后由你另行启动的deferred模块，没有固定自动开工日期。

| 模块 / 新chat名称 | 依赖 / 何时启动 | 分支建议 |
|---|---|---|
| M05 — Card & Assignment Simulation | M04审核合并、M00审计/幂等可用 | codex/hsaas-m05-card-assignment-simulation |
| M06 — Administration & Reporting | M00账号/配置；完整报表等M03/M05 | codex/hsaas-m06-administration-reporting |
| M07 — Integration QA & Release Evidence | 可逐项核对已合并模块；全量当前版等M00–M06 | codex/hsaas-m07-integration-qa |
| M08 — Physical Cards & Reader | 实体卡、reader型号、profile/category映射、sample到位 | codex/hsaas-m08-physical-reader |
| M09 — Patient MRN Integration | 获批endpoint/auth/字段/测试凭据与最少留存规则 | codex/hsaas-m09-patient-mrn |
| M10 — WhatsApp Notification | approved账号/模板/政策/opt-in/provider幂等与对账能力 | codex/hsaas-m10-whatsapp |
| M11 — Blockchain Audit | 固定Testnet工具链/ABI/network/package/registry/capability | codex/hsaas-m11-blockchain-audit |

### M05任务消息

```text
开发M05 Card & Assignment Simulation。输入planning/03的C/P/N03/D、planning/04及已验收M04/M00契约，参考UI v4 S06–S11/A02–A04。范围：frontend/src/features/counter/lifecycle，backend的card、assignment、reader mock、monitoring及必要本地lifecycle/audit写入。实现synthetic库存/扫描、发卡交付确认、借用/归还、截止边界/逾期内部告警、lost/restore与历史；所有模拟来源标SIMULATED。并发发同卡/同登记只能一个活动借用，业务/库存/审计/幂等同事务，错误设备/柜台/nonce/过期/重放拒绝。CONTACT reveal/人工跟进要当前授权与审计。生产不能启用mock绕过；真实卡、消息、链继续deferred。首先核对M04验收，给我最小状态/ScanJob/DDL/锁图与首批实现计划，然后在批准范围内自主完成。医院尚未批准的lost恢复政策必须明确区分演示规则，有实质选择问我。
```

### M06任务消息

```text
开发M06 Administration & Reporting。输入planning/03 A/D、planning/04、UI v4 A/X和已合并M00/M03/M05成果。范围：frontend/src/features/administration、audit本地视图，backend/administration、reporting、audit read model。实现账号/角色/柜台授权、停用/降级撤销会话与最后active admin并发保护，版本化类别/ward/settings与审计；按冻结golden dataset定义统计、MYT日期筛选、数据更新时间/stale/error和默认掩码CSV导出（防formula injection并审计）。ADMIN不自动有柜台权限；失败不能显示假0。先做M00已有契约可用的账号/配置；报表待M03/M05稳定验收。NFC/WhatsApp/blockchain展示未启用，不伪造健康或成功状态。共享契约/迁移先交我确认，完成后提交HANDOFF供我审核。
```

### M07任务消息

```text
开发M07 Integration QA & Release Evidence。输入planning/03完整当前测试矩阵、planning/05和已合并M00–M06 HANDOFF/REVIEW。范围Implementation/tests、docs/evidence、runbooks、uat。先核实实际源码/模块验收与运行配置，逐项补当前动态QR→四类登记→审核→synthetic扫描/交付/借用/归还E2E、安全权限/CSRF/过期/重放/并发、隐私/掩码、离线恢复、性能golden数据与备份还原证据；写可重做的release manifest、启动/恢复runbook、需求覆盖与FYP限制。业务缺陷交原owner或由我明确授权修复，不擅自跨域重写。真机/生产HTTPS/医院MRN/provider/链/UAT未执行就保持NOT_RUN，mock结果单独列，不能凭日期或零样本称验收通过。最终交我审核，不自动发布。
```

### M08任务消息（条件到位才使用）

```text
启动M08 Physical Cards & Reader，仅在我提供实际型号/sample和批准profile映射后实施live接入。先核对ReaderPort/ScanJob和M05已验收契约，在Implementation/reader-agent做最小PC/SC/APDU spike，真实读取UID/profile并交我核对类别来源；未知profile拒绝，不手填UID或假定UID自带category。实现出站HTTPS设备认证、单活动job、nonce/lease/expiry/cancel/fencing和scan provenance，不用浏览器直连localhost agent绕过。隔离真实测试设备，验证拔插/离线/重放/错误柜台/旧lease与真实enrollment/issue/return，保留sample证据。缺条件只准备契约并明确缺项，不伪造live PASS、不自动切production模式。
```

### M09任务消息（条件到位才使用）

```text
启动M09 Patient/MRN Integration，仅接我提供的获批sandbox endpoint、auth、最低字段和测试凭据。沿用HospitalVerificationPort、mock/manual/live分层及M03/M04登记审核契约；核对真实证件/MRN格式与用途/留存批准后给我版本化字段迁移方案，不能直接套演示DEMO格式到真实医院。外部调用在事务外，timeout保留登记并转人工，不保存病历，mock MATCH不能冒充医院核验或staff批准。实现最小adapter和成功/无记录/超时/错误/权限/字段改变contract tests，秘密走本机安全配置不输出。sandbox证据及模式切换由我审核；缺条件不启用live。
```

### M10任务消息（条件到位才使用）

```text
启动M10 WhatsApp Notification。先核对我提供的approved账号/template/policy、独立opt-in文案和provider幂等/查询对账能力，再规划迁移/NotificationPort/adapter与启用关卡。只有VERIFIED且ISSUED且明确opt-in且真实交付确认的合格assignment才有一条COMBINED_PASS_DETAILS；无批准/拒绝/提醒/归还消息，含批准模板所需pass/地点/MYT截止信息，不含证件或MRN。业务事务写durable任务，外部发送异步；UNKNOWN/SENT/DELIVERED不盲目重发，accepted不等于delivered，验证429/超时/重复乱序callback/重启和sandbox收件。默认disabled，只处理正式启用后合格事件，历史backfill需另行授权。条件不足不发送、不收集发送opt-in、不造积压。
```

### M11任务消息（条件到位才使用）

```text
启动M11 Blockchain Audit。先给我核对固定Testnet工具链/ABI/network/package/registry/capability及版本化canonical非PII快照/event catalogue方案，沿用AuditAnchorPort；范围Implementation/sui-worker、move及必要backend outbox/proof接入。业务同事务durable outbox，worker异步写链且不阻断柜台；eventId去重、lease/fencing、低gas/429/timeout/unknown先对账，不盲目重发。proof重算本地快照并核对真实链上绑定，区分MATCH/MISMATCH/PENDING/FAILURE/RPC故障/证据清除；不拿缓存hash称真链验证。不要访客钱包/Mainnet，不含姓名/电话/IC/MRN，不把demo历史事件自动上链。默认disabled，clean/upgrade、故障与Testnet smoke证据获我审核后才切模式。
```

## 你作为coordinator需要拿到什么

每模块交回最终commit、HANDOFF、允许目录/共享变更清单、迁移clean/upgrade结果、必要业务/权限/并发/故障测试与真实浏览器证据。你核对这些后再批准本地merge和受影响回归；遇到冲突回原chat返修。无需替模块写代码，但不把未审核源码、候选DDL或mock测试当稳定依赖。

M03/M04完成后的最终本地main SHA与已验收证据由原coordinator更新到12和各REVIEW；启动M05前用实际记录核对。没有这条验收记录时，可以只读准备M05，不能假定M04已经完成。
