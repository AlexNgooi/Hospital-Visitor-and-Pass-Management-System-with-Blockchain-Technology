---
type: user-coordination-handover
updated: 2026-10-10
status: m00-m04-functions-merged-user-manual-acceptance-pending
---
# 后续模块：用户自己协调与新 chat 启动

M00–M04 功能已合并本机 main；组合入口提交 dc6982341ed6135b0917a5cfafc4200f06e43e96，M03 merge0067637、M04 merge446f887。后续文档提交不改变功能源，启动时以本机实际 main HEAD 为准。历史检查保留各 REVIEW；最新组合没有另行构建或测试，状态 MERGED_PENDING_USER_MANUAL_TEST 不是验收 PASS。

用户2026-10-10最新决定覆盖旧测试/协调流程：助手只完成指定模块功能，代码有英文注释，不自行新增或执行测试；用户手动测试并自己协调 M05–M11。旧 coordinator 不再创建、启动、派发、审核或合并后续模块，不自动收发后续模块消息。M05–M11 当前仍未启动。

## 每个模块如何开始

1. 在 **FYP Dev 项目**手动开新 chat，每个模块一个 chat，返修继续原 chat。选择你指定的 **gpt-6.1-sol / high**，以实际模型选择器为准。
2. 使用独立 **Worktree**，起点必须本机最新 **main**，本次没有 push，不能默认用尚未更新的远端。新 chat 若初始在 Local，下面消息授权助手只读核对后创建该模块 worktree；隔离前只读。
3. 复制下面“通用启动消息”，加对应模块任务消息，一起发送。此消息授予该模块一次开发许可及隔离 worktree 创建，普通实现/修复不反复申请许可。
4. 助手交回 commit、HANDOFF、启动方式和你的手动验证步骤。你测试、协调冲突、决定返修/merge；需要助手合并时在对应 chat 明确说“审核并 merge 本地 main，不 push”。

不能并行修改共享 Local。创建工具不一定改变 chat 的 cwd，助手必须用返回的绝对 workspace 路径并核对 HEAD/branch。是否接受尚未手动验收的依赖，由你决定。

## 通用启动消息

把 Mxx 替换成下表模块编号，再加对应任务消息：

```text
这是 HSAAS Mxx 独立模块 chat，我自己负责 coordination，现在授权你直接开发本模块。
先读 AGENTS.md、planning/README.md、planning/13_USER_MODULE_START_GUIDE.md，再按任务读取需求/架构/数据API、所属目录 CONTEXT.md 和已合并依赖的 REVIEW/HANDOFF。核实本机 main HEAD、依赖状态和工作树；MERGED_PENDING_USER_MANUAL_TEST 不能当测试通过。
本消息也授权创建本模块独立 worktree。优先复用本 chat 已附加且基线正确的 worktree，否则从核实的本机 main SHA 创建/附加 codex/ 前缀分支的隔离 worktree。未隔离前只读，不编辑共享 Local，不覆盖其他 chat；创建工具不一定改变 cwd，所有命令/编辑使用返回的绝对路径并核对 HEAD/branch，不能默认从未 push 的远端创建。
直接完成指定模块功能、必要修复和交接，不让我手写源码、不逐步骤再求许可。所有新增/修改手写代码必须有准确英文注释，说明职责、业务规则、权限、事务、并发和恢复边界。
不新增或执行自动化测试，不代我进行浏览器/业务测试，不运行旧验收或回归脚本。源码/diff 只读审查可以继续；测试由我手动做。额外构建/运行操作遵守我的后续明确要求。保留历史结果的准确 SHA/范围，未执行项写 NOT_RUN，不把提交或构建当验收 PASS。
技术问题、共享文件/API/schema、迁移编号、依赖、实质 conflict 和不清楚的选择直接在本 chat 问我，不向旧 coordinator 或其他 chat 自动发消息，不启动其他模块。独立工作继续，依赖我的选择则等待答复。新增迁移先列出现有编号与候选 DDL，不改已应用迁移或复制登记根实体。
保持动态 QR；实体卡/reader、真实医院字段/MRN、WhatsApp、blockchain 待各自条件与许可，默认 disabled。模拟来源标 SYNTHETIC/SIMULATED，不冒充 live 成功，不造积压或历史补发/上链任务。
不改 generated 文件，不读取/输出/提交秘密，不擅自 repair/baseline/clean/migrate 旧 native 数据库，不 push 或部署。完成后提交本模块成果，写 Implementation/docs/evidence/modules/Mxx/HANDOFF.md，交回最终 commit、功能/共享变更/迁移清单、启动/恢复方式、我的手动检查步骤和已知限制；不自行 merge main。
```

