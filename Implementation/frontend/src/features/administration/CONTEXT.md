# M06 frontend administration

## 2026-11-11 account browsing and toast feedback

Staff accounts show the signed-in administrator first, using a labelled dropdown to inspect other accounts individually. Detail panels show the server-projected login, role/status, role responsibilities and counter grants, including revoked/inactive/unavailable access. Selection is reset on actor change; edits and counter grants retain existing reason, version, last-admin and session-revocation behavior. Async save/export/read errors and results use the shared toast; recovery buttons and stale-data labels remain available after dismissal. Save feedback survives version refresh of a deadline editor. Browser/UAT remains NOT_RUN.

- Inputs: UI v4 A05-A12/X04-X06, planning/03 A/D and planning/14 C18-C20; feature-local runtime DTO schemas.
- Output: administrationFeatures contains /admin/users, /admin/settings, /admin/reports, /admin/audit; coordinator owns main.tsx composition. No shell/router/client/generated/dependency edits.
- Behavior: ADMIN roles and explicit counter grants; reason-required versioned reference/return-rule forms; local-only audit; real report dates/category/ward filters with five-second polling, serverUpdatedAt and visible stale/error. Dates are MYT regardless of browser timezone. Poll requests do not overlap and abort on unmount/query changes. Failed reads never synthesize zeros; 401/403 clear old protected data.
- Security: shared same-origin CSRF/authenticated API client. No persistent browser storage, credentials in messages or visitor form fields. CSV POST returns a bounded, audited masked envelope and downloads through a temporary Blob URL. No automatic write/export retry on unknown outcomes; inspect refreshed version/list first. Self access changes can commit and revoke the current browser before its response is delivered.
- Verification: pnpm run build and pnpm run lint; browser/UAT/responsive screenshot acceptance NOT_RUN by user request. Shared-token layout, semantic labels, 44px controls and Radix focus-managed account dialogs are source-reviewed.

## R03 manual pass increment

- Deadline default editor explicitly selects suggested hours (1..720) or no deadline (JSON value:null), retaining loaded version and required reason. Staff per-pass choices override this suggestion; historical assignments are unchanged. Blank hours never become zero/24/null implicitly.
- Reports distinguish submitted registrations, DISTINCT registrations issued/open, pass issue/actual-return/lost counts and current open/no-deadline/overdue counts. Current metrics ignore period dates; no-deadline passes still require return and are excluded from overdue.
- Pass history shows one row per assignment with actual issued destination, full MYT calendar dates/time/seconds and staff IDs. Lost closure remains separate from actual return, and unknown legacy closer is explicitly unavailable. Registration preview shows all requested reference locations without patient fields.
- Both bounded CSV exports use deliberate CSRF POSTs with a synchronous duplicate-click guard, local export audit and no automatic retry. Filename/runtime DTO validation allows hsaas-masked and hsaas-passes only. Stale/unauthorized/error behavior is retained. Focusable labelled table scroll regions expose wide history tables to keyboard users.
- Existing visual tokens/components are retained; no shell/generated/config/dependency edits. Build/lint only; browser/UAT remains NOT_RUN.

## 2026-11-16 authorized admin redesign

Overview now owns real charts, snapshot/period distinctions and compiled CSV/PNG exports. Staff management is a horizontal directory; creation is an explicit centered modal with full name/email and generated initial password. Staff reason inputs are removed while automatic audit reasons remain. System audit has labelled event/module filters, No pass and password/email actions, safe detail panels and independent before/after change history. Visitor management is excluded. Four visible admin tasks are composed in the shell; old report/settings URLs remain available. `chart-data.ts` owns shared chart geometry/data helpers; `chart-export.ts` rasterizes captured SVGs locally after an audited scope request. No raw patient/visitor data enters exports. See docs/runbooks/MANUAL_ADMIN.md from Implementation for configuration, migration prerequisites, checks and NOT_RUN acceptance.

