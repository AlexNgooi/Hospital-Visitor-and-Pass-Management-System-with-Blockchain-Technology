---
type: baseline-review
revision: current
updated: 2026-10-09
status: m00-m02-local-integration-verified
---
# 当前基线评审、来源与未决项

最近规划评审日期 2026-10-08（Asia/Singapore）。这是用户范围/协作变更的规划记录，不是医院签字、真实硬件/API 验收或业务实现完成声明。

## 2026-10-08 当前决定与实际状态

2026-10-09 最新模块启动（优先于下方阶段记录）：coordinator直接read_thread核实用户在M03/M04各自chat分别回复“继续”，承接各chat一次开发许可申请；两模块已从f59baf3在独立managed worktree推进。M03 owns登记根聚合/V5候选，M04 owns审核子域并经M03 root port接入；准确许可turn IDs/路径/限定共享例外见12，接口职责见04 C13。S-V1证件/MRN采用DEMO-only或接近正式IC/Passport输入，已集中向本coordinator chat用户提问；依赖该选择的字段/API/schema/V5最终DDL等待答复，已有冻结契约的独立工作继续。M03/M04未验收、未merge，M05及后续未启动。

2026-10-09 18:55 最新实施状态（优先于下方阶段记录）：M00/M01/M02 当前本地基础/UI/动态QR与entry grant范围已 INTEGRATION_VERIFIED。M02 source f81512d、delivery d2d745f、coordinator本地merge3c0c229；R1事务回执、R2晚到离线/隐藏响应、R3未知撤销、R4首屏与放大全屏返修均通过。coordinator独立真实临时MySQL/servlet/Vite浏览器28项通过；主分支95前端tests/typing/build/lint/proxy通过，18:55:01后端verify68项零失败/错误/跳过、JAR通过。完整证据与历史失败见M02 REVIEW。QR配置默认disabled；物理相机、生产HTTPS、实际M03登记提交与live集成仍NOT_RUN。M03/M04仍未获开发许可、不自动启动；native数据库checksum选择仍待人类答复，未repair/migrate。

以下保留各阶段决定的追踪依据；其中“未许可/未实现/NOT_RUN”按该段当时阶段理解，当前验收状态以上段和各模块REVIEW为准。

2026-10-09 最新启动：人类明确要求“开启m02”，M02 现已获开发许可；coordinator 固定基线/隔离后派发，V4保留给QR/entry schema。M03/M04仍未获许可。独立运行请求的 native 库只读检查发现旧V1 checksum不匹配（当前4表、users0）；未migrate/repair/baseline/clean，前端5173已启动，后端数据库选择待人类答复。该运行阻塞不影响 M02 隔离测试环境开发。

M02实际开工已派发：baseline98a7f7d，branch codex/hsaas-m02-dynamic-registration，bd17独立工作树，目标chat01a11db3-31c9-7da0-bfb2-217e71081355；模型gpt-6.1-sol/high，快照active/inProgress。前端/后端动态QR任务已送达，不代表已实现或验收；M03/M04仍未启动。

M02 首次共享请求裁决：允许隔离分支的限定 QR renderer/type/decoder 依赖和 main.tsx FeatureSlot 接线、foundation迁移数量/upgrade注释适配V4；原安全/事务负例保留。module QR enabled缺省false，显式true缺/非法keyring/origin失败启动，最低readonly capability与disabled零写/API409决定见02/04。属于M02已批准范围的ownership/工程安排，不额外要求人类批准；没有修改native库或开启M03/M04。模块必须实际enabled验证，不能用disabled启动代替交付。

2026-10-09 最新验收状态：M00/M01 的当前本地基础/UI/C01 范围已 INTEGRATION_VERIFIED。M01 最终联调交付58b738a已通过隔离返修复审并合并e8ca80a；coordinator在main复跑68前端tests、16隔离checks、typing/build/lint/proxy全PASS，此前独立真实28wire PASS仍精确关联原runtime/harness来源；M00 backend40 tests未变。CSRF UNKNOWN缓存与harness环境覆盖问题均已修正。当前本地验收不包含生产HTTPS、后续QR/登记/审核或live外部集成；M02基础依赖满足但仍未获用户开发许可。各REVIEW包含完整证据、先前返修与限制；下文未完成状态为对应历史阶段。

