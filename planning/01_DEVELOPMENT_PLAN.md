---
type: development-plan
revision: current
updated: 2026-10-08
window: 2026-10-05..2027-01-03
status: coordinator-planning
---
# 三个月开发计划：coordinator 与独立模块 chat

本 chat 是 HSAAS project coordinator，负责范围、模块分配、契约、答疑、审核与本地合并。每个模块使用自己的独立 chat；阶段只是时间和集成关卡，不再对应一个开发 chat。模块与协作协议的事实归属在 [12](12_THREE_MONTH_CHAT_PLAN.md)。本轮仅修改规划，不创建模块 chat，不实施业务代码。

最新状态：2026-10-08 用户随后明确要求代开 M00–M04，五个独立 chat 已创建，统一 gpt-6.1-sol/high，初始仅 Local 只读准备；最新开发方式改为模块助手直接实现、测试和交接，英文注释必需，各模块仍一次开发许可。实际登记见 12，其他模块不自动开启。

所有 module 的 chat 与开发均由用户手动开启和启动；coordinator 只准备分配计划、任务单与依赖条件，不代开或自动启动。阶段日期、依赖通过和 merge 完成不会自动启动下一模块。

仍以 2026-10-05 至 2027-01-03 为 13 周规划窗口；2027-01-04 为应急余量。日期是目标而非完成证据。2026-10-08 实际已有 frontend/backend 骨架、infra 配置与 Git commit；[P0 检查](../Implementation/docs/evidence/foundation/P0_REVIEW.md) 表示技术初始化已补齐，业务功能仍未验收，不重复初始化。

## 当前交付范围

当前优先完成可运行的前端、基础后端和动态 QR 登记纵向流程，再完成审核、卡生命周期模拟、管理和本地报表。前端可先对契约 mock 开发，但最终当前版必须接真实 backend/MySQL；纯静态页面不算模块完成。

| 依赖 / 能力 | 当前策略 | 后续保留 |
|---|---|---|
| 登录、权限、MySQL、审计、表单、审核、管理 | 当前实现 | 不依赖医院外部接口 |
| 动态 QR 与手机扫码 | 当前 Must，M02 优先 | 服务端轮换、过期、撤销、表单会话与防绕过 |
| 实体卡与读卡机 | 尚未准备；只在 synthetic demo/test 使用模拟扫描 | M08 接真实 PC/SC/profile，真实发卡验收另做 |
| 病人资讯 / MRN API | synthetic mock + 授权人工核实模型 | M09 接获批接口；不采集完整病历 |
| WhatsApp | NOTIFICATION_MODE=disabled；当前不收集发送用途的 opt-in，不创建发送任务 | M10；保留一条组合消息规则和 adapter 契约 |
| Blockchain / Sui | BLOCKCHAIN_MODE=disabled；本地事件与审计可用，不创建待上链队列 | M11；保留 canonical schema、outbox、worker/Move/proof 设计 |

simulation/mock、disabled、live 是不同状态。关闭集成显示“未启用”，不是 Pending、Sent、Delivered、Confirmed 或虚构健康状态。当前 release 的完成只覆盖当前范围；proposal 中尚未启用的链/消息/真实硬件目标必须在 FYP 报告单独说明，不能标为已完成。

## 目标节奏与关卡

| 阶段 | 目标日期 | 模块工作 | 可放行的结果 |
|---|---|---|---|
| P0 骨架 | 5–11 Oct | 已有初始化证据；coordinator 核对现状 | 不重建；未有业务验收 |
| P1 基础与前端框架 | 12–25 Oct | M00 基础/安全；随后 M01 公共 UI | API/错误/权限契约固定；隔离 MySQL 测试；session/CSRF/RBAC；UI mock 可运行 |
| P2 动态 QR 与登记 | 26 Oct–8 Nov | M02 动态 QR；M03 四类登记 | 真实手机扫码 → 有效会话 → 表单 → MySQL；过期码与直接绕过拒绝 |
| P3 柜台与模拟生命周期 | 9–22 Nov | M04 审核；M05 synthetic 卡流程 | 审核 → 模拟 issue/return/overdue/lost；并发与幂等正确，来源明确 |
| P4 管理与完整前端集成 | 23 Nov–6 Dec | M06 管理/报表；前述模块返修 | 当前范围页面接 backend；本地审计与 disabled 状态正确；无外部发送/链调用 |
| P5 当前版冻结与验证 | 7–20 Dec | M07 跨模块 QA；coordinator review/merge | 当前 Must 冻结；安全、QR、性能、隐私、恢复与 golden dataset 证据 |
| P6 交付与 FYP 证据 | 21 Dec–3 Jan | M07 + coordinator | 当前版 release candidate、UAT/SUS 或未执行原因、runbooks、需求/限制矩阵 |

M02 的契约在 P1 固定，前端可以提前准备 QR 显示与失效状态；安全路径必须等 M00 后端能力通过后接入。每个模块可跨阶段继续返修，保留自己的 chat。外部依赖到位时由 coordinator 准备 deferred 模块的任务单与独立排期，仍由用户手动开启 chat 并启动开发；不自动占用当前关键路径，也不要求在 P4 强行上链或发送消息。

## 容量、依赖与范围保护

开发保持 WIP ≤2；每个任务拆到 2–3 个工作日内。一项在开发、一项在审核即可，不因有多个 chat 就并行写同一 checkout。每两周预留最后两天集成，每周保留约 20–30% 缓冲。用户已明确要求模块助手直接编写源码，所有新增/修改代码须有英文注释；模块获得一次范围许可后自行实现/测试/交接，不再让用户逐步手写。

如果延期，依次削减高级图表/可选导出、非关键 UI polish；保留动态 QR 服务端验证、权限/PII、安全状态、核心事务一致性与测试。硬件/API/消息/链已经 deferred，不以它们的安装或现场可用性阻塞当前版。

## 完成定义与审核

模块通过验收后提交 Implementation/docs/evidence/modules/Mxx/HANDOFF.md，由 coordinator 按 [12 的审核与合并流程](12_THREE_MONTH_CHAT_PLAN.md) 检查提交、契约、变更、真实测试与影响。未审核/未合并不能作为其他模块的稳定依赖。

- 当前范围需求具有 PASS / FAIL / NOT_RUN、commit、命令和可打开的 evidence；deferred 项记录 DEFERRED 范围、测试仍 NOT_RUN。
- frontend build、backend verify、相关 MySQL/浏览器/E2E 验证按变更实际执行；mock 验证与 live 验证分开。
- 共享 API/schema、migration 编号、路由和配置变更先回 coordinator；禁止模块自行改其他模块或合并 main。
- 合并后重跑受影响的集成验收，记录 merge SHA、返修项与可放行依赖；不自动 push、发布或启动外部集成。
- 周一选任务，周三处理 blocker，周五更新证据与风险；每两周演示当前范围和审阅 readiness。

## 决策点

- 25 Oct：基础与 API 契约稳定；独立测试环境有证据。
- 8 Nov：动态 QR 登记纵向路径完成，不能以静态 URL QR 代替。
- 22 Nov：本地 synthetic 生命周期正确，真实硬件验收仍独立列出。
- 6 Dec：当前前后端主要流程贯通，所有 deferred 集成显示未启用。
- 20 Dec：当前 Must 冻结。
- 3 Jan：当前范围候选版本与 FYP 证据完成；外部目标未达成必须明确披露。
