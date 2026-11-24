# Admin redesign — local handoff

Date: 2026-11-16. Branch: `codex/admin-management-redesign`, based on main `ced2c6c`.
Worktree: `C:/Users/alexy/.codex/worktrees/admin-management-redesign/FYP Dev`.

## Before running this version

The source and build are separate from the currently running application. No application/database was started or restarted, no email was sent, and no migration was executed during implementation.

**V10 must be reviewed and applied through the approved migration procedure to the intended dedicated application schema before running this branch.** New account reads require these columns; `--no-migrate` cannot make an old schema compatible. Do not change `hsaas_db`, reuse test schemas or modify existing migrations. Current startup/backup/stop boundaries remain in [MANUAL_NATIVE.md](MANUAL_NATIVE.md). Do not replace a running main/worktree automatically.

## Delivered scope

- Four visible tasks: Overview, Staff management, Pass management, System audit. Visitor management is excluded; existing reference/return settings remain accessible from Pass management. `/admin/reports` and `/admin/settings` remain compatibility routes without separate navigation entries.
- Staff directory: full name, login, account type, active/inactive state, local search/type/status filters, edit and counter grants. Creation is hidden until Create account opens a centered Radix modal. No staff Reason or initial-password input. Role/status changes still require confirmation; audit reasons are automatic. Existing accounts retain passwords and use their login as a name fallback.
- A new staff account has a generated 192-bit temporary password, a stored password hash, a 24-hour expiry and a required first-login password change. A restricted session can only inspect identity, replace its temporary password or sign out. The server denies business APIs. A successful change increments security epoch/version, clears the restriction and invalidates the current session, requiring normal sign-in again. The final ready administrator remains protected; pending setup accounts cannot replace that protection.
- Overview uses real authorized aggregate queries and five-second polling. The selected MYT period applies separately to registration submission, pass issue, actual return and lost closure timestamps. Current open/overdue/no-deadline counts ignore historical dates. Inventory additionally ignores destination filters. SVG charts have labelled numeric table alternatives, filled calendar gaps and stable category colors.
- Export CSV compiles **all matching** registration/pass rows and summary metrics, not the first 50 previews. `Row type` separates `REGISTRATION`, `PASS` and `METRIC`; absent pass deadlines/returns stay blank. No visitor, IC, phone, MRN or patient data is selected. All CSV cells use existing formula neutralization. The combined 10,000-row/JSON byte bounds reject the complete export rather than silently truncating it. Read-committed aggregates/previews may converge on the next refresh during concurrent activity; no historical-as-of reconstruction is promised.
- Export charts captures the displayed snapshot, its filters, MYT date range, time and synthetic origin in a browser-only PNG. A deliberate CSRF POST records the export scope/snapshot before downloading. No pixels are uploaded, no external renderer is used and no uncertain export is replayed automatically.
- Inventory search/type/destination/status filters query the whole authorized stock. Summary counts honor search/type/destination and cover all statuses. Enrollment, lost/disable/restore confirmations, expected versions, history and UNKNOWN recovery remain in the existing lifecycle owner. Admin cannot issue or return passes.
- Audit supports dates, staff, event action and module filters, safe event details and a separate before/after configuration-history tab. No pass, pass rename, registration detail viewing, initial email request and password-change actions have labels/filter options. The event action filter applies only to events; the other filters also apply to configuration history. These remain local records, with blockchain disabled.

## Staff email configuration

SMTP is a separate, opt-in **staff onboarding** function. It does not enable visitor WhatsApp/notification jobs, blockchain or a hospital integration. Missing configuration disables account creation with a visible explanation; the server also rejects creation before inserting an account. No private config was read or copied.

Set the following in the selected application's private runtime configuration, outside Git:

