# HSAAS / UPM Hospital Figma UI Specification

> 2026-10-05 当前版：需求、架构和数据/API 以 [规划入口](README.md) 的 02/03/04 为准；UI 交互以 output/ui-redesign-v4/README.md 为准。

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
   - Non-sensitive public reference and QR only.
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
   - shadcn Dialog with a large QR, registration type, counter/location, print and full-screen actions.
   - QR encodes only the public visitor-registration URL; no visitor, IC, phone, MRN or patient data.

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
