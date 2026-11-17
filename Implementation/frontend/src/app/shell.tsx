import { preserveToastInteraction } from "../components/ui/dialog-feedback";
import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
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
import { ReportsPage } from "../features/administration/reports";
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
  // Staff queues and the four admin task surfaces use separate viewport frames; supporting pages reflow naturally.
  const queueSurface = isStaff && /^\/staff(?:\/(?:registrations|passes))?\/?$/.test(location.pathname);
  const overview = isStaff && /^\/staff\/?$/.test(location.pathname);
  const adminTasks = !isStaff && /^\/admin\/(?:users|cards|audit)\/?$/.test(location.pathname);
  const adminOverview = !isStaff && /^\/admin\/?$/.test(location.pathname);
  const passes = isStaff && /^\/staff\/passes\/?$/.test(location.pathname);
  const base = isStaff ? "/staff" : "/admin";
  const activeCounter = user.counterIds.includes(counter ?? "")
    ? counter
    : (user.counterIds[0] ?? null);
  const navigation = slots.filter((slot) => slot.role === user.role && (isStaff || ["/admin/users", "/admin/cards", "/admin/audit"].includes(slot.path)))
    .sort((a, b) => isStaff ? 0 : ["/admin/users", "/admin/cards", "/admin/audit"].indexOf(a.path) - ["/admin/users", "/admin/cards", "/admin/audit"].indexOf(b.path));
  // Resolve header labels from the same role-filtered routes, including the staff overview and trailing slashes.
  const currentPath = location.pathname.replace(/\/+$/, "");
  const current =
    navigation.find((slot) => slot.path === currentPath)?.label ??
    (currentPath === base ? "Overview" : currentPath === "/admin/settings" ? "Pass settings" : currentPath === "/admin/reports" ? "Overview" : currentPath === "/admin/report-details" ? "Report details" : "Workspace overview");
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
        <NavLink to={base} end className={({ isActive }) => `nav-link${isActive || !isStaff && currentPath === "/admin/report-details" ? " active" : ""}`} onClick={() => setDrawer({ path: location.pathname, open: false })}>
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
      <div className={`workspace workspace-drawer-layout${isStaff ? " workspace-staff" : " workspace-admin"}${adminOverview ? " workspace-admin-overview" : ""}${adminTasks ? " workspace-admin-tasks" : ""}${queueSurface ? ` workspace-viewport ${overview ? "workspace-dashboard" : passes ? "workspace-passes" : "workspace-review"}` : ""}`}>
        {/* Both roles use the existing on-demand drawer, leaving the full workspace width available. */}
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

/** Prioritise real role-specific work; links always come from the registered feature slots. */
export function WorkspaceOverview(_props: {
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
  return <ReportsPage />;
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