| Variable | Meaning |
|---|---|
| `HSAAS_STAFF_EMAIL_ENABLED` | Explicit `true`; defaults to `false` |
| `HSAAS_STAFF_EMAIL_HOST` | Approved SMTP host |
| `HSAAS_STAFF_EMAIL_PORT` | STARTTLS port; defaults to 587 |
| `HSAAS_STAFF_EMAIL_USERNAME` | SMTP account, if authentication is required |
| `HSAAS_STAFF_EMAIL_PASSWORD` | SMTP credential, never commit or paste into a chat |
| `HSAAS_STAFF_EMAIL_FROM` | Approved sender email |
| `HSAAS_STAFF_EMAIL_LOGIN_URL` | Canonical reachable login URL; HTTPS required except loopback HTTP |

The sender requires STARTTLS and certificate hostname verification, with bounded connect/read/write timeouts. Readiness means configuration is present, not a successful SMTP connection. Confirm the chosen hostname/network and sender permissions before real use. Loopback links only work on the same computer.

Creation commits before SMTP; plaintext credentials exist only in transient request memory and the intended email, never API responses, logs, audit, browser storage or the database. `ACCEPTED` means accepted by the mail server, **not inbox delivery**. `UNKNOWN` means delivery could not be confirmed. `PENDING` can mean sending or an interrupted process; it is not success.

If the HTTP result is uncertain, refresh the directory and inspect the account first. Creation uses unique login/email to prevent duplicate accounts; it has no automatic retry. Edit an active account awaiting setup to deliberately send a replacement initial password; this rotates the old credential and revokes old sessions. A pending send has a one-minute guard before replacement. If an incorrect pending email is changed, the old temporary password is immediately expired and a replacement must be requested for the corrected address. Updating an address does not verify inbox ownership. Deactivated or already initialized staff cannot use the initial-password resend endpoint.

## User-run acceptance — NOT_RUN

1. After separately reviewing/applying V10 and starting this branch, confirm the four menu entries and that Visitor management is absent. Check the desktop sidebar and narrow-window navigation drawer.
2. Confirm that Staff creation is initially hidden, opens only from Create account, traps focus, closes with Cancel/X/Escape when idle and restores focus. Check inline invalid fields, duplicate login/email and the last ready admin protection. Inspect counter-grant changes and revoked sessions.
3. With email disabled, confirm the explanation and absence of a new account. With an approved sender and recipient, create a synthetic staff account and inspect actual delivery. Check ACCEPTED vs UNKNOWN/PENDING wording; do not infer delivery from acceptance.
4. Sign in with its temporary password: direct `/api/admin/**` and `/api/staff/**` requests must fail before password setup. Confirm matching new passwords, temporary-password check, expiry, normal re-login and denial of old sessions/old temporary password. Check explicit resend and correction of a pending email, including concurrent/stale versions.
5. Compare Overview tables/charts/CSV/PNG using an approved synthetic dataset, zero-data and cross-midnight MYT cases. Test category/destination/date filters, multiple passes per registration, lost closures and no deadlines. Verify CSV has all matching rows, correct row types, 25 columns per row and no private visitor/patient fields. Test formula-looking labels and limit rejection.
6. Confirm all four PNG charts, scope/time labels and legends. Change filters during an export, simulate stale/unauthorized data and an uncertain download; no automatic retry or old-filter download may occur.
7. Search/filter inventory with records beyond the first 25; verify summary scope, enrollment naming, selected-card history and lost/disable/restore conflict/UNKNOWN behavior.
8. Find a No pass event under System audit; inspect actor/time/registration association. Check module/action/staff filters, before/after changes, pagination and absence of edit/delete actions or raw private payloads. Existing No pass decisions still create no assignment or return obligation.

## Static validation

- Frontend build and lint: PASS; pre-existing Vite chunk-size warning remains.
- Backend `-DskipTests package`: PASS, including test-source compilation; tests were skipped. Existing RegistrationStore deprecation notice remains.
- `typecheck:test`: FAIL in unchanged `tests/registration.test.tsx` lines 22/34/184 (legacy schema and missing patient fixture). This is not a passing test check.
- Browser, business, SMTP delivery, SQL/migration, concurrency and recovery acceptance: NOT_RUN. No test suite executed.

Current incremental wire descriptions: [admin-management.openapi.json](../api/admin-management.openapi.json). The foundation OpenAPI mirror and old evidence stay unchanged.

## 2026-11-16 user-authorized runtime switch