2026-10-09 当前实施状态优先：M00 delivery 1b2d8f2 与 M01 revised delivery ad23099 已分别审核并本地合并到 main，merge SHA 为 a137acd 与014d030。coordinator 独立复跑和合并后回归：backend 40 tests/verify/JAR、frontend 63 tests/typecheck/build/lint/frozen install/synthetic proxy 全 PASS；审核和限制见各模块 REVIEW。M01 原首轮登录核查按钮缺失判断已在 REVIEW 撤回，R1注销保护与R3重试配置问题已修复。真实 C01 前后端/HTTPS 联调仍待完成，M02–M04 未获许可；不能将基础片段通过视为访客/QR/登记/审核业务已验收。后文“骨架/未提交/未执行”均为历史对应阶段。

随后 M01 联调交接8e5ffcf/source2baded5：coordinator 独立复跑68前端tests/build/lint/proxy并实际启动临时MySQL+reviewedbackend+Vite，真实28wire检查PASS（含DBpause503/resume200），spec镜像及7截图hash一致，停止资源并确认无残留。登录/注销UNKNOWN后的CSRF缓存修复通过审查；但harness继承Spring/JVM环境配置可能覆盖临时DB边界，已交回最小隔离/负例修正，联调候选未merge。当前运行前已确认没有这些覆盖变量、没有nativeDB/.env使用。HTTPS/完整业务授权仍NOT_RUN。

2026-10-09 最小接口补充：M00 实施中提出 categoryScope ID/code 歧义，coordinator 核对当前契约后统一为 visitor_categories 数据库 ID 十进制字符串，与 counterId 一致；完整 C10 scope/details 与 bindingVersion 安全整数范围见04。该决定用于公共 DTO/client 对接，不启动 M02 开发。M00 报告在 framework save 前增加只校验/撤销、不激活/续期的有界领域检查，锁全部释放后 save，再执行成功确认 hook；作为 spike 实现调整纳入最终故障/并发审核，未放行 guard 集成。M00 当前报告 20 tests PASS，完整 upgrade/restart/DB-offline/竞争验证与 HANDOFF 仍进行中。

同日 M00 发现基础 DataSourceTransactionManager 会限制后续 JPA EntityManager 写事务，coordinator 核对 Spring 官方文档后选择统一 JpaTransactionManager 同 DataSource 路线，保留 Data JPA，不要求其他模块改为纯 JDBC。M00 直接修正公共配置、以 test-only counters 映射验证 JPA/JDBC audit/idempotency 同事务提交/回滚，并复验 Session/save/并发；属于已有 M00 许可范围。决定见02/04，实际兼容验证尚待执行/交接，不将此前20项结果当作切换后 PASS。

最新启动决定：用户明确要求准备完成后让 M00/M01 开始写代码。已核对 M00–M04 准备状态，M00/M01 获一次开发许可；coordinator 本地提交当前规划作为可追溯输入并安排独立工作树，再发开发任务。M01 可先按冻结契约实现 UI/client，真实联调依赖 M00。M02–M04 未获开发许可；以下“只 plan/未提交/许可待答”记录为此前历史，不再代表 M00/M01 当前状态。业务功能仍未验收。

实际启动已完成：规划提交 c2b0c316e04947df06b84f1008f470b6e5a9eb8b；app handoff 成功创建 M00/M01 隔离工作树及目标 chat，路径/branch/thread ID 见12当前状态表。启动任务已送达并保持 gpt-6.1-sol/high，快照确认两个 chat active/inProgress。该状态证明任务运行，不代表业务完成；coordinator 未合并模块业务、未 push/deploy，M02–M04 未启动实施。

M00 初步实施证据：coordinator 读取 ced2 工作树的实际测试源码及 Surefire XML，确认 `HsaasBackendApplicationTests.contextLoads` 1 test、0 failures/errors/skips；Testcontainers MySQL 8.0.45 clean 应用 V1–V3，实际 HTTP health 200/UP 且 users 空。编号登记见04。测试通过仅覆盖迁移与 health；login/CSRF/save失败/并发/撤销 guard spike 尚在测试开发中，未批准 live 联调或 merge。实现当前为模块工作树未提交变更，最终证据须关联提交 SHA 与 HANDOFF。

