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

/** Shared authenticated frame with role-separated navigation and accessible mobile drawer. */
export function WorkspaceShell({ slots }: { slots: readonly FeatureSlot[] }) {
  const { state, logout } = useAuth();
  const location = useLocation();
  const [drawer, setDrawer] = useState({
    path: location.pathname,
    open: false,
  });
  const [counter, setCounter] = useState<string | null>(null);
  if (state.kind !== "authenticated") return null;
  const { user } = state;
  const isStaff = user.role === "COUNTER_STAFF";
  const base = isStaff ? "/staff" : "/admin";
  const activeCounter = user.counterIds.includes(counter ?? "")
    ? counter
    : (user.counterIds[0] ?? null);
  const navigation = slots.filter((slot) => slot.role === user.role);
  const current =
    navigation.find((slot) => slot.path === location.pathname)?.label ??
    "Workspace overview";
  function signOut() {
    // Provider owns pending/UNKNOWN recovery after this protected shell immediately unmounts.
    void logout().catch(() => {});
  }
  const nav = (
    <>
      <Link to={base} className="shell-brand">
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
      <nav
        aria-label={isStaff ? "Counter navigation" : "Administrator navigation"}
      >
        <NavLink to={base} end className="nav-link">
          <HomeIcon size={19} aria-hidden="true" />
          Overview
        </NavLink>
        {navigation.map(({ path, label, icon: Icon }) => (
          <NavLink key={path} to={path} className="nav-link">
            {Icon && <Icon size={19} aria-hidden="true" />}
            {label}
          </NavLink>
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
      <div className="workspace">
        <aside className="sidebar">{nav}</aside>
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
                  className="mobile-menu"
                  aria-label="Open navigation"
                >
                  <Menu size={21} aria-hidden="true" />
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="mobile-drawer">
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
            <div className="breadcrumb">
              <span>{isStaff ? "Counter" : "Administration"}</span>
              <ChevronRight size={14} aria-hidden="true" />
              <strong>{current}</strong>
            </div>
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
            {isStaff && (
              <div className="counter-bar">
                <label htmlFor="active-counter">Counter access</label>
                {user.counterIds.length ? (
                  <select
                    id="active-counter"
                    value={activeCounter ?? ""}
                    onChange={(event) => setCounter(event.target.value)}
                  >
                    {user.counterIds.map((id) => (
                      <option key={id} value={id}>
                        Counter {id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="badge">No counters assigned</span>
                )}
                <span className="muted">Authorised counters only</span>
              </div>
            )}
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

/** Compact role overview keeps real navigation and explicit availability in a readable hierarchy. */
export function WorkspaceOverview({
  slots,
}: {
  slots: readonly FeatureSlot[];
}) {
  const { state } = useAuth();
  if (state.kind !== "authenticated") return null;
  const staff = state.user.role === "COUNTER_STAFF";
  const choices = slots.filter((slot) => slot.role === state.user.role);
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">
          {staff ? "COUNTER WORKSPACE" : "ADMINISTRATION"}
        </span>
        <h1>Your workspace, ready.</h1>
        <p>
          {staff
            ? "Choose an area to continue your counter workflow."
            : "Manage your administration workspace."}
        </p>
      </div>
      <div className="section-heading">
        <h2>Workspace areas</h2>
        <span className="muted">Connect modules as they become available</span>
      </div>
      <div className="area-grid">
        {choices.map(({ path, label, icon: Icon }) => (
          <Link key={path} to={path} className="area-card">
            <span className="area-icon">
              {Icon && <Icon size={22} aria-hidden="true" />}
            </span>
            <h3>{label}</h3>
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        ))}
      </div>
      <section className="capabilities">
        <h2>Integration availability</h2>
        <div className="capability-grid">
          <Capability title="WhatsApp" state="Not enabled" />
          <Capability title="Blockchain" state="Not enabled" />
          <Capability title="Physical reader" state="Not connected" />
          <Capability title="Live patient API" state="Not enabled" />
        </div>
      </section>
    </>
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
