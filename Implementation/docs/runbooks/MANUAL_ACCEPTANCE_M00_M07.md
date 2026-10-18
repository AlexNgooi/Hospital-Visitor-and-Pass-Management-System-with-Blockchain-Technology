# M00–M07 用户手动验收清单

更新日期：2026-10-18。M00–M06运行源码`761491e89910566c83fa184cb0aaa79ee625f128`已合并，状态MERGED_PENDING_USER_MANUAL_TEST。本清单已按实际控件、V6/V7和演示规则核对，**所有40个新手动场景均NOT_RUN**；预期行为不是测试结果。必要编译与规则测试的准确范围见manifest及coordinator receipt。

启动与停止见 [运行指南](MANUAL_M00_M07.md)，版本/历史证据见 [manifest](RELEASE_MANIFEST_M00_M07.md)。需求唯一来源：[planning/03](../../../planning/03_REQUIREMENTS_AND_TEST_PLAN.md)。

## 记录方式与准备

每项记录 `ID | PASS/FAIL/NOT_RUN | 实测 HEAD | 时间(+08:00) | 操作者 | synthetic reference/event ID | 遮敏证据 | 实际/预期差异`。未尝试仍为 NOT_RUN；受缺少设备/获批医院接口/HTTPS限制的项记 NOT_RUN + 原因，不以模拟结果代替。不要在 Git、截图、录屏、聊天、HAR 中保留 cookie、CSRF、entry/grant、完整电话/MRN、密码或私钥。QR 截图也含临时能力，不作为公开证据。

使用独立临时库和全新浏览器会话：职员 A、同柜台职员 B、另一柜台职员 C、仅 ADMIN 的管理员、匿名访客。角色/账号/柜台以最终运行指南为准；缺少夹具时记 NOT_RUN，不直接编辑业务表伪造成功。每个有副作用的错误/重放/竞争场景使用新的 synthetic 记录，先保存 reference/Pass ID；对比业务状态与本地审计，不能仅凭 toast 判断原子性。

## 一、登录、QR 与四类登记

| ID / 需求 | 用户动作 | 预期与检查点 | 结果 |
|---|---|---|---|
| U01 / Q05 | 错误密码、空值、正确登录、选授权柜台、注销后重开职员地址；仅 ADMIN 打开柜台功能 | 安全错误、合法会话才可访问；ADMIN 不自动具有 COUNTER_STAFF 能力 | NOT_RUN |
| U02 / R01,R06 | 显示当前动态 QR，跨两轮观察；两个独立匿名会话在同一有效窗口进入 | payload 每30秒换、challenge 默认45秒；多人各有独立 grant；无 PII；不得保存原 token | NOT_RUN |
| U03 / R06,Q04 | QR 页断网/隐藏/休眠后恢复，旧截图过期后进入 | 过期码不可作为当前码，恢复先向服务器同步；`now >= expires_at` 拒绝 | NOT_RUN |
| U04 / R06,Q05 | 无 entry 直接 `/register`；复制过期或撤销 entry；另一 cookie 使用旧表单；改 counter/category | 均不能越过 grant/scope；错误安全且不暴露对象或 token | NOT_RUN |
| U05 / R06 | 扫码打开表单后等 QR 自然换码；继续填写；另试 grant20分钟绝对到期 | 自然换码不缩短有效 grant，也不延长20分钟；过期后需重新扫码 | NOT_RUN |
| U06 / R06 | 同一匿名会话已有草稿，再扫另一入口：先取消，再确认；旧标签页提交；确认时新码过期 | 取消保留原表单；只有新入口有效才替换并撤销旧 grant；旧页不能用新 context；失败不先撤销原表单 | NOT_RUN |
| U07 / R02,R03,R04 | 用下面四类资料各提交一份；切步骤、修正必填/长度/格式错误、确认隐私 | 严格按类别字段；TEST_ID/DEMO-、DEMO-MRN-；成功只显示 R-reference，无 Pass ID/患者公开查询；WhatsApp 未启用不收 opt-in | NOT_RUN |
| U08 / R02,R03,R06 | 开发者工具在本机暂存请求，尝试未知/跨类别字段、actor/source/status/WhatsApp 注入 | 服务器拒绝，不因隐藏 UI 就信任输入；不得把带秘密的请求导出到 evidence | NOT_RUN |
| U09 / R02,R06,P02 | 原 submit key/body 明确重试；同 key 改 body；不同 key 再消费已用 grant；两个窗口同时提交 | 原成功返回同 R-reference；改 body 冲突；单 grant 至多一个根登记/隐私确认/审计结果 | NOT_RUN |
| U10 / R04 | Penjaga 分别观察 MRN mock MATCH、超时/不可用或 manual 路径（仅在已有演示入口支持时） | mock MATCH 不等于批准；人工证据缺失不能批准；保留表单/登记，不保存病历；无可触发入口的分支记 NOT_RUN | NOT_RUN |

