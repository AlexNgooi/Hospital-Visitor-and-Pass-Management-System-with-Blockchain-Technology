import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

/** Explicit synthetic HTTP fixture for proxy/browser verification, never imported by production. */
export async function startFixture(port = 0) {
  const server = createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "application/json");
    const reply = (status, body) => {
      response.statusCode = status;
      response.end(body === undefined ? undefined : JSON.stringify(body));
    };
    const error = (status, code) =>
      reply(status, {
        timestamp: "2026-10-08T00:00:00Z",
        status,
        code,
        message: "Synthetic fixture only",
        correlationId: "synthetic-fixture",
        fieldErrors: [],
      });
    const staff = request.headers.cookie?.includes("HSAAS_TEST_SESSION=staff");
    const admin = request.headers.cookie?.includes("HSAAS_TEST_SESSION=admin");
    const session = (role) => ({
      id: "9007199254740993",
      login: role === "ADMIN" ? "fixture_admin" : "fixture_staff",
      role,
      counterIds: role === "ADMIN" ? [] : ["01", "02"],
    });
    const path = new URL(request.url, "http://127.0.0.1").pathname;
    if (path === "/api/public/csrf" && request.method === "GET")
      return reply(200, {
        headerName: "X-CSRF-TOKEN",
        token: "synthetic-fixture-csrf",
      });
    if (path === "/api/auth/me")
      return staff || admin
        ? reply(200, session(admin ? "ADMIN" : "COUNTER_STAFF"))
        : error(401, "AUTHENTICATION_REQUIRED");
    if (
      request.method === "POST" &&
      request.headers["x-csrf-token"] !== "synthetic-fixture-csrf"
    )
      return error(403, "CSRF_INVALID");
    if (path === "/api/auth/login" && request.method === "POST") {
      let raw = "";
      for await (const chunk of request) raw += chunk;
      let input;
      try {
        input = JSON.parse(raw);
      } catch {
        return error(400, "VALIDATION_FAILED");
      }
      if (
        !["fixture_staff", "fixture_admin"].includes(input.login) ||
        input.password !== "fixture-only"
      )
        return error(401, "INVALID_CREDENTIALS");
      response.setHeader(
        "Set-Cookie",
        `HSAAS_TEST_SESSION=${input.login === "fixture_admin" ? "admin" : "staff"}; Path=/; HttpOnly; SameSite=Lax`,
      );
      return reply(
        200,
        session(input.login === "fixture_admin" ? "ADMIN" : "COUNTER_STAFF"),
      );
    }
    if (path === "/api/auth/logout" && request.method === "POST") {
      response.setHeader(
        "Set-Cookie",
        "HSAAS_TEST_SESSION=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
      );
      return reply(204);
    }
    if (path === "/api/staff/registrations") {
      if (admin) return error(403, "ACCESS_DENIED");
      return staff
        ? reply(200, { items: [] })
        : error(401, "AUTHENTICATION_REQUIRED");
    }
    if (path === "/api/health/readiness")
      return error(503, "SERVICE_UNAVAILABLE");
    if (path === "/api/public/test-error") {
      response.statusCode = 500;
      response.setHeader("Content-Type", "text/plain");
      return response.end("Synthetic upstream failure");
    }
    return error(404, "RESOURCE_NOT_FOUND");
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  return server;
}

// Manual preview uses an explicitly started fixture, never an automatic login fallback.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const server = await startFixture(Number(process.argv[2] ?? 5188));
  console.log(
    `SYNTHETIC HTTP fixture listening on 127.0.0.1:${server.address().port}`,
  );
  const stop = () => server.close();
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
