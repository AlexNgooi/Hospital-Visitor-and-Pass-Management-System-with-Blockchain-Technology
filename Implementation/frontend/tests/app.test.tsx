import { describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import axe from "axe-core";
import { useEffect } from "react";
import App from "../src/App";
import type { AuthPort } from "../src/lib/auth";
import type { Role, SessionUser } from "../src/lib/contracts";
import { ClientError } from "../src/lib/errors";
import { ApiClient } from "../src/lib/api-client";
import { createAuthPort } from "../src/lib/auth";
import { useAuth, type AuthContextValue } from "../src/app/auth-context";
import { AuthProvider } from "../src/app/auth-provider";
import {
  RestartConfirmation,
  StatusPanel,
} from "../src/components/ui/primitives";

// Mock injection exists only here; production entry imports the real auth port.
function fixture(role: Role = "COUNTER_STAFF"): SessionUser {
  return {
    id: "1",
    login: "synthetic_staff",
    role,
    counterIds: role === "ADMIN" ? [] : ["01", "02"],
  };
}
function anonymous(): ClientError {
  return new ClientError("api", {
    timestamp: "test",
    status: 401,
    code: "AUTHENTICATION_REQUIRED",
    message: "",
    correlationId: "test",
    fieldErrors: [],
  });
}
function mockPort(role?: Role) {
  let expired = () => {};
  const port: AuthPort = {
    me: vi.fn().mockImplementation(async () => {
      if (!role) throw anonymous();
      return fixture(role);
    }),
    login: vi.fn().mockResolvedValue(fixture()),
    logout: vi.fn().mockResolvedValue(undefined),
    onExpired: (listener) => {
      expired = listener;
      return () => {};
    },
  };
  return { port, expire: () => expired() };
}
function mount(
  path: string,
  port: AuthPort,
  features: Parameters<typeof App>[0]["features"] = [],
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App auth={port} features={features} />
    </MemoryRouter>,
  );
}

/** Review regressions exercise the real auth/client adapter with synthetic HTTP responses. */
const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
function httpAnonymous() {
  return jsonResponse(
    {
      timestamp: "test",
      status: 401,
      code: "AUTHENTICATION_REQUIRED",
      message: "",
      correlationId: "test",
      fieldErrors: [],
    },
    401,
  );
}

