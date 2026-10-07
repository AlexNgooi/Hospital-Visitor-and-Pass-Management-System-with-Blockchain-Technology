---
type: folder-plan
revision: v3
updated: 2026-10-05
status: proposed-implementation
---
# 目录结构与模块契约

现有工作区为规划/原型库。下面 `[现有]` 为当前文件，`[计划]` 只表示实施目标；没有为未实现功能创建空目录或搬动旧文件。ICM 组织文档和上下文，应用运行仍依靠 Spring/DB/worker 代码。[Archify 目录导航](diagrams/v3/02-folder-structure.html) 是阅读与集成关系；完整父子层级以下树为准。

```text
FYP Dev/
├── AGENTS.md                         [现有] 小型任务路由
├── CONTEXT.md                        [现有] 工作区契约
├── proposal.pdf                      [现有] 简写，实际完整文件名保留
├── planning/                         [现有] 规范唯一事实归属
│   ├── README.md / CONTEXT.md / PROJECT_MAP.md
│   ├── 01_DEVELOPMENT_PLAN.md         2026-10-05 至 2027-01-03 三个月计划
│   ├── 02_TECHNICAL_ARCHITECTURE.md   v3 架构
│   ├── 03_REQUIREMENTS_AND_TEST_PLAN.md
│   ├── 04_DATA_MODEL_AND_API_PLAN.md
│   ├── 05_RISK_REGISTER.md / 06_TRELLO_BOARD_GUIDE.md
│   ├── 07_FIGMA_UI_SPEC.md            导航到 UI v4
│   ├── 08_MERMAID_DIAGRAMS.md         从 Archify 源生成语义镜像
│   ├── 09_FOLDER_STRUCTURE.md / 10_BASELINE_REVIEW.md
│   ├── 11_ENVIRONMENT_AND_MANUAL_INITIALIZATION.md
│   ├── 12_THREE_MONTH_CHAT_PLAN.md
│   ├── _templates/                   稳定模板；与实例分离
│   ├── diagrams/v3/                  Archify JSON / HTML / receipts / QA
│   └── figma_assets/                 当前 Figma 导入基础资产
├── output/                           [现有] 静态成果
│   ├── CONTEXT.md
│   ├── ui-redesign-v4/               最新交互/一条消息原型
│   ├── ui-redesign-v3/               历史原型
│   └── pdf/                         历史实施指南（有被覆盖条款）
├── tmp/                              [现有] 检查/解析的中间文件
├── Implementation/                   [现有] 正式开发代码边界；使用根 Git 仓库
│   ├── CONTEXT.md                    [计划] 实现区输入、职责、输出与验证入口
│   ├── frontend/                     [手动初始化] React + TypeScript + Vite
│   │   ├── CONTEXT.md
│   │   ├── src/
│   │   │   ├── app/                 router / providers / auth bootstrap
│   │   │   ├── features/
│   │   │   │   ├── registration/    四类别表单/consent/receipt
│   │   │   │   ├── counter/         review / QR / scan / issue / return
│   │   │   │   ├── administration/  users / cards / settings / reports
│   │   │   │   └── audit/           proof / notification status
│   │   │   ├── components/ui/       shadcn primitives
│   │   │   ├── lib/                 API client / CSRF / time / errors
│   │   │   └── generated/           OpenAPI TS types，生成不手改
│   │   ├── tests/                   component tests
│   │   └── vite.config.ts / vercel.json / package.json / lockfile
│   ├── backend/                      [手动初始化] Java 21 / Maven / Spring Boot
│   │   ├── CONTEXT.md / pom.xml / mvnw.cmd
│   │   ├── src/main/java/edu/upm/hsaas/
│   │   │   ├── auth/                session / user policies
│   │   │   ├── registration/        fields / consent / verification
│   │   │   ├── card/                inventory / enrollment / lost cases
│   │   │   ├── assignment/          issue / return / state transactions
│   │   │   ├── reader/              devices / scan jobs / fencing
│   │   │   ├── hospital/            MRN adapter interface / mock / manual
│   │   │   ├── audit/               immutable snapshots / verification jobs
│   │   │   ├── notification/        one-message queue / poller / adapter
│   │   │   ├── monitoring/          overdue scheduler / alerts / followups
│   │   │   ├── administration/      protected settings / accounts
│   │   │   ├── reporting/           golden-metric queries / masked exports
│   │   │   ├── config/              security chains / datasource / jobs
│   │   │   └── common/              errors / clocks / idempotency primitives
│   │   ├── src/main/resources/db/migration/
│   │   └── src/test/java/edu/upm/hsaas/  MySQL integration + module tests
│   ├── reader-agent/                 [按阶段手动初始化] 独立 Java Maven 工程
│   │   ├── CONTEXT.md / pom.xml
│   │   ├── src/main/java/.../device/ PC/SC transport + approved parser
│   │   ├── src/main/java/.../jobs/   claim / cancellation / lease / upload
│   │   ├── src/main/java/.../http/   token-auth HTTPS client
│   │   └── packaging/               Windows installer/service runbook
│   ├── sui-worker/                   [按阶段手动初始化] 私有 TypeScript 进程
│   │   ├── CONTEXT.md / package.json / lockfile
│   │   ├── src/outbox/              polling / lease / retry
│   │   ├── src/sui/                 gRPC / wallet / transaction / reconcile
│   │   ├── src/verification/        read proof / bind result
│   │   ├── src/contracts/           minimal shared audit envelope types
│   │   └── tests/                   failure/replay/SDK smoke
│   ├── move/                         [按阶段手动初始化] Sui Move package
│   │   ├── CONTEXT.md / Move.toml
│   │   ├── sources/audit.move       registry / capability / idempotent anchor
│   │   └── tests/                   duplicate eventId / writer / mismatch
│   ├── infra/                        [手动初始化] 环境与发布
│   │   ├── CONTEXT.md / compose.yaml / .env.example
│   │   ├── containers/              backend / worker build definitions
│   │   └── environments/            synthetic profiles / release manifest
│   ├── docs/                         [手动初始化] 运维与研究证据
│   │   ├── CONTEXT.md / adr/ / runbooks/
│   │   ├── api/                     generated OpenAPI / ERD
│   │   ├── uat/                     scenarios / SUS / approvals
│   │   └── evidence/                per-requirement results + bindings
│   └── tests/                        [按阶段手动初始化] 跨模块 E2E / fixtures / performance
│       └── CONTEXT.md
└── .github/workflows/                [计划] 各模块 CI，默认不自动发链交易
```