## 2026-11-17 compact Overview and independent details

User requested retaining the design while reducing whole-page overflow at 1480×667 and 920×667. Overview now uses compact filters, grouped period/current metrics and shorter SVG geometry with explicit readable chart labels. At widths >=800px and heights >=620px the shell uses the viewport, while the focusable chart region alone can scroll when custom dates/errors require extra space. Narrower/shorter/zoomed windows retain natural reflow. The top-right View details link opens `/admin/report-details` in a new tab with applied MYT dates/reference IDs; this hidden ADMIN feature is not a fifth menu task. `report-query.ts` rejects unknown/duplicate parameters, invalid dates/ranges and invalid IDs. The details page reauthorizes its own reads, retains safe tables/stale handling and uses manual refresh. Returning to Overview preserves filters and infers the matching preset. Exports retain all four charts, audited scope and existing CSV semantics. Frontend build/lint PASS; browser/viewport/business acceptance remains user-run / NOT_RUN.

## 2026-11-17 Overview filter modal

User requested replacing the in-page filter strip with a Filter button. The top-right Radix trigger now opens a centered, scroll-bounded modal containing time preset/custom dates, visitor type and destination. Drafts live only in the mounted dialog form; Cancel/X/Escape/outside dismissal discard them. Apply validates the existing bounded report query, updates the applied query/URL and closes. Metadata loading/errors retain retry controls and block Apply. Initial focus targets the time-period control; Radix owns focus trapping/restoration. A small report-toolbar summary shows applied dates/reference labels, while reports, export scope and details links never use drafts. Retired inline-filter styles are removed. Frontend build/lint PASS; browser/modal/viewport/business acceptance NOT_RUN.

## 2026-11-17 chart proportions and vertical placement

User requested left/right chart widths of 60/40 and more separation between each heading and its SVG. Overview chart columns now use 3fr/2fr above the existing single-column breakpoint. Each card is a flex column with a fixed heading, 12px minimum gap and automatic block margins that center the undistorted SVG in the space below the heading. Compact SVG sizing, internal scrolling, mobile reflow, data and exports remain unchanged. Build/lint PASS; browser/viewport visual acceptance NOT_RUN.

## 2026-11-17 unify staff and audit density

Staff management and System audit share Overview's compact task frame. Filters move into AdminFilterDialog; form drafts do not change visible data until Apply, and dismissal resets them. Staff search stays memory-only across the complete authorized directory; Refresh reloads staff/counter/email readiness, while create/edit/grant/email behavior is retained. Audit modal supports date presets/custom ranges, actor/action/module with the existing 366-day validation and independent event/configuration scopes. Lists use sticky headers and internal scrolling, footer controls stay visible, and selected audit details scroll independently. Shared modal focus returns to the trigger or temporarily to the heading while inventory refresh disables that trigger; later restoration avoids stealing focus from another control. Browser/focus/viewport acceptance NOT_RUN.

## 2026-11-17 destinations and readable visitor records

Five visible tasks now include Destination management (Ward/Other, create/edit modal, filter modal, version/status/history preservation) in the existing hidden drawer/compact shell. Overview details provides explicit, audited visitor-name registration/loan/activity views with per-registration timeline. CSV uses a type modal and one row grain per file; chart PNG stays separate. No dynamic visitor-type/field builder. Default aggregate Overview polling stays free of personal names. Source checks do not imply SQL/browser/business acceptance; coordinated V11 is still NOT_RUN.

## 2026-11-24 single account status

Staff management exposes one Active/Inactive account status with explicit sign-in and visitor/pass consequences. The independent staff access section/dialog/API is removed. Confirmation, expected version, existing-session revocation, onboarding and last-ready-admin protection remain. Active staff must still complete password setup; ADMIN does not gain staff operations. Session staffAccessEnabled remains a server-derived capability, not an editable setting. Build/lint are recorded in planning/10; browser/business acceptance is user-run / NOT_RUN.