## 顺序与模块任务消息

建议 M05 → M06 → M07。M06 账号/配置可基于 M00 单独推进，完整统计等待 M05。M08–M11 条件到位后由你另行启动，没有自动开工日期。

| 模块 / 新 chat 名称 | 主要范围 / 启动条件 | 分支建议 |
|---|---|---|
| M05 — Card & Assignment Simulation | M04基线；模拟库存/发卡/借用/归还/逾期/lost | codex/hsaas-m05-card-assignment-simulation |
| M06 — Administration & Reporting | M00账号/配置；完整报表等M03/M05 | codex/hsaas-m06-administration-reporting |
| M07 — Manual QA & Release Handoff | M00–M06合并后整理用户手动验收及交付文档 | codex/hsaas-m07-integration-qa |
| M08 — Physical Cards & Reader | 实体卡、reader型号、sample、获批profile映射 | codex/hsaas-m08-physical-reader |
| M09 — Patient MRN Integration | 获批sandbox endpoint/auth/字段与最低留存规则 | codex/hsaas-m09-patient-mrn |
| M10 — WhatsApp Notification | approved账号/template/policy/opt-in、幂等对账能力 | codex/hsaas-m10-whatsapp |
| M11 — Blockchain Audit | 固定Testnet工具链、ABI/network/package/registry/capability | codex/hsaas-m11-blockchain-audit |

### M05 任务消息

```text
开发 M05 Card & Assignment Simulation。读取 planning/03 C/P/N03/D、planning/04、已合并 M04/M00 契约，参考 UI v4 S06–S11/A02–A04。范围 frontend/features/counter/lifecycle，backend/card、assignment、reader mock、monitoring、本地 lifecycle/audit。实现 synthetic 库存/扫描、发卡交付确认、借用/归还、截止/逾期内部告警、lost/restore 和历史，模拟来源标 SIMULATED。并发同卡/同登记只能一个活动借用，库存/业务/审计/幂等同事务，错误设备/柜台/nonce/过期/重放拒绝。CONTACT reveal/人工跟进需当前授权和审计，生产不能 mock 绕过。先核对依赖和最小状态/ScanJob/候选 DDL/锁图，实质选择直接问我；医院未批准的 lost 恢复政策区分演示规则。只完成功能，不自行测试，给我手动验证步骤；真实卡/通知/链 deferred。
```

### M06 任务消息

```text
开发 M06 Administration & Reporting。读取 planning/03 A/D、planning/04、UI v4 A/X 与 M00/M03/M05 已合并成果。范围 frontend/features/administration、audit 本地视图，backend/administration、reporting、audit read model。实现账号/角色/柜台授权、停用/降级会话撤销、最后 active admin 并发保护，版本化类别/ward/settings 与审计。报表按明确数据定义提供 MYT 日期筛选、更新时间/stale/error、默认掩码 CSV 导出、防 formula injection 与导出审计；失败不显示假0，ADMIN 不自动有柜台权限。先做 M00 基线上的账号/配置，完整统计等 M05；NFC/WhatsApp/blockchain 正确显示未启用。共享契约/迁移先直接交我决定，只完成功能，不自行测试，给我手动步骤和 HANDOFF。
```

### M07 任务消息

