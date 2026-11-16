# HSAAS 当前规划

更新：2026-11-16。这里只维护当前有效规范；已替代的模块聊天记录、旧图、原型资产和生成脚本已删除，历史版本可从 Git 查询。应用验收记录保存在 Implementation/docs/evidence/，不作为当前启动命令。

| 需要做什么 | 入口 |
|---|---|
| 当前优先级、开发和交接方式 | [01 开发计划](01_DEVELOPMENT_PLAN.md) |
| 组件、安全、动态 QR 和后续外部集成 | [02 技术架构](02_TECHNICAL_ARCHITECTURE.md) |
| 四类表单、手动 pass、验收与业务来源 | [03 需求与验收](03_REQUIREMENTS_AND_TEST_PLAN.md) |
| 数据、事务、API 与兼容规则 | [04 数据/API](04_DATA_MODEL_AND_API_PLAN.md) |
| 风险与未决前提 | [05 风险](05_RISK_REGISTER.md) / [10 当前状态](10_BASELINE_REVIEW.md) |
| 代码位置与修改影响 | [09 目录](09_FOLDER_STRUCTURE.md) / [PROJECT_MAP](PROJECT_MAP.md) |
| 本机环境、启动与测试 | [11 环境](11_ENVIRONMENT_AND_MANUAL_INITIALIZATION.md) |
| 后续连接 Sui Testnet | [Sui 本机接入计划](SUI_TESTNET.md) |
| 直接运行最新版 | [本机运行指南](../Implementation/docs/runbooks/MANUAL_NATIVE.md) |

当前应用使用本机 Node/pnpm、Java 21 和 MySQL。后续 Sui worker 也在本机运行，通过远程 Testnet 接口交互；不自建 full node。通知与区块链当前 disabled，尚未实施或发布 Testnet 合约。

M00–M07 与 R01–R03 已在本机 main 合并；2026-11-10用户明确要求合并并推送main，本轮最新UI、并行页面、Copy link、本机启动和planning清理一并纳入main。源码更新不会自动替换运行版。构建成功不等于已迁移数据库或通过用户手测。准确状态只在 [10](10_BASELINE_REVIEW.md) 维护。

2026-11-16 用户明确要求 GitHub 与本机 main 同步，本次发布纳入 `codex/visitor-review-issue-dashboard` 至 `1866a6c`：Overview/审核发卡、归还与历史导出、No pass、staff 面包屑和库存命名。已有 9 张库存的改名是先前明确请求的独立本机数据维护，不会随 Git 推送复制或自动重跑。

文档检查：`python planning/verify_planning.py`，只检查规划引用和必备入口，不启动应用或数据库。
