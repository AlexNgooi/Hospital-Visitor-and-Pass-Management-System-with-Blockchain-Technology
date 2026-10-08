import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const origin = "http://127.0.0.1:15191";
const controls = "http://127.0.0.1:15192";
const output = "output/playwright/real-integration";
const checks = [];
const cookiePolicies = [];

/** Real HTTP browser-like jar; cookie and CSRF values remain memory-only and are never reported. */
class Browser {
  cookie;
  token;
  async request(path, method = "GET", body, csrf = true) {
    const headers = {};
    if (this.cookie) headers.Cookie = this.cookie;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (method !== "GET" && csrf && this.token)
      headers["X-CSRF-TOKEN"] = this.token;
    const response = await fetch(origin + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "error",
    });
    assert.match(response.headers.get("cache-control") ?? "", /no-store/i);
    for (const raw of response.headers.getSetCookie()) {
      if (!raw.startsWith("HSAAS_SESSION=")) continue;
      // Assert wire flags without storing raw Set-Cookie in evidence or debug output.
      const clearing = /Max-Age=0/i.test(raw);
      if (!clearing) {
        const policy = {
          hostOnly: !/;\s*Domain=/i.test(raw),
          httpOnly: /;\s*HttpOnly/i.test(raw),
          sameSiteLax: /;\s*SameSite=Lax/i.test(raw),
          pathRoot: /;\s*Path=\//i.test(raw),
          secure: /;\s*Secure/i.test(raw),
        };
        assert.ok(
          policy.hostOnly &&
            policy.httpOnly &&
            policy.sameSiteLax &&
            policy.pathRoot,
        );
        assert.equal(policy.secure, false);
        cookiePolicies.push(policy);
      }
      this.cookie = clearing ? undefined : raw.split(";")[0];
    }
    const value = response.status === 204 ? undefined : await response.json();
    if (response.status >= 400) {
      assert.equal(value.status, response.status);
      assert.match(value.code, /^[A-Z][A-Z0-9_]+$/);
      assert.ok(Array.isArray(value.fieldErrors));
      assert.match(value.correlationId, /^[a-zA-Z0-9._-]{1,128}$/);
      assert.equal(
        response.headers.get("X-Correlation-ID"),
        value.correlationId,
      );
      assert.ok(
        !JSON.stringify(value).match(
          /Synthetic-only-password|SQLException|stackTrace|rejectedValue/,
        ),
      );
    }
    checks.push({
      path,
      method,
      status: response.status,
      code: value?.code,
      noStore: true,
      contentType:
        response.status === 204 ? "void" : response.headers.get("content-type"),
    });
    return { response, value };
  }
  /** CSRF bootstraps are explicit reads; this harness never automatically repeats a write. */
  async bootstrap() {
    const result = await this.request("/api/public/csrf");
    assert.equal(result.response.status, 200);
    assert.equal(result.value.headerName, "X-CSRF-TOKEN");
    assert.equal(typeof result.value.token, "string");
    this.token = result.value.token;
  }
  async login(account) {
    await this.bootstrap();
    const beforeCookie = this.cookie;
    const beforeToken = this.token;
    const result = await this.request("/api/auth/login", "POST", {
      login: account,
      password: "Synthetic-only-password_1",
    });
    assert.equal(result.response.status, 200);
    assert.notEqual(this.cookie, beforeCookie);
    assert.equal(
      result.value.id,
      account === "staff_integration" ? "9007199254740993" : "9007199254740995",
    );
    assert.deepEqual(
      result.value.counterIds,
      account === "staff_integration" ? ["9007199254741001"] : [],
    );
    // A masked CSRF token differing alone is insufficient; reject the actual pre-login token too.
    this.token = beforeToken;
    const stale = await this.request("/api/auth/logout", "POST", {});
    assert.equal(stale.response.status, 403);
    assert.equal(stale.value.code, "CSRF_INVALID");
    await this.bootstrap();
    return result.value;
  }
}

/** Loopback test controls operate only on the exact owned container, not a fake application server. */
async function control(action) {
  assert.equal(
    (await fetch(controls + "/" + action, { method: "POST" })).status,
    204,
  );
}

