import { Component, useEffect, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./app/auth-provider";
import { useAuth } from "./app/auth-context";
import { LoginPage } from "./app/login-page";
import { mergeFeatureSlots, type FeatureSlot } from "./app/features";
import { VisitorFrame, WorkspaceOverview, WorkspaceShell } from "./app/shell";
import { Button, StatusPanel } from "./components/ui/primitives";
import type { AuthPort } from "./lib/auth";
import type { Role } from "./lib/contracts";
import { safeError } from "./lib/errors";

/** Component failure hides raw exceptions; only the failed page is replaced. */
class PageBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <StatusPanel
        kind="error"
        title="Unable to display this page"
        action={
          <Button onClick={() => this.setState({ failed: false })}>
            Try again
          </Button>
        }
      >
        Please try again.
      </StatusPanel>
    ) : (
      this.props.children
    );
  }
}

/** Route transitions focus the heading and announce the page; initial login keeps natural focus. */
function RouteFocus() {
  const location = useLocation();
  const { state } = useAuth();
  useEffect(() => {
    document.documentElement.lang =
      location.pathname === "/register" ? "ms" : "en";
    const heading = document.querySelector<HTMLElement>("main h1, main h2");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      document.title = `${heading.textContent} · HSAAS`;
    }
  }, [location.pathname, state.kind]);
  return null;
}

/** UI gate supports all bootstrap states; backend RBAC remains authoritative. */
function RoleGate({ role }: { role: Role }) {
  const { state, refresh } = useAuth();
  if (state.kind === "loading")
    return (
      <main className="bootstrap" id="main-content">
        <StatusPanel kind="loading" title="Checking your session">
          Please wait while we check your staff access.
        </StatusPanel>
      </main>
    );
  if (state.kind === "error")
    return (
      <main className="bootstrap" id="main-content">
        <StatusPanel
          kind="error"
          title="Unable to check your session"
          action={<Button onClick={refresh}>Retry</Button>}
        >
          {safeError(state.error)}
        </StatusPanel>
      </main>
    );
  if (state.kind === "anonymous") return <Navigate to="/login" replace />;
  if (state.user.role !== role)
    return (
      <main className="bootstrap" id="main-content">
        <StatusPanel
          kind="error"
          title="Access restricted"
          action={
            <a
              className="button button-secondary"
              href={state.user.role === "ADMIN" ? "/admin" : "/staff"}
            >
              Back to your workspace
            </a>
          }
        >
          {role === "ADMIN"
            ? "Administrator access is required."
            : "Counter Staff access is required."}
        </StatusPanel>
      </main>
    );
  return <Outlet />;
}

/** Public registration is BM-first and awaits M02, never bypasses entry exchange. */
function RegistrationPending() {
  return (
    <>
      <span className="eyebrow">SELAMAT DATANG</span>
      <h1>Pendaftaran pelawat</h1>
      <p>Tiada akaun diperlukan.</p>
      <StatusPanel kind="empty" title="Pendaftaran belum tersedia">
        <p>
          Sila ke kaunter untuk bantuan. Pendaftaran akan dibuka melalui QR
          semasa yang sah.
        </p>
      </StatusPanel>
    </>
  );
}

/** Feature injection is explicit and reviewed; production never selects a mock auth fallback. */
export default function App({
  features = [],
  auth,
}: {
  features?: readonly FeatureSlot[];
  auth?: AuthPort;
}) {
  const publicEntry = useLocation().pathname === "/register";
  const slots = mergeFeatureSlots(features);
  const entry = slots.find((slot) => slot.role === "PUBLIC");
  return (
    <AuthProvider port={auth}>
      <a className="skip-link" href="#main-content">
        {publicEntry ? "Langkau ke kandungan utama" : "Skip to main content"}
      </a>
      <RouteFocus />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/register"
          element={
            <VisitorFrame>
              <PageBoundary>
                {entry?.element ?? <RegistrationPending />}
              </PageBoundary>
            </VisitorFrame>
          }
        />
        {(["COUNTER_STAFF", "ADMIN"] as const).map((role) => (
          <Route key={role} element={<RoleGate role={role} />}>
            <Route element={<WorkspaceShell slots={slots} />}>
              <Route
                path={role === "ADMIN" ? "/admin" : "/staff"}
                element={<WorkspaceOverview slots={slots} />}
              />
              {slots
                .filter((slot) => slot.role === role)
                .map((slot) => (
                  <Route
                    key={slot.path}
                    path={slot.path}
                    element={
                      <PageBoundary key={slot.path}>
                        {slot.element}
                      </PageBoundary>
                    }
                  />
                ))}
            </Route>
          </Route>
        ))}
        <Route
          path="*"
          element={
            <main className="bootstrap" id="main-content">
              <StatusPanel
                kind="empty"
                title="Page not found"
                action={
                  <a className="button button-secondary" href="/login">
                    Back to sign in
                  </a>
                }
              >
                Check the address or return to your workspace.
              </StatusPanel>
            </main>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