四类全部使用虚构姓名和电话，例如 `Demo Visitor A`、`+601100001234`；证件类型 TEST_ID，证件 `DEMO-CASE0001` 至 `DEMO-CASE0004`。不要使用现实中认识的人的资料。

| 类别 | 额外必填合成资料 | 审核所需模拟人工核实 |
|---|---|---|
| PENJAGA | `DEMO-MRN-4821`，当前有效演示 ward，relationship=PARENT/SPOUSE/SIBLING/CHILD/OTHER之一 | identity + MRN + ward；mock 不替代三项 |
| EXECUTIVE | organisation、contactPerson、有效演示 destination、visitPurpose | identity |
| VENDOR | company、contactPerson、有效演示 destination、deliveryPurpose | identity |
| CONTRACTOR | company、contactPerson、有效演示 destination、workPurpose | identity |

每次新登记使用新的演示标识。UI 中的有效 ward/destination 以运行指南的实际 seed 为准；不要把 planning 示例误当已存在记录。

## 二、审核与状态恢复

| ID / 需求 | 用户动作 | 预期与检查点 | 结果 |
|---|---|---|---|
| U11 / S01,D01 | 柜台 A 读队列/详情，筛选、分页、刷新；柜台 C 尝试另一柜台对象 | 姓名/证件/电话/MRN 掩码；只看当前授权柜台；不可见对象无存在泄露 | NOT_RUN |
| U12 / S01,R04 | 四类各先不全选核实，再完整核实批准 | 缺人工证据拒绝；完整批准为 VERIFIED，版本递增；批准不生成借用、Pass ID、dueAt 或外部任务 | NOT_RUN |
| U13 / S01 | 新登记拒绝：不选理由，再选理由确认；再改已审核记录 | 理由必填；REJECTED 持久化，有 actor/time/reason；不允许新 transition | NOT_RUN |
| U14 / S01,P02,Q05 | A/B 同开 SUBMITTED，几乎同时 approve/reject；重试原赢家命令 | 恰好一次决定；另一命令冲突；原成功重放不追加决定/审计，当前权限仍必须有效 | NOT_RUN |
| U15 / Q04,Q05 | 在开发者工具模拟请求未发出、响应丢失两类 UNKNOWN；再让显式恢复返回4xx，检查当前状态后重试原命令 | 未知不等于失败；保留原 key/body/version；4xx不能证明原写未提交；Check current status只读，Retry original command不换 key、不自动重放 | NOT_RUN |
| U16 / Q04,Q05 | UNKNOWN 后切柜台/用户或整页刷新 | 不跨作用域执行旧命令；缓存隐藏。内存句柄丢失需先核对服务器业务事实，不重复建单 | NOT_RUN |

## 三、SIMULATED 库存、扫描、发卡与归还

下表按实际M05源码整理：48个固定sample、120秒任务、按柜台自动生成SIMULATED reader；默认24小时，设置可调1..720且旧dueAt冻结。monitor每30秒最多50笔，读侧按active+dueAt判断逾期。它不代表任何真实卡已扫描或手动业务检查已通过。

