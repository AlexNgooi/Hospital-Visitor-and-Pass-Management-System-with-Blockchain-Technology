# R01–R03：手动 pass 与新表单的用户检查指南

> **2026-11-10：当前环境入口为 [MANUAL_NATIVE.md](MANUAL_NATIVE.md)，使用本机进程和专用MySQL库；本文只描述现行手动pass业务检查。**

2026-10-27。本文对应已审核的 `codex/manual-pass-integration` 整合版，**现已按用户要求合并本机 main（merge `c4cf3d3`），尚未部署、启动新版或执行 V8/V9 迁移**。源码审核/构建状态见[组合审阅记录](../evidence/changes/COORDINATOR/INTEGRATION_REVIEW.md)；需求、模块和共享决定见仓库根 `planning/04_DATA_MODEL_AND_API_PLAN.md`。

这份清单全部为 **NOT_RUN**。构建通过不代表数据库迁移、并发或业务验收通过。

## 启动前提

- main已纳入当前用户要求的源码发布，但运行demo不会自动更新；启动时机仍由用户决定。本次 Git 发布不重启服务、连接数据库或更新 schema；先前明确请求的启动/库存维护见 planning/10 的对应记录。
- 新版含新增 V8/V9，V1–V7 不改写。后续从旧库升级前，先由用户按既有 owner/backup 流程保护数据和匹配的私有 keys。备份/恢复和真实迁移尚未验证，不执行 repair/baseline/clean 或直接修改 native3306。
- 本机启动端口固定，不能与旧服务抢占；新worktree不自动认领旧库或复制私有control/keys/.env。环境准备以MANUAL_NATIVE.md为准。
- 这里只使用合成姓名、IC、地址、患者和电话。MRN API 是假的，WhatsApp/blockchain 仍 disabled。当前账户、counter grant、动态 QR 入口与 ADMIN/COUNTER_STAFF 角色分离继续有效。

## 正常办理顺序

1. **Admin 建库存**：Card inventory → Enroll a card，输入印在 pass 上的唯一可见 code，选择类别和地点，然后登记。无需 reader、UID/profile 或扫描。为 Vendor/Contractor 准备同类别、不同地点的至少两张卡；Executive/Penjaga 准备各自类别的卡。旧扫描库存保留其历史来源。
2. **Staff 开登记入口**：登录当前授权 counter，Overview 默认同时展示 QR 和 queue；Registration QR 独立页也自动准备 QR，不需点击 Display。Visitor 用独立匿名会话扫描有效入口；直接访问注册页不能绕过 grant。保留动态 QR，取消的是 pass reader。
3. **Penjaga 填表**：姓名、仅 IC、电话、现住址和合成 MRN。语法示例 IC `000000000001`、电话 `+999123456789`，均不是正式证件/电话。输入 `DEMO-MRN-4821` 或 `DEMO-MRN-MATCH` 后离开输入框，应自动出现 MOCK/SYNTHETIC 患者姓名与 ward/bed；按钮用于明确重试。现有 seed 的 `DEMO_WARD` 不可缺失或停用，系统不会把患者移到其他地点凑成功。
4. **其他表单**：Executive 填姓名、IC 或 Lesen（二选一）与号码、电话、Wad、Nama Pesakit；Vendor/Contractor 填姓名、IC、电话、Company 和多个 Location。旧 organisation/contact/purpose/relationship 不再作为新表单额外必填。全部患者例子使用虚构资料。
5. **条款与提交**：Penjaga 勾选 pass 条款，另行确认演示隐私告知；没有电子签名或 WhatsApp 同意。提交只产生待审核登记及 reference，不自动发 pass。
6. **Staff 人工审核**：Overview 或 Registration review 点击 Review & issue，modal 自动展示完整资料；队列仍脱敏，打开和刷新完整资料保留权限/version/审计。无需 Reveal 或 checklist。Penjaga 仍需人工核对身份、MRN、patient 和 ward，mock MATCH 不替代核实。拒绝在同一 modal 选择理由。
7. **审核与发卡一次办理**：在同一 modal 选择可用兼容 pass 和地点；Vendor/Contractor 可多卡，Executive/Penjaga 单卡。每张选择具体 MYT 日期时间或 No deadline。人工核对且交付后点 Approve & issue pass，完成后关闭 modal 并刷新 queue。任一卡冲突应连审批一起回滚；刷新资料/库存后重选。旧 Approved 登记用状态筛选打开同一 modal 后 Issue pass。UNKNOWN 时保留 modal，只点 Retry original command，不新建命令。
8. **部分归还**：Pass returns 只列未归还/逾期的 pass，姓名、类别、Pass ID、地点、状态一行对应一张卡，不展示 Counter 或 Registration ID。点 Return pass 打开基本资料 modal，收到实体卡后点 Confirm return，无额外 checklist。成功后仅该 assignment 从列表移除并显示渐隐 toast，其他 pass 仍借出。pending/UNKNOWN 不能关 modal，只重试原命令。服务端原权限范围仍有效。
9. **记录与报表**：每张 issued_at=进、实际 returned_at=出，显示完整 MYT 日期时间和经办 staff ID；due_at 只是预计期限。Admin Reports 分别统计登记数和 pass 数，提供独立 pass history CSV。一般报表/CSV 不含患者、IC、MRN、电话或地址。

## 用户手动检查清单（全部 NOT_RUN）