describe("shell auth and role interactions", () => {
  it("validates linked error summary and focuses it without making an auth request", async () => {
    const { port } = mockPort();
    mount("/login", port);
    await screen.findByLabelText("Username / Staff account");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(port.login).not.toHaveBeenCalled();
    const summary = screen.getByRole("alert");
    expect(document.activeElement).toBe(summary);
    await user.click(screen.getByRole("link", { name: "Username" }));
    expect(document.activeElement).toBe(
      screen.getByLabelText("Username / Staff account"),
    );
    expect(screen.getByLabelText("Password").getAttribute("aria-invalid")).toBe(
      "true",
    );
  });
  it("keeps full inline rules once and linked focus when bootstrap and validation feedback coexist", async () => {
    // Compact copy must preserve field guidance, live feedback and recovery without an auth write.
    const { port } = mockPort();
    vi.mocked(port.me).mockRejectedValue(new ClientError("network"));
    mount("/login", port);
    await screen.findByText("Unable to check your current session.");
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Sign in" }),
    );
    const summary = screen.getByRole("alert", {
      name: "Please check your sign-in details",
    });
    expect(document.activeElement).toBe(summary);
    expect(screen.getAllByText(/^Use 3–64 letters/)).toHaveLength(1);
    expect(screen.getAllByText("Enter your password.")).toHaveLength(1);
    expect(
      screen
        .getByLabelText("Username / Staff account")
        .getAttribute("aria-describedby"),
    ).toContain("login-error");
    await user.click(
      screen.getByRole("link", { name: "Password" }),
    );
    expect(document.activeElement).toBe(
      screen.getByLabelText("Password", { exact: true }),
    );
    expect(port.login).not.toHaveBeenCalled();
    expect(
      screen
        .getByRole("button", { name: "Check current session" })
        .getAttribute("type"),
    ).toBe("button");
  });
  it("signs in using username (not email), preserves password bytes and navigates to role workspace", async () => {
    const { port } = mockPort();
    mount("/login", port);
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Username / Staff account") as HTMLInputElement)
          .disabled,
      ).toBe(false),
    );
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Username / Staff account"),
      " STAFF_01 ",
    );
    await user.type(screen.getByLabelText("Password"), " synthetic password ");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password").getAttribute("type")).toBe("text");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByRole("heading", { name: "Your workspace, ready." });
    expect(port.login).toHaveBeenCalledWith("staff_01", " synthetic password ");
    expect(
      screen.getByRole("combobox", { name: "Counter access" }).children,
    ).toHaveLength(2);
  });
  it("clears password after a failed login and uses safe failure copy", async () => {
    const { port } = mockPort();
    vi.mocked(port.login).mockRejectedValue(new ClientError("network"));
    mount("/login", port);
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Username / Staff account") as HTMLInputElement)
          .disabled,
      ).toBe(false),
    );
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Username / Staff account"),
      "staff_01",
    );
    await user.type(screen.getByLabelText("Password"), "synthetic");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText(/Unable to connect/);
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe(
      "",
    );
    expect(
      screen.getByRole("button", { name: "Check current session" }),
    ).toBeTruthy();
  });
  it("denies ADMIN entry to staff routes and never shows review navigation", async () => {
    const { port } = mockPort("ADMIN");
    mount("/staff/registrations", port);
    await screen.findByRole("heading", { name: "Access restricted" });
    expect(
      screen.queryByRole("navigation", { name: "Counter navigation" }),
    ).toBeNull();
  });
  it("shows ADMIN-only navigation without granting counter permissions", async () => {
    const { port } = mockPort("ADMIN");
    mount("/admin", port);
    await screen.findByRole("heading", { name: "Your workspace, ready." });
    expect(
      screen.getByRole("navigation", { name: "Administrator navigation" }),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Counter access")).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Registration review" }),
    ).toBeNull();
  });
  it("renders loading, retryable error and unauthenticated states distinctly", async () => {
    const { port } = mockPort();
    let fail!: (error: unknown) => void;
    vi.mocked(port.me).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          fail = reject;
        }),
    );
    mount("/staff", port);
    expect(
      screen.getByRole("heading", { name: "Checking your session" }),
    ).toBeTruthy();
    await act(async () => fail(new ClientError("network")));
    expect(
      screen.getByRole("heading", { name: "Unable to check your session" }),
    ).toBeTruthy();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("heading", { name: "Welcome back" });
  });
  it("expires a protected session, removes sensitive feature content and returns to sign in", async () => {
    const { port, expire } = mockPort("COUNTER_STAFF");
    mount("/staff/registrations", port, [
      {
        path: "/staff/registrations",
        label: "Registration review",
        role: "COUNTER_STAFF",
        element: <p>synthetic protected record</p>,
      },
    ]);
    await screen.findByText("synthetic protected record");
    act(() => expire());
    await screen.findByText("Your session has ended. Sign in again.");
    expect(screen.queryByText("synthetic protected record")).toBeNull();
  });
  it("fences delayed login completion after session invalidation", async () => {
    const { port, expire } = mockPort();
    let finish!: (user: SessionUser) => void;
    vi.mocked(port.login).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    mount("/login", port);
    await waitFor(() => expect(vi.mocked(port.me)).toHaveBeenCalled());
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Username / Staff account"),
      "staff_01",
    );
    await user.type(screen.getByLabelText("Password"), "synthetic");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    act(() => expire());
    await act(async () => finish(fixture()));
    expect(
      screen.queryByRole("heading", { name: "Your workspace, ready." }),
    ).toBeNull();
  });
  it("signs out and unmounts protected shell", async () => {
    const { port } = mockPort("COUNTER_STAFF");
    mount("/staff", port);
    await screen.findByRole("heading", { name: "Your workspace, ready." });
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByRole("heading", { name: "Welcome back" });
    expect(port.logout).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("navigation", { name: "Counter navigation" }),
    ).toBeNull();
  });
  it("opens mobile navigation, closes on Escape and restores trigger focus", async () => {
    const { port } = mockPort("COUNTER_STAFF");
    mount("/staff", port);
    await screen.findByRole("heading", { name: "Your workspace, ready." });
    const user = userEvent.setup();
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    await user.click(trigger);
    expect(
      screen.getByRole("dialog", { name: "Workspace navigation" }),
    ).toBeTruthy();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });
  it("keeps public registration BM-first without a staff login/grant bypass", async () => {
    const { port } = mockPort();
    mount("/register", port);
    expect(
      screen.getByRole("heading", { name: "Pendaftaran pelawat" }),
    ).toBeTruthy();
    expect(document.documentElement.lang).toBe("ms");
    expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
    expect(screen.queryByText(/Pass ID/)).toBeNull();
  });
  it("offers empty state for unconnected features rather than fake queue metrics", async () => {
    mount("/staff/registrations", mockPort("COUNTER_STAFF").port);
    await screen.findByRole("heading", {
      name: "This module is not connected",
    });
    expect(screen.queryByText("Awaiting review 12")).toBeNull();
  });
  it("passes automated structural accessibility for login (contrast requires real browser)", async () => {
    mount("/login", mockPort().port);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Welcome back" }),
      ).toBeTruthy(),
    );
    const report = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(report.violations.map((violation) => violation.id)).toEqual([]);
  });
});

