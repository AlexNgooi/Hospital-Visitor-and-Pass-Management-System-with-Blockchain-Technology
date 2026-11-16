# 当前状态与外部未决项

更新：2026-11-16。此文件是交付状态的唯一规划入口；历史聊天/阶段计划不再覆盖它。

| 范围 | 已知事实 | 尚未完成的验证 |
|---|---|---|
| M00–M07 | 登录、QR、登记/审核、生命周期/管理及交付资料已合并本机main | 不继承早期单模块PASS作当前完整验收 |
| R01–R03 | 已于2026-10-27合并main，merge `c4cf3d3`；当前包含V8/V9 | 新库迁移、当前完整业务与恢复手测待用户执行 |
| UI polish | `ccfca27`，角色工作台与共享视觉，已纳入main | 浏览器视觉/窄屏/键盘验收待执行 |
| 本机启动/并行页面/Copy link | 本地提交 `c82c3eb`，已纳入本次main合并 | 未启动应用、数据库、迁移或浏览器 |
| 当前清理 | `5fea768`：planning合并、旧资产删除、依赖移除及本机测试隔离，已纳入main | 静态/构建结果记本轮handoff；新native测试未执行 |
| 库存 modal / Toast / 账号查看 | 来源分支 `codex/card-enrollment-toast`，实现提交 `1e09a6a` / `90c1e40`：登记与Open card详情modal、查看图标按钮、共享轻提示、账号下拉选择，默认当前登录账号及权限；纳入本次main发布 | 实现版本build/lint通过；测试源码类型检查FAIL（未修改的registration旧fixture）；浏览器/业务/数据库NOT_RUN，运行版未重启 |
| Overview / 合并审核发卡 | 2026-11-16 用户确认预览并授权实施；分支 `codex/visitor-review-issue-dashboard`：默认动态 QR＋队列、queue-only review、自动审计资料 modal、原子 APPROVE_ISSUE、多卡/地点/期限及 Pass returns；尚未合并 main | 前端 build/lint、后端 skip-tests package、planning 检查通过；typecheck:test 仍 FAIL（未改动的 registration fixture 旧 schema/缺 patient）；应用/浏览器/数据库/并发/业务全部 NOT_RUN |
| Sui/通知 | 默认disabled；无真实调用、合约发布或历史补发 | Sui worker/Move、provider接口与真实验收均未实施 |

2026-11-10用户明确要求“github push main”，授权将独立分支 `codex/no-docker-multi-page`（交付head `5fea768`）合并并推送main。旧文档冲突按当前规范解决，当前运行指南改为主项目checkout。没有部署、启动/重启应用、执行数据库迁移或删除旧数据；Git发布不代表业务验收。

2026-11-16用户再次明确要求“github push main”，授权将 `codex/card-enrollment-toast` 的库存modal、共享toast和账号查看改动纳入main并推送GitHub。本次发布保留既有静态检查结论和未通过的旧测试类型检查记录；未启动或重启应用、数据库，未执行迁移或浏览器/业务验收。

## 待确认事项

| ID | 项目 | 当前选择/放行依据 |
|---|---|---|
| O01 | 正式IC/MRN采集、字段用途与保留政策 | 本机演示仅合成资料；需医院批准 |
| O04 | live MRN endpoint/auth/response/sandbox | MOCK与人工核实；需获批接口与测试凭据 |
| O05 | 通知provider/template/opt-in/幂等对账 | disabled，不创建任务；独立授权后实施 |
| O06 | LOST/恢复与院方办理政策 | 保留当前受控理由/审计与历史，不冒充院方签署 |
| O07 | session/TTL、性能/UAT样本、RPO/RTO | 工程默认/目标须实际测试与批准 |
| O08 | 部署与同源HTTPS | 当前本机运行；跨设备HTTPS、托管/网络暴露另行验证 |
| O09 | QR展示位置、网络与真机可用性 | 30s/45s/20min默认；本机loopback不等于手机可达 |
| O10 | Sui package/network/钱包与gas、provider限额 | 本机worker接远程Testnet，具体实施见SUI_TESTNET.md；当前不发布交易 |

Penjaga仅IC、每登记最多一张活动pass、条款勾选并记录服务器时间、发还时间即“进/出”均已确认，不再列为未决。真实reader已经退出当前流程，不将硬件准备当作本版前置。

## 2026-11-16 Overview 与一站办理分支交接