库存 naming 补充：新建时 Category 自动决定 exec-/penj-/vend-/cont-，前缀不可编辑；只填 1–9999，001 预览/保存为 1。相同类别编号重复（含借出/遗失/停用）拒绝，不同类别同号允许；以后可跳号，不自动顺序分配。篡改前缀、0/负数/字母/超范围应拒绝；旧成功 enrollment 的原 key/body 仍可恢复原 receipt。界面、创建/冲突、权限与 UNKNOWN 业务验收仍 NOT_RUN；2026-11-16 既有 9 张改名及只读快照复核属于单独明确请求的数据维护，不能当作上述业务测试 PASS。

No pass 补充：四类别在发卡下拉选择 No pass 后应清除已选实体卡、隐藏地点/归还期限，并显示 Approve without pass（已批准时 Record no pass）。无兼容库存也可选；取消不写记录。成功保留登记与本地无卡审计，Approved 筛选再开详情应看到历史 No pass 提示；Pass returns 与归还 history 均不出现该决定。已有活动借用不能记录 No pass；重复点击/原 key 重试不重复写审计，UNKNOWN 只重试原命令；批准或审计失败全部回滚。后续如需实体 pass 仍可按原规则发卡。上述业务、权限、并发和数据库场景全部 NOT_RUN。

Pass returns 补充：记录数超过一批时，滚动到底自动继续加载，不应有 Previous/Next，桌面主页面标题/筛选/底部信息保持可见。已归还行只在 View pass history 内出现；Time period 下拉支持 This day/month/year，Customize 才显示 Start/End date 和 Apply。验证 MYT 跨日/跨月/跨年边界、长姓名/Pass ID、单张部分归还与 UNKNOWN。CSV 应包含全部筛选结果（超出已加载的行），不包含电话/证件/患者资料，超量应明确要求缩小范围；公式开头标签和 Unicode 应安全。上述滚动、业务和导出验收均仍 NOT_RUN。

姓名/连续扫码补充：短姓名应正常显示，长姓名显示前 12 字符加省略号且不撑宽表格；两个独立访客浏览器应可用同一当前 QR 分别登记。相同浏览器提交确认后重新扫码当前 QR 应进入新表单；旧 UNKNOWN 不得因新扫码被丢弃。上述场景仍由用户手测，助手未执行业务提交。

本轮 `codex/visitor-review-issue-dashboard` 至 `1866a6c` 纳入用户明确要求的 main 发布。还需检查 Overview/独立 QR 自动展示、过期/断线隐藏、切柜台、只有队列的 review 页面、modal 自动资料/拒绝/单卡与多卡/期限、冲突整体回滚、UNKNOWN 原命令恢复，以及键盘关闭焦点返回、375px 窄屏和浏览器放大。此 Git 发布没有启动服务或执行业务验收；先前健康检查和指定库存改名不替代本清单。

| 检查 | 预期 |
|---|---|
| MRN 自动与重试 | 有效 MRN blur 自动查；无效输入不查；同一 in-flight blur/按钮请求不重复；失败后不自动循环重试 |
| MRN 改动/过期 | 输入改动立即移除旧患者/proof，晚到结果不回来；换类别、context、grant 或凭据过期不能沿用原结果 |
| MRN 失败 | `DEMO-MRN-TIMEOUT`、`DEMO-MRN-UNAVAILABLE` 或未知合成号码保留其他输入，允许明确 manual ward fallback；不伪造患者 |
| 单卡与多卡 | Executive/Penjaga 第二张活动 pass 被拒；Vendor/Contractor 一份登记跨多个地点多张，单一卡不能同时借两人 |
| 原子性与 UNKNOWN | 多选一个 stale version/无效地点应全部不写；不确定结果只重试原 key/body，不新建命令或换身份重放 |
| 部分归还 | 发三张、还一张：一条实际归还、两条仍开放；同一卡重复归还不产生第二次业务事件 |
| 无期限 | due_at=null 显示无期限、仍需归还；不会生成逾期；与“已归还”或远未来占位日期区分 |
| 有期限 | 选择短的未来截止时间并实际等待后检查逾期；不改系统时钟/数据库，不把设置变更回写旧 due_at |
| 日期/actor | 对比列表、receipt、history、报表和 CSV 的 MYT 日期时间/经办人；跨日与不同电脑时区口径一致 |
| LOST/restore | LOST 有单独关闭时间/actor，无实际 returned_at；正常 return 被拒，Admin 手动确认找回/复用再恢复库存，旧借用不复活 |
| 数量与地点筛选 | 一份 Vendor 登记借三张：一份登记、三张 pass；登记筛请求地点，pass 筛实际 issued 地点，不因 JOIN 放大人数 |
| 权限/资料查看 | Admin 不能自动审核/发还；public/跨counter/过期session/旧version不能查看原始审核字段；隐藏/换登记/身份后清除敏感显示 |
| 历史与升级 | 原 v1 登记/扫描来源/期限继续可读；已知 legacy 单地点可兼容，新版缺地点关联不能默默 fallback；未知旧关闭 actor 不捏造 |
| 导出 | 两类导出有安全类别审计、掩码、公式防护和完整日期时间；超过行数/响应上限明确拒绝，不截断；不自动重试 |

纸本上的收费/罚款/账单功能、真实医院 MRN、门禁或独立 Check-in/Check-out、读卡器、M08–M11 均未因此启动。用户指定的进/出仅指发还 pass，不声称系统检测了医院真实门禁进出。