最高优先级是本轮用户请求：当前 chat 为 coordinator，每 module 独立 chat，模块可回问并交回审核/merge；实体卡、reader、病人资讯 API 尚未准备，当前优先前端、基础后端和 QR；WhatsApp/blockchain 暂不启用但预先规划；QR 必须实时更新。本轮只 plan，未创建 chat/worktree、未写业务源码、未 commit/merge/push。

用户后续明确约束：新写/修改的代码与指导示例必须有英文注释；每个 module 的 chat 与开发必须由用户手动开启和启动。coordinator 只准备任务/依赖，不代开、不自动启动，也不以子代理或自动化替代用户启动；审核与 merge 后仍等待用户启动下一模块。

最新明确授权例外：用户随后要求代开 M00–M04，不同 chat，使用 gpt-6.1-sol / high。本次仅为五个模块创建 Local 只读核对/契约准备 chat，用户手写源码和英文注释规则不变；未授权 M05–M11 自动启动，实施隔离与依赖关卡不变。

最新沟通决定：用户授权模块主动把问题发给 coordinator，并由 coordinator 回复；用户只审批每模块开发许可，批准范围内不逐步重复索求授权。此请求本身不是开发批准；五个已开的模块仍先做只读准备，源码用户手写方式不变。

用户进一步指定裁决入口：coordinator 遇到问题、实质 conflict 或不清楚如何选择时，必须在本 coordinator chat 向用户询问；整理事实、选项与建议后集中提问，相关动作等待答复，决定再回传模块。

最新开发方式变更：用户明确要求“不需要再guide我写了，直接帮我写，只不过代码里要写好注释英文”。这覆盖此前源码手写限制：模块获一次开发许可后直接编写/测试/修复/交接，coordinator审核merge；不再等待用户逐步写源码。2026-10-08 最近模块状态核对仍显示各模块开发许可待回复，不重复索求已经明确的许可；本次核对只用于落实现有每模块许可规则，不新增审批流程。下面保留的手写描述仅为先前决策历史，当前方式按12新节。

## 模块问题收件与待裁决（2026-10-08）

已收到 M00–M04 的 QUESTION/BLOCKER（只读核对，baseline b005823）。共同确认当前仍是骨架、规划未提交、业务未验收，不能进行共享 Local 并行实施。技术预冻结 C01–C06 在 04，职责在 02：保留实际包名、统一安全 DTO/错误/柜台权限、registration owner、审核单命令事务、grant 外层消费、本地审计。M00 负责隔离测试与 backend/shared/migration，M01 为前端共享/proxy 执行 owner。

coordinator 在本 chat 提出的三项选择已收到人类明确答复，U01–U03 为 CONFIRMED（用户决策，不是模块开发许可）：

| ID | 冲突/选择 | 用户确认方案 | 影响部分 |
|---|---|---|---|
| U01 | login 字段与旧 UI Email 标签的账号语义 | 用户名/职员账号，保留 login，不强制邮箱 | 账号创建/字段校验与登录标签；M00/M01 按统一语义准备 |
| U02 | 一个手机已有表单时再扫别柜台/类别 QR | 单份表单，先提示确认重新开始，确认后撤销旧 grant，不后台覆盖 | exchange 原子替换/表单上下文/旧标签页拒绝；M02/M03/M01 同步 |
| U03 | synthetic Penjaga mock 是否足以批准 | 职员模拟人工核实后才可批准，mock 结果本身不算核实 | mock/manual 的 demo approval predicate；M03/M04；真实医院核验仍 deferred |

来源是用户对本 coordinator chat 的 request_user_input_async 三项问题的明确回复。取消重新开始/新 entry 失效时保留原 grant、旧标签页不得误用新 grant 等是落实 U02 的技术约束，具体 DTO/锁序仍由 M02/M03 提案评审。所有业务测试保持 NOT_RUN，用户未在此回复授予任何模块开发权限。