| ID / 需求 | 用户动作 | 预期与检查点 | 结果 |
|---|---|---|---|
| U17 / C01,B01 | ADMIN 通过受保护模拟入口登记四类固定 profile 库存；重复/未知 profile | 来源 SIMULATED，重复 UID/未知 profile 拒绝；业务与 CARD_REGISTERED 本地事件一致 | NOT_RUN |
| U18 / C02 | 在同设备创建活动任务再创建第二个；取消后再提交晚到结果；过期结果 | 单设备最多一个活动任务；取消/过期/旧结果不能重新激活任务 | NOT_RUN |
| U19 / C02,Q05 | 用受控本机请求改 device/counter/actor/purpose/target/nonce，或把 ISSUE 证据用于 RETURN | 绑定不匹配拒绝；不能用客户端 UID/source 替代扫描；记录不含设备 secret | NOT_RUN |
| U20 / P01 | 每类 VERIFIED 用兼容 AVAILABLE 卡完成 ISSUE scan；先不确认交付再确认 | 未确认不能发卡；确认后仅一次活动借用、Pass ID、冻结 dueAt/规则、ISSUED/local audit；全部标 SIMULATED | NOT_RUN |
| U21 / P01,P02 | SUBMITTED/REJECTED登记、非AVAILABLE卡、不兼容类别、无效扫描试发卡 | 拒绝且无部分库存/借用/消费事件；不能从 UI 自选 status 绕过 | NOT_RUN |
| U22 / P02 | A/B 争同卡不同登记；同登记不同卡；双击或同 key/body 重试；同 key 改body | 每卡/登记最多一活动借用；恰好一个赢家；重放同 Pass ID，改body冲突，无重复事件 | NOT_RUN |
| U23 / P03 | RETURN扫描后不确认收到，再确认；对 ISSUED/OVERDUE 各一次；原命令重放 | 未确认不归还；确认后关闭借用、卡AVAILABLE、唯一RETURNED事件；重放不二次关闭 | NOT_RUN |
| U24 / P03,C02 | 用另一借用的RETURN扫描、消费过的结果、错误卡、LOST卡、非原发卡柜台归还 | 拒绝；当前demo仅原发卡柜台归还，历史与库存不被改坏，不用手工改库绕过 | NOT_RUN |
| U25 / P04,N03 | 等真实演示dueAt与scheduler，刷新；重复轮询；另做return/overdue竞争 | `now >= dueAt`且仍活动才OVERDUE；一次事件/内部告警，已归还不再告警；不手改电脑时钟/历史记录 | NOT_RUN |
| U26 / N03,D01 | 授权职员 reveal contact并记录followup；未授权账号尝试 | 授权和每次 reveal/followup有审计；默认仍掩码，不触发WhatsApp；关闭/换身份后不保留可见原文 | NOT_RUN |
| U27 / P05,B01 | ADMIN对AVAILABLE与活动借用标LOST，不填理由再填；尝试借/直接归还 | 理由必填；LOST不可借/直接还，活动借用关闭为遗失，unresolved case保留 | NOT_RUN |
| U28 / P05,B01 | 对AVAILABLE以DAMAGED/REMOVED_FROM_SERVICE disable；对LOST/DISABLED扫描同一sample、勾找回和可复用检查后restore；缺确认/证据试一次 | 固定DEMO_RECOVERED_AND_CHECKED；AVAILABLE无活动借用，遗失case解决且历史保留RESTORED/原因，旧借用仍关闭；医院政策未批准 | NOT_RUN |
| U29 / B01,N01,N02,B02,B03 | 贯穿发/还/逾期/遗失/恢复检查集成状态与本地事件 | LOCAL_ONLY/SIMULATED，链/消息NOT_ENABLED；无外部发送/链调用/队列/历史补发；无Verify/Retry/resend假成功 | NOT_RUN |

## 四、管理、报表、隐私与运行恢复

