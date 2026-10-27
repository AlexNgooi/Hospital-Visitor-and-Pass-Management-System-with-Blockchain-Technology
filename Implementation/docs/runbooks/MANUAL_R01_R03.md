# R01–R03：手动 pass 与新表单的用户检查指南

2026-10-27。本文对应独立 `codex/manual-pass-integration` 整合分支，**尚未合并 main，也未部署或启动**。源码审核/构建状态见[组合审阅记录](../evidence/changes/COORDINATOR/INTEGRATION_REVIEW.md)；需求、模块和共享决定见仓库根 `planning/16_MANUAL_PASS_MODULE_COORDINATION.md`。

这份清单全部为 **NOT_RUN**。构建通过不代表数据库迁移、并发或业务验收通过。

## 启动前提

- 当前运行 demo 仍是原来的源码/数据，不会因为独立分支已准备好就变成新版。先由用户决定整合/合并和启动时机；本轮助手没有停止旧服务、连接数据库或更新 schema。
- 新版含新增 V8/V9，V1–V7 不改写。后续从旧库升级前，先由用户按既有 owner/backup 流程保护数据和匹配的私有 keys。备份/恢复和真实迁移尚未验证，不执行 repair/baseline/clean 或直接修改 native3306。
- 现有启动器的端口、容器名和资源 owner 是固定的；不要从新 worktree 自动认领旧库、复制私有 control/keys/.env 或与当前运行的 demo 抢端口。旧启动/保留数据说明见 MANUAL_M00_M07.md；其中“扫描、TEST_ID、强制24小时”等业务步骤已由本文的新流程替代。
- 这里只使用合成姓名、IC、地址、患者和电话。MRN API 是假的，WhatsApp/blockchain 仍 disabled。当前账户、counter grant、动态 QR 入口与 ADMIN/COUNTER_STAFF 角色分离继续有效。

## 正常办理顺序

1. **Admin 建库存**：Card inventory → Enroll a card，输入印在 pass 上的唯一可见 code，选择类别和地点，然后登记。无需 reader、UID/profile 或扫描。为 Vendor/Contractor 准备同类别、不同地点的至少两张卡；Executive/Penjaga 准备各自类别的卡。旧扫描库存保留其历史来源。
2. **Staff 开登记入口**：登录当前授权 counter，使用 Registration QR。Visitor 用独立匿名会话扫描有效入口；直接访问注册页不能绕过 grant。保留动态 QR，取消的是 pass reader。
3. **Penjaga 填表**：姓名、仅 IC、电话、现住址和合成 MRN。语法示例 IC `000000000001`、电话 `+999123456789`，均不是正式证件/电话。输入 `DEMO-MRN-4821` 或 `DEMO-MRN-MATCH` 后离开输入框，应自动出现 MOCK/SYNTHETIC 患者姓名与 ward/bed；按钮用于明确重试。现有 seed 的 `DEMO_WARD` 不可缺失或停用，系统不会把患者移到其他地点凑成功。
4. **其他表单**：Executive 填姓名、IC 或 Lesen（二选一）与号码、电话、Wad、Nama Pesakit；Vendor/Contractor 填姓名、IC、电话、Company 和多个 Location。旧 organisation/contact/purpose/relationship 不再作为新表单额外必填。全部患者例子使用虚构资料。
5. **条款与提交**：Penjaga 勾选 pass 条款，另行确认演示隐私告知；没有电子签名或 WhatsApp 同意。提交只产生待审核登记及 reference，不自动发 pass。
6. **Staff 人工审核**：Registration review 默认掩码；明确点击审核资料查看后，按当前登记/version 核对必需字段。Penjaga 仍需身份、MRN、ward 人工确认，mock MATCH 不会勾选或替代这些核实。批准后才可发放。
7. **手动 issue**：Pass lifecycle → Prepare issue，选择可用兼容 pass 和本次地点。Vendor/Contractor 可选多张；Executive/Penjaga 每份登记最多一张活动 pass。每张可设具体归还日期时间或勾选无期限；确认实际交付后一次提交。多选发生任一卡冲突应整批失败，不能显示整批成功而只发一部分。
8. **部分归还**：可用 View this registration's passes 查找该登记的 pass。只打开并确认实际收到的那一张，点 Return this pass only。归还后只有该 assignment 结束，其他 pass 仍借出。归还暂限原 issue counter，不能替其他 counter 办理。
9. **记录与报表**：每张 issued_at=进、实际 returned_at=出，显示完整 MYT 日期时间和经办 staff ID；due_at 只是预计期限。Admin Reports 分别统计登记数和 pass 数，提供独立 pass history CSV。一般报表/CSV 不含患者、IC、MRN、电话或地址。

## 用户手动检查清单（全部 NOT_RUN）

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