M00 的 Testcontainers 路线可作为隔离测试方案，先在独立环境验证 Docker 可用性；启动失败必须 fail closed，不回退开发库。模型/DDL/迁移序号仍是准备提案，未执行 migration。逐份 V 编号待模块提交具体 DDL/库中实际历史后在 coordinator 登记，不因新模块自行重开 V1。实际 module 开发仍需用户许可，source 手写方式不变。

后续 M02/M03 的 formContext/锁序候选经 coordinator 收敛为 04 C10（bindingVersion、typed RESTART details、CONTEXT_CHANGED、context 在 grant 前），token 方向与 JDBC 无 session events/REQUIRES_NEW 事实记于 02。仍未放行完整并发实施：M00/M02 必须补 owner guard 同步/锁图与真实 MySQL 验证，不能宣称局部锁序已证明全部路径无死锁。新工程问题无需重复向用户选择已确认 U01–U03。

M02 的 MINIMAL_C10_GUARD_PROPOSAL 已收件：两列 replaces 关联与唯一约束采纳为 04 C12，整体 user/counter/owner/... 锁图仅登记为待 M00 合并审查候选。待证据仍是 JDBC save 成功到领域能力激活/续期的 hook、所有写路径/Session flush/最后管理员/context 首插入竞争锁图与失败/重启恢复。没有增加功能模块、创建代码或执行测试；开发许可仍待用户。

M00 最小 guard 新提案已收到：不复制框架idle期限，由M00 port封装实际Session metadata非锁检查，以epoch/当前权限逻辑撤销；暂采先冻结port、后登录同步spike再放行M02接入的路径。两表/epoch/全局锁前缀仅为候选，不宣称读取 metadata 与框架保存时序已被证明。spike属于M00获模块许可后的直接实现任务，记录新代码方式覆盖先前用户手写限制；目前仍未实施/测试。

随后 M00/M02 合并补充经逻辑审查，采用 counter→binding→auth context 前缀与成功 save 后有界 REQUIRED hook 作为 spike 验证基线，详见04 C12。confirmed_idle_expires_at 仅为保守上限，仍检查实际框架 Session；旧期限已过/撤销不可被迟到 save 复活。此决定允许获许可并隔离后的 M00 直接写验证代码，不要求实施前已有 PASS；M02 完整 guard 接入仍等待实际持久化、失效、并发和恢复证据。没有业务源码改动，测试 NOT_RUN。

| 决策 | 当前落点 | 状态 / 依据 |
|---|---|---|
| 每阶段 chat → 每模块 chat + coordinator | 01/12 与 handoff 模板；M00–M07 当前，M08–M11 deferred | 用户决定；模块职责已分配规划，chat 尚未派发 |
| 前端和基础后端先行 | 01/02/03 的 scope 与 M00–M07 | 骨架已有，业务 NOT_RUN |
| reader/card 缺失 | mock adapter + synthetic provenance，只在 demo/test | 真实 profile/交付仍 NOT_RUN |
| 病人 API 缺失 | HospitalVerificationPort、synthetic mock/manual 模型 | approved live sandbox 未到位 |
| WhatsApp/blockchain 当前关闭 | disabled、NOT_ENABLED、LOCAL_ONLY；不建发送/上链积压 | 原单条消息/异步链规则保留为后续契约 |
| QR 每轮真正变码 | 02 §9、03 R01/R06、04 QR session/challenge/grant | 30 秒轮换/45 秒 expiry/20 分钟 grant 为工程默认，非用户指定或医院已批数值 |
| 旧图/UI 尚未重新交付 | README/图 hub/07 标明覆盖范围 | 旧六图 artifact 验证仍有效，新语义不能据此视为已同步 |

实际只读核对：HEAD `b005823`（chore: complete project initialization and configuration），分支 main，修改前工作树 clean；frontend/backend/infra 与目录契约存在。[P0_REVIEW](../Implementation/docs/evidence/foundation/P0_REVIEW.md) 记载 P0 技术初始化补齐、前后端首次 build/test 与后续 infra/Docker 验证；本轮没有重跑应用测试，不能据此标业务完成。Spring 实际包名 eduupm.hsaas，与早期树的设计示例不同，留 M00 决策。源码沿用用户手写/助手逐步指导，不因模块 chat 计划改变。