The user explicitly requested stopping the old version and starting this branch, then explicitly approved applying V10 to `hsaas_manual_native`. Read-only preflight found successful V1–V9 and no onboarding columns. The original private control stopped only its owned applications; the new launcher uses this worktree's JAR/Vite and the original runtime root in place. Private configuration/keys were not copied, MySQL was not restarted, `hsaas_db` was not accessed, and no initialize/seed/restore or email send was performed.

Startup at approximately 23:39 MYT used normal Flyway startup under this explicit migration approval. Read-only verification confirmed successful V10 plus all five onboarding columns. Launcher PID 19860 reached READY; backend `/api/health` and frontend `/login` returned HTTP 200. Served frontend source contains the current Staff modal, compiled/chart export paths and four-task admin shell. This proves migration/startup/source readiness, not browser or business acceptance. SMTP remains disabled/unconfigured. Previous implementation-stage NOT_RUN statements remain historical; browser/business/email/SQL test-suite/concurrency/recovery acceptance remains NOT_RUN.

Current entry: `http://127.0.0.1:15417/login` (backend18407/control15418).

From this worktree, stop this exact owned application group with:

```powershell
node Implementation/scripts/manual-demo.mjs stop --runtime-root 'C:/Users/alexy/Documents/FYP Dev/Implementation'
```

After stopping, this now-V10-compatible version can be resumed without further migrations:

```powershell
node Implementation/scripts/manual-demo.mjs start --no-migrate --runtime-root 'C:/Users/alexy/Documents/FYP Dev/Implementation'
```

Do not run start while the launcher is active. Existing sessions may need normal re-login. No main merge, push or deployment occurred.

## 2026-11-17 Overview layout feedback

The user requested smaller Overview elements at 1480×667 and 920×667, retaining the red/white design. The main dashboard now uses compact spacing, a single-line standard filter strip, side-by-side metric groups and four shorter charts. Desktop/tablet windows >=800×620 use the available viewport; the chart region is focusable and can scroll internally when custom dates or messages need extra room. Smaller/shorter/heavily zoomed viewports reflow naturally. No page content is hidden with a document-level overflow rule.

The previous bottom details disclosure is removed. Top-right **View details** opens `/admin/report-details?from=...&to=...` in a new tab, carrying only applied dates/category/destination IDs. It retains the ADMIN gate and rechecks authorization through the existing report API; independent refresh times are displayed. Invalid/duplicate/unknown query parameters and ranges >366 days are rejected before fetching. **Back to Overview** preserves filters and the matching preset. No extra sidebar task is added. The page contains summary metrics, exact daily values, masked registration previews and pass activity previews; existing full CSV/PNG exports remain on Overview.

Validation: frontend build/lint PASS; planning and diff checks PASS. The existing Vite chunk-size notice remains. No backend/database changes, migration, service restart, browser automation or business actions were performed. Browser/viewport/click/export acceptance is NOT_RUN. User checks: refresh Overview at both reported viewport sizes, inspect all four charts and focusable overflow, toggle custom dates, open View details after applying category/destination filters, inspect the new tab and Back link, and verify CSV/PNG exports and reduced-width/zoom behavior.

## 2026-11-17 navigation follow-up

The user requested restoring the earlier sidebar. ADMIN now uses the same on-demand navigation drawer at all widths: click the top-left menu to open it, close via X/Escape/outside click, or select a route. The persistent desktop sidebar and reserved left margin are removed. Four admin tasks, compact Overview and the separate filtered details page are retained. Frontend build/lint, planning/diff checks PASS; browser/focus/viewport acceptance NOT_RUN. No backend/database/service changes or restart.

## 2026-11-17 Filter button follow-up

The inline Overview filter bar is removed. Use **Filter**, beside **View details**, to open the modal. Choose This day/month/year/Customize plus visitor type/destination, then **Apply filters** to refresh and close. Custom ranges remain limited to 366 MYT days. Cancel/X/Escape/outside click discard unapplied values; reopening starts from the currently applied scope. A compact text summary shows that scope on the main page. CSV/PNG exports and the details link follow only applied filters. Focus starts on Time period and returns to the trigger after dismissal. Metadata failures retain a retry and block Apply.

