# HSAAS 长期图源语义镜像

> 2026-10-08：旧六图尚未同步动态 QR entry/grant、coordinator/独立 module chat 与当前 disabled 策略。本文仅忠实镜像旧图源，不是新范围规范；当前需求/架构/API/协作以 [03](03_REQUIREMENTS_AND_TEST_PLAN.md)、[02](02_TECHNICAL_ARCHITECTURE.md)、[04](04_DATA_MODEL_AND_API_PLAN.md)、[12](12_THREE_MONTH_CHAT_PLAN.md) 为准。

生成来源：diagrams/v3/*.archify.json。图源是编辑面，本文用于文本比较；样式与布局以 Archify HTML 为准。生成命令：`python planning/sync_mermaid.py`。

目录图是导航/集成关系，不是磁盘父子树；完整层级见 [09](09_FOLDER_STRUCTURE.md)。所有业务流程为目标设计，不是已实现证据。

## HSAAS · v3 目标系统架构

[打开 Archify](diagrams/v3/01-architecture.html)

```mermaid
flowchart LR
    browsers["访客 / 职员 / 管理员<br/>三类浏览器 · 权限隔离"]
    react_web["React Web<br/>Vercel · 同源 /api 转发"]
    spring_api["Spring Boot API<br/>会话 / CSRF / 业务事务"]
    mysql_store["MySQL<br/>业务数据 / 扫描任务 / Outbox"]
    mrn_adapter["MRN 适配器<br/>mock / 人工；医院 API 待接入"]
    notification_poller["单次消息任务<br/>Backend 内独立异步轮询"]
    whatsapp_gateway["WhatsApp Provider<br/>默认 mock · 实际通道待批准"]
    usb_reader["NFC 读卡器<br/>USB PC/SC · 型号待验证"]
    windows_agent["Windows Reader Agent<br/>Java 21 · 出站 HTTPS"]
    sui_poller["Sui Worker<br/>TypeScript · 租约与对账"]
    testnet_move["Sui Testnet<br/>Move · 最小化审计承诺"]
    browsers -->|"HTTPS"| react_web
    react_web -->|"REST / JSON"| spring_api
    spring_api -->|"原子事务"| mysql_store
    spring_api -->|"MRN / ward"| mrn_adapter
    windows_agent -->|"领任务 / 传结果"| spring_api
    windows_agent -->|"PC/SC"| usb_reader
    mysql_store -->|"领取消息任务"| notification_poller
    notification_poller -->|"一次组合消息"| whatsapp_gateway
    mysql_store -->|"领取审计任务"| sui_poller
    sui_poller -->|"gRPC 锚定 / 对账"| testnet_move
```

## HSAAS · 当前目标目录与上下文入口

[打开 Archify](diagrams/v3/02-folder-structure.html)

```mermaid
flowchart LR
    root_catalog["根目录 AGENTS.md<br/>项目导航 · 读取任务所需文档"]
    planning_shelf["planning/<br/>需求 / 架构 / 数据 / 阶段计划"]
    app_shelf["Implementation/<br/>正式代码边界 · 根 Git 仓库"]
    infra_shelf["Implementation/infra/<br/>本地环境 · 容器 · 发布配置"]
    design_outputs["planning/diagrams/v3/<br/>Archify JSON / HTML / 验证收据"]
    frontend_module["frontend/<br/>Implementation · 开发者手动初始化"]
    backend_module["backend/<br/>Implementation · 开发者手动初始化"]
    reader_module["reader-agent/（计划）<br/>设备协议 · PC/SC · HTTPS"]
    sui_module["sui-worker/ + move/（计划）<br/>异步审计 · 链上幂等"]
    release_evidence["Implementation/docs + tests<br/>运维 / UAT / 跨模块证据"]
    root_catalog -->|"查阅规范"| planning_shelf
    root_catalog -->|"定位实现"| app_shelf
    app_shelf -->|"环境与发布"| infra_shelf
    planning_shelf -->|"生成并验收"| design_outputs
    app_shelf -->|"界面与交互"| frontend_module
    frontend_module -->|"API 契约"| backend_module
    app_shelf -->|"扫描适配"| reader_module
    reader_module -->|"独立集成边界"| sui_module
    infra_shelf -->|"演练与留证"| release_evidence
```

## HSAAS · 登记、审核与实体发卡

[打开 Archify](diagrams/v3/03-registration-issue-workflow.html)

```mermaid
flowchart LR
    qr_entry["扫描公共 QR<br/>四类访客 · 无账号"]
    submit_form["提交登记<br/>字段校验 · 可选消息同意"]
    review_submission["核实登记<br/>Penjaga 核实 MRN / ward"]
    approve_registration["批准登记<br/>VERIFIED · 尚未分配卡"]
    scan_physical_card["扫描实体卡<br/>设备任务 · 核实可用与类别"]
    commit_issue["确认交付并提交<br/>卡 / 借用 / 事件 / 任务"]
    show_issue["显示发卡结果<br/>Pass ID · 截止时间"]
    deliver_combined["单条 WhatsApp<br/>仅发卡成功且有同意"]
    anchor_issue["Sui 异步锚定<br/>持久化承诺 · 可重试"]
    reject_registration["拒绝登记<br/>原因必填 · 不发送消息"]
    recover_scan["扫描例外<br/>重连 / 换卡 · 保留批准"]
    qr_entry -->|"登记"| submit_form
    submit_form -->|"进入队列"| review_submission
    review_submission -->|"核实通过"| approve_registration
    review_submission -->|"核实不通过"| reject_registration
    approve_registration -->|"开始扫描"| scan_physical_card
    scan_physical_card -->|"核验并交付"| commit_issue
    scan_physical_card -->|"无效 / 冲突"| recover_scan
    recover_scan -->|"重新扫描"| scan_physical_card
    commit_issue -->|"事务已提交"| show_issue
    commit_issue -->|"有同意"| deliver_combined
    commit_issue -->|"ISSUED 事件"| anchor_issue
```

## HSAAS · 归还、逾期与遗失处理

[打开 Archify](diagrams/v3/04-return-overdue-workflow.html)

```mermaid
flowchart LR
    active_assignment["使用中的实体卡<br/>ISSUED / OVERDUE"]
    scan_return["扫描并确认收到<br/>RETURN 任务 · 实体卡已收回"]
    commit_return["提交归还事务<br/>关闭借用 · RETURNED 事件"]
    available_again["库存恢复可用<br/>AVAILABLE · 归还是事件"]
    due_elapsed["截止时间已到<br/>UTC now >= due_at"]
    mark_overdue["原子标记逾期<br/>OVERDUE · 一次事件"]
    staff_followup["内部告警与跟进<br/>权限控制联系方式"]
    anchor_return["异步审计锚定<br/>RETURNED / OVERDUE"]
    mark_lost["管理员标记遗失<br/>原因必填 · 关闭当前借用"]
    lost_resolution["遗失后受控恢复<br/>找回核验 · 管理员审核"]
    restore_available["恢复可用库存<br/>RESTORED 事件"]
    active_assignment -->|"归还"| scan_return
    scan_return -->|"收到有效实体卡"| commit_return
    commit_return -->|"事务已提交"| available_again
    due_elapsed -->|"仍有活动借用"| mark_overdue
    mark_overdue -->|"内部告警"| staff_followup
    staff_followup -->|"访客交回卡"| scan_return
    commit_return -->|"写 Outbox"| anchor_return
    mark_overdue -->|"写 Outbox"| anchor_return
    active_assignment -->|"遗失报告"| mark_lost
    mark_lost -->|"找回后核实"| lost_resolution
    lost_resolution -->|"规则允许"| restore_available
```

## HSAAS · NFC 扫描与原子发卡时序

[打开 Archify](diagrams/v3/05-scan-issue-sequence.html)

```mermaid
sequenceDiagram
    participant counter_ui as 柜台 Web
    participant business_api as Spring API
    participant local_reader as Reader Agent
    participant nfc_device as NFC 设备
    participant data_store as MySQL
    counter_ui->>business_api: 创建 ISSUE 扫描任务
    business_api->>data_store: 绑定 actor / device / registration
    local_reader->>business_api: 设备认证 · 领取租约
    business_api-->>local_reader: 任务 nonce / expiry
    local_reader->>nfc_device: 等待移卡后读取 UID / profile
    nfc_device-->>local_reader: UID + 可读 profile 或失败
    local_reader->>business_api: 上传绑定扫描结果
    business_api->>data_store: 校验归属 / 租约 / 一次性结果
    counter_ui->>business_api: 轮询结果后确认交付
    business_api->>data_store: 锁登记 / 卡 / 扫描证据；核实类别
    business_api->>data_store: 原子写借用 / ISSUED / 两类任务
    data_store-->>business_api: COMMIT；证据与幂等结果已保存
    business_api-->>counter_ui: 201 Pass ID / due_at / 任务状态
```

## HSAAS · 发卡后的两条独立异步路径

[打开 Archify](diagrams/v3/06-async-delivery-sequence.html)

```mermaid
sequenceDiagram
    participant job_store as MySQL
    participant chain_worker as Sui Worker
    participant sui_chain as Sui Testnet
    participant message_worker as 消息轮询器
    participant message_provider as WhatsApp
    chain_worker->>job_store: 领取审计租约与版本化承诺
    job_store-->>chain_worker: eventId / hash / 最少元数据
    chain_worker->>sui_chain: 按 eventId 核实已有证明
    sui_chain-->>chain_worker: 已有证明 / 不存在 / 未知
    chain_worker->>sui_chain: 仅确认不存在时提交 Move
    sui_chain-->>chain_worker: 执行状态与交易 digest
    chain_worker->>job_store: 匹配承诺后 CONFIRMED；未知则对账
    message_worker->>job_store: 领取一次组合消息任务
    job_store-->>message_worker: 同意凭据 / issued assignment
    message_worker-->>message_provider: 提交唯一组合消息
    message_provider-->>message_worker: 受理 ID / 已知失败 / 超时未知
    message_worker->>job_store: 保存状态；UNKNOWN 不盲目重发
```

