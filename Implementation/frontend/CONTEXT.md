# frontend 契约

## 2026-11-16 dashboard space and scrolling

Pass returns now also uses the desktop viewport frame. Its active table and explicitly opened history dialog scroll and automatically load further batches, with no Previous/Next controls. Shared toast cards retain their existing duration/hover/focus handling and now use a 250ms exit fade (reduced-motion supported). The return confirmation modal holds its exact unresolved command and keeps recovery inside its focus boundary.

Staff headers retain the menu/account/sign-out controls and omit branding and inline route tabs. Counter and parallel-tab tools are removed from the main page; authorized multi-counter selection remains in the drawer. Desktop Overview and standalone Registration review use the available viewport height (at least 1024px wide and 560px high); their queues scroll internally with sticky headers, visible pagination and keyboard access. Smaller or highly zoomed windows retain natural page reflow instead of clipping controls. Compact QR help and manual-copy fallback use dialogs to avoid enlarging the dashboard. Browser visual/business acceptance remains user-run / NOT_RUN.

- **输入规范**：[需求与验收](../../planning/03_REQUIREMENTS_AND_TEST_PLAN.md)、[数据/API](../../planning/04_DATA_MODEL_AND_API_PLAN.md)、[UI v4](../../output/ui-redesign-v4/README.md)；目录边界见 [目录计划](../../planning/09_FOLDER_STRUCTURE.md)。
- **单一职责**：React + TypeScript + Vite Web 公共框架、角色导航、登录与 typed API/CSRF client。M01 独立 UI/client 检查已有证据；真实 M00 session/CSRF 联调和业务页面尚未验收。授权与业务规则以服务端为准。
- **输出**：src/ 内界面与客户端代码、public/ 内公开资源、package.json 与 pnpm-lock.yaml；dist/ 为构建产物，不提交。后续验证证据保存到 ../docs/evidence/。
- **验证命令**：在本目录执行 `pnpm run build`、`pnpm run lint`、`pnpm run typecheck:test`、`pnpm test`、`pnpm run test:proxy`；proxy 测试使用显式 synthetic HTTP fixture，不是后端业务验收。开发启动执行 `pnpm run dev`，以终端显示的地址访问；只使用 pnpm 管理依赖。
- **共享接入**：本模块唯一维护入口/router/CSS/依赖/client/generated/proxy；后续模块按 README 的 FeatureSlot、useAuth、useCounterScope 与 memory entryVault 契约接入，跨模块决定由 coordinator 管理，不直接改共享入口。所有新写/修改代码有英文注释。
- **人工检查**：按阶段核对四类别、权限、loading/error 与 UI v4；批准不提前承诺 Pass ID；客户端资源和环境变量不包含数据库密码、私钥或真实 PII。

## 2026-11-11 UI feedback and account selection

- Card enrollment uses a controlled Radix modal with visible code/category/destination fields, cancellation, initial input focus and pending/UNKNOWN close guards. Recovery keeps the original command inside the modal's focus boundary.
- `components/ui/toast.tsx` owns transient error/success/info feedback, native form-validation feedback and a shared live viewport above dialogs. Toasts expire after 5 seconds (success) or 9 seconds (error/info), pause while being read, and allow dismissal. Recovery controls and required business records remain in their pages. Invalid fields retain accessible descriptions; input values and backend error bodies never become toast text.
- Staff accounts default to the signed-in administrator. A dropdown selects an account's details, role permissions and explicit counter grants; existing account editing and counter-access commands retain server-side version and revocation checks.
- Build/lint passed on this branch. Test-source typechecking fails in the unchanged registration fixtures (old schema literal and missing patient projection). Application, browser, business and database checks remain user-run / NOT_RUN.
