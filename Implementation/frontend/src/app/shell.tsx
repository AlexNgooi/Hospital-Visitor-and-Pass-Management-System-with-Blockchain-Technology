import { preserveToastInteraction } from "../components/ui/dialog-feedback";
import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Button } from "../components/ui/primitives";
import { useAuth } from "./auth-context";
import { homeIcon as HomeIcon, type FeatureSlot } from "./features";
import { CounterContext } from "./counter-context";
import { RegistrationQrDisplay } from "../features/registration-qr/display";
import { RegistrationReview } from "../features/counter/review/page";

/** On-demand navigation supports the combined overview and optional independent staff tabs. */
export function WorkspaceShell({ slots }: { slots: readonly FeatureSlot[] }) {
  const { state, logout } = useAuth();
  const location = useLocation();
  const [drawer, setDrawer] = useState({
    path: location.pathname,
    open: false,
  });
  // A new tab inherits only the requested counter; the server and current permissions still authorize it.
  const [counter, setCounter] = useState<string | null>(() => new URLSearchParams(location.search).get("counter"));
  if (state.kind !== "authenticated") return null;
  const { user } = state;
  const isStaff = user.role === "COUNTER_STAFF";
  // Both queue surfaces share the desktop viewport frame; other workspaces keep their natural document flow.
  const queueSurface = isStaff && /^\/staff(?:\/(?:registrations|passes))?\/?$/.test(location.pathname);
  const overview = isStaff && /^\/staff\/?$/.test(location.pathname);
  const passes = isStaff && /^\/staff\/passes\/?$/.test(location.pathname);
  const base = isStaff ? "/staff" : "/admin";
  const activeCounter = user.counterIds.includes(counter ?? "")
    ? counter
    : (user.counterIds[0] ?? null);
  const navigation = slots.filter((slot) => slot.role === user.role);
  // Resolve header labels from the same role-filtered routes, including the staff overview and trailing slashes.
  const currentPath = location.pathname.replace(/\/+$/, "");
  const current =
    navigation.find((slot) => slot.path === currentPath)?.label ??
    (isStaff && currentPath === base ? "Overview" : "Workspace overview");
  function signOut() {
    // Provider owns pending/UNKNOWN recovery after this protected shell immediately unmounts.
    void logout().catch(() => {});
  }
  const nav = (
    <>
      <Link to={base} className="shell-brand" onClick={() => setDrawer({ path: location.pathname, open: false })}>
        <span className="brand-symbol" aria-hidden="true">
          H
        </span>
        <span>
          HSAAS<small>Visitor & Pass Management</small>
        </span>
      </Link>
      <span className="nav-caption">
        {isStaff ? "COUNTER WORKSPACE" : "ADMINISTRATION"}
      </span>
      {/* Counter choice stays available in the drawer without taking space from the dashboard. */}
      {isStaff && user.counterIds.length > 1 && <label className="drawer-counter">Counter
        <select value={activeCounter ?? ""} onChange={event => setCounter(event.target.value)}>
          {user.counterIds.map(id => <option key={id} value={id}>Counter {id}</option>)}
        </select>
      </label>}
      <nav
        aria-label={isStaff ? "Counter navigation" : "Administrator navigation"}
      >
        <NavLink to={base} end className="nav-link" onClick={() => setDrawer({ path: location.pathname, open: false })}>
          <HomeIcon size={19} aria-hidden="true" />
          Overview
        </NavLink>
        {navigation.map(({ path, label, icon: Icon }) => (
          <div className="nav-row" key={path}>
            <NavLink to={path} className="nav-link" onClick={() => setDrawer({ path: location.pathname, open: false })}>
              {Icon && <Icon size={19} aria-hidden="true" />}
              {label}
            </NavLink>
            <Link to={`${path}${isStaff && activeCounter ? `?counter=${encodeURIComponent(activeCounter)}` : ""}`}
              target="_blank" rel="noopener noreferrer" className="nav-new-tab"
              onClick={() => setDrawer({ path: location.pathname, open: false })}
              aria-label={`Open ${label} in a new tab`} title={`Open ${label} in a new tab`}>
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <ShieldCheck size={18} aria-hidden="true" />
        <div>
          Role-based access
          <small>{isStaff ? "Counter Staff" : "Administrator"}</small>
        </div>
      </div>
    </>
  );
  return (
    <CounterContext.Provider value={activeCounter}>
      <div className={`workspace workspace-drawer-layout${isStaff ? " workspace-staff" : ""}${queueSurface ? ` workspace-viewport ${overview ? "workspace-dashboard" : passes ? "workspace-passes" : "workspace-review"}` : ""}`}>
        <div className="workspace-body">
          <header className="topbar">
            <Dialog.Root
              open={drawer.open && drawer.path === location.pathname}
              onOpenChange={(open) =>
                setDrawer({ path: location.pathname, open })
              }
            >
              <Dialog.Trigger asChild>
                <Button
                  variant="ghost"
                  className="workspace-menu"
                  aria-label="Open navigation"
                >
                  <Menu size={21} aria-hidden="true" />
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content onInteractOutside={preserveToastInteraction} className="mobile-drawer">
                  <Dialog.Title className="sr-only">
                    Workspace navigation
                  </Dialog.Title>
                  <Dialog.Description className="sr-only">
                    Navigate within your authorised role.
                  </Dialog.Description>
                  <Dialog.Close asChild>
                    <Button
                      variant="ghost"
                      className="drawer-close"
                      aria-label="Close navigation"
                    >
                      <X size={20} aria-hidden="true" />
                    </Button>
                  </Dialog.Close>
                  {nav}
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            {/* A persistent location marker shares the administrator header pattern across all staff pages. */}
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <span>{isStaff ? "Counter staff" : "Administration"}</span>
              <ChevronRight size={14} aria-hidden="true" />
              <strong aria-current="page">{current}</strong>
            </nav>
            <div className="account-tools">
              <div className="account-avatar" aria-hidden="true">
                {user.login.slice(0, 2).toUpperCase()}
              </div>
              <span className="account-name">
                {user.login}
                <small>{isStaff ? "Counter Staff" : "Administrator"}</small>
              </span>
              <Button variant="ghost" onClick={signOut} aria-label="Sign out">
                <LogOut size={18} aria-hidden="true" />
                <span className="signout-label">Sign out</span>
              </Button>
            </div>
          </header>
          <main id="main-content" className="workspace-main">
            <Outlet />
          </main>
          <footer className="workspace-footer">
            HSAAS · Hospital Sultan Abdul Aziz Shah
            <span>Secure staff workspace</span>
          </footer>
        </div>
      </div>
    </CounterContext.Provider>
  );
}

/** Route descriptions explain existing tasks without promising metrics or integration health. */
const areaDescriptions: Readonly<Record<string, string>> = {
  "/staff/registrations": "Check visitor details and review registrations before handover.",
  "/staff/registration-qr": "Display the current QR for visitors to start their registration.",
  "/staff/passes": "Receive returned passes and review assignment history.",
  "/admin/cards": "Manage manual pass inventory, locations and card availability.",
  "/admin/users": "Manage staff accounts, roles and authorised counter access.",
  "/admin/settings": "Maintain locations, visitor categories and return defaults.",
  "/admin/reports": "Review registration activity, pass movements and masked exports.",
  "/admin/audit": "Trace recorded staff actions and protected changes.",
};

/** Prioritise real role-specific work; links always come from the registered feature slots. */
export function WorkspaceOverview({
  slots,
}: {
  slots: readonly FeatureSlot[];
}) {
  const { state } = useAuth();
  if (state.kind !== "authenticated") return null;
  const staff = state.user.role === "COUNTER_STAFF";
  // Staff work is live on the overview; administrator shortcuts retain their existing role-specific layout.
  if (staff) return <div className="workspace-overview staff-overview">
    <header className="page-heading overview-heading"><div><h1>Overview</h1><p>Visitor registration and pass issuance, in one place.</p></div></header>
    <div className="staff-overview-grid"><RegistrationQrDisplay compact /><RegistrationReview embedded /></div>
  </div>;
  const choices = slots.filter((slot) => slot.role === state.user.role);
  const primary = choices.find((slot) => slot.path === (staff ? "/staff/registrations" : "/admin/reports"));
  const workflow = staff
    ? [
        { path: "/staff/registration-qr", title: "Register", detail: "Display the visitor QR" },
        { path: "/staff/registrations", title: "Review", detail: "Verify visitor details" },
        { path: "/staff/passes", title: "Manage passes", detail: "Issue and receive returns" },
      ].filter((step) => choices.some((slot) => slot.path === step.path))
    : [];
  return (
    <div className="workspace-overview">
      <div className="page-heading overview-heading">
        <div>
        <span className="eyebrow">
          {staff ? "COUNTER WORKSPACE" : "ADMINISTRATION"}
        </span>
        <h1>{staff ? "Counter overview" : "Administration overview"}</h1>
        <p>
          {staff
            ? "Welcome back. Keep each visitor moving from registration to return."
            : "Keep your people, passes and daily operations organised."}
        </p>
        </div>
        {primary && (
          <Link to={primary.path} className="button button-primary overview-primary">
            {staff ? "Review registrations" : "View reports"}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        )}
      </div>
      {workflow.length > 0 && (
        <section className="workflow-section" aria-labelledby="workflow-title">
          <div className="section-heading">
            <h2 id="workflow-title">Your counter workflow</h2>
            <span className="muted">Registration · review · handover</span>
          </div>
          <ol className="workflow-steps">
            {workflow.map((step, index) => (
              <li key={step.path}>
                <Link to={step.path}>
                  <span className="workflow-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <span><strong>{step.title}</strong><small>{step.detail}</small></span>
                  <ChevronRight size={18} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
      <section aria-labelledby="workspace-areas-title">
      <div className="section-heading">
        <h2 id="workspace-areas-title">{staff ? "Workspace tools" : "Manage your workspace"}</h2>
        <span className="muted">{staff ? "Everything you need at the counter" : "Accounts, inventory and operational records"}</span>
      </div>
      <div className="area-grid">
        {choices.map(({ path, label, icon: Icon }) => (
          <Link key={path} to={path} className="area-card">
            <span className="area-icon">
              {Icon && <Icon size={22} aria-hidden="true" />}
            </span>
            <div className="area-copy">
              <h3>{label}</h3>
              {areaDescriptions[path] && <p>{areaDescriptions[path]}</p>}
            </div>
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        ))}
      </div>
      </section>
      <section className="capabilities">
        <h2>Integration availability</h2>
        <p className="muted">External services are separate from the manual pass workflow.</p>
        <div className="capability-grid">
          <Capability title="WhatsApp" state="Not enabled" />
          <Capability title="Blockchain" state="Not enabled" />
          <Capability title="Pass handling" state="Manual" />
          <Capability title="Live patient API" state="Not enabled" />
        </div>
      </section>
    </div>
  );
}

/** Label availability in text; colour alone never carries an operational status. */
function Capability({ title, state }: { title: string; state: string }) {
  return (
    <div>
      <span>{title}</span>
      <span className="badge">{state}</span>
    </div>
  );
}
export function VisitorFrame({ children }: { children: ReactNode }) {
  return (
    <main className="visitor-frame" id="main-content" lang="ms">
      <div className="visitor-brand">
        HSAAS <span>Pendaftaran pelawat</span>
      </div>
      {children}
    </main>
  );
}