## 边界和依赖方向

`Implementation/` 是正式代码和实施证据边界，不在其中再次 `git init`。backend 按域分包，各域内采用 controller/DTO/service/repository（仅需要时创建），避免一个全局 controllers/services/entities 目录混合所有业务。HTTP controller 只负责请求、校验和 DTO；service 管规则/事务；repository 管持久化；外部 adapter 在事务外执行。

frontend -> backend API；reader-agent -> backend device API；backend -> MySQL/MRN/WhatsApp；sui-worker -> 受限 DB + Sui；Move 不读取 off-chain 数据。reader-agent 与 sui-worker 无直接运行时依赖；目录图中的虚线表示不同集成文档间导航。共用数据契约由 OpenAPI 和 audit schema 版本管理，不跨 Java/TS 共享业务实现代码。

## 每个计划工作目录的 CONTEXT.md 契约

初始化模块时创建一份短契约：exact inputs、单一职责、输出位置、验证命令和人工检查；业务内容链接到主规范。

| 目录 | 精确输入 | 输出 | 检查重点 |
|---|---|---|---|
| Implementation/frontend | `../../planning/03_REQUIREMENTS_AND_TEST_PLAN.md`、`../../planning/04_DATA_MODEL_AND_API_PLAN.md`、`../../output/ui-redesign-v4/README.md` | typed UI/client；pnpm build 与 component evidence | 四类别、权限、loading/error、不承诺未发卡数据 |
| Implementation/backend | `../../planning/02_TECHNICAL_ARCHITECTURE.md`、`../../planning/03_REQUIREMENTS_AND_TEST_PLAN.md`、`../../planning/04_DATA_MODEL_AND_API_PLAN.md` | API、migrations、session/jobs；Maven/MySQL test evidence | atomic lifecycle、RBAC、CSRF、callback/scan fencing |
| Implementation/reader-agent | `../../planning/02_TECHNICAL_ARCHITECTURE.md`、`../../planning/04_DATA_MODEL_AND_API_PLAN.md` + `../docs/` 实际 reader profile | Windows agent/installer | 真机 UID/category、移卡、离线、旧任务拒绝 |
| Implementation/sui-worker | `../../planning/02_TECHNICAL_ARCHITECTURE.md`、`../../planning/04_DATA_MODEL_AND_API_PLAN.md` + Move audit ABI/env manifest | private worker/proof evidence | chain idempotency、unknown submit、钱包权限、无 PII |
| Implementation/move | `../../planning/02_TECHNICAL_ARCHITECTURE.md`、`../../planning/04_DATA_MODEL_AND_API_PLAN.md` + canonical proof schema | package/registry/Move tests | writer capability、eventId 去重、承诺读取 |
| Implementation/infra | `../../planning/02_TECHNICAL_ARCHITECTURE.md` + release manifest | local compose/部署配置 | secret isolation、proxy/session、restore |
| Implementation/docs / tests | `../../planning/03_REQUIREMENTS_AND_TEST_PLAN.md` + implementation commit/artifact | OpenAPI/ERD/UAT/runbooks/results | 指标可重算，NOT_RUN/PASS 真实，链接可打开 |

`Implementation/*/CONTEXT.md` 必须使用表中的完整相对路径；从一级模块回到规划目录统一是 `../../planning/`，不能写成旧的 `../planning/`。

## ICM 使用与状态

稳定 references=主需求/架构/数据规范与模板；run products=图、测试收据、UAT 和每次变更记录。根 AGENTS 小于 60 行，只负责路由；PROJECT_MAP 给一阶修改影响。业务实现完成状态需扫描实际代码/test evidence，而不是看到“规划目录有文件”就标完成。

2026-10-05 已删除 planning 的历史快照、v2 图和 v2 临时预览；当前入口与引用已同步。`Implementation/` 目录结构由开发者手动建立；空目录不代表功能实现。