| ID / 需求 | 用户动作 | 预期与检查点 | 结果 |
|---|---|---|---|
| U30 / A01,Q05 | ADMIN创建职员并分配柜台；使用新会话登录；修改角色/停用账号后旧会话写入 | 角色/柜台按当前服务端权限；旧会话撤销，缓存隐藏；职员不能调管理API；ADMIN不自动有柜台权限 | NOT_RUN |
| U31 / A01 | 在至少两名active ADMIN的临时库两会话同时降级/停用对方；再试最后一名 | 不能降至零active ADMIN；失败无半完成权限；不要先锁死唯一账号再凭SQL恢复 | NOT_RUN |
| U32 / A02,P04 | 修改category/ward/settings附原因；用旧版本提交；停用历史引用项 | 版本冲突安全失败；审计有原因；历史/既有dueAt不重算，新登记只选有效项 | NOT_RUN |
| U33 / A03,A04,Q01 | 创建已知数量四类登记/借用/归还/遗失，记账后刷新Reports & overview | 对当前server环境及SYNTHETIC/SIMULATED数据按manifest定义核对；5秒poll、10秒目标由用户计时；失败stale/error不假0 | NOT_RUN |
| U34 / A03,A04 | 筛category/ward/MYT inclusive日期（最多366天）；用午夜两侧数据与空区间比较CSV/页面 | 转UTC`[from午夜,to次日午夜)`；current assignments不随日期回溯，inventory只按category；边界无实际数据则NOT_RUN，不改历史造覆盖 | NOT_RUN |
| U35 / A04,D01 | ADMIN导出掩码CSV；未授权导出；用合法reference名称测试=,+,-,@/前导控制空白；超过10000行/JSON体上限时导出 | visitor固定***且不选原PII；每字段quote/防公式；大范围422不截断、失败不记成功export；丢响应仍可能有audit，不自动retry | NOT_RUN |
| U36 / D01,Q05 | 本机检查QR解码、UI、返回JSON、错误与日志、CSV、bundle、截图 | 无secret/原PII泄露；public reference不授查询权，contact reveal除外仍当前授权+审计；勿上传原日志 | NOT_RUN |
| U37 / Q04 | 仅停本次拥有的backend，保持DB，尝试读取/命令，恢复相同配置 | 不宣称操作成功；UNKNOWN按U15/U16恢复，持久化事实不丢失；不自动发送新写命令 | NOT_RUN |
| U38 / Q04,Q07 | 完成下面备份/独立恢复步骤，比较业务记录/活动唯一性/事件；在旧浏览器试旧cookie/QR/scan，再用新会话登录 | 还原到新隔离库；不触碰native库；keys/业务历史保留，旧framework/auth/QR/未完成scan被启动前撤销；重选柜台/新scan，计时与数据缺口如实记录 | NOT_RUN |
| U39 / Q06 | 四类表单/登录/柜台/管理用键盘、375px、短屏、200%缩放 | 标签/焦点/错误可达，状态非只靠颜色，按钮可达；长内容安全滚动，不用裁剪制造一屏通过 | NOT_RUN |
| U40 / D01,Q07 | 确认无真实资料；检查retention/冻结/删除与备份规则是否已有实现和制度 | 未实现retention执行器/医院未批政策明确NOT_RUN或DEFERRED；不把文档当自动删除已运行 | NOT_RUN |

备份恢复的具体命令、容器标识和配置见 [运行指南](MANUAL_M00_M07.md)，仅由用户运行。保留同版本源码、V1–V7、演示库备份、受控恢复密钥版本映射（不入Git）与时间戳；停止写入并记最后事件/assignment状态；只备份临时库；恢复到另一个全新临时库；先核对Flyway/业务/审计/幂等，再以新会话运行；旧UNKNOWN只读核对业务事实，不跨旧新身份执行或盲换键。实测耗时和恢复点计算RTO/RPO，24h/4h只是建议目标。

## U33 可复算业务账本（可选独立演示轮次）