- 隔离 worktree：`C:/Users/alexy/.codex/worktrees/visitor-review-issue-dashboard/FYP Dev`；分支 `codex/visitor-review-issue-dashboard`，基于 main `828fa75`。主项目源码未替换，未自动 merge/push/部署。
- Overview 直接组合动态 QR 与同一套 Registration queue；独立 QR 页自动准备入口。Registration review 只列队列；modal 打开自动调用原受权/version/审计的 review-fields POST，关闭及权限/版本/冲突变化清除敏感内存。搜索明确限定当前队列页。
- modal 同屏核对资料、选择卡片/地点/逐卡期限；最终按钮明确确认人工比对和实体交付，无 Reveal/Display 或核对 checklist。拒绝仍需理由；旧 Approved 登记继续在同一 modal 发卡。Pass returns 保留查询、归还和历史。
- `POST /api/staff/card-assignments/approve-and-issue` 在既有 READ_COMMITTED lifecycle 事务中通过登记 port 完成审批、发放、库存、审计和幂等提交；任一卡失败全部回滚。原 verify/issue API 及旧 ISSUE 编码保持兼容，无新增或执行 migration。UNKNOWN 保留原 body/key/version，仅显式重试原命令；pending/UNKNOWN 禁止关闭 modal。
- 实际静态检查：`pnpm run build` PASS；`pnpm run lint` PASS（无警告）；`.\mvnw.cmd -B -DskipTests package` PASS（编译测试源码但不执行测试）；`python planning/verify_planning.py` PASS；`git diff --check` PASS。Vite 仍提示单 chunk 超过 500 kB，后端仍提示 RegistrationStore 的 deprecated API。
- `pnpm run typecheck:test` FAIL：`tests/registration.test.tsx` 的 22/184 行旧 schema literal 和 34 行缺 patient projection，和既有基线同类，测试文件本轮未修改。不能写为通过。
- 未启动或重启应用/数据库/浏览器，未执行任何测试套件、迁移、SQL、业务/并发或恢复验收；相关结果全部 NOT_RUN。用户手测步骤已更新在 [MANUAL_R01_R03](../Implementation/docs/runbooks/MANUAL_R01_R03.md)，环境边界仍依 [MANUAL_NATIVE](../Implementation/docs/runbooks/MANUAL_NATIVE.md)。

## 2026-11-16 用户明确要求启动后的运行记录

- 上述实现阶段的应用 NOT_RUN 已由本次显式启动授权更新；浏览器/数据库业务/并发验收仍 NOT_RUN。
- 通过原私有控制端点停止旧的这一组应用子进程，再以 worktree 新版源码/JAR 启动；MySQL 进程与专用演示数据保留。启动器 --runtime-root 参数就地复用原配置/keys/control，没有复制私有文件；--no-migrate 明确禁用 Flyway，没有 initialize/seed/restore/迁移。
- 当前访问 `http://127.0.0.1:15417/login`；backend18407/control15418。源码仍在 `codex/visitor-review-issue-dashboard`，main 未合并/推送。
- 实际结果：launcher READY；backend `/api/health` HTTP 200；frontend `/login` HTTP 200；Vite 提供新版 Review & issue pass modal 源码；Java 命令含 --spring.flyway.enabled=false。这仅证明启动与源码提供，不等于浏览器/业务验收。
- 启动器 node --check 与 backend dependency:build-classpath 通过。浏览器视觉/手机 QR/审批与发卡/并发/恢复测试仍 NOT_RUN。停止与下次启动方式见 MANUAL_NATIVE 的隔离分支段落。

## 2026-11-16 浏览器批注后的布局调整

- 用户要求移除 staff header 品牌/医院名称与 Overview、Registration review、Pass returns 横向链接，删除柜台/新标签工具栏；现保留菜单、账号和退出，多柜台选择移入菜单。
- 桌面 Overview（至少 1024×560）按视口分配高度，压缩标题/QR/页脚间距；多条登记只在队列表格内滚动，表头固定、分页保留、滚动区可键盘聚焦。小屏/高倍缩放继续自然重排，避免裁切。QR 帮助和手动复制备用内容使用弹窗，避免撑高主页面。
- 本轮仅前端源码/CSS改动，运行中的 Vite 使用当前 worktree；未重启应用/数据库、未迁移。前端 build/lint、文档检查和 diff 检查通过；未进行浏览器、业务或数据库验收，不能将布局实现写为视觉验收通过。

## 2026-11-16 姓名预览和连续扫码

- 用户要求 staff queue 正常展示姓名前 12 字符，超长省略。当前新增受当前柜台权限保护的 visitorDisplayName 预览字段；服务端按 Unicode 字符截断，前端单行防溢出；旧 maskedVisitorName/证件/电话/报表边界保留，无 migration。
- 源码确认当前 QR challenge 支持独立匿名会话交换各自 grant；消费的是各访客单次 grant，未消费共享 QR。相同浏览器只有一份未提交表单。修复 RegistrationPage 完成后未订阅新扫码、一直显示旧 receipt 的路径：完成页继续订阅临时 entry vault，新扫码才进入新 exchange，pending/UNKNOWN 不丢弃原命令；不增加无 QR 入口。
- 实际检查：前端 build/lint PASS；后端编译通过，首次 package 因运行中的 Windows JAR 无法重命名而 FAIL。经原私有控制端点停止这套应用后，skip-tests package PASS，再以 --no-migrate 与原 runtime-root 启动，launcher READY、backend health 和 frontend login HTTP 200。没有重启 MySQL、迁移、seed、恢复或复制私有文件。
- 多访客扫码、相同浏览器连续提交、长姓名和 UNKNOWN 场景仍由用户手测（NOT_RUN）；未执行浏览器、业务提交或测试套件。实现仍在同一隔离分支，未合并 main 或 push。

## 2026-11-16 独立 Registration review 页面高度

