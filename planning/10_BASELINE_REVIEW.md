# 当前状态与外部未决项

更新：2026-11-11。此文件是交付状态的唯一规划入口；历史聊天/阶段计划不再覆盖它。

| 范围 | 已知事实 | 尚未完成的验证 |
|---|---|---|
| M00–M07 | 登录、QR、登记/审核、生命周期/管理及交付资料已合并本机main | 不继承早期单模块PASS作当前完整验收 |
| R01–R03 | 已于2026-10-27合并main，merge `c4cf3d3`；当前包含V8/V9 | 新库迁移、当前完整业务与恢复手测待用户执行 |
| UI polish | `ccfca27`，角色工作台与共享视觉，已纳入main | 浏览器视觉/窄屏/键盘验收待执行 |
| 本机启动/并行页面/Copy link | 本地提交 `c82c3eb`，已纳入本次main合并 | 未启动应用、数据库、迁移或浏览器 |
| 当前清理 | `5fea768`：planning合并、旧资产删除、依赖移除及本机测试隔离，已纳入main | 静态/构建结果记本轮handoff；新native测试未执行 |
| 库存 modal / Toast / 账号查看 | 独立分支 `codex/card-enrollment-toast`：登记与Open card详情modal、查看图标按钮、共享轻提示、账号下拉选择，默认当前登录账号及权限；尚未合并main | build/lint通过；测试源码类型检查FAIL（未修改的registration旧fixture）；浏览器/业务/数据库NOT_RUN，运行版未重启 |
| Sui/通知 | 默认disabled；无真实调用、合约发布或历史补发 | Sui worker/Move、provider接口与真实验收均未实施 |

2026-11-10用户明确要求“github push main”，授权将独立分支 `codex/no-docker-multi-page`（交付head `5fea768`）合并并推送main。旧文档冲突按当前规范解决，当前运行指南改为主项目checkout。没有部署、启动/重启应用、执行数据库迁移或删除旧数据；Git发布不代表业务验收。

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