这是一份**预期数据设计，结果NOT_RUN**。为避免其余并发/负面场景改变报表分母，在一个新的空演示环境单独做此轮。不要为了清空数据删除历史表；先备份需要保留的上一轮，再正常stop→start。先记空环境基数，ADMIN各ENROLL一张EXECUTIVE/PENJAGA/VENDOR/CONTRACTOR sample，全程选柜台1，按下表完成四类登记；时间范围覆盖这轮所有动作，category/ward清空为全部。

| 合成案例 | 人工执行 | 最终业务事实 |
|---|---|---|
| LEDGER-E / EXECUTIVE | 登记→批准→发卡→确认归还 | root VERIFIED，1借用已归还，卡AVAILABLE |
| LEDGER-P / PENJAGA | 登记→三项核实批准→发卡，保持未到期 | root VERIFIED，1活动借用，卡ISSUED |
| LEDGER-V / VENDOR | 登记→批准→发卡→ADMIN说明原因标LOST | root VERIFIED，借用以LOST关闭，不计作returned，卡LOST且遗失case未解决 |
| LEDGER-C / CONTRACTOR | 登记→说明理由拒绝；库存卡保持未借 | root REJECTED，无借用，卡AVAILABLE |

在没有额外写入/到期的前提下，按这轮操作可复算：4份登记、3次发卡、1次实际归还、1次遗失关闭、1活动借用、0到期活动借用；库存4张，其中AVAILABLE2、ISSUED1、LOST1、OVERDUE0、DISABLED0。root当前状态VERIFIED3、REJECTED1。**这些是用户应核对的预期，不是已经观察到的报表数值**。先核对manifest的最终指标标签/筛选定义，再比较相同口径；按类别/ward过滤后重新计算，不把全局当前库存直接与期间发卡计数比较。

之后可以备份这组记录，用于U38还原核对。逾期、restore与设置变更另开记录/轮次；活动dueAt一旦到达，就必须按当前时刻更新预期，不能继续要求“0逾期”。不改库时间或历史数据来制造午夜/逾期证据。

## 需求覆盖与明确限制

| Requirement IDs | 当前手动案例 | 本轮结果 / 限制 |
|---|---|---|
| R01,R02,R03,R04,R06 | U02–U10,U12 | NOT_RUN；R01生产HTTPS/真实手机扫码另列NOT_RUN |
| S01 | U11–U16 | NOT_RUN |
| C01,C02 | U17–U19,U24 | NOT_RUN；C01真实reader/profile deferred M08 |
| P01,P02,P03,P04,P05 | U09,U14,U20–U25,U27–U28,U32 | NOT_RUN；P01/P03真实交付NOT_RUN；restore演示规则不等于医院批准 |
| N03 | U25–U26 | NOT_RUN，内部人工跟进 |
| A01,A02,A03,A04 | U30–U35 | NOT_RUN；A04为Should仍列交付核对 |
| B01 | U17,U20–U29 | NOT_RUN本地审计；上链部分deferred |
| D01 | U11,U26,U35–U36,U38,U40 | NOT_RUN；保留期/删除/冻结制度不因demo成功而通过 |
| Q01,Q04,Q05,Q06,Q07 | U01–U06,U15–U16,U19,U29–U40 | NOT_RUN，建议目标无生产保证 |
| R05,N01,N02,B02,B03,Q08 | U29仅检查disabled边界 | live MRN、真实消息/链和proof覆盖DEFERRED / NOT_RUN；不纳入当前Must分母 |
| Q02,Q03 | 无本轮自动测试 | 性能、SUS、医院UAT、任务时间统计NOT_RUN；不把用户演示等同研究结论 |

发现缺陷记录精确HEAD、案例ID、预期/实际、遮敏复现、状态/事件差异，由当前coordinator分配返修。PII泄露、双重活动借用或库存与借用分叉时停止受影响演示并保留隔离证据；不直接改旧库或重写审计。文档完成不代表业务验收、医院批准或生产发布。