await mkdir(output, { recursive: true });
const startedUtc = new Date().toISOString();
try {
  const anonymous = new Browser();
  assert.equal((await anonymous.request("/api/auth/me")).response.status, 401);
  const missing = await anonymous.request(
    "/api/auth/login",
    "POST",
    { login: "staff_integration", password: "Synthetic-only-password_1" },
    false,
  );
  assert.equal(missing.response.status, 403);
  assert.equal(missing.value.code, "CSRF_INVALID");
  await anonymous.bootstrap();
  anonymous.token = "invalid-test-token";
  assert.equal(
    (
      await anonymous.request("/api/auth/login", "POST", {
        login: "staff_integration",
        password: "Synthetic-only-password_1",
      })
    ).response.status,
    403,
  );
  await anonymous.bootstrap();
  const invalid = await anonymous.request("/api/auth/login", "POST", {
    login: "staff_integration",
    password: "incorrect-fixture-password",
  });
  assert.equal(invalid.response.status, 401);
  assert.equal(invalid.value.code, "INVALID_CREDENTIALS");
  assert.equal((await anonymous.request("/api/auth/me")).response.status, 401);
  const meta = await anonymous.request("/api/public/config/registration");
  assert.equal(meta.response.status, 200);
  assert.deepEqual(meta.value, {
    schemaVersion: 1,
    environment: "test",
    readerMode: "disabled",
    mrnMode: "manual",
    notificationStatus: "NOT_ENABLED",
    blockchainStatus: "NOT_ENABLED",
    auditStatus: "LOCAL_ONLY",
  });
  const staff = new Browser();
  const staffDto = await staff.login("staff_integration");
  const me = await staff.request("/api/auth/me");
  assert.equal(me.response.status, 200);
  assert.deepEqual(me.value, staffDto);
  assert.equal(
    (await staff.request("/api/admin/integrations")).response.status,
    403,
  );
  const absent = await staff.request(
    "/api/staff/registrations/9999999999999999",
  );
  assert.equal(absent.response.status, 404);
  const logout = await staff.request("/api/auth/logout", "POST", {});
  assert.equal(logout.response.status, 204);
  await staff.bootstrap();
  assert.equal((await staff.request("/api/auth/me")).response.status, 401);
  const admin = new Browser();
  await admin.login("admin_integration");
  assert.equal(
    (await admin.request("/api/staff/registrations/9999999999999999")).response
      .status,
    403,
  );
  assert.equal(
    (await admin.request("/api/admin/integrations")).response.status,
    200,
  );
  assert.equal(
    (await admin.request("/api/admin/accounts/9999999999999999")).response
      .status,
    404,
  );
  assert.equal(
    (await admin.request("/api/auth/logout", "POST", {})).response.status,
    204,
  );
  // A real Docker pause causes database readiness failure; no canned 503 is supplied.
  await control("pause-db");
  try {
    const outage = await anonymous.request("/api/health");
    assert.equal(outage.response.status, 503);
    assert.equal(outage.value.code, "SERVICE_UNAVAILABLE");
  } finally {
    await control("resume-db");
  }
  assert.equal((await anonymous.request("/api/health")).response.status, 200);
  await writeFile(
    output + "/wire-results.json",
    JSON.stringify(
      {
        provenance:
          "Actual reviewed M00 executable / real Docker MySQL 8.0.45 / Vite same-origin proxy / synthetic records only",
        startedUtc,
        finishedUtc: new Date().toISOString(),
        success: true,
        csrfUnderlyingRotation: true,
        sessionCookieRotated: true,
        idsBeyondSafeIntegerPreserved: true,
        cookiePolicies,
        checks,
        https: "NOT_RUN; isolated loopback HTTP test configuration",
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS real M00 wire: auth/CSRF rotation, string IDs, role 403/object-route 404, cookie flags, no-store, DB outage 503/recovery",
  );
} catch (error) {
  // Assertion operands may be cookie/token comparisons; omit both operands even on failure.
  await writeFile(
    output + "/wire-results.json",
    JSON.stringify(
      {
        startedUtc,
        success: false,
        checks,
        assertion:
          error instanceof assert.AssertionError
            ? { operator: error.operator }
            : "Transport/harness failure",
      },
      null,
      2,
    ),
  );
  console.error("FAIL actual backend wire check; sanitized result saved");
  process.exitCode = 1;
}
