# 修改影响索引

| 修改对象 | 先读 | 同步影响 |
|---|---|---|
| 当前范围/状态 | 01 / 10 | README、handoff，不重复历史台账 |
| 表单/类别/MRN/条款 | 03 / 04 | registration、hospital、review、V8兼容、前端contracts |
| 动态QR/Copy link/多标签 | 02 / 03 / 04 | registrationentry、auth、shell、entry vault；不能放宽grant/session边界 |
| 发还/多pass/期限 | 03 / 04 | assignment、inventory、registration port、monitoring、V9约束、对应UI |
| 报表/CSV/时间 | 03 / 04 | administration/reporting、脱敏、计数口径、UTC/MYT |
| 本机运行/备份/恢复 | 11 / MANUAL_NATIVE | scripts、infra模板、独立schema/account及持久keys |
| SQL测试环境 | backend/LOCAL_TESTING | testing/LocalMysql、动态测试配置；只触达自建随机测试库 |
| 后续Sui | SUI_TESTNET / 02 / 04 | 本机worker、Move、outbox/验证协议、UI实际能力状态 |

上表简写均为本目录对应编号文件；运行说明在Implementation/docs/runbooks。详细职责见 [09](09_FOLDER_STRUCTURE.md)，根 [AGENTS](../AGENTS.md) 只路由与列操作边界。