describe("shared status and restart dialog", () => {
  it("labels loading and error states independently of colour", () => {
    const { rerender } = render(
      <StatusPanel kind="loading" title="Loading registrations" />,
    );
    expect(screen.getByRole("status").getAttribute("aria-busy")).toBe("true");
    rerender(<StatusPanel kind="error" title="Unable to load registrations" />);
    expect(screen.getByRole("alert")).toBeTruthy();
  });
  it("focuses cancellation and waits for explicit confirmation; busy cannot dismiss", async () => {
    const cancel = vi.fn(),
      confirm = vi.fn();
    const { rerender } = render(
      <RestartConfirmation
        open
        currentLabel="Kaunter lama"
        requestedLabel="Kaunter baharu"
        onCancel={cancel}
        onConfirm={confirm}
      />,
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Kekalkan borang" }),
      ),
    );
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Mulakan semula" }));
    expect(confirm).toHaveBeenCalledTimes(1);
    rerender(
      <RestartConfirmation
        open
        busy
        currentLabel="Kaunter lama"
        requestedLabel="Kaunter baharu"
        onCancel={cancel}
        onConfirm={confirm}
      />,
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(cancel).not.toHaveBeenCalled();
  });
});

describe("review regressions: local logout and explicit unknown-login recovery", () => {
  it("reports an anonymous lookup explicitly after unknown login without replaying credentials", async () => {
    const { port } = mockPort();
    vi.mocked(port.login).mockRejectedValue(new ClientError("network"));
    mount("/login", port);
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Username / Staff account") as HTMLInputElement)
          .disabled,
      ).toBe(false),
    );
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Username / Staff account"),
      "staff_01",
    );
    await user.type(screen.getByLabelText("Password"), "fixture-only");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByRole("alert");
    await user.click(
      screen.getByRole("button", { name: "Check current session" }),
    );
    await screen.findByText(
      "No authorised staff session was found. You can sign in.",
    );
    expect(port.login).toHaveBeenCalledTimes(1);
    expect(port.me).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/Unable to connect/)).toBeNull();
  });
  it("cannot restore a delayed login after sign-out overtakes it", async () => {
    const { port } = mockPort();
    let controls!: AuthContextValue;
    let finishLogin!: (user: SessionUser) => void;
    vi.mocked(port.login).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishLogin = resolve;
        }),
    );
    function Probe() {
      const auth = useAuth();
      useEffect(() => {
        controls = auth;
      }, [auth]);
      return <p>{auth.state.kind}</p>;
    }
    render(
      <AuthProvider port={port}>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("anonymous");
    let loginResult!: Promise<SessionUser | null>;
    act(() => {
      loginResult = controls
        .login("staff_01", "fixture-only")
        .catch(() => null);
    });
    await act(async () => controls.logout());
    expect(controls.logoutState.kind).toBe("unknown");
    await act(async () => finishLogin(fixture()));
    expect(await loginResult).toBeNull();
    expect(controls.state.kind).toBe("anonymous");
    expect(controls.mutationPending).toBe(false);
    expect(screen.queryByText("authenticated")).toBeNull();
    vi.mocked(port.me).mockResolvedValueOnce(fixture());
    act(() => controls.refresh());
    await waitFor(() =>
      expect(controls.logoutState).toMatchObject({
        kind: "unknown",
        message: "The server session is still active. Retry sign out.",
      }),
    );
    expect(controls.state.kind).toBe("anonymous");
  });
  it("unmounts protected content immediately while logout is pending and keeps it cleared after rejection", async () => {
    const { port } = mockPort("COUNTER_STAFF");
    let rejectLogout!: (error: unknown) => void;
    vi.mocked(port.logout).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectLogout = reject;
        }),
    );
    mount("/staff/registrations", port, [
      {
        path: "/staff/registrations",
        role: "COUNTER_STAFF",
        label: "Registration review",
        element: <p>synthetic protected record</p>,
      },
    ]);
    await screen.findByText("synthetic protected record");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByText(
      "Signing out… Local staff access has been cleared.",
    );
    expect(screen.queryByText("synthetic protected record")).toBeNull();
    expect(
      screen.queryByRole("navigation", { name: "Counter navigation" }),
    ).toBeNull();
    expect(
      (screen.getByRole("button", { name: "Sign in" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    await act(async () => rejectLogout(new ClientError("network")));
    await screen.findByText("Server sign-out could not be confirmed.");
    expect(screen.queryByText("synthetic protected record")).toBeNull();
    // Even an explicit GET reporting the old server user cannot undo the sign-out intent.
    await user.click(
      screen.getByRole("button", { name: "Check sign-out status" }),
    );
    await screen.findByText(/The server session is still active/);
    expect(
      screen.queryByRole("heading", { name: "Your workspace, ready." }),
    ).toBeNull();
    expect(port.logout).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Retry sign out" }));
    await screen.findByText(
      "Local staff access is cleared. Your staff session is no longer authorised.",
    );
    expect(port.logout).toHaveBeenCalledTimes(2);
    expect(
      (screen.getByRole("button", { name: "Sign in" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
  it("recovers a post-revocation 503 using an explicit me401 check without replaying logout", async () => {
    const { port } = mockPort("COUNTER_STAFF");
    vi.mocked(port.logout).mockRejectedValue(
      new ClientError("api", {
        timestamp: "test",
        status: 503,
        code: "SERVICE_UNAVAILABLE",
        message: "",
        correlationId: "test",
        fieldErrors: [],
      }),
    );
    mount("/staff", port);
    await screen.findByRole("heading", { name: "Your workspace, ready." });
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByText("Server sign-out could not be confirmed.");
    vi.mocked(port.me).mockRejectedValueOnce(anonymous());
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Check sign-out status" }));
    await screen.findByText(
      "Local staff access is cleared. Your staff session is no longer authorised.",
    );
    expect(port.logout).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("navigation", { name: "Counter navigation" }),
    ).toBeNull();
  });
  it("fences a delayed identity lookup after logout starts", async () => {
    const { port } = mockPort("COUNTER_STAFF");
    let controls!: AuthContextValue;
    let finishMe!: (user: SessionUser) => void;
    let finishLogout!: () => void;
    function ProtectedProbe() {
      const auth = useAuth();
      useEffect(() => {
        controls = auth;
      }, [auth]);
      return <p>synthetic protected record</p>;
    }
    mount("/staff/registrations", port, [
      {
        path: "/staff/registrations",
        role: "COUNTER_STAFF",
        label: "Registration review",
        element: <ProtectedProbe />,
      },
    ]);
    await screen.findByText("synthetic protected record");
    vi.mocked(port.me).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishMe = resolve;
        }),
    );
    act(() => controls.refresh());
    await waitFor(() => expect(port.me).toHaveBeenCalledTimes(2));
    vi.mocked(port.logout).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishLogout = resolve;
        }),
    );
    act(() => {
      void controls.logout();
    });
    await screen.findByText(
      "Signing out… Local staff access has been cleared.",
    );
    await act(async () => finishMe(fixture()));
    expect(screen.queryByText("synthetic protected record")).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Your workspace, ready." }),
    ).toBeNull();
    await act(async () => finishLogout());
    await screen.findByText(
      "Local staff access is cleared. Your staff session is no longer authorised.",
    );
  });
  it.each(["network-unknown", "csrf-after-success"])(
    "offers an explicit current-session check after %s and does not replay login",
    async (failure) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(httpAnonymous())
        .mockResolvedValueOnce(
          jsonResponse({
            headerName: "X-CSRF-TOKEN",
            token: "synthetic-test-csrf",
          }),
        );
      if (failure === "network-unknown")
        fetcher.mockRejectedValueOnce(
          new TypeError("synthetic network failure"),
        );
      else
        fetcher
          .mockResolvedValueOnce(jsonResponse(fixture()))
          .mockResolvedValueOnce(
            jsonResponse(
              {
                timestamp: "test",
                status: 503,
                code: "SERVICE_UNAVAILABLE",
                message: "",
                correlationId: "test",
                fieldErrors: [],
              },
              503,
            ),
          );
      fetcher.mockResolvedValueOnce(jsonResponse(fixture()));
      mount("/login", createAuthPort(new ApiClient(fetcher)));
      await waitFor(() =>
        expect(
          (
            screen.getByLabelText(
              "Username / Staff account",
            ) as HTMLInputElement
          ).disabled,
        ).toBe(false),
      );
      const user = userEvent.setup();
      await user.type(
        screen.getByLabelText("Username / Staff account"),
        "staff_01",
      );
      await user.type(screen.getByLabelText("Password"), "fixture-only");
      await user.click(screen.getByRole("button", { name: "Sign in" }));
      await screen.findByRole("alert");
      await waitFor(() =>
        expect(
          (
            screen.getByRole("button", {
              name: "Check current session",
            }) as HTMLButtonElement
          ).disabled,
        ).toBe(false),
      );
      expect(
        fetcher.mock.calls.filter(([path]) => path === "/api/auth/login"),
      ).toHaveLength(1);
      await user.click(
        screen.getByRole("button", { name: "Check current session" }),
      );
      await screen.findByRole("heading", { name: "Your workspace, ready." });
      expect(fetcher.mock.calls.at(-1)?.[0]).toBe("/api/auth/me");
      expect(
        fetcher.mock.calls.filter(([path]) => path === "/api/auth/login"),
      ).toHaveLength(1);
    },
  );
});