```text
完成 M07 Manual QA & Release Handoff。读取 planning/03 当前需求矩阵、planning/05、M00–M06 已合并 HANDOFF/REVIEW。按最新要求不写或执行自动化测试、不代做浏览器验收。整理我可以手动执行的动态QR→四类登记→审核→synthetic扫描/交付/借用/归还检查清单，覆盖权限/过期/重放/并发、隐私/离线恢复及备份还原；写准确 release manifest、启动/恢复 runbook、需求覆盖和 FYP 限制。已有 PASS 保留原 SHA/范围，我未验证的保持 NOT_RUN，不造截图或 UAT 结果。业务缺陷直接交我协调，跨域修复先明确许可，不自动发布。
```

### M08 任务消息（条件到位才使用）

```text
开发 M08 Physical Cards & Reader，只接我提供的型号/sample/批准 profile 映射。核对 ReaderPort/ScanJob 与 M05 契约，实现 Implementation/reader-agent 的 PC/SC/APDU 读取、UID/profile 和真实 provenance；未知 profile 拒绝，不手填 UID 或假定 UID 自带 category。出站 HTTPS 设备认证、单活动 job、nonce/lease/expiry/cancel/fencing，不能浏览器直连 localhost agent 绕过。缺条件列缺项、不启用 live、不伪造证据；不自行测试，给我真机 enrollment/issue/return、拔插/离线/旧 lease 手动步骤。
```

### M09 任务消息（条件到位才使用）

```text
开发 M09 Patient/MRN Integration，只接我提供的获批 sandbox endpoint/auth/正式字段与最低留存规则。沿用 HospitalVerificationPort mock/manual/live 分层和 M03/M04 契约；正式证件/MRN 格式与用途先交我确认，再给版本化迁移方案，不把 DEMO 格式当医院字段。外部调用在事务外，超时保留登记转人工，不保存病历，mock MATCH 不冒充医院核验或 staff 批准。实现最小 adapter 与无记录/超时/错误处理，不自行测试，给我手动 sandbox 步骤。秘密走安全配置不输出，缺条件不启用 live。
```

### M10 任务消息（条件到位才使用）

```text
开发 M10 WhatsApp Notification，先直接核对我提供的 approved 账号/template/policy、独立 opt-in、provider 幂等/查询对账能力。只有 VERIFIED、ISSUED、明确 opt-in、真实交付确认的合格 assignment 才有一条 COMBINED_PASS_DETAILS，无批准/拒绝/提醒/归还消息，不含证件/MRN。业务事务 durable 任务、外部异步发送，UNKNOWN/SENT/DELIVERED 不盲目重发，accepted 不等于 delivered，正确处理429/超时/重复乱序 callback/重启。默认 disabled，不造积压或自动 backfill；只完成功能，不自行发送/测试，给我 sandbox 手动验证与启用关卡。缺条件不收集发送 opt-in、不启用。
```

### M11 任务消息（条件到位才使用）

```text
开发 M11 Blockchain Audit，先直接交我确认固定 Testnet 工具链、ABI/network/package/registry/capability、canonical 非 PII 快照/event catalogue。沿用 AuditAnchorPort，范围 sui-worker、move 和必要 backend outbox/proof。业务同事务 durable outbox，异步写链不阻断柜台，eventId 去重、lease/fencing、低gas/429/timeout/UNKNOWN 先对账、不盲目重发。proof 重算快照并核对真实链绑定，区分 MATCH/MISMATCH/PENDING/FAILURE/RPC故障/证据清除，不拿缓存hash称验证。不含姓名/电话/IC/MRN、不用访客钱包/Mainnet、不自动把历史demo上链。默认 disabled，只完成功能，不自行测试/发交易，给我 Testnet 手动验证和启用步骤。
```

## 当前手动入口与 push

M00–M04 启动、演示账号和可检查流程见 [手动指南](../Implementation/docs/runbooks/MANUAL_M00_M04.md)。旧 native 库 checksum 问题没有修复；指南使用独立临时库。

本 chat 没有 push GitHub。你在项目根目录执行：

```powershell
# Upload the local main branch when you choose to publish it.
Set-Location -LiteralPath 'C:/Users/alexy/Documents/FYP Dev'
git push origin main
```
