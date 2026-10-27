# M06 frontend administration

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
