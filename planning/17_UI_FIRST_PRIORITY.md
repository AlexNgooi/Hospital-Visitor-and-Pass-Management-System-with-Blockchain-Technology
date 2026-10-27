# UI 优先 — 2026-10-27

用户原话：“目前feature 开发 可以暂缓 先把 ui 做好”。这是当前工作优先级；暂停新增业务功能，不撤销或丢弃已完成的模块。

## 已核实进度

- M00–M06：当前范围代码已合并本机 main。M07：手动验收案例、runbook 和交付证据已合并；文档交付不等于所有业务验收通过。
- R01 登记/MRN/审核、R02 手动库存/发还卡、R03 管理/设置/报表：源码审核完成，整合分支 `codex/manual-pass-integration` 交付 `7af5659`。组合后端打包、前端 build/lint 通过。
- R01–R03 已按用户后续明确要求无冲突合并本机 main，merge `c4cf3d3`。尚未执行 V8/V9 迁移或完成业务手测；MRN 为 synthetic mock，不是 live 医院 API。独立 UI polish 尚未合并。
- M08–M11：仍 deferred，不启动。
- UI/UX Pro Max：本地 `C:/Users/alexy/.codex/skills/ui-ux-pro-max/SKILL.md`、scripts/search.py 及 data 存在，搜索脚本实际运行成功。不是仅保存一个下载链接。

## UI 工作基线与方向

分支 `codex/ui-first-polish`，基线 `7af5659`，独立 checkout：`C:/Users/alexy/Documents/Codex/2026-10-27/mu/work/hsaas-ui`。原整合 checkout 和运行中 demo 不变。只允许必要前端静态/构建检查，业务手测由用户进行；不启动服务/数据库，不自动合并 main、push 或部署。

保留 UPM 红 `#CA0026`、白色工作区、已打包的 Geist 和 Lucide 图标。Pro Max 返回的 Minimalism & Swiss Style 可作为视觉参考，但其 landing-page pattern 和替代蓝橙配色不适配本项目；收窄的 product 查询也没有匹配。布局依据项目实际柜台流程和一般界面原则，不把无匹配搜索冒充医院模板。React form 搜索结果偏提交架构，本轮不据此重写表单逻辑。

## 第一批完成

- 工作台：首页改为角色专属标题、主要入口、柜台三步流程和各工具用途说明；链接来自现有角色过滤后的 slots。
- 通用导航：更清楚的选中指示、文字层级、面包屑换行和柜台选择区域。
- 共享视觉层：卡片、表单边框、错误边框、表头、行悬停、数字对齐、指标卡和移动布局。
- 访客登记：延续紧凑手机布局，统一字段间距、多地点选项与步骤分隔；不改 QR/grant/校验/提交逻辑。
- 首页不添加虚构 KPI，明确手动 pass handling，保留未启用服务状态。

修改代码：`Implementation/frontend/src/app/shell.tsx`、`Implementation/frontend/src/app/workspace-theme.css`、`Implementation/frontend/src/main.tsx`。没有新增依赖或修改 lockfile、后端、迁移和业务规则。

## 验证与剩余 UI 工作

2026-10-27：`pnpm install --frozen-lockfile --ignore-scripts`、`pnpm run build`、`pnpm run lint`、`git diff --check` 均通过；原有 >500kB bundle 提示仍存在。没有运行测试套件、浏览器或业务验收；构建成功不等于视觉验收。

后续 UI 检查顺序：用户查看预览与实际浏览器页面 → 柜台审核/发还卡的具体状态 → 管理库存/报表 → 四类访客完整表单 → loading/empty/error/窄屏/键盘细节。当前第一批为已构建的共享 UI 改进，不声明整个系统 UI 已完成。
