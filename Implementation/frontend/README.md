# HSAAS frontend · M01

React/TypeScript/Vite public shell and same-origin client. Production always uses
the real auth port; tests inject their own explicit synthetic port. There is no
demo account selector, environment-controlled mock login or offline login fallback.

## Run and verify

- `pnpm install --frozen-lockfile`
- `pnpm run dev` (localhost only; default backend `http://127.0.0.1:8080`)
- `pnpm test`, `pnpm run typecheck:test`, `pnpm run lint`, `pnpm run build`
- `pnpm run test:proxy` (ephemeral synthetic HTTP service, no database)

`HSAAS_BACKEND_ORIGIN` is a server-side process variable for dev/preview proxying,
not a VITE-exposed browser variable. `/api` paths/methods/body/status/content-type
and Set-Cookie are preserved, with no path rewrite. Client fetch is same-origin,
no-store, no-referrer and rejects redirects. The client never reads session cookies.
Production hosting must separately configure same-origin `/api` forwarding and
HTML `Cache-Control: no-store` / `Referrer-Policy: no-referrer`. Vite configuration
does not deploy or configure a production reverse proxy.

## Shared extension contracts

M01 is the sole owner of entry/router/CSS/dependencies/client/generated/proxy.
Other modules supply feature components; coordinator integrates their registration.

| Export | Consumer contract |
|---|---|
| `App` `features: FeatureSlot[]` | Exact `/staff/...` or `/admin/...` role-bound slot; `PUBLIC` only `/register`. Reserved slots show honest unavailable states until replaced. |
| `app/auth-context.ts` `useAuth` | Loading/anonymous/authenticated/error and server-returned opaque string IDs; additive `logoutState` and `mutationPending` expose controlled sign-out recovery. This hook does not confer backend permissions. |
| `app/counter-context.ts` `useCounterScope` | Current authorised counter string for view selection; backend always verifies object scope. |
| `app/entry.ts` `entryVault.read/subscribe/clear` | M02-only memory token; URL sanitisation before render and on native hash/back navigation. Subscribe with useSyncExternalStore; clear(expectedToken) fences stale completions. No storage/log/analytics. |
| `lib/api-client.ts` `apiClient.get/post/command` | Every response requires a runtime schema. Protected feature requests must use `authRequired:true`; public grant errors stay public. |
| `Command.execute()` | Retain the handle for unknown/manual retry; path, method, auth policy, key and serialized body are captured when created. Create new handle only for a genuinely new command. No automatic write replay. |
| `ClientError.restartDetails` | Frozen C10 scope/context parsed only for RESTART_REQUIRED. IDs stay strings and categoryScope=null means four categories. Invalid/unknown details are discarded; M02 still adapts safe display labels. |
| `components/ui/primitives.tsx` | Labelled inputs, buttons, loading/empty/error panels, controlled BM restart dialog. Dialog accepts safe labels, not raw API objects. |
| `lib/time.ts` `formatMyt` | UTC timestamps displayed in MYT; server alone determines expiry. |

Use request schemas from each frozen backend contract; never cast raw fetch JSON
or hand-edit generated types. Auth request fields are `{login,password}`; canonical
username rules follow C11, passwords remain byte-for-byte unchanged. Login/logout
rotate CSRF and have no business idempotency keys. Protected 401 clears local
identity even if the response body is malformed; caller cancellation is distinct
from network timeout. UI errors use allowlisted copy, not backend message bodies.

Sign-out clears local identity and fences pending identity results before its
request settles. A failed/unknown response leaves local access cleared and exposes
explicit sign-out retry and read-only session check. A session read cannot undo
sign-out intent; only a new explicit login after confirmed sign-out may do so.
Login failures, including a successful login POST followed by unavailable CSRF,
can be resolved with the persistent session check without replaying credentials.
Void commands such as logout require the contracted HTTP 204 response; unexpected
HTTP 200 does not confirm success.

Form context is `{grantReference,bindingVersion}`. Restart confirmation only calls
the supplied callbacks: M02/M03 implement exchange/CAS/recovery. Do not clear old
inputs before confirmed new binding or swap them into a newly fetched context.
Unknown restart results must first be checked using GET entry. This shell implements
no registration, review, QR generation, patient lookup, issue or return business.

## OpenAPI

`pnpm run api:generate` consumes `../docs/api/openapi.json` once backend owners
deliver it. Output goes to `src/generated/api.d.ts`. The CLI runs in an isolated
pinned TypeScript 5.9 tool environment (hoisted linking for Windows) to respect its peer range while the app
retains TypeScript 6. Generated DTOs are not currently present or claimed complete.

## Browser verification (synthetic only)

For repeatable local checks, explicitly start `node tests/http-fixture.mjs 5188`,
then run dev with `HSAAS_BACKEND_ORIGIN=http://127.0.0.1:5188` in that process.
The fixture is test-only; its two synthetic usernames are `fixture_staff` and
`fixture_admin`, password `fixture-only`. Never use or deploy it as a real identity
service. No real database, patient data or external message is touched.

Playwright CLI screenshots were inspected at 1440×1024 and 375×812. The reusable
`tests/browser-audit.js` snippet injects local axe for browser audits; it is never
bundled in production. Evidence lives in `../docs/evidence/modules/M01/`.
`tests/browser-review-check.js` covers mobile login/CSRF ambiguity and explicit
sign-out recovery against that fixture, with local axe and no login replay.

WhatsApp/blockchain remain not enabled. Reader and live MRN remain unavailable.
Real M00 session/CSRF/MySQL/HTTPS forwarding requires a separate integration review.