- 用户批注指出 /staff/registrations 仍发生整页滚动。现将该路由与 Overview 共用桌面视口框架：标题、筛选、分页及页脚保留，表格获得剩余高度并单独滚动；不通过隐藏页面 overflow 裁切内容。较小窗口和高倍缩放保持自然重排。
- 前端 build/lint 与文档/diff 检查通过；仅修改共享 shell/CSS 和说明，未重启服务、执行数据库操作或浏览器验收。实际 1480×667 视觉效果与多行队列仍由用户检查（NOT_RUN）。

## 2026-11-16 Pass returns / history 实施

- 依用户确认的设计在同一 `codex/visitor-review-issue-dashboard` 实施：移除 Counter/登记列表/Registration ID；主页面只列未归还 Issued/Overdue pass，显示姓名前 12 字符、类别、Pass ID、地点、状态和 Return pass。Return pass 打开受审计基本资料 modal，Confirm return 明确确认收到该实体卡，单卡成功才移除该行并显示约 5 秒、250ms 渐隐 toast。
- View pass history 主动打开已实际归还记录；Time period 下拉 This day/month/year/Customize，只有 Customize 显示 Start date/End date/Apply。按 MYT returned_at 整天范围筛选；CSV 遍历全部匹配批次、使用完整 Pass ID 与安全姓名预览、转义公式并提交导出审计。超出 5000 行/响应体上限明确失败，不能部分导出或只导出当前已加载行。
- Pass returns 与 history 的 Previous/Next 已全部移除，使用有界 keyset 查询与表格内部滚动自动加载。桌面主页面保持标题/筛选/底部信息可见；小屏/缩放自然重排。搜索取消并隔离旧响应；新搜索值置于 CSRF POST body，不写入 URL、日志或持久浏览器状态。权限变化清除数据；归还冲突/UNKNOWN 保留原命令并在 modal 内恢复。
- 新 API：POST /api/staff/passes/search、POST /api/staff/passes/history-export；当前柜台/会话/角色和来源环境约束保留。登记 root 批量提供姓名/类别与搜索结果布尔值，不复制其 SQL/JSON 到生命周期模块。原发放/归还接口保留，无 migration。
- 实际检查：前端 build/lint PASS（无 lint 警告）；后端 compile/test-compile、skip-tests package PASS；planning 与 diff 检查 PASS。测试套件未执行。typecheck:test 仍 FAIL 于未修改的 registration fixture 22/34/184 行（旧 schema 与缺 patient），没有将其记为 PASS。构建仍有既有单 chunk 大小/deprecated API 提示。
- 已经原私有 control 停止并重新启动这组演示应用，沿用原 runtime-root、--no-migrate；没有重启 MySQL、迁移、seed、恢复或复制私有配置。launcher READY，backend /api/health 与 frontend /staff/passes HTTP 200，仅证明进程/页面入口可用。归还、CSV、滚动/视觉、并发、权限竞争与数据库验收全部 NOT_RUN，由用户手测。
- 当前改动未合并 main 或 push；主项目源码保持原分支。手测步骤见 MANUAL_R01_R03.md。

## 2026-11-16 No pass 发放选项

- 同一隔离分支新增互斥 No pass 下拉选项：SUBMITTED 用 Approve without pass 原子审批并记录，VERIFIED 用 Record no pass。无需实体地点/期限/交付；无库存也可选择。登记详情重新打开时通过受权限保护的 issue-context 显示历史 No pass 标记。
- 独立 APPROVE_NO_PASS / NO_PASS 严格输入与幂等 namespace；在当前 staff/session/counter/root/version 检查和注册锁内写 REGISTRATION_NO_PASS 本地审计，保存关联登记、经办人/时间和安全版本快照。已有活动借用、重复决定拒绝；原 key/body 重试返回原结果。后续仍可按原规则实体发卡，不删除旧审计。
- 不创建卡、assignment、交付时间、期限或实体生命周期事件；现有 Pass returns/history 仅读实际借用，自然排除该决定。无 migration、数据库操作或外部集成。
- 实际检查：前端 build/lint PASS；后端 `mvnw.cmd -B -DskipTests test-compile` PASS（含源码/测试源码编译，未运行测试）；planning/diff 检查 PASS。保留既有 chunk 大小/deprecated API 提示。浏览器、业务、权限/并发、回滚、UNKNOWN 和 SQL 验收全部 NOT_RUN，由用户手测。
- 本轮未启动或重启应用/数据库；后端新增接口需由用户重启其应用后使用。未 merge main 或 push。

## 2026-11-16 Staff header 当前位置

- 按用户截图参照 Administration 的样式，所有 staff 页加入 Counter staff > 当前页名称。共享 shell 使用已授权 feature route label，Overview 单独映射，兼容 URL 尾斜杠；面包屑 nav 标记当前页，窄屏保留两级并允许 header 随换行增长。
- 前端 build/lint、planning/diff 检查 PASS；保留既有 chunk 大小提示。仅前端与说明变更，未重启服务或执行数据库操作；浏览器/响应式视觉验收 NOT_RUN。改动保持在同一隔离分支，未 merge main 或 push。
