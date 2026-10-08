import assert from "node:assert/strict";
import { createServer } from "vite";
import { startFixture } from "./http-fixture.mjs";

/** Verify transport through the actual Vite config; fixture semantics are not M00 evidence. */
const backend = await startFixture();
const previousOrigin = process.env.HSAAS_BACKEND_ORIGIN;
process.env.HSAAS_BACKEND_ORIGIN = `http://127.0.0.1:${backend.address().port}`;
let frontend;
try {
  frontend = await createServer({
    server: { host: "127.0.0.1", port: 0 },
    logLevel: "silent",
  });
  await frontend.listen();
  const origin = `http://127.0.0.1:${frontend.httpServer.address().port}`;
  let cookie = "";
  const request = (path, options = {}) =>
    fetch(origin + path, {
      ...options,
      headers: { Cookie: cookie, ...options.headers },
      redirect: "manual",
    });
  const bootstrap = await request("/api/public/csrf");
  assert.equal(bootstrap.status, 200);
  assert.equal(bootstrap.headers.get("cache-control"), "no-store");
  const { headerName, token } = await bootstrap.json();
  const missing = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(missing.status, 403);
  assert.equal((await missing.json()).code, "CSRF_INVALID");
  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { [headerName]: token, "Content-Type": "application/json" },
    body: JSON.stringify({ login: "fixture_staff", password: "fixture-only" }),
  });
  assert.equal(login.status, 200);
  assert.equal((await login.json()).id, "9007199254740993");
  // Synthetic cookie remains in memory; never write or print cookie/token values.
  assert.match(login.headers.get("set-cookie"), /HttpOnly.*SameSite=Lax/);
  cookie = login.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (await (await request("/api/auth/me")).json()).role,
    "COUNTER_STAFF",
  );
  const hidden = await request("/api/staff/objects/out-of-scope");
  assert.equal(hidden.status, 404);
  const logout = await request("/api/auth/logout", {
    method: "POST",
    headers: { [headerName]: token },
    body: "{}",
  });
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  cookie = "";
  assert.equal((await request("/api/auth/me")).status, 401);
  cookie = "HSAAS_TEST_SESSION=admin";
  assert.equal((await request("/api/staff/registrations")).status, 403);
  assert.equal((await request("/api/health/readiness")).status, 503);
  const upstreamError = await request("/api/public/test-error");
  assert.equal(upstreamError.status, 500);
  assert.match(upstreamError.headers.get("content-type"), /text\/plain/);
  assert.equal(await upstreamError.text(), "Synthetic upstream failure");
  const page = await request("/register");
  assert.equal(page.headers.get("referrer-policy"), "no-referrer");
  assert.equal(page.headers.get("cache-control"), "no-store");
  console.log(
    "PASS synthetic proxy: path/method/body/content-type/status/cookie/no-store, CSRF/login/me/logout/401/403/404/503/500 and entry headers. Real M00/DB/HTTPS NOT_RUN.",
  );
} finally {
  await frontend?.close();
  await new Promise((resolve) => backend.close(resolve));
  if (previousOrigin === undefined) delete process.env.HSAAS_BACKEND_ORIGIN;
  else process.env.HSAAS_BACKEND_ORIGIN = previousOrigin;
}