Frontend build/lint and planning/diff checks PASS. Browser/modal/keyboard/viewport/export/business acceptance NOT_RUN; user checks include Apply vs Cancel, draft reset on reopening, custom-date validation, focus restoration and matching exported/detail scopes. No backend/database/service changes or restart.

## 2026-11-17 chart spacing follow-up

Both Overview chart rows now use 60% left / 40% right above the existing mobile breakpoint. Headings stay at the top; each SVG centers vertically in the remaining card space with a minimum 12px gap below its heading. SVG aspect ratios, compact sizing, mobile single-column reflow and keyboard-accessible internal overflow are retained. Frontend build/lint and planning/diff checks PASS. Browser/viewport appearance is NOT_RUN; user checks should include the reported 1159×667 window and narrow layout. No backend/database/process changes or restart.

## 2026-11-17 compact Staff, Pass and Audit pages

The remaining three admin tasks now match Overview's compact header/control/spacing system at >=800px wide and >=620px high; smaller/shorter/zoomed windows reflow naturally. Their Filter buttons open centered modals. Apply commits criteria; Cancel/X/Escape/outside click discard drafts. Staff search covers the whole loaded authorized directory and stays out of URLs/storage. Inventory filters retain whole-stock server queries and reset to page 1. Audit supports the existing independent business-event and configuration-history scopes and validates date ranges up to 366 MYT days.

Staff has Filter/Refresh/Create account controls, a scrollable directory and fixed count/protection footer. Inventory has Filter/Settings/Refresh/Add pass in its header, compact stock metrics, a scrollable table and visible pagination. Existing enrollment/card-action dialogs retain their exact confirmation/version/UNKNOWN handling. Audit lists have sticky headers/internal scrolling; selected safe details scroll independently beside the table at desktop/tablet widths, while smaller screens stack naturally. Existing audit tabs and Previous/Next/Refresh remain visible outside the table region. The shared filter modal handles first-field focus and safe focus return when a refresh temporarily disables its trigger.

Checks: frontend build/lint, planning and diff checks PASS; existing Vite chunk-size notice remains. No backend/database changes, migration, service restart or business commands. Browser/modal/focus/viewport/business acceptance NOT_RUN. User checks should include all three pages at 1480×667 and 920×667, enough rows to require scrolling, sticky headers/footer controls, Apply vs Cancel/reset-on-reopen, selected long audit records, inventory pagination reset, and existing create/edit/grant/enroll/lost/disable/restore/UNKNOWN flows. Overview and its filtered details/export behavior are retained.

## 2026-11-24 single Active/Inactive status

This increment supersedes the earlier counter-grant/staff-access controls above. Staff management has one Account status selector. Active COUNTER_STAFF can sign in and manage visitors and passes after password setup; Inactive cannot sign in or use existing sessions. ADMIN keeps its administrator permissions. Saving remains versioned, audited and revokes old sessions; the last ready administrator remains protected.

The separate staff-access endpoint is removed. The session's staffAccessEnabled field is derived from account status, role and completed password setup. The immutable V12 migration and its unused legacy column remain for compatibility; no new migration or account data rewrite is required. All currently active staff, including accounts whose old staff access was disabled, receive operational access under the new rule. Review account statuses before deliberately switching to the new release. Build frontend and backend together; an already running version does not change automatically.

User-run checks (NOT_RUN):

1. In Staff management, verify only Active/Inactive appears and the separate Enable/Disable staff access action is absent.
2. Deactivate a signed-in staff account. Verify old tabs cannot use QR, review, issue or return; fresh sign-in fails.
3. Reactivate the account. Verify fresh sign-in can manage visitors/passes, including a new staff account after password setup, without an extra access grant.
4. Verify pending password setup still restricts business APIs, ADMIN cannot handle visitors, the last ready admin cannot be deactivated/demoted, and concurrent stale account edits require reload.

No application/database/service was started or restarted, no email sent and no migration executed for this increment. Check results are recorded in planning/10_BASELINE_REVIEW.md.