来源优先级：本轮用户请求 → P0 实施证据（仅限实际初始化状态）→ 下列既有 UI/guide/proposal（未被覆盖部分）。下面 2026-10-05 的修订表与 skill 记录是既有设计交付记录，不是本轮重新执行声明；旧 P4 必须上链/安装或 reader 必须 P1 真机 spike 的期限由 01/12 新计划覆盖。

## 来源和优先级

1. 2026-10-05 用户请求（已由上节当前请求覆盖的部分除外）：安装两个 skill、完善需求、Archify architecture/folder/workflow/sequence。
2. [UI v4](../output/ui-redesign-v4/README.md)，2026-09-24，明确保留一条组合 WhatsApp；覆盖 v3/UI旧稿和 Archify v2 的多消息政策。
3. [实施指南](../output/pdf/HSAAS-build-guide.en.md)：服务端会话、同源代理、Java Reader Agent 领取 cloud ScanJob、canonical nonce、MySQL active constraints。通知附录的多消息部分由 UI v4 覆盖。
4. 根 proposal PDF p14-17：四个目标、五模块、三角色、实体 pass 与 off-chain PII；p46 受控测试事件证明覆盖与篡改检测评价。
5. 2026-10-05 本机只读环境检查：Git/Java/Node/Docker/MySQL 可用，Sui CLI 尚未安装，详见 11。

正式主规范：[架构](02_TECHNICAL_ARCHITECTURE.md)、[需求](03_REQUIREMENTS_AND_TEST_PLAN.md)、[数据/API](04_DATA_MODEL_AND_API_PLAN.md)。planning 只保留当前版本；proposal 和 output 中的外部输入/原型按各自目录契约管理。

## 检查发现与本次修订

| 发现 | v3 修订 | 性质 |
|---|---|---|
| 早期设计在 API 直接提交 Sui 后才回发卡结果 | MySQL 同事务 outbox；柜台 commit 后响应，Sui 独立 worker | 当前异步架构意图 |
| v2 WebApp -> localhost Reader Agent 与指南 cloud ScanJob 不一致 | 采用 agent 出站 HTTPS，设备认证与任务绑定 | 沿用最新指南 |
| 多消息和提醒与 UI v4 冲突 | 一次 COMBINED_PASS_DETAILS；无自动提醒/拒绝/归还消息 | 最新用户业务决策 |
| VERIFY/APPROVED 与 Issued/Pass ID 混用 | Approved=VERIFIED；借用成功后才产生 Pass ID/due_at | 术语与状态统一 |
| passes 与 cards 混用 | cards=实体库存，card_assignments=一次借用 | 命名统一；无现存 migration 被改 |
| 普通 NFC UID 被当作可直接读出 category | approved profile/map + 真机验证；不可读则需医院选策略 | 明示未验证硬件事实 |
| JWT 草案与指南 session 冲突 | session/CSRF/Spring Session JDBC，同源转发需实测 | 沿用最新指南 |
| 本地消息唯一 row 被等同外部 exactly-once | UNKNOWN 保守不重发，provider 幂等/对账条件显式 | 新增可靠性约束 |
| hash 规则未固定、proof 只比较本地缓存 | nonce/canonical snapshot/链上绑定、缺失与 RPC failure 分开 | 沿用指南并完善核验 |
| lost/restore 可能留下活动 assignment | 建议 CLOSED_LOST + lost case，受控找回后恢复 | 新建议，待医院确认 |
| 文档无法快速找事实和修改影响 | root AGENTS、目录 CONTEXT、compact PROJECT_MAP、模板与输出分离 | ICM 文档组织，未搬迁 |
| 计划日期被误认为功能已完成 | 不推断完成；需求测试默认 NOT_RUN，应用模块 ghost | 状态真实性 |
| Git 仓库零 commit、Sui CLI 缺失 | P0 先做首次基线 commit；Sui 工具链最迟 P4 前补齐 | 环境准备 |

## 待确认事项

2026-10-10 C14已获用户明确答复：当前M03只用TEST_ID/DEMO-与DEMO-MRN-演示输入，正式医院格式未来接入。此决定解除演示字段选择阻塞，未替代O01/O04医院字段、采集目的、留存或接口批准。本coordinator完成M03/M04后由用户接管M05及以后协调，见12/13。

