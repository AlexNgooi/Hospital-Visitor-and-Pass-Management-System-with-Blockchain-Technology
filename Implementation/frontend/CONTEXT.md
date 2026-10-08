# frontend 契约

- **输入规范**：[需求与验收](../../planning/03_REQUIREMENTS_AND_TEST_PLAN.md)、[数据/API](../../planning/04_DATA_MODEL_AND_API_PLAN.md)、[UI v4](../../output/ui-redesign-v4/README.md)；目录边界见 [目录计划](../../planning/09_FOLDER_STRUCTURE.md)。
- **单一职责**：React + TypeScript + Vite Web 公共框架、角色导航、登录与 typed API/CSRF client。M01 独立 UI/client 检查已有证据；真实 M00 session/CSRF 联调和业务页面尚未验收。授权与业务规则以服务端为准。
- **输出**：src/ 内界面与客户端代码、public/ 内公开资源、package.json 与 pnpm-lock.yaml；dist/ 为构建产物，不提交。后续验证证据保存到 ../docs/evidence/。
- **验证命令**：在本目录执行 `pnpm run build`、`pnpm run lint`、`pnpm run typecheck:test`、`pnpm test`、`pnpm run test:proxy`；proxy 测试使用显式 synthetic HTTP fixture，不是后端业务验收。开发启动执行 `pnpm run dev`，以终端显示的地址访问；只使用 pnpm 管理依赖。
- **共享接入**：本模块唯一维护入口/router/CSS/依赖/client/generated/proxy；后续模块按 README 的 FeatureSlot、useAuth、useCounterScope 与 memory entryVault 契约接入，跨模块决定由 coordinator 管理，不直接改共享入口。所有新写/修改代码有英文注释。
- **人工检查**：按阶段核对四类别、权限、loading/error 与 UI v4；批准不提前承诺 Pass ID；客户端资源和环境变量不包含数据库密码、私钥或真实 PII。
