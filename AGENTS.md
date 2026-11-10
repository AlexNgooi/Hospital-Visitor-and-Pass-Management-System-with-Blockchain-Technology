# HSAAS 工作导航

当前入口：[planning/README.md](planning/README.md)。先读所属目录CONTEXT.md和任务相关规范，不加载整个历史证据树。

| 任务 | 先读 |
|---|---|
| 当前计划、交付状态 | planning/01_DEVELOPMENT_PLAN.md / planning/10_BASELINE_REVIEW.md |
| 需求与用户手测 | planning/03_REQUIREMENTS_AND_TEST_PLAN.md |
| 架构/安全、数据/API | planning/02_TECHNICAL_ARCHITECTURE.md / planning/04_DATA_MODEL_AND_API_PLAN.md |
| 修改位置与影响 | planning/09_FOLDER_STRUCTURE.md / planning/PROJECT_MAP.md |
| 本机运行/备份恢复 | Implementation/docs/runbooks/MANUAL_NATIVE.md |
| SQL测试环境 | Implementation/backend/LOCAL_TESTING.md |
| 后续Sui Testnet | planning/SUI_TESTNET.md |

当前授权：用户要求直接实施具体修改，手写代码有准确英文注释。使用隔离分支/worktree；普通实现步骤不重复求许可。当前优先UI与本机使用；不自动启动后续集成模块或其他聊天。

验证：只做必要源码/语法/类型/lint/构建检查，用户自己启动应用、数据库并进行浏览器/业务手测。NOT_RUN不能写PASS；历史证据只证明当时版本，不因文档整理改写成当前验收。

操作边界：不自动merge main、push、部署、重启已有服务或执行迁移，不修改原hsaas_db、不复制私有配置/密钥。正常应用及测试使用本机进程；SQL测试仅显式opt-in后在自己创建的精确随机schema中执行，不操作其他库或MySQL服务。Sui未来使用本机worker/CLI访问远程Testnet，当前disabled，不发布或发送交易。

已完成的模块协调记录与旧图不再作为当前指令；需要历史事实时查询Git和Implementation/docs/evidence/。不把旧聊天授权扩展到当前未请求的模块、消息或外部写入。