| ID | 问题 / 负责人 | 当前可实施选择 | 放行证据 |
|---|---|---|---|
| O01 | 四类别实际字段与 IC/MRN 采集、保留/搜索 / HSAAS | synthetic、白名单 schema、可配置 retention；真实表单字段仍 proposal | 批准的表单/字段用途与保留规则 |
| O02 | NFC 型号、卡制式、PC/SC/APDU 和 category profile / 开发者 + HSAAS | 当前 synthetic mock；M08 条件到位才做真机 spike，不声称 UID 自带类别 | 厂商说明 + 实际 sample read + 批准映射 |
| O03 | 无可读 category 时允许何种分类 / HSAAS | unknown profile 阻止 enrollment/issue | 医院选择预登记映射或分类政策后修改需求 |
| O04 | MRN endpoint/auth/response 和测试 credentials / 医院 IT | manual/mock，不储存病历 | approved sandbox 与接口契约 |
| O05 | WhatsApp 通道、内容与 opt-in、provider 能否幂等/查状态 / HSAAS | 当前 disabled 零发送任务；M10 保留一条消息、未知不重发契约 | approved account/template/policy + sandbox evidence |
| O06 | LOST 借用关闭、找回与 disabled restore 条件 / HSAAS | CLOSED_LOST + unresolved case 的建议 | counter/admin 场景签字 |
| O07 | 会话超时、临时数据 TTL、性能/UAT样本、RPO/RTO / 导师 + HSAAS | 03 的建议指标，非 production SLA | 受控测试方案和签字 |
| O08 | 托管预算、runtime兼容版本、同源cookie转发 / 开发者 | 本地先行，部署 spike；无免费常驻保证 | lockfiles + release manifest + cloud smoke |
| O09 | 动态 QR 显示位置/可用网络、轮换/grant TTL / 开发者 + HSAAS | 当前柜台登记屏 30s/45s/20min 默认；成功页文字 reference，无 static receipt QR；未来 pass/receipt QR 也必须动态并先定义用途/权限 | 真机扫码/时钟/断网/E2E 与医院可用性反馈 |

这些未决项不阻止本次设计交付；真实硬件类别、live MRN、实际消息发送必须满足相应条件后才可宣称完成。当前没有向医院、Trello、Figma 或消息 provider 写入/发送任何内容。

## Skill 安装与实际使用

| Skill | 来源 | 安装固定 revision | 本次用途 |
|---|---|---|---|
| icm-architect | [RinDig/icm-architect](https://github.com/RinDig/icm-architect) | e16cafe6a664dcf6d787a726b452adba77d913f4 | 小型 map、root 路由、目录契约、模板与产品分离；不作为 runtime |
| prompt-master | [nidhinjs/prompt-master](https://github.com/nidhinjs/prompt-master) | 2bd92518e26bf659e21e3d9ab90573fcf3ddeccb | 一份以 Codex 为目标的实施提示词，绑定主规范、范围、验收和操作边界 |
| archify | 本机已有 2.17.0-dev.1 | 保持安装不变 | 6 个 standalone HTML，showcase validate/deliver/browser evidence |

安装目录 `C:/Users/alexy/.codex/skills/icm-architect/` 和 `.../prompt-master/`；包含原 SKILL.md/配套 references。已在本轮读取并使用，下个消息将可作为常规已安装 skill 识别。版本化安装哈希见 [安装记录](skill-installation.json)。不采用 skill 中未核实的模型版本宣传作为技术依据。

## 验证证据

每图的 `.delivery.json` 记录 spec/artifact SHA-256、byte counts、9/9 showcase 与 composition；`.visual-check.json` 记录四种 desktop viewport 和明暗截图，自动证据的 visualReview 保持 pending。额外人工图片检查另存 `review-receipt.json`，不修改自动收据。统一入口 [Archify v3](diagrams/v3/index.html)。

文档链接、ICM cold-walk、需求 ID 唯一性和图/收据哈希在最终 QA 中检查。所有业务 test IDs 尚未执行，因为尚无正式业务应用；不拿图的通过状态充当业务测试通过。
