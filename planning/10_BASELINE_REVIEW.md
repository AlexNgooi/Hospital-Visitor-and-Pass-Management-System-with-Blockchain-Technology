---
type: baseline-review
revision: current
updated: 2026-10-05
status: locally-reviewed-design
---
# 当前基线评审、来源与未决项

最近评审日期 2026-10-05（用户 Asia/Singapore 时间）。这是设计与环境检查，不是医院签字、真实硬件/API 验收或正式应用完成声明。

## 来源和优先级

1. 当前用户请求：安装两个 skill，完善项目需求，以 Archify 给出最新 architecture/folder/workflow/sequence。
2. [UI v4](../output/ui-redesign-v4/README.md)，2026-09-24，明确保留一条组合 WhatsApp；覆盖 v3/UI旧稿和 Archify v2 的多消息政策。
3. [实施指南](../output/pdf/HSAAS-build-guide.en.md)：服务端会话、同源代理、Java Reader Agent 领取 cloud ScanJob、canonical nonce、MySQL active constraints。通知附录的多消息部分由 UI v4 覆盖。
4. 根 proposal PDF p14-17：四个目标、五模块、三角色、实体 pass 与 off-chain PII；p46 受控测试事件证明覆盖与篡改检测评价。
5. 2026-10-05 本机只读环境检查：Git/Java/Node/Docker/MySQL 可用，Sui CLI 尚未安装，详见 11。

正式主规范：[架构](02_TECHNICAL_ARCHITECTURE.md)、[需求](03_REQUIREMENTS_AND_TEST_PLAN.md)、[数据/API](04_DATA_MODEL_AND_API_PLAN.md)。planning 只保留当前版本；proposal 和 output 中的外部输入/原型按各自目录契约管理。

## 检查发现与本次修订

| 发现 | v3 修订 | 性质 |
|---|---|---|
| 早期设计在 API 直接提交 Sui 后才回发卡结果 | MySQL 同事务 outbox；柜台 commit 后响应，Sui 独立 worker | 当前异步架构意图 |
| v2 WebApp -> localhost Reader Agent 与指南 cloud ScanJob 不一致 | 采用 agent 出站 HTTPS，设备认证与任务绑定 | 沿用最新指南 |
| 多消息和提醒与 UI v4 冲突 | 一次 COMBINED_PASS_DETAILS；无自动提醒/拒绝/归还消息 | 最新用户业务决策 |
| VERIFY/APPROVED 与 Issued/Pass ID 混用 | Approved=VERIFIED；借用成功后才产生 Pass ID/due_at | 术语与状态统一 |
| passes 与 cards 混用 | cards=实体库存，card_assignments=一次借用 | 命名统一；无现存 migration 被改 |
| 普通 NFC UID 被当作可直接读出 category | approved profile/map + 真机验证；不可读则需医院选策略 | 明示未验证硬件事实 |
| JWT 草案与指南 session 冲突 | session/CSRF/Spring Session JDBC，同源转发需实测 | 沿用最新指南 |
| 本地消息唯一 row 被等同外部 exactly-once | UNKNOWN 保守不重发，provider 幂等/对账条件显式 | 新增可靠性约束 |
| hash 规则未固定、proof 只比较本地缓存 | nonce/canonical snapshot/链上绑定、缺失与 RPC failure 分开 | 沿用指南并完善核验 |
| lost/restore 可能留下活动 assignment | 建议 CLOSED_LOST + lost case，受控找回后恢复 | 新建议，待医院确认 |
| 文档无法快速找事实和修改影响 | root AGENTS、目录 CONTEXT、compact PROJECT_MAP、模板与输出分离 | ICM 文档组织，未搬迁 |
| 计划日期被误认为功能已完成 | 不推断完成；需求测试默认 NOT_RUN，应用模块 ghost | 状态真实性 |
| Git 仓库零 commit、Sui CLI 缺失 | P0 先做首次基线 commit；Sui 工具链最迟 P4 前补齐 | 环境准备 |

## 待确认事项

| ID | 问题 / 负责人 | 当前可实施选择 | 放行证据 |
|---|---|---|---|
| O01 | 四类别实际字段与 IC/MRN 采集、保留/搜索 / HSAAS | synthetic、白名单 schema、可配置 retention；真实表单字段仍 proposal | 批准的表单/字段用途与保留规则 |
| O02 | NFC 型号、卡制式、PC/SC/APDU 和 category profile / 开发者 + HSAAS | mock；真机 spike 优先，不声称 UID 自带类别 | 厂商说明 + 实际 sample read + 批准映射 |
| O03 | 无可读 category 时允许何种分类 / HSAAS | unknown profile 阻止 enrollment/issue | 医院选择预登记映射或分类政策后修改需求 |
| O04 | MRN endpoint/auth/response 和测试 credentials / 医院 IT | manual/mock，不储存病历 | approved sandbox 与接口契约 |
| O05 | WhatsApp 通道、内容与 opt-in、provider 能否幂等/查状态 / HSAAS | mock，一条任务、未知不重发 | approved account/template/policy + sandbox evidence |
| O06 | LOST 借用关闭、找回与 disabled restore 条件 / HSAAS | CLOSED_LOST + unresolved case 的建议 | counter/admin 场景签字 |
| O07 | 会话超时、临时数据 TTL、性能/UAT样本、RPO/RTO / 导师 + HSAAS | 03 的建议指标，非 production SLA | 受控测试方案和签字 |
| O08 | 托管预算、runtime兼容版本、同源cookie转发 / 开发者 | 本地先行，部署 spike；无免费常驻保证 | lockfiles + release manifest + cloud smoke |

这些未决项不阻止本次设计交付；真实硬件类别、live MRN、实际消息发送必须满足相应条件后才可宣称完成。当前没有向医院、Trello、Figma 或消息 provider 写入/发送任何内容。

## Skill 安装与实际使用

| Skill | 来源 | 安装固定 revision | 本次用途 |
|---|---|---|---|
| icm-architect | [RinDig/icm-architect](https://github.com/RinDig/icm-architect) | e16cafe6a664dcf6d787a726b452adba77d913f4 | 小型 map、root 路由、目录契约、模板与产品分离；不作为 runtime |
| prompt-master | [nidhinjs/prompt-master](https://github.com/nidhinjs/prompt-master) | 2bd92518e26bf659e21e3d9ab90573fcf3ddeccb | 一份以 Codex 为目标的实施提示词，绑定主规范、范围、验收和操作边界 |
| archify | 本机已有 2.17.0-dev.1 | 保持安装不变 | 6 个 standalone HTML，showcase validate/deliver/browser evidence |

安装目录 `C:/Users/alexy/.codex/skills/icm-architect/` 和 `.../prompt-master/`；包含原 SKILL.md/配套 references。已在本轮读取并使用，下个消息将可作为常规已安装 skill 识别。版本化安装哈希见 [安装记录](skill-installation.json)。不采用 skill 中未核实的模型版本宣传作为技术依据。

## 验证证据

每图的 `.delivery.json` 记录 spec/artifact SHA-256、byte counts、9/9 showcase 与 composition；`.visual-check.json` 记录四种 desktop viewport 和明暗截图，自动证据的 visualReview 保持 pending。额外人工图片检查另存 `review-receipt.json`，不修改自动收据。统一入口 [Archify v3](diagrams/v3/index.html)。

文档链接、ICM cold-walk、需求 ID 唯一性和图/收据哈希在最终 QA 中检查。所有业务 test IDs 尚未执行，因为尚无正式业务应用；不拿图的通过状态充当业务测试通过。
