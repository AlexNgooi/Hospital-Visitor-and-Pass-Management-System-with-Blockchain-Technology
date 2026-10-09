# M01 UI maintenance handoff — 2026-10-09

登录页在 session unavailable 加空表验证错误时，重复的规则摘要和留白把操作与页脚推到屏幕外。本次缩短摘要为可聚焦的 Username / Password 链接，完整规则保留在字段旁；恢复检查与登录按钮并排，并收紧工作区概览的留白。角色入口、disabled 状态、aria-live、错误关联和 UNKNOWN logout 的 fail-closed 行为保留。所有修改的手写逻辑有英文职责与规则注释。

基线：`6bb3893f3f056db6a15e16f2bca6f955b4623d40`；运行源码：`ed5875ae4a803f6abe040c098e2b402693b30bf9`。Coordinator 已报告正式合并为 main `1da1925b7fa93c48a511030a0c21fc7972ea419d`。本交接提交仅额外增加 overview CLI 独立表达式的一行英文 lint 说明与证据，未再改变运行源码。

M02 提出的长 counter ID 共用选择器问题也已修复：原生 select 允许收缩并限制到容器内；16 位 option/value 字符串不截断、不转为数字。未修改 backend、auth/API/session、main.tsx、依赖、M02 或 planning，也未迁移 UI 依赖。Real-integration browser 脚本仅更新概览标题的 readiness locator，本轮没有重跑真实后端联调。

测量来自本模块的 Chromium dist preview 和明确 synthetic HTTP fixture。Coordinator 报告的修复前 790×885 状态：页面高 1092px、页脚 bottom 1063.7px。修复后的同类 session failure + 空表错误状态如下（px）：

| 请求视口 | 实际页面高度 | 操作 bottom | 页脚 bottom |
|---|---:|---:|---:|
| 1366×768 | 768 | 596.5 | 704.7 |
| 1440×900 | 900 | 662.5 | 770.7 |
| 790×885 | 886* | 698.6 | 802.8 |
| 375×812 | 812 | 662.8 | 766.9 |
| 390×844 | 844 | 678.8 | 782.9 |

*Chromium device-pixel rounding 使 innerHeight 为 886；操作与页脚仍在请求的 885px 内。Staff/admin 手机概览的后续严格检查均等于视口高度；短横屏 812×375 的 690px 内容可正常滚动到页脚。

`pnpm run typecheck:test`、`pnpm run build`、69/69 单元测试均通过。源码交接时 lint exit 0 / 1 warning；经 coordinator 批准补齐 CLI 注释后再次 lint exit 0 / 0 warning。

浏览器证据保留阶段归属：37 状态矩阵在最终概览间距后、选择器宽度修改前执行；随后在最终 CSS 上检查 4 个 staff/admin 手机概览、2 个长 ID 选择器状态和 1 个纠正后的 CDP reflow 状态。矩阵包含五组登录正常/错误尺寸、六个预留路由、权限限制、BM 公共占位、404、bootstrap loading/error、UNKNOWN logout/retry。所有记录的 axe violations 为 0，无未捕获 JS 错误，非法表单登录 POST 为 0；相关操作尺寸至少 44px。详情、阶段时间及 20 张截图 SHA256 见 [ui-maintenance-verification.json](ui-maintenance-verification.json)。代表性截图已人工查看。

200% 检查使用 CDP 有效视口 683×384 / DPR 2.5 的桌面 reflow 模拟，以及 CSS zoom 2 的选择器模拟。**Native browser toolbar zoom 为 NOT_RUN。** 极窄 CSS zoom 2 specimen 中工作区 badge/长标题仍显拥挤；此项只证明选择器容器边界和完整字符串值，不作为整个工作区原生 200% 验收。生产 HTTPS、实体手机 camera 和真实 QR 业务本轮均 NOT_RUN；历史联调证据保持独立。

过程中已修正：初次 root/文件搜索错误、Testing Library 不支持的 `getByRole exact` 导致 TS2769、38px sign-out target、手机概览 41px 溢出，以及 CDP 与 Playwright viewport 不一致的截图。最终类型检查与对应目标检查通过；错误的 reflow 截图已替换，旧矩阵测量按阶段保留。

已关闭本模块浏览器 `hsaas-m01-ui`，停止自有 15196/15197 服务并确认端口不再监听；用户 5173 仍监听，native DB/.env 未触碰。交回 coordinator 审核本提交，模块未自行 merge/push。
