# HSAAS / UPM Hospital Figma UI Specification

> 2026-10-08 当前覆盖：需求、架构和数据/API 以 02/03/04 为准；UI v4 是外观输入，以下能力改变覆盖其旧画面，未重新生成图片或写入 Figma。

## 当前能力覆盖

- 柜台 S03（UI v4 的编号）/旧 S06 QR 页面显示真正轮换的 entry QR、counter/category、server 倒计时、过期/断网/刷新/撤销状态；保留 fullscreen，取消 static print/copy-fixed-URL 作为登记入口。详见 03 R01/R06。
- 访客成功 exchange 后进入独立限时表单；自然 QR 换码不丢填写内容，grant 过期/显式撤销提示重扫码。二维码轮换不能替代 staff 身份核实。
- 当前成功页仅交付文字 public reference，旧图的 receipt/pass QR 不实现成静态码；将来新增此类 QR 仍必须动态且先定义独立权限契约。
- U01 已确认职员登录为 Username / Staff account，不强制邮箱；旧 UI 的 Email 标签由当前规则覆盖。
- U02 已确认同一匿名会话保留单份表单：再次扫码不同入口先显示重新开始确认，取消保留内容，确认后撤销旧 grant 并开始新表单。旧标签页显示原表单已失效，不悄悄切换柜台/类别。
- U03 已确认 synthetic Penjaga 由职员模拟人工核实后才可批准，mock 成功状态不显示“患者已核实”，模拟人工核实与真实模式明确区分。
- WhatsApp 当前显示“未启用”，隐藏发送 opt-in 与 resend；不会生成模拟送达成功提示。将来启用再按一条组合消息规则采集同意。
- Sui proof 页当前显示“未启用”，本地 audit 可用；Verify/Retry 不可操作，不用示例 Match/Pending 冒充运行结果。
- 卡 inventory、issue/return 在 synthetic demo/test 显示 SIMULATED/模拟交付；真实 reader 未准备显示未连接/未启用，生产不提供模拟 bypass。MRN mock/manual 来源明确，无 patient API 已验证假象。

上述是行为/范围计划，不是新的 UI 实现或视觉验收。

## Latest image-review revision — 24 September 2026

The image-first redesign and updated screen inventory are in [UI v4](../output/ui-redesign-v4/README.md), with a [visual gallery](../output/ui-redesign-v4/index.html). The user's latest instruction supersedes the earlier multi-message WhatsApp design: send only one combined message containing a greeting, visitor details, pass details and return deadline. It is sent after approval and successful physical card issue, with opt-in; approval alone still has no Pass ID or deadline. Do not send separate approval, rejection, reminder, overdue or return WhatsApp messages. Internal overdue alerts remain. The v4 palette uses official UPM red `#CA0026` in place of the provisional red below.

## Design direction

- Design language: shadcn/ui-compatible, light theme.
- Font: Geist.
- Primary: provisional UPM clinical red `#9D0B0F`; hover `#7F0A0D`; soft selection `#FEF2F2`.
- Background `#FAFAFA`; surface `#FFFFFF`; foreground `#171717`; muted `#737373`; border `#E5E5E5`.
- Functional colours remain distinct: success green, warning amber, information blue and destructive red.
- Red is reserved for primary actions, active navigation and critical attention states. Hospital work surfaces remain white and neutral.
- Component radius: cards/dialogs 10 px, inputs/buttons 8 px, badges 999 px.
- Do not recreate the official UPM/HSAAS crest. Use a labelled placeholder until approved brand assets are supplied.

## Frames

### Visitor mobile

1. `V01 Visitor category` — 390 × 844
   - BM-first category selection: Executive Visitor, Penjaga, Vendor and Contractor.
   - Penjaga selected with pale-red card, deep-red border and radio/check.
   - Fixed primary `Teruskan` action.
2. `V02 Penjaga registration` — 390 × 1232, 390 × 844 prototype viewport
   - Full name, ID type/number, phone, relationship, masked MRN, ward/location and privacy consent.
   - MRN may be verified or sent for manual verification; failure must not discard the form.
   - Explicit privacy copy: personal and patient data are never sent to blockchain.
3. `V03 Submission success` — 390 × 844
   - Current version: non-sensitive public reference as text; no static receipt QR.
   - Waiting-for-verification badge, counter instructions and save-reference action.

### Counter staff desktop

Desktop frames are 1440 × 1024 with 248 px sidebar, 72 px top bar and 32 px content padding.

4. `S01 Staff login`
   - Red-tinted hospital trust panel plus authorisation-only login card.
5. `S02 Counter dashboard`
   - Waiting review, ready for pass, passes in use and overdue KPI cards.
   - Incoming registration queue, pass availability and quick actions.
6. `S03 Registration review`
   - Queue/review split view, masked personal fields, MRN status and verification checklist.
7. `S04 Issue physical pass dialog`
   - Available-pass combobox, due date/time, handover confirmation and asynchronous audit notice.
8. `S05 Pass return and overdue`
   - Active/overdue/history tabs, overdue table and record-return flow.
9. `S06 Display visitor registration QR`
   - Dashboard quick action and dedicated sidebar entry.
   - Dialog with rotating QR, type, counter/location, countdown, refresh/expired/offline states and full-screen; no static print fallback.
   - QR encodes the registration URL with a short-lived non-PII entry token; server expiry/grant enforcement is required.

### Administrator desktop

10. `A01 Operations overview`
   - Visitor/pass/proof KPIs, category bars, utilisation, activity and attention queue.
11. `A02 Pass inventory`
   - Inventory metrics, filters, lifecycle status table and controlled actions.
12. `A03 Users and settings`
   - Role/status user table plus overdue, session, retention, MRN and Sui Testnet defaults.
13. `A04 Audit and blockchain verifier`
   - Master-detail audit table; local and on-chain hash comparison; confirmed, pending, failed and mismatch states.

## Shared shadcn/ui components

- Button: primary, secondary, outline, ghost and destructive.
- Input, Select/Combobox, Textarea, Checkbox and Switch.
- Card, Badge, Alert, Dialog/AlertDialog and Tabs.
- Sidebar, Breadcrumb, DropdownMenu, Tooltip, Toast/Sonner and Skeleton.
- Table with search, filters, pagination, hover, keyboard focus and empty/error states.

## Privacy and operational rules represented in the UI

- IC, phone and MRN are masked in operational tables and never appear in URLs, toasts or blockchain metadata.
- Sui Testnet proof confirmation is asynchronous and cannot block verify, issue or return.
- Issue and return guard against duplicate or concurrent actions.
- Returned is an event; a successfully returned physical pass becomes Available.
- At least one active administrator must remain.
- Lost/not-returned is a separate authorised flow, not a normal return.

## Figma import assets

- `00_low_fidelity_wireframes.svg`
- `01_visitor_mobile_ui.svg`
- `02_counter_staff_ui.svg`
- `03_administrator_ui.svg`
- `04_shadcn_design_system.svg`
- `05_registration_qr_detail.svg`

The SVG files are editable vectors intended for direct paste/import into Figma. PNG counterparts are visual QA previews only.
