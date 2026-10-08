import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiClient } from "../src/lib/api-client";
import { canonicalLogin, sessionSchema } from "../src/lib/contracts";
import { createAuthPort } from "../src/lib/auth";
import { ClientError, safeError } from "../src/lib/errors";
import { createEntryVault } from "../src/app/entry-token";
import { formatMyt } from "../src/lib/time";

// All fixtures are explicitly synthetic. Never use a real password/cookie/token in evidence.
const user = {
  id: "9007199254740993",
  login: "staff_01",
  role: "COUNTER_STAFF",
  counterIds: ["9007199254740995"],
};
const csrf = { headerName: "X-CSRF-TOKEN", token: "synthetic-test-csrf" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
const apiError = (code: string, status: number, extra = {}) =>
  json(
    {
      timestamp: "2026-10-08T00:00:00Z",
      code,
      status,
      message: "never-display-raw-secret",
      correlationId: "test-correlation",
      fieldErrors: [],
      ...extra,
    },
    status,
  );

describe("frozen transport boundaries", () => {
  it("retains opaque long IDs and sends same-origin/no-store/no-referrer requests", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json(user));
    expect(
      await new ApiClient(fetcher).get("/api/auth/me", sessionSchema),
    ).toEqual(user);
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "no-referrer",
    });
  });
  it.each([
    "https://other.example/api/x",
    "//other.example/api/x",
    "/api/../x",
    "/api/%2e%2e/x",
    "/api/%2fx",
    "/api/x#secret",
  ])("rejects unsafe path %s before fetch", async (path) => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      new ApiClient(fetcher).get(path, sessionSchema),
    ).rejects.toThrow("Only same-origin");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("bootstraps CSRF, rotates after login/logout and never applies business keys to auth", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(csrf))
      .mockResolvedValueOnce(json(user))
      .mockResolvedValueOnce(json({ ...csrf, token: "synthetic-rotated" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json(csrf));
    const port = createAuthPort(new ApiClient(fetcher));
    expect(await port.login(" Staff_01 ", " synthetic password ")).toEqual(
      user,
    );
    await port.logout();
    expect(fetcher.mock.calls.map(([path]) => path)).toEqual([
      "/api/public/csrf",
      "/api/auth/login",
      "/api/public/csrf",
      "/api/auth/logout",
      "/api/public/csrf",
    ]);
    expect(fetcher.mock.calls[1][1]?.body).toBe(
      JSON.stringify({ login: "staff_01", password: " synthetic password " }),
    );
    expect(
      new Headers(fetcher.mock.calls[1][1]?.headers).get("X-CSRF-TOKEN"),
    ).toBe(csrf.token);
    expect(
      new Headers(fetcher.mock.calls[3][1]?.headers).get("X-CSRF-TOKEN"),
    ).toBe("synthetic-rotated");
    expect(
      new Headers(fetcher.mock.calls[1][1]?.headers).has("Idempotency-Key"),
    ).toBe(false);
  });
  it("preserves command key/body across unknown results without automatically retrying", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(csrf))
      .mockRejectedValueOnce(new TypeError("raw-secret"))
      .mockResolvedValueOnce(json({ reference: "SYNTHETIC" }));
    const body = {
      expectedVersion: 1,
      formContext: { grantReference: "synthetic", bindingVersion: 3 },
    };
    const command = new ApiClient(fetcher).command(
      "/api/staff/registrations/1/verify",
      body,
      z.object({ reference: z.string() }),
      { authRequired: true },
    );
    await expect(command.execute()).rejects.toMatchObject({ kind: "network" });
    expect(fetcher).toHaveBeenCalledTimes(2);
    body.expectedVersion = 9;
    await command.execute();
    expect(fetcher.mock.calls[1][1]?.body).toBe(fetcher.mock.calls[2][1]?.body);
    expect(
      JSON.parse(fetcher.mock.calls[2][1]?.body as string).expectedVersion,
    ).toBe(1);
    expect(
      new Headers(fetcher.mock.calls[1][1]?.headers).get("Idempotency-Key"),
    ).toBe(command.key);
    expect(
      new Headers(fetcher.mock.calls[2][1]?.headers).get("Idempotency-Key"),
    ).toBe(command.key);
  });
  it("rejects noncanonical idempotency keys", () => {
    expect(() =>
      new ApiClient().command("/api/public/registrations", {}, z.object({}), {
        key: "ABC",
      }),
    ).toThrow("canonical UUIDv4");
  });
  it.each([true, false])(
    "snapshots command method and protected expiry policy even if options mutate (%s)",
    async (authRequired) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(json(csrf))
        .mockRejectedValueOnce(new TypeError("synthetic network failure"))
        .mockResolvedValueOnce(apiError("AUTHENTICATION_REQUIRED", 401));
      const client = new ApiClient(fetcher),
        expired = vi.fn();
      client.onSessionExpired(expired);
      const options: {
        authRequired: boolean;
        method: "PATCH" | "DELETE";
        key: string;
      } = {
        authRequired,
        method: "PATCH",
        key: "12345678-1234-4234-8234-123456789abc",
      };
      const body = {
        expectedVersion: 3,
        formContext: { grantReference: "synthetic", bindingVersion: 2 },
      };
      const command = client.command(
        "/api/staff/registrations/1/verify",
        body,
        z.object({}),
        options,
      );
      await expect(command.execute()).rejects.toMatchObject({
        kind: "network",
      });
      options.method = "DELETE";
      options.authRequired = !authRequired;
      options.key = "87654321-1234-4234-8234-123456789abc";
      body.expectedVersion = 99;
      await expect(command.execute()).rejects.toMatchObject({
        code: "AUTHENTICATION_REQUIRED",
      });
      const first = fetcher.mock.calls[1],
        retry = fetcher.mock.calls[2];
      expect(retry[0]).toBe(first[0]);
      expect(retry[1]?.method).toBe("PATCH");
      expect(retry[1]?.body).toBe(first[1]?.body);
      expect(JSON.parse(retry[1]?.body as string).expectedVersion).toBe(3);
      expect(new Headers(retry[1]?.headers).get("Idempotency-Key")).toBe(
        command.key,
      );
      expect(expired).toHaveBeenCalledTimes(authRequired ? 1 : 0);
      expect(fetcher).toHaveBeenCalledTimes(3);
    },
  );
  it("does not retry CSRF failures and only the next explicit command reboots token", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(csrf))
      .mockResolvedValueOnce(apiError("CSRF_INVALID", 403))
      .mockResolvedValueOnce(json(csrf))
      .mockResolvedValueOnce(json({}));
    const client = new ApiClient(fetcher);
    await expect(
      client.post("/api/auth/login", {}, z.object({})),
    ).rejects.toMatchObject({ code: "CSRF_INVALID" });
    expect(fetcher).toHaveBeenCalledTimes(2);
    await client.post("/api/auth/login", {}, z.object({}));
    expect(fetcher.mock.calls[2][0]).toBe("/api/public/csrf");
  });
  it("deduplicates concurrent CSRF bootstrap", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json(csrf));
    const client = new ApiClient(fetcher);
    await Promise.all([client.bootstrapCsrf(), client.bootstrapCsrf()]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("does not claim void logout success for an unexpected 200 response", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(csrf))
      .mockResolvedValueOnce(json({}));
    await expect(
      createAuthPort(new ApiClient(fetcher)).logout(),
    ).rejects.toMatchObject({ kind: "invalid-response" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("prevents pre-rotation inflight CSRF from restoring a stale token", async () => {
    let finish!: (response: Response) => void;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce(json({ ...csrf, token: "fresh-test" }))
      .mockResolvedValueOnce(json({}));
    const client = new ApiClient(fetcher);
    const old = client.bootstrapCsrf();
    client.invalidateCsrf();
    const fresh = client.bootstrapCsrf();
    finish(json(csrf));
    await Promise.all([old, fresh]);
    await client.post("/api/auth/logout", {}, z.object({}));
    expect(
      new Headers(fetcher.mock.calls[2][1]?.headers).get("X-CSRF-TOKEN"),
    ).toBe("fresh-test");
  });
  it("separates public grant failures from protected session expiry, including malformed 401", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(apiError("REGISTRATION_ENTRY_REQUIRED", 403))
      .mockResolvedValueOnce(
        new Response("<secret>proxy</secret>", {
          status: 401,
          headers: { "content-type": "text/html" },
        }),
      );
    const client = new ApiClient(fetcher),
      expired = vi.fn();
    client.onSessionExpired(expired);
    await expect(
      client.get("/api/public/registration-entry", z.object({})),
    ).rejects.toMatchObject({ code: "REGISTRATION_ENTRY_REQUIRED" });
    expect(expired).not.toHaveBeenCalled();
    await expect(
      client.get("/api/staff/registrations", z.object({}), {
        authRequired: true,
      }),
    ).rejects.toMatchObject({ kind: "invalid-response" });
    expect(expired).toHaveBeenCalledTimes(1);
  });
  it.each([
    new Response("<secret>SQL</secret>", {
      headers: { "content-type": "text/html" },
    }),
    json({ ...user, id: 9007199254740992 }),
    new Response("broken", { headers: { "content-type": "application/json" } }),
  ])("rejects malformed success safely", async (response) => {
    await expect(
      new ApiClient(vi.fn<typeof fetch>().mockResolvedValue(response)).get(
        "/api/auth/me",
        sessionSchema,
      ),
    ).rejects.toMatchObject({
      kind: "invalid-response",
      message: "The service returned an unexpected response.",
    });
  });
  it("does not expose backend messages or unknown details", async () => {
    expect.assertions(4);
    const client = new ApiClient(
      vi.fn<typeof fetch>().mockResolvedValue(
        apiError("SERVICE_UNAVAILABLE", 503, {
          details: { secret: "private" },
          fieldErrors: [{ field: "login", code: "x", message: "private" }],
        }),
      ),
    );
    try {
      await client.get("/api/auth/me", sessionSchema);
    } catch (error) {
      expect(error).toBeInstanceOf(ClientError);
      expect(JSON.stringify(error)).not.toContain("private");
      expect((error as ClientError).message).not.toContain("raw-secret");
      expect((error as ClientError).restartDetails).toBeUndefined();
    }
  });
  it("only retains frozen C10 restart details; IDs stay opaque and null stays four-category", async () => {
    expect.assertions(2);
    const details = {
      currentFormContext: { grantReference: "synthetic", bindingVersion: 2 },
      currentScope: {
        environment: "SYNTHETIC",
        counterId: "9007199254740993",
        categoryScope: null,
      },
      requestedScope: {
        environment: "SYNTHETIC",
        counterId: "2",
        categoryScope: "3",
      },
      token: "discard",
    };
    const client = new ApiClient(
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          apiError("REGISTRATION_ENTRY_RESTART_REQUIRED", 409, { details }),
        ),
    );
    try {
      await client.get("/api/public/registration-entry", z.object({}));
    } catch (error) {
      expect((error as ClientError).restartDetails).toEqual({
        currentFormContext: details.currentFormContext,
        currentScope: details.currentScope,
        requestedScope: details.requestedScope,
      });
      expect(JSON.stringify(error)).not.toContain("discard");
    }
  });
  it.each([
    { counterId: 123, categoryScope: null, bindingVersion: 2 },
    { counterId: "123", categoryScope: "PENJAGA", bindingVersion: 2 },
    { counterId: "123", categoryScope: null, bindingVersion: 9007199254740992 },
    { counterId: "123", categoryScope: null, bindingVersion: -1 },
  ])(
    "discards malformed restart details without reflecting them",
    async ({ counterId, categoryScope, bindingVersion }) => {
      const scope = { environment: "SYNTHETIC", counterId, categoryScope };
      const client = new ApiClient(
        vi.fn<typeof fetch>().mockResolvedValue(
          apiError("REGISTRATION_ENTRY_RESTART_REQUIRED", 409, {
            details: {
              currentFormContext: {
                grantReference: "synthetic",
                bindingVersion,
              },
              currentScope: scope,
              requestedScope: scope,
            },
          }),
        ),
      );
      await expect(
        client.get("/api/public/registration-entry", z.object({})),
      ).rejects.toMatchObject({
        code: "REGISTRATION_ENTRY_RESTART_REQUIRED",
        restartDetails: undefined,
      });
    },
  );
  it("distinguishes caller cancellation from timeouts", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(
        (_path, options) =>
          new Promise((_resolve, reject) =>
            options?.signal?.addEventListener("abort", () =>
              reject(new DOMException("cancel", "AbortError")),
            ),
          ),
      );
    const client = new ApiClient(fetcher, 20);
    await expect(
      client.get("/api/auth/me", sessionSchema),
    ).rejects.toMatchObject({ kind: "timeout" });
    const controller = new AbortController();
    const request = client.get("/api/auth/me", sessionSchema, {
      signal: controller.signal,
    });
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("input, entry and time contracts", () => {
  it.each([
    " ab ",
    "a@b",
    "abc\t",
    "abc\n",
    "ébc",
    "Kbc",
    "a b",
    ".abc",
    "a".repeat(65),
  ])("rejects invalid username %s", (input) =>
    expect(canonicalLogin(input)).toBeNull(),
  );
  it("canonicalizes ASCII space and case only", () =>
    expect(canonicalLogin(" STAFF_01 ")).toBe("staff_01"));
  it("clears even malformed entry fragments and keeps token only in memory", () => {
    const history = { replaceState: vi.fn() };
    const vault = createEntryVault(
      { pathname: "/register", hash: "#entry=synthetic-entry", search: "" },
      history,
    );
    expect(history.replaceState).toHaveBeenCalledWith(null, "", "/register");
    expect(vault.read()).toBe("synthetic-entry");
    vault.clear();
    expect(vault.read()).toBeNull();
    createEntryVault(
      { pathname: "/register", hash: "#invalid", search: "" },
      history,
    );
    expect(history.replaceState).toHaveBeenCalledTimes(2);
  });
  it("formats UTC in MYT and refuses ambiguous local timestamps", () => {
    expect(formatMyt("2026-10-08T00:00:00Z")).toMatch(/8.*2026.*8:00/);
    expect(formatMyt("2026-10-08T00:00:00")).toBe("—");
  });
  it("captures a new same-document entry and fences an obsolete exchange clear", () => {
    const location = {
      pathname: "/register",
      hash: "#entry=synthetic-old",
      search: "",
    };
    const state = { idx: 3, key: "router-fixture" };
    const history = { replaceState: vi.fn(), state };
    const vault = createEntryVault(location, history);
    const notified = vi.fn();
    vault.subscribe(notified);
    location.hash = "#entry=synthetic-new";
    vault.capture();
    expect(history.replaceState).toHaveBeenLastCalledWith(
      state,
      "",
      "/register",
    );
    expect(vault.read()).toBe("synthetic-new");
    expect(notified).toHaveBeenCalledTimes(1);
    vault.clear("synthetic-old");
    expect(vault.read()).toBe("synthetic-new");
    vault.clear("synthetic-new");
    expect(vault.read()).toBeNull();
  });
  it("provides safe BM public failure copy without reflecting unknown backend input", () => {
    expect(safeError(new ClientError("timeout"), "ms")).toContain(
      "Hasilnya mungkin belum diketahui",
    );
    expect(safeError(new Error("private-input"), "ms")).not.toContain(
      "private-input",
    );
  });
});
