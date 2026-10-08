# HSAAS 项目导航

这是 HSAAS Visitor and Pass Management FYP 的规划工作区。
当前基线入口是 planning/README.md；应用实施状态见 planning/10_BASELINE_REVIEW.md。

| 当前任务 | 先读 |
|---|---|
| 了解需求与验收 | planning/03_REQUIREMENTS_AND_TEST_PLAN.md |
| 修改组件与安全边界 | planning/02_TECHNICAL_ARCHITECTURE.md |
| 修改数据、状态或 API | planning/04_DATA_MODEL_AND_API_PLAN.md |
| 初始化或修改 Implementation/ | planning/09_FOLDER_STRUCTURE.md / planning/11_ENVIRONMENT_AND_MANUAL_INITIALIZATION.md |
| 查找修改影响与依据 | planning/PROJECT_MAP.md |
| 手动初始化与环境 | planning/11_ENVIRONMENT_AND_MANUAL_INITIALIZATION.md |
| Coordinator 分配、模块 chat、答疑、审核与 merge | planning/12_THREE_MONTH_CHAT_PLAN.md / planning/01_DEVELOPMENT_PLAN.md |
| 查看长期架构图（动态 QR / coordinator 尚待同步） | planning/diagrams/v3/index.html |
| 查 UI | output/ui-redesign-v4/README.md |

每个任务只加载相关规范、必要输入与所属目录的 CONTEXT.md。
目录契约见 CONTEXT.md；planning 只保留当前版本。

代码规范：所有新写或修改的手写代码必须有英文注释，包括助手提供的代码示例。主要模块/类/函数说明职责，关键逻辑说明业务规则、设计原因与安全边界；代码变更时同步更新注释。所有 module chat 遵守，coordinator 审核后才可 merge。

最新开发方式（2026-10-08）：用户明确要求“不需要再 guide 我写了，直接帮我写，只不过代码里要写好注释英文”。已取消用户手写源码/逐步指导方式；模块获得自身一次开发许可后，由模块助手直接实现、测试、修复、写交接，coordinator 审核/merge。所有新增或修改代码必须有准确英文注释，不再要求用户逐步写代码或确认普通实现步骤。已有明确模块许可不重问，未有的仍按 planning/12 向用户申请一次；代码代写方式不自动扩展到未批准模块。旧文档/旧 chat 中手写限制由本规则覆盖。

模块启动权：每个 module 的 chat 与开发必须由用户手动开启和启动。coordinator/助手只规划任务和依赖，不代开 chat、不自动派发或启动模块开发，不因 READY、依赖完成、日期到达或审核通过而自动启动下一模块；用户启动后再记录状态。

本次明确授权例外（2026-10-08）：用户要求 coordinator 代开 M00–M04 五个独立 chat，使用 gpt-6.1-sol / high。先在 Local 做只读模块核对/契约准备；获各自开发许可后由模块助手直接实现，代码有英文注释。此授权不扩展至 M05–M11，不自动代开其他模块或并行修改共享 checkout；实施前按 planning/12 隔离分支/worktree。

最新沟通与许可规则（2026-10-08）：用户要求“让他们有问题主动发回给你，只需要向我索求每个 module 的开发权限”。授权 module chat 主动向 coordinator（01a11b84-212d-7273-93a5-5dc16c698bdb，host local）发送问题/进度/交接，也授权 coordinator 向模块回复决定与返修要求；技术/契约/依赖问题由 coordinator 处理，用户只审批各模块开发权限。每模块取得用户明确许可后才开发，许可在已批准范围内持续有效，不逐步骤重复求授权；由模块助手直接编写、测试和修复，操作反馈不是额外许可。准备/只读核对不需要开发许可，coordinator 的技术答复不能替代用户许可；详见 planning/12。

需要人类裁决时：模块仍先报 coordinator；coordinator 遇到实质 conflict、需求不清或不能确定如何选择，必须在本 coordinator chat 向用户提问，说明事实、选项、建议与影响，不能猜测后替用户决定。依赖该决定的动作等待答复，独立工作可继续。模块 chat 只请求自身开发许可，不把跨模块问题分散询问用户。

当前优先前端、基础后端、动态 QR；实体卡/reader 与 live MRN 待条件，WhatsApp/blockchain 默认 disabled。当前 chat 为 coordinator，各模块独立 chat。M00/M01 当前本地范围已验收；2026-10-09 用户明确要求“开启m02”，已授予 M02 开发许可，隔离后直接实施，不重复求许可。M03/M04 与后续模块仍未获开发许可。许可原文与工作协议见 planning/12。
