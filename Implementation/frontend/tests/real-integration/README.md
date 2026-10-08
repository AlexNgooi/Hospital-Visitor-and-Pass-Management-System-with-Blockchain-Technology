# Disposable real M00 integration

These scripts use the actual reviewed backend executable, actual MySQL 8.0.45,
and Vite same-origin forwarding. Only database records and fault conditions are
synthetic. They do not load `.env`, use native MySQL, run console bootstrap,
change backend production code/migrations, or enable external integrations.

From frontend, first build the backend and resolve its Java fixture classpath:

```powershell
# Package reviewed source; this command does not claim a new backend unit-test run.
Push-Location ../backend
.\mvnw.cmd -B -DskipTests package
.\mvnw.cmd -B dependency:build-classpath '-Dmdep.outputFile=../frontend/output/playwright/real-runtime-classpath.txt'
Pop-Location
# Keep this harness terminal running until the explicit stop control is called.
node tests/real-integration/harness.mjs
```

The harness refuses busy loopback ports 18091/15191/15192 and an existing Docker
name. It creates the labelled `hsaas-m01-real-4156` container with a random
loopback MySQL port, random in-memory DB credentials and an empty
`hsaas_m01_integration` database. Flyway applies unchanged V1–V3. The fixture then
inserts synthetic staff/admin/counter IDs above JavaScript's safe integer range
using Spring's password encoder. The test-only trigger requires
`log_bin_trust_function_creators=1` on that disposable server; this is never a
production setting or grant change. Backend profile `integration-m01` explicitly
clears config import and uses `test` environment/non-Secure loopback HTTP cookies.

Before creating files, checking ports or launching Docker/Java, the harness rejects
inherited `SPRING_*` variables and common JVM/Node injection options, including
JAVA_TOOL_OPTIONS, JDK_JAVA_OPTIONS and _JAVA_OPTIONS. Refusal prints a fixed
message, never the host variable value. Remove those overrides from the test
terminal environment before normal startup. All subprocesses receive one shared
OS/runtime allowlist plus explicit disposable values; inherited HSAAS credentials
and unrelated configuration are dropped. Backend and fixture use the same clean
database environment. Backend configuration is restricted to packaged
`classpath:/application.yaml`, with empty additional locations/import/profile
includes/group and the explicit integration-m01 profile; cwd configuration and
external profile groups cannot redirect Flyway.

```powershell
# Non-secret refusal case uses port9/ignored without connecting to it or starting Docker/Java.
node --test --test-reporter=spec tests/real-integration/environment-check.mjs
```

The environment check covers the allowlist, case-insensitive Spring/JVM injection
names and an actual harness subprocess carrying
`SPRING_DATASOURCE_URL=jdbc:mysql://127.0.0.1:9/ignored`. It must exit1 before even
creating an output directory; the override target is never probed. These 16 native
Node checks are separate from the frontend's previously reviewed 68 Vitest tests.

In another frontend terminal:

```powershell
# Actual HTTP checks; no canned server responses or automatic auth POST retries.
node tests/real-integration/wire.mjs
# Named isolated browser; inspect the initial snapshot before running the checked-in test flow.
npx --yes --package @playwright/cli playwright-cli -s=hsaas-m01-real open http://127.0.0.1:15191/login --headed
npx --yes --package @playwright/cli playwright-cli -s=hsaas-m01-real snapshot
npx --yes --package @playwright/cli playwright-cli -s=hsaas-m01-real run-code --filename=tests/real-integration/browser.js
# Close only this named browser and stop only the harness's owned resources.
npx --yes --package @playwright/cli playwright-cli -s=hsaas-m01-real close
Invoke-WebRequest -Uri http://127.0.0.1:15192/stop -Method Post
```

The browser uses real login/client/provider behavior. A real temporary MySQL
delete trigger makes logout fail after durable revocation; explicit me401 checks
confirm local recovery. A fixed fixture epoch mutation tests the actual client
expiry subscription. One post-login CSRF response is deliberately dropped **after
the request reaches the real backend** to test transport UNKNOWN; its response
is not replaced by a synthetic success. This fault is distinct from a real M00
503. The HTTP check pauses only this container to prove database outage readiness.

Loopback test controls accept only fixed actions and have no production route.
Their root capability is restricted to this disposable resource. Keep the harness
local and do not deploy it. Output/logs/cookie jars are not committed; sanitized
receipts contain status/code/boolean checks and token-free screenshots only.
HTTPS, production Secure-cookie forwarding and business object authorization
remain separate acceptance gates. A 404 on an unimplemented role route proves
safe routing/error behavior, not later-module object scope enforcement.
